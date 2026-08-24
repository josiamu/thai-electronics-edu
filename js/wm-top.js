/* wm-top.js — Interactive step-by-step วงจรเครื่องซักผ้าฝาบนอินเวอร์เตอร์
 *              (washing-machine-top.html, #wmp-canvas)
 *
 * ฉากที่ 3 ของบทเครื่องซักผ้า คู่กับ js/wm-twin.js (2 ถัง) และ js/wm-front.js (ฝาหน้า)
 * — คนละหน้า คนละไฟล์ ไม่แชร์สถานะกัน ใช้ CSS .bs-* ร่วมกัน และ query .bs-tab/.bs-desc
 * **เฉพาะใน wrap ตัวเอง** เท่านั้น
 *
 * เครื่องฝาบนอินเวอร์เตอร์ = **ลูกผสม** สมองกลสั่งงานเหมือนฝาหน้า แต่ข้างล่างยังเป็น
 * คลัตช์กับสลิงแบบเครื่องรุ่นเก่า — 3 จุดที่ฉากนี้ตั้งใจสอน และไม่ซ้ำกับอีก 2 ฉาก:
 *
 *   1) **สวิตช์ฝาถังเป็น "สัญญาณ" ไม่ใช่ตัวตัดไฟ** — ต่างจากเครื่อง 2 ถังที่สวิตช์ฝาอนุกรม
 *      อยู่บนเส้น P และตัดไฟมอเตอร์ตรงๆ ที่นี่มันแค่รายงานบอร์ด บอร์ดเป็นคนตัดสินใจ
 *      (lidConfirmed() จึงเป็นประตูของทุกอย่างที่ตามมา)
 *   2) **สลิงเส้นเดียวของมอเตอร์เดรนทำ 2 หน้าที่พร้อมกัน** — เปิดวาล์วน้ำทิ้ง *และ*
 *      ปลดสลักคลัตช์ให้ถังหมุนทั้งใบ ดังนั้นอาการ tractor (เฟืองรูด) จะทำให้
 *      **ทั้งน้ำไม่ทิ้งและปั่นไม่ได้พร้อมกัน** — spinRuns() ต้องผูกกับ drainOK()
 *      **อย่าแยกให้ปั่นได้ทั้งที่สลิงไม่ดึง** จะผิดกลไกและพังบทเรียนข้อนี้ทันที
 *   3) **ลำดับไล่ซ่อม "เปิดไม่ติด" 3 สเต็ป** = TP1 ไฟเข้าหลังฟิวส์ → TP2 บัส 300V DC →
 *      TP3 ไฟ 5V/12V ขาออก SMPS ซึ่งตรงกับหัวข้อบอร์ดคอนโทรลในหน้าเดียวกัน
 *      (อาการ fuse ตายที่ TP1 · อาการ smps มี 300V แต่ TP3 ดับ — จุดที่ช่างมือใหม่
 *      มักเปลี่ยนทั้งบอร์ดทั้งที่เสียแค่ภาคจ่ายไฟ)
 *
 * ปุ่มโหมด #wmp-mode หมุนวน หยุด → ปิดฝา/พร้อม → เติมน้ำ → ซัก → เดรน+ปั่น (phase 0..4)
 * setStep() ตั้งจังหวะให้เองผ่าน STEP_MODE เพื่อให้ภาพตรงกับคำอธิบายของขั้นนั้นเสมอ
 *
 * อาการเสีย 7 แบบ: ok/fuse/smps/lidsw/level/tractor/hall
 *   level = สายยางเซ็นเซอร์ระดับน้ำหลุด/ตัน → **วาล์วค้างเปิด เติมไม่หยุด** และเครื่อง
 *           ไม่ยอมเดินจังหวะต่อ (ของจริง 80% ไม่ได้เสียที่ตัวเซ็นเซอร์ — เสียที่สายยาง)
 *
 * **จุดที่วิ่งไม่ใช่ทิศกระแสจริง** — ฝั่ง 220V เป็นไฟบ้าน AC 50Hz สลับทิศ 50 ครั้ง/วินาที
 * จุดที่วิ่งบอกแค่ว่า "วงจรครบวงและมีกระแสไหล"
 */
(function () {
  const root = document.getElementById('wmp-circuit');
  const cv = document.getElementById('wmp-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 430;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444',
        VIOLET = '#8b5cf6', PINK = '#ec4899', CYAN = '#06b6d4';

  /* ---------- geometry ---------- */
  const G = {
    x0: 56, x1: 892,
    lY: 64, nY: 372,                                   // ราง L บน / ราง N ล่าง
    fuseX: 100, fuseW: 74,                             // ฟิวส์ + วาริสเตอร์ (บนราง L)
    reacA: 192, reacB: 262,                            // R-Factor (รีแอคเตอร์) บนราง L
    bd: { x: 360, y: 96, w: 300, h: 218 },             // Main PCB
    bridge: { x: 376, y: 108, w: 132, h: 52 },         // บริดจ์ + บัส 300V DC
    smps:   { x: 376, y: 180, w: 132, h: 52 },         // SMPS → 5V / 12V
    triac:  { x: 530, y: 108, w: 118, h: 52 },         // ไตรแอค/รีเลย์ ขับโหลด 220V
    mcu:    { x: 530, y: 180, w: 118, h: 52 },         // สมองกล
    ipm:    { x: 376, y: 252, w: 272, h: 52 },         // IPM 3 เฟส
    colX: 690, colW: 118, colH: 38,                    // คอลัมน์อุปกรณ์ฝั่งขวา
    lidY: 84, valveY: 148, tracY: 212,                 // y ของกล่องแต่ละตัว
    busX: 684,                                         // บัส 220V จากไตรแอคไปหาโหลด
    retX: 870,                                         // สายกลับราง N ของโหลด
    sigPink: 666, sigOrange: 676,                      // ช่องเดินสายสัญญาณกลับบอร์ด
    mtX: 750, mtY: 300, mtR: 30                        // มอเตอร์ BLDC 3 เฟส
  };
  const midY = y => y + G.colH / 2;

  /* ---------- อาการเสีย ---------- */
  const FAULTS = {
    ok:      { th: 'วงจรปกติ — ไฟครบทั้ง 300V และ 5V/12V ฝาปิดยืนยันแล้ว ทุกจังหวะเดินตามลำดับ',
               en: 'Healthy — 300 V and 5 V/12 V both present, lid confirmed, every phase runs in order' },
    fuse:    { th: 'ฟิวส์ขาด → ตายตั้งแต่ TP1 ไม่มีอะไรทำงานเลย · แต่ฟิวส์ไม่เคยขาดเอง ต้องหาสาเหตุก่อนเปลี่ยน',
               en: 'Blown fuse — dead from TP1 onward, nothing runs. A fuse never blows on its own: find the cause first' },
    smps:    { th: 'ภาคจ่ายไฟบนบอร์ดเสีย → TP2 ยังมี 300V แต่ TP3 ไม่มี 5V/12V สมองกลจึงไม่ตื่น (ไม่ต้องเปลี่ยนทั้งบอร์ด)',
               en: 'On-board supply dead — TP2 still has 300 V but TP3 has no 5 V/12 V, so the controller never wakes (you do not need a whole board)' },
    lidsw:   { th: 'สวิตช์ฝาถังไม่ส่งสัญญาณ → บอร์ดถือว่าฝายังเปิด จึงไม่ยอมเดินโปรแกรม ทั้งที่ไฟเข้าครบทุกจุด',
               en: 'Lid switch not reporting — the board still thinks the lid is open and refuses to start, though every supply is present' },
    level:   { th: 'สายยางเซ็นเซอร์ระดับน้ำหลุด/ตัน → บอร์ดไม่เห็นน้ำขึ้น วาล์วค้างเปิด น้ำล้นไม่ยอมตัด (ตัวเซ็นเซอร์มักไม่ได้เสีย)',
               en: 'Level hose split or blocked — the board never sees the water rise, so the valve stays open and it overfills (the sensor itself is usually fine)' },
    tractor: { th: 'มอเตอร์เดรนเฟืองรูด สลิงไม่ดึง → น้ำไม่ทิ้ง **และปั่นไม่ได้ด้วย** เพราะสลิงเส้นเดียวกันคือตัวปลดคลัตช์',
               en: 'Drain tractor gear stripped — no drain **and no spin either**, because that same cable is what releases the clutch' },
    hall:    { th: 'ฮอลล์เซ็นเซอร์เสีย → ขดลวด 3 เฟสวัดเท่ากันเป๊ะ แต่บอร์ดไม่รู้ตำแหน่งโรเตอร์ กระตุกแล้วขึ้น Error',
               en: 'Hall sensor dead — all three phases measure equal, but the board cannot find the rotor: it judders, then errors' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', last = performance.now();
  let phase = 0;        // 0 หยุด · 1 ปิดฝา/พร้อม · 2 เติมน้ำ · 3 ซัก · 4 เดรน+ปั่น
  let swingT = 0, rotor = 0;

  const STEP_MODE = [0, 0, 1, 2, 3, 4];
  const NSTEP = STEP_MODE.length;

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];
  const NCOL = () => css('--text-light');
  const TCOL = () => css('--text');

  /* ---------- ตรรกะไฟ ---------- */
  const acLive = () => fault !== 'fuse';                       // TP1
  const busOK = () => acLive();                                // TP2 — บัส 300V DC
  const dcOK = () => busOK() && fault !== 'smps';              // TP3 — 5V / 12V
  // สวิตช์ฝาถังที่นี่เป็น "สัญญาณ" ไม่ใช่ตัวตัดไฟ — บอร์ดเป็นคนตัดสินใจว่าจะเดินต่อไหม
  const lidConfirmed = () => dcOK() && phase >= 1 && fault !== 'lidsw';
  // เซ็นเซอร์ระดับน้ำพัง = บอร์ดไม่เห็นน้ำขึ้น วาล์วจึงค้างเปิดและไม่ไปจังหวะต่อ
  const valveOn = () => lidConfirmed() && (phase === 2 || (fault === 'level' && phase >= 2));
  const stalledByLevel = () => fault === 'level' && phase >= 2;
  const motorLive = () => lidConfirmed() && phase >= 3 && !stalledByLevel();
  const washSpins = () => motorLive() && phase === 3 && fault !== 'hall';
  const tractorOn = () => lidConfirmed() && phase === 4 && !stalledByLevel();
  const drainOK = () => tractorOn() && fault !== 'tractor';    // สลิงดึงจริงไหม
  // สลิงเส้นเดียวกันเป็นตัวปลดคลัตช์ → ไม่ดึง = ปั่นไม่ได้ (อย่าแยกสองอย่างนี้ออกจากกัน)
  const spinRuns = () => motorLive() && phase === 4 && drainOK() && fault !== 'hall';
  const anyLoadLive = () => valveOn() || tractorOn();          // TP4

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
  function coil(x0, y0, x1, y1, color, turns, amp) {
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath();
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, s = Math.sin(u * Math.PI * (turns || 5)) * (amp || 8);
      const x = x0 + dx * u + nx * s, y = y0 + dy * u + ny * s;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
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
  function earthSym(x, y, c) {
    line([[x, y], [x, y + 7]], c, 2);
    line([[x - 11, y + 7], [x + 11, y + 7]], c, 2.4);
    line([[x - 7, y + 12], [x + 7, y + 12]], c, 2.2);
    line([[x - 3, y + 17], [x + 3, y + 17]], c, 2);
  }
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
    label(x, y + r + 15, txt, c, 10.5, 'center', 700);
    if (sub) label(x, y + r + 28, sub, c, 9.5, 'center', 600);
  }

  /* ---------- เส้นทางกระแส ---------- */
  const acInPath = () => ([[G.x0 + 14, G.lY], [G.bridge.x - 60, G.lY], [G.bridge.x - 60, 126],
                           [G.bridge.x, 126]]);
  const loadPath = y => ([[G.triac.x + G.triac.w, 126], [G.busX, 126], [G.busX, y], [G.colX, y],
                          [G.colX + G.colW, y], [G.retX, y], [G.retX, G.nY], [G.x0 + 14, G.nY]]);
  const phasePath = i => ([[G.ipm.x + G.ipm.w, 268 + i * 12], [672 + i * 12, 268 + i * 12],
                           [672 + i * 12, 292 + i * 8], [G.mtX - G.mtR, 292 + i * 8]]);

  function drawScene() {
    const s = step;
    const hotPwr = s === 1, hotDC = s === 2, hotLid = s === 3, hotFill = s === 4,
          hotWash = s === 5, hotSpin = s === 6;
    const live = acLive();

    /* ---- ราง L / N + ปลั๊ก ---- */
    line([[G.x0 + 14, G.lY], [G.x1 - 2, G.lY]], !live ? NCOL() : hotPwr ? VIOLET : RED, hotPwr ? 3.2 : 2.4);
    line([[G.x0 + 14, G.nY], [G.x1 - 2, G.nY]], hotPwr ? VIOLET : NCOL(), hotPwr ? 3.2 : 2.4);
    label(G.x1 - 2, G.lY - 12, t('สาย L — แดง', 'L — red'), live ? RED : NCOL(), 10.5, 'right', 700);
    label(G.x1 - 2, G.nY + 19, t('สาย N — ดำ', 'N — black'), NCOL(), 10.5, 'right', 700);
    plug(G.x0 + 14, (G.lY + G.nY) / 2, G.lY, G.nY);

    /* ---- ฟิวส์ + วาริสเตอร์ ---- */
    const fc = !live ? RED : hotPwr ? VIOLET : TCOL();
    box(G.fuseX, G.lY - 15, G.fuseW, 30, fc);
    if (live) line([[G.fuseX + 10, G.lY], [G.fuseX + G.fuseW - 10, G.lY]], fc, 2.6);
    else {
      line([[G.fuseX + 10, G.lY], [G.fuseX + 28, G.lY]], RED, 2.6);
      line([[G.fuseX + G.fuseW - 28, G.lY], [G.fuseX + G.fuseW - 10, G.lY]], RED, 2.6);
    }
    label(G.fuseX + G.fuseW / 2, G.lY - 22, t('ฟิวส์ + วาริสเตอร์', 'fuse + varistor'), fc, 10, 'center', 700);

    /* ---- R-Factor (รีแอคเตอร์) ---- */
    const rc = live ? (hotPwr ? VIOLET : RED) : NCOL();
    coil(G.reacA, G.lY, G.reacB, G.lY, rc, 5, 7);
    label((G.reacA + G.reacB) / 2, G.lY + 26, t('R-Factor (ตัวเหนี่ยวนำ)', 'R-factor (an inductor)'), rc, 9.5, 'center', 700);

    /* ---- บอร์ดคอนโทรล ---- */
    box(G.bd.x, G.bd.y, G.bd.w, G.bd.h, hotPwr || hotDC ? VIOLET : BLUE, 'rgba(37,99,235,.06)');
    label(G.bd.x + G.bd.w / 2, G.bd.y - 12, t('บอร์ดคอนโทรล (Main PCB)', 'main control board'), BLUE, 11, 'center', 700);

    // ไฟ L / N เข้าบอร์ด
    line([[G.bridge.x - 60, G.lY], [G.bridge.x - 60, 126], [G.bridge.x, 126]], live ? RED : NCOL(), 2.4);
    line([[G.bridge.x - 40, G.nY], [G.bridge.x - 40, 140], [G.bridge.x, 140]], NCOL(), 2);

    const bg = busOK();
    box(G.bridge.x, G.bridge.y, G.bridge.w, G.bridge.h, bg ? GREEN : RED);
    label(G.bridge.x + G.bridge.w / 2, G.bridge.y + 21, t('บริดจ์ + บัส DC', 'bridge + DC bus'), bg ? GREEN : RED, 10.5, 'center', 700);
    label(G.bridge.x + G.bridge.w / 2, G.bridge.y + 39, bg ? '300 V DC' : '0 V', bg ? GREEN : RED, 11, 'center', 700);

    const dc = dcOK();
    box(G.smps.x, G.smps.y, G.smps.w, G.smps.h, dc ? GREEN : RED);
    label(G.smps.x + G.smps.w / 2, G.smps.y + 21, t('ภาคจ่ายไฟ SMPS', 'SMPS'), dc ? GREEN : RED, 10.5, 'center', 700);
    label(G.smps.x + G.smps.w / 2, G.smps.y + 39, dc ? '5 V · 12 V' : '0 V', dc ? GREEN : RED, 11, 'center', 700);
    line([[G.bridge.x + 66, G.bridge.y + G.bridge.h], [G.bridge.x + 66, G.smps.y]], bg ? VIOLET : NCOL(), 2.6);

    box(G.mcu.x, G.mcu.y, G.mcu.w, G.mcu.h, dc ? VIOLET : NCOL());
    label(G.mcu.x + G.mcu.w / 2, G.mcu.y + 22, 'MCU', dc ? VIOLET : NCOL(), 12, 'center', 700);
    label(G.mcu.x + G.mcu.w / 2, G.mcu.y + 38, t('สมองกล', 'controller'), NCOL(), 9.5);
    line([[G.smps.x + G.smps.w, G.smps.y + 26], [G.mcu.x, G.mcu.y + 26]], dc ? VIOLET : NCOL(), 2.4);

    const trHot = valveOn() || tractorOn();
    box(G.triac.x, G.triac.y, G.triac.w, G.triac.h, trHot ? ORANGE : TCOL());
    label(G.triac.x + G.triac.w / 2, G.triac.y + 21, t('ไตรแอค / รีเลย์', 'triacs / relays'), TCOL(), 10.5, 'center', 700);
    label(G.triac.x + G.triac.w / 2, G.triac.y + 38, t('สับไฟ 220V ให้โหลด', 'switch the 220 V loads'), NCOL(), 9);
    line([[G.triac.x + 59, G.lY], [G.triac.x + 59, G.triac.y]], live ? RED : NCOL(), 2.2);
    line([[G.mcu.x + 59, G.mcu.y], [G.mcu.x + 59, G.triac.y + G.triac.h]], dc ? VIOLET : NCOL(), 2);

    box(G.ipm.x, G.ipm.y, G.ipm.w, G.ipm.h, motorLive() ? CYAN : TCOL());
    label(G.ipm.x + G.ipm.w / 2, G.ipm.y + 21, t('ชิป IPM — DC → 3 เฟส U/V/W', 'IPM — DC to 3-phase U/V/W'),
          motorLive() ? CYAN : TCOL(), 10.5, 'center', 700);
    label(G.ipm.x + G.ipm.w / 2, G.ipm.y + 39, t('อินเวอร์เตอร์ถึงมีชิปตัวนี้ · บอร์ดไตรแอคไม่มี',
                                                 'only an inverter has this chip — a triac board does not'), NCOL(), 9);
    line([[G.mcu.x + 30, G.mcu.y + G.mcu.h], [G.mcu.x + 30, G.ipm.y]], dc ? VIOLET : NCOL(), 2);
    // บัส 300V เลี้ยง IPM (อ้อมซ้ายของ SMPS ไม่ตัดผ่านบล็อกอื่น)
    line([[G.bridge.x, G.bridge.y + 40], [368, G.bridge.y + 40], [368, G.ipm.y + 18], [G.ipm.x, G.ipm.y + 18]], bg ? RED : NCOL(), 2);

    // สายดินตัวเครื่อง
    const eC = 'rgba(16,185,129,.55)';
    dash([[G.bd.x + 30, G.bd.y + G.bd.h], [G.bd.x + 30, 330]], eC, 1.8);
    earthSym(G.bd.x + 30, 330, eC);

    /* ---- สวิตช์ฝาถัง = สัญญาณ ไม่ใช่ตัวตัดไฟ ---- */
    const lidOK = lidConfirmed(), lc = fault === 'lidsw' ? RED : lidOK ? PINK : NCOL();
    box(G.colX, G.lidY, G.colW, G.colH, lc);
    label(G.colX + G.colW / 2, G.lidY + 24, t('สวิตช์ฝาถัง', 'lid switch'), lc, 10.5, 'center', 700);
    if (phase >= 1 || hotLid) {
      dash([[G.colX, midY(G.lidY)], [G.sigPink, midY(G.lidY)], [G.sigPink, G.mcu.y + 10],
            [G.mcu.x + G.mcu.w, G.mcu.y + 10]], lc, 2.2);
      if (hotLid) label(G.colX + G.colW / 2, G.lidY - 10,
                        lidOK ? t('ชมพู: ยืนยันฝาปิดแล้ว', 'pink: lid confirmed')
                              : t('ชมพู: ไม่มีสัญญาณ → ไม่เริ่มงาน', 'pink: no signal → will not start'), lc, 9.5, 'center', 700);
    }

    /* ---- วาล์วน้ำเข้า + เซ็นเซอร์ระดับน้ำ ---- */
    const vOn = valveOn(), vc = fault === 'level' ? RED : vOn ? BLUE : NCOL();
    line([[G.triac.x + G.triac.w, 126], [G.busX, 126], [G.busX, midY(G.valveY)], [G.colX, midY(G.valveY)]],
         vOn ? vc : NCOL(), vOn ? 2.6 : 1.8);
    line([[G.colX + G.colW, midY(G.valveY)], [G.retX, midY(G.valveY)], [G.retX, G.nY]], NCOL(), 1.8);
    box(G.colX, G.valveY, G.colW, G.colH, vc);
    label(G.colX + G.colW / 2, G.valveY + 24, t('วาล์วน้ำเข้า', 'inlet valve'), vc, 10.5, 'center', 700);
    if (vOn) flowDots(loadPath(midY(G.valveY)), BLUE, 80, true);
    if (phase >= 2 || hotFill) {
      dash([[G.colX, midY(G.valveY) + 13], [G.sigOrange, midY(G.valveY) + 13], [G.sigOrange, G.mcu.y + 42],
            [G.mcu.x + G.mcu.w, G.mcu.y + 42]], fault === 'level' ? RED : ORANGE, 2.2);
      if (hotFill) label(G.colX + G.colW / 2, G.valveY - 10,
                         fault === 'level' ? t('ส้ม: ไม่มีค่ากลับ → เติมไม่หยุด', 'orange: no reading → never stops filling')
                                           : t('ส้ม: ความถี่ระดับน้ำ', 'orange: level frequency'),
                         fault === 'level' ? RED : ORANGE, 9.5, 'center', 700);
    }

    /* ---- มอเตอร์เดรนดึงสลิง — สลิงเส้นเดียว 2 หน้าที่ ---- */
    const tOn = tractorOn(), tc = fault === 'tractor' ? RED : tOn ? CYAN : NCOL();
    line([[G.busX, midY(G.valveY)], [G.busX, midY(G.tracY)], [G.colX, midY(G.tracY)]], tOn ? tc : NCOL(), tOn ? 2.6 : 1.8);
    line([[G.colX + G.colW, midY(G.tracY)], [G.retX, midY(G.tracY)], [G.retX, G.nY]], NCOL(), 1.8);
    box(G.colX, G.tracY, G.colW, G.colH, tc);
    label(G.colX + G.colW / 2, G.tracY + 24, t('มอเตอร์เดรน (ดึงสลิง)', 'drain tractor'), tc, 10.5, 'center', 700);
    if (tOn && fault !== 'tractor') flowDots(loadPath(midY(G.tracY)), CYAN, 80, true);
    if (fault === 'tractor' && tOn) label(G.colX + G.colW / 2, G.tracY + G.colH + 13,
                                          t('เฟืองรูด — ครางแต่สลิงไม่ดึง', 'gear stripped — hums, cable never pulls'), RED, 9.5, 'center', 700);
    else if (hotSpin) label(G.colX + G.colW / 2, G.tracY + G.colH + 14,
                            t('สลิงเส้นเดียว → วาล์วน้ำทิ้ง + คลัตช์', 'one cable → drain valve + clutch'),
                            drainOK() ? GREEN : NCOL(), 9.5, 'center', 700);

    /* ---- มอเตอร์ BLDC 3 เฟส ---- */
    const spinning = washSpins() || spinRuns();
    const phC = [CYAN, BLUE, VIOLET];
    for (let i = 0; i < 3; i++) {
      line(phasePath(i), motorLive() ? phC[i] : NCOL(), motorLive() ? 2.4 : 1.6);
      if (spinning) flowDots(phasePath(i), phC[i], 120, true);
    }
    label(G.mtX - G.mtR - 6, 334, 'U / V / W', motorLive() ? CYAN : NCOL(), 10, 'right', 700);
    motor(G.mtX, G.mtY, G.mtR, motorLive(), spinning, phase === 4 ? 1 : (Math.sin(swingT * 1.1) >= 0 ? 1 : -1),
          t('มอเตอร์ BLDC', 'BLDC motor'),
          motorLive() && !spinning
            ? (fault === 'hall' ? t('กระตุกแล้วหยุด → Error', 'judders, stops → error')
                                : t('คลัตช์ยังไม่ปลด → ปั่นไม่ได้', 'clutch still latched → cannot spin'))
            : spinning ? (phase === 4 ? t('ปั่นหมาด', 'spinning') : t('กวนผ้าซ้าย-ขวา', 'agitating')) : '');

    // ฮอลล์เซ็นเซอร์กลับเข้า IPM
    const hallOK = fault !== 'hall';
    dash([[G.mtX, G.mtY + G.mtR], [G.mtX, 366], [600, 366], [600, G.ipm.y + G.ipm.h]], hallOK ? GREEN : RED, 2);
    label(580, 362, t(hallOK ? 'ฮอลล์เซ็นเซอร์ → ตำแหน่งโรเตอร์' : 'ฮอลล์เสีย → ยิงเฟสผิดจังหวะ',
                              hallOK ? 'hall sensor → rotor position' : 'hall dead → phases out of step'),
          hallOK ? GREEN : RED, 9.5, 'right', 700);

    flowDots(acInPath(), RED, 70, live);

    /* ---- ป้ายจุดวัด — ตรงกับลำดับไล่ซ่อม "เปิดไม่ติด" ---- */
    probe(215, 44, 'TP1', acLive());
    probe(G.bridge.x + 66, G.bridge.y + G.bridge.h + 10, 'TP2', busOK());
    probe(G.smps.x + 66, G.smps.y + G.smps.h + 10, 'TP3', dcOK());
    probe(846, midY(G.valveY), 'TP4', anyLoadLive());
  }

  function fitText(s, maxW, size) {
    for (let sz = size; sz >= 8.5; sz -= 0.5) {
      ctx.font = '700 ' + sz + 'px Anuphan, sans-serif';
      if (ctx.measureText(s).width <= maxW) return [s, sz];
    }
    let cut = s;
    while (cut.length > 4 && ctx.measureText(cut + '…').width > maxW) cut = cut.slice(0, -1);
    return [cut + '…', 8.5];
  }

  function statusBar() {
    let msg, color;
    if (fault !== 'ok') {
      msg = t(F().th, F().en).replace(/\*\*/g, '');
      color = RED;
    } else {
      msg = ['⏹ ' + t('เสียบปลั๊กแล้ว บอร์ดมีไฟเลี้ยง รอปิดฝาแล้วกด Start',
                      'Plugged in — the board has power and is waiting for the lid and Start'),
             '🔒 ' + t('ปิดฝาแล้ว — บอร์ดได้รับสัญญาณยืนยัน จึงยอมเดินโปรแกรมต่อ',
                       'Lid shut — the board has its confirmation and will now proceed'),
             '🚰 ' + t('เติมน้ำ — ไตรแอคสับไฟให้วาล์ว แล้วบอร์ดอ่านความถี่จากเซ็นเซอร์ระดับน้ำ',
                       'Filling — the triac powers the valve while the board reads the level frequency'),
             '🌀 ' + t('ซัก — IPM สร้างไฟ 3 เฟสให้มอเตอร์กวนผ้าซ้าย-ขวา (คลัตช์ยังล็อกถังนอกไว้)',
                       'Washing — the IPM drives three phases to swing the motor (the clutch still holds the outer tub)'),
             '💨 ' + t('เดรน + ปั่น — สลิงเส้นเดียวเปิดวาล์วน้ำทิ้งและปลดคลัตช์ ถังจึงหมุนทั้งใบ',
                       'Drain and spin — one cable opens the drain valve and releases the clutch, so the whole drum turns')][phase];
      color = phase === 0 ? BLUE : GREEN;
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

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (washSpins()) { swingT += dt; rotor += dt * 2.4; }
    else if (spinRuns()) rotor += dt * 9;
    if (playing && tStep > 4.5) setStep(step % NSTEP + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('wmp-play');
  const modeBtn = document.getElementById('wmp-mode');
  const faultSel = document.getElementById('wmp-fault');

  const MODES = [['⏹ รอเริ่ม', '⏹ Waiting'], ['🔒 ปิดฝา', '🔒 Lid shut'], ['🚰 เติมน้ำ', '🚰 Fill'],
                 ['🌀 ซัก', '🌀 Wash'], ['💨 เดรน + ปั่น', '💨 Drain + spin']];

  function syncMode() {
    const m = MODES[phase];
    modeBtn.textContent = t(m[0], m[1]);
    modeBtn.classList.toggle('active', phase > 0);
  }

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(NSTEP, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    phase = STEP_MODE[step - 1];
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
    syncMode();
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('wmp-prev').addEventListener('click', () => setStep(step === 1 ? NSTEP : step - 1));
  document.getElementById('wmp-next').addEventListener('click', () => setStep(step === NSTEP ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  modeBtn.addEventListener('click', () => { phase = (phase + 1) % 5; syncMode(); });
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
