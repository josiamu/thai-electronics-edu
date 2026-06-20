(function(){
'use strict';
var NS = 'http://www.w3.org/2000/svg';

// ════════════════════════════ CONFIG / GEOMETRY ════════════════════════════
var COLS = 30;          // tie-point columns (400-point half board)
var DX = 24;            // hole spacing X
var DY = 24;            // hole spacing Y
var X0 = 54;            // left margin (room for row labels)
var R_HOLE = 5.4;

var ROWS_TOP = ['a','b','c','d','e'];
var ROWS_BOT = ['f','g','h','i','j'];
var Y_RAIL_TP = 30, Y_RAIL_TN = 54;          // top power rails (+ / −)
var Y_TOP0 = 104;                            // first top terminal row (a)
var Y_BOT0 = 252;                            // first bottom terminal row (f)
var Y_RAIL_BN = 400, Y_RAIL_BP = 424;        // bottom power rails (− / +)
var W = X0 + (COLS - 1) * DX + 36;
var H = Y_RAIL_BP + 34;

function colX(c){ return X0 + (c - 1) * DX; }   // c = 1..COLS

// component electrical params
var DIODE_VF = 0.7, DIODE_RD = 8;
var LED_RD = 14;
var NTC_B = 3500, VDR_RD = 8;

// resistor-family: linear types whose R depends only on the environment (not on circuit voltage)
var RFAM = { resistor:1, vr:1, ntc:1, ptc:1, ldr:1 };
function isNonlin(t){ return t === 'diode' || t === 'led' || t === 'vdr'; }

// standard nominal-resistance lists per type (the "value" picked when placing)
var R_OPTIONS = {
  resistor: [100, 220, 330, 470, 1000, 2200, 4700, 10000],
  vr:       [1000, 5000, 10000, 50000, 100000, 500000, 1000000],  // potentiometer max R
  ntc:      [1000, 2200, 4700, 10000, 47000, 100000],             // R at 25°C (10k most common)
  ptc:      [100, 220, 470, 1000, 2200, 4700],                    // R at 25°C
  ldr:      [500, 1000, 2000, 5000, 10000, 20000]                 // R in full light
};
var R_DEFAULT = { resistor:330, vr:10000, ntc:10000, ptc:1000, ldr:1000 };
// per-type border / label colour so each device reads differently at a glance
var RTYPE_STYLE = {
  resistor:{ border:'#78716c' },
  vr:      { border:'#2563eb' },
  ntc:     { border:'#0891b2' },
  ptc:     { border:'#dc2626' },
  ldr:     { border:'#ca8a04' },
  vdr:     { border:'#16a34a' }
};
var R_VAL_LABEL = {
  resistor:{ th:'ค่า R', en:'R value' },
  vr:      { th:'ค่าสูงสุด', en:'Max R' },
  ntc:     { th:'R ที่ 25°C', en:'R at 25°C' },
  ptc:     { th:'R ที่ 25°C', en:'R at 25°C' },
  ldr:     { th:'R ตอนสว่าง', en:'Bright R' }
};
function rLabel(r){ return r >= 1e6 ? (r / 1e6) + ' MΩ' : r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω'; }

// effective resistance from nominal value + environment
function effR(c){
  switch (c.type){
    case 'vr':  return Math.max(1, c.value * env.vrPos / 100);
    case 'ntc': return c.value * Math.exp(NTC_B * (1 / (env.temp + 273.15) - 1 / 298.15));
    case 'ptc': return Math.max(c.value * 0.2, c.value * (1 + 0.06 * (env.temp - 25)));
    case 'ldr': return c.value * Math.pow(10, 2 * (1 - env.light / 100));   // value = R in full light
    default:    return c.value;
  }
}
var LED_COLORS = {
  red:    { vf:1.8, fill:'#ef4444', glow:'#fca5a5', th:'แดง',     en:'Red' },
  yellow: { vf:2.0, fill:'#eab308', glow:'#fde047', th:'เหลือง',  en:'Yellow' },
  green:  { vf:2.1, fill:'#22c55e', glow:'#86efac', th:'เขียว',   en:'Green' },
  blue:   { vf:3.0, fill:'#3b82f6', glow:'#93c5fd', th:'น้ำเงิน', en:'Blue' },
  white:  { vf:3.2, fill:'#e2e8f0', glow:'#ffffff', th:'ขาว',     en:'White' }
};

// ════════════════════════════ STATE ════════════════════════════
var holes = {};          // id -> {x, y, node, el}
var holeAt = {};         // "x_y" -> id (reverse lookup for drag snapping)
var comps = [];          // {id,type,a,b,value,vf,color,results,segs}
var occupied = {};       // holeId -> compId (one pin per hole)
var nextId = 1;
var tool = null;         // armed tool: battery|resistor|led|diode|wire|delete|null
var pendingHole = null;  // first clicked hole id (awaiting second)
var selectedId = null;   // currently selected component (for the edit panel)
var batteryV = 9;
var resVal = 330;
var resSubtype = 'resistor';   // resistor | vr | ntc | ptc | ldr | vdr
var vdrVc = 6;
var ledColor = 'red';
var env = { temp:25, light:50, vrPos:50 };   // shared sensor environment

// multimeter probe state
var meterMode = 'v';        // 'v' | 'i' | 'r' | 'd' | 'cont'
var probeRed = null;        // hole id for the red (+) probe   (V / continuity modes)
var probeBlk = null;        // hole id for the black (−) probe
var meterTargetComp = null; // component id being measured     (I / Ω / diode modes)
var meterRev = false;       // diode-test probe orientation (false = forward, true = reversed → OL)
var probeCtx = null;        // set by solveCircuit: { V(holeId), connected(h1,h2), ground, ok }
var actx = null;            // lazily-created AudioContext for the continuity beep

// ════════════════════════════ DOM ════════════════════════════
function $(id){ return document.getElementById(id); }
var svg = $('bb-svg');
svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
var gBoard, gHoles, gComps, gElec, gProbe, hlEl;

// ════════════════════════════ SVG HELPERS ════════════════════════════
function el(tag, attrs){
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// ════════════════════════════ BUILD BOARD ════════════════════════════
function buildBoard(){
  // glow filter for lit LEDs
  var defs = el('defs', {});
  defs.innerHTML = '<filter id="bb-glow" x="-120%" y="-120%" width="340%" height="340%">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="b"/>' +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg.appendChild(defs);

  gBoard = el('g', {});  svg.appendChild(gBoard);
  gHoles = el('g', {});  svg.appendChild(gHoles);
  gComps = el('g', {});  svg.appendChild(gComps);
  gElec  = el('g', {});  svg.appendChild(gElec);
  gProbe = el('g', {});  svg.appendChild(gProbe);
  hlEl = el('circle', { class:'bb-pin-hl', r:R_HOLE + 4, style:'display:none' });
  svg.appendChild(hlEl);

  var left = X0 - 30, right = colX(COLS) + 30, fullW = right - left;

  // board body (top half + bottom half) with center channel
  gBoard.appendChild(el('rect', { class:'bb-board', x:left, y:Y_RAIL_TP - 18, width:fullW, height:(Y_TOP0 + 4*DY + 16) - (Y_RAIL_TP - 18), rx:8 }));
  gBoard.appendChild(el('rect', { class:'bb-board', x:left, y:Y_BOT0 - 16, width:fullW, height:(Y_RAIL_BP + 18) - (Y_BOT0 - 16), rx:8 }));
  // center channel
  var chY = Y_TOP0 + 4*DY + 16;
  gBoard.appendChild(el('rect', { class:'bb-channel', x:left, y:chY, width:fullW, height:(Y_BOT0 - 16) - chY }));

  // power rails (lines + labels)
  rail(left + 6, right - 6, Y_RAIL_TP - 9, 'bb-rail-red', '+');
  rail(left + 6, right - 6, Y_RAIL_TN + 9, 'bb-rail-blue', '−');
  rail(left + 6, right - 6, Y_RAIL_BN - 9, 'bb-rail-blue', '−');
  rail(left + 6, right - 6, Y_RAIL_BP + 9, 'bb-rail-red', '+');

  // rail holes (grouped in 5s, slight gaps) — one node per rail
  for (var c = 1; c <= COLS; c++){
    if (c % 6 === 0) continue;            // visual gap every 6th
    var x = colX(c);
    addHole('TP' + c, x, Y_RAIL_TP, 'RTP');
    addHole('TN' + c, x, Y_RAIL_TN, 'RTN');
    addHole('BN' + c, x, Y_RAIL_BN, 'RBN');
    addHole('BP' + c, x, Y_RAIL_BP, 'RBP');
  }

  // column number labels (every 5)
  for (var c2 = 1; c2 <= COLS; c2++){
    if (c2 === 1 || c2 % 5 === 0){
      gBoard.appendChild(txt(colX(c2), Y_TOP0 - 16, c2, 'bb-lbl'));
      gBoard.appendChild(txt(colX(c2), Y_BOT0 + 4*DY + 16, c2, 'bb-lbl'));
    }
  }

  // terminal holes + row labels
  ROWS_TOP.forEach(function(r, ri){
    gBoard.appendChild(txt(X0 - 26, Y_TOP0 + ri*DY, r, 'bb-lbl'));
    gBoard.appendChild(txt(right + 4, Y_TOP0 + ri*DY, r, 'bb-lbl'));
    for (var c = 1; c <= COLS; c++) addHole('t' + r + c, colX(c), Y_TOP0 + ri*DY, 'T' + c);
  });
  ROWS_BOT.forEach(function(r, ri){
    gBoard.appendChild(txt(X0 - 26, Y_BOT0 + ri*DY, r, 'bb-lbl'));
    gBoard.appendChild(txt(right + 4, Y_BOT0 + ri*DY, r, 'bb-lbl'));
    for (var c = 1; c <= COLS; c++) addHole('t' + r + c, colX(c), Y_BOT0 + ri*DY, 'B' + c);
  });
}

function rail(x1, x2, y, cls, sym){
  gBoard.appendChild(el('line', { class:cls, x1:x1, y1:y, x2:x2, y2:y }));
  var c = sym === '+' ? '#ef4444' : '#3b82f6';
  gBoard.appendChild(txt(x1 - 4, y, sym, 'bb-lbl bb-lbl-rail', c, 'end'));
  gBoard.appendChild(txt(x2 + 4, y, sym, 'bb-lbl bb-lbl-rail', c, 'start'));
}

function txt(x, y, s, cls, fill, anchor){
  var t = el('text', { x:x, y:y, class:cls });
  if (fill) t.setAttribute('fill', fill);
  if (anchor) t.setAttribute('text-anchor', anchor);
  t.textContent = s;
  return t;
}

function addHole(id, x, y, node){
  var c = el('circle', { class:'bb-hole', cx:x, cy:y, r:R_HOLE, 'data-id':id });
  c.addEventListener('click', function(){ onHoleClick(id); });
  gHoles.appendChild(c);
  holes[id] = { x:x, y:y, node:node, el:c };
  holeAt[hkey(x, y)] = id;
}
function hkey(x, y){ return Math.round(x) + '_' + Math.round(y); }

// ════════════════════════════ PLACEMENT ════════════════════════════
var POLAR = { battery:1, led:1, diode:1 };    // first hole = + / anode
var TYPE_LABEL = {
  battery: { th:'แบตเตอรี่', en:'Battery' },
  resistor:{ th:'ตัวต้านทาน', en:'Resistor' },
  led:     { th:'LED', en:'LED' },
  diode:   { th:'ไดโอด', en:'Diode' },
  wire:    { th:'จัมเปอร์', en:'Jumper' },
  switch:  { th:'สวิตช์', en:'Switch' }
};

function isEN(){ return document.documentElement.lang === 'en'; }

function setHint(html){ $('bb-hint').innerHTML = html; }

function refreshHint(){
  if (tool === 'meter'){
    setHint(isEN() ? '📟 <b>Multimeter</b>: pick a mode (V / I / Ω / ▷| / 🔊), then click a component — or two holes for V / continuity.'
                   : '📟 <b>มัลติมิเตอร์</b>: เลือกโหมด (V / I / Ω / ▷| / 🔊) แล้วคลิกอุปกรณ์ — หรือคลิกรู 2 จุดสำหรับโหมด V / ความต่อเนื่อง');
    return;
  }
  if (tool === 'delete'){
    setHint(isEN() ? '🗑 <b>Delete</b>: click a component to remove it.'
                   : '🗑 <b>โหมดลบ</b>: คลิกอุปกรณ์ที่ต้องการลบ');
    return;
  }
  if (!tool){
    setHint(isEN() ? 'Select a component above to start placing.'
                   : 'เลือกอุปกรณ์ด้านบนเพื่อเริ่มวาง');
    return;
  }
  var lbl = TYPE_LABEL[tool][isEN() ? 'en' : 'th'];
  if (pendingHole == null){
    var p = POLAR[tool] ? (isEN() ? ' (+/anode end)' : ' (ขั้ว +/anode)') : '';
    setHint((isEN() ? 'Placing <b>' + lbl + '</b>: click the FIRST hole' : 'กำลังวาง <b>' + lbl + '</b>: คลิกรู<b>แรก</b>') + p);
  } else {
    var p2 = POLAR[tool] ? (isEN() ? ' (−/cathode end)' : ' (ขั้ว −/cathode)') : '';
    setHint((isEN() ? 'Now click the SECOND hole' : 'คลิกรู<b>ที่สอง</b>') + p2 +
            (isEN() ? ' — must be a different hole.' : ' — ต้องเป็นคนละรู'));
  }
}

function onHoleClick(id){
  if (tool === 'meter'){ meterClickHole(id); return; }
  if (tool === 'delete' || !tool) return;
  if (pendingHole == null){
    if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
    pendingHole = id;
    showHL(id);
    refreshHint();
    return;
  }
  // second click
  if (id === pendingHole){ pendingHole = null; hideHL(); refreshHint(); return; }
  if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
  placeComp(tool === 'resistor' ? resSubtype : tool, pendingHole, id);
  pendingHole = null;
  hideHL();
  refreshHint();
}

function placeComp(type, a, b){
  var c = { id:nextId++, type:type, a:a, b:b };
  if (RFAM[type]) c.value = resVal;            // resistor / vr / ntc / ptc / ldr
  if (type === 'vdr') c.vc = vdrVc;
  if (type === 'led'){ c.color = ledColor; c.vf = LED_COLORS[ledColor].vf; }
  if (type === 'diode') c.vf = DIODE_VF;
  if (type === 'battery') c.value = batteryV;
  if (type === 'switch') c.closed = true;   // starts closed (conducting)
  comps.push(c);
  occupied[a] = c.id; occupied[b] = c.id;
  rebuild();
}

function deleteComp(id){
  comps = comps.filter(function(c){
    if (c.id === id){ delete occupied[c.a]; delete occupied[c.b]; return false; }
    return true;
  });
  if (selectedId === id) selectedId = null;
  rebuild();
  renderEditor();
}

// ════════════════════════════ SELECT / EDIT ════════════════════════════
function selectComp(id){
  var c = compById(id);
  if (!c || c.type === 'wire'){ selectedId = null; rebuild(); renderEditor(); return; }
  pendingHole = null; hideHL();
  selectedId = id;
  rebuild();        // redraw highlight
  renderEditor();
}
function compById(id){ for (var i = 0; i < comps.length; i++) if (comps[i].id === id) return comps[i]; return null; }

function renderEditor(){
  var box = $('bb-editor'), c = compById(selectedId), en = isEN();
  if (!c || c.type === 'wire'){ box.style.display = 'none'; box.innerHTML = ''; return; }

  var ctrl = '';
  if (RFAM[c.type]){
    var list = R_OPTIONS[c.type] || R_OPTIONS.resistor;
    var L = (R_VAL_LABEL[c.type] || R_VAL_LABEL.resistor)[en ? 'en' : 'th'];
    ctrl = '<label>' + L + '</label><select id="bb-ed-val">' +
      list.map(function(r){ return '<option value="' + r + '"' + (r === c.value ? ' selected' : '') + '>' + rLabel(r) + '</option>'; }).join('') + '</select>';
  } else if (c.type === 'vdr'){
    ctrl = '<label>Vc</label><select id="bb-ed-vc">' +
      [4, 6, 9, 12].map(function(v){ return '<option value="' + v + '"' + (v === c.vc ? ' selected' : '') + '>' + v + ' V</option>'; }).join('') + '</select>';
  } else if (c.type === 'led'){
    ctrl = '<label>' + (en ? 'Color' : 'สี') + '</label><select id="bb-ed-color">' +
      Object.keys(LED_COLORS).map(function(k){ return '<option value="' + k + '"' + (k === c.color ? ' selected' : '') + '>' + LED_COLORS[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>';
  } else if (c.type === 'battery'){
    ctrl = '<label>' + (en ? 'Voltage' : 'แรงดัน') + '</label><input type="range" id="bb-ed-bv" min="1" max="12" step="1" value="' + c.value + '"><span class="ev" id="bb-ed-bv-out">' + c.value + ' V</span>';
  } else if (c.type === 'diode'){
    ctrl = '<span style="color:var(--text-light)">' + (en ? 'Silicon diode, Vf ≈ 0.7 V' : 'ไดโอดซิลิคอน Vf ≈ 0.7 V') + '</span>';
  } else if (c.type === 'switch'){
    ctrl = '<label>' + (en ? 'State' : 'สถานะ') + '</label><span style="font-weight:700;color:' + (c.closed ? '#16a34a' : '#94a3b8') + '">' +
           (c.closed ? (en ? 'ON (closed)' : 'ปิด (ต่อวงจร)') : (en ? 'OFF (open)' : 'เปิด (ตัดวงจร)')) + '</span>';
  }
  var polar = (c.type === 'led' || c.type === 'diode' || c.type === 'battery');
  var flip = polar ? '<button class="bb-ed-btn" id="bb-ed-flip">🔄 ' + (en ? 'Flip ±' : 'สลับขั้ว') + '</button>' : '';
  var toggle = c.type === 'switch' ? '<button class="bb-ed-btn" id="bb-ed-toggle">⎍ ' + (en ? 'Toggle' : 'เปิด/ปิด') + '</button>' : '';

  box.innerHTML =
    '<div class="bb-ed-title" id="bb-ed-title">' + edTitle(c, en) + '</div>' +
    (ctrl ? '<div class="bb-ed-row">' + ctrl + '</div>' : '') +
    '<div class="bb-ed-row bb-ed-actions">' + toggle + flip +
      '<button class="bb-ed-btn danger" id="bb-ed-del">🗑 ' + (en ? 'Delete' : 'ลบ') + '</button>' +
      '<button class="bb-ed-btn" id="bb-ed-close">✕ ' + (en ? 'Close' : 'ปิด') + '</button></div>';
  box.style.display = '';

  // wire up controls (board re-solves; only the title text refreshes, inputs stay intact)
  on('bb-ed-val', 'change', function(){ c.value = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-vc', 'change', function(){ c.vc = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-color', 'change', function(){ c.color = this.value; c.vf = LED_COLORS[this.value].vf; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-bv', 'input', function(){ c.value = +this.value; var o = $('bb-ed-bv-out'); if (o) o.textContent = c.value + ' V'; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-flip', 'click', function(){ var t = c.a; c.a = c.b; c.b = t; rebuild(); });
  on('bb-ed-toggle', 'click', function(){ c.closed = !c.closed; rebuild(); renderEditor(); });
  on('bb-ed-del', 'click', function(){ deleteComp(c.id); });
  on('bb-ed-close', 'click', function(){ selectedId = null; rebuild(); renderEditor(); });
}
function on(id, ev, fn){ var e = $(id); if (e) e.addEventListener(ev, fn); }
function edTitle(c, en){ return (en ? 'Edit: ' : 'แก้ไข: ') + compName(c, en); }
function refreshEditorTitle(c){ var t = $('bb-ed-title'); if (t) t.textContent = edTitle(c, isEN()); }

// ════════════════════════════ DRAG TO MOVE ════════════════════════════
var dragComp = null, dragGrab = null, dragMoved = false;

function svgCoords(e){
  if (!svg.createSVGPoint || !svg.getScreenCTM) return null;   // unavailable in tests
  var m = svg.getScreenCTM(); if (!m) return null;
  var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  var p = pt.matrixTransform(m.inverse());
  return { x:p.x, y:p.y };
}
function nearestHole(x, y){
  var best = null, bd = Infinity;
  for (var id in holes){ var h = holes[id], d = (h.x - x) * (h.x - x) + (h.y - y) * (h.y - y); if (d < bd){ bd = d; best = id; } }
  return best;
}
function setCompHoles(c, na, nb){
  delete occupied[c.a]; delete occupied[c.b];
  c.a = na; c.b = nb; occupied[na] = c.id; occupied[nb] = c.id;
}

function startDrag(ev, c){
  if (ev.button != null && ev.button !== 0) return;   // primary button / touch only
  ev.stopPropagation(); if (ev.preventDefault) ev.preventDefault();
  dragComp = c; dragMoved = false;
  var p = svgCoords(ev);
  dragGrab = p ? { ox: holes[c.a].x - p.x, oy: holes[c.a].y - p.y } : { ox:0, oy:0 };
}
function onPointerMove(ev){
  if (!dragComp || tool === 'delete' || tool === 'meter') return;   // meter mode never drags parts
  var p = svgCoords(ev); if (!p) return;
  var c = dragComp;
  var na = nearestHole(p.x + dragGrab.ox, p.y + dragGrab.oy);   // where endpoint a wants to be
  if (!na) return;
  var dx = holes[na].x - holes[c.a].x, dy = holes[na].y - holes[c.a].y;
  if (dx === 0 && dy === 0) return;                              // no movement
  var nb = holeAt[hkey(holes[c.b].x + dx, holes[c.b].y + dy)];   // matching hole for endpoint b
  if (!nb || nb === na) return;                                  // b lands off-grid → invalid drop
  if (occupied[na] && occupied[na] !== c.id) return;
  if (occupied[nb] && occupied[nb] !== c.id) return;
  dragMoved = true;
  setCompHoles(c, na, nb);
  selectedId = c.id;
  rebuild();
}
function onPointerUp(){
  if (!dragComp) return;
  var c = dragComp; dragComp = null;
  if (!dragMoved){                       // it was a tap, not a drag
    if (tool === 'meter') meterClickComp(c);
    else if (tool === 'delete') deleteComp(c.id);
    else if (c.type === 'switch'){ c.closed = !c.closed; selectComp(c.id); }
    else selectComp(c.id);
  } else { selectedId = c.id; renderEditor(); }
}

function showHL(id){ var h = holes[id]; hlEl.setAttribute('cx', h.x); hlEl.setAttribute('cy', h.y); hlEl.style.display = ''; }
function hideHL(){ hlEl.style.display = 'none'; }

var hintTimer = null;
function flashHint(msg){
  setHint('<b style="color:#dc2626">' + msg + '</b>');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(refreshHint, 1600);
}

// ════════════════════════════ UNION-FIND ════════════════════════════
function UF(){
  var p = {};
  return {
    add:function(x){ if (!(x in p)) p[x] = x; },
    find:function(x){ this.add(x); while (p[x] !== x){ p[x] = p[p[x]]; x = p[x]; } return x; },
    union:function(a, b){ var ra = this.find(a), rb = this.find(b); if (ra !== rb) p[ra] = rb; }
  };
}

// ════════════════════════════ LINEAR SOLVER (Gaussian elim.) ════════════════════════════
function solveLinear(A, b){
  var n = b.length, i, r, c;
  for (i = 0; i < n; i++){
    var piv = i;
    for (r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    if (Math.abs(A[piv][i]) < 1e-12) return null;
    if (piv !== i){ var tr = A[piv]; A[piv] = A[i]; A[i] = tr; var tb = b[piv]; b[piv] = b[i]; b[i] = tb; }
    var d = A[i][i];
    for (r = i + 1; r < n; r++){
      var f = A[r][i] / d; if (f === 0) continue;
      for (c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  var x = new Array(n);
  for (i = n - 1; i >= 0; i--){
    var s = b[i];
    for (c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

// ════════════════════════════ CIRCUIT SOLVER (MNA) ════════════════════════════
function solveCircuit(){
  // reset results
  comps.forEach(function(c){ c.results = { V:0, I:0, on:false }; });
  var warnings = [];
  probeCtx = { ok:false, ground:null, V:function(){ return null; }, connected:function(){ return false; } };

  var batteries = comps.filter(function(c){ return c.type === 'battery'; });
  var branches  = comps.filter(function(c){ return c.type !== 'wire' && c.type !== 'battery' && c.type !== 'switch'; });
  var wires     = comps.filter(function(c){ return c.type === 'wire'; });
  // a closed switch behaves like a jumper (0 Ω); an open one is ignored entirely
  var joins     = wires.concat(comps.filter(function(c){ return c.type === 'switch' && c.closed; }));

  // supernodes via union-find (wires/closed switches merge nodes) — built first so the
  // multimeter probe can test continuity even before a battery is added
  var uf = UF();
  comps.forEach(function(c){ uf.add(holes[c.a].node); uf.add(holes[c.b].node); });
  joins.forEach(function(c){ uf.union(holes[c.a].node, holes[c.b].node); });
  function sn(holeId){ return uf.find(holes[holeId].node); }
  probeCtx.connected = function(h1, h2){ return sn(h1) === sn(h2); };

  if (batteries.length === 0){
    return { ok:comps.length === 0, warnings:comps.length ? [{ t:'warn', th:'ยังไม่มีแหล่งจ่าย — เพิ่มแบตเตอรี่เพื่อให้กระแสไหล', en:'No power source — add a battery to make current flow' }] : [] };
  }

  // 2) ground = negative terminal supernode of first battery
  var ground = sn(batteries[0].b);

  // 3) index non-ground supernodes
  var idx = {}, N = 0, seen = {};
  comps.forEach(function(c){
    [sn(c.a), sn(c.b)].forEach(function(node){
      if (seen[node]) return; seen[node] = true;
      if (node !== ground){ idx[node] = N++; }
    });
  });
  var nV = batteries.length;
  var M = N + nV;

  function gi(node){ return node === ground ? -1 : idx[node]; }

  // 4) iterate diode/LED on/off states
  var nonlin = branches.filter(function(c){ return isNonlin(c.type); });
  nonlin.forEach(function(d){ d._on = 0; });   // 0 off, 1 forward, -1 reverse (vdr)
  var sol = null, iter, MAXIT = 80;

  for (iter = 0; iter < MAXIT; iter++){
    var A = []; for (var ri = 0; ri < M; ri++){ A.push(new Array(M).fill(0)); }
    var bv = new Array(M).fill(0);

    function stampG(i, j, g){
      if (i >= 0) A[i][i] += g;
      if (j >= 0) A[j][j] += g;
      if (i >= 0 && j >= 0){ A[i][j] -= g; A[j][i] -= g; }
    }
    function stampI(i, j, Is){ if (i >= 0) bv[i] += Is; if (j >= 0) bv[j] -= Is; }

    // Gmin to ground (numerical stability)
    for (var ni = 0; ni < N; ni++) A[ni][ni] += 1e-9;

    // resistor-family + diodes/leds/vdr
    branches.forEach(function(c){
      var i = gi(sn(c.a)), j = gi(sn(c.b));
      if (RFAM[c.type]){ stampG(i, j, 1 / effR(c)); return; }
      if (c.type === 'vdr'){   // symmetric clamp at ±Vc
        if (c._on){ var gv = 1 / VDR_RD; stampG(i, j, gv); stampI(i, j, c._on > 0 ? gv * c.vc : -gv * c.vc); }
        else { stampG(i, j, 1e-9); }
        return;
      }
      // diode / led: anode = a (i), cathode = b (j)
      var rd = c.type === 'led' ? LED_RD : DIODE_RD;
      if (c._on){ var g = 1 / rd; stampG(i, j, g); stampI(i, j, g * c.vf); }
      else { stampG(i, j, 1e-9); }
    });

    // voltage sources (batteries): a = +, b = −
    batteries.forEach(function(c, k){
      var col = N + k, p = gi(sn(c.a)), n = gi(sn(c.b));
      if (p >= 0){ A[p][col] += 1; A[col][p] += 1; }
      if (n >= 0){ A[n][col] -= 1; A[col][n] -= 1; }
      bv[col] += c.value;
    });

    sol = solveLinear(A, bv);
    if (!sol) break;

    // node voltage accessor
    var V = function(node){ return node === ground ? 0 : sol[idx[node]]; };

    // update non-linear states
    var changed = false;
    nonlin.forEach(function(c){
      var vd = V(sn(c.a)) - V(sn(c.b));   // anode − cathode (or across vdr)
      if (c.type === 'vdr'){
        if (c._on > 0){ if ((vd - c.vc) / VDR_RD < -1e-9){ c._on = 0; changed = true; } }
        else if (c._on < 0){ if ((vd + c.vc) / VDR_RD > 1e-9){ c._on = 0; changed = true; } }
        else if (vd > c.vc){ c._on = 1; changed = true; }
        else if (vd < -c.vc){ c._on = -1; changed = true; }
        return;
      }
      if (c._on){
        var I = (vd - c.vf) / (c.type === 'led' ? LED_RD : DIODE_RD);
        if (I < -1e-9){ c._on = 0; changed = true; }
      } else if (vd > c.vf){ c._on = 1; changed = true; }
    });
    if (!changed) break;
  }

  if (!sol){
    return { ok:false, warnings:[{ t:'warn', th:'วงจรไม่สมบูรณ์หรือมีการลัดวงจรแหล่งจ่าย', en:'Incomplete circuit or shorted source' }] };
  }

  var Vof = function(node){ return node === ground ? 0 : sol[idx[node]]; };

  // 5) per-component results + direction (sign: + means current a→b)
  branches.forEach(function(c){
    var va = Vof(sn(c.a)), vb = Vof(sn(c.b)), vd = va - vb, I = 0;
    if (RFAM[c.type]){ var R = effR(c); I = vd / R; c.results = { V:vd, I:I, on:Math.abs(I) > 1e-6, R:R }; return; }
    if (c.type === 'vdr'){
      I = c._on > 0 ? (vd - c.vc) / VDR_RD : c._on < 0 ? (vd + c.vc) / VDR_RD : 0;
      c.results = { V:vd, I:I, on:Math.abs(I) > 3e-4 };
      return;
    }
    var rd = c.type === 'led' ? LED_RD : DIODE_RD;
    I = c._on ? (vd - c.vf) / rd : 0;
    var lit = c._on && I > 3e-4;
    c.results = { V:vd, I:I, on:lit };
    if (c.type === 'led' && I > 0.03) warnings.push({ t:'warn', th:'กระแส LED สูงเกิน (' + fmtI(I) + ') — ในงานจริงต้องมี R จำกัดกระแส', en:'LED current too high (' + fmtI(I) + ') — add a current-limiting resistor' });
  });
  batteries.forEach(function(c, k){
    var I = sol[N + k];                 // source current
    c.results = { V:c.value, I:Math.abs(I), on:Math.abs(I) > 1e-6, _raw:I };
    if (Math.abs(I) > 0.8) warnings.push({ t:'warn', th:'กระแสจากแบตเตอรี่สูงมาก (' + fmtI(Math.abs(I)) + ') — อาจลัดวงจร!', en:'Very high battery current (' + fmtI(Math.abs(I)) + ') — possible short circuit!' });
  });
  wires.forEach(function(c){ c.results = { V:0, I:0, on:false }; });
  comps.filter(function(c){ return c.type === 'switch'; }).forEach(function(c){ c.results = { V:0, I:0, on:c.closed }; });

  // reverse-biased LED hint
  comps.filter(function(c){ return c.type === 'led'; }).forEach(function(c){
    if (!c.results.on && c.results.V < -0.3) warnings.push({ t:'warn', th:'LED ต่อกลับขั้ว — สลับขา + / − จึงจะติด', en:'LED is reverse-connected — swap its + / − legs to light it' });
  });

  // expose solved node voltages to the multimeter probe
  probeCtx.ok = true;
  probeCtx.ground = ground;
  probeCtx.V = function(holeId){
    var s = sn(holeId);
    if (s === ground) return 0;
    return (s in idx) ? sol[idx[s]] : null;   // null = floating (no current reference)
  };

  return { ok:true, warnings:warnings };
}

// ════════════════════════════ FORMAT ════════════════════════════
function fmtR(r){ return r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω'; }
function fmtI(i){ i = Math.abs(i); if (i >= 1) return i.toFixed(2) + ' A'; if (i >= 1e-3) return (i * 1e3).toFixed(1) + ' mA'; return (i * 1e6).toFixed(0) + ' µA'; }
function fmtV(v){ return v.toFixed(2) + ' V'; }

// ════════════════════════════ DRAW COMPONENTS ════════════════════════════
function rebuild(){
  // re-style hole occupancy
  for (var id in holes) holes[id].el.classList.toggle('used', !!occupied[id]);

  var res = solveCircuit();

  // draw components
  while (gComps.firstChild) gComps.removeChild(gComps.firstChild);
  comps.forEach(drawComp);

  rebuildElectrons();
  renderReadout(res);
  if (tool === 'meter'){ drawProbes(); updateMeter(); }   // keep the meter reading live
}

function drawComp(c){
  var A = holes[c.a], B = holes[c.b];
  var dx = B.x - A.x, dy = B.y - A.y;
  var len = Math.sqrt(dx * dx + dy * dy);
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var g = el('g', { transform:'translate(' + A.x + ',' + A.y + ') rotate(' + ang.toFixed(2) + ')', class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.type === 'wire'){
    if (c.id === selectedId) g.appendChild(el('line', { x1:0, y1:0, x2:len, y2:0, stroke:'#f59e0b', 'stroke-width':8, 'stroke-linecap':'round', opacity:'0.35' }));
    g.appendChild(el('line', { x1:0, y1:0, x2:len, y2:0, stroke:'#16a34a', 'stroke-width':4, 'stroke-linecap':'round' }));
    gComps.appendChild(g); return;
  }

  if (c.id === selectedId)   // highlight box behind the body (drawn for all non-wire parts)
    g.appendChild(el('rect', { x:-4, y:-16, width:len + 8, height:32, rx:6, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));

  if (c.type === 'switch'){
    var sa = (len - 24) / 2, sb = sa + 24, cl = c.closed;
    g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:sa, y2:0 }));
    g.appendChild(el('line', { class:'bb-comp-lead', x1:sb, y1:0, x2:len, y2:0 }));
    g.appendChild(el('circle', { cx:sa, cy:0, r:3, fill:'#475569' }));
    g.appendChild(el('circle', { cx:sb, cy:0, r:3, fill:'#475569' }));
    // lever: down/connected when closed, lifted when open
    g.appendChild(el('line', { x1:sa, y1:0, x2:cl ? sb : sb - 4, y2:cl ? 0 : -13, stroke:cl ? '#16a34a' : '#94a3b8', 'stroke-width':3.4, 'stroke-linecap':'round' }));
    gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -16, cl ? (isEN() ? 'ON' : 'ปิด') : (isEN() ? 'OFF' : 'เปิด'), cl ? '#16a34a' : '#94a3b8'));
    gComps.appendChild(g); return;
  }

  // leads from each hole to the body
  var bodyLen = Math.min(len * 0.5, 30), x1 = (len - bodyLen) / 2, x2 = x1 + bodyLen;
  g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:x1, y2:0 }));
  g.appendChild(el('line', { class:'bb-comp-lead', x1:x2, y1:0, x2:len, y2:0 }));

  var on = c.results && c.results.on;
  if (RFAM[c.type] || c.type === 'vdr'){
    var heat = resistorHeat(c);
    var bd = (RTYPE_STYLE[c.type] || RTYPE_STYLE.resistor).border;
    g.appendChild(el('rect', { x:x1, y:-7, width:bodyLen, height:14, rx:3, fill:heat, stroke:bd, 'stroke-width':c.type === 'resistor' ? 1 : 1.8 }));
    if (c.type !== 'resistor'){
      drawRAccent(g, c.type, x1, x2, len);
      var lab = c.type === 'vdr' ? 'VDR ' + c.vc + 'V'
                                 : c.type.toUpperCase() + ' ' + fmtRshort(c.results && c.results.R ? c.results.R : effR(c));
      gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -16, lab, bd));  // global coords — must NOT be inside the rotated group
    }
  } else if (c.type === 'battery'){
    // two-cell symbol: long line (+) near a, short line (−) near b
    var mid = len / 2;
    g.appendChild(el('line', { x1:mid - 5, y1:-11, x2:mid - 5, y2:11, stroke:'#475569', 'stroke-width':3 }));   // + long
    g.appendChild(el('line', { x1:mid + 5, y1:-6,  x2:mid + 5, y2:6,  stroke:'#475569', 'stroke-width':5 }));   // − short/thick
    gComps.appendChild(uprightText(mid, A.x, A.y, ang, -18, c.value + 'V', '#2563eb'));  // global coords — sibling of g, not child
  } else if (c.type === 'diode'){
    diodeSymbol(g, x1, x2, on ? '#1e293b' : '#94a3b8', on ? '#f59e0b' : '#94a3b8');
  } else if (c.type === 'led'){
    var col = LED_COLORS[c.color];
    if (on){
      g.appendChild(el('circle', { cx:len / 2, cy:0, r:13, fill:col.glow, opacity:'0.7', filter:'url(#bb-glow)' }));
    }
    diodeSymbol(g, x1, x2, on ? col.fill : '#cbd5e1', on ? col.fill : '#94a3b8');
    // emission arrows
    g.appendChild(el('line', { x1:len/2+2, y1:-9, x2:len/2+9, y2:-16, stroke:on?col.fill:'#cbd5e1', 'stroke-width':1.6, 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:len/2+8, y1:-5, x2:len/2+15, y2:-12, stroke:on?col.fill:'#cbd5e1', 'stroke-width':1.6, 'stroke-linecap':'round' }));
  }
  gComps.appendChild(g);
}

function diodeSymbol(g, x1, x2, triFill, barColor){
  // triangle pointing a→b (anode→cathode), bar at cathode end
  g.appendChild(el('polygon', { points:x1 + ',-8 ' + x1 + ',8 ' + x2 + ',0', fill:triFill, stroke:'#334155', 'stroke-width':1 }));
  g.appendChild(el('line', { x1:x2, y1:-9, x2:x2, y2:9, stroke:barColor, 'stroke-width':3, 'stroke-linecap':'round' }));
}

// distinctive mark for each sensor / special resistor (drawn over the body)
function drawRAccent(g, type, x1, x2, len){
  var cx = len / 2, col = '#334155';
  if (type === 'ldr'){   // two light rays pointing into the body
    g.appendChild(el('line', { x1:cx - 9, y1:-21, x2:cx - 3, y2:-12, stroke:'#ca8a04', 'stroke-width':1.8, 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:cx + 1, y1:-21, x2:cx + 7, y2:-12, stroke:'#ca8a04', 'stroke-width':1.8, 'stroke-linecap':'round' }));
    g.appendChild(el('polygon', { points:(cx - 3) + ',-12 ' + (cx - 7) + ',-13 ' + (cx - 5) + ',-17', fill:'#ca8a04' }));
    g.appendChild(el('polygon', { points:(cx + 7) + ',-12 ' + (cx + 3) + ',-13 ' + (cx + 5) + ',-17', fill:'#ca8a04' }));
    return;
  }
  if (type === 'vdr'){   // straight diagonal slash (no arrow)
    g.appendChild(el('line', { x1:x1 + 2, y1:9, x2:x2 - 2, y2:-9, stroke:col, 'stroke-width':2, 'stroke-linecap':'round' }));
    return;
  }
  if (type === 'vr'){    // wiper: diagonal arrow across the body
    g.appendChild(el('line', { x1:x1 - 3, y1:11, x2:x2 + 3, y2:-11, stroke:col, 'stroke-width':2, 'stroke-linecap':'round' }));
    g.appendChild(el('polygon', { points:(x2 + 3) + ',-11 ' + (x2 - 3) + ',-8 ' + (x2 - 2) + ',-15', fill:col }));
    return;
  }
  // ntc / ptc: thermistor symbol — oblique line with a foot (no arrowhead) + a ± sign
  g.appendChild(el('line', { x1:x1 - 2, y1:11, x2:x2 + 2, y2:-11, stroke:col, 'stroke-width':2, 'stroke-linecap':'round' }));
  g.appendChild(el('line', { x1:x1 - 2, y1:11, x2:x1 + 6, y2:11, stroke:col, 'stroke-width':2, 'stroke-linecap':'round' }));   // foot
  g.appendChild(el('line', { x1:cx - 3, y1:13, x2:cx + 3, y2:13, stroke:col, 'stroke-width':1.8, 'stroke-linecap':'round' })); // minus (both)
  if (type === 'ptc') g.appendChild(el('line', { x1:cx, y1:10, x2:cx, y2:16, stroke:col, 'stroke-width':1.8, 'stroke-linecap':'round' })); // -> plus
}

function fmtRshort(r){ r = Math.round(r); return r >= 1000 ? (Math.round(r / 100) / 10) + 'k' : r + ''; }

// place a horizontal (never upside-down) label above a rotated component
function uprightText(localX, ax, ay, angDeg, dy, s, fill){
  var a = angDeg * Math.PI / 180;
  var gx = ax + localX * Math.cos(a), gy = ay + localX * Math.sin(a) + dy;
  var t = txt(gx, gy, s, 'bb-lbl', fill);
  t.setAttribute('font-weight', '700');
  return t;
}

function resistorHeat(c){
  var p = c.results ? Math.abs(c.results.I * c.results.V) : 0;
  var t = Math.min(p / 0.25, 1);            // 0..0.25W → blue..red
  return 'hsl(' + Math.round(210 - 200 * t) + ',72%,' + Math.round(70 - 16 * t) + '%)';
}

// ════════════════════════════ ELECTRON ANIMATION ════════════════════════════
var elecDots = [];   // {el, a, b, dir, speed, f}
function rebuildElectrons(){
  while (gElec.firstChild) gElec.removeChild(gElec.firstChild);
  elecDots = [];
  comps.forEach(function(c){
    if (c.type === 'wire' || c.type === 'battery' || c.type === 'switch') return;
    if (!c.results || !c.results.on) return;
    var I = Math.abs(c.results.I);
    if (I < 1e-5) return;
    var dir = c.results.I >= 0 ? 1 : -1;   // +1: a→b
    var speed = Math.max(0.12, Math.min(0.9, I * 18));
    var n = 3;
    for (var k = 0; k < n; k++){
      var dot = el('circle', { class:'bb-elec', r:3.2, filter:'url(#bb-glow)' });
      gElec.appendChild(dot);
      elecDots.push({ el:dot, a:c.a, b:c.b, dir:dir, speed:speed, f:k / n });
    }
  });
}

var lastTs = null, rafId = null;
function tick(ts){
  if (lastTs === null) lastTs = ts;
  var dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts;
  for (var i = 0; i < elecDots.length; i++){
    var d = elecDots[i], A = holes[d.a], B = holes[d.b];
    d.f = (d.f + d.speed * dt) % 1;
    var t = d.dir > 0 ? d.f : 1 - d.f;
    d.el.setAttribute('cx', (A.x + (B.x - A.x) * t).toFixed(1));
    d.el.setAttribute('cy', (A.y + (B.y - A.y) * t).toFixed(1));
  }
  rafId = requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', function(){
  if (document.hidden){ if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; } lastTs = null; }
  else if (rafId === null) rafId = requestAnimationFrame(tick);
});

// ════════════════════════════ READOUT ════════════════════════════
function renderReadout(res){
  var en = isEN();
  var box = $('bb-readout');
  var measurable = comps.filter(function(c){ return c.type !== 'wire'; });
  if (measurable.length === 0){
    box.innerHTML = '<div class="bb-empty">' + (en ? 'No components yet — pick one above and place it.' : 'ยังไม่มีอุปกรณ์ — เลือกแล้ววางได้เลย') + '</div>';
  } else {
    var rows = '';
    measurable.forEach(function(c){
      var nm = compName(c, en), st = '';
      if (c.type === 'led'){
        var lit = c.results && c.results.on;
        st = '<span class="bb-dot" style="background:' + (lit ? LED_COLORS[c.color].fill : '#94a3b8') + '"></span>' + (lit ? (en ? 'ON' : 'ติด') : (en ? 'off' : 'ดับ'));
      } else if (c.type === 'switch'){
        st = '<span class="bb-dot" style="background:' + (c.closed ? '#16a34a' : '#94a3b8') + '"></span>' + (c.closed ? (en ? 'ON' : 'ปิด') : (en ? 'OFF' : 'เปิด'));
      }
      rows += '<tr><td class="nm">' + nm + (st ? ' ' + st : '') + '</td>' +
              '<td class="v">' + (c.results ? fmtV(Math.abs(c.results.V)) : '—') + '</td>' +
              '<td class="v">' + (c.results ? fmtI(c.results.I) : '—') + '</td></tr>';
    });
    box.innerHTML = '<table class="bb-rtbl"><thead><tr><th>' + (en ? 'Component' : 'อุปกรณ์') +
      '</th><th class="v">V</th><th class="v">I</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  var warn = $('bb-warn'), ws = (res && res.warnings) || [];
  if (ws.length){
    // de-duplicate
    var dedup = [], seen = {};
    ws.forEach(function(w){ var key = w.th; if (!seen[key]){ seen[key] = 1; dedup.push(w); } });
    warn.innerHTML = dedup.map(function(w){ return '<div class="w">⚠ ' + (en ? w.en : w.th) + '</div>'; }).join('');
  } else if (measurable.length && res && res.ok){
    var anyOn = comps.some(function(c){ return c.results && c.results.on && c.type !== 'battery'; });
    warn.innerHTML = anyOn
      ? '<div class="ok">✓ ' + (en ? 'Circuit is conducting.' : 'วงจรทำงาน มีกระแสไหล') + '</div>'
      : '<div class="ok" style="background:rgba(100,116,139,.12);color:var(--text-light)">○ ' + (en ? 'No current flowing yet — complete the loop.' : 'ยังไม่มีกระแส — ต่อวงจรให้ครบลูป') + '</div>';
  } else {
    warn.innerHTML = '';
  }
}

function compName(c, en){
  if (c.type === 'resistor') return (en ? 'Resistor ' : 'R ') + fmtR(c.value);
  if (c.type === 'vr' || c.type === 'ntc' || c.type === 'ptc' || c.type === 'ldr'){
    var R = c.results && c.results.R ? c.results.R : effR(c);
    return c.type.toUpperCase() + ' ' + fmtR(Math.round(R));
  }
  if (c.type === 'vdr') return 'VDR ' + c.vc + 'V';
  if (c.type === 'battery') return (en ? 'Battery ' : 'แบตเตอรี่ ') + c.value + 'V';
  if (c.type === 'diode') return en ? 'Diode' : 'ไดโอด';
  if (c.type === 'led') return (en ? 'LED ' : 'LED ') + LED_COLORS[c.color][en ? 'en' : 'th'];
  if (c.type === 'switch') return en ? 'Switch' : 'สวิตช์';
  return en ? 'Jumper' : 'จัมเปอร์';
}

// ════════════════════════════ MULTIMETER PROBE ════════════════════════════
function resetMeter(){
  probeRed = null; probeBlk = null; meterTargetComp = null; meterRev = false;
  if (gProbe) while (gProbe.firstChild) gProbe.removeChild(gProbe.firstChild);
}
function meterIsCompMode(){ return meterMode === 'i' || meterMode === 'r' || meterMode === 'd'; }
function setActiveMode(){
  document.querySelectorAll('.bb-mm[data-mm]').forEach(function(b){ b.classList.toggle('active', b.dataset.mm === meterMode); });
}

// click handlers (routed from onHoleClick / onPointerUp when the meter tool is armed)
function meterClickComp(c){
  if (meterIsCompMode()){
    if (meterMode === 'd') meterRev = (meterTargetComp === c.id) ? !meterRev : false;  // re-tap flips orientation
    meterTargetComp = c.id; probeRed = probeBlk = null;
  } else {                             // V / continuity → probe across the part
    probeRed = c.a; probeBlk = c.b; meterTargetComp = null;
    if (meterMode === 'cont' && probeCtx && probeCtx.connected(c.a, c.b)) beep();
  }
  drawProbes(); updateMeter();
}
function meterClickHole(id){
  if (meterIsCompMode()){
    flashHint(isEN() ? 'Click on a component to measure it.' : 'คลิกที่ตัวอุปกรณ์เพื่อวัดค่า');
    return;
  }
  meterTargetComp = null;
  if (probeRed == null) probeRed = id;
  else if (probeBlk == null && id !== probeRed){
    probeBlk = id;
    if (meterMode === 'cont' && probeCtx && probeCtx.connected(probeRed, probeBlk)) beep();
  } else { probeRed = id; probeBlk = null; }   // start a new pair
  drawProbes(); updateMeter();
}

function drawProbes(){
  if (!gProbe) return;
  while (gProbe.firstChild) gProbe.removeChild(gProbe.firstChild);
  if (tool !== 'meter') return;
  if (meterIsCompMode()){
    var c = compById(meterTargetComp);
    if (c){ markComp(c); if (meterMode === 'd' && !meterRev && c.type === 'led') ledTestGlow(c); }
    return;
  }
  if (probeRed != null) probeMark(probeRed, '#ef4444', '+');
  if (probeBlk != null) probeMark(probeBlk, '#1e293b', '−');
}
// a real diode-tester pushes ~1 mA, lighting an LED faintly even with the circuit unpowered
function ledTestGlow(c){
  var A = holes[c.a], B = holes[c.b]; if (!A || !B) return;
  var mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  gProbe.appendChild(el('circle', { cx:mx, cy:my, r:10, fill:LED_COLORS[c.color].glow, opacity:'0.6', filter:'url(#bb-glow)' }));
}
function probeMark(holeId, color, sign){
  var h = holes[holeId]; if (!h) return;
  gProbe.appendChild(el('circle', { cx:h.x, cy:h.y, r:R_HOLE + 3, fill:'none', stroke:color, 'stroke-width':3 }));
  gProbe.appendChild(el('circle', { cx:h.x, cy:h.y, r:2.6, fill:color }));
  var t = txt(h.x, h.y - R_HOLE - 9, sign, 'bb-lbl', color);
  t.setAttribute('font-weight', '800'); t.setAttribute('font-size', '14');
  gProbe.appendChild(t);
}
function markComp(c){
  var A = holes[c.a], B = holes[c.b]; if (!A || !B) return;
  gProbe.appendChild(el('line', { x1:A.x, y1:A.y, x2:B.x, y2:B.y, stroke:'#7c3aed', 'stroke-width':7, 'stroke-linecap':'round', opacity:'0.25' }));
  [A, B].forEach(function(h){ gProbe.appendChild(el('circle', { cx:h.x, cy:h.y, r:R_HOLE + 3, fill:'none', stroke:'#7c3aed', 'stroke-width':3 })); });
}

function lcd(big, unit, muted){
  var d = $('bb-meter-read'); if (!d) return;
  d.classList.toggle('muted', !!muted);
  d.innerHTML = unit ? (big + ' <span class="u">' + unit + '</span>') : big;
}
function updateMeter(){
  if (tool !== 'meter') return;
  setActiveMode();
  var en = isEN(), tip = $('bb-meter-tip');
  function P(th, e){ return en ? e : th; }
  function setTip(th, e){ if (tip) tip.textContent = P(th, e); }

  if (meterMode === 'v'){
    setTip('คลิกอุปกรณ์เพื่อวัดคร่อม หรือคลิกรู 2 จุด (แดง→ดำ)', 'Click a part to read across it, or two holes (red→black)');
    if (probeRed == null) return lcd(P('แตะโพรบจุดแรก', 'Probe 1st point'), '', true);
    if (probeBlk == null) return lcd(P('แตะโพรบจุดที่สอง', 'Probe 2nd point'), '', true);
    if (!probeCtx) return lcd('—', '', true);
    var va = probeCtx.V(probeRed), vb = probeCtx.V(probeBlk);
    if (va == null || vb == null) return lcd(P('จุดลอย (ไม่มีอ้างอิง)', 'Floating node'), '', true);
    var d = va - vb;
    return lcd((d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2), 'V');
  }
  if (meterMode === 'cont'){
    setTip('คลิก 2 รู (หรืออุปกรณ์) เพื่อเช็คว่าต่อถึงกันไหม', 'Click two holes (or a part) to test continuity');
    if (probeRed == null || probeBlk == null) return lcd(P('แตะโพรบ 2 จุด', 'Probe two points'), '', true);
    var con = probeCtx && probeCtx.connected(probeRed, probeBlk);
    var dd = $('bb-meter-read'); dd.classList.remove('muted');
    dd.innerHTML = con ? '<span style="color:#34d399">🔊 ' + P('ต่อถึงกัน', 'Connected') + '</span>'
                       : '<span style="color:#f87171">○ ' + P('เปิดวงจร', 'Open') + '</span>';
    return;
  }
  // I / Ω / diode modes operate on a single component
  var c = compById(meterTargetComp);
  if (meterMode === 'd'){
    setTip('คลิกไดโอด/LED เพื่ออ่าน Vf — คลิกซ้ำ = กลับขั้ว (OL)', 'Click a diode/LED to read Vf — click again to reverse (OL)');
    if (!c) return lcd(P('คลิกไดโอด/LED', 'Tap a diode/LED'), '', true);
    if (c.type === 'diode' || c.type === 'led'){
      if (meterRev) return lcd('OL', P('กลับขั้ว', 'reversed'));   // reverse-biased → open
      var vf = c.type === 'led' ? LED_COLORS[c.color].vf : (c.vf || DIODE_VF);
      return lcd(vf.toFixed(2), 'V');
    }
    if (c.type === 'wire') return lcd('≈ 0.00', 'V');               // short → ~0 V drop
    if (c.type === 'switch') return lcd(c.closed ? '≈ 0.00' : 'OL', c.closed ? 'V' : P('เปิด', 'open'));
    return lcd(P('ใช้กับไดโอด/LED', 'Use on a diode/LED'), '', true);
  }
  if (meterMode === 'i'){
    setTip('คลิกอุปกรณ์เพื่อวัดกระแสที่ไหลผ่าน', 'Click a part to read the current through it');
    if (!c) return lcd(P('คลิกอุปกรณ์', 'Tap a part'), '', true);
    if (c.type === 'wire' || c.type === 'switch') return lcd(P('ผ่านตัวนำ ≈ 0', 'through conductor'), '', true);
    return lcd(fmtI(c.results ? c.results.I : 0), '');
  }
  // resistance
  setTip('คลิกอุปกรณ์เพื่อวัดความต้านทาน (จริงต้องตัดไฟก่อนวัด)', 'Click a part to read resistance (real ohmmeters need power off)');
  if (!c) return lcd(P('คลิกอุปกรณ์', 'Tap a part'), '', true);
  if (RFAM[c.type]) return lcd(fmtR(Math.round(effR(c))), '');
  if (c.type === 'switch') return lcd(c.closed ? '≈ 0' : '∞', 'Ω');
  if (c.type === 'wire') return lcd('≈ 0', 'Ω');
  if (c.type === 'vdr') return lcd(P('ไม่เชิงเส้น', 'non-linear'), '', true);
  if (c.type === 'diode' || c.type === 'led') return lcd(P('รอยต่อ PN', 'PN junction'), '', true);
  return lcd('—', '', true);
}

function beep(){
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!actx) actx = new AC();
    var o = actx.createOscillator(), g = actx.createGain();
    o.frequency.value = 2000; o.connect(g); g.connect(actx.destination);
    g.gain.setValueAtTime(0.05, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.15);
    o.start(); o.stop(actx.currentTime + 0.16);
  } catch (e) {}
}

// ════════════════════════════ TOOLBAR / CONTROLS ════════════════════════════
var VALROWS = ['battery','resistor','led','diode','wire','switch','meter'];
function selectTool(t){
  // toggle off if same
  tool = (tool === t) ? null : t;
  pendingHole = null; hideHL();
  document.querySelectorAll('.bb-tool[data-tool]').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  // value control visibility
  VALROWS.forEach(function(v){ $('bb-val-' + v).classList.toggle('show', tool === v); });
  $('bb-val-none').classList.toggle('show', !tool || tool === 'delete');
  if (tool === 'resistor') updateResControls();
  if (tool === 'meter'){ selectedId = null; renderEditor(); resetMeter(); setActiveMode(); updateMeter(); }
  else resetMeter();
  refreshHint();
}

// repopulate the value dropdown with the standard list for the current subtype
function populateResVals(){
  var list = R_OPTIONS[resSubtype] || R_OPTIONS.resistor;
  if (list.indexOf(resVal) < 0) resVal = R_DEFAULT[resSubtype] || list[0];
  var sel = $('bb-res-val');
  sel.innerHTML = list.map(function(r){
    return '<option value="' + r + '"' + (r === resVal ? ' selected' : '') + '>' + rLabel(r) + '</option>';
  }).join('');
  sel.value = resVal;
  var L = R_VAL_LABEL[resSubtype] || R_VAL_LABEL.resistor;
  $('bb-res-val-lbl').innerHTML = '<span class="th-only">' + L.th + '</span><span class="en-only">' + L.en + '</span>';
}

// show/hide value vs clamp-voltage controls depending on the chosen resistor subtype
function updateResControls(){
  var isVdr = resSubtype === 'vdr';
  if (!isVdr) populateResVals();
  $('bb-res-vc-wrap').style.display = isVdr ? '' : 'none';
  $('bb-res-val-lbl').style.display = isVdr ? 'none' : '';
  $('bb-res-val').style.display = isVdr ? 'none' : '';
  var hints = {
    resistor:{ th:'', en:'' },
    vr:{ th:'ปรับด้วยลูกบิด VR ในแผงสภาพแวดล้อม', en:'Adjust with the VR knob in the Environment panel' },
    ntc:{ th:'R ลดเมื่ออุณหภูมิเพิ่ม', en:'R drops as temperature rises' },
    ptc:{ th:'R เพิ่มเมื่ออุณหภูมิเพิ่ม', en:'R rises as temperature rises' },
    ldr:{ th:'ค่า R = ความต้านทานตอนสว่างเต็มที่ (มืด = R สูงขึ้น)', en:'R value = resistance in full light (dark = higher R)' },
    vdr:{ th:'ต้านทานสูงจน V ถึง Vc แล้วนำกระแส (กันไฟกระชาก)', en:'High R until V reaches Vc, then conducts (surge clamp)' }
  };
  var h = hints[resSubtype] || hints.resistor;
  $('bb-res-hint').textContent = isEN() ? h.en : h.th;
}

function initControls(){
  document.querySelectorAll('.bb-tool[data-tool]').forEach(function(btn){
    btn.addEventListener('click', function(){ selectTool(btn.dataset.tool); });
  });
  $('bb-clear').addEventListener('click', function(){
    comps = []; occupied = {}; pendingHole = null; selectedId = null; hideHL(); resetMeter(); rebuild(); renderEditor();
  });
  // multimeter mode buttons
  document.querySelectorAll('.bb-mm[data-mm]').forEach(function(btn){
    btn.addEventListener('click', function(){ meterMode = btn.dataset.mm; resetMeter(); setActiveMode(); updateMeter(); });
  });
  $('bb-example').addEventListener('click', loadExample);
  $('bb-batt-v').addEventListener('input', function(){
    batteryV = +this.value; $('bb-batt-v-out').textContent = batteryV + ' V';
    comps.forEach(function(c){ if (c.type === 'battery') c.value = batteryV; }); rebuild();
  });
  // these selectors set the value for the NEXT component placed — they do NOT
  // retroactively change parts already on the board (each part keeps its own value)
  $('bb-res-type').addEventListener('change', function(){
    resSubtype = this.value; updateResControls();
  });
  $('bb-res-val').addEventListener('change', function(){ resVal = +this.value; });
  $('bb-res-vc').addEventListener('change', function(){ vdrVc = +this.value; });
  $('bb-led-color').addEventListener('change', function(){ ledColor = this.value; });
  // environment sliders (affect all sensors)
  $('bb-temp').addEventListener('input', function(){ env.temp = +this.value; $('bb-temp-out').textContent = env.temp + ' °C'; rebuild(); });
  $('bb-light').addEventListener('input', function(){ env.light = +this.value; $('bb-light-out').textContent = env.light + ' %'; rebuild(); });
  $('bb-vrpos').addEventListener('input', function(){ env.vrPos = +this.value; $('bb-vrpos-out').textContent = env.vrPos + ' %'; rebuild(); });
  // drag-to-move: track pointer at the document level so fast drags don't slip off
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  // cancel pending placement with Escape
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && pendingHole != null){ pendingHole = null; hideHL(); refreshHint(); } });
  // re-render text on language change
  document.addEventListener('langchange', function(){ refreshHint(); rebuild(); renderEditor(); });
}

// ════════════════════════════ EXAMPLE: battery → R → LED loop ════════════════════════════
function loadExample(){
  comps = []; occupied = {}; pendingHole = null; selectedId = null; hideHL(); resetMeter(); renderEditor();
  batteryV = 9; $('bb-batt-v').value = 9; $('bb-batt-v-out').textContent = '9 V';
  resVal = 330; $('bb-res-val').value = '330';
  ledColor = 'red'; $('bb-led-color').value = 'red';
  // battery: top+ rail(col2) → top− rail(col2)   (define rails)
  place('battery', 'TP2', 'TN2', { value:9 });
  // jumper: + rail → column 5 top
  place('wire', 'TP8', 'ta5', {});
  // resistor: col5 top → col9 top
  place('resistor', 'tb5', 'ta9', { value:330 });
  // LED: col9 top (anode) → col13 top (cathode)
  place('led', 'tb9', 'ta13', { color:'red', vf:1.8 });
  // jumper: col13 top → − rail
  place('wire', 'tb13', 'TN8', {});
  rebuild();
}
function place(type, a, b, props){
  var c = { id:nextId++, type:type, a:a, b:b };
  for (var k in props) c[k] = props[k];
  comps.push(c); occupied[a] = c.id; occupied[b] = c.id;
}

// ════════════════════════════ INIT ════════════════════════════
buildBoard();
initControls();
selectTool(null);
rebuild();
rafId = requestAnimationFrame(tick);
})();
