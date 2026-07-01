(function () {
  var canvas = document.getElementById('tr-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  // fixed circuit values
  var VCC = 9, RC = 470, VCESAT = 0.2;
  var ICSAT = (VCC - VCESAT) / RC;   // ≈ 0.0187 A

  var state = { ib: 100, beta: 100 }; // ib in µA
  var phase = 0, raf = null;

  function $(id) { return document.getElementById(id); }

  function compute() {
    var ibA = state.ib * 1e-6;
    var icActive = state.beta * ibA;
    var region, ic;
    if (state.ib <= 0) { region = 'cutoff'; ic = 0; }
    else if (icActive < ICSAT) { region = 'active'; ic = icActive; }
    else { region = 'sat'; ic = ICSAT; }
    var vce = region === 'cutoff' ? VCC : (region === 'sat' ? VCESAT : VCC - ic * RC);
    return { region: region, ic: ic, icActive: icActive, vce: vce, bright: Math.min(1, ic / ICSAT) };
  }

  // geometry
  var CX = 340, TOPY = 42, GNDY = 262;
  var LAMP = { x: CX, y: 110, r: 14 };

  function wire(x1, y1, x2, y2, on) {
    ctx.strokeStyle = on ? '#10b981' : '#94a3b8';
    ctx.lineWidth = on ? 3 : 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function zigzag(x, y1, y2, on) {
    ctx.strokeStyle = on ? '#10b981' : '#94a3b8';
    ctx.lineWidth = on ? 3 : 2.4;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    var n = 6, step = (y2 - y1) / n;
    ctx.beginPath(); ctx.moveTo(x, y1);
    for (var i = 0; i < n; i++) {
      var yy = y1 + step * (i + 0.5);
      ctx.lineTo(x + (i % 2 === 0 ? 9 : -9), yy);
    }
    ctx.lineTo(x, y2); ctx.stroke();
  }

  function draw(c) {
    ctx.clearRect(0, 0, W, H);
    var onMain = c.ic > 0, onBase = state.ib > 0;

    // ── Vcc rail ──
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX - 26, TOPY); ctx.lineTo(CX + 26, TOPY); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = "700 13px 'Anuphan',sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('+VCC 9V', CX, TOPY - 12);

    // Rc (Vcc → lamp top)
    zigzag(CX, TOPY, LAMP.y - LAMP.r - 4, onMain);
    ctx.fillStyle = '#64748b'; ctx.font = "11px 'Anuphan',sans-serif"; ctx.textAlign = 'left';
    ctx.fillText('RC 470Ω', CX + 16, (TOPY + LAMP.y) / 2);

    // ── lamp (LED load) ──
    var bg = c.bright;
    if (bg > 0.02) { ctx.shadowColor = '#fde047'; ctx.shadowBlur = 6 + 26 * bg; }
    ctx.beginPath(); ctx.arc(LAMP.x, LAMP.y, LAMP.r, 0, 6.2832);
    ctx.fillStyle = 'rgba(253,224,71,' + (0.12 + 0.88 * bg) + ')';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2; ctx.strokeStyle = bg > 0.4 ? '#f59e0b' : '#94a3b8'; ctx.stroke();
    // filament cross
    ctx.strokeStyle = bg > 0.4 ? '#b45309' : '#cbd5e1'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(LAMP.x - 7, LAMP.y - 7); ctx.lineTo(LAMP.x + 7, LAMP.y + 7);
    ctx.moveTo(LAMP.x + 7, LAMP.y - 7); ctx.lineTo(LAMP.x - 7, LAMP.y + 7);
    ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.font = "11px 'Anuphan',sans-serif"; ctx.textAlign = 'left';
    ctx.fillText('LED', LAMP.x + 18, LAMP.y + 4);

    // lamp bottom → collector
    wire(CX, LAMP.y + LAMP.r + 4, CX, 150, onMain);

    // ── transistor symbol (NPN) ──
    var bx = 308, by = 180;           // base bar x, center y
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(320, by, 38, 0, 6.2832); ctx.stroke();
    // base bar
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(bx, by - 22); ctx.lineTo(bx, by + 22); ctx.stroke();
    // collector lead (bar → up to y=150)
    wire(bx, by - 12, CX, 150, onMain);
    // emitter lead (bar → down to y=210) with arrow
    wire(bx, by + 12, CX, 210, onMain);
    // emitter arrow
    ctx.fillStyle = onMain ? '#10b981' : '#94a3b8';
    ctx.beginPath(); ctx.moveTo(CX, 210); ctx.lineTo(CX - 11, 202); ctx.lineTo(CX - 4, 213); ctx.closePath(); ctx.fill();
    // base lead (left)
    wire(150, by, bx, by, onBase);
    // labels
    ctx.fillStyle = '#64748b'; ctx.font = "12px 'Anuphan',sans-serif"; ctx.textAlign = 'left';
    ctx.fillText('C', CX + 6, 150); ctx.fillText('E', CX + 6, 214); ctx.fillText('B', 150, by - 8);

    // emitter → ground
    wire(CX, 210, CX, GNDY, onMain);
    // ground symbol
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX - 14, GNDY); ctx.lineTo(CX + 14, GNDY);
    ctx.moveTo(CX - 9, GNDY + 5); ctx.lineTo(CX + 9, GNDY + 5);
    ctx.moveTo(CX - 4, GNDY + 10); ctx.lineTo(CX + 4, GNDY + 10);
    ctx.stroke();

    // ── base drive (left) : Ib arrow ──
    ctx.fillStyle = onBase ? '#10b981' : '#94a3b8';
    ctx.beginPath(); ctx.moveTo(150, by); ctx.lineTo(138, by - 6); ctx.lineTo(138, by + 6); ctx.closePath(); ctx.fill();
    wire(95, by, 138, by, onBase);
    ctx.fillStyle = '#3b82f6'; ctx.font = "700 12px 'Anuphan',sans-serif"; ctx.textAlign = 'left';
    ctx.fillText('IB', 96, by - 8);

    // ── current dots ──
    if (onMain) {
      var nd = 7, spd = 0.12 + 0.5 * c.bright;
      ctx.fillStyle = '#34d399';
      for (var i = 0; i < nd; i++) {
        var t = (phase * spd + i / nd) % 1;
        var y = TOPY + t * (GNDY - TOPY);
        ctx.beginPath(); ctx.arc(CX, y, 3, 0, 6.2832); ctx.fill();
      }
    }
    if (onBase) {
      ctx.fillStyle = '#60a5fa';
      for (var j = 0; j < 3; j++) {
        var tb = (phase * 0.25 + j / 3) % 1;
        var x = 95 + tb * (bx - 95);
        ctx.beginPath(); ctx.arc(x, by, 2.6, 0, 6.2832); ctx.fill();
      }
    }
  }

  function fmtI(a) { return a >= 1e-3 ? (a * 1e3).toFixed(2) + ' mA' : (a * 1e6).toFixed(0) + ' µA'; }

  var REGIONS = {
    cutoff: { th: 'CUT-OFF (ปิด)', en: 'CUT-OFF (OFF)', color: '#64748b' },
    active: { th: 'ACTIVE (ขยาย)', en: 'ACTIVE', color: '#2563eb' },
    sat:    { th: 'SATURATION (อิ่มตัว)', en: 'SATURATION (ON)', color: '#10b981' }
  };

  function update() {
    var c = compute();
    var en = document.documentElement.lang === 'en';
    var r = REGIONS[c.region];
    var badge = $('tr-badge');
    badge.textContent = en ? r.en : r.th;
    badge.style.background = r.color;
    $('tr-ic').textContent = fmtI(c.ic);
    $('tr-vce').textContent = c.vce.toFixed(2) + ' V';
    $('tr-ib-val').textContent = state.ib + ' µA';
    $('tr-beta-val').textContent = state.beta;
    var eq = state.beta + ' × ' + state.ib + ' µA = ' + fmtI(c.icActive);
    if (c.region === 'sat') eq += en ? ' → clamped to ICsat = ' + fmtI(ICSAT) : ' → อิ่มตัวที่ ICsat = ' + fmtI(ICSAT);
    if (c.region === 'cutoff') eq = en ? 'IB = 0 → transistor off' : 'IB = 0 → ทรานซิสเตอร์หยุดนำ';
    $('tr-eq').textContent = eq;
    return c;
  }

  var cur = update();
  function loop() {
    phase += 0.02;
    draw(cur);
    raf = requestAnimationFrame(loop);
  }
  function refresh() { cur = update(); }

  $('tr-ib').addEventListener('input', function () { state.ib = +this.value; refresh(); });
  $('tr-beta').addEventListener('input', function () { state.beta = +this.value; refresh(); });
  document.addEventListener('langchange', refresh);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(loop);
  });

  raf = requestAnimationFrame(loop);
})();
