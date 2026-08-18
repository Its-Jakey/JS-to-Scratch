# scratch3

Generate Scratch 3.0 `.sb3` files from Python.

```python
from scratch3 import Project
from scratch3.blocks import *

project = Project()
cat = project.add_sprite("Cat")

cat.add_script(
    WhenFlagClicked(
        GoToXY(0, 0),
        Repeat(10, Move(10), TurnRight(15), Say("Hello!", 0.5)),
        If(Touching("edge"), Bounce()),
    )
)

project.save("hello.sb3")
```

Open the file in the [Scratch editor](https://scratch.mit.edu/projects/editor/) (**File → Load from your computer**).

Requires Python 3.10+. No third-party runtime dependencies.

```bash
pip install -e .
python examples/hello_world.py
```

---

## How it works

Scripts are **nested constructors**, not a fluent chain. Hats take a body, C-blocks take nested stacks, reporters nest as arguments, literals become the correct Scratch shadow.

```python
WhenFlagClicked(          # hat
    Repeat(10,            # C-block; remaining args are the body
        Move(10),         # stack block; 10 is a number shadow
        If(Touching("edge"), Bounce()),
    ),
)
```

Two equivalent ways to attach a script:

```python
sprite.add_script(WhenFlagClicked(Move(10), Say("hi")))
sprite.add_script(WhenFlagClicked(), Move(10), Say("hi"))
```

Drop a reporter into any input:

```python
Move(Add(XPosition(), 10))
If(Touching("edge"), Bounce())
If(And(KeyPressed("space"), Touching("edge")), Bounce())
```

There is no `x + y`. Use `Add(x, y)`.

---

## Project, stage, sprites

```python
project = Project("My Game")          # name is for you; Scratch files don't store it
stage = project.stage                 # always exists, named "Stage"
cat = project.add_sprite("Cat")       # Sprite1, Sprite2, ... if you omit the name
dog = project.add_sprite(
    "Dog",
    x=100, y=-40, size=80, direction=90,
    visible=True, draggable=False,
    rotation_style="all around",      # also: "left-right", "don't rotate"
)
```

Put scripts on the stage the same way:

```python
project.stage.add_script(WhenFlagClicked(SwitchBackdrop("backdrop1")))
```

`project.save("game.sb3")` writes a ZIP. `project.to_dict()` returns the `project.json` as a Python dict.

If a sprite or the stage has no costumes, a default SVG is added so Scratch will load the file.

---

## Costumes and sounds

```python
cat.add_costume("cat.svg")                          # path; name from filename
cat.add_costume("hat.png", name="hat")
cat.add_costume(svg_bytes, name="blob", data_format="svg")
cat.add_costume("wide.png", rotation_center=(48, 20))

cat.add_sound("meow.wav")
cat.add_sound(wav_bytes, name="pop", data_format="wav")

project.stage.add_costume("forest.svg", name="Forest")  # backdrop
```

SVG, PNG, and JPEG costumes work. WAV/MP3 sounds work. Rotation center is inferred from image size when omitted.

Scratch costume/sound names are what you pass to `SwitchCostume("hat")` and `PlaySound("meow")`.

---

## Variables, lists, broadcasts

Create them on the **project** (global / stage) or on a **sprite** (local):

```python
score = project.variable("score", 0)
lives = project.variable("lives", 3, show=True)     # show=True → stage monitor
cloud = project.variable("high score", 0, cloud=True)

inventory = project.list("inventory", ["sword"])
words = project.list("words", from_file="words.txt")  # one item per line
local_ammo = cat.variable("ammo", 10)               # sprite-local

ping = project.broadcast("ping")
```

Use the objects in blocks (IDs stay consistent):

```python
cat.add_script(
    WhenFlagClicked(
        SetVariable(score, 0),
        ChangeVariable(score, 1),
        AddToList("potion", inventory),
        Broadcast(ping),
    )
)
cat.add_script(WhenIReceive(ping, Say(score)))      # variable as a reporter
```

Strings also work (`SetVariable("score", 1)`). Missing names are created on the current sprite.

`show=True` adds a monitor to the stage. `ShowVariable(score)` / `HideVariable(score)` still work as blocks.

`from_file` reads a UTF-8 text file (path relative to the working directory). Each line becomes one list item. Integer and decimal lines are stored as numbers; everything else stays a string. You can also load the lines first with `load_list_file("words.txt")` if you want to edit them before `project.list(...)`.

---

## Custom blocks (My Blocks)

`%s` = text/number input, `%b` = boolean input. `warp=True` runs without screen refresh.

```python
jump = CustomBlock("jump %s", ["height"], warp=True)

cat.add_script(
    Define(
        jump,
        ChangeY(jump["height"]),
        Wait(0.2),
        ChangeY(Subtract(0, jump["height"])),
    )
)
cat.add_script(WhenFlagClicked(jump(50)))
```

`jump["height"]` is the argument reporter inside the definition. `jump(50)` is a call.

---

## Control-flow shapes

```python
Wait(1)
Repeat(10, Move(10), TurnRight(15))
Forever(Move(1))
If(Touching("edge"), Bounce())
IfElse(KeyPressed("space"), [Move(10), Say("go")], Say("no"))
WaitUntil(KeyPressed("space"))
RepeatUntil(Touching("edge"), Move(10))
Stop("all")                       # also: "this script", "other scripts in sprite"
CreateClone("myself")             # or a sprite name
WhenIStartAsClone(Show(), Forever(Move(1)))
DeleteThisClone()
```

`IfElse` then/else can be one block or a list of blocks.

---

## Block reference

Import with `from scratch3.blocks import *` or individual names.

Dropdowns accept the Scratch labels (`"mouse-pointer"`, `"random position"`, `"edge"`, `"myself"`) or the internal ids (`"_mouse_"`, `"_random_"`, `"_edge_"`, `"_myself_"`). Colors are `"#rrggbb"` or `(r, g, b)`.

### Motion

| Python | Scratch |
|---|---|
| `Move(10)` | move () steps |
| `TurnRight(15)` / `TurnLeft(15)` | turn ↻ / ↺ () degrees |
| `GoTo("random position")` | go to (random position / mouse-pointer / sprite) |
| `GoToXY(0, 0)` | go to x: () y: () |
| `Glide(1, "random position")` | glide () secs to () |
| `GlideToXY(1, 0, 0)` | glide () secs to x: () y: () |
| `PointInDirection(90)` | point in direction () |
| `PointTowards("mouse-pointer")` | point towards () |
| `ChangeX(10)` / `SetX(0)` | change x by / set x to |
| `ChangeY(10)` / `SetY(0)` | change y by / set y to |
| `Bounce()` | if on edge, bounce |
| `SetRotationStyle("left-right")` | set rotation style (`all around`, `left-right`, `don't rotate`) |
| `XPosition()` / `YPosition()` / `Direction()` | reporters |

### Looks

| Python | Scratch |
|---|---|
| `Say("Hello!")` | say () |
| `Say("Hello!", 2)` or `SayFor("Hello!", 2)` | say () for () seconds |
| `Think("Hmm...")` / `Think("Hmm...", 2)` / `ThinkFor(...)` | think |
| `SwitchCostume("costume1")` | switch costume to |
| `NextCostume()` | next costume |
| `SwitchBackdrop("backdrop1")` | switch backdrop to |
| `SwitchBackdropAndWait("backdrop1")` | switch backdrop to () and wait |
| `NextBackdrop()` | next backdrop |
| `ChangeSize(10)` / `SetSize(100)` | size |
| `ChangeEffect("color", 25)` / `SetEffect("ghost", 50)` | graphic effects |
| `ClearGraphicEffects()` | clear graphic effects |
| `Show()` / `Hide()` | show / hide |
| `GoToLayer("front")` | go to (front / back) layer |
| `GoLayers("forward", 1)` | go (forward / backward) () layers |
| `CostumeNumberName("number")` | costume (number / name) |
| `BackdropNumberName("name")` | backdrop (number / name) |
| `Size()` | size reporter |

Looks effects: `color`, `fisheye`, `whirl`, `pixelate`, `mosaic`, `brightness`, `ghost`.

### Sound

| Python | Scratch |
|---|---|
| `PlaySoundUntilDone("pop")` | play sound () until done |
| `PlaySound("pop")` | start sound () |
| `StopAllSounds()` | stop all sounds |
| `ChangeSoundEffect("pitch", 10)` | change [pitch / pan] effect by |
| `SetSoundEffect("pan", 0)` | set [pitch / pan] effect to |
| `ClearSoundEffects()` | clear sound effects |
| `ChangeVolume(-10)` / `SetVolume(100)` | volume |
| `Volume()` | volume reporter |

### Events

| Python | Scratch |
|---|---|
| `WhenFlagClicked(...)` | when green flag clicked |
| `WhenKeyPressed("space", ...)` | when [key] key pressed |
| `WhenThisSpriteClicked(...)` | when this sprite clicked |
| `WhenStageClicked(...)` | when stage clicked |
| `WhenBackdropSwitchesTo("backdrop1", ...)` | when backdrop switches to |
| `WhenGreaterThan("loudness", 10, ...)` | when [loudness / timer] > () |
| `WhenIReceive(ping, ...)` | when I receive |
| `Broadcast(ping)` | broadcast |
| `BroadcastAndWait(ping)` | broadcast and wait |

Keys: `space`, `any`, letters, digits, `up arrow` (or `up`), `down arrow`, `left arrow`, `right arrow`.

`Broadcast` here is the **stack block**. The message object comes from `project.broadcast("ping")`.

### Control

Covered above. Clone target: `"myself"` or a sprite name.

### Sensing

| Python | Scratch |
|---|---|
| `Touching("edge")` | touching (mouse-pointer / edge / sprite)? |
| `TouchingColor("#4C97FF")` | touching color? |
| `ColorTouchingColor("#4C97FF", "#FFAB19")` | color is touching color? |
| `DistanceTo("mouse-pointer")` | distance to |
| `AskAndWait("Name?")` | ask () and wait |
| `Answer()` | answer |
| `KeyPressed("space")` | key () pressed? |
| `MouseDown()` / `MouseX()` / `MouseY()` | mouse |
| `SetDragMode("draggable")` | set drag mode (`draggable` / `not draggable`) |
| `Loudness()` | loudness |
| `Timer()` / `ResetTimer()` | timer |
| `AttributeOf("x position", "Cat")` | () of () |
| `Current("year")` | current |
| `DaysSince2000()` | days since 2000 |
| `Username()` | username |

`AttributeOf` object: sprite name, or `"Stage"` / `"_stage_"`.

Sprite properties: `x position`, `y position`, `direction`, `costume #`, `costume name`, `size`, `volume`.

Stage properties: `backdrop #`, `backdrop name`, `volume`.

`Current`: `year`, `month`, `date`, `day of week`, `hour`, `minute`, `second`.

### Operators

| Python | Scratch |
|---|---|
| `Add(a, b)` `Subtract` `Multiply` `Divide` | + − × ÷ |
| `PickRandom(1, 10)` | pick random |
| `GreaterThan(a, b)` `LessThan` `Equals` | > < = |
| `And(a, b)` `Or(a, b)` `Not(a)` | and / or / not |
| `Join("a", "b")` | join |
| `LetterOf(1, "apple")` | letter () of () |
| `LengthOf("apple")` | length of |
| `Contains("apple", "a")` | () contains ()? |
| `Mod(a, b)` | mod |
| `Round(a)` | round |
| `MathOp("abs", n)` | () of () |

`MathOp` operators: `abs`, `floor`, `ceiling` (or `ceil`), `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `ln`, `log`, `e ^`, `10 ^`.

### Variables and lists

| Python | Scratch |
|---|---|
| `SetVariable(score, 0)` | set [score] to |
| `ChangeVariable(score, 1)` | change [score] by |
| `ShowVariable(score)` / `HideVariable(score)` | show / hide variable |
| `VariableReporter(score)` | `(score)` as its own block |
| `AddToList(item, inventory)` | add () to [list] |
| `DeleteOfList(1, inventory)` | delete () of |
| `DeleteAllOfList(inventory)` | delete all of |
| `InsertAtList(item, 1, inventory)` | insert () at () of |
| `ReplaceItemOfList(1, inventory, item)` | replace item () of () with () |
| `ItemOfList(1, inventory)` | item () of |
| `ItemNumOfList(item, inventory)` | item # of () in |
| `LengthOfList(inventory)` | length of |
| `ListContains(inventory, item)` | [list] contains ()? |
| `ShowList` / `HideList` | show / hide list |
| `ListReporter(inventory)` | `(inventory)` as its own block |

Passing a `Variable` into another block's input (e.g. `Say(score)`) is enough; you usually don't need `VariableReporter`.

`project.list("words", from_file="words.txt")` (or `sprite.list(...)`) preloads the list from a text file so you do not need a stack of `AddToList` blocks.

### Pen

Using any pen block adds `"pen"` to the project extensions list.

| Python | Scratch |
|---|---|
| `EraseAll()` | erase all |
| `Stamp()` | stamp |
| `PenDown()` / `PenUp()` | pen down / up |
| `SetPenColor("#4C97FF")` | set pen color to |
| `ChangePenParam("color", 10)` | change pen [color] by |
| `SetPenParam("saturation", 50)` | set pen [color] to |
| `ChangePenSize(1)` / `SetPenSize(3)` | pen size |

Pen params: `color`, `saturation`, `brightness`, `transparency`.

---

## Not included

- Other extensions (Music, Video Sensing, Translate, Text to Speech, hardware, Face Sensing)
- Hidden leftover blocks (while, counter, stretch, scroll, …)

Motion blocks on the stage still serialize; Scratch no-ops most of them at runtime.

---

## Examples

- [`examples/hello_world.py`](examples/hello_world.py)
- [`examples/pen_test.py`](examples/pen_test.py)
- [`examples/js/engine3d`](examples/js/engine3d) — textured 3D plaza (js2scratch; WASD + arrows)

---

## JavaScript subset (`js2scratch`)

Compile a stripped-down JavaScript into `.sb3` files (same block library, different front end). Language reference: [`js2scratch/README.md`](js2scratch/README.md).

```bash
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
