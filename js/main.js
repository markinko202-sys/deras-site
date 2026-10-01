const scenes = [...document.querySelectorAll('.scene')].map(el => new window.DerasScene(el));
const bar = document.getElementById('progress-bar');
const nav = document.getElementById('nav');

// start loading footage when a scene is ~1.5 screens away
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) scenes.find(s => s.el === e.target)?.load();
}, { rootMargin: '150% 0px' });
scenes.forEach(s => io.observe(s.el));

let lastY = window.scrollY;
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  nav.classList.toggle('hide', y > lastY && y > 200);
  lastY = y;
  scenes.forEach(s => s.measure());
  // phones: free scenes that are far off screen; they reload as you scroll back (preloaded 1.5 screens ahead)
  if (window.DerasPhone) for (const s of scenes) {
    const r = s.el.getBoundingClientRect(), far = innerHeight * 2.6;
    if (r.bottom < -far || r.top > innerHeight + far) s.unload();
  }
}
window.addEventListener('scroll', onScroll, { passive: true });

let rw = window.innerWidth;
window.addEventListener('resize', () => {
  // ignore mobile URL-bar height jitter, only react to real resizes
  if (Math.abs(window.innerWidth - rw) < 2 && window.matchMedia('(pointer: coarse)').matches) return;
  rw = window.innerWidth;
  scenes.forEach(s => s.resize());
  onScroll();
});
onScroll();

function loop(now) {
  for (const s of scenes) if (s.visible) s.tick(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// counters
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const countIO = new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    countIO.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = to.toFixed(dec); continue; }
    const t0 = performance.now(), dur = 1600;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), v = to * (1 - Math.pow(1 - k, 4));
      el.textContent = v.toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach(el => countIO.observe(el));

// model photos: swap in if the file exists
document.querySelectorAll('.model[data-img]').forEach(card => {
  const img = new Image();
  img.alt = `DERAS ${card.querySelector('h3').textContent}`;
  img.loading = 'lazy';
  img.onload = () => card.querySelector('.model-img').replaceChildren(img);
  img.src = card.dataset.img;
});

// viewing form (concept — no backend)
const form = document.getElementById('viewing-form');
form.addEventListener('submit', e => {
  e.preventDefault();
  const note = form.querySelector('.form-note');
  const bad = [...form.querySelectorAll('input')].find(i => !i.checkValidity());
  if (bad) { note.textContent = bad.name === 'email' ? 'Please enter a valid email.' : 'Please tell us your name.'; bad.focus(); return; }
  note.textContent = `Terima kasih, ${form.elements.name.value.split(' ')[0]}. A slot for the ${form.elements.model.value} is being held — we'll write within 48 hours.`;
  form.reset();
});
