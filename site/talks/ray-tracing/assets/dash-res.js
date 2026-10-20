/* =====================================================================
   Parte III · resultados — painel interativo
   ===================================================================== */

/* A mesma estrela em outra gravidade (Ottoni, Coelho, de Lima, Pereira & Rueda, EPJC 84, 1337, 2024).
   Fora de uma estrela escalarizada, no referencial de Einstein, a métrica é a de Just:
     ds² = −(1 − a/r)^{b/a} dt² + (1 − a/r)^{−b/a} dr² + (1 − a/r)^{1−b/a} r² dΩ²,
   com b = 2M e a/b = √(1 + Q²) (Q = 0 devolve Schwarzschild). As geodésicas nulas não mudam com
   a troca conforme para o referencial de Jordan, e os ângulos também não; o raio areal de Jordan é
   R = A_s · R_E. Para uma métrica −A dt² + B dr² + C dΩ²:
     ψ(b) = ∫_{r_s}^∞ √(B/C) dr / √(C/(A b²) − 1),   b = sen α · √(C/A)|_{r_s}.
   Conferido contra o artigo: com GM/(Rc²) = 0,284, Q = 0,5, A_s = 0,95 → ψ_c = 0,903π (artigo:
   0,90π); A_s = 1,05 → 1,051π (1,05π); RG → π. O fluxo de uma estrela estática é g⁴ vezes a área
   da imagem no plano de b (Liouville), com g² = A_s² (1 − a/r_s)^{b/a}; a área é integrada em anéis
   de ψ (ver curve), com as imagens secundárias e o eclipse. Conferido: na RG crítica, a mancha atrás
   da estrela dá 0,135 do fluxo de frente (artigo, Fig. 4: ~0,14). Unidades: M = 1. */
(() => {
  const cvI = document.getElementById('stt-img'); if (!cvI) return;
  const cvL = document.getElementById('stt-lc'), out = document.getElementById('stt-out');
  const MKM = 2.1 * 1.476625, MODELS = { gr: { As: 1, q: false, lab: T('RG', 'GR') }, s1: { As: 0.95, q: true, lab: T('ETE 1', 'STT 1') }, s2: { As: 1.05, q: true, lab: T('ETE 2', 'STT 2') } };
  const SPOT_COL = 90 * deg, INC = 90 * deg, RHO = 10 * deg, S = 300, NPH = 144;
  let model = 's1';
  const getC = bindRange('stt-C', v => fmt(v, 3), schedule);
  const getQ = bindRange('stt-Q', v => fmt(v, 2), schedule);
  bindSeg('stt-model', () => { model = document.querySelector('#stt-model .on').dataset.v; schedule(); });

  /* a estrela num modelo: métrica, raio de Einstein, tabela ψ(q), b_max, g */
  function star(C, Q, As) {
    const bb = 2, a = 2 * Math.sqrt(1 + Q * Q), p = bb / a;
    const A = r => Math.pow(1 - a / r, p), Cm = r => Math.pow(1 - a / r, 1 - p) * r * r;
    const RE = (1 / C) / As;                                       // raio areal de Einstein
    let lo = a * (1 + 1e-9), hi = RE * 3 + a;
    for (let k = 0; k < 200; k++) { const m = 0.5 * (lo + hi); (Math.sqrt(Cm(m)) < RE) ? lo = m : hi = m; }
    const rs = 0.5 * (lo + hi), bmax = Math.sqrt(Cm(rs) / A(rs));
    const n = 361, psi = new Float64Array(n), N = 260;               // malha uniforme em α (fina perto do limbo)
    for (let i = 0; i < n; i++) {
      const q = Math.sin(i / (n - 1) * Math.PI / 2), b = q * bmax; if (b === 0) { psi[i] = 0; continue; }
      let sum = 0;
      for (let k = 0; k < N; k++) {                               // r = r_s/x, x = 1 − s²
        const s = (k + 0.5) / N, x = 1 - s * s, r = rs / x, dr = rs / (x * x) * 2 * s;
        const Ar = A(r), Cr = Cm(r), g = Cr / (Ar * b * b) - 1;
        sum += Math.sqrt(1 / (Ar * Cr)) / Math.sqrt(Math.max(g, 1e-300)) * dr / N;
      }
      psi[i] = sum;
    }
    const g2 = As * As * A(rs);
    return { psi, n, bmax, max: psi[n - 1], g2, rs, a };
  }
  const psiAt = (st, q) => { const x = Math.asin(Math.min(Math.max(q, 0), 1)) / (Math.PI / 2) * (st.n - 1), i = Math.min(Math.floor(x), st.n - 2), f = x - i; return st.psi[i] * (1 - f) + st.psi[i + 1] * f; };
  /* inversa: q² em função de ψ (ψ cresce com α), por busca binária na tabela */
  function q2At(st, ps) {
    if (ps <= 0) return 0; if (ps >= st.max) return 1;
    let lo = 0, hi = st.n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; (st.psi[m] < ps) ? lo = m : hi = m; }
    const f = (ps - st.psi[lo]) / (st.psi[hi] - st.psi[lo]), a = (lo + f) / (st.n - 1) * Math.PI / 2, q = Math.sin(a);
    return q * q;
  }
  /* mapa inverso: normal da superfície (referencial da estrela) por pixel */
  function pmap(st) {
    const nx = new Float32Array(S * S), ny = new Float32Array(S * S), nz = new Float32Array(S * S), ok = new Uint8Array(S * S);
    const si = Math.sin(INC), ci = Math.cos(INC);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const px = (i + 0.5) / S * 2 - 1, py = 1 - (j + 0.5) / S * 2, q = Math.hypot(px, py), k = j * S + i;
      if (q > 1) continue;
      const ps = psiAt(st, q), ex = q ? px / q : 0, ey = q ? py / q : 0, sp = Math.sin(ps), cp = Math.cos(ps);
      const ox = sp * ex, oy = sp * ey, oz = cp;
      nx[k] = ox; ny[k] = oy * ci - oz * si; nz[k] = oy * si + oz * ci; ok[k] = 1;
    }
    return { nx, ny, nz, ok };
  }
  const spotDir = ph => [Math.sin(SPOT_COL) * Math.cos(ph), Math.sin(SPOT_COL) * Math.sin(ph), Math.cos(SPOT_COL)];
  /* Fluxo pela área da imagem, em anéis de ψ: um anel da superfície entre ψ e ψ + dψ, com a parte
     dentro da mancha ocupando 2χ(ψ) de azimute, aparece na imagem como o anel de q²/2 entre q(ψ) e
     q(ψ + dψ) — e, se 2π − ψ ≤ ψ_c, também como imagem secundária. Somar as diferenças de q² dispensa
     derivadas e acerta as imagens finíssimas da borda, que contar pixels superestimaria. */
  function curve(st) {
    const f = new Float64Array(NPH), oz = [0, -Math.sin(INC), Math.cos(INC)], K = 900;
    for (let p = 0; p < NPH; p++) {
      const [x, y, z] = spotDir(2 * Math.PI * p / NPH), cc = x * oz[0] + y * oz[1] + z * oz[2], pc = Math.acos(Math.max(-1, Math.min(1, cc)));
      const lo = Math.max(0, pc - RHO), hi = Math.min(Math.PI, pc + RHO);
      let area = 0;
      for (let k = 0; k < K; k++) {
        const p0 = lo + (hi - lo) * k / K, p1 = lo + (hi - lo) * (k + 1) / K, pm = 0.5 * (p0 + p1);
        const den = Math.sin(pm) * Math.sin(pc), num = Math.cos(RHO) - Math.cos(pm) * Math.cos(pc);
        // centro da mancha sobre o eixo (de frente ou bem atrás): o anel está todo dentro ou todo fora
        const chi = den < 1e-6 ? (Math.abs(pm - pc) <= RHO ? Math.PI : 0) : Math.acos(Math.max(-1, Math.min(1, num / den)));
        if (chi <= 0) continue;
        if (p0 < st.max) area += chi * (q2At(st, Math.min(p1, st.max)) - q2At(st, p0));             // primária: (2χ)·d(q²/2)
        const s0 = 2 * Math.PI - p1, s1 = 2 * Math.PI - p0;                                       // secundária
        if (s0 < st.max) area += chi * (q2At(st, Math.min(s1, st.max)) - q2At(st, s0));
      }
      f[p] = st.g2 * st.g2 * st.bmax * st.bmax * area;
    }
    return f;
  }
  let cur = null, ref = null, curM = null, img = new ImageData(S, S), buf = document.createElement('canvas'), pend = 0, phase = 0;
  buf.width = buf.height = S;
  function compute() {
    pend = 0;
    const C = getC(), Q = getQ(), M = MODELS[model];
    ref = star(C, 0, 1); ref.map = pmap(ref); ref.f = curve(ref);
    if (model === 'gr' || Q === 0) { cur = ref; curM = ref.map; }
    else { cur = star(C, Q, M.As); curM = pmap(cur); cur.f = curve(cur); }
    render();
  }
  function schedule() { if (!pend) pend = requestAnimationFrame(compute); }
  function render() {
    if (!cur) return;
    const { nx, ny, nz, ok } = curM, d = img.data, [sx, sy, sz] = spotDir(phase), cr = Math.cos(RHO);
    for (let k = 0; k < S * S; k++) {
      const o = k * 4; if (!ok[k]) { d[o + 3] = 0; continue; }
      const lat = Math.asin(Math.max(-1, Math.min(1, nz[k]))), lon = Math.atan2(ny[k], nx[k]) - phase;
      let r = 38, g = 44, b = 66;
      const dl = Math.abs(((lat / (Math.PI / 6)) % 1 + 1.5) % 1 - 0.5), dm = Math.abs(((lon / (Math.PI / 6)) % 1 + 1.5) % 1 - 0.5) * Math.cos(lat);
      if (dl < 0.045 || dm < 0.045) { r = 92; g = 88; b = 140; }
      if (nx[k] * sx + ny[k] * sy + nz[k] * sz > cr) { r = 255; g = 214; b = 150; }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    // imagem: tamanho aparente real, comparado à RG (tracejado)
    const { ctx, w, h } = fitCanvas(cvI), base = Math.min(w, h) * 0.38 / ref.bmax;
    RT.blit(ctx, img, buf, w / 2, h / 2 + 6, cur.bmax * base, 'rgba(255,184,107,.22)');
    if (cur !== ref) { ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w / 2, h / 2 + 6, ref.bmax * base, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    ctx.font = `15px ${FONT}`; ctx.fillStyle = COL.text3; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(T('a estrela vista de longe · tracejado: o tamanho na RG', 'the star seen from afar · dashed: its size in GR'), w / 2, 4);
    // curvas de luz (duas voltas), normalizadas ao máximo da RG
    const mx = Math.max(...ref.f), ph = linspace(0, 2, 2 * NPH + 1), val = f => ph.map(x => f[Math.round(x * NPH) % NPH] / mx);
    const ymax = Math.max(1.15, Math.max(...cur.f) / mx * 1.08);
    const P = new Plot(cvL, { x: [0, 2], y: [0, ymax], m: [22, 24, 64, 70], fs: 16, xticks: [0, 0.5, 1, 1.5, 2] });
    P.begin().frame(T('fase de rotação', 'rotation phase'), T('fluxo (máximo da RG = 1)', 'flux (GR maximum = 1)'));
    P.clip();
    if (cur !== ref) P.line(ph, val(ref.f), { color: 'rgba(255,255,255,.55)', width: 2, dash: [7, 6] });
    P.area(ph, val(cur.f), 0, { color: COL.sol, alpha: 0.14 }).line(ph, val(cur.f), { color: COL.sol, width: 3.4, glow: 10 });
    P.vline(phase / (2 * Math.PI) % 1, { color: 'rgba(255,255,255,.4)', dash: [3, 5] });
    P.unclip();
    const lab = cur === ref ? MODELS.gr.lab : MODELS[model].lab;
    P.text(1.98, ymax * 0.95, cur === ref ? lab : `${lab} · ${T('tracejado: RG', 'dashed: GR')}`, { color: COL.text2, align: 'right', size: 15 });
    const zone = cur.max < Math.PI ? `${T('zona invisível', 'invisible zone')} <b>${fmt((Math.PI - cur.max) / deg, 1)}°</b>` : cur.max > Math.PI ? `${T('zona de imagens múltiplas', 'multiple-image zone')} <b>${fmt((cur.max - Math.PI) / deg, 1)}°</b>` : '';
    const pf = f => { const a = Math.max(...f), b = Math.min(...f); return (a - b) / (a + b); };
    out.innerHTML = `<span>${lab}: ψ<sub>c</sub> <b>${fmt(cur.max / Math.PI, 3)}π</b></span>${cur !== ref ? `<span>${T('RG', 'GR')}: ψ<sub>c</sub> <b>${fmt(ref.max / Math.PI, 3)}π</b></span>` : ''}
      <span>${zone || T('na RG crítica: o ponto oposto fica no limite', 'at the GR critical value: the far point sits on the edge')}</span>
      <span>R <b>${fmt(MKM / getC(), 2)} km</b></span><span>${T('raio aparente', 'apparent radius')} <b>${fmt(cur.bmax * MKM, 2)} km</b></span>
      <span>PF <b>${fmt(pf(cur.f), 2)}</b></span>`;
  }
  const slide = cvI.closest('.slide');
  loopOn(cvI, dt => { if (!cur) compute(); phase = (phase + dt * 2 * Math.PI / 6) % (2 * Math.PI); render(); }, () => { if (!cur) compute(); phase = Math.PI; render(); });
  onSlide(cvI, () => { if (!cur) compute(); else if (!slide.classList.contains('active')) render(); });
})();

/* =====================================================================
   Braneworld (dos Santos Júnior, de Lima & Moraes, arXiv:2607.09836): as equações TOV
   modificadas, eqs. (A.17)–(A.18), com G = c = 1 e ρ, p em km⁻²:
     dm/dr = 4π r² [ρ + ρ²/2λ + α_𝒰 ρ]
     dp/dr = −(ρ + p) [m + 4π r³ (p + pρ/λ + ρ²/2λ + w_𝒰 α_𝒰 ρ)] / [r (r − 2m)]
   ρ é a densidade de energia da SLy, aqui no ajuste por polítropos de Read et al. (2009) — o mesmo
   da curva M–R da Parte II (dash-ns.js), copiado para cá. Conferido contra a melhor amostra do
   artigo (λ = 10408 km⁻², α_𝒰 = −0,169, w_𝒰 = 0,252): M_máx = 2,278 M☉ (artigo: 2,277) e
   R₁,₄ = 13,24 km (13,29; o artigo usa a tabela da SLy, aqui é o ajuste). Na RG: 2,048 / 11,70.
   Quando o termo de Weyl na pressão vence a massa, dp/dr deixa de ser negativo e não há estrela
   em equilíbrio: a integração para e a estrela é descartada.
   ===================================================================== */
const BRANE = (() => {
  const MSUN = 1.476625, C2 = 8.987551787e20, FG = 6.67430e-8 / C2 * 1e10;   // G/c²: g/cm³ → km⁻²
  // SLy: crosta (Read et al. 2009, Tabela II) e núcleo (Tabela III)
  const CRUST = [[6.80110e-9, 1.58425, 2.44034e7], [1.06186e-6, 1.28733, 3.78358e11], [5.32697e1, 0.62223, 2.62780e12], [3.99874e-8, 1.35692, Infinity]];
  const SLY = { lp1: 34.384, g1: 3.005, g2: 2.988, g3: 2.851 };
  const P = (() => {
    const e = SLY, r1 = 10 ** 14.7, r2 = 1e15, p1 = 10 ** e.lp1 / C2;
    const K1 = p1 / r1 ** e.g1, K2 = p1 / r1 ** e.g2, K3 = K2 * r2 ** (e.g2 - e.g3);
    const pieces = []; let lo = 0, rho0 = 0;
    for (const [K, G, hi] of CRUST) {
      const x = Math.exp((Math.log(K) - Math.log(K1)) / (e.g1 - G));
      if (x > lo && x <= hi) { rho0 = x; pieces.push([K, G, lo, x]); break; }
      pieces.push([K, G, lo, hi]); lo = hi;
    }
    pieces.push([K1, e.g1, rho0, r1], [K2, e.g2, r1, r2], [K3, e.g3, r2, Infinity]);
    let eps = 0;
    return pieces.map(([K, G, a0, hi], k) => {
      const a = k ? eps / a0 - 1 - K * a0 ** (G - 1) / (G - 1) : 0;
      if (hi < Infinity) eps = (1 + a) * hi + K * hi ** G / (G - 1);
      return { G, a, Kg: K * FG ** (1 - G), plo: K * a0 ** G * FG };
    });
  })();
  function epsOf(p) { let k = P.length - 1; while (k > 0 && p < P[k].plo) k--; const o = P[k], rho = (p / o.Kg) ** (1 / o.G); return (1 + o.a) * rho + p / (o.G - 1); }
  const PSURF = 6.80110e-9 * 1e5 ** 1.58425 * FG;
  /* uma estrela: [R (km), M (M☉)] ou null se não houver equilíbrio. O teste de equilíbrio
     (m + 4πr³p_ef > 0, isto é, dp/dr < 0) vale no estado aceito de cada passo, e não nos pontos
     intermediários do RK4: perto do centro a massa deles fica atrasada e, com w_𝒰α_𝒰 < 0, o sinal
     sairia negativo à toa. O passo também fica limitado a r/2 perto do centro. */
  function star(pc, il, al, w) {
    const f = (r, m, p) => {
      const q = p > 0 ? p : 0, e = epsOf(q);
      const reff = e + 0.5 * e * e * il + al * e, peff = q + q * e * il + 0.5 * e * e * il + w * al * e;
      const num = m + 4 * Math.PI * r ** 3 * peff;
      return [4 * Math.PI * r * r * reff, -(e + q) * num / (r * (r - 2 * m)), num];
    };
    const ec = epsOf(pc);
    let r = 1e-3, m = 4 / 3 * Math.PI * r ** 3 * ec * (1 + al + 0.5 * ec * il), p = pc;
    for (let n = 0; p > PSURF; n++) {
      const k1 = f(r, m, p);
      if (k1[2] <= 0 || r <= 2 * m || n > 30000 || r > 80) return null;   // sem equilíbrio
      const h = Math.min(0.04, 0.5 * r, 0.06 * p / Math.abs(k1[1] || 1e-30));
      const k2 = f(r + h / 2, m + h / 2 * k1[0], p + h / 2 * k1[1]), k3 = f(r + h / 2, m + h / 2 * k2[0], p + h / 2 * k2[1]), k4 = f(r + h, m + h * k3[0], p + h * k3[1]);
      m += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); p += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); r += h;
    }
    return [r, m / MSUN];
  }
  /* o ramo estável (até M_máx), R₁,₄ e ρ_c/λ no máximo */
  const cache = new Map();
  function seq(logl, al, w) {
    const key = [logl, al, w].map(x => x.toFixed(4)).join('|'); if (cache.has(key)) return cache.get(key);
    const il = logl >= 8 ? 0 : 10 ** -logl, R = [], M = [];
    let mmax = 0, ec = 0;
    for (let lp = 33.5; lp <= 37; lp += 0.03) {
      const pc = 10 ** lp / C2 * FG, s = star(pc, il, al, w);
      if (!s) { if (M.length) break; else continue; }
      if (s[1] < mmax) break;
      mmax = s[1]; R.push(s[0]); M.push(s[1]); ec = epsOf(pc);
    }
    let r14 = null;
    for (let k = 1; k < M.length; k++) if (M[k - 1] < 1.4 && M[k] >= 1.4) r14 = R[k - 1] + (1.4 - M[k - 1]) / (M[k] - M[k - 1]) * (R[k] - R[k - 1]);
    const out = { R, M, mmax: M.length > 5 ? mmax : null, r14, ecl: ec * il };
    if (cache.size > 200) cache.clear(); cache.set(key, out); return out;
  }
  return { seq };
})();

/* Painel: as equações TOV modificadas com controles (λ, α_𝒰, w_𝒰) e quatro pontos de partida. */
(() => {
  const cv = document.getElementById('brane-mr'); if (!cv) return;
  const out = document.getElementById('brane-out'), seg = document.getElementById('brane-pre');
  const els = { l: document.getElementById('brane-l'), a: document.getElementById('brane-a'), w: document.getElementById('brane-w') };
  const PRE = { gr: [8, 0, 0], loc: [-3, 0, 0], med: [4.02, -0.169, 0.252], comp: [4.0, 0.30, -0.80] };
  let pend = 0;
  const later = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; draw(); }); };
  const getL = bindRange('brane-l', v => v >= 8 ? '∞' : fmt(v, 2), later);
  const getA = bindRange('brane-a', v => fmt(v, 3), later);
  const getW = bindRange('brane-w', v => fmt(v, 2), later);
  Object.values(els).forEach(el => el.addEventListener('input', () => seg.querySelectorAll('button').forEach(b => b.classList.remove('on'))));
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    const [l, a, w] = PRE[b.dataset.v];
    [['l', l], ['a', a], ['w', w]].forEach(([k, v]) => { els[k].value = v; document.querySelector(`output[for="brane-${k}"]`).textContent = k === 'l' ? (v >= 8 ? '∞' : fmt(v, 2)) : fmt(v, k === 'a' ? 3 : 2); });
    later();
  });
  const P = new Plot(cv, { x: [8, 16], y: [0, 3], m: [22, 24, 62, 72], fs: 16, yticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] });
  function draw() {
    const gr = BRANE.seq(8, 0, 0), s = BRANE.seq(getL(), getA(), getW());
    P.begin().frame(T('raio (km)', 'radius (km)'), T('massa (M☉)', 'mass (M☉)'));
    const c = P.ctx;
    P.clip();
    // faixas de massa: PSR J0952−0607 (2,35 ± 0,11) e o secundário de GW190814 (2,50–2,67, 90%)
    c.fillStyle = 'rgba(255,184,107,.08)'; c.fillRect(P.L, P.Y(2.46), P.R - P.L, P.Y(2.24) - P.Y(2.46));
    c.fillStyle = 'rgba(255,122,138,.08)'; c.fillRect(P.L, P.Y(2.67), P.R - P.L, P.Y(2.50) - P.Y(2.67));
    P.text(8.15, 2.585, `GW190814 (${fmt(2.5, 2)}–${fmt(2.67, 2)})`, { color: 'rgba(255,122,138,.8)', size: 14 });
    P.text(8.15, 2.35, `PSR J0952−0607 (${fmt(2.35, 2)} ± ${fmt(0.11, 2)})`, { color: 'rgba(255,184,107,.8)', size: 14 });
    P.line(gr.R, gr.M, { color: 'rgba(255,255,255,.55)', width: 2, dash: [7, 6] });
    if (s.M.length) P.line(s.R, s.M, { color: COL.sol, width: 3.6, glow: 12 });
    // a mediana do artigo: R₁,₄ = 13,31 (12,74–13,85) km
    c.strokeStyle = COL.bn; c.lineWidth = 2;
    c.beginPath(); c.moveTo(P.X(12.74), P.Y(1.4)); c.lineTo(P.X(13.85), P.Y(1.4)); c.stroke();
    P.unclip();
    P.dot(13.31, 1.4, { color: COL.bn, r: 6, glow: 12 });
    P.text(13.97, 1.4, T('R₁,₄ do artigo (68%)', 'paper’s R₁.₄ (68%)'), { color: COL.bn, size: 14 });   // à direita da barra: a curva a atravessa no meio
    if (gr.mmax) P.text(gr.R[gr.R.length - 1] - 0.15, gr.mmax + 0.08, T('RG + SLy', 'GR + SLy'), { color: COL.text3, align: 'right', size: 14 });
    const ok = s.mmax != null;
    out.innerHTML = ok
      ? `<span>M<sub>${T('máx', 'max')}</sub> <b>${fmt(s.mmax, 2)} M☉</b> (${T('RG', 'GR')} ${fmt(gr.mmax, 2)})</span>
         <span>R<sub>1${DEC}4</sub> <b>${s.r14 ? fmt(s.r14, 2) + ' km' : '—'}</b> (${T('RG', 'GR')} ${fmt(gr.r14, 2)})</span>
         <span>ρ<sub>c</sub>/λ ${T('no máximo', 'at the maximum')} <b>${s.ecl > 0 ? sci(s.ecl, 1) : '0'}</b></span>`
      : `<span><b style="color: var(--warn)">${T('nenhuma estrela em equilíbrio: o termo de Weyl na pressão vence a massa', 'no star in equilibrium: the Weyl pressure term beats the mass')}</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Painel: os dois leques do setor de Weyl, com λ = 10⁴ km⁻² — em α_𝒰 (w_𝒰 = 0) e em w_𝒰 (α_𝒰 = −0,15).
   As curvas são calculadas uma por quadro quando o slide aparece. */
(() => {
  const cvA = document.getElementById('weyl-a'); if (!cvA) return;
  const cvW = document.getElementById('weyl-w'), out = document.getElementById('weyl-out');
  const AL = [-0.3, -0.15, 0, 0.15, 0.3], WS = [-1, -0.5, 0, 0.5, 1], LL = 4;
  const cols = ['#9e8cff', '#b9a5f0', '#eef0f6', '#ffcf99', '#ffb86b'];
  let ready = 0, raf = 0;
  const jobs = [() => BRANE.seq(8, 0, 0), ...AL.map(a => () => BRANE.seq(LL, a, 0)), ...WS.map(w => () => BRANE.seq(LL, -0.15, w))];
  function panel(cv, list, labOf, title) {
    const P = new Plot(cv, { x: [7, 15.5], y: [0, 3], m: [26, 18, 60, 64], fs: 15, yticks: [0, 1, 2, 3], xticks: [8, 10, 12, 14] });
    P.begin().frame(T('raio (km)', 'radius (km)'), T('massa (M☉)', 'mass (M☉)'));
    P.clip();
    const gr = BRANE.seq(8, 0, 0);
    P.line(gr.R, gr.M, { color: 'rgba(255,255,255,.45)', width: 1.8, dash: [6, 6] });
    list.forEach(([s, k]) => { if (s && s.M.length) P.line(s.R, s.M, { color: cols[k], width: 2.6, glow: 6 }); });
    P.unclip();
    // só as pontas e o meio, à esquerda do topo de cada curva: ali não passa nenhuma outra (as de M_máx maior ficam à direita)
    list.forEach(([s, k]) => { if (s && s.mmax && k % 2 === 0) P.text(s.R[s.R.length - 1] - 0.12, s.mmax, labOf(k), { color: cols[k], align: 'right', size: 14 }); });
    P.text(7.2, 2.88, title, { color: COL.text2, size: 15 });
  }
  function draw() {
    const done = k => k < ready;
    panel(cvA, AL.map((a, k) => [done(1 + k) ? BRANE.seq(LL, a, 0) : null, k]), k => 'α = ' + fmt(AL[k], 2), T('α𝒰 varia · w𝒰 = 0', 'α𝒰 varies · w𝒰 = 0'));
    panel(cvW, WS.map((w, k) => [done(6 + k) ? BRANE.seq(LL, -0.15, w) : null, k]), k => 'w = ' + fmt(WS[k], 1), T('w𝒰 varia · α𝒰 = −0,15', 'w𝒰 varies · α𝒰 = −0.15'));
    if (ready >= jobs.length) {
      const ma = AL.map(a => BRANE.seq(LL, a, 0).mmax), mw = WS.map(w => BRANE.seq(LL, -0.15, w).mmax);
      out.innerHTML = `<span>${T('α de −0,3 a +0,3', 'α from −0.3 to +0.3')}: M<sub>${T('máx', 'max')}</sub> <b>${fmt(ma[0], 2)} → ${fmt(ma[4], 2)} M☉</b></span>
        <span>${T('w de −1 a +1 (α = −0,15)', 'w from −1 to +1 (α = −0.15)')}: M<sub>${T('máx', 'max')}</sub> <b>${fmt(mw[0], 2)} → ${fmt(mw[4], 2)} M☉</b></span>
        <span>${T('RG', 'GR')} <b>${fmt(BRANE.seq(8, 0, 0).mmax, 2)} M☉</b></span>`;
    } else out.innerHTML = `<span>${T('calculando', 'computing')} <b>${ready}/${jobs.length}</b></span>`;
  }
  function step() {
    raf = 0;
    if (ready < jobs.length) { jobs[ready](); ready++; draw(); raf = requestAnimationFrame(step); }
  }
  const slide = cvA.closest('.slide');
  addEventListener('slidechange', () => { if ((slide.classList.contains('active') || document.body.classList.contains('overview')) && ready < jobs.length && !raf) raf = requestAnimationFrame(step); });
  onSlide(cvA, () => { if (ready < jobs.length && (typeof FF === 'number' && FF > 0 || reduceMotion || document.body.classList.contains('overview'))) { while (ready < jobs.length) jobs[ready++](); } draw(); });
})();
