# Prompt: สร้างเว็บสื่อการสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์ (Thai Electronics Education Website)

> Copy prompt นี้ไปใช้กับ AI (Claude, ChatGPT, Gemini ฯลฯ) เพื่อสร้างเว็บไซต์ลักษณะเดียวกัน

---

## Prompt หลัก

```
สร้าง static multi-page website สำหรับสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์ ภาษาไทย/อังกฤษ (bilingual)
โดยใช้ Vanilla HTML / CSS / JavaScript เท่านั้น ไม่ใช้ framework ใดๆ

--- โครงสร้างไฟล์ ---

ให้สร้างไฟล์ต่อไปนี้ทั้งหมดในโฟลเดอร์เดียว:

style.css      — shared CSS ทุกหน้า
nav.js         — inject nav bar + dark mode + hamburger + TH/EN toggle
tools.js       — logic เครื่องคิดเลข
index.html     — หน้าหลัก
electricity.html
ohm.html
resistor.html
capacitor.html
inductor.html
multimeter.html
soldering.html
ac-circuit.html
simulation.html
formulas.html
tools.html
quiz.html
downloads.html

--- Stack & Design ---

- Font: Anuphan (Google Fonts, wght 300–700)
- Color scheme: CSS custom properties --primary, --bg, --card, --text, --border, --shadow
- Dark mode: toggle ผ่าน nav bar, บันทึกใน localStorage key "theme", ใช้ attribute [data-theme="dark"] บน <html>
- Responsive: breakpoint 768px (hamburger menu), 640px (font size)
- Print-friendly: @media print ซ่อน .print-hide, แสดง .print-sheet-header

--- ระบบ 2 ภาษา (Bilingual System) ---

CSS rules (ต้องมีใน style.css):
  html[lang="en"] .th-only { display: none !important; }
  html:not([lang="en"]) .en-only { display: none !important; }

ทุกเนื้อหาภาษาไทยใช้ class="th-only"
ทุกเนื้อหาภาษาอังกฤษใช้ class="en-only"
ใช้ได้ทั้ง block-level (<h1>, <p>, <ul>) และ inline (<span>)

nav.js ต้อง:
- inject nav bar เข้า <div id="nav-placeholder">
- มีปุ่ม TH / EN toggle บันทึกใน localStorage key "lang"
- dispatch CustomEvent("langchange") ทุกครั้งที่เปลี่ยนภาษา
- เปลี่ยน document.title ตาม data-title-th / data-title-en บน <html>

--- Template ทุกหน้า HTML ---

แต่ละหน้าต้องเริ่มด้วยโครงสร้างนี้เสมอ:

<!DOCTYPE html>
<html lang="th" data-title-th="ชื่อหน้า TH" data-title-en="Page Title EN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ชื่อหน้า TH</title>
  <!-- lang detect: ต้องอยู่ก่อน CSS ใดๆ เพื่อป้องกัน flash -->
  <script>!function(){var l=localStorage.getItem('lang');if(l==='en')document.documentElement.lang='en'}()</script>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anuphan:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="nav-placeholder"></div>

  <!-- เนื้อหาหน้า -->

  <script>const CURRENT_PAGE='[id]';</script>
  <script src="nav.js"></script>
</body>
</html>

CURRENT_PAGE ids: home, electricity, ohm, resistor, capacitor, inductor,
multimeter, soldering, ac-circuit, simulation, formulas, tools, quiz, downloads

--- Navigation (nav.js) ---

NAV_CONTENT (บทเรียน 7 บท) → รวมในปุ่ม dropdown "บทเรียน ▼" / "Lessons ▼":
  ⚡ แหล่งกำเนิดไฟฟ้า / Electricity Sources → electricity.html
  🔢 กฎของโอห์ม / Ohm's Law → ohm.html
  🎨 ตัวต้านทาน / Resistor → resistor.html
  🔋 ตัวเก็บประจุ / Capacitor → capacitor.html
  🌀 ตัวเหนี่ยวนำ / Inductor → inductor.html
  📏 เครื่องมือวัด / Multimeter → multimeter.html
  🔥 การบัดกรี / Soldering → soldering.html

NAV_UTILS (แสดงตรงๆ ใน nav bar):
  สูตร / Formulas → formulas.html
  เครื่องคิดเลข / Tools → tools.html
  แบบทดสอบ / Quiz → quiz.html
  ดาวน์โหลด / Downloads → downloads.html

--- เนื้อหาบทเรียน ---

บทที่ 1 – electricity.html: แหล่งกำเนิดไฟฟ้า 6 ประเภท, โครงสร้างอะตอม, ไฟฟ้า DC/AC
บทที่ 2 – ohm.html: กฎของโอห์ม I=E/R, กำลัง P=EI, พลังงาน W=Pt, การแปลงหน่วย
บทที่ 3 – resistor.html: รหัสสี 4 แถบ, 5 แถบ, EIA96, ต่ออนุกรม/ขนาน
บทที่ 4 – capacitor.html: ชนิด, การอ่านค่า pF/nF/μF, อนุกรม/ขนาน
บทที่ 5 – inductor.html: Inductor, Transformer, หน่วย H/mH/μH
บทที่ 6 – multimeter.html: Multimeter แบบอนาล็อกและดิจิตัล, DCV/ACV/Ω
บทที่ 7 – soldering.html: เครื่องมือบัดกรี, 4 ขั้นตอน, รอยบัดกรีที่ดี
บทที่ 8 – ac-circuit.html: วงจร AC, Impedance, Phase, Power Factor

--- simulation.html: จำลองวงจร ---

มี 3 แท็บ: Series (อนุกรม) | Parallel (ขนาน) | Mixed (ผสม)

แต่ละแท็บมี:
1. SVG วงจรแบบ interactive แสดงแรงดันแต่ละตัว (ปรับขนาด auto ตาม resistance)
2. Slider ปรับค่า: แรงดัน (V) + ความต้านทาน R1, R2, R3
3. ผลลัพธ์ real-time: Rtotal, I, V1, V2, V3, P1, P2, P3, Ptotal
4. วิธีคำนวณทีละขั้นตอน แบบ step-by-step พร้อมค่าตัวเลขจริง

SVG ต้องแสดง:
- แบตเตอรี/แหล่งจ่ายไฟ
- ตัวต้านทานระบายสีตาม ratio แรงดัน (สีร้อน–เย็น)
- Ammeter แสดงกระแสไฟ
- label ค่า V และ R บนแต่ละตัวต้านทาน

--- tools.html: เครื่องคิดเลข 7 ตัว ---

ฟังก์ชันทั้งหมดอยู่ใน tools.js:

calcR4()       — Resistor 4-band color code → ค่าความต้านทาน + tolerance
calcR5()       — Resistor 5-band color code → ค่าความต้านทาน + tolerance
calcReverse()  — ค่าความต้านทาน → สีแถบ 4/5 แถบ
calcOhm()      — Ohm's Law: กรอก 2 ใน 3 (V/I/R) → คำนวณตัวที่ 3
calcPower()    — Power: กรอก 2 ใน 4 (P/V/I/R) → คำนวณที่เหลือ
calcEnergy()   — W = P × t
calcRS()       — ต่อต้านทานอนุกรม (Series) รับได้ไม่จำกัดตัว
calcRP()       — ต่อต้านทานขนาน (Parallel) รับได้ไม่จำกัดตัว
calcCS()       — ต่อ capacitor อนุกรม
calcCP()       — ต่อ capacitor ขนาน
calcUnit()     — แปลงหน่วย (V, A, Ω, F, H, W, Hz)

แสดงผลพร้อม unit ที่เหมาะสม (kΩ, MΩ, mA, μA, mW, kW ฯลฯ)

--- quiz.html: แบบทดสอบ ---

โครงสร้างข้อมูล:
const QUIZ_CATEGORIES_TH = [
  {
    id: "electricity",
    icon: "⚡",
    name: "แหล่งกำเนิดไฟฟ้า",
    questions: [
      { q: "คำถาม?", opts: ["ก", "ข", "ค", "ง"], ans: 0, exp: "คำอธิบาย" }
    ]
  },
  ...
]
const QUIZ_CATEGORIES_EN = [ /* โครงสร้างเดียวกัน แต่เป็นภาษาอังกฤษ */ ]

กฎ:
- ans คือ index 0-based ของตัวเลือกที่ถูก
- getCurLang() → 'th' | 'en'
- getQuizData() → เลือก dataset ตาม lang ปัจจุบัน
- listen langchange event → re-init category menu อัตโนมัติ
- เมื่อเปลี่ยนภาษาระหว่างทำ quiz → เล่นต่อจนจบ ไม่ reset กลางคัน

7 หมวด ได้แก่: electricity, ohm, resistor, capacitor, inductor, multimeter, soldering
แต่ละหมวดมี 5-10 ข้อ, รวมทั้งหมดประมาณ 50 ข้อ

แสดงผลคะแนน + คำอธิบายทุกข้อหลังทำเสร็จ

--- formulas.html: สูตรสรุป ---

แสดงสูตรทุกบทในรูปแบบการ์ด เรียงตามบท
มีปุ่ม Print / พิมพ์ ที่ซ่อน nav และปุ่มพิมพ์ + แสดง header สำหรับกระดาษ

--- downloads.html: ดาวน์โหลด ---

ลิสต์ไฟล์ PDF พร้อมปุ่ม download แต่ละไฟล์
จัดกลุ่มตามบท มีชื่อไทย/อังกฤษ

--- Style Guidelines ---

ใช้ CSS custom properties:
  :root {
    --primary: #6366f1;
    --secondary: #10b981;
    --bg: #f8fafc;
    --card: #ffffff;
    --text: #1e293b;
    --text-light: #64748b;
    --border: #e2e8f0;
    --shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  [data-theme="dark"] {
    --bg: #0f172a;
    --card: #1e293b;
    --text: #e2e8f0;
    --text-light: #94a3b8;
    --border: #334155;
  }

Component classes: .container, .card, .btn, .btn-primary, .section,
.section-title, .grid-3, .grid-2, .topic-card, .hero, .table-wrap

--- สิ่งที่ต้องทำให้ครบ ---

✅ ทุกหน้ามี bilingual content (th-only / en-only) ครบถ้วน
✅ Dark mode ทำงานได้ทุกหน้า
✅ Hamburger menu ใน mobile
✅ เครื่องคิดเลขทุกตัวทำงานแบบ real-time (ไม่ต้องกดปุ่ม calculate)
✅ SVG วงจรใน simulation.html อัปเดต real-time ตาม slider
✅ Quiz บันทึก high score ใน localStorage
✅ Print stylesheet ใน formulas.html
✅ ทุกหน้า responsive บน mobile
```

---

## Prompt เพิ่มเติม (ใช้ต่อจาก prompt หลัก)

### เพิ่มบทเรียนใหม่

```
เพิ่มบทเรียนใหม่ในไฟล์ [ชื่อ].html ตามโครงสร้างเดิม:
- ใช้ template HTML มาตรฐาน (lang detect script + nav placeholder + CURRENT_PAGE)
- เนื้อหาทุกส่วนต้องมีทั้ง .th-only และ .en-only
- เพิ่ม CURRENT_PAGE id ใหม่ใน nav.js
- เพิ่มลิงก์ใน NAV_CONTENT ของ nav.js
- เพิ่มการ์ดลิงก์ใน index.html

หัวข้อ: [ระบุหัวข้อ]
เนื้อหาหลัก: [ระบุเนื้อหา]
```

### เพิ่มเครื่องคิดเลขใหม่

```
เพิ่มเครื่องคิดเลขใหม่ใน tools.js และ tools.html:
- ฟังก์ชันชื่อ calc[Name]() ใน tools.js
- UI ใน tools.html: input fields + ผลลัพธ์ real-time
- มีทั้งชื่อ/label ภาษาไทย (.th-only) และอังกฤษ (.en-only)
- แสดง unit ที่เหมาะสมในผลลัพธ์

เครื่องคิดเลข: [ระบุว่าคำนวณอะไร]
สูตร: [ระบุสูตร]
Input: [ระบุ inputs]
Output: [ระบุ outputs]
```

### เพิ่มข้อสอบ

```
เพิ่มข้อสอบในหมวด [หมวด] ของ quiz.html
ทำทั้ง 2 ชุด: QUIZ_CATEGORIES_TH และ QUIZ_CATEGORIES_EN

format:
{ q: "คำถาม?", opts: ["ก", "ข", "ค", "ง"], ans: [index 0-based], exp: "คำอธิบายว่าทำไมถึงถูก" }

เพิ่ม [N] ข้อ เกี่ยวกับ: [ระบุหัวข้อ]
```

### ปรับแต่ง simulation

```
ปรับปรุง simulation.html:
[ระบุสิ่งที่ต้องการเปลี่ยน เช่น:]
- เพิ่มแท็บวงจรแบบ [ชื่อ]
- เพิ่มการแสดงกราฟ Power distribution
- เพิ่ม slider ปรับจำนวนตัวต้านทาน
- เพิ่มแอนิเมชันกระแสไฟ
```

---

## หมายเหตุสำหรับผู้ใช้ Prompt

- **AI ที่แนะนำ**: Claude (claude.ai) หรือ Claude Code CLI — เข้าใจ context ยาวได้ดี
- **วิธีใช้**: Copy prompt หลักทั้งหมด → วาง → รอ AI สร้างไฟล์ทีละไฟล์
- **Deploy**: GitHub Pages รองรับ static files ตรงๆ ไม่ต้อง build
- **ขนาดโปรเจกต์**: ไม่รวม PDF ประมาณ 200–400 KB
- **Browser support**: ทุก modern browser (Chrome, Firefox, Safari, Edge)
