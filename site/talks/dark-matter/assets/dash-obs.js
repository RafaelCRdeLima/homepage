/* =====================================================================
   Parte I · OBSCURA — os painéis
   Tudo sobre PHYS (phys.js): a estrela SLy de 1,40 M☉ e 11,70 km, o transporte e a cinemática.
   ===================================================================== */
const C_KMS = 299792.458;
const fmtE = kev => kev >= 1e6 ? (kev / 1e6).toPrecision(3) + ' GeV' : kev >= 1e3 ? (kev / 1e3).toPrecision(3) + ' MeV' : kev >= 1 ? kev.toPrecision(3) + ' keV' : (kev * 1e3).toPrecision(3) + ' eV';
const sci = (v, d = 2) => {
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return String(+v.toPrecision(d + 1));
  const m = v / 10 ** e;
  return `${m.toFixed(d)}×10${String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? '⁻').join('')}`;
};
// intervalo de Wilson a 68% (z = 1), o do OBSCURA (STAT-1)
function wilson(k, n) {
  if (!n) return [0, 1];
  const p = k / n, z2 = 1 / n, c = (p + z2 / 2) / (1 + z2), h = Math.sqrt(p * (1 - p) / n + z2 / (4 * n)) / (1 + z2);
  return [Math.max(0, c - h), Math.min(1, c + h)];
}
// cauda de Poisson: P(N ≥ k)
function poissonTail(tau, k) { let s = 0, t = Math.exp(-tau); for (let j = 0; j < k; j++) { s += t; t *= tau / (j + 1); } return Math.max(0, 1 - s); }

/* -------------------------------------------------------------------------
   Focalização gravitacional. Uma partícula vinda do infinito com velocidade v tem
   𝓔 = γ e 𝓛 = γ v b; ela chega à superfície se 𝓛 < 𝓛_c(𝓔) = R √[(𝓔² − 1 + 2C)/(1 − 2C)],
   logo b_max/R = √[(γ² − 1 + 2C)/(1 − 2C)] / (γv). Newton: b_max/R = √(1 + 2C/v²).
   Para v → 0 a razão vai a 1/√(1 − 2C): 1,244 na SLy de 1,4 M☉ (C = 0,177), como no artigo.
   As trajetórias são geodésicas de Schwarzschild exatas, u″ + u = M/h² + 3Mu² (u = 1/r, h = 𝓛),
   em RK4 no ângulo — desenhadas na velocidade do controle, não nos 220 km/s do halo, onde
   b_max ≈ 10³ R e a estrela sumiria do quadro.
   ------------------------------------------------------------------------- */
(() => {
  const geo = document.getElementById('focus-geo'); if (!geo) return;
  const plotCv = document.getElementById('focus-plot'), out = document.getElementById('focus-out');
  const bGR = (C, b) => { const g = 1 / Math.sqrt(1 - b * b); return Math.sqrt((g * g - 1 + 2 * C) / (1 - 2 * C)) / (g * b); };
  const bN = (C, b) => Math.sqrt(1 + 2 * C / (b * b));
  const getC = bindRange('focus-c', v => v.toFixed(3), () => go());
  const getV = bindRange('focus-v', v => { const b = 10 ** v; return b * C_KMS < 1e4 ? Math.round(b * C_KMS).toLocaleString('en') + ' km/s' : b.toFixed(2) + 'c'; }, () => go());
  const P = new Plot(plotCv, { x: [10, C_KMS], y: [1, 1e5], xlog: true, ylog: true, m: [16, 20, 56, 76], fs: 15 });

  function orbit(C, beta, b) {
    // R = 1, M = C; o ponto começa longe, à esquerda, com parâmetro de impacto |b|
    const g = 1 / Math.sqrt(1 - beta * beta), h = g * beta * Math.abs(b), M = C, E2 = g * g;
    const r0 = 60 + 6 * Math.abs(b);
    let u = 1 / r0, w = Math.sqrt(Math.max(0, (E2 - 1) / (h * h) + 2 * M * u / (h * h) - u * u + 2 * M * u ** 3)), ph = Math.asin(Math.min(1, Math.abs(b) / r0));
    const pts = [], sg = Math.sign(b) || 1, f = (u, w) => [w, M / (h * h) - u + 3 * M * u * u];
    let hit = false;
    for (let n = 0; n < 40000; n++) {
      const r = 1 / u; pts.push([-r * Math.cos(ph), sg * r * Math.sin(ph)]);
      if (u >= 1) { hit = true; break; }
      if (w < 0 && u < 1 / r0) break;
      const d = Math.min(0.01, 0.02 / (1 + 20 * u));
      const k1 = f(u, w), k2 = f(u + d / 2 * k1[0], w + d / 2 * k1[1]), k3 = f(u + d / 2 * k2[0], w + d / 2 * k2[1]), k4 = f(u + d * k3[0], w + d * k3[1]);
      u += d / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); w += d / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); ph += d;
      if (u >= 1) { const r = 1; pts.push([-r * Math.cos(ph), sg * r * Math.sin(ph)]); hit = true; break; }
    }
    return { pts, hit };
  }

  function draw() {
    const C = getC(), beta = 10 ** getV(), bm = bGR(C, beta), bn = bN(C, beta);
    // --- trajetórias ---
    const { ctx: c, w, h } = fitCanvas(geo);
    const half = Math.max(1.75 * bm, 2.4), sc = Math.min(w, h * 1.25) / (2.4 * half), cx = w * 0.56, cy = h / 2;
    const X = x => cx + x * sc, Y = y => cy - y * sc;
    c.save(); c.beginPath(); c.rect(0, 0, w, h); c.clip();
    for (const f of [-1.45, -1.18, -1.04, -0.96, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 0.96, 1.04, 1.18, 1.45]) {
      const o = orbit(C, beta, f * bm || 1e-6);
      c.strokeStyle = o.hit ? 'rgba(158,140,255,.9)' : 'rgba(179,185,201,.35)'; c.lineWidth = o.hit ? 2.2 : 1.4;
      c.beginPath(); o.pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke();
      if (o.hit) { const [x, y] = o.pts[o.pts.length - 1]; c.fillStyle = '#56e1d0'; c.beginPath(); c.arc(X(x), Y(y), 4, 0, 7); c.fill(); }
    }
    // a estrela e o raio de Schwarzschild
    const gr = c.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), sc);
    gr.addColorStop(0, '#5a5f9a'); gr.addColorStop(1, '#262a46');
    c.fillStyle = gr; c.beginPath(); c.arc(X(0), Y(0), Math.max(sc, 2), 0, 7); c.fill();
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,122,138,.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(X(0), Y(0), 2 * C * sc, 0, 7); c.stroke(); c.setLineDash([]);
    // as três seções de choque, na entrada
    const xb = 16, bar = (b0, col, dash, lab, dx) => {
      c.strokeStyle = col; c.lineWidth = 4; c.setLineDash(dash); c.beginPath(); c.moveTo(xb + dx, Y(b0)); c.lineTo(xb + dx, Y(-b0)); c.stroke(); c.setLineDash([]);
      c.fillStyle = col; c.font = `14px ${FONT}`; c.textBaseline = 'middle'; c.fillText(lab, xb + dx + 10, Y(b0) + 8);
    };
    bar(Math.min(bm, half * 1.15), '#9e8cff', [], 'b_max (GR)', 0);
    bar(Math.min(bn, half * 1.15), 'rgba(238,240,246,.75)', [6, 5], 'Newton', 104);
    c.restore();
    c.fillStyle = COL.text3; c.font = `15px ${FONT}`; c.textAlign = 'right'; c.textBaseline = 'bottom';
    c.fillText(`drawn at v∞ = ${beta < 0.0334 ? Math.round(beta * C_KMS).toLocaleString('en') + ' km/s' : beta.toFixed(2) + 'c'}  ·  frame ±${half.toFixed(1)} R`, w - 8, h - 6);
    // --- b_max(v) ---
    P.begin().frame('speed at infinity, v∞ (km/s)', 'b_max / R');
    const vs = logspace(10, 0.999 * C_KMS, 240);
    P.clip();
    // a distribuição de velocidades do halo (Maxwell truncada, v₀ = 220, v_esc = 544 km/s), em escala arbitrária
    const fv = vs.map(v => v < 544 ? v * v * Math.exp(-((v / 220) ** 2)) : 0), fm = Math.max(...fv);
    P.area(vs, fv.map(f => 10 ** (0.9 * f / fm + 0.001)), 1, { color: COL.deg, alpha: 0.13 });
    P.line(vs, vs.map(v => bN(C, v / C_KMS)), { color: 'rgba(238,240,246,.7)', width: 2, dash: [7, 6] });
    P.line(vs, vs.map(v => bGR(C, v / C_KMS)), { color: COL.obs, width: 3, glow: 10 });
    P.vline(220, { color: COL.deg, label: 'v₀ = 220 km/s', y: P.T + 4 });
    P.dot(beta * C_KMS, bm, { color: COL.obs, r: 7 });
    P.unclip();
    P.text(16, 1.6, 'halo speeds', { color: COL.deg, size: 14 });
    const b220 = bGR(C, 220 / C_KMS), n220 = bN(C, 220 / C_KMS);
    out.innerHTML = `at this speed <b>b_max = ${bm < 100 ? bm.toFixed(2) : sci(bm)} R</b> &nbsp;·&nbsp; Newton <b>${bn < 100 ? bn.toFixed(2) : sci(bn)} R</b> &nbsp;·&nbsp; GR/Newton <b>${(bm / bn).toFixed(3)}</b>
      &nbsp;·&nbsp; at 220 km/s: <b>${sci(b220, 2)} R</b>, ×<b>${(b220 / n220).toFixed(3)}</b> &nbsp;·&nbsp; slow limit 1/√(1−2C) = <b>${(1 / Math.sqrt(1 - 2 * C)).toFixed(3)}</b>`;
  }
  const go = onSlide(geo, draw);
})();

/* -------------------------------------------------------------------------
   A janela estreita. O fechamento troca a sequência de colisões por 𝒩_min: o número de perdas
   determinísticas (frontal, c = −1, ou a média isotrópica, c = 0) até 𝓔 < 1, com o lapso da superfície.
   Cada colisão leva T = p*²(1 − cos θ*)/m_n da energia cinética local; para m_χ ≪ m_n é uma fração
   ≈ 2(m_χ/m_n)(γ + 1) no frontal. Com o lapso do centro (e^{ν/2} = 0,632 aqui, contra 0,804 na
   superfície) a mesma colisão retira mais 𝓔, e 𝒩_min cai à metade: é o efeito do ponto de avaliação.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('nmin-plot'); if (!cv) return;
  const out = document.getElementById('nmin-out');
  const getM = bindRange('nmin-m', v => fmtE(10 ** v), () => go());
  const getX = bindRange('nmin-x', v => (10 ** v).toPrecision(2), () => go());
  const P = new Plot(cv, { x: [0.01, 20], y: [0.8, 400], xlog: true, ylog: true, m: [18, 24, 58, 80], fs: 16 });
  const xs = logspace(0.01, 20, 150);
  let cacheM = null, curves = null;
  function draw() {
    const S = PHYS.star(1.4), eS = Math.sqrt(1 - 2 * S.C), eC = Math.exp(S.nu[0] / 2), m = 10 ** getM(), x = 10 ** getX();
    if (cacheM !== m) {
      cacheM = m;
      curves = ['h', 'i', 'c'].map(k => xs.map(x => PHYS.nmin(m, 1 + x * 1e-3, k === 'c' ? eC : eS, k !== 'i')));
    }
    P.begin().frame('10³(ℰ − 1)   ·   specific energy above rest mass', 'collisions needed, N_min').clip();
    const step = (ys, o) => { const X = [], Y = []; xs.forEach((x, i) => { if (i) { X.push(x); Y.push(ys[i - 1]); } X.push(x); Y.push(ys[i]); }); P.line(X, Y, o); };
    step(curves[2], { color: COL.deg, width: 2.2, dash: [7, 6] });
    step(curves[1], { color: COL.amb, width: 2.6 });
    step(curves[0], { color: COL.warn, width: 3, glow: 8 });
    P.vline(x, { color: 'rgba(255,255,255,.35)', dash: [3, 5] });
    P.unclip();
    const g = (1 + x * 1e-3) / eS, K = m * (g - 1), Kb = m * (1 / eS - 1), fm = PHYS.fracMax(m, g);
    const nh = PHYS.nmin(m, 1 + x * 1e-3, eS, true), ni = PHYS.nmin(m, 1 + x * 1e-3, eS, false), nc = PHYS.nmin(m, 1 + x * 1e-3, eC, true);
    out.innerHTML = `kinetic energy at the surface <b>${fmtE(K)}</b> &nbsp;·&nbsp; must lose <b>${fmtE(K - Kb)}</b> (${(100 * (K - Kb) / K).toPrecision(2)}%)
      &nbsp;·&nbsp; one head-on collision removes ≤ <b>${(100 * fm).toPrecision(2)}%</b> &nbsp;·&nbsp; collisions needed: <b>${nh}</b> head-on, <b>${ni}</b> isotropic mean, <b>${nc}</b> head-on at the centre`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   O transporte ao vivo. Três modos sobre a mesma estrela, 100 keV e σ = 10⁻⁴⁴ cm², sem bloqueio de Pauli
   (os nomes são os do paper zero):
     F_iS  o fechamento realizado: trajetória congelada, perda média isotrópica com o lapso da superfície;
     F_sL  trajetória congelada, perda sorteada e avaliada no raio da colisão;
     R_sL  o transporte: a colisão também muda a direção, e a órbita é refeita.
   A linha pontilhada é o fechamento analítico, 1 − e^{−τ} Σ_{k<𝒩_min} τ^k/k!, com τ = σ∫n_b dl pela
   geodésica incidente (quadratura) e 𝒩_min isotrópico. As histórias rodam em fatias de ~12 ms por quadro,
   só com o slide aberto; o passo é R/300 (no OBSCURA, R/4096).
   ------------------------------------------------------------------------- */
const MC = (() => {
  const m = 100, sigma = 1e-44, opt = { m, sigma };
  const XS = [0.02, 0.04, 0.07, 0.1, 0.15, 0.22, 0.32, 0.45, 0.65, 0.9, 1.3, 1.9, 2.8, 4.2];
  return { m, sigma, opt, XS };
})();

(() => {
  const view = document.getElementById('mc-view'); if (!view) return;
  const plotCv = document.getElementById('mc-plot'), out = document.getElementById('mc-out'), slide = view.closest('.slide');
  const getL = bindSeg('mc-l', () => reset());
  const getMode = bindSeg('mc-mode', () => { shown = []; });
  const getX = bindRange('mc-x', v => (10 ** v).toPrecision(2), () => { shown = []; });
  const P = new Plot(plotCv, { x: [0.01, 6], y: [0, 1], xlog: true, m: [16, 20, 56, 66], fs: 15, yticks: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  const MODES = ['Fi', 'Fs', 'R'], COLS = { Fi: '#c3c8d6', Fs: COL.neb, R: COL.amb };
  const NMAX = { Fi: 500, Fs: 500, R: 700 };
  let S = null, stats = null, closure = null, shown = [], rng = PHYS.rng(2026), lastRec = 0, raf = 0;
  function reset() {
    S = S || PHYS.star(1.4);
    const f = +getL(), eS = Math.sqrt(1 - 2 * S.C);
    stats = {}; MODES.forEach(k => stats[k] = MC.XS.map(() => ({ k: 0, n: 0 })));
    const xs = logspace(0.012, 6, 70);
    closure = { xs, p: xs.map(x => { const E = 1 + x * 1e-3; return poissonTail(PHYS.column(S, E, f * PHYS.Lc(S, E), MC.sigma), PHYS.nmin(MC.m, E, eS, false)); }) };
    shown = [];
  }
  function work(budget) {
    const t0 = performance.now(), f = +getL();
    while (performance.now() - t0 < budget) {
      // o par (modo, energia) com menos histórias
      let best = null, bn = Infinity;
      for (const k of MODES) stats[k].forEach((s, i) => { const w = s.n / NMAX[k]; if (s.n < NMAX[k] && w < bn) { bn = w; best = [k, i]; } });
      if (!best) break;
      const [k, i] = best, E = 1 + MC.XS[i] * 1e-3;
      const h = PHYS.history(S, MC.opt, E, f * PHYS.Lc(S, E), k, rng, false);
      stats[k][i].n++; if (h.status === 'capture') stats[k][i].k++;
    }
    // uma história desenhada a cada 0,3 s, na energia e no modo escolhidos
    const now = performance.now();
    if (now - lastRec > 300) {
      lastRec = now;
      const E = 1 + 10 ** getX() * 1e-3, mode = getMode() === 'closure' ? 'Fi' : 'R';
      const h = PHYS.history(S, Object.assign({ phi0: PHYS.TAU * rng() }, MC.opt), E, f * PHYS.Lc(S, E), mode, rng, true);
      shown.push(h); if (shown.length > 14) shown.shift();
    }
  }
  function draw() {
    if (!stats) reset();
    // --- as histórias ---
    const { ctx: c, w, h } = fitCanvas(view), sc = Math.min(w, h) / 2 / (S.R * 1.08), cx = w / 2, cy = h / 2;
    const XY = (r, ph) => [cx + r * sc * Math.cos(ph), cy - r * sc * Math.sin(ph)];
    for (let k = 40; k >= 1; k--) {
      const r = k / 40 * S.R, fr = (S.nb[Math.min(S.N - 1, Math.round(r / S.dr))] / S.nb[0]) ** 0.6;
      c.fillStyle = `rgb(${Math.round(14 + 26 * fr)},${Math.round(16 + 24 * fr)},${Math.round(30 + 46 * fr)})`; c.beginPath(); c.arc(cx, cy, r * sc, 0, 7); c.fill();
    }
    c.strokeStyle = 'rgba(158,140,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, S.R * sc, 0, 7); c.stroke();
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,122,138,.45)'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, 2 * S.M * sc, 0, 7); c.stroke(); c.setLineDash([]);
    shown.forEach((hs, j) => {
      const a = 0.25 + 0.75 * (j + 1) / shown.length, cap = hs.status === 'capture';
      const col = cap ? `rgba(86,225,208,${a})` : `rgba(255,143,171,${a * 0.85})`;
      c.strokeStyle = col; c.lineWidth = j === shown.length - 1 ? 2.2 : 1.3;
      c.beginPath(); hs.path.forEach(([r, ph], i) => { const [x, y] = XY(r, ph); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      hs.hits.forEach(([r, ph, b], i) => {
        const [x, y] = XY(r, ph), last = i === hs.hits.length - 1 && cap;
        c.fillStyle = last ? '#56e1d0' : `rgba(255,214,150,${a})`; c.beginPath(); c.arc(x, y, last ? 5.5 : 2.6, 0, 7); c.fill();
      });
      const [x0, y0] = XY(...hs.path[0]); c.fillStyle = `rgba(238,240,246,${a})`; c.fillRect(x0 - 4, y0 - 4, 8, 8);
    });
    // --- P_cap(x) ---
    P.begin().frame('10³(ℰ − 1)', 'capture probability, P_cap').clip();
    P.line(closure.xs, closure.p, { color: 'rgba(238,240,246,.8)', width: 2, dash: [2, 5] });
    for (const k of MODES) {
      const xs = [], ys = [];
      stats[k].forEach((s, i) => { if (s.n > 20) { xs.push(MC.XS[i]); ys.push(s.k / s.n); } });
      P.line(xs, ys, { color: COLS[k], width: k === 'R' ? 3 : 2.2, alpha: 0.85 });
      stats[k].forEach((s, i) => {
        if (s.n < 20) return;
        const [lo, hi] = wilson(s.k, s.n), X = P.X(MC.XS[i]);
        P.ctx.strokeStyle = COLS[k]; P.ctx.lineWidth = 2; P.ctx.beginPath(); P.ctx.moveTo(X, P.Y(lo)); P.ctx.lineTo(X, P.Y(hi)); P.ctx.stroke();
        P.dot(MC.XS[i], s.k / s.n, { color: COLS[k], r: 4.5, glow: 8 });
      });
    }
    P.vline(10 ** getX(), { color: 'rgba(255,255,255,.3)', dash: [3, 5] });
    P.unclip();
    const nTot = MODES.reduce((a, k) => a + stats[k].reduce((b, s) => b + s.n, 0), 0);
    const near = MC.XS.reduce((b, x, i) => Math.abs(Math.log(x / 10 ** getX())) < Math.abs(Math.log(MC.XS[b] / 10 ** getX())) ? i : b, 0);
    const pc = k => { const s = stats[k][near]; return s.n ? (s.k / s.n).toFixed(2) : '—'; };
    out.innerHTML = `histories <b>${nTot.toLocaleString('en')}</b> &nbsp;·&nbsp; at 10³(ℰ−1) = ${MC.XS[near]}: closure <b>${pc('Fi')}</b> · frozen, loss at the collision <b>${pc('Fs')}</b> · transport <b>${pc('R')}</b>`;
  }
  const go = onSlide(view, draw);
  function loop() {
    cancelAnimationFrame(raf);
    if (!slide.classList.contains('active')) return;
    if (!stats) reset();
    work(new URLSearchParams(location.search).has('ff') ? 4000 : 12);
    draw();
    raf = requestAnimationFrame(loop);
  }
  addEventListener('slidechange', loop);
  addEventListener('stagefit', loop);
})();

/* -------------------------------------------------------------------------
   Quantas colisões. Acima da transição quase nada é capturado, e a contagem de uma história é
   completa: ela termina quando a partícula sai. O fechamento supõe Poisson com média τ; o transporte
   dá uma contagem muito mais dispersa (no paper zero, variância 8–13 vezes a média). Sobre o
   histograma: Poisson e binomial negativa com a média e a variância medidas, r = m²/(v − m), p = m/v.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('cnt-plot'); if (!cv) return;
  const out = document.getElementById('cnt-out'), slide = cv.closest('.slide');
  const getL = bindSeg('cnt-l', () => reset());
  const getX = bindRange('cnt-x', v => (10 ** v).toPrecision(2), () => reset());
  const KMAX = 45;
  const P = new Plot(cv, { x: [-0.5, KMAX + 0.5], y: [0, 0.2], m: [16, 20, 56, 76], fs: 15, xticks: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45] });
  let S = null, hist = null, tau = 0, rng = PHYS.rng(77), raf = 0;
  function reset() {
    S = S || PHYS.star(1.4);
    const E = 1 + 10 ** getX() * 1e-3, f = +getL();
    hist = { c: new Float64Array(KMAX + 2), n: 0, cap: 0, s1: 0, s2: 0 };
    tau = PHYS.column(S, E, f * PHYS.Lc(S, E), MC.sigma);
  }
  function work(budget) {
    const t0 = performance.now(), E = 1 + 10 ** getX() * 1e-3, L = +getL() * PHYS.Lc(S, E);
    while (performance.now() - t0 < budget && hist.n < 6000) {
      const h = PHYS.history(S, MC.opt, E, L, 'R', rng, false);
      hist.n++; if (h.status === 'capture') hist.cap++;
      hist.c[Math.min(KMAX + 1, h.n)]++; hist.s1 += h.n; hist.s2 += h.n * h.n;
    }
  }
  function lgamma(z) { // Lanczos
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i); const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function draw() {
    if (!hist) reset();
    const n = hist.n || 1, mu = hist.s1 / n, v = hist.s2 / n - mu * mu;
    const ymax = Math.max(0.05, ...Array.from(hist.c.slice(0, KMAX + 1), c => c / n)) * 1.15;
    P.set('y', [0, ymax]).set('yticks', null);
    P.begin().frame('collisions in one history, N', 'fraction of histories').clip();
    const c = P.ctx, bw = (P.X(1) - P.X(0)) * 0.78;
    for (let k = 0; k <= KMAX; k++) { const y = hist.c[k] / n; c.fillStyle = 'rgba(255,184,107,.55)'; c.fillRect(P.X(k) - bw / 2, P.Y(y), bw, P.Y(0) - P.Y(y)); }
    const ks = Array.from({ length: KMAX + 1 }, (_, k) => k);
    if (hist.n > 50) {
      P.line(ks, ks.map(k => Math.exp(k * Math.log(mu) - mu - lgamma(k + 1))), { color: 'rgba(238,240,246,.85)', width: 2.2, dash: [6, 5] });
      if (v > mu) {
        const r = mu * mu / (v - mu), p = mu / v;
        P.line(ks, ks.map(k => Math.exp(lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log(1 - p))), { color: COL.obs, width: 3, glow: 8 });
      }
    }
    P.unclip();
    out.innerHTML = `histories <b>${hist.n.toLocaleString('en')}</b> &nbsp;·&nbsp; captured <b>${(100 * hist.cap / n).toFixed(1)}%</b> &nbsp;·&nbsp; mean <b>${mu.toFixed(2)}</b> (τ of the incident geodesic: ${tau.toFixed(2)})
      &nbsp;·&nbsp; variance / mean <b>${(v / (mu || 1)).toFixed(1)}</b> (Poisson: 1) &nbsp;·&nbsp; P(N = 0) <b>${(hist.c[0] / n).toFixed(3)}</b>`;
  }
  onSlide(cv, draw);
  function loop() {
    cancelAnimationFrame(raf);
    if (!slide.classList.contains('active')) return;
    if (!hist) reset();
    work(new URLSearchParams(location.search).has('ff') ? 3000 : 12); draw();
    raf = requestAnimationFrame(loop);
  }
  addEventListener('slidechange', loop);
  addEventListener('stagefit', loop);
})();
