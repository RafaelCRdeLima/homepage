/* =====================================================================
   Gráficos de dados e dashboards
   Cada bloco procura o seu canvas pelo id e só roda se ele existir.
   ===================================================================== */

/* ----------------------- parâmetros de oscilação -----------------------
   Valores arredondados do ajuste global NuFIT 6.0 (2024).                */
const OSC = { s12: 0.308, s13: 0.02215, s23: 0.50, dm21: 7.49e-5, dm3l: 2.51e-3 };
const deg = Math.PI / 180;

function pmnsAbs2(s12, s13, s23, delta) {
  const c12 = Math.sqrt(1 - s12), c13 = Math.sqrt(1 - s13), c23 = Math.sqrt(1 - s23);
  const S12 = Math.sqrt(s12), S13 = Math.sqrt(s13), S23 = Math.sqrt(s23);
  const cd = Math.cos(delta), sd = Math.sin(delta);
  const abs2 = (re, im) => re * re + im * im;
  // U = R23 · U13(δ) · R12, convenção PDG
  return [
    [c12 * c12 * c13 * c13, s12 * c13 * c13, s13],
    [abs2(-S12 * c23 - c12 * S23 * S13 * cd, -c12 * S23 * S13 * sd), abs2(c12 * c23 - S12 * S23 * S13 * cd, -S12 * S23 * S13 * sd), s23 * c13 * c13],
    [abs2(S12 * S23 - c12 * c23 * S13 * cd, -c12 * c23 * S13 * sd), abs2(-c12 * S23 - S12 * c23 * S13 * cd, -S12 * c23 * S13 * sd), c23 * c23 * c13 * c13],
  ];
}

/* ============================ PARTE I ============================ */

/* Espectro beta: contínuo (forma permitida, ilustrativa) versus a linha
   que se esperaria num decaimento de dois corpos. */
(() => {
  const cv = document.getElementById('beta-spectrum'); if (!cv) return;
  const Q = 1.16, me = 0.511;
  const Te = linspace(0.0005, Q - 0.0005, 400);
  const N = Te.map(t => { const W = t + me, p = Math.sqrt(W * W - me * me); return p * W * (Q - t) ** 2; });
  const mx = Math.max(...N), Nn = N.map(v => v / mx);
  const P = new Plot(cv, { x: [0, 1.3], y: [0, 1.15], m: [30, 30, 80, 90], fs: 19, yticks: [0, 0.5, 1] });
  onSlide(cv, () => {
    P.begin().frame(T('energia cinética do elétron (MeV)', 'electron kinetic energy (MeV)'), T('número de elétrons', 'number of electrons'));
    P.area(Te, Nn, 0, { color: COL.e, alpha: .18 }).line(Te, Nn, { color: COL.e, width: 3.5, glow: 12 });
    P.ctx.save(); P.ctx.strokeStyle = COL.tau; P.ctx.lineWidth = 5; P.ctx.shadowColor = COL.tau; P.ctx.shadowBlur = 16;
    P.ctx.beginPath(); P.ctx.moveTo(P.X(Q), P.Y(0)); P.ctx.lineTo(P.X(Q), P.Y(1.02)); P.ctx.stroke(); P.ctx.restore();
    P.text(Q - 0.03, 1.08, T('esperado: tudo em E = Q', 'expected: everything at E = Q'), { color: COL.tau, align: 'right', size: 21 });
    P.text(0.34, 0.55, T('observado: contínuo', 'observed: continuous'), { color: COL.e, size: 21 });
    P.text(Q, -0.02, 'Q', { color: COL.tau, align: 'center', base: 'top', size: 20 });
  });
})();

/* Espectro dos neutrinos solares: fluxos do MSS B16-GS98; formas beta
   permitidas simplificadas (ilustrativas, não o cálculo de Bahcall). */
(() => {
  const cv = document.getElementById('solar-spectrum'); if (!cv) return;
  const me = 0.511;
  const cont = [
    { n: 'pp', Q: 0.420, F: 5.98e10, c: COL.e },
    { n: '¹³N', Q: 1.199, F: 2.78e8, c: '#7f8aa8' },
    { n: '¹⁵O', Q: 1.732, F: 2.05e8, c: '#9aa3bd' },
    { n: '⁸B', Q: 15.0, F: 5.46e6, c: COL.mu },
    { n: 'hep', Q: 18.77, F: 7.98e3, c: COL.tau },
  ];
  const lines = [
    { n: '⁷Be', E: 0.862, F: 0.897 * 4.93e9 }, { n: '⁷Be', E: 0.384, F: 0.103 * 4.93e9 }, { n: 'pep', E: 1.442, F: 1.44e8 },
  ];
  const shape = (E, Q) => { if (E >= Q) return 0; const W = Q - E + me; return E * E * W * Math.sqrt(W * W - me * me); };
  cont.forEach(s => {
    const xs = linspace(1e-4, s.Q, 2000); let I = 0;
    for (let i = 1; i < xs.length; i++) I += 0.5 * (shape(xs[i], s.Q) + shape(xs[i - 1], s.Q)) * (xs[i] - xs[i - 1]);
    s.norm = s.F / I;
  });
  const P = new Plot(cv, { x: [0.1, 20], y: [1e1, 1e12], xlog: true, ylog: true, m: [30, 30, 82, 104], fs: 18,
    yticks: [1e2, 1e4, 1e6, 1e8, 1e10, 1e12], xticks: [0.1, 0.2, 0.5, 1, 2, 5, 10, 20], xfmt: v => String(v).replace('.', DEC) });
  onSlide(cv, () => {
    P.begin();
    const thr = [{ n: T('Gálio', 'Gallium'), E: 0.233, c: COL.e }, { n: T('Cloro', 'Chlorine'), E: 0.814, c: COL.tau }, { n: 'Super-K / SNO', E: 3.5, c: COL.mu }];
    thr.forEach(t => { P.ctx.save(); P.ctx.fillStyle = t.c; P.ctx.globalAlpha = .06; P.ctx.fillRect(P.X(t.E), P.T, P.R - P.X(t.E), P.B - P.T); P.ctx.restore(); });
    P.frame(T('energia do neutrino (MeV)', 'neutrino energy (MeV)'), T('fluxo (cm⁻² s⁻¹ MeV⁻¹ · linhas: cm⁻² s⁻¹)', 'flux (cm⁻² s⁻¹ MeV⁻¹ · lines: cm⁻² s⁻¹)'));
    P.clip();
    thr.forEach((t, i) => P.vline(t.E, { color: t.c, label: t.n, y: P.T + 8 + 26 * i }));
    cont.forEach(s => {
      const xs = logspace(0.1, s.Q * 0.9995, 500);
      P.line(xs, xs.map(E => s.norm * shape(E, s.Q)), { color: s.c, width: 3, glow: 8 });
    });
    lines.forEach(l => { P.line([l.E, l.E], [10, l.F], { color: '#ffffff', width: 2.5, alpha: .8 }); });
    P.unclip();
    const lab = [['pp', 0.2, 2.2e11, COL.e], ['⁷Be', 0.9, 7e9, COL.text], ['pep', 1.52, 2.4e8, COL.text], ['¹³N · ¹⁵O', 0.62, 1.2e8, '#9aa3bd'], ['⁸B', 7, 2.5e6, COL.mu], ['hep', 11, 3.5e3, COL.tau]];
    lab.forEach(([s, x, y, c]) => P.text(x, y, s, { color: c, size: 23, font: SERIF, align: 'left' }));
  });
})();

/* Déficit: razão medida/prevista (MSS BP04), valores aproximados. */
(() => {
  const cv = document.getElementById('solar-deficit'); if (!cv) return;
  const D = [
    { n: 'Homestake', s: 'Cl · 1970–94', r: 2.56 / 8.5, e: 0.07, c: COL.tau },
    { n: 'SAGE + GALLEX/GNO', s: 'Ga · 1990–2007', r: 68 / 131, e: 0.05, c: COL.e },
    { n: 'Super-K', s: T('⁸B, espalhamento', '⁸B, scattering'), r: 2.35 / 5.79, e: 0.05, c: COL.mu },
    { n: 'SNO · CC', s: T('só νₑ', 'νₑ only'), r: 1.76 / 5.79, e: 0.04, c: COL.mu },
    { n: 'SNO · NC', s: T('todos os sabores', 'all flavours'), r: 5.09 / 5.79, e: 0.11, c: '#ffffff' },
  ];
  onSlide(cv, () => {
    const { ctx, w, h } = fitCanvas(cv);
    const L = 330, R = w - 70, top = 20, rowH = (h - 70) / D.length;
    const X = v => L + v / 1.2 * (R - L);
    ctx.font = `17px ${FONT}`; ctx.fillStyle = COL.text3; ctx.textAlign = 'center';
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(v), top); ctx.lineTo(X(v), h - 44); ctx.stroke(); ctx.fillText(String(v).replace('.', DEC), X(v), h - 22); });
    ctx.save(); ctx.strokeStyle = COL.text2; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(1), top - 6); ctx.lineTo(X(1), h - 44); ctx.stroke(); ctx.restore();
    ctx.fillStyle = COL.text2; ctx.textAlign = 'left'; ctx.fillText(T('previsto pelo Modelo Solar Padrão', 'Standard Solar Model prediction'), X(1) + 10, top + 4);
    D.forEach((d, i) => {
      const y = top + i * rowH + rowH * 0.5;
      ctx.textAlign = 'right'; ctx.fillStyle = COL.text; ctx.font = `24px ${FONT}`; ctx.fillText(d.n, L - 24, y - 6);
      ctx.fillStyle = COL.text3; ctx.font = `17px ${FONT}`; ctx.fillText(d.s, L - 24, y + 20);
      const g = ctx.createLinearGradient(L, 0, X(d.r), 0); g.addColorStop(0, 'rgba(255,255,255,.04)'); g.addColorStop(1, d.c);
      ctx.fillStyle = g; ctx.globalAlpha = .9; ctx.beginPath(); ctx.roundRect(L, y - 20, X(d.r) - L, 40, 8); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = COL.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(d.r - d.e), y); ctx.lineTo(X(d.r + d.e), y);
      ctx.moveTo(X(d.r - d.e), y - 9); ctx.lineTo(X(d.r - d.e), y + 9); ctx.moveTo(X(d.r + d.e), y - 9); ctx.lineTo(X(d.r + d.e), y + 9); ctx.stroke();
      ctx.fillStyle = COL.text; ctx.textAlign = 'left'; ctx.font = `600 20px ${FONT}`; ctx.fillText(d.r.toFixed(2).replace('.', DEC), X(d.r + d.e) + 14, y + 1);
    });
  });
})();

/* SNO 2002: o plano (φ_e, φ_μτ). Faixas de 1σ de PRL 89, 011301. */
(() => {
  const cv = document.getElementById('sno-plane'); if (!cv) return;
  const P = new Plot(cv, { x: [0, 6], y: [0, 8], m: [24, 26, 80, 92], fs: 18 });
  const band = (f, lo, hi, color, alpha) => {           // região lo ≤ f(x,y) ≤ hi, desenhada por amostragem
    const c = P.ctx, n = 220; c.save(); c.fillStyle = color; c.globalAlpha = alpha;
    const dx = (P.R - P.L) / n, dy = (P.B - P.T) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = P.o.x[0] + (i + .5) / n * 6, y = P.o.y[1] - (j + .5) / n * 8, v = f(x, y);
      if (v >= lo && v <= hi) c.fillRect(P.L + i * dx, P.T + j * dy, dx + .6, dy + .6);
    }
    c.restore();
  };
  onSlide(cv, () => {
    P.begin();
    band((x, y) => x + y, 5.05 - 0.81, 5.05 + 1.01, '#ffffff', .07);
    band((x, y) => x + y, 5.09 - 0.63, 5.09 + 0.63, COL.text, .22);
    band((x, y) => x + 0.1559 * y, 2.39 - 0.27, 2.39 + 0.27, COL.tau, .35);
    band((x, y) => x, 1.76 - 0.11, 1.76 + 0.11, COL.e, .5);
    P.frame('φ(νₑ)  —  10⁶ cm⁻² s⁻¹', 'φ(ν_μ + ν_τ)  —  10⁶ cm⁻² s⁻¹');
    P.clip();
    P.line([0, 5.05], [5.05, 0], { color: COL.text2, dash: [8, 7], width: 2 });
    P.unclip();
    P.dot(1.76, 3.41, { color: COL.mu, r: 9, glow: 24 });
    P.text(1.9, 3.75, T('SNO: 1,76 e 3,41', 'SNO: 1.76 and 3.41'), { color: COL.mu, size: 21 });
    P.text(1.62, 7.5, T('CC (só νₑ)', 'CC (νₑ only)'), { color: COL.e, align: 'right', size: 20 });
    P.text(2.55, 0.35, 'ES', { color: COL.tau, size: 20 });
    P.text(4.9, 0.9, T('NC (todos)', 'NC (all)'), { color: COL.text, size: 20 });
    P.text(5.25, 2.3, T('Modelo Solar', 'Solar Model'), { color: COL.text2, size: 18 });
    P.text(0.12, 0.35, T('sem oscilação: φ(ν_μ+ν_τ) = 0', 'no oscillation: φ(ν_μ+ν_τ) = 0'), { color: COL.warn, size: 18 });
    P.ctx.save(); P.ctx.strokeStyle = COL.warn; P.ctx.lineWidth = 4; P.ctx.beginPath(); P.ctx.moveTo(P.X(0), P.Y(0)); P.ctx.lineTo(P.X(6), P.Y(0)); P.ctx.stroke(); P.ctx.restore();
  });
})();

/* Dashboard: oscilação a dois sabores ao longo da distância. */
(() => {
  const cv = document.getElementById('osc2'); if (!cv) return;
  const P = new Plot(cv, { x: [0.1, 2e8], y: [0, 1.05], xlog: true, m: [40, 30, 80, 90], fs: 18, yticks: [0, 0.25, 0.5, 0.75, 1],
    xfmt: v => v >= 1e3 ? Plot.fmt(v, true) : String(v).replace('.', DEC) });
  const gE = bindRange('osc2-E', v => { const E = 10 ** v; return E < 1000 ? E.toFixed(E < 10 ? 1 : 0) + ' MeV' : (E / 1000).toFixed(1).replace('.', DEC) + ' GeV'; }, draw);
  const gM = bindRange('osc2-dm', v => (10 ** v).toExponential(1).replace('.', DEC).replace('e-', '×10⁻') + ' eV²', draw);
  const gT = bindRange('osc2-th', v => v.toFixed(2).replace('.', DEC), draw);
  const out = document.getElementById('osc2-out');
  document.getElementById('osc2-presets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const [E, dm, th] = b.dataset.v.split(',').map(Number);
    document.getElementById('osc2-E').value = Math.log10(E); document.getElementById('osc2-dm').value = Math.log10(dm); document.getElementById('osc2-th').value = th;
    document.querySelectorAll('#osc2-presets button').forEach(x => x.classList.toggle('on', x === b));
    ['osc2-E', 'osc2-dm', 'osc2-th'].forEach(id => document.getElementById(id).dispatchEvent(new Event('input')));
  });
  const EXP = [[1.6, 'Daya Bay'], [180, 'KamLAND'], [295, 'T2K'], [1300, 'DUNE'], [12700, T('diâmetro da Terra', 'Earth diameter')], [1.5e8, T('Sol → Terra', 'Sun → Earth')]];
  function draw() {
    const E = 10 ** gE(), dm = 10 ** gM(), s2 = gT();         // E em MeV
    const f = L => s2 * Math.sin(1.267 * dm * L / (E / 1000)) ** 2;   // L em km, E em GeV
    P.begin().frame(T('distância percorrida L (km)', 'distance travelled L (km)'), 'P(ν_α → ν_β)');
    const c = P.ctx; P.clip();
    // por coluna de pixels: mínimo e máximo de P → oscilação rápida vira faixa
    c.save(); c.fillStyle = COL.e; c.globalAlpha = .35;
    const top = [], bot = [];
    for (let px = P.L; px <= P.R; px++) {
      const a = P.invX(px), b = P.invX(px + 1); let lo = 1, hi = 0;
      for (let k = 0; k <= 24; k++) { const v = f(a * (b / a) ** (k / 24)); lo = Math.min(lo, v); hi = Math.max(hi, v); }
      top.push([px, P.Y(hi)]); bot.push([px, P.Y(lo)]);
    }
    c.beginPath(); top.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); bot.reverse().forEach(([x, y]) => c.lineTo(x, y)); c.closePath(); c.fill(); c.restore();
    c.save(); c.strokeStyle = COL.e; c.lineWidth = 2.5; c.shadowColor = COL.e; c.shadowBlur = 10; c.beginPath();
    top.forEach(([x], i) => { const L = P.invX(x), y = P.Y(f(L)); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.restore();
    P.hline(s2 / 2, { color: COL.mu, label: T('média: ½ sin²2θ', 'average: ½ sin²2θ'), align: 'left' });
    EXP.forEach(([L, n], i) => P.vline(L, { color: COL.text3, label: n, y: P.T + 6 + (i % 2) * 24, dash: [3, 6] }));
    P.unclip();
    const Losc = 2.48 * (E / 1000) / dm;               // km = 2,48 E[GeV] / Δm²[eV²]
    out.innerHTML = `${T('comprimento de oscilação', 'oscillation length')} <b>${Losc < 1e4 ? Losc.toFixed(Losc < 10 ? 2 : 0).replace('.', DEC) : Losc.toExponential(1).replace('.', DEC)} km</b>`;
  }
  onSlide(cv, draw);
})();

/* Dashboard: Super-K — sobrevivência de ν_μ atmosféricos contra o ângulo zenital. */
(() => {
  const cv = document.getElementById('zenith'); if (!cv) return;
  const Rt = 6371, h = 15;
  const Lz = cz => Math.sqrt((Rt + h) ** 2 - Rt * Rt * (1 - cz * cz)) - Rt * cz;
  const P = new Plot(cv, { x: [-1, 1], y: [0, 1.1], m: [40, 30, 80, 90], fs: 18, yticks: [0, 0.25, 0.5, 0.75, 1] });
  const gM = bindRange('zen-dm', v => ((10 ** v) * 1e3).toFixed(2).replace('.', DEC) + '×10⁻³ eV²', draw);
  const gT = bindRange('zen-th', v => v.toFixed(2).replace('.', DEC), draw);
  const out = document.getElementById('zen-out');
  // espectro de eventos multi-GeV ~ E^-1.7 (fluxo E^-2.7 × seção de choque ∝ E), de 1,3 a 20 GeV
  const Es = logspace(1.33, 20, 90), wE = Es.map(E => E ** -1.7 * E), W = wE.reduce((a, b) => a + b, 0);
  function surv(cz, dm, s2, band) {
    const L = Lz(cz); let s = 0;
    band.forEach((E, i) => { s += (band === Es ? wE[i] / W : 1 / band.length) * (1 - s2 * Math.sin(1.267 * dm * L / E) ** 2); });
    return s;
  }
  function draw() {
    const dm = 10 ** gM(), s2 = gT();
    P.begin().frame(T('cos θ_zenital   (−1: atravessou a Terra · +1: veio de cima)', 'cos θ_zenith   (−1: crossed the Earth · +1: from above)'), T('ν_μ observados / esperados', 'observed / expected ν_μ'));
    const cz = linspace(-1, 1, 240);
    const sub = logspace(0.3, 1.2, 40);
    P.clip();
    P.area(cz, cz.map(c => surv(c, dm, s2, Es)), 0, { color: COL.mu, alpha: .12 });
    P.line(cz, cz.map(c => surv(c, dm, s2, sub)), { color: COL.e, width: 2.5, dash: [8, 6] });
    P.line(cz, cz.map(c => surv(c, dm, s2, Es)), { color: COL.mu, width: 4, glow: 14 });
    P.hline(1, { color: COL.text2, label: T('sem oscilação', 'no oscillation'), dash: [4, 6] });
    P.unclip();
    // assimetria cima/baixo (modelo simples, sem resolução angular)
    let U = 0, D = 0;
    cz.forEach(c => { if (c < -0.2) U += surv(c, dm, s2, Es); if (c > 0.2) D += surv(c, dm, s2, Es); });
    const A = (U - D) / (U + D);
    out.innerHTML = `${T('assimetria (U−D)/(U+D) neste modelo', 'asymmetry (U−D)/(U+D) in this model')} <b>${A.toFixed(3).replace('.', DEC)}</b> · Super-K 1998, multi-GeV <b>${T('−0,296 ± 0,048', '−0.296 ± 0.048')}</b>`;
  }
  onSlide(cv, draw);
})();

/* Espectro de massas: ordenamento normal × invertido, com o conteúdo de sabor. */
(() => {
  const cv = document.getElementById('mass-order'); if (!cv) return;
  onSlide(cv, () => {
    const { ctx, w, h } = fitCanvas(cv);
    const U = pmnsAbs2(OSC.s12, OSC.s13, OSC.s23, 1.5 * Math.PI);
    const cols = [COL.e, COL.mu, COL.tau];
    const bw = 240, gap = w / 2;
    const draw = (x0, title, levels) => {
      ctx.font = `44px ${SERIF}`; ctx.fillStyle = COL.text; ctx.textAlign = 'center'; ctx.fillText(title, x0 + bw / 2, 44);
      levels.forEach(([k, y]) => {
        let x = x0;
        for (let a = 0; a < 3; a++) { const ww = bw * U[a][k]; ctx.fillStyle = cols[a]; ctx.fillRect(x, y - 16, ww, 32); x += ww; }
        ctx.fillStyle = COL.text; ctx.font = `italic 34px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(`ν${'₁₂₃'[k]}`, x0 + bw + 22, y + 10);
      });
    };
    const top = 110, bot = h - 40;
    // escala esquemática: Δm²₂₁ é ~30× menor que |Δm²₃ₗ|, desenhado ampliado para ficar visível
    draw(gap / 2 - bw / 2 - 40, T('normal', 'normal'), [[0, bot], [1, bot - 60], [2, top]]);
    draw(gap + gap / 2 - bw / 2 - 40, T('invertido', 'inverted'), [[2, bot], [0, top + 60], [1, top]]);
    ctx.font = `18px ${FONT}`; ctx.fillStyle = COL.text3; ctx.textAlign = 'center';
    ctx.fillText(T('Δm²₂₁ ≈ 7,5×10⁻⁵ eV² (ampliado)   ·   |Δm²₃ₗ| ≈ 2,5×10⁻³ eV²', 'Δm²₂₁ ≈ 7.5×10⁻⁵ eV² (enlarged)   ·   |Δm²₃ₗ| ≈ 2.5×10⁻³ eV²'), w / 2, h - 2);
    ctx.strokeStyle = COL.text3; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(w / 2, 70); ctx.lineTo(w / 2, bot); ctx.stroke(); ctx.setLineDash([]);
  });
})();

/* ============================ PARTE II ============================ */

/* Dashboard: compacidade. */
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
  let sel = 4;
  const seg = document.getElementById('compact-sel');
  seg.innerHTML = OBJ.map((o, i) => `<button data-v="${i}" class="${i === sel ? 'on' : ''}">${o.s}</button>`).join('');
  bindSeg('compact-sel', () => { sel = +seg.querySelector('.on').dataset.v; draw(); });
  const out = document.getElementById('compact-out');
  const P = new Plot(cv, { x: [1e-10, 1.5], y: [0, 1], xlog: true, m: [26, 30, 60, 30], fs: 17, yticks: [], xticks: [1e-10, 1e-8, 1e-6, 1e-4, 1e-2, 1] });
  const deflect = (x) => {                     // desvio exato de um raio rasante à superfície r = R (rs = 1)
    const R = 1 / x; if (R <= 1.5) return Infinity;
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
    [[1e-10, 1e-5, T('Newton basta', 'Newton is enough'), 'rgba(255,255,255,.03)'], [1e-5, 0.05, T('correções pós-newtonianas', 'post-Newtonian corrections'), 'rgba(255,184,107,.06)'], [0.05, 1.5, T('RG plena', 'full GR'), 'rgba(255,184,107,.16)']]
      .forEach(([a, b, t, f]) => { c.fillStyle = f; c.fillRect(P.X(a), P.T, P.X(b) - P.X(a), P.B - P.T); P.text(Math.sqrt(a * b), 0.93, t, { color: COL.text3, align: 'center', size: 17 }); });
    P.frame(null, null);
    P.text(0.5 * (P.L + P.R), P.h - 6, 'r_s / R = 2GM/(Rc²)', { px: true, align: 'center', base: 'bottom', color: COL.text2, size: 18 });
    OBJ.forEach((ob, i) => {
      const on = i === sel, y = 0.2 + (i % 4) * 0.16;
      P.ctx.save(); P.ctx.strokeStyle = on ? COL.tau : 'rgba(255,255,255,.25)'; P.ctx.lineWidth = on ? 2.5 : 1;
      P.ctx.beginPath(); P.ctx.moveTo(P.X(ob.rsR), P.Y(0)); P.ctx.lineTo(P.X(ob.rsR), P.Y(y)); P.ctx.stroke(); P.ctx.restore();
      P.dot(ob.rsR, y, { color: on ? COL.tau : COL.text3, r: on ? 8 : 5, glow: on ? 20 : 0 });
      if (on || i < 3) P.text(ob.rsR, y + 0.075, ob.n, { color: on ? COL.text : COL.text3, align: i > 4 ? 'right' : 'center', size: on ? 19 : 16 });
    });
    // poço: perfil de Flamm z = 2√(r_s(r − r_s)), em unidades de R, fora do objeto
    const { ctx, w, h } = fitCanvas(cv2);
    const L = 40, Rr = w - 20, Tp = 30, B = h - 40, xmax = 6;
    const X = r => L + (r / xmax) * (Rr - L);
    const zOf = r => 2 * Math.sqrt(x * Math.max(r - x, 0));
    const z6 = zOf(xmax), zR = zOf(1), dz = Math.max(z6 - zR, 1e-12);
    const Y = r => Tp + (z6 - zOf(r)) / Math.max(dz, 1.2) * (B - Tp) * 0.95;
    ctx.strokeStyle = 'rgba(255,184,107,.9)'; ctx.lineWidth = 3; ctx.shadowColor = COL.tau; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const r = 1 + (xmax - 1) * i / 300; i ? ctx.lineTo(X(r), Y(r)) : ctx.moveTo(X(r), Y(r)); }
    ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,184,107,.18)'; ctx.fillRect(L, Y(1), X(1) - L, B - Y(1) + 10);
    ctx.fillStyle = COL.text3; ctx.font = `16px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('R', X(1), h - 12); ctx.fillText('6R', X(6), h - 12); ctx.fillText(T('superfície de mergulho (Flamm), escala real', 'embedding surface (Flamm), true scale'), (L + Rr) / 2, 16);
    const z = 1 / Math.sqrt(1 - Math.min(x, 0.999999)) - 1, dt = (1 - Math.sqrt(1 - Math.min(x, 1))) * 86400, df = deflect(x);
    const fmt = v => v < 1e-3 ? v.toExponential(2).replace('.', DEC) : v.toPrecision(3).replace('.', DEC);
    out.innerHTML = `<span>${o.n}${o.d ? ' · ' + o.d : ''} · R = ${o.R}</span>
      <span>r_s/R <b>${fmt(x)}</b></span>
      <span>${T('desvio para o vermelho', 'redshift')} z <b>${x >= 1 ? '∞' : fmt(z)}</b></span>
      <span>${T('relógio perde', 'clock loses')} <b>${x >= 1 ? '—' : dt < 1 ? (dt * 1e6).toPrecision(3).replace('.', DEC) + ' μs' : (dt / 3600).toPrecision(3).replace('.', DEC) + ' h'}</b> ${T('por dia', 'per day')}</span>
      <span>${T('desvio da luz rasante', 'grazing light deflection')} <b>${isFinite(df) ? (df / deg < 1 ? (df / deg * 3600).toPrecision(3).replace('.', DEC) + '″' : (df / deg).toFixed(0) + '°') : T('captura', 'capture')}</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Dashboard: geodésicas nulas de Schwarzschild, u'' = −u + (3/2) r_s u². */
(() => {
  const cv = document.getElementById('geo'); if (!cv) return;
  const gB = bindRange('geo-b', v => v.toFixed(3).replace('.', DEC) + ' r_s', draw);
  const out = document.getElementById('geo-out');
  const bc = 1.5 * Math.sqrt(3);                 // 3√3 M = (3√3/2) r_s
  function trace(b) {                          // rs = 1; parte de r = 40 vindo da esquerda
    const r0 = 40; let u = 1 / r0, v = Math.sqrt(Math.max(1 / (b * b) - u * u + u ** 3, 0));
    const f = (u, v) => [v, -u + 1.5 * u * u];
    const ph0 = Math.PI - Math.asin(Math.min(1, b / r0)); let ph = 0; const pts = [[Math.cos(ph0) * r0, Math.sin(ph0) * r0]];
    let umax = u, h = 0.004, captured = false;
    for (let i = 0; i < 40000; i++) {
      const k1 = f(u, v), k2 = f(u + h / 2 * k1[0], v + h / 2 * k1[1]), k3 = f(u + h / 2 * k2[0], v + h / 2 * k2[1]), k4 = f(u + h * k3[0], v + h * k3[1]);
      u += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); v += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); ph += h;
      umax = Math.max(umax, u);
      if (u >= 1) { captured = true; break; }
      if (u <= 1 / r0 && ph > 0.5) break;
      pts.push([Math.cos(ph0 - ph) / u, Math.sin(ph0 - ph) / u]);
    }
    return { pts, captured, rmin: 1 / umax, defl: ph - Math.PI };
  }
  function draw() {
    const b = gB();
    const { ctx, w, h } = fitCanvas(cv);
    const S = Math.min(w, h) / 2 / 9, cx = w / 2 + 40, cy = h / 2;
    const X = x => cx + x * S, Y = y => cy - y * S;
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (let r = 2; r <= 14; r += 2) { ctx.beginPath(); ctx.arc(cx, cy, r * S, 0, 7); ctx.stroke(); }
    ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,184,107,.55)';
    ctx.beginPath(); ctx.arc(cx, cy, 1.5 * S, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(86,225,208,.35)'; ctx.beginPath(); ctx.arc(cx, cy, 3 * S, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createRadialGradient(cx, cy, S * 0.6, cx, cy, S * 1.6); g.addColorStop(0, '#000'); g.addColorStop(.6, '#000'); g.addColorStop(1, 'rgba(255,184,107,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 1.6 * S, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, S, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,184,107,.9)'; ctx.lineWidth = 1.5; ctx.stroke();
    // família de fundo
    for (let bb = 0.5; bb <= 8; bb += 0.5) {
      const t = trace(bb); ctx.strokeStyle = t.captured ? 'rgba(255,122,138,.18)' : 'rgba(158,140,255,.18)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); t.pts.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
    }
    const t = trace(b);
    ctx.strokeStyle = t.captured ? COL.warn : COL.mu; ctx.lineWidth = 3.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16;
    ctx.beginPath(); t.pts.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.font = `17px ${FONT}`; ctx.fillStyle = COL.tau; ctx.textAlign = 'left';
    ctx.fillText(T('esfera de fótons 1,5 r_s', 'photon sphere 1.5 r_s'), X(1.2), Y(-1.9)); ctx.fillStyle = COL.mu; ctx.fillText('ISCO 3 r_s', X(2.3), Y(-3.3));
    out.innerHTML = t.captured
      ? `<span>b < b_c = 3√3 M ≈ ${T('2,598', '2.598')} r_s → <b style="color:var(--warn)">${T('capturado', 'captured')}</b></span>`
      : `<span>${T('maior aproximação', 'closest approach')} <b>${t.rmin.toFixed(2).replace('.', DEC)} r_s</b></span><span>${T('desvio total', 'total deflection')} <b>${(t.defl / deg).toFixed(1).replace('.', DEC)}°</b></span><span>${T('voltas completas', 'full loops')} <b>${Math.floor((t.defl + Math.PI) / (2 * Math.PI))}</b></span><span>b_c <b>${T('2,598', '2.598')} r_s</b></span>`;
  }
  onSlide(cv, draw);
})();

/* ============================ PARTE III ============================ */

/* Dashboard: fase de oscilação ao longo de uma geodésica que nasce na fonte.
   Φ = (Δm²/2E∞) ∫ dr / √(1 − b²(1 − r_s/r)/r²)   (Fornengo, Giunti, Kim & Song 1997).
   Parametrizando pela órbita, |dr|/√(…) = r²/b dφ — regular no ponto de retorno. */
(() => {
  const cv = document.getElementById('emit'); if (!cv) return;
  const cv2 = document.getElementById('emit-p');
  const gR = bindRange('emit-R', v => v.toFixed(1).replace('.', DEC) + ' r_s', draw);
  const gA = bindRange('emit-a', v => v.toFixed(0) + '°', draw);
  const gL = bindRange('emit-L', v => (10 ** v).toFixed(0) + ' r_s', draw);
  const gS = bindSeg('emit-src', () => {
    const a = document.getElementById('emit-a');
    a.max = gS() === 'star' ? 90 : 180; if (+a.value > +a.max) a.value = a.max; a.dispatchEvent(new Event('input'));
  });
  const out = document.getElementById('emit-out');
  const RMAX = 40;
  function trace(R, alpha) {
    const B = 1 - 1 / R, b = R * Math.sin(alpha) / Math.sqrt(B);
    const pts = [];                                     // [x, y, r, Φ/2π·λ]  (fase em unidades de comprimento)
    if (Math.sin(alpha) < 1e-6) {                        // radial
      if (Math.cos(alpha) < 0) return { pts: [[R, 0, R, 0]], b, captured: true };
      for (let r = R; r <= RMAX; r += 0.05) pts.push([r, 0, r, r - R]);
      return { pts, b, captured: false, defl: 0 };
    }
    let u = 1 / R, v = (Math.cos(alpha) > 0 ? -1 : 1) * Math.sqrt(Math.max(1 / (b * b) - u * u * (1 - u), 0));
    let ph = 0, Phi = 0; const h = 0.002;
    const f = (u, v) => [v, -u + 1.5 * u * u];
    pts.push([R, 0, R, 0]);
    let captured = false;
    for (let i = 0; i < 200000; i++) {
      const k1 = f(u, v), k2 = f(u + h / 2 * k1[0], v + h / 2 * k1[1]), k3 = f(u + h / 2 * k2[0], v + h / 2 * k2[1]), k4 = f(u + h * k3[0], v + h * k3[1]);
      const un = u + h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      Phi += h * 0.5 * (1 / (u * u) + 1 / (un * un)) / b;   // r²/b dφ
      v += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]); u = un; ph += h;
      if (u >= 1) { captured = true; break; }
      if (1 / u > RMAX) break;
      pts.push([Math.cos(ph) / u, Math.sin(ph) / u, 1 / u, Phi]);
    }
    return { pts, b, captured, defl: ph };
  }
  function flat(R, alpha) {                               // reta euclidiana, mesmo ponto e mesma direção local
    const pts = [], cx = Math.cos(alpha), sx = Math.sin(alpha);
    for (let s = 0; s < 80; s += 0.05) {
      const x = R + s * cx, y = s * sx, r = Math.hypot(x, y);
      if (r > RMAX) break; pts.push([x, y, r, s]);
    }
    return pts;
  }
  const mix = (p) => { const a = [158, 140, 255], b = [86, 225, 208]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(',')})`; };
  const P = new Plot(cv2, { x: [0, RMAX], y: [0, 1.05], m: [30, 24, 76, 84], fs: 17, yticks: [0, 0.5, 1] });
  function draw() {
    const R = gR(), alpha = gA() * deg, lam = 10 ** gL(), star = gS() === 'star';
    const g = trace(R, alpha), fl = flat(R, alpha);
    const Pr = ph => Math.sin(Math.PI * ph / lam) ** 2;   // sin²2θ = 1
    const { ctx, w, h } = fitCanvas(cv);
    const view = Math.min(RMAX, Math.max(10, R * 2.6)), S = Math.min(w, h) / 2 / view, cx = w / 2, cy = h / 2;
    const X = x => cx + x * S, Y = y => cy - y * S;
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    for (let r = 5; r < view * 1.5; r += 5) { ctx.beginPath(); ctx.arc(cx, cy, r * S, 0, 7); ctx.stroke(); }
    if (star) {
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * S); gg.addColorStop(0, 'rgba(255,184,107,.55)'); gg.addColorStop(1, 'rgba(255,184,107,.12)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, R * S, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,184,107,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(158,140,255,.16)'; ctx.fillRect(X(-view), cy - 3, (view - 3) * S, 6); ctx.fillRect(X(3), cy - 3, (view - 3) * S, 6);
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, S, 0, 7); ctx.fill(); ctx.strokeStyle = COL.tau; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.setLineDash([5, 6]); ctx.strokeStyle = 'rgba(255,184,107,.45)'; ctx.beginPath(); ctx.arc(cx, cy, 1.5 * S, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath();
    fl.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 1; i < g.pts.length; i += 2) {
      const [x0, y0] = g.pts[i - 1], [x1, y1, , ph] = g.pts[Math.min(i + 1, g.pts.length - 1)];
      ctx.strokeStyle = mix(Pr(ph)); ctx.beginPath(); ctx.moveTo(X(x0), Y(y0)); ctx.lineTo(X(x1), Y(y1)); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(X(R), Y(0), 6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = `16px ${FONT}`; ctx.fillStyle = COL.text3; ctx.textAlign = 'left';
    ctx.fillText(T('— — reta sem gravidade', '— — straight line, no gravity'), 16, h - 16);
    // painel da direita: P(νe→νx) contra r
    P.begin().frame(T('coordenada radial r (r_s)', 'radial coordinate r (r_s)'), 'P(νₑ → ν_x)');
    P.clip();
    P.line(fl.map(p => p[2]), fl.map(p => Pr(p[3])), { color: COL.text2, width: 2, dash: [7, 6] });
    const step = Math.max(1, Math.floor(g.pts.length / 1500)), gp = g.pts.filter((_, i) => i % step === 0);
    P.line(gp.map(p => p[2]), gp.map(p => Pr(p[3])), { color: COL.mu, width: 3.5, glow: 12 });
    P.vline(R, { color: COL.tau, label: T('emissão', 'emission'), dash: [3, 5] });
    P.unclip();
    const last = g.pts[g.pts.length - 1], lf = fl[fl.length - 1];
    const Eloc = 1 / Math.sqrt(1 - 1 / R);
    out.innerHTML = `<span>E<sub>local</sub>/E<sub>∞</sub> ${T('na fonte', 'at the source')} <b>${Eloc.toFixed(3).replace('.', DEC)}</b></span>
      <span>${T('parâmetro de impacto', 'impact parameter')} <b>${g.b.toFixed(2).replace('.', DEC)} r_s</b></span>
      ${g.captured ? `<span><b style="color:var(--warn)">${T('capturado pelo buraco negro', 'captured by the black hole')}</b></span>`
        : `<span>${T('desvio até 40 r_s', 'deflection up to 40 r_s')} <b>${((g.defl - alpha) / deg).toFixed(1).replace('.', DEC)}°</b></span>
           <span>${T('fase até r = 40 r_s, RG ÷ plano', 'phase up to r = 40 r_s, GR ÷ flat')} <b>${(last[3] / lf[3]).toFixed(3).replace('.', DEC)}</b></span>`}`;
  }
  onSlide(cv, draw);
})();

/* Dashboard: lente gravitacional de neutrinos — sensibilidade à massa absoluta.
   Duas imagens (b₊, b₋) de uma lente pontual. Φ_k^p = (m_k²/2E)(r_A + r_B)(1 − b_p²/(2 r_A r_B))
   (Fornengo et al. 1997; Swami, Lochan & Dixit 2020). A fase comum ~ m²L/E é enorme e média
   a zero com qualquer resolução em energia; sobra, para cada autoestado de massa, a franja
   F_k = a₊² + a₋² + 2a₊a₋ cos(m_k² Δb² (1/r_A + 1/r_B) / 4E), que depende de m_k² e não só de Δm². */
(() => {
  const cv = document.getElementById('lens'); if (!cv) return;
  const gm = bindRange('lens-m', v => (v * 1000).toFixed(0) + ' meV', draw);
  const gb = bindRange('lens-beta', v => v.toFixed(2).replace('.', DEC), draw);
  const gM = bindRange('lens-M', v => (10 ** v).toFixed(1).replace('.', DEC) + ' M☉', draw);
  const out = document.getElementById('lens-out');
  const kpc = 3.0857e19, hbarc = 1.97327e-7, rsSun = 2953.25;
  const DS = 10 * kpc, DL = 5 * kpc, DLS = DS - DL;
  const P = new Plot(cv, { x: [5, 60], y: [0.25, 0.75], m: [30, 30, 80, 96], fs: 18, yticks: [0.3, 0.4, 0.5, 0.6, 0.7] });
  const Ue = [(1 - OSC.s12) * (1 - OSC.s13), OSC.s12 * (1 - OSC.s13), OSC.s13];
  function masses(m0, io) {
    const d21 = OSC.dm21, d3 = OSC.dm3l;
    if (!io) return [m0, Math.sqrt(m0 * m0 + d21), Math.sqrt(m0 * m0 + d3)];
    const m2 = Math.sqrt(m0 * m0 + d3); return [Math.sqrt(m2 * m2 - d21), m2, m0];
  }
  function draw() {
    const m0 = gm(), u = gb(), M = 10 ** gM();
    const thE = Math.sqrt(2 * rsSun * M * DLS / (DL * DS));
    const beta = u * thE, root = Math.sqrt(beta * beta + 4 * thE * thE);
    const thp = (beta + root) / 2, thm = (root - beta) / 2;
    const bp = DL * thp, bm = DL * thm;
    const mup = (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)) + 0.5, mum = mup - 1;
    const ap = Math.sqrt(mup), am = Math.sqrt(mum);
    const Db2 = (bp * bp - bm * bm) * (1 / DL + 1 / DLS);   // m
    const Pee = (m, EMeV) => {
      let num = 0, den = 0;
      m.forEach((mk, k) => {
        const ph = mk * mk * Db2 / (4 * EMeV * 1e6 * hbarc);
        const F = ap * ap + am * am + 2 * ap * am * Math.cos(ph);
        num += Ue[k] * Ue[k] * F; den += Ue[k] * F;
      });
      return num / den;
    };
    const Es = linspace(5, 60, 700);
    P.begin().frame(T('energia do neutrino E (MeV)', 'neutrino energy E (MeV)'), T('P(νₑ → νₑ) na Terra', 'P(νₑ → νₑ) at Earth'));
    P.clip();
    const noLens = Ue.reduce((s, x) => s + x * x, 0);
    P.hline(noLens, { color: COL.text2, label: T('sem lente (média de vácuo)', 'no lens (vacuum average)'), dash: [4, 6], align: 'right' });
    P.line(Es, Es.map(E => Pee(masses(m0, true), E)), { color: COL.tau, width: 3, glow: 10 });
    P.line(Es, Es.map(E => Pee(masses(m0, false), E)), { color: COL.e, width: 3.5, glow: 12 });
    P.unclip();
    const AU = 1.496e11;
    const ph10 = masses(m0, false).map(mk => (mk * mk * Db2 / (4 * 10e6 * hbarc)));
    out.innerHTML = `<span>${T('raio de Einstein', 'Einstein radius')} <b>${(thE * 206264.8e3).toFixed(2).replace('.', DEC)} mas</b></span>
      <span>b₊, b₋ <b>${(bp / AU).toFixed(1).replace('.', DEC)} · ${(bm / AU).toFixed(1).replace('.', DEC)} ${T('UA', 'AU')}</b></span>
      <span>${T('diferença efetiva de caminho', 'effective path difference')} <b>${(Db2 / 1000).toFixed(1).replace('.', DEC)} km</b></span>
      <span>${T('fase das franjas a 10 MeV (NO)', 'fringe phases at 10 MeV (NO)')} <b>${ph10.map(v => v.toFixed(2).replace('.', DEC)).join(' · ')} rad</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Dashboard: DUNE — P(ν_μ → ν_e) a 1300 km, com efeito de matéria
   (expansão de Cervera et al. 2000 / Freund 2001). */
(() => {
  const cv = document.getElementById('dune'); if (!cv) return;
  const gD = bindRange('dune-d', v => v.toFixed(0) + '°', draw);
  const gT = bindRange('dune-t', v => v.toFixed(2).replace('.', DEC), draw);
  const gO = bindSeg('dune-o', draw);
  const out = document.getElementById('dune-out');
  const L = 1285, rhoYe = 2.848 * 0.5;
  const P = new Plot(cv, { x: [0.5, 8], y: [0, 0.16], m: [30, 30, 80, 96], fs: 18, yticks: [0, 0.04, 0.08, 0.12, 0.16] });
  function prob(E, delta, s23, io, anti) {
    const s12 = OSC.s12, s13 = OSC.s13;
    const dm31 = (io ? -1 : 1) * OSC.dm3l, alpha = OSC.dm21 / dm31;
    const s2_12 = 2 * Math.sqrt(s12 * (1 - s12)), s2_13 = 2 * Math.sqrt(s13 * (1 - s13)), s2_23 = 2 * Math.sqrt(s23 * (1 - s23));
    let A = 1.526e-4 * rhoYe * E / dm31, d = delta;
    if (anti) { A = -A; d = -d; }
    const D = 1.267 * dm31 * L / E;
    const J = Math.sqrt(1 - s13) * s2_12 * s2_13 * s2_23;
    const t1 = s23 * s2_13 ** 2 * Math.sin((1 - A) * D) ** 2 / (1 - A) ** 2;
    const t2 = alpha * J * Math.cos(D + d) * Math.sin(A * D) / A * Math.sin((1 - A) * D) / (1 - A);
    const t3 = alpha * alpha * (1 - s23) * s2_12 ** 2 * Math.sin(A * D) ** 2 / (A * A);
    return t1 + t2 + t3;
  }
  function draw() {
    const d = gD() * deg, s23 = gT(), io = gO() === 'io';
    const Es = linspace(0.5, 8, 400);
    P.begin();
    const fl = Es.map(E => E * E * Math.exp(-E / 1.25)), fm = Math.max(...fl);
    P.area(Es, fl.map(v => 0.13 * v / fm), 0, { color: '#ffffff', alpha: .05 });
    P.frame(T('energia E (GeV)', 'energy E (GeV)'), 'P(ν_μ → ν_e)');
    P.text(4.6, 0.012, T('fluxo do feixe (ilustrativo)', 'beam flux (illustrative)'), { color: COL.text3, size: 16 });
    P.clip();
    [0, 90, 180, 270].forEach(dd => { P.line(Es, Es.map(E => prob(E, dd * deg, s23, io, false)), { color: COL.mu, width: 1.2, alpha: .22 }); });
    P.line(Es, Es.map(E => prob(E, d, s23, io, true)), { color: COL.tau, width: 3, glow: 10 });
    P.line(Es, Es.map(E => prob(E, d, s23, io, false)), { color: COL.mu, width: 4, glow: 14 });
    P.unclip();
    const pn = prob(2.5, d, s23, io, false), pa = prob(2.5, d, s23, io, true);
    out.innerHTML = `<span>${T('em 2,5 GeV', 'at 2.5 GeV')} · ν <b>${(pn * 100).toFixed(1).replace('.', DEC)}%</b></span><span>ν̄ <b>${(pa * 100).toFixed(1).replace('.', DEC)}%</b></span>
      <span>${T('assimetria', 'asymmetry')} (ν−ν̄)/(ν+ν̄) <b>${((pn - pa) / (pn + pa)).toFixed(2).replace('.', DEC)}</b></span>
      <span>r_s⊕/R⊕ <b>${T('1,4×10⁻⁹', '1.4×10⁻⁹')}</b> — ${T('o feixe viaja em espaço-tempo praticamente plano', 'the beam travels in essentially flat spacetime')}</span>`;
  }
  onSlide(cv, draw);
})();
