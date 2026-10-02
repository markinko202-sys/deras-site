// The range: click the arrows and one car drives off while the next one arrives.
// Each transition is a frame sequence (media/range-1 = Kilat→Senja, range-2 = Senja→Rimba, range-3 = Rimba→Kilat)
// played on a canvas by time; "previous" plays the matching transition backwards.
// Until the footage exists, a procedural drive-off / drive-in placeholder is drawn.
(() => {
  const MODELS = [
    { key: 'kilat', name: 'Kilat', kicker: 'Two-door GT', gloss: '<em>kilat</em> — lightning',
      acc: 2.9, kw: 612, km: 540, x: 312, xlabel: 'Top speed', xunit: 'km/h', price: 'RM 698,000', tint: '214,178,122' },
    { key: 'senja', name: 'Senja', kicker: 'Four-door shooting brake', gloss: '<em>senja</em> — dusk',
      acc: 3.8, kw: 480, km: 680, x: 270, xlabel: 'Top speed', xunit: 'km/h', price: 'RM 548,000', tint: '196,110,92' },
    { key: 'rimba', name: 'Rimba', kicker: 'All-terrain SUV', gloss: '<em>rimba</em> — jungle',
      acc: 4.4, kw: 420, km: 590, x: 210, xlabel: 'Ground clearance', xunit: 'mm', price: 'RM 462,000', tint: '150,170,128' },
  ];
  const PLAY_MS = 3600;           // one drive-off + arrival, whatever the source video length
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
    constructor(name) { this.name = name; this.man = (window.DERAS_MEDIA || {})[name]; this.store = null; }
    get ok() { return !!this.man; }
    get frames() { return this.store && this.store.loaded ? this.store : null; }
    load() {
      if (!this.man || this.store) return;
      const m = this.man;
      const set = (window.DerasPhone || innerWidth < 900) && m.sets.includes('m') ? 'm' : 'd';   // the light set on phones
      const n = (m.counts && m.counts[set]) || m.frames;
      this.n = n;
      this.store = new window.DerasFrames.FrameStore(`media/${this.name}/${set}`, n, m.ext || 'jpg', { phone: !!window.DerasPhone, workers: window.DerasPhone ? 3 : 6, keep: 40, pin: [0, n - 1] });
      this.store.onFrame = i => { if (!busy && (i === 0 || i === n - 1)) drawIdle(); };
      this.store.start([0, n - 1]);                    // the idle poses first
      this.store.focus(0);
    }
    unload() { if (!busy && this.store) { this.store.dispose(); this.store = null; } }
    first() { return this.store?.get(0) || null; }
    last() { return this.store?.get(this.n - 1) || null; }
    // frame + blend partner for playback position p (0..1)
    at(p) {
      const st = this.store; if (!st || !st.loaded) return null;
      const f = p * (this.n - 1), i = Math.floor(f);
      st.focus(Math.round(f));
      const a = st.get(i) || st.nearest(i); if (!a) return null;
      return { a, b: a === st.get(i) ? st.get(i + 1) : null, t: f - i };
    }
  }
  // transitions[i] goes from model i to model i+1
  const transitions = MODELS.map((_, i) => new FrameSet(`range-${i + 1}`));
  const stills = MODELS.map(() => ({ naturalWidth: 0 }));   // no still photos: the transition videos provide every pose

  // ---------- drawing ----------
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = canvas.width = Math.max(1, Math.round(r.width * DPR));
    H = canvas.height = Math.max(1, Math.round(r.height * DPR));
    if (!busy) { if (usable(shown)) cover(shown); else drawIdle(); }
  }
  // The footage has the car centred; on wide screens push it into the right part of the stage
  // (the specs sit on the left) and feather the edges of the frame into the studio black.
  const BG = '#080706';
  function place(img) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    let s, x, y;
    if (W / H > 1.2) {
      s = Math.min(W * 0.8 / iw, H * 0.96 / ih);
      x = W - iw * s + W * 0.05; y = (H - ih * s) / 2 + H * 0.02;
    } else if (W / H < 0.85) {
      s = W / iw; x = (W - iw * s) / 2; y = H * 0.14;            // the whole car, edge to edge
    } else {
      s = Math.max(W / iw, H / ih); x = (W - iw * s) / 2; y = (H - ih * s) / 2;
    }
    return { x, y, w: iw * s, h: ih * s };
  }
  // a released ImageBitmap (phones free memory when you scroll away) has zero size — never draw one
  const usable = img => !!img && (img.naturalWidth || img.width) > 0;
  // draw a frame (optionally blended with the next one by t), then feather the edges
  function cover(img, alpha = 1, next = null, t = 0) {
    if (!usable(img)) return false;
    if (!usable(next)) next = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingQuality = 'high';
    const r = place(img);
    if (alpha >= 1) { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, r.x, r.y, r.w, r.h);
    if (next && t > 0.02) { ctx.globalAlpha = alpha * t; ctx.drawImage(next, r.x, r.y, r.w, r.h); }
    ctx.globalAlpha = 1;
    if (alpha < 1) return;
    const fx = r.w * 0.14, fy = r.h * 0.12;
    const edge = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, BG); g.addColorStop(1, 'rgba(8,7,6,0)');
      ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh);
    };
    if (r.x > 0) edge(r.x, 0, r.x + fx, 0, r.x - 1, 0, fx + 1, H);
    if (r.y > 0) edge(0, r.y, 0, r.y + fy, 0, r.y - 1, W, fy + 1);
    if (r.y + r.h < H) edge(0, r.y + r.h, 0, r.y + r.h - fy, 0, r.y + r.h - fy, W, fy + 1);
    if (r.x + r.w < W) edge(r.x + r.w, 0, r.x + r.w - fx, 0, r.x + r.w - fx, 0, fx + 1, H);
  }
  // what is on screen right now, so a click can fade from it and a resize can redraw it
  let shown = null;
  function show(img) { if (!usable(img)) return; shown = img; cover(img); }
  function drawIdle() {
    const t = transitions[cur], back = transitions[(cur + MODELS.length - 1) % MODELS.length];
    const img = (t.ok && t.first()) || (back.ok && back.last()) || null;
    if (usable(img)) show(img); else drawPlaceholder(cur, cur, 1);
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
    let swapped = false, last = null, done = false;
    const startImg = usable(shown) ? shown : null;
    const finish = () => {
      if (done) return;
      done = true; busy = false; cur = to;
      if (!swapped) { setInfo(to, true); info.classList.remove('out'); }
      root.classList.remove('is-moving', 'dir-next', 'dir-prev');
      root.style.setProperty('--run', 0);
      try { if (usable(last)) show(last); else drawIdle(); } catch { /* keep the UI alive no matter what */ }
    };
    const watchdog = setTimeout(finish, dur + 1500);   // never leave the switcher stuck "moving"
    const tick = now => {
      if (done) return;
      const k = Math.max(0, Math.min(1, (performance.now() - t0) / dur));
      const p = dir > 0 ? k : 1 - k;
      try {
        const fr = seq.ok && seq.at(p);
        if (fr && usable(fr.a)) {
          cover(fr.a, 1, fr.b, fr.t);
          const fade = 1 - (performance.now() - t0) / 250;
          if (startImg && startImg !== fr.a && fade > 0) cover(startImg, fade);
          last = k >= 1 ? (dir > 0 ? seq.last() : seq.first()) || fr.a : fr.a;
        } else drawPlaceholder(dir > 0 ? from : to, dir > 0 ? to : from, p);
      } catch { /* a bad frame must not stop the animation */ }
      root.style.setProperty('--run', k);
      if (!swapped && k > 0.55) { swapped = true; cur = to; setInfo(to, true); info.classList.remove('out'); }
      if (k < 1) requestAnimationFrame(tick);
      else { clearTimeout(watchdog); finish(); }
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
    else if (window.DerasPhone) transitions.forEach(t => t.unload());   // free memory once you scroll away
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
