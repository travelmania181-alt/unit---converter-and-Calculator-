// ===== Standard Calculator =====
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

// ===== Scientific Calculator =====
function sciAppend(val) {
  document.getElementById("sci-display").value += val;
}

function clearSci() {
  document.getElementById("sci-display").value = "";
}

function sciCalculate() {
  let exp = document.getElementById("sci-display").value;
  try {
    // Replace ^ with ** for exponentiation
    exp = exp.replace(/\^/g, "**");

    // Replace functions with Math equivalents
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
