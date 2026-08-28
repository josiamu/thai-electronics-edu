# สื่อการเรียนการสอน วิชาไฟฟ้าและอิเล็กทรอนิกส์
### Teaching Materials: Electricity & Electronics

เว็บไซต์สื่อการเรียนการสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์ รองรับ **2 ภาษา (ไทย / English)**  
A bilingual teaching website for Electricity & Electronics — **Thai / English**

🌐 **Live Site:** https://josiamu.github.io/thai-electronics-edu/

👨‍💻 **ผู้พัฒนา / Developer:** ประเสริฐ บำเพ็ญ (Prasert Bumphen) — [github.com/josiamu](https://github.com/josiamu)

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

---

## ✨ Features / ฟีเจอร์

| Feature | รายละเอียด |
|---|---|
| 🌏 **2 ภาษา** | สลับ TH ↔ EN ได้ทันทีผ่านปุ่มใน nav bar — จำการตั้งค่าไว้ |
| 🌙 **Dark Mode** | ธีมสว่าง/มืด — จำการตั้งค่าไว้ |
| 📱 **Responsive** | ใช้งานได้ทั้ง Desktop, Tablet, Mobile |
| 🔬 **เครื่องมือจำลองเชิงโต้ตอบ** | เบรดบอร์ดเสมือน, ออสซิลโลสโคป, BJT switch, เครื่องกำเนิดสัญญาณ, แหล่งจ่ายไฟ, เรียงกระแส AC→DC, ออปโตคัปเปลอร์, สวิตช์ความเร็วพัดลม, จำลองวงจร |
| 🧮 **7 เครื่องคิดเลข** | รหัสสี, โอห์ม, กำลัง, พลังงาน, อนุกรม/ขนาน, แปลงหน่วย |
| 📝 **แบบทดสอบ 100 ข้อ** | 15 หมวด, สุ่มข้อ, บันทึกคะแนนสูงสุด — มีทั้ง TH และ EN |
| 📥 **PDF 55 ไฟล์** | ดาวน์โหลดใบเนื้อหา + ใบงานประกอบการเรียน |
| 🖨️ **Print-friendly** | หน้าสูตรสรุปพิมพ์ออกกระดาษ A4 ได้เลย |

---

## 📚 เนื้อหา / Content

### บทเรียน (Lessons)

**พื้นฐานไฟฟ้า / Electrical Fundamentals**
| ไทย | English | หน้า |
|---|---|---|
| แหล่งกำเนิดและประเภทไฟฟ้า | Electricity Sources & Types | `electricity.html` |
| กฎของโอห์ม กำลังและพลังงาน | Ohm's Law, Power & Energy | `ohm.html` |
| กฎของเคอร์ชฮอฟฟ์ (KVL/KCL) | Kirchhoff's Laws (KVL/KCL) | `kirchhoff.html` (มีซิมวงจร 2 ลูป 2 แหล่งจ่ายโต้ตอบได้) |

**อุปกรณ์อิเล็กทรอนิกส์ / Electronic Components**
| ไทย | English | หน้า |
|---|---|---|
| ตัวต้านทาน | Resistor | `resistor.html` |
| ไดโอด | Diode | `diode.html` |
| ตัวเก็บประจุ | Capacitor | `capacitor.html` |
| ทรานซิสเตอร์ | Transistor (BJT/MOSFET) | `transistor.html` |
| IGBT ทรานซิสเตอร์กำลัง | IGBT Power Transistor | `igbt.html` (มีซิมเทียบกำลังสูญเสีย MOSFET/IGBT) |
| ไทริสเตอร์ SCR/TRIAC/DIAC | Thyristors (SCR/TRIAC/DIAC) | `thyristor.html` |
| ตัวเหนี่ยวนำและหม้อแปลง | Inductor & Transformer | `inductor.html` |
| รีเลย์ | Relay | `relay.html` |
| ออปโตอิเล็กทรอนิกส์ | Optoelectronics | `optoelectronics.html` |
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

**งานซ่อมเครื่องใช้ไฟฟ้า / Appliance Repair** — เมนูระดับบนสุดของตัวเอง ("งานซ่อม / Repair" บน nav bar)
| ไทย | English | หน้า |
|---|---|---|
| มอเตอร์พัดลมไฟฟ้า | Electric Fan Motor | `fan-motor.html` (มีซิมสวิตช์ความเร็วโต้ตอบ) |
| ภาคจ่ายไฟสวิตชิ่ง (LNK304) | Switching PSU (LNK304) | `switching-psu.html` (มีวงจรโต้ตอบทีละขั้น 8 ขั้น + จำลองอาการเสีย) |
| เตาแม่เหล็กไฟฟ้า | Induction Stove | `induction-stove.html` (มีวงจรโต้ตอบ 8 ขั้น + จำลองอาการเสีย 6 แบบ + ตารางจุดวัด TP1–TP5) |
| เตาไมโครเวฟ | Microwave Oven | `microwave.html` (วงจร 4 โซน • เซฟตี้ประตู 3 ตัว • ตารางจุดวัด Cold Test + วงจรโต้ตอบ 9 ขั้น พร้อมทวีแรงดัน 4,000V 2 จังหวะ) |
| เครื่องทำน้ำอุ่น | Water Heater | `water-heater.html` (ทำน้ำร้อนทันที • ฟลุกซ์สวิตช์ • วงจรอย่างง่าย • ELCB กับสายดิน + ซิม 2 โหมด: อุณหภูมิน้ำตาม ΔT และไฟรั่ว/ELCB + วงจรโต้ตอบ 7 ขั้น) |
| หม้อหุงข้าว | Rice Cooker | `rice-cooker.html` (จุดคูรีของแม่เหล็ก • วงจรหุง-อุ่น • อุ่นทิพย์ 3D • รุ่นดิจิทัล MCU + รีเลย์ + NTC + ซิมกราฟการหุง + วงจรโต้ตอบ 9 ขั้น 2 ฉาก) |
| เครื่องซักผ้า (เลือกชนิดเครื่อง) | Washing Machine (type guide) | `washing-machine.html` (หน้าฮับ: ตารางเทียบ 3 แบบ • คัดแยกชนิดเครื่องจากมอเตอร์ซัก • รหัสสีสายไฟ • ความปลอดภัย) |
| ↳ เครื่อง 2 ถัง | ↳ Twin tub | `washing-machine-twin.html` (กลไกล้วนไม่มีบอร์ด • ลานตั้งเวลา • คาปาซิเตอร์คู่ • สวิตช์ฝาถัง + วงจรโต้ตอบ 5 ขั้น + คลินิก 3 เคส) |
| ↳ ฝาบนอินเวอร์เตอร์ | ↳ Inverter top loader | `washing-machine-top.html` (ลำดับ 8 สเต็ป • R-Factor • บอร์ดไตรแอค vs บอร์ด IPM • ไล่ซ่อม "เปิดไม่ติด" + วงจรโต้ตอบ 6 ขั้น + คลินิก 2 เคส) |
| ↳ ฝาหน้า Direct Drive | ↳ Front loader (DD) | `washing-machine-front.html` (ล็อกประตู PTC • ฮีตเตอร์+NTC • IPM 3 เฟส + วงจรโต้ตอบ 5 ขั้น + คลินิก 5 เคส) |
| เตารีดไฟฟ้า | Electric Iron | `iron.html` (เทอร์โมสตัทไบเมทัล • เทอร์โมฟิวส์ • ฮีตเตอร์นิโครม 40–80 Ω • หลอดนีออนคร่อมขั้วฮีตเตอร์ • หัวข้อเตารีดไอน้ำ + ซิมเทอร์โมสตัทตัดต่อ + วงจรโต้ตอบ 5 ขั้น + คลินิก 4 เคส) |

**งานปฏิบัติ / Practical**
| ไทย | English | หน้า |
|---|---|---|
| การบัดกรี | Soldering | `soldering.html` |
| ไฟบ้านและความปลอดภัย | Home Wiring & Safety | `home-wiring.html` |

### เครื่องมือ (Tools & Resources)
| หน้า | ไทย | English |
|---|---|---|
| `simulation.html` | จำลองวงจร (อนุกรม/ขนาน/ผสม) | Circuit simulator |
| `breadboard.html` | ทดลองบนเบรดบอร์ดเสมือน + มัลติมิเตอร์ (ตัวต้านทานแถบสีจริง, LED หรี่ตามกระแส, ปุ่มกดแบบกดติด-ปล่อยดับ, SCR/ไทรแอก/ไดแอกที่ยิงเกตแล้วล็อกตัว (มีตัวอย่างดิมเมอร์ RC+DIAC+TRIAC), ทรานซิสเตอร์ NPN/PNP/MOSFET + โหมด avalanche (ไฟกระพริบ relaxation oscillator), โพเทนชิโอมิเตอร์ 3 ขา, ออปโตคัปเปลอร์ 4 ขา, รีเลย์ SPDT 5 ขา, แหล่งจ่าย AC, กราฟ transient) | Virtual breadboard lab + multimeter (real colour-coded resistors, current-proportional LEDs, momentary pushbutton, latching SCR/TRIAC/DIAC (with an RC+DIAC+TRIAC dimmer example), NPN/PNP/MOSFET transistors + avalanche relaxation-oscillator mode, 3-pin potentiometer, 4-pin optocoupler, SPDT relay, AC source, transient graph) |
| `relay-lab.html` | ห้องแล็บวงจรควบคุมรีเลย์ MY4 (4PDT 24VDC + ปุ่มกด/ไฟ/บัซเซอร์, รางไฟ + จุดพักไฟ TB-1…TB-10 ลดสายพันกัน, คลิกไฮไลต์ไล่วงจร, 🎯 ภารกิจ 7 ข้อพร้อมตรวจคำตอบอัตโนมัติ, 9 ตัวอย่าง self-holding/interlock/AND-OR/fail-safe NC/กลับทางหมุนมอเตอร์, มุมมองแผนภาพ Ladder, บันทึก/แชร์ลิงก์) | MY4 relay control lab (4PDT 24VDC + buttons/lamps/buzzer, power rails + TB-1…TB-10 terminal block, click-to-trace highlight, 7 auto-graded missions, 9 examples incl. fail-safe NC and motor forward/reverse, ladder view, save/share) |
| `formulas.html` | สูตรสรุป + พิมพ์ PDF | Formula summary + print |
| `tools.html` | เครื่องคิดเลขเชิงโต้ตอบ 7 ตัว | 7 interactive calculators |
| `quiz.html` | แบบทดสอบ 100 ข้อ 15 หมวด | 100-question quiz, 15 categories |
| `downloads.html` | ดาวน์โหลด PDF 55 ไฟล์ (รวมหัวข้อ "ฟอร์มตรวจเช็ค" และ "งานซ่อม") | Download 55 PDF files (incl. "Check Forms" and "Repair" sections) |

---

## 🗺️ Roadmap / แผนพัฒนาต่อ

| # | ฟีเจอร์ | รายละเอียด |
|---|---|---|
| 1 | 🎮 **Resistor Color Code Game** | เกม drill แบบเร็ว — สุ่มแถบสีให้ทายค่าความต้านทาน มีคะแนนและจับเวลา เล่นซ้ำได้ |
| 2 | ↩️ **Undo / Redo บนเบรดบอร์ด** | ย้อน/ทำซ้ำการวาง–ลบอุปกรณ์ (Ctrl+Z / Ctrl+Y) |
| 3 | 🎯 **โจทย์/ภารกิจบนเบรดบอร์ด** | การ์ดเป้าหมาย เช่น "ทำให้ LED ติด" / "แบ่งแรงดันให้ได้ ~5V" พร้อมระบบตรวจอัตโนมัติ — แบบเดียวกับภารกิจ 7 ข้อใน `relay-lab.html` ที่ทำไปแล้ว |

**บทเรียนที่วางแผนไว้ / Planned lessons**

| # | บท | ต่อยอดจาก |
|---|---|---|
| 4 | 🔄 **หม้อแปลง** | อัตราส่วนรอบ, step up/down, Vp/Vs — โยงเข้าไมโครเวฟ/SMPS ที่มีอยู่ |
| 5 | 🎛️ **อินเวอร์เตอร์ / VFD** | DC→AC คุมความเร็วมอเตอร์ — ต่อยอดจาก `power-supply.html` + `igbt.html` |
| 6 | 📉 **ฟิลเตอร์และเรโซแนนซ์** | RC/RL/RLC low/high-pass, ความถี่ตัด, เรโซแนนซ์ |
| 7 | 🧊 **เครื่องใช้ไฟฟ้าระบบอินเวอร์เตอร์** | มุมผู้ใช้ (กลุ่มงานปฏิบัติ) — ประหยัดไฟ วิธีเลือก ข้อควรระวัง |

> ✅ **เสร็จแล้ว (เคยอยู่ใน roadmap):** บทลอจิกเกต (`logic-gates.html`), ไอซี 555 (`555.html`),
> ออปแอมป์ (`op-amp.html`), **ห้องแล็บวงจรรีเลย์ MY4 (`relay-lab.html`)**, **ไทริสเตอร์ SCR/TRIAC/DIAC (`thyristor.html`)**, **กฎของเคอร์ชฮอฟฟ์ (`kirchhoff.html`)** — ทั้งหมดมี sim เชิงโต้ตอบครบแล้ว

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

## 🧮 เครื่องคิดเลข / Calculators (`js/tools.js`)

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
├── css/style.css            — Global styles, dark mode, bilingual classes, shared `.bs-*` step-by-step sim styles
├── js/nav.js               — Shared navigation, lang toggle, dark mode toggle
├── js/tools.js             — Calculator logic
├── js/quiz.js              — Quiz data + logic
├── js/downloads.js         — PDF preview modal + downloads
├── js/simulation.js        — Circuit simulator logic
├── js/oscilloscope.js      — Interactive I-V curve simulator
├── js/osc-reader.js        — Scope reading trainer
├── js/kirchhoff-sim.js     — Two-loop, two-source circuit sim (live nodal solve; KCL and KVL both measured from the same answer)
├── js/bjt-steps.js         — Interactive step-by-step: how a BJT works (5 clickable steps, animated cross-section)
├── js/bjt-circuit.js       — Interactive step-by-step: a real 5V circuit (R_B → NPN → LED + R_C, 6 steps, HIGH/LOW toggle)
├── js/smps-steps.js        — Interactive step-by-step: LNK304 switching PSU (8 steps, 6 fault modes, TP1–TP4 readouts)
├── js/stove-steps.js       — Interactive step-by-step: induction-cooker board (8 steps, 6 fault modes, ZVS resonant waveform, TP1–TP5 readouts)
├── js/mw-circuit.js        — Interactive step-by-step: whole microwave circuit (7 ladder steps + 2 voltage-doubler strokes, 7 fault modes, door/Start toggles)
├── js/wh-circuit.js        — Interactive step-by-step: water-heater safety chain (7 steps, 6 fault modes, water on/off, 220V/0V probe badges)
├── js/water-heater-sim.js  — Instant water heater sim (ΔT vs power/flow/inlet temperature, plus an earth-leakage mode where the ELCB trips at 30 mA)
├── js/rice-circuit.js      — Interactive step-by-step: rice cooker (6 mechanical steps + 3 digital steps, 7 fault modes, Cook button with a real Curie-point release)
├── js/rice-sim.js          — Rice cooking curve (ramp → 100°C plateau → Curie release, with a weak-magnet mode)
├── js/wm-twin.js            — Interactive step-by-step: twin-tub washer (5 steps, 4 fault modes, wash/spin motors + dual run capacitor)
├── js/wm-top.js             — Interactive step-by-step: inverter top-loader (6 steps, 7 fault modes, 300V bus → SMPS → IPM → BLDC, TP1–TP3 readouts)
├── js/wm-front.js           — Interactive step-by-step: direct-drive front loader (5 steps, 5 fault modes, door lock gates every other load)
├── js/iron-sim.js           — Dry-iron thermostat sim (heat-up curve + ±6°C hysteresis, welded-contact mode ends with the thermal fuse blowing)
├── js/iron-circuit.js       — Interactive step-by-step: dry-iron circuit (5 steps, 7 fault modes, neon lamp wired across the element)
├── js/signal-gen-sim.js    — Waveform generator
├── js/capacitor-sim.js     — RC charge/discharge simulator
├── js/power-supply-sim.js  — Power supply (AC→DC) simulator
├── js/rectifier-lab.js     — AC→DC rectifier lab (half/center-tap/bridge × all diode types + filter C)
├── js/555-sim.js           — 555 astable simulator (LED blinker)
├── js/opamp-sim.js         — Op-amp amplifier simulator (gain + clipping)
├── js/logic-sim.js         — Logic-gate simulator (toggle inputs + truth table)
├── js/opto-sim.js          — Optocoupler simulator (IF/CTR/RL → IC, Vout, saturation)
├── js/announcements.js     — Home-page "latest news/updates" box (data-driven, dismissible, bilingual)
├── js/breadboard.js        — Virtual breadboard lab (MNA solver + transistors + multimeter)
├── js/scr-sim.js           — Phase-control dimmer sim (SCR/TRIAC firing angle)
├── js/igbt-sim.js          — MOSFET-vs-IGBT loss comparison sim (current/frequency/bus + hard vs ZVS switching)
├── js/fan-motor-sim.js     — Fan speed-switch sim (press 0/1/2/3 → live current path through choke, run & start windings + blown-thermal-fuse mode)
├── js/relay-lab.js         — MY4 relay control lab (DC nodal solver + power rails + terminal block + ladder view + auto-graded missions + save/share)
├── index.html           — Home page
│   ├── electricity.html / ohm.html / kirchhoff.html   — Fundamentals
│   ├── resistor.html / diode.html / transistor.html / igbt.html / thyristor.html / ic.html / 555.html / op-amp.html / logic-gates.html / relay.html
│   │   capacitor.html / inductor.html / optoelectronics.html / power-supply.html   — Components
│   ├── multimeter.html / signal-generator.html / oscilloscope.html  — Measurement
│   ├── fan-motor.html / switching-psu.html / induction-stove.html / microwave.html
│   │   water-heater.html / rice-cooker.html / iron.html                 — Appliance repair
│   ├── washing-machine.html (hub) / -twin.html / -top.html / -front.html   — Washing machines
│   ├── soldering.html / home-wiring.html           — Practical
│   ├── simulation.html / breadboard.html / relay-lab.html   — Interactive labs
│   └── formulas.html / tools.html / quiz.html / downloads.html      — Tools & resources
├── CLAUDE.md / AGENTS.md — Developer notes (kept in sync)
├── LICENSE              — CC BY-NC 4.0 (+ note carving out third-party PDFs)
└── pdf/                 — Thai PDF learning materials (~24 MB)
```

---

## 👨‍💻 ผู้พัฒนา / Author

**ประเสริฐ บำเพ็ญ (Prasert Bumphen)** — ออกแบบ พัฒนา และเขียนเนื้อหาทั้งหมดของเว็บไซต์นี้
(Design, development, and all original lesson content)

- GitHub: [github.com/josiamu](https://github.com/josiamu) — ช่องทางติดต่ออื่นๆ อยู่ในโปรไฟล์

หากนำเนื้อหาหรือโค้ดไปใช้ต่อ กรุณาให้เครดิตตามรูปแบบ / When reusing, please credit as:

> "สื่อการเรียนการสอน วิชาไฟฟ้าและอิเล็กทรอนิกส์" โดย ประเสริฐ บำเพ็ญ (Prasert Bumphen) —
> https://josiamu.github.io/thai-electronics-edu/ (CC BY-NC 4.0)

---

## 📄 สัญญาอนุญาต / License

เนื้อหาต้นฉบับและซอร์สโค้ดของเว็บไซต์นี้ (บทเรียน 2 ภาษา, เครื่องมือจำลอง, เครื่องคิดเลข,
โค้ด HTML/CSS/JS และสื่อต้นฉบับที่ผู้จัดทำสร้างเอง) เผยแพร่ภายใต้สัญญาอนุญาต
**[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)**

> ✅ เรียนได้ฟรี • นำไปใช้/ดัดแปลง/เผยแพร่ต่อได้ โดยต้องให้เครดิต
> ❌ ห้ามใช้เพื่อการค้า — เช่น ขาย เปิดคอร์สเก็บเงิน หรือมุ่งหากำไร

The original content and source code of this website are licensed under
**CC BY-NC 4.0** — free to use, adapt, and share **with attribution** and
**for non-commercial purposes only**.

> ⚠️ **ไฟล์ PDF ในโฟลเดอร์ `pdf/`** เป็นสื่อจากหลายแหล่ง (รวมถึงเอกสารที่อาจารย์มอบให้)
> **ไม่อยู่ภายใต้** สัญญาอนุญาตข้างต้น — ลิขสิทธิ์ยังเป็นของเจ้าของแต่ละราย นำมารวบรวมไว้
> เพื่อการศึกษาแบบไม่แสวงหากำไรเท่านั้น หากเป็นเจ้าของและต้องการให้นำออก
> ติดต่อ jodeveloper@gmail.com — ดูรายละเอียดในไฟล์ [`LICENSE`](LICENSE)
