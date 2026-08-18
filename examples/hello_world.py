"""Hello-world Scratch 3 project generated from Python."""

from pathlib import Path

from scratch3 import Project
from scratch3.blocks import Bounce, GoToXY, If, Move, Repeat, Say, Touching, TurnRight, WhenFlagClicked

project = Project("Hello World")
cat = project.add_sprite("Cat")

cat.add_script(
    WhenFlagClicked(
        GoToXY(0, 0),
        Repeat(
            10,
            Move(10),
            TurnRight(15),
            Say("Hello!", 0.5),
        ),
        If(
            Touching("edge"),
            Bounce(),
        ),
    )
)

output = Path(__file__).with_name("hello_world.sb3")
project.save(output)
print(f"Wrote {output}")
