'use strict';
(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from((r||document).querySelectorAll(s));
  const page = document.body.dataset.page || '';

  /* -------------------- CALCULATOR -------------------- */
  if(page === 'calculator'){
    const display = $('#calc-display');
    const keys = $('#calc-keys');
    let buffer = '';
    let memory = 0;
    let lastAns = 0;

    function setDisplay(txt){ display.textContent = String(txt); }

    keys.addEventListener('click', e=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const key = btn.dataset.key;
      handleKey(key);
    });

    window.addEventListener('keydown', e=>{
      const kmap = {'Enter':'=','Backspace':'DEL','Delete':'AC'};
      const key = kmap[e.key] || e.key;
      // map '*' and '/' etc are fine
      const allowed = '0123456789.+-*/()%()=';
      if(key.length === 1 && !allowed.includes(key)) {
        // ignore other keys
      } else {
        handleKey(key);
      }
    });

    function safeEval(expr){
      // Only allow digits, operators, parentheses, decimals, exponent notation, whitespace
      // Replace unicode minus etc
      if(!expr) return 0;
      const cleaned = String(expr)
        .replace(/×/g,'*')
        .replace(/÷/g,'/')
        .replace(/—/g,'-')
        .replace(/[^0-9+\-*/().,%eE ]/g, function(m){ return m; }); // allow % here temporarily
      // Handle percent: treat "x%" as (x/100)
      // Replace occurrences like "50%" with "(50/100)"
      const pctHandled = cleaned.replace(/(\d+(\.\d+)?|\.\d+)%/g, '($1/100)');
      try{
        // Evaluate with Function safely: no access to window
        const fn = new Function('return ('+pctHandled+');');
        const res = fn();
        if(res === Infinity || res === -Infinity) throw new Error('Infinite');
        return Number(res);
      }catch(e){
        throw e;
      }
    }

    function handleKey(key){
      if(key === 'AC'){ buffer=''; setDisplay(0); return; }
      if(key === 'DEL'){ buffer = buffer.slice(0,-1); setDisplay(buffer || 0); return; }
      if(key === 'MC'){ memory = 0; return; }
      if(key === 'MR'){ buffer += String(memory); setDisplay(buffer); return; }
      if(key === 'M+'){ try{ memory += Number(safeEval(buffer || display.textContent)); }catch{} return; }
      if(key === 'M-'){ try{ memory -= Number(safeEval(buffer || display.textContent)); }catch{} return; }
      if(key === 'ANS'){ buffer += String(lastAns); setDisplay(buffer); return; }

      if(key === '='){
        try{
          const val = safeEval(buffer || display.textContent);
          lastAns = val;
          setDisplay(val);
          buffer = String(val);
        }catch(e){
          setDisplay('Error');
          buffer = '';
        }
        return;
      }

      // append digits/operators
      // limit buffer length to prevent overflow
      if(buffer.length > 200) return;
      buffer += key;
      setDisplay(buffer);
    }

    // initialize
    setDisplay(0);
  }

  /* -------------------- CONVERTER -------------------- */
  if(page === 'converter'){
    const fromUnit = $('#fromUnit');
    const toUnit = $('#toUnit');
    const fromValue = $('#fromValue');
    const convertBtn = $('#convertBtn');
    const swapBtn = $('#swapBtn');
    const copyBtn = $('#copyBtn');
    const resultBox = $('#resultBox');

    // Build exhaustive unit list with category and conversion to base
    // For linear units use factor to base unit (SI)
    // For special units (temperature, fuel economy) provide toBase/fromBase functions

    function lin(id,name,factor){ return {id,name,category:'linear',toBase:(v)=>v*factor,fromBase:(b)=>b/factor,unitGroup:'linear'}; }
    function group(id,name,category,toB,fromB){ return {id,name,category,toBase:toB,fromBase:fromB}; }

    // We'll make categories explicit in each unit's 'kind' property
    const UNITS = [];
    function add(unit){ UNITS.push(unit); }

    // LENGTH (base: metre)
    add({id:'metre', name:'Metre (m)', kind:'Length', toBase:v=>v, fromBase:b=>b});
    add({id:'kilometre', name:'Kilometre (km)', kind:'Length', toBase:v=>v*1000, fromBase:b=>b/1000});
    add({id:'centimetre', name:'Centimetre (cm)', kind:'Length', toBase:v=>v*0.01, fromBase:b=>b/0.01});
    add({id:'millimetre', name:'Millimetre (mm)', kind:'Length', toBase:v=>v*0.001, fromBase:b=>b/0.001});
    add({id:'micrometre', name:'Micrometre (μm)', kind:'Length', toBase:v=>v*1e-6, fromBase:b=>b/1e-6});
    add({id:'nanometre', name:'Nanometre (nm)', kind:'Length', toBase:v=>v*1e-9, fromBase:b=>b/1e-9});
    add({id:'mile', name:'Mile (mi)', kind:'Length', toBase:v=>v*1609.344, fromBase:b=>b/1609.344});
    add({id:'yard', name:'Yard (yd)', kind:'Length', toBase:v=>v*0.9144, fromBase:b=>b/0.9144});
    add({id:'foot', name:'Foot (ft)', kind:'Length', toBase:v=>v*0.3048, fromBase:b=>b/0.3048});
    add({id:'inch', name:'Inch (in)', kind:'Length', toBase:v=>v*0.0254, fromBase:b=>b/0.0254});
    add({id:'nautical_mile', name:'Nautical mile (nmi)', kind:'Length', toBase:v=>v*1852, fromBase:b=>b/1852});
    add({id:'rod', name:'Rod', kind:'Length', toBase:v=>v*5.0292, fromBase:b=>b/5.0292});
    add({id:'chain', name:'Chain', kind:'Length', toBase:v=>v*20.1168, fromBase:b=>b/20.1168});

    // MASS (base: kilogram)
    add({id:'kilogram',name:'Kilogram (kg)',kind:'Mass',toBase:v=>v,fromBase:b=>b});
    add({id:'gram',name:'Gram (g)',kind:'Mass',toBase:v=>v*0.001,fromBase:b=>b/0.001});
    add({id:'milligram',name:'Milligram (mg)',kind:'Mass',toBase:v=>v*1e-6,fromBase:b=>b/1e-6});
    add({id:'microgram',name:'Microgram (µg)',kind:'Mass',toBase:v=>v*1e-9,fromBase:b=>b/1e-9});
    add({id:'tonne',name:'Tonne (t)',kind:'Mass',toBase:v=>v*1000,fromBase:b=>b/1000});
    add({id:'stone',name:'Stone (st)',kind:'Mass',toBase:v=>v*6.35029318,fromBase:b=>b/6.35029318});
    add({id:'pound',name:'Pound (lb)',kind:'Mass',toBase:v=>v*0.45359237,fromBase:b=>b/0.45359237});
    add({id:'ounce',name:'Ounce (oz)',kind:'Mass',toBase:v=>v*0.028349523125,fromBase:b=>b/0.028349523125});

    // TIME (base: second)
    add({id:'second',name:'Second (s)',kind:'Time',toBase:v=>v,fromBase:b=>b});
    add({id:'millisecond',name:'Millisecond (ms)',kind:'Time',toBase:v=>v*0.001,fromBase:b=>b/0.001});
    add({id:'microsecond',name:'Microsecond (µs)',kind:'Time',toBase:v=>v*1e-6,fromBase:b=>b/1e-6});
    add({id:'minute',name:'Minute (min)',kind:'Time',toBase:v=>v*60,fromBase:b=>b/60});
    add({id:'hour',name:'Hour (h)',kind:'Time',toBase:v=>v*3600,fromBase:b=>b/3600});
    add({id:'day',name:'Day (d)',kind:'Time',toBase:v=>v*86400,fromBase:b=>b/86400});
    add({id:'week',name:'Week (wk)',kind:'Time',toBase:v=>v*604800,fromBase:b=>b/604800});
    add({id:'month',name:'Month (avg 30.4375 d)',kind:'Time',toBase:v=>v*2629800,fromBase:b=>b/2629800});
    add({id:'year',name:'Year (yr)',kind:'Time',toBase:v=>v*31557600,fromBase:b=>b/31557600});

    // TEMPERATURE (special)
    add({id:'celsius',name:'Celsius (°C)',kind:'Temperature',
      toBase:v=>v+273.15, fromBase:b=>b-273.15});
    add({id:'fahrenheit',name:'Fahrenheit (°F)',kind:'Temperature',
      toBase:v=>(v+459.67)*5/9, fromBase:b=>b*9/5-459.67});
    add({id:'kelvin',name:'Kelvin (K)',kind:'Temperature',
      toBase:v=>v, fromBase:b=>b});

    // AREA (base: square metre)
    add({id:'square_metre',name:'Square metre (m²)',kind:'Area',toBase:v=>v,fromBase:b=>b});
    add({id:'square_kilometre',name:'Square kilometre (km²)',kind:'Area',toBase:v=>v*1e6,fromBase:b=>b/1e6});
    add({id:'square_centimetre',name:'Square centimetre (cm²)',kind:'Area',toBase:v=>v*0.0001,fromBase:b=>b/0.0001});
    add({id:'hectare',name:'Hectare (ha)',kind:'Area',toBase:v=>v*10000,fromBase:b=>b/10000});
    add({id:'acre',name:'Acre',kind:'Area',toBase:v=>v*4046.8564224,fromBase:b=>b/4046.8564224});
    add({id:'square_mile',name:'Square mile (mi²)',kind:'Area',toBase:v=>v*2589988.110336,fromBase:b=>b/2589988.110336});
    add({id:'square_foot',name:'Square foot (ft²)',kind:'Area',toBase:v=>v*0.09290304,fromBase:b=>b/0.09290304});
    add({id:'square_inch',name:'Square inch (in²)',kind:'Area',toBase:v=>v*0.00064516,fromBase:b=>b/0.00064516});

    // VOLUME (base: cubic metre)
    add({id:'cubic_metre',name:'Cubic metre (m³)',kind:'Volume',toBase:v=>v,fromBase:b=>b});
    add({id:'litre',name:'Litre (L)',kind:'Volume',toBase:v=>v*0.001,fromBase:b=>b/0.001});
    add({id:'millilitre',name:'Millilitre (mL)',kind:'Volume',toBase:v=>v*0.000001,fromBase:b=>b/0.000001});
    add({id:'cubic_centimetre',name:'Cubic centimetre (cm³)',kind:'Volume',toBase:v=>v*0.000001,fromBase:b=>b/0.000001});
    add({id:'cubic_inch',name:'Cubic inch (in³)',kind:'Volume',toBase:v=>v*1.6387064e-5,fromBase:b=>b/1.6387064e-5});
    add({id:'cubic_foot',name:'Cubic foot (ft³)',kind:'Volume',toBase:v=>v*0.028316846592,fromBase:b=>b/0.028316846592});
    add({id:'gallon_us',name:'Gallon (US gal)',kind:'Volume',toBase:v=>v*0.003785411784,fromBase:b=>b/0.003785411784});
    add({id:'quart_us',name:'Quart (US qt)',kind:'Volume',toBase:v=>v*0.000946352946,fromBase:b=>b/0.000946352946});
    add({id:'pint_us',name:'Pint (US pt)',kind:'Volume',toBase:v=>v*0.000473176473,fromBase:b=>b/0.000473176473});
    add({id:'cup_us',name:'Cup (US cup)',kind:'Volume',toBase:v=>v*0.0002365882365,fromBase:b=>b/0.0002365882365});

    // SPEED (base: m/s)
    add({id:'m_per_s',name:'Metre per second (m/s)',kind:'Speed',toBase:v=>v,fromBase:b=>b});
    add({id:'km_per_h',name:'Kilometre per hour (km/h)',kind:'Speed',toBase:v=>v/3.6,fromBase:b=>b*3.6});
    add({id:'mph',name:'Mile per hour (mph)',kind:'Speed',toBase:v=>v*0.44704,fromBase:b=>b/0.44704});
    add({id:'knot',name:'Knot (kt)',kind:'Speed',toBase:v=>v*0.514444,fromBase:b=>b/0.514444});

    // ENERGY (base: joule)
    add({id:'joule',name:'Joule (J)',kind:'Energy',toBase:v=>v,fromBase:b=>b});
    add({id:'kilojoule',name:'Kilojoule (kJ)',kind:'Energy',toBase:v=>v*1000,fromBase:b=>b/1000});
    add({id:'calorie',name:'Calorie (cal)',kind:'Energy',toBase:v=>v*4.184,fromBase:b=>b/4.184});
    add({id:'kilocalorie',name:'Kilocalorie (kcal)',kind:'Energy',toBase:v=>v*4184,fromBase:b=>b/4184});
    add({id:'watt_hour',name:'Watt-hour (Wh)',kind:'Energy',toBase:v=>v*3600,fromBase:b=>b/3600});
    add({id:'kilowatt_hour',name:'Kilowatt-hour (kWh)',kind:'Energy',toBase:v=>v*3.6e6,fromBase:b=>b/3.6e6});

    // POWER (base: watt)
    add({id:'watt',name:'Watt (W)',kind:'Power',toBase:v=>v,fromBase:b=>b});
    add({id:'kilowatt',name:'Kilowatt (kW)',kind:'Power',toBase:v=>v*1000,fromBase:b=>b/1000});
    add({id:'horsepower',name:'Horsepower (hp)',kind:'Power',toBase:v=>v*745.6998715822702,fromBase:b=>b/745.6998715822702});

    // PRESSURE (base: pascal)
    add({id:'pascal',name:'Pascal (Pa)',kind:'Pressure',toBase:v=>v,fromBase:b=>b});
    add({id:'kilopascal',name:'Kilopascal (kPa)',kind:'Pressure',toBase:v=>v*1000,fromBase:b=>b/1000});
    add({id:'bar',name:'Bar',kind:'Pressure',toBase:v=>v*100000,fromBase:b=>b/100000});
    add({id:'atm',name:'Atmosphere (atm)',kind:'Pressure',toBase:v=>v*101325,fromBase:b=>b/101325});
    add({id:'psi',name:'Pound per square inch (psi)',kind:'Pressure',toBase:v=>v*6894.757293168,fromBase:b=>b/6894.757293168});

    // DATA (base: byte)
    add({id:'bit',name:'Bit (b)',kind:'Data',toBase:v=>v/8,fromBase:b=>b*8});
    add({id:'byte',name:'Byte (B)',kind:'Data',toBase:v=>v,fromBase:b=>b});
    add({id:'kilobyte',name:'Kilobyte (kB, 10^3)',kind:'Data',toBase:v=>v*1e3,fromBase:b=>b/1e3});
    add({id:'kibibyte',name:'Kibibyte (KiB, 2^10)',kind:'Data',toBase:v=>v*1024,fromBase:b=>b/1024});
    add({id:'megabyte',name:'Megabyte (MB)',kind:'Data',toBase:v=>v*1e6,fromBase:b=>b/1e6});
    add({id:'mebibyte',name:'Mebibyte (MiB)',kind:'Data',toBase:v=>v*(1024**2),fromBase:b=>b/(1024**2)});
    add({id:'gigabyte',name:'Gigabyte (GB)',kind:'Data',toBase:v=>v*1e9,fromBase:b=>b/1e9});
    add({id:'gibibyte',name:'Gibibyte (GiB)',kind:'Data',toBase:v=>v*(1024**3),fromBase:b=>b/(1024**3)});
    add({id:'terabyte',name:'Terabyte (TB)',kind:'Data',toBase:v=>v*1e12,fromBase:b=>b/1e12});

    // ANGLE (base: radian)
    add({id:'radian',name:'Radian (rad)',kind:'Angle',toBase:v=>v,fromBase:b=>b});
    add({id:'degree',name:'Degree (°)',kind:'Angle',toBase:v=>v*Math.PI/180,fromBase:b=>b*180/Math.PI});
    add({id:'grad',name:'Gradian (gon)',kind:'Angle',toBase:v=>v*Math.PI/200,fromBase:b=>b*200/Math.PI});

    // FREQUENCY (base: hertz)
    add({id:'hertz',name:'Hertz (Hz)',kind:'Frequency',toBase:v=>v,fromBase:b=>b});
    add({id:'kilohertz',name:'Kilohertz (kHz)',kind:'Frequency',toBase:v=>v*1e3,fromBase:b=>b/1e3});
    add({id:'megahertz',name:'Megahertz (MHz)',kind:'Frequency',toBase:v=>v*1e6,fromBase:b=>b/1e6});
    add({id:'gigahertz',name:'Gigahertz (GHz)',kind:'Frequency',toBase:v=>v*1e9,fromBase:b=>b/1e9});

    // DENSITY (base: kg/m3)
    add({id:'kg_per_m3',name:'Kilogram per cubic metre (kg/m³)',kind:'Density',toBase:v=>v,fromBase:b=>b});
    add({id:'g_per_cm3',name:'Gram per cubic centimetre (g/cm³)',kind:'Density',toBase:v=>v*1000,fromBase:b=>b/1000});
    add({id:'lb_per_ft3',name:'Pound per cubic foot (lb/ft³)',kind:'Density',toBase:v=>v*16.01846337,fromBase:b=>b/16.01846337});

    // FUEL ECONOMY (special)
    // We'll represent as base = L/100km for conversions
    add({id:'l_per_100km',name:'Litre per 100 kilometre (L/100km)',kind:'FuelEconomy',
      toBase:v=>v, fromBase:b=>b});
    add({id:'km_per_l',name:'Kilometre per litre (km/L)',kind:'FuelEconomy',
      toBase:v=> (100 / v), fromBase:b=> (100 / b)});
    add({id:'mpg_us',name:'Miles per gallon (US mpg)',kind:'FuelEconomy',
      toBase:v=> 235.214583 / v, fromBase:b=> 235.214583 / b});

    // TORQUE (base: newton metre)
    add({id:'newton_metre',name:'Newton metre (N·m)',kind:'Torque',toBase:v=>v,fromBase:b=>b});
    add({id:'pound_force_foot',name:'Pound-force foot (lbf·ft)',kind:'Torque',toBase:v=>v*1.3558179483314004,fromBase:b=>b/1.3558179483314004});

    // ILLUMINANCE (lux)
    add({id:'lux',name:'Lux (lx)',kind:'Illuminance',toBase:v=>v,fromBase:b=>b});
    add({id:'foot_candle',name:'Foot-candle (fc)',kind:'Illuminance',toBase:v=>v*10.76391041671,fromBase:b=>b/10.76391041671});

    // other categories can be appended here similarly to be more exhaustive...

    // populate selects
    function populate(){
      // create optgroup-like grouping by kind for user clarity
      const kinds = {};
      UNITS.forEach(u=>{
        if(!kinds[u.kind]) kinds[u.kind]=[];
        kinds[u.kind].push(u);
      });
      // flatten as grouped list but selects require flat options; we prefix with kind in option label
      fromUnit.innerHTML = '';
      toUnit.innerHTML = '';
      Object.keys(kinds).forEach(kind=>{
        // add header option (disabled)
        const headerOpt = document.createElement('option');
        headerOpt.text = `--- ${kind} ---`;
        headerOpt.disabled = true;
        headerOpt.style.fontWeight = '700';
        fromUnit.add(headerOpt.cloneNode(true));
        toUnit.add(headerOpt.cloneNode(true));

        kinds[kind].forEach(u=>{
          const o1 = document.createElement('option');
          o1.value = u.id;
          o1.text = u.name;
          fromUnit.add(o1);
          const o2 = document.createElement('option');
          o2.value = u.id;
          o2.text = u.name;
          toUnit.add(o2);
        });
      });
      // choose sane defaults: metre -> kilometre
      const idxFrom = UNITS.findIndex(u=>u.id==='metre');
      const idxTo = UNITS.findIndex(u=>u.id==='kilometre');
      if(idxFrom>=0) fromUnit.selectedIndex = Math.max(0, idxFrom*2); // approximate location; fine
      if(idxTo>=0) toUnit.selectedIndex = Math.max(0, idxTo*2+1);
    }

    function findUnit(id){ return UNITS.find(u=>u.id===id); }

    function convert(){
      const uFrom = findUnit(fromUnit.value);
      const uTo = findUnit(toUnit.value);
      const val = Number(fromValue.value);
      if(!uFrom || !uTo){ resultBox.textContent = 'Result: select units'; return; }
      if(!Number.isFinite(val)){ resultBox.textContent = 'Result: enter a number'; return; }
      // check kind compat
      if(uFrom.kind !== uTo.kind){ resultBox.textContent = `Result: incompatible units (${uFrom.kind} ↛ ${uTo.kind})`; return; }
      try{
        // For temp and fuel economy their toBase/fromBase already handle
        const base = uFrom.toBase(val);
        const out = uTo.fromBase(base);
        resultBox.textContent = `Result: ${formatNumber(out)} ${uTo.name}`;
      }catch(e){
        resultBox.textContent = 'Result: Error';
      }
    }

    function swap(){
      const oldFrom = fromUnit.selectedIndex;
      fromUnit.selectedIndex = toUnit.selectedIndex;
      toUnit.selectedIndex = oldFrom;
      convert();
    }

    function copy(){
      const txt = resultBox.textContent.replace(/^Result:\s*/,'');
      if(navigator.clipboard) navigator.clipboard.writeText(txt).catch(()=>{});
    }

    function formatNumber(n){
      if(!isFinite(n)) return 'NaN';
      const abs = Math.abs(n);
      if(abs !== 0 && (abs < 1e-6 || abs >= 1e9)) return n.toExponential(8);
      return Number(n.toFixed(12)).toString();
    }

    // init
    populate();
    convertBtn.addEventListener('click', convert);
    swapBtn.addEventListener('click', swap);
    copyBtn.addEventListener('click', copy);
    fromValue.addEventListener('keydown', e=>{ if(e.key === 'Enter') convert(); });

    // sensible default selection (if present)
    (function setDefaults(){
      const f = UNITS.findIndex(u=>u.id==='centimetre');
      const t = UNITS.findIndex(u=>u.id==='metre');
      if(f>=0) fromUnit.selectedIndex = f*2+1; // approximate
      if(t>=0) toUnit.selectedIndex = Math.max(0,t*2+1);
    })();
  }

  // expose nothing globally
})();
