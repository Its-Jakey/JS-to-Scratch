# js2scratch

Compile a **JavaScript subset** into Scratch 3 `.sb3` projects.

![js2scratch](res/main%20screenshot.png)

This is a real compiler: source is parsed as JavaScript, then lowered into Scratch blocks. One JS statement can become many blocks. It is **not** a Scratch DSL that happens to look like JS — but objects and several other JS features are stripped, and Scratch drawing/motion is exposed as ordinary function calls.

```bash
pip install -e .
python -m js2scratch.run examples/js/hello_world
python -m js2scratch.run examples/js/pen
python -m js2scratch examples/js/hello_world -o hello_world.sb3
python -m js2scratch examples/js/pen -o pen.sb3
python -m js2scratch examples/js/engine3d -o engine3d.sb3
```

```javascript
console.log("Hello World!");

pen.clear();
pen.setColor("#4C97FF");
pen.down();
move(10);
pen.up();
```

A single `.js` file also works (`Cat.js` becomes sprite `Cat`). From Python:

```python
from js2scratch import compile_js, compile_project

project = compile_js('console.log("Hello World!");', sprite="Cat")
project.save("hello.sb3")

project = compile_project("examples/js/pen")
project.save("pen.sb3")
```

`python -m js2scratch.run <file-or-folder>` opens a local browser stage. `python -m js2scratch.run <path> --headless --frames 3` runs the same scripts in Node and writes `.js2s-debug/summary.json`, `run.log`, and `last-frame.png` so you can inspect a run without the GUI.

Open the `.sb3` in the [Scratch editor](https://scratch.mit.edu/projects/editor/) (**File → Load from your computer**).

Requires Python 3.10+. No third-party runtime dependencies. Allowed programs are valid JavaScript. Unsupported JS is a **compile error with file/line/column**, not silent wrong code.

Language reference: [`js2scratch/README.md`](js2scratch/README.md). Runner and headless debugger: [`js2scratch/RUN.md`](js2scratch/RUN.md).

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

Asset paths are relative to the project folder. If you omit costumes, the compiler supplies defaults.

Top-level statements in a sprite file become **one** `when green flag clicked` script. `function` declarations become Scratch custom blocks on that sprite.

---

## Language subset

Numbers, strings, booleans, `null`/`undefined`, and arrays work. No objects, `new`, `class`, `this`, or prototypes.

`let`, `const`, and `var` are all mutable Scratch variables. Function locals are renamed so two functions can both have an `x`. Undeclared variables are a compile error.

```javascript
let x = 1;
x += 2;

if (x > 0) { ... } else { ... }
while (n < 10) { n++; }
for (let i = 0; i < 10; i++) { ... }

function add(a, b) {
  return a + b;
}
console.log(add(1, 2));

let a = [10, 20];
console.log(a[0]);
a.push(40);
```

Arithmetic, assignment, comparison, logic, and bitwise operators are supported (`+` is add unless a side is a known string, then it becomes join). `while` / `for` lower to `repeat until`; `while (true)` becomes `forever`. Each function is a warp custom block; `return` uses a sprite `__return` variable.

Scratch lists are **1-based**; the compiler adds 1 to JS indexes. `loadList("file.txt")` reads a UTF-8 file at compile time (path relative to the `.js` file) and bakes each line into the list.

**Not in this subset:** objects, `import`/`export`, `async`/`await`, `try`/`catch`, loop `break`/`continue`, arrow functions, nested functions, template literals, regex, destructuring, `**` (use `Math.pow`). Switch `break` is supported.

See [`js2scratch/README.md`](js2scratch/README.md) for operators, bitwise lowering, `switch`, and the full unsupported list.

---

## Builtins

These are compile-time names, not real objects. `Math`, `console`, `pen`, and `loadList` cannot be assigned or passed around.

| Call | Scratch |
|---|---|
| `console.log(...)` | say (args joined with spaces) |
| `loadList("file.txt")` | sprite list, one item per line |
| `Math.abs` / `floor` / `ceil` / `round` / `sqrt` / `sin` / `cos` / … | matching math ops |
| `Math.random()` | pick random 0.0 to 1.0 |
| `pen.clear()` / `pen.down()` / `pen.up()` / `pen.stamp()` | pen extension |
| `pen.setColor("#4C97FF")` / `pen.setSize(3)` | pen color / size |
| `move(steps)` / `turnRight(deg)` / `goTo(x, y)` | motion |
| `hide()` / `show()` / `wait(seconds)` | looks / control |
| `keyPressed("space")` / `mouseX()` / `mouseY()` / `mouseDown()` / `timer()` / `resetTimer()` | sensing |
| `showVariable("fps")` | show variable monitor |
| `getCloudVariable(i)` / `setCloudVariable(i, value)` | 10 stage cloud variables (`☁ cloud0`–`☁ cloud9`); constant indexes compile to a direct get/set |

The sprite must **move** after `pen.down()` or nothing visible is drawn.

---

## Examples

- [`examples/js/hello_world`](examples/js/hello_world) — `console.log("Hello World!")`
- [`examples/js/functions`](examples/js/functions) — `add` + `console.log(add(1, 2))`
- [`examples/js/pen`](examples/js/pen) — pen spiral
- [`examples/js/space_invaders`](examples/js/space_invaders) — CHIP-8 emulator with Space Invaders ROM
- [`examples/js/nes`](examples/js/nes) — NROM NES emulator (6502 + PPU). Bundled ROM is nestest; swap games with `python rom_to_txt.py game.nes`
- [`examples/js/engine3d`](examples/js/engine3d) — textured scanline 3D plaza. WASD move, arrows look.
- [`examples/js/ps1`](examples/js/ps1) — PlayStation 1 emulator (GT2 Arcade). TurboWarp; huge `.sb3` when the disc is baked. Folder is `ps1` because Windows cannot distinguish `psx` from the existing `PSX` tree.

Try a project in the browser or dump a headless run (see [`js2scratch/RUN.md`](js2scratch/RUN.md)):

```bash
python -m js2scratch.run examples/js/pen
python -m js2scratch.run examples/js/engine3d --headless --frames 2 --timeout 120
```

---

## How compilation works

1. **Parse** the file into an AST (JS subset).
2. **Collect** functions vs top-level statements; classify names as variables or lists.
3. **Lower** expressions to `(prelude stack blocks, reporter)`. Pure math stays nested; user calls are stack blocks whose result lives in `__return` (copied to a temp if a later call would clobber it).
4. **Emit** `Define` scripts for each function, then `WhenFlagClicked` for top-level code.

Scratch has no returning reporters for custom blocks, which is why functions use `__return`.

---

## Python backend (`scratch3`)

js2scratch emits Scratch blocks through a Python library in this repo. You can also build `.sb3` files with nested constructors if you need to bypass the JS frontend:

```python
from scratch3 import Project
from scratch3.blocks import *

project = Project()
cat = project.add_sprite("Cat")
cat.add_script(WhenFlagClicked(GoToXY(0, 0), Repeat(10, Move(10), TurnRight(15))))
project.save("hello.sb3")
```

That API is an implementation detail of this project, not the main interface.
