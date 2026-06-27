/* announcements.js — กล่องข่าวสาร/อัปเดตล่าสุด บนหน้าแรก
 *
 * วิธีเพิ่มประกาศใหม่: ใส่ object ไว้ "บนสุด" ของ ANNOUNCEMENTS (ใหม่สุดอยู่บนสุด)
 *   id    : ไอดีไม่ซ้ำใคร — ใช้จำว่าผู้ใช้กดปิดประกาศนี้แล้ว (เปลี่ยน id = เด้งกลับมาใหม่)
 *   date  : 'YYYY-MM-DD' — ถ้าอยู่ใน 30 วันล่าสุดจะมีป้าย "ใหม่"
 *   type  : 'lesson' (บทเรียนใหม่) | 'download' (ใบงาน/ไฟล์ใหม่) | 'update' (อัปเดตทั่วไป)
 *   th/en : ข้อความ 2 ภาษา
 *   href  : ลิงก์ปลายทาง (เว้นว่าง '' ได้ถ้าไม่มีหน้าให้ไป)
 */
const ANNOUNCEMENTS = [
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

  function render() {
    var host = document.getElementById('announcements');
    if (!host) return;
    var done = dismissed();
    var items = ANNOUNCEMENTS.filter(function (a) { return done.indexOf(a.id) === -1; });
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
      var cta = a.href
        ? '<a class="ann-cta" href="' + a.href + '"><span class="th-only">เปิดดู →</span><span class="en-only">Open →</span></a>'
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
