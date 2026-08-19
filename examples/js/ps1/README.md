# PS1 (GT2 Arcade) — js2scratch

PlayStation 1 emulator in the js2scratch subset, aimed at **Gran Turismo 2 Arcade Mode** (same device set as [`../PSX/ps1-scratch/js`](../PSX/ps1-scratch/js)). One sprite (`Cat.js`), pen display, keyboard pad. The example folder is `examples/js/ps1` so it does not collide with `examples/js/PSX` on Windows.

Stock Scratch cannot hold this project or run enough MIPS. Use **[TurboWarp](https://turbowarp.org/editor)**.

This is far below real time (hundreds of thousands of MIPS ops per PS1 frame vs a few thousand Scratch steps). That is expected.

## Files

| Path | Role |
|---|---|
| `Cat.js` | Full emulator (generated from the JS core; you can also edit it directly) |
| `project.json` | `{ "name": "PS1 (GT2 Arcade)" }` |
| `bios.bin` | SCPH-1001 BIOS, 512 KB (gitignored; extract locally) |
| `gt2.bin` | GT2 Arcade BIN, little-endian u32 list via `loadBin` (gitignored; not committed) |
| `gen_cat.py` | Regenerates `Cat.js` from the JS port |

## BIOS

Extract the same dump the JS port uses:

```bash
python examples/js/PSX/ps1-scratch/tools/bios_extract.py
```

Copy `examples/js/PSX/ps1-scratch/js/data/bios.bin` to `examples/js/ps1/bios.bin` (512 KB). `gen_cat.py` copies it if that source exists.

## Disc

Place **Gran Turismo 2 (USA) (Arcade Mode) (Rev 1).bin** (729,606,864 bytes) either:

- next to the `.cue` under `examples/js/PSX/ps1-scratch/Gran Turismo 2 (USA) (Arcade Mode) (Rev 1)/`, or
- as `examples/js/ps1/gt2.bin`

`Cat.js` calls `loadBin` on whichever path `gen_cat.py` found. A tiny stub `gt2.bin` is enough to **compile**; it is not enough to boot the game. Replace it with the real dump for CD `GetID`, sector DMA, and gameplay.

Do not commit the BIN or the built `.sb3`.

## Compile and run

Regenerate the sprite (optional, if you changed the JS core or this generator):

```bash
python examples/js/ps1/gen_cat.py
```

For a fast compile check without the 730 MB disc, bake a tiny stub instead:

```bash
python examples/js/ps1/gen_cat.py --stub-disc
python -m js2scratch examples/js/ps1 -o psx.sb3
```

Then regenerate without `--stub-disc` so `Cat.js` points at the real BIN before a full TurboWarp build.

Compile (BIOS-only / stub disc is relatively quick; a full 730 MB disc makes a **0.5–1 GB** `.sb3` and takes a long time):

```bash
python -m js2scratch examples/js/ps1 -o psx.sb3
```

Open `psx.sb3` in TurboWarp (**File → Load from your computer**). Enable Turbo Mode.

### Controls

Same mapping as the JS/SDL frontend: **X / A / W / D / S / Z / C / Q / E / 1 / 3**, arrows, enter.

### Display

Default `pixelStep = 2` (GT2 is typically 320×240 → ~160×120 pen cells). Set `pixelStep = 1` in `bootFill` for a sharper (much slower) blit. Display-off (`gpustat` bit `0x800000`) skips the blit. SPU is a register/DMA/IRQ stub; there is no audio.

`STEPS_PER_SLICE` (default 1000) is how many `psx_update` calls run between `wait(0)` yields.

## Regenerating Cat.js

```bash
python examples/js/ps1/gen_cat.py
```

Use `--stub-disc` to point `loadBin` at a tiny `gt2.bin` while iterating on the compiler. Omit it so `Cat.js` bakes the real GT2 BIN path.

The generator flattens the JS modules into the js2scratch subset (no objects, no array parameters, no loop `break`/`continue`, packed RAM/BIOS/disc as u32 lists).
