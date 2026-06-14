      (function(){
        var VPK = 17;            // 12Vac × √2 ≈ 17V peak
        var R1 = 1000;           // current-limiting resistor
        var W50 = 2*Math.PI*50;  // mains angular frequency

        // Linear AC component: Z = R + jX → parametric (V_dut, I) over phase t
        function lin(R, X){
          var Tr = R1 + R, Ti = X;
          var dz = Math.sqrt(Tr*Tr + Ti*Ti);
          var pI = -Math.atan2(Ti, Tr);
          var mI = VPK/dz;
          var mV = mI*Math.sqrt(R*R + X*X);
          var pV = pI + Math.atan2(X, R);
          return function(t){ return [mV*Math.sin(t+pV), mI*Math.sin(t+pI)]; };
        }
        // Diode-family: forward knee vf with dynamic resistance rd; optional reverse fn(vs)→I
        function dio(vf, rd, rev){
          return function(t){
            var vs = VPK*Math.sin(t), i = 0;
            if (vs > vf) i = (vs-vf)/(R1+rd);
            else if (rev) i = rev(vs);
            return [vs - i*R1, i];
          };
        }

        // xV = volts at full half-width (5 div), ymA = mA at full half-height (4 div)
        var DUTS = {
          open:  { xV:20, ymA:20, f:function(t){ return [VPK*Math.sin(t), 0]; },
                   th:'วงจรเปิด (Open Circuit)', en:'Open Circuit',
                   thd:'ไม่มีกระแสไหลทุกช่วงแรงดัน — อุปกรณ์ขาด สายหลุด หรือยังไม่ได้ต่อ',
                   end:'No current at any voltage — broken component, loose lead, or nothing connected' },
          short: { xV:20, ymA:20, f:function(t){ return [0, VPK*Math.sin(t)/R1]; },
                   th:'ลัดวงจร (Short Circuit)', en:'Short Circuit',
                   thd:'กระแสไหลเต็มที่โดยไม่มีแรงดันตกคร่อม — อุปกรณ์ช็อต',
                   end:'Full current with zero voltage drop — the component is shorted' },
          r1k:   { xV:12, ymA:12, f:lin(1000, 0),
                   th:'ตัวต้านทาน 1kΩ (เชิงเส้น)', en:'Resistor 1kΩ (Linear)',
                   thd:'เส้นตรงเอียงผ่านจุดกำเนิดตามกฎของโอห์ม — ความชันมาก = ความต้านทานน้อย',
                   end:'Straight line through the origin per Ohm’s Law — steeper slope means lower resistance' },
          r100k: { xV:20, ymA:0.8, f:lin(100000, 0),
                   th:'ตัวต้านทาน 100kΩ (ความต้านทานสูง)', en:'Resistor 100kΩ (High Resistance)',
                   thd:'ความต้านทานสูง กระแสไหลน้อยมาก เส้นจึงเกือบราบ',
                   end:'High resistance passes very little current, so the line is nearly flat' },
          cap:   { xV:18, ymA:18, f:lin(0, -1/(W50*1.5e-6)),
                   th:'ตัวเก็บประจุ (Phase Shift 90°)', en:'Capacitor (Phase Shift 90°)',
                   thd:'V กับ I ต่างเฟสกัน 90° จึงเป็นวงรีสมมาตร — ตัวเก็บประจุสภาพดี',
                   end:'V and I are 90° out of phase, giving a symmetric ellipse — capacitor is good' },
          capbad:{ xV:18, ymA:18, f:lin(900, -1/(W50*1.5e-6)),
                   th:'ตัวเก็บประจุเสื่อม (High ESR/Leakage)', en:'Capacitor — High ESR/Leakage',
                   thd:'วงรีเอียงและแบนลง แสดงว่ามี ESR สูงหรือรั่ว — ควรเปลี่ยน',
                   end:'Tilted, flattened ellipse indicates high ESR or leakage — replace it' },
          ind:   { xV:16, ymA:16, f:lin(300, W50*4),
                   th:'ขดลวดเหนี่ยวนำ (Phase Shift)', en:'Inductor (Phase Shift)',
                   thd:'กระแสล้าหลังแรงดัน เกิดวงรีตามค่าความเหนี่ยวนำ',
                   end:'Current lags voltage, producing an ellipse set by the inductance' },
          diode: { xV:6, ymA:20, f:dio(0.7, 80, null),
                   th:'ไดโอดปกติ (Rectification)', en:'Diode — Normal (Rectification)',
                   thd:'นำกระแสด้านเดียว หักงอที่ ~0.7V — ไดโอดซิลิคอนสภาพดี',
                   end:'Conducts one way with a knee at ~0.7V — healthy silicon diode' },
          dleak: { xV:6, ymA:20, f:dio(0.7, 80, function(vs){ return vs < 0 ? vs/(R1+4000) : 0; }),
                   th:'ไดโอดรั่ว (Reverse Leakage)', en:'Diode — Reverse Leakage',
                   thd:'ด้านย้อนกลับมีกระแสรั่ว (เส้นเอียงลงทางซ้าย) — ไดโอดเสื่อม ควรเปลี่ยน',
                   end:'Reverse side leaks current (line slopes down to the left) — degraded diode, replace it' },
          zener: { xV:8, ymA:20, f:dio(0.7, 80, function(vs){ return vs < -5 ? (vs+5)/(R1+80) : 0; }),
                   th:'ซีเนอร์ไดโอด (Breakdown 5V)', en:'Zener Diode (Breakdown 5V)',
                   thd:'หักงอ 2 ด้าน: ~0.7V ด้านหน้า และพังทลายที่ −5V ด้านกลับ — ใช้ควบคุมแรงดัน',
                   end:'Two knees: ~0.7V forward and −5V reverse breakdown — used for voltage regulation' },
          bjt:   { xV:6, ymA:20, f:dio(0.65, 80, null),
                   th:'ขา B-E ทรานซิสเตอร์ (Diode Junction)', en:'Transistor B-E Junction',
                   thd:'รอยต่อ B-E ทำตัวเหมือนไดโอด — ใช้เช็คทรานซิสเตอร์ดี/เสียได้',
                   end:'The B-E junction behaves like a diode — a quick transistor health check' }
        };

        var canvas = document.getElementById('iv-canvas');
        var ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        var sel = document.getElementById('iv-select');
        var nameEl = document.getElementById('iv-name');
        var descEl = document.getElementById('iv-desc');
        var ch1El = document.getElementById('iv-ch1');
        var ch2El = document.getElementById('iv-ch2');
        var CX = 220, CY = 176, HW = 220, HH = 176;
        var cur, phase = 0, px = null, py = null;

        function fmt(n){ return (Math.round(n*100)/100).toString(); }
        function setDut(id){
          cur = DUTS[id];
          ctx.clearRect(0, 0, 440, 352);
          px = py = null;
          nameEl.innerHTML = '<span class="th-only"></span><span class="en-only"></span>';
          nameEl.children[0].textContent = cur.th;
          nameEl.children[1].textContent = cur.en;
          descEl.innerHTML = '<span class="th-only"></span><span class="en-only"></span>';
          descEl.children[0].textContent = cur.thd;
          descEl.children[1].textContent = cur.end;
          ch1El.textContent = 'CH1 (X): ' + fmt(cur.xV/5) + ' V/div';
          ch2El.textContent = 'CH2 (Y): ' + fmt(cur.ymA/4) + ' mA/div';
        }

        function frame(){
          // phosphor persistence: fade old trace toward transparent
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0,0,0,0.01)';
          ctx.fillRect(0, 0, 440, 352);
          ctx.globalCompositeOperation = 'source-over';

          ctx.strokeStyle = '#00ff84';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00e676';
          ctx.shadowBlur = 6;
          var x = px, y = py;
          for (var k = 0; k < 6; k++){
            phase += 0.03;
            var vi = cur.f(phase);
            var nx = CX + (vi[0]/cur.xV)*HW;
            var ny = CY - (vi[1]*1000/cur.ymA)*HH;
            if (x !== null){
              ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
            }
            x = nx; y = ny;
          }
          px = x; py = y;
          // bright beam head
          ctx.fillStyle = '#d4ffe6';
          ctx.beginPath(); ctx.arc(px, py, 2, 0, 6.3); ctx.fill();
          ctx.shadowBlur = 0;
          requestAnimationFrame(frame);
        }

        sel.addEventListener('change', function(){ setDut(sel.value); });
        setDut(sel.value);
        requestAnimationFrame(frame);
      })();
