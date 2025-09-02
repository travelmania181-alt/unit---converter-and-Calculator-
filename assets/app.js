// =======================
// Standard Calculator
// =======================
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

// =======================
// Scientific Calculator
// =======================
function sciAppend(val) {
  document.getElementById("sci-display").value += val;
}

function clearSci() {
  document.getElementById("sci-display").value = "";
}

function sciCalculate() {
  let exp = document.getElementById("sci-display").value;
  try {
    // Replace symbols
    exp = exp.replace(/\^/g, "**");

    // Replace functions
    exp = exp.replace(/sin\(/g, "Math.sin(")
             .replace(/cos\(/g, "Math.cos(")
             .replace(/tan\(/g, "Math.tan(")
             .replace(/log\(/g, "Math.log10(")
             .replace(/sqrt\(/g, "Math.sqrt(");

    document.getElementById("sci-display").value = eval(exp);
  } catch {
    document.getElementById("sci-display").value = "Error";
  }
}

function factorial(n) {
  n = parseInt(n);
  if (isNaN(n) || n < 0) return "NaN";
  if (n === 0) return 1;
  let res = 1;
  for (let i = 1; i <= n; i++) res *= i;
  return res;
}

function sciFunc(func) {
  let disp = document.getElementById("sci-display");
  let val = parseFloat(disp.value) || 0;

  switch(func) {
    case 'fact': disp.value = factorial(val); break;
    case 'pow': disp.value = Math.pow(val, 2); break;
    default: break;
  }
}

// =======================
// Measurement Converter
// =======================
function convertUnits() {
  let category = document.getElementById("category").value;
  let input = parseFloat(document.getElementById("inputValue").value);
  let from = document.getElementById("fromUnit").value;
  let to = document.getElementById("toUnit").value;
  let resultBox = document.getElementById("result");

  if (isNaN(input)) {
    resultBox.innerText = "Enter a valid number";
    return;
  }

  let result = input;

  // Length example
  if (category === "length") {
    let units = { meter: 1, kilometre: 1000, centimetre: 0.01, millimetre: 0.001, mile: 1609.34, yard: 0.9144, foot: 0.3048, inch: 0.0254 };
    result = input * units[from] / units[to];
  }

  // Weight example
  if (category === "weight") {
    let units = { kilogram: 1, gram: 0.001, milligram: 0.000001, pound: 0.453592, ounce: 0.0283495 };
    result = input * units[from] / units[to];
  }

  // Temperature example
  if (category === "temperature") {
    if (from === "celsius" && to === "fahrenheit") result = (input * 9/5) + 32;
    else if (from === "fahrenheit" && to === "celsius") result = (input - 32) * 5/9;
    else if (from === "celsius" && to === "kelvin") result = input + 273.15;
    else if (from === "kelvin" && to === "celsius") result = input - 273.15;
    else if (from === "fahrenheit" && to === "kelvin") result = (input - 32) * 5/9 + 273.15;
    else if (from === "kelvin" && to === "fahrenheit") result = (input - 273.15) * 9/5 + 32;
    else result = input;
  }

  resultBox.innerText = `Result: ${result} ${to}`;
}
