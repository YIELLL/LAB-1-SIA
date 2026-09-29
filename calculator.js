const expressionDisplay = document.querySelector("#expression");
const resultDisplay = document.querySelector("#result");
const advancedToggle = document.querySelector("#advanced-toggle");
const advancedKeys = document.querySelector("#advanced-keys");
let expression = "";
let lastResult = null;
let afterEquals = false;

function tokenize(source) {
  const normalized = source.replaceAll("×", "*").replaceAll("÷", "/").replaceAll("−", "-");
  const tokens = normalized.match(/(?:\d+(?:\.\d*)?|\.\d+)|sin|cos|tan|sqrt|log|ln|pi|e|[()+\-*/^%]/gi);
  if (!tokens || tokens.join("").replaceAll(" ", "") !== normalized.replaceAll(" ", "")) {
    throw new Error("Invalid expression");
  }

  const functions = new Set(["sin", "cos", "tan", "sqrt", "log", "ln"]);
  const expanded = [];
  for (const token of tokens) {
    const previous = expanded.at(-1);
    const previousEndsValue = previous && (/^(?:\d|pi$|e$|\)|%)$/i.test(previous));
    const currentStartsValue = /^(?:\d|pi$|e$|\(|sin$|cos$|tan$|sqrt$|log$|ln$)/i.test(token);
    if (previousEndsValue && currentStartsValue && !(functions.has(previous.toLowerCase()) && token === "(")) {
      expanded.push("*");
    }
    expanded.push(token);
  }
  return expanded;
}

function evaluate(source) {
  const tokens = tokenize(source);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];

  function parseExpression() {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = parseUnary();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    if (peek() === "-") {
      take();
      return -parseUnary();
    }
    return parsePower();
  }

  function parsePower() {
    let value = parsePrimary();
    if (peek() === "^") {
      take();
      value **= parseUnary();
    }
    return value;
  }

  function parsePrimary() {
    const token = take();
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing closing parenthesis");
      return applyPercent(value);
    }

    if (token === undefined) throw new Error("Incomplete expression");
    if (/^(?:\d|\.)/.test(token)) return applyPercent(Number(token));
    if (token.toLowerCase() === "pi") return applyPercent(Math.PI);
    if (token.toLowerCase() === "e") return applyPercent(Math.E);

    const functions = {
      sin: value => Math.sin(value * Math.PI / 180),
      cos: value => Math.cos(value * Math.PI / 180),
      tan: value => Math.tan(value * Math.PI / 180),
      sqrt: value => Math.sqrt(value),
      log: value => Math.log10(value),
      ln: value => Math.log(value)
    };
    const operation = functions[token.toLowerCase()];
    if (operation) {
      let argument;
      if (peek() === "(") {
        take();
        argument = parseExpression();
        if (take() !== ")") throw new Error("Missing closing parenthesis");
      } else {
        argument = parseUnary();
      }
      return applyPercent(operation(argument));
    }
    throw new Error("Invalid expression");
  }

  function applyPercent(value) {
    while (peek() === "%") {
      take();
      value /= 100;
    }
    return value;
  }

  const value = parseExpression();
  if (position !== tokens.length || !Number.isFinite(value)) throw new Error("Invalid result");
  return value;
}

function formatNumber(value) {
  if (Object.is(value, -0)) return "0";
  return Number(value.toPrecision(12)).toString();
}

function refreshDisplay() {
  expressionDisplay.textContent = expression || "\u00a0";
  if (!expression) {
    resultDisplay.textContent = "0";
    return;
  }
  try {
    resultDisplay.textContent = formatNumber(evaluate(expression));
  } catch {
    resultDisplay.textContent = afterEquals && lastResult !== null ? formatNumber(lastResult) : "";
  }
}

function appendValue(value) {
  const isOperator = ["+", "−", "×", "÷", "^"].includes(value);
  if (afterEquals && isOperator && lastResult !== null) {
    expression = `${formatNumber(lastResult)} ${value} `;
    afterEquals = false;
  } else {
    if (afterEquals) expression = "";
    afterEquals = false;
    if (isOperator) {
      if (!expression && value !== "−") return;
      expression = `${expression.trimEnd()} ${value} `;
    } else {
      expression += value;
    }
  }
  refreshDisplay();
}

function clearAll() {
  expression = "";
  lastResult = null;
  afterEquals = false;
  refreshDisplay();
}

function deleteLast() {
  if (afterEquals) {
    clearAll();
    return;
  }
  const trimmed = expression.trimEnd();
  const functionMatch = trimmed.match(/(?:sin|cos|tan|sqrt|log|ln)\($/);
  expression = functionMatch
    ? trimmed.slice(0, -functionMatch[0].length)
    : trimmed.slice(0, -1).trimEnd();
  refreshDisplay();
}

function toggleSign() {
  if (afterEquals && lastResult !== null) {
    expression = formatNumber(-lastResult);
    lastResult = -lastResult;
    afterEquals = true;
    refreshDisplay();
    return;
  }
  afterEquals = false;
  lastResult = null;
  const trimmed = expression.trimEnd();
  if (!trimmed || /[+×÷^(]$/.test(trimmed) || trimmed.endsWith("−")) {
    expression = `${trimmed}−`;
  } else {
    const numberMatch = trimmed.match(/(?:\d+(?:\.\d*)?|\.\d+)$/);
    if (!numberMatch) return;
    const start = trimmed.length - numberMatch[0].length;
    const prefix = trimmed.slice(0, start);
    expression = prefix.endsWith("−") && /[+×÷(]$/.test(prefix.slice(0, -1).trimEnd())
      ? `${prefix.slice(0, -1)}${numberMatch[0]}`
      : `${prefix}−${numberMatch[0]}`;
  }
  refreshDisplay();
}

function calculate() {
  try {
    lastResult = evaluate(expression);
    afterEquals = true;
    resultDisplay.textContent = formatNumber(lastResult);
  } catch {
    resultDisplay.textContent = "Error";
  }
}

function handleAction(button) {
  const { action, value } = button.dataset;
  if (action === "clear") return clearAll();
  if (action === "backspace") return deleteLast();
  if (action === "sign") return toggleSign();
  if (action === "equals") return calculate();

  if (value === "square") {
    if (afterEquals && lastResult !== null) expression = formatNumber(lastResult);
    afterEquals = false;
    lastResult = null;
    expression += "^2";
    return refreshDisplay();
  }
  if (["sin", "cos", "tan", "sqrt", "log", "ln"].includes(value)) {
    if (afterEquals) expression = "";
    afterEquals = false;
    lastResult = null;
    expression += `${value}(`;
    return refreshDisplay();
  }
  appendValue(value);
}

document.querySelectorAll(".key").forEach(button => {
  button.addEventListener("click", () => handleAction(button));
});

advancedToggle.addEventListener("click", () => {
  const isExpanded = advancedToggle.getAttribute("aria-expanded") === "true";
  advancedToggle.setAttribute("aria-expanded", String(!isExpanded));
  advancedKeys.hidden = isExpanded;
});

document.addEventListener("keydown", event => {
  if (/^\d$/.test(event.key) || event.key === ".") return appendValue(event.key);
  const operators = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^", "%": "%", "(": "(", ")": ")" };
  if (operators[event.key]) {
    event.preventDefault();
    return appendValue(operators[event.key]);
  }
  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    return calculate();
  }
  if (event.key === "Backspace") return deleteLast();
  if (event.key === "Escape") return clearAll();
});

refreshDisplay();