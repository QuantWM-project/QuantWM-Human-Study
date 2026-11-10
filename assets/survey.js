import { CONFIG, METRICS, $, escapeHtml, safeStoreGet, safeStoreSet, validConfig, client, msg, stableShuffle, normalizePairs, hash32 } from './common.js';
const enabledMetrics = METRICS.filter(m => m.id !== 'motion' || CONFIG.enableMotion);
const vidA=$('video-a'),vidB=$('video-b');
const consent=$('consent'),start=$('start'),form=$('rating-form');
let participantId, tasks=[], current=0, currentTask=null, dbPromise=null, playing=false;
let videoFailed=false;
function uuid(){if(crypto?.randomUUID)return crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=crypto.getRandomValues(new Uint8Array(1))[0]%16;return(c==='x'?r:(r&3|8)).toString(16);});}
function assignParticipant(){const k=`${CONFIG.studyId}/participant`;participantId=safeStoreGet(k)||uuid();safeStoreSet(k,participantId);}
function completed(){try{return new Set(JSON.parse(safeStoreGet(`${CONFIG.studyId}/completed`)||'[]'));}catch{return new Set();}}
function markCompleted(id){const s=completed();s.add(id);safeStoreSet(`${CONFIG.studyId}/completed`,JSON.stringify([...s]));}
async function init(){assignParticipant();
  try{const resp=await fetch(`stimuli.json?v=${encodeURIComponent(CONFIG.studyId)}`,{cache:'no-store'});if(!resp.ok)throw Error(`HTTP ${resp.status}`);
    const json=await resp.json();const pairs=normalizePairs(json);if(!pairs.length){msg('网站已就绪，但还未导入正式评测视频。请先将自己的视频上传到新仓库的 videos/ 文件夹，再使用 pair-builder.html 配对并导出 stimuli.json。');start.disabled=true;return;}
    const sampled=stableShuffle(pairs,participantId+':order');const limited=CONFIG.maxPairsPerParticipant>0?sampled.slice(0,CONFIG.maxPairsPerParticipant):sampled;
    tasks=limited.filter(p=>!completed().has(p.id));
    if(!tasks.length){showFinished(limited.length);return;}
    if(!validConfig())msg('当前为预览模式：评分界面可以查看，但尚未配置数据库，投票无法正式提交。请先填写 config.js。');
  }catch(e){msg('无法读取视频配置：'+e.message,true);start.disabled=true;}
}
function showFinished(total){$('intro').classList.add('hidden');$('survey').classList.add('hidden');$('finish').classList.remove('hidden');$('finish-stats').textContent=`本次已完成 ${total} 组视频评价。`;}
function makeScale(name,aria){return `<div class="rating-scale" role="radiogroup" aria-label="${escapeHtml(aria)}">${[1,2,3,4,5].map(v=>`<label><input type="radio" required name="${name}" value="${v}" aria-label="${aria} ${v} 分"><span>${v}</span></label>`).join('')}</div>`;}
function buildMetrics(){ $('metrics').innerHTML=enabledMetrics.map(m=>`<div class="metric-row"><div class="metric-title"><strong>${escapeHtml(m.label)} <span style="color:#83949d;font-size:11px;font-weight:500">${m.en}</span></strong><small>${escapeHtml(m.explanation)}</small></div><div class="metric-col"><label>VIDEO A</label>${makeScale(m.id+'_a',m.label+' A')}</div><div class="metric-col"><label>VIDEO B</label>${makeScale(m.id+'_b',m.label+' B')}</div></div>`).join('');
 const text=['明显偏好 A','略微偏好 A','无明显区别','略微偏好 B','明显偏好 B'];
 $('pref-options').innerHTML=text.map((label,i)=>`<label><input required type="radio" name="preference" value="${i+1}"><b>${i+1}</b><small>${label}</small></label>`).join('');
}
function setStatus(which,txt){$('state-'+which).textContent=txt;}
function bindVideoEvents(){for(const [v,k] of [[vidA,'a'],[vidB,'b']]){
 v.addEventListener('loadedmetadata',()=>setStatus(k,'已加载'));
 v.addEventListener('error',()=>{videoFailed=true;setStatus(k,'视频加载失败');$('watch-hint').textContent='当前样本的视频无法播放，请联系研究者检查上传的视频文件路径。';});
 v.addEventListener('play',()=>{playing=true;$('playboth').textContent='Ⅱ 同步暂停';});
 v.addEventListener('pause',()=>{if(vidA.paused&&vidB.paused){playing=false;$('playboth').textContent='▶ 同步播放 / 暂停';}});
 }}
function stopVideos(){for(const v of [vidA,vidB]){v.pause();v.removeAttribute('src');}}
function renderPair(){if(current>=tasks.length){showFinished(completed().size);return;}
  currentTask=tasks[current];const isQvgLeft=(hash32(participantId+':left:'+currentTask.id)%2===0);
  currentTask.aMethod=isQvgLeft?'qvg':'quantwm';currentTask.bMethod=isQvgLeft?'quantwm':'qvg';
  $('intro').classList.add('hidden');$('survey').classList.remove('hidden');
  $('pair-title').textContent=`第 ${current+1} 组 · 视频对比`;
  $('pair-subtitle').textContent=`模型：${currentTask.model}${currentTask.scene?' · '+currentTask.scene:''}`;
  $('progress-count').textContent=`${current+1} / ${tasks.length}`;
  $('progress-fill').style.width=`${(current/tasks.length)*100}%`;
  form.reset();$('form-error').classList.add('hidden');$('checked-watch').checked=false;
  setStatus('a','正在加载');setStatus('b','正在加载');videoFailed=false;
  stopVideos();vidA.src=currentTask.videos[currentTask.aMethod];vidB.src=currentTask.videos[currentTask.bMethod];
  vidA.load();vidB.load();
  $('watch-hint').textContent='可同步播放和重播，两段视频均默认静音';
  window.scrollTo({top:0,behavior:'smooth'});
}
async function togglePlay(restart=false){if(restart){try{vidA.currentTime=0;vidB.currentTime=0;}catch{}}
if(playing&&!restart){vidA.pause();vidB.pause();playing=false;return;}
try{await Promise.all([vidA.play(),vidB.play()]);playing=true;}catch(e){$('watch-hint').textContent='无法自动播放，请检查视频链接或浏览器媒体播放权限。';}}
$('playboth').addEventListener('click',()=>togglePlay());$('restart').addEventListener('click',()=>togglePlay(true));
function showFormError(txt){const el=$('form-error');el.textContent=txt;el.classList.remove('hidden');el.scrollIntoView({behavior:'smooth',block:'center'});}
form.addEventListener('submit',async e=>{e.preventDefault();if(!currentTask)return;
 if(videoFailed){showFormError('有视频加载失败，请先检查视频链接。');return;}
 if(!$('checked-watch').checked){showFormError('请确认你已完整观察两段视频。');return;}
 const data=new FormData(form);for(const m of enabledMetrics){if(!data.get(m.id+'_a')||!data.get(m.id+'_b')){showFormError('请完成所有视频的 1–5 分评分。');return;}}
 const pref=Number(data.get('preference'));if(!pref){showFormError('请选择总体偏好（1–5）。');return;}
 const row={study_id:CONFIG.studyId,participant_id:participantId,pair_id:currentTask.id,model:currentTask.model,video_a_method:currentTask.aMethod,video_b_method:currentTask.bMethod,preference:pref};
 for(const m of METRICS){row[m.id+'_a']=data.has(m.id+'_a')?Number(data.get(m.id+'_a')):null;row[m.id+'_b']=data.has(m.id+'_b')?Number(data.get(m.id+'_b')):null;}
 const btn=$('submit');btn.disabled=true;btn.textContent='正在安全提交…';
 try{if(!dbPromise)dbPromise=client();const db=await dbPromise;const {error}=await db.from('study_votes').insert(row);
 if(error&&error.code!=='23505')throw new Error(error.message);
 markCompleted(currentTask.id);stopVideos();current++;renderPair();
 }catch(err){showFormError('提交失败，评分尚未保存：'+err.message+'。请检查网络或通知研究者。');}
 finally{btn.disabled=false;btn.innerHTML='提交本组评分 <span>→</span>';}
});
consent.addEventListener('change',()=>start.disabled=!consent.checked||!tasks.length);
start.addEventListener('click',()=>{buildMetrics();renderPair();});
bindVideoEvents();init();
