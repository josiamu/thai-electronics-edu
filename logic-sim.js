/* Interactive logic-gate simulator
   Pick a gate, toggle inputs A/B → draws the gate symbol with wires
   coloured by state, an output LED, and a live-highlighted truth table. */
(function () {
  var canvas = document.getElementById('logic-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W = 520, H = 260;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);

  var ON = '#10b981', OFF = '#475569';
  var state = { gate: 'AND', a: 0, b: 0 };

  function $(id) { return document.getElementById(id); }
  function oneInput(g) { return g === 'NOT'; }
  function negated(g) { return g === 'NAND' || g === 'NOR' || g === 'XNOR' || g === 'NOT'; }
  function base(g) {
    if (g === 'AND' || g === 'NAND') return 'and';
    if (g === 'OR' || g === 'NOR') return 'or';
    if (g === 'XOR' || g === 'XNOR') return 'xor';
    return 'not';
  }
  function out(g, a, b) {
    switch (g) {
      case 'AND': return a && b ? 1 : 0;
      case 'OR': return a || b ? 1 : 0;
      case 'XOR': return a ^ b ? 1 : 0;
      case 'NAND': return !(a && b) ? 1 : 0;
      case 'NOR': return !(a || b) ? 1 : 0;
      case 'XNOR': return !(a ^ b) ? 1 : 0;
      case 'NOT': return a ? 0 : 1;
    }
    return 0;
  }

  // geometry
  var L = 210, R = 300, T = 70, B = 190, MY = (T + B) / 2;

  function drawBody(bs) {
    ctx.strokeStyle = 'var(--primary)';
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (bs === 'and') {
      var r = (B - T) / 2;
      ctx.moveTo(L, T); ctx.lineTo(L + 40, T);
      ctx.arc(L + 40, MY, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(L, B); ctx.closePath();
    } else if (bs === 'or') {
      ctx.moveTo(L, T);
      ctx.quadraticCurveTo(L + 55, T, L + 95, MY);
      ctx.quadraticCurveTo(L + 55, B, L, B);
      ctx.quadraticCurveTo(L + 22, MY, L, T);
    } else if (bs === 'xor') {
      ctx.moveTo(L + 8, T);
      ctx.quadraticCurveTo(L + 63, T, L + 103, MY);
      ctx.quadraticCurveTo(L + 63, B, L + 8, B);
      ctx.quadraticCurveTo(L + 30, MY, L + 8, T);
    } else { // not (triangle)
      ctx.moveTo(L, T); ctx.lineTo(L, B); ctx.lineTo(L + 95, MY); ctx.closePath();
    }
    ctx.stroke();
    // XOR extra back arc
    if (bs === 'xor') {
      ctx.beginPath();
      ctx.moveTo(L - 2, T);
      ctx.quadraticCurveTo(L + 20, MY, L - 2, B);
      ctx.stroke();
    }
  }

  function tipX(bs) {
    if (bs === 'and') return L + 40 + (B - T) / 2;
    if (bs === 'or') return L + 95;
    if (bs === 'xor') return L + 103;
    return L + 95;
  }

  function wire(x1, y1, x2, y2, on) {
    ctx.strokeStyle = on ? ON : OFF; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = on ? ON : OFF;
    ctx.beginPath(); ctx.arc(x1, y1, 4, 0, 6.2832); ctx.fill();
  }

  function draw() {
    var g = state.gate, single = oneInput(g);
    var o = out(g, state.a, state.b);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "600 14px 'Anuphan',sans-serif";

    // gate name
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(g, (L + tipX(base(g))) / 2 + 6, T - 28);

    // input wires
    var ay = single ? MY : T + 24;
    wire(120, ay, L, ay, state.a);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim() || '#64748b';
    ctx.font = "12px 'Anuphan',sans-serif"; ctx.textAlign = 'right';
    ctx.fillText('A = ' + state.a, 116, ay + 4);
    if (!single) {
      wire(120, B - 24, L, B - 24, state.b);
      ctx.fillText('B = ' + state.b, 116, B - 24 + 4);
    }

    drawBody(base(g));

    // output bubble (for negated) + output wire
    var tx = tipX(base(g)), ox = tx;
    if (negated(g)) {
      ctx.beginPath(); ctx.arc(tx + 6, MY, 6, 0, 6.2832);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff';
      ctx.fill();
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';
      ctx.lineWidth = 2; ctx.stroke();
      ox = tx + 12;
    }
    wire(ox, MY, 400, MY, o);

    // output LED
    var lx = 430, lr = 20;
    if (o) {
      var grd = ctx.createRadialGradient(lx, MY, 2, lx, MY, lr + 16);
      grd.addColorStop(0, 'rgba(16,185,129,0.55)'); grd.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(lx, MY, lr + 16, 0, 6.2832); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(lx, MY, lr, 0, 6.2832);
    ctx.fillStyle = o ? ON : '#14342a'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#334155'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = "700 16px 'Anuphan',sans-serif"; ctx.textAlign = 'center';
    ctx.fillText(o, lx, MY + 6);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim() || '#64748b';
    ctx.font = "12px 'Anuphan',sans-serif";
    ctx.fillText('Y = ' + o, lx, MY + lr + 18);

    syncControls(single);
    highlightRow();
  }

  // ---- controls ----
  function syncControls(single) {
    $('lg-a').textContent = 'A = ' + state.a;
    $('lg-a').classList.toggle('on', !!state.a);
    var bBtn = $('lg-b');
    bBtn.textContent = 'B = ' + state.b;
    bBtn.classList.toggle('on', !!state.b);
    bBtn.disabled = single;
    bBtn.style.opacity = single ? 0.4 : 1;
  }

  function buildTruth() {
    var g = state.gate, single = oneInput(g);
    var rows = single ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    var head = '<tr><th>A</th>' + (single ? '' : '<th>B</th>') + '<th>Y</th></tr>';
    var body = rows.map(function (r) {
      var y = single ? out(g, r[0], 0) : out(g, r[0], r[1]);
      var id = 'lg-row-' + r.join('');
      return '<tr id="' + id + '"><td>' + r[0] + '</td>' +
        (single ? '' : '<td>' + r[1] + '</td>') +
        '<td><strong>' + y + '</strong></td></tr>';
    }).join('');
    $('lg-truth').innerHTML = head + body;
  }

  function highlightRow() {
    document.querySelectorAll('#lg-truth tr').forEach(function (tr) { tr.classList.remove('active'); });
    var id = oneInput(state.gate) ? 'lg-row-' + state.a : 'lg-row-' + state.a + state.b;
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  $('lg-gate').addEventListener('change', function () {
    state.gate = this.value;
    buildTruth(); draw();
  });
  $('lg-a').addEventListener('click', function () { state.a = state.a ? 0 : 1; draw(); });
  $('lg-b').addEventListener('click', function () { if (!oneInput(state.gate)) { state.b = state.b ? 0 : 1; draw(); } });

  document.addEventListener('langchange', draw);

  buildTruth();
  draw();
})();
