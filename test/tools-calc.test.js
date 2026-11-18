// Checks the pure calculators in js/tools.js. Run: node test/tools-calc.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');

const el = () => ({ value: '', style: {}, classList: { add() {}, remove() {} }, addEventListener() {} });
global.document = { getElementById: el, querySelectorAll: () => [] };
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tools.js'), 'utf8');
const T = new Function(src + '; return { parseCapCode, parseSmdCode, ledResistor, e12Up, energyBill, e96 };')();

const near = (a, b) => assert.ok(Math.abs(a - b) <= Math.abs(b) * 1e-9 + 1e-12, `${a} != ${b}`);

// Capacitor codes
near(T.parseCapCode('104').pf, 100000);           // 100 nF
near(T.parseCapCode('103').pf, 10000);
near(T.parseCapCode('100').pf, 10);
near(T.parseCapCode('479').pf, 4.7);              // 9 = ×0.1
assert.strictEqual(T.parseCapCode('104K').tol, '±10%');
near(T.parseCapCode('4n7').pf, 4700);
near(T.parseCapCode('2u2').pf, 2.2e6);
near(T.parseCapCode('2µ2').pf, 2.2e6);
near(T.parseCapCode('p47').pf, 0.47);
near(T.parseCapCode('22').pf, 22);
near(T.parseCapCode('0.1').pf, 1e5);
assert.strictEqual(T.parseCapCode('abc'), null);

// SMD resistor codes
near(T.parseSmdCode('103').ohm, 10000);
near(T.parseSmdCode('1002').ohm, 10000);
near(T.parseSmdCode('4R7').ohm, 4.7);
near(T.parseSmdCode('R10').ohm, 0.1);
near(T.parseSmdCode('47R').ohm, 47);              // R notation, not EIA-96
assert.strictEqual(T.parseSmdCode('000').ohm, 0);
near(T.parseSmdCode('01C').ohm, 10000);           // 100 × 100
near(T.parseSmdCode('68X').ohm, 49.9);            // 499 × 0.1
assert.strictEqual(T.parseSmdCode('97A'), null);

// The formula must reproduce the published E96 table exactly
const E96 = [100,102,105,107,110,113,115,118,121,124,127,130,133,137,140,143,147,150,154,158,162,165,169,174,178,182,187,191,196,200,205,210,215,221,226,232,237,243,249,255,261,267,274,280,287,294,301,309,316,324,332,340,348,357,365,374,383,392,402,412,422,432,442,453,464,475,487,499,511,523,536,549,562,576,590,604,619,634,649,665,681,698,715,732,750,768,787,806,825,845,866,887,909,931,953,976];
E96.forEach((v, i) => assert.strictEqual(T.e96(i + 1), v, `E96 #${i + 1}`));

// LED resistor: 5 V, red 2 V, 20 mA → 150 Ω exactly
let x = T.ledResistor(5, 2, 1, 20);
near(x.r, 150); assert.strictEqual(x.rStd, 150); assert.strictEqual(x.watt, 0.125);
x = T.ledResistor(12, 3.2, 3, 20);                // 2.4 V / 20 mA = 120 Ω
assert.strictEqual(x.rStd, 120);
x = T.ledResistor(5, 2, 1, 10);                   // 300 Ω → next E12 = 330 Ω
assert.strictEqual(x.rStd, 330); assert.ok(x.i < 0.010);
assert.strictEqual(T.ledResistor(5, 3.2, 2, 20), null);
assert.strictEqual(T.e12Up(9.9), 10); assert.strictEqual(T.e12Up(1000), 1000); assert.strictEqual(T.e12Up(4701), 5600);

// Energy bill: 1000 W × 2 h × 30 days × 4 THB = 60 kWh = 240 THB
const b = T.energyBill(1000, 2, 30, 4);
near(b.kwhDay, 2); near(b.kwh, 60); near(b.baht, 240);

console.log('tools-calc: all checks passed');
