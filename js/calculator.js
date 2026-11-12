(() => {
  const $ = id => document.getElementById(id);
  const expressionEl = $("expression");
  const resultEl = $("result");
  const messageEl = $("message");
  const historyList = $("historyList");
  let expression = "";
  let answer = 0;
  let memory = 0;
  let angleMode = "DEG";
  let history = [];

  const FUNCTIONS = new Set(["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","sqrt","cbrt","log","ln","log2","exp","abs"]);
  const format = n => {
    if (!Number.isFinite(n)) throw new Error("Result is outside the supported range.");
    if (Object.is(n, -0)) n = 0;
    return Number(n.toPrecision(12)).toString();
  };
  const pretty = s => s.replace(/\*/g,"×").replace(/\//g,"÷").replace(/-/g,"−");

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error("Factorial requires an integer from 0 to 170.");
    let out = 1;
    for (let k = 2; k <= n; k++) out *= k;
    return out;
  }

  function tokenize(input) {
    const s = input.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/π/g,"pi");
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      if (/\s/.test(s[i])) { i++; continue; }
      const rest = s.slice(i);
      const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);
      if (number) { tokens.push({type:"number", value:Number(number[0])}); i += number[0].length; continue; }
      const word = rest.match(/^[a-z]+/i);
      if (word) {
        const name = word[0].toLowerCase();
        if (name === "pi") tokens.push({type:"number",value:Math.PI});
        else if (name === "e") tokens.push({type:"number",value:Math.E});
        else if (name === "ans") tokens.push({type:"number",value:answer});
        else if (FUNCTIONS.has(name)) tokens.push({type:"function",value:name});
        else throw new Error(`Unknown term: ${word[0]}`);
        i += word[0].length;
        continue;
      }
      if ("+-*/%^()!".includes(s[i])) { tokens.push({type:"symbol",value:s[i]}); i++; continue; }
      throw new Error(`Unexpected character: ${s[i]}`);
    }
    const expanded = [];
    for (let j = 0; j < tokens.length; j++) {
      const prev = tokens[j-1], cur = tokens[j];
      const prevEnds = prev && (prev.type === "number" || prev.value === ")" || prev.value === "!");
      const curStarts = cur && (cur.type === "number" || cur.value === "(" || cur.type === "function");
      if (prevEnds && curStarts) expanded.push({type:"symbol",value:"*"});
      expanded.push(cur);
    }
    return expanded;
  }

  function evaluate(input) {
    const tokens = tokenize(input);
    if (!tokens.length) return 0;
    let pos = 0;
    const peek = () => tokens[pos];
    const take = () => tokens[pos++];
    const expect = value => {
      const t = take();
      if (!t || t.value !== value) throw new Error(`Expected "${value}".`);
    };
    const angle = x => angleMode === "DEG" ? x * Math.PI / 180 : x;
    const unangle = x => angleMode === "DEG" ? x * 180 / Math.PI : x;

    function primary() {
      const t = take();
      if (!t) throw new Error("Incomplete expression.");
      if (t.type === "number") return t.value;
      if (t.value === "(") { const v = addSub(); expect(")"); return v; }
      if (t.type === "function") {
        const name = t.value;
        let v;
        if (peek() && peek().value === "(") { take(); v = addSub(); expect(")"); }
        else v = unary();
        let out;
        switch(name) {
          case "sin": out = Math.sin(angle(v)); break;
          case "cos": out = Math.cos(angle(v)); break;
          case "tan":
            if (Math.abs(Math.cos(angle(v))) < 1e-14) throw new Error("Tangent is undefined at this angle.");
            out = Math.tan(angle(v)); break;
          case "asin": out = unangle(Math.asin(v)); break;
          case "acos": out = unangle(Math.acos(v)); break;
          case "atan": out = unangle(Math.atan(v)); break;
          case "sinh": out = Math.sinh(v); break;
          case "cosh": out = Math.cosh(v); break;
          case "tanh": out = Math.tanh(v); break;
          case "sqrt": if (v < 0) throw new Error("Square root needs a non-negative value."); out = Math.sqrt(v); break;
          case "cbrt": out = Math.cbrt(v); break;
          case "log": if (v <= 0) throw new Error("log requires a positive value."); out = Math.log10(v); break;
          case "ln": if (v <= 0) throw new Error("ln requires a positive value."); out = Math.log(v); break;
          case "log2": if (v <= 0) throw new Error("log₂ requires a positive value."); out = Math.log2(v); break;
          case "exp": out = Math.exp(v); break;
          case "abs": out = Math.abs(v); break;
          default: throw new Error("Unsupported function.");
        }
        if (!Number.isFinite(out)) throw new Error("Function is undefined for this input.");
        return out;
      }
      if (t.value === "+") return unary();
      if (t.value === "-") return -unary();
      throw new Error("Invalid expression.");
    }
    function postfix() {
      let v = primary();
      while (peek() && peek().value === "!") { take(); v = factorial(v); }
      return v;
    }
    function unary() {
      if (peek() && (peek().value === "+" || peek().value === "-")) {
        const op = take().value, v = unary();
        return op === "-" ? -v : v;
      }
      return postfix();
    }
    function power() {
      let left = unary();
      if (peek() && peek().value === "^") { take(); left = Math.pow(left, power()); }
      return left;
    }
    function multiply() {
      let v = power();
      while (peek() && ["*","/","%"].includes(peek().value)) {
        const op = take().value, r = power();
        if ((op === "/" || op === "%") && r === 0) throw new Error("Cannot divide by zero.");
        v = op === "*" ? v*r : op === "/" ? v/r : v%r;
      }
      return v;
    }
    function addSub() {
      let v = multiply();
      while (peek() && (peek().value === "+" || peek().value === "-")) {
        const op = take().value, r = multiply();
        v = op === "+" ? v+r : v-r;
      }
      return v;
    }
    const result = addSub();
    if (pos < tokens.length) throw new Error("Check your operators and parentheses.");
    if (!Number.isFinite(result)) throw new Error("Result is outside the supported range.");
    return result;
  }

  function render() {
    expressionEl.textContent = expression ? pretty(expression) : "0";
    $("memoryIndicator").textContent = memory === 0 ? "MEM —" : "MEM ●";
    $("memoryLabel").textContent = memory === 0 ? "Empty" : format(memory);
    $("answerLabel").textContent = format(answer);
    $("angleLabel").textContent = angleMode === "DEG" ? "Degrees" : "Radians";
  }
  function setMessage(text, error = false) {
    messageEl.textContent = text;
    messageEl.classList.toggle("error", error);
  }
  function preview() {
    if (!expression) { resultEl.textContent = "0"; setMessage("Enter an expression"); return; }
    try { resultEl.textContent = format(evaluate(expression)); setMessage("Expression preview"); }
    catch (_) { setMessage("Continue entering expression"); }
  }
  function insert(value) {
    if (value === "−") value = "-";
    if (value === "÷") value = "/";
    if (value === "×") value = "*";
    expression += value;
    render();
    preview();
  }
  function calculate() {
    if (!expression.trim()) return;
    try {
      const value = evaluate(expression), shown = format(value);
      history.unshift({expression, shown});
      history = history.slice(0, 30);
      answer = value;
      resultEl.textContent = shown;
      setMessage("Calculation complete");
      renderHistory();
      render();
    } catch (err) {
      resultEl.textContent = "—";
      setMessage(err.message || "Invalid expression", true);
    }
  }
  function clear() {
    expression = "";
    resultEl.textContent = "0";
    setMessage("Enter an expression");
    render();
  }
  function backspace() {
    expression = expression.slice(0, -1);
    render();
    preview();
  }
  function renderHistory() {
    $("historyCount").textContent = String(history.length).padStart(2, "0");
    historyList.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "Your calculations will appear here.";
      historyList.append(empty);
      return;
    }
    history.forEach(item => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "history-item";
      const exp = document.createElement("span"); exp.className = "history-expression"; exp.textContent = pretty(item.expression);
      const res = document.createElement("span"); res.className = "history-result"; res.textContent = "= " + item.shown;
      button.append(exp, res);
      button.addEventListener("click", () => {
        expression = item.expression; resultEl.textContent = item.shown;
        setMessage("Loaded from history"); render();
      });
      historyList.append(button);
    });
  }
  function memoryAction(action) {
    try {
      const current = expression ? evaluate(expression) : answer;
      if (action === "memory-clear") memory = 0;
      if (action === "memory-recall") { insert(format(memory)); return; }
      if (action === "memory-add") memory += current;
      if (action === "memory-subtract") memory -= current;
      setMessage("Memory updated"); render();
    } catch (err) { setMessage(err.message, true); }
  }

  document.querySelectorAll("[data-insert]").forEach(button => button.addEventListener("click", () => insert(button.dataset.insert)));
  document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "calculate") calculate();
    else if (action === "clear") clear();
    else if (action === "backspace") backspace();
    else memoryAction(action);
  }));
  document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => {
    angleMode = button.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach(b => {
      const active = b === button;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    render(); setMessage("Angle mode: " + angleMode); preview();
  }));
  $("clearHistory").addEventListener("click", () => { history = []; renderHistory(); setMessage("History cleared"); });
  $("themeToggle").addEventListener("click", () => document.body.classList.toggle("light"));

  document.addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9.]$/.test(event.key)) { insert(event.key); return; }
    const map = {"+":"+","-":"−","*":"×","/":"÷","^":"^","%":"%","(":"(",")":")"};
    if (Object.prototype.hasOwnProperty.call(map, event.key)) { event.preventDefault(); insert(map[event.key]); return; }
    if (event.key === "Enter" || event.key === "=") { event.preventDefault(); calculate(); }
    else if (event.key === "Backspace") { event.preventDefault(); backspace(); }
    else if (event.key === "Escape") clear();
  });

  render();
  renderHistory();
})();