/* Interactive phase-control (dimmer) simulator for thyristor.html
   Firing-angle slider α (0–180°) + source Vrms + load R →
   draws one full mains cycle: the source sine, the shaded conduction windows,
   the chopped load voltage, the firing markers and a lamp whose glow follows the
   delivered power. Modes: SCR (half-wave, positive halves only) / TRIAC (full-wave).

   Load rms for phase control (α in radians):
     SCR   : Vrms = Vs·sqrt( (π − α + sin2α/2) / 2π )
     TRIAC : Vrms = Vs·sqrt( (π − α + sin2α/2) /  π )
   P = Vrms² / R. */
(function () {
  var canvas = document.getElementById('scr-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 300;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var FREQ = 50;                       // mains frequency (Hz) — one cycle = 20 ms
  var SWEEP = 2600;                    // ms for the playhead to cross the window

  var state = { mode: 'scr', alpha: 45, vs: 220, load: 484 };
  var startT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var raf = null;

  function $(id) { return document.getElementById(id); }
  function isEN() { return document.documentElement.lang === 'en'; }

  // plot geometry: waveform on the left, lamp on the right
  var PL = 40, PR = 424, PT = 26, PB = 250;
  var MID = (PT + PB) / 2;
  function px(u) { return PL + u * (PR - PL); }            // u = 0..1 over one full cycle
  function py(v) { return MID - v * (PB - PT) / 2; }       // v = −1..1 (normalised)

  var RAD = Math.PI / 180;

  // is the device conducting at electrical angle θ (radians, 0..2π)?
  function conducts(theta, a) {
    var half = theta % Math.PI;                 // position inside the current half cycle
    var positive = theta < Math.PI;
    if (state.mode === 'scr' && !positive) return false;   // SCR blocks the negative half
    return half >= a;                           // fired at α, conducts until the zero crossing
  }

  // rms of the chopped waveform, as a fraction of the source rms
  function rmsFraction(a) {
    var f = (Math.PI - a + Math.sin(2 * a) / 2) / Math.PI;
    if (f < 0) f = 0;
    if (state.mode === 'scr') f /= 2;           // only the positive halves contribute
    return Math.sqrt(f);
  }

  function results() {
    var a = state.alpha * RAD;
    var frac = rmsFraction(a);
    var vrms = state.vs * frac;
    var p = vrms * vrms / state.load;
    // % is always against the full sine wave, so an SCR reads 50% at α = 0 —
    // that is the point: half-wave control can never deliver more than half the power
    var pFull = state.vs * state.vs / state.load;
    return { vrms: vrms, p: p, pct: (p / pFull) * 100,
             cond: Math.max(0, 180 - state.alpha), a: a, frac: frac };
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(148,163,184,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PL, MID); ctx.lineTo(PR, MID); ctx.stroke();   // zero line
    // half-cycle boundary (zero crossing at 180°)
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(px(0.5), PT); ctx.lineTo(px(0.5), PB); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = "10px 'Anuphan',sans-serif";
    ctx.textAlign = 'center';
    ['0°', '90°', '180°', '270°', '360°'].forEach(function (t, i) {
      ctx.fillText(t, px(i / 4), PB + 14);
    });
    ctx.textAlign = 'right';
    ctx.fillText('+Vp', PL - 4, py(1) + 3);
    ctx.fillText('0', PL - 4, MID + 3);
    ctx.fillText('−Vp', PL - 4, py(-1) + 3);
  }

  // shade the intervals where the device conducts
  function drawConduction(a) {
    var steps = 360, i, on, runStart = null;
    ctx.fillStyle = 'rgba(16,185,129,0.16)';
    for (i = 0; i <= steps; i++) {
      var theta = (i / steps) * 2 * Math.PI;
      on = i < steps && conducts(theta, a);
      if (on && runStart === null) runStart = i / steps;
      if (!on && runStart !== null) {
        ctx.fillRect(px(runStart), PT, px(i / steps) - px(runStart), PB - PT);
        runStart = null;
      }
    }
  }

  function drawSource() {
    ctx.strokeStyle = 'rgba(148,163,184,0.75)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (var i = 0; i <= 360; i++) {
      var u = i / 360, v = Math.sin(u * 2 * Math.PI);
      if (i === 0) ctx.moveTo(px(u), py(v)); else ctx.lineTo(px(u), py(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // the voltage actually reaching the load: the sine while conducting, zero otherwise
  function drawLoad(a) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    var drawing = false;
    ctx.beginPath();
    for (var i = 0; i <= 360; i++) {
      var u = i / 360, theta = u * 2 * Math.PI;
      var on = conducts(theta, a);
      var y = on ? py(Math.sin(theta)) : py(0);
      if (!drawing) { ctx.moveTo(px(u), y); drawing = true; }
      else ctx.lineTo(px(u), y);
      // a vertical jump at each firing instant reads as the sharp turn-on it is
      if (on && i < 360 && !conducts(((i + 1) / 360) * 2 * Math.PI, a)) {
        ctx.lineTo(px((i + 1) / 360), py(0));
      }
    }
    ctx.stroke();
  }

  // dashed markers where the gate fires
  function drawFiring(a) {
    var marks = [a / (2 * Math.PI)];
    if (state.mode === 'triac') marks.push((a + Math.PI) / (2 * Math.PI));
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.4;
    ctx.font = "10px 'Anuphan',sans-serif";
    ctx.textAlign = 'left';
    marks.forEach(function (u) {
      if (u >= 0.5 && state.mode === 'scr') return;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px(u), PT); ctx.lineTo(px(u), PB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('α', px(u) + 3, PT + 10);
    });
  }

  function drawLamp(r) {
    var lx = 474, ly = 120, lr = 26;
    var glow = Math.min(1, Math.pow(r.pct / 100, 0.6));     // perceptual-ish brightness
    if (glow > 0.01) {
      var g = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr + 22);
      g.addColorStop(0, 'rgba(250,204,21,' + (0.75 * glow).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, lr + 22, 0, 6.2832); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(lx, ly, lr, 0, 6.2832);
    var lit = Math.round(40 + 215 * glow);
    ctx.fillStyle = 'rgb(' + lit + ',' + Math.round(30 + 190 * glow) + ',' + Math.round(20 + 60 * glow) + ')';
    ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#334155'; ctx.stroke();
    // filament
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.6 * glow).toFixed(2) + ')';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(lx - 9, ly + 8); ctx.lineTo(lx - 4, ly - 6); ctx.lineTo(lx, ly + 6);
    ctx.lineTo(lx + 4, ly - 6); ctx.lineTo(lx + 9, ly + 8);
    ctx.stroke();
    // base
    ctx.fillStyle = '#475569';
    ctx.fillRect(lx - 10, ly + lr - 2, 20, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.font = "11px 'Anuphan',sans-serif";
    ctx.fillText(Math.round(r.pct) + '%', lx, ly + lr + 26);
  }

  function draw(now) {
    var r = results();
    var u = ((now - startT) % SWEEP) / SWEEP;

    ctx.clearRect(0, 0, W, H);
    ctx.font = "10px 'Anuphan',sans-serif";

    drawConduction(r.a);
    drawGrid();
    drawSource();
    drawLoad(r.a);
    drawFiring(r.a);

    // playhead
    ctx.strokeStyle = 'rgba(148,163,184,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px(u), PT); ctx.lineTo(px(u), PB); ctx.stroke();

    // legend
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(isEN() ? 'source (AC)' : 'แหล่งจ่าย (AC)', PL, PT - 12);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(isEN() ? 'load voltage' : 'แรงดันคร่อมโหลด', PL + 108, PT - 12);
    ctx.fillStyle = '#10b981';
    ctx.fillText(isEN() ? 'conducting' : 'ช่วงนำกระแส', PL + 232, PT - 12);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(isEN() ? 'gate fires' : 'จุดชนวน', PL + 330, PT - 12);

    drawLamp(r);
    updateReadouts(r);

    raf = requestAnimationFrame(draw);
  }

  // kept out of draw() so the panel still tracks the controls when the animation
  // is paused (a backgrounded tab gets no animation frames)
  function updateReadouts(r) {
    r = r || results();
    $('scr-out-v').textContent = r.vrms.toFixed(r.vrms < 10 ? 2 : 1) + ' V';
    $('scr-out-p').textContent = r.p >= 1000 ? (r.p / 1000).toFixed(2) + ' kW' : r.p.toFixed(1) + ' W';
    $('scr-out-pct').textContent = r.pct.toFixed(1) + ' %';
    $('scr-out-cond').textContent = r.cond + '°' + (state.mode === 'triac' ? ' ×2' : '');
  }

  function setMode(m) {
    state.mode = m;
    $('scr-mode-scr').classList.toggle('active', m === 'scr');
    $('scr-mode-triac').classList.toggle('active', m === 'triac');
    updateReadouts();
  }

  $('scr-mode-scr').addEventListener('click', function () { setMode('scr'); });
  $('scr-mode-triac').addEventListener('click', function () { setMode('triac'); });
  $('scr-angle').addEventListener('input', function () {
    state.alpha = +this.value; $('scr-angle-val').textContent = state.alpha + '°'; updateReadouts();
  });
  $('scr-vs').addEventListener('input', function () {
    state.vs = +this.value; $('scr-vs-val').textContent = state.vs + ' V'; updateReadouts();
  });
  $('scr-load').addEventListener('input', function () {
    state.load = +this.value; $('scr-load-val').textContent = state.load + ' Ω'; updateReadouts();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(draw);
  });

  updateReadouts();
  raf = requestAnimationFrame(draw);
})();
