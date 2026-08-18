/* rice-circuit.js — Interactive step-by-step rice cooker circuit (rice-cooker.html, #rc-canvas)
 *
 * 2 ฉากในแคนวาสเดียว (แบบเดียวกับ mw-circuit.js):
 *   ขั้น 1–6 = รุ่นกลไก/อุ่นทิพย์
 *      L → เทอร์โมฟิวส์ → ขั้วบนฮีตเตอร์หลัก
 *      N → ขา C ของไมโครสวิตช์ → สับรางเป็น 2 ทาง
 *         COOK: ตรงเข้าฮีตเตอร์หลัก (220V เต็ม ~970W)
 *         WARM: ผ่านเทอร์โมสตัท → ฮีตเตอร์ฝา/ข้าง → **อนุกรมกลับเข้าฮีตเตอร์หลัก** → L
 *      **ห้ามวาดชุดอุ่นแบบขนาน** ทั้งบทที่ 6 (แบ่งแรงดัน 215V/5V) อยู่บนข้อนี้
 *   ขั้น 7–9 = รุ่นดิจิทัล
 *      L → เทอร์โมฟิวส์ → บอร์ด: SMPS 220V→5V → MCU (อ่าน NTC) → รีเลย์ → **ฮีตเตอร์ทุกชิ้นขนานกัน**
 *      MCU ↔ บอร์ดหน้าจอ ด้วยสาย UART 4 เส้น (VCC/GND/TXD/RXD) — ขาดเส้นเดียวเครื่องรวน
 *
 * **สวิตช์อยู่ฝั่ง N ไม่ใช่ฝั่ง L** (ตามใบความรู้ต้นทาง) → ขั้วบนของฮีตเตอร์ต่อกับ L ผ่านเทอร์โมฟิวส์
 * อย่างเดียว จึง **มีไฟ 220V ตลอดเวลาที่เสียบปลั๊ก** ไม่ว่าสวิตช์จะอยู่ตำแหน่งไหน — ป้าย "ขั้วนี้มีไฟตลอด"
 * บนแคนวาสกับกล่องเตือนในหน้าอิงข้อนี้ ถ้าจะย้ายสวิตช์ไปฝั่ง L ต้องแก้ทั้งสองที่ด้วย
 *
 * ปุ่ม 🍚 เดินเวลาจำลองการหุง: ไต่ขึ้น → พลาโต 100°C → พุ่ง → แม่เหล็กปล่อยที่ 103°C เข้าโหมดอุ่น
 * อาการเสีย 7 แบบตรงกับคลินิกในหน้า — โดยเฉพาะ swstuck (สวิตช์ละลายติดค้าง) ที่ปล่อยไว้แล้ว
 * **เทอร์โมฟิวส์จะขาดจริงต่อหน้า** เพื่อสอนว่าฟิวส์ขาดไม่ได้ขาดเอง มันขาดเพราะมีต้นเหตุ
 * **จุดที่วิ่งไม่ใช่ทิศกระแสจริง** — หน้านี้เป็นไฟบ้าน AC 50Hz กระแสสลับทิศ 50 ครั้ง/วินาที
 * จุดที่วิ่งบอกแค่ว่า "วงจรครบวงและมีกระแสไหล" เท่านั้น (ต่างจากซิม DC อย่าง bjt-circuit.js
 * ที่ทิศ +→− มีความหมายจริง) ทิศที่วาดจึงเลือกให้ **เริ่มที่ขั้ว L → โหลด → ออกทาง N** เพื่อให้
 * ตรงกับลำดับป้ายจุดวัดที่ไล่ซ้าย→ขวา และตรงกับ wh-circuit.js — อย่ากลับทิศโดยไม่แก้ทั้งสองที่
 * ใช้ CSS .bs-* ร่วมกับหน้าอื่น และ query .bs-tab/.bs-desc เฉพาะใน wrap ตัวเองเท่านั้น
 */
(function () {
  const root = document.getElementById('rice-circuit');
  const cv = document.getElementById('rc-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 420;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6', CYAN = '#06b6d4';

  /* ---------- geometry: ฉาก A (รุ่นกลไก) ---------- */
  const A = {
    x0: 60, x1: 890,
    lY: 96, nY: 300,            // ราง L บน / ราง N ล่าง
    fuseX: 140, fuseW: 84,      // เทอร์โมฟิวส์บนเส้น L
    swX: 250, swW: 70,          // ไมโครสวิตช์ 3 ขา (C / COOK / WARM)
    cookY: 250, warmY: 352,     // ระดับสายฝั่ง COOK และฝั่ง WARM
    statX: 430, statW: 86,      // เทอร์โมสตัทคุมอุ่น (อยู่บนสาย WARM)
    warmX: 570, warmW: 130,     // ชุดฮีตเตอร์ฝา + ข้าง
    heatX: 812                  // ฮีตเตอร์หลัก (แนวตั้ง เชื่อมราง L กับโหนดล่าง)
  };

  /* ---------- geometry: ฉาก B (รุ่นดิจิทัล) ---------- */
  const B = {
    x0: 60, x1: 890,
    lY: 84, nY: 360,
    fuseX: 120, fuseW: 80,
    board: { x: 220, y: 128, w: 380, h: 168 },
    smps: { x: 240, y: 154, w: 120, h: 62 },
    mcu: { x: 392, y: 154, w: 118, h: 62 },
    relay: { x: 392, y: 230, w: 176, h: 54 },
    disp: { x: 660, y: 132, w: 210, h: 84 },
    busY: 306,                                   // บัส 220V จากหน้าสัมผัสรีเลย์ไปหาฮีตเตอร์
    heaters: [{ x: 668, th: 'ฮีตเตอร์หลัก', en: 'main' },
              { x: 762, th: 'ฝาหม้อ', en: 'lid' },
              { x: 856, th: 'ด้านข้าง', en: 'side' }]
  };

  /* ---------- อาการเสีย (ตรงกับคลินิก 7 เคสในหน้า) ---------- */
  const FAULTS = {
    ok:       { scene: 0,
                th: 'วงจรปกติ — กดหุงแล้วฮีตเตอร์หลักทำงานเต็มกำลัง พอน้ำแห้งแม่เหล็กก็ปล่อยเข้าโหมดอุ่นเอง',
                en: 'Healthy — press Cook and the main element runs at full power; when the water is gone the magnet releases into Warm' },
    fuse:     { scene: 0,
                th: 'เทอร์โมฟิวส์ขาด → ไฟตายตั้งแต่ด่านแรก เครื่องเงียบสนิท หลอดไม่ติดสักดวง · <b>ขาดแล้วขาดถาวร</b> และต้องหาสาเหตุที่ทำให้มันร้อนเกินด้วย',
                en: 'The thermal fuse is open → power dies at the first link and the cooker is completely dead. <b>It never resets</b>, and something did overheat to blow it' },
    magnet:   { scene: 'A',
                th: 'แม่เหล็กเสื่อม/สปริงล้า → แรงดูดไม่พอ สวิตช์หลุดกลางช่วงน้ำเดือด ทั้งที่น้ำยังเหลือ = <b>ข้าวดิบ น้ำฉ่ำ</b>',
                en: 'A weak magnet or tired spring → the switch drops out mid-boil with water still in the pot = <b>raw, wet rice</b>' },
    swstuck:  { scene: 'A',
                th: 'หน้าสัมผัสไมโครสวิตช์ละลายติดค้างที่ COOK → ฮีตเตอร์เต็มกำลังไม่มีวันหยุด ข้าวไหม้ และสุดท้าย <b>เทอร์โมฟิวส์จะขาดเพื่อกันไฟไหม้</b>',
                en: 'The micro-switch contacts are welded in COOK → full power never stops, the rice burns, and finally <b>the thermal fuse blows to prevent a fire</b>' },
    warmopen: { scene: 'A',
                th: 'ชุดฮีตเตอร์อุ่น/สายบานพับฝาขาดใน → หุงได้ปกติ แต่พอเข้าโหมดอุ่นไม่มีกระแสไหลเลย <b>วัดคร่อมจุดขาดจะได้ 220V เต็มแต่ไม่ร้อน</b>',
                en: 'The warming element or its hinge wiring is open → cooking is fine, but in Warm no current flows at all. <b>Across the break you read a full 220 V yet nothing heats</b>' },
    relay:    { scene: 'B',
                th: 'รุ่นดิจิทัล: หน้าสัมผัสรีเลย์ไหม้/ไม่จ่ายไฟ → หน้าจอติด นับถอยหลังปกติ แต่บัส 220V ฝั่งฮีตเตอร์เป็น 0V',
                en: 'Digital: the relay contacts are burnt → the display works and the countdown runs, but the 220 V bus to the elements reads 0 V' },
    ntc:      { scene: 'B',
                th: 'รุ่นดิจิทัล: NTC ขาด (หรือสาย TXD/RXD หลุด) → สมองกลได้ค่าผิด ขึ้น Error แล้วไม่สั่งรีเลย์เลย',
                en: 'Digital: the NTC is open (or a TXD/RXD wire is loose) → the controller gets nonsense, shows an error and never energises the relay' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', last = performance.now();
  let cooking = false, cookT = 0, temp = 30, blown = false;

  const T_RAMP = 6, T_PLATEAU = 10;              // วินาที (เวลาจำลอง) ของช่วงไต่ขึ้นและช่วงน้ำเดือด
  const T_CURIE = 103, T_FUSE = 185;             // จุดคูรี และอุณหภูมิที่เทอร์โมฟิวส์ขาด
  const SIM_SPEED = 1.2;                         // เท่าของเวลาจริง → ช่วงไต่ขึ้นใช้เวลาดูราว 5 วินาที
  const RISE_DRY = 6;                            // °C ต่อวินาทีจำลอง ช่วงน้ำเพิ่งแห้ง (ยังมีไอน้ำหน่วงอยู่บ้าง)
  const RISE_RUNAWAY = 20;                       // เกิน 110°C = แห้งสนิท ไม่มีน้ำหน่วงแล้ว อุณหภูมิพุ่งเร็วขึ้น

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];
  const sceneB = () => step >= 7;

  const fuseOK = () => fault !== 'fuse' && !blown;
  const digitalRuns = () => fuseOK() && fault !== 'relay' && fault !== 'ntc';
  // ฉาก A: มีกระแสไหลจริงในทางไหน
  const cookRuns = () => fuseOK() && cooking;
  const warmRuns = () => fuseOK() && !cooking && fault !== 'warmopen' && fault !== 'swstuck';

  // แรงดันคร่อมอุปกรณ์ (สอนเรื่องแบ่งแรงดันในขั้นที่ 6)
  function volts() {
    if (!fuseOK()) return { main: 0, warm: 0 };
    if (cooking) return { main: 220, warm: 0 };
    if (fault === 'warmopen') return { main: 0, warm: 220 };   // ขาดใน: แรงดันมาเต็มแต่ไม่มีกระแส
    return { main: 5, warm: 215 };
  }

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
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath();
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, s = Math.sin(u * Math.PI * (turns || 5)) * (amp || 9);
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
    const L = pathLen(p), gap = 42, off = (flowT * speed) % gap;
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
    const c = live ? GREEN : RED, w = 46;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
    rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
    label(x, y + 4, txt, c, 10, 'center', 700);
  }
  function lamp(x, y, on, color) {
    ctx.fillStyle = on ? color : css('--border');
    ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    if (on) {
      ctx.save(); ctx.globalAlpha = .25 + .15 * Math.sin(tStep * 6);
      ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = css('--text-light'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.stroke();
  }

  /* ---------- ฉาก A: รุ่นกลไก ---------- */
  // ไล่จากขั้ว L → โหลด → กลับออกทาง N ให้ตรงกับลำดับป้ายจุดวัด (ซ้าย→ขวา) และตรงกับ wh-circuit.js
  // ไฟบ้านเป็น AC จึงไม่มีทิศถาวรจริง — ทิศที่วาดเลือกให้ตรงกับวิธีไล่ซ่อม (เริ่มที่ต้นทาง L)
  const cookPath = () => ([[A.x0, A.lY], [A.heatX, A.lY], [A.heatX, A.cookY],
                           [A.swX + A.swW + 30, A.cookY], [A.swX + A.swW, A.nY], [A.x0, A.nY]]);
  const warmPath = () => ([[A.x0, A.lY], [A.heatX, A.lY], [A.heatX, A.warmY],
                           [A.warmX + A.warmW, A.warmY], [A.statX + A.statW, A.warmY],
                           [A.swX + A.swW + 30, A.warmY], [A.swX + A.swW, A.nY], [A.x0, A.nY]]);

  function drawFuse(x, y, w, hot) {
    const ok = fuseOK();
    const c = !ok ? RED : hot ? VIOLET : css('--text');
    box(x, y - 17, w, 34, c);
    if (ok) {
      line([[x + 10, y], [x + w - 10, y]], hot ? VIOLET : css('--text'), 2.6);
    } else {
      line([[x + 10, y], [x + w / 2 - 8, y]], RED, 2.6);
      line([[x + w / 2 + 8, y], [x + w - 10, y]], RED, 2.6);
      label(x + w / 2, y + 4, '✕', RED, 14, 'center', 700);
    }
    label(x + w / 2, y - 24, t('เทอร์โมฟิวส์', 'thermal fuse'), hot ? VIOLET : css('--text-light'), 10.5, 'center', 700);
    label(x + w / 2, y + 30, ok ? t('ปกติ (0Ω)', 'good (0Ω)') : t('ขาด (OL)', 'open (OL)'),
          ok ? GREEN : RED, 10, 'center', 700);
  }

  function drawSwitchA(hot) {
    const x = A.swX, y = A.nY, c = hot ? VIOLET : fault === 'swstuck' ? RED : css('--text');
    box(x, y - 26, A.swW, 52, c);
    const cx = x + 12, tx = x + A.swW + 30;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(cx, y, 3.4, 0, 7); ctx.fill();
    // แขนสับรางไปทาง COOK หรือ WARM (ติดค้างที่ COOK ถ้าหน้าสัมผัสละลาย)
    const inCook = cooking || (fault === 'swstuck' && !blown);
    const ty = inCook ? A.cookY : A.warmY;
    line([[cx, y], [tx - 6, ty]], inCook ? RED : GREEN, 2.8);
    ctx.fillStyle = inCook ? RED : css('--border');
    ctx.beginPath(); ctx.arc(tx, A.cookY, 3.6, 0, 7); ctx.fill();
    ctx.fillStyle = inCook ? css('--border') : GREEN;
    ctx.beginPath(); ctx.arc(tx, A.warmY, 3.6, 0, 7); ctx.fill();
    label(x - 12, y + 26, t('ไมโครสวิตช์ 3 ขา', '3-terminal switch'), hot ? VIOLET : css('--text-light'), 10.5, 'right', 700);
    label(cx + 2, y + 18, 'C', css('--text-light'), 10, 'left', 700);
    label(tx + 10, A.cookY - 9, 'COOK', inCook ? RED : css('--text-light'), 10, 'left', 700);
    label(tx + 10, A.warmY - 9, 'WARM', inCook ? css('--text-light') : GREEN, 10, 'left', 700);
    if (fault === 'swstuck') label(x + A.swW / 2, y + 42, t('ละลายติดค้าง', 'welded'), RED, 10, 'center', 700);

    // แป้นแม่เหล็กใต้สวิตช์
    const mHot = step === 4;
    const mx = x + A.swW / 2, my = y - 74;
    ctx.strokeStyle = mHot ? VIOLET : css('--border'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx, my, 14, 0, 7); ctx.stroke();
    label(mx, my + 4, '🧲', css('--text'), 14, 'center');
    dash([[mx, my + 14], [mx, y - 26]], mHot ? VIOLET : css('--border'), 1.4);
    label(mx, my - 20, t('แป้นแม่เหล็ก (คูรี ~103°C)', 'magnet (Curie ~103°C)'),
          mHot ? VIOLET : css('--text-light'), 10, 'center', 700);
  }

  function drawThermostat(hot) {
    const x = A.statX, y = A.warmY, on = fault !== 'warmopen';
    const c = hot ? VIOLET : css('--text');
    box(x, y - 17, A.statW, 34, c);
    line([[x + 10, y], [x + A.statW - 10, y]], !cooking && on ? GREEN : css('--text-light'), 2.4);
    label(x + A.statW / 2, y - 26, t('เทอร์โมสตัทคุมอุ่น 70–80°C', 'warm thermostat 70–80°C'),
          hot ? VIOLET : css('--text-light'), 10, 'center', 700);
  }

  function drawWarmHeaters(hot) {
    const x = A.warmX, y = A.warmY, broken = fault === 'warmopen';
    const c = broken ? RED : hot ? VIOLET : css('--text');
    box(x, y - 22, A.warmW, 44, c);
    if (broken) {
      coil(x + 10, y, x + A.warmW / 2 - 12, y, RED, 3, 7);
      label(x + A.warmW / 2, y + 5, '✕', RED, 14, 'center', 700);
      coil(x + A.warmW / 2 + 12, y, x + A.warmW - 10, y, RED, 3, 7);
    } else {
      coil(x + 10, y, x + A.warmW - 10, y, warmRuns() ? GREEN : css('--text-light'), 6, 8);
    }
    label(x + A.warmW / 2, y - 30, t('ฮีตเตอร์ฝา + ข้าง ~2,000Ω', 'lid + side elements ~2,000Ω'),
          broken ? RED : hot ? VIOLET : css('--text-light'), 10.5, 'center', 700);
    if (broken) label(x + A.warmW / 2, y - 44, t('ขาดใน (สายบานพับ?)', 'open (hinge wiring?)'), RED, 10, 'center', 700);
  }

  function drawMainHeater(hot) {
    const x = A.heatX, on = cookRuns() || warmRuns();
    const c = hot ? VIOLET : css('--text');
    box(x - 42, A.lY + 44, 84, A.cookY - A.lY - 70, c);
    const hotGlow = cookRuns();
    coil(x, A.lY + 58, x, A.cookY - 30,
         hotGlow ? 'rgba(239,68,68,' + (0.6 + 0.3 * Math.sin(tStep * 5)) + ')' : on ? GREEN : css('--text-light'), 5, 16);
    label(x - 52, A.lY + 60, t('ฮีตเตอร์หลัก ~50Ω', 'main element ~50Ω'), hot ? VIOLET : css('--text-light'), 10.5, 'right', 700);
    // สวิตช์อยู่ฝั่ง N → ขั้วบนของฮีตเตอร์ต่อกับ L ผ่านฟิวส์อย่างเดียว จึงมีไฟตลอดที่เสียบปลั๊ก
    if (fuseOK()) label(x - 52, A.lY + 20, t('⚡ ขั้วนี้มีไฟตลอดที่เสียบปลั๊ก', '⚡ live whenever plugged in'), RED, 10, 'right', 700);
    label(x - 52, A.cookY - 8, cookRuns() ? t('ต้มน้ำเต็มกำลัง ~970W', 'boiling, ~970 W')
                        : warmRuns() ? t('แทบไม่ร้อน (~0.6W)', 'barely warm (~0.6 W)')
                                     : t('ไม่ทำงาน', 'idle'),
          cookRuns() ? RED : warmRuns() ? GREEN : css('--text-light'), 10, 'right', 700);
  }

  function drawLampsA() {
    const v = volts();
    const cookOn = cookRuns(), warmOn = warmRuns();
    const bx = 92, by = 170;
    label(bx + 44, by - 24, t('หลอดแสดงสถานะ (นีออน + R 150kΩ)', 'indicator neons (+150kΩ)'), css('--text-light'), 10, 'center', 700);
    lamp(bx, by, cookOn, RED);
    label(bx + 14, by + 4, 'COOK', cookOn ? RED : css('--text-light'), 10, 'left', 700);
    lamp(bx, by + 30, warmOn, GREEN);
    label(bx + 14, by + 34, 'WARM', warmOn ? GREEN : css('--text-light'), 10, 'left', 700);
    dash([[bx, by - 10], [bx, A.lY]], css('--border'), 1.3);
    // ป้ายแรงดันคร่อมฮีตเตอร์ — หัวใจของขั้นที่ 6
    if (step === 6) {
      label(A.heatX - 52, A.lY + 100, 'V ' + t('คร่อมฮีตเตอร์หลัก', 'across main') + ' = ' + v.main + 'V',
            v.main > 100 ? RED : GREEN, 11, 'right', 700);
      label(A.warmX + A.warmW / 2, A.warmY - 46, 'V ' + t('คร่อมชุดอุ่น', 'across warm') + ' = ' + v.warm + 'V',
            v.warm > 100 ? GREEN : css('--text-light'), 11, 'center', 700);
    }
  }

  function drawProbesA() {
    const y = A.lY - 54;
    probe(A.x0 + 34, y, '220V', true);
    label(A.x0 + 34, y - 14, t('ขั้ว L', 'L in'), css('--text-light'), 9.5, 'center', 700);
    probe(A.fuseX + A.fuseW + 34, y, fuseOK() ? '220V' : '0V', fuseOK());
    label(A.fuseX + A.fuseW + 34, y - 14, t('หลังฟิวส์', 'after fuse'), css('--text-light'), 9.5, 'center', 700);
    dash([[A.fuseX + A.fuseW + 34, y + 9], [A.fuseX + A.fuseW + 34, A.lY - 6]], fuseOK() ? GREEN : RED, 1.2);
  }

  function drawSceneA() {
    const txt = css('--text');
    // ราง L (บน) และราง N (ล่าง)
    line([[A.x0, A.lY], [A.fuseX, A.lY]], step <= 2 ? RED : txt, 2.6);
    line([[A.fuseX + A.fuseW, A.lY], [A.heatX, A.lY]], fuseOK() ? (step <= 2 ? RED : txt) : css('--border'), 2.6);
    line([[A.x0, A.nY], [A.swX, A.nY]], step === 1 ? BLUE : txt, 2.6);
    line([[A.x0, A.lY], [A.x0, A.nY]], txt, 2);
    label(A.x0 - 12, A.lY + 4, 'L', RED, 13, 'right', 700);
    label(A.x0 - 12, A.nY + 4, 'N', BLUE, 13, 'right', 700);
    label(A.x0 - 12, (A.lY + A.nY) / 2, '220V~', css('--text-light'), 10.5, 'right', 700);

    // สายฝั่ง COOK และ WARM
    const swT = A.swX + A.swW + 30;
    line([[swT, A.cookY], [A.heatX, A.cookY]], cookRuns() ? RED : txt, 2.4);
    line([[A.heatX, A.lY], [A.heatX, A.lY + 44]], txt, 2.4);
    line([[A.heatX, A.cookY - 26], [A.heatX, A.cookY]], txt, 2.4);
    line([[swT, A.warmY], [A.statX, A.warmY]], warmRuns() ? GREEN : txt, 2.4);
    line([[A.statX + A.statW, A.warmY], [A.warmX, A.warmY]], warmRuns() ? GREEN : txt, 2.4);
    line([[A.warmX + A.warmW, A.warmY], [A.heatX, A.warmY], [A.heatX, A.cookY]], warmRuns() ? GREEN : txt, 2.4);

    glow(cookPath(), RED, step === 3 && cookRuns());
    glow(warmPath(), GREEN, (step === 5 || step === 6) && warmRuns());

    drawFuse(A.fuseX, A.lY, A.fuseW, step === 2);
    drawSwitchA(step === 3 || step === 4);
    drawThermostat(step === 5);
    drawWarmHeaters(step === 5 || step === 6);
    drawMainHeater(step === 6 || step === 3);
    drawLampsA();
    drawProbesA();

    // สายดินเส้นประจากโครงเหล็ก — ไม่อยู่ในวงจรทำงาน
    const eHot = step === 1, ex = A.x0 + 96, ey = 252;
    dash([[A.heatX - 42, A.lY + 60], [ex, A.lY + 60], [ex, ey]], eHot ? GREEN : css('--border'), eHot ? 2.2 : 1.4);
    const c2 = eHot ? GREEN : css('--text-light');
    line([[ex - 14, ey], [ex + 14, ey]], c2, 2.6);
    line([[ex - 9, ey + 6], [ex + 9, ey + 6]], c2, 2.2);
    line([[ex - 4, ey + 12], [ex + 4, ey + 12]], c2, 2);
    label(ex, ey + 28, t('สายดิน (ไม่มีกระแสตอนปกติ)', 'earth (no current when healthy)'), c2, 10, 'center', 700);

    flowDots(cookPath(), RED, 120, cookRuns());
    flowDots(warmPath(), GREEN, 60, warmRuns());

    // แผงอุณหภูมิ/โหมด
    const px = 600, py = 44;
    box(px, py - 30, 280, 62, css('--border'));
    label(px + 12, py - 10, t('อุณหภูมิก้นหม้อ', 'base temperature'), css('--text-light'), 10.5, 'left', 700);
    label(px + 268, py - 10, temp.toFixed(0) + ' °C', temp >= T_CURIE ? RED : CYAN, 13, 'right', 700);
    label(px + 12, py + 14, t('โหมด', 'mode'), css('--text-light'), 10.5, 'left', 700);
    label(px + 268, py + 14, cooking ? t('หุง (COOK)', 'Cook') : t('อุ่น (WARM)', 'Warm'),
          cooking ? RED : GREEN, 12, 'right', 700);
  }

  /* ---------- ฉาก B: รุ่นดิจิทัล ---------- */
  function drawSceneB() {
    const txt = css('--text'), dim = css('--text-light');
    const run = digitalRuns();

    line([[B.x0, B.lY], [B.fuseX, B.lY]], txt, 2.6);
    line([[B.fuseX + B.fuseW, B.lY], [B.board.x + 30, B.lY], [B.board.x + 30, B.smps.y]],
         fuseOK() ? txt : css('--border'), 2.6);
    line([[B.x0, B.nY], [B.x1, B.nY]], step === 9 ? BLUE : txt, 2.6);
    line([[B.x0, B.lY], [B.x0, B.nY]], txt, 2);
    label(B.x0 - 12, B.lY + 4, 'L', RED, 13, 'right', 700);
    label(B.x0 - 12, B.nY + 4, 'N', BLUE, 13, 'right', 700);

    drawFuse(B.fuseX, B.lY, B.fuseW, false);

    // กล่องบอร์ดหลัก
    box(B.board.x, B.board.y, B.board.w, B.board.h, css('--border'), 'transparent');
    label(B.board.x + 10, B.board.y + 18, t('แผงวงจรหลัก (Main Board)', 'main board'), dim, 11, 'left', 700);

    // ภาคจ่ายไฟสวิตชิ่ง
    const sHot = step === 7;
    box(B.smps.x, B.smps.y, B.smps.w, B.smps.h, sHot ? VIOLET : css('--text'));
    label(B.smps.x + B.smps.w / 2, B.smps.y + 24, t('ภาคจ่ายไฟสวิตชิ่ง', 'switching supply'), sHot ? VIOLET : dim, 10.5, 'center', 700);
    label(B.smps.x + B.smps.w / 2, B.smps.y + 44, '220V AC → 5V DC', fuseOK() ? GREEN : RED, 11, 'center', 700);
    dash([[B.smps.x + 20, B.smps.y + B.smps.h], [B.smps.x + 20, B.nY]], fuseOK() ? txt : css('--border'), 1.6);

    // MCU + สาย 5V
    const mHot = step === 8;
    line([[B.smps.x + B.smps.w, B.smps.y + 30], [B.mcu.x, B.mcu.y + 30]], fuseOK() ? GREEN : css('--border'), 2.4);
    label((B.smps.x + B.smps.w + B.mcu.x) / 2, B.smps.y + 22, fuseOK() ? '5V' : '0V', fuseOK() ? GREEN : RED, 10, 'center', 700);
    box(B.mcu.x, B.mcu.y, B.mcu.w, B.mcu.h, mHot ? VIOLET : css('--text'));
    label(B.mcu.x + B.mcu.w / 2, B.mcu.y + 26, 'MCU', mHot ? VIOLET : txt, 12, 'center', 700);
    label(B.mcu.x + B.mcu.w / 2, B.mcu.y + 46, t('สมองกล', 'controller'), dim, 10, 'center', 700);

    // NTC ก้นหม้อ → ขา ADC
    const ntcBad = fault === 'ntc';
    dash([[B.mcu.x + 20, B.mcu.y + B.mcu.h], [B.mcu.x + 20, 330], [300, 330]], ntcBad ? RED : (mHot ? VIOLET : dim), 1.6);
    box(232, 316, 68, 28, ntcBad ? RED : css('--text'));
    label(266, 334, ntcBad ? t('NTC ขาด', 'NTC open') : 'NTC', ntcBad ? RED : txt, 10.5, 'center', 700);
    label(306, 340, ntcBad ? t('อ่านค่าไม่ได้ → Error', 'no reading → error') : t('50–100kΩ ที่อุณหภูมิห้อง', '50–100kΩ at room temp'),
          ntcBad ? RED : dim, 9.5, 'left', 700);

    // บอร์ดหน้าจอ + สาย UART 4 เส้น
    box(B.disp.x, B.disp.y, B.disp.w, B.disp.h, mHot ? VIOLET : css('--text'));
    label(B.disp.x + B.disp.w / 2, B.disp.y + 24, t('บอร์ดหน้าจอ + ปุ่มสัมผัส', 'display + touch board'), mHot ? VIOLET : dim, 10.5, 'center', 700);
    label(B.disp.x + B.disp.w / 2, B.disp.y + 54,
          !fuseOK() ? t('จอดับ', 'dead') : ntcBad ? 'E1' : cooking ? t('กำลังหุง', 'cooking') : t('อุ่น', 'warm'),
          !fuseOK() ? RED : ntcBad ? RED : GREEN, 15, 'center', 700);
    const names = ['VCC', 'GND', 'TXD', 'RXD'];
    for (let i = 0; i < 4; i++) {
      const y = B.mcu.y + 8 + i * 14;
      line([[B.mcu.x + B.mcu.w, y], [B.disp.x, y]], fuseOK() ? (mHot ? VIOLET : dim) : css('--border'), 1.6);
      label((B.mcu.x + B.mcu.w + B.disp.x) / 2, y - 3, names[i], mHot ? VIOLET : dim, 8.5, 'center', 700);
    }

    // รีเลย์ (คอยล์ + หน้าสัมผัส)
    const rHot = step === 9, rBad = fault === 'relay', energised = run;
    box(B.relay.x, B.relay.y, B.relay.w, B.relay.h, rBad ? RED : rHot ? VIOLET : css('--text'));
    coil(B.relay.x + 16, B.relay.y + 16, B.relay.x + 16, B.relay.y + B.relay.h - 12,
         energised && !rBad ? BLUE : dim, 5, 7);
    label(B.relay.x + 46, B.relay.y + 34, t('คอยล์', 'coil'), dim, 9.5, 'left', 700);
    const cx0 = B.relay.x + 100, cx1 = B.relay.x + B.relay.w - 14, cy = B.relay.y + 30;
    ctx.fillStyle = rBad ? RED : txt;
    ctx.beginPath(); ctx.arc(cx0, cy, 3.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx1, cy, 3.4, 0, 7); ctx.fill();
    line([[cx0, cy], run ? [cx1, cy] : [cx1 - 5, cy - 15]], run ? GREEN : rBad ? RED : ORANGE, 2.6);
    label(B.relay.x + B.relay.w / 2, B.relay.y - 14, t('รีเลย์กำลัง (สะพานไฟ 220V)', 'power relay (the 220 V bridge)'),
          rBad ? RED : rHot ? VIOLET : dim, 10.5, 'center', 700);
    if (rBad) label(B.relay.x + B.relay.w / 2, B.relay.y + B.relay.h + 14, t('หน้าสัมผัสไหม้ → ไม่จ่ายไฟ', 'burnt contacts → no output'), RED, 10, 'center', 700);
    // ไฟ L เข้าหน้าสัมผัสรีเลย์
    line([[B.board.x + 30, B.smps.y], [B.board.x + 30, cy], [cx0, cy]], fuseOK() ? txt : css('--border'), 2.2);

    // บัส 220V → ฮีตเตอร์ขนานกัน
    const busLive = run;
    line([[cx1, cy], [B.board.x + B.board.w + 20, cy], [B.board.x + B.board.w + 20, B.busY], [B.x1, B.busY]],
         busLive ? RED : css('--border'), 2.6);
    B.heaters.forEach(h => {
      line([[h.x, B.busY], [h.x, B.busY + 14]], busLive ? RED : css('--border'), 2.2);
      coil(h.x, B.busY + 14, h.x, B.nY - 14, busLive ? 'rgba(239,68,68,' + (0.6 + 0.3 * Math.sin(tStep * 5)) + ')' : dim, 5, 11);
      line([[h.x, B.nY - 14], [h.x, B.nY]], busLive ? BLUE : css('--border'), 2.2);
      label(h.x, B.nY + 18, t(h.th, h.en), busLive ? txt : dim, 10, 'center', 700);
    });
    label((B.heaters[0].x + B.heaters[2].x) / 2, B.busY - 26,
          t('ฮีตเตอร์ทุกชิ้นต่อขนานกัน — คุมอุณหภูมิด้วยการสับรีเลย์เป็นจังหวะ',
            'all elements in parallel — temperature held by pulsing the relay'),
          rHot ? VIOLET : dim, 10.5, 'center', 700);

    // ป้ายจุดวัด
    probe(B.fuseX + B.fuseW + 34, B.lY - 40, fuseOK() ? '220V' : '0V', fuseOK());
    label(B.fuseX + B.fuseW + 34, B.lY - 54, t('หลังฟิวส์', 'after fuse'), dim, 9.5, 'center', 700);
    probe(B.mcu.x + B.mcu.w / 2, B.board.y - 16, fuseOK() ? '5V' : '0V', fuseOK());
    label(B.mcu.x + B.mcu.w / 2, B.board.y - 30, t('ไฟเลี้ยงบอร์ด', '5 V rail'), dim, 9.5, 'center', 700);
    probe(B.x1 - 40, B.busY - 56, busLive ? '220V' : '0V', busLive);
    label(B.x1 - 40, B.busY - 70, t('บัสฮีตเตอร์', 'element bus'), dim, 9.5, 'center', 700);

    if (step === 7) {
      label(W / 2, 34, t('⚠️ วัดได้ 5V ก็จริง แต่ครึ่งบอร์ดฝั่งอินพุตยังเป็นไฟบ้านเต็ม — ห้ามจับขณะเสียบปลั๊ก',
                         '⚠️ Yes it reads 5 V — but half this board is still at mains potential. Never handle it plugged in'),
            RED, 12, 'center', 700);
    }
  }

  /* ---------- แถบสถานะ ---------- */
  function statusBar() {
    let msg, color;
    const wrongScene = (F().scene === 'A' && sceneB()) || (F().scene === 'B' && !sceneB());
    if (blown && fault === 'swstuck') {
      msg = t('🔥 เทอร์โมฟิวส์ขาดแล้ว — มันยอมตายเพื่อกันไฟไหม้ เพราะสวิตช์ที่ติดค้างทำให้ฮีตเตอร์ไม่มีวันหยุด · เปลี่ยนฟิวส์อย่างเดียวไม่พอ ต้องเปลี่ยนสวิตช์ด้วย',
                '🔥 The thermal fuse has blown — it died to prevent a fire, because the welded switch never let the element stop. Replacing the fuse alone is not enough; the switch must go too');
      color = RED;
    } else if (wrongScene) {
      msg = F().scene === 'B'
        ? t('ℹ️ อาการนี้เป็นของรุ่นดิจิทัล — กดขั้นที่ 7–9 เพื่อดู', 'ℹ️ This fault belongs to the digital model — open steps 7–9')
        : t('ℹ️ อาการนี้เป็นของรุ่นกลไก — กดขั้นที่ 1–6 เพื่อดู', 'ℹ️ This fault belongs to the mechanical model — open steps 1–6');
      color = ORANGE;
    } else if (fault === 'ok') {
      msg = sceneB()
        ? t('✅ รุ่นดิจิทัล: สมองกลสั่งรีเลย์จ่ายไฟให้ฮีตเตอร์ทุกชิ้นพร้อมกัน',
            '✅ Digital: the controller closes the relay and feeds every element at once')
        : cooking
          ? t('🍚 โหมดหุง — ฮีตเตอร์หลักได้ 220V เต็ม รอจนน้ำแห้งแล้วแม่เหล็กจะปล่อยเอง',
              '🍚 Cook mode — the main element has the full 220 V; wait for the water to boil away and the magnet will let go')
          : t('♨️ โหมดอุ่น — กระแสไหลผ่านชุดอุ่นอนุกรมกับฮีตเตอร์หลัก แรงดันเกือบทั้งหมดตกที่ชุดอุ่น',
              '♨️ Warm mode — current runs through the warming elements in series with the main plate, and nearly all the voltage lands on the warming side');
      color = cooking && !sceneB() ? RED : GREEN;
    } else {
      msg = t(F().th, F().en).replace(/<\/?b>/g, '');
      color = RED;
    }
    ctx.fillStyle = color === GREEN ? 'rgba(16,185,129,.10)' : color === ORANGE ? 'rgba(245,158,11,.12)' : 'rgba(239,68,68,.10)';
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    rrect(50, H - 34, 840, 26, 8); ctx.fill(); ctx.stroke();
    label(64, H - 16, msg, color, 11, 'left', 700);
  }

  /* ---------- main draw ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (sceneB()) drawSceneB(); else drawSceneA();
    statusBar();
  }

  /* ---------- simulation clock ---------- */
  function advanceCook(dt) {
    if (!cooking || !fuseOK()) return;
    cookT += dt * SIM_SPEED;
    if (cookT <= T_RAMP) temp = 30 + 70 * (cookT / T_RAMP);
    else if (cookT <= T_RAMP + T_PLATEAU) temp = 100;   // พลาโต — พลังงานไปเป็นไอน้ำทั้งหมด
    else {
      const td = cookT - T_RAMP - T_PLATEAU, knee = 10 / RISE_DRY;
      temp = td <= knee ? 100 + td * RISE_DRY : 110 + (td - knee) * RISE_RUNAWAY;
    }

    if (fault === 'magnet' && cookT >= T_RAMP + T_PLATEAU * 0.5) { cooking = false; syncCook(); }
    else if (fault === 'swstuck') {
      if (temp >= T_FUSE) { blown = true; cooking = false; temp = T_FUSE; syncCook(); }
    } else if (temp >= T_CURIE) { cooking = false; syncCook(); }   // จุดคูรี → แม่เหล็กปล่อย
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    advanceCook(dt);
    if (!cooking && temp > 72) temp = Math.max(72, temp - dt * 6);
    if (playing && tStep > 4.5) setStep(step % 9 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('rc-play');
  const cookBtn = document.getElementById('rc-cook');
  const faultSel = document.getElementById('rc-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(9, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncCook() {
    cookBtn.classList.toggle('active', cooking);
    cookBtn.querySelectorAll('.rc-on').forEach(e => e.style.display = cooking ? '' : 'none');
    cookBtn.querySelectorAll('.rc-off').forEach(e => e.style.display = cooking ? 'none' : '');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('rc-prev').addEventListener('click', () => setStep(step === 1 ? 9 : step - 1));
  document.getElementById('rc-next').addEventListener('click', () => setStep(step === 9 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  cookBtn.addEventListener('click', () => {
    if (blown) return;                     // ฟิวส์ขาดแล้วกดหุงไม่ขึ้น เหมือนของจริง
    cooking = !cooking;
    if (cooking) { cookT = 0; temp = 30; }
    syncCook();
  });
  faultSel.addEventListener('change', () => {
    fault = FAULTS[faultSel.value] ? faultSel.value : 'ok';
    blown = false; cooking = false; cookT = 0; temp = 30;
    syncCook();
    root.querySelectorAll('.bs-faultnote').forEach(e => e.classList.toggle('active', fault !== 'ok'));
  });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  document.addEventListener('langchange', draw);   // ลาเบลบน canvas เป็น text ต้องวาดใหม่
  resize();
  setStep(1);
  syncCook();
  requestAnimationFrame(frame);
})();
