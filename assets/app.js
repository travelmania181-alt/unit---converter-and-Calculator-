// ================== Standard Calculator ==================
function appendValue(val) {
  document.getElementById("std-display").value += val;
}
function clearDisplay() {
  document.getElementById("std-display").value = "";
}
function calculate() {
  let exp = document.getElementById("std-display").value;
  try {
    document.getElementById("std-display").value = eval(exp);
  } catch {
    document.getElementById("std-display").value = "Error";
  }
}

// ================== Scientific Calculator ==================
function sciFunc(func) {
  let disp = document.getElementById("sci-display");
  let val = parseFloat(disp.value) || 0;

  switch(func) {
    case 'sin': disp.value = Math.sin(val); break;
    case 'cos': disp.value = Math.cos(val); break;
    case 'tan': disp.value = Math.tan(val); break;
    case 'log': disp.value = Math.log10(val); break;
    case 'sqrt': disp.value = Math.sqrt(val); break;
    case 'pow': disp.value = Math.pow(val, 2); break;
    case 'fact': disp.value = factorial(val); break;
  }
}
function clearSci() {
  document.getElementById("sci-display").value = "";
}
function factorial(n) {
  if (n < 0) return "NaN";
  if (n === 0) return 1;
  let res = 1;
  for (let i = 1; i <= n; i++) res *= i;
  return res;
}

// ================== Measurement Converter ==================
const units = {
  length: {
    metre: 1,
    kilometre: 1000,
    centimetre: 0.01,
    millimetre: 0.001,
    mile: 1609.34,
    yard: 0.9144,
    foot: 0.3048,
    inch: 0.0254
  },
  weight: {
    kilogram: 1,
    gram: 0.001,
    milligram: 0.000001,
    tonne: 1000,
    pound: 0.453592,
    ounce: 0.0283495
  },
  temperature: {
    celsius: "celsius",
    fahrenheit: "fahrenheit",
    kelvin: "kelvin"
  },
  time: {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400
  },
  area: {
    "square metre": 1,
    "square kilometre": 1e6,
    "square centimetre": 0.0001,
    "square millimetre": 0.000001,
    hectare: 10000,
    acre: 4046.86
  },
  volume: {
    litre: 1,
    millilitre: 0.001,
    "cubic metre": 1000,
    "cubic centimetre": 0.001,
    gallon: 3.78541,
    pint: 0.473176
  },
  speed: {
    "metre per second": 1,
    "kilometre per hour": 0.277778,
    "mile per hour": 0.44704
  },
  data: {
    bit: 1,
    byte: 8,
    kilobyte: 8000,
    megabyte: 8e6,
    gigabyte: 8e9,
    terabyte: 8e12
  },
  currency: {
    dollar: 1,
    euro: 0.9,
    rupee: 83
  }
};

function loadUnits() {
  let category = document.getElementById("category").value;
  let fromSelect = document.getElementById("fromUnit");
  let toSelect = document.getElementById("toUnit");
  fromSelect.innerHTML = "";
  toSelect.innerHTML = "";
  for (let u in units[category]) {
    fromSelect.innerHTML += `<option value="${u}">${u}</option>`;
    toSelect.innerHTML += `<option value="${u}">${u}</option>`;
  }
}
loadUnits(); // initial load

function convertUnit() {
  let category = document.getElementById("category").value;
  let inputVal = parseFloat(document.getElementById("inputValue").value);
  let fromUnit = document.getElementById("fromUnit").value;
  let toUnit = document.getElementById("toUnit").value;

  if (isNaN(inputVal)) {
    document.getElementById("result").innerText = "Enter a valid number";
    return;
  }

  if (category === "temperature") {
    let result;
    if (fromUnit === "celsius" && toUnit === "fahrenheit") {
      result = (inputVal * 9/5) + 32;
    } else if (fromUnit === "fahrenheit" && toUnit === "celsius") {
      result = (inputVal - 32) * 5/9;
    } else if (fromUnit === "celsius" && toUnit === "kelvin") {
      result = inputVal + 273.15;
    } else if (fromUnit === "kelvin" && toUnit === "celsius") {
      result = inputVal - 273.15;
    } else if (fromUnit === "fahrenheit" && toUnit === "kelvin") {
      result = (inputVal - 32) * 5/9 + 273.15;
    } else if (fromUnit === "kelvin" && toUnit === "fahrenheit") {
      result = (inputVal - 273.15) * 9/5 + 32;
    } else {
      result = inputVal;
    }
    document.getElementById("result").innerText = result + " " + toUnit;
    return;
  }

  let factor = units[category][fromUnit];
  let target = units[category][toUnit];
  let base = inputVal * factor;
  let converted = base / target;

  document.getElementById("result").innerText = converted + " " + toUnit;
      }
