/* transformer-sim.js — Interactive หม้อแปลงไฟฟ้า (transformer.html, #tf-canvas)
 *
 * 3 โหมด — แต่ละโหมดสอนคนละเรื่อง อย่ายุบรวมกัน:
 *   ideal : หม้อแปลงอุดมคติ — V2/V1 = N2/N1 และ P_in = P_out เป๊ะ ใช้สอนอัตราส่วนรอบล้วนๆ
 *   real  : ใส่ความต้านทานขดลวด (คอปเปอร์ลอส) + แกนเหล็ก (คอร์ลอส) → **แรงดันออกตกเมื่อโหลดหนัก**
 *           คิดด้วยการ "อ้างอิงอิมพีแดนซ์ข้ามขด": ขดปฐมภูมิที่เห็นจากฝั่งทุติยภูมิ = R1·n²
 *   dc    : ป้อนไฟ DC — ฟลักซ์ไม่เปลี่ยน จึงไม่เหนี่ยวนำอะไรเลย V2 = 0 และขดปฐมภูมิเหลือแค่
 *           ความต้านทาน DC ล้วนๆ → กระแสมหาศาลจนขดไหม้ (นี่คือเหตุผลที่หม้อแปลงใช้กับ AC เท่านั้น)
 *
 * ลูกศรฟลักซ์วิ่งวนในแกนเหล็กเฉพาะโหมด AC — โหมด DC ต้องหยุดนิ่ง ไม่งั้นภาพจะสอนผิด
 * ป้ายบนแคนวาสเป็น text → ดัก langchange ที่ document + MutationObserver ดู data-theme
 */
(function () {
  const cv = document.getElementById('tf-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 520, H = 300;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  /* ---------- ค่าคงที่ของหม้อแปลง "ตัวจริง" ---------- */
  const R1 = 2.0;        // ความต้านทาน DC ของขดปฐมภูมิ (Ω)
  const R2 = 0.3;        // ความต้านทาน DC ของขดทุติยภูมิ (Ω)
  const P_CORE = 1.2;    // คอร์ลอส (W) — เกิดตลอดเวลาที่จ่ายไฟ แม้ไม่มีโหลด
  const I_MAG = 0.02;    // กระแสไม่มีโหลด (A)

  const state = { n1: 500, n2: 50, v1: 220, rl: 20, mode: 'ideal', t: 0 };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const tr = (th, en) => (isEN() ? en : th);

  /* ---------- โซลเวอร์ ---------- */
  function solve() {
    const n = state.n2 / state.n1;              // อัตราส่วนรอบ
    const v1 = state.v1, rl = state.rl;

    if (state.mode === 'dc') {
      // ไม่มี dΦ/dt → ไม่เหนี่ยวนำ ขดปฐมภูมิเหลือแค่ R1 ล้วน
      const i1 = v1 / R1;
      return { n, v2: 0, i2: 0, i1: i1, pin: v1 * i1, pout: 0, eff: 0, burn: true };
    }

    const v2i = v1 * n;                          // แรงดันเหนี่ยวนำ (ยังไม่หักการสูญเสีย)
    if (state.mode === 'ideal') {
      const i2 = v2i / rl;
      const pout = v2i * i2;
      return { n, v2: v2i, i2: i2, i1: i2 * n, pin: pout, pout: pout, eff: 100, burn: false };
    }

    // real — ขดปฐมภูมิที่อ้างอิงมาฝั่งทุติยภูมิมีค่า R1·n²
    const rTot = rl + R2 + R1 * n * n;
    const i2 = v2i / rTot;
    const v2 = i2 * rl;                          // แรงดันที่โหลดได้จริง (ตกลงเพราะกินไปกับขดลวด)
    const pout = v2 * i2;
    const pcu = i2 * i2 * (R2 + R1 * n * n);     // คอปเปอร์ลอสรวมทั้งสองขด
    const pin = pout + pcu + P_CORE;
    const i1 = Math.hypot(i2 * n, I_MAG);        // กระแสโหลด + กระแสสร้างสนาม
    return { n, v2: v2, i2: i2, i1: i1, pin: pin, pout: pout, eff: pin > 0 ? (pout / pin) * 100 : 0, burn: false };
  }

  const f2 = x => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2));
  const fmtV = v => f2(v) + ' V';
  const fmtA = a => (Math.abs(a) < 1 ? (a * 1000).toFixed(0) + ' mA' : a.toFixed(2) + ' A');
  const fmtW = w => (Math.abs(w) >= 1000 ? (w / 1000).toFixed(2) + ' kW' : f2(w) + ' W');

  /* ---------- ธีม ---------- */
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? { bg: '#0b1220', core: '#475569', text: '#e2e8f0', dim: '#94a3b8',
          pri: '#38bdf8', sec: '#4ade80', flux: '#c084fc', bad: '#f87171' }
      : { bg: '#f8fafc', core: '#94a3b8', text: '#0f172a', dim: '#64748b',
          pri: '#0284c7', sec: '#16a34a', flux: '#9333ea', bad: '#dc2626' };
  }

  function label(txt, x, y, color, align, size, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? '600 ' : '') + (size || 12) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ---------- พิกัดแกนเหล็ก ---------- */
  const CX1 = 200, CX2 = 320;        // แกนตั้งซ้าย/ขวาของแกนเหล็ก
  const CY1 = 70, CY2 = 210;         // ขอบบน/ล่างของแกน
  const CW = 16;                     // ความหนาของแกน

  function drawCore(c) {
    ctx.strokeStyle = c.core; ctx.lineWidth = CW; ctx.lineJoin = 'miter';
    ctx.strokeRect(CX1, CY1, CX2 - CX1, CY2 - CY1);
  }

  // ขดลวด: วาดเป็นครึ่งวงกลมซ้อนกันตามแนวตั้ง จำนวนขดสื่อถึงจำนวนรอบ (ไม่ใช่ 1:1)
  function drawCoil(x, turns, color, side) {
    const n = Math.max(3, Math.min(9, Math.round(3 + turns / 130)));
    const top = CY1 + 8, bot = CY2 - 8;
    const step = (bot - top) / n;
    const r = Math.min(11, step / 2);
    ctx.strokeStyle = color; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const cy = top + step * (i + 0.5);
      ctx.beginPath();
      ctx.arc(x, cy, r, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? -Math.PI / 2 : Math.PI / 2, false);
      ctx.stroke();
    }
    return { top: top, bot: bot, x: x + (side < 0 ? -r : r) };
  }

  function drawFlux(c, moving) {
    const perim = 2 * ((CX2 - CX1) + (CY2 - CY1));
    const gap = 40;
    const n = Math.floor(perim / gap);
    const off = moving ? (state.t * 55) % gap : 0;
    ctx.fillStyle = c.flux;
    for (let i = 0; i < n; i++) {
      let d = (i * gap + off) % perim;
      // เดินรอบสี่เหลี่ยม: บน → ขวา → ล่าง → ซ้าย
      const w = CX2 - CX1, h = CY2 - CY1;
      let x, y;
      if (d < w) { x = CX1 + d; y = CY1; }
      else if (d < w + h) { x = CX2; y = CY1 + (d - w); }
      else if (d < 2 * w + h) { x = CX2 - (d - w - h); y = CY2; }
      else { x = CX1; y = CY2 - (d - 2 * w - h); }
      ctx.globalAlpha = moving ? 0.95 : 0.25;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- วาด ---------- */
  function render() {
    const s = solve(), c = theme();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

    drawCore(c);
    drawFlux(c, state.mode !== 'dc');
    const pri = drawCoil(CX1, state.n1, c.pri, -1);
    const sec = drawCoil(CX2, state.n2, c.sec, +1);

    // สายฝั่งปฐมภูมิ (ซ้าย) และทุติยภูมิ (ขวา) + โหลด
    ctx.strokeStyle = c.pri; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pri.x, pri.top); ctx.lineTo(96, pri.top); ctx.lineTo(96, 120);
    ctx.moveTo(pri.x, pri.bot); ctx.lineTo(96, pri.bot); ctx.lineTo(96, 160);
    ctx.stroke();
    // สัญลักษณ์แหล่งจ่าย
    ctx.beginPath(); ctx.arc(96, 140, 20, 0, Math.PI * 2); ctx.stroke();
    if (state.mode === 'dc') {
      ctx.beginPath(); ctx.moveTo(86, 137); ctx.lineTo(106, 137); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(90, 145); ctx.lineTo(102, 145); ctx.stroke();
    } else {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = 82 + i * 1.4, y = 140 - Math.sin((i / 20) * Math.PI * 2) * 8;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = c.sec; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(sec.x, sec.top); ctx.lineTo(424, sec.top); ctx.lineTo(424, 122);
    ctx.moveTo(sec.x, sec.bot); ctx.lineTo(424, sec.bot); ctx.lineTo(424, 158);
    ctx.stroke();
    // โหลด (ตัวต้านทาน)
    ctx.strokeRect(414, 122, 20, 36);

    // ป้าย — วางคนละแกน/คนละระดับกันทุกตัว
    label(tr('ขดปฐมภูมิ', 'Primary'), 96, 46, c.pri, 'center', 12, true);
    label('N1 = ' + state.n1 + tr(' รอบ', ' turns'), 96, 64, c.pri, 'center', 11);
    label(tr('ขดทุติยภูมิ', 'Secondary'), 424, 46, c.sec, 'center', 12, true);
    label('N2 = ' + state.n2 + tr(' รอบ', ' turns'), 424, 64, c.sec, 'center', 11);

    label('V1 = ' + fmtV(state.v1), 96, 178, c.pri, 'center', 12);
    label('I1 = ' + fmtA(s.i1), 96, 196, c.pri, 'center', 12);
    label('V2 = ' + fmtV(s.v2), 424, 178, c.sec, 'center', 12);
    label('I2 = ' + fmtA(s.i2), 424, 196, c.sec, 'center', 12);
    label('RL ' + state.rl + ' Ω', 452, 140, c.dim, 'left', 11);

    label(tr('แกนเหล็ก', 'Iron core'), (CX1 + CX2) / 2, CY1 - 26, c.dim, 'center', 11);
    label(state.mode === 'dc' ? tr('ฟลักซ์นิ่ง', 'Flux frozen') : tr('ฟลักซ์สลับไปมา', 'Flux alternating'),
      (CX1 + CX2) / 2, CY2 + 24, c.flux, 'center', 11);

    // อัตราส่วนรอบกลางแกน
    const ratio = (state.n1 / state.n2);
    label('N1 : N2 = ' + ratio.toFixed(ratio >= 10 ? 0 : 1) + ' : 1',
      (CX1 + CX2) / 2, (CY1 + CY2) / 2, c.text, 'center', 12, true);

    // แถบสรุปล่าง — ย่อฟอนต์เองถ้ายาวเกินขอบ
    let line;
    if (state.mode === 'dc') {
      line = tr('⚠ ไฟ DC: ฟลักซ์ไม่เปลี่ยน → V2 = 0 และขดปฐมภูมิกินกระแส ' + fmtA(s.i1) + ' จนไหม้',
        '⚠ DC input: flux never changes → V2 = 0 and the primary draws ' + fmtA(s.i1) + ' until it burns');
    } else if (state.mode === 'ideal') {
      line = 'P_in = P_out = ' + fmtW(s.pout) + '  ·  V2/V1 = N2/N1 = ' + s.n.toFixed(3);
    } else {
      line = 'P_in ' + fmtW(s.pin) + ' → P_out ' + fmtW(s.pout) + '  ·  η = ' + s.eff.toFixed(1) + '%';
    }
    ctx.save();
    let fs = 12;
    ctx.font = '600 ' + fs + 'px Anuphan, sans-serif';
    while (ctx.measureText(line).width > W - 24 && fs > 9) {
      fs -= 0.5; ctx.font = '600 ' + fs + 'px Anuphan, sans-serif';
    }
    ctx.fillStyle = s.burn ? c.bad : c.text;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(line, W / 2, H - 16);
    ctx.restore();

    readout(s);
  }

  /* ---------- แผงอ่านค่า ---------- */
  function readout(s) {
    const rows = [
      [tr('แรงดันออก V2', 'Output voltage V2'), fmtV(s.v2)],
      [tr('กระแสออก I2', 'Output current I2'), fmtA(s.i2)],
      [tr('กระแสเข้า I1', 'Input current I1'), fmtA(s.i1)],
      [tr('ประสิทธิภาพ η', 'Efficiency η'), state.mode === 'dc' ? '—' : s.eff.toFixed(1) + '%']
    ];
    for (let i = 0; i < 4; i++) {
      const l = $('tf-l' + (i + 1)), v = $('tf-out' + (i + 1));
      if (l) l.textContent = rows[i][0];
      if (v) v.textContent = rows[i][1];
    }

    const vd = $('tf-verdict');
    if (!vd) return;
    const c = theme();
    if (state.mode === 'dc') {
      vd.style.color = c.bad;
      vd.textContent = tr(
        '✗ หม้อแปลงทำงานกับไฟ DC ไม่ได้เลย — ไม่มีฟลักซ์ที่เปลี่ยนแปลง ก็ไม่มีแรงดันเหนี่ยวนำ ขดปฐมภูมิเหลือแค่ความต้านทาน ' + R1 + ' Ω จึงกินกระแสจนไหม้',
        '✗ A transformer cannot work on DC — no changing flux means no induced voltage. The primary is left as a bare ' + R1 + ' Ω resistance and burns out.');
    } else if (state.mode === 'ideal') {
      vd.style.color = c.sec;
      vd.textContent = tr(
        '✓ แรงดันลดลง ' + (state.n1 / state.n2).toFixed(1) + ' เท่า แต่กระแสเพิ่มขึ้น ' + (state.n1 / state.n2).toFixed(1) + ' เท่า — กำลังไฟฟ้าจึงเท่าเดิม หม้อแปลงไม่ได้เพิ่มพลังงานให้ใคร',
        '✓ Voltage divided by ' + (state.n1 / state.n2).toFixed(1) + ', current multiplied by the same — power is unchanged. A transformer never creates energy.');
    } else {
      const drop = state.v1 * s.n - s.v2;
      vd.style.color = c.dim;
      vd.textContent = tr(
        'ของจริงแรงดันตกไป ' + f2(drop) + ' V จากค่าตามอัตราส่วนรอบ (กินไปกับความต้านทานขดลวด) และมีคอร์ลอสอีก ' + P_CORE + ' W ตลอดเวลาที่เสียบปลั๊ก แม้ยังไม่ต่อโหลด',
        'In reality the output sags ' + f2(drop) + ' V below the turns-ratio value (winding resistance), plus ' + P_CORE + ' W of core loss whenever it is plugged in — even with no load.');
    }
  }

  /* ---------- ตัวควบคุม ---------- */
  const SLIDERS = [
    ['tf-n1', 'n1', v => v + (isEN() ? ' turns' : ' รอบ')],
    ['tf-n2', 'n2', v => v + (isEN() ? ' turns' : ' รอบ')],
    ['tf-v1', 'v1', v => v + ' V'],
    ['tf-rl', 'rl', v => v + ' Ω']
  ];
  function syncSliderLabels() {
    SLIDERS.forEach(function (sl) {
      const out = $(sl[0] + '-val');
      if (out) out.textContent = sl[2](state[sl[1]]);
    });
  }
  SLIDERS.forEach(function (sl) {
    const el = $(sl[0]); if (!el) return;
    el.value = state[sl[1]];
    el.addEventListener('input', function () {
      state[sl[1]] = +this.value;
      syncSliderLabels();
      render();
    });
  });
  syncSliderLabels();

  const MODES = [['tf-mode-ideal', 'ideal'], ['tf-mode-real', 'real'], ['tf-mode-dc', 'dc']];
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

  document.addEventListener('langchange', function () { syncSliderLabels(); render(); });
  const mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

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
