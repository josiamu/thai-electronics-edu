/* inverter-appliances-sim.js — เทียบแอร์ระบบธรรมดากับระบบอินเวอร์เตอร์ (inverter-appliances.html)
 * canvas #ia-canvas ใน .sim-wrap#inverter-appliances-sim (ใช้ชุด .sim-* กลางใน style.css)
 *
 * แก่นของบท (มุมผู้ใช้ ไม่ใช่มุมช่าง): เครื่องธรรมดาคุมอุณหภูมิด้วยการ **ตัด-ต่อคอมเพรสเซอร์**
 * ส่วนอินเวอร์เตอร์ **หรี่ความเร็วให้เดินต่อเนื่อง** → อุณหภูมิแกว่งน้อยกว่า และกินไฟน้อยกว่า
 *
 * **สิ่งที่ซิมนี้ตั้งใจสอนและห้ามทำให้หาย: อินเวอร์เตอร์ไม่ได้ประหยัดทุกกรณี**
 * ถ้าลากอุณหภูมินอกบ้านขึ้นสูงและห้องใหญ่จนภาระความร้อนใกล้พิกัดเครื่อง คอมเพรสเซอร์
 * ต้องวิ่งเต็มกำลังทั้งสองระบบ ตัวเลขประหยัดจะยุบลงเหลือไม่กี่เปอร์เซ็นต์เอง
 * ถ้าแก้โมเดลจนอินเวอร์เตอร์ชนะทุกกรณี หัวข้อ "คุ้มไหม" ในหน้านี้จะเสียไปครึ่งหนึ่ง
 *
 * โมเดลความร้อนของห้อง (ก้อนเดียว):
 *   C·dT/dt = k·(T_out − T) − Q_cool
 *   C = ขนาดห้อง × C_PER_M2 (J/K) · k = ขนาดห้อง × K_PER_M2 (W/K)
 *   Q_cool = ความเย็นที่ปล่อยจริง (W)
 *
 * ธรรมดา   : สวิตช์ on/off ฮิสเทอรีซิส ±HYST รอบจุดตั้ง · ตอน on ปล่อยเต็มพิกัด
 *            ไฟที่กิน = พิกัด ÷ EER_NOM + พีคตอนสตาร์ทช่วง SURGE_S วินาทีแรกของทุกครั้งที่ต่อ
 * อินเวอร์เตอร์: หรี่กำลังตามส่วนต่างอุณหภูมิ clamp ไว้ที่ 0..1 ของพิกัด (ต่ำกว่า CAP_MIN ถือว่าหยุดชั่วคราว)
 *            ไฟที่กิน = ความเย็น ÷ EER(x) โดย EER ดีขึ้นเมื่อโหลดเบา (PART_GAIN)
 *            ซึ่งเป็นเหตุผลจริงที่มันประหยัด — อัตราส่วนอัดต่ำลงและการสูญเสียน้อยลงตอนเดินช้า
 *
 * ป้ายบนแคนวาสเป็น text จึงดัก langchange ที่ document แล้ววาดใหม่ (nav.js ไม่ bubble)
 */
(function () {
  const cv = document.getElementById('ia-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = 560, H = 330;

  const ORANGE = '#f59e0b', GREEN = '#10b981', BLUE = '#2563eb';

  /* ---------- ค่าคงที่ของโมเดล ---------- */
  const C_PER_M2 = 42000;      // J/K ต่อตารางเมตร (อากาศ + เฟอร์นิเจอร์ + ผนัง)
  const K_PER_M2 = 9;          // W/K ต่อตารางเมตร (ความร้อนไหลเข้าห้อง)
  const BTU_PER_M2 = 700;      // พิกัดเครื่องที่เลือกให้เหมาะกับห้อง (BTU/hr ต่อ ตร.ม.)
  const W_PER_BTU = 0.293;     // BTU/hr → วัตต์ความเย็น
  const HYST = 1.0;            // ฮิสเทอรีซิสของเทอร์โมสตัทเครื่องธรรมดา (±°C)
  const EER_NOM = 3.2;         // ความเย็นที่ได้ต่อไฟฟ้า 1 วัตต์ ตอนเดินเต็มพิกัด
  const PART_GAIN = 0.75;      // EER ดีขึ้นได้สูงสุดเท่านี้เมื่อโหลดเบาสุด
  const CAP_MIN = 0.18;        // อินเวอร์เตอร์หรี่ลงต่ำสุดได้เท่านี้ของพิกัด
  const SURGE_X = 3.2;         // กระแสพีคตอนคอมเพรสเซอร์สตาร์ท (เท่าของกระแสเดิน)
  const SURGE_S = 2.0;         // พีคนานเท่าไร (วินาทีจำลอง)
  const WINDOW = 3600;         // วินาทีจำลองที่แสดงบนกราฟ = 60 นาที
  const SIM_SPEED = 150;       // เท่าของเวลาจริง

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const $ = id => document.getElementById(id);
  const setSl = $('ia-set'), outSl = $('ia-out'), areaSl = $('ia-area');

  /* ---------- สถานะ ---------- */
  let simT = 0, last = performance.now();
  let fx = null, iv = null;    // สถานะของสองระบบ
  let hist = [];               // [t, T_fixed, T_inv, P_fixed, P_inv]

  const setPoint = () => +setSl.value;
  const outTemp = () => +outSl.value;
  const area = () => +areaSl.value;

  const heatCap = () => area() * C_PER_M2;
  const lossK = () => area() * K_PER_M2;
  const ratedCool = () => area() * BTU_PER_M2 * W_PER_BTU;   // วัตต์ความเย็นเต็มพิกัด

  function reset() {
    simT = 0; hist = [];
    fx = { T: outTemp() - 1, on: true, since: 0, kwh: 0, swing: [] };
    iv = { T: outTemp() - 1, cap: 1, kwh: 0, swing: [] };
  }

  /* ---------- ฟิสิกส์ ---------- */
  // EER ดีขึ้นเมื่อเดินเบา — เหตุผลจริงที่อินเวอร์เตอร์ประหยัด
  const eerAt = x => EER_NOM * (1 + PART_GAIN * (1 - Math.max(x, CAP_MIN)));

  function step(dt) {
    const Tset = setPoint(), Tout = outTemp();
    const C = heatCap(), k = lossK(), Pc = ratedCool();

    /* ── เครื่องธรรมดา: ตัด-ต่อรอบจุดตั้ง ── */
    if (fx.on && fx.T < Tset - HYST) { fx.on = false; fx.since = 0; }
    else if (!fx.on && fx.T > Tset + HYST) { fx.on = true; fx.since = 0; }
    fx.since += dt;
    const qFx = fx.on ? Pc : 0;
    let pFx = fx.on ? Pc / EER_NOM : 0;
    if (fx.on && fx.since < SURGE_S) pFx *= SURGE_X;          // พีคตอนสตาร์ท
    fx.T += dt * (k * (Tout - fx.T) - qFx) / C;

    /* ── อินเวอร์เตอร์: หรี่กำลังตามส่วนต่าง ── */
    const err = iv.T - Tset;
    const steady = Math.max(0, k * (Tout - Tset)) / Pc;        // สัดส่วนที่พอดีกับความร้อนที่ไหลเข้า
    let cap = steady + err * 0.9;
    cap = Math.max(0, Math.min(1, cap));
    iv.cap = cap;
    const qIv = cap * Pc;
    const pIv = cap > 0 ? qIv / eerAt(cap) : 0;
    iv.T += dt * (k * (Tout - iv.T) - qIv) / C;

    fx.kwh += pFx * dt / 3600000;
    iv.kwh += pIv * dt / 3600000;
    // เก็บอุณหภูมิไว้วัดช่วงแกว่ง เฉพาะหลังจากเย็นถึงจุดตั้งแล้ว
    if (simT > 900) { fx.swing.push(fx.T); iv.swing.push(iv.T); }
    while (fx.swing.length > 3000) fx.swing.shift();
    while (iv.swing.length > 3000) iv.swing.shift();

    simT += dt;
    hist.push([simT, fx.T, iv.T, pFx, pIv]);
    while (hist.length && hist[0][0] < simT - WINDOW) hist.shift();
    while (hist.length > 6000) hist.shift();
  }

  /* ---------- ตัวช่วยวาด ---------- */
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'left';
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.textAlign = 'left';
  }
  function line(pts, color, width, dash) {
    if (pts.length < 2) return;
    ctx.save();
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = color; ctx.lineWidth = width || 2;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- วาด ---------- */
  const PX0 = 52, PX1 = 546;
  const TY0 = 36, TY1 = 168;     // กราฟอุณหภูมิ
  const PY0 = 214, PY1 = 298;    // กราฟกำลังไฟ

  function draw() {
    const grid = 'rgba(148,163,184,.22)', txt = '#cbd5e1', dim = '#94a3b8';
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);

    const Tset = setPoint(), Tout = outTemp();
    const tHi = Tout + 1.5, tLo = Math.min(Tset, 20) - 1.5;
    const pMax = Math.max(600, ratedCool() / EER_NOM * SURGE_X * 1.1);

    const tx = s => PX0 + (PX1 - PX0) * (1 - (simT - s) / WINDOW);
    const ty = T => TY1 - (TY1 - TY0) * (T - tLo) / (tHi - tLo);
    const py = P => PY1 - (PY1 - PY0) * Math.min(1, P / pMax);

    /* หัวกราฟบน + คำอธิบายสี */
    label(PX0 - 6, 20, t('อุณหภูมิห้อง (°C)', 'Room temperature (°C)'), txt, 11.5);
    ctx.fillStyle = ORANGE; ctx.fillRect(PX1 - 176, 13, 14, 3);
    label(PX1 - 156, 20, t('ธรรมดา', 'Fixed speed'), ORANGE, 11);
    ctx.fillStyle = GREEN; ctx.fillRect(PX1 - 92, 13, 14, 3);
    label(PX1 - 72, 20, t('อินเวอร์เตอร์', 'Inverter'), GREEN, 11);

    /* กรอบและเส้นกริดของกราฟอุณหภูมิ */
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    ctx.strokeRect(PX0, TY0, PX1 - PX0, TY1 - TY0);
    [tLo, Tset, Tout].forEach(v => {
      const y = ty(v);
      if (y < TY0 || y > TY1) return;
      line([[PX0, y], [PX1, y]], grid, 1);
      label(PX0 - 7, y + 3.5, Math.round(v) + '°', dim, 10, 'right', 500);
    });
    line([[PX0, ty(Tset)], [PX1, ty(Tset)]], BLUE, 1.4, [5, 4]);
    label(PX0 + 7, ty(Tset) - 6, t('อุณหภูมิที่ตั้ง', 'set point'), BLUE, 10.5);

    /* เส้นอุณหภูมิสองระบบ */
    line(hist.map(h => [tx(h[0]), ty(h[1])]), ORANGE, 2);
    line(hist.map(h => [tx(h[0]), ty(h[2])]), GREEN, 2);

    /* แกนเวลา */
    for (let m = 0; m <= 60; m += 15) {
      const s = simT - WINDOW + m * 60;
      if (s < 0) continue;
      label(tx(s), 186, m === 60 ? t('ตอนนี้', 'now') : Math.round(m) + '', dim, 10, 'center', 500);
    }
    label(PX0 - 6, 200, t('กำลังไฟที่เครื่องกิน (W)', 'Electrical power drawn (W)'), txt, 11.5);

    /* กราฟกำลังไฟ */
    ctx.strokeStyle = grid;
    ctx.strokeRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
    label(PX0 - 7, PY0 + 4, Math.round(pMax) + '', dim, 10, 'right', 500);
    label(PX0 - 7, PY1 + 3, '0', dim, 10, 'right', 500);
    line(hist.map(h => [tx(h[0]), py(h[3])]), ORANGE, 1.8);
    line(hist.map(h => [tx(h[0]), py(h[4])]), GREEN, 1.8);

    /* สถานะปัจจุบันของแต่ละระบบ มุมขวาบนของกราฟกำลังไฟ */
    const sFx = fx.on ? t('คอมเพรสเซอร์ทำงาน', 'compressor running') : t('คอมเพรสเซอร์หยุด', 'compressor off');
    label(PX1 - 6, PY0 + 15, sFx, ORANGE, 10.5, 'right');
    label(PX1 - 6, PY0 + 30, t('เดินที่ ', 'running at ') + Math.round(iv.cap * 100) + '%', GREEN, 10.5, 'right');
  }

  /* ---------- แผงอ่านค่า ---------- */
  const L = [$('ia-l1'), $('ia-l2'), $('ia-l3'), $('ia-l4')];
  const R = [$('ia-r1'), $('ia-r2'), $('ia-r3'), $('ia-r4')];
  const verdict = $('ia-verdict');

  const spread = a => (a.length < 20 ? 0 : (Math.max.apply(null, a) - Math.min.apply(null, a)) / 2);

  function readout() {
    const hours = simT / 3600;
    const save = fx.kwh > 0.001 ? Math.round(100 * (1 - iv.kwh / fx.kwh)) : 0;
    // ภาระความร้อนเทียบพิกัดเครื่อง — ตัวเลขที่อธิบายว่าทำไมบางกรณีถึงไม่ประหยัด
    const load = Math.max(0, lossK() * (outTemp() - setPoint())) / ratedCool();

    L[0].textContent = t('ไฟที่ใช้ · ธรรมดา', 'Energy · fixed speed');
    R[0].textContent = fx.kwh.toFixed(2) + ' kWh';
    L[1].textContent = t('ไฟที่ใช้ · อินเวอร์เตอร์', 'Energy · inverter');
    R[1].textContent = iv.kwh.toFixed(2) + ' kWh';
    L[2].textContent = t('อินเวอร์เตอร์ประหยัดกว่า', 'Inverter saves');
    R[2].textContent = save + ' %';
    L[3].textContent = t('อุณหภูมิแกว่ง ธรรมดา / อินฯ', 'Swing, fixed / inverter');
    R[3].textContent = '±' + spread(fx.swing).toFixed(1) + ' / ±' + spread(iv.swing).toFixed(1) + '°';

    let v, c;
    if (hours < 0.25) {
      v = t('⏳ ช่วงแรกทั้งสองเครื่องเดินเต็มกำลังเหมือนกัน เพราะยังต้องดึงอุณหภูมิห้องลงมาให้ถึงจุดตั้งก่อน',
            '⏳ At first both machines run flat out — the room still has to be pulled down to the set point.');
      c = '#94a3b8';
    } else if (load > 0.85) {
      v = t('⚠️ ห้องใหญ่เกินเครื่องหรืออากาศร้อนจัด ความร้อนไหลเข้าเกือบเท่าพิกัดเครื่อง คอมเพรสเซอร์จึงต้องวิ่งเต็มกำลังทั้งสองระบบ '
            + 'อินเวอร์เตอร์เหลือประหยัดแค่ ' + save + '% — นี่คือกรณีที่จ่ายแพงกว่าแล้วไม่คุ้ม เลือกขนาดเครื่องให้พอดีห้องสำคัญกว่า',
            '⚠️ The room is too big for the unit, or it is simply too hot: the heat coming in nearly matches the rated capacity, so both compressors run flat out. '
            + 'The inverter saves only ' + save + '% here — the case where paying more does not pay back. Sizing the unit to the room matters more.');
      c = '#d97706';
    } else if (load < 0.3) {
      v = t('✅ ภาระเบา อินเวอร์เตอร์หรี่ลงเหลือ ' + Math.round(iv.cap * 100) + '% แล้วเดินนิ่ง ๆ ประหยัดกว่า ' + save + '% '
            + 'ส่วนเครื่องธรรมดายังตัด-ต่อเต็มกำลังอยู่ดี จึงเห็นอุณหภูมิแกว่งและมีพีคตอนสตาร์ททุกรอบ',
            '✅ Light load: the inverter throttles down to ' + Math.round(iv.cap * 100) + '% and holds there, saving ' + save + '%. '
            + 'The fixed-speed unit still switches full-power on and off, so the temperature swings and every restart draws a surge.');
      c = '#059669';
    } else {
      v = t('✅ ภาระปานกลาง อินเวอร์เตอร์ประหยัดกว่า ' + save + '% และอุณหภูมิแกว่งน้อยกว่าชัดเจน '
            + 'ลองลากอุณหภูมิภายนอกขึ้นหรือขยายห้องให้ใหญ่ขึ้น จะเห็นตัวเลขประหยัดยุบลงเรื่อย ๆ',
            '✅ Moderate load: the inverter saves ' + save + '% and holds the temperature far more steadily. '
            + 'Drag the outdoor temperature up, or enlarge the room, and watch the saving shrink.');
      c = '#059669';
    }
    verdict.textContent = v;
    verdict.style.color = c;
  }

  /* ---------- ลูปเวลา ---------- */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * SIM_SPEED;
    last = now;
    step(dt);
    if (!document.hidden) { draw(); readout(); }
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  function syncLabels() {
    $('ia-set-val').textContent = setSl.value + ' °C';
    $('ia-out-val').textContent = outSl.value + ' °C';
    $('ia-area-val').textContent = areaSl.value + t(' ตร.ม.', ' m²');
  }
  [setSl, outSl, areaSl].forEach(sl => sl.addEventListener('input', () => { syncLabels(); reset(); }));
  $('ia-restart').addEventListener('click', reset);
  document.addEventListener('langchange', () => { syncLabels(); draw(); readout(); });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  syncLabels();
  reset();
  requestAnimationFrame(frame);
})();
