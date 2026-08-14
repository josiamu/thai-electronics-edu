/* mw-circuit.js — Interactive step-by-step microwave circuit (microwave.html, #mwc-canvas)
 *
 * ฉากที่ 1 (ขั้น 1–7) — วงจรรวมทั้งเครื่องแบบขั้นบันได (ladder):
 *   รางซ้าย = สาย L (ผ่าน ฟิวส์ → TCO เตา → TCO แมกนีตรอน → Latch A) · รางขวา = สาย N
 *   รัง 1 main relay → หลอดไฟ/พัดลม/จานหมุน (ขนานกัน)
 *   รัง 2 grill relay → ฮีตเตอร์ย่าง
 *   รัง 3 **Latch B + power relay อนุกรมกัน** → หม้อแปลงแรงสูง
 *   รัง 4 หม้อแปลงเล็ก → บอร์ดควบคุม
 *   รัง 5 **monitor switch พาด L–N ตรงๆ ไม่มีโหลดคั่น** (NC: ต่อเมื่อ "เปิด" ประตู)
 *
 * ฉากที่ 2 (ขั้น 8–9) — วงจรทวีแรงดัน 2 จังหวะ:
 *   จังหวะ 1 ไดโอดนำ → C ชาร์จถึง 2,000V · จังหวะ 2 ไดโอดบล็อก → หม้อแปลง + C อนุกรมกัน = 4,000V DC
 *
 * กลไกที่ห้ามวาดผิด: **monitor switch ปิดวงจรตอนประตูเปิด** และเปิดวงจรตอนประตูปิด
 *   ถ้า Latch A ละลายติดค้าง พอเปิดประตู monitor จะลัด L–N เต็มๆ → ฟิวส์เมนขาดทันที
 *   (ปุ่มประตูในซิมทำให้เห็นการพลีชีพนี้จริงๆ — ตรงกับคลินิกอาการที่ 1)
 *
 * ใช้ CSS ชุด .bs-* ร่วมกับซิมทีละขั้นหน้าอื่น และ query .bs-tab/.bs-desc เฉพาะใน wrap ตัวเอง
 * จุดที่วิ่ง = กระแสสมมติ (+ → −)
 */
(function () {
  const root = document.getElementById('mw-circuit');
  const cv = document.getElementById('mwc-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 560;
  const LX = 190, NX = 830;                     // รางไฟ L (ซ้าย) / N (ขวา)
  const TOP_Y = 74, BOT_Y = 500;
  const RUNG = [166, 246, 326, 406, 470];       // y ของรัง 1–5
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- อาการเสีย (ตรงกับคลินิกช่างในหน้าเดียวกัน) ---------- */
  const FAULTS = {
    ok:        { th: 'วงจรปกติ — ปิดประตูแล้วกด Start ทุกรังทำงานตามหน้าที่',
                 en: 'Healthy — close the door, press Start and every rung does its job' },
    tco:       { th: 'เทอร์โมสตัท (TCO) ขาด → ตัดตั้งแต่ด่านบนสุด <b>เครื่องดับทั้งเครื่อง</b> ไม่ใช่เสียเฉพาะฟังก์ชันเดียว — ต้องหาสาเหตุที่ทำให้ร้อนเกินด้วย (พัดลมตัน/ใช้งานตอนไม่มีอาหาร)',
                 en: 'A thermal cutout has opened → it breaks the top chain and <b>the whole oven is dead</b>, not just one function. Find what overheated it (blocked fan, running empty)' },
    latchstuck:{ th: 'Latch A ละลายติดค้าง → <b>ลองเปิดประตูดู</b> monitor switch จะต่อทันทีขณะที่ L ยังจ่ายอยู่ = ลัดวงจร L–N เต็มๆ ฟิวส์เมนขาดกระจุย (นี่คืออาการ "ปิด-เปิดประตูแล้วฟิวส์ระเบิด" — เปลี่ยนฟิวส์อย่างเดียวไม่จบ ต้องเปลี่ยนสวิตช์ประตูยกชุด)',
                 en: 'Latch A has welded shut → <b>open the door</b> and the monitor switch closes while L is still live: a straight L–N short that destroys the mains fuse. This is the "fuse blows on opening the door" case — replacing the fuse alone never fixes it, the interlock set must be replaced' },
    latchb:    { th: 'Latch B ไม่ต่อ → รังที่ 3 ขาด หม้อแปลงแรงสูงไม่ได้ไฟ อาการคือ <b>จานหมุน ไฟติด พัดลมทำงาน แต่น้ำไม่ร้อน</b>',
                 en: 'Latch B never closes → rung 3 is broken and the HV transformer gets nothing: <b>the plate spins, the lamp is on, the fan runs, but nothing heats</b>' },
    hvdiode:   { th: 'ไดโอดแรงสูงช็อต → กระแสไหลผ่านตลอดจนหม้อแปลงโอเวอร์โหลด อาการคือ <b>ครางหึ่งๆ แล้วฟิวส์แรงสูงขาด</b> (กดขั้นที่ 8–9 ดูวงจรทวีแรงดัน)',
                 en: 'The HV diode is shorted → current flows continuously and overloads the transformer: <b>a loud hum, then the HV fuse blows</b> (see steps 8–9 for the doubler)' },
    magnetron: { th: 'แมกนีตรอน/ไส้หลอดขาด → ทุกอย่างครบ ไม่มีเสียงผิดปกติ แต่ <b>น้ำเย็นเจี๊ยบ</b> เพราะไม่มีกระแสไหลในภาคแรงสูงเลย',
                 en: 'The magnetron (or its filament) is open → everything looks and sounds normal but <b>the water stays cold</b>, because no current flows in the HV section at all' },
    grill:     { th: 'ฮีตเตอร์ย่างหรือรีเลย์ย่างเสีย → รังที่ 2 ขาด <b>เวฟได้ปกติแต่ย่างไม่ได้</b> — เป็นคนละรังกัน จึงเสียแยกกันได้',
                 en: 'The grill element or its relay has failed → rung 2 is broken: <b>microwaving works, grilling does not</b>. They are separate rungs, so they fail separately' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok';
  let door = true, start = true, fuseBlown = false, last = performance.now();

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];

  // สวิตช์ประตู 3 ตัว — latch A/B ต่อเมื่อ "ปิด" ประตู, monitor ต่อเมื่อ "เปิด" ประตู
  const latchA = () => (fault === 'latchstuck' ? true : door);
  const latchB = () => (fault === 'latchb' ? false : door);
  const monitor = () => !door;
  const shorted = () => latchA() && monitor();          // ลัด L–N ตรงๆ
  const topChain = () => !fuseBlown && fault !== 'tco' && latchA();
  const mainRelay = () => start && door;
  const grillRelay = () => start && door && fault !== 'grill';
  const powerRelay = () => start && door;
  const hvLive = () => topChain() && latchB() && powerRelay();
  const heating = () => hvLive() && fault !== 'magnetron' && fault !== 'hvdiode';

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
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function glow(pts, color, on) {
    if (!on) return;
    ctx.save(); ctx.globalAlpha = 0.15 + 0.10 * Math.sin(tStep * 4);
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
  function flowDots(p, color, speed, on) {
    if (!on) return;
    const L = pathLen(p), gap = 40, off = (flowT * speed) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function contact(x, y, on, color, vertical) {
    const c = on ? (color || GREEN) : ORANGE;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.6;
    const a = vertical ? [x, y - 13] : [x - 13, y], b = vertical ? [x, y + 13] : [x + 13, y];
    ctx.beginPath(); ctx.arc(a[0], a[1], 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(b[0], b[1], 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    if (on) ctx.lineTo(b[0], b[1]);
    else if (vertical) ctx.lineTo(b[0] + 13, b[1] - 4);
    else ctx.lineTo(b[0] - 4, b[1] - 13);
    ctx.stroke();
  }
  function loadBox(x, y, w, h, name, on, color) {
    const c = on ? (color || GREEN) : css('--text-light');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = on ? 2.6 : 2;
    rrect(x - w / 2, y - h / 2, w, h, 7); ctx.fill(); ctx.stroke();
    label(x, y + 4, name, c, 10.5, 'center', 700);
  }

  /* ---------- ฉากที่ 1: ladder ---------- */
  function drawLadder() {
    const txt = css('--text'), dim = css('--text-light');
    const live = topChain();

    // top chain: L in → fuse → TCO → TCO → latch A → รางซ้าย
    const chainY = TOP_Y;
    line([[40, chainY], [LX, chainY]], live ? RED : dim, 2.6);
    // fuse
    ctx.fillStyle = css('--card'); ctx.strokeStyle = fuseBlown ? RED : (step === 2 ? VIOLET : txt); ctx.lineWidth = 2.2;
    rrect(60, chainY - 11, 44, 22, 4); ctx.fill(); ctx.stroke();
    if (fuseBlown) {
      line([[60, chainY], [74, chainY]], RED, 2); line([[90, chainY], [104, chainY]], RED, 2);
      label(82, chainY - 18, t('ฟิวส์ขาด!', 'fuse blown!'), RED, 10.5, 'center', 700);
    } else {
      line([[60, chainY], [104, chainY]], txt, 2);
      label(82, chainY - 18, t('ฟิวส์เมน', 'main fuse'), step === 2 ? VIOLET : dim, 10, 'center', 700);
    }
    // two thermal cutouts
    const tcoOk = fault !== 'tco';
    contact(126, chainY, tcoOk, step === 2 ? VIOLET : GREEN);
    label(126, chainY + 26, 'TCO', tcoOk ? (step === 2 ? VIOLET : dim) : RED, 9.5, 'center', 700);
    contact(158, chainY, tcoOk, step === 2 ? VIOLET : GREEN);
    label(158, chainY + 26, 'TCO', tcoOk ? (step === 2 ? VIOLET : dim) : RED, 9.5, 'center', 700);
    label(40, chainY - 16, 'L', RED, 13, 'left', 700);

    // latch A sits on the L rail itself, just below the chain
    contact(LX, chainY + 34, latchA(), step === 2 || step === 7 ? VIOLET : GREEN, true);
    label(LX + 16, chainY + 38, 'Latch A', fault === 'latchstuck' ? RED : (step === 2 || step === 7 ? VIOLET : dim), 10.5, 'left', 700);
    if (fault === 'latchstuck') label(LX + 16, chainY + 52, t('ละลายติดค้าง', 'welded shut'), RED, 9.5, 'left', 700);

    // rails
    line([[LX, chainY + 34], [LX, BOT_Y]], live ? RED : dim, 3);
    line([[NX, chainY], [NX, BOT_Y]], BLUE, 3);
    line([[NX, chainY], [900, chainY]], BLUE, 2.6);
    label(900, chainY - 16, 'N', BLUE, 13, 'right', 700);

    // rung 1: main relay → lamp / fan / turntable in parallel
    let y = RUNG[0];
    const r1 = live && mainRelay();
    line([[LX, y], [NX, y]], r1 ? GREEN : dim, 2.2);
    contact(255, y, mainRelay(), step === 3 ? VIOLET : GREEN);
    label(255, y - 20, t('main relay', 'main relay'), step === 3 ? VIOLET : dim, 10, 'center', 700);
    loadBox(400, y, 92, 34, t('หลอดไฟ', 'lamp'), r1);
    loadBox(520, y, 92, 34, t('พัดลม', 'fan'), r1);
    loadBox(650, y, 104, 34, t('จานหมุน', 'turntable'), r1);
    label(LX - 8, y + 4, '1', step === 3 ? VIOLET : dim, 12, 'right', 700);

    // rung 2: grill relay → heater
    y = RUNG[1];
    const r2 = live && grillRelay();
    line([[LX, y], [NX, y]], r2 ? ORANGE : dim, 2.2);
    contact(255, y, grillRelay(), step === 4 ? VIOLET : GREEN);
    label(255, y - 20, t('grill relay', 'grill relay'), step === 4 ? VIOLET : dim, 10, 'center', 700);
    loadBox(520, y, 150, 34, t('ฮีตเตอร์ย่าง', 'grill element'), r2, ORANGE);
    if (fault === 'grill') label(650, y + 4, t('ขาด', 'open'), RED, 10.5, 'left', 700);
    label(LX - 8, y + 4, '2', step === 4 ? VIOLET : dim, 12, 'right', 700);

    // rung 3: latch B + power relay in series → HV transformer
    y = RUNG[2];
    const r3 = live && latchB() && powerRelay();
    line([[LX, y], [NX, y]], r3 ? RED : dim, 2.2);
    contact(255, y, latchB(), step === 5 || step === 7 ? VIOLET : GREEN);
    label(255, y - 20, 'Latch B', fault === 'latchb' ? RED : (step === 5 || step === 7 ? VIOLET : dim), 10, 'center', 700);
    contact(345, y, powerRelay(), step === 5 ? VIOLET : GREEN);
    label(345, y - 20, t('power relay', 'power relay'), step === 5 ? VIOLET : dim, 10, 'center', 700);
    loadBox(560, y, 170, 38, t('หม้อแปลงแรงสูง', 'HV transformer'), r3, RED);
    label(LX - 8, y + 4, '3', step === 5 ? VIOLET : dim, 12, 'right', 700);
    if (r3) label(690, y + 4, t('→ ภาคแรงสูง (ขั้น 8–9)', '→ HV section (steps 8–9)'), RED, 10, 'left', 700);

    // rung 4: LV transformer → control board
    y = RUNG[3];
    const r4 = live;
    line([[LX, y], [NX, y]], r4 ? BLUE : dim, 2.2);
    loadBox(400, y, 150, 34, t('หม้อแปลงเล็ก', 'LV transformer'), r4, BLUE);
    loadBox(600, y, 120, 34, t('บอร์ดควบคุม', 'control board'), r4, BLUE);
    label(LX - 8, y + 4, '4', step === 6 ? VIOLET : dim, 12, 'right', 700);
    if (step === 6) label(700, y + 4, t('รังนี้มีไฟตลอดเวลาที่เสียบปลั๊ก', 'this rung is live whenever it is plugged in'), VIOLET, 10, 'left', 700);

    // rung 5: monitor switch straight across L–N, no load at all
    y = RUNG[4];
    const mon = monitor();
    line([[LX, y], [NX, y]], shorted() ? RED : dim, shorted() ? 3.4 : 2.2);
    contact(430, y, mon, step === 7 ? VIOLET : ORANGE);
    label(430, y - 20, t('monitor switch (NC)', 'monitor switch (NC)'), step === 7 ? VIOLET : dim, 10, 'center', 700);
    label(620, y + 4, t('ไม่มีโหลดคั่นเลย', 'no load in between'), shorted() ? RED : dim, 10, 'left', 700);
    label(LX - 8, y + 4, '5', step === 7 ? VIOLET : dim, 12, 'right', 700);

    // glow + current dots on the rung being discussed
    const rungPath = i => [[LX, RUNG[i]], [NX, RUNG[i]], [NX, TOP_Y], [40, TOP_Y]];
    glow(rungPath(0), GREEN, step === 3 && r1);
    glow(rungPath(1), ORANGE, step === 4 && r2);
    glow(rungPath(2), RED, step === 5 && r3);
    glow(rungPath(3), BLUE, step === 6 && r4);
    flowDots(rungPath(0), GREEN, 110, (step === 1 || step === 3) && r1);
    flowDots(rungPath(1), ORANGE, 110, step === 4 && r2);
    flowDots(rungPath(2), RED, 110, (step === 1 || step === 5) && r3);
    flowDots(rungPath(3), BLUE, 110, (step === 1 || step === 6) && r4);

    if (shorted()) {
      glow([[LX, RUNG[4]], [NX, RUNG[4]]], RED, true);
      flowDots([[LX, RUNG[4]], [NX, RUNG[4]]], RED, 220, !fuseBlown);
      label(W / 2, BOT_Y + 22,
        t('⚡ Latch A ยังต่ออยู่ + monitor ต่อ = ลัดวงจร L–N โดยตรง → ฟิวส์เมนต้องขาดเพื่อพลีชีพ',
          '⚡ Latch A still closed + monitor closed = a direct L–N short → the mains fuse must sacrifice itself'),
        RED, 12, 'center', 700);
    }

    if (step === 1) {
      label(W / 2, 30, t('รางซ้าย = สาย L · รางขวา = สาย N · โหลดแต่ละกลุ่มพาดขวางเป็นขั้นบันได',
                         'left rail = L · right rail = N · each load group bridges across like a ladder rung'),
            txt, 12.5, 'center', 700);
    }
  }

  /* ---------- ฉากที่ 2: วงจรทวีแรงดัน ---------- */
  function drawDoubler() {
    const txt = css('--text'), dim = css('--text-light');
    // จังหวะ: ขั้น 8 = ไดโอดนำ (ชาร์จ C) · ขั้น 9 = ไดโอดบล็อก (อนุกรมกัน 4,000V)
    const strokeOne = step === 8;
    const bad = fault === 'hvdiode', dead = fault === 'magnetron';

    const TX = 150, CX = 430, DX = 560, MX = 760, TOPY = 180, BOTY = 400;

    // หม้อแปลงแรงสูง (ขดทุติยภูมิ 2,000V)
    ctx.strokeStyle = step >= 8 ? RED : txt; ctx.lineWidth = 2.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(TX, TOPY + 30 + i * 26, 13, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
    label(TX - 26, TOPY + 10, t('หม้อแปลงแรงสูง', 'HV transformer'), RED, 11, 'right', 700);
    label(TX - 26, TOPY + 28, '2,000V AC', RED, 12, 'right', 700);
    line([[TX, TOPY + 17], [TX, TOPY]], txt);
    line([[TX, TOPY], [CX - 60, TOPY]], txt, 2.4);
    line([[TX, TOPY + 121], [TX, BOTY]], txt);
    line([[TX, BOTY], [MX, BOTY]], txt, 2.4);

    // ฟิวส์แรงสูง
    ctx.fillStyle = css('--card'); ctx.strokeStyle = bad ? RED : txt; ctx.lineWidth = 2.2;
    rrect(CX - 150, TOPY - 11, 46, 22, 4); ctx.fill(); ctx.stroke();
    if (bad) { line([[CX - 150, TOPY], [CX - 136, TOPY]], RED, 2); line([[CX - 118, TOPY], [CX - 104, TOPY]], RED, 2); }
    else line([[CX - 150, TOPY], [CX - 104, TOPY]], txt, 2);
    label(CX - 127, TOPY - 18, bad ? t('HV fuse ขาด', 'HV fuse blown') : t('ฟิวส์แรงสูง', 'HV fuse'),
          bad ? RED : dim, 10, 'center', 700);

    // คาปาซิเตอร์แรงสูง (อนุกรมบนเส้นบน)
    line([[CX - 60, TOPY], [CX - 12, TOPY]], txt, 2.4);
    ctx.strokeStyle = strokeOne ? ORANGE : VIOLET; ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(CX - 12, TOPY - 20); ctx.lineTo(CX - 12, TOPY + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CX + 12, TOPY - 20); ctx.lineTo(CX + 12, TOPY + 20); ctx.stroke();
    line([[CX + 12, TOPY], [DX, TOPY]], txt, 2.4);
    label(CX, TOPY - 30, t('C แรงสูง ~1µF', 'HV capacitor ~1µF'), strokeOne ? ORANGE : VIOLET, 10.5, 'center', 700);
    // ป้ายทุกอันต้องอิงสถานะจริงของรังที่ 3 ไม่งั้นจะโชว์ว่าทำงานทั้งที่ไฟยังมาไม่ถึง
    label(CX, TOPY + 38, !hvLive() ? t('ยังไม่มีไฟเข้ามา', 'no supply yet')
                                   : strokeOne ? t('กำลังชาร์จ → 2,000V', 'charging → 2,000V')
                                               : t('อัดไว้เต็ม 2,000V', 'holding 2,000V'),
          !hvLive() ? css('--text-light') : strokeOne ? ORANGE : VIOLET, 11, 'center', 700);
    // bleeder resistor ขนานกับ C
    dash([[CX - 12, TOPY + 20], [CX - 12, TOPY + 56], [CX + 12, TOPY + 56], [CX + 12, TOPY + 20]], dim, 1.4);
    label(CX + 20, TOPY + 60, t('bleeder R (อย่าไว้ใจ)', 'bleeder R (never trust it)'), dim, 9.5, 'left');

    // ไดโอดแรงสูง ลงโครงเหล็ก
    line([[DX, TOPY], [DX, TOPY + 60]], txt, 2.4);
    const dOn = hvLive() && (strokeOne || bad);
    ctx.fillStyle = bad ? RED : dOn ? GREEN : dim; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(DX - 12, TOPY + 60); ctx.lineTo(DX + 12, TOPY + 60); ctx.lineTo(DX, TOPY + 84); ctx.closePath(); ctx.fill();
    line([[DX - 13, TOPY + 84], [DX + 13, TOPY + 84]], ctx.fillStyle, 2.8);
    line([[DX, TOPY + 84], [DX, BOTY]], txt, 2.4);
    label(DX + 18, TOPY + 74, bad ? t('ไดโอดช็อต', 'diode shorted')
                                  : !hvLive() ? t('รอไฟจากรังที่ 3', 'waiting on rung 3')
                                  : dOn ? t('ไดโอดนำกระแส', 'diode conducting')
                                        : t('ไดโอดบล็อก', 'diode blocking'),
          bad ? RED : !hvLive() ? dim : dOn ? GREEN : dim, 10.5, 'left', 700);

    // แมกนีตรอน
    const firing = heating() && !strokeOne;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = dead ? RED : firing ? RED : txt; ctx.lineWidth = 2.6;
    rrect(MX - 60, TOPY - 40, 120, 96, 12); ctx.fill(); ctx.stroke();
    label(MX, TOPY - 14, t('แมกนีตรอน', 'magnetron'), dead ? RED : txt, 12, 'center', 700);
    label(MX, TOPY + 6, dead ? t('ไส้หลอดขาด', 'filament open')
                             : !hvLive() ? t('ไม่มีไฟเข้าภาคแรงสูง', 'HV section unpowered')
                                         : firing ? t('4,000V → ยิงคลื่น', '4,000V → firing')
                                                  : t('ยังไม่ทำงาน', 'not firing yet'),
          dead ? RED : firing ? RED : dim, 10.5, 'center', 700);
    line([[DX, TOPY], [MX - 60, TOPY]], txt, 2.4);
    line([[MX, TOPY + 56], [MX, BOTY]], txt, 2.4);
    label(MX + 70, BOTY - 10, t('โครงเหล็ก (กราวด์)', 'chassis (ground)'), dim, 10, 'left');

    // เส้นทางกระแสของแต่ละจังหวะ
    const P1 = [[TX, TOPY], [CX, TOPY], [DX, TOPY], [DX, BOTY], [TX, BOTY], [TX, TOPY]];
    const P2 = [[TX, TOPY], [CX, TOPY], [MX, TOPY], [MX, BOTY], [TX, BOTY], [TX, TOPY]];
    if (!dead && !bad) {
      glow(strokeOne ? P1 : P2, strokeOne ? ORANGE : RED, hvLive());
      flowDots(strokeOne ? P1 : P2, strokeOne ? ORANGE : RED, 120, hvLive());
    } else if (bad) {
      glow(P1, RED, hvLive());
    }

    label(W / 2, 44, strokeOne
      ? t('จังหวะที่ 1 — ไดโอดนำกระแสลงโครงเหล็ก คาปาซิเตอร์ถูกชาร์จจนถึง 2,000V',
          'Stroke 1 — the diode conducts to chassis and the capacitor charges to 2,000 V')
      : t('จังหวะที่ 2 — ไฟกลับขั้ว ไดโอดบล็อก หม้อแปลง 2,000V + C 2,000V อนุกรมกัน = 4,000V DC',
          'Stroke 2 — the mains reverses, the diode blocks, and transformer + capacitor add in series = 4,000 V DC'),
      strokeOne ? ORANGE : RED, 13, 'center', 700);
    if (!hvLive()) {
      label(W / 2, 70, t('(ตอนนี้รังที่ 3 ยังไม่ครบวงจร — ปิดประตูและกด Start เพื่อจ่ายไฟให้หม้อแปลง)',
                         '(rung 3 is not complete — close the door and press Start to feed the transformer)'),
            ORANGE, 11, 'center', 700);
    }
    label(W / 2, BOT_Y + 30, t('⚠ C แรงสูงยังอมไฟ 2,000V หลังถอดปลั๊ก — ต้องคายประจุด้วยคีมฉนวนก่อนแตะทุกครั้ง',
                               '⚠ The HV capacitor still holds 2,000 V after unplugging — always discharge it with insulated pliers before touching anything'),
          RED, 11.5, 'center', 700);
  }

  /* ---------- แถบสถานะ ---------- */
  function statusBar() {
    const bad = fault !== 'ok' || fuseBlown;
    const msg = fuseBlown
      ? t('💥 ฟิวส์เมนขาดแล้ว — กดปุ่ม "เปลี่ยนฟิวส์" เพื่อลองใหม่ แต่ถ้าไม่แก้ต้นเหตุ ใส่กี่ตัวก็ขาดอีก',
          '💥 The mains fuse has blown — press "new fuse" to try again, but until the cause is fixed every fuse will blow')
      : fault !== 'ok' ? t(F().th, F().en).replace(/<\/?b>/g, '')
      : !door ? t('🚪 ประตูเปิดอยู่ → Latch A/B ตัด และ monitor ต่อ = สภาพปลอดภัยที่ถูกต้อง',
                  '🚪 The door is open → latches A and B open, the monitor closes: the correct safe state')
      : !start ? t('⏸ ปิดประตูแล้วแต่ยังไม่ได้กด Start → รีเลย์ยังไม่ดึง ไม่มีรังไหนทำงาน',
                   '⏸ Door closed but Start not pressed → no relay is energised and no rung runs')
      : t('✅ ปิดประตู + กด Start → ครบทุกเงื่อนไข เตาทำงานเต็มระบบ',
          '✅ Door closed and Start pressed → every condition is met and the oven runs');
    ctx.fillStyle = bad ? 'rgba(239,68,68,.10)' : 'rgba(16,185,129,.10)';
    ctx.strokeStyle = bad ? RED : GREEN; ctx.lineWidth = 1.4;
    rrect(30, H - 40, W - 60, 28, 8); ctx.fill(); ctx.stroke();
    label(44, H - 21, msg, bad ? RED : GREEN, 11.5, 'left', 700);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (step >= 8) drawDoubler(); else drawLadder();
    statusBar();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    // ลัดวงจรแล้วฟิวส์ต้องขาด — ต้องเรียก syncToggles() ด้วย ไม่งั้นปุ่ม "เปลี่ยนฟิวส์" ไม่โผล่
    if (shorted() && !fuseBlown && tStep > 0.6) { fuseBlown = true; syncToggles(); }
    if (playing && tStep > 4.5) setStep(step % 9 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('mwc-play');
  const doorBtn = document.getElementById('mwc-door');
  const startBtn = document.getElementById('mwc-start');
  const fuseBtn = document.getElementById('mwc-fuse');
  const faultSel = document.getElementById('mwc-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(9, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncToggles() {
    doorBtn.classList.toggle('active', door);
    doorBtn.querySelectorAll('.mwc-closed').forEach(e => e.style.display = door ? '' : 'none');
    doorBtn.querySelectorAll('.mwc-open').forEach(e => e.style.display = door ? 'none' : '');
    startBtn.classList.toggle('active', start);
    startBtn.querySelectorAll('.mwc-run').forEach(e => e.style.display = start ? '' : 'none');
    startBtn.querySelectorAll('.mwc-stop').forEach(e => e.style.display = start ? 'none' : '');
    fuseBtn.style.display = fuseBlown ? '' : 'none';
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('mwc-prev').addEventListener('click', () => setStep(step === 1 ? 9 : step - 1));
  document.getElementById('mwc-next').addEventListener('click', () => setStep(step === 9 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  doorBtn.addEventListener('click', () => { door = !door; tStep = 0; syncToggles(); });
  startBtn.addEventListener('click', () => { start = !start; syncToggles(); });
  fuseBtn.addEventListener('click', () => { fuseBlown = false; tStep = 0; syncToggles(); });
  faultSel.addEventListener('change', () => {
    fault = FAULTS[faultSel.value] ? faultSel.value : 'ok';
    fuseBlown = false; tStep = 0;
    root.querySelectorAll('.bs-faultnote').forEach(e => e.classList.toggle('active', fault !== 'ok'));
    syncToggles();
  });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  syncToggles();
  requestAnimationFrame(frame);
})();
