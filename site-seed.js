/* Special Appearance V12.5 static editable-site seed installer.
   Only initializes a NEW browser/origin with published content. Existing local drafts win. */
(function(){'use strict';
 const SEED='site-data/manifest.json';
 async function getFile(path){
   if(!/^site-data\/[a-zA-Z0-9/_\-.]+$/.test(path)||path.includes('..'))throw Error('非法预置素材路径');
   const r=await fetch(path,{cache:'no-cache'});if(!r.ok)throw Error('预置文件缺失：'+path);
   return r.blob();
 }
 function dataUrl(blob){return new Promise((yes,no)=>{const reader=new FileReader();reader.onload=()=>yes(reader.result);reader.onerror=()=>no(reader.error);reader.readAsDataURL(blob)})}
 function hashStr(h,s){const v=String(s||'');for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
 function projectFingerprint(proj){
   if(!proj||!Array.isArray(proj.slides))return 'empty';
   let h=2166136261;
   const mixPage=(p)=>{
     if(!p)return;
     h=hashStr(h,p.bg||'');h=hashStr(h,p.title||'');h=hashStr(h,p.subtitle||'');
     h=hashStr(h,p.flattenedImported?'1':'0');
     const els=Array.isArray(p.elements)?p.elements:[];
     h=hashStr(h,els.length);
     for(const e of els){
       if(!e)continue;
       h=hashStr(h,`${e.type||''}|${Math.round((e.x||0)*100)}|${Math.round((e.y||0)*100)}|${Math.round((e.w||0)*100)}|${Math.round((e.h||0)*100)}|${Math.round((e.rot||0)*10)}|${e.src||''}|${e.text||''}|${e.fontFamily||''}|${e.color||''}`);
     }
   };
   mixPage(proj.cover);mixPage(proj.back);
   for(const s of proj.slides)mixPage(s);
   return `${proj.slides.length}:${(h>>>0).toString(16)}`;
 }
 function contentSlideCount(proj){
   if(!proj||!Array.isArray(proj.slides))return 0;
   let count=0;
   for(const s of proj.slides){
     const els=Array.isArray(s?.elements)?s.elements:[];
     if(els.some(e=>e&&(e.type==='video'||(e.type==='image'&&typeof e.src==='string'&&e.src&&!e.src.startsWith('data:image/svg+xml')))))count++;
   }
   return count;
 }
 async function install(db,readDb,writeDb){
   const existing=await readDb('layout');
   const meta=await readDb('seed-meta');
   let response;
   try{response=await fetch(SEED,{cache:'no-cache'})}catch(_){return existing?{state:'local'}:{state:'absent'}}
   if(!response.ok)return existing?{state:'local'}:{state:'absent'};
   const m=await response.json();if(m.format!=='special-appearance-editable-v1'||!m.project)throw Error('可编辑站点预置数据格式错误');
   const project=m.project;
   if(!Array.isArray(project.slides)||!project.slides.length||project.slides.length>80||project.slides.length%2)throw Error('预置书页数量无效');
   const targetFp=projectFingerprint(project);
   const seedId=m.seedId||String(m.exportedAt||'');
   let resultState='installed';
   if(existing){
     if(meta){
       if(meta.exportedAt===m.exportedAt&&(meta.seedId||'')===(m.seedId||'')&&contentSlideCount(existing)>=14){
         if(projectFingerprint(existing)===targetFp){
           let prev='';try{prev=localStorage.getItem('special-appearance-v9-count')||''}catch(_){}
           try{localStorage.setItem('special-appearance-seed-id',seedId)}catch(_){}
           if(prev!==String(project.slides.length)){
             try{localStorage.setItem('special-appearance-v9-count',String(project.slides.length))}catch(_){}
             return {state:'upgraded',pages:project.slides.length,stickers:0,fonts:0,media:0};
           }
         }
         return {state:'local'};
       }
       if(meta.fingerprint&&projectFingerprint(existing)!==meta.fingerprint&&contentSlideCount(existing)>=20)return {state:'local'};
       resultState='upgraded';
     }else{
       const oldLen=Array.isArray(existing.slides)?existing.slides.length:0;
       if(projectFingerprint(existing)===targetFp){
         let prev='';try{prev=localStorage.getItem('special-appearance-v9-count')||''}catch(_){}
         try{localStorage.setItem('special-appearance-seed-id',seedId)}catch(_){}
         await writeDb('seed-meta',{seedId,exportedAt:m.exportedAt||'',pages:project.slides.length,fingerprint:targetFp});
         if(prev!==String(project.slides.length)){
           try{localStorage.setItem('special-appearance-v9-count',String(project.slides.length))}catch(_){}
           return {state:'upgraded',pages:project.slides.length,stickers:0,fonts:0,media:0};
         }
         return {state:'local'};
       }
       if(!(oldLen<project.slides.length||contentSlideCount(existing)<20))return {state:'local'};
       resultState='upgraded';
     }
   }
   // Validate referenced media/assets before writing the main layout, so a partial
   // upload does not silently create a broken draft that would mask new deployments.
   const media=[];
   for(const item of (m.media||[])){
     const b=await getFile(item.path);media.push({item,b});
   }
   const fonts=[];
   for(const item of (m.fonts||[])){
     const b=await getFile(item.path);
     fonts.push({file:new File([b],item.name||'font.ttf',{type:item.type||'',lastModified:item.lastModified||Date.now()})});
   }
   const stickers=[];
   const packs=new Map();
   for(const item of (m.stickers||[])){
     let b;
     if(item.bundle){
       if(!packs.has(item.bundle)){
         if(!window.JSZip)throw Error('缺少素材解包模块');
         packs.set(item.bundle,await JSZip.loadAsync(await getFile(item.bundle)));
       }
       const archived=packs.get(item.bundle).file(item.path);
       if(!archived)throw Error('素材包缺少文件：'+item.path);
       b=await archived.async('blob');
       if(!b.type)b=new Blob([b],{type:/\.jpe?g$/i.test(item.path)?'image/jpeg':/\.webp$/i.test(item.path)?'image/webp':'image/png'});
     }else b=await getFile(item.path); // support older unbundled exports
     const {bundle,path,...metadata}=item;
     stickers.push({...metadata,data:await dataUrl(b)});
   }
   // Some images remain as static URLs inside the project to avoid bloating the
   // IndexedDB document; their bytes are included in the deployed site.
   for(const {item,b} of media){
     await window.SpecialMediaStore.put(db,new File([b],item.name||'media',{type:item.type||b.type}),item.id);
   }
   if(fonts.length)await writeDb('font-library-v4',fonts);
   await writeDb('personal-sticker-folders-v1',m.folders||[]);
   await writeDb('personal-sticker-library-v1',stickers);
   const templates=structuredClone(m.collageTemplates||[]);
   for(const t of templates)for(const el of (t.elements||[]))if(el.type==='image'&&typeof el.src==='string'&&el.src.startsWith('site-data/')){el.src=await dataUrl(await getFile(el.src));}
   if(templates.length)await writeDb('personal-collage-templates-v1',templates);
   await writeDb('layout',project);
   await writeDb('seed-meta',{seedId,exportedAt:m.exportedAt||'',pages:project.slides.length,fingerprint:targetFp});
   try{localStorage.setItem('special-appearance-seed-id',seedId);localStorage.setItem('special-appearance-v9-count',String(project.slides.length))}catch(_){ }
   return {state:resultState,pages:project.slides.length,stickers:stickers.length,fonts:fonts.length,media:media.length};
 }
 window.SpecialSiteSeed={install};
})();
