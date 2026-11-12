# Advanced Scientific Calculator

A responsive, browser-based scientific calculator built with HTML, CSS, and vanilla JavaScript.

## Features
- Standard arithmetic: addition, subtraction, multiplication, division, modulo and powers
- Scientific functions: `sin`, `cos`, `tan`, inverse trig, hyperbolic trig, `sqrt`, `cbrt`, `ln`, `log`, `log2`, `exp`, `abs`, and factorial
- Constants: π and e
- Degree / radian angle modes
- Parentheses and implicit multiplication (for example `2π`, `3(4+1)`)
- Previous answer (`Ans`)
- Memory controls: MC, MR, M+, M−
- Calculation history with click-to-reuse
- Keyboard support
- Responsive layout and error handling
- Safe expression parser (does not use JavaScript `eval`)

## Run
Open `index.html` in any modern browser. No installation, backend, or build step is required.

## Keyboard shortcuts
- `0–9`, `.`, `+`, `-`, `*`, `/`, `^`, `(`, `)`
- `Enter` or `=`: calculate
- `Backspace`: delete last character
- `Escape`: clear current expression

## Project structure
```text
advanced-scientific-calculator/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── calculator.js
├── README.md
└── .gitignore
```

## Notes
- Trigonometric functions use the selected DEG/RAD mode.
- `log(x)` means base-10 logarithm; `ln(x)` means natural logarithm.
- Factorial is defined for non-negative integers up to 170.
