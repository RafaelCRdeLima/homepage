/* =====================================================================
   Motor do deck + utilitários de gráfico + fundo animado da capa
   (o motor é o mesmo dos seminários “Neutrinos em espaço-tempo curvo” e “Do nascimento à morte das estrelas”)
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

  // ?ff=N (testes e PDF): sem transição entre slides nem animação de entrada, para a captura sair pronta
  if (new URLSearchParams(location.search).has('ff')) document.body.classList.add('nofx');

  // rodapé padrão em todo slide de conteúdo
  const total = slides.length;
  slides.forEach((s, k) => {
    if (!s.classList.contains('content')) return;
    const f = document.createElement('div');
    f.className = 'foot';
    f.innerHTML = `<span>${T('SCARLET · inelasticidade e composição', 'SCARLET · inelasticity and composition')}</span>
      <span class="parts"><span></span><span></span><span></span><span></span></span>
      <span>${String(k + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>`;
    s.appendChild(f);
  });

  /* Parte IV: cada artigo é um bloco de slides (data-paper="n" em todos, data-ref no primeiro). O primeiro ganha
     faixa e selo, com o número do artigo e a referência curta; todos levam no rodapé “artigo n/N · k de m”,
     para saber onde termina um artigo e começa o outro. */
  const papers = new Map();
  slides.forEach(s => { const n = +s.dataset.paper; if (n) (papers.get(n) || papers.set(n, []).get(n)).push(s); });
  papers.forEach((list, n) => list.forEach((s, k) => {
    if (k === 0) {
      s.classList.add('paper-start');
      const b = document.createElement('div'); b.className = 'paper-badge';
      const dots = Array.from({ length: papers.size }, (_, i) => `<i class="${i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''}"></i>`).join('');
      b.innerHTML = `<b>${T(`Artigo ${n} de ${papers.size}`, `Paper ${n} of ${papers.size}`)}</b><span class="dots">${dots}</span><span class="ref">${s.dataset.ref || ''}</span>`;
      s.appendChild(b);
    }
    const f = s.querySelector('.foot > span');
    if (f) f.innerHTML += ` · <b class="paper-tag">${T(`artigo ${n}/${papers.size} · ${k + 1} de ${list.length}`, `paper ${n}/${papers.size} · ${k + 1} of ${list.length}`)}</b>`;
  }));

  function fit() {
    scale = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', scale);
    dispatchEvent(new CustomEvent('stagefit', { detail: scale }));
  }

  function toggleFS() {
    const d = document, el = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else {
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(() => {});
    }
  }
  const fsBtn = document.createElement('button');
  fsBtn.className = 'fsbtn'; fsBtn.type = 'button'; fsBtn.textContent = '⛶';
  fsBtn.title = T('Tela cheia (F)', 'Full screen (F)');
  fsBtn.addEventListener('click', e => { e.stopPropagation(); toggleFS(); fsBtn.blur(); });
  document.body.appendChild(fsBtn);
  // duplo clique fora de controles também alterna
  addEventListener('dblclick', e => {
    if (document.body.classList.contains('overview') || e.target.closest('input, button, select, a, canvas, .dash')) return;
    toggleFS();
  });

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
    // F5 / Shift+F5: botão “iniciar apresentação” dos passadores (no Windows recarregaria a página)
    else if (k.toLowerCase() === 'f' || k === 'F5') { e.preventDefault(); toggleFS(); }
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
  // cores das cinco partes (as mesmas variáveis do CSS)
  neb: '#f0b4aa', sol: '#ed5415', ana: '#d69b84', psr: '#f0b4aa', bn: '#ff8b4a',
  text: '#f7edf5', text2: '#d2bbb5', text3: '#a98e87',
  grid: 'rgba(255,255,255,.07)', axis: 'rgba(255,255,255,.28)', warn: '#f6d0c3', bg: '#171313',
};
COL.e = COL.bn; COL.mu = COL.psr; COL.tau = COL.sol;    // nomes antigos, ainda usados por Plot
COL.rt = COL.bn; COL.res = COL.sol;                     // as três partes deste seminário
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
