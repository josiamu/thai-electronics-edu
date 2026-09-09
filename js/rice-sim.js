/* rice-sim.js — Interactive "จุดคูรี" temperature sim (rice-cooker.html, #rc-sim-canvas)
 *
 * สอนแก่นของหม้อหุงข้าวกลไก: มันไม่มีทั้งตัวจับเวลาและเซ็นเซอร์ มีแค่ฟิสิกส์ 2 ข้อ
 *   1) ตราบใดที่ยังมีน้ำ พลังงานทั้งหมดถูกใช้เปลี่ยนน้ำเป็นไอ → ก้นหม้อค้างที่ 100°C (พลาโต)
 *   2) น้ำแห้งเมื่อไหร่ อุณหภูมิพุ่งทะลุ ~103°C = จุดคูรี แม่เหล็กหมดแรงดูด สปริงดีดสวิตช์เข้าโหมดอุ่น
 *
 * กราฟจึงมี 3 ช่วงชัดเจน: ไต่ขึ้น → พลาโต 100°C (ยาวตามปริมาณน้ำ) → พุ่งชันแล้วดีด
 *
 * โหมด "แม่เหล็กเสื่อม" ไม่ได้ทำงานที่อุณหภูมิต่ำลง (พลาโตค้างที่ 100°C อยู่ดี ไม่มีทางถึง 96°C
 * ระหว่างต้ม) แต่จำลองตามของจริงคือ **แรงดูดไม่พอ สปริงชนะก่อน** → หลุดกลางช่วงน้ำเดือด
 * ทั้งที่น้ำยังเหลือ = อาการ "หม้อดีดก่อน ข้าวยังดิบ" ในคลินิกเคสที่ 2
 * (ถ้าเปลี่ยนไปใช้เกณฑ์อุณหภูมิต่ำกว่า 100°C มันจะดีดตั้งแต่ยังไม่ทันเดือด ซึ่งผิดจากของจริง)
 */
(function () {
  const cv = document.getElementById('rc-sim-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 520, H = 300;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  const T_START = 30;        // อุณหภูมิเริ่มต้น (°C)
  const T_BOIL = 100;        // น้ำเดือด — พลาโต
  const T_CURIE = 103;       // จุดคูรีของแป้นแม่เหล็ก
  const T_WARM = 72;         // อุณหภูมิที่เทอร์โมสตัทคุมไว้ในโหมดอุ่น
  const WEAK_FRAC = 0.5;     // แม่เหล็กเสื่อม: หลุดตอนน้ำระเหยไปได้ครึ่งเดียว
  const WALL_SECS = 16;      // เวลาจริงที่ใช้เล่นกราฟทั้งกราฟ (วินาที)

  const state = { cups: 3, power: 700, volt: 220, weak: false, t: 0, running: true };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const tr = (th, en) => (isEN() ? en : th);

  /* ---------- physics ---------- */
  // กำลังที่ได้จริงแปรตามแรงดันยกกำลังสอง (P = V²/R) — ไฟตกแล้วหุงนานขึ้นเพราะข้อนี้
  const realPower = () => state.power * Math.pow(state.volt / 220, 2);

  function model() {
    const P = realPower();
    const mw = state.cups * 0.25;                       // มวลน้ำ (kg) ~250 ml ต่อถ้วย
    const cPot = 500;                                   // ความจุความร้อนของหม้อ+ฮีตเตอร์ (J/K)
    const t1 = ((mw * 4186) + cPot) * (T_BOIL - T_START) / P;   // ช่วงไต่ขึ้นถึงเดือด
    const eBoil = 0.35 * mw * 2.26e6;                   // น้ำที่ระเหยจริง (ที่เหลือข้าวดูดซับไว้)
    const tBoil = eBoil / P;                            // ความยาวของพลาโต 100°C
    const t2 = t1 + tBoil;
    const cDry = 900 + state.cups * 180;                // ก้นหม้อ+ข้าวแห้ง (J/K)
    const t3 = t2 + cDry * (T_CURIE - T_BOIL) / P;      // ช่วงพุ่งจนถึงจุดคูรี
    const tRelease = state.weak ? (t1 + WEAK_FRAC * tBoil) : t3;
    return { P, t1, tBoil, t2, t3, tRelease, span: Math.max(tRelease * 1.3, 240) };
  }

  // อุณหภูมิก้นหม้อที่เวลา t (วินาที)
  function tempAt(t, m) {
    if (t >= m.tRelease) {                              // โหมดอุ่น — ไหลลงเข้าหา T_WARM
      const tempAtRel = state.weak ? T_BOIL : T_CURIE;
      return T_WARM + (tempAtRel - T_WARM) * Math.exp(-(t - m.tRelease) / 200);
    }
    if (t <= m.t1) return T_START + (T_BOIL - T_START) * (t / m.t1);
    if (t <= m.t2) return T_BOIL;                       // พลาโต — พลังงานไปเป็นไอน้ำทั้งหมด
    return T_BOIL + (T_CURIE - T_BOIL) * ((t - m.t2) / Math.max(0.001, m.t3 - m.t2));
  }

  // น้ำที่เหลือ (%) ที่เวลา t
  function waterLeft(t, m) {
    if (t <= m.t1) return 100;
    if (t >= m.t2) return 0;
    return 100 * (1 - (t - m.t1) / m.tBoil);
  }

  const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');

  /* ---------- drawing helpers ---------- */
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + "px 'Anuphan',sans-serif";
    ctx.textAlign = align || 'left'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function dashLine(x0, y0, x1, y1, color, dash) {
    ctx.save(); ctx.setLineDash(dash || [5, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore();
  }

  /* ---------- render ---------- */
  const PAD = { l: 42, r: 16, t: 44, b: 30 };
  const gx = t => PAD.l + (W - PAD.l - PAD.r) * t;                 // t = 0..1 ของ span
  const gy = temp => {                                            // 20–120°C
    const k = (temp - 20) / 100;
    return H - PAD.b - (H - PAD.t - PAD.b) * Math.max(0, Math.min(1, k));
  };

  function draw() {
    const m = model();
    const now = Math.min(state.t, m.span);
    const temp = tempAt(now, m);
    const released = now >= m.tRelease;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);

    // กรอบกราฟ + เส้นกริดอุณหภูมิ
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let v = 20; v <= 120; v += 20) {
      ctx.beginPath(); ctx.moveTo(PAD.l, gy(v)); ctx.lineTo(W - PAD.r, gy(v)); ctx.stroke();
      label(PAD.l - 6, gy(v) + 4, v + '°', '#64748b', 10, 'right', 500);
    }
    ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.moveTo(PAD.l, PAD.t - 6); ctx.lineTo(PAD.l, H - PAD.b); ctx.lineTo(W - PAD.r, H - PAD.b); ctx.stroke();

    // เส้นอ้างอิง: น้ำเดือด 100°C และจุดคูรี 103°C
    dashLine(PAD.l, gy(T_BOIL), W - PAD.r, gy(T_BOIL), '#38bdf8');
    label(W - PAD.r, gy(T_BOIL) - 5, tr('น้ำเดือด 100°C', 'boiling 100°C'), '#38bdf8', 10, 'right', 700);
    dashLine(PAD.l, gy(T_CURIE), W - PAD.r, gy(T_CURIE), '#f87171');
    label(W - PAD.r, gy(T_CURIE) - 16, tr('จุดคูรี ~103°C → แม่เหล็กปล่อย', 'Curie ~103°C → magnet releases'), '#f87171', 10, 'right', 700);

    // เส้นกราฟอุณหภูมิ — ช่วงหุงสีส้ม/แดง ช่วงอุ่นสีเขียว
    const STEPS = 220;
    ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= STEPS; i++) {
      const tt = (now / STEPS) * i;
      if (tt > m.tRelease) break;
      const x = gx(tt / m.span), y = gy(tempAt(tt, m));
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#fb923c'; ctx.stroke();

    if (released) {
      ctx.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const tt = m.tRelease + ((now - m.tRelease) / STEPS) * i;
        const x = gx(tt / m.span), y = gy(tempAt(tt, m));
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#10b981'; ctx.stroke();

      // จุดที่สวิตช์ดีด
      const rx = gx(m.tRelease / m.span), ry = gy(state.weak ? T_BOIL : T_CURIE);
      ctx.fillStyle = '#fde047';
      ctx.beginPath(); ctx.arc(rx, ry, 4.5, 0, Math.PI * 2); ctx.fill();
      label(rx - 8, ry + 18, tr('สวิตช์ดีด', 'switch pops'), '#fde047', 10, 'right', 700);
    }

    // เคอร์เซอร์ตำแหน่งเวลาปัจจุบัน
    const cx = gx(now / m.span);
    dashLine(cx, PAD.t - 6, cx, H - PAD.b, '#475569', [3, 3]);
    ctx.fillStyle = released ? '#10b981' : '#fb923c';
    ctx.beginPath(); ctx.arc(cx, gy(temp), 3.6, 0, Math.PI * 2); ctx.fill();

    // แกนเวลา
    // ชื่อแกนอยู่มุมขวาล่าง *ในกราฟ* ไม่ใช่บนแถวตัวเลข — แถวตัวเลขมีป้ายเวลาตัวสุดท้าย
    // อยู่ที่ขอบขวาพอดี วางชื่อแกนไว้แถวเดียวกันเมื่อไหร่ก็ทับกันทันที
    label(W - PAD.r - 4, H - PAD.b - 8, tr('เวลา (นาที)', 'time (min)'), '#64748b', 10, 'right', 500);
    for (let k = 0; k <= 4; k++) {
      const secs = (m.span / 4) * k;
      label(gx(k / 4), H - 9, mmss(secs), '#64748b', 10, k === 0 ? 'left' : 'center', 500);
    }

    // แถบสถานะด้านบน: หม้อ + หลอดไฟ
    label(PAD.l, 20, tr('อุณหภูมิก้นหม้อระหว่างหุง', 'base temperature through a cook'), '#e2e8f0', 12, 'left', 700);
    const lampX = W - PAD.r - 108;
    ctx.fillStyle = released ? '#334155' : '#ef4444';
    ctx.beginPath(); ctx.arc(lampX, 16, 5, 0, Math.PI * 2); ctx.fill();
    label(lampX + 9, 20, 'COOK', released ? '#475569' : '#fca5a5', 10, 'left', 700);
    ctx.fillStyle = released ? '#10b981' : '#334155';
    ctx.beginPath(); ctx.arc(lampX, 32, 5, 0, Math.PI * 2); ctx.fill();
    label(lampX + 9, 36, 'WARM', released ? '#6ee7b7' : '#475569', 10, 'left', 700);

    // ป้ายบอกช่วงพลาโต
    if (m.t2 < m.tRelease + 1) {
      const px = gx(((m.t1 + m.t2) / 2) / m.span);
      label(px, gy(T_BOIL) + 16, tr('ช่วงน้ำเดือด — ข้าวสุกตรงนี้', 'boiling — the rice cooks here'), '#7dd3fc', 10, 'center', 600);
    }
  }

  /* ---------- readouts ---------- */
  function updateReadouts() {
    const m = model(), now = Math.min(state.t, m.span);
    const temp = tempAt(now, m), released = now >= m.tRelease;
    const left = waterLeft(Math.min(now, m.tRelease), m);

    $('rc-r1').textContent = temp.toFixed(1) + ' °C';
    $('rc-r2').textContent = released ? tr('อุ่น (WARM)', 'Warm') : tr('หุง (COOK)', 'Cook');
    $('rc-r3').textContent = Math.round(realPower()) + ' W';
    $('rc-r4').textContent = mmss(m.tRelease);

    const v = $('rc-sim-verdict');
    if (!released) {
      v.textContent = tr(
        'กำลังหุง — น้ำเหลือ ' + Math.round(left) + '% · แม่เหล็กยังดูดสวิตช์ไว้',
        'Cooking — ' + Math.round(left) + '% of the water left · the magnet still holds');
      v.style.color = '#fb923c';
    } else if (state.weak) {
      v.textContent = tr(
        '⚠️ แม่เหล็กเสื่อม: หลุดตั้งแต่น้ำยังเหลือ ' + Math.round(left) + '% → ข้าวยังดิบ น้ำยังฉ่ำ (คลินิกเคสที่ 2)',
        '⚠️ Weak magnet: released with ' + Math.round(left) + '% of the water still there → raw, wet rice (clinic case 2)');
      v.style.color = '#f59e0b';
    } else {
      v.textContent = tr(
        '✅ น้ำแห้งหมด อุณหภูมิพุ่งถึงจุดคูรี แม่เหล็กจึงปล่อยสวิตช์เข้าโหมดอุ่นเอง — ข้าวสุกพอดี',
        '✅ The water is gone, the base crossed the Curie point, and the magnet released into Warm — perfectly cooked');
      v.style.color = '#10b981';
    }
  }

  function syncLabels() {
    $('rc-cups-val').textContent = state.cups + ' ' + tr('ถ้วย', 'cups');
    $('rc-power-val').textContent = state.power + ' W';
    $('rc-volt-val').textContent = state.volt + ' V';
    const rl = isEN()
      ? ['Base temperature', 'Mode', 'Real power', 'Time to release']
      : ['อุณหภูมิก้นหม้อ', 'โหมด', 'กำลังที่ได้จริง', 'เวลาจนสวิตช์ดีด'];
    for (let i = 0; i < 4; i++) $('rc-l' + (i + 1)).textContent = rl[i];
  }

  function render() { syncLabels(); updateReadouts(); draw(); }
  function restart() { state.t = 0; state.running = true; render(); }

  /* ---------- UI ---------- */
  $('rc-mode-ok').addEventListener('click', function () {
    state.weak = false;
    this.classList.add('active'); $('rc-mode-weak').classList.remove('active');
    restart();
  });
  $('rc-mode-weak').addEventListener('click', function () {
    state.weak = true;
    this.classList.add('active'); $('rc-mode-ok').classList.remove('active');
    restart();
  });
  $('rc-cups').addEventListener('input', function () { state.cups = +this.value; restart(); });
  $('rc-power').addEventListener('input', function () { state.power = +this.value; restart(); });
  $('rc-volt').addEventListener('input', function () { state.volt = +this.value; restart(); });
  $('rc-sim-start').addEventListener('click', restart);
  document.addEventListener('langchange', render);   // ลาเบลบน canvas เป็น text ต้องวาดใหม่

  let raf = null, last = null;
  function frame(now) {
    if (last === null) last = now;
    const dt = (now - last) / 1000; last = now;
    if (state.running && !document.hidden) {
      const m = model();
      state.t += dt * (m.span / WALL_SECS);            // เร่งเวลาให้กราฟเดินจบใน ~16 วินาที
      if (state.t >= m.span) { state.t = m.span; state.running = false; }
      render();
    }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    last = null;
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(frame);
  });

  render();
  raf = requestAnimationFrame(frame);
})();
