/* stove-steps.js — Interactive step-by-step induction cooker (induction-stove.html, #st-canvas)
 * โทโพโลยี: single-ended quasi-resonant (แบบที่เจอในเตาบ้านเกือบทุกรุ่น)
 *   220V~ → ฟิวส์ → CT (คล้องสาย L) → บริดจ์ → โช้ก + C 5µF → บัส 310V
 *   บัส 310V → ขดลวดทำงาน (work coil) → โหนด SW → ขา C ของ IGBT → ขา E → R sense → GND
 *   C-resonance 0.27µF คร่อมจากโหนด SW ลงกราวด์ = ตัวกำหนดรูปคลื่นเรโซแนนซ์ช่วง OFF
 *   SMPS แยก 310V เป็น 5V (MCU) และ 18V (ไดรเวอร์ + พัดลม) · MCU → ไดรเวอร์ → R-gate → ขา G
 *   ซีเนอร์ 18V คร่อม G-E กันเกตพัง
 *
 * หัวใจของบท: ช่วง OFF พลังงานในขดลวดวิ่งเข้า C-resonance ทำให้แรงดันขา C พุ่งขึ้นเป็นลูกครึ่งไซน์
 *   ~800V แล้ว "กลับลงมาที่ศูนย์" เอง — IGBT ต้องเปิดตรงจังหวะที่แรงดันเป็นศูนย์ (ZVS)
 *   ถ้า C-resonance ค่าแห้ง ยอดคลื่นจะพุ่งทะลุพิกัด 1200V → IGBT ระเบิดทันที (ตรงกับคลินิกเคสที่ 4)
 *
 * 8 ขั้น: 1 ไฟเข้า/บริดจ์ → 2 โช้ก+C 310V → 3 SMPS 5V/18V → 4 MCU→ไดรเวอร์→เกต
 *        → 5 จังหวะ ON → 6 จังหวะ OFF (เรโซแนนซ์/ZVS) → 7 หม้อกับ eddy current → 8 ไล่วัด TP1–TP5
 * เลือกอาการเสียได้ 6 แบบ ตรงกับคลินิกช่างในหน้าเดียวกัน · จุดที่วิ่ง = กระแสสมมติ (+ → −)
 * ใช้ CSS ชุด .bs-* ร่วมกับซิมทีละขั้นหน้าอื่น และ query .bs-tab/.bs-desc เฉพาะใน wrap ตัวเอง
 */
(function () {
  const root = document.getElementById('stove-circuit');
  const cv = document.getElementById('st-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  /* ---------- geometry ---------- */
  const W = 940, H = 500;
  const HV_Y = 95, GND_Y = 358, SW_Y = 200, EM_Y = 330;
  const AC_X = 45, FUSE_X = 95, CT_X = 155, BR_X0 = 200, BR_X1 = 262;
  const CH_X0 = 292, CH_X1 = 352, C1_X = 392;
  const COIL_X0 = 560, COIL_X1 = 680, RES_X = 780;
  const IG_X0 = 642, IG_X1 = 728, IG_Y0 = 232, IG_Y1 = 300, IG_CX = 685;
  const PSU_X0 = 280, PSU_X1 = 382, PSU_Y0 = 142, PSU_Y1 = 198;
  const MCU_X0 = 280, MCU_X1 = 382, MCU_Y0 = 248, MCU_Y1 = 300;
  const DRV_X0 = 424, DRV_X1 = 514, DRV_Y0 = 240, DRV_Y1 = 296;
  const RG_X0 = 532, RG_X1 = 592, GATE_Y = 266, ZD_X = 612;
  const V18_Y = 158, V5_X = 331;
  const N_X = 184;                 // สาย N ของไฟบ้าน ไต่ขึ้นเข้าขา AC ตัวล่างของบริดจ์
  const TAP_X = 430, TAP_Y = 120;  // จุดแยกไฟเลี้ยงภาคต่ำ — ต้องอยู่ **หลังคาปา 5µF** (บัส 310V ที่เรียบแล้ว)
  const SX0 = 45, SX1 = 895, SY0 = 392, SY1 = 486;               // scope strip

  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- current paths (conventional current, + → −) ---------- */
  // ฝั่ง AC: L → ฟิวส์ → CT → ขา AC ของบริดจ์ แล้ววนกลับทาง N (ไม่ได้ใช้รางล่างร่วมกับ DC−)
  const P_INPUT = [[AC_X, HV_Y], [BR_X0, HV_Y], [BR_X0, HV_Y + 26], [N_X, HV_Y + 26], [N_X, GND_Y], [AC_X, GND_Y], [AC_X, HV_Y]];
  // ฝั่ง DC: ขั้ว + ของบริดจ์ → โช้ก → คาปา → กลับเข้าขั้ว − ของบริดจ์ทางบัส DC−
  const P_FILT = [[BR_X1, HV_Y], [C1_X, HV_Y], [C1_X, GND_Y], [BR_X1, GND_Y], [BR_X1, HV_Y + 26]];
  const P_PSU = [[TAP_X, HV_Y], [TAP_X, TAP_Y], [V5_X, TAP_Y], [V5_X, PSU_Y0]];
  const P_5V = [[V5_X, PSU_Y1], [V5_X, MCU_Y0]];
  const P_18V = [[PSU_X1, V18_Y], [DRV_X0 + 34, V18_Y], [DRV_X0 + 34, DRV_Y0]];
  const P_SIG = [[MCU_X1, GATE_Y], [DRV_X0, GATE_Y]];
  const P_GATE = [[DRV_X1, GATE_Y], [RG_X0, GATE_Y], [RG_X1, GATE_Y], [IG_X0, GATE_Y]];
  const P_ON = [[C1_X, HV_Y], [COIL_X0, HV_Y], [COIL_X1, HV_Y], [COIL_X1, SW_Y], [IG_CX, SW_Y],
                [IG_CX, IG_Y0], [IG_CX, IG_Y1], [IG_CX, GND_Y], [C1_X, GND_Y], [C1_X, HV_Y]];
  const P_RES = [[C1_X, HV_Y], [COIL_X0, HV_Y], [COIL_X1, HV_Y], [COIL_X1, SW_Y], [RES_X, SW_Y],
                 [RES_X, GND_Y], [C1_X, GND_Y], [C1_X, HV_Y]];

  /* ---------- fault modes (ตรงกับคลินิกช่าง 6 เคสในหน้าเดียวกัน) ---------- */
  const FAULTS = {
    ok:   { psu: true, gate: true, sw: true,
            tp: ['310V DC', '5.0V', '18V', 'พัลส์ 0↔18V', '0 ↔ ~800V'],
            tpe: ['310V DC', '5.0V', '18V', 'pulses 0↔18V', '0 ↔ ~800V'],
            c: [GREEN, GREEN, GREEN, GREEN, GREEN],
            th: 'วงจรปกติ — ไล่วัดครบทั้ง 5 จุด', en: 'Healthy — all five test points read correctly' },
    igbt: { psu: false, gate: false, sw: false, dead: true, shorted: true,
            tp: ['0V (ฟิวส์ขาด)', '0V', '0V', '0V', 'ช็อต C-E'],
            tpe: ['0V (fuse blown)', '0V', '0V', '0V', 'C-E shorted'],
            c: [RED, RED, RED, RED, RED],
            th: 'IGBT ช็อตทะลุ C-E → บัส 310V ลงกราวด์ ฟิวส์เมนขาด ทั้งบอร์ดเงียบสนิท (มักลากไดโอดบริดจ์พังตาม — เปลี่ยนคู่กันเสมอ)',
            en: 'IGBT shorted C-E → the 310 V bus is dragged to ground, the mains fuse blows and the board is dead (it usually takes the bridge rectifier with it — replace both)' },
    psu:  { psu: false, gate: false, sw: false,
            tp: ['310V DC', '0V', '0V', '0V', '310V ค้าง'],
            tpe: ['310V DC', '0V', '0V', '0V', 'stuck at 310V'],
            c: [GREEN, RED, RED, RED, ORANGE],
            th: 'ภาคจ่ายไฟต่ำเสีย → ไม่มี 5V เลี้ยง MCU และไม่มี 18V เลี้ยงไดรเวอร์ เตาจึงเงียบสนิททั้งที่ฟิวส์ยังดี (บัส 310V ยังมีไฟเต็ม = อันตราย)',
            en: 'The low-voltage supply is dead → no 5 V for the MCU and no 18 V for the driver, so the stove is silent even though the fuse is fine (the 310 V bus is still live — dangerous)' },
    gate: { psu: true, gate: false, sw: false,
            tp: ['310V DC', '5.0V', '18V', '0V — ไม่มีพัลส์', '310V ค้าง'],
            tpe: ['310V DC', '5.0V', '18V', '0V — no pulses', 'stuck at 310V'],
            c: [GREEN, GREEN, GREEN, RED, ORANGE],
            th: 'R-gate ไหม้ขาด หรือซีเนอร์ 18V ช็อต → คำสั่งไปไม่ถึงขา G เตาเปิดติด พัดลมหมุน จอโชว์ปกติ แต่ไม่ร้อนและไม่กินกระแส',
            en: 'The gate resistor is open or the 18 V zener has shorted → the command never reaches the gate. The stove powers up and the fan spins, but it never heats and draws no current' },
    cres: { psu: true, gate: true, sw: true, overv: true,
            tp: ['310V DC', '5.0V', '18V', 'พัลส์ 0↔18V', 'พีคทะลุ >1200V'],
            tpe: ['310V DC', '5.0V', '18V', 'pulses 0↔18V', 'peaks past 1200V'],
            c: [GREEN, GREEN, GREEN, GREEN, RED],
            th: 'C-resonance ค่าแห้ง → ช่วง OFF ไม่มีที่รองรับพลังงานจากขดลวด ยอดแรงดันขา C พุ่งทะลุพิกัด IGBT ตัวใหม่จึงระเบิดซ้ำทันทีที่เสียบปลั๊ก',
            en: 'The resonant capacitor has dried out → at turn-off the coil energy has nowhere to go and the collector peak shoots past the IGBT rating, so a brand-new IGBT explodes the moment you plug in' },
    pot:  { psu: true, gate: true, sw: true, nopot: true,
            tp: ['310V DC', '5.0V', '18V', 'พัลส์สั้นๆ แล้วหยุด', 'แกว่งยาว Q สูง'],
            tpe: ['310V DC', '5.0V', '18V', 'a few pulses', 'long high-Q ringing'],
            c: [GREEN, GREEN, GREEN, ORANGE, ORANGE],
            th: 'ไม่มีหม้อ หรือใช้หม้ออะลูมิเนียม → ไม่มีอะไรดูดพลังงาน คลื่นเรโซแนนซ์แกว่งยาวผิดปกติ บอร์ดอ่านค่าจาก CT แล้วตัดการทำงาน โชว์ E0/E1',
            en: 'No pot, or an aluminium one → nothing absorbs the energy, the resonant ring lasts far too long, the board reads it through the CT and shuts down with E0/E1' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', last = performance.now();

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];

  /* ---------- drawing helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function dash(pts, color, w) {
    ctx.save(); ctx.setLineDash([5, 5]); line(pts, color, w || 1.6); ctx.restore();
  }
  function glowPath(pts, color, on) {
    if (!on) return;
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.10 * Math.sin(tStep * 4);
    line(pts, color, 12);
    ctx.restore();
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
  function flow(p, color, speed, on) {
    if (!on) return;
    const L = pathLen(p), gap = 36, off = (flowT * speed) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.arc(x, y, 6.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  function box(x0, y0, x1, y1, title, sub, hot, color) {
    const c = hot ? (color || BLUE) : css('--text');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot ? 2.6 : 2;
    rrect(x0, y0, x1 - x0, y1 - y0, 9); ctx.fill(); ctx.stroke();
    label((x0 + x1) / 2, (y0 + y1) / 2 + (sub ? -2 : 4), title, c, 12.5, 'center', 700);
    if (sub) label((x0 + x1) / 2, (y0 + y1) / 2 + 14, sub, css('--text-light'), 9.5);
  }

  /* ---------- parts ---------- */
  function drawAC(hot) {
    const c = hot ? BLUE : css('--text');
    line([[AC_X, HV_Y], [AC_X, 196]], c); line([[AC_X, 256], [AC_X, GND_Y]], c);
    ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(AC_X, 226, 28, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (let i = -17; i <= 17; i++) ctx.lineTo(AC_X + i, 226 - 8 * Math.sin(i / 17 * Math.PI));
    ctx.stroke();
    label(AC_X, 188, '220V~', c, 12, 'center', 700);
    label(AC_X - 6, HV_Y - 10, 'L', RED, 12, 'center', 700);
    label(AC_X - 6, GND_Y + 18, 'N', css('--text-light'), 12, 'center', 700);
  }
  function drawFuse(blown, hot) {
    const c = blown ? RED : hot ? ORANGE : css('--text');
    ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.fillStyle = css('--card');
    rrect(FUSE_X - 22, HV_Y - 9, 44, 18, 4); ctx.fill(); ctx.stroke();
    if (blown) {
      line([[FUSE_X - 22, HV_Y], [FUSE_X - 7, HV_Y]], RED, 2);
      line([[FUSE_X + 7, HV_Y], [FUSE_X + 22, HV_Y]], RED, 2);
      label(FUSE_X, HV_Y - 16, t('ฟิวส์ขาด', 'fuse blown'), RED, 10, 'center', 700);
    } else {
      line([[FUSE_X - 22, HV_Y], [FUSE_X + 22, HV_Y]], c, 2);
      label(FUSE_X, HV_Y - 16, t('ฟิวส์', 'fuse'), hot ? c : css('--text-light'), 10);
    }
  }
  function drawCT(hot) {
    const c = hot ? VIOLET : css('--text');
    ctx.strokeStyle = c; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(CT_X, HV_Y, 13, 17, 0, 0, 7); ctx.stroke();
    label(CT_X, HV_Y - 24, 'CT', hot ? c : css('--text-light'), 10.5, 'center', 700);
    dash([[CT_X, HV_Y + 18], [CT_X, MCU_Y0 - 6], [MCU_X0, MCU_Y0 - 6]], hot ? VIOLET : css('--border'), 1.4);
  }
  function drawBridge(hot, dead) {
    const c = dead ? RED : hot ? GREEN : css('--text');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot || dead ? 2.6 : 2;
    rrect(BR_X0, HV_Y - 26, BR_X1 - BR_X0, 52, 8); ctx.fill(); ctx.stroke();
    label((BR_X0 + BR_X1) / 2, HV_Y - 6, t('บริดจ์', 'Bridge'), c, 11.5, 'center', 700);
    label((BR_X0 + BR_X1) / 2, HV_Y + 10, 'AC → DC', css('--text-light'), 9.5);
    // ขา AC ตัวล่าง (รับสาย N) และขา DC− ที่ออกไปเป็นบัสกราวด์ของบอร์ด — คนละโหนดกัน
    label(BR_X0 - 6, HV_Y + 30, 'AC', css('--text-light'), 9, 'right', 700);
    label(BR_X1 + 6, HV_Y + 30, 'DC−', css('--text-light'), 9, 'left', 700);
  }
  function drawChoke(hot) {
    const c = hot ? BLUE : css('--text'), n = 4, w = (CH_X1 - CH_X0) / n;
    ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i < n; i++) ctx.arc(CH_X0 + w * (i + .5), HV_Y, w / 2, Math.PI, 0, false);
    ctx.stroke();
    label((CH_X0 + CH_X1) / 2, HV_Y - 16, t('โช้ก', 'choke'), hot ? c : css('--text-light'), 10.5);
  }
  function drawCapV(x, y0, y1, name, hot, color, labLeft, labY) {
    const c = hot ? (color || BLUE) : css('--text'), ym = (y0 + y1) / 2;
    line([[x, y0], [x, ym - 6]], css('--text')); line([[x, ym + 6], [x, y1]], css('--text'));
    line([[x - 15, ym - 6], [x + 15, ym - 6]], c, 2.8);
    ctx.save(); ctx.beginPath(); ctx.arc(x, ym + 16, 22, Math.PI * 1.18, Math.PI * 1.82);
    ctx.strokeStyle = c; ctx.lineWidth = 2.8; ctx.stroke(); ctx.restore();
    const lc = hot ? c : css('--text-light');
    const ly = labY || ym + 4;
    if (labLeft) label(x - 20, ly, name, lc, 10.5, 'right');
    else label(x + 20, ly, name, lc, 10.5, 'left');
  }
  function drawResH(x0, x1, y, name, hot, color) {
    const c = hot ? (color || ORANGE) : css('--text'), open = fault === 'gate';
    ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.fillStyle = css('--card');
    rrect(x0, y - 9, x1 - x0, 18, 3); ctx.fill(); ctx.stroke();
    label((x0 + x1) / 2, y - 15, name, hot ? c : css('--text-light'), 10.5);
    if (open) dash([[(x0 + x1) / 2 - 10, y], [(x0 + x1) / 2 + 10, y]], RED, 2.4);
  }
  function drawZener(x, y0, y1, hot, bad) {
    const c = bad ? RED : hot ? VIOLET : css('--text'), y = (y0 + y1) / 2 - 9;
    line([[x, y0], [x, y]], css('--text')); line([[x, y + 20], [x, y1]], css('--text'));
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x - 9, y + 20); ctx.lineTo(x + 9, y + 20); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill();
    line([[x - 10, y + 2], [x + 10, y + 2]], c, 2.6);
    line([[x - 10, y + 2], [x - 14, y - 3]], c, 2); line([[x + 10, y + 2], [x + 14, y + 7]], c, 2);
    label(x - 14, y + 34, 'ZD 18V', bad ? RED : hot ? c : css('--text-light'), 10, 'right');
  }
  function drawGnd(x, y) {
    const c = css('--text');
    line([[x, y], [x, y + 8]], c);
    line([[x - 11, y + 8], [x + 11, y + 8]], c, 2.4);
    line([[x - 7, y + 13], [x + 7, y + 13]], c, 2.2);
    line([[x - 3, y + 18], [x + 3, y + 18]], c, 2);
  }
  function drawCoil(hot) {
    const c = hot ? BLUE : css('--text'), n = 6, w = (COIL_X1 - COIL_X0) / n;
    ctx.strokeStyle = c; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i < n; i++) ctx.arc(COIL_X0 + w * (i + .5), HV_Y, w / 2, Math.PI, 0, false);
    ctx.stroke();
    label((COIL_X0 + COIL_X1) / 2, HV_Y + 18, t('ขดลวดทำงาน (Work Coil)', 'work coil'),
          hot ? c : css('--text-light'), 10.5);
  }
  function drawPot(active) {
    const f = F(), nopot = f.nopot;
    const x0 = COIL_X0 - 14, x1 = COIL_X1 + 14, y0 = 34, y1 = 60;
    const c = nopot ? ORANGE : active ? RED : css('--text-light');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    rrect(x0, y0, x1 - x0, y1 - y0, 6); ctx.fill(); ctx.stroke();
    label((x0 + x1) / 2, y1 - 9,
          nopot ? t('หม้ออะลูมิเนียม / ไม่มีหม้อ', 'aluminium pot / no pot')
                : t('ก้นหม้อเหล็ก', 'steel pot base'), c, 10.5, 'center', 700);
    // magnetic field arrows from the coil up to the pot
    for (let i = 0; i < 4; i++) {
      const x = COIL_X0 + 18 + i * 30;
      const a = active ? 0.45 + 0.45 * Math.sin(tStep * 5 - i * 0.7) : 0.22;
      ctx.save(); ctx.globalAlpha = a;
      line([[x, HV_Y - 16], [x, y1 + 6]], nopot ? ORANGE : VIOLET, 2);
      line([[x - 4, y1 + 12], [x, y1 + 5], [x + 4, y1 + 12]], nopot ? ORANGE : VIOLET, 2);
      ctx.restore();
    }
    // eddy current swirl inside the pot
    if (active && !nopot) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(tStep * 6);
      ctx.strokeStyle = RED; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const cx = COIL_X0 + 25 + i * 44;
        ctx.beginPath(); ctx.arc(cx, y0 + 12, 8, tStep * 3, tStep * 3 + 4.4); ctx.stroke();
      }
      ctx.restore();
      label(x1 + 8, y0 + 16, t('eddy current → ความร้อน', 'eddy current → heat'), RED, 10, 'left', 700);
    } else if (nopot) {
      label(x1 + 8, y0 + 16, t('ไม่มีอะไรดูดพลังงาน → E0/E1', 'nothing absorbs the energy → E0/E1'), ORANGE, 10, 'left', 700);
    }
  }
  function drawIGBT(on, hot) {
    const f = F();
    const c = f.shorted ? RED : hot ? GREEN : css('--text');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot || f.shorted ? 2.6 : 2;
    rrect(IG_X0, IG_Y0, IG_X1 - IG_X0, IG_Y1 - IG_Y0, 9); ctx.fill(); ctx.stroke();
    label((IG_X0 + IG_X1) / 2, IG_Y0 + 26, 'IGBT', c, 14, 'center', 700);
    const st = f.shorted ? t('ช็อตค้าง', 'shorted')
      : !f.sw ? t('ไม่ทำงาน', 'not switching')
      : on ? 'ON' : 'OFF';
    label((IG_X0 + IG_X1) / 2, IG_Y0 + 44,
          st, f.shorted ? RED : !f.sw ? css('--text-light') : on ? GREEN : css('--text-light'), 10.5, 'center', 700);
    // pins
    line([[IG_CX, SW_Y], [IG_CX, IG_Y0]], f.shorted ? RED : css('--text'));
    line([[IG_CX, IG_Y1], [IG_CX, EM_Y]], f.shorted ? RED : css('--text'));
    line([[IG_X0 - 34, GATE_Y], [IG_X0, GATE_Y]], f.gate ? VIOLET : css('--text-light'));
    label(IG_CX + 8, IG_Y0 - 6, 'C', c, 11, 'left', 700);
    label(IG_CX + 8, IG_Y1 + 16, 'E', c, 11, 'left', 700);
    label(IG_X0 - 6, GATE_Y - 6, 'G', f.gate ? VIOLET : css('--text-light'), 11, 'right', 700);
    // freewheel (damper) diode drawn inside, E → C
    const dx = IG_X1 - 16;
    ctx.fillStyle = css('--text-light'); ctx.strokeStyle = css('--text-light'); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(dx - 6, IG_Y1 - 14); ctx.lineTo(dx + 6, IG_Y1 - 14); ctx.lineTo(dx, IG_Y1 - 26); ctx.closePath(); ctx.fill();
    line([[dx - 7, IG_Y1 - 26], [dx + 7, IG_Y1 - 26]], css('--text-light'), 1.6);
  }
  function drawSense(hot) {
    const c = hot ? ORANGE : css('--text');
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.fillStyle = css('--card');
    rrect(IG_CX - 9, EM_Y + 4, 18, GND_Y - EM_Y - 8, 3); ctx.fill(); ctx.stroke();
    label(IG_CX + 14, (EM_Y + GND_Y) / 2 + 4, t('R วัดกระแส', 'sense R'), css('--text-light'), 10, 'left');
  }

  /* ---------- switching phase ---------- */
  const PERIOD = 0.9;                       // seconds per visual switching cycle (จริง 20–30 kHz)
  const DUTY = 0.45;
  function phaseOn() {
    if (!F().sw) return false;
    if (step === 5) return true;
    if (step === 6) return false;
    if (step < 5) return false;
    if (F().nopot) return (flowT % (PERIOD * 4)) < PERIOD * DUTY;   // จุดไม่กี่พัลส์แล้วบอร์ดตัด
    return (flowT % PERIOD) / PERIOD < DUTY;
  }

  /* ---------- test-point badges ---------- */
  function badge(x, y, tag, val, color, align) {
    ctx.font = '700 10.5px Anuphan, sans-serif';
    const w = ctx.measureText(tag).width + ctx.measureText(val).width + 26;   // 6 ซ้าย + 14 ช่องไฟ + 6 ขวา
    const bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    rrect(bx, y - 10, w, 20, 6); ctx.fill(); ctx.stroke();
    label(bx + 6, y + 4, tag, color, 10, 'left', 700);
    label(bx + w - 6, y + 4, val, css('--text'), 10.5, 'right', 700);
  }
  function drawTPs() {
    const f = F(), v = isEN() ? f.tpe : f.tp;
    badge(430, 52, 'TP1', v[0], f.c[0], 'left');
    badge(MCU_X0 - 6, MCU_Y1 + 22, 'TP2', v[1], f.c[1], 'left');
    badge(DRV_X0 + 34, V18_Y - 22, 'TP3', v[2], f.c[2], 'center');
    badge(RG_X1 - 14, GATE_Y + 34, 'TP4', v[3], f.c[3], 'center');
    badge(895, SW_Y - 26, 'TP5', v[4], f.c[4], 'right');
  }

  /* ---------- scope strip ---------- */
  function scope(title, sub) {
    ctx.fillStyle = css('--bg'); ctx.strokeStyle = css('--border'); ctx.lineWidth = 1.4;
    rrect(SX0, SY0, SX1 - SX0, SY1 - SY0, 8); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.globalAlpha = .5; ctx.strokeStyle = css('--border'); ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = SX0 + (SX1 - SX0) * i / 8;
      ctx.beginPath(); ctx.moveTo(x, SY0); ctx.lineTo(x, SY1); ctx.stroke();
    }
    ctx.restore();
    label(SX0 + 10, SY0 + 15, title, css('--text'), 11, 'left', 700);
    if (sub) label(SX1 - 10, SY0 + 15, sub, css('--text-light'), 10, 'right');
  }
  function curve(fn, color, w, dashed) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2; ctx.lineJoin = 'round';
    ctx.save(); if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const u = i / 400, y = fn(u);
      const px = SX0 + (SX1 - SX0) * u, py = SY1 - 14 - (SY1 - SY0 - 26) * Math.max(0, Math.min(1, y));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.restore();
  }
  function hline(y01, color, txt) {
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    const py = SY1 - 14 - (SY1 - SY0 - 26) * y01;
    ctx.beginPath(); ctx.moveTo(SX0, py); ctx.lineTo(SX1, py); ctx.stroke(); ctx.restore();
    if (txt) label(SX0 + 8, py + 13, txt, color, 10, 'left', 700);   // ใต้เส้น — ด้านบนเป็นหัวเรื่องสโคป
  }

  // แรงดันที่ขา C ของ IGBT ในหนึ่งคาบ: ON = 0V, OFF = ลูกครึ่งไซน์เรโซแนนซ์แล้วกลับมาศูนย์ (ZVS)
  function vCollector(p, peak, ringy) {
    if (p < DUTY) return 0.02;
    const q = (p - DUTY) / (1 - DUTY);
    const hump = Math.sin(Math.PI * Math.min(1, q / (ringy ? 0.55 : 1)));
    const ring = ringy && q > 0.55 ? 0.18 * Math.sin((q - 0.55) * 26) * Math.exp(-(q - 0.55) * 3) : 0;
    return 0.02 + peak * Math.max(0, hump) + ring;
  }

  function drawScope() {
    const f = F();
    const sine = u => Math.sin(u * Math.PI * 8);
    if (step === 1) {
      scope(t('ไฟเข้าและหลังบริดจ์', 'Mains input and the rectified output'), t('เวลา (ms) · 50Hz', 'time (ms) · 50Hz'));
      curve(u => 0.5 + 0.42 * sine(u), css('--text-light'), 1.6, true);
      if (f.dead) {
        curve(() => 0.06, RED, 2.6);
        label(SX1 - 12, SY0 + 34, t('ฟิวส์ขาด — ไม่มีไฟเข้าบอร์ดเลย', 'fuse blown — nothing reaches the board'), RED, 10.5, 'right', 700);
      } else {
        curve(u => 0.5 + 0.42 * Math.abs(sine(u)), GREEN, 2.4);
        label(SX1 - 10, SY1 - 8, t('บริดจ์พลิกครึ่งลบขึ้นมาเป็นบวก (เต็มคลื่น)', 'the bridge flips the negative half up (full-wave)'), GREEN, 10, 'right', 700);
      }
    } else if (step === 2) {
      scope(t('หลังโช้กและคาปา 5µF', 'After the choke and the 5 µF capacitor'), t('เวลา (ms)', 'time (ms)'));
      curve(u => 0.5 + 0.42 * Math.abs(sine(u)), css('--text-light'), 1.5, true);
      if (f.dead) {
        curve(() => 0.06, RED, 2.6);
        label(SX1 - 12, SY0 + 34, t('ไม่มีไฟมาถึงบัส 310V', 'nothing reaches the 310V bus'), RED, 10.5, 'right', 700);
      } else {
        curve(u => 0.9 - 0.02 * ((u * 4) % 1), GREEN, 2.6);
        label(SX1 - 12, SY1 - 8, t('เรียบ ≈ 310V DC — จุดนี้ค้างไฟหลังถอดปลั๊ก ต้องคายประจุก่อนซ่อม',
                                   'smooth ≈ 310V DC — this point stays charged after unplugging; discharge before servicing'), GREEN, 10.5, 'right', 700);
      }
    } else if (step === 3) {
      scope(t('ไฟเลี้ยงจากภาคจ่ายไฟต่ำ', 'The low-voltage rails'), t('18V = ไดรเวอร์+พัดลม · 5V = MCU', '18V = driver & fan · 5V = MCU'));
      if (f.psu) {
        curve(() => 0.78, ORANGE, 2.6); label(SX0 + 12, SY0 + 34, '18V', ORANGE, 11, 'left', 700);
        curve(() => 0.3, GREEN, 2.6); label(SX0 + 12, SY1 - 24, '5V', GREEN, 11, 'left', 700);
        label(SX1 - 12, SY0 + 34, t('ทั้งสองเส้นต้องนิ่ง ถ้าเส้นใดหาย เตาจะเงียบทั้งที่ฟิวส์ยังดี',
                                    'both must be steady — lose either and the stove is silent with a good fuse'), css('--text-light'), 10, 'right');
      } else {
        curve(() => 0.06, RED, 2.6);
        label(SX1 - 12, SY0 + 34, t('ไม่มีไฟเลี้ยงทั้ง 5V และ 18V', 'neither the 5V nor the 18V rail is present'), RED, 10.5, 'right', 700);
      }
    } else if (step === 4) {
      scope(t('พัลส์ที่ขาเกต (จาก MCU ผ่านไดรเวอร์)', 'Gate pulses (from the MCU via the driver)'),
            t('เวลา (µs) · 20–30 kHz', 'time (µs) · 20–30 kHz'));
      hline(0.62, css('--border'), '18V');
      if (f.gate) {
        curve(() => 0.06, RED, 2.6);
        label(SX1 - 12, SY0 + 34, t('ไม่มีพัลส์ถึงขาเกต — เช็ค R-gate และซีเนอร์ 18V',
                                    'no pulses at the gate — check the gate resistor and the 18V zener'), RED, 10.5, 'right', 700);
      } else {
        curve(u => ((u * 6) % 1 < DUTY ? 0.62 : 0.05), VIOLET, 2.4);
        label(SX1 - 12, SY1 - 8, t('ต้องเป็น 18V ไม่ใช่ 5V — 5V เปิด IGBT ได้แค่แง้ม แล้วไหม้',
                                   'it must be 18V, not 5V — 5V only cracks the IGBT open and cooks it'), VIOLET, 10.5, 'right', 700);
      }
    } else if (step === 5 || step === 6) {
      const peak = f.overv ? 1.02 : 0.72;
      scope(t('แรงดันที่ขา C ของ IGBT (คลื่นเรโซแนนซ์)', 'Collector voltage of the IGBT (the resonant waveform)'),
            t('เวลา (µs) · ซูมเวลา ×1000', 'time (µs) · zoomed ×1000'));
      hline(0.88, RED, t('พิกัด IGBT 1200V', 'IGBT rating 1200V'));
      if (!f.sw) {
        curve(() => f.dead ? 0.06 : 0.55, f.dead ? RED : ORANGE, 2.6);
        label(SX1 - 12, SY0 + 36, f.dead ? t('ไม่มีไฟทั้งบอร์ด', 'the whole board is dead')
                                         : t('ไม่สับสวิตช์ — ขา C ค้างที่ 310V', 'not switching — the collector sits at 310V'),
              f.dead ? RED : ORANGE, 10.5, 'right', 700);
      } else {
        curve(u => vCollector((u * 3) % 1, peak, f.nopot), f.overv ? RED : GREEN, 2.6);
        if (step === 5) label(SX1 - 12, SY1 - 8, t('ช่วง ON — ขา C ถูกกดอยู่ที่ ~0V กระแสสะสมพลังงานในขดลวด',
                                                  'ON — the collector is held near 0V while the coil stores energy'), GREEN, 10.5, 'right', 700);
        if (step === 6 && !f.overv && !f.nopot)
          label(SX1 - 12, SY1 - 8, t('ยอดคลื่นกลับลงมาที่ศูนย์เอง → เปิด IGBT ตรงนั้น = ZVS แทบไม่มีกำลังสูญเสีย',
                                     'the hump returns to zero by itself → turning on there is ZVS, almost lossless'), GREEN, 10.5, 'right', 700);
        if (f.overv) label(SX1 - 12, SY0 + 36, t('C-resonance แห้ง → ยอดทะลุพิกัด IGBT ระเบิดซ้ำ',
                                                 'dried resonant cap → the peak clears the rating and the IGBT blows again'), RED, 10.5, 'right', 700);
        if (f.nopot) label(SX1 - 12, SY0 + 36, t('ไม่มีหม้อ → คลื่นแกว่งยาว (Q สูง) บอร์ดตัดแล้วโชว์ E0/E1',
                                                 'no pot → a long high-Q ring, so the board trips with E0/E1'), ORANGE, 10.5, 'right', 700);
      }
    } else if (step === 7) {
      scope(t('เทียบคลื่นเรโซแนนซ์: หม้อเหล็กแท้ กับ ไม่มีหม้อ/อะลูมิเนียม',
              'Resonant waveform: a real steel pot vs no pot / aluminium'), t('เวลา (µs)', 'time (µs)'));
      curve(u => vCollector((u * 3) % 1, 0.72, false), GREEN, 2.6);
      curve(u => vCollector((u * 3) % 1, 0.86, true), ORANGE, 2.2, true);
      label(SX1 - 12, SY0 + 34, t('เขียว = มีหม้อเหล็ก พลังงานถูกดูดไปเป็นความร้อน คลื่นถูกหน่วง',
                                  'green = steel pot present, energy is absorbed as heat and the ring is damped'), GREEN, 10.5, 'right', 700);
      label(SX1 - 12, SY0 + 50, t('ส้ม = ไม่มีหม้อ ไม่มีอะไรดูดพลังงาน คลื่นแกว่งยาวและสูงกว่า',
                                  'orange = no pot, nothing absorbs it so the ring is taller and lasts longer'), ORANGE, 10.5, 'right', 700);
    } else {
      scope(t('ไล่วัด 5 จุดตามลำดับ — จุดแรกที่ค่าหายไป คือภาคที่เสีย',
              'Probe the five points in order — the first reading that disappears is the failed stage'), '');
      const v = isEN() ? f.tpe : f.tp;
      const names = isEN()
        ? ['TP1  310V bus', 'TP2  MCU 5V', 'TP3  driver 18V', 'TP4  gate pulses', 'TP5  IGBT collector']
        : ['TP1  บัส 310V', 'TP2  ไฟ 5V ที่ MCU', 'TP3  ไฟ 18V ไดรเวอร์', 'TP4  พัลส์ที่ขาเกต', 'TP5  ขา C ของ IGBT'];
      for (let i = 0; i < 5; i++) {
        const y = SY0 + 32 + i * 13;
        label(SX0 + 16, y, names[i], css('--text'), 10.5, 'left', 600);
        label(SX0 + 240, y, v[i], f.c[i], 10.5, 'left', 700);
        label(SX0 + 420, y, f.c[i] === GREEN ? '✓' : f.c[i] === ORANGE ? '⚠' : '✗', f.c[i], 12, 'left', 700);
      }
      if (fault === 'ok') label(SX0 + 470, SY0 + 52, t(f.th, f.en), GREEN, 10.5, 'left', 700);
      else label(SX0 + 470, SY0 + 52, t('ดูรายละเอียดอาการที่แถบสีแดงด้านบน', 'see the red banner above for this fault'),
                 css('--text-light'), 10.5, 'left');
    }
  }

  /* ---------- caption ---------- */
  function caption() {
    const f = F();
    if (fault !== 'ok') {
      ctx.fillStyle = 'rgba(239,68,68,.10)'; ctx.strokeStyle = RED; ctx.lineWidth = 1.4;
      rrect(SX0, 8, SX1 - SX0, 24, 6); ctx.fill(); ctx.stroke();
      label(SX0 + 12, 24, '🔧 ' + t(f.th, f.en), RED, 11, 'left', 700);
    } else {
      label(SX1, 24, t('จุดที่วิ่ง = กระแสสมมติ (+ → −)', 'moving dots = conventional current (+ → −)'),
            css('--text-light'), 10.5, 'right');
    }
  }

  /* ---------- main draw ---------- */
  function draw() {
    const txt = css('--text'), dim = css('--text-light'), f = F();
    ctx.clearRect(0, 0, W, H);
    const on = phaseOn(), live = !f.dead;

    // glow of the loop under discussion
    glowPath(P_INPUT, ORANGE, step === 1 && live);
    glowPath(P_FILT, BLUE, step === 2 && live);
    glowPath(P_PSU.concat(P_5V), GREEN, step === 3 && f.psu);
    glowPath(P_GATE, VIOLET, step === 4 && f.gate);
    glowPath(P_ON, GREEN, step === 5 && f.sw);
    glowPath(P_RES, ORANGE, step === 6 && f.sw);

    // rails
    line([[AC_X, HV_Y], [COIL_X0, HV_Y]], step <= 2 ? BLUE : txt, 2.4);
    // **รางล่างไม่ใช่เส้นเดียวกัน**: ซ้ายคือสาย N ของไฟบ้านที่ไต่ขึ้นเข้าบริดจ์
    // ขวาคือบัส DC− ของบอร์ดที่ออกจากบริดจ์ — ถ้าลากต่อกันเมื่อไหร่ = ช็อตไดโอดในบริดจ์
    line([[AC_X, GND_Y], [N_X, GND_Y], [N_X, HV_Y + 26], [BR_X0, HV_Y + 26]], step === 1 ? BLUE : txt, 2.4);
    line([[BR_X1, HV_Y + 26], [BR_X1, GND_Y], [RES_X, GND_Y]], txt, 2.4);
    line([[COIL_X1, HV_Y], [COIL_X1, SW_Y]], txt, 2.4);
    line([[COIL_X1, SW_Y], [RES_X, SW_Y]], f.sw && !on && step >= 5 ? ORANGE : txt, 2.4);
    label(470, HV_Y - 16, '310V DC', RED, 12, 'center', 700);

    // input stage
    drawAC(step === 1);
    drawFuse(f.dead, step === 1);
    drawCT(step === 1 || step === 7);
    drawBridge(step === 1, f.shorted);
    drawChoke(step === 2);
    drawCapV(C1_X, HV_Y, GND_Y, 'C 5µF 400V', step === 2, BLUE, false, HV_Y + 88);
    drawGnd(470, GND_Y);   // กราวด์ของบอร์ด = ขั้วลบของบัส 310V ไม่ใช่สาย N

    // low-voltage side
    line([[TAP_X, HV_Y], [TAP_X, TAP_Y], [V5_X, TAP_Y], [V5_X, PSU_Y0]], step === 3 ? GREEN : txt, 1.8);
    box(PSU_X0, PSU_Y0, PSU_X1, PSU_Y1, t('ภาคจ่ายไฟต่ำ', 'LV supply'), '310V → 5V / 18V',
        step === 3, f.psu ? GREEN : RED);
    line([[PSU_X1, V18_Y], [DRV_X0 + 34, V18_Y], [DRV_X0 + 34, DRV_Y0]], f.psu ? (step === 3 ? ORANGE : txt) : RED, 1.8);
    label(PSU_X1 + 8, V18_Y - 6, '18V', f.psu ? ORANGE : RED, 10.5, 'left', 700);
    line([[V5_X, PSU_Y1], [V5_X, MCU_Y0]], f.psu ? (step === 3 ? GREEN : txt) : RED, 1.8);
    label(V5_X + 8, (PSU_Y1 + MCU_Y0) / 2 + 4, '5V', f.psu ? GREEN : RED, 10.5, 'left', 700);
    box(MCU_X0, MCU_Y0, MCU_X1, MCU_Y1, 'MCU', t('สมองสั่งงาน', 'the brain'), step === 4 || step === 7, BLUE);
    line([[MCU_X1, GATE_Y], [DRV_X0, GATE_Y]], step === 4 ? BLUE : txt, 1.8);
    box(DRV_X0, DRV_Y0, DRV_X1, DRV_Y1, t('ไดรเวอร์', 'Gate driver'), t('5V → 18V', '5V → 18V'), step === 4, VIOLET);
    line([[DRV_X1, GATE_Y], [RG_X0, GATE_Y]], f.gate ? (step === 4 ? VIOLET : txt) : RED, 1.8);
    drawResH(RG_X0, RG_X1, GATE_Y, 'R-gate', step === 4, VIOLET);
    line([[RG_X1, GATE_Y], [IG_X0 - 34, GATE_Y]], f.gate ? (step === 4 ? VIOLET : txt) : RED, 1.8);
    drawZener(ZD_X, GATE_Y, EM_Y, step === 4, fault === 'gate');
    line([[ZD_X, EM_Y], [IG_CX, EM_Y]], txt, 1.8);

    // power stage
    drawPot(step >= 5 && f.sw);
    drawCoil(step === 5 || step === 6);
    drawIGBT(on, step === 5 || step === 6);
    drawSense(step === 7);
    drawCapV(RES_X, SW_Y, GND_Y, t('C-res 0.27µF 1200V', 'C-res 0.27µF 1200V'),
             step === 6 || f.overv, f.overv ? RED : ORANGE, false);   // ป้ายอยู่ขวาของคาปา ไม่ทับกล่อง IGBT

    // SW node dot
    ctx.fillStyle = step >= 5 ? (on ? GREEN : ORANGE) : txt;
    ctx.beginPath(); ctx.arc(COIL_X1, SW_Y, 4, 0, 7); ctx.fill();

    // current animation
    flow(P_INPUT, ORANGE, 80, step === 1 && live);
    flow(P_FILT, BLUE, 70, step === 2 && live);
    flow(P_PSU, GREEN, 70, step === 3 && f.psu);
    flow(P_5V, GREEN, 70, step === 3 && f.psu);
    flow(P_18V, ORANGE, 70, step === 3 && f.psu);
    flow(P_SIG, BLUE, 70, step === 4 && f.psu);
    flow(P_GATE, VIOLET, 90, step === 4 && f.gate);
    flow(P_ON, GREEN, 120, (step === 5 || step >= 7) && f.sw && on);
    flow(P_RES, ORANGE, 100, (step === 6 || step >= 7) && f.sw && !on);

    if (step === 7) {
      label(CT_X + 90, 44,
        t('CT อ่านกระแสขาเข้า → MCU ตัดสินว่าหม้อใช้ได้ไหม',
          'the CT reads the input current → the MCU decides whether the pot is valid'),
        VIOLET, 11, 'center', 700);
    }

    drawTPs();
    drawScope();
    caption();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (playing && tStep > 5) setStep(step % 8 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('st-play');
  const faultSel = document.getElementById('st-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(8, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('st-prev').addEventListener('click', () => setStep(step === 1 ? 8 : step - 1));
  document.getElementById('st-next').addEventListener('click', () => setStep(step === 8 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
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
  resize();
  setStep(1);
  requestAnimationFrame(frame);
})();
