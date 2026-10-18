/* =====================================================================
   Parte IV · estrelas de nêutrons — animações e dashboards
   Cada bloco procura o seu canvas pelo id e só roda se ele existir.
   ===================================================================== */

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

/* Dashboard: uma mancha quente numa estrela de nêutrons de 1,4 M☉ e 10 km girando, vista de longe.
   u = R_s/R = 2GM/(Rc²) = 0,4135. Desvio da luz na aproximação de Beloborodov (2002, ApJ 566, L85):
   1 − cos α = (1 − cos ψ)(1 − u), com ψ o ângulo entre a normal da superfície e a linha de visada e
   α o ângulo de emissão. Um elemento é visível se cos α > 0, isto é, ψ < ψ_máx = arccos(−u/(1−u))
   = 134,8°: vemos 1/(2(1−u)) = 85% da superfície (50% sem gravidade, onde cos α = cos ψ).
   Fluxo de cada elemento: dF ∝ cos α dS (o fator (1−u)² some na normalização F/⟨F⟩).
   Eixo de rotação ẑ; observador em l̂ = (sin j, 0, cos j); centro da mancha ĉ(t) = (sin i cos Ωt,
   sin i sin Ωt, cos i). A calota é integrada com 600 pontos de mesma área (espiral de Fibonacci).
   O globo é desenhado como o observador o vê: para cada pixel, o parâmetro de impacto b dá
   sen α = b/b_máx (b_máx = R/√(1−u) com RG, R sem), daí ψ e a normal n̂ = cos ψ l̂ + sen ψ ê. */
(() => {
  const cvG = document.getElementById('spot-globe'); if (!cvG) return;
  const cvC = document.getElementById('spot-curve'), out = document.getElementById('spot-out');
  const U = 2 * 1.4 * 1.476625 / 10;                                   // R_s/R (R_s de 1 M☉ = 2,953 km)
  const GRSC = 1 / Math.sqrt(1 - U), CPMIN = -U / (1 - U);             // raio aparente (R/√(1−u) = 1,31 R); cos ψ_máx
  const ROT = 4, NS = 600, NPH = 240, IMG = 400, EXT = 1.36, rad = Math.PI / 180;
  let dirtyImg = true, curves = null, t = 0;
  const gGR = bindSeg('spot-gr', () => { dirtyImg = true; update(); });
  const gI = bindRange('spot-i', v => v + '°', () => update());
  const gJ = bindRange('spot-j', v => v + '°', () => { dirtyImg = true; update(); });
  const gTh = bindRange('spot-th', v => v + '°', () => update());
  const isGR = () => gGR() !== '0';
  /* ---- curvas de luz (refeitas só quando um parâmetro muda) ---- */
  function lightCurves() {
    const i = gI() * rad, j = gJ() * rad, c0 = Math.cos(gTh() * rad), ga = Math.PI * (3 - Math.sqrt(5));
    const ci = Math.cos(i), si = Math.sin(i), cj = Math.cos(j), sj = Math.sin(j);
    // n̂(φ)·l̂ = A cos φ + B sen φ + C para cada ponto da calota, já girada para ĉ(0) = (sen i, 0, cos i)
    const A = new Float32Array(NS), B = new Float32Array(NS), C = new Float32Array(NS);
    for (let k = 0; k < NS; k++) {
      const ct = 1 - (1 - c0) * (k + 0.5) / NS, st = Math.sqrt(1 - ct * ct), x = st * Math.cos(k * ga), y = st * Math.sin(k * ga);
      A[k] = sj * (x * ci + ct * si); B[k] = -sj * y; C[k] = cj * (-x * si + ct * ci);
    }
    const gr = new Float32Array(NPH), fl = new Float32Array(NPH);
    for (let p = 0; p < NPH; p++) {
      const cp = Math.cos(2 * Math.PI * p / NPH), sp = Math.sin(2 * Math.PI * p / NPH); let a = 0, b = 0;
      for (let k = 0; k < NS; k++) { const cs = A[k] * cp + B[k] * sp + C[k], ca = U + (1 - U) * cs; if (ca > 0) a += ca; if (cs > 0) b += cs; }
      gr[p] = a; fl[p] = b;
    }
    const stats = f => {
      let s = 0, mx = -1, mn = Infinity, z = 0; f.forEach(v => { s += v; mx = Math.max(mx, v); mn = Math.min(mn, v); if (v <= 0) z++; });
      const m = s / f.length || 1; for (let p = 0; p < f.length; p++) f[p] /= m;
      return { f, pf: (mx - mn) / (mx + mn || 1), hid: z / f.length, mx: mx / m };
    };
    return { gr: stats(gr), fl: stats(fl) };
  }
  /* ---- o globo: normal da superfície por pixel (refeita quando j ou o modo mudam) ---- */
  const off = document.createElement('canvas'); off.width = off.height = IMG;
  const octx = off.getContext('2d'), img = octx.createImageData(IMG, IMG);
  const NX = new Float32Array(IMG * IMG), NY = new Float32Array(IMG * IMG), NZ = new Float32Array(IMG * IMG);
  const LAT = new Float32Array(IMG * IMG), CLA = new Float32Array(IMG * IMG), LON = new Float32Array(IMG * IMG), CA = new Float32Array(IMG * IMG), AL = new Float32Array(IMG * IMG);
  function precompute() {
    const j = gJ() * rad, gr = isGR(), bmax = gr ? GRSC : 1, cj = Math.cos(j), sj = Math.sin(j), pxR = IMG / (2 * EXT);
    for (let iy = 0; iy < IMG; iy++) for (let ix = 0; ix < IMG; ix++) {
      const p = iy * IMG + ix, X = ((ix + 0.5) / IMG * 2 - 1) * EXT, Y = -((iy + 0.5) / IMG * 2 - 1) * EXT, b = Math.hypot(X, Y);
      AL[p] = Math.max(0, Math.min(1, (bmax - b) * pxR + 0.5));          // borda suavizada (cobertura do pixel)
      if (!AL[p]) continue;
      const q = Math.min(b / bmax, 0.99999), ca = Math.sqrt(1 - q * q);   // sen α = q
      const cps = gr ? 1 - (1 - ca) / (1 - U) : ca, sps = Math.sqrt(Math.max(0, 1 - cps * cps));
      const ex = b > 0 ? X / b : 0, ey = b > 0 ? Y / b : 0;              // ê = ex x̂ + ey ŷ no plano do céu; x̂ = (0,1,0), ŷ = (−cos j, 0, sen j)
      const nx = cps * sj - sps * ey * cj, ny = sps * ex, nz = cps * cj + sps * ey * sj;
      NX[p] = nx; NY[p] = ny; NZ[p] = nz; LAT[p] = Math.asin(Math.max(-1, Math.min(1, nz))); CLA[p] = Math.cos(LAT[p]); LON[p] = Math.atan2(ny, nx); CA[p] = ca;
    }
    dirtyImg = false;
  }
  function paintGlobe(phi) {
    const i = gI() * rad, thc = gTh() * rad, ct = Math.cos(thc), ch = Math.cos(thc + 7 * rad);
    const sx = Math.sin(i) * Math.cos(phi), sy = Math.sin(i) * Math.sin(phi), sz = Math.cos(i);
    const d = img.data, STEP = 30 * rad, W = 0.016;
    for (let p = 0; p < IMG * IMG; p++) {
      const al = AL[p], o = 4 * p; if (!al) { d[o + 3] = 0; continue; }
      const lat = LAT[p], lon = LON[p] - phi, cl = CLA[p];
      // grade no referencial que gira: meridianos e paralelos a cada 30°
      const dl = Math.abs(lat / STEP - Math.round(lat / STEP)) * STEP, dm = Math.abs(lon / STEP - Math.round(lon / STEP)) * STEP * cl;
      const g = Math.max(0, 1 - dl / W, 1 - dm / W) * (Math.abs(lat) < 0.01 + W ? 1 : 0.75);
      const sh = 0.55 + 0.45 * CA[p];
      let r = (30 + 80 * g) * sh, gg = (38 + 94 * g) * sh, bb = (56 + 120 * g) * sh;
      const dot = NX[p] * sx + NY[p] * sy + NZ[p] * sz;
      if (dot > ch) {
        const f = 0.8 + 0.2 * CA[p];
        if (dot > ct) { const s = Math.pow((dot - ct) / (1 - ct), 0.5); r = 255 * f; gg = (165 + 85 * s) * f; bb = (80 + 150 * s) * f; }
        else { const hh = ((dot - ch) / (ct - ch)) ** 2 * 0.7; r += (255 - r) * hh; gg += (150 - gg) * hh; bb += (70 - bb) * hh; }
      }
      d[o] = r; d[o + 1] = gg; d[o + 2] = bb; d[o + 3] = 255 * al;
    }
    octx.putImageData(img, 0, 0);
  }
  // posição na imagem de uma direção n̂ da superfície (em unidades de R), ou null se invisível
  function imagePos(n, gr) {
    const j = gJ() * rad, L = [Math.sin(j), 0, Math.cos(j)], cps = n[0] * L[0] + n[2] * L[2];
    if (cps <= (gr ? CPMIN : 0)) return null;
    const ca = gr ? 1 - (1 - cps) * (1 - U) : cps, b = Math.sqrt(Math.max(0, 1 - ca * ca)) * (gr ? GRSC : 1);
    const e = [n[0] - cps * L[0], n[1], n[2] - cps * L[2]], en = Math.hypot(...e) || 1;
    return [b * e[1] / en, b * (-e[0] * Math.cos(j) + e[2] * Math.sin(j)) / en, cps];
  }
  function drawGlobe(phi) {
    if (dirtyImg) precompute();
    paintGlobe(phi);
    const { ctx: c, w, h } = fitCanvas(cvG), gr = isGR();
    const Rp = Math.min(w * 0.4, h * 0.4) / GRSC, cx = w / 2, cy = h / 2 + 4, half = EXT * Rp, Ra = (gr ? GRSC : 1) * Rp;
    // halo
    const gh = c.createRadialGradient(cx, cy, Ra * 0.95, cx, cy, Ra * 1.25);
    gh.addColorStop(0, 'rgba(124,196,255,.16)'); gh.addColorStop(1, 'rgba(124,196,255,0)');
    c.fillStyle = gh; c.beginPath(); c.arc(cx, cy, Ra * 1.25, 0, 2 * Math.PI); c.fill();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(off, cx - half, cy - half, 2 * half, 2 * half);
    // o outro caso, na mesma escala
    const Ro = (gr ? 1 : GRSC) * Rp;
    c.strokeStyle = 'rgba(255,255,255,.32)'; c.lineWidth = 1.3; c.setLineDash([5, 6]); c.beginPath(); c.arc(cx, cy, Ro, 0, 2 * Math.PI); c.stroke(); c.setLineDash([]);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'middle';
    {
      const a = 0.6, Rm = Math.max(Ro, Ra) + 12, lx = cx + Rm * Math.cos(a), ly = cy + Rm * Math.sin(a) + 4;
      c.strokeStyle = 'rgba(255,255,255,.32)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx + Ro * Math.cos(a), cy + Ro * Math.sin(a)); c.lineTo(lx - 2, ly - 2); c.stroke();
      c.fillText(gr ? T('sem gravidade: R', 'no gravity: R') : T(`com RG: ${P4.num(GRSC, 2)} R`, `with GR: ${P4.num(GRSC, 2)} R`), lx + 2, ly);
    }
    // eixo de rotação projetado (vertical): da imagem do polo norte para cima; do polo sul, se visível, para baixo
    const pn = imagePos([0, 0, 1], gr), ps = imagePos([0, 0, -1], gr), top = cy - Ra - 34, bot = cy + Ra + 26;
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(cx, pn ? cy - pn[1] * Rp : cy - Ra); c.lineTo(cx, top); c.stroke();
    c.setLineDash([4, 5]); c.beginPath(); c.moveTo(cx, ps ? cy - ps[1] * Rp : cy + Ra); c.lineTo(cx, bot); c.stroke(); c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(cx, top - 8); c.lineTo(cx - 5, top + 2); c.lineTo(cx + 5, top + 2); c.fill();
    if (pn) { c.beginPath(); c.arc(cx, cy - pn[1] * Rp, 3, 0, 2 * Math.PI); c.fill(); }
    c.fillStyle = COL.text3; c.textAlign = 'left'; c.fillText(T('eixo de rotação', 'spin axis'), cx + 10, top + 2);
    // a mancha atrás da estrela
    const i = gI() * rad, cvec = [Math.sin(i) * Math.cos(phi), Math.sin(i) * Math.sin(phi), Math.cos(i)];
    const j = gJ() * rad, cps = cvec[0] * Math.sin(j) + cvec[2] * Math.cos(j);
    // o centro da mancha no hemisfério de trás: visível (só com RG) ou escondido
    if (cps < -0.02) {
      const vis = !!imagePos(cvec, gr);
      c.font = `600 16px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = vis ? COL.sol : COL.text3;
      c.fillText(vis ? T('● atrás da estrela — e visível', '● behind the star — and visible') : T('● atrás da estrela: escondida', '● behind the star: hidden'), 4, 4);
    }
    c.font = `15px ${FONT}`; c.fillStyle = COL.text3; c.textAlign = 'left'; c.textBaseline = 'bottom';
    c.fillText(T('rotação desacelerada', 'rotation slowed down'), 4, h - 22); c.fillText(T('tamanhos na mesma escala', 'sizes to scale'), 4, h - 2);
  }
  /* ---- a curva de luz ---- */
  const PC = new Plot(cvC, { x: [0, 2], y: [0, 2], m: [46, 14, 58, 66], fs: 16, xticks: [0, 0.5, 1, 1.5, 2], xfmt: v => String(v).replace('.', DEC) });
  function drawCurve(phi) {
    const gr = isGR(), cur = gr ? curves.gr : curves.fl, oth = gr ? curves.fl : curves.gr;
    const ymax = Math.max(1.5, Math.ceil(Math.max(cur.mx, oth.mx) * 1.12 * 2) / 2);
    PC.set('y', [0, ymax]).set('yticks', Plot.ticks(0, ymax, false)).set('yfmt', v => String(v).replace('.', DEC));
    PC.begin().frame(T('fase de rotação (voltas)', 'rotation phase (cycles)'), T('fluxo / média', 'flux / mean'));
    const xs = Array.from({ length: 2 * NPH + 1 }, (_, k) => k / NPH), ys = f => xs.map((_, k) => f[k % NPH]);
    PC.clip();
    PC.line(xs, ys(oth.f), { color: 'rgba(200,206,220,.55)', width: 2, dash: [7, 6] });
    PC.area(xs, ys(cur.f), 0, { color: COL.psr, alpha: 0.08 });
    PC.line(xs, ys(cur.f), { color: COL.psr, width: 3.5, glow: 12 });
    PC.unclip();
    const x = (phi / (2 * Math.PI)) % 2, k = Math.floor(x * NPH) % NPH, fr = x * NPH - Math.floor(x * NPH), y = cur.f[k] * (1 - fr) + cur.f[(k + 1) % NPH] * fr;
    PC.vline(x, { color: 'rgba(255,255,255,.35)', dash: [3, 5], width: 1.2 });
    PC.dot(x, y, { color: '#fff', r: 6, glow: 16 });
    // legenda com as frações pulsadas
    const c = PC.ctx, L = [[gr ? T('Relatividade Geral', 'General Relativity') : T('sem gravidade', 'no gravity'), cur.pf, COL.psr, false],
      [gr ? T('sem gravidade', 'no gravity') : T('Relatividade Geral', 'General Relativity'), oth.pf, 'rgba(200,206,220,.7)', true]];
    let lx = PC.L + 4; c.save(); c.textBaseline = 'middle'; c.textAlign = 'left';
    L.forEach(([n, pf, col, dash]) => {
      c.strokeStyle = col; c.lineWidth = dash ? 2 : 3.5; c.setLineDash(dash ? [6, 5] : []); c.beginPath(); c.moveTo(lx, 20); c.lineTo(lx + 30, 20); c.stroke(); c.setLineDash([]);
      c.font = `16px ${FONT}`; c.fillStyle = COL.text2; const s1 = n + '  '; c.fillText(s1, lx + 40, 20); const w1 = c.measureText(s1).width;
      c.font = `600 16px ${FONT}`; c.fillStyle = dash ? COL.text2 : COL.psr; const s2 = 'PF = ' + P4.num(pf, 2); c.fillText(s2, lx + 40 + w1, 20);
      lx += 40 + w1 + c.measureText(s2).width + 34;
    });
    c.restore();
  }
  function update() {
    curves = lightCurves();
    const gr = isGR(), cur = gr ? curves.gr : curves.fl;
    const vis = cur.hid > 0 ? T(`some ${Math.round(100 * cur.hid)}% da volta`, `hidden ${Math.round(100 * cur.hid)}% of the turn`) : T('sempre à vista', 'always in view');
    out.innerHTML = `<span>PF (${T('RG', 'GR')}) <b>${P4.num(curves.gr.pf, 2)}</b></span>
      <span>PF (${T('sem gravidade', 'no gravity')}) <b>${P4.num(curves.fl.pf, 2)}</b></span>
      <span>${T('superfície à vista', 'surface in view')} <b>${gr ? Math.round(50 / (1 - U)) : 50}%</b></span>
      <span>${T('limbo', 'limb')} <b>ψ = ${gr ? P4.num(Math.acos(CPMIN) / rad, 1) : '90'}°</b> (α = 90°)</span>
      <span>${T('mancha', 'spot')} <b>${vis}</b></span>`;
    if (!document.body.classList.contains('overview') && !(cvG.closest('.slide').classList.contains('active') && !P4.REDUCE)) render();
  }
  function render() { const phi = 2 * Math.PI * t / ROT; drawGlobe(phi); drawCurve(phi); }
  update();
  P4.anim(cvG, (dt, still) => { if (still) t = 0.4 * ROT; else t += dt; render(); }, () => { t = 0; });
})();

/* Animação: uma balança com um martelo de matéria de estrela de nêutrons de um lado e elefantes do
   outro. Cabeça de 17,5 × 26 × 18 cm = 8 190 cm³ com ρ = 10¹⁴ g/cm³: M = 8,19×10¹⁷ g. Elefante de
   2,7 t: N = M/m = 3,03×10¹¹ (≈ 40 por pessoa, com 8,2 bilhões de pessoas). O contador sobe em escala
   logarítmica em ~6 s; o ângulo-alvo do travessão segue θ = θ_máx (M − Nm)/(M + Nm), então a
   balança fica tombada até o fim e só nivela quando N chega perto de 3×10¹¹. Desenho esquemático:
   cada silhueta representa muitos elefantes. */
(() => {
  const cv = document.getElementById('mjolnir'); if (!cv) return;
  const out = document.getElementById('mjolnir-out');
  const MH = 8.19e17, ME = 2.7e6, NF = MH / ME, TA = 6, TH = 3, TF = 0.9, CYC = TA + TH + TF, NE = 40, TMAX = 14 * Math.PI / 180;
  const ROWS = [9, 8, 7, 6, 5, 4, 1];                                   // pirâmide de 40 silhuetas
  out.innerHTML = `<span>${T('massa do martelo', 'hammer mass')} <b>8${DEC}19×10¹⁷ g</b> (${T('819 bilhões de toneladas', '819 billion tonnes')})</span>
    <span>${T('elefante', 'elephant')} <b>2${DEC}7 t</b></span>
    <span>${T('elefantes', 'elephants')} <b>≈ 3${DEC}0×10¹¹</b></span>
    <span><b>≈ 40</b> ${T('por pessoa na Terra', 'per person on Earth')}</span>`;
  let t = 0, th = TMAX, om = 0;
  const N = tt => tt <= 0 ? 1 : NF ** Math.min(1, tt / TA);              // contador: logarítmico de 1 a 3×10¹¹
  const fmtN = n => n < 1e4 ? P4.grp(Math.floor(n)) : P4.sci(n, 1);
  // um elefante estilizado, pés em (0,0), largura ~1 (unidade s px); olhando para a direita se f = 1
  function elephant(c, x, y, s, f, col) {
    c.save(); c.translate(x, y); c.scale(s * f, s); c.fillStyle = col; c.strokeStyle = 'rgba(8,10,18,.55)'; c.lineWidth = 1.6 / s;
    c.beginPath();
    c.ellipse(-0.06, -0.43, 0.36, 0.25, 0, 0, 2 * Math.PI);                                  // corpo
    c.moveTo(0.48, -0.52); c.arc(0.32, -0.52, 0.16, 0, 2 * Math.PI);                       // cabeça
    [-0.33, -0.17, 0.07, 0.2].forEach(lx => c.rect(lx, -0.3, 0.11, 0.3));                // pernas
    c.fill(); c.stroke(); c.fill();
    c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = 0.09;                            // tromba
    c.beginPath(); c.moveTo(0.44, -0.46); c.quadraticCurveTo(0.56, -0.3, 0.5, -0.1); c.stroke();
    c.lineWidth = 0.035; c.beginPath(); c.moveTo(-0.41, -0.5); c.quadraticCurveTo(-0.5, -0.4, -0.47, -0.3); c.stroke();   // rabo
    c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(0.24, -0.5, 0.09, 0.14, 0.2, 0, 2 * Math.PI); c.fill();   // orelha
    c.fillStyle = 'rgba(245,240,225,.8)'; c.beginPath(); c.moveTo(0.42, -0.42); c.quadraticCurveTo(0.52, -0.36, 0.58, -0.4); c.lineTo(0.42, -0.38); c.fill();   // presa
    c.restore();
  }
  // o martelo genérico: cabeça retangular e cabo; a cabeça brilha (matéria de estrela de nêutrons)
  function hammer(c, x, y, s) {
    const hw = 1.1 * s, hh = 0.62 * s, cw = 0.13 * s, ch = 1.05 * s;
    c.save();
    const gc = c.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0); gc.addColorStop(0, '#5a4636'); gc.addColorStop(.5, '#8a6a4e'); gc.addColorStop(1, '#4a382b');
    c.fillStyle = gc; c.beginPath(); c.roundRect(x - cw / 2, y - hh - ch, cw, ch + 4, 4); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.2;
    for (let k = 1; k < 7; k++) { const yy = y - hh - ch * (0.12 + 0.07 * k); c.beginPath(); c.moveTo(x - cw / 2, yy); c.lineTo(x + cw / 2, yy - 4); c.stroke(); }
    c.fillStyle = '#9aa3b5'; c.beginPath(); c.roundRect(x - cw * 0.7, y - hh - ch - 8, cw * 1.4, 10, 3); c.fill();
    c.shadowColor = COL.psr; c.shadowBlur = 26;
    const gh = c.createLinearGradient(x, y - hh, x, y); gh.addColorStop(0, '#c9d6e6'); gh.addColorStop(.45, '#7e8ca3'); gh.addColorStop(1, '#3d4658');
    c.fillStyle = gh; c.beginPath(); c.roundRect(x - hw / 2, y - hh, hw, hh, 6); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(86,225,208,.75)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x - hw / 2 + 6, y - hh + 5, hw - 12, 3);
    c.restore();
  }
  function render() {
    const { ctx: c, w, h } = fitCanvas(cv);
    const cx = w / 2, py = h * 0.26, Wp = Math.min(w * 0.38, 290), Lb = w / 2 - Wp / 2 - 16, Ls = h * 0.36, yb = h - 36;
    const ct = Math.cos(th), st = Math.sin(th);
    const ends = [[cx - Lb * ct, py + Lb * st], [cx + Lb * ct, py - Lb * st]];
    // coluna e base
    c.fillStyle = 'rgba(200,208,224,.18)'; c.beginPath(); c.moveTo(cx - 70, yb + 18); c.lineTo(cx + 70, yb + 18); c.lineTo(cx + 44, yb); c.lineTo(cx - 44, yb); c.fill();
    const gp = c.createLinearGradient(cx - 7, 0, cx + 7, 0); gp.addColorStop(0, '#6c7488'); gp.addColorStop(.5, '#c7cedc'); gp.addColorStop(1, '#5b6276');
    c.fillStyle = gp; c.fillRect(cx - 6, py, 12, yb - py);
    // ponteiro e escala (o ponteiro gira com o travessão)
    const lev = Math.abs(th) < 0.008, Ln = 0.62 * (yb - py), sy = py + Ln;
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, py, Ln, Math.PI / 2 - 0.3, Math.PI / 2 + 0.3); c.stroke();
    for (let k = -5; k <= 5; k++) { const a = Math.PI / 2 + k * 0.05; c.beginPath(); c.moveTo(cx + (Ln - 5) * Math.cos(a), py + (Ln - 5) * Math.sin(a)); c.lineTo(cx + (Ln + (k ? 6 : 12)) * Math.cos(a), py + (Ln + (k ? 6 : 12)) * Math.sin(a)); c.stroke(); }
    c.save(); c.strokeStyle = lev ? COL.psr : COL.sol; c.lineWidth = 2.5; if (lev) { c.shadowColor = COL.psr; c.shadowBlur = 14; }
    c.beginPath(); c.moveTo(cx, py); c.lineTo(cx - (Ln - 2) * Math.sin(th), py + (Ln - 2) * Math.cos(th)); c.stroke(); c.restore();
    // pratos (sempre na horizontal, pendurados)
    ends.forEach(([ex, ey], side) => {
      const yp = ey + Ls;
      c.strokeStyle = 'rgba(220,226,240,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(ex - Wp / 2 + 8, yp); c.lineTo(ex, ey); c.lineTo(ex + Wp / 2 - 8, yp); c.stroke();
      const g = c.createLinearGradient(0, yp, 0, yp + 16); g.addColorStop(0, '#d8dde8'); g.addColorStop(1, '#5d6476');
      c.fillStyle = g; c.beginPath(); c.moveTo(ex - Wp / 2, yp); c.lineTo(ex + Wp / 2, yp); c.quadraticCurveTo(ex + Wp / 2 - 14, yp + 18, ex, yp + 18); c.quadraticCurveTo(ex - Wp / 2 + 14, yp + 18, ex - Wp / 2, yp); c.fill();
      if (side === 0) hammer(c, ex, yp - 1, Math.min(Wp * 0.42, 110));
      else {
        // pilha de elefantes: cada um cai no lugar quando o contador passa pela sua vez
        const S = Wp / 9.3, nShow = t < TA ? NE * t / TA : NE, fade = t > TA + TH ? Math.max(0, 1 - (t - TA - TH) / (TF * 0.7)) : 1;
        let k = 0;
        ROWS.forEach((n, r) => {
          for (let q = 0; q < n; q++, k++) {
            const age = (nShow - k) * TA / NE; if (age < 0) continue;
            const drop = Math.max(0, 1 - age / 0.22), x = ex + (q - (n - 1) / 2) * S, y = yp - 1 - r * S * 0.7 - 60 * drop * drop;
            c.globalAlpha = fade * Math.min(1, age / 0.12);
            elephant(c, x, y, S * 0.98, (r + q) % 2 ? 1 : -1, ['#a9b0c0', '#8e95a8', '#bcc2cf'][(k * 7) % 3]);
          }
        });
        c.globalAlpha = 1;
      }
    });
    // o travessão
    c.save(); c.lineCap = 'round'; c.strokeStyle = '#cfd5e2'; c.lineWidth = 7; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6;
    c.beginPath(); c.moveTo(...ends[0]); c.lineTo(...ends[1]); c.stroke(); c.restore();
    c.fillStyle = '#e8ecf4'; c.beginPath(); c.arc(cx, py, 9, 0, 2 * Math.PI); c.fill();
    ends.forEach(([ex, ey]) => { c.fillStyle = '#e8ecf4'; c.beginPath(); c.arc(ex, ey, 4.5, 0, 2 * Math.PI); c.fill(); });
    // contadores
    const n = t < TA ? N(t) : NF;
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left'; c.fillStyle = COL.text3; c.font = `16px ${FONT}`; c.fillText(T('martelo', 'hammer'), 6, 22);
    c.fillStyle = COL.text; c.font = `40px ${SERIF}`; c.fillText(`8${DEC}19×10¹⁷ g`, 6, 64);
    c.textAlign = 'right'; c.fillStyle = COL.text3; c.font = `16px ${FONT}`; c.fillText(T('elefantes (2,7 t cada)', 'elephants (2.7 t each)'), w - 6, 22);
    c.fillStyle = lev ? COL.psr : COL.text; c.font = `40px ${SERIF}`; c.fillText(fmtN(n), w - 6, 64);
    if (lev && t >= TA) { c.textAlign = 'left'; c.fillStyle = COL.psr; c.font = `600 18px ${FONT}`; c.fillText(T('equilíbrio', 'balance'), cx + Ln * Math.sin(0.3) + 14, sy + 6); }
    c.textAlign = 'left'; c.fillStyle = COL.text3; c.font = `15px ${FONT}`; c.textBaseline = 'bottom';
    c.fillText(T('esquemático: cada silhueta vale muitos elefantes', 'schematic: each silhouette stands for many elephants'), 6, h - 2);
  }
  function step(dt) {
    t += dt; if (t > CYC) t -= CYC;
    const m = t < TA ? N(t) * ME : t < TA + TH + TF * 0.4 ? MH : ME;      // na volta, os elefantes somem e o martelo tomba
    const target = TMAX * (MH - m) / (MH + m);
    // travessão: oscilador amortecido indo para o ângulo-alvo (passos ≤ 5 ms)
    for (let s = Math.ceil(dt / 0.005), hs = dt / Math.max(s, 1); s > 0; s--) { om += (-38 * (th - target) - 7 * om) * hs; th += om * hs; }
  }
  P4.anim(cv, (dt, still) => {
    if (still) { t = TA + 1.2; th = 0; om = 0; } else step(dt);
    render();
  }, () => { t = 0; th = TMAX; om = 0; });
})();
