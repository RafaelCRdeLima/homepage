/* =====================================================================
   Física compartilhada pelos painéis: a estrela SLy pela TOV, o transporte
   relativístico de uma partícula de matéria escura dentro e fora dela e a
   cinemática da colisão elástica com um nêutron parado.

   É o modelo do OBSCURA (paper zero, seções 2–3) refeito no navegador, com o
   passo mais grosso: R/300 aqui, R/4096 lá. Unidades geométricas G = c = 1 com
   comprimentos em km; energias de partícula em keV.

   Estrela: polítropos por partes da SLy (Read, Lackey, Owen & Friedman 2009,
   Tabelas II e III) — o mesmo ajuste dos seminários anteriores. A 1,40 M☉ ela
   dá R = 11,70 km e GM/Rc² = 0,177, como a tabela SLy do OBSCURA (11,70 km,
   0,177, ρ_c = 9,87×10¹⁴ g/cm³).
   ===================================================================== */
const PHYS = (() => {
  const C2 = 8.987551787e20, FG = 6.67430e-8 / C2 * 1e10;   // G/c² (cm/g): g/cm³ → km⁻²
  const MSUN = 1.4766250614;          // GM☉/c² em km
  const MN = 939565.42;               // m_n c² (keV)
  const MN_G = 1.67492750e-24;        // m_n (g)
  const HBARC = 1.973269804e-8;       // ħc (keV·cm)
  const KB = 8.617333262e-8;          // k_B (keV/K)
  const KEV_G = 1.78266192e-30;       // 1 keV/c² em g
  const MSUN_G = 1.98841e33;
  const TAU = 2 * Math.PI;

  /* ---------------- equação de estado SLy (polítropos por partes) ---------------- */
  const CRUST = [[6.80110e-9, 1.58425, 2.44034e7], [1.06186e-6, 1.28733, 3.78358e11], [5.32697e1, 0.62223, 2.62780e12], [3.99874e-8, 1.35692, Infinity]];
  function makeEOS(e) {
    const r1 = 10 ** 14.7, r2 = 1e15, p1 = 10 ** e.lp1 / C2;
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
  }
  const SLY = makeEOS({ lp1: 34.384, g1: 3.005, g2: 2.988, g3: 2.851 });
  // densidade de repouso (km⁻²) e de energia (km⁻²) a uma pressão p (km⁻²)
  function piece(p) { let k = SLY.length - 1; while (k > 0 && p < SLY[k].plo) k--; return SLY[k]; }
  function rhoOf(p) { const o = piece(p); return (p / o.Kg) ** (1 / o.G); }
  function epsOf(p) { const o = piece(p); const rho = (p / o.Kg) ** (1 / o.G); return (1 + o.a) * rho + p / (o.G - 1); }
  const PSURF = 6.80110e-9 * 1e5 ** 1.58425 * FG;             // p(ρ = 10⁵ g/cm³): a borda

  /* TOV: dm/dr = 4πr²ε, dp/dr = −(ε + p)(m + 4πr³p)/[r(r − 2m)], RK4 do centro à borda */
  function integrate(pc, keep) {
    const f = (r, m, p) => { const e = epsOf(p > 0 ? p : 0); return [4 * Math.PI * r * r * e, -(e + p) * (m + 4 * Math.PI * r ** 3 * p) / (r * (r - 2 * m))]; };
    let r = 1e-4, m = 4 / 3 * Math.PI * r ** 3 * epsOf(pc), p = pc;
    const out = keep ? [[0, 0, pc]] : null;
    for (let n = 0; p > PSURF && n < 40000; n++) {
      const k1 = f(r, m, p), h = Math.min(0.02, 0.05 * p / Math.abs(k1[1] || 1e-30));
      const k2 = f(r + h / 2, m + h / 2 * k1[0], p + h / 2 * k1[1]), k3 = f(r + h / 2, m + h / 2 * k2[0], p + h / 2 * k2[1]), k4 = f(r + h, m + h * k3[0], p + h * k3[1]);
      m += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); p += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); r += h;
      if (keep) out.push([r, m, Math.max(p, 0)]);
    }
    return { R: r, M: m, pts: out };
  }

  /* a estrela de massa Msun (M☉): bisseção em log p_c; perfis numa grade uniforme em r */
  const cache = {};
  function star(Msun = 1.40, N = 1600) {
    const key = Msun + ':' + N; if (cache[key]) return cache[key];
    let lo = Math.log(10 ** 34 / C2 * FG), hi = Math.log(10 ** 35.6 / C2 * FG);
    for (let it = 0; it < 48; it++) { const mid = (lo + hi) / 2; (integrate(Math.exp(mid)).M / MSUN < Msun ? lo = mid : hi = mid); }
    const { R, M, pts } = integrate(Math.exp((lo + hi) / 2), true);
    // ν(r): dν/dr = 2(m + 4πr³p)/[r(r − 2m)], com e^ν(R) = 1 − 2M/R
    const nuRaw = [0];
    for (let i = 1; i < pts.length; i++) {
      const g = ([r, m, p]) => r > 0 ? 2 * (m + 4 * Math.PI * r ** 3 * p) / (r * (r - 2 * m)) : 0;
      nuRaw.push(nuRaw[i - 1] + 0.5 * (g(pts[i - 1]) + g(pts[i])) * (pts[i][0] - pts[i - 1][0]));
    }
    const shift = Math.log(1 - 2 * M / R) - nuRaw[nuRaw.length - 1];
    const g = { R, M, N, dr: R / (N - 1), m: new Float64Array(N), p: new Float64Array(N), eps: new Float64Array(N), nu: new Float64Array(N), nb: new Float64Array(N) };
    let j = 0;
    for (let i = 0; i < N; i++) {
      const r = i * g.dr;
      while (j < pts.length - 2 && pts[j + 1][0] < r) j++;
      const a = pts[j], b = pts[j + 1], t = Math.min(1, Math.max(0, (r - a[0]) / (b[0] - a[0] || 1)));
      g.m[i] = a[1] + t * (b[1] - a[1]); g.p[i] = a[2] + t * (b[2] - a[2]);
      g.nu[i] = nuRaw[j] + t * (nuRaw[j + 1] - nuRaw[j]) + shift;
      g.eps[i] = g.p[i] > 0 ? epsOf(g.p[i]) : 0;
      g.nb[i] = g.p[i] > 0 ? rhoOf(g.p[i]) / FG / MN_G : 0;          // bárions por cm³
    }
    g.m[N - 1] = M; g.nu[N - 1] = Math.log(1 - 2 * M / R);
    g.C = M / R; g.Msun = M / MSUN; g.rhoc = rhoOf(pts[0][2]) / FG; g.epsc = epsOf(pts[0][2]) / FG;
    g.nus = Math.log(1 - 2 * M / R);
    return (cache[key] = g);
  }

  /* métrica e matéria num raio qualquer (fora da estrela: Schwarzschild e vácuo) */
  function local(S, r, o) {
    if (r >= S.R) {
      const f = 1 - 2 * S.M / r;
      o.m = S.M; o.p = 0; o.eps = 0; o.nb = 0; o.enu = f; o.elam = f;
      o.dnu = 2 * S.M / (r * r * f); o.delam = 2 * S.M / (r * r);
      return o;
    }
    const x = r / S.dr, i = Math.min(S.N - 2, Math.floor(x)), t = x - i;
    o.m = S.m[i] + t * (S.m[i + 1] - S.m[i]); o.p = S.p[i] + t * (S.p[i + 1] - S.p[i]);
    o.eps = S.eps[i] + t * (S.eps[i + 1] - S.eps[i]); o.nb = S.nb[i] + t * (S.nb[i + 1] - S.nb[i]);
    const nu = S.nu[i] + t * (S.nu[i + 1] - S.nu[i]);
    o.enu = Math.exp(nu);
    if (r < 1e-6) { o.elam = 1; o.dnu = 0; o.delam = 0; return o; }
    o.elam = 1 - 2 * o.m / r;
    o.dnu = 2 * (o.m + 4 * Math.PI * r ** 3 * o.p) / (r * (r - 2 * o.m));
    o.delam = -8 * Math.PI * r * o.eps + 2 * o.m / (r * r);              // d(e^−λ)/dr
    return o;
  }

  /* ---------------- colisão elástica com um nêutron parado (COL-3 do OBSCURA) ----------------
     s = m² + m_n² + 2 m_n m γ;  p* = m_n p/√s;  o nêutron leva T = p*²(1 − cos θ*)/m_n.
     Energia e direção saem dos mesmos ângulos do centro de massa. */
  function kick(m, g, c) {
    const P2 = m * m * (g * g - 1), s = m * m + MN * MN + 2 * MN * m * g;
    return MN * MN * P2 / s * (1 - c) / MN;              // T (keV)
  }
  // fração máxima (frontal) e média (isotrópica) da energia cinética removida
  const fracMax = (m, g) => 2 * MN * m * (g + 1) / (m * m + MN * MN + 2 * MN * m * g);

  /* 𝒩_min: colisões necessárias para 𝓔 < 1, perda frontal (c = −1) ou média isotrópica (c = 0),
     avaliada com o lapso e^{ν/2} de um raio fixo (a superfície, no fechamento) */
  function nmin(m, E, enuHalf, headOn) {
    let g = E / enuHalf, n = 0;
    const gb = 1 / enuHalf;                              // 𝓔 = 1 ⇔ γ_local = e^{−ν/2}
    while (g >= gb && n < 1e6) { g -= kick(m, g, headOn ? -1 : 0) / m; n++; }
    return n;
  }

  /* L_c(𝓔): maior momento angular específico que ainda chega à superfície */
  const Lc = (S, E) => S.R * Math.sqrt(Math.max(0, (E * E - (1 - 2 * S.C)) / (1 - 2 * S.C)));

  /* gerador com semente (mulberry32) */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------------- uma história ----------------
     Entre colisões a partícula segue a geodésica com (𝓔, 𝓛) conservados, em tempo próprio:
       (dr/dτ)² = F(r) = e^{−λ}(𝓔² e^{−ν} − 1 − 𝓛²/r²),  d²r/dτ² = F′/2,  dφ/dτ = 𝓛/r²,
     e a profundidade óptica cresce como dτ_opt = n_b σ dl = n_b σ √(γ² − 1) dτ, γ = 𝓔 e^{−ν/2}.
     Cada voo livre sorteia −ln U. Modos:
       'R'  transporte (OBSCURA): a colisão sorteia θ*, φ* e atualiza 𝓔 e 𝓛;
       'Fs' trajetória congelada, perda sorteada e avaliada no raio da colisão;
       'Fi' o fechamento realizado: trajetória congelada, perda média isotrópica com o lapso da superfície.
     Captura: 𝓔 < 1 depois da colisão. Os modos congelados fazem uma só travessia. */
  function history(S, opt, E0, L0, mode, R, rec) {
    const m = opt.m, sig = opt.sigma * 1e5;            // σ em cm²; n_b σ em km⁻¹
    const ds = opt.step || S.R / 300, maxColl = opt.maxColl || 3000;
    const o = {}, enuS = Math.sqrt(1 - 2 * S.C);
    let r = opt.r0 ?? S.R, phi = opt.phi0 ?? 0, E = E0, L = L0, Ecur = E0;
    const frozen = mode !== 'R', free = opt.exterior;   // exterior: continua fora da estrela (capa)
    const F = (rr, EE, LL) => { local(S, rr, o); return o.elam * (EE * EE / o.enu - 1 - LL * LL / (rr * rr)); };
    let u = -Math.sqrt(Math.max(0, F(r, E, L)));
    const acc = (rr, EE, LL) => {
      local(S, rr, o);
      const A = EE * EE / o.enu - 1 - LL * LL / (rr * rr);
      return 0.5 * (o.delam * A + o.elam * (-o.dnu * EE * EE / o.enu + 2 * LL * LL / (rr * rr * rr)));
    };
    const rate = (rr, EE) => { local(S, rr, o); const g = EE / Math.sqrt(o.enu); return o.nb * sig * Math.sqrt(Math.max(0, g * g - 1)); };
    let n = 0, steps = 0, status = 'budget';
    const path = rec ? [[r, phi]] : null, hits = rec ? [] : null;
    let lastRec = 0, target = -Math.log(1 - R()), tacc = 0;
    while (steps++ < (opt.maxSteps || 400000)) {
      // passo: comprimento próprio ~ds, e no máximo 0,03 rad de giro
      local(S, Math.max(r, 1e-6), o);
      const g = E / Math.sqrt(o.enu), pg = Math.sqrt(Math.max(g * g - 1, 1e-12));
      const dsr = r > S.R ? Math.max(ds, 0.03 * (r - S.R)) : ds;          // fora, o passo cresce com a distância
      const h = Math.min(dsr / pg, Math.abs(L) > 1e-9 ? 0.03 * r * r / Math.abs(L) : Infinity);
      // RK4 em (r, u, φ, τ_opt)
      const d = (rr, uu) => [uu, acc(rr, E, L), L / (rr * rr), rate(rr, E)];
      const k1 = d(r, u), k2 = d(r + h / 2 * k1[0], u + h / 2 * k1[1]), k3 = d(r + h / 2 * k2[0], u + h / 2 * k2[1]), k4 = d(r + h * k3[0], u + h * k3[1]);
      let r2 = r + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      let u2 = u + h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      let phi2 = phi + h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      const dt = h / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
      if (r2 < 0) { r2 = -r2; u2 = -u2; phi2 += Math.PI; }                // passagem radial pelo centro
      // colisão dentro deste passo?
      if (r2 < S.R && tacc + dt >= target) {
        const f = (target - tacc) / dt;
        r = r + f * (r2 - r); phi = phi + f * (phi2 - phi); u = u + f * (u2 - u);
        tacc = 0; target = -Math.log(1 - R()); n++;
        const Fr = F(r, E, L); if (Fr > 0) u = Math.sign(u || -1) * Math.sqrt(Fr);
        local(S, r, o);
        const eh = Math.sqrt(o.enu);
        if (mode === 'R') {
          const g = E / eh, c = 2 * R() - 1, T = kick(m, g, c), g2 = g - T / m;
          // direção nova: boost do centro de massa
          const P = m * Math.sqrt(g * g - 1), s = m * m + MN * MN + 2 * MN * m * g, rs = Math.sqrt(s);
          const ps = MN * P / rs, Es = Math.sqrt(ps * ps + m * m), b = P / (m * g + MN), gc = (m * g + MN) / rs;
          const ppar = gc * (ps * c + b * Es), pperp = ps * Math.sqrt(1 - c * c), ph = TAU * R();
          const pr = Math.sqrt(o.elam) > 0 ? u / Math.sqrt(o.elam) : 0, pt = L / r;   // por unidade de massa
          const pn = Math.hypot(pr, pt) || 1, dr = pr / pn, dtg = pt / pn;
          let qr = ppar * dr - pperp * Math.cos(ph) * dtg, qt = ppar * dtg + pperp * Math.cos(ph) * dr;
          const qz = pperp * Math.sin(ph), qn = Math.hypot(qr, qt, qz), want = m * Math.sqrt(Math.max(g2 * g2 - 1, 0));
          qr *= want / qn; const qtt = Math.sign(qt || 1) * Math.hypot(qt, qz) * want / qn;
          E = g2 * eh; L = r * qtt / m; u = qr / m * Math.sqrt(o.elam);
          if (E < 1 && !opt.continueBound) { status = 'capture'; if (rec) hits.push([r, phi, 1]); break; }
          if (rec) hits.push([r, phi, E < 1 ? 1 : 0]);
          if (opt.coolTo && E < 1 && (g2 - 1) * m < opt.coolTo) { status = 'cooled'; break; }
        } else {
          const lapse = mode === 'Fi' ? enuS : eh, g = Ecur / lapse;
          const T = mode === 'Fi' ? kick(m, g, 0) : kick(m, g, 2 * R() - 1);
          Ecur = (g - T / m) * lapse;
          if (rec) hits.push([r, phi, Ecur < 1 ? 1 : 0]);
          if (Ecur < 1) { status = 'capture'; break; }
        }
        if (n >= maxColl) { status = 'cap'; break; }
        continue;
      }
      tacc += r2 < S.R ? dt : 0;
      r = r2; u = u2; phi = phi2;
      const Fr = F(r, E, L); if (Fr > 1e-14) u = Math.sign(u) * Math.sqrt(Fr);
      if (rec && (Math.abs(r - path[lastRec][0]) + r * Math.abs(phi - path[lastRec][1]) > S.R / 120)) { path.push([r, phi]); lastRec = path.length - 1; }
      // saída: os modos congelados fazem uma travessia; o transporte sai livre se 𝓔 ≥ 1
      if (r >= S.R && u > 0 && (frozen || !free || r > (opt.rOut || 40 * S.R))) { status = E >= 1 || frozen ? 'escape' : 'bound'; break; }
    }
    if (rec) path.push([r, phi]);
    return { status, n, E: frozen ? Ecur : E, L, path, hits, steps };
  }

  /* profundidade óptica da geodésica incidente numa travessia (σ∫n_b dl), por quadratura em r:
     dl = √(e^λ + r²φ′²) dr, com φ′ da órbita — integrável nos pontos de retorno com r = r_tp + w² */
  function column(S, E, L, sigma) {
    const o = {}, F = r => { local(S, r, o); return o.elam * (E * E / o.enu - 1 - L * L / (r * r)); };
    let a = 1e-6, b = S.R;
    if (F(a) < 0) { for (let it = 0; it < 80; it++) { const mid = (a + b) / 2; F(mid) < 0 ? a = mid : b = mid; } }
    const rtp = F(1e-6) >= 0 ? 0 : b, W = Math.sqrt(S.R - rtp), K = 600;
    let s = 0;
    for (let k = 0; k < K; k++) {
      const w = (k + 0.5) / K * W, r = rtp + w * w;
      const Fr = Math.max(F(r), 1e-300); local(S, r, o);
      const g = E / Math.sqrt(o.enu);
      // dl/dτ = √(γ² − 1), dr/dτ = √F  →  dl = √(γ² − 1)/√F dr, e dr = 2w dw
      s += o.nb * Math.sqrt(g * g - 1) / Math.sqrt(Fr) * 2 * w * (W / K);
    }
    return 2 * s * sigma * 1e5;
  }

  /* ---------------- a nuvem capturada como traçador térmico (artigo 2, seção 2.2) ----------------
     n(r) = n₀ exp(−m ΔΦ/kT) no potencial fixo da estrela, com ΔΦ = ∫ G m(r)/r² dr (como o OBSCURA),
     N = 4π ∫ n r² √g_rr dr até R. r₉₀ contém 90% de N; S = M_χ(r₉₀)/M_b(r₉₀), as duas massas
     como a da TOV, 4π ∫ ρ r² dr. No centro, x_F = ħ(3π² n₀)^{1/3}/(m c) (g = 2),
     E_F = mc²(√(1 + x_F²) − 1) e Θ_c = kT/E_F. Grade logarítmica de 10⁻¹² R a R. */
  function cloud(S, mKeV, Tk, N) {
    const K = 1400, R = S.R, kT = KB * Tk, o = {};
    const mOf = r => { if (r < 3 * S.dr) return 4 / 3 * Math.PI * S.eps[0] * r ** 3; local(S, r, o); return o.m; };
    const r = new Float64Array(K), psi = new Float64Array(K), wN = new Float64Array(K), wM = new Float64Array(K);
    for (let k = 0; k < K; k++) r[k] = R * 10 ** (-12 + 12 * k / (K - 1));
    let phi = 2 * Math.PI / 3 * S.eps[0] * r[0] ** 2;
    for (let k = 0; k < K; k++) {
      if (k) { const g0 = mOf(r[k - 1]) / r[k - 1] ** 2, g1 = mOf(r[k]) / r[k] ** 2; phi += 0.5 * (g0 + g1) * (r[k] - r[k - 1]); }
      psi[k] = mKeV * phi / kT;
      const m = mOf(r[k]), e = Math.exp(-psi[k]) * r[k] * r[k];
      wM[k] = e; wN[k] = e / Math.sqrt(Math.max(1e-12, 1 - 2 * m / r[k]));
    }
    // integrais cumulativas (trapézio), r em km → cm³ no fim
    const cN = new Float64Array(K), cM = new Float64Array(K);
    for (let k = 1; k < K; k++) { const h = r[k] - r[k - 1]; cN[k] = cN[k - 1] + 0.5 * (wN[k] + wN[k - 1]) * h; cM[k] = cM[k - 1] + 0.5 * (wM[k] + wM[k - 1]) * h; }
    const km3 = 1e15, n0 = N / (4 * Math.PI * cN[K - 1] * km3);
    let j = 1; while (j < K - 1 && cN[j] < 0.9 * cN[K - 1]) j++;
    const t = (0.9 * cN[K - 1] - cN[j - 1]) / (cN[j] - cN[j - 1]), r90 = r[j - 1] + t * (r[j] - r[j - 1]);
    const mg = mKeV * KEV_G, Menc = mg * n0 * 4 * Math.PI * (cM[j - 1] + t * (cM[j] - cM[j - 1])) * km3;
    const Mb = mOf(r90) / MSUN * MSUN_G, Sg = Menc / Mb;
    const xF = HBARC * Math.cbrt(3 * Math.PI * Math.PI * n0) / mKeV;
    const EF = xF < 1e-4 ? mKeV * xF * xF / 2 : mKeV * (Math.sqrt(1 + xF * xF) - 1);
    return { r, psi, n0, r90, Menc, Mb, S: Sg, xF, EF, Theta: kT / EF, kT, rhoc: n0 * mg };
  }

  return { star, local, history, column, kick, fracMax, nmin, Lc, rng, cloud, MSUN, MN, MN_G, HBARC, KB, KEV_G, MSUN_G, FG, TAU };
})();
if (typeof module !== 'undefined') module.exports = PHYS;
