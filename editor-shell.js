/* Special Appearance V12.18 — hybrid editing shell.
 * Presentation-only controls delegate to the existing editor's buttons.
 * No private project data is read, persisted, or deleted here.
 */
(()=>{'use strict';
 const root=document.getElementById('ppt');if(!root)return;
 const $=id=>document.getElementById(id);
 const body=root.querySelector('.ppt-body');const top=root.querySelector('.ppt-topbar');
 if(!body||!top)return;
 root.classList.add('hybrid-editor');
 const rail=document.createElement('nav');rail.className='hybrid-rail';rail.setAttribute('aria-label','创作工具导航');
 function press(id){$(id)?.click()}
 function ensurePanel(side){
  const hidden=root.classList.contains(side==='left'?'v1210-hide-left':'v1210-hide-right');
  if(hidden)press(side==='left'?'toggleLeftPanel':'toggleRightPanel');
 }
 const navItems=[
  {name:'书页',glyph:'▤',action:()=>ensurePanel('left'),key:'pages'},
  {name:'总览',glyph:'▦',action:()=>press('openPageOverview'),key:'overview'},
  {name:'模板',glyph:'◫',action:()=>{ensurePanel('right');root.querySelector('[data-tab="templates"]')?.click()},key:'templates'},
  {name:'素材',glyph:'✿',action:()=>{ensurePanel('right');root.querySelector('[data-tab="stickers"]')?.click()},key:'stickers'},
  {name:'图层',glyph:'▱',action:()=>{ensurePanel('right');root.querySelector('[data-tab="layers"]')?.click()},key:'layers'},
  {name:'文字',glyph:'T',action:()=>press('addText')},
  {name:'图片',glyph:'▧',action:()=>press('addPhoto')},
  {name:'色块',glyph:'◇',action:()=>press('addShape')},
  {name:'视频',glyph:'▶',action:()=>press('addVideo')},
  {name:'音频',glyph:'♫',action:()=>press('addAudio')}
 ];
 const buttons=[];
 for(const item of navItems){
  const b=document.createElement('button');b.type='button';b.className='hybrid-rail-button';b.title=item.name;
  b.setAttribute('aria-label',item.name);b.innerHTML=`<span aria-hidden="true" class="hybrid-rail-glyph"></span><small></small>`;
  b.querySelector('span').textContent=item.glyph;b.querySelector('small').textContent=item.name;
  b.addEventListener('click',()=>{item.action();buttons.forEach(x=>x.classList.toggle('active',x===b));});
  rail.append(b);buttons.push(b);
 }
 const railSpacer=document.createElement('div');railSpacer.className='hybrid-rail-spacer';rail.append(railSpacer);
 const fontButton=document.createElement('button');fontButton.className='hybrid-rail-button';fontButton.type='button';fontButton.title='导入字体';
 fontButton.innerHTML='<span class="hybrid-rail-glyph" aria-hidden="true">Aa</span><small>字体</small>';fontButton.addEventListener('click',()=>press('importFont'));rail.append(fontButton);
 const more=document.createElement('details');more.className='hybrid-rail-more';more.innerHTML='<summary title="更多编辑功能" aria-label="更多编辑功能"><span>···</span><small>更多</small></summary><div class="hybrid-rail-menu"><strong>更多工具</strong></div>';
 for(const [name,id] of [['更换封面图片','replaceCoverPhoto'],['批量更换选中照片','replaceSelectedPhotos'],['显示或隐藏提示','toggleCompactMode'],['导出阅读版','exportZip']]){
  const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{press(id);more.open=false});more.querySelector('.hybrid-rail-menu').append(b);
 }
 rail.append(more);body.prepend(rail);
 // Retain the existing layout controls intact, but put them in a low-noise dropdown.
 const menu=document.createElement('details');menu.className='hybrid-view-menu';
 menu.innerHTML='<summary title="调整工作台布局">☷ 布局</summary><div class="hybrid-view-contents"><b>工作台布局</b></div>';
 const layout=root.querySelector('.v1210-layout-actions');
 if(layout)menu.querySelector('.hybrid-view-contents').append(layout);
 root.querySelector('.ppt-actions')?.insertBefore(menu,root.querySelector('#saveDraft'));
 // Exports are still fully available but no longer occupy half the header.
 // editable-publisher.js inserts its export button next to #exportZip after DOMContentLoaded.
 const exportMenu=document.createElement('details');exportMenu.className='hybrid-export-menu';
 exportMenu.innerHTML='<summary title="导出摄影书或完整可编辑网站">⇩ 导出</summary><div class="hybrid-export-contents"><b>导出与发布</b></div>';
 const exports=exportMenu.querySelector('.hybrid-export-contents');
 const quality=root.querySelector('.v122-quality');if(quality)exports.append(quality);
 const pageExport=$('exportPageImage');if(pageExport)exports.append(pageExport);const readerExport=$('exportZip');if(readerExport)exports.append(readerExport);
 root.querySelector('.ppt-actions')?.insertBefore(exportMenu,root.querySelector('#saveDraft'));
 const tools=root.querySelector('.ppt-tools');
 const caption=document.createElement('span');caption.className='hybrid-selection-caption';caption.textContent='选择图层后编辑属性';
 tools?.prepend(caption);
 document.addEventListener('special:editor-selection',e=>{
  const type=e.detail?.type;
  const labels={none:'选择图层后编辑属性',text:'文字工具',image:'照片与素材',shape:'色块属性',multi:'多选图层',placeholder:'照片占位',video:'视频卡片',audio:'音频卡片'};
  caption.textContent=labels[type]||'编辑图层';
  if(type==='image'||type==='text'||type==='shape'){
   // Avoid force-opening right panel if user intentionally collapsed it.
   root.querySelector('[data-tab="layers"]')?.click();
  }
 });
 document.addEventListener('pointerdown',e=>{
  if(menu.open&&!menu.contains(e.target))menu.open=false;
  if(exportMenu.open&&!exportMenu.contains(e.target))exportMenu.open=false;
  if(more.open&&!more.contains(e.target))more.open=false;
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;more.open=false;exportMenu.open=false;}});
})();
