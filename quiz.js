const QUIZ_CATEGORIES_TH = [
  { id:'electricity', icon:'⚡', name:'แหล่งกำเนิดไฟฟ้า', questions:[
    {q:'ไฟฟ้าที่เกิดจากการกดหรือบิดผลึกควอตซ์ เรียกว่าอะไร?',opts:['Thermoelectric Effect','Piezoelectric Effect','Photoelectric Effect','Electromagnetic Induction'],ans:1,exp:'Piezoelectric Effect คือการเกิดไฟฟ้าจากแรงกดดันบนผลึกบางชนิด เช่น ควอตซ์ ใช้ในไฟแช็คและลำโพง'},
    {q:'Thermocouple ผลิตไฟฟ้าจากแหล่งกำเนิดใด?',opts:['แสงสว่าง','การเสียดสี','ความร้อน','สนามแม่เหล็ก'],ans:2,exp:'Thermocouple เกิดจากการต่อโลหะต่างชนิดสองเส้นแล้วให้ความร้อนที่รอยต่อ จะเกิดแรงดันไฟฟ้า ใช้วัดอุณหภูมิสูง'},
    {q:'Solar Cell แปลงพลังงานใดเป็นพลังงานไฟฟ้า?',opts:['ความร้อน','การเสียดสี','สนามแม่เหล็ก','แสงสว่าง'],ans:3,exp:'Solar Cell ใช้หลัก Photoelectric Effect โดยแสงกระทบสารกึ่งตัวนำ (Silicon) แล้วปลดปล่อยอิเล็กตรอนเกิดกระแสไฟฟ้า'},
    {q:'Generator ใช้หลักการใดในการผลิตไฟฟ้า?',opts:['Piezoelectric Effect','Chemical Reaction','Photoelectric Effect','Electromagnetic Induction'],ans:3,exp:'Generator ใช้หลัก Electromagnetic Induction คือตัวนำตัดสนามแม่เหล็ก ทำให้เกิด EMF ตามกฎของฟาราเดย์'},
    {q:'แบตเตอรี่ผลิตไฟฟ้าจากแหล่งกำเนิดใด?',opts:['ความร้อน','ปฏิกิริยาเคมี','แสงสว่าง','การเสียดสี'],ans:1,exp:'แบตเตอรี่ใช้ปฏิกิริยาเคมีระหว่างสารเคมีภายใน เรียกว่า Voltaic Cell แปลงพลังงานเคมีเป็นพลังงานไฟฟ้า'},
    {q:'ไฟฟ้าสถิต (Static Electricity) แตกต่างจากไฟฟ้ากระแสอย่างไร?',opts:['มีแรงดันสูงกว่า','ประจุไม่ไหล ไม่เคลื่อนที่','เป็น AC','อันตรายกว่า'],ans:1,exp:'ไฟฟ้าสถิตคือประจุที่สะสมอยู่นิ่ง ไม่ไหลในวงจร ส่วนไฟฟ้ากระแสคืออิเล็กตรอนที่เคลื่อนที่ในตัวนำอย่างต่อเนื่อง'},
    {q:'ไฟฟ้า AC ต่างจาก DC อย่างไร?',opts:['AC แรงดันสูงกว่าเสมอ','AC กระแสไหลทิศทางเดียว','AC กระแสเปลี่ยนทิศทางตามความถี่','AC ใช้ในแบตเตอรี่'],ans:2,exp:'AC คือกระแสที่เปลี่ยนทิศทางไปมาตามความถี่ เช่น ไฟบ้าน 220V 50Hz ส่วน DC ไหลทิศเดียวตลอด'},
    {q:'ตัวนำไฟฟ้าดีมีอิเล็กตรอนในวงนอกสุดกี่ตัว?',opts:['1-3 ตัว','4 ตัว','5-7 ตัว','8 ตัว'],ans:0,exp:'ตัวนำไฟฟ้าดี เช่น ทองแดง มีอิเล็กตรอนในวงนอกสุด 1-3 ตัว ทำให้หลุดออกได้ง่ายเมื่อมีแรงดัน กลายเป็นกระแสไฟฟ้า'},
  ]},
  { id:'ohm', icon:'🔢', name:'กฎของโอห์ม', questions:[
    {q:'วงจรมีแรงดัน E = 12V และความต้านทาน R = 4Ω กระแส I มีค่าเท่าไร?',opts:['2 A','3 A','4 A','48 A'],ans:1,exp:'I = E/R = 12/4 = 3 A ตามกฎของโอห์ม'},
    {q:'วงจรมีกระแส I = 2A และความต้านทาน R = 5Ω แรงดัน E มีค่าเท่าไร?',opts:['2.5 V','7 V','10 V','0.4 V'],ans:2,exp:'E = I × R = 2 × 5 = 10 V'},
    {q:'วงจรมีแรงดัน E = 24V และกระแส I = 3A ความต้านทาน R มีค่าเท่าไร?',opts:['72 Ω','0.125 Ω','8 Ω','27 Ω'],ans:2,exp:'R = E/I = 24/3 = 8 Ω'},
    {q:'กำลังไฟฟ้า P = EI ถ้า E = 10V และ I = 2A กำลังไฟฟ้ามีค่าเท่าไร?',opts:['5 W','12 W','20 W','0.2 W'],ans:2,exp:'P = E × I = 10 × 2 = 20 W'},
    {q:'หลอดไฟ 100W เปิดใช้งาน 5 ชั่วโมง ใช้พลังงานกี่หน่วย (kWh)?',opts:['500 หน่วย','50 หน่วย','0.5 หน่วย','5 หน่วย'],ans:2,exp:'W = P × t = 100W × 5h = 500 Wh = 0.5 kWh = 0.5 หน่วย'},
    {q:'1 kΩ มีค่าเท่ากับกี่ Ω?',opts:['10 Ω','100 Ω','1,000 Ω','10,000 Ω'],ans:2,exp:'k = กิโล = 1,000 ดังนั้น 1 kΩ = 1,000 Ω'},
    {q:'ถ้า P = 50W และ R = 2Ω แรงดัน E มีค่าเท่าไร?',opts:['10 V','100 V','25 V','5 V'],ans:0,exp:'E = √(P×R) = √(50×2) = √100 = 10 V'},
    {q:'1 mA เท่ากับกี่ A?',opts:['0.1 A','0.01 A','0.001 A','0.0001 A'],ans:2,exp:'m = มิลลิ = 10⁻³ ดังนั้น 1 mA = 0.001 A'},
  ]},
  { id:'resistor', icon:'🎨', name:'ตัวต้านทาน', questions:[
    {q:'ตัวต้านทานสี น้ำตาล-ดำ-แดง-ทอง มีค่าเท่าไร?',opts:['102 Ω','1,000 Ω ±5%','120 Ω','10,200 Ω'],ans:1,exp:'น้ำตาล=1, ดำ=0 → 10; แดง=×100; ทอง=±5% → 10×100 = 1,000 Ω = 1kΩ ±5%'},
    {q:'แถบสี Gold ในตำแหน่งที่ 4 หมายถึงอะไร?',opts:['ตัวคูณ ×0.1','ค่าผิดพลาด ±5%','เลขหน้า 0','ค่าผิดพลาด ±10%'],ans:1,exp:'แถบที่ 4 คือค่าผิดพลาด (Tolerance) ทอง = ±5%'},
    {q:'R1 = 100Ω และ R2 = 200Ω ต่ออนุกรมกัน RT มีค่าเท่าไร?',opts:['66.7 Ω','150 Ω','300 Ω','20,000 Ω'],ans:2,exp:'วงจรอนุกรม RT = R1 + R2 = 100 + 200 = 300 Ω'},
    {q:'R1 = 100Ω และ R2 = 100Ω ต่อขนานกัน RT มีค่าเท่าไร?',opts:['200 Ω','100 Ω','50 Ω','25 Ω'],ans:2,exp:'วงจรขนาน 2 ตัวเท่ากัน: RT = R/2 = 100/2 = 50 Ω'},
    {q:'แถบสีแดงในรหัสสีตัวต้านทานมีค่าตัวเลขเท่าไร?',opts:['1','2','3','4'],ans:1,exp:'ดำ=0, น้ำตาล=1, แดง=2, ส้ม=3, เหลือง=4, เขียว=5, น้ำเงิน=6, ม่วง=7, เทา=8, ขาว=9'},
    {q:'ตัวต้านทาน 5 แถบ แตกต่างจาก 4 แถบอย่างไร?',opts:['มีตัวเลข 3 หลัก ทำให้แม่นยำกว่า','ใช้สีต่างกันทั้งหมด','ค่าสูงกว่าเสมอ','ใช้ใน AC เท่านั้น'],ans:0,exp:'5 แถบมีตัวเลข 3 หลัก (แถบ 1-3) + ตัวคูณ + tolerance ทำให้ระบุค่าได้แม่นยำกว่า'},
    {q:'ในวงจรอนุกรม กระแสที่ไหลผ่านตัวต้านทานแต่ละตัวเป็นอย่างไร?',opts:['ต่างกันทุกตัว','เท่ากันทุกตัว','ขึ้นกับขนาด','รวมกันเท่ากับกระแสรวม'],ans:1,exp:'วงจรอนุกรม: กระแสเท่ากันทุกตัว (IT = I1 = I2 = I3)'},
    {q:'LDR คืออะไร?',opts:['เปลี่ยนค่าตามแสง','เปลี่ยนค่าตามอุณหภูมิ','เปลี่ยนค่าตามแรงดัน','ค่าคงที่'],ans:0,exp:'LDR (Light Dependent Resistor) เปลี่ยนค่าความต้านทานตามความเข้มแสง แสงมาก → ความต้านทานน้อย'},
  ]},
  { id:'multimeter', icon:'📏', name:'เครื่องมือวัด', questions:[
    {q:'ต้องการวัดไฟบ้าน 220V AC ควรตั้งย่าน ACV ที่เท่าไร?',opts:['10V','50V','250V','1000V'],ans:2,exp:'เลือกย่านที่สูงกว่าแรงดันที่จะวัดเล็กน้อย ไฟบ้าน 220V → ใช้ย่าน 250V'},
    {q:'ก่อนวัดความต้านทาน (Ω) ด้วยมัลติมิเตอร์อนาล็อก ต้องทำอะไรก่อน?',opts:['ตั้งย่านให้ถูก','ตัดไฟวงจรก่อน แล้วปรับ Zero Ω','ต่อสายวัดก่อน','เปิดสวิตช์วงจรก่อน'],ans:1,exp:'ต้องตัดไฟวงจรออกก่อน (ห้ามวัดขณะมีไฟ) แล้วปรับ Zero Ω'},
    {q:'DMM ย่อมาจากอะไร?',opts:['Direct Measurement Meter','Digital Multimeter','Dual Mode Meter','Dynamic Measuring Module'],ans:1,exp:'DMM = Digital Multimeter หรือมัลติมิเตอร์แบบดิจิตัล'},
    {q:'สัญลักษณ์ V~ บนมัลติมิเตอร์หมายถึงอะไร?',opts:['DCV แรงดันตรง','ACV แรงดันสลับ','กระแสตรง','กระแสสลับ'],ans:1,exp:'V~ = Voltage AC (แรงดันสลับ) เครื่องหมาย ~ แสดงถึงคลื่นสลับ'},
    {q:'การวัดกระแสไฟฟ้า (mA) ต้องต่อสายวัดอย่างไร?',opts:['ต่อขนานกับวงจร','ต่ออนุกรมกับวงจร','ต่อที่ขั้วบวกเท่านั้น','ไม่ต้องต่อในวงจร'],ans:1,exp:'การวัดกระแสต้องต่ออนุกรม (Series) กับวงจร เพื่อให้กระแสไหลผ่านมิเตอร์'},
    {q:'สัญลักษณ์ ))) บนมัลติมิเตอร์หมายถึงอะไร?',opts:['วัดความถี่','ทดสอบ Continuity (มีเสียง)','วัดอุณหภูมิ','ทดสอบแบตเตอรี่'],ans:1,exp:'))) = Continuity Test จะมีเสียงบี๊บเมื่อวงจรต่อถึงกัน ใช้ตรวจสอบสายที่ขาดหรือไม่'},
  ]},
  { id:'diode', icon:'💡', name:'ไดโอด', questions:[
    {q:'ไดโอดยอมให้กระแสไหลผ่านได้ในทิศทางใด?',opts:['ทั้งสองทิศทาง','จาก Anode ไปยัง Cathode เท่านั้น','จาก Cathode ไปยัง Anode เท่านั้น','ขึ้นกับแรงดัน'],ans:1,exp:'ไดโอดนำกระแสทางเดียว คือจาก Anode (+) ไปยัง Cathode (-) เมื่ออยู่ใน Forward Bias'},
    {q:'แรงดัน Forward Bias ของซิลิคอนไดโอดโดยประมาณคือเท่าไร?',opts:['0.2–0.3 V','0.6–0.7 V','1.2–1.4 V','2.0–2.5 V'],ans:1,exp:'ซิลิคอนไดโอดมีแรงดัน Forward Bias ประมาณ 0.6–0.7 V เป็นค่ามาตรฐานที่ใช้ในการคำนวณวงจร'},
    {q:'LED ย่อมาจากอะไร?',opts:['Light Energy Device','Light Emitting Diode','Low Energy Diode','Linear Electronic Device'],ans:1,exp:'LED = Light Emitting Diode ไดโอดเปล่งแสง เมื่อกระแสไหลผ่านในทิศ Forward จะแผ่แสงออกมา'},
    {q:'วงจรเรียงกระแสแบบ Bridge Rectifier ใช้ไดโอดกี่ตัว?',opts:['1 ตัว','2 ตัว','3 ตัว','4 ตัว'],ans:3,exp:'Bridge Rectifier ใช้ไดโอด 4 ตัวต่อเป็นสะพาน เรียงกระแสได้ทั้งครึ่งบวกและครึ่งลบของ AC'},
    {q:'Zener Diode ทำงานในย่าน Bias ใด?',opts:['Forward Bias เท่านั้น','Reverse Bias ที่ Zener Voltage','ทั้งสองย่าน','No Bias'],ans:1,exp:'Zener Diode ออกแบบให้ทำงานใน Reverse Bias ที่แรงดัน Zener Voltage เพื่อรักษาแรงดันให้คงที่'},
    {q:'LED สีแดงมีแรงดัน Vf โดยประมาณเท่าไร?',opts:['0.7 V','1.2 V','1.8–2.0 V','3.0–3.5 V'],ans:2,exp:'LED สีแดงมี Vf ประมาณ 1.8–2.0 V สีน้ำเงินและขาวมี Vf สูงกว่าที่ 3.0–3.5 V'},
  ]},
  { id:'signal-generator', icon:'📶', name:'เครื่องกำเนิดสัญญาณ', questions:[
    {q:'Function Generator สามารถสร้างสัญญาณรูปคลื่นใดบ้าง?',opts:['คลื่นซายน์เท่านั้น','คลื่นซายน์และสแควร์','ซายน์ สแควร์ และไตรแองเกิล','สัญญาณ DC เท่านั้น'],ans:2,exp:'Function Generator สร้างคลื่น 3 รูปแบบหลัก: ซายน์ (Sine), สแควร์ (Square) และไตรแองเกิล (Triangle)'},
    {q:'คลื่นสแควร์ (Square Wave) มีลักษณะอย่างไร?',opts:['ค่อยๆ เพิ่มและลดอย่างราบเรียบ','สลับระหว่าง High และ Low อย่างฉับพลัน','เพิ่มขึ้นช้า ลงเร็ว','รูปสามเหลี่ยม'],ans:1,exp:'คลื่นสแควร์มีการสลับระหว่าง High และ Low อย่างทันทีทันใด ใช้ในวงจรดิจิตัลและทดสอบ Switching'},
    {q:'Duty Cycle 50% หมายความว่าอย่างไร?',opts:['สัญญาณอยู่ที่ High ตลอด 50% ของคาบ','ความถี่ลดลงครึ่งหนึ่ง','แอมพลิจูดลดลงครึ่งหนึ่ง','สัญญาณออฟ 50% ของคาบ'],ans:0,exp:'Duty Cycle = (เวลา High / คาบทั้งหมด) × 100% Duty 50% หมายถึงสัญญาณอยู่ที่ High ครึ่งหนึ่งของคาบ ใช้ในการควบคุม PWM'},
    {q:'ความถี่ของสัญญาณวัดเป็นหน่วยใด?',opts:['Volt (V)','Ampere (A)','Hertz (Hz)','Watt (W)'],ans:2,exp:'ความถี่วัดเป็น Hertz (Hz) = จำนวนรอบต่อวินาที ตั้งชื่อตาม Heinrich Hertz นักฟิสิกส์ชาวเยอรมัน'},
    {q:'เหตุใดจึงใช้ Signal Generator ร่วมกับ Oscilloscope ในการทดสอบวงจร?',opts:['เพื่อเพิ่มแรงดัน','เพื่อสร้างสัญญาณทดสอบและสังเกตการตอบสนองของวงจรบนจอ','เพื่อวัดความต้านทาน','เพื่อชาร์จตัวเก็บประจุ'],ans:1,exp:'Signal Generator สร้างสัญญาณความถี่และรูปคลื่นที่ต้องการ แล้วใช้ Oscilloscope ดูว่าวงจรตอบสนองอย่างไร'},
    {q:'แอมพลิจูด (Amplitude) ของสัญญาณ AC คืออะไร?',opts:['ความถี่ของสัญญาณ','ค่าสูงสุดของแรงดันสัญญาณ (Vpeak)','ค่าเฉลี่ยของสัญญาณ','คาบของสัญญาณ'],ans:1,exp:'Amplitude คือค่าสูงสุดของแรงดันสัญญาณ (Vpeak) วัดจากจุดศูนย์ถึงยอดคลื่น'},
  ]},
  { id:'oscilloscope', icon:'📡', name:'ออสซิลโลสโคป', questions:[
    {q:'ออสซิลโลสโคปใช้สำหรับทำอะไร?',opts:['วัดความต้านทาน','แสดงรูปคลื่นสัญญาณไฟฟ้าตามเวลา','วัดกระแสไฟฟ้าโดยตรง','ทดสอบ Continuity'],ans:1,exp:'ออสซิลโลสโคปแสดงรูปคลื่นสัญญาณไฟฟ้า (Voltage) เทียบกับเวลา ทำให้เห็นความถี่ แอมพลิจูด และรูปร่างคลื่น'},
    {q:'แกน Y (แนวตั้ง) บนออสซิลโลสโคปแสดงค่าอะไร?',opts:['เวลา (Time)','ความถี่ (Frequency)','แรงดันไฟฟ้า (Voltage)','กระแสไฟฟ้า (Current)'],ans:2,exp:'แกน Y = แรงดัน (V) ปรับด้วยปุ่ม VOLTS/DIV; แกน X = เวลา (s) ปรับด้วยปุ่ม TIME/DIV'},
    {q:'TIME/DIV = 2 ms และคลื่น 1 รอบกว้าง 5 ช่อง คาบ T มีค่าเท่าไร?',opts:['2 ms','5 ms','10 ms','20 ms'],ans:2,exp:'T = TIME/DIV × จำนวนช่อง = 2 ms × 5 = 10 ms'},
    {q:'ถ้าคาบ T = 10 ms ความถี่ f มีค่าเท่าไร?',opts:['10 Hz','50 Hz','100 Hz','1,000 Hz'],ans:2,exp:'f = 1/T = 1/0.01 = 100 Hz'},
    {q:'Vpp (Peak-to-Peak Voltage) คืออะไร?',opts:['ค่าแรงดัน RMS','ค่าแรงดันสูงสุด (Vpeak)','ผลต่างระหว่าง Vmax และ Vmin','ค่าแรงดันเฉลี่ย'],ans:2,exp:'Vpp = Vmax − Vmin คือแรงดันจากยอดบวกถึงยอดลบ สำหรับคลื่นซายน์ Vpp = 2 × Vpeak'},
    {q:'ปุ่ม VOLTS/DIV บนออสซิลโลสโคปใช้ปรับอะไร?',opts:['ความเร็วกวาดแนวนอน','ขนาดแรงดันต่อช่องในแนวตั้ง','ความสว่างของจอ','ตำแหน่งแนวนอน'],ans:1,exp:'VOLTS/DIV ปรับสเกลแนวตั้ง เช่น 1V/DIV หมายถึง 1 ช่อง = 1 V ใช้ปรับให้คลื่นพอดีกับจอ'},
  ]},
  { id:'capacitor', icon:'🔋', name:'ตัวเก็บประจุ', questions:[
    {q:'ตัวเก็บประจุรหัส "104" มีค่าเท่าไร?',opts:['104 pF','10,400 pF','100,000 pF = 0.1 μF','1,040 pF'],ans:2,exp:'104 = 10 × 10⁴ = 100,000 pF = 100 nF = 0.1 μF (ตัวที่ 3 = จำนวน 0 ต่อท้าย, หน่วย pF)'},
    {q:'C1 = 10μF และ C2 = 10μF ต่อขนานกัน CT มีค่าเท่าไร?',opts:['5 μF','10 μF','20 μF','100 μF'],ans:2,exp:'วงจรขนาน CT = C1 + C2 = 10 + 10 = 20 μF'},
    {q:'1 μF เท่ากับกี่ pF?',opts:['1,000 pF','10,000 pF','100,000 pF','1,000,000 pF'],ans:3,exp:'1 μF = 10⁻⁶ F และ 1 pF = 10⁻¹² F ดังนั้น 1 μF = 10⁶ pF = 1,000,000 pF'},
    {q:'ตัวเก็บประจุแบบ Electrolytic มีลักษณะอะไร?',opts:['ไม่มีขั้ว','มีขั้ว ต้องต่อถูกขั้ว','ใช้ได้เฉพาะ AC','ค่าความจุน้อยที่สุด'],ans:1,exp:'Electrolytic Capacitor มีขั้ว (+/-) ต้องต่อถูกขั้วเสมอ มิฉะนั้นจะระเบิดได้'},
    {q:'วงจรอนุกรมตัวเก็บประจุ ค่าความจุรวมเป็นอย่างไร?',opts:['เท่ากับผลรวมทุกตัว','น้อยกว่าตัวที่น้อยที่สุด','เท่ากับตัวที่มากที่สุด','เท่ากับค่าเฉลี่ย'],ans:1,exp:'1/CT = 1/C1 + 1/C2 + ... ทำให้ CT น้อยกว่าทุกตัว'},
    {q:'หน้าที่ของตัวเก็บประจุในวงจร Filter คืออะไร?',opts:['เพิ่มกระแส','ลดแรงดัน','กรองความถี่ที่ไม่ต้องการออก','เพิ่มความต้านทาน'],ans:2,exp:'ตัวเก็บประจุกรองสัญญาณรบกวน (Ripple) ในวงจรเรียงกระแส ยอมให้ AC ผ่านแต่บล็อก DC'},
  ]},
  { id:'inductor', icon:'🌀', name:'ตัวเหนี่ยวนำ', questions:[
    {q:'ตัวเหนี่ยวนำเก็บพลังงานในรูปแบบใด?',opts:['ประจุไฟฟ้า','สนามแม่เหล็ก','ความร้อน','แสงสว่าง'],ans:1,exp:'ตัวเหนี่ยวนำเก็บพลังงานในรูปสนามแม่เหล็ก (Magnetic Field) เมื่อกระแสไหลผ่านขดลวด'},
    {q:'หน่วย SI ของค่าความเหนี่ยวนำ (Inductance) คืออะไร?',opts:['Farad (F)','Ohm (Ω)','Henry (H)','Weber (Wb)'],ans:2,exp:'ค่าความเหนี่ยวนำวัดเป็น Henry (H) ตั้งชื่อตาม Joseph Henry นักวิทยาศาสตร์ผู้ค้นพบการเหนี่ยวนำแม่เหล็กไฟฟ้า'},
    {q:'L1 = 10 mH และ L2 = 20 mH ต่ออนุกรมกัน LT มีค่าเท่าไร?',opts:['6.67 mH','10 mH','20 mH','30 mH'],ans:3,exp:'วงจรอนุกรม LT = L1 + L2 = 10 + 20 = 30 mH (เช่นเดียวกับตัวต้านทาน)'},
    {q:'หม้อแปลง Step-up แปลงแรงดันอย่างไร?',opts:['ลดแรงดัน เพิ่มกระแส','เพิ่มแรงดัน ลดกระแส','เพิ่มทั้งแรงดันและกระแส','แรงดันคงที่'],ans:1,exp:'Step-up Transformer เพิ่มแรงดัน (Ns > Np) แต่กระแสลดลง เพื่อรักษากำลังไฟฟ้าให้คงที่ตามกฎอนุรักษ์พลังงาน'},
    {q:'ตัวเหนี่ยวนำต้านทานการเปลี่ยนแปลงของอะไร?',opts:['แรงดันไฟฟ้า','กระแสไฟฟ้า','ความต้านทาน','ความถี่'],ans:1,exp:'ตัวเหนี่ยวนำต้านทานการเปลี่ยนแปลงของกระแส ตามกฎการเหนี่ยวนำแม่เหล็กไฟฟ้า เมื่อกระแสเปลี่ยน จะเกิด EMF ต้านการเปลี่ยนแปลงนั้น'},
    {q:'Inductive Reactance (XL) คำนวณจากสูตรใด?',opts:['XL = 1/(2πfL)','XL = 2πfL','XL = L/f','XL = f/L'],ans:1,exp:'XL = 2πfL โดย f = ความถี่ (Hz) และ L = ค่าความเหนี่ยวนำ (H) XL มีหน่วยเป็น Ω'},
  ]},
  { id:'soldering', icon:'🔥', name:'การบัดกรี', questions:[
    {q:'ขั้นตอนแรกของการบัดกรีที่ถูกต้องคืออะไร?',opts:['ป้อนตะกั่วก่อน','ให้ความร้อนที่ขาอุปกรณ์และ Pad พร้อมกัน','ทาน้ำยาประสานก่อน','เปิดพัดลม'],ans:1,exp:'ขั้นที่ 1: ให้ความร้อนที่ขาอุปกรณ์และ Pad พร้อมกัน 2-3 วินาที เพื่อให้ทั้งสองส่วนร้อนเท่ากัน'},
    {q:'Cold Joint หมายถึงอะไร?',opts:['ตะกั่วไม่ละลาย','รอยบัดกรีผิวขรุขระขุ่นมัว','ตะกั่วมากเกินไป','รอยบัดกรีที่ดี'],ans:1,exp:'Cold Joint คือรอยบัดกรีที่ผิวขรุขระดูขุ่นมัว เกิดจากการเป่า สั่น หรือขยับชิ้นงานขณะตะกั่วยังไม่แข็ง'},
    {q:'หลังบัดกรีเสร็จและถอดหัวแร้งออกแล้ว ควรทำอย่างไร?',opts:['เป่าลมเย็น','รอให้เย็นตามธรรมชาติ ห้ามเป่า','จุ่มน้ำ','ใช้ฟองน้ำเช็ด'],ans:1,exp:'ต้องรอให้เย็นตามธรรมชาติ การเป่าจะทำให้เกิด Cold Joint'},
    {q:'ควรป้อนตะกั่วบัดกรีที่จุดใด?',opts:['ที่หัวแร้งโดยตรง','ที่จุดต่อระหว่างขาอุปกรณ์กับ Pad','ที่ขาอุปกรณ์เท่านั้น','ที่ Pad เท่านั้น'],ans:1,exp:'ต้องป้อนตะกั่วที่จุดต่อ ไม่ใช่ที่หัวแร้ง เพื่อให้ตะกั่วไหลเข้าจุดต่อเอง'},
    {q:'ฟองน้ำ (Sponge) ที่ใช้กับหัวแร้งมีไว้เพื่ออะไร?',opts:['วางหัวแร้งระหว่างพัก','เช็ดทำความสะอาดหัวแร้ง','ทำให้หัวแร้งเย็น','ดูดตะกั่วส่วนเกิน'],ans:1,exp:'ฟองน้ำเปียกใช้เช็ดทำความสะอาดหัวแร้ง ขจัดตะกั่วเก่าและฟลักซ์ที่ไหม้'},
    {q:'หัวแร้งบัดกรี 25-40W เหมาะกับงานใด?',opts:['งาน SMD ละเอียดมาก','งานบัดกรีทั่วไปบน PCB','งานเชื่อมสายไฟใหญ่','งานบัดกรีชิปไอซี'],ans:1,exp:'หัวแร้ง 25-40W เหมาะกับงานบัดกรีทั่วไปบน PCB'},
  ]},
  { id:'ac-circuit', icon:'〜', name:'วงจร AC', questions:[
    {q:'ไฟบ้านในประเทศไทยมีความถี่กี่ Hz?',opts:['25 Hz','50 Hz','60 Hz','100 Hz'],ans:1,exp:'ไฟบ้านในประเทศไทย (และส่วนใหญ่ของโลก) ใช้ความถี่ 50 Hz ต่างจากสหรัฐอเมริกาที่ใช้ 60 Hz'},
    {q:'ค่า Peak Voltage (Vpeak) ของไฟบ้าน 220V RMS คือเท่าไร?',opts:['220 V','255 V','311 V','380 V'],ans:2,exp:'Vpeak = Vrms × √2 = 220 × 1.414 ≈ 311 V ค่า RMS คือค่าประสิทธิผลที่เทียบเท่ากับ DC'},
    {q:'คาบ (Period, T) ของไฟ AC 50 Hz มีค่าเท่าไร?',opts:['5 ms','10 ms','20 ms','50 ms'],ans:2,exp:'T = 1/f = 1/50 = 0.02 s = 20 ms ความถี่และคาบเป็นส่วนกลับกัน'},
    {q:'Impedance (Z) ของวงจร RC อนุกรมคำนวณจาก?',opts:['Z = R + Xc','Z = R − Xc','Z = √(R² + Xc²)','Z = R × Xc'],ans:2,exp:'Z = √(R² + Xc²) เนื่องจาก R และ Xc มีเฟสต่างกัน 90° ต้องใช้ Pythagoras ในการหาค่ารวม'},
    {q:'Capacitive Reactance (Xc) จะมีค่าเพิ่มขึ้นเมื่อใด?',opts:['ความถี่เพิ่มขึ้น','ความถี่ลดลง','แรงดันเพิ่มขึ้น','ความจุเพิ่มขึ้น'],ans:1,exp:'Xc = 1/(2πfC) ความถี่ต่ำ → Xc สูง ตัวเก็บประจุจะบล็อก DC (f=0) และยอมให้ AC ความถี่สูงผ่านได้ดี'},
    {q:'ในวงจร AC กระแสในตัวเก็บประจุ (C) สัมพันธ์กับแรงดันอย่างไร?',opts:['กระแสตามหลังแรงดัน 90°','กระแสนำหน้าแรงดัน 90°','กระแสและแรงดันเฟสตรงกัน','กระแสนำหน้าแรงดัน 180°'],ans:1,exp:'ใน Capacitor กระแสนำหน้าแรงดัน 90° (I leads V) ส่วนใน Inductor กระแสตามหลังแรงดัน 90° (I lags V)'},
  ]},
  { id:'components', icon:'🔌', name:'อุปกรณ์สารกึ่งตัวนำ', questions:[
    {q:'ซีเนอร์ไดโอด (Zener Diode) แตกต่างจากไดโอดทั่วไปอย่างไร?',opts:['กระแสไหลได้สองทิศ','ควบคุมแรงดันให้คงที่ใน Reverse Bias','ขยายกำลัง','แทนตัวต้านทานได้'],ans:1,exp:'Zener Diode รักษาแรงดันให้คงที่ที่ค่า Zener Voltage ใช้ทำวงจร Voltage Regulator'},
    {q:'ทรานซิสเตอร์ (Transistor) ใช้งานหลักในด้านใด?',opts:['เก็บและปล่อยประจุ','ขยายสัญญาณและเป็นสวิตช์','แปลง AC เป็น DC','วัดกระแส'],ans:1,exp:'ทรานซิสเตอร์ใช้เป็นตัวขยายสัญญาณและสวิตช์ โดยกระแสที่ Base ควบคุมกระแส Collector-Emitter'},
    {q:'รีเลย์ (Relay) คืออะไร?',opts:['ตัวเก็บประจุขนาดใหญ่','สวิตช์ควบคุมด้วยแม่เหล็กไฟฟ้า','ตัวต้านทานปรับค่าได้','ไดโอดพิเศษ'],ans:1,exp:'Relay คือสวิตช์ที่ทำงานด้วยแม่เหล็กไฟฟ้า ใช้ควบคุมวงจรกำลังสูงด้วยสัญญาณเล็ก'},
    {q:'ไทรแอก (Triac) นิยมใช้ในงานใด?',opts:['วงจรขยายเสียง','ควบคุมกำลังไฟ AC เช่น หรี่ไฟ','วงจรดิจิตัล','วงจรชาร์จแบตเตอรี่'],ans:1,exp:'Triac ควบคุมกำลังไฟ AC ได้ทั้งสองทิศทาง นิยมใช้ใน Dimmer หรี่ไฟ ควบคุมความเร็วมอเตอร์ AC'},
    {q:'ขาของทรานซิสเตอร์ BJT มีกี่ขา และชื่ออะไร?',opts:['2 ขา: Anode-Cathode','3 ขา: Base-Collector-Emitter','3 ขา: Gate-Source-Drain','4 ขา'],ans:1,exp:'BJT มี 3 ขา: Base (B) = อินพุตควบคุม, Collector (C) = ขาหลัก, Emitter (E) = ขาออก'},
  ]},
];

const QUIZ_CATEGORIES_EN = [
  { id:'electricity', icon:'⚡', name:'Electricity Sources', questions:[
    {q:'What is the electricity generated by pressing or twisting quartz crystals called?',opts:['Thermoelectric Effect','Piezoelectric Effect','Photoelectric Effect','Electromagnetic Induction'],ans:1,exp:'Piezoelectric Effect is electricity generated by pressure on certain crystals like quartz. Used in lighters and speakers.'},
    {q:'What energy source does a Thermocouple use to generate electricity?',opts:['Light','Friction','Heat','Magnetic field'],ans:2,exp:'A Thermocouple joins two different metals; heating the junction creates a voltage. Used for measuring high temperatures.'},
    {q:'What type of energy does a Solar Cell convert to electrical energy?',opts:['Heat','Friction','Magnetic field','Light'],ans:3,exp:'Solar cells use the Photoelectric Effect — light strikes a semiconductor (Silicon), releasing electrons to create current.'},
    {q:'What principle does a Generator use to produce electricity?',opts:['Piezoelectric Effect','Chemical Reaction','Photoelectric Effect','Electromagnetic Induction'],ans:3,exp:'A Generator uses Electromagnetic Induction — a conductor cuts through a magnetic field, inducing EMF (Faraday\'s law).'},
    {q:'What energy source does a Battery use to produce electricity?',opts:['Heat','Chemical reaction','Light','Friction'],ans:1,exp:'Batteries use chemical reactions between internal substances (Voltaic Cell), converting chemical energy to electrical energy.'},
    {q:'How does Static Electricity differ from current electricity?',opts:['Has higher voltage','Charge does not flow or move','It is AC','More dangerous'],ans:1,exp:'Static electricity is charge that accumulates and stays still — it does not flow in a circuit. Current electricity is electrons continuously moving through a conductor.'},
    {q:'How does AC differ from DC?',opts:['AC always has higher voltage','AC current flows in one direction','AC current changes direction with frequency','AC is used in batteries'],ans:2,exp:'AC (Alternating Current) reverses direction periodically with frequency, e.g. household 220V 50Hz. DC flows in one direction only.'},
    {q:'How many electrons in the outermost shell does a good electrical conductor have?',opts:['1–3 electrons','4 electrons','5–7 electrons','8 electrons'],ans:0,exp:'Good conductors like copper have 1–3 electrons in the outermost shell, which can be easily freed under voltage to become current.'},
  ]},
  { id:'ohm', icon:'🔢', name:"Ohm's Law", questions:[
    {q:'A circuit has E = 12V and R = 4Ω. What is the current I?',opts:['2 A','3 A','4 A','48 A'],ans:1,exp:"I = E/R = 12/4 = 3 A (Ohm's Law)"},
    {q:'A circuit has I = 2A and R = 5Ω. What is the voltage E?',opts:['2.5 V','7 V','10 V','0.4 V'],ans:2,exp:'E = I × R = 2 × 5 = 10 V'},
    {q:'A circuit has E = 24V and I = 3A. What is the resistance R?',opts:['72 Ω','0.125 Ω','8 Ω','27 Ω'],ans:2,exp:'R = E/I = 24/3 = 8 Ω'},
    {q:'Power P = EI. If E = 10V and I = 2A, what is the power?',opts:['5 W','12 W','20 W','0.2 W'],ans:2,exp:'P = E × I = 10 × 2 = 20 W'},
    {q:'A 100W bulb runs for 5 hours. How many kWh of energy is used?',opts:['500 kWh','50 kWh','0.5 kWh','5 kWh'],ans:2,exp:'W = P × t = 100W × 5h = 500 Wh = 0.5 kWh'},
    {q:'How many Ω is 1 kΩ?',opts:['10 Ω','100 Ω','1,000 Ω','10,000 Ω'],ans:2,exp:'k = kilo = 1,000 — so 1 kΩ = 1,000 Ω'},
    {q:'If P = 50W and R = 2Ω, what is the voltage E?',opts:['10 V','100 V','25 V','5 V'],ans:0,exp:'E = √(P×R) = √(50×2) = √100 = 10 V'},
    {q:'How many amperes is 1 mA?',opts:['0.1 A','0.01 A','0.001 A','0.0001 A'],ans:2,exp:'m = milli = 10⁻³ — so 1 mA = 0.001 A'},
  ]},
  { id:'resistor', icon:'🎨', name:'Resistor', questions:[
    {q:'A resistor with bands Brown-Black-Red-Gold has what value?',opts:['102 Ω','1,000 Ω ±5%','120 Ω','10,200 Ω'],ans:1,exp:'Brown=1, Black=0 → 10; Red=×100; Gold=±5% → 10×100 = 1,000 Ω = 1kΩ ±5%'},
    {q:'What does a Gold band in the 4th position mean?',opts:['Multiplier ×0.1','Tolerance ±5%','First digit 0','Tolerance ±10%'],ans:1,exp:'Band 4 is the Tolerance band — Gold = ±5%'},
    {q:'R1 = 100Ω and R2 = 200Ω connected in series. What is RT?',opts:['66.7 Ω','150 Ω','300 Ω','20,000 Ω'],ans:2,exp:'Series circuit: RT = R1 + R2 = 100 + 200 = 300 Ω'},
    {q:'R1 = 100Ω and R2 = 100Ω connected in parallel. What is RT?',opts:['200 Ω','100 Ω','50 Ω','25 Ω'],ans:2,exp:'Two equal parallel resistors: RT = R/2 = 100/2 = 50 Ω'},
    {q:'What digit does a Red band represent in the resistor color code?',opts:['1','2','3','4'],ans:1,exp:'Black=0, Brown=1, Red=2, Orange=3, Yellow=4, Green=5, Blue=6, Violet=7, Gray=8, White=9'},
    {q:'How does a 5-band resistor differ from a 4-band?',opts:['Has 3 significant digits — more precise','Uses completely different colors','Always has a higher value','Only used in AC circuits'],ans:0,exp:'5-band has 3 significant digits (bands 1–3) + multiplier + tolerance, giving higher precision than 4-band.'},
    {q:'In a series circuit, how does the current through each resistor compare?',opts:['Different in each','Equal in all','Depends on size','Sum equals total current'],ans:1,exp:'Series circuit: current is the same through every component (IT = I1 = I2 = I3)'},
    {q:'What is an LDR?',opts:['Changes value with light','Changes value with temperature','Changes value with voltage','Has a fixed value'],ans:0,exp:'LDR (Light Dependent Resistor) changes resistance based on light intensity — more light → lower resistance.'},
  ]},
  { id:'multimeter', icon:'📏', name:'Measuring Tools', questions:[
    {q:'To measure household 220V AC, which ACV range should you select?',opts:['10V','50V','250V','1000V'],ans:2,exp:'Select a range slightly higher than the expected voltage — for 220V use the 250V range.'},
    {q:'Before measuring resistance (Ω) with an analog multimeter, what must you do first?',opts:['Set the correct range','Disconnect circuit power, then perform Zero Ω adjustment','Connect the probes first','Turn on the circuit switch first'],ans:1,exp:'You must disconnect circuit power first (never measure live circuits) then perform Zero Ω adjustment.'},
    {q:'What does DMM stand for?',opts:['Direct Measurement Meter','Digital Multimeter','Dual Mode Meter','Dynamic Measuring Module'],ans:1,exp:'DMM = Digital Multimeter'},
    {q:'What does the symbol V~ on a multimeter mean?',opts:['DCV — DC voltage','ACV — AC voltage','DC current','AC current'],ans:1,exp:'V~ = AC Voltage. The ~ symbol represents alternating current waveform.'},
    {q:'How must probes be connected to measure current (mA)?',opts:['In parallel with the circuit','In series with the circuit','Only at the positive terminal','Not connected in the circuit'],ans:1,exp:'Current measurement requires series connection — current must flow through the meter.'},
    {q:'What does the symbol ))) on a multimeter mean?',opts:['Measure frequency','Continuity test (beeps)','Measure temperature','Battery test'],ans:1,exp:'))) = Continuity Test — beeps when the circuit is connected. Used to check for broken wires.'},
  ]},
  { id:'diode', icon:'💡', name:'Diode', questions:[
    {q:'In which direction does a diode allow current to flow?',opts:['Both directions','Anode to Cathode only','Cathode to Anode only','Depends on voltage'],ans:1,exp:'A diode conducts in one direction only: Anode (+) to Cathode (−) when forward biased.'},
    {q:'What is the approximate forward voltage of a silicon diode?',opts:['0.2–0.3 V','0.6–0.7 V','1.2–1.4 V','2.0–2.5 V'],ans:1,exp:'Silicon diodes have a forward voltage drop of approximately 0.6–0.7 V, used as a standard value in circuit calculations.'},
    {q:'What does LED stand for?',opts:['Light Energy Device','Light Emitting Diode','Low Energy Diode','Linear Electronic Device'],ans:1,exp:'LED = Light Emitting Diode. When current flows in the forward direction, it emits light.'},
    {q:'How many diodes does a Bridge Rectifier use?',opts:['1','2','3','4'],ans:3,exp:'A Bridge Rectifier uses 4 diodes arranged in a bridge configuration to rectify both half-cycles of AC into DC.'},
    {q:'In which bias region does a Zener Diode operate?',opts:['Forward Bias only','Reverse Bias at Zener Voltage','Both regions','No Bias'],ans:1,exp:'A Zener Diode is designed to operate in Reverse Bias at its Zener Voltage, maintaining a constant voltage.'},
    {q:'What is the approximate Vf of a red LED?',opts:['0.7 V','1.2 V','1.8–2.0 V','3.0–3.5 V'],ans:2,exp:'Red LEDs have Vf ≈ 1.8–2.0 V. Blue and white LEDs have higher Vf at 3.0–3.5 V.'},
  ]},
  { id:'signal-generator', icon:'📶', name:'Signal Generator', questions:[
    {q:'Which waveforms can a Function Generator produce?',opts:['Sine wave only','Sine and Square waves','Sine, Square, and Triangle','DC signals only'],ans:2,exp:'A Function Generator produces three main waveforms: Sine, Square, and Triangle waves.'},
    {q:'What characterizes a Square Wave?',opts:['Gradually rises and falls smoothly','Switches instantly between High and Low','Rises slowly, falls quickly','Triangle shape'],ans:1,exp:'A Square Wave switches instantly between High and Low. Used in digital circuits and switching tests.'},
    {q:'What does a 50% Duty Cycle mean?',opts:['Signal is High for 50% of the period','Frequency is halved','Amplitude is halved','Signal is off 50% of the time'],ans:0,exp:'Duty Cycle = (High time / Period) × 100%. A 50% duty cycle means the signal is High for exactly half of each cycle. Used in PWM control.'},
    {q:'In what unit is signal frequency measured?',opts:['Volt (V)','Ampere (A)','Hertz (Hz)','Watt (W)'],ans:2,exp:'Frequency is measured in Hertz (Hz) = cycles per second, named after Heinrich Hertz.'},
    {q:'Why connect a Signal Generator to an Oscilloscope during circuit testing?',opts:['To increase voltage','To generate a test signal and observe the circuit\'s response on screen','To measure resistance','To charge a capacitor'],ans:1,exp:'The Signal Generator creates a known frequency and waveform; the Oscilloscope shows how the circuit responds to that input.'},
    {q:'What is the Amplitude of an AC signal?',opts:['The signal frequency','The peak voltage value (Vpeak)','The average signal value','The period of the signal'],ans:1,exp:'Amplitude is the peak voltage (Vpeak), measured from zero to the crest of the wave.'},
  ]},
  { id:'oscilloscope', icon:'📡', name:'Oscilloscope', questions:[
    {q:'What is an oscilloscope used for?',opts:['Measuring resistance','Displaying electrical waveforms over time','Measuring current directly','Testing continuity'],ans:1,exp:'An oscilloscope displays voltage waveforms over time, showing frequency, amplitude, and wave shape.'},
    {q:'What does the Y-axis (vertical) on an oscilloscope represent?',opts:['Time','Frequency','Voltage','Current'],ans:2,exp:'Y-axis = Voltage (adjusted with VOLTS/DIV); X-axis = Time (adjusted with TIME/DIV).'},
    {q:'TIME/DIV = 2 ms and 1 cycle spans 5 divisions. What is the period T?',opts:['2 ms','5 ms','10 ms','20 ms'],ans:2,exp:'T = TIME/DIV × number of divisions = 2 ms × 5 = 10 ms'},
    {q:'If the period T = 10 ms, what is the frequency f?',opts:['10 Hz','50 Hz','100 Hz','1,000 Hz'],ans:2,exp:'f = 1/T = 1/0.01 = 100 Hz'},
    {q:'What is Vpp (Peak-to-Peak Voltage)?',opts:['RMS voltage','Peak voltage (Vpeak)','Difference between Vmax and Vmin','Average voltage'],ans:2,exp:'Vpp = Vmax − Vmin, the voltage from positive peak to negative peak. For a sine wave, Vpp = 2 × Vpeak.'},
    {q:'What does the VOLTS/DIV knob on an oscilloscope adjust?',opts:['Horizontal sweep speed','Vertical voltage scale per division','Screen brightness','Horizontal position'],ans:1,exp:'VOLTS/DIV sets the vertical scale — e.g., 1V/DIV means each grid square = 1V. Adjust to fit the waveform on screen.'},
  ]},
  { id:'capacitor', icon:'🔋', name:'Capacitor', questions:[
    {q:'A capacitor marked "104" has what value?',opts:['104 pF','10,400 pF','100,000 pF = 0.1 μF','1,040 pF'],ans:2,exp:'104 = 10 × 10⁴ = 100,000 pF = 100 nF = 0.1 μF (3rd digit = number of zeros to append, unit is pF)'},
    {q:'C1 = 10μF and C2 = 10μF connected in parallel. What is CT?',opts:['5 μF','10 μF','20 μF','100 μF'],ans:2,exp:'Parallel: CT = C1 + C2 = 10 + 10 = 20 μF'},
    {q:'How many pF is 1 μF?',opts:['1,000 pF','10,000 pF','100,000 pF','1,000,000 pF'],ans:3,exp:'1 μF = 10⁻⁶ F and 1 pF = 10⁻¹² F — so 1 μF = 10⁶ pF = 1,000,000 pF'},
    {q:'What is a key characteristic of an Electrolytic Capacitor?',opts:['No polarity','Has polarity — must be connected correctly','Only works with AC','Smallest capacitance values'],ans:1,exp:'Electrolytic Capacitors have polarity (+/-) and must always be connected correctly. Reverse connection can cause an explosion.'},
    {q:'In a series capacitor circuit, what is the total capacitance?',opts:['Equal to the sum of all','Less than the smallest','Equal to the largest','Equal to the average'],ans:1,exp:'1/CT = 1/C1 + 1/C2 + ... — the result CT is less than any individual capacitor.'},
    {q:'What is the role of a capacitor in a Filter circuit?',opts:['Increase current','Reduce voltage','Filter out unwanted frequencies','Increase resistance'],ans:2,exp:'Capacitors filter out ripple in rectifier circuits — they pass AC but block DC, smoothing the output.'},
  ]},
  { id:'inductor', icon:'🌀', name:'Inductor', questions:[
    {q:'In what form does an inductor store energy?',opts:['Electric charge','Magnetic field','Heat','Light'],ans:1,exp:'An inductor stores energy in a magnetic field when current flows through its coil.'},
    {q:'What is the SI unit of inductance?',opts:['Farad (F)','Ohm (Ω)','Henry (H)','Weber (Wb)'],ans:2,exp:'Inductance is measured in Henry (H), named after Joseph Henry who discovered electromagnetic induction.'},
    {q:'L1 = 10 mH and L2 = 20 mH connected in series. What is LT?',opts:['6.67 mH','10 mH','20 mH','30 mH'],ans:3,exp:'Series inductors: LT = L1 + L2 = 10 + 20 = 30 mH (same rule as resistors).'},
    {q:'What does a Step-up transformer do to voltage?',opts:['Decreases voltage, increases current','Increases voltage, decreases current','Increases both voltage and current','Keeps voltage constant'],ans:1,exp:'A Step-up transformer increases voltage (Ns > Np) while decreasing current, conserving power (P = VI).'},
    {q:'What does an inductor resist?',opts:['Voltage changes','Current changes','Resistance changes','Frequency changes'],ans:1,exp:'An inductor resists changes in current (Law of Electromagnetic Induction) — when current changes, a back-EMF opposes that change.'},
    {q:'How is Inductive Reactance (XL) calculated?',opts:['XL = 1/(2πfL)','XL = 2πfL','XL = L/f','XL = f/L'],ans:1,exp:'XL = 2πfL, where f = frequency (Hz) and L = inductance (H). XL is measured in Ω.'},
  ]},
  { id:'soldering', icon:'🔥', name:'Soldering', questions:[
    {q:'What is the correct first step in soldering?',opts:['Feed solder first','Heat both the component lead and the pad simultaneously','Apply flux first','Turn on a fan'],ans:1,exp:'Step 1: Heat both the component lead and the pad at the same time for 2–3 seconds until both are evenly heated.'},
    {q:'What is a Cold Joint?',opts:['Solder did not melt','Rough, dull-looking solder joint','Too much solder','A good solder joint'],ans:1,exp:'A Cold Joint is a rough, dull solder joint caused by blowing, vibrating, or moving the work while solder is still cooling.'},
    {q:'After soldering and removing the iron, what should you do?',opts:['Blow cool air on it','Let it cool naturally — never blow','Dip it in water','Wipe it with a sponge'],ans:1,exp:'Let the joint cool naturally. Blowing on it will cause a Cold Joint.'},
    {q:'Where should solder wire be fed during soldering?',opts:['Directly onto the iron tip','At the junction between the component lead and pad','Only at the component lead','Only at the pad'],ans:1,exp:'Feed solder at the joint — not the iron tip — so it flows into the joint by itself.'},
    {q:'What is the sponge used with a soldering iron for?',opts:['To rest the iron while not in use','To clean the soldering iron tip','To cool the iron down','To absorb excess solder'],ans:1,exp:'A damp sponge is used to clean the iron tip, removing old solder and burnt flux.'},
    {q:'A 25–40W soldering iron is best suited for which type of work?',opts:['Very fine SMD work','General PCB soldering','Large wire splicing','Soldering IC chips'],ans:1,exp:'A 25–40W iron is ideal for general through-hole PCB soldering.'},
  ]},
  { id:'ac-circuit', icon:'〜', name:'AC Circuit', questions:[
    {q:'What is the frequency of household electricity in Thailand?',opts:['25 Hz','50 Hz','60 Hz','100 Hz'],ans:1,exp:'Thailand (and most of the world) uses 50 Hz. The USA uses 60 Hz.'},
    {q:'What is the Peak Voltage of a 220V RMS supply?',opts:['220 V','255 V','311 V','380 V'],ans:2,exp:'Vpeak = Vrms × √2 = 220 × 1.414 ≈ 311 V. RMS is the effective value equivalent to DC.'},
    {q:'What is the period of a 50 Hz AC supply?',opts:['5 ms','10 ms','20 ms','50 ms'],ans:2,exp:'T = 1/f = 1/50 = 0.02 s = 20 ms. Frequency and period are reciprocals of each other.'},
    {q:'How is Impedance (Z) of a series RC circuit calculated?',opts:['Z = R + Xc','Z = R − Xc','Z = √(R² + Xc²)','Z = R × Xc'],ans:2,exp:'Z = √(R² + Xc²) because R and Xc are 90° out of phase — Pythagoras theorem applies.'},
    {q:'Capacitive Reactance (Xc) increases when?',opts:['Frequency increases','Frequency decreases','Voltage increases','Capacitance increases'],ans:1,exp:'Xc = 1/(2πfC) — lower frequency → higher Xc. Capacitors block DC (f=0) and pass high-frequency AC easily.'},
    {q:'In an AC circuit, how does current in a capacitor relate to voltage in phase?',opts:['Current lags voltage by 90°','Current leads voltage by 90°','Current and voltage are in phase','Current leads voltage by 180°'],ans:1,exp:'In a capacitor, current leads voltage by 90° (I leads V). In an inductor, current lags voltage by 90° (I lags V).'},
  ]},
  { id:'components', icon:'🔌', name:'Semiconductor Devices', questions:[
    {q:'How does a Zener Diode differ from a regular diode?',opts:['Current flows both ways','Maintains a stable voltage in reverse bias','Amplifies power','Can replace a resistor'],ans:1,exp:'A Zener Diode maintains a constant voltage at its Zener Voltage in reverse bias. Used in Voltage Regulator circuits.'},
    {q:'What are the primary uses of a Transistor (BJT)?',opts:['Store and release charge','Signal amplification and switching','Convert AC to DC','Measure current'],ans:1,exp:'Transistors are used as amplifiers and switches. The base current controls the collector-emitter current.'},
    {q:'What is a Relay?',opts:['A large capacitor','An electromagnetically controlled switch','An adjustable resistor','A special diode'],ans:1,exp:'A Relay is a switch operated by an electromagnet — it controls a high-power circuit using a small signal.'},
    {q:'What is a Triac commonly used for?',opts:['Audio amplifier circuits','AC power control such as light dimming','Digital circuits','Battery charging circuits'],ans:1,exp:'A Triac controls AC power in both directions. Commonly used in light dimmers and AC motor speed controllers.'},
    {q:'How many terminals does a BJT transistor have, and what are they called?',opts:['2: Anode-Cathode','3: Base-Collector-Emitter','3: Gate-Source-Drain','4 terminals'],ans:1,exp:'BJT has 3 terminals: Base (B) = control input, Collector (C) = main terminal, Emitter (E) = output terminal.'},
  ]},
];

function getCurLang() { return document.documentElement.lang === 'en' ? 'en' : 'th'; }
function getQuizData() { return getCurLang() === 'en' ? QUIZ_CATEGORIES_EN : QUIZ_CATEGORIES_TH; }

let quizState = { selectedCats:[], questions:[], current:0, correct:0, wrong:0, answered:[] };

function initQuizCats() {
  const grid = document.getElementById('quiz-cat-grid');
  grid.innerHTML = '';
  const data = getQuizData();
  data.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'quiz-cat-btn active';
    btn.dataset.catId = cat.id;
    btn.innerHTML = `<span class="cat-icon">${cat.icon}</span><div class="cat-name">${cat.name}</div><div class="cat-count">${cat.questions.length} ${getCurLang()==='en'?'questions':'ข้อ'}</div>`;
    btn.addEventListener('click', () => { btn.classList.toggle('active'); quizState.selectedCats = [...document.querySelectorAll('.quiz-cat-btn.active')].map(b=>b.dataset.catId); updateToggleBtn(); updateInfo(); });
    grid.appendChild(btn);
  });
  quizState.selectedCats = data.map(c=>c.id);
  updateToggleBtn();
  updateInfo();
}
function toggleAllCats() {
  const all = document.querySelectorAll('.quiz-cat-btn');
  const allSelected = [...all].every(b => b.classList.contains('active'));
  all.forEach(b => allSelected ? b.classList.remove('active') : b.classList.add('active'));
  quizState.selectedCats = allSelected ? [] : getQuizData().map(c=>c.id);
  updateToggleBtn();
  updateInfo();
}
function updateToggleBtn() {
  const all = document.querySelectorAll('.quiz-cat-btn');
  const allSelected = [...all].every(b => b.classList.contains('active'));
  const lang = getCurLang();
  const btn = document.getElementById('toggle-all-btn');
  if (!btn) return;
  if (allSelected) {
    btn.innerHTML = `<span class="th-only">ยกเลิกทุกหมวด</span><span class="en-only">Deselect All</span>`;
  } else {
    btn.innerHTML = `<span class="th-only">เลือกทุกหมวด</span><span class="en-only">Select All</span>`;
  }
}
function updateInfo() {
  const data = getQuizData();
  const lang = getCurLang();
  const total = data.filter(c=>quizState.selectedCats.includes(c.id)).reduce((s,c)=>s+c.questions.length,0);
  if (lang === 'en') {
    document.getElementById('quiz-selected-info').textContent = `${quizState.selectedCats.length} categories, ${total} questions`;
  } else {
    document.getElementById('quiz-selected-info').textContent = `เลือก ${quizState.selectedCats.length} หมวด รวม ${total} ข้อ`;
  }
}
function startQuiz() {
  const lang = getCurLang();
  if (!quizState.selectedCats.length) {
    alert(lang==='en' ? 'Please select at least 1 category' : 'กรุณาเลือกหมวดอย่างน้อย 1 หมวด');
    return;
  }
  const data = getQuizData();
  let pool = [];
  data.forEach(cat => { if (quizState.selectedCats.includes(cat.id)) cat.questions.forEach(q=>pool.push({...q,catIcon:cat.icon,catName:cat.name})); });
  for (let i=pool.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  quizState = { selectedCats:quizState.selectedCats, questions:pool, current:0, correct:0, wrong:0, answered:[] };
  document.getElementById('quiz-cat-selector').style.display='none';
  document.getElementById('quiz-score-bar').style.display='flex';
  document.getElementById('quiz-box').style.display='block';
  document.getElementById('quiz-finish').style.display='none';
  document.getElementById('sq-total').textContent=pool.length;
  loadBest();
  renderQ();
}
function loadBest() {
  const key='quiz_best_'+[...quizState.selectedCats].sort().join('_');
  const best=localStorage.getItem(key);
  const el=document.getElementById('sq-best');
  if(best){el.style.display='';el.textContent='🏆 '+(getCurLang()==='en'?'Best: ':'สูงสุด: ')+best;}else el.style.display='none';
}
function renderQ() {
  const lang = getCurLang();
  const q=quizState.questions[quizState.current], total=quizState.questions.length, idx=quizState.current;
  document.getElementById('sq-current').textContent=idx+1;
  document.getElementById('sq-correct').textContent=quizState.correct;
  document.getElementById('sq-wrong').textContent=quizState.wrong;
  document.getElementById('quiz-prog-fill').style.width=((idx/total)*100)+'%';
  document.getElementById('quiz-qnum').textContent=`${q.catIcon} ${q.catName}  •  ${lang==='en'?'Question':'ข้อที่'} ${idx+1} / ${total}`;
  document.getElementById('quiz-question').textContent=q.q;
  const opts=document.getElementById('quiz-options');
  opts.innerHTML='';
  const letters = lang==='en' ? ['A','B','C','D'] : ['ก','ข','ค','ง'];
  letters.forEach((l,i)=>{
    const btn=document.createElement('button');
    btn.className='quiz-opt';
    btn.innerHTML=`<span class="quiz-opt-letter">${l}</span> ${q.opts[i]}`;
    btn.addEventListener('click', () => answerQ(i));
    opts.appendChild(btn);
  });
  document.getElementById('quiz-explain').style.display='none';
  document.getElementById('quiz-nav').innerHTML='';
}
function answerQ(chosen) {
  const lang = getCurLang();
  const q=quizState.questions[quizState.current];
  const opts=document.querySelectorAll('.quiz-opt');
  const ok=chosen===q.ans;
  opts.forEach((b,i)=>{ b.disabled=true; if(i===q.ans)b.classList.add('reveal'); if(i===chosen&&!ok)b.classList.add('wrong'); if(i===chosen&&ok){b.classList.remove('reveal');b.classList.add('correct');} });
  if(ok)quizState.correct++;else quizState.wrong++;
  quizState.answered.push({q:q.q,correct:ok,chosen:q.opts[chosen],answer:q.opts[q.ans]});
  document.getElementById('sq-correct').textContent=quizState.correct;
  document.getElementById('sq-wrong').textContent=quizState.wrong;
  const exp=document.getElementById('quiz-explain');
  exp.style.display='block';
  exp.className='quiz-explain '+(ok?'correct':'wrong');
  if (lang==='en') {
    exp.innerHTML=(ok?'✅ <strong>Correct!</strong> ':'❌ <strong>Incorrect.</strong> Answer: <strong>'+q.opts[q.ans]+'</strong><br>')+q.exp;
  } else {
    exp.innerHTML=(ok?'✅ <strong>ถูกต้อง!</strong> ':'❌ <strong>ไม่ถูกต้อง</strong> คำตอบที่ถูกคือ: <strong>'+q.opts[q.ans]+'</strong><br>')+q.exp;
  }
  const isLast=quizState.current>=quizState.questions.length-1;
  const nav = document.getElementById('quiz-nav');
  const navButton = document.createElement('button');
  navButton.className = isLast ? 'btn btn-green' : 'btn';
  navButton.textContent = isLast
    ? (lang === 'en' ? 'View Score 🎉' : 'ดูผลคะแนน 🎉')
    : (lang === 'en' ? 'Next →' : 'ข้อถัดไป →');
  navButton.addEventListener('click', isLast ? showFinish : nextQ);
  nav.appendChild(navButton);
}
function nextQ() { quizState.current++; renderQ(); }
function showFinish() {
  const lang = getCurLang();
  document.getElementById('quiz-box').style.display='none';
  document.getElementById('quiz-finish').style.display='block';
  const total=quizState.questions.length, score=quizState.correct, pct=Math.round((score/total)*100);
  document.getElementById('qf-score').textContent=`${score}/${total}`;
  document.getElementById('qf-label').textContent=lang==='en'?`Score ${pct}%`:`คะแนน ${pct}%`;
  let msg='',color='';
  if (lang==='en') {
    if(pct>=90){msg='🏆 Excellent! You have an outstanding understanding.';color='#065f46';}
    else if(pct>=70){msg='👍 Great job! You have a good understanding.';color='#1e429f';}
    else if(pct>=50){msg='📚 Fair. You should review some more.';color='#92400e';}
    else{msg='📖 Please go back and review the material again.';color='#991b1b';}
  } else {
    if(pct>=90){msg='🏆 ยอดเยี่ยม! เข้าใจเนื้อหาอย่างดีเยี่ยม';color='#065f46';}
    else if(pct>=70){msg='👍 ดีมาก! เข้าใจเนื้อหาเป็นอย่างดี';color='#1e429f';}
    else if(pct>=50){msg='📚 พอใช้ได้ ควรทบทวนเพิ่มเติม';color='#92400e';}
    else{msg='📖 ควรกลับไปอ่านเนื้อหาใหม่อีกครั้ง';color='#991b1b';}
  }
  const msgEl=document.getElementById('qf-msg'); msgEl.textContent=msg; msgEl.style.color=color;
  const key='quiz_best_'+[...quizState.selectedCats].sort().join('_');
  const prev=parseInt(localStorage.getItem(key)||'0');
  if(pct>prev)localStorage.setItem(key,pct+'% ('+score+'/'+total+')');
  const review=document.getElementById('qf-review');
  review.innerHTML=`<div style="font-weight:700;margin-bottom:0.75rem;">${lang==='en'?'Answer Summary':'สรุปคำตอบ'}</div>`;
  quizState.answered.forEach((a,i)=>{
    const d=document.createElement('div');
    d.className='quiz-review-item '+(a.correct?'ok':'ng');
    if (lang==='en') {
      d.innerHTML=`<strong>Q${i+1}:</strong> ${a.correct?'✅':'❌'} ${a.q}<br><span style="font-size:0.85rem;">${a.correct?'Answer: '+a.answer:'Your answer: '+a.chosen+' | Correct: '+a.answer}</span>`;
    } else {
      d.innerHTML=`<strong>ข้อ ${i+1}:</strong> ${a.correct?'✅':'❌'} ${a.q}<br><span style="font-size:0.85rem;">${a.correct?'คำตอบ: '+a.answer:'คุณตอบ: '+a.chosen+' | เฉลย: '+a.answer}</span>`;
    }
    review.appendChild(d);
  });
}
function retryQuiz() {
  document.getElementById('quiz-finish').style.display='none';
  document.getElementById('quiz-box').style.display='block';
  quizState.current=0; quizState.correct=0; quizState.wrong=0; quizState.answered=[];
  const pool=quizState.questions;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  document.getElementById('sq-current').textContent=1;
  document.getElementById('sq-correct').textContent=0;
  document.getElementById('sq-wrong').textContent=0;
  renderQ();
}
function backToMenu() {
  document.getElementById('quiz-cat-selector').style.display='block';
  document.getElementById('quiz-score-bar').style.display='none';
  document.getElementById('quiz-box').style.display='none';
  document.getElementById('quiz-finish').style.display='none';
  initQuizCats();
}
initQuizCats();

document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
document.getElementById('toggle-all-btn').addEventListener('click', toggleAllCats);
document.getElementById('retry-quiz-btn').addEventListener('click', retryQuiz);
document.querySelectorAll('.back-to-quiz-menu').forEach(btn => btn.addEventListener('click', backToMenu));

document.addEventListener('langchange', function() {
  const inProgress = document.getElementById('quiz-box').style.display !== 'none';
  const inFinish = document.getElementById('quiz-finish').style.display !== 'none';
  if (!inProgress && !inFinish) {
    initQuizCats();
  }
  updateInfo();
});
