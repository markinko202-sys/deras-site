// Scroll-scrubbed scenes: each .scene pins a canvas and maps scroll progress to a frame.
// Real footage = JPG frame sequence in media/<scene>/{d,m,p}/0001.jpg, listed in media/manifest.js (see tools/prep.sh).
// Classic scripts, no ES modules, so the page also works when opened straight from disk.
// Until footage exists, a procedural placeholder is drawn so the page still reads.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// phones: lower canvas resolution, the light frame sets, and only nearby scenes kept in memory
const PHONE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
const DPR = Math.min(window.devicePixelRatio || 1, PHONE ? 1.25 : 2);
// the whole frame is always shown on narrow screens, so phones only need the light landscape set
function pickSet(man) {
  return (PHONE || innerWidth < 900) && man.sets.includes('m') ? 'm' : 'd';
}
window.DerasPhone = PHONE;

// ---- the phone "camera": on a vertical screen we cut a moving window out of the landscape footage.
// It follows the car (tools/track.py measured where it is in every frame) and zooms so the whole
// car fits; per-scene "tight" keys push in to a full-height shot for drama, then pull back.
const CAMERA = {                         // [progress, tightness]: 0 = whole car, 1 = full screen height
  '01-reveal': [[0, 1], [0.5, 1], [0.84, 0]],
  '02-design': [[0, 1], [0.38, 1], [0.86, 0.05]],
  '03-rear':   [[0, 0], [1, 0]],
  '04-cabin':  [[0, 1], [0.72, 1], [0.9, 0.2]],
};
const ease = t => t * t * (3 - 2 * t);
function keyed(keys, p) {
  if (!keys) return 0;
  if (p <= keys[0][0]) return keys[0][1];
  for (let k = 1; k < keys.length; k++) {
    if (p <= keys[k][0]) { const [p0, v0] = keys[k - 1], [p1, v1] = keys[k]; return v0 + (v1 - v0) * ease((p - p0) / (p1 - p0)); }
  }
  return keys[keys.length - 1][1];
}
function sample(arr, f) {
  if (!arr) return null;
  const i = Math.max(0, Math.min(arr.length - 1, f)), a = Math.floor(i), b = Math.min(arr.length - 1, a + 1);
  return arr[a] + (arr[b] - arr[a]) * (i - a);
}
// returns a fit function for drawBlend, or null to use the default (landscape screens)
function phoneCamera(scene, f, p) {
  return (img, W, H) => {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (W / H > 0.95 || !scene.track) return window.DerasFrames.fitRect(img, W, H);
    const tr = scene.track, n = scene.count, ti = f * ((tr.fx.length - 1) / Math.max(1, n - 1));
    const minVw = (W / H) / (iw / ih);                            // the window when the frame fills the screen height
    const span = sample(tr.x1, ti) - sample(tr.x0, ti);
    const fitVw = Math.min(1, Math.max(minVw, span * 1.14 + 0.05)); // the whole car plus a little air
    let vw = fitVw + (minVw - fitVw) * keyed(CAMERA[scene.name], p);
    // the outro: once the animation has played, pull back to the WHOLE final frame, dead centre
    const out = ease(Math.min(1, Math.max(0, (p - 0.8) / 0.17)));
    vw += (1 - vw) * out;
    const s = W / (iw * vw), w = iw * s, h = ih * s;
    let x = W / 2 - sample(tr.fx, ti) * w;
    x = Math.min(0, Math.max(W - w, x));                          // never show past the frame edge
    x += ((W - w) / 2 - x) * out;
    const y = (H - h) / 2 - (H - h) * 0.12 * (1 - out);           // a little above centre while playing, centred at the end
    return { x, y, w, h, contain: h < H - 1 };
  };
}
window.DerasPickSet = pickSet;

class Scene {
  constructor(el) {
    this.el = el;
    this.name = el.dataset.scene;
    this.mode = el.dataset.mode;
    this.el.style.setProperty('--len', el.dataset.len || 400);
    this.canvas = el.querySelector('.scene-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.fr = el.querySelector('.fr');
    this.beats = [...el.querySelectorAll('[data-in]')];
    this.target = 0;
    this.p = 0;
    this.store = null;        // DerasFrames.FrameStore
    this.count = 0;
    this.dirty = true;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.W = Math.max(1, Math.round(r.width * DPR));
    this.H = Math.max(1, Math.round(r.height * DPR));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.dirty = true;
  }

  measure() {
    const r = this.el.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    this.target = clamp(-r.top / span);
    this.visible = r.bottom > 0 && r.top < window.innerHeight;
  }

  load() {
    if (this.store) return;
    // manifest comes from media/manifest.js (a plain script, so it also works when opened as file://)
    const man = (window.DERAS_MEDIA || {})[this.name];
    if (!man) return;
    const set = pickSet(man);
    const n = (man.counts && man.counts[set]) || man.frames;
    this.count = n;
    this.track = man.track || null;
    this.store = new window.DerasFrames.FrameStore(`media/${this.name}/${set}`, n, man.ext || 'jpg', { phone: PHONE, workers: PHONE ? 4 : 6 });
    this.store.onFrame = () => { this.dirty = true; };
    this.store.start([Math.round(this.target * (n - 1))]);
  }

  // drop the frames of a scene far from the screen (phones only) — it reloads when you come back
  unload() {
    if (!this.store) return;
    this.store.dispose(); this.store = null; this.dirty = true;
  }

  tick(now) {
    // frame-rate independent smoothing: the same glide on 60 Hz and 120 Hz screens
    const dt = Math.min(0.05, ((now - (this.lastNow || now)) / 1000) || 0.016); this.lastNow = now;
    const k = 1 - Math.exp(-dt * 11);
    this.p = Math.abs(this.target - this.p) < 0.0004 ? this.target : this.p + (this.target - this.p) * k;
    const p = this.p;

    for (const b of this.beats) {
      const on = p >= +b.dataset.in && p < +b.dataset.out;
      if (on !== b._on) { b._on = on; b.classList.toggle('on', on); }
    }

    const st = this.store;
    if (st && st.loaded > 0) {
      const f = p * (this.count - 1), i = Math.floor(f), t = f - i;
      st.focus(Math.round(f));
      if (this.fr) this.fr.textContent = `FR ${String(Math.round(f) + 1).padStart(3, '0')} / ${this.count}`;
      if (p === this.lastP && !this.dirty) return;          // nothing moved, nothing new decoded
      const a = st.get(i) || st.nearest(i);
      if (!a) return;
      const b = st.get(i + 1);                                // blend toward the next frame between whole frames
      this.lastP = p; this.dirty = false;
      this.prepare();
      window.DerasFrames.drawBlend(this.ctx, this.W, this.H, a, b, a === st.get(i) ? t : 0, phoneCamera(this, f, p));
    } else {
      if (this.fr) this.fr.textContent = `FR ${String(Math.round(p * 179) + 1).padStart(3, '0')} · loading`;
      placeholder[this.mode]?.(this.ctx, this.W, this.H, p, now / 1000);
    }
  }

  // the placeholder may have left a car-space transform / glow behind
  prepare() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.imageSmoothingQuality = 'high';
  }


}

/* ------------------------------------------------------------------ */
/* Procedural placeholders — a coupe silhouette in unit coordinates.   */
/* x: -0.5 (tail) … 0.5 (nose), y: 0 = ground, negative = up.          */
/* ------------------------------------------------------------------ */

function bodyPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.49, -0.06);
  ctx.lineTo(-0.50, -0.13);
  ctx.quadraticCurveTo(-0.50, -0.175, -0.45, -0.185);
  ctx.quadraticCurveTo(-0.28, -0.295, -0.08, -0.300);
  ctx.quadraticCurveTo(0.05, -0.300, 0.14, -0.225);
  ctx.quadraticCurveTo(0.32, -0.200, 0.47, -0.150);
  ctx.quadraticCurveTo(0.505, -0.13, 0.50, -0.085);
  ctx.lineTo(0.48, -0.05);
  ctx.lineTo(0.41, -0.05);
  ctx.arc(0.31, -0.07, 0.095, -0.2, Math.PI + 0.2, true);
  ctx.lineTo(-0.215, -0.05);
  ctx.arc(-0.31, -0.07, 0.095, -0.2, Math.PI + 0.2, true);
  ctx.closePath();
}
function glassPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.38, -0.2);
  ctx.quadraticCurveTo(-0.24, -0.278, -0.08, -0.283);
  ctx.quadraticCurveTo(0.03, -0.283, 0.105, -0.222);
  ctx.lineTo(-0.38, -0.2);
}
function wheel(ctx, x, spin = 0) {
  ctx.beginPath(); ctx.arc(x, -0.07, 0.078, 0, Math.PI * 2);
  ctx.moveTo(x + 0.05, -0.07); ctx.arc(x, -0.07, 0.05, 0, Math.PI * 2);
  for (let k = 0; k < 10; k++) {
    const a = spin + k * Math.PI / 5;
    ctx.moveTo(x + Math.cos(a) * 0.016, -0.07 + Math.sin(a) * 0.016);
    ctx.lineTo(x + Math.cos(a) * 0.05, -0.07 + Math.sin(a) * 0.05);
  }
}

function frame(ctx, W, H, bg) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
}
// place car: unit length = k px, ground at gy
function carSpace(ctx, W, H, scale = 1, dx = 0, sx = 1) {
  const k = Math.min(W * 0.78, H * 1.9) * scale;
  const gy = H * 0.66;
  ctx.setTransform(k * sx, 0, 0, k, W / 2 + dx * k, gy);
  return k;
}
function floor(ctx, W, H, glow, color = '184,146,90') {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H * 0.67, 0, W / 2, H * 0.67, W * 0.55);
  g.addColorStop(0, `rgba(${color},${0.16 * glow})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.5, W, H * 0.5);
}

const placeholder = {
  // 01 — car emerges from black as a light blade sweeps across
  reveal(ctx, W, H, p, t) {
    frame(ctx, W, H, '#070706');
    const lit = smooth(0.05, 0.9, p);
    floor(ctx, W, H, lit);
    const k = carSpace(ctx, W, H, 0.92 + p * 0.1);
    const sweep = lerp(-0.75, 0.75, smooth(0.08, 0.78, p));

    bodyPath(ctx); ctx.fillStyle = '#0c0c0b'; ctx.fill();
    ctx.save(); bodyPath(ctx); ctx.clip();
    const g = ctx.createLinearGradient(sweep - 0.18, 0, sweep + 0.18, 0);
    g.addColorStop(0, 'rgba(233,228,216,0)');
    g.addColorStop(0.5, `rgba(233,228,216,${0.22 * (1 - smooth(0.8, 1, p))})`);
    g.addColorStop(1, 'rgba(233,228,216,0)');
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 1.2);
    ctx.restore();

    const edge = ctx.createLinearGradient(-0.55, 0, 0.55, 0);
    const s = clamp((sweep + 0.55) / 1.1);
    edge.addColorStop(0, `rgba(214,178,122,${0.2 + lit * 0.6})`);
    edge.addColorStop(clamp(s - 0.08), `rgba(233,228,216,${0.15 + lit * 0.55})`);
    edge.addColorStop(s, 'rgba(255,250,240,1)');
    edge.addColorStop(clamp(s + 0.06), 'rgba(233,228,216,0.04)');
    edge.addColorStop(1, 'rgba(233,228,216,0.02)');
    ctx.lineWidth = 1.4 / k; ctx.strokeStyle = edge;
    bodyPath(ctx); ctx.stroke();
    glassPath(ctx); ctx.stroke();
    wheel(ctx, 0.31); wheel(ctx, -0.31); ctx.stroke();

    const bar = smooth(0.82, 0.96, p);
    if (bar > 0) {
      ctx.lineWidth = 3 / k; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255,245,225,.9)'; ctx.shadowBlur = 24 * bar;
      ctx.strokeStyle = `rgba(255,248,235,${bar})`;
      ctx.beginPath(); ctx.moveTo(0.43, -0.148); ctx.lineTo(0.495, -0.118); ctx.stroke();
      ctx.strokeStyle = `rgba(200,40,40,${bar})`; ctx.shadowColor = 'rgba(200,40,40,.9)';
      ctx.beginPath(); ctx.moveTo(-0.499, -0.14); ctx.lineTo(-0.47, -0.178); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },

  // 02 — rain, camera push, one lightning strike
  monsoon(ctx, W, H, p, t) {
    const flash = Math.max(0, 1 - Math.abs(p - 0.5) / 0.025) + Math.max(0, 1 - Math.abs(p - 0.535) / 0.012) * 0.6;
    const bgL = 7 + flash * 40;
    frame(ctx, W, H, `rgb(${bgL},${bgL + 1},${bgL + 3})`);
    floor(ctx, W, H, 0.6 + flash, '150,170,190');
    const k = carSpace(ctx, W, H, 0.8 + smooth(0, 1, p) * 0.45, lerp(0.05, -0.08, p));
    bodyPath(ctx); ctx.fillStyle = '#0a0b0c'; ctx.fill();
    ctx.lineWidth = 1.3 / k;
    ctx.strokeStyle = `rgba(190,205,220,${0.35 + flash * 0.6})`;
    bodyPath(ctx); ctx.stroke(); glassPath(ctx); ctx.stroke();
    wheel(ctx, 0.31, t * 0.3); wheel(ctx, -0.31, t * 0.3); ctx.stroke();
    ctx.lineWidth = 3 / k; ctx.strokeStyle = '#fff6e6'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(0.43, -0.148); ctx.lineTo(0.495, -0.118); ctx.stroke(); ctx.shadowBlur = 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const n = Math.round(260 * (0.5 + smooth(0, 0.3, p)));
    ctx.strokeStyle = 'rgba(200,215,230,.28)'; ctx.lineWidth = 1 * DPR;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const rx = (Math.sin(i * 127.1) * 43758.5453) % 1, ry = (Math.sin(i * 311.7) * 12543.13) % 1;
      const x = Math.abs(rx) * W, len = (18 + Math.abs(ry) * 34) * DPR;
      const y = ((Math.abs(ry) * H + t * (900 + Math.abs(rx) * 500) * DPR + p * H * 3) % (H + len)) - len;
      ctx.moveTo(x, y); ctx.lineTo(x - len * 0.12, y + len);
    }
    ctx.stroke();
  },

  // 03 — blueprint explode and reassemble
  anatomy(ctx, W, H, p) {
    frame(ctx, W, H, '#080807');
    ctx.strokeStyle = 'rgba(184,146,90,.07)'; ctx.lineWidth = 1;
    const step = 48 * DPR;
    ctx.beginPath();
    for (let x = (W / 2) % step; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = (H / 2) % step; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    const e = smooth(0.12, 0.5, p) * (1 - smooth(0.86, 1, p));
    const k = carSpace(ctx, W, H, 0.85);
    ctx.lineWidth = 1.2 / k;
    const brass = 'rgba(214,178,122,.9)', bone = 'rgba(233,228,216,.8)';

    ctx.save(); ctx.translate(0, -0.2 * e);
    ctx.strokeStyle = bone; glassPath(ctx); ctx.stroke();
    ctx.restore();

    ctx.save(); ctx.translate(0, -0.1 * e);
    ctx.strokeStyle = bone; bodyPath(ctx); ctx.stroke();
    ctx.restore();

    // battery slab + motors appear from inside
    ctx.save(); ctx.translate(0, 0.06 * e); ctx.globalAlpha = e;
    ctx.strokeStyle = brass; ctx.strokeRect(-0.26, -0.075, 0.46, 0.03);
    for (let i = -0.24; i < 0.2; i += 0.046) ctx.strokeRect(i, -0.072, 0.04, 0.024);
    ctx.beginPath(); ctx.arc(0.31, -0.07, 0.03, 0, 7); ctx.moveTo(-0.28, -0.07); ctx.arc(-0.31, -0.07, 0.03, 0, 7); ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = bone;
    ctx.save(); ctx.translate(0.08 * e, 0.07 * e); wheel(ctx, 0.31); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(-0.08 * e, 0.07 * e); wheel(ctx, -0.31); ctx.stroke(); ctx.restore();
  },

  // 04 — turntable under a single spotlight
  orbit(ctx, W, H, p) {
    frame(ctx, W, H, '#070706');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cone = ctx.createRadialGradient(W / 2, -H * 0.2, 0, W / 2, -H * 0.2, H * 1.1);
    cone.addColorStop(0, 'rgba(233,228,216,.14)'); cone.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cone; ctx.fillRect(0, 0, W, H);
    floor(ctx, W, H, 1);
    const c = Math.cos(p * Math.PI * 1.5);
    const sx = Math.sign(c || 1) * Math.max(Math.abs(c), 0.22);
    const k = carSpace(ctx, W, H, 0.9, 0, sx);
    bodyPath(ctx); ctx.fillStyle = '#0d0c0b'; ctx.fill();
    // songket etch on the nose
    ctx.save(); bodyPath(ctx); ctx.clip();
    ctx.strokeStyle = 'rgba(184,146,90,.55)'; ctx.lineWidth = 1 / k;
    ctx.beginPath();
    for (let x = 0.36; x < 0.5; x += 0.014) { ctx.moveTo(x, -0.06); ctx.lineTo(x + 0.007, -0.11); ctx.lineTo(x + 0.014, -0.06); }
    ctx.stroke(); ctx.restore();
    ctx.lineWidth = 1.3 / Math.abs(k * sx);
    ctx.strokeStyle = `rgba(233,228,216,${0.5 + 0.4 * Math.abs(c)})`;
    bodyPath(ctx); ctx.stroke(); glassPath(ctx); ctx.stroke();
    wheel(ctx, 0.31); wheel(ctx, -0.31); ctx.stroke();
  },

  // 05 — headlights approach out of the dark, then settle to a warm haze
  lights(ctx, W, H, p, t) {
    frame(ctx, W, H, '#060605');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const a = smooth(0, 0.6, p);
    const gap = lerp(0.03, 0.42, a * a) * W;
    const y = H * lerp(0.58, 0.55, a);
    const r = lerp(6, 90, a * a) * DPR;
    const dim = 1 - smooth(0.62, 0.95, p) * 0.75;
    for (const s of [-1, 1]) {
      const x = W / 2 + (s * gap) / 2;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
      g.addColorStop(0, `rgba(255,250,240,${dim})`);
      g.addColorStop(0.08, `rgba(255,236,205,${0.8 * dim})`);
      g.addColorStop(0.4, `rgba(214,178,122,${0.18 * dim})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
      ctx.strokeStyle = `rgba(255,245,230,${0.25 * dim * a})`; ctx.lineWidth = 1.5 * DPR;
      ctx.beginPath(); ctx.moveTo(x - r * 8, y); ctx.lineTo(x + r * 8, y); ctx.stroke();
    }
    const bloom = smooth(0.45, 0.62, p) * (1 - smooth(0.62, 0.85, p));
    if (bloom > 0) { ctx.fillStyle = `rgba(245,232,210,${bloom * 0.55})`; ctx.fillRect(0, 0, W, H); }
    const haze = smooth(0.6, 1, p);
    const hz = ctx.createLinearGradient(0, H, 0, H * 0.3);
    hz.addColorStop(0, `rgba(184,146,90,${0.16 * haze})`); hz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
  },
};
window.DerasScene = Scene;
window.DerasPlaceholder = placeholder;
window.DerasDraw = { bodyPath, glassPath, wheel, frame, carSpace, floor };
