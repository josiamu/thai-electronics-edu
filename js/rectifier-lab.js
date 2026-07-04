/* rectifier-lab.js — Interactive AC→DC Rectifier Lab (diode.html)
 * เลือกวงจร (ครึ่งคลื่น/แท็ปกลาง/บริดจ์) + ชนิดไดโอด (Si/Ge/Schottky/Zener/LED/อุดมคติ)
 * + แรงดัน AC + โหลด (RL หรือกระแสคงที่) + ตัวเก็บประจุกรอง แล้วดูรูปคลื่นจริงบนสโคป
 * โมเดล: constant-Vf diode + peak-detector filter (สไตล์เดียวกับ power-supply-sim.js)
 * Zener: ถ้า PIV > Vz จะนำกระแสย้อนกลับ → half-wave เห็นคลื่นรั่วด้านลบ, CT/บริดจ์ ยอดคลื่นถูกกดลง
 */
(function () {
  var canvas = document.getElementById('rl-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 320;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var F0 = 50;                        // mains frequency (Hz, Thailand)
  var N = 600, TWIN = 0.06;           // 60 ms window = 3 mains cycles
  var DT = TWIN / N;

  // vr = max reverse voltage rating (V_RRM per datasheet); zener uses its own breakdown model
  var DIODES = {
    ideal:    { vf: 0,    vr: Infinity },
    si:       { vf: 0.7,  vr: 1000 },   // 1N4007
    ge:       { vf: 0.3,  vr: 60 },     // 1N34A
    schottky: { vf: 0.25, vr: 40 },     // 1N5819
    ufast:    { vf: 1.0,  vr: 1000 },   // UF4007
    zener:    { vf: 0.7,  vr: Infinity },
    led:      { vf: 2.0,  vr: 5 }
  };

  var state = {
    circ: 'half',          // half | ct | bridge
    diode: 'si',
    vz: 5.1,
    vrms: 9,
    lmode: 'r',            // r (resistor) | i (constant current)
    rlPos: 57,             // slider 0..100 → 50 Ω .. 10 kΩ (log scale)
    iload: 100,            // mA
    cap: 0,                // µF (0 = none)
    speed: 1               // sweep speed: 0 pause | 0.25 slow | 1 normal
  };
  var sim = null, off = 0, flowT = 0, raf = null;

  function $(id) { return document.getElementById(id); }

  // log slider → nice 2-significant-figure resistance
  function loadR() {
    var r = 50 * Math.pow(200, state.rlPos / 100);
    var m = Math.pow(10, Math.floor(Math.log(r) / Math.LN10) - 1);
    return Math.round(r / m) * m;
  }

  function simulate() {
    var Vpk = state.vrms * Math.SQRT2;
    var circ = state.circ;
    var Vf = DIODES[state.diode].vf;
    var nD = circ === 'bridge' ? 2 : 1;         // series diode drops
    var isZ = state.diode === 'zener';
    var Vz = state.vz;
    var RL = loadR();
    var Ik = state.iload / 1000;                // A
    var C = state.cap * 1e-6;                   // F
    var w = 2 * Math.PI * F0;

    var vs = new Array(N), vrect = new Array(N), vout = new Array(N), cur = new Array(N);
    var k, s, r, ex, broke = false;
    for (k = 0; k < N; k++) {
      s = Math.sin(w * k * DT);
      vs[k] = Vpk * s;                          // full secondary voltage
      if (circ === 'half') {
        if (vs[k] > Vf) r = vs[k] - Vf;
        else if (isZ && vs[k] < -Vz) { r = vs[k] + Vz; broke = true; }  // reverse breakdown leaks through
        else r = 0;
      } else {
        var dr = (circ === 'ct' ? Vpk / 2 : Vpk) * Math.abs(s);
        r = Math.max(0, dr - nD * Vf);
        if (isZ) {                              // off-diodes break down → peaks collapse
          ex = Math.max(0, Vpk * Math.abs(s) - Vz);
          if (ex > 0) broke = true;
          r = Math.max(0, r - ex);
        }
      }
      vrect[k] = r;
    }

    // filter capacitor: ideal peak detector + load discharge (settle over a few passes)
    if (C > 0) {
      var vc = 0, decR = Math.exp(-DT / (RL * C));
      for (var pass = 0; pass < 4; pass++) {
        for (k = 0; k < N; k++) {
          if (vrect[k] < -0.01) vc = vrect[k];  // zener breakdown drags the node negative
          else {
            var dec = state.lmode === 'r' ? vc * decR : Math.max(0, vc - Ik * DT / C);
            vc = Math.max(vrect[k], dec);
          }
          if (pass === 3) vout[k] = vc;
        }
      }
    } else {
      for (k = 0; k < N; k++) vout[k] = vrect[k];
    }

    // load current
    for (k = 0; k < N; k++) {
      cur[k] = state.lmode === 'r' ? vout[k] / RL : (vout[k] > 0.05 ? Ik : 0);
    }

    // stats
    var vmax = -1e9, vmin = 1e9, vsum = 0, imax = 0, isum = 0, piv = 0, psum = 0;
    for (k = 0; k < N; k++) {
      if (vout[k] > vmax) vmax = vout[k];
      if (vout[k] < vmin) vmin = vout[k];
      vsum += vout[k];
      if (cur[k] > imax) imax = cur[k];
      isum += cur[k];
      psum += vout[k] * cur[k];
      if (circ === 'half') piv = Math.max(piv, vout[k] - vs[k]);
      else if (circ === 'ct') piv = Math.max(piv, vout[k] + Math.abs(vs[k]) / 2);
    }
    if (circ === 'bridge') piv = Math.max(0, Vpk - Vf);

    // all load charge passes through nD conducting diodes → avg conduction loss = nD·Vf·Iavg
    var iavg = isum / N, pload = psum / N;
    var pdiode = nD * Vf * iavg;
    var vrrm = DIODES[state.diode].vr;

    return {
      vs: vs, vrect: vrect, vout: vout, cur: cur,
      Vpk: Vpk, vmax: vmax, vmin: vmin, vavg: vsum / N, vpp: vmax - vmin,
      ipk: imax, iavg: iavg, piv: piv, vrrm: vrrm,
      pload: pload, pdiode: pdiode,
      eff: pload > 1e-9 ? pload / (pload + pdiode) * 100 : 0,
      hasCap: C > 0,
      warnZ: broke,
      warnPIV: piv > vrrm
    };
  }

  // ---------- scope drawing ----------
  var PL = 46, PR = W - 14, PT = 18, PB = H - 28;
  var VS = 14;                                  // volts full-scale (±), updated per refresh
  function vy(v) { return (PT + PB) / 2 - (v / VS) * (PB - PT) / 2; }
  function px(i) { return PL + (i / (N - 1)) * (PR - PL); }

  function gridStep() {
    var c = [0.5, 1, 2, 5, 10, 20], i;
    for (i = 0; i < c.length; i++) if (VS / c[i] <= 4.5) return c[i];
    return 20;
  }

  function trace(arr, color, width, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.beginPath();
    var o = off | 0;
    for (var i = 0; i < N; i++) {
      var idx = (i + o) % N;
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
    var st = gridStep();
    ctx.font = "10px 'Anuphan',sans-serif";
    for (var gv = -Math.floor(VS / st) * st; gv <= VS; gv += st) {
      var y = vy(gv);
      ctx.strokeStyle = gv === 0 ? 'rgba(148,163,184,0.55)' : 'rgba(148,163,184,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(PR, y); ctx.stroke();
      ctx.fillStyle = '#64748b'; ctx.textAlign = 'right';
      ctx.fillText((Math.round(gv * 10) / 10) + 'V', PL - 5, y + 3);
    }
    for (var gx = 0; gx <= 6; gx++) {
      var x = PL + (gx / 6) * (PR - PL);
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.beginPath(); ctx.moveTo(x, PT); ctx.lineTo(x, PB); ctx.stroke();
    }
    // axes
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(PL, PT); ctx.lineTo(PL, PB); ctx.stroke();
    ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left';
    ctx.fillText(en ? 'time →' : 'เวลา →', PR - 50, PB + 14);

    // traces (back to front)
    trace(sim.vs, '#64748b', 1.4, true);
    if (sim.hasCap) trace(sim.vrect, '#94a3b8', 1.2, false);
    trace(sim.vout, '#3b82f6', 2.4, false);

    // average DC line
    if (sim.vavg > 0.15) {
      var ya = vy(sim.vavg);
      ctx.strokeStyle = '#10b981'; ctx.setLineDash([7, 5]); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(PL, ya); ctx.lineTo(PR, ya); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#10b981'; ctx.font = "700 10px 'Anuphan',sans-serif";
      ctx.fillText('Vdc', PL + 5, ya - 4);
    }

    // ripple band marker
    if (sim.hasCap && sim.vpp > 0.15 && sim.vmin > -0.05) {
      var yt = vy(sim.vmax), yb = vy(sim.vmin);
      ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PR - 70, yt); ctx.lineTo(PR - 14, yt); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PR - 70, yb); ctx.lineTo(PR - 14, yb); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(PR - 42, yt); ctx.lineTo(PR - 42, yb); ctx.stroke();
      ctx.fillStyle = '#f59e0b'; ctx.font = "700 10px 'Anuphan',sans-serif"; ctx.textAlign = 'right';
      ctx.fillText('ripple', PR - 48, (yt + yb) / 2 + 3);
    }
    ctx.textAlign = 'left';
  }

  // ---------- circuit diagram: show/hide + conducting-diode glow ----------
  var SVGS = { half: $('rl-svg-half'), ct: $('rl-svg-ct'), bridge: $('rl-svg-bridge') };
  var CAPS = { half: $('rl-h-cap'), ct: $('rl-c-cap'), bridge: $('rl-b-cap') };
  var DPOLY = {
    half: [$('rl-h-d1')],
    ct: [$('rl-c-d1'), $('rl-c-d2')],
    bridge: [$('rl-b-d1'), $('rl-b-d2'), $('rl-b-d3'), $('rl-b-d4')]
  };
  var D_OFF = '#94a3b8';

  function updateDiagram() {
    for (var c in SVGS) {
      if (SVGS[c]) SVGS[c].style.display = c === state.circ ? '' : 'none';
      if (CAPS[c]) CAPS[c].style.opacity = state.cap > 0 ? '1' : '0.15';
    }
  }

  // conventional-current flow paths (follow the drawn wires; load segment always same direction)
  var FLOWPATHS = {
    half: { pos: [[30, 47], [30, 30], [250, 30], [250, 95], [30, 95], [30, 77]] },
    ct: {
      pos: [[42, 22], [258, 22], [258, 142], [60, 142], [60, 74], [42, 74]],
      neg: [[42, 126], [180, 126], [180, 22], [258, 22], [258, 142], [60, 142], [60, 74], [42, 74]]
    },
    bridge: {
      pos: [[126, 80], [95, 80], [95, 25], [255, 25], [255, 135], [185, 135], [185, 80], [154, 80]],
      neg: [[154, 80], [185, 80], [185, 25], [255, 25], [255, 135], [95, 135], [95, 80], [126, 80]]
    }
  };
  var FLOWGEO = {}, FLOWDOTS = {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  (function () {
    for (var c in FLOWPATHS) {
      FLOWGEO[c] = {};
      for (var ph in FLOWPATHS[c]) {
        var pts = FLOWPATHS[c][ph], lens = [0], tot = 0;
        for (var i = 1; i < pts.length; i++) {
          tot += Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2));
          lens.push(tot);
        }
        FLOWGEO[c][ph] = { pts: pts, lens: lens, total: tot };
      }
      var svg = SVGS[c];
      if (!svg) continue;
      var dots = [];
      for (var j = 0; j < 9; j++) {
        var d = document.createElementNS(SVGNS, 'circle');
        d.setAttribute('r', '2.6');
        d.setAttribute('fill', '#f59e0b');
        d.style.display = 'none';
        svg.appendChild(d);
        dots.push(d);
      }
      FLOWDOTS[c] = dots;
    }
  })();

  function updateFlow(phase) {          // 'pos' | 'neg' | null
    for (var c in FLOWDOTS) {
      var dots = FLOWDOTS[c];
      var geo = (c === state.circ && phase) ? FLOWGEO[c][phase] : null;
      for (var i = 0; i < dots.length; i++) {
        if (!geo) { dots[i].style.display = 'none'; continue; }
        var t = (flowT + i / dots.length) % 1;
        var dst = t * geo.total, pts = geo.pts, lens = geo.lens, p = pts[pts.length - 1];
        for (var j = 1; j < pts.length; j++) {
          if (dst <= lens[j]) {
            var f = (dst - lens[j - 1]) / ((lens[j] - lens[j - 1]) || 1);
            p = [pts[j - 1][0] + f * (pts[j][0] - pts[j - 1][0]), pts[j - 1][1] + f * (pts[j][1] - pts[j - 1][1])];
            break;
          }
        }
        dots[i].style.display = '';
        dots[i].setAttribute('cx', p[0].toFixed(1));
        dots[i].setAttribute('cy', p[1].toFixed(1));
      }
    }
  }

  function glow() {
    var idx = (N - 1 + (off | 0)) % N;
    var conducting = sim.vrect[idx] > 0.05 && sim.vrect[idx] >= sim.vout[idx] - 0.05;
    var pos = sim.vs[idx] >= 0;
    var breakdown = sim.vout[idx] < -0.05;
    var onCol = sim.warnZ || breakdown ? '#dc2626' : (state.diode === 'led' ? '#ef4444' : '#f59e0b');
    var ds = DPOLY[state.circ], onList;
    if (state.circ === 'half') onList = [conducting || breakdown];
    else if (state.circ === 'ct') onList = [conducting && pos, conducting && !pos];
    else onList = [conducting && pos, conducting && !pos, conducting && !pos, conducting && pos];
    for (var i = 0; i < ds.length; i++) {
      if (ds[i]) ds[i].setAttribute('fill', onList[i] ? onCol : D_OFF);
    }
    updateFlow(conducting ? (pos ? 'pos' : 'neg') : null);
  }

  // ---------- readouts ----------
  function fV(v) { return v.toFixed(2) + ' V'; }
  function fI(a) {
    var m = a * 1000;
    return (m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2)) + ' mA';
  }
  function fP(w) {
    if (w >= 1) return w.toFixed(2) + ' W';
    var m = w * 1000;
    return (m >= 10 ? m.toFixed(0) : m.toFixed(1)) + ' mW';
  }

  // live "where the numbers come from" panel — textbook formulas with values substituted
  function updateMath() {
    var el = $('rl-math');
    var en = document.documentElement.lang === 'en';
    if (sim.warnZ) {
      el.innerHTML = '<div class="rl-math-warn">⚠ ' + (en
        ? 'Standard formulas don’t apply — the diode is conducting in reverse (breakdown)'
        : 'สูตรมาตรฐานใช้ไม่ได้ — ไดโอดกำลังนำกระแสย้อนกลับ (breakdown)') + '</div>';
      return;
    }
    var Vf = DIODES[state.diode].vf;
    var n = state.circ === 'bridge' ? 2 : 1;
    var Vpk = sim.Vpk;
    var base = state.circ === 'ct' ? Vpk / 2 : Vpk;
    var vpo = Math.max(0, base - n * Vf);
    var meas = function (v) {
      return ' <span>(' + (en ? 'measured' : 'วัดได้') + ' ' + v.toFixed(2) + ' V)</span>';
    };
    var lines = [];
    lines.push('V<sub>p</sub> = √2 × ' + state.vrms + ' = <b>' + Vpk.toFixed(2) + ' V</b>');
    if (state.circ === 'ct') {
      lines.push('V<sub>p</sub>(' + (en ? 'half-winding' : 'ครึ่งขด') + ') = ' + Vpk.toFixed(2) + ' ÷ 2 = <b>' + base.toFixed(2) + ' V</b>');
    }
    lines.push('V<sub>p(out)</sub> = ' + base.toFixed(2) + ' − ' + n + '×' + Vf.toFixed(2) + ' = <b>' + vpo.toFixed(2) + ' V</b>');
    if (!sim.hasCap) {
      var kf = state.circ === 'half' ? 0.318 : 0.637;
      lines.push('V<sub>dc</sub> = ' + kf + ' × ' + vpo.toFixed(2) + ' = <b>' + (kf * vpo).toFixed(2) + ' V</b>' + meas(sim.vavg));
    } else {
      var fr = state.circ === 'half' ? 50 : 100;
      var vppCalc = sim.iavg / (fr * state.cap * 1e-6);
      lines.push('V<sub>pp</sub> ≈ I ÷ (f×C) = ' + (sim.iavg * 1000).toFixed(1) + 'mA ÷ (' + fr + ' × ' + state.cap + 'µF) = <b>' + vppCalc.toFixed(2) + ' V</b>' + meas(sim.vpp));
      lines.push('V<sub>dc</sub> ≈ V<sub>p(out)</sub> − V<sub>pp</sub>/2 = ' + vpo.toFixed(2) + ' − ' + (sim.vpp / 2).toFixed(2) + ' = <b>' + (vpo - sim.vpp / 2).toFixed(2) + ' V</b>' + meas(sim.vavg));
    }
    el.innerHTML = '<div class="rl-math-title">' + (en ? '📐 Where the numbers come from' : '📐 ที่มาของตัวเลข') + '</div>'
      + lines.map(function (l) { return '<div class="rl-math-line">' + l + '</div>'; }).join('');
  }

  function refresh() {
    sim = simulate();
    VS = Math.max(2, sim.Vpk * 1.12 + 0.8);
    var en = document.documentElement.lang === 'en';

    $('rl-vpin').textContent = fV(sim.Vpk);
    $('rl-vpout').textContent = fV(Math.max(0, sim.vmax));
    $('rl-vdc').textContent = fV(sim.vavg);
    $('rl-vrip').textContent = sim.vpp.toFixed(2) + ' Vpp';
    $('rl-ipk').textContent = fI(sim.ipk);
    $('rl-iavg').textContent = fI(sim.iavg);
    $('rl-piv').textContent = isFinite(sim.vrrm)
      ? sim.piv.toFixed(1) + ' / ' + sim.vrrm + ' V'
      : fV(sim.piv);
    $('rl-piv').style.color = (sim.warnZ || sim.warnPIV) ? '#ef4444' : '';
    $('rl-frip').textContent = state.circ === 'half' ? '50 Hz' : '100 Hz';
    $('rl-pd').textContent = fP(sim.pdiode);
    $('rl-eff').textContent = sim.eff.toFixed(0) + ' %';
    $('rl-leg-rect').style.display = sim.hasCap ? '' : 'none';

    var badge = $('rl-badge'), txt, col;
    if (sim.warnZ) {
      txt = en ? '⚠ Zener breakdown — conducts in reverse!' : '⚠ ซีเนอร์ breakdown — นำกระแสย้อนกลับ!';
      col = '#dc2626';
    } else if (sim.warnPIV) {
      txt = en
        ? '⚠ PIV exceeds Vᵣ rating (' + sim.vrrm + ' V) — a real diode would fail'
        : '⚠ PIV เกินพิกัดไดโอด (ทนได้ ' + sim.vrrm + ' V) — ของจริงจะพัง';
      col = '#ef4444';
    } else if (sim.vmax < 0.4) {
      txt = en ? 'Almost no output — Vf too high vs input' : 'แทบไม่มีเอาต์พุต — Vf สูงเทียบแรงดันเข้า';
      col = '#64748b';
    } else if (!sim.hasCap) {
      txt = en ? 'PULSATING DC · no filter' : 'DC พัลส์ · ยังไม่กรอง';
      col = '#64748b';
    } else if (sim.vpp < 0.5) {
      txt = en ? 'SMOOTH DC' : 'DC เรียบ';
      col = '#10b981';
    } else {
      txt = en ? 'FILTERED · some ripple' : 'กรองแล้ว · มีระลอกบ้าง';
      col = '#3b82f6';
    }
    badge.textContent = txt;
    badge.style.background = col;
    updateDiagram();
    updateMath();
  }

  function loop() {
    off = (off + 2 * state.speed) % N;
    flowT = (flowT + 0.004 * state.speed) % 1;
    draw();
    glow();
    raf = requestAnimationFrame(loop);
  }

  // ---------- value labels (bilingual) ----------
  function fmtR(r) { return r < 1000 ? r + ' Ω' : (r / 1000) + ' kΩ'; }
  function labels() {
    var en = document.documentElement.lang === 'en';
    $('rl-vrms-val').textContent = state.vrms + ' V rms ≈ ' + (state.vrms * Math.SQRT2).toFixed(1) + ' Vp';
    $('rl-rl-val').textContent = fmtR(loadR());
    $('rl-i-val').textContent = state.iload + ' mA';
    $('rl-cap-val').textContent = state.cap === 0 ? (en ? 'none' : 'ไม่มี') : state.cap + ' µF';
  }

  // ---------- controls ----------
  function seg(id, attr, fn) {
    var btns = document.querySelectorAll('#' + id + ' button');
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(btns, function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        fn(b.getAttribute(attr));
      });
    });
  }

  seg('rl-circ', 'data-circ', function (v) { state.circ = v; refresh(); });
  seg('rl-speed', 'data-s', function (v) { state.speed = parseFloat(v); });
  seg('rl-lmode', 'data-lmode', function (v) {
    state.lmode = v;
    $('rl-row-r').style.display = v === 'r' ? '' : 'none';
    $('rl-row-i').style.display = v === 'i' ? '' : 'none';
    refresh();
  });
  $('rl-diode').addEventListener('change', function () {
    state.diode = this.value;
    $('rl-vz-row').style.display = state.diode === 'zener' ? '' : 'none';
    refresh();
  });
  $('rl-vz').addEventListener('change', function () { state.vz = +this.value; refresh(); });
  $('rl-vrms').addEventListener('input', function () { state.vrms = +this.value; labels(); refresh(); });
  $('rl-rl').addEventListener('input', function () { state.rlPos = +this.value; labels(); refresh(); });
  $('rl-i').addEventListener('input', function () { state.iload = +this.value; labels(); refresh(); });
  $('rl-cap').addEventListener('input', function () { state.cap = +this.value; labels(); refresh(); });

  document.addEventListener('langchange', function () { labels(); refresh(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) raf = requestAnimationFrame(loop);
  });

  labels();
  refresh();
  raf = requestAnimationFrame(loop);
})();
