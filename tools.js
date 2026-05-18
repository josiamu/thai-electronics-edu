// ===== SHARED HELPERS =====
function formatOhm(val) {
  if (val >= 1e6) return (val/1e6).toPrecision(4) + ' MΩ (' + val.toLocaleString() + ' Ω)';
  if (val >= 1000) return (val/1000).toPrecision(4) + ' kΩ (' + val.toLocaleString() + ' Ω)';
  return val.toPrecision(4) + ' Ω';
}

function showTab(tabs, contents, activeId) {
  document.querySelectorAll(tabs).forEach(b => b.classList.remove('active'));
  document.querySelectorAll(contents).forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
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
  document.getElementById('r4result').textContent =
    'ค่าความต้านทาน: ' + formatOhm(val) + ' ±' + tol + '% (ช่วง: ' + formatOhm(min) + ' ถึง ' + formatOhm(max) + ')';
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
  document.getElementById('r5result').textContent =
    'ค่าความต้านทาน: ' + formatOhm(val) + ' ±' + tol + '% (ช่วง: ' + formatOhm(min) + ' ถึง ' + formatOhm(max) + ')';
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
  if (vals < 2) { res.textContent = 'กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
  res.className = 'result-box';
  let out = [];
  if (isNaN(E) && !isNaN(I) && !isNaN(R)) {
    const e = I*R; document.getElementById('ohm_e').value = e.toPrecision(6);
    out.push('แรงดัน E = I × R = ' + I + ' × ' + R + ' = ' + e.toPrecision(6) + ' V');
  } else if (isNaN(I) && !isNaN(E) && !isNaN(R)) {
    const i = E/R; document.getElementById('ohm_i').value = i.toPrecision(6);
    out.push('กระแส I = E / R = ' + E + ' / ' + R + ' = ' + i.toPrecision(6) + ' A (' + (i*1000).toPrecision(4) + ' mA)');
  } else if (isNaN(R) && !isNaN(E) && !isNaN(I)) {
    const r = E/I; document.getElementById('ohm_r').value = r.toPrecision(6);
    out.push('ความต้านทาน R = E / I = ' + E + ' / ' + I + ' = ' + formatOhm(r));
  } else {
    out.push('E = ' + E + ' V, I = ' + I + ' A, R = ' + formatOhm(R));
    out.push('ตรวจสอบ E = I×R = ' + (I*R).toPrecision(6) + ' V');
    out.push('กำลังไฟฟ้า P = E×I = ' + (E*I).toPrecision(6) + ' W');
  }
  res.textContent = out.join(' | ');
}
function clearOhm() {
  ['ohm_e','ohm_i','ohm_r'].forEach(id => document.getElementById(id).value='');
  document.getElementById('ohm_result').textContent='';
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
  if (Object.values(known).filter(Boolean).length < 2) { res.textContent='กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
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
  document.getElementById('pow_result').textContent=''; document.getElementById('pow_result').className='result-box';
}

// ===== ENERGY =====
function calcEnergy() {
  const p = parseFloat(document.getElementById('eng_p').value);
  const t = parseFloat(document.getElementById('eng_t').value);
  const res = document.getElementById('eng_result');
  if (isNaN(p)||isNaN(t)||p<=0||t<=0) { res.textContent='กรุณากรอกค่าที่ถูกต้อง'; res.className='result-box result-error'; return; }
  res.className='result-box';
  const wh = p * t, kwh = wh / 1000;
  res.textContent = 'W = P × t = ' + p + ' W × ' + t + ' h = ' + wh.toLocaleString() + ' Wh = ' + kwh.toPrecision(4) + ' kWh (' + kwh.toPrecision(4) + ' หน่วย)';
}

// ===== SERIES/PARALLEL =====
function parseList(id) {
  return document.getElementById(id).value.split(',').map(s=>parseFloat(s.trim())).filter(v=>!isNaN(v)&&v>0);
}
function calcRS() {
  const vals = parseList('rs_vals'), res = document.getElementById('rs_result');
  if (vals.length<2) { res.textContent='กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
  res.className='result-box'; res.textContent = 'R_T = ' + vals.join(' + ') + ' = ' + formatOhm(vals.reduce((a,b)=>a+b,0));
}
function calcRP() {
  const vals = parseList('rp_vals'), res = document.getElementById('rp_result');
  if (vals.length<2) { res.textContent='กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
  res.className='result-box'; res.textContent = '1/R_T = ' + vals.map(v=>'1/'+v).join('+') + ' → R_T = ' + formatOhm(1/vals.reduce((a,b)=>a+1/b,0));
}
function calcCS() {
  const vals = parseList('cs_vals'), res = document.getElementById('cs_result');
  if (vals.length<2) { res.textContent='กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
  res.className='result-box'; res.textContent = '1/C_T = ' + vals.map(v=>'1/'+v).join('+') + ' → C_T = ' + (1/vals.reduce((a,b)=>a+1/b,0)).toPrecision(4) + ' μF';
}
function calcCP() {
  const vals = parseList('cp_vals'), res = document.getElementById('cp_result');
  if (vals.length<2) { res.textContent='กรุณากรอกอย่างน้อย 2 ค่า'; res.className='result-box result-error'; return; }
  res.className='result-box'; res.textContent = 'C_T = ' + vals.join(' + ') + ' = ' + vals.reduce((a,b)=>a+b,0).toPrecision(4) + ' μF';
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
  if (isNaN(val)) { res.textContent='กรุณากรอกค่าตัวเลข'; res.className='result-box result-error'; return; }
  if (from.split('_')[0] !== to.split('_')[0]) { res.textContent='ไม่สามารถแปลงหน่วยต่างประเภทกันได้'; res.className='result-box result-error'; return; }
  res.className='result-box';
  res.textContent = val + ' ' + unitNames[from] + ' = ' + (val * toBase[from] / toBase[to]).toPrecision(6) + ' ' + unitNames[to];
}
