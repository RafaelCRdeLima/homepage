/* =====================================================================
   Utilitários comuns e as animações da Parte I (ray tracing relativístico).
   Cada bloco procura o seu canvas pelo id e só roda se ele existir.
   Parte II: dash-ns.js · Parte III: dash-res.js · blocos de outros seminários: dash-reuso.js.
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


/* ====================== PARTE I · RAY TRACING ======================
   Unidades: R_S = 2GM/c² = 1, então M = 1/2 e u = 1/r. Equação da órbita da luz:
   (du/dφ)² = 1/b² − u²(1 − u),  u″ + u = (3/2) u². */

const RT = (() => {
  /* ψ(b) exato para um fóton que sai da superfície r = R para fora:
     ψ = ∫₀^{1/R} du / √(1/b² − u²(1 − u)). Troca u = U(1 − t²) (U = 1/R), que deixa o
     integrando regular quando o raio sai rasante (b = b_max, onde o radicando zera em u = U).
     Válido para R > 1,5: fora da esfera de fótons um raio que sobe não tem ponto de retorno. */
  function psiExact(R, b) {
    if (b <= 0) return 0;
    const U = 1 / R, ib2 = 1 / (b * b), N = 360;
    let s = 0;
    for (let k = 0; k < N; k++) {
      const t = (k + 0.5) / N, u = U * (1 - t * t), g = ib2 - u * u * (1 - u);
      s += 2 * U * t / Math.sqrt(Math.max(g, 1e-300)) / N;
    }
    return s;
  }
  /* tabela ψ(α) em α uniforme (0 a 90°), q = b/b_max = sen α. Em α a malha fica fina justamente
     perto do limbo (q → 1), onde ψ(q) é íngreme: uma malha uniforme em q erraria ali a área das
     imagens que ficam espremidas na borda — as da parte de trás da estrela. */
  const cache = new Map();
  function table(R) {
    const key = R.toFixed(4); if (cache.has(key)) return cache.get(key);
    const n = 361, bmax = R / Math.sqrt(1 - 1 / R), psi = new Float64Array(n);
    for (let i = 0; i < n; i++) { const a = i / (n - 1) * Math.PI / 2; psi[i] = psiExact(R, Math.sin(a) * bmax); }
    const T = { R, bmax, n, psi, max: psi[n - 1] };
    if (cache.size > 60) cache.clear(); cache.set(key, T); return T;
  }
  const psiAt = (T, q) => { const x = Math.asin(Math.min(Math.max(q, 0), 1)) / (Math.PI / 2) * (T.n - 1), i = Math.min(Math.floor(x), T.n - 2), f = x - i; return T.psi[i] * (1 - f) + T.psi[i + 1] * f; };
  /* Beloborodov (2002): 1 − cos α = (1 − cos ψ)(1 − R_S/R). Devolve NaN quando pediria ψ > π. */
  const psiBelo = (R, q) => { const ca = Math.sqrt(1 - q * q), c = 1 - (1 - ca) / (1 - 1 / R); return c < -1 ? NaN : Math.acos(c); };

  /* órbita de um raio que chega do infinito pela direita com parâmetro b, integrada de volta
     (RK4 em φ). Para ao tocar r = rStop, ao escapar ou depois de 3 voltas. Devolve pontos (x, y)
     com o observador em +x, e o motivo da parada. */
  function orbit(b, rStop, rMax = 40, dphi = 0.004) {
    let u = 1 / rMax, phi = Math.asin(Math.min(1, b / rMax)), v = Math.sqrt(Math.max(1 / (b * b) - u * u * (1 - u), 0));
    const pts = [[Math.cos(phi) / u, Math.sin(phi) / u]];
    const f = uu => -uu + 1.5 * uu * uu;
    let end = 'escape';
    for (let k = 0; k < 20000; k++) {
      const h = u > 0.25 ? dphi * 0.5 : dphi;
      const k1u = v, k1v = f(u), k2u = v + 0.5 * h * k1v, k2v = f(u + 0.5 * h * k1u), k3u = v + 0.5 * h * k2v, k3v = f(u + 0.5 * h * k2u), k4u = v + h * k3v, k4v = f(u + h * k3u);
      u += h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u); v += h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v); phi += h;
      if (u >= 1 / rStop) { end = 'hit'; pts.push([Math.cos(phi) * rStop, Math.sin(phi) * rStop]); break; }
      if (u <= 1 / rMax) { pts.push([Math.cos(phi) / Math.max(u, 1e-9), Math.sin(phi) / Math.max(u, 1e-9)]); break; }
      if (phi > 6 * Math.PI) { end = 'orbit'; break; }
      pts.push([Math.cos(phi) / u, Math.sin(phi) / u]);
    }
    return { pts, end, phi };
  }

  /* Mapa inverso pixel a pixel: para cada pixel da imagem (raio q em unidades do raio aparente),
     o ponto da superfície de onde a luz veio, no referencial da estrela (eixo de rotação inclinado
     de `inc` em relação à linha de visada). mode: 'flat' | 'belo' | 'exact'. */
  function pixelMap(S, R, mode, inc) {
    const T = mode === 'exact' ? table(R) : null, n = S * S;
    const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n), ok = new Uint8Array(n);
    const si = Math.sin(inc), ci = Math.cos(inc);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const px = (i + 0.5) / S * 2 - 1, py = 1 - (j + 0.5) / S * 2, q = Math.hypot(px, py), k = j * S + i;
      if (q > 1) continue;
      const psi = mode === 'flat' ? Math.asin(q) : mode === 'belo' ? psiBelo(R, q) : psiAt(T, q);
      if (!isFinite(psi)) continue;
      const ex = q > 0 ? px / q : 0, ey = q > 0 ? py / q : 0, sp = Math.sin(psi), cp = Math.cos(psi);
      const ox = sp * ex, oy = sp * ey, oz = cp;                 // n̂ no referencial do observador (z para nós)
      // eixos da estrela: x̂* = x̂, ẑ* = (0, sen i, cos i), ŷ* = (0, cos i, −sen i)
      nx[k] = ox; ny[k] = oy * ci - oz * si; nz[k] = oy * si + oz * ci; ok[k] = 1;
    }
    return { S, nx, ny, nz, ok, R, mode };
  }
  /* pinta o mapa: grade de latitude e longitude (30°), calota norte âmbar e sul turquesa */
  function paint(img, map, rot, opt = {}) {
    const { S, nx, ny, nz, ok } = map, d = img.data, W = opt.w ?? 0.016, cap = opt.cap ?? 0.42;
    for (let k = 0; k < S * S; k++) {
      const o = k * 4;
      if (!ok[k]) { d[o + 3] = 0; continue; }
      const z = nz[k], lat = Math.asin(Math.max(-1, Math.min(1, z))), lon = Math.atan2(ny[k], nx[k]) - rot;
      let r = 40, g = 46, b = 66;
      const col = Math.PI / 2 - lat;
      if (col < cap) { r = 255; g = 184; b = 107; }
      else if (col > Math.PI - cap) { r = 86; g = 225; b = 208; }
      else {
        const dl = Math.abs(((lat / (Math.PI / 6)) % 1 + 1.5) % 1 - 0.5) * (Math.PI / 6);
        const dm = Math.abs(((lon / (Math.PI / 6)) % 1 + 1.5) % 1 - 0.5) * (Math.PI / 6) * Math.cos(lat);
        if (dl < W || dm < W) { r = 150; g = 140; b = 220; }
        const m0 = Math.abs(((lon / (2 * Math.PI)) % 1 + 1.5) % 1 - 0.5) * 2 * Math.PI * Math.cos(lat);
        if (m0 < W * 1.6) { r = 255; g = 255; b = 255; }
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
  }
  /* desenha o ImageData centrado, com raio aparente rap (px), com um brilho em volta */
  function blit(ctx, img, buf, cx, cy, rap, glow = 'rgba(158,140,255,.22)') {
    buf.getContext('2d').putImageData(img, 0, 0);
    const g = ctx.createRadialGradient(cx, cy, rap * 0.9, cx, cy, rap * 1.35);
    g.addColorStop(0, glow); g.addColorStop(1, 'rgba(158,140,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rap * 1.35, 0, 7); ctx.fill();
    ctx.imageSmoothingEnabled = true; ctx.drawImage(buf, cx - rap, cy - rap, 2 * rap, 2 * rap);
  }
  return { psiExact, table, psiAt, psiBelo, orbit, pixelMap, paint, blit };
})();

/* Sobral, 29 de maio de 1919: a chapa de comparação (noite, julho) e a do eclipse, alternando como
   num comparador de piscar. Estrelas do Tycho-2 (V < 10,6) levadas a 1919,4 pelo movimento próprio,
   no plano tangente em volta do Sol daquela manhã (11h40 TU; Meeus, precessado para J2000): ξ para
   leste, η para norte, em minutos de arco. A chapa tem a orientação da placa do slide anterior (ESO
   potw1926a), ajustada pelas seis estrelas marcadas nela: resíduos de 2 px, e o Sol cai no centro do
   disco. Cada estrela se afasta do Sol, na radial, δ = 4GM/(c²b) = 1,7505″ θ☉/θ (Newton: a metade),
   vezes o exagero; a Lua tapa quem está atrás dela de verdade, não na posição exagerada. */
(() => {
  const cv = document.getElementById('sobral'); if (!cv) return;
  const out = document.getElementById('sobral-out');
  const STARS = [
    [-4.32, 36.87, 4.2, 'κ¹ Tau'], [8.67, 68.07, 4.3, 'υ Tau'], [-118.10, -65.27, 4.9, 'ω² Tau'], [-3.67, 31.24, 5.3, 'κ² Tau'],
    [-84.45, 6.06, 5.3, '56 Tau'], [-87.30, -31.80, 5.5, '53 Tau'], [22.38, 79.02, 5.5, '72 Tau'], [-101.76, -5.42, 5.6, '51 Tau'],
    [32.54, -3.51, 5.7, 'HR 1403'], [-29.87, -41.81, 6.0, 'HR 1375'], [-46.16, -51.43, 6.0, 'HR 1370'], [125.76, 61.72, 6.8],
    [-58.15, -38.20, 6.8], [-26.72, 77.14, 7.0], [-57.13, -29.35, 7.1], [65.23, -110.16, 7.1], [76.44, 100.38, 7.1], [90.11, -2.41, 7.1],
    [-20.05, 3.44, 7.1], [64.68, 114.81, 7.2], [-77.26, 115.57, 7.2], [8.76, -12.54, 7.3], [19.13, -110.23, 7.5], [81.91, 70.34, 7.5],
    [-102.75, 68.28, 7.6], [42.56, -60.07, 7.7], [-87.03, -103.58, 7.9], [-16.35, 63.74, 8.0], [127.51, -33.65, 8.0],
    [-4.83, 126.53, 8.1], [-108.47, 41.14, 8.2], [-93.02, -22.32, 8.2], [138.30, 21.57, 8.2], [46.45, 14.43, 8.4],
    [-56.02, -132.62, 8.4], [-117.37, -69.31, 8.4], [124.90, -33.55, 8.4], [1.72, -32.57, 8.5], [-32.14, -29.74, 8.5],
    [-94.77, -105.93, 8.6], [20.33, -41.28, 8.6], [-30.34, -47.63, 8.6], [78.64, -92.47, 8.6],
    [41.54, -116.28, 8.6], [62.34, -41.62, 8.6], [-85.54, -36.49, 8.6], [35.14, 39.23, 8.7], [41.52, -50.79, 8.8], [21.02, 110.02, 8.8],
    [-23.10, -8.34, 8.8], [-46.39, 59.11, 8.8], [-32.24, -17.97, 8.9], [122.91, 62.76, 8.9], [86.99, -2.27, 8.9], [15.20, 81.20, 8.9],
    [-10.00, -97.43, 8.9], [2.43, 113.04, 9.0], [-141.05, -22.83, 9.0], [39.45, 89.04, 9.1], [-127.01, 14.62, 9.1], [83.96, -53.42, 9.1],
    [-94.99, 39.33, 9.2], [-17.90, -103.13, 9.2], [107.44, -0.13, 9.2], [-22.00, -121.63, 9.2], [-111.89, 35.56, 9.2],
    [-1.27, 115.62, 9.3], [-12.04, -34.47, 9.3], [-113.46, 86.69, 9.3], [-32.50, -121.25, 9.4], [-2.40, -119.30, 9.4],
    [55.90, -122.26, 9.4], [-103.40, 97.00, 9.5], [-1.94, -115.01, 9.5], [-51.11, 34.71, 9.5], [101.93, -14.98, 9.5],
    [-44.13, 100.05, 9.5], [-26.64, -17.01, 9.5], [-35.03, -28.16, 9.5], [-36.20, -52.42, 9.5], [-68.60, 76.44, 9.6],
    [-25.43, 136.79, 9.6], [-4.75, 55.03, 9.6], [143.20, -11.56, 9.6], [-15.64, -102.75, 9.7], [21.76, 18.07, 9.7], [-67.86, 33.35, 9.7],
    [59.83, -49.39, 9.7], [45.20, 32.90, 9.7], [-1.35, 88.24, 9.7], [-64.23, 80.02, 9.7], [46.94, 68.32, 9.8], [99.08, -92.14, 9.8],
    [-118.64, 60.50, 9.8], [110.59, 34.43, 9.8], [-30.59, 26.28, 9.8], [62.53, -48.04, 9.8], [-31.14, -73.73, 9.8],
    [21.52, -133.23, 9.8], [125.15, 42.98, 9.8], [67.02, -67.69, 9.8], [-32.48, -65.69, 9.9], [-58.91, 90.56, 9.9],
    [-112.19, 25.59, 9.9], [122.11, -2.76, 9.9], [-52.08, -128.62, 9.9], [-123.59, -15.14, 9.9], [5.42, 88.73, 9.9],
    [-93.36, -108.93, 9.9], [-129.03, -60.96, 9.9], [-83.36, -114.83, 9.9], [16.09, 112.17, 9.9], [-25.75, -44.98, 9.9],
    [-16.39, 84.61, 10.0], [-125.54, 66.91, 10.0], [-24.90, 23.87, 10.0], [-15.85, 79.27, 10.0], [-4.80, 127.02, 10.0],
    [-61.26, 121.26, 10.0], [-70.31, -92.35, 10.0], [-62.99, 7.55, 10.0], [117.68, -19.34, 10.0], [38.67, -38.24, 10.0],
    [34.46, -124.70, 10.0], [-55.17, 86.09, 10.1], [54.88, -27.41, 10.1], [32.59, -98.83, 10.1], [-39.45, 69.28, 10.1],
    [-44.54, -9.60, 10.1], [-92.76, 28.17, 10.1], [29.46, 40.56, 10.1], [44.38, -86.85, 10.1], [20.70, 104.59, 10.1],
    [17.85, 83.70, 10.1], [6.24, 73.55, 10.2], [-116.80, 12.31, 10.2], [45.94, 22.41, 10.2], [-39.79, -135.63, 10.2],
    [-61.38, 66.38, 10.2], [81.72, 28.85, 10.2], [48.03, -64.18, 10.2], [132.67, -39.13, 10.2], [75.92, -107.86, 10.2],
    [22.15, 84.45, 10.2], [-57.07, 19.94, 10.3], [54.46, 100.00, 10.3], [-128.11, 38.71, 10.3], [84.20, -22.40, 10.3],
    [64.82, -17.62, 10.3], [65.77, -40.76, 10.3], [-31.12, -112.33, 10.3], [28.55, 79.21, 10.3], [-24.61, 2.38, 10.3],
    [48.60, 29.52, 10.3], [101.29, 13.73, 10.3], [120.91, -69.74, 10.3], [132.39, 49.82, 10.3], [96.29, -35.29, 10.3],
    [-111.52, -47.62, 10.4], [130.55, -36.28, 10.4], [-77.37, 49.61, 10.4], [-61.66, 36.75, 10.4], [61.99, -44.54, 10.4],
    [-102.26, -48.13, 10.4], [98.72, 25.98, 10.4], [5.84, 73.57, 10.4], [71.97, -26.32, 10.4], [38.32, -48.14, 10.4],
    [-66.81, 98.28, 10.4], [-24.23, -94.54, 10.4], [133.39, -29.37, 10.4], [-98.09, 61.85, 10.4], [-31.87, -117.08, 10.5],
    [-71.79, 26.67, 10.5], [-93.78, 2.83, 10.5], [-68.09, -25.48, 10.5], [15.57, -45.78, 10.5], [-83.16, 79.10, 10.5],
  ];
  const RSUN = 946.7 / 60, RMOON = 1.06 * RSUN, LIMB = 1.7505;        // ′ (Terra a 1,0137 UA); ″ no limbo
  const ROT = -132.05 * deg, CR = 4.2;                                  // céu (leste à esquerda) → placa do ESO; coroa até 4,2 R☉
  const FIELD = [142.7, 85.1], MID = [5.39, -4.88];                     // campo da placa do ESO e o centro dele, a partir do Sol (′)
  const EXS = [1, 2, 5, 10, 20, 50, 100, 200, 300, 500, 1000];
  const HOLD = 1.4, FADE = 0.35, PER = 2 * (HOLD + FADE);
  const rot = (x, y) => [x * Math.cos(ROT) - y * Math.sin(ROT), x * Math.sin(ROT) + y * Math.cos(ROT)];
  const S = STARS.map(([xi, eta, V, name]) => { const [x, y] = rot(-xi, eta); return { x, y, th: Math.hypot(xi, eta), V, name }; });
  const K2 = S.find(s => s.name === 'κ² Tau');
  let t = 0, cor = null, corN = 0, grain = null, grainKey = '', outKey = '';
  // no PDF (?ff) a chapa sai com as duas posições e as setas
  if (FF) document.querySelectorAll('#sobral-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === 'both'));
  const getMode = bindSeg('sobral-mode', () => { t = 0; redraw(); });
  const getTh = bindSeg('sobral-th', () => redraw());
  const getEx = bindRange('sobral-ex', v => '×' + grp(EXS[v]), () => redraw());

  /* coroa sintética em n×n px (Sol de raio n/2CR): K em r⁻⁸ e streamers em r⁻³ que estreitam para fora,
     com raios finos irregulares; a emulsão satura (1 − e⁻ᴵ). Os streamers ficam mais ou menos onde estão na placa. */
  const STREAM = [[10, .30, 1], [140, .35, .8], [178, .28, 1.1], [215, .32, .9], [300, .25, .7], [62, .22, .4]].map(([a, w, A]) => [a * deg, w, A]);
  const RAYS = Array.from({ length: 9 }, (_, i) => [17 + 9 * i + (i * 7) % 5, (i * 2.399) % 6.283]);
  function corona(n) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data, h = n / 2, rs = n / (2 * CR);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5 - h) / rs, y = (h - j - 0.5) / rs, r = Math.hypot(x, y);
      if (r < 0.95 || r > CR) continue;
      const ph = Math.atan2(y, x);
      let st = 0.3;
      for (const [a, w, A] of STREAM) { const dp = Math.atan2(Math.sin(ph - a), Math.cos(ph - a)); st += A * Math.exp(-dp * dp * r / (w * w)); }
      let ray = 1; for (const [f, p0] of RAYS) ray += 0.055 * Math.sin(f * ph + p0 + 0.6 * r);
      const I = (3 * r ** -8 + 1.2 * st * r ** -3) * ray * (1 - smooth(0.7 * CR, CR, r));
      const o = 4 * (j * n + i); d[o] = 232; d[o + 1] = 236; d[o + 2] = 246; d[o + 3] = 255 * (1 - Math.exp(-1.8 * I));
    }
    g.putImageData(img, 0, 0); return c;
  }
  // grão da emulsão: ruído fixo, fraco
  function makeGrain(w, h) {
    const c = document.createElement('canvas'); c.width = Math.ceil(w / 2); c.height = Math.ceil(h / 2);
    const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), d = img.data;
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < d.length; k += 4) { d[k] = d[k + 1] = d[k + 2] = 255 * rnd(); d[k + 3] = 16; }
    g.putImageData(img, 0, 0); return c;
  }
  const spr = (() => {
    const c = document.createElement('canvas'), n = 48, h = n / 2; c.width = c.height = n;
    const g = c.getContext('2d'), gr = g.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(236,240,255,.9)');
    gr.addColorStop(0.5, 'rgba(200,210,255,.2)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, n, n); return c;
  })();
  const phase = () => { const u = t % PER; return u < HOLD ? 0 : u < HOLD + FADE ? smooth(HOLD, HOLD + FADE, u) : u < PER - FADE ? 1 : 1 - smooth(PER - FADE, PER, u); };
  function chip(c, x, y, s, color = COL.text) {
    c.font = `600 15px ${FONT}`; const W = c.measureText(s).width + 24;
    c.fillStyle = 'rgba(7,8,14,.66)'; c.beginPath(); c.roundRect(x, y, W, 32, 8); c.fill();
    c.fillStyle = color; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(s, x + 12, y + 17);
  }
  function arrow(c, x0, y0, x1, y1) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0), hd = Math.min(9, 0.45 * L);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - hd * Math.cos(a - 0.45), y1 - hd * Math.sin(a - 0.45));
    c.lineTo(x1 - hd * Math.cos(a + 0.45), y1 - hd * Math.sin(a + 0.45)); c.closePath(); c.fill();
  }

  function draw(m = getMode()) {
    const { ctx: c, w, h } = fitCanvas(cv);
    const k = Math.min(w / FIELD[0], h / FIELD[1]);                       // px por ′
    const X = x => w / 2 + (x - MID[0]) * k, Y = y => h / 2 - (y - MID[1]) * k;
    const sx = X(0), sy = Y(0), rS = RSUN * k, rM = RMOON * k;
    const s = m === 'night' ? 0 : m === 'blink' ? phase() : 1, both = m === 'both';
    const ex = EXS[getEx()], lim = LIMB * +getTh();
    const shift = st => 1 + lim * RSUN / st.th / 60 * ex / st.th;          // posição no eclipse = noite × isto (radial)
    c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h);
    // eclipse: a luz do céu, a coroa e a Lua
    if (s > 0) {
      const n = Math.min(720, Math.round(2 * CR * rS * Math.min(2, devicePixelRatio || 1)));
      if (n !== corN) { cor = corona(n); corN = n; }
      c.save(); c.globalAlpha = s;
      const g = c.createRadialGradient(sx, sy, rS, sx, sy, Math.max(w, h) * 0.8);
      g.addColorStop(0, 'rgba(120,130,160,.12)'); g.addColorStop(1, 'rgba(120,130,160,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.drawImage(cor, sx - CR * rS, sy - CR * rS, 2 * CR * rS, 2 * CR * rS);
      c.fillStyle = '#030305'; c.beginPath(); c.arc(sx, sy, rM, 0, 7); c.fill();
      c.restore();
    }
    // noite: onde o Sol estava em 29 de maio
    if (s < 1) {
      c.save(); c.globalAlpha = 1 - s;
      c.strokeStyle = 'rgba(255,184,107,.6)'; c.lineWidth = 1.5; c.setLineDash([6, 7]);
      c.beginPath(); c.arc(sx, sy, rS, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,184,107,.85)'; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(T('o Sol em', 'the Sun on'), sx, sy - 10); c.fillText(T('29 de maio', '29 May'), sx, sy + 10);
      c.restore();
    }
    // marcas fixas: as posições da noite, como os círculos da placa
    c.lineWidth = 1.3; c.strokeStyle = 'rgba(158,140,255,.6)';
    for (const st of S) {
      if (st.V > 8.6) continue;
      c.beginPath(); c.arc(X(st.x), Y(st.y), 7 + 1.3 * (8.6 - st.V), 0, 7); c.stroke();
    }
    // setas noite → eclipse
    if (both) {
      c.save(); c.strokeStyle = COL.sol; c.fillStyle = COL.sol; c.lineWidth = 1.8;
      for (const st of S) {
        if (st.th < RMOON || st.V > 9.6) continue;
        const f = shift(st), x0 = X(st.x), y0 = Y(st.y), x1 = X(st.x * f), y1 = Y(st.y * f);
        if (Math.hypot(x1 - x0, y1 - y0) > 5) arrow(c, x0, y0, x1, y1);
      }
      c.restore();
    }
    // as estrelas
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const st of S) {
      const a = st.th < RMOON ? 1 - s : 1;                               // atrás da Lua de verdade
      if (a <= 0) continue;
      const f = 1 + s * (shift(st) - 1), D = 2.2 + 2.1 * (10.6 - st.V);
      c.globalAlpha = a * Math.min(1, 0.45 + 0.09 * (10.6 - st.V));
      c.drawImage(spr, X(st.x * f) - D, Y(st.y * f) - D, 2 * D, 2 * D);
    }
    c.restore();
    // nomes, presos às marcas
    c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.textBaseline = 'middle';
    for (const st of S) {
      if (!st.name) continue;
      const x = X(st.x), y = Y(st.y), r = 7 + 1.3 * (8.6 - st.V) + 7, right = x < w - 110;
      c.textAlign = right ? 'left' : 'right'; c.fillText(st.name, x + (right ? r : -r), y);
    }
    // grão e vinheta
    const gk = `${Math.round(w)}x${Math.round(h)}`;
    if (gk !== grainKey) { grain = makeGrain(w, h); grainKey = gk; }
    c.drawImage(grain, 0, 0, w, h);
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) / 2);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
    // rótulos da chapa
    if (both) chip(c, 14, 14, T('as duas · setas: noite → eclipse', 'both · arrows: night → eclipse').toUpperCase(), COL.sol);
    else chip(c, 14, 14, (s < 0.5 ? T('noite · julho de 1919', 'night · July 1919') : T('eclipse · 29 de maio de 1919', 'eclipse · 29 May 1919')).toUpperCase());
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T(`Híades, em Touro · deslocamentos ×${grp(ex)}`, `Hyades, in Taurus · shifts ×${grp(ex)}`), 16, 56);
    // bússola e escala, no canto de cima
    const cx = w - 64, cy = 62;
    c.strokeStyle = COL.text3; c.fillStyle = COL.text3; c.lineWidth = 1.5; c.textAlign = 'center'; c.textBaseline = 'middle';
    [[rot(0, 1), 'N'], [rot(-1, 0), T('L', 'E')]].forEach(([[dx, dy], lab]) => {
      arrow(c, cx, cy, cx + 30 * dx, cy - 30 * dy); c.fillText(lab, cx + 44 * dx, cy - 44 * dy);
    });
    const bar = 30 * k, bx = w - 18 - bar, by = 132;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bar, by); c.moveTo(bx, by - 5); c.lineTo(bx, by + 5); c.moveTo(bx + bar, by - 5); c.lineTo(bx + bar, by + 5); c.stroke();
    c.textBaseline = 'bottom'; c.fillText('30′', bx + bar / 2, by - 6);
    const key = `${lim}|${ex}`;
    if (key !== outKey) {
      outKey = key;
      out.innerHTML = `<span>${T('desvio no limbo', 'deflection at the limb')} <b>${fmt(lim, 2)}″</b></span>
        <span>κ² Tau, ${T('a', 'at')} ${fmt(K2.th / RSUN, 1)} R<sub>☉</sub> <b>${fmt(lim * RSUN / K2.th, 2)}″</b></span>
        <span>${T('Sobral mediu', 'Sobral measured')} <b>${fmt(1.98, 2)} ± ${fmt(0.12, 2)}″</b></span>
        <span>${T('na tela', 'on screen')} <b>×${grp(ex)}</b></span>`;
    }
  }
  const still = () => draw(getMode() === 'blink' ? 'both' : getMode());
  function redraw() { if (reduceMotion || document.body.classList.contains('overview')) still(); else draw(); }
  loopOn(cv, dt => { t += dt; draw(); }, still);
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) still(); });
})();

/* Potencial efetivo dos fótons, V = (1 − 1/r)/r², e a órbita com o mesmo b.
   Onde 1/b² < V o raio não entra: ponto de retorno. Pico em r = 1,5 (esfera de fótons),
   V_max = 4/27 → b_c = (3√3/2) R_S. */
(() => {
  const cv = document.getElementById('veff'); if (!cv) return;
  const cvO = document.getElementById('veff-orb'), out = document.getElementById('veff-out');
  const V = r => (1 - 1 / r) / (r * r), BC = 1.5 * Math.sqrt(3);
  const P = new Plot(cv, { x: [1, 8], y: [0, 0.2], m: [20, 20, 64, 78], fs: 16, yticks: [0, 0.05, 0.1, 0.15] });
  const rs = linspace(1, 8, 400);
  let orb = null, lastB = -1, s = 0;
  const getB = bindRange('veff-b', v => fmt(v, 2), () => { s = 0; render(); });
  function rTurn(b) {                                         // maior raiz de V(r) = 1/b² (r > 1,5)
    if (b <= BC) return null;
    let lo = 1.5, hi = 1e4; const y = 1 / (b * b);
    for (let k = 0; k < 80; k++) { const m = 0.5 * (lo + hi); (V(m) > y) ? lo = m : hi = m; }
    return 0.5 * (lo + hi);
  }
  function deflection(b, rt) {                                  // desvio total = 2∫₀^{u_t} du/√(1/b² − u²(1−u)) − π
    const ut = 1 / rt, ib2 = 1 / (b * b), N = 2000; let sum = 0;
    for (let k = 0; k < N; k++) { const t = (k + 0.5) / N, u = ut * (1 - t * t), g = ib2 - u * u * (1 - u); sum += 2 * ut * t / Math.sqrt(Math.max(g, 1e-300)) / N; }
    return 2 * sum - Math.PI;
  }
  function render() {
    const b = getB(), y = 1 / (b * b), rt = rTurn(b);
    if (b !== lastB) { orb = RT.orbit(b, 1, 24, 0.003); lastB = b; }
    P.begin().frame(T('r / R_S', 'r / R_S'), 'V(r) · R_S²');
    const c = P.ctx;
    P.clip();
    // região proibida para quem chega de longe: V > 1/b², fora do retorno
    c.fillStyle = 'rgba(158,140,255,.12)';
    c.beginPath(); c.moveTo(P.X(1), P.Y(0));
    rs.forEach(r => c.lineTo(P.X(r), P.Y(Math.max(V(r), 0))));
    c.lineTo(P.X(8), P.Y(0)); c.closePath(); c.fill();
    P.line(rs, rs.map(V), { color: COL.bn, width: 3, glow: 10 });
    P.hline(y, { color: COL.sol, dash: [7, 6], width: 2, label: '1/b²', align: 'right' });
    P.vline(1.5, { color: 'rgba(255,255,255,.35)', label: T('esfera de fótons', 'photon sphere'), y: P.T + 6 });
    P.unclip();
    if (rt) P.dot(rt, y, { color: COL.sol, r: 6, glow: 14 });
    // um fóton andando pela órbita (no potencial: r(t) do mesmo ponto)
    const pts = orb.pts, idx = Math.min(pts.length - 1, Math.floor(s * pts.length));
    const [px, py] = pts[idx], rr = Math.hypot(px, py);
    if (rr <= 8) P.dot(rr, Math.min(V(rr), 0.199), { color: '#fff', r: 5, glow: 12 });
    // painel da órbita
    const { ctx: o, w, h } = fitCanvas(cvO), cx = w * 0.42, cy = h * 0.5, sc = Math.min(w, h) / 13;
    o.strokeStyle = 'rgba(255,255,255,.12)'; o.setLineDash([5, 6]); o.beginPath(); o.arc(cx, cy, 1.5 * sc, 0, 7); o.stroke(); o.setLineDash([]);
    o.fillStyle = '#000'; o.beginPath(); o.arc(cx, cy, sc, 0, 7); o.fill();
    o.strokeStyle = 'rgba(158,140,255,.6)'; o.lineWidth = 1.5; o.stroke();
    o.save(); o.beginPath(); o.rect(0, 0, w, h); o.clip();
    o.strokeStyle = COL.sol; o.lineWidth = 2.4; o.shadowColor = COL.sol; o.shadowBlur = 8; o.beginPath();
    pts.forEach(([x, yy], k) => { const X = cx + x * sc, Y = cy - yy * sc; k ? o.lineTo(X, Y) : o.moveTo(X, Y); });
    o.stroke(); o.shadowBlur = 0;
    o.fillStyle = '#fff'; o.beginPath(); o.arc(cx + px * sc, cy - py * sc, 5, 0, 7); o.fill(); o.restore();
    o.font = `15px ${FONT}`; o.fillStyle = COL.text3; o.textAlign = 'left'; o.textBaseline = 'top';
    o.fillText(T('a órbita (vinda da direita)', 'the orbit (coming from the right)'), 8, 6);
    o.textAlign = 'center'; o.fillText(T('horizonte', 'horizon'), cx, cy + sc + 6);
    const dfl = rt ? deflection(b, rt) : NaN;
    out.innerHTML = `<span>b <b>${fmt(b, 2)} R<sub>S</sub></b></span><span>b<sub>c</sub> <b>${fmt(BC, 3)} R<sub>S</sub></b></span>
      <span>${T('ponto de retorno', 'turning point')} <b>${rt ? fmt(rt, 2) + ' R<sub>S</sub>' : T('nenhum: capturado', 'none: captured')}</b></span>
      <span>${T('desvio', 'deflection')} <b>${rt ? fmt(dfl * 180 / Math.PI, 1) + '°' : '—'}</b></span>`;
  }
  loopOn(cv, dt => { s = (s + dt / 5) % 1; render(); }, () => { s = 0.55; render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* ψ(α): integral exata, aproximação de Beloborodov (2002) e espaço plano, para a compacidade escolhida. */
(() => {
  const cv = document.getElementById('psi'); if (!cv) return;
  const cvE = document.getElementById('psi-err'), out = document.getElementById('psi-out');
  const al = linspace(0, 90, 181), rad = Math.PI / 180;
  const getR = bindRange('psi-R', v => fmt(v, 2), draw);
  function draw() {
    const R = getR(), Tb = RT.table(R);
    const ex = al.map(a => RT.psiAt(Tb, Math.sin(a * rad)) / rad), be = al.map(a => RT.psiBelo(R, Math.sin(a * rad)) / rad);
    const ymax = Math.max(200, Math.ceil((Tb.max / rad + 15) / 30) * 30);
    const P = new Plot(cv, { x: [0, 90], y: [0, ymax], m: [20, 24, 64, 70], fs: 16, xticks: [0, 30, 60, 90], yticks: linspace(0, ymax, ymax / 30 + 1).filter((_, i) => i % 2 === 0) });
    P.begin().frame(T('α na superfície (graus)', 'α at the surface (degrees)'), T('ψ (graus)', 'ψ (degrees)'));
    P.clip();
    P.hline(90, { color: 'rgba(255,255,255,.3)', label: T('limbo sem gravidade', 'limb without gravity'), align: 'left' });
    P.hline(180, { color: 'rgba(255,122,138,.5)', label: T('o polo de trás', 'the far pole'), align: 'left' });
    P.line(al, al, { color: 'rgba(255,255,255,.45)', width: 1.6, dash: [2, 6] });
    P.line(al, be, { color: COL.sol, width: 2.4, dash: [8, 6] });
    P.line(al, ex, { color: COL.bn, width: 3.5, glow: 12 });
    P.unclip();
    P.dot(90, Tb.max / rad, { color: COL.bn, r: 6, glow: 14 });
    // erro da aproximação
    const err = al.map((a, k) => isFinite(be[k]) ? Math.abs(be[k] - ex[k]) : NaN);
    const emax = Math.max(1, ...err.filter(isFinite)) * 1.15;
    const PE = new Plot(cvE, { x: [0, 90], y: [0, emax], m: [20, 16, 64, 62], fs: 15, xticks: [0, 30, 60, 90] });
    PE.begin().frame(T('α (graus)', 'α (degrees)'), T('|ψ_B − ψ| (graus)', '|ψ_B − ψ| (degrees)'));
    PE.clip().area(al, err.map(e => isFinite(e) ? e : 0), 0, { color: COL.sol, alpha: 0.18 }).line(al, err, { color: COL.sol, width: 2.6 }).unclip();
    if (err.some(e => !isFinite(e))) PE.text(45, emax * 0.88, T('Beloborodov não chega lá', 'Beloborodov cannot get there'), { color: COL.warn, align: 'center', size: 15 });
    const pb = RT.psiBelo(R, 1), vis = (1 - Math.cos(Math.min(Tb.max, Math.PI))) / 2;
    out.innerHTML = `<span>R<sub>S</sub>/R <b>${fmt(1 / R, 3)}</b></span>
      <span>ψ<sub>${T('máx', 'max')}</sub> ${T('exato', 'exact')} <b>${fmt(Tb.max / rad, 1)}°</b></span>
      <span>Beloborodov <b>${isFinite(pb) ? fmt(pb / rad, 1) + '°' : '> 180°'}</b></span>
      <span>${T('superfície visível', 'visible surface')} <b>${Tb.max >= Math.PI ? '100%' : Math.round(100 * vis) + '%'}</b></span>
      <span>${T('raio aparente', 'apparent radius')} <b>${fmt(1 / Math.sqrt(1 - 1 / R), 2)} R</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Ray tracing de trás para a frente, animado: cada pixel é um raio que chega ao observador;
   à esquerda, o raio do pixel atual visto de lado (no plano que contém a linha de visada e o
   pixel); à direita, a imagem se formando em ordem de varredura. Estrela de R = 2,42 R_S
   (1,4 M☉ e 10 km), eixo de rotação inclinado de 60°. */
(() => {
  const cv = document.getElementById('rt-side'); if (!cv) return;
  const cvI = document.getElementById('rt-image'), out = document.getElementById('rt-out');
  const R = 2.42, INC = 60 * Math.PI / 180, S = 56, FIELD = 1.25;      // pixels por lado; campo = 1,25 b_max
  const Tb = RT.table(R), map = RT.pixelMap(S, R, 'exact', INC);
  const img = new ImageData(S, S), buf = document.createElement('canvas'); buf.width = buf.height = S;
  RT.paint(img, map, 0.4, { w: 0.06 });
  const full = new Uint8ClampedArray(img.data);                        // a imagem pronta; revelamos aos poucos
  const shown = new ImageData(S, S);
  let k = 0, hold = 0, trail = [];
  const PIX_S = 30;                                                     // pixels por segundo no começo; acelera até ~1 800/s (imagem pronta em ~7 s)
  function pixelInfo(idx) {
    const i = idx % S, j = Math.floor(idx / S), px = ((i + 0.5) / S * 2 - 1) * FIELD, py = (1 - (j + 0.5) / S * 2) * FIELD;
    const q = Math.hypot(px, py), b = q * Tb.bmax;
    return { i, j, px, py, q, b };
  }
  function reveal(n) {
    for (let t = 0; t < n && k < S * S; t++, k++) {
      const { px, py, q } = pixelInfo(k), o = k * 4;
      if (q <= 1) {
        // índice correspondente no mapa (que cobre só o disco aparente)
        const ii = Math.floor(((px + 1) / 2) * S), jj = Math.floor(((1 - py) / 2) * S), m = (jj * S + ii) * 4;
        shown.data[o] = full[m]; shown.data[o + 1] = full[m + 1]; shown.data[o + 2] = full[m + 2]; shown.data[o + 3] = 255;
      } else { shown.data[o] = 12; shown.data[o + 1] = 14; shown.data[o + 2] = 26; shown.data[o + 3] = 255; }
    }
  }
  function render() {
    const cur = pixelInfo(Math.min(k, S * S - 1)), b = cur.b;
    // lado: o raio do pixel atual
    const { ctx: c, w, h } = fitCanvas(cv), sc = Math.min(w / 16, h / 9.5), cx = w * 0.28, cy = h * 0.55;
    c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(w - 26, 10, 14, h - 20);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'right'; c.textBaseline = 'top';
    c.fillText(T('tela do observador →', 'observer’s screen →'), w - 34, 10);
    const g = c.createRadialGradient(cx, cy, R * sc * 0.6, cx, cy, R * sc * 1.4); g.addColorStop(0, 'rgba(158,140,255,.25)'); g.addColorStop(1, 'rgba(158,140,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * sc * 1.4, 0, 7); c.fill();
    c.fillStyle = '#2a2f45'; c.beginPath(); c.arc(cx, cy, R * sc, 0, 7); c.fill();
    c.strokeStyle = 'rgba(190,180,255,.6)'; c.lineWidth = 1.5; c.stroke();
    c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(cx, cy, 1.5 * sc, 0, 7); c.stroke(); c.setLineDash([]);
    const drawRay = (bb, col, lw) => {
      const o = RT.orbit(bb, R, 30, 0.006);
      c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
      o.pts.forEach(([x, y], n) => { const X = cx + x * sc, Y = cy - y * sc; n ? c.lineTo(X, Y) : c.moveTo(X, Y); });
      c.stroke(); return o;
    };
    c.save(); c.beginPath(); c.rect(0, 0, w - 26, h); c.clip();
    trail.forEach((bb, n) => drawRay(bb, `rgba(158,140,255,${(0.06 + 0.25 * n / trail.length).toFixed(3)})`, 1));
    const o = drawRay(b, b <= Tb.bmax ? COL.sol : COL.psr, 2.6);
    c.restore();
    if (o.end === 'hit') { const [x, y] = o.pts[o.pts.length - 1]; c.fillStyle = '#fff'; c.shadowColor = COL.sol; c.shadowBlur = 14; c.beginPath(); c.arc(cx + x * sc, cy - y * sc, 5, 0, 7); c.fill(); c.shadowBlur = 0; }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(w - 19, cy - Math.min(b, 8.5) * sc, 4, 0, 7); c.fill();
    c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillStyle = COL.text3;
    c.fillText(T('estrela de nêutrons · R = 2,42 R_S', 'neutron star · R = 2.42 R_S').replace('2,42', fmt(2.42, 2)), 10, h - 8);
    // imagem
    const { ctx: d, w: w2, h: h2 } = fitCanvas(cvI), side = Math.min(w2, h2) - 20, ox = (w2 - side) / 2, oy = (h2 - side) / 2;
    buf.getContext('2d').putImageData(shown, 0, 0);
    d.imageSmoothingEnabled = false; d.drawImage(buf, ox, oy, side, side);
    if (k < S * S) { const cell = side / S; d.strokeStyle = '#fff'; d.lineWidth = 2; d.strokeRect(ox + cur.i * cell, oy + cur.j * cell, cell, cell); }
    d.strokeStyle = 'rgba(255,255,255,.15)'; d.lineWidth = 1; d.strokeRect(ox, oy, side, side);
    d.font = `15px ${FONT}`; d.fillStyle = COL.text3; d.textAlign = 'left'; d.textBaseline = 'top';
    d.fillText(T('a imagem, pixel a pixel', 'the image, pixel by pixel'), ox + 6, oy + 6);
    const hit = cur.q <= 1;
    const psi = hit ? RT.psiAt(Tb, cur.q) : NaN;
    out.innerHTML = `<span>pixel <b>(${cur.i}, ${cur.j})</b></span><span>b <b>${fmt(b, 2)} R<sub>S</sub></b></span>
      <span>${hit ? `${T('acerta a superfície', 'hits the surface')} · α <b>${fmt(Math.asin(cur.q) * 180 / Math.PI, 0)}°</b> · ψ <b>${fmt(psi * 180 / Math.PI, 0)}°</b>` : `<b>${T('escapa: céu', 'escapes: sky')}</b>`}</span>
      <span>${T('pronto', 'done')} <b>${Math.round(100 * Math.min(k, S * S) / (S * S))}%</b></span>`;
  }
  let acc = 0;
  function tick(dt) {
    if (k < S * S) {
      // começa devagar (dá para seguir os raios) e acelera
      const rate = PIX_S * (1 + 60 * k / (S * S));
      acc += dt * rate; const n = Math.floor(acc); acc -= n;
      if (n > 0) { reveal(n); trail.push(pixelInfo(Math.min(k, S * S - 1)).b); if (trail.length > 14) trail.shift(); }
    } else { hold += dt; if (hold > 3) { hold = 0; k = 0; trail = []; shown.data.fill(0); } }
    render();
  }
  loopOn(cv, tick, () => { reveal(S * S); render(); });
  onSlide(cv, () => { if (!cv.closest('.slide').classList.contains('active')) render(); });
})();

/* A aparência de uma estrela compacta: a mesma estrela (grade de 30°, calota norte âmbar,
   sul turquesa) sem gravidade e ray-traced pela integral exata, girando devagar. */
(() => {
  const cvF = document.getElementById('globe-flat'); if (!cvF) return;
  const cvG = document.getElementById('globe-gr'), out = document.getElementById('globe-out');
  const S = 300, imgF = new ImageData(S, S), imgG = new ImageData(S, S), buf = document.createElement('canvas'); buf.width = buf.height = S;
  let mapF = null, mapG = null, key = '', rot = 0;
  const getR = bindRange('globe-R', v => fmt(v, 2), () => render());
  const getI = bindRange('globe-i', v => Math.round(v) + '°', () => render());
  function render() {
    const R = getR(), inc = getI() * Math.PI / 180, kk = R.toFixed(3) + '|' + inc.toFixed(3);
    if (kk !== key) { mapF = RT.pixelMap(S, R, 'flat', inc); mapG = RT.pixelMap(S, R, 'exact', inc); key = kk; }
    const Tb = RT.table(R), gr = 1 / Math.sqrt(1 - 1 / R);
    RT.paint(imgF, mapF, rot); RT.paint(imgG, mapG, rot);
    [[cvF, imgF, 1, T('sem gravidade', 'without gravity')], [cvG, imgG, gr, T('com gravidade (integral exata)', 'with gravity (exact integral)')]].forEach(([cv, img, scale, lab]) => {
      const { ctx, w, h } = fitCanvas(cv), base = Math.min(w, h) * 0.36;
      RT.blit(ctx, img, buf, w / 2, h / 2 + 8, base * scale);
      ctx.font = `16px ${FONT}`; ctx.fillStyle = COL.text2; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(lab, w / 2, 6);
      if (scale > 1) { ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w / 2, h / 2 + 8, base, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = COL.text3; ctx.font = `14px ${FONT}`; ctx.textBaseline = 'bottom'; ctx.fillText(T('tracejado: o tamanho sem gravidade', 'dashed: the size without gravity'), w / 2, h - 4); }
    });
    const vis = Tb.max >= Math.PI ? 1 : (1 - Math.cos(Tb.max)) / 2;
    out.innerHTML = `<span>R <b>${fmt(R, 2)} R<sub>S</sub></b></span><span>ψ<sub>${T('máx', 'max')}</sub> <b>${fmt(Tb.max * 180 / Math.PI, 1)}°</b></span>
      <span>${T('superfície visível', 'visible surface')} <b>${Math.round(100 * vis)}%</b> ${T('(sem gravidade: 50%)', '(without gravity: 50%)')}</span>
      <span>${T('raio aparente', 'apparent radius')} <b>${fmt(gr, 2)}×</b></span>
      <span>${Tb.max > Math.PI ? `<b style="color: var(--warn)">${T('o polo de trás aparece como anel', 'the far pole shows up as a ring')}</b>` : ''}</span>`;
  }
  loopOn(cvF, dt => { rot += dt * 2 * Math.PI / 14; render(); }, () => { rot = 0.6; render(); });
  onSlide(cvF, () => { if (!cvF.closest('.slide').classList.contains('active')) render(); });
})();

/* O espectro que sai do poço: corpo negro (fluxo de energia por unidade de energia, ∝ E³/(e^{E/kT} − 1))
   com uma linha de absorção genérica em E₀ = 0,5 keV na superfície; visto de longe,
   I_obs(E) = g³ I(E/g) com g = √(1 − R_S/R). */
(() => {
  const cv = document.getElementById('espectro'); if (!cv) return;
  const out = document.getElementById('esp-out'), E0 = 0.5, W = 0.035, DEPTH = 0.45;
  const getR = bindRange('esp-R', v => fmt(v, 2), draw);
  const getT = bindRange('esp-T', v => fmt(v, 3) + ' keV', draw);
  const Iem = (E, kT) => E ** 3 / (Math.exp(E / kT) - 1) * (1 - DEPTH * Math.exp(-0.5 * ((E - E0) / W) ** 2));
  function draw() {
    const R = getR(), kT = getT(), g = Math.sqrt(1 - 1 / R), xmax = Math.max(1.2, 9 * kT);
    const Es = linspace(0.005, xmax, 600), em = Es.map(E => Iem(E, kT)), ob = Es.map(E => g ** 3 * Iem(E / g, kT));
    const pk = Math.max(...em);
    const P = new Plot(cv, { x: [0, xmax], y: [0, 1.12], m: [22, 26, 64, 70], fs: 16, yticks: [0, 0.5, 1] });
    P.begin().frame(T('energia (keV)', 'energy (keV)'), T('fluxo por keV (relativo)', 'flux per keV (relative)'));
    P.clip();
    P.area(Es, ob.map(v => v / pk), 0, { color: COL.bn, alpha: 0.16 });
    P.line(Es, em.map(v => v / pk), { color: 'rgba(255,255,255,.55)', width: 2, dash: [7, 6] });
    P.line(Es, ob.map(v => v / pk), { color: COL.bn, width: 3.4, glow: 12 });
    P.vline(E0, { color: 'rgba(255,255,255,.45)', label: T('linha na superfície', 'line at the surface'), y: P.T + 6 });
    P.vline(g * E0, { color: COL.sol, label: T('linha observada', 'observed line'), side: 'left', y: P.T + 30 });
    P.unclip();
    P.text(xmax * 0.97, 1.04, T('tracejado: na superfície · cheio: no infinito', 'dashed: at the surface · solid: at infinity'), { color: COL.text3, size: 15, align: 'right' });
    out.innerHTML = `<span>g <b>${fmt(g, 3)}</b></span><span>z <b>${fmt(1 / g - 1, 3)}</b></span>
      <span>${T('linha', 'line')} <b>${fmt(E0, 2)} → ${fmt(g * E0, 3)} keV</b></span>
      <span>kT<sub>∞</sub> <b>${fmt(g * kT, 3)} keV</b></span><span>R<sub>∞</sub> <b>${fmt(1 / g, 2)} R</b></span><span>L<sub>∞</sub>/L <b>${fmt(g * g, 2)}</b></span>`;
  }
  onSlide(cv, draw);
})();
