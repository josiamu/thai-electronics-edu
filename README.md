# สื่อการเรียนการสอน วิชาไฟฟ้าและอิเล็กทรอนิกส์
### Teaching Materials: Electricity & Electronics

เว็บไซต์สื่อการเรียนการสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์ รองรับ **2 ภาษา (ไทย / English)**  
A bilingual teaching website for Electricity & Electronics — **Thai / English**

🌐 **Live Site:** https://josiamu.github.io/thai-electronics-edu/

---

## ✨ Features / ฟีเจอร์

| Feature | รายละเอียด |
|---|---|
| 🌏 **2 ภาษา** | สลับ TH ↔ EN ได้ทันทีผ่านปุ่มใน nav bar — จำการตั้งค่าไว้ |
| 🌙 **Dark Mode** | ธีมสว่าง/มืด — จำการตั้งค่าไว้ |
| 📱 **Responsive** | ใช้งานได้ทั้ง Desktop, Tablet, Mobile |
| 🔬 **เครื่องมือจำลองเชิงโต้ตอบ** | เบรดบอร์ดเสมือน, ออสซิลโลสโคป, BJT switch, เครื่องกำเนิดสัญญาณ, แหล่งจ่ายไฟ, จำลองวงจร |
| 🧮 **7 เครื่องคิดเลข** | รหัสสี, โอห์ม, กำลัง, พลังงาน, อนุกรม/ขนาน, แปลงหน่วย |
| 📝 **แบบทดสอบ 77 ข้อ** | 12 หมวด, สุ่มข้อ, บันทึกคะแนนสูงสุด — มีทั้ง TH และ EN |
| 📥 **PDF 29 ไฟล์** | ดาวน์โหลดใบเนื้อหาประกอบการเรียน |
| 🖨️ **Print-friendly** | หน้าสูตรสรุปพิมพ์ออกกระดาษ A4 ได้เลย |

---

## 📚 เนื้อหา / Content

### บทเรียน (Lessons)

**พื้นฐานไฟฟ้า / Electrical Fundamentals**
| ไทย | English | หน้า |
|---|---|---|
| แหล่งกำเนิดและประเภทไฟฟ้า | Electricity Sources & Types | `electricity.html` |
| กฎของโอห์ม กำลังและพลังงาน | Ohm's Law, Power & Energy | `ohm.html` |

**อุปกรณ์อิเล็กทรอนิกส์ / Electronic Components**
| ไทย | English | หน้า |
|---|---|---|
| ตัวต้านทาน | Resistor | `resistor.html` |
| ไดโอด | Diode | `diode.html` |
| ตัวเก็บประจุ | Capacitor | `capacitor.html` |
| ทรานซิสเตอร์ | Transistor (BJT/MOSFET) | `transistor.html` |
| ตัวเหนี่ยวนำและหม้อแปลง | Inductor & Transformer | `inductor.html` |
| รีเลย์ | Relay | `relay.html` |
| แหล่งจ่ายไฟ | Power Supply | `power-supply.html` |

**วงจรรวมและดิจิทัล / ICs & Digital**
| ไทย | English | หน้า |
|---|---|---|
| IC วงจรรวม | Integrated Circuit (IC) | `ic.html` |
| IC ตั้งเวลา 555 | 555 Timer | `555.html` |
| ออปแอมป์ | Op-Amp | `op-amp.html` |
| ลอจิกเกต | Logic Gates | `logic-gates.html` |

**เครื่องมือวัดและทดสอบ / Measurement & Testing**
| ไทย | English | หน้า |
|---|---|---|
| เครื่องมือวัดไฟฟ้า | Measuring Instruments | `multimeter.html` |
| เครื่องกำเนิดสัญญาณ | Signal Generator | `signal-generator.html` |
| ออสซิลโลสโคป | Oscilloscope | `oscilloscope.html` |

**งานปฏิบัติ / Practical**
| ไทย | English | หน้า |
|---|---|---|
| การบัดกรี | Soldering | `soldering.html` |
| ไฟบ้านและความปลอดภัย | Home Wiring & Safety | `home-wiring.html` |

### เครื่องมือ (Tools & Resources)
| หน้า | ไทย | English |
|---|---|---|
| `simulation.html` | จำลองวงจร (อนุกรม/ขนาน/ผสม) | Circuit simulator |
| `breadboard.html` | ทดลองบนเบรดบอร์ดเสมือน + มัลติมิเตอร์ | Virtual breadboard lab + multimeter |
| `formulas.html` | สูตรสรุป + พิมพ์ PDF | Formula summary + print |
| `tools.html` | เครื่องคิดเลขเชิงโต้ตอบ 7 ตัว | 7 interactive calculators |
| `quiz.html` | แบบทดสอบ 77 ข้อ 12 หมวด | 77-question quiz, 12 categories |
| `downloads.html` | ดาวน์โหลด PDF 29 ไฟล์ | Download 29 PDF files |

---

## 🗺️ Roadmap / แผนพัฒนาต่อ

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| 1 | 🔢 **Logic Gates** | บทลอจิกเกต AND/OR/NOT/NAND/NOR/XOR + ตารางความจริง พร้อม sim toggle input → LED |
| 2 | ⏱️ **555 Timer** | บทไอซี 555 โหมด astable/monostable + สูตร f และ duty พร้อม sim R/C → LED กระพริบ |
| 3 | ➕ **Op-Amp** | บทออปแอมป์ — comparator, inverting/non-inverting, buffer พร้อม sim input → output gain |
| 4 | 🎮 **Resistor Color Code Game** | เกม drill แบบเร็ว — สุ่มแถบสีให้ทายค่าความต้านทาน มีคะแนนและจับเวลา เล่นซ้ำได้ |

---

## 🛠️ Tech Stack

- **HTML / CSS / JavaScript** — Vanilla, ไม่ใช้ framework
- **Font:** [Anuphan](https://fonts.google.com/specimen/Anuphan) (Google Fonts)
- **Storage:** `localStorage` — บันทึก dark mode, ภาษา, คะแนนแบบทดสอบ
- **Hosting:** GitHub Pages (static)

---

## 🌏 ระบบ 2 ภาษา / Bilingual System

ระบบภาษาทำงานด้วย CSS class + `lang` attribute บน `<html>`:

```css
/* style.css */
html[lang="en"] .th-only { display: none !important; }
html:not([lang="en"]) .en-only { display: none !important; }
```

เนื้อหาในแต่ละหน้าเขียนทั้งสองภาษาพร้อมกัน:

```html
<h1 class="th-only">แหล่งกำเนิดและประเภทไฟฟ้า</h1>
<h1 class="en-only">Electricity Sources &amp; Types</h1>
```

**Quiz** มีข้อสอบแยกกัน 2 ชุด (`QUIZ_CATEGORIES_TH` / `QUIZ_CATEGORIES_EN`) สลับ dataset ตามภาษาที่เลือก

---

## 🧮 เครื่องคิดเลข / Calculators (`tools.js`)

| ฟังก์ชัน | คำอธิบาย |
|---|---|
| `calcR4()` | Resistor 4-band color code → ค่าความต้านทาน |
| `calcR5()` | Resistor 5-band color code → ค่าความต้านทาน |
| `calcReverse()` | ค่าความต้านทาน → รหัสสี |
| `calcOhm()` | Ohm's Law — หาค่า V, I หรือ R |
| `calcPower()` | Power calculator — หาค่า P, V, I หรือ R |
| `calcEnergy()` | พลังงาน W = P × t |
| `calcRS()` / `calcRP()` | ตัวต้านทานอนุกรม / ขนาน |
| `calcCS()` / `calcCP()` | ตัวเก็บประจุอนุกรม / ขนาน |
| `calcUnit()` | แปลงหน่วย (V, A, Ω, W, F, H) |

---

## 🚀 Deploy

เว็บนี้ deploy ผ่าน GitHub Pages จาก branch `master` อัตโนมัติ

```bash
git add .
git commit -m "your message"
git push
# GitHub Pages อัปเดตภายใน ~30 วินาที
```

---

## 📁 File Structure

```
.
├── style.css            — Global styles, dark mode, bilingual classes
├── nav.js               — Shared navigation, lang toggle, dark mode toggle
├── tools.js             — Calculator logic
├── quiz.js              — Quiz data + logic
├── downloads.js         — PDF preview modal + downloads
├── simulation.js        — Circuit simulator logic
├── oscilloscope.js      — Interactive I-V curve simulator
├── osc-reader.js        — Scope reading trainer
├── transistor-sim.js    — BJT switch simulator
├── signal-gen-sim.js    — Waveform generator
├── capacitor-sim.js     — RC charge/discharge simulator
├── power-supply-sim.js  — Power supply (AC→DC) simulator
├── 555-sim.js           — 555 astable simulator (LED blinker)
├── opamp-sim.js         — Op-amp amplifier simulator (gain + clipping)
├── logic-sim.js         — Logic-gate simulator (toggle inputs + truth table)
├── breadboard.js        — Virtual breadboard lab (MNA solver + multimeter)
├── index.html           — Home page
│   ├── electricity.html / ohm.html                 — Fundamentals
│   ├── resistor.html / diode.html / transistor.html / ic.html / 555.html / op-amp.html / logic-gates.html / relay.html
│   │   capacitor.html / inductor.html / power-supply.html   — Components
│   ├── multimeter.html / signal-generator.html / oscilloscope.html  — Measurement
│   ├── soldering.html / home-wiring.html           — Practical
│   ├── simulation.html / breadboard.html           — Interactive labs
│   └── formulas.html / tools.html / quiz.html / downloads.html      — Tools & resources
├── CLAUDE.md / AGENTS.md — Developer notes (kept in sync)
└── pdf/                 — Thai PDF learning materials (~24 MB)
```
