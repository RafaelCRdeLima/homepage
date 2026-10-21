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
/* texto no canvas com subscritos de uma letra: “r_s”, “R_S” (usa a fonte e a cor correntes) */
function subText(c, s, x, y, size, align = 'left') {
  const parts = s.split(/_(\w)/), f0 = c.font, f1 = f0.replace(/(\d+)px/, (_, n) => Math.round(n * 0.7) + 'px'), al = c.textAlign;
  let W = 0; parts.forEach((q, i) => { c.font = i % 2 ? f1 : f0; W += c.measureText(q).width; });
  let x0 = align === 'right' ? x - W : align === 'center' ? x - W / 2 : x;
  c.textAlign = 'left';
  parts.forEach((q, i) => { c.font = i % 2 ? f1 : f0; c.fillText(q, x0, y + (i % 2 ? 0.3 * size : 0)); x0 += c.measureText(q).width; });
  c.font = f0; c.textAlign = al;
}


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
   num comparador de piscar, em escala real. Estrelas do Tycho-2 (V < 10,6) levadas a 1919,4 pelo
   movimento próprio, no plano tangente em volta do Sol daquela manhã (11h40 TU; Meeus, precessado
   para J2000): ξ para leste, η para norte, em minutos de arco; nomes do BSC e números HD do Hipparcos.
   A chapa tem a orientação da placa do slide anterior (ESO potw1926a), ajustada pelas seis estrelas
   marcadas nela: resíduos de 2 px, e o Sol cai no centro do disco.
   Cada estrela se afasta do Sol, na radial, δ = 4GM/(c²b) = 1,7505″ θ☉/θ (Newton: a metade). Na chapa
   inteira isso é um décimo de pixel. As três lupas mostram 6″ de céu em volta de uma estrela, sem
   exagero, como no micrômetro: a imagem da estrela (gaussiana que a emulsão satura; a largura é escolha,
   ~2″ é estimativa) pula uma fração da própria largura. Escala da chapa da lente de 4 polegadas de
   Sobral (19 pés = 5,79 m de focal): 1″ = 28,1 µm. */
(() => {
  const cv = document.getElementById('sobral'); if (!cv) return;
  const out = document.getElementById('sobral-out');
  const STARS = [
    [-4.32, 36.87, 4.2, 'κ¹ Tau'], [8.67, 68.07, 4.3, 'υ Tau'], [-118.10, -65.27, 4.9, 'ω² Tau'], [-3.67, 31.24, 5.3, 'κ² Tau'],
    [-84.45, 6.06, 5.3, '56 Tau'], [-87.30, -31.80, 5.5, '53 Tau'], [22.38, 79.02, 5.5, '72 Tau'], [-101.76, -5.42, 5.6, '51 Tau'],
    [32.54, -3.51, 5.7, 'HR 1403'], [-29.87, -41.81, 6.0, 'HR 1375'], [-46.16, -51.43, 6.0, 'HR 1370'],
    [125.76, 61.72, 6.8, 'HD 28976'], [-58.15, -38.20, 6.8, 'HD 27524'], [-26.72, 77.14, 7.0, 'HD 27760'], [-57.13, -29.35, 7.1],
    [65.23, -110.16, 7.1, 'HD 28483'], [76.44, 100.38, 7.1, 'HD 28581'], [90.11, -2.41, 7.1, 'HD 28676'],
    [-20.05, 3.44, 7.1, 'HD 27808'], [64.68, 114.81, 7.2, 'HD 28482'], [-77.26, 115.57, 7.2, 'HD 27370'],
    [8.76, -12.54, 7.3, 'HD 28033'], [19.13, -110.23, 7.5, 'HD 28138'], [81.91, 70.34, 7.5, 'HD 28621'],
    [-102.75, 68.28, 7.6, 'HD 27160'], [42.56, -60.07, 7.7, 'HD 28304'], [-87.03, -103.58, 7.9, 'HD 27311'],
    [-16.35, 63.74, 8.0, 'HD 27832'], [127.51, -33.65, 8.0], [-4.83, 126.53, 8.1, 'HD 27923'], [-108.47, 41.14, 8.2, 'HD 27129'],
    [-93.02, -22.32, 8.2, 'HD 27249'], [138.30, 21.57, 8.2, 'HD 29097'], [46.45, 14.43, 8.4, 'HD 28343'],
    [-56.02, -132.62, 8.4, 'HD 27560'], [-117.37, -69.31, 8.4, 'HD 284337'], [124.90, -33.55, 8.4, 'HD 28966'],
    [1.72, -32.57, 8.5, 'HD 27973'], [-32.14, -29.74, 8.5], [-94.77, -105.93, 8.6, 'HD 27250'], [20.33, -41.28, 8.6, 'HD 28137'],
    [-30.34, -47.63, 8.6], [78.64, -92.47, 8.6, 'HD 28593'], [41.54, -116.28, 8.6, 'HD 28291'], [62.34, -41.62, 8.6],
    [-85.54, -36.49, 8.6, 'HD 27310'], [35.14, 39.23, 8.7, 'HD 28249'], [41.52, -50.79, 8.8], [21.02, 110.02, 8.8],
    [-23.10, -8.34, 8.8], [-46.39, 59.11, 8.8, 'HD 27627'], [-32.24, -17.97, 8.9, 'HD 27732'], [122.91, 62.76, 8.9],
    [86.99, -2.27, 8.9], [15.20, 81.20, 8.9], [-10.00, -97.43, 8.9], [2.43, 113.04, 9.0], [-141.05, -22.83, 9.0],
    [39.45, 89.04, 9.1], [-127.01, 14.62, 9.1], [83.96, -53.42, 9.1], [-94.99, 39.33, 9.2], [-17.90, -103.13, 9.2],
    [107.44, -0.13, 9.2], [-22.00, -121.63, 9.2], [-111.89, 35.56, 9.2], [-1.27, 115.62, 9.3], [-12.04, -34.47, 9.3],
    [-113.46, 86.69, 9.3], [-32.50, -121.25, 9.4], [-2.40, -119.30, 9.4], [55.90, -122.26, 9.4], [-103.40, 97.00, 9.5],
    [-1.94, -115.01, 9.5], [-51.11, 34.71, 9.5], [101.93, -14.98, 9.5], [-44.13, 100.05, 9.5], [-26.64, -17.01, 9.5],
    [-35.03, -28.16, 9.5], [-36.20, -52.42, 9.5], [-68.60, 76.44, 9.6], [-25.43, 136.79, 9.6], [-4.75, 55.03, 9.6],
    [143.20, -11.56, 9.6], [-15.64, -102.75, 9.7], [21.76, 18.07, 9.7], [-67.86, 33.35, 9.7], [59.83, -49.39, 9.7],
    [45.20, 32.90, 9.7], [-1.35, 88.24, 9.7], [-64.23, 80.02, 9.7], [46.94, 68.32, 9.8], [99.08, -92.14, 9.8],
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
  const LUPA = 6, UM = 28.1;                                            // campo de cada lupa (″); µm por ″ na chapa de 4 pol.
  const HOLD = 1.4, FADE = 0.35, PER = 2 * (HOLD + FADE);
  const rot = (x, y) => [x * Math.cos(ROT) - y * Math.sin(ROT), x * Math.sin(ROT) + y * Math.cos(ROT)];
  const S = STARS.map(([xi, eta, V, name]) => { const [x, y] = rot(-xi, eta); return { x, y, th: Math.hypot(xi, eta), V, name }; });
  // as estrelas das lupas, da mais antiga para a mais nova: um clique troca a mais antiga
  let queue = ['HD 28343', '72 Tau', 'κ² Tau'].map(nm => S.findIndex(s => s.name === nm));
  let t = 0, cor = null, corN = 0, grain = null, grainKey = '', outKey = '', lupKey = '', lup = [], geo = null;
  // no PDF (?ff) as lupas saem com as duas posições e a seta
  if (FF) document.querySelectorAll('#sobral-mode button').forEach(b => b.classList.toggle('on', b.dataset.v === 'both'));
  const getMode = bindSeg('sobral-mode', () => { t = 0; redraw(); });
  const getTh = bindSeg('sobral-th', () => redraw());
  const getW = bindRange('sobral-fwhm', v => fmt(v, 1) + '″', () => redraw());

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
  /* uma das chapas dentro de uma lupa (n×n px, LUPA″ de lado), centrada na posição da noite: a estrela
     como gaussiana que a emulsão satura um pouco (as brilhantes saem maiores), o fundo (no eclipse, a luz da coroa,
     ∝ r⁻³) e o grão, outro em cada chapa. d = deslocamento (″), para fora do Sol. */
  function plate(i, n, fwhm, d, ecl) {
    const st = S[i], c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), img = g.createImageData(n, n), px = img.data, sc = LUPA / n;
    const sg = fwhm / 2.3548, A = clamp(1.6 * 10 ** (-0.4 * (st.V - 6)), 0.9, 2.2);
    const ox = ecl ? d * st.x / st.th : 0, oy = ecl ? d * st.y / st.th : 0, bg = 0.05 + (ecl ? 0.6 * (st.th / RSUN) ** -3 : 0);
    let seed = 1 + 7919 * i + (ecl ? 104729 : 0); const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let j = 0; j < n; j++) for (let q = 0; q < n; q++) {
      const x = (q + 0.5) * sc - LUPA / 2 - ox, y = LUPA / 2 - (j + 0.5) * sc - oy;
      const v = clamp(bg + 1 - Math.exp(-A * Math.exp(-(x * x + y * y) / (2 * sg * sg))) + 0.1 * (rnd() - 0.5), 0, 1);
      const o = 4 * (j * n + q); px[o] = 236 * v; px[o + 1] = 240 * v; px[o + 2] = 250 * v; px[o + 3] = 255;
    }
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
  const nameOf = st => st.name || `${T('estrela', 'star')} V ${fmt(st.V, 1)}`;
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
    // a chapa à esquerda; as três lupas numa faixa à direita
    const rl = Math.min(74, (h - 24) / 6 - 4), LW = 2 * rl + 150, fw = w - LW;
    const k = Math.min(fw / FIELD[0], h / FIELD[1]);                      // px por ′
    const X = x => fw / 2 + (x - MID[0]) * k, Y = y => h / 2 - (y - MID[1]) * k;
    geo = { X, Y, fw };
    const sx = X(0), sy = Y(0), rS = RSUN * k, rM = RMOON * k;
    const s = m === 'night' ? 0 : m === 'blink' ? phase() : 1, both = m === 'both';
    const lim = LIMB * +getTh(), fwhm = getW();
    const sel = [...queue].sort((a, b) => Y(S[a].y) - Y(S[b].y));       // de cima para baixo, como na chapa: as linhas não se cruzam
    c.fillStyle = '#05060a'; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(0, 0, fw, h); c.clip();
    // eclipse: a luz do céu, a coroa e a Lua
    if (s > 0) {
      const n = Math.min(720, Math.round(2 * CR * rS * Math.min(2, devicePixelRatio || 1)));
      if (n !== corN) { cor = corona(n); corN = n; }
      c.save(); c.globalAlpha = s;
      const g = c.createRadialGradient(sx, sy, rS, sx, sy, Math.max(fw, h) * 0.8);
      g.addColorStop(0, 'rgba(120,130,160,.12)'); g.addColorStop(1, 'rgba(120,130,160,0)');
      c.fillStyle = g; c.fillRect(0, 0, fw, h);
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
    // as estrelas, com o deslocamento verdadeiro (um décimo de pixel)
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const st of S) {
      const a = st.th < RMOON ? 1 - s : 1;                               // atrás da Lua de verdade
      if (a <= 0) continue;
      const f = 1 + s * lim * RSUN / 60 / (st.th * st.th), D = 2.2 + 2.1 * (10.6 - st.V);
      c.globalAlpha = a * Math.min(1, 0.45 + 0.09 * (10.6 - st.V));
      c.drawImage(spr, X(st.x * f) - D, Y(st.y * f) - D, 2 * D, 2 * D);
    }
    c.restore();
    c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.textBaseline = 'middle'; c.textAlign = 'left';
    for (const st of S) {
      if (!st.name || st.name.startsWith('HD')) continue;
      const x = X(st.x), r = 9 + 1.3 * (8.6 - st.V), right = x < fw - 80;
      c.textAlign = right ? 'left' : 'right'; c.fillText(st.name, x + (right ? r : -r), Y(st.y) - (right ? 0 : 14));
    }
    // grão e vinheta
    const gk = `${Math.round(fw)}x${Math.round(h)}`;
    if (gk !== grainKey) { grain = makeGrain(fw, h); grainKey = gk; }
    c.drawImage(grain, 0, 0, fw, h);
    const v = c.createRadialGradient(fw / 2, h / 2, Math.min(fw, h) * 0.45, fw / 2, h / 2, Math.hypot(fw, h) / 2);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = v; c.fillRect(0, 0, fw, h);
    // rótulos da chapa
    if (both) chip(c, 14, 14, T('as duas · lupas: noite → eclipse', 'both · loupes: night → eclipse').toUpperCase(), COL.sol);
    else chip(c, 14, 14, (s < 0.5 ? T('noite · julho de 1919', 'night · July 1919') : T('eclipse · 29 de maio de 1919', 'eclipse · 29 May 1919')).toUpperCase());
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T('Híades, em Touro · escala real, sem exagero', 'Hyades, in Taurus · true scale, no exaggeration'), 16, 56);
    c.textBaseline = 'bottom'; c.fillText(T('clique numa estrela para pô-la numa lupa', 'click a star to put it in a loupe'), 16, h - 12);
    // bússola e escala, no canto de cima
    const cx = fw - 64, cy = 62;
    c.strokeStyle = COL.text3; c.fillStyle = COL.text3; c.lineWidth = 1.5; c.textAlign = 'center'; c.textBaseline = 'middle';
    [[rot(0, 1), 'N'], [rot(-1, 0), T('L', 'E')]].forEach(([[dx, dy], lab]) => {
      arrow(c, cx, cy, cx + 30 * dx, cy - 30 * dy); c.fillText(lab, cx + 44 * dx, cy - 44 * dy);
    });
    const bar = 30 * k, bx = fw - 18 - bar, by = 132;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + bar, by); c.moveTo(bx, by - 5); c.lineTo(bx, by + 5); c.moveTo(bx + bar, by - 5); c.lineTo(bx + bar, by + 5); c.stroke();
    c.textBaseline = 'bottom'; c.fillText('30′', bx + bar / 2, by - 6);
    c.restore();
    // as lupas: as duas chapas em volta de cada estrela, sem exagero; os fios do micrômetro na posição da noite
    const n = Math.round(2 * rl * Math.min(1.5, devicePixelRatio || 1)), key = `${n}|${fwhm}|${lim}|${sel}`;
    if (key !== lupKey) { lupKey = key; lup = sel.map(i => { const d = lim * RSUN / S[i].th; return [plate(i, n, fwhm, d, false), plate(i, n, fwhm, d, true), d]; }); }
    const lx = fw + 12 + rl, ppa = 2 * rl / LUPA;                         // px por ″ na lupa
    sel.forEach((i, j) => {
      const st = S[i], [pn, pe, d] = lup[j], ly = h * (j + 0.5) / 3;
      // a estrela na chapa e a linha até a lupa
      const zx = X(st.x), zy = Y(st.y), L = Math.hypot(zx - lx, zy - ly);
      c.strokeStyle = 'rgba(255,184,107,.85)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(zx, zy, 9 + 1.3 * Math.max(0, 8.6 - st.V), 0, 7); c.stroke();
      c.strokeStyle = 'rgba(255,184,107,.4)'; c.setLineDash([4, 5]);
      c.beginPath(); c.moveTo(zx, zy); c.lineTo(lx + (zx - lx) * rl / L, ly + (zy - ly) * rl / L); c.stroke(); c.setLineDash([]);
      c.save(); c.beginPath(); c.arc(lx, ly, rl, 0, 7); c.clip();
      c.drawImage(both ? pe : pn, lx - rl, ly - rl, 2 * rl, 2 * rl);
      if (!both && s > 0) { c.globalAlpha = s; c.drawImage(pe, lx - rl, ly - rl, 2 * rl, 2 * rl); c.globalAlpha = 1; }
      c.beginPath(); c.moveTo(lx - rl, ly); c.lineTo(lx + rl, ly); c.moveTo(lx, ly - rl); c.lineTo(lx, ly + rl);
      for (let u = -2.5; u <= 2.5; u += 0.5) if (u) { const p = u * ppa; c.moveTo(lx + p, ly - 4); c.lineTo(lx + p, ly + 4); c.moveTo(lx - 4, ly + p); c.lineTo(lx + 4, ly + p); }
      c.strokeStyle = 'rgba(8,8,20,.75)'; c.lineWidth = 3; c.stroke();                // fios escuros com borda: aparecem no claro e no escuro
      c.strokeStyle = 'rgba(158,140,255,.95)'; c.lineWidth = 1; c.stroke();
      if (both) {                                                        // a imagem da noite (tracejada) e a seta até a do eclipse
        c.setLineDash([4, 4]); c.lineWidth = 1.5; c.beginPath(); c.arc(lx, ly, fwhm / 2 * ppa, 0, 7); c.stroke(); c.setLineDash([]);
        c.strokeStyle = COL.sol; c.fillStyle = COL.sol; c.lineWidth = 2;
        arrow(c, lx, ly, lx + d * st.x / st.th * ppa, ly - d * st.y / st.th * ppa);
      }
      c.restore();
      c.strokeStyle = 'rgba(255,184,107,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(lx, ly, rl, 0, 7); c.stroke();
      // o lado do Sol, na borda
      const ux = -st.x / st.th, uy = st.y / st.th, qx = lx + ux * (rl + 1), qy = ly + uy * (rl + 1);
      c.fillStyle = '#0b0d14'; c.beginPath(); c.arc(qx, qy, 8, 0, 7); c.fill();
      c.strokeStyle = COL.sol; c.lineWidth = 1.5; c.beginPath(); c.arc(qx, qy, 6, 0, 7); c.stroke();
      c.fillStyle = COL.sol; c.beginPath(); c.arc(qx, qy, 1.8, 0, 7); c.fill();
      // o que a lupa mostra
      const tx = lx + rl + 16;
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = `600 16px ${FONT}`; c.fillStyle = COL.text; c.fillText(nameOf(st), tx, ly - 22);
      c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.fillText(`${T('a', 'at')} ${fmt(st.th / RSUN, 1)} R☉`, tx, ly);
      c.fillStyle = COL.sol; c.fillText(`δ ${fmt(d, 2)}″ · ${Math.round(d * UM)} µm`, tx, ly + 22);
    });
    const okey = `${lim}|${k.toFixed(3)}|${ppa.toFixed(1)}`;
    if (okey !== outKey) {
      outKey = okey;
      out.innerHTML = `<span>${T('na chapa da lente de 4 pol.', 'on the 4-inch lens plate')} 1″ = <b>${Math.round(UM)} µm</b></span>
        <span>${T('na tela', 'on screen')} 1″ = <b>${fmt(k / 60, 2)} px</b>, ${T('na lupa', 'in a loupe')} <b>${Math.round(ppa)} px</b></span>
        <span>${T('Sobral mediu', 'Sobral measured')} <b>${fmt(1.98, 2)} ± ${fmt(0.12, 2)}″</b></span>`;
    }
  }
  function pick(px, py) {                                                // a estrela da chapa mais perto do clique
    if (!geo || px > geo.fw) return -1;
    let best = -1, bd = 14;
    S.forEach((st, i) => {
      if (st.th < RMOON || st.V > 10) return;
      const dd = Math.hypot(geo.X(st.x) - px, geo.Y(st.y) - py); if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }
  cv.addEventListener('click', e => { const i = pick(...canvasPoint(cv, e)); if (i < 0 || queue.includes(i)) return; queue = [...queue.slice(1), i]; redraw(); });
  cv.addEventListener('pointermove', e => { cv.style.cursor = pick(...canvasPoint(cv, e)) >= 0 ? 'pointer' : ''; });
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

/* Compacidade: o raio do objeto contra o raio de Schwarzschild da sua massa, r_s = 2GM/c², e o que a
   razão r_s/R decide. À esquerda, um zoom em potências de dez do objeto inteiro até r_s (a Terra caberia
   numa bola de 9 mm de raio); à direita, as contas para quem está parado na superfície, comparado a quem
   está no infinito: escape √(r_s/R) c, g = GM/R² (1 − r_s/R)^−½, z = (1 − r_s/R)^−½ − 1, o relógio, o desvio
   de um raio rasante pela integral exata da órbita e a fração da superfície vista de longe, (1 + sen(δ/2))/2
   enquanto δ ≤ π. Embaixo, a régua de r_s/R. Nasceu do painel de compacidade do seminário de neutrinos;
   os objetos passam sozinhos até o primeiro clique. */
(() => {
  const cv = document.getElementById('compact-zoom'); if (!cv) return;
  const cvS = document.getElementById('compact-scale'), tab = document.getElementById('compact-tab'), seg = document.getElementById('compact-sel');
  const RS1 = 2953.25, C = 2.99792458e8, G0 = 9.80665, RNS = 1.4 * RS1;     // r_s do Sol (m); m/s; m/s²; r_s de 1,4 M☉
  const MS = v => `${fmt(v, v === 1 ? 0 : 2).replace(/[,.]?0+$/, '')} M☉`;
  const OBJ = [
    { n: T('Terra', 'Earth'), rs: 8.870e-3, R: 6.371e6, M: T('5,97×10²⁴ kg', '5.97×10²⁴ kg'), col: [90, 150, 255],
      cap: T('comprimida até r_s, a Terra seria um buraco negro do tamanho de uma bola de gude', 'squeezed down to r_s, the Earth would be a black hole the size of a marble') },
    { n: T('Sol', 'Sun'), rs: RS1, R: 6.957e8, M: MS(1), col: [255, 184, 107],
      cap: T('comprimido até r_s, o Sol caberia numa cidade: 6 km de diâmetro', 'squeezed down to r_s, the Sun would fit in a town: 6 km across') },
    { n: 'Sirius B', rs: 1.02 * RS1, R: 5.84e6, M: MS(1.02), col: [200, 215, 255],
      cap: T('uma anã branca: o tamanho da Terra com a massa do Sol', 'a white dwarf: the size of the Earth with the mass of the Sun') },
    { n: T('proto-estrela de nêutrons', 'proto-neutron star'), s: T('proto-EN', 'proto-NS'), rs: RNS, R: 3e4, M: MS(1.4), col: [255, 130, 90],
      cap: T('a estrela de nêutrons recém-nascida, ainda inchada: R ≈ 7 r_s', 'the newborn neutron star, still puffed up: R ≈ 7 r_s') },
    { n: T('estrela de nêutrons', 'neutron star'), s: T('est. nêutrons', 'neutron star'), rs: RNS, R: 1.2e4, M: MS(1.4), col: [86, 225, 208],
      cap: T('R ≈ 3 r_s: a luz que sai da superfície sente a métrica inteira', 'R ≈ 3 r_s: light leaving the surface feels the full metric') },
    { n: 'ISCO', rs: RNS, R: 3 * RNS, M: MS(1.4), ring: true,
      cap: T('uma estrela de 1,4 M☉ do tamanho da última órbita circular estável', 'a 1.4 M☉ star as small as the innermost stable circular orbit') },
    { n: T('esfera de fótons', 'photon sphere'), s: T('esf. fótons', 'photon sph.'), rs: RNS, R: 1.5 * RNS, M: MS(1.4), ring: true,
      cap: T('do tamanho da esfera de fótons: a luz rasante fica em órbita', 'as small as the photon sphere: grazing light stays in orbit') },
    { n: T('horizonte', 'horizon'), rs: RNS, R: RNS, M: MS(1.4), ring: true,
      cap: T('R = r_s: nada sai, nem a luz — um buraco negro', 'R = r_s: nothing gets out, not even light — a black hole') },
  ];
  const HOLD0 = 0.9, ZT = 2.6, CYCLE = 6.5;                                   // s parado, s de zoom, s por objeto
  let sel = 0, auto = !FF, tz = FF ? 99 : 0;                                // no PDF: a Terra já no fim do zoom
  seg.innerHTML = OBJ.map((o, i) => `<button type="button" data-k="${i}" class="${i === sel ? 'on' : ''}">${o.s || o.n}</button>`).join('');
  function pick(k, user) {
    sel = k; tz = 0; if (user) auto = false;
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === sel));
    table(); redraw();
  }
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(+b.dataset.k, true); });

  const p3 = v => String(+v.toPrecision(3)).replace('.', DEC);
  const len = v => v >= 1e3 ? (v >= 1e5 ? grp(v / 1e3) : p3(v / 1e3)) + ' km' : v >= 1 ? p3(v) + ' m' : v >= 0.01 ? p3(v * 100) + ' cm' : p3(v * 1e3) + ' mm';
  const small = v => v < 1e-3 ? sci(v, 2) : p3(v);
  const dur = s => s < 1e-3 ? p3(s * 1e6) + ' μs' : s < 1 ? p3(s * 1e3) + ' ms' : s < 60 ? p3(s) + ' s' : s < 3600 ? p3(s / 60) + ' min' : p3(s / 3600) + ' h';
  const deflect = x => {                     // desvio exato de um raio rasante à superfície r = R (r_s = 1)
    const R = 1 / x; if (R <= 1.5) return Infinity;
    if (x < 1e-3) return 2 * x + (15 * Math.PI / 16 - 1) * x * x;   // campo fraco: a quadratura perderia a precisão
    const u0 = 1 / R, ib2 = u0 * u0 * (1 - u0);  // 1/b² com ponto de retorno em R
    let s = 0; const n = 4000;
    for (let i = 0; i < n; i++) {             // u = u0 (1 − t²): regular no ponto de retorno
      const t = (i + .5) / n, u = u0 * (1 - t * t), g = ib2 - u * u + u * u * u;
      s += 2 * u0 * t / Math.sqrt(Math.max(g, 1e-300)) / n;
    }
    return 2 * s - Math.PI;
  };

  // a tabela muda só com o objeto
  function table() {
    const o = OBJ[sel], x = o.rs / o.R, gm = o.rs * C * C / 2;
    const z = x < 1 ? 1 / Math.sqrt(1 - x) - 1 : Infinity, g = x < 1 ? gm / (o.R * o.R) / Math.sqrt(1 - x) / G0 : Infinity;
    const v = Math.sqrt(Math.min(x, 1)), lost = (1 - Math.sqrt(Math.max(0, 1 - x))) * 86400, df = deflect(x);
    const vis = x >= 1 ? NaN : !isFinite(df) || df >= Math.PI ? 1 : (1 + Math.sin(df / 2)) / 2;
    const sec = s => (s < 0.01 ? sci(s, 1) : p3(s)) + '″';
    const rows = [
      [T('massa · raio', 'mass · radius'), `${o.M} · ${len(o.R)}`],
      [T('raio de Schwarzschild', 'Schwarzschild radius') + ', <i>r</i><sub>s</sub> = 2<i>GM</i>/<i>c</i>²', len(o.rs), true],
      [T('compacidade', 'compactness') + ', <i>r</i><sub>s</sub>/<i>R</i>', small(x), true],
      [T('velocidade de escape', 'escape velocity'), v >= 1 ? 'c' : v < 0.05 ? p3(v * C / 1e3) + ' km/s' : fmt(v, 2) + ' c'],
      [T('gravidade na superfície', 'surface gravity'), isFinite(g) ? (g < 1e3 ? p3(g) : sci(g, 1)) + ' g' : '∞'],
      [T('desvio para o vermelho', 'redshift') + ', <i>z</i>', isFinite(z) ? small(z) : '∞'],
      [T('o relógio da superfície atrasa', 'the surface clock loses'), x >= 1 ? T('parado', 'stopped') : dur(lost) + T(' por dia', ' per day')],
      [T('desvio de um raio rasante', 'grazing-ray deflection'), isFinite(df) ? (df / deg < 1 ? sec(df / deg * 3600) : (df / deg).toFixed(0) + '°') : x >= 1 ? T('captura', 'captured') : T('∞: fica em órbita', '∞: it orbits')],
      [T('superfície vista de longe', 'surface seen from afar'), isNaN(vis) ? '—' : vis >= 0.9995 ? '100%' : vis - 0.5 < 1e-3 ? `50% + ${sci((vis - 0.5) * 100, 1)}%` : fmt(vis * 100, 1) + '%'],
    ];
    tab.innerHTML = rows.map(([a, b, hl]) => `<tr${hl ? ' class="hl"' : ''}><td>${a}</td><td class="n">${b}</td></tr>`).join('');
  }

  // a régua de r_s/R, embaixo; um clique nela também escolhe
  const P = new Plot(cvS, { x: [1e-10, 1.5], y: [0, 1], xlog: true, m: [4, 24, 28, 74], fs: 15, yticks: [], xticks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1] });
  function strip() {
    P.begin(); const c = P.ctx;
    [[1e-10, 1e-5, T('Newton basta', 'Newton is enough'), 'rgba(255,255,255,.03)'], [1e-5, 0.05, T('correções pós-newtonianas', 'post-Newtonian corrections'), 'rgba(158,140,255,.06)'], [0.05, 1.5, T('RG plena', 'full GR'), 'rgba(158,140,255,.16)']]
      .forEach(([a, b, t, f]) => { c.fillStyle = f; c.fillRect(P.X(a), P.T, P.X(b) - P.X(a), P.B - P.T); P.text(Math.sqrt(a * b), 0.8, t, { color: COL.text3, align: 'center', size: 15 }); });
    P.frame(null, null);
    c.font = `16px ${FONT}`; c.fillStyle = COL.text2; c.textBaseline = 'middle'; subText(c, 'r_s / R', P.L - 14, (P.T + P.B) / 2, 16, 'right');
    OBJ.forEach((o, i) => { if (i !== sel) P.dot(o.rs / o.R, 0.3, { color: COL.text3, r: 4, glow: 0 }); });
    const o = OBJ[sel];
    P.dot(o.rs / o.R, 0.3, { color: COL.rt, r: 8, glow: 18 });
  }
  cvS.addEventListener('click', e => {
    const [px] = canvasPoint(cvS, e); let best = 0;
    OBJ.forEach((o, i) => { if (Math.abs(P.X(o.rs / o.R) - px) < Math.abs(P.X(OBJ[best].rs / OBJ[best].R) - px)) best = i; });
    pick(best, true);
  });

  // o zoom: o objeto com raio 0,4 do quadro; amplia (em escala log) até r_s ocupar 0,22 do quadro
  function draw() {
    const o = OBJ[sel], x = o.rs / o.R, [r, g, b] = o.col || [158, 140, 255];
    const { ctx: c, w, h } = fitCanvas(cv), m = Math.min(w, h), cx = w / 2, cy = h / 2 + 10, diag = Math.hypot(w, h);
    const zEnd = x >= 0.15 ? 1 : 0.22 / (0.4 * x), u = smooth(HOLD0, HOLD0 + ZT, tz), Z = Math.exp(Math.log(zEnd) * u);
    const S = 0.4 * m / o.R * Z, Rp = o.R * S, rp = o.rs * S;              // px por metro; raios na tela
    c.fillStyle = '#06070c'; c.fillRect(0, 0, w, h);
    // o objeto (as três marcas da RG são só raios: tracejado)
    if (o.ring) {
      if (Rp < 3 * diag) { c.strokeStyle = 'rgba(158,140,255,.75)'; c.lineWidth = 2; c.setLineDash([8, 7]); c.beginPath(); c.arc(cx, cy, Rp, 0, 7); c.stroke(); c.setLineDash([]); }
    } else if (Rp > 2 * diag) {
      c.fillStyle = `rgba(${r},${g},${b},.2)`; c.fillRect(0, 0, w, h);
    } else {
      const gr = c.createRadialGradient(cx, cy, 0, cx, cy, Rp);
      gr.addColorStop(0, `rgba(${r},${g},${b},.2)`); gr.addColorStop(0.8, `rgba(${r},${g},${b},.22)`); gr.addColorStop(1, `rgba(${r},${g},${b},.42)`);
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, Rp, 0, 7); c.fill();
      c.strokeStyle = `rgba(${r},${g},${b},.9)`; c.lineWidth = 2; c.shadowColor = `rgb(${r},${g},${b})`; c.shadowBlur = 16; c.stroke(); c.shadowBlur = 0;
    }
    // r_s: a esfera em que essa massa vira buraco negro
    if (rp >= 1.5) {
      c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, rp, 0, 7); c.fill();
      c.strokeStyle = COL.rt; c.lineWidth = 2; c.shadowColor = COL.rt; c.shadowBlur = 14; c.stroke(); c.shadowBlur = 0;
    } else {
      c.strokeStyle = COL.rt; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.arc(cx, cy, 9, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = COL.rt; c.beginPath(); c.arc(cx, cy, 1.5, 0, 7); c.fill();
    }
    // rótulos dos dois raios
    c.font = `16px ${FONT}`; c.textBaseline = 'middle';
    if (Rp < 0.48 * m && !(o.ring && Math.abs(Rp - rp) < 4)) {
      const a = -35 * deg, ex = cx + Rp * Math.cos(a), ey = cy + Rp * Math.sin(a);
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx + Math.max(rp, 9) * Math.cos(a), cy + Math.max(rp, 9) * Math.sin(a)); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = COL.text; c.textAlign = 'left'; c.fillText(`R = ${len(o.R)}`, ex + 10, ey - 8);
    } else if (!o.ring || Rp >= 0.48 * m) {
      c.fillStyle = COL.text3; c.textAlign = 'right'; c.fillText(`R = ${len(o.R)} · ${T('a borda está fora do quadro', 'the edge is off the frame')}`, w - 12, 18);
    }
    const ra = Math.max(rp, 9), lx = cx - ra - 14;
    c.strokeStyle = 'rgba(158,140,255,.8)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx - ra, cy); c.lineTo(lx + 4, cy); c.stroke();
    c.fillStyle = COL.rt; subText(c, `r_s = ${len(o.rs)}`, lx, cy, 16, 'right');
    // a legenda, quando o zoom termina
    const fin = smooth(HOLD0 + ZT - 0.4, HOLD0 + ZT + 0.3, tz);
    c.font = `600 18px ${FONT}`; c.fillStyle = COL.text; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(o.n, 12, 10);
    if (fin > 0) { c.globalAlpha = fin; c.font = `16px ${FONT}`; c.fillStyle = COL.text2; subText(c, o.cap, 12, 36, 16); c.globalAlpha = 1; }
    // escala e zoom
    const tgt = w * 0.2 / S, e10 = 10 ** Math.floor(Math.log10(tgt)), L = [5, 2, 1].map(f => f * e10).find(v => v <= tgt), bl = L * S, by = h - 16;
    c.strokeStyle = COL.text2; c.lineWidth = 1.5; c.beginPath(); c.moveTo(14, by); c.lineTo(14 + bl, by); c.moveTo(14, by - 5); c.lineTo(14, by + 5); c.moveTo(14 + bl, by - 5); c.lineTo(14 + bl, by + 5); c.stroke();
    c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(len(L), 14 + bl / 2, by - 7);
    c.textAlign = 'right'; c.fillStyle = Z > 1.01 ? COL.rt : COL.text3; c.fillText(`zoom ×${Z < 100 ? p3(Z) : sci(Z, 1)}`, w - 12, h - 9);
    strip();
  }
  const slide = cv.closest('.slide');
  // registrado antes de loopOn: o passeio recomeça na Terra antes do primeiro quadro da visita
  addEventListener('slidechange', () => { if (slide.classList.contains('active') && auto && !reduceMotion) { sel = 0; tz = 0; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === 0)); table(); } });
  const still = () => { tz = 99; draw(); };
  function redraw() { if (reduceMotion || document.body.classList.contains('overview')) still(); else draw(); }
  loopOn(cv, dt => { tz += dt; if (auto && tz > CYCLE) pick((sel + 1) % OBJ.length); draw(); }, still);
  onSlide(cv, () => { if (!slide.classList.contains('active')) still(); });
  table();
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

/* Os dois slides de ray tracing: a ideia ingênua (da estrela para a câmera) e o método (da câmera para
   a estrela). Mesma estrela de sempre, R = 2,42 R_S (1,4 M☉ e 10 km), eixo inclinado de 60°, e uma câmera
   pontual parada em r = D = 13 R_S, com abertura de raio A = 0,35 R_S. Um raio que sai da câmera a um
   ângulo θ do centro da estrela tem b = D sen θ / √(1 − 1/D); se b ≤ b_max ele acerta a superfície depois
   de varrer ψ_D(b) = ∫ du/√(1/b² − u²(1 − u)), de 1/D a 1/R — o mesmo ângulo que a luz varre, no sentido
   contrário, da superfície até a câmera. A imagem é o mapa inverso com esse ψ_D. */
const CAM = (() => {
  const R = 2.42, D = 13, A = 0.35, INC = 60 * deg, S = 56, FIELD = 1.25;
  const U = 1 / R, U0 = 1 / D, bmax = R / Math.sqrt(1 - U), kD = Math.sqrt(1 - U0);
  const thMax = Math.asin(bmax * kD / D), thF = FIELD * thMax;          // raio angular da estrela e do campo
  function psiD(b) {                                                    // u = U − (U − U0) t²: regular no raio rasante
    if (b <= 0) return 0;
    const ib2 = 1 / (b * b), N = 360; let s = 0;
    for (let k = 0; k < N; k++) { const t = (k + 0.5) / N, u = U - (U - U0) * t * t, g = ib2 - u * u * (1 - u); s += 2 * (U - U0) * t / Math.sqrt(Math.max(g, 1e-300)) / N; }
    return s;
  }
  const TB = { n: 361, psi: new Float64Array(361) };
  for (let i = 0; i < TB.n; i++) TB.psi[i] = psiD(Math.sin(i / (TB.n - 1) * Math.PI / 2) * bmax);
  const psiQ = q => RT.psiAt(TB, q);                                    // q = b/b_max = sen α na superfície
  const bOf = th => D * Math.sin(th) / kD, thOf = b => Math.asin(Math.min(1, b * kD / D));
  // pixel k ↔ direção na câmera: ângulo θ ao centro da estrela e direção ê no plano da imagem
  const pixDir = k => { const i = k % S, j = Math.floor(k / S), px = (i + 0.5) / S * 2 - 1, py = 1 - (j + 0.5) / S * 2, r = Math.hypot(px, py); return { i, j, th: r * thF, ex: px / r, ey: py / r }; };
  const pixOf = (th, ex, ey) => { const i = Math.floor((th / thF * ex + 1) / 2 * S), j = Math.floor((1 - th / thF * ey) / 2 * S); return i >= 0 && i < S && j >= 0 && j < S ? j * S + i : -1; };
  // a imagem pronta: o mapa inverso com ψ_D, pintado como as outras estrelas; céu escuro fora do disco
  const map = { S, nx: new Float32Array(S * S), ny: new Float32Array(S * S), nz: new Float32Array(S * S), ok: new Uint8Array(S * S) };
  const si = Math.sin(INC), ci = Math.cos(INC);
  for (let k = 0; k < S * S; k++) {
    const { th, ex, ey } = pixDir(k), q = bOf(th) / bmax;
    if (q > 1) continue;
    const p = psiQ(q), sp = Math.sin(p), oy = sp * ey, oz = Math.cos(p);
    map.nx[k] = sp * ex; map.ny[k] = oy * ci - oz * si; map.nz[k] = oy * si + oz * ci; map.ok[k] = 1;
  }
  const full = new ImageData(S, S); RT.paint(full, map, 0.4, { w: 0.06 });
  for (let k = 0; k < S * S; k++) if (!map.ok[k]) full.data.set([12, 14, 26, 255], 4 * k);
  /* geodésica no plano (RK4 em φ, u = 1/r) a partir de (1/u0, 0), com du/dφ = v0: para ao tocar a superfície
     indo para dentro, ao passar de rOut indo para fora (os dois pontos interpolados) ou depois de 1,5 volta.
     Devolve os pontos em R_S e o comprimento acumulado, para animar a cabeça a velocidade constante. */
  function trace(u0, v0, rOut) {
    const f = x => -x + 1.5 * x * x, uOut = 1 / rOut, pts = [[1 / u0, 0]];
    let u = u0, v = v0, phi = 0, end = 'escape';
    for (let k = 0; k < 8000; k++) {
      const h = Math.min(0.01, 0.008 / Math.max(Math.abs(v), 1e-9));
      const k1u = v, k1v = f(u), k2u = v + 0.5 * h * k1v, k2v = f(u + 0.5 * h * k1u), k3u = v + 0.5 * h * k2v, k3v = f(u + 0.5 * h * k2u), k4u = v + h * k3v, k4v = f(u + h * k3u);
      const un = u + h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u), vn = v + h / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
      if (un >= U && v > 0) { const p = phi + h * (U - u) / (un - u); pts.push([R * Math.cos(p), R * Math.sin(p)]); end = 'hit'; break; }
      if (un <= uOut && v < 0) { const p = phi + h * (u - uOut) / (u - un); pts.push([rOut * Math.cos(p), rOut * Math.sin(p)]); break; }
      u = un; v = vn; phi += h;
      if (phi > 3 * Math.PI) { end = 'orbit'; break; }
      pts.push([Math.cos(phi) / u, Math.sin(phi) / u]);
    }
    return withLen({ pts, end });
  }
  function withLen(r) { const c = [0]; for (let i = 1; i < r.pts.length; i++) c.push(c[i - 1] + Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1])); r.cum = c; r.len = c[c.length - 1]; return r; }
  const fromCam = b => b < 1e-4 ? withLen({ pts: [[D, 0], [R, 0]], end: 'hit' }) : trace(U0, Math.sqrt(Math.max(1 / (b * b) - U0 * U0 * (1 - U0), 0)), 40);
  const fromSurf = (b, rOut = 40) => b < 1e-4 ? withLen({ pts: [[R, 0], [rOut, 0]], end: 'escape' }) : trace(U, -Math.sqrt(Math.max(1 / (b * b) - U * U * (1 - U), 0)), rOut);
  // o mesmo caminho, espelhado (s = −1) e girado de φ0
  const place = (r, s, phi0) => { const c = Math.cos(phi0), n = Math.sin(phi0); return { ...r, pts: r.pts.map(([x, y]) => [x * c - s * y * n, x * n + s * y * c]) }; };
  /* o desenho de lado: estrela à esquerda, câmera em x = D, olhando para ela */
  function scene(c, w, h) {
    const sc = Math.min((w - 74) / (D + 4.2), h / 11), cx = 14 + 3.4 * sc, cy = h / 2;
    const X = x => cx + x * sc, Y = y => cy - y * sc;
    const g = c.createRadialGradient(cx, cy, R * sc * 0.6, cx, cy, R * sc * 1.4); g.addColorStop(0, 'rgba(158,140,255,.25)'); g.addColorStop(1, 'rgba(158,140,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * sc * 1.4, 0, 7); c.fill();
    c.fillStyle = '#2a2f45'; c.beginPath(); c.arc(cx, cy, R * sc, 0, 7); c.fill();
    c.strokeStyle = 'rgba(190,180,255,.6)'; c.lineWidth = 1.5; c.stroke();
    c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(cx, cy, 1.5 * sc, 0, 7); c.stroke(); c.setLineDash([]);
    // a câmera: abertura (raio A) em x = D, corpo atrás
    const ax = X(D), ah = A * sc;
    c.fillStyle = '#1b2030'; c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(ax, cy - ah); c.lineTo(ax + 12, cy - 15); c.lineTo(ax + 12, cy + 15); c.lineTo(ax, cy + ah); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(ax + 12, cy - 17, 40, 34, 5); c.fill(); c.stroke();
    c.strokeStyle = COL.text; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ax, cy - ah); c.lineTo(ax, cy + ah); c.stroke();
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(T('câmera', 'camera'), ax + 26, cy + 24);
    c.textBaseline = 'bottom';
    subText(c, T(`estrela de nêutrons · R = ${fmt(R, 2)} R_S · câmera a ${D} R_S`, `neutron star · R = ${fmt(R, 2)} R_S · camera at ${D} R_S`), 10, h - 12, 15);
    return { X, Y, sc };
  }
  /* um raio até a fração f do comprimento; tail > 0 desenha só o trecho final (um “cometa”) */
  function stroke(c, P, r, f, color, width, tail = 0, head = 0) {
    const L = f * r.len, L0 = tail ? Math.max(0, L - tail) : 0, p = r.pts, cum = r.cum;
    let i = 0; while (i < p.length - 1 && cum[i + 1] <= L0) i++;
    const at = (j, s) => { const t = (s - cum[j]) / Math.max(cum[j + 1] - cum[j], 1e-9); return [P.X(p[j][0] + t * (p[j + 1][0] - p[j][0])), P.Y(p[j][1] + t * (p[j + 1][1] - p[j][1]))]; };
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath();
    let [x, y] = p.length > 1 ? at(i, L0) : [P.X(p[0][0]), P.Y(p[0][1])]; c.moveTo(x, y);
    for (; i < p.length - 1 && cum[i + 1] < L; i++) c.lineTo(P.X(p[i + 1][0]), P.Y(p[i + 1][1]));
    if (i < p.length - 1) [x, y] = at(i, L); else [x, y] = [P.X(p[p.length - 1][0]), P.Y(p[p.length - 1][1])];
    c.lineTo(x, y); c.stroke();
    if (head) { c.fillStyle = '#fff'; c.shadowColor = color; c.shadowBlur = 10; c.beginPath(); c.arc(x, y, head, 0, 7); c.fill(); c.shadowBlur = 0; }
  }
  // o painel da imagem: o ImageData ampliado, com moldura
  function image(cv, img, buf, title) {
    const { ctx: d, w, h } = fitCanvas(cv), side = Math.min(w, h) - 20, ox = (w - side) / 2, oy = (h - side) / 2;
    buf.getContext('2d').putImageData(img, 0, 0);
    d.imageSmoothingEnabled = false; d.drawImage(buf, ox, oy, side, side);
    d.strokeStyle = 'rgba(255,255,255,.15)'; d.lineWidth = 1; d.strokeRect(ox, oy, side, side);
    d.font = `15px ${FONT}`; d.fillStyle = COL.text3; d.textAlign = 'left'; d.textBaseline = 'top'; d.fillText(title, ox + 6, oy + 6);
    return { d, ox, oy, side, cell: side / S };
  }
  return { R, D, A, S, bmax, thMax, thF, psiQ, bOf, thOf, pixDir, pixOf, full, ok: map.ok, fromCam, fromSurf, place, scene, stroke, image };
})();

/* Da estrela para a câmera, a ideia ingênua: cada ponto da superfície emite em todas as direções e segue-se
   cada raio. A contagem é em 3D, RATE raios por segundo: ponto uniforme na esfera, direção isotrópica para
   fora (cos α uniforme); o raio cruza r = D a ψ_D(b) do ponto de partida, no plano (n̂, t̂), e entra na câmera
   se cair a menos de A/D do eixo — 1,8×10⁻⁴ dos raios, a fração da esfera que a abertura cobre, como deve
   ser. Quem entra acende o pixel da sua direção de chegada (θ de b, ê da projeção de n̂). Os raios desenhados
   são uma amostra no plano do desenho; os que entram na câmera aparecem todos, com o caminho exato até ela. */
(() => {
  const cv = document.getElementById('rt-fwd'); if (!cv) return;
  const cvI = document.getElementById('rt-fwd-image'), out = document.getElementById('rt-fwd-out');
  const { S, D, A, bmax } = CAM, RATE = 4000, VIS = 14, SPEED = 13, cosAp = Math.cos(A / D);   // raios/s contados e desenhados; R_S/s
  const NDISK = CAM.ok.reduce((s, v) => s + v, 0), FRAC = (1 - cosAp) / 2;
  const canon = Array.from({ length: 46 }, (_, i) => CAM.fromSurf(bmax * Math.sin(2 * i * deg)));   // para fora, α de 0 a 90°
  const shown = new ImageData(S, S), buf = document.createElement('canvas'); buf.width = buf.height = S;
  const litMask = new Uint8Array(S * S);
  let seed = 1, N = 0, hits = 0, lit = 0, acc = 0, accV = 0, t = 0, fly = [], glow = [];
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  function reset() { seed = 1; N = hits = lit = acc = accV = t = 0; fly = []; glow = []; litMask.fill(0); shown.data.fill(0); for (let k = 0; k < S * S; k++) shown.data.set([7, 8, 14, 255], 4 * k); }
  function emit() {                                                     // um raio em 3D; devolve o que a câmera recebe, ou nada
    const z = 2 * rnd() - 1, ph = 2 * Math.PI * rnd(), sq = Math.sqrt(1 - z * z), n = [sq * Math.cos(ph), sq * Math.sin(ph), z];
    const ca = rnd(), sa = Math.sqrt(1 - ca * ca), be = 2 * Math.PI * rnd();
    const a = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let e1 = [a[1] * n[2] - a[2] * n[1], a[2] * n[0] - a[0] * n[2], a[0] * n[1] - a[1] * n[0]]; const l = Math.hypot(...e1); e1 = e1.map(v => v / l);
    const e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
    const tz = Math.cos(be) * e1[2] + Math.sin(be) * e2[2], ps = CAM.psiQ(sa);
    if (Math.cos(ps) * n[2] + Math.sin(ps) * tz < cosAp) return null;
    const b = bmax * sa, pe = Math.hypot(n[0], n[1]) || 1;
    return { b, k: CAM.pixOf(CAM.thOf(b), n[0] / pe, n[1] / pe), up: n[1] >= 0 };
  }
  function tick(dt) {
    t += dt;
    acc += dt * RATE; const m = Math.floor(acc); acc -= m;
    for (let i = 0; i < m; i++) {
      N++; const h = emit(); if (!h) continue;
      hits++;
      const r = CAM.fromSurf(h.b, D), end = r.pts[r.pts.length - 1], psi = Math.atan2(end[1], end[0]);
      fly.push({ ...CAM.place(r, h.up ? -1 : 1, h.up ? psi : -psi), t0: t, dur: r.len / SPEED, life: r.len / SPEED + 2.5, hit: true, k: h.k, done: false });
    }
    accV += dt * VIS;
    for (; accV >= 1; accV--) {                                         // a amostra desenhada, em 2D
      const al = (2 * rnd() - 1) * 90, r = canon[Math.round(Math.abs(al) / 2)];
      fly.push({ ...CAM.place(r, al < 0 ? -1 : 1, 2 * Math.PI * rnd()), t0: t, dur: r.len / SPEED, life: 18 / SPEED, hit: false });   // some do quadro bem antes do fim
    }
    for (const r of fly) if (r.hit && !r.done && t - r.t0 >= r.dur) {
      r.done = true;
      if (r.k >= 0) { const o = 4 * r.k; if (!litMask[r.k] && CAM.ok[r.k]) lit++; litMask[r.k] = 1; shown.data.set(CAM.full.data.subarray(o, o + 4), o); glow.push({ k: r.k, t0: t }); }
    }
    fly = fly.filter(r => t - r.t0 < r.life);
    glow = glow.filter(g => t - g.t0 < 2);
    render();
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv), P = CAM.scene(c, w, h);
    for (const r of fly) {
      const f = Math.min(1, (t - r.t0) / r.dur);
      if (r.hit) {
        const fade = 1 - smooth(r.dur + 1.5, r.dur + 2.5, t - r.t0);
        CAM.stroke(c, P, r, f, `rgba(255,214,150,${(0.9 * fade).toFixed(3)})`, 2.6, 0, f < 1 ? 4 : 0);
        if (f >= 1 && fade > 0) { c.strokeStyle = `rgba(255,214,150,${fade.toFixed(3)})`; c.lineWidth = 2; c.beginPath(); c.arc(P.X(D), P.Y(0), 10 + 14 * (1 - fade), 0, 7); c.stroke(); }
      } else CAM.stroke(c, P, r, f, 'rgba(255,184,107,.55)', 1.6, 3.5, 2);
    }
    const im = CAM.image(cvI, shown, buf, T('o que a câmera juntou', 'what the camera collected'));
    const rr = CAM.thMax / CAM.thF * im.side / 2;
    im.d.strokeStyle = 'rgba(158,140,255,.35)'; im.d.setLineDash([4, 6]); im.d.beginPath(); im.d.arc(im.ox + im.side / 2, im.oy + im.side / 2, rr, 0, 7); im.d.stroke(); im.d.setLineDash([]);
    im.d.strokeStyle = 'rgba(255,184,107,.75)'; im.d.lineWidth = 1.2;                  // os pixels acesos, marcados (os escuros sumiriam no preto)
    for (let k = 0; k < S * S; k++) if (litMask[k]) im.d.strokeRect(im.ox + (k % S) * im.cell, im.oy + Math.floor(k / S) * im.cell, im.cell, im.cell);
    for (const g of glow) {
      const a = 1 - (t - g.t0) / 2, i = g.k % S, j = Math.floor(g.k / S);
      im.d.strokeStyle = `rgba(255,214,150,${a.toFixed(3)})`; im.d.lineWidth = 2; im.d.beginPath();
      im.d.arc(im.ox + (i + 0.5) * im.cell, im.oy + (j + 0.5) * im.cell, im.cell * (1 + 3 * (1 - a)), 0, 7); im.d.stroke();
    }
    const hrs = NDISK * (Math.log(NDISK) + 0.577) / FRAC / RATE / 3600;
    out.innerHTML = `<span>${T('raios lançados', 'rays launched')} <b>${grp(N)}</b></span>
      <span>${T('entraram na câmera', 'entered the camera')} <b>${grp(hits)}</b> (${N ? fmt(100 * hits / N, 3) : '0'}%)</span>
      <span>${T('pixels acesos', 'pixels lit')} <b>${grp(lit)}</b> ${T('de', 'of')} ${grp(NDISK)}</span>
      <span>${T('imagem completa em', 'full image in')} <b>~${fmt(hrs, 0)} h</b></span>`;
  }
  const slide = cv.closest('.slide');
  addEventListener('slidechange', () => { if (slide.classList.contains('active')) reset(); });   // antes de loopOn: cada visita começa do zero
  reset();
  loopOn(cv, tick, render);
  onSlide(cv, () => { if (!slide.classList.contains('active')) render(); });
})();

/* Da câmera para a estrela, o método: um raio por pixel, saindo da câmera, o caminho da luz percorrido ao
   contrário; o pixel ganha a cor quando o raio chega (à superfície: a cor do ponto; ao céu: escuro). Os
   pixels vêm numa ordem embaralhada (sempre a mesma), para que os primeiros raios mostrem os dois destinos;
   começa devagar e acelera, e com muitos raios no ar desenha só uma amostra. Todo raio calculado vira pixel. */
(() => {
  const cv = document.getElementById('rt-side'); if (!cv) return;
  const cvI = document.getElementById('rt-image'), out = document.getElementById('rt-out');
  const { S, bmax } = CAM, NP = S * S;
  const order = Array.from({ length: NP }, (_, i) => i);
  { let s = 5; for (let i = NP - 1; i > 0; i--) { s = s * 16807 % 2147483647; const j = s % (i + 1); [order[i], order[j]] = [order[j], order[i]]; } }
  const shown = new ImageData(S, S), buf = document.createElement('canvas'); buf.width = buf.height = S;
  let k = 0, done = 0, acc = 0, t = 0, hold = 0, fly = [], trail = [], cur = null;
  const rate = () => Math.min(1500, 1.6 * Math.exp(k / 12));             // raios por segundo
  const speed = () => Math.min(80, 12 * Math.exp(k / 20));              // R_S por segundo, para um raio desenhado
  function reset() { k = done = acc = t = hold = 0; fly = []; trail = []; cur = null; shown.data.fill(0); }
  const reveal = idx => { shown.data.set(CAM.full.data.subarray(4 * idx, 4 * idx + 4), 4 * idx); done++; };
  function launch() {
    const idx = order[k++], d = CAM.pixDir(idx), b = CAM.bOf(d.th), q = b / bmax;
    if (k > 40 && k % Math.ceil(rate() / 45)) { reveal(idx); return; }  // com muitos raios no ar, só uma amostra é desenhada
    const r = CAM.fromCam(b);
    cur = { ...CAM.place(r, d.ey >= 0 ? 1 : -1, 0), t0: t, dur: Math.min(r.len, 22) / speed(), reach: Math.min(r.len, 22) / r.len, idx, i: d.i, j: d.j, b, q, th: d.th };   // os que escapam saem do quadro antes do fim
    fly.push(cur);
  }
  function tick(dt) {
    t += dt;
    if (k < NP) { acc += dt * rate(); for (; acc >= 1 && k < NP; acc--) launch(); }
    fly = fly.filter(r => { if (t - r.t0 < r.dur) return true; reveal(r.idx); trail.push(r); if (trail.length > 36) trail.shift(); return false; });
    if (done >= NP) { hold += dt; if (hold > 3) reset(); }
    render();
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv), P = CAM.scene(c, w, h);
    trail.forEach((r, n) => CAM.stroke(c, P, r, 1, r.end === 'hit' ? `rgba(255,184,107,${(0.08 + 0.3 * n / trail.length).toFixed(3)})` : `rgba(86,225,208,${(0.06 + 0.25 * n / trail.length).toFixed(3)})`, 1));
    for (const r of trail.slice(-12)) if (r.end === 'hit') {
      const [x, y] = r.pts[r.pts.length - 1], o = 4 * r.idx, px = CAM.full.data;
      c.fillStyle = `rgb(${px[o]},${px[o + 1]},${px[o + 2]})`; c.beginPath(); c.arc(P.X(x), P.Y(y), 3.5, 0, 7); c.fill();
    }
    for (const r of fly) CAM.stroke(c, P, r, Math.min(1, (t - r.t0) / r.dur) * r.reach, r.end === 'hit' ? COL.sol : COL.psr, 2.4, 0, 4);
    const im = CAM.image(cvI, shown, buf, T('a imagem, pixel a pixel', 'the image, pixel by pixel'));
    im.d.strokeStyle = '#fff'; im.d.lineWidth = 2;
    for (const r of fly.slice(-6)) im.d.strokeRect(im.ox + r.i * im.cell, im.oy + r.j * im.cell, im.cell, im.cell);
    const fate = !cur ? '' : cur.q <= 1
      ? `${T('acerta a superfície', 'hits the surface')} · α <b>${fmt(Math.asin(cur.q) / deg, 0)}°</b> · ψ <b>${fmt(CAM.psiQ(cur.q) / deg, 0)}°</b>`
      : `<b>${T('escapa: céu', 'escapes: sky')}</b>`;
    out.innerHTML = (cur ? `<span>pixel <b>(${cur.i}, ${cur.j})</b> · θ <b>${fmt(cur.th / deg, 1)}°</b> · b <b>${fmt(cur.b, 2)} R<sub>S</sub></b></span><span>${fate}</span>` : '') +
      `<span>${T('raios calculados = pixels', 'rays computed = pixels')} <b>${grp(k)}</b> (${Math.round(100 * done / NP)}%)</span>`;
  }
  const slide = cv.closest('.slide');
  addEventListener('slidechange', () => { if (slide.classList.contains('active')) reset(); });
  loopOn(cv, tick, () => { while (k < NP) { const idx = order[k++]; reveal(idx); } fly = []; render(); });
  onSlide(cv, () => { if (!slide.classList.contains('active')) render(); });
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
