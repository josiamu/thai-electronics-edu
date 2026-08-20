/* iron-circuit.js — Interactive step-by-step วงจรเตารีดแห้ง (iron.html, #irc-canvas ใน wrap #iron-circuit)
 *
 * วงจรเตารีดแห้งสั้นมาก จงใจทำแค่ 5 ขั้น ไม่ยืดเนื้อ:
 *   L → สายไฟ/ขั้วยางท้ายเตา → เทอร์โมสตัท → เทอร์โมฟิวส์ → ขั้วที่ 1 ของฮีตเตอร์
 *   N → ตรงเข้าขั้วที่ 2 ของฮีตเตอร์ (ครบวงจร)
 *   **หลอดนีออน + R ต่ออนุกรมกันแล้วคร่อมขั้วฮีตเตอร์ทั้งสอง (ขนานกับฮีตเตอร์)**
 *   E → ขันน็อตกับหน้าเตา/โครงโลหะ ไม่อยู่ในวงจรทำงาน
 *
 * **ผลที่ตามมาจากโทโพโลยีนี้ ซึ่งเป็นจุดสอนที่ดีที่สุดของหน้า — ห้ามทำหาย:**
 * ถ้า "ฮีตเตอร์ขาดใน" หลอดนีออนจะ **ยังติดอยู่** เพราะวงจรของนีออนเองครบวงผ่าน R ของมัน
 * ไม่ได้พึ่งฮีตเตอร์ → อาการหน้างานคือ "ไฟเข้า หลอดติด แต่ไม่ร้อนเลย"
 * ถ้าวาดนีออนอนุกรมกับฮีตเตอร์เมื่อไหร่ ข้อสรุปนี้จะพังทันที
 *
 * ปุ่ม #irc-stat สลับ "เทอร์โมสตัทกำลังต่อ ↔ ตัด (ถึงอุณหภูมิที่ตั้งไว้)" — สอนว่า
 * **วัดได้ 0V ที่ TP2 ไม่ได้แปลว่าเสียเสมอไป** ต้องดูก่อนว่าเตากำลังร้อนถึงจุดตั้งอยู่หรือเปล่า
 * (คู่กับ iron-sim.js ที่โชว์ว่าหน้าสัมผัสแกว่งตัด-ต่อรอบจุดตั้งตลอดเวลา)
 *
 * อาการเสีย 7 แบบตรงกับคลินิกในหน้า · เคส leak (ฮีตเตอร์รั่วลงโครง) จงใจให้ป้ายจุดวัด
 * แดงหมดเหมือนเคส cord เพราะของจริงก็แยกไม่ออกด้วยการไล่แรงดัน — ต้องวัดฉนวนเทียบโครงเท่านั้น
 *
 * **จุดที่วิ่งไม่ใช่ทิศกระแสจริง** — ไฟบ้าน AC 50Hz กระแสสลับทิศ 50 ครั้ง/วินาที
 * จุดที่วิ่งบอกแค่ว่าวงจรครบวงและมีกระแสไหล ทิศที่วาดเริ่มที่ขั้ว L ให้ตรงกับลำดับป้ายจุดวัด
 * ใช้ CSS .bs-* ร่วมกับหน้าอื่น และ query .bs-tab/.bs-desc **เฉพาะใน wrap ตัวเอง** เท่านั้น
 */
(function () {
  const root = document.getElementById('iron-circuit');
  const cv = document.getElementById('irc-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 900, H = 360;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  const G = {
    x0: 56, x1: 856,
    lY: 76, nY: 236,
    cordX: 108, cordW: 88,               // สายไฟ + ขั้วยางท้ายเตา (คร่อมทั้งสองราง)
    stX: 250, stW: 116,                  // เทอร์โมสตัท
    tfX: 430, tfW: 96,                   // เทอร์โมฟิวส์
    htX: 640,                            // ฮีตเตอร์ (แนวตั้งระหว่างสองราง)
    nnX: 790,                            // กิ่งหลอดนีออน + R
    plate: { x: 560, y: 262, w: 296, h: 22 },
    eX: 300, eY: 272                     // สายดิน
  };

  const FAULTS = {
    ok:      { th: 'วงจรปกติ — ไฟผ่านครบทุกด่าน ฮีตเตอร์ร้อนและหลอดนีออนติดพร้อมกัน',
               en: 'Healthy — power gets through every link, the element heats and the neon lights with it' },
    cord:    { th: 'สายไฟขาดในที่ขั้วยางท้ายเตา → เครื่องดับสนิท ไม่ร้อน หลอดไม่ติด · ขยับ/หักงอสายตรงขั้วยางขณะวัดโอห์ม ค่าจะกระพริบให้เห็น',
               en: 'Cord broken inside at the strain relief → completely dead, no heat, no lamp. Flex the cord at the boot while on ohms and the reading will flicker' },
    stat:    { th: 'หน้าสัมผัสเทอร์โมสตัทมีเขม่า/ไม่ต่อ → เครื่องดับสนิทเหมือนสายขาด แต่จุดวัดจะตายที่ TP2 ไม่ใช่ TP1',
               en: 'Sooty or open thermostat contacts → dead like a broken cord, but the trail dies at TP2 rather than TP1' },
    fuse:    { th: 'เทอร์โมฟิวส์ขาด → TP3 เป็น 0V · ขาดแล้วขาดถาวร ต้องเปลี่ยนตัวใหม่ และต้องหาสาเหตุที่ทำให้มันร้อนเกินด้วย',
               en: 'Thermal fuse open → TP3 reads 0 V. It never resets: fit a new one, and find what overheated it' },
    element: { th: 'ฮีตเตอร์ขาดใน → ไฟมาครบทุกจุด หลอดนีออน<b>ยังติดปกติ</b> แต่ไม่ร้อนเลย เพราะนีออนมีวงจรของตัวเองผ่าน R',
               en: 'Element open → every probe is live and the neon <b>still lights</b>, yet nothing heats: the lamp has its own path through its resistor' },
    neon:    { th: 'หลอดนีออนหรือ R ในกิ่งหลอดขาด → ร้อนปกติ ตัดต่อปกติ แต่หลอดไม่สว่าง · ไม่กระทบการใช้งาน แต่ลูกค้าจะเข้าใจว่าเครื่องเสีย',
               en: 'Neon lamp or its series resistor open → heats and cycles normally but the lamp stays dark. Harmless, though the customer will think it is broken' },
    leak:    { th: 'ฮีตเตอร์รั่วลงโครง → กระแสไหลลงสายดิน เบรกเกอร์กันดูดตัดทันที · <b>อาการเหมือนสายขาดเป๊ะ</b> แยกได้ทางเดียวคือวัดฉนวนขั้วฮีตเตอร์เทียบหน้าเตา ต้องขึ้น OL',
               en: 'Element leaking to the body → current returns through earth and the RCD trips at once. <b>It looks exactly like a broken cord</b>; the only way to tell is an insulation check from element terminal to soleplate, which must read OL' }
  };

  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', atTemp = false, last = performance.now();

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const NCOL = () => css('--text-light');
  const TCOL = () => css('--text');

  /* ---------- ตรรกะไฟ: ไล่ทีละด่านตามสายจริง ---------- */
  const tripped = () => fault === 'leak';
  const live1 = () => !tripped() && fault !== 'cord';                 // หลังสายไฟ
  const statClosed = () => fault !== 'stat' && !atTemp;               // หน้าสัมผัสต่ออยู่หรือไม่
  const live2 = () => live1() && statClosed();                        // หลังเทอร์โมสตัท
  const live3 = () => live2() && fault !== 'fuse';                    // หลังเทอร์โมฟิวส์ = ขั้วฮีตเตอร์
  const heaterRuns = () => live3() && fault !== 'element';
  const neonLit = () => live3() && fault !== 'neon';                  // นีออนไม่พึ่งฮีตเตอร์

  /* ---------- drawing helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function dash(pts, color, w) { ctx.save(); ctx.setLineDash([6, 5]); line(pts, color, w || 1.8); ctx.restore(); }
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
    for (let i = 0; i <= 70; i++) {
      const u = i / 70, s = Math.sin(u * Math.PI * (turns || 6)) * (amp || 9);
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
    const L = pathLen(p), gap = 42, off = (flowT * (speed || 70)) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      ctx.globalAlpha = .25; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function glow(pts, color, on) {
    if (!on) return;
    ctx.save(); ctx.globalAlpha = 0.15 + 0.10 * Math.sin(tStep * 4);
    line(pts, color, 14); ctx.restore();
  }
  function probe(x, y, txt, live) {
    const c = live ? GREEN : RED, w = 50;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
    rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
    label(x, y + 4, txt, c, 10, 'center', 700);
  }
  function earthSym(x, y, c) {
    line([[x, y], [x, y + 7]], c, 2);
    line([[x - 11, y + 7], [x + 11, y + 7]], c, 2.4);
    line([[x - 7, y + 12], [x + 7, y + 12]], c, 2.2);
    line([[x - 3, y + 17], [x + 3, y + 17]], c, 2);
  }

  /* ---------- เส้นทางกระแส ---------- */
  const heaterPath = () => ([[G.x0 + 12, G.lY], [G.htX, G.lY], [G.htX, G.nY], [G.x0 + 12, G.nY]]);
  const neonPath = () => ([[G.x0 + 12, G.lY], [G.nnX, G.lY], [G.nnX, G.nY], [G.x0 + 12, G.nY]]);

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const s = step;
    const hotCord = s === 1, hotStat = s === 2, hotFuse = s === 3, hotHeat = s === 4, hotNeon = s === 5;

    /* ราง L / N */
    const lc = live1() ? (hotCord ? VIOLET : RED) : NCOL();
    line([[G.x0 + 12, G.lY], [G.cordX, G.lY]], tripped() || fault === 'cord' ? NCOL() : RED, 2.4);
    line([[G.cordX + G.cordW, G.lY], [G.x1, G.lY]], lc, hotCord ? 3.2 : 2.4);
    line([[G.x0 + 12, G.nY], [G.x1, G.nY]], hotCord ? VIOLET : NCOL(), hotCord ? 3.2 : 2.4);
    label(G.x1, G.lY - 12, t('สาย L (แดง)', 'L / live (red)'), RED, 10.5, 'right', 700);
    label(G.x1, G.nY + 19, t('สาย N (น้ำเงิน) — ตรงเข้าขั้วที่ 2 ของฮีตเตอร์',
                             'N / neutral (blue) — straight to element terminal 2'), NCOL(), 10.5, 'right', 700);

    /* ปลั๊ก */
    box(G.x0 - 12, (G.lY + G.nY) / 2 - 24, 26, 48, NCOL());
    line([[G.x0 + 2, (G.lY + G.nY) / 2 - 12], [G.x0 + 12, (G.lY + G.nY) / 2 - 12], [G.x0 + 12, G.lY]], RED, 2.4);
    line([[G.x0 + 2, (G.lY + G.nY) / 2 + 12], [G.x0 + 12, (G.lY + G.nY) / 2 + 12], [G.x0 + 12, G.nY]], NCOL(), 2.4);
    label(G.x0 + 1, (G.lY + G.nY) / 2 + 44, t('ปลั๊ก 220V', '220 V plug'), NCOL(), 10, 'center', 600);

    /* สายไฟ + ขั้วยางท้ายเตา — จุดขาดในอันดับ 1 */
    const cordOK = fault !== 'cord';
    const cc = !cordOK ? RED : hotCord ? VIOLET : TCOL();
    box(G.cordX, G.lY - 22, G.cordW, G.nY - G.lY + 44, cc, 'rgba(148,163,184,.10)');
    if (cordOK) {
      line([[G.cordX, G.lY], [G.cordX + G.cordW, G.lY]], hotCord ? VIOLET : RED, 2.4);
    } else {
      line([[G.cordX, G.lY], [G.cordX + G.cordW / 2 - 9, G.lY]], RED, 2.4);
      line([[G.cordX + G.cordW / 2 + 9, G.lY], [G.cordX + G.cordW, G.lY]], RED, 2.4);
      label(G.cordX + G.cordW / 2, G.lY + 5, '✕', RED, 15, 'center', 700);
    }
    line([[G.cordX, G.nY], [G.cordX + G.cordW, G.nY]], NCOL(), 2.4);
    label(G.cordX + G.cordW / 2, G.lY - 30, t('สายไฟ + ขั้วยางท้ายเตา', 'cord + strain relief'), cc, 10.5, 'center', 700);
    if (hotCord || !cordOK) label(G.cordX + G.cordW / 2, G.nY + 40, t('จุดขาดในอันดับ 1', 'break happens here first'), cc, 9.5, 'center', 700);

    /* เทอร์โมสตัท — ไบเมทัล + สปริง */
    const sOK = fault !== 'stat';
    const sc = !sOK ? RED : hotStat ? VIOLET : atTemp ? BLUE : TCOL();
    box(G.stX, G.lY - 26, G.stW, 52, sc);
    const a0 = G.stX + 20, a1 = G.stX + G.stW - 20;
    ctx.fillStyle = sc;
    ctx.beginPath(); ctx.arc(a0, G.lY, 3.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(a1, G.lY, 3.4, 0, 7); ctx.fill();
    // แขนหน้าสัมผัส: ต่อ = แนวนอน · ตัด = โก่งขึ้น (ไบเมทัลชนะแรงสปริง)
    line(statClosed() ? [[a0, G.lY], [a1, G.lY]] : [[a0, G.lY], [a1 - 6, G.lY - 14]], sc, 2.8);
    label(G.stX + G.stW / 2, G.lY - 34, t('เทอร์โมสตัท (ไบเมทัล)', 'thermostat (bimetal)'), sc, 10.5, 'center', 700);
    label(G.stX + G.stW / 2, G.lY + 42,
          !sOK ? t('หน้าสัมผัสมีเขม่า', 'sooty contacts')
               : statClosed() ? t('ต่อ — ยังไม่ถึงอุณหภูมิ', 'closed — below set point')
                              : t('ตัด — ถึงอุณหภูมิแล้ว (ปกติ)', 'open — at set point (normal)'),
          sc, 9.5, 'center', 700);

    /* เทอร์โมฟิวส์ */
    const fOK = fault !== 'fuse';
    const fc = !fOK ? RED : hotFuse ? VIOLET : TCOL();
    box(G.tfX, G.lY - 17, G.tfW, 34, fc);
    if (fOK) line([[G.tfX + 12, G.lY], [G.tfX + G.tfW - 12, G.lY]], fc, 2.6);
    else {
      line([[G.tfX + 12, G.lY], [G.tfX + G.tfW / 2 - 8, G.lY]], RED, 2.6);
      line([[G.tfX + G.tfW / 2 + 8, G.lY], [G.tfX + G.tfW - 12, G.lY]], RED, 2.6);
      label(G.tfX + G.tfW / 2, G.lY + 5, '✕', RED, 14, 'center', 700);
    }
    label(G.tfX + G.tfW / 2, G.lY - 25, t('เทอร์โมฟิวส์ 250°C', 'thermal fuse 250°C'), fc, 10.5, 'center', 700);
    label(G.tfX + G.tfW / 2, G.lY + 32, fOK ? t('ปกติ (0Ω)', 'good (0Ω)') : t('ขาดถาวร (OL)', 'open for good (OL)'),
          fOK ? GREEN : RED, 9.5, 'center', 700);

    /* ฮีตเตอร์นิโครม */
    const eOK = fault !== 'element';
    const hc = !eOK ? RED : heaterRuns() ? (hotHeat ? VIOLET : ORANGE) : NCOL();
    if (heaterRuns()) {
      ctx.save(); ctx.globalAlpha = .10 + .06 * Math.sin(tStep * 5);
      ctx.fillStyle = ORANGE; rrect(G.htX - 26, G.lY + 8, 52, G.nY - G.lY - 16, 10); ctx.fill(); ctx.restore();
    }
    if (eOK) coil(G.htX, G.lY + 14, G.htX, G.nY - 14, hc, 7, 11);
    else {
      coil(G.htX, G.lY + 14, G.htX, G.lY + 62, RED, 3, 11);
      coil(G.htX, G.nY - 62, G.htX, G.nY - 14, RED, 3, 11);
      label(G.htX, G.lY + 90, '✕', RED, 16, 'center', 700);
      label(G.htX, G.lY + 110, t('ขดลวดขาดใน', 'winding open'), RED, 9.5, 'center', 700);
    }
    line([[G.htX, G.lY], [G.htX, G.lY + 14]], live3() ? RED : NCOL(), 2.4);
    line([[G.htX, G.nY - 14], [G.htX, G.nY]], NCOL(), 2.4);
    label(G.htX + 34, G.lY + 30, t('ฮีตเตอร์นิโครม', 'nichrome element'), hc, 10.5, 'left', 700);
    label(G.htX + 34, G.lY + 45, t('40–80 Ω', '40–80 Ω'), NCOL(), 9.5, 'left', 600);

    /* กิ่งหลอดนีออน + R — ขนานกับฮีตเตอร์ */
    const nOK = fault !== 'neon';
    const nc = !nOK ? RED : neonLit() ? (hotNeon ? VIOLET : ORANGE) : NCOL();
    line([[G.nnX, G.lY], [G.nnX, G.lY + 26]], live3() ? RED : NCOL(), 2.2);
    box(G.nnX - 13, G.lY + 26, 26, 42, nc);                       // ตัวต้านทานจำกัดกระแส
    label(G.nnX + 22, G.lY + 52, 'R', nc, 10.5, 'left', 700);
    line([[G.nnX, G.lY + 68], [G.nnX, G.lY + 92]], nc, 2.2);
    ctx.fillStyle = neonLit() ? ORANGE : css('--border');          // หลอดนีออน
    ctx.beginPath(); ctx.arc(G.nnX, G.lY + 104, 12, 0, 7); ctx.fill();
    if (neonLit()) {
      ctx.save(); ctx.globalAlpha = .3 + .12 * Math.sin(tStep * 7);
      ctx.beginPath(); ctx.arc(G.nnX, G.lY + 104, 20, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = nc; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(G.nnX, G.lY + 104, 12, 0, 7); ctx.stroke();
    line([[G.nnX, G.lY + 116], [G.nnX, G.nY]], nc, 2.2);
    label(G.nnX + 26, G.lY + 108, t('หลอดนีออน', 'neon lamp'), nc, 10.5, 'left', 700);
    if (!nOK) label(G.nnX + 26, G.lY + 122, t('ขาด — ไม่ติด', 'open — dark'), RED, 9.5, 'left', 700);

    /* หน้าเตา (โครงโลหะ) + สายดิน */
    const leaking = tripped();
    box(G.plate.x, G.plate.y, G.plate.w, G.plate.h, leaking ? RED : NCOL(), 'rgba(148,163,184,.14)');
    label(G.plate.x + G.plate.w / 2, G.plate.y + 15, t('หน้าเตา / โครงโลหะ — ฮีตเตอร์ฝังอยู่ข้างใน',
                                                       'soleplate / metal body — the element is buried inside'), NCOL(), 10, 'center', 700);
    const ec = leaking ? RED : 'rgba(16,185,129,.6)';
    dash([[G.plate.x, G.plate.y + G.plate.h / 2], [G.eX, G.eY]], ec, 2);
    earthSym(G.eX, G.eY, ec);
    label(G.eX, G.eY + 30, t('สายดิน (E) — ขันกับโครงเสมอ', 'earth (E) — always bolted to the body'), ec, 9.5, 'center', 700);
    if (leaking) {
      dash([[G.htX, G.lY + 120], [G.htX, G.plate.y]], RED, 2.4);
      label(G.htX + 8, G.lY + 150, t('ไฟรั่วลงโครง', 'leaking to the body'), RED, 9.5, 'left', 700);
    }

    /* ไฟไหล */
    glow(heaterPath(), ORANGE, heaterRuns() && hotHeat);
    flowDots(heaterPath(), RED, 75, heaterRuns());
    flowDots(neonPath(), ORANGE, 55, neonLit());

    /* ป้ายจุดวัด */
    probe(G.cordX + G.cordW + 26, G.lY - 44, 'TP1', live1());
    probe(G.stX + G.stW + 24, G.lY - 44, 'TP2', live2());
    probe(G.tfX + G.tfW + 26, G.lY - 44, 'TP3', live3());
    probe(470, G.nY + 22, 'TP4', !tripped());

    /* แถบสถานะ */
    let msg, color;
    if (fault !== 'ok') { msg = t(FAULTS[fault].th, FAULTS[fault].en).replace(/<\/?b>/g, ''); color = RED; }
    else if (atTemp) {
      msg = t('⚪ เทอร์โมสตัทตัดเพราะถึงอุณหภูมิที่ตั้งไว้ — TP2 กับ TP3 เป็น 0V และหลอดดับ นี่คือ "ปกติ" ไม่ใช่เสีย',
              '⚪ The thermostat has opened at its set point — TP2 and TP3 read 0 V and the lamp is dark. This is normal, not a fault');
      color = BLUE;
    } else {
      msg = t('🔴 หน้าสัมผัสต่อ — ไฟผ่านครบทุกด่านถึงฮีตเตอร์ หลอดนีออนติดพร้อมกับความร้อน',
              '🔴 Contacts closed — power reaches the element through every link, and the neon lights with the heat');
      color = GREEN;
    }
    ctx.fillStyle = color === GREEN ? 'rgba(16,185,129,.10)' : color === BLUE ? 'rgba(37,99,235,.10)' : 'rgba(239,68,68,.10)';
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    rrect(40, H - 32, 820, 26, 8); ctx.fill(); ctx.stroke();
    // ย่อ/ตัดข้อความให้พอดีกว้าง 792px กันล้นขอบแคนวาส (ข้อความ EN ยาวกว่า TH มาก)
    let sz = 11;
    for (; sz >= 8.5; sz -= 0.5) {
      ctx.font = '700 ' + sz + 'px Anuphan, sans-serif';
      if (ctx.measureText(msg).width <= 792) break;
    }
    if (ctx.measureText(msg).width > 792) {
      while (msg.length > 4 && ctx.measureText(msg + '…').width > 792) msg = msg.slice(0, -1);
      msg += '…';
    }
    label(54, H - 14, msg, color, sz, 'left', 700);
  }

  /* ---------- clock ---------- */
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (playing && tStep > 4.5) setStep(step % 5 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('irc-play');
  const statBtn = document.getElementById('irc-stat');
  const faultSel = document.getElementById('irc-fault');

  function syncStat() {
    statBtn.classList.toggle('active', atTemp);
    statBtn.querySelectorAll('.irc-on').forEach(e => e.style.display = atTemp ? 'none' : '');
    statBtn.querySelectorAll('.irc-off').forEach(e => e.style.display = atTemp ? '' : 'none');
  }
  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(5, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('irc-prev').addEventListener('click', () => setStep(step === 1 ? 5 : step - 1));
  document.getElementById('irc-next').addEventListener('click', () => setStep(step === 5 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  statBtn.addEventListener('click', () => { atTemp = !atTemp; syncStat(); });
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
  document.addEventListener('langchange', draw);
  resize();
  setStep(1);
  syncStat();
  requestAnimationFrame(frame);
})();
