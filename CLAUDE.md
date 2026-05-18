# Thai Electronics Education Website

## Project
- Static multi-page website สำหรับสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์ (ภาษาไทย)
- GitHub Pages: https://josiamu.github.io/thai-electronics-edu/
- Repo: https://github.com/josiamu/thai-electronics-edu
- Branch: master → deploy อัตโนมัติ

## Stack
- Vanilla HTML / CSS / JavaScript — ไม่ใช้ framework ใดๆ
- Font: Anuphan (Google Fonts, wght 300–700)
- Storage: localStorage (quiz scores, dark mode preference)

## File Structure
```
website/
├── style.css        — shared CSS ทุกหน้า (CSS custom properties, dark mode)
├── nav.js           — inject nav bar ทุกหน้า + dark mode toggle + hamburger
├── tools.js         — logic เครื่องคิดเลขทุกตัว (calcR4, calcR5, calcOhm, ...)
├── index.html       — หน้าหลัก (CURRENT_PAGE='home')
├── electricity.html — บทที่ 1
├── ohm.html         — บทที่ 2
├── resistor.html    — บทที่ 3
├── capacitor.html   — บทที่ 4
├── inductor.html    — บทที่ 5
├── multimeter.html  — บทที่ 6
├── soldering.html   — บทที่ 7
├── formulas.html    — สูตรสรุป + print-friendly
├── tools.html       — เครื่องคิดเลข 7 ตัว
├── quiz.html        — แบบทดสอบ 50 ข้อ 7 หมวด (inline JS + data)
├── downloads.html   — ดาวน์โหลด PDF 21 ไฟล์
└── pdf/             — ไฟล์ PDF ภาษาไทย (~24 MB)
```

## กฎสำคัญ

### แต่ละหน้า HTML ต้องมี (ก่อน nav.js เสมอ)
```html
<div id="nav-placeholder"></div>
...
<script>const CURRENT_PAGE='id';</script>
<script src="nav.js"></script>
```
CURRENT_PAGE ids: `home`, `electricity`, `ohm`, `resistor`, `capacitor`, `inductor`, `multimeter`, `soldering`, `formulas`, `tools`, `quiz`, `downloads`

### Navigation (nav.js)
- NAV_CONTENT (7 บทเรียน) → รวมในปุ่ม dropdown "บทเรียน ▼"
- NAV_UTILS (formulas, tools, quiz, downloads) → แสดงตรงๆ ใน nav bar
- Dark mode: `[data-theme="dark"]` บน `<html>`, บันทึกใน localStorage key `theme`

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
