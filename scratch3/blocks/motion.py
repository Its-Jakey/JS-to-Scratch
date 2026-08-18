"""Motion blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    GOTO_ALIASES,
    POINT_ALIASES,
    ROTATION_ALIASES,
    Angle,
    Field,
    Menu,
    Number,
    ReporterBlock,
    StackBlock,
)


class Move(StackBlock):
    opcode = "motion_movesteps"
    input_specs = (Number("STEPS", 10),)


class TurnRight(StackBlock):
    opcode = "motion_turnright"
    input_specs = (Number("DEGREES", 15),)


class TurnLeft(StackBlock):
    opcode = "motion_turnleft"
    input_specs = (Number("DEGREES", 15),)


class GoTo(StackBlock):
    opcode = "motion_goto"
    input_specs = (
        Menu("TO", "motion_goto_menu", "TO", "_random_", GOTO_ALIASES),
    )


class GoToXY(StackBlock):
    opcode = "motion_gotoxy"
    input_specs = (Number("X", 0), Number("Y", 0))


class Glide(StackBlock):
    opcode = "motion_glideto"
    input_specs = (
        Number("SECS", 1),
        Menu("TO", "motion_glideto_menu", "TO", "_random_", GOTO_ALIASES),
    )


class GlideToXY(StackBlock):
    opcode = "motion_glidesecstoxy"
    input_specs = (Number("SECS", 1), Number("X", 0), Number("Y", 0))


class PointInDirection(StackBlock):
    opcode = "motion_pointindirection"
    input_specs = (Angle("DIRECTION", 90),)


class PointTowards(StackBlock):
    opcode = "motion_pointtowards"
    input_specs = (
        Menu("TOWARDS", "motion_pointtowards_menu", "TOWARDS", "_mouse_", POINT_ALIASES),
    )


class ChangeX(StackBlock):
    opcode = "motion_changexby"
    input_specs = (Number("DX", 10),)


class SetX(StackBlock):
    opcode = "motion_setx"
    input_specs = (Number("X", 0),)


class ChangeY(StackBlock):
    opcode = "motion_changeyby"
    input_specs = (Number("DY", 10),)


class SetY(StackBlock):
    opcode = "motion_sety"
    input_specs = (Number("Y", 0),)


class Bounce(StackBlock):
    opcode = "motion_ifonedgebounce"


class SetRotationStyle(StackBlock):
    opcode = "motion_setrotationstyle"
    field_specs = (Field("STYLE", "all around", aliases=ROTATION_ALIASES),)


class XPosition(ReporterBlock):
    opcode = "motion_xposition"


class YPosition(ReporterBlock):
    opcode = "motion_yposition"


class Direction(ReporterBlock):
    opcode = "motion_direction"
