/* V12.19.5 — arrange a real 3D photobook and a real interactive Walkman in-page.
   No book artwork or private media is modified; settings are device-local until
   exported as a scene-layout-default.js file by the site exporters. */
(()=>{'use strict';
const api=window.SpecialBookScene,book=window.PHOTOBOOK,dock=document.getElementById('v12191-dock');
if(!api||!dock)return;
const $=id=>document.getElementById(id), limit=(v,a,b)=>Math.min(b,Math.max(a,v));
const initial={version:1,desktop:{book:{x:0,z:0,scale:1},mp3:{x:.017,y:.17,width:.275,yaw:0,pitch:0,roll:0}},mobile:{book:{x:0,z:0,scale:1},mp3:{x:.025,y:.53,width:.34,yaw:0,pitch:0,roll:0}}};
const original=JSON.parse(JSON.stringify(window.SPECIAL_SCENE_LAYOUT_DEFAULT||initial));
// Movable reader UI, stored separately for desktop and phone. A null position
// means 'use the original CSS position' on first use (backward compatible).
const uiDefs={
 musicControls:{label:'音乐栏／曲名、选曲与音量',selector:'.sa-music-controls'},
 nav:{label:'翻页／页码框',selector:'.dock .row'},
 dots:{label:'翻页进度圆点',selector:'.dock .dots'},
 actions:{label:'目录／沉浸阅读',selector:'.v1217-actionbar'},
 brand:{label:'顶部书名',selector:'.top .brand'},
 options:{label:'顶部设置工具',selector:'.top .right'},
 resume:{label:'继续阅读提示',selector:'.v1217-resume'},
 showui:{label:'退出沉浸按钮',selector:'#v1217-show-ui'}
};
const uiElements={};
for(const [id,def] of Object.entries(uiDefs)){
 const el=document.querySelector(def.selector);if(el){uiElements[id]=el;el.dataset.saUiName=def.label;el.dataset.saUiId=id;}
}
if(uiElements.musicControls){const grip=document.createElement('button');grip.className='sa-ui-drag-handle sa-music-drag-handle';grip.type='button';grip.textContent='⠿';grip.title='拖动背景音乐控制栏';grip.setAttribute('aria-label','拖动背景音乐控制栏');uiElements.musicControls.prepend(grip);}

const key=(book.id||'special-appearance')+'-scene-layout-v12196';
const mobile=()=>matchMedia('(max-width:740px)').matches;
const platform=()=>mobile()?'mobile':'desktop';
const finite=(v,d,a,b)=>Number.isFinite(Number(v))?limit(Number(v),a,b):d;
function sanitize(x){const output=JSON.parse(JSON.stringify(initial));for(const k of ['desktop','mobile']){
 const entry=x&&x[k]||{},b=entry.book||{},m=entry.mp3||{},def=initial[k];
 output[k].book={x:finite(b.x,def.book.x,-4,4),z:finite(b.z,def.book.z,-3,3),scale:finite(b.scale,1,.55,1.45)};
 output[k].mp3={x:finite(m.x,def.mp3.x,0,.93),y:finite(m.y,def.mp3.y,0,.91),width:finite(m.width,def.mp3.width,.13,.52),yaw:finite(m.yaw,0,-180,180),pitch:finite(m.pitch,0,-32,32),roll:finite(m.roll,0,-32,32)};
 output[k].ui={};
 for(const id of Object.keys(uiDefs)){
   const pos=entry.ui?.[id]||(id==='musicControls'?entry.ui?.music:null);
   output[k].ui[id]=pos&&Number.isFinite(+pos.x)&&Number.isFinite(+pos.y)
     ? {x:finite(pos.x,0,0,1),y:finite(pos.y,0,0,1)} : null;
 }
 }return output}
let scene=sanitize(original);
// Original/default starting coordinates are read BEFORE a class gives any
// of the UI components a fixed position. This retains the old UI on upgrade.
const measuredUI={};
for(const [id,el] of Object.entries(uiElements)){
 const r=el.getBoundingClientRect();
 measuredUI[id]={x:r.width?Math.max(0,r.left)/innerWidth:0.35,
   y:r.height?Math.max(0,r.top)/innerHeight:(id==='resume'?0.1:0.82)};
}
for(const el of Object.values(uiElements))el.classList.add('sa-ui-movable');
try{const old=JSON.parse(localStorage.getItem(key)||'null');if(old)scene=sanitize(old)}catch(_){}
function current(){return scene[platform()]}
function save(){try{localStorage.setItem(key,JSON.stringify(scene));return true}catch(_){return false}}
function positionWalkman(){const m=current().mp3,vw=innerWidth,vh=innerHeight;
 const w=limit(vw*m.width,Math.min(vw*.13,120),Math.min(vw*.54,520));
 const h=w*1.11+38;
 const x=limit(m.x*vw,5,Math.max(5,vw-w-5)),y=limit(m.y*vh,5,Math.max(5,vh-h-5));
 dock.style.left=x+'px';dock.style.top=y+'px';dock.style.bottom='auto';dock.style.width=w+'px';dock.style.height=h+'px';
 dock.style.right='auto';
}
let lastAngles='';
function uiPosition(id){
 const u=current().ui;
 if(!u[id])u[id]={...(measuredUI[id]||{x:.3,y:.8})};
 return u[id];
}
function placeUI(){
 for(const [id,el] of Object.entries(uiElements)){
   const pos=uiPosition(id);
   el.style.left=Math.round(limit(pos.x*innerWidth,3,Math.max(3,innerWidth-el.offsetWidth-3)))+'px';
   el.style.top=Math.round(limit(pos.y*innerHeight,3,Math.max(3,innerHeight-el.offsetHeight-3)))+'px';
   el.style.right='auto';el.style.bottom='auto';el.style.transform='none';
 }
}
function apply(){api.setArrangement?.(current().book);positionWalkman();placeUI();
 const m=current().mp3,angles=[m.yaw,m.pitch,m.roll].join('/');
 if(angles!==lastAngles){lastAngles=angles;
   window.dispatchEvent(new CustomEvent('special:scene-layout',{detail:{mp3:{...m}}}));}
}
function setCurrent(type,patch){const base=current()[type];Object.assign(base,patch);scene=sanitize(scene);apply();save();syncInputs();}
const css=(type,attrs,body='')=>`<${type} ${attrs}>${body}</${type}>`;
const button=document.createElement('button');button.id='sa-scene-open';button.type='button';button.textContent='◇ 布置场景';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','sa-scene-panel');
const right=document.querySelector('header.top .right');if(right)right.prepend(button);else{button.style.cssText='position:fixed;top:10px;right:15px;z-index:95';document.body.append(button)}
const panel=document.createElement('aside');panel.id='sa-scene-panel';panel.className='sa-scene-controls';panel.hidden=true;panel.setAttribute('aria-label','书本与随身听的场景布置');
panel.innerHTML=`<h3>◇ 场景布置</h3><p>选「界面组件」后，拖背景音乐控制栏左侧的⠿把手可移动整条播放栏；播放、选曲和音量控件仍可正常操作。</p>
<div class="sa-scene-choice"><button id="sa-pick-book" type="button" aria-pressed="true">📖 书本</button><button id="sa-pick-mp3" type="button" aria-pressed="false">♫ WALKMAN</button><button id="sa-pick-ui" type="button" aria-pressed="false">▣ 界面组件</button></div>
<div id="sa-scene-book-fields"><label for="sa-book-x">书本左右 <output id="sa-book-x-value"></output></label><input id="sa-book-x" type="range" min="-400" max="400" value="0" step="2"><label for="sa-book-z">书本上下 <output id="sa-book-z-value"></output></label><input id="sa-book-z" type="range" min="-300" max="300" value="0" step="2"><label for="sa-book-size">书本尺寸 <output id="sa-book-size-value">100%</output></label><input id="sa-book-size" type="range" min="55" max="145" value="100" step="1"></div>
<div id="sa-scene-mp3-fields" hidden><label for="sa-mp3-x">随身听左右 <output id="sa-mp3-x-value"></output></label><input id="sa-mp3-x" type="range" min="0" max="93" step="1"><label for="sa-mp3-y">随身听上下 <output id="sa-mp3-y-value"></output></label><input id="sa-mp3-y" type="range" min="0" max="91" step="1"><label for="sa-mp3-size">随身听尺寸 <output id="sa-mp3-size-value"></output></label><input id="sa-mp3-size" type="range" min="13" max="52" step="1">
<label for="sa-mp3-yaw">平面朝向 <output id="sa-mp3-yaw-value"></output></label><input id="sa-mp3-yaw" type="range" min="-180" max="180" step="1">
<label for="sa-mp3-pitch">前后倾斜 <output id="sa-mp3-pitch-value"></output></label><input id="sa-mp3-pitch" type="range" min="-32" max="32" step="1">
<label for="sa-mp3-roll">左右倾斜 <output id="sa-mp3-roll-value"></output></label><input id="sa-mp3-roll" type="range" min="-32" max="32" step="1"></div>
<div id="sa-scene-ui-fields" hidden>
<label for="sa-ui-which">选择需要移动的指示框</label>
<select id="sa-ui-which"></select>
<label for="sa-ui-x">左右位置 <output id="sa-ui-x-value"></output></label>
<input id="sa-ui-x" type="range" min="0" max="100" step="1">
<label for="sa-ui-y">上下位置 <output id="sa-ui-y-value"></output></label>
<input id="sa-ui-y" type="range" min="0" max="100" step="1">
<p>也可直接拖动任意带虚线框的控件。桌面和手机分别保存。</p>
</div>
<div class="sa-scene-divider"></div><div class="sa-scene-footer"><button id="sa-scene-reset" type="button">重置当前设备布局</button><button id="sa-scene-done" type="button">✓ 完成布置</button></div>
<div class="sa-scene-settings-btns"><button id="sa-scene-export" type="button">↓ 导出布局 JSON</button><button id="sa-scene-import" type="button">↑ 导入布局 JSON</button></div>
<p class="sa-scene-note" id="sa-scene-note">拖动即自动保存在本浏览器；重新导出网站时，布局会一并打包。</p>
<input id="sa-scene-file" type="file" accept=".json,application/json" hidden>`;
document.body.append(panel);
const outline=document.createElement('div');outline.id='sa-scene-book-outline';document.body.append(outline);
let arranging=false,selected='book',selectedUi=uiElements.musicControls?'musicControls':'music',drag=null,raf=0;
function syncInputs(){const b=current().book,m=current().mp3;
 const u=uiPosition(selectedUi);
 if($('sa-ui-x')){
   $('sa-ui-x').value=Math.round(u.x*100);$('sa-ui-y').value=Math.round(u.y*100);
   $('sa-ui-x-value').textContent=Math.round(u.x*100)+'%';
   $('sa-ui-y-value').textContent=Math.round(u.y*100)+'%';
 }

 for(const [key,val,desc] of [['sa-book-x',b.x*100,Math.round(b.x*100)+''],['sa-book-z',b.z*100,Math.round(b.z*100)+''],['sa-book-size',b.scale*100,Math.round(b.scale*100)+'%'],['sa-mp3-x',m.x*100,Math.round(m.x*100)+'%'],['sa-mp3-y',m.y*100,Math.round(m.y*100)+'%'],['sa-mp3-size',m.width*100,Math.round(m.width*100)+'% 屏宽'],['sa-mp3-yaw',m.yaw,Math.round(m.yaw)+'°'],['sa-mp3-pitch',m.pitch,Math.round(m.pitch)+'°'],['sa-mp3-roll',m.roll,Math.round(m.roll)+'°']]){
 const el=$(key);if(el){el.value=String(val);$(key+'-value').textContent=desc;}}
 $('sa-pick-book').setAttribute('aria-pressed',String(selected==='book'));$('sa-pick-mp3').setAttribute('aria-pressed',String(selected==='mp3'));$('sa-pick-ui').setAttribute('aria-pressed',String(selected==='ui'));
 $('sa-scene-book-fields').hidden=selected!=='book';$('sa-scene-mp3-fields').hidden=selected!=='mp3';$('sa-scene-ui-fields').hidden=selected!=='ui';
 outline.style.borderColor=selected==='book'?'rgba(244,208,155,.85)':'rgba(244,208,155,.30)';
 for(const [id,el] of Object.entries(uiElements)) el.classList.toggle('sa-ui-selected',selected==='ui'&&id===selectedUi);
}
function select(type){selected=type;syncInputs();}
const uiSelect=$('sa-ui-which');
for(const [id,def] of Object.entries(uiDefs))if(uiElements[id]){
 const option=document.createElement('option');option.value=id;option.textContent=def.label;uiSelect.appendChild(option);
}
uiSelect.value=selectedUi;
uiSelect.addEventListener('change',()=>{selectedUi=uiSelect.value;select('ui')});
$('sa-ui-x').addEventListener('input',e=>{
 const pos=uiPosition(selectedUi);pos.x=Number(e.target.value)/100;
 placeUI();save();syncInputs();
});
$('sa-ui-y').addEventListener('input',e=>{
 const pos=uiPosition(selectedUi);pos.y=Number(e.target.value)/100;
 placeUI();save();syncInputs();
});
$('sa-pick-ui').addEventListener('click',()=>select('ui'));
let uiDrag=null;
for(const [id,el] of Object.entries(uiElements)){
 el.addEventListener('pointerdown',e=>{
   // The scene-menu button must always be available to close the mode.
   if(!arranging||e.button>0||e.target.closest('#sa-scene-open')||(id==='musicControls'&&!e.target.closest('.sa-ui-drag-handle')))return;
   e.preventDefault();e.stopImmediatePropagation();
   selectedUi=id;uiSelect.value=id;select('ui');
   const pos=uiPosition(id);
   uiDrag={id:e.pointerId,ui:id,x:e.clientX,y:e.clientY,origin:{...pos}};
   el.setPointerCapture(e.pointerId);
 },true);
 el.addEventListener('pointermove',e=>{
   if(!uiDrag||uiDrag.ui!==id||e.pointerId!==uiDrag.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   const pos=uiPosition(id);
   pos.x=limit(uiDrag.origin.x+(e.clientX-uiDrag.x)/innerWidth,0,1);
   pos.y=limit(uiDrag.origin.y+(e.clientY-uiDrag.y)/innerHeight,0,1);
   placeUI();save();syncInputs();
 },true);
 for(const typ of ['pointerup','pointercancel'])el.addEventListener(typ,e=>{
   if(!uiDrag||uiDrag.ui!==id||e.pointerId!==uiDrag.id)return;
   e.preventDefault();e.stopImmediatePropagation();uiDrag=null;
 },true);
 el.addEventListener('click',e=>{if(arranging && !e.target.closest('#sa-scene-open')&&!(id==='musicControls'&&!e.target.closest('.sa-ui-drag-handle'))){
   e.preventDefault();e.stopImmediatePropagation();
 }},true);
}
function open(mode){arranging=mode;document.body.classList.toggle('sa-scene-arrange',mode);panel.hidden=!mode;button.setAttribute('aria-expanded',String(mode));button.textContent=mode?'✓ 完成布置':'◇ 布置场景';
 if(mode)updateOutline();else outline.style.display='none';}
button.addEventListener('click',()=>open(!arranging));$('sa-scene-done').addEventListener('click',()=>open(false));
$('sa-pick-book').addEventListener('click',()=>select('book'));$('sa-pick-mp3').addEventListener('click',()=>select('mp3'));
for(const [id,type,attr,mult] of [['sa-book-x','book','x',.01],['sa-book-z','book','z',.01],['sa-book-size','book','scale',.01],['sa-mp3-x','mp3','x',.01],['sa-mp3-y','mp3','y',.01],['sa-mp3-size','mp3','width',.01],['sa-mp3-yaw','mp3','yaw',1],['sa-mp3-pitch','mp3','pitch',1],['sa-mp3-roll','mp3','roll',1]]){
 $(id).addEventListener('input',e=>setCurrent(type,{[attr]:Number(e.target.value)*mult}));}
$('sa-scene-reset').addEventListener('click',()=>{if(!confirm('重置当前设备的书本、随身听及所有界面控件的位置？'))return;
 scene[platform()]=JSON.parse(JSON.stringify(sanitize(original)[platform()]));apply();save();syncInputs();});
function exportJson(){const blob=new Blob([JSON.stringify(scene,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='特别出演_书本与WALKMAN场景布局.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),12000)}
$('sa-scene-export').addEventListener('click',exportJson);$('sa-scene-import').addEventListener('click',()=>$('sa-scene-file').click());
$('sa-scene-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(!obj||(!obj.desktop&&!obj.mobile))throw Error('无效布局文件');scene=sanitize(obj);apply();save();syncInputs();$('sa-scene-note').textContent='布局已导入并保存';}catch(err){alert('导入失败：'+err.message)}finally{e.target.value=''}});
function project(v){const p=v.clone().project(api.camera),r=api.canvas.getBoundingClientRect();return {x:(p.x+1)*r.width/2+r.left,y:(1-p.y)*r.height/2+r.top}}
function updateOutline(){if(!arranging||!api.isReading()){outline.style.display='none';return}
 // Project the actual 3-D book's corners instead of assuming it is centered.
 api.book.updateWorldMatrix(true,true);
 const w=api.bookWidth,h=api.bookHeight,coords=[];
 for(const x of [-w,w])for(const y of [-h/2,h/2]){
   for(const z of [-.045,.13])coords.push(project(api.book.localToWorld(new api.THREE.Vector3(x,y,z))));}
 const xs=coords.map(v=>v.x),ys=coords.map(v=>v.y),a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys);
 if(![a,b,c,d].every(Number.isFinite))return;
 outline.style.display='block';outline.style.left=a+'px';outline.style.top=c+'px';outline.style.width=(b-a)+'px';outline.style.height=(d-c)+'px';
}
function screenToWorldMove(dx,dy){const T=api.THREE;
 const a=project(new T.Vector3(0,0,0)),bx=project(new T.Vector3(1,0,0)),bz=project(new T.Vector3(0,0,1));
 const u=bx.x-a.x,v=bx.y-a.y,w=bz.x-a.x,t=bz.y-a.y,det=u*t-w*v;
 if(Math.abs(det)<1e-3)return{x:dx/150,z:-dy/150};
 return {x:(dx*t-dy*w)/det,z:(dy*u-dx*v)/det}}
function onBookDown(e){if(!arranging||!api.isReading()||e.button>0)return;
 const r=outline.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
 e.preventDefault();e.stopImmediatePropagation();select('book');drag={kind:'book',id:e.pointerId,startX:e.clientX,startY:e.clientY,origin:{...current().book}};api.canvas.setPointerCapture(e.pointerId);}
function onBookMove(e){if(!drag||drag.kind!=='book'||e.pointerId!==drag.id)return;
 e.preventDefault();e.stopImmediatePropagation();const diff=screenToWorldMove(e.clientX-drag.startX,e.clientY-drag.startY);
 setCurrent('book',{x:drag.origin.x+diff.x,z:drag.origin.z+diff.z});updateOutline();}
function bookEnd(e){if(drag?.kind!=='book'||e.pointerId!==drag.id)return;e.preventDefault();e.stopImmediatePropagation();drag=null;}
// Capture before flipbook pointer handlers, so arranging can never flip a page.
const stage=api.stage;stage.addEventListener('pointerdown',onBookDown,true);stage.addEventListener('pointermove',onBookMove,true);stage.addEventListener('pointerup',bookEnd,true);stage.addEventListener('pointercancel',bookEnd,true);
// Capture on the Walkman parent before its 3-D button listeners. In arrange
// mode dragging moves the dock; in reading mode the original buttons still work.
let mp3Drag=null;
dock.addEventListener('pointerdown',e=>{if(!arranging||e.button>0||e.target.closest('.v12191-meta'))return;select('mp3');e.preventDefault();e.stopImmediatePropagation();
 const m=current().mp3;mp3Drag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{...m}};dock.setPointerCapture(e.pointerId);},true);
dock.addEventListener('pointermove',e=>{if(!mp3Drag||e.pointerId!==mp3Drag.id)return;e.preventDefault();e.stopImmediatePropagation();setCurrent('mp3',{x:mp3Drag.origin.x+(e.clientX-mp3Drag.x)/innerWidth,y:mp3Drag.origin.y+(e.clientY-mp3Drag.y)/innerHeight});},true);
for(const typ of ['pointerup','pointercancel'])dock.addEventListener(typ,e=>{if(!mp3Drag||mp3Drag.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();mp3Drag=null;},true);
window.addEventListener('resize',()=>{positionWalkman();placeUI();updateOutline()});
window.addEventListener('special:readerviewchange',()=>{if(!api.isReading()&&arranging)open(false);updateOutline()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&arranging)open(false)});
function animate(){requestAnimationFrame(animate);if(!arranging)return;if(++raf%8===0)updateOutline()};animate();
apply();syncInputs();
window.SpecialSceneLayout=Object.freeze({getAll:()=>JSON.parse(JSON.stringify(scene)),getCurrent:()=>JSON.parse(JSON.stringify(current())),isArranging:()=>arranging,applyAll:value=>{scene=sanitize(value);apply();save();syncInputs()},refreshUI:()=>{placeUI();updateOutline()},getPublishedDefault:()=>JSON.parse(JSON.stringify(original))});
})();
