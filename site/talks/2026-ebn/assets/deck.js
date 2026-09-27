/* =====================================================================
   Motor do deck + utilitários de gráfico + fundo animado da capa
   ===================================================================== */

/* ------------------------------ idioma ------------------------------
   O deck existe em duas cópias (index.html em português, en.html em inglês);
   o JS lê o idioma do <html lang> e escolhe textos e separador decimal. */
const LANG = document.documentElement.lang.startsWith('en') ? 'en' : 'pt';
const T = (pt, en) => (LANG === 'en' ? en : pt);
const DEC = T(',', '.');

/* ---------------------------- navegação ---------------------------- */
const Deck = (() => {
  const slides = [...document.querySelectorAll('.slide')];
  const stage = document.getElementById('stage');
  const bar = document.getElementById('bar');
  const counter = document.getElementById('counter');
  const notesBody = document.getElementById('notes-body');
  const help = document.getElementById('help');
  let index = 0, scale = 1;

  // rodapé padrão em todo slide de conteúdo
  const total = slides.length;
  slides.forEach((s, k) => {
    if (!s.classList.contains('content')) return;
    const f = document.createElement('div');
    f.className = 'foot';
    f.innerHTML = `<span>${T('Neutrinos em espaço-tempo curvo · II EBN', 'Neutrinos in curved spacetime · II EBN')}</span>
      <span class="parts"><span></span><span></span><span></span><span></span></span>
      <span>${String(k + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>`;
    s.appendChild(f);
  });

  function fit() {
    scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', scale);
    dispatchEvent(new CustomEvent('stagefit', { detail: scale }));
  }

  function show(i, push = true) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((el, k) => el.classList.toggle('active', k === index));
    bar.style.width = (100 * index / (slides.length - 1)) + '%';
    counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    const n = slides[index].querySelector('.notes');
    notesBody.textContent = n ? n.textContent.trim().replace(/\s+/g, ' ') : '—';
    if (push) history.replaceState(null, '', '#' + (index + 1));
    dispatchEvent(new CustomEvent('slidechange', { detail: { index, slide: slides[index] } }));
  }

  function overview(on) {
    document.body.classList.toggle('overview', on);
    if (on) slides[index].scrollIntoView({ block: 'center' });
    else fit();
    dispatchEvent(new CustomEvent('stagefit', { detail: scale }));
  }
  slides.forEach((s, k) => s.addEventListener('click', e => {
    if (!document.body.classList.contains('overview')) return;
    e.preventDefault(); overview(false); show(k);
  }, true));

  addEventListener('keydown', e => {
    const k = e.key;
    if (e.target.closest && e.target.closest('input, textarea, select, button')) {
      if (k === 'Escape') e.target.blur();
      if (e.target.type === 'range' || e.target.tagName !== 'BUTTON') return;
    }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(k)) { e.preventDefault(); show(index + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(k)) { e.preventDefault(); show(index - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k.toLowerCase() === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if (k.toLowerCase() === 'n') document.body.classList.toggle('show-notes');
    else if (k.toLowerCase() === 'o') overview(!document.body.classList.contains('overview'));
    else if (k === '?') help.classList.toggle('open');
    else if (k === 'Escape') { help.classList.remove('open'); document.body.classList.remove('show-notes'); overview(false); }
  });
  help.addEventListener('click', () => help.classList.remove('open'));

  // clique fora de controles devolve o foco ao deck (setas voltam a navegar)
  addEventListener('pointerup', e => {
    if (!e.target.closest('input, button, select')) document.activeElement?.blur?.();
  });

  let x0 = null;
  addEventListener('touchstart', e => { x0 = e.target.closest('input, canvas') ? null : e.changedTouches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 55) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
  // PT/EN: grava a escolha na mesma chave da página pessoal e mantém o slide atual
  document.querySelectorAll('.langsw a').forEach(a => a.addEventListener('click', () => {
    try { localStorage.setItem('rcrl-lang', a.dataset.setLang); } catch (e) { /* modo privado */ }
    a.href = a.getAttribute('href').split('#')[0] + location.hash;
  }));
  addEventListener('hashchange', () => show((parseInt(location.hash.slice(1)) || 1) - 1, false));
  addEventListener('resize', fit);

  return {
    start() { fit(); show((parseInt(location.hash.slice(1)) || 1) - 1, false); },
    show, slides,
    get index() { return index; },
    get scale() { return document.body.classList.contains('overview') ? 0.2 : scale; },
  };
})();

/* Registra um desenho que refaz quando o slide aparece ou o palco muda. */
function onSlide(el, draw) {
  const slide = el.closest('.slide');
  const go = () => { if (slide.classList.contains('active') || document.body.classList.contains('overview')) requestAnimationFrame(draw); };
  addEventListener('slidechange', go);
  addEventListener('stagefit', go);
  addEventListener('load', go);
  return go;
}

/* ------------------------ gráficos em canvas ------------------------ */
const COL = {
  e: '#9e8cff', mu: '#56e1d0', tau: '#ffb86b', text: '#eef0f6', text2: '#b3b9c9', text3: '#737b90',
  grid: 'rgba(255,255,255,.07)', axis: 'rgba(255,255,255,.28)', warn: '#ff7a8a', bg: '#07080e',
};
const FONT = '"Inter Tight", system-ui, sans-serif';
const SERIF = '"Instrument Serif", Georgia, serif';

function fitCanvas(cv) {
  const w = cv.clientWidth, h = cv.clientHeight;
  const r = Math.max(1, Math.min(3, Deck.scale * (devicePixelRatio || 1)));
  const W = Math.round(w * r), H = Math.round(h * r);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/* posição do mouse em px CSS do canvas (o palco está escalado) */
function canvasPoint(cv, ev) {
  const b = cv.getBoundingClientRect();
  return [(ev.clientX - b.left) / b.width * cv.clientWidth, (ev.clientY - b.top) / b.height * cv.clientHeight];
}

class Plot {
  constructor(cv, o) {
    this.cv = cv;
    this.o = Object.assign({ m: [34, 30, 78, 96], xlog: false, ylog: false, xticks: null, yticks: null, fs: 18 }, o);
  }
  begin() {
    const { ctx, w, h } = fitCanvas(this.cv);
    Object.assign(this, { ctx, w, h });
    const [t, r, b, l] = this.o.m;
    this.L = l; this.R = w - r; this.T = t; this.B = h - b;
    return this;
  }
  set(k, v) { this.o[k] = v; return this; }
  _t(v, log) { return log ? Math.log10(v) : v; }
  X(x) { const [a, b] = this.o.x, L = this._t(a, this.o.xlog), R = this._t(b, this.o.xlog); return this.L + (this._t(x, this.o.xlog) - L) / (R - L) * (this.R - this.L); }
  Y(y) { const [a, b] = this.o.y, L = this._t(a, this.o.ylog), R = this._t(b, this.o.ylog); return this.B - (this._t(y, this.o.ylog) - L) / (R - L) * (this.B - this.T); }
  invX(px) { const [a, b] = this.o.x, L = this._t(a, this.o.xlog), R = this._t(b, this.o.xlog); const v = L + (px - this.L) / (this.R - this.L) * (R - L); return this.o.xlog ? 10 ** v : v; }
  static ticks(a, b, log) {
    if (log) { const out = []; for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.log10(b) + 1e-9; e++) out.push(10 ** e); return out; }
    const span = b - a, raw = span / 6, p = 10 ** Math.floor(Math.log10(raw));
    const st = [1, 2, 2.5, 5, 10].map(m => m * p).find(s => span / s <= 7);
    const out = []; for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(10)); return out;
  }
  static fmt(v, log) {
    if (log) { const e = Math.round(Math.log10(v)); if (e >= -2 && e <= 3) return String(+v.toPrecision(3)); return '10' + String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? '⁻').join(''); }
    return String(+v.toPrecision(4)).replace('.', DEC);
  }
  frame(xlabel, ylabel) {
    const { ctx, o } = this;
    ctx.save();
    ctx.font = `${o.fs}px ${FONT}`;
    ctx.lineWidth = 1;
    const xt = o.xticks || Plot.ticks(o.x[0], o.x[1], o.xlog), yt = o.yticks || Plot.ticks(o.y[0], o.y[1], o.ylog);
    ctx.strokeStyle = COL.grid;
    xt.forEach(v => { const x = this.X(v); ctx.beginPath(); ctx.moveTo(x, this.T); ctx.lineTo(x, this.B); ctx.stroke(); });
    yt.forEach(v => { const y = this.Y(v); ctx.beginPath(); ctx.moveTo(this.L, y); ctx.lineTo(this.R, y); ctx.stroke(); });
    ctx.strokeStyle = COL.axis;
    ctx.beginPath(); ctx.moveTo(this.L, this.T); ctx.lineTo(this.L, this.B); ctx.lineTo(this.R, this.B); ctx.stroke();
    ctx.fillStyle = COL.text3;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    xt.forEach(v => ctx.fillText(o.xfmt ? o.xfmt(v) : Plot.fmt(v, o.xlog), this.X(v), this.B + 10));
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    yt.forEach(v => ctx.fillText(o.yfmt ? o.yfmt(v) : Plot.fmt(v, o.ylog), this.L - 12, this.Y(v)));
    ctx.fillStyle = COL.text2; ctx.font = `${o.fs + 1}px ${FONT}`;
    if (xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(xlabel, (this.L + this.R) / 2, this.h - 4); }
    if (ylabel) { ctx.save(); ctx.translate(20, (this.T + this.B) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(ylabel, 0, -8); ctx.restore(); }
    ctx.restore();
    return this;
  }
  clip() { const c = this.ctx; c.save(); c.beginPath(); c.rect(this.L, this.T, this.R - this.L, this.B - this.T); c.clip(); return this; }
  unclip() { this.ctx.restore(); return this; }
  path(xs, ys) {
    const c = this.ctx; c.beginPath(); let pen = false;
    for (let i = 0; i < xs.length; i++) {
      const y = ys[i]; if (!isFinite(y) || (this.o.ylog && y <= 0)) { pen = false; continue; }
      const X = this.X(xs[i]), Y = this.Y(y);
      pen ? c.lineTo(X, Y) : c.moveTo(X, Y); pen = true;
    }
    return c;
  }
  line(xs, ys, { color = COL.text, width = 2.5, dash = null, alpha = 1, glow = 0 } = {}) {
    const c = this.ctx; c.save();
    c.strokeStyle = color; c.lineWidth = width; c.globalAlpha = alpha; c.lineJoin = 'round'; c.lineCap = 'round';
    if (dash) c.setLineDash(dash);
    if (glow) { c.shadowColor = color; c.shadowBlur = glow; }
    this.path(xs, ys).stroke(); c.restore(); return this;
  }
  area(xs, ys, y0, { color = COL.e, alpha = .15 } = {}) {
    const c = this.ctx; c.save(); c.fillStyle = color; c.globalAlpha = alpha;
    this.path(xs, ys); c.lineTo(this.X(xs[xs.length - 1]), this.Y(y0)); c.lineTo(this.X(xs[0]), this.Y(y0)); c.closePath(); c.fill(); c.restore(); return this;
  }
  vline(x, { color = COL.text3, dash = [6, 6], width = 1.5, label = null, side = 'right', y = null } = {}) {
    const c = this.ctx, X = this.X(x); c.save(); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash);
    c.beginPath(); c.moveTo(X, this.T); c.lineTo(X, this.B); c.stroke();
    if (label) { c.setLineDash([]); c.fillStyle = color; c.font = `${this.o.fs}px ${FONT}`; c.textAlign = side === 'right' ? 'left' : 'right'; c.textBaseline = 'top'; c.fillText(label, X + (side === 'right' ? 8 : -8), y ?? this.T + 6); }
    c.restore(); return this;
  }
  hline(yv, { color = COL.text3, dash = [6, 6], width = 1.5, label = null, align = 'right' } = {}) {
    const c = this.ctx, Y = this.Y(yv); c.save(); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash);
    c.beginPath(); c.moveTo(this.L, Y); c.lineTo(this.R, Y); c.stroke();
    if (label) { c.setLineDash([]); c.fillStyle = color; c.font = `${this.o.fs}px ${FONT}`; c.textAlign = align; c.textBaseline = 'bottom'; c.fillText(label, align === 'right' ? this.R - 6 : this.L + 8, Y - 6); }
    c.restore(); return this;
  }
  text(x, y, s, { color = COL.text2, size = this.o.fs, align = 'left', base = 'middle', font = FONT, px = false } = {}) {
    const c = this.ctx; c.save(); c.fillStyle = color; c.font = `${size}px ${font}`; c.textAlign = align; c.textBaseline = base;
    c.fillText(s, px ? x : this.X(x), px ? y : this.Y(y)); c.restore(); return this;
  }
  dot(x, y, { color = COL.text, r = 6, glow = 14 } = {}) {
    const c = this.ctx; c.save(); c.fillStyle = color; c.shadowColor = color; c.shadowBlur = glow;
    c.beginPath(); c.arc(this.X(x), this.Y(y), r, 0, 7); c.fill(); c.restore(); return this;
  }
}

const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const logspace = (a, b, n) => linspace(Math.log10(a), Math.log10(b), n).map(v => 10 ** v);

/* liga um <input type=range> a um <output> e a um callback */
function bindRange(id, fmt, cb) {
  const el = document.getElementById(id), out = document.querySelector(`output[for="${id}"]`);
  const upd = () => { if (out) out.textContent = fmt(+el.value); cb(); };
  el.addEventListener('input', upd);
  if (out) out.textContent = fmt(+el.value);
  return () => +el.value;
}
function bindSeg(id, cb) {
  const el = document.getElementById(id); let val = el.querySelector('.on')?.dataset.v;
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); val = b.dataset.v; cb();
  });
  return () => val;
}

/* ------------------ capa: poço + neutrinos (ilustração) ------------------ */
(() => {
  const cv = document.getElementById('spacetime');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const slide = cv.closest('.slide');
  const W = 1920, H = 1080;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const R = 4.8, A = 0.9, a = 0.5;
  const zOf = r => A / Math.sqrt(r * r + a * a) - A / Math.sqrt(R * R + a * a);
  const CX = 1370, CY = 440, SC = 200, TILT = 0.95, PERSP = 11;
  function project(X, Y) {
    const r = Math.hypot(X, Y);
    const f = PERSP / (PERSP - Y * Math.sin(TILT));
    return [CX + X * SC * f, CY + (Y * Math.cos(TILT) + zOf(r) * Math.sin(TILT) * 1.15) * SC * f, r];
  }
  const flav = [[158, 140, 255], [86, 225, 208], [255, 184, 107]];
  function flavour(phi) {
    const t = ((phi / (2 * Math.PI)) * 3 % 3 + 3) % 3;
    const k = Math.floor(t), u = t - k, s = u * u * (3 - 2 * u);
    const c0 = flav[k], c1 = flav[(k + 1) % 3];
    return [0, 1, 2].map(j => Math.round(c0[j] + (c1[j] - c0[j]) * s));
  }

  let grid = null, ratio = 1;
  function resize() {
    ratio = Math.max(1, Math.min(2.5, Deck.scale * (devicePixelRatio || 1)));
    cv.width = Math.round(W * ratio); cv.height = Math.round(H * ratio);
    grid = document.createElement('canvas');
    grid.width = cv.width; grid.height = cv.height;
    drawGrid(grid.getContext('2d'));
  }
  function drawGrid(g) {
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.lineWidth = 1.1;
    const N = 34, step = 2 * R / N, sub = 90;
    const line = pts => {
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0, r0] = pts[i - 1], [x1, y1] = pts[i];
        const edge = Math.max(0, 1 - Math.pow(r0 / R, 3)), deep = Math.max(0, 1 - r0 / 1.6);
        const al = 0.05 + 0.26 * edge + 0.25 * deep;
        g.strokeStyle = `rgba(${Math.round(158 - 72 * deep)},${Math.round(140 + 85 * deep)},${Math.round(255 - 47 * deep)},${al})`;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
    };
    for (let i = 0; i <= N; i++) {
      const c = -R + i * step, h = [], v = [];
      for (let j = 0; j <= sub; j++) {
        const t = -R + j * 2 * R / sub;
        if (Math.hypot(c, t) <= R) { h.push(project(t, c)); v.push(project(c, t)); }
      }
      line(h); line(v);
    }
    const [bx, by] = project(0, 0);
    const glow = g.createRadialGradient(bx, by, 0, bx, by, 190);
    glow.addColorStop(0, 'rgba(86,225,208,.22)'); glow.addColorStop(.35, 'rgba(158,140,255,.10)'); glow.addColorStop(1, 'rgba(158,140,255,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(bx, by, 190, 0, 7); g.fill();
    g.fillStyle = '#05060b';
    g.beginPath(); g.ellipse(bx, by, 34, 34 * Math.cos(TILT) * 1.3, 0, 0, 7); g.fill();
    g.lineWidth = 2; g.strokeStyle = 'rgba(214,206,255,.75)'; g.shadowColor = '#9e8cff'; g.shadowBlur = 22;
    g.beginPath(); g.ellipse(bx, by, 38, 38 * Math.cos(TILT) * 1.3, 0, 0, 7); g.stroke();
    g.shadowBlur = 0;
  }

  // Neutrinos: desviados pelo poço; a fase avança mais devagar onde o
  // potencial é fundo (fator de lapso), então as cores "atrasam" perto do centro.
  const TRAIL = 110, parts = [];
  function spawn(pre) {
    const p = { X: -R * 0.62, Y: (Math.random() * 2 - 1) * 2.9, age: 0, vx: 1, vy: (Math.random() - .5) * 0.08,
                phi: Math.random() * 6.28, trail: [], w: 0.75 + Math.random() * 0.5, alive: true };
    if (pre) { p.X = -R * 0.62 + Math.random() * 1.5 * R; p.age = 2; }
    parts.push(p);
  }
  for (let i = 0; i < 13; i++) spawn(true);
  const K = 1.25, SPEED = 0.62, OMEGA = 2.2;
  function advance(p, dt) {
    const r2 = p.X * p.X + p.Y * p.Y, r = Math.sqrt(r2), acc = K / (r2 + 0.09);
    p.vx -= acc * p.X / (r + 1e-6) * dt; p.vy -= acc * p.Y / (r + 1e-6) * dt;
    const v = Math.hypot(p.vx, p.vy); p.vx /= v; p.vy /= v;
    p.X += p.vx * SPEED * dt; p.Y += p.vy * SPEED * dt;
    const lapse = Math.sqrt(Math.max(0.08, 1 - 0.55 / Math.sqrt(r2 + 0.12)));
    p.phi += OMEGA * p.w * lapse * dt; p.age += dt;
    if (r < 0.22 || r > R + 0.6) p.alive = false;
  }
  function frame(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(grid, 0, 0);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const p of parts) {
      if (p.alive) {
        for (let s = 0; s < 3; s++) advance(p, dt / 3);
        const [x, y, r] = project(p.X, p.Y);
        p.trail.push([x, y, flavour(p.phi), Math.max(r, R + 0.2 - Math.min(1, p.age / 1.2) / 1.2)]);
      }
      if (p.trail.length > TRAIL || (!p.alive && p.trail.length)) p.trail.shift();
      const tr = p.trail;
      for (let i = 1; i < tr.length; i++) {
        const t = i / tr.length, c = tr[i][2], fade = Math.min(1, (R + 0.2 - tr[i][3]) * 1.2);
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(t * t * .85 * fade).toFixed(3)})`;
        ctx.lineWidth = 0.8 + 2.4 * t;
        ctx.beginPath(); ctx.moveTo(tr[i - 1][0], tr[i - 1][1]); ctx.lineTo(tr[i][0], tr[i][1]); ctx.stroke();
      }
      if (p.alive && tr.length) {
        const [x, y, c, r] = tr[tr.length - 1], fade = Math.max(0, Math.min(1, (R + 0.2 - r) * 1.2));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
        g.addColorStop(0, `rgba(255,255,255,${.9 * fade})`); g.addColorStop(.25, `rgba(${c[0]},${c[1]},${c[2]},${.8 * fade})`); g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = parts.length - 1; i >= 0; i--) if (!parts[i].alive && !parts[i].trail.length) { parts.splice(i, 1); spawn(false); }
  }
  let last = 0, raf = 0;
  function loop(t) { const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t; frame(dt); raf = requestAnimationFrame(loop); }
  function run() {
    cancelAnimationFrame(raf);
    if (!slide.classList.contains('active') && !document.body.classList.contains('overview')) return;
    if (reduce || document.body.classList.contains('overview')) { for (let i = 0; i < 160; i++) frame(0.03); return; }
    last = performance.now(); raf = requestAnimationFrame(loop);
  }
  addEventListener('stagefit', () => { resize(); run(); });
  addEventListener('slidechange', run);
})();
