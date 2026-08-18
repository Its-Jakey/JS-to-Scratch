"""Control blocks."""

from __future__ import annotations

from typing import Any

from scratch3.blocks.spec import (
    CLONE_ALIASES,
    STOP_ALIASES,
    Boolean,
    Field,
    HatBlock,
    Menu,
    PositiveNumber,
    SerializeContext,
    StackBlock,
    Substack,
    CapBlock,
    WholeNumber,
)


class Wait(StackBlock):
    opcode = "control_wait"
    input_specs = (PositiveNumber("DURATION", 1),)


class Repeat(StackBlock):
    opcode = "control_repeat"
    input_specs = (WholeNumber("TIMES", 10), Substack("SUBSTACK"))


class Forever(StackBlock):
    opcode = "control_forever"
    input_specs = (Substack("SUBSTACK"),)


class If(StackBlock):
    opcode = "control_if"
    input_specs = (Boolean("CONDITION"), Substack("SUBSTACK"))


class IfElse(StackBlock):
    opcode = "control_if_else"
    input_specs = (Boolean("CONDITION"), Substack("SUBSTACK"), Substack("SUBSTACK2"))


class WaitUntil(StackBlock):
    opcode = "control_wait_until"
    input_specs = (Boolean("CONDITION"),)


class RepeatUntil(StackBlock):
    opcode = "control_repeat_until"
    input_specs = (Boolean("CONDITION"), Substack("SUBSTACK"))


_STOP_HAS_NEXT = {
    "all": False,
    "this script": False,
    "other scripts in sprite": True,
    "other scripts in stage": True,
}


class Stop(StackBlock):
    opcode = "control_stop"
    field_specs = (Field("STOP_OPTION", "all", aliases=STOP_ALIASES),)

    def mutation(self, ctx: SerializeContext) -> dict[str, Any]:
        option = self.fields.get("STOP_OPTION", "all")
        from scratch3.blocks.spec import _normalize

        option = _normalize(option, STOP_ALIASES)
        has_next = _STOP_HAS_NEXT.get(str(option), False)
        return {
            "tagName": "mutation",
            "children": [],
            "hasnext": "true" if has_next else "false",
        }


class WhenIStartAsClone(HatBlock):
    opcode = "control_start_as_clone"


class CreateClone(StackBlock):
    opcode = "control_create_clone_of"
    input_specs = (
        Menu(
            "CLONE_OPTION",
            "control_create_clone_of_menu",
            "CLONE_OPTION",
            "_myself_",
            CLONE_ALIASES,
        ),
    )


class DeleteThisClone(CapBlock):
    opcode = "control_delete_this_clone"
