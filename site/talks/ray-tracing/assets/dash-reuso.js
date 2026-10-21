/* =====================================================================
   Blocos reaproveitados dos seminários anteriores, sem mudança de física:
   · “Do nascimento à morte das estrelas”: geodésicas de Schwarzschild, o primeiro
     pulsar, o diagrama P–Ṗ e o magnetar girando;
   · “Neutrinos em espaço-tempo curvo”: o periélio de Mercúrio, Pound–Rebka e a escala de
     compacidade (aqui num slide só, com os objetos passando sozinhos ou por clique).
   ===================================================================== */

/* ---------------- geodésicas de Schwarzschild ---------------- */
(() => {
/* ------------------------- utilitários locais (escopo próprio: nada vaza para window) ------------------------- */
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
// ?ff=N adianta N s na primeira vez que o slide abre (testes headless e tools/pdf.sh); FF vem de dash.js
const FFS = typeof FF === 'number' ? FF : (+new URLSearchParams(location.search).get('ff') || 0);
const isOverview = () => document.body.classList.contains('overview');
const fx = (v, d) => v.toFixed(d).replace('.', DEC);
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(ch => (ch === '-' ? '⁻' : SUPD[+ch])).join('');
const sci = (v, d = 1) => {                                  // 2,0×10²⁷
  let e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e;
  if (+m.toFixed(d) >= 10) { m /= 10; e++; }
  return fx(m, d) + '×10' + sup(e);
};
const grp = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, T(' ', ','));   // 7 700 · 7,700
const sig3 = v => (v >= 100 ? grp(v) : v >= 10 ? fx(v, 1) : fx(v, 2));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const ease = x => (1 - Math.cos(Math.PI * clamp(x, 0, 1))) / 2;
const bisect = (f, y, lo, hi, n = 64) => { for (let k = 0; k < n; k++) { const m = (lo + hi) / 2; f(m) < y ? (lo = m) : (hi = m); } return (lo + hi) / 2; };

/* texto com sub e sobrescritos no canvas: “R_{S}”, “(1 − R_{S}/r)^{−1/2}” */
function rich(c, s, x, y, { size = 16, color = COL.text2, align = 'left', base = 'middle', weight = '', font = FONT } = {}) {
  const segs = [], re = /([_^])\{([^}]*)\}/g; let i = 0, m;
  while ((m = re.exec(s))) { if (m.index > i) segs.push({ t: s.slice(i, m.index), k: 0 }); segs.push({ t: m[2], k: m[1] === '_' ? 1 : -1 }); i = re.lastIndex; }
  if (i < s.length) segs.push({ t: s.slice(i), k: 0 });
  const f0 = `${weight} ${size}px ${font}`, f1 = `${weight} ${Math.round(size * 0.68)}px ${font}`;
  c.save(); c.fillStyle = color; c.textBaseline = base; c.textAlign = 'left';
  let W = 0; segs.forEach(g => { c.font = g.k ? f1 : f0; g.w = c.measureText(g.t).width; W += g.w; });
  let x0 = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  segs.forEach(g => { c.font = g.k ? f1 : f0; c.fillText(g.t, x0, y + g.k * size * 0.3); x0 += g.w; });
  c.restore(); return W;
}

/* brilho pré-desenhado (mais barato que shadowBlur em centenas de pontos) */
const sprite = (() => {
  const cache = {};
  return rgb => {
    if (cache[rgb]) return cache[rgb];
    const s = document.createElement('canvas'), n = 64, h = n / 2; s.width = s.height = n;
    const g = s.getContext('2d'), gr = g.createRadialGradient(h, h, 0, h, h, h);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, `rgba(${rgb},.95)`);
    gr.addColorStop(0.42, `rgba(${rgb},.28)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return (cache[rgb] = s);
  };
})();
const blob = (c, spr, x, y, d) => c.drawImage(spr, x - d / 2, y - d / 2, d, d);
/* brilho barato para caminhos longos: dois traços largos e translúcidos por baixo do traço */
function glowStroke(c, path, color, width, glowCol = color) {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = glowCol;
  c.globalAlpha = 0.12; c.lineWidth = width * 4; path(); c.stroke();
  c.globalAlpha = 0.25; c.lineWidth = width * 2.2; path(); c.stroke();
  c.globalAlpha = 1; c.strokeStyle = color; c.lineWidth = width; path(); c.stroke(); c.restore();
}

/* Laço de animação: rAF só com o slide ativo (e fora da visão geral); reinicia no
   slidechange/stagefit. Sem movimento (reduced motion, visão geral), still() põe o
   estado num quadro representativo e desenha uma vez. Com ?ff=N, a primeira entrada no
   slide já começa N s adiantada. */
function animate(cv, { step, render, still, enter }) {
  const slide = cv.closest('.slide'); let raf = 0, last = 0, ff = FFS;
  const live = () => !REDUCE && !isOverview() && slide.classList.contains('active');
  const tick = now => {
    if (!live()) { raf = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
    step(dt); render(); raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (live() && !raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const redraw = () => { if (!live()) still(); render(); };
  addEventListener('slidechange', e => {
    if (e.detail.slide === slide) {
      if (enter) enter();
      if (!REDUCE) for (; ff > 0; ff -= 1 / 30) step(1 / 30);
    }
    kick();
  });
  addEventListener('stagefit', kick);
  const go = onSlide(cv, redraw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
  return { redraw, live };
}
const setHTML = (el, s) => { if (el && el._s !== s) { el.innerHTML = s; el._s = s; } };

/* ============ geodésicas nulas: o feixe de luz paralelo ============
   Utilitários comuns a Schwarzschild e Kerr: cada raio é uma polilinha (x, y) em R_S; ela
   é cortada a partir da reta x = XL (borda esquerda do quadro) e à caixa visível, com o
   comprimento acumulado. Os fótons andam por ela com velocidade constante ao longo do
   caminho e partem juntos de x = XL — frentes de onda planas (esquemático: não é o tempo t). */
function beamCut(pts, XL, BX, BY) {
  let i = pts.findIndex(p => p[0] >= XL); if (i < 1) return null;
  const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], f = (XL - x0) / (x1 - x0 || 1);
  const xs = [XL], ys = [y0 + f * (y1 - y0)], cum = [0];
  for (; i < pts.length; i++) {
    const [x, y] = pts[i], n = xs.length - 1;
    cum.push(cum[n] + Math.hypot(x - xs[n], y - ys[n])); xs.push(x); ys.push(y);
    if (Math.abs(x) > BX || Math.abs(y) > BY) break;
  }
  return { xs, ys, cum, len: cum[cum.length - 1] };
}
function beamAt(b, s) {
  let lo = 0, hi = b.cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; b.cum[m] < s ? (lo = m) : (hi = m); }
  const f = (s - b.cum[lo]) / (b.cum[hi] - b.cum[lo] || 1);
  return [b.xs[lo] + (b.xs[hi] - b.xs[lo]) * f, b.ys[lo] + (b.ys[hi] - b.ys[lo]) * f];
}
function beamPath(c, b, X, Y) { c.beginPath(); b.xs.forEach((x, i) => (i ? c.lineTo(X(x), Y(b.ys[i])) : c.moveTo(X(x), Y(b.ys[i])))); }
function beamPhotons(c, b, X, Y, t, spr, d, cap) {
  const V = 3, GAP = 2.1;                                                    // R_S por segundo; espaço entre frentes
  for (let s = (t * V) % GAP; s <= b.len; s += GAP) {
    const [x, y] = beamAt(b, s), fade = cap ? clamp((b.len - s) / 0.5, 0, 1) : 1;
    if (fade <= 0) continue;
    c.globalAlpha = fade * (d < 12 ? 0.8 : 1); blob(c, spr, X(x), Y(y), d);
  }
  c.globalAlpha = 1;
}

/* ============ 7 · Como a luz se curva: Schwarzschild ============
   Órbita da luz: u'' + u = (3/2) R_S u², u = 1/r, integrada exatamente (RK4 em φ, passo
   adaptativo) a partir de r = 1000 R_S, com u' inicial da integral primeira
   u'² = 1/b² − u² + R_S u³. Captura se u ≥ 1/R_S. Parâmetro de impacto crítico
   b_c = (3√3/2) R_S ≈ 2,598 R_S: órbita instável na esfera de fótons, r = 1,5 R_S.
   Desvio total = φ varrido − (π − 2 arcsen(b/r0)), de r0 até r0. */
(() => {
  const cv = document.getElementById('geo-s'); if (!cv) return;
  const out = document.getElementById('geo-s-out');
  const BC = 1.5 * Math.sqrt(3), R0 = 1000;
  function trace(b) {
    const ab = Math.abs(b), sg = b < 0 ? -1 : 1, f = (u, v) => [v, -u + 1.5 * u * u];
    let u = 1 / R0, v = Math.sqrt(Math.max(1 / (ab * ab) - u * u + u ** 3, 0)), ph = 0, umax = u, cap = false;
    const ph0 = Math.PI - Math.asin(ab / R0), pts = [[Math.cos(ph0) * R0, sg * Math.sin(ph0) * R0]];
    for (let n = 0; n < 60000; n++) {
      const r = 1 / u, hh = clamp((0.03 + 0.02 * r) / Math.hypot(r, Math.abs(v) / (u * u)), 1e-5, r < 4 ? 0.005 : 0.01);
      const k1 = f(u, v), k2 = f(u + hh / 2 * k1[0], v + hh / 2 * k1[1]), k3 = f(u + hh / 2 * k2[0], v + hh / 2 * k2[1]), k4 = f(u + hh * k3[0], v + hh * k3[1]);
      u += hh / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); v += hh / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); ph += hh;
      if (u >= 1) { cap = true; pts.push([Math.cos(ph0 - ph), sg * Math.sin(ph0 - ph)]); break; }
      if (u <= 1 / R0 && v < 0) break;
      umax = Math.max(umax, u);
      pts.push([Math.cos(ph0 - ph) / u, sg * Math.sin(ph0 - ph) / u]);
    }
    return { b, pts, cap, rmin: 1 / umax, defl: ph - (Math.PI - 2 * Math.asin(ab / R0)) };
  }
  const FAM = []; for (let b = 0.2; b < 5.9; b += 0.4) { FAM.push(trace(b)); FAM.push(trace(-b)); }
  const HL = [5.0, 3.6, 2.9, BC + 2e-5, 2.3, 1.1, -3.3, -(BC + 4e-4)].map(trace), HOLD = 3.4;
  let t = 0, key = '';
  const sprE = sprite('190,175,255'), sprC = sprite('255,150,165'), sprH = sprite('235,230,255');
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const S = Math.min((h - 26) / 12.9, (w - 20) / 21), cx = w * 0.47, cy = h / 2, X = x => cx + x * S, Y = y => cy - y * S;
    const XL = -(cx - 4) / S, BX = (w - cx) / S + 1, BY = cy / S + 1;
    if (key !== `${w}x${h}`) { key = `${w}x${h}`; [...FAM, ...HL].forEach(r => { r.beam = beamCut(r.pts, XL, BX, BY); }); }
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let r = 2; r <= 10; r += 2) { c.beginPath(); c.arc(cx, cy, r * S, 0, 7); c.stroke(); }
    // as retas b = ±b_c: quem entra entre elas é capturado
    c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,122,138,.4)';
    [BC, -BC].forEach(b => { c.beginPath(); c.moveTo(X(XL), Y(b)); c.lineTo(X(-3.4), Y(b)); c.stroke(); }); c.restore();
    rich(c, 'b_{c} = (3√3/2) R_{S} ≈ ' + fx(BC, 2) + ' R_{S}', X(XL) + 6, Y(BC) - 13, { size: 15, color: COL.warn });
    c.lineWidth = 1.3;
    FAM.forEach(r => { if (!r.beam) return; c.strokeStyle = r.cap ? 'rgba(255,122,138,.26)' : 'rgba(158,140,255,.3)'; beamPath(c, r.beam, X, Y); c.stroke(); });
    const hl = HL[Math.floor(t / HOLD) % HL.length];
    if (hl.beam) glowStroke(c, () => beamPath(c, hl.beam, X, Y), hl.cap ? COL.warn : '#cfc6ff', 3.2, hl.cap ? COL.warn : COL.bn);
    // esfera de fótons e horizonte
    c.save(); c.setLineDash([6, 6]); c.strokeStyle = 'rgba(255,184,107,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 1.5 * S, 0, 7); c.stroke(); c.restore();
    const g = c.createRadialGradient(cx, cy, S * 0.9, cx, cy, S * 1.5); g.addColorStop(0, 'rgba(158,140,255,.3)'); g.addColorStop(1, 'rgba(158,140,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 1.5 * S, 0, 7); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, S, 0, 7); c.fill(); c.strokeStyle = COL.bn; c.lineWidth = 1.5; c.stroke();
    // fótons
    FAM.forEach(r => { if (r.beam) beamPhotons(c, r.beam, X, Y, t, r.cap ? sprC : sprE, 8, r.cap); });
    if (hl.beam) beamPhotons(c, hl.beam, X, Y, t, sprH, 16, hl.cap);
    rich(c, T('esfera de fótons, 1,5 R_{S}', 'photon sphere, 1.5 R_{S}'), X(1.15), Y(-1.65), { size: 15, color: COL.sol });
    rich(c, T('horizonte, R_{S}', 'horizon, R_{S}'), X(-1.15), Y(1.25), { size: 15, color: COL.bn, align: 'right' });
    rich(c, T('fótons a passo constante ao longo do caminho (esquemático)', 'photons at a constant pace along the path (schematic)'), w - 8, h - 10, { size: 14, color: COL.text3, align: 'right' });
    const bt = Math.abs(Math.abs(hl.b) - BC) < 0.01 ? fx(hl.b, 5) : fx(hl.b, 2);
    setHTML(out, hl.cap
      ? `<span>b <b>${bt} R<sub>S</sub></b></span><span>|b| &lt; b<sub>c</sub> → <b style="color:var(--warn)">${T('capturado', 'captured')}</b></span><span>b<sub>c</sub> <b>${fx(BC, 3)} R<sub>S</sub></b></span>`
      : `<span>b <b>${bt} R<sub>S</sub></b></span><span>${T('desvio', 'deflection')} <b>${fx(hl.defl * 180 / Math.PI, 1)}°</b></span><span>${T('maior aproximação', 'closest approach')} <b>${fx(hl.rmin, 2)} R<sub>S</sub></b></span><span>→ <b>${T('escapa', 'escapes')}</b></span><span>b<sub>c</sub> <b>${fx(BC, 3)} R<sub>S</sub></b></span>`);
  }
  animate(cv, { step: dt => { t += dt; }, render, still: () => { t = 3 * HOLD + 1.2; }, enter: () => { t = 0; } });
})();

})();


/* ---------------- pulsares ---------------- */
/* Utilitários comuns aos blocos desta parte, num objeto só (os scripts do deck dividem o escopo
   global, e um `const deg` aqui colidiria com o de dash.js). */
const P4 = (() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(ch => ch === '-' ? '⁻' : SUPS[+ch]).join('');
  const num = (v, d = 0) => v.toFixed(d).replace('.', DEC);
  // 1,35×10⁻¹⁵ (mantissa com d casas, separador decimal do idioma)
  const sci = (v, d = 2) => {
    let e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e;
    if (+m.toFixed(d) >= 10) { m /= 10; e++; }
    return `${num(m, d)}×10${sup(e)}`;
  };
  // milhares: “2 855” em português, “2,855” em inglês
  const grp = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, T(' ', ','));
  // gerador pseudoaleatório com semente (quadros estáticos reprodutíveis)
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  /* Laço de animação: frame(dt, still) avança dt segundos e desenha. Só roda enquanto o slide está
     ativo; na visão geral e com prefers-reduced-motion desenha um quadro representativo (still = true).
     enter() é chamado cada vez que o slide passa a ser o atual. */
  function anim(cv, frame, enter) {
    const slide = cv.closest('.slide');
    let raf = 0, last = 0, ff = typeof FF === 'number' ? FF : 0;     // ?ff=N adianta N s (testes e PDF; FF vem de dash.js)
    const live = () => slide.classList.contains('active') && !document.body.classList.contains('overview') && !REDUCE;
    const tick = now => {
      if (!live()) { raf = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      frame(dt, false); raf = requestAnimationFrame(tick);
    };
    // registrado antes de onSlide: o estado volta ao início antes do primeiro quadro da visita
    if (enter) addEventListener('slidechange', e => { if (e.detail.slide === slide) enter(); });
    onSlide(cv, () => {
      if (!live()) frame(0, true);
      else if (!raf) { for (; ff > 0; ff -= 1 / 30) frame(1 / 30, false); last = 0; raf = requestAnimationFrame(tick); }
    });
  }
  return { REDUCE, sup, num, sci, grp, rng, anim };
})();

/* ============================ PARTE IV ============================ */

/* Animação: a descoberta do primeiro pulsar, CP 1919 = PSR B1919+21 (Hewish, Bell et al. 1968).
   P = 1,337302 s, Ṗ = 1,348×10⁻¹⁵ s/s, observado em 81,5 MHz. À esquerda, o modelo do farol: o eixo
   magnético, inclinado de α em relação ao de rotação, varre um cone; quando o feixe cruza a linha de
   visada, a pena do registrador sobe. O pulso dura ~35 ms (2,6% do período), o que corresponde a um
   feixe de poucos graus no céu. As amplitudes mudam de pulso a pulso (cintilação interestelar, aqui
   sorteadas entre 0,3 e 1); o ruído e a resposta da pena são simulados. A rotação é em tempo real. */
(() => {
  const cv = document.getElementById('lgm'); if (!cv) return;
  const out = document.getElementById('lgm-out');
  const PER = 1.337302, T0 = 0.7, WIN = 5.6, FS = 500, N = 4096;     // s; 1º pulso (s); s de papel visíveis; amostras/s; buffer
  const AL = 50 * Math.PI / 180, KA = 24 * Math.PI / 180;             // α (eixo magnético ↔ rotação); inclinação do desenho
  const SIG = 2 * Math.PI * 0.0145 / PER;                              // σ do pulso em fase de rotação (FWHM ≈ 34 ms)
  const BEAM = 9 * Math.PI / 180;                                      // meia-abertura desenhada do feixe (esquemática)
  // vetores em coordenadas de tela: x à direita, y para cima, z para fora; a Terra fica em +x
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const S = [Math.cos(AL), Math.sin(AL) * Math.cos(KA), Math.sin(AL) * Math.sin(KA)];   // eixo de rotação, a α da linha de visada
  const E1 = [1 - S[0] * S[0], -S[0] * S[1], -S[0] * S[2]].map(v => v / Math.sin(AL)), E2 = cross(S, E1);
  // eixo magnético na fase φ: em φ = 0 aponta exatamente para a Terra
  const mOf = ph => [0, 1, 2].map(i => Math.cos(AL) * S[i] + Math.sin(AL) * (Math.cos(ph) * E1[i] + Math.sin(ph) * E2[i]));
  const phase = tt => 2 * Math.PI * (tt - T0) / PER;
  let rnd, t, tg, pen, nz, buf, head, amps, brk, shownCnt;
  function reset(seed) { rnd = P4.rng(seed); t = 0; tg = 0; pen = 0; nz = 0; buf = new Float32Array(N); head = 0; amps = []; brk = -1; shownCnt = -1; }
  const amp = k => amps[k] ?? (amps[k] = 0.3 + 0.7 * rnd());
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  // intensidade do feixe na direção da Terra (perfil gaussiano em fase)
  function sig(tt) {
    const k = Math.round((tt - T0) / PER); if (k < 0) return 0;
    const ph = phase(tt) - 2 * Math.PI * k;
    return amp(k) * Math.exp(-ph * ph / (2 * SIG * SIG));
  }
  // amostras até o instante tt: ruído de Ornstein–Uhlenbeck (τ = 20 ms) + pulsos, passando pela pena (τ = 9 ms)
  const TN = 0.02, SN = 0.05, KP = 1 - Math.exp(-1 / (FS * 0.009)), DN = Math.exp(-1 / (FS * TN));
  function gen(tt) {
    while (tg + 1 / FS <= tt) {
      tg += 1 / FS;
      nz = nz * DN + SN * Math.sqrt(1 - DN * DN) * gauss();
      pen += (sig(tg) + nz - pen) * KP;
      buf[head++ % N] = pen;
    }
  }
  const count = () => Math.max(0, Math.floor((t - T0 - 0.02) / PER) + 1);
  function readout() {
    const n = count(); if (n === shownCnt) return; shownCnt = n;
    out.innerHTML = `<span>${T('período', 'period')} <b>1${DEC}337 302 s</b></span>
      <span>Ṗ <b>1${DEC}35×10⁻¹⁵ s/s</b></span>
      <span>${T('frequência', 'frequency')} <b>81${DEC}5 MHz</b></span>
      <span>${T('pulsos registrados', 'pulses recorded')} <b>${n}</b></span>`;
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const lw = Math.round(w * 0.3);
    /* ---- o farol ---- */
    const cx = lw * 0.34, cy = h * 0.5, ex = lw - 22, ey = cy, R = ex - cx - 22, rs = Math.max(11, R * 0.11);
    const XY = (v, r) => [cx + v[0] * r, cy - v[1] * r];
    const ph = phase(t), m = mOf(ph), hit = sig(t);
    // caminho da ponta do eixo magnético (o cone varrido)
    c.strokeStyle = 'rgba(255,255,255,.17)'; c.lineWidth = 1; c.setLineDash([2, 5]); c.beginPath();
    for (let i = 0; i <= 96; i++) { const [x, y] = XY(mOf(i / 96 * 2 * Math.PI), R * 0.5); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    // eixo de rotação e linha de visada
    c.strokeStyle = 'rgba(255,255,255,.32)'; c.setLineDash([6, 5]); c.beginPath();
    const [sx, sy] = XY(S, R * 0.78); { const [d, e] = XY(S, -R * 0.55); c.moveTo(d, e); c.lineTo(sx, sy); } c.stroke();
    c.strokeStyle = 'rgba(86,225,208,.35)'; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(cx + rs, cy); c.lineTo(ex - 14, ey); c.stroke(); c.setLineDash([]);
    // os dois feixes (polos norte e sul); desenhados antes da estrela quando apontam para dentro da tela
    function beam(v) {
      const lp = Math.hypot(v[0], v[1]), len = R, wd = len * Math.tan(BEAM);
      const dx = lp > 1e-6 ? v[0] / lp : 1, dy = lp > 1e-6 ? -v[1] / lp : 0, nx = -dy, ny = dx;
      const bx = cx + dx * len * lp, by = cy + dy * len * lp, w0 = rs * 0.3;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(cx, cy, bx, by);
      g.addColorStop(0, 'rgba(200,255,248,.9)'); g.addColorStop(.35, 'rgba(86,225,208,.42)'); g.addColorStop(1, 'rgba(86,225,208,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(cx + nx * w0, cy + ny * w0);
      c.lineTo(bx + nx * wd * lp, by + ny * wd * lp); c.lineTo(bx - nx * wd * lp, by - ny * wd * lp); c.lineTo(cx - nx * w0, cy - ny * w0); c.closePath(); c.fill();
      // o cone projetado: largura ∝ comprimento projetado; a boca é uma elipse que vira círculo de frente
      const fz = Math.abs(v[2]), rm = wd;
      const rg = c.createRadialGradient(bx, by, 0, bx, by, rm);
      rg.addColorStop(0, `rgba(160,255,240,${(0.1 + 0.35 * fz).toFixed(3)})`); rg.addColorStop(1, 'rgba(86,225,208,0)');
      c.fillStyle = rg; c.beginPath(); c.ellipse(bx, by, rm, Math.max(rm * fz, 1.5), Math.atan2(ny, nx) + Math.PI / 2, 0, 2 * Math.PI); c.fill();
      const gl = c.createLinearGradient(cx, cy, bx, by); gl.addColorStop(0, 'rgba(255,255,255,.85)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = gl; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.stroke();
      c.restore();
    }
    const beams = [m, m.map(x => -x)];
    beams.filter(v => v[2] < 0).forEach(beam);
    // a estrela
    const gs = c.createRadialGradient(cx - rs * .35, cy - rs * .35, 1, cx, cy, rs);
    gs.addColorStop(0, '#ffffff'); gs.addColorStop(.45, '#a9f3ea'); gs.addColorStop(1, '#2d8f86');
    c.save(); c.shadowColor = COL.psr; c.shadowBlur = 24; c.fillStyle = gs; c.beginPath(); c.arc(cx, cy, rs, 0, 2 * Math.PI); c.fill(); c.restore();
    beams.filter(v => v[2] >= 0).forEach(beam);
    // polos magnéticos do lado visível
    beams.forEach(v => { if (v[2] < -0.25) return; const [x, y] = XY(v, rs * 0.9); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 2.6, 0, 2 * Math.PI); c.fill(); });
    // a Terra: radiotelescópio, aceso quando o feixe passa
    c.save(); c.translate(ex, ey); c.scale(1.3, 1.3);
    c.strokeStyle = COL.text3; c.lineWidth = 1.5; c.beginPath(); c.moveTo(3, 2); c.lineTo(10, 21); c.moveTo(3, 2); c.lineTo(-3, 21); c.moveTo(-6, 21); c.lineTo(13, 21); c.stroke();
    c.shadowColor = COL.psr; c.shadowBlur = 28 * hit;
    c.strokeStyle = hit > 0.15 ? COL.psr : COL.text2; c.lineWidth = 2;
    c.fillStyle = `rgba(86,225,208,${(0.08 + 0.55 * hit).toFixed(3)})`;
    c.beginPath(); c.moveTo(-6, -15); c.quadraticCurveTo(16, 0, -6, 15); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.moveTo(4, 0); c.lineTo(-9, 0); c.stroke();
    c.restore();
    c.font = `15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillStyle = hit > 0.15 ? COL.psr : COL.text2; c.fillText(T('Terra', 'Earth'), ex + 2, ey + 34);
    c.fillStyle = COL.text3; c.fillText(T('linha de visada', 'line of sight'), (cx + rs + ex) / 2, ey + 9);
    c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(T('eixo de rotação', 'spin axis'), sx - 6, sy - 6);
    c.fillText(T('feixe esquemático', 'schematic beam'), 4, h - 24); c.fillText(T('rotação em tempo real', 'real-time rotation'), 4, h - 4);
    c.textBaseline = 'top'; c.fillStyle = COL.text2; c.font = `16px ${FONT}`;
    c.fillText(T('estrela de nêutrons', 'neutron star'), 4, 6);
    /* ---- o registro em papel ---- */
    const x0 = lw + 18, x1 = w - 4, y0 = 40, y1 = h - 34, H = y1 - y0;
    const xp = x1 - 0.07 * (x1 - x0), v = (xp - x0) / WIN, base = y1 - 0.2 * H, A = 0.66 * H;
    const X = tt => xp - (t - tt) * v;
    c.fillStyle = 'rgba(255,248,235,.035)'; c.strokeStyle = 'rgba(255,255,255,.1)'; c.lineWidth = 1;
    c.beginPath(); c.roundRect(x0, y0, x1 - x0, H, 8); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, H); c.clip();
    for (let k = 1; k < 10; k++) { const y = y0 + H * k / 10; c.strokeStyle = k % 5 ? 'rgba(255,184,107,.05)' : 'rgba(255,184,107,.09)'; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
    const ta = t - (xp - x0) / v, tb = t + (x1 - xp) / v;
    for (let q = Math.ceil(ta * 5); q <= tb * 5; q++) {
      const x = X(q / 5); c.strokeStyle = q % 5 ? 'rgba(255,184,107,.05)' : 'rgba(255,184,107,.13)';
      c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke();
    }
    // o traço da pena
    c.strokeStyle = '#dff7f2'; c.lineWidth = 1.7; c.lineJoin = 'round'; c.beginPath();
    let first = true;
    for (let i = head - 1; i >= Math.max(0, head - N); i--) {
      const x = X((i + 1) / FS); if (x < x0 - 2) break;
      const y = Math.max(y0 + 2, base - buf[i % N] * A);
      first ? c.moveTo(x, y) : c.lineTo(x, y); first = false;
    }
    c.stroke();
    // colchete entre dois pulsos consecutivos (troca só quando o par sai pela esquerda)
    const kL = Math.floor((t - T0 - 0.06) / PER), xk = k => X(T0 + k * PER);
    if (brk < 1 || xk(brk - 1) < x0 + 14) brk = kL >= 1 && xk(kL - 1) >= x0 + 14 ? kL : -1;
    if (brk >= 1) {
      const xa = xk(brk - 1), xb = xk(brk), yb = y0 + 0.085 * H + 14;
      const peakY = k => { const i0 = Math.round((T0 + k * PER) * FS); let mx = -1; for (let i = i0 - 4; i < i0 + 30; i++) if (i >= 0 && i < head && i >= head - N) mx = Math.max(mx, buf[i % N]); return base - mx * A; };
      c.strokeStyle = 'rgba(86,225,208,.45)'; c.setLineDash([2, 4]); c.lineWidth = 1.2; c.beginPath();
      [[xa, brk - 1], [xb, brk]].forEach(([x, k]) => { c.moveTo(x, yb + 2); c.lineTo(x, Math.max(yb + 2, peakY(k) - 6)); }); c.stroke(); c.setLineDash([]);
      c.strokeStyle = COL.psr; c.lineWidth = 2; c.beginPath(); c.moveTo(xa, yb + 9); c.lineTo(xa, yb); c.lineTo(xb, yb); c.lineTo(xb, yb + 9); c.stroke();
      c.fillStyle = COL.psr; c.font = `600 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillText(`1${DEC}337 s`, (xa + xb) / 2, yb - 5);
    }
    c.restore();
    // a pena: trilho e ponta
    const yPen = Math.max(y0 + 2, base - pen * A);
    c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; c.beginPath(); c.moveTo(xp, y0); c.lineTo(xp, y1); c.stroke();
    c.save(); c.shadowColor = COL.psr; c.shadowBlur = 10 + 30 * hit; c.fillStyle = hit > 0.15 ? '#fff' : COL.psr;
    c.beginPath(); c.arc(xp, yPen, 4.5, 0, 2 * Math.PI); c.fill(); c.restore();
    // marcas de tempo (só no papel já escrito)
    c.fillStyle = COL.text3; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let s = Math.max(0, Math.ceil(ta)); s <= t; s++) { const x = X(s); if (x > x0 + 12 && x < xp - 10) c.fillText(`${s} s`, x, y1 + 8); }
    c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillStyle = COL.text2; c.font = `17px ${FONT}`;
    c.fillText(`PSR B1919+21 · 81${DEC}5 MHz`, x0 + 2, y0 - 10);
    c.textAlign = 'right'; c.fillStyle = COL.text3; c.font = `15px ${FONT}`;
    c.fillText(T('registro simulado', 'simulated record'), x1, y0 - 11);
    readout();
  }
  function frame(dt, still) {
    if (still) { reset(1919); t = T0 + 6 * PER + 0.012; } else t += dt;
    gen(t); render();
  }
  reset(1919);
  P4.anim(cv, frame, () => reset(1919 + (Math.random() * 1e6 | 0)));
})();

/* Diagrama P–Ṗ com o catálogo ATNF 2.8.1 (assets/ppdot.js: 2 855 pulsares com Ṗ > 0). Para um dipolo
   girando no vácuo com a estrela canônica (1,4 M☉, R = 10 km, I = 10⁴⁵ g cm²):
   B = 3,2×10¹⁹ (PṖ)^½ G,  τc = P/2Ṗ,  Ė = 4π²IṖ/P³ = 3,9×10⁴⁶ Ṗ/P³ erg/s.
   Em log–log, B constante é uma reta de inclinação −1 (tracejada) e τc constante, de inclinação +1
   (pontilhada). Os pontos aparecem classe por classe quando o slide entra (uma vez por visita);
   o mouse mostra o pulsar mais próximo. 11 pulsares caem fora dos eixos (P > 20 s ou Ṗ < 10⁻²¹). */
(() => {
  const cv = document.getElementById('ppdot'); if (!cv || !window.PPDOT) return;
  const D = window.PPDOT, out = document.getElementById('ppdot-out'), nEl = document.getElementById('ppdot-n');
  if (nEl) nEl.textContent = P4.grp(D.length);
  const YR = 3.15576e7;
  const CL = [
    { n: T('comuns', 'normal'), s: T('comuns', 'normal'), c: 'rgba(168,184,214,.6)', r: 1.8, t0: 0 },
    { n: T('de milissegundo', 'millisecond'), s: T('milissegundo', 'millisecond'), c: COL.psr, r: 2.1, t0: 0.35 },
    { n: T('jovens (τc < 10⁵ anos)', 'young (τc < 10⁵ yr)'), s: T('jovens', 'young'), c: COL.sol, r: 2.6, t0: 0.7 },
    { n: 'RRATs', s: 'RRATs', c: 'rgba(160,166,182,.9)', r: 2.7, t0: 1.0, ring: true },
    { n: T('magnetares', 'magnetars'), s: T('magnetares', 'magnetars'), c: COL.neb, r: 4.8, t0: 1.55, glow: 16 },
    { n: T('isoladas em raios X (XINS)', 'isolated X-ray (XINS)'), s: 'XINS', c: COL.ana, r: 3.8, t0: 1.3, glow: 8 },
  ];
  CL.forEach((k, i) => { k.N = D.filter(d => d[2] === i).length; });
  const ORDER = [0, 3, 1, 2, 5, 4], FADE = 0.55;                      // ordem de desenho (magnetares por cima); duração do fade
  const pdB = (B, p) => (B / 3.2e19) ** 2 / p, pdT = (tau, p) => p / (2 * tau * YR);
  const BL = [[1e8, 0.00118], [1e10, 0.0016], [1e12, 0.0016], [1e14, 0.026]];   // [B (G), P do rótulo]
  const TL = [[1e3, 0.0037], [1e5, 0.0037], [1e7, 0.0037], [1e9, 0.15]];            // [τc (anos), P do rótulo]
  const ANN = [                                                                    // pontos com nome; dx, dy em px
    { p: 0.033392, pd: 4.2097e-13, t: T('Caranguejo', 'Crab'), k: 2, dx: -34, dy: -26 },
    { p: 1.337302, pd: 1.3482e-15, t: 'LGM-1', k: 0, dx: 44, dy: 46 },
    { p: 3.763733, pd: 1.7564e-11, t: 'SGR J1745−2900', k: 4, dx: -40, dy: -34 },
  ];
  const sup = e => '10' + P4.sup(e);
  const P = new Plot(cv, { x: [1e-3, 20], y: [1e-21, 1e-9], xlog: true, ylog: true, m: [14, 16, 62, 90], fs: 16,
    xticks: [1e-3, 1e-2, 0.1, 1, 10], xfmt: v => String(v).replace('.', DEC),
    yticks: Array.from({ length: 13 }, (_, i) => 10 ** (i - 21)), yfmt: v => { const e = Math.round(Math.log10(v)); return e % 2 ? '' : sup(e); } });
  const base = document.createElement('canvas');
  const px = new Float32Array(2 * D.length);
  let el = 99, hov = -1, dirty = true, shown = null;
  const alphaOf = k => Math.max(0, Math.min(1, (el - CL[k].t0) / FADE));
  function render() {
    P.begin().frame(T('período P (s)', 'period P (s)'), T('Ṗ (s/s)', 'Ṗ (s/s)'));
    const c = P.ctx;
    for (let i = 0; i < D.length; i++) { px[2 * i] = P.X(D[i][0]); px[2 * i + 1] = P.Y(D[i][1]); }
    P.clip();
    // retas de B e de τc constantes
    const line = (f, dash, col) => { c.save(); c.strokeStyle = col; c.lineWidth = 1.3; c.setLineDash(dash); c.beginPath(); c.moveTo(P.X(1e-3), P.Y(f(1e-3))); c.lineTo(P.X(20), P.Y(f(20))); c.stroke(); c.restore(); };
    const lab = (f, p, txt, col) => {
      const x = P.X(p), y = P.Y(f(p)), a = Math.atan2(P.Y(f(p * 2)) - y, P.X(p * 2) - x);
      c.save(); c.translate(x, y); c.rotate(a); c.font = `15px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'bottom';
      c.lineWidth = 4; c.lineJoin = 'round'; c.strokeStyle = 'rgba(17,20,31,.8)'; c.strokeText(txt, 0, -4); c.fillStyle = col; c.fillText(txt, 0, -4); c.restore();
    };
    BL.forEach(([B]) => line(p_ => pdB(B, p_), [7, 6], 'rgba(255,255,255,.26)'));
    TL.forEach(([tau]) => line(p_ => pdT(tau, p_), [1.5, 4.5], 'rgba(255,184,107,.4)'));
    // os pulsares, classe por classe
    ORDER.forEach(k => {
      const a = alphaOf(k), s = CL[k]; if (a <= 0) return;
      c.save(); c.globalAlpha = a; c.fillStyle = c.strokeStyle = s.c; c.lineWidth = 1.3;
      if (s.glow) { c.shadowColor = s.c; c.shadowBlur = s.glow; }
      c.beginPath();
      for (let i = 0; i < D.length; i++) if (D[i][2] === k) { const x = px[2 * i], y = px[2 * i + 1]; c.moveTo(x + s.r, y); c.arc(x, y, s.r, 0, 2 * Math.PI); }
      s.ring ? c.stroke() : c.fill(); c.restore();
    });
    // rótulos das retas por cima dos pontos
    BL.forEach(([B, p]) => lab(p_ => pdB(B, p_), p, sup(Math.log10(B)) + ' G', 'rgba(220,226,240,.66)'));
    TL.forEach(([tau, p]) => lab(p_ => pdT(tau, p_), p, sup(Math.log10(tau)) + T(' anos', ' yr'), 'rgba(255,200,140,.75)'));
    P.unclip();
    // três pulsares com nome
    ANN.forEach(q => {
      const a = alphaOf(q.k); if (a <= 0) return;
      const x = P.X(q.p), y = P.Y(q.pd), tx = x + q.dx, ty = y + q.dy;
      c.save(); c.globalAlpha = a; c.strokeStyle = '#fff'; c.lineWidth = 1.6; c.shadowColor = CL[q.k].c; c.shadowBlur = 10;
      c.beginPath(); c.arc(x, y, 7.5, 0, 2 * Math.PI); c.stroke(); c.shadowBlur = 0;
      const ux = tx - x, uy = ty - y, d = Math.hypot(ux, uy);
      c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x + ux / d * 9, y + uy / d * 9); c.lineTo(tx - ux / d * 4, ty - uy / d * 4); c.stroke();
      c.font = `600 17px ${FONT}`; c.textAlign = q.dx < 0 ? 'right' : 'left'; c.textBaseline = q.dy < 0 ? 'bottom' : 'top';
      c.lineWidth = 5; c.strokeStyle = 'rgba(15,18,28,.85)'; c.lineJoin = 'round'; c.strokeText(q.t, tx, ty); c.fillStyle = COL.text; c.fillText(q.t, tx, ty);
      c.restore();
    });
    // legenda: classes e contagens
    {
      const lh = 22, wd = 262, x0 = P.R - wd - 8, y0 = P.B - lh * CL.length - 14 - 8;
      c.save(); c.fillStyle = 'rgba(15,18,28,.82)'; c.strokeStyle = 'rgba(255,255,255,.08)';
      c.beginPath(); c.roundRect(x0, y0, wd, lh * CL.length + 14, 10); c.fill(); c.stroke();
      c.font = `15px ${FONT}`; c.textBaseline = 'middle';
      [0, 1, 2, 3, 5, 4].forEach((k, j) => {
        const s = CL[k], y = y0 + 7 + lh * (j + 0.5), a = Math.max(0.25, alphaOf(k));
        c.globalAlpha = a; c.fillStyle = c.strokeStyle = s.c; c.lineWidth = 1.5;
        c.beginPath(); c.arc(x0 + 16, y, Math.min(s.r + 0.6, 4.5), 0, 2 * Math.PI); s.ring ? c.stroke() : c.fill();
        c.fillStyle = COL.text2; c.textAlign = 'left'; c.fillText(s.n, x0 + 30, y);
        c.fillStyle = COL.text3; c.textAlign = 'right'; c.fillText(P4.grp(s.N), x0 + wd - 12, y);
      });
      c.restore();
    }
    base.width = cv.width; base.height = cv.height; base.getContext('2d').drawImage(cv, 0, 0);
    overlay();
  }
  const fP = p => p < 0.1 ? P4.num(p * 1e3, p < 0.01 ? 2 : 1) + ' ms' : P4.num(p, 3) + ' s';
  const html = i => {
    if (i < 0) return [0, 1, 2, 3, 4, 5].map(k => `<span>${CL[k].s} <b>${P4.grp(CL[k].N)}</b></span>`).join('');
    const [p, pd, k] = D[i], tau = p / (2 * pd) / YR;
    return `<span style="color:${CL[k].c}">● ${CL[k].s}</span>
      <span>P <b>${fP(p)}</b></span><span>Ṗ <b>${P4.sci(pd, 2)}</b></span>
      <span>B <b>${P4.sci(3.2e19 * Math.sqrt(p * pd), 1)} G</b></span>
      <span>τ<sub>c</sub> <b>${tau < 1e5 ? P4.grp(+tau.toPrecision(3)) : P4.sci(tau, 1)} ${T('anos', 'yr')}</b></span>
      <span>Ė <b>${P4.sci(3.9e46 * pd / p ** 3, 1)} erg/s</b></span>`;
  };
  // altura fixa: o leiaute não pula quando o texto troca (mede o caso padrão e o mais longo)
  let fixed = false;
  function readout() {
    if (!fixed && out.offsetWidth) {
      out.style.minHeight = ''; let hmax = 0;
      [-1, D.findIndex(d => d[2] === 4)].forEach(i => { out.innerHTML = html(i); hmax = Math.max(hmax, out.offsetHeight); });
      out.style.minHeight = hmax + 'px'; fixed = true; shown = null;
    }
    if (shown === hov) return; shown = hov; out.innerHTML = html(hov);
  }
  // camada do mouse: copia o gráfico pronto e desenha só o destaque
  function overlay() {
    const c = P.ctx, r = cv.width / cv.clientWidth;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); c.drawImage(base, 0, 0); c.setTransform(r, 0, 0, r, 0, 0);
    if (hov >= 0) {
      const x = px[2 * hov], y = px[2 * hov + 1], s = CL[D[hov][2]];
      c.save(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([3, 4]); c.lineWidth = 1;
      c.beginPath(); c.moveTo(P.L, y); c.lineTo(x - 10, y); c.moveTo(x, y + 10); c.lineTo(x, P.B); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#fff'; c.lineWidth = 2; c.shadowColor = s.c; c.shadowBlur = 14; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.stroke();
      c.restore();
    }
    readout();
  }
  cv.addEventListener('pointermove', e => {
    const [mx, my] = canvasPoint(cv, e); let best = -1, bd = 18 * 18;
    if (mx >= P.L && mx <= P.R && my >= P.T && my <= P.B)
      for (let i = 0; i < D.length; i++) { if (alphaOf(D[i][2]) <= 0) continue; const dx = px[2 * i] - mx, dy = px[2 * i + 1] - my, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } }
    if (best !== hov) { hov = best; overlay(); }
  });
  cv.addEventListener('pointerleave', () => { if (hov >= 0) { hov = -1; overlay(); } });
  addEventListener('stagefit', () => { dirty = true; });
  if (document.fonts) document.fonts.ready.then(() => { dirty = true; });
  P4.anim(cv, (dt, still) => {
    if (still) { el = 99; render(); dirty = false; return; }
    const was = el; el += dt;
    if (was < 2.2 || dirty) { render(); dirty = false; }
  }, () => { el = 0; hov = -1; dirty = true; });
})();

/* Animação: um magnetar girando, no período real de SGR J1745−2900 (P = 3,7637 s, Ṗ = 1,756×10⁻¹¹ s/s).
   Campo de dipolo: no referencial magnético, cada linha é r = L sin²θ (L em raios da estrela), de pé
   a pé na superfície. O eixo magnético está inclinado de 35° do eixo de rotação; o observador vê o
   eixo de rotação a 64°. Projeção ortográfica: um ponto atrás da estrela some se cai sobre o disco.
   Os surtos (a cada 7–12 s) são ilustrativos: um clarão no pé de uma linha, a frente de luz que se
   expande e as linhas acendendo. Dos valores medidos de P e Ṗ (estrela canônica):
   B = 3,2×10¹⁹ √(PṖ) = 2,6×10¹⁴ G, τc = P/2Ṗ ≈ 3 400 anos, Ė = 3,9×10⁴⁶ Ṗ/P³ = 1,3×10³⁴ erg/s. */
(() => {
  const cv = document.getElementById('magnetar'); if (!cv) return;
  const out = document.getElementById('magnetar-out');
  const PER = 3.7637, PDOT = 1.756e-11, YR = 3.15576e7;
  const BETA = 35 * Math.PI / 180, ZETA = 64 * Math.PI / 180, ROLL = -8 * Math.PI / 180;
  const LS = [1.5, 2.25, 3.4], NAZ = 8, NPT = 72;
  // linhas de campo no referencial magnético (eixo do dipolo = z), calculadas uma vez
  const LINES = [];
  LS.forEach((L, li) => {
    const th0 = Math.asin(Math.sqrt(1 / L));
    for (let a = 0; a < NAZ; a++) {
      const ph = (a + 0.5 * (li % 2)) / NAZ * 2 * Math.PI, pts = new Float32Array(3 * (NPT + 1));
      for (let k = 0; k <= NPT; k++) {
        const th = th0 + (Math.PI - 2 * th0) * k / NPT, r = L * Math.sin(th) ** 2;
        pts[3 * k] = r * Math.sin(th) * Math.cos(ph); pts[3 * k + 1] = r * Math.sin(th) * Math.sin(ph); pts[3 * k + 2] = r * Math.cos(th);
      }
      LINES.push({ L, pts });
    }
  });
  // matrizes 3×3 (arrays de 9, por linhas)
  const mul = (A, B) => { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[3 * i + j] = A[3 * i] * B[j] + A[3 * i + 1] * B[3 + j] + A[3 * i + 2] * B[6 + j]; return C; };
  const ap = (M, x, y, z) => [M[0] * x + M[1] * y + M[2] * z, M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z];
  const cb = Math.cos(BETA), sb = Math.sin(BETA), cz = Math.cos(ZETA), sz = Math.sin(ZETA), cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  const RX = [1, 0, 0, 0, cb, -sb, 0, sb, cb];                                   // inclina o dipolo
  // câmera: linhas = direita, cima e direção do observador (ortográfica), com um leve giro na tela
  const CAM = mul([cr, -sr, 0, sr, cr, 0, 0, 0, 1], [0, 1, 0, -cz, 0, sz, sz, 0, cz]);
  const B = 3.2e19 * Math.sqrt(PER * PDOT), TAU = PER / (2 * PDOT) / YR, EDOT = 3.9e46 * PDOT / PER ** 3;
  out.innerHTML = `<span>P <b>${P4.num(PER, 2)} s</b></span>
    <span>B <b>≈ ${P4.sci(B, 1)} G</b></span>
    <span>${T('idade característica', 'characteristic age')} <b>≈ ${P4.grp(Math.round(TAU / 100) * 100)} ${T('anos', 'yr')}</b></span>
    <span>Ė<sub>rot</sub> <b>≈ ${P4.sci(EDOT, 1)} erg/s</b></span>
    <span>${T('surtos vistos', 'bursts seen')} <b class="nb">0</b></span>
    <span class="fl" style="color: var(--neb); font-weight: 600; opacity: 0; transition: opacity .25s">✦ ${T('surto!', 'burst!')}</span>`;
  const nbEl = out.querySelector('.nb'), flEl = out.querySelector('.fl');
  let t = 0, nextB = 3.5, bAge = Infinity, bPos = [0, 0, 1], hotSet = new Set(), nB = 0, rnd = Math.random;
  function trigger(M) {
    // escolhe o pé de uma linha voltado para o observador
    const cand = [];
    LINES.forEach((ln, i) => [0, NPT].forEach(k => { const z = ap(M, ln.pts[3 * k], ln.pts[3 * k + 1], ln.pts[3 * k + 2])[2]; if (z > 0.3) cand.push([i, k]); }));
    const [li, k] = cand[Math.floor(rnd() * cand.length)] || [0, 0], p = LINES[li].pts;
    // a frente de luz parte do ponto onde o surto aconteceu (fixo na tela, não gira com a estrela);
    // acendem as linhas cujos pés ficam a menos de ~25° do local (reconexão)
    bPos = ap(M, p[3 * k], p[3 * k + 1], p[3 * k + 2]);
    const f = [p[3 * k], p[3 * k + 1], p[3 * k + 2]];
    hotSet = new Set(); LINES.forEach((ln, i) => [0, NPT].forEach(q => { const d = ln.pts[3 * q] * f[0] + ln.pts[3 * q + 1] * f[1] + ln.pts[3 * q + 2] * f[2]; if (d > Math.cos(0.45)) hotSet.add(i); }));
    bAge = 0; nB++; nextB = 7 + 5 * rnd();
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 / 3.75;
    const psi = 2 * Math.PI * t / PER, cp = Math.cos(psi), sp = Math.sin(psi);
    const MB = mul(CAM, [cp, -sp, 0, sp, cp, 0, 0, 0, 1]), M = mul(MB, RX);   // corpo → tela; magnético → tela
    const hid = (x, y, z) => z < 0 && x * x + y * y < 1;
    const SX = x => cx + x * R, SY = y => cy - y * R;
    const fl = bAge < 3 ? Math.exp(-bAge / 0.7) : 0;                          // intensidade do surto
    // halo
    const gh = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * (2.4 + 1.2 * fl));
    gh.addColorStop(0, `rgba(140,240,228,${(0.3 + 0.35 * fl).toFixed(3)})`); gh.addColorStop(1, 'rgba(86,225,208,0)');
    c.fillStyle = gh; c.beginPath(); c.arc(cx, cy, R * (2.4 + 1.2 * fl), 0, 2 * Math.PI); c.fill();
    // eixos (tracejados), escondidos atrás da estrela
    const axis = (Mx, v, a0, a1, col) => {
      c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash([6, 6]); c.beginPath(); let pen = false;
      for (let k = 0; k <= 40; k++) { const s = a0 + (a1 - a0) * k / 40, [x, y, z] = ap(Mx, v[0] * s, v[1] * s, v[2] * s); if (hid(x, y, z) || s * s < 1) { pen = false; continue; } pen ? c.lineTo(SX(x), SY(y)) : c.moveTo(SX(x), SY(y)); pen = true; }
      c.stroke(); c.setLineDash([]);
    };
    axis(MB, [0, 0, 1], -1.9, 2.3, 'rgba(255,255,255,.45)');
    axis(M, [0, 0, 1], -3.4, 3.4, 'rgba(86,225,208,.55)');
    // a estrela: esfera sombreada, luz do alto à esquerda
    const gs = c.createRadialGradient(cx - R * .38, cy - R * .42, R * .05, cx, cy, R);
    gs.addColorStop(0, '#f4fffd'); gs.addColorStop(.28, '#a8f2e9'); gs.addColorStop(.72, '#2a958b'); gs.addColorStop(1, '#0c3a37');
    c.fillStyle = gs; c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.fill();
    c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.clip();
    // meridianos e paralelos do corpo, para ver a rotação
    c.strokeStyle = 'rgba(8,40,38,.35)'; c.lineWidth = 1;
    const sph = (pt) => { c.beginPath(); let pen = false; pt.forEach(([a, b, d]) => { const [x, y, z] = ap(MB, a, b, d); if (z < 0) { pen = false; return; } pen ? c.lineTo(SX(x), SY(y)) : c.moveTo(SX(x), SY(y)); pen = true; }); c.stroke(); };
    for (let m = 0; m < 6; m++) { const ph = m * Math.PI / 6; sph(Array.from({ length: 61 }, (_, k) => { const th = k / 60 * 2 * Math.PI; return [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]; })); }
    [-60, -30, 0, 30, 60].forEach(lat => { const l = lat * Math.PI / 180; sph(Array.from({ length: 61 }, (_, k) => { const p = k / 60 * 2 * Math.PI; return [Math.cos(l) * Math.cos(p), Math.cos(l) * Math.sin(p), Math.sin(l)]; })); });
    // polos magnéticos quentes
    [1, -1].forEach(sg => {
      const [x, y, z] = ap(M, 0, 0, sg); if (z < -0.1) return;
      const rr = R * 0.42, ang = Math.atan2(-y, x);
      c.save(); c.translate(SX(x * 0.98), SY(y * 0.98)); c.rotate(ang); c.scale(Math.max(z, 0.08), 1);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, `rgba(255,255,255,${(0.95).toFixed(2)})`); g.addColorStop(.35, 'rgba(255,226,170,.75)'); g.addColorStop(1, 'rgba(255,184,107,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, rr, 0, 2 * Math.PI); c.fill(); c.restore();
    });
    c.restore();
    // as linhas de campo, por faixas de profundidade (um traço largo e fraco + um fino)
    const BK = [[], [], [], []], ALP = [0.2, 0.36, 0.58, 0.85];
    const hot = [];
    LINES.forEach((ln, i) => {
      const p = ln.pts, scr = new Float32Array(3 * (NPT + 1)), vis = new Uint8Array(NPT + 1);
      for (let k = 0; k <= NPT; k++) { const [x, y, z] = ap(M, p[3 * k], p[3 * k + 1], p[3 * k + 2]); scr[3 * k] = SX(x); scr[3 * k + 1] = SY(y); scr[3 * k + 2] = z; vis[k] = !hid(x, y, z); }
      if (fl > 0.02 && hotSet.has(i)) hot.push({ scr, vis });
      for (let k = 0; k < NPT; k++) {
        if (!vis[k] || !vis[k + 1]) continue;
        const f = ((scr[3 * k + 2] + scr[3 * k + 5]) / 2 / 3.6 + 1) / 2;
        BK[Math.max(0, Math.min(3, Math.floor(f * 4)))].push(scr[3 * k], scr[3 * k + 1], scr[3 * k + 3], scr[3 * k + 4]);
      }
    });
    c.lineCap = 'round';
    BK.forEach((sg, b) => {
      if (!sg.length) return;
      c.beginPath(); for (let q = 0; q < sg.length; q += 4) { c.moveTo(sg[q], sg[q + 1]); c.lineTo(sg[q + 2], sg[q + 3]); }
      const a = Math.min(1, ALP[b] * (1 + 0.9 * fl));
      c.strokeStyle = `rgba(120,236,222,${(a * 0.16).toFixed(3)})`; c.lineWidth = 6; c.stroke();
      c.strokeStyle = `rgba(190,250,242,${a.toFixed(3)})`; c.lineWidth = 1.5; c.stroke();
    });
    // o surto: a linha que se rompe, o clarão e a frente de luz
    if (fl > 0.02) {
      c.save(); c.shadowColor = COL.sol; c.shadowBlur = 16; c.lineWidth = 2.6; c.strokeStyle = `rgba(255,222,165,${Math.min(1, 1.3 * fl).toFixed(3)})`;
      hot.forEach(hl => {
        c.beginPath(); let pen = false;
        for (let k = 0; k <= NPT; k++) { if (!hl.vis[k]) { pen = false; continue; } pen ? c.lineTo(hl.scr[3 * k], hl.scr[3 * k + 1]) : c.moveTo(hl.scr[3 * k], hl.scr[3 * k + 1]); pen = true; }
        c.stroke();
      });
      c.restore();
      const fx = SX(bPos[0]), fy = SY(bPos[1]), a = bAge;
      c.save(); c.globalCompositeOperation = 'lighter';
      if (a < 0.5) { const u = a / 0.5, rf = R * (0.3 + 2.4 * u), g = c.createRadialGradient(fx, fy, 0, fx, fy, rf);
        g.addColorStop(0, `rgba(255,255,255,${(1 - u).toFixed(3)})`); g.addColorStop(.3, `rgba(255,214,170,${(0.8 * (1 - u)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,143,171,0)');
        c.fillStyle = g; c.beginPath(); c.arc(fx, fy, rf, 0, 2 * Math.PI); c.fill(); }
      if (a < 2) { const rr = R * (0.5 + 3.6 * a), al = 0.6 * (1 - a / 2) ** 2, g = c.createRadialGradient(fx, fy, rr * 0.8, fx, fy, rr);
        g.addColorStop(0, 'rgba(255,143,171,0)'); g.addColorStop(.78, `rgba(255,180,200,${al.toFixed(3)})`); g.addColorStop(1, 'rgba(255,143,171,0)');
        c.fillStyle = g; c.beginPath(); c.arc(fx, fy, rr, 0, 2 * Math.PI); c.fill(); }
      c.restore();
    }
    // rótulos
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textBaseline = 'bottom';
    { const [x, y] = ap(MB, 0, 0, 2.3); c.textAlign = 'left'; c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText(T('eixo de rotação', 'spin axis'), SX(x) + 8, SY(y) + 6); }
    { const [x, y, z] = ap(M, 0, 0, 3.4); if (!hid(x, y, z)) { c.textAlign = x > 0 ? 'left' : 'right'; c.fillStyle = 'rgba(86,225,208,.8)'; c.fillText(T('eixo magnético', 'magnetic axis'), SX(x) + (x > 0 ? 8 : -8), SY(y)); } }
    c.textAlign = 'left'; c.fillStyle = COL.text2; c.font = `17px ${FONT}`; c.textBaseline = 'top'; c.fillText('SGR J1745−2900', 6, 6);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textBaseline = 'bottom';
    c.fillText(T('linhas de um dipolo inclinado · rotação em tempo real', 'field lines of a tilted dipole · real-time rotation'), 6, h - 4);
    c.textAlign = 'right'; c.fillText(T('surtos ilustrativos', 'illustrative bursts'), w - 6, h - 4);
    const on = bAge < 2 ? '1' : '0';
    if (nbEl.textContent !== String(nB)) nbEl.textContent = nB;
    if (flEl.style.opacity !== on) flEl.style.opacity = on;
  }
  function frame(dt, still) {
    const orient = () => { const psi = 2 * Math.PI * t / PER, cp = Math.cos(psi), sp = Math.sin(psi); return mul(mul(CAM, [cp, -sp, 0, sp, cp, 0, 0, 0, 1]), RX); };
    if (still) { t = 0.3 * PER; nB = 0; rnd = P4.rng(1745); trigger(orient()); bAge = 0.45; render(); return; }   // quadro fixo: um surto em andamento
    t += dt; bAge += dt; nextB -= dt;
    if (nextB <= 0) trigger(orient());
    render();
  }
  P4.anim(cv, frame, () => { t = 0; nextB = 3 + 2 * Math.random(); bAge = Infinity; nB = 0; rnd = Math.random; });
})();


/* ---------------- periélio de Mercúrio ---------------- */
/* Animação: o periélio de Mercúrio. Órbita da RG em primeira ordem, r(φ) = p / (1 + e cos(kφ)),
   com k = 1 − Δφ/2π e Δφ = 6πGM/(c²a(1−e²)) = 5,02×10⁻⁷ rad = 0,1035″ por órbita (42,98″/século).
   Desenhada com a precessão EXAGERADA (×EXAG); os contadores mostram os valores reais.
   O movimento obedece à lei das áreas: dφ/dt = h/r². */
(() => {
  const cv = document.getElementById('mercury'); if (!cv) return;
  const A = 0.387098, E = 0.205630, PDAYS = 87.9691, ARC = 0.1035;   // UA; −; dias; ″ por órbita (RG)
  const EXAG = 3e5, D = 5.0187e-7 * EXAG, K = 1 - D / (2 * Math.PI), P = A * (1 - E * E);
  const ORBIT_S = 1.6;                                               // segundos de tela por órbita
  const rOf = ph => P / (1 + E * Math.cos(K * ph));
  let H = 0; { const n = 4000, L = 2 * Math.PI / K; for (let i = 0; i < n; i++) { const r = rOf((i + .5) * L / n); H += r * r * L / n; } H /= ORBIT_S; }
  const out = document.getElementById('mercury-out');
  let ph = 0, raf = 0, last = 0, trail = [], peri = [0];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const cx = w / 2, cy = h / 2, S = Math.min(w, h) / 2 / (A * (1 + E) * 1.12);
    const XY = (r, a) => [cx + r * Math.cos(a) * S, cy - r * Math.sin(a) * S];
    // a elipse de Newton, fixa (tracejada)
    c.setLineDash([6, 7]); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.3; c.beginPath();
    for (let i = 0; i <= 360; i++) { const a = i * Math.PI / 180, [x, y] = XY(P / (1 + E * Math.cos(a)), a); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
    // o rastro da RG, cada volta mais apagada
    const nOrb = ph * K / (2 * Math.PI);
    for (let i = 1; i < trail.length; i++) {
      const age = nOrb - trail[i][2], al = Math.max(0, 1 - age / 10);
      if (al <= 0) continue;
      const [x0, y0] = XY(trail[i - 1][0], trail[i - 1][1]), [x1, y1] = XY(trail[i][0], trail[i][1]);
      c.strokeStyle = `rgba(158,140,255,${(0.15 + 0.75 * al * al).toFixed(3)})`; c.lineWidth = 1 + 1.6 * al;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    // periélios: marcas e a linha que gira
    const rp = A * (1 - E);
    peri.forEach((a, i) => { const [x, y] = XY(rp, a); c.fillStyle = i === peri.length - 1 ? COL.mu : 'rgba(86,225,208,.45)'; c.beginPath(); c.arc(x, y, i === peri.length - 1 ? 5 : 3, 0, 7); c.fill(); });
    const pl = peri[peri.length - 1], [px, py] = XY(rp * 1.9, pl), [p0x, p0y] = XY(rp * 1.9, 0);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.setLineDash([3, 6]); c.beginPath(); c.moveTo(cx, cy); c.lineTo(p0x, p0y); c.stroke(); c.setLineDash([]);
    c.strokeStyle = COL.mu; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(px, py); c.stroke();
    if (pl > 0.01) { c.strokeStyle = 'rgba(86,225,208,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, rp * 1.5 * S, -pl, 0); c.stroke(); }
    // o Sol e Mercúrio
    const g = c.createRadialGradient(cx, cy, 2, cx, cy, 26); g.addColorStop(0, '#fff'); g.addColorStop(.35, '#ffd08a'); g.addColorStop(1, 'rgba(255,184,107,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 26, 0, 7); c.fill();
    const r = rOf(ph), [mx, my] = XY(r, ph);
    c.fillStyle = '#d9d4cc'; c.shadowColor = '#fff'; c.shadowBlur = 12; c.beginPath(); c.arc(mx, my, 6, 0, 7); c.fill(); c.shadowBlur = 0;
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'top';
    c.fillText(T('tracejado: a elipse de Newton, que fecha · violeta: a órbita da RG', 'dashed: Newton’s ellipse, which closes · violet: the GR orbit'), 10, 8);
    c.textAlign = 'right'; c.fillStyle = COL.warn;
    c.fillText(T('precessão exagerada 300 000×', 'precession exaggerated 300,000×'), w - 10, 8);
    c.textBaseline = 'alphabetic';
    const yrs = nOrb * PDAYS / 365.25;
    out.innerHTML = `<span>${T('órbitas', 'orbits')} <b>${Math.floor(nOrb)}</b></span>
      <span>${T('tempo real', 'real time')} <b>${yrs.toFixed(1).replace('.', DEC)} ${T('anos', 'years')}</b></span>
      <span>${T('avanço real acumulado', 'real accumulated advance')} <b>${(nOrb * ARC).toFixed(2).replace('.', DEC)}″</b></span>
      <span>${T('mostrado', 'shown')} <b>${(pl * 180 / Math.PI).toFixed(0)}°</b></span>`;
  }
  function step(dt) {
    // passos de tempo fixos (≤ 4 ms), ponto médio: a lei das áreas perto do periélio. Passo em TEMPO,
    // não em ângulo — a versão anterior podia ficar com um resto subnormal que nunca zerava.
    const n = Math.max(1, Math.ceil(dt / 0.004)), hs = dt / n;
    for (let i = 0; i < n; i++) {
      const r0 = rOf(ph), rm = rOf(ph + 0.5 * H / (r0 * r0) * hs), dph = H / (rm * rm) * hs;
      const before = Math.floor(K * ph / (2 * Math.PI)); ph += dph;
      if (Math.floor(K * ph / (2 * Math.PI)) > before) peri.push(2 * Math.PI * Math.floor(K * ph / (2 * Math.PI)) * (1 / K - 1));
      trail.push([rOf(ph), ph, K * ph / (2 * Math.PI)]);
    }
    const nOrb = ph * K / (2 * Math.PI);
    while (trail.length && nOrb - trail[0][2] > 10) trail.shift();
    if (peri.length > 60) peri.shift();
    if (nOrb > 42) { ph = 0; trail = []; peri = [0]; }                 // recomeça depois de uma volta completa do periélio (42 × 8,6°)
  }
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const tick = now => {
      if (!cv.closest('.slide').classList.contains('active')) { raf = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      step(dt); render(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  let ff = typeof FF === 'number' ? FF : 0;                          // ?ff=N (PDF): entra com N s de rosácea
  addEventListener('slidechange', () => { if (cv.closest('.slide').classList.contains('active')) { for (; ff > 0; ff -= 1 / 60) step(1 / 60); if (reduce) { for (let i = 0; i < 600; i++) step(1 / 60); render(); } else loop(); } });
  onSlide(cv, render);
})();

/* ---------------- Pound–Rebka ---------------- */
/* Animação: Pound–Rebka (1959–60) e a mesma lei numa estrela de nêutrons.
   Torre de 22,5 m, γ de 14,4 keV do ⁵⁷Fe: Δν/ν = gh/c² = 2,46×10⁻¹⁵. O absorvedor, movido a
   v = gh/c = 0,736 μm/s, devolve por Doppler o que a gravidade deu (descendo) ou tirou (subindo).
   A linha (fonte ⊗ absorvedor) tem FWHM ≈ 194 μm/s, ~260× o desvio: o gráfico mostra só o fundo
   da linha, com o eixo vertical ampliado — o mínimo sai deslocado de ±0,74 μm/s.
   Estrela de nêutrons 1,4 M☉, 12 km: λ(r) = λ₀ √(1 − r_s/r) / √(1 − r_s/R); no infinito 500 → 618 nm. */
(() => {
  const cvT = document.getElementById('pr-tower'); if (!cvT) return;
  const cvN = document.getElementById('pr-ns'), out = document.getElementById('pr-out');
  const V0 = 0.736, GAM = 96.95, PHASE_S = 12, SWEEP_S = 6, VMAX = 3;      // μm/s; s
  const RS = 2 * 1.4 * 1.47662, RNS = 12, L0 = 500;                          // km; nm
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let t = 0, raf = 0, last = 0;
  function rgb(nm) {                                                          // comprimento de onda visível → cor
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    const f = nm < 420 ? .3 + .7 * (nm - 380) / 40 : nm > 700 ? .3 + .7 * (780 - nm) / 80 : 1;
    return [r, g, b].map(x => Math.round(255 * Math.pow(Math.max(0, x) * f, 0.8)));
  }
  const css = (nm, a = 1) => { const [r, g, b] = rgb(nm); return `rgba(${r},${g},${b},${a})`; };
  function render() {
    const down = Math.floor(t / PHASE_S) % 2 === 0;                           // fonte em cima: os γ descem
    const v0 = down ? V0 : -V0;
    const v = VMAX * Math.sin(2 * Math.PI * t / SWEEP_S);                     // velocidade do absorvedor (+ = afastando da fonte)
    /* ---- a torre e a linha ---- */
    {
      const { ctx: c, w, h } = fitCanvas(cvT);
      const x0 = w * 0.07, x1 = w * 0.31, top = 54, bot = h - 46, xm = (x0 + x1) / 2;
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, top - 10); c.lineTo(x0, bot + 10); c.moveTo(x1, top - 10); c.lineTo(x1, bot + 10); c.stroke();
      c.lineWidth = 1; for (let k = 1; k < 6; k++) { const y = top + (bot - top) * k / 6; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
      c.fillStyle = COL.text3; c.font = `15px ${FONT}`; c.textAlign = 'center';
      c.save(); c.translate(x0 - 16, (top + bot) / 2); c.rotate(-Math.PI / 2); c.fillText('22,5 m', 0, 0); c.restore();
      const ySrc = down ? top : bot, yAbs = down ? bot : top;
      // fonte e absorvedor
      c.fillStyle = 'rgba(255,184,107,.9)'; c.fillRect(xm - 44, ySrc - 13, 88, 26);
      c.fillStyle = '#0a0b12'; c.font = `600 13px ${FONT}`; c.fillText(T('fonte ⁵⁷Co', 'source ⁵⁷Co'), xm, ySrc + 5);
      c.fillStyle = 'rgba(158,140,255,.9)'; c.fillRect(xm - 44, yAbs - 13, 88, 26);
      c.fillStyle = '#0a0b12'; c.fillText(T('abs. ⁵⁷Fe', 'abs. ⁵⁷Fe'), xm, yAbs + 5);
      // seta da velocidade do absorvedor (comprimento ∝ v; + = afastando-se da fonte)
      const dirAway = down ? 1 : -1, L = 22 * v / VMAX * dirAway, ya = yAbs;
      if (Math.abs(L) > 1) { c.strokeStyle = COL.warn; c.fillStyle = COL.warn; c.lineWidth = 2.5; c.beginPath(); c.moveTo(xm + 58, ya - L / 2); c.lineTo(xm + 58, ya + L / 2); c.stroke();
        const s = Math.sign(L); c.beginPath(); c.moveTo(xm + 58, ya + L / 2 + 6 * s); c.lineTo(xm + 53, ya + L / 2 - 2 * s); c.lineTo(xm + 63, ya + L / 2 - 2 * s); c.fill(); }
      // trem de onda contínuo da fonte ao absorvedor: λ local cresce subindo, encolhe descendo (exagerado)
      {
        const y0 = ySrc + (down ? 22 : -22), y1 = yAbs + (down ? -22 : 22), n = 420;
        let phase = -t * 2 * Math.PI * 1.1, py = null, px = null;
        for (let k = 0; k <= n; k++) {
          const u = k / n, y = y0 + (y1 - y0) * u;
          const nm = down ? 600 - 170 * u : 480 + 170 * u;            // descendo: vermelho → azul; subindo: azul → vermelho
          const lam = 34 * (nm / 600) ** 3;                            // período desenhado (px), ∝ λ³ para saltar aos olhos
          if (k) phase += 2 * Math.PI * Math.abs(y1 - y0) / n / lam;
          const x = xm + 11 * Math.sin(phase);
          if (k) { c.strokeStyle = css(nm, Math.min(1, 6 * u, 6 * (1 - u))); c.lineWidth = 2.6; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); }
          px = x; py = y;
        }
      }
      c.fillStyle = COL.warn; c.font = `13px ${FONT}`; c.textAlign = 'center';
      c.fillText(T('cores exageradas ~4×10¹³×', 'colours exaggerated ~4×10¹³×'), xm, h - 16);
      c.fillStyle = COL.text2; c.font = `15px ${FONT}`;
      c.fillText(down ? T('descendo: ganha energia', 'falling: gains energy') : T('subindo: perde energia', 'rising: loses energy'), xm, 24);
      // o encaixe em energia: a linha do fóton que chega (deslocada pela gravidade) e a linha que o
      // absorvedor aceita (deslocada por Doppler, ΔE/E = v/c). Larguras desenhadas ~400× menores que as
      // reais (FWHM 194 μm/s) para que o encaixe fique visível; as posições são as reais.
      {
        const L = x1 + 90, R = w - 24, top = 56, bot = h - 70, mid = (top + bot) / 2, X = e => L + (e + VMAX) / (2 * VMAX) * (R - L);
        const HW = 0.22, lor = (x, x0) => 1 / (1 + ((x - x0) / HW) ** 2);
        const amp = (bot - top) * 0.36, nmArr = down ? 430 : 650, nmLab = down ? 470 : 630;
        // eixo
        c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(L, mid); c.lineTo(R, mid); c.stroke();
        c.fillStyle = COL.text3; c.font = `14px ${FONT}`; c.textAlign = 'center';
        for (let k = -3; k <= 3; k++) { const x = X(k); c.beginPath(); c.moveTo(x, mid - 5); c.lineTo(x, mid + 5); c.stroke(); c.fillText(String(k).replace('-', '−'), x, mid + 22); }
        const xl = T('deslocamento de energia ΔE/E₀, em μm/s  (1 μm/s = 3,3×10⁻¹⁵)', 'energy shift ΔE/E₀, in μm/s  (1 μm/s = 3.3×10⁻¹⁵)');
        c.font = `15px ${FONT}`; while (c.measureText(xl).width > R - L && parseFloat(c.font) > 11) c.font = `${parseFloat(c.font) - 1}px ${FONT}`;
        c.fillStyle = COL.text2; c.fillText(xl, (L + R) / 2, h - 34);
        // E₀ de referência
        c.setLineDash([4, 5]); c.strokeStyle = COL.text3; c.beginPath(); c.moveTo(X(0), top - 6); c.lineTo(X(0), bot); c.stroke(); c.setLineDash([]);
        c.fillStyle = COL.text3; c.textAlign = 'center'; c.fillText(T('E₀ emitida', 'E₀ emitted'), X(0), top - 14);
        // linha do fóton que chega (para cima)
        const curve = (x0, sign, col, fill) => {
          c.beginPath(); c.moveTo(L, mid);
          for (let k = 0; k <= 300; k++) { const e = -VMAX + 2 * VMAX * k / 300; c.lineTo(X(e), mid - sign * amp * lor(e, x0)); }
          c.lineTo(R, mid); c.closePath(); c.fillStyle = fill; c.fill();
          c.beginPath(); for (let k = 0; k <= 300; k++) { const e = -VMAX + 2 * VMAX * k / 300, y = mid - sign * amp * lor(e, x0); k ? c.lineTo(X(e), y) : c.moveTo(X(e), y); }
          c.strokeStyle = col; c.lineWidth = 3; c.shadowColor = col; c.shadowBlur = 12; c.stroke(); c.shadowBlur = 0;
        };
        curve(v0, 1, css(nmArr), css(nmArr, .22));
        const fit = (txt, px, maxw, font = FONT, style = '') => { let f = px; c.font = `${style}${f}px ${font}`; while (c.measureText(txt).width > maxw && f > 11) { f -= 1; c.font = `${style}${f}px ${font}`; } };
        const ptxt = down ? T('γ que chega embaixo: +0,74 (ganhou energia)', 'γ arriving below: +0.74 (gained energy)') : T('γ que chega em cima: −0,74 (perdeu energia)', 'γ arriving above: −0.74 (lost energy)');
        fit(ptxt, 16, R - L); c.fillStyle = css(nmLab); c.textAlign = 'center';
        c.fillText(ptxt, Math.min(R - c.measureText(ptxt).width / 2, Math.max(L + c.measureText(ptxt).width / 2, X(v0))), mid - amp - 14);
        if (false) c.fillText(down ? T('γ que chega embaixo: +0,74 (ganhou energia)', 'γ arriving below: +0.74 (gained energy)') : T('γ que chega em cima: −0,74 (perdeu energia)', 'γ arriving above: −0.74 (lost energy)'), X(v0), mid - amp - 14);
        // linha que o absorvedor aceita (para baixo), na posição Doppler v
        curve(v, -1, COL.e, 'rgba(158,140,255,.22)');
        const ov = 1 / (1 + ((v - v0) / (2 * HW)) ** 2);
        if (ov > 0.9) {
          const btx = T(`encaixe: absorção máxima em v = gh/c = ${v0 > 0 ? '+' : '−'}0,74 μm/s`, `match: maximum absorption at v = gh/c = ${v0 > 0 ? '+' : '−'}0.74 μm/s`);
          fit(btx, 26, R - L, SERIF, 'italic '); c.fillStyle = '#fff'; c.textAlign = 'center'; c.shadowColor = '#fff'; c.shadowBlur = 14;
          c.fillText(btx, (L + R) / 2, mid + amp + 32); c.shadowBlur = 0;
        } else {
          const atx = T(`o que o absorvedor aceita (movendo-se a ${v.toFixed(2).replace('.', DEC)} μm/s)`, `what the absorber accepts (moving at ${v.toFixed(2)} μm/s)`);
          fit(atx, 16, R - L); c.fillStyle = COL.e; c.textAlign = 'center';
          const hw = c.measureText(atx).width / 2; c.fillText(atx, Math.min(R - hw, Math.max(L + hw, X(v))), mid + amp + 30);
        }
        c.fillStyle = COL.text3; c.font = `14px ${FONT}`; c.textAlign = 'right'; c.fillText(T('absorção', 'absorption'), R, top - 14);
        c.fillStyle = 'rgba(255,255,255,.08)'; c.fillRect(R - 150, top - 8, 150, 10);
        c.fillStyle = ov > 0.9 ? '#fff' : COL.e; c.fillRect(R - 150, top - 8, 150 * ov, 10);
        c.fillStyle = COL.text3; c.font = `13px ${FONT}`; c.textAlign = 'left';
        c.fillText(T('larguras desenhadas ~400× menores que as reais', 'line widths drawn ~400× narrower than real'), L, h - 10);
      }
      var vNow = v, v0Now = v0, downNow = down;
    }
    /* ---- a estrela de nêutrons: a mesma lei, sem exagero ---- */
    {
      const { ctx: c, w, h } = fitCanvas(cvN);
      const sx = w * 0.16, sy = h * 0.42, sr = Math.min(w, h) * 0.13, xe = w - 24;
      const rAt = x => RNS * Math.pow(40, (x - (sx + sr)) / (xe - (sx + sr)));   // raio físico ao longo do caminho (log)
      const lamAt = r => L0 * Math.sqrt(1 - RS / r) / Math.sqrt(1 - RS / RNS);
      // o caminho contínuo, colorido pelo comprimento de onda local
      for (let x = sx + sr; x < xe; x += 2) { c.strokeStyle = css(lamAt(rAt(x)), .35); c.lineWidth = 3; c.beginPath(); c.moveTo(x, sy); c.lineTo(x + 2.5, sy); c.stroke(); }
      // trem contínuo saindo da estrela: λ local real, esticando 1,235× até o infinito
      {
        const xa = sx + sr + 4, n = 500; let phase = -t * 2 * Math.PI * 1.1, px = null, py = null;
        for (let k = 0; k <= n; k++) {
          const x = xa + (xe - xa) * k / n, lam = lamAt(rAt(x)), wl = 24 * lam / L0;
          if (k) phase += 2 * Math.PI * ((xe - xa) / n) / wl;
          const y = sy + 13 * Math.sin(phase);
          if (k) { c.strokeStyle = css(lam); c.lineWidth = 2.6; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); }
          px = x; py = y;
        }
      }
      const g = c.createRadialGradient(sx - sr * .3, sy - sr * .3, sr * .1, sx, sy, sr); g.addColorStop(0, '#fff'); g.addColorStop(.6, '#ffe2b8'); g.addColorStop(1, '#ffb86b');
      c.shadowColor = '#ffb86b'; c.shadowBlur = 24; c.fillStyle = g; c.beginPath(); c.arc(sx, sy, sr, 0, 7); c.fill(); c.shadowBlur = 0;
      c.font = `15px ${FONT}`; c.textAlign = 'center'; c.fillStyle = COL.text2;
      c.fillText(T('estrela de nêutrons · 1,4 M☉ · 12 km', 'neutron star · 1.4 M☉ · 12 km'), sx + 40, sy + sr + 28);
      c.fillStyle = css(L0); c.fillText(T('sai com 500 nm', 'leaves at 500 nm'), sx + sr + 60, sy - 34);
      c.fillStyle = css(lamAt(1e9)); c.textAlign = 'right'; c.fillText(T('chega com 618 nm', 'arrives at 618 nm'), xe, sy - 34);
      // espectro com as duas marcas
      const bx0 = 24, bx1 = w - 24, by = h - 54, nmX = nm => bx0 + (nm - 400) / 300 * (bx1 - bx0);
      for (let x = bx0; x < bx1; x++) { c.fillStyle = css(400 + 300 * (x - bx0) / (bx1 - bx0)); c.fillRect(x, by, 1.5, 14); }
      [[L0, T('emitido', 'emitted')], [lamAt(1e9), T('observado', 'observed')]].forEach(([nm, lab]) => {
        const x = nmX(nm); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, by - 6); c.lineTo(x, by + 20); c.stroke();
        c.fillStyle = COL.text; c.textAlign = 'center'; c.font = `14px ${FONT}`; c.fillText(`${lab} ${Math.round(nm)} nm`, x, by + 38);
      });
      c.fillStyle = COL.mu; c.font = `15px ${FONT}`; c.textAlign = 'left';
      c.fillText(T('sem exagero: cores reais', 'no exaggeration: real colours'), 10, 22);
    }
    out.innerHTML = `<span>${T('torre', 'tower')} Δν/ν = gh/c² <b>2,46×10⁻¹⁵</b></span>
      <span>${T('ressonância em', 'resonance at')} <b>${(v0Now >= 0 ? '+' : '−')}0,74 μm/s</b> ${T('≈ 2,7 mm por hora', '≈ 2.7 mm per hour')}</span>
      <span>${T('absorvedor agora', 'absorber now')} <b>${vNow.toFixed(2).replace('.', DEC)} μm/s</b></span>
      <span>${T('estrela', 'star')} 1 + z = (1 − r<sub>s</sub>/R)<sup>−½</sup> <b>${(1 / Math.sqrt(1 - RS / RNS)).toFixed(3).replace('.', DEC)}</b></span>`.replace(/2,46|2,7 mm/g, m => DEC === '.' ? m.replace(',', '.') : m);
  }
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const tick = now => {
      if (!cvT.closest('.slide').classList.contains('active')) { raf = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
      t += dt; render(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  addEventListener('slidechange', () => { if (cvT.closest('.slide').classList.contains('active')) { if (reduce) { t = 1.3; render(); } else loop(); } });
  onSlide(cvT, render);
})();

/* ---------------- compacidade ---------------- */
/* Dashboard: compacidade — um slide só; os objetos passam sozinhos (a cada 3,5 s) até o primeiro clique. */
(() => {
  const cv = document.getElementById('compact-scale'); if (!cv) return;
  const cv2 = document.getElementById('compact-well');
  const OBJ = [
    { n: T('Terra', 'Earth'), s: T('Terra', 'Earth'), rsR: 8.87e-3 / 6.371e6, R: '6 371 km' },
    { n: T('Sol', 'Sun'), s: T('Sol', 'Sun'), rsR: 2953 / 6.957e8, R: '696 000 km' },
    { n: 'Sirius B', s: 'Sirius B', rsR: 3010 / 5.84e6, R: '5 840 km', d: T('anã branca, 1,02 M☉', 'white dwarf, 1.02 M☉') },
    { n: T('proto-estrela de nêutrons', 'proto-neutron star'), s: T('proto-EN', 'proto-NS'), rsR: 4135 / 30e3, R: '≈ 30 km', d: T('neutrinosfera, 1,4 M☉', 'neutrinosphere, 1.4 M☉') },
    { n: T('estrela de nêutrons', 'neutron star'), s: T('est. nêutrons', 'neutron star'), rsR: 4135 / 12e3, R: '12 km', d: T('1,4 M☉', '1.4 M☉') },
    { n: 'ISCO', s: 'ISCO', rsR: 1 / 3, R: '3 r_s', d: T('última órbita circular estável', 'innermost stable circular orbit') },
    { n: T('esfera de fótons', 'photon sphere'), s: T('esf. fótons', 'photon sph.'), rsR: 1 / 1.5, R: T('1,5 r_s', '1.5 r_s'), d: T('luz em órbita circular', 'light on a circular orbit') },
    { n: T('horizonte', 'horizon'), s: T('horizonte', 'horizon'), rsR: 1, R: 'r_s', d: T('buraco negro', 'black hole') },
  ];
  let sel = 4, auto = true, timer = 0;                      // começa na estrela de nêutrons
  const seg = document.getElementById('compact-sel');
  seg.innerHTML = OBJ.map((o, i) => `<button type="button" data-k="${i}" class="${i === sel ? 'on' : ''}">${o.s}</button>`).join('');
  const pick = k => { sel = k; seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.k === sel)); draw(); };
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; auto = false; pick(+b.dataset.k); });
  const slide = cv.closest('.slide');
  addEventListener('slidechange', () => {
    clearInterval(timer);
    if (!slide.classList.contains('active') || !auto || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pick(0); timer = setInterval(() => { if (auto && slide.classList.contains('active')) pick((sel + 1) % OBJ.length); else clearInterval(timer); }, 3500);
  });
  const out = document.getElementById('compact-out');
  const P = new Plot(cv, { x: [1e-10, 1.5], y: [0, 1], xlog: true, m: [26, 30, 60, 30], fs: 17, yticks: [], xticks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1] });
  const deflect = (x) => {                     // desvio exato de um raio rasante à superfície r = R (rs = 1)
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
  function draw() {
    const o = OBJ[sel], x = o.rsR;
    P.begin();
    const c = P.ctx;
    [[1e-10, 1e-5, T('Newton basta', 'Newton is enough'), 'rgba(255,255,255,.03)'], [1e-5, 0.05, T('correções pós-newtonianas', 'post-Newtonian corrections'), 'rgba(158,140,255,.06)'], [0.05, 1.5, T('RG plena', 'full GR'), 'rgba(158,140,255,.16)']]
      .forEach(([a, b, t, f]) => { c.fillStyle = f; c.fillRect(P.X(a), P.T, P.X(b) - P.X(a), P.B - P.T); P.text(Math.sqrt(a * b), 0.93, t, { color: COL.text3, align: 'center', size: 17 }); });
    P.frame(null, null);
    P.text(0.5 * (P.L + P.R), P.h - 6, 'r_s / R = 2GM/(Rc²)', { px: true, align: 'center', base: 'bottom', color: COL.text2, size: 18 });
    OBJ.forEach((ob, i) => {
      const on = i === sel, y = 0.2 + (i % 4) * 0.16;
      P.ctx.save(); P.ctx.strokeStyle = on ? COL.rt : 'rgba(255,255,255,.25)'; P.ctx.lineWidth = on ? 2.5 : 1;
      P.ctx.beginPath(); P.ctx.moveTo(P.X(ob.rsR), P.Y(0)); P.ctx.lineTo(P.X(ob.rsR), P.Y(y)); P.ctx.stroke(); P.ctx.restore();
      P.dot(ob.rsR, y, { color: on ? COL.rt : COL.text3, r: on ? 8 : 5, glow: on ? 20 : 0 });
      if (on || i < 3) P.text(ob.rsR, y + 0.075, ob.n, { color: on ? COL.text : COL.text3, align: i > 4 ? 'right' : 'center', size: on ? 19 : 16 });
    });
    // poço: perfil de Flamm z = 2√(r_s(r − r_s)), em unidades de R, fora do objeto
    const { ctx, w, h } = fitCanvas(cv2);
    const L = 40, Rr = w - 20, Tp = 30, B = h - 40, xmax = 6;
    const X = r => L + (r / xmax) * (Rr - L);
    const zOf = r => 2 * Math.sqrt(x * Math.max(r - x, 0));
    const z6 = zOf(xmax), zR = zOf(1), dz = Math.max(z6 - zR, 1e-12);
    const Y = r => Tp + (z6 - zOf(r)) / Math.max(dz, 1.2) * (B - Tp) * 0.95;
    ctx.strokeStyle = 'rgba(158,140,255,.9)'; ctx.lineWidth = 3; ctx.shadowColor = COL.rt; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const r = 1 + (xmax - 1) * i / 300; i ? ctx.lineTo(X(r), Y(r)) : ctx.moveTo(X(r), Y(r)); }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(158,140,255,.18)'; ctx.fillRect(L, Y(1), X(1) - L, B - Y(1) + 10);
    ctx.fillStyle = COL.text3; ctx.font = `16px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('R', X(1), h - 12); ctx.fillText('6R', X(6), h - 12); ctx.fillText(T('superfície de mergulho (Flamm), escala real', 'embedding surface (Flamm), true scale'), (L + Rr) / 2, 16);
    const z = 1 / Math.sqrt(1 - Math.min(x, 0.999999)) - 1, dt = (1 - Math.sqrt(1 - Math.min(x, 1))) * 86400, df = deflect(x);
    const fmt = v => v < 1e-3 ? v.toExponential(2).replace('.', DEC) : v.toPrecision(3).replace('.', DEC);
    const p3 = v => v.toPrecision(3).replace('.', DEC);
    const dur = s => s < 1e-3 ? p3(s * 1e6) + ' μs' : s < 1 ? p3(s * 1e3) + ' ms' : s < 60 ? p3(s) + ' s' : s < 3600 ? p3(s / 60) + ' min' : p3(s / 3600) + ' h';
    out.innerHTML = `<span>${o.n}${o.d ? ' · ' + o.d : ''} · R = ${o.R}</span>
      <span>r_s/R <b>${fmt(x)}</b></span>
      <span>${T('desvio para o vermelho', 'redshift')} z <b>${x >= 1 ? '∞' : fmt(z)}</b></span>
      <span>${T('relógio perde', 'clock loses')} <b>${x >= 1 ? '—' : dur(dt)}</b> ${T('por dia', 'per day')}</span>
      <span>${T('desvio da luz rasante', 'grazing light deflection')} <b>${isFinite(df) ? (df / deg < 1 ? (df / deg * 3600).toPrecision(3).replace('.', DEC) + '″' : (df / deg).toFixed(0) + '°') : T('captura', 'capture')}</b></span>`;
  }
  onSlide(cv, draw);
})();
