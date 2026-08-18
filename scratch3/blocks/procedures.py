"""Custom blocks (My Blocks)."""

from __future__ import annotations

import json
from typing import Any, Sequence

from scratch3.blocks.spec import (
    Boolean,
    BooleanBlock,
    Field,
    HatBlock,
    ReporterBlock,
    SerializeContext,
    StackBlock,
    String,
)
from scratch3.ids import new_id


def _json_list(values: Sequence[Any]) -> str:
    return json.dumps(list(values), separators=(",", ":"))


class CustomBlock:
    """A custom block prototype that can be defined and called.

    ``proccode`` uses Scratch placeholders: ``%s`` for text/number, ``%b`` for boolean.
    """

    def __init__(
        self,
        proccode: str,
        arg_names: Sequence[str] | None = None,
        *,
        warp: bool = False,
    ) -> None:
        placeholders: list[str] = []
        remaining = proccode
        while True:
            s_at = remaining.find("%s")
            b_at = remaining.find("%b")
            if s_at < 0 and b_at < 0:
                break
            if s_at < 0:
                index = b_at
                kind = "%b"
            elif b_at < 0 or s_at < b_at:
                index = s_at
                kind = "%s"
            else:
                index = b_at
                kind = "%b"
            placeholders.append(kind)
            remaining = remaining[index + 2 :]

        if not placeholders and arg_names:
            kinds = ["%s"] * len(arg_names)
            proccode = proccode + "".join(" " + kind for kind in kinds)
            placeholders = kinds

        if arg_names is None:
            arg_names = [f"arg{i + 1}" for i in range(len(placeholders))]
        if len(arg_names) != len(placeholders):
            raise ValueError(
                f"proccode {proccode!r} has {len(placeholders)} inputs, "
                f"but {len(arg_names)} names were given"
            )
        self.proccode = proccode
        self.warp = warp
        self.arg_names = list(arg_names)
        self.arg_kinds = placeholders
        self.arg_ids = [new_id() for _ in arg_names]

    def __getitem__(self, name: str) -> Argument:
        if name not in self.arg_names:
            raise KeyError(name)
        index = self.arg_names.index(name)
        if self.arg_kinds[index] == "%b":
            return ArgumentBoolean(name)
        return Argument(name)

    def __call__(self, *args: Any) -> ProcedureCall:
        return ProcedureCall(self, args)


class Argument(ReporterBlock):
    opcode = "argument_reporter_string_number"
    field_specs = (Field("VALUE", ""),)

    def __init__(self, name: str, **kwargs: Any) -> None:
        super().__init__(name, **kwargs)


class ArgumentBoolean(BooleanBlock):
    opcode = "argument_reporter_boolean"
    field_specs = (Field("VALUE", ""),)

    def __init__(self, name: str, **kwargs: Any) -> None:
        super().__init__(name, **kwargs)


class ProcedureCall(StackBlock):
    opcode = "procedures_call"

    def __init__(self, prototype: CustomBlock, args: Sequence[Any], **kwargs: Any) -> None:
        self.prototype = prototype
        specs = []
        for arg_id, kind in zip(prototype.arg_ids, prototype.arg_kinds):
            if kind == "%b":
                specs.append(Boolean(arg_id))
            else:
                specs.append(String(arg_id, ""))
        self.input_specs = tuple(specs)
        super().__init__(*args, **kwargs)

    def mutation(self, ctx: SerializeContext) -> dict[str, Any]:
        proto = self.prototype
        return {
            "tagName": "mutation",
            "children": [],
            "proccode": proto.proccode,
            "argumentids": _json_list(proto.arg_ids),
            "warp": "true" if proto.warp else "false",
        }


class Define(HatBlock):
    opcode = "procedures_definition"

    def __init__(self, prototype: CustomBlock, *body: Any, **kwargs: Any) -> None:
        self.prototype = prototype
        super().__init__(*body, **kwargs)

    def serialize(self, ctx: SerializeContext, parent_id: str | None, top_level: bool) -> str:
        proto = self.prototype
        definition_id = ctx.new_id()
        prototype_id = ctx.new_id()

        prototype_inputs: dict[str, Any] = {}
        for arg_id, kind, name in zip(proto.arg_ids, proto.arg_kinds, proto.arg_names):
            editor_id = ctx.new_id()
            opcode = (
                "argument_editor_boolean"
                if kind == "%b"
                else "argument_editor_string_number"
            )
            ctx.blocks[editor_id] = {
                "opcode": opcode,
                "next": None,
                "parent": prototype_id,
                "inputs": {},
                "fields": {"TEXT": [name, None]},
                "shadow": True,
                "topLevel": False,
            }
            prototype_inputs[arg_id] = [1, editor_id]

        defaults = ["false" if kind == "%b" else "" for kind in proto.arg_kinds]
        ctx.blocks[prototype_id] = {
            "opcode": "procedures_prototype",
            "next": None,
            "parent": definition_id,
            "inputs": prototype_inputs,
            "fields": {},
            "shadow": True,
            "topLevel": False,
            "mutation": {
                "tagName": "mutation",
                "children": [],
                "proccode": proto.proccode,
                "argumentids": _json_list(proto.arg_ids),
                "argumentnames": _json_list(proto.arg_names),
                "argumentdefaults": _json_list(defaults),
                "warp": "true" if proto.warp else "false",
            },
        }
        ctx.blocks[definition_id] = {
            "opcode": "procedures_definition",
            "next": None,
            "parent": parent_id,
            "inputs": {"custom_block": [1, prototype_id]},
            "fields": {},
            "shadow": False,
            "topLevel": top_level,
        }
        if top_level:
            ctx.blocks[definition_id]["x"] = 0 if self.x is None else self.x
            ctx.blocks[definition_id]["y"] = 0 if self.y is None else self.y
        return definition_id
