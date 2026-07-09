/* Interactive Optocoupler (PC817-style) simulator
   IF slider drives the input LED; photons cross the isolation gap and drive
   the phototransistor. IC = CTR × IF flows through RL, pulling Vout down
   from Vcc until the transistor saturates (Vout ≈ VCESAT). */
(function () {
  var canvas = document.getElementById('opto-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var VCC = 5, VCESAT = 0.2;
  var IF_MAX = 20; // slider max, mA

  var state = { ifma: 5, ctr: 100, rl: 1 }; // IF mA, CTR %, RL kΩ
  var raf = null;

  function $(id) { return document.getElementById(id); }

  // circuit solution
  function solve() {
    var icMax = state.ctr / 100 * state.ifma;          // mA the opto could pass
    var icSat = (VCC - VCESAT) / state.rl;             // mA needed to saturate
    if (state.ifma < 0.25) return { ic: 0, vout: VCC, icMax: icMax, mode: 'off' };
    if (icMax >= icSat) return { ic: icSat, vout: VCESAT, icMax: icMax, mode: 'sat' };
    return { ic: icMax, vout: VCC - icMax * state.rl, icMax: icMax, mode: 'active' };
  }

  // geometry
  var GY = 232;              // ground rail y
  var TY = 92;               // input top wire y
  var LEDX = 150;            // input LED x
  var TRX = 352;             // phototransistor bar x
  var VCCY = 44;             // Vcc rail y
  var OUTY = 128;            // collector / Vout node y
  var BARX = 484, BARW = 20; // Vout bar

  var photons = []; // {x, y, v}

  function drawWire(x1, y1, x2, y2, color, w) {
    ctx.strokeStyle = color || '#94a3b8'; ctx.lineWidth = w || 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function drawGround(x, y) {
    drawWire(x - 10, y, x + 10, y, '#94a3b8', 1.8);
    drawWire(x - 6, y + 4, x + 6, y + 4, '#94a3b8', 1.5);
    drawWire(x - 2, y + 8, x + 2, y + 8, '#94a3b8', 1.2);
  }

  function draw() {
    var s = solve();
    var glow = Math.min(1, state.ifma / 12);

    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px 'Anuphan',sans-serif";

    // package outline + isolation barrier
    ctx.strokeStyle = 'rgba(148,163,184,0.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(100, 60, 310, 200);
    ctx.setLineDash([5, 5]);
    drawWire(255, 66, 255, 254, 'rgba(148,163,184,0.7)', 1.2);
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';
    ctx.fillText('isolation', 255, 278);

    // ---- input side ----
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'left';
    ctx.fillText('IF = ' + state.ifma.toFixed(1) + ' mA', 36, TY - 14);
    drawWire(40, TY, LEDX, TY);
    drawWire(40, TY, 40, GY);
    drawWire(40, GY, LEDX, GY);
    drawGround(40, GY);
    // current-direction arrow on the top wire
    if (s.mode !== 'off') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.moveTo(96, TY - 5); ctx.lineTo(106, TY); ctx.lineTo(96, TY + 5); ctx.closePath(); ctx.fill();
    }
    // LED glow
    if (glow > 0.02) {
      var g = ctx.createRadialGradient(LEDX, 162, 4, LEDX, 162, 46);
      g.addColorStop(0, 'rgba(239,68,68,' + (0.55 * glow) + ')');
      g.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(LEDX, 162, 46, 0, Math.PI * 2); ctx.fill();
    }
    // LED symbol (anode top, cathode bottom)
    drawWire(LEDX, TY, LEDX, 146, '#e2e8f0');
    drawWire(LEDX, 178, LEDX, GY, '#e2e8f0');
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(LEDX - 12, 146); ctx.lineTo(LEDX + 12, 146); ctx.lineTo(LEDX, 178); ctx.closePath(); ctx.stroke();
    drawWire(LEDX - 12, 178, LEDX + 12, 178, '#ef4444', 2);
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'center';
    ctx.fillText('LED', LEDX, 146 - 8);

    // ---- photons crossing the gap ----
    var spawn = state.ifma / IF_MAX * 0.9;
    if (s.mode !== 'off' && Math.random() < spawn) {
      photons.push({ x: LEDX + 22, y: 140 + Math.random() * 44, v: 1.6 + Math.random() * 1.2 });
    }
    ctx.fillStyle = '#f59e0b';
    for (var i = photons.length - 1; i >= 0; i--) {
      var p = photons[i];
      p.x += p.v;
      if (p.x > TRX - 14) { photons.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // ---- output side ----
    // Vcc rail + RL
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left';
    ctx.fillText('Vcc +5V', TRX + 26, VCCY - 6);
    drawWire(TRX + 18, VCCY, TRX + 18, 66, '#e2e8f0');
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.6;
    ctx.strokeRect(TRX + 8, 66, 20, 34);
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'left';
    ctx.fillText('RL ' + state.rl.toFixed(1) + 'k', TRX + 34, 88);
    drawWire(TRX + 18, 100, TRX + 18, OUTY, '#e2e8f0');
    // phototransistor: bar + C/E legs
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(TRX, 148); ctx.lineTo(TRX, 186); ctx.stroke();
    drawWire(TRX, 156, TRX + 18, 140, '#e2e8f0', 1.8);   // collector leg
    drawWire(TRX + 18, 140, TRX + 18, OUTY, '#e2e8f0', 1.8);
    drawWire(TRX, 178, TRX + 18, 194, '#e2e8f0', 1.8);   // emitter leg
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath(); ctx.moveTo(TRX + 18, 194); ctx.lineTo(TRX + 8, 190); ctx.lineTo(TRX + 13, 184); ctx.closePath(); ctx.fill();
    drawWire(TRX + 18, 194, TRX + 18, GY, '#e2e8f0', 1.8);
    drawGround(TRX + 18, GY);
    // light arrows onto transistor
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.4;
    [158, 172].forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(TRX - 24, y - 8); ctx.lineTo(TRX - 8, y); ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(TRX - 8, y); ctx.lineTo(TRX - 16, y - 1); ctx.lineTo(TRX - 12, y - 7); ctx.closePath(); ctx.fill();
    });

    // Vout node + wire to bar
    drawWire(TRX + 18, OUTY, BARX - 6, OUTY, '#3b82f6', 1.8);
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.arc(TRX + 18, OUTY, 3, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'right';
    ctx.fillText('Vout', BARX - 10, OUTY - 8);

    // Vout bar (0V at GY, 5V at VCCY)
    ctx.strokeStyle = 'rgba(148,163,184,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(BARX, VCCY, BARW, GY - VCCY);
    var frac = s.vout / VCC;
    var hgt = frac * (GY - VCCY);
    ctx.fillStyle = s.mode === 'sat' ? '#10b981' : '#3b82f6';
    ctx.fillRect(BARX + 1, GY - hgt, BARW - 2, hgt);
    ctx.fillStyle = '#e2e8f0'; ctx.textAlign = 'center';
    ctx.fillText(s.vout.toFixed(1) + 'V', BARX + BARW / 2, VCCY - 8);

    // readouts
    $('opto-ic').textContent = s.ic.toFixed(2) + ' mA';
    $('opto-vout').textContent = s.vout.toFixed(2) + ' V';
    $('opto-icmax').textContent = s.icMax.toFixed(1) + ' mA';
    var st = $('opto-state');
    if (s.mode === 'off') { st.textContent = 'OFF'; st.style.color = 'var(--text-light)'; }
    else if (s.mode === 'sat') { st.textContent = 'SAT (ON)'; st.style.color = 'var(--secondary)'; }
    else { st.textContent = 'ACTIVE'; st.style.color = '#3b82f6'; }

    raf = requestAnimationFrame(draw);
  }

  $('opto-if').addEventListener('input', function () {
    state.ifma = +this.value; $('opto-if-val').textContent = state.ifma.toFixed(1) + ' mA';
  });
  $('opto-ctr').addEventListener('input', function () {
    state.ctr = +this.value; $('opto-ctr-val').textContent = state.ctr + '%';
  });
  $('opto-rl').addEventListener('input', function () {
    state.rl = +this.value; $('opto-rl-val').textContent = state.rl.toFixed(1) + ' kΩ';
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });

  raf = requestAnimationFrame(draw);
})();
