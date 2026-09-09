#!/usr/bin/env node
/* test/smoke-canvas-sim.js — ฮาร์เนสตรวจซิมแคนวาสทุกตัวในเว็บ โดยไม่ต้องเปิดเบราว์เซอร์
 *
 * ปัญหาที่แก้: ป้ายบนแคนวาสเป็น text ล้วน ๆ ข้อความอังกฤษยาวกว่าไทยมาก และซิมมีหลายขั้น
 * หลายอาการเสีย หลายโหมด — การไล่ดูด้วยตาจึงพลาดง่ายและช้า ฮาร์เนสนี้รันซิมจริงบน DOM ปลอม
 * แล้ว "วัดกรอบข้อความ" ที่ซิมวาดออกมา เพื่อจับ 2 อย่าง:
 *   1. ตัวอักษรทับกัน  (กรอบสองอันซ้อนกันเกินเกณฑ์)
 *   2. ตัวอักษรล้นขอบแคนวาส (กรอบหลุดออกนอกพื้นที่วาด)
 * ไล่ครบทุก ภาษา × ขั้น × อาการเสีย × โหมด × ค่าสุดขอบของสไลเดอร์
 *
 * วิธีใช้:
 *   node test/smoke-canvas-sim.js               ตรวจทุกซิม
 *   node test/smoke-canvas-sim.js kirchhoff     ตรวจเฉพาะซิมที่ชื่อมีคำนี้
 *   node test/smoke-canvas-sim.js --list        ดูรายชื่อซิมที่ตรวจได้
 *   node test/smoke-canvas-sim.js --verbose     พิมพ์ทุกกรณีที่เจอ ไม่ยุบซ้ำ
 * ออกด้วยรหัส 1 เมื่อพบปัญหา จึงเอาไปต่อ CI ได้
 *
 * ข้อยกเว้นที่ยอมรับแล้ว (เช่น ป้ายที่ตั้งใจให้ซ้อนกัน) ใส่ไว้ใน test/smoke-canvas-sim.ignore.json
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { parseHTML, El, mkEvent, walk } = require('./dom-shim.js');
const { createContext } = require('./canvas-shim.js');

const ROOT = path.resolve(__dirname, '..');

/* เกณฑ์ตัดสิน */
const OVERLAP_RATIO = 0.45;   // พื้นที่ซ้อน ÷ พื้นที่กรอบที่เล็กกว่า เกินเท่านี้ = ทับกัน
const EDGE_TOL = 1.5;         // ล้นขอบได้ไม่เกินกี่พิกเซล
const MIN_ALPHA = 0.25;       // ข้อความจาง ๆ (เอฟเฟกต์) ไม่นับ
const FRAMES = 3;             // จำนวนเฟรมที่เดินต่อหนึ่งกรณี (จับป้ายที่ขยับตามอนิเมชัน)
const FRAME_MS = 140;

/* ---------- ค้นหาซิม: หน้าไหนโหลดสคริปต์ที่มีแคนวาส ---------- */
function discover() {
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const out = [];
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const re = /<script[^>]+src=["'](?:\.\/)?js\/([-\w]+\.js)["']/g;
    let m;
    while ((m = re.exec(html))) {
      const js = path.join(ROOT, 'js', m[1]);
      if (!fs.existsSync(js)) continue;
      const src = fs.readFileSync(js, 'utf8');
      if (!/getContext\(\s*['"]2d['"]\s*\)/.test(src)) continue;
      out.push({ name: m[1].replace(/\.js$/, ''), js, page, html: path.join(ROOT, page) });
    }
  }
  return out;
}

/* ---------- สภาพแวดล้อมปลอมหนึ่งชุดต่อหนึ่งซิม ---------- */
function buildEnv(htmlFile) {
  const root = parseHTML(fs.readFileSync(htmlFile, 'utf8'));
  const docEl = root.querySelector('html') || new El('html', {});
  const body = root.querySelector('body') || docEl;

  Object.defineProperty(El.prototype, 'lang', {
    configurable: true,
    get() { return this.attrs.lang || ''; },
    set(v) { this.attrs.lang = v; }
  });

  const byId = new Map();
  walk(root, el => { if (el.id && !byId.has(el.id)) byId.set(el.id, el); });

  const contexts = [];
  root.querySelectorAll('canvas').forEach(cv => {
    // ขนาดตั้งต้นมาจากแอตทริบิวต์ในหน้าเว็บจริง (บางซิมไม่ได้ตั้ง cv.width เอง)
    cv.width = +cv.getAttribute('width') || 300;
    cv.height = +cv.getAttribute('height') || 150;
    const ctx = createContext(cv);
    contexts.push({ cv, ctx });
    cv.getContext = () => ctx;
  });

  const listeners = {};
  const rafQueue = [];
  const observers = [];
  let clock = 0;

  const document = {
    documentElement: docEl,
    body, head: root.querySelector('head') || docEl,
    hidden: false,
    visibilityState: 'visible',
    title: '',
    getElementById: id => byId.get(id) || null,
    querySelector: sel => root.querySelector(sel),
    querySelectorAll: sel => root.querySelectorAll(sel),
    createElement: tag => { const e = new El(tag, {}); if (tag === 'canvas') { const c = createContext(e); e.getContext = () => c; } return e; },
    createElementNS: (ns, tag) => new El(tag, {}),
    createTextNode: t => ({ nodeType: 3, data: t, textContent: t }),
    addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    removeEventListener: (t, fn) => { if (listeners[t]) listeners[t] = listeners[t].filter(f => f !== fn); },
    dispatchEvent: ev => { (listeners[ev.type] || []).slice().forEach(fn => fn(ev)); return true; }
  };

  const storage = new Map();
  const window = {
    document,
    devicePixelRatio: 1,
    innerWidth: 1280, innerHeight: 900,
    scrollY: 0, pageYOffset: 0,
    addEventListener: (t, fn) => { (listeners['win:' + t] = listeners['win:' + t] || []).push(fn); },
    removeEventListener: () => {},
    dispatchEvent: () => true,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '', display: 'block' }),
    requestAnimationFrame: fn => { rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame: () => {},
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k)
    },
    performance: { now: () => clock },
    AudioContext: function () { return { createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 } }), createGain: () => ({ connect() {}, gain: { value: 0, setValueAtTime() {} } }), destination: {}, currentTime: 0, resume() {} }; }
  };
  window.window = window;

  class MutationObserverStub {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe() {} disconnect() {}
  }

  const env = {
    root, document, window, contexts, listeners, observers,
    dpr: 1,
    pump(frames) {
      for (let i = 0; i < (frames || 1); i++) {
        clock += FRAME_MS;
        const q = rafQueue.splice(0, rafQueue.length);
        q.forEach(fn => fn(clock));
      }
    },
    fireLang(lang) {
      docEl.lang = lang;
      observers.forEach(o => { try { o.cb([{ type: 'attributes', attributeName: 'lang' }]); } catch (e) {} });
      document.dispatchEvent(mkEvent('langchange'));
    },
    install() {
      // Node บางเวอร์ชันประกาศ navigator/performance เป็น getter จึงต้อง defineProperty ทับ
      const g = {
        document, window,
        navigator: { userAgent: 'node', language: 'th' },
        location: { href: 'http://localhost/' + path.basename(htmlFile), search: '', hash: '' },
        localStorage: window.localStorage,
        requestAnimationFrame: window.requestAnimationFrame,
        cancelAnimationFrame: window.cancelAnimationFrame,
        getComputedStyle: window.getComputedStyle,
        matchMedia: window.matchMedia,
        devicePixelRatio: 1,
        performance: window.performance,
        MutationObserver: MutationObserverStub,
        CustomEvent: function (type, init) { return mkEvent(type, init); },
        Event: function (type, init) { return mkEvent(type, init); },
        AudioContext: window.AudioContext,
        Image: function () { return new El('img', {}); }
      };
      for (const k of Object.keys(g)) {
        Object.defineProperty(globalThis, k, { value: g[k], writable: true, configurable: true });
      }
    }
  };
  return env;
}

/* ---------- ตัวควบคุมที่ไดรเวอร์จะกด ---------- */
function collectControls(env, canvas) {
  let scope = canvas.parentNode;
  while (scope && scope.nodeType === 1 && !scope.id) scope = scope.parentNode;
  if (!scope || scope.nodeType !== 1) scope = env.root;

  const all = scope.querySelectorAll('*');
  const steps = [], selects = [], ranges = [], buttons = [];
  const seenStep = new Set();
  for (const el of all) {
    const t = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName === 'input' && t === 'range') { ranges.push(el); continue; }
    if (el.tagName === 'select') { selects.push(el); continue; }
    const step = el.getAttribute('data-step');
    if (step !== null && el.tagName === 'button') {
      if (!seenStep.has(step)) { seenStep.add(step); steps.push(el); }
      continue;
    }
    const clickable = el.tagName === 'button' ||
      el.getAttribute('data-mode') !== null || el.getAttribute('data-speed') !== null;
    if (clickable) buttons.push(el);
  }
  return { scope, steps, selects, ranges, buttons };
}

const setRange = (el, v) => { el.value = String(v); el.dispatchEvent(mkEvent('input')); el.dispatchEvent(mkEvent('change')); };
const setSelect = (el, v) => { el.value = String(v); el.dispatchEvent(mkEvent('change')); el.dispatchEvent(mkEvent('input')); };
const optionsOf = el => el.querySelectorAll('option')
  .map(o => (o.getAttribute('value') !== null ? o.getAttribute('value') : o.textContent.trim()));

/* ---------- ตัวตรวจ ---------- */
function intersects(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return x > 0 && y > 0 ? x * y : 0;
}
function checkFrame(ctx, W, H, S, ctxLabel, issues) {
  const boxes = [];
  const seen = new Set();
  for (const t of ctx.texts) {
    if (t.alpha < MIN_ALPHA) continue;
    const key = t.text + '@' + Math.round(t.x) + ',' + Math.round(t.y);
    if (seen.has(key)) continue;              // fill + stroke ของข้อความเดียวกัน นับครั้งเดียว
    seen.add(key);
    boxes.push(t);
  }
  for (const t of boxes) {
    const over = Math.max(0 - t.x, 0 - t.y, (t.x + t.w) - W, (t.y + t.h) - H) / S;
    if (over > EDGE_TOL) {
      issues.push({ type: 'edge', where: ctxLabel, text: t.text, over: +over.toFixed(1),
        box: [Math.round(t.x / S), Math.round(t.y / S), Math.round(t.w / S), Math.round(t.h / S)] });
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const area = intersects(a, b);
      if (!area) continue;
      const ratio = area / Math.min(a.w * a.h, b.w * b.h);
      if (ratio > OVERLAP_RATIO) {
        issues.push({ type: 'overlap', where: ctxLabel, a: a.text, b: b.text,
          ratio: +ratio.toFixed(2),
          box: [Math.round(a.x / S), Math.round(a.y / S)] });
      }
    }
  }
}

function loadIgnore() {
  const f = path.join(__dirname, 'smoke-canvas-sim.ignore.json');
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return []; }
}
function ignored(rules, sim, iss) {
  return rules.some(r => {
    if (r.sim && r.sim !== sim) return false;
    if (r.type && r.type !== iss.type) return false;
    const hay = iss.type === 'overlap' ? [iss.a, iss.b] : [iss.text];
    if (r.text && !hay.some(h => h.includes(r.text))) return false;
    if (r.a && !hay.some(h => h.includes(r.a))) return false;
    if (r.b && !hay.some(h => h.includes(r.b))) return false;
    return !!(r.text || r.a || r.b || r.type);
  });
}

/* ---------- รันซิมหนึ่งตัว ---------- */
function runSim(sim, opt) {
  const env = buildEnv(sim.html);
  env.install();
  const src = fs.readFileSync(sim.js, 'utf8');
  const issues = [];
  let err = null;
  try {
    // eslint-disable-next-line no-new-func
    new Function(src + '\n//# sourceURL=' + sim.name)();
  } catch (e) {
    return { sim: sim.name, page: sim.page, error: 'รันสคริปต์ไม่ผ่าน: ' + e.message, issues, cases: 0 };
  }

  env.pump(2);   // ซิมหลายตัววาดครั้งแรกในลูปเฟรม ไม่ได้วาดตอน init
  const live = env.contexts.filter(c => c.ctx.drawCalls > 0)
    .sort((a, b) => b.ctx.drawCalls - a.ctx.drawCalls);
  if (!live.length) {
    return { sim: sim.name, page: sim.page, error: 'ซิมไม่ได้วาดอะไรเลย (แคนวาสอาจไม่มีในหน้านี้)', issues, cases: 0 };
  }
  const { cv, ctx } = live[0];
  // กรอบข้อความอยู่ในพิกัดอุปกรณ์ (ผ่านเมทริกซ์แล้ว) จึงเทียบกับขนาดจริงของแคนวาสตรง ๆ
  const W = cv.width, H = cv.height;
  const S = ctx.baseScale || 1;
  const ctl = collectControls(env, cv);

  let cases = 0;
  const render = label => {
    for (let f = 0; f < FRAMES; f++) {
      ctx._resetFrame();
      env.pump(1);
      if (!ctx.texts.length && f === 0) continue;
      checkFrame(ctx, W, H, S, label, issues);
    }
    cases++;
  };

  const steps = ctl.steps.length ? ctl.steps : [null];
  const faults = ctl.selects.length ? ctl.selects : [null];

  for (const lang of ['th', 'en']) {
    env.fireLang(lang);
    const L = lang.toUpperCase();

    // ขั้น × อาการเสีย
    for (const st of steps) {
      if (st) st.click();
      const stName = st ? 'ขั้น ' + (st.getAttribute('data-step') || '?') : 'ขั้นเดียว';
      if (faults[0] === null) { render(L + ' · ' + stName); continue; }
      for (const sel of faults) {
        for (const v of optionsOf(sel)) {
          setSelect(sel, v);
          render(L + ' · ' + stName + ' · ' + sel.id + '=' + v);
        }
        setSelect(sel, optionsOf(sel)[0]);
      }
    }

    // ปุ่มโหมด/ปุ่มสลับอื่น ๆ — กดเข้า กดออก
    for (const b of ctl.buttons) {
      const tag = (b.id || b.getAttribute('data-mode') || b.getAttribute('data-speed') || 'btn');
      b.click(); render(L + ' · ปุ่ม ' + tag + ' (กด)');
      b.click(); render(L + ' · ปุ่ม ' + tag + ' (กดซ้ำ)');
    }

    // สไลเดอร์ทีละตัว ที่ค่าต่ำสุด/สูงสุด
    for (const r of ctl.ranges) {
      const min = r.getAttribute('min'), max = r.getAttribute('max');
      const def = r.value;
      for (const v of [min, max]) {
        if (v === null) continue;
        setRange(r, v);
        render(L + ' · ' + (r.id || 'slider') + '=' + v);
      }
      setRange(r, def);
    }

    // ทุกสไลเดอร์ไปสุดทางพร้อมกัน (ข้อความยาวที่สุดมักเกิดตอนนี้)
    if (ctl.ranges.length > 1) {
      for (const v of ['min', 'max']) {
        ctl.ranges.forEach(r => { const x = r.getAttribute(v); if (x !== null) setRange(r, x); });
        render(L + ' · สไลเดอร์ทุกตัว=' + v);
      }
    }
  }
  return { sim: sim.name, page: sim.page, error: err, issues, cases, W: Math.round(W / S), H: Math.round(H / S) };
}

/* ---------- รายงาน ---------- */
function report(results, opt) {
  const rules = loadIgnore();
  let bad = 0, totalCases = 0;
  const lines = [];
  for (const r of results) {
    totalCases += r.cases;
    if (r.error) {
      bad++;
      lines.push('✗ ' + r.sim + '  (' + r.page + ')\n    ' + r.error);
      continue;
    }
    const kept = r.issues.filter(i => !ignored(rules, r.sim, i));
    // ยุบกรณีซ้ำ: ปัญหาเดียวกันโผล่ทุกเฟรม/ทุกอาการเสีย
    const groups = new Map();
    for (const i of kept) {
      const key = i.type + '|' + (i.type === 'overlap' ? i.a + '|' + i.b : i.text) + '|' + i.box.join(',');
      if (!groups.has(key)) groups.set(key, { ...i, count: 0, wheres: [] });
      const g = groups.get(key);
      g.count++;
      if (g.wheres.length < 3 && !g.wheres.includes(i.where)) g.wheres.push(i.where);
    }
    const list = [...groups.values()].sort((a, b) => b.count - a.count);
    if (!list.length) {
      lines.push('✓ ' + r.sim + '  (' + r.page + ', ' + r.cases + ' กรณี, แคนวาส ' + r.W + '×' + r.H + ')');
      continue;
    }
    bad++;
    lines.push('✗ ' + r.sim + '  (' + r.page + ', ' + r.cases + ' กรณี) — พบ ' + list.length + ' จุด');
    for (const g of (opt.verbose ? list : list.slice(0, 12))) {
      if (g.type === 'overlap') {
        lines.push('    ทับกัน ' + Math.round(g.ratio * 100) + '%  "' + g.a + '"  ×  "' + g.b + '"');
      } else {
        lines.push('    ล้นขอบ ' + g.over + 'px  "' + g.text + '"  ที่ [' + g.box.join(', ') + ']');
      }
      lines.push('        ' + g.wheres.join(' / ') + (g.count > g.wheres.length ? '  (ซ้ำ ' + g.count + ' ครั้ง)' : ''));
    }
    if (!opt.verbose && list.length > 12) lines.push('    … อีก ' + (list.length - 12) + ' จุด (ใส่ --verbose เพื่อดูทั้งหมด)');
  }
  console.log(lines.join('\n'));
  console.log('\n' + (bad ? '✗ ' : '✓ ') + (results.length - bad) + '/' + results.length +
    ' ซิมผ่าน · ' + totalCases + ' กรณีที่ไล่ตรวจ');
  return bad;
}

/* ---------- main ---------- */
function main() {
  const args = process.argv.slice(2);
  const opt = { verbose: args.includes('--verbose'), json: args.includes('--json') };
  const filters = args.filter(a => !a.startsWith('--'));
  let sims = discover();
  if (args.includes('--list')) {
    sims.forEach(s => console.log(s.name.padEnd(22) + s.page));
    return 0;
  }
  if (filters.length) sims = sims.filter(s => filters.some(f => s.name.includes(f) || s.page.includes(f)));
  if (!sims.length) { console.error('ไม่พบซิมที่ตรงกับเงื่อนไข'); return 1; }

  const results = sims.map(s => runSim(s, opt));
  if (opt.json) { console.log(JSON.stringify(results, null, 2)); return results.some(r => r.error || r.issues.length) ? 1 : 0; }
  return report(results, opt) ? 1 : 0;
}

process.exit(main());
