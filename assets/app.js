'use strict';
(function(){
  // small helpers
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page;

  // set year if present
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  /***************************************************************************
   * Calculator engine
   * - supports basic ops, parentheses, ^ (or **) for power
   * - supports functions: sin, cos, tan, ln, log (base10), sqrt, factorial (!)
   * - memory keys: MC, MR, M+, M-
   * - ANS stores last result
   ***************************************************************************/
  const Calc = (()=>{
    let memory = 0, lastAns = 0, history = [], angleMode = 'deg'; // deg or rad

    function fact(n){
      n = Math.floor(Number(n));
      if(!Number.isFinite(n) || n<0) return NaN;
      if(n>170) return Infinity;
      let r = 1;
      for(let i=2;i<=n;i++) r *= i;
      return r;
    }

    function sanitizeExpression(expr){
      // allow digits, operators, parentheses, ., e, letters for function names
      // replace ^ with **
      expr = String(expr).replace(/\^/g, '**');
      // replace unicode π with Math.PI
      expr = expr.replace(/π/g, 'Math.PI');
      // wrap factorial n! => fact(n) — careful for )!
      expr = expr.replace(/(\d+|\))!/g, function(m){
        const base = m.slice(0,-1);
        return `fact(${base})`;
      });
      // replace sqrt( -> Math.sqrt(
      expr = expr.replace(/\bsqrt\(/g, 'Math.sqrt(');
      // replace ln( -> Math.log(  (natural log)
      expr = expr.replace(/\bln\(/g, 'Math.log(');
      // replace log( -> Math.log10( if available else Math.log/Math.LN10
      expr = expr.replace(/\blog\(/g, 'Math.log10 ? Math.log10(' : 'Math.log(');
      // replace sin(...), cos(...), tan(...) to include angle mode conversion if deg
      if(angleMode === 'deg'){
        expr = expr.replace(/Math\.sin\(([^)]+)\)/g, 'Math.sin( ($1) * Math.PI/180 )');
        expr = expr.replace(/Math\.cos\(([^)]+)\)/g, 'Math.cos( ($1) * Math.PI/180 )');
        expr = expr.replace(/Math\.tan\(([^)]+)\)/g, 'Math.tan( ($1) * Math.PI/180 )');
        // also support sin( directly (user typed sin(...)
        expr = expr.replace(/\bsin\(/g, 'Math.sin(');
        expr = expr.replace(/\bcos\(/g, 'Math.cos(');
        expr = expr.replace(/\btan\(/g, 'Math.tan(');
        // then wrap these
        expr = expr.replace(/Math\.sin\(([^)]+)\)/g, 'Math.sin( ($1) * Math.PI/180 )');
        expr = expr.replace(/Math\.cos\(([^)]+)\)/g, 'Math.cos( ($1) * Math.PI/180 )');
        expr = expr.replace(/Math\.tan\(([^)]+)\)/g, 'Math.tan( ($1) * Math.PI/180 )');
      } else {
        expr = expr.replace(/\bsin\(/g, 'Math.sin(');
        expr = expr.replace(/\bcos\(/g, 'Math.cos(');
        expr = expr.replace(/\btan\(/g, 'Math.tan(');
      }
      // ensure only allowed characters remain: digits, operators, letters, Math, ., parentheses, commas, e and whitespace
      // We won't remove letters (function names) because we rely on Math.* and fact
      return expr;
    }

    function evaluate(expr){
      if(expr === undefined || expr === null || expr === '') return 0;
      const sanitized = sanitizeExpression(expr);
      // Build a function with limited context
      const ctx = {
        fact: fact,
        Math: Math,
      };
      try{
        const fn = new Function('with(this){ return ('+sanitized+'); }');
        const res = fn.call(ctx);
        if(typeof res === 'number' && !Number.isFinite(res)) return res;
        return Number(res);
      }catch(e){
        throw new Error('EvalError');
      }
    }

    function press(displayEl, key){
      if(!displayEl) return;
      let buf = displayEl.dataset.buffer || '';

      // memory keys
      if(key === 'MC'){ memory = 0; return; }
      if(key === 'MR'){ buf += String(memory); displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === 'M+'){ memory += Number( safeTryEval(buf) || 0 ); return; }
      if(key === 'M-'){ memory -= Number( safeTryEval(buf) || 0 ); return; }

      if(key === 'C'){ buf=''; displayEl.textContent = '0'; displayEl.dataset.buffer=''; return; }
      if(key === '⌫'){ buf = buf.slice(0,-1); displayEl.dataset.buffer = buf; displayEl.textContent = buf || '0'; return; }
      if(key === '±'){ if(buf.startsWith('-')) buf = buf.slice(1); else buf = '-'+buf; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === 'π'){ buf += 'π'; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === 'x²'){ buf = `(${buf})^2`; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === '√'){ buf = `sqrt(${buf})`; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === '!'){ buf = buf + '!'; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === '^'){ buf = buf + '^'; displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === 'ANS'){ buf += String(lastAns); displayEl.dataset.buffer = buf; displayEl.textContent = buf; return; }
      if(key === '='){
        try{
          const v = evaluate(buf);
          lastAns = v;
          history.unshift(buf + ' = ' + String(v));
          if(history.length > 200) history.pop();
          displayEl.textContent = String(v);
          displayEl.dataset.buffer = String(v);
        }catch(e){
          displayEl.textContent = 'Error';
        }
        return;
      }

      // append key (numbers, operators, parentheses, letters)
      buf += key;
      displayEl.dataset.buffer = buf;
      displayEl.textContent = buf;
    }

    function safeTryEval(expr){
      try{ return evaluate(expr); }catch(e){ return NaN; }
    }

    return { press, getHistory: ()=>history, setAngleMode: m => angleMode = m };
  })();

  // Hook up calculator buttons (if present)
  if(page === 'normal' || page === 'scientific' || page === 'calculators'){
    const basicDisplay = document.getElementById('basic-display');
    const sciDisplay = document.getElementById('sci-display');

    document.querySelectorAll('.keys').forEach(grid=>{
      grid.addEventListener('click', e=>{
        const btn = e.target.closest('button');
        if(!btn) return;
        const key = btn.dataset.key;
        const display = grid.classList.contains('basic-grid') ? basicDisplay : sciDisplay;
        Calc.press(display, key);
      });
    });

    // keyboard: basic support
    window.addEventListener('keydown', e=>{
      const map = {'Enter':'=','Backspace':'⌫','Delete':'C'};
      if(map[e.key]){
        const activeDisplay = page==='scientific' ? sciDisplay : basicDisplay;
        Calc.press(activeDisplay, map[e.key]);
        e.preventDefault();
        return;
      }
      if(/^[0-9+\-*/().]$/.test(e.key)){
        const activeDisplay = page==='scientific' ? sciDisplay : basicDisplay;
        Calc.press(activeDisplay, e.key);
      }
    });

    // History toggle (scientific page)
    const hisBtn = document.querySelector('[data-key="HIS"]');
    if(hisBtn){
      hisBtn.addEventListener('click', ()=>{
        const box = document.getElementById('sci-history');
        if(!box) return;
        box.hidden = !box.hidden;
        const list = document.getElementById('hist-list');
        list.innerHTML = Calc.getHistory().map(i=>`<li>${i}</li>`).join('');
      });
    }
  }

  /***************************************************************************
   * Converter engine
   ***************************************************************************/
  if(page === 'converters'){
    const categorySel = document.getElementById('category');
    const fromSel = document.getElementById('fromUnit');
    const toSel = document.getElementById('toUnit');
    const fromVal = document.getElementById('fromValue');
    const toVal = document.getElementById('toValue');

    const categories = buildCategories();

    // populate categories dropdown
    Object.keys(categories).forEach(cat=>{
      const o = document.createElement('option'); o.value = cat; o.textContent = cat; categorySel.appendChild(o);
    });

    function refreshUnits(){
      const cat = categories[categorySel.value];
      fromSel.innerHTML = ''; toSel.innerHTML = '';
      cat.units.forEach(u=>{
        const o1 = document.createElement('option'); o1.value = u.id; o1.textContent = u.name; fromSel.appendChild(o1);
        const o2 = document.createElement('option'); o2.value = u.id; o2.textContent = u.name; toSel.appendChild(o2);
      });
      fromSel.selectedIndex = 0; toSel.selectedIndex = 1;
    }

    function convert(){
      const cat = categories[categorySel.value];
      const from = cat.units.find(u=>u.id === fromSel.value);
      const to = cat.units.find(u=>u.id === toSel.value);
      const val = Number(fromVal.value);
      if(!Number.isFinite(val)){ toVal.value = ''; return; }
      const base = from.toBase(val);
      const out = to.fromBase(base);
      toVal.value = formatNumber(out);
    }

    document.getElementById('swap').addEventListener('click', ()=>{
      const a = fromSel.selectedIndex; fromSel.selectedIndex = toSel.selectedIndex; toSel.selectedIndex = a; convert();
    });
    document.getElementById('convertBtn').addEventListener('click', convert);
    document.getElementById('copyBtn').addEventListener('click', ()=>{ toVal.select(); document.execCommand('copy'); });
    document.getElementById('clearBtn').addEventListener('click', ()=>{ fromVal.value=''; toVal.value=''; fromVal.focus(); });
    fromVal.addEventListener('keydown', e=>{ if(e.key === 'Enter') convert(); });

    categorySel.addEventListener('change', ()=>{ refreshUnits(); convert(); });

    // init
    refreshUnits();

    function formatNumber(n){
      if(!isFinite(n)) return 'NaN';
      const abs = Math.abs(n);
      if(abs !== 0 && (abs < 1e-6 || abs >= 1e9)) return n.toExponential(8);
      return Number(n.toFixed(12)).toString();
    }
  }

  /***************************************************************************
   * Unit database builder: returns object with many categories. Each unit:
   * { id, name, toBase(v) -> convert to base SI, fromBase(base) -> convert back }
   *
   * Base units:
   * - Length: metre (m)
   * - Mass: kilogram (kg)
   * - Temperature: Kelvin (K) base (special)
   * - Area: square metre (m²)
   * - Volume: cubic metre (m³)
   * - Speed: metre per second (m/s)
   * - Time: second (s)
   * - Angle: radian (rad) base (special)
   * - Energy: joule (J)
   * - Power: watt (W)
   * - Pressure: pascal (Pa)
   * - Data: byte (B) base
   * - Frequency: hertz (Hz)
   * - Fuel economy: L/100km base (special)
   * - Density: kg/m³ base
   ***************************************************************************/
  function buildCategories(){
    const linear = (id,name,factor)=>({ id, name, toBase: v => v * factor, fromBase: b => b / factor });
    const special = (id,name,toBase,fromBase)=>({ id, name, toBase, fromBase });

    // LENGTH (metre base)
    const Length = {
      units: [
        linear('metre','metre (m)',1),
        linear('kilometre','kilometre (km)',1000),
        linear('centimetre','centimetre (cm)',0.01),
        linear('millimetre','millimetre (mm)',0.001),
        linear('micrometre','micrometre (µm)',1e-6),
        linear('nanometre','nanometre (nm)',1e-9),
        linear('mile','mile (mi)',1609.344),
        linear('yard','yard (yd)',0.9144),
        linear('foot','foot (ft)',0.3048),
        linear('inch','inch (in)',0.0254),
        linear('nautical_mile','nautical mile (nmi)',1852)
      ]
    };

    // MASS (kilogram base)
    const Mass = {
      units: [
        linear('kilogram','kilogram (kg)',1),
        linear('gram','gram (g)',0.001),
        linear('milligram','milligram (mg)',1e-6),
        linear('microgram','microgram (µg)',1e-9),
        linear('tonne','tonne (t)',1000),
        linear('pound','pound (lb)',0.45359237),
        linear('ounce','ounce (oz)',0.028349523125)
      ]
    };

    // TEMPERATURE (Kelvin base) — special conversions
    const Temperature = {
      units: [
        special('celsius','Celsius (°C)', v => v + 273.15, v => v - 273.15),
        special('fahrenheit','Fahrenheit (°F)', v => (v + 459.67) * 5/9, v => v * 9/5 - 459.67),
        special('kelvin','Kelvin (K)', v => v, v => v)
      ]
    };

    // AREA (square metre base)
    const Area = {
      units: [
        linear('square_metre','square metre (m²)',1),
        linear('square_kilometre','square kilometre (km²)',1e6),
        linear('square_centimetre','square centimetre (cm²)',0.0001),
        linear('square_millimetre','square millimetre (mm²)',1e-6),
        linear('hectare','hectare (ha)',1e4),
        linear('acre','acre',4046.8564224),
        linear('square_foot','square foot (ft²)',0.09290304),
        linear('square_inch','square inch (in²)',0.00064516)
      ]
    };

    // VOLUME (cubic metre base)
    const Volume = {
      units: [
        linear('cubic_metre','cubic metre (m³)',1),
        linear('litre','litre (L)',0.001),
        linear('millilitre','millilitre (mL)',0.000001),
        linear('cubic_centimetre','cubic centimetre (cm³)',0.000001),
        linear('cubic_inch','cubic inch (in³)',1.6387064e-5),
        linear('cubic_foot','cubic foot (ft³)',0.028316846592),
        linear('gallon_us','gallon (US gal)',0.003785411784),
        linear('quart_us','quart (US qt)',0.000946352946),
        linear('pint_us','pint (US pt)',0.000473176473),
        linear('cup_us','cup (US cup)',0.0002365882365),
        linear('tablespoon','tablespoon (tbsp)',1.478676e-5),
        linear('teaspoon','teaspoon (tsp)',4.928922e-6)
      ]
    };

    // SPEED (m/s base)
    const Speed = {
      units: [
        linear('m_per_s','metre per second (m/s)',1),
        linear('km_per_h','kilometre per hour (km/h)',1/3.6),
        linear('mph','mile per hour (mph)',0.44704),
        linear('knot','knot (kn)',0.514444)
      ]
    };

    // TIME (second base)
    const Time = {
      units: [
        linear('second','second (s)',1),
        linear('millisecond','millisecond (ms)',0.001),
        linear('microsecond','microsecond (µs)',1e-6),
        linear('minute','minute (min)',60),
        linear('hour','hour (h)',3600),
        linear('day','day (d)',86400),
        linear('week','week (wk)',604800)
      ]
    };

    // ANGLE (radian base) - special (degree->rad)
    const Angle = {
      units: [
        special('degree','degree (°)', v => v * Math.PI/180, v => v * 180/Math.PI),
        special('radian','radian (rad)', v => v, v => v),
        special('gradian','gradian (gon)', v => v * Math.PI/200, v => v * 200/Math.PI)
      ]
    };

    // ENERGY (joule base)
    const Energy = {
      units: [
        linear('joule','joule (J)',1),
        linear('kilojoule','kilojoule (kJ)',1000),
        linear('calorie','calorie (cal)',4.184),
        linear('kilocalorie','kilocalorie (kcal)',4184),
        linear('watt_hour','watt-hour (Wh)',3600),
        linear('kilowatt_hour','kilowatt-hour (kWh)',3.6e6)
      ]
    };

    // POWER (watt base)
    const Power = {
      units: [
        linear('watt','watt (W)',1),
        linear('kilowatt','kilowatt (kW)',1000),
        linear('horsepower','horsepower (hp)',745.6998715822702)
      ]
    };

    // PRESSURE (pascal base)
    const Pressure = {
      units: [
        linear('pascal','pascal (Pa)',1),
        linear('kilopascal','kilopascal (kPa)',1000),
        linear('bar','bar',100000),
        linear('atmosphere','atmosphere (atm)',101325),
        linear('psi','psi',6894.757293168)
      ]
    };

    // DATA (byte base) — note: bit defined as 1/8 byte
    const Data = {
      units: [
        linear('bit','bit (b)',1/8),
        linear('byte','byte (B)',1),
        linear('kilobyte','kilobyte (kB)',1e3),
        linear('kibibyte','kibibyte (KiB)',1024),
        linear('megabyte','megabyte (MB)',1e6),
        linear('mebibyte','mebibyte (MiB)',1024**2),
        linear('gigabyte','gigabyte (GB)',1e9),
        linear('gibibyte','gibibyte (GiB)',1024**3),
        linear('terabyte','terabyte (TB)',1e12),
        linear('tebibyte','tebibyte (TiB)',1024**4)
      ]
    };

    // FREQUENCY (Hz base)
    const Frequency = {
      units: [
        linear('hertz','hertz (Hz)',1),
        linear('kilohertz','kilohertz (kHz)',1e3),
        linear('megahertz','megahertz (MHz)',1e6),
        linear('gigahertz','gigahertz (GHz)',1e9)
      ]
    };

    // FUEL ECONOMY (special conversions)
    // Base: L per 100 km
    const Fuel = {
      units: [
        special('l_per_100km','litre per 100 kilometre (L/100km)',
          v => v,
          v => v),
        special('km_per_l','kilometre per litre (km/L)',
          v => 100 / v,
          v => 100 / v),
        special('mpg_us','miles per gallon (US mpg)',
          v => 235.214583 / v,
          v => 235.214583 / v)
      ]
    };

    // DENSITY (kg/m^3 base)
    const Density = {
      units: [
        linear('kg_per_m3','kilogram per cubic metre (kg/m³)',1),
        linear('g_per_cm3','gram per cubic centimetre (g/cm³)',1000),
        linear('g_per_ml','gram per millilitre (g/mL)',1000),
        linear('lb_per_ft3','pound per cubic foot (lb/ft³)',16.01846337)
      ]
    };

    return {
      'Length': Length,
      'Mass': Mass,
      'Temperature': Temperature,
      'Area': Area,
      'Volume': Volume,
      'Speed': Speed,
      'Time': Time,
      'Angle': Angle,
      'Energy': Energy,
      'Power': Power,
      'Pressure': Pressure,
      'Data': Data,
      'Frequency': Frequency,
      'Fuel Economy': Fuel,
      'Density': Density
    };
  }

})();
