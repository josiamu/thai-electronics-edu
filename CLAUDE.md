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
├── nav.js           — inject nav bar + dark mode toggle + hamburger + language toggle + back-to-top button + footer license line (CC BY-NC 4.0, bilingual, ต่อท้าย <footer> ทุกหน้า)
├── tools.js         — logic เครื่องคิดเลขทุกตัว (calcR4, calcR5, calcOhm, ...)
├── quiz.js          — ข้อมูลข้อสอบ + logic แบบทดสอบ
├── downloads.js     — PDF preview modal + download interactions + ตัวกรองหน้า downloads (ช่องค้นหา #dl-search ค้นทั้งไทย-อังกฤษ + ชิปกรองหมวด #dl-chips ตาม .section[data-cat], ซ่อนด้วย .dl-hidden, แสดง #dl-noresult เมื่อไม่พบ, placeholder เปลี่ยนตามภาษา)
├── oscilloscope.js  — Interactive I-V Curve Simulator
├── osc-reader.js    — Interactive Scope Reading Trainer (canvas, V/div & T/div sliders, AUTOSET/randomize, auto Vp/Vrms/T/f)
├── transistor-sim.js — Interactive BJT switch simulator (canvas, IB & β sliders → Cut-off/Active/Saturation + LED glow)
├── signal-gen-sim.js — Interactive Waveform Generator (canvas, sine/square/triangle/sawtooth + freq/amp/duty/offset)
├── breadboard.js    — Interactive Breadboard Lab (SVG, toolbar: dropdown "เพิ่มอุปกรณ์" (battery/R/diode+LED/wire/switch/cap/ind) + ปุ่มมัลติมิเตอร์/ลบ/สุ่มตัวอย่าง (EXAMPLES 7 วงจร, กดแล้วสุ่มไม่ซ้ำตัวเดิม)/ล้าง/บันทึก-โหลด (modal + localStorage key `bb-saves`)/แชร์ลิงก์ (serializeCircuit → base64url ใน `?c=`, โหลดอัตโนมัติด้วย loadFromURL ตอน init), วางอุปกรณ์ R/VR/NTC/PTC/LDR/VDR/diode(silicon/germanium/schottky/zener)/LED/wire/switch/battery/capacitor/inductor เอง — ไดโอดกับ LED รวมเป็น list เดียว (เลือกชนิดในแผงค่า: silicon/germanium/schottky/zener+Vz/LED+สี), union-find + MNA solver + iterative diode/zener-reverse/VDR + transient (Backward-Euler companion สำหรับ C/L, เดินเวลาในลูป animation, กราฟ mini-scope V/I + speed 🐢/▶/⏩ + restart + τ), switch (ปิด=jumper/เปิด=ตัดวงจร; วาดเป็น slide switch — ตัวเรือนเขียว/เทา + ปุ่มเลื่อนซ้าย ON/ขวา OFF), ความสว่าง LED แปรตามกระแส (results.bright ≈ √(I/12mA), updateLeds() หรี่ glow/สีทุกเฟรม transient → ตัวเก็บประจุคายประจุแล้ว LED ค่อยๆ จาง), ตัวต้านทานคงที่วาดแถบสี 5 แถบจริง (bands5/bandColor/multColor → 3 หลัก+ตัวคูณ+tolerance น้ำตาล 1%, body เบจ + ป้ายค่า; VR/NTC/PTC/LDR/VDR ยังใช้แท่ง heat+accent), Environment panel (temp/light/VR knob), คลิกอุปกรณ์เพื่อแก้ไข (ค่า/สี/Vc/สลับขั้ว/toggle/ลบ), ลาก-ย้ายอุปกรณ์ (pointer + snap), electron animation, มัลติมิเตอร์เสมือน 5 โหมด V/I/Ω/diode-test/continuity (probeCtx จาก solver, คลิกอุปกรณ์/คลิกรู 2 จุด, จอ LCD + หัวโพรบ + เสียงปี๊บ continuity, diode test อ่าน Vf/คลิกซ้ำกลับขั้ว→OL + LED เรืองแสง))
├── simulation.js    — logic จำลองวงจรและ animation
├── capacitor-sim.js — Interactive RC charge/discharge (canvas, R & C sliders → exponential curve, 63.2%@1τ marker, charge/discharge mode, live τ/5τ/Vc/% readout, normalized 0–5τ x-axis)
├── power-supply-sim.js — Interactive Power Supply (canvas scope, half/full-wave rectifier + filter C slider + load + 7805 regulator toggle, ripple shrinks with C, constant-current cap discharge sim, traces: pulsating DC/filtered/regulated)
├── 555-sim.js       — Interactive 555 Astable (canvas, R1/R2/C sliders → real f/T/Duty, draws Vcap charge/discharge between ⅓–⅔Vcc + output square wave, blinking LED in step with output, Vcc=5V, visual sweep = CYCLES periods)
├── opamp-sim.js     — Interactive Op-Amp amplifier (canvas, mode inverting/non-inverting + Rin/Rf/Vin sliders → closed-loop gain, draws input sine + amplified output clipped at ±Vsat=12V, readouts gain/Vout/clip)
├── logic-sim.js     — Interactive Logic Gate (canvas, <select> gate + toggle A/B buttons → draws gate symbol w/ state-coloured wires + output LED, builds & highlights truth table; listens to langchange)
├── announcements.js — กล่อง "ข่าวสาร/อัปเดตล่าสุด" บนหน้าแรก (data-driven: array ANNOUNCEMENTS {id,date,type:lesson/download/update,th,en,href} → render เข้า #announcements ใน index.html, bilingual th-only/en-only, ป้าย "ใหม่" เมื่อ date ≤30 วัน, ปิดได้รายอัน เก็บใน localStorage key `ann-dismissed`)
├── index.html          — หน้าหลัก (CURRENT_PAGE='home') — กลุ่มตรงกับ navbar: บทเรียน / งานปฏิบัติ / เครื่องมือ / คลังการเรียนรู้ + กล่องข่าวสาร (#announcements → announcements.js)
├── electricity.html    — บทที่ 1
├── ohm.html            — บทที่ 2
├── resistor.html       — บทที่ 3: รหัสสี 4 แถบ + 5 แถบ (ตารางครบทั้งคู่)
├── capacitor.html      — บทที่ 4: ชนิด, Q=CV+พลังงาน, RC time constant, อ่านรหัส, tolerance/voltage, อนุกรม/ขนาน + Interactive RC charge/discharge sim (canvas)
├── inductor.html       — บทที่ 5
├── power-supply.html   — แหล่งจ่ายไฟ: 4 ขั้น (หม้อแปลง→เรียงกระแส→กรอง→เรกูเลต), block diagram, สูตร ripple, 78xx/zener, linear vs switching, safety + Interactive Power Supply sim (canvas)
├── multimeter.html     — บทที่ 6
├── soldering.html      — บทที่ 7
├── ac-circuit.html     — บทที่ 8
├── diode.html          — บทที่ 9: PN Junction, I-V Curve, LED Vf by color, Rectifier Circuit
├── transistor.html     — BJT (NPN/PNP) + MOSFET: สัญลักษณ์, 3 ย่าน (Cut-off/Active/Saturation), สูตร β/IC/IE, เช็คด้วยมัลติมิเตอร์, เบอร์ยอดนิยม + Interactive BJT switch simulator (canvas)
├── ic.html             — IC วงจรรวมเบื้องต้น: IC คืออะไร/ทำไมต้องรวม, ระดับการรวม (SSI→VLSI), แพ็กเกจ (DIP/SOIC/QFP/BGA), นับขา+หา Pin 1 (notch/dot, SVG DIP-8), อนาล็อก vs ดิจิทัล vs mixed-signal, อ่าน datasheet, IC ยอดนิยม (555/op-amp/7805/74xx/ATmega), ESD/การจับ (SVG, ไม่มี sim)
├── 555.html            — IC ตั้งเวลา 555: คืออะไร+ทำไมชื่อ 555, ขา 8 ขา (SVG DIP-8 pinout), โหมด Astable vs Monostable, สูตร t_HIGH/t_LOW/f/Duty (astable) + T=1.1RC (monostable), การใช้งาน, ทิป (RESET→Vcc, CTRL 10nF) + Interactive Astable sim (canvas)
├── op-amp.html         — ออปแอมป์: สัญลักษณ์ +/− (SVG), กฎทอง (V+=V−, ไม่มีกระแสเข้าขา), comparator (open loop), inverting (−Rf/Rin) / non-inverting (1+Rf/Rin) / buffer + วงจร SVG, ใช้งานจริง, เบอร์ยอดนิยม (741/LM358/LM324/TL07x) + ทิป (dual/single supply, rail-to-rail, slew) + Interactive amplifier sim (canvas, gain+clipping)
├── logic-gates.html    — ลอจิกเกต: ดิจิทัล 0/1 (LOW/HIGH), 7 เกต (AND/OR/NOT/NAND/NOR/XOR/XNOR) + นิพจน์บูลีน + ตารางความจริงรวม, universal gates (NAND/NOR) + De Morgan, IC 74xx (7408/7432/7404/7400/7486)/CMOS + ทิป (logic levels, ห้ามอินพุตลอย, decoupling) + Interactive gate sim (canvas)
├── relay.html          — รีเลย์: โครงสร้าง (coil/armature/spring), COM/NO/NC, Pole&Throw (SPST/SPDT/DPDT), สเปค (coil V/R, contact rating), ชนิด (EMR/Reed/SSR/รถยนต์), วงจรขับด้วยทรานซิสเตอร์ + flyback diode, หาขา/เช็คด้วยมัลติมิเตอร์, ความปลอดภัย (SVG diagrams, ไม่มี sim)
├── home-wiring.html    — บทเสริม: ระบบ L/N/G, แรงดันลอย (Ghost Voltage), ไฟรั่วจริง, Socket Tester, ความปลอดภัย
├── oscilloscope.html   — บทที่ 10: โครงสร้าง CRT, เทคนิคสำคัญ (Trigger/Probe ×1×10/Coupling), สูตร T/f/Vpp/Duty, ตัวอย่าง 4 โจทย์, Interactive Scope Reading Trainer (canvas), วงจร Octopus (Curve Tracer) + Interactive I-V Curve Simulator (canvas, 11 อุปกรณ์)
├── signal-generator.html — บทที่ 11: คลื่น 4 แบบ, โครงสร้าง 7 ส่วน, พารามิเตอร์สำคัญ (f/T, Vpp/Vp/Vrms, Duty, Offset) + Interactive Waveform Generator (canvas)
├── simulation.html     — จำลองวงจร 3 แบบ (Series/Parallel/Mixed) + วิธีคำนวณ real-time + LED toggle
├── breadboard.html     — ทดลองบนเบรดบอร์ด (400-point): เลือก/วางอุปกรณ์ R (คงที่/VR/NTC/PTC/LDR/VDR)/ไดโอด+LED (ซิลิคอน/เจอร์เมเนียม/ชอตต์กี/ซีเนอร์/LED รวมเป็น list เดียว)/จัมเปอร์/สวิตช์/แบตเตอรี่/ตัวเก็บประจุ/ตัวเหนี่ยวนำเอง, มัลติมิเตอร์เสมือน (V/I/Ω/diode-test/continuity), แผงสภาพแวดล้อม (อุณหภูมิ/แสง/VR knob), แผง Transient (กราฟ V/I ตามเวลา + speed + restart + τ), คลิกแก้ไข + ลาก-ย้ายอุปกรณ์, คำนวณวงจรจริง (MNA + transient), LED ติด/ดับ, electron animation, บันทึก/โหลดวงจร (localStorage) + แชร์ลิงก์ (URL `?c=`)
├── formulas.html       — สูตรสรุป + print-friendly
├── tools.html          — เครื่องคิดเลข 7 ตัว (4-band + 5-band มีชื่อไทย-อังกฤษครบ)
├── quiz.html           — แบบทดสอบ 77 ข้อ 12 หมวด — มีข้อสอบ EN ครบทุกข้อ
├── downloads.html      — ดาวน์โหลด PDF 30 ไฟล์ (มีหัวข้อ "ใบงาน" → pdf/worksheet/) + toolbar ค้นหา/กรองหมวด (sticky: #dl-search + #dl-chips, sections มี data-cat)
├── pdf/                — ไฟล์ PDF ภาษาไทย (~24 MB) — สื่อจากหลายแหล่ง ไม่อยู่ใต้ CC (ดู LICENSE)
└── LICENSE             — CC BY-NC 4.0 (คลุมเฉพาะเนื้อหา/โค้ดต้นฉบับ; PDF แยกออกตาม NOTICE ในไฟล์)
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
CURRENT_PAGE ids: `home`, `electricity`, `ohm`, `resistor`, `diode`, `transistor`, `ic`, `timer555`, `opamp`, `logic`, `relay`, `capacitor`, `inductor`, `power-supply`, `multimeter`, `soldering`, `home-wiring`, `oscilloscope`, `signal-generator`, `simulation`, `breadboard`, `formulas`, `tools`, `quiz`, `downloads`

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
- NAV_LESSON_GROUPS → mega menu "บทเรียน / Lessons" แบ่ง 4 กลุ่ม: พื้นฐานไฟฟ้า, อุปกรณ์อิเล็กทรอนิกส์, วงจรรวมและดิจิทัล (ic/timer555/opamp/logic), เครื่องมือวัดและทดสอบ
- บน desktop แสดง mega menu 4 คอลัมน์ (`.nav-mega-menu` ใน style.css = `repeat(4,...)` width 900px); บน mobile กลุ่มบทเรียนเป็น accordion เปิดทีละกลุ่ม
- NAV_PRACTICE (soldering, home-wiring) → dropdown "งานปฏิบัติ / Practical"
- NAV_TOOLS (simulation, breadboard, formulas, tools) → dropdown "เครื่องมือ ▼" / "Tools ▼"
- NAV_RESOURCES (quiz, downloads) → dropdown "คลังการเรียนรู้ / Resources"
- Dark mode: `[data-theme="dark"]` บน `<html>`, บันทึกใน localStorage key `theme`
- Lang toggle: ปุ่ม TH / EN ใน nav bar ทุกหน้า
- **Back-to-top button:** inject `<button id="back-to-top">` เข้า body อัตโนมัติ — ปรากฏเมื่อ scroll > 320px
- **Footer license:** nav.js ต่อท้าย `.footer-license` (ลิงก์ CC BY-NC 4.0, bilingual th-only/en-only) เข้า `<footer>` ทุกหน้าอัตโนมัติ — ไม่ต้องแก้ทีละไฟล์

> **กฎ:** เมื่อเพิ่มหน้าใหม่ใน nav.js (NAV_LESSON_GROUPS / NAV_PRACTICE / NAV_TOOLS) ต้องอัปเดต **index.html** ด้วยเสมอ — เพิ่ม card ในกลุ่มที่ตรงกัน และแก้จำนวนไฟล์/หัวข้อใน footer กับ card ดาวน์โหลด

### CSS (style.css)
- Color palette: `--primary: #2563eb`, `--accent: #06b6d4`, `--secondary: #10b981`, `--bg: #f8fafc`
- ใช้ CSS custom properties: `--primary`, `--primary-dark`, `--accent`, `--bg`, `--card`, `--text`, `--border`, `--shadow`, `--shadow-hover`, `--radius`
- Dark mode override ด้วย `[data-theme="dark"] { ... }`
- Print styles อยู่ใน `@media print` — ซ่อน `.print-hide`, แสดง `.print-sheet-header`
- Responsive breakpoints: 768px (hamburger), 640px (font size)
- Smooth scroll: `html { scroll-behavior: smooth; }`
- **Topic card color accents:** `.topic-card-blue` (บทเรียน), `.topic-card-teal` (เครื่องมือ), `.topic-card-orange` (quiz), `.topic-card-green` (downloads) — border-top 4px

### หน้าหลัก index.html — โครงสร้างตาม navbar
| กลุ่ม | หน้า | สี card |
|---|---|---|
| 📚 พื้นฐานไฟฟ้า | electricity, ohm, ac-circuit | `topic-card-blue` |
| 📚 อุปกรณ์อิเล็กทรอนิกส์ | resistor, diode, capacitor, transistor, inductor, relay, power-supply | `topic-card-blue` |
| 📚 วงจรรวมและดิจิทัล | ic, timer555, opamp, logic | `topic-card-blue` |
| 📚 เครื่องมือวัดและทดสอบ | multimeter, signal-generator, oscilloscope | `topic-card-blue` |
| 🧰 งานปฏิบัติ | soldering, home-wiring | `topic-card-teal` |
| 🛠 เครื่องมือ | simulation, breadboard, formulas, tools | `topic-card-teal` |
| 📚 คลังการเรียนรู้ | quiz, downloads | `topic-card-orange` / `topic-card-green` |

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
