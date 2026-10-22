/* =====================================================================
   Parte II · Degeneracy before self-gravity — os painéis
   ===================================================================== */
const LOG = v => Math.log10(v);
const supx = e => String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] ?? '⁻').join('');
const fmtLen = cm => cm >= 1e5 ? (cm / 1e5).toPrecision(3) + ' km' : cm >= 100 ? (cm / 100).toPrecision(3) + ' m' : cm >= 1e-1 ? cm.toPrecision(3) + ' cm' : sci(cm) + ' cm';
const pow10 = v => Math.abs(LOG(v) - Math.round(LOG(v))) < 1e-9;
const fmtGeV = g => g >= 1e3 ? (pow10(g) ? '10' + supx(Math.round(LOG(g))) : sci(g)) + ' GeV' : g >= 1 ? +g.toPrecision(3) + ' GeV' : g >= 1e-3 ? +(g * 1e3).toPrecision(3) + ' MeV' : g >= 1e-6 ? +(g * 1e6).toPrecision(3) + ' keV' : sci(g * 1e6) + ' keV';
// as fronteiras operacionais do artigo
const S_LO = -3, S_HI = -1, TH_HI = 1, TH_LO = -1;
const gravClass = s => s < 1e-3 ? 'tracer' : s < 1e-1 ? 'transitional' : 'self-gravitating';
const statClass = t => t > 10 ? 'thermal' : t > 0.1 ? 'transitional' : 'degenerate';

/* fundo comum do plano (log S, log Θ_c): os quatro quadrantes e as faixas de transição */
function quadrants(P, labels = true) {
  const c = P.ctx, X = P.X.bind(P), Y = P.Y.bind(P);
  const box = (x0, x1, y0, y1, col) => { c.fillStyle = col; c.fillRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1)); };
  const [xa, xb] = P.o.x, [ya, yb] = P.o.y;
  box(xa, S_LO, TH_HI, yb, 'rgba(158,140,255,.06)');       // I   Boltzmann, traçador
  box(S_HI, xb, TH_HI, yb, 'rgba(255,184,107,.06)');       // II  Boltzmann, autogravitante
  box(xa, S_LO, ya, TH_LO, 'rgba(86,225,208,.08)');        // III Fermi, traçador
  box(S_HI, xb, ya, TH_LO, 'rgba(255,143,171,.06)');       // IV  Fermi, autogravitante
  [S_LO, S_HI].forEach(v => P.vline(v, { color: 'rgba(255,255,255,.28)', dash: [6, 6], width: 1.2 }));
  [TH_HI, TH_LO].forEach(v => P.hline(v, { color: 'rgba(255,255,255,.28)', dash: [6, 6], width: 1.2 }));
  if (!labels) return;
  const L = (x, y, s, col) => P.text(x, y, s, { color: col, size: 34, font: SERIF, align: 'center' });
  L(xa + (S_LO - xa) * 0.22, yb - (yb - TH_HI) * 0.12, 'I', 'rgba(158,140,255,.75)');
  L(xb - (xb - S_HI) * 0.18, yb - (yb - TH_HI) * 0.12, 'II', 'rgba(255,184,107,.75)');
  L(xa + (S_LO - xa) * 0.22, ya + (TH_LO - ya) * 0.12, 'III', 'rgba(86,225,208,.85)');
  L(xb - (xb - S_HI) * 0.18, ya + (TH_LO - ya) * 0.12, 'IV', 'rgba(255,143,171,.75)');
}
function star5(c, x, y, r, col) {
  c.save(); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 14; c.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); }
  c.closePath(); c.fill(); c.restore();
}

/* -------------------------------------------------------------------------
   Os dois diagnósticos. Para (m_χ, T_core, M_χ), a nuvem térmica no potencial fixo da SLy de
   1,4 M☉ (PHYS.cloud, como no OBSCURA): o perfil, r₉₀, S = M_χ(r₉₀)/M_b(r₉₀) e Θ_c = kT/E_F no centro.
   Conferido contra o fiducial do artigo (100 keV, 10⁹ K, N = 1,325×10⁴⁶): S = 6,37×10⁻¹⁶ e Θ_c = 3,460
   (artigo: 6,36×10⁻¹⁶ e 3,457), r₉₀ = 11,29 km.
   A curva no plano varia só M_χ: a forma do perfil não muda, S ∝ M_χ e n₀ ∝ M_χ, logo
   Θ_c ∝ S^{−2/3} enquanto x_F ≪ 1 e ∝ S^{−1/3} quando x_F ≫ 1 — as duas famílias de retas do artigo.
   ------------------------------------------------------------------------- */
(() => {
  const prof = document.getElementById('calc-prof'); if (!prof) return;
  const plane = document.getElementById('calc-plane'), out = document.getElementById('calc-out');
  const getM = bindRange('calc-m', v => fmtGeV(10 ** v), () => go());
  const getT = bindRange('calc-T', v => sci(10 ** v, 1) + ' K', () => go());
  const getMass = bindRange('calc-M', v => sci(10 ** v, 2) + ' g', () => go());
  const presets = { fid: [-4, 9, LOG(2.3617e18)], wimp: [0, 5, LOG(2.3617e18)], kev: [-6, 6, 22], heavy: [6, 5, 28] };
  document.getElementById('calc-pre').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const [m, T, M] = presets[b.dataset.v];
    [['calc-m', m], ['calc-T', T], ['calc-M', M]].forEach(([id, v]) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input')); });
    document.querySelectorAll('#calc-pre button').forEach(x => x.classList.toggle('on', x === b));
  });
  const Pp = new Plot(prof, { x: [-6, 1.2], y: [-20, 16], m: [16, 20, 56, 76], fs: 15, xfmt: v => v === 0 ? '1 km' : '10' + supx(v), yfmt: v => '10' + supx(v) });
  const Pq = new Plot(plane, { x: [-22, 12], y: [-14, 15], m: [16, 20, 56, 70], fs: 15, xfmt: v => String(v).replace('-', '−'), yfmt: v => String(v).replace('-', '−') });
  let key = null, track = null;
  function draw() {
    const S = PHYS.star(1.4), mGeV = 10 ** getM(), T = 10 ** getT(), Mg = 10 ** getMass(), mK = mGeV * 1e6;
    const c = PHYS.cloud(S, mK, T, Mg / (mK * PHYS.KEV_G));
    const k2 = mGeV + ':' + T;
    if (k2 !== key) {
      key = k2;
      track = []; for (let lm = 6; lm <= 38; lm += 0.5) { const q = PHYS.cloud(S, mK, T, 10 ** lm / (mK * PHYS.KEV_G)); track.push([LOG(q.S), LOG(q.Theta), lm]); }
    }
    // --- perfil: densidade de bárions e de matéria escura (g/cm³) contra r (km), em log ---
    Pp.begin().frame('radius r (km)', 'density (g/cm³)').clip();
    const rs = [], lb = [], lx = [], o = {};
    for (let k = 0; k < c.r.length; k += 4) {
      const r = c.r[k]; if (r < 1e-6) continue;
      PHYS.local(S, r, o); rs.push(LOG(r)); lb.push(o.nb > 0 ? LOG(o.nb * PHYS.MN_G) : NaN);
      lx.push(LOG(c.rhoc * Math.exp(-c.psi[k])));
    }
    Pp.line(rs, lb, { color: COL.obs, width: 2.6 });
    Pp.area(rs, lx.map(v => Math.max(v, -40)), -40, { color: COL.deg, alpha: 0.12 });
    Pp.line(rs, lx, { color: COL.deg, width: 3, glow: 10 });
    Pp.vline(LOG(c.r90), { color: COL.amb, label: "r₉₀", y: Pp.T + 6 });
    Pp.vline(LOG(S.R), { color: 'rgba(255,255,255,.35)', label: 'R', y: Pp.T + 30 });
    Pp.unclip();
    Pp.text(-5.8, lb[Math.floor(lb.length * 0.3)] + 1.4, 'baryons', { color: COL.obs, size: 15 });
    Pp.text(-5.8, Math.max(-18.5, Math.min(14, lx[2] + 1.4)), 'captured dark matter', { color: COL.deg, size: 15 });
    // --- plano (S, Θ_c) ---
    Pq.begin().frame('log₁₀ S   (gravity)', 'log₁₀ Θ_c   (statistics)').clip();
    quadrants(Pq);
    Pq.line(track.map(p => p[0]), track.map(p => p[1]), { color: 'rgba(238,240,246,.55)', width: 2, dash: [6, 5] });
    star5(Pq.ctx, Pq.X(LOG(6.36275e-16)), Pq.Y(LOG(3.45734)), 11, COL.amb);
    Pq.dot(LOG(c.S), LOG(c.Theta), { color: COL.deg, r: 8, glow: 18 });
    Pq.unclip();
    // onde a trilha cruza Θ_c = 1
    let sdeg = null;
    for (let i = 1; i < track.length; i++) if ((track[i - 1][1] - 0) * (track[i][1] - 0) <= 0) { const f = track[i - 1][1] / (track[i - 1][1] - track[i][1]); sdeg = track[i - 1][0] + f * (track[i][0] - track[i - 1][0]); break; }
    out.innerHTML = `r₉₀ <b>${fmtLen(c.r90 * 1e5)}</b> &nbsp;·&nbsp; central density <b>${sci(c.rhoc)} g/cm³</b> &nbsp;·&nbsp; x_F <b>${sci(c.xF)}</b> &nbsp;·&nbsp; E_F <b>${fmtE(c.EF)}</b> vs kT <b>${fmtE(c.kT)}</b>
      <br>S <b>${sci(c.S)}</b> <span class="pill" style="--c: var(--obs)">${gravClass(c.S)}</span> &nbsp;·&nbsp; Θ_c <b>${sci(c.Theta)}</b> <span class="pill" style="--c: var(--deg)">${statClass(c.Theta)}</span>
      &nbsp;·&nbsp; on this line Θ_c = 1 at <b>S ≈ ${sdeg === null ? '—' : '10' + supx(Math.round(sdeg))}</b>`;
  }
  const go = onSlide(prof, draw);
})();

/* -------------------------------------------------------------------------
   O mapa de regimes do artigo, ponto a ponto (Figs. 1–5): 6 720 modelos Maxwell–Boltzmann e
   3 960 RAR–FD, de OBSCURA/data/processed (assets/survey.js). Cor por uma entrada de cada vez.
   As famílias de trilhas seguem a regra de tools/plot_regime_slope_families.py: trilhas a (m, σ, t, T)
   fixos com ≥ 3 valores de ρ_χ, ajuste linear em (log S, log Θ_c) com amplitude ≥ 0,5 em log S e
   R² > 0,98; não relativística se inclinação < −0,52 e mediana de log x_F < −0,5, relativística se
   inclinação > −0,45 e mediana > 0,5. No RAR–FD isso dá 352 trilhas e 2112 pontos (mediana −0,667) e
   213 trilhas e 1278 pontos (mediana −0,334),
   como no artigo.
   ------------------------------------------------------------------------- */
(() => {
  const cv = document.getElementById('map-plot'); if (!cv || typeof SURVEY === 'undefined') return;
  const out = document.getElementById('map-out'), keyEl = document.getElementById('map-key');
  const NAMES = { m: 'm_χ', rho: 'ρ_χ', sig: 'σ_χn', t: 't', T: 'T_core' };
  const FMT = {
    m: v => fmtGeV(v), rho: v => v < 1 ? v + ' GeV/cm³' : '10' + supx(Math.round(LOG(v))) + ' GeV/cm³',
    sig: v => '10' + supx(Math.round(LOG(v))) + ' cm²', t: v => '10' + supx(Math.round(LOG(v))) + ' yr', T: v => '10' + supx(Math.round(LOG(v))) + ' K',
  };
  const RAMP = ['#6a5cff', '#8f8cff', '#7cc4ff', '#56e1d0', '#b6f08a', '#fff3b0'];
  const ramp = f => {
    const x = Math.max(0, Math.min(1, f)) * (RAMP.length - 1), i = Math.min(RAMP.length - 2, Math.floor(x)), t = x - i;
    const h = s => [1, 3, 5].map(k => parseInt(s.slice(k, k + 2), 16)), a = h(RAMP[i]), b = h(RAMP[i + 1]);
    return `rgb(${a.map((v, k) => Math.round(v + t * (b[k] - v))).join(',')})`;
  };
  // decodifica
  const sets = {};
  for (const name of ['MB', 'RAR']) {
    const d = SURVEY[name], bin = atob(d.data), dv = new DataView(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) dv.setUint8(i, bin.charCodeAt(i));
    const keys = ['rho', 'm', 'sig', 't', 'T'], sizes = keys.map(k => d.grids[k].length);
    const pts = [];
    for (let i = 0; i < d.n; i++) {
      let idx = dv.getUint16(8 * i + 6, true); const ix = {};
      for (let k = 4; k >= 0; k--) { ix[keys[k]] = idx % sizes[k]; idx = Math.floor(idx / sizes[k]); }
      pts.push({ s: dv.getInt16(8 * i, true) / 1000, t: dv.getInt16(8 * i + 2, true) / 1000, xf: dv.getInt16(8 * i + 4, true) / 1000, ix });
    }
    // trilhas: (m, σ, t, T) fixos, ρ variando
    const groups = {};
    pts.forEach(p => { const g = [p.ix.m, p.ix.sig, p.ix.t, p.ix.T].join(','); (groups[g] = groups[g] || []).push(p); });
    const fam = { nonrel: [], rel: [] };
    for (const g of Object.values(groups)) {
      if (new Set(g.map(p => p.ix.rho)).size < 3) continue;
      const xs = g.map(p => p.s), ys = g.map(p => p.t);
      if (Math.max(...xs) - Math.min(...xs) < 0.5) continue;
      const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
      let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
      const sl = sxy / sxx, b0 = my - sl * mx;
      let rss = 0, tss = 0; for (let i = 0; i < n; i++) { rss += (ys[i] - sl * xs[i] - b0) ** 2; tss += (ys[i] - my) ** 2; }
      const r2 = tss > 0 ? 1 - rss / tss : NaN, xfs = g.map(p => p.xf).sort((a, b) => a - b);
      const med = n % 2 ? xfs[(n - 1) / 2] : (xfs[n / 2 - 1] + xfs[n / 2]) / 2;
      const tr = g.slice().sort((a, b) => a.ix.rho - b.ix.rho);
      if (r2 > 0.98 && sl < -0.52 && med < -0.5) fam.nonrel.push({ tr, sl });
      if (r2 > 0.98 && sl > -0.45 && med > 0.5) fam.rel.push({ tr, sl });
    }
    sets[name] = { d, pts, fam };
  }
  const getSet = bindSeg('map-set', () => go()), getCol = bindSeg('map-color', () => go()), getTr = bindSeg('map-tracks', () => go());
  const P = new Plot(cv, { x: [-21, 16], y: [-13.5, 15.5], m: [14, 20, 56, 70], fs: 15, xfmt: v => String(v).replace('-', '−'), yfmt: v => String(v).replace('-', '−') });
  let hover = null;
  cv.addEventListener('pointermove', e => {
    const [x, y] = canvasPoint(cv, e), set = sets[getSet()];
    let best = null, bd = 18 * 18;
    for (const p of set.pts) { const d = (P.X(p.s) - x) ** 2 + (P.Y(p.t) - y) ** 2; if (d < bd) { bd = d; best = p; } }
    if (best !== hover) { hover = best; go(); }
  });
  cv.addEventListener('pointerleave', () => { hover = null; go(); });
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
  function draw() {
    const name = getSet(), set = sets[name], ck = getCol(), tk = getTr(), grid = set.d.grids[ck], nv = grid.length;
    P.begin().frame('log₁₀ S   (gravity)', 'log₁₀ Θ_c   (statistics)').clip();
    quadrants(P);
    const c = P.ctx, hl = tk !== 'all' ? set.fam[tk] : null;
    if (hl) {
      for (const p of set.pts) { c.fillStyle = 'rgba(179,185,201,.13)'; c.beginPath(); c.arc(P.X(p.s), P.Y(p.t), 2.6, 0, 7); c.fill(); }
      hl.forEach(({ tr }) => {
        const col = ramp(tr[0].ix[ck] / Math.max(1, nv - 1));
        c.strokeStyle = col; c.lineWidth = 1.4; c.globalAlpha = 0.8; c.beginPath();
        tr.forEach((p, i) => i ? c.lineTo(P.X(p.s), P.Y(p.t)) : c.moveTo(P.X(p.s), P.Y(p.t))); c.stroke(); c.globalAlpha = 1;
        tr.forEach(p => { c.fillStyle = col; c.beginPath(); c.arc(P.X(p.s), P.Y(p.t), 3, 0, 7); c.fill(); });
      });
    } else {
      c.globalAlpha = 0.85;
      for (const p of set.pts) { c.fillStyle = ramp(p.ix[ck] / Math.max(1, nv - 1)); c.beginPath(); c.arc(P.X(p.s), P.Y(p.t), 3.1, 0, 7); c.fill(); }
      c.globalAlpha = 1;
    }
    star5(c, P.X(LOG(set.d.fid.S)), P.Y(LOG(set.d.fid.Theta)), 13, COL.amb);
    P.text(LOG(set.d.fid.S) + 0.7, LOG(set.d.fid.Theta) + 0.9, 'fiducial', { color: COL.amb, size: 15 });
    if (hover) { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(P.X(hover.s), P.Y(hover.t), 8, 0, 7); c.stroke(); }
    P.unclip();
    // a legenda de cor
    keyEl.innerHTML = `<span style="color: var(--text-3); letter-spacing: .08em">${NAMES[ck]}</span>` + grid.map((v, i) => `<span style="--c: ${ramp(i / Math.max(1, nv - 1))}">${FMT[ck](v)}</span>`).join('');
    // números
    const xs = set.pts.map(p => p.s), ys = set.pts.map(p => p.t), n = xs.length;
    const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
    let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
    const q = { I: 0, II: 0, III: 0, IV: 0 };
    set.pts.forEach(p => { if (p.t > TH_HI) { if (p.s < S_LO) q.I++; else if (p.s >= S_HI) q.II++; } else if (p.t < TH_LO) { if (p.s < S_LO) q.III++; else if (p.s >= S_HI) q.IV++; } });
    let line = `<b>${n.toLocaleString('en')}</b> models &nbsp;·&nbsp; corr(log S, log Θ_c) <b>${(sxy / Math.sqrt(sxx * syy)).toFixed(3).replace('-', '−')}</b> &nbsp;·&nbsp; I <b>${q.I}</b> · II <b>${q.II}</b> · III <b>${q.III}</b> · IV <b>${q.IV}</b>`;
    if (hl) line += ` &nbsp;·&nbsp; <b>${hl.length}</b> tracks, <b>${hl.reduce((a, f) => a + f.tr.length, 0)}</b> points, median slope <b>${median(hl.map(f => f.sl)).toFixed(3).replace('-', '−')}</b>`;
    if (hover) { const g = set.d.grids; line += `<br>this model: ρ_χ ${FMT.rho(g.rho[hover.ix.rho])} · m_χ ${FMT.m(g.m[hover.ix.m])} · σ ${FMT.sig(g.sig[hover.ix.sig])} · t ${FMT.t(g.t[hover.ix.t])} · T ${FMT.T(g.T[hover.ix.T])} → S = ${sci(10 ** hover.s, 1)}, Θ_c = ${sci(10 ** hover.t, 1)}`; }
    out.innerHTML = line;
  }
  const go = onSlide(cv, draw);
})();
