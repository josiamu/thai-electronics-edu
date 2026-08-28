/* kirchhoff-sim.js — Interactive "กฎของเคอร์ชฮอฟฟ์" (kirchhoff.html, #kf-canvas)
 *
 * วงจร 2 ลูปคลาสสิก: แหล่งจ่าย 2 ตัวป้อนเข้าจุดต่อ A ร่วมกัน แล้วไหลลงตัวต้านทานร่วม R3
 *
 *      V1 ──R1──┐         ┌──R2── V2
 *               A ── R3 ── (ลงกราวด์)
 *
 * ทั้งสองกฎถูก "วัด" จากคำตอบเดียวกัน ไม่ได้แยกคำนวณ — ผู้เรียนจึงเห็นว่า KCL กับ KVL
 * ไม่ใช่สูตรคนละชุด แต่เป็นเงื่อนไขสองข้อที่คำตอบจริงต้องผ่านพร้อมกัน
 *
 * โซลเวอร์คือ nodal analysis 1 โหนด (Va) — สมการเดียวกับที่ js/breadboard.js ใช้ (MNA)
 * จึงตอบคำถามในบทได้ว่า "เรียน KCL ไปทำไม" → เพราะมันคือแถวหนึ่งในเมทริกซ์ของโปรแกรมจำลองวงจร
 *
 * ป้ายบนแคนวาสเป็น text ทั้งหมด → ต้องดัก langchange ที่ document แล้ววาดใหม่
 * (nav.js dispatch ที่ document ไม่ bubble มาจาก element)
 */
(function () {
  const cv = document.getElementById('kf-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 520, H = 300;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  /* ---------- พิกัดวงจร ---------- */
  const XL = 70, XM = 260, XR = 450;   // แกนตั้ง: ซ้าย / กลาง (จุดต่อ A) / ขวา
  const YT = 78, YB = 248;             // เส้นบน (ระดับจุดต่อ) / รางล่าง (กราวด์ร่วม)

  const state = { v1: 12, v2: 9, r1: 100, r2: 150, r3: 220, mode: 'kcl', t: 0 };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const tr = (th, en) => (isEN() ? en : th);

  /* ---------- โซลเวอร์: nodal analysis ที่จุดต่อ A ---------- */
  // KCL ที่ A:  (V1−Va)/R1 + (V2−Va)/R2 = Va/R3
  function solve() {
    const v1 = state.v1, v2 = state.v2, r1 = state.r1, r2 = state.r2, r3 = state.r3;
    const va = (v1 / r1 + v2 / r2) / (1 / r1 + 1 / r2 + 1 / r3);
    const i1 = (v1 - va) / r1;      // + = ไหลเข้าจุดต่อ
    const i2 = (v2 - va) / r2;      // + = ไหลเข้าจุดต่อ
    const i3 = va / r3;             // + = ไหลออกจากจุดต่อ ลงกราวด์
    return {
      va: va, i1: i1, i2: i2, i3: i3,
      kcl: i1 + i2 - i3,                 // ต้องเป็น 0
      kvl1: v1 - i1 * r1 - i3 * r3,      // ลูปซ้าย: V1 − I1R1 − I3R3 = 0
      kvl2: v2 - i2 * r2 - i3 * r3       // ลูปขวา: V2 − I2R2 − I3R3 = 0
    };
  }

  const mA = a => a * 1000;
  const fmtI = a => mA(a).toFixed(1) + ' mA';
  const fmtV = v => v.toFixed(2) + ' V';

  /* ---------- ตัวช่วยวาด ---------- */
  function wire(pts, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  // ตัวต้านทานแบบซิกแซก — vert=true คือวางตามแนวตั้ง
  function resistor(x, y, vert, color) {
    const L = 46, w = 7, n = 6;
    ctx.strokeStyle = color; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = -L / 2 + (L * i) / n;
      const off = (i === 0 || i === n) ? 0 : (i % 2 ? w : -w);
      const px = vert ? x + off : x + p;
      const py = vert ? y + p : y + off;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // แหล่งจ่าย: ขีดยาว = ขั้วบวก, ขีดสั้น = ขั้วลบ (ขั้วบวกอยู่ด้านบนเสมอในฉากนี้)
  function battery(x, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x - 13, y - 5); ctx.lineTo(x + 13, y - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 6, y + 5); ctx.lineTo(x + 6, y + 5); ctx.stroke();
  }

  function ground(x, y, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 12); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const w = 14 - i * 5;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + 12 + i * 4); ctx.lineTo(x + w / 2, y + 12 + i * 4);
      ctx.stroke();
    }
  }

  function label(txt, x, y, color, align, size) {
    ctx.fillStyle = color;
    ctx.font = (size || 12) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ---------- เส้นทางกระแสแต่ละสาขา ---------- */
  // ทิศบวกของแต่ละเส้น = ทิศที่นิยามไว้ใน solve()
  const P1 = [[XL, YB], [XL, YT], [XM, YT]];          // I1 เข้าจุดต่อ
  const P2 = [[XR, YB], [XR, YT], [XM, YT]];          // I2 เข้าจุดต่อ
  const P3 = [[XM, YT], [XM, YB]];                    // I3 ออกจากจุดต่อ
  const P4 = [[XM, YB], [XL, YB]];                    // ทางกลับของ I1 บนรางล่าง
  const P5 = [[XM, YB], [XR, YB]];                    // ทางกลับของ I2 บนรางล่าง

  function pathLen(p) {
    let L = 0;
    for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return L;
  }
  function pointAt(p, d) {
    for (let i = 1; i < p.length; i++) {
      const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= seg) {
        const k = seg === 0 ? 0 : d / seg;
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
      }
      d -= seg;
    }
    return p[p.length - 1];
  }

  // จุดกระแสสมมติ (+ → −) เว้นระยะเท่ากันตลอดเส้น ความเร็วแปรตามขนาดกระแส
  function flow(p, cur, color) {
    const amp = Math.abs(mA(cur));
    if (amp < 0.05) return;
    const L = pathLen(p);
    const gap = 34;
    const n = Math.max(1, Math.floor(L / gap));
    const speed = Math.min(70, 14 + amp * 0.55);       // px/วินาที (หนีบไว้ไม่ให้เร็วจนตาลาย)
    const dir = cur >= 0 ? 1 : -1;
    const off = ((state.t * speed) % gap + gap) % gap;
    ctx.fillStyle = color;
    for (let i = 0; i < n + 1; i++) {
      const d = i * gap + off;
      if (d > L) continue;
      const pt = pointAt(p, dir > 0 ? d : L - d);
      ctx.beginPath(); ctx.arc(pt[0], pt[1], 3.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- ธีม ---------- */
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { bg: '#0b1220', wire: '#94a3b8', text: '#e2e8f0', dim: '#94a3b8',
          i1: '#38bdf8', i2: '#fb923c', i3: '#4ade80', hi: '#facc15' }
      : { bg: '#f8fafc', wire: '#64748b', text: '#0f172a', dim: '#64748b',
          i1: '#0284c7', i2: '#ea580c', i3: '#16a34a', hi: '#ca8a04' };
  }

  /* ---------- วาด ---------- */
  function render() {
    const s = solve(), c = theme();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

    // ไฮไลต์ลูปที่กำลังพิจารณา (วาดใต้เส้นวงจร)
    if (state.mode === 'kvl1' || state.mode === 'kvl2') {
      const left = state.mode === 'kvl1';
      ctx.save();
      ctx.strokeStyle = c.hi; ctx.lineWidth = 9; ctx.globalAlpha = 0.28;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      if (left) {
        ctx.moveTo(XL, YB); ctx.lineTo(XL, YT); ctx.lineTo(XM, YT);
        ctx.lineTo(XM, YB); ctx.lineTo(XL, YB);
      } else {
        ctx.moveTo(XR, YB); ctx.lineTo(XR, YT); ctx.lineTo(XM, YT);
        ctx.lineTo(XM, YB); ctx.lineTo(XR, YB);
      }
      ctx.stroke();
      ctx.restore();
    }

    // เส้นวงจร
    wire([[XL, YB], [XL, YT], [XM, YT]], c.wire);
    wire([[XR, YB], [XR, YT], [XM, YT]], c.wire);
    wire([[XM, YT], [XM, YB]], c.wire);
    wire([[XL, YB], [XR, YB]], c.wire);

    // เว้นช่องพื้นหลังให้สัญลักษณ์อุปกรณ์ แล้ววาดทับเส้น
    ctx.fillStyle = c.bg;
    ctx.fillRect(XL - 10, 152, 20, 24); ctx.fillRect(XR - 10, 152, 20, 24);
    ctx.fillRect(140, YT - 10, 52, 20); ctx.fillRect(328, YT - 10, 52, 20);
    ctx.fillRect(XM - 10, 140, 20, 52);
    battery(XL, 164, c.i1);
    battery(XR, 164, c.i2);
    resistor(166, YT, false, c.i1);
    resistor(354, YT, false, c.i2);
    resistor(XM, 166, true, c.i3);
    ground(XM + 60, YB, c.wire);

    // จุดต่อ A
    if (state.mode === 'kcl') {
      ctx.save();
      ctx.strokeStyle = c.hi; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(XM, YT, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = c.wire;
    ctx.beginPath(); ctx.arc(XM, YT, 4.5, 0, Math.PI * 2); ctx.fill();
    label(tr('จุดต่อ A', 'Node A'), XM, YT - 34, c.text, 'center', 13);

    // จุดกระแสวิ่ง
    flow(P1, s.i1, c.i1); flow(P4, s.i1, c.i1);
    flow(P2, s.i2, c.i2); flow(P5, s.i2, c.i2);
    flow(P3, s.i3, c.i3);

    // ป้ายอุปกรณ์ — วางคนละแกนกันทุกตัว กันตัวอักษรทับ
    label('V1 = ' + state.v1 + ' V', XL + 14, 196, c.i1, 'left');
    label('V2 = ' + state.v2 + ' V', XR - 14, 196, c.i2, 'right');
    label('R1 = ' + state.r1 + ' Ω', 166, YT - 22, c.i1);
    label('R2 = ' + state.r2 + ' Ω', 354, YT - 22, c.i2);
    label('R3 = ' + state.r3 + ' Ω', XM + 18, 166, c.i3, 'left');

    // ป้ายกระแส
    label('I1 = ' + fmtI(s.i1), XL + 14, 112, c.i1, 'left');
    label('I2 = ' + fmtI(s.i2), XR - 14, 112, c.i2, 'right');
    label('I3 = ' + fmtI(s.i3), XM - 18, 216, c.i3, 'right');
    label('V(A) = ' + fmtV(s.va), XM + 14, YT + 30, c.dim, 'left', 11);

    // แถบสรุปกฎที่กำลังดูอยู่ (บรรทัดเดียว ล่างสุด — ย่อฟอนต์ถ้ายาวเกินขอบ)
    let line;
    if (state.mode === 'kcl') {
      line = 'KCL: I1 + I2 = ' + mA(s.i1).toFixed(1) + ' + ' + mA(s.i2).toFixed(1) +
        ' = ' + mA(s.i1 + s.i2).toFixed(1) + ' mA  =  I3';
    } else if (state.mode === 'kvl1') {
      line = 'KVL ①: ' + state.v1 + ' − (' + mA(s.i1).toFixed(1) + 'mA×' + state.r1 +
        'Ω) − (' + mA(s.i3).toFixed(1) + 'mA×' + state.r3 + 'Ω) = ' + s.kvl1.toFixed(3) + ' V';
    } else {
      line = 'KVL ②: ' + state.v2 + ' − (' + mA(s.i2).toFixed(1) + 'mA×' + state.r2 +
        'Ω) − (' + mA(s.i3).toFixed(1) + 'mA×' + state.r3 + 'Ω) = ' + s.kvl2.toFixed(3) + ' V';
    }
    ctx.save();
    let fs = 12;
    ctx.font = '600 ' + fs + 'px Anuphan, sans-serif';
    while (ctx.measureText(line).width > W - 24 && fs > 9) {
      fs -= 0.5; ctx.font = '600 ' + fs + 'px Anuphan, sans-serif';
    }
    ctx.fillStyle = c.text; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(line, W / 2, H - 16);
    ctx.restore();

    readout(s);
  }

  /* ---------- แผงอ่านค่า ---------- */
  function readout(s) {
    const L = [
      [tr('กระแส I1 (ผ่าน R1)', 'Current I1 (through R1)'), fmtI(s.i1)],
      [tr('กระแส I2 (ผ่าน R2)', 'Current I2 (through R2)'), fmtI(s.i2)],
      [tr('กระแส I3 (ผ่าน R3)', 'Current I3 (through R3)'), fmtI(s.i3)],
      [tr('แรงดันที่จุดต่อ A', 'Voltage at node A'), fmtV(s.va)]
    ];
    for (let i = 0; i < 4; i++) {
      const l = $('kf-l' + (i + 1)), v = $('kf-out' + (i + 1));
      if (l) l.textContent = L[i][0];
      if (v) v.textContent = L[i][1];
    }

    const vd = $('kf-verdict');
    if (!vd) return;
    const c = theme();
    // ตัวเลขที่โชว์ถูกปัดทศนิยม แต่การตรวจใช้ค่าจริง — เศษที่เหลือเป็น floating point ล้วนๆ
    if (state.mode === 'kcl') {
      vd.style.color = c.i3;
      vd.textContent = tr(
        '✓ กระแสที่ไหลเข้าจุดต่อ (' + mA(s.i1 + s.i2).toFixed(1) + ' mA) เท่ากับที่ไหลออก (' +
          mA(s.i3).toFixed(1) + ' mA) พอดี — จุดต่อไม่เก็บประจุไว้เลย',
        '✓ Current in (' + mA(s.i1 + s.i2).toFixed(1) + ' mA) equals current out (' +
          mA(s.i3).toFixed(1) + ' mA) — a node stores no charge');
    } else {
      const left = state.mode === 'kvl1';
      const v = left ? state.v1 : state.v2;
      const rDrop = left ? s.i1 * state.r1 : s.i2 * state.r2;
      const r3Drop = s.i3 * state.r3;
      vd.style.color = c.hi;
      vd.textContent = tr(
        '✓ แรงดันจ่ายเข้า ' + v.toFixed(2) + ' V ถูกใช้หมดพอดีในลูป: ตกที่ R' + (left ? '1' : '2') +
          ' ' + rDrop.toFixed(2) + ' V + ตกที่ R3 ' + r3Drop.toFixed(2) + ' V',
        '✓ The ' + v.toFixed(2) + ' V supplied is used up around the loop: ' + rDrop.toFixed(2) +
          ' V across R' + (left ? '1' : '2') + ' + ' + r3Drop.toFixed(2) + ' V across R3');
    }
  }

  /* ---------- ตัวควบคุม ---------- */
  const SLIDERS = [
    ['kf-v1', 'v1', v => v + ' V'],
    ['kf-v2', 'v2', v => v + ' V'],
    ['kf-r1', 'r1', v => v + ' Ω'],
    ['kf-r2', 'r2', v => v + ' Ω'],
    ['kf-r3', 'r3', v => v + ' Ω']
  ];
  SLIDERS.forEach(function (sl) {
    const el = $(sl[0]); if (!el) return;
    const out = $(sl[0] + '-val');
    el.value = state[sl[1]];
    if (out) out.textContent = sl[2](state[sl[1]]);
    el.addEventListener('input', function () {
      state[sl[1]] = +this.value;
      if (out) out.textContent = sl[2](state[sl[1]]);
      render();
    });
  });

  const MODES = [['kf-mode-kcl', 'kcl'], ['kf-mode-kvl1', 'kvl1'], ['kf-mode-kvl2', 'kvl2']];
  MODES.forEach(function (m) {
    const el = $(m[0]); if (!el) return;
    el.addEventListener('click', function () {
      state.mode = m[1];
      MODES.forEach(function (x) {
        const e = $(x[0]); if (e) e.classList.toggle('active', x[1] === state.mode);
      });
      render();
    });
  });

  document.addEventListener('langchange', render);
  const mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- ลูปเฟรม (มีไว้ขยับจุดกระแสอย่างเดียว) ---------- */
  let raf = null, last = null;
  function frame(now) {
    if (last === null) last = now;
    state.t += (now - last) / 1000; last = now;
    if (!document.hidden) render();
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () {
    last = null;
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(frame);
  });

  render();
  raf = requestAnimationFrame(frame);
})();
