(function () {
  var canvas = document.getElementById('sg-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  // ── display geometry ──
  var W = 560, H = 300;                 // logical (CSS) pixels
  var COLS = 10, ROWS = 8;              // graticule divisions
  var VDIV = 2.5;                       // volts per vertical division
  var TDIV = 0.0002;                    // 0.2 ms per horizontal division (fixed timebase)
  var WINDOW = COLS * TDIV;             // total time shown = 2 ms

  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var state = { wave: 'sine', freq: 2000, vpp: 10, duty: 50, offset: 0 };

  function $(id) { return document.getElementById(id); }

  // ── waveform value (volts) at time t (seconds), includes DC offset ──
  function waveV(t) {
    var Vp = state.vpp / 2;
    var T = 1 / state.freq;
    var ph = (t % T) / T;                // phase 0..1 within a cycle
    var v;
    switch (state.wave) {
      case 'square':
        v = ph < state.duty / 100 ? 1 : -1; break;
      case 'triangle':
        v = ph < 0.5 ? (-1 + 4 * ph) : (3 - 4 * ph); break;
      case 'sawtooth':
        v = -1 + 2 * ph; break;
      default:                            // sine
        v = Math.sin(2 * Math.PI * ph);
    }
    return v * Vp + state.offset;
  }

  // ── Vrms value + formula label per waveform (AC component) ──
  function vrmsInfo() {
    var Vp = state.vpp / 2;
    switch (state.wave) {
      case 'square':   return { val: Vp, f: 'V<sub>p</sub>' };
      case 'triangle': return { val: Vp / Math.sqrt(3), f: 'V<sub>p</sub>/√3' };
      case 'sawtooth': return { val: Vp / Math.sqrt(3), f: 'V<sub>p</sub>/√3' };
      default:         return { val: Vp / Math.SQRT2, f: 'V<sub>p</sub>/√2' };
    }
  }

  // ── draw the screen ──
  function draw() {
    var cw = W / COLS, ch = H / ROWS;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08131a';
    ctx.fillRect(0, 0, W, H);

    // fine graticule
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,255,160,0.10)';
    ctx.beginPath();
    for (var i = 1; i < COLS; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); }
    for (var j = 1; j < ROWS; j++) { ctx.moveTo(0, j * ch); ctx.lineTo(W, j * ch); }
    ctx.stroke();

    // center axes
    ctx.strokeStyle = 'rgba(0,255,160,0.28)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();

    // border
    ctx.strokeStyle = 'rgba(0,255,160,0.22)';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // trace (clipped to screen)
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.strokeStyle = '#00ff9c';
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (var x = 0; x <= W; x++) {
      var t = (x / W) * WINDOW;
      var y = H / 2 - (waveV(t) / VDIV) * ch;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── formatting ──
  function fmtT(s) {
    if (s >= 1) return s.toFixed(2) + ' s';
    if (s >= 1e-3) return (s * 1e3).toFixed(2) + ' ms';
    if (s >= 1e-6) return (s * 1e6).toFixed(1) + ' µs';
    return (s * 1e9).toFixed(0) + ' ns';
  }
  function fmtF(f) { return f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : f.toFixed(0) + ' Hz'; }
  function sign(v) { return v > 0 ? '+' + v : '' + v; }

  function updateReadouts() {
    var T = 1 / state.freq, Vp = state.vpp / 2, vr = vrmsInfo();
    $('sg-r-T').textContent = fmtT(T);
    $('sg-r-f').textContent = fmtF(state.freq);
    $('sg-r-vpp').textContent = state.vpp.toFixed(1) + ' V';
    $('sg-r-vp').textContent = Vp.toFixed(1) + ' V';
    $('sg-r-vrms').textContent = vr.val.toFixed(2) + ' V';
    $('sg-r-vrms-f').innerHTML = vr.f;
    $('sg-r-offset').textContent = sign(state.offset) + ' V';
    $('sg-r-duty').textContent = state.wave === 'square' ? state.duty + ' %' : '—';
  }

  function refresh() { draw(); updateReadouts(); }

  // ── controls ──
  var waveBtns = document.querySelectorAll('.sg-wave-btn');
  Array.prototype.forEach.call(waveBtns, function (b) {
    b.addEventListener('click', function () {
      state.wave = b.dataset.wave;
      Array.prototype.forEach.call(waveBtns, function (x) { x.classList.toggle('active', x === b); });
      $('sg-duty-ctrl').classList.toggle('disabled', state.wave !== 'square');
      refresh();
    });
  });
  $('sg-freq').addEventListener('input', function () {
    state.freq = +this.value; $('sg-freq-val').textContent = fmtF(state.freq); refresh();
  });
  $('sg-amp').addEventListener('input', function () {
    state.vpp = +this.value; $('sg-amp-val').textContent = this.value + ' V'; refresh();
  });
  $('sg-duty').addEventListener('input', function () {
    state.duty = +this.value; $('sg-duty-val').textContent = this.value + ' %'; refresh();
  });
  $('sg-offset').addEventListener('input', function () {
    state.offset = +this.value; $('sg-offset-val').textContent = sign(state.offset) + ' V'; refresh();
  });

  refresh();
})();
