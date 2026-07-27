/* relay-lab.js — Relay Control Lab: แผงฝึกวงจรควบคุมรีเลย์ OMRON MY4 (24VDC)
 *
 * เฟส 1+2: แผง SVG + แหล่งจ่าย 24VDC + สวิตช์ + ไฟแสดง + MY4 (4PDT, 14 ขา) + สายจัมเปอร์
 * เฟส 3: ปุ่มกด momentary NO/NC (c.pressed) + บัซเซอร์ (WebAudio เสียงต่อเนื่อง)
 * เฟส 4: เมนูตัวอย่าง 6 วงจร (EX[] → build()+ladder) — พื้นฐาน/self-holding/interlock/AND-OR/สลับไฟ/บัซเซอร์แจ้งเตือน
 * เฟส 5: มุมมองแผนภาพ (ladder) — สลับ "แผงจริง ↔ แผนภาพ", ไฮไลต์เส้น/หน้าสัมผัสที่มีไฟตามผลจริง (เฉพาะวงจรตัวอย่าง)
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
  R_BUZZ: 480,       // บัซเซอร์ 24V ≈ 50mA
  BUZZ_VON: 12,      // แรงดันคร่อมบัซเซอร์ที่ถือว่าดัง (V)
  SHORT_I: 2,        // กระแสแหล่งจ่ายเกินนี้ = ลัดวงจร (A)
  MAXIT: 25          // รอบสูงสุดของลูปสลับหน้าสัมผัส
};

/* ปุ่มกดปิดวงจรหรือไม่: NO นำเมื่อกด, NC นำเมื่อไม่กด */
function rlyBtnClosed(c){ return c.tt === 'nc' ? !c.pressed : !!c.pressed; }

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
      } else if (c.t === 'button'){
        addG(k('a'), k('b'), rlyBtnClosed(c) ? RLY.G_ON : RLY.G_OFF);
      } else if (c.t === 'lamp'){
        addG(k('a'), k('b'), 1 / RLY.R_LAMP);
      } else if (c.t === 'buzzer'){
        addG(k('a'), k('b'), 1 / RLY.R_BUZZ);
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
    } else if (c.t === 'button'){
      out.comps[c.id] = { i: (rlyBtnClosed(c) ? RLY.G_ON : RLY.G_OFF) * (vp('a') - vp('b')), closed: rlyBtnClosed(c) };
    } else if (c.t === 'lamp'){
      var il = (vp('a') - vp('b')) / RLY.R_LAMP;
      out.comps[c.id] = { i: il, bright: Math.min(1, Math.abs(il) / RLY.LAMP_IFULL) };
    } else if (c.t === 'buzzer'){
      var ib = (vp('a') - vp('b')) / RLY.R_BUZZ;
      out.comps[c.id] = { i: ib, on: Math.abs(vp('a') - vp('b')) >= RLY.BUZZ_VON };
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
  var LIVE = '#f97316', DEAD = '#94a3b8';

  /* ---- state ---- */
  var SUPC = { id: 'SUP', t: 'supply' };
  var comps = [];            // อุปกรณ์ที่ผู้ใช้วาง (ไม่รวม SUP)
  var wires = [];            // {a:tid, b:tid, color}
  var relaySlots = [null, null, null, null];
  var botSlots = [null, null, null, null, null, null, null, null];
  var nextK = 1, nextS = 1, nextL = 1, nextB = 1, nextZ = 1;
  var mode = 'normal';       // normal | wire | delete
  var pendingTid = null;
  var lastRes = null;
  var termPos = {}, termEls = {};
  var curExample = null;     // id ตัวอย่างปัจจุบัน (null = ผู้ใช้แก้เอง → แผนภาพไม่พร้อม)
  var view = 'panel';        // panel | schematic

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
  // ลำดับเลเยอร์ (ล่าง→บน): โครงช่องว่าง → ตัวอุปกรณ์ → สาย (หน้าอุปกรณ์) → จุดต่อ+เลขขา → จุดกระแส
  var gGhost = el('g', {}, svg);
  var gComp = el('g', {}, svg);
  var gWire = el('g', {}, svg);
  var gTerm = el('g', {}, svg);
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

  /* ---- terminals (วาดในเลเยอร์บนสุด gTerm เสมอ → อยู่หน้าสายตลอด) ---- */
  function addTerm(tid, x, y, parent, pinLabel){
    termPos[tid] = { x: x, y: y };
    if (pinLabel !== undefined){
      // แผ่นรองเลขขา + ตัวเลข (พื้นทึบกันสายบัง)
      el('circle', { cx: x, cy: y + 17, r: 7.5, 'class': 'rly-pinbg' }, gTerm);
      txt(x, y + 20, pinLabel, 'rly-pin', 'middle', gTerm);
    }
    var c = el('circle', { cx: x, cy: y, r: 7, 'class': 'rly-term', 'data-tid': tid }, gTerm);
    termEls[tid] = c;
    c.addEventListener('click', function(ev){ ev.stopPropagation(); onTermClick(tid); });
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
        curExample = null;
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

  /* ---- draw: push button (momentary NO/NC) ---- */
  function drawButton(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var isNC = c.tt === 'nc';
    var capCol = isNC ? '#ef4444' : '#22c55e';
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    txt(x0 + 55, y0 + 100, isNC ? 'NC · STOP' : 'NO · START', 'rly-pin rly-bold', 'middle', g, 9);
    // ปลอกปุ่ม + หัวกด
    el('circle', { cx: x0 + 55, cy: y0 + 58, r: 27, 'class': 'rly-btn-collar' }, g);
    c._capEl = el('circle', { cx: x0 + 55, cy: y0 + 58, r: 21, 'class': 'rly-btn-cap rly-clickable', fill: capCol }, g);
    c._capEl.style.stroke = capCol;
    el('path', { d: 'M ' + (x0 + 44) + ' ' + (y0 + 79) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (x0 + 66) + ' ' + (y0 + 79) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
    addTerm(c.id + ':a', x0 + 35, y0 + 140, g);
    addTerm(c.id + ':b', x0 + 75, y0 + 140, g);
    function press(ev){ ev.preventDefault(); ev.stopPropagation(); if (mode !== 'normal'){ onCompClick(c); return; } if (!c.pressed){ c.pressed = true; c._capEl.classList.add('down'); requestSolve(); } }
    function release(){ if (c.pressed){ c.pressed = false; if (c._capEl) c._capEl.classList.remove('down'); requestSolve(); } }
    c._capEl.addEventListener('pointerdown', press);
    c._capEl.addEventListener('pointerup', release);
    c._capEl.addEventListener('pointerleave', release);
    c._capEl.addEventListener('pointercancel', release);
  }

  /* ---- draw: buzzer ---- */
  function drawBuzzer(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    c._glowEl = el('circle', { cx: x0 + 55, cy: y0 + 60, r: 24, fill: '#fbbf24', filter: 'url(#rlyGlow)', opacity: 0 }, g);
    el('circle', { cx: x0 + 55, cy: y0 + 60, r: 22, 'class': 'rly-buzz rly-clickable' }, g)
      .addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
    txt(x0 + 55, y0 + 66, '🔔', 'rly-txt', 'middle', g, 20);
    c._waveEl = el('g', { opacity: 0 }, g);
    el('path', { d: 'M ' + (x0 + 82) + ' ' + (y0 + 50) + ' q 8 10 0 20', 'class': 'rly-buzzwave' }, c._waveEl);
    el('path', { d: 'M ' + (x0 + 88) + ' ' + (y0 + 45) + ' q 12 15 0 30', 'class': 'rly-buzzwave' }, c._waveEl);
    el('path', { d: 'M ' + (x0 + 44) + ' ' + (y0 + 82) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (x0 + 66) + ' ' + (y0 + 82) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
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
    // สายออกจากจุดต่อแนวดิ่งสั้นๆ แล้วโค้งเนียนไปอีกจุด — ห้อยน้อยลง อ่านง่ายขึ้น
    var sag = Math.min(46, 16 + dist * 0.05) + (i % 4) * 6;
    sag = Math.min(sag, VBH - 14 - Math.max(p1.y, p2.y));
    if (sag < 10) sag = 10;
    return 'M ' + p1.x + ' ' + p1.y +
           ' C ' + p1.x + ' ' + (p1.y + sag) + ', ' + p2.x + ' ' + (p2.y + sag) + ', ' + p2.x + ' ' + p2.y;
  }
  function drawWires(){
    wires.forEach(function(w, i){
      var d = wirePath(w.a, w.b, i);
      if (!d) return;
      var g = el('g', {}, gWire);
      el('path', { d: d, 'class': 'rly-wirehalo' }, g);                                   // ขอบสีพื้น (ฮาโล) ให้สายเด่นเหนืออุปกรณ์
      w._pathEl = el('path', { d: d, 'class': 'rly-wire', stroke: WIRE_COLORS[w.color] || '#888' }, g);
      // จุดปลายสาย (eyelet) ช่วยให้เห็นว่าสายเสียบที่จุดไหน
      var p1 = termPos[w.a], p2 = termPos[w.b], col = WIRE_COLORS[w.color] || '#888';
      el('circle', { cx: p1.x, cy: p1.y, r: 4, fill: col, 'class': 'rly-wire-end' }, g);
      el('circle', { cx: p2.x, cy: p2.y, r: 4, fill: col, 'class': 'rly-wire-end' }, g);
      var hit = el('path', { d: d, 'class': 'rly-wirehit' }, g);
      w._len = w._pathEl.getTotalLength();
      w._dotEls = [];
      hit.addEventListener('click', function(ev){
        ev.stopPropagation();
        if (mode === 'delete'){ wires.splice(wires.indexOf(w), 1); curExample = null; renderAll(); }
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
    curExample = null;
    if (c.t === 'relay') relaySlots[c.slot] = null; else botSlots[c.slot] = null;
    comps.splice(comps.indexOf(c), 1);
    wires = wires.filter(function(w){
      return w.a.indexOf(c.id + ':') !== 0 && w.b.indexOf(c.id + ':') !== 0;
    });
    renderAll();
  }

  /* ---- add components ---- */
  function freeSlot(arr){ for (var i = 0; i < arr.length; i++) if (!arr[i]) return i; return -1; }
  function botFull(){ hint('แถวล่างเต็มแล้ว (สูงสุด 8 ชิ้น)', 'Bottom row is full (max 8)', true); }
  function addRelay(){
    var s = freeSlot(relaySlots);
    if (s < 0){ hint('ช่องรีเลย์เต็มแล้ว (สูงสุด 4 ตัว)', 'Relay row is full (max 4)', true); return; }
    curExample = null;
    var c = { id: 'K' + (nextK++), t: 'relay', slot: s, _en: false, _dispA: 0 };
    relaySlots[s] = c; comps.push(c); renderAll();
  }
  function addSwitch(){
    var s = freeSlot(botSlots);
    if (s < 0){ botFull(); return; }
    curExample = null;
    var c = { id: 'S' + (nextS++), t: 'switch', slot: s, on: false };
    botSlots[s] = c; comps.push(c); renderAll();
  }
  function addButton(tt){
    var s = freeSlot(botSlots);
    if (s < 0){ botFull(); return; }
    curExample = null;
    var c = { id: 'B' + (nextB++), t: 'button', tt: tt, slot: s, pressed: false };
    botSlots[s] = c; comps.push(c); renderAll();
  }
  function addLamp(color){
    var s = freeSlot(botSlots);
    if (s < 0){ botFull(); return; }
    curExample = null;
    var c = { id: 'L' + (nextL++), t: 'lamp', slot: s, color: color };
    botSlots[s] = c; comps.push(c); renderAll();
  }
  function addBuzzer(){
    var s = freeSlot(botSlots);
    if (s < 0){ botFull(); return; }
    curExample = null;
    var c = { id: 'Z' + (nextZ++), t: 'buzzer', slot: s };
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
    var anyBuzz = false;
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
      } else if (c.t === 'buzzer' && c._glowEl){
        var on = r && r.on;
        if (on) anyBuzz = true;
        c._glowEl.setAttribute('opacity', on ? 0.8 : 0);
        c._waveEl.setAttribute('opacity', on ? 1 : 0);
      }
    });
    buzzSound(anyBuzz);
    var pb = document.getElementById('rly-supbox-p'), nb = document.getElementById('rly-supbox-n');
    var cls = 'rly-body' + (lastRes && lastRes.shorted ? ' rly-warnbox' : '');
    if (pb) pb.setAttribute('class', cls);
    if (nb) nb.setAttribute('class', cls);
    if (view === 'schematic') drawSchematic();
  }

  /* ---- full re-render ---- */
  function renderAll(){
    gGhost.innerHTML = ''; gWire.innerHTML = ''; gComp.innerHTML = ''; gTerm.innerHTML = ''; gDot.innerHTML = '';
    termPos = {}; termEls = {}; pendingTid = null;
    drawSupply();
    comps.forEach(function(c){
      if (c.t === 'relay') drawRelay(c);
      else if (c.t === 'switch') drawSwitch(c);
      else if (c.t === 'lamp') drawLamp(c);
      else if (c.t === 'button') drawButton(c);
      else if (c.t === 'buzzer') drawBuzzer(c);
    });
    drawGhosts();
    drawWires();
    requestSolve();
  }

  /* ---- sound ---- */
  var AC = null;
  function actx(){
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    return AC;
  }
  function clickSnd(){
    try {
      var ac = actx(), t = ac.currentTime;
      var o = ac.createOscillator(), gn = ac.createGain();
      o.type = 'square'; o.frequency.value = 2400;
      gn.gain.setValueAtTime(0.06, t);
      gn.gain.exponentialRampToValueAtTime(0.0008, t + 0.05);
      o.connect(gn); gn.connect(ac.destination);
      o.start(t); o.stop(t + 0.06);
    } catch (e){}
  }
  var buzzOsc = null, buzzGain = null;
  function buzzSound(on){
    try {
      if (on){
        var ac = actx();
        if (!buzzOsc){
          buzzOsc = ac.createOscillator(); buzzGain = ac.createGain();
          buzzOsc.type = 'square'; buzzOsc.frequency.value = 660;
          buzzGain.gain.value = 0;
          buzzOsc.connect(buzzGain); buzzGain.connect(ac.destination);
          buzzOsc.start();
        }
        buzzGain.gain.setTargetAtTime(0.05, ac.currentTime, 0.01);
      } else if (buzzGain){
        buzzGain.gain.setTargetAtTime(0, AC.currentTime, 0.01);
      }
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
    // buzzer wave pulse
    comps.forEach(function(c){
      if (c.t === 'buzzer' && c._waveEl && parseFloat(c._waveEl.getAttribute('opacity')) > 0){
        c._waveEl.setAttribute('opacity', (0.55 + 0.45 * Math.abs(Math.sin(ts / 90))).toFixed(2));
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

  /* ---- example builders ---- */
  function resetBoard(){
    comps = []; wires = [];
    relaySlots = [null, null, null, null];
    botSlots = [null, null, null, null, null, null, null, null];
    nextK = 1; nextS = 1; nextL = 1; nextB = 1; nextZ = 1;
  }
  function mkRelay(slot){ var c = { id: 'K' + (nextK++), t: 'relay', slot: slot, _en: false, _dispA: 0 }; relaySlots[slot] = c; comps.push(c); return c.id; }
  function mkSwitch(slot){ var c = { id: 'S' + (nextS++), t: 'switch', slot: slot, on: false }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkButton(slot, tt){ var c = { id: 'B' + (nextB++), t: 'button', tt: tt, slot: slot, pressed: false }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkLamp(slot, color){ var c = { id: 'L' + (nextL++), t: 'lamp', slot: slot, color: color }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkBuzz(slot){ var c = { id: 'Z' + (nextZ++), t: 'buzzer', slot: slot }; botSlots[slot] = c; comps.push(c); return c.id; }
  function W(a, b, color){ wires.push({ a: a, b: b, color: color, _off: 0 }); }

  /* หน้าสัมผัสชุด n: COM=8+n, NO=4+n, NC=n */
  var EX = [
    { id: 'basic',
      th: 'พื้นฐาน: สวิตช์ → คอยล์ → ไฟติดที่ NO',
      en: 'Basic: switch → coil → lamp on NO contact',
      hintTh: 'เปิดสวิตช์ S1 → คอยล์ K1 ได้ไฟ → หน้าสัมผัส NO (9→5) ต่อ → ไฟแดงติด',
      hintEn: 'Turn S1 on → K1 coil energizes → NO contact (9→5) closes → red lamp lights',
      build: function(){
        var K1 = mkRelay(0), S1 = mkSwitch(0), L1 = mkLamp(1, 'red');
        W('SUP:+0', S1 + ':a', 'red'); W(S1 + ':b', K1 + ':13', 'orange'); W(K1 + ':14', 'SUP:-0', 'black');
        W('SUP:+1', K1 + ':9', 'red'); W(K1 + ':5', L1 + ':a', 'blue'); W(L1 + ':b', 'SUP:-1', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'red' } }
      ]; } },

    { id: 'latch',
      th: 'วงจรล็อกตัวเอง START/STOP (self-holding)',
      en: 'Self-holding START/STOP circuit',
      hintTh: 'กดปุ่มเขียว START ค้างแล้วปล่อย → K1 ล็อกตัวเองผ่านหน้าสัมผัส NO (seal-in) → ไฟติดค้าง • กดปุ่มแดง STOP เพื่อตัด',
      hintEn: 'Tap green START → K1 seals itself in through its own NO contact → stays on • press red STOP to drop it',
      build: function(){
        var K1 = mkRelay(0), Bs = mkButton(0, 'no'), Bp = mkButton(1, 'nc'), L1 = mkLamp(2, 'green');
        // เส้นคอยล์: SUP+ → STOP(NC) → node → START(NO) → coil13 ; seal-in: node → COM1(9), NO1(5) → coil13
        W('SUP:+0', Bp + ':a', 'red'); W(Bp + ':b', Bs + ':a', 'orange');
        W(Bs + ':b', K1 + ':13', 'orange'); W(K1 + ':14', 'SUP:-0', 'black');
        W(Bp + ':b', K1 + ':9', 'blue'); W(K1 + ':5', K1 + ':13', 'blue');       // seal-in NO1 ขนานกับ START
        // ไฟ RUN: SUP+ → COM2(10), NO2(6) → L1
        W('SUP:+1', K1 + ':10', 'red'); W(K1 + ':6', L1 + ':a', 'green'); W(L1 + ':b', 'SUP:-1', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'nc', c: 'B2', lbl: 'STOP' }, { k: 'no', c: 'B1', lbl: 'START', par: { k: 'no', c: 'K1', lbl: 'K1' } }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'green' } }
      ]; } },

    { id: 'interlock',
      th: 'อินเตอร์ล็อก: รีเลย์ 2 ตัวห้ามทำงานพร้อมกัน',
      en: 'Interlock: two relays can never be on together',
      hintTh: 'เปิด S1 → K1 ทำงาน แล้วล็อกไม่ให้ K2 ทำงาน (ผ่าน NC ไขว้กัน) • ตัวไหนมาก่อนได้ก่อน',
      hintEn: 'Turn S1 → K1 wins and blocks K2 via cross-wired NC contacts • first one latches out the other',
      build: function(){
        var K1 = mkRelay(0), K2 = mkRelay(1), S1 = mkSwitch(0), S2 = mkSwitch(1), L1 = mkLamp(2, 'red'), L2 = mkLamp(3, 'green');
        // K1 coil ผ่าน NC ของ K2
        W('SUP:+0', S1 + ':a', 'red'); W(S1 + ':b', K2 + ':9', 'orange'); W(K2 + ':1', K1 + ':13', 'orange'); W(K1 + ':14', 'SUP:-0', 'black');
        // K2 coil ผ่าน NC ของ K1
        W('SUP:+1', S2 + ':a', 'red'); W(S2 + ':b', K1 + ':9', 'blue'); W(K1 + ':1', K2 + ':13', 'blue'); W(K2 + ':14', 'SUP:-1', 'black');
        // ไฟบอกสถานะ
        W('SUP:+2', K1 + ':10', 'red'); W(K1 + ':6', L1 + ':a', 'red'); W(L1 + ':b', 'SUP:-2', 'black');
        W('SUP:+3', K2 + ':10', 'green'); W(K2 + ':6', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-3', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'nc', c: 'K2', lbl: 'K2' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'S2', lbl: 'S2' }, { k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'coil', c: 'K2' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'red' } },
        { el: [{ k: 'no', c: 'K2', lbl: 'K2' }], load: { t: 'lamp', c: 'L2', color: 'green' } }
      ]; } },

    { id: 'andor',
      th: 'ลอจิก AND / OR ด้วยหน้าสัมผัส',
      en: 'AND / OR logic with contacts',
      hintTh: 'AND: ต้องเปิด S1 และ S2 ทั้งคู่ไฟแดงจึงติด • OR: เปิด S3 หรือ S4 ตัวใดตัวหนึ่งไฟเขียวก็ติด',
      hintEn: 'AND: red lamp needs both S1 and S2 • OR: green lamp needs either S3 or S4',
      build: function(){
        var S1 = mkSwitch(0), S2 = mkSwitch(1), S3 = mkSwitch(2), S4 = mkSwitch(3), L1 = mkLamp(4, 'red'), L2 = mkLamp(5, 'green');
        // AND: อนุกรม
        W('SUP:+0', S1 + ':a', 'red'); W(S1 + ':b', S2 + ':a', 'orange'); W(S2 + ':b', L1 + ':a', 'orange'); W(L1 + ':b', 'SUP:-0', 'black');
        // OR: ขนาน
        W('SUP:+1', S3 + ':a', 'red'); W('SUP:+2', S4 + ':a', 'red');
        W(S3 + ':b', L2 + ':a', 'green'); W(S4 + ':b', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-1', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'no', c: 'S2', lbl: 'S2' }], load: { t: 'lamp', c: 'L1', color: 'red' }, tag: 'AND' },
        { el: [{ k: 'no', c: 'S3', lbl: 'S3', par: { k: 'no', c: 'S4', lbl: 'S4' } }], load: { t: 'lamp', c: 'L2', color: 'green' }, tag: 'OR' }
      ]; } },

    { id: 'swap',
      th: 'สลับไฟเขียว↔แดง ด้วย NC/NO',
      en: 'Swap green↔red lamp via NC/NO',
      hintTh: 'ปิดสวิตช์ = ไฟเขียว (NC ขา 1) ติด • เปิดสวิตช์ = K1 ทำงาน ไฟย้ายไปแดง (NO ขา 5)',
      hintEn: 'Switch off = green (NC pin 1) lit • switch on = K1 energizes, light moves to red (NO pin 5)',
      build: function(){
        var K1 = mkRelay(0), S1 = mkSwitch(0), L1 = mkLamp(1, 'red'), L2 = mkLamp(2, 'green');
        W('SUP:+0', S1 + ':a', 'red'); W(S1 + ':b', K1 + ':13', 'orange'); W(K1 + ':14', 'SUP:-0', 'black');
        W('SUP:+1', K1 + ':9', 'red'); W(K1 + ':5', L1 + ':a', 'blue'); W(L1 + ':b', 'SUP:-1', 'black');
        W(K1 + ':1', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-2', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L2', color: 'green' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'red' } }
      ]; } },

    { id: 'alarm',
      th: 'สัญญาณเตือน + ปุ่มรับทราบ (silence)',
      en: 'Alarm buzzer + acknowledge (silence)',
      hintTh: 'เปิด S1 (จำลองเหตุ) → บัซเซอร์ดัง + ไฟแดงติด • กด ACK → K1 ล็อกตัวเองตัดเสียงบัซเซอร์ (ไฟยังติด) • ปิด S1 เพื่อรีเซ็ต',
      hintEn: 'Turn S1 (fault) → buzzer + red lamp on • press ACK → K1 latches and silences the buzzer (lamp stays) • turn S1 off to reset',
      build: function(){
        var K1 = mkRelay(0), S1 = mkSwitch(0), Ba = mkButton(1, 'no'), L1 = mkLamp(2, 'red'), Z1 = mkBuzz(3);
        // node เหตุ = S1:b
        W('SUP:+0', S1 + ':a', 'red');
        // ไฟเตือน: เหตุ → L1
        W(S1 + ':b', L1 + ':a', 'orange'); W(L1 + ':b', 'SUP:-0', 'black');
        // บัซเซอร์: เหตุ → COM1(9) → NC1(1) → Z1  (K1 ทำงาน = NC เปิด = เงียบ)
        W(S1 + ':b', K1 + ':9', 'orange'); W(K1 + ':1', Z1 + ':a', 'yellow'); W(Z1 + ':b', 'SUP:-1', 'black');
        // ล็อก ACK: เหตุ → ACK(NO) → coil13 ; seal COM2(10)→NO2(6)→coil13
        W(S1 + ':b', Ba + ':a', 'blue'); W(Ba + ':b', K1 + ':13', 'blue');
        W(S1 + ':b', K1 + ':10', 'green'); W(K1 + ':6', K1 + ':13', 'green'); W(K1 + ':14', 'SUP:-2', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'lamp', c: 'L1', color: 'red' } },
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'buzz', c: 'Z1' } },
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'no', c: 'B1', lbl: 'ACK', par: { k: 'no', c: 'K1', lbl: 'K1' } }], load: { t: 'coil', c: 'K1' } }
      ]; } }
  ];

  function loadExampleById(id){
    var ex = null;
    for (var i = 0; i < EX.length; i++) if (EX[i].id === id) ex = EX[i];
    if (!ex) ex = EX[0];
    resetBoard();
    ex.build();
    curExample = ex.id;
    setMode('normal');
    renderAll();
    hint(ex.hintTh, ex.hintEn);
  }
  function curExObj(){ for (var i = 0; i < EX.length; i++) if (EX[i].id === curExample) return EX[i]; return null; }

  function clearAll(){
    resetBoard();
    curExample = null;
    setMode('normal');
    renderAll();
  }

  /* ---- schematic (ladder) view ---- */
  var schSvg = document.getElementById('rly-sch');
  var SCH_LIVE = '#16a34a', SCH_DEAD = '#94a3b8';
  function findComp(id){ for (var i = 0; i < comps.length; i++) if (comps[i].id === id) return comps[i]; return null; }
  function contactClosed(elem){
    var c = findComp(elem.c);
    if (!c) return false;
    if (c.t === 'relay') return elem.k === 'nc' ? !c._en : !!c._en;
    if (c.t === 'switch') return !!c.on;
    if (c.t === 'button') return rlyBtnClosed(c);
    return false;
  }
  function elemClosed(elem){ return contactClosed(elem) || (elem.par ? contactClosed(elem.par) : false); }
  function loadEnergized(load){
    var r = lastRes && lastRes.comps[load.c];
    if (!r) return false;
    if (load.t === 'coil') return !!r.en;
    if (load.t === 'lamp') return r.bright > 0.05;
    if (load.t === 'buzz') return !!r.on;
    return false;
  }
  function sline(x1, y1, x2, y2, live, parent){
    el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: live ? SCH_LIVE : SCH_DEAD, 'stroke-width': live ? 3.5 : 2, 'stroke-linecap': 'round' }, parent);
  }
  function schContact(cx, cy, elem, parent){
    var closed = contactClosed(elem), col = closed ? SCH_LIVE : SCH_DEAD;
    sline(cx - 22, cy, cx - 9, cy, closed, parent);
    sline(cx + 9, cy, cx + 22, cy, closed, parent);
    var ang = closed ? 0 : (elem.k === 'nc' ? 0 : -18);
    // ขีดหน้าสัมผัส (บานพับซ้าย → ปลายขวา)
    var y2 = cy + (closed ? 0 : (elem.k === 'nc' ? 0 : -9));
    el('line', { x1: cx - 9, y1: cy - (elem.k === 'nc' ? 8 : 0), x2: cx + 9, y2: y2 - (elem.k === 'nc' ? 8 : 0), stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' }, parent);
    if (elem.k === 'nc'){
      // เส้นทแยงตัด = NC
      el('line', { x1: cx - 13, y1: cy + 9, x2: cx + 13, y2: cy - 13, stroke: col, 'stroke-width': 2 }, parent);
    }
    el('circle', { cx: cx - 9, cy: cy, r: 2.4, fill: col }, parent);
    el('circle', { cx: cx + 9, cy: cy, r: 2.4, fill: col }, parent);
    var lbl = el('text', { x: cx, y: cy - 15, 'text-anchor': 'middle', 'class': 'rly-schlbl' }, parent);
    lbl.textContent = elem.lbl + (elem.k === 'nc' ? ' (NC)' : '');
  }
  function schLoad(cx, cy, load, parent){
    var live = loadEnergized(load), col;
    if (load.t === 'coil'){
      col = live ? SCH_LIVE : SCH_DEAD;
      el('path', { d: 'M ' + (cx - 15) + ' ' + (cy - 15) + ' a 15 15 0 0 0 0 30', fill: 'none', stroke: col, 'stroke-width': 3 }, parent);
      el('path', { d: 'M ' + (cx + 15) + ' ' + (cy - 15) + ' a 15 15 0 0 1 0 30', fill: 'none', stroke: col, 'stroke-width': 3 }, parent);
      var t1 = el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'class': 'rly-schlbl rly-bold' }, parent);
      t1.textContent = load.c;
    } else if (load.t === 'lamp'){
      col = LAMP_COLORS[load.color] || '#ef4444';
      el('circle', { cx: cx, cy: cy, r: 15, fill: live ? col : 'none', 'fill-opacity': live ? 0.85 : 0, stroke: col, 'stroke-width': 3 }, parent);
      el('line', { x1: cx - 10, y1: cy - 10, x2: cx + 10, y2: cy + 10, stroke: col, 'stroke-width': 1.5 }, parent);
      el('line', { x1: cx - 10, y1: cy + 10, x2: cx + 10, y2: cy - 10, stroke: col, 'stroke-width': 1.5 }, parent);
      var t2 = el('text', { x: cx + 26, y: cy + 5, 'text-anchor': 'start', 'class': 'rly-schlbl' }, parent);
      t2.textContent = load.c;
    } else { // buzz
      col = live ? '#d97706' : SCH_DEAD;
      el('path', { d: 'M ' + (cx - 14) + ' ' + (cy - 12) + ' h 20 l 8 -6 v 36 l -8 -6 h -20 z', fill: live ? '#fde68a' : 'none', stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round' }, parent);
      var t3 = el('text', { x: cx + 30, y: cy + 5, 'text-anchor': 'start', 'class': 'rly-schlbl' }, parent);
      t3.textContent = load.c;
    }
  }
  function drawSchematic(){
    if (!schSvg) return;
    schSvg.innerHTML = '';
    var ex = curExObj();
    if (!ex){
      schSvg.setAttribute('viewBox', '0 0 700 160');
      var m = el('text', { x: 350, y: 80, 'text-anchor': 'middle', 'class': 'rly-schnote th-only' }, schSvg);
      m.textContent = 'แผนภาพมีให้เฉพาะวงจรตัวอย่างสำเร็จรูป — เลือกจากเมนู "ตัวอย่าง" ด้านบน';
      var m2 = el('text', { x: 350, y: 80, 'text-anchor': 'middle', 'class': 'rly-schnote en-only' }, schSvg);
      m2.textContent = 'Schematic view is available for the built-in examples — pick one from the "Example" menu above';
      return;
    }
    var rungs = ex.ladder();
    var xL = 70, xR = 630, y0 = 46, dy = 92, loadX = 520;
    var H = y0 + rungs.length * dy + 20;
    schSvg.setAttribute('viewBox', '0 0 700 ' + H);
    // rails
    el('line', { x1: xL, y1: y0 - 16, x2: xL, y2: y0 + (rungs.length - 1) * dy + 16, stroke: SCH_LIVE, 'stroke-width': 3 }, schSvg);
    el('line', { x1: xR, y1: y0 - 16, x2: xR, y2: y0 + (rungs.length - 1) * dy + 16, stroke: SCH_DEAD, 'stroke-width': 3 }, schSvg);
    el('text', { x: xL, y: y0 - 24, 'text-anchor': 'middle', 'class': 'rly-schlbl rly-bold', fill: '#dc2626' }, schSvg).textContent = 'L+ (24V)';
    el('text', { x: xR, y: y0 - 24, 'text-anchor': 'middle', 'class': 'rly-schlbl rly-bold', fill: '#2563eb' }, schSvg).textContent = 'N (0V)';
    rungs.forEach(function(rg, ri){
      var cy = y0 + ri * dy, prevX = xL, cum = true;
      rg.el.forEach(function(elem, ei){
        var cx = 150 + ei * 120;
        sline(prevX, cy, cx - 22, cy, cum, schSvg);
        schContact(cx, cy, elem, schSvg);
        if (elem.par){
          var by = cy + 30;
          sline(cx - 22, cy, cx - 22, by, cum, schSvg);
          sline(cx + 22, cy, cx + 22, by, elemClosed(elem), schSvg);
          // วาดหน้าสัมผัสขนานที่ระดับ by
          el('line', { x1: cx - 22, y1: by, x2: cx - 9, y2: by, stroke: contactClosed(elem.par) ? SCH_LIVE : SCH_DEAD, 'stroke-width': contactClosed(elem.par) ? 3.5 : 2 }, schSvg);
          el('line', { x1: cx + 9, y1: by, x2: cx + 22, y2: by, stroke: contactClosed(elem.par) ? SCH_LIVE : SCH_DEAD, 'stroke-width': contactClosed(elem.par) ? 3.5 : 2 }, schSvg);
          el('line', { x1: cx - 9, y1: by, x2: cx + 9, y2: by, stroke: contactClosed(elem.par) ? SCH_LIVE : SCH_DEAD, 'stroke-width': 3, 'stroke-linecap': 'round' }, schSvg);
          var pl = el('text', { x: cx, y: by + 16, 'text-anchor': 'middle', 'class': 'rly-schlbl' }, schSvg);
          pl.textContent = elem.par.lbl;
        }
        cum = cum && elemClosed(elem);
        prevX = cx + 22;
      });
      sline(prevX, cy, loadX - 28, cy, cum, schSvg);
      schLoad(loadX, cy, rg.load, schSvg);
      var loadLive = loadEnergized(rg.load);
      sline(loadX + (rg.load.t === 'coil' ? 15 : 15), cy, xR, cy, loadLive, schSvg);
      if (rg.tag){
        el('text', { x: xL - 8, y: cy + 4, 'text-anchor': 'end', 'class': 'rly-schlbl rly-bold' }, schSvg).textContent = rg.tag;
      }
    });
  }
  function setView(v){
    view = v;
    document.getElementById('rly-panel-box').hidden = v !== 'panel';
    document.getElementById('rly-sch-box').hidden = v !== 'schematic';
    var b = document.getElementById('rly-view-btn');
    b.querySelector('.th-only').textContent = v === 'panel' ? '🔀 ดูแผนภาพ' : '🔀 ดูแผงจริง';
    b.querySelector('.en-only').textContent = v === 'panel' ? '🔀 Schematic' : '🔀 Panel';
    if (v === 'schematic') drawSchematic();
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
  document.getElementById('rly-add-button').addEventListener('click', function(){
    setMode('normal'); addButton(document.getElementById('rly-button-type').value);
  });
  document.getElementById('rly-add-lamp').addEventListener('click', function(){
    setMode('normal'); addLamp(document.getElementById('rly-lamp-color').value);
  });
  document.getElementById('rly-add-buzzer').addEventListener('click', function(){ setMode('normal'); addBuzzer(); });
  document.getElementById('rly-wire-btn').addEventListener('click', function(){ setMode(mode === 'wire' ? 'normal' : 'wire'); });
  document.getElementById('rly-del-btn').addEventListener('click', function(){ setMode(mode === 'delete' ? 'normal' : 'delete'); });
  document.getElementById('rly-clear-btn').addEventListener('click', clearAll);
  document.getElementById('rly-view-btn').addEventListener('click', function(){ setView(view === 'panel' ? 'schematic' : 'panel'); });
  var exSel = document.getElementById('rly-example-sel');
  EX.forEach(function(ex, i){
    var o = document.createElement('option');
    o.value = ex.id;
    o.setAttribute('data-th', (i + 1) + '. ' + ex.th);
    o.setAttribute('data-en', (i + 1) + '. ' + ex.en);
    o.textContent = (i + 1) + '. ' + ex.th;
    exSel.appendChild(o);
  });
  function syncExOptions(){
    var en = document.documentElement.lang === 'en';
    Array.prototype.forEach.call(exSel.options, function(o){
      if (o.getAttribute('data-th')) o.textContent = en ? o.getAttribute('data-en') : o.getAttribute('data-th');
    });
  }
  syncExOptions();
  exSel.addEventListener('change', function(){ loadExampleById(exSel.value); });
  window.addEventListener('langchange', function(){ syncExOptions(); if (view === 'schematic') drawSchematic(); });
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape'){
      if (pendingTid){ if (termEls[pendingTid]) termEls[pendingTid].classList.remove('pending'); pendingTid = null; defaultHint(); }
      else if (mode !== 'normal') setMode('normal');
    }
  });

  /* ---- init ---- */
  loadExampleById('basic');
  exSel.value = 'basic';
  requestAnimationFrame(frame);
})();
