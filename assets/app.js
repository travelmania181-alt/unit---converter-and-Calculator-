'use strict';
(function(){
  // tiny helpers
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  // TABS
  $$('.tab').forEach(btn=> btn.addEventListener('click', e=>{
    const t=e.currentTarget, target=t.dataset.tab; $$('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active'); $$('.tab-panel').forEach(p=>p.classList.remove('active')); const panel=$('#'+target); if(panel) panel.classList.add('active');
  }));

  /* -------------------- Calculator -------------------- */
  const Calc = (()=>{
    let memory = 0, lastAns=0, history=[]; let angle='DEG';

    function fact(n){ n = Math.floor(Number(n)); if(!Number.isFinite(n)||n<0) return NaN; if(n>170) return Infinity; let r=1; for(let i=2;i<=n;i++) r*=i; return r; }

    function sanitize(expr){
      expr = String(expr);
      expr = expr.replace(/\^/g,'**');
      expr = expr.replace(/π/g,'Math.PI');
      expr = expr.replace(/\bsqrt\(/g,'Math.sqrt(');
      expr = expr.replace(/\bln\(/g,'Math.log(');
      if(typeof Math.log10 === 'function') expr = expr.replace(/\blog\(/g,'Math.log10(');
      else expr = expr.replace(/\blog\(/g,'(Math.log(');
      // trig
      expr = expr.replace(/\bsin\(/g,'Math.sin(').replace(/\bcos\(/g,'Math.cos(').replace(/\btan\(/g,'Math.tan(');
      if(angle==='DEG'){
        expr = expr.replace(/Math\.sin\(([^)]+)\)/g,'Math.sin(($1)*Math.PI/180)');
        expr = expr.replace(/Math\.cos\(([^)]+)\)/g,'Math.cos(($1)*Math.PI/180)');
        expr = expr.replace(/Math\.tan\(([^)]+)\)/g,'Math.tan(($1)*Math.PI/180)');
      }
      // factorial (simple cases)
      expr = expr.replace(/(\d+|\([^()]*\))!/g, (m)=> 'fact('+m.slice(0,-1)+')');
      return expr;
    }

    function evaluate(expr){
      const cleaned = sanitize(expr);
      try{ const fn = new Function('fact','Math','return ('+cleaned+');'); const res = fn.call(null, fact, Math); return Number(res); }catch(e){ throw e; }
    }

    function press(displayEl, key){ if(!displayEl) return; let buf = displayEl.dataset.buffer || '';
      if(key==='C'){ buf=''; displayEl.textContent='0'; displayEl.dataset.buffer=''; return; }
      if(key==='⌫'){ buf=buf.slice(0,-1); displayEl.dataset.buffer=buf; displayEl.textContent=buf||'0'; return; }
      if(key==='MC'){ memory=0; return; }
      if(key==='MR'){ buf+=String(memory); displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='M+'){ try{ memory += Number(evaluate(buf||'0')); }catch{} return; }
      if(key==='M-'){ try{ memory -= Number(evaluate(buf||'0')); }catch{} return; }
      if(key==='ANS'){ buf += String(lastAns); displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='±'){ if(buf.startsWith('-')) buf=buf.slice(1); else buf='-'+buf; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='π'){ buf += 'π'; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='x²'){ buf = '('+buf+')^2'; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='√'){ buf = 'sqrt('+buf+')'; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='!'){ buf = buf + '!'; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='^'){ buf += '^'; displayEl.dataset.buffer=buf; displayEl.textContent=buf; return; }
      if(key==='='){ try{ const v = evaluate(buf||'0'); lastAns=v; history.unshift(buf+' = '+v); if(history.length>200) history.pop(); displayEl.textContent=String(v); displayEl.dataset.buffer=String(v); }catch{ displayEl.textContent='Error'; } return; }
      // append
      buf += key; displayEl.dataset.buffer=buf; displayEl.textContent=buf;
    }

    function setAngle(m){ angle=m; }
    return { press, setAngle, getHistory:()=>history };
  })();

  // bind calc buttons
  $$('[data-calc]').forEach(grid=> grid.addEventListener('click', e=>{
    const btn = e.target.closest('button'); if(!btn) return; const k = btn.dataset.key; const display = grid.dataset.calc==='basic' ? $('#basic-display') : $('#sci-display'); Calc.press(display,k);
  }));

  // keyboard
  window.addEventListener('keydown', e=>{
    if(document.activeElement && document.activeElement.tagName==='INPUT' && document.activeElement.id.startsWith('from')) return;
    const map = {'Enter':'=','Backspace':'⌫','Delete':'C'}; const key = map[e.key]||e.key; const sciActive = $('#scientific-tab')?.classList.contains('active'); const display = sciActive ? $('#sci-display') : $('#basic-display'); if(!display) return; if(key.length===1 || ['=','⌫','C'].includes(key)){ Calc.press(display,key); e.preventDefault(); }
  });

  // angle mode
  const angleBtn = $('#angleMode'); if(angleBtn) angleBtn.addEventListener('click', ()=>{ angleBtn.textContent = angleBtn.textContent==='DEG' ? 'RAD' : 'DEG'; Calc.setAngle(angleBtn.textContent); });

  /* -------------------- Converter -------------------- */
  if($('#category')){
    const categorySel = $('#category'); const fromSel = $('#fromUnit'); const toSel = $('#toUnit'); const fromVal = $('#fromValue'); const resultBox = $('#resultBox');
    const categories = buildCategories(); Object.keys(categories).forEach(cat=>{ const o=document.createElement('option'); o.value=cat; o.textContent=cat; categorySel.appendChild(o); });
    function refreshUnits(){ const cat=categories[categorySel.value]; fromSel.innerHTML=''; toSel.innerHTML=''; cat.units.forEach(u=>{ const o1=document.createElement('option'); o1.value=u.id; o1.textContent=u.name; fromSel.appendChild(o1); const o2=document.createElement('option'); o2.value=u.id; o2.textContent=u.name; toSel.appendChild(o2); }); fromSel.selectedIndex=0; toSel.selectedIndex=Math.min(1,toSel.options.length-1); }
    function convert(){ const cat = categories[categorySel.value]; const from = cat.units.find(u=>u.id===fromSel.value); const to = cat.units.find(u=>u.id===toSel.value); const val = Number(fromVal.value); if(!Number.isFinite(val)){ resultBox.textContent='Result: — (enter valid number)'; return; } try{ const base = from.toBase(val); const out = to.fromBase(base); resultBox.textContent='Result: '+formatNumber(out)+' '+to.name; }catch(e){ resultBox.textContent='Result: Error'; } }
    $('#swapBtn').addEventListener('click', ()=>{ const a=fromSel.selectedIndex; fromSel.selectedIndex = toSel.selectedIndex; toSel.selectedIndex=a; convert(); });
    $('#convertBtn').addEventListener('click', convert); $('#copyBtn').addEventListener('click', ()=>{ const txt = resultBox.textContent.replace(/^Result:\s*/,''); navigator.clipboard?.writeText(txt).catch(()=>{}); }); $('#clearBtn').addEventListener('click', ()=>{ fromVal.value=''; resultBox.textContent='Result: —'; fromVal.focus(); }); fromVal.addEventListener('keydown', e=>{ if(e.key==='Enter') convert(); }); categorySel.addEventListener('change', ()=>{ refreshUnits(); convert(); });
    categorySel.value = Object.keys(categories)[0]; refreshUnits();
  }

  function formatNumber(n){ if(!isFinite(n)) return 'NaN'; const abs=Math.abs(n); if(abs!==0 && (abs<1e-6 || abs>=1e9)) return n.toExponential(8); return Number(n.toFixed(12)).toString(); }

  function buildCategories(){
    const lin=(id,name,f)=>({id,name,toBase:v=>v*f,fromBase:b=>b/f}); const special=(id,name,toB,fromB)=>({id,name,toBase:toB,fromBase:fromB});
    const Length = { units:[ lin('metre','metre (m)',1), lin('kilometre','kilometre (km)',1000), lin('centimetre','centimetre (cm)',0.01), lin('millimetre','millimetre (mm)',0.001), lin('micrometre','micrometre (µm)',1e-6), lin('nanometre','nanometre (nm)',1e-9), lin('mile','mile (mi)',1609.344), lin('yard','yard (yd)',0.9144), lin('foot','foot (ft)',0.3048), lin('inch','inch (in)',0.0254), lin('nautical_mile','nautical mile (nmi)',1852) ] };
    const Mass = { units:[ lin('kilogram','kilogram (kg)',1), lin('gram','gram (g)',0.001), lin('milligram','milligram (mg)',1e-6), lin('microgram','microgram (µg)',1e-9), lin('tonne','tonne (t)',1000), lin('pound','pound (lb)',0.45359237), lin('ounce','ounce (oz)',0.028349523125) ] };
    const Temperature = { units:[ special('celsius','Celsius (°C)', v=>v+273.15, v=>v-273.15), special('fahrenheit','Fahrenheit (°F)', v=>(v+459.67)*5/9, v=>v*9/5-459.67), special('kelvin','Kelvin (K)', v=>v, v=>v) ] };
    const Area = { units:[ lin('square_metre','square metre (m²)',1), lin('square_kilometre','square kilometre (km²)',1e6), lin('square_centimetre','square centimetre (cm²)',1e-4), lin('square_millimetre','square millimetre (mm²)',1e-6), lin('hectare','hectare (ha)',1e4), lin('acre','acre',4046.8564224), lin('square_foot','square foot (ft²)',0.09290304), lin('square_inch','square inch (in²)',0.00064516) ] };
    const Volume = { units:[ lin('cubic_metre','cubic metre (m³)',1), lin('litre','litre (L)',0.001), lin('millilitre','millilitre (mL)',0.000001), lin('cubic_centimetre','cubic centimetre (cm³)',0.000001), lin('cubic_inch','cubic inch (in³)',1.6387064e-5), lin('cubic_foot','cubic foot (ft³)',0.028316846592), lin('gallon_us','gallon (US gal)',0.003785411784) ] };
    const Speed = { units:[ lin('m_per_s','metre per second (m/s)',1), lin('km_per_h','kilometre per hour (km/h)',1/3.6), lin('mph','mile per hour (mph)',0.44704), lin('knot','knot (kn)',0.514444) ] };
    const Time = { units:[ lin('second','second (s)',1), lin('millisecond','millisecond (ms)',0.001), lin('microsecond','microsecond (µs)',1e-6), lin('minute','minute (min)',60), lin('hour','hour (h)',3600), lin('day','day (d)',86400) ] };
    const Angle = { units:[ special('degree','degree (°)', v=>v*Math.PI/180, v=>v*180/Math.PI), special('radian','radian (rad)', v=>v, v=>v), special('gradian','gradian (gon)', v=>v*Math.PI/200, v=>v*200/Math.PI) ] };
    const Energy = { units:[ lin('joule','joule (J)',1), lin('kilojoule','kilojoule (kJ)',1e3), lin('calorie','calorie (cal)',4.184), lin('kilocalorie','kilocalorie (kcal)',4184), lin('watt_hour','watt-hour (Wh)',3600), lin('kilowatt_hour','kilowatt-hour (kWh)',3.6e6) ] };
    const Power = { units:[ lin('watt','watt (W)',1), lin('kilowatt','kilowatt (kW)',1e3), lin('horsepower','horsepower (hp)',745.6998715822702) ] };
    const Pressure = { units:[ lin('pascal','pascal (Pa)',1), lin('kilopascal','kilopascal (kPa)',1e3), lin('bar','bar',1e5), lin('atmosphere','atmosphere (atm)',101325), lin('psi','psi',6894.757293168) ] };
    const Data = { units:[ lin('bit','bit (b)',1/8), lin('byte','byte (B)',1), lin('kilobyte','kilobyte (kB)',1e3), lin('kibibyte','kibibyte (KiB)',1024), lin('megabyte','megabyte (MB)',1e6), lin('mebibyte','mebibyte (MiB)',1024**2), lin('gigabyte','gigabyte (GB)',1e9) ] };
    const Frequency = { units:[ lin('hertz','hertz (Hz)',1), lin('kilohertz','kilohertz (kHz)',1e3), lin('megahertz','megahertz (MHz)',1e6) ] };
    const Fuel = { units:[ special('l_per_100km','litre per 100 kilometre (L/100km)', v=>v, v=>v), special('km_per_l','kilometre per litre (km/L)', v=>100/v, v=>100/v), special('mpg_us','miles per gallon (US mpg)', v=>235.214583/v, v=>235.214583/v) ] };
    const Density = { units:[ lin('kg_per_m3','kilogram per cubic metre (kg/m³)',1), lin('g_per_cm3','gram per cubic centimetre (g/cm³)',1000) ] };
    return { 'Length':Length, 'Mass':Mass, 'Temperature':Temperature, 'Area':Area, 'Volume':Volume, 'Speed':Speed, 'Time':Time, 'Angle':Angle, 'Energy':Energy, 'Power':Power, 'Pressure':Pressure, 'Data':Data, 'Frequency':Frequency, 'Fuel Economy':Fuel, 'Density':Density };
  }

})();
