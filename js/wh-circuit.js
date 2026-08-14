/* wh-circuit.js — Interactive step-by-step water-heater circuit (water-heater.html, #whc-canvas)
 *
 * วงจรจริงของเครื่องทำน้ำอุ่นคือ **วงจรอนุกรมวงจรเดียว**:
 *   L → ELCB → สวิตช์เปิด-ปิด/เลือกกำลัง → ฟลุกซ์สวิตช์ → เทอร์โมสตัท → เทอร์มอลคัตเอาต์ → ฮีตเตอร์ → N
 *   สายดินต่อจากตัวถังลงกราวด์ **ไม่ได้อยู่ในวงจรทำงาน** (เส้นประ) — มีไว้รับกระแสรั่วอย่างเดียว
 *
 * หัวใจของการสอน: จุดวัดตามข้อต่อทุกด่านจะบอกว่า "ยังมีไฟ 220V อยู่ไหม"
 *   → จุดแรกที่ไฟหายไป = ด่านที่ขาด นั่นคือวิธีไล่ซ่อมจริงทั้งหมดของเครื่องนี้
 *   และ **ฟลุกซ์สวิตช์เป็นด่านเดียวที่เป็น NO** ตอนน้ำไม่ไหลมันเปิดวงจรอยู่ = ปกติ ไม่ใช่ของเสีย
 *   (ปุ่มเปิด/ปิดน้ำในซิมทำให้เห็นข้อนี้ได้ทันที)
 *
 * 7 ขั้น: 1 ภาพรวมวงจรอนุกรม → 2 ELCB → 3 สวิตช์เปิด-ปิด → 4 ฟลุกซ์สวิตช์ (NO)
 *        → 5 เทอร์โมสตัท → 6 เทอร์มอลคัตเอาต์ → 7 ฮีตเตอร์ + สายดิน (+ รุ่นดิจิทัลแทรกไทริสเตอร์)
 * อาการเสีย 6 แบบ ตรงกับคลินิกในหน้าเดียวกัน · จุดที่วิ่ง = กระแสสมมติ (+ → −)
 * ใช้ CSS ชุด .bs-* ร่วมกับซิมทีละขั้นหน้าอื่น และ query .bs-tab/.bs-desc เฉพาะใน wrap ตัวเอง
 */
(function () {
  const root = document.getElementById('wh-circuit');
  const cv = document.getElementById('whc-canvas');
  if (!root || !cv) return;
  const ctx = cv.getContext('2d');

  const W = 940, H = 420;
  const L_Y = 120, N_Y = 300, EARTH_Y = 366;
  const X0 = 55, X1 = 885;                       // ปลายซ้าย (ขั้ว L/N) และปลายขวา (ฮีตเตอร์)
  const HEAT_X = 800;
  const BLUE = '#2563eb', GREEN = '#10b981', ORANGE = '#f59e0b', RED = '#ef4444', VIOLET = '#8b5cf6';

  /* ---------- อุปกรณ์บนเส้น L เรียงตามลำดับจริง ---------- */
  const LINKS = [
    { id: 'elcb',  x: 130, w: 74, step: 2, th: 'ELCB',            en: 'ELCB',          kind: 'elcb' },
    { id: 'sw',    x: 265, w: 62, step: 3, th: 'สวิตช์เปิด-ปิด',   en: 'power switch',  kind: 'sw' },
    { id: 'flow',  x: 395, w: 62, step: 4, th: 'ฟลุกซ์สวิตช์ (NO)', en: 'flow switch (NO)', kind: 'flow' },
    { id: 'stat',  x: 525, w: 62, step: 5, th: 'เทอร์โมสตัท',      en: 'thermostat',    kind: 'nc' },
    { id: 'tco',   x: 655, w: 62, step: 6, th: 'เทอร์มอลคัตเอาต์', en: 'thermal cutout', kind: 'nc' }
  ];

  /* ---------- อาการเสีย (ตรงกับคลินิก 6 เคสในหน้า) ---------- */
  const FAULTS = {
    ok:      { th: 'วงจรปกติ — เปิดน้ำแล้วครบทุกด่าน ฮีตเตอร์ทำงาน',
               en: 'Healthy — with the water on, every link closes and the element runs' },
    leak:    { open: 'elcb', trip: true,
               th: 'ฮีตเตอร์รั่วลงตัวถัง → ELCB ตัดตั้งแต่ด่านแรก · <b>ELCB ตัดคือมันทำงานถูกต้อง ห้ามลัดข้ามเด็ดขาด</b> ให้วัดฉนวนฮีตเตอร์เทียบตัวถัง',
               en: 'The element is leaking to the body → the ELCB opens at the very first link. <b>A tripping ELCB is doing its job — never bypass it</b>; measure the element-to-body insulation instead' },
    flowbad: { open: 'flow',
               th: 'ฟลุกซ์สวิตช์ไม่ทำงาน (ไดอะแฟรมแข็ง/ตะกรันอุด/แรงดันน้ำไม่พอ) → เปิดน้ำแรงแค่ไหนก็ไม่ต่อวงจร ไฟค้างอยู่แค่ก่อนด่านนี้',
               en: 'The flow switch never closes (stiff diaphragm, scale, or too little pressure) → no matter how hard you open the tap the circuit stays broken, and the voltage stops just before it' },
    stat:    { open: 'stat',
               th: 'เทอร์โมสตัทตัดค้าง → ไฟหายหลังด่านนี้ · <b>ต้องหาสาเหตุที่ทำให้ร้อนเกินก่อนเปลี่ยน</b> (น้ำไหลอ่อน/ตะกรันหุ้มฮีตเตอร์)',
               en: 'The thermostat is stuck open → the voltage dies after this link. <b>Find what overheated it before replacing</b> (weak flow, or scale wrapping the element)' },
    tco:     { open: 'tco',
               th: 'เทอร์มอลคัตเอาต์ขาดถาวร → เป็นด่านสุดท้ายก่อนฮีตเตอร์ · ตัวนี้ตัดแล้วตัดเลย ไม่กลับเอง แปลว่าเคยร้อนจัดมาก่อนแน่นอน',
               en: 'The thermal cutout has opened for good → the last link before the element. It never resets itself, so something really did overheat' },
    element: { open: 'element',
               th: 'ฮีตเตอร์ขาด (วัดได้ OL) → ไฟมาครบทุกด่านแต่ไม่มีกระแสไหล ไฟโชว์ติดแต่น้ำไม่ร้อนเลย',
               en: 'The element is open (reads OL) → every link has voltage but no current flows: the lamp is on and the water stays cold' }
  };

  /* ---------- state ---------- */
  let step = 1, tStep = 0, flowT = 0, playing = false, fault = 'ok', water = true, last = performance.now();

  const isEN = () => document.documentElement.lang === 'en';
  const t = (th, en) => (isEN() ? en : th);
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const F = () => FAULTS[fault];

  // ด่านนี้ปิดวงจรอยู่ไหม
  function closed(id) {
    if (F().open === id) return false;
    if (id === 'flow') return water;              // NO: ต่อวงจรเฉพาะตอนน้ำไหล
    return true;
  }
  // ครบวงจรจนถึงฮีตเตอร์และมีกระแสไหลจริงไหม
  function running() {
    return LINKS.every(l => closed(l.id)) && F().open !== 'element';
  }
  // ยังมีไฟถึงข้อต่อ "หลังด่านที่ i" ไหม (i = -1 คือขั้ว L)
  function liveAfter(i) {
    for (let k = 0; k <= i; k++) if (!closed(LINKS[k].id)) return false;
    return true;
  }

  /* ---------- drawing helpers ---------- */
  function line(pts, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function dash(pts, color, w) {
    ctx.save(); ctx.setLineDash([6, 5]); line(pts, color, w || 1.8); ctx.restore();
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function label(x, y, s, color, size, align, weight) {
    ctx.font = (weight || 600) + ' ' + (size || 11) + 'px Anuphan, sans-serif';
    ctx.textAlign = align || 'center'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function glow(pts, color, on) {
    if (!on) return;
    ctx.save(); ctx.globalAlpha = 0.16 + 0.10 * Math.sin(tStep * 4);
    line(pts, color, 14); ctx.restore();
  }
  function pathLen(p) {
    let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return L;
  }
  function pointAt(p, d) {
    let acc = 0;
    for (let i = 1; i < p.length; i++) {
      const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (acc + seg >= d) {
        const k = (d - acc) / seg;
        return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
      }
      acc += seg;
    }
    return p[p.length - 1];
  }
  function flowDots(p, color, speed, on) {
    if (!on) return;
    const L = pathLen(p), gap = 40, off = (flowT * speed) % gap;
    for (let d = off; d < L; d += gap) {
      const [x, y] = pointAt(p, d);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 7); ctx.fill();
      ctx.globalAlpha = .25;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  const LOOP = () => ([[X0, L_Y], [HEAT_X, L_Y], [HEAT_X, N_Y], [X0, N_Y], [X0, L_Y]]);

  /* ---------- parts ---------- */
  function drawTerminals() {
    const txt = css('--text');
    line([[X0, L_Y], [X0, N_Y]], txt, 2);
    label(X0 - 10, L_Y + 4, 'L', RED, 13, 'right', 700);
    label(X0 - 10, N_Y + 4, 'N', BLUE, 13, 'right', 700);
    label(X0 - 10, (L_Y + N_Y) / 2 + 4, '220V~', css('--text-light'), 11, 'right', 700);
  }

  function drawSwitchBody(l, hot) {
    const on = closed(l.id), y = L_Y;
    const brokenHere = F().open === l.id;
    const c = brokenHere ? RED : hot ? VIOLET : on ? css('--text') : ORANGE;
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot || brokenHere ? 2.8 : 2;
    rrect(l.x, y - 22, l.w, 44, 8); ctx.fill(); ctx.stroke();

    // contact drawn open or closed
    const cx0 = l.x + 12, cx1 = l.x + l.w - 12;
    ctx.strokeStyle = on ? GREEN : brokenHere ? RED : ORANGE; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(cx0, y, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx1, y, 3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx0, y);
    if (on) ctx.lineTo(cx1, y); else ctx.lineTo(cx1 - 4, y - 14);
    ctx.stroke();

    label(l.x + l.w / 2, y - 30, t(l.th, l.en), hot ? VIOLET : css('--text-light'), 10.5, 'center', 700);
    if (l.kind === 'flow') {
      label(l.x + l.w / 2, y + 42, water ? t('น้ำไหล → ต่อ', 'flowing → closed')
                                        : t('น้ำไม่ไหล → เปิด', 'no flow → open'),
            water ? GREEN : ORANGE, 10, 'center', 700);
    } else if (l.kind !== 'elcb') {
      label(l.x + l.w / 2, y + 42, 'NC', css('--text-light'), 9.5, 'center');
    }
  }

  function drawElcb(l, hot) {
    drawSwitchBody(l, hot);
    // toroid hint under the ELCB: it watches L and N together
    const cx = l.x + l.w / 2;
    ctx.strokeStyle = F().trip ? RED : hot ? VIOLET : css('--border'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, (L_Y + N_Y) / 2, 26, 16, 0, 0, 7); ctx.stroke();
    dash([[cx, L_Y + 22], [cx, (L_Y + N_Y) / 2 - 16]], F().trip ? RED : css('--border'), 1.4);
    dash([[cx, (L_Y + N_Y) / 2 + 16], [cx, N_Y]], F().trip ? RED : css('--border'), 1.4);
    label(cx, (L_Y + N_Y) / 2 + 34, t('วัดผลต่าง L กับ N', 'compares L and N'),
          F().trip ? RED : css('--text-light'), 9.5, 'center');
  }

  function drawHeater(hot) {
    const on = running(), broken = F().open === 'element';
    const c = broken ? RED : hot ? ORANGE : css('--text');
    ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = hot || broken ? 2.8 : 2;
    rrect(HEAT_X - 46, L_Y + 26, 92, N_Y - L_Y - 52, 10); ctx.fill(); ctx.stroke();
    // element coil, glowing when current actually flows
    ctx.save();
    ctx.strokeStyle = on ? 'rgba(239,68,68,' + (0.55 + 0.35 * Math.sin(tStep * 5)) + ')'
                        : broken ? RED : css('--text-light');
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, y = L_Y + 44 + u * (N_Y - L_Y - 88), x = HEAT_X - 22 * Math.sin(u * Math.PI * 5);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.restore();
    if (broken) {
      dash([[HEAT_X - 26, (L_Y + N_Y) / 2], [HEAT_X + 26, (L_Y + N_Y) / 2]], RED, 2.6);
      label(HEAT_X, (L_Y + N_Y) / 2 - 8, t('ขาด', 'open'), RED, 11, 'center', 700);
    }
    label(HEAT_X, L_Y + 16, t('ฮีตเตอร์', 'element'), hot ? ORANGE : css('--text-light'), 11, 'center', 700);
    label(HEAT_X, N_Y - 14, on ? t('กำลังต้มน้ำ', 'heating') : t('ไม่ทำงาน', 'idle'),
          on ? RED : css('--text-light'), 10.5, 'center', 700);

    // earth wire from the body — deliberately drawn dashed, outside the working loop
    const eHot = step === 7 || fault === 'leak';
    dash([[HEAT_X + 46, (L_Y + N_Y) / 2], [X1 - 20, (L_Y + N_Y) / 2], [X1 - 20, EARTH_Y - 16]],
         eHot ? GREEN : css('--border'), eHot ? 2.4 : 1.6);
    const ex = X1 - 20, c2 = eHot ? GREEN : css('--text-light');
    line([[ex - 14, EARTH_Y - 16], [ex + 14, EARTH_Y - 16]], c2, 2.6);
    line([[ex - 9, EARTH_Y - 10], [ex + 9, EARTH_Y - 10]], c2, 2.2);
    line([[ex - 4, EARTH_Y - 4], [ex + 4, EARTH_Y - 4]], c2, 2);
    label(ex, EARTH_Y + 12, t('สายดิน', 'earth'), c2, 10.5, 'center', 700);
  }

  // ป้ายจุดวัด: มีไฟ 220V ถึงข้อต่อนี้ไหม — จุดแรกที่กลายเป็น 0V คือด่านที่ขาด
  function drawProbes() {
    const y = L_Y - 52;
    for (let i = -1; i < LINKS.length; i++) {
      const x = i < 0 ? X0 + 26 : LINKS[i].x + LINKS[i].w + 14;
      const live = liveAfter(i);
      const txt = live ? '220V' : '0V';
      const c = live ? GREEN : RED;
      ctx.font = '700 10px Anuphan, sans-serif';
      const w = 42;
      ctx.fillStyle = css('--card'); ctx.strokeStyle = c; ctx.lineWidth = 1.4;
      rrect(x - w / 2, y - 9, w, 18, 5); ctx.fill(); ctx.stroke();
      label(x, y + 4, txt, c, 10, 'center', 700);
      dash([[x, y + 9], [x, L_Y - 22]], c, 1.2);
    }
  }

  function statusBar() {
    const f = F(), on = running();
    const msg = fault === 'ok'
      ? (water ? t('✅ ครบวงจร — กระแสไหลผ่านฮีตเตอร์ น้ำร้อน',
                   '✅ The loop is complete — current flows through the element and the water heats')
               : t('🚿 ปิดน้ำอยู่ → ฟลุกซ์สวิตช์เปิดวงจร ฮีตเตอร์ไม่ทำงาน — <b>นี่คือสภาพปกติ ไม่ใช่ของเสีย</b>',
                   '🚿 Water off → the flow switch holds the circuit open and nothing heats — <b>this is normal, not a fault</b>'))
      : t(f.th, f.en);
    const bad = fault !== 'ok';
    ctx.fillStyle = bad ? 'rgba(239,68,68,.10)' : on ? 'rgba(16,185,129,.10)' : 'rgba(245,158,11,.12)';
    ctx.strokeStyle = bad ? RED : on ? GREEN : ORANGE; ctx.lineWidth = 1.4;
    rrect(X0 - 10, EARTH_Y + 22, 830, 26, 8); ctx.fill(); ctx.stroke();
    label(X0 + 4, EARTH_Y + 39, msg.replace(/<\/?b>/g, ''),
          bad ? RED : on ? GREEN : ORANGE, 11, 'left', 700);
  }

  /* ---------- main draw ---------- */
  function draw() {
    const txt = css('--text'), dim = css('--text-light');
    ctx.clearRect(0, 0, W, H);
    const on = running();

    glow(LOOP(), GREEN, step === 1 && on);

    // rails
    line([[X0, L_Y], [HEAT_X - 46, L_Y]], step === 1 ? RED : txt, 2.6);
    line([[HEAT_X + 46, L_Y], [HEAT_X + 46, L_Y]], txt, 2.6);
    line([[X0, N_Y], [HEAT_X, N_Y]], step === 1 ? BLUE : txt, 2.6);
    line([[HEAT_X, L_Y], [HEAT_X, L_Y + 26]], txt, 2.6);
    line([[HEAT_X, N_Y - 26], [HEAT_X, N_Y]], txt, 2.6);

    drawTerminals();
    LINKS.forEach(l => {
      const hot = step === l.step;
      if (l.kind === 'elcb') drawElcb(l, hot); else drawSwitchBody(l, hot);
    });
    drawHeater(step === 7);
    drawProbes();

    // water pipe under the flow switch
    const fx = LINKS[2].x + LINKS[2].w / 2;
    const pipeY = N_Y + 44;
    line([[fx - 90, pipeY], [fx + 90, pipeY]], water ? '#38bdf8' : dim, water ? 8 : 4);
    label(fx - 100, pipeY + 4, t('น้ำ', 'water'), water ? '#38bdf8' : dim, 10.5, 'right', 700);
    if (water) {
      for (let i = 0; i < 5; i++) {
        const p = ((flowT * 0.6 + i * 0.2) % 1);
        ctx.fillStyle = '#7dd3fc';
        ctx.beginPath(); ctx.arc(fx - 90 + p * 180, pipeY, 3, 0, 7); ctx.fill();
      }
      dash([[fx, pipeY - 8], [fx, L_Y + 24]], '#38bdf8', 1.4);
      label(fx + 96, pipeY + 4, t('ดันไดอะแฟรม → สวิตช์ต่อ', 'pushes the diaphragm → contact closes'),
            '#38bdf8', 10, 'left', 700);
    } else {
      label(fx + 96, pipeY + 4, t('ไม่มีแรงดันน้ำ → สวิตช์เปิดค้าง', 'no pressure → the switch stays open'),
            ORANGE, 10, 'left', 700);
    }

    // current dots around the loop only when the circuit is genuinely complete
    flowDots(LOOP(), GREEN, 110, on);

    if (step === 1) {
      label(W / 2, 34, t('วงจรอนุกรมวงจรเดียว — ไฟต้องผ่านครบทุกด่านถึงจะถึงฮีตเตอร์',
                         'One series loop — the current must clear every link to reach the element'),
            txt, 12.5, 'center', 700);
    }
    statusBar();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; tStep += dt; flowT += dt;
    if (playing && tStep > 4.5) setStep(step % 7 + 1, true);
    if (!document.hidden) draw();
    requestAnimationFrame(frame);
  }

  /* ---------- UI ---------- */
  const tabs = [...root.querySelectorAll('.bs-tab')];
  const descs = [...root.querySelectorAll('.bs-desc')];
  const playBtn = document.getElementById('whc-play');
  const waterBtn = document.getElementById('whc-water');
  const faultSel = document.getElementById('whc-fault');

  function setStep(n, keepPlaying) {
    step = Math.max(1, Math.min(7, n));
    tStep = 0;
    if (!keepPlaying) { playing = false; playBtn.classList.remove('active'); }
    tabs.forEach(b => b.classList.toggle('active', +b.dataset.step === step));
    descs.forEach(d => d.classList.toggle('active', +d.dataset.step === step));
  }
  function syncWater() {
    waterBtn.classList.toggle('active', water);
    waterBtn.querySelectorAll('.whc-on').forEach(e => e.style.display = water ? '' : 'none');
    waterBtn.querySelectorAll('.whc-off').forEach(e => e.style.display = water ? 'none' : '');
  }

  tabs.forEach(b => b.addEventListener('click', () => setStep(+b.dataset.step)));
  document.getElementById('whc-prev').addEventListener('click', () => setStep(step === 1 ? 7 : step - 1));
  document.getElementById('whc-next').addEventListener('click', () => setStep(step === 7 ? 1 : step + 1));
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.classList.toggle('active', playing);
    if (playing) tStep = 0;
  });
  waterBtn.addEventListener('click', () => { water = !water; syncWater(); });
  faultSel.addEventListener('change', () => {
    fault = FAULTS[faultSel.value] ? faultSel.value : 'ok';
    root.querySelectorAll('.bs-faultnote').forEach(e => e.classList.toggle('active', fault !== 'ok'));
  });

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  setStep(1);
  syncWater();
  requestAnimationFrame(frame);
})();
