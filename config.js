// QuantWM Human Study (independent repository) — public, non-secret settings.
// The Supabase publishable/anon key is designed for use in browsers.
// NEVER put a service_role key, database password, or admin password here.
export const CONFIG = {
  studyId: 'quantwm-human-study-v1',
  supabaseUrl: '',                     // e.g. https://YOURPROJECT.supabase.co
  supabasePublishableKey: '',          // publishable key or legacy anon key
  studyRepository: 'QuantWM-project/QuantWM-Human-Study',
  maxPairsPerParticipant: 12,         // set 0 to show all matched pairs
  enableMotion: true,
};
