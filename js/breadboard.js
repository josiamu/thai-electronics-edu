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

// diode family variants (all internally type 'diode'; LED is its own type)
// zener additionally conducts in reverse once |V| reaches Vz
var DIODE_TYPES = {
  silicon:   { vf:0.7,  rd:8,  th:'ซิลิคอน',     en:'Silicon',   border:'#334155' },
  germanium: { vf:0.3,  rd:12, th:'เจอร์เมเนียม', en:'Germanium', border:'#92400e' },
  schottky:  { vf:0.25, rd:6,  th:'ชอตต์กี',     en:'Schottky',  border:'#7c3aed' },
  zener:     { vf:0.7,  rd:8,  th:'ซีเนอร์',      en:'Zener',     border:'#16a34a' },
  // TVS (unidirectional): conducts forward like silicon, clamps in reverse at V_BR (fast surge
  // protection). Electrically the same reverse-breakdown model as a zener, so it reuses c.vz.
  tvs:       { vf:0.7,  rd:6,  th:'ทีวีเอส',      en:'TVS',       border:'#e11d48' }
};
var ZENER_VZ = [3.3, 4.7, 5.1, 6.2, 9.1, 12];
function diodeRd(c){ return c.type === 'led' ? LED_RD : (c.rd || DIODE_RD); }
// diode variants that also conduct in reverse once |V| reaches the breakdown/clamp voltage (c.vz)
function hasReverseClamp(c){ return c.variant === 'zener' || c.variant === 'tvs'; }

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

// jumper-wire colours (cosmetic only — all wires are still 0 Ω)
var WIRE_COLORS = {
  green:  { hex:'#16a34a', th:'เขียว',   en:'Green' },
  red:    { hex:'#ef4444', th:'แดง',     en:'Red' },
  black:  { hex:'#1f2937', th:'ดำ',      en:'Black' },
  blue:   { hex:'#3b82f6', th:'น้ำเงิน', en:'Blue' },
  yellow: { hex:'#eab308', th:'เหลือง',  en:'Yellow' },
  orange: { hex:'#f97316', th:'ส้ม',     en:'Orange' },
  white:  { hex:'#f1f5f9', th:'ขาว',     en:'White' }
};
function wireHex(c){ return (WIRE_COLORS[c && c.color] || WIRE_COLORS.green).hex; }

// pushbutton cap colours (cosmetic) — `dark` is the pressed shade, so the cap still reads as
// "sunk in" whichever colour it is. Old saved buttons have no colour and fall back to red.
var BTN_COLORS = {
  green: { hex:'#22c55e', dark:'#15803d', th:'เขียว',   en:'Green' },
  red:   { hex:'#ef4444', dark:'#b91c1c', th:'แดง',     en:'Red' },
  blue:  { hex:'#3b82f6', dark:'#1d4ed8', th:'น้ำเงิน', en:'Blue' }
};
function btnColor(c){ return BTN_COLORS[c && c.color] || BTN_COLORS.red; }

// reactive parts (transient simulation via Backward-Euler companion models)
var CAP_OPTIONS = [1e-6, 10e-6, 47e-6, 100e-6, 220e-6, 470e-6, 1000e-6, 2200e-6];  // Farads
var IND_OPTIONS = [1e-3, 10e-3, 100e-3, 0.5, 1, 5, 10];                            // Henries
var CAP_DEFAULT = 470e-6, IND_DEFAULT = 1;
function fmtC(F){ return Math.round(F * 1e6) + ' µF'; }
function fmtL(H){ return H < 1 ? Math.round(H * 1000) + ' mH' : H + ' H'; }
function fmtTime(s){
  if (s < 1e-3) return (s * 1e6).toFixed(0) + ' µs';
  if (s < 1)    return (s * 1e3).toFixed(s < 0.1 ? 1 : 0) + ' ms';
  return s.toFixed(2) + ' s';
}

// transistors — 3-terminal parts. one type 'transistor' with subtype tt.
// pins map onto the component as: a = collector/drain, b = emitter/source, g = base/gate.
// kind 'bjt' uses β (current gain); kind 'fet' uses Vth (threshold).
var TRANSISTOR_TYPES = {
  npn:  { th:'NPN',       en:'NPN',       ref:'2N2222', kind:'bjt', border:'#dc2626' },
  pnp:  { th:'PNP',       en:'PNP',       ref:'2N2907', kind:'bjt', border:'#2563eb' },
  nmos: { th:'N-MOSFET',  en:'N-MOSFET',  ref:'2N7000', kind:'fet', border:'#16a34a' },
  pmos: { th:'P-MOSFET',  en:'P-MOSFET',  ref:'(P-ch)', kind:'fet', border:'#9333ea' }
};
var BETA_OPTIONS = [50, 100, 200, 300];
var VTH_OPTIONS  = [1, 2, 3, 4];
var BETA_DEFAULT = 100, VTH_DEFAULT = 2;
// large-signal model constants (educational; values chosen for stable region detection)
var BJT_VBE = 0.7,        // base-emitter turn-on (forward drop)
    BJT_VBE_ON = 0.6,     // B-E junction "on" threshold for region detection
    BJT_VCE_SAT = 0.2,    // collector-emitter saturation voltage
    BJT_RBE = 35,         // B-E on-resistance (companion)
    BJT_RSAT = 6;         // C-E resistance in saturation
// avalanche / relaxation-oscillator mode for a BJT (c.av === true, base ignored). Off = open;
// once |Vce| reaches the breakdown voltage V_BR it "fires" into a low-resistance state that dumps
// whatever charge is on the collector node, then extinguishes when its current falls below the
// holding current. That voltage-trigger + current-hold hysteresis, fed by an RC, is a relaxation
// oscillator → a self-blinking LED flasher. The latch (t._av) is memory: it flips at most once per
// committed transient step (not inside the region loop), so the solver stays stable.
var AV_VBR_OPTIONS = [5, 6, 8, 10, 12],
    AV_VBR_DEFAULT = 8,   // breakdown/trigger voltage (V) — editable per device
    AV_RON = 300,         // fired-state C-E resistance (companion) — small enough to flash brightly,
                          // large enough that the peak dump current clears the holding current
    AV_IHOLD = 0.012,     // holding current: extinguishes once |I| drops below this (A)
    AV_GOFF = 1e-12;      // off-state leakage — tiny so the collector floats to ~0 (defines |Vce| = Vcap)
// MOSFET square-law model (educational): all in device coords (Vth = magnitude)
//   triode  (Vds < Vov):  Id = k·(Vov·Vds − ½Vds²)
//   sat     (Vds ≥ Vov):  Id = ½·k·Vov²·(1 + λ·Vds)        where Vov = Vgs − Vth
var MOS_K = 0.05,         // transconductance parameter (A/V²) — ~2N7000-class
    MOS_LAMBDA = 0.02;    // channel-length modulation (1/V) → finite output resistance in saturation
// optocoupler (PC817-style) — 4-terminal: input IR LED (a=anode, b=cathode) drives an
// electrically isolated phototransistor (g=collector, h=emitter) via light: IC = CTR·IF,
// saturating like a BJT (reuses BJT_VCE_SAT / BJT_RSAT for the output clamp)
var OPTO_VF = 1.1,        // input IR-LED forward drop
    OPTO_RD = 14,         // input LED on-resistance (companion)
    CTR_OPTIONS = [50, 100, 200, 300],
    CTR_DEFAULT = 100;
// relay (SPDT electromechanical) — 5-terminal: coil (a=+, b=−) magnetically drives a single-pole
// double-throw contact set (g=COM, h=NO, k=NC). Simplified DC model: the coil is a fixed resistor;
// once the coil voltage reaches the pull-in threshold the armature latches "energized" (COM→NO),
// releasing back to COM→NC only when the voltage falls below the lower drop-out level (hysteresis,
// same latch idea as the avalanche BJT). A closed contact is a near-0 Ω conductance stamped inside
// the nonlinear loop (not a union-find join) because its state depends on the solved coil voltage.
var RELAY_RCOIL = 200,     // coil resistance (Ω)
    RELAY_VPULL = 3.0,     // pull-in coil voltage — energize at/above this
    RELAY_VDROP = 1.2,     // drop-out coil voltage — release below this (VPULL>VDROP ⇒ hysteresis)
    RELAY_RON   = 0.05,    // closed-contact resistance (Ω) — effectively a short
    RELAY_GOFF  = 1e-9;    // open-contact leakage conductance (S)
// thyristors (SCR / TRIAC) — 3-terminal latching switches. a = anode/MT2, b = cathode/MT1, g = gate.
// Model: the gate-cathode junction is a plain diode companion (so gate current is real and the
// meter can read it), and the main path is a latch (_lat) that is NOT a function of the present
// voltages alone: gate current ≥ I_GT fires it, and it only lets go when the main current falls
// below the holding current I_H — a zero crossing, an opened switch, or a removed load.
// A TRIAC is the same device made bidirectional (it latches in whichever direction it was fired).
var SCR_TYPES = {
  scr:   { th:'SCR', en:'SCR', ref:'BT151', border:'#b45309', pins:['A', 'K', 'G'] },
  triac: { th:'ไทรแอก', en:'TRIAC', ref:'BT136', border:'#7c3aed', pins:['MT2', 'MT1', 'G'] }
};
var SCR_VT   = 1.0,        // on-state drop A→K (three junctions ⇒ more than a diode)
    SCR_RON  = 6,          // on-state series resistance (companion)
    SCR_GOFF = 1e-11,      // blocking leakage
    SCR_VGT  = 0.7,        // gate-cathode junction drop
    SCR_RGT  = 25,         // gate-cathode on-resistance (companion)
    IGT_OPTIONS = [0.2e-3, 1e-3, 5e-3, 15e-3],   // gate trigger current (A)
    IGT_DEFAULT = 1e-3,
    IH_OPTIONS  = [1e-3, 5e-3, 10e-3, 20e-3],    // holding current (A)
    IH_DEFAULT  = 5e-3;
function scrStyle(c){ return SCR_TYPES[c.st] || SCR_TYPES.scr; }
function isTriac(c){ return c.st === 'triac'; }
function scrIgt(c){ return c.igt != null ? c.igt : IGT_DEFAULT; }
function scrIh(c){ return c.ih != null ? c.ih : IH_DEFAULT; }
function fmtA(i){ return i >= 1e-3 ? (i * 1e3) + ' mA' : (i * 1e6) + ' µA'; }
function transKind(c){ return (TRANSISTOR_TYPES[c.tt] || TRANSISTOR_TYPES.npn).kind; }
function isAval(c){ return c.type === 'transistor' && c.av && transKind(c) === 'bjt'; }   // avalanche/relaxation mode
function transSign(c){ return (c.tt === 'pnp' || c.tt === 'pmos') ? -1 : 1; }
function pinNames(c){ return transKind(c) === 'fet' ? ['G', 'D', 'S'] : ['B', 'C', 'E']; }
// drain current + small-signal derivatives at a device operating point (vgs, vds)
function mosfetModel(vgs, vds, vth){
  var vov = vgs - vth;
  if (vov <= 0) return { Id:0, gm:0, gds:0, region:'cutoff' };
  if (vds < vov){   // triode / ohmic
    return { Id:MOS_K * (vov * vds - 0.5 * vds * vds), gm:MOS_K * vds, gds:MOS_K * (vov - vds), region:'triode' };
  }
  var f = 1 + MOS_LAMBDA * vds;   // saturation (active) — square-law with channel-length modulation
  return { Id:0.5 * MOS_K * vov * vov * f, gm:MOS_K * vov * f, gds:0.5 * MOS_K * vov * vov * MOS_LAMBDA, region:'satfet' };
}

// ════════════════════════════ STATE ════════════════════════════
var holes = {};          // id -> {x, y, node, el}
var holeAt = {};         // "x_y" -> id (reverse lookup for drag snapping)
var comps = [];          // {id,type,a,b,value,vf,color,results,segs}
var occupied = {};       // holeId -> compId (one pin per hole)
var nextId = 1;
var tool = null;         // armed tool: battery|resistor|led|diode|wire|switch|button|cap|ind|transistor|delete|null
var pendingHole = null;  // first clicked hole id (awaiting second)
var pendingHole2 = null; // second clicked hole id (3/4-pin parts: awaiting third)
var pendingHole3 = null; // third clicked hole id (4-pin opto / 5-pin relay: awaiting fourth)
var pendingHole4 = null; // fourth clicked hole id (5-pin relay only: awaiting fifth)
var selectedId = null;   // currently selected component (for the edit panel)
var batteryV = 9;
var resVal = 330;
var resSubtype = 'resistor';   // resistor | vr | ntc | ptc | ldr | vdr
var vdrVc = 6;
var ledColor = 'red';
var wireColor = 'green';      // colour of the next jumper wire placed
var buttonColor = 'red';      // cap colour of the next pushbutton placed
var diodeKind = 'silicon';   // silicon | germanium | schottky | zener | led — picks what the diode tool places
var zenerVz = 5.1;
var capVal = CAP_DEFAULT, indVal = IND_DEFAULT;
var AC_FREQ_OPTIONS = [0.5, 1, 2, 5, 10, 50, 60];   // Hz
var acVp = 5, acFreq = 1, acOffset = 0;       // amplitude / frequency / DC offset of the next AC source
var transType = 'npn';                        // npn | pnp | nmos | pmos — next transistor placed
var transBeta = BETA_DEFAULT, transVth = VTH_DEFAULT;
var potVal = 10000;                           // total resistance of the next potentiometer placed
var optoCtr = CTR_DEFAULT;                    // CTR (%) of the next optocoupler placed
var scrType = 'scr';                          // scr | triac — next thyristor placed
var scrIgtSel = IGT_DEFAULT, scrIhSel = IH_DEFAULT;
var env = { temp:25, light:50, vrPos:50 };   // shared sensor environment

// transient simulation
var SIM_H = 1 / 60;            // nominal timestep used for the static display snapshot
var SIM_SUBSTEP = 0.02;        // max integration step (s) — long frames are split into substeps
var SIM_SPEEDS = [0.25, 1, 4]; // 🐢 / ▶ / ⏩ multipliers on real time
var simSpeedIdx = 1;
var simTime = 0;               // elapsed simulated time (s)
var lastRes = null;            // most recent solve result (for live readout refresh)
var graphHist = [];            // [{t, v}] history of the tracked signal
var graphComp = null;          // component id whose signal the graph plots
var graphTau = null;           // estimated time constant of the tracked component (s)
var renderAcc = 0;             // throttle accumulator for readout/graph redraws

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
var gBoard, gHoles, gComps, gElec, gProbe, hlEl, hlEl2, hlEl3, hlEl4;

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
  hlEl2 = el('circle', { class:'bb-pin-hl', r:R_HOLE + 4, style:'display:none' });
  svg.appendChild(hlEl2);
  hlEl3 = el('circle', { class:'bb-pin-hl', r:R_HOLE + 4, style:'display:none' });
  svg.appendChild(hlEl3);
  hlEl4 = el('circle', { class:'bb-pin-hl', r:R_HOLE + 4, style:'display:none' });
  svg.appendChild(hlEl4);

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
  c.addEventListener('click', function(e){ clickShift = !!(e && e.shiftKey); onHoleClick(id); });
  gHoles.appendChild(c);
  holes[id] = { x:x, y:y, node:node, el:c };
  holeAt[hkey(x, y)] = id;
}
function hkey(x, y){ return Math.round(x) + '_' + Math.round(y); }

// AC source instantaneous value: offset + Vp·sin(2π f t + phase)
function acValue(c, t){ return (c.offset || 0) + (c.vp != null ? c.vp : acVp) * Math.sin(2 * Math.PI * (c.freq || acFreq) * t + (c.phase || 0)); }
function srcValue(c){ return c.type === 'ac' ? acValue(c, simTime) : c.value; }
function hasAC(){ return comps.some(function(c){ return c.type === 'ac'; }); }
function minACFreq(){ var f = Infinity; comps.forEach(function(c){ if (c.type === 'ac') f = Math.min(f, c.freq || acFreq); }); return isFinite(f) ? f : 0; }
function maxACFreq(){ var f = 0; comps.forEach(function(c){ if (c.type === 'ac') f = Math.max(f, c.freq || acFreq); }); return f; }

// ════════════════════════════ PLACEMENT ════════════════════════════
var POLAR = { battery:1, led:1, diode:1, ac:1 };    // first hole = + / anode
var TYPE_LABEL = {
  battery: { th:'แบตเตอรี่', en:'Battery' },
  resistor:{ th:'ตัวต้านทาน', en:'Resistor' },
  led:     { th:'LED', en:'LED' },
  diode:   { th:'ไดโอด / LED', en:'Diode / LED' },
  wire:    { th:'จัมเปอร์', en:'Jumper' },
  switch:  { th:'สวิตช์', en:'Switch' },
  button:  { th:'ปุ่มกด', en:'Pushbutton' },
  cap:     { th:'ตัวเก็บประจุ', en:'Capacitor' },
  ind:     { th:'ตัวเหนี่ยวนำ', en:'Inductor' },
  ac:      { th:'แหล่งจ่าย AC', en:'AC source' },
  transistor:{ th:'ทรานซิสเตอร์', en:'Transistor' },
  scr:       { th:'SCR / ไทรแอก', en:'SCR / TRIAC' },
  pot:       { th:'โพเทนชิโอมิเตอร์', en:'Potentiometer' },
  opto:      { th:'ออปโตคัปเปลอร์', en:'Optocoupler' },
  relay:     { th:'รีเลย์', en:'Relay' }
};

// 3-pin parts use a third hole c.g (base/gate, or wiper) in addition to a/b;
// the 4-pin optocoupler adds a fourth hole c.h (emitter; g = collector);
// the 5-pin relay adds a fifth hole c.k (coil a/b, g = COM, h = NO, k = NC)
// contact family: a closed contact is a 0 Ω jumper. 'switch' latches (tap = toggle);
// 'button' is momentary NO — closed only while the pointer is held down on it (press = on, release = off)
function isSwitchy(c){ return c.type === 'switch' || c.type === 'button'; }
function isThreePin(c){ return c.type === 'transistor' || c.type === 'pot' || c.type === 'scr'; }
function isThreePinTool(t){ return t === 'transistor' || t === 'pot' || t === 'scr'; }
function isFourPin(c){ return c.type === 'opto'; }
function isFivePin(c){ return c.type === 'relay'; }
function isFivePinTool(t){ return t === 'relay'; }
function compNodes(c){ return isFivePin(c) ? [c.a, c.b, c.g, c.h, c.k] : isFourPin(c) ? [c.a, c.b, c.g, c.h] : isThreePin(c) ? [c.a, c.b, c.g] : [c.a, c.b]; }
// potentiometer: total R split by the global VR knob into R1 (end a→wiper) and R2 (wiper→end b)
function potR(c){
  var total = c.value || potVal, k = Math.max(0, Math.min(1, env.vrPos / 100));
  return { total:total, k:k, r1:Math.max(1, total * k), r2:Math.max(1, total * (1 - k)) };
}

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
  if (tool === 'relay'){        // 5-pin placement, step-by-step
    var rnames = isEN() ? ['Coil + (A)', 'Coil − (B)', 'COM (common)', 'NO (normally-open)', 'NC (normally-closed)']
                        : ['ขา + ของคอยล์', 'ขา − ของคอยล์', 'COM (ขั้วร่วม)', 'NO (ปกติเปิด)', 'NC (ปกติปิด)'];
    var rstep = pendingHole == null ? 0 : pendingHole2 == null ? 1 : pendingHole3 == null ? 2 : pendingHole4 == null ? 3 : 4;
    setHint((isEN() ? 'Placing <b>' + lbl + '</b>: click the <b>' + rnames[rstep] + '</b> hole'
                    : 'กำลังวาง <b>' + lbl + '</b>: คลิกรู <b>' + rnames[rstep] + '</b>') +
            ' (' + (rstep + 1) + '/5)');
    return;
  }
  if (tool === 'opto'){         // 4-pin placement, step-by-step
    var onames = isEN() ? ['LED Anode A (+)', 'LED Cathode K (−)', 'Collector C', 'Emitter E']
                        : ['ขา A ของ LED (+)', 'ขา K ของ LED (−)', 'ขา C (คอลเลกเตอร์)', 'ขา E (อิมิตเตอร์)'];
    var ostep = pendingHole == null ? 0 : pendingHole2 == null ? 1 : pendingHole3 == null ? 2 : 3;
    setHint((isEN() ? 'Placing <b>' + lbl + '</b>: click the <b>' + onames[ostep] + '</b> hole'
                    : 'กำลังวาง <b>' + lbl + '</b>: คลิกรู <b>' + onames[ostep] + '</b>') +
            ' (' + (ostep + 1) + '/4)');
    return;
  }
  if (isThreePinTool(tool)){    // 3-pin placement, step-by-step
    var names = tool === 'pot'
      ? (isEN() ? ['End 1', 'Wiper', 'End 2'] : ['ปลาย 1', 'ตัวปัด (wiper)', 'ปลาย 2'])
      : tool === 'scr'
        ? (scrType === 'triac'
            ? (isEN() ? ['MT2', 'MT1', 'Gate'] : ['ขา MT2', 'ขา MT1', 'ขา G (เกต)'])
            : (isEN() ? ['Anode (A)', 'Cathode (K)', 'Gate (G)'] : ['ขา A (แอโนด)', 'ขา K (แคโทด)', 'ขา G (เกต)']))
      : transKind({ tt: transType }) === 'fet'
        ? ['Gate', 'Drain', 'Source']
        : (isEN() ? ['Base', 'Collector', 'Emitter'] : ['ขา B (เบส)', 'ขา C (คอลเลกเตอร์)', 'ขา E (อิมิตเตอร์)']);
    var step = pendingHole == null ? 0 : pendingHole2 == null ? 1 : 2;
    setHint((isEN() ? 'Placing <b>' + lbl + '</b>: click the <b>' + names[step] + '</b> hole'
                    : 'กำลังวาง <b>' + lbl + '</b>: คลิกรู <b>' + names[step] + '</b>') +
            ' (' + (step + 1) + '/3)');
    return;
  }
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

  // 5-pin relay: collect five holes in order (coil+, coil−, COM, NO, NC)
  if (tool === 'relay'){
    if (id === pendingHole || id === pendingHole2 || id === pendingHole3 || id === pendingHole4){ flashHint(isEN() ? 'Pick a different hole.' : 'เลือกรูอื่น'); return; }
    if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
    if (pendingHole == null){ pendingHole = id; showHL(id); refreshHint(); return; }
    if (pendingHole2 == null){ pendingHole2 = id; showHL2(id); refreshHint(); return; }
    if (pendingHole3 == null){ pendingHole3 = id; showHL3(id); refreshHint(); return; }
    if (pendingHole4 == null){ pendingHole4 = id; showHL4(id); refreshHint(); return; }
    placeRelay(pendingHole, pendingHole2, pendingHole3, pendingHole4, id);
    pendingHole = pendingHole2 = pendingHole3 = pendingHole4 = null; hideHL(); refreshHint();
    return;
  }

  // 4-pin optocoupler: collect four holes in order (A, K, C, E)
  if (tool === 'opto'){
    if (id === pendingHole || id === pendingHole2 || id === pendingHole3){ flashHint(isEN() ? 'Pick a different hole.' : 'เลือกรูอื่น'); return; }
    if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
    if (pendingHole == null){ pendingHole = id; showHL(id); refreshHint(); return; }
    if (pendingHole2 == null){ pendingHole2 = id; showHL2(id); refreshHint(); return; }
    if (pendingHole3 == null){ pendingHole3 = id; showHL3(id); refreshHint(); return; }
    placeOpto(pendingHole, pendingHole2, pendingHole3, id);
    pendingHole = pendingHole2 = pendingHole3 = null; hideHL(); refreshHint();
    return;
  }

  // 3-pin parts (transistor / potentiometer): collect three holes in order
  if (isThreePinTool(tool)){
    if (pendingHole == null){
      if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
      pendingHole = id; showHL(id); refreshHint(); return;
    }
    if (id === pendingHole || id === pendingHole2){ flashHint(isEN() ? 'Pick a different hole.' : 'เลือกรูอื่น'); return; }
    if (occupied[id]){ flashHint(isEN() ? 'That hole is already used.' : 'รูนี้มีขาอุปกรณ์อยู่แล้ว'); return; }
    if (pendingHole2 == null){ pendingHole2 = id; showHL2(id); refreshHint(); return; }
    // third click → place. transistor: base/gate, collector/drain, emitter/source. pot: end1, wiper, end2.
    // scr/triac: anode(MT2), cathode(MT1), gate.
    if (tool === 'pot') placePot(pendingHole, pendingHole2, id);
    else if (tool === 'scr') placeScr(pendingHole, pendingHole2, id);
    else placeTransistor(pendingHole, pendingHole2, id);
    pendingHole = pendingHole2 = null; hideHL(); refreshHint();
    return;
  }

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
  var placeType = tool === 'resistor' ? resSubtype
                : tool === 'diode'    ? (diodeKind === 'led' ? 'led' : 'diode')
                : tool;
  placeComp(placeType, pendingHole, id);
  pendingHole = null;
  hideHL();
  refreshHint();
}

function placeComp(type, a, b){
  var c = { id:nextId++, type:type, a:a, b:b };
  if (RFAM[type]) c.value = resVal;            // resistor / vr / ntc / ptc / ldr
  if (type === 'vdr') c.vc = vdrVc;
  if (type === 'wire') c.color = wireColor;
  if (type === 'led'){ c.color = ledColor; c.vf = LED_COLORS[ledColor].vf; }
  if (type === 'diode'){
    var dk = (diodeKind === 'led' ? 'silicon' : diodeKind);
    var dt = DIODE_TYPES[dk] || DIODE_TYPES.silicon;
    c.variant = dk; c.vf = dt.vf; c.rd = dt.rd;
    if (dk === 'zener' || dk === 'tvs') c.vz = zenerVz;
  }
  if (type === 'battery') c.value = batteryV;
  if (type === 'ac'){ c.vp = acVp; c.freq = acFreq; c.offset = acOffset; }
  if (type === 'switch') c.closed = true;   // starts closed (conducting)
  if (type === 'button'){ c.closed = false; c.color = buttonColor; }   // momentary: rests open, conducts only while held
  if (type === 'cap'){ c.value = capVal; c._vPrev = 0; }
  if (type === 'ind'){ c.value = indVal; c._iPrev = 0; }
  comps.push(c);
  occupied[a] = c.id; occupied[b] = c.id;
  rebuild();
}

// 3-pin placement: base = base/gate, coll = collector/drain, emit = emitter/source
function placeTransistor(base, coll, emit){
  var c = { id:nextId++, type:'transistor', tt:transType, a:coll, b:emit, g:base };
  if (transKind(c) === 'fet') c.vth = transVth; else c.beta = transBeta;
  comps.push(c);
  occupied[coll] = c.id; occupied[emit] = c.id; occupied[base] = c.id;
  selectedId = c.id;
  rebuild(); renderEditor();
}

// 3-pin thyristor: a = anode (MT2), b = cathode (MT1), g = gate. _lat = latch state
// (0 blocking / +1 conducting a→b / −1 conducting b→a, TRIAC only) and persists across solves.
function placeScr(anode, cathode, gate){
  var c = { id:nextId++, type:'scr', st:scrType, a:anode, b:cathode, g:gate,
            igt:scrIgtSel, ih:scrIhSel, _lat:0 };
  comps.push(c);
  occupied[anode] = c.id; occupied[cathode] = c.id; occupied[gate] = c.id;
  selectedId = c.id;
  rebuild(); renderEditor();
}

// 4-pin optocoupler: a = LED anode, b = LED cathode, g = collector, h = emitter
function placeOpto(an, ka, coll, emit){
  var c = { id:nextId++, type:'opto', a:an, b:ka, g:coll, h:emit, ctr:optoCtr };
  comps.push(c);
  occupied[an] = c.id; occupied[ka] = c.id; occupied[coll] = c.id; occupied[emit] = c.id;
  selectedId = c.id;
  rebuild(); renderEditor();
}

// 5-pin relay: coil a = +, b = −; g = COM, h = NO, k = NC
function placeRelay(coilP, coilN, com, no, nc){
  var c = { id:nextId++, type:'relay', a:coilP, b:coilN, g:com, h:no, k:nc, _en:0 };
  comps.push(c);
  [coilP, coilN, com, no, nc].forEach(function(hh){ occupied[hh] = c.id; });
  selectedId = c.id;
  rebuild(); renderEditor();
}

// 3-pin potentiometer: a = end 1, b = end 2, g = wiper
function placePot(end1, wiper, end2){
  var c = { id:nextId++, type:'pot', a:end1, b:end2, g:wiper, value:potVal };
  comps.push(c);
  occupied[end1] = c.id; occupied[end2] = c.id; occupied[wiper] = c.id;
  selectedId = c.id;
  rebuild(); renderEditor();
}

function deleteComp(id){
  comps = comps.filter(function(c){
    if (c.id === id){ compNodes(c).forEach(function(h){ delete occupied[h]; }); return false; }
    return true;
  });
  if (selectedId === id) selectedId = null;
  Object.keys(pressedBtns).forEach(function(k){ if (pressedBtns[k].id === id) delete pressedBtns[k]; });
  rebuild();
  renderEditor();
}

// ════════════════════════════ SELECT / EDIT ════════════════════════════
function selectComp(id){
  var c = compById(id);
  if (!c){ selectedId = null; rebuild(); renderEditor(); return; }
  pendingHole = null; hideHL();
  selectedId = id;
  rebuild();        // redraw highlight
  renderEditor();
}
function compById(id){ for (var i = 0; i < comps.length; i++) if (comps[i].id === id) return comps[i]; return null; }

function renderEditor(){
  var box = $('bb-editor'), c = compById(selectedId), en = isEN();
  if (!c){ box.style.display = 'none'; box.innerHTML = ''; return; }

  var ctrl = '';
  if (c.type === 'wire'){
    ctrl = '<label>' + (en ? 'Color' : 'สี') + '</label><select id="bb-ed-wcolor">' +
      Object.keys(WIRE_COLORS).map(function(k){ return '<option value="' + k + '"' + ((c.color || 'green') === k ? ' selected' : '') + '>' + WIRE_COLORS[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>';
  } else
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
    ctrl = '<label>' + (en ? 'Voltage' : 'แรงดัน') + '</label><input type="range" id="bb-ed-bv" min="1" max="30" step="1" value="' + c.value + '"><span class="ev" id="bb-ed-bv-out">' + c.value + ' V</span>';
  } else if (c.type === 'ac'){
    ctrl = '<label>' + (en ? 'Amplitude' : 'แอมพลิจูด Vp') + '</label><input type="range" id="bb-ed-acvp" min="1" max="30" step="1" value="' + c.vp + '"><span class="ev" id="bb-ed-acvp-out">' + c.vp + ' V</span>' +
      '<label style="margin-left:.6rem">' + (en ? 'Freq' : 'ความถี่') + '</label><select id="bb-ed-acf">' +
      AC_FREQ_OPTIONS.map(function(f){ return '<option value="' + f + '"' + (f === c.freq ? ' selected' : '') + '>' + f + ' Hz</option>'; }).join('') + '</select>' +
      '<label style="margin-left:.6rem">' + (en ? 'Offset' : 'ออฟเซ็ต') + '</label><input type="range" id="bb-ed-acoff" min="-30" max="30" step="1" value="' + (c.offset || 0) + '"><span class="ev" id="bb-ed-acoff-out">' + (c.offset || 0) + ' V</span>';
  } else if (c.type === 'diode'){
    var dv = c.variant || 'silicon';
    ctrl = '<label>' + (en ? 'Type' : 'ชนิด') + '</label><select id="bb-ed-dtype">' +
      Object.keys(DIODE_TYPES).map(function(k){ return '<option value="' + k + '"' + (k === dv ? ' selected' : '') + '>' + DIODE_TYPES[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>';
    if (dv === 'zener' || dv === 'tvs'){
      ctrl += '<label style="margin-left:.6rem">' + (dv === 'tvs' ? 'V<sub>BR</sub>' : 'Vz') + '</label><select id="bb-ed-vz">' +
        ZENER_VZ.map(function(v){ return '<option value="' + v + '"' + (v === c.vz ? ' selected' : '') + '>' + v + ' V</option>'; }).join('') + '</select>';
    }
  } else if (c.type === 'switch'){
    ctrl = '<label>' + (en ? 'State' : 'สถานะ') + '</label><span style="font-weight:700;color:' + (c.closed ? '#16a34a' : '#94a3b8') + '">' +
           (c.closed ? (en ? 'ON (closed)' : 'ปิด (ต่อวงจร)') : (en ? 'OFF (open)' : 'เปิด (ตัดวงจร)')) + '</span>';
  } else if (c.type === 'button'){
    ctrl = '<label>' + (en ? 'Colour' : 'สี') + '</label><select id="bb-ed-bcolor">' +
           Object.keys(BTN_COLORS).map(function(k){ return '<option value="' + k + '"' + ((c.color || 'red') === k ? ' selected' : '') + '>' + BTN_COLORS[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>' +
           '<label style="margin-left:.6rem">' + (en ? 'State' : 'สถานะ') + '</label><span style="font-weight:700;color:' + (c.closed ? '#16a34a' : '#94a3b8') + '">' +
           (c.closed ? (en ? 'PRESSED (closed)' : 'กดอยู่ (ต่อวงจร)') : (en ? 'released (open)' : 'ปล่อยอยู่ (ตัดวงจร)')) + '</span>' +
           '<span style="margin-left:.6rem;color:var(--text-light);font-weight:400">' +
           (en ? '(momentary NO — hold it down to conduct, release to cut off)' : '(ปุ่มกดแบบ NO — กดค้างจึงจะต่อวงจร ปล่อยแล้วตัดทันที)') + '</span>';
  } else if (c.type === 'cap'){
    ctrl = '<label>' + (en ? 'Capacitance' : 'ค่า C') + '</label><select id="bb-ed-cap">' +
      CAP_OPTIONS.map(function(F){ return '<option value="' + F + '"' + (F === c.value ? ' selected' : '') + '>' + fmtC(F) + '</option>'; }).join('') + '</select>';
  } else if (c.type === 'ind'){
    ctrl = '<label>' + (en ? 'Inductance' : 'ค่า L') + '</label><select id="bb-ed-ind">' +
      IND_OPTIONS.map(function(L2){ return '<option value="' + L2 + '"' + (L2 === c.value ? ' selected' : '') + '>' + fmtL(L2) + '</option>'; }).join('') + '</select>';
  } else if (c.type === 'pot'){
    var pl = R_OPTIONS.vr;
    ctrl = '<label>' + (en ? 'Total R' : 'ค่ารวม') + '</label><select id="bb-ed-pot">' +
      pl.map(function(r){ return '<option value="' + r + '"' + (r === c.value ? ' selected' : '') + '>' + rLabel(r) + '</option>'; }).join('') + '</select>' +
      '<span style="margin-left:.6rem;color:var(--text-light);font-weight:600">' + Math.round(env.vrPos) + '% · R1 ' + fmtR(Math.round(potR(c).r1)) + ' / R2 ' + fmtR(Math.round(potR(c).r2)) + '</span>' +
      '<span style="margin-left:.6rem;color:var(--text-light);font-weight:400">' + (en ? '(wiper = VR knob)' : '(ตัวปัด = ลูกบิด VR)') + '</span>';
  } else if (c.type === 'transistor'){
    ctrl = '<label>' + (en ? 'Type' : 'ชนิด') + '</label><select id="bb-ed-tt">' +
      Object.keys(TRANSISTOR_TYPES).map(function(k){ return '<option value="' + k + '"' + (k === c.tt ? ' selected' : '') + '>' + TRANSISTOR_TYPES[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>';
    if (transKind(c) === 'fet'){
      ctrl += '<label style="margin-left:.6rem">Vth</label><select id="bb-ed-vth">' +
        VTH_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === c.vth ? ' selected' : '') + '>' + v + ' V</option>'; }).join('') + '</select>';
    } else {
      ctrl += '<label style="margin-left:.6rem">β</label><select id="bb-ed-beta">' +
        BETA_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === c.beta ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select>';
      // avalanche oscillator mode (BJT only): base ignored → RC relaxation flasher
      ctrl += '<label style="margin-left:.8rem" title="' + (en ? 'Avalanche relaxation oscillator (ignores base) — pair with an RC to self-flash' : 'ออสซิลเลเตอร์แบบ Avalanche (ไม่ใช้ขาเบส) — ต่อกับ RC แล้วกระพริบเอง') + '">' +
        '<input type="checkbox" id="bb-ed-av"' + (c.av ? ' checked' : '') + '> Avalanche</label>';
      if (c.av){
        ctrl += '<label style="margin-left:.4rem">V<sub>BR</sub></label><select id="bb-ed-vbr">' +
          AV_VBR_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === (c.vbr || AV_VBR_DEFAULT) ? ' selected' : '') + '>' + v + ' V</option>'; }).join('') + '</select>';
      }
    }
    if (c.results && c.results.region){
      var rg = { cutoff:{th:'Cut-off (ตัด)',en:'Cut-off'}, active:{th:'Active (ขยาย)',en:'Active'}, sat:{th:'Saturation (อิ่มตัว)',en:'Saturation'}, on:{th:'ON (นำกระแส)',en:'ON'}, triode:{th:'Triode/โอห์มมิก (สวิตช์)',en:'Triode (ohmic)'}, satfet:{th:'Saturation/อิ่มตัว (ขยาย)',en:'Saturation (active)'}, avon:{th:'Avalanche: นำกระแส (แฟลช)',en:'Avalanche: firing'}, avoff:{th:'Avalanche: กำลังประจุ (รอ)',en:'Avalanche: charging'} }[c.results.region];
      ctrl += '<span style="margin-left:.6rem;color:var(--text-light);font-weight:600">' + (rg ? (en ? rg.en : rg.th) : '') + '</span>';
    }
  } else if (c.type === 'scr'){
    var lat = c.results && c.results.lat;
    ctrl = '<label>' + (en ? 'Type' : 'ชนิด') + '</label><select id="bb-ed-st">' +
      Object.keys(SCR_TYPES).map(function(k){ return '<option value="' + k + '"' + (k === (c.st || 'scr') ? ' selected' : '') + '>' + SCR_TYPES[k][en ? 'en' : 'th'] + '</option>'; }).join('') + '</select>' +
      '<label style="margin-left:.6rem" title="' + (en ? 'gate current needed to fire it' : 'กระแสเกตที่ใช้จุดชนวน') + '">I<sub>GT</sub></label><select id="bb-ed-igt">' +
      IGT_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === scrIgt(c) ? ' selected' : '') + '>' + fmtA(v) + '</option>'; }).join('') + '</select>' +
      '<label style="margin-left:.6rem" title="' + (en ? 'below this current it stops conducting' : 'ต่ำกว่ากระแสนี้แล้วจะหยุดนำกระแส') + '">I<sub>H</sub></label><select id="bb-ed-ih">' +
      IH_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === scrIh(c) ? ' selected' : '') + '>' + fmtA(v) + '</option>'; }).join('') + '</select>' +
      '<span style="margin-left:.6rem;font-weight:700;color:' + (lat ? '#b45309' : '#94a3b8') + '">' +
        (lat ? (en ? 'LATCHED (conducting' + (lat < 0 ? ' ←' : ' →') + ')' : 'จุดชนวนแล้ว — นำกระแสค้าง' + (lat < 0 ? ' (ทิศย้อน)' : ''))
             : (en ? 'blocking' : 'กั้นไฟ อยู่รอจุดชนวน')) + '</span>' +
      (c.results ? '<span style="margin-left:.6rem;color:var(--text-light);font-weight:600">I<sub>G</sub> ' + fmtI(c.results.Ig || 0) + ' · I ' + fmtI(c.results.I || 0) + '</span>' : '') +
      '<span style="margin-left:.6rem;color:var(--text-light);font-weight:400">' +
      (en ? '(the gate cannot switch it off — drop the current below I' : '(เกตสั่งให้ดับไม่ได้ — ต้องทำให้กระแสต่ำกว่า I') + '<sub>H</sub>)</span>';
  } else if (c.type === 'opto'){
    ctrl = '<label>CTR</label><select id="bb-ed-ctr">' +
      CTR_OPTIONS.map(function(v){ return '<option value="' + v + '"' + (v === (c.ctr || CTR_DEFAULT) ? ' selected' : '') + '>' + v + '%</option>'; }).join('') + '</select>';
    if (c.results){
      ctrl += '<span style="margin-left:.6rem;color:var(--text-light);font-weight:600">IF ' + fmtI(c.results.If || 0) + ' → IC ' + fmtI(c.results.Ic || 0) +
              (c.results.region ? ' · ' + regionShort(c.results.region) : '') + '</span>';
    }
    ctrl += '<span style="margin-left:.6rem;color:var(--text-light);font-weight:400">' + (en ? '(flip ± swaps the LED legs A/K)' : '(สลับขั้ว = สลับขา A/K ของ LED)') + '</span>';
  } else if (c.type === 'relay'){
    var ren = c.results && c.results.en;
    ctrl = '<label>' + (en ? 'State' : 'สถานะ') + '</label><span style="font-weight:700;color:' + (ren ? '#2563eb' : '#94a3b8') + '">' +
           (ren ? (en ? 'ENERGIZED (COM→NO)' : 'จ่ายไฟคอยล์ (COM→NO)') : (en ? 'de-energized (COM→NC)' : 'ยังไม่จ่ายไฟ (COM→NC)')) + '</span>' +
           '<span style="margin-left:.6rem;color:var(--text-light);font-weight:600">' + (en ? 'coil ' : 'คอยล์ ') + fmtV(Math.abs((c.results && c.results.Vcoil) || 0)) + ' / ' + fmtI((c.results && c.results.I) || 0) + '</span>' +
           '<span style="margin-left:.6rem;color:var(--text-light);font-weight:400">' + (en ? '(SPDT · pull-in ≈ ' + RELAY_VPULL + ' V, coil ' + RELAY_RCOIL + ' Ω)' : '(SPDT · ดึงเข้าที่ ≈ ' + RELAY_VPULL + ' V, คอยล์ ' + RELAY_RCOIL + ' Ω)') + '</span>';
  }
  var polar = (c.type === 'led' || c.type === 'diode' || c.type === 'battery' || c.type === 'ac' || c.type === 'opto');
  var flip = polar ? '<button class="bb-ed-btn" id="bb-ed-flip">🔄 ' + (en ? 'Flip ±' : 'สลับขั้ว') + '</button>' : '';
  var toggle = c.type === 'switch' ? '<button class="bb-ed-btn" id="bb-ed-toggle">⎍ ' + (en ? 'Toggle' : 'เปิด/ปิด') + '</button>' : '';
  // pushbutton: a hold-to-press button here mirrors pressing the part on the board
  var hold = c.type === 'button' ? '<button class="bb-ed-btn" id="bb-ed-hold">⏺ ' + (en ? 'Press &amp; hold' : 'กดค้าง') + '</button>' : '';

  box.innerHTML =
    '<div class="bb-ed-title" id="bb-ed-title">' + edTitle(c, en) + '</div>' +
    (ctrl ? '<div class="bb-ed-row">' + ctrl + '</div>' : '') +
    '<div class="bb-ed-row bb-ed-actions">' + toggle + hold + flip +
      '<button class="bb-ed-btn danger" id="bb-ed-del">🗑 ' + (en ? 'Delete' : 'ลบ') + '</button>' +
      '<button class="bb-ed-btn" id="bb-ed-close">✕ ' + (en ? 'Close' : 'ปิด') + '</button></div>';
  box.style.display = '';

  // wire up controls (board re-solves; only the title text refreshes, inputs stay intact)
  on('bb-ed-val', 'change', function(){ c.value = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-vc', 'change', function(){ c.vc = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-color', 'change', function(){ c.color = this.value; c.vf = LED_COLORS[this.value].vf; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-dtype', 'change', function(){
    c.variant = this.value; var dt = DIODE_TYPES[c.variant];
    c.vf = dt.vf; c.rd = dt.rd;
    if (c.variant === 'zener' || c.variant === 'tvs'){ if (!c.vz) c.vz = zenerVz; } else delete c.vz;
    rebuild(); renderEditor();   // re-render so the Vz selector shows/hides
  });
  on('bb-ed-vz', 'change', function(){ c.vz = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-cap', 'change', function(){ c.value = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-ind', 'change', function(){ c.value = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-tt', 'change', function(){
    c.tt = this.value;
    if (transKind(c) === 'fet'){ if (c.vth == null) c.vth = transVth; delete c.beta; delete c.av; delete c.vbr; }
    else { if (c.beta == null) c.beta = transBeta; delete c.vth; }
    rebuild(); renderEditor();   // re-render so β/Vth control swaps
  });
  on('bb-ed-beta', 'change', function(){ c.beta = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-av', 'change', function(){ c.av = this.checked; if (c.av && c.vbr == null) c.vbr = AV_VBR_DEFAULT; c._av = 0; restartTransient(); renderEditor(); });
  on('bb-ed-vbr', 'change', function(){ c.vbr = +this.value; c._av = 0; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-ctr', 'change', function(){ c.ctr = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-st', 'change', function(){ c.st = this.value; c._lat = 0; rebuild(); renderEditor(); });
  on('bb-ed-igt', 'change', function(){ c.igt = +this.value; rebuild(); renderEditor(); });
  on('bb-ed-ih', 'change', function(){ c.ih = +this.value; rebuild(); renderEditor(); });
  on('bb-ed-vth', 'change', function(){ c.vth = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-pot', 'change', function(){ c.value = +this.value; rebuild(); renderEditor(); });
  on('bb-ed-wcolor', 'change', function(){ c.color = this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-bcolor', 'change', function(){ c.color = this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-bv', 'input', function(){ c.value = +this.value; var o = $('bb-ed-bv-out'); if (o) o.textContent = c.value + ' V'; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-acvp', 'input', function(){ c.vp = +this.value; var o = $('bb-ed-acvp-out'); if (o) o.textContent = c.vp + ' V'; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-acf', 'change', function(){ c.freq = +this.value; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-acoff', 'input', function(){ c.offset = +this.value; var o = $('bb-ed-acoff-out'); if (o) o.textContent = c.offset + ' V'; rebuild(); refreshEditorTitle(c); });
  on('bb-ed-flip', 'click', function(){ var t = c.a; c.a = c.b; c.b = t; rebuild(); });
  on('bb-ed-toggle', 'click', function(){ c.closed = !c.closed; rebuild(); renderEditor(); });
  // press on pointerdown; the document-level pointerup handler releases it (works even if the
  // editor re-renders mid-press, and covers the pointer leaving the button before release)
  on('bb-ed-hold', 'pointerdown', function(ev){
    if (ev.preventDefault) ev.preventDefault();
    freePointer(ev);            // renderEditor() below replaces this very button
    pressBtn(c, ev);
  });
  on('bb-ed-del', 'click', function(){ deleteComp(c.id); });
  on('bb-ed-close', 'click', function(){ selectedId = null; rebuild(); renderEditor(); });
}
function on(id, ev, fn){ var e = $(id); if (e) e.addEventListener(ev, fn); }
function edTitle(c, en){ return (en ? 'Edit: ' : 'แก้ไข: ') + compName(c, en); }
function refreshEditorTitle(c){ var t = $('bb-ed-title'); if (t) t.textContent = edTitle(c, isEN()); }

// ════════════════════════════ DRAG TO MOVE ════════════════════════════
var dragComp = null, dragGrab = null, dragMoved = false;
var pressedBtns = {};     // pointerId -> pushbutton held down by that pointer (multi-touch safe)
var clickShift = false;   // was Shift held on the last hole/part click (meter span-extend)

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
function setCompHoles(c, na, nb, ng, nh, nk){
  compNodes(c).forEach(function(h){ delete occupied[h]; });
  c.a = na; c.b = nb; occupied[na] = c.id; occupied[nb] = c.id;
  if (ng != null){ c.g = ng; occupied[ng] = c.id; }
  if (nh != null){ c.h = nh; occupied[nh] = c.id; }
  if (nk != null){ c.k = nk; occupied[nk] = c.id; }
}

// pressing a pushbutton redraws the board, which detaches the element that holds the implicit
// touch pointer-capture — its pointerup would then never reach document and the button would
// stick down. Hand the capture back first so the release always lands.
function freePointer(ev){
  try {
    var t = ev && ev.target;
    if (t && t.hasPointerCapture && ev.pointerId != null && t.hasPointerCapture(ev.pointerId)) t.releasePointerCapture(ev.pointerId);
  } catch (e) {}
}
// momentary pushbutton: close it now; the pointerup that ends THIS pointer opens it again.
// keyed per pointer so two fingers on two buttons can't lose track of each other.
function pidOf(ev){ return (ev && ev.pointerId != null) ? String(ev.pointerId) : 'kb'; }
function pressBtn(c, ev){
  if (!c || c.type !== 'button') return;
  var pid = pidOf(ev);
  if (pressedBtns[pid] === c) return;
  pressedBtns[pid] = c;
  if (c.closed) return;                    // already held down by another pointer
  c.closed = true;
  rebuild();
  if (selectedId === c.id) renderEditor();
}
// with an event: release only that pointer's button. without: release everything (blur / reset).
function releaseBtn(ev){
  var pid = ev ? pidOf(ev) : null, released = false;
  Object.keys(pressedBtns).forEach(function(k){
    if (pid !== null && k !== pid) return;
    var c = pressedBtns[k];
    delete pressedBtns[k];
    var stillHeld = Object.keys(pressedBtns).some(function(k2){ return pressedBtns[k2] === c; });
    if (!stillHeld && c.closed){ c.closed = false; released = true; }
  });
  return released;
}

function startDrag(ev, c){
  if (ev.button != null && ev.button !== 0) return;   // primary button / touch only
  ev.stopPropagation(); if (ev.preventDefault) ev.preventDefault();
  dragComp = c; dragMoved = false;
  // a pushbutton acts on press (not on release) — but not while the meter/delete tool is armed
  if (c.type === 'button' && tool !== 'meter' && tool !== 'delete'){ freePointer(ev); pressBtn(c, ev); }
  clickShift = !!(ev && ev.shiftKey);
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
  var ng = null, nh = null, nk = null;
  if (isThreePin(c) || isFourPin(c) || isFivePin(c)){            // third pin must also land on a free hole
    ng = holeAt[hkey(holes[c.g].x + dx, holes[c.g].y + dy)];
    if (!ng || ng === na || ng === nb) return;
    if (occupied[ng] && occupied[ng] !== c.id) return;
  }
  if (isFourPin(c) || isFivePin(c)){                            // fourth pin (opto emitter / relay NO) too
    nh = holeAt[hkey(holes[c.h].x + dx, holes[c.h].y + dy)];
    if (!nh || nh === na || nh === nb || nh === ng) return;
    if (occupied[nh] && occupied[nh] !== c.id) return;
  }
  if (isFivePin(c)){                                             // fifth pin (relay NC) too
    nk = holeAt[hkey(holes[c.k].x + dx, holes[c.k].y + dy)];
    if (!nk || nk === na || nk === nb || nk === ng || nk === nh) return;
    if (occupied[nk] && occupied[nk] !== c.id) return;
  }
  dragMoved = true;
  setCompHoles(c, na, nb, ng, nh, nk);
  selectedId = c.id;
  rebuild();
}
function onPointerUp(ev){
  var wasPressed = releaseBtn(ev);       // a held pushbutton opens the moment its pointer lifts
  if (!dragComp){
    if (wasPressed){ rebuild(); renderEditor(); }
    return;
  }
  var c = dragComp; dragComp = null;
  if (!dragMoved){                       // it was a tap, not a drag
    if (tool === 'meter') meterClickComp(c);
    else if (tool === 'delete') deleteComp(c.id);
    else if (c.type === 'switch'){ c.closed = !c.closed; selectComp(c.id); }
    else selectComp(c.id);               // pushbuttons land here too (already released above)
  } else { selectedId = c.id; if (wasPressed) rebuild(); renderEditor(); }
}

function showHL(id){ var h = holes[id]; hlEl.setAttribute('cx', h.x); hlEl.setAttribute('cy', h.y); hlEl.style.display = ''; }
function showHL2(id){ var h = holes[id]; hlEl2.setAttribute('cx', h.x); hlEl2.setAttribute('cy', h.y); hlEl2.style.display = ''; }
function showHL3(id){ var h = holes[id]; hlEl3.setAttribute('cx', h.x); hlEl3.setAttribute('cy', h.y); hlEl3.style.display = ''; }
function showHL4(id){ var h = holes[id]; hlEl4.setAttribute('cx', h.x); hlEl4.setAttribute('cy', h.y); hlEl4.style.display = ''; }
function hideHL(){ hlEl.style.display = 'none'; if (hlEl2) hlEl2.style.display = 'none'; if (hlEl3) hlEl3.style.display = 'none'; if (hlEl4) hlEl4.style.display = 'none'; }

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
// h = integration timestep for reactive companion models; commit = advance C/L state by one step
function solveCircuit(h, commit){
  if (!(h > 0)) h = SIM_H;
  // reset results
  comps.forEach(function(c){ c.results = { V:0, I:0, on:false }; });
  var warnings = [];
  probeCtx = { ok:false, ground:null, V:function(){ return null; }, connected:function(){ return false; } };

  var sources     = comps.filter(function(c){ return c.type === 'battery' || c.type === 'ac'; });
  var transistors = comps.filter(function(c){ return c.type === 'transistor'; });
  var pots        = comps.filter(function(c){ return c.type === 'pot'; });
  var optos       = comps.filter(function(c){ return c.type === 'opto'; });
  var relays      = comps.filter(function(c){ return c.type === 'relay'; });
  var scrs        = comps.filter(function(c){ return c.type === 'scr'; });
  var branches    = comps.filter(function(c){ return c.type !== 'wire' && c.type !== 'battery' && c.type !== 'ac' && !isSwitchy(c) && c.type !== 'transistor' && c.type !== 'pot' && c.type !== 'opto' && c.type !== 'relay' && c.type !== 'scr'; });
  var wires       = comps.filter(function(c){ return c.type === 'wire'; });
  // a closed switch / held pushbutton behaves like a jumper (0 Ω); an open one is ignored entirely
  var joins       = wires.concat(comps.filter(function(c){ return isSwitchy(c) && c.closed; }));

  // supernodes via union-find (wires/closed contacts merge nodes) — built first so the
  // multimeter probe can test continuity even before a battery is added
  var uf = UF();
  comps.forEach(function(c){ compNodes(c).forEach(function(h){ uf.add(holes[h].node); }); });
  joins.forEach(function(c){ uf.union(holes[c.a].node, holes[c.b].node); });
  function sn(holeId){ return uf.find(holes[holeId].node); }
  probeCtx.connected = function(h1, h2){ return sn(h1) === sn(h2); };

  if (sources.length === 0){
    return { ok:comps.length === 0, warnings:comps.length ? [{ t:'warn', th:'ยังไม่มีแหล่งจ่าย — เพิ่มแบตเตอรี่หรือแหล่งจ่าย AC เพื่อให้กระแสไหล', en:'No power source — add a battery or AC source to make current flow' }] : [] };
  }

  // 2) ground = negative terminal supernode of the first source
  var ground = sn(sources[0].b);

  // 3) index non-ground supernodes
  var idx = {}, N = 0, seen = {};
  comps.forEach(function(c){
    compNodes(c).forEach(function(holeId){
      var node = sn(holeId);
      if (seen[node]) return; seen[node] = true;
      if (node !== ground){ idx[node] = N++; }
    });
  });
  var nV = sources.length;
  var M = N + nV;

  function gi(node){ return node === ground ? -1 : idx[node]; }

  // 4) iterate diode/LED on/off states + transistor regions
  var nonlin = branches.filter(function(c){ return isNonlin(c.type); });
  nonlin.forEach(function(d){ d._on = 0; });   // 0 off, 1 forward, -1 reverse (vdr)
  // BJT: t._rg ∈ {0 cutoff,1 active,2 sat}. MOSFET: Newton operating point (t._vgs/_vds) + region string
  transistors.forEach(function(t){
    if (transKind(t) === 'fet'){ t._vgs = 0; t._vds = 0; t._mreg = 'cutoff'; } else t._rg = 0;
    if (t._av == null) t._av = 0;   // avalanche latch persists across steps — only default it, never reset here
  });
  // opto: _don = input-LED state (0 off / 1 forward), _rg = output region (0 cutoff / 1 active / 2 sat)
  optos.forEach(function(o){ o._don = 0; o._rg = 0; });
  // relay: _en = armature latch (0 released / 1 energized) — persists across steps for hysteresis, like _av
  relays.forEach(function(r){ if (r._en == null) r._en = 0; });
  // thyristor: _lat = latch (0 blocking / ±1 conducting) — persists across solves, like the relay armature.
  // _gon = gate-cathode junction state (0 off / ±1 conducting), re-solved each time like a diode.
  // _latMoved caps the latch at ONE transition per solve: firing and dropping out depend on different
  // quantities (gate current vs main current), so letting both flip freely inside the loop can ping-pong
  // until MAXIT — and this solver accepts whatever the last iteration produced.
  scrs.forEach(function(t){ if (t._lat == null) t._lat = 0; t._gon = 0; t._latMoved = false; });
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
    // VCCS: current gm·(V(p)−V(q)) flows from node i to node j
    function stampVCCS(i, j, p, q, gm){
      if (i >= 0 && p >= 0) A[i][p] += gm;
      if (i >= 0 && q >= 0) A[i][q] -= gm;
      if (j >= 0 && p >= 0) A[j][p] -= gm;
      if (j >= 0 && q >= 0) A[j][q] += gm;
    }

    // Gmin to ground (numerical stability)
    for (var ni = 0; ni < N; ni++) A[ni][ni] += 1e-9;

    // resistor-family + diodes/leds/vdr + reactive companion models
    branches.forEach(function(c){
      var i = gi(sn(c.a)), j = gi(sn(c.b));
      if (RFAM[c.type]){ stampG(i, j, 1 / effR(c)); return; }
      if (c.type === 'cap'){   // Backward Euler: Geq = C/h in parallel with Ieq = (C/h)·Vprev
        var Gc = c.value / h; stampG(i, j, Gc); stampI(i, j, Gc * c._vPrev); return;
      }
      if (c.type === 'ind'){   // Backward Euler: Geq = h/L in parallel with Ieq = Iprev
        var Gl = h / c.value; stampG(i, j, Gl); stampI(i, j, -c._iPrev); return;
      }
      if (c.type === 'vdr'){   // symmetric clamp at ±Vc
        if (c._on){ var gv = 1 / VDR_RD; stampG(i, j, gv); stampI(i, j, c._on > 0 ? gv * c.vc : -gv * c.vc); }
        else { stampG(i, j, 1e-9); }
        return;
      }
      // diode / led: anode = a (i), cathode = b (j). _on: 1 forward, -1 zener reverse, 0 off
      var rd = diodeRd(c);
      if (c._on > 0){ var g = 1 / rd; stampG(i, j, g); stampI(i, j, g * c.vf); }
      else if (c._on < 0){ var gz = 1 / rd; stampG(i, j, gz); stampI(i, j, -gz * c.vz); }
      else { stampG(i, j, 1e-9); }
    });

    // transistors — pins: iC = a (collector/drain), iE = b (emitter/source), iB = g (base/gate)
    transistors.forEach(function(t){
      var iC = gi(sn(t.a)), iE = gi(sn(t.b)), iB = gi(sn(t.g));
      var s = transSign(t);   // +1 for npn/nmos, −1 for pnp/pmos
      if (transKind(t) === 'fet'){
        // square-law MOSFET, linearized (Newton companion) about the stored operating point.
        // device coords use s so one set of stamps covers n- and p-channel. gate draws no current.
        var m = mosfetModel(t._vgs, t._vds, t.vth || VTH_DEFAULT);
        var Ieq = m.Id - m.gm * t._vgs - m.gds * t._vds;
        stampG(iC, iE, m.gds + 1e-9);          // output conductance gds (+ tiny gmin)
        stampVCCS(iC, iE, iB, iE, m.gm);       // transconductance gm·(Vg−Vs) flows D→S
        stampI(iC, iE, -s * Ieq);              // companion current source
        return;
      }
      // avalanche/relaxation mode: base ignored; C–E is either open or a fired low-R clamp
      if (isAval(t)){
        if (t._av === 1) stampG(iC, iE, 1 / AV_RON);   // fired → dump path
        else stampG(iC, iE, AV_GOFF);                  // armed → open (collector free to float low)
        return;
      }
      // BJT large-signal companion
      if (t._rg === 0){ stampG(iB, iE, 1e-9); stampG(iC, iE, 1e-9); return; }   // cutoff
      var beta = t.beta || BETA_DEFAULT, gbe = 1 / BJT_RBE, gmc = beta * gbe;
      // base-emitter junction (diode companion); current direction set by s
      stampG(iB, iE, gbe); stampI(iB, iE, s * gbe * BJT_VBE);
      if (t._rg === 1){   // active: collector is a VCCS  IC = β·IB = gmc·(Vbe − Von)
        if (s > 0){ stampVCCS(iC, iE, iB, iE, gmc); stampI(iC, iE,  gmc * BJT_VBE); }
        else      { stampVCCS(iE, iC, iE, iB, gmc); stampI(iE, iC,  gmc * BJT_VBE); }
      } else {            // saturation: C–E clamped near Vce_sat (resistor companion)
        stampG(iC, iE, 1 / BJT_RSAT); stampI(iC, iE, s * BJT_VCE_SAT / BJT_RSAT);
      }
    });

    // optocouplers — input LED (a→b diode companion) + isolated phototransistor (g→h).
    // in the active region the collector is a light-coupled VCCS: IC = CTR·IF where
    // IF = (Va−Vk−VF)/RD, so gm is referenced to the INPUT pair — no wire between sides.
    optos.forEach(function(o){
      var iA = gi(sn(o.a)), iK = gi(sn(o.b)), iC = gi(sn(o.g)), iE = gi(sn(o.h));
      var gd = 1 / OPTO_RD;
      if (o._don > 0){ stampG(iA, iK, gd); stampI(iA, iK, gd * OPTO_VF); }
      else stampG(iA, iK, 1e-9);
      if (o._rg === 1){        // active: IC = gmo·(Va−Vk) − gmo·VF
        var gmo = (o.ctr || CTR_DEFAULT) / 100 * gd;
        stampVCCS(iC, iE, iA, iK, gmo); stampI(iC, iE, gmo * OPTO_VF);
        stampG(iC, iE, 1e-9);
      } else if (o._rg === 2){ // saturation: C–E clamped near Vce_sat (same clamp as the BJT)
        stampG(iC, iE, 1 / BJT_RSAT); stampI(iC, iE, BJT_VCE_SAT / BJT_RSAT);
      } else stampG(iC, iE, 1e-9);   // dark → output open
    });

    // relays: coil (a→b) = fixed resistor; SPDT contact (COM=g) closes onto NO=h when energized,
    // else onto NC=k. A closed contact is a near-short conductance; an open one is tiny leakage.
    relays.forEach(function(r){
      stampG(gi(sn(r.a)), gi(sn(r.b)), 1 / RELAY_RCOIL);
      var iCOM = gi(sn(r.g)), iNO = gi(sn(r.h)), iNC = gi(sn(r.k));
      stampG(iCOM, iNO, r._en === 1 ? 1 / RELAY_RON : RELAY_GOFF);
      stampG(iCOM, iNC, r._en === 1 ? RELAY_GOFF : 1 / RELAY_RON);
    });

    // thyristors: gate-cathode junction (g→b) as a diode companion + the main path (a→b), which is
    // either blocking leakage or a fired clamp (SCR_VT in series with SCR_RON) in the latched direction.
    scrs.forEach(function(t){
      var iA = gi(sn(t.a)), iK = gi(sn(t.b)), iG = gi(sn(t.g));
      var gg = 1 / SCR_RGT;
      if (t._gon > 0){ stampG(iG, iK, gg); stampI(iG, iK, gg * SCR_VGT); }
      else if (t._gon < 0){ stampG(iG, iK, gg); stampI(iG, iK, -gg * SCR_VGT); }   // TRIAC: gate fires either polarity
      else stampG(iG, iK, 1e-9);
      if (t._lat === 0){ stampG(iA, iK, SCR_GOFF); return; }
      var gm = 1 / SCR_RON;
      stampG(iA, iK, gm);
      stampI(iA, iK, t._lat > 0 ? gm * SCR_VT : -gm * SCR_VT);
    });

    // potentiometers (linear): two resistors R1 (end a→wiper) and R2 (wiper→end b)
    pots.forEach(function(p){
      var pr = potR(p);
      stampG(gi(sn(p.a)), gi(sn(p.g)), 1 / pr.r1);
      stampG(gi(sn(p.g)), gi(sn(p.b)), 1 / pr.r2);
    });

    // voltage sources (battery = DC, ac = sinusoidal at the current sim time): a = +, b = −
    sources.forEach(function(c, k){
      var col = N + k, p = gi(sn(c.a)), n = gi(sn(c.b));
      if (p >= 0){ A[p][col] += 1; A[col][p] += 1; }
      if (n >= 0){ A[n][col] -= 1; A[col][n] -= 1; }
      bv[col] += srcValue(c);
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
      var rd = diodeRd(c);
      if (c._on > 0){
        if ((vd - c.vf) / rd < -1e-9){ c._on = 0; changed = true; }
      } else if (c._on < 0){
        if ((vd + c.vz) / rd > 1e-9){ c._on = 0; changed = true; }
      } else if (vd > c.vf){ c._on = 1; changed = true; }
      else if (hasReverseClamp(c) && vd < -c.vz){ c._on = -1; changed = true; }
    });
    // transistor region selection (junction-based, mirrors the diode toggling)
    transistors.forEach(function(t){
      var s = transSign(t);
      if (isAval(t)) return;   // avalanche latch is updated once per committed step (below), not in this loop
      if (transKind(t) === 'fet'){
        // Newton step: re-linearize about the freshly solved operating point until it stops moving
        var nvgs = s * (V(sn(t.g)) - V(sn(t.b)));    // gate − source (device coords)
        var nvds = s * (V(sn(t.a)) - V(sn(t.b)));    // drain − source
        var m = mosfetModel(nvgs, nvds, t.vth || VTH_DEFAULT);
        if (Math.abs(nvgs - t._vgs) > 1e-4 || Math.abs(nvds - t._vds) > 1e-4 || m.region !== t._mreg) changed = true;
        var dvg = nvgs - t._vgs;                     // limit the gate step for stability
        if (dvg > 1) nvgs = t._vgs + 1; else if (dvg < -1) nvgs = t._vgs - 1;
        t._vgs = nvgs; t._vds = nvds; t._mreg = m.region;
        return;
      }
      // Saturation is detected from current, not from a B-C junction threshold: the sat companion
      // settles at Vce = BJT_VCE_SAT + BJT_RSAT·Ic, so a "Vb − Vc > 0.45" test rejects its own
      // model's answer once Ic passes ~13 mA and the loop ping-pongs sat↔active until MAXIT.
      // Same hysteresis the optocoupler below uses: leave sat only when the clamp would pass more
      // than the base drive allows; enter it when the collector has collapsed to the clamp.
      var vbe = s * (V(sn(t.g)) - V(sn(t.b)));       // base − emitter
      var nr;
      if (vbe < BJT_VBE_ON) nr = 0;
      else {
        var ib = Math.max(0, (vbe - BJT_VBE) / BJT_RBE);
        var icmax = (t.beta || BETA_DEFAULT) * ib;   // most the base can command
        var vce = s * (V(sn(t.a)) - V(sn(t.b)));
        if (t._rg === 2) nr = ((vce - BJT_VCE_SAT) / BJT_RSAT > icmax + 1e-9) ? 1 : 2;
        else nr = (vce < BJT_VCE_SAT - 1e-3) ? 2 : 1;
      }
      if (nr !== t._rg){ t._rg = nr; changed = true; }
    });
    // optocoupler: input-LED on/off toggling + output-region selection
    optos.forEach(function(o){
      var vd = V(sn(o.a)) - V(sn(o.b));
      if (o._don > 0){ if ((vd - OPTO_VF) / OPTO_RD < -1e-9){ o._don = 0; changed = true; } }
      else if (vd > OPTO_VF){ o._don = 1; changed = true; }
      var IF = o._don > 0 ? Math.max(0, (vd - OPTO_VF) / OPTO_RD) : 0;
      var icmax = (o.ctr || CTR_DEFAULT) / 100 * IF;         // light-limited collector current
      var vce = V(sn(o.g)) - V(sn(o.h));
      var nro;
      if (icmax < 1e-6) nro = 0;                                                            // dark → cutoff
      else if (o._rg === 2) nro = ((vce - BJT_VCE_SAT) / BJT_RSAT > icmax + 1e-9) ? 1 : 2;  // clamp passing more than the light allows → back to active
      else nro = (vce < BJT_VCE_SAT - 1e-3) ? 2 : 1;                                        // collector collapsed → saturated
      if (nro !== o._rg){ o._rg = nro; changed = true; }
    });
    // thyristor gate-cathode junction — a plain diode, toggled like the ones above
    scrs.forEach(function(t){
      var vg = V(sn(t.g)) - V(sn(t.b));                     // gate − cathode
      var ng = vg > SCR_VGT ? 1 : (isTriac(t) && vg < -SCR_VGT) ? -1 : 0;
      if (ng !== t._gon){ t._gon = ng; changed = true; }
    });
    // relay armature: pull in at/above VPULL, release below VDROP (hysteresis latch)
    relays.forEach(function(r){
      var vcoil = Math.abs(V(sn(r.a)) - V(sn(r.b)));
      var ne = r._en === 1 ? (vcoil < RELAY_VDROP ? 0 : 1) : (vcoil >= RELAY_VPULL ? 1 : 0);
      if (ne !== r._en){ r._en = ne; changed = true; }
    });
    // Thyristor latch — decided only once everything else has settled for this iteration. Judging it
    // mid-flight is wrong: a series diode still sitting in its reset state makes the main current read
    // as zero, and the device would drop out on the way to the answer. Firing and dropping out also
    // depend on different quantities (gate current vs main current), so allow at most ONE transition
    // per solve (_latMoved) — otherwise the two rules can ping-pong until MAXIT, and this solver
    // accepts whatever the last iteration produced.
    if (!changed) scrs.forEach(function(t){
      if (t._latMoved) return;
      var vak = V(sn(t.a)) - V(sn(t.b));
      if (t._lat === 0){
        var vg2 = V(sn(t.g)) - V(sn(t.b));
        var ig = t._gon !== 0 ? (Math.abs(vg2) - SCR_VGT) / SCR_RGT : 0;
        if (ig < scrIgt(t)) return;                          // not enough gate drive to fire
        // fire in whichever direction the main terminals are biased (a TRIAC latches either way)
        if (vak > SCR_VT){ t._lat = 1; t._latMoved = true; changed = true; }
        else if (isTriac(t) && vak < -SCR_VT){ t._lat = -1; t._latMoved = true; changed = true; }
        return;
      }
      var iMain = (vak - t._lat * SCR_VT) / SCR_RON;         // signed current through the fired clamp
      if (Math.abs(iMain) < scrIh(t) || iMain * t._lat < 0){  // below the holding current, or reversed
        t._lat = 0; t._latMoved = true; changed = true;
      }
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
    if (c.type === 'cap'){   // Ic = C/h·(Vnew − Vprev); advance Vprev only when committing a step
      I = (c.value / h) * (vd - c._vPrev);
      c.results = { V:vd, I:I, on:Math.abs(I) > 1e-6 };
      if (commit) c._vPrev = vd;
      return;
    }
    if (c.type === 'ind'){   // Il = Iprev + h/L·V; advance Iprev only when committing a step
      I = c._iPrev + (h / c.value) * vd;
      c.results = { V:vd, I:I, on:Math.abs(I) > 1e-6 };
      if (commit) c._iPrev = I;
      return;
    }
    if (c.type === 'vdr'){
      I = c._on > 0 ? (vd - c.vc) / VDR_RD : c._on < 0 ? (vd + c.vc) / VDR_RD : 0;
      c.results = { V:vd, I:I, on:Math.abs(I) > 3e-4 };
      return;
    }
    var rd = diodeRd(c);
    I = c._on > 0 ? (vd - c.vf) / rd : c._on < 0 ? (vd + c.vz) / rd : 0;
    var on = Math.abs(I) > 3e-4;        // conducting (forward, or zener reverse)
    // perceptual brightness 0..1 (≈ full at 12 mA) — fades smoothly to 0 so a discharging
    // cap visibly dims the LED instead of snapping off
    var bright = (c.type === 'led' && c._on > 0 && I > 0) ? Math.min(1, Math.sqrt(I / 0.012)) : 0;
    c.results = { V:vd, I:I, on:on, lit:(c._on > 0 && on), bright:bright };
    if (c.type === 'led' && I > 0.03) warnings.push({ t:'warn', th:'กระแส LED สูงเกิน (' + fmtI(I) + ') — ในงานจริงต้องมี R จำกัดกระแส', en:'LED current too high (' + fmtI(I) + ') — add a current-limiting resistor' });
  });
  sources.forEach(function(c, k){
    var I = sol[N + k];                 // source current
    c.results = { V:srcValue(c), I:Math.abs(I), on:Math.abs(I) > 1e-6, _raw:I };
    if (Math.abs(I) > 0.8) warnings.push({ t:'warn', th:'กระแสจากแหล่งจ่ายสูงมาก (' + fmtI(Math.abs(I)) + ') — อาจลัดวงจร!', en:'Very high source current (' + fmtI(Math.abs(I)) + ') — possible short circuit!' });
  });
  wires.forEach(function(c){ c.results = { V:0, I:0, on:false }; });
  comps.filter(isSwitchy).forEach(function(c){ c.results = { V:0, I:0, on:c.closed }; });

  // transistors — report Vce/Vds across a→b and the collector/drain current
  transistors.forEach(function(t){
    var s = transSign(t);
    var vC = Vof(sn(t.a)), vE = Vof(sn(t.b)), vB = Vof(sn(t.g));
    var vce = s * (vC - vE);             // collector-emitter (drain-source) voltage
    var Imain = 0, Ib = 0, region;
    if (isAval(t)){
      var vd = vC - vE, vbr = t.vbr || AV_VBR_DEFAULT;
      var fired = t._av === 1;                            // the state this solve actually used
      var Idev = fired ? vd / AV_RON : 0;                 // signed C→E current through the fired clamp
      t.results = { V:vd, I:Idev, on:fired, region:fired ? 'avon' : 'avoff', Vce:vd, Ib:0, Ic:Math.abs(Idev) };
      if (commit){                                        // advance the hysteretic latch for the next step
        if (!fired){ if (Math.abs(vd) >= vbr) t._av = 1; }          // charge reached V_BR → fire
        else if (Math.abs(Idev) < AV_IHOLD) t._av = 0;             // dump current spent → extinguish
      }
      return;
    }
    if (transKind(t) === 'fet'){
      var m = mosfetModel(s * (vB - vE), vce, t.vth || VTH_DEFAULT);   // evaluate at the solved point
      region = m.region; Imain = m.Id;              // drain current D→S (device coords, ≥0)
    } else {
      var vbe = s * (vB - vE);
      Ib = t._rg ? Math.max(0, (vbe - BJT_VBE) / BJT_RBE) : 0;
      region = t._rg === 0 ? 'cutoff' : t._rg === 2 ? 'sat' : 'active';
      Imain = t._rg === 1 ? (t.beta || BETA_DEFAULT) * Ib : t._rg === 2 ? Math.max(0, (vce - BJT_VCE_SAT) / BJT_RSAT) : 0;
    }
    // results.I drives the C→E electron animation (a→b), signed by transistor polarity
    t.results = { V:vce, I:s * Imain, on:region !== 'cutoff' && Imain > 3e-4, region:region, Ib:Ib, Ic:Imain, Vce:vce };
  });

  // optocouplers — input LED current + isolated output collector current / region
  optos.forEach(function(o){
    var va = Vof(sn(o.a)), vk = Vof(sn(o.b)), vc = Vof(sn(o.g)), ve = Vof(sn(o.h));
    var IF = o._don > 0 ? Math.max(0, (va - vk - OPTO_VF) / OPTO_RD) : 0;
    var vce = vc - ve;
    var Ic = o._rg === 1 ? (o.ctr || CTR_DEFAULT) / 100 * IF
           : o._rg === 2 ? Math.max(0, (vce - BJT_VCE_SAT) / BJT_RSAT) : 0;
    var region = o._rg === 0 ? 'cutoff' : o._rg === 2 ? 'sat' : 'active';
    // results.I = input LED current → drives the a→b electron dots; Ic animates g→h separately
    o.results = { V:vce, I:IF, on:IF > 3e-4 || Ic > 3e-4, If:IF, Ic:Ic, Vce:vce, region:region,
                  bright:IF > 0 ? Math.min(1, Math.sqrt(IF / 0.012)) : 0 };
    if (IF > 0.03) warnings.push({ t:'warn', th:'กระแส LED ฝั่งเข้าของออปโตสูงเกิน (' + fmtI(IF) + ') — ต้องมี R จำกัดกระแส', en:'Optocoupler input-LED current too high (' + fmtI(IF) + ') — add a series resistor' });
  });

  // relays — coil voltage/current + energized state + which contact is carrying current
  relays.forEach(function(r){
    var vcoil = Vof(sn(r.a)) - Vof(sn(r.b)), Icoil = vcoil / RELAY_RCOIL;
    var en = r._en === 1;
    var conNode = en ? sn(r.h) : sn(r.k);                 // the currently-closed throw (NO or NC)
    var Icon = (Vof(sn(r.g)) - Vof(conNode)) / RELAY_RON; // current through the closed contact
    r.results = { V:vcoil, I:Icoil, on:(Math.abs(Icoil) > 1e-6 || Math.abs(Icon) > 1e-6),
                  en:en, Vcoil:vcoil, Icoil:Icoil, Icon:Icon };
  });

  // thyristors — main-terminal voltage/current, gate current and the latch state
  scrs.forEach(function(t){
    var vak = Vof(sn(t.a)) - Vof(sn(t.b)), vg = Vof(sn(t.g)) - Vof(sn(t.b));
    var Ig = t._gon !== 0 ? (Math.abs(vg) - SCR_VGT) / SCR_RGT : 0;
    var I = t._lat !== 0 ? (vak - t._lat * SCR_VT) / SCR_RON : 0;
    t.results = { V:vak, I:I, on:t._lat !== 0, region:t._lat !== 0 ? 'on' : 'cutoff',
                  Ig:Ig, Vak:vak, lat:t._lat };
    if (Ig > 0.05) warnings.push({ t:'warn', th:'กระแสเกตสูงเกินไป (' + fmtI(Ig) + ') — ต้องมี R จำกัดกระแสที่ขาเกต', en:'Gate current too high (' + fmtI(Ig) + ') — add a series resistor at the gate' });
  });

  // potentiometers — report the divider voltage + the current in each leg
  pots.forEach(function(p){
    var pr = potR(p), va = Vof(sn(p.a)), vw = Vof(sn(p.g)), vb = Vof(sn(p.b));
    var Ia = (va - vw) / pr.r1, Ib2 = (vw - vb) / pr.r2;
    p.results = { V:va - vb, I:Ia, on:(Math.abs(Ia) > 1e-6 || Math.abs(Ib2) > 1e-6), Ia:Ia, Ib:Ib2, Vw:vw, r1:pr.r1, r2:pr.r2 };
  });

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

  var res = solveCircuit(SIM_H, false);   // snapshot of the current instant (does not advance C/L state)
  lastRes = res;

  // draw components
  while (gComps.firstChild) gComps.removeChild(gComps.firstChild);
  ledGlows = []; optoGlows = []; relayGlows = [];
  comps.forEach(drawComp);

  rebuildElectrons();
  renderReadout(res);
  syncTransientPanel();
  if (tool === 'meter'){ drawProbes(); updateMeter(); }   // keep the meter reading live
}

function drawComp(c){
  if (c.type === 'transistor'){ drawTransistor(c); return; }
  if (c.type === 'scr'){ drawScr(c); return; }
  if (c.type === 'pot'){ drawPot(c); return; }
  if (c.type === 'ac'){ drawAC(c); return; }
  if (c.type === 'opto'){ drawOpto(c); return; }
  if (c.type === 'relay'){ drawRelay(c); return; }
  var A = holes[c.a], B = holes[c.b];
  var dx = B.x - A.x, dy = B.y - A.y;
  var len = Math.sqrt(dx * dx + dy * dy);
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var g = el('g', { transform:'translate(' + A.x + ',' + A.y + ') rotate(' + ang.toFixed(2) + ')', class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.type === 'wire'){
    if (c.id === selectedId) g.appendChild(el('line', { x1:0, y1:0, x2:len, y2:0, stroke:'#f59e0b', 'stroke-width':8, 'stroke-linecap':'round', opacity:'0.35' }));
    if ((c.color || 'green') === 'white')   // faint on the light board → add a thin casing
      g.appendChild(el('line', { x1:0, y1:0, x2:len, y2:0, stroke:'#94a3b8', 'stroke-width':5, 'stroke-linecap':'round' }));
    g.appendChild(el('line', { x1:0, y1:0, x2:len, y2:0, stroke:wireHex(c), 'stroke-width':4, 'stroke-linecap':'round' }));
    gComps.appendChild(g); return;
  }

  if (c.id === selectedId)   // highlight box behind the body (drawn for all non-wire parts)
    g.appendChild(el('rect', { x:-4, y:-16, width:len + 8, height:32, rx:6, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));

  if (c.type === 'button'){
    // tactile pushbutton: square body + round cap that sinks in (and turns green) while held
    var pr = c.closed;
    var pw = Math.min(30, len * 0.6), px = (len - pw) / 2, px2 = px + pw, pcx = px + pw / 2;
    g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:px, y2:0 }));
    g.appendChild(el('line', { class:'bb-comp-lead', x1:px2, y1:0, x2:len, y2:0 }));
    g.appendChild(el('circle', { cx:px, cy:0, r:2.6, fill:'#475569' }));
    g.appendChild(el('circle', { cx:px2, cy:0, r:2.6, fill:'#475569' }));
    // body
    g.appendChild(el('rect', { x:px, y:-9, width:pw, height:18, rx:3,
      fill:pr ? '#dcfce7' : '#f1f5f9', stroke:pr ? '#16a34a' : '#94a3b8', 'stroke-width':1.8 }));
    // cap — smaller + darker when pressed, so the travel reads at a glance whatever the colour
    var bc = btnColor(c);
    g.appendChild(el('circle', { cx:pcx, cy:0, r:pr ? 4.6 : 6,
      fill:pr ? bc.dark : bc.hex, stroke:'#334155', 'stroke-width':1 }));
    if (!pr) g.appendChild(el('circle', { cx:pcx - 1.6, cy:-1.6, r:1.5, fill:'#fff', opacity:'0.45' }));   // highlight
    gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -16,
      pr ? (isEN() ? 'PRESSED' : 'กดอยู่') : (isEN() ? 'PUSH' : 'ปุ่มกด'), pr ? '#16a34a' : '#94a3b8'));
    gComps.appendChild(g); return;
  }

  if (c.type === 'switch'){
    // slide switch: housing tints + knob slides to the ON (left) / OFF (right) side
    var cl = c.closed;
    var bw = Math.min(34, len * 0.6), bx = (len - bw) / 2, bx2 = bx + bw;
    g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:bx, y2:0 }));
    g.appendChild(el('line', { class:'bb-comp-lead', x1:bx2, y1:0, x2:len, y2:0 }));
    g.appendChild(el('circle', { cx:bx, cy:0, r:2.6, fill:'#475569' }));
    g.appendChild(el('circle', { cx:bx2, cy:0, r:2.6, fill:'#475569' }));
    // housing
    g.appendChild(el('rect', { x:bx, y:-8, width:bw, height:16, rx:4,
      fill:cl ? '#dcfce7' : '#f1f5f9', stroke:cl ? '#16a34a' : '#94a3b8', 'stroke-width':1.8 }));
    // sliding knob (left = ON, right = OFF)
    var kw = bw / 2 - 4, kx = cl ? bx + 3 : bx2 - kw - 3;
    g.appendChild(el('rect', { x:kx, y:-6, width:kw, height:12, rx:3,
      fill:cl ? '#16a34a' : '#64748b', stroke:'#334155', 'stroke-width':0.8 }));
    g.appendChild(el('line', { x1:kx + kw / 2 - 2, y1:-3, x2:kx + kw / 2 - 2, y2:3, stroke:'#fff', 'stroke-width':1, opacity:'0.7' }));
    g.appendChild(el('line', { x1:kx + kw / 2 + 2, y1:-3, x2:kx + kw / 2 + 2, y2:3, stroke:'#fff', 'stroke-width':1, opacity:'0.7' }));
    gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -15, cl ? (isEN() ? 'ON' : 'ปิด') : (isEN() ? 'OFF' : 'เปิด'), cl ? '#16a34a' : '#94a3b8'));
    gComps.appendChild(g); return;
  }

  // leads from each hole to the body
  var bodyLen = Math.min(len * 0.5, 30), x1 = (len - bodyLen) / 2, x2 = x1 + bodyLen;
  g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:x1, y2:0 }));
  g.appendChild(el('line', { class:'bb-comp-lead', x1:x2, y1:0, x2:len, y2:0 }));

  var on = c.results && c.results.on;
  if (RFAM[c.type] || c.type === 'vdr'){
    var bd = (RTYPE_STYLE[c.type] || RTYPE_STYLE.resistor).border;
    if (c.type === 'resistor'){
      // realistic beige body + 5-band colour code (3 digits + multiplier + brown 1% tolerance)
      g.appendChild(el('rect', { x:x1, y:-7, width:bodyLen, height:14, rx:5, fill:'#e3c79b', stroke:'#b08642', 'stroke-width':1 }));
      var b = bands5(effR(c));
      if (b){
        var cols = [bandColor(b[0]), bandColor(b[1]), bandColor(b[2]), multColor(b[3]), '#92400e'];
        var bw_ = Math.max(2, bodyLen * 0.085), frac = [0.16, 0.30, 0.44, 0.60, 0.86];
        for (var bi = 0; bi < 5; bi++)
          g.appendChild(el('rect', { x:x1 + bodyLen * frac[bi] - bw_ / 2, y:-7, width:bw_, height:14, fill:cols[bi], stroke:'rgba(0,0,0,.28)', 'stroke-width':0.4 }));
      }
      gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -16, fmtR(effR(c)), bd));
    } else {
      g.appendChild(el('rect', { x:x1, y:-7, width:bodyLen, height:14, rx:3, fill:resistorHeat(c), stroke:bd, 'stroke-width':1.8 }));
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
    var dv = c.variant || 'silicon', dt = DIODE_TYPES[dv] || DIODE_TYPES.silicon;
    diodeSymbol(g, x1, x2, on ? '#1e293b' : '#94a3b8', on ? dt.border : '#94a3b8', dv);
    var dlab = dv === 'zener' ? 'ZD ' + (c.vz || zenerVz) + 'V'
             : dv === 'tvs' ? 'TVS ' + (c.vz || zenerVz) + 'V'
             : dv === 'germanium' ? 'Ge' : dv === 'schottky' ? 'Sk' : 'Si';
    gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -15, dlab, dt.border));
  } else if (c.type === 'led'){
    var col = LED_COLORS[c.color];
    var b0 = (c.results && c.results.bright) || 0, lit0 = b0 > 0.02;
    // wide soft halo — scales with brightness (opacity + radius) so the fade is visible
    var halo = el('circle', { cx:len / 2, cy:0, r:(9 + 16 * b0).toFixed(1), fill:col.glow, opacity:(0.9 * b0).toFixed(3), filter:'url(#bb-glow)' });
    g.appendChild(halo);
    var symAt = g.childNodes.length;
    diodeSymbol(g, x1, x2, lit0 ? col.fill : '#cbd5e1', lit0 ? col.fill : '#94a3b8');
    var tri = g.childNodes[symAt], bar = g.childNodes[symAt + 1];
    // bright hot core on top of the symbol — sells the "emitting light" look
    var core = el('circle', { cx:len / 2, cy:0, r:(3 + 5 * b0).toFixed(1), fill:'#ffffff', opacity:(0.95 * b0).toFixed(3), filter:'url(#bb-glow)' });
    g.appendChild(core);
    // emission arrows
    var arr1 = el('line', { x1:len/2+2, y1:-9, x2:len/2+9, y2:-16, stroke:lit0?col.fill:'#cbd5e1', 'stroke-width':1.6, 'stroke-linecap':'round' });
    var arr2 = el('line', { x1:len/2+8, y1:-5, x2:len/2+15, y2:-12, stroke:lit0?col.fill:'#cbd5e1', 'stroke-width':1.6, 'stroke-linecap':'round' });
    g.appendChild(arr1); g.appendChild(arr2);
    ledGlows.push({ c:c, halo:halo, core:core, tri:tri, bar:bar, arrows:[arr1, arr2] });
  } else if (c.type === 'cap'){
    // two parallel plates at the centre
    var cm = len / 2;
    g.appendChild(el('line', { x1:0, y1:0, x2:cm - 3, y2:0, class:'bb-comp-lead' }));
    g.appendChild(el('line', { x1:cm + 3, y1:0, x2:len, y2:0, class:'bb-comp-lead' }));
    g.appendChild(el('line', { x1:cm - 3, y1:-10, x2:cm - 3, y2:10, stroke:'#7c3aed', 'stroke-width':3 }));
    g.appendChild(el('line', { x1:cm + 3, y1:-10, x2:cm + 3, y2:10, stroke:'#7c3aed', 'stroke-width':3 }));
    gComps.appendChild(uprightText(cm, A.x, A.y, ang, -16, 'C ' + fmtC(c.value), '#7c3aed'));
  } else if (c.type === 'ind'){
    // coil: four humps over the body span
    var n = 4, span = x2 - x1, r = span / (n * 2), d = 'M ' + x1 + ' 0';
    for (var k = 0; k < n; k++){ var sx = x1 + k * 2 * r; d += ' A ' + r + ' ' + r + ' 0 0 1 ' + (sx + 2 * r) + ' 0'; }
    g.appendChild(el('path', { d:d, fill:'none', stroke:'#0891b2', 'stroke-width':2.4 }));
    gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -14, 'L ' + fmtL(c.value), '#0891b2'));
  }
  gComps.appendChild(g);
}

function diodeSymbol(g, x1, x2, triFill, barColor, variant){
  // triangle pointing a→b (anode→cathode), bar at cathode end
  g.appendChild(el('polygon', { points:x1 + ',-8 ' + x1 + ',8 ' + x2 + ',0', fill:triFill, stroke:'#334155', 'stroke-width':1 }));
  if (variant === 'zener'){          // cathode bar with bent tails (Z shape)
    g.appendChild(el('path', { d:'M ' + (x2 - 5) + ' -9 L ' + x2 + ' -9 L ' + x2 + ' 9 L ' + (x2 + 5) + ' 9',
      fill:'none', stroke:barColor, 'stroke-width':3, 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
  } else if (variant === 'schottky'){ // cathode bar with square hooks (S shape)
    g.appendChild(el('path', { d:'M ' + (x2 - 4) + ' -5 L ' + (x2 - 4) + ' -9 L ' + x2 + ' -9 L ' + x2 + ' 9 L ' + (x2 + 4) + ' 9 L ' + (x2 + 4) + ' 5',
      fill:'none', stroke:barColor, 'stroke-width':3, 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
  } else if (variant === 'tvs'){       // cathode bar with both tails bent the same way ( [ bracket )
    g.appendChild(el('path', { d:'M ' + (x2 - 5) + ' -9 L ' + x2 + ' -9 L ' + x2 + ' 9 L ' + (x2 - 5) + ' 9',
      fill:'none', stroke:barColor, 'stroke-width':3, 'stroke-linecap':'round', 'stroke-linejoin':'round' }));
  } else {
    g.appendChild(el('line', { x1:x2, y1:-9, x2:x2, y2:9, stroke:barColor, 'stroke-width':3, 'stroke-linecap':'round' }));
  }
}

function regionShort(r){ return r === 'cutoff' ? 'OFF' : r === 'active' ? 'ACT' : r === 'sat' || r === 'satfet' ? 'SAT' : r === 'triode' ? 'OHM' : r === 'on' ? 'ON' : r === 'avon' ? 'FIRE' : r === 'avoff' ? 'ARM' : ''; }

// 3-pin transistor: body circle at the centroid + colour-coded leads to each pin
function drawTransistor(c){
  var A = holes[c.a], B = holes[c.b], Gp = holes[c.g];   // a = collector/drain, b = emitter/source, g = base/gate
  var st = TRANSISTOR_TYPES[c.tt] || TRANSISTOR_TYPES.npn;
  var fet = transKind(c) === 'fet', names = pinNames(c);
  var cx = (A.x + B.x + Gp.x) / 3, cy = (A.y + B.y + Gp.y) / 3, R = 15;
  var on = c.results && c.results.on;

  var g = el('g', { class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.id === selectedId)
    g.appendChild(el('circle', { cx:cx, cy:cy, r:R + 7, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));

  // leads from each pin hole to the body edge + pin letters
  var pins = [
    { h:Gp, name:names[0], col:'#f59e0b' },   // base / gate
    { h:A,  name:names[1], col:'#ef4444' },   // collector / drain
    { h:B,  name:names[2], col:'#3b82f6' }    // emitter / source
  ];
  pins.forEach(function(p){
    var ang = Math.atan2(p.h.y - cy, p.h.x - cx);
    g.appendChild(el('line', { x1:p.h.x, y1:p.h.y, x2:cx + Math.cos(ang) * R, y2:cy + Math.sin(ang) * R,
      stroke:on ? p.col : '#94a3b8', 'stroke-width':2.4, 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:p.h.x, cy:p.h.y, r:2.6, fill:on ? p.col : '#64748b' }));
    var t = txt(p.h.x + Math.cos(ang) * 11, p.h.y + Math.sin(ang) * 11 + 3, p.name, 'bb-lbl', p.col);
    t.setAttribute('font-weight', '800'); t.setAttribute('font-size', '9');
    g.appendChild(t);
  });

  // body circle + a small (decorative) schematic glyph indicating type/direction
  g.appendChild(el('circle', { cx:cx, cy:cy, r:R, fill:'var(--card)', stroke:st.border, 'stroke-width':2.2 }));
  var s = transSign(c);
  if (fet){
    g.appendChild(el('line', { x1:cx - 5, y1:cy - 6, x2:cx - 5, y2:cy + 6, stroke:st.border, 'stroke-width':2 }));      // gate bar
    g.appendChild(el('line', { x1:cx - 1, y1:cy - 7, x2:cx - 1, y2:cy + 7, stroke:st.border, 'stroke-width':2 }));      // channel
    g.appendChild(el('line', { x1:cx - 1, y1:cy - 5, x2:cx + 7, y2:cy - 5, stroke:st.border, 'stroke-width':1.6 }));     // drain
    g.appendChild(el('line', { x1:cx - 1, y1:cy + 5, x2:cx + 7, y2:cy + 5, stroke:st.border, 'stroke-width':1.6 }));     // source
    // body arrow (n-ch points in toward channel, p-ch points out)
    var ax = cx + 3;
    g.appendChild(el('polygon', { points: s > 0 ? (ax) + ',' + cy + ' ' + (ax + 4) + ',' + (cy - 3) + ' ' + (ax + 4) + ',' + (cy + 3)
                                                : (ax + 4) + ',' + cy + ' ' + (ax) + ',' + (cy - 3) + ' ' + (ax) + ',' + (cy + 3), fill:st.border }));
  } else {
    g.appendChild(el('line', { x1:cx - 5, y1:cy - 7, x2:cx - 5, y2:cy + 7, stroke:st.border, 'stroke-width':2.4 }));     // base bar
    g.appendChild(el('line', { x1:cx - 5, y1:cy - 3, x2:cx + 7, y2:cy - 8, stroke:st.border, 'stroke-width':1.6 }));     // collector lead
    g.appendChild(el('line', { x1:cx - 5, y1:cy + 3, x2:cx + 7, y2:cy + 8, stroke:st.border, 'stroke-width':1.6 }));     // emitter lead
    // emitter arrow: NPN points away from base (out), PNP points toward base (in)
    if (s > 0) g.appendChild(el('polygon', { points:(cx + 7) + ',' + (cy + 8) + ' ' + (cx + 2) + ',' + (cy + 8) + ' ' + (cx + 5) + ',' + (cy + 3), fill:st.border }));
    else       g.appendChild(el('polygon', { points:(cx - 5) + ',' + (cy + 3) + ' ' + (cx) + ',' + (cy + 2) + ' ' + (cx) + ',' + (cy + 8), fill:st.border }));
  }

  var lbl = (c.av ? 'AV·' : '') + st[isEN() ? 'en' : 'th'] + (c.results && c.results.region ? ' · ' + regionShort(c.results.region) : '');
  var tl = txt(cx, cy - R - 6, lbl, 'bb-lbl', st.border); tl.setAttribute('font-weight', '700');
  g.appendChild(tl);

  gComps.appendChild(g);
}

// 3-pin thyristor: body circle at the centroid + colour-coded leads, glowing while latched
function drawScr(c){
  var A = holes[c.a], K = holes[c.b], Gp = holes[c.g];   // a = anode/MT2, b = cathode/MT1, g = gate
  var st = scrStyle(c), on = !!(c.results && c.results.on);
  var cx = (A.x + K.x + Gp.x) / 3, cy = (A.y + K.y + Gp.y) / 3, R = 15;

  var g = el('g', { class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.id === selectedId)
    g.appendChild(el('circle', { cx:cx, cy:cy, r:R + 7, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));
  if (on)   // latched → the body glows, so "it is still on" is visible at a glance
    g.appendChild(el('circle', { cx:cx, cy:cy, r:R + 5, fill:'rgba(245,158,11,0.28)' }));

  var pins = [
    { h:A,  name:st.pins[0], col:'#ef4444' },   // anode / MT2
    { h:K,  name:st.pins[1], col:'#3b82f6' },   // cathode / MT1
    { h:Gp, name:st.pins[2], col:'#f59e0b' }    // gate
  ];
  pins.forEach(function(p){
    var ang = Math.atan2(p.h.y - cy, p.h.x - cx);
    g.appendChild(el('line', { x1:p.h.x, y1:p.h.y, x2:cx + Math.cos(ang) * R, y2:cy + Math.sin(ang) * R,
      stroke:on ? p.col : '#94a3b8', 'stroke-width':2.4, 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:p.h.x, cy:p.h.y, r:2.6, fill:on ? p.col : '#64748b' }));
    var t = txt(p.h.x + Math.cos(ang) * 13, p.h.y + Math.sin(ang) * 13 + 3, p.name, 'bb-lbl', p.col);
    t.setAttribute('font-weight', '800'); t.setAttribute('font-size', '9');
    g.appendChild(t);
  });

  g.appendChild(el('circle', { cx:cx, cy:cy, r:R, fill:'var(--card)', stroke:st.border, 'stroke-width':2.2 }));
  // glyph: SCR = one triangle + bar (a gated diode); TRIAC = two triangles back to back
  if (isTriac(c)){
    g.appendChild(el('polygon', { points:(cx - 7) + ',' + (cy - 8) + ' ' + (cx + 1) + ',' + (cy - 8) + ' ' + (cx - 3) + ',' + cy, fill:st.border }));
    g.appendChild(el('polygon', { points:(cx - 1) + ',' + (cy + 8) + ' ' + (cx + 7) + ',' + (cy + 8) + ' ' + (cx + 3) + ',' + cy, fill:st.border }));
    g.appendChild(el('line', { x1:cx - 9, y1:cy, x2:cx + 9, y2:cy, stroke:st.border, 'stroke-width':1.6 }));
  } else {
    g.appendChild(el('polygon', { points:(cx - 7) + ',' + (cy - 7) + ' ' + (cx + 7) + ',' + (cy - 7) + ' ' + cx + ',' + (cy + 3), fill:st.border }));
    g.appendChild(el('line', { x1:cx - 8, y1:cy + 3, x2:cx + 8, y2:cy + 3, stroke:st.border, 'stroke-width':2.2 }));
    g.appendChild(el('line', { x1:cx + 8, y1:cy + 3, x2:cx + 8, y2:cy + 8, stroke:st.border, 'stroke-width':1.6 }));   // gate stub
  }

  var lbl = st[isEN() ? 'en' : 'th'] + ' · ' + (on ? (isEN() ? 'ON' : 'นำกระแส') : (isEN() ? 'blocking' : 'กั้นไฟ'));
  var tl = txt(cx, cy - R - 6, lbl, 'bb-lbl', on ? '#b45309' : st.border);
  tl.setAttribute('font-weight', '700');
  g.appendChild(tl);

  gComps.appendChild(g);
}

// AC source: circle with a sine glyph + polarity marks, along a→b
function drawAC(c){
  var A = holes[c.a], B = holes[c.b];
  var dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var col = '#d97706';
  var g = el('g', { transform:'translate(' + A.x + ',' + A.y + ') rotate(' + ang.toFixed(2) + ')', class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });
  var mid = len / 2, R = 12;
  if (c.id === selectedId)
    g.appendChild(el('circle', { cx:mid, cy:0, r:R + 6, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));
  g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:mid - R, y2:0 }));
  g.appendChild(el('line', { class:'bb-comp-lead', x1:mid + R, y1:0, x2:len, y2:0 }));
  g.appendChild(el('circle', { cx:mid, cy:0, r:R, fill:'var(--card)', stroke:col, 'stroke-width':2 }));
  // sine squiggle inside the circle
  g.appendChild(el('path', { d:'M ' + (mid - 8) + ' 0 Q ' + (mid - 4) + ' -7 ' + mid + ' 0 T ' + (mid + 8) + ' 0', fill:'none', stroke:col, 'stroke-width':1.8, 'stroke-linecap':'round' }));
  // polarity hints near each lead (a = +, b = −)
  g.appendChild(txt(R * 0.6, -6, '+', 'bb-lbl', col));
  g.appendChild(txt(len - R * 0.6, -6, '−', 'bb-lbl', col));
  gComps.appendChild(g);
  gComps.appendChild(uprightText(mid, A.x, A.y, ang, -17, (c.vp != null ? c.vp : acVp) + 'V ' + (c.freq || acFreq) + 'Hz', col));
}

// 3-pin potentiometer: resistor body along a→b + a wiper arm from g to the body (position = VR knob)
function drawPot(c){
  var A = holes[c.a], B = holes[c.b], Wp = holes[c.g];
  var dx = B.x - A.x, dy = B.y - A.y, len = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
  var pr = potR(c), bd = RTYPE_STYLE.vr.border;
  var g = el('g', { transform:'translate(' + A.x + ',' + A.y + ') rotate(' + ang.toFixed(2) + ')', class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });
  if (c.id === selectedId)
    g.appendChild(el('rect', { x:-4, y:-16, width:len + 8, height:32, rx:6, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));
  var bodyLen = Math.min(len * 0.5, 30), x1 = (len - bodyLen) / 2, x2 = x1 + bodyLen;
  g.appendChild(el('line', { class:'bb-comp-lead', x1:0, y1:0, x2:x1, y2:0 }));
  g.appendChild(el('line', { class:'bb-comp-lead', x1:x2, y1:0, x2:len, y2:0 }));
  g.appendChild(el('rect', { x:x1, y:-7, width:bodyLen, height:14, rx:3, fill:resistorHeat(c), stroke:bd, 'stroke-width':1.8 }));
  gComps.appendChild(g);
  // wiper arm (global coords): from the wiper hole to the contact point that slides along the body with the knob
  var f = (x1 + bodyLen * pr.k) / len;
  var cx = A.x + dx * f, cy = A.y + dy * f;
  var dlen = Math.sqrt((Wp.x - cx) * (Wp.x - cx) + (Wp.y - cy) * (Wp.y - cy)) || 1;
  var ux = (cx - Wp.x) / dlen, uy = (cy - Wp.y) / dlen;     // unit vector wiper→contact (for the arrowhead)
  gComps.appendChild(el('line', { x1:Wp.x, y1:Wp.y, x2:cx, y2:cy, stroke:bd, 'stroke-width':2.2, 'stroke-linecap':'round' }));
  gComps.appendChild(el('circle', { cx:Wp.x, cy:Wp.y, r:2.6, fill:bd }));
  gComps.appendChild(el('polygon', { points:
    cx + ',' + cy + ' ' + (cx - ux * 7 - uy * 4) + ',' + (cy - uy * 7 + ux * 4) + ' ' + (cx - ux * 7 + uy * 4) + ',' + (cy - uy * 7 - ux * 4), fill:bd }));
  gComps.appendChild(uprightText(len / 2, A.x, A.y, ang, -16, 'POT ' + fmtRshort(pr.total) + ' · ' + Math.round(env.vrPos) + '%', bd));
}

// 4-pin optocoupler: DIP-4-style body at the centroid — input LED (A/K) + light arrows
// crossing the dashed isolation gap to the phototransistor (C/E)
function drawOpto(c){
  var A = holes[c.a], K = holes[c.b], C = holes[c.g], E = holes[c.h];
  var cx = (A.x + K.x + C.x + E.x) / 4, cy = (A.y + K.y + C.y + E.y) / 4;
  var res = c.results || {}, lit = (res.If || 0) > 3e-4, out = (res.Ic || 0) > 3e-4;
  var bd = '#c2410c';
  var g = el('g', { class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.id === selectedId)
    g.appendChild(el('rect', { x:cx - 31, y:cy - 24, width:62, height:48, rx:8, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));

  // leads from each pin hole toward the body + pin letters
  var pins = [
    { h:A, name:'A', col:'#ef4444' },
    { h:K, name:'K', col:'#78716c' },
    { h:C, name:'C', col:'#16a34a' },
    { h:E, name:'E', col:'#3b82f6' }
  ];
  pins.forEach(function(p){
    var angp = Math.atan2(p.h.y - cy, p.h.x - cx);
    g.appendChild(el('line', { x1:p.h.x, y1:p.h.y, x2:cx + Math.cos(angp) * 24, y2:cy + Math.sin(angp) * 15,
      stroke:(lit || out) ? p.col : '#94a3b8', 'stroke-width':2.4, 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:p.h.x, cy:p.h.y, r:2.6, fill:(lit || out) ? p.col : '#64748b' }));
    var t = txt(p.h.x + Math.cos(angp) * 11, p.h.y + Math.sin(angp) * 11 + 3, p.name, 'bb-lbl', p.col);
    t.setAttribute('font-weight', '800'); t.setAttribute('font-size', '9');
    g.appendChild(t);
  });

  // soft red glow behind the input LED — restyled every transient frame via optoGlows
  var bright = res.bright || 0;
  var halo = el('circle', { cx:cx - 11, cy:cy, r:(6 + 10 * bright).toFixed(1), fill:'#fca5a5', opacity:(0.8 * bright).toFixed(3), filter:'url(#bb-glow)' });
  g.appendChild(halo);
  // body + isolation gap
  g.appendChild(el('rect', { x:cx - 24, y:cy - 16, width:48, height:32, rx:6, fill:'var(--card)', stroke:bd, 'stroke-width':2.2 }));
  g.appendChild(el('line', { x1:cx + 1, y1:cy - 13, x2:cx + 1, y2:cy + 13, stroke:'#94a3b8', 'stroke-width':1, 'stroke-dasharray':'3 3' }));
  // input LED symbol (pointing down: A top / K bottom by convention)
  var ledCol = lit ? '#ef4444' : '#94a3b8';
  g.appendChild(el('polygon', { points:(cx - 17) + ',' + (cy - 6) + ' ' + (cx - 5) + ',' + (cy - 6) + ' ' + (cx - 11) + ',' + (cy + 5), fill:'none', stroke:ledCol, 'stroke-width':1.8 }));
  g.appendChild(el('line', { x1:cx - 16, y1:cy + 5, x2:cx - 6, y2:cy + 5, stroke:ledCol, 'stroke-width':1.8 }));
  // light arrows across the gap
  var arrCol = lit ? '#f59e0b' : '#cbd5e1';
  var a1 = el('line', { x1:cx - 3, y1:cy - 5, x2:cx + 4, y2:cy - 5, stroke:arrCol, 'stroke-width':1.6, 'stroke-linecap':'round' });
  var a2 = el('line', { x1:cx - 3, y1:cy + 3, x2:cx + 4, y2:cy + 3, stroke:arrCol, 'stroke-width':1.6, 'stroke-linecap':'round' });
  var ah1 = el('polygon', { points:(cx + 7) + ',' + (cy - 5) + ' ' + (cx + 2) + ',' + (cy - 8) + ' ' + (cx + 2) + ',' + (cy - 2), fill:arrCol });
  var ah2 = el('polygon', { points:(cx + 7) + ',' + (cy + 3) + ' ' + (cx + 2) + ',' + cy + ' ' + (cx + 2) + ',' + (cy + 6), fill:arrCol });
  g.appendChild(a1); g.appendChild(a2); g.appendChild(ah1); g.appendChild(ah2);
  // phototransistor: vertical bar + collector/emitter diagonals
  var trCol = out ? '#16a34a' : '#94a3b8';
  g.appendChild(el('line', { x1:cx + 11, y1:cy - 8, x2:cx + 11, y2:cy + 8, stroke:trCol, 'stroke-width':2.6 }));
  g.appendChild(el('line', { x1:cx + 11, y1:cy - 3, x2:cx + 19, y2:cy - 10, stroke:trCol, 'stroke-width':1.6 }));
  g.appendChild(el('line', { x1:cx + 11, y1:cy + 3, x2:cx + 19, y2:cy + 10, stroke:trCol, 'stroke-width':1.6 }));

  var lbl = 'OPTO ' + (c.ctr || CTR_DEFAULT) + '%' + (res.region ? ' · ' + regionShort(res.region) : '');
  var tl = txt(cx, cy - 22, lbl, 'bb-lbl', bd); tl.setAttribute('font-weight', '700');
  g.appendChild(tl);

  optoGlows.push({ c:c, halo:halo, arrows:[a1, a2, ah1, ah2] });
  gComps.appendChild(g);
}

// 5-pin relay: body box at the centroid with a coil symbol (left) + a pivoting SPDT armature
// (right) that swings COM→NO when energized / COM→NC when released. Coil (+/−), COM, NO, NC leads
// fan out to their holes. The armature + coil colour update every frame via relayGlows.
function drawRelay(c){
  var A = holes[c.a], B = holes[c.b], COM = holes[c.g], NO = holes[c.h], NC = holes[c.k];
  var cx = (A.x + B.x + COM.x + NO.x + NC.x) / 5, cy = (A.y + B.y + COM.y + NO.y + NC.y) / 5;
  var en = !!(c.results && c.results.en), flow = !!(c.results && c.results.on);
  var bd = '#7c3aed';
  var g = el('g', { class:'bb-comp-hit' });
  g.addEventListener('pointerdown', function(ev){ startDrag(ev, c); });

  if (c.id === selectedId)
    g.appendChild(el('rect', { x:cx - 34, y:cy - 26, width:68, height:52, rx:8, fill:'rgba(245,158,11,0.10)', stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'5 3' }));

  // leads from each pin hole toward the body + pin letters
  var pins = [
    { h:A,   name:'+',   col:'#ef4444' },
    { h:B,   name:'−',   col:'#3b82f6' },
    { h:COM, name:'COM', col:'#334155' },
    { h:NO,  name:'NO',  col:'#16a34a' },
    { h:NC,  name:'NC',  col:'#ca8a04' }
  ];
  pins.forEach(function(p){
    var angp = Math.atan2(p.h.y - cy, p.h.x - cx);
    g.appendChild(el('line', { x1:p.h.x, y1:p.h.y, x2:cx + Math.cos(angp) * 26, y2:cy + Math.sin(angp) * 17,
      stroke:flow ? p.col : '#94a3b8', 'stroke-width':2.4, 'stroke-linecap':'round' }));
    g.appendChild(el('circle', { cx:p.h.x, cy:p.h.y, r:2.6, fill:flow ? p.col : '#64748b' }));
    var t = txt(p.h.x + Math.cos(angp) * 12, p.h.y + Math.sin(angp) * 12 + 3, p.name, 'bb-lbl', p.col);
    t.setAttribute('font-weight', '800'); t.setAttribute('font-size', '8');
    g.appendChild(t);
  });

  // body box
  g.appendChild(el('rect', { x:cx - 26, y:cy - 17, width:52, height:34, rx:6, fill:'var(--card)', stroke:bd, 'stroke-width':2.2 }));

  // coil symbol (left) — humps; energized = blue/magnetized, released = grey
  var coilCol = en ? '#2563eb' : '#94a3b8';
  var coilX = cx - 20, humps = el('path', {
    d:'M ' + coilX + ' ' + (cy - 9) + ' q 7 3 0 6 q 7 3 0 6 q 7 3 0 6',
    fill:'none', stroke:coilCol, 'stroke-width':2 });
  g.appendChild(humps);
  g.appendChild(el('line', { x1:coilX, y1:cy - 9, x2:coilX, y2:cy + 9, stroke:coilCol, 'stroke-width':1, opacity:0.5 }));

  // SPDT contacts (right): pivot at COM, throws NO (upper) / NC (lower)
  var pvX = cx + 2, pvY = cy, noX = cx + 20, noY = cy - 8, ncX = cx + 20, ncY = cy + 8;
  g.appendChild(el('circle', { cx:noX, cy:noY, r:2.3, fill:'#16a34a' }));   // NO terminal
  g.appendChild(el('circle', { cx:ncX, cy:ncY, r:2.3, fill:'#ca8a04' }));   // NC terminal
  g.appendChild(el('circle', { cx:pvX, cy:pvY, r:2.6, fill:'#334155' }));   // COM pivot
  var arm = el('line', { x1:pvX, y1:pvY, x2:(en ? noX : ncX), y2:(en ? noY : ncY),
    stroke:'#334155', 'stroke-width':2.4, 'stroke-linecap':'round' });
  g.appendChild(arm);

  var lbl = 'RELAY · ' + (en ? (isEN() ? 'ON' : 'ทำงาน') : (isEN() ? 'OFF' : 'พัก'));
  var tl = txt(cx, cy - 23, lbl, 'bb-lbl', bd); tl.setAttribute('font-weight', '700');
  g.appendChild(tl);

  relayGlows.push({ c:c, arm:arm, humps:humps, noX:noX, noY:noY, ncX:ncX, ncY:ncY, pvX:pvX, pvY:pvY });
  gComps.appendChild(g);
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

// ── resistor colour code (5-band) ──────────────────────────────────────────
// digit 0-9 → standard band colour
var BAND_DIGIT = ['#1a1a1a','#92400e','#e11d2a','#f97316','#eab308','#22c55e','#2563eb','#8b5cf6','#6b7280','#f1f5f9'];
function bandColor(d){ return BAND_DIGIT[d] || '#1a1a1a'; }
function multColor(m){ return m === -1 ? '#d4af37' : m === -2 ? '#c0c0c0' : (BAND_DIGIT[m] || '#1a1a1a'); }
// value → [d1, d2, d3, multiplierExponent] for a 3-significant-digit (5-band) resistor
function bands5(R){
  if (!(R > 0)) return null;
  var mult = 0, v = R;
  while (v >= 999.5){ v /= 10; mult++; }
  while (v < 100){ v *= 10; mult--; }
  v = Math.round(v);
  if (v >= 1000){ v = Math.round(v / 10); mult++; }
  return [Math.floor(v / 100), Math.floor(v / 10) % 10, v % 10, mult];
}

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
var ledGlows = [];   // {c, halo, tri, bar, arrows} — restyled every transient frame so LEDs dim smoothly
var optoGlows = [];  // {c, halo, arrows} — same idea for the optocoupler's input-LED glow + light arrows
var relayGlows = []; // {c, arm, humps, ...} — armature/coil restyled every frame as the relay energizes

// update LED visuals from the latest brightness without redrawing the whole board
function updateLeds(){
  for (var i = 0; i < ledGlows.length; i++){
    var G = ledGlows[i], b = (G.c.results && G.c.results.bright) || 0, col = LED_COLORS[G.c.color], lit = b > 0.02;
    G.halo.setAttribute('opacity', (0.9 * b).toFixed(3));
    G.halo.setAttribute('r', (9 + 16 * b).toFixed(1));
    G.core.setAttribute('opacity', (0.95 * b).toFixed(3));
    G.core.setAttribute('r', (3 + 5 * b).toFixed(1));
    G.tri.setAttribute('fill', lit ? col.fill : '#cbd5e1');
    G.bar.setAttribute('stroke', lit ? col.fill : '#94a3b8');
    G.arrows.forEach(function(a){ a.setAttribute('stroke', lit ? col.fill : '#cbd5e1'); });
  }
  for (var j = 0; j < optoGlows.length; j++){
    var O = optoGlows[j], ob = (O.c.results && O.c.results.bright) || 0, olit = ob > 0.02;
    O.halo.setAttribute('opacity', (0.8 * ob).toFixed(3));
    O.halo.setAttribute('r', (6 + 10 * ob).toFixed(1));
    O.arrows.forEach(function(a){ a.setAttribute(a.tagName === 'polygon' ? 'fill' : 'stroke', olit ? '#f59e0b' : '#cbd5e1'); });
  }
  for (var r = 0; r < relayGlows.length; r++){
    var R = relayGlows[r], ren = !!(R.c.results && R.c.results.en);
    R.arm.setAttribute('x2', ren ? R.noX : R.ncX);
    R.arm.setAttribute('y2', ren ? R.noY : R.ncY);
    R.humps.setAttribute('stroke', ren ? '#2563eb' : '#94a3b8');
  }
}
function rebuildElectrons(){
  while (gElec.firstChild) gElec.removeChild(gElec.firstChild);
  elecDots = [];
  comps.forEach(function(c){
    if (c.type === 'wire' || c.type === 'battery' || c.type === 'ac' || isSwitchy(c)) return;
    if (!c.results || !c.results.on) return;
    if (c.type === 'pot'){            // two legs: end a → wiper, wiper → end b
      [[c.a, c.g, c.results.Ia], [c.g, c.b, c.results.Ib]].forEach(function(seg){
        var Is = Math.abs(seg[2]); if (Is < 1e-5) return;
        var sdir = seg[2] >= 0 ? 1 : -1, sspeed = Math.max(0.12, Math.min(0.9, Is * 18));
        for (var q = 0; q < 2; q++){
          var sd = el('circle', { class:'bb-elec', r:3.2, filter:'url(#bb-glow)' });
          gElec.appendChild(sd);
          elecDots.push({ el:sd, a:seg[0], b:seg[1], dir:sdir, speed:sspeed, f:q / 2 });
        }
      });
      return;
    }
    if (c.type === 'relay'){          // coil current (a→b) + the closed contact (COM→NO or COM→NC)
      var segs = [[c.a, c.b, c.results.Icoil]];
      var conB = c.results.en ? c.h : c.k;
      segs.push([c.g, conB, c.results.Icon]);
      segs.forEach(function(seg){
        var Is = Math.abs(seg[2]); if (Is < 1e-5) return;
        var sdir = seg[2] >= 0 ? 1 : -1, sspeed = Math.max(0.12, Math.min(0.9, Is * 18));
        for (var q = 0; q < 3; q++){
          var rd = el('circle', { class:'bb-elec', r:3.2, filter:'url(#bb-glow)' });
          gElec.appendChild(rd);
          elecDots.push({ el:rd, a:seg[0], b:seg[1], dir:sdir, speed:sspeed, f:q / 3 });
        }
      });
      return;
    }
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
    // BJT: also animate the (smaller) base current along g→b so the control path is visible
    if (c.type === 'transistor' && transKind(c) === 'bjt' && c.results.Ib > 1e-6){
      var sb = transSign(c), ds = sb >= 0 ? 1 : -1, bspeed = Math.max(0.1, Math.min(0.7, c.results.Ib * 60));
      for (var kb = 0; kb < 2; kb++){
        var bd = el('circle', { class:'bb-elec', r:2.4, filter:'url(#bb-glow)' });
        gElec.appendChild(bd);
        elecDots.push({ el:bd, a:c.g, b:c.b, dir:ds, speed:bspeed, f:kb / 2 });
      }
    }
    // thyristor: the generic a→b dots above are the main current; add the (small) gate current g→b
    if (c.type === 'scr' && c.results.Ig > 1e-6){
      var gspeed = Math.max(0.1, Math.min(0.7, c.results.Ig * 60));
      for (var kg = 0; kg < 2; kg++){
        var gd2 = el('circle', { class:'bb-elec', r:2.4, filter:'url(#bb-glow)' });
        gElec.appendChild(gd2);
        elecDots.push({ el:gd2, a:c.g, b:c.b, dir:1, speed:gspeed, f:kg / 2 });
      }
    }
    // opto: also animate the isolated output current along C→E (the generic a→b dots above cover the input LED)
    if (c.type === 'opto' && c.results.Ic > 1e-5){
      var ospeed = Math.max(0.12, Math.min(0.9, c.results.Ic * 18));
      for (var ko = 0; ko < 3; ko++){
        var od = el('circle', { class:'bb-elec', r:3.2, filter:'url(#bb-glow)' });
        gElec.appendChild(od);
        elecDots.push({ el:od, a:c.g, b:c.h, dir:1, speed:ospeed, f:ko / 3 });
      }
    }
  });
}

var lastTs = null, rafId = null;
function tick(ts){
  if (lastTs === null) lastTs = ts;
  var dt = Math.min((ts - lastTs) / 1000, 0.05); lastTs = ts;

  // advance the transient simulation when reactive parts OR an AC source are present
  if (hasReactive() || hasAC()){
    var dtSim = dt * SIM_SPEEDS[simSpeedIdx];
    // substep small enough to resolve the highest AC frequency (≥40 points/cycle) — avoids aliasing
    var subMax = SIM_SUBSTEP, fmax = maxACFreq();
    if (fmax > 0) subMax = Math.min(subMax, 1 / (fmax * 40));
    var n = Math.max(1, Math.ceil(dtSim / subMax)), h = dtSim / n;
    for (var s = 0; s < n; s++){ simTime += h; lastRes = solveCircuit(h, true); }   // advance time per substep (AC value tracks simTime)
    sampleGraph();
    renderAcc += dt;
    if (renderAcc > 0.06){
      renderAcc = 0; rebuildElectrons(); updateLeds(); renderReadout(lastRes); drawGraph();
      if (tool === 'meter'){ drawProbes(); updateMeter(); }
    }
  }

  for (var i = 0; i < elecDots.length; i++){
    var d = elecDots[i], A = holes[d.a], B = holes[d.b];
    d.f = (d.f + d.speed * dt) % 1;
    var t = d.dir > 0 ? d.f : 1 - d.f;
    d.el.setAttribute('cx', (A.x + (B.x - A.x) * t).toFixed(1));
    d.el.setAttribute('cy', (A.y + (B.y - A.y) * t).toFixed(1));
  }
  rafId = requestAnimationFrame(tick);
}
function hasReactive(){ return comps.some(function(c){ return c.type === 'cap' || c.type === 'ind'; }); }
document.addEventListener('visibilitychange', function(){
  if (document.hidden){ if (rafId !== null){ cancelAnimationFrame(rafId); rafId = null; } lastTs = null; }
  else if (rafId === null) rafId = requestAnimationFrame(tick);
});

// ════════════════════════════ TRANSIENT PANEL / GRAPH ════════════════════════════
// pick which component the graph tracks (selected one wins, else first reactive, else AC source)
function graphable(c){ return c && (c.type === 'cap' || c.type === 'ind' || c.type === 'ac'); }
function trackedComp(){
  var sel = compById(graphComp);   if (graphable(sel)) return sel;
  sel = compById(selectedId);      if (graphable(sel)) return sel;
  var i;
  for (i = 0; i < comps.length; i++) if (comps[i].type === 'cap' || comps[i].type === 'ind') return comps[i];
  for (i = 0; i < comps.length; i++) if (comps[i].type === 'ac') return comps[i];   // fall back to the AC source
  return null;
}
// the graphed signal: inductor → current, capacitor/AC source → voltage
function trackedSignal(c){ return c.type === 'ind' ? (c.results ? c.results.I : 0) : (c.results ? c.results.V : 0); }

function restartTransient(){
  comps.forEach(function(c){ if (c.type === 'cap') c._vPrev = 0; if (c.type === 'ind') c._iPrev = 0; if (c.av) c._av = 0; if (c.type === 'scr') c._lat = 0; if (c.type === 'relay') c._en = 0; });
  simTime = 0; graphHist = []; renderAcc = 0;
  rebuild();
}

function sampleGraph(){
  var c = trackedComp(); if (!c){ graphHist = []; return; }
  graphHist.push({ t:simTime, v:trackedSignal(c) });
  var win = graphWindow();
  while (graphHist.length > 2 && graphHist[0].t < simTime - win) graphHist.shift();
  if (graphHist.length > 1200) graphHist.shift();
}
function graphWindow(){
  // show ~5τ when a time constant is known; else ~3 AC periods; else a fixed window
  if (graphTau && graphTau > 0) return Math.min(Math.max(graphTau * 5, 0.2), 120);
  var f = minACFreq();
  if (f > 0) return Math.min(Math.max(3 / f, 0.4), 30);
  return 5;
}

function syncTransientPanel(){
  var panel = $('bb-transient'); if (!panel) return;
  var show = hasReactive() || hasAC();
  panel.style.display = show ? '' : 'none';
  if (!show){ graphHist = []; return; }
  document.querySelectorAll('.bb-sp[data-sp]').forEach(function(b){ b.classList.toggle('active', +b.dataset.sp === simSpeedIdx); });
  var c = trackedComp();
  graphTau = (c && (c.type === 'cap' || c.type === 'ind')) ? tauOf(c) : null;
  drawGraph();
}

// estimate the time constant: τ = Rth·C (cap) or L/Rth (inductor), Rth seen across the part
function tauOf(target){
  if (!target || (target.type !== 'cap' && target.type !== 'ind')) return null;
  var uf = UF();
  comps.forEach(function(c){ uf.add(holes[c.a].node); uf.add(holes[c.b].node); });
  // for the DC-ish Thevenin view: batteries shorted, inductors shorted, other caps open
  comps.forEach(function(c){
    if (c.type === 'wire' || (isSwitchy(c) && c.closed) || c.type === 'battery' || c.type === 'ac' || (c.type === 'ind' && c !== target))
      uf.union(holes[c.a].node, holes[c.b].node);
  });
  function sn(h){ return uf.find(holes[h].node); }
  var na = sn(target.a), nb = sn(target.b);
  if (na === nb) return 0;
  var ground = nb, idx = {}, N = 0, seen = {};
  comps.forEach(function(c){ [sn(c.a), sn(c.b)].forEach(function(n){ if (seen[n]) return; seen[n] = true; if (n !== ground) idx[n] = N++; }); });
  if (!(na in idx) && na !== ground) idx[na] = N++;
  if (N === 0) return null;
  var A = []; for (var r = 0; r < N; r++) A.push(new Array(N).fill(0));
  var b = new Array(N).fill(0);
  function gi(n){ return n === ground ? -1 : idx[n]; }
  function stamp(i, j, g){ if (i >= 0) A[i][i] += g; if (j >= 0) A[j][j] += g; if (i >= 0 && j >= 0){ A[i][j] -= g; A[j][i] -= g; } }
  for (var k = 0; k < N; k++) A[k][k] += 1e-9;
  comps.forEach(function(c){
    if (c === target || c.type === 'cap') return;
    var i = gi(sn(c.a)), j = gi(sn(c.b));
    if (RFAM[c.type]){ stamp(i, j, 1 / effR(c)); return; }
    if ((c.type === 'diode' || c.type === 'led') && c.results && c.results.on) stamp(i, j, 1 / diodeRd(c));
    else if (c.type === 'vdr' && c.results && c.results.on) stamp(i, j, 1 / VDR_RD);
  });
  var ia = gi(na); if (ia < 0) return 0;
  b[ia] = 1;                              // inject 1 A → node voltage equals Rth
  var x = solveLinear(A, b);
  if (!x) return null;
  var Rth = Math.abs(x[ia]);
  return target.type === 'cap' ? Rth * target.value : (Rth > 1e-9 ? target.value / Rth : null);
}

function drawGraph(){
  var svg2 = $('bb-graph-svg'); if (!svg2) return;
  while (svg2.firstChild) svg2.removeChild(svg2.firstChild);
  var en = isEN(), info = $('bb-graph-info');
  var c = trackedComp();
  if (!c){ if (info) info.textContent = en ? 'Place a capacitor, inductor, or AC source to see its curve.' : 'วางตัวเก็บประจุ/ตัวเหนี่ยวนำ/แหล่งจ่าย AC เพื่อดูเส้นโค้ง'; return; }

  var W = 260, H = 130, pad = 6;
  svg2.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  svg2.setAttribute('preserveAspectRatio', 'none');
  var isCurrent = c.type === 'ind', accent = c.type === 'cap' ? '#7c3aed' : c.type === 'ind' ? '#0891b2' : '#d97706';
  var win = graphWindow(), t1 = simTime, t0 = Math.max(0, t1 - win);

  // y-range from history within window (padded, always includes 0)
  var vmax = 0, vmin = 0, i;
  for (i = 0; i < graphHist.length; i++){ var v = graphHist[i].v; if (v > vmax) vmax = v; if (v < vmin) vmin = v; }
  if (vmax - vmin < 1e-9) vmax = vmin + 1;
  var rng = (vmax - vmin) * 1.15, mid = (vmax + vmin) / 2;
  vmax = mid + rng / 2; vmin = mid - rng / 2;
  function X(t){ return pad + (W - 2 * pad) * (win > 0 ? (t - t0) / win : 0); }
  function Y(v){ return pad + (H - 2 * pad) * (1 - (v - vmin) / (vmax - vmin)); }

  // zero baseline
  if (vmin < 0 && vmax > 0){
    svg2.appendChild(el('line', { x1:pad, y1:Y(0).toFixed(1), x2:W - pad, y2:Y(0).toFixed(1), stroke:'#334155', 'stroke-width':1, 'stroke-dasharray':'3 3' }));
  }
  // the curve
  var pts = '';
  for (i = 0; i < graphHist.length; i++){ var p = graphHist[i]; if (p.t < t0) continue; pts += X(p.t).toFixed(1) + ',' + Y(p.v).toFixed(1) + ' '; }
  if (pts) svg2.appendChild(el('polyline', { points:pts.trim(), fill:'none', stroke:accent, 'stroke-width':2 }));
  // current value dot
  if (graphHist.length){ var last = graphHist[graphHist.length - 1]; svg2.appendChild(el('circle', { cx:X(last.t).toFixed(1), cy:Y(last.v).toFixed(1), r:3, fill:accent })); }

  if (info){
    var sig = trackedSignal(c);
    var label = compName(c, en) + ' — ' + (isCurrent ? 'I' : 'V') + ' = <b>' + (isCurrent ? fmtI(sig) : fmtV(sig)) + '</b>';
    var tauTxt = (graphTau != null && graphTau > 0) ? ' · τ ≈ <span class="tau">' + fmtTime(graphTau) + '</span>' : '';
    info.innerHTML = label + tauTxt + ' · t = ' + fmtTime(simTime);
  }
}

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
      } else if (isSwitchy(c)){
        var onTxt = c.type === 'button' ? (en ? 'PRESSED' : 'กดอยู่') : (en ? 'ON' : 'ปิด');
        var offTxt = c.type === 'button' ? (en ? 'released' : 'ปล่อย') : (en ? 'OFF' : 'เปิด');
        st = '<span class="bb-dot" style="background:' + (c.closed ? '#16a34a' : '#94a3b8') + '"></span>' + (c.closed ? onTxt : offTxt);
      } else if (c.type === 'transistor' || c.type === 'opto'){
        var rg = c.results && c.results.region, conduct = rg && rg !== 'cutoff';
        st = '<span class="bb-dot" style="background:' + (conduct ? '#16a34a' : '#94a3b8') + '"></span>' + (regionShort(rg) || '—');
      } else if (c.type === 'scr'){
        var lit = c.results && c.results.lat;
        st = '<span class="bb-dot" style="background:' + (lit ? '#b45309' : '#94a3b8') + '"></span>' +
             (lit ? (en ? 'LATCHED' : 'นำกระแส') : (en ? 'blocking' : 'กั้นไฟ'));
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
    // a closed switch/button reports on = "contacts closed", which is not the same as carrying
    // current — don't let it claim the circuit is conducting when nothing is flowing
    var anyOn = comps.some(function(c){ return c.results && c.results.on && c.type !== 'battery' && !isSwitchy(c); });
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
  if (c.type === 'ac') return (en ? 'AC ' : 'AC ') + (c.vp != null ? c.vp : acVp) + 'V ' + (c.freq || acFreq) + 'Hz';
  if (c.type === 'diode'){
    var dt = DIODE_TYPES[c.variant] || DIODE_TYPES.silicon;
    if (c.variant === 'zener') return (en ? 'Zener ' : 'ซีเนอร์ ') + (c.vz || zenerVz) + 'V';
    if (c.variant === 'tvs') return 'TVS ' + (c.vz || zenerVz) + 'V';
    return en ? (dt.en + ' diode') : ('ไดโอด' + dt.th);
  }
  if (c.type === 'led') return (en ? 'LED ' : 'LED ') + LED_COLORS[c.color][en ? 'en' : 'th'];
  if (c.type === 'switch') return en ? 'Switch' : 'สวิตช์';
  if (c.type === 'button') return en ? 'Pushbutton' : 'ปุ่มกด';
  if (c.type === 'cap') return 'C ' + fmtC(c.value);
  if (c.type === 'ind') return 'L ' + fmtL(c.value);
  if (c.type === 'pot') return (en ? 'Pot ' : 'POT ') + fmtR(c.value || potVal);
  if (c.type === 'opto') return (en ? 'Optocoupler (CTR ' : 'ออปโตคัปเปลอร์ (CTR ') + (c.ctr || CTR_DEFAULT) + '%)';
  if (c.type === 'relay') return (en ? 'Relay (SPDT)' : 'รีเลย์ (SPDT)');
  if (c.type === 'scr') return scrStyle(c)[en ? 'en' : 'th'] + ' (I' + (en ? 'H ' : 'H ') + fmtA(scrIh(c)) + ')';
  if (c.type === 'transistor'){
    var ts = TRANSISTOR_TYPES[c.tt] || TRANSISTOR_TYPES.npn;
    if (isAval(c)) return ts[en ? 'en' : 'th'] + (en ? ' avalanche (V_BR ' : ' avalanche (V_BR ') + (c.vbr || AV_VBR_DEFAULT) + 'V)';
    return ts[en ? 'en' : 'th'] + (transKind(c) === 'fet' ? ' (Vth ' + (c.vth || transVth) + 'V)' : ' (β' + (c.beta || transBeta) + ')');
  }
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
    meterTargetComp = null;
    if (clickShift && (probeRed != null || probeBlk != null)) meterExtend([c.a, c.b]);  // Shift = widen the span to reach this part
    else { probeRed = c.a; probeBlk = c.b; }
    if (meterMode === 'cont' && probeCtx && probeRed != null && probeBlk != null && probeCtx.connected(probeRed, probeBlk)) beep();
  }
  drawProbes(); updateMeter();
}
function meterClickHole(id){
  if (meterIsCompMode()){
    flashHint(isEN() ? 'Click on a component to measure it.' : 'คลิกที่ตัวอุปกรณ์เพื่อวัดค่า');
    return;
  }
  meterTargetComp = null;
  if (clickShift && (probeRed != null || probeBlk != null)) meterExtend([id]);          // Shift = widen the span to this point
  else if (probeRed == null) probeRed = id;
  else if (probeBlk == null && id !== probeRed) probeBlk = id;
  else { probeRed = id; probeBlk = null; }   // start a new pair
  if (meterMode === 'cont' && probeCtx && probeRed != null && probeBlk != null && probeCtx.connected(probeRed, probeBlk)) beep();
  drawProbes(); updateMeter();
}
// widen the probe span to also cover `extra` holes — keep the two endpoints that are farthest apart
function meterExtend(extra){
  var cand = [];
  if (probeRed != null) cand.push(probeRed);
  if (probeBlk != null) cand.push(probeBlk);
  extra.forEach(function(h){ cand.push(h); });
  var pair = farthestPair(cand);
  probeRed = pair[0]; probeBlk = pair[1];
}
function farthestPair(ids){
  var u = []; ids.forEach(function(id){ if (id != null && u.indexOf(id) < 0) u.push(id); });
  if (u.length < 2) return [u[0], u[0]];
  var best = [u[0], u[1]], bd = -1, i, j;
  for (i = 0; i < u.length; i++) for (j = i + 1; j < u.length; j++){
    var A = holes[u[i]], B = holes[u[j]], d = (A.x - B.x) * (A.x - B.x) + (A.y - B.y) * (A.y - B.y);
    if (d > bd){ bd = d; best = [u[i], u[j]]; }
  }
  if (best[1] === probeRed) best = [best[1], best[0]];   // keep the existing red probe as red
  return best;
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
  if (probeRed != null && probeBlk != null){   // dashed line shows the measured span
    var ha = holes[probeRed], hb = holes[probeBlk];
    gProbe.appendChild(el('line', { x1:ha.x, y1:ha.y, x2:hb.x, y2:hb.y, stroke:'#f59e0b', 'stroke-width':2, 'stroke-dasharray':'4 3', opacity:'0.75' }));
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
    setTip('คลิกอุปกรณ์ = วัดคร่อมตัวนั้น • Shift+คลิก = ขยายช่วงพาดหลายตัว • หรือคลิกรู 2 จุด', 'Click a part = across it • Shift+click = widen the span • or click two holes');
    if (probeRed == null) return lcd(P('แตะโพรบจุดแรก', 'Probe 1st point'), '', true);
    if (probeBlk == null) return lcd(P('แตะโพรบจุดที่สอง', 'Probe 2nd point'), '', true);
    if (!probeCtx) return lcd('—', '', true);
    var va = probeCtx.V(probeRed), vb = probeCtx.V(probeBlk);
    if (va == null || vb == null) return lcd(P('จุดลอย (ไม่มีอ้างอิง)', 'Floating node'), '', true);
    var d = va - vb;
    return lcd((d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2), 'V');
  }
  if (meterMode === 'cont'){
    setTip('คลิก 2 รู/อุปกรณ์ • Shift+คลิก = ขยายช่วง', 'Click two holes/parts • Shift+click = widen the span');
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
    if (c.type === 'opto'){   // diode test across the input LED (pins A-K)
      if (meterRev) return lcd('OL', P('กลับขั้ว', 'reversed'));
      return lcd(OPTO_VF.toFixed(2), 'V');
    }
    if (c.type === 'scr'){    // the only junction a meter can read is gate-cathode
      if (meterRev && !isTriac(c)) return lcd('OL', P('กลับขั้ว', 'reversed'));
      return lcd(SCR_VGT.toFixed(2), P('V (ขา G-K)', 'V (G-K)'));
    }
    if (c.type === 'wire') return lcd('≈ 0.00', 'V');               // short → ~0 V drop
    if (isSwitchy(c)) return lcd(c.closed ? '≈ 0.00' : 'OL', c.closed ? 'V' : P('เปิด', 'open'));
    return lcd(P('ใช้กับไดโอด/LED', 'Use on a diode/LED'), '', true);
  }
  if (meterMode === 'i'){
    setTip('คลิกอุปกรณ์เพื่อวัดกระแสที่ไหลผ่าน', 'Click a part to read the current through it');
    if (!c) return lcd(P('คลิกอุปกรณ์', 'Tap a part'), '', true);
    if (c.type === 'wire' || isSwitchy(c)) return lcd(P('ผ่านตัวนำ ≈ 0', 'through conductor'), '', true);
    return lcd(fmtI(c.results ? c.results.I : 0), '');
  }
  // resistance
  setTip('คลิกอุปกรณ์เพื่อวัดความต้านทาน (จริงต้องตัดไฟก่อนวัด)', 'Click a part to read resistance (real ohmmeters need power off)');
  if (!c) return lcd(P('คลิกอุปกรณ์', 'Tap a part'), '', true);
  if (RFAM[c.type]) return lcd(fmtR(Math.round(effR(c))), '');
  if (c.type === 'pot') return lcd(fmtR(Math.round(potR(c).total)), '');   // end-to-end resistance
  if (isSwitchy(c)) return lcd(c.closed ? '≈ 0' : '∞', 'Ω');
  if (c.type === 'wire') return lcd('≈ 0', 'Ω');
  if (c.type === 'vdr') return lcd(P('ไม่เชิงเส้น', 'non-linear'), '', true);
  if (c.type === 'diode' || c.type === 'led') return lcd(P('รอยต่อ PN', 'PN junction'), '', true);
  if (c.type === 'opto') return lcd(P('เช็คด้วยโหมดไดโอด ▷|', 'use diode test ▷|'), '', true);
  if (c.type === 'scr') return lcd(c.results && c.results.lat ? '≈ 6' : '∞', 'Ω');
  if (c.type === 'cap') return lcd(P('เก็บประจุ (Xc)', 'capacitive (Xc)'), '', true);
  if (c.type === 'ind') return lcd(P('≈ 0 Ω (ขดลวด)', '≈ 0 Ω (coil)'), '', true);
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
var VALROWS = ['battery','ac','resistor','diode','wire','switch','button','cap','ind','transistor','scr','pot','opto','relay','meter'];
var COMP_TOOLS = ['battery','ac','resistor','diode','wire','switch','button','cap','ind','transistor','scr','pot','opto','relay'];   // live inside the "Add component" dropdown
function selectTool(t){
  // toggle off if same
  tool = (tool === t) ? null : t;
  pendingHole = null; pendingHole2 = null; pendingHole3 = null; pendingHole4 = null; hideHL();
  document.querySelectorAll('.bb-tool[data-tool]').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  updateCompTrigger();            // reflect the armed component on the dropdown trigger
  closeCompMenu();
  // value control visibility
  VALROWS.forEach(function(v){ $('bb-val-' + v).classList.toggle('show', tool === v); });
  $('bb-val-none').classList.toggle('show', !tool || tool === 'delete');
  if (tool === 'resistor') updateResControls();
  if (tool === 'diode') updateDiodeControls();
  if (tool === 'transistor') updateTransistorControls();
  if (tool === 'scr') updateScrControls();
  if (tool === 'meter'){ selectedId = null; renderEditor(); resetMeter(); setActiveMode(); updateMeter(); }
  else resetMeter();
  refreshHint();
}

// ── "Add component" dropdown ──
function openCompMenu(){  closeExampleMenu(); var m = $('bb-comp-menu'), t = $('bb-comp-trigger'); if (m) m.classList.add('open'); if (t) t.setAttribute('aria-expanded', 'true'); }
function closeCompMenu(){ var m = $('bb-comp-menu'), t = $('bb-comp-trigger'); if (m) m.classList.remove('open'); if (t) t.setAttribute('aria-expanded', 'false'); }
function toggleCompMenu(){ var m = $('bb-comp-menu'); if (m && m.classList.contains('open')) closeCompMenu(); else openCompMenu(); }

// ── "Examples" dropdown — one item per EXAMPLES entry (+ a Random item on top) ──
function openExampleMenu(){  closeCompMenu(); var m = $('bb-example-menu'), t = $('bb-example-trigger'); if (m) m.classList.add('open'); if (t) t.setAttribute('aria-expanded', 'true'); }
function closeExampleMenu(){ var m = $('bb-example-menu'), t = $('bb-example-trigger'); if (m) m.classList.remove('open'); if (t) t.setAttribute('aria-expanded', 'false'); }
function toggleExampleMenu(){ var m = $('bb-example-menu'); if (m && m.classList.contains('open')) closeExampleMenu(); else openExampleMenu(); }
function buildExampleMenu(){
  var m = $('bb-example-menu'); if (!m) return;
  var html = '<button class="bb-dd-item" data-ex="rand" role="menuitem"><span class="ti">🎲</span>' +
             '<span class="th-only">สุ่มตัวอย่าง</span><span class="en-only">Random example</span></button>';
  EXAMPLES.forEach(function(ex, i){
    html += '<button class="bb-dd-item" data-ex="' + i + '" role="menuitem"><span class="ti">' + (i + 1) + '</span>' +
            '<span class="th-only">' + ex.th + '</span><span class="en-only">' + ex.en + '</span></button>';
  });
  m.innerHTML = html;
  m.querySelectorAll('.bb-dd-item[data-ex]').forEach(function(btn){
    btn.addEventListener('click', function(){
      closeExampleMenu();
      if (btn.dataset.ex === 'rand') loadExample(); else loadExampleByIndex(+btn.dataset.ex);
    });
  });
}
function updateCompTrigger(){
  var trig = $('bb-comp-trigger'); if (!trig) return;
  var isComp = COMP_TOOLS.indexOf(tool) >= 0;
  trig.classList.toggle('active', isComp);
  document.querySelectorAll('.bb-dd-item[data-tool]').forEach(function(it){ it.classList.toggle('active', it.dataset.tool === tool); });
  var lbl = trig.querySelector('.bb-dd-label'); if (!lbl) return;
  if (isComp){
    var L = TYPE_LABEL[tool];
    lbl.innerHTML = '<span class="th-only">' + L.th + '</span><span class="en-only">' + L.en + '</span>';
  } else {
    lbl.innerHTML = '<span class="th-only">เพิ่มอุปกรณ์</span><span class="en-only">Add component</span>';
  }
}

// show/hide the LED-colour and Zener-Vz sub-controls + the descriptive hint
function updateDiodeControls(){
  $('bb-diode-led-wrap').style.display = (diodeKind === 'led') ? '' : 'none';
  $('bb-diode-vz-wrap').style.display  = (diodeKind === 'zener' || diodeKind === 'tvs') ? '' : 'none';
  var vzLabel = $('bb-diode-vz-label');
  if (vzLabel) vzLabel.innerHTML = diodeKind === 'tvs' ? 'V<sub>BR</sub>' : 'Vz';
  var hints = {
    silicon:   { th:'ไดโอดซิลิคอนทั่วไป Vf ≈ 0.7V — กระแสไหล anode → cathode', en:'General-purpose silicon diode, Vf ≈ 0.7V — current flows anode → cathode' },
    germanium: { th:'เจอร์เมเนียม Vf ≈ 0.3V — แรงดันตกต่ำ ใช้ตรวจจับสัญญาณ/ความถี่สูง', en:'Germanium, Vf ≈ 0.3V — low drop, used in signal/RF detectors' },
    schottky:  { th:'ชอตต์กี Vf ≈ 0.25V — สวิตช์เร็ว แรงดันตกต่ำ', en:'Schottky, Vf ≈ 0.25V — fast switching, low forward drop' },
    zener:     { th:'ซีเนอร์ — นำกระแสย้อนกลับเมื่อแรงดันถึง Vz (ใช้คุมแรงดัน)', en:'Zener — conducts in reverse once V reaches Vz (voltage regulation)' },
    tvs:       { th:'TVS — หนีบไฟกระชาก/สไปก์ที่เกิน V_BR (กันวงจร, เร็วมาก คล้ายซีเนอร์กำลังสูง)', en:'TVS — clamps surges/spikes above V_BR (fast circuit protection, like a high-power zener)' },
    led:       { th:'LED มีขั้ว — วางขา + (anode) ก่อน, ติดเมื่อต่อถูกขั้ว', en:'LED is polarized — place + (anode) leg first; lights when forward-biased' }
  };
  var h = hints[diodeKind] || hints.silicon;
  $('bb-diode-hint').innerHTML = '<span class="th-only">' + h.th + '</span><span class="en-only">' + h.en + '</span>';
}

// show β (BJT) vs Vth (MOSFET) sub-control + a per-type descriptive hint
function updateTransistorControls(){
  var fet = transKind({ tt: transType }) === 'fet';
  var bw = $('bb-trans-beta-wrap'), vw = $('bb-trans-vth-wrap');
  if (bw) bw.style.display = fet ? 'none' : '';
  if (vw) vw.style.display = fet ? '' : 'none';
  var hints = {
    npn:  { th:'NPN: ป้อนกระแสเข้าเบส (B) → คุมกระแส C→E, IC = β·IB (สวิตช์ฝั่งล่าง/ขยาย)', en:'NPN: current into Base (B) controls C→E, IC = β·IB (low-side switch / amp)' },
    pnp:  { th:'PNP: ดึงกระแสออกจากเบส → คุมกระแส E→C (สวิตช์ฝั่งบน)', en:'PNP: current out of Base controls E→C (high-side switch)' },
    nmos: { th:'N-MOSFET: Vgs > Vth → นำ; Vds น้อย = triode (สวิตช์), Vds มาก = saturation (ขยาย, Id=½k·Vov²); เกตไม่กินกระแส', en:'N-MOSFET: Vgs > Vth turns it on; small Vds = triode (switch), large Vds = saturation (amp, Id=½k·Vov²); gate draws no current' },
    pmos: { th:'P-MOSFET: Vgs < −Vth → นำ; triode (สวิตช์ฝั่งบน) / saturation (ขยาย)', en:'P-MOSFET: Vgs below −Vth turns it on; triode (high-side switch) / saturation (amp)' }
  };
  var h = hints[transType] || hints.npn;
  var hint = $('bb-trans-hint');
  if (hint) hint.innerHTML = '<span class="th-only">' + h.th + '</span><span class="en-only">' + h.en + '</span>';
}

function updateScrControls(){
  var hints = {
    scr:   { th:'SCR: ยิงกระแสเข้าเกตแวบเดียว → นำกระแส A→K แล้ว<b>ค้าง</b> เกตสั่งดับไม่ได้ ต้องทำให้กระแสต่ำกว่า I<sub>H</sub> (ปิดสวิตช์/ตัดโหลด)',
             en:'SCR: one pulse of gate current latches it on (A→K) and it <b>stays</b> on — the gate cannot switch it off; drop the current below I<sub>H</sub> instead' },
    triac: { th:'ไทรแอก: นำกระแสได้ทั้งสองทิศ จุดชนวนได้ทั้งเกตบวก/ลบ — ต่อกับแหล่งจ่าย AC แล้วจะดับเองทุกครึ่งคลื่นที่จุดตัดศูนย์',
             en:'TRIAC: conducts both ways and fires on either gate polarity — on an AC source it self-commutates at every zero crossing' }
  };
  var h = hints[scrType] || hints.scr;
  var hint = $('bb-scr-hint');
  if (hint) hint.innerHTML = '<span class="th-only">' + h.th + '</span><span class="en-only">' + h.en + '</span>';
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

// fill the capacitor / inductor value dropdowns
function populateReactiveVals(){
  var cs = $('bb-cap-val');
  if (cs) cs.innerHTML = CAP_OPTIONS.map(function(F){ return '<option value="' + F + '"' + (F === capVal ? ' selected' : '') + '>' + fmtC(F) + '</option>'; }).join('');
  var ls = $('bb-ind-val');
  if (ls) ls.innerHTML = IND_OPTIONS.map(function(L){ return '<option value="' + L + '"' + (L === indVal ? ' selected' : '') + '>' + fmtL(L) + '</option>'; }).join('');
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
  // "Add component" dropdown: trigger toggles the menu; items arm the tool
  $('bb-comp-trigger').addEventListener('click', function(e){ e.stopPropagation(); toggleCompMenu(); });
  document.querySelectorAll('.bb-dd-item[data-tool]').forEach(function(btn){
    btn.addEventListener('click', function(){ selectTool(btn.dataset.tool); });
  });
  document.addEventListener('click', function(e){ if (!e.target.closest('#bb-comp-dropdown')) closeCompMenu(); });
  $('bb-clear').addEventListener('click', function(){
    comps = []; occupied = {}; pendingHole = null; pendingHole2 = null; pendingHole3 = null; pendingHole4 = null; selectedId = null; pressedBtns = {}; hideHL(); resetMeter();
    simTime = 0; graphHist = []; graphComp = null;
    // reset the environment panel to defaults
    env.temp = 25; $('bb-temp').value = 25; $('bb-temp-out').textContent = '25 °C';
    env.light = 50; $('bb-light').value = 50; $('bb-light-out').textContent = '50 %';
    env.vrPos = 50; renderVrKnob();   // reset the VR knob back to centre
    rebuild(); renderEditor();
  });
  // multimeter mode buttons
  document.querySelectorAll('.bb-mm[data-mm]').forEach(function(btn){
    btn.addEventListener('click', function(){ meterMode = btn.dataset.mm; resetMeter(); setActiveMode(); updateMeter(); });
  });
  // "Examples" dropdown: trigger toggles the menu; items load a specific (or random) example
  buildExampleMenu();
  $('bb-example-trigger').addEventListener('click', function(e){ e.stopPropagation(); toggleExampleMenu(); });
  document.addEventListener('click', function(e){ if (!e.target.closest('#bb-example-dropdown')) closeExampleMenu(); });
  // save / load / share
  $('bb-storage').addEventListener('click', openStorageModal);
  $('bb-share').addEventListener('click', shareLink);
  $('bb-modal-close').addEventListener('click', closeStorageModal);
  $('bb-save-btn').addEventListener('click', function(){ saveCurrent($('bb-save-name').value); });
  $('bb-save-name').addEventListener('keydown', function(e){ if (e.key === 'Enter') saveCurrent(this.value); });
  $('bb-storage-modal').addEventListener('click', function(e){ if (e.target === this) closeStorageModal(); });
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
  $('bb-wire-color').addEventListener('change', function(){ wireColor = this.value; });
  $('bb-btn-color').addEventListener('change', function(){ buttonColor = this.value; });
  $('bb-diode-type').addEventListener('change', function(){ diodeKind = this.value; updateDiodeControls(); });
  $('bb-diode-vz').addEventListener('change', function(){ zenerVz = +this.value; });
  $('bb-cap-val').addEventListener('change', function(){ capVal = +this.value; });
  $('bb-ind-val').addEventListener('change', function(){ indVal = +this.value; });
  $('bb-trans-type').addEventListener('change', function(){ transType = this.value; updateTransistorControls(); refreshHint(); });
  $('bb-trans-beta').addEventListener('change', function(){ transBeta = +this.value; });
  $('bb-trans-vth').addEventListener('change', function(){ transVth = +this.value; });
  $('bb-pot-val').addEventListener('change', function(){ potVal = +this.value; });
  $('bb-scr-type').addEventListener('change', function(){ scrType = this.value; updateScrControls(); refreshHint(); });
  $('bb-scr-igt').addEventListener('change', function(){ scrIgtSel = +this.value; });
  $('bb-scr-ih').addEventListener('change', function(){ scrIhSel = +this.value; });
  $('bb-opto-ctr').addEventListener('change', function(){ optoCtr = +this.value; });
  $('bb-ac-vp').addEventListener('input', function(){ acVp = +this.value; $('bb-ac-vp-out').textContent = acVp + ' V'; });
  $('bb-ac-freq').addEventListener('change', function(){ acFreq = +this.value; });
  $('bb-ac-offset').addEventListener('input', function(){ acOffset = +this.value; $('bb-ac-offset-out').textContent = acOffset + ' V'; });
  // transient: speed presets + restart
  document.querySelectorAll('.bb-sp[data-sp]').forEach(function(btn){
    btn.addEventListener('click', function(){ simSpeedIdx = +btn.dataset.sp; syncTransientPanel(); });
  });
  $('bb-tr-restart').addEventListener('click', restartTransient);
  // environment sliders (affect all sensors)
  $('bb-temp').addEventListener('input', function(){ env.temp = +this.value; $('bb-temp-out').textContent = env.temp + ' °C'; rebuild(); });
  $('bb-light').addEventListener('input', function(){ env.light = +this.value; $('bb-light-out').textContent = env.light + ' %'; rebuild(); });
  initVrKnob();   // rotary VR position control (replaces the old slider)
  // drag-to-move: track pointer at the document level so fast drags don't slip off
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  // safety net: never leave a pushbutton held if the page loses the pointer entirely
  window.addEventListener('blur', function(){ if (releaseBtn()){ rebuild(); renderEditor(); } });
  // cancel pending placement / close the component menu with Escape
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    closeCompMenu(); closeStorageModal();
    if (pendingHole != null || pendingHole2 != null || pendingHole3 != null || pendingHole4 != null){ pendingHole = null; pendingHole2 = null; pendingHole3 = null; pendingHole4 = null; hideHL(); refreshHint(); }
  });
  // re-render text on language change (trigger label re-renders via th-only/en-only spans)
  document.addEventListener('langchange', function(){
    refreshHint(); rebuild(); renderEditor();
    var m = $('bb-storage-modal'); if (m && !m.hidden) renderSavesList();
  });
}

// ════════════════════════════ ROTARY VR KNOB ════════════════════════════
// volume-style knob: 270° sweep (min at lower-left, max at lower-right, gap at bottom).
// drives env.vrPos (0–100), same value the old slider produced.
var KNOB_START = 135, KNOB_SWEEP = 270;   // degrees, standard SVG (0°=+x, clockwise as y is down)
function knobXY(deg, R){ var t = deg * Math.PI / 180; return [50 + R * Math.cos(t), 50 + R * Math.sin(t)]; }
function knobArc(fromDeg, toDeg, R){
  var a = knobXY(fromDeg, R), b = knobXY(toDeg, R);
  var large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  var sweep = toDeg >= fromDeg ? 1 : 0;
  return 'M ' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' A ' + R + ' ' + R + ' 0 ' + large + ' ' + sweep + ' ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
}
function renderVrKnob(){
  var R = 38, ang = KNOB_START + (env.vrPos / 100) * KNOB_SWEEP;
  var track = $('bb-knob-track'), fill = $('bb-knob-fill'), notch = $('bb-knob-notch'), knob = $('bb-vrknob');
  if (!track) return;
  track.setAttribute('d', knobArc(KNOB_START, KNOB_START + KNOB_SWEEP, R));
  // a hair of sweep so 0% still shows a rounded cap, never a zero-length path
  fill.setAttribute('d', knobArc(KNOB_START, ang + (env.vrPos < 0.5 ? 0.001 : 0), R));
  var p1 = knobXY(ang, 13), p2 = knobXY(ang, 27);
  notch.setAttribute('x1', p1[0].toFixed(2)); notch.setAttribute('y1', p1[1].toFixed(2));
  notch.setAttribute('x2', p2[0].toFixed(2)); notch.setAttribute('y2', p2[1].toFixed(2));
  if (knob) knob.setAttribute('aria-valuenow', Math.round(env.vrPos));
  var out = $('bb-vrpos-out'); if (out) out.textContent = Math.round(env.vrPos) + ' %';
}
function setVrPos(v){
  env.vrPos = Math.max(0, Math.min(100, v));
  renderVrKnob();
  rebuild();
}
// map a pointer position to a 0–100 value along the 270° sweep
function knobValueFromPointer(ev, knob){
  var r = knob.getBoundingClientRect();
  var dx = ev.clientX - (r.left + r.width / 2), dy = ev.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.15) return env.vrPos;   // dead centre: keep current value
  var ang = Math.atan2(dy, dx) * 180 / Math.PI;     // screen angle (clockwise, matches knobXY)
  var rel = ang - KNOB_START;
  while (rel < 0) rel += 360;
  while (rel >= 360) rel -= 360;
  if (rel > KNOB_SWEEP) rel = (rel < KNOB_SWEEP + (360 - KNOB_SWEEP) / 2) ? KNOB_SWEEP : 0;  // bottom dead-zone snaps to nearer end
  return rel / KNOB_SWEEP * 100;
}
function initVrKnob(){
  var knob = $('bb-vrknob'); if (!knob) return;
  var dragging = false;
  knob.addEventListener('pointerdown', function(ev){
    dragging = true; knob.classList.add('dragging');
    try { knob.setPointerCapture(ev.pointerId); } catch (e) {}
    setVrPos(knobValueFromPointer(ev, knob)); knob.focus(); ev.preventDefault();
  });
  knob.addEventListener('pointermove', function(ev){ if (dragging) setVrPos(knobValueFromPointer(ev, knob)); });
  function endDrag(){ dragging = false; knob.classList.remove('dragging'); }
  knob.addEventListener('pointerup', endDrag);
  knob.addEventListener('pointercancel', endDrag);
  // scroll wheel nudges
  knob.addEventListener('wheel', function(ev){ ev.preventDefault(); setVrPos(env.vrPos + (ev.deltaY < 0 ? 2 : -2)); }, { passive:false });
  // keyboard (accessibility)
  knob.addEventListener('keydown', function(ev){
    var step = ev.shiftKey ? 10 : 1, k = ev.key, v = null;
    if (k === 'ArrowUp' || k === 'ArrowRight') v = env.vrPos + step;
    else if (k === 'ArrowDown' || k === 'ArrowLeft') v = env.vrPos - step;
    else if (k === 'Home') v = 0;
    else if (k === 'End') v = 100;
    else if (k === 'PageUp') v = env.vrPos + 10;
    else if (k === 'PageDown') v = env.vrPos - 10;
    if (v !== null){ ev.preventDefault(); setVrPos(v); }
  });
  renderVrKnob();
}

// ════════════════════════════ EXAMPLES (random pick) ════════════════════════════
// hole ids: power rails = TP/TN/BP/BN + col; tie-points = 't' + row(a–j) + col.
// rows a–e of one column share a node, so chaining through a column joins parts.
function setExampleBatt(v){
  batteryV = v;
  var s = $('bb-batt-v'); if (s) s.value = v;
  var o = $('bb-batt-v-out'); if (o) o.textContent = v + ' V';
}

var EXAMPLES = [
  { th:'LED พื้นฐาน (แบต → R → LED)', en:'Basic LED (battery → R → LED)', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // + rail ↓ col5
      place('resistor', 'ta5', 'ta9', { value:330 });           // → R (row a)
      place('led', 'tb9', 'tb13', { color:'red', vf:1.8 });     // → LED (row b, shares col9)
      place('wire', 'tc13', 'TN13', { color:'black' });         // → − rail ↑ col13
    } },
  { th:'LED ขนาน 2 สี (แดง + เขียว)', en:'Two LEDs in parallel (red + green)', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'te5', { color:'red' });             // + bus col5
      // branch 1 — red (rows a/b)
      place('resistor', 'ta5', 'ta9', { value:330 });
      place('led', 'tb9', 'tb13', { color:'red', vf:1.8 });
      // branch 2 — green (rows c/d, shares the + bus at col5, − bus at col13)
      place('resistor', 'tc5', 'tc10', { value:470 });
      place('led', 'td10', 'td13', { color:'green', vf:2.1 });
      place('wire', 'tc13', 'TN13', { color:'black' });         // − bus col13 ↑ rail
    } },
  { th:'ซีเนอร์ควบคุมแรงดัน 12V → 5.1V', en:'Zener regulator 12V → 5.1V', build:function(){
      setExampleBatt(12);
      place('battery', 'TP2', 'TN2', { value:12 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // + rail ↓ col5
      place('resistor', 'ta5', 'ta9', { value:220 });           // series R → regulated node col9
      // zener clamps col9 to Vz: cathode → col9, anode → − rail
      place('diode', 'ta13', 'tb9', { variant:'zener', vf:0.7, rd:8, vz:5.1 });
      place('wire', 'tb13', 'TN13', { color:'black' });         // zener anode (col13) → − rail
      // LED load powered from the regulated 5.1 V node (col9)
      place('resistor', 'tc9', 'tc15', { value:330 });
      place('led', 'ta15', 'ta19', { color:'red', vf:1.8 });
      place('wire', 'tb19', 'TN19', { color:'black' });
    } },
  { th:'TVS หนีบไฟกระชาก (แหล่งจ่าย 12V → โหลดเห็นแค่ ~5V)', en:'TVS surge clamp (12V supply → load only sees ~5V)', build:function(){
      setExampleBatt(12);
      place('battery', 'TP2', 'TN2', { value:12 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // + rail ↓ col5 (the "surge")
      place('resistor', 'ta5', 'ta9', { value:220 });           // line impedance → protected node col9
      // TVS sits reverse across the protected node: cathode → col9, anode → − rail.
      // below V_BR it is open; the moment col9 tries to exceed V_BR it conducts and clamps.
      place('diode', 'ta13', 'tb9', { variant:'tvs', vf:0.7, rd:6, vz:5.1 });
      place('wire', 'tb13', 'TN13', { color:'black' });         // TVS anode (col13) → − rail
      // protected load hangs off the clamped node (col9)
      place('resistor', 'tc9', 'tc15', { value:330 });
      place('led', 'ta15', 'ta19', { color:'green', vf:2.1 });
      place('wire', 'tb19', 'TN19', { color:'black' });
    } },
  { th:'สวิตช์ควบคุม LED', en:'Switch-controlled LED', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });
      place('switch', 'ta5', 'ta9', { closed:true });
      place('resistor', 'tb9', 'tb13', { value:330 });
      place('led', 'ta13', 'ta17', { color:'yellow', vf:2.0 });
      place('wire', 'tc17', 'TN17', { color:'black' });
    } },
  { th:'ปุ่มกดควบคุม LED (กดค้างติด — ปล่อยดับ)', en:'Pushbutton-controlled LED (hold to light — release to cut off)', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });
      place('button', 'ta5', 'ta9', { closed:false });          // momentary NO — press and hold it
      place('resistor', 'tb9', 'tb13', { value:330 });
      place('led', 'ta13', 'ta17', { color:'green', vf:2.1 });
      place('wire', 'tc17', 'TN17', { color:'black' });
    } },
  { th:'SCR ล็อกตัว — กดปุ่มยิงเกตแวบเดียว LED ติดค้าง, สับสวิตช์ตัดกระแสจึงดับ', en:'SCR latch — one tap on the gate button lights the LED for good; only opening the switch resets it', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });                  // + rail ↓ col5
      place('switch', 'ta5', 'ta9', { closed:true });                // anode-path switch = the only way to reset it
      place('resistor', 'tb9', 'tb13', { value:330 });
      place('led', 'ta13', 'ta17', { color:'red', vf:1.8 });         // load: cathode lands on the anode column
      // thyristor: anode col17, cathode col21, gate col19
      place('scr', 'tb17', 'ta21', { g:'tb19', st:'scr', igt:1e-3, ih:5e-3, _lat:0 });
      place('wire', 'tc21', 'TN21', { color:'black' });              // cathode → − rail
      // gate drive taps the rail BEFORE the switch: press = fire (I_G ≈ 3.8 mA), release changes nothing
      place('button', 'te5', 'te11', { closed:false });
      place('resistor', 'td11', 'td19', { value:2200 });
    } },
  { th:'SCR แบบ START / STOP — ปุ่มเขียวยิงเกตให้ติดค้าง, ปุ่มแดงลัดขา A-K เพื่อบังคับให้ดับ (commutation)', en:'SCR START / STOP — the green button fires the gate and it stays on; the red button shorts A-K to commutate it off', build:function(){
      setExampleBatt(9);
      place('battery', 'TP1', 'TN1', { value:9 });
      // load path: + rail → 1 kΩ → LED → anode, cathode → − rail
      place('wire', 'td23', 'TP23', { color:'red' });
      place('resistor', 'te14', 'te23', { value:1000 });
      place('led', 'td14', 'td11', { color:'red', vf:1.8 });
      place('scr', 'tc11', 'tc9', { g:'tc13', st:'scr', igt:1e-3, ih:5e-3, _lat:0 });
      place('wire', 'ta9', 'TN9', { color:'red' });
      // START: + rail → button → 1 kΩ → gate (a tap is enough, it latches)
      place('wire', 'ta19', 'TP19', { color:'green' });
      place('button', 'tc16', 'tc19', { closed:false, color:'green' });
      place('resistor', 'tb13', 'tb16', { value:1000 });
      // STOP: shorts anode to cathode, so the current through the SCR itself falls below I_H —
      // the load keeps running off the short while held, and it is off once you let go
      place('button', 'te9', 'te11', { closed:false, color:'red' });
    } },
  { th:'ไทรแอกกับไฟ AC — LED สองสีสลับกันติด (นำกระแสสองทิศ) และดับเองทุกจุดตัดศูนย์', en:'TRIAC on AC — two LEDs alternate (it conducts both ways) and it self-commutates at every zero crossing', build:function(){
      place('ac', 'TP2', 'TN2', { vp:12, freq:2, offset:0 });
      place('wire', 'TP5', 'tc5', { color:'red' });                  // source + ↓ col5
      place('resistor', 'ta5', 'ta9', { value:470 });
      // anti-parallel LEDs: red conducts on one half, green on the other
      place('led', 'tb9', 'tb13', { color:'red', vf:1.8 });
      place('led', 'tc13', 'tc9', { color:'green', vf:2.1 });
      // triac: MT2 col13, MT1 col17, gate col15 — gate fed from MT2 through 4.7 kΩ (≈2.4 mA)
      place('scr', 'ta13', 'ta17', { g:'tb15', st:'triac', igt:1e-3, ih:5e-3, _lat:0 });
      place('resistor', 'td13', 'td15', { value:4700 });
      place('wire', 'tb17', 'TN17', { color:'black' });              // MT1 → − rail
    } },
  { th:'VR แบบ 2 ขา (rheostat) หรี่ไฟ LED (ปรับลูกบิดในแผงสภาพแวดล้อม)', en:'Variable resistor (2-pin rheostat) dimming an LED', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });
      place('vr', 'ta5', 'ta9', { value:10000 });
      place('resistor', 'tb9', 'tb13', { value:220 });
      place('led', 'ta13', 'ta17', { color:'blue', vf:3.0 });
      place('wire', 'tc17', 'TN17', { color:'black' });
    } },
  { th:'โพเทนชิโอมิเตอร์ 3 ขา หรี่ไฟ LED (แบ่งแรงดัน — หมุนลูกบิด VR)', en:'3-pin potentiometer LED dimmer (voltage divider — turn the VR knob)', build:function(){
      setExampleBatt(9);
      env.vrPos = 70; renderVrKnob();                          // start fairly bright; turn the knob down to dim
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TN5', 'tc5', { color:'black' });          // − rail ↓ pot end1 (col5)
      place('wire', 'TP11', 'tc11', { color:'red' });          // + rail ↓ pot end2 (col11)
      place('pot', 'ta5', 'ta11', { g:'tb8', value:10000 });   // end1=col5(−), end2=col11(+), wiper=col8
      place('resistor', 'te8', 'te14', { value:330 });         // wiper (col8) → R
      place('led', 'td14', 'td17', { color:'red', vf:1.8 });   // → LED
      place('wire', 'tc17', 'TN17', { color:'black' });        // → − rail
    } },
  { th:'ชาร์จตัวเก็บประจุ RC (ดูกราฟ Transient)', en:'RC capacitor charging (watch the transient)', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });
      place('resistor', 'ta5', 'ta9', { value:10000 });
      place('cap', 'tb9', 'tb13', { value:470e-6, _vPrev:0 });
      place('wire', 'tc13', 'TN13', { color:'black' });
    } },
  { th:'ตัวเก็บประจุเลี้ยง LED — เปิดสวิตช์แล้วไฟค่อยๆ จาง', en:'Cap-backed LED — open the switch and it fades out', build:function(){
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });
      place('switch', 'ta5', 'ta9', { closed:true });          // node S = col9
      // big cap sits in parallel across the supply node; charges while the switch is closed
      place('cap', 'tb9', 'tb13', { value:4700e-6, _vPrev:0 });
      place('wire', 'tc13', 'TN13', { color:'black' });        // cap bottom → − rail
      // R + LED draw from the same node — when the switch opens the cap discharges through them
      place('resistor', 'td9', 'td17', { value:470 });
      place('led', 'ta17', 'ta21', { color:'red', vf:1.8 });
      place('wire', 'tb21', 'TN21', { color:'black' });
    } },
  { th:'ทรานซิสเตอร์ NPN เป็นสวิตช์ LED (สลับสวิตช์ที่ขาเบส)', en:'NPN transistor as an LED switch (toggle the base switch)', build:function(){
      setExampleBatt(5);
      place('battery', 'TP2', 'TN2', { value:5 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // + rail ↓ col5 (Vcc)
      // base drive (rows a/b): Vcc → switch → Rb → base (col13)
      place('switch', 'ta5', 'ta9', { closed:true });
      place('resistor', 'tb9', 'tb13', { value:10000 });        // Rb → base node col13
      // collector load (rows d/e): Vcc → R → LED → collector (col15)
      place('resistor', 'td5', 'td11', { value:330 });
      place('led', 'te11', 'te15', { color:'red', vf:1.8 });    // cathode col15 = collector
      place('wire', 'TN19', 'td19', { color:'black' });         // − rail ↓ col19 (emitter)
      place('transistor', 'td15', 'te19', { g:'te13', tt:'npn', beta:100 });   // C=col15, E=col19, B=col13
    } },
  { th:'NPN ตรวจจับความมืด (LDR → ปรับสไลเดอร์แสง)', en:'NPN dark-detector (LDR → drag the light slider)', build:function(){
      setExampleBatt(5);
      place('battery', 'TP2', 'TN2', { value:5 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // Vcc ↓ col5
      // base divider (rows a/b): Vcc → Rtop → base (col9) → LDR → gnd (dark = base high = ON)
      place('resistor', 'ta5', 'ta9', { value:10000 });         // Rtop → base node col9
      place('ldr', 'tb9', 'tb13', { value:1000 });              // LDR base(col9) → col13
      place('wire', 'tc13', 'TN13', { color:'black' });         // col13 → − rail (gnd)
      // collector load (rows d/e): Vcc → R → LED → collector (col15)
      place('resistor', 'td5', 'td11', { value:330 });
      place('led', 'te11', 'te15', { color:'green', vf:2.1 });
      place('wire', 'TN19', 'td19', { color:'black' });         // gnd ↓ col19 (emitter)
      place('transistor', 'td15', 'te19', { g:'tc9', tt:'npn', beta:100 });    // C=col15, E=col19, B=col9
    } },
  { th:'ออปโตคัปเปลอร์แยกวงจร (2 แบตแยกกัน — สวิตช์ฝั่งบนคุม LED ฝั่งล่างผ่านแสง)', en:'Optocoupler isolation (two separate batteries — top switch drives the bottom LED via light)', build:function(){
      setExampleBatt(5);
      // input loop — TOP half, powered by battery 1 (top rails)
      place('battery', 'TP2', 'TN2', { value:5 });
      place('wire', 'TP5', 'tc5', { color:'red' });             // + rail ↓ col5
      place('switch', 'ta5', 'ta9', { closed:true });
      place('resistor', 'tb9', 'tb13', { value:330 });          // → LED anode (col13)
      place('wire', 'tb15', 'TN15', { color:'black' });         // K (col15) → − rail
      // output loop — BOTTOM half, powered by battery 2 (bottom rails): no wire crosses the gap!
      place('battery', 'BP2', 'BN2', { value:5 });
      place('wire', 'BP5', 'th5', { color:'red' });             // + rail ↑ col5 (bottom)
      place('resistor', 'ti5', 'ti11', { value:330 });
      place('led', 'th11', 'th17', { color:'green', vf:2.1 });  // cathode col17 = collector node
      place('wire', 'tg19', 'BN19', { color:'black' });         // E (col19) → − rail (bottom)
      // the opto straddles the centre channel like a real DIP: LED pins on top, transistor pins below
      place('opto', 'ta13', 'ta15', { g:'tf17', h:'tf19', ctr:100 });   // A=col13(top), K=col15(top), C=col17(bottom), E=col19(bottom)
    } },
  { th:'ตัวกรอง RC ความถี่ต่ำผ่าน (AC → R → C, ดูคลื่นในแผง Transient)', en:'RC low-pass filter (AC → R → C, watch the Transient panel)', build:function(){
      place('ac', 'TP2', 'TN2', { vp:5, freq:1, offset:0 });
      place('wire', 'TP5', 'tc5', { color:'red' });            // source + ↓ col5
      place('resistor', 'ta5', 'ta9', { value:10000 });
      place('cap', 'tb9', 'tb13', { value:10e-6, _vPrev:0 });  // output across C (col9)
      place('wire', 'tc13', 'TN13', { color:'black' });        // C bottom → − rail
    } },
  { th:'เรียงกระแสครึ่งคลื่น + ตัวกรอง (AC → ไดโอด → C → โหลด)', en:'Half-wave rectifier + filter (AC → diode → C → load)', build:function(){
      place('ac', 'TP2', 'TN2', { vp:6, freq:2, offset:0 });
      place('wire', 'TP5', 'tc5', { color:'red' });            // source + ↓ col5
      place('diode', 'ta5', 'ta9', { variant:'silicon', vf:0.7, rd:8 });   // rectify into col9
      place('cap', 'tb9', 'tb13', { value:100e-6, _vPrev:0 });             // smoothing cap col9→col13
      place('wire', 'tc13', 'TN13', { color:'black' });        // C bottom → − rail
      place('resistor', 'td9', 'td15', { value:1000 });                    // load across the cap
      place('wire', 'te15', 'TN15', { color:'black' });        // load → − rail
    } },
  { th:'เรียงกระแสเต็มคลื่นแบบบริดจ์ (AC → 4 ไดโอด → C → โหลด)', en:'Full-wave bridge rectifier (AC → 4 diodes → C → load)', build:function(){
      // nodes: A = + rail (col5), B = − rail = ground (col17), OUT+ = col9, OUT− = col13.
      // layout spans both halves — top rows a–e and bottom rows f–j are separate nodes,
      // joined across the center gap by blue jumpers (te*↔tf*). D4 + load sit on the bottom half.
      // solver grounds sources[0].b (= AC −), so B is 0 V and the DC output pair floats — never tie OUT− to the − rail (would short D4).
      place('ac', 'TP2', 'TN2', { vp:6, freq:2, offset:0 });
      place('wire', 'TP5', 'tb5', { color:'red' });            // + rail → node A (col5)
      place('wire', 'TN17', 'ta17', { color:'black' });        // − rail → node B (col17)
      // bridge (diode a=anode, b=cathode)
      place('diode', 'ta5', 'ta9', { variant:'silicon', vf:0.7, rd:8 });    // D1: A → OUT+
      place('diode', 'tb17', 'tb9', { variant:'silicon', vf:0.7, rd:8 });   // D2: B → OUT+
      place('diode', 'tc13', 'tc5', { variant:'silicon', vf:0.7, rd:8 });   // D3: OUT− → A
      place('diode', 'tg13', 'tg17', { variant:'silicon', vf:0.7, rd:8 });  // D4 (bottom half): OUT− → B
      // load (bottom half) across OUT+ (col9) ↔ OUT− (col13)
      place('resistor', 'th9', 'th13', { value:1000 });
      // blue jumpers bridge top↔bottom for OUT−, B, OUT+
      place('wire', 'te13', 'tf13', { color:'blue' });
      place('wire', 'te17', 'tf17', { color:'blue' });
      place('wire', 'te9', 'tf9', { color:'blue' });
      // smoothing cap across OUT+ ↔ OUT− (top half)
      place('cap', 'td9', 'td13', { value:100e-6, _vPrev:0 });
    } },
  { th:'ไฟกระพริบ Avalanche (ทรานซิสเตอร์โหมด Avalanche + RC → ดูกราฟฟันเลื่อย)', en:'Avalanche LED flasher (avalanche-mode transistor + RC → watch the sawtooth graph)', build:function(){
      // relaxation oscillator: R charges C toward Vcc; when Vc hits V_BR the transistor fires,
      // dumps the cap through the LED (flash), then extinguishes and the cycle repeats. base is left floating.
      setExampleBatt(9);
      place('battery', 'TP2', 'TN2', { value:9 });
      place('wire', 'TP5', 'tc5', { color:'red' });                 // + rail ↓ col5 (Vcc)
      place('resistor', 'ta5', 'ta9', { value:1500 });              // R charges the cap node (col9)
      place('cap', 'tb9', 'tb13', { value:470e-6, _vPrev:0 });      // C: col9 → col13
      place('wire', 'tc13', 'TN13', { color:'black' });             // col13 → − rail (gnd)
      // collector (col15) → LED → gnd; emitter = cap node (col9); base (col12) floats
      place('led', 'te15', 'te19', { color:'red', vf:1.8 });        // anode col15 = collector, cathode col19
      place('wire', 'tb19', 'TN19', { color:'black' });             // col19 → − rail (gnd)
      place('transistor', 'td15', 'td9', { g:'td12', tt:'npn', av:true, vbr:8, beta:100 });   // C=col15, E=col9, B=col12(float)
    } },
  { th:'รีเลย์ขับด้วยทรานซิสเตอร์ + ออปโตแยกวงจร + ไดโอดกันย้อน (ปิดสวิตช์ → รีเลย์ทำงาน → LED ติด)', en:'Opto-isolated, transistor-driven relay + flyback diode (close the switch → relay pulls in → LED lights)', build:function(){
      // Full driver chain: the bottom battery + switch drives the opto input LED → the isolated
      // phototransistor turns on the NPN → the NPN sinks the relay coil (top battery) → the relay
      // energizes → COM→NO lights the red LED. The diode across the coil is the flyback (freewheeling)
      // diode — reverse-biased and idle in steady state, it catches the coil's back-EMF at turn-off.
      setExampleBatt(9);
      place('battery', 'BP1', 'BN1', { value:9 });                             // bottom battery (input/control side)
      place('resistor', 'td11', 'td16', { value:1000 });                       // opto emitter → NPN base (Rb)
      place('transistor', 'tc13', 'tc19', { g:'tc16', tt:'npn', beta:100 });   // C=col13, E=col19, B=col16
      place('wire', 'ta19', 'TN19', { color:'green' });                        // NPN emitter → − rail (top)
      place('battery', 'TP1', 'TN1', { value:9 });                             // top battery (relay + load side)
      place('wire', 'tf22', 'td22', { color:'green' });                        // relay NO (col22) → top col22
      place('resistor', 'tc22', 'tc24', { value:1000 });                       // NO branch series R
      place('led', 'td24', 'td27', { color:'red', vf:1.8 });                   // load LED (lit when relay is on)
      place('wire', 'ta27', 'TN27', { color:'green' });                        // LED → − rail (top)
      place('switch', 'BP2', 'th2', { closed:false });                         // input switch (starts open)
      place('resistor', 'tg2', 'tg8', { value:330 });                          // opto input series R
      place('opto', 'tf8', 'tf11', { g:'te8', h:'te11', ctr:100 });            // A/K on the bottom, C/E on top
      place('wire', 'tg11', 'BN11', { color:'green' });                        // opto K → − rail (bottom)
      place('relay', 'tj16', 'tj18', { g:'tj20', h:'tj22', k:'tj24' });        // coil col16→col18 · COM20 NO22 NC24
      place('wire', 'TP2', 'td8', { color:'red' });                            // + rail (top) → opto collector
      place('wire', 'te13', 'ti18', { color:'green' });                        // NPN collector → coil− (col18)
      place('wire', 'ti16', 'TP10', { color:'red' });                          // coil+ (col16) → + rail (top)
      place('wire', 'TP17', 'th20', { color:'red' });                          // + rail (top) → relay COM (red = positive)
      place('diode', 'tf18', 'tf16', { variant:'silicon', vf:0.7, rd:8 });     // flyback diode across the coil
    } },
  { th:'รีเลย์ SPDT สลับ LED แดง↔เขียว (NC/NO) — 3V ผ่านทรานซิสเตอร์ขับคอยล์ 9V', en:'SPDT relay swaps red↔green LED (NC/NO) — 3V control, transistor-driven 9V coil', build:function(){
      // Two separate supplies: a 3 V control battery on the bottom rails drives the NPN base through Rb,
      // a 9 V battery on the top rails feeds the coil and the contacts. The two grounds are tied together
      // at the emitter (a breadboard NPN switch needs a common ground). Switch open → coil off → COM rests
      // on NC → red LED lights. Switch closed → NPN sinks the coil → COM flips to NO → green LED lights.
      setExampleBatt(9);
      place('battery', 'TP1', 'TN1', { value:9 });                             // top rails — coil + contact side
      place('battery', 'BP1', 'BN1', { value:3 });                             // bottom rails — control side
      place('wire', 'ti8', 'BP7', { color:'red' });                            // + rail (bottom) → switch
      place('switch', 'th11', 'th8', { closed:false });                        // control switch (starts open)
      place('resistor', 'te11', 'tg11', { value:1000 });                       // Rb — bridges the gap to the base
      place('transistor', 'td9', 'td13', { g:'tb11', tt:'npn', beta:100 });    // C=col9, E=col13, B=col11
      place('wire', 'ta13', 'TN13', { color:'green' });                        // emitter → − rail (top)
      place('wire', 'te13', 'BN13', { color:'green' });                        // emitter → − rail (bottom) = common ground
      place('wire', 'TP15', 'td17', { color:'red' });                          // + rail (top) → coil+
      place('relay', 'te17', 'te19', { g:'te21', h:'te23', k:'te25' });        // coil col17→col19 · COM21 NO23 NC25
      place('diode', 'ta19', 'ta17', { variant:'silicon', vf:0.7, rd:8 });     // flyback diode across the coil
      place('wire', 'tc19', 'tc9', { color:'blue' });                          // coil− → NPN collector
      place('wire', 'TP21', 'tc21', { color:'red' });                          // + rail (top) → relay COM
      // NC branch (left half) — lit while the relay is at rest
      place('resistor', 'td25', 'td27', { value:1000 });
      place('led', 'tc27', 'tc29', { color:'red', vf:1.8 });
      // NO branch (right half) — lit while the relay is energized
      place('wire', 'td23', 'tf25', { color:'blue' });                         // NO (col23) → across the gap
      place('resistor', 'tg25', 'tg27', { value:1000 });
      place('led', 'th27', 'th29', { color:'green', vf:2.1 });
      place('wire', 'te29', 'tf29', { color:'green' });                        // join both halves at col29
      place('wire', 'tb29', 'TN29', { color:'green' });                        // → − rail (top)
    } }
];

var lastExampleIdx = -1;
function loadExampleByIndex(i){
  if (i < 0 || i >= EXAMPLES.length) return;
  comps = []; occupied = {}; pendingHole = null; pendingHole2 = null; pendingHole3 = null; pendingHole4 = null; selectedId = null; pressedBtns = {}; hideHL(); resetMeter();
  simTime = 0; graphHist = []; graphComp = null; renderEditor();
  lastExampleIdx = i;
  var ex = EXAMPLES[i];
  ex.build();
  rebuild();
  setHint((isEN() ? '📋 Example: ' + ex.en + ' — tap a part to edit, or use the multimeter.'
                  : '📋 ตัวอย่าง: ' + ex.th + ' — คลิกอุปกรณ์เพื่อแก้ไข หรือใช้มัลติมิเตอร์'));
}
function loadExample(){   // random pick, avoiding an immediate repeat
  var i = Math.floor(Math.random() * EXAMPLES.length);
  if (EXAMPLES.length > 1 && i === lastExampleIdx) i = (i + 1) % EXAMPLES.length;
  loadExampleByIndex(i);
}
function place(type, a, b, props){
  // guard: rail holes on every 6th column don't exist (visual gap) — bail loudly instead of corrupting the board
  if (!holes[a] || !holes[b]){ console.warn('place(): unknown hole', !holes[a] ? a : b, '— skipped', type); return; }
  if (props && props.g != null && !holes[props.g]){ console.warn('place(): unknown hole', props.g, '— skipped', type); return; }
  if (props && props.h != null && !holes[props.h]){ console.warn('place(): unknown hole', props.h, '— skipped', type); return; }
  if (props && props.k != null && !holes[props.k]){ console.warn('place(): unknown hole', props.k, '— skipped', type); return; }
  var c = { id:nextId++, type:type, a:a, b:b };
  for (var k in props) c[k] = props[k];
  comps.push(c); occupied[a] = c.id; occupied[b] = c.id;
  if (c.g != null) occupied[c.g] = c.id;
  if (c.h != null) occupied[c.h] = c.id;
  if (c.k != null) occupied[c.k] = c.id;
}

// ════════════════════════════ SAVE / LOAD / SHARE ════════════════════════════
var SAVES_KEY = 'bb-saves';
// compact serialization — keep only the fields needed to rebuild each part
function serializeCircuit(){
  return {
    v: 1,
    env: { t: env.temp, l: env.light, vr: Math.round(env.vrPos) },
    comps: comps.map(function(c){
      var o = { t: c.type, a: c.a, b: c.b };
      if (c.g != null) o.g = c.g;
      if (c.h != null) o.h = c.h;
      if (c.k != null) o.k = c.k;
      if (c.ctr != null) o.ctr = c.ctr;
      if (c.value != null) o.v = c.value;
      if (c.color) o.c = c.color;
      if (c.variant) o.dv = c.variant;
      if (c.vz != null) o.vz = c.vz;
      if (c.vf != null) o.vf = c.vf;
      if (c.rd != null) o.rd = c.rd;
      if (c.vc != null) o.vc = c.vc;
      if (c.tt) o.tt = c.tt;
      if (c.st) o.st = c.st;
      if (c.igt != null) o.igt = c.igt;
      if (c.ih != null) o.ih = c.ih;
      if (c.beta != null) o.beta = c.beta;
      if (c.vth != null) o.vth = c.vth;
      if (c.av){ o.av = 1; if (c.vbr != null) o.vbr = c.vbr; }
      if (c.vp != null) o.vp = c.vp;
      if (c.freq != null) o.f = c.freq;
      if (c.offset != null) o.off = c.offset;
      if (c.type === 'switch') o.cl = c.closed ? 1 : 0;   // a pushbutton always reloads released
      return o;
    })
  };
}
function applyCircuit(data){
  comps = []; occupied = {}; pendingHole = null; pendingHole2 = null; pendingHole3 = null; pendingHole4 = null; selectedId = null; pressedBtns = {}; hideHL(); resetMeter();
  simTime = 0; graphHist = []; graphComp = null; renderEditor();
  if (data && data.env){
    var e = data.env;
    if (e.t != null){ env.temp = e.t; var te = $('bb-temp'); if (te) te.value = e.t; var teo = $('bb-temp-out'); if (teo) teo.textContent = e.t + ' °C'; }
    if (e.l != null){ env.light = e.l; var li = $('bb-light'); if (li) li.value = e.l; var lio = $('bb-light-out'); if (lio) lio.textContent = e.l + ' %'; }
    if (e.vr != null){ env.vrPos = e.vr; renderVrKnob(); }
  }
  ((data && data.comps) || []).forEach(function(o){
    var props = {};
    if (o.g != null) props.g = o.g;
    if (o.h != null) props.h = o.h;
    if (o.k != null) props.k = o.k;
    if (o.t === 'relay') props._en = 0;
    if (o.ctr != null) props.ctr = o.ctr;
    if (o.v != null) props.value = o.v;
    if (o.c) props.color = o.c;
    if (o.dv) props.variant = o.dv;
    if (o.vz != null) props.vz = o.vz;
    if (o.vf != null) props.vf = o.vf;
    if (o.rd != null) props.rd = o.rd;
    if (o.vc != null) props.vc = o.vc;
    if (o.tt) props.tt = o.tt;
    if (o.st) props.st = o.st;
    if (o.igt != null) props.igt = o.igt;
    if (o.ih != null) props.ih = o.ih;
    if (o.t === 'scr') props._lat = 0;   // a reloaded thyristor always starts blocking
    if (o.beta != null) props.beta = o.beta;
    if (o.vth != null) props.vth = o.vth;
    if (o.av){ props.av = true; if (o.vbr != null) props.vbr = o.vbr; props._av = 0; }
    if (o.vp != null) props.vp = o.vp;
    if (o.f != null) props.freq = o.f;
    if (o.off != null) props.offset = o.off;
    if (o.t === 'switch') props.closed = o.cl !== 0;
    if (o.t === 'button') props.closed = false;   // momentary — never restored pressed
    if (o.t === 'cap') props._vPrev = 0;
    if (o.t === 'ind') props._iPrev = 0;
    place(o.t, o.a, o.b, props);
  });
  // sync the battery slider to the first battery's voltage
  var fb = comps.filter(function(c){ return c.type === 'battery'; })[0];
  if (fb){ batteryV = fb.value; var bs = $('bb-batt-v'); if (bs) bs.value = batteryV; var bo = $('bb-batt-v-out'); if (bo) bo.textContent = batteryV + ' V'; }
  rebuild();
}

// URL-safe base64 (handles UTF-8)
function b64enc(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64dec(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }

function buildShareURL(){ return location.origin + location.pathname + '?c=' + b64enc(JSON.stringify(serializeCircuit())); }
function shareLink(){
  if (!comps.length){ flashHint(isEN() ? 'Nothing to share yet — build a circuit first.' : 'ยังไม่มีวงจรให้แชร์ — ต่อวงจรก่อน'); return; }
  var url = buildShareURL();
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(
      function(){ setHint(isEN() ? '🔗 Link copied to clipboard — paste to share!' : '🔗 คัดลอกลิงก์แล้ว — วางเพื่อแชร์ได้เลย'); },
      function(){ window.prompt(isEN() ? 'Copy this link:' : 'คัดลอกลิงก์นี้:', url); }
    );
  } else window.prompt(isEN() ? 'Copy this link:' : 'คัดลอกลิงก์นี้:', url);
}
// a bad ?c= is almost always a link truncated by a chat/mail client mid-paste
function badLinkHint(){
  setHint('<b style="color:#dc2626">' + (isEN()
    ? '⚠️ Broken circuit link — nothing was loaded. The link was probably cut short when it was copied; ask the sender for a fresh one.'
    : '⚠️ ลิงก์วงจรเสียหาย — โหลดวงจรไม่ได้ ลิงก์น่าจะถูกตัดตอนคัดลอก ลองขอลิงก์ใหม่อีกครั้ง') + '</b>');
}
function loadFromURL(){
  var m = location.search.match(/[?&]c=([^&]+)/);
  if (!m) return false;
  var data;
  try {
    data = JSON.parse(b64dec(decodeURIComponent(m[1])));
  } catch (err){
    console.warn('share link parse failed', err);
    badLinkHint();
    return false;
  }
  if (!data || !Array.isArray(data.comps)){
    console.warn('share link has no component list', data);
    badLinkHint();
    return false;
  }
  applyCircuit(data);
  setHint(isEN() ? '🔗 Loaded a shared circuit.' : '🔗 โหลดวงจรจากลิงก์แล้ว');
  return true;
}

// ── localStorage named saves ──
function loadSaves(){ try { return JSON.parse(localStorage.getItem(SAVES_KEY)) || []; } catch (e){ return []; } }
function storeSaves(arr){ try { localStorage.setItem(SAVES_KEY, JSON.stringify(arr)); } catch (e){} }
function saveCurrent(name){
  if (!comps.length){ flashHint(isEN() ? 'Nothing to save yet.' : 'ยังไม่มีวงจรให้บันทึก'); return; }
  name = (name || '').trim();
  var arr = loadSaves();
  if (!name) name = (isEN() ? 'Circuit ' : 'วงจร ') + (arr.length + 1);
  arr.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name, ts: Date.now(), data: serializeCircuit() });
  if (arr.length > 30) arr = arr.slice(0, 30);
  storeSaves(arr); renderSavesList();
  var inp = $('bb-save-name'); if (inp) inp.value = '';
  flashHint(isEN() ? '💾 Saved "' + name + '"' : '💾 บันทึก "' + name + '" แล้ว');
}
function deleteSave(id){ storeSaves(loadSaves().filter(function(s){ return s.id !== id; })); renderSavesList(); }
function applySave(id){
  var s = loadSaves().filter(function(x){ return x.id === id; })[0];
  if (!s) return;
  applyCircuit(s.data); closeStorageModal();
  setHint(isEN() ? '📂 Loaded "' + s.name + '"' : '📂 โหลด "' + s.name + '" แล้ว');
}
function bbEscapeHTML(s){ return String(s).replace(/[&<>"]/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]; }); }
function fmtSaveDate(ts){ var d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function renderSavesList(){
  var box = $('bb-saves-list'); if (!box) return;
  var en = isEN(), arr = loadSaves();
  if (!arr.length){ box.innerHTML = '<div class="bb-saves-empty">' + (en ? 'No saved circuits yet.' : 'ยังไม่มีวงจรที่บันทึกไว้') + '</div>'; return; }
  box.innerHTML = arr.map(function(s){
    var n = (s.data && s.data.comps) ? s.data.comps.length : 0;
    return '<div class="bb-save-item" data-id="' + s.id + '">' +
      '<span class="nm"><b>' + bbEscapeHTML(s.name) + '</b><small>' + fmtSaveDate(s.ts) + ' · ' + n + (en ? ' parts' : ' ชิ้น') + '</small></span>' +
      '<button class="bb-load-one">' + (en ? 'Load' : 'โหลด') + '</button>' +
      '<button class="bb-del-one danger">' + (en ? 'Delete' : 'ลบ') + '</button></div>';
  }).join('');
  box.querySelectorAll('.bb-save-item').forEach(function(it){
    var id = it.dataset.id;
    it.querySelector('.bb-load-one').addEventListener('click', function(){ applySave(id); });
    it.querySelector('.bb-del-one').addEventListener('click', function(){ deleteSave(id); });
  });
}
function openStorageModal(){ renderSavesList(); var m = $('bb-storage-modal'); if (m) m.hidden = false; var inp = $('bb-save-name'); if (inp) inp.focus(); }
function closeStorageModal(){ var m = $('bb-storage-modal'); if (m) m.hidden = true; }

// ════════════════════════════ INIT ════════════════════════════
buildBoard();
initControls();
populateReactiveVals();
updateDiodeControls();
selectTool(null);
rebuild();
loadFromURL();   // if the page was opened with a ?c= share link, load that circuit
rafId = requestAnimationFrame(tick);
})();
