import { CONFIG, $, client, msg, escapeHtml, csvEscape, downloadBlob, METRICS } from './common.js';
let sb=null, rows=[],summaryRows=[];
const login=$('login-panel'),dash=$('dashboard');
function busy(state){$('reload').disabled=state;$('csv').disabled=state;$('summarycsv').disabled=state;}
function getMethodScore(row,m,method){return row[`${m}_${row.video_a_method===method?'a':'b'}`];}
function preferred(row){if(row.preference===3)return 'tie';const x=row.preference<=2?'a':'b';return row[`video_${x}_method`];}
function mean(ns){const a=ns.filter(Number.isFinite);return a.length?a.reduce((v,x)=>v+x,0)/a.length:null;}
function fmt(n){return n==null?'–':n.toFixed(2);}
function makeStats(votes){const models=new Map();
for(const row of votes){if(!models.has(row.model))models.set(row.model,[]);models.get(row.model).push(row);}
const calc=(name,set)=>{
 const out={model:name,count:set.length,participants:new Set(set.map(x=>x.participant_id)).size,pref:{quantwm:0,qvg:0,tie:0},ratings:{}};
 for(const row of set)out.pref[preferred(row)]++;
 for(const metric of METRICS){out.ratings[metric.id]={};for(const meth of ['qvg','quantwm'])out.ratings[metric.id][meth]=mean(set.map(row=>getMethodScore(row,metric.id,meth)));}
 return out;};
return [calc('全部模型',votes),...[...models.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([n,v])=>calc(n,v))];}
function showStats(){const all=summaryRows[0];if(!all)return;
const pct=(n,d)=>d?Math.round(n/d*100):0;
const cards=[['匿名评估者',all.participants],['有效视频对评分',all.count],['偏好 QuantWM',`${pct(all.pref.quantwm,all.count)}%`],['偏好 QVG',`${pct(all.pref.qvg,all.count)}%`]];
$('stat-cards').innerHTML=cards.map(([label,value])=>`<div class="stat-card"><div class="label">${escapeHtml(label)}</div><span class="number">${escapeHtml(value)}</span></div>`).join('');
const score=(m,key)=>`<span class="qvg">${fmt(m.ratings[key].qvg)}</span> / <span class="ours">${fmt(m.ratings[key].quantwm)}</span>`;
$('by-model').innerHTML=summaryRows.map(m=>`<tr><td><b>${escapeHtml(m.model)}</b></td><td>${m.count}</td><td>${score(m,'flicker')}</td><td>${score(m,'consistency')}</td><td>${score(m,'motion')}</td><td>${score(m,'visual')}</td><td><span class="ours">${m.pref.quantwm}</span> / ${m.pref.qvg} / ${m.pref.tie}</td></tr>`).join('');
$('raw-list').innerHTML=rows.slice(0,50).map(r=>`<tr><td>${escapeHtml(r.created_at?.replace('T',' ').slice(0,19))}</td><td>${escapeHtml(r.participant_id.slice(0,8))}…</td><td>${escapeHtml(r.pair_id)}</td><td>${escapeHtml(r.video_a_method)}</td><td>${escapeHtml(r.video_b_method)}</td><td>${escapeHtml(preferred(r))}</td></tr>`).join('');
$('updated').textContent='刷新于 '+new Date().toLocaleTimeString();
}
async function assertAdmin(){const {data,error}=await sb.rpc('is_study_admin');if(error)throw Error('权限检查失败：'+error.message);if(data!==true)throw Error('当前账户不是已授权研究管理员，无法读取结果。');}
async function loadData(){busy(true);try{
 await assertAdmin();const out=[];let offset=0;
 while(true){const {data,error}=await sb.from('study_votes').select('*').eq('study_id',CONFIG.studyId).order('created_at',{ascending:false}).range(offset,offset+499);
 if(error)throw Error(error.message);out.push(...data);if(data.length<500)break;offset+=500;if(offset>50000){msg('当前数据超过 5 万条，只加载了前 5 万条；请使用数据库后台进行大规模导出。');break;}}
 rows=out;summaryRows=makeStats(rows);showStats();dash.classList.remove('hidden');login.classList.add('hidden');
 }catch(err){msg(err.message,true);}finally{busy(false);}}
async function trySession(){try{sb=await client();const {data:{user}}=await sb.auth.getUser();if(user){await loadData();}}catch(e){msg(e.message,true);}}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const btn=$('login');btn.disabled=true;btn.textContent='正在验证…';try{if(!sb)sb=await client();const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw Error(error.message);$('password').value='';await loadData();}catch(err){msg(err.message,true);}finally{btn.disabled=false;btn.textContent='安全登录 →';}});
$('logout').addEventListener('click',async()=>{await sb.auth.signOut();dash.classList.add('hidden');login.classList.remove('hidden');rows=[];});
$('reload').addEventListener('click',loadData);
$('csv').addEventListener('click',()=>{if(!rows.length)return msg('暂无评分记录。');const keys=['created_at','study_id','participant_id','pair_id','model','video_a_method','video_b_method',...METRICS.flatMap(m=>[m.id+'_a',m.id+'_b']),'preference'];const lines=[keys.join(','),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(','))];downloadBlob('\ufeff'+lines.join('\r\n'),`quantwm_votes_${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');});
$('summarycsv').addEventListener('click',()=>{if(!summaryRows.length)return;const keys=['model','count','participants','pref_quantwm','pref_qvg','pref_tie',...METRICS.flatMap(m=>[m.id+'_qvg',m.id+'_quantwm'])];const csv=[keys.join(','),...summaryRows.map(s=>[s.model,s.count,s.participants,s.pref.quantwm,s.pref.qvg,s.pref.tie,...METRICS.flatMap(m=>[s.ratings[m.id].qvg??'',s.ratings[m.id].quantwm??''])].map(csvEscape).join(','))].join('\r\n');downloadBlob('\ufeff'+csv,'quantwm_summary.csv','text/csv;charset=utf-8');});
trySession();
