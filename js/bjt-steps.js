/* bjt-steps.js — Interactive step-by-step: how an NPN BJT works (5 steps)
 * ใช้ในหน้า transistor.html (#bs-canvas) — คลิกปุ่มขั้นที่ 1–5 แล้วภาพตัดขวางเปลี่ยนตามขั้น
 *   1 ไบอัส B-E → 2 อีมิตเตอร์ฉีดอิเล็กตรอน → 3 เบสจับคู่ ~1% (= I_B)
 *   → 4 คอลเลกเตอร์กวาด ~99% (= I_C) → 5 ผลลัพธ์: I_C = β·I_B
 */
(function () {
  const cv = document.getElementById('bs-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  /* ---------- geometry (logical coords) ---------- */
  const W = 680, H = 320;
  const TOP = 62, BOT = 196, MID = (TOP + BOT) / 2;
  const EX = 92, BL = 212, BR = 246, CX = 452;   // emitter x0, base left/right, collector x1
  const B_LEAD_X = 229, B_LEAD_Y = 268;
  const E_LEAD_X = 26, C_LEAD_X = 560;

  const GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', BLUE = '#2563eb';

  /* ---------- state ---------- */
  let step = 1;
  let tStep = 0;          // seconds since the current step was selected
  let playing = false;
  let last = performance.now();
  let parts = [];
  let spawnAcc = 0;
  let nSpawn = 0;         // counts spawned electrons → 1 in 8 becomes a base (recombining) one

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);

  const TITLES = [
    ['1 · ป้อน V_BE ≈ 0.7V → รอยต่อ B-E เปิด', '1 · Apply V_BE ≈ 0.7V → the B-E junction opens'],
    ['2 · อีมิตเตอร์ (N⁺) ฉีดอิเล็กตรอนเข้าเบส', '2 · The emitter (N⁺) injects electrons into the base'],
    ['3 · เบสบาง → จับคู่กับโฮลแค่ ~1% (= I_B)', '3 · Thin base → only ~1% recombines (= I_B)'],
    ['4 · รอยต่อ B-C ไบอัสย้อน → กวาด ~99% เข้า C (= I_C)', '4 · Reverse-biased B-C sweeps ~99% into C (= I_C)'],
    ['5 · ผลลัพธ์: I_C = β × I_B (พลังงานมาจาก V_CC)', '5 · Result: I_C = β × I_B (energy comes from V_CC)']
  ];

  /* ---------- helpers ---------- */
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function arrow(x1, y1, x2, y2, color, w) {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 4 + w;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * h, y2 - Math.sin(a) * h); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - h * Math.cos(a - 0.42), y2 - h * Math.sin(a - 0.42));
    ctx.lineTo(x2 - h * Math.cos(a + 0.42), y2 - h * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
  }

  /* ---------- particles ---------- */
  function spawn() {
    nSpawn++;
    parts.push({
      x: E_LEAD_X + 12,
      y: MID + (Math.random() - 0.5) * (BOT - TOP - 34),
      v: 74 + Math.random() * 26,
      kind: (step >= 3 && nSpawn % 8 === 0) ? 'base' : 'main',
      down: false
    });
  }

  function updateParts(dt) {
    // step 1 shows a still device: no injection yet
    if (step >= 2) {
      spawnAcc += dt;
      const rate = 0.055;                       // seconds per electron
      while (spawnAcc > rate) { spawnAcc -= rate; spawn(); }
    } else {
      parts = parts.filter(p => p.x < EX);      // let leftovers drain back out of view
    }

    const queueX = BR - 8;
    for (const p of parts) {
      if (p.kind === 'base' && !p.down && p.x >= BL + 8) p.down = true;

      if (p.down) {                             // recombines → leaves through the base lead
        p.x += (B_LEAD_X - p.x) * Math.min(1, dt * 5);
        p.y += p.v * dt * 0.9;
      } else if (step <= 3 && p.x > queueX) {   // B-C still blocking → electrons pile up in the base
        p.x = queueX + Math.sin(tStep * 6 + p.y) * 2;
      } else {
        p.x += p.v * dt;
      }
    }
    parts = parts.filter(p => p.x < C_LEAD_X + 20 && p.y < B_LEAD_Y + 14);
  }

  /* ---------- drawing ---------- */
  function drawBody() {
    const txt = css('--text'), light = css('--text-light'), border = css('--border');

    // leads
    ctx.strokeStyle = txt; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(E_LEAD_X, MID); ctx.lineTo(EX, MID);
    ctx.moveTo(CX, MID); ctx.lineTo(C_LEAD_X, MID);
    ctx.moveTo(B_LEAD_X, BOT); ctx.lineTo(B_LEAD_X, B_LEAD_Y);
    ctx.stroke();

    // blocks
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#dbeafe'; ctx.strokeStyle = BLUE;
    roundRect(EX, TOP, BL - EX, BOT - TOP, 4); ctx.fill(); ctx.stroke();
    roundRect(BR, TOP, CX - BR, BOT - TOP, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fee2e2'; ctx.strokeStyle = RED;
    ctx.beginPath(); ctx.rect(BL, TOP, BR - BL, BOT - TOP); ctx.fill(); ctx.stroke();

    // block labels
    ctx.textAlign = 'center'; ctx.fillStyle = '#1d4ed8';
    ctx.font = '700 19px Anuphan, sans-serif';
    ctx.fillText('N⁺', (EX + BL) / 2, MID + 2);
    ctx.fillText('N', (BR + CX) / 2, MID + 2);
    ctx.fillStyle = '#dc2626'; ctx.font = '700 15px Anuphan, sans-serif';
    ctx.fillText('P', (BL + BR) / 2, TOP - 10);
    ctx.fillStyle = '#475569'; ctx.font = '500 11px Anuphan, sans-serif';
    ctx.fillText('Emitter', (EX + BL) / 2, MID + 24);
    ctx.fillText('Collector', (BR + CX) / 2, MID + 24);
    ctx.fillStyle = light;
    ctx.fillText('Base', (BL + BR) / 2, TOP - 26);

    // terminal letters
    ctx.fillStyle = txt; ctx.font = '700 14px Anuphan, sans-serif';
    ctx.fillText('E', E_LEAD_X + 4, MID - 12);
    ctx.fillText('C', C_LEAD_X - 4, MID - 12);
    ctx.textAlign = 'left';
    ctx.fillText('B', B_LEAD_X + 8, B_LEAD_Y - 2);
    ctx.textAlign = 'center';

    // holes in the base — drawn as hollow circles, and there are few of them (that is the whole point)
    ctx.strokeStyle = 'rgba(220,38,38,.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const hy = TOP + 22 + i * 26;
      ctx.beginPath(); ctx.arc((BL + BR) / 2 + (i % 2 ? 6 : -6), hy, 3, 0, 7); ctx.stroke();
    }
    ctx.strokeStyle = border;
  }

  function drawJunctions() {
    // B-E depletion: collapses on step 1 (forward bias), stays open afterwards
    const shrink = step >= 1 ? Math.min(1, tStep / 0.7) : 0;
    const wBE = step === 1 ? 11 - 8 * shrink : 3;
    ctx.fillStyle = 'rgba(148,163,184,.5)';
    ctx.fillRect(BL - wBE, TOP, wBE * 2, BOT - TOP);

    // B-C depletion: wide (reverse biased). From step 4 it shows the sweeping field.
    const wBC = 15;
    ctx.fillStyle = step >= 4 ? 'rgba(37,99,235,.16)' : 'rgba(148,163,184,.5)';
    ctx.fillRect(BR - 3, TOP, wBC + 3, BOT - TOP);

    if (step >= 4) {                       // field arrows pulling electrons into the collector
      const ph = (tStep * 60) % 22;
      ctx.globalAlpha = .8;
      for (let y = TOP + 16; y < BOT - 6; y += 34) {
        arrow(BR - 2 + ph * 0.35, y, BR + wBC + 8 + ph * 0.35, y, BLUE, 1.6);
      }
      ctx.globalAlpha = 1;
    }
    if (step === 1) {                      // glow on the junction that is being switched on
      const g = 0.35 + 0.3 * Math.sin(tStep * 5);
      ctx.strokeStyle = `rgba(245,158,11,${g})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(BL, TOP - 4); ctx.lineTo(BL, BOT + 4); ctx.stroke();
    }
  }

  function drawParts() {
    for (const p of parts) {
      const c = p.down ? ORANGE : GREEN;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 7); ctx.fill();
      ctx.globalAlpha = .28;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6.5, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawAnnotations() {
    const light = css('--text-light');
    ctx.textAlign = 'center';
    ctx.font = '600 12px Anuphan, sans-serif';

    if (step === 1) {
      ctx.fillStyle = ORANGE;
      ctx.fillText(t('V_BE = 0.7V → แนวปลอดพาหะยุบ', 'V_BE = 0.7V → depletion region collapses'), (EX + BR) / 2, BOT + 34);
      ctx.fillStyle = light;
      ctx.fillText(t('ยังไม่มีกระแสไหล', 'no current yet'), (BR + CX) / 2, BOT + 34);
    }
    if (step === 2) {
      ctx.fillStyle = GREEN;
      ctx.fillText(t('อิเล็กตรอนถูกฉีดเข้าเบส (สมมติ 100 ตัว)', 'electrons injected into the base (say 100)'), (EX + BR) / 2 + 20, BOT + 34);
      ctx.fillStyle = light;
      ctx.fillText(t('B-C ยังปิดอยู่ → ไปต่อไม่ได้', 'B-C still blocks → they pile up'), (BR + CX) / 2 + 20, BOT + 34);
    }
    if (step === 3) {
      ctx.fillStyle = ORANGE;
      ctx.fillText(t('~1 ตัว จับคู่กับโฮล → ออกขา B = I_B', '~1 recombines with a hole → exits B = I_B'), 344, B_LEAD_Y + 6);
      ctx.fillStyle = light;
      ctx.fillText(t('เบสบาง + โฮลน้อย → เสียไปน้อยมาก', 'thin base, few holes → very little is lost'), (BR + CX) / 2 + 30, BOT + 34);
    }
    if (step === 4) {
      ctx.fillStyle = GREEN;
      ctx.fillText(t('~99 ตัว ถูกสนามไฟฟ้าดูดเข้า C = I_C', '~99 are swept into the collector = I_C'), (BR + CX) / 2 + 30, BOT + 34);
    }
    if (step === 5) {
      // ratio bar: 99 : 1
      const bx = 150, bw = 380, by = B_LEAD_Y + 22;
      ctx.fillStyle = GREEN; ctx.fillRect(bx, by, bw * 0.99, 12);
      ctx.fillStyle = ORANGE; ctx.fillRect(bx + bw * 0.99, by, bw * 0.01 + 3, 12);
      ctx.fillStyle = GREEN; ctx.textAlign = 'left';
      ctx.fillText(t('I_C ≈ 99 ตัว', 'I_C ≈ 99'), bx, by - 6);
      ctx.fillStyle = ORANGE; ctx.textAlign = 'right';
      ctx.fillText(t('I_B ≈ 1 ตัว', 'I_B ≈ 1'), bx + bw, by - 6);
      ctx.textAlign = 'center';
      ctx.fillStyle = BLUE; ctx.font = '700 15px Anuphan, sans-serif';
      ctx.fillText('I_C = β × I_B   (β ≈ 99)', 340, BOT + 36);
    }

    // step title
    ctx.textAlign = 'center';
    ctx.font = '700 14px Anuphan, sans-serif';
    ctx.fillStyle = css('--text');
    ctx.fillText(t(TITLES[step - 1][0], TITLES[step - 1][1]), W / 2, 28);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tStep += dt;

    if (playing && tStep > 4.2) setStep(step % 5 + 1, true);

    if (!document.hidden) {
      updateParts(dt);
      ctx.clearRect(0, 0, W, H);
      drawBody();
      drawJunctions();
      drawParts();
      drawAnnotations();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const root = document.getElementById('bjt-steps');
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('bs-play');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(5, n));
    tStep = 0;
    if (step === 1) parts = [];
    if (!keepPlaying) stopPlay();
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function stopPlay() {
    playing = false;
    if (playBtn) playBtn.classList.remove('active');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('bs-prev').addEventListener('click', () => setStep(step === 1 ? 5 : step - 1));
  document.getElementById('bs-next').addEventListener('click', () => setStep(step === 5 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });

  /* ---------- resize (HiDPI) ---------- */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  requestAnimationFrame(frame);
})();
