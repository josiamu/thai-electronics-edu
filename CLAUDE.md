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
├── nav.js           — inject nav bar + dark mode toggle + hamburger + language toggle
├── tools.js         — logic เครื่องคิดเลขทุกตัว (calcR4, calcR5, calcOhm, ...)
├── index.html       — หน้าหลัก (CURRENT_PAGE='home')
├── electricity.html — บทที่ 1
├── ohm.html         — บทที่ 2
├── resistor.html    — บทที่ 3
├── capacitor.html   — บทที่ 4
├── inductor.html    — บทที่ 5
├── multimeter.html  — บทที่ 6
├── soldering.html   — บทที่ 7
├── ac-circuit.html  — บทที่ 8
├── simulation.html  — จำลองวงจร (Ohm's Law + Series, interactive animation)
├── formulas.html    — สูตรสรุป + print-friendly
├── tools.html       — เครื่องคิดเลข 7 ตัว
├── quiz.html        — แบบทดสอบ 50 ข้อ 7 หมวด — มีข้อสอบ EN ครบทุกข้อ
├── downloads.html   — ดาวน์โหลด PDF 21 ไฟล์
└── pdf/             — ไฟล์ PDF ภาษาไทย (~24 MB)
```

## กฎสำคัญ

### แต่ละหน้า HTML ต้องมี (ก่อน nav.js เสมอ)
```html
<html lang="th" data-title-th="ชื่อหน้า TH" data-title-en="Page Title EN">
<head>
  ...
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
CURRENT_PAGE ids: `home`, `electricity`, `ohm`, `resistor`, `capacitor`, `inductor`, `multimeter`, `soldering`, `ac-circuit`, `simulation`, `formulas`, `tools`, `quiz`, `downloads`

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

### Navigation (nav.js)
- NAV_CONTENT (7 บทเรียน) → รวมในปุ่ม dropdown "บทเรียน ▼" / "Lessons ▼"
- NAV_UTILS (formulas, tools, quiz, downloads) → แสดงตรงๆ ใน nav bar
- Dark mode: `[data-theme="dark"]` บน `<html>`, บันทึกใน localStorage key `theme`
- Lang toggle: ปุ่ม TH / EN ใน nav bar ทุกหน้า

### CSS (style.css)
- ใช้ CSS custom properties: `--primary`, `--bg`, `--card`, `--text`, `--border`, `--shadow`
- Dark mode override ด้วย `[data-theme="dark"] { ... }`
- Print styles อยู่ใน `@media print` — ซ่อน `.print-hide`, แสดง `.print-sheet-header`
- Responsive breakpoints: 768px (hamburger), 640px (font size)

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
