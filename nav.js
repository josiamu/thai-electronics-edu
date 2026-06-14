const NAV_LESSON_GROUPS = [
  {
    id: 'fundamentals',
    label_th: 'พื้นฐานไฟฟ้า',
    label_en: 'Electrical Fundamentals',
    items: [
      { id: 'electricity', href: 'electricity.html', label_th: '⚡ ไฟฟ้าเบื้องต้น', label_en: '⚡ Electricity Basics' },
      { id: 'ohm', href: 'ohm.html', label_th: '🔢 กฎของโอห์ม', label_en: "🔢 Ohm's Law" },
      { id: 'ac-circuit', href: 'ac-circuit.html', label_th: '〜 วงจร AC', label_en: '〜 AC Circuit' },
    ],
  },
  {
    id: 'components',
    label_th: 'อุปกรณ์อิเล็กทรอนิกส์',
    label_en: 'Electronic Components',
    items: [
      { id: 'resistor', href: 'resistor.html', label_th: '🎨 ตัวต้านทาน', label_en: '🎨 Resistor' },
      { id: 'capacitor', href: 'capacitor.html', label_th: '🔋 ตัวเก็บประจุ', label_en: '🔋 Capacitor' },
      { id: 'inductor', href: 'inductor.html', label_th: '🌀 ตัวเหนี่ยวนำ', label_en: '🌀 Inductor' },
      { id: 'diode', href: 'diode.html', label_th: '💡 ไดโอด', label_en: '💡 Diode' },
    ],
  },
  {
    id: 'measurement',
    label_th: 'เครื่องมือวัดและทดสอบ',
    label_en: 'Measurement & Testing',
    items: [
      { id: 'multimeter', href: 'multimeter.html', label_th: '📏 เครื่องมือวัด', label_en: '📏 Measuring Tools' },
      { id: 'signal-generator', href: 'signal-generator.html', label_th: '📶 เครื่องกำเนิดสัญญาณ', label_en: '📶 Signal Generator' },
      { id: 'oscilloscope', href: 'oscilloscope.html', label_th: '📡 ออสซิลโลสโคป', label_en: '📡 Oscilloscope' },
    ],
  },
];

const NAV_PRACTICE = [
  { id: 'soldering', href: 'soldering.html', label_th: '🔥 การบัดกรี', label_en: '🔥 Soldering' },
  { id: 'home-wiring', href: 'home-wiring.html', label_th: '🔌 ไฟบ้านและความปลอดภัย', label_en: '🔌 Home Wiring & Safety' },
];

const NAV_TOOLS = [
  { id: 'simulation', href: 'simulation.html', label_th: '🔬 จำลองวงจร', label_en: '🔬 Circuit Sim' },
  { id: 'formulas', href: 'formulas.html', label_th: '📐 สูตรสรุป', label_en: '📐 Formulas' },
  { id: 'tools', href: 'tools.html', label_th: '🧮 เครื่องคิดเลข', label_en: '🧮 Calculators' },
];

const NAV_RESOURCES = [
  { id: 'quiz', href: 'quiz.html', label_th: '📝 แบบทดสอบ', label_en: '📝 Quiz' },
  { id: 'downloads', href: 'downloads.html', label_th: '📥 ดาวน์โหลด', label_en: '📥 Downloads' },
];

(function () {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  const cur = window.CURRENT_PAGE || '';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const curLang = document.documentElement.lang || 'th';
  const lessonPages = NAV_LESSON_GROUPS.flatMap(group => group.items);
  const lessonsActive = lessonPages.some(page => page.id === cur);
  const practiceActive = NAV_PRACTICE.some(page => page.id === cur);
  const toolsActive = NAV_TOOLS.some(page => page.id === cur);
  const resourcesActive = NAV_RESOURCES.some(page => page.id === cur);

  function renderLink(page, className = '') {
    const classes = [className, page.id === cur ? 'active' : ''].filter(Boolean).join(' ');
    return `<a${classes ? ` class="${classes}"` : ''} href="${page.href}"${page.id === cur ? ' aria-current="page"' : ''}><span class="th-only">${page.label_th}</span><span class="en-only">${page.label_en}</span></a>`;
  }

  const lessonGroups = NAV_LESSON_GROUPS.map(group => {
    const groupActive = group.items.some(page => page.id === cur);
    return `
      <section class="nav-mega-group${groupActive ? ' current' : ''}" data-nav-group>
        <button class="nav-mega-group-toggle" type="button" aria-controls="nav-group-${group.id}" aria-expanded="false">
          <span class="th-only">${group.label_th}</span><span class="en-only">${group.label_en}</span>
          <span class="nav-group-chevron" aria-hidden="true">▼</span>
        </button>
        <div class="nav-mega-group-links" id="nav-group-${group.id}">${group.items.map(page => renderLink(page)).join('')}</div>
      </section>`;
  }).join('');

  const practiceItems = NAV_PRACTICE.map(page => renderLink(page)).join('');
  const toolItems = NAV_TOOLS.map(page => renderLink(page)).join('');
  const resourceItems = NAV_RESOURCES.map(page => renderLink(page)).join('');

  const html = `
    <a class="skip-link" href="#main-content"><span class="th-only">ข้ามไปยังเนื้อหาหลัก</span><span class="en-only">Skip to main content</span></a>
    <nav aria-label="Primary navigation">
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">⚡ <span class="th-only">ไฟฟ้า &amp; อิเล็กทรอนิกส์</span><span class="en-only">Electricity &amp; Electronics</span></a>
        <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="${curLang === 'en' ? 'Open menu' : 'เปิดเมนู'}" aria-controls="nav-menu" aria-expanded="false">☰</button>
        <div class="nav-menu" id="nav-menu">
          <div class="nav-dropdown nav-dropdown-mega" id="nav-dropdown-lessons">
            <button class="nav-dropdown-toggle${lessonsActive ? ' active' : ''}" type="button" aria-controls="nav-dropdown-lessons-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">บทเรียน</span><span class="en-only">Lessons</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu nav-mega-menu" id="nav-dropdown-lessons-menu">${lessonGroups}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-practice">
            <button class="nav-dropdown-toggle${practiceActive ? ' active' : ''}" type="button" aria-controls="nav-dropdown-practice-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">งานปฏิบัติ</span><span class="en-only">Practical</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-practice-menu">${practiceItems}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-tools">
            <button class="nav-dropdown-toggle${toolsActive ? ' active' : ''}" type="button" aria-controls="nav-dropdown-tools-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">เครื่องมือ</span><span class="en-only">Tools</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-tools-menu">${toolItems}</div>
          </div>
          <div class="nav-dropdown" id="nav-dropdown-resources">
            <button class="nav-dropdown-toggle${resourcesActive ? ' active' : ''}" type="button" aria-controls="nav-dropdown-resources-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">คลังการเรียนรู้</span><span class="en-only">Resources</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu nav-dropdown-menu-end" id="nav-dropdown-resources-menu">${resourceItems}</div>
          </div>
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
    document.title = lang === 'en' && titleEn ? titleEn : titleTh || document.title;
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.getElementById('lang-th-btn').addEventListener('click', () => setLang('th'));
  document.getElementById('lang-en-btn').addEventListener('click', () => setLang('en'));

  const printButton = document.getElementById('print-formulas-btn');
  if (printButton) printButton.addEventListener('click', () => window.print());

  const navMenu = document.getElementById('nav-menu');
  const navHamburger = document.getElementById('nav-hamburger');
  const allDropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  function closeAllDropdowns() {
    allDropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
      dropdown.querySelector('.nav-dropdown-toggle').setAttribute('aria-expanded', 'false');
    });
  }

  function closeNavMenu() {
    navMenu.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
  }

  function setLessonGroup(group, open) {
    group.classList.toggle('open', open);
    group.querySelector('.nav-mega-group-toggle').setAttribute('aria-expanded', String(open));
  }

  function syncLessonGroups() {
    document.querySelectorAll('[data-nav-group]').forEach((group, index) => {
      const toggle = group.querySelector('.nav-mega-group-toggle');
      toggle.tabIndex = mobileQuery.matches ? 0 : -1;
      toggle.setAttribute('aria-disabled', String(!mobileQuery.matches));
      setLessonGroup(group, mobileQuery.matches ? group.classList.contains('current') || (!lessonsActive && index === 0) : true);
    });
  }

  document.querySelectorAll('.nav-mega-group-toggle').forEach(toggle => {
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      if (!mobileQuery.matches) return;
      const selectedGroup = this.closest('[data-nav-group]');
      const willOpen = !selectedGroup.classList.contains('open');
      document.querySelectorAll('[data-nav-group]').forEach(group => setLessonGroup(group, false));
      if (willOpen) setLessonGroup(selectedGroup, true);
    });
  });
  mobileQuery.addEventListener('change', syncLessonGroups);
  syncLessonGroups();

  allDropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.nav-dropdown-toggle');
    const links = Array.from(dropdown.querySelectorAll('.nav-dropdown-menu a'));
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) {
        dropdown.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
    toggle.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      closeAllDropdowns();
      dropdown.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      links[0]?.focus();
    });
  });

  navHamburger.addEventListener('click', function (event) {
    event.stopPropagation();
    const isOpen = navMenu.classList.toggle('open');
    this.setAttribute('aria-expanded', String(isOpen));
    closeAllDropdowns();
  });

  document.addEventListener('click', function () {
    closeAllDropdowns();
    closeNavMenu();
  });
  navMenu.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    const openToggle = document.querySelector('.nav-dropdown.open .nav-dropdown-toggle');
    const menuWasOpen = navMenu.classList.contains('open');
    closeAllDropdowns();
    closeNavMenu();
    if (openToggle) openToggle.focus();
    else if (menuWasOpen) navHamburger.focus();
  });

  const btt = document.createElement('button');
  btt.id = 'back-to-top';
  btt.type = 'button';
  btt.setAttribute('aria-label', curLang === 'en' ? 'Back to top' : 'กลับด้านบน');
  btt.setAttribute('aria-hidden', 'true');
  btt.tabIndex = -1;
  btt.textContent = '↑';
  document.body.appendChild(btt);
  function updateBackToTop() {
    const visible = window.scrollY > 320;
    btt.classList.toggle('visible', visible);
    btt.setAttribute('aria-hidden', String(!visible));
    btt.tabIndex = visible ? 0 : -1;
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  updateBackToTop();
  btt.addEventListener('click', function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  document.getElementById('dark-toggle-btn').addEventListener('click', function () {
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
