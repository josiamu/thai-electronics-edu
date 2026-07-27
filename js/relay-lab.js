/* relay-lab.js — Relay Control Lab: แผงฝึกวงจรควบคุมรีเลย์ OMRON MY4 (24VDC)
 *
 * เฟส 1+2: แผง SVG + แหล่งจ่าย 24VDC + สวิตช์ + ไฟแสดง + MY4 (4PDT, 14 ขา) + สายจัมเปอร์
 *
 * โครงไฟล์:
 *   ส่วน ENGINE เป็น pure JS (ไม่มี DOM) — ทดสอบใน Node ได้โดยตัดไฟล์ถึงบรรทัด END ENGINE
 *   ส่วน UI อยู่ใน IIFE ท้ายไฟล์
 *
 * โมเดล MY4 (ตามผังขาจริง):
 *   คอยล์ = ขา 13-14 (~650Ω) — ดึงเข้าเมื่อ |Vcoil| ≥ 16.8V, ปล่อยเมื่อ < 2.4V (hysteresis latch แบบเดียวกับรีเลย์ใน breadboard.js)
 *   หน้าสัมผัสชุดที่ n (n=1..4): COM = ขา 8+n, NC = ขา n, NO = ขา 4+n  → (9-1-5, 10-2-6, 11-3-7, 12-4-8)
 *   หน้าสัมผัสทั้ง 4 ชุดสลับพร้อมกัน — สลับสถานะ "ภายในลูป nonlinear" (ห้ามใช้ union-find กับหน้าสัมผัส)
 *
 * เอนจิน: nodal analysis DC — ทุกจุดต่อเป็นโหนด, สายจัมเปอร์/สวิตช์ปิด/หน้าสัมผัสปิด = conductance สูง (1mΩ)
 *   จึงคำนวณกระแส "รายเส้น" ได้ (ใช้ทำ animation จุดกระแสวิ่ง) — ไม่ merge โหนด
 *   แหล่งจ่าย = Norton (24V + R ภายใน 0.05Ω) → ลัดวงจรไม่ทำให้เมทริกซ์พัง แค่กระแสพุ่ง → ขึ้นเตือน
 *   ทุกโหนดมี leak 1e-9 S ลงกราวด์ → โหนดลอยไม่ทำให้ singular
 */

/* ===== ENGINE (pure — no DOM) ===== */

var RLY = {
  VSUP: 24,          // แรงดันแหล่งจ่าย (VDC)
  R_INT: 0.05,       // ความต้านทานภายในแหล่งจ่าย (Ω)
  G_WIRE: 1e3,       // สายจัมเปอร์ = 1 mΩ
  G_ON: 1e3,         // สวิตช์/หน้าสัมผัสปิด = 1 mΩ
  G_OFF: 1e-9,       // สวิตช์/หน้าสัมผัสเปิด
  G_LEAK: 1e-9,      // leak ทุกโหนดลงกราวด์ (กัน singular)
  R_COIL: 650,       // คอยล์ MY4 24VDC ≈ 650Ω (I ≈ 36.9mA)
  VPULL: 16.8,       // แรงดันดึงเข้า (~70% ของ 24V)
  VDROP: 2.4,        // แรงดันปล่อย (~10%)
  R_LAMP: 1200,      // ไฟแสดง 24V ≈ 20mA เต็มสว่าง
  LAMP_IFULL: 0.02,  // กระแสที่ถือว่าสว่างเต็ม
  SHORT_I: 2,        // กระแสแหล่งจ่ายเกินนี้ = ลัดวงจร (A)
  MAXIT: 25          // รอบสูงสุดของลูปสลับหน้าสัมผัส
};

/* รายชื่อขา (pin) ของอุปกรณ์แต่ละชนิด */
function rlyPins(c){
  if (c.t === 'supply') return ['+', '-'];
  if (c.t === 'relay'){ var a = []; for (var i = 1; i <= 14; i++) a.push(String(i)); return a; }
  return ['a', 'b']; // switch, lamp
}

/* Gaussian elimination + partial pivoting (in-place บน A,B) */
function rlyGauss(A, B){
  var n = B.length, i, j, k;
  for (k = 0; k < n; k++){
    var mx = k;
    for (i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[mx][k])) mx = i;
    if (mx !== k){
      var tr = A[k]; A[k] = A[mx]; A[mx] = tr;
      var tb = B[k]; B[k] = B[mx]; B[mx] = tb;
    }
    var p = A[k][k] || 1e-30;
    for (i = k + 1; i < n; i++){
      var f = A[i][k] / p;
      if (f === 0) continue;
      for (j = k; j < n; j++) A[i][j] -= f * A[k][j];
      B[i] -= f * B[k];
    }
  }
  var X = new Float64Array(n);
  for (i = n - 1; i >= 0; i--){
    var s = B[i];
    for (j = i + 1; j < n; j++) s -= A[i][j] * X[j];
    X[i] = s / (A[i][i] || 1e-30);
  }
  return X;
}

/* แก้วงจรทั้งแผง
 *   comps    : [{id:'SUP',t:'supply'}, {id:'K1',t:'relay',_en:bool}, {id:'S1',t:'switch',on:bool}, {id:'L1',t:'lamp'}]
 *   wireKeys : [{a:'SUP:+', b:'K1:13'}, ...]  (node key = 'compId:pin')
 * คืน {shorted, unstable, isrc, volt(key), wires:[I ทิศ a→b], comps:{id:{...}}}
 * ผลข้างเคียง: commit สถานะ latch ลง c._en ของรีเลย์ทุกตัว
 */
function solveRelayLab(comps, wireKeys){
  var idx = {}, nNodes = 0;
  function nid(key){
    if (key === 'SUP:-') return -1; // กราวด์อ้างอิง = ขั้ว 0V
    if (!(key in idx)){ idx[key] = nNodes; nNodes++; }
    return idx[key];
  }
  comps.forEach(function(c){ rlyPins(c).forEach(function(p){ nid(c.id + ':' + p); }); });

  var n = nNodes;
  var relays = comps.filter(function(c){ return c.t === 'relay'; });
  var tent = relays.map(function(c){ return !!c._en; });
  var V = new Float64Array(n), stable = false, iter;

  for (iter = 0; iter < RLY.MAXIT; iter++){
    var A = [], B = new Float64Array(n), i;
    for (i = 0; i < n; i++){ A.push(new Float64Array(n)); A[i][i] = RLY.G_LEAK; }
    function addG(a, b, g){
      if (a >= 0){ A[a][a] += g; if (b >= 0){ A[a][b] -= g; A[b][a] -= g; } }
      if (b >= 0) A[b][b] += g;
    }
    // แหล่งจ่าย (Norton): G ภายในจาก + ลงกราวด์ + อัดกระแส V·G เข้าโหนด +
    var gint = 1 / RLY.R_INT, pP = idx['SUP:+'];
    addG(pP, -1, gint);
    B[pP] += RLY.VSUP * gint;
    // สายจัมเปอร์
    wireKeys.forEach(function(w){ addG(nid(w.a), nid(w.b), RLY.G_WIRE); });
    // อุปกรณ์
    comps.forEach(function(c){
      function k(p){ return nid(c.id + ':' + p); }
      if (c.t === 'switch'){
        addG(k('a'), k('b'), c.on ? RLY.G_ON : RLY.G_OFF);
      } else if (c.t === 'lamp'){
        addG(k('a'), k('b'), 1 / RLY.R_LAMP);
      } else if (c.t === 'relay'){
        var en = tent[relays.indexOf(c)];
        addG(k('13'), k('14'), 1 / RLY.R_COIL);
        for (var s = 1; s <= 4; s++){
          addG(k(String(8 + s)), k(String(s)),     en ? RLY.G_OFF : RLY.G_ON); // COM–NC
          addG(k(String(8 + s)), k(String(4 + s)), en ? RLY.G_ON  : RLY.G_OFF); // COM–NO
        }
      }
    });
    V = rlyGauss(A, B);
    // อัปเดต latch ด้วย hysteresis — ถ้ามีตัวไหนเปลี่ยน ต้องวนแก้ใหม่
    var changed = false;
    relays.forEach(function(c, ri){
      var vc = Math.abs(V[idx[c.id + ':13']] - V[idx[c.id + ':14']]);
      var want = tent[ri] ? (vc >= RLY.VDROP) : (vc >= RLY.VPULL);
      if (want !== tent[ri]){ tent[ri] = want; changed = true; }
    });
    if (!changed){ stable = true; break; }
  }
  relays.forEach(function(c, ri){ c._en = tent[ri]; });

  function volt(key){
    if (key === 'SUP:-') return 0;
    var i2 = idx[key];
    return i2 === undefined ? 0 : V[i2];
  }
  var isrc = (RLY.VSUP - volt('SUP:+')) / RLY.R_INT;
  var out = {
    shorted: Math.abs(isrc) > RLY.SHORT_I,
    unstable: !stable,
    isrc: isrc,
    volt: volt,
    wires: [],
    comps: {}
  };
  wireKeys.forEach(function(w){ out.wires.push(RLY.G_WIRE * (volt(w.a) - volt(w.b))); });
  comps.forEach(function(c){
    function vp(p){ return volt(c.id + ':' + p); }
    if (c.t === 'switch'){
      out.comps[c.id] = { i: (c.on ? RLY.G_ON : RLY.G_OFF) * (vp('a') - vp('b')) };
    } else if (c.t === 'lamp'){
      var il = (vp('a') - vp('b')) / RLY.R_LAMP;
      out.comps[c.id] = { i: il, bright: Math.min(1, Math.abs(il) / RLY.LAMP_IFULL) };
    } else if (c.t === 'relay'){
      var vc2 = vp('13') - vp('14');
      var r = { vcoil: vc2, icoil: vc2 / RLY.R_COIL, en: c._en, sets: [] };
      for (var s2 = 1; s2 <= 4; s2++){
        r.sets.push({
          inc: (c._en ? RLY.G_OFF : RLY.G_ON) * (vp(String(8 + s2)) - vp(String(s2))),
          ino: (c._en ? RLY.G_ON : RLY.G_OFF) * (vp(String(8 + s2)) - vp(String(4 + s2)))
        });
      }
      out.comps[c.id] = r;
    }
  });
  return out;
}

/* ===== END ENGINE ===== */

/* ===== UI ===== */
(function(){
  'use strict';
  if (typeof document === 'undefined') return;
  var svg = document.getElementById('rly-svg');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var hintEl = document.getElementById('rly-hint');

  /* ---- layout ---- */
  var VBH = 620;
  var SUP_Y = 30, SUP_H = 58;
  var RSLOT = { y: 108, h: 248, w: 225, x0: 30, gap: 245, max: 4 };
  var BSLOT = { y: 384, h: 185, w: 110, x0: 30, gap: 120, max: 8 };
  var LAMP_COLORS = { red: '#ef4444', green: '#22c55e', yellow: '#eab308' };
  var WIRE_COLORS = { red: '#ef4444', black: '#556070', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', orange: '#f97316' };

  /* ---- state ---- */
  var SUPC = { id: 'SUP', t: 'supply' };
  var comps = [];            // อุปกรณ์ที่ผู้ใช้วาง (ไม่รวม SUP)
  var wires = [];            // {a:tid, b:tid, color}
  var relaySlots = [null, null, null, null];
  var botSlots = [null, null, null, null, null, null, null, null];
  var nextK = 1, nextS = 1, nextL = 1;
  var mode = 'normal';       // normal | wire | delete
  var pendingTid = null;
  var lastRes = null;
  var termPos = {}, termEls = {};

  /* terminal id → node key (จุด + ของแหล่งจ่าย 4 จุด = โหนดเดียวกัน) */
  function keyOf(tid){
    if (tid.indexOf('SUP:+') === 0) return 'SUP:+';
    if (tid.indexOf('SUP:-') === 0) return 'SUP:-';
    return tid;
  }

  /* ---- svg helpers ---- */
  function el(tag, attrs, parent){
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(x, y, str, cls, anchor, parent, size){
    var e = el('text', { x: x, y: y, 'class': cls || 'rly-txt', 'text-anchor': anchor || 'middle' }, parent);
    if (size) e.setAttribute('font-size', size);
    e.textContent = str;
    return e;
  }
  function biTxt(x, y, th, en, cls, anchor, parent, size){
    txt(x, y, th, (cls || 'rly-txt') + ' th-only', anchor, parent, size);
    txt(x, y, en, (cls || 'rly-txt') + ' en-only', anchor, parent, size);
  }

  /* ---- layers ---- */
  var defs = el('defs', {}, svg);
  var flt = el('filter', { id: 'rlyGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, defs);
  el('feGaussianBlur', { stdDeviation: 6 }, flt);
  var gGhost = el('g', {}, svg);
  var gWire = el('g', {}, svg);
  var gComp = el('g', {}, svg);
  var gDot = el('g', { 'pointer-events': 'none' }, svg);

  /* ---- hint ---- */
  function hint(th, en, warn){
    hintEl.className = warn ? 'rly-hint rly-hint-warn' : 'rly-hint';
    hintEl.innerHTML = '<span class="th-only"></span><span class="en-only"></span>';
    hintEl.children[0].textContent = th;
    hintEl.children[1].textContent = en;
  }
  function defaultHint(){
    if (lastRes && lastRes.shorted){
      hint('⚠ ลัดวงจร! กระแสจากแหล่งจ่ายพุ่งสูงมาก — ตรวจดูว่ามีสายลัดจาก +24V ไป 0V โดยไม่ผ่านโหลดหรือไม่',
           '⚠ Short circuit! Supply current is huge — check for a path from +24V to 0V with no load in between', true);
      return;
    }
    if (lastRes && lastRes.unstable){
      hint('⚠ รีเลย์แกว่ง (chatter) — วงจรป้อนกลับตัดคอยล์ตัวเอง ลองตรวจการต่อหน้าสัมผัส',
           '⚠ Relay chatter — a feedback loop is cutting its own coil; check the contact wiring', true);
      return;
    }
    if (mode === 'wire'){
      if (pendingTid) hint('คลิกจุดต่อ ● จุดที่สองเพื่อจบสาย (คลิกจุดเดิม/Esc = ยกเลิก)', 'Click a second terminal ● to finish the wire (same dot/Esc = cancel)');
      else hint('โหมดเดินสาย: คลิกจุดต่อ ● สองจุดเพื่อลากสายจัมเปอร์ (Esc ออก)', 'Wiring mode: click two terminals ● to run a jumper (Esc to exit)');
    } else if (mode === 'delete'){
      hint('โหมดลบ: คลิกสายหรืออุปกรณ์ที่ต้องการลบ', 'Delete mode: click a wire or component to remove it');
    } else {
      hint('เพิ่มอุปกรณ์จากปุ่มด้านบน • คลิกสวิตช์เพื่อเปิด/ปิด • กด "เดินสาย" แล้วคลิกจุดต่อ ● สองจุด',
           'Add parts with the buttons above • click a switch to toggle it • press "Wire" then click two terminals ●');
    }
  }

  /* ---- terminals ---- */
  function addTerm(tid, x, y, parent, pinLabel){
    termPos[tid] = { x: x, y: y };
    var c = el('circle', { cx: x, cy: y, r: 7, 'class': 'rly-term', 'data-tid': tid }, parent);
    termEls[tid] = c;
    c.addEventListener('click', function(ev){ ev.stopPropagation(); onTermClick(tid); });
    if (pinLabel !== undefined) txt(x, y + 17, pinLabel, 'rly-pin', 'middle', parent);
    return c;
  }
  function onTermClick(tid){
    if (mode === 'wire'){
      if (!pendingTid){
        pendingTid = tid;
        termEls[tid].classList.add('pending');
      } else if (pendingTid === tid){
        termEls[tid].classList.remove('pending');
        pendingTid = null;
      } else {
        wires.push({ a: pendingTid, b: tid, color: document.getElementById('rly-wire-color').value, _off: 0 });
        pendingTid = null;
        renderAll();
      }
      defaultHint();
    } else if (mode === 'delete'){
      hint('คลิกที่ "เส้นสาย" เพื่อลบสาย หรือคลิกตัวอุปกรณ์เพื่อลบอุปกรณ์', 'Click the wire itself to delete it, or the component body to delete the part');
    } else {
      hint('กดปุ่ม "🖊 เดินสาย" ก่อน แล้วค่อยคลิกจุดต่อ', 'Press "🖊 Wire" first, then click terminals');
    }
  }

  /* ---- draw: supply ---- */
  function drawSupply(){
    var g = el('g', {}, gComp);
    var warn = lastRes && lastRes.shorted;
    el('rect', { x: 40, y: SUP_Y, width: 390, height: SUP_H, rx: 10, 'class': 'rly-body' + (warn ? ' rly-warnbox' : '') , id: 'rly-supbox-p'}, g);
    el('rect', { x: 560, y: SUP_Y, width: 390, height: SUP_H, rx: 10, 'class': 'rly-body' + (warn ? ' rly-warnbox' : ''), id: 'rly-supbox-n' }, g);
    txt(75, SUP_Y + 36, '+24V', 'rly-txt rly-sup-p', 'middle', g, 15);
    txt(595, SUP_Y + 36, '0V', 'rly-txt rly-sup-n', 'middle', g, 15);
    biTxt(235, SUP_Y - 8, 'แหล่งจ่ายไฟ 24VDC', '24VDC power supply', 'rly-pin', 'middle', g, 10);
    var i;
    for (i = 0; i < 4; i++) addTerm('SUP:+' + i, 150 + i * 70, SUP_Y + 34, g);
    for (i = 0; i < 4; i++) addTerm('SUP:-' + i, 640 + i * 70, SUP_Y + 34, g);
  }

  /* ---- draw: MY4 relay ---- */
  function relayColX(x0){ return [x0 + 58, x0 + 103, x0 + 148, x0 + 193]; }
  function drawRelay(c){
    var x0 = RSLOT.x0 + c.slot * RSLOT.gap, y0 = RSLOT.y;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: RSLOT.w, height: RSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    // body window
    var body = el('rect', { x: x0 + 6, y: y0 + 4, width: RSLOT.w - 12, height: 96, rx: 7, 'class': 'rly-body rly-clickable' }, g);
    txt(x0 + 78, y0 + 24, 'MY4 — ' + c.id, 'rly-txt rly-bold', 'middle', g, 13);
    // indicator LED (สถานะเริ่มต้นตาม _dispA — กัน re-render แล้วภาพค้าง)
    c._indGlow = el('circle', { cx: x0 + 196, cy: y0 + 20, r: 9, fill: '#f97316', filter: 'url(#rlyGlow)', opacity: (c._dispA * 0.8).toFixed(3) }, g);
    c._indEl = el('circle', { cx: x0 + 196, cy: y0 + 20, r: 5.5, 'class': 'rly-ind' + (c._dispA > 0.5 ? ' on' : '') }, g);
    // 4 armature glyphs (SPDT เอียงซ้าย=NC / ขวา=NO)
    var cols = relayColX(x0), topY = y0 + 62, pivY = y0 + 90;
    c._glyphs = [];
    for (var i = 0; i < 4; i++){
      var cx = cols[i];
      el('circle', { cx: cx - 11, cy: topY, r: 2.5, 'class': 'rly-gdot' }, g);
      el('circle', { cx: cx + 11, cy: topY, r: 2.5, 'class': 'rly-gdot' }, g);
      el('circle', { cx: cx, cy: pivY, r: 2.5, 'class': 'rly-gdot' }, g);
      var ln = el('line', { x1: cx, y1: pivY, x2: cx + (c._dispA * 2 - 1) * 11, y2: topY + 3, 'class': 'rly-arm' }, g);
      c._glyphs.push({ ln: ln, cx: cx, topY: topY + 3 });
      if (i === 0){
        txt(cx - 11, topY - 7, 'NC', 'rly-pin', 'middle', g);
        txt(cx + 11, topY - 7, 'NO', 'rly-pin', 'middle', g);
      }
    }
    // terminal rows: NC(1-4) / NO(5-8) / COM(9-12)
    var rows = [
      { lbl: 'NC',  y: y0 + 126, base: 0 },
      { lbl: 'NO',  y: y0 + 160, base: 4 },
      { lbl: 'COM', y: y0 + 194, base: 8 }
    ];
    rows.forEach(function(r){
      txt(x0 + 30, r.y + 4, r.lbl, 'rly-pin rly-bold', 'end', g);
      for (var j = 1; j <= 4; j++){
        addTerm(c.id + ':' + (r.base + j), cols[j - 1], r.y, g, String(r.base + j));
      }
    });
    // coil 13-14
    var coilY = y0 + 230;
    txt(x0 + 30, coilY + 4, 'Coil', 'rly-pin rly-bold', 'end', g);
    addTerm(c.id + ':13', x0 + 85, coilY, g, '13');
    addTerm(c.id + ':14', x0 + 140, coilY, g, '14');
    var p = 'M ' + (x0 + 94) + ' ' + coilY;
    for (var a = 0; a < 4; a++) p += ' a 5 6 0 0 1 10 0';
    el('path', { d: p, 'class': 'rly-coilsym' }, g);
    body.addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
  }

  /* ---- draw: switch ---- */
  function drawSwitch(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    c._bodyEl = el('rect', { x: x0 + 23, y: y0 + 32, width: 64, height: 34, rx: 17, 'class': 'rly-swbody rly-clickable' }, g);
    c._knob = el('circle', { cx: x0 + 70, cy: y0 + 49, r: 12, 'class': 'rly-swknob', 'pointer-events': 'none' }, g);
    c._stateTx = txt(x0 + 55, y0 + 84, 'OFF', 'rly-pin rly-bold', 'middle', g, 10);
    el('path', { d: 'M ' + (x0 + 40) + ' ' + (y0 + 66) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (x0 + 70) + ' ' + (y0 + 66) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
    addTerm(c.id + ':a', x0 + 35, y0 + 140, g);
    addTerm(c.id + ':b', x0 + 75, y0 + 140, g);
    c._bodyEl.addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
  }

  /* ---- draw: lamp ---- */
  function drawLamp(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var col = LAMP_COLORS[c.color] || LAMP_COLORS.red;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    c._glowEl = el('circle', { cx: x0 + 55, cy: y0 + 62, r: 26, fill: col, filter: 'url(#rlyGlow)', opacity: 0 }, g);
    el('circle', { cx: x0 + 55, cy: y0 + 62, r: 24, 'class': 'rly-lampring rly-clickable', stroke: col }, g)
      .addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
    c._innerEl = el('circle', { cx: x0 + 55, cy: y0 + 62, r: 17, fill: col, opacity: 0.18, 'pointer-events': 'none' }, g);
    el('path', { d: 'M ' + (x0 + 44) + ' ' + (y0 + 83) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (x0 + 66) + ' ' + (y0 + 83) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
    addTerm(c.id + ':a', x0 + 35, y0 + 140, g);
    addTerm(c.id + ':b', x0 + 75, y0 + 140, g);
  }

  /* ---- ghost slots ---- */
  function drawGhosts(){
    var i;
    for (i = 0; i < RSLOT.max; i++){
      if (relaySlots[i]) continue;
      var x0 = RSLOT.x0 + i * RSLOT.gap;
      var r = el('rect', { x: x0, y: RSLOT.y, width: RSLOT.w, height: RSLOT.h, rx: 10, 'class': 'rly-ghost' }, gGhost);
      txt(x0 + RSLOT.w / 2, RSLOT.y + RSLOT.h / 2, '＋ MY4', 'rly-ghosttxt', 'middle', gGhost, 15);
      r.addEventListener('click', function(){ addRelay(); });
    }
    for (i = 0; i < BSLOT.max; i++){
      if (botSlots[i]) continue;
      var x1 = BSLOT.x0 + i * BSLOT.gap;
      el('rect', { x: x1, y: BSLOT.y, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-ghost', 'pointer-events': 'none' }, gGhost);
    }
  }

  /* ---- draw: wires ---- */
  function wirePath(a, b, i){
    var p1 = termPos[a], p2 = termPos[b];
    if (!p1 || !p2) return null;
    var dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    var sag = Math.min(110, 26 + dist * 0.10) + (i % 3) * 13;
    sag = Math.min(sag, VBH - 16 - Math.max(p1.y, p2.y));
    if (sag < 12) sag = 12;
    return 'M ' + p1.x + ' ' + p1.y +
           ' C ' + p1.x + ' ' + (p1.y + sag) + ', ' + p2.x + ' ' + (p2.y + sag) + ', ' + p2.x + ' ' + p2.y;
  }
  function drawWires(){
    wires.forEach(function(w, i){
      var d = wirePath(w.a, w.b, i);
      if (!d) return;
      var g = el('g', {}, gWire);
      w._pathEl = el('path', { d: d, 'class': 'rly-wire', stroke: WIRE_COLORS[w.color] || '#888' }, g);
      var hit = el('path', { d: d, 'class': 'rly-wirehit' }, g);
      w._len = w._pathEl.getTotalLength();
      w._dotEls = [];
      hit.addEventListener('click', function(ev){
        ev.stopPropagation();
        if (mode === 'delete'){ wires.splice(wires.indexOf(w), 1); renderAll(); }
      });
    });
  }

  /* ---- component interactions ---- */
  function fmtmA(a){ return (Math.abs(a) * 1000).toFixed(1) + ' mA'; }
  function onCompClick(c){
    if (mode === 'delete'){ removeComp(c); return; }
    if (mode === 'wire'){
      hint('คลิกที่จุดต่อ ● (จุดกลมๆ) ไม่ใช่ตัวอุปกรณ์', 'Click a terminal ● (the round dots), not the component body');
      return;
    }
    if (c.t === 'switch'){
      c.on = !c.on;
      requestSolve();
      return;
    }
    if (!lastRes) return;
    var r = lastRes.comps[c.id];
    if (c.t === 'lamp' && r){
      hint(c.id + ': กระแส ' + fmtmA(r.i) + (r.bright > 0.05 ? ' — ติด' : ' — ดับ'),
           c.id + ': current ' + fmtmA(r.i) + (r.bright > 0.05 ? ' — lit' : ' — off'));
    } else if (c.t === 'relay' && r){
      hint(c.id + ': คอยล์ ' + Math.abs(r.vcoil).toFixed(1) + 'V (' + fmtmA(r.icoil) + ') — ' +
             (r.en ? 'ทำงาน: COM ต่อกับ NO' : 'ไม่ทำงาน: COM ต่อกับ NC'),
           c.id + ': coil ' + Math.abs(r.vcoil).toFixed(1) + 'V (' + fmtmA(r.icoil) + ') — ' +
             (r.en ? 'energized: COM → NO' : 'released: COM → NC'));
    }
  }
  function removeComp(c){
    if (c.t === 'relay') relaySlots[c.slot] = null; else botSlots[c.slot] = null;
    comps.splice(comps.indexOf(c), 1);
    wires = wires.filter(function(w){
      return w.a.indexOf(c.id + ':') !== 0 && w.b.indexOf(c.id + ':') !== 0;
    });
    renderAll();
  }

  /* ---- add components ---- */
  function freeSlot(arr){ for (var i = 0; i < arr.length; i++) if (!arr[i]) return i; return -1; }
  function addRelay(){
    var s = freeSlot(relaySlots);
    if (s < 0){ hint('ช่องรีเลย์เต็มแล้ว (สูงสุด 4 ตัว)', 'Relay row is full (max 4)', true); return; }
    var c = { id: 'K' + (nextK++), t: 'relay', slot: s, _en: false, _dispA: 0 };
    relaySlots[s] = c; comps.push(c); renderAll();
  }
  function addSwitch(){
    var s = freeSlot(botSlots);
    if (s < 0){ hint('แถวล่างเต็มแล้ว (สูงสุด 8 ชิ้น)', 'Bottom row is full (max 8)', true); return; }
    var c = { id: 'S' + (nextS++), t: 'switch', slot: s, on: false };
    botSlots[s] = c; comps.push(c); renderAll();
  }
  function addLamp(color){
    var s = freeSlot(botSlots);
    if (s < 0){ hint('แถวล่างเต็มแล้ว (สูงสุด 8 ชิ้น)', 'Bottom row is full (max 8)', true); return; }
    var c = { id: 'L' + (nextL++), t: 'lamp', slot: s, color: color };
    botSlots[s] = c; comps.push(c); renderAll();
  }

  /* ---- solve + visuals ---- */
  function requestSolve(){
    var prevEn = comps.filter(function(c){ return c.t === 'relay'; }).map(function(c){ return !!c._en; });
    lastRes = solveRelayLab([SUPC].concat(comps), wires.map(function(w){ return { a: keyOf(w.a), b: keyOf(w.b) }; }));
    wires.forEach(function(w, i){ w._i = lastRes.wires[i]; });
    var rels = comps.filter(function(c){ return c.t === 'relay'; });
    for (var i = 0; i < rels.length; i++){
      if (prevEn[i] !== rels[i]._en){ clickSnd(); break; }
    }
    updateVisuals();
    defaultHint();
  }
  function updateVisuals(){
    comps.forEach(function(c){
      var r = lastRes && lastRes.comps[c.id];
      if (c.t === 'lamp' && c._glowEl && r){
        c._glowEl.setAttribute('opacity', (r.bright * 0.85).toFixed(3));
        c._innerEl.setAttribute('opacity', (0.18 + r.bright * 0.82).toFixed(3));
      } else if (c.t === 'switch' && c._bodyEl){
        c._bodyEl.setAttribute('class', 'rly-swbody rly-clickable' + (c.on ? ' on' : ''));
        var bx = parseFloat(c._bodyEl.getAttribute('x'));
        c._knob.setAttribute('cx', c.on ? bx + 17 : bx + 47);
        c._stateTx.textContent = c.on ? 'ON' : 'OFF';
      }
    });
    var pb = document.getElementById('rly-supbox-p'), nb = document.getElementById('rly-supbox-n');
    var cls = 'rly-body' + (lastRes && lastRes.shorted ? ' rly-warnbox' : '');
    if (pb) pb.setAttribute('class', cls);
    if (nb) nb.setAttribute('class', cls);
  }

  /* ---- full re-render ---- */
  function renderAll(){
    gGhost.innerHTML = ''; gWire.innerHTML = ''; gComp.innerHTML = ''; gDot.innerHTML = '';
    termPos = {}; termEls = {}; pendingTid = null;
    drawSupply();
    comps.forEach(function(c){
      if (c.t === 'relay') drawRelay(c);
      else if (c.t === 'switch') drawSwitch(c);
      else if (c.t === 'lamp') drawLamp(c);
    });
    drawGhosts();
    drawWires();
    requestSolve();
  }

  /* ---- sound ---- */
  var AC = null;
  function clickSnd(){
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      var t = AC.currentTime;
      var o = AC.createOscillator(), gn = AC.createGain();
      o.type = 'square'; o.frequency.value = 2400;
      gn.gain.setValueAtTime(0.06, t);
      gn.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
      o.connect(gn); gn.connect(AC.destination);
      o.start(t); o.stop(t + 0.06);
    } catch (e){}
  }

  /* ---- animation loop ---- */
  var lastT = 0;
  function frame(ts){
    var dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
    lastT = ts;
    // armature + indicator lerp
    comps.forEach(function(c){
      if (c.t !== 'relay' || !c._glyphs) return;
      var tgt = c._en ? 1 : 0;
      if (c._dispA !== tgt){
        var d = tgt - c._dispA, step = 10 * dt;
        c._dispA = Math.abs(d) <= step ? tgt : c._dispA + Math.sign(d) * step;
        c._glyphs.forEach(function(gl){
          gl.ln.setAttribute('x2', gl.cx + (c._dispA * 2 - 1) * 11);
          gl.ln.setAttribute('y2', gl.topY);
        });
        c._indGlow.setAttribute('opacity', (c._dispA * 0.8).toFixed(3));
        c._indEl.setAttribute('class', 'rly-ind' + (c._dispA > 0.5 ? ' on' : ''));
      }
    });
    // current dots
    gDot.innerHTML = '';
    wires.forEach(function(w){
      if (!w._pathEl || !w._i || Math.abs(w._i) < 5e-4) return;
      var speed = Math.min(260, Math.max(40, Math.abs(w._i) * 6000));
      w._off = ((w._off || 0) + Math.sign(w._i) * speed * dt) % w._len;
      if (w._off < 0) w._off += w._len;
      var count = Math.max(1, Math.round(w._len / 80));
      for (var k = 0; k < count; k++){
        var pt = w._pathEl.getPointAtLength((w._off + k * w._len / count) % w._len);
        el('circle', { cx: pt.x, cy: pt.y, r: 3.2, 'class': 'rly-dot' }, gDot);
      }
    });
    requestAnimationFrame(frame);
  }

  /* ---- example circuit: NC/NO สลับไฟเขียว↔แดง ---- */
  function loadExample(){
    comps = []; wires = [];
    relaySlots = [null, null, null, null];
    botSlots = [null, null, null, null, null, null, null, null];
    nextK = 1; nextS = 1; nextL = 1;
    var K1 = { id: 'K' + (nextK++), t: 'relay', slot: 0, _en: false, _dispA: 0 };
    var S1 = { id: 'S' + (nextS++), t: 'switch', slot: 0, on: false };
    var L1 = { id: 'L' + (nextL++), t: 'lamp', slot: 1, color: 'red' };
    var L2 = { id: 'L' + (nextL++), t: 'lamp', slot: 2, color: 'green' };
    relaySlots[0] = K1; botSlots[0] = S1; botSlots[1] = L1; botSlots[2] = L2;
    comps = [K1, S1, L1, L2];
    wires = [
      { a: 'SUP:+0', b: 'S1:a',  color: 'red' },
      { a: 'S1:b',   b: 'K1:13', color: 'orange' },
      { a: 'K1:14',  b: 'SUP:-0', color: 'black' },
      { a: 'SUP:+1', b: 'K1:9',  color: 'red' },
      { a: 'K1:5',   b: 'L1:a',  color: 'blue' },
      { a: 'L1:b',   b: 'SUP:-1', color: 'black' },
      { a: 'K1:1',   b: 'L2:a',  color: 'green' },
      { a: 'L2:b',   b: 'SUP:-2', color: 'black' }
    ];
    setMode('normal');
    renderAll();
    hint('ตัวอย่าง: เปิดสวิตช์ S1 → K1 ทำงาน → ไฟย้ายจากเขียว (NC ขา 1) ไปแดง (NO ขา 5) — ลองคลิกสวิตช์ดู!',
         'Example: turn S1 on → K1 energizes → the light moves from green (NC pin 1) to red (NO pin 5) — try the switch!');
  }

  function clearAll(){
    comps = []; wires = [];
    relaySlots = [null, null, null, null];
    botSlots = [null, null, null, null, null, null, null, null];
    nextK = 1; nextS = 1; nextL = 1;
    setMode('normal');
    renderAll();
  }

  /* ---- toolbar ---- */
  function setMode(m){
    mode = m;
    if (pendingTid && termEls[pendingTid]) termEls[pendingTid].classList.remove('pending');
    pendingTid = null;
    document.getElementById('rly-wire-btn').classList.toggle('active', m === 'wire');
    document.getElementById('rly-del-btn').classList.toggle('active', m === 'delete');
    svg.setAttribute('class', m === 'wire' ? 'rly-mode-wire' : m === 'delete' ? 'rly-mode-del' : '');
    defaultHint();
  }
  document.getElementById('rly-add-relay').addEventListener('click', function(){ setMode('normal'); addRelay(); });
  document.getElementById('rly-add-switch').addEventListener('click', function(){ setMode('normal'); addSwitch(); });
  document.getElementById('rly-add-lamp').addEventListener('click', function(){
    setMode('normal'); addLamp(document.getElementById('rly-lamp-color').value);
  });
  document.getElementById('rly-wire-btn').addEventListener('click', function(){ setMode(mode === 'wire' ? 'normal' : 'wire'); });
  document.getElementById('rly-del-btn').addEventListener('click', function(){ setMode(mode === 'delete' ? 'normal' : 'delete'); });
  document.getElementById('rly-example-btn').addEventListener('click', loadExample);
  document.getElementById('rly-clear-btn').addEventListener('click', clearAll);
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape'){
      if (pendingTid){ if (termEls[pendingTid]) termEls[pendingTid].classList.remove('pending'); pendingTid = null; defaultHint(); }
      else if (mode !== 'normal') setMode('normal');
    }
  });

  /* ---- init ---- */
  loadExample();
  requestAnimationFrame(frame);
})();
