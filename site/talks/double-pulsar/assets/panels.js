/* =====================================================================
   Painéis do seminário. Dados do paper em results.js (tools/export_data.py);
   física ao vivo em phys.js. Duas famílias, sempre com a mesma gramática:
   estranhas em #ECF0F1 com traço cheio, nucleônicas em #7F8C8D tracejadas.
   ===================================================================== */
const RR = RESULTS, STATIC = document.body.classList.contains('nofx');
const NS = [11, 7];                                       // tracejado das nucleônicas
const fx = (v, d = 2) => v.toFixed(d).replace('.', DEC).replace('-', '−');
const sg = (v, d = 1) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(d).replace('.', DEC);

/* laço de animação: só roda com o slide ativo; na captura desenha um quadro fixo */
function animate(el, draw, tStatic = 0) {
  const slide = el.closest('.slide');
  if (STATIC) { onSlide(el, () => draw(tStatic)); return; }
  let raf = 0, t0 = 0;
  const loop = t => {
    if (!slide.classList.contains('active')) { raf = 0; return; }
    draw((t - t0) / 1000); raf = requestAnimationFrame(loop);
  };
  const go = () => { if (slide.classList.contains('active') && !raf) { t0 = performance.now(); raf = requestAnimationFrame(loop); } };
  addEventListener('slidechange', go); addEventListener('load', go);
  addEventListener('stagefit', () => { if (document.body.classList.contains('overview')) draw(tStatic); });
}
/* gerador com semente: as figuras do PDF saem sempre iguais */
function rng(seed) {
  let a = seed >>> 0, spare = null;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const n = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let x, y, r; do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || !r);
    const f = Math.sqrt(-2 * Math.log(r) / r); spare = y * f; return x * f;
  };
  return { u, n, i: k => Math.floor(u() * k) };
}
/* polilinha de contorno [x0, y0, x1, y1, …] */
function polyline(P, seg) { const c = P.ctx; c.beginPath(); for (let i = 0; i < seg.length; i += 2) { const X = P.X(seg[i]), Y = P.Y(seg[i + 1]); i ? c.lineTo(X, Y) : c.moveTo(X, Y); } return c; }
function contour(P, segs, { color, width = 2.5, dash = null, fill = 0 } = {}) {
  const c = P.ctx; c.save(); c.strokeStyle = color; c.lineWidth = width; if (dash) c.setLineDash(dash);
  segs.forEach(s => { polyline(P, s); if (fill) { c.closePath(); c.globalAlpha = fill; c.fillStyle = color; c.fill(); c.globalAlpha = 1; } c.stroke(); });
  c.restore();
}
function bandX(P, ys, lo, hi, { color, alpha = .3 } = {}) {
  const c = P.ctx, I = ys.map((_, i) => i).filter(i => lo[i] != null && hi[i] != null); c.save(); c.fillStyle = color; c.globalAlpha = alpha; c.beginPath();
  I.forEach((i, k) => { const X = P.X(lo[i]), Y = P.Y(ys[i]); k ? c.lineTo(X, Y) : c.moveTo(X, Y); });
  I.slice().reverse().forEach(i => c.lineTo(P.X(hi[i]), P.Y(ys[i]))); c.closePath(); c.fill(); c.restore();
}

/* ------------------------- o par em órbita ------------------------- */
function kepler(M, e) { let E = M; for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
function rel(ph, e, om) {
  const E = kepler(ph, e), x = Math.cos(E) - e, y = Math.sqrt(1 - e * e) * Math.sin(E);
  return [x * Math.cos(om) - y * Math.sin(om), x * Math.sin(om) + y * Math.cos(om)];
}
const XA = 1.338183 / 2.587052, XB = 1 - XA;              // frações de massa
function ellipse(c, cx, cy, a, e, om, sc) {               // a órbita de semieixo sc·a em torno do foco
  c.beginPath();
  for (let i = 0; i <= 120; i++) { const E = i / 120 * 2 * Math.PI, x = Math.cos(E) - e, y = Math.sqrt(1 - e * e) * Math.sin(E);
    const X = cx + sc * a * (x * Math.cos(om) - y * Math.sin(om)), Y = cy + sc * a * (x * Math.sin(om) + y * Math.cos(om));
    i ? c.lineTo(X, Y) : c.moveTo(X, Y); }
  c.closePath();
}
function beam(c, x, y, ang, len, wid, alpha) {
  [0, Math.PI].forEach(o => {
    const g = c.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, `rgba(236,240,241,${alpha})`); g.addColorStop(1, 'rgba(236,240,241,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ang + o - wid, ang + o + wid); c.closePath(); c.fill();
  });
}
function binary(c, cx, cy, a, { e = .0878, om = 0, ph = 0, spinA = 0, spinB = 0, len = 620, big = 1 }) {
  const [rx, ry] = rel(ph, e, om);
  const A = [cx + XB * a * rx, cy + XB * a * ry], B = [cx - XA * a * rx, cy - XA * a * ry];
  beam(c, A[0], A[1], spinA, len, .1, .2); beam(c, B[0], B[1], spinB, len * .6, .15, .09);
  c.fillStyle = 'rgba(189,195,199,.2)'; c.beginPath(); c.arc(B[0], B[1], 13 * big, 0, 7); c.arc(A[0], A[1], 17 * big, 0, 7); c.fill();
  c.fillStyle = '#BDC3C7'; c.beginPath(); c.arc(B[0], B[1], 7 * big, 0, 7); c.fill();
  c.fillStyle = '#ECF0F1'; c.beginPath(); c.arc(A[0], A[1], 9 * big, 0, 7); c.fill();
  return { A, B };
}
/* a capa: excentricidade exagerada para o desenho, o resto como no sistema */
(() => {
  const cv = document.getElementById('cover-cv');
  animate(cv, t => {
    const { ctx: c, w, h } = fitCanvas(cv), cx = w * .735, cy = h * .5, a = h * .3, e = .34;
    const om0 = -.5 + t * .025;
    for (let k = 0; k < 18; k++) {
      const om = om0 - k * 2 * Math.PI / 18;
      c.strokeStyle = `rgba(189,195,199,${.05 + .3 * (1 - k / 18) ** 2})`; c.lineWidth = 1.2;
      ellipse(c, cx, cy, a, e, om, XB); c.stroke();
    }
    c.strokeStyle = 'rgba(189,195,199,.6)'; c.lineWidth = 1.6; ellipse(c, cx, cy, a, e, om0, XB); c.stroke(); ellipse(c, cx, cy, a, e, om0 + Math.PI, XA); c.stroke();
    binary(c, cx, cy, a, { e, om: om0, ph: t * .75 + .9, spinA: t * 2.2 + .6, spinB: t * .17 + 2, len: 760, big: 1.25 });
  }, 3.2);
})();
/* arte das capas de parte */
function art(cv) {
  const k = +cv.dataset.art;
  onSlide(cv, () => {
    const { ctx: c, w, h } = fitCanvas(cv);
    if (k === 1 || k === 5) {
      const cx = w * .72, cy = h * .5, a = h * .4, e = .3;
      for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(189,195,199,${.1 + .42 * (i % 2)})`; c.lineWidth = 1; ellipse(c, cx, cy, a, e, i * 2 * Math.PI / 26, 1); c.stroke(); }
      if (k === 5) binary(c, cx, cy, a * 1.6, { e: .3, om: .4, ph: 2.1, spinA: .5, spinB: 2.2, big: 1.3 });
    } else if (k === 2) {
      const P = new Plot(cv, { x: [3, 16], y: [0, 3.2], m: [40, 30, 40, 700] }); P.begin();
      [-14, -9, -5, -2, 0, 2].forEach((l, i) => { const q = PHYS.sequence(PHYS.quark(l, 150 + i * 4)); P.line(q.seq.map(s => s.R), q.seq.map(s => s.M), { color: COL.S, width: 1.8, alpha: .55 }); });
      [[34.2, 3, 3, 2.5], [34.4, 3, 3, 2.8], [34.6, 3.2, 2.8, 2.4], [34.3, 2.6, 3.6, 2], [34.5, 3.8, 2.6, 3], [34.7, 3, 3.4, 1.8]].forEach(p => { const e = PHYS.pp(...p); if (!e) return; const q = PHYS.sequence(e); P.line(q.seq.map(s => s.R), q.seq.map(s => s.M), { color: COL.N, width: 1.8, dash: NS, alpha: .9 }); });
    } else if (k === 3) {
      const P = new Plot(cv, { x: [-34, 12], y: [70, 225], m: [30, 20, 30, 760] }); P.begin();
      contour(P, RR.post.c.prior[0], { color: COL.N, width: 1.8 }); contour(P, RR.post.c.prior[1], { color: COL.N, width: 1.8 });
      contour(P, RR.post.c.post[0], { color: COL.S, width: 2.2, fill: .1 }); contour(P, RR.post.c.post[1], { color: COL.S, width: 2.2, fill: .16 });
    } else if (k === 4) {
      const P = new Plot(cv, { x: [9.6, 13.2], y: [1.1, 1.72], m: [30, 20, 30, 760] }); P.begin();
      contour(P, RR.plane.c.N[0], { color: COL.N, width: 2.2, dash: NS }); contour(P, RR.plane.c.N[1], { color: COL.N, width: 2.2, dash: NS });
      contour(P, RR.plane.c.S[0], { color: COL.S, width: 2.2, fill: .1 }); contour(P, RR.plane.c.S[1], { color: COL.S, width: 2.2, fill: .16 });
    }
  });
}
document.querySelectorAll('canvas[data-art]').forEach(art);

/* ------------------- Parte I: a órbita em escala ------------------- */
(() => {
  const cv = document.getElementById('orbit'), DOT = 16.899323, LT = 3.77e-4, AKM = 8.79e5, RSUN = 6.96e5;
  const yr = bindRange('orbit-yr', v => fx(v, 1).replace(DEC + '0', DEC + '0') + T(' anos', ' yr'), () => {});
  const out = document.getElementById('orbit-out');
  animate(cv, t => {
    const { ctx: c, w, h } = fitCanvas(cv), cx = w * .5, cy = h * .5, a = h * .56, e = .0878, y = yr();
    const om = -1.15 + y * DOT * Math.PI / 180;
    c.save(); c.strokeStyle = 'rgba(189,195,199,.55)'; c.setLineDash([3, 8]); c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, a * RSUN / AKM, 0, 7); c.stroke(); c.restore();
    c.fillStyle = COL.text2; c.font = `18px ${FONT}`; c.textAlign = 'left'; c.fillText(T('Sol, na mesma escala', 'the Sun, to scale'), cx + a * RSUN / AKM * .74, cy - a * RSUN / AKM * .74);
    const nt = Math.floor(y / 1.5);
    for (let k = 0; k <= nt; k++) { const o = -1.15 + k * 1.5 * DOT * Math.PI / 180; c.strokeStyle = `rgba(127,140,141,${.22 + .3 * k / Math.max(1, nt)})`; c.lineWidth = 1; ellipse(c, cx, cy, a, e, o, XB); c.stroke(); }
    c.strokeStyle = COL.mid; c.lineWidth = 2; ellipse(c, cx, cy, a, e, om, XB); c.stroke(); ellipse(c, cx, cy, a, e, om + Math.PI, XA); c.stroke();
    const px = cx + a * XB * (1 - e) * Math.cos(om), py = cy + a * XB * (1 - e) * Math.sin(om);
    c.save(); c.strokeStyle = COL.S; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke(); c.restore();
    c.fillStyle = COL.S; c.font = `18px ${FONT}`; c.textAlign = 'center'; c.fillText(T('periastro', 'periastron'), cx + (a * XB + 44) * Math.cos(om), cy + (a * XB + 44) * Math.sin(om) + 6);
    const { A, B } = binary(c, cx, cy, a, { e, om, ph: t * .8 + 1.1, spinA: t * 2 + .5, spinB: t * .12 + 2, len: 300, big: .9 });
    c.fillStyle = COL.S; c.font = `600 19px ${FONT}`; c.fillText('A', A[0] + 19, A[1] - 13); c.fillStyle = COL.mid; c.fillText('B', B[0] + 17, B[1] - 12);
    const d = ((y * DOT) % 360).toFixed(1).replace('.', DEC);
    const txt = `${T('Periastro girou', 'Periastron turned')} <b>${(y * DOT).toFixed(1).replace('.', DEC)}°</b> <span>(${d}° ${T('na volta atual', 'in this turn')})</span> ${T('Parte de Lense–Thirring', 'Lense–Thirring part')} <b>${fx(-LT * 1.44 * y, 4)}°</b>`;
    if (out.dataset.last !== txt) { out.innerHTML = txt; out.dataset.last = txt; }
  }, 2.3);
})();

/* --------------------- Lense–Thirring contra I --------------------- */
(() => {
  const cv = document.getElementById('lt'), P = new Plot(cv, { x: [.8, 3.2], y: [-12.5, 0], m: [20, 30, 72, 84] });
  const n = RR.nums, out = document.getElementById('lt-out');
  const I = bindRange('lt-I', v => fx(v), () => draw());
  const lin = linspace(.8, 3.2, 50);
  function draw() {
    P.begin().frame(T('I_A (10⁴⁵ g cm²)', 'I_A (10⁴⁵ g cm²)'), T('ω̇_LT (10⁻⁴ °/ano)', 'ω̇_LT (10⁻⁴ deg/yr)'));
    const c = P.ctx, band = (lo, hi, col, al) => { c.save(); c.fillStyle = col; c.globalAlpha = al; c.fillRect(P.X(lo), P.T, P.X(hi) - P.X(lo), P.B - P.T); c.restore(); };
    band(+n.NIALo, +n.NIAHi, COL.N, .35); band(+n.SSIALo, +n.SSIAHi, COL.S, .16);
    P.text(+n.SSIAHi + .03, -.75, T('estranhas', 'strange'), { color: COL.S, size: 18 });
    P.text(+n.NIALo - .03, -.75, T('nucleônicas', 'nucleonic'), { color: COL.mid, size: 18, align: 'right' });
    P.vline(3, { color: COL.S, label: T('limite de timing', 'timing bound'), side: 'left', y: P.B - 30 });
    P.line(lin, lin.map(x => -3.77 * x), { color: COL.mid, width: 3 });
    const x = I(), y = -3.77 * x;
    c.save(); c.strokeStyle = COL.S; c.lineWidth = 2; c.beginPath(); c.moveTo(P.X(x), P.Y(y - .13)); c.lineTo(P.X(x), P.Y(y + .13)); c.stroke(); c.restore();
    P.dot(x, y, { color: COL.S, r: 7 });
    out.innerHTML = `ω̇<sub>LT</sub> <b>${fx(y, 2)}×10⁻⁴ °/${T('ano', 'yr')}</b> ${T('Fração de ω̇', 'Share of ω̇')} <b>${fx(Math.abs(y) * 1e-4 / 16.899323 * 1e5, 1)}×10⁻⁵</b> ${T('Erro em ω̇', 'Error on ω̇')} <b>±0${DEC}13×10⁻⁴</b>`;
  }
  onSlide(cv, draw);
})();

/* --------------------- perfil das duas estrelas --------------------- */
(() => {
  const ce = document.getElementById('perfil-e'), ci = document.getElementById('perfil-i');
  const PE = new Plot(ce, { x: [0, 13], y: [0, 1.4], m: [16, 18, 72, 72], fs: 16 }), PI = new Plot(ci, { x: [0, 13], y: [0, 6], m: [16, 18, 72, 72], fs: 16 });
  const out = document.getElementById('perfil-out'), sly = PHYS.pp(34.384, 3.005, 2.988, 2.851);
  const N = PHYS.atMass(sly, PHYS.MA, null, 240, true);
  const lam = bindRange('perfil-lam', v => fx(v, 1), () => req()), b = bindRange('perfil-b', v => fx(v, 1), () => req());
  let pend = false; const req = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; draw(); }); } };
  const edens = e => e / PHYS.FG / 1e15, ax = d => d.prof.map(p => p.r);
  function draw() {
    const e = PHYS.quark(lam(), b()), S = PHYS.atMass(e, PHYS.MA, null, 240, true);
    const ymI = 1.08 * Math.max(...N.prof.map(p => p.dI / 1e44), ...(S ? S.prof.map(p => p.dI / 1e44) : [0]));
    PE.begin().frame('r (km)', 'ε / c² (10¹⁵ g cm⁻³)'); PI.set('y', [0, ymI]).begin().frame('r (km)', 'dI/dr (10⁴⁴ g cm²/km)');
    PE.line(ax(N), N.prof.map(p => edens(p.e)), { color: COL.N, width: 3.2, dash: NS });
    PI.line(ax(N), N.prof.map(p => p.dI / 1e44), { color: COL.N, width: 3.2, dash: NS });
    if (S) {
      const r = ax(S), ee = S.prof.map(p => edens(p.e)), ii = S.prof.map(p => p.dI / 1e44);
      PE.area([...r, r.at(-1)], [...ee, 0], 0, { color: COL.S, alpha: .13 }); PE.line([...r, r.at(-1)], [...ee, 0], { color: COL.S, width: 3 });
      PI.area([...r, r.at(-1)], [...ii, 0], 0, { color: COL.S, alpha: .13 }); PI.line([...r, r.at(-1)], [...ii, 0], { color: COL.S, width: 3 });
      out.innerHTML = `${T('Estranha', 'Strange')} <b>${fx(S.R, 2)} km</b> <b>${fx(S.I / 1e45, 3)}</b> · SLy <b>${fx(N.R, 2)} km</b> <b>${fx(N.I / 1e45, 3)}</b> <span>×10⁴⁵ g cm²</span>`;
    } else out.innerHTML = `<b>${T('M_max abaixo de m_A: esta EOS não alcança o pulsar A', 'M_max below m_A: this EOS cannot reach pulsar A')}</b>`;
  }
  onSlide(ce, draw);
})();

/* --------------------- janela de estabilidade --------------------- */
(() => {
  const cv = document.getElementById('janela'), A = PHYS.ALPHA / 1e5, out = document.getElementById('janela-out');
  const P = new Plot(cv, { x: [-2.8, 1.05], y: [60, 235], m: [16, 26, 72, 84] }), a4 = bindRange('janela-a4', v => fx(v), () => draw());
  function draw() {
    const v = a4(), lo = -3 * A, hi = A * v, xs = linspace(lo, hi, 60);
    const up = xs.map(x => PHYS.Bmax(x * 1e5, v) ** .25), dn = xs.map(x => PHYS.Bmin(x * 1e5, v) ** .25);
    P.begin().frame('a₂ (10⁵ MeV²)', 'B¼ (MeV)'); P.clip();
    const c = P.ctx; c.save(); c.fillStyle = COL.mid; c.globalAlpha = .22; c.beginPath();
    xs.forEach((x, i) => { i ? c.lineTo(P.X(x), P.Y(up[i])) : c.moveTo(P.X(x), P.Y(up[i])); }); xs.slice().reverse().forEach((x, i) => c.lineTo(P.X(x), P.Y(dn[xs.length - 1 - i]))); c.closePath(); c.fill(); c.restore();
    P.line(xs, up, { color: COL.S, width: 2.6 }); P.line(xs, dn, { color: COL.mid, width: 2.6 });
    [[-10, -1], [-3.4, -1], [-1, -1], [1, 1]].forEach(([l]) => {
      const xx = linspace(l < 0 ? -2.8 : .001, l < 0 ? -.001 : 1.05, 60), yy = xx.map(x => (x * 1e5 / (l * Math.sqrt(v))) ** .25 * Math.SQRT1_2 ** 0 );
      const b4 = xx.map(x => { const s = x * 1e5 / (l * Math.sqrt(v)); return Math.sqrt(s); });
      P.line(xx, b4, { color: COL.mid, width: 1.3, dash: [4, 6], alpha: .85 });
      const xt = l < 0 ? Math.max(-2.62, -(200 ** 2) * Math.abs(l) * Math.sqrt(v) / 1e5) : .62, yt = Math.sqrt(xt * 1e5 / (l * Math.sqrt(v)));
      if (yt > 62 && yt < 228) P.text(xt, yt + 7, 'λ = ' + String(l).replace('.', DEC).replace('-', '−'), { color: COL.text2, size: 16, align: 'center' });
    });
    P.vline(0, { color: COL.S, width: 1.2, dash: [2, 5], label: T('λ = 0, sacola', 'λ = 0, bag'), y: P.T + 4 });
    P.unclip();
    out.innerHTML = `${T('Em a₂ = 0', 'At a₂ = 0')}: B<sup>¼</sup> ${T('entre', 'from')} <b>${PHYS.Bmin(0, v) ** .25 | 0}</b> ${T('e', 'to')} <b>${PHYS.Bmax(0, v) ** .25 | 0} MeV</b> · a₂ ${T('até', 'up to')} <b>${fx(hi, 2)}×10⁵ MeV²</b>`;
  }
  onSlide(cv, draw);
})();

/* --------------------------- homologia --------------------------- */
(() => {
  const cm = document.getElementById('homo-mr'), cs = document.getElementById('homo-cs'), out = document.getElementById('homo-out');
  const PM = new Plot(cm, { x: [4, 18], y: [0, 4.2], m: [16, 18, 72, 72], fs: 16 }), PC = new Plot(cs, { x: [0, 30], y: [.2, .6], m: [16, 18, 72, 72], fs: 16 });
  let pend = false; const req = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; draw(); }); } };
  const lam = bindRange('homo-lam', v => fx(v, 1), req), b = bindRange('homo-b', v => fx(v, 1), req), mode = bindSeg('homo-mode', req);
  function draw() {
    const l = lam(), b1 = b(), b2 = b1 * 1.1, esc = mode() === 'esc';
    const q1 = PHYS.sequence(PHYS.quark(l, b1)), q2 = PHYS.sequence(PHYS.quark(l, b2));
    const f1 = esc ? (b1 / 162) ** 2 : 1, f2 = esc ? (b2 / 162) ** 2 : 1;
    PM.begin().frame(esc ? 'R √(B/B₀) (km)' : 'R (km)', esc ? 'M √(B/B₀) (M☉)' : 'M (M☉)');
    PM.line(q1.seq.map(s => s.R * f1), q1.seq.map(s => s.M * f1), { color: COL.S, width: 3.4 });
    PM.line(q2.seq.map(s => s.R * f2), q2.seq.map(s => s.M * f2), { color: COL.mid, width: 2.6, dash: NS });
    PC.begin().frame('p / B', 'c²ₛ');
    const x = linspace(.0, 30, 90); PC.hline(1 / 3, { color: COL.mid, label: '1/3', align: 'right' }); PC.line(x, x.map(p => PHYS.csTilde(p, l)), { color: COL.S, width: 3.2 });
    const m1 = PHYS.maxMass(PHYS.quark(l, b1), q1).M, m2 = PHYS.maxMass(PHYS.quark(l, b2), q2).M;
    out.innerHTML = `M<sub>max</sub>: <b>${fx(m1, 3)}</b> ${T('e', 'and')} <b>${fx(m2, 3)} M☉</b> · ${T('razão', 'ratio')} <b>${fx(m1 / m2, 5)}</b> ${T('contra', 'vs')} (B₂/B₁)<sup>1/2</sup> = <b>${fx((b2 / b1) ** 2, 5)}</b>`;
  }
  onSlide(cm, draw);
})();

/* ---------------------- polítropos por partes ---------------------- */
(() => {
  const cp = document.getElementById('pp-p'), cm = document.getElementById('pp-mr'), out = document.getElementById('pp-out');
  const PP = new Plot(cp, { x: [14, 15.6], y: [32, 37], m: [16, 18, 72, 72], fs: 16 }), PM = new Plot(cm, { x: [8.5, 15], y: [.8, 2.8], m: [16, 18, 72, 72], fs: 16 });
  let pend = false; const req = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; draw(); }); } };
  const v = ['lp1', 'g1', 'g2', 'g3'].map(k => bindRange('pp-' + k, x => fx(x, 2), req));
  const C2 = 8.987551787e20;
  function draw() {
    const [l, g1, g2, g3] = v.map(f => f()), e = PHYS.pp(l, g1, g2, g3);
    PP.begin().frame('log₁₀ ρ (g cm⁻³)', 'log₁₀ p (dyn cm⁻²)'); PM.begin().frame('R (km)', 'M (M☉)');
    PP.vline(14.7, { color: COL.N, dash: [3, 6], width: 1.2 }); PP.vline(15, { color: COL.N, dash: [3, 6], width: 1.2 });
    bandX(PM, RR.mr.M, RR.mr.N.lo, RR.mr.N.hi, { color: COL.N, alpha: .4 }); PM.text(14.9, 2.68, T('banda: posterior nucleônico', 'band: nucleonic posterior'), { color: COL.text2, size: 16, align: 'right' });
    if (!e) { out.innerHTML = `<b>${T('Junção crosta–núcleo fora do domínio: EOS inadmissível', 'Crust–core matching out of range: inadmissible EOS')}</b>`; return; }
    const seg = e.S.slice(3), rho = logspace(1e14, 10 ** 15.6, 80).map(r => r), lp = rho.map(r => { const s = seg.findLast ? seg.findLast(s => r >= s.lo) : seg[0]; const k = s || seg[0]; return Math.log10(k.K * r ** k.G * C2); });
    PP.clip(); PP.line(rho.map(r => Math.log10(r)), lp, { color: COL.S, width: 3.2 }); PP.unclip();
    const q = PHYS.sequence(e), mx = PHYS.maxMass(e, q), a = PHYS.atMass(e, PHYS.MA, q), cs = Math.max(...[...Array(30)].map((_, i) => e.cs2(mx.hc * (i + 1) / 30)));
    PM.clip(); PM.line(q.seq.map(s => s.R), q.seq.map(s => s.M), { color: COL.S, width: 3.2 }); PM.hline(PHYS.MA, { color: COL.mid, dash: [3, 6], width: 1.2, label: 'm_A', align: 'left' }); PM.unclip();
    if (a) PM.dot(a.R, PHYS.MA, { color: COL.S, r: 6 });
    out.innerHTML = `M<sub>max</sub> <b>${fx(mx.M, 3)}</b> · ${a ? `R<sub>A</sub> <b>${fx(a.R, 2)} km</b> · I<sub>A</sub> <b>${fx(a.I / 1e45, 3)}</b>` : `<b>${T('não alcança m_A', 'does not reach m_A')}</b>`} · c<sub>s,max</sub>² <b>${fx(cs, 2)}</b>${cs > 1 ? ` <b>${T('acausal', 'acausal')}</b>` : ''}`;
  }
  onSlide(cp, draw);
})();

/* --------------------------- DE e snooker ---------------------------
   Os movimentos de emcee 3.1.6 linha a linha: RedBlueMove com 2 (DE) ou 4 (snooker)
   divisões embaralhadas a cada passo; propostas calculadas sobre o estado do início
   da divisão. “fix” troca as duas coisas erradas: vetor unitário e expoente (d − 1). */
(() => {
  const cv = document.getElementById('snk'), out = document.getElementById('snk-out');
  const P = new Plot(cv, { x: [0, 20000], y: [.6, 1.12], m: [16, 150, 72, 84] }), ND = 4, NW = 64;
  const scale = bindSeg('snk-scale', () => reset());
  const KINDS = [['de', T('só DE', 'DE only'), COL.S, null, 3], ['mix', T('80% DE + 20% snooker', '80% DE + 20% snooker'), COL.mid, null, 3], ['sn', T('só snooker', 'snooker only'), COL.N, NS, 3.4], ['fix', T('snooker corrigido', 'corrected snooker'), COL.S, [2, 6], 2]];
  const G0 = 2.38 / Math.sqrt(2 * ND), G1 = 1.7; let E = [], sig = 1, steps = 0, R;
  const lp = (X, i) => { let s = 0; for (let d = 0; d < ND; d++) { const v = X[i * ND + d] / sig; s += v * v; } return -.5 * s; };
  function make(kind) { const X = new Float64Array(NW * ND); for (let i = 0; i < X.length; i++) X[i] = sig * R.n(); const L = new Float64Array(NW); for (let i = 0; i < NW; i++) L[i] = lp(X, i); return { kind, X, L, s2: 0, n: 0, acc: 0, prop: 0, snAcc: 0, snProp: 0, hist: [] }; }
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = R.i(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  function splitIdx(ns) { const inds = shuffle(Array.from({ length: NW }, (_, i) => i % ns)), g = Array.from({ length: ns }, () => []); inds.forEach((k, i) => g[k].push(i)); return g; }
  const Q = new Float64Array(NW * ND), F = new Float64Array(NW), T2 = new Float64Array(NW * ND);
  function accept(e, S, snk) {
    for (const i of S) {
      let s = 0; for (let d = 0; d < ND; d++) { const v = Q[i * ND + d] / sig; s += v * v; }
      const nl = -.5 * s, ok = F[i] + nl - e.L[i] > Math.log(R.u());
      e.prop++; if (snk) e.snProp++;
      if (ok) { for (let d = 0; d < ND; d++) e.X[i * ND + d] = Q[i * ND + d]; e.L[i] = nl; e.acc++; if (snk) e.snAcc++; }
    }
  }
  function de(e) {
    const g = splitIdx(2);
    for (let k = 0; k < 2; k++) {
      const S = g[k], C = g[1 - k], nc = C.length;
      for (const i of S) {
        const a = R.i(nc); let b = R.i(nc - 1); if (b >= a) b++;
        const gam = G0 * (1 + 1e-5 * R.n());
        for (let d = 0; d < ND; d++) Q[i * ND + d] = e.X[i * ND + d] + gam * (e.X[C[b] * ND + d] - e.X[C[a] * ND + d]);
        F[i] = 0;
      }
      accept(e, S, false);
    }
  }
  function snooker(e, fix) {
    const g = splitIdx(4);
    for (let k = 0; k < 4; k++) {
      const S = g[k], oth = g.filter((_, j) => j !== k);
      for (const i of S) {
        const w = shuffle(oth.map(o => o[R.i(o.length)]));
        const [z, z1, z2] = w; let nrm = 0;
        for (let d = 0; d < ND; d++) { const v = e.X[i * ND + d] - e.X[z * ND + d]; T2[d] = v; nrm += v * v; }
        nrm = Math.sqrt(nrm);
        const den = fix ? nrm : Math.sqrt(nrm); let a1 = 0, a2 = 0;
        for (let d = 0; d < ND; d++) { T2[d] /= den; a1 += T2[d] * e.X[z1 * ND + d]; a2 += T2[d] * e.X[z2 * ND + d]; }
        let qz = 0;
        for (let d = 0; d < ND; d++) { const q = e.X[i * ND + d] + T2[d] * G1 * (a1 - a2); Q[i * ND + d] = q; const v = q - e.X[z * ND + d]; qz += v * v; }
        F[i] = (fix ? 1 : .5) * (ND - 1) * (.5 * Math.log(qz) - Math.log(nrm));
      }
      accept(e, S, true);
    }
  }
  const BURN = 500;
  function step(e) {
    if (e.kind === 'de') de(e); else if (e.kind === 'sn') snooker(e, false);
    else if (e.kind === 'mix') { R.u() < .8 ? de(e) : snooker(e, false); } else { R.u() < .8 ? de(e) : snooker(e, true); }
    if (steps > BURN) { for (let i = 0; i < NW * ND; i++) { const v = e.X[i] / sig; e.s2 += v * v; } e.n += NW * ND; }
  }
  function reset() { sig = +scale(); R = rng(11); E = KINDS.map(k => make(k[0])); steps = 0; if (STATIC) { while (steps < 20000) adv(100); draw(); } }
  function adv(k) { for (let s = 0; s < k; s++) { steps++; E.forEach(step); } E.forEach(e => e.hist.push([steps, e.n ? e.s2 / e.n : NaN])); }
  function draw() {
    P.begin().frame(T('passos', 'steps'), T('variância / σ²', 'variance / σ²'));
    P.hline(1, { color: COL.mid, dash: [4, 6], width: 1.2 });
    KINDS.forEach((k, i) => {
      const h = E[i].hist.filter(p => isFinite(p[1])); if (!h.length) return;
      P.clip(); P.line(h.map(p => p[0]), h.map(p => p[1]), { color: k[2], dash: k[3], width: k[4] }); P.unclip();
    });
    const off = [-1, 1, 0, 1]; const ys = E.map(e => (e.hist.length ? e.hist.at(-1)[1] : 1));
    const order = ys.map((y, i) => [y, i]).sort((a, b) => b[0] - a[0]); let last = -1e9;
    order.forEach(([y, i]) => { let Y = P.Y(Math.min(1.1, Math.max(.62, isFinite(y) ? y : 1))); if (Y - last < 22) Y = last + 22; last = Y; P.text(P.R + 12, Y, KINDS[i][1].replace('80% DE + 20% ', T('mistura ', 'mix ')).replace(' + ', ''), { px: true, color: i === 2 ? COL.mid : KINDS[i][2], size: 16 }); });
    const fmt = i => { const e = E[i]; return e.n ? fx(e.s2 / e.n, 3) : '—'; };
    const ac = E[2].snProp ? E[2].snAcc / E[2].snProp : 0;
    out.innerHTML = `${T('Passo', 'Step')} <b>${steps}</b> · DE <b>${fmt(0)}</b> · ${T('mistura', 'mix')} <b>${fmt(1)}</b> · snooker <b>${fmt(2)}</b> · ${T('corrigido', 'corrected')} <b>${fmt(3)}</b> · ${T('aceitação do snooker', 'snooker acceptance')} <b>${fx(ac * 100, 1)}%</b>`;
  }
  R = rng(11); E = KINDS.map(k => make(k[0]));
  if (STATIC) { onSlide(cv, () => { if (!steps) reset(); draw(); }); }
  else animate(cv, () => { if (steps < 20000) { adv(24); draw(); } else draw(); });
  addEventListener('load', () => { if (STATIC) return; draw(); });
})();

/* ------------------------------ SBC ------------------------------ */
(() => {
  const cv = document.getElementById('sbc');
  onSlide(cv, () => {
    const { ctx: c, w, h } = fitCanvas(cv), keys = [['I_A', 'I_A'], ['R_A', 'R_A'], ['lam', 'λ']], g = 34, pw = (w - g * 2) / 3, top = 30, bot = h - 62, ex = RR.sbc.n / 20, ym = 240;
    keys.forEach(([k, lab], j) => {
      const x0 = j * (pw + g), a = RR.sbc[k], bw = pw / 20;
      c.fillStyle = 'rgba(236,240,241,.72)';
      a.forEach((v, i) => c.fillRect(x0 + i * bw + 1, bot - v / ym * (bot - top), bw - 2, v / ym * (bot - top)));
      c.save(); c.strokeStyle = COL.S; c.setLineDash([6, 6]); c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, bot - ex / ym * (bot - top)); c.lineTo(x0 + pw, bot - ex / ym * (bot - top)); c.stroke(); c.restore();
      c.strokeStyle = COL.axis; c.beginPath(); c.moveTo(x0, bot); c.lineTo(x0 + pw, bot); c.stroke();
      c.fillStyle = COL.text2; c.font = `19px ${FONT}`; c.textAlign = 'center'; c.fillText(T('posto de ', 'rank of ') + lab, x0 + pw / 2, bot + 34);
      c.font = `15px ${FONT}`; c.textAlign = 'left'; c.fillText('0', x0, bot + 18); c.textAlign = 'right'; c.fillText('1', x0 + pw, bot + 18);
    });
  });
})();

/* ------------------------ posterior e sinal de λ ------------------------ */
(() => {
  const cc = document.getElementById('post-c'), cl = document.getElementById('post-l'), C = RR.post.c, L = RR.post.lam, n = RR.nums;
  const PC = new Plot(cc, { x: [-35, 12], y: [60, 230], m: [14, 18, 72, 80], fs: 16 }), PL = new Plot(cl, { x: [-24, 8], y: [0, .13], m: [14, 18, 72, 26], fs: 16, yticks: [] });
  const cen = L.e.slice(0, -1).map((v, i) => .5 * (v + L.e[i + 1]));
  onSlide(cc, () => {
    PC.begin().frame('λ', 'B¼ (MeV)'); PC.clip();
    contour(PC, C.prior[0], { color: COL.mid, width: 2, dash: [2, 6] }); contour(PC, C.prior[1], { color: COL.mid, width: 2, dash: [2, 6] });
    contour(PC, C.post[0], { color: COL.S, width: 2.8, fill: .12 }); contour(PC, C.post[1], { color: COL.S, width: 2.8, fill: .2 });
    PC.unclip(); PC.vline(0, { color: COL.S, width: 1.2, dash: [3, 6], label: T('sacola', 'bag'), side: 'right', y: PC.B - 26 });
    PL.begin().frame('λ', null); PL.clip();
    const k = cen.findIndex(x => x > 0), xn = cen.slice(0, k), yn = L.post.slice(0, k);
    PL.area(xn, yn, 0, { color: COL.S, alpha: .15 });
    PL.line(cen, L.prior, { color: COL.mid, width: 2, dash: [2, 6] }); PL.line(cen, L.post, { color: COL.S, width: 3 });
    PL.unclip(); PL.vline(0, { color: COL.S, width: 1.2, dash: [3, 6] });
    PL.text(-16, .105, `P(λ < 0)`, { color: COL.S, size: 19 }); PL.text(-16, .09, `${T('posterior', 'posterior')} ${n.SSPlamNegPost.replace('.', DEC)}`, { color: COL.text2, size: 17 }); PL.text(-16, .077, `prior ${n.SSPlamNegPrior.replace('.', DEC)}`, { color: COL.text2, size: 17 });
  });
})();

/* ------------------------- preditivas em m_A ------------------------- */
(() => {
  const cv = document.getElementById('pred'), out = document.getElementById('pred-out'), n = RR.nums;
  const P = new Plot(cv, { x: [.8, 3.2], y: [0, 1], m: [14, 26, 72, 34], yticks: [] });
  const q = bindSeg('pred-q', () => draw());
  const CFG = {
    I: { x: [.8, 3.2], lab: 'I_A (10⁴⁵ g cm²)', k: ['SSIA', 'NIA'], u: '×10⁴⁵' }, R: { x: [8, 15], lab: 'R_A (km)', k: ['SSRA', 'NRA'], u: 'km' },
    L: { x: [100, 1300], lab: 'Λ_A', k: ['SSLA', 'NLA'], u: '' }, M: { x: [1.9, 3], lab: 'M_max (M☉)', k: ['SSMmax', 'NMmax'], u: 'M☉' },
  };
  function draw() {
    const K = q(), c = CFG[K], d = RR.pred[K], ym = 1.08 * Math.max(...d.S, ...d.N);
    P.set('x', c.x).set('y', [0, ym]).begin().frame(c.lab, null); P.clip();
    if (d.Sp) { P.line(d.x, d.Sp, { color: COL.mid, width: 1.8, dash: [2, 6] }); P.line(d.x, d.Np, { color: COL.N, width: 1.8, dash: [2, 6] }); }
    P.area(d.x, d.N, 0, { color: COL.N, alpha: .3 }); P.line(d.x, d.N, { color: COL.N, width: 3.4, dash: NS });
    P.area(d.x, d.S, 0, { color: COL.S, alpha: .14 }); P.line(d.x, d.S, { color: COL.S, width: 3.2 });
    P.unclip(); if (K === 'I') P.vline(3, { color: COL.S, label: T('limite de timing, 90%', 'timing bound, 90%'), side: 'left', y: P.T + 8 });
    const t = (k, f) => `<b>${(n[k + 'Med']).replace('.', DEC)}</b> (${n[k + 'Lo'].replace('.', DEC)}–${n[k + 'Hi'].replace('.', DEC)})`;
    out.innerHTML = `${T('Estranhas', 'Strange')} ${t(c.k[0])} · ${T('Nucleônicas', 'Nucleonic')} ${t(c.k[1])}${c.u ? ' <span>' + c.u + '</span>' : ''}`;
  }
  onSlide(cv, draw);
})();

/* ----------------------- bandas M–R e NICER ----------------------- */
(() => {
  const cv = document.getElementById('mrdata'), m = RR.mr, P = new Plot(cv, { x: [8.5, 15], y: [1, 2.6], m: [14, 26, 72, 84] });
  const L = bindSeg('mr-l', () => draw());
  function draw() {
    const k = L();
    P.begin().frame('R (km)', 'M (M☉)'); P.clip();
    if (k !== 's') { bandX(P, m.M, m.N.lo, m.N.hi, { color: COL.N, alpha: .5 }); }
    if (k !== 'n') { bandX(P, m.M, m.S.lo, m.S.hi, { color: COL.S, alpha: .28 }); }
    [['J0740'], ['J0437']].forEach(([n]) => { contour(P, m[n][0], { color: COL.S, width: 1.6, dash: [5, 5] }); contour(P, m[n][1], { color: COL.S, width: 2.2 }); });
    P.hline(1.338183, { color: COL.mid, dash: [3, 6], width: 1.3, label: 'm_A', align: 'right' });
    P.unclip();
    P.text(13.1, 2.31, 'J0740+6620', { color: COL.S, size: 18, align: 'center' }); P.text(13.9, 1.56, 'J0437−4715', { color: COL.S, size: 18, align: 'center' });
    const sw = (y, col, al, lab) => { const c = P.ctx; c.save(); c.fillStyle = col; c.globalAlpha = al; c.fillRect(P.X(8.8), P.Y(y) - 9, 34, 18); c.restore(); P.text(P.X(8.8) + 46, P.Y(y), lab, { px: true, color: COL.S, size: 19 }); };
    if (k !== 'n') sw(2.47, COL.S, .45, T('estranhas', 'strange')); if (k !== 's') sw(2.36, COL.N, .85, T('nucleônicas', 'nucleonic'));
  }
  onSlide(cv, draw);
})();

/* ------------------------ o plano (I_A, R_A) ------------------------ */
function planeBase(P) {
  const c = RR.plane.c;
  contour(P, c.N[0], { color: COL.N, width: 3, dash: NS, fill: .14 }); contour(P, c.N[1], { color: COL.N, width: 3, dash: NS, fill: .2 });
  contour(P, c.S[0], { color: COL.S, width: 2.6, fill: .08 }); contour(P, c.S[1], { color: COL.S, width: 2.6, fill: .14 });
}
(() => {
  const cv = document.getElementById('plano'), P = new Plot(cv, { x: [9.4, 13.6], y: [1.1, 1.75], m: [14, 26, 72, 84] });
  onSlide(cv, () => {
    P.begin().frame('R_A (km)', 'I_A (10⁴⁵ g cm²)'); P.clip(); planeBase(P); P.unclip();
    const c = P.ctx, y = 1.345, x1 = 10.36, x2 = 11.86;
    c.save(); c.strokeStyle = COL.S; c.lineWidth = 1.8; c.beginPath(); c.moveTo(P.X(x1), P.Y(y)); c.lineTo(P.X(x2), P.Y(y)); c.stroke();
    [x1, x2].forEach(x => { c.beginPath(); c.moveTo(P.X(x), P.Y(y) - 8); c.lineTo(P.X(x), P.Y(y) + 8); c.stroke(); }); c.restore();
    P.text((x1 + x2) / 2, y - .02, T('≈ 1,5 km', '≈ 1.5 km'), { color: COL.S, size: 21, align: 'center' });
    P.text(10.05, 1.63, T('estranhas', 'strange'), { color: COL.S, size: 21 }); P.text(12.6, 1.3, T('nucleônicas', 'nucleonic'), { color: COL.text2, size: 21 });
  });
})();

/* --------------------------- evidências --------------------------- */
(() => {
  const cv = document.getElementById('evid'), E = RR.evid;
  const L = [T('Análise principal', 'Main analysis'), T('Prior P2 (uniforme em B)', 'Prior P2 (uniform in B)'), T('Prior P3 (a₂ ≥ −6α)', 'Prior P3 (a₂ ≥ −6α)'), T('Prior P4 (a₄ ≥ 0,5)', 'Prior P4 (a₄ ≥ 0.5)'), T('Prior N2 (cₛ ≤ 1,1)', 'Prior N2 (cₛ ≤ 1.1)'), T('Prior N3 (caixa maior)', 'Prior N3 (wider box)'), T('População independente da EOS', 'EOS-independent population'), 'KDE ×0' + DEC + '7', 'KDE ×1' + DEC + '4', T('GW170817 spin alto', 'GW170817 high spin'), 'J0740 (Dittmann 2024)', T('J1614 com NICER', 'J1614 with NICER'), T('Sem NICER', 'Without NICER'), T('Com J0030 (Riley)', 'With J0030 (Riley)'), T('Com J0030 (Miller)', 'With J0030 (Miller)')];
  const P = new Plot(cv, { x: [-2, 2], y: [E.length - .4, -.6], m: [10, 30, 66, 330], yticks: [] });
  onSlide(cv, () => {
    P.begin().frame('ln 𝓑 S/N', null); const c = P.ctx;
    [[-.6, .5], [6.5, 7.5]].forEach(() => {});
    P.vline(0, { color: COL.mid, dash: [4, 6], width: 1.4 });
    P.text(-1.9, -.1, T('← nucleônicas', '← nucleonic'), { color: COL.text2, size: 16 }); P.text(1.9, -.1, T('estranhas →', 'strange →'), { color: COL.text2, size: 16, align: 'right' });
    E.forEach((r, i) => {
      const y = i, main = i === 0;
      c.save(); c.strokeStyle = 'rgba(189,195,199,.3)'; c.setLineDash([1, 5]); c.beginPath(); c.moveTo(P.X(0), P.Y(y)); c.lineTo(P.X(r.b), P.Y(y)); c.stroke(); c.restore();
      P.text(P.L - 16, P.Y(y), L[i], { px: true, align: 'right', size: 19, color: main ? COL.S : COL.text2 });
      P.dot(r.b, y, { color: main ? COL.S : COL.mid, r: main ? 8 : 6 });
      P.text(P.X(r.b) + (r.b >= 0 ? 14 : -14), P.Y(y), sg(r.b, 2), { px: true, align: r.b >= 0 ? 'left' : 'right', size: 16, color: main ? COL.S : COL.text2 });
    });
  });
})();

/* ------------------------- ajuste contra volume ------------------------- */
(() => {
  const cv = document.getElementById('occam'), O = RR.occam;
  const P = new Plot(cv, { x: [-20.2, -15], y: [2, 0], m: [40, 40, 72, 160], yticks: [] });
  onSlide(cv, () => {
    P.begin().frame(null, null); const c = P.ctx;
    [[O.estranha, .62, T('estranhas', 'strange'), COL.S], [O.nucleonica, 1.42, T('nucleônicas', 'nucleonic'), COL.N]].forEach(([o, y, lab, col]) => {
      const X = v => P.X(v), Y = P.Y(y), lc = col === COL.N ? COL.mid : COL.S;
      P.text(P.L - 16, Y, lab, { px: true, align: 'right', size: 22, color: lc });
      c.save(); c.strokeStyle = col; c.lineWidth = 12; c.lineCap = 'butt'; c.globalAlpha = .75; c.beginPath(); c.moveTo(X(o.lnZ), Y); c.lineTo(X(o.lnL_medio_post), Y); c.stroke(); c.restore();
      c.save(); c.strokeStyle = col; c.lineWidth = 2; if (col === COL.N) c.setLineDash(NS); c.beginPath(); c.moveTo(X(o.lnL_medio_post), Y); c.lineTo(X(o.lnL_max), Y); c.stroke(); c.restore();
      [[o.lnZ, 'ln Z', fx(o.lnZ, 2)], [o.lnL_medio_post, '⟨ln 𝓛⟩', fx(o.lnL_medio_post, 2)], [o.lnL_max, 'ln 𝓛 max', fx(o.lnL_max, 2)]].forEach(([v, a, b]) => {
        P.dot(v, 0, { color: col, r: 0 }); c.fillStyle = col === COL.N ? COL.mid : COL.S; c.beginPath(); c.arc(X(v), Y, 8, 0, 7); c.fill();
        P.text(X(v), Y - 44, a, { px: true, align: 'center', size: 18, color: COL.text2 }); P.text(X(v), Y - 22, b, { px: true, align: 'center', size: 19, color: COL.S });
      });
      P.text((X(o.lnZ) + X(o.lnL_medio_post)) / 2, Y + 30, `D_KL = ${fx(o.DKL, 1)} nats`, { px: true, align: 'center', size: 18, color: COL.text2 });
    });
  });
})();

/* --------------------------- consistência --------------------------- */
(() => {
  const cv = document.getElementById('cons'), C = RR.cons, nm = { J0348_massa: 'J0348', J1614_massa: 'J1614', J0740_salmi2024_f1: 'J0740', J0437_choudhury2024_f1: 'J0437', GW170817: 'GW170817' };
  const P = new Plot(cv, { x: [-2.4, 2], y: [4.6, -.6], m: [10, 30, 72, 130], yticks: [] });
  onSlide(cv, () => {
    P.begin().frame('ln R', null); const c = P.ctx;
    c.save(); c.fillStyle = COL.mid; c.globalAlpha = .1; c.fillRect(P.L, P.T, P.X(0) - P.L, P.B - P.T); c.restore();
    P.vline(0, { color: COL.mid, dash: [4, 6], width: 1.4 });
    P.text(-2.3, -.32, T('tensão', 'tension'), { color: COL.text2, size: 17 }); P.text(1.9, -.32, T('consistência', 'consistency'), { color: COL.text2, size: 17, align: 'right' });
    C.comp.forEach((k, i) => {
      P.text(P.L - 16, P.Y(i), nm[k], { px: true, align: 'right', size: 20, color: COL.text2 });
      const s = C.S[k], n = C.N[k];
      c.save(); c.strokeStyle = 'rgba(189,195,199,.4)'; c.beginPath(); c.moveTo(P.X(s), P.Y(i)); c.lineTo(P.X(n), P.Y(i)); c.stroke(); c.restore();
      c.fillStyle = COL.dark; c.strokeStyle = COL.N; c.lineWidth = 3.5; c.beginPath(); c.arc(P.X(n), P.Y(i), 9, 0, 7); c.fill(); c.stroke();
      c.fillStyle = COL.S; c.beginPath(); c.arc(P.X(s), P.Y(i), 9, 0, 7); c.fill();
      if (k === 'GW170817') { P.text(s, i + .34, sg(s, 1), { color: COL.S, size: 18, align: 'center' }); P.text(n, i + .34, n.toFixed(1).replace('.', DEC), { color: COL.text2, size: 18, align: 'center' }); }
    });
  });
})();

/* ---------------------- ligue e desligue os dados ----------------------
   Máscara na ordem de subconjuntos.py: J0348, J1614, J0740 NICER, J0437, GW170817, J0740 rádio.
   O botão de J0740 tem três estados, porque a densidade do NICER já contém a massa de rádio. */
(() => {
  const cv = document.getElementById('dados'), box = document.getElementById('dados-btns'), out = document.getElementById('dados-out'), S = RR.subs.l;
  const st = { J0348: 1, J1614: 1, J0740: 2, J0437: 1, GW: 1 };
  const LB = { J0348: 'J0348', J1614: 'J1614', J0437: 'J0437 NICER', GW: 'GW170817' };
  const lab0 = v => v === 2 ? 'J0740 NICER' : v === 1 ? T('J0740 só rádio', 'J0740 radio only') : 'J0740';
  ['J0348', 'J1614', 'J0740', 'J0437', 'GW'].forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; box.appendChild(b);
    b.addEventListener('click', () => { st[k] = k === 'J0740' ? (st[k] + 2) % 3 : 1 - st[k]; draw(); b.blur(); });
  });
  const P = new Plot(cv, { x: [.8, 2.4], y: [2.3, .2], m: [12, 40, 200, 150], yticks: [] });
  function draw() {
    box.querySelectorAll('button').forEach(b => { const k = b.dataset.k; b.textContent = k === 'J0740' ? lab0(st[k]) : LB[k]; b.classList.toggle('on', !!st[k]); });
    const mask = `${st.J0348}${st.J1614}${st.J0740 === 2 ? 1 : 0}${st.J0437}${st.GW}${st.J0740 === 1 ? 1 : 0}`, r = S[mask];
    P.begin().frame(null, null); const c = P.ctx;
    P.text((P.L + P.R) / 2, P.B + 52, 'I_A (10⁴⁵ g cm²)', { px: true, align: 'center', size: 19, color: COL.text2 });
    [[r.IS, 1, T('estranhas', 'strange'), COL.S, null], [r.IN, 2, T('nucleônicas', 'nucleonic'), COL.N, NS]].forEach(([q, y, l, col, d]) => {
      P.text(P.L - 16, P.Y(y), l, { px: true, align: 'right', size: 21, color: col === COL.N ? COL.mid : COL.S });
      c.save(); c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round'; if (d) c.setLineDash(d); c.beginPath(); c.moveTo(P.X(q[0]), P.Y(y)); c.lineTo(P.X(Math.min(2.4, q[2])), P.Y(y)); c.stroke(); c.restore();
      c.fillStyle = col === COL.N ? COL.mid : COL.S; c.beginPath(); c.arc(P.X(q[1]), P.Y(y), 10, 0, 7); c.fill();
      P.text(P.X(q[1]), P.Y(y) - 30, fx(q[1], 2), { px: true, align: 'center', size: 20, color: COL.S });
    });
    const gy = P.h - 62, gx0 = P.L, gx1 = P.R, X = v => gx0 + (v + 3) / 6 * (gx1 - gx0);
    c.strokeStyle = COL.axis; c.lineWidth = 2; c.beginPath(); c.moveTo(gx0, gy); c.lineTo(gx1, gy); c.stroke();
    [-3, -2, -1, 0, 1, 2, 3].forEach(v => { c.beginPath(); c.moveTo(X(v), gy - 7); c.lineTo(X(v), gy + 7); c.stroke(); P.text(X(v), gy + 24, String(v).replace('-', '−'), { px: true, align: 'center', size: 16, color: COL.text2 }); });
    P.text(P.L - 16, gy, 'ln 𝓑 S/N', { px: true, align: 'right', size: 21, color: COL.S });
    c.fillStyle = COL.S; c.beginPath(); c.arc(X(Math.max(-3, Math.min(3, r.b))), gy, 11, 0, 7); c.fill();
    P.text(X(r.b), gy - 30, sg(r.b, 1), { px: true, align: 'center', size: 23, color: COL.S });
    out.innerHTML = `ln 𝓑 <b>${sg(r.b, 1)}</b> · ${T('estranhas', 'strange')} I<sub>A</sub> <b>${fx(r.IS[0], 2)}–${fx(r.IS[2], 2)}</b>, R<sub>A</sub> <b>${fx(r.RS[1], 1)} km</b> · ${T('nucleônicas', 'nucleonic')} I<sub>A</sub> <b>${fx(r.IN[0], 2)}–${fx(r.IN[2], 2)}</b>, R<sub>A</sub> <b>${fx(r.RN[1], 1)} km</b>`;
  }
  onSlide(cv, draw);
})();

/* --------------------------- I_A nas variantes --------------------------- */
(() => {
  const cv = document.getElementById('vars'), V = RR.vars;
  const K = [['Main', T('Análise principal', 'Main analysis')], ['Prior P2', 'Prior P2'], ['Prior P3', 'Prior P3'], ['Prior P4', 'Prior P4'], ['Population not normalized', T('População independente da EOS', 'EOS-independent population')], ['KDE $\\times0.7$', 'KDE ×0' + DEC + '7'], ['KDE $\\times1.4$', 'KDE ×1' + DEC + '4'], ['GW170817 high spin', T('GW170817 spin alto', 'GW170817 high spin')], ['J0740 (Maryland)', 'J0740 (Dittmann 2024)'], ['J1614 NICER', T('J1614 com NICER', 'J1614 with NICER')], ['Without NICER', T('Sem NICER', 'Without NICER')], ['With J0030 (Riley)', T('Com J0030 (Riley)', 'With J0030 (Riley)')], ['With J0030 (Miller)', T('Com J0030 (Miller)', 'With J0030 (Miller)')]];
  const P = new Plot(cv, { x: [1, 1.8], y: [K.length - .3, -.7], m: [10, 30, 66, 330], yticks: [] });
  onSlide(cv, () => {
    P.begin().frame('I_A (10⁴⁵ g cm²)', null); const c = P.ctx, med = V.Main.SI[2];
    P.vline(med, { color: COL.mid, dash: [4, 6], width: 1.3 });
    K.forEach(([k, l], i) => {
      const r = V[k], hot = k === 'Without NICER' || k === 'Main';
      P.text(P.L - 16, P.Y(i), l, { px: true, align: 'right', size: 18.5, color: hot ? COL.S : COL.text2 });
      const seg = (a, y, col, dash, w) => { if (!a) return; c.save(); c.strokeStyle = col; c.lineWidth = w; if (dash) c.setLineDash(dash); c.beginPath(); c.moveTo(P.X(a[0]), y); c.lineTo(P.X(a[4]), y); c.stroke(); c.restore(); c.fillStyle = col === COL.N ? COL.mid : col; c.beginPath(); c.arc(P.X(a[2]), y, 5.5, 0, 7); c.fill(); };
      seg(r.SI, P.Y(i) - 6, COL.S, null, 3); seg(r.NI, P.Y(i) + 6, COL.N, [7, 5], 3.2);
    });
  });
})();

/* --------------------------- projeções --------------------------- */
(() => {
  const cv = document.getElementById('projI'), Pj = RR.proj;
  const TR = [['S_95', T('95% estranha', 'strange 95%'), COL.S, 1], ['S_50', T('mediana estranha', 'strange median'), COL.S, 0], ['sobreposicao', T('sobreposição', 'overlap'), COL.mid, 1], ['N_50', T('mediana nucleônica', 'nucleonic median'), COL.N, 0], ['N_05', T('5% nucleônica', 'nucleonic 5%'), COL.N, 1]];
  const EPS = [.2, .1, .05, .02], P = new Plot(cv, { x: [-.5, 3.5], y: [-4, 3], m: [12, 186, 62, 72], xticks: [0, 1, 2, 3], xfmt: v => ['20%', '10%', '5%', '2%'][v], yticks: [-4, -3, -2, -1, 0, 1, 2, 3], yfmt: v => (v > 0 ? '+' : '') + String(v).replace('-', '−') });
  onSlide(cv, () => {
    P.begin().frame(T('erro fracionário em I_A', 'fractional error on I_A'), 'ln 𝓑 S/N'); const c = P.ctx;
    P.hline(0, { color: COL.mid, dash: [4, 6], width: 1.4 });
    TR.forEach(([k, l, col, fill], j) => {
      const dx = (j - 2) * .14, med = [];
      EPS.forEach((e, i) => {
        const r = Pj.soI.find(x => x.t === k && x.eps === e); if (!r) return;
        const x = P.X(i + dx); med.push([i + dx, r.q[1]]);
        c.save(); c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(x, P.Y(r.q[0])); c.lineTo(x, P.Y(r.q[2])); c.stroke(); c.restore();
        c.beginPath(); c.arc(x, P.Y(r.q[1]), 7, 0, 7); c.lineWidth = 3; c.strokeStyle = col; if (fill) { c.fillStyle = col; c.fill(); } else { c.fillStyle = COL.dark; c.fill(); c.stroke(); }
      });
      P.line(med.map(p => p[0]), med.map(p => p[1]), { color: col, width: 1.2, alpha: .55 });
      const r = Pj.soI.find(x => x.t === k && x.eps === .02);
      P.text(P.R + 12, P.Y(r.q[1]) + (k === 'S_95' ? -6 : k === 'S_50' ? 8 : k === 'N_50' ? 0 : 0), l, { px: true, color: col === COL.N ? COL.mid : col, size: 16.5 });
    });
    P.text(P.R + 12, P.T + 8, T('I verdadeiro:', 'true I:'), { px: true, color: COL.text2, size: 16 });
  });
})();
(() => {
  const cv = document.getElementById('projR'), R = RR.proj.comR.filter(r => r.t === 'sobreposicao');
  const SG = [1, .5, .25], P = new Plot(cv, { x: [-.5, 2.5], y: [-16, 12], m: [12, 30, 62, 72], xticks: [0, 1, 2], xfmt: v => ['1 km', '0' + DEC + '5 km', '0' + DEC + '25 km'][v], yfmt: v => (v > 0 ? '+' : '') + String(v).replace('-', '−') });
  onSlide(cv, () => {
    P.begin().frame(T('erro σ_R no raio', 'radius error σ_R'), 'ln 𝓑 S/N'); const c = P.ctx;
    c.save(); c.fillStyle = COL.mid; c.globalAlpha = .1; c.fillRect(P.L, P.Y(2), P.R - P.L, P.Y(-2) - P.Y(2)); c.restore();
    P.hline(0, { color: COL.mid, dash: [4, 6], width: 1.4 });
    P.text(P.R - 8, P.Y(2) + 14, '|ln 𝓑| < 2', { px: true, align: 'right', size: 16, color: COL.text2 });
    [['E', COL.S, -.13], ['N', COL.N, .13]].forEach(([f, col, dx]) => {
      SG.forEach((s, i) => {
        const r = R.find(x => x.f === f && x.sR === s), x = P.X(i + dx);
        c.save(); c.strokeStyle = col; c.lineWidth = 3.6; if (f === 'N') c.setLineDash(NS); c.beginPath(); c.moveTo(x, P.Y(r.q[0])); c.lineTo(x, P.Y(r.q[2])); c.stroke(); c.restore();
        c.fillStyle = col === COL.N ? COL.mid : col; c.beginPath(); c.arc(x, P.Y(r.q[1]), 8, 0, 7); c.fill();
        P.text(x + (f === 'E' ? -14 : 14), P.Y(r.q[1]), sg(r.q[1], 1), { px: true, size: 18, align: f === 'E' ? 'right' : 'left', color: COL.S });
      });
    });
  });
})();

/* ------------------------- simule uma medida -------------------------
   A reponderação do paper, Z′ = Z·E_post[N(d; x, σ)], sobre as grades (I_A, R_A).
   Em cada realização d = verdadeiro + ruído. ver tools/validacao_grade.txt
   O ruído é quase aleatório: sequência R2 em (u, v) com Box–Muller. ln 𝓑 varia cerca de
   −6 por km em R a 0,5 km de erro, e 400 sorteios comuns podem ter média a 0,15σ de zero,
   o que deslocaria a mediana em 0,5; a sequência cobre a distribuição por igual. */
(() => {
  const G = RR.plane, nI = G.nI, nR = G.nR, cI = Float64Array.from({ length: nI }, (_, i) => G.I0 + i * G.dI), cR = Float64Array.from({ length: nR }, (_, i) => G.R0 + i * G.dR);
  function dec(b64) {
    const s = atob(b64), n = s.length / 2, w = new Float64Array(n); let tot = 0;
    for (let i = 0; i < n; i++) { const v = (s.charCodeAt(2 * i) | (s.charCodeAt(2 * i + 1) << 8)) / 65535; w[i] = v * v; tot += w[i]; }
    const ii = [], jj = [], ww = [], mI = new Float64Array(nI);
    for (let k = 0; k < n; k++) { const v = w[k] / tot; if (v > 1e-9) { const i = Math.floor(k / nR), j = k % nR; ii.push(i); jj.push(j); ww.push(v); mI[i] += v; } }
    return { ii: Int32Array.from(ii), jj: Int32Array.from(jj), ww: Float64Array.from(ww), mI };
  }
  const FS = dec(G.S), FN = dec(G.N), B0 = G.lnZS - G.lnZN, NR = 400;
  const cp = document.getElementById('medida-p'), ch = document.getElementById('medida-h'), out = document.getElementById('medida-out');
  const PP = new Plot(cp, { x: [9.4, 13.4], y: [1.08, 1.75], m: [14, 16, 72, 74], fs: 16 });
  const PH = new Plot(ch, { x: [-8, 8], y: [0, 1], m: [14, 16, 72, 22], fs: 16, yticks: [] });
  let pend = false; const req = () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; draw(); }); } };
  const It = bindRange('medida-I', v => fx(v, 3), req), eI = bindRange('medida-e', v => fx(v, 1) + '%', req), Rt = bindRange('medida-R', v => fx(v, 2) + ' km', req), sR = bindRange('medida-s', v => fx(v, 2) + ' km', req);
  const mode = bindSeg('medida-mode', req);
  const GI = new Float64Array(nI), GR = new Float64Array(nR);
  function sum(F, withR) {
    let s = 0, s2 = 0;
    if (!withR) { for (let i = 0; i < nI; i++) { const a = F.mI[i] * GI[i]; s += a; s2 += a * a; } return [s, s2]; }
    const { ii, jj, ww } = F;
    for (let k = 0; k < ww.length; k++) { const a = ww[k] * GI[ii[k]] * GR[jj[k]]; s += a; s2 += a * a; }
    return [s, s2];
  }
  function draw() {
    const I0 = It(), sI = eI() / 100 * I0, R0 = Rt(), sr = sR(), wR = mode() === 'IR', x = new Float64Array(NR); let minEff = Infinity;
    for (let n = 0; n < NR; n++) {
      const u = (.5 + (n + 1) * .7548776662466927) % 1, v = (.5 + (n + 1) * .5698402909980532) % 1, rr = Math.sqrt(-2 * Math.log(1 - u));
      const d = I0 + sI * rr * Math.cos(2 * Math.PI * v), dR = R0 + sr * rr * Math.sin(2 * Math.PI * v);
      for (let i = 0; i < nI; i++) { const u = (d - cI[i]) / sI; GI[i] = Math.exp(-.5 * u * u); }
      if (wR) for (let j = 0; j < nR; j++) { const u = (dR - cR[j]) / sr; GR[j] = Math.exp(-.5 * u * u); }
      const [s, s2] = sum(FS, wR), [t, t2] = sum(FN, wR);
      x[n] = B0 + Math.log(s) - Math.log(t);
      minEff = Math.min(minEff, s * s / (s2 || 1e-300), t * t / (t2 || 1e-300));
    }
    const so = Float64Array.from(x).sort(), q = p => so[Math.floor(p * (NR - 1))], m = q(.5), lo = q(.05), hi = q(.95);
    const up = x.reduce((a, v) => a + (v > 2), 0) / NR, dn = x.reduce((a, v) => a + (v < -2), 0) / NR;
    PP.begin().frame('R_A (km)', 'I_A (10⁴⁵ g cm²)'); PP.clip(); planeBase(PP);
    const c = PP.ctx; c.save(); c.fillStyle = COL.S; c.globalAlpha = .16;
    if (wR) { c.beginPath(); c.ellipse(PP.X(R0), PP.Y(I0), Math.abs(PP.X(R0 + sr) - PP.X(R0)), Math.abs(PP.Y(I0 + sI) - PP.Y(I0)), 0, 0, 7); c.fill(); }
    else c.fillRect(PP.L, PP.Y(I0 + sI), PP.R - PP.L, PP.Y(I0 - sI) - PP.Y(I0 + sI)); c.restore();
    c.save(); c.strokeStyle = COL.S; c.lineWidth = 2; c.beginPath(); c.moveTo(PP.L, PP.Y(I0)); c.lineTo(PP.R, PP.Y(I0)); if (wR) { c.moveTo(PP.X(R0), PP.T); c.lineTo(PP.X(R0), PP.B); } c.stroke(); c.restore(); PP.unclip();
    const W = Math.max(4, Math.min(16, Math.ceil(Math.max(Math.abs(lo), Math.abs(hi)) * 1.5))), nb = 40, hh = new Float64Array(nb);
    x.forEach(v => { const b = Math.floor((v + W) / (2 * W) * nb); if (b >= 0 && b < nb) hh[b]++; });
    const ym = Math.max(...hh) * 1.15; PH.set('x', [-W, W]).set('y', [0, ym]).begin().frame('ln 𝓑 S/N', null);
    const cc = PH.ctx, bw = (PH.R - PH.L) / nb;
    cc.fillStyle = 'rgba(236,240,241,.7)'; hh.forEach((v, b) => { const yy = PH.Y(v); cc.fillRect(PH.L + b * bw + 1, yy, bw - 2, PH.B - yy); });
    [-2, 2].forEach(v => PH.vline(v, { color: COL.mid, dash: [4, 6], width: 1.3 })); PH.vline(m, { color: COL.S, dash: [1, 0], width: 2.4 });
    const warn = minEff < 12 ? ` · <b>${T('poucas amostras efetivas: valor só indicativo', 'few effective samples: indicative only')}</b>` : '';
    out.innerHTML = `${T('Mediana', 'Median')} <b>${sg(m, 1)}</b> · 5–95% <b>${sg(lo, 1)} ${T('a', 'to')} ${sg(hi, 1)}</b> · ln 𝓑 &gt; +2 <b>${Math.round(up * 100)}%</b> · ln 𝓑 &lt; −2 <b>${Math.round(dn * 100)}%</b>${warn}`;
  }
  onSlide(cp, draw);
})();
