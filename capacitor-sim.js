(function () {
  var canvas = document.getElementById('rc-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var VMAX = 5;                 // supply voltage (V)
  var SWEEP = 3600, HOLD = 700; // ms: time to sweep 0→5τ, then pause before looping

  var state = { mode: 'charge', r: 10, c: 100 }; // r in kΩ, c in µF
  var startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var raf = null;

  function $(id) { return document.getElementById(id); }

  // plot geometry
  var PL = 48, PR = W - 16, PT = 20, PB = H - 34;
  function px(t01) { return PL + t01 * (PR - PL); }            // t01 = time / (5τ)
  function py(v) { return PB - (v / VMAX) * (PB - PT); }

  function vAt(t01) {                 // t/τ = 5 * t01
    var x = 5 * t01;
    return state.mode === 'charge' ? VMAX * (1 - Math.exp(-x)) : VMAX * Math.exp(-x);
  }

  function curve(toP, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    var steps = 120;
    for (var i = 0; i <= steps; i++) {
      var t01 = (i / steps) * toP;
      var x = px(t01), y = py(vAt(t01));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function draw(now) {
    var charging = state.mode === 'charge';
    var tau = state.r * 1000 * state.c * 1e-6;     // seconds
    var cyc = SWEEP + HOLD;
    var tcyc = (now - startT) % cyc;
    var p = Math.min(1, tcyc / SWEEP);             // animation progress 0..1
    var vNow = vAt(p);

    ctx.clearRect(0, 0, W, H);
    var accent = charging ? '#3b82f6' : '#ef4444';

    // grid + y labels (volts)
    ctx.font = "10px 'Anuphan',sans-serif";
    for (var gv = 0; gv <= VMAX; gv++) {
      var y = py(gv);
      ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PR, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
      ctx.fillText(gv + 'V', PL - 5, y + 3);
    }
    // x labels (multiples of τ)
    ctx.textAlign = 'center';
    for (var k = 0; k <= 5; k++) {
      var x = px(k / 5);
      ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(k === 0 ? '0' : k + 'τ', x, PB + 15);
    }

    // axes
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PL, PT); ctx.lineTo(PL, PB); ctx.lineTo(PR, PB); ctx.stroke();

    // 63.2% / 36.8% reference at 1τ
    var vRef = charging ? VMAX * 0.632 : VMAX * 0.368;
    ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, py(vRef)); ctx.lineTo(px(0.2), py(vRef)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px(0.2), PB); ctx.lineTo(px(0.2), py(vRef)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#d97706'; ctx.textAlign = 'left'; ctx.font = "700 10px 'Anuphan',sans-serif";
    ctx.fillText((charging ? '63.2%' : '36.8%') + ' @ 1τ', px(0.2) + 4, py(vRef) - 4);

    // full theoretical curve (faint) + animated bold portion
    curve(1, 'rgba(148,163,184,0.45)', 1.5);
    curve(p, accent, 2.8);

    // moving dot
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(px(p), py(vNow), 5, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

    // live readouts
    $('rc-tau').textContent = fmtT(tau);
    $('rc-full').textContent = fmtT(5 * tau);
    $('rc-vc').textContent = vNow.toFixed(2) + ' V';
    $('rc-pct').textContent = (vNow / VMAX * 100).toFixed(1) + ' %';

    raf = requestAnimationFrame(draw);
  }

  function fmtT(s) {
    if (s < 1) return (s * 1000).toFixed(0) + ' ms';
    if (s < 100) return s.toFixed(2) + ' s';
    return s.toFixed(0) + ' s';
  }

  function setMode(m) {
    state.mode = m;
    document.querySelectorAll('#rc-mode button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === m);
    });
    startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  document.querySelectorAll('#rc-mode button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });
  $('rc-r').addEventListener('input', function () {
    state.r = +this.value;
    $('rc-r-val').textContent = state.r + ' kΩ';
  });
  $('rc-c').addEventListener('input', function () {
    state.c = +this.value;
    $('rc-c-val').textContent = state.c + ' µF';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
})();
