/* Interactive Op-Amp amplifier simulator
   Mode inverting / non-inverting, Rin/Rf sliders (kΩ) + Vin amplitude (V peak).
   Computes closed-loop gain, draws the input sine and the amplified output,
   clipped at the ±Vsat supply rails. */
(function () {
  var canvas = document.getElementById('opamp-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var VSAT = 12;        // supply rails ±12 V
  var VMAX = 14;        // vertical span (a bit beyond rails to show clipping)
  var CYCLES = 2;       // sine cycles across window
  var PERIOD = 2600;    // ms for the wave to scroll one cycle

  var state = { mode: 'inverting', rin: 10, rf: 100, vin: 1 }; // R in kΩ, vin V-peak
  var startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var raf = null;

  function $(id) { return document.getElementById(id); }

  var PL = 44, PR = 504, PT = 18, PB = 256;
  var Y0 = (PT + PB) / 2;
  function px(u) { return PL + u * (PR - PL); }
  function vy(v) { return Y0 - (v / VMAX) * (PB - PT) / 2; }

  function gain() {
    return state.mode === 'inverting' ? -(state.rf / state.rin)
                                      : 1 + state.rf / state.rin;
  }
  function clamp(v) { return v > VSAT ? VSAT : (v < -VSAT ? -VSAT : v); }

  function wave(mapV, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var steps = 300;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var x = px(u), y = vy(mapV(u));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw(now) {
    var ph = ((now - startT) % PERIOD) / PERIOD * 2 * Math.PI;
    var g = gain();
    function vin(u) { return state.vin * Math.sin(u * CYCLES * 2 * Math.PI + ph); }
    function vout(u) { return clamp(g * vin(u)); }

    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px 'Anuphan',sans-serif";

    // zero line
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, Y0); ctx.lineTo(PR, Y0); ctx.stroke();

    // supply rails
    [VSAT, -VSAT].forEach(function (r) {
      ctx.strokeStyle = '#ef4444'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, vy(r)); ctx.lineTo(PR, vy(r)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left';
      ctx.fillText((r > 0 ? '+' : '−') + 'Vsat (' + (r > 0 ? '+' : '−') + VSAT + 'V)', PL + 2, vy(r) + (r > 0 ? 12 : -4));
    });

    // input (faint) + output (bold)
    wave(function (u) { return vin(u); }, 'rgba(59,130,246,0.9)', 2);   // input
    wave(function (u) { return vout(u); }, '#10b981', 2.8);             // output

    // legend
    ctx.textAlign = 'right';
    ctx.fillStyle = '#3b82f6'; ctx.fillText('Vin', PR - 4, PT + 10);
    ctx.fillStyle = '#10b981'; ctx.fillText('Vout', PR - 4, PT + 24);

    // readouts
    var voutPeak = clamp(g * state.vin);
    var clipping = Math.abs(g * state.vin) > VSAT + 1e-9;
    $('op-gain').textContent = (g >= 0 ? '+' : '') + g.toFixed(1) + ' V/V';
    $('op-vinr').textContent = '±' + state.vin.toFixed(2) + ' V';
    $('op-vout').textContent = '±' + Math.abs(voutPeak).toFixed(2) + ' V';
    $('op-clip').textContent = clipping ? 'CLIP!' : 'OK';
    $('op-clip').style.color = clipping ? '#ef4444' : 'var(--secondary)';

    raf = requestAnimationFrame(draw);
  }

  function setMode(m) {
    state.mode = m;
    document.querySelectorAll('#op-mode button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === m);
    });
  }
  document.querySelectorAll('#op-mode button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });
  $('op-rin').addEventListener('input', function () {
    state.rin = +this.value; $('op-rin-val').textContent = state.rin + ' kΩ';
  });
  $('op-rf').addEventListener('input', function () {
    state.rf = +this.value; $('op-rf-val').textContent = state.rf + ' kΩ';
  });
  $('op-vin').addEventListener('input', function () {
    state.vin = +this.value; $('op-vin-val').textContent = '±' + state.vin.toFixed(2) + ' V';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
})();
