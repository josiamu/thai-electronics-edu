/* bjt-circuit.js — Interactive step-by-step REAL circuit (transistor.html, #bc-canvas)
 * วงจร: +5V → R_C → LED → C ‖ IN → R_B → B ‖ E → GND   (NPN, low-side switch)
 * 6 ขั้น: 1 ไฟเข้า/กราวด์ (ทำไม E ถึงลบสุด) → 2 ทำไมต้องมี R_B → 3 กระแสเบส (วงจรควบคุม)
 *        → 4 กระแสหลัก (วงจรกำลัง) → 5 ทำไมต้องมี R_C → 6 แรงดันแต่ละขา + Cut-off vs Saturation
 * ปุ่ม HIGH/LOW สลับอินพุตได้ตลอด → เห็นย่าน Cut-off เทียบ Saturation ด้วยตัวเอง
 * กระแสที่วาดคือ "กระแสสมมติ" (+ → −) ซึ่งสวนทางกับการไหลของอิเล็กตรอน
 */
(function () {
  const root = document.getElementById('bjt-circuit');
  const cv = document.getElementById('bc-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  /* ---------- circuit values ---------- */
  const VCC = 5, VF_LED = 2.0, RC = 150, RB = 2200, VBE = 0.7, VCE_SAT = 0.2, BETA = 100;
  const IB = (VCC - VBE) / RB;                       // ≈ 1.95 mA
  const IC_WANT = IB * BETA;                         // ≈ 195 mA — ที่ β "อยากให้เป็น"
  const IC = (VCC - VF_LED - VCE_SAT) / RC;          // ≈ 18.7 mA — ที่วงจร "ยอมให้ไหล"

  /* ---------- geometry ---------- */
  const W = 720, H = 360;
  const RAIL_Y = 60, GND_Y = 320, BX = 95, CH = 350;  // rails, battery x, collector chain x
  const TR_X = 310, TR_TOP = 205, TR_BOT = 258, BASE_Y = 230;
  const GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', BLUE = '#2563eb';

  const BASE_PATH = [[190, BASE_Y], [TR_X, BASE_Y], [314, 242], [CH, 274], [CH, GND_Y - 2], [155, GND_Y - 2], [155, 250]];
  const PWR_PATH = [[BX, 170], [BX, RAIL_Y], [CH, RAIL_Y], [CH, 190], [330, 200], [TR_X + 4, 214],
                    [314, 242], [CH, 274], [CH, GND_Y - 2], [BX, GND_Y - 2], [BX, 192]];

  /* ---------- state ---------- */
  let step = 1, tStep = 0, playing = false, high = true, last = performance.now();
  let flowT = 0;

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  /* ---------- drawing helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function glowPath(pts, color, on) {
    if (!on) return;
    ctx.save();
    ctx.globalAlpha = 0.20 + 0.12 * Math.sin(tStep * 4);
    line(pts, color, 12);
    ctx.restore();
  }
  function chip(x, y, label, val, color) {
    ctx.font = '600 12px Anuphan, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = css('--text-light'); ctx.fillText(label, x, y);
    ctx.font = '700 14px Anuphan, sans-serif'; ctx.fillStyle = color;
    ctx.fillText(val, x + 78, y);
  }
  function pathLen(p) {
    let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return L;
  }
  function pointAt(p, d) {                      // d in px along the polyline
    let acc = 0;
    for (let i = 1; i < p.length; i++) {
      const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (acc + seg >= d) {
        const k = (d - acc) / seg;
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
      }
      acc += seg;
    }
    return p[p.length - 1];
  }
  function flow(p, color, speed, on) {          // conventional-current dots running + → −
    if (!on) return;
    const L = pathLen(p), gap = 34;
    const off = (flowT * speed) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- circuit parts ---------- */
  function drawResistorV(x, y0, y1, label, sub, hot) {   // vertical resistor (R_C)
    const txt = css('--text');
    line([[x, y0 - 14], [x, y0]], txt);
    line([[x, y1], [x, y1 + 14]], txt);
    ctx.fillStyle = hot ? '#fef3c7' : css('--card');
    ctx.strokeStyle = hot ? ORANGE : txt; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x - 11, y0, 22, y1 - y0); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = '700 12px Anuphan, sans-serif';
    ctx.fillStyle = hot ? '#b45309' : css('--text');
    ctx.fillText(label, x + 18, (y0 + y1) / 2 - 1);
    ctx.font = '500 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.fillText(sub, x + 18, (y0 + y1) / 2 + 13);
  }
  function drawResistorH(x0, x1, y, label, sub, hot) {   // horizontal resistor (R_B)
    const txt = css('--text');
    line([[x0 - 15, y], [x0, y]], txt);
    line([[x1, y], [x1 + 45, y]], txt);
    ctx.fillStyle = hot ? '#fef3c7' : css('--card');
    ctx.strokeStyle = hot ? ORANGE : txt; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x0, y - 10, x1 - x0, 20); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '700 12px Anuphan, sans-serif';
    ctx.fillStyle = hot ? '#b45309' : css('--text');
    ctx.fillText(label, (x0 + x1) / 2, y - 17);
    ctx.font = '500 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.fillText(sub, (x0 + x1) / 2, y + 26);
  }
  function drawLED(x, y0, y1, bright, hot) {
    const txt = css('--text');
    line([[x, y0 - 15], [x, y0]], txt);
    line([[x, y1], [x, y1 + 11]], txt);
    if (bright > 0) {                                   // glow
      const g = ctx.createRadialGradient(x, (y0 + y1) / 2, 2, x, (y0 + y1) / 2, 40);
      g.addColorStop(0, `rgba(239,68,68,${0.55 * bright})`);
      g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, (y0 + y1) / 2, 40, 0, 7); ctx.fill();
    }
    ctx.fillStyle = bright > 0 ? '#f87171' : (hot ? '#fecaca' : css('--card'));
    ctx.strokeStyle = hot ? RED : txt; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 13, y0 + 4); ctx.lineTo(x + 13, y0 + 4); ctx.lineTo(x, y1 - 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    line([[x - 14, y1 - 4], [x + 14, y1 - 4]], hot ? RED : txt, 2.5);
    // emission arrows
    ctx.strokeStyle = bright > 0 ? RED : css('--text-light'); ctx.lineWidth = 1.6;
    for (let i = 0; i < 2; i++) {
      const yy = y0 + 6 + i * 12;
      ctx.beginPath(); ctx.moveTo(x + 17, yy); ctx.lineTo(x + 28, yy - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 28, yy - 8); ctx.lineTo(x + 23, yy - 7); ctx.moveTo(x + 28, yy - 8); ctx.lineTo(x + 27, yy - 3); ctx.stroke();
    }
    ctx.textAlign = 'left'; ctx.font = '700 12px Anuphan, sans-serif'; ctx.fillStyle = css('--text');
    ctx.fillText('LED', x + 34, (y0 + y1) / 2 + 4);
    ctx.font = '500 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.fillText('Vf ≈ 2V', x + 34, (y0 + y1) / 2 + 18);
  }
  function drawBattery(hot) {
    const txt = css('--text');
    line([[BX, RAIL_Y], [BX, 172]], hot ? BLUE : txt);
    line([[BX, 192], [BX, GND_Y]], hot ? BLUE : txt);
    line([[BX - 15, 172], [BX + 15, 172]], hot ? BLUE : txt, 3.5);   // + plate (long)
    line([[BX - 8, 184], [BX + 8, 184]], hot ? BLUE : txt, 3.5);     // − plate (short)
    line([[BX - 15, 192], [BX + 15, 192]], 'rgba(0,0,0,0)', 0.1);
    ctx.textAlign = 'right'; ctx.font = '700 12px Anuphan, sans-serif';
    ctx.fillStyle = hot ? BLUE : css('--text');
    ctx.fillText('+', BX - 20, 170);
    ctx.fillText('−', BX - 20, 194);
    ctx.font = '700 13px Anuphan, sans-serif';
    ctx.fillText('5V', BX - 34, 182);
  }
  function drawGround() {
    const txt = css('--text');
    line([[250, GND_Y], [250, GND_Y + 12]], txt);
    line([[236, GND_Y + 12], [264, GND_Y + 12]], txt, 3);
    line([[241, GND_Y + 17], [259, GND_Y + 17]], txt, 2.5);
    line([[246, GND_Y + 22], [254, GND_Y + 22]], txt, 2);
    ctx.textAlign = 'center'; ctx.font = '600 11px Anuphan, sans-serif';
    ctx.fillStyle = css('--text-light');
    ctx.fillText(t('กราวด์ (0V) = ขั้วลบ', 'ground (0V) = negative'), 250, GND_Y + 38);
  }
  function drawInput() {
    const on = high;
    ctx.fillStyle = on ? '#dcfce7' : css('--card');
    ctx.strokeStyle = on ? GREEN : css('--text-light'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(120, 212, 70, 36); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '700 12px Anuphan, sans-serif';
    ctx.fillStyle = on ? '#15803d' : css('--text-light');
    ctx.fillText(on ? 'IN = 5V' : 'IN = 0V', 155, 228);
    ctx.font = '500 10px Anuphan, sans-serif';
    ctx.fillText(on ? 'HIGH' : 'LOW', 155, 242);
    line([[155, 248], [155, GND_Y]], css('--text'));       // MCU shares the same ground
    ctx.font = '500 10px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.textAlign = 'center';
    ctx.fillText(t('ขาไมโครฯ', 'MCU pin'), 155, 205);
  }
  function drawTransistor(hot) {
    const txt = css('--text');
    ctx.strokeStyle = hot ? BLUE : css('--border'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(340, 232, 52, 0, 7); ctx.stroke();
    line([[265, BASE_Y], [TR_X, BASE_Y]], txt);                 // base lead
    line([[TR_X, TR_TOP], [TR_X, TR_BOT]], txt, 4);             // body bar
    line([[TR_X, 216], [CH, 190]], txt);                        // collector
    line([[TR_X, 246], [CH, 274]], txt);                        // emitter
    line([[CH, 274], [CH, GND_Y]], txt);
    // emitter arrow (points OUT = NPN, conventional current leaves the emitter)
    ctx.fillStyle = BLUE;
    ctx.save(); ctx.translate(334, 264); ctx.rotate(Math.atan2(274 - 246, CH - TR_X));
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.textAlign = 'right'; ctx.font = '700 12px Anuphan, sans-serif'; ctx.fillStyle = css('--text');
    ctx.fillText('B', TR_X - 6, BASE_Y - 8);
    ctx.textAlign = 'left';
    ctx.fillText('C', CH + 6, 196);
    ctx.fillText('E', CH + 6, 282);
    ctx.font = '600 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.fillText('NPN  β≈100', 300, 300);
  }

  /* ---------- readout panel ---------- */
  function drawPanel() {
    const x = 452, y = 58, w = 246, h = 246;
    ctx.fillStyle = css('--bg'); ctx.strokeStyle = css('--border'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left'; ctx.font = '700 13px Anuphan, sans-serif'; ctx.fillStyle = css('--primary');
    ctx.fillText(t('📟 ค่าที่วัดได้', '📟 Measured'), x + 14, y + 24);

    const vB = high ? VBE : 0;
    const vC = high ? VCE_SAT : VCC;
    const iB = high ? IB * 1000 : 0;
    const iC = high ? IC * 1000 : 0;
    const P = x + 14;
    chip(P, y + 52, 'V' + 'ₑ (E)', '0.00 V', css('--text'));
    chip(P, y + 76, 'Vᵦ (B)', vB.toFixed(2) + ' V', high ? ORANGE : css('--text-light'));
    chip(P, y + 100, 'V꜀ (C)', vC.toFixed(2) + ' V', high ? GREEN : css('--text-light'));
    chip(P, y + 130, 'Iᵦ (B)', iB.toFixed(2) + ' mA', high ? ORANGE : css('--text-light'));
    chip(P, y + 154, 'I꜀ (C)', iC.toFixed(1) + ' mA', high ? GREEN : css('--text-light'));

    // region badge
    const badge = high ? 'SATURATION' : 'CUT-OFF';
    ctx.fillStyle = high ? GREEN : '#94a3b8';
    ctx.beginPath(); ctx.rect(P, y + 174, w - 28, 30); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '800 14px Anuphan, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(badge, x + w / 2, y + 194);
    ctx.textAlign = 'left';

    ctx.font = '500 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    const note = high
      ? t('LED ติด • V꜀ < Vᵦ → B-C ไบอัสตรง', 'LED on • V꜀ < Vᵦ → B-C forward biased')
      : t('LED ดับ • ไม่มีกระแสเลย', 'LED off • no current at all');
    ctx.fillText(note, P, y + 224);
  }

  /* ---------- per-step captions on the canvas ---------- */
  function drawCaption() {
    const msgs = [
      t('1 · E ต่อกราวด์ = ขาลบสุด | C ต่อ +5V = ขาบวกสุด  →  V꜀ > Vᵦ > Vₑ',
        '1 · E to ground = most negative | C to +5V = most positive  →  V꜀ > Vᵦ > Vₑ'),
      t('2 · B-E คือไดโอด! ถ้าไม่มี Rᵦ กระแสจะพุ่งจนทรานซิสเตอร์พัง', '2 · B-E is a diode! Without Rᵦ the current runs away and kills it'),
      t('3 · วงจรควบคุม: 5V → Rᵦ → B → E → กราวด์   (Iᵦ ≈ 1.95 mA)', '3 · Control loop: 5V → Rᵦ → B → E → ground   (Iᵦ ≈ 1.95 mA)'),
      t('4 · วงจรกำลัง: 5V → R꜀ → LED → C → E → กราวด์   (I꜀ ≈ 18.7 mA)', '4 · Power loop: 5V → R꜀ → LED → C → E → ground   (I꜀ ≈ 18.7 mA)'),
      t('5 · ไม่มี R꜀ → LED เกือบช็อต กระแสพุ่ง → LED พังทันที', '5 · No R꜀ → the LED is nearly a short; current runs away and it dies'),
      t('6 · กดปุ่ม HIGH / LOW เทียบดู: Saturation ↔ Cut-off', '6 · Toggle HIGH / LOW and compare: saturation ↔ cut-off')
    ];
    ctx.textAlign = 'center'; ctx.font = '700 13px Anuphan, sans-serif'; ctx.fillStyle = css('--text');
    ctx.fillText(msgs[step - 1], 360, 26);

    ctx.font = '500 11px Anuphan, sans-serif'; ctx.fillStyle = css('--text-light');
    ctx.fillText(t('จุดที่วิ่ง = กระแสสมมติ (+ → −) ซึ่งสวนทางกับอิเล็กตรอน',
                   'moving dots = conventional current (+ → −), opposite to electron flow'), 360, 346);
  }

  /* ---------- main draw ---------- */
  function draw() {
    const txt = css('--text');
    ctx.clearRect(0, 0, W, H);

    // rails
    const railHot = step === 1;
    glowPath([[BX, RAIL_Y], [CH, RAIL_Y]], BLUE, railHot);
    glowPath([[BX, GND_Y], [CH, GND_Y]], BLUE, railHot);
    line([[BX, RAIL_Y], [CH, RAIL_Y]], railHot ? BLUE : txt);
    line([[BX, GND_Y], [CH, GND_Y]], railHot ? BLUE : txt);
    ctx.textAlign = 'left'; ctx.font = '700 12px Anuphan, sans-serif';
    ctx.fillStyle = railHot ? BLUE : css('--text');
    ctx.fillText('+5V', BX + 8, RAIL_Y - 10);

    // glow for the loop under discussion
    glowPath(BASE_PATH, ORANGE, step === 2 || step === 3);
    glowPath(PWR_PATH, GREEN, step === 4);

    drawBattery(railHot);
    drawGround();
    drawInput();
    drawResistorH(205, 265, BASE_Y, 'Rᵦ 2.2kΩ', t('จำกัดกระแสเบส', 'limits base current'), step === 2 || step === 3);
    drawResistorV(CH, 85, 135, 'R꜀ 150Ω', t('จำกัดกระแส LED', 'limits LED current'), step === 5);
    drawLED(CH, 150, 185, high && step >= 4 ? 1 : 0, step === 5);
    drawTransistor(step === 1 || step === 6);

    flow(BASE_PATH, ORANGE, 60, high && step >= 3);
    flow(PWR_PATH, GREEN, 90, high && step >= 4);

    drawPanel();
    drawCaption();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (playing && tStep > 4.5) setStep(step % 6 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('bc-play');
  const inBtn = document.getElementById('bc-input');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(6, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncInBtn() {
    inBtn.classList.toggle('active', high);
    inBtn.querySelectorAll('.bc-hi').forEach(e => e.style.display = high ? '' : 'none');
    inBtn.querySelectorAll('.bc-lo').forEach(e => e.style.display = high ? 'none' : '');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('bc-prev').addEventListener('click', () => setStep(step === 1 ? 6 : step - 1));
  document.getElementById('bc-next').addEventListener('click', () => setStep(step === 6 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  inBtn.addEventListener('click', () => { high = !high; syncInBtn(); });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  syncInBtn();
  requestAnimationFrame(frame);
})();
