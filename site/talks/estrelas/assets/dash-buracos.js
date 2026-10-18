/* =====================================================================
   Parte V · buracos negros — animações e dashboards (slides 46 a 60)
   Mesmo desenho de dash.js: cada bloco procura o seu canvas pelo id e só
   roda se ele existir. Unidades geométricas (G = c = 1) com R_S = 2M = 1:
   distâncias saem em R_S e tempos em R_S/c. As animações só rodam com o
   slide ativo; na visão geral e com prefers-reduced-motion desenham um
   quadro estático representativo.
   ===================================================================== */
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

/* ============ 1 · Laplace (1796): uma estrela escura ============
   Aperte a Terra com a massa fixa. Velocidade de escape newtoniana (Michell/Laplace):
   v_esc = √(2GM/R) = c √(r_s/R), com r_s = 2GM/c² = 8,87 mm para a Terra.
   O slider leva R = R⊕ (r_s/R⊕)^v em escala log de 6 371 km até r_s; um patamar curto
   segura R = r_s (v_esc = c, o limiar) e o fim do curso aperta além, até 0,6 r_s.
   Corpúsculos de luz saem da superfície a c e seguem Newton, r̈ = −GM/r², em unidades
   de R e R/c: com R > r_s escapam; com R < r_s sobem até r_max = R/(1 − R/r_s) e caem. */
(() => {
  const cv = document.getElementById('escape'); if (!cv) return;
  const out = document.getElementById('escape-out');
  const RE = 6.371e6, RSE = 8.870e-3, MG = 5.972e27, CKM = 299792.458;     // m; m; g; km/s
  const S1 = 0.9, S2 = 0.93, DEEP = 0.6;                                     // fim da escala log; fim do patamar; aperto final
  const Rof = s => (s <= S1 ? RE * Math.pow(RSE / RE, s / S1) : s <= S2 ? RSE : RSE * Math.pow(DEEP, (s - S2) / (1 - S2)));
  const fmtR = R => (R >= 1e3 ? sig3(R / 1e3) + ' km' : R >= 1 ? sig3(R) + ' m' : R >= 0.01 ? sig3(R * 100) + ' cm' : sig3(R * 1e3) + ' mm');
  const gS = bindRange('escape-R', s => fmtR(Rof(s)), () => A.redraw());
  const TU = 0.5, RATE = 40;                         // s de tela por R/c; corpúsculos por segundo
  const spr = sprite('255,214,140');
  let parts = [], acc = 0, rView = 8;
  function step(dt) {
    const k = RSE / Rof(gS()) / 2, du = dt / TU;     // GM em unidades de R·c²
    for (acc += dt; acc > 1 / RATE; acc -= 1 / RATE) parts.push({ th: Math.random() * 2 * Math.PI, r: 1, v: 1 });
    const n = Math.max(1, Math.ceil(du / 0.01)), hh = du / n;
    for (const p of parts) for (let i = 0; i < n; i++) {                      // salto de rã (kick–drift–kick)
      p.v -= k / (p.r * p.r) * hh / 2; p.r += p.v * hh; p.v -= k / (p.r * p.r) * hh / 2;
    }
    // some quem cai de volta, ou quem sai da tela sem estar preso (energia ≥ 0)
    parts = parts.filter(p => p.r >= 1 && !(p.r > rView && p.v * p.v / 2 - k / p.r > -1e-6));
    if (parts.length > 1400) parts.splice(0, parts.length - 1400);
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const R = Rof(gS()), x = RSE / R, ve = Math.sqrt(x);
    const GH = 78, cx = w / 2, cy = (h - GH) / 2 + 14;
    const P0 = Math.min(w, h - GH) * 0.31, P1 = P0 * 0.42;                  // raio desenhado: R⊕ → r_s (log)
    const lg = Math.log(R / RSE) / Math.log(RE / RSE);
    const Rpx = P1 * Math.pow(P0 / P1, lg);
    rView = Math.hypot(w, h) / 2 / Rpx + 0.3;
    // referência: o tamanho de partida
    if (lg < 0.985) {
      c.save(); c.setLineDash([5, 7]); c.strokeStyle = 'rgba(124,196,255,.32)'; c.lineWidth = 1.3;
      c.beginPath(); c.arc(cx, cy, P0, 0, 7); c.stroke(); c.restore();
      rich(c, T('R_{⊕} = 6 371 km', 'R_{⊕} = 6,371 km'), cx + P0 * 0.74 + 8, cy - P0 * 0.74, { size: 15, color: 'rgba(124,196,255,.7)' });
    }
    // a Terra, o limiar, ou a estrela escura
    if (R > RSE * 1.0001) {
      const g = c.createRadialGradient(cx - Rpx * 0.35, cy - Rpx * 0.4, Rpx * 0.05, cx, cy, Rpx);
      g.addColorStop(0, '#e8f5ff'); g.addColorStop(0.25, '#8fd0ff'); g.addColorStop(0.7, '#2f6fb5'); g.addColorStop(1, '#0c2445');
      c.save(); c.shadowColor = COL.ana; c.shadowBlur = 34; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rpx, 0, 7); c.fill(); c.restore();
    } else {
      const thr = R > RSE * 0.9999;
      const g = c.createRadialGradient(cx, cy, Rpx * 0.95, cx, cy, Rpx * 1.9);
      g.addColorStop(0, 'rgba(158,140,255,.28)'); g.addColorStop(1, 'rgba(158,140,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, Rpx * 1.9, 0, 7); c.fill();
      const gd = c.createRadialGradient(cx - Rpx * 0.35, cy - Rpx * 0.4, Rpx * 0.05, cx, cy, Rpx);
      gd.addColorStop(0, thr ? '#2b3d63' : '#151826'); gd.addColorStop(1, '#030308');
      c.fillStyle = gd; c.beginPath(); c.arc(cx, cy, Rpx, 0, 7); c.fill();
      c.strokeStyle = 'rgba(158,140,255,.75)'; c.lineWidth = 1.5; c.stroke();
    }
    // corpúsculos de luz, com um rastro proporcional à velocidade
    c.save(); c.beginPath(); c.rect(0, 0, w, h - GH + 6); c.clip();
    c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineWidth = 2;
    for (const p of parts) {
      const cs = Math.cos(p.th), sn = Math.sin(p.th), r1 = p.r * Rpx, r0 = Math.max(Rpx, r1 - p.v * 24);
      const X1 = cx + r1 * cs, Y1 = cy - r1 * sn;
      if (X1 < -20 || X1 > w + 20 || Y1 < -20 || Y1 > h + 20) continue;
      c.strokeStyle = `rgba(255,214,140,${(0.25 + 0.4 * Math.min(1, Math.abs(p.v))).toFixed(3)})`;
      c.beginPath(); c.moveTo(cx + r0 * cs, cy - r0 * sn); c.lineTo(X1, Y1); c.stroke();
      blob(c, spr, X1, Y1, 15);
    }
    c.restore();
    rich(c, 'R = ' + fmtR(R), cx, cy + Rpx + 20, { size: 17, color: COL.text, align: 'center', weight: 600 });
    const st = R > RSE * 1.0001 ? [T('v_{esc} < c: a luz escapa', 'v_{esc} < c: light escapes'), COL.text2]
      : R > RSE * 0.9999 ? [T('v_{esc} = c: o limiar, R = 2GM/c^{2}', 'v_{esc} = c: the threshold, R = 2GM/c^{2}'), COL.bn]
      : [T('v_{esc} > c: a luz cai de volta · estrela escura', 'v_{esc} > c: light falls back · dark star'), COL.bn];
    rich(c, st[0], 8, 14, { size: 18, color: st[1], weight: 600 });
    rich(c, T('tamanho em escala log · tempo em R/c', 'size on a log scale · time in R/c'), w - 8, 14, { size: 14, color: COL.text3, align: 'right' });
    // medidor v_esc/c (o trecho além de c, em vermelho, só aparece apertando além de r_s)
    const gy = h - 30, gL = 18, gR = w - 18, VMAX = 1.3, gx = v => gL + (gR - gL) * Math.min(v, VMAX) / VMAX;
    rich(c, 'v_{esc} / c', gL, gy - 24, { size: 16, color: COL.text2 });
    rich(c, ve < 0.01 ? sci(ve, 1) : fx(ve, 3), gx(1), gy - 24, { size: 17, color: COL.text, align: 'right', weight: 600, font: 'ui-monospace, Menlo, monospace' });
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(gL, gy - 6, gR - gL, 12);
    c.fillStyle = 'rgba(255,122,138,.10)'; c.fillRect(gx(1), gy - 6, gR - gx(1), 12);
    const gg = c.createLinearGradient(gL, 0, gx(1), 0); gg.addColorStop(0, 'rgba(158,140,255,.55)'); gg.addColorStop(1, '#e9e4ff');
    c.save(); c.shadowColor = COL.bn; c.shadowBlur = 12; c.fillStyle = gg; c.fillRect(gL, gy - 6, Math.max(2, gx(Math.min(ve, 1)) - gL), 12);
    if (ve > 1) { c.fillStyle = COL.warn; c.shadowColor = COL.warn; c.fillRect(gx(1), gy - 6, gx(ve) - gx(1), 12); }
    c.restore();
    c.font = `14px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'center'; c.textBaseline = 'top';
    [0, 0.25, 0.5, 0.75].forEach(v => { c.fillRect(gx(v) - 0.5, gy + 6, 1, 5); c.fillText(fx(v, v ? 2 : 0), gx(v), gy + 12); });
    c.fillStyle = COL.text; c.font = `600 15px ${FONT}`; c.fillRect(gx(1) - 1, gy - 10, 2, 22); c.fillText('c', gx(1), gy + 12);
    c.textBaseline = 'alphabetic';
    const vk = CKM * ve, rho = MG / (4 / 3 * Math.PI * (R * 100) ** 3);
    setHTML(out, `<span>${T('raio', 'radius')} <b>${fmtR(R)}</b></span>
      <span>v<sub>esc</sub> <b>${vk < 1000 ? fx(vk, 1) : grp(vk)} km/s</b></span>
      <span>v<sub>esc</sub>/c <b>${ve < 0.01 ? sci(ve, 2) : fx(ve, 3)}</b></span>
      <span>${T('densidade média', 'mean density')} <b>${rho < 100 ? fx(rho, 2) : sci(rho, 1)} g/cm³</b></span>
      ${x > 1.0001 ? `<span>${T('a luz sobe até', 'light rises to')} <b>${fx(1 / (1 - 1 / x), 2)} R</b></span>` : ''}`);
  }
  const A = animate(cv, {
    step, render,
    still: () => { parts = []; acc = 0; for (let i = 0; i < 150; i++) step(1 / 60); },
    enter: () => { parts = []; acc = 0; },
  });
})();

/* ============ 2 · A régua no poço: distância própria ============
   Paraboloide de Flamm z(r) = 2√(R_S (r − R_S)): a fatia equatorial t = const de
   Schwarzschild desenhada como superfície do espaço euclidiano com a mesma geometria
   (dl² = dr² + dz² = dr²/(1 − R_S/r)). Escala verdadeira: r e z na mesma unidade.
   Uma régua de comprimento próprio FIXO (0,5 R_S) desliza por um meridiano; o Δr que ela
   cobre é ∫ √(1 − R_S/r) dl. No gráfico, a área sob (1 − R_S/r)^{−1/2} entre as pontas é
   sempre o comprimento da régua. Distância própria até o horizonte:
   d(x) = R_S[√(x(x − 1)) + ln(√x + √(x − 1))], x = r/R_S — de 3 R_S: 3,60 R_S, não 2. */
(() => {
  const cv = document.getElementById('regua'); if (!cv) return;
  const cvP = document.getElementById('regua-plot'), out = document.getElementById('regua-out');
  const LEN = 0.5, RMAX = 6.5, RTOP = 6, PITCH = 0.56, FOC = 60;
  const dprop = x => (x <= 1 ? 0 : Math.sqrt(x * (x - 1)) + Math.log(Math.sqrt(x) + Math.sqrt(x - 1)));
  const rOfD = s => bisect(dprop, s, 1, 1 + s + 1e-9, 56);                 // dl ≥ dr, então r ≤ 1 + d
  const zF = r => 2 * Math.sqrt(Math.max(r - 1, 0)), Z0 = zF(RMAX);
  const fac = r => 1 / Math.sqrt(1 - 1 / Math.max(r, 1.000001));
  const DMAX = dprop(RTOP) - LEN, SPEED = 1.1, HOLD = 1.4, TRAV = DMAX / SPEED, CYC = 2 * (TRAV + HOLD);
  const lowAt = p => {                                                       // vai e volta, devagar nas pontas
    if (p < HOLD) return DMAX; p -= HOLD;
    if (p < TRAV) return DMAX * (1 - ease(p / TRAV)); p -= TRAV;
    if (p < HOLD) return 0; return DMAX * ease((p - HOLD) / TRAV);
  };
  let ph = 0, sLow = dprop(3) - LEN / 2;
  const PL = new Plot(cvP, { x: [1, 6], y: [0, 5], m: [24, 16, 62, 62], fs: 16, xticks: [1, 2, 3, 4, 5, 6], yticks: [0, 1, 2, 3, 4, 5] });
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const cp = Math.cos(PITCH), sp = Math.sin(PITCH), YA = -Z0 - 1.55;     // YA: altura do eixo r, abaixo da garganta
    const S = Math.min((w - 30) / (RMAX + 1.3), (h - 64) / ((RMAX * sp - YA * cp) * 1.1));
    const yTop = RMAX * sp, yBot = YA * cp;
    const cx = S * 1.05 + 16, cy = h / 2 + 18 + (yTop + yBot) * S / 2;   // o eixo do funil perto da borda: a metade esquerda sai do quadro
    const P = (X, Y, Z) => { const Yv = Y * cp - Z * sp, Zv = Z * cp + Y * sp, k = FOC / (FOC - Zv); return [cx + X * S * k, cy - Yv * S * k, Zv]; };
    const surf = (r, f) => P(r * Math.cos(f), zF(r) - Z0, r * Math.sin(f));
    const poly = pts => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
    // malha: anéis a cada 0,5 R_S e meridianos a cada 15° (atrás mais apagados)
    c.lineWidth = 1.2; c.lineJoin = 'round';
    const ring = (r, f0, f1) => Array.from({ length: 65 }, (_, i) => surf(r, f0 + (f1 - f0) * i / 64));
    const MER = Array.from({ length: 31 }, (_, i) => { const z = Z0 * i / 30; return 1 + z * z / 4; });
    for (const back of [true, false]) {
      c.strokeStyle = back ? 'rgba(158,140,255,.30)' : 'rgba(158,140,255,.13)';      // a parede de trás é a que se vê por dentro
      for (let j = 0; j < 24; j++) { const f = j * Math.PI / 12; if ((Math.sin(f) < -1e-9) !== back) continue; poly(MER.map(r => surf(r, f))); c.stroke(); }
      c.strokeStyle = back ? 'rgba(158,140,255,.42)' : 'rgba(158,140,255,.2)';
      for (let r = 1.5; r <= RMAX + 1e-9; r += 0.5) { poly(back ? ring(r, Math.PI, 2 * Math.PI) : ring(r, 0, Math.PI)); c.stroke(); }
    }
    // o horizonte: a garganta do paraboloide
    poly(ring(1, 0, 2 * Math.PI)); c.fillStyle = 'rgba(0,0,0,.88)'; c.fill();
    c.save(); c.strokeStyle = COL.bn; c.lineWidth = 2.6; c.shadowColor = COL.bn; c.shadowBlur = 14; c.stroke(); c.restore();
    const [hx, hy] = surf(1, Math.PI / 2);
    rich(c, T('horizonte, r = R_{S}', 'horizon, r = R_{S}'), Math.max(8, hx - S), hy + 17, { size: 15, color: COL.bn });
    // eixo r (coordenada) embaixo, alinhado com o meridiano da régua
    const sHi = sLow + LEN, rLo = rOfD(sLow), rHi = rOfD(sHi), rMid = rOfD(sLow + LEN / 2);
    const [a0x, a0y] = P(0, YA, 0), [a1x, a1y] = P(RMAX + 0.25, YA, 0);
    c.strokeStyle = COL.axis; c.lineWidth = 1.3; c.beginPath(); c.moveTo(a0x, a0y); c.lineTo(a1x, a1y); c.stroke();
    for (let r = 1; r <= 6; r++) {
      const [x, y] = P(r, YA, 0); c.fillStyle = COL.text3; c.fillRect(x - 0.5, y, 1, 6);
      rich(c, String(r), x, y + 16, { size: 14, color: COL.text3, align: 'center' });
    }
    rich(c, T('r / R_{S} (coordenada)', 'r / R_{S} (coordinate)'), a1x, a1y + 38, { size: 14, color: COL.text3, align: 'right' });
    // projeções das pontas da régua no eixo: o Δr coberto
    c.save(); c.setLineDash([3, 5]); c.strokeStyle = 'rgba(255,184,107,.55)'; c.lineWidth = 1.2;
    for (const r of [rLo, rHi]) { const [x0, y0] = P(r, zF(r) - Z0, 0), [x1, y1] = P(r, YA, 0); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    c.restore();
    const [l0x, l0y] = P(rLo, YA, 0), [l1x, l1y] = P(rHi, YA, 0);
    c.save(); c.strokeStyle = COL.sol; c.lineWidth = 5; c.lineCap = 'round'; c.shadowColor = COL.sol; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(l0x, l0y); c.lineTo(l1x, l1y); c.stroke(); c.restore();
    if (rHi > 4) rich(c, 'Δr = ' + fx(rHi - rLo, 2), (l0x + l1x) / 2, l0y - 14, { size: 15, color: COL.sol, align: 'center', weight: 600 });
    else rich(c, 'Δr = ' + fx(rHi - rLo, 2), l1x + 10, l1y - 12, { size: 15, color: COL.sol, weight: 600 });
    // a régua: uma fita âmbar sobre o meridiano φ = 0, marcas a cada 0,1 R_S próprio
    const rp = Array.from({ length: 31 }, (_, i) => { const r = rOfD(sLow + LEN * i / 30); return P(r, zF(r) - Z0, 0); });
    c.lineCap = 'butt'; c.lineJoin = 'round';
    poly(rp); c.strokeStyle = 'rgba(7,8,14,.95)'; c.lineWidth = 11; c.stroke();
    c.save(); poly(rp); c.strokeStyle = COL.sol; c.lineWidth = 7; c.shadowColor = COL.sol; c.shadowBlur = 14; c.stroke(); c.restore();
    c.strokeStyle = '#2a1a05'; c.lineWidth = 1.6;
    for (let j = 0; j <= 5; j++) {
      const i = j * 6, a = rp[Math.max(0, i - 1)], b = rp[Math.min(30, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
      const nx = -dy / n, ny = dx / n, L = j % 5 === 0 ? 5 : 3.2;
      c.beginPath(); c.moveTo(rp[i][0] - nx * L, rp[i][1] - ny * L); c.lineTo(rp[i][0] + nx * L, rp[i][1] + ny * L); c.stroke();
    }
    const [mx, my] = rp[15], rl = T('régua: 0,5 R_{S}', 'ruler: 0.5 R_{S}'), rw = rich(c, rl, -999, -999, { size: 15, weight: 600 });
    const lx0 = rMid < 1.8 ? mx + 18 : mx - rw - 24;                          // perto da garganta, o rótulo vai para a direita
    c.fillStyle = 'rgba(15,18,28,.85)'; c.fillRect(lx0 - 6, my - 11, rw + 12, 22);
    rich(c, rl, lx0, my, { size: 15, color: COL.sol, weight: 600 });
    rich(c, T('paraboloide de Flamm · escala verdadeira', 'Flamm paraboloid · true scale'), 8, 12, { size: 14, color: COL.text3 });
    /* ---- gráfico: o fator (1 − R_S/r)^{−1/2} ---- */
    PL.begin(); PL.frame(null, null);
    const g = PL.ctx;
    rich(g, 'r / R_{S}', (PL.L + PL.R) / 2, PL.h - 12, { size: 17, color: COL.text2, align: 'center' });
    g.save(); g.translate(18, (PL.T + PL.B) / 2); g.rotate(-Math.PI / 2); rich(g, T('fator', 'factor'), 0, 0, { size: 17, color: COL.text2, align: 'center' }); g.restore();
    PL.clip();
    const ra = linspace(0, 1, 90).map(u => rLo + (rHi - rLo) * u);
    PL.area(ra, ra.map(fac), 0, { color: COL.sol, alpha: 0.3 });
    const rr = linspace(0, 1, 320).map(u => 1 + 5 * u * u);
    PL.line(rr, rr.map(fac), { color: COL.bn, width: 3, glow: 10 });
    PL.unclip();
    PL.hline(1, { color: COL.text3, dash: [5, 6], width: 1.2 });
    rich(g, T('espaço plano', 'flat space'), PL.X(1.08), PL.Y(1) + 14, { size: 14, color: COL.text3 });
    rich(g, '(1 − R_{S}/r)^{−1/2}', PL.X(1.32), PL.Y(4.45), { size: 16, color: COL.bn });
    rich(g, T('área = 0,5 R_{S}: a régua', 'area = 0.5 R_{S}: the ruler'), PL.R - 4, PL.T + 12, { size: 14, color: COL.sol, align: 'right' });
    const fm = fac(rMid);
    PL.dot(rMid, Math.min(fm, 4.95), { color: COL.sol, r: 6, glow: 16 });
    setHTML(out, `<span>${T('régua em', 'ruler at')} r <b>${fx(rMid, 2)} R<sub>S</sub></b></span>
      <span>${T('fator', 'factor')} <b>${fx(fm, 2)}</b></span>
      <span>Δr ${T('coberto', 'covered')} <b>${fx(rHi - rLo, 3)} R<sub>S</sub></b></span>
      <span>${T('até o horizonte', 'to the horizon')} <b>${fx(dprop(rMid), 2)} R<sub>S</sub></b></span>`);
  }
  animate(cv, {
    step: dt => { ph = (ph + dt) % CYC; sLow = lowAt(ph); },
    render,
    still: () => { sLow = dprop(3) - LEN / 2; },
    enter: () => { ph = 0; sLow = lowAt(0); },
  });
})();

/* ============ 3 · O tempo no poço: dois relógios iguais ============
   Um relógio lá longe (r → ∞) e outro parado em r. O de baixo anda no ritmo
   Δτ/Δt = √(1 − R_S/r) (corte Δr = Δθ = Δφ = 0 da métrica); os dois acumulam o tempo
   desde que o slide abriu, acelerados (1 h de longe = 6 s de tela). O poço é esquemático:
   raio em escala log e profundidade ∝ 1 − √(1 − R_S/r) — o quanto o relógio atrasa —, que
   fica vertical no horizonte. O slider vai de r = 20 R_S a 1,001 R_S, não linear. */
(() => {
  const cv = document.getElementById('relogios'); if (!cv) return;
  const out = document.getElementById('relogios-out');
  const rOfS = s => 1 + 19 * Math.pow(0.001 / 19, Math.pow(s, 1.36));      // s = 0,35 → r ≈ 2,8 R_S (estrela de nêutrons)
  const fmtr = r => (r - 1 < 0.01 ? fx(r, 4) : r - 1 < 0.1 ? fx(r, 3) : fx(r, 2));
  const gS = bindRange('relogios-r', s => fmtr(rOfS(s)), () => A.redraw());
  const rate = r => Math.sqrt(1 - 1 / r), HPS = 1 / 6;                       // horas de longe por segundo de tela
  let tFar = 0, tDeep = 0, lr = Math.log(rOfS(gS()) - 1);
  const hm = H => { const m = Math.floor(H * 60 + 1e-9); return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; };
  function clock(c, x, y, R, H) {
    c.save();
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 24; c.shadowOffsetY = 6;
    c.fillStyle = '#f5f2ea'; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill(); c.restore();
    c.save(); c.strokeStyle = '#d23440'; c.lineWidth = R * 0.11; c.beginPath(); c.arc(x, y, R - R * 0.055, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
    for (let i = 0; i < 60; i++) {
      const a = i * Math.PI / 30, big = i % 5 === 0, r1 = R * 0.84, r0 = r1 - R * (big ? 0.13 : 0.05);
      c.strokeStyle = '#1b1b20'; c.lineWidth = big ? 2.4 : 1;
      c.beginPath(); c.moveTo(x + r0 * Math.sin(a), y - r0 * Math.cos(a)); c.lineTo(x + r1 * Math.sin(a), y - r1 * Math.cos(a)); c.stroke();
    }
    c.fillStyle = '#1b1b20'; c.font = `${Math.round(R * 0.25)}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; c.fillText(String(i), x + R * 0.57 * Math.sin(a), y - R * 0.57 * Math.cos(a) + 1); }
    const hand = (a, L, W) => { c.lineWidth = W; c.beginPath(); c.moveTo(x - L * 0.16 * Math.sin(a), y + L * 0.16 * Math.cos(a)); c.lineTo(x + L * Math.sin(a), y - L * Math.cos(a)); c.stroke(); };
    c.strokeStyle = '#141418'; c.lineCap = 'round';
    hand(2 * Math.PI * (H % 12) / 12, R * 0.48, R * 0.075);
    hand(2 * Math.PI * (H % 1), R * 0.74, R * 0.05);
    c.fillStyle = '#d23440'; c.beginPath(); c.arc(x, y, R * 0.06, 0, 7); c.fill();
    c.restore();
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const r = 1 + Math.exp(lr), q = rate(r);
    const RC = clamp(h * 0.165, 40, 78), q0 = 24, q1 = w * 0.3, cx = w * 0.6, yR = Math.max(h * 0.34, 2 * RC + 26), HD = h - yR - 40, TILT = 0.2;
    const D = x => 1 - Math.sqrt(1 - 1 / x), D20 = D(20);
    const qq = x => q0 + (q1 - q0) * Math.log(x) / Math.log(20);
    const yy = x => yR + HD * (D(x) - D20) / (1 - D20);
    const E = (x, f) => [cx + qq(x) * Math.cos(f), yy(x) + TILT * qq(x) * Math.sin(f)];
    // o plano lá fora e o poço (malha)
    c.lineWidth = 1.1;
    [32, 50, 80].forEach((x, i) => { c.strokeStyle = `rgba(158,140,255,${0.12 - i * 0.03})`; c.beginPath(); c.ellipse(cx, yy(x), qq(x), TILT * qq(x), 0, 0, 7); c.stroke(); });
    const RINGS = [1.01, 1.03, 1.1, 1.25, 1.5, 2, 3, 5, 10, 20];
    const MX = Array.from({ length: 50 }, (_, i) => 1.001 + 18.999 * Math.pow(i / 49, 3));
    for (const back of [true, false]) {
      c.strokeStyle = back ? 'rgba(158,140,255,.14)' : 'rgba(158,140,255,.28)';
      for (let j = 0; j < 16; j++) {
        const f = j * Math.PI / 8; if ((Math.sin(f) < -1e-9) !== back) continue;
        c.beginPath(); MX.forEach((x, i) => { const [X, Y] = E(x, f); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
      }
      c.strokeStyle = back ? 'rgba(158,140,255,.2)' : 'rgba(158,140,255,.38)';
      RINGS.forEach(x => { c.beginPath(); c.ellipse(cx, yy(x), qq(x), TILT * qq(x), 0, back ? Math.PI : 0, back ? 2 * Math.PI : Math.PI); c.stroke(); });
    }
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, yy(1.001), qq(1.001), TILT * qq(1.001), 0, 0, 7); c.fill();
    c.save(); c.strokeStyle = COL.bn; c.lineWidth = 2.2; c.shadowColor = COL.bn; c.shadowBlur = 12; c.stroke(); c.restore();
    rich(c, T('horizonte', 'horizon'), cx - qq(1.001) - 10, yy(1.001), { size: 15, color: COL.bn, align: 'right' });
    [[1.5, '1,5'], [2, '2'], [3, '3'], [5, '5'], [20, '20']].forEach(([x, s]) => {
      const [X, Y] = E(x, Math.PI); rich(c, s.replace(',', DEC) + (x === 20 ? ' R_{S}' : ''), X - 7, Y - 9, { size: 14, color: COL.text3, align: 'right' });
    });
    // relógio de longe, sobre o plano
    const fx0 = Math.max(RC + 14, cx - q1 - RC - 70), fy = yR - RC - 16;
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx0, fy + RC); c.lineTo(fx0, yR); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(fx0, yR, 16, 4, 0, 0, 7); c.fill();
    clock(c, fx0, fy, RC, tFar);
    rich(c, T('lá longe (r → ∞)', 'far away (r → ∞)'), fx0, yR + 18, { size: 17, color: COL.text, align: 'center', weight: 600 });
    rich(c, T('ritmo 1', 'rate 1'), fx0, yR + 38, { size: 15, color: COL.text2, align: 'center' });
    // relógio no poço, parado em r, sobre a parede direita
    const ax = cx + qq(r), ay = yy(r), dy0 = ay - RC - 16;
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ax, dy0 + RC); c.lineTo(ax, ay); c.stroke();
    c.fillStyle = COL.bn; c.beginPath(); c.arc(ax, ay, 3.5, 0, 7); c.fill();
    clock(c, ax, dy0, RC, tDeep);
    const right = ax + RC + 190 < w, tx = right ? ax + RC + 14 : ax - RC - 14, al = right ? 'left' : 'right';
    rich(c, T('no poço', 'in the well') + ' · r = ' + fmtr(r) + ' R_{S}', tx, dy0 - 10, { size: 17, color: COL.text, align: al, weight: 600 });
    rich(c, T('ritmo ', 'rate ') + fx(q, 3), tx, dy0 + 12, { size: 15, color: COL.bn, align: al });
    rich(c, T('esquemático: raio em escala log,', 'schematic: radius on a log scale,'), 8, h - 34, { size: 14, color: COL.text3 });
    rich(c, T('profundidade ∝ 1 − √(1 − R_{S}/r) · 1 h de longe = 6 s', 'depth ∝ 1 − √(1 − R_{S}/r) · 1 h far away = 6 s'), 8, h - 14, { size: 14, color: COL.text3 });
    setHTML(out, `<span>r/R<sub>S</sub> <b>${fmtr(r)}</b></span>
      <span>${T('ritmo', 'rate')} Δτ/Δt <b>${fx(q, 3)}</b></span>
      <span>${T('1 h lá longe', '1 h far away')} = <b>${q < 0.1 ? fx(60 * q, 2) : fx(60 * q, 1)} min</b> ${T('no poço', 'in the well')}</span>
      <span>${T('longe', 'far')} <b>${hm(tFar)}</b> · ${T('no poço', 'in the well')} <b>${hm(tDeep)}</b></span>`);
  }
  const A = animate(cv, {
    step: dt => {
      lr += (Math.log(rOfS(gS()) - 1) - lr) * (1 - Math.exp(-dt * 7));       // o relógio desce/sobe suave até o r do slider
      tFar += dt * HPS; tDeep += dt * HPS * rate(1 + Math.exp(lr));
    },
    render,
    still: () => { lr = Math.log(rOfS(gS()) - 1); tFar = 2; tDeep = 2 * rate(1 + Math.exp(lr)); },
    enter: () => { tFar = 0; tDeep = 0; lr = Math.log(rOfS(gS()) - 1); },
  });
})();

/* ============ 4 · Visto de longe, o tempo congela ============
   Queda radial do repouso em r0 = 8 R_S (MTW §31.10, parâmetro de cicloide η):
     r = (r0/2)(1 + cos η),  τ = √(r0³/8M)(η + sin η),
     t = 2M ln|(√(r0/2M − 1) + tan(η/2))/(√(r0/2M − 1) − tan(η/2))| + 2M√(r0/2M − 1)[η + (r0/4M)(η + sin η)].
   A sonda pisca a cada Δτ = 1 R_S/c do próprio relógio. A luz sai pela radial: chega a um
   observador distante em t_obs = t_emit + r*(r_obs) − r*(r_emit), r* = r + R_S ln(r/R_S − 1);
   contamos t a partir de quando ele vê a largada. f_obs/f_emit = dτ/dt_obs =
   (1 − R_S/r)/(E + √(E² − 1 + R_S/r)), E = √(1 − R_S/r0): gravitacional + Doppler.
   Na tela, o relógio da sonda (posição verdadeira, fantasma) e o do observador (imagem)
   correm no mesmo ritmo. Brilho ∝ (f_obs/f_emit)⁴; cor = comprimento de onda recebido. */
(() => {
  const cv = document.getElementById('congela'); if (!cv) return;
  const out = document.getElementById('congela-out');
  const R0 = 8, E = Math.sqrt(1 - 1 / R0), AQ = Math.sqrt(R0 ** 3 / 4), Q7 = Math.sqrt(R0 - 1);
  const rE = e => R0 / 2 * (1 + Math.cos(e)), tauE = e => AQ * (e + Math.sin(e));
  const tE = e => Math.log(Math.abs((Q7 + Math.tan(e / 2)) / (Q7 - Math.tan(e / 2)))) + Q7 * (e + R0 / 2 * (e + Math.sin(e)));
  const rstar = r => r + Math.log(r - 1);
  const ETAH = 2 * Math.atan(Q7), TAUH = tauE(ETAH), TAU0 = tauE(Math.PI), U0 = -rstar(R0);
  const Tobs = e => tE(e) - rstar(rE(e)) - U0;
  const ratio = r => (1 - 1 / r) / (E + Math.sqrt(Math.max(E * E - 1 + 1 / r, 0)));
  const DTAU = 1, LAM = 450, Q00 = ratio(R0) ** 4;
  const FL = [];
  for (let k = 0; k * DTAU < TAU0; k++) {
    const tau = k * DTAU;
    if (tau < TAUH) { const e = bisect(tauE, tau, 0, ETAH); FL.push({ tau, T: Tobs(e), q: ratio(rE(e)) }); }
    else FL.push({ tau, T: Infinity, q: 0 });
  }
  const NIN = FL.filter(f => isFinite(f.T)).length;
  const RATE = 6, T_END = 62, HOLD = 1.8, CYC = T_END / RATE + HOLD;    // R_S/c por s de tela
  let s = 0;
  // comprimento de onda (nm) → cor; além de 700 nm, um vermelho escuro (infravermelho, esquemático)
  const wl = L => {
    let r = 0, g = 0, b = 0;
    if (L < 440) { r = (440 - L) / 60; b = 1; } else if (L < 490) { g = (L - 440) / 50; b = 1; } else if (L < 510) { g = 1; b = (510 - L) / 20; }
    else if (L < 580) { r = (L - 510) / 70; g = 1; } else if (L < 645) { r = 1; g = (645 - L) / 65; } else r = 1;
    const f = L > 700 ? Math.max(0.35, 1 - (L - 700) / 300) : 1;
    return [r, g, b].map(v => Math.round(255 * clamp(v, 0, 1) * f));
  };
  const rgbOf = q => wl(LAM / Math.max(q, 1e-3)).join(',');
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const tn = Math.min(s * RATE, T_END);                                     // os dois relógios na tela
    const yA = h * 0.29, bx = 108, SC = Math.min((w - bx - 92) / R0, yA - 30), X = r => bx + r * SC;
    // eixo radial
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, yA); c.lineTo(w - 16, yA); c.stroke();
    [2, 4, 6].forEach(r => { c.fillStyle = COL.text3; c.fillRect(X(r) - 0.5, yA - 3, 1, 6); rich(c, r + ' R_{S}', X(r), yA + 60, { size: 14, color: COL.text3, align: 'center' }); });
    rich(c, T('para o observador distante →', 'to the distant observer →'), w - 10, yA - 56, { size: 15, color: COL.text2, align: 'right' });
    // buraco negro
    const g = c.createRadialGradient(bx, yA, SC * 0.95, bx, yA, SC * 1.5); g.addColorStop(0, 'rgba(158,140,255,.25)'); g.addColorStop(1, 'rgba(158,140,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(bx, yA, SC * 1.5, 0, 7); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.arc(bx, yA, SC, 0, 7); c.fill();
    c.save(); c.strokeStyle = COL.bn; c.lineWidth = 1.8; c.shadowColor = COL.bn; c.shadowBlur = 10; c.stroke(); c.restore();
    rich(c, T('horizonte', 'horizon'), bx + SC * 0.71 + 8, yA - SC * 0.71 - 6, { size: 15, color: COL.bn });
    // a imagem: o que o observador vê agora (luz emitida em η tal que t_obs(η) = t)
    const eI = tn <= 0 ? 0 : bisect(Tobs, tn, 0, ETAH * (1 - 1e-15)), rI = rE(eI), qI = ratio(rI), bI = clamp(qI ** 4 / Q00, 0, 1);
    const xi = X(rI);
    c.save(); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.beginPath(); c.arc(xi, yA, 8, 0, 7); c.stroke(); c.restore();
    if (bI > 0.002) { c.save(); c.globalAlpha = Math.min(1, 0.15 + bI); blob(c, sprite(rgbOf(qI)), xi, yA, 18 + 26 * Math.sqrt(bI)); c.restore(); }
    const lastK = FL.reduce((m, f, k) => (f.T <= tn ? k : m), -1);
    if (lastK >= 0) {                                                          // pulso de cada piscada recebida
      const f = FL[lastK], age = (tn - f.T) / RATE;
      if (age < 0.4) { c.save(); c.globalAlpha = (1 - age / 0.4) * Math.min(1, 0.25 + (f.q ** 4) / Q00); c.strokeStyle = `rgb(${rgbOf(f.q)})`; c.lineWidth = 2.5; c.beginPath(); c.arc(xi, yA, 10 + 46 * age, 0, 7); c.stroke(); c.restore(); }
    }
    rich(c, T('imagem vista de longe', 'image seen from afar') + ' · t = ' + fx(tn, 1), xi, yA + 32, { size: 15, color: COL.text, align: rI < 2.4 ? 'left' : 'center' });
    // o fantasma: onde a sonda está, pelo relógio dela (cruza o horizonte sem nada de especial)
    if (tn < TAU0) {
      const rG = rE(bisect(tauE, tn, 0, Math.PI)), xg = X(rG);
      c.save(); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.beginPath(); c.arc(xg, yA, 11, 0, 7); c.stroke(); c.restore();
      rich(c, T('sonda', 'probe') + ' · τ = ' + fx(tn, 1), xg, yA - 26, { size: 15, color: COL.text2, align: rG < 2.4 ? 'left' : 'center' });
    } else rich(c, T('a sonda chegou a r = 0 em τ = ', 'the probe reached r = 0 at τ = ') + fx(TAU0, 1), bx + 6, yA - SC - 14, { size: 15, color: COL.text3 });
    /* ---- faixas: piscadas emitidas (τ) e recebidas (t) ---- */
    const xL = 150, xR = w - 22, Xt = t => xL + (xR - xL) * t / T_END, y1 = h * 0.6, y2 = h * 0.82, TH = 12;
    rich(c, T('emitidas', 'emitted'), 8, y1 - 9, { size: 16, color: COL.text, weight: 600 });
    rich(c, T('relógio da sonda, τ', 'probe clock, τ'), 8, y1 + 11, { size: 14, color: COL.text3 });
    rich(c, T('recebidas', 'received'), 8, y2 - 9, { size: 16, color: COL.text, weight: 600 });
    rich(c, T('relógio de longe, t', 'far clock, t'), 8, y2 + 11, { size: 14, color: COL.text3 });
    c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(xL, y1, xR - xL, 1); c.fillRect(xL, y2, xR - xL, 1);
    for (let t = 0; t <= 60; t += 10) rich(c, String(t), Xt(t), y2 + TH + 14, { size: 14, color: COL.text3, align: 'center' });
    rich(c, 'R_{S}/c', xR, y2 + TH + 34, { size: 14, color: COL.text3, align: 'right' });
    c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(158,140,255,.7)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(Xt(TAUH), y1 - TH - 8); c.lineTo(Xt(TAUH), y1 + TH + 4); c.stroke(); c.restore();
    rich(c, T('horizonte', 'horizon'), Xt(TAUH), y1 - TH - 18, { size: 14, color: COL.bn, align: 'center' });
    c.lineWidth = 2;
    FL.forEach(f => {
      if (f.tau > tn) return;
      const xe = Xt(f.tau);
      if (!isFinite(f.T)) {                                                   // emitida dentro do horizonte: nunca chega
        c.strokeStyle = 'rgba(255,122,138,.8)'; c.beginPath(); c.moveTo(xe - 5, y1 - 5); c.lineTo(xe + 5, y1 + 5); c.moveTo(xe + 5, y1 - 5); c.lineTo(xe - 5, y1 + 5); c.stroke();
        return;
      }
      const col = rgbOf(f.q), br = Math.min(1, (f.q ** 4) / Q00);
      c.strokeStyle = 'rgb(120,140,255)'; c.beginPath(); c.moveTo(xe, y1 - TH); c.lineTo(xe, y1 + TH); c.stroke();
      const xr = Xt(Math.min(f.T, T_END)), fr = f.T > tn ? (tn - f.tau) / (f.T - f.tau) : 1;
      if (f.T > T_END + 1e-9 && fr >= 1) return;
      c.strokeStyle = `rgba(${col},${(0.18 + 0.25 * br).toFixed(3)})`; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(xe, y1 + TH); c.lineTo(xe + (xr - xe) * fr, y1 + TH + (y2 - y1 - 2 * TH) * fr); c.stroke(); c.lineWidth = 2;
      if (fr < 1) { blob(c, sprite(col), xe + (xr - xe) * fr, y1 + TH + (y2 - y1 - 2 * TH) * fr, 10); return; }
      c.strokeStyle = 'rgba(255,255,255,.18)'; c.strokeRect(xr - 2, y2 - TH, 4, 2 * TH);
      c.save(); c.globalAlpha = Math.max(0.12, br); c.fillStyle = `rgb(${col})`; c.shadowColor = `rgb(${col})`; c.shadowBlur = 8 * br; c.fillRect(xr - 2, y2 - TH, 4, 2 * TH); c.restore();
    });
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(Xt(tn), y1 - TH - 4); c.lineTo(Xt(tn), y2 + TH + 2); c.stroke();
    rich(c, T('cor: λ recebido (emitido em 450 nm) · brilho ∝ (f_{obs}/f_{emit})^{4}', 'colour: received λ (emitted at 450 nm) · brightness ∝ (f_{obs}/f_{emit})^{4}'), xR, h - 10, { size: 14, color: COL.text3, align: 'right' });
    rich(c, T('unidades R_{S}/c: 98 μs para 10 M_{☉}, ≈ 1 s para 10^{5} M_{☉}', 'units R_{S}/c: 98 μs for 10 M_{☉}, ≈ 1 s for 10^{5} M_{☉}'), 8, 12, { size: 14, color: COL.text3 });
    rich(c, T('queda do repouso em 8 R_{S} · uma piscada a cada Δτ = 1 R_{S}/c', 'falls from rest at 8 R_{S} · one flash every Δτ = 1 R_{S}/c'), w - 8, 12, { size: 14, color: COL.text3, align: 'right' });
    const rec = FL.filter(f => f.T <= tn), last = rec[rec.length - 1];
    setHTML(out, `<span>${T('tempo próprio até o horizonte', 'proper time to the horizon')} <b>${fx(TAUH, 1)} R<sub>S</sub>/c</b></span>
      <span>${T('relógio da sonda', 'probe clock')} τ <b>${tn < TAU0 ? fx(tn, 1) : '—'}</b></span>
      <span>${T('relógio de longe', 'far clock')} t <b>${fx(tn, 1)}</b></span>
      <span>${T('piscadas recebidas', 'flashes received')} <b>${rec.length} / ${NIN}</b></span>
      <span>${T('última', 'last')} f<sub>obs</sub>/f<sub>emit</sub> <b>${last ? fx(last.q, 3) : '—'}</b></span>`);
  }
  animate(cv, {
    step: dt => { s += dt; if (s > CYC) s = 0; },
    render,
    still: () => { s = 52 / RATE; },
    enter: () => { s = 0; },
  });
})();

/* ============ 5 · Além do horizonte: os cones tombam ============
   Eddington–Finkelstein de entrada: t̃ = t + R_S ln|r/R_S − 1|. Raios radiais de luz:
   os que caem, dt̃/dr = −1 (45°); os “de saída”, dt̃/dr = (r + R_S)/(r − R_S), que se
   inclinam para fora longe, ficam verticais em r = R_S e apontam para dentro lá dentro.
   Famílias: t̃ = −r + C e t̃ = r + 2R_S ln|r/R_S − 1| + C. Uma partícula solta do repouso
   em r0 = 2,9 R_S cai (geodésica exata, parâmetro de cicloide η):
   dt̃/dτ = [E²(r + 1) + 1/r]/(E r − dr/dτ), regular no horizonte; E² = 1 − 1/r0.
   Escalas iguais em r e t̃ (os 45° são 45°); a janela acompanha a partícula. */
(() => {
  const cv = document.getElementById('cones'); if (!cv) return;
  const out = document.getElementById('cones-out');
  const R0 = 2.9, E2 = 1 - 1 / R0, E = Math.sqrt(E2), AQ = Math.sqrt(R0 ** 3 / 4), N = 3000;
  const dtt = eta => {
    const r = R0 / 2 * (1 + Math.cos(eta)), rd = -Math.sqrt(Math.max(E2 - 1 + 1 / r, 0));
    return (E2 * (r + 1) + 1 / r) / (E * r - rd) * AQ * (1 + Math.cos(eta));
  };
  const WL = [{ r: R0, tt: 0, tau: 0 }]; let tt = 0;
  for (let i = 0; i < N; i++) {                                             // Simpson em η
    const e0 = (Math.PI - 1e-7) * i / N, e1 = (Math.PI - 1e-7) * (i + 1) / N;
    tt += (e1 - e0) / 6 * (dtt(e0) + 4 * dtt((e0 + e1) / 2) + dtt(e1));
    WL.push({ r: R0 / 2 * (1 + Math.cos(e1)), tt, tau: AQ * (e1 + Math.sin(e1)) });
  }
  const TAUEND = WL[N].tau, RATE = 0.9, HOLD = 1.8, CYC = TAUEND / RATE + HOLD;
  const at = tau => {
    let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; WL[m].tau < tau ? (lo = m) : (hi = m); }
    const a = WL[lo], b = WL[hi], f = clamp((tau - a.tau) / (b.tau - a.tau || 1), 0, 1);
    return { r: a.r + (b.r - a.r) * f, tt: a.tt + (b.tt - a.tt) * f, i: lo };
  };
  const TAU_STILL = bisect(t => -at(t).r, -0.62, 0, TAUEND);                // quadro estático: partícula em r ≈ 0,62 R_S
  let s = 0, tau = TAU_STILL, cam = null;
  const spr = sprite('200,190,255');
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const L = 76, Rm = 14, Tp = 10, B = h - 54, rLo = -0.07, rHi = 3.08;
    const S = (w - L - Rm) / (rHi - rLo), Hu = (B - Tp) / S;
    const p = at(tau), want = Math.max(-0.14 * Hu, p.tt - 0.52 * Hu);
    cam = want;                                                               // janela [cam, cam + Hu]
    const X = r => L + (r - rLo) * S, Y = t => B - (t - cam) * S;
    c.save(); c.beginPath(); c.rect(L, Tp, w - L - Rm, B - Tp); c.clip();
    c.fillStyle = 'rgba(158,140,255,.06)'; c.fillRect(X(0), Tp, X(1) - X(0), B - Tp);
    // famílias de raios de luz
    c.lineWidth = 1.1;
    c.strokeStyle = 'rgba(124,196,255,.2)';
    for (let C = Math.floor(cam / 0.5) * 0.5; C < cam + Hu + rHi + 0.5; C += 0.5) { c.beginPath(); c.moveTo(X(0), Y(C)); c.lineTo(X(rHi), Y(C - rHi)); c.stroke(); }
    c.strokeStyle = 'rgba(255,184,107,.2)';
    const out1 = Array.from({ length: 70 }, (_, i) => 1 + (rHi - 1) * Math.pow((i + 1) / 70, 3));
    const in1 = Array.from({ length: 50 }, (_, i) => 1 - Math.pow((i + 1) / 50, 2.2) * 0.99999);
    for (let C = Math.floor((cam - rHi - 2 * Math.log(rHi - 1)) / 0.5) * 0.5; C < cam + Hu + 4; C += 0.5) {
      c.beginPath(); out1.forEach((r, i) => { const y = Y(r + 2 * Math.log(r - 1) + C); i ? c.lineTo(X(r), y) : c.moveTo(X(r), y); }); c.stroke();
    }
    for (let C = Math.floor(cam / 0.5) * 0.5; C < cam + Hu + 0.5; C += 0.5) {
      c.beginPath(); in1.forEach((r, i) => { const y = Y(r + 2 * Math.log(1 - r) + C); i ? c.lineTo(X(r), y) : c.moveTo(X(r), y); }); c.lineTo(X(0), Y(C)); c.stroke();
    }
    // cones de luz: a cunha entre a borda que cai (−1) e a borda de saída (r − 1, r + 1)
    const cone = (r, t, len, fill, a) => {
      const x = X(r), y = Y(t), ai = Math.atan2(-1, -1), ao = Math.atan2(-(r + 1), r - 1);
      c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ai, ao); c.closePath(); c.fillStyle = fill; c.fill();
      c.lineWidth = a > 0.8 ? 2.6 : 1.6;
      c.strokeStyle = `rgba(124,196,255,${a})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * Math.cos(ai), y + len * Math.sin(ai)); c.stroke();
      c.strokeStyle = `rgba(255,184,107,${a})`; c.beginPath(); c.moveTo(x, y); c.lineTo(x + len * Math.cos(ao), y + len * Math.sin(ao)); c.stroke();
    };
    for (let i = 1; i <= 12; i++) {
      const r = i * 0.25, off = i % 2 ? 0.25 : 0;
      for (let t = Math.floor((cam - 1) / 0.5) * 0.5 + off; t < cam + Hu + 0.5; t += 0.5) cone(r, t, 0.15 * S, 'rgba(158,140,255,.13)', 0.7);
    }
    // horizonte e singularidade
    c.save(); c.strokeStyle = COL.bn; c.lineWidth = 2.4; c.shadowColor = COL.bn; c.shadowBlur = 12;
    c.beginPath(); c.moveTo(X(1), Tp); c.lineTo(X(1), B); c.stroke(); c.restore();
    c.save(); c.strokeStyle = COL.warn; c.lineWidth = 2; c.shadowColor = COL.warn; c.shadowBlur = 8; c.beginPath();
    const dz = 8 / S; let k0 = Math.floor(cam / dz) - 1;
    for (let k = k0; Y(k * dz) > Tp - 10; k++) { const x = X(0) + (k % 2 ? 4 : -4), y = Y(k * dz); k === k0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke(); c.restore();
    // a partícula: linha de mundo, raios de luz que ela emite agora, e o seu cone
    glowStroke(c, () => { c.beginPath(); for (let i = 0; i <= p.i; i += 6) { const q = WL[i]; i ? c.lineTo(X(q.r), Y(q.tt)) : c.moveTo(X(q.r), Y(q.tt)); } c.lineTo(X(p.r), Y(p.tt)); }, '#d9d2ff', 3, COL.bn);
    c.save(); c.setLineDash([6, 5]); c.lineWidth = 1.6;
    c.strokeStyle = 'rgba(124,196,255,.75)'; c.beginPath(); c.moveTo(X(p.r), Y(p.tt)); c.lineTo(X(0), Y(p.tt + p.r)); c.stroke();
    const Cp = p.tt - p.r - 2 * Math.log(Math.abs(p.r - 1) + 1e-12);
    c.strokeStyle = 'rgba(255,184,107,.75)'; c.beginPath();
    if (p.r > 1.0005) { for (let i = 0; i <= 60; i++) { const r = p.r + (rHi - p.r) * i / 60, y = Y(r + 2 * Math.log(r - 1) + Cp); i ? c.lineTo(X(r), y) : c.moveTo(X(r), y); } }
    else if (p.r < 0.9995) { for (let i = 0; i <= 60; i++) { const r = p.r * (1 - i / 60), y = Y(r + 2 * Math.log(1 - r) + Cp); i ? c.lineTo(X(r), y) : c.moveTo(X(r), y); } }
    c.stroke(); c.restore();
    if (p.r > 0.004) cone(p.r, p.tt, 0.25 * S, 'rgba(158,140,255,.34)', 1);
    blob(c, spr, X(p.r), Y(p.tt), 26);
    c.restore();
    // eixos
    c.strokeStyle = COL.axis; c.lineWidth = 1; c.beginPath(); c.moveTo(L, Tp); c.lineTo(L, B); c.lineTo(w - Rm, B); c.stroke();
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'center'; c.textBaseline = 'top';
    for (let r = 0; r <= 3; r += 0.5) { c.fillRect(X(r) - 0.5, B, 1, 6); c.fillText(r % 1 ? fx(r, 1) : String(r), X(r), B + 9); }
    rich(c, 'r / R_{S}', (L + w - Rm) / 2, h - 10, { size: 17, color: COL.text2, align: 'center' });
    c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let t = Math.ceil(cam / 0.5) * 0.5; t <= cam + Hu; t += 0.5) { c.fillRect(L - 6, Y(t) - 0.5, 6, 1); c.fillText(fx(t, 1), L - 10, Y(t)); }
    c.save(); c.translate(20, (Tp + B) / 2); c.rotate(-Math.PI / 2); rich(c, T('t̃ (R_{S}/c) · futuro ↑', 't̃ (R_{S}/c) · future ↑'), 0, 0, { size: 17, color: COL.text2, align: 'center' }); c.restore();
    // rótulos e legenda
    const lab = (s, x, y, col, al = 'left') => { const W = rich(c, s, -9999, -9999, { size: 15 }); const x0 = al === 'left' ? x : x - W; c.fillStyle = 'rgba(15,18,28,.82)'; c.fillRect(x0 - 5, y - 11, W + 10, 22); rich(c, s, x0, y, { size: 15, color: col }); };
    lab(T('horizonte, r = R_{S}', 'horizon, r = R_{S}'), X(1) + 8, Tp + 16, COL.bn);
    lab(T('r = 0: singularidade', 'r = 0: singularity'), X(0) + 10, Tp + 42, COL.warn);
    const lx = w - Rm - 262, ly = Tp + 14;
    c.fillStyle = 'rgba(15,18,28,.85)'; c.fillRect(lx - 10, ly - 12, 266, 76);
    [['rgba(124,196,255,.95)', T('luz que cai: 45°', 'infalling light: 45°')], ['rgba(255,184,107,.95)', T('luz “para fora”', '“outgoing” light')], ['#d9d2ff', T('partícula, sempre dentro do cone', 'particle, always inside the cone')]]
      .forEach(([col, s], i) => { c.fillStyle = col; c.fillRect(lx, ly + i * 24 - 1.5, 22, 3); rich(c, s, lx + 30, ly + i * 24, { size: 15, color: COL.text2 }); });
    const inside = p.r < 1;
    setHTML(out, `<span>r ${T('da partícula', 'of the particle')} <b>${fx(p.r, 2)} R<sub>S</sub></b></span>
      <span>${T('tempo próprio', 'proper time')} τ <b>${fx(Math.min(tau, TAUEND), 2)} R<sub>S</sub>/c</b> · r = 0 ${T('em', 'at')} <b>${fx(TAUEND, 2)}</b></span>
      <span>${T('escapar?', 'escape?')} ${inside ? `<b style="color:var(--warn)">${T('impossível: todo futuro aponta para r menor', 'impossible: every future points to smaller r')}</b>` : `<b>${T('ainda é possível', 'still possible')}</b> ${T('(acelerando para fora)', '(by accelerating outward)')}`}</span>`);
  }
  animate(cv, {
    step: dt => { s += dt; if (s > CYC) s = 0; tau = Math.min(s * RATE, TAUEND); },
    render,
    still: () => { tau = TAU_STILL; },
    enter: () => { s = 0; tau = 0; },
  });
})();

/* ============ 6 · Sgr A*: as estrelas S no céu ============
   Órbitas keplerianas com os elementos publicados (Gillessen et al. 2017, ApJ 837, 30,
   tabela 3; S2, S29, S38 e S55 com os elementos do GRAVITY 2022, A&A 657, L12).
   Kepler: E − e sin E = 2π(t − t_P)/P, por Newton. Projeção com as constantes de
   Thiele–Innes: X = cos E − e, Y = √(1 − e²) sin E;
   Δδ (norte) = a(A X + F Y), Δα (leste) = a(B X + G Y); leste à ESQUERDA, norte para cima.
   Escala física: R0 = 8 277 pc, M = 4,297×10⁶ M☉ (GRAVITY 2022): a[UA] = a[″] × 8 277.
   Velocidade de S2 pela vis-viva, v² = GM(2/r − 1/a), com r = a(1 − e cos E) (3D). */
(() => {
  const cv = document.getElementById('sstars'); if (!cv) return;
  const out = document.getElementById('sstars-out');
  const SSTARS = [
    { name: 'S1', a: 0.595, e: 0.556, i: 119.14, Om: 342.04, w: 122.3, tP: 2001.8, P: 166.0 },
    { name: 'S2', a: 0.12495, e: 0.88441, i: 134.70, Om: 228.19, w: 66.25, tP: 2018.379, P: 16.05 },
    { name: 'S4', a: 0.357, e: 0.3905, i: 80.33, Om: 258.84, w: 290.8, tP: 1957.4, P: 77.0 },
    { name: 'S8', a: 0.4047, e: 0.8031, i: 74.37, Om: 315.43, w: 346.7, tP: 1983.64, P: 92.9 },
    { name: 'S9', a: 0.2724, e: 0.644, i: 82.41, Om: 156.6, w: 150.6, tP: 1976.71, P: 51.3 },
    { name: 'S12', a: 0.2987, e: 0.8883, i: 33.56, Om: 230.1, w: 317.9, tP: 1995.59, P: 58.9 },
    { name: 'S13', a: 0.2641, e: 0.425, i: 24.7, Om: 74.5, w: 245.2, tP: 2004.86, P: 49.0 },
    { name: 'S14', a: 0.2863, e: 0.9761, i: 100.59, Om: 226.38, w: 334.59, tP: 2000.12, P: 55.3 },
    { name: 'S17', a: 0.3559, e: 0.397, i: 96.83, Om: 191.62, w: 326.0, tP: 1991.19, P: 76.6 },
    { name: 'S18', a: 0.2379, e: 0.471, i: 110.67, Om: 49.11, w: 349.46, tP: 1993.86, P: 41.9 },
    { name: 'S19', a: 0.52, e: 0.75, i: 71.96, Om: 344.6, w: 155.2, tP: 2005.39, P: 135 },
    { name: 'S21', a: 0.219, e: 0.764, i: 58.8, Om: 259.64, w: 166.4, tP: 2027.4, P: 37.0 },
    { name: 'S23', a: 0.253, e: 0.56, i: 48.0, Om: 249, w: 39.0, tP: 2024.7, P: 45.8 },
    { name: 'S29', a: 0.3975, e: 0.9693, i: 144.37, Om: 7.00, w: 205.79, tP: 2021.410, P: 91.1 },
    { name: 'S31', a: 0.449, e: 0.5497, i: 109.03, Om: 137.16, w: 308.0, tP: 2018.07, P: 108 },
    { name: 'S38', a: 0.14254, e: 0.8145, i: 166.65, Om: 109.45, w: 27.17, tP: 2022.704, P: 19.5 },
    { name: 'S39', a: 0.37, e: 0.9236, i: 89.36, Om: 159.03, w: 23.3, tP: 2000.06, P: 81.1 },
    { name: 'S55', a: 0.10440, e: 0.7267, i: 158.52, Om: 314.94, w: 322.78, tP: 2021.694, P: 12.3 },
    { name: 'S60', a: 0.3877, e: 0.7179, i: 126.87, Om: 170.54, w: 29.37, tP: 2023.89, P: 87.1 },
    { name: 'S175', a: 0.414, e: 0.9867, i: 88.53, Om: 326.83, w: 68.52, tP: 2009.51, P: 96.2 },
  ];
  const R0PC = 8277, MBH = 4.297e6, VK = 29.7847;                          // pc; M☉; √(GM☉/UA) em km/s
  const Y0 = 1992, Y1 = 2030, SPY = 0.6, HOLD = 1.2, TRAIL = 3.5, LAB = new Set(['S2', 'S1', 'S29', 'S38', 'S55', 'S14']);
  const deg = Math.PI / 180;
  SSTARS.forEach(s => {
    const w = s.w * deg, O = s.Om * deg, ci = Math.cos(s.i * deg), cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O);
    s.A = cw * cO - sw * sO * ci; s.B = cw * sO + sw * cO * ci; s.F = -sw * cO - cw * sO * ci; s.G = -sw * sO + cw * cO * ci;
    s.q = Math.sqrt(1 - s.e * s.e);
    s.orb = Array.from({ length: 361 }, (_, k) => sky(s, k * Math.PI / 180));
  });
  function kepler(M, e) { let E = e < 0.8 ? M : Math.PI; for (let k = 0; k < 50; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-12) break; } return E; }
  function anomaly(s, t) { const M = 2 * Math.PI * (t - s.tP) / s.P; return kepler(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), s.e); }
  function sky(s, E) { const X = Math.cos(E) - s.e, Y = s.q * Math.sin(E); return [s.a * (s.B * X + s.G * Y), s.a * (s.A * X + s.F * Y)]; }   // [Δα leste, Δδ norte] em ″
  // estrelas de fundo, sempre as mesmas (gerador congruencial com semente)
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const BG = Array.from({ length: 170 }, () => ({ u: rnd(), v: rnd(), m: rnd() ** 3, t: rnd() }));
  const sprB = sprite('190,215,255'), sprS2 = sprite('210,200,255');
  let s = 0, year = 2018.38;
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const cx = w / 2, cy = h / 2, SP = (Math.min(w, h) / 2 - 10) / 0.6, P = ([ra, de]) => [cx - ra * SP, cy - de * SP];
    BG.forEach(b => { const col = b.t < 0.3 ? '255,230,200' : b.t < 0.6 ? '200,215,255' : '235,238,245'; c.fillStyle = `rgba(${col},${(0.12 + 0.4 * b.m).toFixed(3)})`; c.beginPath(); c.arc(b.u * w, b.v * h, 0.6 + 1.3 * b.m, 0, 7); c.fill(); });
    // órbitas completas
    c.lineWidth = 1;
    SSTARS.forEach(st => { c.strokeStyle = st.name === 'S2' ? 'rgba(158,140,255,.38)' : 'rgba(170,190,230,.13)'; c.beginPath(); st.orb.forEach((q, k) => { const [x, y] = P(q); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); });
    // rastros (só depois de 1992: o começo das observações)
    c.lineCap = 'round';
    SSTARS.forEach(st => {
      const n = 44, t0 = Math.max(Y0, year - TRAIL); if (year <= t0) return;
      let prev = P(sky(st, anomaly(st, t0)));
      for (let k = 1; k <= n; k++) {
        const t = t0 + (year - t0) * k / n, cur = P(sky(st, anomaly(st, t))), f = k / n;
        c.strokeStyle = st.name === 'S2' ? `rgba(200,190,255,${(0.75 * f * f).toFixed(3)})` : `rgba(190,215,255,${(0.55 * f * f).toFixed(3)})`;
        c.lineWidth = st.name === 'S2' ? 2.4 : 1.6; c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(cur[0], cur[1]); c.stroke(); prev = cur;
      }
    });
    // as estrelas
    SSTARS.forEach(st => {
      const [x, y] = P(sky(st, anomaly(st, year))), big = st.name === 'S2';
      blob(c, big ? sprS2 : sprB, x, y, big ? 30 : 20);
      if (LAB.has(st.name)) rich(c, st.name, x + 9, y - 11, { size: big ? 17 : 15, color: big ? COL.text : COL.text2, weight: big ? 600 : '' });
    });
    // Sgr A*
    c.save(); c.strokeStyle = '#ffffff'; c.lineWidth = 1.8; c.shadowColor = COL.bn; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(cx - 9, cy); c.lineTo(cx + 9, cy); c.moveTo(cx, cy - 9); c.lineTo(cx, cy + 9); c.stroke(); c.restore();
    rich(c, 'Sgr A*', cx - 12, cy + 16, { size: 15, color: COL.bn, align: 'right' });
    // ano, escala, bússola, crédito
    rich(c, fx(year, 1), 12, 26, { size: 34, color: COL.text, weight: 600 });
    const bl = 0.1 * SP, bx = 14, by = h - 30;
    c.strokeStyle = COL.text2; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by - 5); c.lineTo(bx, by + 5); c.moveTo(bx, by); c.lineTo(bx + bl, by); c.moveTo(bx + bl, by - 5); c.lineTo(bx + bl, by + 5); c.stroke();
    rich(c, T('0,1″ ≈ 830 UA', '0.1″ ≈ 830 AU'), bx + bl + 10, by - 8, { size: 15, color: COL.text2 });
    rich(c, T('R_{0} = 8,28 kpc', 'R_{0} = 8.28 kpc'), bx + bl + 10, by + 11, { size: 14, color: COL.text3 });
    const ox = w - 28, oy = 64;
    c.strokeStyle = COL.text2; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox, oy - 36); c.moveTo(ox, oy); c.lineTo(ox - 36, oy); c.stroke();
    c.fillStyle = COL.text2; c.beginPath(); c.moveTo(ox, oy - 42); c.lineTo(ox - 4, oy - 33); c.lineTo(ox + 4, oy - 33); c.fill();
    c.beginPath(); c.moveTo(ox - 42, oy); c.lineTo(ox - 33, oy - 4); c.lineTo(ox - 33, oy + 4); c.fill();
    rich(c, 'N', ox, oy - 52, { size: 15, color: COL.text2, align: 'center' });
    rich(c, T('L', 'E'), ox - 50, oy, { size: 15, color: COL.text2, align: 'right' });
    rich(c, 'Gillessen et al. 2017; GRAVITY 2022', w - 8, h - 10, { size: 13, color: COL.text3, align: 'right' });
    const s2 = SSTARS[1], E2 = anomaly(s2, year), aAU = s2.a * R0PC, rAU = aAU * (1 - s2.e * Math.cos(E2)), v = VK * Math.sqrt(MBH * (2 / rAU - 1 / aAU));
    setHTML(out, `<span>${T('ano', 'year')} <b>${fx(year, 1)}</b></span>
      <span>S2 ${T('a', 'from')} Sgr A* <b>${grp(rAU)} ${T('UA', 'AU')}</b></span>
      <span>${T('velocidade de S2', 'S2 speed')} <b>${grp(v)} km/s</b></span>
      <span>${T('massa central', 'central mass')} <b>${fx(4.3, 1)}×10⁶ M☉</b></span>`);
  }
  animate(cv, {
    step: dt => { s += dt; if (s > (Y1 - Y0) * SPY + HOLD) s = 0; year = Y0 + Math.min(s / SPY, Y1 - Y0); },
    render,
    still: () => { year = 2018.38; },
    enter: () => { s = 0; year = Y0; },
  });
})();

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

/* ============ 8 · O buraco negro que gira: Kerr ============
   Geodésicas nulas no plano equatorial em Boyer–Lindquist, E = 1, L = b (L > 0: a favor
   da rotação, a > 0 anti-horário), integradas no tempo de Mino σ (M = 1/2, R_S = 1):
     (dr/dσ)² = R(r) = P² − Δ(L − a)²,  P = r² + a² − aL,  Δ = r² − 2Mr + a²,
     d²r/dσ² = R′(r)/2 = 2rP − (r − M)(L − a)²   (suave nos pontos de retorno),
     dφ/dσ = (L − a) + aP/Δ.
   Longe do retorno, dr/dσ é reprojetado em ±√R (o vínculo vale ~r⁴ e acumularia erro).
   Captura se R > 0 em todo r > r₊ (sem ponto de retorno); o raio para perto de
   r₊ = M + √(M² − a²). Órbitas circulares de fótons r = 2M{1 + cos[(2/3) arccos(∓a/M)]}
   e parâmetros críticos b = ∓a + 6M cos[(1/3) arccos(∓a/M)] (a favor / contra). */
(() => {
  const cv = document.getElementById('geo-k'); if (!cv) return;
  const out = document.getElementById('geo-k-out');
  const M = 0.5, R0 = 1000;
  const gA = bindRange('geo-k-a', v => fx(v, 3), () => { clearTimeout(timer); timer = setTimeout(compute, 70); });
  let K = null, timer = 0, t = 0, key = '';
  function trace(aM, yin) {
    const a = aM * M, L = -yin, rp = M + Math.sqrt(M * M - a * a);
    const Rf = r => { const P = r * r + a * a - a * L, D = r * r - 2 * M * r + a * a; return P * P - D * (L - a) ** 2; };
    const acc = r => 2 * r * (r * r + a * a - a * L) - (r - M) * (L - a) ** 2;
    const dph = r => (L - a) + a * (r * r + a * a - a * L) / (r * r - 2 * M * r + a * a);
    let cap = true;                                                         // há ponto de retorno fora do horizonte?
    for (let k = 0; k <= 3000; k++) { const r = rp * Math.pow(60 / rp, k / 3000) * (1 + 1e-9); if (Rf(r) < 0) { cap = false; break; } }
    const x0 = -Math.sqrt(R0 * R0 - L * L);
    let r = R0, pr = -Math.sqrt(Rf(R0)), ph = Math.atan2(yin, x0), turned = false;
    const pts = [[x0, yin]], f = (r, pr) => [pr, acc(r), dph(r)];
    for (let n = 0; n < 40000; n++) {
      const hh = Math.min(0.02 + 0.02 * r, 5) / (Math.hypot(pr, r * dph(r)) + 1e-9);
      const k1 = f(r, pr), k2 = f(r + hh / 2 * k1[0], pr + hh / 2 * k1[1]), k3 = f(r + hh / 2 * k2[0], pr + hh / 2 * k2[1]), k4 = f(r + hh * k3[0], pr + hh * k3[1]);
      r += hh / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); pr += hh / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); ph += hh / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      const Rr = Rf(r); if (Rr > 0 && pr * pr > 0.02 * r ** 4) pr = (pr < 0 ? -1 : 1) * Math.sqrt(Rr);
      if (pr > 0) turned = true;
      if (cap && r < rp + 0.02) { pts.push([r * Math.cos(ph), r * Math.sin(ph)]); break; }
      pts.push([r * Math.cos(ph), r * Math.sin(ph)]);
      if (turned && r > 40) break;
    }
    return { pts, cap, yin };
  }
  function compute(redraw = true) {
    const aM = gA(), a = aM * M;
    const rph = sgn => 2 * M * (1 + Math.cos(2 / 3 * Math.acos(sgn * aM)));
    const bP = -a + 6 * M * Math.cos(Math.acos(-aM) / 3), bR = a + 6 * M * Math.cos(Math.acos(aM) / 3);
    const rays = []; for (let y = 0.2; y < 5.5; y += 0.4) { rays.push(trace(aM, y)); rays.push(trace(aM, -y)); }
    const crit = [trace(aM, -(bP + 1e-4)), trace(aM, bR + 1e-4)];             // quase críticos: embaixo a favor, em cima contra
    K = { aM, a, rp: M + Math.sqrt(M * M - a * a), rP: rph(-1), rR: rph(1), bP, bR, rays, crit };
    key = ''; if (redraw) A.redraw();
  }
  const sprE = sprite('190,175,255'), sprC = sprite('255,150,165');
  function render() {
    if (!K) compute(false);
    const { ctx: c, w, h } = fitCanvas(cv);
    const S = Math.min((h - 18) / 11.4, (w - 20) / 22), cx = w * 0.45, cy = h / 2, X = x => cx + x * S, Y = y => cy - y * S;
    const XL = -(cx - 4) / S, BX = (w - cx) / S + 1, BY = cy / S + 1;
    if (key !== `${w}x${h}`) { key = `${w}x${h}`; [...K.rays, ...K.crit].forEach(r => { r.beam = beamCut(r.pts, XL, BX, BY); }); }
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let r = 2; r <= 10; r += 2) { c.beginPath(); c.arc(cx, cy, r * S, 0, 7); c.stroke(); }
    c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,122,138,.38)';
    [-K.bP, K.bR].forEach(y => { c.beginPath(); c.moveTo(X(XL), Y(y)); c.lineTo(X(-3.6), Y(y)); c.stroke(); }); c.restore();
    c.lineWidth = 1.3;
    K.rays.forEach(r => { if (!r.beam) return; c.strokeStyle = r.cap ? 'rgba(255,122,138,.26)' : 'rgba(158,140,255,.3)'; beamPath(c, r.beam, X, Y); c.stroke(); });
    K.crit.forEach((r, i) => { if (r.beam) glowStroke(c, () => beamPath(c, r.beam, X, Y), i ? 'rgba(255,184,107,.9)' : 'rgba(86,225,208,.9)', 2.2); });
    // ergosfera (equador: r = 2M = R_S), órbitas de fótons, horizonte
    c.fillStyle = 'rgba(158,140,255,.10)'; c.beginPath(); c.arc(cx, cy, S, 0, 7); c.fill();
    c.save(); c.setLineDash([5, 5]); c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(158,140,255,.8)'; c.beginPath(); c.arc(cx, cy, S, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(86,225,208,.85)'; c.beginPath(); c.arc(cx, cy, K.rP * S, 0, 7); c.stroke();
    c.strokeStyle = 'rgba(255,184,107,.85)'; c.beginPath(); c.arc(cx, cy, K.rR * S, 0, 7); c.stroke();
    c.restore();
    c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, K.rp * S, 0, 7); c.fill(); c.strokeStyle = COL.bn; c.lineWidth = 1.5; c.stroke();
    // seta da rotação (anti-horária), maior quanto maior a/M
    if (K.aM > 0.02) {
      const ra = 2.45, th0 = -2.6, th1 = th0 + 0.4 + 1.6 * K.aM, n = 40;
      c.save(); c.strokeStyle = 'rgba(238,240,246,.75)'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i <= n; i++) { const th = th0 + (th1 - th0) * i / n; i ? c.lineTo(X(ra * Math.cos(th)), Y(ra * Math.sin(th))) : c.moveTo(X(ra * Math.cos(th)), Y(ra * Math.sin(th))); }
      c.stroke();
      const hx = X(ra * Math.cos(th1)), hy = Y(ra * Math.sin(th1)), tx = -Math.sin(th1), ty = -Math.cos(th1);   // tangente na tela
      c.fillStyle = 'rgba(238,240,246,.85)'; c.beginPath(); c.moveTo(hx + tx * 11, hy + ty * 11); c.lineTo(hx - ty * 6, hy + tx * 6); c.lineTo(hx + ty * 6, hy - tx * 6); c.fill();
      c.restore();
      rich(c, T('rotação', 'rotation'), X(ra * Math.cos(th0)) - 6, Y(ra * Math.sin(th0)) + 12, { size: 15, color: COL.text2, align: 'right' });
    }
    // fótons
    [...K.rays, ...K.crit].forEach(r => { if (r.beam) beamPhotons(c, r.beam, X, Y, t, r.cap ? sprC : sprE, 8, r.cap); });
    rich(c, T('a favor da rotação ↓', 'with the rotation ↓'), 8, h - 12, { size: 15, color: COL.psr });
    rich(c, T('contra a rotação ↑', 'against the rotation ↑'), 8, 14, { size: 15, color: COL.sol });
    // legenda
    const lx = w - 300, ly = 16;
    c.fillStyle = 'rgba(15,18,28,.85)'; c.fillRect(lx - 10, ly - 12, 300, 98);
    [['rgba(86,225,208,.95)', T('órbita de fótons a favor, ', 'prograde photon orbit, ') + fx(K.rP, 2) + ' R_{S}'],
     ['rgba(255,184,107,.95)', T('órbita de fótons contra, ', 'retrograde photon orbit, ') + fx(K.rR, 2) + ' R_{S}'],
     ['rgba(158,140,255,.9)', T('ergosfera (equador), R_{S}', 'ergosphere (equator), R_{S}')],
     ['#000', T('horizonte r_{+}, ', 'horizon r_{+}, ') + fx(K.rp, 2) + ' R_{S}']].forEach(([col, s], i) => {
      c.fillStyle = col; c.fillRect(lx, ly + i * 23 - 1.5, 22, 3); if (col === '#000') { c.strokeStyle = COL.bn; c.strokeRect(lx, ly + i * 23 - 4, 22, 8); }
      rich(c, s, lx + 30, ly + i * 23, { size: 15, color: COL.text2 });
    });
    setHTML(out, `<span>a/M <b>${fx(K.aM, 3)}</b></span>
      <span>r<sub>+</sub> <b>${fx(K.rp, 3)} R<sub>S</sub></b></span>
      <span>r<sub>ph</sub> ${T('a favor', 'prograde')} <b>${fx(K.rP, 3)}</b> · ${T('contra', 'retrograde')} <b>${fx(K.rR, 3)} R<sub>S</sub></b></span>
      <span>${T('capturado se', 'captured if')} b &lt; <b>${fx(K.bP, 2)}</b> ${T('(a favor)', '(prograde)')} · b &lt; <b>${fx(K.bR, 2)} R<sub>S</sub></b> ${T('(contra)', '(retrograde)')}</span>`);
  }
  const A = animate(cv, { step: dt => { t += dt; }, render, still: () => { t = 1.3; }, enter: () => { t = 0; } });
})();
})();
