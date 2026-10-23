/* =====================================================================
   Estrelas de nêutrons — dashboards em canvas
   Parte I · a estrela por dentro:
     #interior-bg — a capa: a estrela de 1,4 M☉ cortada ao meio, pela densidade
     #ns-anat     — a anatomia em escala, com ρ(r)
     #ns-newton   — Newton × TOV: a massa máxima
     #ns-eos      — as equações de estado: P(ρ) e a velocidade do som
     #tov         — curvas massa–raio da equação TOV, resolvida aqui no navegador
   Parte III · pulsares e estrelas de nêutrons:
     #spot — uma mancha quente numa estrela estática: sem gravidade × Beloborodov × integral exata
     #two  — duas manchas (os polos magnéticos): as classes de Beloborodov e o dipolo deslocado
     #spin — a mesma mancha numa estrela que gira rápido: Doppler, aberração, atrasos e o feixe
   Cada bloco procura o seu canvas pelo id e só roda se ele existir.
   Convenções: G = c = 1 nas contas; u ≡ R_S/R = 2GM/(Rc²); ψ é o ângulo entre a normal da
   superfície e a linha de visada; α, o ângulo de emissão (em relação à normal) medido por um
   observador estático na superfície. Eixo de rotação ẑ; observador em ô = (sen j, 0, cos j).
   ===================================================================== */

/* Utilitários desta parte num objeto só: os scripts do deck dividem o escopo global. */
const NS = (() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PI = Math.PI, TAU = 2 * PI, RAD = PI / 180;
  const MSUN = 1.476625;                       // GM☉/c² em km
  const CKMS = 299792.458;                     // c em km/s
  const clip = (v, a, b) => (v < a ? a : v > b ? b : v);
  // número com o separador decimal do idioma e o sinal de menos tipográfico
  const num = (v, d = 0) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−').replace('.', DEC);
  const pct = v => Math.round(100 * v) + '%';

  /* Laço de animação (o mesmo de “Do nascimento à morte das estrelas”): frame(dt, still, skip)
     avança dt segundos e desenha. Só roda enquanto o slide está ativo; na visão geral e com
     prefers-reduced-motion desenha um quadro representativo (still = true). enter() roda cada vez
     que o slide passa a ser o atual. ?ff=N (testes e PDF; FF vem de dash.js) adianta N s na
     primeira partida, em passos de 1/30 s sem desenhar (skip = true). */
  function anim(cv, frame, enter) {
    const slide = cv.closest('.slide');
    let raf = 0, last = 0, ff = typeof FF === 'number' ? FF : 0;
    const live = () => slide.classList.contains('active') && !document.body.classList.contains('overview') && !REDUCE;
    const tick = now => {
      if (!live()) { raf = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      frame(dt, false, false); raf = requestAnimationFrame(tick);
    };
    // registrado antes de onSlide: o estado volta ao início antes do primeiro quadro da visita
    if (enter) addEventListener('slidechange', e => { if (e.detail.slide === slide) enter(); });
    onSlide(cv, () => {
      if (!live()) frame(0, true, false);
      else if (!raf) {
        for (; ff > 1e-9; ff -= 1 / 30) frame(1 / 30, false, true);
        frame(0, false, false); last = 0; raf = requestAnimationFrame(tick);
      }
    });
    return live;
  }

  /* ---------------------------------------------------------------------------------------
     Desvio da luz em Schwarzschild, pela integral exata (a mesma de estrela.html e do PULSARIS)
       ψ(b) = ∫₀^{1/R} dv / √(1/b² − v² + 2Mv³),   b = R sen α / √(1 − u)
     Com x = R/r e k = b/R:  ψ = ∫₀¹ k dx / √(1 − k²x²(1 − ux)).
     Em α = 90° a raiz zera em x = 1; a troca x = 1 − y² (dx = −2y dy) deixa o integrando finito, e o
     ponto médio em y converge depressa (600 nós: ~10⁻³ grau). Vale fora da esfera de fótons, R > 3M
     (u < 2/3): o menor raio dos sliders é 1,6 R_S = 3,2M.
     Conferências: u → 0 dá ψ = α; ψ_máx = 104,3° em u = 0,2 e 152,6° em u = 0,5 (os 104° e 152°
     da literatura); ψ_máx = 180° em R = 1,7603 R_S — abaixo disso a estrela inteira fica à vista
     e aparece a imagem secundária. */
  function psiAt(alpha, u, n = 600) {
    const k = Math.sin(alpha) / Math.sqrt(1 - u);
    let s = 0;
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) / n, x = 1 - y * y, g = 1 - k * k * x * x * (1 - u * x);
      s += 2 * y * k / Math.sqrt(g > 1e-300 ? g : 1e-300);
    }
    return s / n;
  }
  /* Atraso de um fóton de parâmetro b em relação ao radial (b = 0), Pechenick, Ftaclas & Cohen (1983);
     Poutanen & Beloborodov (2006, MNRAS 373, 836 — “PB06”), apêndice A3:
       cΔt = ∫_R^∞ dr/(1 − R_S/r) {[1 − (b²/r²)(1 − R_S/r)]^(−1/2) − 1}
           = R ∫₀¹ dx/(x²(1 − ux)) [1/√(1 − k²x²(1 − ux)) − 1]       (mesma troca x = 1 − y²)
     É a rotina do PULSARIS. No limite u → 0 dá R(1 − cos α), o atraso de Rømer em relação ao ponto
     mais próximo; para 1,4 M☉ e 12 km o atraso máximo (α = 90°) é 1,711 R/c = 68,5 μs (PB06: ~70 μs;
     a aproximação deles, seção 3.1, fica 3,4% abaixo no limbo). Devolve Δt em unidades de R/c. */
  function delayAt(alpha, u, n = 400) {
    const k = Math.sin(alpha) / Math.sqrt(1 - u);
    let s = 0;
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) / n, x = 1 - y * y, w = 1 - u * x, g = 1 - k * k * x * x * w;
      s += 2 * y * (1 / Math.sqrt(g > 1e-300 ? g : 1e-300) - 1) / (Math.max(x * x, 1e-18) * w);
    }
    return s / n;
  }

  /* Tabela ψ(α) para um u, com α uniforme em [0, 90°], e as derivadas que o fluxo pede:
     H(α) = cos α sen α (dα/dψ) = sen ψ · cos α · |d cos α/d cos ψ| — o fluxo de um anel da superfície
     por unidade de ψ e de azimute (ver gTable). psiQ dá ψ em função de q = sen α = b/b_máx, para o
     mapa inverso dos pixels. dt (opcional) é o atraso Δt(α) em unidades de R/c. Guardada em cache. */
  const cache = new Map();
  function table(u, withDelay = false) {
    const key = u.toFixed(5) + (withDelay ? 'd' : '');
    if (cache.has(key)) return cache.get(key);
    // 240 ângulos × 400 nós: erro ≤ 0,006° em u = 0,41 e ≤ 0,03° em u = 0,625, ~6 ms
    const N = 240, h = PI / 2 / (N - 1);
    const al = new Float64Array(N), ps = new Float64Array(N), H = new Float64Array(N);
    for (let k = 0; k < N; k++) { al[k] = k * h; ps[k] = k ? psiAt(al[k], u, 400) : 0; }
    for (let k = 0; k < N; k++) {
      // dψ/dα: diferenças centradas; em α = 0 o limite exato 1/√(1 − u); no fim, unilateral de 2ª ordem
      const d = k === 0 ? 1 / Math.sqrt(1 - u) : k === N - 1 ? (3 * ps[k] - 4 * ps[k - 1] + ps[k - 2]) / (2 * h) : (ps[k + 1] - ps[k - 1]) / (2 * h);
      H[k] = Math.cos(al[k]) * Math.sin(al[k]) / d;
    }
    H[N - 1] = 0;                                           // cos α = 0 no limbo
    let dt = null;
    if (withDelay) { dt = new Float64Array(N); for (let k = 1; k < N; k++) dt[k] = delayAt(al[k], u); }
    const NQ = 2048, psiQ = new Float32Array(NQ), dtQ = withDelay ? new Float32Array(NQ) : null;
    for (let m = 0; m < NQ; m++) {
      const x = Math.asin(Math.min(1, m / (NQ - 1))) / h, k = Math.min(N - 2, Math.floor(x)), t = x - k;
      psiQ[m] = ps[k] + t * (ps[k + 1] - ps[k]);
      if (dtQ) dtQ[m] = dt[k] + t * (dt[k + 1] - dt[k]);
    }
    const tab = { u, N, h, al, ps, H, dt, psiQ, dtQ, NQ, psiMax: ps[N - 1] };
    if (cache.size > 30) cache.delete(cache.keys().next().value);
    cache.set(key, tab);
    return tab;
  }
  // posição fracionária (índice + fração) do ângulo varrido p na tabela; p ≤ ψ_máx
  function invert(tab, p) {
    const ps = tab.ps; let lo = 0, hi = tab.N - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ps[m] <= p) lo = m; else hi = m; }
    const d = ps[hi] - ps[lo];
    return lo + (d > 0 ? clip((p - ps[lo]) / d, 0, 1) : 0);
  }
  const at = (arr, x) => { const k = Math.min(arr.length - 2, Math.floor(x)), t = x - k; return arr[k] + t * (arr[k + 1] - arr[k]); };

  /* G(ψ) = sen ψ · Σ_imagens cos α |d cos α/d cos ψ|, numa grade uniforme em ψ ∈ [0, π].
     O fluxo de um elemento de superfície de uma estrela estática que emite isotropicamente é
     dF ∝ cos α (d cos α/d cos ψ) dS (PB06, seção 2, com δ = 1); com dS = sen ψ dψ dφ, o sen ψ entra
     em G e cancela o 1/sen ψ de d cos α/d cos ψ: G fica finito também no cáustico ψ = π, onde a
     ampliação de uma fonte pontual diverge (a mancha ter área é o que regulariza — estrela.html).
     Imagens: a primária varre ψ; a secundária dá a volta por trás e varre 2π − ψ; a terciária, 2π + ψ.
       flat:  cos α = cos ψ                               (sem gravidade)
       belo:  cos α = u + (1 − u) cos ψ                   (Beloborodov 2002, ApJ 566, L85)
       exact: a tabela da integral
     knees: onde uma imagem nasce ou morre (ψ = ψ_máx e 2π − ψ_máx). A quadratura quebra ali —
     Simpson atravessando um joelho errava de um jeito que mudava com a fase e serrilhava a curva. */
  const NG = 1440;
  function gTable(mode, u, tab) {
    const g = new Float64Array(NG + 1), gs = new Float64Array(NG + 1), knees = [];
    const hof = p => at(tab.H, invert(tab, p));
    for (let m = 0; m <= NG; m++) {
      const p = m / NG * PI, sp = Math.sin(p), cp = Math.cos(p);
      if (mode === 'flat') g[m] = cp > 0 ? sp * cp : 0;
      else if (mode === 'belo') { const ca = u + (1 - u) * cp; g[m] = ca > 0 ? (1 - u) * sp * ca : 0; }
      else {
        const P = tab.psiMax;
        const pri = p <= P ? hof(p) : 0, sec = TAU - p <= P ? hof(TAU - p) : 0, ter = TAU + p <= P ? hof(TAU + p) : 0;
        g[m] = pri + sec + ter; gs[m] = sec + ter;
      }
    }
    if (mode === 'flat') knees.push(PI / 2);
    else if (mode === 'belo') { if (u < 0.5) knees.push(Math.acos(-u / (1 - u))); }
    else [tab.psiMax, TAU - tab.psiMax, tab.psiMax - TAU].forEach(k => { if (k > 0 && k < PI) knees.push(k); });
    return { g, gs, knees, mode };
  }

  /* Fluxo de uma calota de raio angular ρ cujo centro está a ψc da linha de visada, por unidade de
     área da calota: F = ∫ 2 χ(ψ) G(ψ) dψ / [2π(1 − cos ρ)], com χ(ψ) a meia largura em azimute do
     anel ψ dentro da calota. Cada trecho entre quebras (bordas, joelhos, e onde a calota passa a
     conter a visada ou o antípoda) é integrado com ψ = meio − (largura/2)·cos t e ponto médio em t:
     os nós se juntam nas pontas, onde χ tem a forma de raiz quadrada. out = [total, só imagens ≥ 2ª] */
  const FQ = 36;
  function spotFlux(G, psic, rho, out) {
    const lo = Math.max(0, psic - rho), hi = Math.min(PI, psic + rho), cuts = [lo, hi];
    for (const k of G.knees) if (k > lo && k < hi) cuts.push(k);
    const c1 = rho - psic, c2 = TAU - psic - rho;
    if (c1 > lo && c1 < hi) cuts.push(c1);
    if (c2 > lo && c2 < hi) cuts.push(c2);
    cuts.sort((a, b) => a - b);
    const cr = Math.cos(rho), cc = Math.cos(psic), sc = Math.sin(psic), g = G.g, gs = G.gs, ex = G.mode === 'exact';
    let tot = 0, sec = 0;
    for (let s = 0; s < cuts.length - 1; s++) {
      const a = cuts[s], b = cuts[s + 1]; if (b - a < 1e-12) continue;
      const hw = (b - a) / 2, mid = (a + b) / 2, dw = hw * PI / FQ;
      for (let m = 0; m < FQ; m++) {
        const t = (m + 0.5) * PI / FQ, p = mid - hw * Math.cos(t), w = dw * Math.sin(t), sp = Math.sin(p);
        let chi;
        if (sp < 1e-9 || sc < 1e-9) chi = Math.abs(p - psic) <= rho ? PI : 0;
        else { const c = (cr - Math.cos(p) * cc) / (sp * sc); chi = c >= 1 ? 0 : c <= -1 ? PI : Math.acos(c); }
        if (!chi) continue;
        const x = p / PI * NG, k = Math.min(NG - 1, Math.floor(x)), f = x - k;
        tot += 2 * chi * w * (g[k] + f * (g[k + 1] - g[k]));
        if (ex) sec += 2 * chi * w * (gs[k] + f * (gs[k + 1] - gs[k]));
      }
    }
    const A = TAU * (1 - cr);
    out[0] = tot / A; out[1] = sec / A;
    return out;
  }

  /* Estatística de uma volta (N fases uniformes): média, fração pulsada PF = (máx − mín)/(máx + mín),
     amplitudes dos harmônicos 1 e 2 da série de Fourier e a fase do pico (em voltas, com refinamento
     parabólico). */
  function stats(f) {
    const N = f.length; let s = 0, mx = -Infinity, mn = Infinity, kx = 0;
    for (let k = 0; k < N; k++) { const v = f[k]; s += v; if (v > mx) { mx = v; kx = k; } if (v < mn) mn = v; }
    const harm = n => { let re = 0, im = 0; for (let k = 0; k < N; k++) { const a = TAU * n * k / N; re += f[k] * Math.cos(a); im -= f[k] * Math.sin(a); } return 2 * Math.hypot(re, im) / N; };
    const a = f[(kx - 1 + N) % N], b = f[kx], c = f[(kx + 1) % N], den = a - 2 * b + c;
    const dk = den < 0 ? clip(0.5 * (a - c) / den, -0.5, 0.5) : 0;
    return { mean: s / N, mx, mn, pf: mx + mn > 0 ? (mx - mn) / (mx + mn) : 0, a1: harm(1), a2: harm(2), peak: ((kx + dk) / N + 1) % 1 };
  }

  /* ---------------------------------------------------------------------------------------
     O globo, pixel a pixel, pelo caminho inverso (o método do PULSARIS e de estrela.html):
     para cada pixel do disco aparente, b = q·b_máx dá α (sen α = q) e, pela tabela, o ângulo varrido
     ψ(q); a normal do ponto de onde a luz saiu é n = cos ψ·ô + sen ψ·t̂, com t̂ a direção do pixel no
     céu. Com ψ > π o sen ψ fica negativo e o ponto cai do outro lado — a imagem secundária, sem caso
     especial. No céu, x̂ = (0, 1, 0) aponta para a direita e ŷ = (−cos j, 0, sen j) para cima
     (x̂ × ŷ = ô); o eixo de rotação aparece vertical. O brilho de um pixel da mancha é uniforme numa
     estrela estática (Liouville: I/ν³ se conserva ao longo do raio); o fluxo sobe no cáustico porque
     a imagem cobre mais pixels. A sombra do resto da superfície (∝ cos α) é só para dar volume.
     O mapa depende do modo, de u e de j; muda só quando um deles muda. Por quadro, só o teste
     “este ponto está na mancha?” e a grade que gira (cosseno por tabela). */
  const LUTN = 8192, LUTM = LUTN - 1, LUTK = TAU / LUTN, COS = new Float32Array(LUTN);
  for (let k = 0; k < LUTN; k++) COS[k] = Math.cos(k * LUTK);
  const lutIdx = a => Math.round(a / LUTK);

  function globeMap(prev, S, mode, u, tab, j) {
    const n = S * S, m = prev && prev.S === S ? prev : {
      S, A: new Float32Array(n), NZ: new Float32Array(n), NR: new Float32Array(n), LAT: new Float32Array(n),
      SH: new Float32Array(n), QX: new Float32Array(n), Q: new Float32Array(n), LON: new Int32Array(n), ORD: new Int8Array(n),
    };
    if (!m.cv) {
      m.cv = document.createElement('canvas'); m.cv.width = m.cv.height = S;
      m.octx = m.cv.getContext('2d'); m.img = m.octx.createImageData(S, S); m.px = new Uint32Array(m.img.data.buffer);
    }
    const bmax = mode === 'flat' ? 1 : 1 / Math.sqrt(1 - u), ext = bmax * 1.03, pxu = S / (2 * ext);
    Object.assign(m, { mode, u, j, bmax, ext, tab, bRing: false });
    const { A, NZ, NR, LAT, SH, QX, Q, LON, ORD } = m, cj = Math.cos(j), sj = Math.sin(j);
    for (let iy = 0; iy < S; iy++) for (let ix = 0; ix < S; ix++) {
      const p = iy * S + ix, X = ((ix + 0.5) / S * 2 - 1) * ext, Y = -((iy + 0.5) / S * 2 - 1) * ext, b = Math.hypot(X, Y);
      const a = clip((bmax - b) * pxu + 0.5, 0, 1); A[p] = a;
      if (a <= 0) { ORD[p] = -1; continue; }
      const q = Math.min(b / bmax, 1), ca = Math.sqrt(1 - q * q);
      let psi;
      if (mode === 'flat') psi = Math.asin(q);
      else if (mode === 'belo') {
        // Beloborodov invertida: 1 − cos ψ = (1 − cos α)/(1 − u). Para u > 1/2 ela chega a ψ = π antes
        // da borda (cos α = 2u − 1): o anel de fora não tem ponto da superfície na aproximação
        const cp = 1 - (1 - ca) / (1 - u);
        if (cp < -1) { ORD[p] = -2; m.bRing = true; continue; }
        psi = Math.acos(cp);
      } else psi = at(tab.psiQ, q * (tab.NQ - 1));
      const ord = Math.floor(psi / PI);
      if (ord > 2) { ORD[p] = -1; A[p] = 0; continue; }
      const tx = b > 1e-9 ? X / b : 1, ty = b > 1e-9 ? Y / b : 0, cp = Math.cos(psi), sp = Math.sin(psi);
      const nx = cp * sj - sp * ty * cj, ny = sp * tx, nz = cp * cj + sp * ty * sj;
      NZ[p] = nz; NR[p] = Math.sqrt(nx * nx + ny * ny); LAT[p] = Math.asin(clip(nz, -1, 1));
      LON[p] = lutIdx(Math.atan2(ny, nx)); SH[p] = ca; ORD[p] = ord; QX[p] = X / bmax; Q[p] = q;
    }
    return m;
  }

  /* Pinta o mapa na fase φ (índice da tabela de cossenos). A estrela gira em torno de ẑ: o pixel de
     longitude λ mostra o ponto da estrela de longitude λ − φ. spots: [{cz, sz, li, cr, ie, c, c2}] com
     cos/sen da colatitude do centro, longitude (índice), cos ρ, 1/(1 − cos ρ) e as cores da imagem
     primária e das outras. o.lon troca as longitudes (atrasos em #spin); o.pr/pg/pb dão a cor da
     mancha pixel a pixel e o.tr/tg/tb a da superfície (Doppler em #spin). */
  const STEP = PI / 6;
  function paint(m, phi, spots, o = {}) {
    const { S, A, NZ, NR, LAT, SH, ORD, px } = m, LON = o.lon || m.LON, W = o.gridW || 0.017, ns = spots.length;
    const { pr, pg, pb, tr, tg, tb } = o;
    for (let p = 0, n = S * S; p < n; p++) {
      const a = A[p];
      if (a <= 0) { px[p] = 0; continue; }
      const ord = ORD[p];
      if (ord === -2) { px[p] = ((70 * a) << 24 | 138 << 16 | 122 << 8 | 255) >>> 0; continue; }
      const lat = LAT[p], li = LON[p] - phi, lonr = (li & LUTM) * LUTK, cl = NR[p];
      const dl = Math.abs(lat / STEP - Math.round(lat / STEP)) * STEP, dm = Math.abs(lonr / STEP - Math.round(lonr / STEP)) * STEP * cl;
      const gr = Math.max(0, 1 - dl / W, 1 - dm / W) * (Math.abs(lat) < W ? 1 : 0.72);
      const sh = 0.5 + 0.5 * SH[p];
      let r, g, b;
      if (tr) { r = (tr[p] + 70 * gr) * sh; g = (tg[p] + 84 * gr) * sh; b = (tb[p] + 110 * gr) * sh; }
      else if (ord === 0) { r = (30 + 70 * gr) * sh; g = (38 + 84 * gr) * sh; b = (58 + 110 * gr) * sh; }
      else { r = (18 + 46 * gr) * sh; g = (50 + 84 * gr) * sh; b = (60 + 84 * gr) * sh; }   // o outro lado, de novo
      for (let s = 0; s < ns; s++) {
        const sp = spots[s], d = sp.cz * NZ[p] + sp.sz * cl * COS[(li - sp.li) & LUTM], e = (d - sp.cr) * sp.ie;
        if (e <= -0.03) continue;
        const k = e >= 0.03 ? 1 : (e + 0.03) / 0.06;
        let cr, cg, cb;
        if (pr) { cr = pr[p]; cg = pg[p]; cb = pb[p]; } else { const c = ord ? sp.c2 : sp.c; cr = c[0]; cg = c[1]; cb = c[2]; }
        r += (cr - r) * k; g += (cg - g) * k; b += (cb - b) * k;
      }
      px[p] = ((255 * a) << 24 | b << 16 | g << 8 | r) >>> 0;
    }
    m.octx.putImageData(m.img, 0, 0);
  }
  // descritor de mancha para paint: colatitude θ, longitude λ (rad), raio ρ, cores
  const spotDesc = (th, lon, rho, c, c2) => ({ cz: Math.cos(th), sz: Math.sin(th), li: lutIdx(lon), cr: Math.cos(rho), ie: 1 / (1 - Math.cos(rho)), c, c2: c2 || c });

  /* posição no céu (em unidades de R) da imagem primária de um ponto n̂ da superfície, ou null */
  function imagePos(m, n) {
    const cj = Math.cos(m.j), sj = Math.sin(m.j), cps = n[0] * sj + n[2] * cj, psi = Math.acos(clip(cps, -1, 1));
    let sa;
    if (m.mode === 'flat') { if (cps <= 0) return null; sa = Math.sin(psi); }
    else if (m.mode === 'belo') { const ca = m.u + (1 - m.u) * cps; if (ca <= 0) return null; sa = Math.sqrt(1 - ca * ca); }
    else { if (psi > m.tab.psiMax) return null; sa = Math.sin(at(m.tab.al, invert(m.tab, psi))); }
    const b = sa * m.bmax, ex = n[1], ey = -n[0] * cj + n[2] * sj, en = Math.hypot(ex, ey) || 1;
    return [b * ex / en, b * ey / en];
  }

  /* Desenha o globo no canvas: halo, imagem escalada, eixo de rotação projetado.
     Rp = pixels CSS por R; (cx, cy) = centro. */
  function drawGlobe(c, m, cx, cy, Rp) {
    const Ra = m.bmax * Rp, half = m.ext * Rp;
    const gh = c.createRadialGradient(cx, cy, Ra * 0.96, cx, cy, Ra * 1.22);
    gh.addColorStop(0, 'rgba(86,225,208,.13)'); gh.addColorStop(1, 'rgba(86,225,208,0)');
    c.fillStyle = gh; c.beginPath(); c.arc(cx, cy, Ra * 1.22, 0, TAU); c.fill();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(m.cv, cx - half, cy - half, 2 * half, 2 * half);
    // eixo de rotação: da imagem do polo norte para cima; do polo sul, se à vista, para baixo (tracejado)
    const pn = imagePos(m, [0, 0, 1]), ps = imagePos(m, [0, 0, -1]), top = cy - Ra - 30, bot = cy + Ra + 22;
    c.save();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(cx, pn ? cy - pn[1] * Rp : cy - Ra); c.lineTo(cx, top); c.stroke();
    c.setLineDash([4, 5]); c.beginPath(); c.moveTo(cx, ps ? cy - ps[1] * Rp : cy + Ra); c.lineTo(cx, bot); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(cx, top - 8); c.lineTo(cx - 5, top + 2); c.lineTo(cx + 5, top + 2); c.fill();
    if (pn) { c.beginPath(); c.arc(cx, cy - pn[1] * Rp, 3, 0, TAU); c.fill(); }
    c.restore();
    return { Ra, top, bot };
  }

  /* moldura padrão das curvas de luz: duas voltas no eixo x */
  function lcPlot(cv) {
    return new Plot(cv, { x: [0, 2], y: [0, 2], m: [46, 16, 58, 66], fs: 16, xticks: [0, 0.5, 1, 1.5, 2], xfmt: v => String(v).replace('.', DEC), yfmt: v => String(v).replace('.', DEC) });
  }
  // legenda em linha no topo do gráfico: [[texto, valor, cor, traço, destaque]]
  function legend(c, x0, y, items) {
    let lx = x0; c.save(); c.textBaseline = 'middle'; c.textAlign = 'left';
    items.forEach(([name, val, col, dash, hi]) => {
      c.strokeStyle = col; c.lineWidth = hi ? 3.5 : 2; c.setLineDash(dash || []);
      c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + 28, y); c.stroke(); c.setLineDash([]);
      c.font = `15px ${FONT}`; c.fillStyle = COL.text2; const s1 = name + (val ? '  ' : ''); c.fillText(s1, lx + 36, y);
      let w = c.measureText(s1).width;
      if (val) { c.font = `600 15px ${FONT}`; c.fillStyle = hi ? col : COL.text2; c.fillText(val, lx + 36 + w, y); w += c.measureText(val).width; }
      lx += 36 + w + 26;
    });
    c.restore();
  }

  return { REDUCE, PI, TAU, RAD, MSUN, CKMS, clip, num, pct, anim, psiAt, delayAt, table, invert, at, gTable, spotFlux, stats, globeMap, paint, spotDesc, imagePos, drawGlobe, lcPlot, legend, LUTN, LUTK, lutIdx };
})();

/* ===================================================================================
   Equações de estado e a TOV, num objeto só (NSEOS): as Partes I e III usam as mesmas EOS e as mesmas
   sequências de estrelas, resolvidas uma vez. A equação de Tolman–Oppenheimer–Volkoff (G = c = 1, r em km):
     dm/dr = 4π r² ε,   dP/dr = −(ε + P)(m + 4π r³ P) / [r (r − 2m)]
   integrada com Runge–Kutta de 4ª ordem em r, a partir do centro, até a pressão cair à de
   ρ = 10⁵ g/cm³ (o resto da crosta acrescenta metros). Passo: o menor entre 0,04 km e 6% da escala
   de altura P/|dP/dr|, que fica curta na crosta. ~85 pressões centrais por EOS, de 10^33,5 dyn/cm²
   até passar do máximo; o desenho fica no ramo estável (até M_máx).
   Equações de estado: polítropos por partes de Read, Lackey, Owen & Friedman (2009, PRD 79, 124032;
   arXiv:0812.2163). Acima de ρ₀, três pedaços p = K_i ρ^Γ_i com divisões fixas em ρ₁ = 10^14,7 e
   ρ₂ = 10^15 g/cm³; p₁ = p(ρ₁). Os quatro números de cada EOS (log p₁ em dyn/cm², Γ₁, Γ₂, Γ₃) são
   da Tabela III do artigo, conferidos na fonte do arXiv. Abaixo, a crosta SLy da Tabela II (quatro
   polítropos). Os K_i da Tabela II dão p/c² em g/cm³ (nota 1 do artigo: “troque p e K por p/c² e
   K/c²”; a legenda da tabela fala em dyn/cm², mas só p/c² é contínuo nas divisões e dá ~10³² dyn/cm²
   na densidade nuclear). ρ₀ é onde o primeiro pedaço do núcleo, estendido para baixo, cruza a crosta.
   Energia pela primeira lei (eq. 7–8): ε = (1 + a_i)ρ + K_i ρ^Γ_i/(Γ_i − 1), a_i fazendo ε contínua.
   Conferência (M_máx em M☉ / R₁,₄ em km) contra os valores do ajuste na Tabela III — valor tabelado
   corrigido pelo erro percentual listado: WFF1 2,126/10,41 (2,127/10,42), APR4 2,188/11,32
   (2,189/11,33), SLy 2,048/11,70 (2,049/11,71), ENG 2,238/11,97 (2,239/11,98), MPA1 2,456/12,43
   (2,457/12,44), H4 2,014/13,95 (2,015/13,96), MS1 2,753/14,93 (2,752/14,93).
   =================================================================================== */
const NSEOS = (() => {
  const { MSUN } = NS;
  const C2 = 8.987551787e20, FG = 6.67430e-8 / C2 * 1e10;      // G/c² em cm/g → (g/cm³) para km⁻²
  // crosta SLy (Read et al. 2009, Tabela II): K_i (p/c² em g/cm³), Γ_i, densidade final ρ_i (g/cm³)
  const CRUST = [[6.80110e-9, 1.58425, 2.44034e7], [1.06186e-6, 1.28733, 3.78358e11], [5.32697e1, 0.62223, 2.62780e12], [3.99874e-8, 1.35692, Infinity]];
  // cores: das mais macias (azul) às mais duras (rosa), na ordem de R₁,₄
  const EOS = [
    ['WFF1', 34.031, 2.519, 3.791, 3.660, '#7cc4ff'],   // Wiringa, Fiks & Fabrocini 1988
    ['APR4', 34.269, 2.830, 3.445, 3.348, '#69d3e8'],   // Akmal, Pandharipande & Ravenhall 1998 (“AP4”)
    ['SLy', 34.384, 3.005, 2.988, 2.851, '#56e1d0'],    // Douchin & Haensel 2001
    ['ENG', 34.437, 3.514, 3.130, 3.168, '#aedc9a'],    // Engvik et al. 1996
    ['MPA1', 34.495, 3.446, 3.572, 2.887, '#ffb86b'],   // Müther, Prakash & Ainsworth 1987
    ['H4', 34.669, 2.909, 2.246, 2.144, '#ffa08e'],     // Lackey, Nayyar & Owen 2006 (com híperons)
    ['MS1', 34.858, 3.224, 3.033, 1.325, '#ff8fab'],    // Müller & Serot 1996
  ].map(([name, lp1, g1, g2, g3, col]) => ({ name, lp1, g1, g2, g3, col, R: null, M: null }));

  function makeEOS(e) {
    if (e.P) return e.P;
    const r1 = 10 ** 14.7, r2 = 1e15, p1 = 10 ** e.lp1 / C2;
    const K1 = p1 / r1 ** e.g1, K2 = p1 / r1 ** e.g2, K3 = K2 * r2 ** (e.g2 - e.g3);
    const pieces = []; let lo = 0, rho0 = 0;
    for (const [K, G, hi] of CRUST) {
      const x = Math.exp((Math.log(K) - Math.log(K1)) / (e.g1 - G));   // K ρ^G = K₁ ρ^Γ₁
      if (x > lo && x <= hi) { rho0 = x; pieces.push([K, G, lo, x]); break; }
      pieces.push([K, G, lo, hi]); lo = hi;
    }
    pieces.push([K1, e.g1, rho0, r1], [K2, e.g2, r1, r2], [K3, e.g3, r2, Infinity]);
    // ε contínua; depois, tudo em unidades geométricas (km⁻²): K_geo = K·FG^(1−Γ)
    let eps = 0;
    return (e.P = pieces.map(([K, G, a0, hi], k) => {
      const a = k ? eps / a0 - 1 - K * a0 ** (G - 1) / (G - 1) : 0;
      if (hi < Infinity) eps = (1 + a) * hi + K * hi ** G / (G - 1);
      return { G, a, Kg: K * FG ** (1 - G), plo: K * a0 ** G * FG };
    }));
  }
  const piece = (P, p) => { let k = P.length - 1; while (k > 0 && p < P[k].plo) k--; return P[k]; };
  const rhoOf = (P, p) => { const o = piece(P, p); return (p / o.Kg) ** (1 / o.G); };        // densidade de repouso (km⁻²)
  function epsOf(P, p) { const o = piece(P, p), rho = (p / o.Kg) ** (1 / o.G); return (1 + o.a) * rho + p / (o.G - 1); }
  const cs2Of = (P, p) => piece(P, p).G * p / (epsOf(P, p) + p);                               // c_s²/c² = Γ P/(ε + P)
  const pOfRho = (P, rho) => { let k = P.length - 1; while (k > 0 && rho < (P[k].plo / P[k].Kg) ** (1 / P[k].G)) k--; return P[k].Kg * rho ** P[k].G; };
  const PSURF = 6.80110e-9 * 1e5 ** 1.58425 * FG;               // p(ρ = 10⁵ g/cm³)
  /* Uma estrela, do centro (pressão pc) até PSURF: TOV (gr) ou Newton (dP/dr = −ε m/r², com ε como densidade
     de massa). prof, se dado, recebe [r, m, p] a cada passo. Devolve [R em km, M em M☉]. */
  function star(P, pc, gr = true, prof = null) {
    const f = (r, m, p) => { const e = epsOf(P, p > 0 ? p : 0); return [4 * Math.PI * r * r * e, gr ? -(e + p) * (m + 4 * Math.PI * r ** 3 * p) / (r * (r - 2 * m)) : -e * m / (r * r)]; };
    let r = 1e-4, m = 4 / 3 * Math.PI * r ** 3 * epsOf(P, pc), p = pc;
    if (prof) prof.push([0, 0, pc]);
    for (let n = 0; p > PSURF && n < 20000; n++) {
      const k1 = f(r, m, p), h = Math.min(0.04, 0.06 * p / Math.abs(k1[1] || 1e-30));
      const k2 = f(r + h / 2, m + h / 2 * k1[0], p + h / 2 * k1[1]), k3 = f(r + h / 2, m + h / 2 * k2[0], p + h / 2 * k2[1]), k4 = f(r + h, m + h * k3[0], p + h * k3[1]);
      m += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); p += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); r += h;
      if (prof && p > 0) prof.push([r, m, p]);
    }
    return [r, m / MSUN];
  }
  /* a sequência estável de uma EOS (até M_máx), guardada no próprio objeto: R, M, a pressão central pc de
     cada estrela, M_máx, o raio e a pressão central da estrela de massa máxima e R₁,₄ */
  function solve(e) {
    if (e.R) return e;
    const P = makeEOS(e), R = [], M = [], PC = [];
    let mmax = 0;
    for (let lp = 33.5; lp <= 37; lp += 0.035) {
      const pc = 10 ** lp / C2 * FG, [r, m] = star(P, pc);
      if (m < mmax) break;                                     // passou do máximo: fim do ramo estável
      mmax = m; R.push(r); M.push(m); PC.push(pc);
    }
    e.R = R; e.M = M; e.PC = PC; e.mmax = mmax; e.rmax = R[R.length - 1]; e.pcmax = PC[PC.length - 1];
    e.r14 = null;
    for (let k = 1; k < M.length; k++) if (M[k - 1] < 1.4 && M[k] >= 1.4) e.r14 = R[k - 1] + (1.4 - M[k - 1]) / (M[k] - M[k - 1]) * (R[k] - R[k - 1]);
    return e;
  }
  /* a pressão central de uma estrela de massa Mt (M☉) no ramo estável, por bisseção em log pc */
  function pcFor(e, Mt) {
    solve(e); const P = makeEOS(e);
    let lo = Math.log(e.PC[0]), hi = Math.log(e.pcmax);
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; star(P, Math.exp(mid))[1] < Mt ? lo = mid : hi = mid; }
    return Math.exp((lo + hi) / 2);
  }
  // conversões: densidade e pressão geométricas (km⁻²) → g/cm³ e dyn/cm²
  const toRho = x => x / FG, toP = x => x / FG * C2;
  const RHO0 = 2.7e14;                                          // densidade de saturação nuclear (n₀ = 0,16 fm⁻³), g/cm³
  return { C2, FG, EOS, makeEOS, epsOf, rhoOf, cs2Of, pOfRho, PSURF, star, solve, pcFor, toRho, toP, RHO0, sly: EOS[2] };
})();

/* ===================================================================================
   Parte I · a estrela por dentro. O perfil de uma estrela de M☉ dada com a SLy (pela TOV de NSEOS) e as
   camadas pela densidade: crosta externa até o gotejamento de nêutrons (4,3×10¹¹ g/cm³), crosta interna até a
   transição crosta–núcleo (~ρ₀/2 = 1,27×10¹⁴, n = 0,076 fm⁻³ na SLy), núcleo externo até 2ρ₀ e núcleo interno
   acima. Conferido: 1,4 M☉ dá R = 11,71 km, ρ_c = 8,9×10¹⁴ g/cm³ = 3,3 ρ₀ e crosta de 0,92 km; 2,0 M☉ dá
   ρ_c = 5,9 ρ₀ e crosta de 0,38 km.
   =================================================================================== */
const NSI = (() => {
  const { RHO0 } = NSEOS, DRIP = 4.3e11, CC = 1.27e14;
  const LAYERS = [                                                  // do centro para fora: até que densidade, cor
    { k: 'ic', lo: 2 * RHO0, col: [255, 196, 120] }, { k: 'oc', lo: CC, col: [158, 140, 255] },
    { k: 'icr', lo: DRIP, col: [86, 225, 208] }, { k: 'ocr', lo: 0, col: [124, 196, 255] }];
  const cache = new Map();
  function profile(Mt) {
    if (cache.has(Mt)) return cache.get(Mt);
    const e = NSEOS.sly, P = NSEOS.makeEOS(e), pc = NSEOS.pcFor(e, Mt), pr = [];
    const [R, M] = NSEOS.star(P, pc, true, pr);
    const r = pr.map(q => q[0]), rho = pr.map(q => NSEOS.toRho(NSEOS.rhoOf(P, q[2])));
    const rAt = th => { for (let i = rho.length - 1; i > 0; i--) if (rho[i] >= th) return r[i]; return 0; };
    const o = { M, R, r, rho, rc: rho[0], pc, ec: NSEOS.epsOf(P, pc), bounds: { ic: rAt(2 * RHO0), oc: rAt(CC), icr: rAt(DRIP), rho0: rAt(RHO0) } };
    cache.set(Mt, o); return o;
  }
  // a cor de uma densidade: das camadas de fora (azul) ao núcleo (âmbar), mais clara no centro
  const STOPS = [[6, [40, 58, 92]], [Math.log10(DRIP), [70, 120, 175]], [Math.log10(CC), [86, 200, 214]], [Math.log10(RHO0), [150, 140, 255]], [Math.log10(2 * RHO0), [225, 125, 175]], [15.2, [255, 200, 130]], [15.5, [255, 240, 215]]];
  function color(rho, a = 1) {
    const x = Math.log10(Math.max(rho, 1e6)); let k = 0; while (k < STOPS.length - 2 && x > STOPS[k + 1][0]) k++;
    const [x0, c0] = STOPS[k], [x1, c1] = STOPS[k + 1], t = clamp((x - x0) / (x1 - x0), 0, 1);
    return `rgba(${c0.map((v, i) => Math.round(v + t * (c1[i] - v))).join(',')},${a})`;
  }
  return { profile, color, LAYERS, DRIP, CC, RHO0 };
})();

/* A capa da Parte I: a estrela de 1,4 M☉ cortada ao meio — à esquerda a superfície, à direita o corte com a
   densidade do perfil da TOV, em escala. Desenho parado. */
(() => {
  const cv = document.getElementById('interior-bg'); if (!cv) return;
  function draw() {
    const { ctx: c, w, h } = fitCanvas(cv), pf = NSI.profile(1.4), cx = w * 0.735, cy = h * 0.52, Rp = h * 0.39, s = Rp / pf.R;
    const g = c.createRadialGradient(cx, cy, Rp * 0.95, cx, cy, Rp * 1.35);
    g.addColorStop(0, 'rgba(124,196,255,.22)'); g.addColorStop(1, 'rgba(124,196,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rp * 1.35, 0, 7); c.fill();
    // a metade de fora: a superfície, com o terminador e uma grade de latitudes
    c.save(); c.beginPath(); c.rect(0, 0, cx, h); c.clip();
    const gs = c.createRadialGradient(cx - Rp * 0.35, cy - Rp * 0.35, Rp * 0.1, cx, cy, Rp);
    gs.addColorStop(0, '#5a6c94'); gs.addColorStop(0.7, '#27304a'); gs.addColorStop(1, '#141a2b');
    c.fillStyle = gs; c.beginPath(); c.arc(cx, cy, Rp, 0, 7); c.fill();
    c.strokeStyle = 'rgba(190,210,255,.12)'; c.lineWidth = 1;
    for (let k = -2; k <= 2; k++) { const y = cy + k * Rp / 3, rr = Math.sqrt(Math.max(0, Rp * Rp - (k * Rp / 3) ** 2)); c.beginPath(); c.ellipse(cx, y, rr, rr * 0.12, 0, Math.PI / 2, 1.5 * Math.PI); c.stroke(); }
    c.restore();
    // o corte: anéis da densidade, de fora para dentro
    c.save(); c.beginPath(); c.rect(cx, 0, w - cx, h); c.clip();
    for (let i = pf.r.length - 1; i >= 0; i -= 3) { c.fillStyle = NSI.color(pf.rho[i]); c.beginPath(); c.arc(cx, cy, pf.r[i] * s, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2;
    for (const k of ['ic', 'oc', 'icr']) { c.beginPath(); c.arc(cx, cy, pf.bounds[k] * s, -Math.PI / 2, Math.PI / 2); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy - Rp); c.lineTo(cx, cy + Rp); c.stroke();
  }
  onSlide(cv, draw);
})();

/* A anatomia: em cima, uma fatia da estrela em escala (cunha de ±9°, o centro à esquerda); embaixo, ρ(r) em
   escala log com as camadas em faixas — os dois com o mesmo eixo de r. Três massas para comparar. */
(() => {
  const cv = document.getElementById('ns-anat-cut'); if (!cv) return;
  const cvR = document.getElementById('ns-anat-rho'), out = document.getElementById('ns-anat-out');
  const RMAX = 12.6, TH = 9 * deg, ML = 74, MR = 26;
  const NAMES = { ic: T('núcleo interno', 'inner core'), oc: T('núcleo externo', 'outer core'), icr: T('crosta interna', 'inner crust'), ocr: T('crosta externa', 'outer crust') };
  const getM = bindSeg('ns-anat-m', () => draw());
  const P = new Plot(cvR, { x: [0, RMAX], y: [1e6, 5e15], ylog: true, m: [10, MR, 56, ML], fs: 15, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [1e6, 1e8, 1e10, 1e12, 1e14] });
  function draw() {
    const Mt = +getM(), pf = NSI.profile(Mt), b = pf.bounds, layers = [[0, b.ic, 'ic'], [b.ic, b.oc, 'oc'], [b.oc, b.icr, 'icr'], [b.icr, pf.R, 'ocr']];
    const lcol = k => NSI.LAYERS.find(l => l.k === k).col;
    // a fatia
    const { ctx: c, w, h } = fitCanvas(cv), x0 = ML, sx = (w - MR - ML) / RMAX, cy = h - 36;
    const yTop = r => cy - r * sx * Math.sin(TH);
    for (let i = pf.r.length - 1; i >= 0; i -= 2) {
      c.fillStyle = NSI.color(pf.rho[i]); c.beginPath(); c.moveTo(x0, cy); c.arc(x0, cy, pf.r[i] * sx, -2 * TH, 0); c.closePath(); c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2;
    for (const [, r1] of layers.slice(0, 3)) { c.beginPath(); c.arc(x0, cy, r1 * sx, -2 * TH, 0); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(x0, cy, pf.R * sx, -2 * TH, 0); c.stroke();
    c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T(`uma fatia em escala · ${fmt(pf.M, 1)} M☉, SLy`, `a slice to scale · ${fmt(pf.M, 1)} M☉, SLy`), 8, 6);
    c.textBaseline = 'middle'; c.textAlign = 'right'; c.fillText(T('centro', 'centre'), x0 - 8, cy);
    c.textAlign = 'left'; c.fillText(T('superfície', 'surface'), x0 + pf.R * sx + 8, cy - 8);
    // ρ(r), com as camadas em faixas e os nomes dentro delas (de pé nas cascas finas)
    P.begin(); const d = P.ctx;
    layers.forEach(([r0, r1, k]) => { const [cr, cg, cb] = lcol(k); d.fillStyle = `rgba(${cr},${cg},${cb},.16)`; d.fillRect(P.X(r0), P.T, P.X(r1) - P.X(r0), P.B - P.T); });
    P.frame(T('r (km)', 'r (km)'), T('ρ (g/cm³)', 'ρ (g/cm³)'));
    P.clip();
    P.hline(NSI.DRIP, { color: 'rgba(86,225,208,.5)' });
    P.hline(NSI.RHO0, { color: 'rgba(158,140,255,.6)' });
    for (const m of ['1.0', '1.4', '2.0']) if (m !== getM()) { const q = NSI.profile(+m); P.line(q.r, q.rho, { color: 'rgba(255,255,255,.28)', width: 1.4, dash: [5, 5] }); }
    P.line(pf.r, pf.rho, { color: '#fff', width: 3, glow: 10 });
    P.text(0.25, NSI.RHO0 * 0.62, T('ρ₀: dentro de um núcleo atômico', 'ρ₀: inside an atomic nucleus'), { color: 'rgba(190,178,255,.95)', size: 14, base: 'top' });
    P.text(0.25, NSI.DRIP * 0.62, T('gotejamento de nêutrons', 'neutron drip'), { color: 'rgba(120,235,220,.9)', size: 14, base: 'top' });
    layers.forEach(([r0, r1, k]) => {
      const [cr, cg, cb] = lcol(k), wpx = P.X(r1) - P.X(r0), xm = (P.X(r0) + P.X(r1)) / 2;
      d.save(); d.font = `600 14px ${FONT}`; d.fillStyle = `rgb(${cr},${cg},${cb})`; d.textBaseline = 'middle'; d.textAlign = 'center';
      d.strokeStyle = 'rgba(8,10,18,.9)'; d.lineWidth = 4; d.lineJoin = 'round';                   // contorno escuro: legível sobre a curva
      if (wpx > 120) { d.strokeText(NAMES[k], xm, P.Y(1e8)); d.fillText(NAMES[k], xm, P.Y(1e8)); }
      else { d.translate(xm, P.Y(1e10)); d.rotate(-Math.PI / 2); d.strokeText(NAMES[k], 0, 0); d.fillText(NAMES[k], 0, 0); }
      d.restore();
    });
    P.unclip();
    out.innerHTML = `<span><b>${fmt(pf.M, 2)} M☉</b> · R <b>${fmt(pf.R, 1)} km</b></span>
      <span>${T('centro', 'centre')} ρ<sub>c</sub> <b>${sci(pf.rc, 1)} g/cm³</b> = <b>${fmt(pf.rc / NSI.RHO0, 1)} ρ₀</b></span>
      <span>${T('crosta', 'crust')} <b>${fmt(pf.R - b.oc, 2)} km</b></span>
      <span>${T('núcleo interno (ρ > 2ρ₀)', 'inner core (ρ > 2ρ₀)')}: ${T('raio', 'radius')} <b>${fmt(b.ic, 1)} km</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Newton × TOV com a mesma EOS (SLy): a massa em função da densidade central. Em Newton a massa só cresce; na
   TOV a pressão também gravita, e a curva tem um máximo (2,05 M☉ em ρ_c = 2,0×10¹⁵ g/cm³) — depois dele, o ramo
   instável. O controle escolhe ρ_c; os cartões dão o tamanho de cada fator da TOV para essa estrela: no centro,
   1 + P/ε e 1 + 4πr³P/m → 1 + 3P/ε; na superfície, (1 − 2GM/Rc²)⁻¹. */
(() => {
  const cv = document.getElementById('ns-newton'); if (!cv) return;
  const out = document.getElementById('ns-tov-out'), e = NSEOS.sly, EP = NSEOS.makeEOS(e), FG = NSEOS.FG;
  const getL = bindRange('ns-rhoc', v => sci(10 ** v, 1) + ' g/cm³', () => draw());
  const P = new Plot(cv, { x: [10 ** 14.3, 10 ** 15.6], y: [0, 4], xlog: true, m: [16, 20, 56, 64], fs: 15, yticks: [0, 1, 2, 3, 4], xticks: [3e14, 1e15, 3e15], xfmt: v => sci(v, 0) });
  let curves = null;
  function build() {
    const L = linspace(14.3, 15.6, 66), gr = [], nw = [];
    for (const l of L) { const pc = NSEOS.pOfRho(EP, 10 ** l * FG); gr.push(NSEOS.star(EP, pc, true)); nw.push(NSEOS.star(EP, pc, false)); }
    let kmax = 0; gr.forEach((q, k) => { if (q[1] > gr[kmax][1]) kmax = k; });
    curves = { x: L.map(l => 10 ** l), gr, nw, kmax };
  }
  function draw() {
    if (!curves) build();
    const { x, gr, nw, kmax } = curves, l = getL(), pc = NSEOS.pOfRho(EP, 10 ** l * FG), ec = NSEOS.epsOf(EP, pc);
    const [Rg, Mg] = NSEOS.star(EP, pc, true), [Rn, Mn] = NSEOS.star(EP, pc, false), u = 2 * Mg * NS.MSUN / Rg;
    P.begin().frame(T('densidade no centro (g/cm³)', 'central density (g/cm³)'), T('massa (M☉)', 'mass (M☉)'));
    P.clip();
    P.vline(NSI.RHO0, { color: 'rgba(158,140,255,.8)', label: 'ρ₀', y: P.B - 26 });
    P.line(x, nw.map(q => q[1]), { color: 'rgba(255,255,255,.75)', width: 2.4, dash: [8, 6] });
    P.line(x.slice(0, kmax + 1), gr.slice(0, kmax + 1).map(q => q[1]), { color: COL.ana, width: 3.4, glow: 12 });
    P.line(x.slice(kmax), gr.slice(kmax).map(q => q[1]), { color: COL.ana, width: 2, dash: [3, 5], alpha: 0.7 });
    P.vline(10 ** l, { color: 'rgba(255,255,255,.3)', dash: [4, 5], width: 1.2 });
    P.unclip();
    P.dot(x[kmax], gr[kmax][1], { color: COL.ana, r: 6, glow: 14 });
    P.text(x[kmax], gr[kmax][1] + 0.22, T(`M_máx = ${fmt(gr[kmax][1], 2)} M☉`, `M_max = ${fmt(gr[kmax][1], 2)} M☉`).replace('_máx', 'ₘₐₓ').replace('_max', 'ₘₐₓ'), { color: COL.ana, size: 16, align: 'center', base: 'bottom' });
    P.text(10 ** 15.45, 1.35, T('ramo instável', 'unstable branch'), { color: 'rgba(124,196,255,.8)', size: 14, align: 'center' });
    P.text(10 ** 14.93, 3.7, T('Newton: a massa não para de crescer', 'Newton: the mass keeps growing'), { color: COL.text, size: 15, align: 'right' });
    P.text(10 ** 14.48, 2.6, T('TOV (relatividade geral)', 'TOV (general relativity)'), { color: COL.ana, size: 15 });
    if (Mn <= 4) P.dot(10 ** l, Mn, { color: '#fff', r: 5, glow: 10 });
    P.dot(10 ** l, Mg, { color: '#fff', r: 6, glow: 14 });
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = '×' + fmt(v, 2); };
    set('tov-f1', 1 + pc / ec); set('tov-f2', 1 + 3 * pc / ec); set('tov-f3', 1 / (1 - u));
    out.innerHTML = `<span>TOV <b>${fmt(Mg, 2)} M☉</b>, <b>${fmt(Rg, 1)} km</b></span>
      <span>Newton <b>${fmt(Mn, 2)} M☉</b>, <b>${fmt(Rn, 1)} km</b></span>
      <span>${T('no centro', 'at the centre')} P/ρc² <b>${fmt(pc / ec, 3)}</b></span><span>2<i>GM</i>/<i>Rc</i>² <b>${fmt(u, 3)}</b></span>`;
  }
  onSlide(cv, draw);
})();

/* As equações de estado de Read et al. (2009): P(ρ) e a velocidade do som c_s²/c² = Γ P/(ε + P), cheias até a
   densidade central da estrela de massa máxima de cada uma (o ponto) e apagadas depois. Um botão realça uma. */
(() => {
  const cvP = document.getElementById('ns-eos-p'); if (!cvP) return;
  const cvC = document.getElementById('ns-eos-cs'), seg = document.getElementById('ns-eos-sel'), { EOS, FG } = NSEOS;
  seg.innerHTML = `<button type="button" data-v="" class="on">${T('todas', 'all')}</button>` + EOS.map(e => `<button type="button" data-v="${e.name}" style="color: ${e.col}">${e.name}</button>`).join('');
  const getSel = bindSeg('ns-eos-sel', () => draw());
  const X0 = 1e14, X1 = 3e15, xs = logspace(X0, X1, 160);
  const PP = new Plot(cvP, { x: [X0, X1], y: [1e32, 1e37], xlog: true, ylog: true, m: [14, 18, 56, 66], fs: 15, xticks: [1e14, 3e14, 1e15, 3e15], xfmt: v => sci(v, 0) });
  const PC = new Plot(cvC, { x: [X0, X1], y: [0, 1.15], xlog: true, m: [14, 18, 56, 56], fs: 15, xticks: [1e14, 3e14, 1e15, 3e15], xfmt: v => sci(v, 0), yticks: [0, 1 / 3, 2 / 3, 1], yfmt: v => ({ 0: '0', [1 / 3]: '1/3', [2 / 3]: '2/3', 1: '1' })[v] ?? fmt(v, 2) });
  let ready = false;
  function prep() { for (const e of EOS) { NSEOS.solve(e); const EP = NSEOS.makeEOS(e); e.rhoMax = NSEOS.toRho(NSEOS.rhoOf(EP, e.pcmax)); e.Pc = xs.map(r => NSEOS.toP(NSEOS.pOfRho(EP, r * FG))); e.cs = xs.map(r => NSEOS.cs2Of(EP, NSEOS.pOfRho(EP, r * FG))); } ready = true; }
  function curve(Pl, e, ys, on, dim) {
    const k = xs.findIndex(r => r > e.rhoMax), n = k < 0 ? xs.length : k;
    Pl.line(xs.slice(0, n + 1), ys.slice(0, n + 1), { color: e.col, width: on ? 4 : 2.4, alpha: dim ? 0.22 : 1, glow: on ? 12 : 0 });
    Pl.line(xs.slice(n), ys.slice(n), { color: e.col, width: 1.2, alpha: dim ? 0.1 : 0.3, dash: [3, 5] });
    if (n < xs.length) Pl.dot(e.rhoMax, ys[n], { color: e.col, r: on ? 6 : 4, glow: on ? 12 : 0 });
  }
  function bands(Pl, top) {
    const c = Pl.ctx; c.fillStyle = 'rgba(158,140,255,.08)'; c.fillRect(Pl.X(X0), Pl.T, Pl.X(NSI.RHO0 * 1.2) - Pl.X(X0), Pl.B - Pl.T);
    Pl.vline(NSI.RHO0, { color: 'rgba(158,140,255,.55)', label: 'ρ₀', y: top }); Pl.vline(2 * NSI.RHO0, { color: 'rgba(255,255,255,.3)', label: '2ρ₀', y: top }); Pl.vline(6 * NSI.RHO0, { color: 'rgba(255,255,255,.3)', label: '6ρ₀', y: top });
  }
  function draw() {
    if (!ready) prep();
    const sel = getSel();
    PP.begin(); bands(PP, PP.T + 4); PP.frame('ρ (g/cm³)', T('P (dyn/cm²)', 'P (dyn/cm²)')); PP.clip();
    PP.text(1.08e14, 3e36, T('laboratório', 'laboratory'), { color: 'rgba(190,178,255,.85)', size: 14 });
    PP.text(6.2e14, 3e36, T('extrapolação', 'extrapolation'), { color: COL.text3, size: 14 });
    for (const e of EOS) curve(PP, e, e.Pc, sel === e.name, sel && sel !== e.name);
    PP.unclip();
    PC.begin(); bands(PC, PC.T + 4); PC.frame('ρ (g/cm³)', T('c_s² / c²', 'c_s² / c²').replace('c_s²', 'cₛ²')); PC.clip();
    PC.hline(1, { color: 'rgba(255,122,138,.7)', dash: [], label: T('causalidade: c_s = c', 'causality: c_s = c').replace('c_s', 'cₛ'), align: 'left' });
    PC.hline(1 / 3, { color: 'rgba(255,255,255,.4)', label: T('1/3: matéria de quarks livres', '1/3: free quark matter'), align: 'left' });
    for (const e of EOS) curve(PC, e, e.cs, sel === e.name, sel && sel !== e.name);
    PC.unclip();
  }
  onSlide(cvP, draw);
})();

/* Curvas massa–raio, o último slide da Parte I: as sequências estáveis de NSEOS, os vínculos do NICER, de
   PSR J0348+0432 e de GW170817, e as retas de compacidade constante que a Parte II vai usar. */
(() => {
  const cv = document.getElementById('tov'); if (!cv) return;
  const out = document.getElementById('tov-out');
  const { MSUN, num, clip } = NS;
  const { EOS, solve } = NSEOS;
  /* Vínculos observacionais (intervalos de 68%; elipses assimétricas desenhadas por quadrante).
     NICER: J0030+0451 — Riley et al. 2019 (ApJL 887, L21) e Miller et al. 2019 (ApJL 887, L24);
     J0740+6620 — Riley et al. 2021 (ApJL 918, L27); J0437−4715 — Choudhury et al. 2024 (ApJL 971, L20).
     Faixa de 2 M☉: PSR J0348+0432, 2,01 ± 0,04 M☉ (Antoniadis et al. 2013, Science 340, 1233232).
     GW170817: R = 11,9 ± 1,4 km (90%) para as duas estrelas (LIGO/Virgo, Abbott et al. 2018, PRL 121,
     161101), desenhado em M = 1,36 M☉. */
  const OBS = [
    { n: 'J0030 · Riley+19', M: 1.34, mp: 0.15, mm: 0.16, R: 12.71, rp: 1.14, rm: 1.19, lab: [1, -1] },
    { n: 'J0030 · Miller+19', M: 1.44, mp: 0.15, mm: 0.14, R: 13.02, rp: 1.24, rm: 1.06, lab: [1, 1] },
    { n: 'J0740 · Riley+21', M: 2.072, mp: 0.067, mm: 0.067, R: 12.39, rp: 1.30, rm: 0.98, lab: [1, 1] },
    { n: 'J0437 · Choudhury+24', M: 1.418, mp: 0.037, mm: 0.037, R: 11.36, rp: 0.95, rm: 0.63, lab: [-1, -1] },
  ];
  const ell = (c, P, o) => {
    c.beginPath();
    for (let k = 0; k <= 72; k++) {
      const t = k / 72 * NS.TAU, ct = Math.cos(t), st = Math.sin(t);
      const x = P.X(o.R + (ct > 0 ? o.rp : o.rm) * ct), y = P.Y(o.M + (st > 0 ? o.mp : o.mm) * st);
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  };
  // retas de compacidade constante: R/R_S = k  ⇔  M = R/(2k GM☉/c²)
  const mOf = (R, k) => R / (2 * k * MSUN);

  const P = new Plot(cv, { x: [8, 16], y: [0, 2.6], m: [18, 18, 58, 70], fs: 16, xticks: [8, 9, 10, 11, 12, 13, 14, 15, 16], yticks: [0, 0.5, 1, 1.5, 2, 2.5], yfmt: v => String(v).replace('.', DEC) });
  let prog = 0, hover = null, dirty = true;

  function draw() {
    P.begin().frame(T('raio R (km)', 'radius R (km)'), T('massa M (M☉)', 'mass M (M☉)'));
    const c = P.ctx;
    P.clip();
    // faixa de 2 M☉
    c.fillStyle = 'rgba(158,140,255,.10)'; c.fillRect(P.L, P.Y(2.05), P.R - P.L, P.Y(1.97) - P.Y(2.05));
    P.text(15.92, 2.01, T('PSR J0348+0432 · 2,01 ± 0,04 M☉', 'PSR J0348+0432 · 2.01 ± 0.04 M☉'), { color: 'rgba(190,178,255,.85)', size: 13, align: 'right' });
    // cunha proibida pela causalidade: R < 2,9 GM/c² (= 1,45 R_S)
    c.beginPath(); c.moveTo(P.X(8), P.Y(mOf(8, 1.45))); c.lineTo(P.X(2.6 * 2 * 1.45 * MSUN), P.Y(2.6)); c.lineTo(P.X(8), P.Y(2.6)); c.closePath();
    c.fillStyle = 'rgba(255,122,138,.10)'; c.fill();
    c.save(); c.clip();
    c.strokeStyle = 'rgba(255,122,138,.16)'; c.lineWidth = 1;
    for (let x = P.L - 400; x < P.R; x += 12) { c.beginPath(); c.moveTo(x, P.B); c.lineTo(x + 400, P.T); c.stroke(); }
    c.restore();
    c.strokeStyle = 'rgba(255,122,138,.6)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(P.X(8), P.Y(mOf(8, 1.45))); c.lineTo(P.X(16), P.Y(mOf(16, 1.45))); c.stroke();
    P.text(8.12, 2.5, T('causalidade: R < 2,9 GM/c²', 'causality: R < 2.9 GM/c²'), { color: COL.warn, size: 14 });
    // compacidade constante
    [1.5, 1.76, 2, 3].forEach(k => {
      c.save(); c.strokeStyle = k === 1.76 ? 'rgba(86,225,208,.55)' : 'rgba(255,255,255,.28)'; c.lineWidth = 1.3; c.setLineDash(k === 1.76 ? [8, 5] : [5, 6]);
      c.beginPath(); c.moveTo(P.X(8), P.Y(mOf(8, k))); c.lineTo(P.X(16), P.Y(mOf(16, k))); c.stroke(); c.restore();
      // rótulo curto no começo da reta, logo abaixo dela (ali o quadro está vazio)
      const x = P.X(8.1), y = P.Y(mOf(8.1, k)), ang = Math.atan2(P.Y(mOf(9.1, k)) - y, P.X(9.1) - x), s = num(k, k === 1.76 ? 2 : k === 1.5 ? 1 : 0) + ' R';
      c.save(); c.translate(x, y); c.rotate(ang); c.font = `13px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = k === 1.76 ? COL.psr : COL.text2; c.fillText(s, 0, 4);
      const w = c.measureText(s).width; c.font = `10px ${FONT}`; c.fillText('S', w + 1, 11); c.restore();
    });
    // o que as retas querem dizer (canto de baixo, à esquerda, vazio)
    P.text(8.12, 0.36, T('R/Rₛ = 1,5: esfera de fótons', 'R/Rₛ = 1.5: photon sphere'), { color: COL.text2, size: 13 });
    P.text(8.12, 0.24, T('R/Rₛ = 1,76: superfície toda à vista', 'R/Rₛ = 1.76: whole surface visible'), { color: COL.psr, size: 13 });
    // GW170817: um raio (~1,4 M☉), desenhado como faixa em R junto do eixo
    {
      const y = P.Y(0.1), x0 = P.X(10.5), x1 = P.X(13.3);
      c.save(); c.strokeStyle = 'rgba(255,184,107,.75)'; c.lineWidth = 2; c.setLineDash([2, 4]);
      c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(x0, y - 7); c.lineTo(x0, y + 7); c.moveTo(x1, y - 7); c.lineTo(x1, y + 7); c.stroke();
      c.restore();
      P.text(10.4, 0.1, T('GW170817 · R de ~1,4 M☉ (90%)', 'GW170817 · R of ~1.4 M☉ (90%)'), { color: 'rgba(255,184,107,.9)', size: 13, align: 'right' });
    }
    // NICER
    OBS.forEach(o => {
      ell(c, P, o); c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(P.X(o.R), P.Y(o.M), 2.6, 0, NS.TAU); c.fill();
      const lx = o.R + o.lab[0] * (o.lab[0] > 0 ? o.rp : o.rm) * 0.72, ly = o.M + o.lab[1] * (o.lab[1] > 0 ? o.mp : o.mm) * 1.0;
      P.text(lx, ly, o.n, { color: 'rgba(238,240,246,.82)', size: 13, align: o.lab[0] > 0 ? 'left' : 'right', base: o.lab[1] > 0 ? 'bottom' : 'top' });
    });
    // as curvas, reveladas aos poucos quando o slide abre
    EOS.forEach((e, k) => {
      if (!e.R) return;
      const fr = clip((prog - 0.15 * k) / 0.9, 0, 1); if (fr <= 0) return;
      const n = Math.max(2, Math.round(fr * e.R.length)), xs = e.R.slice(0, n), ys = e.M.slice(0, n);
      const on = hover && hover.e === e, dim = hover && !on;
      P.line(xs, ys, { color: e.col, width: on ? 4.5 : 2.6, alpha: dim ? 0.3 : 1, glow: on ? 14 : 0 });
      if (fr < 1) return;
      P.dot(e.rmax, e.mmax, { color: e.col, r: on ? 5 : 3.5, glow: on ? 12 : 0 });
      // nome perto do topo (dentro do quadro) da curva
      let lx = e.rmax, ly = e.mmax;
      if (ly > 2.52) { for (let i = 0; i < e.M.length; i++) if (e.M[i] > 2.52) { lx = e.R[i]; ly = 2.52; break; } }
      const off = { WFF1: [-0.08, 0.04, 'right', 'bottom'], APR4: [-0.02, 0.07, 'center', 'bottom'], SLy: [-0.1, 0, 'right', 'middle'], ENG: [0.02, 0.07, 'center', 'bottom'], MPA1: [0, 0.07, 'center', 'bottom'], H4: [-0.1, 0, 'right', 'middle'], MS1: [0.12, 0, 'left', 'bottom'] }[e.name];
      P.text(lx + off[0], ly + off[1], e.name, { color: e.col, size: on ? 17 : 15, align: off[2], base: off[3] });
    });
    if (hover) {
      const e = hover.e, k = hover.k;
      P.dot(e.R[k], e.M[k], { color: '#fff', r: 6, glow: 16 });
    }
    P.unclip();
    if (hover) tip(c, hover.e, hover.k);
  }

  /* O ponto sob o mouse, visto com os olhos da Parte II (ray tracing): compacidade, desvio para o vermelho
     z = 1/√(1 − u) − 1 e a fração da superfície à vista, (1 − cos ψ_máx)/2, com ψ_máx da integral
     exata em α = 90° (a superfície toda, se ψ_máx ≥ π). */
  function tip(c, e, k) {
    const R = e.R[k], M = e.M[k], u = 2 * M * MSUN / R;
    const pm = NS.psiAt(Math.PI / 2, Math.min(u, 0.66)), vis = pm >= Math.PI ? 1 : (1 - Math.cos(pm)) / 2;
    const rows = [[`${num(M, 2)} M☉ · ${num(R, 1)} km`, e.col], [`R/Rₛ = ${num(1 / u, 2)}`, COL.text], [`z = ${num(1 / Math.sqrt(1 - u) - 1, 3)}`, COL.text],
      [T(`superfície à vista: ${NS.pct(vis)}`, `surface visible: ${NS.pct(vis)}`), vis >= 1 ? COL.psr : COL.text]];
    c.save(); c.font = `15px ${FONT}`;
    const wd = Math.max(...rows.map(r => c.measureText(r[0]).width)) + 24, ht = rows.length * 21 + 14;
    let x = P.X(R) + 16, y = P.Y(M) - ht - 10;
    if (x + wd > P.R) x = P.X(R) - 16 - wd;
    if (y < P.T) y = P.Y(M) + 12;
    c.fillStyle = 'rgba(10,12,20,.88)'; c.strokeStyle = e.col; c.lineWidth = 1.2;
    c.beginPath(); c.roundRect(x, y, wd, ht, 8); c.fill(); c.stroke();
    c.textAlign = 'left'; c.textBaseline = 'top';
    rows.forEach(([t, col], n) => { c.fillStyle = col; c.fillText(t, x + 12, y + 9 + 21 * n); });
    c.restore();
  }

  function readout() {
    if (!hover) {
      const ok = EOS.filter(e => e.R);
      if (!ok.length) { out.innerHTML = ''; return; }
      const r14 = ok.map(e => e.r14), mm = ok.map(e => e.mmax), cp = ok.map(e => e.r14 / (2 * 1.4 * MSUN));
      out.innerHTML = `<span>${T('equações de estado', 'equations of state')} <b>${ok.length}</b></span>
        <span>${T('R<sub>1,4</sub>', 'R<sub>1.4</sub>')} <b>${num(Math.min(...r14), 1)}–${num(Math.max(...r14), 1)} km</b></span>
        <span>M<sub>${T('máx', 'max')}</sub> <b>${num(Math.min(...mm), 2)}–${num(Math.max(...mm), 2)} M☉</b></span>
        <span>${T('em 1,4 M☉', 'at 1.4 M☉')}: R/R<sub>S</sub> <b>${num(Math.min(...cp), 2)}–${num(Math.max(...cp), 2)}</b></span>`;
      return;
    }
    // uma linha só (o gráfico não muda de altura); o resto do ponto vai na etiqueta junto dele
    const e = hover.e;
    out.innerHTML = `<span>EOS <b style="color:${e.col}">${e.name}</b></span>
      <span>M<sub>${T('máx', 'max')}</sub> <b>${num(e.mmax, 2)} M☉</b></span>
      <span>${T('R<sub>1,4</sub>', 'R<sub>1.4</sub>')} <b>${e.r14 ? num(e.r14, 1) + ' km' : '—'}</b></span>
      <span>${T('compacidade em 1,4 M☉', 'compactness at 1.4 M☉')} <b>${e.r14 ? num(e.r14 / (2 * 1.4 * MSUN), 2) + ' R<sub>S</sub>' : '—'}</b></span>`;
  }

  cv.addEventListener('pointermove', ev => {
    const [x, y] = canvasPoint(cv, ev);
    let best = null, bd = 18 * 18;
    EOS.forEach(e => {
      if (!e.R) return;
      for (let k = 0; k < e.R.length; k++) {
        const dx = P.X(e.R[k]) - x, dy = P.Y(e.M[k]) - y, d = dx * dx + dy * dy;
        if (d < bd && e.M[k] <= 2.6 && e.R[k] <= 16) { bd = d; best = { e, k }; }
      }
    });
    if ((best && hover && best.e === hover.e && best.k === hover.k) || (!best && !hover)) return;
    hover = best; readout(); dirty = true;
    if (!live()) draw();
  });
  cv.addEventListener('pointerleave', () => { if (hover) { hover = null; readout(); dirty = true; if (!live()) draw(); } });

  addEventListener('stagefit', () => { dirty = true; });
  const live = NS.anim(cv, (dt, still, skip) => {
    if (still) { EOS.forEach(solve); prog = 99; readout(); draw(); return; }
    const before = prog; prog += dt;
    // uma EOS por quadro (~25 ms cada), na hora em que a curva dela começa a aparecer
    const next = EOS.find(e => !e.R);
    if (next && (skip || prog >= 0.15 * EOS.indexOf(next))) { solve(next); readout(); dirty = true; }
    if (skip) return;
    const animating = EOS.some((e, k) => e.R && clip((before - 0.15 * k) / 0.9, 0, 1) < 1);
    if (animating || dirty) { draw(); dirty = false; }
  }, () => { prog = 0; dirty = true; });
})();

/* ===================================================================================
   Uma mancha quente numa estrela estática, vista de longe. Rotação lenta (1 volta em 4 s na tela,
   sem Doppler nem atrasos — isso é o slide seguinte). Mancha circular de raio angular θc com centro
   na colatitude i; observador a j do eixo; cos ψc(φ) = cos i cos j + sen i sen j cos φ.
   Três modos para a mesma geometria:
     sem gravidade  ψ = α; raio aparente R
     Beloborodov    1 − cos α = (1 − cos ψ)(1 − u)   (B02); raio aparente R/√(1 − u)
     integral exata a tabela; inclui a imagem secundária quando ψ_máx > π (R < 1,76 R_S)
   Curva de luz: o fluxo da calota inteira, F = ∫ cos α (d cos α/d cos ψ) dS, integrado em ψ com a
   largura em azimute da calota (NS.spotFlux); no modo exato soma a imagem secundária.
   Conferências: com i = j = 90° sem gravidade, PF = 1 (a mancha some meia volta); com i = 30°,
   j = 45°, θc = 20°, os PF de Beloborodov e da integral diferem 0,0001 em R = 6 R_S, 0,002 em
   2,42 R_S e 0,005 em 1,6 R_S; a área da imagem contada em pixels (900²) e o fluxo integrado batem a
   1% em todas as fases, com imagem secundária e cáustico (u = 0,6, i = j = 90°); a estrela inteira
   dá o mesmo fluxo nos três modos (∫ cos α d cos α = 1/2), também com as imagens secundárias.
   =================================================================================== */
(() => {
  const cvI = document.getElementById('spot-img'); if (!cvI) return;
  const cvL = document.getElementById('spot-lc'), out = document.getElementById('spot-out');
  const { PI, TAU, RAD, num, pct } = NS;
  const ROT = 4, NPH = 192, S = 380;
  const COLP = [255, 214, 150], COLS = [140, 246, 230];          // mancha: imagem primária, secundária
  let map = null, dirtyMap = true, curves = null, t = 0;
  const gMode = bindSeg('spot-mode', () => { dirtyMap = true; update(); });
  const gR = bindRange('spot-R', v => num(v, 2), () => { dirtyMap = true; update(); });
  const gI = bindRange('spot-i', v => v + '°', () => update());
  const gJ = bindRange('spot-j', v => v + '°', () => { dirtyMap = true; update(); });
  const gTh = bindRange('spot-th', v => v + '°', () => update());
  const U = () => 1 / gR();
  const MODES = ['flat', 'belo', 'exact'];
  const NAME = { flat: T('sem gravidade', 'no gravity'), belo: 'Beloborodov', exact: T('integral exata', 'exact integral') };
  const STYLE = { flat: [7, 6], belo: [2, 5], exact: null };

  function lightCurves() {
    const u = U(), tab = NS.table(u), i = gI() * RAD, j = gJ() * RAD, rho = gTh() * RAD, o = [0, 0];
    const res = {};
    MODES.forEach(mode => {
      const G = NS.gTable(mode, u, tab), f = new Float64Array(NPH), fs = new Float64Array(NPH);
      for (let p = 0; p <= NPH / 2; p++) {               // ψc(φ) = ψc(−φ): metade da volta basta
        const cp = Math.cos(i) * Math.cos(j) + Math.sin(i) * Math.sin(j) * Math.cos(TAU * p / NPH);
        NS.spotFlux(G, Math.acos(NS.clip(cp, -1, 1)), rho, o);
        f[p] = f[(NPH - p) % NPH] = o[0]; fs[p] = fs[(NPH - p) % NPH] = o[1];
      }
      const st = NS.stats(f);
      let hid = 0, sec = 0;
      for (let p = 0; p < NPH; p++) { if (f[p] - fs[p] <= 1e-9) hid++; if (fs[p] > 1e-9) sec++; }
      res[mode] = { f, fs, st, hid: hid / NPH, sec: sec / NPH };
    });
    res.tab = tab;
    return res;
  }

  const PL = NS.lcPlot(cvL);
  function drawCurve(phi) {
    const mode = gMode(), cur = curves[mode];
    let top = 0; MODES.forEach(m => { top = Math.max(top, curves[m].st.mx / curves[m].st.mean); });
    const ymax = Math.max(1.5, Math.ceil(top * 1.1 * 2) / 2);
    PL.set('y', [0, ymax]).set('yticks', Plot.ticks(0, ymax, false)).begin().frame(T('fase de rotação (voltas)', 'rotation phase (cycles)'), T('fluxo / média', 'flux / mean'));
    const xs = Array.from({ length: 2 * NPH + 1 }, (_, k) => k / NPH), ys = (f, m) => xs.map((_, k) => f[k % NPH] / m);
    PL.clip();
    MODES.filter(m => m !== mode).forEach(m => PL.line(xs, ys(curves[m].f, curves[m].st.mean), { color: 'rgba(200,206,220,.6)', width: 2, dash: STYLE[m] }));
    if (mode === 'exact' && cur.sec > 0) PL.area(xs, ys(cur.fs, cur.st.mean), 0, { color: COL.psr, alpha: 0.28 });
    PL.area(xs, ys(cur.f, cur.st.mean), 0, { color: COL.psr, alpha: 0.07 });
    PL.line(xs, ys(cur.f, cur.st.mean), { color: COL.psr, width: 3.5, glow: 12 });
    PL.unclip();
    const x = (phi / TAU) % 2, k = Math.floor(x * NPH) % NPH, fr = x * NPH - Math.floor(x * NPH);
    const y = (cur.f[k] * (1 - fr) + cur.f[(k + 1) % NPH] * fr) / cur.st.mean;
    PL.vline(x, { color: 'rgba(255,255,255,.35)', dash: [3, 5], width: 1.2 });
    PL.dot(x, y, { color: '#fff', r: 6, glow: 16 });
    const items = [mode, ...MODES.filter(m => m !== mode)].map(m => [NAME[m], 'PF = ' + num(curves[m].st.pf, 2), m === mode ? COL.psr : 'rgba(200,206,220,.75)', STYLE[m], m === mode]);
    if (mode === 'exact' && cur.sec > 0) items.push([T('imagem secundária', 'secondary image'), '', 'rgba(86,225,208,.55)', null, false]);
    NS.legend(PL.ctx, PL.L + 4, 20, items);
  }

  function drawImage(phi) {
    const mode = gMode(), u = U();
    if (dirtyMap) { map = NS.globeMap(map, S, mode, u, curves.tab, gJ() * RAD); dirtyMap = false; }
    const i = gI() * RAD, rho = gTh() * RAD;
    NS.paint(map, NS.lutIdx(phi), [NS.spotDesc(i, 0, rho, COLP, COLS)]);
    const { ctx: c, w, h } = fitCanvas(cvI);
    const Rp = Math.min(w / 2 - 10, h / 2 - 30) / 1.6, cx = w / 2, cy = h / 2 + 2;
    const { Ra } = NS.drawGlobe(c, map, cx, cy, Rp);
    // o outro tamanho, na mesma escala: R (sem gravidade) ou R/√(1 − u) (com)
    const Ro = (mode === 'flat' ? 1 / Math.sqrt(1 - u) : 1) * Rp;
    c.save(); c.strokeStyle = 'rgba(255,255,255,.32)'; c.lineWidth = 1.3; c.setLineDash([5, 6]); c.beginPath(); c.arc(cx, cy, Ro, 0, TAU); c.stroke(); c.setLineDash([]);
    const a = 0.62, Rm = Math.max(Ro, Ra) + 12, lx = cx + Rm * Math.cos(a), ly = cy + Rm * Math.sin(a) + 4;
    c.lineWidth = 1; c.beginPath(); c.moveTo(cx + Ro * Math.cos(a), cy + Ro * Math.sin(a)); c.lineTo(lx - 2, ly - 2); c.stroke();
    c.font = `14px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(mode === 'flat' ? T(`com RG: ${num(1 / Math.sqrt(1 - u), 2)} R`, `with GR: ${num(1 / Math.sqrt(1 - u), 2)} R`) : T('sem gravidade: R', 'no gravity: R'), lx + 2, ly);
    // estado da mancha agora
    const cps = Math.cos(i) * Math.cos(gJ() * RAD) + Math.sin(i) * Math.sin(gJ() * RAD) * Math.cos(phi), psic = Math.acos(NS.clip(cps, -1, 1));
    const pmax = mode === 'flat' ? PI / 2 : mode === 'belo' ? (u < 0.5 ? Math.acos(-u / (1 - u)) : PI) : curves.tab.psiMax;
    let msg = null, col = COL.text3;
    if (mode === 'exact' && psic + rho > TAU - pmax) { msg = T('● imagem secundária à vista (do outro lado)', '● secondary image in view (opposite limb)'); col = COL.psr; }
    else if (psic - rho > pmax) msg = T('● atrás da estrela: escondida', '● behind the star: hidden');
    else if (mode !== 'flat' && psic > PI / 2) { msg = T('● atrás do limbo geométrico — e visível', '● behind the geometric limb — and visible'); col = COL.sol; }
    c.font = `600 15px ${FONT}`; c.textBaseline = 'top'; c.textAlign = 'left';
    if (msg) { c.fillStyle = col; c.fillText(msg, 4, 4); }
    if (map.bRing) { c.fillStyle = COL.warn; c.font = `14px ${FONT}`; c.fillText(T('anel: Beloborodov sem solução (u > 1/2)', 'ring: no Beloborodov solution (u > 1/2)'), 4, 24); }
    c.font = `14px ${FONT}`; c.fillStyle = COL.text3; c.textBaseline = 'bottom';
    c.fillText(T('estrela estática · 1 volta em 4 s', 'static star · 1 turn per 4 s'), 4, h - 20); c.fillText(T('tamanhos em unidades de R', 'sizes in units of R'), 4, h - 2);
    c.restore();
  }

  function update() {
    curves = lightCurves();
    const mode = gMode(), u = U(), tab = curves.tab, cur = curves[mode];
    const pmax = mode === 'flat' ? PI / 2 : mode === 'belo' ? (u < 0.5 ? Math.acos(-u / (1 - u)) : PI) : tab.psiMax;
    const vis = pmax >= PI ? 1 : (1 - Math.cos(pmax)) / 2;
    // classes de uma mancha pontual (PB06, seção 3.2 e fig. 5), pelo centro: A sempre visível; B some parte da
    // volta; C nunca aparece. A mancha finita pode continuar à vista em parte (cur.hid conta a inteira)
    const i = gI() * RAD, j = gJ() * RAD;
    let hc = 0; for (let p = 0; p < NPH; p++) if (Math.acos(NS.clip(Math.cos(i) * Math.cos(j) + Math.sin(i) * Math.sin(j) * Math.cos(TAU * p / NPH), -1, 1)) > pmax) hc++;
    hc /= NPH;
    const cls = hc <= 0 ? T('A · sempre à vista', 'A · always visible') : hc >= 1 ? T('C · nunca à vista', 'C · never visible')
      : T(`B · o centro some ${pct(hc)} da volta`, `B · centre hidden ${pct(hc)} of the turn`) + (cur.hid <= 0 ? T(' (a borda fica)', ' (the rim stays)') : '');
    const sec = mode !== 'exact' ? (mode === 'flat' ? T('não há', 'none') : T('a aproximação não tem', 'not in the approximation'))
      : cur.sec > 0 ? T(`sim, ${pct(cur.sec)} da volta`, `yes, ${pct(cur.sec)} of the turn`) : tab.psiMax > PI ? T('não nesta geometria', 'not for this geometry') : T('não (exige R < 1,76 R_S)', 'no (needs R < 1.76 R_S)').replace('R_S', 'R<sub>S</sub>');
    out.innerHTML = `<span>PF ${T('sem gravidade', 'no gravity')} <b>${num(curves.flat.st.pf, 3)}</b></span>
      <span>PF Beloborodov <b>${num(curves.belo.st.pf, 3)}</b></span>
      <span>PF ${T('exata', 'exact')} <b>${num(curves.exact.st.pf, 3)}</b></span>
      <span>${T('superfície à vista', 'surface visible')} <b>${pct(vis)}</b></span>
      <span>ψ<sub>${T('máx', 'max')}</sub> <b>${num(pmax / RAD, 1)}°</b></span>
      <span>${T('classe', 'class')} <b>${cls}</b></span>
      <span>${T('imagem secundária', 'secondary image')} <b>${sec}</b></span>`;
    if (!live()) render();
  }
  function render() { const phi = TAU * t / ROT; drawImage(phi); drawCurve(phi); }
  curves = lightCurves();
  const live = NS.anim(cvI, (dt, still, skip) => { if (still) t = 0.42 * ROT; else t += dt; if (!skip) render(); }, () => { t = 0; });
  update();
})();

/* ===================================================================================
   Duas manchas nos polos magnéticos, com a integral exata numa estrela fixa: 1,4 M☉ e 10 km,
   R = 2,42 R_S (u = 0,4135, ψ_máx = 131,9°: 83% da superfície à vista, sem imagem secundária).
   Manchas de raio 12°; a primeira na colatitude i, a segunda no antípoda ou deslocada dele por um
   ângulo δ ao longo do grande círculo que sai do antípoda para leste (separação 180° − δ).
   Classes de Beloborodov (B02; PB06, seção 3.2) para manchas antípodas pontuais, com
   μ_mín = cos(i + j), μ_máx = cos(i − j) e κ = |cos ψ_máx|:
     I   μ_mín > κ             só a primária, sempre
     II  −κ < μ_mín < κ < μ_máx a primária sempre; a antípoda às vezes
     III μ_mín < −κ            a primária some parte da volta; então só a antípoda aparece
     IV  μ_máx < κ             as duas sempre — na aproximação de Beloborodov o fluxo total é
                               constante, F₁ + F₂ = 2u(1 − u): um platô sem pulso
   Com as duas à vista, cos α₁ + cos α₂ = 2u na aproximação: é daí o platô (em II e III, só na
   parte da volta em que as duas aparecem). Com a integral exata e manchas finitas sobra um resto.
   =================================================================================== */
(() => {
  const cvI = document.getElementById('two-img'); if (!cvI) return;
  const cvL = document.getElementById('two-lc'), out = document.getElementById('two-out');
  const { PI, TAU, RAD, num, pct, clip } = NS;
  const ROT = 4, NPH = 192, S = 360, RHO = 12 * RAD;
  const U = 2 * 1.4 * NS.MSUN / 10, tab = NS.table(U), G = NS.gTable('exact', U, tab);
  const C1 = [255, 206, 140], C2 = [255, 150, 180];
  // F(ψc) tabelado uma vez (u e ρ fixos): as curvas saem por interpolação
  const NF = 720, FT = new Float64Array(NF + 1);
  { const o = [0, 0]; for (let k = 0; k <= NF; k++) FT[k] = NS.spotFlux(G, k / NF * PI, RHO, o)[0]; }
  const flux = cp => NS.at(FT, Math.acos(clip(cp, -1, 1)) / PI * NF);
  let map = null, dirtyMap = true, cur = null, t = 0;
  const gGeom = bindSeg('two-geom', () => {
    // “deslocadas” com o slider em zero não mostraria nada: começa em 30°
    if (gGeom() === 'off' && +offEl.value === 0) { offEl.value = 30; offEl.dispatchEvent(new Event('input')); return; }
    update();
  });
  const offEl = document.getElementById('two-off');
  const gI = bindRange('two-i', v => v + '°', () => update());
  const gJ = bindRange('two-j', v => v + '°', () => { dirtyMap = true; update(); });
  const gOff = bindRange('two-off', v => v + '°', () => {
    // mexer no deslocamento passa para o modo “deslocadas”
    if (gGeom() !== 'off' && gOff() > 0) { document.querySelector('#two-geom button[data-v="off"]').click(); return; }
    update();
  });
  const offset = () => (gGeom() === 'off' ? gOff() * RAD : 0);

  // centros das duas manchas (no referencial da estrela, fase 0)
  function centers() {
    const i = gI() * RAD, c1 = [Math.sin(i), 0, Math.cos(i)], a = [-c1[0], -c1[1], -c1[2]], d = offset();
    let e = [-a[1], a[0], 0]; const en = Math.hypot(e[0], e[1]);   // leste no antípoda: ẑ × â
    e = en > 1e-9 ? [e[0] / en, e[1] / en, 0] : [0, 1, 0];
    const c2 = [Math.cos(d) * a[0] + Math.sin(d) * e[0], Math.cos(d) * a[1] + Math.sin(d) * e[1], Math.cos(d) * a[2] + Math.sin(d) * e[2]];
    const sph = c => [Math.acos(clip(c[2], -1, 1)), Math.atan2(c[1], c[0])];
    return [sph(c1), sph(c2)];
  }
  function lightCurves() {
    const j = gJ() * RAD, cj = Math.cos(j), sj = Math.sin(j), cs = centers();
    const f1 = new Float64Array(NPH), f2 = new Float64Array(NPH), ft = new Float64Array(NPH);
    for (let p = 0; p < NPH; p++) {
      const ph = TAU * p / NPH;
      const [[t1, l1], [t2, l2]] = cs;
      f1[p] = flux(Math.cos(t1) * cj + Math.sin(t1) * sj * Math.cos(ph + l1));
      f2[p] = flux(Math.cos(t2) * cj + Math.sin(t2) * sj * Math.cos(ph + l2));
      ft[p] = f1[p] + f2[p];
    }
    const st = NS.stats(ft);
    let both = 0, v1 = 0, v2 = 0;
    for (let p = 0; p < NPH; p++) { const a = f1[p] > 1e-9, b = f2[p] > 1e-9; if (a) v1++; if (b) v2++; if (a && b) both++; }
    return { f1, f2, ft, st, cs, v1: v1 / NPH, v2: v2 / NPH, both: both / NPH };
  }
  // classe B02 para manchas antípodas pontuais (com ψ_máx exato)
  function b02class() {
    const i = gI() * RAD, j = gJ() * RAD, k = Math.abs(Math.cos(tab.psiMax)), mn = Math.cos(i + j), mx = Math.cos(i - j);
    if (mn > k) return ['I', T('só a primária, sempre', 'only the primary, always')];
    if (mx < k) return ['IV', T('as duas sempre: platô', 'both always: plateau')];
    if (mn < -k) return ['III', T('uma de cada vez em parte da volta', 'one at a time for part of the turn')];
    return ['II', T('primária sempre; antípoda às vezes', 'primary always; antipodal sometimes')];
  }

  const PL = NS.lcPlot(cvL);
  function drawCurve(phi) {
    const m = cur.st.mean, ymax = Math.max(1.5, Math.ceil(cur.st.mx / m * 1.1 * 2) / 2);
    PL.set('y', [0, ymax]).set('yticks', Plot.ticks(0, ymax, false)).begin().frame(T('fase de rotação (voltas)', 'rotation phase (cycles)'), T('fluxo / média', 'flux / mean'));
    const xs = Array.from({ length: 2 * NPH + 1 }, (_, k) => k / NPH), ys = f => xs.map((_, k) => f[k % NPH] / m), c = PL.ctx;
    PL.clip();
    // faixas onde as duas manchas estão à vista (o platô)
    c.fillStyle = 'rgba(86,225,208,.07)';
    for (let k = 0; k < 2 * NPH; k++) if (cur.f1[k % NPH] > 1e-9 && cur.f2[k % NPH] > 1e-9) c.fillRect(PL.X(k / NPH), PL.T, PL.X((k + 1) / NPH) - PL.X(k / NPH) + 0.5, PL.B - PL.T);
    PL.line(xs, ys(cur.f1), { color: COL.sol, width: 2 });
    PL.line(xs, ys(cur.f2), { color: COL.neb, width: 2 });
    PL.area(xs, ys(cur.ft), 0, { color: COL.psr, alpha: 0.06 });
    PL.line(xs, ys(cur.ft), { color: COL.psr, width: 3.5, glow: 12 });
    PL.unclip();
    const x = (phi / TAU) % 2, k = Math.floor(x * NPH) % NPH, fr = x * NPH - Math.floor(x * NPH);
    PL.vline(x, { color: 'rgba(255,255,255,.35)', dash: [3, 5], width: 1.2 });
    PL.dot(x, (cur.ft[k] * (1 - fr) + cur.ft[(k + 1) % NPH] * fr) / m, { color: '#fff', r: 6, glow: 16 });
    NS.legend(c, PL.L + 4, 20, [[T('total', 'total'), 'PF = ' + num(cur.st.pf, 2), COL.psr, null, true], [T('mancha 1', 'spot 1'), '', COL.sol, null, false], [T('mancha 2', 'spot 2'), '', COL.neb, null, false], [T('as duas à vista', 'both in view'), '', 'rgba(86,225,208,.35)', null, false]]);
  }
  function drawImage(phi) {
    if (dirtyMap) { map = NS.globeMap(map, S, 'exact', U, tab, gJ() * RAD); dirtyMap = false; }
    const [[t1, l1], [t2, l2]] = cur.cs;
    NS.paint(map, NS.lutIdx(phi), [NS.spotDesc(t1, l1, RHO, C1), NS.spotDesc(t2, l2, RHO, C2)]);
    const { ctx: c, w, h } = fitCanvas(cvI);
    const Rp = Math.min(w / 2 - 10, h / 2 - 34) / 1.36, cx = w / 2, cy = h / 2 + 2;
    NS.drawGlobe(c, map, cx, cy, Rp);
    c.save(); c.font = `600 15px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillStyle = COL.sol; c.fillText(T('● mancha 1', '● spot 1'), 4, 4);
    c.fillStyle = COL.neb; c.fillText(T('● mancha 2', '● spot 2'), 4, 26);
    c.font = `14px ${FONT}`; c.fillStyle = COL.text3; c.textBaseline = 'bottom';
    c.fillText(T('1,4 M☉ · 10 km · R = 2,42 R', '1.4 M☉ · 10 km · R = 2.42 R') + 'ₛ', 4, h - 20);
    c.fillText(T('integral exata · 1 volta em 4 s', 'exact integral · 1 turn per 4 s'), 4, h - 2);
    c.restore();
  }
  function update() {
    cur = lightCurves();
    const d = offset(), sep = ((cur.cs[1][1] - cur.cs[0][1]) / TAU % 1 + 1) % 1;
    const vis = v => (v >= 1 ? T('sempre', 'always') : v <= 0 ? T('nunca', 'never') : pct(v) + T(' da volta', ' of the turn'));
    const head = d === 0 ? (([c, s]) => `<span>${T('classe', 'class')} <b>${c}</b> · ${s}</span>`)(b02class())
      : `<span>${T('dipolo deslocado', 'offset dipole')} <b>${num(180 - d / RAD, 0)}°</b> ${T('entre as manchas', 'apart')}</span>`;
    out.innerHTML = `${head}
      <span>PF <b>${num(cur.st.pf, 3)}</b></span>
      <span>${T('mancha 1 à vista', 'spot 1 in view')} <b>${vis(cur.v1)}</b></span>
      <span>${T('mancha 2 à vista', 'spot 2 in view')} <b>${vis(cur.v2)}</b></span>
      <span>${T('as duas', 'both')} <b>${pct(cur.both)}</b></span>
      <span>${T('pulsos separados por', 'pulses separated by')} <b>${num(sep, 2)} ${T('volta', 'cycle')}</b></span>
      <span>ψ<sub>${T('máx', 'max')}</sub> <b>${num(tab.psiMax / RAD, 1)}°</b></span>`;
    if (!live()) render();
  }
  function render() { const phi = TAU * t / ROT; drawImage(phi); drawCurve(phi); }
  cur = lightCurves();
  const live = NS.anim(cvI, (dt, still, skip) => { if (still) t = 0.3 * ROT; else t += dt; if (!skip) render(); }, () => { t = 0; });
  update();
})();

/* ===================================================================================
   A mesma mancha numa estrela que gira rápido — a aproximação “Schwarzschild + Doppler” de
   Poutanen & Gierliński (2003, MNRAS 343, 1301) e Poutanen & Beloborodov (2006, PB06): o desvio da
   luz é o da estrela estática; a rotação entra pela relatividade especial no referencial que gira
   com a superfície. Estrela de 1,4 M☉ e 12 km (u = 0,3445, R = 2,90 R_S, ψ_máx = 120,6°: sem imagem
   secundária); mancha de 15° na colatitude i = 45°; observador a j = 60° do eixo. Com isso a mancha
   nunca some (ψc + θc ≤ 120° < ψ_máx; classe A de PB06): parada, a curva é uma senoide pura
   (a₂/a₁ = 0,002), e todo harmônico que aparecer vem da rotação. Com i = 60°, j = 75° a mancha seria
   eclipsada e PF ficaria preso em 1. Conferência com a fig. 2 de PB06 (i = θ = 45°, R = 2,5 R_S,
   600 Hz): PF parado 0,425 (B02: U/Q = 0,429); o Doppler adianta o pico em 0,13 volta e os
   atrasos o atrasam em 0,003.
     velocidade:  β = β_eq sen θ,  β_eq = 2πRf/(c√(1 − u))            (PB06, seção 2)
     Doppler:     δ = 1/[γ(1 − β cos ξ)], ξ = ângulo entre a velocidade e o fóton emitido
                  β cos ξ = −β_eq sen j · (sen α/sen ψ) · n_y          (PB06, seção 2)
     aberração:   cos α′ = δ cos α  (α′: ângulo de emissão no referencial da mancha)
     fluxo bolométrico:  dF = (1 − u) δ⁵ I′(α′) cos α (d cos α/d cos ψ) dS′   (PB06, seção 2 e apêndice A2)
       — δ⁴ da intensidade (I/ν⁴ invariante) e mais um δ da área aparente (contração do tempo de
       chegada); por energia, num espectro plano, seria δ⁴. dS′ = γ R² d cos θ dφ é a área no
       referencial que gira.
     atrasos:     o fóton chega Δt(α) depois do radial (a integral exata, NS.delayAt); a fase
                  observada é φ_obs = φ + 2πfΔt. Só se troca o rótulo da fase: a compressão dos
                  tempos de chegada já está num dos δ (PB06, seção 2).
   Feixe da atmosfera no referencial da mancha, I′(μ′) com μ′ = cos α′ (normalizado em μ′ = 1):
     corpo negro: isotrópico; atmosfera de H: escurecimento de limbo de espalhamento Thomson,
     I′ ∝ 1 + 2,06μ′ (Chandrasekhar 1960 — a forma usual para atmosferas de H nos ajustes de pulsos);
     feixe em lápis: I′ ∝ μ′² (esquemático, para o feixe estreito de uma atmosfera magnetizada).
   Na imagem, cada pixel mostra a intensidade bolométrica δ⁴ I′(μ′) e a cor muda com δ (azul quando
   se aproxima). Um resultado limpo: com o momento angular do fóton conservado, β cos ξ só depende da
   coordenada horizontal do pixel, β cos ξ = −β_eq sen j · X/b_máx, com ou sem curvatura.
   =================================================================================== */
(() => {
  const cvI = document.getElementById('spin-img'); if (!cvI) return;
  const cvL = document.getElementById('spin-lc'), out = document.getElementById('spin-out');
  const { PI, TAU, RAD, num, clip } = NS;
  const MASS = 1.4, RKM = 12, U = 2 * MASS * NS.MSUN / RKM, RC = RKM / NS.CKMS;   // R/c em s
  const I0 = 45 * RAD, J0 = 60 * RAD, RHO = 15 * RAD, ROT = 4, NPH = 256, S = 360, NSMP = 300;
  const tab = NS.table(U, true);
  const BEAM = { bb: () => 1, h: m => (1 + 2.06 * m) / 3.06, pencil: m => m * m };
  const gF = bindRange('spin-f', v => fmtF(10 ** v), () => { dirtyPix = true; update(); });
  const gB = bindSeg('spin-beam', () => { dirtyPix = true; dirty0 = true; update(); });
  function fmtF(f) { return (f < 10 ? num(f, 1) : num(f, 0)) + ' Hz'; }
  const F = () => 10 ** gF();

  // tabela uniforme em ψ ∈ [0, ψ_máx]: cos α, sen α, D = cos α · d cos α/d cos ψ e o atraso (R/c)
  const NU = 1024, PM = tab.psiMax, TCA = new Float64Array(NU + 1), TSA = new Float64Array(NU + 1), TD = new Float64Array(NU + 1), TDT = new Float64Array(NU + 1);
  for (let k = 0; k <= NU; k++) {
    const p = k / NU * PM, x = NS.invert(tab, p), al = NS.at(tab.al, x), sp = Math.sin(p);
    TCA[k] = Math.cos(al); TSA[k] = Math.sin(al); TDT[k] = NS.at(tab.dt, x);
    TD[k] = sp > 1e-3 ? NS.at(tab.H, x) / sp : 1 - U;           // H/sen ψ; em ψ → 0 o limite (1 − u)
  }
  // a mancha: pontos de mesma área (espiral de Fibonacci) numa calota, girada para a colatitude I0
  const SX = new Float64Array(NSMP), SY = new Float64Array(NSMP), SZ = new Float64Array(NSMP);
  {
    const c0 = Math.cos(RHO), ga = PI * (3 - Math.sqrt(5)), ci = Math.cos(I0), si = Math.sin(I0);
    for (let k = 0; k < NSMP; k++) {
      const ct = 1 - (1 - c0) * (k + 0.5) / NSMP, st = Math.sqrt(1 - ct * ct), x = st * Math.cos(k * ga), y = st * Math.sin(k * ga);
      SX[k] = x * ci + ct * si; SY[k] = y; SZ[k] = -x * si + ct * ci;
    }
  }
  /* Curva de luz na fase observada: para cada ponto da mancha e cada fase de emissão φ, o fluxo
     (δ⁵ etc.) e a fase de chegada φ + 2πfΔt; depois cada ponto é reamostrado numa grade uniforme
     de fase observada (interpolação, sem jacobiano) e somado. */
  const PHO = new Float64Array(NPH), VAL = new Float64Array(NPH), CP = new Float64Array(NPH), SP = new Float64Array(NPH);
  for (let p = 0; p < NPH; p++) { CP[p] = Math.cos(TAU * p / NPH); SP[p] = Math.sin(TAU * p / NPH); }
  function curve(f, beam) {
    const I = BEAM[beam], beq = TAU * RKM * f / (NS.CKMS * Math.sqrt(1 - U)), sj = Math.sin(J0), cj = Math.cos(J0);
    const sh = NPH * f * RC;                                   // atraso (em R/c) → passos de fase
    const tot = new Float64Array(NPH);
    let dmax = 0, dmin = Infinity;
    for (let k = 0; k < NSMP; k++) {
      const x0 = SX[k], y0 = SY[k], z0 = SZ[k];
      for (let p = 0; p < NPH; p++) {
        const nx = CP[p] * x0 - SP[p] * y0, ny = SP[p] * x0 + CP[p] * y0, cps = nx * sj + z0 * cj, psi = Math.acos(clip(cps, -1, 1));
        if (psi >= PM) { VAL[p] = 0; PHO[p] = p + sh * TDT[NU]; continue; }
        const x = psi / PM * NU, m = Math.min(NU - 1, x | 0), t = x - m;
        const ca = TCA[m] + t * (TCA[m + 1] - TCA[m]), sa = TSA[m] + t * (TSA[m + 1] - TSA[m]);
        const D = TD[m] + t * (TD[m + 1] - TD[m]), dt = TDT[m] + t * (TDT[m + 1] - TDT[m]);
        const sps = Math.sqrt(Math.max(0, 1 - cps * cps)), b2 = beq * beq * (nx * nx + ny * ny), g = 1 / Math.sqrt(1 - b2);
        const bcx = sps > 1e-9 ? -beq * sj * sa * ny / sps : 0;  // β cos ξ
        const d = 1 / (g * (1 - bcx)), d2 = d * d;
        VAL[p] = g * d2 * d2 * d * I(d * ca) * D;               // γ δ⁵ I′(δ cos α) cos α dcosα/dcosψ
        PHO[p] = p + sh * dt;
        if (d > dmax) dmax = d; if (d < dmin) dmin = d;
      }
      // reamostragem: PHO cresce com p (o atraso varia devagar); fases fora de [0, NPH) dão a volta
      let q = -NPH;                                            // índice de emissão estendido
      const pho = qq => { const r = ((qq % NPH) + NPH) % NPH; return qq - r + PHO[r]; };
      const val = qq => VAL[((qq % NPH) + NPH) % NPH];
      q = -Math.ceil(sh * TDT[NU]) - 2;
      for (let o = 0; o < NPH; o++) {
        while (pho(q + 1) <= o) q++;
        const a = pho(q), b = pho(q + 1), w = b > a ? (o - a) / (b - a) : 0;
        tot[o] += val(q) + w * (val(q + 1) - val(q));
      }
    }
    return { f: tot, st: NS.stats(tot), dmax, dmin, beq };
  }

  // imagem: mapa exato fixo (u e j fixos), com o atraso e o Doppler de cada pixel
  const map = NS.globeMap(null, S, 'exact', U, tab, J0), n = S * S;
  const DT = new Float32Array(n), LONE = new Int32Array(n), PR = new Uint8ClampedArray(n), PG = new Uint8ClampedArray(n), PB = new Uint8ClampedArray(n);
  const TR = new Float32Array(n), TG = new Float32Array(n), TB = new Float32Array(n);
  for (let p = 0; p < n; p++) if (map.ORD[p] >= 0) DT[p] = NS.at(tab.dtQ, map.Q[p] * (tab.NQ - 1)) * RC;
  let dirtyPix = true, dirty0 = true, c0 = null, cf = null, t = 0;
  function pixels() {
    const f = F(), I = BEAM[gB()], beq = TAU * RKM * f / (NS.CKMS * Math.sqrt(1 - U)), sj = Math.sin(J0), k = f * NS.LUTN;
    for (let p = 0; p < n; p++) {
      if (map.ORD[p] < 0) continue;
      // emissão no instante t − Δt: o ponto visto no pixel girou 2πfΔt a menos
      LONE[p] = map.LON[p] + Math.round(k * DT[p]);
      const nr = map.NR[p], d = Math.sqrt(1 - beq * beq * nr * nr) / (1 + beq * sj * map.QX[p]), d2 = d * d;
      const Ib = d2 * d2 * I(d * map.SH[p]);                    // δ⁴ I′(μ′), em unidades do centro parado
      const s = clip((d - 1) / 0.2, -1, 1), lum = clip(0.3 + 0.6 * Math.pow(Ib, 0.7), 0.15, 1), a = Math.abs(s);
      // branco quente (255, 232, 196) → azul (170, 208, 255) quando se aproxima, → laranja (255, 140, 90) quando se afasta
      if (s > 0) { PR[p] = (255 - 85 * a) * lum; PG[p] = (232 - 24 * a) * lum; PB[p] = (196 + 59 * a) * lum; }
      else { PR[p] = 255 * lum; PG[p] = (232 - 92 * a) * lum; PB[p] = (196 - 106 * a) * lum; }
      // a superfície fria também leva o tom do Doppler
      TR[p] = 30 + 34 * Math.max(0, -s) - 6 * Math.max(0, s); TG[p] = 38 + 6 * Math.max(0, s); TB[p] = 58 + 44 * Math.max(0, s) - 14 * Math.max(0, -s);
    }
    dirtyPix = false;
  }

  const PL = NS.lcPlot(cvL);
  function drawCurve(phi) {
    const m = c0.st.mean, top = Math.max(cf.st.mx, c0.st.mx) / m, ymax = Math.max(1.5, Math.ceil(top * 1.1 * 2) / 2);
    PL.set('y', [0, ymax]).set('yticks', Plot.ticks(0, ymax, false)).begin().frame(T('fase observada (voltas)', 'observed phase (cycles)'), T('fluxo / média sem rotação', 'flux / non-rotating mean'));
    const xs = Array.from({ length: 2 * NPH + 1 }, (_, k) => k / NPH), ys = f => xs.map((_, k) => f[k % NPH] / m), c = PL.ctx;
    PL.clip();
    PL.line(xs, ys(c0.f), { color: 'rgba(200,206,220,.65)', width: 2, dash: [7, 6] });
    PL.area(xs, ys(cf.f), 0, { color: COL.psr, alpha: 0.07 });
    PL.line(xs, ys(cf.f), { color: COL.psr, width: 3.5, glow: 12 });
    // os picos
    [[c0.st.peak, 'rgba(200,206,220,.6)'], [cf.st.peak, COL.psr]].forEach(([pk, col]) => [pk, pk + 1].forEach(x => {
      c.save(); c.strokeStyle = col; c.lineWidth = 1.5; c.beginPath(); c.moveTo(PL.X(x), PL.T + 30); c.lineTo(PL.X(x), PL.T + 44); c.stroke(); c.restore();
    }));
    PL.unclip();
    const x = (phi / TAU) % 2, k = Math.floor(x * NPH) % NPH, fr = x * NPH - Math.floor(x * NPH);
    PL.vline(x, { color: 'rgba(255,255,255,.35)', dash: [3, 5], width: 1.2 });
    PL.dot(x, (cf.f[k] * (1 - fr) + cf.f[(k + 1) % NPH] * fr) / m, { color: '#fff', r: 6, glow: 16 });
    NS.legend(c, PL.L + 4, 20, [['f = ' + fmtF(F()), 'PF = ' + num(cf.st.pf, 2), COL.psr, null, true], ['f → 0', 'PF = ' + num(c0.st.pf, 2), 'rgba(200,206,220,.75)', [7, 6], false]]);
    PL.text(PL.R - 4, PL.T + 12, T('bolométrico: dF ∝ δ⁵ I′(α′) cos α dS′', 'bolometric: dF ∝ δ⁵ I′(α′) cos α dS′'), { px: true, align: 'right', size: 14, color: COL.text3 });
  }
  const spot = NS.spotDesc(I0, 0, RHO, [255, 255, 255]);
  function drawImage(phi) {
    if (dirtyPix) pixels();
    NS.paint(map, NS.lutIdx(phi), [spot], { lon: LONE, pr: PR, pg: PG, pb: PB, tr: TR, tg: TG, tb: TB });
    const { ctx: c, w, h } = fitCanvas(cvI);
    const Rp = Math.min(w / 2 - 10, h / 2 - 34) / 1.3, cx = w / 2, cy = h / 2 + 2;
    NS.drawGlobe(c, map, cx, cy, Rp);
    c.save(); c.font = `14px ${FONT}`; c.textBaseline = 'middle';
    if (cf.beq > 0.02) {                                       // o lado esquerdo vem em nossa direção
      c.textBaseline = 'top'; c.font = `600 15px ${FONT}`;
      c.fillStyle = '#9ec9ff'; c.textAlign = 'left'; c.fillText(T('← aproxima-se', '← approaching'), 4, 4);
      c.fillStyle = '#ffa27a'; c.textAlign = 'right'; c.fillText(T('afasta-se →', 'receding →'), w - 4, 4);
      c.font = `14px ${FONT}`;
    }
    c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText(T('1,4 M☉ · 12 km · mancha de 15° · i = 45°, j = 60°', '1.4 M☉ · 12 km · 15° spot · i = 45°, j = 60°'), 4, h - 20);
    c.fillText(T('animação: 1 volta em 4 s', 'animation: 1 turn per 4 s'), 4, h - 2);
    c.restore();
  }
  function update() {
    if (dirty0) { c0 = curve(0, gB()); dirty0 = false; }
    cf = curve(F(), gB());
    let dp = cf.st.peak - c0.st.peak; dp -= Math.round(dp);
    const h2 = s => s.a2 / s.a1;
    out.innerHTML = `<span>f <b>${fmtF(F())}</b> (P = ${num(1000 / F(), F() > 100 ? 2 : 1)} ms)</span>
      <span>β<sub>eq</sub> <b>${num(cf.beq, 3)}</b></span>
      <span>δ <b>${num(cf.dmin, 3)}–${num(cf.dmax, 3)}</b></span>
      <span>PF <b>${num(cf.st.pf, 3)}</b> (f → 0: ${num(c0.st.pf, 3)})</span>
      <span>${T('pico deslocado', 'peak shift')} <b>${num(dp, 3)} ${T('volta', 'cycle')}</b></span>
      <span>a<sub>2</sub>/a<sub>1</sub> <b>${num(h2(cf.st), 3)}</b> (f → 0: ${num(h2(c0.st), 3)})</span>`;
    if (!live()) render();
  }
  function render() { const phi = TAU * t / ROT; drawImage(phi); drawCurve(phi); }
  c0 = curve(0, gB()); dirty0 = false; cf = curve(F(), gB());
  const live = NS.anim(cvI, (dt, still, skip) => { if (still) t = 0.35 * ROT; else t += dt; if (!skip) render(); }, () => { t = 0; });
  update();
})();
