/* smps-steps.js — Interactive step-by-step SMPS (switching-psu.html, #sp-canvas)
 * วงจร LNK304 แบบ buck "สวิตช์ฝั่งสูง" (high-side switch, direct feedback):
 *   310V bus → ขา D → [MOSFET ในไอซี] → ขา S = โหนดสวิตช์ (SW) → L 1mH → +5V → โหลด → GND(N)
 *   D2 คร่อมจาก GND ขึ้นมาที่ SW (คาโทดอยู่บน) = ทางไหลวนช่วง OFF
 *   ทุกอย่างในไอซีอ้างอิงกับขา S: C ขา BP คร่อม BP–S, ตัวแบ่ง 4.3K/2K กลับลงที่ S (ไม่ใช่กราวด์)
 *   → ขา S แกว่ง 0 ↔ 310V ตลอดเวลา และไอซีสุ่มอ่าน FB เฉพาะช่วง OFF ที่ D2 ตรึง S ไว้ใกล้กราวด์
 *     D3 คือตัวกันช่วง ON ไม่ให้ขา FB ถูกลากติดลบตอน S พุ่งขึ้น 310V
 * 8 ขั้น: 1 NTC → 2 D1 → 3 Pi-filter → 4 ช่วง ON → 5 ช่วง OFF → 6 ป้อนกลับ/ข้ามพัลส์
 *        → 7 ไม่แยกกราวด์ → 8 ไล่วัด 4 จุด
 * เลือกอาการเสียได้ตลอดทุกขั้น (ตรงกับคลินิกช่าง 4 เคสในหน้าเดียวกัน)
 * จุดที่วิ่ง = กระแสสมมติ (+ → −)
 */
(function () {
  const root = document.getElementById('smps-circuit');
  const cv = document.getElementById('sp-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  /* ---------- geometry ---------- */
  const W = 940, H = 500;
  const HV_Y = 95, SB_Y = 305, FB_Y = 250, GND_Y = 358;          // rails / buses
  const CX0 = 455, CX1 = 580, CY0 = 130, CY1 = 225;              // LNK304 body
  const AC_X = 45, NTC_X = 85, D1_X = 175, C1_X = 250, L1_X = 265, C2_X = 345, DF_X = 440;
  const BP_X = 415, S_X = 485, FB_X = 545, SW_X = 610, L2_X = 630;
  const OUT_X = 700, CO_X = 735, ZD_X = 780, DIV_X = 825, TERM_X = 900;
  const SX0 = 45, SX1 = 895, SY0 = 392, SY1 = 486;               // scope strip

  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- current paths (conventional current, + → −) ---------- */
  const P_INPUT = [[AC_X, HV_Y], [C1_X, HV_Y], [C1_X, GND_Y], [AC_X, GND_Y], [AC_X, HV_Y]];
  const P_FILTER = [[AC_X, HV_Y], [C2_X, HV_Y], [C2_X, GND_Y], [AC_X, GND_Y], [AC_X, HV_Y]];
  const P_ON = [[AC_X, HV_Y], [DF_X, HV_Y], [DF_X, 155], [CX0, 155], [497, 170], [S_X, 200], [S_X, SB_Y],
                [L2_X, SB_Y], [OUT_X, SB_Y], [CO_X, SB_Y], [CO_X, GND_Y], [AC_X, GND_Y], [AC_X, HV_Y]];
  const P_OFF = [[SW_X, SB_Y], [L2_X, SB_Y], [OUT_X, SB_Y], [CO_X, SB_Y], [CO_X, GND_Y],
                 [SW_X, GND_Y], [SW_X, SB_Y]];
  const P_FB = [[DIV_X - 25, SB_Y], [DIV_X, SB_Y], [DIV_X, FB_Y], [FB_X, FB_Y], [FB_X, SB_Y]];
  const P_HOT = [[AC_X, GND_Y], [TERM_X, GND_Y]];

  /* ---------- fault modes ---------- */
  const FAULTS = {
    ok:  { sw: true,  tp: ['≈310V', '310V DC', '0 ↔ 310V', '5.0V'],
           tpe: ['≈310V pk', '310V DC', '0 ↔ 310V', '5.0V'], c: [GREEN, GREEN, GREEN, GREEN],
           th: 'วงจรปกติ — ไล่วัดได้ครบทั้ง 4 จุด', en: 'Healthy — all four test points read correctly' },
    ntc: { sw: false, tp: ['0V', '0V', '0V', '0V'], tpe: ['0V', '0V', '0V', '0V'], c: [RED, RED, RED, RED],
           dead: 1,
           th: 'NTC หรือ D1 ขาด → ไฟไม่ทะลุมาถึงบัส 310V เลย ทุกจุดหลังจากนั้นดับหมด',
           en: 'NTC or D1 open → nothing reaches the 310V bus, everything downstream is dead' },
    ics: { sw: false, tp: ['≈310V', 'ตก ~0V', 'ค้างเท่ากับ TP2', '0V'],
           tpe: ['≈310V pk', 'collapses ~0V', 'stuck = TP2', '0V'], c: [GREEN, RED, RED, RED], short: true,
           th: 'LNK304 ช็อตทะลุ D–S → บัส 310V ถูกลากลงกราวด์ กระแสมหาศาลวิ่งผ่าน D1 จนไหม้ตาม (เปลี่ยนคู่กันเสมอ)',
           en: 'LNK304 shorted D–S → the 310V bus is dragged to ground and the surge takes D1 with it (always replace both)' },
    cap: { sw: true,  tp: ['≈310V', '150–310V กระเพื่อม', 'สับๆ หยุดๆ', '0–5V กระพริบ'],
           tpe: ['≈310V pk', '150–310V rippling', 'starts and stalls', '0–5V flickering'],
           c: [GREEN, ORANGE, ORANGE, ORANGE], ripple: true,
           th: 'C ฟิลเตอร์ค่าแห้ง → 310V ไม่เรียบ ไอซีรีสตาร์ทตัวเองตลอด = จอกระพริบ รีเลย์ดังรัวๆ',
           en: 'Filter caps dried out → the 310V rail is no longer smooth, the IC keeps restarting: flickering display, chattering relay' },
    bp:  { sw: false, tp: ['≈310V', '310V', '310V ค้าง — ไม่สับ', '0V'],
           tpe: ['≈310V pk', '310V', '310V stuck — no switching', '0V'], c: [GREEN, GREEN, RED, RED],
           th: 'C ขา BP แห้ง → ไอซีไม่มีไฟเลี้ยงตัวเอง จึงไม่เริ่มสับเลย แต่ D–S ไม่ช็อต (ต่างจากอาการที่ 2)',
           en: 'BP cap dried out → the IC never gets its housekeeping supply and never starts, yet D–S is not shorted (unlike symptom 2)' },
    d2:  { sw: true,  tp: ['≈310V', '310V', 'สับได้ แต่มีสไปก์สูง', '0V (มีสไปก์)'],
           tpe: ['≈310V pk', '310V', 'switching, big spikes', '0V (spiky)'], c: [GREEN, GREEN, ORANGE, RED],
           nofw: true,
           th: 'D2 ขาด → ช่วง OFF กระแสใน L ไม่มีทางไหลวน เกิดสไปก์แรงดันสูง ไฟ 5V สร้างไม่ขึ้น',
           en: 'D2 open → the inductor current has no freewheel path at turn-off, so it spikes and the 5V rail never builds' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', heavy = false, last = performance.now();

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

  /* ---------- parts ---------- */
  function drawAC(hot) {
    const c = hot ? BLUE : css('--text');
    line([[AC_X, HV_Y], [AC_X, 196]], c); line([[AC_X, 256], [AC_X, GND_Y]], c);
    ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(AC_X, 226, 30, 0, 7); ctx.stroke();
    ctx.beginPath();
    for (let i = -18; i <= 18; i++) ctx.lineTo(AC_X + i, 226 - 9 * Math.sin(i / 18 * Math.PI));
    ctx.stroke();
    label(AC_X, 186, '220V~', hot ? BLUE : css('--text'), 12, 'center', 700);
    label(AC_X - 6, HV_Y - 10, 'L', RED, 12, 'center', 700);
    label(AC_X - 6, GND_Y + 18, 'N', css('--text-light'), 12, 'center', 700);
  }
  function drawNTC(hot) {
    const c = hot ? ORANGE : css('--text'), y = HV_Y;
    line([[NTC_X - 20, y], [NTC_X, y]], css('--text'));
    ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.fillStyle = css('--card');
    rrect(NTC_X, y - 11, 52, 22, 4); ctx.fill(); ctx.stroke();
    line([[NTC_X + 6, y + 8], [NTC_X + 46, y - 8]], c, 1.6);
    line([[NTC_X + 52, y], [D1_X - 2, y]], css('--text'));
    label(NTC_X + 26, y - 18, 'NTC 12D-9', hot ? ORANGE : css('--text-light'), 10.5);
  }
  function drawDiode(x, y, dir, name, hot, color) {
    // dir: 'R' cathode right (horizontal), 'U' cathode up (vertical)
    const c = hot ? (color || GREEN) : css('--text');
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    if (dir === 'R') {
      ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.lineTo(x + 18, y); ctx.closePath(); ctx.fill();
      line([[x + 18, y - 11], [x + 18, y + 11]], c, 2.6);
      label(x + 9, y - 17, name, hot ? c : css('--text-light'), 10.5);
    } else {
      ctx.beginPath(); ctx.moveTo(x - 10, y + 18); ctx.lineTo(x + 10, y + 18); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      line([[x - 11, y], [x + 11, y]], c, 2.6);
      label(x + 16, y + 14, name, hot ? c : css('--text-light'), 10.5, 'left');
    }
  }
  function drawZener(x, y0, y1, hot) {
    const c = hot ? VIOLET : css('--text'), y = (y0 + y1) / 2 - 9;
    line([[x, y0], [x, y]], css('--text')); line([[x, y + 20], [x, y1]], css('--text'));
    ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x - 10, y + 20); ctx.lineTo(x + 10, y + 20); ctx.lineTo(x, y + 2); ctx.closePath(); ctx.fill();
    line([[x - 11, y + 2], [x + 11, y + 2]], c, 2.6);
    line([[x - 11, y + 2], [x - 15, y - 3]], c, 2.2); line([[x + 11, y + 2], [x + 15, y + 7]], c, 2.2);
    label(x + 17, y + 34, 'ZD 5.1V', hot ? c : css('--text-light'), 10.5, 'left');
  }
  function drawCapV(x, y0, y1, name, hot, color, labLeft) {
    const c = hot ? (color || BLUE) : css('--text'), ym = (y0 + y1) / 2;
    line([[x, y0], [x, ym - 6]], css('--text')); line([[x, ym + 6], [x, y1]], css('--text'));
    line([[x - 15, ym - 6], [x + 15, ym - 6]], c, 2.8);
    ctx.save(); ctx.beginPath(); ctx.arc(x, ym + 16, 22, Math.PI * 1.18, Math.PI * 1.82); ctx.strokeStyle = c;
    ctx.lineWidth = 2.8; ctx.stroke(); ctx.restore();
    const lc = hot ? c : css('--text-light');
    if (labLeft) { label(x - 20, ym + 4, name, lc, 10.5, 'right'); label(x + 20, ym - 8, '+', lc, 11, 'left', 700); }
    else { label(x + 20, ym - 8, name, lc, 10.5, 'left'); label(x - 20, ym - 8, '+', lc, 11, 'right', 700); }
  }
  function drawIndH(x0, x1, y, name, hot) {
    const c = hot ? BLUE : css('--text'), n = 4, w = (x1 - x0) / n;
    line([[x0 - 12, y], [x0, y]], css('--text'));
    ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i < n; i++) ctx.arc(x0 + w * (i + .5), y, w / 2, Math.PI, 0, false);
    ctx.stroke();
    line([[x1, y], [x1 + 12, y]], css('--text'));
    label((x0 + x1) / 2, y - 16, name, hot ? c : css('--text-light'), 10.5);
  }
  function drawResV(x, y0, y1, name, hot, color, labLeft) {
    const c = hot ? (color || ORANGE) : css('--text');
    line([[x, y0], [x, y0 + 8]], css('--text')); line([[x, y1 - 8], [x, y1]], css('--text'));
    ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.fillStyle = css('--card');
    rrect(x - 9, y0 + 8, 18, y1 - y0 - 16, 3); ctx.fill(); ctx.stroke();
    label(x + (labLeft ? -14 : 14), (y0 + y1) / 2 + 4, name, hot ? c : css('--text-light'),
          10.5, labLeft ? 'right' : 'left');
  }
  function drawGnd(x, y) {
    const c = css('--text');
    line([[x, y], [x, y + 8]], c);
    line([[x - 11, y + 8], [x + 11, y + 8]], c, 2.4);
    line([[x - 7, y + 13], [x + 7, y + 13]], c, 2.2);
    line([[x - 3, y + 18], [x + 3, y + 18]], c, 2);
  }
  function drawChip(on, hot) {
    const dead = !F().sw && fault !== 'ics';
    const c = hot ? BLUE : css('--text');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot ? 2.6 : 2;
    rrect(CX0, CY0, CX1 - CX0, CY1 - CY0, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX0 + 14, CY0 + 14, 4, 0, 7); ctx.fillStyle = css('--border'); ctx.fill();
    label((CX0 + CX1) / 2, CY0 + 40, 'LNK304', c, 16, 'center', 700);
    label((CX0 + CX1) / 2, CY0 + 56, t('ไอซีสวิตชิ่ง', 'switching IC'), css('--text-light'), 10);

    // internal high-side switch D → S
    const sx = 497, sy0 = 168, sy1 = 202;
    const closed = on && !dead;
    ctx.strokeStyle = closed ? GREEN : (fault === 'ics' ? RED : css('--text-light'));
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(sx, sy0, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(sx, sy1, 2.6, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx, sy0);
    if (closed || fault === 'ics') ctx.lineTo(sx, sy1); else ctx.lineTo(sx + 16, sy1 - 4);
    ctx.stroke();
    label(sx + 24, sy1 + 2, fault === 'ics' ? t('ช็อตค้าง', 'shorted')
      : closed ? 'ON' : 'OFF', fault === 'ics' ? RED : closed ? GREEN : css('--text-light'), 10, 'left', 700);

    // pins
    line([[DF_X, HV_Y], [DF_X, 155], [CX0, 155]], css('--text'));
    label(CX0 + 8, 151, 'D', c, 11, 'left', 700);
    line([[CX0, 195], [BP_X, 195], [BP_X, 236]], css('--text'));
    label(CX0 + 8, 191, 'BP', c, 11, 'left', 700);
    line([[S_X, CY1], [S_X, SB_Y]], css('--text'));
    label(S_X + 8, CY1 + 16, 'S', c, 11, 'left', 700);
    line([[FB_X, CY1], [FB_X, FB_Y]], css('--text'));
    label(FB_X + 8, CY1 + 16, 'FB', c, 11, 'left', 700);
  }

  /* ---------- switching phase ---------- */
  function phaseOn() {
    if (!F().sw) return false;
    if (step === 4) return true;
    if (step === 5) return false;
    if (step < 4) return false;
    const n = Math.floor(flowT / 0.38);                  // pulse slot
    const pat = heavy ? [1, 1, 1, 0] : [1, 0, 0, 0];     // ON/OFF control = skipped pulses
    if (!pat[n % pat.length]) return false;
    return (flowT / 0.38) % 1 < 0.55;
  }

  /* ---------- test-point badges ---------- */
  function badge(x, y, tag, val, color, align) {
    ctx.font = '700 10.5px Anuphan, sans-serif';
    const w = Math.max(ctx.measureText(val).width, 34) + 30;
    const bx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    rrect(bx, y - 10, w, 20, 6); ctx.fill(); ctx.stroke();
    label(bx + 6, y + 4, tag, color, 10, 'left', 700);
    label(bx + w - 6, y + 4, val, css('--text'), 10.5, 'right', 700);
  }
  function drawTPs() {
    const f = F(), v = isEN() ? f.tpe : f.tp;
    badge(215, 62, 'TP1', v[0], f.c[0], 'left');
    badge(DF_X - 6, 62, 'TP2', v[1], f.c[1], 'left');
    badge(SW_X - 8, 342, 'TP3', v[2], f.c[2], 'right');
    badge(TERM_X, 262, 'TP4', v[3], f.c[3], 'right');
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
  function drawScope() {
    const f = F();
    const sine = u => Math.sin(u * Math.PI * 8);
    if (step === 1) {
      scope(t('กระแสตอนเสียบปลั๊ก (Inrush)', 'Inrush current at plug-in'), t('เวลา (ms)', 'time (ms)'));
      const pulse = u => Math.max(0, Math.sin(u * Math.PI * 8)) * Math.exp(-u * 4.5);
      curve(u => 0.06 + 0.88 * pulse(u), RED, 2, true);
      curve(u => 0.06 + 0.24 * pulse(u), GREEN, 2.4);
      label(SX1 - 12, SY0 + 32, t('ไม่มี NTC — กระแสพุ่งจนไดโอดพัง', 'without NTC — a spike that kills the diode'), RED, 10.5, 'right', 700);
      label(SX1 - 12, SY0 + 48, t('มี NTC — ถูกจำกัดไว้', 'with NTC — held back'), GREEN, 10.5, 'right', 700);
    } else if (step === 2) {
      scope(t('D1 เรียงกระแสครึ่งคลื่น', 'D1 half-wave rectification'), t('เวลา (ms) · 50Hz', 'time (ms) · 50Hz'));
      curve(u => 0.5 + 0.42 * sine(u), css('--text-light'), 1.6, true);
      curve(u => 0.5 + 0.42 * Math.max(0, sine(u)), GREEN, 2.4);
      label(SX1 - 10, SY1 - 6, t('ครึ่งลบถูกตัดทิ้ง', 'negative half is cut away'), css('--text-light'), 10, 'right');
    } else if (step === 3) {
      scope(t('หลังผ่าน Pi-Filter', 'After the Pi filter'), t('เวลา (ms)', 'time (ms)'));
      curve(u => 0.5 + 0.42 * Math.max(0, sine(u)), css('--text-light'), 1.5, true);
      if (f.ripple) {
        curve(u => 0.62 + 0.22 * Math.max(0, sine(u)) - 0.16 * ((u * 4) % 1), ORANGE, 2.6);
        label(SX1 - 12, SY1 - 8, t('C ค่าแห้ง → 310V กระเพื่อมหนัก', 'dried caps → the 310V rail ripples badly'), ORANGE, 10.5, 'right', 700);
      } else if (f.dead) {
        curve(() => 0.06, RED, 2.6);
        label(SX1 - 12, SY0 + 32, t('ไม่มีไฟมาถึงบัส 310V', 'nothing reaches the 310V bus'), RED, 10.5, 'right', 700);
      } else {
        curve(u => 0.9 - 0.012 * ((u * 4) % 1), GREEN, 2.6);
        label(SX1 - 12, SY1 - 8, t('เรียบเป็นเส้นตรง ≈ 310V DC', 'flat and smooth ≈ 310V DC'), GREEN, 10.5, 'right', 700);
      }
    } else if (step === 4 || step === 5 || step === 7) {
      const on = step === 4, off = step === 5;
      scope(step === 7 ? t('แรงดันที่ขา S เทียบกราวด์บอร์ด', 'Voltage at pin S w.r.t. board ground')
                       : t('แรงดันที่โหนดสวิตช์ (ขา S)', 'Voltage at the switching node (pin S)'),
            t('เวลา (µs) · ซูมเวลา ×1000', 'time (µs) · zoomed ×1000'));
      const duty = 0.35;
      curve(u => {
        const p = (u * 5) % 1;
        return (p < duty ? 0.92 : 0.08);
      }, on ? GREEN : off ? css('--text-light') : ORANGE, 2.6);
      label(SX0 + 10, SY0 + 32, '310V', css('--text-light'), 10, 'left', 700);
      label(SX0 + 10, SY1 - 8, '0V', css('--text-light'), 10, 'left', 700);
      if (on) label(SX1 - 10, SY0 + 32, t('ช่วง ON — ขา S ถูกยกขึ้นไป 310V', 'ON — pin S is pulled up to 310V'), GREEN, 10.5, 'right', 700);
      if (off) label(SX1 - 10, SY0 + 32, t('ช่วง OFF — D2 ตรึงขา S ไว้ใต้กราวด์ ~0.7V', 'OFF — D2 clamps pin S ~0.7V below ground'), BLUE, 10.5, 'right', 700);
      if (step === 7) label(SX1 - 10, SY0 + 32, t('ขา "S" ไม่ใช่กราวด์ — มันแกว่ง 0↔310V', 'pin "S" is NOT ground — it swings 0↔310V'), RED, 10.5, 'right', 700);
    } else if (step === 6) {
      scope(t('พัลส์สวิตช์ (ไอซีข้ามพัลส์เมื่อไฟพอแล้ว)', 'Switch pulses (the IC skips cycles once the rail is full)'),
            t('เวลา (µs)', 'time (µs)'));
      const pat = heavy ? [1, 1, 1, 0] : [1, 0, 0, 0];
      curve(u => {
        const n = Math.floor(u * 16), p = (u * 16) % 1;
        return pat[n % pat.length] && p < 0.5 ? 0.86 : 0.14;
      }, BLUE, 2.2);
      curve(() => 0.52, GREEN, 2.4);
      label(SX1 - 10, SY1 - 8, t('เส้นเขียว = ไฟ 5V ขาออก นิ่งเท่าเดิมทั้งสองกรณี',
                                 'green = the 5V output, equally steady either way'), GREEN, 10, 'right', 700);
      label(SX0 + 10, SY0 + 32, heavy ? t('โหลดหนัก — ข้ามพัลส์น้อย', 'heavy load — few skipped pulses')
                                      : t('โหลดเบา — ข้ามพัลส์เยอะ', 'light load — many skipped pulses'), BLUE, 10.5, 'left', 700);
    } else {
      scope(t('ไล่วัด 4 จุด ตามลำดับ — เจอจุดที่ไฟหายเมื่อไหร่ คือเจอภาคที่เสีย',
              'Probe the four points in order — where the voltage disappears is where the fault is'), '');
      const v = isEN() ? f.tpe : f.tp;
      const names = isEN()
        ? ['TP1  after D1', 'TP2  310V bus', 'TP3  pin S (switching node)', 'TP4  +5V output']
        : ['TP1  หลัง D1', 'TP2  บัส 310V', 'TP3  ขา S (โหนดสวิตช์)', 'TP4  ไฟ 5V ขาออก'];
      for (let i = 0; i < 4; i++) {
        const y = SY0 + 34 + i * 15;
        label(SX0 + 16, y, names[i], css('--text'), 10.5, 'left', 600);
        label(SX0 + 300, y, v[i], f.c[i], 10.5, 'left', 700);
        label(SX0 + 470, y, f.c[i] === GREEN ? '✓' : f.c[i] === ORANGE ? '⚠' : '✗', f.c[i], 12, 'left', 700);
      }
      if (fault === 'ok') label(SX0 + 520, SY0 + 49, t(f.th, f.en), GREEN, 10.5, 'left', 700);
      else label(SX0 + 520, SY0 + 49, t('ดูรายละเอียดอาการที่แถบสีแดงด้านบน', 'see the red banner above for this fault'),
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
    glowPath(P_FILTER, BLUE, step === 3 && live);
    glowPath(P_ON, GREEN, step === 4 && f.sw);
    glowPath(P_OFF, BLUE, step === 5 && f.sw && !f.nofw);
    glowPath(P_FB, VIOLET, step === 6);
    glowPath(P_HOT, RED, step === 7);

    // rails and buses
    line([[AC_X, HV_Y], [DF_X, HV_Y]], step <= 3 ? BLUE : txt, 2.4);
    line([[AC_X, GND_Y], [TERM_X, GND_Y]], step === 7 ? RED : txt, step === 7 ? 3 : 2.4);
    line([[BP_X, SB_Y], [L2_X, SB_Y]], txt, 2.4);
    line([[OUT_X, SB_Y], [TERM_X, SB_Y]], step >= 4 ? GREEN : txt, 2.4);
    label(320, HV_Y + 32, step <= 3 ? '' : '≈ 310V DC', RED, 12, 'center', 700);
    label(OUT_X + 22, SB_Y - 12, '+5V', GREEN, 13, 'left', 700);
    label(TERM_X, GND_Y - 8, 'GND', step === 7 ? RED : dim, 11, 'right', 700);
    label(TERM_X + 4, SB_Y + 16, 'MCU', dim, 10.5, 'right');

    // stage 1–2
    drawAC(step === 1 || step === 7);
    drawNTC(step === 1);
    drawDiode(D1_X, HV_Y, 'R', 'D1', step === 2 || fault === 'ics',
              fault === 'ics' ? RED : GREEN);
    // stage 3 — pi filter
    drawCapV(C1_X, HV_Y, GND_Y, 'C 4.7µF', step === 3 || f.ripple, f.ripple ? ORANGE : BLUE);
    drawIndH(L1_X, L1_X + 60, HV_Y, 'L 1mH', step === 3);
    drawCapV(C2_X, HV_Y, GND_Y, 'C 1µF', step === 3 || f.ripple, f.ripple ? ORANGE : BLUE);
    // stage 3 — IC
    drawChip(on, step >= 4 && step <= 6);
    drawCapV(BP_X, 236, SB_Y, 'C 0.1µF', fault === 'bp' || step === 4, fault === 'bp' ? RED : BLUE, true);
    // stage 4 — buck output
    drawDiode(SW_X, SB_Y, 'U', 'D2', step === 5 || fault === 'd2', fault === 'd2' ? RED : BLUE);
    line([[SW_X, SB_Y + 18], [SW_X, GND_Y]], fault === 'd2' ? RED : txt);
    if (fault === 'd2') dash([[SW_X - 14, SB_Y + 9], [SW_X + 14, SB_Y + 9]], RED, 2.4);
    drawIndH(L2_X, OUT_X, SB_Y, 'L 1mH', step === 4 || step === 5);
    drawCapV(CO_X, SB_Y, GND_Y, 'C out', step === 5, GREEN, true);
    drawZener(ZD_X, SB_Y, GND_Y, step === 4);
    // stage 5 — feedback divider (returns to S, not to ground)
    line([[DIV_X, FB_Y], [DIV_X, SB_Y]], step === 6 ? VIOLET : txt);
    drawResV(DIV_X, FB_Y + 26, SB_Y - 2, 'R 4.3K', step === 6, VIOLET, true);
    drawDiode(DIV_X, FB_Y + 2, 'U', 'D3', step === 6, VIOLET);
    line([[DIV_X, FB_Y], [FB_X, FB_Y]], step === 6 ? VIOLET : txt);
    drawResV(FB_X, FB_Y, SB_Y, 'R 2K', step === 6, VIOLET);
    drawGnd(AC_X + 120, GND_Y);

    // SW node dot
    ctx.fillStyle = step >= 4 ? (on ? GREEN : css('--text-light')) : css('--text');
    ctx.beginPath(); ctx.arc(SW_X, SB_Y, 4, 0, 7); ctx.fill();

    // current animation
    flow(P_INPUT, ORANGE, 80, step === 1 && live);
    flow(P_FILTER, BLUE, 80, step === 3 && live);
    flow(P_ON, GREEN, 110, (step === 4 || step >= 6) && f.sw && on);
    flow(P_OFF, BLUE, 90, (step === 5 || step >= 6) && f.sw && !on && !f.nofw);
    flow(P_FB, VIOLET, 60, step === 6 && f.sw);
    if (step === 2 && live) flow(P_INPUT, GREEN, 80, Math.sin(flowT * 3) > 0);

    // step-7 shock path
    if (step === 7) {
      label((AC_X + TERM_X) / 2, GND_Y + 22,
        t('เส้นนี้คือสาย N ของไฟบ้าน และเป็น GND ของไฟ 5V ด้วย — เป็นเส้นเดียวกันจริงๆ',
          'this track is the mains N and the 5V ground at the same time — literally one node'),
        RED, 11, 'center', 700);
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
  const playBtn = document.getElementById('sp-play');
  const loadBtn = document.getElementById('sp-load');
  const faultSel = document.getElementById('sp-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(8, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncLoad() {
    loadBtn.classList.toggle('active', heavy);
    loadBtn.querySelectorAll('.sp-hv').forEach(e => e.style.display = heavy ? '' : 'none');
    loadBtn.querySelectorAll('.sp-lt').forEach(e => e.style.display = heavy ? 'none' : '');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('sp-prev').addEventListener('click', () => setStep(step === 1 ? 8 : step - 1));
  document.getElementById('sp-next').addEventListener('click', () => setStep(step === 8 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  loadBtn.addEventListener('click', () => { heavy = !heavy; syncLoad(); });
  faultSel.addEventListener('change', () => {
    fault = FAULTS[faultSel.value] ? faultSel.value : 'ok';
    root.querySelectorAll('.sp-faultnote').forEach(e => e.classList.toggle('active', fault !== 'ok'));
  });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  syncLoad();
  requestAnimationFrame(frame);
})();
