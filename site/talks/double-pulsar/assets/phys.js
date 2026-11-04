/* =====================================================================
   A física dos painéis: TOV + Hartle (primeira ordem) em forma de entalpia
   (Lindblom 1992), para as duas famílias do paper. G = c = 1, km.

   Estranhas: Ω = (3/4π²)(−a₄μ⁴ + a₂μ²) + B. Com y = μ²√a₄/√B, tudo depende de λ:
     p/B = (3/4π²)(y² − λy) − 1      ε/B = (3/4π²)(3y² − λy) + 1
   e a entalpia é h = ln(μ/μₛ), com μₛ a superfície (p = 0).
   Nucleônicas: polítropos por partes de Read et al. (2009), crosta SLy.
   Os dois caminhos dão a superfície exata em h = 0, sem procurar p = 0.
   ===================================================================== */
const PHYS = (() => {
  const C2 = 8.987551787e20, FG = 6.6743e-8 / C2 * 1e10;     // g/cm³ → km⁻²
  const MEVFM3 = 1.602176634e33 * 6.6743e-8 / 2.99792458e10 ** 4 * 1e10;   // MeV/fm³ → km⁻²
  const HBARC = 197.3269804, MSUN = 1.4766250614, MA = 1.338183;
  const IUNIT = 1.98841e33 / MSUN * 1e10;                    // km³ → g cm²
  const PI = Math.PI, K34 = 3 / (4 * PI * PI);

  /* --------------- estranhas: EOS(h) para (λ, B^¼) ---------------- */
  function quark(lam, b14) {
    const B = b14 ** 4 / HBARC ** 3 * MEVFM3;               // km⁻²
    const ys = (lam + Math.sqrt(lam * lam + 16 * PI * PI / 3)) / 2;   // sqrt pois y = μ² ∝ e^{2h}
    return {
      lam, b14, B, surf: true,
      at(h) { const y = ys * Math.exp(2 * h);
        return { p: B * (K34 * (y * y - lam * y) - 1), e: B * (K34 * (3 * y * y - lam * y) + 1) }; },
      cs2(h) { const y = ys * Math.exp(2 * h); return (2 * y - lam) / (6 * y - lam); },
    };
  }
  /* ε/B como função de p/B, a equação do paper (para o gráfico da EOS) */
  function epsTilde(pt, lam) {
    const c = 3 * lam * lam / (4 * PI * PI);
    return 3 * pt + 4 + c + Math.sign(lam) * Math.sqrt(c * c + 4 * c * (pt + 1));
  }
  function csTilde(pt, lam) {
    if (lam === 0) return 1 / 3;
    const c = 3 * lam * lam / (4 * PI * PI);
    return 1 / (3 + Math.sign(lam) * 2 * c / Math.sqrt(c * c + 4 * c * (pt + 1)));
  }

  /* --------------- janela de estabilidade (eq. 2 do paper) ---------------- */
  const G0 = 930, ALPHA = (1 / 3 - 8 / (3 * (1 + 2 ** (1 / 3)) ** 3)) * G0 * G0;
  const Bmax = (a2, a4) => G0 * G0 * (G0 * G0 * a4 - 9 * a2) / (108 * PI * PI);
  const Bmin = (a2, a4) => G0 * G0 / (54 * PI * PI) * (4 * G0 * G0 * a4 / (1 + 2 ** (1 / 3)) ** 3 - 3 * a2);

  /* --------------- nucleônicas: polítropos por partes ---------------- */
  const CRUST = [[6.80110e-9, 1.58425, 2.44034e7], [1.06186e-6, 1.28733, 3.78358e11], [5.32697e1, 0.62223, 2.62780e12], [3.99874e-8, 1.35692, Infinity]];
  function pp(lp1, g1, g2, g3) {
    const r1 = 10 ** 14.7, r2 = 1e15, p1 = 10 ** lp1 / C2;
    const K1 = p1 / r1 ** g1, K2 = p1 / r1 ** g2, K3 = K2 * r2 ** (g2 - g3);
    const kc = CRUST[3][0], gc = CRUST[3][1], rho0 = (kc / K1) ** (1 / (g1 - gc));
    if (!(rho0 > CRUST[2][2] && rho0 < r1)) return null;
    const P = [[...CRUST[0]], [...CRUST[1]], [...CRUST[2]], [kc, gc, rho0], [K1, g1, r1], [K2, g2, r2], [K3, g3, Infinity]];
    let lo = 0, eps = 0;
    const S = P.map(([K, G, hi], k) => {
      const a = k ? eps / lo - 1 - K * lo ** (G - 1) / (G - 1) : 0;
      const hl = k ? Math.log(1 + a + K * G * lo ** (G - 1) / (G - 1)) : 0;
      if (isFinite(hi)) eps = (1 + a) * hi + K * hi ** G / (G - 1);
      const s = { K, G, a, lo, hi, hl }; lo = hi; return s;
    });
    return {
      S, surf: false,
      at(h) {
        if (h <= 0) return { p: 0, e: 0 };
        let k = S.length - 1; while (k > 0 && h < S[k].hl) k--;
        const { K, G, a } = S[k], b = Math.expm1(h) - a;
        const rho = (b * (G - 1) / (K * G)) ** (1 / (G - 1)), p = K * rho ** G;
        return { p: FG * p, e: FG * ((1 + a) * rho + p / (G - 1)) };
      },
      cs2(h) {
        let k = S.length - 1; while (k > 0 && h < S[k].hl) k--;
        const { K, G, a } = S[k], b = Math.expm1(h) - a, rho = (b * (G - 1) / (K * G)) ** (1 / (G - 1));
        const t = K * G * rho ** (G - 1); return t / (1 + a + t / (G - 1));
      },
    };
  }

  /* --------------- TOV + Hartle em h ----------------
     x = r², y = m/r, w = ω̄, v = ω̄′/r, q = ln j; D = dx/dh. Tudo finito no centro. */
  function rhs(eos, h, s) {
    const { p, e } = eos.at(h), [x, y, w, v] = s;
    const f = 1 - 2 * y, D = -2 * x * f / (y + 4 * PI * x * p), P = e + p;
    return [D, D * (2 * PI * e - y / (2 * x)), v * D / 2,
      D / (2 * x) * (16 * PI * P * w / f - 5 * v + 4 * PI * x * P * v / f), -2 * PI * P / f * D];
  }
  function star(eos, hc, n = 240, keep = false) {
    const c = eos.at(hc), h0 = hc * 1e-5, P = c.e + c.p;
    const x0 = 3 * h0 / (2 * PI * (c.e + 3 * c.p));
    const a = 8 * PI * P / 5;
    let s = [x0, 4 * PI / 3 * c.e * x0, 1 + a * x0, 2 * a, 0];
    let h = hc - h0; const dh = -h / n, prof = [];
    const add = (u, k, f) => u.map((vi, i) => vi + f * k[i]);
    for (let i = 0; i < n; i++) {
      const k1 = rhs(eos, h, s), k2 = rhs(eos, h + dh / 2, add(s, k1, dh / 2));
      const k3 = rhs(eos, h + dh / 2, add(s, k2, dh / 2)), k4 = rhs(eos, h + dh, add(s, k3, dh));
      if (keep) prof.push({ h, s: [...s] });
      s = s.map((vi, j) => vi + dh / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
      h += dh;
    }
    const [x, y, w, v, q] = s, R = Math.sqrt(x), M = y * R;
    const J = R ** 5 * v / 6, Om = w + 2 * J / R ** 3, I = J / Om;
    const out = { R, M: M / MSUN, I: I * IUNIT, hc, C: y };
    if (keep) {
      // perfil: ε, p e dI/dr = (8π/3) r⁴ (ε+p) (ω̄/Ω) j/(1−2m/r), com j(R) = 1
      out.prof = prof.map(({ h: hh, s: t }) => {
        const { p, e } = eos.at(hh), r = Math.sqrt(t[0]), jj = Math.exp(t[4] - q);
        return { r, e, p, dI: 8 * PI / 3 * r ** 4 * (e + p) * t[2] / Om * jj / (1 - 2 * t[1]) * IUNIT };
      });
    }
    return out;
  }
  /* sequência estável: de h_c pequeno até o primeiro máximo de M */
  function sequence(eos, { n = 34, h0 = null, h1 = 1.6 } = {}) {
    const a = h0 ?? (eos.surf ? 0.012 : 0.03), out = [];
    let best = 0, down = 0;
    for (let i = 0; i < n; i++) {
      const hc = a * (h1 / a) ** (i / (n - 1)), st = star(eos, hc, 120);
      if (!isFinite(st.M)) break;
      out.push(st);
      if (st.M > best) { best = st.M; down = 0; } else if (++down > 1) break;
    }
    const k = out.reduce((b, s, i) => (s.M > out[b].M ? i : b), 0);
    return { seq: out.slice(0, k + 1), max: out[k] };
  }
  /* máximo refinado por seção áurea e a estrela de massa dada por bisseção */
  function maxMass(eos, seq) {
    const k = seq.seq.length - 1, a0 = seq.seq[Math.max(0, k - 1)].hc, b0 = seq.max.hc * 1.25;
    let a = a0, b = b0; const g = 0.618034;
    for (let i = 0; i < 26; i++) {
      const c = b - g * (b - a), d = a + g * (b - a);
      if (star(eos, c, 160).M > star(eos, d, 160).M) b = d; else a = c;
    }
    return star(eos, (a + b) / 2, 240);
  }
  function atMass(eos, M, seq, n = 240, keep = false) {
    const sq = seq || sequence(eos), S = sq.seq;
    if (sq.max.M < M) return null;
    let k = S.findIndex(s => s.M >= M); if (k < 0) return null;
    let a = k ? S[k - 1].hc : S[0].hc * 0.3, b = S[k].hc;
    for (let i = 0; i < 34; i++) { const c = (a + b) / 2; if (star(eos, c, n).M < M) a = c; else b = c; }
    return star(eos, (a + b) / 2, n, keep);
  }
  return { quark, pp, star, sequence, maxMass, atMass, epsTilde, csTilde, Bmax, Bmin, ALPHA, G0, MA, MSUN, FG, IUNIT, MEVFM3 };
})();
if (typeof module !== 'undefined') module.exports = PHYS;
