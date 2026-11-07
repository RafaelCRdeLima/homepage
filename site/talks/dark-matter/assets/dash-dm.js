/* =====================================================================
   Parte I · The missing mass — os painéis
   Nada aqui é curva desenhada à mão: os dados vêm de EV (evidence.js, gerado por tools/evidence.py)
   e o que é calculado no navegador está dito em cada bloco.
   ===================================================================== */
const SUP = n => String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? '⁻').join('');
const logInterp = (X, Y, x) => {
  if (x < X[0] || x > X[X.length - 1]) return NaN;
  let i = 0; while (i < X.length - 2 && x > X[i + 1]) i++;
  const t = (Math.log(x) - Math.log(X[i])) / (Math.log(X[i + 1]) - Math.log(X[i]));
  return Math.exp(Math.log(Y[i]) + t * (Math.log(Y[i + 1]) - Math.log(Y[i])));
};

/* -------------------------------------------------------------------------
   Curva de rotação da NGC 3198 (SPARC: V_obs, V_gás, V_disco a M/L = 1 em 3,6 μm).
   V_vis² = V_gás|V_gás| + Υ V_disco² (o SPARC guarda o sinal de V_gás).
   Halo: NFW com c fixo no melhor ajuste, V²(r) = V₂₀₀² m(cx)/(x m(c)), x = r/R₂₀₀, R₂₀₀ = V₂₀₀/(10 H₀),
   m(y) = ln(1 + y) − y/(1 + y). Ajuste livre (tools/data/, scipy): Υ = 0,45, V₂₀₀ = 110 km/s, c = 10,75,
   χ²_ν = 1,39. MOND: a função da relação radial de aceleração (McGaugh et al. 2016),
   g = g_vis/(1 − exp(−√(g_vis/a₀))), a₀ = 1,2×10⁻¹⁰ m/s², com a distância do SPARC fixa.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('rot-plot'); if (!cv) return;
  const D = EV.rot, N = D.r.length, H0 = 0.07, C200 = 10.75, A0 = 1.2e-10, KPC = 3.0857e19;
  const out = document.getElementById('rot-out'), inV = document.getElementById('rot-v');
  const mode = bindSeg('rot-mode', () => go());
  const getU = bindRange('rot-u', v => v.toFixed(2), () => go());
  const getV = bindRange('rot-v', v => v.toFixed(0) + ' km/s', () => go());
  const P = new Plot(cv, { x: [0, 46], y: [0, 200], m: [14, 20, 62, 78], fs: 16 });
  const mNFW = y => Math.log(1 + y) - y / (1 + y);

  function draw() {
    const U = getU(), V = getV(), md = mode();
    inV.disabled = md !== 'halo';
    const vis2 = D.disk.map((d, i) => D.gas[i] * Math.abs(D.gas[i]) + U * d * d);
    const R200 = V / (10 * H0);
    const hal2 = D.r.map(r => { const x = r / R200; return V * V * mNFW(C200 * x) / (x * mNFW(C200)); });
    const mond2 = vis2.map((v, i) => { const q = Math.max(v, 1e-6), gv = q * 1e6 / (D.r[i] * KPC); return q / (1 - Math.exp(-Math.sqrt(gv / A0))); });
    const tot2 = md === 'halo' ? vis2.map((v, i) => v + hal2[i]) : md === 'mond' ? mond2 : vis2;
    const vis = vis2.map(v => Math.sqrt(Math.max(v, 0))), tot = tot2.map(v => Math.sqrt(Math.max(v, 0)));

    P.begin().frame('radius r (kpc)', 'circular speed (km/s)');
    P.clip();
    P.line(D.r, D.gas.map(Math.abs), { color: COL.deg, width: 1.8, dash: [3, 5] });
    P.line(D.r, D.disk.map(d => Math.sqrt(U) * d), { color: COL.amb, width: 1.8, dash: [8, 6] });
    if (md === 'halo') P.line(D.r, hal2.map(Math.sqrt), { color: COL.obs, width: 2.5, dash: [10, 6] });
    P.line(D.r, vis, { color: COL.amb, width: 3 });
    if (md !== 'light') P.line(D.r, tot, { color: md === 'halo' ? COL.obs : COL.ana, width: 3.5, glow: 12 });
    const c = P.ctx; c.save(); c.strokeStyle = 'rgba(238,240,246,.55)'; c.lineWidth = 1.4;
    D.r.forEach((r, i) => { c.beginPath(); c.moveTo(P.X(r), P.Y(D.v[i] - D.e[i])); c.lineTo(P.X(r), P.Y(D.v[i] + D.e[i])); c.stroke(); });
    c.fillStyle = COL.text; D.r.forEach((r, i) => { c.beginPath(); c.arc(P.X(r), P.Y(D.v[i]), 3.6, 0, 7); c.fill(); }); c.restore();
    P.unclip();
    P.text(37, 40 + vis[N - 1] * 0.2, 'stars + gas', { color: COL.amb, align: 'center', size: 17 });
    if (md === 'halo') P.text(37, hal2[N - 8] ** 0.5 - 14, 'dark halo', { color: COL.obs, align: 'center', size: 17 });

    const res = D.r.map((_, i) => D.v[i] - tot[i]), chi = res.reduce((s, r, i) => s + (r / D.e[i]) ** 2, 0);
    const p = md === 'halo' ? 2 : 1, rms = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / N);
    const rat = md === 'halo' ? hal2[N - 1] / vis2[N - 1] : NaN;
    out.innerHTML = `<span>χ²/ν <b>${(chi / (N - p)).toFixed(chi / (N - p) < 20 ? 2 : 0)}</b></span><span>rms residual <b>${rms.toFixed(1)} km/s</b></span>` +
      (md === 'halo' ? `<span>dark / visible mass inside ${D.r[N - 1].toFixed(0)} kpc <b>${rat.toFixed(1)}</b></span>` : md === 'mond' ? '<span>a₀ <b>1.2×10⁻¹⁰ m/s²</b></span><span>distance fixed</span>' : '<span>nothing else in the galaxy</span>');
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Espectro TT do CMB. D_ℓ do CLASS v3.4.1 numa grade (ω_c, ω_b) com 100θ_s fixo e os demais parâmetros no
   melhor ajuste do Planck 2018; bilinear em ln D_ℓ, ln h e na idade. Com θ_s fixo, h é o que resta:
   H₀ e a idade do leitor são o preço de manter os picos no lugar. Pontos: Planck 2018, binados.
   χ²/N usa só as barras diagonais: é guia visual, não a verossimilhança.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('cmb-plot'); if (!cv) return;
  const C = EV.cmb, out = document.getElementById('cmb-out');
  const getC = bindRange('cmb-c', v => v.toFixed(3), () => go());
  const getB = bindRange('cmb-b', v => v.toFixed(4), () => go());
  const P = new Plot(cv, { x: [2, 2500], y: [0, 6500], m: [14, 20, 62, 86], fs: 16 });
  const brk = (A, x) => { let i = 0; while (i < A.length - 2 && x > A[i + 1]) i++; return [i, Math.max(0, Math.min(1, (x - A[i]) / (A[i + 1] - A[i])))]; };
  const bil = (F, wc, wb) => {
    const [i, u] = brk(C.wc, wc), [j, v] = brk(C.wb, wb);
    return Math.exp((1 - u) * ((1 - v) * Math.log(F[i][j]) + v * Math.log(F[i][j + 1])) + u * ((1 - v) * Math.log(F[i + 1][j]) + v * Math.log(F[i + 1][j + 1])));
  };
  const spectrum = (wc, wb) => {
    const [i, u] = brk(C.wc, wc), [j, v] = brk(C.wb, wb), A = C.D[i][j], B = C.D[i][j + 1], E = C.D[i + 1][j], F = C.D[i + 1][j + 1];
    return C.l.map((_, k) => Math.exp((1 - u) * ((1 - v) * Math.log(A[k]) + v * Math.log(B[k])) + u * ((1 - v) * Math.log(E[k]) + v * Math.log(F[k]))));
  };
  const ref = spectrum(0.1201075, 0.0223828);

  function draw() {
    const wc = Math.max(getC(), 1e-4), wb = getB(), D = spectrum(wc, wb);
    P.set('y', [0, Math.max(6500, 1.1 * Math.max(...D))]);
    P.begin().frame('multipole ℓ', 'Dℓ (μK²)');
    P.clip();
    P.line(C.l, ref, { color: COL.text3, width: 2, dash: [6, 6] });
    P.area(C.l, D, 0, { color: COL.amb, alpha: 0.1 });
    P.line(C.l, D, { color: COL.amb, width: 3.2, glow: 12 });
    const c = P.ctx; c.save(); c.strokeStyle = 'rgba(238,240,246,.6)'; c.lineWidth = 1.4;
    C.pl.forEach((l, i) => { c.beginPath(); c.moveTo(P.X(l), P.Y(C.pd[i] - C.pe[i])); c.lineTo(P.X(l), P.Y(C.pd[i] + C.pe[i])); c.stroke(); });
    c.fillStyle = COL.text; C.pl.forEach((l, i) => { c.beginPath(); c.arc(P.X(l), P.Y(C.pd[i]), 3.2, 0, 7); c.fill(); }); c.restore();
    P.unclip();
    let chi = 0;
    C.pl.forEach((l, i) => { let k = 0; while (k < C.l.length - 2 && l > C.l[k + 1]) k++; const t = (l - C.l[k]) / (C.l[k + 1] - C.l[k]), m = D[k] + t * (D[k + 1] - D[k]); chi += ((C.pd[i] - m) / C.pe[i]) ** 2; });
    const h = bil(C.h, wc, wb), age = bil(C.age, wc, wb);
    out.innerHTML = `<span>dark / baryonic <b>${(wc / wb).toFixed(1)}</b></span><span>χ²/N against Planck <b>${chi / C.pl.length < 20 ? (chi / C.pl.length).toFixed(2) : Math.round(chi / C.pl.length)}</b></span>` +
      `<span>H₀ needed <b>${(100 * h).toFixed(0)} km/s/Mpc</b></span><span>age <b>${age.toFixed(1)} Gyr</b></span>`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Crescimento das perturbações (CLASS): δ_cdm e δ_b em k = 0,5 Mpc⁻¹, amplitude rms por ln k com o A_s do
   Planck. O universo sem matéria escura troca ω_c por Λ, com o mesmo ω_b, h e espectro primordial.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('grow-plot'); if (!cv) return;
  const G = EV.grow, a0 = 1e-4;
  const P = new Plot(cv, { x: [a0, 1], y: [1e-7, 10], xlog: true, ylog: true, m: [14, 24, 62, 84], fs: 16,
    yticks: [1e-7, 1e-5, 1e-3, 1e-1, 10], xticks: [1e-4, 1e-3, 1e-2, 1e-1, 1], xfmt: v => `1/${Math.round(1 / v).toLocaleString('en')}`.replace('1/1', '1').replace(/^1$/, 'today') });
  function draw() {
    P.set('xfmt', v => v === 1 ? 'today' : `10${SUP(Math.round(Math.log10(v)))}`);
    P.begin().frame('scale factor a', 'δ (rms per ln k)');
    P.clip();
    P.hline(1, { color: COL.text3 });
    P.vline(1 / 1090, { color: COL.text3, label: 'recombination', side: 'right', y: P.T + 4 });
    P.vline(1 / 3400, { color: COL.text3, label: 'equality', side: 'left', y: P.T + 4 });
    P.line(G.nocdm.a, G.nocdm.b, { color: COL.warn, width: 2.5 });
    P.line(G.lcdm.a, G.lcdm.b, { color: COL.amb, width: 2.5 });
    P.line(G.lcdm.a, G.lcdm.c, { color: COL.obs, width: 3.4, glow: 12 });
    P.unclip();
    const c = G.lcdm, n = G.nocdm;
    P.text(1.3e-3, 1.5, 'δ ~ 1: collapse', { color: COL.text3, size: 15, base: 'bottom' });
    P.text(1.2e-3, 2.5e-2, 'dark matter', { color: COL.obs, size: 17 });
    P.text(4e-3, 1.5e-4, 'baryons, with dark matter', { color: COL.amb, size: 17 });
    P.text(1.6e-2, 1.2e-6, 'baryons alone', { color: COL.warn, size: 17 });
    P.dot(1, c.c[c.c.length - 1], { color: COL.obs, r: 6 });
    P.dot(1, n.b[n.b.length - 1], { color: COL.warn, r: 6 });
  }
  onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Mapa dos candidatos: log₁₀(m/eV) de 10⁻²⁴ a 10⁷⁰ eV. Bandas e limites citados nas notas do slide.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('cand-plot'); if (!cv) return;
  const G_EV = Math.log10(5.61e32), SUN = Math.log10(1.116e66);   // 1 g e 1 M☉ em eV
  const rows = ['waves', 'particles', 'objects'], sub = ['coherent fields', 'single quanta', 'macroscopic'];
  const bands = [
    // linha, sub-linha, de, até, rótulo, cor, destaque, excluído, lado do rótulo
    [0, 0, -22, -19.7, 'fuzzy scalars', COL.warn, 0, 1, 't'],
    [0, 0, -19.7, 0, 'axion-like particles', COL.ana, 0, 0, 't'],
    [0, 1, -6, -3, 'QCD axion', COL.deg, 1, 0, 'b'],
    [1, 0, 3, 4.7, 'sterile ν', COL.ana, 0, 0, 't'],
    [1, 1, 4.68, 5.54, 'RAR', COL.obs, 1, 0, 'b'],
    [1, 1, 6, 9, 'sub-GeV dark sectors', COL.ana, 0, 0, 'r'],
    [1, 0, 9, 14, 'WIMPs', COL.obs, 1, 0, 't'],
    [1, 0, 21, 28, 'superheavy relics', COL.ana, 0, 0, 't'],
    [2, 0, G_EV + 17, G_EV + 22, 'asteroid-mass PBHs', COL.ana, 0, 0, 't'],
    [2, 0, SUN - 8, SUN + 3, 'PBHs, MACHOs: excluded', COL.warn, 0, 1, 't'],
  ];
  const marks = [[0, '1 eV'], [9, '1 GeV'], [Math.log10(1.22e28), 'Planck mass'], [G_EV, '1 g'], [SUN, '1 M☉']];
  function draw() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const L = 150, R = w - 30, T = 56, B = h - 62, X = v => L + (v + 24) / 94 * (R - L), rh = (B - T) / 3;
    c.font = `15px ${FONT}`;
    rows.forEach((a, i) => {
      const y = T + i * rh; c.fillStyle = i % 2 ? 'rgba(255,255,255,.018)' : 'rgba(255,255,255,.04)'; c.fillRect(L, y, R - L, rh);
      c.fillStyle = COL.text; c.font = `italic 30px ${SERIF}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(a, 0, y + rh / 2 + 2);
      c.fillStyle = COL.text3; c.font = `14px ${FONT}`; c.fillText(sub[i], 0, y + rh / 2 + 24);
    });
    // eixo
    c.strokeStyle = COL.axis; c.beginPath(); c.moveTo(L, B); c.lineTo(R, B); c.stroke();
    c.fillStyle = COL.text3; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let e = -20; e <= 70; e += 10) { c.fillText(`10${SUP(e)}`, X(e), B + 10); c.strokeStyle = COL.grid; c.beginPath(); c.moveTo(X(e), T); c.lineTo(X(e), B); c.stroke(); }
    c.fillStyle = COL.text2; c.font = `16px ${FONT}`; c.textBaseline = 'bottom'; c.fillText('mass (eV)', (L + R) / 2, h - 2);
    marks.forEach(([x, s]) => {
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(X(x), T - 8); c.lineTo(X(x), B); c.stroke(); c.setLineDash([]);
      c.fillStyle = COL.text2; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(s, X(x), T - 12);
    });
    // Pauli: férmions abaixo daqui não cabem nas anãs
    const xp = X(Math.log10(130)); c.strokeStyle = COL.warn; c.lineWidth = 2; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(xp, T + rh + 8); c.lineTo(xp, T + 2 * rh - 8); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    c.fillStyle = COL.warn; c.font = `14px ${FONT}`; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('Pauli bound on fermions', xp - 8, T + rh + 12);
    // bandas
    bands.forEach(([r, q, a, b, s, col, hl, ex, pos]) => {
      const H = rh * 0.26, y = T + r * rh + rh * (q ? 0.5 : 0.2), x0 = X(a), x1 = X(b);
      c.save();
      c.fillStyle = col; c.globalAlpha = hl ? 0.9 : ex ? 0.2 : 0.3;
      if (hl) { c.shadowColor = col; c.shadowBlur = 16; }
      c.beginPath(); c.roundRect(x0, y, Math.max(6, x1 - x0), H, 6); c.fill();
      c.restore();
      if (ex) {
        c.save(); c.beginPath(); c.roundRect(x0, y, x1 - x0, H, 6); c.clip(); c.strokeStyle = col; c.globalAlpha = 0.65; c.lineWidth = 1.5;
        for (let p = x0 - H; p < x1; p += 9) { c.beginPath(); c.moveTo(p, y + H); c.lineTo(p + H, y); c.stroke(); } c.restore();
      }
      c.fillStyle = hl ? COL.text : COL.text2; c.font = `${hl ? 600 : 400} 15px ${FONT}`;
      if (pos === 'r') { c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, x1 + 8, y + H / 2); return; }
      c.textAlign = 'center'; c.textBaseline = pos === 'b' ? 'top' : 'bottom';
      c.fillText(s, Math.min(R - 90, Math.max(L + 44, (x0 + x1) / 2)), pos === 'b' ? y + H + 4 : y - 4);
    });
  }
  onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Freeze-out. dY/dx = −√(π/45) (g*ˢ/√g*) M_Pl m ⟨σv⟩ x⁻² (Y² − Y_eq²), com g*ˢ = g* e g*(T) tabelado;
   Y_eq = 0,145 (g/g*) x^{3/2} e^{−x}, g = 2. Euler implícito em ln x (a quadrática tem solução fechada).
   Ωh² = 2,742×10⁸ (m/GeV) Y∞. Conferido com um integrador rígido (scipy Radau): 0,1165 × 0,1153 a 100 GeV e
   2,2×10⁻²⁶ cm³/s; dá ⟨σv⟩ ≈ 2,1×10⁻²⁶ para Ωh² = 0,12 (Steigman, Dasgupta & Beacom 2012: 2,2×10⁻²⁶).
   ------------------------------------------------------------------------- */
const FREEZE = (() => {
  const TG = [[1e-4, 3.4], [5e-4, 8], [1e-3, 10.7], [1e-2, 10.75], [1e-1, 17.3], [0.15, 20], [0.2, 50], [0.3, 61.75], [1, 75.75], [3, 80], [10, 86.25], [100, 96], [300, 105], [1000, 106.75]];
  const gstar = T => { if (T <= TG[0][0]) return TG[0][1]; for (let i = 1; i < TG.length; i++) if (T <= TG[i][0]) { const [a, ga] = TG[i - 1], [b, gb] = TG[i]; return ga + Math.log(T / a) / Math.log(b / a) * (gb - ga); } return 106.75; };
  const yeq = (x, g) => 0.14503 * (2 / g) * x ** 1.5 * Math.exp(-x);
  function solve(m, sv, n = 3000, xmax = 2e5) {
    const A = Math.sqrt(Math.PI / 45) * 1.2209e19 * m * sv / 1.1673e-17, dl = Math.log(xmax) / n;
    let Y = yeq(1, gstar(m)), xf = 0; const X = [], Ys = [], Es = [];
    for (let i = 1; i <= n; i++) {
      const x = Math.exp(i * dl), g = gstar(m / x), a = dl * A * Math.sqrt(g) / x, e = yeq(x, g), q = Y + a * e * e;
      Y = 2 * q / (1 + Math.sqrt(1 + 4 * a * q));   // a raiz estável, sem perder dígitos
      if (!xf && Y > 2.5 * e) xf = x;
      if (i % 12 === 0) { X.push(x); Ys.push(Y); Es.push(e); }
    }
    return { X, Y: Ys, E: Es, xf, Yinf: Y, om: 2.742e8 * m * Y };
  }
  return { solve };
})();

(() => {
  const cv = document.getElementById('fo-plot'); if (!cv) return;
  const out = document.getElementById('fo-out');
  const getS = bindRange('fo-s', v => `${(10 ** v / 1e-26).toFixed(1)}×10⁻²⁶ cm³/s`, () => go());
  const getM = bindRange('fo-m', v => { const m = 10 ** v; return m >= 1000 ? (m / 1000).toFixed(1) + ' TeV' : m.toFixed(0) + ' GeV'; }, () => go());
  const P = new Plot(cv, { x: [1, 2e5], y: [1e-16, 1e-2], xlog: true, ylog: true, m: [14, 24, 62, 84], fs: 16, yticks: [1e-16, 1e-13, 1e-10, 1e-7, 1e-4] });
  // Ω ∝ 1/⟨σv⟩ é só aproximado (x_f e g* mudam): itera a partir do ponto do slider
  const target = (m, sv, om) => { let s = sv * om / 0.12; for (let k = 0; k < 3; k++) s *= FREEZE.solve(m, s, 1500).om / 0.12; return s; };
  function draw() {
    const sv = 10 ** getS(), m = 10 ** getM(), r = FREEZE.solve(m, sv), lo = FREEZE.solve(m, sv * 10, 1500), hi = FREEZE.solve(m, sv / 10, 1500);
    const Yneed = 0.12 / (2.742e8 * m);
    P.begin().frame('x = m / T   (time →)', 'comoving abundance Y');
    P.clip();
    P.line(r.X, r.E, { color: COL.text3, width: 2, dash: [7, 6] });
    P.line(hi.X, hi.Y, { color: COL.amb, width: 1.8, alpha: 0.45 });
    P.line(lo.X, lo.Y, { color: COL.amb, width: 1.8, alpha: 0.45 });
    P.line(r.X, r.Y, { color: COL.amb, width: 3.4, glow: 12 });
    P.hline(Yneed, { color: COL.deg, label: 'needed for Ωh² = 0.12' });
    P.unclip();
    P.text(1.25, 2e-6, 'equilibrium', { color: COL.text3, size: 16 });
    P.text(6e3, hi.Yinf * 1.9, '⟨σv⟩ ÷ 10', { color: COL.amb, size: 15, base: 'bottom' });
    P.text(6e3, lo.Yinf * 0.5, '⟨σv⟩ × 10', { color: COL.amb, size: 15, base: 'top' });
    out.innerHTML = `<span>Ωh² <b>${r.om < 10 ? r.om.toFixed(3) : r.om.toFixed(0)}</b></span><span>x<sub>f</sub> <b>${r.xf.toFixed(0)}</b></span>` +
      `<span>⟨σv⟩ for Ωh² = 0.12 <b>${(target(m, sv, r.om) / 1e-26).toFixed(1)}×10⁻²⁶ cm³/s</b></span>`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Detecção direta: σ_SI × m_χ. Curvas: compilação de O'Hare. Pontos: o resultado do ano, dos resumos dos
   artigos. Névoa: nuFog n = 2 no xenônio. E_R,max = 2μ²v²/m_A, v = 776 km/s no laboratório, m_A do ¹³¹Xe.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('dd-plot'); if (!cv) return;
  const out = document.getElementById('dd-out');
  const getY = bindRange('dd-y', v => String(v), () => go());
  const getM = bindRange('dd-m', v => { const m = 10 ** v; return m < 10 ? m.toFixed(2) + ' GeV' : m < 1000 ? m.toFixed(0) + ' GeV' : (m / 1000).toFixed(1) + ' TeV'; }, () => go());
  const P = new Plot(cv, { x: [0.3, 1e4], y: [1e-50, 1e-38], xlog: true, ylog: true, m: [14, 24, 62, 92], fs: 16,
    yticks: [1e-50, 1e-48, 1e-46, 1e-44, 1e-42, 1e-40, 1e-38], xticks: [1, 10, 100, 1000, 1e4] });
  const COLS = { 'ZEPLIN-III': COL.text3, LUX: '#8f97ab', CDMSlite: COL.text3, XENON1T: '#c3c8d6', 'CRESST-III': COL.ana, 'DarkSide-50': COL.neb, 'PandaX-4T': COL.deg, LZ: COL.amb, XENONnT: COL.obs };
  const ER = m => { const mA = 122.1, mu = m * mA / (m + mA), v = 776 / 299792.458; return 2 * mu * mu * v * v / mA * 1e6; };   // keV
  const fmtKeV = e => e >= 1 ? e.toFixed(e < 10 ? 1 : 0) + ' keV' : e >= 1e-3 ? (e * 1e3).toFixed(0) + ' eV' : (e * 1e6).toFixed(1) + ' μeV';

  function draw() {
    const yr = getY(), m = 10 ** getM();
    P.begin().frame('dark-matter mass (GeV)', 'SI cross section σ (cm²)');
    P.clip();
    P.area(EV.fog.m, EV.fog.s, 1e-50, { color: COL.ana, alpha: 0.2 });
    P.line(EV.fog.m, EV.fog.s, { color: COL.ana, width: 1.5, alpha: 0.7 });
    if (yr >= 2008) {
      const c = P.ctx; EV.dama.forEach(d => { c.save(); c.fillStyle = COL.warn; c.globalAlpha = yr >= 2025 ? 0.3 : 0.5; P.path(d.m, d.s); c.closePath(); c.fill(); c.restore(); });
    }
    if (yr >= 2026) P.line(EV.xlzd.m, EV.xlzd.s, { color: COL.amb, width: 1.8, dash: [7, 6], alpha: 0.7 });
    EV.si.filter(s => s.y <= yr).forEach(s => {
      P.line(s.m, s.s, { color: COLS[s.k], width: s.hi ? 3.2 : 2, glow: s.hi ? 10 : 0 });
    });
    const tr = EV.best.filter(b => b.y <= yr);
    if (tr.length > 1) P.line(tr.map(b => b.m), tr.map(b => b.s), { color: 'rgba(255,255,255,.4)', width: 1.4, dash: [2, 5] });
    tr.forEach(b => P.dot(b.m, b.s, { color: COL.text, r: 4.5, glow: 8 }));
    P.vline(m, { color: 'rgba(255,255,255,.5)', dash: [5, 5], width: 1.3 });
    P.unclip();
    P.text(1.2, 3e-48, 'neutrino fog', { color: COL.ana, size: 17 });
    if (yr >= 2008) P.text(11, 1.6e-39, 'DAMA/LIBRA', { color: COL.warn, size: 15 });
    if (yr >= 2019) P.text(0.42, 3e-40, 'CRESST-III', { color: COL.ana, size: 15 });
    if (yr >= 2022) P.text(0.62, 6e-44, 'DarkSide-50', { color: COL.neb, size: 15 });
    if (yr >= 2026) P.text(330, 2.2e-50, 'XLZD 1000 t·yr, projected', { color: COL.amb, size: 14, align: 'left', base: 'bottom' });
    const lim = EV.si.filter(s => s.y <= yr).map(s => logInterp(s.m, s.s, m)).filter(isFinite), best = lim.length ? Math.min(...lim) : NaN;
    const fog = logInterp(EV.fog.m, EV.fog.s, m), last = tr[tr.length - 1];
    out.innerHTML = (last ? `<span>${yr}: best <b>${sci(last.s, 1)} cm²</b> <small>(${last.k}, ${last.m} GeV)</small></span>` : '') +
      `<span>limit at this mass <b>${isFinite(best) ? sci(best, 1) + ' cm²' : 'none'}</b></span><span>fog there <b>${isFinite(fog) ? sci(fog, 1) + ' cm²' : '—'}</b></span>` +
      `<span>largest recoil on Xe <b>${fmtKeV(ER(m))}</b></span>`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   Áxions: acoplamento g_aγ × m_a, envelope dos haloscópios (compilação de O'Hare).
   m_a = 5,7 μeV (10¹² GeV/f_a); g = (α/2πf_a)|E/N − 1,92|: KSVZ (E/N = 0) dá 3,9×10⁻¹⁶ GeV⁻¹ por μeV,
   DFSZ (E/N = 8/3) dá 1,52×10⁻¹⁶ GeV⁻¹ por μeV. Frequência da cavidade: ν = m_a c²/h = 0,2418 GHz por μeV.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('ax-plot'); if (!cv) return;
  const out = document.getElementById('ax-out'), A = EV.ax;
  const getM = bindRange('ax-m', v => (10 ** v).toFixed(1) + ' μeV', () => go());
  const P = new Plot(cv, { x: [1.6e-6, 1.4e-4], y: [1e-16, 1e-9], xlog: true, ylog: true, m: [14, 24, 62, 92], fs: 16,
    xticks: [2e-6, 5e-6, 1e-5, 2e-5, 5e-5, 1e-4], yticks: [1e-16, 1e-14, 1e-12, 1e-10],
    xfmt: v => `${Math.round(v * 1e6)} μeV` });
  const KSVZ = m => 3.9e-16 * m / 1e-6, DFSZ = m => 1.52e-16 * m / 1e-6;
  function draw() {
    const um = 10 ** getM(), m = um * 1e-6, ms = logspace(1.6e-6, 1.4e-4, 40);
    P.begin().frame('axion mass', 'coupling to photons g (GeV⁻¹)');
    P.clip();
    const c = P.ctx, W = (P.R - P.L) / 180;
    c.save(); c.fillStyle = COL.deg; c.globalAlpha = 0.14;
    c.beginPath(); c.moveTo(P.X(ms[0]), P.Y(KSVZ(ms[0]))); ms.forEach(x => c.lineTo(P.X(x), P.Y(KSVZ(x)))); [...ms].reverse().forEach(x => c.lineTo(P.X(x), P.Y(DFSZ(x)))); c.closePath(); c.fill(); c.restore();
    c.save(); c.fillStyle = COL.amb; c.globalAlpha = 0.85;
    A.m.forEach((x, i) => { const X = P.X(x), wd = Math.abs(P.X(x * 1.0046) - X) + 0.7; c.fillRect(X, P.T, wd, P.Y(A.g[i]) - P.T); });
    c.restore();
    P.line(ms, ms.map(KSVZ), { color: COL.deg, width: 2.4 });
    P.line(ms, ms.map(DFSZ), { color: COL.deg, width: 2.4, dash: [7, 6] });
    P.hline(EV.cast, { color: COL.text2 });
    P.vline(m, { color: 'rgba(255,255,255,.5)', dash: [5, 5], width: 1.3 });
    P.unclip();
    P.text(6e-5, KSVZ(6e-5) * 1.7, 'KSVZ', { color: COL.deg, size: 16, base: 'bottom', align: 'center' });
    P.text(6e-5, DFSZ(6e-5) * 0.55, 'DFSZ', { color: COL.deg, size: 16, base: 'top', align: 'center' });
    [[3.3e-6, 'ADMX'], [1.05e-5, 'CAPP']].forEach(([x, s]) => P.text(x, 1.6e-12, s, { color: '#0a0b12', size: 16, align: 'center' }));
    c.save(); c.translate(P.X(2.05e-5), P.Y(1.6e-12)); c.rotate(-Math.PI / 2); c.fillStyle = '#0a0b12'; c.font = `16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HAYSTAC', 0, 0); c.restore();
    P.text(1.62e-6, EV.cast * 1.25, 'CAST', { color: COL.text2, size: 14, base: 'bottom' });
    P.text(6.6e-5, 8e-13, 'ORGAN · QUAX', { color: COL.amb, size: 15, align: 'center' });
    let g = Infinity; A.m.forEach((x, i) => { if (Math.abs(Math.log(x / m)) < 0.012) g = Math.min(g, A.g[i]); });
    out.innerHTML = `<span>cavity <b>${(0.2418 * um).toFixed(2)} GHz</b></span><span><i>f</i><sub>a</sub> <b>${sci(5.7e12 / um, 1)} GeV</b></span>` +
      `<span>limit / KSVZ <b>${isFinite(g) && g < 1e-3 ? (g / KSVZ(m)).toFixed(1) : 'not searched'}</b></span><span>limit / DFSZ <b>${isFinite(g) && g < 1e-3 ? (g / DFSZ(m)).toFixed(1) : '—'}</b></span>`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   O modelo RAR, resolvido no navegador. Argüelles et al., PDU 21, 82 (2018), Eqs. 1–3 e 9–13, g = 2:
   TOV com a Fermi–Dirac truncada f_c(ε ≤ ε_c) = (1 − e^{(ε−ε_c)/kT})/(e^{(ε−μ)/kT} + 1) e as condições de
   Tolman (e^{ν/2}T), Klein (e^{ν/2}(μ + mc²)) e da energia (e^{ν/2}(ε_c + mc²)), que dão β(r) = β₀e^{(ν₀−ν)/2} e
   W(r) = W₀ + θ(r) − θ₀. Unidades r̂ = r/χ, M̂ = GM/(c²χ), χ = 2π^{3/2}(ħ/mc)(m_P/m); com u² = 2βx + (βx)²:
   ρ̂ = 4πβ∫f_c(1 + βx)²u dx, P̂ = (4π/3)β∫f_c u³ dx, x = ε/kT. O perfil em m escala: r, M ∝ m⁻², ρ ∝ m⁴.
   RK4 em ln r com passo limitado por dθ/d ln r, Gauss–Legendre em √x, com janelas em torno de x = θ.
   Conferido com scipy DOP853 (rtol 10⁻⁹): ver README.

   A descoberta prática: W no platô, W_p = W₀ − (θ₀ − θ_∞), muda o halo sem tocar no núcleo, e θ_∞ só depende
   do núcleo. A combinação física é v_e = c√(2W_pβ), a velocidade de escape no platô: o painel usa v_e, e W₀
   sai dela, porque um W₀ direto exigiria cinco dígitos. O inverso não vale: ρ_platô ∝ e^{θ_∞}, então θ₀ e
   β₀ movem o núcleo e o halo.
   ------------------------------------------------------------------------- */
const RAR = (() => {
  const G = 6.6743e-8, C = 2.99792458e10, HB = 1.054571817e-27, PC = 3.0856775814913673e18, MS = 1.98841e33, EV = 1.602176634e-12, GEV = 1.78266192e-24;
  const NG = 24, gx = new Float64Array(NG), gw = new Float64Array(NG);
  for (let i = 0; i < NG; i++) {   // nós de Gauss–Legendre por Newton
    let x = Math.cos(Math.PI * (i + 0.75) / (NG + 0.5)), dp = 0;
    for (let it = 0; it < 60; it++) { let p0 = 1, p1 = x; for (let n = 2; n <= NG; n++) { const p2 = ((2 * n - 1) * x * p1 - (n - 1) * p0) / n; p0 = p1; p1 = p2; } dp = NG * (x * p1 - p0) / (x * x - 1); const dx = p1 / dp; x -= dx; if (Math.abs(dx) < 1e-15) break; }
    gx[i] = x; gw[i] = 2 / ((1 - x * x) * dp * dp);
  }
  const units = mkeV => { const m = mkeV * 1e3 * EV / (C * C), mp = Math.sqrt(HB * C / G), chi = 2 * Math.PI ** 1.5 * (HB / (m * C)) * (mp / m); return { m, chi, Mu: C * C * chi / G, rhou: C * C / (G * chi * chi) }; };
  let RHO = 0, PR = 0;
  const W_INF = 1e9;
  function eos(beta, th, W) {
    RHO = 0; PR = 0; if (W <= 0) return;
    const e = [0]; if (th > 0) { const a = Math.max(th - 14, 0), b = th + 14; if (a > 0 && a < W) e.push(a); if (th < W) e.push(th); if (b < W) e.push(b); e.push(Math.min(W, th + 45)); }
    else { for (const q of [6, 20]) if (q < W) e.push(q); e.push(Math.min(W, 45)); }
    let Ir = 0, Ip = 0;
    for (let k = 0; k + 1 < e.length; k++) {
      const sa = Math.sqrt(e[k]), sb = Math.sqrt(e[k + 1]), hw = 0.5 * (sb - sa), md = 0.5 * (sb + sa);
      for (let i = 0; i < NG; i++) {
        const s = md + hw * gx[i], x = s * s, wt = hw * gw[i] * 2 * s, bx = beta * x, u = Math.sqrt(2 * bx + bx * bx);
        const fr = W >= W_INF ? 1 : -Math.expm1(x - W), f = fr / (Math.exp(x - th) + 1);
        Ir += wt * f * (1 + bx) * (1 + bx) * u; Ip += wt * f * u * u * u;
      }
    }
    RHO = 4 * Math.PI * beta * Ir; PR = 4 * Math.PI / 3 * beta * Ip;
  }
  // integra de r̂₀ até W = 0 (ou rMax, em pc); core = true para na parte kepleriana, só para achar θ_∞
  function integrate(mkeV, b0, th0, W0, core) {
    const U = units(mkeV); eos(b0, th0, W0); const rho0 = RHO, r0 = 1e-6 / Math.sqrt(rho0);
    let t = Math.log(r0), M = 4 / 3 * Math.PI * r0 * r0 * r0 * rho0, th = th0, nu = 0, stop = false;
    const tEnd = Math.log(3e6 * PC / U.chi), out = { r: [], M: [], rho: [], th: [], W: [], beta: [], nu: [] };
    let dthKeep = 0;
    const f = (tt, MM, tth, nnu) => {
      const r = Math.exp(tt), W = W0 >= W_INF ? W_INF : W0 + tth - th0, beta = b0 * Math.exp(-nnu / 2);
      if (core && tth < -12) { RHO = 0; PR = 0; } else eos(beta, tth, W);   // θ_∞: só o núcleo, sem o halo que W = ∞ criaria
      const A = (MM + 4 * Math.PI * PR * r * r * r) / (r * (1 - 2 * MM / r));
      return [4 * Math.PI * r * r * r * RHO, -(1 - b0 * (tth - th0)) / b0 * A, 2 * A];
    };
    for (let n = 0; n < 6000 && t < tEnd && !stop; n++) {
      const k1 = f(t, M, th, nu), rhoNow = RHO, dth = Math.abs(k1[1]), W = W0 >= W_INF ? W_INF : W0 + th - th0;
      const r = Math.exp(t), beta = b0 * Math.exp(-nu / 2);
      out.r.push(r); out.M.push(M); out.rho.push(rhoNow); out.th.push(th); out.W.push(W); out.beta.push(beta); out.nu.push(nu);
      // M̂ muda sobre ln r ~ M/(dM/dlnr); θ muda em unidades de 1; W perto de zero pede passos relativos a W
      const dM = Math.abs(k1[0]) / (M + 1e-300);
      let h = Math.min(0.05, 0.12 / (dth + 1e-30), 0.15 / (dM + 1e-30));
      if (W0 < W_INF && W < 60) h = Math.min(h, 0.08 * W / (dth + 1e-30));
      h = Math.max(h, 2e-4);
      if (core && out.r.length > 40 && th < -12 && M / r / b0 < 1e-3) break;
      const k2 = f(t + h / 2, M + h / 2 * k1[0], th + h / 2 * k1[1], nu + h / 2 * k1[2]);
      const k3 = f(t + h / 2, M + h / 2 * k2[0], th + h / 2 * k2[1], nu + h / 2 * k2[2]);
      const k4 = f(t + h, M + h * k3[0], th + h * k3[1], nu + h * k3[2]);
      M += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); th += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); nu += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); t += h;
      if (W0 < W_INF && W0 + th - th0 < 1e-5) stop = true;
    }
    return { U, out, thInf: th - (1 - b0 * (th - th0)) * (M / Math.exp(t)) / b0 };
  }
  const thetaInf = (mkeV, b0, th0) => integrate(mkeV, b0, th0, W_INF, true).thInf;
  function solve(mkeV, b0, th0, W0) {
    const { U, out } = integrate(mkeV, b0, th0, W0, false), n = out.r.length;
    const r = out.r.map(x => x * U.chi / PC), M = out.M.map(x => x * U.Mu / MS), rho = out.rho.map(x => x * U.rhou / GEV);
    const v = r.map((x, i) => Math.sqrt(G * M[i] * MS / (x * PC)) / 1e5);
    const peaks = []; for (let i = 1; i < n - 1; i++) if (v[i] > v[i - 1] && v[i] >= v[i + 1]) peaks.push(i);
    const ic = peaks[0] ?? n - 1, ih = peaks.length > 1 ? peaks[peaks.length - 1] : -1;
    let ik = ic; while (ik < n - 1 && r[ik] < 300 * r[ic]) ik++;     // M_K: a massa do núcleo vista de fora
    return { m: mkeV, b0, th0, W0, r, M, rho, v, th: out.th, W: out.W, beta: out.beta, nu: out.nu, n, ic, ih, Mc: M[ic], rc: r[ic], MK: M[ik], rs: r[n - 1], Mt: M[n - 1] };
  }
  // interpola em ln r uma coluna do perfil
  const at = (S, key, R) => { const r = S.r; if (R <= r[0] || R >= r[S.n - 1]) return NaN; let i = 0, j = S.n - 1; while (j - i > 1) { const k = (i + j) >> 1; if (r[k] < R) i = k; else j = k; } const t = Math.log(R / r[i]) / Math.log(r[j] / r[i]); return S[key][i] + t * (S[key][j] - S[key][i]); };
  return { solve, thetaInf, at, units, W_INF };
})();

/* Painel do RAR: densidade à esquerda; à direita, curva de rotação, degenerescência ou f(v) local.
   Presets: 48 e 345 keV do Paper I, 56 keV de Becerra-Vergara et al. (2020). O de 100 keV é reconstrução
   nossa, porque o artigo de 2024 publica ρ₀, massa do núcleo e massa total, não (β₀, θ₀, W₀). O W₀ de
   345 keV sai de v_e: os três dígitos publicados de β₀ não bastam para abrir o halo. */
(() => {
  const cv = document.getElementById('rar-rho'); if (!cv) return;
  const cv2 = document.getElementById('rar-side'), out = document.getElementById('rar-out'), CK = 299792.458, SUN = 8000;
  const PRE = {
    48: { m: 48, b: 1.03e-5, t: 37.14, W: 65.252 }, 56: { m: 56, b: 1.1977e-5, t: 37.7656, W: 66.3407 },
    100: { m: 100, b: 5.39335e-4, t: 38.4056, W: 66.99675 }, 345: { m: 345, b: 5.04e-3, t: 47.59, ve: 300 },
  };
  let cur = PRE[56], exact = true, moving = false;
  const inT = document.getElementById('rar-t'), inB = document.getElementById('rar-b'), inV = document.getElementById('rar-v');
  const edit = () => { if (!moving) exact = false; go(); };
  const getT = bindRange('rar-t', v => v.toFixed(2), edit);
  const getB = bindRange('rar-b', v => { const e = Math.floor(v); return `${(10 ** (v - e)).toFixed(2)}×10${SUP(e)}`; }, edit);
  const getV = bindRange('rar-v', v => v.toFixed(0) + ' km/s', edit);
  const view = bindSeg('rar-view', () => go());
  const mSeg = bindSeg('rar-m', () => { load(PRE[mSeg()]); go(); });
  const Wof = (b, ve) => (ve / CK) ** 2 / (2 * b);
  function load(p) {
    cur = p; moving = true;
    const ti = RAR.thetaInf(p.m, p.b, p.t), ve = p.ve ?? CK * Math.sqrt(2 * (p.W - p.t + ti) * p.b);
    for (const [el, v] of [[inT, p.t], [inB, Math.log10(p.b)], [inV, ve]]) { el.value = v; el.dispatchEvent(new Event('input')); }
    moving = false; exact = true;
  }
  const L = new Plot(cv, { x: [1e-7, 3e5], y: [1e-5, 1e27], xlog: true, ylog: true, m: [14, 20, 62, 84], fs: 15, xticks: [1e-6, 1e-3, 1, 1e3], yticks: [1e-4, 1e2, 1e8, 1e14, 1e20, 1e26] });
  const Rt = new Plot(cv2, { x: [1e-7, 3e5], y: [1, 3e5], xlog: true, ylog: true, m: [14, 20, 62, 84], fs: 15, xticks: [1e-6, 1e-3, 1, 1e3], yticks: [1, 10, 100, 1e3, 1e4, 1e5] });
  const Dg = new Plot(cv2, { x: [1e-7, 3e5], y: [-70, 90], xlog: true, m: [14, 20, 62, 84], fs: 15, xticks: [1e-6, 1e-3, 1, 1e3], yticks: [-60, -30, 0, 30, 60, 90] });
  const Fv = new Plot(cv2, { x: [0, 720], y: [0, 1.15], m: [14, 20, 62, 84], fs: 15, yticks: [0, 0.5, 1], xticks: [0, 200, 400, 600] });

  function draw() {
    const m = cur.m, b = exact ? cur.b : 10 ** getB(), t = exact ? cur.t : getT(), ve = exact && cur.ve ? cur.ve : getV(), ti = RAR.thetaInf(m, b, t);
    const W0 = exact && cur.W ? cur.W : Wof(b, ve) + t - ti, S = RAR.solve(m, b, t, W0);
    const n = S.n, iq = S.th.findIndex(x => x < 0), k = iq < 0 ? n : iq, last = S.r[n - 1];
    L.begin().frame('radius r (pc)', 'density ρ (GeV/cm³)');
    L.clip();
    L.vline(S.rc, { color: COL.amb, dash: [4, 6], width: 1.2 });
    if (S.ih > 0) L.vline(S.r[S.ih], { color: COL.obs, dash: [4, 6], width: 1.2 });
    L.vline(SUN, { color: COL.text3, dash: [2, 6], width: 1.2, label: '8 kpc', side: 'left', y: L.T + 4 });
    L.line(S.r.slice(0, k + 1), S.rho.slice(0, k + 1), { color: COL.amb, width: 3.6, glow: 12 });
    L.line(S.r.slice(k), S.rho.slice(k), { color: COL.obs, width: 3, glow: 8 });
    L.unclip();
    L.text(S.rc * 1.6, Math.min(S.rho[0] * 6, 1e26), 'degenerate core', { color: COL.amb, size: 16 });
    const rp = Math.sqrt(Math.max(S.rc * 300, 1e-2) * Math.min(S.r[S.ih > 0 ? S.ih : n - 1], 3e3)), rhoP = RAR.at(S, 'rho', rp);
    if (isFinite(rhoP)) L.text(rp, rhoP * 60, 'plateau', { color: COL.obs, size: 16, align: 'center', base: 'bottom' });
    if (S.ih > 0) L.text(S.r[S.ih] * 0.1, S.rho[S.ih] * 0.012, 'diluted halo', { color: COL.obs, size: 16, align: 'right' });
    const vw = view();
    if (vw === 'rot') {
      Rt.begin().frame('radius r (pc)', 'circular speed (km/s)');
      Rt.clip();
      Rt.vline(6e-4, { color: COL.deg, dash: [4, 6], width: 1.3, label: 'S2 pericentre', y: Rt.T + 4 });
      const Kx = logspace(S.rc * 2, 3e3, 40); Rt.line(Kx, Kx.map(r => 0.06558 * Math.sqrt(S.MK / r)), { color: COL.text2, width: 1.6, dash: [6, 6] });
      Rt.line(S.r.slice(0, k + 1), S.v.slice(0, k + 1), { color: COL.amb, width: 3.4, glow: 10 });
      Rt.line(S.r.slice(k), S.v.slice(k), { color: COL.obs, width: 3.2, glow: 8 });
      Rt.unclip();
      Rt.text(0.4, 0.06558 * Math.sqrt(S.MK / 0.4) * 1.7, 'Keplerian, the core as a point', { color: COL.text2, size: 15 });
    } else if (vw === 'deg') {
      Dg.begin().frame('radius r (pc)', 'θ = μ/kT  and  W = ε_c/kT');
      Dg.clip();
      Dg.area([1e-7, 3e5], [90, 90], 0, { color: COL.amb, alpha: 0.05 });
      Dg.hline(0, { color: COL.text3, dash: [5, 6], label: 'θ > 0: degenerate', align: 'left' });
      Dg.line(S.r, S.W, { color: COL.deg, width: 2.8 });
      Dg.line(S.r, S.th, { color: COL.amb, width: 3.2, glow: 10 });
      Dg.unclip();
      Dg.text(S.r[Math.floor(n * 0.08)], S.th[Math.floor(n * 0.08)] - 9, 'θ', { color: COL.amb, size: 22, font: SERIF });
      Dg.text(S.r[Math.floor(n * 0.08)], Math.min(S.W[Math.floor(n * 0.08)] + 7, 64), 'W', { color: COL.deg, size: 22, font: SERIF });
      Dg.text(30, -42, 'classical, and held by the cutoff', { color: COL.text3, size: 15, align: 'center' });
    } else {
      Fv.begin().frame('speed at 8 kpc (km/s)', 'f(v), peak = 1');
      Fv.clip();
      const vs = linspace(0, 720, 240), mx = vs.map(v => v < 544 ? v * v * Math.exp(-((v / 220) ** 2)) : 0), mm = Math.max(...mx);
      Fv.line(vs, mx.map(x => x / mm), { color: COL.text3, width: 2.2, dash: [7, 6] });
      const B = RAR.at(S, 'beta', SUN), Th = RAR.at(S, 'th', SUN), Wl = RAR.at(S, 'W', SUN);
      if (isFinite(B) && Wl > 0) {
        const fv = vs.map(v => { const bt = v / CK, q = (1 / Math.sqrt(1 - bt * bt) - 1) / B; return q < Wl ? v * v * -Math.expm1(q - Wl) / (Math.exp(q - Th) + 1) : 0; }), fm = Math.max(...fv);
        Fv.area(vs, fv.map(x => x / fm), 0, { color: COL.obs, alpha: 0.16 }); Fv.line(vs, fv.map(x => x / fm), { color: COL.obs, width: 3.2, glow: 10 });
        const vm = CK * Math.sqrt(2 * Wl * B); Fv.vline(vm, { color: COL.obs, dash: [4, 6], width: 1.3, label: `RAR cut: ${vm.toFixed(0)} km/s`, y: Fv.T + 4 });
      } else Fv.text(360, 0.8, '8 kpc is outside this configuration', { color: COL.warn, size: 16, align: 'center' });
      Fv.unclip();
      Fv.text(470, 0.42, 'Maxwellian, 220 km/s', { color: COL.text3, size: 15 });
    }
    const r8 = RAR.at(S, 'rho', SUN);
    const lenFmt = r => r >= 1e3 ? (r / 1e3).toPrecision(3) + ' kpc' : r >= 1 ? r.toPrecision(3) + ' pc' : (r * 1e3).toPrecision(3) + ' mpc';
    out.innerHTML = `<span>core <b>${sci(S.Mc, 1)} M☉</b> in <b>${lenFmt(S.rc)}</b></span><span>seen from outside <b>${sci(S.MK, 2)} M☉</b></span>` +
      (S.ih > 0 ? `<span>halo peak <b>${S.v[S.ih].toFixed(0)} km/s</b> at <b>${lenFmt(S.r[S.ih])}</b></span>` : '') +
      `<span>edge <b>${lenFmt(last)}</b></span><span>total <b>${sci(S.Mt, 1)} M☉</b></span>` + (isFinite(r8) ? `<span>ρ(8 kpc) <b>${r8.toFixed(2)} GeV/cm³</b></span>` : '') +
      `<span>W₀ <b>${W0.toFixed(3)}</b></span>`;
  }
  const go = onSlide(cv, draw);
  load(PRE[56]);
})();

/* -------------------------------------------------------------------------
   O limite de Oppenheimer–Volkoff. TOV do gás ideal frio de fermions, g = 2 (tools/rar_check.py):
   M̂_max = 0,03445, ou seja M_OV = 0,384 m_P³/m² = 6,26×10⁷ M☉ (100 keV/m)², R = 4,54 R_S, ρ_c ∝ m⁴.
   Com a massa do nêutron: 0,709 M☉ e 9,51 km, o resultado de 1939. Raio de uma bola degenerada de
   4,2×10⁶ M☉, não relativística: M = 91,9 ħ⁶/(G³ m⁸ R³) (Krut et al. 2025); 0,6 mpc em 54,6 keV.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('ov-plot'); if (!cv) return;
  const out = document.getElementById('ov-out');
  const getM = bindRange('ov-m', v => (10 ** v).toFixed(0) + ' keV', () => go());
  const P = new Plot(cv, { x: [10, 1000], y: [1e5, 1e10], xlog: true, ylog: true, m: [14, 24, 62, 92], fs: 16, xticks: [10, 30, 100, 300, 1000], yticks: [1e5, 1e6, 1e7, 1e8, 1e9, 1e10] });
  const Mov = m => 6.26e7 * (100 / m) ** 2, SGR = 4.2e6;
  function draw() {
    const m = 10 ** getM(), ms = logspace(10, 1000, 60);
    P.begin().frame('fermion mass (keV)', 'core mass (M☉)');
    P.clip();
    const c = P.ctx; c.save(); c.fillStyle = COL.deg; c.globalAlpha = 0.13; c.globalAlpha = 0.2; c.fillRect(P.X(194), P.Y(SGR), P.X(387) - P.X(194), P.B - P.Y(SGR)); c.restore();
    c.save(); c.fillStyle = COL.warn; c.globalAlpha = 0.12; c.beginPath(); c.moveTo(P.X(10), P.T); ms.forEach(x => c.lineTo(P.X(x), P.Y(Math.min(Mov(x), 1e10)))); c.lineTo(P.X(1000), P.T); c.closePath(); c.fill(); c.restore();
    P.vline(57, { color: COL.text3, dash: [4, 6], width: 1.3 });
    P.hline(SGR, { color: COL.amb, dash: [7, 6], width: 1.8 });
    P.line(ms, ms.map(Mov), { color: COL.text, width: 3.2, glow: 10 });
    P.vline(100, { color: COL.obs, dash: [4, 6], width: 1.6 });
    P.dot(m, Mov(m), { color: COL.amb, r: 7 });
    P.unclip();
    P.text(70, 3.6e9, 'no equilibrium: collapse', { color: COL.warn, size: 16 });
    P.text(275, 2.1e6, 'stable', { color: COL.deg, size: 15, align: 'center' });
    P.text(275, 1.3e6, 'core', { color: COL.deg, size: 15, align: 'center' });
    P.text(12, SGR * 1.35, 'Sgr A*, 4.2×10⁶ M☉', { color: COL.amb, size: 15, base: 'bottom' });
    P.text(59, 2e5, 'S2 precession', { color: COL.text3, size: 14 });
    P.text(103, 1.4e5, 'this work', { color: COL.obs, size: 14 });
    const R = 0.0272 * (100 / m) ** 2, rho = 0.463 * (m / 100) ** 4, Rb = 0.6 * (54.6 / m) ** (8 / 3);
    out.innerHTML = `<span>limit <b>${sci(Mov(m), 2)} M☉</b></span><span>its radius <b>${R < 0.1 ? (R * 206.265).toPrecision(3) + ' AU' : R.toPrecision(3) + ' mpc'}</b></span>` +
      `<span>central density <b>${rho < 0.01 ? sci(rho, 1) : rho.toPrecision(2)} g/cm³</b></span><span>a Sgr A* ball, non-relativistic <b>${Rb.toPrecision(2)} mpc</b> <small>(S2 pericentre 0.6)</small></span>`;
  }
  const go = onSlide(cv, draw);
})();

/* -------------------------------------------------------------------------
   O Bullet Cluster como filme: a mesma colisão sem e com matéria escura. Ilustração, não ajuste.
   kpc no plano do céu, y para baixo, referencial do centro de massa. Razão de massas 4:1; velocidade
   relativa de 1440 kpc em 300 Myr, ≈ 4700 km/s (a do choque, Markevitch et al.). Hoje (+150 Myr) os
   picos de massa estão em −330 e +390 kpc, 720 kpc um do outro (Clowe et al. 2006), e o gás de cada
   um ficou ~200 kpc atrás, como na composição de 2006: freado enquanto as nuvens se atravessam
   (degrau suave em s = 0,27…0,70), depois segue junto.
   Cada aglomerado: 85% matéria escura, 13% gás, 2% estrelas. Sem matéria escura, o mesmo total vai
   para gás e estrelas, para que só a posição mude. O gás é o mesmo nas duas faixas.
   Lente: gaussianas circulares, κ̄(<r) = κ₀(1 − e^{−q})/q com q = r²/2σ², γ_t = κ̄ − κ, somadas em
   (γ₁, γ₂); κ = 0,5 no pico principal de hoje com matéria escura. Cada galáxia de fundo é desenhada
   por A⁻¹·S (A, a jacobiana da lente; S, a forma intrínseca, quase redonda), com o cisalhamento
   exagerado 1,5× e o aumento de área limitado a 1,6. Raio X ∝ Σ_gás².
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('bul-cv'); if (!cv) return;
  const slide = cv.closest('.slide'), out = document.getElementById('bul-out');
  const tIn = document.getElementById('bul-t'), tOut = document.querySelector('output[for="bul-t"]');
  const fmtT = v => { const m = Math.round((v - 0.5) * 300); return (m > 0 ? '+' : m < 0 ? '−' : '') + Math.abs(m) + ' Myr' + (v > 0.999 ? ' · today' : ''); };
  let auto = null, raf = 0;
  const getMap = bindSeg('bul-map', () => go());
  const getT = bindRange('bul-t', fmtT, () => { auto = null; cancelAnimationFrame(raf); go(); });
  const setT = v => { tIn.value = v; tOut.textContent = fmtT(+tIn.value); };

  const M2 = 0.25, FD = 0.85, FG = 0.13, FS = 0.02, YR = 225, X0 = -110;
  const XC = -186, A1 = -288, A2 = 1152;
  const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  function model(s, dark) {
    const f = ss(0.27, 0.70, s);
    const x1 = XC + A1 * (s - 0.5), x2 = XC + A2 * (s - 0.5), y1 = 8, y2 = -16;
    const g1 = x1 + 240 * f, g2 = x2 - 190 * f;
    const gas = [[g1 - 70 * f, y1, 180, 0.5 * FG], [g1 + 70 * f, y1, 180, 0.5 * FG],
                 [g2, y2, 85, 0.6 * M2 * FG], [g2 - 110 * f, y2, 120, 0.4 * M2 * FG]];
    const kb = dark ? 1 : 1 / (FG + FS);
    const lens = gas.map(([x, y, sg, m]) => [x, y, sg, m * kb]);
    lens.push([x1, y1, 120, FS * kb], [x2, y2, 65, M2 * FS * kb]);
    if (dark) lens.push([x1, y1, 170, FD], [x2, y2, 95, M2 * FD]);
    return { gas, lens, x1, x2, y1, y2, g1, g2, f };
  }
  let K = 1;
  function field(lens, x, y, o) {
    let k = 0, g1 = 0, g2 = 0;
    for (const [cx, cy, sg, m] of lens) {
      const dx = x - cx, dy = y - cy, r2 = dx * dx + dy * dy, q = r2 / (2 * sg * sg);
      const k0 = K * m / (2 * Math.PI * sg * sg), e = Math.exp(-q), kk = k0 * e;
      k += kk;
      if (o && r2 > 1e-6) {
        const gt = (q < 1e-4 ? k0 * (1 - q / 2) : k0 * (1 - e) / q) - kk;
        g1 -= gt * (dx * dx - dy * dy) / r2; g2 -= gt * 2 * dx * dy / r2;
      }
    }
    if (o) { o.k = k; o.g1 = g1; o.g2 = g2; }
    return k;
  }
  { const m = model(1, true); K = 0.5 / field(m.lens, m.x1, m.y1); }
  const SREF = FG / (2 * Math.PI * 180 * 180);
  const gasSigma = (gas, x, y) => { let S = 0; for (const [cx, cy, sg, m] of gas) { const dx = x - cx, dy = y - cy; S += m / (2 * Math.PI * sg * sg) * Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)); } return S; };

  let seed = 20061;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
  const members = [];
  const cluster = (c, n, sg) => {
    members.push({ c, dx: 0, dy: 0, r: 6, w: 0 });
    for (let i = 1; i < n; i++) members.push({ c, dx: sg * gauss(), dy: 0.9 * sg * gauss(), r: 1.8 + 3 * rnd() ** 3, w: rnd() - 0.5 });
  };
  cluster(1, 36, 105); cluster(2, 15, 55);
  const bgs = [];
  for (let i = 0; i < 28; i++) for (let j = 0; j < 6; j++)
    bgs.push({ u: (i + 0.15 + 0.7 * rnd()) / 28, v: (j + 0.15 + 0.7 * rnd()) / 6, r: 2.6 + 1.8 * rnd(), e: 0.14 * rnd(), p: Math.PI * rnd(), a: 0.4 + 0.4 * rnd() });
  const near = (u, v) => bgs.reduce((b, g) => Math.hypot(g.u - u, (g.v - v) * 0.22) < Math.hypot(b.u - u, (b.v - v) * 0.22) ? g : b);
  const tagBg = near(0.88, 0.3);
  const tagGal = members.filter(g => g.c === 1 && g.dx > 50 && g.dy < -30 && g.r > 2.4).sort((a, b) => b.r - a.r)[0] || members[1];

  const off = document.createElement('canvas'), octx = off.getContext('2d');
  const LEV = [0.15, 0.3, 0.45];

  function label(ctx, txt, x, y, o = {}) {
    ctx.save();
    ctx.font = `${o.w || 500} ${o.size || 15}px ${FONT}`; ctx.fillStyle = o.color || COL.text2;
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'top'; ctx.globalAlpha = o.alpha ?? 1;
    if (o.ls) ctx.letterSpacing = o.ls;
    const wd = ctx.measureText(txt).width, sz = o.size || 15, al = ctx.textAlign, bs = ctx.textBaseline;
    const x0 = al === 'center' ? x - wd / 2 : al === 'right' ? x - wd : x, y0 = bs === 'middle' ? y - sz / 2 : bs === 'bottom' ? y - sz : y;
    ctx.fillStyle = 'rgba(4,5,10,.72)'; ctx.beginPath(); ctx.roundRect(x0 - 7, y0 - 4, wd + 14, sz + 9, 6); ctx.fill();
    ctx.fillStyle = o.color || COL.text2; ctx.fillText(txt, x, y); ctx.restore();
  }

  function row(ctx, rx, ry, rw, rh, s, dark, map) {
    const m = model(s, dark), k = rh / (2 * YR), cx = rx + rw / 2, cy = ry + rh / 2;
    const PX = x => cx + (x - X0) * k, PY = y => cy + y * k;
    const KX = px => X0 + (px - cx) / k, KY = py => (py - cy) / k;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 14);
    ctx.fillStyle = '#04050a'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1; ctx.stroke(); ctx.clip();

    // galáxias distantes, deformadas pela massa da faixa
    const o = {};
    ctx.fillStyle = '#cfd6e8';
    for (const b of bgs) {
      const px = rx + b.u * rw, py = ry + b.v * rh;
      field(m.lens, KX(px), KY(py), o);
      const kd = Math.min(o.k, 0.7), a = 1 - kd;
      let G1 = 1.5 * o.g1, G2 = 1.5 * o.g2, gm = Math.hypot(G1, G2);
      const lim = a - 0.2; if (gm > lim) { G1 *= lim / gm; G2 *= lim / gm; gm = lim; }
      const det = a * a - gm * gm, c = Math.min(1, Math.sqrt(1.6 * det)) / det;
      const i00 = (a + G1) * c, i01 = G2 * c, i11 = (a - G1) * c;
      const cp = Math.cos(b.p), sp = Math.sin(b.p), sa = b.r * (1 + b.e), sb = b.r * (1 - b.e);
      const s00 = cp * sa, s01 = -sp * sb, s10 = sp * sa, s11 = cp * sb;
      ctx.save(); ctx.globalAlpha = b.a;
      ctx.transform(i00 * s00 + i01 * s10, i01 * s00 + i11 * s10, i00 * s01 + i01 * s11, i01 * s01 + i11 * s11, px, py);
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
    }

    // massa da lente (azul) e gás em raio X (rosa), somados como na composição
    const nx = Math.ceil(rw / 4), ny = Math.ceil(rh / 4);
    if (off.width !== nx || off.height !== ny) { off.width = nx; off.height = ny; }
    const img = octx.createImageData(nx, ny), D = img.data, KG = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      const y = KY(ry + (j + 0.5) * rh / ny);
      for (let i = 0; i < nx; i++) {
        const x = KX(rx + (i + 0.5) * rw / nx), p = j * nx + i;
        const kap = field(m.lens, x, y), b = (gasSigma(m.gas, x, y) / SREF) ** 2;
        const aP = Math.min(1, 0.85 * b ** 0.8), aB = map ? 0.55 * Math.min(1, kap / 0.6) ** 1.5 : 0;
        KG[p] = kap;
        D[4 * p] = 255 * aP + 50 * aB; D[4 * p + 1] = 95 * aP + 120 * aB; D[4 * p + 2] = 165 * aP + 255 * aB; D[4 * p + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, rx, ry, rw, rh); ctx.restore();

    // frente de choque à frente do gás do "bullet"
    const aS = ss(0.5, 0.8, s);
    if (aS > 0) {
      ctx.save(); ctx.strokeStyle = `rgba(255,111,174,${0.4 * aS})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(PX(m.g2 - 60), PY(m.y2), 170 * k, -0.85, 0.85); ctx.stroke(); ctx.restore();
    }

    // galáxias dos aglomerados
    const gpos = g => {
      const an = g.w * s * 2.2, ca = Math.cos(an), sa = Math.sin(an), x0 = g.c === 1 ? m.x1 : m.x2, y0 = g.c === 1 ? m.y1 : m.y2;
      return [PX(x0 + ca * g.dx - sa * g.dy), PY(y0 + sa * g.dx + ca * g.dy)];
    };
    for (const g of members) {
      const [px, py] = gpos(g);
      ctx.fillStyle = 'rgba(255,205,140,.16)'; ctx.beginPath(); ctx.arc(px, py, g.r * 2.6, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = '#ffe3b8'; ctx.beginPath(); ctx.arc(px, py, g.r, 0, 2 * Math.PI); ctx.fill();
    }

    // contornos de κ: o mapa de massa que a lente devolve
    const GX = fi => rx + (fi + 0.5) * rw / nx, GY = fj => ry + (fj + 0.5) * rh / ny;
    if (map) {
      ctx.save(); ctx.strokeStyle = 'rgba(150,205,255,.85)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      for (const L of LEV) {
        ctx.beginPath();
        for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
          const A = KG[j * nx + i], B = KG[j * nx + i + 1], C = KG[(j + 1) * nx + i + 1], E = KG[(j + 1) * nx + i];
          const pts = [];
          if ((A > L) !== (B > L)) pts.push([GX(i + (L - A) / (B - A)), GY(j)]);
          if ((B > L) !== (C > L)) pts.push([GX(i + 1), GY(j + (L - B) / (C - B))]);
          if ((E > L) !== (C > L)) pts.push([GX(i + (L - E) / (C - E)), GY(j + 1)]);
          if ((A > L) !== (E > L)) pts.push([GX(i), GY(j + (L - A) / (E - A))]);
          for (let q = 0; q + 1 < pts.length; q += 2) { ctx.moveTo(pts[q][0], pts[q][1]); ctx.lineTo(pts[q + 1][0], pts[q + 1][1]); }
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // pico da lente do lado do "bullet", para comparar com o gás
    let best = -1, bx = 0, by = 0;
    const sep = m.x2 - m.x1, mid = (m.x1 + m.x2) / 2;
    if (Math.abs(sep) > 300) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = KX(GX(i)); if ((x - mid) * Math.sign(sep) <= 0) continue;
      const v = KG[j * nx + i]; if (v > best) { best = v; bx = x; by = KY(GY(j)); }
    }

    // rótulos
    label(ctx, dark ? 'WITH DARK MATTER' : 'IF THERE WERE NO DARK MATTER', rx + 18, ry + 14, { size: 14, w: 600, ls: '2px', color: dark ? '#96cdff' : COL.text });
    label(ctx, dark ? 'the pattern Clowe et al. measured in 2006' : 'all the mass is in the galaxies and the gas', rx + 18, ry + 35, { size: 15, w: 400, color: COL.text3 });
    const a0 = 1 - ss(0.12, 0.24, s), a1 = ss(0.82, 0.97, s);
    if (a0 > 0) {
      label(ctx, '← main cluster', PX(m.x1), PY(m.y1 + 168), { align: 'center', alpha: a0, color: COL.text2 });
      label(ctx, '“bullet” →', PX(m.x2), PY(m.y2 + 140), { align: 'center', alpha: a0, color: COL.text2 });
      if (!dark) {
        ctx.save(); ctx.globalAlpha = a0; ctx.strokeStyle = COL.text2; ctx.lineWidth = 1.5;
        const bx0 = rx + tagBg.u * rw, by0 = ry + tagBg.v * rh, [gx0, gy0] = gpos(tagGal);
        ctx.beginPath(); ctx.arc(bx0, by0, 14, 0, 2 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx0, gy0, 12, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
        label(ctx, 'distant galaxy, far behind', bx0, by0 + 20, { align: 'center', alpha: a0 });
        label(ctx, 'cluster galaxy', gx0 + 18, gy0, { base: 'middle', alpha: a0 });
      }
    }
    if (a1 > 0) label(ctx, dark ? 'stretched around the cluster galaxies, away from the gas' : 'distant galaxies stretched around the gas',
      rx + 18, ry + rh - 14, { base: 'bottom', alpha: a1, size: 16, color: dark ? '#96cdff' : COL.text });
    if (dark) {
      const L = 500 * k, x = rx + rw - 22 - L, y = ry + rh - 18;
      ctx.save(); ctx.strokeStyle = COL.text3; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x, y - 5); ctx.lineTo(x, y); ctx.lineTo(x + L, y); ctx.lineTo(x + L, y - 5); ctx.stroke(); ctx.restore();
      label(ctx, '500 kpc', x + L / 2, y - 6, { align: 'center', base: 'bottom', size: 13, color: COL.text3 });
    }
    ctx.restore();
    return best > 0 ? Math.hypot(bx - m.g2, by - m.y2) : null;
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(cv);
    const s = getT(), map = getMap() === '1', gap = 18, rh = (h - gap) / 2;
    const p = [row(ctx, 0, 0, w, rh, s, false, map), row(ctx, 0, rh + gap, w, rh, s, true, map)];
    const f = v => v == null ? '—' : Math.round(v / 10) * 10 + ' kpc';
    out.innerHTML = `<span>“bullet” side, lensing peak to gas peak: no dark matter <b>${f(p[0])}</b> · with dark matter <b>${f(p[1])}</b></span><span>relative speed <b>≈ 4700 km/s</b></span>`;
  }
  const go = onSlide(cv, draw);

  // entra no slide parado no começo, com os rótulos; o play segura 1,4 s e roda a colisão em 9 s
  // ?bt=s (testes): fixa o instante, sem autoplay
  const Q = new URLSearchParams(location.search), FF = Q.has('ff'), BT = Q.get('bt'), HOLD = 1400, DUR = 9000;
  function loop(now) {
    if (!auto || !slide.classList.contains('active')) { auto = null; return; }
    const s = Math.min(1, Math.max(0, (now - auto.t0 - HOLD) / DUR));
    setT(s); draw();
    if (s < 1) raf = requestAnimationFrame(loop); else auto = null;
  }
  function play() { cancelAnimationFrame(raf); auto = { t0: performance.now() }; setT(0); raf = requestAnimationFrame(loop); }
  document.getElementById('bul-play').addEventListener('click', play);
  addEventListener('slidechange', () => {
    if (!slide.classList.contains('active')) { auto = null; cancelAnimationFrame(raf); return; }
    auto = null; cancelAnimationFrame(raf);
    setT(BT != null ? +BT : FF ? 1 : 0); go();
  });
})();
