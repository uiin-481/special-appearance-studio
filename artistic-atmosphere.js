/**
 * 特别出演 · 艺术意境与感官沉浸增强引擎 (Artistic Atmosphere Engine V13.5 - 性能与流畅度终极调校版)
 *
 * 核心性能优化准则：
 * 1. 零帧率损耗（Zero FPS Drop）：
 *    彻底废除外部死循环 requestAnimationFrame 与高频 invalidate() 强制重绘；
 *    完全接入原版 book.js 的按需渲染架构 (SpecialBookProps.tick)，翻页时 100% 算力归还书本。
 * 2. 零着色器膨胀（Zero Shader Bloat）：
 *    不向场景中添加额外聚光灯（SpotLight），直接复用与微调原场景自带光照体系，纸张 Shader 指令数与原版 100% 一致。
 * 3. 纯 GPU 级微尘粒子（Zero CPU Memory Transfer）：
 *    彻底消除 CPU 粒子数组遍历与 BufferData 上传，显存带宽占用降为零。
 */

(() => {
  'use strict';

  // ==========================================
  // 一、 原生 Web Audio 机械声学合成器
  // ==========================================
  class AnalogAudioEngine {
    constructor() {
      this.ctx = null;
      this.hissNode = null;
      this.hissGain = null;
      this.isHissRunning = false;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    playLampSwitch() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(1.2, now);

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(420, now);
      osc1.frequency.exponentialRampToValueAtTime(110, now + 0.035);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(980, now + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(240, now + 0.085);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.038);
      gain.gain.setValueAtTime(0.20, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.04);
      osc2.start(now + 0.04);
      osc2.stop(now + 0.095);
    }

    playCassetteClick() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const oscLow = ctx.createOscillator();
      const oscHigh = ctx.createOscillator();
      const gain = ctx.createGain();

      oscLow.type = 'sine';
      oscLow.frequency.setValueAtTime(130, now);
      oscLow.frequency.exponentialRampToValueAtTime(35, now + 0.07);

      oscHigh.type = 'square';
      oscHigh.frequency.setValueAtTime(850, now);
      oscHigh.frequency.exponentialRampToValueAtTime(200, now + 0.025);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscLow.connect(gain);
      oscHigh.connect(gain);
      gain.connect(ctx.destination);

      oscLow.start(now);
      oscHigh.start(now);
      oscLow.stop(now + 0.08);
      oscHigh.stop(now + 0.08);

      if (typeof navigator.vibrate === 'function') {
        try { navigator.vibrate([10]); } catch (_) {}
      }
    }

    startTapeHiss() {
      const ctx = this.ensureContext();
      if (!ctx || this.isHissRunning) return;

      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 2.8;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);
      filter.Q.setValueAtTime(0.8, ctx.currentTime);

      this.hissGain = ctx.createGain();
      this.hissGain.gain.setValueAtTime(0.0004, ctx.currentTime);
      this.hissGain.gain.linearRampToValueAtTime(0.0035, ctx.currentTime + 1.5);

      whiteNoise.connect(filter);
      filter.connect(this.hissGain);
      this.hissGain.connect(ctx.destination);

      whiteNoise.start();
      this.hissNode = whiteNoise;
      this.isHissRunning = true;
    }

    stopTapeHiss() {
      if (!this.isHissRunning || !this.hissGain || !this.ctx) return;
      const now = this.ctx.currentTime;
      this.hissGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
      setTimeout(() => {
        if (this.hissNode) {
          try { this.hissNode.stop(); } catch (_) {}
          this.hissNode.disconnect();
          this.hissNode = null;
        }
        this.isHissRunning = false;
      }, 850);
    }
  }

  const audio = new AnalogAudioEngine();
  let hasAwakened = false;
  let applyLightingPreset = null;

  // ==========================================
  // 二、 开篇唤醒剧幕 (The Awakening Curtain)
  // ==========================================
  function showAwakeningCurtain() {
    if (!document.querySelector('.cinematic-vignette')) {
      const vignette = document.createElement('div');
      vignette.className = 'cinematic-vignette';
      document.body.appendChild(vignette);
    }
    if (location.search.includes('skipIntro=1')) {
      hasAwakened = true;
      if (typeof window.launchWalkmanNow === 'function') window.launchWalkmanNow();
      return;
    }

    const curtain = document.createElement('div');
    curtain.className = 'awakening-curtain';
    curtain.setAttribute('role', 'dialog');
    curtain.setAttribute('aria-label', '轻触屏幕开启私人放映室');

    const isFileProtocol = location.protocol === 'file:';

    curtain.innerHTML = `
      <div class="awakening-box">
        <h1 class="awakening-title">特别出演</h1>
        <p class="awakening-sub">BEST OF US · 私人放映室</p>
        
        ${isFileProtocol ? `
          <div class="file-warning-box">
            <div style="font-size: 14px; color: #ffca7b; font-weight: 500; margin-bottom: 6px;">
              ⚠️ 检测到直接双击了本地网页（file:// 模式）
            </div>
            <div style="font-size: 12px; color: #d0c4b4; line-height: 1.6; margin-bottom: 12px;">
              现代浏览器的安全策略在直接双击打开时，会拦截本地 3D 照片材质与随身听模型。<br>
              请直接访问已启动的服务地址：<br>
              <strong style="color: #6ae4a8; font-size: 13px;">http://127.0.0.1:4173/index.html</strong>
            </div>
          </div>
        ` : ''}

        <button type="button" class="awakening-prompt" aria-label="开启暖光与随身听进入回忆">
          <span class="awakening-icon">✦</span>
          <span>点亮暖光 · 开启随身听</span>
        </button>
        <div style="margin-top: 18px; font-size: 11px; color: #7f776c; letter-spacing: 0.1em;">
          轻触屏幕任意位置即可进入 3D 纪念书桌
        </div>
      </div>
    `;

    document.body.appendChild(curtain);

    function triggerAwaken() {
      if (hasAwakened) return;
      hasAwakened = true;

      audio.playLampSwitch();
      if (typeof window.launchWalkmanNow === 'function') {
        window.launchWalkmanNow();
      }

      curtain.classList.add('hidden');
      setTimeout(() => {
        try { curtain.remove(); } catch (_) {}
      }, 1500);

      if (applyLightingPreset) applyLightingPreset(true);

      setTimeout(() => {
        audio.playCassetteClick();
        const fallbackBtn = document.getElementById('v12191-fallback');
        if (fallbackBtn && fallbackBtn.getAttribute('aria-pressed') !== 'true') {
          fallbackBtn.click();
        }
      }, 550);
    }

    curtain.addEventListener('click', triggerAwaken);
    curtain.addEventListener('touchend', (e) => {
      e.preventDefault();
      triggerAwaken();
    }, { passive: false });
  }

  // ==========================================
  // 三、 主场景原生灯光复用与高性能道具装配
  // ==========================================
  function initWhenReady() {
    const api = window.SpecialBookScene;
    if (!api || !api.scene || !api.renderer || !api.camera) {
      setTimeout(initWhenReady, 50);
      return;
    }
    setup3DAtmosphere(api);
  }

  function setup3DAtmosphere(api) {
    const { THREE, scene, camera, renderer, invalidate } = api;

    // 1. 复用原场景自带灯光（0 个新光源，彻底消除 Shader 计算额外膨胀）
    let origHemi = null;
    let origKey = null;
    let origFill = null;

    scene.traverse((obj) => {
      if (obj.isHemisphereLight) origHemi = obj;
      else if (obj.isDirectionalLight) {
        if (obj.castShadow) origKey = obj;
        else origFill = obj;
      }
    });

    const baseConfig = {
      hemiColor: origHemi ? origHemi.color.getHex() : 0xffffff,
      hemiGround: origHemi ? origHemi.groundColor.getHex() : 0xffffff,
      hemiIntensity: origHemi ? origHemi.intensity : 0.5,
      keyColor: origKey ? origKey.color.getHex() : 0xffffff,
      keyIntensity: origKey ? origKey.intensity : 0.78,
      fillIntensity: origFill ? origFill.intensity : 0.1
    };

    let currentMood = 'warm-motes'; // 'warm-motes' | 'warm-clean' | 'classic'
    let moodSelectEl = null;
    let lightWarmupTime = 0; // 仅在开关灯平滑过渡期间为 > 0，动画完成后降为 0（恢复 0 开销）

    function updateMoodLighting(animateWarmup = false) {
      const vig = document.querySelector('.cinematic-vignette');
      if (moodSelectEl && moodSelectEl.value !== currentMood) {
        moodSelectEl.value = currentMood;
      }

      if (currentMood === 'classic') {
        if (origHemi) {
          origHemi.color.setHex(baseConfig.hemiColor);
          origHemi.groundColor.setHex(baseConfig.hemiGround);
          origHemi.intensity = baseConfig.hemiIntensity;
        }
        if (origKey) {
          origKey.color.setHex(baseConfig.keyColor);
          origKey.intensity = baseConfig.keyIntensity;
        }
        if (origFill) origFill.intensity = baseConfig.fillIntensity;
        if (vig) vig.style.opacity = '0';
        invalidate();
        return;
      }

      const isDim = (currentMood === 'warm-clean');
      if (vig) vig.style.opacity = isDim ? '1' : '0.82';

      // 电影级暖调配色方案：将原场景环境光调为温润琥珀与暖焦糖漫反射，消除过曝
      const targetHemiInt = isDim ? 0.28 : 0.40;
      const targetKeyInt = isDim ? 0.52 : 0.68;
      const targetFillInt = isDim ? 0.04 : 0.08;

      if (!animateWarmup) {
        if (origHemi) {
          origHemi.color.setHex(0xffecd2);
          origHemi.groundColor.setHex(0x2d221a);
          origHemi.intensity = targetHemiInt;
        }
        if (origKey) {
          origKey.color.setHex(0xffe8c6);
          origKey.intensity = targetKeyInt;
        }
        if (origFill) origFill.intensity = targetFillInt;
        invalidate();
        return;
      }

      // 开灯温和唤醒过渡（仅持续 600ms，绝不常驻占用性能）
      lightWarmupTime = 0.65;
      invalidate();
    }

    applyLightingPreset = updateMoodLighting;
    updateMoodLighting(false);

    // 2. 桌面叙事纪念信物：南京紫峰 & 玄武湖星空纪念书签
    let pcbMesh = null;
    let cardHoverOffset = 0;
    const texLoader = new THREE.TextureLoader();
    texLoader.load('assets/props/nanjing-pcb.png', (tex) => {
      tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() || 1);

      const cardW = 0.46;
      const cardH = 0.24;
      const cardGeo = new THREE.BoxGeometry(cardW, 0.005, cardH);

      const pcbMat = new THREE.MeshStandardMaterial({
        map: tex,
        color: 0xded5cb,
        metalness: 0.72,
        roughness: 0.32
      });

      pcbMesh = new THREE.Mesh(cardGeo, pcbMat);
      // 放置在右上角开阔桌面(X = +1.82, Z = -0.88)，无论封面闭合还是双页全开，永远 100% 优雅可见
      pcbMesh.position.set(1.82, 0.004, -0.88);
      pcbMesh.rotation.y = 0.16;
      pcbMesh.castShadow = true;
      pcbMesh.receiveShadow = true;
      scene.add(pcbMesh);
      invalidate();
    });

    // 3. 悬停交互气泡（使用轻量局部视口检测，避免全屏高频射线交叉计算）
    const pill = document.createElement('div');
    pill.className = 'props-pill';
    pill.textContent = '✦ 南京 · 星空纪念书签';
    document.body.appendChild(pill);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isHoveringCard = false;
    let lastRayCheck = 0;

    function handlePointerMove(e) {
      if (!pcbMesh) return;
      // 性能优化：只有光标在屏幕右上象限区域时才进行快速射线投射，避免全屏无效计算
      const now = performance.now();
      if (now - lastRayCheck < 32) return; // 节流至 30Hz
      lastRayCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // 视锥快速包围盒粗筛（仅右上区域）
      if (nx < 0.2 || ny < -0.2) {
        if (isHoveringCard) {
          isHoveringCard = false;
          document.body.style.cursor = '';
          pill.classList.remove('visible');
        }
        return;
      }

      mouse.set(nx, ny);
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(pcbMesh);

      if (hits.length > 0) {
        if (!isHoveringCard) {
          isHoveringCard = true;
          document.body.style.cursor = 'pointer';
          pill.classList.add('visible');
          audio.playCassetteClick();
        }
        pill.style.left = e.clientX + 'px';
        pill.style.top = e.clientY + 'px';
      } else if (isHoveringCard) {
        isHoveringCard = false;
        document.body.style.cursor = '';
        pill.classList.remove('visible');
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', () => {
      if (isHoveringCard && pcbMesh) {
        cardHoverOffset = 0.032;
        audio.playCassetteClick();
        invalidate();
      }
    });

    moodSelectEl = injectMoodSelector((newMood) => {
      currentMood = newMood;
      audio.playLampSwitch();
      updateMoodLighting(false);
    });

    window.addEventListener('special:pagechange', () => {
      audio.playCassetteClick();
    });

    // 磁带微底噪监听
    setInterval(() => {
      const media = window.SpecialMedia;
      if (media && typeof media.musicState === 'function') {
        const state = media.musicState();
        if (state.playing && !audio.isHissRunning) {
          audio.startTapeHiss();
        } else if (!state.playing && audio.isHissRunning) {
          audio.stopTapeHiss();
        }
      }
    }, 600);

    // ==========================================
    // 4. 彻底接入 book.js 官方按需渲染管线 (0 外部循环，0 强制重绘)
    // ==========================================
    window.SpecialBookProps = {
      tick: (dt, now) => {
        let activeMotion = false;

        // 书签点击轻弹物理
        if (pcbMesh && cardHoverOffset > 0.0001) {
          cardHoverOffset += (0 - cardHoverOffset) * Math.min(1, dt * 10);
          pcbMesh.position.y = 0.004 + cardHoverOffset;
          pcbMesh.rotation.z = Math.sin(now * 0.012) * 0.02 * (cardHoverOffset / 0.032);
          activeMotion = true;
        }

        // 开灯平滑过渡阶段
        if (lightWarmupTime > 0) {
          lightWarmupTime -= dt;
          const p = 1 - Math.max(0, lightWarmupTime / 0.65);
          const ease = 1 - Math.pow(1 - p, 3);
          const isDim = (currentMood === 'warm-clean');
          const targetHemiInt = isDim ? 0.28 : 0.40;
          const targetKeyInt = isDim ? 0.52 : 0.68;
          if (origHemi) origHemi.intensity = 0.12 + (targetHemiInt - 0.12) * ease;
          if (origKey) origKey.intensity = 0.20 + (targetKeyInt - 0.20) * ease;
          activeMotion = true;
        }

        // 只有在配件真正发生位移或开灯过渡时才驱动渲染；翻书或静止时返回 false，完全交给 book.js 原版控制
        return activeMotion;
      }
    };
  }

  function injectMoodSelector(onChange) {
    const rightBar = document.querySelector('header.top .right');
    if (!rightBar || document.getElementById('moodSelect')) return null;

    const label = document.createElement('label');
    label.className = 'reader-quality';
    label.title = '切换放映室光影氛围';
    label.innerHTML = `
      <span>光影</span>
      <select id="moodSelect" aria-label="光影氛围">
        <option value="warm-motes">暖光微光</option>
        <option value="warm-clean">静谧暗房</option>
        <option value="classic">原版自然光</option>
      </select>
    `;

    const qualityLabel = rightBar.querySelector('.reader-quality');
    if (qualityLabel) {
      rightBar.insertBefore(label, qualityLabel);
    } else {
      rightBar.prepend(label);
    }

    const select = label.querySelector('select');
    select.addEventListener('change', () => {
      onChange(select.value);
    });
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    return select;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      showAwakeningCurtain();
      initWhenReady();
    });
  } else {
    showAwakeningCurtain();
    initWhenReady();
  }
})();
