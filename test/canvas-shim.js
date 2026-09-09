/* test/canvas-shim.js — CanvasRenderingContext2D ปลอมที่ "จำกรอบตัวอักษร" ไว้ตรวจ
 *
 * หัวใจของฮาร์เนสอยู่ที่นี่: ทุกครั้งที่ซิมเรียก fillText/strokeText เราคำนวณกรอบสี่เหลี่ยม
 * ของข้อความนั้นจริง ๆ (กว้างจาก measureText · จัดตำแหน่งตาม textAlign/textBaseline ·
 * แปลงพิกัดผ่านเมทริกซ์ปัจจุบันเพื่อรองรับ translate/rotate/scale) แล้วเก็บลงลิสต์
 * ตัวตรวจจึงหาคู่ที่ซ้อนกันและกรอบที่ล้นขอบแคนวาสได้โดยไม่ต้องเปิดเบราว์เซอร์
 *
 * ความกว้างตัวอักษรเป็นค่าประมาณ: สระบน-ล่างและวรรณยุกต์ไทยไม่กินความกว้าง (ตัวประกอบ 0)
 * ไม่งั้นข้อความไทยจะถูกประเมินว่ากว้างเกินจริงจนแจ้งเตือนผิด
 */
'use strict';

/* สัดส่วนความกว้างต่อขนาดฟอนต์ 1px — เทียบจากฟอนต์ Anuphan/sans-serif โดยประมาณ */
function charFactor(ch) {
  const c = ch.codePointAt(0);
  // สระ/วรรณยุกต์ไทยที่ซ้อนบน-ล่าง ไม่กินความกว้าง
  if (c === 0x0e31 || (c >= 0x0e34 && c <= 0x0e3a) || (c >= 0x0e47 && c <= 0x0e4e)) return 0;
  if (c >= 0x0e00 && c <= 0x0e7f) return 0.55;              // อักษรไทยทั่วไป
  if (ch === ' ') return 0.28;
  if ('iljt.,:;\'`!|[]()'.includes(ch)) return 0.3;
  if ('WMmw@—–'.includes(ch)) return 0.9;
  if (ch >= '0' && ch <= '9') return 0.56;
  if (ch >= 'A' && ch <= 'Z') return 0.63;
  if (ch >= 'a' && ch <= 'z') return 0.52;
  return 0.55;
}
function textWidth(str, size) {
  let w = 0;
  for (const ch of String(str)) w += charFactor(ch) * size;
  return w;
}
function fontSizeOf(font) {
  const m = /(\d+(?:\.\d+)?)px/.exec(font || '');
  return m ? +m[1] : 10;
}

/* เมทริกซ์ 2D: [a,b,c,d,e,f] */
const I = () => [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

const STATE_PROPS = ['font', 'fillStyle', 'strokeStyle', 'lineWidth', 'textAlign',
  'textBaseline', 'globalAlpha', 'lineCap', 'lineJoin', 'shadowBlur', 'shadowColor',
  'shadowOffsetX', 'shadowOffsetY', 'miterLimit', 'filter', 'globalCompositeOperation',
  'lineDashOffset', 'imageSmoothingEnabled', 'direction'];

const NOOP_METHODS = ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'rect',
  'roundRect', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo', 'fill', 'stroke', 'clip',
  'fillRect', 'strokeRect', 'clearRect', 'setLineDash', 'drawImage', 'putImageData',
  'createImageData', 'scrollPathIntoView', 'resetTransform2'];

function createContext(canvas) {
  const ctx = {};
  let m = I();
  const stack = [];

  STATE_PROPS.forEach(p => { ctx[p] = p === 'font' ? '10px sans-serif'
    : p === 'textAlign' ? 'start' : p === 'textBaseline' ? 'alphabetic'
    : p === 'globalAlpha' ? 1 : p === 'lineWidth' ? 1 : ''; });

  ctx.canvas = canvas;
  ctx.texts = [];        // กรอบข้อความของ "เฟรมปัจจุบัน"
  ctx.drawCalls = 0;
  // อัตราขยายฐาน = ตัวคูณ DPR ที่ซิมตั้งไว้ตอนเริ่ม (ctx.scale/setTransform ขณะ stack ว่าง)
  // ใช้แปลงขนาดแคนวาสจริงกลับเป็นพิกัดที่ผู้เขียนซิมคิดเป็นพิกเซล
  ctx.baseScale = 1;
  const noteBase = () => { if (!stack.length && m[0]) ctx.baseScale = Math.abs(m[0]); };

  ctx.save = () => { stack.push({ m: m.slice(), s: STATE_PROPS.map(p => ctx[p]) }); };
  ctx.restore = () => {
    const s = stack.pop();
    if (s) { m = s.m; STATE_PROPS.forEach((p, i) => { ctx[p] = s.s[i]; }); }
  };
  ctx.translate = (x, y) => { m = mul(m, [1, 0, 0, 1, x, y]); };
  ctx.scale = (x, y) => { m = mul(m, [x, 0, 0, y, 0, 0]); noteBase(); };
  ctx.rotate = a => { m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); };
  ctx.transform = (a, b, c, d, e, f) => { m = mul(m, [a, b, c, d, e, f]); };
  ctx.setTransform = (a, b, c, d, e, f) => {
    m = (a === undefined) ? I() : (typeof a === 'object' ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b, c, d, e, f]);
    noteBase();
  };
  ctx.resetTransform = () => { m = I(); };
  ctx.getTransform = () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] });
  ctx.getLineDash = () => [];
  ctx.isPointInPath = () => false;
  ctx.isPointInStroke = () => false;
  ctx.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
  const grad = () => ({ addColorStop() {} });
  ctx.createLinearGradient = grad;
  ctx.createRadialGradient = grad;
  ctx.createConicGradient = grad;
  ctx.createPattern = () => null;
  NOOP_METHODS.forEach(k => { ctx[k] = () => { ctx.drawCalls++; }; });

  ctx.measureText = str => {
    const size = fontSizeOf(ctx.font);
    const w = textWidth(str, size);
    return {
      width: w,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: w,
      actualBoundingBoxAscent: size * 0.72, actualBoundingBoxDescent: size * 0.22
    };
  };

  function record(str, x, y, maxWidth, kind) {
    ctx.drawCalls++;
    const text = String(str);
    if (!text.trim()) return;
    const size = fontSizeOf(ctx.font);
    let w = textWidth(text, size);
    if (maxWidth && w > maxWidth) w = maxWidth;      // เบราว์เซอร์บีบให้พอดี maxWidth
    const a = ctx.textAlign;
    const x0 = (a === 'center') ? x - w / 2 : (a === 'right' || a === 'end') ? x - w : x;
    const b = ctx.textBaseline;
    const asc = size * 0.75, desc = size * 0.25;
    const y0 = (b === 'middle') ? y - size / 2
      : (b === 'top' || b === 'hanging') ? y
      : (b === 'bottom') ? y - size
      : y - asc;                                     // alphabetic / ideographic
    const y1 = y0 + (b === 'alphabetic' || b === 'ideographic' ? asc + desc : size);
    // แปลงมุมทั้งสี่ด้วยเมทริกซ์ปัจจุบัน แล้วเอากรอบครอบ (รองรับข้อความหมุน)
    const pts = [[x0, y0], [x0 + w, y0], [x0, y1], [x0 + w, y1]].map(p => apply(m, p[0], p[1]));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    ctx.texts.push({
      text, kind,
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
      size, font: ctx.font, align: a, baseline: b, color: String(ctx.fillStyle),
      alpha: ctx.globalAlpha
    });
  }
  ctx.fillText = (s, x, y, mw) => record(s, x, y, mw, 'fill');
  ctx.strokeText = (s, x, y, mw) => record(s, x, y, mw, 'stroke');

  ctx._resetFrame = () => { ctx.texts = []; ctx.drawCalls = 0; };
  ctx._scale = () => Math.abs(m[0]) || 1;
  return ctx;
}

module.exports = { createContext, textWidth, fontSizeOf };
