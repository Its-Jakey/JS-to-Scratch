"""Pen extension blocks."""

from __future__ import annotations

from scratch3.blocks.spec import Color, Menu, Number, StackBlock

PEN_PARAM_ALIASES = {
    "color": "color",
    "colour": "color",
    "saturation": "saturation",
    "brightness": "brightness",
    "transparency": "transparency",
}


class EraseAll(StackBlock):
    opcode = "pen_clear"


class Stamp(StackBlock):
    opcode = "pen_stamp"


class PenDown(StackBlock):
    opcode = "pen_penDown"


class PenUp(StackBlock):
    opcode = "pen_penUp"


class SetPenColor(StackBlock):
    opcode = "pen_setPenColorToColor"
    input_specs = (Color("COLOR", "#9966FF"),)


class ChangePenParam(StackBlock):
    opcode = "pen_changePenColorParamBy"
    input_specs = (
        Menu(
            "COLOR_PARAM",
            "pen_menu_colorParam",
            "colorParam",
            "color",
            PEN_PARAM_ALIASES,
        ),
        Number("VALUE", 10),
    )


class SetPenParam(StackBlock):
    opcode = "pen_setPenColorParamTo"
    input_specs = (
        Menu(
            "COLOR_PARAM",
            "pen_menu_colorParam",
            "colorParam",
            "color",
            PEN_PARAM_ALIASES,
        ),
        Number("VALUE", 50),
    )


class ChangePenSize(StackBlock):
    opcode = "pen_changePenSizeBy"
    input_specs = (Number("SIZE", 1),)


class SetPenSize(StackBlock):
    opcode = "pen_setPenSizeTo"
    input_specs = (Number("SIZE", 1),)
