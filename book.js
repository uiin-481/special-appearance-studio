(() => {
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (v) => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };

  const BOOK = window.PHOTOBOOK;
  if (!BOOK || !BOOK.spreads?.length || !(BOOK.pageWidth > 0) || !(BOOK.pageHeight > 0)) {
    $("#loadtext").textContent = "Configure book-data.js with page dimensions and at least one interior spread.";
    return;
  }
  document.title = BOOK.title;
  document.querySelectorAll(".book-title").forEach(el => { el.textContent = BOOK.title; });
  $("meta[name='description']").content = BOOK.title + "：送给朋友们的 3D 私人回忆摄影书。";

  // ---------- the physical book (1 unit = 10 cm) ----------
  const H = 2.0, W = H * BOOK.pageWidth / BOOK.pageHeight; // preserve artwork ratio
  const OH = 0.03;                   // board overhang, the "squares"
  const JNT = 0.014;                 // each board steps out this far from the spine when the book lies open
  const BW = W + OH, BH = H + 2 * OH;
  const BBW = BW - JNT;              // the board itself
  const BT = 0.02;                   // 2 mm greyboard with the printed wrap glued over it
  const BEV = 0.0045;                // wrapped board edges are rounded, never cut square
  const GROOVE = 0.062;              // the hinge groove pressed into the cover, from the spine
  const TURNIN = 0.024;              // how much of the wrap shows around the pastedown
  let PT = 0.0058;                   // one leaf; changes with the paper stock
  const HUMP = 0.011, HUMP_S = 0.07; // open pages arch out of the binding, then settle flat
  const RUN = 0.22;                  // stacked sheets fan up from the spine over this run
  // V12.16: same deforming Three.js paper, fewer vertices on touch devices.
  // Each visible sheet still bends; this changes only mesh tessellation.
  const mobileReader = matchMedia('(max-width: 740px), (pointer: coarse)').matches;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  const saveData = !!navigator.connection?.saveData;
  const economyMode = mobileReader || lowMemory || saveData;
  const COLS = mobileReader ? (lowMemory || saveData ? 28 : 32) : 48;
  const ROWS = mobileReader ? (lowMemory || saveData ? 14 : 16) : 22;
  const DS = W / COLS;

  // Every visible face is an existing ImageGen leaf. Opening the front board reveals
  // the first spread; closing the back board follows the final spread.
  const SPEC = [
    { kind: "board", outside: BOOK.frontCover.file, inside: BOOK.spreads[0].left.file, paper: "ep-front" },
    ...BOOK.spreads.slice(0, -1).map((spread, i) => ({
      kind: "page", front: spread.right.file, back: BOOK.spreads[i + 1].left.file,
      paper: "leaf" + (i % 8 + 1),
    })),
    { kind: "board", inside: BOOK.spreads.at(-1).right.file, outside: BOOK.backCover.file, paper: "ep-back" },
  ];
  const NL = SPEC.length;

  // Paper stocks. Each changes the surface (height map, sheen), how the ink sits (lift, saturation),
  // the sheet's thickness, how stiffly it turns, and how it sounds.
  const STOCKS = [
    { id: "uncoated", name: "Uncoated", spec: "300 gsm · open tooth", map: null, swatch: "leaf1", base: "#e6dbc9",
      bump: 0.0085, amt: 0.06, rough: 0.88, coat: 0, coatRough: 0.3, env: 0, pt: 0.0058,
      curl: 1, dur: 1, lift: 0, desat: 0, tint: "#ffffff", edge: "#ffffff", snd: 1, vol: 1 },
    { id: "matte", name: "Matte coated", spec: "200 gsm · satin smooth", map: "matte", base: "#efe9de",
      bump: 0.0016, amt: 0.012, rough: 0.58, coat: 0.2, coatRough: 0.45, env: 1.0, pt: 0.0042,
      curl: 1.15, dur: 0.95, lift: -0.008, desat: -0.03, tint: "#ffffff", edge: "#fffdf8", snd: 1.15, vol: 0.9 },
    { id: "gloss", name: "Gloss photo", spec: "250 gsm · high gloss", map: "gloss", base: "#f3efe8",
      bump: 0.0011, amt: 0, rough: 0.6, coat: 1, coatRough: 0.06, env: 1.25, pt: 0.0052,
      curl: 0.8, dur: 0.95, lift: -0.03, desat: -0.1, tint: "#ffffff", edge: "#ffffff", snd: 1.35, vol: 0.8 },
    { id: "newsprint", name: "Newsprint", spec: "45 gsm · thin, absorbent", map: "newsprint", base: "#d8d2c4",
      bump: 0.006, amt: 0.11, rough: 0.97, coat: 0, coatRough: 0.3, env: 0, pt: 0.0024,
      curl: 1.7, dur: 1.15, lift: 0.09, desat: 0.22, tint: "#ebe6da", edge: "#dcd5c5", snd: 1.25, vol: 1.15 },
    { id: "coldpress", name: "Cold-press cotton", spec: "300 gsm · watercolour", map: "coldpress", base: "#f1ece1",
      bump: 0.016, amt: 0.07, rough: 0.94, coat: 0, coatRough: 0.3, env: 0, pt: 0.0078,
      curl: 0.65, dur: 1.05, lift: 0.04, desat: 0.08, tint: "#fdfaf3", edge: "#fffcf5", snd: 0.8, vol: 1.1 },
    { id: "laid", name: "Laid", spec: "120 gsm · ribbed", map: "laid", base: "#ebe1cc",
      bump: 0.009, amt: 0.07, rough: 0.9, coat: 0, coatRough: 0.3, env: 0, pt: 0.0034,
      curl: 1.3, dur: 1.05, lift: 0.03, desat: 0.05, tint: "#fbf5e6", edge: "#f8efdc", snd: 1.05, vol: 1 },
  ];
  let STK = STOCKS[0];
  const SPREADS = ["封面", ...BOOK.spreads.map((sp,i) => sp.id?.startsWith("extra") ? `新增回忆 ${String(i+1).padStart(2,"0")}` : `第 ${i+1} 章 · ${sp.left.alt.slice(0,12)}`), "封底"];
  const DESCRIPTIONS = [BOOK.frontCover.alt, ...BOOK.spreads.map(s => s.left.alt + " " + s.right.alt), BOOK.backCover.alt];

  // V12: conservative adaptive rendering, without changing page geometry.
  // V12.1: retain economical shading on phones while allowing readable text.
  // Rendering resolution is distinct from source JPEG export resolution.
  const qualityKey = BOOK.id + '-v1216-quality';
  let qualityMode = 'auto';
  try { qualityMode = localStorage.getItem(qualityKey) || 'auto'; } catch (_) {}
  if (!['auto','smooth','detail'].includes(qualityMode)) qualityMode = 'auto';
  const deviceDpr = Math.max(1, window.devicePixelRatio || 1);
  const idealRenderScale = () => qualityMode === 'smooth'
    ? Math.min(deviceDpr, mobileReader ? 1 : 1.2)
    : qualityMode === 'detail'
      ? Math.min(deviceDpr, mobileReader ? (lowMemory ? 1.35 : 1.7) : 2)
      : Math.min(deviceDpr, mobileReader ? (lowMemory || saveData ? 1.2 : 1.6) : (economyMode ? 1.3 : 1.9));
  let adaptiveDrop = 0;
  let currentRenderScale = idealRenderScale();
  const allowShadows = () => !saveData && qualityMode !== 'smooth';
  // ---------- renderer ----------
  const stage = $("#stage");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    $("#loadtext").textContent = "This book needs WebGL, which is turned off in this browser.";
    return;
  }
  renderer.setPixelRatio(currentRenderScale);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = allowShadows();
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x1b1916, 1);
  stage.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();

  // a dim room with a bright window behind the desk: only glossy stocks pick it up
  const envMap = (() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const x = c.getContext("2d");
    const sky = x.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#1c1916"); sky.addColorStop(0.5, "#0d0c0b"); sky.addColorStop(1, "#060505");
    x.fillStyle = sky; x.fillRect(0, 0, 512, 256);
    // a four-pane window behind the desk, and the lamp's shade up front
    x.fillStyle = "#f2e9da"; x.fillRect(74, 20, 110, 50);
    x.fillStyle = "#1a1714"; x.fillRect(126, 20, 5, 50); x.fillRect(74, 43, 110, 4);
    x.fillStyle = "#8a7f72"; x.fillRect(430, 22, 46, 26);
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = pm.fromEquirectangular(t);
    pm.dispose();
    return rt.texture;
  })();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // warm desk lamp up and to the left, cool window fill from the right
  scene.add(new THREE.HemisphereLight(lin("#f3eee5"), lin("#3a332c"), 0.5));
  const key = new THREE.DirectionalLight(lin("#fff1dc"), 0.78);
  key.position.set(-2.7, 5.4, 2.3);
  key.castShadow = true;
  // Moderate mobile shadow-map size to preserve GPU headroom during turning.
  key.shadow.mapSize.set(economyMode ? 768 : 2048, economyMode ? 768 : 2048);
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 1, far: 14 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(lin("#d4dcf0"), 0.1);
  fill.position.set(3, 3, 1);
  scene.add(fill);

  // ---------- textures ----------
  const manager = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(manager);
  const failed = [];
  const editableTextureMap = new Map();

  // V12.2: the public reading edition streams page art near the current spread.
  // The editor also uses streaming artwork on phones to avoid loading every 1760px page at once.
  const lazyArtwork = mobileReader || !document.getElementById('ppt');
  const artworkCache = new Map();
  // V12.3.1: cover boards wrap the cover image around their coloured edges.
  // Keep tiny accurate previews on the covers when the full-resolution art is evicted.
  // This preserves purple cover edges without keeping two 1760px textures in GPU memory.
  const coverArtworkFiles = new Map([
    [BOOK.frontCover.file, { fallback: '#241929', preview: 'front-cover-preview.jpg' }],
    [BOOK.backCover.file, { fallback: '#332d36', preview: 'back-cover-preview.jpg' }]
  ]);
  const previewSources = new Map();
  const previewPending = new Set();
  const coverFallbackCanvases = new Map();
  function previewFileFor(file) {
    const info = coverArtworkFiles.get(file);
    if (info) return info.preview;
    return typeof file === 'string' && /\.(jpe?g|png|webp)$/i.test(file)
      ? file.replace(/(\.[^.]+)$/, '-preview$1')
      : '';
  }
  function coverFallback(file) {
    if (previewSources.has(file)) return previewSources.get(file);
    const info = coverArtworkFiles.get(file);
    if (!info) return artworkPlaceholder;
    if (!coverFallbackCanvases.has(file)) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 16;
      const ctx = c.getContext('2d'); ctx.fillStyle = info.fallback; ctx.fillRect(0, 0, 16, 16);
      coverFallbackCanvases.set(file, c);
    }
    return coverFallbackCanvases.get(file);
  }
  function loadPagePreview(entry) {
    if (!entry || previewSources.has(entry.file) || previewPending.has(entry.file)) return Promise.resolve();
    const pFile = previewFileFor(entry.file);
    if (!pFile) return Promise.resolve();
    previewPending.add(entry.file);
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      const finish = () => { previewPending.delete(entry.file); resolve(); };
      img.onload = async () => {
        try { if (img.decode) await img.decode(); } catch (_) {}
        previewSources.set(entry.file, img);
        // Never overwrite high-res, currently visible art or editor-modified art.
        if (!entry.pinned && entry.state !== 'loaded') applyArtwork(entry, img);
        finish();
      };
      img.onerror = finish;
      img.src = 'assets/pages/' + pFile;
    });
  }
  const artworkPlaceholder = (() => {
    const c = document.createElement('canvas'); c.width = 8; c.height = 8;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#f6f0e5'; ctx.fillRect(0,0,8,8);
    return c;
  })();
  let initialArtworkReady = !lazyArtwork;
  let initialArtworkFile = BOOK.frontCover.file;
  let booted = false;
  let artworkLoads = 0;
  let artworkEvictions = 0;
  let artworkLoadFailures = 0;
  let artworkTargetSpread = 0;
  let artworkEpoch = 0;
  // Preload generous window around the reader while keeping mobile VRAM bounded.
  const maxConcurrentArtwork = economyMode ? 3 : 6;
  const keepRadiusBack = economyMode ? 2 : 5;
  const keepRadiusAhead = economyMode ? 3 : 7;
  let activeArtworkLoads = 0;
  let previewsWarmed = false;
  const spreadFiles = (k) => k <= 0 ? [BOOK.frontCover.file] :
    k >= NL ? [BOOK.backCover.file] :
    [BOOK.spreads[k - 1].left.file, BOOK.spreads[k - 1].right.file];

  function applyArtwork(entry, source) {
    if (!entry || !source) return;
    entry.texture.image = source;
    entry.texture.needsUpdate = true;
    needsRender = true;
  }
  function prewarmAllPreviews() {
    if (!lazyArtwork || previewsWarmed) return;
    previewsWarmed = true;
    const order = [];
    const seen = new Set();
    const pushSpread = (idx) => {
      if (idx < 0 || idx > NL) return;
      for (const file of spreadFiles(idx)) {
        if (!seen.has(file)) { seen.add(file); order.push(file); }
      }
    };
    pushSpread(artworkTargetSpread);
    for (let step = 1; step <= NL; step++) {
      pushSpread(artworkTargetSpread + step);
      pushSpread(artworkTargetSpread - step);
    }
    for (const file of artworkCache.keys()) {
      if (!seen.has(file)) { seen.add(file); order.push(file); }
    }
    const workers = Math.min(economyMode ? 3 : 6, order.length);
    let cursor = 0;
    const runWorker = async () => {
      while (cursor < order.length) {
        const file = order[cursor++];
        const entry = artworkCache.get(file);
        if (entry && !entry.pinned && !previewSources.has(entry.file)) {
          await loadPagePreview(entry);
        }
      }
    };
    for (let w = 0; w < workers; w++) runWorker();
  }
  function requestArtwork(entry) {
    if (!entry || !entry.wanted || entry.pinned || entry.state === 'loaded' || entry.state === 'loading' || entry.state === 'failed'
      || activeArtworkLoads >= maxConcurrentArtwork) return;
    if (!previewSources.has(entry.file)) loadPagePreview(entry);
    activeArtworkLoads++;
    entry.state = 'loading';
    const token = ++entry.token;
    const img = new Image();
    img.decoding = 'async';
    let finished = false;
    const completed = (ok) => {
      if (finished) return;
      finished = true;
      activeArtworkLoads = Math.max(0, activeArtworkLoads - 1);
      if (entry.file === initialArtworkFile || ok) {
        initialArtworkReady = true;
        if (booted) reveal();
      }
      if (entry.token !== token) { pumpArtworkQueue(); return; }
      entry.pendingImage = null;
      if (ok && entry.wanted && !entry.pinned) {
        applyArtwork(entry, img);
        entry.state = 'loaded'; artworkLoads++;
      } else {
        entry.state = ok ? 'idle' : 'failed';
        if (!ok) { artworkLoadFailures++; failed.push('assets/pages/' + entry.file); }
      }
      if (entry.file === initialArtworkFile || artworkLoads > 0) {
        initialArtworkReady = true;
        if (booted) reveal();
      }
      if (!ok && entry.wanted && booted) {
        console.warn('Cannot load page artwork:', entry.file);
      }
      pumpArtworkQueue();
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {}).then(() => completed(true));
      } else {
        completed(true);
      }
    };
    img.onerror = () => completed(false);
    entry.pendingImage = img;
    img.src = 'assets/pages/' + entry.file;
  }
  function artworkPriority(k) {
    const priority = [...spreadFiles(k)];
    const maxSpan = Math.max(keepRadiusBack, keepRadiusAhead);
    for (let step = 1; step <= maxSpan; step++) {
      if (step <= keepRadiusAhead && k + step <= NL) priority.push(...spreadFiles(k + step));
      if (step <= keepRadiusBack && k - step >= 0) priority.push(...spreadFiles(k - step));
    }
    return [...new Set(priority)];
  }
  function pumpArtworkQueue() {
    if (!lazyArtwork) return;
    for (const file of artworkPriority(artworkTargetSpread)) {
      if (activeArtworkLoads >= maxConcurrentArtwork) break;
      requestArtwork(artworkCache.get(file));
    }
  }
  function maintainArtwork(k) {
    if (!lazyArtwork) return;
    artworkTargetSpread = k;
    const keep = new Set();
    for (let step = -keepRadiusBack; step <= keepRadiusAhead; step++) {
      const near = k + step;
      if (near < 0 || near > NL) continue;
      for (const file of spreadFiles(near)) keep.add(file);
    }
    // Never evict art on a leaf that is mid-turn or currently dragged.
    for (const L of leaves) {
      if (L.anim || L.dragging || (L.te > 0.001 && L.te < 0.999)) {
        for (const file of spreadFiles(L.i)) keep.add(file);
        if (L.i + 1 <= NL) for (const file of spreadFiles(L.i + 1)) keep.add(file);
      }
    }
    for (const entry of artworkCache.values()) {
      entry.wanted = keep.has(entry.file);
      if (!entry.wanted && entry.state === 'loaded' && !entry.pinned) {
        ++entry.token;
        applyArtwork(entry, coverFallback(entry.file));
        entry.state = 'idle';
        artworkEvictions++;
      }
    }
    // Immediately fetch lightweight previews for nearby spreads before full-res decodes.
    for (let step = -2; step <= 2; step++) {
      const near = k + step;
      if (near < 0 || near > NL) continue;
      for (const file of spreadFiles(near)) {
        const entry = artworkCache.get(file);
        if (entry && !entry.pinned && entry.state !== 'loaded' && !previewSources.has(file)) {
          loadPagePreview(entry);
        }
      }
    }
    // Dispatch current spread first. Completion continues the neighbour queue.
    pumpArtworkQueue();
    if (k === 0 && !artworkCache.has(initialArtworkFile)) initialArtworkReady = true;
    if (booted) reveal();
  }
  // Debug information is safe for testing and has no UI cost.
  window.SpecialArtworkStats = () => ({lazy:lazyArtwork,spread:artworkTargetSpread,
    loaded:[...artworkCache.values()].filter(e=>e.state==='loaded').length,
    loading:[...artworkCache.values()].filter(e=>e.state==='loading').length,
    retained:[...artworkCache.values()].filter(e=>e.wanted).length,
    previews:previewSources.size,
    loads:artworkLoads,evictions:artworkEvictions,failures:artworkLoadFailures,
    activeDecodes:activeArtworkLoads,maxConcurrent:maxConcurrentArtwork});

  // Page artwork remains in the original WebGL mesh, hot-swapped by the editor.
  window.setBookPageArtwork = (file, sourceCanvas) => {
    const entry = artworkCache.get(file);
    if (entry && lazyArtwork) {
      ++entry.token; entry.pinned = true; entry.state = 'loaded';
      applyArtwork(entry, sourceCanvas);
      return 1;
    }
    const targets = editableTextureMap.get(file) || [];
    targets.forEach(t => { t.image = sourceCanvas; t.needsUpdate = true; });
    needsRender = true;
    return targets.length;
  };
  manager.onProgress = (url, n, total) => {
    if (!booted) {
      $('#bar').style.width = Math.round((n / total) * 85) + '%';
      $('#loadtext').textContent = `正在准备纸张材质 ${n} / ${total}`;
    }
  };
  manager.onError = (url) => failed.push(url);
  function tex(url, srgb, repeat) {
    let t;
    if (lazyArtwork && url.startsWith('assets/pages/')) {
      const file = url.slice('assets/pages/'.length);
      let entry = artworkCache.get(file);
      if (!entry) {
        t = new THREE.Texture(coverFallback(file));
        t.needsUpdate = true; // covers retain a coloured miniature; inner pages use preview or neutral paper
        entry = { file, texture:t, token:0, state:'idle', wanted:false, pinned:false, pendingImage:null };
        artworkCache.set(file, entry);
        if (coverArtworkFiles.has(file)) loadPagePreview(entry);
      }
      t = entry.texture;
    } else {
      t = texLoader.load(url);
      if (url.startsWith('assets/pages/')) {
        const file = url.slice('assets/pages/'.length);
        if (!editableTextureMap.has(file)) editableTextureMap.set(file, []);
        editableTextureMap.get(file).push(t);
      }
    }
    t.anisotropy = economyMode ? Math.min(2, maxAniso) : maxAniso;
    if (srgb) t.encoding = THREE.sRGBEncoding;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }

  // Paper shader: the fibre height map lights the tooth (bump) and also
  // nudges the albedo, plus an ambient-occlusion falloff into the gutter.
  function paperMaterial(o) {
    const M = o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const params = {
      color: o.color || new THREE.Color(1, 1, 1),
      roughness: o.roughness ?? 0.9, metalness: 0,
      bumpMap: o.bump, bumpScale: o.bumpScale ?? 0.02,
      side: o.side ?? THREE.FrontSide,
    };
    if (o.map) params.map = o.map;
    if (o.physical) Object.assign(params, { clearcoat: o.clearcoat ?? 0.3, clearcoatRoughness: o.clearcoatRoughness ?? 0.3 });
    const m = new M(params);
    const u = { uPaperAmt: { value: o.paperAmt ?? 0 }, uGutter: { value: 0 },
      uGroove: { value: o.groove ?? -1 }, uGrooveDir: { value: o.grooveDir ?? 1 } };
    const g = o.gutter || "";
    const grooved = o.groove != null;
    const wrapBlur = !!o.wrapBlur;
    m.userData.u = u;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uPaperAmt = u.uPaperAmt;
      sh.uniforms.uGutter = u.uGutter;
      sh.uniforms.uGroove = u.uGroove;
      sh.uniforms.uGrooveDir = u.uGrooveDir;
      if (wrapBlur) {
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nattribute float aSide;\nvarying float vSide;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSide = aSide;");
      }
      if (g === "vS") {
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nattribute float aS;\nvarying float vS;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvS = aS;");
      }
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uPaperAmt;\nuniform float uGutter;\nuniform float uGroove;\nuniform float uGrooveDir;\n" + (g === "vS" ? "varying float vS;" : "") + (wrapBlur ? "\nvarying float vSide;" : ""))
        .replace("#include <map_fragment>", `${wrapBlur ? `
          // where the print turns over the board edge it softens instead of streaking
          vec4 texelColor = mapTexelToLinear( texture2D( map, vUv, vSide * 6.0 ) );
          diffuseColor *= texelColor;` : "#include <map_fragment>"}
          float paperH = texture2D( bumpMap, vUv ).r;
          diffuseColor.rgb *= 1.0 + uPaperAmt * ( paperH - 0.5 ) * 2.0;
          ${grooved ? `float gd = ( vUv.x - uGroove ) / 0.0028;
          float gr = ( vUv.x - uGroove - uGrooveDir * 0.0068 ) / 0.0045;
          diffuseColor.rgb *= 1.0 - 0.34 * exp( -gd * gd ) + 0.06 * exp( -gr * gr );` : ""}
          ${g ? `float gq = ${g};
          diffuseColor.rgb *= 1.0 - uGutter * ( 1.0 - smoothstep( 0.0, 0.2, gq ) ) * ( 0.6 + 0.4 * ( 1.0 - smoothstep( 0.0, 0.03, gq ) ) );` : ""}`);
    };
    if (wrapBlur) {
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh) => {
        prev(sh);
        // paper tooth would smear into streaks on the rounded edge, where the projection is stretched
        sh.fragmentShader = sh.fragmentShader.replace("#include <bumpmap_pars_fragment>",
          THREE.ShaderChunk.bumpmap_pars_fragment.replace(/bumpScale \* /g, "bumpScale * ( 1.0 - vSide ) * "));
      };
    }
    m.customProgramCacheKey = () => "paper|" + g + "|" + (o.physical ? 1 : 0) + "|" + (grooved ? 1 : 0) + (wrapBlur ? 1 : 0);
    return m;
  }

  // Printed sheet: the stock's height map lights the tooth and nudges the albedo, the ink is
  // lifted or deepened to suit the stock, and the gutter gets its ambient occlusion.
  const STOCK_U = {
    uPaperAmt: { value: 0.06 }, uRep: { value: new THREE.Vector2(1, 1) },
    uLift: { value: 0 }, uDesat: { value: 0 }, uTint: { value: new THREE.Color(1, 1, 1) },
  };
  function pageMaterial(map, bump, side, lu) {
    const m = new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, bumpScale: 0.0085, roughness: 0.88, metalness: 0, side,
      clearcoat: 0, clearcoatRoughness: 0.3, envMap, envMapIntensity: 0 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, STOCK_U, lu);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aS;\nvarying float vS;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvS = aS;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform float uPaperAmt; uniform float uGutter; uniform float uTurnShade; uniform vec2 uRep; uniform vec2 uOff;
          uniform float uLift; uniform float uDesat; uniform vec3 uTint;
          varying float vS;
          vec2 paperUv( vec2 uv ) { return uv * uRep + uOff; }`)
        .replace("#include <bumpmap_pars_fragment>", THREE.ShaderChunk.bumpmap_pars_fragment
          .replace(/texture2D\( bumpMap, vUv/g, "texture2D( bumpMap, paperUv( vUv )")
          .replace("dFdx( vUv )", "dFdx( paperUv( vUv ) )")
          .replace("dFdy( vUv )", "dFdy( paperUv( vUv ) )"))
        .replace("#include <map_fragment>", `#include <map_fragment>
          // ink sinks into absorbent stock and sits up on coated stock
          float lum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
          diffuseColor.rgb = max( mix( diffuseColor.rgb, vec3( lum ), uDesat ), 0.0 );
          diffuseColor.rgb = max( diffuseColor.rgb * ( 1.0 - uLift ) + uLift * uTint, 0.0 ) * uTint;
          float paperH = texture2D( bumpMap, paperUv( vUv ) ).r;
          diffuseColor.rgb *= 1.0 + uPaperAmt * ( paperH - 0.5 ) * 2.0;
          diffuseColor.rgb *= 1.0 - uGutter * ( 1.0 - smoothstep( 0.0, 0.2, vS ) ) * ( 0.6 + 0.4 * ( 1.0 - smoothstep( 0.0, 0.03, vS ) ) );
          // Soft crease darkening as a physical page lifts; no rasterised overlay.
          float foldShade = exp( -pow( (vS - 0.14) / 0.14, 2.0 ) );
          diffuseColor.rgb *= 1.0 - uTurnShade * (0.09 * foldShade);`)
        // the room only shows up as reflections; the lamp and sky light do the lighting
        .replace("#include <lights_fragment_maps>", "#include <lights_fragment_maps>\n\tiblIrradiance = vec3( 0.0 );");
    };
    m.customProgramCacheKey = () => "page";
    return m;
  }

  // ---------- scene graph ----------
  const bookRoot = new THREE.Group();       // sits on the desk, slides to keep the book centred
  // V12.19.5: user-adjustable tabletop arrangement, separate from page geometry.
  // These values are visual only; they never change original editable page layers.
  const sceneBookLayout = { x: 0, z: 0, scale: 1 };
  bookRoot.rotation.y = -0.018;
  const book = new THREE.Group();           // local frame: x across, y up the page, z out of the paper
  book.rotation.x = -PI / 2;
  bookRoot.add(book);
  scene.add(bookRoot);

  // desk: dark wool felt
  const feltTex = tex("assets/paper/felt.webp", false, [16, 16]);
  const desk = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    paperMaterial({ color: lin("#2c2824"), bump: feltTex, bumpScale: 0.03, paperAmt: 0.22, roughness: 1 })
  );
  desk.rotation.x = -PI / 2;
  desk.receiveShadow = true;
  scene.add(desk);

  // soft contact shadow right under the book
  const contact = (() => {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    const x = c.getContext("2d");
    x.shadowColor = "rgba(0,0,0,1)";
    x.shadowBlur = 22;
    x.shadowOffsetX = 1000;
    x.fillRect(28 - 1000, 28, 200, 200);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: t, color: 0x000000, transparent: true, opacity: 0.72, depthWrite: false }));
    m.position.z = 0.0008;
    book.add(m);
    return m;
  })();

  const EDGE_TINTS = ["#f6efe2", "#ece3d3", "#f9f2e6", "#e8dfcf", "#f3ebdd", "#e6dccb", "#f7f0e3", "#ebe2d2"];

  // a small seeded random, so every sheet keeps its own quirks between visits
  function rng(seed) {
    return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // the cut edge of a sheet: paper colour, a trace of the printed ink at the top,
  // and a shadow where it meets the sheet below
  function edgeMaterial(tint, map) {
    const m = new THREE.MeshStandardMaterial({ map, color: lin(tint), roughness: 0.96, side: THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aT;\nvarying float vT;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = aT;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vT;")
        .replace("#include <map_fragment>", `
          vec4 inkC = mapTexelToLinear( texture2D( map, vUv ) );
          float inkAmt = 0.34 * ( 1.0 - smoothstep( 0.05, 0.6, vT ) );
          diffuseColor.rgb *= mix( vec3( 1.0 ), inkC.rgb, inkAmt );
          diffuseColor.rgb *= mix( 1.04, 0.42, smoothstep( 0.45, 1.0, vT ) );`);
    };
    m.customProgramCacheKey = () => "edge";
    return m;
  }

  // ---------- boards ----------
  // merge the extrusion's duplicate vertices so the rounded edge shades smoothly; the flat
  // faces stay separate so they keep a clean normal and a crisp print
  function smoothMerge(g) {
    const pos = g.attributes.position, seen = new Map(), verts = [], flat = [], index = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let f = 0; f < pos.count; f += 3) {
      a.fromBufferAttribute(pos, f); b.fromBufferAttribute(pos, f + 1); c.fromBufferAttribute(pos, f + 2);
      const nz = Math.abs(b.clone().sub(a).cross(c.clone().sub(a)).normalize().z);
      const cap = nz > 0.9999 && (Math.abs(a.z) < 1e-5 || Math.abs(a.z - BT) < 1e-5) ? 1 : 0;
      for (let i = f; i < f + 3; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const key = cap + ":" + Math.round(x * 1e5) + "," + Math.round(y * 1e5) + "," + Math.round(z * 1e5);
        let id = seen.get(key);
        if (id === undefined) { id = verts.length / 3; seen.set(key, id); verts.push(x, y, z); flat.push(cap); }
        index.push(id);
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    out.setAttribute("aSide", new THREE.Float32BufferAttribute(flat.map((f) => 1 - f), 1));
    out.setIndex(index);
    return out;
  }
  function boardGeometry(outsideUp) {
    const x0 = BEV, x1 = BBW - BEV, y0 = -BH / 2 + BEV, y1 = BH / 2 - BEV, r = 0.006;
    const sh = new THREE.Shape();
    sh.moveTo(x0 + r, y0); sh.lineTo(x1 - r, y0); sh.quadraticCurveTo(x1, y0, x1, y0 + r);
    sh.lineTo(x1, y1 - r); sh.quadraticCurveTo(x1, y1, x1 - r, y1);
    sh.lineTo(x0 + r, y1); sh.quadraticCurveTo(x0, y1, x0, y1 - r);
    sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
    let g = new THREE.ExtrudeGeometry(sh, { depth: BT - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 5, curveSegments: 4 });
    g.translate(0, 0, BEV);
    g = smoothMerge(g);
    // the print is wrapped round the board, so project it straight down: edges carry the image's border
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const u = clamp(p.getX(i) / BBW, 0, 1);
      uv[i * 2] = outsideUp ? u : 1 - u;
      uv[i * 2 + 1] = clamp((p.getY(i) + BH / 2) / BH, 0, 1);
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  // endpaper pasted inside the board, leaving the wrap's turn-in showing round three sides
  function pastedownGeometry(onBottom) {
    const pw = W, ph = H; // preserve the artwork’s exact 3:4 aspect ratio
    const g = new THREE.PlaneGeometry(pw, ph, 12, 1);
    if (onBottom) g.rotateY(PI);
    g.translate(0.004 + pw / 2, 0, onBottom ? -0.00035 : BT + 0.00035);
    const p = g.attributes.position, aS = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) aS[i] = p.getX(i) / BBW;
    g.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    return g;
  }

  const clothTex = tex("assets/paper/cloth.webp", false, [3, 46]);
  const clothMat = new THREE.MeshStandardMaterial({ color: lin("#161514"), roughness: 0.82, bumpMap: clothTex, bumpScale: 0.012, side: THREE.DoubleSide });

  function leafGeometry() {
    const front = new THREE.PlaneGeometry(W, H, COLS, ROWS);
    const n = (COLS + 1) * (ROWS + 1);
    const aS = new Float32Array(n);
    for (let iy = 0; iy <= ROWS; iy++) for (let ix = 0; ix <= COLS; ix++) aS[iy * (COLS + 1) + ix] = ix / COLS;
    front.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    front.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const back = new THREE.BufferGeometry();
    back.setIndex(front.index);
    back.setAttribute("position", front.attributes.position);
    back.setAttribute("normal", front.attributes.normal);
    back.setAttribute("aS", front.attributes.aS);
    const uv = front.attributes.uv.array.slice();
    for (let k = 0; k < uv.length; k += 2) uv[k] = 1 - uv[k];   // the back of a sheet is its mirror
    back.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return { front, back };
  }

  // the cut edge of a sheet: head, tail and fore-edge strips, one paper thick
  const RIB_N = 2 * (COLS + 1) + (ROWS + 1);
  function ribbonGeometry() {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(RIB_N * 2 * 3), uv = new Float32Array(RIB_N * 2 * 2), idx = [];
    const strip = (start, n) => { for (let a = 0; a < n - 1; a++) { const p = (start + a) * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2); } };
    strip(0, COLS + 1); strip(COLS + 1, COLS + 1); strip(2 * (COLS + 1), ROWS + 1);
    for (let v = 0; v < RIB_N; v++) { uv[v * 4] = 0; uv[v * 4 + 1] = 1; uv[v * 4 + 2] = 0; uv[v * 4 + 3] = 0; }
    const aT = new Float32Array(RIB_N * 2);
    for (let v = 0; v < RIB_N; v++) aT[v * 2 + 1] = 1;
    g.setIndex(idx);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aT", new THREE.BufferAttribute(aT, 1));
    return g;
  }

  function faceMap(face) {
    return tex("assets/pages/" + face, true);
  }

  const leaves = SPEC.map((sp, i) => {
    const L = { i, kind: sp.kind, t: 0, te: 0, target: 0, anim: null, dir: 1, dragging: false,
      peek: 0, peekTarget: 0, curl: 0, curlTarget: 0, grabY: -0.55, sig: "" };
    const paper = tex("assets/paper/" + sp.paper + ".webp");
    if (sp.kind === "page") {
      const geo = leafGeometry();
      L.geo = geo.front;
      L.maps = [faceMap(sp.front), faceMap(sp.back)];
      L.sheet = paper;                     // this sheet's own uncoated fibre map
      const ro = rng(77 + i * 53);
      L.tileOff = new THREE.Vector2(ro(), ro()); // where this sheet sits in a tiled stock
      L.lu = { uOff: { value: new THREE.Vector2(0, 0) }, uGutter: { value: 0 }, uTurnShade: { value: 0 } };
      L.mats = [pageMaterial(L.maps[0], paper, THREE.FrontSide, L.lu), pageMaterial(L.maps[1], paper, THREE.BackSide, L.lu)];
      // no two sheets are trimmed or lie exactly alike
      const rnd = rng(9001 + i * 131);
      L.ds = DS * (1 + (rnd() - 0.5) * 0.0032);
      L.dy = (rnd() - 0.5) * 0.0034;
      const amp = 0.004 + 0.017 * rnd(), k1 = 1.5 + 3 * rnd(), k2 = 5 + 6 * rnd(), ph1 = rnd() * 6.28, ph2 = rnd() * 6.28;
      L.wave = new Float32Array(ROWS + 1);
      for (let iy = 0; iy <= ROWS; iy++) {
        const yy = iy / ROWS;
        L.wave[iy] = amp * clamp(0.55 + 0.35 * Math.sin(yy * k1 * 6.28 + ph1) + 0.15 * Math.sin(yy * k2 * 6.28 + ph2), 0.1, 1);
      }
      L.meshes = [new THREE.Mesh(geo.front, L.mats[0]), new THREE.Mesh(geo.back, L.mats[1])];
      for (const m of L.meshes) { m.frustumCulled = false; m.receiveShadow = true; book.add(m); }
      const em = edgeMaterial(EDGE_TINTS[i % EDGE_TINTS.length], L.maps[0]);
      L.edgeBase = em.color.clone();
      L.rib = ribbonGeometry();
      L.edge = new THREE.Mesh(L.rib, em);
      L.edge.frustumCulled = false;
      L.edge.castShadow = L.edge.receiveShadow = true;
      book.add(L.edge);
    } else {
      const front = i === 0;
      const cover = paperMaterial({ map: tex("assets/pages/" + sp.outside, true), bump: paper, bumpScale: 0.003, paperAmt: 0.0,
        roughness: 0.46, physical: true, clearcoat: 0.38, clearcoatRoughness: 0.3,
        groove: front ? GROOVE / BBW : 1 - GROOVE / BBW, grooveDir: front ? 1 : -1, wrapBlur: true });
      const mesh = new THREE.Mesh(boardGeometry(front), cover);
      mesh.castShadow = mesh.receiveShadow = true;
      const ep = paperMaterial({ map: faceMap(sp.inside), bump: paper, bumpScale: 0.0085, paperAmt: 0.06, roughness: 0.88, gutter: "vS" });
      const paste = new THREE.Mesh(pastedownGeometry(front), ep);
      paste.receiveShadow = true;
      L.group = new THREE.Group();
      L.group.add(mesh, paste);
      L.ep = ep;
      book.add(L.group);
    }
    return L;
  });

  // spine: black book cloth bridging the two boards, re-shaped every frame
  const SPS = 14;
  const spineGeo = new THREE.PlaneGeometry(1, BH, SPS, 1);
  spineGeo.attributes.position.setUsage(THREE.DynamicDrawUsage);
  const spine = new THREE.Mesh(spineGeo, clothMat);
  spine.frustumCulled = false;
  spine.castShadow = spine.receiveShadow = true;
  book.add(spine);

  // ---------- page physics (well, kinematics) ----------
  const phiR = new Float32Array(COLS), phiL = new Float32Array(COLS), gS = new Float32Array(COLS),
    prof = new Float32Array(COLS), humpD = new Float32Array(COLS), eShape = new Float32Array(COLS);
  const PEXP = 2.2;
  for (let ix = 0; ix < COLS; ix++) {
    const s = (ix + 0.5) * DS, u = s / RUN, q = s / HUMP_S;
    prof[ix] = u < 1 ? (PEXP * Math.pow(1 - u, PEXP - 1)) / RUN : 0;   // slope of 1-(1-u)^p
    humpD[ix] = ((1 - q) * Math.exp(1 - q)) / HUMP_S;                   // slope of q*e^(1-q)
    eShape[ix] = smooth((s - 0.8 * W) / (0.2 * W));
    gS[ix] = (s / W) * (s / W) - 0.33;
  }
  const riseF = (x) => { const u = clamp(Math.abs(x) / RUN, 0, 1); return 1 - Math.pow(1 - u, PEXP); };
  const humpF = (x) => { const q = Math.abs(x) / HUMP_S; return q * Math.exp(1 - q); };

  function deformPage(L, hR, hL, BR, BL) {
    const t = L.te, sinT = Math.sin(PI * t);
    const AR = 0.88 * hR, AL = 0.88 * hL;
    const sig = [t, L.curl, L.grabY, AR, AL, BR, BL].map((v) => v.toFixed(5)).join();
    if (sig === L.sig) return;
    L.sig = sig;
    const h = hR + (hL - hR) * t;
    const z0 = BT + 0.12 * h;
    const moving = t > 1e-4 && t < 1 - 1e-4;
    for (let ix = 0; ix < COLS; ix++) {
      phiR[ix] = AR * prof[ix] + BR * humpD[ix];
      phiL[ix] = PI - (AL * prof[ix] + BL * humpD[ix]);
    }
    const pos = L.geo.attributes.position.array;
    // the surface of the stack this sheet would land on, so a moving sheet never dips into it
    const floorAt = (x) => x > 0 ? BT + 0.12 * hR + AR * riseF(x) + BR * humpF(x) - PT
                                 : BT + 0.12 * hL + AL * riseF(x) + BL * humpF(x) - PT;
    for (let iy = 0; iy <= ROWS; iy++) {
      const y = H / 2 - (iy * H) / ROWS + L.dy;
      const prox = 1 - Math.abs(y - L.grabY) / H;
      const cr = L.curl * (0.5 + prox * prox) * sinT;   // the grabbed corner leads
      const wv = L.wave[iy];                             // this sheet's own slight cockle at the fore-edge
      let x = 0, z = z0;
      let k = iy * (COLS + 1) * 3;
      for (let ix = 0; ix <= COLS; ix++, k += 3) {
        let zz = z;
        if (moving) zz = Math.max(zz, floorAt(x));
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = zz;
        if (ix === COLS) break;
        const e = wv * eShape[ix];
        const phi = (1 - t) * (phiR[ix] + e) + t * (phiL[ix] - e) + cr * gS[ix];
        x += L.ds * Math.cos(phi);
        z += L.ds * Math.sin(phi);
      }
    }
    L.geo.attributes.position.needsUpdate = true;
    L.geo.computeVertexNormals();
    L.geo.boundingBox = null;
    L.geo.computeBoundingSphere();
    const backGeo = L.meshes[1].geometry;
    backGeo.boundingBox = null;
    backGeo.boundingSphere = L.geo.boundingSphere ? L.geo.boundingSphere.clone() : null;

    const nrm = L.geo.attributes.normal.array;
    const rp = L.rib.attributes.position.array, ru = L.rib.attributes.uv.array;
    const up = t < 0.5;
    const sg = up ? -1 : 1;                // thickness hangs below whichever face is up
    L.edge.material.map = L.maps[up ? 0 : 1];
    let w = 0, wu = 0;
    const put = (k) => {
      const k3 = k * 3, px = pos[k3], py = pos[k3 + 1], pz = pos[k3 + 2];
      rp[w++] = px; rp[w++] = py; rp[w++] = pz;
      rp[w++] = px + sg * nrm[k3] * PT; rp[w++] = py + sg * nrm[k3 + 1] * PT; rp[w++] = pz + sg * nrm[k3 + 2] * PT;
      // sample the print right at the sheet's border, so the cut edge carries a trace of the ink
      const ix = k % (COLS + 1), iy = (k - ix) / (COLS + 1);
      let u = clamp(ix / COLS, 0.004, 0.996);
      if (!up) u = 1 - u;
      const v = clamp(1 - iy / ROWS, 0.004, 0.996);
      ru[wu] = u; ru[wu + 1] = v; ru[wu + 2] = u; ru[wu + 3] = v;
      wu += 4;
    };
    for (let ix = 0; ix <= COLS; ix++) put(ix);
    for (let ix = 0; ix <= COLS; ix++) put(ROWS * (COLS + 1) + ix);
    for (let iy = 0; iy <= ROWS; iy++) put(iy * (COLS + 1) + COLS);
    L.rib.attributes.position.needsUpdate = true;
    L.rib.attributes.uv.needsUpdate = true;
    L.rib.computeVertexNormals();
  }

  // ---------- state ----------
  const easeInOutSine = (p) => -(Math.cos(PI * p) - 1) / 2;
  const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
  const spreadIndex = () => leaves.reduce((n, L) => n + (L.target === 1 ? 1 : 0), 0);
  // V12.1: a logical page is a camera focus on an existing, physically modelled leaf.
  // Cover=0, inner faces=1..2N, back cover=2N+1. We never create a 2D substitute.
  const innerCount = BOOK.spreads.length * 2;
  const lastLogicalPage = innerCount + 1;
  const spreadForPage = (page) => page <= 0 ? 0 : page >= lastLogicalPage ? NL : Math.ceil(page / 2);
  const firstPageForSpread = (k) => k <= 0 ? 0 : k >= NL ? lastLogicalPage : k * 2 - 1;
  let rememberedMode = 'single';
  if (mobileReader) {
    try { rememberedMode = localStorage.getItem(BOOK.id + '-v121-view') === 'spread' ? 'spread' : 'single'; } catch (_) {}
  }
  const readerView = { mode: mobileReader ? rememberedMode : 'spread', page: 0 };
  let lastViewSignature = '';
  let pendingLogicalPage = null;
  let needsRender = true;
  let interacted = false;

  function turn(L, to, o = {}) {
    if (L.target === to && !L.anim && L.t === to) return;
    L.t = L.te; L.peek = 0; L.peekTarget = 0;
    const dist = Math.abs(to - L.t);
    if (dist < 1e-4) { L.t = to; L.target = to; L.anim = null; return; }
    L.dir = to > L.t ? 1 : -1;
    L.target = to;
    if (o.grabY != null) L.grabY = o.grabY;
    const board = L.kind === "board";
    let dur = o.dur ?? (board ? 1.25 : 1.05 * STK.dur) * (0.25 + 0.75 * dist);
    if (reduceMotion) dur = Math.min(dur, 0.35);
    L.anim = { from: L.t, to, start: performance.now(), delay: o.delay || 0, dur,
      ease: o.ease || (board ? easeInOutCubic : easeInOutSine), sounded: !!o.silent };
    updateUI();
  }
  function topRight() {
    const L = leaves.find((l) => l.target === 0);
    return L && !L.anim && !L.dragging ? L : null;
  }
  function topLeft() {
    let L = null;
    for (const l of leaves) if (l.target === 1) L = l;
    return L && !L.anim && !L.dragging ? L : null;
  }
  const busyTurning = () => leaves.some((l) => l.anim || l.dragging);
  function goLogical(page) {
    if (busyTurning()) return false;
    const target = clamp(Math.round(page), 0, lastLogicalPage);
    if (readerView.page === target) return;
    readerView.page = target;
    goTo(spreadForPage(target), true);
    updateUI(); // Same physical spread may mean a different logical page.
    needsRender = true;
  }
  function next(grabY) {
    if (readerView.mode === 'single') { goLogical(readerView.page + 1); return; }
    const L = leaves.find((l) => l.target === 0);
    if (L && !L.dragging) { turn(L, 1, { grabY: grabY ?? -0.6 }); noteInteraction(); }
  }
  function prev(grabY) {
    if (readerView.mode === 'single') { goLogical(readerView.page - 1); return; }
    let L = null; for (const l of leaves) if (l.target === 1) L = l;
    if (L && !L.dragging) { turn(L, 0, { grabY: grabY ?? -0.6 }); noteInteraction(); }
  }
  function goTo(k, preserveLogical = false) {
    k = clamp(Math.round(k), 0, NL);
    if (!preserveLogical) { pendingLogicalPage = null; readerView.page = firstPageForSpread(k); }
    const cur = spreadIndex();
    const stag = reduceMotion ? 0 : 0.11;
    if (k > cur) for (let j = cur; j < k; j++) turn(leaves[j], 1, { delay: (j - cur) * stag, dur: leaves[j].kind === "board" ? 1.0 : 0.8, grabY: -0.5 });
    if (k < cur) for (let j = cur - 1; j >= k; j--) turn(leaves[j], 0, { delay: (cur - 1 - j) * stag, dur: leaves[j].kind === "board" ? 1.0 : 0.8, grabY: -0.5 });
    noteInteraction();
    updateUI();
    needsRender = true;
  }

  function setReaderMode(mode) {
    if (mode !== 'single' && mode !== 'spread') return;
    if (readerView.mode === mode) return;
    if (busyTurning()) return;
    readerView.mode = mode;
    if (mobileReader) {
      try { localStorage.setItem(BOOK.id + '-v121-view', mode); } catch (_) {}
    }
    updateUI();
    needsRender = true;
  }
  function emitReaderState() {
    const k = spreadIndex();
    if (pendingLogicalPage !== null && spreadForPage(pendingLogicalPage) === k) {
      readerView.page = pendingLogicalPage; pendingLogicalPage = null;
    } else if (pendingLogicalPage === null && spreadForPage(readerView.page) !== k) {
      readerView.page = firstPageForSpread(k);
    }
    const page = readerView.page;
    const signature = readerView.mode + ':' + page + ':' + k;
    const label = page === 0 ? '封面' : page === lastLogicalPage ? '封底' : `第 ${page} 页`;
    if (readerView.mode === 'single') {
      $('#label').textContent = label;
      $('#prev').disabled = page <= 0;
      $('#next').disabled = page >= lastLogicalPage;
    } else {
      $('#label').textContent = SPREADS[k];
      $('#prev').disabled = k <= 0;
      $('#next').disabled = k >= NL;
    }
    stage.dataset.logicalPage = String(page);
    stage.dataset.viewMode = readerView.mode;
    if (lastViewSignature !== signature) {
      lastViewSignature = signature;
      window.dispatchEvent(new CustomEvent('special:readerviewchange', {
        detail: { mode: readerView.mode, page, spread: k, label, lastPage: lastLogicalPage }
      }));
      needsRender = true;
    }
  }
  window.SpecialBookReader = Object.freeze({
    getState: () => ({ mode: readerView.mode, page: readerView.page,
      spread: spreadIndex(), lastPage: lastLogicalPage, mobile: mobileReader }),
    setMode: setReaderMode,
    goPage: goLogical,
    isBusy: busyTurning,
    next: () => next(),
    prev: () => prev()
  });
  window.goToBookSpread = goTo;
  // V12.19: a narrow, read-only scene bridge for optional physical reading props.
  // The editor project and page geometry are deliberately untouched.
  window.SpecialBookScene = Object.freeze({ THREE, scene, camera, renderer, canvas, stage, book, bookRoot,
    bookWidth: W, bookHeight: H, isMobile: mobileReader, invalidate: () => { needsRender = true; },
    setArrangement: ({x=0,z=0,scale=1}={}) => {
      const bounded = (v,a,b) => Number.isFinite(+v)?Math.max(a,Math.min(b,+v)):a;
      sceneBookLayout.x=bounded(x,-4,4);sceneBookLayout.z=bounded(z,-3,3);
      sceneBookLayout.scale=bounded(scale,.55,1.45);
      bookRoot.position.x=cam.off+sceneBookLayout.x;
      bookRoot.position.z=sceneBookLayout.z;
      bookRoot.scale.setScalar(sceneBookLayout.scale);
      needsRender=true;
    },
    getArrangement: () => ({...sceneBookLayout}),
    isReading: () => !document.getElementById('ppt') || document.getElementById('ppt').hidden
  });

  // ---------- sound: synthesised paper, no files ----------
  let soundOn = true;
  try { soundOn = localStorage.getItem(BOOK.id + "-sound") !== "off"; } catch (e) {}
  let actx = null;
  function audio() {
    if (!soundOn) return null;
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  function noiseBuffer(ctx, dur, brown) {
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b = 0.97 * b + 0.03 * w;
      d[i] = brown ? b * 3 : w * 0.45 + b * 2 + (Math.random() < 0.003 ? (Math.random() * 2 - 1) * 2.5 : 0);
    }
    return buf;
  }
  function rustle(vol, dur, plain) {
    const ctx = audio(); if (!ctx) return;
    const f = plain ? 1 : STK.snd;         // thin, hard stocks crackle higher; heavy cotton sounds softer
    vol *= plain ? 1 : STK.vol;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, dur, false);
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 380;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1000 * f, t0);
    bp.frequency.exponentialRampToValueAtTime(3400 * f, t0 + dur * 0.4);
    bp.frequency.exponentialRampToValueAtTime(1500 * f, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.16 * vol, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.05 * vol, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(hp).connect(bp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
  function thump(vol) {
    const ctx = audio(); if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, 0.2, true);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    src.connect(lp).connect(g).connect(ctx.destination);
    src.start(t0);
  }
  const soundBtn = $("#sound");
  soundBtn.setAttribute("aria-pressed", String(soundOn));
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    try { localStorage.setItem(BOOK.id + "-sound", soundOn ? "on" : "off"); } catch (e) {}
    if (soundOn) rustle(0.4, 0.3);
  });

  // ---------- V12.16 reading quality ----------
  const qualitySelect = document.getElementById('readerQuality');
  let adaptiveSlowFrames = 0, adaptiveFastFrames = 0;
  function applyReaderQuality(remember = false) {
    adaptiveDrop = 0;
    const scale = idealRenderScale();
    currentRenderScale = scale;
    renderer.setPixelRatio(scale);
    const useShadows = allowShadows();
    if (renderer.shadowMap.enabled !== useShadows) {
      renderer.shadowMap.enabled = useShadows;
      scene.traverse((obj) => {
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        mats.forEach((mat) => { mat.needsUpdate = true; });
      });
    }
    resize();
    needsRender = true;
    if (qualitySelect) qualitySelect.value = qualityMode;
    if (remember) try { localStorage.setItem(qualityKey, qualityMode); } catch (_) {}
  }
  if (qualitySelect) {
    qualitySelect.value = qualityMode;
    qualitySelect.addEventListener('change', () => {
      if (!['auto','smooth','detail'].includes(qualitySelect.value)) return;
      qualityMode = qualitySelect.value;
      adaptiveSlowFrames = adaptiveFastFrames = 0;
      applyReaderQuality(true);
    });
  }
  // Small read-only telemetry for performance debugging; no private project data.
  window.SpecialReaderPerformance = () => ({mode:qualityMode, pixelRatio:currentRenderScale,
    geometry:{cols:COLS,rows:ROWS},shadows:renderer.shadowMap.enabled,
    mobile:mobileReader, saveData, adaptiveDrop});

  // ---------- per-frame update ----------
  const cam = { dist: 0, el: 1, az: 0, azT: 0, elJ: 0, elJT: 0, off: 0, focusX: 0 };
  let fitW = 0;
  const rightHeights = new Float32Array(NL), leftHeights = new Float32Array(NL);

  function update(dt, now) {
    let busy = false;
    for (const L of leaves) {
      if (L.anim) {
        busy = true;
        const a = L.anim, e = (now - a.start) / 1000 - a.delay;
        if (e >= 0) {
          if (!a.sounded) { a.sounded = true; L.kind === "board" ? rustle(0.35, 0.45, true) : rustle(0.7, 0.55); }
          const p = Math.min(1, e / a.dur);
          L.t = a.from + (a.to - a.from) * a.ease(p);
          if (L.kind === "page") {
            const pp = L.dir > 0 ? L.t : 1 - L.t;
            L.curlTarget = L.dir * 2.3 * STK.curl * (0.55 - pp);   // edge leads as it lifts, trails as it falls
          }
          if (p >= 1) {
            L.t = a.to; L.anim = null; L.curlTarget = 0;
            L.kind === "board" ? thump(0.8) : rustle(0.25, 0.14);
          }
        }
      }
      const pk = L.peek + (L.peekTarget - L.peek) * Math.min(1, dt * 9);
      if (Math.abs(pk - L.peek) > 1e-5) busy = true;
      L.peek = pk;
      const c = L.curl + (L.curlTarget - L.curl) * Math.min(1, dt * 8);
      if (Math.abs(c - L.curl) > 1e-5) busy = true;
      L.curl = c;
      const atRest = !L.anim && !L.dragging;
      const side = L.t < 0.5 ? 1 : -1;
      L.te = clamp(L.t + (atRest ? side * L.peek : 0), 0, 1);
    }

    // stack heights
    const te = leaves.map((L) => L.te);
    const BR = HUMP * te[0], BL = HUMP * (1 - te[NL - 1]);
    const jOpen = JNT * te[0] * (1 - te[NL - 1]);
    let pagesR = 0, pagesL = 0;
    for (let i = 1; i < NL - 1; i++) { pagesR += PT * (1 - te[i]); pagesL += PT * te[i]; }
    // O(N) precomputed sheet heights, not nested O(N²) sums every frame.
    let accumulated = PT / 2;
    for (let i = NL - 2; i >= 1; i--) {
      rightHeights[i] = accumulated;
      accumulated += PT * (1 - te[i]);
    }
    accumulated = PT / 2;
    for (let i = 1; i < NL - 1; i++) {
      leftHeights[i] = accumulated;
      accumulated += PT * te[i];
    }
    for (const L of leaves) {
      const i = L.i;
      if (L.kind === "page") {
        deformPage(L, rightHeights[i], leftHeights[i], BR, BL);
        const s = Math.sin(PI * L.te);
        const g = 0.36 * Math.pow(1 - s, 3);
        L.lu.uGutter.value = g;
        L.lu.uTurnShade.value = Math.sin(PI * L.te);
        const moving = L.te > 1e-4 && L.te < 1 - 1e-4;
        L.meshes[0].castShadow = L.meshes[1].castShadow = moving;
      } else {
        let zR, zL;
        if (i === 0) { zR = BT * (1 - te[NL - 1]) + pagesR + 0.0006; zL = 0; }
        else { zR = 0; zL = BT * te[0] + pagesL + 0.0006; }
        const zh = zR + (zL + BT - zR) * L.te;
        L.hx = i === 0 ? -jOpen : jOpen;
        L.group.position.set(L.hx, 0, zh);
        L.group.rotation.y = -PI * L.te;
        L.ep.userData.u.uGutter.value = 0.3 * Math.pow(1 - Math.sin(PI * L.te), 3);
        L.hinge = zh;
      }
    }

    // spine follows both boards
    {
      const f = leaves[0], b = leaves[NL - 1];
      // where each board's outer face begins at the hinge
      const a0 = PI * f.te, a9 = PI * b.te;
      const F = [f.hx + BEV * Math.cos(a0) - BT * Math.sin(a0), f.hinge + BEV * Math.sin(a0) + BT * Math.cos(a0)];
      const B = [b.hx + BEV * Math.cos(a9), b.hinge + BEV * Math.sin(a9)];
      const dx = B[0] - F[0], dz = B[1] - F[1], len = Math.hypot(dx, dz);
      const nx = len > 1e-6 ? dz / len : -1, nz = len > 1e-6 ? -dx / len : 0;
      const bulge = 0.34 * len;
      const C = [(F[0] + B[0]) / 2 + nx * bulge, Math.max(0.0006, (F[1] + B[1]) / 2 + nz * bulge)];
      F[1] = Math.max(0.0006, F[1]); B[1] = Math.max(0.0006, B[1]);
      const p = spineGeo.attributes.position.array;
      for (let row = 0; row <= 1; row++) {
        const y = row === 0 ? BH / 2 : -BH / 2;
        for (let s = 0; s <= SPS; s++) {
          const u = s / SPS, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u;
          const k = (row * (SPS + 1) + s) * 3;
          p[k] = w0 * F[0] + w1 * C[0] + w2 * B[0];
          p[k + 1] = y;
          p[k + 2] = w0 * F[1] + w1 * C[1] + w2 * B[1];
        }
      }
      spineGeo.attributes.position.needsUpdate = true;
      spineGeo.computeVertexNormals();
      spine.visible = len > 0.001;
    }

    // contact shadow footprint
    const xmin = -BW * te[0], xmax = BW * (1 - te[NL - 1]);
    contact.position.x = (xmin + xmax) / 2;
    contact.scale.set(xmax - xmin + 0.34, BH + 0.34, 1);

    // camera + centring follow the settled state, so dragging never moves the book under the hand
    // while a hand holds a page, frame the settled state so the book never moves under the pointer;
    // otherwise frame what is actually on the desk, so a riffle stays in view
    const k = spreadIndex();
    const held = leaves.some((L) => L.dragging);
    const offT = held ? (k === 0 ? -BW / 2 : k === NL ? BW / 2 : 0) : -(xmin + xmax) / 2;
    const isSingle = readerView.mode === 'single';
    // Left/right page centres are in the original 3D book coordinate system.
    // For covers the existing automatic board centring remains unchanged.
    const wantedFocus = isSingle && k > 0 && k < NL
      ? ((readerView.page % 2 === 1 ? -1 : 1) * W / 2) : 0;
    const wT = isSingle ? BW : (held ? (k === 0 || k === NL ? BW : 2 * BW) : xmax - xmin);
    const r = Math.min(1, dt * (reduceMotion ? 14 : 3.2));
    const prevOff = cam.off, prevW = fitW, prevFocus = cam.focusX;
    cam.off += (offT - cam.off) * r;
    cam.focusX += (wantedFocus - cam.focusX) * r;
    fitW += (wT - fitW) * r;
    cam.az += (cam.azT - cam.az) * Math.min(1, dt * 3);
    cam.elJ += (cam.elJT - cam.elJ) * Math.min(1, dt * 3);
    if (Math.abs(cam.off - prevOff) > 1e-5 || Math.abs(fitW - prevW) > 1e-5 || Math.abs(cam.focusX - prevFocus) > 1e-5 || Math.abs(cam.azT - cam.az) > 1e-5 || Math.abs(cam.elJT - cam.elJ) > 1e-5) busy = true;
    bookRoot.position.x = cam.off + sceneBookLayout.x;
    bookRoot.position.z = sceneBookLayout.z;
    bookRoot.scale.setScalar(sceneBookLayout.scale);
    placeCamera();
    return busy;
  }

  let vw = 1, vh = 1;
  function placeCamera() {
    const aspect = vw / vh;
    const el = (aspect < 0.85 ? 1.2 : 1.0) + cam.elJ;
    const vt = Math.tan((camera.fov * PI) / 360);
    // Mobile navigation consumes less screen height than the old dot dock.
    // Landscape phones must not shrink the book to a tiny strip.
    const reserved = mobileReader ? (vh < 520 ? 135 : 185) : 230;
    const usable = clamp((vh - reserved) / vh, mobileReader ? 0.55 : 0.45, 0.88);
    const dW = (fitW / 2 + 0.16) / (vt * aspect);
    const dH = ((BH * Math.sin(el) + 0.12) / 2) / (vt * usable);
    const dist = Math.max(dW, dH) * (readerView.mode === 'single' ? 1.06 : 1.08);
    // Move both camera and target horizontally. This is still the real 3D mesh.
    camera.position.set(cam.focusX + Math.sin(cam.az) * Math.cos(el) * dist,
      Math.sin(el) * dist, Math.cos(cam.az) * Math.cos(el) * dist);
    camera.lookAt(cam.focusX, 0.04, 0);
  }

  function resize() {
    vw = stage.clientWidth || window.innerWidth;
    vh = stage.clientHeight || window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    // lift the frame a little so the book sits clear of the bottom dock
    camera.setViewOffset(vw, vh, 0, Math.round(vh < 600 ? 18 : 26), vw, vh);
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  window.addEventListener("resize", resize);
  // Mobile browser toolbars alter the visual viewport without a regular resize.
  window.visualViewport?.addEventListener('resize', resize);
  let contextAvailable = true;
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextAvailable = false;
    readerVisible = false;
    const live = document.getElementById('live');
    if (live) live.textContent = '3D 图形暂时不可用，正在等待浏览器恢复显卡资源';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextAvailable = true;
    readerVisible = !document.hidden && contextAvailable;
    last = performance.now();
    needsRender = true;
  });
  let readerVisible = !document.hidden;
  document.addEventListener('visibilitychange', () => {
    readerVisible = !document.hidden && contextAvailable;
    last = performance.now();
    if (readerVisible) needsRender = true;
  });

  // ---------- pointer ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.06);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(deskPlane, hit)) return null;
    return book.worldToLocal(hit);
  }
  // V11: sample UV from the visible WebGL paper mesh instead of projecting onto
  // the desk. Raycasts follow the original curved geometry and its UV mapping.
  function mediaHit(e) {
    if (!window.SpecialMedia || leaves.some(l => l.anim || l.dragging)) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    ray.setFromCamera(ndc,camera);
    const visible=new Set([stage.dataset.left,stage.dataset.right]);
    const candidates=[];
    for(const L of leaves){
      if(L.kind==='page')L.meshes.forEach((m,i)=>{if(visible.has(i===0?SPEC[L.i].front:SPEC[L.i].back))candidates.push({mesh:m,file:i===0?SPEC[L.i].front:SPEC[L.i].back})});
      else if(L.group){const file=SPEC[L.i].inside;if(visible.has(file))candidates.push({mesh:L.group.children[1],file})}
    }
    const hits=ray.intersectObjects(candidates.map(x=>x.mesh),false);
    for(const h of hits){const c=candidates.find(x=>x.mesh===h.object);if(!c||!h.uv)continue;return window.SpecialMedia.hit(c.file,h.uv);}
    return null;
  }
  let mediaTap=null;
  const onBook = (p) => p && Math.abs(p.y) <= BH / 2 && Math.abs(p.x) <= BW;
  let drag = null, peekLeaf = null;
  let singleGesture = null;
  const isMobileSingle = () => mobileReader && readerView.mode === 'single';

  function setPeek(L, grabY, side) {
    if (peekLeaf && peekLeaf !== L) { peekLeaf.peekTarget = 0; peekLeaf.curlTarget = 0; }
    peekLeaf = L;
    if (!L) return;
    L.peekTarget = L.kind === "board" ? 0.022 : 0.04;
    L.grabY = clamp(grabY, -H / 2, H / 2);
    if (L.kind === "page") L.curlTarget = side * 2.4 * Math.min(1.3, STK.curl);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (window.SpecialBookProps?.pointerDown?.(e)) { e.preventDefault(); return; }
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const mediaElement=mediaHit(e);
    if(mediaElement){mediaTap={element:mediaElement,x:e.clientX,y:e.clientY};return;}
    if (isMobileSingle()) {
      if (busyTurning() || singleGesture) return;
      singleGesture = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const p = pick(e);
    if (!onBook(p)) return;
    const side = p.x >= 0 ? 1 : -1;
    const L = side > 0 ? topRight() : topLeft();
    if (!L) return;
    setPeek(null);
    L.t = L.te; L.peek = 0; L.peekTarget = 0;
    L.grabY = clamp(p.y, -H / 2, H / 2);
    L.dir = side;
    drag = { L, side, x0: p.x, sx: e.clientX, sy: e.clientY, moved: false, lastT: L.t, lastTime: performance.now(), vel: 0 };
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("pointermove", (e) => {
    if (window.SpecialBookProps?.pointerMove?.(e)) { e.preventDefault(); return; }
    if(mediaTap || singleGesture)return;
    const p = pick(e);
    if (e.pointerType === "mouse" && !drag) {
      if (document.body.classList.contains('sa-scene-arrange')) {
        cam.azT = 0; cam.elJT = 0; // no pointer parallax while arranging geometry/UI
      } else {
        cam.azT = ((e.clientX / vw) - 0.5) * 0.05;
        cam.elJT = ((e.clientY / vh) - 0.5) * -0.03;
      }
    }
    if (drag) {
      const { L, side } = drag;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
        drag.moved = true; L.dragging = true; noteInteraction();
        L.kind === "board" ? rustle(0.3, 0.4, true) : rustle(0.55, 0.5);
      }
      if (!drag.moved || !p) return;
      const t = side > 0 ? clamp((drag.x0 - p.x) / (drag.x0 + W), 0, 1) : 1 - clamp((p.x - drag.x0) / (W - drag.x0), 0, 1);
      const now = performance.now(), dtm = Math.max(1, now - drag.lastTime);
      drag.vel = 0.7 * drag.vel + 0.3 * (((t - drag.lastT) / dtm) * 1000);
      drag.lastT = t; drag.lastTime = now;
      L.t = t;
      L.grabY = clamp(p.y, -H / 2, H / 2);
      if (L.kind === "page") L.curlTarget = side * 1.15 * STK.curl;
      needsRender = true;
      return;
    }
    // hover: lift the corner a touch, like a thumb on the fore-edge
    if (onBook(p)) {
      const nearR = p.x > W - 0.34, nearL = p.x < -W + 0.34;
      const L = nearR ? topRight() : nearL ? topLeft() : null;
      setPeek(L, p.y, nearR ? 1 : -1);
      canvas.style.cursor = (p.x >= 0 ? topRight() : topLeft()) ? "grab" : "default";
    } else {
      setPeek(null);
      canvas.style.cursor = "default";
    }
    needsRender = true;
  });

  function endDrag(e) {
    if (window.SpecialBookProps?.pointerEnd?.(e)) { e.preventDefault(); return; }
    if(mediaTap){const tap=mediaTap;mediaTap=null;if(e.type==='pointerup'&&Math.hypot(e.clientX-tap.x,e.clientY-tap.y)<14)window.SpecialMedia?.open(tap.element);return;}
    if(singleGesture){
      const g=singleGesture;
      if (e.pointerId !== g.id) return;
      singleGesture=null;
      if(e.type!=='pointerup')return;
      const dx=e.clientX-g.x,dy=e.clientY-g.y;
      if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.2) {
        dx<0?next():prev();
      } else if(Math.hypot(dx,dy)<14) {
        const r=canvas.getBoundingClientRect(),fraction=(e.clientX-r.left)/r.width;
        if(fraction<0.19)prev(); else if(fraction>0.81)next();
      }
      return;
    }
    if (!drag) return;
    const { L, side, moved } = drag;
    L.dragging = false;
    canvas.style.cursor = "grab";
    if (!moved) {
      const p = pick(e);
      turn(L, side > 0 ? 1 : 0, { grabY: p ? clamp(p.y, -H / 2, H / 2) : -0.6 });
      noteInteraction();
    } else {
      const proj = L.t + drag.vel * 0.14;
      const to = side > 0 ? (proj > 0.45 ? 1 : 0) : (proj < 0.55 ? 0 : 1);
      L.target = side > 0 ? 0 : 1;   // so turn() always animates from where the hand let go
      turn(L, to, { ease: easeOutCubic, dur: (L.kind === "board" ? 0.5 : 0.35) + 0.75 * Math.abs(to - L.t), silent: true });
    }
    drag = null;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("pointerleave", (e) => { if (!drag) { setPeek(null); cam.azT = 0; cam.elJT = 0; } });

  window.addEventListener("keydown", (e) => {
    if (document.body.classList.contains('v1217-toc-open') || !document.getElementById('v12-page-view')?.hidden) return;
    if(document.body.classList.contains('sa-media-playing'))return;
    if (e.target.closest && e.target.closest("#editPanel")) return;
    if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    if (e.target.closest && e.target.closest(".paper")) return;
    if (e.key === "p" || e.key === "P") { const i = STOCKS.indexOf(STK); chooseStock(STOCKS[(i + 1) % STOCKS.length].id, true); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(NL); }
  });
  $("#next").addEventListener("click", () => next());
  $("#prev").addEventListener("click", () => prev());

  // ---------- paper stock ----------
  const stockTex = {};
  function loadStock(st, done) {
    if (!st.map) return done();
    let t = stockTex[st.id];
    if (t && t.image) return done();
    if (!t) {
      t = stockTex[st.id] = texLoader.load("assets/paper/" + st.map + ".webp", () => { t.ready = true; (t.waiting || []).forEach((f) => f()); t.waiting = null; });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = economyMode ? Math.min(2, maxAniso) : maxAniso;
      t.waiting = [];
    }
    if (t.ready) done(); else t.waiting.push(done);
  }
  function applyStock(st) {
    STK = st;
    PT = st.pt;
    const tiled = !!st.map;
    STOCK_U.uPaperAmt.value = st.amt;
    STOCK_U.uRep.value.set(tiled ? 1.5 : 1, tiled ? 2 : 1);   // a tile is 10 x 10 cm of paper
    STOCK_U.uLift.value = st.lift;
    STOCK_U.uDesat.value = st.desat;
    STOCK_U.uTint.value.copy(lin(st.tint));
    const edge = lin(st.edge);
    for (const L of leaves) {
      if (L.kind !== "page") continue;
      for (const m of L.mats) {
        m.bumpMap = tiled ? stockTex[st.id] : L.sheet;
        m.bumpScale = st.bump;
        m.roughness = st.rough;
        m.clearcoat = st.coat;
        m.clearcoatRoughness = st.coatRough;
        m.envMapIntensity = st.env;
      }
      L.lu.uOff.value.copy(tiled ? L.tileOff : new THREE.Vector2(0, 0));
      L.edge.material.color.copy(L.edgeBase).multiply(edge);
      L.edge.material.roughness = st.coat > 0.5 ? 0.7 : 0.96;
      L.sig = "";                          // thickness changed: re-lay every sheet
    }
    needsRender = true;
  }
  const paperBtn = $("#paperBtn"), paperMenu = $("#paperMenu");
  function swatch(el, st) {
    el.style.backgroundColor = st.base;
    el.style.backgroundImage = (st.coat > 0.5 ? "linear-gradient(135deg, rgba(255,255,255,.75), rgba(255,255,255,0) 55%), " : "") +
      `url("assets/paper/${st.map || st.swatch}.webp")`;
    el.style.backgroundBlendMode = st.coat > 0.5 ? "screen, overlay" : "overlay";
  }
  STOCKS.forEach((st) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "opt"; b.setAttribute("role", "menuitemradio"); b.dataset.id = st.id;
    const sw = document.createElement("span"); sw.className = "sw"; swatch(sw, st);
    const tx = document.createElement("span"); tx.className = "txt";
    const nm = document.createElement("b"); nm.textContent = st.name;
    const sp = document.createElement("span"); sp.className = "spec"; sp.textContent = st.spec;
    tx.append(nm, sp); b.append(sw, tx);
    b.addEventListener("click", () => { chooseStock(st.id, true); closeMenu(true); });
    paperMenu.appendChild(b);
  });
  function openMenu() {
    paperMenu.hidden = false;
    paperBtn.setAttribute("aria-expanded", "true");
    (paperMenu.querySelector('[aria-checked="true"]') || paperMenu.firstChild).focus();
  }
  function closeMenu(refocus) {
    if (paperMenu.hidden) return;
    paperMenu.hidden = true;
    paperBtn.setAttribute("aria-expanded", "false");
    if (refocus) paperBtn.focus();
  }
  paperBtn.addEventListener("click", () => (paperMenu.hidden ? openMenu() : closeMenu(false)));
  document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".paper")) closeMenu(false); });
  paperMenu.addEventListener("keydown", (e) => {
    const opts = [...paperMenu.children], i = opts.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1)) % opts.length].focus();
    } else if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
  });
  let stockReq = 0;
  function chooseStock(id, feel) {
    const st = STOCKS.find((s) => s.id === id) || STOCKS[0];
    const req = ++stockReq;
    paperBtn.setAttribute("aria-busy", "true");
    $("#paperName").textContent = st.name;
    swatch($("#paperSw"), st);
    [...paperMenu.children].forEach((b) => b.setAttribute("aria-checked", String(b.dataset.id === st.id)));
    try { localStorage.setItem(BOOK.id + "-paper", st.id); } catch (e) {}
    loadStock(st, () => {
      if (req !== stockReq) return;
      applyStock(st);
      paperBtn.removeAttribute("aria-busy");
      if (!feel) return;
      $("#live").textContent = "Paper: " + st.name;
      // let the top sheet lift and settle, so the new stock's stiffness and sound come through
      rustle(0.45, 0.4);
      const L = topRight();
      if (L && L.kind === "page") {
        setPeek(L, -0.6, 1);
        setTimeout(() => { if (peekLeaf === L) setPeek(null); }, 520);
      }
    });
  }

  // ---------- UI ----------
  const dots = $("#dots");
  const dotEntries = [];
  const DOT_LIMIT = 9;
  if (SPREADS.length <= DOT_LIMIT) {
    SPREADS.forEach((name, k) => {
      const b = document.createElement("button");
      b.className = "dot"; b.type = "button";
      b.setAttribute("aria-label", "跳转到 " + name);
      b.title = name;
      b.addEventListener("click", () => goTo(k));
      dots.appendChild(b);
      dotEntries.push({ el: b, start: k, end: k });
    });
  } else {
    const innerBuckets = 5;
    const innerCountSpreads = Math.max(1, SPREADS.length - 2);
    const segments = [{ start: 0, end: 0, label: SPREADS[0] }];
    for (let i = 0; i < innerBuckets; i++) {
      const s = 1 + Math.floor((i * innerCountSpreads) / innerBuckets);
      const e = 1 + Math.floor(((i + 1) * innerCountSpreads) / innerBuckets) - 1;
      if (e >= s) {
        segments.push({
          start: s,
          end: e,
          label: s === e ? SPREADS[s] : `第 ${s}–${e} 章`,
        });
      }
    }
    segments.push({ start: SPREADS.length - 1, end: SPREADS.length - 1, label: SPREADS[SPREADS.length - 1] });
    for (const seg of segments) {
      const b = document.createElement("button");
      b.className = "dot"; b.type = "button";
      b.setAttribute("aria-label", "跳转到 " + seg.label);
      b.title = seg.label;
      b.addEventListener("click", () => goTo(seg.start));
      dots.appendChild(b);
      dotEntries.push({ el: b, start: seg.start, end: seg.end });
    }
  }
  let lastK = -1;
  function updateUI() {
    const k = spreadIndex();
    if (k === lastK) { emitReaderState(); return; }
    lastK = k;
    maintainArtwork(k);
    $("#label").textContent = SPREADS[k];
    $("#live").textContent = SPREADS[k] + ". " + DESCRIPTIONS[k];
    stage.setAttribute("aria-label", BOOK.title + ". " + SPREADS[k] + ". " + DESCRIPTIONS[k]);
    stage.dataset.spread = String(k);
    stage.dataset.left = k === 0 ? "" : k === NL ? BOOK.backCover.file : BOOK.spreads[k - 1].left.file;
    stage.dataset.right = k === 0 ? BOOK.frontCover.file : k === NL ? "" : BOOK.spreads[k - 1].right.file;
    window.dispatchEvent(new CustomEvent('special:pagechange',{detail:{spread:k}}));
    $("#prev").disabled = k === 0;
    $("#next").disabled = k === NL;
    dotEntries.forEach((entry) => {
      entry.el.setAttribute("aria-current", String(k >= entry.start && k <= entry.end));
    });
    emitReaderState();
    needsRender = true;
  }
  function noteInteraction() {
    if (interacted) return;
    interacted = true;
    $("#hint").classList.add("gone");
  }

  // Keep each book’s paper and sound preferences separate.
  function boot(data) {
    booted = true;
    let saved = data && data.paper;
    try { saved = saved || localStorage.getItem(BOOK.id + "-paper"); } catch (e) {}
    chooseStock(saved || "matte", false);
    const k = clamp((data && data.k) | 0, 0, NL);
    leaves.forEach((L, i) => { L.t = L.te = L.target = i < k ? 1 : 0; });
    readerView.page = firstPageForSpread(k);
    updateUI();
    update(0, performance.now());
    cam.off = k === 0 ? -BW / 2 : k === NL ? BW / 2 : 0;
    cam.focusX = readerView.mode === 'single' && k > 0 && k < NL ? -W / 2 : 0;
    fitW = readerView.mode === 'single' ? BW : k === 0 || k === NL ? BW : 2 * BW;
    resize();
    requestAnimationFrame(loop);
  }

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!readerVisible) return;
    const busy = update(dt, now);
    const propMotion = window.SpecialBookProps?.tick?.(dt, now) || false;
    if (busy || needsRender || propMotion) { renderer.render(scene, camera); needsRender = false; }
    // During a long turn, adapt physical GPU pixel load without changing photo detail.
    // Hysteresis prevents oscillation and only applies in automatic mode.
    if (qualityMode === 'auto' && busy && dt > 0.001) {
      if (dt > 1 / 34) { adaptiveSlowFrames++; adaptiveFastFrames = 0; }
      else if (dt < 1 / 52) { adaptiveFastFrames++; adaptiveSlowFrames = Math.max(0, adaptiveSlowFrames - 2); }
      if (adaptiveSlowFrames >= 24 && adaptiveDrop < 0.45) {
        adaptiveDrop = Math.min(0.45, adaptiveDrop + 0.15);
        currentRenderScale = Math.max(0.85, idealRenderScale() - adaptiveDrop);
        renderer.setPixelRatio(currentRenderScale); resize(); adaptiveSlowFrames = 0;
      } else if (adaptiveFastFrames >= 160 && adaptiveDrop > 0) {
        adaptiveDrop = Math.max(0, adaptiveDrop - 0.1);
        currentRenderScale = Math.max(0.85, idealRenderScale() - adaptiveDrop);
        renderer.setPixelRatio(currentRenderScale); resize(); adaptiveFastFrames = 0;
      }
    }
  }

  // V12.2: do not block the reading experience on all 80 page images.
  let texturesDone = false, fontsDone = false, readySent = false;
  function reveal() {
    if (!texturesDone || !fontsDone || !initialArtworkReady || readySent) return;
    readySent = true;
    needsRender = true;
    $('#bar').style.width = '100%';
    const coverMissing = failed.includes('assets/pages/' + initialArtworkFile);
    if (coverMissing) console.warn('Cover artwork is missing; book will use a paper-colour fallback.');
    setTimeout(() => { $('#loader').classList.add('done'); $('#loader').setAttribute('aria-hidden', 'true'); }, 120);
    prewarmAllPreviews();
    window.dispatchEvent(new Event('flipbook:ready'));
  }
  manager.onLoad = () => { texturesDone = true; reveal(); };
  const fontWait = document.fonts
    ? Promise.all([document.fonts.load('500 14px Oswald'), document.fonts.load('400 11px Oswald')])
    : Promise.resolve();
  Promise.race([fontWait, new Promise((r) => setTimeout(r, 3500))]).catch(() => {}).then(() => { fontsDone = true; reveal(); });

  boot({});
})();
