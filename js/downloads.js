(function () {
  const modal    = document.getElementById('pdf-modal');
  const iframe   = document.getElementById('pdf-modal-iframe');
  const titleEl  = document.getElementById('pdf-modal-title');
  const dlBtn    = document.getElementById('pdf-modal-dl');
  const closeBtn = document.getElementById('pdf-modal-close');
  let lastFocused = null;

  function openModal(pdfPath, title) {
    titleEl.textContent = title;
    dlBtn.href = pdfPath;
    dlBtn.download = pdfPath.split('/').pop();
    iframe.src = encodeURI(pdfPath);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    iframe.src = '';
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll('.pdf-card[data-pdf]').forEach(function (card) {
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    function openCard() {
      const lang = document.documentElement.lang === 'en' ? 'en' : 'th';
      const sel  = lang === 'en' ? '.en-only' : '.th-only';
      const t    = card.querySelector('.pdf-title ' + sel) || card.querySelector('.pdf-title');
      lastFocused = card;
      openModal(card.dataset.pdf, t ? t.textContent.trim() : '');
    }
    card.addEventListener('click', openCard);
    card.addEventListener('keydown', function (e) {
      if (e.target !== card) return;
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openCard();
    });
  });

  document.querySelectorAll('.pdf-dl').forEach(function (link) {
    link.addEventListener('click', function (e) { e.stopPropagation(); });
  });

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
})();

/* ── ค้นหา + กรองหมวด ─────────────────────────────────────── */
(function () {
  const search   = document.getElementById('dl-search');
  const chipBox  = document.getElementById('dl-chips');
  const noResult = document.getElementById('dl-noresult');
  if (!search || !chipBox) return;

  const sections = Array.from(document.querySelectorAll('.section[data-cat]'));
  let activeCat = 'all';

  const norm = function (s) { return (s || '').toLowerCase().trim(); };

  function apply() {
    const q = norm(search.value);
    let total = 0;
    sections.forEach(function (sec) {
      const catOk = activeCat === 'all' || sec.dataset.cat === activeCat;
      let shown = 0;
      sec.querySelectorAll('.pdf-card').forEach(function (card) {
        // textContent มีทั้งไทย-อังกฤษ (span ที่ซ่อนยังอยู่ใน DOM) → ค้นได้ทั้ง 2 ภาษา
        const show = catOk && (!q || norm(card.textContent).indexOf(q) !== -1);
        card.classList.toggle('dl-hidden', !show);
        if (show) shown++;
      });
      sec.classList.toggle('dl-hidden', shown === 0);
      total += shown;
    });
    if (noResult) noResult.hidden = total !== 0;
  }

  search.addEventListener('input', apply);

  chipBox.addEventListener('click', function (e) {
    const chip = e.target.closest('.dl-chip');
    if (!chip) return;
    activeCat = chip.dataset.cat;
    chipBox.querySelectorAll('.dl-chip').forEach(function (c) {
      c.classList.toggle('active', c === chip);
    });
    apply();
  });

  function setPlaceholder() {
    search.placeholder = document.documentElement.lang === 'en' ? 'Search files…' : 'ค้นหาไฟล์…';
  }
  setPlaceholder();
  window.addEventListener('langchange', setPlaceholder);

  // ── มาจากกล่องข่าวหน้าแรก (?cat=/?file=) → กรองหมวด + เลื่อนไป/ไฮไลต์การ์ดให้อัตโนมัติ ──
  (function fromNews() {
    var params = new URLSearchParams(location.search);
    var cat  = params.get('cat');
    var file = params.get('file');
    if (!cat && !file) return;

    if (cat) {
      var chip = chipBox.querySelector('.dl-chip[data-cat="' + cat + '"]');
      if (chip) {
        activeCat = cat;
        chipBox.querySelectorAll('.dl-chip').forEach(function (c) {
          c.classList.toggle('active', c === chip);
        });
      }
    }
    apply();

    var target = null;
    if (file) {
      document.querySelectorAll('.pdf-card[data-pdf]').forEach(function (c) {
        if (c.dataset.pdf === file) target = c;
      });
    } else {
      target = document.querySelector('.pdf-card:not(.dl-hidden)');
    }
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target.animate) {
        target.animate(
          [{ boxShadow: '0 0 0 3px var(--primary)' }, { boxShadow: '0 0 0 3px rgba(0,0,0,0)' }],
          { duration: 1800, easing: 'ease-out' }
        );
      }
    }
  })();
})();
