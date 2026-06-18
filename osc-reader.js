(function () {
  var canvas = document.getElementById('or-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 560, H = 320, COLS = 10, ROWS = 8;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // 1-2-5 scale sequences (index 0..7 — matches the range sliders)
  var VDIV = [0.5, 1, 2, 5, 10, 20, 50, 100];        // volts/div
  var TDIV = [0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01]; // s/div

  // hidden "true" signal the student must read
  var sig = { amp: 15, freq: 100, wave: 'sine' };
  var vi = 3, ti = 5;   // current scale indices

  function $(id) { return document.getElementById(id); }

  function waveV(t) {
    var ph = (t * sig.freq) % 1;
    switch (sig.wave) {
      case 'square':   return sig.amp * (ph < 0.5 ? 1 : -1);
      case 'triangle': return sig.amp * (ph < 0.5 ? (-1 + 4 * ph) : (3 - 4 * ph));
      default:         return sig.amp * Math.sin(2 * Math.PI * ph);
    }
  }
  function vrms() {
    switch (sig.wave) {
      case 'square':   return sig.amp;
      case 'triangle': return sig.amp / Math.sqrt(3);
      default:         return sig.amp / Math.SQRT2;
    }
  }

  function fmtT(s) {
    if (s >= 1) return s.toFixed(2) + ' s';
    if (s >= 1e-3) return (s * 1e3).toFixed(2) + ' ms';
    if (s >= 1e-6) return (s * 1e6).toFixed(0) + ' µs';
    return (s * 1e9).toFixed(0) + ' ns';
  }
  function fmtTdiv(s) { return s >= 1e-3 ? (s * 1e3) + ' ms' : (s * 1e6) + ' µs'; }
  function fmtF(f) { return f >= 1000 ? (f / 1000).toFixed(2) + ' kHz' : f.toFixed(0) + ' Hz'; }

  function draw() {
    var cw = W / COLS, ch = H / ROWS;
    var vdiv = VDIV[vi], tdiv = TDIV[ti], windowT = COLS * tdiv;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#06160c';
    ctx.fillRect(0, 0, W, H);

    // graticule
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(46,125,80,0.55)';
    ctx.beginPath();
    for (var i = 1; i < COLS; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); }
    for (var j = 1; j < ROWS; j++) { ctx.moveTo(0, j * ch); ctx.lineTo(W, j * ch); }
    ctx.stroke();
    // center axes
    ctx.strokeStyle = 'rgba(105,240,174,0.6)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(105,240,174,0.4)';
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

    // trace
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#00e676';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (var x = 0; x <= W; x++) {
      var t = (x / W) * windowT;
      var y = H / 2 - (waveV(t) / vdiv) * ch;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function updateReadouts() {
    var vdiv = VDIV[vi], tdiv = TDIV[ti];
    var peakDiv = sig.amp / vdiv;
    var T = 1 / sig.freq;
    var perDiv = T / tdiv;
    $('or-vp').textContent = sig.amp.toFixed(1) + ' V';
    $('or-vp-calc').textContent = peakDiv.toFixed(2) + ' div × ' + vdiv + ' V = ' + sig.amp.toFixed(1) + ' V';
    $('or-vpp').textContent = (sig.amp * 2).toFixed(1) + ' V';
    $('or-vrms').textContent = vrms().toFixed(2) + ' V';
    $('or-T').textContent = fmtT(T);
    $('or-T-calc').textContent = perDiv.toFixed(2) + ' div × ' + fmtTdiv(tdiv) + ' = ' + fmtT(T);
    $('or-f').textContent = fmtF(sig.freq);
    $('or-vdiv-val').textContent = vdiv + ' V';
    $('or-tdiv-val').textContent = fmtTdiv(tdiv);
    $('or-vdiv').value = vi;
    $('or-tdiv').value = ti;
  }

  function refresh() { draw(); updateReadouts(); }

  function autoset() {
    // pick vdiv so peak fits ~3 divisions
    vi = VDIV.length - 1;
    for (var a = 0; a < VDIV.length; a++) { if (sig.amp / VDIV[a] <= 3.2) { vi = a; break; } }
    // pick tdiv closest to showing ~2 cycles (window = 2T → tdiv = T/5)
    var target = (1 / sig.freq) / 5, best = 0, bd = Infinity;
    for (var b = 0; b < TDIV.length; b++) {
      var d = Math.abs(TDIV[b] - target);
      if (d < bd) { bd = d; best = b; }
    }
    ti = best;
  }

  function randomize() {
    var amps = [3, 4.5, 6, 8, 12, 15, 18, 24];
    var freqs = [50, 100, 200, 500, 1000, 2000];
    sig.amp = amps[Math.floor(Math.random() * amps.length)];
    sig.freq = freqs[Math.floor(Math.random() * freqs.length)];
    autoset();
    refresh();
  }

  // controls
  var waveBtns = document.querySelectorAll('.or-wave-btn');
  Array.prototype.forEach.call(waveBtns, function (b) {
    b.addEventListener('click', function () {
      sig.wave = b.dataset.wave;
      Array.prototype.forEach.call(waveBtns, function (x) { x.classList.toggle('active', x === b); });
      refresh();
    });
  });
  $('or-vdiv').addEventListener('input', function () { vi = +this.value; refresh(); });
  $('or-tdiv').addEventListener('input', function () { ti = +this.value; refresh(); });
  $('or-auto').addEventListener('click', function () { autoset(); refresh(); });
  $('or-rand').addEventListener('click', randomize);

  refresh();
})();
