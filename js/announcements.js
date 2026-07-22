/* announcements.js — กล่องข่าวสาร/อัปเดตล่าสุด บนหน้าแรก
 *
 * วิธีเพิ่มประกาศใหม่: ใส่ object ไว้ "บนสุด" ของ ANNOUNCEMENTS (ใหม่สุดอยู่บนสุด)
 *   id      : ไอดีไม่ซ้ำใคร — ใช้จำว่าผู้ใช้กดปิดประกาศนี้แล้ว (เปลี่ยน id = เด้งกลับมาใหม่)
 *   date    : 'YYYY-MM-DD' — ถ้าอยู่ใน 30 วันล่าสุดจะมีป้าย "ใหม่"
 *   type    : 'lesson' (บทเรียนใหม่) | 'download' (ใบงาน/ไฟล์ใหม่) | 'update' (อัปเดตทั่วไป)
 *   th/en   : ข้อความ 2 ภาษา
 *   href    : ลิงก์ปลายทาง (เว้นว่าง '' ได้ถ้าไม่มีหน้าให้ไป)
 *   expires : (ไม่บังคับ) 'YYYY-MM-DD' — วันที่ให้ประกาศหายเอง
 *             • ไม่ใส่ = หายอัตโนมัติเมื่อเลย ANN_MAX_AGE_DAYS วันนับจาก date
 *             • ใส่    = override อายุ default (เช่นอยากให้อยู่นาน/สั้นกว่า, หรือถาวรด้วยวันไกลๆ)
 *   cat     : (ไม่บังคับ, ใช้กับ href='downloads.html') data-cat ของหมวด → เปิดหน้า downloads แล้วกรองหมวดนั้นให้เลย
 *   file    : (ไม่บังคับ, ใช้กับ href='downloads.html') ค่า data-pdf ของการ์ด → เลื่อนไป + ไฮไลต์การ์ดนั้นให้อัตโนมัติ
 *             (cat/file จะถูกแนบเป็น query string ให้เอง → downloads.js อ่านตอนโหลดหน้า)
 */
const ANNOUNCEMENTS = [
  { id:'worksheet-oscillator-2026-07-22', date:'2026-07-22', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 7 — ผ่าโครงสร้างวงจรกำเนิดความถี่ (ออสซิลเลเตอร์ • รูปคลื่นและการวิเคราะห์) (PDF)',
    en:'New worksheet: Sheet 7 — Inside Oscillator Circuits (oscillators • waveforms & analysis) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้ที่ 7 ผ่าโครงสร้างวงจรกำเนิดความถี่.pdf' },
  { id:'worksheet-nameplate-2026-07-22', date:'2026-07-22', type:'download',
    th:'ใบงานใหม่: ใบงานที่ 1 — สัมผัสแรก: ถอดรหัสเนมเพลทและป้ายบอกค่าเครื่องใช้ไฟฟ้า (PDF)',
    en:'New worksheet: Sheet 1 — First Contact: Decoding Appliance Nameplates & Rating Labels (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/📝 ใบงานที่ 1 สัมผัสแรก. ถอดรหัสเนมเพลทและป.pdf' },
  { id:'breadboard-relay-2026-07-20', date:'2026-07-20', type:'update',
    th:'เบรดบอร์ด: เพิ่มรีเลย์ SPDT (5 ขา — คอยล์ + COM/NO/NC) วางเองได้ จ่ายไฟคอยล์ถึงระดับดึงเข้าแล้วหน้าสัมผัสสลับ COM→NO เอง พร้อมตัวอย่างออปโต→ทรานซิสเตอร์ขับคอยล์รีเลย์ + ไดโอดกันย้อน (flyback)',
    en:'Breadboard: added an SPDT relay (5 pins — coil + COM/NO/NC) — energize the coil past pull-in and the contact flips COM→NO, with a ready-made opto→transistor coil-driver example + flyback diode',
    href:'breadboard.html?c=eyJ2IjoxLCJlbnYiOnsidCI6MjUsImwiOjUwLCJ2ciI6NTB9LCJjb21wcyI6W3sidCI6ImJhdHRlcnkiLCJhIjoiQlAxIiwiYiI6IkJOMSIsInYiOjl9LHsidCI6InJlc2lzdG9yIiwiYSI6InRkMTEiLCJiIjoidGQxNiIsInYiOjEwMDB9LHsidCI6InRyYW5zaXN0b3IiLCJhIjoidGMxMyIsImIiOiJ0YzE5IiwiZyI6InRjMTYiLCJ0dCI6Im5wbiIsImJldGEiOjEwMH0seyJ0Ijoid2lyZSIsImEiOiJ0YTE5IiwiYiI6IlROMTkiLCJjIjoiZ3JlZW4ifSx7InQiOiJiYXR0ZXJ5IiwiYSI6IlRQMSIsImIiOiJUTjEiLCJ2Ijo5fSx7InQiOiJ3aXJlIiwiYSI6InRmMjIiLCJiIjoidGQyMiIsImMiOiJncmVlbiJ9LHsidCI6InJlc2lzdG9yIiwiYSI6InRjMjIiLCJiIjoidGMyNCIsInYiOjEwMDB9LHsidCI6ImxlZCIsImEiOiJ0ZDI0IiwiYiI6InRkMjciLCJjIjoicmVkIiwidmYiOjEuOH0seyJ0Ijoid2lyZSIsImEiOiJ0YTI3IiwiYiI6IlROMjciLCJjIjoiZ3JlZW4ifSx7InQiOiJzd2l0Y2giLCJhIjoiQlAyIiwiYiI6InRoMiIsImNsIjowfSx7InQiOiJyZXNpc3RvciIsImEiOiJ0ZzIiLCJiIjoidGc4IiwidiI6MzMwfSx7InQiOiJvcHRvIiwiYSI6InRmOCIsImIiOiJ0ZjExIiwiZyI6InRlOCIsImgiOiJ0ZTExIiwiY3RyIjoxMDB9LHsidCI6IndpcmUiLCJhIjoidGcxMSIsImIiOiJCTjExIiwiYyI6ImdyZWVuIn0seyJ0IjoicmVsYXkiLCJhIjoidGoxNiIsImIiOiJ0ajE4IiwiZyI6InRqMjAiLCJoIjoidGoyMiIsImsiOiJ0ajI0In0seyJ0Ijoid2lyZSIsImEiOiJUUDIiLCJiIjoidGQ4IiwiYyI6InJlZCJ9LHsidCI6IndpcmUiLCJhIjoidGUxMyIsImIiOiJ0aTE4IiwiYyI6ImdyZWVuIn0seyJ0Ijoid2lyZSIsImEiOiJ0aTE2IiwiYiI6IlRQMTAiLCJjIjoicmVkIn0seyJ0Ijoid2lyZSIsImEiOiJUUDE3IiwiYiI6InRoMjAiLCJjIjoicmVkIn0seyJ0IjoiZGlvZGUiLCJhIjoidGYxOCIsImIiOiJ0ZjE2IiwiZHYiOiJzaWxpY29uIiwidmYiOjAuNywicmQiOjh9XX0' },
  { id:'breadboard-example-menu-2026-07-15', date:'2026-07-15', type:'update',
    th:'เบรดบอร์ด: เปลี่ยนปุ่มสุ่มตัวอย่างเป็นเมนู "ตัวอย่าง" เลือกได้ทีละวงจรจากรายการทั้ง 16 แบบ (หรือกดสุ่มบนสุดก็ได้)',
    en:'Breadboard: the random button is now an "Examples" menu — pick any of the 16 circuits by name (or hit Random at the top)',
    href:'breadboard.html' },
  { id:'breadboard-avalanche-2026-07-15', date:'2026-07-15', type:'update',
    th:'เบรดบอร์ด: เพิ่มโหมด Avalanche ให้ทรานซิสเตอร์ NPN (ติ๊กช่อง "Avalanche" + ตั้ง V_BR) → ต่อกับ R–C ได้วงจรออสซิลเลเตอร์ไฟกระพริบเอง พร้อมตัวอย่างสำเร็จรูปในปุ่มสุ่มตัวอย่าง',
    en:'Breadboard: NPN transistors now have an Avalanche mode (tick "Avalanche" + set V_BR) → pair with an R–C for a self-blinking relaxation oscillator, plus a ready-made example in the randomizer',
    href:'breadboard.html?c=eyJ2IjoxLCJlbnYiOnsidCI6MjUsImwiOjUwLCJ2ciI6NTB9LCJjb21wcyI6W3sidCI6ImJhdHRlcnkiLCJhIjoiVFAxIiwiYiI6IlROMSIsInYiOjl9LHsidCI6InJlc2lzdG9yIiwiYSI6IlRQMiIsImIiOiJ0YTUiLCJ2IjoxMDAwfSx7InQiOiJ0cmFuc2lzdG9yIiwiYSI6InRjMTAiLCJiIjoidGM1IiwiZyI6InRhOCIsInR0IjoibnBuIiwiYXYiOjEsInZiciI6OCwiYmV0YSI6MTAwfSx7InQiOiJsZWQiLCJhIjoidGQxMCIsImIiOiJ0ZDEzIiwiYyI6InJlZCIsInZmIjoxLjh9LHsidCI6ImNhcCIsImEiOiJ0ZTUiLCJiIjoidGUxMyIsInYiOjAuMDAwNDd9LHsidCI6IndpcmUiLCJhIjoidGExMyIsImIiOiJUTjEzIiwiYyI6ImdyZWVuIn1dfQ' },
  { id:'transistor-bjt-deep-dive-2026-07-15', date:'2026-07-15', type:'update',
    th:'ขยายบทเรียนทรานซิสเตอร์ + เพิ่มภาพจำลองโต้ตอบ 2 ตัว: "ภายในทรานซิสเตอร์ทีละขั้น 1–5" (อิเล็กตรอนวิ่งในภาพตัดขวาง) และ "วงจรจริงทีละขั้น 1–6" (5V → R_B → NPN → LED, กด HIGH/LOW เทียบ Cut-off กับ Saturation)',
    en:'Expanded Transistor lesson + two new interactive sims: "Inside the BJT, steps 1–5" (electrons crossing the cross-section) and "A real circuit, steps 1–6" (5V → R_B → NPN → LED, toggle HIGH/LOW to compare cut-off and saturation)',
    href:'transistor.html' },
  { id:'worksheet-current-journey-2026-07-13', date:'2026-07-13', type:'download',
    th:'ใบงานใหม่: เสริมขั้นสูง — การเดินทางของกระแสไฟ (Capacitive Dropper, เรียงกระแส/เรกูเลต, IR 38kHz) (PDF)',
    en:'New worksheet: Advanced — The Journey of Current (capacitive dropper, rectify/regulate, IR 38kHz) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้เสริมขั้นสูง การเดินทางของกระแสไฟ.pdf' },
  { id:'worksheet-fan-motor-2026-07-13', date:'2026-07-13', type:'download',
    th:'ใบงานใหม่: พื้นฐานการซ่อมและตรวจเช็คมอเตอร์พัดลมไฟฟ้า (มอเตอร์คาปาซิเตอร์รัน, สวิตช์ปรับความเร็ว) (PDF)',
    en:'New worksheet: Fan Motor Repair & Testing Basics (capacitor-run motor, speed switch) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้ พื้นฐานการซ่อมและตรวจเช็คมอเตอร์พัดลมไฟฟ้า.pdf' },
  { id:'transistor-bjt-pdf-2026-07-13', date:'2026-07-13', type:'download',
    th:'ไฟล์ใหม่: ทรานซิสเตอร์ — โครงสร้าง BJT (เพิ่มเติม) — NPN/PNP, รอยต่อ P-N, ประวัติและหลักการ (PDF)',
    en:'New file: Transistor — BJT Structure (Part 2) — NPN/PNP, P-N junctions, history & principles (PDF)',
    href:'downloads.html', cat:'components', file:'pdf/ทรานซิสเตอร์_2.pdf' },
  { id:'opto-2026-07-09', date:'2026-07-09', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ออปโตอิเล็กทรอนิกส์ — LED/IR, 7-Segment, ตัวรับแสง, ออปโตคัปเปลอร์ + ซิม PC817',
    en:'New lesson: Optoelectronics — LED/IR, 7-segment, light detectors, optocoupler + PC817 sim',
    href:'optoelectronics.html' },
  { id:'rectifier-lab-2026-07-04', date:'2026-07-04', type:'update',
    th:'Lab ใหม่ในบทไดโอด: ทดลองแปลง AC เป็น DC — เลือกวงจร/ชนิดไดโอด/แรงดัน/โหลด แล้วดูรูปคลื่นจริง',
    en:'New lab in the Diode lesson: AC → DC rectifier — pick the circuit, diode type, voltage & load and watch the waveform',
    href:'diode.html#rectifier-lab' },
  { id:'rectifier-pdf-2026-07-01', date:'2026-07-01', type:'download',
    th:'ไฟล์ใหม่: วงจรเรียงกระแส (Rectifier) — ครึ่งคลื่น/เต็มคลื่น/บริดจ์ + ริปเปิล (PDF)',
    en:'New file: Rectifier Circuits — half/full-wave/bridge + ripple (PDF)',
    href:'downloads.html', cat:'components', file:'pdf/วงจรเรียงกระแส.pdf' },
  { id:'worksheet-3-2026-07-01', date:'2026-07-01', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 3 — เจาะลึกไดโอดความถี่สูง (Schottky & Fast Recovery) (PDF)',
    en:'New worksheet: Sheet 3 — High-Frequency Diodes (Schottky & Fast Recovery) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/📖 ใบความรู้ที่ 3 เจาะลึกไดโอดความถี่สูง.pdf' },
  { id:'worksheet-9-2026-06-27', date:'2026-06-27', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 9 — ผ่าแผงวงจร เจาะลึกเทคนิค (PDF)',
    en:'New worksheet: Sheet 9 — Dissecting the Circuit Board (PDF)',
    href:'downloads.html' },
  { id:'logic-2026-06-27', date:'2026-06-27', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ลอจิกเกต (Logic Gates) พร้อมซิมูเลเตอร์เชิงโต้ตอบ',
    en:'New lesson: Logic Gates with an interactive simulator',
    href:'logic-gates.html' },
  { id:'opamp-2026-06-25', date:'2026-06-25', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ออปแอมป์ (Op-Amp) + ซิมจำลองอัตราขยาย',
    en:'New lesson: Op-Amp + gain simulator',
    href:'op-amp.html' },
];

(function () {
  var TYPE = {
    lesson:   { icon:'📘', th:'บทเรียนใหม่', en:'New lesson',    cls:'ann-lesson' },
    download: { icon:'📥', th:'ใบงานใหม่',    en:'New worksheet', cls:'ann-download' },
    update:   { icon:'✨', th:'อัปเดต',        en:'Update',        cls:'ann-update' }
  };
  var DKEY = 'ann-dismissed';
  var ANN_MAX_AGE_DAYS = 3; // อายุ default: ไม่มี expires แล้วเกินกี่วันให้หายเอง

  function dismissed() {
    try { return JSON.parse(localStorage.getItem(DKEY)) || []; } catch (e) { return []; }
  }
  function dismiss(id) {
    var d = dismissed();
    if (d.indexOf(id) === -1) { d.push(id); localStorage.setItem(DKEY, JSON.stringify(d)); }
  }
  function isRecent(date) {
    var t = Date.parse(date);
    return !isNaN(t) && (Date.now() - t) < 30 * 864e5; // 30 วัน
  }
  // หมดอายุ: ถ้ามี expires ใช้ค่านั้น, ไม่มีก็นับ ANN_MAX_AGE_DAYS วันจาก date
  function isExpired(a) {
    if (a.expires) {
      var e = Date.parse(a.expires);
      return !isNaN(e) && Date.now() > e;
    }
    var d = Date.parse(a.date);
    return !isNaN(d) && (Date.now() - d) > ANN_MAX_AGE_DAYS * 864e5;
  }

  function render() {
    var host = document.getElementById('announcements');
    if (!host) return;
    var done = dismissed();
    var items = ANNOUNCEMENTS.filter(function (a) {
      return done.indexOf(a.id) === -1 && !isExpired(a);
    });
    if (!items.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';

    var html =
      '<div class="ann-head">' +
        '<span class="th-only">📢 ข่าวสารและอัปเดตล่าสุด</span>' +
        '<span class="en-only">📢 News &amp; Latest Updates</span>' +
      '</div>';

    html += items.map(function (a) {
      var t = TYPE[a.type] || TYPE.update;
      var newBadge = isRecent(a.date)
        ? '<span class="ann-new"><span class="th-only">ใหม่</span><span class="en-only">NEW</span></span>'
        : '';
      var href = a.href;
      if (href && (a.cat || a.file)) {          // แนบ query ให้ downloads.html กรอง/เลื่อนให้เอง
        var qs = [];
        if (a.cat)  qs.push('cat=' + encodeURIComponent(a.cat));
        if (a.file) qs.push('file=' + encodeURIComponent(a.file));
        href += (href.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
      }
      var cta = href
        ? '<a class="ann-cta" href="' + href + '"><span class="th-only">เปิดดู →</span><span class="en-only">Open →</span></a>'
        : '';
      return '<div class="ann-item ' + t.cls + '">' +
          '<span class="ann-icon">' + t.icon + '</span>' +
          '<div class="ann-body">' +
            '<span class="ann-tag"><span class="th-only">' + t.th + '</span><span class="en-only">' + t.en + '</span></span>' +
            newBadge +
            '<span class="ann-date">' + a.date + '</span>' +
            '<div class="ann-text"><span class="th-only">' + a.th + '</span><span class="en-only">' + a.en + '</span></div>' +
          '</div>' +
          cta +
          '<button class="ann-x" type="button" aria-label="ปิดประกาศ" data-id="' + a.id + '">×</button>' +
        '</div>';
    }).join('');

    host.innerHTML = html;
    host.querySelectorAll('.ann-x').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        dismiss(btn.getAttribute('data-id'));
        render();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
