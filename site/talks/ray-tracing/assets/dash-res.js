/* =====================================================================
   Parte III · resultados — painel interativo
   ===================================================================== */

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
