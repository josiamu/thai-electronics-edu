/* announcements.js — กล่องข่าวสาร/อัปเดตล่าสุด บนหน้าแรก
 *
 * วิธีเพิ่มประกาศใหม่: ใส่ object ไว้ "บนสุด" ของ ANNOUNCEMENTS (ใหม่สุดอยู่บนสุด)
 *   id      : ไอดีไม่ซ้ำใคร — ใช้จำว่าผู้ใช้กดปิดประกาศนี้แล้ว (เปลี่ยน id = เด้งกลับมาใหม่)
 *   date    : 'YYYY-MM-DD' — ถ้าอยู่ใน 30 วันล่าสุดจะมีป้าย "ใหม่"
 *   type    : 'lesson' (บทเรียนใหม่) | 'download' (ใบงาน/ไฟล์ใหม่) | 'update' (อัปเดตทั่วไป)
 *   th/en   : ข้อความ 2 ภาษา
 *   href    : ลิงก์ปลายทาง (เว้นว่าง '' ได้ถ้าไม่มีหน้าให้ไป)
 *   expires : (ไม่บังคับ) 'YYYY-MM-DD' — วันที่ให้ประกาศหายเอง
 *             • ไม่ใส่ = หายอัตโนมัติเมื่อเลย ANN_MAX_AGE_DAYS วันนับจาก date
 *             • ใส่    = override อายุ default (เช่นอยากให้อยู่นาน/สั้นกว่า, หรือถาวรด้วยวันไกลๆ)
 *   cat     : (ไม่บังคับ, ใช้กับ href='downloads.html') data-cat ของหมวด → เปิดหน้า downloads แล้วกรองหมวดนั้นให้เลย
 *   file    : (ไม่บังคับ, ใช้กับ href='downloads.html') ค่า data-pdf ของการ์ด → เลื่อนไป + ไฮไลต์การ์ดนั้นให้อัตโนมัติ
 *             (cat/file จะถูกแนบเป็น query string ให้เอง → downloads.js อ่านตอนโหลดหน้า)
 */
const ANNOUNCEMENTS = [
  { id:'lesson-transformer-2026-08-28', date:'2026-08-28', type:'lesson',
    th:"บทเรียนใหม่: <b>🔄 หม้อแปลงไฟฟ้า</b> — แยกออกมาเป็นบทเต็มของตัวเอง · ซิม <b>3 โหมด</b>: อุดมคติ (V กับ I แลกกันพอดี) / มีการสูญเสีย (<b>ลากโหลดหนักขึ้นแล้วแรงดันออกตกให้เห็น</b> = เหตุผลที่อะแดปเตอร์วัดตอนไม่มีโหลดได้ 14V แต่ใช้จริงเหลือ 12V) / <b>ป้อนไฟ DC</b> ที่ฟลักซ์หยุดนิ่ง ไม่มีไฟออก และขดปฐมภูมิกินกระแสจนไหม้ · พร้อมตารางวัดค่าด้วยมัลติมิเตอร์ที่เน้นว่า <b>ขดปฐมภูมิกับทุติยภูมิต้องวัดได้ OL เท่านั้น</b> ถ้าขึ้นค่าเมื่อไหร่คือไฟบ้านทะลุมาฝั่งแรงดันต่ำ",
    en:"New lesson: <b>🔄 Transformers</b> — now a full lesson of its own · a <b>three-mode simulator</b>: ideal (voltage and current trade evenly), with losses (<b>drag the load heavier and watch the output sag</b> — why a cheap adapter reads 14V unloaded but 12V in use), and <b>DC input</b>, where the flux freezes, nothing comes out, and the primary draws current until it burns · plus a testing table stressing that <b>primary to secondary must read OL</b> — any reading means mains has reached the low-voltage side",
    href:'transformer.html' },
  { id:'lesson-kirchhoff-2026-08-28', date:'2026-08-28', type:'lesson',
    th:'บทเรียนใหม่: <b>🔗 กฎของเคอร์ชฮอฟฟ์ (KVL/KCL)</b> — กฎที่ใช้ตอนที่กฎของโอห์มตัวเดียวเอาไม่อยู่ · มี <b>ซิมวงจร 2 ลูป 2 แหล่งจ่ายโต้ตอบได้</b> ปรับค่าอะไรก็ได้แล้วกฎทั้งสองข้อยังเป็นจริงเสมอ · ลองลาก V2 ลงต่ำๆ แล้วดู <b>กระแสไหลกลับทาง</b> = แบตเตอรี่กำลังถูกชาร์จ — สอนว่าคำตอบติดลบไม่ใช่คำตอบผิด · ท้ายบทโยงให้เห็นว่า KCL คือสมการที่<b>เบรดบอร์ดเสมือนในเว็บนี้แก้ทุกเฟรม</b>',
    en:"New lesson: <b>🔗 Kirchhoff's Laws (KVL/KCL)</b> — what you reach for when Ohm's Law alone runs out · includes an <b>interactive two-loop, two-source circuit</b>: change anything you like and both laws still hold · drag V2 low and watch the <b>current reverse</b> — a battery being charged, and proof that a negative answer is not a wrong answer · the lesson closes by showing that KCL is the very equation <b>this site's breadboard solves every frame</b>",
    href:'kirchhoff.html' },
  { id:'sim-wm-top-2026-08-24', date:'2026-08-24', type:'update',
    th:'ซิมใหม่: <b>🔁 วงจรโต้ตอบเครื่องซักผ้าฝาบนอินเวอร์เตอร์ 6 ขั้น</b> — ครบทั้ง 3 แบบแล้ว ไล่ตั้งแต่ฟิวส์+วาริสเตอร์ → <b>R-Factor</b> → บัส 300V → SMPS → IPM 3 เฟส · <b>ป้าย TP1 → TP2 → TP3 คือลำดับไล่ซ่อม "เปิดไม่ติด" จริงๆ</b> ลองเลือกอาการ "ภาคจ่ายไฟบนบอร์ดเสีย" จะเห็น TP2 เขียวแต่ TP3 แดง = ไฟเข้าบอร์ดครบ เสียแค่ภาคจ่ายไฟ ไม่ต้องเปลี่ยนทั้งแผ่น · และอาการ <b>"มอเตอร์เดรนเฟืองรูด"</b> ที่สอนว่าทำไมเสียจุดเดียวแล้ว<b>ทั้งน้ำไม่ทิ้งและปั่นไม่ได้พร้อมกัน</b> (สลิงเส้นเดียวเปิดวาล์วน้ำทิ้ง<i>และ</i>ปลดคลัตช์)',
    en:'New simulator: <b>🔁 a 6-step interactive circuit for the inverter top loader</b> — all three machine types now have one. Trace it from the fuse and varistor through the <b>R-factor</b>, the 300 V bus and the SMPS to the three-phase IPM · <b>the badges TP1 → TP2 → TP3 are the real order of work for a dead machine</b>: pick the "dead on-board supply" fault and TP2 stays green while TP3 goes red, meaning mains reaches the board and only the supply section has failed · and the <b>"stripped drain tractor"</b> fault shows why one failure stops <b>both the drain and the spin</b> (one cable opens the drain valve <i>and</i> releases the clutch)',
    href:'washing-machine-top.html' },
  { id:'update-washing-machine-split-2026-08-24', date:'2026-08-24', type:'update',
    th:'อัปเดตบทเรียน: <b>🧺 เครื่องซักผ้า แยกเป็น 3 หน้าตามชนิดเครื่อง</b> เพราะวิธีไล่ซ่อมต่างกันคนละเรื่อง — <a href="washing-machine-twin.html"><b>เครื่อง 2 ถัง</b></a> (กลไกล้วน ไม่มีบอร์ด + วงจรโต้ตอบ 5 ขั้น) · <a href="washing-machine-top.html"><b>ฝาบนอินเวอร์เตอร์</b></a> (ลำดับ 8 สเต็ป · R-Factor · บอร์ดไตรแอค vs บอร์ด IPM) · <a href="washing-machine-front.html"><b>ฝาหน้า Direct Drive</b></a> (ล็อกประตูก่อนเสมอ · ฮีตเตอร์+NTC · IPM 3 เฟส + วงจรโต้ตอบ 5 ขั้น) — <b>วงจรโต้ตอบเดิม 10 ขั้น 2 ฉากถูกแยกเป็น 2 ตัว</b> ตัวละ 5 ขั้นอยู่ในหน้าของตัวเอง · ส่วน <a href="washing-machine.html">หน้าเดิม</a> กลายเป็น<b>หน้าเลือกชนิดเครื่อง</b> ที่สอนคัดแยกจากมอเตอร์ซักก่อนหยิบไขควง',
    en:'Lesson update: <b>🧺 the washing machine lesson is now three pages, one per machine type</b>, because the diagnostic route is completely different for each — <a href="washing-machine-twin.html"><b>twin tub</b></a> (pure mechanics, no board, with a 5-step interactive circuit) · <a href="washing-machine-top.html"><b>inverter top loader</b></a> (the eight-step cycle · R-factor · triac boards vs IPM boards) · <a href="washing-machine-front.html"><b>direct-drive front loader</b></a> (door locks first · heater and NTC · three-phase IPM, with its own 5-step interactive circuit). <b>The old 10-step two-scene simulator has been split into two</b>, five steps each, on the page it belongs to · and <a href="washing-machine.html">the original page</a> is now a <b>machine-type guide</b> that teaches you to identify the machine from its wash motor before you pick up a screwdriver',
    href:'washing-machine.html' },
  { id:'lesson-iron-2026-08-20', date:'2026-08-20', type:'lesson',
    th:'บทเรียนใหม่ในกลุ่ม <b>🔧 งานซ่อม</b>: <b>🔌 เตารีดไฟฟ้า</b> — เครื่องที่คุมอุณหภูมิได้โดย<b>ไม่มีอิเล็กทรอนิกส์เลยสักชิ้น</b> · มี <b>ซิมเทอร์โมสตัท</b> ที่เฉลยคำถามยอดฮิต: หมุนปุ่มไป Max แล้วร้อนขึ้นได้อย่างไร ทั้งที่<b>ไม่ได้เพิ่มกำลังไฟสักวัตต์</b> (คำตอบอยู่ที่แรงกดสปริง) และทำไม<b>หลอดนีออนกระพริบจึงเป็นอาการปกติ</b> — กดโหมด "ละลายติดตาย" แล้วรอดู จะเห็น<b>เทอร์โมฟิวส์หลอมขาดต่อหน้าที่ 250°C</b> · พร้อม <b>วงจรโต้ตอบ 5 ขั้น</b> และอาการเสีย 7 แบบ — ลองเลือก "ฮีตเตอร์ขาดใน" จะเห็นว่า<b>หลอดนีออนยังติดเฉยอยู่</b> ทั้งที่เตาเย็นสนิท เพราะหลอดต่อ<b>ขนาน</b>คร่อมขั้วฮีตเตอร์ ไม่ได้ต่ออนุกรม',
    en:'New lesson in the <b>🔧 Repair</b> group: <b>🔌 Electric Iron</b> — an appliance that holds a temperature with <b>no electronics whatsoever</b>. A <b>thermostat simulator</b> answers the classic exam question: how does turning the dial to Max make it hotter when it <b>adds no watts at all</b>? (the answer is spring pressure) — and why <b>a blinking neon lamp is normal</b>. Press "welded shut", wait, and watch <b>the thermal fuse melt open at 250°C</b> in front of you. Plus a <b>5-step interactive circuit</b> with 7 faults — pick "element open" and the <b>neon stays lit</b> on a stone-cold iron, because the lamp is wired <b>across</b> the element, not in series with it',
    href:'iron.html' },
  { id:'download-iron-2026-08-20', date:'2026-08-20', type:'download',
    th:'ไฟล์ใหม่ในหมวด <b>🛠️ งานซ่อม</b>: <b>ตรวจเช็คเตารีดไฟฟ้า</b> — โครงสร้างและวงจรเตารีดแบบแห้ง · เทอร์โมสตัทไบเมทัล · เทอร์โมฟิวส์ · คลินิกอาการเสีย · การทดสอบด้วยปลั๊กหลอดโหลดก่อนเสียบไฟจริง — ใช้อ่านคู่กับบทเรียน <a href="iron.html">เตารีดไฟฟ้า</a> (PDF)',
    en:'New file in the <b>🛠️ Repair</b> section: <b>Checking an Electric Iron</b> — dry iron structure and circuit · bimetal thermostat · thermal fuse · fault clinic · testing through a series lamp before mains — read alongside the <a href="iron.html">Electric Iron lesson</a> (PDF)',
    href:'downloads.html', cat:'repair', file:'pdf/workshop/ตรวจเช็ค_เตารีดไฟฟ้า.pdf' },
  { id:'download-washing-machine-2026-08-20', date:'2026-08-20', type:'download',
    th:'ไฟล์ใหม่ในหมวด <b>🛠️ งานซ่อม</b>: <b>ตรวจเช็คเครื่องซักผ้า — รวม 4 ใบในเล่มเดียว</b> 13 หน้า มีสารบัญกระโดดตามหัวข้อ — เครื่อง 2 ถัง · ฝาบนอินเวอร์เตอร์ · ฝาหน้า Direct Drive · วงจรบอร์ดควบคุม — ใช้อ่านคู่กับบทเรียน <a href="washing-machine.html">เครื่องซักผ้า</a> (PDF)',
    en:'New file in the <b>🛠️ Repair</b> section: <b>Washing Machine Inspection Sheets — four in one</b>, 13 pages with jump-to bookmarks — twin tub · inverter top loader · direct-drive front loader · control board — read alongside the <a href="washing-machine.html">Washing Machine lesson</a> (PDF)',
    href:'downloads.html', cat:'repair', file:'pdf/workshop/ตรวจเช็ค_เครื่องซักผ้า.pdf' },
  { id:'lesson-rice-cooker-2026-08-18', date:'2026-08-18', type:'lesson',
    th:'บทเรียนใหม่ในกลุ่ม <b>🔧 งานซ่อม</b>: <b>🍚 หม้อหุงข้าว</b> — เฉลยคำถามที่คนใช้ทุกวันแต่ไม่เคยรู้: หม้อหุงข้าวรู้ได้ยังไงว่าข้าวสุก ทั้งที่<b>ไม่มีทั้งตัวจับเวลาและเซ็นเซอร์</b>? คำตอบคือ<b>จุดคูรีของแม่เหล็ก</b> — น้ำเดือดตรึงก้นหม้อไว้ที่ 100°C จนน้ำแห้ง อุณหภูมิถึงพุ่งผ่าน 103°C แล้วแม่เหล็กก็ปล่อยสวิตช์เอง · มี <b>ซิมกราฟการหุง</b> ให้ลากปริมาณข้าว/กำลังไฟ/แรงดันไฟบ้าน แล้วดูพลาโต 100°C ยืด-หดจริง (โหมด "แม่เหล็กเสื่อม" จะหลุดกลางช่วงน้ำเดือด = ข้าวดิบ) · และ <b>วงจรโต้ตอบ 9 ขั้น</b> ไล่ตั้งแต่เทอร์โมฟิวส์ในท่อใยแก้ว → ไมโครสวิตช์สับราง COOK/WARM → <b>โหมดอุ่นที่เป็นวงจรแบ่งแรงดัน 215V/5V</b> → จนถึงรุ่นดิจิทัล (SMPS 5V + MCU + NTC + สาย UART + รีเลย์) พร้อมอาการเสีย 7 แบบ — ลองเลือก "สวิตช์ละลายติดค้าง" แล้วปล่อยให้หุงต่อไป จะเห็น<b>เทอร์โมฟิวส์ขาดต่อหน้า</b>เพื่อกันไฟไหม้',
    en:'New lesson in the <b>🔧 Repair</b> group: <b>🍚 Rice Cooker</b> — the answer to a question nobody asks about an appliance they use daily: how does it know the rice is done with <b>no timer and no sensor</b>? Through the <b>Curie point of a magnet</b> — boiling water pins the base at 100°C until the water is gone, the temperature then shoots past 103°C, and the magnet lets the switch go. There is a <b>cooking-curve sim</b> where dragging the batch size, element rating and mains voltage stretches the 100°C plateau in real time (the "weak magnet" mode releases mid-boil = raw rice), plus a <b>9-step interactive circuit</b> from the thermal fuse in its fibreglass sleeve → the COOK/WARM change-over switch → <b>the warm mode that is really a 215 V / 5 V voltage divider</b> → all the way to digital models (5 V supply + MCU + NTC + UART link + relay), with 7 selectable faults. Pick "welded switch", let it keep cooking, and watch <b>the thermal fuse blow in front of you</b> to prevent a fire',
    href:'rice-cooker.html' },
  { id:'download-rice-cooker-2026-08-18', date:'2026-08-18', type:'download',
    th:'ไฟล์ใหม่ในหมวด <b>🛠️ งานซ่อม</b>: <b>ตรวจเช็คหม้อหุงข้าว 3 ไฟล์</b> — <b>รุ่นธรรมดา</b> (ไล่สาย L/N/สายดิน, เทอร์มอลฟิวส์, แม่เหล็กสวิตช์ Cook/Warm, ฮีตเตอร์ 3 ทิศทาง พร้อมคลินิกอาการเสีย เช่น "เสียบปลั๊กแล้วเงียบสนิท" = เทอร์มอลฟิวส์ขาด 90%) · <b>รุ่นดิจิทัล — ลายแทงวงจร</b> (เทียบสายไฟจริงกับสัญลักษณ์ หาจุด L/N/OUT/E บนแผงวงจร) · <b>รุ่นดิจิทัล — แผงวงจรและระบบสมองกล</b> (ภาคสวิตชิ่ง 5V, พาวเวอร์รีเลย์, MCU กับปุ่มสัมผัส, สาย UART TX/RX ที่ขาดแล้วเครื่องดับทั้งระบบ) — PDF',
    en:'New files in the <b>🛠️ Repair</b> section: <b>three rice cooker check sheets</b> — the <b>basic model</b> (tracing L/N/earth, thermal fuse, the Cook/Warm magnetic switch, 3D heating elements, plus a fault clinic — "plugged in but dead" is an open thermal fuse 90% of the time) · the <b>digital model circuit roadmap</b> (real wiring against schematic symbols, finding L/N/OUT/E on the board) · the <b>digital model boards and control system</b> (5 V switching stage, power relay, MCU and touch keys, and the UART TX/RX link that kills the whole unit when it breaks) — PDF',
    href:'downloads.html', cat:'repair', file:'pdf/workshop/ตรวจเช็ค_วงจรหม้อหุงข้าวไฟฟ้า.pdf' },
  { id:'mw-circuit-sim-2026-08-14', date:'2026-08-14', type:'update',
    th:'บทเตาไมโครเวฟ: เปลี่ยนภาพวงจรนิ่งเป็น <b>วงจรโต้ตอบ 9 ขั้น</b> — ไล่ขั้นบันไดทีละรังตั้งแต่ด่านบนสุด (ฟิวส์/เทอร์โมสตัท/Latch A) → หลอดไฟ-พัดลม-จานหมุน → ฮีตเตอร์ย่าง → <b>Latch B + power relay ที่อนุกรมกันก่อนถึงหม้อแปลงแรงสูง</b> → บอร์ดควบคุม → <b>monitor switch</b> แล้วต่อด้วย<b>วงจรทวีแรงดัน 2 จังหวะ</b> (ชาร์จ C 2,000V → บวกกันเป็น 4,000V เข้าแมกนีตรอน); มีปุ่ม <b>🚪 เปิด/ปิดประตู</b> และ <b>▶ Start</b> — ลองเลือกอาการ "Latch A ละลายติดค้าง" แล้วเปิดประตูดู จะเห็น monitor ลัด L–N จน<b>ฟิวส์เมนขาดต่อหน้าต่อตา</b> และใส่ฟิวส์ใหม่กี่ตัวก็ขาดซ้ำจนกว่าจะแก้ต้นเหตุ · เลือกอาการเสียได้ 7 แบบตรงกับคลินิกในหน้า',
    en:'Microwave lesson: the static diagram is now a <b>9-step interactive circuit</b> — walk the ladder rung by rung from the top chain (fuse, thermal cutouts, Latch A) → lamp, fan and turntable → grill element → <b>Latch B and the power relay in series ahead of the HV transformer</b> → control board → <b>monitor switch</b>, then on to the <b>two-stroke voltage doubler</b> (charge the capacitor to 2,000 V, then add them for 4,000 V at the magnetron). It has <b>🚪 door</b> and <b>▶ Start</b> buttons — pick the "Latch A welded shut" fault, open the door, and watch the monitor switch short L to N and <b>destroy the mains fuse in front of you</b>, again and again until the real cause is fixed. Seven selectable faults, matching the clinic on the page',
    href:'microwave.html' },
  { id:'wh-circuit-sim-2026-08-14', date:'2026-08-14', type:'update',
    th:'บทเครื่องทำน้ำอุ่น: เปลี่ยนภาพวงจรนิ่งเป็น <b>วงจรโต้ตอบทีละขั้น 7 ขั้น</b> — ไล่ทีละด่านตั้งแต่ ELCB → สวิตช์ → <b>ฟลุกซ์สวิตช์ (NO ตัวเดียวในวงจร)</b> → เทอร์โมสตัท → เทอร์มอลคัตเอาต์ → ฮีตเตอร์ พร้อม <b>ป้ายจุดวัด 220V/0V ตลอดเส้นทาง</b> ที่สอนวิธีไล่ซ่อมจริง: จุดแรกที่กลายเป็น 0V คือด่านที่ขาด · กดปุ่ม <b>🚿 เปิด/ปิดน้ำ</b> เพื่อพิสูจน์ว่าน้ำไม่ไหลแล้ววงจรขาดที่ฟลุกซ์สวิตช์ = ปกติ ไม่ใช่ของเสีย · เลือกอาการเสียได้ 6 แบบ รวมเคส "ฮีตเตอร์ขาด" ที่ไฟมาครบทุกด่านแต่ไม่ร้อน',
    en:'Water heater lesson: the static diagram is now a <b>7-step interactive circuit</b> — walk the safety chain from the ELCB → power switch → <b>flow switch (the only NO link)</b> → thermostat → thermal cutout → element, with <b>220 V / 0 V probe badges</b> along the way that teach the actual repair method: the first badge that reads 0 V marks the broken link · press <b>🚿 water on/off</b> to prove that with no flow the circuit opens at the flow switch — correct behaviour, not a fault · six selectable faults, including the "open element" case where every link has voltage yet nothing heats',
    href:'water-heater.html' },
  { id:'water-heater-sim-2026-08-14', date:'2026-08-14', type:'update',
    th:'บทเครื่องทำน้ำอุ่น: เพิ่ม <b>ซิมโต้ตอบ 2 โหมด</b> — โหมดแรกลากสไลเดอร์ <b>กำลังไฟ · อัตราการไหล · อุณหภูมิน้ำเข้า</b> แล้วเห็นอุณหภูมิน้ำที่ฝักบัวจริงพร้อมแถบ เย็น/สบาย/<b>ลวกผิวหนัง</b> (ลากน้ำเข้าจาก 25°C ลง 20°C แล้วจะเห็นกับตาว่าทำไมหน้าหนาวน้ำไม่ร้อนทั้งที่เครื่องไม่เสีย แล้วหรี่น้ำให้มันกลับมา) · โหมดที่สองจำลอง <b>ไฟรั่วกับ ELCB</b> — เพิ่มกระแสรั่วแล้วดูว่ากระแสในสาย L กับ N เริ่มไม่เท่ากัน พอถึง <b>30 mA ELCB ตัดทันที</b> และกด RESET ไม่ขึ้นจนกว่าจะแก้จุดรั่ว เหมือนของจริง',
    en:'Water heater lesson: a new <b>two-mode simulator</b> — the first lets you drag <b>power, flow rate and inlet temperature</b> and see the real shower-head temperature against a cold / comfortable / <b>scalding</b> scale (drop the inlet from 25°C to 20°C and watch exactly why the water goes weak in the cool season with nothing broken, then throttle the flow to bring it back) · the second simulates <b>earth leakage and the ELCB</b> — raise the leakage current, watch live and neutral stop matching, and at <b>30 mA the ELCB trips instantly</b>, refusing to reset until the leak is fixed, just like the real thing',
    href:'water-heater.html' },
  { id:'stove-step-sim-2026-08-14', date:'2026-08-14', type:'update',
    th:'บทเตาแม่เหล็กไฟฟ้า: เพิ่ม <b>วงจรโต้ตอบทีละขั้น 8 ขั้น</b> — เดินตามกระแสจริงตั้งแต่ฟิวส์/CT/บริดจ์ → โช้ก+C เป็นบัส 310V → ภาคจ่ายไฟ 5V/18V → MCU สั่งผ่านไดรเวอร์ไปขาเกต → <b>จังหวะ ON</b> (สะสมพลังงานในขดลวด) → <b>จังหวะ OFF</b> ที่พลังงานวิ่งเข้า C-resonance แล้วแรงดันขา C พุ่งเป็นลูกครึ่งไซน์ ~800V ก่อนกลับลงศูนย์เอง = <b>ZVS</b> (เฉลยว่าทำไมคาปาตัวนี้แห้งแล้ว IGBT ระเบิดทันที) → หม้อกับ eddy current และ E0/E1 → ไล่วัด TP1–TP5 พร้อม <b>ช่องจำลองอาการเสีย 6 แบบ</b> และ <b>ตารางจุดวัด TP1–TP5</b> ใหม่ในหน้า',
    en:'Induction stove lesson: a new <b>8-step interactive circuit</b> — follow the real current from fuse/CT/bridge → choke and capacitor forming the 310 V bus → the 5 V/18 V supplies → the MCU driving the gate → the <b>ON stroke</b> storing energy in the coil → the <b>OFF stroke</b> where that energy pours into the resonant capacitor, lifting the collector into an ~800 V half-sine that falls back to zero on its own — <b>zero-voltage switching</b>, which finally explains why a dried-out resonant cap blows the IGBT instantly → the pot, eddy currents and E0/E1 → probing TP1–TP5, with a <b>6-fault simulator</b> and a new <b>TP1–TP5 reference table</b>',
    href:'induction-stove.html' },
  { id:'lesson-igbt-2026-08-14', date:'2026-08-14', type:'lesson',
    th:'บทเรียนใหม่: <b>⚡ IGBT — ทรานซิสเตอร์กำลังลูกผสม</b> — อุปกรณ์ที่เป็นหัวใจของบอร์ดเตาแม่เหล็กไฟฟ้าและอินเวอร์เตอร์ แต่เว็บยังไม่เคยสอนตรงๆ: ลูกผสม<b>เกตแบบมอสเฟต + ทางเดินกระแสแบบ BJT</b>, สงคราม <b>V<sub>CE(sat)</sub> กับ R<sub>DS(on)</sub></b> ว่างานไหนควรใช้ตัวไหน, <b>ทำไมต้องขับเกต 15–18V ไม่ใช่ 5V</b>, ไดโอดฟรีวีลกับโหลดเหนี่ยวนำ, วิธีตรวจเช็คด้วยมัลติมิเตอร์ 5 ขั้น (รวมทริกชาร์จเกตด้วยแบต 9V) + <b>ซิมเทียบกำลังสูญเสีย MOSFET/IGBT</b> ที่สลับโหมดสวิตช์แข็ง↔ซอฟต์ (ZVS) ได้ — เห็นชัดว่าทำไมบอร์ดเตาถึงเลือก IGBT',
    en:'New lesson: <b>⚡ IGBT — the Hybrid Power Transistor</b> — the device at the heart of induction-stove and inverter boards that the site had never taught directly: a hybrid <b>MOSFET gate on a BJT current path</b>, the <b>V<sub>CE(sat)</sub> vs R<sub>DS(on)</sub></b> trade-off that decides which device fits a job, <b>why the gate needs 15–18 V and not 5 V</b>, freewheel diodes and inductive loads, a 5-step multimeter test (including the 9 V gate-charge trick), plus a <b>MOSFET-vs-IGBT loss sim</b> with hard ↔ soft (ZVS) switching — showing exactly why stove boards pick the IGBT',
    href:'igbt.html' },
  { id:'download-igbt-sheet-2026-08-14', date:'2026-08-14', type:'download',
    th:'ไฟล์ใหม่ในหมวด <b>🔧 อุปกรณ์อิเล็กทรอนิกส์</b>: <b>ใบความรู้ IGBT</b> — ใช้อ่านคู่กับบทเรียน <a href="igbt.html">IGBT</a> ที่เพิ่งเปิดใหม่ (PDF)',
    en:'New file in the <b>🔧 Components</b> section: the <b>IGBT knowledge sheet</b> — read it alongside the new <a href="igbt.html">IGBT lesson</a> (PDF)',
    href:'downloads.html', cat:'components', file:'pdf/IGBT.pdf' },
  { id:'download-check-forms-2026-08-14', date:'2026-08-14', type:'download',
    th:'หมวดใหม่ในหน้าดาวน์โหลด: <b>✅ ฟอร์มตรวจเช็ค</b> 3 ไฟล์ — <b>BJT · MOSFET · IGBT</b> ใบบันทึกผลสำหรับวัดอุปกรณ์ทีละขาแล้วสรุปว่าดีหรือเสีย พิมพ์ออกมาใช้คู่กับมัลติมิเตอร์ในคาบปฏิบัติได้เลย (PDF)',
    en:'New section on the downloads page: <b>✅ Check Forms</b> — three record sheets for <b>BJT · MOSFET · IGBT</b>. Measure the device pin by pin, log the readings, and mark it pass or fail; print them and use them alongside a multimeter in the lab (PDF)',
    href:'downloads.html', cat:'checklist', file:'pdf/chec_list/20260812_ฟอร์มตรวจเช็ค BJT.pdf' },
  { id:'nav-repair-menu-2026-08-14', date:'2026-08-14', type:'update',
    th:'ปรับเมนู: ยก <b>🔧 งานซ่อม</b> ออกจากเมนูบทเรียนมาเป็น<b>เมนูของตัวเองบนแถบด้านบน</b> — พัดลม · เตาแม่เหล็กไฟฟ้า · ภาคจ่ายไฟสวิตชิ่ง · ไมโครเวฟ · เครื่องทำน้ำอุ่น กดถึงได้ในคลิกเดียว ไม่ต้องเข้าเมนูบทเรียนแล้วไล่หากลุ่มอีกต่อไป (เมนูบทเรียนเหลือ 4 กลุ่มพอดีแถวเดียว หาง่ายขึ้นด้วย)',
    en:'Navigation update: <b>🔧 Repair</b> is now its <b>own top-level menu</b> instead of a group buried inside Lessons — fan motor · induction stove · switching PSU · microwave · water heater are one click away. The Lessons mega menu is down to a tidy 4 groups in a single row',
    href:'' },
  { id:'lesson-water-heater-2026-08-11', date:'2026-08-11', type:'lesson',
    th:'บทเรียนใหม่ในกลุ่ม <b>🛠️ งานซ่อมเครื่องใช้ไฟฟ้า</b>: <b>เครื่องทำน้ำอุ่น</b> — หลักการทำน้ำร้อนทันที, <b>วงจรไฟฟ้าอย่างง่าย</b> ที่เป็นวงจรอนุกรมวงจรเดียวเรียงสวิตช์นิรภัย 5 ด่าน (ELCB → สวิตช์ → ฟลุกซ์สวิตช์ → เทอร์โมสตัท → เทอร์มอลคัตเอาต์ → ฮีตเตอร์), สูตร <b>ΔT ≈ P ÷ (70×Q)</b> ที่อธิบายว่าทำไมหน้าหนาวน้ำถึงไม่ร้อนโดยที่เครื่องไม่ได้เสีย, ตารางวัดค่าฮีตเตอร์ตามพิกัดวัตต์ + ขนาดสายและเบรกเกอร์ และคลินิกอาการเสีย 6 เคส — พร้อมกฎที่ห้ามละเมิด: <b>ELCB ตัดคือมันทำงานถูกต้อง ห้ามลัดข้ามเด็ดขาด</b>',
    en:'New lesson in the <b>🛠️ Appliance Repair</b> group: <b>Electric Water Heater</b> — how instant heating works, <b>the simplified circuit</b> (one series loop through five safety links: ELCB → switch → flow switch → thermostat → thermal cutout → element), the <b>ΔT ≈ P ÷ (70×Q)</b> formula that explains why the water feels weak in the cool season with nothing broken, element resistance by wattage with cable and breaker sizing, and a 6-case fault clinic — plus the rule you must never break: <b>a tripping ELCB is working correctly, never bypass it</b>',
    href:'water-heater.html' },
  { id:'microwave-ladder-2026-08-11', date:'2026-08-11', type:'update',
    th:'บทเตาไมโครเวฟ: เพิ่ม <b>วงจรรวมทั้งเครื่องแบบง่าย</b> — จับทั้ง 4 โซนมาวาดใหม่เป็นวงจรเดียวแบบขั้นบันได (สาย L ทางซ้าย · สาย N ทางขวา · โหลดแต่ละกลุ่มพาดขวาง) เห็นทีเดียวว่าทำไมฟิวส์กับเทอร์โมสตัทขาดแล้วเครื่องดับทั้งเครื่อง ทำไม "จานหมุนแต่น้ำไม่ร้อน" ต้องสงสัย Latch B กับ Power Relay และทำไม Monitor Switch ถึงพาด L–N ไว้ตรงๆ โดยไม่มีโหลดคั่น',
    en:'Microwave lesson: a new <b>whole-circuit ladder diagram</b> — all 4 zones redrawn as one circuit (L rail on the left, N rail on the right, each load group as a rung). It shows at a glance why an open fuse or thermal cutout kills the entire oven, why "plate spins but no heat" points at Latch B and the power relay, and why the monitor switch bridges L to N with no load in between',
    href:'microwave.html' },
  { id:'lesson-microwave-2026-08-11', date:'2026-08-11', type:'lesson',
    th:'บทเรียนใหม่ในกลุ่ม <b>🛠️ งานซ่อมเครื่องใช้ไฟฟ้า</b>: <b>เตาไมโครเวฟ</b> — อ่านลายแทงวงจรโดยแบ่งเป็น 4 โซนจากปลั๊กถึงแมกนีตรอน, ผ่า<b>ระบบเซฟตี้ประตู 3 ทหารเสือ</b> ว่าทำไม "ปิดประตูแล้วฟิวส์ระเบิดปัง", วงจร<b>ทวีแรงดัน 2,000V → 4,000V</b> ทีละจังหวะ, ตารางจุดวัด Cold Test พร้อมค่ามาตรฐานครบทุกอะไหล่ และคลินิกอาการเสีย 7 เคส — พร้อมกฎเหล็กที่ห้ามลืม: <b>ถอดปลั๊กแล้ว HV Capacitor ยังอมไฟ 2,000V รออยู่</b>',
    en:'New lesson in the <b>🛠️ Appliance Repair</b> group: <b>Microwave Oven</b> — read the schematic as 4 zones from plug to magnetron, dissect the <b>3-switch door interlock</b> and why "closing the door blows the fuse", walk the <b>2,000V → 4,000V voltage doubler</b> stroke by stroke, plus a full cold-test reference table and a 7-case fault clinic — and the rule you must never forget: <b>unplugging does not empty the HV capacitor, it still holds 2,000V</b>',
    href:'microwave.html' },
  { id:'download-microwave-2026-08-11', date:'2026-08-11', type:'download',
    th:'ไฟล์ใหม่ 4 ไฟล์ในหมวด <b>🛠️ งานซ่อม</b>: <b>ตรวจเช็คเตาไมโครเวฟ</b> — คัมภีร์ช่างวิเคราะห์และตรวจซ่อม, ผังวงจร (Schematic Diagram), ผังการเดินสายจริง (Pictorial Wiring Diagram) และ<b>วงจรไฟแรงสูง (HV Circuit)</b> ที่ต้องคายประจุก่อนแตะทุกครั้ง (PDF)',
    en:'Four new files in the <b>🛠️ Repair</b> section: <b>Checking a Microwave Oven</b> — the technician&#39;s diagnostic &amp; repair guide, the schematic diagram, the pictorial wiring diagram, and the <b>high-voltage (HV) circuit</b> you must discharge before touching (PDF)',
    href:'downloads.html', cat:'repair', file:'pdf/workshop/ตรวจเช็ค_ไมโครเวฟ_คัมภีร์ช่างวิเคราะห์และตรวจซ่อมเตาไมโค.pdf' },
  { id:'smps-step-sim-2026-08-06', date:'2026-08-06', type:'update',
    th:'บทภาคจ่ายไฟสวิตชิ่ง (LNK304): เพิ่ม <b>วงจรโต้ตอบทีละขั้น 8 ขั้น</b> — เดินตามกระแสจริงตั้งแต่ NTC กันไฟกระชาก → D1 เรียงกระแส → Pi-filter 310V → <b>จังหวะ ON</b> (ไฟผ่านขา D–S เข้าตัวเหนี่ยวนำ) → <b>จังหวะ OFF</b> (กระแสไหลวนผ่าน D2 ไฟ 5V ไม่ขาดช่วง) → ป้อนกลับที่ขา FB แบบ<b>ข้ามพัลส์</b> พร้อม <b>ช่องเลือกอาการเสีย 5 แบบ</b> ให้ดูว่าจุดวัด TP1–TP4 จุดไหน "ไฟหาย" และขั้นสุดท้ายสอนไล่วัดหาภาคที่เสียเป็นลำดับ — รวมถึงกับดักที่ช่างมือใหม่ตายบ่อย: <b>ขา S ไม่ใช่กราวด์ มันแกว่ง 0↔310V</b>',
    en:'Switching PSU (LNK304) lesson: a new <b>8-step interactive circuit</b> — follow the real current from the NTC inrush guard → D1 rectifier → 310V Pi filter → the <b>ON stroke</b> (through pins D–S into the inductor) → the <b>OFF stroke</b> (freewheeling through D2 so the 5V never drops) → <b>pulse-skipping</b> feedback at the FB pin. It includes a <b>5-fault selector</b> showing which of test points TP1–TP4 loses its voltage, and a final step that teaches probing in order — plus the trap that catches beginners: <b>pin S is not ground, it swings 0↔310V</b>',
    href:'switching-psu.html' },
  { id:'lesson-switching-psu-2026-08-05', date:'2026-08-05', type:'lesson',
    th:'บทเรียนใหม่ในกลุ่ม <b>🛠️ งานซ่อมเครื่องใช้ไฟฟ้า</b>: <b>ภาคจ่ายไฟสวิตชิ่ง (LNK304)</b> — ทำไมพัดลมยุคใหม่เลิกใช้ C-Drop, ไล่วงจร 5 ภาคจากปลั๊ก 220V ถึงไฟ 5V ที่เลี้ยง MCU (เรียงกระแส → Pi-filter 310V → สับสวิตช์ → บัค → ป้อนกลับ), คลินิกอาการเสีย 4 เคสพร้อมจุดวัด และกฎความปลอดภัยของ<b>วงจรไม่แยกกราวด์</b> ที่ห้ามคีบสโคปตรงๆ',
    en:'New lesson in the <b>🛠️ Appliance Repair</b> group: <b>Switching Power Supply (LNK304)</b> — why modern fans dropped the C-Drop supply, all 5 stages from the 220V plug to the 5V that runs the MCU (rectifier → 310V Pi filter → chopper → buck → feedback), a 4-case fault clinic with test points, and the <b>non-isolated</b> safety rule that forbids clipping a scope straight onto the board',
    href:'switching-psu.html' },
  { id:'download-smps-2026-08-05', date:'2026-08-05', type:'download',
    th:'ไฟล์ใหม่ในหมวด <b>🛠️ งานซ่อม</b>: <b>ตรวจเช็ควงจรภาคจ่ายไฟสวิตชิ่ง (LNK304) ในแผงวงจรพัดลม</b> — วงจรแปลง 220VAC → 5VDC ที่เลี้ยงภาคควบคุม พร้อมเคสจริง "พัดลมเปิดไม่ติด กดปุ่มไม่ได้" และวิธีไล่หาจุดเสีย (PDF)',
    en:'New file in the <b>🛠️ Repair</b> section: <b>Checking the Switching Power Supply (LNK304) on a Fan Control Board</b> — the 220 VAC → 5 VDC stage that powers the control circuit, with a real "fan won\'t turn on, buttons dead" case and how to trace the fault (PDF)',
    href:'downloads.html', cat:'repair', file:'pdf/workshop/ตรวจเช็ค_วงจรภาคจ่ายไฟสวิตชิ่ง.pdf' },
  { id:'fan-motor-speed-sim-2026-08-05', date:'2026-08-05', type:'update',
    th:'บทมอเตอร์พัดลม: เพิ่ม <b>ซิมสวิตช์ความเร็วแบบโต้ตอบ</b> — กดเบอร์ 0/1/2/3 แล้วดูกระแสวิ่งจริงในวงจร ว่าไฟเข้าที่ไหน ผ่านขดโช้คกี่ชุด ทำไมเบอร์ 3 ถึงลมแรงสุด และที่จุดร่วม C กระแสแยกเข้า<b>ขดรัน</b>กับ<b>ขดสตาร์ท+คาปาซิเตอร์</b>อย่างไรจนเกิดสนามแม่เหล็กหมุน พร้อมค่าแรงดัน/รอบ/กำลังรายเบอร์ และ<b>ปุ่มจำลองเทอร์โมฟิวส์ขาด</b> ให้เห็นว่าทำไมพัดลมถึง "ไฟเข้าแต่ไม่ทำงานเลยทุกเบอร์" (แผนภาพขดลวดวาดใหม่ให้อ่านง่ายขึ้นด้วย)',
    en:'Fan motor lesson: a new <b>interactive speed-switch sim</b> — press 0/1/2/3 and watch the real current path: where the mains enters, how many choke sections it passes, why position 3 gives the most airflow, and how the current splits at common point C into the <b>run winding</b> and the <b>start winding + capacitor</b> to create the rotating field. Voltage, rpm and power readouts included, plus a <b>blown-thermal-fuse mode</b> showing why a fan can be "getting power but dead on every speed" (the winding diagram was redrawn too)',
    href:'fan-motor.html' },
  { id:'lessons-repair-group-2026-08-04', date:'2026-08-04', type:'lesson',
    th:'เปิดกลุ่มบทเรียนใหม่ <b>🛠️ งานซ่อมเครื่องใช้ไฟฟ้า</b> ในเมนูบทเรียน — เริ่มด้วย 2 บท: <b>มอเตอร์พัดลมไฟฟ้า</b> (โครงสร้างขดรัน/สตาร์ท/โช้ค, หาขั้วสาย R/S/1/2/3 ด้วยมัลติมิเตอร์ทั้งแบบ 5 สายและ 6 สาย) และ <b>เตาแม่เหล็กไฟฟ้า</b> (หลักการเหนี่ยวนำแม่เหล็กไฟฟ้า, อะไหล่บนบอร์ด IGBT, คลินิกวิเคราะห์อาการเสีย 6 เคส, กฎความปลอดภัยการคายประจุ)',
    en:'New lesson group <b>🛠️ Appliance Repair</b> in the Lessons menu — starting with 2 chapters: <b>Electric Fan Motor</b> (run/start/choke winding structure, finding R/S/1/2/3 leads with a multimeter on both 5-wire and 6-wire fans) and <b>Induction Stove</b> (electromagnetic induction theory, the IGBT board&#39;s parts, a 6-case fault-diagnosis clinic, and discharge safety rules)',
    href:'fan-motor.html' },
  { id:'downloads-repair-2026-08-04', date:'2026-08-04', type:'download',
    th:'เปิดหัวข้อใหม่ในหน้าดาวน์โหลด: <b>🛠️ งานซ่อม</b> — ไฟล์ตรวจเช็คมอเตอร์พัดลมไฟฟ้า (คาปาซิเตอร์รัน, สวิตช์ปรับความเร็ว) และตรวจเช็คเตาแม่เหล็กไฟฟ้า (IGBT, Resonance, รหัส Error) พร้อมวิธีไล่ซ่อม (PDF)',
    en:'New "🛠️ Repair" section in downloads — files on checking an electric fan motor (capacitor-run, speed switch) and an induction stove (IGBT, resonance, error codes) with a troubleshooting walkthrough (PDF)',
    href:'downloads.html', cat:'repair' },
  { id:'breadboard-mains-dimmer-2026-08-04', date:'2026-08-04', type:'update',
    th:'เบรดบอร์ดจำลอง: ตัวอย่างใหม่ <b>ดิมเมอร์ 50 Hz แบบวงจรจริง</b> — R จำกัด + โพเทนชิโอมิเตอร์ 3 ขา + ไดแอก → ไทรแอก → หลอดไส้ หมุนลูกบิดแล้วมุมจุดชนวนกวาด 21°–108° หลอดหรี่จากสว่างเต็มจนมืดสนิท พร้อมบทเรียนแฝง: ทำไม DB3 (32 V) ถึงใช้กับไฟ 24 V ไม่ได้ และทำไม<b>ห้าม</b>แก้ด้วยการใส่ DC offset — พร้อมกันนี้ได้<b>จัดเมนูตัวอย่างใหม่เป็น 8 หมวด</b> ไล่จากพื้นฐานไปหาไทริสเตอร์ ให้หาง่ายขึ้น',
    en:'Breadboard lab: a new <b>50 Hz mains-style dimmer</b> example — limiter R + 3-pin pot + DIAC → TRIAC → filament lamp. The knob sweeps the firing angle 21°–108°, taking the lamp from full brightness to dark, and it shows why a 32 V DB3 cannot work on a 24 V supply — and why adding a DC offset is the wrong fix. The example menu is also <b>reorganised into 8 groups</b>, from basics up to thyristors',
    href:'breadboard.html' },
  { id:'breadboard-diac-dimmer-2026-07-31', date:'2026-07-31', type:'update',
    th:'เบรดบอร์ดจำลอง: เพิ่ม <b>ไดแอก (DIAC)</b> ครบตระกูลไทริสเตอร์ — 2 ขา ไม่มีเกต แตกเองเมื่อแรงดันถึง ±V<sub>BO</sub> พร้อมตัวอย่าง <b>วงจรดิมเมอร์จริง RC → ไดแอก → เกตไทรแอก</b> ที่หมุนลูกบิด VR แล้วจังหวะจุดชนวนเลื่อนและไฟหรี่ลงจริง',
    en:'Breadboard lab: the <b>DIAC</b> completes the thyristor family — 2 pins, no gate, it breaks over by itself at ±V<sub>BO</sub>. Comes with a <b>real dimmer example (RC → DIAC → TRIAC gate)</b> where turning the VR knob shifts the firing point and visibly dims the load',
    href:'breadboard.html' },
  { id:'breadboard-scr-triac-2026-07-31', date:'2026-07-31', type:'update',
    th:'เบรดบอร์ดจำลอง: เพิ่ม <b>SCR และไทรแอก</b> (3 ขา A-K-G) — ยิงกระแสเข้าเกตแวบเดียวแล้ว<b>ล็อกตัวค้าง</b> เกตสั่งดับไม่ได้ ต้องตัดกระแสให้ต่ำกว่า I<sub>H</sub> พร้อมตัวอย่าง 2 วงจร: ปุ่มกดยิงเกต LED ติดค้าง และไทรแอกกับไฟ AC ที่ LED สองสีสลับกันติด',
    en:'Breadboard lab: new <b>SCR and TRIAC</b> parts (3 pins, A-K-G) — one pulse of gate current <b>latches</b> them on; the gate cannot switch them off, only dropping the current below I<sub>H</sub> can. Two examples included: a pushbutton-fired LED latch and a TRIAC on AC alternating two LEDs',
    href:'breadboard.html' },
  { id:'thyristor-lesson-2026-07-31', date:'2026-07-31', type:'lesson',
    th:'บทเรียนใหม่: <b>ไทริสเตอร์ SCR / TRIAC / DIAC</b> — สวิตช์กำลังที่ทริกแล้วค้าง, ทำไมเกตสั่งให้ดับไม่ได้, กระแสโฮลดิ้ง, วงจรดิมเมอร์ R-C+DIAC+TRIAC พร้อม <b>ซิมควบคุมมุมจุดชนวน</b> ให้ลองหรี่ไฟดูกำลังไฟเปลี่ยนจริง + ข้อสอบหมวดใหม่ 8 ข้อ',
    en:'New lesson: <b>Thyristors — SCR / TRIAC / DIAC</b> — latching power switches, why the gate cannot turn them off, holding current, the R-C+DIAC+TRIAC dimmer circuit, plus a <b>phase-control sim</b> where dimming visibly changes the delivered power, and 8 new quiz questions',
    href:'thyristor.html' },
  { id:'breadboard-pushbutton-2026-07-31', date:'2026-07-31', type:'update',
    th:'เบรดบอร์ดจำลอง: เพิ่ม <b>ปุ่มกด</b> (แบบ NO — ปกติเปิด) กดค้างวงจรต่อ ปล่อยแล้วตัดทันที ต่างจากสวิตช์ที่ค้างสถานะไว้ พร้อมตัวอย่างวงจร "ปุ่มกดควบคุม LED" ให้ลองกดเล่นได้เลย',
    en:'Breadboard lab: new <b>pushbutton</b> part (momentary NO) — hold it to close the circuit, let go and it cuts off immediately, unlike the latching switch. Comes with a "pushbutton-controlled LED" example',
    href:'breadboard.html' },
  { id:'relay-lab-failsafe-motor-2026-07-29', date:'2026-07-29', type:'update',
    th:'ห้องแล็บรีเลย์: เพิ่มหัวข้อ "ทำไมปุ่ม STOP ต้องเป็น NC เสมอ" (fail-safe) พร้อมตัวอย่างให้ลองตัดสายเทียบ NC ✔ กับ NO ✘, หัวข้อไดโอด flyback/RC snubber คร่อมคอยล์ และ **มอเตอร์ 24VDC** วางบนแผงได้ พร้อมตัวอย่าง+ภารกิจวงจรกลับทางหมุน FWD/REV + อินเตอร์ล็อก',
    en:'Relay Lab: new sections on why a STOP button must be NC (fail-safe, with a wire-cut experiment comparing NC ✔ vs NO ✘) and on flyback diodes / RC snubbers across the coil, plus a **24VDC motor** part with a forward/reverse interlock example and mission',
    href:'relay-lab.html' },
  { id:'relay-lab-missions-2026-07-29', date:'2026-07-29', type:'update',
    th:'ห้องแล็บรีเลย์: เพิ่ม "🎯 ภารกิจ" 6 โจทย์ไล่ระดับ (คุมไฟด้วย NO → สลับ NC/NO → ล็อกตัวเอง START/STOP → AND → OR → อินเตอร์ล็อก) กดเตรียมอุปกรณ์ เดินสายเอง แล้วกดตรวจคำตอบ — ระบบบิด/กดสวิตช์แทนคุณทีละขั้นแล้วบอกว่าขั้นไหนผ่านหรือไม่ผ่าน',
    en:'Relay Lab: new "🎯 Missions" — 6 graded tasks (NO contact → NC/NO swap → self-holding START/STOP → AND → OR → interlock). Set up the parts, wire it yourself, then press Check: the lab flips the switches for you step by step and reports what passed and what did not',
    href:'relay-lab.html' },
  { id:'relay-lab-terminal-2026-07-28', date:'2026-07-28', type:'update',
    th:'ห้องแล็บรีเลย์: เพิ่ม "จุดพักไฟ" (เทอร์มินอลบล็อก) TB-1…TB-10 จุดละ 4 รูที่ถึงกันหมด — พักสายที่ต้องแตกหลายทางแทนการยัดสายซ้อนที่ขาอุปกรณ์ พร้อมหัวข้ออธิบายว่ามันคืออะไรและทำไมตู้คอนโทรลจริงต้องมี',
    en:'Relay Lab: new terminal block TB-1…TB-10 (4 interconnected holes each) — park branching wires there instead of stacking them on a device pin, plus a section on what it is and why real panels need one',
    href:'relay-lab.html' },
  { id:'relay-lab-2026-07-27', date:'2026-07-27', type:'lesson',
    th:'เครื่องมือใหม่: ห้องแล็บวงจรรีเลย์ MY4 — ต่อวงจรควบคุม 24VDC ด้วยรีเลย์ 4PDT + ปุ่มกด/ไฟ/บัซเซอร์ เดินสายเอง มีตัวอย่าง self-holding/interlock/AND-OR + มุมมองแผนภาพ Ladder',
    en:'New tool: MY4 Relay Control Lab — wire 24VDC control circuits with 4PDT relays + buttons/lamps/buzzer, with self-holding/interlock/AND-OR examples and a ladder-diagram view',
    href:'relay-lab.html' },
  { id:'worksheet-mosfet-power-2026-07-27', date:'2026-07-27', type:'download',
    th:'ใบความรู้ใหม่: ผ่าโครงสร้าง MOSFET สวิตช์กำลังสูง — เกต/เดรน/ซอร์ส, R_DS(on), การสวิตช์โหลดกำลังสูง (PDF)',
    en:'New knowledge sheet: Inside the Power MOSFET Switch — gate/drain/source, R_DS(on), high-power load switching (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้ที่  ผ่าโครงสร้าง MOSFET สวิตช์กำลังสูง.pdf' },
  { id:'worksheet-scr-triac-2026-07-27', date:'2026-07-27', type:'download',
    th:'ใบความรู้ใหม่ 2 ไฟล์: SCR (ไทริสเตอร์ — เกต/แอโนด/แคโทด, การจุดชนวน) และ TRIAC (ควบคุมไฟ AC สองทิศทาง, หรี่ไฟ/ควบคุมมอเตอร์) (PDF)',
    en:'Two new knowledge sheets: SCR (thyristor — gate/anode/cathode, triggering) and TRIAC (bidirectional AC control, dimmer/motor control) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้ SCR.pdf' },
  { id:'breadboard-relay-nc-no-2026-07-22', date:'2026-07-22', type:'update',
    th:'เบรดบอร์ด: เพิ่มตัวอย่างใหม่ "รีเลย์ SPDT สลับ LED แดง↔เขียว (NC/NO)" — 3V ผ่านทรานซิสเตอร์ขับคอยล์ 9V สลับสวิตช์แล้วดูหน้าสัมผัสย้ายจาก NC ไป NO',
    en:'Breadboard: new example "SPDT relay swaps red↔green LED (NC/NO)" — a 3V control side drives the 9V coil through an NPN; flip the switch and watch the contact move from NC to NO',
    href:'breadboard.html?c=eyJ2IjoxLCJlbnYiOnsidCI6MjUsImwiOjUwLCJ2ciI6NTB9LCJjb21wcyI6W3sidCI6ImJhdHRlcnkiLCJhIjoiVFAxIiwiYiI6IlROMSIsInYiOjl9LHsidCI6ImJhdHRlcnkiLCJhIjoiQlAxIiwiYiI6IkJOMSIsInYiOjN9LHsidCI6IndpcmUiLCJhIjoidGk4IiwiYiI6IkJQNyIsImMiOiJyZWQifSx7InQiOiJzd2l0Y2giLCJhIjoidGgxMSIsImIiOiJ0aDgiLCJjbCI6MH0seyJ0IjoicmVzaXN0b3IiLCJhIjoidGUxMSIsImIiOiJ0ZzExIiwidiI6MTAwMH0seyJ0IjoidHJhbnNpc3RvciIsImEiOiJ0ZDkiLCJiIjoidGQxMyIsImciOiJ0YjExIiwidHQiOiJucG4iLCJiZXRhIjoxMDB9LHsidCI6IndpcmUiLCJhIjoidGExMyIsImIiOiJUTjEzIiwiYyI6ImdyZWVuIn0seyJ0Ijoid2lyZSIsImEiOiJ0ZTEzIiwiYiI6IkJOMTMiLCJjIjoiZ3JlZW4ifSx7InQiOiJ3aXJlIiwiYSI6IlRQMTUiLCJiIjoidGQxNyIsImMiOiJyZWQifSx7InQiOiJyZWxheSIsImEiOiJ0ZTE3IiwiYiI6InRlMTkiLCJnIjoidGUyMSIsImgiOiJ0ZTIzIiwiayI6InRlMjUifSx7InQiOiJkaW9kZSIsImEiOiJ0YTE5IiwiYiI6InRhMTciLCJkdiI6InNpbGljb24iLCJ2ZiI6MC43LCJyZCI6OH0seyJ0Ijoid2lyZSIsImEiOiJ0YzE5IiwiYiI6InRjOSIsImMiOiJibHVlIn0seyJ0Ijoid2lyZSIsImEiOiJUUDIxIiwiYiI6InRjMjEiLCJjIjoicmVkIn0seyJ0IjoicmVzaXN0b3IiLCJhIjoidGQyNSIsImIiOiJ0ZDI3IiwidiI6MTAwMH0seyJ0IjoibGVkIiwiYSI6InRjMjciLCJiIjoidGMyOSIsImMiOiJyZWQiLCJ2ZiI6MS44fSx7InQiOiJ3aXJlIiwiYSI6InRkMjMiLCJiIjoidGYyNSIsImMiOiJibHVlIn0seyJ0IjoicmVzaXN0b3IiLCJhIjoidGcyNSIsImIiOiJ0ZzI3IiwidiI6MTAwMH0seyJ0IjoibGVkIiwiYSI6InRoMjciLCJiIjoidGgyOSIsImMiOiJncmVlbiIsInZmIjoyLjF9LHsidCI6IndpcmUiLCJhIjoidGUyOSIsImIiOiJ0ZjI5IiwiYyI6ImdyZWVuIn0seyJ0Ijoid2lyZSIsImEiOiJ0YjI5IiwiYiI6IlROMjkiLCJjIjoiZ3JlZW4ifV19' },
  { id:'worksheet-oscillator-2026-07-22', date:'2026-07-22', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 7 — ผ่าโครงสร้างวงจรกำเนิดความถี่ (ออสซิลเลเตอร์ • รูปคลื่นและการวิเคราะห์) (PDF)',
    en:'New worksheet: Sheet 7 — Inside Oscillator Circuits (oscillators • waveforms & analysis) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้ที่ 7 ผ่าโครงสร้างวงจรกำเนิดความถี่.pdf' },
  { id:'worksheet-nameplate-2026-07-22', date:'2026-07-22', type:'download',
    th:'ใบงานใหม่: ใบงานที่ 1 — สัมผัสแรก: ถอดรหัสเนมเพลทและป้ายบอกค่าเครื่องใช้ไฟฟ้า (PDF)',
    en:'New worksheet: Sheet 1 — First Contact: Decoding Appliance Nameplates & Rating Labels (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/📝 ใบงานที่ 1 สัมผัสแรก. ถอดรหัสเนมเพลทและป.pdf' },
  { id:'breadboard-relay-2026-07-20', date:'2026-07-20', type:'update',
    th:'เบรดบอร์ด: เพิ่มรีเลย์ SPDT (5 ขา — คอยล์ + COM/NO/NC) วางเองได้ จ่ายไฟคอยล์ถึงระดับดึงเข้าแล้วหน้าสัมผัสสลับ COM→NO เอง พร้อมตัวอย่างออปโต→ทรานซิสเตอร์ขับคอยล์รีเลย์ + ไดโอดกันย้อน (flyback)',
    en:'Breadboard: added an SPDT relay (5 pins — coil + COM/NO/NC) — energize the coil past pull-in and the contact flips COM→NO, with a ready-made opto→transistor coil-driver example + flyback diode',
    href:'breadboard.html?c=eyJ2IjoxLCJlbnYiOnsidCI6MjUsImwiOjUwLCJ2ciI6NTB9LCJjb21wcyI6W3sidCI6ImJhdHRlcnkiLCJhIjoiQlAxIiwiYiI6IkJOMSIsInYiOjl9LHsidCI6InJlc2lzdG9yIiwiYSI6InRkMTEiLCJiIjoidGQxNiIsInYiOjEwMDB9LHsidCI6InRyYW5zaXN0b3IiLCJhIjoidGMxMyIsImIiOiJ0YzE5IiwiZyI6InRjMTYiLCJ0dCI6Im5wbiIsImJldGEiOjEwMH0seyJ0Ijoid2lyZSIsImEiOiJ0YTE5IiwiYiI6IlROMTkiLCJjIjoiZ3JlZW4ifSx7InQiOiJiYXR0ZXJ5IiwiYSI6IlRQMSIsImIiOiJUTjEiLCJ2Ijo5fSx7InQiOiJ3aXJlIiwiYSI6InRmMjIiLCJiIjoidGQyMiIsImMiOiJncmVlbiJ9LHsidCI6InJlc2lzdG9yIiwiYSI6InRjMjIiLCJiIjoidGMyNCIsInYiOjEwMDB9LHsidCI6ImxlZCIsImEiOiJ0ZDI0IiwiYiI6InRkMjciLCJjIjoicmVkIiwidmYiOjEuOH0seyJ0Ijoid2lyZSIsImEiOiJ0YTI3IiwiYiI6IlROMjciLCJjIjoiZ3JlZW4ifSx7InQiOiJzd2l0Y2giLCJhIjoiQlAyIiwiYiI6InRoMiIsImNsIjowfSx7InQiOiJyZXNpc3RvciIsImEiOiJ0ZzIiLCJiIjoidGc4IiwidiI6MzMwfSx7InQiOiJvcHRvIiwiYSI6InRmOCIsImIiOiJ0ZjExIiwiZyI6InRlOCIsImgiOiJ0ZTExIiwiY3RyIjoxMDB9LHsidCI6IndpcmUiLCJhIjoidGcxMSIsImIiOiJCTjExIiwiYyI6ImdyZWVuIn0seyJ0IjoicmVsYXkiLCJhIjoidGoxNiIsImIiOiJ0ajE4IiwiZyI6InRqMjAiLCJoIjoidGoyMiIsImsiOiJ0ajI0In0seyJ0Ijoid2lyZSIsImEiOiJUUDIiLCJiIjoidGQ4IiwiYyI6InJlZCJ9LHsidCI6IndpcmUiLCJhIjoidGUxMyIsImIiOiJ0aTE4IiwiYyI6ImdyZWVuIn0seyJ0Ijoid2lyZSIsImEiOiJ0aTE2IiwiYiI6IlRQMTAiLCJjIjoicmVkIn0seyJ0Ijoid2lyZSIsImEiOiJUUDE3IiwiYiI6InRoMjAiLCJjIjoicmVkIn0seyJ0IjoiZGlvZGUiLCJhIjoidGYxOCIsImIiOiJ0ZjE2IiwiZHYiOiJzaWxpY29uIiwidmYiOjAuNywicmQiOjh9XX0' },
  { id:'breadboard-example-menu-2026-07-15', date:'2026-07-15', type:'update',
    th:'เบรดบอร์ด: เปลี่ยนปุ่มสุ่มตัวอย่างเป็นเมนู "ตัวอย่าง" เลือกได้ทีละวงจรจากรายการทั้ง 16 แบบ (หรือกดสุ่มบนสุดก็ได้)',
    en:'Breadboard: the random button is now an "Examples" menu — pick any of the 16 circuits by name (or hit Random at the top)',
    href:'breadboard.html' },
  { id:'breadboard-avalanche-2026-07-15', date:'2026-07-15', type:'update',
    th:'เบรดบอร์ด: เพิ่มโหมด Avalanche ให้ทรานซิสเตอร์ NPN (ติ๊กช่อง "Avalanche" + ตั้ง V_BR) → ต่อกับ R–C ได้วงจรออสซิลเลเตอร์ไฟกระพริบเอง พร้อมตัวอย่างสำเร็จรูปในปุ่มสุ่มตัวอย่าง',
    en:'Breadboard: NPN transistors now have an Avalanche mode (tick "Avalanche" + set V_BR) → pair with an R–C for a self-blinking relaxation oscillator, plus a ready-made example in the randomizer',
    href:'breadboard.html?c=eyJ2IjoxLCJlbnYiOnsidCI6MjUsImwiOjUwLCJ2ciI6NTB9LCJjb21wcyI6W3sidCI6ImJhdHRlcnkiLCJhIjoiVFAxIiwiYiI6IlROMSIsInYiOjl9LHsidCI6InJlc2lzdG9yIiwiYSI6IlRQMiIsImIiOiJ0YTUiLCJ2IjoxMDAwfSx7InQiOiJ0cmFuc2lzdG9yIiwiYSI6InRjMTAiLCJiIjoidGM1IiwiZyI6InRhOCIsInR0IjoibnBuIiwiYXYiOjEsInZiciI6OCwiYmV0YSI6MTAwfSx7InQiOiJsZWQiLCJhIjoidGQxMCIsImIiOiJ0ZDEzIiwiYyI6InJlZCIsInZmIjoxLjh9LHsidCI6ImNhcCIsImEiOiJ0ZTUiLCJiIjoidGUxMyIsInYiOjAuMDAwNDd9LHsidCI6IndpcmUiLCJhIjoidGExMyIsImIiOiJUTjEzIiwiYyI6ImdyZWVuIn1dfQ' },
  { id:'transistor-bjt-deep-dive-2026-07-15', date:'2026-07-15', type:'update',
    th:'ขยายบทเรียนทรานซิสเตอร์ + เพิ่มภาพจำลองโต้ตอบ 2 ตัว: "ภายในทรานซิสเตอร์ทีละขั้น 1–5" (อิเล็กตรอนวิ่งในภาพตัดขวาง) และ "วงจรจริงทีละขั้น 1–6" (5V → R_B → NPN → LED, กด HIGH/LOW เทียบ Cut-off กับ Saturation)',
    en:'Expanded Transistor lesson + two new interactive sims: "Inside the BJT, steps 1–5" (electrons crossing the cross-section) and "A real circuit, steps 1–6" (5V → R_B → NPN → LED, toggle HIGH/LOW to compare cut-off and saturation)',
    href:'transistor.html' },
  { id:'worksheet-current-journey-2026-07-13', date:'2026-07-13', type:'download',
    th:'ใบงานใหม่: เสริมขั้นสูง — การเดินทางของกระแสไฟ (Capacitive Dropper, เรียงกระแส/เรกูเลต, IR 38kHz) (PDF)',
    en:'New worksheet: Advanced — The Journey of Current (capacitive dropper, rectify/regulate, IR 38kHz) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/ใบความรู้เสริมขั้นสูง การเดินทางของกระแสไฟ.pdf' },
  { id:'transistor-bjt-pdf-2026-07-13', date:'2026-07-13', type:'download',
    th:'ไฟล์ใหม่: ทรานซิสเตอร์ — โครงสร้าง BJT (เพิ่มเติม) — NPN/PNP, รอยต่อ P-N, ประวัติและหลักการ (PDF)',
    en:'New file: Transistor — BJT Structure (Part 2) — NPN/PNP, P-N junctions, history & principles (PDF)',
    href:'downloads.html', cat:'components', file:'pdf/ทรานซิสเตอร์_2.pdf' },
  { id:'opto-2026-07-09', date:'2026-07-09', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ออปโตอิเล็กทรอนิกส์ — LED/IR, 7-Segment, ตัวรับแสง, ออปโตคัปเปลอร์ + ซิม PC817',
    en:'New lesson: Optoelectronics — LED/IR, 7-segment, light detectors, optocoupler + PC817 sim',
    href:'optoelectronics.html' },
  { id:'rectifier-lab-2026-07-04', date:'2026-07-04', type:'update',
    th:'Lab ใหม่ในบทไดโอด: ทดลองแปลง AC เป็น DC — เลือกวงจร/ชนิดไดโอด/แรงดัน/โหลด แล้วดูรูปคลื่นจริง',
    en:'New lab in the Diode lesson: AC → DC rectifier — pick the circuit, diode type, voltage & load and watch the waveform',
    href:'diode.html#rectifier-lab' },
  { id:'rectifier-pdf-2026-07-01', date:'2026-07-01', type:'download',
    th:'ไฟล์ใหม่: วงจรเรียงกระแส (Rectifier) — ครึ่งคลื่น/เต็มคลื่น/บริดจ์ + ริปเปิล (PDF)',
    en:'New file: Rectifier Circuits — half/full-wave/bridge + ripple (PDF)',
    href:'downloads.html', cat:'components', file:'pdf/วงจรเรียงกระแส.pdf' },
  { id:'worksheet-3-2026-07-01', date:'2026-07-01', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 3 — เจาะลึกไดโอดความถี่สูง (Schottky & Fast Recovery) (PDF)',
    en:'New worksheet: Sheet 3 — High-Frequency Diodes (Schottky & Fast Recovery) (PDF)',
    href:'downloads.html', cat:'worksheet', file:'pdf/worksheet/📖 ใบความรู้ที่ 3 เจาะลึกไดโอดความถี่สูง.pdf' },
  { id:'worksheet-9-2026-06-27', date:'2026-06-27', type:'download',
    th:'ใบงานใหม่: ใบความรู้ที่ 9 — ผ่าแผงวงจร เจาะลึกเทคนิค (PDF)',
    en:'New worksheet: Sheet 9 — Dissecting the Circuit Board (PDF)',
    href:'downloads.html' },
  { id:'logic-2026-06-27', date:'2026-06-27', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ลอจิกเกต (Logic Gates) พร้อมซิมูเลเตอร์เชิงโต้ตอบ',
    en:'New lesson: Logic Gates with an interactive simulator',
    href:'logic-gates.html' },
  { id:'opamp-2026-06-25', date:'2026-06-25', type:'lesson',
    th:'เพิ่มบทเรียนใหม่: ออปแอมป์ (Op-Amp) + ซิมจำลองอัตราขยาย',
    en:'New lesson: Op-Amp + gain simulator',
    href:'op-amp.html' },
];

(function () {
  var TYPE = {
    lesson:   { icon:'📘', th:'บทเรียนใหม่', en:'New lesson',    cls:'ann-lesson' },
    download: { icon:'📥', th:'ใบงานใหม่',    en:'New worksheet', cls:'ann-download' },
    update:   { icon:'✨', th:'อัปเดต',        en:'Update',        cls:'ann-update' }
  };
  var DKEY = 'ann-dismissed';
  var ANN_MAX_AGE_DAYS = 3; // อายุ default: ไม่มี expires แล้วเกินกี่วันให้หายเอง

  function dismissed() {
    try { return JSON.parse(localStorage.getItem(DKEY)) || []; } catch (e) { return []; }
  }
  function dismiss(id) {
    var d = dismissed();
    if (d.indexOf(id) === -1) { d.push(id); localStorage.setItem(DKEY, JSON.stringify(d)); }
  }
  function isRecent(date) {
    var t = Date.parse(date);
    return !isNaN(t) && (Date.now() - t) < 30 * 864e5; // 30 วัน
  }
  // หมดอายุ: ถ้ามี expires ใช้ค่านั้น, ไม่มีก็นับ ANN_MAX_AGE_DAYS วันจาก date
  function isExpired(a) {
    if (a.expires) {
      var e = Date.parse(a.expires);
      return !isNaN(e) && Date.now() > e;
    }
    var d = Date.parse(a.date);
    return !isNaN(d) && (Date.now() - d) > ANN_MAX_AGE_DAYS * 864e5;
  }

  function render() {
    var host = document.getElementById('announcements');
    if (!host) return;
    var done = dismissed();
    var items = ANNOUNCEMENTS.filter(function (a) {
      return done.indexOf(a.id) === -1 && !isExpired(a);
    });
    if (!items.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
    host.style.display = '';

    var html =
      '<div class="ann-head">' +
        '<span class="th-only">📢 ข่าวสารและอัปเดตล่าสุด</span>' +
        '<span class="en-only">📢 News &amp; Latest Updates</span>' +
      '</div>';

    html += items.map(function (a) {
      var t = TYPE[a.type] || TYPE.update;
      var newBadge = isRecent(a.date)
        ? '<span class="ann-new"><span class="th-only">ใหม่</span><span class="en-only">NEW</span></span>'
        : '';
      var href = a.href;
      if (href && (a.cat || a.file)) {          // แนบ query ให้ downloads.html กรอง/เลื่อนให้เอง
        var qs = [];
        if (a.cat)  qs.push('cat=' + encodeURIComponent(a.cat));
        if (a.file) qs.push('file=' + encodeURIComponent(a.file));
        href += (href.indexOf('?') === -1 ? '?' : '&') + qs.join('&');
      }
      var cta = href
        ? '<a class="ann-cta" href="' + href + '"><span class="th-only">เปิดดู →</span><span class="en-only">Open →</span></a>'
        : '';
      return '<div class="ann-item ' + t.cls + '">' +
          '<span class="ann-icon">' + t.icon + '</span>' +
          '<div class="ann-body">' +
            '<span class="ann-tag"><span class="th-only">' + t.th + '</span><span class="en-only">' + t.en + '</span></span>' +
            newBadge +
            '<span class="ann-date">' + a.date + '</span>' +
            '<div class="ann-text"><span class="th-only">' + a.th + '</span><span class="en-only">' + a.en + '</span></div>' +
          '</div>' +
          cta +
          '<button class="ann-x" type="button" aria-label="ปิดประกาศ" data-id="' + a.id + '">×</button>' +
        '</div>';
    }).join('');

    host.innerHTML = html;
    host.querySelectorAll('.ann-x').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        dismiss(btn.getAttribute('data-id'));
        render();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
