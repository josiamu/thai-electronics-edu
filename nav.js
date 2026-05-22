const NAV_CONTENT = [
  { id: 'electricity', href: 'electricity.html', label_th: '⚡ ไฟฟ้าเบื้องต้น',  label_en: '⚡ Electricity Basics' },
  { id: 'ohm',         href: 'ohm.html',          label_th: '🔢 กฎของโอห์ม',      label_en: "🔢 Ohm's Law" },
  { id: 'resistor',    href: 'resistor.html',     label_th: '🎨 ตัวต้านทาน',      label_en: '🎨 Resistor' },
  { id: 'capacitor',   href: 'capacitor.html',    label_th: '🔋 ตัวเก็บประจุ',    label_en: '🔋 Capacitor' },
  { id: 'inductor',    href: 'inductor.html',     label_th: '🌀 ตัวเหนี่ยวนำ',   label_en: '🌀 Inductor' },
  { id: 'multimeter',  href: 'multimeter.html',   label_th: '📏 เครื่องมือวัด',   label_en: '📏 Measuring Tools' },
  { id: 'soldering',   href: 'soldering.html',    label_th: '🔥 การบัดกรี',       label_en: '🔥 Soldering' },
  { id: 'ac-circuit',  href: 'ac-circuit.html',  label_th: '〜 วงจร AC',          label_en: '〜 AC Circuit' },
];

const NAV_TOOLS = [
  { id: 'simulation', href: 'simulation.html', label_th: '🔬 จำลองวงจร',     label_en: '🔬 Circuit Sim' },
  { id: 'formulas',   href: 'formulas.html',   label_th: '📐 สูตรสรุป',       label_en: '📐 Formulas' },
  { id: 'tools',      href: 'tools.html',      label_th: '🧮 เครื่องคิดเลข',  label_en: '🧮 Calculators' },
];

const NAV_DIRECT = [
  { id: 'quiz',      href: 'quiz.html',      label_th: '📝 แบบทดสอบ', label_en: '📝 Quiz' },
  { id: 'downloads', href: 'downloads.html', label_th: '📥 ดาวน์โหลด', label_en: '📥 Downloads' },
];

(function () {
  // Apply saved theme early
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  const cur = window.CURRENT_PAGE || '';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const curLang = document.documentElement.lang || 'th';
  const contentActive = NAV_CONTENT.some(p => p.id === cur);
  const toolsActive   = NAV_TOOLS.some(p => p.id === cur);

  const lessonItems = NAV_CONTENT.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const toolItems = NAV_TOOLS.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const directLinks = NAV_DIRECT.map(p =>
    `<a class="nav-link${p.id === cur ? ' active' : ''}" href="${p.href}"><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const html = `
    <nav>
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ <span class="th-only">ไฟฟ้า &amp; อิเล็กทรอนิกส์</span><span class="en-only">Electricity &amp; Electronics</span></a>
        <button class="nav-hamburger" id="nav-hamburger" aria-label="เมนู">☰</button>
        <div class="nav-menu" id="nav-menu">
          <div class="nav-dropdown" id="nav-dropdown-lessons">
            <button class="nav-dropdown-toggle${contentActive ? ' active' : ''}" id="nav-dropdown-lessons-btn">
              <span class="th-only">บทเรียน</span><span class="en-only">Lessons</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-lessons-menu">${lessonItems}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-tools">
            <button class="nav-dropdown-toggle${toolsActive ? ' active' : ''}" id="nav-dropdown-tools-btn">
              <span class="th-only">เครื่องมือ</span><span class="en-only">Tools</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-tools-menu">${toolItems}</div>
          </div>
          <div class="nav-sep"></div>
          ${directLinks}
          <div class="nav-sep"></div>
          <div class="lang-toggle">
            <button class="lang-btn${curLang !== 'en' ? ' active' : ''}" id="lang-th-btn">TH</button>
            <button class="lang-btn${curLang === 'en' ? ' active' : ''}" id="lang-en-btn">EN</button>
          </div>
          <button class="dark-toggle" id="dark-toggle-btn" aria-label="Toggle dark mode">${isDark ? '☀️ Light' : '🌙 Dark'}</button>
        </div>
      </div>
    </nav>`;

  document.getElementById('nav-placeholder').outerHTML = html;

  function setLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    document.getElementById('lang-th-btn').classList.toggle('active', lang !== 'en');
    document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
    const titleTh = document.documentElement.dataset.titleTh;
    const titleEn = document.documentElement.dataset.titleEn;
    if (lang === 'en' && titleEn) document.title = titleEn;
    else if (titleTh) document.title = titleTh;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.getElementById('lang-th-btn').addEventListener('click', () => setLang('th'));
  document.getElementById('lang-en-btn').addEventListener('click', () => setLang('en'));

  // Dropdowns
  const allDropdowns = [
    document.getElementById('nav-dropdown-lessons'),
    document.getElementById('nav-dropdown-tools'),
  ];

  allDropdowns.forEach(function(dd) {
    dd.querySelector('.nav-dropdown-toggle').addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = dd.classList.contains('open');
      allDropdowns.forEach(function(d) { d.classList.remove('open'); });
      if (!isOpen) dd.classList.add('open');
    });
  });

  // Hamburger
  const navMenu = document.getElementById('nav-menu');
  document.getElementById('nav-hamburger').addEventListener('click', function(e) {
    e.stopPropagation();
    navMenu.classList.toggle('open');
    allDropdowns.forEach(function(d) { d.classList.remove('open'); });
  });

  document.addEventListener('click', function() {
    allDropdowns.forEach(function(d) { d.classList.remove('open'); });
    navMenu.classList.remove('open');
  });
  navMenu.addEventListener('click', function(e) { e.stopPropagation(); });

  // Dark mode
  document.getElementById('dark-toggle-btn').addEventListener('click', function() {
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
