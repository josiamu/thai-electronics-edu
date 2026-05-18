const NAV_CONTENT = [
  { id: 'electricity', href: 'electricity.html', label: '⚡ ไฟฟ้าเบื้องต้น' },
  { id: 'ohm',         href: 'ohm.html',          label: '🔢 กฎของโอห์ม' },
  { id: 'resistor',    href: 'resistor.html',     label: '🎨 ตัวต้านทาน' },
  { id: 'capacitor',   href: 'capacitor.html',    label: '🔋 ตัวเก็บประจุ' },
  { id: 'inductor',    href: 'inductor.html',     label: '🌀 ตัวเหนี่ยวนำ' },
  { id: 'multimeter',  href: 'multimeter.html',   label: '📏 เครื่องมือวัด' },
  { id: 'soldering',   href: 'soldering.html',    label: '🔥 การบัดกรี' },
];

const NAV_UTILS = [
  { id: 'formulas',  href: 'formulas.html',  label: '📐 สูตรสรุป' },
  { id: 'tools',     href: 'tools.html',     label: '🧮 เครื่องคิดเลข' },
  { id: 'quiz',      href: 'quiz.html',      label: '📝 แบบทดสอบ' },
  { id: 'downloads', href: 'downloads.html', label: '📥 ดาวน์โหลด' },
];

(function () {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const cur = window.CURRENT_PAGE || '';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const contentActive = NAV_CONTENT.some(p => p.id === cur);

  const dropdownItems = NAV_CONTENT.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active"' : ''}>${p.label}</a>`
  ).join('');

  const utilLinks = NAV_UTILS.map(p =>
    `<a class="nav-link${p.id === cur ? ' active' : ''}" href="${p.href}">${p.label}</a>`
  ).join('');

  const html = `
    <nav>
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ ไฟฟ้า &amp; อิเล็กทรอนิกส์</a>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="เมนู">☰</button>
        <div class="nav-menu" id="nav-menu">
          <div class="nav-dropdown" id="nav-dropdown">
            <button class="nav-dropdown-toggle${contentActive ? ' active' : ''}" id="nav-dropdown-btn">
              บทเรียน <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-menu">
              ${dropdownItems}
            </div>
          </div>
          <div class="nav-sep"></div>
          ${utilLinks}
          <div class="nav-sep"></div>
          <button class="dark-toggle" id="dark-toggle-btn" aria-label="Toggle dark mode">${isDark ? '☀️ Light' : '🌙 Dark'}</button>
        </div>
      </div>
    </nav>`;

  document.getElementById('nav-placeholder').outerHTML = html;

  // Dropdown toggle
  const dropdown = document.getElementById('nav-dropdown');
  document.getElementById('nav-dropdown-btn').addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // Hamburger toggle
  const navMenu = document.getElementById('nav-menu');
  document.getElementById('nav-hamburger').addEventListener('click', function (e) {
    e.stopPropagation();
    navMenu.classList.toggle('open');
    dropdown.classList.remove('open');
  });

  // Close on outside click
  document.addEventListener('click', function () {
    dropdown.classList.remove('open');
    navMenu.classList.remove('open');
  });
  navMenu.addEventListener('click', function (e) { e.stopPropagation(); });

  // Dark mode toggle
  document.getElementById('dark-toggle-btn').addEventListener('click', function () {
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark';
    if (dark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      this.textContent = '🌙 Dark';
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      this.textContent = '☀️ Light';
    }
  });
})();
