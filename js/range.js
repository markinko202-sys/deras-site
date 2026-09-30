// The range: click the arrows and one car drives off while the next one arrives.
// Each transition is a frame sequence (media/range-1 = Kilat→Senja, range-2 = Senja→Rimba, range-3 = Rimba→Kilat)
// played on a canvas by time; "previous" plays the matching transition backwards.
// Until the footage exists, a procedural drive-off / drive-in placeholder is drawn.
(() => {
  const MODELS = [
    { key: 'kilat', name: 'Kilat', kicker: 'Two-door GT', gloss: '<em>kilat</em> — lightning',
      acc: 2.9, kw: 612, km: 540, x: 312, xlabel: 'Top speed', xunit: 'km/h', price: 'RM 698,000', tint: '214,178,122' },
    { key: 'senja', name: 'Senja', kicker: 'Four-seat grand tourer', gloss: '<em>senja</em> — dusk',
      acc: 3.8, kw: 480, km: 680, x: 270, xlabel: 'Top speed', xunit: 'km/h', price: 'RM 548,000', tint: '196,110,92' },
    { key: 'rimba', name: 'Rimba', kicker: 'Raised all-wheel drive', gloss: '<em>rimba</em> — jungle',
      acc: 4.4, kw: 420, km: 590, x: 210, xlabel: 'Ground clearance', xunit: 'mm', price: 'RM 462,000', tint: '150,170,128' },
  ];
  const PLAY_MS = 3400;           // one drive-off + arrival, whatever the source video length
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.querySelector('.range');
  if (!root) return;
  const canvas = root.querySelector('.range-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const info = root.querySelector('.range-info');
  const idxEl = root.querySelector('.range-idx');
  const dots = [...root.querySelectorAll('.range-dots button')];
  const arrows = [...root.querySelectorAll('.range-arrow')];
  let W = 1, H = 1;

  // ---------- frame sequences ----------
  class FrameSet {
    constructor(name) { this.name = name; this.man = (window.DERAS_MEDIA || {})[name]; this.frames = null; }
    get ok() { return !!this.man; }
    load() {
      if (!this.man || this.frames) return;
      const m = this.man, n = m.frames;
      const set = window.innerWidth * DPR < 1300 && m.sets.includes('m') ? 'm' : 'd';
      this.frames = new Array(n);
      const order = [], seen = new Set();
      for (const step of [24, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      // first and last frames matter most: they are the idle poses
      order.splice(1, 0, n - 1);
      let cursor = 0;
      const worker = async () => {
        while (cursor < order.length) {
          const i = order[cursor++];
          if (this.frames[i]) continue;
          const img = new Image();
          img.src = `media/${this.name}/${set}/${String(i + 1).padStart(4, '0')}.${m.ext || 'jpg'}`;
          try { await img.decode(); this.frames[i] = img; if (!busy) drawIdle(); } catch {}
        }
      };
      for (let k = 0; k < 6; k++) worker();
    }
    at(p) {
      if (!this.frames) return null;
      const n = this.frames.length, i = Math.round(p * (n - 1));
      for (let d = 0; d < n; d++) { if (this.frames[i - d]) return this.frames[i - d]; if (this.frames[i + d]) return this.frames[i + d]; }
      return null;
    }
  }
  // transitions[i] goes from model i to model i+1
  const transitions = MODELS.map((_, i) => new FrameSet(`range-${i + 1}`));
  const stills = MODELS.map(m => { const img = new Image(); img.onload = () => !busy && drawIdle(); img.src = `img/range-${m.key}.jpg`; return img; });

  // ---------- drawing ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width * DPR));
    H = canvas.height = Math.max(1, Math.round(r.height * DPR));
    if (!busy) drawIdle();
  }
  function cover(img) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }
  function drawIdle() {
    const t = transitions[cur], back = transitions[(cur + MODELS.length - 1) % MODELS.length];
    const img = (t.ok && t.frames?.[0]) || (back.ok && back.frames?.[back.frames.length - 1]) || (stills[cur].naturalWidth && stills[cur]);
    if (img) cover(img); else drawPlaceholder(cur, cur, 1);
  }
  // placeholder: car A drives off to the left, car B arrives from the right and stops
  function drawPlaceholder(from, to, p) {
    const D = window.DerasDraw;
    D.frame(ctx, W, H, '#070706');
    D.floor(ctx, W, H, 1);
    const ease = x => x * x * (3 - 2 * x);
    const car = (m, dx, glow) => {
      const k = D.carSpace(ctx, W, H, 0.78, dx);
      D.bodyPath(ctx); ctx.fillStyle = '#0c0c0b'; ctx.fill();
      ctx.lineWidth = 1.4 / k; ctx.strokeStyle = `rgba(${MODELS[m].tint},${0.85})`;
      D.bodyPath(ctx); ctx.stroke(); D.glassPath(ctx); ctx.stroke();
      D.wheel(ctx, 0.31, -dx * 20); D.wheel(ctx, -0.31, -dx * 20); ctx.stroke();
      ctx.lineWidth = 3 / k; ctx.strokeStyle = `rgba(255,246,230,${glow})`; ctx.shadowColor = '#fff'; ctx.shadowBlur = 18 * glow;
      ctx.beginPath(); ctx.moveTo(0.43, -0.148); ctx.lineTo(0.495, -0.118); ctx.stroke(); ctx.shadowBlur = 0;
    };
    // cars face left in this pose, so mirror the unit car
    ctx.save();
    if (from === to) { mirror(() => car(to, 0, 1)); ctx.restore(); return; }
    const out = ease(Math.min(1, p / 0.5)), inn = ease(Math.max(0, (p - 0.45) / 0.55));
    if (p < 0.55) mirror(() => car(from, out * 1.7, 1));
    if (p > 0.45) mirror(() => car(to, -(1 - inn) * 1.7, inn));
    ctx.restore();
  }
  function mirror(fn) {
    // flip horizontally around the canvas centre
    const save = CanvasRenderingContext2D.prototype.setTransform;
    ctx.setTransform = function (a, b, c, d, e, f) { save.call(this, -a, b, c, d, W - e, f); };
    try { fn(); } finally { ctx.setTransform = save; }
  }

  // ---------- state + animation ----------
  let cur = 0, busy = false;

  function setInfo(m, animateNumbers) {
    const d = MODELS[m];
    info.querySelectorAll('[data-f]').forEach(el => {
      const f = el.dataset.f;
      if (f === 'gloss') el.innerHTML = d.gloss; else el.textContent = d[f];
    });
    info.querySelectorAll('[data-spec]').forEach(el => {
      const key = el.dataset.spec, to = d[key], dec = key === 'acc' ? 1 : 0;
      const from = parseFloat(el.textContent.replace(/,/g, '')) || 0;
      if (!animateNumbers || reduce) { el.textContent = to.toFixed(dec); return; }
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 900), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
        el.textContent = v.toFixed(dec);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    idxEl.textContent = String(m + 1).padStart(2, '0');
    dots.forEach((b, i) => b.setAttribute('aria-current', i === m ? 'true' : 'false'));
  }

  function go(dir, target) {
    if (busy) return;
    const n = MODELS.length;
    const to = target ?? (cur + dir + n) % n;
    if (to === cur) return;
    if (target !== undefined) dir = ((to - cur + n) % n) === 1 ? 1 : -1;
    // forward uses transition[cur]; backward plays transition[to] in reverse
    const seq = dir > 0 ? transitions[cur] : transitions[to];
    const from = cur;
    busy = true;
    root.classList.add('is-moving', dir > 0 ? 'dir-next' : 'dir-prev');
    info.classList.add('out');
    const t0 = performance.now(), dur = reduce ? 1 : PLAY_MS;
    let swapped = false;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      const p = dir > 0 ? k : 1 - k;
      const img = seq.ok && seq.at(p);
      if (img) cover(img); else drawPlaceholder(dir > 0 ? from : to, dir > 0 ? to : from, p);
      root.style.setProperty('--run', k);
      if (!swapped && k > 0.55) { swapped = true; cur = to; setInfo(to, true); info.classList.remove('out'); }
      if (k < 1) requestAnimationFrame(tick);
      else {
        busy = false; cur = to;
        root.classList.remove('is-moving', 'dir-next', 'dir-prev');
        root.style.setProperty('--run', 0);
        drawIdle();
      }
    };
    requestAnimationFrame(tick);
  }

  arrows[0].addEventListener('click', () => go(-1));
  arrows[1].addEventListener('click', () => go(1));
  dots.forEach((b, i) => b.addEventListener('click', () => {
    const n = MODELS.length;
    if (i === cur) return;
    // only neighbours have footage, so walk one step toward the target
    go(((i - cur + n) % n) === 1 ? 1 : -1);
  }));

  // keyboard when the section is on screen
  let inView = false;
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting;
    if (inView) transitions.forEach(t => t.load());
  }, { rootMargin: '100% 0px', threshold: 0 }).observe(root);
  window.addEventListener('keydown', e => {
    if (!inView || e.target.closest('input, select, textarea')) return;
    const r = root.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
  });

  // swipe on touch screens
  let sx = null, sy = 0;
  root.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
  root.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });

  let rw = window.innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - rw) < 2 && window.matchMedia('(pointer: coarse)').matches) return;
    rw = window.innerWidth; resize();
  });
  setInfo(0, false);
  resize();
})();
