const NAV_LESSON_GROUPS = [
  {
    id: 'fundamentals',
    label_th: 'พื้นฐานไฟฟ้า',
    label_en: 'Electrical Fundamentals',
    items: [
      { id: 'electricity', href: 'electricity.html', label_th: '⚡ ไฟฟ้าเบื้องต้น', label_en: '⚡ Electricity Basics' },
      { id: 'ohm', href: 'ohm.html', label_th: '🔢 กฎของโอห์ม', label_en: "🔢 Ohm's Law" },
      { id: 'kirchhoff', href: 'kirchhoff.html', label_th: '🔗 กฎของเคอร์ชฮอฟฟ์', label_en: "🔗 Kirchhoff's Laws" },
    ],
  },
  {
    id: 'components',
    label_th: 'อุปกรณ์อิเล็กทรอนิกส์',
    label_en: 'Electronic Components',
    items: [
      { id: 'resistor', href: 'resistor.html', label_th: '🎨 ตัวต้านทาน', label_en: '🎨 Resistor' },
      { id: 'diode', href: 'diode.html', label_th: '💡 ไดโอด', label_en: '💡 Diode' },
      { id: 'capacitor', href: 'capacitor.html', label_th: '🔋 ตัวเก็บประจุ', label_en: '🔋 Capacitor' },
      { id: 'transistor', href: 'transistor.html', label_th: '🎚️ ทรานซิสเตอร์', label_en: '🎚️ Transistor' },
      { id: 'igbt', href: 'igbt.html', label_th: '⚡ IGBT ทรานซิสเตอร์กำลัง', label_en: '⚡ IGBT Power Transistor' },
      { id: 'thyristor', href: 'thyristor.html', label_th: '🔺 ไทริสเตอร์ SCR/TRIAC', label_en: '🔺 Thyristors (SCR/TRIAC)' },
      { id: 'inductor', href: 'inductor.html', label_th: '🌀 ตัวเหนี่ยวนำ', label_en: '🌀 Inductor' },
      { id: 'transformer', href: 'transformer.html', label_th: '🔄 หม้อแปลงไฟฟ้า', label_en: '🔄 Transformer' },
      { id: 'relay', href: 'relay.html', label_th: '🧲 รีเลย์', label_en: '🧲 Relay' },
      { id: 'opto', href: 'optoelectronics.html', label_th: '🔦 ออปโตอิเล็กทรอนิกส์', label_en: '🔦 Optoelectronics' },
      { id: 'power-supply', href: 'power-supply.html', label_th: '🔌 แหล่งจ่ายไฟ', label_en: '🔌 Power Supply' },
      { id: 'inverter', href: 'inverter.html', label_th: '🔁 อินเวอร์เตอร์ / VFD', label_en: '🔁 Inverter / VFD' },
    ],
  },
  {
    id: 'ic-digital',
    label_th: 'วงจรรวมและดิจิทัล',
    label_en: 'ICs & Digital',
    items: [
      { id: 'ic', href: 'ic.html', label_th: '🧩 IC วงจรรวม', label_en: '🧩 IC (Integrated Circuit)' },
      { id: 'timer555', href: '555.html', label_th: '⏱️ IC ตั้งเวลา 555', label_en: '⏱️ 555 Timer' },
      { id: 'opamp', href: 'op-amp.html', label_th: '📐 ออปแอมป์', label_en: '📐 Op-Amp' },
      { id: 'logic', href: 'logic-gates.html', label_th: '🔢 ลอจิกเกต', label_en: '🔢 Logic Gates' },
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

// เมนูบนสุดของตัวเอง (ไม่อยู่ใน mega menu บทเรียน) — กลุ่มที่โตได้เรื่อยๆ ตามเครื่องใช้ไฟฟ้าที่เพิ่ม
const NAV_REPAIR = [
  { id: 'repair-fan', href: 'fan-motor.html', label_th: '🌀 มอเตอร์พัดลมไฟฟ้า', label_en: '🌀 Electric Fan Motor' },
  { id: 'repair-smps', href: 'switching-psu.html', label_th: '🔌 ภาคจ่ายไฟสวิตชิ่ง (LNK304)', label_en: '🔌 Switching PSU (LNK304)' },
  { id: 'repair-stove', href: 'induction-stove.html', label_th: '🔥 เตาแม่เหล็กไฟฟ้า', label_en: '🔥 Induction Stove' },
  { id: 'repair-microwave', href: 'microwave.html', label_th: '📡 เตาไมโครเวฟ', label_en: '📡 Microwave Oven' },
  { id: 'repair-water-heater', href: 'water-heater.html', label_th: '🚿 เครื่องทำน้ำอุ่น', label_en: '🚿 Water Heater' },
  { id: 'repair-rice-cooker', href: 'rice-cooker.html', label_th: '🍚 หม้อหุงข้าว', label_en: '🍚 Rice Cooker' },
  // เครื่องซักผ้าแยกเป็น 4 บรรทัดติดกัน — หน้าแรกคือหน้าเลือกชนิดเครื่อง อีก 3 คือหน้าลูก
  { id: 'repair-washing-machine', href: 'washing-machine.html', label_th: '🧺 เครื่องซักผ้า', label_en: '🧺 Washing Machine' },
  { id: 'repair-wm-twin', sub: true, href: 'washing-machine-twin.html', label_th: '⚙️ เครื่อง 2 ถัง (กลไก)', label_en: '⚙️ Twin Tub (Mechanical)' },
  { id: 'repair-wm-top', sub: true, href: 'washing-machine-top.html', label_th: '🔁 ฝาบนอินเวอร์เตอร์', label_en: '🔁 Inverter Top Loader' },
  { id: 'repair-wm-front', sub: true, href: 'washing-machine-front.html', label_th: '🚪 ฝาหน้า Direct Drive', label_en: '🚪 Front Loader (DD)' },
  { id: 'repair-iron', href: 'iron.html', label_th: '🔌 เตารีดไฟฟ้า', label_en: '🔌 Electric Iron' },
];

const NAV_TOOLS = [
  { id: 'simulation', href: 'simulation.html', label_th: '🔬 จำลองวงจร', label_en: '🔬 Circuit Sim' },
  { id: 'breadboard', href: 'breadboard.html', label_th: '🔧 ทดลองบนเบรดบอร์ด', label_en: '🔧 Breadboard Lab' },
  { id: 'relay-lab', href: 'relay-lab.html', label_th: '🎛 ห้องแล็บรีเลย์ MY4', label_en: '🎛 Relay Lab (MY4)' },
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

  // แต่ละหน้าประกาศ `const CURRENT_PAGE = '...'` ซึ่ง **const ไม่ผูกเข้ากับ window**
  // (อ่านผ่าน window.CURRENT_PAGE จะได้ undefined เสมอ → เมนูไม่ไฮไลต์หน้าปัจจุบันเลย)
  const cur = typeof CURRENT_PAGE !== 'undefined' ? CURRENT_PAGE : (window.CURRENT_PAGE || '');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const curLang = document.documentElement.lang || 'th';
  const lessonPages = NAV_LESSON_GROUPS.flatMap(group => group.items);
  const lessonsActive = lessonPages.some(page => page.id === cur);
  const practiceActive = NAV_PRACTICE.some(page => page.id === cur);
  const repairActive = NAV_REPAIR.some(page => page.id === cur);
  const toolsActive = NAV_TOOLS.some(page => page.id === cur);
  const resourcesActive = NAV_RESOURCES.some(page => page.id === cur);

  // page.sub = true → เยื้องเข้าไปใต้รายการก่อนหน้า (ใช้กับหน้าลูกที่อยู่ใต้หน้าฮับ เช่น เครื่องซักผ้า 3 แบบ)
  function renderLink(page, className = '') {
    const classes = [className, page.sub ? 'nav-sub' : '', page.id === cur ? 'active' : ''].filter(Boolean).join(' ');
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
  const repairItems = NAV_REPAIR.map(page => renderLink(page)).join('');
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
          <div class="nav-dropdown" id="nav-dropdown-repair">
            <button class="nav-dropdown-toggle${repairActive ? ' active' : ''}" type="button" aria-controls="nav-dropdown-repair-menu" aria-expanded="false" aria-haspopup="true">
              <span class="th-only">งานซ่อม</span><span class="en-only">Repair</span> <span class="nav-chevron">▼</span>
            </button>
            <div class="nav-dropdown-menu" id="nav-dropdown-repair-menu">${repairItems}</div>
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

  // ── บรรทัด "ครอบคลุมเนื้อหาจาก N หัวข้อ": เติมเข้า footer ทุกหน้าอัตโนมัติ (bilingual) ──
  // แหล่งความจริงเดียว — แก้เลขที่ TOPIC_COUNT ที่เดียว ทุกหน้าอัปเดตพร้อมกัน (อย่า hardcode ในแต่ละหน้า)
  const TOPIC_COUNT = 47;
  const pageFooter = document.querySelector('footer');
  if (pageFooter && !pageFooter.querySelector('.footer-topics')) {
    const topics = document.createElement('div');
    topics.className = 'footer-topics';
    topics.innerHTML =
      '<span class="th-only">ครอบคลุมเนื้อหาจาก ' + TOPIC_COUNT + ' หัวข้อ</span>' +
      '<span class="en-only">Covering ' + TOPIC_COUNT + ' topics</span>';
    pageFooter.appendChild(topics);
  }

  // ── เครดิตผู้พัฒนา: เติมเข้า footer ทุกหน้าอัตโนมัติ (bilingual) ──
  // แหล่งความจริงเดียว — อย่า hardcode ชื่อผู้พัฒนาซ้ำในแต่ละหน้า
  const AUTHOR_TH   = 'ประเสริฐ บำเพ็ญ';
  const AUTHOR_EN   = 'Prasert Bumphen';
  const AUTHOR_URL  = 'https://github.com/josiamu';
  if (pageFooter && !pageFooter.querySelector('.footer-credit')) {
    const credit = document.createElement('div');
    credit.className = 'footer-credit';
    credit.innerHTML =
      '<span class="th-only">พัฒนาโดย <strong>' + AUTHOR_TH + '</strong></span>' +
      '<span class="en-only">Developed by <strong>' + AUTHOR_EN + '</strong></span> · ' +
      '<a href="' + AUTHOR_URL + '" target="_blank" rel="noopener">GitHub</a>';
    pageFooter.appendChild(credit);
  }

  // ── <meta name="author"> ทุกหน้า (สำหรับ search engine / ตัวอ่านอัตโนมัติ) ──
  if (!document.querySelector('meta[name="author"]')) {
    const meta = document.createElement('meta');
    meta.name = 'author';
    meta.content = AUTHOR_TH + ' (' + AUTHOR_EN + ')';
    document.head.appendChild(meta);
  }

  // ── สัญญาอนุญาต: เติมบรรทัด CC BY-NC 4.0 เข้า footer ทุกหน้าอัตโนมัติ (bilingual) ──
  if (pageFooter && !pageFooter.querySelector('.footer-license')) {
    const lic = document.createElement('div');
    lic.className = 'footer-license';
    lic.innerHTML =
      '<a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="license noopener">' +
        '<span class="th-only">© 2026 · เนื้อหาและโค้ดต้นฉบับเผยแพร่ภายใต้สัญญาอนุญาต CC BY-NC 4.0 — เรียนได้ฟรี ห้ามใช้เชิงพาณิชย์</span>' +
        '<span class="en-only">© 2026 · Original content &amp; code licensed under CC BY-NC 4.0 — free to learn, non-commercial</span>' +
      '</a>';
    pageFooter.appendChild(lic);
  }

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
