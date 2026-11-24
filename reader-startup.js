/* V12.19.6 + V13.4: instant local 3D Walkman startup. */
(()=>{'use strict';
  const manifest=window.SPECIAL_MEDIA_MANIFEST;
  if(!/(?:^|\/)studio\.html$/i.test(location.pathname)&&manifest?.musicId&&!window.SpecialMedia?.playlistDeclared?.()){
    const available=Object.entries(manifest.media||{}).filter(([,item])=>item?.type?.startsWith('audio/')).map(([id])=>id);
    if(!available.includes(manifest.musicId))available.unshift(manifest.musicId);
    manifest.musicIds=[...new Set(available)];window.SpecialMedia?.setManifest(manifest);
    fetch('site-data/manifest.json').then(response=>response.ok?response.json():null).then(data=>{
      for(const item of data?.media||[]){
        if(!item?.id||!item.type?.startsWith('audio/'))continue;
        manifest.media||={};
        manifest.media[item.id]||={src:item.path,type:item.type,name:item.name||'',title:(item.name||'').replace(/\.[^.]+$/,'')};
      }
      const ids=Object.entries(manifest.media||{}).filter(([,item])=>item?.type?.startsWith('audio/')).map(([id])=>id);
      if(manifest.musicId&&!ids.includes(manifest.musicId))ids.unshift(manifest.musicId);
      manifest.musicIds=[...new Set(ids)];window.SpecialMedia?.setManifest(manifest);
    }).catch(()=>{});
  }
  const loader=document.getElementById('loader');
  const dock=document.getElementById('v12191-dock');
  if(!dock)return;
  let launched=false, timer=0;
  function launch(){
    if(launched)return;
    launched=true;
    if(timer){clearTimeout(timer);timer=0;}
    document.documentElement.classList.add('sa-reader-intro-finished');
    dock.removeAttribute('aria-hidden');
    window.dispatchEvent(new Event('special:reader-intro-finished'));
    import('./walkman-dock.js').catch(err=>{
      console.error('WALKMAN failed to load:',err);
      const status=document.getElementById('v12191-status');
      if(status)status.textContent='模型未加载；仍可使用音乐按钮';
      dock.classList.add('is-error');
    });
  }
  function afterIntro(){
    if(launched||timer)return;
    timer=setTimeout(launch,150);
  }
  if(!loader || loader.classList.contains('done'))afterIntro();
  else{
    const observer=new MutationObserver(()=>{
      if(loader.classList.contains('done')){observer.disconnect();afterIntro();}
    });
    observer.observe(loader,{attributes:true,attributeFilter:['class']});
    window.addEventListener('flipbook:ready',afterIntro,{once:true});
    setTimeout(afterIntro,250);
  }
  window.launchWalkmanNow = launch;
})();
