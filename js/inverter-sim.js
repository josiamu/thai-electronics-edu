/* inverter-sim.js — Interactive อินเวอร์เตอร์ / VFD (inverter.html, #inv-canvas)
 *
 * แก่นของบท: อินเวอร์เตอร์ไม่ได้แค่ "เปลี่ยนความถี่" — มันต้อง **ลดแรงดันตามความถี่ด้วย**
 * เพราะฟลักซ์ในแกนเหล็กของมอเตอร์แปรตาม V/f ตรง ๆ ถ้ากดความถี่ลงแต่คาแรงดันไว้ที่ 220V
 * ฟลักซ์จะพุ่งเกินพิกัด แกนอิ่มตัว กระแสสร้างสนามพุ่ง มอเตอร์ร้อนจัดทั้งที่ยังไม่ได้ออกแรงเลย
 *
 * 2 ชุดปุ่มที่สอนคนละเรื่อง — ห้ามยุบรวมกัน:
 *   wave : รูปคลื่นที่สวิตช์ออกมาจริง (square / modified / spwm) — สอนว่า PWM ไม่ได้ "เป็นไซน์"
 *          แต่ค่าเฉลี่ยของมันเป็นไซน์ และตัวเหนี่ยวนำของมอเตอร์เป็นตัวกรองให้เอง
 *   ctrl : vf    = ลดแรงดันตามความถี่ (V/f คงที่) → ฟลักซ์คงที่ 100%
 *          fixed = คาแรงดันไว้ 220V ทุกความถี่ → ฟลักซ์ = 50/f เท่าของพิกัด = บทเรียนหลักของซิม
 *          **ห้ามทำให้โหมด fixed ปลอดภัย** ไม่งั้นซิมจะไม่เหลืออะไรให้สอน
 *
 * เหนือ 50 Hz แรงดันเพิ่มไม่ได้แล้ว (บัส DC จำกัด) → ฟลักซ์ลดลงเอง = field weakening
 * แรงบิดที่ทำได้แปรตามฟลักซ์กำลังสอง จึงตกตามส่วน — นี่คือเหตุผลที่ปั่นเกินพิกัดแล้วแรงตก
 *
 * ป้ายบนแคนวาสเป็น text → ดัก langchange ที่ document + MutationObserver ดู data-theme
 */
(function () {
  const cv = document.getElementById('inv-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 560, H = 330;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  /* ---------- พิกัดของมอเตอร์ตัวอย่าง ---------- */
  const V_RATED = 220;      // แรงดันพิกัด (V)
  const F_RATED = 50;       // ความถี่พิกัด (Hz)
  const POLES = 4;          // จำนวนขั้ว → ns = 120f/P = 30f
  const VF_RATED = V_RATED / F_RATED;   // 4.4 V/Hz
  const SLIP_FULL = 0.04;   // สลิปที่โหลดเต็มพิกัด

  const state = { f: 50, load: 60, wave: 'spwm', ctrl: 'vf', ang: 0, t: 0 };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const tr = (th, en) => (isEN() ? en : th);

  /* ---------- โซลเวอร์ ---------- */
  function solve() {
    const f = state.f;
    const v = state.ctrl === 'vf' ? Math.min(V_RATED, VF_RATED * f) : V_RATED;
    const flux = (v / f) / VF_RATED;                 // 1.0 = พิกัดพอดี
    const ns = 120 * f / POLES;                      // ความเร็วสนามหมุน (rpm)
    // แรงบิดที่ทำได้แปรตามฟลักซ์กำลังสอง และแกนที่อิ่มตัวแล้วไม่ได้แรงบิดเพิ่ม
    const cap = 150 * Math.pow(Math.min(flux, 1), 2);
    const load = state.load;
    const stall = load > cap;
    const slip = stall ? 1 : SLIP_FULL * (load / 100) / Math.max(0.35, Math.min(flux, 1));
    const rpm = stall ? 0 : ns * (1 - slip);
    // กระแสสร้างสนาม: เชิงเส้นจนถึงพิกัด แล้วพุ่งเมื่อแกนอิ่มตัว
    const imag = flux + 7 * Math.pow(Math.max(0, flux - 1), 2);
    return {
      v: v, flux: flux, ns: ns, rpm: rpm, cap: cap, stall: stall, imag: imag,
      sat: flux > 1.12, weak: flux < 0.92
    };
  }

  /* ---------- รูปคลื่นที่สวิตช์ออกมาจริง (คืนค่า −1..1) ---------- */
  const CARRIER = 21;       // อัตราส่วนความถี่พาห์ต่อความถี่มูลฐาน
  function switched(ph, m) {
    if (state.wave === 'square') return Math.sin(ph) >= 0 ? m : -m;
    if (state.wave === 'modified') {
      const p = ((ph % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const a = Math.PI / 6;                          // ช่วงพักที่จุดตัดศูนย์ 30°
      if (p > a && p < Math.PI - a) return m;
      if (p > Math.PI + a && p < Math.PI * 2 - a) return -m;
      return 0;
    }
    // spwm — เทียบคลื่นไซน์กับคลื่นสามเหลี่ยมพาห์ แล้วสวิตช์เต็มบัสทุกพัลส์
    const carr = Math.asin(Math.sin(ph * CARRIER)) * (2 / Math.PI);
    return Math.sin(ph) * m >= carr ? 1 : -1;
  }

  const f1 = x => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(1));

  /* ---------- ธีม ---------- */
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? {
        bg: '#0b1220', grid: '#1e293b', frame: '#334155', text: '#e2e8f0', dim: '#94a3b8',
        sw: '#38bdf8', fund: '#fbbf24', mot: '#4ade80', bad: '#f87171', warn: '#fbbf24'
      }
      : {
        bg: '#f8fafc', grid: '#e2e8f0', frame: '#cbd5e1', text: '#0f172a', dim: '#64748b',
        sw: '#0284c7', fund: '#d97706', mot: '#16a34a', bad: '#dc2626', warn: '#b45309'
      };
  }

  function label(txt, x, y, color, align, size, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? '600 ' : '') + (size || 12) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  // ข้อความยาว ๆ ที่ต้องอยู่ในความกว้างที่กำหนด — ย่อฟอนต์เองแทนที่จะล้นขอบ
  function fitText(txt, x, y, color, maxW, size, bold) {
    let fs = size || 12;
    ctx.font = (bold ? '600 ' : '') + fs + 'px Anuphan, sans-serif';
    while (ctx.measureText(txt).width > maxW && fs > 8) {
      fs -= 0.5;
      ctx.font = (bold ? '600 ' : '') + fs + 'px Anuphan, sans-serif';
    }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

  /* ---------- พิกัดฉาก ---------- */
  const SX0 = 16, SX1 = 372, SY0 = 30, SY1 = 168;    // จอสโคป
  const SYM = (SY0 + SY1) / 2, SAMP = (SY1 - SY0) / 2 - 8;
  const MX = 468, MY = 100, MR = 42;                  // มอเตอร์
  const BX0 = 16, BX1 = 330, BY = 236, BH = 16;       // แถบฟลักซ์
  const BFULL = 2.5;                                  // ปลายแถบ = 250% ของพิกัด

  function drawScope(c, s) {
    ctx.fillStyle = c.bg; ctx.fillRect(SX0, SY0, SX1 - SX0, SY1 - SY0);
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = SX0 + (SX1 - SX0) * i / 8;
      ctx.beginPath(); ctx.moveTo(x, SY0); ctx.lineTo(x, SY1); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(SX0, SYM); ctx.lineTo(SX1, SYM); ctx.stroke();
    ctx.strokeStyle = c.frame; ctx.strokeRect(SX0, SY0, SX1 - SX0, SY1 - SY0);

    const m = Math.min(1, s.v / V_RATED);
    const N = 720, cycles = 2;

    // คลื่นที่สวิตช์ออกมาจริง
    ctx.strokeStyle = c.sw; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const ph = (i / N) * cycles * Math.PI * 2;
      const x = SX0 + (SX1 - SX0) * i / N;
      const y = SYM - switched(ph, m) * SAMP;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    // คลื่นมูลฐาน = สิ่งที่มอเตอร์รู้สึกจริง หลังตัวเหนี่ยวนำกรองพัลส์ทิ้ง
    ctx.strokeStyle = c.fund; ctx.lineWidth = 2.2; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const ph = (i / N) * cycles * Math.PI * 2;
      const x = SX0 + (SX1 - SX0) * i / N;
      const y = SYM - Math.sin(ph) * m * SAMP;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  function drawMotor(c, s) {
    const running = s.rpm > 1;

    // สายมอเตอร์ 3 เส้น (U V W) จากฝั่งอินเวอร์เตอร์ — ไม่มีสายนิวทรัล
    ctx.lineWidth = 1.8; ctx.strokeStyle = c.sw; ctx.lineCap = 'butt';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(SX1 + 8, MY + i * 13); ctx.lineTo(MX - MR, MY + i * 13);
      ctx.stroke();
    }

    ctx.strokeStyle = running ? c.mot : c.dim; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(MX, MY, MR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(MX, MY, MR - 9, 0, Math.PI * 2); ctx.stroke();

    // โรเตอร์ — หมุนตามรอบจริง
    ctx.save();
    ctx.translate(MX, MY); ctx.rotate(state.ang);
    ctx.strokeStyle = running ? c.mot : c.dim; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-(MR - 16), 0); ctx.lineTo(MR - 16, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -(MR - 16)); ctx.lineTo(0, MR - 16); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = running ? c.mot : c.dim;
    ctx.beginPath(); ctx.arc(MX, MY, 5, 0, Math.PI * 2); ctx.fill();
  }

  function drawFluxBar(c, s) {
    ctx.fillStyle = c.bg; ctx.fillRect(BX0, BY, BX1 - BX0, BH);
    ctx.strokeStyle = c.frame; ctx.lineWidth = 1; ctx.strokeRect(BX0, BY, BX1 - BX0, BH);
    const w = (BX1 - BX0) * Math.min(s.flux, BFULL) / BFULL;
    ctx.fillStyle = s.sat ? c.bad : (s.weak ? c.warn : c.mot);
    ctx.fillRect(BX0 + 1, BY + 1, Math.max(0, w - 2), BH - 2);
    // ขีดพิกัด 100%
    const tx = BX0 + (BX1 - BX0) / BFULL;
    ctx.strokeStyle = c.text; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, BY - 5); ctx.lineTo(tx, BY + BH + 5); ctx.stroke();
    return tx;
  }

  /* ---------- วาด ---------- */
  function render() {
    const s = solve(), c = theme();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

    drawScope(c, s);
    drawMotor(c, s);
    const tx = drawFluxBar(c, s);

    label(tr('แรงดันขาออกของอินเวอร์เตอร์', 'Inverter output voltage'), SX0, 18, c.text, 'left', 11, true);
    label(tr('มอเตอร์ 3 เฟส', '3-phase motor'), MX, 18, c.text, 'center', 11, true);

    fitText(tr('▬ แรงดันที่สวิตช์ออกมาจริง     ▬ ▬ คลื่นมูลฐานที่มอเตอร์รู้สึก',
      '▬ Actual switched voltage     ▬ ▬ Fundamental the motor feels'),
      (SX0 + SX1) / 2, 186, c.dim, SX1 - SX0, 10.5);

    label(s.stall ? tr('หยุดหมุน', 'Stalled') : Math.round(s.rpm) + tr(' รอบ/นาที', ' rpm'),
      MX, 158, s.stall ? c.bad : c.mot, 'center', 12, true);
    label(tr('สนามหมุน ', 'Field ') + Math.round(s.ns), MX, 176, c.dim, 'center', 10.5);

    label('V/f = ' + (s.v / state.f).toFixed(2) + ' V/Hz' +
      tr('   พิกัด ', '   rated ') + VF_RATED.toFixed(2), BX0, 210, c.text, 'left', 11, true);
    label(tr('ฟลักซ์ ', 'Flux ') + Math.round(s.flux * 100) + '%',
      BX1 + 10, BY + BH / 2, s.sat ? c.bad : c.dim, 'left', 11, true);
    label(tr('พิกัด 100%', 'rated 100%'), tx, BY + BH + 16, c.dim, 'center', 10);

    fitText(tr('กระแสสร้างสนาม ' + f1(s.imag * 100) + '% ของปกติ  ·  แรงบิดที่ทำได้ ' + Math.round(s.cap) + '% ของพิกัด',
      'Magnetising current ' + f1(s.imag * 100) + '% of normal  ·  torque available ' + Math.round(s.cap) + '% of rated'),
      W / 2, 284, c.dim, W - 32, 11);

    let line, col;
    if (s.stall) {
      line = tr('✗ โหลด ' + state.load + '% หนักกว่าแรงบิดที่ทำได้ ' + Math.round(s.cap) + '% — มอเตอร์หยุดนิ่งแต่ยังกินกระแสเต็ม',
        '✗ A ' + state.load + '% load exceeds the ' + Math.round(s.cap) + '% torque available — the motor stalls but still draws full current');
      col = c.bad;
    } else if (s.sat) {
      line = tr('✗ V/f เกินพิกัด → แกนเหล็กอิ่มตัว มอเตอร์ร้อนจัดทั้งที่ยังไม่ได้ออกแรง',
        '✗ V/f above rated → the core saturates and the motor cooks without doing any work');
      col = c.bad;
    } else if (s.weak) {
      line = tr('⚠ เหนือ 50 Hz แรงดันเพิ่มไม่ได้แล้ว ฟลักซ์จึงลด — เร็วขึ้นแต่แรงบิดตกตามส่วน',
        '⚠ Above 50 Hz the voltage cannot rise, so flux falls — faster, with proportionally less torque');
      col = c.warn;
    } else {
      line = tr('✓ ฟลักซ์อยู่ที่พิกัด — เปลี่ยนความถี่แล้วรอบเปลี่ยนตาม โดยแรงบิดยังเต็ม',
        '✓ Flux is at its rated value — speed follows frequency with full torque still available');
      col = c.mot;
    }
    fitText(line, W / 2, 312, col, W - 24, 12, true);

    readout(s);
  }

  /* ---------- แผงอ่านค่า ---------- */
  function readout(s) {
    const rows = [
      [tr('แรงดันขาออก', 'Output voltage'), Math.round(s.v) + ' V'],
      [tr('ความเร็วรอบ', 'Shaft speed'), s.stall ? tr('หยุด', 'stalled') : Math.round(s.rpm) + ' rpm'],
      [tr('ฟลักซ์ในแกน', 'Core flux'), Math.round(s.flux * 100) + '%'],
      [tr('แรงบิดที่ทำได้', 'Torque available'), Math.round(s.cap) + '%']
    ];
    for (let i = 0; i < 4; i++) {
      const l = $('inv-l' + (i + 1)), v = $('inv-out' + (i + 1));
      if (l) l.textContent = rows[i][0];
      if (v) v.textContent = rows[i][1];
    }

    const vd = $('inv-verdict');
    if (!vd) return;
    const c = theme();
    if (s.stall) {
      vd.style.color = c.bad;
      vd.textContent = tr(
        'โหลดหนักเกินแรงบิดที่ความถี่นี้ให้ได้ มอเตอร์จึงหยุดหมุน — ของจริงอินเวอร์เตอร์จะแจ้ง OC หรือ OL แล้วตัดตัวเองก่อนขดลวดไหม้',
        'The load is heavier than the torque available at this frequency, so the motor stalls — a real drive trips on OC or OL before the winding burns.');
    } else if (s.sat) {
      vd.style.color = c.bad;
      vd.textContent = tr(
        'คาแรงดันไว้ 220 V ที่ ' + state.f + ' Hz ทำให้ V/f สูงเป็น ' + Math.round(s.flux * 100) + '% ของพิกัด แกนเหล็กอิ่มตัว กระแสสร้างสนามพุ่งเป็น ' + f1(s.imag * 100) + '% ทั้งที่ยังไม่ได้ออกแรง นี่คือเหตุผลที่อินเวอร์เตอร์ต้องลดแรงดันตามความถี่',
        'Holding 220 V at ' + state.f + ' Hz puts V/f at ' + Math.round(s.flux * 100) + '% of rated. The core saturates and magnetising current climbs to ' + f1(s.imag * 100) + '% with no work being done — exactly why a drive lowers voltage along with frequency.');
    } else if (s.weak) {
      vd.style.color = c.warn;
      vd.textContent = tr(
        'เหนือความถี่พิกัด บัส DC ดันแรงดันขึ้นไม่ได้อีก ฟลักซ์จึงเหลือ ' + Math.round(s.flux * 100) + '% — เรียกว่าย่านลดฟลักซ์ ปั่นเร็วขึ้นได้แต่แรงบิดเหลือ ' + Math.round(s.cap) + '%',
        'Above rated frequency the DC bus cannot push the voltage higher, so flux drops to ' + Math.round(s.flux * 100) + '% — the field-weakening region: more speed, but only ' + Math.round(s.cap) + '% torque.');
    } else {
      vd.style.color = c.mot;
      vd.textContent = tr(
        'V/f คงที่ที่ ' + VF_RATED.toFixed(2) + ' V/Hz ฟลักซ์จึงเท่าพิกัดตลอด — ปรับความถี่ได้อิสระโดยแรงบิดไม่หาย ต่างจากการหรี่แรงดันเฉย ๆ ที่ทำให้มอเตอร์อ่อนแรง',
        'V/f stays at ' + VF_RATED.toFixed(2) + ' V/Hz so flux holds at rated — speed follows frequency without losing torque, unlike simply dimming the voltage.');
    }
  }

  /* ---------- ตัวควบคุม ---------- */
  const SLIDERS = [
    ['inv-f', 'f', v => v + ' Hz'],
    ['inv-load', 'load', v => v + '%']
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

  function modeGroup(list, key) {
    list.forEach(function (m) {
      const el = $(m[0]); if (!el) return;
      el.addEventListener('click', function () {
        state[key] = m[1];
        list.forEach(function (x) {
          const e = $(x[0]); if (e) e.classList.toggle('active', x[1] === state[key]);
        });
        render();
      });
    });
  }
  modeGroup([['inv-w-square', 'square'], ['inv-w-mod', 'modified'], ['inv-w-pwm', 'spwm']], 'wave');
  modeGroup([['inv-c-vf', 'vf'], ['inv-c-fixed', 'fixed']], 'ctrl');

  document.addEventListener('langchange', function () { syncSliderLabels(); render(); });
  const mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let raf = null, last = null;
  function frame(now) {
    if (last === null) last = now;
    const dt = (now - last) / 1000; last = now;
    const s = solve();
    state.ang += (s.rpm / 60) * dt * Math.PI * 2 * 0.06;   // หน่วงลงให้ตาตามทัน
    state.t += dt;
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
