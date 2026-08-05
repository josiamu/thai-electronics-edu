# Thai Electronics Education Website

## Project
- Static multi-page website สำหรับสอนวิชาไฟฟ้าและอิเล็กทรอนิกส์
- **Bilingual: ไทย / English** — สลับภาษาผ่านปุ่ม TH / EN ใน nav bar
- GitHub Pages: https://josiamu.github.io/thai-electronics-edu/
- Repo: https://github.com/josiamu/thai-electronics-edu
- Branch: master → deploy อัตโนมัติ

## Stack
- Vanilla HTML / CSS / JavaScript — ไม่ใช้ framework ใดๆ
- Font: Anuphan (Google Fonts, wght 300–700)
- Storage: localStorage (quiz scores, dark mode, language preference)

## File Structure
```
website/
├── css/style.css        — shared CSS ทุกหน้า (CSS custom properties, dark mode, bilingual)
├── js/nav.js           — inject nav bar + dark mode toggle + hamburger + language toggle + back-to-top button + footer topic-count line (`.footer-topics` "ครอบคลุมเนื้อหาจาก N หัวข้อ" — เลข N อยู่ที่ค่าเดียว `TOPIC_COUNT` ใน nav.js, ฉีดทุกหน้า) + footer license line (CC BY-NC 4.0, bilingual, ต่อท้าย <footer> ทุกหน้า)
├── js/tools.js         — logic เครื่องคิดเลขทุกตัว (calcR4, calcR5, calcOhm, ...)
├── js/quiz.js          — ข้อมูลข้อสอบ + logic แบบทดสอบ
├── js/downloads.js     — PDF preview modal + download interactions + ตัวกรองหน้า downloads (ช่องค้นหา #dl-search ค้นทั้งไทย-อังกฤษ + ชิปกรองหมวด #dl-chips ตาม .section[data-cat], ซ่อนด้วย .dl-hidden, แสดง #dl-noresult เมื่อไม่พบ, placeholder เปลี่ยนตามภาษา; อ่าน ?cat=/?file= จาก URL ตอนโหลด → กรองหมวด + เลื่อนไป/ไฮไลต์การ์ดให้เอง (deep-link จากกล่องข่าวหน้าแรก))
├── js/oscilloscope.js  — Interactive I-V Curve Simulator
├── js/osc-reader.js    — Interactive Scope Reading Trainer (canvas, V/div & T/div sliders, AUTOSET/randomize, auto Vp/Vrms/T/f)
├── js/bjt-steps.js     — Interactive step-by-step "หลักการทำงาน BJT" ในหน้า transistor.html (canvas #bs-canvas ใน wrap #bjt-steps, ปุ่มขั้นที่ 1–5 .bs-tab + prev/next + auto-play; ภาพตัดขวาง N⁺-P-N เปลี่ยนตามขั้น: 1 ไบอัส B-E (depletion ยุบ) → 2 อีมิตเตอร์ฉีดอิเล็กตรอน (กองที่เบส) → 3 จับคู่โฮล ~1% ออกขา B (= IB, จุดส้ม) → 4 สนามที่ B-C กวาด ~99% เข้า C (= IC) → 5 แถบสัดส่วน 99:1 + IC = β·IB; คำอธิบายรายขั้นอยู่ใน .bs-desc[data-step] ใน HTML, bilingual — วาดด้วย "อิเล็กตรอน")
├── js/bjt-circuit.js   — Interactive step-by-step **วงจรจริง** ในหน้า transistor.html (canvas #bc-canvas ใน wrap #bjt-circuit, ใช้ CSS .bs-* ร่วมกับ bjt-steps.js → ทั้งสองไฟล์ query .bs-tab/.bs-desc **แบบ scope ใน wrap ตัวเอง** ห้าม query แบบ global; วงจร low-side switch: 5V → RC 150Ω → LED → C ‖ IN(MCU) → RB 2.2kΩ → B ‖ E → GND; 6 ขั้น: 1 ไฟเข้า/กราวด์ (ทำไม E ถึงลบสุด, VC>VB>VE) → 2 ทำไมต้องมี RB (B-E = ไดโอด) → 3 วงจรควบคุม IB≈1.95mA (จุดส้ม, common ground) → 4 วงจรกำลัง IC≈18.7mA (จุดเขียว, LED เรืองแสง, β อยากได้ 195mA แต่วงจรยอมแค่ 18.7 → อิ่มตัว) → 5 ทำไมต้องมี RC → 6 ตารางแรงดันแต่ละขา; ปุ่ม #bc-input สลับ HIGH/LOW ได้ทุกขั้น → เทียบ Cut-off (VC=5V, LED ดับ) กับ Saturation (VC=0.2V, LED ติด) + แผงอ่านค่าบน canvas; จุดที่วิ่งคือ **กระแสสมมติ (+→−)** ไม่ใช่อิเล็กตรอน)
├── js/signal-gen-sim.js — Interactive Waveform Generator (canvas, sine/square/triangle/sawtooth + freq/amp/duty/offset)
├── js/breadboard.js    — Interactive Breadboard Lab (SVG, toolbar: dropdown "เพิ่มอุปกรณ์" (battery/AC/R/diode+LED/wire/switch/button/cap/ind/transistor/scr/pot/relay) + ปุ่มมัลติมิเตอร์/ลบ/dropdown "ตัวอย่าง" (#bb-example-dropdown → buildExampleMenu ลิสต์ 1 รายการต่อ EXAMPLES 25 วงจร (จัดกลุ่มด้วยคอมเมนต์ // ── … ── 8 หมวด: พื้นฐาน / ไดโอดพิเศษ / ตัวต้านทานปรับค่า / ตัวเก็บประจุ / ทรานซิสเตอร์ / ออปโต+รีเลย์ / ไฟ AC / ไทริสเตอร์ — เพิ่มตัวอย่างใหม่ให้ใส่ในหมวดที่ตรง อย่าต่อท้ายมั่ว) + รายการ "สุ่มตัวอย่าง" 🎲 บนสุด; loadExampleByIndex(i) โหลดตัวที่เลือก, loadExample() สุ่มไม่ซ้ำตัวเดิม; เมนูเลื่อน scroll ได้; รวม NPN switch/dark-detector + pot LED dimmer + AC RC low-pass/half-wave + full-wave bridge rectifier + avalanche LED flasher + opto-driven relay w/ flyback + SPDT relay NC/NO red↔green LED swap + **ดิมเมอร์ 50 Hz แบบวงจรจริง** (R 100Ω จำกัด + pot 3 ขา 10k + C 1µF + ไดแอก 8V → ไทรแอก → หลอดไส้ 24V 2.4W; ωRC≈3.2 ที่ 50Hz → ลูกบิดกวาดมุมจุดชนวน 21°→108°; **ห้ามใช้ V_BO 32V (DB3) กับแหล่งจ่ายในซิม** เพราะ Vp สูงสุดแค่ 30V คาปาไม่มีทางถึง 32V แล้วไดแอกจะไม่แตกเลย — DB3 ใช้ได้จริงเพราะไฟบ้าน 220Vrms มียอด 311V; และ**ห้ามแก้ด้วยการใส่ DC offset** เพราะแหล่งจ่ายจะไม่ตัดศูนย์ ไทรแอกไม่ commutate ก็ไม่ใช่ phase control อีกต่อไป)/ล้าง/บันทึก-โหลด (modal + localStorage key `bb-saves`)/แชร์ลิงก์ (serializeCircuit → base64url ใน `?c=`, โหลดอัตโนมัติด้วย loadFromURL ตอน init — ลิงก์เสีย (decode/JSON พัง) หรือไม่มี comps เป็น array → badLinkHint() ขึ้นเตือนสีแดงที่ #bb-hint ห้ามล้มเงียบ, เรียกหลัง selectTool(null) จึงมั่นใจว่า #bb-hint พร้อมแล้ว), วางอุปกรณ์ R/VR/NTC/PTC/LDR/VDR/diode(silicon/germanium/schottky/zener/tvs)/LED/wire/switch/battery/capacitor/inductor เอง — ไดโอดกับ LED รวมเป็น list เดียว (เลือกชนิดในแผงค่า: silicon/germanium/schottky/zener+Vz/**tvs+V_BR** (TVS ทิศเดียว: นำหน้าที่ Vf 0.7V, หนีบย้อนที่ V_BR — ใช้กลไก reverse-clamp เดียวกับซีเนอร์ผ่าน `hasReverseClamp()` + เก็บค่าใน `c.vz`, สัญลักษณ์แถบ `[` , ป้าย 'TVS xV', example วงจรหนีบไฟกระชาก)/LED+สี), **SCR/ไทรแอก 3 ขา** (type 'scr' + st: scr/triac; a=แอโนด/MT2, b=แคโทด/MT1, g=เกต; ใช้กลไก 3 ขาเดิม (isThreePin/pendingHole2) วาง 3 คลิก A→K→G; solver: รอยต่อเกต-แคโทดเป็น diode companion (SCR_VGT/SCR_RGT → กระแสเกตจริง มัลติมิเตอร์วัดได้) + เส้นทางหลักเป็น **latch `_lat` (0 กั้นไฟ / ±1 นำกระแส)** ไม่ใช่ฟังก์ชันของแรงดันปัจจุบัน — จุดชนวนเมื่อ Ig ≥ I_GT (ไทรแอกจุดได้ทั้งสองทิศ/เกตบวก-ลบ, SCR เฉพาะทิศตรง) แล้วนำกระแสผ่าน clamp SCR_VT+SCR_RON จนกระแสต่ำกว่า I_H จึงดับ (เปิดสวิตช์/ถอดโหลด/จุดตัดศูนย์ของ AC); **กฎ 2 ข้อที่ห้ามแก้**: (1) ตัดสินสถานะ latch เฉพาะรอบที่ `changed === false` แล้วเท่านั้น — ถ้าตัดสินกลางคัน ไดโอดที่ยังอยู่ในสถานะรีเซ็ตจะทำให้กระแสหลักอ่านได้ 0 แล้ว SCR ที่ล็อกอยู่จะหลุดระหว่างทาง (บั๊กจริงที่เจอตอนทำ) (2) เปลี่ยนสถานะได้ **ครั้งเดียวต่อการ solve** (`_latMoved`) เพราะเงื่อนไขจุดชนวนกับเงื่อนไขดับใช้คนละปริมาณ ถ้าปล่อยอิสระจะสลับไปมาจนชน MAXIT แล้วโซลเวอร์รับคำตอบขยะเงียบๆ; drawScr วาด body + ขา A/K/G หรือ MT2/MT1/G + เรืองแสงตอนล็อก, แผงแก้ไขเลือกชนิด/I_GT/I_H + บอกสถานะ, serialize `st`/`igt`/`ih` (โหลดกลับมาเริ่มที่กั้นไฟเสมอ), อิเล็กตรอนวิ่ง 2 เส้น a→b (กระแสหลัก) และ g→b (กระแสเกต); example 2 วงจร: SCR ล็อกตัวด้วยปุ่มกด+สวิตช์รีเซ็ต และไทรแอกกับ AC + LED สองสีสลับกันติด), **ไดแอก 2 ขา** (type 'diac' — อยู่ในเมนูเดียวกับ SCR/ไทรแอก แต่วางแบบ 2 ขา: `isThreePinTool('scr')` คืน false เมื่อ scrType==='diac' แล้ว onHoleClick แม็ป placeType เป็น 'diac'; ไม่มีเกต — latch `_lat` จุดชนวนด้วย**แรงดัน** ±V_BO (DIAC_VBO_OPTIONS 8/12/20/28/32V, DB3=32V) แล้วแรงดันตกฮวบเหลือ V_BO−DIAC_DV (breakback 5V) ผ่าน DIAC_RON, ปล่อยเมื่อ |I| < DIAC_IH 0.2mA; ใช้กฎ latch ชุดเดียวกับ SCR (ตัดสินเฉพาะรอบที่ settled + เปลี่ยนได้ครั้งเดียวต่อ solve); drawDiac วาดสามเหลี่ยมประกบ (bowtie) + เรืองแสงตอนแตก; มัลติมิเตอร์อ่าน OL/∞ ทั้งสองทิศเหมือนของจริง; example ดิมเมอร์จริง RC→ไดแอก→เกตไทรแอก หมุนลูกบิด VR แล้วมุมจุดชนวนเลื่อน (ทดสอบแล้ว VR 15%→จุดชนวน 67°/249°, 40%→95°/285°, 70%→143°/ไม่ติด, 100%→มืดสนิท)), **ทรานซิสเตอร์ 3 ขา** (type 'transistor' + tt: npn/pnp/nmos/pmos; pin a=collector/drain, b=emitter/source, g=base/gate; วาง 3 คลิก base/gate→collector/drain→emitter/source ด้วย pendingHole+pendingHole2; ลาก-ย้าย snap ครบ 3 ขา; isThreePin/compNodes แยกขาที่ 3; แผงค่าเลือก β (BJT) / Vth (MOSFET) + **checkbox 'Avalanche' + V_BR (BJT เท่านั้น)**; วาด body วงกลมที่ centroid + ขาสีตามหน้าที่ + ป้าย B/C/E หรือ G/D/S — โหมด avalanche ป้ายขึ้น 'AV·NPN'), **โพเทนชิโอมิเตอร์ 3 ขา** (type 'pot'; a=ปลาย1/b=ปลาย2/g=ตัวปัด; potR() แบ่ง R เป็น R1/R2 ตามลูกบิด VR env.vrPos → วงจรแบ่งแรงดัน; วาง 3 คลิก ปลาย1→ตัวปัด→ปลาย2; drawPot วาด body + แขน wiper เลื่อนตามตำแหน่ง; stamp 2 ตัวต้านทานใน solver), **ออปโตคัปเปลอร์ 4 ขา** (type 'opto'; a=A/b=K = LED ฝั่งเข้า, g=C/h=E = โฟโตทรานซิสเตอร์; isFourPin/compNodes 4 ขา, วาง 4 คลิก A→K→C→E ด้วย pendingHole3 + hlEl3, ลาก-ย้าย snap 4 ขา; solver: LED companion (OPTO_VF 1.1V/OPTO_RD 14Ω, toggle _don เหมือนไดโอด) + ฝั่งออก 3 ย่าน _rg cutoff/active/sat — active stamp VCCS ข้ามฝั่งคุมด้วย (Va−Vk): IC=CTR·IF โดยไม่มีสายเชื่อมสองฝั่ง, sat ใช้ clamp BJT_VCE_SAT/RSAT เดิม; results {If,Ic,region,bright} + เตือน IF>30mA; drawOpto วาดกล่อง DIP + เส้นประ isolation + LED เรืองแสง (optoGlows อัปเดตทุกเฟรม transient) + ลูกศรแสง + ป้ายขา A/K/C/E + 'OPTO CTR% · ย่าน'; อิเล็กตรอนวิ่งแยก 2 เส้น a→b (IF) และ g→h (Ic); แผงค่าเลือก CTR 50–300% (CTR_OPTIONS, แก้ทีหลังได้ในแผงแก้ไข + flip สลับขา A/K); serialize เพิ่ม h/ctr; diode-test อ่าน Vf 1.1V; example ใหม่ 2 แบตแยกวงจร opto คร่อมร่องกลาง), **รีเลย์ SPDT 5 ขา** (type 'relay'; a/b=คอยล์(+/−), g=COM, h=NO, k=NC; วาง 5 คลิก ด้วย pendingHole..pendingHole4 + hlEl4, isFivePin/compNodes 5 ขา, ลาก-ย้าย snap 5 ขา; solver: คอยล์=ตัวต้านทาน RELAY_RCOIL 200Ω, หน้าสัมผัส SPDT เป็น conductance สลับ**ภายในลูป nonlinear**ตาม _en (COM–NO ปิดเมื่อ energize / ไม่งั้น COM–NC ปิด) — latch _en เก็บ hysteresis แบบ _av (ดึงเข้าเมื่อ |Vcoil| ≥ RELAY_VPULL 3V, ปล่อยเมื่อ < RELAY_VDROP 1.2V), persist ข้าม step ไม่ reset; drawRelay: body + คอยล์ (น้ำเงินเมื่อ energize) + อาร์เมเจอร์แกว่ง COM→NO/NC + ป้ายขา +/−/COM/NO/NC, relayGlows อัปเดตทุกเฟรม; results {Vcoil,Icoil,en,Icon}; serialize เพิ่มขา k; example: opto → NPN ขับคอยล์รีเลย์ + flyback diode (ปิดสวิตช์ → รีเลย์ทำงาน → LED ติด)), union-find + MNA solver + iterative diode/zener-reverse/VDR + **transistor** (BJT: B-E diode companion + collector VCCS IC=β·IB ในย่าน active, เลือกย่าน Cut-off จาก vbe<BJT_VBE_ON ส่วน Active↔Saturation ใช้**เกณฑ์กระแส + hysteresis แบบเดียวกับ opto** (อยู่ sat → ออกเมื่อ clamp จะปล่อยกระแสเกิน β·IB; ไม่อยู่ sat → เข้าเมื่อ Vce ยุบถึง clamp) — **ห้ามกลับไปใช้เกณฑ์ vbc > BJT_VBC_ON เด็ดขาด** เพราะ sat companion ให้ Vce = BJT_VCE_SAT + BJT_RSAT·Ic ซึ่งเกณฑ์ vbc จะปฏิเสธคำตอบของโมเดลตัวเองเมื่อ Ic เกิน ~13mA → วน sat↔active จนชน MAXIT (บรรทัด 1014 ไม่เช็ค iter ที่ชน MAXIT → รับคำตอบขยะเงียบๆ → ถ้ามี C ค่าจะ commit ลง _vPrev แล้วระเบิดเป็นแรงดันเกินแหล่งจ่าย), sat แคลมป์ Vce≈0.2V; **โหมด Avalanche (c.av=true, ไม่ใช้ขาเบส): relaxation oscillator — latch t._av จุดชนวนเมื่อ |Vce|≥V_BR (fire → clamp AV_RON≈300Ω คายประจุคอลเลกเตอร์) แล้วดับเมื่อ |I|<AV_IHOLD≈12mA (voltage-trigger + current-hold hysteresis); off = AV_GOFF 1e-12 (คอลเลกเตอร์ลอยไปใกล้ 0 → |Vce|=Vcap); latch อัปเดตครั้งเดียวต่อ step ที่ commit (ไม่อยู่ในลูป region) → กระพริบ LED เองเมื่อต่อกับ RC; results.region='avon'/'avoff' → regionShort FIRE/ARM; serialize `av`/`vbr`**; MOSFET: square-law 3 ย่าน Cut-off/Triode(ohmic)/Saturation ผ่าน Newton companion (mosfetModel → Id/gm/gds, linearize รอบ t._vgs/_vds + voltage limiting), saturation Id=½k·Vov²·(1+λ·Vds) ใช้ขยายได้, เกตไม่กินกระแส; เพิ่ม stampVCCS ใน assembler) + **AC source** (type 'ac'; V(t)=offset+Vp·sin(2πft) ผ่าน srcValue(simTime) รวมกับ battery เป็น sources → ปลดล็อกวงจร AC/ตัวกรอง/เรียงกระแส; transient เดินแม้ไม่มี C/L, substep ละเอียดพอ resolve ความถี่สูง, กราฟ track AC/cap/ind) + transient (Backward-Euler companion สำหรับ C/L + AC, เดินเวลาในลูป animation, กราฟ mini-scope V/I + speed 🐢/▶/⏩ + restart + τ), switch (ปิด=jumper/เปิด=ตัดวงจร; วาดเป็น slide switch — ตัวเรือนเขียว/เทา + ปุ่มเลื่อนซ้าย ON/ขวา OFF), **ปุ่มกด momentary** (type 'button' — `isSwitchy()` รวม switch+button ทุกจุดที่เดิมเช็ค type==='switch': joins/branches/results/tauOf/readout/มัลติมิเตอร์; เริ่มที่ปล่อย (เปิดวงจร) ต่างจากสวิตช์ที่เริ่มปิด; ทำงานตอน pointerdown ไม่ใช่ตอนปล่อย — pressBtn/releaseBtn เก็บ **map pointerId → ปุ่ม** (`pressedBtns`) จึงกดหลายปุ่มพร้อมกันบนจอสัมผัสได้โดยปุ่มแรกไม่ค้าง, ปล่อยที่ pointerup/pointercancel ของ pointer นั้น + safety net ที่ window blur; `freePointer()` คืน implicit pointer-capture ก่อน rebuild() เพราะการวาดใหม่ถอด element ที่ถือ capture ทิ้ง ทำให้ pointerup ไม่ถึง document แล้วปุ่มค้าง; แผงแก้ไขมีปุ่ม 'กดค้าง' (#bb-ed-hold) ทำงานเหมือนกดบนบอร์ด; serialize ไม่เก็บสถานะกด (โหลดมาเป็นปล่อยเสมอ); วาดเป็นปุ่มกลม กดแล้วยุบ + เปลี่ยนเป็นเฉดเข้มของสีตัวเอง (ตัวเรือนเขียวคือสถานะกด); **เลือกสีหัวปุ่มได้ 3 สี** (BTN_COLORS เขียว/แดง/น้ำเงิน — เก็บใน `c.color` เหมือนจัมเปอร์ เลือกตอนวาง + คลิกแก้ทีหลังได้, ของเก่าที่ไม่มีสีตกเป็นแดง, สีไม่มีผลทางไฟฟ้า)), จัมเปอร์เลือกสีได้ (WIRE_COLORS — เก็บ c.color, เลือกตอนวาง + คลิกแก้สีภายหลัง, สีไม่มีผลทางไฟฟ้า), ความสว่าง LED แปรตามกระแส (results.bright ≈ √(I/12mA), updateLeds() หรี่ glow/สีทุกเฟรม transient → ตัวเก็บประจุคายประจุแล้ว LED ค่อยๆ จาง), ตัวต้านทานคงที่วาดแถบสี 5 แถบจริง (bands5/bandColor/multColor → 3 หลัก+ตัวคูณ+tolerance น้ำตาล 1%, body เบจ + ป้ายค่า; VR/NTC/PTC/LDR/VDR ยังใช้แท่ง heat+accent), Environment panel (temp/light/VR knob), คลิกอุปกรณ์เพื่อแก้ไข (ค่า/สี/Vc/ชนิดทรานซิสเตอร์+β/Vth/สลับขั้ว/toggle/ลบ — แสดงย่านทำงาน), ลาก-ย้ายอุปกรณ์ (pointer + snap), electron animation (ทรานซิสเตอร์เดินอิเล็กตรอนทั้งเส้น C→E และเส้นกระแสเบส), มัลติมิเตอร์เสมือน 5 โหมด V/I/Ω/diode-test/continuity (probeCtx จาก solver, คลิกอุปกรณ์/คลิกรู 2 จุด, จอ LCD + หัวโพรบ + เสียงปี๊บ continuity, diode test อ่าน Vf/คลิกซ้ำกลับขั้ว→OL + LED เรืองแสง))
├── js/fan-motor-sim.js — Interactive Fan Speed-Switch sim ในหน้า fan-motor.html (#fan-motor-sim, SVG สร้างจาก JS ทั้งก้อน): กดปุ่ม 0/1/2/3 → แขนปัดสวิตช์ (#fms-wiper) เลื่อนไปแตะหน้าสัมผัสนั้นทีละอัน (ไม่ใช่บัสต่อทุกเบอร์ ไม่งั้นเท่ากับช็อตแท็ปเข้าหากัน) แล้วไฮไลต์เส้นทางกระแสจริง ปลั๊ก→สวิตช์→(โช้คกี่ชุด)→จุดร่วม C→แยก 2 ทาง (ขดรัน = จุดน้ำเงิน / ขดสตาร์ท+คาปาซิเตอร์ = จุดแดง) →นิวทรัล; จุดวิ่งด้วย getPointAtLength บน path จริง (MAIN[0..3]/RUN/START), เบอร์ 0 = แขนปัดชี้หน้าสัมผัสตัน เส้นประส้มค้างที่สวิตช์ (สอนว่าปิดสวิตช์ ≠ ปลอดภัย) ใบพัดค่อยๆ หยุดด้วยความหน่วง; readout แรงดันที่มอเตอร์/โช้คในทาง/rpm/%กำลัง; **ปุ่ม 🔥 ฟิวส์ขาด** (`#fms-fuse-btn` → state `blown`) จำลองเทอร์โมฟิวส์ขาดที่สายนิวทรัลของมอเตอร์ (วาดบนราง N ที่ x 598–664) → ทุกเส้นทางกลายเป็นเส้นประ ไม่มีจุดกระแส ใบพัดหยุด กดเบอร์ไหนก็ไม่ติด + แผง .fms-desc[data-speed='blown'] สอนวิธีวัดและเตือนห้ามลัดข้ามฟิวส์ + แถบวัด + .fms-desc[data-speed] อธิบายรายเบอร์ (bilingual ใน HTML); **ลำดับการวาดสำคัญ**: ตัวเรือนสวิตช์ (.fms-box มี fill) ต้องวาดก่อน base/live ไม่งั้นทับแขนปัดกับเส้นไฟหาย; langchange ต้องดักที่ document (nav.js ไม่ bubble)
├── js/simulation.js    — logic จำลองวงจรและ animation
├── js/capacitor-sim.js — Interactive RC charge/discharge (canvas, R & C sliders → exponential curve, 63.2%@1τ marker, charge/discharge mode, live τ/5τ/Vc/% readout, normalized 0–5τ x-axis)
├── js/power-supply-sim.js — Interactive Power Supply (canvas scope, half/full-wave rectifier + filter C slider + load + 7805 regulator toggle, ripple shrinks with C, constant-current cap discharge sim, traces: pulsating DC/filtered/regulated)
├── js/rectifier-lab.js — Interactive AC→DC Rectifier Lab ในหน้า diode.html (#rectifier-lab): canvas สโคป (AC เข้า/หลังเรียง/คร่อมโหลด/เส้น Vdc + ripple marker) + แผนภาพ SVG 3 วงจรไฮไลต์ไดโอดตัวที่นำกระแสตามเฟส; เลือกวงจร half/center-tap/bridge × ไดโอด Si/Ge/Schottky/Ultra-Fast(UF4007 Vf 1.0V)/Zener(เลือก Vz)/LED/ideal, Vrms 3–24V @50Hz, โหลด 2 โหมด (RL log-slider 50Ω–10kΩ / กระแสคงที่ 5–500mA), filter C 0–4700µF (peak-detector + discharge exp/linear ตามโหมดโหลด); readouts Vp เข้า/ออก, Vdc, ripple Vpp, Ipk/Iavg, PIV/พิกัดทน, f_ripple 50/100Hz, P สูญในไดโอด (= nD·Vf·Iavg) + η ประสิทธิภาพ; แต่ละไดโอดมีพิกัด V_RRM (Si 1000V / Ge 60V / Schottky 40V / UF 1000V / LED 5V) → PIV เกินพิกัดขึ้น badge แดง (เคสสอน: Schottky ครึ่งคลื่น 24Vrms+C → PIV≈67V>40V ต้องใช้ Si; บริดจ์ 3Vrms RL≈100Ω → η Si ~62% vs Schottky ~86% ต้องใช้ Schottky); Zener breakdown เมื่อแรงดันย้อนเกิน Vz → half-wave เห็นคลื่นรั่วด้านลบ, CT/bridge ยอดคลื่นถูกกด + badge เตือนแดง; แผงคำนวณสด "ที่มาของตัวเลข" #rl-math (แทนค่าสูตร Vp=√2·Vrms → Vp(out)=Vp−n·Vf → Vdc=0.318/0.637·Vp(out) หรือ Vpp≈I/fC + Vdc≈Vp(out)−Vpp/2 พร้อมเทียบค่าวัด; warnZ → ขึ้นข้อความสูตรใช้ไม่ได้), จุดส้มวิ่งตามเส้นทางกระแสจริงในแผนภาพ (FLOWPATHS ต่อวงจรต่อครึ่งคลื่น — บริดจ์เห็นกระแสผ่านโหลดทิศเดิมทั้งสองครึ่ง, โชว์เฉพาะช่วงไดโอดนำกระแส → มี C จะเห็นเป็นห้วงสั้นๆ ที่ยอด), ปุ่ม speed ⏸/🐢(0.25×)/▶ (#rl-speed, state.speed คูณทั้ง sweep + flow); CSS `.rl-*` อยู่ใน <style> ของ diode.html
├── js/555-sim.js       — Interactive 555 Astable (canvas, R1/R2/C sliders → real f/T/Duty, draws Vcap charge/discharge between ⅓–⅔Vcc + output square wave, blinking LED in step with output, Vcc=5V, visual sweep = CYCLES periods)
├── js/opamp-sim.js     — Interactive Op-Amp amplifier (canvas, mode inverting/non-inverting + Rin/Rf/Vin sliders → closed-loop gain, draws input sine + amplified output clipped at ±Vsat=12V, readouts gain/Vout/clip)
├── js/logic-sim.js     — Interactive Logic Gate (canvas, <select> gate + toggle A/B buttons → draws gate symbol w/ state-coloured wires + output LED, builds & highlights truth table; listens to langchange)
├── js/opto-sim.js      — Interactive Optocoupler (canvas: LED เรืองแสง + จุดโฟตอนข้าม isolation gap + โฟโตทรานซิสเตอร์ + แถบ Vout; sliders IF 0–20mA / CTR 50–300% / RL 0.1–10kΩ, Vcc=5V คงที่ → readouts IC, Vout, CTR×IF, สถานะ OFF/ACTIVE/SAT — สอน saturation drive margin)
├── js/scr-sim.js       — Interactive Phase-Control Dimmer ในหน้า thyristor.html (canvas #scr-canvas: คลื่นแหล่งจ่าย AC เส้นประ + แถบเขียวช่วงนำกระแส + แรงดันคร่อมโหลดสีส้ม + เส้นแดงจุดชนวน α + หลอดไฟที่สว่างตาม %กำลัง; ปุ่มโหมด SCR (ครึ่งคลื่น) / TRIAC (เต็มคลื่น) + sliders α 0–180° / Vrms 12–240V / โหลด 50–1500Ω → readouts Vrms คร่อมโหลด, กำลัง, %ของเต็มกำลัง (SCR ที่ α=0 ได้ 50% เพราะใช้แค่ครึ่งคลื่น), มุมนำกระแส; สูตร Vrms = Vs·√[(π−α+sin2α/2)/π] (TRIAC) หรือ /2π (SCR))
├── js/announcements.js — กล่อง "ข่าวสาร/อัปเดตล่าสุด" บนหน้าแรก (data-driven: array ANNOUNCEMENTS {id,date,type:lesson/download/update,th,en,href,expires?,cat?,file?} → render เข้า #announcements ใน index.html, bilingual th-only/en-only, ป้าย "ใหม่" เมื่อ date ≤30 วัน, auto-expire: หายเองเมื่อเลย ANN_MAX_AGE_DAYS (=3) วันจาก date หรือเลย expires (ถ้าใส่ override อายุ default), ปิดได้รายอัน เก็บใน localStorage key `ann-dismissed`, download-type แนบ cat/file เป็น query ให้ downloads.html กรอง/ไฮไลต์ให้เอง)
├── index.html          — หน้าหลัก (CURRENT_PAGE='home') — กลุ่มตรงกับ navbar: บทเรียน / งานปฏิบัติ / เครื่องมือ / คลังการเรียนรู้ + กล่องข่าวสาร (#announcements → announcements.js)
├── electricity.html    — บทที่ 1
├── ohm.html            — บทที่ 2
├── resistor.html       — บทที่ 3: รหัสสี 4 แถบ + 5 แถบ (ตารางครบทั้งคู่)
├── capacitor.html      — บทที่ 4: ชนิด, Q=CV+พลังงาน, RC time constant, อ่านรหัส, tolerance/voltage, อนุกรม/ขนาน + Interactive RC charge/discharge sim (canvas)
├── inductor.html       — บทที่ 5
├── power-supply.html   — แหล่งจ่ายไฟ: 4 ขั้น (หม้อแปลง→เรียงกระแส→กรอง→เรกูเลต), block diagram, สูตร ripple, 78xx/zener, linear vs switching, safety + Interactive Power Supply sim (canvas)
├── multimeter.html     — บทที่ 6
├── soldering.html      — บทที่ 7
├── diode.html          — บทที่ 9: PN Junction, I-V Curve, LED Vf by color, Rectifier Circuit + Interactive AC→DC Rectifier Lab (canvas, js/rectifier-lab.js)
├── transistor.html     — BJT (NPN/PNP) + MOSFET: สัญลักษณ์, 3 ย่าน (Cut-off/Active/Saturation), สูตร β/IC/IE, เช็คด้วยมัลติมิเตอร์, เบอร์ยอดนิยม + ซิมทีละขั้นโต้ตอบได้ 2 ตัว: "ภายในทรานซิสเตอร์ 1–5" (bjt-steps.js) และ "วงจรจริงทีละขั้น 1–6" (bjt-circuit.js)
├── thyristor.html      — ไทริสเตอร์ SCR/TRIAC/DIAC (CURRENT_PAGE='thyristor'): ตารางเทียบ 3 ตัว, โครงสร้าง PNPN 4 ชั้น + สัญลักษณ์ SVG (A/K/G), แบบจำลอง 2 ทรานซิสเตอร์อธิบายการล็อกตัว (latch), 3 สภาวะ (forward blocking/conducting/reverse blocking), I_L vs I_H, ทำไม AC ถึงดับเองที่จุดตัดศูนย์, phase control + สูตร Vrms + Interactive Dimmer sim (canvas, js/scr-sim.js), TRIAC/DIAC + วงจรดิมเมอร์ R-C+DIAC+TRIAC (SVG), สเปค (V_DRM/V_RRM, I_GT, I_H, dv/dt) + เบอร์ยอดนิยม (BT136/BTA16/BT151/MCR100-6/DB3), การใช้งาน (ดิมเมอร์/SSR/ครอว์บาร์/soft starter), เช็คด้วยมัลติมิเตอร์ 3 ขั้น + ทดสอบ latch ด้วยแบต+LED, ความปลอดภัยไฟบ้าน (ตัวถัง = MT2 มีไฟ, snubber, ห้ามใช้กับ LED ที่ไม่ dimmable)
├── ic.html             — IC วงจรรวมเบื้องต้น: IC คืออะไร/ทำไมต้องรวม, ระดับการรวม (SSI→VLSI), แพ็กเกจ (DIP/SOIC/QFP/BGA), นับขา+หา Pin 1 (notch/dot, SVG DIP-8), อนาล็อก vs ดิจิทัล vs mixed-signal, อ่าน datasheet, IC ยอดนิยม (555/op-amp/7805/74xx/ATmega), ESD/การจับ (SVG, ไม่มี sim)
├── 555.html            — IC ตั้งเวลา 555: คืออะไร+ทำไมชื่อ 555, ขา 8 ขา (SVG DIP-8 pinout), โหมด Astable vs Monostable, สูตร t_HIGH/t_LOW/f/Duty (astable) + T=1.1RC (monostable), การใช้งาน, ทิป (RESET→Vcc, CTRL 10nF) + Interactive Astable sim (canvas)
├── op-amp.html         — ออปแอมป์: สัญลักษณ์ +/− (SVG), กฎทอง (V+=V−, ไม่มีกระแสเข้าขา), comparator (open loop), inverting (−Rf/Rin) / non-inverting (1+Rf/Rin) / buffer + วงจร SVG, ใช้งานจริง, เบอร์ยอดนิยม (741/LM358/LM324/TL07x) + ทิป (dual/single supply, rail-to-rail, slew) + Interactive amplifier sim (canvas, gain+clipping)
├── logic-gates.html    — ลอจิกเกต: ดิจิทัล 0/1 (LOW/HIGH), 7 เกต (AND/OR/NOT/NAND/NOR/XOR/XNOR) + นิพจน์บูลีน + ตารางความจริงรวม, universal gates (NAND/NOR) + De Morgan, IC 74xx (7408/7432/7404/7400/7486)/CMOS + ทิป (logic levels, ห้ามอินพุตลอย, decoupling) + Interactive gate sim (canvas)
├── relay.html          — รีเลย์: โครงสร้าง (coil/armature/spring), COM/NO/NC, Pole&Throw (SPST/SPDT/DPDT), สเปค (coil V/R, contact rating), ชนิด (EMR/Reed/SSR/รถยนต์), วงจรขับด้วยทรานซิสเตอร์ + flyback diode, หาขา/เช็คด้วยมัลติมิเตอร์, ความปลอดภัย (SVG diagrams, ไม่มี sim)
├── optoelectronics.html — ออปโตอิเล็กทรอนิกส์ (CURRENT_PAGE='opto'): ภาพรวม emitter/detector, ฝั่งกำเนิดแสง (LED/IR LED/เลเซอร์ + 7-Segment CC/CA พร้อม SVG แท่ง a–g และตารางเลข→แท่ง), ฝั่งรับแสง (ตารางเทียบ LDR/โฟโตไดโอด/โฟโตทรานซิสเตอร์/โซลาร์เซลล์ — ความไว/ความเร็ว), ออปโตคัปเปลอร์ PC817 (SVG โครงสร้างภายใน DIP-4 + วงจรใช้งาน MCU→โหลดต่างกราวด์, สูตร CTR=IC/IF×100%), การใช้งานจริง (รีโมท IR 38kHz, opto-interrupter/encoder, ไฟเบอร์ออปติก, feedback ใน SMPS), เช็คด้วยมัลติมิเตอร์ (LED/LDR/PC817 3 ขั้นตอน + ทิปดู IR ผ่านกล้องมือถือ) + Interactive Optocoupler sim (canvas, js/opto-sim.js)
├── home-wiring.html    — บทเสริม: ระบบ L/N/G, แรงดันลอย (Ghost Voltage), ไฟรั่วจริง, Socket Tester, ความปลอดภัย
├── oscilloscope.html   — บทที่ 10: โครงสร้าง CRT, เทคนิคสำคัญ (Trigger/Probe ×1×10/Coupling), สูตร T/f/Vpp/Duty, ตัวอย่าง 4 โจทย์, Interactive Scope Reading Trainer (canvas), วงจร Octopus (Curve Tracer) + Interactive I-V Curve Simulator (canvas, 11 อุปกรณ์)
├── signal-generator.html — บทที่ 11: คลื่น 4 แบบ, โครงสร้าง 7 ส่วน, พารามิเตอร์สำคัญ (f/T, Vpp/Vp/Vrms, Duty, Offset) + Interactive Waveform Generator (canvas)
├── fan-motor.html      — งานซ่อม: มอเตอร์พัดลมไฟฟ้า (CURRENT_PAGE='repair-fan') — ขดรัน/สตาร์ท/โช้ค (350Ω/400Ω/80Ω×2, SVG แผนภาพขดลวด), วัดขดลวดวินิจฉัยอาการ (ขาด/ช็อตรอบ/ปกติ), หาขั้วสาย R/S/1/2/3 ทั้งแบบ 5 สาย (รุ่นเก่า) และ 6 สาย (รุ่นใหม่ คาปาอยู่บนกระโหลก) ด้วยมัลติมิเตอร์ + Interactive Speed-Switch sim (SVG, js/fan-motor-sim.js — กด 0/1/2/3 ดูกระแสวิ่งจริง + ปุ่มจำลองเทอร์โมฟิวส์ขาด, แยกทางที่จุดร่วม C เข้าขดรัน/ขดสตาร์ท+คาปา, ใบพัดหมุนตามรอบ)
├── induction-stove.html — งานซ่อม: เตาแม่เหล็กไฟฟ้า (CURRENT_PAGE='repair-stove') — หลักการเหนี่ยวนำแม่เหล็กไฟฟ้า 4 ขั้นตอน (rectify→IGBT switching 20-30kHz→สนามแม่เหล็ก→eddy current), ตาราง 7 อะไหล่หลักบนบอร์ด (bridge rectifier/filter choke+cap/IGBT/C-resonance/CT/switching PSU/gate driver), คลินิกวิเคราะห์อาการเสีย 6 เคส (short/no-5V/gate ไม่ถึง IGBT/เปลี่ยน IGBT แล้วระเบิดซ้ำ/E0-E1 pan detect/E2-E5 ความร้อน), กฎความปลอดภัย (คายประจุ 310V ด้วยหลอดไฟ + ทดสอบผ่านปลั๊กอนุกรมหลอด 100W) (ไม่มี sim)
├── simulation.html     — จำลองวงจร 3 แบบ (Series/Parallel/Mixed) + วิธีคำนวณ real-time + LED toggle
├── breadboard.html     — ทดลองบนเบรดบอร์ด (400-point): เลือก/วางอุปกรณ์ R (คงที่/VR/NTC/PTC/LDR/VDR)/ไดโอด+LED (ซิลิคอน/เจอร์เมเนียม/ชอตต์กี/ซีเนอร์/TVS กันไฟกระชาก/LED รวมเป็น list เดียว)/จัมเปอร์ (เลือกสีได้ — แดง/เขียว/น้ำเงิน/…)/สวิตช์/ปุ่มกด (momentary NO — กดค้างวงจรต่อ ปล่อยแล้วตัด, หัวปุ่มเลือกได้ 3 สี)/แบตเตอรี่/แหล่งจ่าย AC (ไซน์ Vp/f/offset)/ตัวเก็บประจุ/ตัวเหนี่ยวนำ/ทรานซิสเตอร์ (NPN/PNP/N-MOSFET/P-MOSFET — วาง 3 ขา)/SCR กับไทรแอก 3 ขา (ยิงเกตแล้วล็อกตัว ดับเมื่อกระแสต่ำกว่า I_H)/ไดแอก 2 ขา (ไม่มีเกต แตกเองที่ ±V_BO — ใช้จุดชนวนไทรแอกในวงจรดิมเมอร์)/โพเทนชิโอมิเตอร์ 3 ขา (แบ่งแรงดัน)/ออปโตคัปเปลอร์ 4 ขา (A-K → แสง → C-E, IC=CTR·IF, สองฝั่งแยกกันทางไฟฟ้า)/รีเลย์ SPDT 5 ขา (คอยล์ + COM/NO/NC — จ่ายไฟคอยล์ถึงระดับดึงเข้าแล้วสลับ COM→NO, hysteresis) เอง, มัลติมิเตอร์เสมือน (V/I/Ω/diode-test/continuity), แผงสภาพแวดล้อม (อุณหภูมิ/แสง/VR knob), แผง Transient (กราฟ V/I ตามเวลา + speed + restart + τ; รองรับ AC/RC/เรียงกระแส), คลิกแก้ไข + ลาก-ย้ายอุปกรณ์, คำนวณวงจรจริง (MNA + transient + ทรานซิสเตอร์ Cut-off/Active/Saturation), LED ติด/ดับ, electron animation, บันทึก/โหลดวงจร (localStorage) + แชร์ลิงก์ (URL `?c=`)
├── relay-lab.html      — ห้องแล็บวงจรควบคุมรีเลย์ OMRON MY4 (CURRENT_PAGE='relay-lab', แยกจาก breadboard): แผง SVG 24VDC + รีเลย์ MY4 4PDT (14 ขา — คอยล์ 14(+)/13(−), ชุด n: COM 8+n/NO 4+n/NC n) + สวิตช์/ปุ่มกด NO-NC (momentary START/STOP, ตัวเรือนสี่เหลี่ยม)/ไฟแสดง/บัซเซอร์ (WebAudio)/**มอเตอร์ 24VDC** (type 'motor', R 120Ω — ทิศหมุนตามขั้วแรงดันที่ป้อน: results {v,i,run,dir,speed}, dir>0 เดินหน้า / dir<0 ถอยหลัง, โรเตอร์หมุนใน frame loop; ladder รองรับ load {t:'motor',dir}) เดินสายจัมเปอร์เอง; รางไฟด้านข้าง +24V (ซ้าย)/0V (ขวา) จุดต่อทุกแถวลดสายพันกัน; **จุดพักไฟ (terminal block) TB-1…TB-10 แถวล่าง จุดละ 4 รู** — รูในจุดเดียวกันเป็นโหนดเดียว (รวมใน `keyOf`: `TB:p:h` → `TB:p`) คนละจุดแยกจากกัน, ใช้พักสายที่ต้องแตกหลายทางแทนการยัดสายซ้อนที่ขาอุปกรณ์ (ตัวอย่าง latch/alarm เดินผ่าน TB แล้ว); จุดพักไฟไม่ใช่อุปกรณ์ — โหนดโผล่มาทางสายเท่านั้น solver จึงต้องจอง nid() ของปลายสายทุกเส้น **ก่อน** ตรึงขนาดเมทริกซ์; หัวปุ่มกด/ตัวสวิตช์วาดในเลเยอร์ `gTop` เหนือเลเยอร์สาย ไม่งั้นแถบรับคลิกของสายที่พาดผ่านจะกินคลิกจนกดปุ่มไม่ได้; คลิกสาย/จุดต่อ/อุปกรณ์ = ไฮไลต์กระพริบไล่วงจร; เมนู 9 ตัวอย่าง (basic/latch(self-holding)/interlock/AND-OR/swap/alarm+ack/**failsafe-ok (STOP แบบ NC) / failsafe-bad (STOP แบบ NO ผ่านรีเลย์ — ลบสายปุ่ม STOP แล้วหยุดไม่ได้) / fwdrev (กลับทางหมุนมอเตอร์ + อินเตอร์ล็อก)**) + มุมมองแผนภาพ Ladder (ไฮไลต์เส้นมีไฟจริง); **🎯 โหมดภารกิจ (MISSIONS 7 ข้อ: mNO/mSwap/mLatch/mAnd/mOr/mInter/mFwdRev — expect ของมอเตอร์เขียนเป็นสตริง 'fwd'/'rev'/'stop')** — ปุ่ม "เตรียมอุปกรณ์" (prepareMission → resetBoard + mk* ตามลำดับ parts จึงได้ id K1/S1/L1… ตรงกับโจทย์) + ปุ่ม "ตรวจคำตอบ" (gradeMission: เช็คอุปกรณ์ครบ → เช็คโครงสร้าง links ด้วย union-find บนสาย (เช่น L1 ต้องอยู่โหนดเดียวกับขา NO 5–8 ของ K1) → snapshot สถานะ → ไล่ set สวิตช์/ปุ่มทีละ step แล้วเรียก solveRelayLab ซ้ำ (latch `_en` เดินต่อข้าม step จึงตรวจ self-holding ได้) → คืนสถานะเดิม + requestSolve) แสดงผลราย step ✓/✗ ใน `#rly-mission`; บันทึก/โหลด (localStorage `rly-saves`) + แชร์ลิงก์ `?c=` (js/relay-lab.js — engine nodal-analysis DC pure ทดสอบ Node ได้ถึง `/* ===== END ENGINE`)
├── formulas.html       — สูตรสรุป + print-friendly
├── tools.html          — เครื่องคิดเลข 7 ตัว (4-band + 5-band มีชื่อไทย-อังกฤษครบ)
├── quiz.html           — แบบทดสอบ 92 ข้อ 14 หมวด — มีข้อสอบ EN ครบทุกข้อ
├── downloads.html      — ดาวน์โหลด PDF 41 ไฟล์ (มีหัวข้อ "ใบงาน" → pdf/worksheet/ + หัวข้อ "งานซ่อม" → pdf/workshop/) + toolbar ค้นหา/กรองหมวด (sticky: #dl-search + #dl-chips, sections มี data-cat)
├── pdf/                — ไฟล์ PDF ภาษาไทย (~24 MB) — สื่อจากหลายแหล่ง ไม่อยู่ใต้ CC (ดู LICENSE)
└── LICENSE             — CC BY-NC 4.0 (คลุมเฉพาะเนื้อหา/โค้ดต้นฉบับ; PDF แยกออกตาม NOTICE ในไฟล์)
```

## กฎสำคัญ

### แต่ละหน้า HTML ต้องมี (ก่อน nav.js เสมอ)
```html
<html lang="th" data-title-th="ชื่อหน้า TH" data-title-en="Page Title EN">
<head>
  ...
  <title>...</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
  <!-- lang detect: ต้องอยู่ก่อน CSS ใดๆ -->
  <script>!function(){var l=localStorage.getItem('lang');if(l==='en')document.documentElement.lang='en'}()</script>
  ...
</head>
<body>
  <div id="nav-placeholder"></div>
  ...
  <script>const CURRENT_PAGE='id';</script>
  <script src="nav.js"></script>
</body>
```
CURRENT_PAGE ids: `home`, `electricity`, `ohm`, `resistor`, `diode`, `transistor`, `thyristor`, `ic`, `timer555`, `opamp`, `logic`, `relay`, `opto`, `capacitor`, `inductor`, `power-supply`, `multimeter`, `soldering`, `home-wiring`, `oscilloscope`, `signal-generator`, `repair-fan`, `repair-stove`, `simulation`, `breadboard`, `relay-lab`, `formulas`, `tools`, `quiz`, `downloads`

### ระบบ 2 ภาษา (Bilingual System)
- CSS ใน style.css:
  ```css
  html[lang="en"] .th-only { display: none !important; }
  html:not([lang="en"]) .en-only { display: none !important; }
  ```
- เนื้อหา Thai ห่อด้วย `class="th-only"`, เนื้อหา English ห่อด้วย `class="en-only"`
- ทั้ง block-level (`<h1>`, `<p>`, `<ul>`) และ inline (`<span>`) ใช้ได้
- nav.js จัดการ TH/EN toggle + บันทึกใน localStorage key `lang`
- nav.js dispatch `CustomEvent('langchange')` ทุกครั้งที่เปลี่ยนภาษา
- **quiz.html** ใช้ `QUIZ_CATEGORIES_TH` / `QUIZ_CATEGORIES_EN` แยกกัน, `getCurLang()` เลือก dataset ที่ถูกต้อง และ listen `langchange` event เพื่อ re-init category menu
- title ของแต่ละหน้าเปลี่ยนตามภาษาผ่าน `data-title-th` / `data-title-en` บน `<html>`
- **หมายเหตุ:** `<span>` ใน `<option>` ของ `<select>` ไม่ถูก CSS hide — browser แสดงข้อความทั้งหมด ดังนั้น option ควรเขียนเป็น `0 — <span class="th-only">ดำ</span> Black` เพื่อให้แสดงทั้งไทย-อังกฤษเสมอ

### Navigation (nav.js)
- NAV_LESSON_GROUPS → mega menu "บทเรียน / Lessons" แบ่ง 5 กลุ่ม: พื้นฐานไฟฟ้า, อุปกรณ์อิเล็กทรอนิกส์, วงจรรวมและดิจิทัล (ic/timer555/opamp/logic), เครื่องมือวัดและทดสอบ, งานซ่อมเครื่องใช้ไฟฟ้า (fan-motor/induction-stove — กลุ่มที่โตได้เรื่อยๆ ตามเครื่องใช้ไฟฟ้าที่เพิ่ม)
- บน desktop แสดง mega menu 4 คอลัมน์ (`.nav-mega-menu` ใน style.css = `repeat(4,...)` width 900px); บน mobile กลุ่มบทเรียนเป็น accordion เปิดทีละกลุ่ม
- NAV_PRACTICE (soldering, home-wiring) → dropdown "งานปฏิบัติ / Practical"
- NAV_TOOLS (simulation, breadboard, relay-lab, formulas, tools) → dropdown "เครื่องมือ ▼" / "Tools ▼"
- NAV_RESOURCES (quiz, downloads) → dropdown "คลังการเรียนรู้ / Resources"
- Dark mode: `[data-theme="dark"]` บน `<html>`, บันทึกใน localStorage key `theme`
- Lang toggle: ปุ่ม TH / EN ใน nav bar ทุกหน้า
- **Back-to-top button:** inject `<button id="back-to-top">` เข้า body อัตโนมัติ — ปรากฏเมื่อ scroll > 320px
- **Footer topic-count:** nav.js ต่อท้าย `.footer-topics` ("ครอบคลุมเนื้อหาจาก N หัวข้อ" / "Covering N topics") เข้า `<footer>` ทุกหน้าอัตโนมัติ — เลข N นิยามที่เดียวใน `const TOPIC_COUNT` ใน nav.js (อย่า hardcode ในแต่ละหน้า); เพิ่มหน้าใหม่แล้วอยากปรับเลข → แก้ที่ TOPIC_COUNT ที่เดียว
- **Footer license:** nav.js ต่อท้าย `.footer-license` (ลิงก์ CC BY-NC 4.0, bilingual th-only/en-only) เข้า `<footer>` ทุกหน้าอัตโนมัติ — ไม่ต้องแก้ทีละไฟล์

> **กฎ:** เมื่อเพิ่มหน้าใหม่ใน nav.js (NAV_LESSON_GROUPS / NAV_PRACTICE / NAV_TOOLS) ต้องอัปเดต **index.html** ด้วยเสมอ — เพิ่ม card ในกลุ่มที่ตรงกัน และแก้ card ดาวน์โหลด; ส่วนจำนวนหัวข้อใน footer แก้ที่ `TOPIC_COUNT` ใน nav.js ที่เดียว (ทุกหน้าอัปเดตพร้อมกัน)

### CSS (style.css)
- Color palette: `--primary: #2563eb`, `--accent: #06b6d4`, `--secondary: #10b981`, `--bg: #f8fafc`
- ใช้ CSS custom properties: `--primary`, `--primary-dark`, `--accent`, `--bg`, `--card`, `--text`, `--border`, `--shadow`, `--shadow-hover`, `--radius`
- Dark mode override ด้วย `[data-theme="dark"] { ... }`
- Print styles อยู่ใน `@media print` — ซ่อน `.print-hide`, แสดง `.print-sheet-header`
- Responsive breakpoints: 768px (hamburger), 640px (font size)
- Smooth scroll: `html { scroll-behavior: smooth; }`
- **Topic card color accents:** `.topic-card-blue` (บทเรียน), `.topic-card-teal` (เครื่องมือ), `.topic-card-orange` (quiz), `.topic-card-green` (downloads) — border-top 4px

### หน้าหลัก index.html — โครงสร้างตาม navbar
| กลุ่ม | หน้า | สี card |
|---|---|---|
| 📚 พื้นฐานไฟฟ้า | electricity, ohm | `topic-card-blue` |
| 📚 อุปกรณ์อิเล็กทรอนิกส์ | resistor, diode, capacitor, transistor, thyristor, inductor, relay, opto, power-supply | `topic-card-blue` |
| 📚 วงจรรวมและดิจิทัล | ic, timer555, opamp, logic | `topic-card-blue` |
| 📚 เครื่องมือวัดและทดสอบ | multimeter, signal-generator, oscilloscope | `topic-card-blue` |
| 📚 งานซ่อมเครื่องใช้ไฟฟ้า | fan-motor, induction-stove | `topic-card-blue` |
| 🧰 งานปฏิบัติ | soldering, home-wiring | `topic-card-teal` |
| 🛠 เครื่องมือ | simulation, breadboard, formulas, tools | `topic-card-teal` |
| 📚 คลังการเรียนรู้ | quiz, downloads | `topic-card-orange` / `topic-card-green` |

### Deploy
```bash
git add <files>
git commit -m "message"
git push
```
GitHub Pages อัปเดตภายใน ~30 วินาที

## เนื้อหาเครื่องคิดเลข (js/tools.js)
| ฟังก์ชัน | คำอธิบาย |
|---|---|
| `calcR4()` | Resistor 4-band color → value |
| `calcR5()` | Resistor 5-band color → value |
| `calcReverse()` | Resistor value → color bands |
| `calcOhm()` | Ohm's Law (V/I/R) |
| `calcPower()` | Power calculator (P/V/I/R) |
| `calcEnergy()` | Energy W = P × t |
| `calcRS()` / `calcRP()` | Series/Parallel resistors |
| `calcCS()` / `calcCP()` | Series/Parallel capacitors |
| `calcUnit()` | Unit converter |

## Quiz Data Structure (quiz.html)
```js
// สองชุดข้อมูลแยกกัน
const QUIZ_CATEGORIES_TH = [ { id, icon, name, questions:[{q, opts, ans, exp}] } ]
const QUIZ_CATEGORIES_EN = [ { id, icon, name, questions:[{q, opts, ans, exp}] } ]

// helpers
getCurLang()   // returns 'th' | 'en'
getQuizData()  // returns TH or EN dataset based on current lang
```
- `ans` คือ index (0-based) ของตัวเลือกที่ถูกต้อง
- เมื่อเปลี่ยนภาษาระหว่างดูเมนู → re-init อัตโนมัติ
- เมื่อเปลี่ยนภาษาระหว่างทำข้อสอบ → คำถามชุดเดิมจะเล่นต่อจนจบ (ไม่ reset กลางคัน)
