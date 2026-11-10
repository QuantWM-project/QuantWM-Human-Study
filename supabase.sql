-- QuantWM Human Preference Study (Supabase/PostgreSQL)
-- Run in Supabase -> SQL Editor as the project owner.
-- IMPORTANT: Never place service_role secrets in the public website.

create table if not exists public.study_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.study_admins enable row level security;
revoke all on table public.study_admins from anon, authenticated;

-- A SECURITY DEFINER function checks the signed-in user against the private
-- study_admins table; participants cannot list administrator identities.
create or replace function public.is_study_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.study_admins a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_study_admin() from public, anon, authenticated;
grant execute on function public.is_study_admin() to authenticated;

create table if not exists public.study_votes (
  id uuid primary key default gen_random_uuid(),
  study_id text not null check (char_length(study_id) between 3 and 100),
  participant_id uuid not null,
  pair_id text not null check (pair_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{1,79}$'),
  model text not null check (char_length(model) between 1 and 120),
  video_a_method text not null check (video_a_method in ('qvg','quantwm')),
  video_b_method text not null check (video_b_method in ('qvg','quantwm')),
  flicker_a smallint check (flicker_a between 1 and 5),
  flicker_b smallint check (flicker_b between 1 and 5),
  consistency_a smallint check (consistency_a between 1 and 5),
  consistency_b smallint check (consistency_b between 1 and 5),
  motion_a smallint check (motion_a between 1 and 5),
  motion_b smallint check (motion_b between 1 and 5),
  visual_a smallint check (visual_a between 1 and 5),
  visual_b smallint check (visual_b between 1 and 5),
  preference smallint not null check (preference between 1 and 5),
  created_at timestamptz not null default now(),
  constraint study_votes_methods_distinct check (video_a_method <> video_b_method),
  constraint study_votes_flicker_required check (flicker_a is not null and flicker_b is not null),
  constraint study_votes_consistency_required check (consistency_a is not null and consistency_b is not null),
  constraint study_votes_visual_required check (visual_a is not null and visual_b is not null),
  constraint study_votes_per_participant_pair unique (study_id, participant_id, pair_id)
);

create index if not exists study_votes_study_created_idx on public.study_votes (study_id, created_at desc);
alter table public.study_votes enable row level security;

-- These grants do not override Row Level Security. The public may INSERT only.
revoke all on table public.study_votes from anon, authenticated;
grant insert on table public.study_votes to anon, authenticated;
grant select on table public.study_votes to authenticated;

-- Only allow anonymous/authenticated participants to insert new votes.
drop policy if exists study_vote_insert on public.study_votes;
create policy study_vote_insert on public.study_votes
  for insert to anon, authenticated
  with check (true);

-- Only an authenticated, explicitly allow-listed admin can read any votes.
drop policy if exists study_vote_admin_read on public.study_votes;
create policy study_vote_admin_read on public.study_votes
  for select to authenticated
  using ((select public.is_study_admin()));

-- There is deliberately NO policy/grant for UPDATE or DELETE.
-- There is deliberately NO public SELECT policy.
-- WARNING: Public unauthenticated inserts can be spammed; for an invited,
-- low-volume academic study, invite only trusted evaluators and audit the data.
-- For abuse-resistant public recruitment, add a server-side rate limit/CAPTCHA
-- via an Edge Function and revoke direct anonymous INSERT access.

-- AFTER creating the admin with Authentication -> Users -> Add user,
-- copy that user's UUID and run this separately, replacing the example:
-- insert into public.study_admins(user_id)
-- values ('YOUR-ADMIN-AUTH-USER-UUID') on conflict do nothing;
