/* wm-twin.js — Interactive step-by-step วงจรเครื่องซักผ้า 2 ถัง (washing-machine-twin.html, #wmt-canvas)
 *
 * แยกออกมาจาก wm-circuit.js เดิม (ฉาก A) ตอนแตกบทเครื่องซักผ้าเป็น 3 หน้า
 * ฉากคู่กันคือ js/wm-front.js (เครื่องฝาหน้า Direct Drive) — คนละหน้า คนละไฟล์ ไม่แชร์สถานะกัน
 *
 * เครื่อง 2 ถัง กึ่งอัตโนมัติ — วงจรกลไกล้วน ไม่มีบอร์ดสักแผ่น (5 ขั้น):
 *   P → ฟิวส์ → แยก 2 ทางอิสระ: ลานซัก และ ลานปั่น
 *   **มอเตอร์ซัก = 2 ขดเท่ากัน + คาปาซิเตอร์คร่อมปลายขดทั้งสอง** ลานซักสับ P สลับไปปลายซ้าย/ขวา
 *   ขดที่ได้ P ตรงๆ = ขดรัน อีกขดกลายเป็นขดสตาร์ทผ่านคาปาฯ → สลับข้างไหนก็หมุนทางนั้น = กวนผ้า
 *   **ห้ามวาดคาปาฯ คร่อมลงราง N เด็ดขาด** จะอธิบายการกลับทางหมุนไม่ได้เลย และผิดของจริง
 *   มอเตอร์ปั่น = ขดรันตรง + ขดสตาร์ทผ่านคาปาฯ **ตายตัว** จึงหมุนทางเดียว
 *   **สวิตช์ฝาถังปั่นต่ออนุกรมบนเส้น P ของฝั่งปั่น** เปิดฝาเมื่อไหร่ตัดไฟทันที (หัวใจของบทเรื่องนิรภัย)
 *   ออด (Buzzer) รับ P จากหน้าสัมผัสชุดสุดท้ายของลานซักตอนจบโปรแกรม
 *   N ลากขนานไปรอที่คอมมอนของโหลดทุกตัว · E เส้นประไปยึดโครงมอเตอร์ทั้งสอง (คนละจุดกัน)
 *
 * ปุ่มโหมด #wmt-mode หมุนวน หยุด → ซัก → ปั่น (modeA 0/1/2)
 * setStep() ตั้งโหมดให้เองผ่านตาราง STEP_MODE เพื่อให้ภาพตรงกับคำอธิบายของขั้นนั้นเสมอ
 *
 * อาการเสีย 4 แบบ ตรงกับคลินิกในหน้า — 3 เคสที่ไม่ใช่ ok **จงใจแยก "มีไฟ" ออกจาก "หมุนจริง"**:
 *   doorsw = ไฟไม่ถึง · capdead = ไฟถึงแต่ไม่ออกตัว · brake = ไฟครบและคาปาฯ ดี แต่เบรกบีบคอไว้
 *   (ป้ายจุดวัดของ brake เขียวเหมือน capdead ทุกจุด — วัดไฟฟ้าไม่มีวันเจอ) **อย่ายุบให้เหลือเคสเดียว**
 *
 * **จุดที่วิ่งไม่ใช่ทิศกระแสจริง** — ทั้งหน้าเป็นไฟบ้าน AC 50Hz กระแสสลับทิศ 50 ครั้ง/วินาที
 * จุดที่วิ่งบอกแค่ว่า "วงจรครบวงและมีกระแสไหล" ทิศที่วาดเลือกให้เริ่มที่ขั้ว P เพื่อให้ตรงกับ
 * ลำดับป้ายจุดวัดที่ไล่ซ้าย→ขวา เหมือน rice-circuit.js และ wh-circuit.js
 * ใช้ CSS .bs-* ร่วมกับหน้าอื่น และ query .bs-tab/.bs-desc **เฉพาะใน wrap ตัวเอง** เท่านั้น
 */
(function () {
  const root = document.getElementById('wmt-circuit');
  const cv = document.getElementById('wmt-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 430;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- geometry ---------- */
  const A = {
    x0: 56, x1: 892,
    pY: 84, nY: 368,                 // ราง P บน / ราง N ล่าง
    fuseX: 116, fuseW: 78,
    wtX: 262, wtY: 150, wtW: 132, wtH: 44,       // ลานซัก
    wa: 272, wb: 396,                            // x ของปลายขดที่ 1 / ที่ 2 (มอเตอร์ซัก)
    capY: 236, capX: 300,                        // คาปาฯ ซัก คร่อมปลายขดทั้งสอง (สายแนวนอน)
    wmX: 334, wmY: 300, wmR: 34,                 // มอเตอร์ซัก
    weX: 150,                                    // สายดินมอเตอร์ซัก
    bzX: 476, bzY: 150, bzW: 78, bzH: 40,        // ออดเตือน
    stX: 640, stY: 150, stW: 122, stH: 44,       // ลานปั่น
    dsX: 640, dsY: 224, dsW: 122, dsH: 38,       // สวิตช์ฝาถังปั่น (อนุกรม)
    snX: 724, snY: 268,                          // โหนดหลังสวิตช์ฝาถัง
    scX: 774,                                    // คาปาฯ ปั่น (สายแนวนอน y = snY)
    sbX: 836,                                    // ปลายขดสตาร์ทของมอเตอร์ปั่น
    smX: 780, smY: 304, smR: 28,                 // มอเตอร์ปั่น
    seX: 880                                     // สายดินมอเตอร์ปั่น
  };

  /* ---------- อาการเสีย (ตรงกับคลินิกในหน้า) ---------- */
  const FAULTS = {
    ok:      { th: 'วงจรปกติ — ทั้งฝั่งซักและฝั่งปั่นครบวงจร มอเตอร์ออกตัวได้ทันทีที่บิดลาน',
               en: 'Healthy — both the wash and the spin side are complete, and each motor starts the moment its timer is wound' },
    doorsw:  { th: 'สวิตช์ฝาถังปั่นขี้เกลือ → ฝั่งซักปกติ แต่ฝั่งปั่นเงียบสนิท — ไฟตายที่หน้าสัมผัส ยังไม่ถึงมอเตอร์',
               en: 'Corroded spin-lid switch — wash side fine, spin side silent: live dies at the contact' },
    capdead: { th: 'คาปาซิเตอร์เสื่อม → มอเตอร์ครางแต่ไม่ออกตัว ต้องใช้มือช่วยหมุน',
               en: 'Tired capacitor — the motor hums but will not start until you spin it by hand' },
    brake:   { th: 'สลิงเบรกติด → ไฟครบทุกด่านและคาปาฯ ก็ดี แต่เบรกล็อกคอไว้ — วัดไฟฟ้าไม่มีวันเจอ',
               en: 'Brake cable stuck — every link is live and the capacitor is good; no meter will find this' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', last = performance.now();
  let modeA = 0;        // 0 หยุด · 1 ซัก · 2 ปั่น
  let swingT = 0;       // นาฬิกากวนผ้าซ้าย-ขวา
  let rotor = 0;        // มุมโรเตอร์

  // โหมดที่แต่ละขั้นควรอยู่ เพื่อให้ภาพตรงกับคำอธิบาย (index 0 = ขั้นที่ 1)
  const STEP_MODE = [0, 1, 1, 2, 1];
  const NSTEP = STEP_MODE.length;

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];
  const NCOL = () => css('--text-light');
  const TCOL = () => css('--text');

  /* ---------- ตรรกะไฟ ---------- */
  const washOn = () => modeA === 1;                                  // ลานซักจ่ายไฟแล้ว
  const spinPowered = () => modeA === 2 && fault !== 'doorsw';       // ไฟผ่านสวิตช์ฝาถังถึงมอเตอร์
  const capGood = () => fault !== 'capdead';
  // "มีไฟ" ไม่เท่ากับ "หมุนจริง" — นี่คือแก่นของคลินิก 3 เคสในหน้านี้
  const washSpins = () => washOn() && capGood();
  const spinSpins = () => spinPowered() && capGood() && fault !== 'brake';
  const buzzOn = () => step === 5 && modeA === 1;

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
  function glow(pts, color, on) {
    if (!on) return;
    ctx.save(); ctx.globalAlpha = 0.15 + 0.10 * Math.sin(tStep * 4);
    line(pts, color, 14); ctx.restore();
  }
  function probe(x, y, txt, live) {
    const c = live ? GREEN : RED, w = 48;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
    rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
    label(x, y + 4, txt, c, 10, 'center', 700);
  }
  function dot(x, y, c, r) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r || 3.4, 0, 7); ctx.fill();
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
  // horiz = สายที่คาปาฯ คั่นอยู่เป็นแนวนอน (แผ่นจึงต้องตั้ง) — วางผิดแนวแล้วอ่านวงจรไม่ออก
  function capSym(x, y, horiz, live, txt) {
    const c = !live ? NCOL() : capGood() ? BLUE : RED;
    if (horiz) {
      line([[x - 4, y - 13], [x - 4, y + 13]], c, 3);
      line([[x + 4, y - 13], [x + 4, y + 13]], c, 3);
    } else {
      line([[x - 13, y - 4], [x + 13, y - 4]], c, 3);
      line([[x - 13, y + 4], [x + 13, y + 4]], c, 3);
    }
    if (txt) label(x, y - 20, txt, c, 10, 'center', 700);
    if (live && !capGood()) label(x, y + 28, t('ค่า µF หาย', 'µF gone'), RED, 9.5, 'center', 700);
  }

  /* ---------- เส้นทางกระแส ---------- */
  const washPath = right => ([
    [A.x0 + 10, A.pY], [A.wtX + A.wtW / 2, A.pY], [A.wtX + A.wtW / 2, A.wtY + A.wtH / 2],
    [right ? A.wb : A.wa, A.wtY + A.wtH + 14], [right ? A.wb : A.wa, A.wmY],
    [A.wmX, A.wmY], [A.wmX, A.nY], [A.x0 + 10, A.nY]
  ]);
  const spinPath = () => ([
    [A.x0 + 10, A.pY], [A.stX + A.stW / 2, A.pY], [A.stX + A.stW / 2, A.snY],
    [A.snX, A.snY], [A.snX, A.smY], [A.smX, A.smY], [A.smX, A.nY], [A.x0 + 10, A.nY]
  ]);
  const buzzPath = () => ([
    [A.x0 + 10, A.pY], [A.bzX + A.bzW / 2, A.pY], [A.bzX + A.bzW / 2, A.bzY],
    [A.bzX + A.bzW / 2, A.bzY + A.bzH], [A.bzX + A.bzW / 2, A.nY], [A.x0 + 10, A.nY]
  ]);

  function drawFuse(hot) {
    const x = A.fuseX, y = A.pY, w = A.fuseW, c = hot ? VIOLET : TCOL();
    box(x, y - 15, w, 30, c);
    line([[x + 10, y], [x + w - 10, y]], c, 2.6);
    label(x + w / 2, y - 22, t('ฟิวส์ — ด่านแรกบนสาย P', 'fuse — first link on live'), hot ? VIOLET : NCOL(), 10.5, 'center', 700);
  }

  // ลานตั้งเวลากลไก: กล่อง + แขนสับราง (ลานซักสลับซ้าย-ขวา · ลานปั่นสับทางเดียว)
  function drawTimer(x, y, w, h, on, hot, th, en, arm) {
    const c = !on ? NCOL() : hot ? VIOLET : GREEN;
    box(x, y, w, h, c);
    const cx = x + 16, cy = y + h / 2;
    dot(cx, cy, c);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(arm);
    line([[0, 0], [w - 34, 0]], c, 2.6);
    ctx.restore();
    label(x + w / 2, y - 8, t(th, en), c, 11, 'center', 700);
  }

  function drawScene() {
    const s = step;
    const hotPower = s === 1, hotWash = s === 2, hotCap = s === 3, hotSpin = s === 4, hotEnd = s === 5;
    const swing = Math.sin(swingT * 1.1), right = swing >= 0;

    // ราง P / N + ปลั๊ก
    line([[A.x0 + 10, A.pY], [A.x1, A.pY]], hotPower ? VIOLET : RED, hotPower ? 3.2 : 2.4);
    line([[A.x0 + 10, A.nY], [A.x1, A.nY]], hotPower ? VIOLET : NCOL(), hotPower ? 3.2 : 2.4);
    label(A.x1, A.pY - 12, t('สาย P (Live) — แดง', 'P / live — red'), hotPower ? VIOLET : RED, 10.5, 'right', 700);
    label(A.x1, A.nY + 19, t('สาย N (Neutral) — ดำ · คอมมอนของโหลดทุกตัว',
                             'N / neutral — black · common to every load'), hotPower ? VIOLET : NCOL(), 10.5, 'right', 700);
    plug(A.x0 + 4, (A.pY + A.nY) / 2, A.pY, A.nY);
    drawFuse(hotPower);

    /* ---- ฝั่งซัก ---- */
    line([[A.wtX + A.wtW / 2, A.pY], [A.wtX + A.wtW / 2, A.wtY]], washOn() ? RED : NCOL(), 2.2);
    drawTimer(A.wtX, A.wtY, A.wtW, A.wtH, washOn(), hotWash, 'ลานซัก (Wash Timer)', 'wash timer',
              washOn() ? (right ? 0.32 : -0.32) : 0.32);

    const px = A.wtX + 16, py = A.wtY + A.wtH / 2;
    line([[px, py], [A.wa, A.wtY + A.wtH + 14], [A.wa, A.capY]], washOn() && !right ? RED : NCOL(), 2);
    line([[px, py], [A.wb, A.wtY + A.wtH + 14], [A.wb, A.capY]], washOn() && right ? RED : NCOL(), 2);

    // คาปาฯ คร่อมปลายขดทั้งสอง (สายแนวนอน → แผ่นตั้ง)
    line([[A.wa, A.capY], [A.capX - 12, A.capY]], hotCap ? VIOLET : NCOL(), hotCap ? 2.6 : 2);
    line([[A.capX + 12, A.capY], [A.wb, A.capY]], hotCap ? VIOLET : NCOL(), hotCap ? 2.6 : 2);
    capSym(A.capX, A.capY, true, washOn(), '10 µF');
    if (hotCap) label(A.capX, A.capY + 46, t('กระป๋องเดียว 4 สาย — 10 µF ซัก · 5 µF ปั่น',
                                             'one can, four wires — 10 µF wash · 5 µF spin'), VIOLET, 10, 'center', 700);

    line([[A.wa, A.capY], [A.wa, A.wmY]], washOn() && !right ? RED : NCOL(), 2);
    line([[A.wb, A.capY], [A.wb, A.wmY]], washOn() && right ? RED : NCOL(), 2);
    coil(A.wa, A.wmY, A.wmX - A.wmR, A.wmY, washOn() && !right ? RED : NCOL(), 4, 6);
    coil(A.wb, A.wmY, A.wmX + A.wmR, A.wmY, washOn() && right ? RED : NCOL(), 4, 6);
    // ป้ายขดลวดอยู่ใต้ขด — เหนือขดเป็นที่ของคำอธิบายคาปาซิเตอร์ซึ่งกว้างคร่อมทั้งสองขด
    label(A.wa, A.wmY + 20, t('ขดที่ 1', 'winding 1'), NCOL(), 9.5, 'center', 600);
    label(A.wb, A.wmY + 20, t('ขดที่ 2', 'winding 2'), NCOL(), 9.5, 'center', 600);
    motor(A.wmX, A.wmY, A.wmR, washOn(), washSpins(), right ? 1 : -1, t('มอเตอร์ซัก', 'wash motor'),
          washSpins() ? t(right ? 'หมุนขวา ▶' : '◀ หมุนซ้าย', right ? 'CW ▶' : '◀ CCW')
                      : washOn() ? t('ครางแต่ไม่ออกตัว', 'humming, will not start') : '');
    line([[A.wmX, A.wmY + A.wmR], [A.wmX, A.nY]], washOn() ? RED : NCOL(), 2.2);

    // สายดินมอเตอร์ซัก
    const eC = hotEnd ? GREEN : 'rgba(16,185,129,.5)';
    dash([[A.wmX - A.wmR, A.wmY], [A.weX + 16, A.wmY]], eC, hotEnd ? 2.6 : 1.8);
    earthSym(A.weX, A.wmY, eC, hotEnd ? t('สายดิน (E)', 'earth (E)') : '');

    /* ---- ออดเตือน ---- */
    const bz = buzzOn(), bc = bz ? ORANGE : NCOL();
    line([[A.bzX + A.bzW / 2, A.pY], [A.bzX + A.bzW / 2, A.bzY]], bc, 2.2);
    box(A.bzX, A.bzY, A.bzW, A.bzH, bc);
    label(A.bzX + A.bzW / 2, A.bzY + A.bzH / 2 + 6, bz ? '🔔' : '🔕', TCOL(), 16);
    label(A.bzX + A.bzW / 2, A.bzY - 8, t('ออดเตือน', 'buzzer'), bc, 10.5, 'center', 700);
    line([[A.bzX + A.bzW / 2, A.bzY + A.bzH], [A.bzX + A.bzW / 2, A.nY]], bc, 2.2);
    if (hotEnd) label(A.bzX + A.bzW / 2, A.bzY + A.bzH + 18,
                      t('รับ P จากหน้าสัมผัสชุดสุดท้ายของลานซัก', 'fed by the wash timer’s last contact'),
                      ORANGE, 9.5, 'center', 600);

    /* ---- ฝั่งปั่น ---- */
    line([[A.stX + A.stW / 2, A.pY], [A.stX + A.stW / 2, A.stY]], modeA === 2 ? RED : NCOL(), 2.2);
    drawTimer(A.stX, A.stY, A.stW, A.stH, modeA === 2, hotSpin, 'ลานปั่น (Spin Timer)', 'spin timer', modeA === 2 ? 0 : 0.32);
    line([[A.stX + A.stW / 2, A.stY + A.stH], [A.stX + A.stW / 2, A.dsY]], modeA === 2 ? RED : NCOL(), 2.2);

    // สวิตช์ฝาถังปั่น — อนุกรมบนเส้น P เปิดฝา = ตัดไฟทันที
    const dsOK = fault !== 'doorsw';
    const dsC = !dsOK ? RED : hotSpin ? VIOLET : TCOL();
    box(A.dsX, A.dsY, A.dsW, A.dsH, dsC);
    const dx0 = A.dsX + 20, dx1 = A.dsX + A.dsW - 20, dy = A.dsY + A.dsH / 2;
    dot(dx0, dy, dsC); dot(dx1, dy, dsC);
    line(dsOK ? [[dx0, dy], [dx1, dy]] : [[dx0, dy], [dx1 - 8, dy - 12]], dsC, 2.6);
    label(A.dsX + A.dsW / 2, A.dsY - 8, t('สวิตช์ฝาถังปั่น (อนุกรม)', 'spin-lid switch (in series)'), dsC, 10.5, 'center', 700);
    if (!dsOK) label(A.dsX + A.dsW / 2, A.dsY + A.dsH + 16, t('ขี้เกลือเกาะ → ไฟผ่านไม่ได้', 'corroded → no continuity'), RED, 9.5, 'center', 700);

    // โหนดหลังสวิตช์ → ขดรัน (ตรง) และ ขดสตาร์ท (ผ่านคาปาฯ ตายตัว)
    const spC = spinPowered() ? RED : NCOL();
    line([[A.stX + A.stW / 2, A.dsY + A.dsH], [A.stX + A.stW / 2, A.snY], [A.snX, A.snY]], spC, 2.2);
    dot(A.snX, A.snY, spC);
    line([[A.snX, A.snY], [A.snX, A.smY - 26]], spC, 2);
    coil(A.snX, A.smY - 26, A.snX, A.smY, spC, 4, 6);
    line([[A.snX, A.smY], [A.smX - A.smR, A.smY]], spC, 2);
    line([[A.snX, A.snY], [A.scX - 12, A.snY]], spC, 2);
    capSym(A.scX, A.snY, true, spinPowered(), '5 µF');
    line([[A.scX + 12, A.snY], [A.sbX, A.snY], [A.sbX, A.smY - 26]], spC, 2);
    coil(A.sbX, A.smY - 26, A.sbX, A.smY, spC, 4, 6);
    line([[A.sbX, A.smY], [A.smX + A.smR, A.smY]], spC, 2);
    motor(A.smX, A.smY, A.smR, spinPowered(), spinSpins(), 1, t('มอเตอร์ปั่น', 'spin motor'),
          spinPowered() && !spinSpins()
            ? (fault === 'brake' ? t('ไฟครบ แต่เบรกล็อกคอไว้', 'live, but the brake is clamped') : t('ครางแต่ไม่ออกตัว', 'humming, will not start'))
            : '');
    line([[A.smX, A.smY + A.smR], [A.smX, A.nY]], spC, 2.2);

    // สายดินมอเตอร์ปั่น
    dash([[A.smX + A.smR - 4, A.smY - 12], [A.seX, A.smY - 12], [A.seX, A.smY]], eC, hotEnd ? 2.6 : 1.8);
    earthSym(A.seX, A.smY, eC, hotEnd ? t('สายดิน (E)', 'earth (E)') : '');

    /* ---- ไฟไหล ---- */
    glow(washPath(right), RED, washSpins() && (s === 2 || s === 3));
    flowDots(washPath(right), RED, 70, washSpins());
    glow(spinPath(), RED, spinSpins() && s === 4);
    flowDots(spinPath(), RED, 95, spinPowered() && capGood());
    flowDots(buzzPath(), ORANGE, 60, bz);

    /* ---- ป้ายจุดวัด ---- */
    probe(A.fuseX + A.fuseW + 76, A.pY - 40, 'TP1', true);
    probe(A.wtX + A.wtW / 2, A.wtY - 34, 'TP2', washOn());
    probe(A.stX + A.stW / 2, A.stY - 34, 'TP3', modeA === 2);
    probe(A.dsX + 20, A.dsY + A.dsH + 30, 'TP4', spinPowered());
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
      msg = modeA === 1
        ? t('🌀 บิดลานซัก — ลานสับไฟสลับปลายขดซ้าย-ขวา มอเตอร์จึงกลับทางหมุนไปมาเพื่อกวนผ้า',
            '🌀 Wash timer wound — it alternates live between the two winding ends, so the motor reverses to agitate')
        : modeA === 2
          ? t('💨 บิดลานปั่น — ไฟต้องผ่านสวิตช์ฝาถังก่อนเสมอ มอเตอร์จึงหมุนทางเดียวด้วยรอบสูง',
              '💨 Spin timer wound — live must pass the lid switch first, then the motor runs one way at high speed')
          : t('⏹ ยังไม่บิดลานตั้งเวลา — ไฟ P รออยู่ที่ลานทั้งสองแล้ว แต่ยังไม่มีวงจรไหนครบวง',
              '⏹ No timer wound yet — live is waiting at both timers, but no loop is complete');
      color = modeA === 0 ? BLUE : GREEN;
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
    const agitating = washSpins();
    const spinning = spinSpins();
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
  const playBtn = document.getElementById('wmt-play');
  const modeBtn = document.getElementById('wmt-mode');
  const faultSel = document.getElementById('wmt-fault');

  const MODES = [['⏹ หยุด', '⏹ Idle'], ['🌀 บิดลานซัก', '🌀 Wash'], ['💨 บิดลานปั่น', '💨 Spin']];

  function syncMode() {
    const m = MODES[modeA];
    modeBtn.textContent = t(m[0], m[1]);
    modeBtn.classList.toggle('active', modeA > 0);
  }

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(NSTEP, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    modeA = STEP_MODE[step - 1];
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
    syncMode();
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('wmt-prev').addEventListener('click', () => setStep(step === 1 ? NSTEP : step - 1));
  document.getElementById('wmt-next').addEventListener('click', () => setStep(step === NSTEP ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  modeBtn.addEventListener('click', () => {
    modeA = (modeA + 1) % 3;
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
