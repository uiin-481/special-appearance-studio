/* V12.5 — create a COMPLETE Cloudflare Pages site using current browser draft,
   all sticker folders/images, all user font files, and all media files.
   Never sends user content to a third-party API; only produces a local ZIP. */
(function(){'use strict';
 const ID='exportEditableSite',W=880,H=1180;
 const $=s=>document.getElementById(s);
 const paths=[
  'index.html','reader.html','studio.html','book-data.js','book.css','book.js','media-player.js','mobile-reader.js','reader-experience.js','reader-experience.css','reader-startup.js','glb-reader.js','walkman-dock.js','walkman-boot.js','walkman-dock.css','scene-layout.js','scene-layout.css','scene-layout-default.js','WALKMAN26_MIT_LICENSE.txt',
  'media-store.js','history-manager.js','ppt-studio.js','ppt-studio.css','mobile-studio.js','mobile-studio.css','editor-shell.js','editor-shell.css','site-seed.js','editable-publisher.js',
  'assets/vendor/jszip.min.js','assets/vendor/three-r128.min.js',
  'assets/vendor/walkman/three.module.js','assets/vendor/walkman/walkman.js','assets/vendor/walkman/display.js','assets/vendor/walkman/tween.js','assets/vendor/walkman/geometries/RoundedBoxGeometry.js',
  'artistic-atmosphere.js','artistic-atmosphere.css','assets/props/nanjing-pcb.png',
  'assets/vendor/THREE-LICENSE.txt','assets/vendor/JSZIP-LICENSE.txt',
  ...['matte','newsprint','cloth','coldpress','ep-back','ep-front','felt','gloss','laid',...Array.from({length:8},(_,i)=>'leaf'+(i+1))].map(n=>'assets/paper/'+n+'.webp')
 ];
 const getValue=(db,key)=>new Promise((yes,no)=>{const r=db.transaction('values').objectStore('values').get(key);r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error)});
 const openDb=()=>new Promise((yes,no)=>{const r=indexedDB.open('special-appearance-v9-private',2);r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error)});
 const fetchBlob=async url=>{const r=await fetch(url);if(!r.ok)throw Error('站点缺少文件：'+url);return r.blob()};
 const canvasBlob=(canvas,q=.89)=>new Promise((yes,no)=>canvas.toBlob(blob=>blob?yes(blob):no(Error('生成书页图片失败')),'image/jpeg',q));
 const base64Blob=url=>{
  const p=url.indexOf(',');if(!url.startsWith('data:')||p<0)throw Error('图片数据格式有误');
  const mime=/^data:([^;,]+)/.exec(url)?.[1]||'application/octet-stream';
  const header=url.slice(0,p),value=url.slice(p+1);
  if(/;base64/i.test(header)){
   const binary=atob(value),bytes=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   return new Blob([bytes],{type:mime});
  }
  return new Blob([decodeURIComponent(value)],{type:mime});
 };
 const ext=mime=>({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','image/svg+xml':'svg'}[mime]||'bin');
 const deep=obj=>structuredClone(obj);
 const allSlides=doc=>[doc.cover,...doc.slides,doc.back];
 const download=(blob,name)=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)};
 function notify(msg){const status=$('savedStatus');if(status)status.textContent=msg;}
 async function makeSite(){
  const button=$(ID),old=button?.textContent;
  if(button){button.disabled=true;button.textContent='正在打包…'}
  let db;
  try{
   if(!window.JSZip||!window.PPT_V11?.getProject)throw Error('请先进入完整编辑器，等待编辑器加载完成');
   db=await openDb();
   const api=window.PPT_V11;
   const source=api.getProject();
   const project=deep(source);
   // Render from the LIVE document before its image paths are rewritten.
   const scale=Number($('readerExportQuality')?.value)||1.5;
   const zip=new JSZip();
   for(let i=0;i<paths.length;i++){
     if(i%5===0)notify(`收集网站程序 ${i+1}/${paths.length}…`);
     if(paths[i]==='book-data.js'||paths[i]==='index.html'||paths[i]==='scene-layout-default.js')continue;
     zip.file(paths[i],await fetchBlob(paths[i]));
   }
   // Source-built WALKMAN ’26 uses upstream ES modules; no GLB asset required.
   const reader=await (await fetch('reader.html')).text();
   zip.file('index.html',reader);
   for(const [name,slide] of [['front-cover.jpg',source.cover],['back-cover.jpg',source.back]]){
     notify('绘制 '+name+'…');
     const canvas=await api.renderSlide(slide,true,scale);
     zip.file('assets/pages/'+name,await canvasBlob(canvas));
     const mini=document.createElement('canvas');mini.width=96;mini.height=128;mini.getContext('2d').drawImage(canvas,0,0,96,128);
     zip.file('assets/pages/'+name.replace('.jpg','-preview.jpg'),await canvasBlob(mini,.82));
   }
   for(let i=0;i<source.slides.length;i++){
     notify(`绘制书页与目录预览 ${i+1}/${source.slides.length}…`);
     const name=`assets/pages/page-${String(i+1).padStart(2,'0')}`;
     const pageCanvas=await api.renderSlide(source.slides[i],true,scale);
     zip.file(name+'.jpg',await canvasBlob(pageCanvas));
     const mini=document.createElement('canvas');mini.width=280;mini.height=Math.round(280*H/W);
     mini.getContext('2d').drawImage(pageCanvas,0,0,mini.width,mini.height);
     zip.file(name+'-preview.jpg',await canvasBlob(mini,.79));
   }
   // Package images from document into static assets; do not keep huge data URLs
   // inside site-data/manifest.json (Pages limits each deployed file to 25MiB).
   const images=new Map();let counter=0;const batch='b'+Date.now().toString(36)+'-';
   async function preserve(src,el){
     if(!src||typeof src!=='string')return src;
     if(images.has(src))return images.get(src);
     let path,blob;
     if(src.startsWith('data:image/')){
       const mime=/^data:([^;,]+)/.exec(src)?.[1]||'image/png';
       path='site-data/images/'+batch+'photo-'+String(++counter).padStart(5,'0')+'.'+ext(mime);
       blob=base64Blob(src);
     }else if(src.startsWith('assets/pages/')&&el?.role==='imported-artwork'){
       // Editing original flattened artwork must NOT point at newly rendered pages,
       // otherwise rendered text/overlays would be composited twice on first edit.
       path='site-data/base-pages/'+src.split('/').pop();blob=await fetchBlob(src);
     }else if(src.startsWith('site-data/')){
       path=src;blob=await fetchBlob(src);
     }else return src;
     if(blob.size>25*1024*1024)throw Error('图片文件超过 Cloudflare Pages 单文件 25MiB 限制：'+path);
     zip.file(path,blob);images.set(src,path);return path;
   }
   for(const slide of allSlides(project))for(const el of (slide?.elements||[])){
     if(el.type==='image'&&el.src)el.src=await preserve(el.src,el);
     if(el.poster&&el.poster.startsWith('data:image/'))el.poster=await preserve(el.poster,el);
     if(el.cutoutOriginalSrc&&el.cutoutOriginalSrc.startsWith('data:image/'))el.cutoutOriginalSrc=await preserve(el.cutoutOriginalSrc,el);
   }
   const originals=await getValue(db,'personal-sticker-library-v1')||[];
   const folders=await getValue(db,'personal-sticker-folders-v1')||[];
   // Thousands of stickers cannot each become a separate Pages asset: dashboard
   // drag-and-drop allows at most 1,000 files. Store images in ~16 MiB ZIP packs.
   const stickers=[];
   let stickerPack=new JSZip(),stickerPackBytes=0,stickerPackNo=1;
   const stickerPackPath=()=>`site-data/sticker-packs/pack-${String(stickerPackNo).padStart(3,'0')}.zip`;
   async function finishStickerPack(){
     if(!stickerPackBytes)return;
     const packed=await stickerPack.generateAsync({type:'blob',compression:'STORE'});
     if(packed.size>25*1024*1024)throw Error('手账素材包超出 Cloudflare 单文件限制');
     zip.file(stickerPackPath(),packed);
     stickerPackNo++;stickerPack=new JSZip();stickerPackBytes=0;
   }
   for(let i=0;i<originals.length;i++){
     const s=originals[i];if(typeof s.data!=='string')continue;
     if(!s.data.startsWith('data:image/'))throw Error('手账素材不是可打包的图片：'+(s.name||i));
     const blob=base64Blob(s.data);
     if(blob.size>20*1024*1024)throw Error('单张手账素材过大：'+(s.name||i));
     if(stickerPackBytes&&stickerPackBytes+blob.size>16*1024*1024)await finishStickerPack();
     const path=`item-${String(i).padStart(5,'0')}.${ext(blob.type)}`;
     stickerPack.file(path,blob);
     stickers.push({id:s.id,name:s.name,width:s.width,height:s.height,folderId:s.folderId||'',favorite:s.favorite===true,origin:s.origin||'',sourceUrl:s.sourceUrl||'',sourcePage:s.sourcePage||'',author:s.author||'',license:s.license||'',bundle:stickerPackPath(),path});
     stickerPackBytes+=blob.size;
     if(i%20===0)notify(`打包手账素材 ${i+1}/${originals.length}…`);
   }
   await finishStickerPack();
   const collageTemplates=deep(await getValue(db,'personal-collage-templates-v1')||[]);
   for(const template of collageTemplates)for(const el of (template.elements||[]))if(el.type==='image'&&el.src)el.src=await preserve(el.src,el);
   const fontList=await getValue(db,'font-library-v4')||[];
   const fonts=[];
   for(let i=0;i<fontList.length;i++){
     const file=fontList[i]?.file;if(!(file instanceof Blob))continue;
     if(file.size>25*1024*1024)throw Error('字体文件超出 Cloudflare 25MiB 限制：'+file.name);
     const path='site-data/fonts/font-'+i+'-'+(file.name?.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'');
     zip.file(path,file);fonts.push({name:file.name||'font-'+i+'.ttf',type:file.type||'',lastModified:file.lastModified||Date.now(),path});
   }
   const mediaList=await window.SpecialMediaStore.all(db),media=[],mediaPaths={};
   const referenced=await api.createMediaManifest(true);
   if((referenced.musicIds||[referenced.musicId]).some(id=>id&&!referenced.media[id]))throw Error('背景音乐文件丢失，已取消导出，以免发布无声网站');
   for(let i=0;i<mediaList.length;i++){
     const m=mediaList[i];
     if(m.blob.size>25*1024*1024)throw Error(`媒体「${m.name}」超过 Pages 单文件 25MiB；请先压缩视频或改用 R2`);
     const extension=m.name?.split('.').pop()?.replace(/[^a-z0-9]/gi,'').slice(0,8)||'bin';
     const path=`site-data/media/media-${i}.${extension}`;
     zip.file(path,m.blob);media.push({id:m.id,name:m.name,type:m.type,size:m.size,path});mediaPaths[m.id]=path;
     notify(`打包音视频 ${i+1}/${mediaList.length}…`);
   }
   for(const [id,item] of Object.entries(referenced.media||{})){
     if(!mediaPaths[id])throw Error('书页引用了已丢失的媒体：'+id);
     item.src=mediaPaths[id];
   }
   const n=source.slides.length;
   const initialBook={id:'special-appearance-editable',title:'特别出演',pageWidth:W,pageHeight:H,frontCover:{file:'front-cover.jpg',alt:'特别出演封面'},backCover:{file:'back-cover.jpg',alt:'特别出演封底'}};
   // The editor can insert/remove spreads locally. Respect that saved page count
   // without changing the deployed snapshot's default number of pages.
   zip.file('book-data.js',`(function(){
  const book=${JSON.stringify(initialBook)};let pages=${n};
  // Public reading must show the published snapshot, even if this browser has
  // old local editing state from a previous deployment. Only the studio uses it.
  if(/(?:^|\\/)studio\\.html$/i.test(location.pathname)){
    try{const saved=Number(localStorage.getItem('special-appearance-v9-count'));if(Number.isInteger(saved)&&saved>=2&&saved<=80&&saved%2===0)pages=saved}catch(_){}
  }
  book.spreads=Array.from({length:pages/2},(_,i)=>({id:'spread-'+(i+1),left:{file:'page-'+String(i*2+1).padStart(2,'0')+'.jpg',alt:'摄影书书页'},right:{file:'page-'+String(i*2+2).padStart(2,'0')+'.jpg',alt:'摄影书书页'}}));
  window.PHOTOBOOK=book;
  window.SPECIAL_MEDIA_MANIFEST=${JSON.stringify(referenced)};
})();`);
   zip.file('scene-layout-default.js','window.SPECIAL_SCENE_LAYOUT_DEFAULT='+JSON.stringify(window.SpecialSceneLayout?.getAll?.() || window.SPECIAL_SCENE_LAYOUT_DEFAULT || {})+';');
   zip.file('site-data/manifest.json',JSON.stringify({format:'special-appearance-editable-v1',version:1,exportedAt:new Date().toISOString(),project,stickers,folders,collageTemplates,fonts,media}));
   zip.file('README_部署说明.txt','《特别出演》完整可编辑网站\n\n上传整个 ZIP 到现有 Cloudflare Pages 项目的生产环境部署。\n/ 是可读 3D 书； /studio.html 是完整编辑器。\n首次打开编辑器时，将部署包内的排版、手账素材、字体、音视频导入当前浏览器 IndexedDB；已有本地草稿不会被覆盖。\n\n警告：本 ZIP 及其线上站点包含完整私人素材、字体和媒体文件。任何知道网址的人都有可能读取或下载这些资源。建议对编辑器及整个私有工程启用 Cloudflare Access，公开分享请使用只读版。\n\nIMPORTANT: Cloudflare Pages 是静态托管，手机或电脑网页上的继续编辑只会保存在当前设备。再次更新线上版本，需从有完整素材的编辑器重新导出此 ZIP 并在 Cloudflare 重新部署。\n\nCloudflare Pages 控制台单文件上限 25MiB，拖放部署最多 1000 文件；超过应使用 Wrangler（最多 20,000 文件，仍受单文件限制）。\n');
   const assetCount=Object.values(zip.files).filter(file=>!file.dir).length;
   if(assetCount>1000){
     notify(`包含 ${assetCount} 个文件，请使用 Wrangler 部署而不是 Cloudflare 控制台拖拽上传`);
     alert(`完整网站包含 ${assetCount} 个文件。Cloudflare Pages 控制台的拖放部署最多支持 1,000 个文件。请先下载 ZIP，解压后使用 Wrangler pages deploy 上传整个文件夹。`);
   }
   notify('正在压缩完整可编辑网站…');
   const archive=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}},metadata=>{if(metadata.percent%10<.2)notify('打包中：'+Math.round(metadata.percent)+'%')});
   download(archive,'特别出演_完整可编辑网站_含当前素材字体.zip');
   notify(`✓ 完整站点已导出：${n} 页、${stickers.length} 项素材、${fonts.length} 款字体、${media.length} 件媒体`);
  }catch(e){console.error(e);notify('导出失败：'+e.message);alert('导出完整可编辑网站失败：\n'+e.message)}
  finally{db?.close();if(button){button.disabled=false;button.textContent=old}}
 }
 function init(){const toolbar=$('exportZip')?.parentElement;if(!toolbar||$(ID))return;
  const b=document.createElement('button');b.id=ID;b.type='button';b.className='editable-export-btn';b.textContent='☁ 导出完整可编辑网站';b.title='把当前书页、素材文件夹、字体、音视频、完整编辑器和3D阅读器打包为可上传 Cloudflare Pages 的 ZIP。不会自动发布。';b.addEventListener('click',makeSite);
  $('exportZip').after(b);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
