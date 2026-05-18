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
  // Apply saved theme before rendering to avoid flash
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const links = NAV_PAGES.map(p =>
    `<a href="${p.href}"${p.id === (window.CURRENT_PAGE || '') ? ' class="active"' : ''}>${p.label}</a>`
  ).join('');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const html = `
    <nav>
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ ไฟฟ้า &amp; อิเล็กทรอนิกส์</a>
        <div class="nav-links">${links}</div>
        <button class="dark-toggle" id="dark-toggle-btn" aria-label="Toggle dark mode">${isDark ? '☀️ Light' : '🌙 Dark'}</button>
      </div>
    </nav>`;

  document.getElementById('nav-placeholder').outerHTML = html;

  document.getElementById('dark-toggle-btn').addEventListener('click', function () {
    const html = document.documentElement;
    const dark = html.getAttribute('data-theme') === 'dark';
    if (dark) {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      this.textContent = '🌙 Dark';
    } else {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      this.textContent = '☀️ Light';
    }
  });
})();
