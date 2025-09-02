// =====================
// Standard Calculator
// =====================
function appendStd(val) {
  document.getElementById("stdDisplay").value += val;
}
function calcStd() {
  try {
    document.getElementById("stdDisplay").value = eval(document.getElementById("stdDisplay").value);
  } catch {
    document.getElementById("stdDisplay").value = "Error";
  }
}
function clearStd() {
  document.getElementById("stdDisplay").value = "";
}

// =====================
// Scientific Calculator
// =====================
function appendSci(val) {
  document.getElementById("sciDisplay").value += val;
}
function calcSci() {
  try {
    document.getElementById("sciDisplay").value = eval(document.getElementById("sciDisplay").value);
  } catch {
    document.getElementById("sciDisplay").value = "Error";
  }
}
function clearSci() {
  document.getElementById("sciDisplay").value = "";
}

// =====================
// Measurement Converter
// =====================
const units = {
  length: { "centimetre":0.01, "metre":1, "kilometre":1000, "inch":0.0254, "foot":0.3048, "mile":1609.34 },
  weight: { "gram":0.001, "kilogram":1, "pound":0.453592, "ounce":0.0283495, "tonne":1000 },
  temperature: ["celsius","fahrenheit","kelvin"],
  time: { "second":1, "minute":60, "hour":3600, "day":86400 },
  speed: { "m/s":1, "km/h":0.277778, "mph":0.44704 },
  area: { "sq.metre":1, "sq.kilometre":1e6, "acre":4046.86, "hectare":10000 },
  volume: { "millilitre":0.001, "litre":1, "cubic metre":1000, "gallon":3.78541 },
  data: { "bit":1, "byte":8, "kilobyte":8192, "megabyte":8.39e6, "gigabyte":8.59e9 }
};

function populateUnits() {
  let cat = document.getElementById("category").value;
  let fromSel = document.getElementById("fromUnit");
  let toSel = document.getElementById("toUnit");
  fromSel.innerHTML = "";
  toSel.innerHTML = "";

  if(cat==="temperature") {
    units.temperature.forEach(u=>{
      fromSel.add(new Option(u,u));
      toSel.add(new Option(u,u));
    });
  } else {
    Object.keys(units[cat]).forEach(u=>{
      fromSel.add(new Option(u,u));
      toSel.add(new Option(u,u));
    });
  }
}

function convert() {
  let cat = document.getElementById("category").value;
  let val = parseFloat(document.getElementById("inputValue").value);
  let from = document.getElementById("fromUnit").value;
  let to = document.getElementById("toUnit").value;
  let result;

  if(isNaN(val)) { document.getElementById("result").innerText="Enter value"; return; }

  if(cat==="temperature") {
    if(from==="celsius") result = (to==="fahrenheit") ? (val*9/5+32) : (to==="kelvin") ? (val+273.15) : val;
    if(from==="fahrenheit") {
      let c=(val-32)*5/9;
      result = (to==="celsius")?c:(to==="kelvin")?(c+273.15):val;
    }
    if(from==="kelvin") {
      let c=val-273.15;
      result = (to==="celsius")?c:(to==="fahrenheit")?(c*9/5+32):val;
    }
  } else {
    result = (val * units[cat][from]) / units[cat][to];
  }

  document.getElementById("result").innerText = result + " " + to;
}

document.addEventListener("DOMContentLoaded", populateUnits);
