/* ============================================================
   Interactive Fan Speed-Switch Simulator — fan-motor.html
   กดเบอร์ 0/1/2/3 แล้วดูว่าไฟวิ่งผ่านอะไรบ้าง
   ============================================================ */
(function () {
  const root = document.getElementById('fan-motor-sim');
  if (!root) return;

  const isEN = () => document.documentElement.lang === 'en';
  const T = (th, en) => (isEN() ? en : th);

  /* ---------- ค่าประจำแต่ละตำแหน่งสวิตช์ (ค่าโดยประมาณเพื่อการสอน) ---------- */
  const SPEEDS = {
    0: { v: 0,   pct: 0,   rpm: 0,    ohm: '—',     flow: 0 },
    1: { v: 165, pct: 56,  rpm: 950,  ohm: '160 Ω', flow: 0.75 },
    2: { v: 190, pct: 74,  rpm: 1150, ohm: '80 Ω',  flow: 0.86 },
    3: { v: 220, pct: 100, rpm: 1350, ohm: '0 Ω',   flow: 1 }
  };

  /* ---------- ตัวช่วยวาดขดลวด: n ลูก กว้างลูกละ w ---------- */
  const arcs = (n, rx, ry, w) => ` a${rx} ${ry} 0 0 1 ${w} 0`.repeat(n);

  /* ตำแหน่งหน้าสัมผัสในสวิตช์ (แขนปัดแตะได้ทีละอันเท่านั้น) */
  const PAD_Y = { 0: 60, 3: 110, 2: 160, 1: 210 };
  const FEED = 'M54,226 L54,160 L172,160';          /* สายไฟจากปลั๊กถึงแกนหมุนของสวิตช์ */

  /* เส้นทางกระแสหลัก: ปลั๊ก → สวิตช์ → (โช้ค) → จุดร่วม C */
  const MAIN = {
    0: `${FEED} L200,60`,
    1: `${FEED} L200,210 L265,210 L350,210 L350,330${arcs(6, 15, 12, 30)} L620,250`,
    2: `${FEED} L200,160 L265,160 L440,160 L440,330${arcs(3, 15, 12, 30)} L620,250`,
    3: `${FEED} L200,110 L265,110 L530,110 L530,330 L620,250`
  };
  /* สายที่มีอยู่จริงเสมอ (วาดเป็นสีจางไว้เป็นพื้น) */
  const BASE = [
    FEED,
    'M265,110 L530,110 L530,330',
    'M265,160 L440,160 L440,330',
    'M265,210 L350,210 L350,330',
    `M350,330${arcs(6, 15, 12, 30)}`,
    'M530,330 L620,250'
  ];
  /* จาก C แยก 2 ทาง แล้วกลับเข้านิวทรัล */
  const RUN   = `M620,250 L620,170 L650,170${arcs(6, 10, 10, 20)} L810,170 L810,430 L54,430 L54,274`;
  const START = `M620,250 L620,330 L650,330${arcs(6, 10, 10, 20)} L790,330 L790,380 L810,380 L810,430 L54,430 L54,274`;

  /* ---------- ใบพัด ---------- */
  const blade = a =>
    `<path d="M0,0 C14,-12 42,-18 47,-5 C41,11 15,11 0,0 z" transform="rotate(${a})"/>`;

  function svgMarkup() {
    return `
<svg id="fms-svg" viewBox="0 0 840 460" role="img"
     aria-label="${T('แผนภาพวงจรพัดลมแบบโต้ตอบ', 'Interactive fan circuit diagram')}">
  <defs>
    <filter id="fms-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.4" result="b"/><feMerge>
      <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- ตัวเรือนสวิตช์ (วาดเป็นพื้นก่อน สายไฟจึงพาดผ่านได้) -->
  <rect class="fms-box" x="150" y="32" width="125" height="208" rx="14"/>
  <text class="fms-lbl fms-dim" x="212" y="22" text-anchor="middle">${T('สวิตช์ความเร็ว', 'Speed switch')}</text>

  <!-- ทางเดินไฟทั้งหมด (สีจาง) -->
  <g class="fms-base">
    ${BASE.map(d => `<path d="${d}"/>`).join('')}
    <path d="${RUN}"/><path d="${START}"/>
  </g>

  <!-- ขดลวด -->
  <path class="fms-coil fms-c-choke" d="M350,330${arcs(6, 15, 12, 30)}"/>
  <path class="fms-coil fms-c-run"   d="M650,170${arcs(6, 10, 10, 20)}"/>
  <path class="fms-coil fms-c-start" d="M650,330${arcs(6, 10, 10, 20)}"/>

  <!-- แขนปัดของสวิตช์ -->
  <path id="fms-wiper" class="fms-wiper"/>

  <!-- เส้นทางที่มีไฟ (อัปเดตด้วย JS) -->
  <g id="fms-live">
    <path id="fms-live-main"  class="fms-live"/>
    <path id="fms-live-run"   class="fms-live fms-live-run"/>
    <path id="fms-live-start" class="fms-live fms-live-start"/>
  </g>
  <g id="fms-dots"></g>

  <!-- แหล่งจ่ายไฟบ้าน -->
  <circle class="fms-src" cx="54" cy="250" r="24"/>
  <path class="fms-sine" d="M40,250 q7,-13 14,0 q7,13 14,0"/>
  <text class="fms-val" x="82" y="252">${T('ไฟบ้าน 220V~', 'Mains 220V~')}</text>
  <text class="fms-lbl fms-dim" x="112" y="150" text-anchor="middle">L</text>
  <text class="fms-lbl fms-dim" x="300" y="448" text-anchor="middle">N</text>

  <!-- หน้าสัมผัสสวิตช์ -->
  ${Object.entries(PAD_Y).map(([n, y]) => `
  <g class="fms-pad" data-pad="${n}">
    <rect x="205" y="${y - 15}" width="60" height="30" rx="8"/>
    <text x="235" y="${y + 6}" text-anchor="middle">${n}</text>
  </g>`).join('')}
  <circle class="fms-pivot" cx="172" cy="160" r="5"/>

  <!-- ขดโช้ค -->
  <circle class="fms-tap" cx="440" cy="330" r="4"/>
  <text class="fms-val fms-c-choke-t" x="395" y="358" text-anchor="middle">80 Ω</text>
  <text class="fms-val fms-c-choke-t" x="485" y="358" text-anchor="middle">80 Ω</text>
  <text class="fms-name fms-c-choke-t" x="440" y="380" text-anchor="middle">${T('ขดโช้ค (Choke)', 'Choke winding')}</text>

  <!-- จุดร่วม C -->
  <circle class="fms-node-ring" cx="620" cy="250" r="11"/>
  <circle class="fms-node" cx="620" cy="250" r="5"/>
  <text class="fms-lbl" x="596" y="243" text-anchor="end">C</text>

  <!-- ขดรัน / ขดสตาร์ท -->
  <text class="fms-name fms-c-run-t"   x="700" y="146" text-anchor="middle">${T('ขดรัน (Run) 350 Ω', 'Run winding 350 Ω')}</text>
  <text class="fms-name fms-c-start-t" x="700" y="356" text-anchor="middle">${T('ขดสตาร์ท (Start) 400 Ω', 'Start winding 400 Ω')}</text>
  <circle class="fms-c-run-f" cx="790" cy="170" r="4"/>
  <text class="fms-lbl fms-c-run-t" x="792" y="192" text-anchor="middle">R</text>
  <circle class="fms-c-start-f" cx="778" cy="330" r="4"/>
  <text class="fms-lbl fms-c-start-t" x="770" y="318" text-anchor="middle">S</text>

  <!-- คาปาซิเตอร์ -->
  <line class="fms-cap" x1="776" y1="354" x2="804" y2="354"/>
  <line class="fms-cap" x1="776" y1="364" x2="804" y2="364"/>
  <text class="fms-val" x="770" y="404" text-anchor="end">${T('คาปาซิเตอร์ 2–3 µF', 'Capacitor 2–3 µF')}</text>
  <circle class="fms-tap fms-dimfill" cx="810" cy="380" r="4"/>

  <!-- โรเตอร์ + ใบพัด -->
  <circle class="fms-stator" cx="700" cy="250" r="46"/>
  <g id="fms-rotor" transform="translate(700,250)">
    <g class="fms-blades">${blade(0)}${blade(120)}${blade(240)}</g>
    <circle class="fms-hub" cx="0" cy="0" r="7"/>
  </g>
  <g id="fms-wind" class="fms-wind">
    <path d="M754,224 q16,26 0,52"/><path d="M766,216 q20,34 0,68"/><path d="M778,208 q24,42 0,84"/>
  </g>
</svg>`;
  }

  /* ============================================================ */
  const wrap = root.querySelector('#fms-canvas');
  const btns = [...root.querySelectorAll('.fms-btn')];
  let cur = 3;
  let svg, live, dotLayer, rotor, wind, wiper, trains = [];
  let t = 0, spin = 0, angle = 0, last = 0;

  function render() {
    wrap.innerHTML = svgMarkup();
    svg = wrap.querySelector('#fms-svg');
    live = {
      main:  svg.querySelector('#fms-live-main'),
      run:   svg.querySelector('#fms-live-run'),
      start: svg.querySelector('#fms-live-start')
    };
    dotLayer = svg.querySelector('#fms-dots');
    rotor = svg.querySelector('#fms-rotor');
    wind = svg.querySelector('#fms-wind');
    wiper = svg.querySelector('#fms-wiper');
    apply();
  }

  function train(d, color) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'none');
    dotLayer.appendChild(p);
    const len = p.getTotalLength();
    const dots = [];
    for (let i = 0; i < Math.max(2, Math.round(len / 38)); i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', 4.2);
      c.setAttribute('class', 'fms-dot');
      c.setAttribute('fill', color);
      dotLayer.appendChild(c);
      dots.push(c);
    }
    return { p, len, dots };
  }

  function apply() {
    const s = SPEEDS[cur];

    wiper.setAttribute('d', `M172,160 L200,${PAD_Y[cur]}`);
    live.main.setAttribute('d', MAIN[cur]);
    live.main.classList.toggle('fms-waiting', cur === 0);
    live.run.setAttribute('d', cur ? RUN : '');
    live.start.setAttribute('d', cur ? START : '');

    svg.querySelectorAll('.fms-pad').forEach(g =>
      g.classList.toggle('fms-pad-on', +g.dataset.pad === cur));

    dotLayer.innerHTML = '';
    trains = cur
      ? [train(MAIN[cur], 'var(--fms-amber)'), train(RUN, 'var(--primary)'), train(START, '#dc2626')]
      : [];

    wind.style.opacity = cur ? 0.25 + 0.25 * cur : 0;

    btns.forEach(b => {
      const on = +b.dataset.speed === cur;
      b.classList.toggle('fms-btn-on', on);
      b.setAttribute('aria-pressed', on);
    });
    root.querySelectorAll('.fms-desc').forEach(d =>
      d.hidden = +d.dataset.speed !== cur);

    root.querySelector('#fms-v').textContent = s.v + ' V';
    root.querySelector('#fms-ohm').textContent = s.ohm;
    root.querySelector('#fms-rpm').textContent = s.rpm ? s.rpm.toLocaleString() : '0';
    root.querySelector('#fms-pct').textContent = s.pct + '%';
    root.querySelector('#fms-fill').style.width = s.pct + '%';
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) || 0;
    last = now;
    const s = SPEEDS[cur];

    t += dt * 120 * s.flow;
    trains.forEach(tr => {
      const gap = tr.len / tr.dots.length;
      tr.dots.forEach((c, i) => {
        const pt = tr.p.getPointAtLength((t + i * gap) % tr.len);
        c.setAttribute('cx', pt.x);
        c.setAttribute('cy', pt.y);
      });
    });

    spin += (s.rpm - spin) * Math.min(1, dt * 1.1);      /* มีความหน่วง — กด 0 แล้วใบพัดค่อยๆ หยุด */
    angle = (angle + spin * 0.42 * dt) % 360;
    rotor.setAttribute('transform', `translate(700,250) rotate(${angle.toFixed(1)})`);

    requestAnimationFrame(frame);
  }

  btns.forEach(b => b.addEventListener('click', () => { cur = +b.dataset.speed; apply(); }));
  document.addEventListener('langchange', render);   /* nav.js ยิงที่ document และไม่ bubble */

  render();
  requestAnimationFrame(frame);
})();
