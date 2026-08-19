# Running and debugging js2scratch programs

Compile with `python -m js2scratch … -o out.sb3` when you want Scratch / TurboWarp. Use the **runner** when you want to execute the same `.js` files *before* compiling, so you can tell **source bugs** from **compiler bugs**.

Language reference: [`README.md`](README.md).

## Two modes

| | Browser | Headless |
|---|---|---|
| Command | `python -m js2scratch.run <path>` | `python -m js2scratch.run <path> --headless` |
| Who it is for | You, watching the stage | Agents and scripts that need files, not a window |
| `wait(0)` | Yields one animation frame | Counts a frame and continues immediately (turbo) |
| Keyboard | Live | `--keys` held for the whole run |
| Mouse | Live (`mouseX` / `mouseY` / `mouseDown`) | Center, not pressed |
| Output | 480×360 stage, say bubble, monitors | `.js2s-debug/` artifacts, then the process exits |

Same project layout as compile: a folder of sprite `.js` files plus optional `project.json`, or a single `.js` file.

Requires **Python 3.10+**. Headless also needs **Node.js** (`node` on `PATH`, or `C:\Program Files\nodejs\node.exe` on Windows).

---

## Browser

```bash
python -m js2scratch.run examples/js/hello_world
python -m js2scratch.run examples/js/pen
python -m js2scratch.run examples/js/engine3d
```

Serves `http://127.0.0.1:<port>/` and opens a browser. Green flag auto-starts once; Stop kills the workers.

| Flag | Meaning |
|---|---|
| `--host` | Bind address (default `127.0.0.1`) |
| `--port` | Port (default: pick a free one) |
| `--no-browser` | Print the URL only |

Do not open `index.html` as a file. The server sends COOP/COEP headers so `SharedArrayBuffer` can implement blocking `wait`.

`showVariable("fps")` shows a monitor if that name is a sprite binding. The runner rewrites `let` / `const` tokens to `var` so those names exist on the worker global.

---

## Headless debugger

```bash
python -m js2scratch.run examples/js/hello_world --headless
python -m js2scratch.run examples/js/engine3d --headless --frames 2 --timeout 120
python -m js2scratch.run examples/js/engine3d --headless --frames 5 --keys w
python -m js2scratch.run examples/js/ps1 --headless --frames 1 --timeout 180 --debug-dir tmp/ps1-run
```

This is the mode to use when an AI agent (or CI) should debug a project: run, exit, then read the dump.

### Flags

| Flag | Default | Meaning |
|---|---|---|
| `--headless` | off | Run in Node, write artifacts, exit |
| `--frames N` | `3` | Stop after `N` calls to `wait()` (including `wait(0)`) |
| `--timeout SEC` | `60` | Kill the Node process after this many seconds |
| `--debug-dir DIR` | `<project>/.js2s-debug` | Where to write artifacts |
| `--keys LIST` | empty | Comma-separated Scratch key names held down the whole run |

Key names match the language (`w`, `space`, `left arrow`, `enter`, …). Example: `--keys "w,left arrow"`.

Scripts that **never** call `wait` (hello world, the pen spiral) run to completion; `--frames` is ignored except as a cap you never hit. Forever loops (`while (true) { … wait(0); }`) **must** use `--frames` or they run until `--timeout`.

`.js2s-debug/` is gitignored.

### Artifacts

| File | Contents |
|---|---|
| `summary.json` | Machine-readable result (see below) |
| `run.log` | `console.log` / Scratch say, one line per call |
| `error.txt` | Present only on throw/timeout: message + stack |
| `last-frame.png` | 480×360 stage after the last `wait()` or when the script returns |
| `last-frame.rgba` / `last-frame.json` | Raw pixels + `{width,height,bytes}` (PNG is built from these) |
| `<Sprite>.rewritten.js` | Source as executed (`let`/`const` → `var`) |
| `stdout.txt` / `stderr.txt` | Node process streams, if any |

Several sprites in one folder: artifacts go in `--debug-dir/<SpriteName>/`.

### `summary.json`

```json
{
  "ok": true,
  "frames": 2,
  "elapsed_ms": 1840,
  "logs": ["WASD move, arrows look, Q/E up/down"],
  "vars": { "fps": 0 },
  "pose": { "x": 0, "y": 0, "direction": 90, "visible": false },
  "error": null,
  "stop": "frames",
  "width": 480,
  "height": 360
}
```

| Field | Meaning |
|---|---|
| `ok` | `true` if the script returned or hit `--frames` without throwing |
| `frames` | How many times `wait()` ran |
| `logs` | Same lines as `run.log` |
| `vars` | Last values from `showVariable("name")` |
| `pose` | Sprite x/y/direction/visible after the last present |
| `error` | Stack string, or `null` |
| `stop` | `"frames"` (hit `--frames`), `"return"` (script ended), or `"error"` |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Script finished, or stopped at `--frames` |
| `1` | Uncaught exception or timeout |
| `2` | Node.js not found |

### How to debug from the dump

1. **`ok` is false** — read `error.txt`. Stack paths refer to `*.rewritten.js` (same lines as the original except `const` is shorter than `var` padding). If it throws here, it is a **source** bug (or a runner gap), not Scratch lowering.
2. **`ok` is true but the picture is wrong** — open `last-frame.png`. Empty/black usually means the program never drew (or never reached `wait` / the end).
3. **Logic / HUD** — `run.log` and `summary.json` → `vars`.
4. **Needs input** — re-run with `--keys`. Keys are sticky for the whole process; there is no per-frame input tape yet.
5. **Right in headless, wrong in Scratch** — look at the compiler (especially bitwise LUT lowering). Headless uses native JS `& | ^ <<`.

Raise `--timeout` for heavy examples (`engine3d`, `nes`, `ps1`). A PS1 slice can take a long time per `wait(0)`; start with `--frames 1`. Huge `loadBin` discs can exhaust Node memory — BIOS + stub disc is enough to see whether boot throws.

### Python

```python
from pathlib import Path
from js2scratch.run import discover_project, run_headless

project = discover_project(Path("examples/js/hello_world"))
code = run_headless(project, Path("tmp/hello-run"), frames=1, timeout=15)
# then read tmp/hello-run/summary.json
```

---

## What the runner implements

Globals from the language docs: motion, pen, `wait`, `keyPressed`, `mouseX` / `mouseY` / `mouseDown`, `timer` / `resetTimer`, `console.log`, `showVariable`, `getCloudVariable` / `setCloudVariable`, `loadList` / `loadBin`, and `Math.*` with **degree** trig (`sin`/`cos`/`tan`/`asin`/`acos`/`atan`), matching Scratch. Cloud variables are a local 10-slot array (not Scratch's servers).

Not a Scratch VM: no clones, broadcasts, extra hats, sounds, or TurboWarp warp. Pen is a 480×360 pixel buffer (fast horizontal/vertical spans). Costume stamp is a placeholder triangle.

---

## Isolating source vs compiler

```
js2scratch .js  -->  runner (this doc)  -->  if wrong, fix the JavaScript
                -->  compile to .sb3    -->  if runner was right and Scratch is wrong, fix js2scratch
```
