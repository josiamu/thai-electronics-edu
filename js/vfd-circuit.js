/* vfd-circuit.js — Interactive step-by-step **วงจรอินเวอร์เตอร์คุมมอเตอร์ (VFD)**
 * (inverter.html, canvas #vfd-canvas ใน wrap #vfd-circuit)
 *
 * ใช้ CSS ชุด .bs-* ร่วมกับซิมทีละขั้นหน้าอื่น และ query .bs-tab/.bs-desc **เฉพาะใน wrap ตัวเอง**
 *
 * เส้นทางกำลัง: L → ฟิวส์ → NTC จำกัดกระแสตอนเสียบปลั๊ก → บริดจ์ไดโอด → บัส DC 310V
 *   (คาปาซิเตอร์คร่อมบัส) → ครึ่งสะพาน 3 ชุด (IGBT 6 ตัว + ไดโอดฟรีวีล) → U V W → มอเตอร์ 3 เฟส
 * เส้นทางควบคุม (เส้นประม่วง): แยกไฟจากบัสไปภาคจ่ายไฟเล็ก → 15V/5V → MCU → ไดรเวอร์เกต → ขาเกต
 *
 * 3 อย่างที่ฉากนี้ตั้งใจสอนและห้ามทำให้ผิด:
 *   (1) **มอเตอร์ไม่มีสายนิวทรัล** รับไฟจาก U V W สามเส้นเท่านั้น — ห้ามลากลงราง N หรือราง DC−
 *   (2) **กราวด์ของภาคควบคุมคือ DC− ไม่ใช่กราวด์บ้าน** จึงวาดสัญลักษณ์กราวด์ไว้บนราง DC−
 *       เท่านั้น และเส้นควบคุมทุกเส้นเป็นเส้นประ (ตัดผ่านรางไฟได้ ไม่ใช่จุดต่อ)
 *   (3) **หยุดเครื่องแล้วบัสยังมีไฟ** — กดปุ่มหยุดแล้ว TP2 ต้องยังขึ้น 310V อยู่
 *       ถ้าทำให้ TP2 เป็น 0V ตอนกดหยุด บทเรียนความปลอดภัยของทั้งหน้าจะพังทันที
 *
 * 8 ขั้น: 1 ไฟเข้า/ฟิวส์/NTC → 2 บริดจ์เรียงกระแส → 3 คาปาซิเตอร์บัส 310V
 *        → 4 ไฟเลี้ยงภาคต่ำ + MCU + ไดรเวอร์ → 5 ครึ่งสะพาน 1 เฟส + dead time
 *        → 6 สามเฟสต่างกัน 120° = สนามหมุน → 7 V/f → 8 ไล่วัด TP1–TP5 + ไดโอดฟรีวีล
 * อาการเสีย 7 แบบ (ok/fuse/ntc/cap/smps/gate/igbt) ตรงกับตารางวัดค่าในหน้าเดียวกัน
 * จุดที่วิ่ง = กระแสสมมติ (+ → −)
 */
(function () {
  const root = document.getElementById('vfd-circuit');
  const cv = document.getElementById('vfd-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 430;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- พิกัดฉาก ---------- */
  const RP = 115, RN = 295;              // รางบัส DC+ / DC−
  const L_Y = 180, N_Y = 230;            // สาย L / N ของไฟบ้าน
  const XT = 48, CORNER = 412;
  const FUSE = [100, 160], NTC = [195, 255];
  const BR = { x0: 290, x1: 390, y0: 158, y1: 252 };
  const CAP_X = 470, CAP_T = 196, CAP_B = 208;
  const LEGS = [580, 665, 750];
  const UP_Y = 150, LO_Y = 258, MID_Y = 205, DEV_H = 40, DEV_W = 44;
  const PHASE_Y = [380, 360, 340];       // เส้นออกของแต่ละเฟส (ซ้ายสุดใช้เส้นล่างสุด จึงไม่ตัดกัน)
  const MOT = { x: 862, y: 360, r: 30 }, MOT_IN = 830;
  const COR_Y = 318;                     // ทางเดินสายควบคุม
  const BOX = { smps: [60, 190], mcu: [205, 330], drv: [345, 470], y0: 330, y1: 392 };

  /* ---------- อาการเสีย ---------- */
  const FAULTS = {
    ok: { th: 'วงจรปกติ — บัส 310V ครบ ไดรเวอร์ขับเกต และมอเตอร์หมุนตามความถี่ที่สั่ง',
          en: 'Healthy — the bus sits at 310 V, the drivers switch, and the motor turns at the commanded frequency' },
    fuse: { mains: false,
          th: 'ฟิวส์ขาด → ไม่มีไฟเข้าเลย ทุกจุดวัดเป็นศูนย์ · <b>อย่าเปลี่ยนฟิวส์แล้วจบ</b> ฟิวส์ไม่เคยขาดเอง ต้องหาว่าอะไรทำให้มันขาด',
          en: 'The fuse is open → nothing gets in and every point reads zero. <b>Do not just replace it</b> — a fuse never blows on its own' },
    ntc: { bus: 0,
          th: 'NTC จำกัดกระแสขาด → ไฟบ้านมาถึงแต่บัส DC ไม่ขึ้นเลย · เป็นเคสยอดฮิตของอาการ "เปิดไม่ติดแต่ฟิวส์ยังดี"',
          en: 'The inrush limiter is open → mains reaches the board but the DC bus never rises. The classic "dead but the fuse is fine" case' },
    cap: { bus: 190, rough: true,
          th: 'คาปาซิเตอร์บัสเสื่อม → บัสตกและมีริปเปิลสูง มอเตอร์เดินกระตุกและอินเวอร์เตอร์แจ้งแรงดันต่ำเป็นช่วง ๆ',
          en: 'The bus capacitor is tired → the bus sags and ripples, the motor runs rough, and the drive reports undervoltage intermittently' },
    smps: { supply: false,
          th: 'ภาคจ่ายไฟบนบอร์ดเสีย → <b>บัสยังมี 310V เต็ม แต่ไม่มี 15V ขับเกต</b> เครื่องจึงเงียบสนิททั้งที่อันตรายเต็มที่',
          en: 'The on-board supply has failed → <b>the bus still holds 310 V but there is no 15 V for the gates</b>, so the machine sits silent while fully live' },
    gate: { deadLeg: 1,
          th: 'ขับเกตหายไปหนึ่งเฟส → เหลือไฟออกแค่ 2 เฟส มอเตอร์ครางและสั่นแต่ไม่หมุน · วัดขดมอเตอร์จะปกติทั้ง 3 คู่ ปัญหาอยู่ที่บอร์ด',
          en: 'One phase has lost its gate drive → only two phases come out, so the motor hums and shakes without turning. All three windings measure fine; the fault is on the board' },
    igbt: { mains: false, shorted: true,
          th: 'IGBT ช็อต → คู่บน-ล่างนำพร้อมกัน ลัดบัสผ่านตัวมันเอง (shoot-through) ฟิวส์จึงขาดทันที · <b>ต้องหาว่าอะไรฆ่ามันก่อนใส่ตัวใหม่</b>',
          en: 'A shorted IGBT → the pair conducts together and shorts the bus through itself, so the fuse goes at once. <b>Find what killed it before fitting a new one</b>' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', run = true, last = performance.now();

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];

  const mainsOK = () => F().mains !== false;
  const busV = () => (!mainsOK() ? 0 : F().bus === undefined ? 310 : F().bus);
  const supplyOK = () => busV() > 60 && F().supply !== false;
  const legDriven = i => supplyOK() && run && F().deadLeg !== i;
  const spinning = () => supplyOK() && run && F().deadLeg === undefined && busV() > 100;

  /* ---------- helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function dash(pts, color, w) {
    ctx.save(); ctx.setLineDash([6, 5]); line(pts, color, w || 1.6); ctx.restore();
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function fitLabel(x, y, s, color, maxW, size, align) {
    let fs = size || 11;
    ctx.font = '700 ' + fs + 'px Anuphan, sans-serif';
    while (ctx.measureText(s).width > maxW && fs > 8) {
      fs -= 0.5; ctx.font = '700 ' + fs + 'px Anuphan, sans-serif';
    }
    ctx.textAlign = align || 'left'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function dot(x, y, c, r) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r || 3.4, 0, 7); ctx.fill();
  }
  function glow(pts, color, on) {
    if (!on) return;
    ctx.save(); ctx.globalAlpha = 0.14 + 0.09 * Math.sin(tStep * 4);
    line(pts, color, 14); ctx.restore();
  }
  function pathLen(p) {
    let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return L;
  }
  function pointAt(p, d) {
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
  function flowDots(p, color, speed, on, rev) {
    if (!on) return;
    const L = pathLen(p), gap = 42;
    let off = (flowT * speed) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, rev ? L - d : d);
      dot(x, y, color, 3.4);
      ctx.globalAlpha = .25; dot(x, y, color, 7); ctx.globalAlpha = 1;
    }
  }

  /* ---------- สถานะการสวิตช์ของแต่ละครึ่งสะพาน ---------- */
  // คืน +1 = ตัวบนนำ, −1 = ตัวล่างนำ, 0 = ช่วง dead time (ดับทั้งคู่)
  function legState(i) {
    if (!legDriven(i)) return 0;
    const s = Math.sin(flowT * 2.2 - i * Math.PI * 2 / 3);
    if (Math.abs(s) < 0.08) return 0;               // ช่วงดับทั้งคู่ — ห้ามให้นำพร้อมกันเด็ดขาด
    return s > 0 ? 1 : -1;
  }

  /* ---------- ชิ้นส่วน ---------- */
  function drawMains() {
    const live = mainsOK(), c = live ? css('--text') : css('--text-light');
    line([[XT, L_Y], [XT, N_Y]], c, 2);
    label(XT - 12, L_Y + 4, 'L', RED, 13, 'right', 700);
    label(XT - 12, N_Y + 4, 'N', BLUE, 13, 'right', 700);
    label(XT - 12, (L_Y + N_Y) / 2 + 4, '220V~', css('--text-light'), 10.5, 'right', 700);

    line([[XT, L_Y], [FUSE[0], L_Y]], c, 2.6);
    line([[FUSE[1], L_Y], [NTC[0], L_Y]], c, 2.6);
    line([[NTC[1], L_Y], [BR.x0, L_Y]], live ? c : css('--text-light'), 2.6);
    line([[XT, N_Y], [BR.x0, N_Y]], c, 2.6);

    // ฟิวส์
    const blown = !mainsOK();
    ctx.fillStyle = css('--card'); ctx.strokeStyle = blown ? RED : step === 1 ? VIOLET : css('--text');
    ctx.lineWidth = blown || step === 1 ? 2.8 : 2;
    rrect(FUSE[0], L_Y - 13, FUSE[1] - FUSE[0], 26, 7); ctx.fill(); ctx.stroke();
    if (blown) {
      line([[FUSE[0] + 12, L_Y], [FUSE[0] + 24, L_Y - 7]], RED, 2.4);
      line([[FUSE[1] - 24, L_Y + 7], [FUSE[1] - 12, L_Y]], RED, 2.4);
    } else line([[FUSE[0] + 10, L_Y], [FUSE[1] - 10, L_Y]], css('--text'), 2);
    label((FUSE[0] + FUSE[1]) / 2, L_Y - 22, t('ฟิวส์', 'fuse'), blown ? RED : css('--text-light'), 10.5);

    // NTC / ตัวจำกัดกระแสตอนเสียบปลั๊ก
    const ntcBad = fault === 'ntc';
    ctx.fillStyle = css('--card'); ctx.strokeStyle = ntcBad ? RED : step === 1 ? VIOLET : css('--text');
    ctx.lineWidth = ntcBad || step === 1 ? 2.8 : 2;
    rrect(NTC[0], L_Y - 13, NTC[1] - NTC[0], 26, 7); ctx.fill(); ctx.stroke();
    if (ntcBad) dash([[NTC[0] + 10, L_Y], [NTC[1] - 10, L_Y]], RED, 2.4);
    label((NTC[0] + NTC[1]) / 2, L_Y - 22, t('NTC จำกัดกระแส', 'NTC inrush'),
      ntcBad ? RED : css('--text-light'), 10.5);
  }

  function drawBridge() {
    const hot = step === 2;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = hot ? VIOLET : css('--text');
    ctx.lineWidth = hot ? 2.8 : 2;
    rrect(BR.x0, BR.y0, BR.x1 - BR.x0, BR.y1 - BR.y0, 10); ctx.fill(); ctx.stroke();

    // ไดโอด 4 ตัวเรียงเป็นสี่เหลี่ยมขนมเปียกปูนภายในตัวเรือน
    const cx = (BR.x0 + BR.x1) / 2, cy = (BR.y0 + BR.y1) / 2, k = 26;
    const nodes = [[cx, cy - k], [cx + k, cy], [cx, cy + k], [cx - k, cy]];
    ctx.strokeStyle = hot ? VIOLET : css('--text-light'); ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = nodes[i], b = nodes[(i + 1) % 4];
      line([a, b], hot ? VIOLET : css('--text-light'), 1.6);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      ctx.save(); ctx.translate(mx, my);
      ctx.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
      ctx.fillStyle = hot ? VIOLET : css('--text-light');
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    label(cx, BR.y1 + 18, t('บริดจ์ไดโอด', 'diode bridge'), hot ? VIOLET : css('--text-light'), 10.5);
  }

  function drawRails() {
    const live = busV() > 20;
    const cp = live ? RED : css('--text-light'), cn = live ? BLUE : css('--text-light');
    line([[BR.x1, L_Y], [CORNER, L_Y], [CORNER, RP], [790, RP]], cp, 2.8);
    line([[BR.x1, N_Y], [CORNER, N_Y], [CORNER, RN], [790, RN]], cn, 2.8);
    label(CORNER + 8, RP - 10, live ? '+' + Math.round(busV()) + 'V DC' : '+0V',
      live ? RED : css('--text-light'), 11, 'left', 700);
    label(CORNER + 8, RN + 20, 'DC−', live ? BLUE : css('--text-light'), 11, 'left', 700);

    // สัญลักษณ์กราวด์ควบคุมอยู่บนราง DC− เท่านั้น — ไม่ใช่กราวด์ของบ้าน
    const gx = 700, gc = step === 4 ? VIOLET : css('--text-light');
    line([[gx, RN], [gx, RN + 12]], gc, 1.8);
    line([[gx - 11, RN + 12], [gx + 11, RN + 12]], gc, 2.4);
    line([[gx - 7, RN + 17], [gx + 7, RN + 17]], gc, 2);
    line([[gx - 3, RN + 22], [gx + 3, RN + 22]], gc, 1.8);
  }

  function drawCap() {
    const hot = step === 3, bad = fault === 'cap', live = busV() > 20;
    const c = bad ? RED : hot ? VIOLET : live ? css('--text') : css('--text-light');
    line([[CAP_X, RP], [CAP_X, CAP_T]], c, 2.4);
    line([[CAP_X, CAP_B], [CAP_X, RN]], c, 2.4);
    line([[CAP_X - 15, CAP_T], [CAP_X + 15, CAP_T]], c, 3.2);
    line([[CAP_X - 15, CAP_B], [CAP_X + 15, CAP_B]], c, 3.2);
    label(CAP_X + 22, CAP_T + 8, t('คาปาซิเตอร์บัส', 'bus capacitor'), c, 10.5, 'left', 700);
    if (live) label(CAP_X + 22, CAP_T + 22, bad ? t('เสื่อม ริปเปิลสูง', 'tired, ripply') : t('เก็บไฟ 310V', 'holds 310 V'),
      bad ? RED : css('--text-light'), 10, 'left');
  }

  function drawDevice(x, y, on, hot, bad) {
    const c = bad ? RED : on ? GREEN : hot ? VIOLET : css('--text-light');
    ctx.fillStyle = on ? 'rgba(16,185,129,.14)' : css('--card');
    ctx.strokeStyle = c; ctx.lineWidth = hot || bad ? 2.6 : 1.8;
    rrect(x - DEV_W / 2, y - DEV_H / 2, DEV_W, DEV_H, 7); ctx.fill(); ctx.stroke();
    // สัญลักษณ์อย่างย่อ: ขาเกตซ้าย + ทางเดินกระแสแนวตั้ง
    line([[x - 22, y], [x - 8, y]], c, 1.8);
    line([[x - 8, y - 11], [x - 8, y + 11]], c, 2);
    line([[x - 3, y - 13], [x - 3, y + 13]], c, 2);
    line([[x - 3, y - 8], [x, y - 8]], c, 1.8);
    line([[x - 3, y + 8], [x, y + 8]], c, 1.8);
    line([[x, y - 20], [x, y - 8]], c, 1.8);
    line([[x, y + 8], [x, y + 20]], c, 1.8);
    // ไดโอดฟรีวีลขนานอยู่กับตัวมัน — คาโทดชี้ขึ้นหาไฟบวกเสมอ
    const fx = x + 26, dHot = step === 8;
    const fc = dHot ? ORANGE : css('--text-light');
    line([[x, y - 20], [fx, y - 20], [fx, y - 7]], fc, 1.4);
    line([[x, y + 20], [fx, y + 20], [fx, y + 7]], fc, 1.4);
    ctx.fillStyle = fc;
    ctx.beginPath(); ctx.moveTo(fx - 5, y + 7); ctx.lineTo(fx + 5, y + 7); ctx.lineTo(fx, y - 3); ctx.closePath(); ctx.fill();
    line([[fx - 6, y - 5], [fx + 6, y - 5]], fc, 1.8);
  }

  function drawLegs() {
    const live = busV() > 20;
    LEGS.forEach((x, i) => {
      const st = legState(i), hot = (step === 5 && i === 0) || step === 6;
      const bad = fault === 'igbt' && i === 0;
      const rail = live ? css('--text') : css('--text-light');
      line([[x, RP], [x, UP_Y - 20]], rail, 2.4);
      line([[x, UP_Y + 20], [x, LO_Y - 20]], rail, 2.4);
      line([[x, LO_Y + 20], [x, RN]], rail, 2.4);
      drawDevice(x, UP_Y, st > 0, hot, bad);
      drawDevice(x, LO_Y, st < 0, hot, bad);
      dot(x, MID_Y, live ? css('--text') : css('--text-light'), 3.6);
      label(x + 16, MID_Y + 4, ['U', 'V', 'W'][i], BLUE, 12, 'left', 700);

      // สายเฟสออกไปมอเตอร์ — เส้นซ้ายสุดใช้รางล่างสุด จึงไม่ตัดกันเอง
      const py = PHASE_Y[i];
      const pc = spinning() ? GREEN : legDriven(i) ? css('--text') : css('--text-light');
      line([[x, MID_Y], [x, py], [MOT_IN + 2, py]], pc, 2.4);

      // ขาเกต: เส้นประจากทางเดินสายควบคุม
      const gx = x - 34, gOK = legDriven(i);
      const gc = fault === 'gate' && F().deadLeg === i ? RED : (step === 4 || step === 5) ? VIOLET
        : gOK ? VIOLET : css('--text-light');
      dash([[gx, COR_Y], [gx, UP_Y], [x - 22, UP_Y]], gc, 1.5);
      dash([[gx, LO_Y], [x - 22, LO_Y]], gc, 1.5);
    });
  }

  function drawMotor() {
    const on = spinning();
    const c = on ? GREEN : css('--text-light');
    ctx.strokeStyle = c; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(MOT.x, MOT.y, MOT.r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(MOT.x, MOT.y, MOT.r - 8, 0, 7); ctx.stroke();
    ctx.save(); ctx.translate(MOT.x, MOT.y);
    ctx.rotate(on ? flowT * 3 : 0);
    line([[-(MOT.r - 14), 0], [MOT.r - 14, 0]], c, 3);
    line([[0, -(MOT.r - 14)], [0, MOT.r - 14]], c, 3);
    ctx.restore();
    dot(MOT.x, MOT.y, c, 4);
    label(MOT.x, MOT.y - MOT.r - 12, t('มอเตอร์ 3 เฟส', '3-phase motor'), c, 10.5, 'center', 700);
    if (fault === 'gate') label(MOT.x, MOT.y + MOT.r + 16, t('สั่น ไม่หมุน', 'hums, no turn'), RED, 10, 'center', 700);
    else if (fault === 'cap' && on) label(MOT.x, MOT.y + MOT.r + 16, t('เดินกระตุก', 'runs rough'), ORANGE, 10, 'center', 700);
  }

  function drawControl() {
    const sup = supplyOK(), c = sup ? VIOLET : css('--text-light');
    const hot = step === 4;

    // แยกไฟจากบัสไปภาคจ่ายไฟเล็ก (เส้นประ = ภาคแรงดันต่ำ)
    dot(CORNER + 8, RP, busV() > 20 ? RED : css('--text-light'), 3.4);
    dash([[CORNER + 8, RP], [30, RP], [30, 361], [BOX.smps[0], 361]], hot ? VIOLET : c, 1.6);

    const boxes = [
      [BOX.smps, t('ไฟเลี้ยง 15V / 5V', 'board supply 15 V / 5 V'), fault === 'smps'],
      [BOX.mcu, 'MCU', false],
      [BOX.drv, t('ไดรเวอร์เกต', 'gate drivers'), fault === 'gate']
    ];
    boxes.forEach(b => {
      const bad = b[2];
      ctx.fillStyle = css('--card'); ctx.strokeStyle = bad ? RED : hot ? VIOLET : sup ? VIOLET : css('--border');
      ctx.lineWidth = bad || hot ? 2.6 : 1.8;
      rrect(b[0][0], BOX.y0, b[0][1] - b[0][0], BOX.y1 - BOX.y0, 9); ctx.fill(); ctx.stroke();
      fitLabel(b[0][0] + 10, 365, b[1], bad ? RED : sup ? css('--text') : css('--text-light'),
        b[0][1] - b[0][0] - 20, 11, 'left');
    });
    dash([[BOX.smps[1], 361], [BOX.mcu[0], 361]], c, 1.6);
    dash([[BOX.mcu[1], 361], [BOX.drv[0], 361]], c, 1.6);
    dash([[BOX.drv[1] - 60, BOX.y0], [BOX.drv[1] - 60, COR_Y], [LEGS[2] - 34, COR_Y]], c, 1.6);
  }

  /* ---------- ป้ายจุดวัด TP1–TP5 ---------- */
  function badge(x, y, txt, ok, tag, toX, toY) {
    const c = ok ? GREEN : RED;
    ctx.font = '700 10px Anuphan, sans-serif';
    const w = Math.max(46, ctx.measureText(txt).width + 16);
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
    rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
    label(x, y + 4, txt, c, 10, 'center', 700);
    label(x - w / 2 - 4, y + 4, tag, css('--text-light'), 9.5, 'right', 700);
    if (toX !== undefined) dash([[x, y + 9], [toX, toY]], c, 1.2);
  }
  function drawProbes() {
    const bus = busV();
    badge(270, 140, mainsOK() ? '220V~' : '0V', mainsOK(), 'TP1', 270, L_Y - 13);
    badge(545, 88, bus > 20 ? Math.round(bus) + 'V' : '0V', bus > 250, 'TP2', 545, RP);
    badge(300, COR_Y, supplyOK() ? '15V' : '0V', supplyOK(), 'TP3', 300, BOX.y0);
    badge(505, 250, legDriven(0) ? 'PWM' : '—', legDriven(0), 'TP4', 528, LO_Y);
    badge(790, COR_Y, spinning() ? '3φ' : fault === 'gate' ? '2φ' : '—', spinning(), 'TP5', 790, PHASE_Y[2]);
  }

  /* ---------- แถบสถานะ ---------- */
  function statusBar() {
    const bad = fault !== 'ok';
    let msg;
    if (bad) msg = t(F().th, F().en).replace(/<\/?b>/g, '');
    else if (!run) msg = t('⏸ สั่งหยุดแล้ว มอเตอร์นิ่ง — แต่ TP2 ยังขึ้น 310V อยู่ บัสไม่ได้คายประจุตามคำสั่งหยุด อย่าแตะบอร์ด',
      '⏸ Stopped and the motor is still — but TP2 still reads 310 V. Stopping does not discharge the bus, so keep off the board');
    else msg = t('✅ ครบวงจร — บัส 310V ไดรเวอร์สลับ IGBT ทีละคู่ และ U V W ต่างเฟสกัน 120° มอเตอร์จึงหมุน',
      '✅ Complete — 310 V on the bus, the drivers switch each pair in turn, and U, V, W are 120° apart, so the motor turns');
    const col = bad ? RED : run ? GREEN : ORANGE;
    ctx.fillStyle = bad ? 'rgba(239,68,68,.10)' : run ? 'rgba(16,185,129,.10)' : 'rgba(245,158,11,.12)';
    ctx.strokeStyle = col; ctx.lineWidth = 1.4;
    rrect(30, 398, 880, 26, 8); ctx.fill(); ctx.stroke();
    fitLabel(42, 415, msg, col, 856, 11, 'left');
  }

  /* ---------- วาดทั้งฉาก ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (step === 3) glow([[CAP_X, RP], [CAP_X, RN]], RED, busV() > 20);
    if (step === 2) glow([[BR.x0, L_Y], [BR.x1, L_Y]], VIOLET, true);

    drawMains();
    drawBridge();
    drawRails();
    drawCap();
    drawControl();
    drawLegs();
    drawMotor();
    drawProbes();

    // กระแสสมมติ: ไฟบ้านเข้า → บัส → ออกทางเฟส
    flowDots([[XT, L_Y], [BR.x0, L_Y]], ORANGE, 95, mainsOK());
    flowDots([[CORNER, RP], [790, RP]], RED, 120, busV() > 20);
    flowDots([[790, RN], [CORNER, RN]], BLUE, 120, spinning());
    LEGS.forEach((x, i) => {
      const st = legState(i);
      if (!spinning() || st === 0) return;
      flowDots([[x, MID_Y], [x, PHASE_Y[i]], [MOT_IN, PHASE_Y[i]]], st > 0 ? GREEN : BLUE, 130, true, st < 0);
    });

    const title = [
      '', t('ไฟเข้า ฟิวส์ และตัวจำกัดกระแสตอนเสียบปลั๊ก', 'Mains in: fuse and inrush limiter'),
      t('บริดจ์ไดโอดเปลี่ยน AC เป็น DC เต้น', 'The bridge turns AC into pulsating DC'),
      t('คาปาซิเตอร์บัส — จุดที่อันตรายที่สุดในเครื่อง', 'The bus capacitor — the most dangerous point in the machine'),
      t('ไฟเลี้ยงภาคต่ำ → MCU → ไดรเวอร์เกต', 'Board supply → MCU → gate drivers'),
      t('ครึ่งสะพานหนึ่งเฟส: บน-ล่างห้ามนำพร้อมกัน', 'One half-bridge: the pair must never conduct together'),
      t('สามเฟสต่างกัน 120° = สนามหมุน', 'Three phases 120° apart make a rotating field'),
      t('เปลี่ยนความถี่ต้องเปลี่ยนแรงดันตามเสมอ (V/f)', 'Change the frequency and the voltage must follow (V/f)'),
      t('ไล่วัด TP1 → TP5 และไดโอดฟรีวีล', 'Working through TP1 → TP5, and the freewheel diodes')
    ][step];
    fitLabel(30, 28, title, css('--text'), 880, 12.5, 'left');

    statusBar();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (playing && tStep > 4.5) setStep(step % 8 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('vfd-play');
  const runBtn = document.getElementById('vfd-run');
  const faultSel = document.getElementById('vfd-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(8, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncRun() {
    runBtn.classList.toggle('active', run);
    runBtn.querySelectorAll('.vfd-on').forEach(e => e.style.display = run ? '' : 'none');
    runBtn.querySelectorAll('.vfd-off').forEach(e => e.style.display = run ? 'none' : '');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('vfd-prev').addEventListener('click', () => setStep(step === 1 ? 8 : step - 1));
  document.getElementById('vfd-next').addEventListener('click', () => setStep(step === 8 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  runBtn.addEventListener('click', () => { run = !run; syncRun(); });
  faultSel.addEventListener('change', () => {
    fault = FAULTS[faultSel.value] ? faultSel.value : 'ok';
    root.querySelectorAll('.bs-faultnote').forEach(e => e.classList.toggle('active', fault !== 'ok'));
  });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  syncRun();
  requestAnimationFrame(frame);
})();
