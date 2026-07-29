/* relay-lab.js — Relay Control Lab: แผงฝึกวงจรควบคุมรีเลย์ OMRON MY4 (24VDC)
 *
 * เฟส 1+2: แผง SVG + แหล่งจ่าย 24VDC + สวิตช์ + ไฟแสดง + MY4 (4PDT, 14 ขา) + สายจัมเปอร์
 * เฟส 3: ปุ่มกด momentary NO/NC (c.pressed) + บัซเซอร์ (WebAudio เสียงต่อเนื่อง)
 * เฟส 4: เมนูตัวอย่าง 6 วงจร (EX[] → build()+ladder) — พื้นฐาน/self-holding/interlock/AND-OR/สลับไฟ/บัซเซอร์แจ้งเตือน
 * เฟส 5: มุมมองแผนภาพ (ladder) — สลับ "แผงจริง ↔ แผนภาพ", ไฮไลต์เส้น/หน้าสัมผัสที่มีไฟตามผลจริง (เฉพาะวงจรตัวอย่าง)
 * เฟส 7: จุดพักไฟ (terminal block) TB-1…TB-10 จุดละ 4 รู — รูในจุดเดียวกัน = โหนดเดียว (keyOf), คนละจุด = แยกกัน
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
  R_MOTOR: 120,      // มอเตอร์ 24VDC ≈ 200mA (โหลดกำลัง)
  MOTOR_VON: 12,     // แรงดันที่ถือว่ามอเตอร์เริ่มหมุน (V) — ทิศตามขั้วที่ป้อน
  SHORT_I: 2,        // กระแสแหล่งจ่ายเกินนี้ = ลัดวงจร (A)
  MAXIT: 25          // รอบสูงสุดของลูปสลับหน้าสัมผัส
};

/* ปุ่มกดปิดวงจรหรือไม่: NO นำเมื่อกด, NC นำเมื่อไม่กด */
function rlyBtnClosed(c){ return c.tt === 'nc' ? !c.pressed : !!c.pressed; }

/* รายชื่อขา (pin) ของอุปกรณ์แต่ละชนิด */
function rlyPins(c){
  if (c.t === 'supply') return ['+', '-'];
  if (c.t === 'relay'){ var a = []; for (var i = 1; i <= 14; i++) a.push(String(i)); return a; }
  return ['a', 'b']; // switch, lamp, buzzer, motor
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
  // จุดพักไฟ (terminal block) ไม่ใช่อุปกรณ์ — โหนดของมันโผล่มาทางสายเท่านั้น
  // ต้องจองดัชนีให้ครบ "ก่อน" ตรึงขนาดเมทริกซ์ ไม่งั้น nid() ในลูปสายจะคืนดัชนีเกินขอบ A/B
  wireKeys.forEach(function(w){ nid(w.a); nid(w.b); });

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
      } else if (c.t === 'motor'){
        addG(k('a'), k('b'), 1 / RLY.R_MOTOR);
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
    } else if (c.t === 'motor'){
      // ทิศหมุนตามขั้วแรงดันที่ป้อน: a บวกกว่า b = หมุนหน้า (FWD), กลับขั้ว = ถอยหลัง (REV)
      var vm = vp('a') - vp('b'), runM = Math.abs(vm) >= RLY.MOTOR_VON;
      out.comps[c.id] = { i: vm / RLY.R_MOTOR, v: vm, run: runM,
                          dir: runM ? (vm > 0 ? 1 : -1) : 0, speed: Math.min(1, Math.abs(vm) / RLY.VSUP) };
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
  var VBW = 1080, VBH = 704;
  var SUP_Y = 30, SUP_H = 58;
  var RSLOT = { y: 108, h: 248, w: 225, x0: 70, gap: 245, max: 4 };
  var BSLOT = { y: 384, h: 185, w: 110, x0: 70, gap: 120, max: 8 };
  // รางไฟด้านข้าง: +24V ซ้าย / 0V ขวา — จุดต่อทุกแถว ทำให้อุปกรณ์ดึงไฟจากจุดใกล้ตัว
  var LRAIL = { x: 42, bx: 30, by: 118, bw: 24, bh: 452 };
  var RRAIL = { x: 1062, bx: 1050, by: 118, bw: 24, bh: 452 };
  var RAIL_YS = [150, 215, 280, 345, 420, 475, 530];
  // จุดพักไฟ (terminal block): 12 จุด × 3 รู — รูในจุดเดียวกันถึงกันหมด, คนละจุด = คนละโหนด
  var TB = { n: 10, holes: 4, x0: 96, gap: 94, y: 592, h: 80, bw: 76, termY: 620, hgap: 19 };
  function tbX(p){ return TB.x0 + p * TB.gap; }
  var LAMP_COLORS = { red: '#ef4444', green: '#22c55e', yellow: '#eab308' };
  var WIRE_COLORS = { red: '#ef4444', black: '#556070', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308', orange: '#f97316' };
  var LIVE = '#f97316', DEAD = '#94a3b8';

  /* ---- state ---- */
  var SUPC = { id: 'SUP', t: 'supply' };
  var comps = [];            // อุปกรณ์ที่ผู้ใช้วาง (ไม่รวม SUP)
  var wires = [];            // {a:tid, b:tid, color}
  var relaySlots = [null, null, null, null];
  var botSlots = [null, null, null, null, null, null, null, null];
  var nextK = 1, nextS = 1, nextL = 1, nextB = 1, nextZ = 1, nextM = 1;
  var mode = 'normal';       // normal | wire | delete
  var pendingTid = null;
  var lastRes = null;
  var termPos = {}, termEls = {};
  var curExample = null;     // id ตัวอย่างปัจจุบัน (null = ผู้ใช้แก้เอง → แผนภาพไม่พร้อม)
  var view = 'panel';        // panel | schematic
  var selected = null;       // {kind:'wire',wire} | {kind:'node',key} | {kind:'comp',comp} — สำหรับไฮไลต์กระพริบไล่วงจร

  /* terminal id → node key
     - จุด + / − ของแหล่งจ่ายทุกจุด = โหนดเดียวกัน
     - รูทั้ง 3 ของจุดพักไฟจุดเดียวกัน (TB:p:h) = โหนดเดียวกัน (TB:p) เหมือนแผ่นทองเหลืองในตัวจริง */
  function keyOf(tid){
    if (tid.indexOf('SUP:+') === 0) return 'SUP:+';
    if (tid.indexOf('SUP:-') === 0) return 'SUP:-';
    if (tid.indexOf('TB:') === 0) return tid.split(':').slice(0, 2).join(':');
    return tid;
  }
  function tbNum(key){ return parseInt(key.split(':')[1], 10) + 1; }   // TB:0 → 1

  /* ---- selection / highlight (ไล่วงจร) ---- */
  function tidLabel(tid){
    if (keyOf(tid) === 'SUP:+') return '+24V';
    if (keyOf(tid) === 'SUP:-') return '0V';
    if (tid.indexOf('TB:') === 0) return 'จุดพักไฟ TB-' + tbNum(tid);
    var p = tid.split(':');
    return p[0] + ' ขา ' + p[1];
  }
  function tidLabelEn(tid){
    if (keyOf(tid) === 'SUP:+') return '+24V';
    if (keyOf(tid) === 'SUP:-') return '0V';
    if (tid.indexOf('TB:') === 0) return 'terminal TB-' + tbNum(tid);
    var p = tid.split(':');
    return p[0] + ' pin ' + p[1];
  }
  function wireOnNode(w, key){ return keyOf(w.a) === key || keyOf(w.b) === key; }
  function wireOnComp(w, id){ return w.a.indexOf(id + ':') === 0 || w.b.indexOf(id + ':') === 0; }
  function isWireHi(w){
    if (!selected) return false;
    if (selected.kind === 'wire') return w === selected.wire;
    if (selected.kind === 'node') return wireOnNode(w, selected.key);
    if (selected.kind === 'comp') return wireOnComp(w, selected.comp.id);
    return false;
  }
  function isTermHi(tid){
    if (!selected) return false;
    if (selected.kind === 'wire') return tid === selected.wire.a || tid === selected.wire.b;
    if (selected.kind === 'node') return keyOf(tid) === selected.key;
    if (selected.kind === 'comp') return tid.indexOf(selected.comp.id + ':') === 0;
    return false;
  }
  function clearSelection(){ if (selected){ selected = null; defaultHint(); } }
  function selectWire(w){
    selected = { kind: 'wire', wire: w };
    hint('สายที่เลือก (กระพริบ): ' + tidLabel(w.a) + ' → ' + tidLabel(w.b) + ' • คลิกที่ว่างเพื่อยกเลิก',
         'Selected wire (blinking): ' + tidLabelEn(w.a) + ' → ' + tidLabelEn(w.b) + ' • click empty space to clear');
  }
  function selectNode(key){
    selected = { kind: 'node', key: key };
    var n = wires.filter(function(w){ return wireOnNode(w, key); }).length;
    var lbl = key === 'SUP:+' ? '+24V' : key === 'SUP:-' ? '0V' : tidLabel(key);
    var lblEn = key === 'SUP:+' ? '+24V' : key === 'SUP:-' ? '0V' : tidLabelEn(key);
    hint('โหนด ' + lbl + ': มีสายต่ออยู่ ' + n + ' เส้น (กระพริบทั้งหมด = จุดที่ถึงกันทางไฟฟ้า) • คลิกที่ว่างเพื่อยกเลิก',
         'Node ' + lblEn + ': ' + n + ' wire(s) attached (all blinking = electrically the same point) • click empty space to clear');
  }
  function selectComp(c){ selected = { kind: 'comp', comp: c }; }

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
  // ลำดับเลเยอร์ (ล่าง→บน): โครงช่องว่าง → ตัวอุปกรณ์ → สาย (หน้าอุปกรณ์) → จุดต่อ+เลขขา → หัวปุ่มกด → จุดกระแส
  var gGhost = el('g', {}, svg);
  var gComp = el('g', {}, svg);
  var gWire = el('g', {}, svg);
  var gTerm = el('g', {}, svg);
  // หัวปุ่มกดต้องอยู่เหนือสาย ไม่งั้นแถบรับคลิกของสายที่พาดผ่านจะกินคลิกไปหมด กดปุ่มไม่ได้
  var gTop = el('g', {}, svg);
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
      hint('คลิก "สาย" / "จุดต่อ ●" / "ตัวอุปกรณ์" เพื่อไฮไลต์กระพริบไล่วงจร • คลิกสวิตช์เพื่อเปิด/ปิด • กด "เดินสาย" เพื่อต่อสายเอง',
           'Click a wire / terminal ● / component to blink-highlight it for tracing • click a switch to toggle • press "Wire" to add jumpers');
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
      selectNode(keyOf(tid));   // โหมดปกติ: ไฮไลต์ทุกสายที่ต่อโหนดนี้
    }
  }

  /* ---- draw: supply (แถบบน + รางไฟสองข้าง) ---- */
  function drawSupply(){
    var g = el('g', {}, gComp);
    var warn = lastRes && lastRes.shorted;
    // แถบแหล่งจ่ายด้านบน
    el('rect', { x: 80, y: SUP_Y, width: 390, height: SUP_H, rx: 10, 'class': 'rly-body' + (warn ? ' rly-warnbox' : ''), id: 'rly-supbox-p' }, g);
    el('rect', { x: 610, y: SUP_Y, width: 390, height: SUP_H, rx: 10, 'class': 'rly-body' + (warn ? ' rly-warnbox' : ''), id: 'rly-supbox-n' }, g);
    txt(115, SUP_Y + 36, '+24V', 'rly-txt rly-sup-p', 'middle', g, 15);
    txt(645, SUP_Y + 36, '0V', 'rly-txt rly-sup-n', 'middle', g, 15);
    biTxt(285, SUP_Y - 8, 'แหล่งจ่ายไฟ 24VDC', '24VDC power supply', 'rly-pin', 'middle', g, 10);
    var i;
    for (i = 0; i < 4; i++) addTerm('SUP:+' + i, 190 + i * 70, SUP_Y + 34, g);
    for (i = 0; i < 4; i++) addTerm('SUP:-' + i, 700 + i * 70, SUP_Y + 34, g);
    // รางไฟด้านข้าง (จุดต่อทุกแถว = โหนด SUP:+ / SUP:− เดิม ผ่าน keyOf)
    el('rect', { x: LRAIL.bx, y: LRAIL.by, width: LRAIL.bw, height: LRAIL.bh, rx: 8, 'class': 'rly-rail rly-rail-p' + (warn ? ' rly-warnbox' : ''), id: 'rly-supbox-lp' }, g);
    el('rect', { x: RRAIL.bx, y: RRAIL.by, width: RRAIL.bw, height: RRAIL.bh, rx: 8, 'class': 'rly-rail rly-rail-n' + (warn ? ' rly-warnbox' : ''), id: 'rly-supbox-rn' }, g);
    txt(LRAIL.x, LRAIL.by - 7, '+24V', 'rly-sup-p rly-bold', 'middle', g, 11);
    txt(RRAIL.x, RRAIL.by - 7, '0V', 'rly-sup-n rly-bold', 'middle', g, 11);
    RAIL_YS.forEach(function(yy, idx){
      addTerm('SUP:+L' + idx, LRAIL.x, yy, g);
      addTerm('SUP:-R' + idx, RRAIL.x, yy, g);
    });
  }

  /* ---- draw: จุดพักไฟ / terminal block ----
     12 จุดแยกกัน จุดละ 3 รู — แผ่นทองเหลืองในจุดเดียวกันเชื่อมทั้ง 3 รูถึงกัน (= โหนดเดียว)
     ใช้เป็นที่ "พัก" สายที่ต้องแตกไปหลายทาง แทนการยัดสายซ้อนกันที่ขาอุปกรณ์ */
  function drawTerminalBlock(){
    var g = el('g', {}, gComp);
    var x1 = tbX(0) - TB.bw / 2 - 8, x2 = tbX(TB.n - 1) + TB.bw / 2 + 8;
    el('rect', { x: x1, y: TB.y, width: x2 - x1, height: TB.h, rx: 8, 'class': 'rly-tb-rail' }, g);
    biTxt(x1 + 4, TB.y - 8, 'จุดพักไฟ (เทอร์มินอลบล็อก) — รูในจุดเดียวกันถึงกันหมด • คนละจุด = แยกจากกัน',
          'Terminal block — the holes in one terminal are all connected • different terminals are isolated',
          'rly-pin', 'start', g, 10);
    for (var p = 0; p < TB.n; p++){
      var cx = tbX(p);
      el('rect', { x: cx - TB.bw / 2, y: TB.y + 8, width: TB.bw, height: TB.h - 16, rx: 5, 'class': 'rly-tb-block' }, g);
      // แผ่นทองเหลืองเชื่อมทุกรูในจุดเดียวกัน (บอกสายตาว่าถึงกันทางไฟฟ้า)
      var half = (TB.holes - 1) / 2 * TB.hgap;
      el('line', { x1: cx - half, y1: TB.termY, x2: cx + half, y2: TB.termY, 'class': 'rly-tb-bus' }, g);
      txt(cx, TB.y + TB.h - 14, 'TB-' + (p + 1), 'rly-pin rly-bold', 'middle', g, 10);
      for (var h = 0; h < TB.holes; h++){
        addTerm('TB:' + p + ':' + h, cx + (h - (TB.holes - 1) / 2) * TB.hgap, TB.termY, g);
      }
    }
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
    // coil 13-14 (ขั้ว: 14 = + / 13 = −)
    var coilY = y0 + 230;
    txt(x0 + 30, coilY + 4, 'Coil', 'rly-pin rly-bold', 'end', g);
    addTerm(c.id + ':13', x0 + 85, coilY, g, '13');
    addTerm(c.id + ':14', x0 + 140, coilY, g, '14');
    txt(x0 + 68, coilY + 5, '−', 'rly-sup-n rly-bold', 'middle', g, 17);  // ขา 13 = ลบ
    txt(x0 + 157, coilY + 5, '+', 'rly-sup-p rly-bold', 'middle', g, 17); // ขา 14 = บวก
    var p = 'M ' + (x0 + 94) + ' ' + coilY;
    for (var a = 0; a < 4; a++) p += ' a 5 6 0 0 1 10 0';
    el('path', { d: p, 'class': 'rly-coilsym' }, g);
    body.addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
  }

  /* ---- draw: switch (โยกแบบ rocker บนแผงจริง) ---- */
  // รูปทรงหน้าโยก: ด้านที่ "กดจม" สั้นกว่า ด้านที่ "ยกขึ้น" สูงกว่า → เห็นการเอียงชัด
  // เก็บเป็น offset จากจุดกึ่งกลาง แล้วสะท้อนซ้าย-ขวาตามสถานะ ON/OFF (ON = ฝั่ง I จม)
  var SW_FACE_DN = [[-22, -9], [-2, -16], [-2, 16], [-22, 9]];   // ฝั่งที่จม (อยู่ในเงา)
  var SW_FACE_UP = [[-2, -16], [22, -13], [22, 13], [-2, 16]];   // ฝั่งที่ยกขึ้น (รับแสง)
  var SW_GLOSS   = [[0, -14], [20, -11], [20, -6], [0, -9]];     // แถบแสงบนฝั่งที่ยกขึ้น
  function swPts(pts, cx, cy, mirror){
    return pts.map(function(p){ return (cx + (mirror ? -p[0] : p[0])) + ',' + (cy + p[1]); }).join(' ');
  }
  function setSwitchState(c){
    if (!c._faceDn) return;
    var on = !!c.on;
    // ON → ฝั่งซ้าย (I) จม / OFF → ฝั่งขวา (O) จม
    c._faceDn.setAttribute('points', swPts(SW_FACE_DN, c._cx, c._cy, !on));
    c._faceUp.setAttribute('points', swPts(SW_FACE_UP, c._cx, c._cy, !on));
    c._gloss.setAttribute('points', swPts(SW_GLOSS, c._cx, c._cy, !on));
    c._faceDn.setAttribute('class', 'rly-sw-face-dn rly-clickable' + (on ? ' on' : ''));
    c._faceUp.setAttribute('class', 'rly-sw-face-up rly-clickable' + (on ? ' on' : ''));
    c._markI.setAttribute('class', 'rly-sw-mark' + (on ? ' sunk' : ' up'));
    c._markO.setAttribute('class', 'rly-sw-mark' + (on ? ' up' : ' sunk'));
    c._stateTx.textContent = on ? 'ON' : 'OFF';
    c._stateTx.setAttribute('class', 'rly-pin rly-bold' + (on ? ' rly-sw-lbl-on' : ''));
  }
  function drawSwitch(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    var cx = x0 + 55, cy = y0 + 52;
    c._cx = cx; c._cy = cy;
    // ตัวสวิตช์อยู่เลเยอร์บนสุดเช่นเดียวกับหัวปุ่มกด — สายที่พาดผ่านต้องไม่กินคลิก
    var sg = el('g', {}, gTop);
    el('rect', { x: cx - 31, y: cy - 24, width: 62, height: 48, rx: 9, 'class': 'rly-sw-housing' }, sg);
    el('rect', { x: cx - 25, y: cy - 18, width: 50, height: 36, rx: 5, 'class': 'rly-sw-recess' }, sg);
    c._faceDn = el('polygon', { points: '', 'class': 'rly-sw-face-dn rly-clickable' }, sg);
    c._faceUp = el('polygon', { points: '', 'class': 'rly-sw-face-up rly-clickable' }, sg);
    c._gloss = el('polygon', { points: '', 'class': 'rly-sw-gloss', 'pointer-events': 'none' }, sg);
    c._markI = txt(cx - 13, cy + 4, 'I', 'rly-sw-mark', 'middle', sg, 11);
    c._markO = txt(cx + 13, cy + 4, 'O', 'rly-sw-mark', 'middle', sg, 11);
    c._markI.setAttribute('pointer-events', 'none');
    c._markO.setAttribute('pointer-events', 'none');
    el('rect', { x: cx - 18, y: y0 + 82, width: 36, height: 14, rx: 4, 'class': 'rly-pinbg' }, g);
    c._stateTx = txt(cx, y0 + 92, 'OFF', 'rly-pin rly-bold', 'middle', g, 10);
    el('path', { d: 'M ' + (cx - 12) + ' ' + (y0 + 76) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (cx + 12) + ' ' + (y0 + 76) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
    addTerm(c.id + ':a', x0 + 35, y0 + 140, g);
    addTerm(c.id + ':b', x0 + 75, y0 + 140, g);
    function click(ev){ ev.stopPropagation(); onCompClick(c); }
    c._faceDn.addEventListener('click', click);
    c._faceUp.addEventListener('click', click);
    setSwitchState(c);
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
    // ตัวเรือนสี่เหลี่ยม (housing) + หัวกดกลมนูน 3D — ให้ต่างจากไฟกลมชัดเจน
    // วาดในเลเยอร์บนสุด (gTop) เพื่อให้กดได้แม้มีสายพาดผ่านหน้าปุ่ม
    var cx = x0 + 55, cy = y0 + 54;
    el('rect', { x: cx - 27, y: cy - 27, width: 54, height: 54, rx: 10, 'class': 'rly-btn-housing' }, gTop);
    el('rect', { x: cx - 21, y: cy - 21, width: 42, height: 42, rx: 8, 'class': 'rly-btn-recess' }, gTop);
    c._capEl = el('circle', { cx: cx, cy: cy, r: 17, 'class': 'rly-btn-cap rly-clickable', fill: capCol }, gTop);
    c._capHi = el('ellipse', { cx: cx, cy: cy - 6, rx: 9, ry: 4.5, 'class': 'rly-btn-hi', 'pointer-events': 'none' }, gTop);
    el('path', { d: 'M ' + (cx - 12) + ' ' + (y0 + 82) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (cx + 12) + ' ' + (y0 + 82) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
    addTerm(c.id + ':a', x0 + 35, y0 + 140, g);
    addTerm(c.id + ':b', x0 + 75, y0 + 140, g);
    function press(ev){ ev.preventDefault(); ev.stopPropagation(); if (mode !== 'normal'){ onCompClick(c); return; } if (!c.pressed){ c.pressed = true; c._capEl.classList.add('down'); if (c._capHi) c._capHi.style.opacity = '0'; requestSolve(); } }
    function release(){ if (c.pressed){ c.pressed = false; if (c._capEl) c._capEl.classList.remove('down'); if (c._capHi) c._capHi.style.opacity = ''; requestSolve(); } }
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

  /* ---- draw: motor (โหลดกำลัง — ทิศหมุนตามขั้วไฟ) ---- */
  function drawMotor(c){
    var x0 = BSLOT.x0 + c.slot * BSLOT.gap, y0 = BSLOT.y;
    var g = el('g', {}, gComp);
    el('rect', { x: x0, y: y0, width: BSLOT.w, height: BSLOT.h, rx: 10, 'class': 'rly-socket' }, g);
    txt(x0 + 55, y0 + 20, c.id, 'rly-txt rly-bold', 'middle', g, 12);
    var cx = x0 + 55, cy = y0 + 58;
    c._glowEl = el('circle', { cx: cx, cy: cy, r: 28, fill: '#38bdf8', filter: 'url(#rlyGlow)', opacity: 0 }, g);
    el('circle', { cx: cx, cy: cy, r: 24, 'class': 'rly-motor rly-clickable' }, g)
      .addEventListener('click', function(ev){ ev.stopPropagation(); onCompClick(c); });
    // โรเตอร์: แถบหมุนรอบแกน (หมุนตามทิศกระแส) + ตัวอักษร M
    c._rotEl = el('g', { 'pointer-events': 'none' }, g);
    el('line', { x1: cx - 15, y1: cy, x2: cx + 15, y2: cy, 'class': 'rly-motor-rotor' }, c._rotEl);
    el('circle', { cx: cx, cy: cy, r: 4, 'class': 'rly-motor-hub' }, c._rotEl);
    c._rotCx = cx; c._rotCy = cy; c._ang = 0;
    el('rect', { x: cx - 30, y: y0 + 86, width: 60, height: 14, rx: 4, 'class': 'rly-pinbg' }, g);
    c._dirTx = txt(cx, y0 + 96, 'หยุด', 'rly-pin rly-bold', 'middle', g, 10);
    el('path', { d: 'M ' + (cx - 12) + ' ' + (y0 + 80) + ' L ' + (x0 + 35) + ' ' + (y0 + 140) +
                 ' M ' + (cx + 12) + ' ' + (y0 + 80) + ' L ' + (x0 + 75) + ' ' + (y0 + 140), 'class': 'rly-lead' }, g);
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
      w._haloEl = el('path', { d: d, 'class': 'rly-wirehalo' }, g);                        // ขอบสีพื้น (ฮาโล) ให้สายเด่นเหนืออุปกรณ์
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
        if (mode === 'delete'){ wires.splice(wires.indexOf(w), 1); curExample = null; clearSelection(); renderAll(); }
        else if (mode === 'normal'){ selectWire(w); }
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
    selectComp(c);   // ไฮไลต์สายทั้งหมดที่ต่อกับอุปกรณ์นี้
    var r = lastRes && lastRes.comps[c.id];
    var tail = ' • สายที่ต่อกระพริบอยู่', tailEn = ' • its wires are blinking';
    if (c.t === 'lamp' && r){
      hint(c.id + ': กระแส ' + fmtmA(r.i) + (r.bright > 0.05 ? ' — ติด' : ' — ดับ') + tail,
           c.id + ': current ' + fmtmA(r.i) + (r.bright > 0.05 ? ' — lit' : ' — off') + tailEn);
    } else if (c.t === 'buzzer' && r){
      hint(c.id + ': ' + (r.on ? 'ดัง' : 'เงียบ') + ' (' + fmtmA(r.i) + ')' + tail,
           c.id + ': ' + (r.on ? 'sounding' : 'silent') + ' (' + fmtmA(r.i) + ')' + tailEn);
    } else if (c.t === 'motor' && r){
      var dth = !r.run ? 'หยุด' : r.dir > 0 ? 'หมุนเดินหน้า (a เป็นบวก)' : 'หมุนถอยหลัง (b เป็นบวก)';
      var den = !r.run ? 'stopped' : r.dir > 0 ? 'running forward (a positive)' : 'running in reverse (b positive)';
      hint(c.id + ': ' + dth + ' — ' + Math.abs(r.v).toFixed(1) + 'V, ' + fmtmA(r.i) + tail,
           c.id + ': ' + den + ' — ' + Math.abs(r.v).toFixed(1) + 'V, ' + fmtmA(r.i) + tailEn);
    } else if (c.t === 'relay' && r){
      hint(c.id + ': คอยล์ ' + Math.abs(r.vcoil).toFixed(1) + 'V (' + fmtmA(r.icoil) + ') — ' +
             (r.en ? 'ทำงาน: COM ต่อกับ NO' : 'ไม่ทำงาน: COM ต่อกับ NC') + tail,
           c.id + ': coil ' + Math.abs(r.vcoil).toFixed(1) + 'V (' + fmtmA(r.icoil) + ') — ' +
             (r.en ? 'energized: COM → NO' : 'released: COM → NC') + tailEn);
    } else {
      hint(c.id + ' — เลือกแล้ว' + tail, c.id + ' — selected' + tailEn);
    }
  }
  function removeComp(c){
    curExample = null; selected = null;
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
  function addMotor(){
    var s = freeSlot(botSlots);
    if (s < 0){ botFull(); return; }
    curExample = null;
    var c = { id: 'M' + (nextM++), t: 'motor', slot: s };
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
      } else if (c.t === 'switch'){
        setSwitchState(c);
      } else if (c.t === 'buzzer' && c._glowEl){
        var on = r && r.on;
        if (on) anyBuzz = true;
        c._glowEl.setAttribute('opacity', on ? 0.8 : 0);
        c._waveEl.setAttribute('opacity', on ? 1 : 0);
      } else if (c.t === 'motor' && c._glowEl){
        var run = r && r.run;
        c._glowEl.setAttribute('opacity', run ? 0.45 : 0);
        c._dirTx.textContent = !run ? (isEn() ? 'stopped' : 'หยุด')
                                    : r.dir > 0 ? (isEn() ? 'FWD ▶' : 'เดินหน้า ▶')
                                                : (isEn() ? 'REV ◀' : 'ถอยหลัง ◀');
        c._dirTx.setAttribute('class', 'rly-pin rly-bold' + (run ? ' rly-motor-lbl' : ''));
      }
    });
    buzzSound(anyBuzz);
    var warn = lastRes && lastRes.shorted;
    var pb = document.getElementById('rly-supbox-p'), nb = document.getElementById('rly-supbox-n');
    if (pb) pb.setAttribute('class', 'rly-body' + (warn ? ' rly-warnbox' : ''));
    if (nb) nb.setAttribute('class', 'rly-body' + (warn ? ' rly-warnbox' : ''));
    var lp = document.getElementById('rly-supbox-lp'), rn = document.getElementById('rly-supbox-rn');
    if (lp) lp.setAttribute('class', 'rly-rail rly-rail-p' + (warn ? ' rly-warnbox' : ''));
    if (rn) rn.setAttribute('class', 'rly-rail rly-rail-n' + (warn ? ' rly-warnbox' : ''));
    if (view === 'schematic') drawSchematic();
  }

  /* ---- full re-render ---- */
  function renderAll(){
    gGhost.innerHTML = ''; gWire.innerHTML = ''; gComp.innerHTML = ''; gTerm.innerHTML = ''; gTop.innerHTML = ''; gDot.innerHTML = '';
    termPos = {}; termEls = {}; pendingTid = null;
    drawSupply();
    drawTerminalBlock();
    comps.forEach(function(c){
      if (c.t === 'relay') drawRelay(c);
      else if (c.t === 'switch') drawSwitch(c);
      else if (c.t === 'lamp') drawLamp(c);
      else if (c.t === 'button') drawButton(c);
      else if (c.t === 'buzzer') drawBuzzer(c);
      else if (c.t === 'motor') drawMotor(c);
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
  var lastT = 0, hiTermsPrev = [];
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
    // มอเตอร์: หมุนโรเตอร์ตามทิศ/ความเร็วจริง
    comps.forEach(function(c){
      if (c.t !== 'motor' || !c._rotEl) return;
      var r = lastRes && lastRes.comps[c.id];
      if (!r || !r.run) return;
      c._ang = (c._ang + r.dir * (240 + 480 * r.speed) * dt) % 360;
      c._rotEl.setAttribute('transform', 'rotate(' + c._ang.toFixed(1) + ' ' + c._rotCx + ' ' + c._rotCy + ')');
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
    // ---- selection highlight (กระพริบไล่วงจร) — ใช้ inline style เพื่อชนะ CSS ----
    var blink = (0.35 + 0.65 * Math.abs(Math.sin(ts / 240)));
    wires.forEach(function(w){
      if (!w._haloEl) return;
      if (selected && isWireHi(w)){
        w._haloEl.style.stroke = '#f59e0b';
        w._haloEl.style.strokeWidth = '12';
        w._haloEl.style.opacity = blink.toFixed(2);
        w._pathEl.style.strokeWidth = '4.8';
      } else {
        w._haloEl.style.stroke = '';
        w._haloEl.style.strokeWidth = '';
        w._haloEl.style.opacity = '';
        w._pathEl.style.strokeWidth = '';
      }
    });
    hiTermsPrev.forEach(function(tid){ var te = termEls[tid]; if (te){ te.setAttribute('r', '7'); te.style.fill = ''; te.style.stroke = ''; } });
    hiTermsPrev = [];
    if (selected){
      for (var tid in termEls){
        if (isTermHi(tid)){
          var te = termEls[tid];
          te.setAttribute('r', (7 + 2.5 * blink).toFixed(1));
          te.style.fill = '#f59e0b';
          te.style.stroke = '#d97706';
          hiTermsPrev.push(tid);
        }
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---- example builders ---- */
  function resetBoard(){
    comps = []; wires = [];
    relaySlots = [null, null, null, null];
    botSlots = [null, null, null, null, null, null, null, null];
    nextK = 1; nextS = 1; nextL = 1; nextB = 1; nextZ = 1; nextM = 1;
  }
  function mkRelay(slot){ var c = { id: 'K' + (nextK++), t: 'relay', slot: slot, _en: false, _dispA: 0 }; relaySlots[slot] = c; comps.push(c); return c.id; }
  function mkSwitch(slot){ var c = { id: 'S' + (nextS++), t: 'switch', slot: slot, on: false }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkButton(slot, tt){ var c = { id: 'B' + (nextB++), t: 'button', tt: tt, slot: slot, pressed: false }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkLamp(slot, color){ var c = { id: 'L' + (nextL++), t: 'lamp', slot: slot, color: color }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkBuzz(slot){ var c = { id: 'Z' + (nextZ++), t: 'buzzer', slot: slot }; botSlots[slot] = c; comps.push(c); return c.id; }
  function mkMotor(slot){ var c = { id: 'M' + (nextM++), t: 'motor', slot: slot }; botSlots[slot] = c; comps.push(c); return c.id; }
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
        W('SUP:+L6', S1 + ':a', 'red'); W(S1 + ':b', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        W('SUP:+L2', K1 + ':9', 'red'); W(K1 + ':5', L1 + ':a', 'blue'); W(L1 + ':b', 'SUP:-R6', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'red' } }
      ]; } },

    { id: 'latch',
      th: 'วงจรล็อกตัวเอง START/STOP (self-holding)',
      en: 'Self-holding START/STOP circuit',
      hintTh: 'กดปุ่มเขียว START ค้างแล้วปล่อย → K1 ล็อกตัวเองผ่านหน้าสัมผัส NO (seal-in) → ไฟติดค้าง • กดปุ่มแดง STOP เพื่อตัด • สังเกตจุดพักไฟ TB-1/TB-2 คือจุดที่สายแตกไปหลายทาง',
      hintEn: 'Tap green START → K1 seals itself in through its own NO contact → stays on • press red STOP to drop it • note how TB-1/TB-2 are where wires branch',
      build: function(){
        var K1 = mkRelay(0), Bs = mkButton(0, 'no'), Bp = mkButton(1, 'nc'), L1 = mkLamp(2, 'green');
        // เส้นคอยล์เดินผ่านจุดพักไฟแบบตู้จริง — จุดที่แตกสายหลายทางมาพักที่เทอร์มินอล ไม่ยัดซ้อนที่ขาอุปกรณ์
        // TB-1 = จุดหลัง STOP (แตกไป START + COM1) ; TB-2 = จุดเข้าคอยล์ (START ขนานกับ NO1 seal-in)
        W('SUP:+L6', Bp + ':a', 'red'); W(Bp + ':b', 'TB:0:0', 'orange');
        W('TB:0:1', Bs + ':a', 'orange'); W('TB:0:2', K1 + ':9', 'blue');
        W(Bs + ':b', 'TB:1:0', 'orange'); W(K1 + ':5', 'TB:1:1', 'blue');        // seal-in NO1 ขนานกับ START
        W('TB:1:2', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        // ไฟ RUN: +24V → COM2(10), NO2(6) → L1
        W('SUP:+L2', K1 + ':10', 'red'); W(K1 + ':6', L1 + ':a', 'green'); W(L1 + ':b', 'SUP:-R6', 'black');
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
        // K1 coil ผ่าน NC ของ K2 (ป้อน + ที่ขา 14, − ที่ขา 13)
        W('SUP:+L6', S1 + ':a', 'red'); W(S1 + ':b', K2 + ':9', 'orange'); W(K2 + ':1', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        // K2 coil ผ่าน NC ของ K1
        W('SUP:+L5', S2 + ':a', 'red'); W(S2 + ':b', K1 + ':9', 'blue'); W(K1 + ':1', K2 + ':14', 'blue'); W(K2 + ':13', 'SUP:-R4', 'black');
        // ไฟบอกสถานะ
        W('SUP:+L2', K1 + ':10', 'red'); W(K1 + ':6', L1 + ':a', 'red'); W(L1 + ':b', 'SUP:-R6', 'black');
        W('SUP:+L3', K2 + ':10', 'green'); W(K2 + ':6', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-R5', 'black');
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
        W('SUP:+L6', S1 + ':a', 'red'); W(S1 + ':b', S2 + ':a', 'orange'); W(S2 + ':b', L1 + ':a', 'orange'); W(L1 + ':b', 'SUP:-R6', 'black');
        // OR: ขนาน
        W('SUP:+L5', S3 + ':a', 'red'); W('SUP:+L5', S4 + ':a', 'red');
        W(S3 + ':b', L2 + ':a', 'green'); W(S4 + ':b', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-R5', 'black');
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
        W('SUP:+L6', S1 + ':a', 'red'); W(S1 + ':b', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        W('SUP:+L2', K1 + ':9', 'red'); W(K1 + ':5', L1 + ':a', 'blue'); W(L1 + ':b', 'SUP:-R6', 'black');
        W(K1 + ':1', L2 + ':a', 'green'); W(L2 + ':b', 'SUP:-R5', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L2', color: 'green' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'lamp', c: 'L1', color: 'red' } }
      ]; } },

    { id: 'alarm',
      th: 'สัญญาณเตือน + ปุ่มรับทราบ (silence)',
      en: 'Alarm buzzer + acknowledge (silence)',
      hintTh: 'เปิด S1 (จำลองเหตุ) → บัซเซอร์ดัง + ไฟแดงติด • กด ACK → K1 ล็อกตัวเองตัดเสียงบัซเซอร์ (ไฟยังติด) • ปิด S1 เพื่อรีเซ็ต • สาย "เส้นเหตุ" แตกไป 4 ทาง จึงพักที่ TB-1/TB-2 (คร่อมถึงกันด้วยจัมเปอร์สั้น)',
      hintEn: 'Turn S1 (fault) → buzzer + red lamp on • press ACK → K1 latches and silences the buzzer (lamp stays) • turn S1 off to reset • the fault line branches 4 ways, so it lands on TB-1/TB-2 (bridged by a short link)',
      build: function(){
        var K1 = mkRelay(0), S1 = mkSwitch(0), Ba = mkButton(1, 'no'), L1 = mkLamp(2, 'red'), Z1 = mkBuzz(3);
        // "เส้นเหตุ" พักที่ TB-1 แล้วคร่อมไป TB-2 (จุดเดียวรับไม่พอ 4 ทาง — ตู้จริงใช้หวีคร่อม/จัมเปอร์สั้น)
        W('SUP:+L6', S1 + ':a', 'red');
        W(S1 + ':b', 'TB:0:0', 'orange');
        W('TB:0:3', 'TB:1:0', 'orange');                                    // จัมเปอร์คร่อม TB-1 ↔ TB-2
        // ไฟเตือน: เหตุ → L1
        W('TB:0:1', L1 + ':a', 'orange'); W(L1 + ':b', 'SUP:-R6', 'black');
        // บัซเซอร์: เหตุ → COM1(9) → NC1(1) → Z1  (K1 ทำงาน = NC เปิด = เงียบ)
        W('TB:0:2', K1 + ':9', 'orange'); W(K1 + ':1', Z1 + ':a', 'yellow'); W(Z1 + ':b', 'SUP:-R5', 'black');
        // ล็อก ACK: เหตุ → ACK(NO) → TB-3 → coil14(+) ; seal COM2(10)→NO2(6) → TB-3 ; coil13(−) → 0V
        W('TB:1:1', Ba + ':a', 'blue'); W(Ba + ':b', 'TB:2:0', 'blue');
        W('TB:1:2', K1 + ':10', 'green'); W(K1 + ':6', 'TB:2:1', 'green');
        W('TB:2:3', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }], load: { t: 'lamp', c: 'L1', color: 'red' } },
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'buzz', c: 'Z1' } },
        { el: [{ k: 'no', c: 'S1', lbl: 'S1' }, { k: 'no', c: 'B1', lbl: 'ACK', par: { k: 'no', c: 'K1', lbl: 'K1' } }], load: { t: 'coil', c: 'K1' } }
      ]; } },

    { id: 'failsafe-ok',
      th: 'fail-safe ✔ STOP แบบ NC (สายขาด = หยุดเอง)',
      en: 'Fail-safe ✔ NC STOP button (broken wire = it stops)',
      hintTh: 'กด START → มอเตอร์เดินค้าง, กด STOP → หยุด • ทดลองความปลอดภัย: กดปุ่ม "ลบ" แล้วคลิกสายเส้นใดก็ได้ที่ต่อกับปุ่ม STOP → มอเตอร์ต้องหยุดทันทีเอง นี่คือ fail-safe',
      hintEn: 'Press START → the motor runs and seals in, press STOP → it drops out • safety test: hit "Delete" and remove either wire on the STOP button → the motor must stop by itself. That is fail-safe',
      build: function(){
        var K1 = mkRelay(0), Bs = mkButton(0, 'no'), Bp = mkButton(1, 'nc'), M1 = mkMotor(2);
        // +24 → STOP(NC) → TB-1 → [START ∥ seal NO1] → TB-2 → coil
        W('SUP:+L6', Bp + ':a', 'red'); W(Bp + ':b', 'TB:0:0', 'orange');
        W('TB:0:1', Bs + ':a', 'orange'); W('TB:0:2', K1 + ':9', 'blue');
        W(Bs + ':b', 'TB:1:0', 'orange'); W(K1 + ':5', 'TB:1:1', 'blue');
        W('TB:1:2', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        // มอเตอร์ผ่านหน้าสัมผัส NO ชุด 2
        W('SUP:+L2', K1 + ':10', 'red'); W(K1 + ':6', M1 + ':a', 'green'); W(M1 + ':b', 'SUP:-R6', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'nc', c: 'B2', lbl: 'STOP' }, { k: 'no', c: 'B1', lbl: 'START', par: { k: 'no', c: 'K1', lbl: 'K1' } }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'motor', c: 'M1' } }
      ]; } },

    { id: 'failsafe-bad',
      th: 'fail-safe ✘ STOP แบบ NO ผ่านรีเลย์ (สายขาด = หยุดไม่ได้)',
      en: 'Fail-safe ✘ NO stop through a relay (broken wire = cannot stop)',
      hintTh: 'วงจรนี้ "ดูเหมือนใช้ได้": กด START เดิน, กด STOP หยุด (K2 ทำงานแล้วเปิด NC ตัดคอยล์ K1) • แต่ลบสายที่ปุ่ม STOP แล้วกด STOP ดู → มอเตอร์ไม่ยอมหยุด เพราะการหยุดต้องพึ่งสายที่ยังดีอยู่ ต่างจาก NC ที่สายขาดแล้วตัดเอง',
      hintEn: 'This looks fine: START runs, STOP stops (K2 pulls in and its NC breaks the K1 coil) • but delete a wire on the STOP button and press STOP → the motor keeps running, because stopping depends on an intact wire. An NC stop breaks the circuit by itself',
      build: function(){
        var K1 = mkRelay(0), K2 = mkRelay(1), Bs = mkButton(0, 'no'), Bp = mkButton(1, 'no'), M1 = mkMotor(2);
        // คอยล์ K1 ป้อนผ่าน NC ของ K2 (K2 = รีเลย์ "สั่งหยุด")
        W('SUP:+L6', K2 + ':9', 'red'); W(K2 + ':1', 'TB:0:0', 'orange');
        W('TB:0:1', Bs + ':a', 'orange'); W('TB:0:2', K1 + ':9', 'blue');
        W(Bs + ':b', 'TB:1:0', 'orange'); W(K1 + ':5', 'TB:1:1', 'blue');
        W('TB:1:2', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        // ปุ่ม STOP แบบ NO → คอยล์ K2
        W('SUP:+L4', Bp + ':a', 'red'); W(Bp + ':b', K2 + ':14', 'yellow'); W(K2 + ':13', 'SUP:-R4', 'black');
        // มอเตอร์
        W('SUP:+L2', K1 + ':10', 'red'); W(K1 + ':6', M1 + ':a', 'green'); W(M1 + ':b', 'SUP:-R6', 'black');
      },
      ladder: function(){ return [
        { el: [{ k: 'nc', c: 'K2', lbl: 'K2' }, { k: 'no', c: 'B1', lbl: 'START', par: { k: 'no', c: 'K1', lbl: 'K1' } }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'no', c: 'B2', lbl: 'STOP' }], load: { t: 'coil', c: 'K2' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'motor', c: 'M1' } }
      ]; } },

    { id: 'fwdrev',
      th: 'กลับทางหมุนมอเตอร์ (FWD/REV) + อินเตอร์ล็อก',
      en: 'Motor forward/reverse with interlock',
      hintTh: 'กด FWD (เขียว) → K1 ล็อกตัวเอง มอเตอร์เดินหน้า • กด REV (น้ำเงิน/แดง) ระหว่างเดินหน้า → ไม่มีอะไรเกิดขึ้น เพราะ NC ของ K1 ล็อกไว้ • กด STOP ก่อนแล้วค่อยกด REV → มอเตอร์กลับทาง (K2 สลับขั้วที่มอเตอร์) • ถ้าไม่มีอินเตอร์ล็อกและทั้งคู่ดูดพร้อมกัน = +24V เจอ 0V เต็มๆ = ลัดวงจร',
      hintEn: 'Press FWD (green) → K1 seals in and the motor runs forward • press REV while running → nothing happens: K1 NC locks it out • press STOP first, then REV → the motor reverses (K2 swaps the motor polarity) • without the interlock, both closing at once would tie +24V straight to 0V = short',
      build: function(){
        var K1 = mkRelay(0), K2 = mkRelay(1),
            Bf = mkButton(0, 'no'), Br = mkButton(1, 'no'), Bp = mkButton(2, 'nc'), M1 = mkMotor(3);
        // สาย control ร่วม: +24 → STOP(NC) → TB-1
        W('SUP:+L6', Bp + ':a', 'red'); W(Bp + ':b', 'TB:0:0', 'orange');
        // K1 (FWD): TB-1 → [FWD ∥ seal NO1] → TB-2 → NC2 ของ K2 → coil K1
        W('TB:0:1', Bf + ':a', 'orange'); W('TB:0:2', K1 + ':9', 'green');
        W(Bf + ':b', 'TB:1:0', 'orange'); W(K1 + ':5', 'TB:1:1', 'green');
        W('TB:1:2', K2 + ':10', 'orange'); W(K2 + ':2', K1 + ':14', 'orange'); W(K1 + ':13', 'SUP:-R3', 'black');
        // TB-1 เต็ม 4 รูแล้ว → คร่อมไป TB-4 (โหนดเดียวกัน) เพื่อแตกสายฝั่ง REV ต่อ
        W('TB:0:3', 'TB:3:0', 'orange');
        // K2 (REV): TB-4 → [REV ∥ seal NO1] → TB-3 → NC2 ของ K1 → coil K2
        W('TB:3:1', Br + ':a', 'blue'); W('TB:3:2', K2 + ':9', 'blue');
        W(Br + ':b', 'TB:2:0', 'blue'); W(K2 + ':5', 'TB:2:1', 'blue');
        W('TB:2:2', K1 + ':10', 'blue'); W(K1 + ':2', K2 + ':14', 'blue'); W(K2 + ':13', 'SUP:-R4', 'black');
        // มอเตอร์: K1 ป้อน a=+24 b=0V (เดินหน้า) • K2 ป้อนกลับขั้ว a=0V b=+24 (ถอยหลัง)
        W('SUP:+L1', K1 + ':11', 'red'); W(K1 + ':7', M1 + ':a', 'green');
        W('SUP:-R1', K1 + ':12', 'black'); W(K1 + ':8', M1 + ':b', 'green');
        W('SUP:-R2', K2 + ':11', 'black'); W(K2 + ':7', M1 + ':a', 'yellow');
        W('SUP:+L0', K2 + ':12', 'red'); W(K2 + ':8', M1 + ':b', 'yellow');
      },
      ladder: function(){ return [
        { el: [{ k: 'nc', c: 'B3', lbl: 'STOP' }, { k: 'no', c: 'B1', lbl: 'FWD', par: { k: 'no', c: 'K1', lbl: 'K1' } }, { k: 'nc', c: 'K2', lbl: 'K2' }], load: { t: 'coil', c: 'K1' } },
        { el: [{ k: 'nc', c: 'B3', lbl: 'STOP' }, { k: 'no', c: 'B2', lbl: 'REV', par: { k: 'no', c: 'K2', lbl: 'K2' } }, { k: 'nc', c: 'K1', lbl: 'K1' }], load: { t: 'coil', c: 'K2' } },
        { el: [{ k: 'no', c: 'K1', lbl: 'K1' }], load: { t: 'motor', c: 'M1', dir: 1 }, tag: 'FWD' },
        { el: [{ k: 'no', c: 'K2', lbl: 'K2' }], load: { t: 'motor', c: 'M1', dir: -1 }, tag: 'REV' }
      ]; } }
  ];

  function loadExampleById(id){
    var ex = null;
    for (var i = 0; i < EX.length; i++) if (EX[i].id === id) ex = EX[i];
    if (!ex) ex = EX[0];
    resetBoard();
    ex.build();
    curExample = ex.id;
    selected = null;
    setMode('normal');
    renderAll();
    hint(ex.hintTh, ex.hintEn);
  }
  function curExObj(){ for (var i = 0; i < EX.length; i++) if (EX[i].id === curExample) return EX[i]; return null; }

  /* ===== ภารกิจ (mission) + ตรวจคำตอบอัตโนมัติ =====
   * ตัวตรวจ "กด/บิดสวิตช์แทนผู้เรียน" แล้วเรียก solver ซ้ำทีละขั้น จึงตรวจพฤติกรรมได้จริง
   * (รวมวงจรที่มีความจำอย่าง self-holding เพราะ latch _en ของรีเลย์เดินต่อข้ามขั้น)
   * parts เรียงตามลำดับที่ mk* สร้าง id → id ในโจทย์ (K1/S1/L1…) ตรงกับที่ปุ่ม "เตรียมอุปกรณ์" วางให้
   */
  var MISSIONS = [
    { id: 'mNO',
      th: '1. คุมไฟด้วยหน้าสัมผัส NO',
      en: '1. Switch a lamp through an NO contact',
      goalTh: 'ต่อให้ S1 สั่งคอยล์ K1 และให้ไฟแดง L1 ติดผ่านหน้าสัมผัส NO ของ K1 (ห้ามต่อ L1 กับสวิตช์ตรงๆ)',
      goalEn: 'Wire S1 to drive the K1 coil, and light red lamp L1 through a K1 NO contact (do not wire L1 straight to the switch)',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'switch', id: 'S1' }, { t: 'lamp', color: 'red', id: 'L1' }],
      links: [{ th: 'ไฟ L1 ต้องต่ออยู่กับขา NO ของ K1 (ขา 5–8)', en: 'Lamp L1 must land on a K1 NO pin (5–8)',
                from: 'L1', to: 'K1', pins: ['5', '6', '7', '8'] }],
      steps: [
        { set: {}, expect: { K1: false, L1: false },
          th: 'S1 ปิด (OFF) → K1 ไม่ทำงาน และ L1 ต้องดับ', en: 'S1 off → K1 de-energized and L1 off' },
        { set: { S1: 1 }, expect: { K1: true, L1: true },
          th: 'S1 เปิด (ON) → K1 ทำงาน และ L1 ต้องติด', en: 'S1 on → K1 energized and L1 lit' },
        { set: {}, expect: { K1: false, L1: false },
          th: 'ปิด S1 อีกครั้ง → ทุกอย่างต้องกลับไปดับ', en: 'S1 off again → everything back off' }
      ] },
    { id: 'mSwap',
      th: '2. สลับไฟเขียว↔แดง ด้วย NC/NO',
      en: '2. Swap green↔red with NC/NO',
      goalTh: 'ยังไม่ทำงาน (K1 ไม่ทำงาน) ให้ไฟเขียว L2 ติด • พอ S1 สั่ง K1 ทำงาน ไฟต้องย้ายไปที่แดง L1 และเขียวดับ',
      goalEn: 'While K1 is off the green lamp L2 is lit • when S1 energizes K1 the light must move to red L1 and green goes out',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'switch', id: 'S1' },
              { t: 'lamp', color: 'red', id: 'L1' }, { t: 'lamp', color: 'green', id: 'L2' }],
      steps: [
        { set: {}, expect: { L1: false, L2: true },
          th: 'S1 ปิด → เขียว L2 ติด, แดง L1 ดับ', en: 'S1 off → green L2 lit, red L1 off' },
        { set: { S1: 1 }, expect: { K1: true, L1: true, L2: false },
          th: 'S1 เปิด → K1 ทำงาน, แดง L1 ติด, เขียว L2 ดับ', en: 'S1 on → K1 energized, red L1 lit, green L2 off' },
        { set: {}, expect: { L1: false, L2: true },
          th: 'S1 ปิด → กลับมาเขียวติดเหมือนเดิม', en: 'S1 off → back to green' }
      ] },
    { id: 'mLatch',
      th: '3. วงจรล็อกตัวเอง START / STOP',
      en: '3. Self-holding START / STOP',
      goalTh: 'กดปุ่มเขียว B1 (START) แล้วปล่อย ไฟ L1 ต้องติดค้าง • กดปุ่มแดง B2 (STOP) แล้วต้องดับและไม่ติดกลับเอง',
      goalEn: 'Tap green B1 (START) and release — lamp L1 must stay on • press red B2 (STOP) and it must drop out and stay off',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'button', tt: 'no', id: 'B1' }, { t: 'button', tt: 'nc', id: 'B2' },
              { t: 'lamp', color: 'red', id: 'L1' }],
      steps: [
        { set: {}, expect: { K1: false, L1: false },
          th: 'ยังไม่กดอะไร → ทุกอย่างดับ', en: 'Nothing pressed → all off' },
        { set: { B1: 1 }, expect: { K1: true, L1: true },
          th: 'กด START (B1) ค้างไว้ → K1 ทำงาน, L1 ติด', en: 'Hold START (B1) → K1 energized, L1 lit' },
        { set: {}, expect: { K1: true, L1: true },
          th: 'ปล่อย START → ต้องยังติดค้าง (นี่คือหัวใจของวงจรล็อกตัวเอง)', en: 'Release START → must stay on (this is the seal-in)' },
        { set: { B2: 1 }, expect: { K1: false, L1: false },
          th: 'กด STOP (B2) → ต้องดับ', en: 'Press STOP (B2) → must drop out' },
        { set: {}, expect: { K1: false, L1: false },
          th: 'ปล่อย STOP → ต้องยังดับ (ห้ามติดกลับเอง)', en: 'Release STOP → must stay off (no self-restart)' }
      ] },
    { id: 'mAnd',
      th: '4. ลอจิก AND (ต้องครบทั้งสองสวิตช์)',
      en: '4. AND logic (needs both switches)',
      goalTh: 'ไฟ L1 ติดก็ต่อเมื่อ S1 และ S2 เปิดพร้อมกันเท่านั้น โดยให้ K1 เป็นตัวขับไฟผ่านหน้าสัมผัส NO',
      goalEn: 'Lamp L1 lights only when S1 AND S2 are both on, with K1 driving the lamp through an NO contact',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'switch', id: 'S1' }, { t: 'switch', id: 'S2' },
              { t: 'lamp', color: 'red', id: 'L1' }],
      links: [{ th: 'ไฟ L1 ต้องต่ออยู่กับขา NO ของ K1 (ขา 5–8)', en: 'Lamp L1 must land on a K1 NO pin (5–8)',
                from: 'L1', to: 'K1', pins: ['5', '6', '7', '8'] }],
      steps: [
        { set: {}, expect: { L1: false }, th: 'S1=ปิด S2=ปิด → ดับ', en: 'S1 off, S2 off → off' },
        { set: { S1: 1 }, expect: { L1: false }, th: 'S1=เปิด S2=ปิด → ต้องยังดับ', en: 'S1 on, S2 off → still off' },
        { set: { S2: 1 }, expect: { L1: false }, th: 'S1=ปิด S2=เปิด → ต้องยังดับ', en: 'S1 off, S2 on → still off' },
        { set: { S1: 1, S2: 1 }, expect: { K1: true, L1: true }, th: 'เปิดทั้งคู่ → ติด', en: 'Both on → lit' }
      ] },
    { id: 'mOr',
      th: '5. ลอจิก OR (ตัวใดตัวหนึ่งก็พอ)',
      en: '5. OR logic (either switch)',
      goalTh: 'ไฟ L1 ติดเมื่อ S1 หรือ S2 เปิด (ตัวใดตัวหนึ่งหรือทั้งคู่) โดยขับผ่านหน้าสัมผัส NO ของ K1',
      goalEn: 'Lamp L1 lights when S1 or S2 is on (either or both), driven through a K1 NO contact',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'switch', id: 'S1' }, { t: 'switch', id: 'S2' },
              { t: 'lamp', color: 'red', id: 'L1' }],
      links: [{ th: 'ไฟ L1 ต้องต่ออยู่กับขา NO ของ K1 (ขา 5–8)', en: 'Lamp L1 must land on a K1 NO pin (5–8)',
                from: 'L1', to: 'K1', pins: ['5', '6', '7', '8'] }],
      steps: [
        { set: {}, expect: { L1: false }, th: 'ปิดทั้งคู่ → ดับ', en: 'Both off → off' },
        { set: { S1: 1 }, expect: { L1: true }, th: 'เปิดเฉพาะ S1 → ติด', en: 'Only S1 on → lit' },
        { set: { S2: 1 }, expect: { L1: true }, th: 'เปิดเฉพาะ S2 → ติด', en: 'Only S2 on → lit' },
        { set: { S1: 1, S2: 1 }, expect: { L1: true }, th: 'เปิดทั้งคู่ → ติด', en: 'Both on → lit' },
        { set: {}, expect: { L1: false }, th: 'ปิดทั้งคู่ → ดับ', en: 'Both off → off' }
      ] },
    { id: 'mInter',
      th: '6. อินเตอร์ล็อก: ห้ามทำงานพร้อมกัน',
      en: '6. Interlock: never both at once',
      goalTh: 'K1 กับ K2 ต้องไม่ทำงานพร้อมกัน — ใครมาก่อนได้ก่อน และล็อกอีกตัวไว้ (ใช้หน้าสัมผัส NC ไขว้กัน) โดย L1 ตาม K1 และ L2 ตาม K2',
      goalEn: 'K1 and K2 must never be on together — first come, first served, each locking the other out via cross-wired NC contacts, with L1 following K1 and L2 following K2',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'relay', id: 'K2' }, { t: 'switch', id: 'S1' }, { t: 'switch', id: 'S2' },
              { t: 'lamp', color: 'red', id: 'L1' }, { t: 'lamp', color: 'green', id: 'L2' }],
      steps: [
        { set: {}, expect: { K1: false, K2: false, L1: false, L2: false },
          th: 'ปิดทั้งคู่ → ดับหมด', en: 'Both off → all off' },
        { set: { S1: 1 }, expect: { K1: true, K2: false, L1: true, L2: false },
          th: 'เปิด S1 ก่อน → K1 ทำงาน (L1 ติด), K2 ต้องไม่ทำงาน', en: 'S1 first → K1 on (L1 lit), K2 must stay off' },
        { set: { S1: 1, S2: 1 }, expect: { K1: true, K2: false, L2: false },
          th: 'เปิด S2 เพิ่มทั้งที่ K1 ทำงานอยู่ → K2 ต้องถูกล็อกไว้ (L2 ดับ)', en: 'Add S2 while K1 is on → K2 must stay locked out (L2 off)' },
        { set: { S2: 1 }, expect: { K1: false, K2: true, L1: false, L2: true },
          th: 'ปิด S1 เหลือ S2 → คราวนี้ K2 ทำงานได้ (L2 ติด), K1 ดับ', en: 'Drop S1, keep S2 → now K2 may work (L2 lit), K1 off' },
        { set: {}, expect: { K1: false, K2: false },
          th: 'ปิดทั้งคู่ → ดับหมด', en: 'Both off → all off' }
      ] },
    { id: 'mFwdRev',
      th: '7. กลับทางหมุนมอเตอร์ (FWD/REV) + อินเตอร์ล็อก',
      en: '7. Motor forward/reverse with interlock',
      goalTh: 'B1=FWD, B2=REV (กดแล้วต้องล็อกตัวเองเดินค้าง), B3=STOP • มอเตอร์ M1 ต้องกลับทางหมุนได้ และห้ามกด REV แล้วสลับทางทันทีขณะกำลังเดินหน้า (ต้องกด STOP ก่อน) — ใช้หน้าสัมผัส NC ไขว้กันล็อก',
      goalEn: 'B1=FWD, B2=REV (each must seal in), B3=STOP • motor M1 must run both ways, and pressing REV while running forward must do nothing (STOP first) — lock them out with cross-wired NC contacts',
      parts: [{ t: 'relay', id: 'K1' }, { t: 'relay', id: 'K2' },
              { t: 'button', tt: 'no', id: 'B1' }, { t: 'button', tt: 'no', id: 'B2' }, { t: 'button', tt: 'nc', id: 'B3' },
              { t: 'motor', id: 'M1' }],
      steps: [
        { set: {}, expect: { M1: 'stop' }, th: 'ยังไม่กดอะไร → มอเตอร์หยุด', en: 'Nothing pressed → motor stopped' },
        { set: { B1: 1 }, expect: { K1: true, M1: 'fwd' }, th: 'กด FWD (B1) → เดินหน้า', en: 'Press FWD (B1) → runs forward' },
        { set: {}, expect: { K1: true, M1: 'fwd' }, th: 'ปล่อยปุ่ม → ต้องเดินหน้าค้าง (ล็อกตัวเอง)', en: 'Release → must keep running forward (seal-in)' },
        { set: { B2: 1 }, expect: { K2: false, M1: 'fwd' }, th: 'กด REV ขณะเดินหน้า → ต้องไม่มีอะไรเปลี่ยน (อินเตอร์ล็อก)', en: 'Press REV while running forward → nothing may change (interlock)' },
        { set: { B3: 1 }, expect: { K1: false, K2: false, M1: 'stop' }, th: 'กด STOP → หยุดทั้งหมด', en: 'Press STOP → everything stops' },
        { set: { B2: 1 }, expect: { K2: true, M1: 'rev' }, th: 'กด REV หลังหยุดแล้ว → หมุนถอยหลัง', en: 'Press REV after stopping → runs in reverse' },
        { set: {}, expect: { K2: true, M1: 'rev' }, th: 'ปล่อยปุ่ม → ถอยหลังค้าง', en: 'Release → keeps running in reverse' },
        { set: { B3: 1 }, expect: { M1: 'stop' }, th: 'กด STOP → หยุด', en: 'Press STOP → stops' }
      ] }
  ];

  function missionById(id){ for (var i = 0; i < MISSIONS.length; i++) if (MISSIONS[i].id === id) return MISSIONS[i]; return null; }
  function compById(id){ for (var i = 0; i < comps.length; i++) if (comps[i].id === id) return comps[i]; return null; }

  /* union-find เฉพาะสายจัมเปอร์ — ใช้ตรวจว่าปลายสองจุดเป็นโหนดเดียวกันไหม */
  function wireNodes(){
    var par = {};
    function find(k){
      if (par[k] === undefined) par[k] = k;
      while (par[k] !== k){ par[k] = par[par[k]]; k = par[k]; }
      return k;
    }
    wires.forEach(function(w){ var a = find(keyOf(w.a)), b = find(keyOf(w.b)); if (a !== b) par[a] = b; });
    return { same: function(a, b){ return find(a) === find(b); } };
  }

  /* อุปกรณ์ตัวนี้ "ทำงาน" อยู่ไหม (ไฟติด / บัซเซอร์ดัง / รีเลย์ดึงเข้า) */
  /* มอเตอร์คืน 'fwd'/'rev'/'stop' (โจทย์ต้องเขียน expect เป็นสตริง), ที่เหลือคืน true/false */
  function compActive(id, res){
    var c = compById(id), r = res.comps[id];
    if (!c || !r) return false;
    if (c.t === 'lamp') return r.bright > 0.15;
    if (c.t === 'buzzer') return !!r.on;
    if (c.t === 'relay') return !!r.en;
    if (c.t === 'motor') return r.dir > 0 ? 'fwd' : r.dir < 0 ? 'rev' : 'stop';
    return false;
  }
  function stateWord(id, on, en){
    var c = compById(id);
    if (c && c.t === 'motor'){
      if (on === 'fwd') return en ? 'running forward' : 'หมุนเดินหน้า';
      if (on === 'rev') return en ? 'running in reverse' : 'หมุนถอยหลัง';
      return en ? 'stopped' : 'หยุด';
    }
    if (c && c.t === 'lamp') return en ? (on ? 'lit' : 'off') : (on ? 'ติด' : 'ดับ');
    if (c && c.t === 'buzzer') return en ? (on ? 'sounding' : 'silent') : (on ? 'ดัง' : 'เงียบ');
    return en ? (on ? 'energized' : 'off') : (on ? 'ทำงาน' : 'ไม่ทำงาน');
  }

  /* ตรวจภารกิจ: ไล่กดสวิตช์/ปุ่มตามสคริปต์แล้ว solve ทีละขั้น จากนั้นคืนสถานะเดิมให้ผู้เรียน */
  function gradeMission(m){
    var out = { ok: false, blocked: null, blockedEn: null, lines: [] };
    var miss = m.parts.filter(function(p){
      var c = compById(p.id);
      return !c || c.t !== p.t || (p.color && c.color !== p.color) || (p.tt && c.tt !== p.tt);
    });
    if (miss.length){
      out.blocked = 'ยังไม่มีอุปกรณ์ครบ (ขาด ' + miss.map(function(p){ return p.id; }).join(', ') + ') — กดปุ่ม "เตรียมอุปกรณ์" แล้วเดินสายเอง';
      out.blockedEn = 'Parts are missing (' + miss.map(function(p){ return p.id; }).join(', ') + ') — press "Set up parts", then do the wiring';
      return out;
    }
    if (!wires.length){
      out.blocked = 'ยังไม่ได้เดินสายเลย — กด "เดินสาย" แล้วคลิกจุดต่อทีละคู่';
      out.blockedEn = 'Nothing is wired yet — press "Wire", then click terminals in pairs';
      return out;
    }
    // เงื่อนไขเชิงโครงสร้าง (เช่น ไฟต้องผ่านหน้าสัมผัส ไม่ใช่ต่อสวิตช์ตรงๆ)
    var nf = wireNodes(), i, j;
    for (i = 0; i < (m.links || []).length; i++){
      var lk = m.links[i], hit = false;
      ['a', 'b'].forEach(function(p){
        lk.pins.forEach(function(pin){ if (nf.same(lk.from + ':' + p, lk.to + ':' + pin)) hit = true; });
      });
      if (!hit){ out.blocked = lk.th; out.blockedEn = lk.en; return out; }
    }

    var snap = comps.map(function(c){ return { c: c, on: !!c.on, pressed: !!c.pressed, en: !!c._en }; });
    comps.forEach(function(c){ c.on = false; c.pressed = false; if (c.t === 'relay') c._en = false; });
    function sim(){
      return solveRelayLab([SUPC].concat(comps), wires.map(function(w){ return { a: keyOf(w.a), b: keyOf(w.b) }; }));
    }
    sim();  // ตั้งต้นให้นิ่งก่อนเริ่มไล่ขั้น
    var allOk = true, shorted = false;
    m.steps.forEach(function(st){
      comps.forEach(function(c){
        if (c.t === 'switch') c.on = !!(st.set && st.set[c.id]);
        else if (c.t === 'button') c.pressed = !!(st.set && st.set[c.id]);
      });
      var res = sim();
      if (res.shorted) shorted = true;
      var bad = [];
      for (var id in st.expect){
        var got = compActive(id, res), want = st.expect[id];
        var okId = typeof want === 'string' ? got === want : got === !!want;
        if (!okId) bad.push({ id: id, got: got });
      }
      if (bad.length) allOk = false;
      out.lines.push({
        ok: !bad.length, th: st.th, en: st.en,
        gotTh: bad.map(function(b){ return b.id + ' ' + stateWord(b.id, b.got, false); }).join(', '),
        gotEn: bad.map(function(b){ return b.id + ' ' + stateWord(b.id, b.got, true); }).join(', ')
      });
    });
    snap.forEach(function(s){ s.c.on = s.on; s.c.pressed = s.pressed; if (s.c.t === 'relay') s.c._en = s.en; });
    requestSolve();
    out.ok = allOk && !shorted;
    out.shorted = shorted;
    return out;
  }

  /* ---- UI ของภารกิจ ---- */
  var misSel = document.getElementById('rly-mission-sel');
  var misBox = document.getElementById('rly-mission');
  var curMission = null;
  function biSpan(parent, th, en, cls){
    var a = document.createElement('span'); a.className = 'th-only' + (cls ? ' ' + cls : ''); a.textContent = th;
    var b = document.createElement('span'); b.className = 'en-only' + (cls ? ' ' + cls : ''); b.textContent = en;
    parent.appendChild(a); parent.appendChild(b);
    return parent;
  }
  function partWord(p, en){
    if (p.t === 'relay') return en ? 'relay' : 'รีเลย์';
    if (p.t === 'switch') return en ? 'switch' : 'สวิตช์';
    if (p.t === 'button') return (en ? 'button ' : 'ปุ่มกด ') + (p.tt === 'nc' ? 'NC' : 'NO');
    if (p.t === 'lamp'){
      var cth = { red: 'แดง', green: 'เขียว', yellow: 'เหลือง' }[p.color] || p.color;
      return en ? (p.color + ' lamp') : ('ไฟ' + cth);
    }
    if (p.t === 'motor') return en ? 'motor' : 'มอเตอร์';
    return en ? 'buzzer' : 'บัซเซอร์';
  }
  function renderMission(res){
    if (!misBox) return;
    misBox.innerHTML = '';
    if (!curMission){ misBox.hidden = true; return; }
    misBox.hidden = false;
    var m = curMission;
    var goal = document.createElement('div');
    goal.className = 'rly-mis-goal';
    biSpan(goal, '🎯 ' + m.goalTh, '🎯 ' + m.goalEn);
    misBox.appendChild(goal);
    var parts = document.createElement('div');
    parts.className = 'rly-mis-parts';
    biSpan(parts,
      'อุปกรณ์ที่ใช้: ' + m.parts.map(function(p){ return p.id + ' (' + partWord(p, false) + ')'; }).join(' • '),
      'Parts: ' + m.parts.map(function(p){ return p.id + ' (' + partWord(p, true) + ')'; }).join(' • '));
    misBox.appendChild(parts);
    if (!res) return;
    if (res.blocked){
      var warn = document.createElement('div');
      warn.className = 'rly-mis-line bad';
      biSpan(warn, '✗ ' + res.blocked, '✗ ' + res.blockedEn);
      misBox.appendChild(warn);
      return;
    }
    res.lines.forEach(function(l){
      var d = document.createElement('div');
      d.className = 'rly-mis-line ' + (l.ok ? 'good' : 'bad');
      biSpan(d, (l.ok ? '✓ ' : '✗ ') + l.th + (l.ok ? '' : ' — แต่ได้: ' + l.gotTh),
                (l.ok ? '✓ ' : '✗ ') + l.en + (l.ok ? '' : ' — got: ' + l.gotEn));
      misBox.appendChild(d);
    });
    var sum = document.createElement('div');
    sum.className = 'rly-mis-verdict ' + (res.ok ? 'good' : 'bad');
    if (res.ok) biSpan(sum, '🎉 ผ่านทุกขั้น! วงจรทำงานถูกต้องตามโจทย์', '🎉 All steps passed! The circuit behaves exactly as asked');
    else if (res.shorted) biSpan(sum, '⚠ ยังไม่ผ่าน — และมีจุดลัดวงจรระหว่างทดสอบ ลองไล่สายที่ต่อคร่อม +24V กับ 0V',
                                     '⚠ Not passed — and a short circuit appeared during the test; look for a wire bridging +24V and 0V');
    else biSpan(sum, '⚠ ยังไม่ผ่าน — ดูขั้นที่ ✗ แล้วแก้สายอีกที', '⚠ Not passed yet — check the ✗ steps and rework the wiring');
    misBox.appendChild(sum);
  }
  function prepareMission(m){
    resetBoard();
    curExample = null; selected = null;
    m.parts.forEach(function(p){
      if (p.t === 'relay') mkRelay(freeSlot(relaySlots));
      else if (p.t === 'switch') mkSwitch(freeSlot(botSlots));
      else if (p.t === 'button') mkButton(freeSlot(botSlots), p.tt);
      else if (p.t === 'lamp') mkLamp(freeSlot(botSlots), p.color);
      else if (p.t === 'buzzer') mkBuzz(freeSlot(botSlots));
      else if (p.t === 'motor') mkMotor(freeSlot(botSlots));
    });
    setMode('normal');
    renderAll();
    hint('วางอุปกรณ์ให้แล้ว — เดินสายเองตามโจทย์ แล้วกด "ตรวจคำตอบ"',
         'Parts are on the panel — wire them up to meet the goal, then press "Check"');
  }

  function clearAll(){
    resetBoard();
    curExample = null; selected = null;
    setMode('normal');
    renderAll();
  }

  /* ---- persistence: แชร์ลิงก์ (?c=) + บันทึก/โหลด (localStorage) ---- */
  var SAVE_KEY = 'rly-saves';
  var modal = document.getElementById('rly-modal');
  function isEn(){ return document.documentElement.lang === 'en'; }
  function b64urlEncode(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64urlDecode(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }

  function serializeCircuit(){
    return {
      v: 1,
      comps: comps.map(function(c){
        var o = { id: c.id, t: c.t, slot: c.slot };
        if (c.t === 'switch') o.on = !!c.on;
        else if (c.t === 'button') o.tt = c.tt;
        else if (c.t === 'lamp') o.color = c.color;
        return o;
      }),
      wires: wires.map(function(w){ return { a: w.a, b: w.b, c: w.color }; })
    };
  }
  function loadCircuit(data){
    if (!data || !Array.isArray(data.comps) || !Array.isArray(data.wires)) return false;
    var ok = data.comps.every(function(o){
      return o && typeof o.id === 'string' && ['relay', 'switch', 'button', 'lamp', 'buzzer', 'motor'].indexOf(o.t) >= 0 && typeof o.slot === 'number';
    }) && data.wires.every(function(w){ return w && typeof w.a === 'string' && typeof w.b === 'string'; });
    if (!ok) return false;
    resetBoard();
    data.comps.forEach(function(o){
      var c = { id: o.id, t: o.t, slot: o.slot };
      if (o.t === 'relay'){ c._en = false; c._dispA = 0; if (o.slot >= 0 && o.slot < relaySlots.length) relaySlots[o.slot] = c; }
      else if (o.slot >= 0 && o.slot < botSlots.length) botSlots[o.slot] = c;
      if (o.t === 'switch') c.on = !!o.on;
      else if (o.t === 'button'){ c.tt = o.tt === 'nc' ? 'nc' : 'no'; c.pressed = false; }
      else if (o.t === 'lamp') c.color = o.color || 'red';
      comps.push(c);
      var pfx = String(o.id).charAt(0), num = parseInt(String(o.id).slice(1), 10) || 0;
      if (pfx === 'K') nextK = Math.max(nextK, num + 1);
      else if (pfx === 'S') nextS = Math.max(nextS, num + 1);
      else if (pfx === 'B') nextB = Math.max(nextB, num + 1);
      else if (pfx === 'L') nextL = Math.max(nextL, num + 1);
      else if (pfx === 'Z') nextZ = Math.max(nextZ, num + 1);
    });
    wires = data.wires.map(function(w){ return { a: String(w.a), b: String(w.b), color: w.c || 'black', _off: 0 }; });
    curExample = null; selected = null;
    return true;
  }

  function shareLink(){
    var url = location.origin + location.pathname + '?c=' + b64urlEncode(JSON.stringify(serializeCircuit()));
    history.replaceState(null, '', url);
    var inBar = 'ลิงก์อยู่ในแถบที่อยู่แล้ว — คัดลอกเพื่อแชร์', inBarEn = 'The link is in the address bar — copy it to share';
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(
        function(){ hint('คัดลอกลิงก์วงจรแล้ว! วางเพื่อแชร์ (อยู่ในแถบที่อยู่ด้วย)', 'Circuit link copied! Paste to share (also in the address bar)'); },
        function(){ hint(inBar, inBarEn); });
    } else { hint(inBar, inBarEn); }
  }

  function getSaves(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e){ return {}; } }
  function setSaves(o){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(o)); } catch (e){} }
  function openModal(){ modal.hidden = false; }
  function closeModal(){ modal.hidden = true; }
  function renderSaveList(container){
    var saves = getSaves(), names = Object.keys(saves).sort(), en = isEn();
    container.innerHTML = '';
    if (!names.length){
      var e = document.createElement('div'); e.className = 'rly-modal-empty';
      e.textContent = en ? 'No saved circuits yet' : 'ยังไม่มีวงจรที่บันทึกไว้';
      container.appendChild(e); return;
    }
    var ul = document.createElement('ul'); ul.className = 'rly-savelist';
    names.forEach(function(name){
      var li = document.createElement('li');
      var sp = document.createElement('span'); sp.textContent = name; li.appendChild(sp);
      var lb = document.createElement('button'); lb.className = 'rly-btn'; lb.type = 'button'; lb.textContent = en ? 'Load' : 'โหลด';
      lb.addEventListener('click', function(){
        if (loadCircuit(saves[name])){ setMode('normal'); renderAll(); closeModal(); hint('โหลดวงจร "' + name + '" แล้ว', 'Loaded circuit "' + name + '"'); }
      });
      var db = document.createElement('button'); db.className = 'rly-btn rly-sv-del'; db.type = 'button'; db.textContent = '🗑';
      db.addEventListener('click', function(){ var s = getSaves(); delete s[name]; setSaves(s); renderSaveList(container); });
      li.appendChild(lb); li.appendChild(db); ul.appendChild(li);
    });
    container.appendChild(ul);
  }
  function showSaveModal(){
    var en = isEn();
    document.getElementById('rly-modal-title').textContent = en ? 'Save circuit' : 'บันทึกวงจร';
    var body = document.getElementById('rly-modal-body'); body.innerHTML = '';
    var row = document.createElement('div'); row.className = 'rly-save-row';
    var inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 40; inp.placeholder = en ? 'Name this circuit…' : 'ตั้งชื่อวงจร…';
    var btn = document.createElement('button'); btn.className = 'rly-btn active'; btn.type = 'button'; btn.textContent = en ? 'Save' : 'บันทึก';
    row.appendChild(inp); row.appendChild(btn); body.appendChild(row);
    var listWrap = document.createElement('div'); body.appendChild(listWrap);
    function save(){
      var name = inp.value.trim(); if (!name){ inp.focus(); return; }
      var saves = getSaves(); saves[name] = serializeCircuit(); setSaves(saves);
      inp.value = ''; renderSaveList(listWrap);
      hint('บันทึกวงจร "' + name + '" แล้ว', 'Saved circuit "' + name + '"');
    }
    btn.addEventListener('click', save);
    inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') save(); });
    renderSaveList(listWrap); openModal(); inp.focus();
  }
  function showLoadModal(){
    document.getElementById('rly-modal-title').textContent = isEn() ? 'Load circuit' : 'โหลดวงจร';
    var body = document.getElementById('rly-modal-body'); body.innerHTML = '';
    renderSaveList(body); openModal();
  }

  function loadFromURL(){
    if (typeof location === 'undefined' || !location.search) return false;
    var m = /[?&]c=([^&]+)/.exec(location.search);
    if (!m) return false;
    var data = null;
    try { data = JSON.parse(b64urlDecode(m[1])); } catch (e){ data = null; }
    if (data && loadCircuit(data)){
      setMode('normal'); renderAll();
      hint('โหลดวงจรจากลิงก์ที่แชร์แล้ว — แก้ไข/ทดลองต่อได้เลย', 'Loaded the shared circuit from the link — edit or experiment away');
      return true;
    }
    // ลิงก์เสีย: ห้ามล้มเงียบ — แจ้งเตือน + แสดงตัวอย่างแทน
    loadExampleById('basic');
    hint('⚠ ลิงก์วงจรไม่ถูกต้องหรือเสียหาย — แสดงวงจรตัวอย่างแทน', '⚠ The circuit link is invalid or corrupted — showing an example instead', true);
    return true;
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
    if (load.t === 'motor') return !!r.run && (!load.dir || r.dir === load.dir);
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
    } else if (load.t === 'motor'){
      col = live ? '#0284c7' : SCH_DEAD;
      el('circle', { cx: cx, cy: cy, r: 15, fill: live ? '#bae6fd' : 'none', stroke: col, 'stroke-width': 3 }, parent);
      var tm = el('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', 'class': 'rly-schlbl rly-bold', fill: col }, parent);
      tm.textContent = 'M';
      var tm2 = el('text', { x: cx + 26, y: cy + 5, 'text-anchor': 'start', 'class': 'rly-schlbl' }, parent);
      tm2.textContent = load.c;
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
    selected = null;
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
  document.getElementById('rly-add-motor').addEventListener('click', function(){ setMode('normal'); addMotor(); });
  document.getElementById('rly-wire-btn').addEventListener('click', function(){ setMode(mode === 'wire' ? 'normal' : 'wire'); });
  document.getElementById('rly-del-btn').addEventListener('click', function(){ setMode(mode === 'delete' ? 'normal' : 'delete'); });
  document.getElementById('rly-clear-btn').addEventListener('click', clearAll);
  document.getElementById('rly-view-btn').addEventListener('click', function(){ setView(view === 'panel' ? 'schematic' : 'panel'); });
  document.getElementById('rly-save-btn').addEventListener('click', showSaveModal);
  document.getElementById('rly-load-btn').addEventListener('click', showLoadModal);
  document.getElementById('rly-share-btn').addEventListener('click', shareLink);
  document.getElementById('rly-modal-x').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
  var exSel = document.getElementById('rly-example-sel');
  EX.forEach(function(ex, i){
    var o = document.createElement('option');
    o.value = ex.id;
    o.setAttribute('data-th', (i + 1) + '. ' + ex.th);
    o.setAttribute('data-en', (i + 1) + '. ' + ex.en);
    o.textContent = (i + 1) + '. ' + ex.th;
    exSel.appendChild(o);
  });
  MISSIONS.forEach(function(m){
    var o = document.createElement('option');
    o.value = m.id;
    o.setAttribute('data-th', m.th);
    o.setAttribute('data-en', m.en);
    o.textContent = m.th;
    misSel.appendChild(o);
  });
  function syncBiOptions(sel){
    var en = document.documentElement.lang === 'en';
    Array.prototype.forEach.call(sel.options, function(o){
      if (o.getAttribute('data-th')) o.textContent = en ? o.getAttribute('data-en') : o.getAttribute('data-th');
    });
  }
  function syncExOptions(){ syncBiOptions(exSel); syncBiOptions(misSel); }
  syncExOptions();
  exSel.addEventListener('change', function(){ loadExampleById(exSel.value); });
  misSel.addEventListener('change', function(){
    curMission = missionById(misSel.value);
    document.getElementById('rly-mission-prep').disabled = !curMission;
    document.getElementById('rly-mission-check').disabled = !curMission;
    renderMission(null);
    if (curMission) hint('อ่านโจทย์แล้วกด "เตรียมอุปกรณ์" เพื่อวางอุปกรณ์ที่ต้องใช้ (ล้างแผงปัจจุบัน) จากนั้นเดินสายเอง',
                         'Read the goal, then press "Set up parts" to place what you need (this clears the panel) and wire it yourself');
  });
  document.getElementById('rly-mission-prep').addEventListener('click', function(){
    if (curMission){ prepareMission(curMission); renderMission(null); }
  });
  document.getElementById('rly-mission-check').addEventListener('click', function(){
    if (curMission) renderMission(gradeMission(curMission));
  });
  // nav.js ยิง langchange ที่ document (ไม่ bubble) — ต้องดักที่ document ไม่ใช่ window
  document.addEventListener('langchange', function(){ syncExOptions(); if (view === 'schematic') drawSchematic(); });
  svg.addEventListener('click', function(){ clearSelection(); });   // คลิกที่ว่าง = ยกเลิกการเลือก
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape'){
      if (pendingTid){ if (termEls[pendingTid]) termEls[pendingTid].classList.remove('pending'); pendingTid = null; defaultHint(); }
      else if (selected){ clearSelection(); }
      else if (mode !== 'normal') setMode('normal');
    }
  });

  /* ---- init ---- */
  if (!loadFromURL()){ loadExampleById('basic'); exSel.value = 'basic'; }
  window.addEventListener('keydown', function(ev){ if (ev.key === 'Escape' && !modal.hidden) closeModal(); });
  requestAnimationFrame(frame);
})();
