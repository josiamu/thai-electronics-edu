# Thai Electronics Education Website

## Project
- Static multi-page website สำหรับสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์
- **Bilingual: ไทย / English** — สลับภาษาผ่านปุ่ม TH / EN ใน nav bar
- GitHub Pages: https://josiamu.github.io/thai-electronics-edu/
- Repo: https://github.com/josiamu/thai-electronics-edu
- Branch: master → deploy อัตโนมัติ

## Stack
- Vanilla HTML / CSS / JavaScript — ไม่ใช้ framework ใดๆ
- Font: Anuphan (Google Fonts, wght 300–700)
- Storage: localStorage (quiz scores, dark mode, language preference)

## File Structure
```
website/
├── style.css        — shared CSS ทุกหน้า (CSS custom properties, dark mode, bilingual)
├── nav.js           — inject nav bar + dark mode toggle + hamburger + language toggle + back-to-top button
├── tools.js         — logic เครื่องคิดเลขทุกตัว (calcR4, calcR5, calcOhm, ...)
├── quiz.js          — ข้อมูลข้อสอบ + logic แบบทดสอบ
├── downloads.js     — PDF preview modal + download interactions
├── oscilloscope.js  — Interactive I-V Curve Simulator
├── simulation.js    — logic จำลองวงจรและ animation
├── index.html          — หน้าหลัก (CURRENT_PAGE='home') — แบ่ง 4 กลุ่ม: บทเรียน / เครื่องมือ / บทเสริม / ทดสอบ
├── electricity.html    — บทที่ 1
├── ohm.html            — บทที่ 2
├── resistor.html       — บทที่ 3: รหัสสี 4 แถบ + 5 แถบ (ตารางครบทั้งคู่)
├── capacitor.html      — บทที่ 4
├── inductor.html       — บทที่ 5
├── multimeter.html     — บทที่ 6
├── soldering.html      — บทที่ 7
├── ac-circuit.html     — บทที่ 8
├── diode.html          — บทที่ 9: PN Junction, I-V Curve, LED Vf by color, Rectifier Circuit
├── home-wiring.html    — บทเสริม: ระบบ L/N/G, แรงดันลอย (Ghost Voltage), ไฟรั่วจริง, Socket Tester, ความปลอดภัย
├── oscilloscope.html   — บทที่ 10: โครงสร้าง CRT, การอ่านค่า, สูตร T/f/Vpp, ตัวอย่าง 3 โจทย์, บท 6-4 วงจร Octopus (Curve Tracer) + Interactive I-V Curve Simulator (canvas, 11 อุปกรณ์)
├── signal-generator.html — บทที่ 11: คลื่น 4 แบบ, โครงสร้าง 7 ส่วน, ตัวอย่างการใช้งาน
├── simulation.html     — จำลองวงจร 3 แบบ (Series/Parallel/Mixed) + วิธีคำนวณ real-time + LED toggle
├── formulas.html       — สูตรสรุป + print-friendly
├── tools.html          — เครื่องคิดเลข 7 ตัว (4-band + 5-band มีชื่อไทย-อังกฤษครบ)
├── quiz.html           — แบบทดสอบ 77 ข้อ 12 หมวด — มีข้อสอบ EN ครบทุกข้อ
├── downloads.html      — ดาวน์โหลด PDF 29 ไฟล์
└── pdf/                — ไฟล์ PDF ภาษาไทย (~24 MB)
```

## กฎสำคัญ

### แต่ละหน้า HTML ต้องมี (ก่อน nav.js เสมอ)
```html
<html lang="th" data-title-th="ชื่อหน้า TH" data-title-en="Page Title EN">
<head>
  ...
  <title>...</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
  <!-- lang detect: ต้องอยู่ก่อน CSS ใดๆ -->
  <script>!function(){var l=localStorage.getItem('lang');if(l==='en')document.documentElement.lang='en'}()</script>
  ...
</head>
<body>
  <div id="nav-placeholder"></div>
  ...
  <script>const CURRENT_PAGE='id';</script>
  <script src="nav.js"></script>
</body>
```
CURRENT_PAGE ids: `home`, `electricity`, `ohm`, `resistor`, `capacitor`, `inductor`, `multimeter`, `soldering`, `ac-circuit`, `diode`, `home-wiring`, `oscilloscope`, `signal-generator`, `simulation`, `formulas`, `tools`, `quiz`, `downloads`

### ระบบ 2 ภาษา (Bilingual System)
- CSS ใน style.css:
  ```css
  html[lang="en"] .th-only { display: none !important; }
  html:not([lang="en"]) .en-only { display: none !important; }
  ```
- เนื้อหา Thai ห่อด้วย `class="th-only"`, เนื้อหา English ห่อด้วย `class="en-only"`
- ทั้ง block-level (`<h1>`, `<p>`, `<ul>`) และ inline (`<span>`) ใช้ได้
- nav.js จัดการ TH/EN toggle + บันทึกใน localStorage key `lang`
- nav.js dispatch `CustomEvent('langchange')` ทุกครั้งที่เปลี่ยนภาษา
- **quiz.html** ใช้ `QUIZ_CATEGORIES_TH` / `QUIZ_CATEGORIES_EN` แยกกัน, `getCurLang()` เลือก dataset ที่ถูกต้อง และ listen `langchange` event เพื่อ re-init category menu
- title ของแต่ละหน้าเปลี่ยนตามภาษาผ่าน `data-title-th` / `data-title-en` บน `<html>`
- **หมายเหตุ:** `<span>` ใน `<option>` ของ `<select>` ไม่ถูก CSS hide — browser แสดงข้อความทั้งหมด ดังนั้น option ควรเขียนเป็น `0 — <span class="th-only">ดำ</span> Black` เพื่อให้แสดงทั้งไทย-อังกฤษเสมอ

### Navigation (nav.js)
- NAV_CONTENT (11 บทเรียน: electricity → signal-generator) → รวมในปุ่ม dropdown "บทเรียน ▼" / "Lessons ▼"
- NAV_TOOLS (simulation, formulas, tools) → dropdown "เครื่องมือ ▼" / "Tools ▼"
- NAV_EXTRA (home-wiring เท่านั้น) → dropdown "บทเสริม ▼" / "Extra ▼"
- NAV_DIRECT (quiz, downloads) → แสดงตรงๆ ใน nav bar
- Dark mode: `[data-theme="dark"]` บน `<html>`, บันทึกใน localStorage key `theme`
- Lang toggle: ปุ่ม TH / EN ใน nav bar ทุกหน้า
- **Back-to-top button:** inject `<button id="back-to-top">` เข้า body อัตโนมัติ — ปรากฏเมื่อ scroll > 320px

> **กฎ:** เมื่อเพิ่มหน้าใหม่ใน nav.js (NAV_CONTENT / NAV_EXTRA / NAV_TOOLS) ต้องอัปเดต **index.html** ด้วยเสมอ — เพิ่ม card ในกลุ่มที่ตรงกัน และแก้จำนวนไฟล์/หัวข้อใน footer กับ card ดาวน์โหลด

### CSS (style.css)
- Color palette: `--primary: #2563eb`, `--accent: #06b6d4`, `--secondary: #10b981`, `--bg: #f8fafc`
- ใช้ CSS custom properties: `--primary`, `--primary-dark`, `--accent`, `--bg`, `--card`, `--text`, `--border`, `--shadow`, `--shadow-hover`, `--radius`
- Dark mode override ด้วย `[data-theme="dark"] { ... }`
- Print styles อยู่ใน `@media print` — ซ่อน `.print-hide`, แสดง `.print-sheet-header`
- Responsive breakpoints: 768px (hamburger), 640px (font size)
- Smooth scroll: `html { scroll-behavior: smooth; }`
- **Topic card color accents:** `.topic-card-blue` (บทเรียน), `.topic-card-teal` (เครื่องมือ), `.topic-card-orange` (quiz), `.topic-card-green` (downloads) — border-top 4px

### หน้าหลัก index.html — โครงสร้าง 4 กลุ่ม
| กลุ่ม | หน้า | สี card |
|---|---|---|
| 📚 บทเรียน | electricity → signal-generator (11 หน้า) | `topic-card-blue` |
| 🛠 เครื่องมือช่วยเรียน | simulation, formulas, tools | `topic-card-teal` |
| 📖 บทเสริม | home-wiring | `topic-card-teal` |
| 📋 ทดสอบ & ดาวน์โหลด | quiz, downloads | `topic-card-orange` / `topic-card-green` |

### Deploy
```bash
git add <files>
git commit -m "message"
git push
```
GitHub Pages อัปเดตภายใน ~30 วินาที

## เนื้อหาเครื่องคิดเลข (tools.js)
| ฟังก์ชัน | คำอธิบาย |
|---|---|
| `calcR4()` | Resistor 4-band color → value |
| `calcR5()` | Resistor 5-band color → value |
| `calcReverse()` | Resistor value → color bands |
| `calcOhm()` | Ohm's Law (V/I/R) |
| `calcPower()` | Power calculator (P/V/I/R) |
| `calcEnergy()` | Energy W = P × t |
| `calcRS()` / `calcRP()` | Series/Parallel resistors |
| `calcCS()` / `calcCP()` | Series/Parallel capacitors |
| `calcUnit()` | Unit converter |

## Quiz Data Structure (quiz.html)
```js
// สองชุดข้อมูลแยกกัน
const QUIZ_CATEGORIES_TH = [ { id, icon, name, questions:[{q, opts, ans, exp}] } ]
const QUIZ_CATEGORIES_EN = [ { id, icon, name, questions:[{q, opts, ans, exp}] } ]

// helpers
getCurLang()   // returns 'th' | 'en'
getQuizData()  // returns TH or EN dataset based on current lang
```
- `ans` คือ index (0-based) ของตัวเลือกที่ถูกต้อง
- เมื่อเปลี่ยนภาษาระหว่างดูเมนู → re-init อัตโนมัติ
- เมื่อเปลี่ยนภาษาระหว่างทำข้อสอบ → คำถามชุดเดิมจะเล่นต่อจนจบ (ไม่ reset กลางคัน)
