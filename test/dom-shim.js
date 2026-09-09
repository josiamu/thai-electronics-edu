/* test/dom-shim.js — DOM ปลอมขนาดเล็กสำหรับรันซิมแคนวาสของเว็บนี้ใน Node
 *
 * ทำไมต้องมี: ซิมทุกตัวเป็น IIFE ที่ผูกกับ DOM จริง (getElementById / querySelectorAll /
 * addEventListener / requestAnimationFrame) จึง require เข้ามาตรง ๆ ใน Node ไม่ได้
 * ไฟล์นี้อ่าน HTML ของหน้านั้นจริง ๆ แล้วสร้างต้นไม้ DOM ให้ซิมเกาะ — ปุ่ม สไลเดอร์
 * และ <select> ที่ไดรเวอร์กดจึงเป็นชุดเดียวกับที่ผู้ใช้เห็นบนหน้าเว็บ ไม่ใช่ของที่เดาขึ้นเอง
 *
 * ครอบคลุมเท่าที่ซิมในโปรเจกต์นี้เรียกใช้จริงเท่านั้น ไม่ใช่ DOM ครบสเปก
 */
'use strict';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style']);

/* ---------- ตัวเลือก (selector) ---------- */
// รองรับเท่าที่ซิมใช้: รายการคั่นจุลภาค, ตัวคั่นลูกหลาน (เว้นวรรค),
// และ compound ของ tag / #id / .class / [attr] / [attr="v"]
function parseCompound(s) {
  const c = { tag: null, id: null, cls: [], attrs: [] };
  const re = /([.#]?[-\w]+)|\[([-\w]+)(?:\s*=\s*"?([^\]"]*)"?)?\]/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[2]) c.attrs.push([m[2], m[3] === undefined || m[3] === '' ? null : m[3]]);
    else if (m[1][0] === '#') c.id = m[1].slice(1);
    else if (m[1][0] === '.') c.cls.push(m[1].slice(1));
    else c.tag = m[1].toLowerCase();
  }
  return c;
}
function parseSelector(sel) {
  return sel.split(',').map(part =>
    part.trim().split(/\s+/).filter(Boolean).map(parseCompound));
}
function matchCompound(el, c) {
  if (c.tag && el.tagName !== c.tag) return false;
  if (c.id && el.id !== c.id) return false;
  for (const k of c.cls) if (!el.classList.contains(k)) return false;
  for (const [a, v] of c.attrs) {
    const got = el.getAttribute(a);
    if (got === null) return false;
    if (v !== null && got !== v) return false;
  }
  return true;
}
function matchChain(el, chain) {
  if (!matchCompound(el, chain[chain.length - 1])) return false;
  let i = chain.length - 2, node = el.parentNode;
  while (i >= 0) {
    if (!node) return false;
    if (node.nodeType === 1 && matchCompound(node, chain[i])) i--;
    node = node.parentNode;
  }
  return true;
}

/* ---------- โหนด ---------- */
class TextNode {
  constructor(text) { this.nodeType = 3; this.data = text; this.parentNode = null; }
  get textContent() { return this.data; }
}

class El {
  constructor(tag, attrs) {
    this.nodeType = 1;
    this.tagName = tag.toLowerCase();
    this.attrs = attrs || {};
    this.childNodes = [];
    this.parentNode = null;
    this.style = makeStyle();
    this._listeners = {};
    this._value = this.attrs.value !== undefined ? this.attrs.value : null;
    this.checked = 'checked' in this.attrs;
    this.hidden = false;
    const self = this;
    this.classList = {
      contains: k => self._classes().includes(k),
      add(...k) { const s = new Set(self._classes()); k.forEach(x => s.add(x)); self.attrs.class = [...s].join(' '); },
      remove(...k) { const s = new Set(self._classes()); k.forEach(x => s.delete(x)); self.attrs.class = [...s].join(' '); },
      toggle(k, on) {
        const has = self._classes().includes(k);
        const want = on === undefined ? !has : !!on;
        if (want) this.add(k); else this.remove(k);
        return want;
      },
      get length() { return self._classes().length; }
    };
    this.dataset = new Proxy({}, {
      get: (_, p) => typeof p === 'string' ? self.attrs['data-' + camelToDash(p)] : undefined,
      set: (_, p, v) => { self.attrs['data-' + camelToDash(p)] = String(v); return true; },
      has: (_, p) => ('data-' + camelToDash(String(p))) in self.attrs
    });
  }
  _classes() { return (this.attrs.class || '').split(/\s+/).filter(Boolean); }
  get id() { return this.attrs.id || ''; }
  set id(v) { this.attrs.id = v; }
  get className() { return this.attrs.class || ''; }
  set className(v) { this.attrs.class = v; }
  get children() { return this.childNodes.filter(n => n.nodeType === 1); }
  get firstChild() { return this.childNodes[0] || null; }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null; }
  getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = String(v); }
  removeAttribute(n) { delete this.attrs[n]; }
  hasAttribute(n) { return n in this.attrs; }
  get value() {
    if (this._value !== null) return this._value;
    if (this.tagName === 'select') {
      const o = this.querySelector('option');
      return o ? (o.getAttribute('value') !== null ? o.getAttribute('value') : o.textContent) : '';
    }
    return '';
  }
  set value(v) { this._value = String(v); }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(v) {
    this.childNodes = [];
    if (v !== '' && v !== null && v !== undefined) this.appendChild(new TextNode(String(v)));
  }
  get innerHTML() { return this._html || ''; }
  set innerHTML(v) {
    // แยกจริง ไม่ใช่แค่เก็บสตริง — บางซิมเซ็ต innerHTML แล้วอ่าน children ต่อทันที
    this._html = String(v);
    this.childNodes = [];
    parseHTML(this._html).childNodes.slice().forEach(n => this.appendChild(n));
  }
  appendChild(n) { n.parentNode = this; this.childNodes.push(n); return n; }
  removeChild(n) {
    const i = this.childNodes.indexOf(n);
    if (i >= 0) this.childNodes.splice(i, 1);
    n.parentNode = null;
    return n;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  insertBefore(n, ref) {
    const i = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
    this.childNodes.splice(i < 0 ? this.childNodes.length : i, 0, n);
    n.parentNode = this;
    return n;
  }
  querySelectorAll(sel) {
    const chains = parseSelector(sel), out = [];
    walk(this, el => { if (chains.some(c => matchChain(el, c))) out.push(el); });
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  closest(sel) {
    const chains = parseSelector(sel);
    let n = this;
    while (n && n.nodeType === 1) {
      if (chains.some(c => matchChain(n, c))) return n;
      n = n.parentNode;
    }
    return null;
  }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  removeEventListener(t, fn) {
    const a = this._listeners[t];
    if (a) this._listeners[t] = a.filter(f => f !== fn);
  }
  dispatchEvent(ev) {
    ev.target = ev.target || this;
    ev.currentTarget = this;
    (this._listeners[ev.type] || []).slice().forEach(fn => fn.call(this, ev));
    return true;
  }
  click() { this.dispatchEvent(mkEvent('click')); }
  focus() {}
  blur() {}
  getBoundingClientRect() {
    const w = this.width || 0, h = this.height || 0;
    return { left: 0, top: 0, x: 0, y: 0, width: w, height: h, right: w, bottom: h };
  }
  setPointerCapture() {}
  releasePointerCapture() {}
  getContext() { return null; }
}

function camelToDash(s) { return s.replace(/[A-Z]/g, c => '-' + c.toLowerCase()); }
function makeStyle() {
  const o = {};
  Object.defineProperty(o, 'setProperty', { value: (k, v) => { o[k] = v; } });
  Object.defineProperty(o, 'removeProperty', { value: k => { delete o[k]; } });
  Object.defineProperty(o, 'getPropertyValue', { value: k => o[k] || '' });
  return o;
}
function walk(node, fn) {
  for (const c of node.childNodes) {
    if (c.nodeType === 1) { fn(c); walk(c, fn); }
  }
}
function mkEvent(type, props) {
  return Object.assign({
    type, target: null, currentTarget: null, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {}, detail: null
  }, props || {});
}

/* ---------- ตัวแยก HTML (แบบผ่อนปรน พอสำหรับหน้าในโปรเจกต์นี้) ---------- */
function parseHTML(src) {
  src = src.replace(/<!--[\s\S]*?-->/g, '');
  const root = new El('#root', {});
  const stack = [root];
  const tagRe = /<(\/?)([a-zA-Z][-a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let last = 0, m;
  while ((m = tagRe.exec(src))) {
    const text = src.slice(last, m.index);
    if (text.trim()) stack[stack.length - 1].appendChild(new TextNode(text));
    last = tagRe.lastIndex;
    const closing = m[1] === '/', tag = m[2].toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === tag) { stack.length = i; break; }
      }
      continue;
    }
    const el = new El(tag, parseAttrs(m[3]));
    stack[stack.length - 1].appendChild(el);
    if (VOID.has(tag) || m[4] === '/') continue;
    if (RAW.has(tag)) {                       // ข้ามเนื้อในของ script/style
      const end = src.toLowerCase().indexOf('</' + tag, last);
      if (end >= 0) { last = end; tagRe.lastIndex = end; }
      continue;
    }
    stack.push(el);
  }
  const tail = src.slice(last);
  if (tail.trim()) stack[stack.length - 1].appendChild(new TextNode(tail));
  return root;
}
function parseAttrs(s) {
  const out = {};
  const re = /([-:\w]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(s))) {
    const v = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    out[m[1]] = v;
  }
  return out;
}

module.exports = { El, TextNode, parseHTML, parseSelector, matchChain, walk, mkEvent, makeStyle };
