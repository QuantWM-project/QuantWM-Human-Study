import { $, downloadBlob, escapeHtml, msg } from './common.js';
let pairs=[];
const models=['Matrix-Game-2','LingBot-World-v2','HY-World 1.5','LongCat-Video','Causal-Forcing'];
const unique=()=>`pair_${String(Date.now())}_${Math.floor(Math.random()*10000)}`;
function render(){
 $('pair-count').textContent=`目前 ${pairs.length} 组视频（请逐组检查 QVG / QuantWM 对应关系）`;
 $('pair-list').innerHTML=pairs.map((p,i)=>`<div class="card" style="padding:16px;margin:12px 0;background:#f9fbfd;border:1px solid #dce5ee" data-i="${i}">
 <div class="heading-row"><strong>第 ${i+1} 组</strong><button class="button subtle remove" data-i="${i}" type="button">删除</button></div>
 <div class="field"><label>模型</label><select data-i="${i}" data-f="model"><option value="">选择模型</option>${models.map(m=>`<option value="${escapeHtml(m)}" ${p.model===m?'selected':''}>${escapeHtml(m)}</option>`).join('')}</select></div>
 <div class="field"><label>场景标识（仅管理员用于核对）</label><input data-i="${i}" data-f="scene" value="${escapeHtml(p.scene||'')}" placeholder="例如 scene-01 / walking bridge"></div>
 <div class="field"><label>QVG 文件名 / 视频路径</label><input data-i="${i}" data-f="qvg" value="${escapeHtml(p.qvg||'')}" placeholder="scene01_a.mp4"></div>
 <div class="field"><label>QuantWM 文件名 / 视频路径</label><input data-i="${i}" data-f="quantwm" value="${escapeHtml(p.quantwm||'')}" placeholder="scene01_b.mp4"></div>
 </div>`).join('');
 document.querySelectorAll('#pair-list input, #pair-list select').forEach(el=>el.addEventListener('input',()=>{const p=pairs[Number(el.dataset.i)];if(p)p[el.dataset.f]=el.value;}));
 document.querySelectorAll('#pair-list .remove').forEach(el=>el.addEventListener('click',()=>{pairs.splice(Number(el.dataset.i),1);render();}));
}
function path(v){const s=v.trim().replaceAll('\\','/');if(!s)return '';if(/^https:\/\//i.test(s))return s;if(s.startsWith('/'))throw Error('不要使用以 / 开头的绝对路径');if(s.includes('..'))throw Error('文件路径不能包含 ..');return s.startsWith('videos/')?s:'videos/'+s;}
function cleanId(s,i){const x=String(s||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,48);return `pair_${String(i+1).padStart(3,'0')}${x?'_'+x:''}`;}
$('add-pair').addEventListener('click',()=>{pairs.push({model:'',scene:'',qvg:'',quantwm:''});render();});
$('clear').addEventListener('click',()=>{if(confirm('确定清空当前视频对配置？')){pairs=[];render();}});
$('save').addEventListener('click',()=>{
 try{if(!pairs.length)throw Error('请先添加至少一组视频');const list=pairs.map((p,i)=>{if(!p.model||!p.qvg.trim()||!p.quantwm.trim())throw Error(`第 ${i+1} 组缺少模型或视频路径`);const qvg=path(p.qvg),quantwm=path(p.quantwm);if(qvg===quantwm)throw Error(`第 ${i+1} 组 QVG 与 QuantWM 使用同一视频路径`);return {id:cleanId(p.scene,i),model:p.model,scene:p.scene,videos:{qvg,quantwm}};});
 downloadBlob(JSON.stringify({description:'QuantWM human preference study: user-uploaded paired videos',pairs:list},null,2)+'\n','stimuli.json','application/json;charset=utf-8');msg(`已生成 ${list.length} 组视频配置。请将 stimuli.json 上传到新仓库根目录。`);
 }catch(e){msg(e.message,true);}
});
$('import').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const j=JSON.parse(await f.text());pairs=(j.pairs||[]).map(p=>({model:p.model||'',scene:p.scene||'',qvg:p.videos?.qvg?.replace(/^videos\//,'')||'',quantwm:p.videos?.quantwm?.replace(/^videos\//,'')||''}));render();msg('成功载入 '+pairs.length+' 组视频。');}catch(err){msg('导入失败：'+err.message,true);}});
render();
