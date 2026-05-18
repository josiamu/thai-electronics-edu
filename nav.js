const NAV_PAGES = [
  { id: 'home',        href: 'index.html',       label: 'หน้าหลัก' },
  { id: 'electricity', href: 'electricity.html',  label: '⚡ ไฟฟ้าเบื้องต้น' },
  { id: 'ohm',         href: 'ohm.html',          label: '🔢 กฎโอห์ม' },
  { id: 'resistor',    href: 'resistor.html',     label: '🎨 ตัวต้านทาน' },
  { id: 'capacitor',   href: 'capacitor.html',    label: '🔋 ตัวเก็บประจุ' },
  { id: 'inductor',    href: 'inductor.html',     label: '🌀 ตัวเหนี่ยวนำ' },
  { id: 'multimeter',  href: 'multimeter.html',   label: '📏 เครื่องมือวัด' },
  { id: 'soldering',   href: 'soldering.html',    label: '🔥 การบัดกรี' },
  { id: 'tools',       href: 'tools.html',        label: '🧮 เครื่องคิดเลข' },
  { id: 'quiz',        href: 'quiz.html',         label: '📝 แบบทดสอบ' },
  { id: 'downloads',   href: 'downloads.html',    label: '📥 ดาวน์โหลด PDF' },
];

(function () {
  const links = NAV_PAGES.map(p =>
    `<a href="${p.href}"${p.id === (window.CURRENT_PAGE || '') ? ' class="active"' : ''}>${p.label}</a>`
  ).join('');

  const html = `
    <nav>
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ ไฟฟ้า &amp; อิเล็กทรอนิกส์</a>
        <div class="nav-links">${links}</div>
      </div>
    </nav>`;

  document.getElementById('nav-placeholder').outerHTML = html;
})();
