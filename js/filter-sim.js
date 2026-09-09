/* filter-sim.js — Interactive ฟิลเตอร์และเรโซแนนซ์ (filter.html, #flt-canvas)
 *
 * แก่นของบท: ฟิลเตอร์ไม่ได้ "ตัด" ความถี่ทิ้งเป็นกำแพง — มันค่อย ๆ ลดทอนลง
 * กราฟผลตอบสนองความถี่ (Bode) จึงเป็นภาพเดียวที่อธิบายเรื่องนี้ได้ตรงที่สุด
 *
 * 3 โหมด — แต่ละโหมดสอนคนละเรื่อง อย่ายุบรวม:
 *   lp  : RC ผ่านความถี่ต่ำ  — fc = 1/(2πRC), ชัน −20 dB/decade, ที่ fc เหลือ 0.707 เท่า
 *   hp  : RC ผ่านความถี่สูง — สลับตำแหน่ง R กับ C แล้วกราฟกลับข้าง fc สูตรเดิม
 *   rlc : RLC อนุกรม วัดคร่อม R — **เรโซแนนซ์**: XL กับ XC หักล้างกันหมดที่ f0
 *         เหลือแต่ R วงจรจึงยอมให้ความถี่นั้นผ่านมากที่สุด
 *         Q = (1/R)·√(L/C) → **ลด R แล้ว Q สูงขึ้นและแถบผ่านแคบลง** = หัวใจของการจูนคลื่น
 *
 * แกนความถี่เป็นลอการิทึม 10 Hz – 1 MHz เพราะความชันคงที่ต่อ decade จะเห็นเป็นเส้นตรง
 * ป้ายบนแคนวาสเป็น text → ดัก langchange ที่ document + MutationObserver ดู data-theme
 */
(function () {
  const cv = document.getElementById('flt-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const W = 560, H = 330;
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.scale(DPR, DPR);

  /* ---------- ช่วงค่าของสไลเดอร์ (ทุกตัวเป็นลอการิทึม) ---------- */
  const RNG = {
    r: { min: 10, dec: 4 },      // 10 Ω – 100 kΩ
    c: { min: 1e-9, dec: 4 },    // 1 nF – 10 µF
    l: { min: 1e-4, dec: 3 },    // 0.1 mH – 100 mH
    f: { min: 10, dec: 5 }       // 10 Hz – 1 MHz
  };
  const val = (k, pos) => RNG[k].min * Math.pow(10, (pos / 100) * RNG[k].dec);

  const state = { rPos: 50, cPos: 50, lPos: 67, fPos: 40, mode: 'lp' };

  const $ = id => document.getElementById(id);
  const isEN = () => document.documentElement.lang === 'en';
  const tr = (th, en) => (isEN() ? en : th);

  /* ---------- โซลเวอร์ ---------- */
  function solve() {
    const R = val('r', state.rPos), C = val('c', state.cPos), L = val('l', state.lPos);
    const fm = val('f', state.fPos);
    if (state.mode === 'rlc') {
      const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C));
      const Q = Math.sqrt(L / C) / R;
      return { R: R, C: C, L: L, fm: fm, fc: f0, Q: Q, bw: f0 / Q };
    }
    return { R: R, C: C, L: L, fm: fm, fc: 1 / (2 * Math.PI * R * C), Q: null, bw: null };
  }

  // อัตราขยาย (เท่า) ที่ความถี่ f
  function gain(f, s) {
    if (state.mode === 'lp') return 1 / Math.sqrt(1 + Math.pow(f / s.fc, 2));
    if (state.mode === 'hp') { const x = f / s.fc; return x / Math.sqrt(1 + x * x); }
    const d = f / s.fc - s.fc / f;
    return 1 / Math.sqrt(1 + Math.pow(s.Q * d, 2));
  }
  // มุมเฟสของแรงดันขาออกเทียบขาเข้า (องศา)
  function phase(f, s) {
    if (state.mode === 'lp') return -Math.atan(f / s.fc) * 180 / Math.PI;
    if (state.mode === 'hp') return Math.atan(s.fc / f) * 180 / Math.PI;
    return -Math.atan(s.Q * (f / s.fc - s.fc / f)) * 180 / Math.PI;
  }

  /* ---------- จัดรูปหน่วย ---------- */
  const fmtF = f => (f >= 1e6 ? (f / 1e6).toFixed(2) + ' MHz'
    : f >= 1e3 ? (f / 1e3).toFixed(f >= 1e4 ? 1 : 2) + ' kHz' : f.toFixed(f >= 100 ? 0 : 1) + ' Hz');
  const fmtR = r => (r >= 1e3 ? (r / 1e3).toFixed(r >= 1e4 ? 0 : 1) + ' kΩ' : r.toFixed(0) + ' Ω');
  const fmtC = c => (c >= 1e-6 ? (c * 1e6).toFixed(2) + ' µF' : (c * 1e9).toFixed(c >= 1e-8 ? 0 : 1) + ' nF');
  const fmtL = l => (l >= 1e-3 ? (l * 1e3).toFixed(l >= 1e-2 ? 0 : 1) + ' mH' : (l * 1e6).toFixed(0) + ' µH');
  const dB = g => 20 * Math.log10(Math.max(g, 1e-6));

  /* ---------- ธีม ---------- */
  function theme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return dark
      ? {
        bg: '#0b1220', grid: '#1e293b', frame: '#334155', text: '#e2e8f0', dim: '#94a3b8',
        curve: '#38bdf8', mark: '#fbbf24', cut: '#f87171', ok: '#4ade80'
      }
      : {
        bg: '#f8fafc', grid: '#e2e8f0', frame: '#cbd5e1', text: '#0f172a', dim: '#64748b',
        curve: '#0284c7', mark: '#b45309', cut: '#dc2626', ok: '#16a34a'
      };
  }

  function label(txt, x, y, color, align, size, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? '600 ' : '') + (size || 12) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
  }

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

  /* ---------- พิกัดกราฟ ---------- */
  const PX0 = 60, PX1 = 540, PY0 = 40, PY1 = 230;
  const FMIN = 10, DEC = 5;              // 10 Hz → 1 MHz
  const DBTOP = 6, DBBOT = -54;
  const fx = f => PX0 + (PX1 - PX0) * (Math.log10(f / FMIN) / DEC);
  const dy = d => PY0 + (PY1 - PY0) * (DBTOP - d) / (DBTOP - DBBOT);

  function drawGrid(c) {
    ctx.fillStyle = c.bg; ctx.fillRect(PX0, PY0, PX1 - PX0, PY1 - PY0);
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    // เส้นตั้งทุก decade และเส้นย่อยแบบลอการิทึม
    for (let d = 0; d <= DEC; d++) {
      for (let k = 1; k <= 9; k++) {
        const f = FMIN * Math.pow(10, d) * k;
        if (f > FMIN * Math.pow(10, DEC)) break;
        const x = fx(f);
        ctx.globalAlpha = k === 1 ? 1 : 0.45;
        ctx.beginPath(); ctx.moveTo(x, PY0); ctx.lineTo(x, PY1); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (let d = DBTOP; d >= DBBOT; d -= 12) {
      const y = dy(d);
      ctx.beginPath(); ctx.moveTo(PX0, y); ctx.lineTo(PX1, y); ctx.stroke();
      label((d > 0 ? '+' : '') + d, PX0 - 6, y, c.dim, 'right', 10);
    }
    ctx.strokeStyle = c.frame; ctx.strokeRect(PX0, PY0, PX1 - PX0, PY1 - PY0);

    const names = ['10', '100', '1k', '10k', '100k', '1M'];
    for (let d = 0; d <= DEC; d++) label(names[d], fx(FMIN * Math.pow(10, d)), 244, c.dim, 'center', 10);
  }

  function drawCurve(c, s) {
    // เส้น −3 dB = จุดที่กำลังเหลือครึ่งเดียว
    const y3 = dy(-3);
    ctx.strokeStyle = c.cut; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(PX0, y3); ctx.lineTo(PX1, y3); ctx.stroke();
    // เส้นตั้งที่ความถี่ตัด / ความถี่เรโซแนนซ์
    const xc = fx(Math.min(Math.max(s.fc, FMIN), FMIN * Math.pow(10, DEC)));
    ctx.beginPath(); ctx.moveTo(xc, PY0); ctx.lineTo(xc, PY1); ctx.stroke();
    ctx.setLineDash([]);
    label('−3 dB', PX1 - 6, y3 - 9, c.cut, 'right', 10, true);

    ctx.save();
    ctx.beginPath(); ctx.rect(PX0, PY0, PX1 - PX0, PY1 - PY0); ctx.clip();
    ctx.strokeStyle = c.curve; ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    const N = 480;
    for (let i = 0; i <= N; i++) {
      const f = FMIN * Math.pow(10, DEC * i / N);
      const x = PX0 + (PX1 - PX0) * i / N;
      const y = dy(dB(gain(f, s)));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    // จุดมาร์กเกอร์ที่ความถี่สัญญาณที่เลือก
    const g = gain(s.fm, s);
    ctx.fillStyle = c.mark;
    ctx.beginPath(); ctx.arc(fx(s.fm), dy(dB(g)), 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.mark; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(fx(s.fm), dy(dB(g))); ctx.lineTo(fx(s.fm), PY1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /* ---------- วาด ---------- */
  function render() {
    const s = solve(), c = theme();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

    drawGrid(c);
    drawCurve(c, s);

    const head = state.mode === 'lp' ? tr('RC ผ่านความถี่ต่ำ', 'RC low-pass')
      : state.mode === 'hp' ? tr('RC ผ่านความถี่สูง', 'RC high-pass')
        : tr('RLC อนุกรม วัดคร่อม R', 'Series RLC across R');
    label(head + tr('  ·  อัตราขยาย (dB) เทียบความถี่ (Hz)', '  ·  gain in dB against frequency in Hz'),
      PX0 - 44, 18, c.text, 'left', 11, true);

    const g = gain(s.fm, s), ph = phase(s.fm, s);

    let l1;
    if (state.mode === 'rlc') {
      l1 = tr('f₀ = ' + fmtF(s.fc) + '  ·  Q = ' + s.Q.toFixed(2) + '  ·  แถบผ่าน BW = ' + fmtF(s.bw),
        'f₀ = ' + fmtF(s.fc) + '  ·  Q = ' + s.Q.toFixed(2) + '  ·  bandwidth = ' + fmtF(s.bw));
    } else {
      l1 = tr('fc = ' + fmtF(s.fc) + '  ·  ที่ fc เหลือ 0.707 เท่า (−3 dB)  ·  ชัน −20 dB ต่อ decade',
        'fc = ' + fmtF(s.fc) + '  ·  0.707 of input at fc (−3 dB)  ·  slope −20 dB per decade');
    }
    fitText(l1, W / 2, 268, c.text, W - 24, 11.5, true);

    fitText(tr('ที่ ' + fmtF(s.fm) + ' : ผ่านได้ ' + (g * 100).toFixed(1) + '% (' + dB(g).toFixed(1) + ' dB) เฟส ' + ph.toFixed(0) + '°',
      'At ' + fmtF(s.fm) + ' : ' + (g * 100).toFixed(1) + '% gets through (' + dB(g).toFixed(1) + ' dB), phase ' + ph.toFixed(0) + '°'),
      W / 2, 292, c.mark, W - 24, 11);

    let line, col = c.ok;
    if (state.mode === 'rlc') {
      if (s.Q >= 3) {
        line = tr('Q สูง — XL กับ XC หักล้างกันที่ f₀ เหลือแต่ R วงจรจึงเลือกความถี่ได้แคบมาก',
          'High Q — XL and XC cancel at f₀ leaving only R, so the circuit picks a very narrow band');
      } else {
        line = tr('Q ต่ำ แถบผ่านกว้าง — ลดค่า R ลงแล้ว Q จะสูงขึ้นและกราฟจะแหลมขึ้นทันที',
          'Low Q, wide band — lower R and Q rises, sharpening the peak immediately');
        col = c.dim;
      }
    } else if (Math.abs(dB(g) + 3) < 1.2) {
      line = tr('กำลังยืนอยู่ที่ความถี่ตัดพอดี — แรงดันเหลือ 70.7% แต่ "กำลัง" เหลือครึ่งเดียว จึงเรียก −3 dB',
        'You are standing on the cutoff — voltage is 70.7% but the power is halved, which is what −3 dB means');
      col = c.cut;
    } else if (g > 0.9) {
      line = tr('ความถี่นี้อยู่ในย่านผ่าน — ฟิลเตอร์แทบไม่แตะต้องสัญญาณเลย',
        'This frequency is in the pass band — the filter barely touches it');
    } else if (g < 0.1) {
      line = tr('ถูกลดทอนไปมากแล้ว แต่ยังไม่เป็นศูนย์ — ฟิลเตอร์ค่อย ๆ ลดทอน ไม่ได้ตัดเป็นกำแพง',
        'Strongly attenuated but never zero — a filter rolls off, it does not build a wall');
      col = c.dim;
    } else {
      line = tr('อยู่ในช่วงเปลี่ยนผ่าน — ทุก decade ที่ห่างจาก fc สัญญาณจะเหลือหนึ่งในสิบ',
        'In the transition — every decade past fc leaves a tenth of the signal');
      col = c.dim;
    }
    fitText(line, W / 2, 316, col, W - 24, 11.5, true);

    readout(s, g, ph);
  }

  /* ---------- แผงอ่านค่า ---------- */
  function readout(s, g, ph) {
    const rows = [
      [state.mode === 'rlc' ? tr('ความถี่เรโซแนนซ์ f₀', 'Resonance f₀') : tr('ความถี่ตัด fc', 'Cutoff fc'), fmtF(s.fc)],
      [tr('ผ่านได้', 'Gain'), (g * 100).toFixed(1) + '%'],
      [tr('เป็นเดซิเบล', 'In decibels'), dB(g).toFixed(1) + ' dB'],
      [state.mode === 'rlc' ? tr('ค่า Q', 'Q factor') : tr('มุมเฟส', 'Phase'),
        state.mode === 'rlc' ? s.Q.toFixed(2) : ph.toFixed(0) + '°']
    ];
    for (let i = 0; i < 4; i++) {
      const l = $('flt-l' + (i + 1)), v = $('flt-out' + (i + 1));
      if (l) l.textContent = rows[i][0];
      if (v) v.textContent = rows[i][1];
    }

    const vd = $('flt-verdict');
    if (!vd) return;
    const c = theme();
    if (state.mode === 'rlc') {
      vd.style.color = s.Q >= 3 ? c.ok : c.dim;
      vd.textContent = tr(
        'ที่ f₀ ค่า XL = XC พอดีจึงหักล้างกันหมด เหลือแต่ R — อิมพีแดนซ์ต่ำสุด กระแสสูงสุด · Q = (1/R)·√(L/C) = ' + s.Q.toFixed(2) + ' และแถบผ่าน = f₀/Q = ' + fmtF(s.bw) + ' · ลด R ลงแล้วดู Q พุ่งขึ้น นี่คือวิธีที่วิทยุเลือกสถานีเดียวจากคลื่นทั้งอากาศ',
        'At f₀, XL equals XC and they cancel, leaving only R — minimum impedance, maximum current. Q = (1/R)·√(L/C) = ' + s.Q.toFixed(2) + ' and the bandwidth is f₀/Q = ' + fmtF(s.bw) + '. Lower R and watch Q climb: this is how a radio picks one station out of the whole sky.');
    } else if (state.mode === 'lp') {
      vd.style.color = c.dim;
      vd.textContent = tr(
        'ที่ความถี่ต่ำ XC สูงมากจนเหมือนวงจรเปิด สัญญาณจึงผ่านออกไปได้เต็ม พอความถี่สูงขึ้น XC ยุบลงจนลัดสัญญาณลงกราวด์ — fc = 1/(2πRC) = ' + fmtF(s.fc) + ' คือจุดที่ XC เท่ากับ R พอดี',
        'At low frequencies XC is so high the capacitor looks open and the signal passes. As frequency rises XC collapses and shunts the signal to ground — fc = 1/(2πRC) = ' + fmtF(s.fc) + ' is exactly where XC equals R.');
    } else {
      vd.style.color = c.dim;
      vd.textContent = tr(
        'สลับที่ R กับ C แล้วผลลัพธ์กลับข้างทันที: ความถี่ต่ำถูก XC กั้นไว้ ความถี่สูงผ่านฉลุย — สูตร fc ยังเป็น 1/(2πRC) = ' + fmtF(s.fc) + ' เท่าเดิม เพราะจุดที่ XC เท่ากับ R ไม่ได้เปลี่ยนไปไหน',
        'Swap R and C and the result flips: low frequencies are blocked by XC while high ones sail through — yet fc is still 1/(2πRC) = ' + fmtF(s.fc) + ', because the point where XC equals R has not moved.');
    }
  }

  /* ---------- ตัวควบคุม ---------- */
  const SLIDERS = [
    ['flt-r', 'rPos', () => fmtR(val('r', state.rPos))],
    ['flt-c', 'cPos', () => fmtC(val('c', state.cPos))],
    ['flt-l', 'lPos', () => fmtL(val('l', state.lPos))],
    ['flt-f', 'fPos', () => fmtF(val('f', state.fPos))]
  ];
  function syncSliderLabels() {
    SLIDERS.forEach(function (sl) {
      const out = $(sl[0] + '-val');
      if (out) out.textContent = sl[2]();
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

  const MODES = [['flt-m-lp', 'lp'], ['flt-m-hp', 'hp'], ['flt-m-rlc', 'rlc']];
  MODES.forEach(function (m) {
    const el = $(m[0]); if (!el) return;
    el.addEventListener('click', function () {
      state.mode = m[1];
      MODES.forEach(function (x) {
        const e = $(x[0]); if (e) e.classList.toggle('active', x[1] === state.mode);
      });
      const lrow = $('flt-l-row');
      if (lrow) lrow.style.opacity = state.mode === 'rlc' ? '1' : '0.45';
      render();
    });
  });

  // ตัวเหนี่ยวนำมีผลเฉพาะโหมด RLC — หรี่แถวนั้นไว้ตั้งแต่แรกในโหมด RC
  const lrow0 = $('flt-l-row');
  if (lrow0) lrow0.style.opacity = state.mode === 'rlc' ? '1' : '0.45';

  document.addEventListener('langchange', function () { syncSliderLabels(); render(); });
  const mo = new MutationObserver(render);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  render();
})();
