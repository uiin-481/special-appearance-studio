/* V12.3: phone editing UI, shares the desktop PPT document model and WebGL reader. */
(() => {
 'use strict';
 const ppt=document.getElementById('ppt');
 const canvas=document.getElementById('editCanvas');
 const frame=document.querySelector('.canvas-frame');
 const viewport=document.querySelector('.canvas-center');
 const heading=document.querySelector('.canvas-heading');
 const left=document.querySelector('.ppt-left');
 const right=document.querySelector('.ppt-right');
 if(!ppt || !canvas || !frame || !viewport || !heading || !left || !right)return;
 const mobile=()=>window.matchMedia('(max-width: 800px)').matches;
 const mk=(tag,cls,content)=>{const e=document.createElement(tag);e.className=cls;if(content!==undefined)e.textContent=content;return e};
 const nav=mk('nav','mobile-studio-nav');nav.setAttribute('aria-label','手机编辑功能');
 const panels=[['pages','▤','页面'],['templates','▦','模板'],['stickers','✿','素材'],['layers','☷','图层'],['preview','◈','3D预览']];
 let selectedPane='';
 const btns={};
 function closePane(){ppt.classList.remove(...panels.map(x=>'mobile-pane-'+x[0]));selectedPane='';for(const e of Object.values(btns))e.setAttribute('aria-pressed','false')}
 function setPane(pane){
   if(!mobile())return;
   if(pane==='preview'){closePane();document.getElementById('closeStudio')?.click();return}
   if(pane===selectedPane){closePane();return}
   closePane();selectedPane=pane;ppt.classList.add('mobile-pane-'+pane);
   btns[pane]?.setAttribute('aria-pressed','true');
   if(pane!=='pages')document.querySelector(`.right-tab[data-tab="${pane}"]`)?.click();
 }
 for(const [key,icon,label] of panels){
   const b=mk('button','');b.type='button';b.innerHTML=`<span aria-hidden="true">${icon}</span>${label}`;
   b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>setPane(key));nav.append(b);btns[key]=b;
 }
 ppt.append(nav);
 for(const parent of [left,right]){
   const h=parent===left?parent.querySelector('.side-title'):parent.querySelector('.right-head');
   const b=mk('button','mobile-sheet-close','收起 ✕');b.type='button';b.onclick=closePane;h?.append(b);
 }
 const controls=mk('div','mobile-canvas-controls');
 const previous=mk('button','','‹'), next=mk('button','','›');
 const minus=mk('button','','−'),plus=mk('button','','＋'),pan=mk('button','','✋');
 const zoomText=mk('span','','100%');
 for(const [btn,label] of [[previous,'上一页'],[next,'下一页'],[minus,'缩小画布'],[plus,'放大画布'],[pan,'移动画布模式']]){btn.type='button';btn.title=label;btn.setAttribute('aria-label',label)}
 pan.setAttribute('aria-pressed','false');controls.append(previous,next,minus,zoomText,plus,pan);heading.append(controls);
 const note=mk('div','mobile-editor-note','触摸拖动元素 · ＋/− 放大画布 · ✋ 可平移 · 图层面板修改文字');
 ppt.querySelector('.ppt-body')?.after(note);
 let zoom=1;
 let panning=false;
 const fit=()=>Math.min(410,Math.max(240,viewport.clientWidth-26));
 function layout(rememberPos=false){
   if(!mobile()){frame.style.width='';frame.style.height='';frame.style.marginLeft='';frame.style.marginRight='';return}
   const oldWidth=frame.getBoundingClientRect().width||1;
   const fracX=rememberPos?(viewport.scrollLeft+viewport.clientWidth/2)/oldWidth:0.5;
   const fracY=rememberPos?(viewport.scrollTop+viewport.clientHeight/2)/(oldWidth*1180/880):0.5;
   const w=Math.round(fit()*zoom);
   frame.style.width=w+'px';frame.style.height=Math.round(w*1180/880)+'px';
   frame.style.marginLeft=w<viewport.clientWidth-24?'auto':'0';
   frame.style.marginRight=w<viewport.clientWidth-24?'auto':'0';
   zoomText.textContent=Math.round(zoom*100)+'%';
   if(rememberPos)requestAnimationFrame(()=>{
     viewport.scrollLeft=Math.max(0,fracX*w-viewport.clientWidth/2);
     viewport.scrollTop=Math.max(0,fracY*w*1180/880-viewport.clientHeight/2);
   });
 }
 function setZoom(val){zoom=Math.max(.75,Math.min(3,val));layout(true)}
 minus.onclick=()=>setZoom(Math.round((zoom-.25)*100)/100);
 plus.onclick=()=>setZoom(Math.round((zoom+.25)*100)/100);
 function activePage(){const c=document.querySelector('#slideList .slide-item.active canvas');if(!c)return 0;if(c.dataset.special==='-1')return -1;if(c.dataset.special==='-2')return window.PPT_V11?.getProject()?.slides?.length||0;return Number(c.dataset.slide)||0}
 function goPage(delta){const api=window.PPT_V11; if(!api)return;
   const n=api.getProject().slides.length;const i=activePage(),p=Math.max(-1,Math.min(n,i+delta));
   api.selectPage(p===n?-2:p);closePane();
 }
 previous.onclick=()=>goPage(-1);next.onclick=()=>goPage(1);
 pan.onclick=()=>{panning=!panning;pan.setAttribute('aria-pressed',String(panning));pan.style.background=panning?'#6c5072':'';pan.style.color=panning?'white':''};
 // In pan mode, interception happens in capture phase, before PPT element manipulation.
 let gesture=null;
 canvas.addEventListener('pointerdown',e=>{
   if(!mobile()||!panning||e.button!==0)return;
   e.preventDefault();e.stopImmediatePropagation();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,l:viewport.scrollLeft,t:viewport.scrollTop};
   canvas.setPointerCapture(e.pointerId);
 },true);
 canvas.addEventListener('pointermove',e=>{
   if(!gesture||e.pointerId!==gesture.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   viewport.scrollLeft=gesture.l-(e.clientX-gesture.x);
   viewport.scrollTop=gesture.t-(e.clientY-gesture.y);
 },true);
 for(const type of ['pointerup','pointercancel'])canvas.addEventListener(type,e=>{
   if(!gesture||e.pointerId!==gesture.id)return;
   e.preventDefault();e.stopImmediatePropagation();gesture=null;
 },true);
 // Auto collapse page tray when selecting a page, to expose the full canvas.
 left.querySelector('#slideList')?.addEventListener('click',e=>{
   if(mobile()&&e.target.closest('.slide-item'))setTimeout(closePane,100);
 });
 document.getElementById('openStudio')?.addEventListener('click',()=>{closePane();zoom=1;requestAnimationFrame(()=>layout());setTimeout(()=>layout(),120)});
 document.getElementById('closeStudio')?.addEventListener('click',closePane);
 window.addEventListener('resize',()=>layout(true));
 window.matchMedia('(max-width: 800px)').addEventListener?.('change',()=>{closePane();layout()});
 // Export controls remain accessible from the main header even on phone.
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mobile()&&selectedPane)closePane()});
 if(mobile())requestAnimationFrame(()=>layout());
 // Opening any URL shows the 3D book first. Editor only opens by explicit user action.
 // A deliberate ?edit=1 shortcut remains available for private maintenance workflows.
 document.addEventListener('DOMContentLoaded',()=>{
   if(new URLSearchParams(location.search).get('edit')==='1'){
     setTimeout(()=>document.getElementById('openStudio')?.click(),100);
   }
 });
})();
