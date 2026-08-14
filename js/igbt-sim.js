/* Interactive MOSFET-vs-IGBT loss comparison for igbt.html
   Sliders: load current / switching frequency / bus voltage, plus a hard-switching
   vs soft-switching (ZVS) mode. Draws total device loss against load current for a
   600 V MOSFET and a 600 V IGBT, marks the break-even current, and puts a cursor at
   the selected operating point.

   Conduction (duty 50%, i.e. the device carries current half the time):
     MOSFET : P = D · I² · R_DS(on)
     IGBT   : P = D · I · (V_CE0 + I · r)
   Switching (energy per cycle scales with the current switched and the bus voltage):
     P_sw = f · k · I · V_bus          k in J/(A·V), IGBT ≈ 4× the MOSFET (current tail)
   Soft switching (ZVS) turns the device on/off near zero volts, so the switching
   term nearly disappears — which is exactly why resonant induction stoves can run
   IGBTs at 25 kHz and still win. */
(function () {
  var canvas = document.getElementById('igbt-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // 600 V class device parameters (datasheet-typical, 25 °C — both get worse when hot)
  var RDS   = 0.19;      // Ω     MOSFET on-resistance
  var VCE0  = 0.9;       // V     IGBT fixed offset
  var RCE   = 0.035;     // Ω     IGBT slope resistance
  var K_MOS = 0.012e-6;  // J/(A·V) switching energy coefficient
  var K_IGB = 0.050e-6;  // J/(A·V) — the current tail costs about 4×
  var SOFT  = 0.12;      // ZVS keeps ~12% of the hard-switching energy
  var DUTY  = 0.5;
  var IMAX  = 40;        // A — x-axis full scale

  var state = { i: 12, f: 25, v: 310, soft: false };

  function $(id) { return document.getElementById(id); }
  function isEN() { return document.documentElement.lang === 'en'; }

  var PL = 52, PR = 500, PT = 22, PB = 246;
  function px(i) { return PL + (i / IMAX) * (PR - PL); }

  function swFactor() { return state.soft ? SOFT : 1; }

  function lossMos(i) {
    return {
      cond: DUTY * i * i * RDS,
      sw: state.f * 1000 * K_MOS * swFactor() * i * state.v,
      drop: i * RDS
    };
  }
  function lossIgbt(i) {
    return {
      cond: DUTY * i * (VCE0 + i * RCE),
      sw: state.f * 1000 * K_IGB * swFactor() * i * state.v,
      drop: VCE0 + i * RCE
    };
  }
  function total(l) { return l.cond + l.sw; }

  // current where the two total-loss curves meet (scanned, since the switching
  // terms move the crossing away from the neat conduction-only formula)
  function breakEven() {
    var prev = total(lossMos(0.2)) - total(lossIgbt(0.2));
    for (var i = 0.4; i <= IMAX; i += 0.1) {
      var d = total(lossMos(i)) - total(lossIgbt(i));
      if (prev < 0 && d >= 0) return i;
      prev = d;
    }
    return null;
  }

  function peak() {
    var m = 0, i;
    for (i = 0; i <= IMAX; i += 0.5) {
      m = Math.max(m, total(lossMos(i)), total(lossIgbt(i)));
    }
    return Math.max(m, 1);
  }

  function py(p, pmax) { return PB - (p / pmax) * (PB - PT); }

  function drawAxes(pmax) {
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = "10px 'Anuphan',sans-serif";

    var steps = 4, k;
    ctx.textAlign = 'right';
    for (k = 0; k <= steps; k++) {
      var p = (pmax / steps) * k, y = py(p, pmax);
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PR, y); ctx.stroke();
      ctx.fillText(p.toFixed(p < 10 ? 1 : 0) + ' W', PL - 6, y + 3);
    }
    ctx.textAlign = 'center';
    for (k = 0; k <= 4; k++) {
      var i = (IMAX / 4) * k;
      ctx.fillText(i + ' A', px(i), PB + 15);
    }
    ctx.fillText(isEN() ? 'load current' : 'กระแสโหลด', (PL + PR) / 2, PB + 30);
  }

  function drawCurve(fn, color, pmax) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (var i = 0; i <= IMAX; i += 0.25) {
      var y = py(total(fn(i)), pmax);
      if (i === 0) ctx.moveTo(px(i), y); else ctx.lineTo(px(i), y);
    }
    ctx.stroke();
  }

  function drawBreakEven(pmax) {
    var be = breakEven();
    if (be === null) return;
    var x = px(be), y = py(total(lossMos(be)), pmax);
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.font = "10px 'Anuphan',sans-serif";
    ctx.textAlign = x > PR - 90 ? 'right' : 'left';
    ctx.fillText((isEN() ? 'break-even ' : 'จุดตัด ') + be.toFixed(1) + ' A',
                 x + (x > PR - 90 ? -6 : 6), PT + 12);
  }

  function drawCursor(pmax) {
    var i = state.i, x = px(i);
    var pm = total(lossMos(i)), pg = total(lossIgbt(i));
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath(); ctx.arc(x, py(pm, pmax), 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath(); ctx.arc(x, py(pg, pmax), 4.5, 0, Math.PI * 2); ctx.fill();
  }

  function drawLegend() {
    ctx.font = "11px 'Anuphan',sans-serif";
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(PL + 4, PT + 2, 14, 3);
    ctx.fillText('MOSFET 600V', PL + 24, PT + 8);
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(PL + 140, PT + 2, 14, 3);
    ctx.fillText('IGBT 600V', PL + 160, PT + 8);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText((isEN() ? 'total loss · 50% duty · ' : 'กำลังสูญเสียรวม · ดิวตี้ 50% · ') +
                 state.f + ' kHz · ' + state.v + ' V' +
                 (state.soft ? (isEN() ? ' · ZVS' : ' · ซอฟต์') : ''), PR, PT + 8);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var pmax = peak();
    drawAxes(pmax);
    drawCurve(lossMos, '#38bdf8', pmax);
    drawCurve(lossIgbt, '#fb923c', pmax);
    drawBreakEven(pmax);
    drawCursor(pmax);
    drawLegend();
  }

  function fmtW(p) { return p >= 100 ? p.toFixed(0) + ' W' : p.toFixed(1) + ' W'; }

  function updateReadouts() {
    var m = lossMos(state.i), g = lossIgbt(state.i);
    var pm = total(m), pg = total(g);
    $('igbt-out-mos').textContent = fmtW(pm);
    $('igbt-out-igbt').textContent = fmtW(pg);
    $('igbt-out-vmos').textContent = m.drop.toFixed(2) + ' V';
    $('igbt-out-vigbt').textContent = g.drop.toFixed(2) + ' V';

    var v = $('igbt-verdict');
    var diff = Math.abs(pm - pg);
    if (diff < 0.3) {
      v.textContent = isEN() ? 'Tie — either device works here' : 'สูสี — ใช้ตัวไหนก็ได้';
      v.style.color = 'var(--text)';
    } else if (pm < pg) {
      v.textContent = (isEN() ? 'MOSFET wins by ' : 'MOSFET ประหยัดกว่า ') + fmtW(diff);
      v.style.color = '#0284c7';
    } else {
      v.textContent = (isEN() ? 'IGBT wins by ' : 'IGBT ประหยัดกว่า ') + fmtW(diff);
      v.style.color = '#c2410c';
    }
  }

  function render() { draw(); updateReadouts(); }

  function setMode(soft) {
    state.soft = soft;
    $('igbt-mode-hard').classList.toggle('active', !soft);
    $('igbt-mode-soft').classList.toggle('active', soft);
    render();
  }

  $('igbt-mode-hard').addEventListener('click', function () { setMode(false); });
  $('igbt-mode-soft').addEventListener('click', function () { setMode(true); });
  $('igbt-i').addEventListener('input', function () {
    state.i = +this.value; $('igbt-i-val').textContent = state.i + ' A'; render();
  });
  $('igbt-f').addEventListener('input', function () {
    state.f = +this.value; $('igbt-f-val').textContent = state.f + ' kHz'; render();
  });
  $('igbt-v').addEventListener('input', function () {
    state.v = +this.value; $('igbt-v-val').textContent = state.v + ' V'; render();
  });

  // canvas labels are drawn text, so they must be repainted when the language flips
  document.addEventListener('langchange', render);   // nav.js fires this on document (it does not bubble)

  render();
})();
