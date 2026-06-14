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
