// ===== SHARED HELPERS =====
// Results carry both languages; style.css hides the inactive one, so a language switch needs no recalculation.
function L(th, en) { return '<span class="th-only">' + th + '</span><span class="en-only">' + en + '</span>'; }
function showError(res, th, en) { res.innerHTML = L(th, en); res.className = 'result-box result-error'; }
function formatOhm(val) {
  if (val >= 1e6) return (val/1e6).toPrecision(4) + ' MΩ (' + val.toLocaleString() + ' Ω)';
  if (val >= 1000) return (val/1000).toPrecision(4) + ' kΩ (' + val.toLocaleString() + ' Ω)';
  return val.toPrecision(4) + ' Ω';
}

function showTab(e, tabs, contents, activeId) {
  document.querySelectorAll(tabs).forEach(b => b.classList.remove('active'));
  document.querySelectorAll(contents).forEach(c => c.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById(activeId).classList.add('active');
}

// ===== COLOR CODE =====
const colorBg = {
  '0':'#111','1':'#8B4513','2':'#f00','3':'#ff7700','4':'#ffee00',
  '5':'#0a0','6':'#00f','7':'#8b008b','8':'#888','9':'#eee',
};
const multMap = {
  '1':'#111','10':'#8B4513','100':'#f00','1000':'#ff7700','10000':'#ffee00',
  '100000':'#0a0','1000000':'#00f','0.1':'#d4af37','0.01':'#aaa'
};
const tolMap = {
  '1':'#8B4513','2':'#f00','0.5':'#0a0','0.25':'#00f','0.1':'#8b008b',
  '5':'#d4af37','10':'#aaa','20':'transparent','0.05':'#888'
};

function calcR4() {
  const b1 = parseInt(document.getElementById('r4b1').value);
  const b2 = parseInt(document.getElementById('r4b2').value);
  const mult = parseFloat(document.getElementById('r4b3').value);
  const tol = parseFloat(document.getElementById('r4b4').value);
  const val = (b1 * 10 + b2) * mult;
  const min = val * (1 - tol/100), max = val * (1 + tol/100);
  document.getElementById('r4result').innerHTML =
    L('ค่าความต้านทาน: ', 'Resistance: ') + formatOhm(val) + ' ±' + tol + '% (' + L('ช่วง: ', 'range: ') + formatOhm(min) + L(' ถึง ', ' to ') + formatOhm(max) + ')';
  if (document.getElementById('r4_b1')) {
    document.getElementById('r4_b1').style.background = colorBg[b1.toString()];
    document.getElementById('r4_b2').style.background = colorBg[b2.toString()];
    document.getElementById('r4_b3').style.background = multMap[mult.toString()] || '#d4af37';
    document.getElementById('r4_b4').style.background = tolMap[tol.toString()] || '#d4af37';
  }
}

function calcR5() {
  const b1 = parseInt(document.getElementById('r5b1').value);
  const b2 = parseInt(document.getElementById('r5b2').value);
  const b3 = parseInt(document.getElementById('r5b3').value);
  const mult = parseFloat(document.getElementById('r5b4').value);
  const tol = parseFloat(document.getElementById('r5b5').value);
  const val = (b1 * 100 + b2 * 10 + b3) * mult;
  const min = val * (1 - tol/100), max = val * (1 + tol/100);
  document.getElementById('r5result').innerHTML =
    L('ค่าความต้านทาน: ', 'Resistance: ') + formatOhm(val) + ' ±' + tol + '% (' + L('ช่วง: ', 'range: ') + formatOhm(min) + L(' ถึง ', ' to ') + formatOhm(max) + ')';
  if (document.getElementById('r5_b1')) {
    document.getElementById('r5_b1').style.background = colorBg[b1.toString()];
    document.getElementById('r5_b2').style.background = colorBg[b2.toString()];
    document.getElementById('r5_b3').style.background = colorBg[b3.toString()];
    document.getElementById('r5_b4').style.background = multMap[mult.toString()] || '#d4af37';
    document.getElementById('r5_b5').style.background = tolMap[tol.toString()] || '#8B4513';
  }
}

// ===== OHM'S LAW =====
function calcOhm() {
  const E = parseFloat(document.getElementById('ohm_e').value);
  const I = parseFloat(document.getElementById('ohm_i').value);
  const R = parseFloat(document.getElementById('ohm_r').value);
  const res = document.getElementById('ohm_result');
  const vals = [!isNaN(E), !isNaN(I), !isNaN(R)].filter(Boolean).length;
  if (vals < 2) { showError(res, 'กรุณากรอกอย่างน้อย 2 ค่า', 'Enter at least 2 values'); return; }
  res.className = 'result-box';
  let out = [];
  if (isNaN(E) && !isNaN(I) && !isNaN(R)) {
    const e = I*R; document.getElementById('ohm_e').value = e.toPrecision(6);
    out.push(L('แรงดัน', 'Voltage') + ' E = I × R = ' + I + ' × ' + R + ' = ' + e.toPrecision(6) + ' V');
  } else if (isNaN(I) && !isNaN(E) && !isNaN(R)) {
    const i = E/R; document.getElementById('ohm_i').value = i.toPrecision(6);
    out.push(L('กระแส', 'Current') + ' I = E / R = ' + E + ' / ' + R + ' = ' + i.toPrecision(6) + ' A (' + (i*1000).toPrecision(4) + ' mA)');
  } else if (isNaN(R) && !isNaN(E) && !isNaN(I)) {
    const r = E/I; document.getElementById('ohm_r').value = r.toPrecision(6);
    out.push(L('ความต้านทาน', 'Resistance') + ' R = E / I = ' + E + ' / ' + I + ' = ' + formatOhm(r));
  } else {
    out.push('E = ' + E + ' V, I = ' + I + ' A, R = ' + formatOhm(R));
    out.push(L('ตรวจสอบ', 'Check') + ' E = I×R = ' + (I*R).toPrecision(6) + ' V');
    out.push(L('กำลังไฟฟ้า', 'Power') + ' P = E×I = ' + (E*I).toPrecision(6) + ' W');
  }
  res.innerHTML = out.join(' | ');
}
function clearOhm() {
  ['ohm_e','ohm_i','ohm_r'].forEach(id => document.getElementById(id).value='');
  document.getElementById('ohm_result').innerHTML='';
  document.getElementById('ohm_result').className='result-box';
}

// ===== POWER =====
function calcPower() {
  const P = parseFloat(document.getElementById('pow_p').value);
  const E = parseFloat(document.getElementById('pow_e').value);
  const I = parseFloat(document.getElementById('pow_i').value);
  const R = parseFloat(document.getElementById('pow_r').value);
  const res = document.getElementById('pow_result');
  res.className='result-box';
  const known = {P:!isNaN(P),E:!isNaN(E),I:!isNaN(I),R:!isNaN(R)};
  if (Object.values(known).filter(Boolean).length < 2) { showError(res, 'กรุณากรอกอย่างน้อย 2 ค่า', 'Enter at least 2 values'); return; }
  let out = [];
  if (known.E && known.I) {
    const p=E*I,r=E/I; out.push('P = E×I = '+p.toPrecision(6)+' W'); out.push('R = '+formatOhm(r));
    document.getElementById('pow_p').value=p.toPrecision(6); document.getElementById('pow_r').value=r.toPrecision(6);
  } else if (known.P && known.E) {
    const i=P/E,r=E*E/P; out.push('I = P/E = '+i.toPrecision(6)+' A'); out.push('R = '+formatOhm(r));
    document.getElementById('pow_i').value=i.toPrecision(6); document.getElementById('pow_r').value=r.toPrecision(6);
  } else if (known.P && known.I) {
    const e=P/I,r=P/(I*I); out.push('E = P/I = '+e.toPrecision(6)+' V'); out.push('R = '+formatOhm(r));
    document.getElementById('pow_e').value=e.toPrecision(6); document.getElementById('pow_r').value=r.toPrecision(6);
  } else if (known.P && known.R) {
    const e=Math.sqrt(P*R),i=Math.sqrt(P/R); out.push('E = √(P×R) = '+e.toPrecision(6)+' V'); out.push('I = √(P/R) = '+i.toPrecision(6)+' A');
    document.getElementById('pow_e').value=e.toPrecision(6); document.getElementById('pow_i').value=i.toPrecision(6);
  } else if (known.E && known.R) {
    const p=E*E/R,i=E/R; out.push('P = E²/R = '+p.toPrecision(6)+' W'); out.push('I = E/R = '+i.toPrecision(6)+' A');
    document.getElementById('pow_p').value=p.toPrecision(6); document.getElementById('pow_i').value=i.toPrecision(6);
  } else if (known.I && known.R) {
    const p=I*I*R,e=I*R; out.push('P = I²×R = '+p.toPrecision(6)+' W'); out.push('E = I×R = '+e.toPrecision(6)+' V');
    document.getElementById('pow_p').value=p.toPrecision(6); document.getElementById('pow_e').value=e.toPrecision(6);
  }
  res.textContent = out.join(' | ');
}
function clearPower() {
  ['pow_p','pow_e','pow_i','pow_r'].forEach(id => document.getElementById(id).value='');
  document.getElementById('pow_result').innerHTML=''; document.getElementById('pow_result').className='result-box';
}

// ===== ENERGY =====
function energyBill(p, hoursPerDay, days, rate) {
  const kwhDay = p * hoursPerDay / 1000, kwh = kwhDay * days;
  return { kwhDay, kwh, baht: kwh * rate };
}
function calcEnergy() {
  const num = id => parseFloat(document.getElementById(id).value);
  const p = num('eng_p'), t = num('eng_t'), d = num('eng_d'), rate = num('eng_rate');
  const res = document.getElementById('eng_result');
  if ([p, t, d].some(v => isNaN(v) || v <= 0) || t > 24 || isNaN(rate) || rate < 0) {
    showError(res, 'กรุณากรอกค่าที่ถูกต้อง (ชั่วโมงต่อวันไม่เกิน 24)', 'Enter valid values (hours per day up to 24)'); return;
  }
  res.className = 'result-box';
  const b = energyBill(p, t, d, rate);
  const f = v => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  res.innerHTML =
    'W = P × t = ' + p + ' W × ' + t + ' h = ' + f(b.kwhDay) + ' kWh ' + L('ต่อวัน', 'per day') + '<br>' +
    f(b.kwhDay) + ' × ' + d + ' ' + L('วัน', 'days') + ' = <strong>' + f(b.kwh) + ' kWh</strong> (' + L(f(b.kwh) + ' หน่วย', f(b.kwh) + ' units') + ')<br>' +
    L('ค่าไฟ', 'Cost') + ' ≈ ' + f(b.kwh) + ' × ' + rate + ' = <strong>' + f(b.baht) + ' ' + L('บาท', 'THB') + '</strong>';
}

// ===== LED SERIES RESISTOR =====
const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const WATT_RATINGS = [0.125, 0.25, 0.5, 1, 2, 3, 5];
// Next E12 value at or above r, so the real current never exceeds the target.
function e12Up(r) {
  const dec = Math.pow(10, Math.floor(Math.log10(r)));
  for (const m of [...E12, 10]) if (m * dec >= r * (1 - 1e-9)) return +(m * dec).toPrecision(3);
}
function ledResistor(vs, vf, n, ma) {
  const vr = vs - vf * n;
  if (vr <= 0) return null;
  const r = vr / (ma / 1000), rStd = e12Up(r), i = vr / rStd, p = i * i * rStd;
  return { vr, r, rStd, i, p, watt: WATT_RATINGS.find(w => w >= 2 * p) };
}
function calcLed() {
  const num = id => parseFloat(document.getElementById(id).value);
  const vs = num('led_vs'), vf = num('led_vf'), n = parseInt(document.getElementById('led_n').value), ma = num('led_i');
  const res = document.getElementById('led_result');
  if ([vs, vf, ma].some(v => isNaN(v) || v <= 0) || !(n >= 1)) { showError(res, 'กรุณากรอกค่าที่ถูกต้อง', 'Enter valid values'); return; }
  const x = ledResistor(vs, vf, n, ma);
  if (!x) {
    showError(res, 'แรงดันจ่ายต้องมากกว่า V<sub>f</sub> รวมของ LED (' + (vf * n).toFixed(2) + ' V) — ลดจำนวน LED ที่ต่ออนุกรม หรือเพิ่มแรงดัน',
      'Supply must exceed the total LED V<sub>f</sub> (' + (vf * n).toFixed(2) + ' V) — use fewer LEDs in series or a higher supply'); return;
  }
  res.className = 'result-box';
  const fw = w => w < 1 ? '1/' + Math.round(1 / w) + ' W' : w + ' W';
  res.innerHTML =
    'R = (' + vs + ' − ' + n + ' × ' + vf + ') ÷ ' + (ma / 1000) + ' A = ' + formatOhm(x.r) + '<br>' +
    L('ใช้ค่ามาตรฐาน E12 ที่สูงถัดไป', 'Use the next higher E12 value') + ': <strong>' + formatOhm(x.rStd) + '</strong> → I ≈ ' + (x.i * 1000).toFixed(1) + ' mA<br>' +
    L('ตัวต้านทานร้อน', 'Resistor dissipates') + ' P = I²R ≈ ' + (x.p * 1000).toFixed(0) + ' mW → ' +
    (x.watt ? L('เลือกพิกัดอย่างน้อย', 'choose at least') + ' <strong>' + fw(x.watt) + '</strong> ' + L('(เผื่อ 2 เท่า)', '(2× margin)')
            : L('เกิน 5 W — ควรใช้วงจรจ่ายกระแสคงที่แทน', 'over 5 W — use a constant-current driver instead'));
}

// ===== CAPACITOR / SMD CODE =====
const CAP_TOL = { B:'±0.1 pF', C:'±0.25 pF', D:'±0.5 pF', F:'±1%', G:'±2%', J:'±5%', K:'±10%', M:'±20%', Z:'+80% / −20%' };
// EIA-96 codes 01–96 index the E96 series; Y=R=0.01 and X=S=0.1 are aliases.
// R is left out on purpose: "47R" on a part almost always means 47 Ω, not EIA-96.
const EIA96_MULT = { Z:0.001, Y:0.01, X:0.1, S:0.1, A:1, B:10, H:10, C:100, D:1e3, E:1e4, F:1e5 };
const e96 = i => Math.round(Math.pow(10, (i - 1) / 96) * 100);
function formatCap(pf) {
  const p = v => +v.toPrecision(4);
  return p(pf) + ' pF = ' + p(pf / 1000) + ' nF = ' + p(pf / 1e6) + ' µF';
}
// Returns {pf, tol} or null.
function parseCapCode(code) {
  let m;
  code = code.replace(/\s/g, '').toUpperCase().replace('µ', 'U').replace('Μ', 'U');
  if ((m = code.match(/^(\d)(\d)(\d)([BCDFGJKMZ])?$/))) {
    const mult = { 8: 0.01, 9: 0.1 }[m[3]] ?? Math.pow(10, +m[3]);
    return { pf: (+m[1] * 10 + +m[2]) * mult, tol: CAP_TOL[m[4]] };
  }
  if ((m = code.match(/^(\d{1,2})([BCDFGJKMZ])?$/))) return { pf: +m[1], tol: CAP_TOL[m[2]] };
  if ((m = code.match(/^(\d*)([PNUR])(\d*)([BCDFGJKMZ])?$/)) && (m[1] || m[3])) {
    const scale = { P: 1, R: 1, N: 1e3, U: 1e6 }[m[2]];
    return { pf: parseFloat((m[1] || '0') + '.' + (m[3] || '0')) * scale, tol: CAP_TOL[m[4]] };
  }
  if ((m = code.match(/^(\d*\.\d+)$/))) return { pf: parseFloat(m[1]) * 1e6 };  // "0.1" / ".1" printed on film caps = µF
  return null;
}
// Returns {ohm, kind} or null.
function parseSmdCode(code) {
  let m;
  code = code.replace(/\s/g, '').toUpperCase();
  if (/^0+$/.test(code)) return { ohm: 0, kind: 'jumper' };
  if ((m = code.match(/^(\d{2})(\d)$/))) return { ohm: +m[1] * Math.pow(10, +m[2]), kind: '3' };
  if ((m = code.match(/^(\d{3})(\d)$/))) return { ohm: +m[1] * Math.pow(10, +m[2]), kind: '4' };
  if ((m = code.match(/^(\d*)R(\d*)$/)) && (m[1] || m[2])) return { ohm: parseFloat((m[1] || '0') + '.' + (m[2] || '0')), kind: 'R' };
  if ((m = code.match(/^(\d{2})([ZYXSABHCDEF])$/)) && +m[1] >= 1 && +m[1] <= 96) return { ohm: +(e96(+m[1]) * EIA96_MULT[m[2]]).toPrecision(3), kind: 'eia' };
  return null;
}
function calcCode() {
  const type = document.getElementById('code_type').value;
  const raw = document.getElementById('code_val').value.trim();
  const res = document.getElementById('code_result');
  if (type === 'cap') {
    const x = parseCapCode(raw);
    if (!x) { showError(res, 'อ่านรหัสนี้ไม่ได้ — ลองรูปแบบ 104, 104K, 4n7, 2u2 หรือ 0.1', 'Cannot read this code — try 104, 104K, 4n7, 2u2 or 0.1'); return; }
    res.className = 'result-box';
    res.innerHTML = '<strong>' + formatCap(x.pf) + '</strong>' + (x.tol ? ' &nbsp;' + L('ค่าผิดพลาด', 'tolerance') + ' ' + x.tol : '') +
      '<br>' + L('รหัสสามหลัก: สองหลักแรกคือตัวเลข หลักที่สามคือจำนวนศูนย์ต่อท้าย หน่วยเป็น pF', '3-digit code: first two digits are the value, the third is the number of zeros, in pF');
    return;
  }
  const x = parseSmdCode(raw);
  if (!x) { showError(res, 'อ่านรหัสนี้ไม่ได้ — ลองรูปแบบ 103, 1002, 4R7 หรือ 01C', 'Cannot read this code — try 103, 1002, 4R7 or 01C'); return; }
  res.className = 'result-box';
  const kindTxt = {
    jumper: L('ตัวต้านทาน 0 Ω ใช้แทนสายจัมเปอร์', '0 Ω resistor used as a jumper'),
    '3': L('รหัส 3 หลัก (มักเป็น ±5%)', '3-digit code (usually ±5%)'),
    '4': L('รหัส 4 หลัก (มักเป็น ±1%)', '4-digit code (usually ±1%)'),
    R: L('R คือจุดทศนิยม', 'R marks the decimal point'),
    eia: L('รหัส EIA-96 (±1%) — ตัวเลขคือลำดับในอนุกรม E96 ตัวอักษรคือตัวคูณ', 'EIA-96 code (±1%) — the number indexes the E96 series, the letter is the multiplier'),
  }[x.kind];
  res.innerHTML = '<strong>' + (x.ohm === 0 ? '0 Ω' : formatOhm(x.ohm)) + '</strong><br>' + kindTxt;
}

// ===== SERIES/PARALLEL =====
function parseList(id) {
  return document.getElementById(id).value.split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v)&&v>0);
}
function checkMinVals(vals, res) {
  if (vals.length < 2) {
    showError(res, 'กรุณากรอกอย่างน้อย 2 ค่า', 'Enter at least 2 values');
    return false;
  }
  res.className = 'result-box';
  return true;
}
function calcRS() {
  const vals = parseList('rs_vals'), res = document.getElementById('rs_result');
  if (!checkMinVals(vals, res)) return;
  res.textContent = 'R_T = ' + vals.join(' + ') + ' = ' + formatOhm(vals.reduce((a,b)=>a+b,0));
}
function calcRP() {
  const vals = parseList('rp_vals'), res = document.getElementById('rp_result');
  if (!checkMinVals(vals, res)) return;
  res.textContent = '1/R_T = ' + vals.map(v=>'1/'+v).join('+') + ' → R_T = ' + formatOhm(1/vals.reduce((a,b)=>a+1/b,0));
}
function calcCS() {
  const vals = parseList('cs_vals'), res = document.getElementById('cs_result');
  if (!checkMinVals(vals, res)) return;
  res.textContent = '1/C_T = ' + vals.map(v=>'1/'+v).join('+') + ' → C_T = ' + (1/vals.reduce((a,b)=>a+1/b,0)).toPrecision(4) + ' μF';
}
function calcCP() {
  const vals = parseList('cp_vals'), res = document.getElementById('cp_result');
  if (!checkMinVals(vals, res)) return;
  res.textContent = 'C_T = ' + vals.join(' + ') + ' = ' + vals.reduce((a,b)=>a+b,0).toPrecision(4) + ' μF';
}

// ===== REVERSE RESISTOR =====
const REV_DIGITS = [
  {n:L('ดำ','Black'), nm:'Black',   bg:'#111'},
  {n:L('น้ำตาล','Brown'), nm:'Brown', bg:'#8B4513'},
  {n:L('แดง','Red'), nm:'Red',    bg:'#f00'},
  {n:L('ส้ม','Orange'), nm:'Orange', bg:'#ff7700'},
  {n:L('เหลือง','Yellow'), nm:'Yellow',bg:'#ffee00'},
  {n:L('เขียว','Green'), nm:'Green', bg:'#0a0'},
  {n:L('น้ำเงิน','Blue'), nm:'Blue', bg:'#00f'},
  {n:L('ม่วง','Violet'), nm:'Violet', bg:'#8b008b'},
  {n:L('เทา','Gray'), nm:'Gray',   bg:'#888'},
  {n:L('ขาว','White'), nm:'White',  bg:'#eee'},
];
const REV_MULTS = [
  {v:0.01, n:L('เงิน','Silver'), nm:'Silver',   bg:'#aaa'},
  {v:0.1,  n:L('ทอง','Gold'), nm:'Gold',      bg:'#d4af37'},
  {v:1,    n:L('ดำ','Black'), nm:'Black',      bg:'#111'},
  {v:10,   n:L('น้ำตาล','Brown'), nm:'Brown',  bg:'#8B4513'},
  {v:100,  n:L('แดง','Red'), nm:'Red',       bg:'#f00'},
  {v:1000, n:L('ส้ม','Orange'), nm:'Orange',    bg:'#ff7700'},
  {v:10000,n:L('เหลือง','Yellow'), nm:'Yellow', bg:'#ffee00'},
  {v:1e5,  n:L('เขียว','Green'), nm:'Green',   bg:'#0a0'},
  {v:1e6,  n:L('น้ำเงิน','Blue'), nm:'Blue',  bg:'#00f'},
  {v:1e7,  n:L('ม่วง','Violet'), nm:'Violet',   bg:'#8b008b'},
];
const REV_TOLS = {
  '5':  {n:L('ทอง','Gold'), nm:'Gold',      bg:'#d4af37', t:'±5%'},
  '10': {n:L('เงิน','Silver'), nm:'Silver',   bg:'#aaa',    t:'±10%'},
  '1':  {n:L('น้ำตาล','Brown'), nm:'Brown', bg:'#8B4513', t:'±1%'},
  '2':  {n:L('แดง','Red'), nm:'Red',       bg:'#f00',    t:'±2%'},
  '0.5':{n:L('เขียว','Green'), nm:'Green',   bg:'#0a0',    t:'±0.5%'},
};

function calcReverse() {
  const raw  = parseFloat(document.getElementById('rev_val').value);
  const unit = parseFloat(document.getElementById('rev_unit').value);
  const bands= parseInt(document.getElementById('rev_bands').value);
  const tolK = document.getElementById('rev_tol').value;

  const vis  = document.getElementById('rev_visual');
  const res  = document.getElementById('rev_result');

  if (isNaN(raw) || raw <= 0) {
    showError(res, 'กรุณากรอกค่าความต้านทานที่ถูกต้อง', 'Enter a valid resistance value');
    vis.style.display = 'none';
    return;
  }

  const ohms   = raw * unit;
  const sigFigs = bands - 2;           // 2 for 4-band, 3 for 5-band
  const minD   = Math.pow(10, sigFigs - 1);   // 10 or 100
  const maxD   = Math.pow(10, sigFigs) - 1;   // 99 or 999

  // Find best multiplier — minimize rounding error
  let bestMult = null, bestDigits = 0, bestErr = Infinity;
  for (const m of REV_MULTS) {
    const raw2   = ohms / m.v;
    const rounded = Math.round(raw2);
    if (rounded < minD || rounded > maxD) continue;
    const err = Math.abs(rounded * m.v - ohms) / ohms;
    if (err < bestErr) { bestErr = err; bestMult = m; bestDigits = rounded; }
  }

  if (!bestMult) {
    showError(res, 'ค่านี้อยู่นอกช่วงที่รองรับ (0.1 Ω – 99 MΩ)', 'Value out of supported range (0.1 Ω – 99 MΩ)');
    vis.style.display = 'block';
    return;
  }

  // Extract individual digits
  let tmp = bestDigits;
  const dArr = [];
  for (let i = sigFigs - 1; i >= 0; i--) {
    const p = Math.pow(10, i);
    dArr.push(Math.floor(tmp / p));
    tmp = Math.floor(tmp % p);
  }

  const tol     = REV_TOLS[tolK] || REV_TOLS['5'];
  const actualVal = bestDigits * bestMult.v;
  const tolPct    = parseFloat(tolK);
  const bandObjs  = [...dArr.map(d => REV_DIGITS[d]), bestMult, tol];
  const band = i => L('แถบ' + i, 'Band ' + i);
  const bandLabels = [...dArr.map((d,i)=>`${band(i+1)}: ${REV_DIGITS[d].n}`), `${band(sigFigs+1)}: ${bestMult.n} (×${bestMult.v})`, `${band(sigFigs+2)}: ${tol.n} (${tol.t})`];

  // Render resistor visual
  const bandW = bands === 4 ? 26 : 22;
  let inner = '';
  inner += `<div style="background:#d4a96a;width:14px;"></div>`;
  dArr.forEach((d, i) => {
    if (i > 0) inner += `<div style="background:#d4a96a;width:8px;"></div>`;
    inner += `<div style="background:${REV_DIGITS[d].bg};width:${bandW}px;" title="${REV_DIGITS[d].nm}"></div>`;
  });
  inner += `<div style="background:#d4a96a;width:8px;"></div>`;
  inner += `<div style="background:${bestMult.bg};width:${bandW}px;" title="${bestMult.nm}"></div>`;
  inner += `<div style="background:#d4a96a;width:18px;"></div>`;
  inner += `<div style="background:${tol.bg};width:${bandW}px;" title="${tol.nm}"></div>`;
  inner += `<div style="background:#d4a96a;width:14px;"></div>`;

  document.getElementById('rev_resistor_wrap').innerHTML =
    `<div style="width:50px;height:4px;background:#888;"></div>` +
    `<div style="display:flex;align-items:stretch;height:44px;border-radius:8px;overflow:hidden;border:2px solid #555;">${inner}</div>` +
    `<div style="width:50px;height:4px;background:#888;"></div>`;

  // Band labels
  const labelsHTML = bandLabels.map((l, i) => {
    const bg = bandObjs[i].bg;
    const light = ['#ffee00','#eee','#d4af37','#aaa','#888'].includes(bg);
    return `<div style="background:${bg};color:${light?'#111':'#fff'};border-radius:6px;padding:0.3rem 0.6rem;font-size:0.82rem;font-weight:700;border:1px solid rgba(0,0,0,0.15);">${l}</div>`;
  }).join('');
  document.getElementById('rev_band_labels').innerHTML = labelsHTML;

  // Result text
  const pct = Math.round(bestErr * 10000) / 100;
  res.className = 'result-box';
  res.innerHTML =
    `<strong>${L('ค่าความต้านทาน', 'Resistance')}: ${formatOhm(actualVal)}</strong> ${tol.t}<br>` +
    `${L('ช่วงค่าจริง', 'Actual range')}: ${formatOhm(actualVal*(1-tolPct/100))} – ${formatOhm(actualVal*(1+tolPct/100))}` +
    (pct > 0.01 ? `<br><span style="color:#92400e;">⚠️ ${L('ค่าที่ใกล้ที่สุด (ปัดเศษ ' + pct.toFixed(2) + '%)', 'Nearest value (rounded by ' + pct.toFixed(2) + '%)')}</span>` : '');

  vis.style.display = 'block';
}

// ===== UNIT CONVERTER =====
const toBase = {
  V_MV:1e6,V_kV:1e3,V_V:1,V_mV:1e-3,V_uV:1e-6,
  A_kA:1e3,A_A:1,A_mA:1e-3,A_uA:1e-6,
  R_MO:1e6,R_kO:1e3,R_O:1,R_mO:1e-3,
  W_MW:1e6,W_kW:1e3,W_W:1,W_mW:1e-3,
  C_F:1,C_uF:1e-6,C_nF:1e-9,C_pF:1e-12,
  L_H:1,L_mH:1e-3,L_uH:1e-6
};
const unitNames = {
  V_MV:'MV',V_kV:'kV',V_V:'V',V_mV:'mV',V_uV:'μV',
  A_kA:'kA',A_A:'A',A_mA:'mA',A_uA:'μA',
  R_MO:'MΩ',R_kO:'kΩ',R_O:'Ω',R_mO:'mΩ',
  W_MW:'MW',W_kW:'kW',W_W:'W',W_mW:'mW',
  C_F:'F',C_uF:'μF',C_nF:'nF',C_pF:'pF',
  L_H:'H',L_mH:'mH',L_uH:'μH'
};
function calcUnit() {
  const val = parseFloat(document.getElementById('uc_val').value);
  const from = document.getElementById('uc_from').value;
  const to = document.getElementById('uc_to').value;
  const res = document.getElementById('uc_result');
  if (isNaN(val)) { showError(res, 'กรุณากรอกค่าตัวเลข', 'Enter a number'); return; }
  if (from.split('_')[0] !== to.split('_')[0]) { showError(res, 'ไม่สามารถแปลงหน่วยต่างประเภทกันได้', 'Cannot convert between different quantities'); return; }
  if (!toBase[from] || !toBase[to] || !unitNames[from] || !unitNames[to]) { showError(res, 'หน่วยไม่รองรับ', 'Unsupported unit'); return; }
  res.className='result-box';
  res.textContent = val + ' ' + unitNames[from] + ' = ' + (val * toBase[from] / toBase[to]).toPrecision(6) + ' ' + unitNames[to];
}

// ===== PAGE EVENT BINDINGS =====
const toolActions = {
  calcOhm, clearOhm, calcPower, clearPower, calcEnergy,
  calcRS, calcRP, calcCS, calcCP, calcUnit, calcReverse, calcLed, calcCode,
};

document.getElementById('led_color')?.addEventListener('change', e => {
  if (e.target.value) document.getElementById('led_vf').value = e.target.value;
});
document.getElementById('code_val')?.addEventListener('keydown', e => { if (e.key === 'Enter') calcCode(); });
document.getElementById('code_type')?.addEventListener('change', () => {
  document.getElementById('code_val').placeholder = document.getElementById('code_type').value === 'cap' ? 'e.g. 104' : 'e.g. 103';
});

document.querySelectorAll('[data-action]').forEach(button => {
  const action = toolActions[button.dataset.action];
  if (action) button.addEventListener('click', action);
});

document.querySelectorAll('[data-tab-show]').forEach(button => {
  button.addEventListener('click', function () {
    const panelIds = [this.dataset.tabShow, ...this.dataset.tabHide.split(' ')];
    panelIds.forEach(id => document.getElementById(id)?.classList.remove('active'));
    document.getElementById(this.dataset.tabShow).classList.add('active');
    this.closest('.tool-box').querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    this.classList.add('active');
  });
});

document.querySelectorAll('#r4b1, #r4b2, #r4b3, #r4b4').forEach(select => {
  select.addEventListener('change', calcR4);
});
document.querySelectorAll('#r5b1, #r5b2, #r5b3, #r5b4, #r5b5').forEach(select => {
  select.addEventListener('change', calcR5);
});

calcR4();
calcR5();
