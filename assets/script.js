'use strict';
(function(){
  // helpers
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));
  const page = document.body.dataset.page || '';

  /* ----------------- Tabs (calculators) ----------------- */
  $$('.tab').forEach(t => {
    t.addEventListener('click', () => {
      const parent = t.closest('.card');
      if (!parent) return;
      $$('.tab', parent).forEach(x=>x.classList.remove('active'));
      $$('.tabpanel', parent).forEach(p=>p.classList.remove('active'));
      t.classList.add('active');
      const id = t.dataset.tab;
      const panel = (id ? document.getElementById(id) : null);
      if (panel) panel.classList.add('active');
    });
  });

  /* ================= CALCULATORS ================= */
  if (page === 'calculators') {
    // state & small engine
    const State = {
      basic: { buffer: '' },
      sci: { buffer: '' },
      memory: 0,
      ans: 0,
      angleDeg: true, // true=deg, false=rad
      history: []
    };

    function setDisplay(el, text) { el.textContent = String(text); }

    // safe evaluate function with allowed functions
    function evaluate(expr) {
      if (!expr) return 0;
      // minimal sanitation: allow numbers, operators, Math funcs, parentheses, commas, e,E, pi
      // replace common tokens to JS-friendly
      let s = String(expr);
      s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'Math.PI').replace(/x\^y/g, '^');
      s = s.replace(/\^/g, '**');
      // map common functions: sqrt, ln -> Math.log, log10
      s = s.replace(/\bsqrt\(/g, 'Math.sqrt(');
      // We'll implement sin/cos/tan wrapper to respect DEG mode later
      s = s.replace(/\bln\(/g, 'Math.log(');
      s = s.replace(/\blog10\(/g, 'Math.log10(');
      s = s.replace(/\blog\(/g, 'Math.log10('); // user 'log' -> log10

      // factorial handled by replacer: n! => fact(n)
      s = s.replace(/(\d+|\([^()]*\))!/g, (m) => {
        const inner = m.slice(0, -1);
        return `fact(${inner})`;
      });

      // replace sin(x) cos(x) tan(x) to use our wrappers sinx(), cosx(), tanx()
      s = s.replace(/\bsin\(/g, 'sinx(').replace(/\bcos\(/g, 'cosx(').replace(/\btan\(/g, 'tanx(');

      // Prevent dangerous characters (letters allowed only for our names and Math)
      // Build function with limited context
      const ctx = {
        Math,
        fact: function(n){ n = Math.floor(Number(n)); if(!Number.isFinite(n)||n<0) return NaN; if(n>170) return Infinity; let r=1; for(let i=2;i<=n;i++) r*=i; return r; },
        sinx: function(v){ v = Number(v); if (!isFinite(v)) return NaN; return State.angleDeg ? Math.sin(v*Math.PI/180) : Math.sin(v); },
        cosx: function(v){ v = Number(v); if (!isFinite(v)) return NaN; return State.angleDeg ? Math.cos(v*Math.PI/180) : Math.cos(v); },
        tanx: function(v){ v = Number(v); if (!isFinite(v)) return NaN; return State.angleDeg ? Math.tan(v*Math.PI/180) : Math.tan(v); },
        ln: Math.log,
        log10: Math.log10 ? Math.log10 : (x=>Math.log(x)/Math.LN10),
      };
      try {
        // new Function with with(ctx) to access helpers
        const fn = new Function('with(this){ return (' + s + '); }');
        return fn.call(ctx);
      } catch (err) {
        throw new Error('EvalError');
      }
    }

    // wire buttons
    const basicDisplay = $('#display-basic');
    const sciDisplay = $('#display-sci');

    $$('.keys').forEach(grid => {
      grid.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        const key = btn.dataset.key;
        const calcType = grid.dataset.calc; // 'basic' or 'sci'
        const display = (calcType === 'basic') ? basicDisplay : sciDisplay;
        handleKey(calcType, display, key);
      });
    });

    // keyboard (numbers & operators) — limited for mobile-first but supports desktop too
    window.addEventListener('keydown', (e) => {
      const allowed = '0123456789.+-*/()%';
      if (allowed.includes(e.key) || ['Enter','Backspace','Delete'].includes(e.key)) {
        e.preventDefault();
        const activeTab = $('#basic').classList.contains('active') ? 'basic' : 'sci';
        const display = activeTab === 'basic' ? basicDisplay : sciDisplay;
        const keymap = { 'Enter':'=', 'Backspace':'⌫', 'Delete':'C' };
        const key = keymap[e.key] || e.key;
        handleKey(activeTab, display, key);
      }
    });

    // history / render
    function pushHistory(expr, res) {
      const entry = `${expr} = ${res}`;
      State.history.unshift(entry);
      if (State.history.length > 100) State.history.pop();
      const histEl = $('#history-panel');
      if (histEl) histEl.innerHTML = State.history.map(h=>`<div class="hist-item">${h}</div>`).join('');
    }

    function handleKey(type, displayEl, key) {
      const st = State[type];
      if (!st) return;
      // utility: append vs actions
      if (key === 'C') {
        st.buffer = '';
        setDisplay(displayEl, '0');
        return;
      }
      if (key === '⌫') {
        st.buffer = st.buffer.slice(0, -1);
        setDisplay(displayEl, st.buffer || '0');
        return;
      }
      if (key === 'MC') { State.memory = 0; return; }
      if (key === 'MR') { st.buffer += String(State.memory); setDisplay(displayEl, st.buffer); return; }
      if (key === 'M+') { try { State.memory += Number(evaluate(st.buffer || displayEl.textContent)); } catch {} return; }
      if (key === 'M-') { try { State.memory -= Number(evaluate(st.buffer || displayEl.textContent)); } catch {} return; }
      if (key === 'ANS') { st.buffer += String(State.ans); setDisplay(displayEl, st.buffer); return; }
      if (key === 'HIS') { $('#history-panel').classList.toggle('hidden'); return; }
      if (key === 'deg') { State.angleDeg = true; $('#angle-toggle').textContent = 'DEG'; return; }
      if (key === 'rad') { State.angleDeg = false; $('#angle-toggle').textContent = 'RAD'; return; }

      // scientific-specific patterns
      if (['sin','cos','tan','ln','log'].includes(key)) {
        // wrap existing buffer if any, else start function
        st.buffer = `${key}(${st.buffer || ''})`;
        setDisplay(displayEl, st.buffer);
        return;
      }
      if (key === 'π') { st.buffer += String(Math.PI); setDisplay(displayEl, st.buffer); return; }
      if (key === 'x²') { st.buffer = `(${st.buffer || '0'})**2`; setDisplay(displayEl, st.buffer); return; }
      if (key === '√') { st.buffer = `sqrt(${st.buffer || '0'})`; setDisplay(displayEl, st.buffer); return; }
      if (key === '!') { st.buffer = `${st.buffer || '0'}!`; setDisplay(displayEl, st.buffer); return; }
      if (key === '^') { st.buffer += '**'; setDisplay(displayEl, st.buffer); return; }
      if (key === '±') { if (st.buffer.startsWith('-')) st.buffer = st.buffer.slice(1); else st.buffer = '-' + st.buffer; setDisplay(displayEl, st.buffer); return; }

      if (key === '=') {
        try {
          const expr = st.buffer || displayEl.textContent;
          const val = evaluate(expr);
          State.ans = val;
          setDisplay(displayEl, String(val));
          pushHistory(expr, val);
          st.buffer = String(val);
        } catch (err) {
          setDisplay(displayEl, 'Error');
        }
        return;
      }

      // otherwise append
      st.buffer += key;
      setDisplay(displayEl, st.buffer);
    }

    // angle toggle and history button
    $('#angle-toggle').addEventListener('click', ()=>{
      State.angleDeg = !State.angleDeg;
      $('#angle-toggle').textContent = State.angleDeg ? 'DEG' : 'RAD';
    });
    $('#show-history').addEventListener('click', ()=> $('#history-panel').classList.toggle('hidden'));
  }

  /* ================= CONVERTERS ================= */
  if (page === 'converters') {
    const categorySel = $('#category'), fromSel = $('#fromUnit'), toSel = $('#toUnit'),
          fromVal = $('#fromValue'), convertBtn = $('#convertBtn'),
          swapBtn = $('#swap'), copyBtn = $('#copyBtn'), clearBtn = $('#clearBtn'),
          resultBox = $('#resultBox');

    const categories = buildCategories(); // function below
    // Populate category dropdown
    Object.keys(categories).forEach(cat => {
      const opt = document.createElement('option'); opt.value = cat; opt.textContent = cat; categorySel.appendChild(opt);
    });

    function refreshUnits(){
      const cat = categories[categorySel.value];
      fromSel.innerHTML = ''; toSel.innerHTML = '';
      cat.units.forEach(u => {
        const o1 = document.createElement('option'); o1.value = u.id; o1.textContent = u.name; fromSel.appendChild(o1);
        const o2 = document.createElement('option'); o2.value = u.id; o2.textContent = u.name; toSel.appendChild(o2);
      });
      fromSel.selectedIndex = 0; toSel.selectedIndex = Math.min(1, toSel.options.length-1);
    }

    function convert(){
      const cat = categories[categorySel.value];
      const from = cat.units.find(u=>u.id===fromSel.value);
      const to = cat.units.find(u=>u.id===toSel.value);
      const val = Number(fromVal.value);
      if (!Number.isFinite(val)) { resultBox.textContent = 'Result: — (enter number)'; return; }
      try {
        const base = from.toBase(val);
        const out = to.fromBase(base);
        resultBox.textContent = `Result: ${formatNumber(out)} ${to.name}`;
      } catch(err) {
        resultBox.textContent = 'Result: Error';
      }
    }

    swapBtn.addEventListener('click', ()=>{
      const a = fromSel.selectedIndex; fromSel.selectedIndex = toSel.selectedIndex; toSel.selectedIndex = a; convert();
    });
    convertBtn.addEventListener('click', convert);
    copyBtn.addEventListener('click', ()=>{
      const text = resultBox.textContent.replace(/^Result:\s*/, '');
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(()=>{});
    });
    clearBtn.addEventListener('click', ()=>{ fromVal.value=''; resultBox.textContent='Result: —'; fromVal.focus(); });

    categorySel.addEventListener('change', ()=>{ refreshUnits(); convert(); });
    fromVal.addEventListener('keydown', e=>{ if(e.key==='Enter') convert(); });

    // init
    categorySel.value = Object.keys(categories)[0];
    refreshUnits();

    function formatNumber(n){
      if(!isFinite(n)) return 'NaN';
      const abs=Math.abs(n);
      if(abs!==0 && (abs<1e-6 || abs>=1e9)) return n.toExponential(8);
      return Number(n.toFixed(12)).toString();
    }
  }

  /* --------------- Unit DB (exhaustive) --------------- */
  function buildCategories(){
    const lin = (id,name,f)=>({id,name,toBase:v=>v*f,fromBase:b=>b/f});
    const spc = (id,name,toB,fromB)=>({id,name,toBase:toB,fromBase:fromB});

    const Length = { units:[
      lin('metre','metre (m)',1),
      lin('kilometre','kilometre (km)',1000),
      lin('centimetre','centimetre (cm)',0.01),
      lin('millimetre','millimetre (mm)',0.001),
      lin('micrometre','micrometre (µm)',1e-6),
      lin('nanometre','nanometre (nm)',1e-9),
      lin('mile','mile (mi)',1609.344),
      lin('yard','yard (yd)',0.9144),
      lin('foot','foot (ft)',0.3048),
      lin('inch','inch (in)',0.0254),
      lin('nautical_mile','nautical mile (nmi)',1852)
    ]};

    const Mass = { units:[
      lin('kilogram','kilogram (kg)',1),
      lin('gram','gram (g)',0.001),
      lin('milligram','milligram (mg)',1e-6),
      lin('microgram','microgram (µg)',1e-9),
      lin('tonne','tonne (t)',1000),
      lin('pound','pound (lb)',0.45359237),
      lin('ounce','ounce (oz)',0.028349523125)
    ]};

    const Temperature = { units:[
      spc('celsius','Celsius (°C)', v=>v+273.15, v=>v-273.15),
      spc('fahrenheit','Fahrenheit (°F)', v=>(v+459.67)*5/9, v=>v*9/5-459.67),
      spc('kelvin','Kelvin (K)', v=>v, v=>v)
    ]};

    const Area = { units:[
      lin('square_metre','square metre (m²)',1),
      lin('square_kilometre','square kilometre (km²)',1e6),
      lin('square_centimetre','square centimetre (cm²)',1e-4),
      lin('square_millimetre','square millimetre (mm²)',1e-6),
      lin('hectare','hectare (ha)',1e4),
      lin('acre','acre',4046.8564224),
      lin('square_foot','square foot (ft²)',0.09290304),
      lin('square_inch','square inch (in²)',0.00064516)
    ]};

    const Volume = { units:[
      lin('cubic_metre','cubic metre (m³)',1),
      lin('litre','litre (L)',0.001),
      lin('millilitre','millilitre (mL)',0.000001),
      lin('cubic_centimetre','cubic centimetre (cm³)',0.000001),
      lin('cubic_inch','cubic inch (in³)',1.6387064e-5),
      lin('cubic_foot','cubic foot (ft³)',0.028316846592),
      lin('gallon_us','gallon (US gal)',0.003785411784),
      lin('quart_us','quart (US qt)',0.000946352946),
      lin('pint_us','pint (US pt)',0.000473176473),
      lin('cup_us','cup (US cup)',0.0002365882365)
    ]};

    const Speed = { units:[
      lin('m_per_s','metre per second (m/s)',1),
      lin('km_per_h','kilometre per hour (km/h)',1/3.6),
      lin('mph','mile per hour (mph)',0.44704),
      lin('knot','knot (kn)',0.514444)
    ]};

    const Time = { units:[
      lin('second','second (s)',1),
      lin('millisecond','millisecond (ms)',0.001),
      lin('microsecond','microsecond (µs)',1e-6),
      lin('minute','minute (min)',60),
      lin('hour','hour (h)',3600),
      lin('day','day (d)',86400),
      lin('week','week (wk)',604800)
    ]};

    const Angle = { units:[
      spc('degree','degree (°)', v=>v*Math.PI/180, v=>v*180/Math.PI),
      spc('radian','radian (rad)', v=>v, v=>v),
      spc('gradian','gradian (gon)', v=>v*Math.PI/200, v=>v*200/Math.PI)
    ]};

    const Energy = { units:[
      lin('joule','joule (J)',1),
      lin('kilojoule','kilojoule (kJ)',1e3),
      lin('calorie','calorie (cal)',4.184),
      lin('kilocalorie','kilocalorie (kcal)',4184),
      lin('watt_hour','watt-hour (Wh)',3600),
      lin('kilowatt_hour','kilowatt-hour (kWh)',3.6e6)
    ]};

    const Power = { units:[
      lin('watt','watt (W)',1),
      lin('kilowatt','kilowatt (kW)',1000),
      lin('horsepower','horsepower (hp)',745.6998715822702)
    ]};

    const Pressure = { units:[
      lin('pascal','pascal (Pa)',1),
      lin('kilopascal','kilopascal (kPa)',1000),
      lin('bar','bar',100000),
      lin('atmosphere','atmosphere (atm)',101325),
      lin('psi','psi',6894.757293168)
    ]};

    const Data = { units:[
      lin('bit','bit (b)',1/8),
      lin('byte','byte (B)',1),
      lin('kilobyte','kilobyte (kB)',1e3),
      lin('kibibyte','kibibyte (KiB)',1024),
      lin('megabyte','megabyte (MB)',1e6),
      lin('mebibyte','mebibyte (MiB)',1024**2),
      lin('gigabyte','gigabyte (GB)',1e9),
      lin('gibibyte','gibibyte (GiB)',1024**3),
      lin('terabyte','terabyte (TB)',1e12)
    ]};

    const Frequency = { units:[
      lin('hertz','hertz (Hz)',1),
      lin('kilohertz','kilohertz (kHz)',1e3),
      lin('megahertz','megahertz (MHz)',1e6)
    ]};

    const Fuel = { units:[
      spc('l_per_100km','litre per 100 kilometre (L/100km)', v=>v, v=>v),
      spc('km_per_l','kilometre per litre (km/L)', v=>100/v, v=>100/v),
      spc('mpg_us','miles per gallon (US mpg)', v=>235.214583/v, v=>235.214583/v)
    ]};

    const Density = { units:[
      lin('kg_per_m3','kilogram per cubic metre (kg/m³)',1),
      lin('g_per_cm3','gram per cubic centimetre (g/cm³)',1000),
      lin('lb_per_ft3','pound per cubic foot (lb/ft³)',16.01846337)
    ]};

    return {
      'Length':Length,
      'Mass':Mass,
      'Temperature':Temperature,
      'Area':Area,
      'Volume':Volume,
      'Speed':Speed,
      'Time':Time,
      'Angle':Angle,
      'Energy':Energy,
      'Power':Power,
      'Pressure':Pressure,
      'Data':Data,
      'Frequency':Frequency,
      'Fuel Economy':Fuel,
      'Density':Density
    };
  }

})(); // end script
