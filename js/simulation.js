(function(){
var NS='http://www.w3.org/2000/svg';

// ── helpers ──
function fmtA(i){if(i>=1)return i.toFixed(3)+' A';if(i>=0.001)return(i*1e3).toFixed(1)+' mA';return(i*1e6).toFixed(1)+' μA';}
function fmtW(p){if(p>=1)return p.toFixed(3)+' W';return(p*1e3).toFixed(1)+' mW';}
function fmtV(v){return v.toFixed(2)+' V';}
function heat(p,ref){var t=Math.min(p/Math.max(ref,1e-9),1);return'hsl('+Math.round(220*(1-t))+',82%,52%)';}
function spd(I){return Math.max(0.015,Math.min(0.38,I*0.62));}
function $$(id){return document.getElementById(id);}

// ── calc-steps helpers ──
function cRow(sym,formula,result){return'<tr><td class="ck">'+sym+'</td><td class="cf">= '+formula+'</td><td class="cv">'+result+'</td></tr>';}
function cRowLed(sym,formula,result){return'<tr class="cled"><td class="ck">'+sym+'</td><td class="cf">= '+formula+'</td><td class="cv">'+result+'</td></tr>';}
function cSep(){return'<tr class="csep"><td colspan="3"></td></tr>';}
function cWarn(msg){return'<tr class="cwarn"><td colspan="3">⚠ '+msg+'</td></tr>';}

// ── LED SVG + UI update (shared helper) ──
function updLed(pre, state, c){
  var show=state.led, lit=c.ledLit;
  // SVG bypass wire vs LED group
  $$(pre+'-led-bypass').style.display=show?'none':'';
  $$(pre+'-led-g').style.display=show?'':'none';
  if(show){
    var fc=lit?'#fbbf24':'#94a3b8';
    var sc=lit?'#f59e0b':'#64748b';
    var op=lit?'1':'0.22';
    $$(pre+'-led-tri').setAttribute('fill',fc);
    $$(pre+'-led-tri').setAttribute('stroke',sc);
    $$(pre+'-led-bar').setAttribute('stroke',sc);
    $$(pre+'-led-r1').setAttribute('stroke',sc);$$(pre+'-led-r1').setAttribute('opacity',op);
    $$(pre+'-led-r2').setAttribute('stroke',sc);$$(pre+'-led-r2').setAttribute('opacity',op);
    $$(pre+'-led-ra1').setAttribute('fill',fc);$$(pre+'-led-ra1').setAttribute('opacity',op);
    $$(pre+'-led-ra2').setAttribute('fill',fc);$$(pre+'-led-ra2').setAttribute('opacity',op);
    $$(pre+'-led-glow').setAttribute('opacity',lit?'0.5':'0');
    $$(pre+'-led-vf-txt').textContent='Vf='+state.Vf.toFixed(1)+'V';
  }
  // control panel
  $$(pre+'-led-vf-sel').style.display=show?'':'none';
  var sta=$$(pre+'-led-status');
  if(show){sta.style.display='';sta.textContent=lit?'● ติด':'○ ดับ';sta.style.color=lit?'#f59e0b':'#94a3b8';}
  else{sta.style.display='none';}
  // result rows
  $$(pre+'-led-rb').style.display=show?'':'none';
  $$(pre+'-led-prb').style.display=show?'':'none';
  $$(pre+'-led-div').style.display=show?'':'none';
  if(show){
    $$(pre+'-led-vf-val').textContent=fmtV(state.Vf);
    $$(pre+'-led-p-val').textContent=fmtW(c.pLed);
  }
}

// ════════════════════════════ SERIES ════════════════════════════
var sState={V:12,R1:100,R2:200,R3:300,led:false,Vf:2.0};
var sSpeed=0;
function calcS(){
  var Rt=sState.R1+sState.R2+sState.R3;
  var ledLit=sState.led&&(sState.V>sState.Vf);
  var vAvail=sState.led?(ledLit?sState.V-sState.Vf:0):sState.V;
  var I=ledLit||!sState.led?vAvail/Rt:0;
  var v1=I*sState.R1,v2=I*sState.R2,v3=I*sState.R3;
  var p1=I*I*sState.R1,p2=I*I*sState.R2,p3=I*I*sState.R3;
  var pLed=sState.led&&ledLit?sState.Vf*I:0;
  return{Rt:Rt,I:I,v1:v1,v2:v2,v3:v3,p1:p1,p2:p2,p3:p3,pt:I*sState.V,
         ledLit:ledLit,vAvail:vAvail,pLed:pLed};
}
function genCalcS(s,c){
  var I=fmtA(c.I);
  var rows='<table class="calc-tbl">';
  if(s.led){
    if(c.ledLit){rows+=cRowLed('V<sub>avail</sub>','V − Vf = '+s.V+' − '+s.Vf.toFixed(1)+' V',fmtV(c.vAvail));}
    else{rows+=cWarn('V ≤ Vf — LED ไม่นำไฟ / not conducting → I = 0');}
    rows+=cSep();
  }
  rows+=cRow('R<sub>T</sub>','R₁+R₂+R₃ = '+s.R1+'+'+s.R2+'+'+s.R3+' Ω',c.Rt+' Ω');
  var vStr=s.led&&c.ledLit?fmtV(c.vAvail):s.V+' V';
  rows+=cRow('I',vStr+' ÷ R<sub>T</sub>',I);
  rows+=cSep();
  if(s.led&&c.ledLit){rows+=cRowLed('V<sub>LED</sub>','Vf (fixed)',fmtV(s.Vf));}
  rows+=cRow('V₁','I × R₁',fmtV(c.v1));
  rows+=cRow('V₂','I × R₂',fmtV(c.v2));
  rows+=cRow('V₃','I × R₃',fmtV(c.v3));
  rows+=cSep();
  if(s.led&&c.ledLit){rows+=cRowLed('P<sub>LED</sub>','Vf × I',fmtW(c.pLed));}
  rows+=cRow('P₁','I² × R₁',fmtW(c.p1));
  rows+=cRow('P₂','I² × R₂',fmtW(c.p2));
  rows+=cRow('P₃','I² × R₃',fmtW(c.p3));
  rows+=cSep();
  rows+=cRow('P<sub>T</sub>','V × I = '+s.V+' V × '+I,fmtW(c.pt));
  rows+='</table>';
  return rows;
}
function updS(){
  var c=calcS(),ref=Math.max(c.p1,c.p2,c.p3,1e-4);
  sSpeed=spd(c.I);
  $$('sl-v').textContent=sState.V+' V';
  $$('sl-r1').textContent=sState.R1+' Ω';
  $$('sl-r2').textContent=sState.R2+' Ω';
  $$('sl-r3').textContent=sState.R3+' Ω';
  $$('sr-rt').textContent=c.Rt+' Ω';
  $$('sr-I').textContent=fmtA(c.I);
  $$('sr-v1').textContent=fmtV(c.v1);$$('sr-v2').textContent=fmtV(c.v2);$$('sr-v3').textContent=fmtV(c.v3);
  $$('sr-p1').textContent=fmtW(c.p1);$$('sr-p2').textContent=fmtW(c.p2);$$('sr-p3').textContent=fmtW(c.p3);
  $$('sr-pt').textContent=fmtW(c.pt);
  $$('s-vs').textContent=sState.V+' V';
  $$('s-r1o').textContent=sState.R1+' Ω';$$('s-r2o').textContent=sState.R2+' Ω';$$('s-r3o').textContent=sState.R3+' Ω';
  $$('s-v1').textContent='V₁='+c.v1.toFixed(1)+' V';
  $$('s-v2').textContent='V₂='+c.v2.toFixed(1)+' V';
  $$('s-v3').textContent='V₃='+c.v3.toFixed(1)+' V';
  $$('s-I').textContent=fmtA(c.I);
  $$('s-r1').setAttribute('fill',heat(c.p1,ref));
  $$('s-r2').setAttribute('fill',heat(c.p2,ref));
  $$('s-r3').setAttribute('fill',heat(c.p3,ref));
  $$('s-calc').innerHTML=genCalcS(sState,c);
  updLed('s',sState,c);
}
addGlow($$('svg-s'),'sg');
var sE=mkElectrons($$('svg-s'),14,'sg');
var psPath=$$('ps');
$$('s-v').addEventListener('input',function(){sState.V=+this.value;updS();});
$$('s-r1-sl').addEventListener('input',function(){sState.R1=+this.value;updS();});
$$('s-r2-sl').addEventListener('input',function(){sState.R2=+this.value;updS();});
$$('s-r3-sl').addEventListener('input',function(){sState.R3=+this.value;updS();});
$$('s-led-cb').addEventListener('change',function(){sState.led=this.checked;updS();});
$$('s-led-vf-sel').addEventListener('change',function(){sState.Vf=parseFloat(this.value);updS();});
updS();

// ════════════════════════════ PARALLEL ════════════════════════════
var pState={V:12,R1:100,R2:200,R3:400,led:false,Vf:2.0};
var pSpeedOut=0,pSpeed1=0,pSpeed2=0,pSpeed3=0;
function calcP(){
  var ledLit=pState.led&&(pState.V>pState.Vf);
  var vAvail=pState.led?(ledLit?pState.V-pState.Vf:0):pState.V;
  var I1=vAvail/pState.R1,I2=vAvail/pState.R2,I3=vAvail/pState.R3;
  if(pState.led&&!ledLit){I1=I2=I3=0;}
  var It=I1+I2+I3;
  var Rt=It>0?vAvail/It:1/(1/pState.R1+1/pState.R2+1/pState.R3);
  var pLed=pState.led&&ledLit?pState.Vf*It:0;
  return{Rt:Rt,It:It,I1:I1,I2:I2,I3:I3,
    p1:I1*I1*pState.R1,p2:I2*I2*pState.R2,p3:I3*I3*pState.R3,
    pt:It*pState.V,ledLit:ledLit,vAvail:vAvail,pLed:pLed};
}
function genCalcP(s,c){
  var rows='<table class="calc-tbl">';
  if(s.led){
    if(c.ledLit){rows+=cRowLed('V<sub>avail</sub>','V − Vf = '+s.V+' − '+s.Vf.toFixed(1)+' V',fmtV(c.vAvail));}
    else{rows+=cWarn('V ≤ Vf — LED ไม่นำไฟ / not conducting → I = 0');}
    rows+=cSep();
  }
  var vStr=s.led&&c.ledLit?fmtV(c.vAvail):s.V+' V';
  rows+=cRow('I₁',vStr+' ÷ R₁',fmtA(c.I1));
  rows+=cRow('I₂',vStr+' ÷ R₂',fmtA(c.I2));
  rows+=cRow('I₃',vStr+' ÷ R₃',fmtA(c.I3));
  rows+=cSep();
  rows+=cRow('I<sub>T</sub>','I₁+I₂+I₃',fmtA(c.It));
  rows+=cRow('R<sub>T</sub>',vStr+' ÷ I<sub>T</sub>',c.Rt.toFixed(1)+' Ω');
  rows+=cSep();
  if(s.led&&c.ledLit){rows+=cRowLed('P<sub>LED</sub>','Vf × I<sub>T</sub>',fmtW(c.pLed));}
  rows+=cRow('P₁',vStr+' × I₁',fmtW(c.p1));
  rows+=cRow('P₂',vStr+' × I₂',fmtW(c.p2));
  rows+=cRow('P₃',vStr+' × I₃',fmtW(c.p3));
  rows+=cSep();
  rows+=cRow('P<sub>T</sub>','V × I<sub>T</sub> = '+s.V+' V × '+fmtA(c.It),fmtW(c.pt));
  rows+='</table>';
  return rows;
}
function updP(){
  var c=calcP(),ref=Math.max(c.p1,c.p2,c.p3,1e-4);
  pSpeedOut=spd(c.It);pSpeed1=spd(c.I1);pSpeed2=spd(c.I2);pSpeed3=spd(c.I3);
  $$('pl-v').textContent=pState.V+' V';
  $$('pl-r1').textContent=pState.R1+' Ω';
  $$('pl-r2').textContent=pState.R2+' Ω';
  $$('pl-r3').textContent=pState.R3+' Ω';
  $$('pr-rt').textContent=c.Rt.toFixed(1)+' Ω';
  $$('pr-IT').textContent=fmtA(c.It);
  $$('pr-I1').textContent=fmtA(c.I1);$$('pr-I2').textContent=fmtA(c.I2);$$('pr-I3').textContent=fmtA(c.I3);
  $$('pr-p1').textContent=fmtW(c.p1);$$('pr-p2').textContent=fmtW(c.p2);$$('pr-p3').textContent=fmtW(c.p3);
  $$('pr-pt').textContent=fmtW(c.pt);
  $$('p-vs').textContent=pState.V+' V';
  $$('p-r1o').textContent=pState.R1+' Ω';$$('p-r2o').textContent=pState.R2+' Ω';$$('p-r3o').textContent=pState.R3+' Ω';
  $$('p-I1').textContent='I₁='+fmtA(c.I1);$$('p-I2').textContent='I₂='+fmtA(c.I2);$$('p-I3').textContent='I₃='+fmtA(c.I3);
  $$('p-IT').textContent=fmtA(c.It);
  $$('p-r1').setAttribute('fill',heat(c.p1,ref));
  $$('p-r2').setAttribute('fill',heat(c.p2,ref));
  $$('p-r3').setAttribute('fill',heat(c.p3,ref));
  $$('p-calc').innerHTML=genCalcP(pState,c);
  updLed('p',pState,c);
}
addGlow($$('svg-p'),'pg');
var pEout=mkElectrons($$('svg-p'),10,'pg');
var pE1=mkElectrons($$('svg-p'),8,'pg','#6ee7b7');
var pE2=mkElectrons($$('svg-p'),8,'pg','#fb923c');
var pE3=mkElectrons($$('svg-p'),8,'pg','#c4b5fd');
var ppOutPath=$$('pp-out'),pp1Path=$$('pp1'),pp2Path=$$('pp2'),pp3Path=$$('pp3');
$$('p-v').addEventListener('input',function(){pState.V=+this.value;updP();});
$$('p-r1-sl').addEventListener('input',function(){pState.R1=+this.value;updP();});
$$('p-r2-sl').addEventListener('input',function(){pState.R2=+this.value;updP();});
$$('p-r3-sl').addEventListener('input',function(){pState.R3=+this.value;updP();});
$$('p-led-cb').addEventListener('change',function(){pState.led=this.checked;updP();});
$$('p-led-vf-sel').addEventListener('change',function(){pState.Vf=parseFloat(this.value);updP();});
updP();

// ════════════════════════════ MIXED ════════════════════════════
var mState={V:12,R1:100,R2:200,R3:400,led:false,Vf:2.0};
var mSpeedOut=0,mSpeed2=0,mSpeed3=0;
function calcM(){
  var Rp=mState.R2*mState.R3/(mState.R2+mState.R3);
  var Rt=mState.R1+Rp;
  var ledLit=mState.led&&(mState.V>mState.Vf);
  var vAvail=mState.led?(ledLit?mState.V-mState.Vf:0):mState.V;
  var It=ledLit||!mState.led?vAvail/Rt:0;
  var v1=It*mState.R1,vp=It*Rp;
  var I2=vp/mState.R2,I3=vp/mState.R3;
  var p1=It*It*mState.R1,p2=I2*I2*mState.R2,p3=I3*I3*mState.R3;
  var pLed=mState.led&&ledLit?mState.Vf*It:0;
  return{Rt:Rt,Rp:Rp,It:It,v1:v1,vp:vp,I2:I2,I3:I3,
    p1:p1,p2:p2,p3:p3,pt:It*mState.V,ledLit:ledLit,vAvail:vAvail,pLed:pLed};
}
function genCalcM(s,c){
  var IT=fmtA(c.It);
  var rows='<table class="calc-tbl">';
  if(s.led){
    if(c.ledLit){rows+=cRowLed('V<sub>avail</sub>','V − Vf = '+s.V+' − '+s.Vf.toFixed(1)+' V',fmtV(c.vAvail));}
    else{rows+=cWarn('V ≤ Vf — LED ไม่นำไฟ / not conducting → I = 0');}
    rows+=cSep();
  }
  rows+=cRow('R<sub>p</sub>','R₂×R₃÷(R₂+R₃)',c.Rp.toFixed(1)+' Ω');
  rows+=cRow('R<sub>T</sub>','R₁ + R<sub>p</sub>',c.Rt.toFixed(1)+' Ω');
  var vStr=s.led&&c.ledLit?fmtV(c.vAvail):s.V+' V';
  rows+=cRow('I<sub>T</sub>',vStr+' ÷ R<sub>T</sub>',IT);
  rows+=cSep();
  rows+=cRow('V₁','I<sub>T</sub> × R₁',fmtV(c.v1));
  rows+=cRow('V<sub>p</sub>','I<sub>T</sub> × R<sub>p</sub>',fmtV(c.vp));
  rows+=cSep();
  rows+=cRow('I₂','V<sub>p</sub> ÷ R₂',fmtA(c.I2));
  rows+=cRow('I₃','V<sub>p</sub> ÷ R₃',fmtA(c.I3));
  rows+=cSep();
  if(s.led&&c.ledLit){rows+=cRowLed('P<sub>LED</sub>','Vf × I<sub>T</sub>',fmtW(c.pLed));}
  rows+=cRow('P₁','I<sub>T</sub>² × R₁',fmtW(c.p1));
  rows+=cRow('P₂','I₂² × R₂',fmtW(c.p2));
  rows+=cRow('P₃','I₃² × R₃',fmtW(c.p3));
  rows+=cSep();
  rows+=cRow('P<sub>T</sub>','V × I<sub>T</sub> = '+s.V+' V × '+IT,fmtW(c.pt));
  rows+='</table>';
  return rows;
}
function updM(){
  var c=calcM(),ref=Math.max(c.p1,c.p2,c.p3,1e-4);
  mSpeedOut=spd(c.It);mSpeed2=spd(c.I2);mSpeed3=spd(c.I3);
  $$('ml-v').textContent=mState.V+' V';
  $$('ml-r1').textContent=mState.R1+' Ω';
  $$('ml-r2').textContent=mState.R2+' Ω';
  $$('ml-r3').textContent=mState.R3+' Ω';
  $$('mr-rt').textContent=c.Rt.toFixed(1)+' Ω';
  $$('mr-IT').textContent=fmtA(c.It);
  $$('mr-rp').textContent=c.Rp.toFixed(1)+' Ω';
  $$('mr-v1').textContent=fmtV(c.v1);
  $$('mr-vp').textContent=fmtV(c.vp);
  $$('mr-I2').textContent=fmtA(c.I2);$$('mr-I3').textContent=fmtA(c.I3);
  $$('mr-p1').textContent=fmtW(c.p1);$$('mr-p2').textContent=fmtW(c.p2);$$('mr-p3').textContent=fmtW(c.p3);
  $$('mr-pt').textContent=fmtW(c.pt);
  $$('m-vs').textContent=mState.V+' V';
  $$('m-r1o').textContent=mState.R1+' Ω';$$('m-r2o').textContent=mState.R2+' Ω';$$('m-r3o').textContent=mState.R3+' Ω';
  $$('m-v1').textContent='V₁='+c.v1.toFixed(1)+' V';
  $$('m-vp').textContent='Vp='+c.vp.toFixed(1)+' V';
  $$('m-I2').textContent='I₂='+fmtA(c.I2);
  $$('m-I3').textContent='I₃='+fmtA(c.I3);
  $$('m-IT').textContent=fmtA(c.It);
  $$('m-r1').setAttribute('fill',heat(c.p1,ref));
  $$('m-r2').setAttribute('fill',heat(c.p2,ref));
  $$('m-r3').setAttribute('fill',heat(c.p3,ref));
  $$('m-calc').innerHTML=genCalcM(mState,c);
  updLed('m',mState,c);
}
addGlow($$('svg-m'),'mg');
var mEout=mkElectrons($$('svg-m'),12,'mg');
var mE2=mkElectrons($$('svg-m'),8,'mg','#fb923c');
var mE3=mkElectrons($$('svg-m'),8,'mg','#c4b5fd');
var pmOutPath=$$('pm-out'),pm2Path=$$('pm2'),pm3Path=$$('pm3');
$$('m-v').addEventListener('input',function(){mState.V=+this.value;updM();});
$$('m-r1-sl').addEventListener('input',function(){mState.R1=+this.value;updM();});
$$('m-r2-sl').addEventListener('input',function(){mState.R2=+this.value;updM();});
$$('m-r3-sl').addEventListener('input',function(){mState.R3=+this.value;updM();});
$$('m-led-cb').addEventListener('change',function(){mState.led=this.checked;updM();});
$$('m-led-vf-sel').addEventListener('change',function(){mState.Vf=parseFloat(this.value);updM();});
updM();

// ── glow filter ──
function addGlow(svgEl,id){
  var d=document.createElementNS(NS,'defs');
  d.innerHTML='<filter id="'+id+'" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svgEl.insertBefore(d,svgEl.firstChild);
}

// ── electron factory ──
function mkElectrons(svgEl,n,filt,color){
  color=color||'#93c5fd';
  var arr=[];
  for(var i=0;i<n;i++){
    var c=document.createElementNS(NS,'circle');
    c.setAttribute('r','5');c.setAttribute('fill',color);
    c.setAttribute('opacity','0.92');c.setAttribute('filter','url(#'+filt+')');
    svgEl.appendChild(c);
    arr.push({el:c,f:i/n});
  }
  return arr;
}

function moveElectrons(dots,path,sp,dt){
  var L=path.getTotalLength();
  for(var j=0;j<dots.length;j++){
    dots[j].f=(dots[j].f+sp*dt)%1;
    var pt=path.getPointAtLength(dots[j].f*L);
    dots[j].el.setAttribute('cx',pt.x.toFixed(1));
    dots[j].el.setAttribute('cy',pt.y.toFixed(1));
  }
}

// ════════════════════════════ ANIMATION LOOP ════════════════════════════
var lastTs=null,rafId=null;
function tick(ts){
  if(lastTs===null)lastTs=ts;
  var dt=Math.min((ts-lastTs)/1000,0.05);lastTs=ts;

  moveElectrons(sE,psPath,sSpeed,dt);

  moveElectrons(pEout,ppOutPath,pSpeedOut,dt);
  moveElectrons(pE1,pp1Path,pSpeed1,dt);
  moveElectrons(pE2,pp2Path,pSpeed2,dt);
  moveElectrons(pE3,pp3Path,pSpeed3,dt);

  moveElectrons(mEout,pmOutPath,mSpeedOut,dt);
  moveElectrons(mE2,pm2Path,mSpeed2,dt);
  moveElectrons(mE3,pm3Path,mSpeed3,dt);

  rafId=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    if(rafId!==null){cancelAnimationFrame(rafId);rafId=null;}
    lastTs=null;
  } else {
    if(rafId===null)rafId=requestAnimationFrame(tick);
  }
});
rafId=requestAnimationFrame(tick);

// ════════════════════════════ TAB SWITCHING ════════════════════════════
document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn){
  btn.addEventListener('click',function(){
    var t=this.dataset.tab;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.sim-tab').forEach(function(d){d.classList.remove('active');});
    this.classList.add('active');
    document.getElementById('tab-'+t).classList.add('active');
  });
});

})();
