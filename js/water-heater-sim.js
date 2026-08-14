/* water-heater-sim.js — Interactive instant water heater (water-heater.html, #wh-canvas)
 *
 * โหมด 1 "อุณหภูมิน้ำ": สไลเดอร์กำลังไฟ / อัตราการไหล / อุณหภูมิน้ำเข้า → อุณหภูมิน้ำออก
 *   ใช้สูตรเดียวกับในหน้า:  ΔT ≈ P ÷ (70 × Q)   (P วัตต์, Q ลิตร/นาที)
 *   วาดทางน้ำจากท่อเข้า → หม้อต้ม → ฝักบัว โดยสีของน้ำและละอองแปรตามอุณหภูมิจริง
 *   พร้อมแถบช่วงอุณหภูมิ (เย็น / อุ่นพอใช้ / สบาย / ร้อน / ลวก) — เคสที่ 6 ในคลินิก
 *   ("หน้าหนาวน้ำไม่ร้อน ทั้งที่เครื่องไม่เสีย") พิสูจน์ได้ด้วยการลากสไลเดอร์น้ำเข้า
 *
 * โหมด 2 "ELCB ไฟรั่ว": สไลเดอร์กระแสรั่ว 0–60 mA
 *   ELCB วัดผลต่างของกระแสในสาย L กับ N (I_L − I_N) ผ่านแกนวงแหวน ถ้าต่างกันแปลว่า
 *   กระแสส่วนนั้นไหลออกนอกวงจร (ลงตัวถัง/ลงคน/ลงน้ำ) เกิน ~30 mA เมื่อไหร่ = สั่งตัดทันที
 *   → อธิบายว่าทำไม "ELCB ตัด" คือมันทำงานถูกต้อง และทำไมห้ามลัดข้ามเด็ดขาด
 */
(function () {
  const cv = document.getElementById('wh-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 520, H = 300;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  const TRIP_MA = 30;           // กระแสรั่วที่ ELCB ต้องตัด (มาตรฐานเครื่องทำน้ำอุ่น)
  const VMAINS = 220;

  const state = { mode: 'temp', p: 3500, q: 3, tin: 25, leak: 0, tripped: false, t: 0 };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);

  /* ---------- physics ---------- */
  const dT = () => state.p / (70 * state.q);
  const tOut = () => state.tin + dT();
  const iLine = () => state.p / VMAINS;

  // ช่วงอุณหภูมิที่ใช้ตัดสินสถานะน้ำ (°C)
  function zone(temp) {
    if (temp < 35) return { th: 'เย็นเกินไป', en: 'too cold', c: '#38bdf8' };
    if (temp < 40) return { th: 'อุ่นพอใช้', en: 'lukewarm', c: '#22d3ee' };
    if (temp <= 43) return { th: 'สบาย', en: 'comfortable', c: '#10b981' };
    if (temp <= 45) return { th: 'ร้อน', en: 'hot', c: '#f59e0b' };
    return { th: 'ลวกผิวหนัง!', en: 'scalding!', c: '#ef4444' };
  }
  // สีน้ำตามอุณหภูมิ (ฟ้าเย็น → แดงร้อน)
  function waterColor(temp) {
    const k = Math.max(0, Math.min(1, (temp - 18) / 32));
    const r = Math.round(40 + 200 * k), g = Math.round(150 - 60 * k), b = Math.round(230 - 150 * k);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---------- drawing helpers ---------- */
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + "px 'Anuphan',sans-serif";
    ctx.textAlign = align || 'left'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function pipe(x0, y0, x1, y1, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  /* ---------- mode 1: water temperature ---------- */
  function drawTemp() {
    const out = tOut(), z = zone(out), cIn = waterColor(state.tin), cOut = waterColor(out);
    const flowSpeed = state.q;

    // inlet pipe (left) → heater body → outlet up to the shower head
    pipe(20, 210, 150, 210, cIn, 11);
    label(20, 232, t('น้ำเข้า ' + state.tin.toFixed(0) + '°C', 'in ' + state.tin.toFixed(0) + '°C'), cIn, 11, 'left', 700);

    // heater body
    ctx.fillStyle = '#111c2e'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
    rrect(150, 120, 120, 130, 12); ctx.fill(); ctx.stroke();
    label(210, 140, t('หม้อต้ม', 'heating chamber'), '#94a3b8', 10.5, 'center', 700);
    // element glow scales with power
    const glow = 0.25 + 0.55 * ((state.p - 3000) / 3000) + 0.12 * Math.sin(state.t * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(239,68,68,' + Math.max(0.2, Math.min(1, glow)) + ')';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, x = 168 + u * 84, y = 200 - 26 * Math.sin(u * Math.PI * 4);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
    label(210, 236, state.p.toFixed(0) + ' W · ' + iLine().toFixed(1) + ' A', '#f59e0b', 11, 'center', 700);

    // outlet pipe → shower head
    pipe(270, 210, 330, 210, cOut, 11);
    pipe(330, 210, 330, 96, cOut, 11);
    pipe(330, 96, 392, 96, cOut, 11);
    ctx.fillStyle = '#64748b';
    rrect(392, 84, 44, 24, 6); ctx.fill();

    // falling droplets, faster with higher flow
    ctx.fillStyle = cOut;
    for (let i = 0; i < 14; i++) {
      const seed = i * 0.37;
      const prog = (state.t * flowSpeed * 0.28 + seed) % 1;
      const x = 398 + (i % 7) * 5.5;
      const y = 110 + prog * 150;
      ctx.globalAlpha = 0.85 - prog * 0.5;
      ctx.beginPath(); ctx.ellipse(x, y, 2, 5, 0, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    label(414, 132, out.toFixed(1) + '°C', cOut, 15, 'center', 700);
    label(414, 150, t(z.th, z.en), z.c, 11.5, 'center', 700);

    // temperature scale bar (28 → 55 °C)
    const bx = 30, bw = 460, by = 268, lo = 28, hi = 55;
    const stops = [[28, '#38bdf8'], [35, '#22d3ee'], [40, '#10b981'], [43, '#f59e0b'], [45, '#ef4444'], [55, '#b91c1c']];
    for (let i = 0; i < stops.length - 1; i++) {
      const x0 = bx + bw * (stops[i][0] - lo) / (hi - lo);
      const x1 = bx + bw * (stops[i + 1][0] - lo) / (hi - lo);
      ctx.fillStyle = stops[i][1];
      ctx.fillRect(x0, by, x1 - x0, 10);
    }
    label(bx, by - 6, t('เย็น', 'cold'), '#94a3b8', 10, 'left');
    label(bx + bw * (41.5 - lo) / (hi - lo), by - 6, t('สบาย 40–43°', 'comfort 40–43°'), '#10b981', 10, 'center', 700);
    label(bx + bw, by - 6, t('ลวก >45°', 'scald >45°'), '#ef4444', 10, 'right', 700);
    const mx = bx + bw * (Math.max(lo, Math.min(hi, out)) - lo) / (hi - lo);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(mx, by - 3); ctx.lineTo(mx - 5, by - 12); ctx.lineTo(mx + 5, by - 12); ctx.closePath(); ctx.fill();
    ctx.fillRect(mx - 1.5, by, 3, 10);

    // headline: the formula being applied
    label(20, 32, 'ΔT = ' + state.p.toFixed(0) + ' ÷ (70 × ' + state.q.toFixed(1) + ') = ' + dT().toFixed(1) + '°C',
          '#e2e8f0', 13, 'left', 700);
    label(20, 52, t('น้ำเข้า ' + state.tin.toFixed(0) + '°C + ΔT ' + dT().toFixed(1) + '°C = น้ำออก ' + out.toFixed(1) + '°C',
                    'in ' + state.tin.toFixed(0) + '°C + ΔT ' + dT().toFixed(1) + '°C = out ' + out.toFixed(1) + '°C'),
          '#94a3b8', 11, 'left');
  }

  /* ---------- mode 2: ELCB earth-leakage ---------- */
  function drawElcb() {
    const running = !state.tripped;
    const il = running ? iLine() : 0;                       // กระแสในสาย L
    const leakA = running ? state.leak / 1000 : 0;          // กระแสที่รั่วออกนอกวงจร
    const inn = Math.max(0, il - leakA);                    // กระแสที่กลับทางสาย N
    const danger = state.leak >= TRIP_MA;

    // ELCB body with the sensing toroid
    ctx.fillStyle = '#111c2e'; ctx.strokeStyle = state.tripped ? '#ef4444' : '#334155'; ctx.lineWidth = 2;
    rrect(150, 70, 96, 120, 10); ctx.fill(); ctx.stroke();
    label(198, 92, 'ELCB', state.tripped ? '#ef4444' : '#e2e8f0', 13, 'center', 700);
    ctx.strokeStyle = state.tripped ? '#ef4444' : '#f59e0b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(198, 140, 34, 26, 0, 0, 7); ctx.stroke();
    label(198, 176, t('แกนวัดผลต่าง', 'sensing toroid'), '#94a3b8', 9.5, 'center');

    // L and N lines through the toroid, on to the element
    const cl = running ? '#ef4444' : '#475569', cn = running ? '#38bdf8' : '#475569';
    pipe(20, 122, 380, 122, cl, 6);
    pipe(20, 158, 380, 158, cn, 6);
    label(20, 112, 'L  ' + il.toFixed(2) + ' A', cl, 11, 'left', 700);
    label(20, 180, 'N  ' + inn.toFixed(2) + ' A', cn, 11, 'left', 700);

    // the element (load)
    ctx.fillStyle = '#111c2e'; ctx.strokeStyle = running ? '#f59e0b' : '#475569'; ctx.lineWidth = 2;
    rrect(380, 106, 100, 68, 10); ctx.fill(); ctx.stroke();
    label(430, 132, t('ฮีตเตอร์', 'element'), running ? '#f59e0b' : '#64748b', 11.5, 'center', 700);
    label(430, 150, state.p.toFixed(0) + ' W', '#94a3b8', 10, 'center');

    // leakage path: element → body → earth
    if (state.leak > 0) {
      ctx.save(); ctx.setLineDash([5, 4]);
      ctx.strokeStyle = danger ? '#ef4444' : '#f59e0b'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(430, 174); ctx.lineTo(430, 236); ctx.stroke();
      ctx.restore();
      // earth symbol
      ctx.strokeStyle = danger ? '#ef4444' : '#f59e0b'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(414, 238); ctx.lineTo(446, 238); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(420, 244); ctx.lineTo(440, 244); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(426, 250); ctx.lineTo(434, 250); ctx.stroke();
      label(452, 214, t('รั่วลงตัวถัง/สายดิน', 'leaking to body / earth'), danger ? '#ef4444' : '#f59e0b', 10, 'right', 700);
      label(452, 230, state.leak.toFixed(0) + ' mA', danger ? '#ef4444' : '#f59e0b', 12, 'right', 700);
    }

    // the balance equation, which is the whole point of an ELCB
    label(20, 32, t('ELCB ไม่ได้วัดกระแสมาก-น้อย แต่วัด "ผลต่าง" ของขาไปกับขากลับ',
                    'an ELCB does not measure how much current flows — it compares out and back'),
          '#e2e8f0', 12, 'left', 700);
    label(20, 52, 'I(L) − I(N) = ' + (il - inn).toFixed(3) + ' A = ' + (state.leak * (running ? 1 : 0)).toFixed(0) + ' mA' +
                  t('   · ตัดที่ ' + TRIP_MA + ' mA', '   · trips at ' + TRIP_MA + ' mA'),
          danger ? '#ef4444' : '#94a3b8', 11.5, 'left', 700);

    // status strip
    ctx.fillStyle = state.tripped ? 'rgba(239,68,68,.16)' : danger ? 'rgba(245,158,11,.16)' : 'rgba(16,185,129,.14)';
    ctx.strokeStyle = state.tripped ? '#ef4444' : danger ? '#f59e0b' : '#10b981'; ctx.lineWidth = 1.4;
    rrect(20, 262, 480, 26, 8); ctx.fill(); ctx.stroke();
    const msg = state.tripped
      ? t('⛔ ELCB ตัดวงจรแล้ว — มันทำงานถูกต้อง อย่าลัดข้าม ให้หาจุดที่รั่วแทน',
          '⛔ The ELCB has tripped — it did its job. Never bypass it; find the leak')
      : state.leak === 0
        ? t('✅ ปกติ — กระแสไปเท่ากับกระแสกลับ ไม่มีอะไรรั่วออกนอกวงจร',
            '✅ Healthy — the current going out equals the current coming back, nothing escapes')
        : t('⚠ มีกระแสรั่วแล้ว ' + state.leak.toFixed(0) + ' mA — ถ้าถึง ' + TRIP_MA + ' mA ELCB จะตัดใน ~0.04 วินาที',
            '⚠ Leaking ' + state.leak.toFixed(0) + ' mA — at ' + TRIP_MA + ' mA the ELCB cuts within ~0.04 s');
    label(30, 279, msg, state.tripped ? '#fca5a5' : danger ? '#fcd34d' : '#6ee7b7', 11, 'left', 700);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (state.mode === 'temp') drawTemp(); else drawElcb();
  }

  /* ---------- readouts ---------- */
  function fmt(n, d) { return n.toFixed(d === undefined ? 1 : d); }

  function updateReadouts() {
    const tempMode = state.mode === 'temp';
    if (tempMode) {
      const out = tOut(), z = zone(out);
      $('wh-r1').textContent = fmt(dT()) + ' °C';
      $('wh-r2').textContent = fmt(out) + ' °C';
      $('wh-r3').textContent = fmt(iLine()) + ' A';
      $('wh-r4').textContent = t(z.th, z.en);
      $('wh-r4').style.color = z.c;
      // เกณฑ์ตัดสินต้องเป็นชุดเดียวกับ zone() ไม่งั้นแถบสีกับข้อความจะขัดกันเอง
      const v = $('wh-verdict');
      if (out > 45) {
        v.textContent = t('ลวกผิวหนังได้ — หรี่กำลังหรือเปิดน้ำแรงขึ้น', 'hot enough to scald — lower the power or open the tap');
        v.style.color = '#dc2626';
      } else if (out > 43) {
        v.textContent = t('ร้อนไปนิด ระวังเด็กและผู้สูงอายุ', 'a bit hot — take care with children and the elderly');
        v.style.color = '#d97706';
      } else if (out < 40) {
        v.textContent = t('ยังไม่อุ่นพอ — ลองหรี่น้ำให้ไหลน้อยลง', 'not warm enough — try reducing the flow');
        v.style.color = '#0284c7';
      } else {
        v.textContent = t('กำลังสบาย', 'just right');
        v.style.color = '#059669';
      }
    } else {
      const running = !state.tripped;
      const il = running ? iLine() : 0, leakA = running ? state.leak / 1000 : 0;
      $('wh-r1').textContent = fmt(il, 2) + ' A';
      $('wh-r2').textContent = fmt(Math.max(0, il - leakA), 2) + ' A';
      $('wh-r3').textContent = (running ? state.leak : 0).toFixed(0) + ' mA';
      $('wh-r4').textContent = state.tripped ? t('ตัดแล้ว', 'tripped') : t('จ่ายไฟอยู่', 'closed');
      $('wh-r4').style.color = state.tripped ? '#dc2626' : '#059669';
      const v = $('wh-verdict');
      if (state.tripped) {
        v.textContent = t('กด RESET หลังลดกระแสรั่วให้ต่ำกว่า ' + TRIP_MA + ' mA', 'lower the leak below ' + TRIP_MA + ' mA, then RESET');
        v.style.color = '#dc2626';
      } else if (state.leak > 0) {
        v.textContent = t('ไฟกำลังรั่วออกนอกวงจร', 'current is escaping the circuit');
        v.style.color = '#d97706';
      } else {
        v.textContent = t('สมดุล ไม่มีไฟรั่ว', 'balanced, no leakage');
        v.style.color = '#059669';
      }
    }
  }

  function syncLabels() {
    $('wh-p-val').textContent = state.p.toFixed(0) + ' W';
    $('wh-q-val').textContent = state.q.toFixed(1) + ' L/min';
    $('wh-tin-val').textContent = state.tin.toFixed(0) + ' °C';
    $('wh-leak-val').textContent = state.leak.toFixed(0) + ' mA';
    const tempMode = state.mode === 'temp';
    document.querySelectorAll('#wh-sim [data-mode]').forEach(el => {
      el.style.display = el.dataset.mode === state.mode ? '' : 'none';
    });
    $('wh-mode-temp').classList.toggle('active', tempMode);
    $('wh-mode-elcb').classList.toggle('active', !tempMode);
    const rl = isEN()
      ? (tempMode ? ['Temp rise ΔT', 'Water out', 'Current drawn', 'Verdict']
                  : ['Live (L)', 'Neutral (N)', 'Difference', 'ELCB'])
      : (tempMode ? ['อุณหภูมิที่เพิ่ม ΔT', 'น้ำออก', 'กระแสที่กิน', 'สถานะน้ำ']
                  : ['กระแสสาย L', 'กระแสสาย N', 'ผลต่าง (รั่ว)', 'ELCB']);
    for (let i = 0; i < 4; i++) $('wh-l' + (i + 1)).textContent = rl[i];
  }

  function render() { syncLabels(); updateReadouts(); draw(); }

  /* ---------- UI ---------- */
  $('wh-mode-temp').addEventListener('click', () => { state.mode = 'temp'; render(); });
  $('wh-mode-elcb').addEventListener('click', () => { state.mode = 'elcb'; render(); });
  $('wh-p').addEventListener('input', function () { state.p = +this.value; render(); });
  $('wh-q').addEventListener('input', function () { state.q = +this.value; render(); });
  $('wh-tin').addEventListener('input', function () { state.tin = +this.value; render(); });
  $('wh-leak').addEventListener('input', function () {
    state.leak = +this.value;
    if (state.leak >= TRIP_MA) state.tripped = true;      // ELCB ตัดทันทีที่ถึงพิกัด
    render();
  });
  $('wh-reset').addEventListener('click', () => {
    if (state.leak < TRIP_MA) state.tripped = false;      // ยังรั่วอยู่ก็รีเซ็ตไม่ขึ้น เหมือนของจริง
    render();
  });
  document.addEventListener('langchange', render);        // ป้ายบน canvas เป็น text ต้องวาดใหม่

  let raf = null;
  function frame(now) {
    state.t = now / 1000;
    if (!document.hidden) draw();
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(frame);
  });

  render();
  raf = requestAnimationFrame(frame);
})();
