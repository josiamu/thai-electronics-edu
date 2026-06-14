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
| 🧮 **7 เครื่องคิดเลข** | รหัสสี, โอห์ม, กำลัง, พลังงาน, อนุกรม/ขนาน, แปลงหน่วย |
| 📝 **แบบทดสอบ 77 ข้อ** | 12 หมวด, สุ่มข้อ, บันทึกคะแนนสูงสุด — มีทั้ง TH และ EN |
| 📥 **PDF 21 ไฟล์** | ดาวน์โหลดใบเนื้อหาประกอบการเรียน |
| 🖨️ **Print-friendly** | หน้าสูตรสรุปพิมพ์ออกกระดาษ A4 ได้เลย |

---

## 📚 เนื้อหา / Content

### บทเรียน (Lessons)
| # | ไทย | English | หน้า |
|---|---|---|---|
| 1 | แหล่งกำเนิดและประเภทไฟฟ้า | Electricity Sources & Types | `electricity.html` |
| 2 | กฎของโอห์ม กำลังและพลังงาน | Ohm's Law, Power & Energy | `ohm.html` |
| 3 | ตัวต้านทาน (Resistor) | Resistor | `resistor.html` |
| 4 | ตัวเก็บประจุ (Capacitor) | Capacitor | `capacitor.html` |
| 5 | ตัวเหนี่ยวนำและหม้อแปลง | Inductor & Transformer | `inductor.html` |
| 6 | เครื่องมือวัดไฟฟ้า | Measuring Instruments | `multimeter.html` |
| 7 | การบัดกรี (Soldering) | Soldering | `soldering.html` |

### เครื่องมือ (Utilities)
| หน้า | ไทย | English |
|---|---|---|
| `formulas.html` | สูตรสรุป + พิมพ์ PDF | Formula summary + print |
| `tools.html` | เครื่องคิดเลขเชิงโต้ตอบ 7 ตัว | 7 interactive calculators |
| `quiz.html` | แบบทดสอบ 77 ข้อ 12 หมวด | 77-question quiz, 12 categories |
| `downloads.html` | ดาวน์โหลด PDF 21 ไฟล์ | Download 21 PDF files |

---

## 🗺️ Roadmap / แผนพัฒนาต่อ

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| 1 | ⚡ **RC Charging Simulator** | จำลองการชาร์จ/คายประจุของตัวเก็บประจุแบบ real-time — แสดงกราฟเส้นโค้ง exponential, ค่า τ = RC และจุด 63.2% บนกราฟ ต่อยอดจาก `capacitor.html` |
| 2 | 🔁 **AC Circuit Simulator** | จำลองวงจร AC แบบ interactive — Phasor Diagram หมุนได้, คำนวณ Z, φ, cos φ ต่อยอดจาก `ac-circuit.html` |
| 3 | 🎮 **Resistor Color Code Game** | เกม drill แบบเร็ว — สุ่มแถบสีให้ทายค่าความต้านทาน มีคะแนนและจับเวลา เล่นซ้ำได้ |

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
website/
├── style.css        — Global styles, dark mode, bilingual classes
├── nav.js           — Shared navigation, lang toggle, dark mode toggle
├── tools.js         — Calculator logic
├── index.html       — Home page
├── electricity.html — Lesson 1: Electricity Sources & Types
├── ohm.html         — Lesson 2: Ohm's Law
├── resistor.html    — Lesson 3: Resistor
├── capacitor.html   — Lesson 4: Capacitor
├── inductor.html    — Lesson 5: Inductor & Transformer
├── multimeter.html  — Lesson 6: Measuring Instruments
├── soldering.html   — Lesson 7: Soldering
├── formulas.html    — Formula summary (print-friendly)
├── tools.html       — Interactive calculators
├── quiz.html        — Quiz (77 questions, 12 categories, bilingual)
├── downloads.html   — PDF downloads
├── CLAUDE.md        — Developer notes for Claude Code
└── pdf/             — Thai PDF learning materials (~24 MB)
```
