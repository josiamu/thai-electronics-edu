(function () {
  var canvas = document.getElementById('ps-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // fixed parameters
  var VRMS = 9;                       // transformer secondary (V rms)
  var VPK = VRMS * Math.SQRT2;        // ≈ 12.73 V peak
  var F0 = 50;                        // mains frequency (Hz)
  var VREG = 5, DROPOUT = 2;          // 7805 output + dropout
  var N = 600, TWIN = 0.06;           // 60 ms window = 3 mains cycles
  var DT = TWIN / N;

  var state = { mode: 'full', cap: 1000, load: 200, reg: false };
  var sim = null, off = 0, raf = null;

  function $(id) { return document.getElementById(id); }

  function simulate() {
    var full = state.mode === 'full';
    var vdrop = full ? 1.4 : 0.7;
    var VpkOut = Math.max(0, VPK - vdrop);
    var w = 2 * Math.PI * F0;
    var I = state.load / 1000;        // A
    var C = state.cap * 1e-6;         // F

    var vin = new Array(N), vcap = new Array(N), vreg = new Array(N);
    for (var i = 0; i < N; i++) {
      var s = Math.sin(w * i * DT);
      vin[i] = VpkOut * (full ? Math.abs(s) : Math.max(0, s));
    }
    // settle the capacitor over a few passes (constant-current load → linear discharge)
    var vc = VpkOut;
    for (var pass = 0; pass < 4; pass++) {
      for (var k = 0; k < N; k++) {
        if (C <= 0) vc = vin[k];
        else if (vin[k] >= vc) vc = vin[k];
        else vc = Math.max(0, vc - I * DT / C);
        if (pass === 3) vcap[k] = vc;
      }
    }
    // regulator stage
    for (var j = 0; j < N; j++) {
      vreg[j] = vcap[j] >= VREG + DROPOUT ? VREG : Math.max(0, vcap[j] - DROPOUT);
    }
    // stats on the active output
    var out = state.reg ? vreg : vcap;
    var vmax = -1e9, vmin = 1e9, sum = 0;
    for (var m = 0; m < N; m++) {
      if (out[m] > vmax) vmax = out[m];
      if (out[m] < vmin) vmin = out[m];
      sum += out[m];
    }
    return {
      vin: vin, vcap: vcap, vreg: vreg, VpkOut: VpkOut,
      vmax: vmax, vmin: vmin, vavg: sum / N, vpp: vmax - vmin,
      full: full, regOn: state.reg,
      regulating: state.reg && vmin >= VREG - 0.05,
      hasCap: C > 0
    };
  }

  // plot geometry
  var PL = 46, PR = W - 14, PT = 22, PB = H - 30;
  var VSCALE = VPK + 1.5;             // y full-scale ≈ 14 V

  function vy(v) { return PB - (v / VSCALE) * (PB - PT); }
  function px(i) { return PL + (i / (N - 1)) * (PR - PL); }

  function trace(arr, color, width, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var idx = (i + off) % N;
      var x = px(i), y = vy(arr[idx]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var en = document.documentElement.lang === 'en';

    // grid
    ctx.strokeStyle = 'rgba(148,163,184,0.18)';
    ctx.lineWidth = 1;
    for (var gv = 0; gv <= VSCALE; gv += 2) {
      var y = vy(gv);
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PR, y); ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = "10px 'Anuphan',sans-serif"; ctx.textAlign = 'right';
      ctx.fillText(gv + 'V', PL - 5, y + 3);
    }
    for (var gx = 0; gx <= 6; gx++) {
      var x = PL + (gx / 6) * (PR - PL);
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PL, PT); ctx.lineTo(PL, PB); ctx.lineTo(PR, PB); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.font = "10px 'Anuphan',sans-serif"; ctx.textAlign = 'left';
    ctx.fillText(en ? 'time →' : 'เวลา →', PR - 50, PB + 16);

    // traces (back to front)
    trace(sim.vin, '#64748b', 1.6, true);
    trace(sim.vcap, '#3b82f6', 2.4, false);
    if (sim.regOn) trace(sim.vreg, '#10b981', 2.6, false);

    // ripple band marker on the active filtered output
    if (sim.hasCap && !sim.regOn && sim.vpp > 0.15) {
      var ytop = vy(sim.vmax), ybot = vy(sim.vmin);
      ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PR - 70, ytop); ctx.lineTo(PR - 14, ytop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PR - 70, ybot); ctx.lineTo(PR - 14, ybot); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(PR - 42, ytop); ctx.lineTo(PR - 42, ybot); ctx.stroke();
      ctx.fillStyle = '#f59e0b'; ctx.font = "700 10px 'Anuphan',sans-serif"; ctx.textAlign = 'right';
      ctx.fillText('ripple', PR - 48, (ytop + ybot) / 2 + 3);
    }
  }

  var fmtV = function (v) { return v.toFixed(2) + ' V'; };

  function refresh() {
    sim = simulate();
    var en = document.documentElement.lang === 'en';

    $('ps-vpk').textContent = fmtV(sim.VpkOut);
    $('ps-vdc').textContent = fmtV(sim.vavg);
    $('ps-vrip').textContent = sim.vpp.toFixed(2) + ' Vpp';
    $('ps-vout').textContent = fmtV(sim.vavg);

    var badge = $('ps-badge'), txt, col;
    if (sim.regOn) {
      if (sim.regulating) {
        txt = en ? 'REGULATED · steady 5 V' : 'เรกูเลตคงที่ 5 V'; col = '#10b981';
      } else {
        txt = en ? 'DROPOUT · input too low' : 'หลุด (Dropout) · ไฟเข้าต่ำไป'; col = '#ef4444';
      }
    } else if (!sim.hasCap) {
      txt = en ? 'PULSATING DC · no filter' : 'DC พัลส์ · ยังไม่กรอง'; col = '#64748b';
    } else if (sim.vpp < 0.5) {
      txt = en ? 'SMOOTH DC' : 'DC เรียบ'; col = '#3b82f6';
    } else {
      txt = en ? 'FILTERED · some ripple' : 'กรองแล้ว · มีระลอกบ้าง'; col = '#3b82f6';
    }
    badge.textContent = txt;
    badge.style.background = col;
  }

  function loop() {
    off = (off + 2) % N;
    draw();
    raf = requestAnimationFrame(loop);
  }

  // controls
  Array.prototype.forEach.call(document.querySelectorAll('#ps-mode button'), function (b) {
    b.addEventListener('click', function () {
      state.mode = b.getAttribute('data-mode');
      document.querySelectorAll('#ps-mode button').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      refresh();
    });
  });
  $('ps-cap').addEventListener('input', function () {
    state.cap = +this.value;
    $('ps-cap-val').textContent = state.cap === 0
      ? (document.documentElement.lang === 'en' ? 'none' : 'ไม่มี')
      : state.cap + ' µF';
    refresh();
  });
  $('ps-load').addEventListener('input', function () {
    state.load = +this.value;
    $('ps-load-val').textContent = state.load + ' mA';
    refresh();
  });
  $('ps-reg').addEventListener('change', function () {
    state.reg = this.checked;
    refresh();
  });
  document.addEventListener('langchange', function () {
    $('ps-cap-val').textContent = state.cap === 0
      ? (document.documentElement.lang === 'en' ? 'none' : 'ไม่มี')
      : state.cap + ' µF';
    refresh();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(loop);
  });

  refresh();
  raf = requestAnimationFrame(loop);
})();
