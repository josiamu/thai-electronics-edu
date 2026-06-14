const NAV_CONTENT = [
  { id: 'electricity',      href: 'electricity.html',      label_th: '⚡ ไฟฟ้าเบื้องต้น',        label_en: '⚡ Electricity Basics' },
  { id: 'ohm',              href: 'ohm.html',              label_th: '🔢 กฎของโอห์ม',            label_en: "🔢 Ohm's Law" },
  { id: 'resistor',         href: 'resistor.html',         label_th: '🎨 ตัวต้านทาน',            label_en: '🎨 Resistor' },
  { id: 'multimeter',       href: 'multimeter.html',       label_th: '📏 เครื่องมือวัด',         label_en: '📏 Measuring Tools' },
  { id: 'diode',            href: 'diode.html',            label_th: '💡 ไดโอด',                 label_en: '💡 Diode' },
  { id: 'signal-generator', href: 'signal-generator.html', label_th: '📶 เครื่องกำเนิดสัญญาณ',  label_en: '📶 Signal Generator' },
  { id: 'oscilloscope',     href: 'oscilloscope.html',     label_th: '📡 ออสซิลโลสโคป',         label_en: '📡 Oscilloscope' },
  { id: 'capacitor',        href: 'capacitor.html',        label_th: '🔋 ตัวเก็บประจุ',          label_en: '🔋 Capacitor' },
  { id: 'inductor',         href: 'inductor.html',         label_th: '🌀 ตัวเหนี่ยวนำ',         label_en: '🌀 Inductor' },
  { id: 'soldering',        href: 'soldering.html',        label_th: '🔥 การบัดกรี',             label_en: '🔥 Soldering' },
  { id: 'ac-circuit',       href: 'ac-circuit.html',       label_th: '〜 วงจร AC',               label_en: '〜 AC Circuit' },
];

const NAV_EXTRA = [
  { id: 'home-wiring', href: 'home-wiring.html', label_th: '🔌 ไฟบ้านและความปลอดภัย', label_en: '🔌 Home Wiring & Safety' },
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
  const extraActive   = NAV_EXTRA.some(p => p.id === cur);

  const lessonItems = NAV_CONTENT.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active" aria-current="page"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const toolItems = NAV_TOOLS.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active" aria-current="page"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const extraItems = NAV_EXTRA.map(p =>
    `<a href="${p.href}"${p.id === cur ? ' class="active" aria-current="page"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const directLinks = NAV_DIRECT.map(p =>
    `<a class="nav-link${p.id === cur ? ' active' : ''}" href="${p.href}"${p.id === cur ? ' aria-current="page"' : ''}><span class="th-only">${p.label_th}</span><span class="en-only">${p.label_en}</span></a>`
  ).join('');

  const html = `
    <a class="skip-link" href="#main-content"><span class="th-only">ข้ามไปยังเนื้อหาหลัก</span><span class="en-only">Skip to main content</span></a>
    <nav aria-label="Primary navigation">
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ <span class="th-only">ไฟฟ้า &amp; อิเล็กทรอนิกส์</span><span class="en-only">Electricity &amp; Electronics</span></a>
        <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="${curLang === 'en' ? 'Open menu' : 'เปิดเมนู'}" aria-controls="nav-menu" aria-expanded="false">☰</button>
        <div class="nav-menu" id="nav-menu">
          <div class="nav-dropdown" id="nav-dropdown-lessons">
            <button class="nav-dropdown-toggle${contentActive ? ' active' : ''}" id="nav-dropdown-lessons-btn" type="button" aria-controls="nav-dropdown-lessons-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">บทเรียน</span><span class="en-only">Lessons</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-lessons-menu">${lessonItems}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-tools">
            <button class="nav-dropdown-toggle${toolsActive ? ' active' : ''}" id="nav-dropdown-tools-btn" type="button" aria-controls="nav-dropdown-tools-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">เครื่องมือ</span><span class="en-only">Tools</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-tools-menu">${toolItems}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-extra">
            <button class="nav-dropdown-toggle${extraActive ? ' active' : ''}" id="nav-dropdown-extra-btn" type="button" aria-controls="nav-dropdown-extra-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">บทเสริม</span><span class="en-only">Extra</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-extra-menu">${extraItems}</div>
          </div>
          <div class="nav-sep"></div>
          ${directLinks}
          <div class="nav-sep"></div>
          <div class="lang-toggle" role="group" aria-label="Language">
            <button class="lang-btn${curLang !== 'en' ? ' active' : ''}" id="lang-th-btn" type="button" lang="th" aria-pressed="${curLang !== 'en'}">TH</button>
            <button class="lang-btn${curLang === 'en' ? ' active' : ''}" id="lang-en-btn" type="button" lang="en" aria-pressed="${curLang === 'en'}">EN</button>
          </div>
          <button class="dark-toggle" id="dark-toggle-btn" type="button" aria-label="Toggle dark mode" aria-pressed="${isDark}">${isDark ? '☀️ Light' : '🌙 Dark'}</button>
        </div>
      </div>
    </nav>`;

  document.getElementById('nav-placeholder').outerHTML = html;

  function setLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
    document.getElementById('lang-th-btn').classList.toggle('active', lang !== 'en');
    document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
    document.getElementById('lang-th-btn').setAttribute('aria-pressed', String(lang !== 'en'));
    document.getElementById('lang-en-btn').setAttribute('aria-pressed', String(lang === 'en'));
    document.getElementById('nav-hamburger').setAttribute('aria-label', lang === 'en' ? 'Open menu' : 'เปิดเมนู');
    document.getElementById('back-to-top').setAttribute('aria-label', lang === 'en' ? 'Back to top' : 'กลับด้านบน');
    const titleTh = document.documentElement.dataset.titleTh;
    const titleEn = document.documentElement.dataset.titleEn;
    if (lang === 'en' && titleEn) document.title = titleEn;
    else if (titleTh) document.title = titleTh;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.getElementById('lang-th-btn').addEventListener('click', () => setLang('th'));
  document.getElementById('lang-en-btn').addEventListener('click', () => setLang('en'));

  const printButton = document.getElementById('print-formulas-btn');
  if (printButton) printButton.addEventListener('click', () => window.print());

  // Dropdowns
  const allDropdowns = [
    document.getElementById('nav-dropdown-lessons'),
    document.getElementById('nav-dropdown-tools'),
    document.getElementById('nav-dropdown-extra'),
  ];

  function closeAllDropdowns() {
    allDropdowns.forEach(function(d) {
      d.classList.remove('open');
      d.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  }

  function closeNavMenu() {
    navMenu.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
  }

  allDropdowns.forEach(function(dd) {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    const links = Array.from(dd.querySelectorAll('.nav-dropdown-menu a'));
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) {
        dd.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    toggle.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAllDropdowns();
        dd.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
        links[0].focus();
      }
    });
  });

  // Hamburger
  const navMenu = document.getElementById('nav-menu');
  const navHamburger = document.getElementById('nav-hamburger');
  navHamburger.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpen = navMenu.classList.toggle('open');
    this.setAttribute('aria-expanded', String(isOpen));
    closeAllDropdowns();
  });

  document.addEventListener('click', function() {
    closeAllDropdowns();
    closeNavMenu();
  });
  navMenu.addEventListener('click', function(e) { e.stopPropagation(); });
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    const openToggle = document.querySelector('.nav-dropdown.open .nav-dropdown-toggle');
    const menuWasOpen = navMenu.classList.contains('open');
    closeAllDropdowns();
    closeNavMenu();
    if (openToggle) openToggle.focus();
    else if (menuWasOpen) navHamburger.focus();
  });

  // Back-to-top button
  const btt = document.createElement('button');
  btt.id = 'back-to-top';
  btt.type = 'button';
  btt.setAttribute('aria-label', 'กลับด้านบน');
  btt.setAttribute('aria-hidden', 'true');
  btt.tabIndex = -1;
  btt.innerHTML = '↑';
  document.body.appendChild(btt);
  function updateBackToTop() {
    const visible = window.scrollY > 320;
    btt.classList.toggle('visible', visible);
    btt.setAttribute('aria-hidden', String(!visible));
    btt.tabIndex = visible ? 0 : -1;
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
  btt.addEventListener('click', function() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // Dark mode
  document.getElementById('dark-toggle-btn').addEventListener('click', function() {
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark';
    if (dark) {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      this.textContent = '🌙 Dark';
      this.setAttribute('aria-pressed', 'false');
    } else {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      this.textContent = '☀️ Light';
      this.setAttribute('aria-pressed', 'true');
    }
  });
})();
