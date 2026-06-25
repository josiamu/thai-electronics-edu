/* Interactive 555 Astable simulator
   R1/R2 sliders (kΩ) + C slider (µF) → real f / T / duty,
   draws Vcap (charge/discharge between ⅓Vcc and ⅔Vcc) + output square wave,
   and blinks an LED in step with the output trace. Vcc = 5 V. */
(function () {
  var canvas = document.getElementById('astable-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var VCC = 5;
  var CYCLES = 2.5;        // periods shown across the scope window
  var VSWEEP = 3000;       // ms for the playhead to cross the window (visual pace)

  // state: r1/r2 in kΩ, c in µF
  var state = { r1: 10, r2: 47, c: 10 };
  var startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var raf = null;

  function $(id) { return document.getElementById(id); }

  // plot geometry — scope on the left, LED on the right
  var PL = 42, PR = 430, PT = 18, PB = 252;
  var VTOP = PT, VBOT = 150;        // Vcap band
  var OTOP = 170, OBOT = PB;        // output band
  function px(u) { return PL + u * (PR - PL); }              // u = 0..1 across window
  function vy(v) { return VBOT - (v / VCC) * (VBOT - VTOP); } // volts → y
  function oy(s) { return s ? OTOP + 6 : OBOT - 6; }         // output 1/0 → y

  // timing in SI units
  function timing() {
    var R1 = state.r1 * 1e3, R2 = state.r2 * 1e3, C = state.c * 1e-6;
    var tHigh = 0.693 * (R1 + R2) * C;
    var tLow = 0.693 * R2 * C;
    var T = tHigh + tLow;
    return { R1: R1, R2: R2, C: C, tHigh: tHigh, tLow: tLow, T: T, f: 1 / T,
             duty: (tHigh / T) * 100 };
  }

  // output state & cap voltage at real time t (seconds), steady state
  function at(t, tm) {
    var c = t % tm.T;
    if (c < tm.tHigh) {                                    // charging → output HIGH
      var v = VCC - (VCC - VCC / 3) * Math.exp(-c / ((tm.R1 + tm.R2) * tm.C));
      return { out: 1, v: v };
    }
    var td = c - tm.tHigh;                                 // discharging → output LOW
    return { out: 0, v: (2 * VCC / 3) * Math.exp(-td / (tm.R2 * tm.C)) };
  }

  function trace(tm, mapY, pick, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var steps = 260, tWin = CYCLES * tm.T;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var s = at(u * tWin, tm);
      var x = px(u), y = mapY(pick(s));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw(now) {
    var tm = timing();
    var u = ((now - startT) % VSWEEP) / VSWEEP;
    var sNow = at(u * CYCLES * tm.T, tm);

    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px 'Anuphan',sans-serif";

    // ⅓ and ⅔ Vcc threshold lines (dashed)
    [VCC / 3, 2 * VCC / 3].forEach(function (lv, idx) {
      ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, vy(lv)); ctx.lineTo(PR, vy(lv)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d97706'; ctx.textAlign = 'left';
      ctx.fillText(idx ? '⅔Vcc' : '⅓Vcc', PL + 2, vy(lv) - 3);
    });

    // labels
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left';
    ctx.fillText('V(cap)', PL, VTOP - 4);
    ctx.fillText('OUT', PL, OTOP - 4);

    // baselines for output band
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, oy(0)); ctx.lineTo(PR, oy(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PL, oy(1)); ctx.lineTo(PR, oy(1)); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
    ctx.fillText('H', PL - 4, oy(1) + 3); ctx.fillText('L', PL - 4, oy(0) + 3);

    // traces
    trace(tm, vy, function (s) { return s.v; }, '#3b82f6', 2.6);   // Vcap
    trace(tm, oy, function (s) { return s.out; }, '#10b981', 2.6); // output

    // playhead
    ctx.strokeStyle = 'rgba(148,163,184,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(u), PT); ctx.lineTo(px(u), PB); ctx.stroke();

    // ---- LED indicator (right side) ----
    var lx = 478, ly = 120, lr = 18, on = sNow.out === 1;
    if (on) {
      var g = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr + 14);
      g.addColorStop(0, 'rgba(239,68,68,0.55)'); g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, lr + 14, 0, 6.2832); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 6.2832);
    ctx.fillStyle = on ? '#ef4444' : '#5b1a1a';
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#334155'; ctx.stroke();
    // legs
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(lx - 6, ly + lr); ctx.lineTo(lx - 6, ly + lr + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx + 6, ly + lr); ctx.lineTo(lx + 6, ly + lr + 22); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'; ctx.font = "11px 'Anuphan',sans-serif";
    ctx.fillText('LED', lx, ly - lr - 8);

    // readouts
    $('a-f').textContent = fmtF(tm.f);
    $('a-t').textContent = fmtT(tm.T);
    $('a-duty').textContent = tm.duty.toFixed(1) + ' %';
    $('a-led').textContent = on ? 'ON' : 'OFF';
    $('a-led').style.color = on ? '#ef4444' : 'var(--text-light)';

    raf = requestAnimationFrame(draw);
  }

  function fmtT(s) {
    if (s < 1) return (s * 1000).toFixed(0) + ' ms';
    return s.toFixed(2) + ' s';
  }
  function fmtF(f) {
    if (f >= 1000) return (f / 1000).toFixed(2) + ' kHz';
    if (f >= 1) return f.toFixed(2) + ' Hz';
    return (f * 1000).toFixed(0) + ' mHz';
  }

  $('a-r1').addEventListener('input', function () {
    state.r1 = +this.value; $('a-r1-val').textContent = state.r1 + ' kΩ';
  });
  $('a-r2').addEventListener('input', function () {
    state.r2 = +this.value; $('a-r2-val').textContent = state.r2 + ' kΩ';
  });
  $('a-c').addEventListener('input', function () {
    state.c = +this.value; $('a-c-val').textContent = state.c + ' µF';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
})();
