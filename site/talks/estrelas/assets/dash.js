/* =====================================================================
   Animações e dashboards das Partes I a III
   Cada bloco procura o seu canvas pelo id e só roda se ele existir.
   (Partes IV e V: dash-pulsares.js e dash-buracos.js.)
   ===================================================================== */

/* --------------------------- utilitários --------------------------- */
const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(c => c === '-' ? '⁻' : SUPS[+c]).join('');
const fmt = (v, d = 2) => v.toFixed(d).replace('.', DEC);
/* número “de gente”: separador de milhar fino em PT, vírgula em EN */
const grp = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, T(' ', ','));
/* notação científica curta: 3,2×10¹⁴ (ou o número comum quando é razoável) */
function sci(v, d = 1) {
  if (v === 0 || !isFinite(v)) return String(v);
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return fmt(v, Math.max(0, d - e + (e < 0 ? 0 : 0)));
  const m = v / 10 ** e;
  return (m.toFixed(d) === '1' + (d ? '.' + '0'.repeat(d) : '') ? '' : fmt(m, d) + '×') + '10' + sup(e);
}
const deg = Math.PI / 180;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Laço de animação preso ao slide: roda só com o slide ativo; na visão geral
   e com prefers-reduced-motion desenha um quadro parado (still). */
const FF = +new URLSearchParams(location.search).get('ff') || 0;   // ?ff=10 adianta 10 s (testes e PDF)
function loopOn(cv, tick, still) {
  const slide = cv.closest('.slide');
  let raf = 0, last = 0, ff = FF;
  const overview = () => document.body.classList.contains('overview');
  function go() {
    cancelAnimationFrame(raf); raf = 0;
    if (overview()) { still(); return; }
    if (!slide.classList.contains('active')) return;
    if (reduceMotion) { still(); return; }
    for (; ff > 0; ff -= 1 / 30) tick(1 / 30);
    last = 0;
    const f = now => {
      if (!slide.classList.contains('active') || overview()) { raf = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      tick(dt); raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  }
  addEventListener('slidechange', go);
  addEventListener('stagefit', () => { if (overview()) still(); else if (!raf) go(); });
  return go;
}

/* Cor de um corpo negro e cor espectral, pelas funções de cor CIE 1931
   (ajuste analítico de Wyman, Sloan & Shirley 2013) → sRGB. */
const CMF = (() => {
  const g = (l, m, s1, s2) => { const t = (l - m) / (l < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
  return l => [
    1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
    0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
    1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
  ];
})();
function xyz2rgb([X, Y, Z]) {
  let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  const m = Math.max(r, g, b) || 1;
  const gam = c => { c /= m; return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)); };
  return [gam(r), gam(g), gam(b)];
}
/* B_λ(T) em unidades arbitrárias (λ em nm) */
const planckL = (l, T) => 1 / (l ** 5 * (Math.exp(1.4388e7 / (l * T)) - 1));
const bbColor = (() => {
  const cache = new Map();
  return T => {
    const k = Math.round(Math.log(T) * 200);
    if (cache.has(k)) return cache.get(k);
    let X = 0, Y = 0, Z = 0;
    for (let l = 380; l <= 780; l += 5) { const p = planckL(l, T), c = CMF(l); X += p * c[0]; Y += p * c[1]; Z += p * c[2]; }
    const rgb = xyz2rgb([X, Y, Z]); cache.set(k, rgb); return rgb;
  };
})();
const specColor = l => xyz2rgb(CMF(l));
const rgbs = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* ============================ PARTE I ============================ */

/* Massa de Jeans de um gás de H₂: λ_J = (πk_BT/Gρm)^½, M_J = (4π/3)λ_J³ρ,
   t_ff = (3π/32Gρ)^½. Uma curva por temperatura, ponto no par (n, T) escolhido. */
(() => {
  const cv = document.getElementById('jeans'); if (!cv) return;
  const kB = 1.380649e-23, G = 6.674e-11, m = 2 * 1.6735575e-27, Msun = 1.989e30, LY = 9.4607e15, YR = 3.156e7;
  const MJ = (T, n) => { const rho = n * 1e6 * m, lam = Math.sqrt(Math.PI * kB * T / (G * rho * m)); return { lam, M: 4 * Math.PI / 3 * lam ** 3 * rho / Msun, rho, tff: Math.sqrt(3 * Math.PI / (32 * G * rho)) }; };
  const out = document.getElementById('jeans-out');
  const P = new Plot(cv, { x: [10, 1e8], y: [0.05, 1e5], xlog: true, ylog: true, m: [24, 70, 70, 92], fs: 17 });
  const ns = logspace(10, 1e8, 120), Ts = [5, 10, 20, 50, 100];
  const getT = bindRange('jeans-T', v => fmt(10 ** v, 0) + ' K', draw);
  // densidade com expoente fracionário: mantissa × potência de dez
  const nLabel = v => { const n = 10 ** v, e = Math.floor(v + 1e-9), mnt = n / 10 ** e; return (mnt < 1.05 ? '' : fmt(mnt, 1) + '×') + '10' + sup(e) + ' ' + T('moléculas/cm³', 'molecules/cm³'); };
  const getN = bindRange('jeans-n', nLabel, draw);
  function draw() {
    const T0 = 10 ** getT(), n0 = 10 ** getN();
    P.begin().frame(T('densidade (moléculas de H₂ por cm³)', 'density (H₂ molecules per cm³)'), T('massa de Jeans (M☉)', 'Jeans mass (M☉)'));
    P.clip();
    P.hline(1, { color: 'rgba(255,184,107,.55)', label: T('1 M☉', '1 M☉'), align: 'left' });
    Ts.forEach(t => {
      P.line(ns, ns.map(n => MJ(t, n).M), { color: 'rgba(255,143,171,.35)', width: 1.5 });
      const nl = 3e7, yl = MJ(t, nl).M;
      if (yl > 0.06) P.text(nl, yl * 1.5, t + ' K', { color: COL.text3, size: 15, align: 'center' });
    });
    P.line(ns, ns.map(n => MJ(T0, n).M), { color: COL.neb, width: 3.5, glow: 12 });
    P.unclip();
    const r = MJ(T0, n0);
    P.dot(n0, r.M, { color: '#fff', r: 7, glow: 22 });
    // faixas típicas
    const c = P.ctx; c.save(); c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'center';
    [[1e2, 1e3, T('nuvem difusa', 'diffuse cloud')], [1e4, 1e6, T('núcleo denso', 'dense core')]].forEach(([a, b, s]) => {
      c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(P.X(a), P.T, P.X(b) - P.X(a), P.B - P.T);
      c.fillStyle = COL.text3; c.fillText(s, (P.X(a) + P.X(b)) / 2, P.T + 18);
    });
    c.restore();
    const tff = r.tff / YR;
    out.innerHTML = `<span>λ<sub>J</sub> <b>${fmt(r.lam / LY, r.lam / LY < 1 ? 2 : 1)} ${T('anos-luz', 'light-years')}</b></span>
      <span>M<sub>J</sub> <b>${r.M >= 100 ? grp(r.M) : fmt(r.M, r.M < 1 ? 2 : 1)} M☉</b></span>
      <span>ρ <b>${sci(r.rho / 1000, 1)} g/cm³</b></span>
      <span>${T('queda livre', 'free fall')} <b>${tff >= 1e6 ? fmt(tff / 1e6, 1) + T(' milhões de anos', ' million years') : grp(tff / 1e3) + T(' mil anos', ' thousand years')}</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Colapso e fragmentação: N corpos em 2D com gravidade amolecida (G = 1, massa
   total 1, raio 1), integrador leapfrog. Onde a densidade passa de um limiar
   nasce uma “protoestrela” (partícula sumidouro) que engole o gás ligado em volta.
   Ilustração: sem pressão, sem radiação, sem campo magnético. */
(() => {
  const cv = document.getElementById('colapso'); if (!cv) return;
  const out = document.getElementById('colapso-out');
  const N = 900, EPS2 = 0.022 ** 2, DT = 0.0035, TEND = 2.6, HOLD = 2.5;
  let x, y, vx, vy, ax, ay, alive, mass, sinks, t, hold, seed;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function reset() {
    seed = (Math.random() * 1e9) >>> 0;
    x = new Float64Array(N); y = new Float64Array(N); vx = new Float64Array(N); vy = new Float64Array(N);
    ax = new Float64Array(N); ay = new Float64Array(N); alive = new Uint8Array(N).fill(1); mass = 1 / N;
    // nuvem grumosa: uns 14 caroços de densidade sobre um fundo uniforme, giro lento
    const K = 14, cx = [], cy = [];
    for (let k = 0; k < K; k++) { const r = Math.sqrt(rnd()) * 0.85, a = rnd() * 6.283; cx.push(r * Math.cos(a)); cy.push(r * Math.sin(a)); }
    for (let i = 0; i < N; i++) {
      let px, py;
      if (rnd() < 0.55) { const k = Math.floor(rnd() * K), r = 0.11 * Math.sqrt(-2 * Math.log(rnd() + 1e-9)), a = rnd() * 6.283; px = cx[k] + r * Math.cos(a); py = cy[k] + r * Math.sin(a); }
      else { const r = Math.sqrt(rnd()), a = rnd() * 6.283; px = r * Math.cos(a); py = r * Math.sin(a); }
      x[i] = px; y[i] = py;
      const om = 0.35, s = 0.06;
      vx[i] = -om * py + s * (rnd() - 0.5); vy[i] = om * px + s * (rnd() - 0.5);
    }
    sinks = []; t = 0; hold = 0; accel();
  }
  function accel() {
    ax.fill(0); ay.fill(0);
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      const xi = x[i], yi = y[i]; let axi = ax[i], ayi = ay[i];
      for (let j = i + 1; j < N; j++) {
        if (!alive[j]) continue;
        const dx = x[j] - xi, dy = y[j] - yi, r2 = dx * dx + dy * dy + EPS2, f = mass / (r2 * Math.sqrt(r2));
        axi += f * dx; ayi += f * dy; ax[j] -= f * dx; ay[j] -= f * dy;
      }
      for (const s of sinks) { const dx = s.x - xi, dy = s.y - yi, r2 = dx * dx + dy * dy + EPS2, f = s.m / (r2 * Math.sqrt(r2)); axi += f * dx; ayi += f * dy; }
      ax[i] = axi; ay[i] = ayi;
    }
    for (const s of sinks) {
      s.ax = 0; s.ay = 0;
      for (let i = 0; i < N; i++) { if (!alive[i]) continue; const dx = x[i] - s.x, dy = y[i] - s.y, r2 = dx * dx + dy * dy + EPS2, f = mass / (r2 * Math.sqrt(r2)); s.ax += f * dx; s.ay += f * dy; }
      for (const o of sinks) { if (o === s) continue; const dx = o.x - s.x, dy = o.y - s.y, r2 = dx * dx + dy * dy + EPS2, f = o.m / (r2 * Math.sqrt(r2)); s.ax += f * dx; s.ay += f * dy; }
    }
  }
  // grade para achar regiões densas
  const GR = 48, cell = new Int32Array(GR * GR);
  function formSinks() {
    cell.fill(0);
    const idx = (px, py) => { const gx = Math.floor((px + 1.3) / 2.6 * GR), gy = Math.floor((py + 1.3) / 2.6 * GR); return gx < 0 || gy < 0 || gx >= GR || gy >= GR ? -1 : gy * GR + gx; };
    for (let i = 0; i < N; i++) if (alive[i]) { const k = idx(x[i], y[i]); if (k >= 0) cell[k]++; }
    for (let k = 0; k < GR * GR; k++) {
      if (cell[k] < 13) continue;
      const gx = k % GR, gy = (k / GR) | 0, X = (gx + 0.5) / GR * 2.6 - 1.3, Y = (gy + 0.5) / GR * 2.6 - 1.3;
      if (sinks.some(s => (s.x - X) ** 2 + (s.y - Y) ** 2 < 0.16 ** 2)) continue;
      let mx = 0, my = 0, px = 0, py = 0, n = 0;
      for (let i = 0; i < N; i++) if (alive[i] && (x[i] - X) ** 2 + (y[i] - Y) ** 2 < 0.045 ** 2) { mx += x[i]; my += y[i]; px += vx[i]; py += vy[i]; n++; alive[i] = 0; }
      if (n) sinks.push({ x: mx / n, y: my / n, vx: px / n, vy: py / n, m: n * mass, ax: 0, ay: 0, born: t, flash: 1 });
    }
  }
  function accrete() {
    for (const s of sinks) {
      const ra = 0.03 + 0.05 * Math.cbrt(s.m);
      for (let i = 0; i < N; i++) {
        if (!alive[i]) continue;
        const dx = x[i] - s.x, dy = y[i] - s.y, r2 = dx * dx + dy * dy;
        if (r2 > ra * ra) continue;
        const dv2 = (vx[i] - s.vx) ** 2 + (vy[i] - s.vy) ** 2;
        if (0.5 * dv2 > s.m / Math.sqrt(r2 + EPS2)) continue;           // só o gás ligado
        const M = s.m + mass; s.vx = (s.vx * s.m + vx[i] * mass) / M; s.vy = (s.vy * s.m + vy[i] * mass) / M; s.m = M; alive[i] = 0;
      }
    }
    // protoestrelas muito próximas se fundem
    for (let a = 0; a < sinks.length; a++) for (let b = sinks.length - 1; b > a; b--) {
      const A = sinks[a], B = sinks[b];
      if ((A.x - B.x) ** 2 + (A.y - B.y) ** 2 < 0.02 ** 2) { const M = A.m + B.m; A.x = (A.x * A.m + B.x * B.m) / M; A.y = (A.y * A.m + B.y * B.m) / M; A.vx = (A.vx * A.m + B.vx * B.m) / M; A.vy = (A.vy * A.m + B.vy * B.m) / M; A.m = M; sinks.splice(b, 1); }
    }
  }
  function step() {
    for (let i = 0; i < N; i++) if (alive[i]) { vx[i] += 0.5 * DT * ax[i]; vy[i] += 0.5 * DT * ay[i]; x[i] += DT * vx[i]; y[i] += DT * vy[i]; }
    for (const s of sinks) { s.vx += 0.5 * DT * s.ax; s.vy += 0.5 * DT * s.ay; s.x += DT * s.vx; s.y += DT * s.vy; }
    accel();
    for (let i = 0; i < N; i++) if (alive[i]) { vx[i] += 0.5 * DT * ax[i]; vy[i] += 0.5 * DT * ay[i]; }
    for (const s of sinks) { s.vx += 0.5 * DT * s.ax; s.vy += 0.5 * DT * s.ay; }
    t += DT;
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const S = Math.min(w, h) / 2.7, cx = w / 2, cy = h / 2;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      const X = cx + x[i] * S, Y = cy + y[i] * S;
      if (X < -10 || Y < -10 || X > w + 10 || Y > h + 10) continue;
      c.fillStyle = 'rgba(255,143,171,.20)'; c.beginPath(); c.arc(X, Y, 5, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,205,180,.55)'; c.fillRect(X - 1, Y - 1, 2, 2);
    }
    for (const s of sinks) {
      const X = cx + s.x * S, Y = cy + s.y * S, R = 6 + 60 * Math.sqrt(s.m);
      const g = c.createRadialGradient(X, Y, 0, X, Y, R * 2.2);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.18, 'rgba(255,214,150,.75)'); g.addColorStop(0.5, 'rgba(255,184,107,.20)'); g.addColorStop(1, 'rgba(255,184,107,0)');
      c.fillStyle = g; c.beginPath(); c.arc(X, Y, R * 2.2, 0, 7); c.fill();
      if (s.flash > 0) { c.strokeStyle = `rgba(255,255,255,${s.flash * 0.6})`; c.lineWidth = 2; c.beginPath(); c.arc(X, Y, R * (3 - 2 * s.flash), 0, 7); c.stroke(); }
    }
    c.globalCompositeOperation = 'source-over';
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T('ilustração em 2D · gravidade amolecida, sem pressão', '2D illustration · softened gravity, no pressure'), 12, 10);
    const inStars = sinks.reduce((a, s) => a + s.m, 0);
    out.innerHTML = `<span>${T('tempo', 'time')} <b>${fmt(t / 0.9, 1)} t<sub>ff</sub></b></span>
      <span>${T('protoestrelas', 'protostars')} <b>${sinks.length}</b></span>
      <span>${T('gás já nas protoestrelas', 'gas already in protostars')} <b>${Math.round(100 * inStars)}%</b></span>`;
  }
  function tick(dt) {
    if (t < TEND) { for (let k = 0; k < 2; k++) step(); formSinks(); accrete(); }
    else { hold += dt; if (hold > HOLD) reset(); }
    sinks.forEach(s => { s.flash = Math.max(0, s.flash - dt * 1.2); });
    render();
  }
  function still() { reset(); while (t < 1.3) { step(); step(); formSinks(); accrete(); } sinks.forEach(s => (s.flash = 0)); render(); }
  reset();
  const go = loopOn(cv, tick, still);
  document.getElementById('colapso-btn').addEventListener('click', () => { reset(); go(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* Corpo negro: B_λ(T) normalizada ao próprio pico, a faixa visível colorida,
   a cor que o olho veria (integral com as funções de cor CIE) e a escala OBAFGKM. */
(() => {
  const cv = document.getElementById('planck'); if (!cv) return;
  const out = document.getElementById('planck-out'), el = document.getElementById('planck-T');
  const P = new Plot(cv, { x: [80, 2500], y: [0, 1.12], m: [24, 34, 170, 70], fs: 17, yticks: [0, 0.5, 1] });
  const ls = linspace(80, 2500, 500);
  const CLS = [['O', 30000, 50000], ['B', 10000, 30000], ['A', 7500, 10000], ['F', 6000, 7500], ['G', 5200, 6000], ['K', 3700, 5200], ['M', 2000, 3700]];
  const EX = [[T('Rigel', 'Rigel'), 12100], [T('Sírius', 'Sirius'), 9940], [T('Sol', 'Sun'), 5772], [T('Betelgeuse', 'Betelgeuse'), 3600]];
  const classOf = T0 => (CLS.find(([, a, b]) => T0 >= a && T0 < b) || CLS[0])[0];
  let strip = null;
  const getT = bindRange('planck-T', v => grp(10 ** v) + ' K', draw);
  function draw() {
    const T0 = 10 ** getT(), lmax = 2.8978e6 / T0, pk = planckL(lmax, T0), y = ls.map(l => planckL(l, T0) / pk);
    P.begin().frame(T('comprimento de onda (nm)', 'wavelength (nm)'), T('intensidade (relativa ao pico)', 'intensity (relative to peak)'));
    const c = P.ctx;
    // faixas UV / IV
    c.save(); c.font = `15px ${FONT}`; c.textBaseline = 'top';
    c.fillStyle = 'rgba(158,140,255,.06)'; c.fillRect(P.X(80), P.T, P.X(380) - P.X(80), P.B - P.T);
    c.fillStyle = 'rgba(255,122,138,.05)'; c.fillRect(P.X(750), P.T, P.X(2500) - P.X(750), P.B - P.T);
    c.fillStyle = COL.text3; c.textAlign = 'center'; c.fillText(T('ultravioleta', 'ultraviolet'), P.X(230), P.T + 6); c.fillText(T('infravermelho', 'infrared'), P.X(1600), P.T + 6);
    c.restore();
    // área sob a curva: arco-íris no visível
    for (let i = 1; i < ls.length; i++) {
      const l = ls[i], vis = l >= 380 && l <= 750, col = vis ? specColor(l) : [120, 128, 150];
      c.fillStyle = rgbs(col, vis ? 0.75 : 0.18);
      const x0 = P.X(ls[i - 1]), x1 = P.X(l) + 0.6;
      c.beginPath(); c.moveTo(x0, P.Y(0)); c.lineTo(x0, P.Y(y[i - 1])); c.lineTo(x1, P.Y(y[i])); c.lineTo(x1, P.Y(0)); c.closePath(); c.fill();
    }
    // curva do Sol (forma) para comparar
    const pkS = planckL(2.8978e6 / 5772, 5772);
    P.line(ls, ls.map(l => planckL(l, 5772) / pkS), { color: 'rgba(255,255,255,.45)', width: 1.6, dash: [6, 6] });
    P.text(1150, planckL(1150, 5772) / pkS + 0.05, T('Sol (tracejado)', 'Sun (dashed)'), { color: COL.text3, size: 15 });
    const bc = bbColor(T0);
    P.line(ls, y, { color: rgbs(bc), width: 3.5, glow: 14 });
    if (lmax >= 80 && lmax <= 2500) P.vline(lmax, { color: 'rgba(255,255,255,.5)', label: 'λ' + T('máx', 'max') + ' = ' + grp(lmax) + ' nm', y: P.T + 30 });
    // a estrela
    const sx = P.R - 70, sy = P.T + 80, g = c.createRadialGradient(sx, sy, 0, sx, sy, 70);
    g.addColorStop(0, '#fff'); g.addColorStop(0.32, rgbs(bc)); g.addColorStop(0.62, rgbs(bc, 0.35)); g.addColorStop(1, rgbs(bc, 0));
    c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 70, 0, 7); c.fill();
    c.fillStyle = COL.text; c.font = `400 30px ${SERIF}`; c.textAlign = 'center'; c.fillText(T('classe ', 'class ') + classOf(T0), sx, sy + 92);
    // escala de classes
    const y0 = P.B + 62, H = 34, lx = t => P.L + (Math.log10(40000) - Math.log10(t)) / (Math.log10(40000) - Math.log10(2400)) * (P.R - P.L);
    strip = { y0, H, lx };
    for (let i = 0; i <= 160; i++) {
      const t0 = 10 ** lerp(Math.log10(40000), Math.log10(2400), i / 160), t1 = 10 ** lerp(Math.log10(40000), Math.log10(2400), (i + 1) / 160);
      c.fillStyle = rgbs(bbColor(t0), 0.9); c.fillRect(lx(t0), y0, lx(t1) - lx(t0) + 0.8, H);
    }
    c.font = `600 17px ${FONT}`; c.textBaseline = 'middle';
    CLS.forEach(([n, a, b]) => {
      const xa = lx(Math.min(b, 40000)), xb = lx(Math.max(a, 2400));
      c.fillStyle = 'rgba(7,8,14,.75)'; c.fillText(n, (xa + xb) / 2, y0 + H / 2);
      c.fillStyle = 'rgba(7,8,14,.5)'; c.fillRect(xb - 0.5, y0, 1, H);
    });
    c.font = `14px ${FONT}`; c.fillStyle = COL.text3; c.textBaseline = 'top';
    EX.forEach(([n, t0]) => { const X = lx(t0); c.fillRect(X - 0.5, y0 + H, 1, 7); c.fillText(n, X, y0 + H + 9); });
    const X = lx(clamp(T0, 2400, 40000));
    c.fillStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 10; c.beginPath(); c.moveTo(X, y0 - 3); c.lineTo(X - 8, y0 - 15); c.lineTo(X + 8, y0 - 15); c.closePath(); c.fill(); c.shadowBlur = 0;
    const where = lmax < 380 ? T('no ultravioleta', 'in the ultraviolet') : lmax > 750 ? T('no infravermelho', 'in the infrared') : T('no visível', 'in the visible');
    out.innerHTML = `<span>λ<sub>${T('máx', 'max')}</sub> <b>${grp(lmax)} nm</b> ${where}</span>
      <span>${T('classe', 'class')} <b>${classOf(T0)}</b></span>
      <span>${T('brilho por m², relativo ao Sol', 'brightness per m², relative to the Sun')} <b>${sci((T0 / 5772) ** 4, 2)}×</b></span>`;
  }
  cv.addEventListener('pointerdown', e => {
    if (!strip) return;
    const [px, py] = canvasPoint(cv, e);
    if (py < strip.y0 - 20 || py > strip.y0 + strip.H + 30) return;
    const f = clamp((px - P.L) / (P.R - P.L), 0, 1), lt = lerp(Math.log10(40000), Math.log10(2400), f);
    el.value = clamp(lt, +el.min, +el.max); el.dispatchEvent(new Event('input'));
  });
  onSlide(cv, draw);
})();

/* Diagrama H–R: eixos comuns (temperatura crescendo para a esquerda). */
function hrPlot(cv, yr, fs = 17) {
  return new Plot(cv, {
    x: [45000, 2300], y: yr, xlog: true, ylog: true, m: [22, 26, 70, 92], fs,
    xticks: [30000, 10000, 6000, 3000], xfmt: v => grp(v),
    yfmt: v => { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : '10' + sup(e); },
  });
}
/* sequência principal de idade zero, aproximada: L(M) por partes e R ≈ M^0,8 */
const lumOf = M => M < 0.43 ? 0.23 * M ** 2.3 : M < 2 ? M ** 4 : M < 55 ? 1.4 * M ** 3.5 : 32000 * M;
const teffOf = M => 5772 * (lumOf(M) / (M < 1 ? M ** 0.9 : M ** 0.8) ** 2) ** 0.25;
function drawMS(P) {
  const Ms = logspace(0.1, 60, 80);
  P.clip();
  P.line(Ms.map(teffOf), Ms.map(lumOf), { color: 'rgba(255,255,255,.10)', width: 26 });
  P.line(Ms.map(teffOf), Ms.map(lumOf), { color: 'rgba(255,255,255,.22)', width: 1.5 });
  P.unclip();
}
/* interpola uma trilha [[T, L, t, rótulo?], …] no parâmetro s ∈ [0, n−1] (log em T e L) */
function trackAt(tr, s) {
  const i = clamp(Math.floor(s), 0, tr.length - 2), u = clamp(s - i, 0, 1), a = tr[i], b = tr[i + 1];
  return { T: 10 ** lerp(Math.log10(a[0]), Math.log10(b[0]), u), L: 10 ** lerp(Math.log10(a[1]), Math.log10(b[1]), u), i, u };
}
function drawStar(c, X, Y, T0, r, alpha = 1) {
  const col = bbColor(T0), g = c.createRadialGradient(X, Y, 0, X, Y, r * 2.6);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`); g.addColorStop(0.28, rgbs(col, alpha)); g.addColorStop(0.55, rgbs(col, 0.3 * alpha)); g.addColorStop(1, rgbs(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(X, Y, r * 2.6, 0, 7); c.fill();
}

/* Da protoestrela à sequência principal: trilhas de Hayashi (quase verticais) e
   Henyey (quase horizontais), esquemáticas, para 1, 3 e 10 M☉. A protoestrela
   corre a trilha; enquanto está no casulo de poeira, só “aparece” no infravermelho. */
(() => {
  const cv = document.getElementById('preseq'); if (!cv) return;
  const out = document.getElementById('preseq-out');
  const P = hrPlot(cv, [0.03, 3e4]);
  // [T, L, idade (anos)] — pontos aproximados (Iben 1965 e trilhas modernas), esquemáticos
  const TR = [
    { M: 1, tr: [[3900, 30, 1e5], [4100, 5, 1e6], [4300, 1.2, 5e6], [4500, 0.6, 1e7], [5200, 0.9, 2.5e7], [5650, 0.75, 4e7]], cocoon: 0.25 },
    { M: 3, tr: [[4100, 300, 3e4], [4400, 60, 2e5], [5200, 60, 6e5], [9000, 75, 1.5e6], [12500, 80, 2.5e6]], cocoon: 0.25 },
    { M: 10, tr: [[4500, 6000, 1e4], [8000, 5500, 4e4], [16000, 5300, 8e4], [25000, 5700, 1.5e5]], cocoon: 0.3 },
  ];
  const DUR = 9, HOLD = 1.6;
  let k = 0, s = 0, hold = 0;
  const fmtAge = a => a >= 1e6 ? fmt(a / 1e6, a < 1e7 ? 1 : 0) + T(' milhões de anos', ' million years') : grp(a / 1e3) + T(' mil anos', ' thousand years');
  function render() {
    P.begin().frame(T('temperatura da superfície (K)', 'surface temperature (K)'), T('luminosidade (L☉)', 'luminosity (L☉)'));
    drawMS(P);
    P.text(30000, 4000, T('sequência principal', 'main sequence'), { color: COL.text3, size: 15 });
    TR.forEach((o, j) => {
      const xs = o.tr.map(p => p[0]), ys = o.tr.map(p => p[1]);
      P.line(xs, ys, { color: j === k ? 'rgba(255,143,171,.65)' : 'rgba(255,143,171,.2)', width: j === k ? 2.2 : 1.4, dash: [7, 6] });
      const z = o.tr[o.tr.length - 1]; P.dot(z[0], z[1], { color: 'rgba(255,255,255,.5)', r: 3, glow: 0 });
      P.text(o.tr[0][0] * 0.93, o.tr[0][1] * 1.25, o.M + ' M☉', { color: j === k ? COL.text2 : COL.text3, size: 16 });
    });
    const o = TR[k], tr = o.tr, n = tr.length - 1, f = s / n, p = trackAt(tr, s);
    const age = 10 ** lerp(Math.log10(tr[p.i][2]), Math.log10(tr[p.i + 1][2]), p.u);
    const inCocoon = f < o.cocoon, onMS = f >= 0.999;
    const X = P.X(p.T), Y = P.Y(p.L), c = P.ctx;
    const R = Math.sqrt(p.L) / (p.T / 5772) ** 2;
    const r = clamp(6 + 5 * Math.log10(1 + R), 6, 22);
    if (inCocoon) {
      const g = c.createRadialGradient(X, Y, 0, X, Y, 46); g.addColorStop(0, 'rgba(255,90,70,.75)'); g.addColorStop(0.4, 'rgba(160,50,60,.35)'); g.addColorStop(1, 'rgba(120,40,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(X, Y, 46, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,143,171,.55)'; c.setLineDash([3, 5]); c.lineWidth = 1.5; c.beginPath(); c.arc(X, Y, 30 + 3 * Math.sin(performance.now() / 300), 0, 7); c.stroke(); c.setLineDash([]);
    } else drawStar(c, X, Y, p.T, r);
    if (onMS) { c.strokeStyle = `rgba(255,255,255,${0.7 * Math.max(0, 1 - hold / HOLD)})`; c.lineWidth = 2; c.beginPath(); c.arc(X, Y, r + 30 * hold, 0, 7); c.stroke(); }
    const phase = inCocoon ? T('no casulo de poeira: só no infravermelho', 'inside its dust cocoon: infrared only') : onMS ? T('o hidrogênio acende: sequência principal', 'hydrogen ignites: main sequence')
      : f < 0.6 && k < 2 ? T('visível, contraindo (Hayashi)', 'visible, contracting (Hayashi)') : T('esquentando a L quase constante (Henyey)', 'heating at nearly constant L (Henyey)');
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'right'; c.textBaseline = 'top';
    c.fillText(T('trilhas esquemáticas', 'schematic tracks'), P.R - 6, P.T + 4);
    out.innerHTML = `<span>${T('massa', 'mass')} <b>${o.M} M☉</b></span><span>${T('idade', 'age')} <b>${fmtAge(age)}</b></span>
      <span>T <b>${grp(p.T)} K</b></span><span>L <b>${p.L >= 10 ? grp(p.L) : fmt(p.L, 1)} L☉</b></span><span>${T('fase', 'phase')} <b>${phase}</b></span>`;
  }
  function tick(dt) {
    const n = TR[k].tr.length - 1;
    if (s < n) s = Math.min(n, s + dt * n / DUR);
    else { hold += dt; if (hold > HOLD) { hold = 0; s = 0; k = (k + 1) % TR.length; } }
    render();
  }
  loopOn(cv, tick, () => { k = 0; s = TR[0].tr.length - 1.6; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* ============================ PARTE II ============================ */

/* Equilíbrio hidrostático: em cada camada, gravidade (∝ 1/R²) contra o gradiente
   de pressão (adiabático, γ = 5/3: ∝ 1/R⁴). Perturbada, a estrela oscila em
   torno do equilíbrio e volta. Esquemático: período e amplitude exagerados. */
(() => {
  const cv = document.getElementById('equilibrio'); if (!cv) return;
  const out = document.getElementById('equilibrio-out');
  let t = 0;
  // perturbação: comprime, solta (oscilação amortecida), descansa; depois expande
  const CYC = 12;
  const xOf = t => { const u = t % CYC, s = Math.floor(t / CYC) % 2 ? 1 : -1; return u < 1.2 ? 0 : s * 0.16 * Math.exp(-(u - 1.2) / 3.2) * Math.cos(2 * Math.PI * (u - 1.2) / 2.6); };
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const x = xOf(t), Rr = 1 + x, cx = w * 0.42, cy = h / 2, R0 = Math.min(w * 0.36, h * 0.40), R = R0 * Rr;
    const Tc = 1 / Rr, fus = Tc ** 4 / Rr ** 3;                 // T_c ∝ 1/R (virial); taxa pp ∝ ρT⁴
    // estrela: camadas
    for (let k = 5; k >= 1; k--) {
      const r = R * k / 5, heat = (1 - k / 6) * Tc;
      const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, `rgba(255,${Math.round(clamp(200 + 40 * heat, 0, 255))},${Math.round(clamp(120 + 80 * heat, 0, 255))},${0.10 + 0.08 * heat})`);
      g.addColorStop(1, `rgba(255,140,80,${0.05 + 0.05 * heat})`);
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,184,107,.18)'; c.lineWidth = 1; c.stroke();
    }
    const core = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.28);
    core.addColorStop(0, `rgba(255,255,255,${clamp(0.55 + 0.9 * (fus - 1), 0.2, 1)})`); core.addColorStop(1, 'rgba(255,220,160,0)');
    c.fillStyle = core; c.beginPath(); c.arc(cx, cy, R * 0.28, 0, 7); c.fill();
    // setas em três raios
    const arrow = (x0, y0, x1, y1, col, wdt) => {
      const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); if (L < 3) return;
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = wdt; c.shadowColor = col; c.shadowBlur = 8;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - 9 * Math.cos(a), y1 - 9 * Math.sin(a)); c.stroke();
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - 13 * Math.cos(a - 0.4), y1 - 13 * Math.sin(a - 0.4)); c.lineTo(x1 - 13 * Math.cos(a + 0.4), y1 - 13 * Math.sin(a + 0.4)); c.closePath(); c.fill();
      c.shadowBlur = 0;
    };
    const fg = 1 / Rr ** 2, fp = 1 / Rr ** 4, base = R0 * 0.13;
    [0.45, 0.72, 0.97].forEach((q, j) => {
      const n = 10 + 4 * j;
      for (let i = 0; i < n; i++) {
        const a = i / n * 2 * Math.PI + j * 0.2, r = R * q, X = cx + r * Math.cos(a), Y = cy + r * Math.sin(a), ux = Math.cos(a), uy = Math.sin(a);
        arrow(X, Y, X - ux * base * fg, Y - uy * base * fg, 'rgba(158,140,255,.85)', 2);
        arrow(X + ux * 4, Y + uy * 4, X + ux * (4 + base * fp), Y + uy * (4 + base * fp), 'rgba(255,184,107,.85)', 2);
      }
    });
    // legenda
    const lx = w * 0.80, ly = h * 0.22;
    c.font = `17px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'left';
    arrow(lx, ly, lx + 46, ly, 'rgba(158,140,255,.95)', 2.5); c.fillStyle = COL.text2; c.fillText(T('gravidade', 'gravity'), lx + 58, ly);
    arrow(lx, ly + 38, lx + 46, ly + 38, 'rgba(255,184,107,.95)', 2.5); c.fillStyle = COL.text2; c.fillText(T('pressão', 'pressure'), lx + 58, ly + 38);
    const net = fp - fg, st = Math.abs(x) < 0.004 ? T('equilíbrio', 'balance') : net > 0 ? T('a pressão vence: expande', 'pressure wins: expands') : T('a gravidade vence: contrai', 'gravity wins: contracts');
    c.font = `400 30px ${SERIF}`; c.fillStyle = Math.abs(x) < 0.004 ? COL.text : net > 0 ? COL.sol : COL.bn;
    c.fillText(st, lx - 10, h * 0.5);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T('esquemático · amplitude e ritmo exagerados', 'schematic · amplitude and pace exaggerated'), 10, 8);
    out.innerHTML = `<span>${T('raio', 'radius')} <b>${fmt(Rr, 2)} R₀</b></span><span>${T('temperatura central', 'central temperature')} <b>${fmt(Tc, 2)}×</b></span>
      <span>${T('ritmo da fusão (∝ ρT⁴)', 'fusion rate (∝ ρT⁴)')} <b>${fmt(fus, 2)}×</b></span>`;
  }
  loopOn(cv, dt => { t += dt; render(); }, () => { t = 1.2 + 0.3; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* Massa, luminosidade e tempo de vida na sequência principal:
   L(M) por partes (0,23 M^2,3; M^4; 1,4 M^3,5; 32 000 M) e t = 10¹⁰ anos · M/L. */
(() => {
  const cv = document.getElementById('vida'); if (!cv) return;
  const out = document.getElementById('vida-out');
  const life = M => 1e10 * M / lumOf(M);
  const Ms = logspace(0.1, 60, 200);
  const PL = new Plot(cv, { x: [0.1, 60], y: [1e-3, 3e6], xlog: true, ylog: true, m: [20, 30, 0, 96], fs: 16 });
  const PT = new Plot(cv, { x: [0.1, 60], y: [1e6, 1e13], xlog: true, ylog: true, m: [0, 30, 60, 96], fs: 16 });
  const getM = bindRange('vida-M', v => fmt(10 ** v, 10 ** v < 1 ? 2 : 1) + ' M☉', draw);
  const yf = v => { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : '10' + sup(e); };
  PL.o.yfmt = yf; PT.o.yfmt = yf; PL.o.xfmt = () => ''; PT.o.xfmt = v => String(+v.toPrecision(2)).replace('.', DEC);
  PL.o.xticks = PT.o.xticks = [0.1, 0.3, 1, 3, 10, 30];
  PL.o.yticks = [1e-2, 1, 1e2, 1e4, 1e6]; PT.o.yticks = [1e6, 1e8, 1e10, 1e12];
  function draw() {
    const M = 10 ** getM();
    const { ctx, w, h } = fitCanvas(cv);
    const half = h * 0.5;
    Object.assign(PL, { ctx, w, h, L: 96, R: w - 30, T: 20, B: half - 16 });
    Object.assign(PT, { ctx, w, h, L: 96, R: w - 30, T: half + 16, B: h - 60 });
    PL.frame(null, T('luminosidade (L☉)', 'luminosity (L☉)'));
    PT.frame(T('massa da estrela (M☉)', 'stellar mass (M☉)'), T('vida (anos)', 'lifetime (years)'));
    PL.clip().line(Ms, Ms.map(lumOf), { color: COL.sol, width: 3.5, glow: 10 }).unclip();
    PT.clip();
    PT.hline(1.38e10, { color: 'rgba(255,255,255,.4)', label: T('idade do Universo', 'age of the Universe'), align: 'right' });
    PT.line(Ms, Ms.map(life), { color: COL.psr, width: 3.5, glow: 10 }).unclip();
    PL.vline(M, { color: 'rgba(255,255,255,.35)', dash: [4, 6] }); PT.vline(M, { color: 'rgba(255,255,255,.35)', dash: [4, 6] });
    PL.dot(M, lumOf(M), { color: '#fff', r: 7, glow: 18 }); PT.dot(M, life(M), { color: '#fff', r: 7, glow: 18 });
    PL.dot(1, 1, { color: COL.sol, r: 4, glow: 0 }); PL.text(1.12, 0.45, T('Sol', 'Sun'), { color: COL.text3, size: 15 });
    const L = lumOf(M), tl = life(M);
    const tlS = tl >= 1e12 ? fmt(tl / 1e12, 1) + T(' trilhões de anos', ' trillion years') : tl >= 1e9 ? fmt(tl / 1e9, 1) + T(' bilhões de anos', ' billion years') : grp(tl / 1e6) + T(' milhões de anos', ' million years');
    out.innerHTML = `<span>${T('massa', 'mass')} <b>${fmt(M, M < 1 ? 2 : 1)} M☉</b></span><span>${T('luminosidade', 'luminosity')} <b>${L >= 100 ? grp(L) : fmt(L, L < 0.1 ? 3 : 2)} L☉</b></span>
      <span>${T('vida na sequência principal', 'main-sequence lifetime')} <b>${tlS}</b></span><span>${T('superfície', 'surface')} <b>~${grp(Math.round(teffOf(M) / 100) * 100)} K</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Evolução depois da sequência principal, no diagrama H–R, e o que acontece no
   núcleo. Pontos típicos (esquemáticos) para 1 e 15 M☉; durações reais nos rótulos. */
(() => {
  const cv = document.getElementById('hr-evol'); if (!cv) return;
  const cvC = document.getElementById('hr-core'), out = document.getElementById('hr-out');
  const P = hrPlot(cv, [1e-4, 1e6]);
  // [T, L, fase, duração, camadas do núcleo (de dentro para fora: [elemento, raio relativo, queimando?])]
  const H = 'H', He = 'He', C = 'C/O', O = 'O/Ne', Si = 'Si', Fe = 'Fe';
  const TRK = {
    1: [
      [5600, 0.7, T('sequência principal: H → He no centro', 'main sequence: H → He in the core'), T('10 bilhões de anos', '10 billion years'), [[He, 0.05, 1], [H, 1, 0]]],
      [5800, 1.8, T('o H do centro acaba', 'core hydrogen runs out'), '', [[He, 0.3, 0], [H, 1, 0]]],
      [5000, 3, T('subgigante: H queima numa casca', 'subgiant: H burns in a shell'), T('~1 bilhão de anos', '~1 billion years'), [[He, 0.32, 0], [H, 0.38, 1], [H, 1, 0]]],
      [4400, 30, T('gigante vermelha', 'red giant'), '', [[He, 0.36, 0], [H, 0.42, 1], [H, 1, 0]]],
      [3200, 2500, T('ponta do ramo das gigantes: o He acende (flash)', 'tip of the giant branch: helium ignites (flash)'), '', [[He, 0.4, 1], [H, 0.46, 1], [H, 1, 0]]],
      [4800, 45, T('ramo horizontal: He → C, O no centro', 'horizontal branch: He → C, O in the core'), T('~100 milhões de anos', '~100 million years'), [[C, 0.12, 0], [He, 0.36, 1], [H, 0.44, 1], [H, 1, 0]]],
      [3300, 1500, T('ramo assintótico: duas cascas queimando', 'asymptotic giant branch: two burning shells'), T('~10 milhões de anos', '~10 million years'), [[C, 0.32, 0], [He, 0.38, 1], [H, 0.44, 1], [H, 1, 0]]],
      [3000, 5000, T('pulsos térmicos: o envelope é soprado', 'thermal pulses: the envelope is blown away'), '', [[C, 0.36, 0], [He, 0.4, 1], [H, 0.46, 1]]],
      [30000, 6000, T('nebulosa planetária: o núcleo fica exposto', 'planetary nebula: the core is exposed'), T('~10 mil anos', '~10 thousand years'), [[C, 0.4, 0], [He, 0.44, 0]]],
      [110000, 300, T('anã branca nasce, muito quente', 'a white dwarf is born, very hot'), '', [[C, 0.4, 0], [He, 0.43, 0]]],
      [25000, 0.03, T('anã branca esfria', 'the white dwarf cools'), T('bilhões de anos', 'billions of years'), [[C, 0.4, 0], [He, 0.42, 0]]],
      [7000, 3e-4, T('anã branca fria: de carbono e oxigênio', 'cool white dwarf: carbon and oxygen'), '', [[C, 0.4, 0], [He, 0.41, 0]]],
    ],
    15: [
      [31000, 2.2e4, T('sequência principal: H → He (ciclo CNO)', 'main sequence: H → He (CNO cycle)'), T('~12 milhões de anos', '~12 million years'), [[He, 0.08, 1], [H, 1, 0]]],
      [24000, 4e4, T('o H do centro acaba', 'core hydrogen runs out'), '', [[He, 0.22, 0], [H, 1, 0]]],
      [9000, 5e4, T('cruza o diagrama em milhares de anos', 'crosses the diagram in thousands of years'), '', [[He, 0.22, 0], [H, 0.28, 1], [H, 1, 0]]],
      [3800, 7e4, T('supergigante vermelha: He → C, O', 'red supergiant: He → C, O'), T('~1 milhão de anos', '~1 million years'), [[C, 0.1, 0], [He, 0.24, 1], [H, 0.3, 1], [H, 1, 0]]],
      [3600, 9e4, T('C → Ne, O', 'C → Ne, O'), T('~1 000 anos', '~1,000 years'), [[O, 0.08, 0], [C, 0.14, 1], [He, 0.24, 1], [H, 0.3, 1], [H, 1, 0]]],
      [3550, 1e5, T('O → Si', 'O → Si'), T('~1 ano', '~1 year'), [[Si, 0.06, 0], [O, 0.11, 1], [C, 0.16, 1], [He, 0.25, 1], [H, 0.31, 1], [H, 1, 0]]],
      [3500, 1.1e5, T('Si → Fe: o núcleo de ferro cresce', 'Si → Fe: the iron core grows'), T('~1 dia', '~1 day'), [[Fe, 0.05, 0], [Si, 0.09, 1], [O, 0.13, 1], [C, 0.17, 1], [He, 0.25, 1], [H, 0.31, 1], [H, 1, 0]]],
      [3500, 1.1e5, T('ferro passa de 1,4 M☉: colapso → supernova', 'iron passes 1.4 M☉: collapse → supernova'), T('~0,2 s', '~0.2 s'), [[Fe, 0.08, 0], [Si, 0.11, 1], [O, 0.14, 1], [C, 0.18, 1], [He, 0.25, 1], [H, 0.31, 1], [H, 1, 0]]],
    ],
  };
  const ECOL = { H: COL.neb, He: COL.sol, 'C/O': '#b8a6ff', 'O/Ne': COL.psr, Si: COL.ana, Fe: '#c9a49a' };
  const SEG = 1.6, HOLD = 2.4;
  let which = '1', s = 0, hold = 0, boom = 0;
  bindSeg('hr-m', () => { which = document.querySelector('#hr-m .on').dataset.v; s = 0; hold = 0; boom = 0; render(); });
  function render() {
    const tr = TRK[which], n = tr.length - 1, p = trackAt(tr, Math.min(s, n));
    P.begin().frame(T('temperatura da superfície (K)', 'surface temperature (K)'), T('luminosidade (L☉)', 'luminosity (L☉)'));
    drawMS(P);
    // anãs brancas: raio ~0,012 R☉
    const wd = logspace(5000, 150000, 40); P.clip().line(wd, wd.map(t => 1.44e-4 * (t / 5772) ** 4), { color: 'rgba(124,196,255,.18)', width: 10 }).unclip();
    P.text(9000, 2e-4, T('anãs brancas', 'white dwarfs'), { color: COL.text3, size: 15, align: 'right' });
    P.text(28000, 1.5e3, T('sequência principal', 'main sequence'), { color: COL.text3, size: 15 });
    // trilha percorrida
    const xs = [], ys = [];
    for (let q = 0; q <= Math.min(s, n) + 1e-9; q += 0.02) { const r = trackAt(tr, q); xs.push(r.T); ys.push(r.L); }
    P.line(tr.map(a => a[0]), tr.map(a => a[1]), { color: 'rgba(255,184,107,.18)', width: 1.4, dash: [5, 6] });
    P.line(xs, ys, { color: COL.sol, width: 2.6, glow: 8 });
    const c = P.ctx, X = P.X(p.T), Y = P.Y(p.L), R = Math.sqrt(p.L) / (p.T / 5772) ** 2;
    drawStar(c, X, Y, p.T, clamp(5 + 6 * Math.log10(1 + R), 4, 30));
    if (boom > 0) { const g = c.createRadialGradient(X, Y, 0, X, Y, 260 * (1 - boom * 0.5)); g.addColorStop(0, `rgba(255,255,255,${boom})`); g.addColorStop(0.3, `rgba(255,190,140,${0.6 * boom})`); g.addColorStop(1, 'rgba(255,140,90,0)'); c.fillStyle = g; c.beginPath(); c.arc(X, Y, 260, 0, 7); c.fill(); }
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText(T('pontos típicos, trilha esquemática', 'typical points, schematic track'), P.R - 6, P.T + 4);
    const k = Math.min(Math.round(s), n), st = tr[k];
    drawCore(st[4], k === n && which === '15');
    out.innerHTML = `<span>${T('fase', 'phase')} <b>${st[2]}</b></span>${st[3] ? `<span>${T('duração', 'duration')} <b>${st[3]}</b></span>` : ''}
      <span>T <b>${grp(Math.round(p.T / 100) * 100)} K</b></span><span>L <b>${p.L >= 10 ? grp(p.L) : sci(p.L, 1)} L☉</b></span><span>R <b>${R >= 10 ? grp(R) : fmt(R, R < 0.1 ? 3 : 1)} R☉</b></span>`;
  }
  function drawCore(layers, collapse) {
    const { ctx: c, w, h } = fitCanvas(cvC), RR = Math.min(w * 0.34, h / 2 - 40), cx = RR + 16, cy = h / 2 - 10;
    const tnow = performance.now() / 1000;
    for (let i = layers.length - 1; i >= 0; i--) {
      const [el, r, burn] = layers[i], rr = RR * r * (collapse && i === 0 ? 0.6 + 0.4 * Math.abs(Math.cos(tnow * 3)) : 1);
      c.fillStyle = rgbs(hex(ECOL[el]), i === layers.length - 1 && r === 1 ? 0.10 : 0.30); c.beginPath(); c.arc(cx, cy, rr, 0, 7); c.fill();
      c.strokeStyle = ECOL[el]; c.lineWidth = burn ? 3 : 1; c.globalAlpha = burn ? 0.7 + 0.3 * Math.sin(tnow * 6 + i) : 0.5;
      if (burn) { c.shadowColor = ECOL[el]; c.shadowBlur = 16; }
      c.beginPath(); c.arc(cx, cy, rr, 0, 7); c.stroke(); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    // rótulos, em leque para a direita
    c.font = `600 15px ${FONT}`; c.textBaseline = 'middle'; c.textAlign = 'left';
    const seen = new Set(); let row = 0;
    layers.forEach(([el, r, burn], i) => {
      if (seen.has(el + r)) return; seen.add(el + r);
      const prev = i ? layers[i - 1][1] : 0, rm = RR * (prev + r) / 2 * (r === 1 ? 0.92 : 1), a = -0.9 + row * 0.32; row++;
      const x0 = cx + rm * Math.cos(a), y0 = cy + rm * Math.sin(a);
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y0); c.lineTo(cx + RR + 8, y0); c.stroke();
      c.fillStyle = ECOL[el]; c.fillText(el, cx + RR + 12, y0);
    });
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText(T('o centro da estrela (fora de escala)', 'the star’s centre (not to scale)'), 8, h - 4);
    c.textBaseline = 'top'; c.fillText(T('anel brilhante: queimando', 'bright ring: burning'), 8, 4);
  }
  function hex(hs) { const v = parseInt(hs.slice(1), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; }
  function tick(dt) {
    const n = TRK[which].length - 1;
    if (s < n) { s = Math.min(n, s + dt / SEG); if (s >= n && which === '15') boom = 1; }
    else { hold += dt; boom = Math.max(0, boom - dt * 0.7); if (hold > HOLD) { hold = 0; s = 0; } }
    render();
  }
  loopOn(cv, tick, () => { s = which === '1' ? 4 : 6; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* =========================== PARTE III =========================== */

/* Princípio de exclusão: elétrons numa caixa de largura L. Os níveis de momento
   são p_n = nπħ/L (igualmente espaçados, Δp ∝ 1/L) e cada um aceita dois elétrons.
   Os elétrons caem um a um; apertar a caixa afasta os níveis. A energia total
   Σ p²/2m cresce como 1/L² mesmo a temperatura zero. */
(() => {
  const cv = document.getElementById('pauli'); if (!cv) return;
  const out = document.getElementById('pauli-out');
  const NL = 5, NE = 10, FALL = 0.55, GAP = 0.35, HOLD = 2.5;
  let t = 0;
  const getL = bindRange('pauli-L', v => fmt(v, 2) + ' L₀', () => { if (!raf()) render(); });
  const raf = () => cv.closest('.slide').classList.contains('active') && !reduceMotion;
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const L = getL(), boxW = (w * 0.5) * L, bx = w * 0.30 - boxW / 2, top = 40, bot = h - 46;
    // níveis de momento p_n = nΔp, Δp ∝ 1/L: com L = L₀ os cinco níveis ocupam ~55% da altura
    const unit = (bot - top - 20) * 0.55 / (NL + 0.3) / L;
    const Y = n => bot - n * unit;
    // poço
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(bx, top - 10); c.lineTo(bx, bot); c.lineTo(bx + boxW, bot); c.lineTo(bx + boxW, top - 10); c.stroke();
    c.fillStyle = 'rgba(124,196,255,.05)'; c.fillRect(bx, top - 10, boxW, bot - top + 10);
    // quantos já caíram
    const cyc = NE * (FALL + GAP) + HOLD, u = t % cyc, nIn = Math.min(NE, Math.floor(u / (FALL + GAP)) + 1);
    const pf = Math.ceil(Math.min(nIn, NE) / 2);
    for (let n = 1; n <= NL; n++) {
      const y = Y(n); if (y < top - 4) continue;
      const filled = n <= pf;
      c.strokeStyle = filled ? 'rgba(124,196,255,.9)' : 'rgba(255,255,255,.25)'; c.lineWidth = filled ? 2.5 : 1.5;
      c.beginPath(); c.moveTo(bx + 10, y); c.lineTo(bx + boxW - 10, y); c.stroke();
      // função de onda do nível
      c.strokeStyle = filled ? 'rgba(124,196,255,.35)' : 'rgba(255,255,255,.08)'; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i <= 80; i++) { const xx = i / 80, X = bx + xx * boxW, yy = y - Math.min(unit * 0.38, 26) * Math.sin(n * Math.PI * xx); i ? c.lineTo(X, yy) : c.moveTo(X, yy); }
      c.stroke();
      c.font = `16px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'right'; c.textBaseline = 'middle';
      c.fillText((n === 1 ? '' : n) + 'Δp', bx - 14, y);
    }
    // elétrons
    const spin = (X, y, up, a) => {
      c.save(); c.globalAlpha = a; c.strokeStyle = '#fff'; c.fillStyle = '#fff'; c.lineWidth = 3; c.shadowColor = COL.ana; c.shadowBlur = 14;
      const d = up ? -1 : 1; c.beginPath(); c.moveTo(X, y + 16 * d * -1); c.lineTo(X, y - 14 * d * -1); c.stroke();
      c.beginPath(); c.moveTo(X, y + 22 * d); c.lineTo(X - 7, y + 10 * d); c.lineTo(X + 7, y + 10 * d); c.closePath(); c.fill(); c.restore();
    };
    for (let k = 0; k < nIn; k++) {
      const n = Math.floor(k / 2) + 1, up = k % 2 === 0, X = bx + boxW / 2 + (up ? -16 : 16), yT = Y(n) - 18;
      const t0 = k * (FALL + GAP), f = clamp((u - t0) / FALL, 0, 1), e = 1 - (1 - f) ** 3;
      spin(X, lerp(top - 30, yT, e), up, Math.min(1, f * 3));
    }
    // momento máximo
    const yF = Y(pf);
    c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,184,107,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(bx - 4, yF - 18); c.lineTo(w * 0.62, yF - 18); c.stroke(); c.setLineDash([]);
    c.font = `17px ${FONT}`; c.fillStyle = COL.sol; c.textAlign = 'left'; c.fillText(T('momento máximo', 'maximum momentum') + ` = ${pf}Δp`, w * 0.62 + 8, yF - 18);
    // largura
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, bot + 18); c.lineTo(bx + boxW, bot + 18); c.stroke();
    c.fillStyle = COL.text2; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText('Δx', bx + boxW / 2, bot + 22);
    // barra de energia
    let E = 0; for (let k = 0; k < nIn; k++) { const n = Math.floor(k / 2) + 1; E += n * n; }
    const E0 = 110 /* Σ n² com 10 elétrons, L = L₀ */, Erel = E / L ** 2 / E0;
    const gx = w * 0.84, gy0 = bot, gh = bot - top - 20, fill = clamp(Erel / 3.4, 0, 1);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(gx, gy0 - gh, 34, gh);
    const gr = c.createLinearGradient(0, gy0, 0, gy0 - gh); gr.addColorStop(0, COL.ana); gr.addColorStop(1, COL.warn);
    c.fillStyle = gr; c.fillRect(gx, gy0 - gh * fill, 34, gh * fill);
    c.fillStyle = COL.text2; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(T('energia', 'energy'), gx + 17, bot + 6);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T('caixa unidimensional · p = nπħ/Δx', 'one-dimensional box · p = nπħ/Δx'), 10, 8);
    out.innerHTML = `<span>${T('elétrons', 'electrons')} <b>${nIn}</b></span><span>Δp <b>${fmt(1 / L, 2)}× ${T('o inicial', 'initial')}</b></span>
      <span>${T('momento máximo', 'maximum momentum')} <b>${pf}Δp</b></span><span>${T('energia total', 'total energy')} <b>${fmt(E / L ** 2, 0)} ${T('unidades', 'units')}</b> (∝ 1/Δx²)</span>`;
  }
  loopOn(cv, dt => { t += dt; render(); }, () => { t = NE * 0.9 + 0.5; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* Relação massa–raio das anãs brancas, aproximação de Nauenberg (1972):
   R/R☉ = 0,0225/μe · √(1 − x^{4/3}) / x^{1/3}, x = M/M₃, M₃ = 5,816/μe² M☉.
   Tracejado: o gás não relativístico, R ∝ M^{−1/3}, que nunca chega a zero.
   Animação: a anã branca acreta de uma companheira e encolhe até o limite. */
(() => {
  const cv = document.getElementById('chandra'); if (!cv) return;
  const out = document.getElementById('chandra-out');
  const MU = 2, M3 = 5.816 / MU ** 2, RSUN_RE = 109.08;
  const Rnr = M => 0.0225 / MU / Math.cbrt(M / M3) * RSUN_RE;
  const Rof = M => { const x = M / M3; return x >= 1 ? 0 : 0.0225 / MU * Math.sqrt(1 - x ** (4 / 3)) / Math.cbrt(x) * RSUN_RE; };   // em R⊕
  const OBS = [['Sírius B', 1.018, 0.008098], ['Procyon B', 0.592, 0.01232], ['40 Eri B', 0.573, 0.01308]];   // Bond, Bergeron & Bédard 2017
  const P = new Plot(cv, { x: [0.1, 1.6], y: [0, 3.2], m: [24, 34, 70, 84], fs: 17, yticks: [0, 1, 2, 3] });
  const Ms = linspace(0.1, M3 * 0.99999, 300);
  let M = 0.6, flash = 0, hold = 0;
  function render() {
    P.begin().frame(T('massa (M☉)', 'mass (M☉)'), T('raio (raios da Terra)', 'radius (Earth radii)'));
    P.clip();
    P.line(Ms, Ms.map(Rnr), { color: 'rgba(255,255,255,.35)', width: 1.6, dash: [6, 6] });
    P.line(Ms, Ms.map(Rof), { color: COL.ana, width: 3.5, glow: 12 });
    P.vline(M3, { color: COL.warn, dash: [5, 6], label: 'M' + T('Ch', 'Ch') + ' ≈ 1,44 M☉'.replace(',', DEC), side: 'left' });
    P.hline(1, { color: 'rgba(255,255,255,.25)', label: T('Terra', 'Earth'), align: 'left' });
    P.unclip();
    P.text(0.25, Rnr(0.25) + 0.25, T('sem relatividade', 'without relativity'), { color: COL.text3, size: 15 });
    OBS.forEach(([n, m, r]) => { P.dot(m, r * RSUN_RE, { color: '#fff', r: 5, glow: 8 }); P.text(m + (n[0] === '4' ? -0.03 : 0.03), r * RSUN_RE + (n[0] === 'P' ? -0.16 : 0.16), n, { color: COL.text2, size: 15, align: n[0] === '4' ? 'right' : 'left' }); });
    const R = Rof(M);
    P.dot(M, R, { color: COL.ana, r: 9, glow: 24 });
    // a cena: companheira + disco + anã branca do tamanho certo (relativo)
    const c = P.ctx, sx = P.X(1.05), sy = P.Y(2.35), rr = 5 + 40 * R / Rof(0.6);
    const g = c.createRadialGradient(sx + 230, sy, 0, sx + 230, sy, 70); g.addColorStop(0, 'rgba(255,190,150,.9)'); g.addColorStop(0.5, 'rgba(255,110,80,.5)'); g.addColorStop(1, 'rgba(255,90,70,0)');
    c.fillStyle = g; c.beginPath(); c.arc(sx + 230, sy, 70, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,170,120,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx + 175, sy - 8); c.quadraticCurveTo(sx + 90, sy - 30, sx + 40, sy - 6); c.stroke();
    c.strokeStyle = 'rgba(255,200,150,.45)'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, sy, 48, 12, 0, 0, 7); c.stroke();
    drawStarFlat(c, sx, sy, rr);
    if (flash > 0) { const f = c.createRadialGradient(sx, sy, 0, sx, sy, 200); f.addColorStop(0, `rgba(255,255,255,${flash})`); f.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = f; c.beginPath(); c.arc(sx, sy, 200, 0, 7); c.fill(); }
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'center'; c.fillText(T('companheira', 'companion'), sx + 230, sy + 86);
    const rho = M * 1.989e33 / (4 / 3 * Math.PI * (R * 6.371e8) ** 3);
    out.innerHTML = `<span>${T('massa', 'mass')} <b>${fmt(M, 3)} M☉</b></span><span>${T('raio', 'radius')} <b>${R > 0 ? grp(R * 6371) + ' km' : '0'}</b></span>
      <span>${T('densidade média', 'mean density')} <b>${R > 0 ? sci(rho, 1) + ' g/cm³' : '∞'}</b></span>
      <span>${M >= M3 * 0.999 ? `<b style="color: var(--warn)">${T('acima do limite: nenhum equilíbrio é possível', 'above the limit: no equilibrium is possible')}</b>` : T('fração de M<sub>Ch</sub>', 'fraction of M<sub>Ch</sub>') + ` <b>${Math.round(100 * M / M3)}%</b>`}</span>`;
  }
  function drawStarFlat(c, x, y, r) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2); g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(200,228,255,.95)'); g.addColorStop(0.6, 'rgba(124,196,255,.35)'); g.addColorStop(1, 'rgba(124,196,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.2, 0, 7); c.fill();
  }
  function tick(dt) {
    if (M < M3 * 0.999) M = Math.min(M3 * 0.999, M + dt * 0.11 * (1 - 0.6 * M / M3));
    else { if (!hold) flash = 1; hold += dt; flash = Math.max(0, flash - dt * 0.8); if (hold > 2.6) { hold = 0; M = 0.6; } }
    render();
  }
  loopOn(cv, tick, () => { M = 1.2; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();
