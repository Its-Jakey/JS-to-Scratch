from scratch3 import Project
from scratch3.blocks import *

project = Project()
cat = project.add_sprite("Cat")
cat.add_script(
    WhenFlagClicked(
        EraseAll(),
        SetPenColor("#4C97FF"),
        SetPenSize(3),
        PenDown(),
        Repeat(36, Move(10), TurnRight(10)),
        PenUp(),
    )
)
project.save("pen.sb3")