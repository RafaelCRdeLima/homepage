/* =====================================================================
   Parte IV · resultados — painéis interativos
   ===================================================================== */

/* A coluna de 1A 0535+262 pelo espectro (Silva, de Lima, Coelho & de Araújo, submetido ao JHEAp, 2026), no
   modelo de Becker & Wolff (2022), com os números do modo dominante do posterior: cone de abertura
   Θ₁ = e^{2,39}° = 10,9° (o artigo amostra log θ₀ = ln(Θ₁/1°)), topo em y_top = 4,54 R★ e o gás caindo com
   v(y) = v_ff [(k_∞²(y³ − 1) + k₀²)/y⁴]^{1/2}, k₀ = 10^{−0,80}, k_∞ = 1, v_ff = √(2GM/R★) = 0,64c (1,4 M☉, 10 km).
   Os fótons nascem dentro da coluna, ganham energia a cada espalhamento (ilustração da Comptonização, que
   satura em alguns kT_e, kT_e = 7,4 keV) e escapam pelas paredes, de lado: o feixe em leque. Gás e fótons são
   ilustração; a geometria e o perfil de velocidade são os do ajuste. À direita, o perfil v(y) contra a queda livre. */
(() => {
  const cv = document.getElementById('bw-col'); if (!cv) return;
  const cvV = document.getElementById('bw-v'), out = document.getElementById('bw-out');
  const YTOP = 4.536, TH = Math.exp(2.391) * deg, K0 = 10 ** -0.7997, VFF = 0.643, KT = 7.38;   // R★; rad; —; c; keV
  const vOf = y => Math.sqrt(Math.max(0, (y ** 3 - 1 + K0 * K0) / y ** 4));   // |v|/v_ff
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const VS = 1.6, CS = 3.2, MFP = 0.16;                                 // R★/s do gás (×v/v_ff) e dos fótons; livre caminho médio (R★)
  let gas = [], ph = [], t = 0, acc = 0;
  const inCone = (x, y) => { const r = Math.hypot(x, y); return r >= 1 && r <= YTOP && Math.abs(Math.atan2(x, y)) <= TH; };
  function newGas(r) { return { a: (2 * rnd() - 1) * TH * 0.95, r: r ?? 1 + (YTOP + 0.8 - 1) * rnd() }; }
  function newPhoton() {
    const r = 1.02 + (YTOP - 1.02) * rnd() ** 1.6, a = (2 * rnd() - 1) * TH * 0.9, d = 2 * Math.PI * rnd();
    return { x: r * Math.sin(a), y: r * Math.cos(a), dx: Math.cos(d), dy: Math.sin(d), left: -MFP * Math.log(1 - rnd()), E: 1 + rnd(), out: false, tr: [] };
  }
  function reset() { seed = 11; gas = Array.from({ length: 70 }, () => newGas()); ph = []; t = acc = 0; }
  function tick(dt) {
    t += dt;
    for (const g of gas) { g.r -= vOf(g.r) * VS * dt; if (g.r <= 1) Object.assign(g, newGas(YTOP + 0.8)); }
    acc += dt * 7; for (; acc >= 1; acc--) ph.push(newPhoton());       // 7 fótons por segundo
    for (const p of ph) {
      let s = CS * dt;
      while (s > 0) {
        const step = p.out ? s : Math.min(s, p.left);
        p.x += p.dx * step; p.y += p.dy * step; s -= step;
        if (p.out) break;
        p.left -= step;
        if (Math.hypot(p.x, p.y) < 1) { p.dead = true; break; }       // de volta à superfície: absorvido
        if (!inCone(p.x, p.y)) { p.out = true; continue; }            // saiu pela parede (ou pelo topo)
        if (p.left <= 0) {                                             // espalhamento: nova direção, mais energia
          const d = 2 * Math.PI * rnd(); p.dx = Math.cos(d); p.dy = Math.sin(d);
          p.left = -MFP * Math.log(1 - rnd()); p.E += 0.3 * (3 * KT - p.E) * rnd();
        }
      }
      p.tr.push([p.x, p.y]); if (p.tr.length > 26) p.tr.shift();
    }
    ph = ph.filter(p => !p.dead && Math.hypot(p.x, p.y) < 9);
    draw();
  }
  const colE = (E, a) => { const u = clamp(Math.log(E) / Math.log(3 * KT), 0, 1); return `hsla(${(28 + 172 * u).toFixed(0)},95%,${(62 + 18 * u).toFixed(0)}%,${a})`; };
  function draw() {
    const { ctx: c, w, h } = fitCanvas(cv), R = Math.min((h - 64) / (YTOP + 0.55), w / 4.2), sx = w * 0.42, sy = 52 + YTOP * R;
    const X = x => sx + x * R, Y = y => sy - y * R;
    // linhas de campo do dipolo (r = L sen²θ) e a estrela
    c.strokeStyle = 'rgba(158,140,255,.16)'; c.lineWidth = 1;
    for (const f of [0.55, 1, 1.6, 2.4, 3.6]) for (const sg of [-1, 1]) {
      const th0 = f * TH, L = 1 / Math.sin(th0) ** 2; c.beginPath(); let on = false;
      for (let th = th0; th < Math.PI / 2; th += 0.002) { const r = L * Math.sin(th) ** 2, x = sg * r * Math.sin(th), y = r * Math.cos(th); if (r > 9) break; on ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)); on = true; }
      c.stroke();
    }
    const g = c.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), R);
    g.addColorStop(0, '#3a3560'); g.addColorStop(1, '#22213a'); c.fillStyle = g; c.beginPath(); c.arc(X(0), Y(0), R, 0, 7); c.fill();
    c.strokeStyle = 'rgba(190,180,255,.5)'; c.lineWidth = 1.5; c.stroke();
    // o cone: paredes radiais a ±Θ₁, de R★ a y_top; o prolongamento até o centro, tracejado
    const wall = (r, sg) => [X(sg * r * Math.sin(TH)), Y(r * Math.cos(TH))];
    const cg = c.createLinearGradient(0, Y(1), 0, Y(YTOP)); cg.addColorStop(0, 'rgba(255,184,107,.34)'); cg.addColorStop(1, 'rgba(255,184,107,.08)');
    c.fillStyle = cg; c.beginPath(); c.moveTo(...wall(1, -1)); c.lineTo(...wall(YTOP, -1)); c.arc(X(0), Y(0), YTOP * R, -Math.PI / 2 - TH, -Math.PI / 2 + TH); c.lineTo(...wall(1, 1)); c.arc(X(0), Y(0), R, -Math.PI / 2 + TH, -Math.PI / 2 - TH, true); c.fill();
    c.strokeStyle = 'rgba(255,184,107,.7)'; c.lineWidth = 1.5; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(...wall(1, sg)); c.lineTo(...wall(YTOP, sg)); c.stroke(); }
    c.setLineDash([3, 5]); c.strokeStyle = 'rgba(255,184,107,.35)'; for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(...wall(1, sg)); c.stroke(); } c.setLineDash([]);
    c.strokeStyle = COL.sol; c.beginPath(); c.arc(X(0), Y(0), 0.42 * R, -Math.PI / 2, -Math.PI / 2 + TH); c.stroke();
    c.font = `15px ${FONT}`; c.fillStyle = COL.sol; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('Θ₁ ≈ 11°', X(0.14), Y(0.5));
    // o gás caindo
    c.fillStyle = 'rgba(200,195,255,.75)';
    for (const g2 of gas) { if (g2.r > YTOP + 0.6) continue; const x = g2.r * Math.sin(g2.a), y = g2.r * Math.cos(g2.a), L = 0.05 + 0.25 * vOf(g2.r); c.globalAlpha = 0.7; c.fillRect(X(x) - 1, Y(y) - 1, 2.2, 2.2); c.strokeStyle = 'rgba(200,195,255,.35)'; c.beginPath(); c.moveTo(X(x), Y(y)); c.lineTo(X(x * (1 + L / g2.r)), Y(y * (1 + L / g2.r))); c.stroke(); }
    c.globalAlpha = 1;
    // os fótons: rastro e cabeça, cor pela energia
    for (const p of ph) {
      if (p.tr.length > 1) { c.strokeStyle = colE(p.E, 0.45); c.lineWidth = 1.3; c.beginPath(); p.tr.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); }
      c.fillStyle = colE(p.E, 1); c.beginPath(); c.arc(X(p.x), Y(p.y), 2.6, 0, 7); c.fill();
    }
    // cota de y_top, à direita
    const qx = X(YTOP * Math.sin(TH)) + 34;
    c.strokeStyle = COL.text2; c.fillStyle = COL.text2; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(qx, Y(1)); c.lineTo(qx, Y(YTOP)); c.moveTo(qx - 6, Y(1)); c.lineTo(qx + 6, Y(1)); c.moveTo(qx - 6, Y(YTOP)); c.lineTo(qx + 6, Y(YTOP)); c.stroke();
    c.textAlign = 'left'; c.fillStyle = COL.text; c.font = `600 16px ${FONT}`; subText(c, `y_{top} ≈ ${fmt(4.5, 1)} R★`, qx + 10, Y((1 + YTOP) / 2) - 10, 16);
    c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.fillText(T('≈ 35 km acima da superfície', '≈ 35 km above the surface'), qx + 10, Y((1 + YTOP) / 2) + 12);
    c.fillStyle = COL.text3; c.textBaseline = 'bottom'; c.fillText(T('estrela de nêutrons · 1,4 M☉ · 10 km', 'neutron star · 1.4 M☉ · 10 km'), 10, h - 8);
    c.textBaseline = 'top'; c.fillText(T('o gás cai pelas linhas de campo; os fótons escapam pelas paredes', 'the gas falls along the field lines; photons escape through the walls'), 10, 8);
    // a escala de cor dos fótons
    const lx = w - 150, ly = h - 40;
    for (let i = 0; i < 100; i++) { c.fillStyle = colE(Math.exp(i / 99 * Math.log(3 * KT)), 1); c.fillRect(lx + i * 1.3, ly, 1.4, 8); }
    c.fillStyle = COL.text3; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText('1', lx, ly + 11); c.textAlign = 'right'; c.fillText(`${Math.round(3 * KT)} keV`, lx + 130, ly + 11);
    c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(T('energia do fóton', 'photon energy'), lx + 65, ly - 3);
  }
  // o perfil de velocidade do ajuste contra a queda livre
  function prof() {
    const P = new Plot(cvV, { x: [1, 5], y: [0, 1.05], m: [26, 14, 50, 58], fs: 15, xticks: [1, 2, 3, 4, 5], yticks: [0, 0.25, 0.5, 0.75, 1] });
    P.begin().frame('y = r / R★', null);
    const c = P.ctx; c.save(); c.translate(18, (P.T + P.B) / 2); c.rotate(-Math.PI / 2); c.font = `16px ${FONT}`; c.fillStyle = COL.text2; c.textBaseline = 'middle'; subText(c, '|v| / v_{ff}', 0, 0, 16, 'center'); c.restore();
    const ys = linspace(1, 5, 200);
    P.clip();
    P.line(ys, ys.map(y => 1 / Math.sqrt(y)), { color: 'rgba(255,255,255,.45)', width: 2, dash: [7, 6] });
    P.line(ys, ys.map(vOf), { color: COL.sol, width: 3, glow: 10 });
    P.vline(YTOP, { color: 'rgba(255,184,107,.5)' });
    P.unclip();
    P.dot(1, K0, { color: COL.sol, r: 5, glow: 12 });
    c.font = `14px ${FONT}`; c.fillStyle = 'rgba(255,184,107,.8)'; c.textBaseline = 'bottom'; subText(c, 'y_{top}', P.X(YTOP) - 6, P.B - 6, 14, 'right');
    P.text(1.12, K0 + 0.02, T(`k₀ = ${fmt(K0, 2)}: chega a ${fmt(K0 * VFF, 2)} c`, `k₀ = ${fmt(K0, 2)}: arrives at ${fmt(K0 * VFF, 2)} c`), { color: COL.sol, size: 14, base: 'bottom' });
    P.text(2.6, 1 / Math.sqrt(2.6) + 0.06, T('queda livre', 'free fall'), { color: COL.text2, size: 14, base: 'bottom' });
    P.text(1.02, 1.0, T('o gás, freado perto da superfície', 'the gas, braked near the surface'), { color: COL.text3, size: 13, base: 'top', px: false });
  }
  out.innerHTML = `<span>${T('cone', 'cone')} Θ<sub>1</sub> <b>≈ 11°</b></span><span>${T('topo', 'top')} <b>4,5 R★</b></span>
    <span>kT<sub>e</sub> <b>${fmt(KT, 1)} keV</b></span><span>v<sub>ff</sub> <b>${fmt(VFF, 2)} c</b>, ${T('impacto', 'impact')} <b>${fmt(K0 * VFF, 2)} c</b></span>`.replace('4,5', fmt(4.5, 1));
  const slide = cv.closest('.slide');
  addEventListener('slidechange', () => { if (slide.classList.contains('active')) reset(); });
  reset();
  loopOn(cv, tick, () => { reset(); for (let i = 0; i < 180; i++) tick(1 / 60); });
  onSlide(cvV, prof);
})();

/* De onde vem o gás da coluna: a binária Be/X 1A 0535+262 vista de cima. A órbita da estrela de nêutrons tem a
   excentricidade e o período do sistema (e = 0,45, P = 111 d; Kepler, com a anomalia excêntrica), em torno da
   estrela Be HD 245770, parada no foco, que solta um disco de gás no equador (girando kepleriano; a borda chega
   ao periastro, como no truncamento por maré). Quando a estrela de nêutrons passa pela borda do disco, o gás a
   menos de 0,16 a dela se solta e passa a sentir as duas gravidades (massas 15 e 1,4 M☉, a escala de G pelo
   período); perto dela um arrasto (viscosidade, de brinquedo) faz o gás espiralar num disco pequeno antes de cair.
   A taxa de captura é a curva de luz de baixo — uma explosão a cada periastro, que sobe e decai em ~40% da órbita. No
   detalhe, o gás capturado sai do disco no raio magnetosférico e desce pelas linhas de campo r = r_m sen²θ até
   os polos. Tamanhos das estrelas, do disco e do detalhe são esquemáticos; a órbita está na proporção certa. */
(() => {
  const cv = document.getElementById('bex-orbit'); if (!cv) return;
  const out = document.getElementById('bex-out');
  const E = 0.45, TS = 10, PDAYS = 111, MBE = 15, MNS = 1.4, RD = 0.57, RBE = 0.07;   // s de tela por órbita; raio do disco e da Be (em a)
  const GM = 4 * Math.PI * Math.PI / (TS * TS), GBE = GM * MBE / (MBE + MNS), GNS = GM * MNS / (MBE + MNS);
  const TP = 17.7, PRE = 10;                                          // periastro 7,7 s depois de abrir o slide (o PDF pega o gás sendo roubado)
  let seed = 3; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  let t = 0, disk = [], gas = [], fall = [], hist = [], rate = 0, caps = 0, sampleT = 0;
  function nsAt(time) {                                               // posição da estrela de nêutrons (Be no foco, periastro em +x)
    const M = 2 * Math.PI * (time - TP) / TS; let Ea = M;
    for (let k = 0; k < 6; k++) Ea -= (Ea - E * Math.sin(Ea) - M) / (1 - E * Math.cos(Ea));
    return [Math.cos(Ea) - E, Math.sqrt(1 - E * E) * Math.sin(Ea)];
  }
  const newDisk = () => ({ r: 0.1 + (RD - 0.1) * rnd() ** 0.35, a: 2 * Math.PI * rnd() });   // mais gás perto da borda
  function reset() {
    seed = 3; t = 0; gas = []; fall = []; hist = []; rate = caps = sampleT = 0;
    disk = Array.from({ length: 500 }, newDisk);
    for (let i = 0; i < PRE * 60; i++) step(1 / 60);                   // uma órbita antes, para a curva de luz já ter história
  }
  function step(dt) {
    t += dt;
    const [nx, ny] = nsAt(t);
    for (const d of disk) {                                           // o disco gira; o gás perto da estrela de nêutrons se solta
      d.a += Math.sqrt(GBE / d.r ** 3) * dt;
      const x = d.r * Math.cos(d.a), y = d.r * Math.sin(d.a);
      if (Math.hypot(x - nx, y - ny) < 0.16) {
        const v = Math.sqrt(GBE / d.r);
        gas.push({ x, y, vx: -v * Math.sin(d.a), vy: v * Math.cos(d.a), age: 0 });
        Object.assign(d, newDisk());
      }
    }
    const n = 6, h = dt / n;
    for (let s = 0; s < n; s++) {
      const tm = t - dt + (s + 0.5) * h, [qx, qy] = nsAt(tm), [px, py] = nsAt(tm + 1e-3), vnx = (px - qx) / 1e-3, vny = (py - qy) / 1e-3;
      for (const g of gas) {
        const rb = Math.hypot(g.x, g.y), dx = qx - g.x, dy = qy - g.y, dn = Math.hypot(dx, dy) + 1e-9, sn = (dn * dn + 1e-4) ** 1.5;
        g.vx += (-GBE * g.x / rb ** 3 + GNS * dx / sn) * h; g.vy += (-GBE * g.y / rb ** 3 + GNS * dy / sn) * h;
        if (dn < 0.07) { const k = 1 - 0.6 * h; g.vx = vnx + (g.vx - vnx) * k; g.vy = vny + (g.vy - vny) * k; }   // o arrasto do disco pequeno
        g.x += g.vx * h; g.y += g.vy * h;
        if (dn < 0.008) g.cap = true;
      }
    }
    gas = gas.filter(g => {
      g.age += dt;
      if (g.cap) { caps++; for (const sg of [1, -1]) fall.push({ s: 0, sg, side: rnd() < 0.5 ? 1 : -1 }); return false; }
      return g.age < 7 && Math.hypot(g.x, g.y) > RBE && Math.hypot(g.x, g.y) < 2.2;
    });
    rate = rate * Math.exp(-dt / 0.7) + caps; caps = 0;
    sampleT += dt; if (sampleT >= 0.05) { sampleT = 0; hist.push([t, rate]); if (hist.length > 520) hist.shift(); }
    for (const f of fall) f.s += dt * (0.5 + 2.2 * f.s);              // desce acelerando pela linha de campo
    fall = fall.filter(f => f.s < 1);
  }
  function draw() {
    const { ctx: c, w, h } = fitCanvas(cv), LC = 92, S = Math.min((h - LC - 40) / 1.9, (w - 330) / 2.15);
    const fx = 30 + 1.47 * S, fy = 20 + 0.95 * S, X = x => fx + x * S, Y = y => fy - y * S;
    const [nx, ny] = nsAt(t), rp = 1 - E;
    // a órbita e o periastro
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([5, 7]); c.lineWidth = 1.2;
    c.beginPath(); c.ellipse(X(-E), Y(0), S, S * Math.sqrt(1 - E * E), 0, 0, 7); c.stroke(); c.setLineDash([]);
    c.fillStyle = COL.text3; c.font = `14px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(T('periastro', 'periastron'), X(rp) + 8, Y(0));
    // o disco da estrela Be: brilho e o gás girando
    const g = c.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), RD * S);
    g.addColorStop(0, 'rgba(150,190,255,.38)'); g.addColorStop(0.7, 'rgba(120,160,255,.14)'); g.addColorStop(1, 'rgba(120,160,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(X(0), Y(0), RD * S, 0, 7); c.fill();
    c.fillStyle = 'rgba(190,215,255,.7)';
    for (const d of disk) c.fillRect(X(d.r * Math.cos(d.a)) - 1, Y(d.r * Math.sin(d.a)) - 1, 2, 2);
    const gb = c.createRadialGradient(X(0), Y(0), 0, X(0), Y(0), RBE * S * 1.8);
    gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.5, '#cfe0ff'); gb.addColorStop(1, 'rgba(160,190,255,0)');
    c.fillStyle = gb; c.beginPath(); c.arc(X(0), Y(0), RBE * S * 1.8, 0, 7); c.fill();
    // o gás roubado, do azul do disco ao âmbar perto da estrela de nêutrons
    for (const p of gas) { const u = clamp(1 - Math.hypot(p.x - nx, p.y - ny) / 0.25, 0, 1); c.fillStyle = `rgba(${Math.round(190 + 65 * u)},${Math.round(215 - 30 * u)},${Math.round(255 - 148 * u)},.9)`; c.fillRect(X(p.x) - 1.3, Y(p.y) - 1.3, 2.6, 2.6); }
    // a estrela de nêutrons, com o brilho da acreção
    const L = clamp(rate / 6, 0, 1);
    if (L > 0.01) { const ga = c.createRadialGradient(X(nx), Y(ny), 0, X(nx), Y(ny), 10 + 34 * L); ga.addColorStop(0, `rgba(255,214,150,${0.9 * L})`); ga.addColorStop(1, 'rgba(255,184,107,0)'); c.fillStyle = ga; c.beginPath(); c.arc(X(nx), Y(ny), 10 + 34 * L, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.shadowColor = COL.psr; c.shadowBlur = 12; c.beginPath(); c.arc(X(nx), Y(ny), 4.5, 0, 7); c.fill(); c.shadowBlur = 0;
    c.font = `15px ${FONT}`; c.fillStyle = COL.text2; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(T('HD 245770 · estrela Be', 'HD 245770 · Be star'), X(0), Y(-RD) + 6);
    c.fillStyle = COL.psr; c.textBaseline = 'bottom'; c.fillText(T('estrela de nêutrons', 'neutron star'), X(nx), Y(ny) - 10);
    // o detalhe: perto da estrela de nêutrons, de lado
    const ix = w - 165, iy = 150, ir = 140, rs = 22, rm = 2.7 * rs;
    c.save(); c.strokeStyle = 'rgba(86,225,208,.35)'; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(X(nx), Y(ny));
    const ang = Math.atan2(Y(ny) - iy, X(nx) - ix); c.lineTo(ix + ir * Math.cos(ang), iy + ir * Math.sin(ang)); c.stroke(); c.restore();
    c.save(); c.beginPath(); c.arc(ix, iy, ir, 0, 7); c.fillStyle = '#080a12'; c.fill(); c.clip();
    c.strokeStyle = 'rgba(158,140,255,.3)'; c.lineWidth = 1;
    for (const Lf of [rm, 1.6 * rm, 2.4 * rm]) for (const sx of [1, -1]) { c.beginPath(); for (let th = 0.02; th < Math.PI - 0.02; th += 0.03) { const r = Lf * Math.sin(th) ** 2; if (r < rs) continue; const px = ix + sx * r * Math.sin(th), py = iy - r * Math.cos(th); th < 0.05 ? c.moveTo(px, py) : c.lineTo(px, py); } c.stroke(); }
    for (const sx of [1, -1]) { const dg = c.createLinearGradient(ix + sx * rm, 0, ix + sx * ir, 0); dg.addColorStop(0, 'rgba(255,184,107,.75)'); dg.addColorStop(1, 'rgba(150,190,255,.25)'); c.fillStyle = dg; c.fillRect(Math.min(ix + sx * rm, ix + sx * ir), iy - 3, Math.abs(ir - rm), 6); }
    for (const f of fall) {                                           // do raio magnetosférico ao polo, pela linha de campo
      const th = Math.PI / 2 - f.s * (Math.PI / 2 - Math.asin(Math.sqrt(rs / rm))), r = rm * Math.sin(th) ** 2;
      c.fillStyle = 'rgba(255,214,150,.9)'; c.fillRect(ix + f.side * r * Math.sin(th) - 1.3, iy - f.sg * r * Math.cos(th) - 1.3, 2.6, 2.6);
    }
    c.fillStyle = '#1c2236'; c.beginPath(); c.arc(ix, iy, rs, 0, 7); c.fill(); c.strokeStyle = 'rgba(86,225,208,.7)'; c.lineWidth = 1.5; c.stroke();
    for (const sg of [1, -1]) { const pg = c.createRadialGradient(ix, iy - sg * rs, 0, ix, iy - sg * rs, 8 + 16 * L); pg.addColorStop(0, `rgba(255,230,180,${0.35 + 0.65 * L})`); pg.addColorStop(1, 'rgba(255,184,107,0)'); c.fillStyle = pg; c.beginPath(); c.arc(ix, iy - sg * rs, 8 + 16 * L, 0, 7); c.fill(); }
    c.restore();
    c.strokeStyle = 'rgba(86,225,208,.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(ix, iy, ir, 0, 7); c.stroke();
    c.font = `14px ${FONT}`; c.fillStyle = COL.text2; c.textAlign = 'center'; c.textBaseline = 'top';
    c.fillText(T('perto da estrela de nêutrons, de lado', 'near the neutron star, side-on'), ix, iy + ir + 8);
    c.fillStyle = COL.text3; c.fillText(T('o disco para no raio magnetosférico;', 'the disc stops at the magnetospheric radius;'), ix, iy + ir + 28);
    c.fillText(T('o gás desce pelo campo até os polos', 'the gas slides down the field to the poles'), ix, iy + ir + 46);
    // a curva de luz: a taxa de captura no tempo, com os periastros marcados
    const x0 = 20, x1 = w - 20, y1 = h - 22, y0 = h - LC + 4, span = 2.3 * TS, tx = tt => x1 - (t - tt) / span * (x1 - x0);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, y1); c.lineTo(x1, y1); c.stroke();
    for (let k = Math.ceil((t - span - TP) / TS); TP + k * TS <= t; k++) { const xx = tx(TP + k * TS); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.moveTo(xx, y0); c.lineTo(xx, y1); c.stroke(); c.setLineDash([]); c.fillStyle = COL.text3; c.font = `13px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(T('periastro', 'periastron'), xx, y0 + 2); }
    const top = Math.max(6, ...hist.map(p => p[1])), yv = v => y1 - v / top * (y1 - y0 - 16);
    c.beginPath(); c.moveTo(tx(hist.length ? hist[0][0] : t), y1); for (const [tt, v] of hist) if (tx(tt) >= x0) c.lineTo(tx(tt), yv(v)); c.lineTo(x1, y1); c.closePath();
    c.fillStyle = 'rgba(255,184,107,.22)'; c.fill();
    c.strokeStyle = COL.sol; c.lineWidth = 2; c.beginPath(); let on = false; for (const [tt, v] of hist) { if (tx(tt) < x0) continue; on ? c.lineTo(tx(tt), yv(v)) : c.moveTo(tx(tt), yv(v)); on = true; } c.stroke();
    c.fillStyle = COL.text2; c.font = `14px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(T('raios X (a taxa de acreção) · últimos 250 dias', 'X-rays (the accretion rate) · last 250 days'), x0, y1 + 4);
    // leitura
    const day = (((t - TP) / TS % 1) + 1) % 1 * PDAYS, dist = Math.hypot(nx, ny) / rp;
    out.innerHTML = `<span>${T('dia', 'day')} <b>${Math.round(day)}</b> ${T('de', 'of')} ${PDAYS} ${T('desde o periastro', 'since periastron')}</span>
      <span>${T('distância', 'distance')} <b>${fmt(dist, 2)}×</b> ${T('a do periastro', 'that at periastron')}</span>
      <span>${T('gás capturado agora', 'gas captured now')} <b>${rate < 0.5 ? T('quase nada', 'almost none') : Math.round(rate)}</b></span>`;
  }
  const slide = cv.closest('.slide');
  addEventListener('slidechange', () => { if (slide.classList.contains('active')) reset(); });   // antes de loopOn: cada visita recomeça
  reset();
  loopOn(cv, dt => { step(dt); draw(); }, () => { reset(); for (let i = 0; i < 480; i++) step(1 / 60); draw(); });
  onSlide(cv, () => { if (!slide.classList.contains('active')) draw(); });
})();

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
   da curva M–R da Parte I (dash-ns.js), copiado para cá. Conferido contra a melhor amostra do
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
  return { seq, epsOf, PSURF, MSUN, FG, C2 };
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

/* =====================================================================
   Estrelas de quarks (Zastrow, Pereira, de Lima & Horvath, PRD 112, 083010, 2025): a equação de
   estado de Alford et al. (2005) a partir do potencial
     ω = −(3a₄/4π²) μ⁴ + (3a₂/4π²) μ² + B,   p = −ω,
   que dá ρ(p) = 3p + 4B + (3a₂²/4π²a₄)[1 + sgn(a₂)√(1 + 16π²a₄(p + B)/3a₂²)], eq. (16).
   a₄ = 1 é o gás de quarks livres; a₂ = m_s² − 4Δ² na fase CFL; B é a constante de sacola efetiva.
   TOV em km com G = c = 1 e, junto, a equação de y (Hinderer 2008; Postnikov et al. 2010) para a
   deformabilidade de maré, com o salto da superfície Δy = −4πR³ρ_s/M (eq. 11). Conferido contra o
   exemplo do artigo (a₂ = 14,61×10³ MeV², a₄ = 0,64, B^¼ = 130,76 MeV): M_máx ≈ 2,19 M☉,
   R₁,₄ ≈ 11,97 km e Λ₁,₄ ≈ 852 (Figs. 2 e 3).
   ===================================================================== */
/* sinal de menos tipográfico nos números dos painéis abaixo */
const minus = v => String(v).replace(/^-/, '−');

const QS = (() => {
  const HC = 197.3269804, MSUN = 1.476625, C2 = 8.987551787e20;
  const MEV4 = 1.602176634e33 / HC ** 3 * 6.67430e-8 / C2 ** 2 * 1e10;   // MeV⁴ → km⁻²
  const GCC = 1.602176634e33 / HC ** 3 / C2;                                 // MeV⁴ → g/cm³
  const G0 = 930, K3 = (1 + 2 ** (1 / 3)) ** 3;                              // E/A do ⁵⁶Fe (MeV)
  /* a janela de estabilidade (Apêndice): estrela de quarks se B̃_lim < B < B_lim (MeV⁴) */
  const blim = (a2, a4) => G0 * G0 / (108 * Math.PI ** 2) * (G0 * G0 * a4 - 9 * a2);
  const btil = (a2, a4) => G0 * G0 / (54 * Math.PI ** 2) * (4 * G0 * G0 * a4 / K3 - 3 * a2);
  /* energia por bárion a pressão zero: 3μ₀ (uds) e 3μ̃₀ (ud), da raiz de p(μ) = 0 */
  const root = (c4, c2, B) => Math.sqrt((c2 + Math.sqrt(c2 * c2 + 4 * c4 * B)) / (2 * c4));
  const eaUDS = (a2, a4, B) => 3 * root(3 * a4 / (4 * Math.PI ** 2), 3 * a2 / (4 * Math.PI ** 2), B);
  const eaUD = (a2, a4, B) => 3 * root(6 * a4 / (Math.PI ** 2 * K3), a2 / (2 * Math.PI ** 2), B);

  function eos(a2, a4, B) {
    const Bk = B * MEV4, Q = 3 * a2 * a2 / (16 * Math.PI ** 2 * a4) * MEV4, s = Math.sign(a2);
    const rho = Q > 0 ? p => 3 * p + 4 * Bk + 4 * Q * (1 + s * Math.sqrt(1 + (p + Bk) / Q)) : p => 3 * p + 4 * Bk;
    const drdp = Q > 0 ? p => 3 + 2 * s / Math.sqrt(1 + (p + Bk) / Q) : () => 3;
    return { Bk, rho, drdp };
  }
  /* uma estrela: [R (km), M (M☉), Λ]. A superfície tem densidade finita: o último passo é
     encurtado até p ≈ 0 em vez de seguir p até a crosta. */
  function star(pc, E) {
    const f = (r, m, p, y) => {
      const q = p > 0 ? p : 0, e = E.rho(q), el = 1 / (1 - 2 * m / r), nup = 2 * (m + 4 * Math.PI * r ** 3 * q) / (r * (r - 2 * m));
      const Qy = 4 * Math.PI * el * (5 * e + 9 * q + (e + q) * E.drdp(q)) - 6 * el / (r * r) - nup * nup;
      return [4 * Math.PI * r * r * e, -(e + q) * nup / 2, -(y * y + y * el * (1 + 4 * Math.PI * r * r * (q - e)) + r * r * Qy) / r];
    };
    let r = 1e-3, m = 4 / 3 * Math.PI * r ** 3 * E.rho(pc), p = pc, y = 2;
    for (let n = 0; n < 4000; n++) {
      const k1 = f(r, m, p, y);
      let h = Math.min(0.05, 0.5 * r);
      const last = p + h * k1[1] < 0;
      if (last) h = -p / k1[1];
      const k2 = f(r + h / 2, m + h / 2 * k1[0], p + h / 2 * k1[1], y + h / 2 * k1[2]);
      const k3 = f(r + h / 2, m + h / 2 * k2[0], p + h / 2 * k2[1], y + h / 2 * k2[2]);
      const k4 = f(r + h, m + h * k3[0], p + h * k3[1], y + h * k3[2]);
      m += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); p += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      y += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); r += h;
      if (p < 1e-10 * pc) break;
    }
    const C = m / r, ys = y - 4 * Math.PI * r ** 3 * E.rho(0) / m;
    const k2 = 1.6 * C ** 5 * (1 - 2 * C) ** 2 * (2 + 2 * C * (ys - 1) - ys) / (2 * C * (6 - 3 * ys + 3 * C * (5 * ys - 8))
      + 4 * C ** 3 * (13 - 11 * ys + C * (3 * ys - 2) + 2 * C * C * (1 + ys)) + 3 * (1 - 2 * C) ** 2 * (2 - ys + 2 * C * (ys - 1)) * Math.log(1 - 2 * C));
    return [r, m / MSUN, 2 / 3 * k2 / C ** 5];
  }
  /* o ramo estável até M_máx, com R₁,₄, Λ₁,₄ e a densidade da superfície */
  const cache = new Map();
  function seq(a2, a4, b4, dl = 0.04) {
    const key = [a2, a4, b4, dl].map(x => x.toFixed(4)).join('|'); if (cache.has(key)) return cache.get(key);
    const E = eos(a2, a4, b4 ** 4), R = [], M = [], L = [];
    let mmax = 0;
    for (let l = -2.4; l <= 2; l += dl) {
      const s = star(E.Bk * 10 ** l, E);
      if (s[1] < mmax) break;
      mmax = s[1]; R.push(s[0]); M.push(s[1]); L.push(s[2]);
    }
    let r14 = null, l14 = null;
    for (let k = 1; k < M.length; k++) if (M[k - 1] < 1.4 && M[k] >= 1.4) {
      const u = (1.4 - M[k - 1]) / (M[k] - M[k - 1]);
      r14 = R[k - 1] + u * (R[k] - R[k - 1]); l14 = Math.exp(Math.log(L[k - 1]) + u * (Math.log(L[k]) - Math.log(L[k - 1])));
    }
    const out = { R, M, mmax, r14, l14, rhos: E.rho(0) / MEV4 * GCC };
    if (cache.size > 300) cache.clear(); cache.set(key, out); return out;
  }
  return { seq, blim, btil, eaUDS, eaUD, G0 };
})();

/* =====================================================================
   Rotação estratificada (Pereira, Ottoni, Coelho, Rueda & de Lima, PRD 110, 103014, 2024).
   Hartle (1967), primeira ordem: ω̄ = Ω − ω obedece (r⁴ j ω̄′)′ + 4r³ j′ ω̄ = 0, com
   j = e^{−(λ+ν)/2} e j′ = −4πr e^λ (ρ + p) j. No raio R★ a velocidade angular salta:
   [ω̄] = [Ω] = 𝒞 ω̄⁻(R★) e [ω̄′] = 0 (eqs. 13–14). Fora, J = R⁴ω̄′(R)/6 e Ω⁺ = ω̄(R) + 2J/R³;
   I = J/Ω⁺. A equação é linear: a solução de fora é U₁ + [Ω]U₂, com U₁ a continuação da de dentro
   e U₂ a que parte de (1, 0) em R★ — uma integração por R★. SLy de BRANE. Conferido contra a
   Fig. 2 do artigo (SLy4): 𝒞 = 20%, 1,4 M☉, R★ → R dá ΔI/I ≈ 15%; 𝒞 = −20% dá ≈ −21%.
   ===================================================================== */
const STRAT = (() => {
  const { epsOf, PSURF, MSUN, FG, C2 } = BRANE;
  /* o perfil da estrela: r, e^λ, ρ + p, j (com ν(0) = 0: a constante some na equação) */
  function profile(pc) {
    const f = (r, m, p) => { const q = p > 0 ? p : 0, e = epsOf(q), d = r * (r - 2 * m), num = m + 4 * Math.PI * r ** 3 * q;
      return [4 * Math.PI * r * r * e, -(e + q) * num / d, 2 * num / d]; };
    let r = 1e-3, m = 4 / 3 * Math.PI * r ** 3 * epsOf(pc), p = pc, nu = 0;
    const S = { r: [], el: [], w: [], j: [] };
    const rec = () => { const el = 1 / (1 - 2 * m / r); S.r.push(r); S.el.push(el); S.w.push(epsOf(p > 0 ? p : 0) + Math.max(p, 0)); S.j.push(Math.exp(-0.5 * (Math.log(el) + nu))); };
    rec();
    while (p > PSURF) {
      const h = Math.min(0.02, 0.5 * r, 0.05 * p / Math.abs(f(r, m, p)[1]));
      const k1 = f(r, m, p), k2 = f(r + h / 2, m + h / 2 * k1[0], p + h / 2 * k1[1]), k3 = f(r + h / 2, m + h / 2 * k2[0], p + h / 2 * k2[1]), k4 = f(r + h, m + h * k3[0], p + h * k3[1]);
      m += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); p += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      nu += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]); r += h; rec();
    }
    S.R = r; S.M = m / MSUN; return S;
  }
  /* ω̄ e φ = r⁴ j ω̄′ de i0 até a superfície, pelo método de Heun nos pontos do perfil */
  function hartle(S, i0, w0, f0) {
    const g = (i, w, f) => [f / (S.r[i] ** 4 * S.j[i]), 16 * Math.PI * S.r[i] ** 4 * S.el[i] * S.w[i] * S.j[i] * w];
    let w = w0, f = f0;
    for (let i = i0; i < S.r.length - 1; i++) {
      const h = S.r[i + 1] - S.r[i], a = g(i, w, f), b = g(i + 1, w + h * a[0], f + h * a[1]);
      w += h / 2 * (a[0] + b[0]); f += h / 2 * (a[1] + b[1]);
      if (i0 === 0) { S.u[i + 1] = w; S.phi[i + 1] = f; }
    }
    const n = S.r.length - 1, R = S.r[n], J = f / (S.j[n] * 6), Om = w + 2 * J / R ** 3;   // J = R⁴ω̄′(R)/6
    return [J, Om];
  }
  /* a estrela de massa M (M☉) na SLy, pela bisseção em log p_c */
  const cache = new Map();
  function forMass(M) {
    const key = M.toFixed(3); if (cache.has(key)) return cache.get(key);
    let a = 34.0, b = 35.8;
    for (let k = 0; k < 40; k++) { const c = (a + b) / 2; (profile(10 ** c / C2 * FG).M < M ? a = c : b = c); }
    const S = profile(10 ** ((a + b) / 2) / C2 * FG);
    S.u = [1]; S.phi = [16 * Math.PI / 5 * S.r[0] ** 5 * S.el[0] * S.w[0] * S.j[0]];
    const [J1, O1] = hartle(S, 0, 1, S.phi[0]);
    S.J1 = J1; S.O1 = O1; S.Irig = J1 / O1;
    S.U2 = S.r.map((_, i) => i < S.r.length - 1 ? hartle(S, i, 1, 0) : [0, 1]);   // [J₂, Ω₂] para cada R★
    if (cache.size > 40) cache.clear(); cache.set(key, S); return S;
  }
  /* ΔI/I_rig e [Ω]/Ω⁺ para um salto 𝒞 no ponto i do perfil */
  function dI(S, i, C) {
    const D = C * S.u[i], [J2, O2] = S.U2[i], J = S.J1 + D * J2, Om = S.O1 + D * O2;
    return [(S.Irig - J / Om) / S.Irig, D / Om];
  }
  return { forMass, dI };
})();

/* Painel: a janela de estabilidade. Energia por bárion a pressão zero da matéria uds (3μ₀) e só
   ud (3μ̃₀) contra B^¼, com a linha do ⁵⁶Fe: há estrelas de quarks onde a uds fica abaixo de
   930 MeV e a ud acima — entre B̃_lim e B_lim do Apêndice do artigo. */
(() => {
  const cv = document.getElementById('qs-win'); if (!cv) return;
  const out = document.getElementById('qs-win-out');
  let pend = 0;
  const later = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; draw(); }); };
  const getA4 = bindRange('qw-a4', v => fmt(v, 2), later), getA2 = bindRange('qw-a2', v => minus(fmt(v, 0)), later);   // a₂ em 10³ MeV²
  const P = new Plot(cv, { x: [60, 220], y: [800, 1100], m: [22, 24, 62, 80], fs: 16, xticks: [60, 100, 140, 180, 220], yticks: [800, 850, 900, 950, 1000, 1050, 1100] });
  const BS = linspace(60, 220, 161);
  function draw() {
    const a4 = getA4(), a2 = getA2() * 1e3;
    const lo = Math.max(QS.btil(a2, a4), 0) ** 0.25, hi = Math.max(QS.blim(a2, a4), 0) ** 0.25, ok = hi > lo;
    P.begin().frame('B¹ᐟ⁴ (MeV)', T('energia por bárion (MeV)', 'energy per baryon (MeV)'));
    const c = P.ctx;
    P.clip();
    if (ok) { c.fillStyle = 'rgba(86,225,208,.12)'; c.fillRect(P.X(lo), P.T, P.X(hi) - P.X(lo), P.B - P.T); }
    P.hline(QS.G0, { color: COL.text2, dash: [7, 6], label: T('⁵⁶Fe: 930 MeV por núcleon', '⁵⁶Fe: 930 MeV per nucleon'), align: 'left' });
    P.line(BS, BS.map(b => QS.eaUD(a2, a4, b ** 4)), { color: COL.bn, width: 3, glow: 8 });
    P.line(BS, BS.map(b => QS.eaUDS(a2, a4, b ** 4)), { color: COL.sol, width: 3.4, glow: 10 });
    P.unclip();
    // os nomes ao lado das curvas: a ud à esquerda dela em 1040 MeV, a uds à direita em 1000 MeV
    const bd = BS.find(b => QS.eaUD(a2, a4, b ** 4) >= 1040), bs = BS.find(b => QS.eaUDS(a2, a4, b ** 4) >= 1000);
    if (bd) P.text(bd - 3, 1040, T('só u, d', 'u, d only'), { color: COL.bn, align: 'right', size: 15 });
    if (bs) P.text(bs + 3, 1000, 'u, d, s', { color: COL.sol, size: 15 });
    if (ok) {
      const mid = clamp((lo + hi) / 2, 75, 205);
      P.text(mid, 1086, T('estrelas de quarks', 'quark stars'), { color: COL.psr, align: 'center', size: 15 });
      if (P.X(lo) - P.L > 110) P.text((Math.max(lo, 60) + 60) / 2, 1086, T('o ferro decairia', 'iron would decay'), { color: COL.text3, align: 'center', size: 14 });
      if (P.R - P.X(hi) > 110) P.text((Math.min(hi, 220) + 220) / 2, 1086, T('estrelas híbridas', 'hybrid stars'), { color: COL.text3, align: 'center', size: 14 });
    }
    const gap = a2 < 1e4 ? Math.sqrt((1e4 - a2) / 4) : null;   // a₂ = m_s² − 4Δ², com m_s = 100 MeV
    out.innerHTML = (ok
      ? `<span>${T('janela', 'window')}: B<sup>1/4</sup> <b>${fmt(lo, 1)} – ${fmt(hi, 1)} MeV</b></span>`
      : `<span><b class="c-warn">${T('sem janela: a matéria ud ficaria estável antes da uds', 'no window: ud matter would become stable before uds')}</b></span>`)
      + `<span>${T('gap de cor', 'color gap')} Δ (m<sub>s</sub> = 100 MeV) <b>${gap == null ? '—' : fmt(gap, 0) + ' MeV'}</b></span>`;
  }
  onSlide(cv, draw);
})();

/* Painel: a família de estrelas de quarks para (a₄, a₂, B^¼), contra a SLy (estrela de nêutrons
   comum), os vínculos do artigo (Tabela I) e o objeto central de HESS J1731−347. */
(() => {
  const cv = document.getElementById('qs-mr'); if (!cv) return;
  const out = document.getElementById('qs-out'), seg = document.getElementById('qs-pre');
  const els = { a4: document.getElementById('qs-a4'), a2: document.getElementById('qs-a2'), b: document.getElementById('qs-b') };
  const FMT = { a4: v => fmt(v, 2), a2: v => minus(fmt(v, 0)), b: v => fmt(v, 1) };
  const PRE = { free: [1, 10, 145], paper: [0.64, 14.61, 130.76], gap: [0.5, -100, 168] };   // a₄, a₂ (10³ MeV²), B^¼ (MeV)
  let pend = 0;
  const later = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; draw(); }); };
  const get = Object.fromEntries(Object.keys(els).map(k => [k, bindRange('qs-' + k, FMT[k], later)]));
  seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    PRE[b.dataset.v].forEach((v, i) => { const k = ['a4', 'a2', 'b'][i]; els[k].value = v; document.querySelector(`output[for="qs-${k}"]`).textContent = FMT[k](v); });
    later();
  });
  Object.values(els).forEach(el => el.addEventListener('input', () => seg.querySelectorAll('button').forEach(x => x.classList.remove('on'))));
  const P = new Plot(cv, { x: [0, 16], y: [0, 3], m: [22, 24, 62, 72], fs: 16, yticks: [0, 0.5, 1, 1.5, 2, 2.5, 3] });
  const mark = (ok, s) => `<b class="${ok ? 'c-psr' : 'c-warn'}">${s} ${ok ? '✓' : '✗'}</b>`;
  function draw() {
    const a4 = get.a4(), a2 = get.a2() * 1e3, b = get.b(), B = b ** 4;
    const s = QS.seq(a2, a4, b), sly = BRANE.seq(8, 0, 0);
    const inWin = B > QS.btil(a2, a4) && B < QS.blim(a2, a4);
    P.begin().frame(T('raio (km)', 'radius (km)'), T('massa (M☉)', 'mass (M☉)'));
    const c = P.ctx;
    P.clip();
    // M_máx aceito (2,13–2,33 M☉) e R₁,₄ aceito (10,00–13,25 km)
    c.fillStyle = 'rgba(255,184,107,.09)'; c.fillRect(P.L, P.Y(2.33), P.R - P.L, P.Y(2.13) - P.Y(2.33));
    P.text(0.3, 2.23, T('massa máxima aceita: 2,13–2,33 M☉', 'accepted maximum mass: 2.13–2.33 M☉'), { color: 'rgba(255,184,107,.85)', size: 14 });
    c.strokeStyle = COL.bn; c.lineWidth = 2; c.beginPath(); c.moveTo(P.X(10), P.Y(1.4)); c.lineTo(P.X(13.25), P.Y(1.4)); c.stroke();
    [10, 13.25].forEach(x => { c.beginPath(); c.moveTo(P.X(x), P.Y(1.4) - 6); c.lineTo(P.X(x), P.Y(1.4) + 6); c.stroke(); });
    P.line(sly.R, sly.M, { color: 'rgba(255,255,255,.5)', width: 2, dash: [7, 6] });
    if (s.M.length) P.line(s.R, s.M, inWin ? { color: COL.psr, width: 3.6, glow: 12 } : { color: COL.psr, width: 2.4, dash: [4, 6], alpha: 0.6 });
    // XMMU J173203.3−344518: M = 0,77 (+0,20 −0,17) M☉, R = 10,40 (+0,86 −0,78) km
    c.strokeStyle = COL.neb; c.lineWidth = 2;
    c.beginPath(); c.moveTo(P.X(9.62), P.Y(0.77)); c.lineTo(P.X(11.26), P.Y(0.77)); c.moveTo(P.X(10.4), P.Y(0.60)); c.lineTo(P.X(10.4), P.Y(0.97)); c.stroke();
    P.unclip();
    P.dot(10.4, 0.77, { color: COL.neb, r: 5.5, glow: 10 });
    P.text(11.45, 0.66, 'XMMU J1732−344', { color: COL.neb, size: 14 });
    P.text(13.4, 1.4, T('R₁,₄ aceito', 'accepted R₁.₄'), { color: COL.bn, size: 14 });
    if (sly.mmax) P.text(sly.R[sly.R.length - 1] + 0.2, sly.mmax + 0.1, T('nêutrons (SLy)', 'neutrons (SLy)'), { color: COL.text3, size: 14 });
    if (s.M.length > 3) {
      const k = s.M.findIndex(m => m > 0.35);   // o nome no ramo de baixa massa, onde M ∝ R³
      if (k > 0) P.text(s.R[k] - 0.25, s.M[k], T('quarks', 'quarks'), { color: COL.psr, align: 'right', size: 15 });
    }
    const okM = s.mmax > 2.13 && s.mmax < 2.33, okR = s.r14 != null && s.r14 > 10 && s.r14 < 13.25, okL = s.l14 != null && s.l14 < 970;
    out.innerHTML = `<span>M<sub>${T('máx', 'max')}</sub> ${mark(okM, fmt(s.mmax, 2) + ' M☉')}</span>
      <span>R<sub>1${DEC}4</sub> ${mark(okR, s.r14 ? fmt(s.r14, 2) + ' km' : '—')}</span>
      <span>Λ<sub>1${DEC}4</sub> ${mark(okL, s.l14 ? fmt(s.l14, 0) : '—')}</span>
      <span>ρ<sub>${T('sup', 'surf')}</sub> <b>${fmt(s.rhos / 2.7e14, 2)} ρ<sub>sat</sub></b></span>
      ${inWin ? '' : `<span><b class="c-warn">${B >= QS.blim(a2, a4) ? T('B acima da janela: estrela híbrida', 'B above the window: hybrid star') : T('B abaixo da janela: o ferro decairia', 'B below the window: iron would decay')}</b></span>`}`;
  }
  onSlide(cv, draw);
})();

/* Painel: o método do artigo, ao vivo. Pontos (a₂, a₄, B^¼) de uma sequência quase aleatória
   (Halton nas bases 2, 3, 5) dentro da janela de estabilidade; cada ponto é uma família inteira
   de estrelas. Âmbar: as que passam nos três vínculos da Tabela I. */
(() => {
  const cv = document.getElementById('qs-scan'); if (!cv) return;
  const out = document.getElementById('qs-scan-out');
  const getX = bindSeg('qs-x', () => draw()), getY = bindSeg('qs-y', () => draw());
  const hal = (i, b) => { let f = 1, r = 0; for (; i > 0; i = Math.floor(i / b)) { f /= b; r += f * (i % b); } return r; };
  const pts = [], MAXN = 6000;
  let n = 0;
  function one() {
    for (;;) {
      n++;
      const a4 = 0.05 + 0.95 * hal(n, 2), a2 = -270e3 + 360e3 * hal(n, 3), b4 = 40 + 190 * hal(n, 5), B = b4 ** 4;
      if (B <= QS.btil(a2, a4) || B >= QS.blim(a2, a4)) continue;
      const s = QS.seq(a2, a4, b4, 0.07);
      pts.push({ a4, a2: a2 / 1e3, b4, M: s.mmax, R: s.r14, L: s.l14,
        ok: s.mmax > 2.13 && s.mmax < 2.33 && s.r14 > 10 && s.r14 < 13.25 && s.l14 < 970 });
      return;
    }
  }
  const AX = { a4: { r: [0, 1], lab: 'a₄', d: 2 }, a2: { r: [-280, 100], lab: T('a₂ (10³ MeV²)', 'a₂ (10³ MeV²)'), d: 0 }, b4: { r: [40, 230], lab: 'B¹ᐟ⁴ (MeV)', d: 0 } };
  const AY = { M: { r: [1, 8.5], lab: T('massa máxima (M☉)', 'maximum mass (M☉)'), band: [2.13, 2.33] }, R: { r: [5, 30], lab: 'R₁,₄ (km)', band: [10, 13.25] },
    L: { r: [3, 3e5], log: true, lab: 'Λ₁,₄', band: [3, 970] } };
  if (LANG === 'en') AY.R.lab = 'R₁.₄ (km)', AY.L.lab = 'Λ₁.₄';
  function draw() {
    const xk = getX(), yk = getY(), ax = AX[xk], ay = AY[yk];
    const P = new Plot(cv, { x: ax.r, y: ay.r, ylog: !!ay.log, m: [22, 24, 62, 80], fs: 16 });
    P.begin().frame(ax.lab, ay.lab);
    const c = P.ctx, ok = pts.filter(p => p.ok);
    P.clip();
    c.fillStyle = 'rgba(86,225,208,.10)'; c.fillRect(P.L, P.Y(ay.band[1]), P.R - P.L, P.Y(ay.band[0]) - P.Y(ay.band[1]));
    c.fillStyle = 'rgba(124,196,255,.32)';
    for (const p of pts) if (!p.ok && p[yk] != null) c.fillRect(P.X(p[xk]) - 1.4, P.Y(p[yk]) - 1.4, 2.8, 2.8);
    c.fillStyle = COL.sol; c.shadowColor = COL.sol; c.shadowBlur = 6;
    for (const p of ok) c.fillRect(P.X(p[xk]) - 2, P.Y(p[yk]) - 2, 4, 4);
    c.shadowBlur = 0;
    if (ok.length) {   // até onde vão os aceitos neste eixo
      const xs = ok.map(p => p[xk]), lo = Math.min(...xs), hi = Math.max(...xs);
      [lo, hi].forEach(x => P.vline(x, { color: 'rgba(255,184,107,.7)', dash: [5, 5], width: 1.4 }));
    }
    P.unclip();
    const rg = k => { const v = ok.map(p => p[k]); return v.length ? `${minus(fmt(Math.min(...v), AX[k].d))} – ${minus(fmt(Math.max(...v), AX[k].d))}` : '—'; };
    out.innerHTML = `<span>${T('famílias', 'families')} <b>${grp(pts.length)}</b> · ${T('aceitas', 'accepted')} <b class="c-sol">${grp(ok.length)}</b></span>
      <span>a₄ <b>${rg('a4')}</b> <span class="muted">(${T('artigo', 'paper')} ${fmt(0.18, 2)} – ${fmt(0.81, 2)})</span></span>
      <span>a₂ <b>${rg('a2')}</b> <span class="muted">(−202 – 42)</span></span>
      <span>B<sup>1/4</sup> <b>${rg('b4')}</b> <span class="muted">(114 – 185)</span></span>`;
  }
  loopOn(cv, () => {
    if (pts.length >= MAXN) return;
    const t0 = performance.now();
    do one(); while (performance.now() - t0 < 9 && pts.length < MAXN);
    draw();
  }, draw);
  onSlide(cv, draw);
})();

/* Painel: rotação em duas camadas. À esquerda a estrela vista de cima — dentro de R★ gira com Ω⁻,
   fora com Ω⁺ (a velocidade relativa é a de verdade, sem exagero); à direita ΔI/I_rig contra R★/R
   para a massa escolhida (cheia) e para 1,0 e 2,0 M☉ (tracejadas), como na Fig. 2 do artigo. */
(() => {
  const cv = document.getElementById('strat-cv'); if (!cv) return;
  const out = document.getElementById('strat-out');
  let dirty = true;
  const later = () => { dirty = true; };
  const getM = bindRange('strat-m', v => fmt(v, 2) + ' M☉', later), getC = bindRange('strat-c', v => (v > 0 ? '+' : '') + minus(fmt(v, 0)) + '%', later);
  const getX = bindRange('strat-x', v => fmt(v, 2), later);
  const XS = linspace(0.02, 0.98, 49);
  const at = (S, x) => Math.max(1, S.r.findIndex(r => r >= x * S.R));
  const curve = (M, C) => { const S = STRAT.forMass(M); return XS.map(x => 100 * STRAT.dI(S, at(S, x), C)[0]); };
  let cur = null, th1 = 0, th2 = 0;
  function update() {
    const M = getM(), C = getC() / 100, x = getX(), S = STRAT.forMass(M), [di, dw] = STRAT.dI(S, at(S, x), C);
    cur = { M, C, x, di, dw, main: curve(M, C), lo: curve(1, C), hi: curve(2, C), I45: S.Irig * 1.3466e43 / 1e45, R: S.R };
    dirty = false;
    out.innerHTML = `<span>ΔI/I<sub>${T('ríg', 'rig')}</sub> <b>${(di >= 0 ? '+' : '') + minus(fmt(100 * di, 1))}%</b></span>
      <span>ΔΩ/Ω⁺ <b>${(dw >= 0 ? '+' : '') + minus(fmt(100 * dw, 1))}%</b></span>
      <span>I<sub>${T('ríg', 'rig')}</sub> <b>${fmt(cur.I45, 2)}×10⁴⁵ g cm²</b> (R = ${fmt(S.R, 1)} km)</span>
      <span>${T('no raio', 'in the radius')}: ΔR/R ≈ ½ ΔI/I <b>${fmt(50 * Math.abs(di), 1)}%</b></span>`;
  }
  function draw() {
    if (dirty || !cur) update();
    const H = cv.clientHeight, SW = Math.min(H - 30, cv.clientWidth * 0.34);
    const P = new Plot(cv, { x: [0, 1], y: [-25, 20], m: [22, 24, 62, SW + 86], fs: 16, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1], yticks: [-20, -15, -10, -5, 0, 5, 10, 15, 20], yfmt: v => minus(v) });
    P.begin().frame('R★ / R', null);
    const c = P.ctx;
    c.save(); c.translate(P.L - 62, (P.T + P.B) / 2); c.rotate(-Math.PI / 2); c.fillStyle = COL.text2; c.font = `17px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T('ΔI / I rígido (%)', 'ΔI / I rigid (%)'), 0, 0); c.restore();
    P.clip();
    c.fillStyle = 'rgba(255,255,255,.035)'; c.fillRect(P.L, P.Y(5), P.R - P.L, P.Y(-5) - P.Y(5));
    [5, -5].forEach(y => P.hline(y, { color: COL.text3, dash: [4, 6], width: 1.2 }));
    P.line(XS, cur.lo, { color: COL.sol, width: 1.8, dash: [6, 6], alpha: 0.55 });
    P.line(XS, cur.hi, { color: COL.sol, width: 1.8, dash: [2, 5], alpha: 0.55 });
    P.line(XS, cur.main, { color: COL.sol, width: 3.4, glow: 10 });
    P.vline(cur.x, { color: 'rgba(86,225,208,.6)', dash: [5, 5], width: 1.4 });
    P.unclip();
    P.dot(cur.x, 100 * cur.di, { color: COL.psr, r: 6, glow: 12 });
    P.text(0.03, 5, T('±5%: a precisão esperada para I', '±5%: the expected precision on I'), { color: COL.text3, size: 14, base: 'bottom' });
    // a estrela vista de cima
    const cx = SW / 2 + 8, cy = (P.T + P.B) / 2, Rp = SW / 2 - 10, Rs = Rp * cur.x;
    c.save();
    c.fillStyle = 'rgba(255,184,107,.16)'; c.beginPath(); c.arc(cx, cy, Rp, 0, 7); c.fill();
    c.fillStyle = 'rgba(86,225,208,.20)'; c.beginPath(); c.arc(cx, cy, Rs, 0, 7); c.fill();
    c.strokeStyle = 'rgba(255,184,107,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, Rp, 0, 7); c.stroke();
    c.setLineDash([4, 5]); c.strokeStyle = 'rgba(86,225,208,.8)'; c.beginPath(); c.arc(cx, cy, Rs, 0, 7); c.stroke(); c.setLineDash([]);
    c.lineCap = 'round';
    for (let k = 0; k < 12; k++) {   // marcas da camada de fora
      const a = th2 + k * Math.PI / 6;
      c.strokeStyle = COL.sol; c.lineWidth = 3;
      c.beginPath(); c.moveTo(cx + (Rs + 0.25 * (Rp - Rs)) * Math.cos(a), cy + (Rs + 0.25 * (Rp - Rs)) * Math.sin(a));
      c.lineTo(cx + (Rp - 0.2 * (Rp - Rs)) * Math.cos(a), cy + (Rp - 0.2 * (Rp - Rs)) * Math.sin(a)); c.stroke();
    }
    for (let k = 0; k < 6; k++) {   // raios do caroço
      const a = th1 + k * Math.PI / 3;
      c.strokeStyle = COL.psr; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(cx + 0.15 * Rs * Math.cos(a), cy + 0.15 * Rs * Math.sin(a)); c.lineTo(cx + 0.85 * Rs * Math.cos(a), cy + 0.85 * Rs * Math.sin(a)); c.stroke();
    }
    c.restore();
    P.text(cx, cy + Rp + 22, T('Ω⁺ fora · Ω⁻ dentro', 'Ω⁺ outside · Ω⁻ inside'), { color: COL.text2, align: 'center', size: 15, px: true });
    P.text(cx, cy - Rp - 14, 'R★ = ' + fmt(cur.x, 2) + ' R', { color: COL.psr, align: 'center', size: 15, px: true });
  }
  loopOn(cv, dt => {
    const w2 = 0.8, w1 = w2 * (1 - (cur ? cur.dw : 0));   // Ω⁻ = Ω⁺ (1 − [Ω]/Ω⁺)
    th2 += w2 * dt; th1 += w1 * dt; draw();
  }, draw);
  onSlide(cv, draw);
})();
