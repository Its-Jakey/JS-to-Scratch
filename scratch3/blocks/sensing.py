"""Sensing blocks."""

from __future__ import annotations

from scratch3.blocks.spec import (
    CURRENT_ALIASES,
    DRAG_ALIASES,
    KEY_ALIASES,
    OBJECT_ALIASES,
    POINT_ALIASES,
    TOUCHING_ALIASES,
    BooleanBlock,
    Color,
    Field,
    Menu,
    ReporterBlock,
    StackBlock,
    String,
)


class Touching(BooleanBlock):
    opcode = "sensing_touchingobject"
    input_specs = (
        Menu(
            "TOUCHINGOBJECTMENU",
            "sensing_touchingobjectmenu",
            "TOUCHINGOBJECTMENU",
            "_mouse_",
            TOUCHING_ALIASES,
        ),
    )


class TouchingColor(BooleanBlock):
    opcode = "sensing_touchingcolor"
    input_specs = (Color("COLOR", "#4C97FF"),)


class ColorTouchingColor(BooleanBlock):
    opcode = "sensing_coloristouchingcolor"
    input_specs = (Color("COLOR", "#4C97FF"), Color("COLOR2", "#FFAB19"))


class DistanceTo(ReporterBlock):
    opcode = "sensing_distanceto"
    input_specs = (
        Menu(
            "DISTANCETOMENU",
            "sensing_distancetomenu",
            "DISTANCETOMENU",
            "_mouse_",
            POINT_ALIASES,
        ),
    )


class AskAndWait(StackBlock):
    opcode = "sensing_askandwait"
    input_specs = (String("QUESTION", "What's your name?"),)


class Answer(ReporterBlock):
    opcode = "sensing_answer"


class KeyPressed(BooleanBlock):
    opcode = "sensing_keypressed"
    input_specs = (
        Menu("KEY_OPTION", "sensing_keyoptions", "KEY_OPTION", "space", KEY_ALIASES),
    )


class MouseDown(BooleanBlock):
    opcode = "sensing_mousedown"


class MouseX(ReporterBlock):
    opcode = "sensing_mousex"


class MouseY(ReporterBlock):
    opcode = "sensing_mousey"


class SetDragMode(StackBlock):
    opcode = "sensing_setdragmode"
    field_specs = (Field("DRAG_MODE", "draggable", aliases=DRAG_ALIASES),)


class Loudness(ReporterBlock):
    opcode = "sensing_loudness"


class Timer(ReporterBlock):
    opcode = "sensing_timer"


class ResetTimer(StackBlock):
    opcode = "sensing_resettimer"


class AttributeOf(ReporterBlock):
    opcode = "sensing_of"
    field_specs = (Field("PROPERTY", "x position"),)
    input_specs = (
        Menu("OBJECT", "sensing_of_object_menu", "OBJECT", "_stage_", OBJECT_ALIASES),
    )


class Current(ReporterBlock):
    opcode = "sensing_current"
    field_specs = (Field("CURRENTMENU", "YEAR", aliases=CURRENT_ALIASES),)


class DaysSince2000(ReporterBlock):
    opcode = "sensing_dayssince2000"


class Username(ReporterBlock):
    opcode = "sensing_username"
