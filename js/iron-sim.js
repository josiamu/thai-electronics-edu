/* iron-sim.js — Interactive thermostat-cycling sim (iron.html, #ir-canvas ใน .sim-wrap#iron-sim)
 *
 * แก่นของบทเตารีด: เทอร์โมสตัทไบเมทัลไม่ได้ "รักษาอุณหภูมิให้นิ่ง" แต่มัน **แกว่งขึ้น-ลงรอบจุดตั้ง**
 * ตลอดเวลา เพราะเป็นสวิตช์ on/off ที่มีช่วงฮิสเทอรีซิส ไม่ใช่ตัวควบคุมแบบต่อเนื่อง
 * → หลอดนีออนที่ติด-ดับเป็นจังหวะจึงเป็น **อาการปกติ** ไม่ใช่ของเสีย (ลูกค้าแจ้งผิดบ่อยมาก)
 *
 * โมเดลความร้อน: C·dT/dt = P·(หน้าสัมผัสต่อ ? 1 : 0) − k·(T − Tamb)
 *   C = HEAT_CAP 1200 J/K (หน้าเตาอะลูมิเนียม + ตัวเรือน) · k = LOSS 3 W/K
 *   → ค่าคงตัวเวลา C/k ≈ 400 s และเพดานอุณหภูมิถ้าหน้าสัมผัสไม่ยอมตัด = Tamb + P/k
 *     (ที่ 1000W ได้ราว 363°C ซึ่ง **สูงกว่าพิกัดเทอร์โมฟิวส์ 250°C** — เคสละลายติดตายจึงจบที่ฟิวส์ขาดจริง)
 *   ตัวเลขชุดนี้ทำให้เวลาไต่จาก 30°C ถึง 180°C ≈ 4 นาที และรอบตัดต่อ ≈ 45 วินาที ตรงกับของจริง
 *
 * **กำลังฮีตเตอร์ผูกกับความต้านทานด้วย R = V²/P** เพื่อให้สไลเดอร์กำลังไฟโยงเข้ากับ
 * ค่ามาตรฐาน 40–80 Ω ในตารางวัดค่าของหน้านี้โดยตรง — อย่าแยกสองค่านี้ออกจากกัน
 *
 * โหมด welded = หน้าสัมผัสละลายติดตาย: ไม่มีวันตัด อุณหภูมิไต่จนถึง FUSE_T แล้ว
 * **เทอร์โมฟิวส์ขาดถาวรต่อหน้า** (กดเริ่มใหม่ไม่ขึ้นจนกว่าจะสลับกลับโหมดปกติ) เหมือนของจริง
 * ลาเบลบน canvas เป็น text จึงต้องดัก langchange ที่ document แล้ววาดใหม่
 */
(function () {
  const cv = document.getElementById('ir-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = 520, H = 300;

  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  const T_AMB = 30, HEAT_CAP = 1200, LOSS = 3;   // °C, J/K, W/K
  const HYST = 6;                                // ครึ่งความกว้างของช่วงฮิสเทอรีซิส (±6°C)
  const FUSE_T = 250;                            // พิกัดเทอร์โมฟิวส์
  const SIM_SPEED = 8;                           // เท่าของเวลาจริง
  const WINDOW = 240;                            // วินาทีจำลองที่แสดงบนกราฟ
  const T_MAX = 280;                             // เพดานแกน Y

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const $ = id => document.getElementById(id);
  const setSl = $('ir-set'), powSl = $('ir-power');
  const mOK = $('ir-mode-ok'), mWeld = $('ir-mode-weld');

  let welded = false, blown = false;
  let temp = T_AMB, closed = true, simT = 0, last = performance.now();
  let hist = [];              // [tสะสม, อุณหภูมิ, หน้าสัมผัสต่อ?]
  let onTime = 0, totalTime = 0;

  const setPoint = () => +setSl.value;
  const power = () => +powSl.value;
  const heaterR = () => 220 * 220 / power();
  // ไฟถึงฮีตเตอร์จริงหรือไม่ — ฟิวส์ขาดแล้วจบเลย
  const heating = () => !blown && closed;

  /* ---------- ชื่อผ้าตามอุณหภูมิ (สเกลจุดบนปุ่มหมุนเตารีด) ---------- */
  function fabric(T) {
    if (T < 105) return [t('ใยสังเคราะห์ / ไนลอน', 'synthetics / nylon'), '•'];
    if (T < 145) return [t('ไหม / ขนสัตว์', 'silk / wool'), '••'];
    if (T < 185) return [t('ฝ้าย', 'cotton'), '•••'];
    return [t('ลินิน', 'linen'), '•••'];
  }

  /* ---------- drawing helpers ---------- */
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'left'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  /* ---------- กราฟ ---------- */
  const PL = 44, PR = 14, PT = 44, PB = 30;      // ขอบกราฟ
  const gx = v => PL + (v / WINDOW) * (W - PL - PR);
  const gy = T => H - PB - ((T - T_AMB) / (T_MAX - T_AMB)) * (H - PT - PB);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const sp = setPoint(), t0 = Math.max(0, simT - WINDOW);

    // แถบหัว: สถานะหน้าสัมผัส + หลอดนีออน
    const on = heating();
    ctx.fillStyle = on ? 'rgba(239,68,68,.10)' : 'rgba(37,99,235,.08)';
    ctx.strokeStyle = on ? RED : BLUE; ctx.lineWidth = 1.3;
    rrect(10, 8, W - 20, 26, 7); ctx.fill(); ctx.stroke();
    label(20, 25, blown ? t('⛔ เทอร์โมฟิวส์ขาดถาวร — ตัดไฟทั้งวงจร', '⛔ Thermal fuse blown for good — circuit dead')
                        : on ? t('🔴 หน้าสัมผัสต่อ — ฮีตเตอร์กำลังทำงาน', '🔴 Contacts closed — element heating')
                             : t('⚪ หน้าสัมผัสตัด — รอให้เย็นลง', '⚪ Contacts open — cooling down'),
          blown ? VIOLET : on ? RED : BLUE, 11.5, 'left', 700);
    // หลอดนีออนมุมขวาของแถบ
    const lampOn = on;
    ctx.fillStyle = lampOn ? ORANGE : css('--border');
    ctx.beginPath(); ctx.arc(W - 30, 21, 7, 0, 7); ctx.fill();
    if (lampOn) {
      ctx.save(); ctx.globalAlpha = .3; ctx.beginPath(); ctx.arc(W - 30, 21, 12, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = css('--text-light'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(W - 30, 21, 7, 0, 7); ctx.stroke();

    // แกนและเส้นตาราง
    ctx.strokeStyle = css('--border'); ctx.lineWidth = 1;
    for (let T = 50; T <= T_MAX; T += 50) {
      ctx.beginPath(); ctx.moveTo(PL, gy(T)); ctx.lineTo(W - PR, gy(T)); ctx.stroke();
      label(PL - 6, gy(T) + 4, T + '°', css('--text-light'), 9.5, 'right', 600);
    }
    ctx.strokeStyle = css('--text-light'); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(PL, PT - 6); ctx.lineTo(PL, H - PB); ctx.lineTo(W - PR, H - PB); ctx.stroke();
    label(W - PR, H - PB + 18, t('เวลา (จำลอง)', 'time (simulated)'), css('--text-light'), 9.5, 'right', 600);

    // แถบพิกัดเทอร์โมฟิวส์
    ctx.save(); ctx.setLineDash([5, 4]);
    ctx.strokeStyle = VIOLET; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(PL, gy(FUSE_T)); ctx.lineTo(W - PR, gy(FUSE_T)); ctx.stroke();
    ctx.restore();
    label(W - PR - 2, gy(FUSE_T) - 5, t('เทอร์โมฟิวส์ 250°C', 'thermal fuse 250°C'), VIOLET, 9.5, 'right', 700);

    // แถบฮิสเทอรีซิสรอบจุดตั้ง — หัวใจของบทนี้
    ctx.fillStyle = 'rgba(16,185,129,.13)';
    ctx.fillRect(PL, gy(sp + HYST), W - PL - PR, gy(sp - HYST) - gy(sp + HYST));
    ctx.save(); ctx.setLineDash([4, 3]);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(PL, gy(sp)); ctx.lineTo(W - PR, gy(sp)); ctx.stroke();
    ctx.restore();
    label(PL + 6, gy(sp) - 6, t('จุดตั้ง ', 'set point ') + sp + '°C', GREEN, 10, 'left', 700);

    // เส้นอุณหภูมิ — ช่วงที่ฮีตเตอร์ทำงานเป็นสีแดง ช่วงที่ตัดเป็นสีน้ำเงิน
    for (let i = 1; i < hist.length; i++) {
      const a = hist[i - 1], b = hist[i];
      if (b[0] < t0) continue;
      ctx.strokeStyle = b[2] ? RED : BLUE; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx(a[0] - t0), gy(a[1]));
      ctx.lineTo(gx(b[0] - t0), gy(b[1]));
      ctx.stroke();
    }
    // จุดปัจจุบัน
    if (hist.length) {
      const p = hist[hist.length - 1];
      ctx.fillStyle = p[2] ? RED : BLUE;
      ctx.beginPath(); ctx.arc(gx(Math.min(WINDOW, p[0] - t0)), gy(p[1]), 4, 0, 7); ctx.fill();
    }
  }

  /* ---------- clock ---------- */
  function stepPhysics(dt) {
    if (blown) { closed = false; }
    else if (welded) { closed = true; }                       // ละลายติดตาย: ไม่มีวันตัด
    else if (closed && temp > setPoint() + HYST) closed = false;
    else if (!closed && temp < setPoint() - HYST) closed = true;

    const p = (closed && !blown) ? power() : 0;
    temp += ((p - LOSS * (temp - T_AMB)) / HEAT_CAP) * dt;
    if (temp < T_AMB) temp = T_AMB;

    if (!blown && temp >= FUSE_T) { blown = true; closed = false; }

    totalTime += dt;
    if (closed && !blown) onTime += dt;
    simT += dt;
    hist.push([simT, temp, closed && !blown]);
    while (hist.length > 4000) hist.shift();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * SIM_SPEED;
    last = now;
    stepPhysics(dt);
    if (!document.hidden) { draw(); readout(); }
    requestAnimationFrame(frame);
  }

  /* ---------- แผงอ่านค่า ---------- */
  const L = [$('ir-l1'), $('ir-l2'), $('ir-l3'), $('ir-l4')];
  const R = [$('ir-r1'), $('ir-r2'), $('ir-r3'), $('ir-r4')];
  const verdict = $('ir-verdict');

  function readout() {
    const [fab, dots] = fabric(setPoint());
    const duty = totalTime > 2 ? Math.round(100 * onTime / totalTime) : 0;
    L[0].textContent = t('อุณหภูมิหน้าเตา', 'soleplate temp');
    R[0].textContent = Math.round(temp) + ' °C';
    L[1].textContent = t('หน้าสัมผัส / หลอดนีออน', 'contacts / neon lamp');
    R[1].textContent = blown ? t('ตัดถาวร', 'dead') : heating() ? t('ต่อ · ติด', 'closed · lit') : t('ตัด · ดับ', 'open · dark');
    L[2].textContent = t('ความต้านทานฮีตเตอร์', 'element resistance');
    R[2].textContent = heaterR().toFixed(1) + ' Ω';
    L[3].textContent = t('ฮีตเตอร์ทำงานคิดเป็น', 'element duty cycle');
    R[3].textContent = duty + ' %';

    let v, c;   // c = สีข้อความ — ชุด .sim-verdict ไม่มีคลาสสี หน้าอื่นก็ใช้ style.color เหมือนกัน
    if (blown) {
      v = t('⛔ อุณหภูมิทะลุ 250°C เทอร์โมฟิวส์จึงหลอมตัวเองขาด — ตัดไฟถาวร ต้องเปลี่ยนตัวใหม่ ห้ามต่อตรง',
            '⛔ The temperature passed 250°C, so the thermal fuse melted itself open. It is dead for good — fit a new one, never bridge it');
      c = '#7c3aed';
    } else if (welded) {
      v = t('⚠️ หน้าสัมผัสละลายติดตาย → ไฟจ่ายตลอด อุณหภูมิไต่ขึ้นเรื่อยๆ ไม่มีวันตัด รอดูว่าจะจบที่ไหน',
            '⚠️ The contacts are welded shut → power never stops and the temperature just keeps climbing. Watch where this ends');
      c = '#d97706';
    } else {
      v = t('✅ ปกติ — เทอร์โมสตัทตัด-ต่อสลับไปมารอบจุดตั้ง ' + setPoint() + '°C (ผ้า' + fab + ' ' + dots + ') '
            + 'หลอดนีออนจึงกระพริบเป็นจังหวะ นี่คืออาการปกติ ไม่ใช่ของเสีย',
            '✅ Healthy — the thermostat cycles around the ' + setPoint() + '°C set point (' + fab + ' ' + dots + '), '
            + 'so the neon lamp blinks in step. That is normal behaviour, not a fault');
      c = '#059669';
    }
    verdict.textContent = v;
    verdict.style.color = c;
  }

  /* ---------- UI ---------- */
  function restart() {
    temp = T_AMB; closed = true; blown = false; simT = 0;
    hist = []; onTime = 0; totalTime = 0;
  }
  function setMode(w) {
    welded = w;
    mOK.classList.toggle('active', !w);
    mWeld.classList.toggle('active', w);
    restart();
  }

  setSl.addEventListener('input', () => {
    $('ir-set-val').textContent = setSl.value + ' °C';
    onTime = 0; totalTime = 0;                 // duty ต้องนับใหม่เมื่อเปลี่ยนจุดตั้ง
  });
  powSl.addEventListener('input', () => {
    $('ir-power-val').textContent = powSl.value + ' W';
    onTime = 0; totalTime = 0;
  });
  mOK.addEventListener('click', () => setMode(false));
  mWeld.addEventListener('click', () => setMode(true));
  $('ir-restart').addEventListener('click', restart);
  document.addEventListener('langchange', () => { draw(); readout(); });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  $('ir-set-val').textContent = setSl.value + ' °C';
  $('ir-power-val').textContent = powSl.value + ' W';
  requestAnimationFrame(frame);
})();
