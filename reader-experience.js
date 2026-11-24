/* 特别出演 V12.17 — reader-first enhancements. No editing project changes. */
(() => {
  'use strict';
  const api = window.SpecialBookReader;
  const book = window.PHOTOBOOK;
  const dock = document.querySelector('.dock');
  const nav = dock?.querySelector('.row');
  if (!api || !book?.spreads?.length || !dock || !nav) return;
  const byId = id => document.getElementById(id);
  const limit = (n, a, b) => Math.min(b, Math.max(a, n));
  const lastPage = book.spreads.length * 2 + 1;
  const key = `${book.id || book.title || 'special-appearance'}-v1217-progress`;
  const isEditing = () => !!(byId('ppt') && !byId('ppt').hidden);
  const hasMedia = () => document.body.classList.contains('sa-media-playing');
  const safeFile = name => typeof name === 'string' && !name.includes('..') && !name.startsWith('/') && !name.includes('\\') ? 'assets/pages/' + name.split('/').map(encodeURIComponent).join('/') : '';

  function readProgress() {
    try {
      const v = JSON.parse(localStorage.getItem(key) || 'null');
      if (!v || !Number.isInteger(v.page) || v.page < 0 || v.page > lastPage) return null;
      // Inserting pages in the editor must not destroy a previously saved place.
      if (Number.isInteger(v.lastPage) && v.lastPage !== lastPage && v.page === v.lastPage) return null;
      return {...v,lastPage};
    } catch (_) { return null; }
  }
  let previous = readProgress();
  let currentPage = api.getState().page;
  let activated = false;
  function storeProgress(page, mode) {
    const value = { page: limit(Math.round(page), 0, lastPage), mode: mode === 'single' ? 'single' : 'spread', lastPage, savedAt: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* private browsing or quota */ }
    previous = value;
  }

  const toolbar = document.createElement('div');
  toolbar.className = 'v1217-actionbar';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', '阅读辅助工具');
  toolbar.innerHTML = '<button type="button" id="v1217-contents" title="浏览全部书页">▦ 目录</button><button type="button" id="v1217-immersive" title="隐藏阅读控件">⤢ 沉浸阅读</button>';
  // V12.17.1: dock remains below the book; the helper buttons sit at the bottom.
  dock.appendChild(toolbar);

  const floating = document.createElement('button');
  floating.id = 'v1217-show-ui'; floating.type = 'button';
  floating.textContent = '显示阅读控件'; floating.hidden = true;
  floating.setAttribute('aria-label', '显示阅读控件');
  document.body.append(floating);
  function immersive(flag) {
    document.body.classList.toggle('v1217-immersive', !!flag);
    floating.hidden = !flag;
    byId('v1217-immersive').setAttribute('aria-pressed', String(!!flag));
  }
  byId('v1217-immersive').addEventListener('click', () => { if (!isEditing()) immersive(true); });
  floating.addEventListener('click', () => immersive(false));
  const ppt = byId('ppt');
  if (ppt) new MutationObserver(() => { if (!ppt.hidden) { immersive(false); dismiss(); } }).observe(ppt, {attributes:true,attributeFilter:['hidden']});

  const resume = document.createElement('aside');
  resume.className = 'v1217-resume'; resume.hidden = true;
  resume.setAttribute('aria-label', '继续阅读');
  resume.innerHTML = '<span id="v1217-resume-text"></span><button type="button" id="v1217-resume-go">继续阅读</button><button type="button" id="v1217-resume-dismiss" aria-label="关闭继续阅读提示">×</button>';
  document.body.append(resume);
  function showResume() {
    if (!previous || previous.page <= 0 || previous.page >= lastPage || isEditing() || activated) return;
    byId('v1217-resume-text').textContent = `上次读到第 ${previous.page} 页`;
    resume.hidden = false;
  }
  showResume();
  byId('v1217-resume-dismiss').addEventListener('click', () => { resume.hidden = true; });
  byId('v1217-resume-go').addEventListener('click', () => {
    if (!previous || isEditing()) return;
    // A deliberate gesture is required; keep the cover as the default first impression.
    const page = previous.page;
    if (api.getState().mobile && previous.mode) api.setMode(previous.mode);
    goToPage(page);
    resume.hidden = true;
  });

  const overlay = document.createElement('div');
  overlay.className = 'v1217-toc'; overlay.hidden = true;
  overlay.innerHTML = '<div class="v1217-toc-backdrop" data-close="yes"></div><section class="v1217-toc-dialog" role="dialog" aria-modal="true" aria-labelledby="v1217-toc-title" tabindex="-1"><header><div><h2 id="v1217-toc-title">特别出演 · 书页目录</h2><p id="v1217-toc-subtitle">点击任意书页跳转</p></div><button type="button" id="v1217-toc-close" aria-label="关闭目录">✕</button></header><div class="v1217-toc-grid" id="v1217-toc-grid"></div><footer><button type="button" id="v1217-from-cover">从封面重新阅读</button><span id="v1217-toc-status" role="status"></span></footer></section>';
  document.body.append(overlay);
  const grid = byId('v1217-toc-grid');
  const tocStatus = byId('v1217-toc-status');
  let lastFocus = null, built = false;
  let previewObserver=null, previewEpoch=0, previewBusy=0;
  const previewWork=[];
  function editorSlide(page){
    const editor=window.PPT_V11;
    const project=editor?.getProject?.();
    if(!project||!Array.isArray(project.slides))return null;
    return {editor, slide:page===0?project.cover:page===lastPage?project.back:project.slides[page-1]};
  }
  function queuePreview(img,page,epoch){
    if(!editorSlide(page)||img.dataset.previewEpoch===String(epoch))return;
    img.dataset.previewEpoch=String(epoch);previewWork.push({img,page,epoch});
    drainPreviewQueue();
  }
  function drainPreviewQueue(){
    while(previewBusy<2&&previewWork.length){
      const {img,page,epoch}=previewWork.shift();
      if(epoch!==previewEpoch||!img.isConnected)continue;
      const live=editorSlide(page);if(!live?.slide)continue;
      previewBusy++;
      Promise.resolve().then(()=>live.editor.renderSlide(live.slide,true,0.36)).then(c=>{
        if(epoch===previewEpoch&&img.isConnected)img.src=c.toDataURL('image/jpeg',.8);
      }).catch(err=>{console.warn('目录预览绘制失败',page,err)})
        .finally(()=>{previewBusy--;drainPreviewQueue()});
    }
  }
  function refreshLivePreviews(){
    const editor=window.PPT_V11;
    if(!editor?.getProject||!editor?.renderSlide)return;
    ++previewEpoch;previewWork.length=0;
    previewObserver?.disconnect();
    if('IntersectionObserver' in window){
      previewObserver=new IntersectionObserver(entries=>{
        for(const item of entries){if(item.isIntersecting){
          const img=item.target;
          queuePreview(img,Number(img.dataset.page),previewEpoch);
          previewObserver.unobserve(img);
        }}
      },{root:grid,rootMargin:'180px'});
      grid.querySelectorAll('img[data-page]').forEach(img=>previewObserver.observe(img));
    }else grid.querySelectorAll('img[data-page]').forEach(img=>queuePreview(img,Number(img.dataset.page),previewEpoch));
  }
  function face(page) {
    if (page === 0) return {file:book.frontCover?.file, title:'封面'};
    if (page === lastPage) return {file:book.backCover?.file, title:'封底'};
    const spread = book.spreads[Math.floor((page - 1) / 2)];
    return {file:page % 2 ? spread?.left?.file : spread?.right?.file, title:`第 ${page} 页`};
  }
  function buildToc() {
    if (built) return;
    const fragment = document.createDocumentFragment();
    for (let page = 0; page <= lastPage; page++) {
      const {file,title} = face(page), src = safeFile(file);
      const btn = document.createElement('button'); btn.type = 'button';
      btn.className = 'v1217-toc-card'; btn.dataset.page = String(page);
      btn.setAttribute('aria-label', `跳转到${title}`);
      const art = document.createElement('span'); art.className = 'v1217-toc-image';
      if (src) {
        const img = document.createElement('img');
        img.loading='lazy'; img.decoding='async';img.alt='';img.dataset.page=String(page);
        // Published ZIPs provide light 280px previews. Older sites fall back to full pages.
        const preview=src.replace(/\.jpe?g$/i,'-preview.jpg');
        img.onerror=()=>{if(!img.dataset.previewFallback){img.dataset.previewFallback='1';img.src=src;}};
        img.src=preview===src?src:preview;art.append(img);
      }
      const label = document.createElement('span'); label.textContent = title;
      btn.append(art, label);
      btn.addEventListener('click', () => goToPage(page));
      fragment.append(btn);
    }
    grid.append(fragment); built = true;
  }
  function updateTocSelection() {
    if (!built) return;
    const state = api.getState();
    grid.querySelectorAll('.v1217-toc-card').forEach(b => {
      const page = Number(b.dataset.page);
      const chosen = state.mode === 'single' ? page === state.page : page === state.page || (page > 0 && page < lastPage && page === state.page + 1);
      if (chosen) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  }
  function openToc() {
    if (isEditing() || hasMedia()) return;
    const detail = byId('v12-page-view');
    if (detail && !detail.hidden) return;
    buildToc(); updateTocSelection();refreshLivePreviews();
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('v1217-toc-open');
    tocStatus.textContent = '共 ' + (lastPage - 1) + ' 张正文页';
    byId('v1217-toc-close').focus({preventScroll:true});
    const current = grid.querySelector('[aria-current="page"]');
    current?.scrollIntoView({block:'nearest'});
  }
  function dismiss() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('v1217-toc-open');
    lastFocus?.focus?.({preventScroll:true});
  }
  function goToPage(page) {
    if (isEditing()) return false;
    if (typeof api.isBusy === 'function' && api.isBusy()) {
      if (!overlay.hidden) tocStatus.textContent = '翻页动画还在进行，请稍后再点一次';
      return false;
    }
    activated = true; resume.hidden = true;
    const result = api.goPage(page);
    if (result === false) return false;
    const state = api.getState();
    storeProgress(page, state.mode);
    dismiss();
    return true;
  }
  byId('v1217-contents').addEventListener('click', openToc);
  byId('v1217-toc-close').addEventListener('click', dismiss);
  overlay.querySelector('[data-close]').addEventListener('click', dismiss);
  byId('v1217-from-cover').addEventListener('click', () => goToPage(0));
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
    if (e.key === 'Tab') {
      const items = [...overlay.querySelectorAll('button:not([disabled])')];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.addEventListener('special:readerviewchange', () => {
    const state = api.getState();
    updateTocSelection();
    if (isEditing()) return;
    if (state.page !== currentPage || state.spread !== Math.ceil(currentPage/2)) {
      currentPage = state.page;
      activated = true; resume.hidden = true;
      // Store only after actual navigation, never overwrite a saved bookmark on initial load.
      storeProgress(state.page, state.mode);
    } else if (activated && previous && previous.page === state.page && previous.mode !== state.mode) {
      storeProgress(state.page, state.mode);
    }
  });
  // Desktop/phone keyboard shortcuts when not typing in a menu.
  document.addEventListener('keydown', e => {
    if (overlay.hidden && !isEditing() && !hasMedia() && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); immersive(!document.body.classList.contains('v1217-immersive')); }
    }
  });

  /* Upgrade existing high-resolution viewer rather than introducing a new, blurry WebGL zoom. */
  const viewer = byId('v12-page-view');
  const scroll = viewer?.querySelector('.v12-view-scroll');
  const picture = scroll?.querySelector('img');
  if (scroll && picture) {
    viewer.classList.add('v1217-detail');
    const help = viewer.querySelector('.v12-view-help');
    if (help) help.textContent = '双指捏合缩放 · 放大后单指拖动 · 双击快速放大 · 点击关闭返回 3D 书本';
    const zoomUI = document.createElement('div'); zoomUI.className = 'v1217-zoom-controls';
    zoomUI.innerHTML = '<button type="button" id="v1217-zoom-out" aria-label="缩小">−</button><output id="v1217-zoom-label">100%</output><button type="button" id="v1217-zoom-in" aria-label="放大">+</button><button type="button" id="v1217-zoom-reset">还原</button>';
    scroll.append(zoomUI);
    const pointers = new Map();
    let scale = 1, x = 0, y = 0, gesture = null, tap = null;
    const render = () => {
      picture.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      byId('v1217-zoom-label').textContent = `${Math.round(scale * 100)}%`;
      byId('v1217-zoom-out').disabled = scale <= 1.001;
      byId('v1217-zoom-in').disabled = scale >= 4.999;
    };
    function clampPan() {
      const w = picture.offsetWidth, h = picture.offsetHeight;
      x = limit(x, -Math.max(0, (w * scale - scroll.clientWidth) / 2), Math.max(0, (w * scale - scroll.clientWidth) / 2));
      y = limit(y, -Math.max(0, (h * scale - scroll.clientHeight) / 2), Math.max(0, (h * scale - scroll.clientHeight) / 2));
    }
    function setZoom(next, cx = scroll.clientWidth/2, cy = scroll.clientHeight/2) {
      const target = limit(next, 1, 5), ratio = target / scale;
      x = (cx - scroll.clientWidth/2) - ((cx - scroll.clientWidth/2) - x) * ratio;
      y = (cy - scroll.clientHeight/2) - ((cy - scroll.clientHeight/2) - y) * ratio;
      scale = target;
      if (scale <= 1.001) { x = 0; y = 0; }
      clampPan(); render();
    }
    function reset() { scale=1; x=0; y=0; pointers.clear(); gesture=null; render(); }
    const relative = e => { const b = scroll.getBoundingClientRect(); return {x:e.clientX-b.left, y:e.clientY-b.top}; };
    function pair() {
      const p=[...pointers.values()];
      const mid={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};
      return {mid, distance:Math.max(8, Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y))};
    }
    scroll.addEventListener('pointerdown', e => {
      if (e.target.closest('.v1217-zoom-controls') || e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const p=relative(e); pointers.set(e.pointerId,p);
      try { scroll.setPointerCapture?.(e.pointerId); } catch (_) { /* synthetic events have no captured pointer */ }
      if (pointers.size === 2) {
        const b=pair(); gesture={type:'pinch',distance:b.distance,scale,x,y,mid:b.mid};
      } else if (pointers.size === 1) gesture={type:'pan',p,x,y};
    });
    scroll.addEventListener('pointermove', e => {
      if (!pointers.has(e.pointerId)) return;
      e.preventDefault(); pointers.set(e.pointerId, relative(e));
      if (pointers.size >= 2 && gesture?.type === 'pinch') {
        const b=pair(), target=limit(gesture.scale*(b.distance/gesture.distance),1,5), ratio=target/gesture.scale;
        // Anchor the original picture under the midpoint even as the fingers move.
        scale=target;
        x=(b.mid.x-scroll.clientWidth/2) - ((gesture.mid.x-scroll.clientWidth/2)-gesture.x)*ratio;
        y=(b.mid.y-scroll.clientHeight/2) - ((gesture.mid.y-scroll.clientHeight/2)-gesture.y)*ratio;
        clampPan();render();
      } else if (pointers.size === 1 && gesture?.type === 'pan' && scale > 1) {
        const p=pointers.values().next().value;
        x=gesture.x+p.x-gesture.p.x; y=gesture.y+p.y-gesture.p.y;
        clampPan();render();
      }
    });
    function release(e) {
      if (!pointers.has(e.pointerId)) return;
      const p=relative(e), prior = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        const rest=pointers.values().next().value;
        gesture={type:'pan',p:rest,x,y};
      } else gesture=null;
      if (e.type === 'pointerup' && pointers.size===0 && Math.hypot(p.x-prior.x,p.y-prior.y)<12) {
        const now=performance.now();
        if (tap && now-tap.t<320 && Math.hypot(p.x-tap.x,p.y-tap.y)<32) {
          setZoom(scale<1.5?2.5:1,p.x,p.y);tap=null;
        } else tap={...p,t:now};
      }
    }
    scroll.addEventListener('pointerup', release);
    scroll.addEventListener('pointercancel', release);
    scroll.addEventListener('wheel', e => { if (viewer.hidden) return; e.preventDefault();const p=relative(e);setZoom(scale * (e.deltaY<0?1.15:1/1.15),p.x,p.y); },{passive:false});
    byId('v1217-zoom-in').addEventListener('click',()=>setZoom(scale*1.5));
    byId('v1217-zoom-out').addEventListener('click',()=>setZoom(scale/1.5));
    byId('v1217-zoom-reset').addEventListener('click',reset);
    picture.addEventListener('load',reset);
    new MutationObserver(() => { if (viewer.hidden) reset(); }).observe(viewer,{attributes:true,attributeFilter:['hidden']});
    window.addEventListener('resize', () => { if (!viewer.hidden) {clampPan();render();} });
    render();
  }
  window.SpecialReaderExperience = Object.freeze({ openContents:openToc, showControls:() => immersive(false), getProgress:readProgress });
})();
