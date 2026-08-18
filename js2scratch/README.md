# js2scratch

Compile a **JavaScript subset** into a Scratch 3 `.sb3` project, using the `scratch3` Python library as the backend.

This is a real compiler: source is parsed as JavaScript, then lowered into Scratch blocks. One JS statement can become many blocks. It is **not** a Scratch DSL that happens to look like JS — but objects and several other JS features are stripped, and Scratch drawing/motion is exposed as ordinary function calls.

```bash
pip install -e .
python -m js2scratch examples/js/hello_world -o hello_world.sb3
python -m js2scratch examples/js/pen -o pen.sb3
```

A single `.js` file also works (`Cat.js` becomes sprite `Cat`). From Python:

```python
from js2scratch import compile_js, compile_project

project = compile_js('console.log("Hello World!");', sprite="Cat")
project.save("hello.sb3")

project = compile_project("examples/js/pen")
project.save("pen.sb3")
```

Open the `.sb3` in the [Scratch editor](https://scratch.mit.edu/projects/editor/) (**File → Load from your computer**).

Allowed programs are valid JavaScript. Unsupported JS is a **compile error with file/line/column**, not silent wrong code.

---

## Project layout

```
my_project/
  project.json    # optional
  Cat.js          # sprite named Cat
  Dog.js          # sprite named Dog
  stage.js        # optional; scripts on the Stage
```

`project.json`:

```json
{
  "name": "My Project",
  "sprites": {
    "Cat": {
      "x": 0,
      "y": 0,
      "size": 100,
      "direction": 90,
      "visible": true,
      "costume": "cat.svg",
      "costumes": ["cat.svg"],
      "sounds": ["meow.wav"]
    }
  }
}
```

Asset paths are relative to the project folder. If you omit costumes, the library supplies defaults.

Top-level statements in a sprite file become **one** `when green flag clicked` script. `function` declarations become Scratch custom blocks on that sprite.

---

## Language subset

### Values

| JS | Scratch |
|---|---|
| numbers (`1`, `3.14`) | number shadows / reporters |
| strings (`"hi"`, `'hi'`) | string shadows / `Join` |
| `true` / `false` | `1` / `0` |
| `null` / `undefined` | empty string `""` |
| arrays (`[1, 2]`) | sprite lists (see below) |

No objects, `new`, `class`, `this`, or prototypes.

### Variables

`let`, `const`, and `var` are all mutable Scratch variables (no TDZ, no `const` enforcement). Scope is the sprite or the function, not the block.

```javascript
let x = 1;
x += 2;
x++;
```

Function locals are renamed (`foo__x`) so two functions can both have an `x`. Undeclared variables are a compile error.

### Operators

- Arithmetic: `+ - * / %`, unary `+` / `-`
- Assignment: `=` `+=` `-=` `*=` `/=` `%=` `&=` `|=` `^=` `<<=` `>>=` `>>>=` `++` `--`
- Comparison: `==` and `===` both become Scratch `=`; `!=` / `!==` become `not (=)`
- Relational: `<` `>` `<=` `>=`
- Logic: `&&` `||` `!` (short-circuit with temps, JS-like: they yield a value, not only a boolean)
- Bitwise: `&` `|` `^` `~` `<<` `>>` `>>>` (see below)

`+` is JS-like when types are known: two numbers → `Add`; either side a string → `Join`; otherwise a generated `__js_add` helper chooses at runtime.

Scratch has no native bitwise ops. `&` uses a 256×256 `andLUT` list (byte `i & j` at index `i * 256 + j + 1`) via custom blocks `AND8` / `AND16` / `AND32` — 8-bit is one lookup, 32-bit is four. `|` is `(a + b) - (a & b)` (`OR8` / `OR16` / `OR32`). `^` is `(a + b) - (2 * (a & b))` (`XOR8` / `XOR16` / `XOR32`). Only the widths that appear in the program are emitted, and `andLUT` is omitted if AND is never needed.

If both operands are number literals, the result is folded to a constant. `a & 255` (or any `2^k - 1` mask) becomes `a mod 2^k` instead of a LUT lookup. A constant shift amount becomes `× 2^n` or `floor(÷ 2^n)`; a variable shift uses a 32-entry `pow2LUT`. `~a` is `-1 - a`.

`if (x)` / `while (x)` on a non-comparison uses a truthiness check (falsy: `false`, `0`, `""`, `null`, `undefined`).

### Control flow

```javascript
if (x > 0) { ... } else if (x < 0) { ... } else { ... }

while (n < 10) { n++; }
do { n++; } while (n < 10);

for (let i = 0; i < 10; i++) { ... }

switch (x) {
  case 1:
    foo();
    break;
  case 2:
    bar();
  default:
    baz();
}
```

`while` / `for` lower to `repeat until`. `while (true)` and `for (;;)` become `forever`.

`switch` becomes one custom block per case (plus a dispatcher custom block). `break` is `stop this script` inside that case. A case without `break` calls the next case (JS fall-through). If a case `return`s from the enclosing function, the case sets `__sw_ret` and the switch call site stops the function script; that flag is omitted when no case returns.

**Not in this subset:** `break` / `continue` in loops, `try` / `catch`, ternary `? :`.

### Functions

```javascript
function add(a, b) {
  return a + b;
}
console.log(add(1, 2));
```

Each function is a Scratch **custom block** (`warp` on). Parameters are copied into mutable locals so `a = a + 1` works. `return` sets a sprite variable `__return` and runs `stop this script`. After a call, the compiler copies `__return` into a temp (`__t1`, …) so the next call cannot clobber it.

Nested function declarations, function expressions, arrow functions, callbacks, and first-class functions are errors.

### Arrays

Scratch lists are **1-based**; the compiler adds 1 to JS indexes.

```javascript
let a = [10, 20];
console.log(a[0]);     // item 1 of list
a[1] = 30;
a.push(40);            // returns the new length if used as a value
console.log(a.length);

let names = loadList("names.txt");  // one item per line, baked into the list
```

`loadList("file.txt")` is a **compile-time** builtin: it reads a UTF-8 text file (path relative to the `.js` file) and stores each line as a list item on the sprite. Integer and decimal lines become numbers. No `add` blocks are emitted for that data, so long lists stay cheap. The path must be a string literal.

Arrays cannot be function parameters. String `.length` uses the string-length reporter; array `.length` uses the list-length reporter.

### Comments and semicolons

`//` and `/* */` are allowed. Semicolons are optional when a newline or `}` ends the statement (light ASI).

---

## Builtins

These are compile-time names, not real objects. `Math`, `console`, `pen`, and `loadList` cannot be assigned, passed around, or declared as functions.

### `loadList`

Reads a text file at compile time and returns a Scratch list (one item per line). Same rules as Python `from_file`.

```javascript
let rom = loadList("rom.txt");
console.log(rom[0]);
```

Paths are relative to the sprite `.js` file (or the current directory when compiling a string). The argument must be a string literal.

### `console.log`

Maps to Scratch **say**. Several arguments are joined with spaces.

```javascript
console.log("Hello World!");
console.log("score", n);
```

### `Math`

| Call | Scratch |
|---|---|
| `Math.abs(x)` | `abs` of |
| `Math.floor` / `Math.ceil` / `Math.round` | `floor` / `ceiling` / `round` |
| `Math.sqrt` / `sin` / `cos` / `tan` / `asin` / `acos` / `atan` | matching `MathOp` |
| `Math.log(x)` | `ln` (natural log, like JS) |
| `Math.log10(x)` | `log` |
| `Math.exp(x)` | `e ^` |
| `Math.pow(a, b)` | `e ^ (b * ln(a))` |
| `Math.max` / `Math.min` | `if` + temps |
| `Math.random()` | `pick random (0.0) to (1.0)` |

### Pen (drawing)

The Scratch **Pen** extension. Using any of these adds `"pen"` to the project.

```javascript
pen.clear();                 // erase all
pen.setColor("#4C97FF");     // hex color
pen.setSize(3);
pen.down();                  // stamp a trail while the sprite moves
move(10);
turnRight(15);
pen.up();
pen.stamp();                 // stamp the current costume
```

| Call | Scratch block |
|---|---|
| `pen.clear()` / `pen.eraseAll()` | erase all |
| `pen.down()` / `pen.up()` | pen down / pen up |
| `pen.stamp()` | stamp |
| `pen.setColor(color)` | set pen color to |
| `pen.setSize(n)` / `pen.changeSize(n)` | set / change pen size |
| `pen.setParam(name, n)` | set pen `[color v]` to |
| `pen.changeParam(name, n)` | change pen `[color v]` by |

Pen param names: `"color"`, `"saturation"`, `"brightness"`, `"transparency"`.

The sprite must **move** after `pen.down()` or nothing visible is drawn. Use the motion builtins below.

### Motion and drawing helpers

| Call | Scratch block |
|---|---|
| `move(steps)` | move () steps |
| `turnRight(deg)` / `turnLeft(deg)` | turn clockwise / counter-clockwise |
| `goTo(x, y)` | go to x: y: |
| `setX(x)` / `setY(y)` | set x / set y |
| `changeX(dx)` / `changeY(dy)` | change x / y by |
| `pointInDirection(deg)` | point in direction |
| `bounce()` | if on edge, bounce |
| `xPosition()` / `yPosition()` / `direction()` | x position, y position, direction (reporters) |
| `hide()` / `show()` | hide / show the sprite |
| `wait(seconds)` | wait () seconds (Scratch wait, not `async`) |
| `keyPressed(name)` | key `name` pressed? (`"space"`, `"left arrow"`, `"a"`, …) |

`xPosition()` and friends are reporters, so they nest in expressions:

```javascript
goTo(0, 0);
console.log(xPosition(), yPosition());
```

---

## What is not supported

Explicit compile errors (not a complete list of every JS feature):

- Object literals `{ a: 1 }`, `new`, `class`, `this`, `super`
- Property access other than `console.log`, `Math.*`, `pen.*`, `array.length` / `array.push`
- `import` / `export` (each `.js` file is a sprite, not an ES module; use `loadList("file.txt")` for list data)
- `async` / `await`, Promises
- `try` / `catch` / `throw`
- `break` / `continue` in loops (switch `break` is supported)
- Arrow functions, function expressions, nested `function` declarations
- Template literals, regex literals, destructuring, spread/`...`
- `**` (use `Math.pow`), `typeof`, `instanceof`

---

## How compilation works

1. **Parse** the file into an AST (JS subset).
2. **Collect** functions vs top-level statements; classify names as variables or lists.
3. **Lower** expressions to `(prelude stack blocks, reporter)`:
   - Pure math stays nested: `Say(Add(1, Multiply(2, 3)))`
   - User calls are stack blocks: call, then `set __tN to __return`
4. **Emit** `Define` scripts for each function, then `WhenFlagClicked` for top-level code.

Scratch has no returning reporters for custom blocks, which is why functions use `__return`.

---

## Examples

- [`examples/js/hello_world`](../examples/js/hello_world) — `console.log("Hello World!")`
- [`examples/js/functions`](../examples/js/functions) — `add` + `console.log(add(1, 2))`
- [`examples/js/pen`](../examples/js/pen) — pen spiral (same idea as [`examples/pen_test.py`](../examples/pen_test.py))
- [`examples/js/space_invaders`](../examples/js/space_invaders) — CHIP-8 emulator with Space Invaders ROM hardcoded
