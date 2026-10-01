// Frame storage for the scroll-scrubbed footage.
// · Desktop: every frame becomes a decoded <img> (plenty of memory, zero decode latency).
// · Phones: frames are kept as small compressed JPEG blobs; only the ~30 frames around the current
//   position are decoded (createImageBitmap, off the main thread) and the oldest are released.
//   That gives phones every frame at full sharpness for a few MB of decoded memory instead of hundreds.
(function () {
  const canBitmap = typeof createImageBitmap === 'function';

  class FrameStore {
    constructor(baseUrl, count, ext, { phone = false, workers = 4, keep = 30, pin = [] } = {}) {
      this.pin = new Set(pin);              // frames never released (e.g. idle poses)
      this.url = i => `${baseUrl}/${String(i + 1).padStart(4, '0')}.${ext}`;
      this.count = count;
      this.lazy = phone && canBitmap;
      this.workers = workers; this.keep = keep;
      this.blobs = new Array(count);       // lazy mode: compressed bytes
      this.ready = new Array(count);       // drawable frames (img or ImageBitmap)
      this.lru = [];                       // lazy mode: decoded indices, oldest first
      this.decoding = new Set(); this.want = -1; this.dir = 1;
      this.alive = true; this.loaded = 0;
      this.onFrame = null;
    }

    // fetch in coarse → fine order so scrubbing works long before everything has arrived
    start(firstIdx = []) {
      const n = this.count, order = [], seen = new Set();
      for (const i of firstIdx) if (i >= 0 && i < n && !seen.has(i)) { seen.add(i); order.push(i); }
      for (const step of [24, 8, 4, 2, 1]) for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
      let cursor = 0;
      const worker = async () => {
        while (this.alive && cursor < order.length) {
          const i = order[cursor++];
          try {
            if (this.lazy) {
              const res = await fetch(this.url(i));
              if (!res.ok) continue;
              this.blobs[i] = await res.blob();
              this.loaded++;
              if (this.pin.has(i)) this.decode(i, true);         // idle poses: decode right away
              else if (Math.abs(i - this.want) < 3) this.pump();  // the frame you are looking at just arrived
            } else {
              const img = new Image(); img.decoding = 'async'; img.src = this.url(i);
              await img.decode();
              if (!this.alive) return;
              this.ready[i] = img; this.loaded++;
              this.onFrame?.(i);
            }
          } catch { /* skip a broken frame; neighbours cover it */ }
        }
      };
      for (let k = 0; k < this.workers; k++) worker();
    }

    // tell the store which frame is on screen; in lazy mode this drives decoding around it
    focus(i) {
      i = Math.max(0, Math.min(this.count - 1, i | 0));
      if (i !== this.want) { this.dir = i >= this.want ? 1 : -1; this.want = i; }
      if (this.lazy) this.pump();
    }

    pump() {
      if (!this.alive || !this.lazy || this.want < 0) return;
      // decode the frame on screen first, then a window ahead in the scroll direction (and a little behind)
      const plan = [0, 1, 2, 3, 4, 5, 6, 7, -1, 8, 9, 10, -2, 11, 12, -3, 13, 14, 15, -4].map(d => this.want + d * this.dir);
      for (const i of plan) {
        if (this.decoding.size >= 2) break;
        this.decode(i);
      }
    }

    decode(i, force = false) {
      if (i < 0 || i >= this.count || this.ready[i] || this.decoding.has(i) || !this.blobs[i]) return;
      if (!force && this.decoding.size >= 2) return;
      this.decoding.add(i);
      createImageBitmap(this.blobs[i]).then(bmp => {
        this.decoding.delete(i);
        if (!this.alive) { bmp.close?.(); return; }
        this.ready[i] = bmp; if (!this.pin.has(i)) this.lru.push(i);
        while (this.lru.length > this.keep) {           // forget the frame furthest from the view
          let far = 0;
          for (let k = 1; k < this.lru.length; k++) if (Math.abs(this.lru[k] - this.want) > Math.abs(this.lru[far] - this.want)) far = k;
          const j = this.lru.splice(far, 1)[0];
          this.ready[j]?.close?.(); this.ready[j] = undefined;
        }
        this.onFrame?.(i);
        this.pump();
      }, () => { this.decoding.delete(i); });
    }

    get(i) { return this.ready[i] || null; }
    nearest(i) {
      for (let d = 0; d < this.count; d++) {
        if (this.ready[i - d]) return this.ready[i - d];
        if (this.ready[i + d]) return this.ready[i + d];
      }
      return null;
    }
    get any() { return this.ready.some(Boolean); }

    dispose() {
      this.alive = false;
      for (const f of this.ready) f?.close?.();
      this.ready = []; this.blobs = []; this.lru = [];
    }
  }

  // draw a frame "cover"-fitted, optionally blended with the next one for in-between scroll positions
  function drawBlend(ctx, W, H, a, b, t, place) {
    const r = place ? place(a) : coverRect(a, W, H);
    ctx.globalAlpha = 1;
    ctx.drawImage(a, r.x, r.y, r.w, r.h);
    if (b && t > 0.02) { ctx.globalAlpha = t; ctx.drawImage(b, r.x, r.y, r.w, r.h); ctx.globalAlpha = 1; }
  }
  function coverRect(img, W, H) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const s = Math.max(W / iw, H / ih);
    return { x: (W - iw * s) / 2, y: (H - ih * s) / 2, w: iw * s, h: ih * s };
  }

  window.DerasFrames = { FrameStore, drawBlend, coverRect };
})();
