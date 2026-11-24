/* Special Appearance V12.1 — mobile 3D single/spread modes and optional still-page aid.
 * Book navigation and camera changes are owned by book.js (one WebGL scene).
 */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const api = window.SpecialBookReader;
  const book = window.PHOTOBOOK;
  const dock = document.querySelector('.dock');
  const navRow = dock?.querySelector('.row');
  if (!stage || !api || !book || !dock || !navRow) return;

  if (api.getState().mobile) document.body.classList.add('v121-mobile');

  const switcher = document.createElement('div');
  switcher.className = 'v121-view-switch';
  switcher.setAttribute('role', 'group');
  switcher.setAttribute('aria-label', '3D 阅读视图');
  const singleBtn = document.createElement('button');
  singleBtn.type = 'button'; singleBtn.textContent = '▯ 单页 3D';
  singleBtn.title = '聚焦一张真实 3D 书页';
  const spreadBtn = document.createElement('button');
  spreadBtn.type = 'button'; spreadBtn.textContent = '▣ 双页 3D';
  spreadBtn.title = '观看完整的 3D 跨页';
  switcher.append(singleBtn, spreadBtn);
  dock.insertBefore(switcher, navRow);

  const status = document.createElement('span');
  status.className = 'v121-status';
  status.setAttribute('aria-live', 'polite');
  navRow.insertBefore(status, navRow.querySelector('#next'));

  function refresh() {
    const state = api.getState();
    singleBtn.setAttribute('aria-pressed', String(state.mode === 'single'));
    spreadBtn.setAttribute('aria-pressed', String(state.mode === 'spread'));
    const {page, spread, lastPage} = state;
    status.textContent = state.mode === 'single'
      ? (page === 0 ? '封面' : page === lastPage ? '封底' : `${page} / ${lastPage - 1}`)
      : (spread === 0 ? '封面' : spread === book.spreads.length + 1 ? '封底' : `${spread * 2 - 1}–${spread * 2} / ${lastPage - 1}`);
  }
  singleBtn.addEventListener('click', () => api.setMode('single'));
  spreadBtn.addEventListener('click', () => api.setMode('spread'));
  window.addEventListener('special:readerviewchange', refresh);
  refresh();

  // V12's still-picture detail mode remains available as an optional fallback.
  // It is NOT the default single-page experience: that stays inside WebGL.
  const zoomBtn = document.createElement('button');
  zoomBtn.id = 'v12-zoom'; zoomBtn.type = 'button';
  zoomBtn.className = 'icon-btn v12-zoom-btn';
  zoomBtn.textContent = '⊕'; zoomBtn.title = '图片细节查看（辅助）';
  zoomBtn.setAttribute('aria-label', '打开清晰图片辅助查看');
  navRow.append(zoomBtn);
  const overlay = document.createElement('div');
  overlay.id = 'v12-page-view'; overlay.hidden = true;
  overlay.innerHTML = '<div class="v12-view-head"><strong>高清图片辅助查看</strong><div><button type="button" id="v12-side" aria-label="切换左右页">切换页面</button><button type="button" id="v12-close" aria-label="关闭高清查看">✕ 关闭</button></div></div><div class="v12-view-scroll"><img alt="高清书页" decoding="async" /></div><p class="v12-view-help">此视图仅用于看清图片细节，关闭后仍在原来的 3D 书页。</p>';
  document.body.append(overlay);
  const img = overlay.querySelector('img');
  const close = overlay.querySelector('#v12-close');
  const side = overlay.querySelector('#v12-side');
  const scroll = overlay.querySelector('.v12-view-scroll');
  let selected = 0;
  let priorFocus = null;

  function pages() {
    const state = api.getState();
    const k = state.spread, n = book.spreads.length;
    if (k === 0) return [book.frontCover.file];
    if (k > n) return [book.backCover.file];
    return [book.spreads[k - 1].left.file, book.spreads[k - 1].right.file];
  }
  function show() {
    const opts = pages();
    selected = Math.min(selected, opts.length - 1);
    img.src = 'assets/pages/' + encodeURIComponent(opts[selected]);
    img.alt = (opts.length === 1 ? '封面或封底' : selected === 0 ? '左页' : '右页') + '清晰图片';
    side.hidden = opts.length < 2;
    side.textContent = selected === 0 ? '查看右页' : '查看左页';
  }
  function open() {
    if (document.body.classList.contains('sa-media-playing')) return;
    priorFocus = document.activeElement;
    const state = api.getState();
    selected = state.mode === 'single' ? (state.page > 0 && state.page < state.lastPage && state.page % 2 === 0 ? 1 : 0) : (pages().length === 2 ? 1 : 0);
    show(); overlay.hidden = false;
    document.body.classList.add('v12-reading');
    close.focus();
  }
  function dismiss() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('v12-reading');
    img.removeAttribute('src');
    priorFocus?.focus?.();
  }
  zoomBtn.addEventListener('click', open);
  close.addEventListener('click', dismiss);
  side.addEventListener('click', () => { selected = 1 - selected; show(); scroll.scrollTop = 0; });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
    else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && pages().length > 1) {
      e.preventDefault(); side.click();
    }
  });
  window.addEventListener('special:pagechange', dismiss);
  window.addEventListener('special:readerviewchange', dismiss);
  window.addEventListener('pagehide', dismiss);
  document.documentElement.classList.add('v12-reader');

  // On portrait phones, bring the existing reader controls into one compact
  // panel. Keep placeholders so desktop and landscape layouts can be restored.
  const mobilePanel = document.createElement('section');
  mobilePanel.className = 'mobile-reader-panel';
  mobilePanel.setAttribute('aria-label', '手机阅读控制');
  document.body.append(mobilePanel);
  const mobileQuery = window.matchMedia('(max-width: 740px) and (orientation: portrait)');
  const anchors = new Map();
  const mediaRoot = document.querySelector('.sa-media-root');
  const musicControls = mediaRoot?.querySelector('.sa-music-controls');
  function mergeMusicMeta() {
    const meta = document.querySelector('#v12191-dock .v12191-meta');
    if (!meta || !musicControls || musicControls.contains(meta)) return false;
    const grip = musicControls.querySelector('.sa-music-drag-handle');
    if (grip) grip.after(meta);
    else musicControls.prepend(meta);
    return true;
  }
  function remember(node) {
    if (!node || anchors.has(node)) return;
    const anchor = document.createComment('mobile reader control placement');
    node.parentNode.insertBefore(anchor, node);
    anchors.set(node, anchor);
  }
  [document.querySelector('.top .right'), document.querySelector('.sa-media-root'), dock].forEach(remember);
  function arrangeMobileControls() {
    const merged = mergeMusicMeta();
    const actionbar = document.querySelector('.v1217-actionbar');
    remember(actionbar);
    if (mobileQuery.matches) {
      for (const node of anchors.keys()) mobilePanel.append(node);
      document.body.classList.add('mobile-reader-active');
    } else {
      for (const [node, anchor] of anchors) {
        if (anchor.parentNode) anchor.parentNode.insertBefore(node, anchor);
      }
      document.body.classList.remove('mobile-reader-active');
    }
    if (merged) window.SpecialSceneLayout?.refreshUI?.();
  }
  mobileQuery.addEventListener?.('change', arrangeMobileControls);
  window.addEventListener('resize', arrangeMobileControls);
  window.addEventListener('load', arrangeMobileControls, {once: true});
  arrangeMobileControls();
})();
