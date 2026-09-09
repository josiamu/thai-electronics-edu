/* wm-front.js — Interactive step-by-step วงจรเครื่องซักผ้าฝาหน้า Direct Drive
 *                (washing-machine-front.html, #wmf-canvas)
 *
 * แยกออกมาจาก wm-circuit.js เดิม (ฉาก B) ตอนแตกบทเครื่องซักผ้าเป็น 3 หน้า
 * **เลขขั้นถูกเลื่อนจาก 6–10 มาเป็น 1–5 แล้ว** ทั้งใน JS และใน data-step ของ .bs-tab/.bs-desc
 * ฉากคู่กันคือ js/wm-twin.js (เครื่อง 2 ถัง) — คนละหน้า คนละไฟล์ ไม่แชร์สถานะกัน
 *
 * เครื่องฝาหน้า Direct Drive — สมองกลสั่งงานทุกอย่าง (5 ขั้น):
 *   L/N → EMI filter → บอร์ด: SMPS → 12V (รีเลย์/ไตรแอค) + 5V (MCU) → IPM 3 เฟส → มอเตอร์ DD
 *   โหลด 220V แยกออกขวา: door lock (PTC) / วาล์วน้ำ / ฮีตเตอร์+NTC / ปั๊มเดรน
 *   **มอเตอร์ DD ไม่มีสายนิวทรัล** — รับไฟจาก IPM 3 เส้น U/V/W เท่านั้น อย่าลากลงราง N
 *   สีสายอิงใบความรู้: แดง=L ดำ=N ม่วง=ไฟ DC เลี้ยงสมองกล ชมพู=สัญญาณยืนยันประตู
 *   น้ำเงิน=วาล์วน้ำ น้ำตาล=ฮีตเตอร์ ส้ม=ความถี่จากเซ็นเซอร์ระดับน้ำ เขียว=สายดิน
 *
 * ปุ่มโหมด #wmf-mode หมุนวน หยุด → ล็อกประตู → เติมน้ำ → ต้ม+ซัก → เดรน+ปั่น (phaseB 0..4)
 * setStep() ตั้งจังหวะให้เองผ่านตาราง STEP_MODE เพื่อให้ภาพตรงกับคำอธิบายของขั้นนั้นเสมอ
 *
 * **ลำดับที่เป็นแก่นของบท: ประตูต้องยืนยันก่อน ทุกอย่างจึงเดินต่อ** — lockConfirmed() เป็นประตู
 * ของ loadLive() ทุกตัวยกเว้นตัวล็อกเอง ถ้าปล่อยให้วาล์ว/ฮีตเตอร์ทำงานได้ทั้งที่ประตูไม่ยืนยัน
 * อาการ dE ในคลินิกจะอธิบายไม่ได้เลย
 *
 * อาการเสีย 5 แบบ ตรงกับคลินิกในหน้า:
 *   doorlock = คอยล์ล็อกขาด → ไม่มีสัญญาณชมพู บอร์ดหยุด (dE)
 *   heatleak = ฮีตเตอร์ช็อตลงโครง → พอสั่งต้ม ELCB ตัดทั้งบ้าน (mainsOK เป็น false ตั้งแต่จังหวะ 3)
 *   hall     = ขดลวด 3 เฟสดีทุกคู่ แต่บอร์ดยิงผิดจังหวะ → กระตุกแล้วหยุด (LE)
 *   drainjam = ขดลวดดีและมีไฟ 220V จริง แต่ใบพัดติดขยะ — **มีไฟ ≠ ทำงาน** อย่ายุบเคสนี้ทิ้ง
 *
 * **จุดที่วิ่งไม่ใช่ทิศกระแสจริง** — ฝั่ง 220V เป็นไฟบ้าน AC 50Hz กระแสสลับทิศ 50 ครั้ง/วินาที
 * จุดที่วิ่งบอกแค่ว่า "วงจรครบวงและมีกระแสไหล"
 * ใช้ CSS .bs-* ร่วมกับหน้าอื่น และ query .bs-tab/.bs-desc **เฉพาะใน wrap ตัวเอง** เท่านั้น
 */
(function () {
  const root = document.getElementById('wmf-circuit');
  const cv = document.getElementById('wmf-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 430;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444',
        VIOLET = '#8b5cf6', PINK = '#ec4899', BROWN = '#a16207', CYAN = '#06b6d4';

  /* ---------- geometry ---------- */
  const B = {
    x0: 56, x1: 892,
    lY: 74, nY: 360,
    filX: 112, filY: 110, filW: 100, filH: 64,
    bd: { x: 274, y: 100, w: 306, h: 156 },              // Main PCB
    smps: { x: 290, y: 118, w: 126, h: 50 },
    mcu: { x: 290, y: 186, w: 126, h: 50 },
    tri: { x: 432, y: 118, w: 132, h: 50 },              // รีเลย์ / ไตรแอคขับโหลด 220V
    ipm: { x: 432, y: 186, w: 132, h: 50 },              // ชิปขับมอเตอร์ 3 เฟส
    colX: 636, colW: 128, colH: 40,                      // คอลัมน์โหลด 220V ฝั่งขวา
    busX: 614,                                           // บัสแนวตั้งที่แตกไปหาโหลดแต่ละตัว
    loads: [
      { y: 78,  key: 'lock',  th: 'ล็อกประตู PTC', en: 'PTC door lock', wire: PINK },
      { y: 140, key: 'valve', th: 'วาล์วน้ำเข้า',   en: 'inlet valve',   wire: BLUE },
      { y: 196, key: 'heat',  th: 'ฮีตเตอร์ + NTC', en: 'heater + NTC',  wire: BROWN },
      { y: 252, key: 'pump',  th: 'ปั๊มเดรนน้ำ',    en: 'drain pump',    wire: CYAN }
    ],
    mtX: 826, mtY: 286, mtR: 36                          // มอเตอร์ Direct Drive
  };
  const ldY = ld => ld.y + B.colH / 2;

  /* ---------- อาการเสีย (ตรงกับคลินิกในหน้า) ---------- */
  const FAULTS = {
    ok:       { th: 'วงจรปกติ — บอร์ดมีไฟเลี้ยง ประตูยืนยันแล้ว ทุกจังหวะเดินได้ตามลำดับ',
                en: 'Healthy — the board has power, the door is confirmed, and every phase runs in order' },
    doorlock: { th: 'คอยล์ล็อกประตูขาด → ไม่มีสัญญาณยืนยันทางสายชมพู บอร์ดหยุดและขึ้น dE',
                en: 'Door-lock coil open — no confirm on the pink wire, so the board stops and shows dE' },
    heatleak: { th: 'ฮีตเตอร์ช็อตลงโครง → พอสั่งต้ม กระแสลงสายดิน เบรกเกอร์กันดูดตัดทั้งบ้าน',
                en: 'Heater shorted to chassis — on heating, current goes to earth and the house RCD trips' },
    hall:     { th: 'ฮอลล์เซ็นเซอร์เสีย → 3 เฟสวัดเท่ากันเป๊ะ แต่บอร์ดยิงผิดจังหวะ กระตุกแล้วขึ้น LE',
                en: 'Hall sensor dead — all three phases measure equal, but the board mistimes: judder, LE' },
    drainjam: { th: 'ปั๊มเดรนติดขยะ → ขดลวดดีและมีไฟ 220V จริง แต่ใบพัดหมุนไม่ได้ น้ำจึงไม่ทิ้ง',
                en: 'Drain pump jammed — winding good, 220 V present, but the impeller cannot turn' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', last = performance.now();
  let phaseB = 0;       // 0 หยุด · 1 ล็อกประตู · 2 เติมน้ำ · 3 ต้ม+ซัก · 4 เดรน+ปั่น
  let swingT = 0;       // นาฬิกากวนผ้าซ้าย-ขวา
  let rotor = 0;        // มุมโรเตอร์

  // จังหวะที่แต่ละขั้นควรอยู่ เพื่อให้ภาพตรงกับคำอธิบาย (index 0 = ขั้นที่ 1)
  const STEP_MODE = [0, 1, 2, 3, 4];
  const NSTEP = STEP_MODE.length;

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];
  const NCOL = () => css('--text-light');
  const TCOL = () => css('--text');

  /* ---------- ตรรกะไฟ ---------- */
  const mainsOK = () => !(fault === 'heatleak' && phaseB >= 3);      // ฮีตเตอร์รั่ว → ELCB ตัดตอนสั่งต้ม
  const dcOK = () => mainsOK();
  const lockConfirmed = () => dcOK() && phaseB >= 1 && fault !== 'doorlock';
  const loadLive = k => {
    if (!dcOK()) return false;
    if (k === 'lock') return phaseB >= 1;
    if (!lockConfirmed()) return false;                              // ไม่ยืนยันประตู = ไม่เดินต่อ
    if (k === 'valve') return phaseB === 2;
    if (k === 'heat') return phaseB === 3;
    if (k === 'pump') return phaseB === 4;
    return false;
  };
  const motorLive = () => lockConfirmed() && phaseB >= 3;
  const motorSpins = () => motorLive() && fault !== 'hall';

  /* ---------- drawing helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function dash(pts, color, w) {
    ctx.save(); ctx.setLineDash([6, 5]); line(pts, color, w || 1.8); ctx.restore();
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function box(x, y, w, h, stroke, fill) {
    ctx.fillStyle = fill || css('--card'); ctx.strokeStyle = stroke; ctx.lineWidth = 2;
    rrect(x, y, w, h, 8); ctx.fill(); ctx.stroke();
  }
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
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
  function flowDots(p, color, speed, on) {
    if (!on) return;
    const L = pathLen(p), gap = 42, off = (flowT * (speed || 60)) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function probe(x, y, txt, live) {
    const c = live ? GREEN : RED, w = 48;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
    rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
    label(x, y + 4, txt, c, 10, 'center', 700);
  }
  function plug(x, y, topY, botY) {
    box(x - 22, y - 22, 26, 44, NCOL());
    line([[x - 10, y - 11], [x + 4, y - 11]], RED, 3);
    line([[x - 10, y + 11], [x + 4, y + 11]], NCOL(), 3);
    line([[x + 4, y - 11], [x + 4, topY], [x + 10, topY]], RED, 2.4);
    line([[x + 4, y + 11], [x + 4, botY], [x + 10, botY]], NCOL(), 2.4);
    label(x - 9, y + 38, t('ปลั๊ก 220V', '220 V plug'), NCOL(), 10, 'center', 600);
  }
  function earthSym(x, y, c, txt) {
    line([[x, y], [x, y + 7]], c, 2);
    line([[x - 11, y + 7], [x + 11, y + 7]], c, 2.4);
    line([[x - 7, y + 12], [x + 7, y + 12]], c, 2.2);
    line([[x - 3, y + 17], [x + 3, y + 17]], c, 2);
    if (txt) label(x, y + 30, txt, c, 9.5, 'center', 700);
  }
  // มอเตอร์: มีไฟ = เรืองแสง · หมุนจริง = ใบพัดหมุน · มีไฟแต่ไม่หมุน = สั่นอยู่กับที่ (สีส้ม)
  function motor(x, y, r, live, spinning, dirSign, txt, sub) {
    const c = !live ? NCOL() : spinning ? GREEN : ORANGE;
    if (live) {
      ctx.save(); ctx.globalAlpha = .12 + .07 * Math.sin(tStep * (spinning ? 6 : 16));
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r + 9, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(x, y);
    ctx.rotate(spinning ? rotor * dirSign : live ? Math.sin(tStep * 22) * 0.06 : 0);
    ctx.strokeStyle = c; ctx.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(r - 8)); ctx.stroke();
    }
    ctx.restore();
    label(x, y + r + 16, txt, c, 10.5, 'center', 700);
    if (sub) label(x, y + r + 29, sub, c, 9.5, 'center', 600);
  }

  /* ---------- เส้นทางกระแส ---------- */
  const acInPath = () => ([[B.x0 + 14, B.lY], [B.filX + B.filW / 2, B.lY],
                           [B.filX + B.filW / 2, B.filY], [B.filX + B.filW / 2, B.filY + B.filH],
                           [B.filX + B.filW / 2, B.nY], [B.x0 + 14, B.nY]]);
  const loadPath = ld => ([[B.tri.x + B.tri.w, B.tri.y + 18], [B.busX, B.tri.y + 18],
                           [B.busX, ldY(ld)], [B.colX, ldY(ld)], [B.colX + B.colW, ldY(ld)],
                           [B.x1 - 2, ldY(ld)], [B.x1 - 2, B.nY], [B.x0 + 14, B.nY]]);
  const phasePath = i => ([[B.ipm.x + B.ipm.w, B.ipm.y + 14 + i * 12],
                           [B.ipm.x + B.ipm.w + 24 + i * 10, B.ipm.y + 14 + i * 12],
                           [B.ipm.x + B.ipm.w + 24 + i * 10, B.mtY + 30 - i * 10],
                           [B.mtX - B.mtR, B.mtY + 30 - i * 10]]);

  function drawScene() {
    const s = step;
    const hotPwr = s === 1, hotLock = s === 2, hotFill = s === 3, hotWash = s === 4, hotSpin = s === 5;
    const live = mainsOK();

    // ราง L / N + ปลั๊ก
    line([[B.x0 + 14, B.lY], [B.x1 - 2, B.lY]], !live ? NCOL() : hotPwr ? VIOLET : RED, hotPwr ? 3.2 : 2.4);
    line([[B.x0 + 14, B.nY], [B.x1 - 2, B.nY]], hotPwr ? VIOLET : NCOL(), hotPwr ? 3.2 : 2.4);
    label(B.x1 - 2, B.lY - 12, t('สาย L — แดง', 'L — red'), live ? RED : NCOL(), 10.5, 'right', 700);
    label(B.x1 - 2, B.nY + 19, t('สาย N — ดำ', 'N — black'), NCOL(), 10.5, 'right', 700);
    plug(B.x0 + 8, (B.lY + B.nY) / 2, B.lY, B.nY);

    // EMI filter
    box(B.filX, B.filY, B.filW, B.filH, hotPwr ? VIOLET : TCOL());
    label(B.filX + B.filW / 2, B.filY + 26, t('ชุดกรองไฟ', 'EMI filter'), TCOL(), 11, 'center', 700);
    label(B.filX + B.filW / 2, B.filY + 44, t('ดักคลื่นรบกวน', 'blocks EMI'), NCOL(), 9.5);
    line([[B.filX + B.filW / 2, B.lY], [B.filX + B.filW / 2, B.filY]], live ? RED : NCOL(), 2.2);
    line([[B.filX + B.filW / 2, B.filY + B.filH], [B.filX + B.filW / 2, B.nY]], NCOL(), 2.2);
    line([[B.filX + B.filW, B.filY + 20], [B.bd.x, B.filY + 20]], live ? RED : NCOL(), 2.4);

    // Main PCB
    box(B.bd.x, B.bd.y, B.bd.w, B.bd.h, hotPwr ? VIOLET : BLUE, 'rgba(37,99,235,.06)');
    label(B.bd.x + B.bd.w / 2, B.bd.y - 8, t('บอร์ดคอนโทรล (Main PCB)', 'main control board'), BLUE, 11, 'center', 700);

    box(B.smps.x, B.smps.y, B.smps.w, B.smps.h, dcOK() ? GREEN : RED);
    label(B.smps.x + B.smps.w / 2, B.smps.y + 21, t('ภาคจ่ายไฟ SMPS', 'SMPS'), dcOK() ? GREEN : RED, 10.5, 'center', 700);
    label(B.smps.x + B.smps.w / 2, B.smps.y + 38, dcOK() ? '5 V · 12 V' : '0 V', dcOK() ? GREEN : RED, 11, 'center', 700);

    box(B.mcu.x, B.mcu.y, B.mcu.w, B.mcu.h, dcOK() ? VIOLET : NCOL());
    label(B.mcu.x + B.mcu.w / 2, B.mcu.y + 22, 'MCU', dcOK() ? VIOLET : NCOL(), 12, 'center', 700);
    label(B.mcu.x + B.mcu.w / 2, B.mcu.y + 38, t('สมองกล', 'controller'), NCOL(), 9.5);
    line([[B.smps.x + 34, B.smps.y + B.smps.h], [B.smps.x + 34, B.mcu.y]], dcOK() ? VIOLET : NCOL(), 2.6);

    box(B.tri.x, B.tri.y, B.tri.w, B.tri.h, hotFill || hotWash || hotSpin ? ORANGE : TCOL());
    label(B.tri.x + B.tri.w / 2, B.tri.y + 21, t('รีเลย์ / ไตรแอค', 'relays / triacs'), TCOL(), 10.5, 'center', 700);
    label(B.tri.x + B.tri.w / 2, B.tri.y + 38, t('สับไฟ 220V ให้โหลด', 'switch the 220 V loads'), NCOL(), 9);

    box(B.ipm.x, B.ipm.y, B.ipm.w, B.ipm.h, motorLive() ? CYAN : TCOL());
    label(B.ipm.x + B.ipm.w / 2, B.ipm.y + 21, t('ชิป IPM', 'IPM chip'), motorLive() ? CYAN : TCOL(), 11, 'center', 700);
    label(B.ipm.x + B.ipm.w / 2, B.ipm.y + 38, t('DC → 3 เฟส U/V/W', 'DC → 3-phase U/V/W'), NCOL(), 9);
    line([[B.mcu.x + B.mcu.w, B.mcu.y + 25], [B.ipm.x, B.ipm.y + 25]], dcOK() ? VIOLET : NCOL(), 2.2);
    line([[B.smps.x + B.smps.w, B.smps.y + 25], [B.tri.x, B.tri.y + 25]], dcOK() ? VIOLET : NCOL(), 2.2);

    // โหลด 220V ฝั่งขวา
    B.loads.forEach(ld => {
      const on = loadLive(ld.key), y = ldY(ld);
      const bad = (ld.key === 'lock' && fault === 'doorlock') ||
                  (ld.key === 'heat' && fault === 'heatleak') ||
                  (ld.key === 'pump' && fault === 'drainjam');
      const c = bad ? RED : on ? ld.wire : NCOL();
      line([[B.tri.x + B.tri.w, B.tri.y + 18], [B.busX, B.tri.y + 18], [B.busX, y], [B.colX, y]], c, on ? 2.6 : 1.8);
      line([[B.colX + B.colW, y], [B.x1 - 2, y], [B.x1 - 2, B.nY]], NCOL(), 1.8);
      box(B.colX, ld.y, B.colW, B.colH, c);
      // ชื่อโหลดกับป้ายอาการเสียอยู่ "ในกล่อง" ทั้งคู่ — ใต้กล่องเป็นที่ของคำอธิบายสายสัญญาณ
      // (ชมพู = ยืนยันประตู · ส้ม = ระดับน้ำ) ส่วนเหนือกล่องคือกล่องของโหลดตัวก่อนหน้า
      label(B.colX + B.colW / 2, ld.y + (bad ? 17 : 25), t(ld.th, ld.en), c, 10.5, 'center', 700);
      if (on && !bad) flowDots(loadPath(ld), ld.wire, 80, true);
      if (bad) {
        const msg = ld.key === 'lock' ? t('คอยล์ขาด (OL)', 'coil open (OL)')
                  : ld.key === 'heat' ? t('ช็อตลงโครง!', 'shorted to chassis!')
                  : t('ใบพัดติดขยะ — ขดลวดดี', 'impeller jammed — winding fine');
        const [txt2, sz] = fitText(msg, B.colW + 32, 9.5);   // อังกฤษยาวกว่ากล่อง ย่อให้พอดี
        label(B.colX + B.colW / 2, ld.y + 34, txt2, RED, sz, 'center', 700);
      }
    });

    // สายชมพู: สัญญาณยืนยันประตูกลับเข้า MCU
    if (phaseB >= 1) {
      const okc = lockConfirmed() ? PINK : RED;
      dash([[B.colX, ldY(B.loads[0]) + 15], [B.colX - 44, ldY(B.loads[0]) + 15],
            [B.colX - 44, 244], [B.mcu.x + 62, 244], [B.mcu.x + 62, B.mcu.y + B.mcu.h]], okc, 2.2);
      label(B.colX + B.colW / 2, ldY(B.loads[0]) + 34, lockConfirmed() ? t('ชมพู: ยืนยันประตูล็อกแล้ว', 'pink: door confirmed')
                                                                          : t('ชมพู: ไม่มีสัญญาณ → dE', 'pink: no signal → dE'), okc, 9.5, 'center', 700);
    }
    // สายส้ม: ความถี่จากเซ็นเซอร์ระดับน้ำ
    if (phaseB >= 2) {
      dash([[B.colX, ldY(B.loads[1]) + 15], [B.colX - 62, ldY(B.loads[1]) + 15],
            [B.colX - 62, 252], [B.mcu.x + 30, 252], [B.mcu.x + 30, B.mcu.y + B.mcu.h]], ORANGE, 2.2);
      label(B.colX + B.colW / 2, ldY(B.loads[1]) + 31, t('ส้ม: ความถี่ระดับน้ำ', 'orange: level frequency'),
            ORANGE, 9.5, 'center', 700);
    }

    // มอเตอร์ Direct Drive — รับไฟ 3 เฟสจาก IPM เท่านั้น ไม่มีสายนิวทรัล
    const phC = [CYAN, BLUE, VIOLET];
    for (let i = 0; i < 3; i++) {
      line(phasePath(i), motorLive() ? phC[i] : NCOL(), motorLive() ? 2.4 : 1.6);
      if (motorSpins()) flowDots(phasePath(i), phC[i], 120, true);
    }
    label(B.mtX - B.mtR - 6, 248, 'U / V / W', motorLive() ? CYAN : NCOL(), 10, 'right', 700);
    motor(B.mtX, B.mtY, B.mtR, motorLive(), motorSpins(),
          phaseB === 4 ? 1 : (Math.sin(swingT * 1.1) >= 0 ? 1 : -1),
          t('มอเตอร์ DD', 'DD motor'),
          motorLive() && !motorSpins() ? t('กระตุก → LE', 'judders → LE')
          : motorSpins() ? (phaseB === 4 ? t('ปั่น 1,000+ รอบ', '1,000+ rpm') : t('กวนผ้าซ้าย-ขวา', 'agitating')) : '');

    // ฮอลล์เซ็นเซอร์กลับเข้า MCU
    const hallOK = fault !== 'hall';
    dash([[B.mtX, B.mtY + B.mtR], [B.mtX, B.nY - 7], [B.mcu.x + B.mcu.w / 2, B.nY - 7],
          [B.mcu.x + B.mcu.w / 2, B.mcu.y + B.mcu.h]], hallOK ? GREEN : RED, 2);
    label(B.mtX - 150, B.nY - 16, t(hallOK ? 'ฮอลล์เซ็นเซอร์ → บอกตำแหน่งโรเตอร์' : 'ฮอลล์เซ็นเซอร์เสีย → ยิงเฟสผิดจังหวะ',
                                   hallOK ? 'hall sensor → rotor position' : 'hall sensor dead → phases fire out of step'),
          hallOK ? GREEN : RED, 9.5, 'right', 700);

    flowDots(acInPath(), RED, 70, live);

    // สายดินตัวเครื่อง
    const eC = 'rgba(16,185,129,.55)';
    // สั้นลงเพื่อไม่ให้สัญลักษณ์สายดินไปอยู่ใต้แถบเตือน ELCB ตอนเลือกอาการฮีตเตอร์รั่ว
    dash([[B.bd.x + 40, B.bd.y + B.bd.h], [B.bd.x + 40, 274]], eC, 1.8);
    earthSym(B.bd.x + 40, 274, eC, '');

    // ELCB ตัด (ฮีตเตอร์รั่วลงโครง)
    if (fault === 'heatleak' && phaseB >= 3) {
      ctx.fillStyle = 'rgba(239,68,68,.12)'; ctx.strokeStyle = RED; ctx.lineWidth = 2;
      rrect(250, 296, 300, 52, 10); ctx.fill(); ctx.stroke();
      label(400, 318, t('⚡ เบรกเกอร์กันดูดตัด — ทั้งบ้านดับ', '⚡ RCD tripped — the whole house is dark'), RED, 12, 'center', 700);
      label(400, 337, t('กระแสกลับทางสายดิน ไม่กลับทาง N', 'current returned through earth, not neutral'), RED, 10, 'center', 600);
    }

    // ป้ายจุดวัด
    probe(B.filX + B.filW / 2 + 40, B.lY - 30, 'TP1', live);
    probe(B.smps.x + 34, B.smps.y + B.smps.h + 9, 'TP2', dcOK());
    probe(B.x1 - 92, ldY(B.loads[0]) + 18, 'TP3', loadLive('lock'));
    probe(B.mtX, B.mtY - B.mtR - 18, 'TP4', motorLive());
  }

  // ย่อ/ตัดข้อความให้พอดีความกว้างที่มี — กันข้อความยาวล้นออกนอกแคนวาส (โดยเฉพาะฝั่ง EN)
  function fitText(s, maxW, size) {
    for (let sz = size; sz >= 8.5; sz -= 0.5) {
      ctx.font = '700 ' + sz + 'px Anuphan, sans-serif';
      if (ctx.measureText(s).width <= maxW) return [s, sz];
    }
    let cut = s;
    while (cut.length > 4 && ctx.measureText(cut + '…').width > maxW) cut = cut.slice(0, -1);
    return [cut + '…', 8.5];
  }

  /* ---------- แถบสถานะล่าง ---------- */
  function statusBar() {
    let msg, color;
    if (fault !== 'ok') {
      msg = t(F().th, F().en);
      color = RED;
    } else {
      msg = ['⏹ ' + t('เสียบปลั๊กแล้ว บอร์ดมีไฟเลี้ยง รอกด Start', 'Plugged in — the board has power and is waiting for Start'),
             '🔒 ' + t('จังหวะที่ 1 — ล็อกประตูก่อน ยังไม่ปล่อยน้ำเข้าถัง', 'Phase 1 — lock the door first; no water yet'),
             '🚰 ' + t('จังหวะที่ 2 — เปิดวาล์ว แล้วอ่านความถี่จากเซ็นเซอร์ระดับน้ำ', 'Phase 2 — open the valve and read the level sensor frequency'),
             '🔥 ' + t('จังหวะที่ 3 — ต้มน้ำตามค่า NTC พร้อมขับมอเตอร์กวนผ้าซ้าย-ขวา', 'Phase 3 — heat to the NTC reading while the motor agitates'),
             '💨 ' + t('จังหวะที่ 4 — เดรนน้ำทิ้งแล้วเร่งรอบปั่นหมาด', 'Phase 4 — drain, then ramp up to spin')][phaseB];
      color = phaseB === 0 ? BLUE : GREEN;
    }
    ctx.fillStyle = color === GREEN ? 'rgba(16,185,129,.10)' : color === BLUE ? 'rgba(37,99,235,.10)'
                  : 'rgba(239,68,68,.10)';
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    rrect(46, H - 32, 848, 26, 8); ctx.fill(); ctx.stroke();
    const [txt, sz] = fitText(msg, 820, 11);
    label(60, H - 14, txt, color, sz, 'left', 700);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawScene();
    statusBar();
  }

  /* ---------- clock ---------- */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    const agitating = motorSpins() && phaseB === 3;
    const spinning = motorSpins() && phaseB === 4;
    if (agitating) swingT += dt;
    if (spinning) rotor += dt * 9;
    else if (agitating) rotor += dt * 2.4;
    if (playing && tStep > 4.5) setStep(step % NSTEP + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('wmf-play');
  const modeBtn = document.getElementById('wmf-mode');
  const faultSel = document.getElementById('wmf-fault');

  const MODES = [['⏹ รอกด Start', '⏹ Waiting'], ['🔒 ล็อกประตู', '🔒 Lock door'], ['🚰 เติมน้ำ', '🚰 Fill'],
                 ['🔥 ต้ม + ซัก', '🔥 Heat + wash'], ['💨 เดรน + ปั่น', '💨 Drain + spin']];

  function syncMode() {
    const m = MODES[phaseB];
    modeBtn.textContent = t(m[0], m[1]);
    modeBtn.classList.toggle('active', phaseB > 0);
  }

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(NSTEP, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    phaseB = STEP_MODE[step - 1];
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
    syncMode();
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('wmf-prev').addEventListener('click', () => setStep(step === 1 ? NSTEP : step - 1));
  document.getElementById('wmf-next').addEventListener('click', () => setStep(step === NSTEP ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  modeBtn.addEventListener('click', () => {
    phaseB = (phaseB + 1) % 5;
    syncMode();
  });
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
  document.addEventListener('langchange', () => { syncMode(); draw(); });
  resize();
  setStep(1);
  requestAnimationFrame(frame);
})();
