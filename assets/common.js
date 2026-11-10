import { CONFIG } from '../config.js';
export { CONFIG };
export const METRICS = [
  {id:'flicker', label:'时序闪烁', en:'Temporal Flickering', explanation:'1 = 频繁剧烈闪烁；5 = 几乎没有可见闪烁'},
  {id:'consistency', label:'内容时序一致性', en:'Temporal Consistency', explanation:'1 = 物体或场景频繁突变；5 = 始终保持稳定'},
  {id:'motion', label:'运动连续性', en:'Motion Smoothness', explanation:'1 = 严重跳变或抖动；5 = 运动自然连续'},
  {id:'visual', label:'视觉质量', en:'Visual Quality', explanation:'1 = 严重模糊和伪影；5 = 画面清晰自然'},
];
export function $ (id) { return document.getElementById(id); }
export function escapeHtml(x) { return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function safeStoreGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
export function safeStoreSet(k,v) { try {localStorage.setItem(k,v);} catch {} }
export function validConfig() {return /^https:\/\/.+\.supabase\.co\/?$/.test(CONFIG.supabaseUrl) && CONFIG.supabasePublishableKey.length>15;}
export async function client() {
  if (!validConfig()) throw new Error('尚未连接 Supabase。请先在 config.js 中填写项目 URL 和 publishable key。');
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  return createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
}
export function msg(text,isError=false){const el=$('message');if(!el){alert(text);return;}el.textContent=text;el.classList.remove('hidden');el.classList.toggle('error',isError);}
export function hash32(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function stableShuffle(arr,seed){const a=[...arr];let h=hash32(seed)||10009;const rnd=()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return (h>>>0)/4294967296;};for(let i=a.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[a[j],a[i]]=[a[i],a[j]];}return a;}
export function isValidSource(raw){try {const u=new URL(raw,location.href);return ['http:','https:'].includes(u.protocol);}catch{return false;}}
export function normalizePairs(json){if(!Array.isArray(json.pairs))return [];
return json.pairs.filter(p=>p&&/^[a-z0-9][a-z0-9_-]{1,79}$/i.test(p.id)&&typeof p.model==='string'&&isValidSource(p.videos?.qvg)&&isValidSource(p.videos?.quantwm)).map(p=>({id:p.id,model:p.model.slice(0,120),scene:String(p.scene||'').slice(0,140),videos:{qvg:new URL(p.videos.qvg,location.href).href,quantwm:new URL(p.videos.quantwm,location.href).href}}));}
export function csvEscape(v){const s=String(v??'');return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
export function downloadBlob(content,filename,mime){const u=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);}
