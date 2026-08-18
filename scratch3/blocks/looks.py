"""Looks blocks."""

from __future__ import annotations

from typing import Any

from scratch3.blocks.spec import (
    FRONT_BACK_ALIASES,
    LAYER_ALIASES,
    LOOKS_EFFECT_ALIASES,
    NUMBER_NAME_ALIASES,
    Field,
    Integer,
    Menu,
    Number,
    ReporterBlock,
    StackBlock,
    String,
)


class Say(StackBlock):
    """say ()  or  say () for () seconds when secs is given."""

    opcode = "looks_say"
    input_specs = (String("MESSAGE", "Hello!"),)

    def __init__(self, message: Any = "Hello!", secs: Any = None, **kwargs: Any) -> None:
        if secs is None:
            self.opcode = "looks_say"
            self.input_specs = (String("MESSAGE", "Hello!"),)
            super().__init__(message, **kwargs)
        else:
            self.opcode = "looks_sayforsecs"
            self.input_specs = (String("MESSAGE", "Hello!"), Number("SECS", 2))
            super().__init__(message, secs, **kwargs)


class SayFor(StackBlock):
    opcode = "looks_sayforsecs"
    input_specs = (String("MESSAGE", "Hello!"), Number("SECS", 2))


class Think(StackBlock):
    opcode = "looks_think"
    input_specs = (String("MESSAGE", "Hmm..."),)

    def __init__(self, message: Any = "Hmm...", secs: Any = None, **kwargs: Any) -> None:
        if secs is None:
            self.opcode = "looks_think"
            self.input_specs = (String("MESSAGE", "Hmm..."),)
            super().__init__(message, **kwargs)
        else:
            self.opcode = "looks_thinkforsecs"
            self.input_specs = (String("MESSAGE", "Hmm..."), Number("SECS", 2))
            super().__init__(message, secs, **kwargs)


class ThinkFor(StackBlock):
    opcode = "looks_thinkforsecs"
    input_specs = (String("MESSAGE", "Hmm..."), Number("SECS", 2))


class SwitchCostume(StackBlock):
    opcode = "looks_switchcostumeto"
    input_specs = (Menu("COSTUME", "looks_costume", "COSTUME", "costume1"),)


class NextCostume(StackBlock):
    opcode = "looks_nextcostume"


class SwitchBackdrop(StackBlock):
    opcode = "looks_switchbackdropto"
    input_specs = (Menu("BACKDROP", "looks_backdrops", "BACKDROP", "backdrop1"),)


class SwitchBackdropAndWait(StackBlock):
    opcode = "looks_switchbackdroptoandwait"
    input_specs = (Menu("BACKDROP", "looks_backdrops", "BACKDROP", "backdrop1"),)


class NextBackdrop(StackBlock):
    opcode = "looks_nextbackdrop"


class ChangeSize(StackBlock):
    opcode = "looks_changesizeby"
    input_specs = (Number("CHANGE", 10),)


class SetSize(StackBlock):
    opcode = "looks_setsizeto"
    input_specs = (Number("SIZE", 100),)


class ChangeEffect(StackBlock):
    opcode = "looks_changeeffectby"
    field_specs = (Field("EFFECT", "COLOR", aliases=LOOKS_EFFECT_ALIASES),)
    input_specs = (Number("CHANGE", 25),)


class SetEffect(StackBlock):
    opcode = "looks_seteffectto"
    field_specs = (Field("EFFECT", "COLOR", aliases=LOOKS_EFFECT_ALIASES),)
    input_specs = (Number("VALUE", 0),)


class ClearGraphicEffects(StackBlock):
    opcode = "looks_cleargraphiceffects"


class Show(StackBlock):
    opcode = "looks_show"


class Hide(StackBlock):
    opcode = "looks_hide"


class GoToLayer(StackBlock):
    opcode = "looks_gotofrontback"
    field_specs = (Field("FRONT_BACK", "front", aliases=FRONT_BACK_ALIASES),)


class GoLayers(StackBlock):
    opcode = "looks_goforwardbackwardlayers"
    field_specs = (Field("FORWARD_BACKWARD", "forward", aliases=LAYER_ALIASES),)
    input_specs = (Integer("NUM", 1),)


class CostumeNumberName(ReporterBlock):
    opcode = "looks_costumenumbername"
    field_specs = (Field("NUMBER_NAME", "number", aliases=NUMBER_NAME_ALIASES),)


class BackdropNumberName(ReporterBlock):
    opcode = "looks_backdropnumbername"
    field_specs = (Field("NUMBER_NAME", "number", aliases=NUMBER_NAME_ALIASES),)


class Size(ReporterBlock):
    opcode = "looks_size"
