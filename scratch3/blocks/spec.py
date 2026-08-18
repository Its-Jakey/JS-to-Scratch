"""Block AST, input/field specs, and per-block SB3 serialization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from scratch3.ids import new_id
from scratch3.refs import Broadcast, List, Variable

PRIMITIVE = {
    "number": 4,
    "positive_number": 5,
    "whole_number": 6,
    "integer": 7,
    "angle": 8,
    "color": 9,
    "string": 10,
    "broadcast": 11,
}

SHADOW_ONLY = 1
BLOCK_ONLY = 2
BLOCK_COVERING_SHADOW = 3


@dataclass(frozen=True)
class InputSpec:
    name: str
    kind: str
    default: Any = None
    menu_opcode: str | None = None
    menu_field: str | None = None
    aliases: dict[str, str] | None = None


@dataclass(frozen=True)
class FieldSpec:
    name: str
    default: Any = None
    ref: str | None = None  # "variable" | "list" | "broadcast"
    aliases: dict[str, str] | None = None


def Number(name: str, default: Any = 0) -> InputSpec:
    return InputSpec(name, "number", default)


def PositiveNumber(name: str, default: Any = 1) -> InputSpec:
    return InputSpec(name, "positive_number", default)


def WholeNumber(name: str, default: Any = 10) -> InputSpec:
    return InputSpec(name, "whole_number", default)


def Integer(name: str, default: Any = 1) -> InputSpec:
    return InputSpec(name, "integer", default)


def Angle(name: str, default: Any = 90) -> InputSpec:
    return InputSpec(name, "angle", default)


def String(name: str, default: Any = "") -> InputSpec:
    return InputSpec(name, "string", default)


def Color(name: str, default: Any = "#4C97FF") -> InputSpec:
    return InputSpec(name, "color", default)


def Boolean(name: str) -> InputSpec:
    return InputSpec(name, "boolean")


def Substack(name: str) -> InputSpec:
    return InputSpec(name, "substack")


def BroadcastIn(name: str = "BROADCAST_INPUT") -> InputSpec:
    return InputSpec(name, "broadcast", None)


def Menu(
    name: str,
    opcode: str,
    field: str,
    default: Any,
    aliases: dict[str, str] | None = None,
) -> InputSpec:
    return InputSpec(name, "menu", default, opcode, field, aliases)


def Field(
    name: str,
    default: Any = None,
    ref: str | None = None,
    aliases: dict[str, str] | None = None,
) -> FieldSpec:
    return FieldSpec(name, default, ref, aliases)


GOTO_ALIASES = {
    "random position": "_random_",
    "random": "_random_",
    "mouse-pointer": "_mouse_",
    "mouse pointer": "_mouse_",
    "mouse": "_mouse_",
}
POINT_ALIASES = {
    "mouse-pointer": "_mouse_",
    "mouse pointer": "_mouse_",
    "mouse": "_mouse_",
}
TOUCHING_ALIASES = {
    **POINT_ALIASES,
    "edge": "_edge_",
}
CLONE_ALIASES = {
    "myself": "_myself_",
}
OBJECT_ALIASES = {
    "stage": "_stage_",
    "Stage": "_stage_",
}
KEY_ALIASES = {
    "up": "up arrow",
    "down": "down arrow",
    "left": "left arrow",
    "right": "right arrow",
}
LOOKS_EFFECT_ALIASES = {
    "color": "COLOR",
    "fisheye": "FISHEYE",
    "whirl": "WHIRL",
    "pixelate": "PIXELATE",
    "mosaic": "MOSAIC",
    "brightness": "BRIGHTNESS",
    "ghost": "GHOST",
}
SOUND_EFFECT_ALIASES = {
    "pitch": "PITCH",
    "pan": "PAN",
    "pan left/right": "PAN",
    "pan left / right": "PAN",
}
CURRENT_ALIASES = {
    "year": "YEAR",
    "month": "MONTH",
    "date": "DATE",
    "day of week": "DAYOFWEEK",
    "dayofweek": "DAYOFWEEK",
    "hour": "HOUR",
    "minute": "MINUTE",
    "second": "SECOND",
}
FRONT_BACK_ALIASES = {"front": "front", "back": "back"}
LAYER_ALIASES = {"forward": "forward", "backward": "backward"}
NUMBER_NAME_ALIASES = {"number": "number", "name": "name"}
DRAG_ALIASES = {"draggable": "draggable", "not draggable": "not draggable"}
STOP_ALIASES = {
    "all": "all",
    "this script": "this script",
    "other scripts in sprite": "other scripts in sprite",
    "other scripts in stage": "other scripts in stage",
}
WHENGREATER_ALIASES = {"loudness": "LOUDNESS", "timer": "TIMER"}
ROTATION_ALIASES = {
    "all around": "all around",
    "left-right": "left-right",
    "left right": "left-right",
    "don't rotate": "don't rotate",
    "do not rotate": "don't rotate",
    "dont rotate": "don't rotate",
}


class SerializeContext:
    def __init__(self, target: Any, project: Any) -> None:
        self.target = target
        self.project = project
        self.blocks: dict[str, Any] = {}

    def new_id(self) -> str:
        return new_id()

    def resolve_variable(self, value: Any) -> Variable:
        if isinstance(value, Variable):
            return value
        name = str(value)
        found = self.target.find_variable(name)
        if found is None and not getattr(self.target, "is_stage", False):
            found = self.project.stage.find_variable(name)
        if found is not None:
            return found
        return self.target.variable(name)

    def resolve_list(self, value: Any) -> List:
        if isinstance(value, List):
            return value
        name = str(value)
        found = self.target.find_list(name)
        if found is None and not getattr(self.target, "is_stage", False):
            found = self.project.stage.find_list(name)
        if found is not None:
            return found
        return self.target.list(name)

    def resolve_broadcast(self, value: Any) -> Broadcast:
        if isinstance(value, Broadcast):
            self.project.register_broadcast(value)
            return value
        return self.project.broadcast(str(value))


def _normalize(value: Any, aliases: dict[str, str] | None) -> Any:
    if aliases and isinstance(value, str):
        if value in aliases:
            return aliases[value]
        lowered = value.lower()
        for key, mapped in aliases.items():
            if key.lower() == lowered:
                return mapped
    return value


def _as_stack(value: Any) -> list[Block]:
    if value is None:
        return []
    if isinstance(value, Block):
        return [value]
    if isinstance(value, (list, tuple)):
        blocks: list[Block] = []
        for item in value:
            blocks.extend(_as_stack(item))
        return blocks
    raise TypeError(f"Expected block or list of blocks, got {type(value)!r}")


def _is_decimal_color(value: Any) -> bool:
    """True for a 24-bit (or ARGB) Scratch color given as a number."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _color_hex(value: Any) -> str:
    if isinstance(value, (tuple, list)) and len(value) >= 3:
        r, g, b = (int(value[0]), int(value[1]), int(value[2]))
        return f"#{r:02x}{g:02x}{b:02x}"
    if _is_decimal_color(value):
        n = int(value)
        if n < 0:
            n += 0x1000000
        return f"#{n & 0xFFFFFF:06x}"
    text = str(value)
    if not text.startswith("#"):
        text = "#" + text
    return text


def _primitive_array(kind: str, value: Any, ctx: SerializeContext) -> list[Any]:
    if kind == "color":
        return [PRIMITIVE["color"], _color_hex(value)]
    if kind == "broadcast":
        broadcast = ctx.resolve_broadcast(value)
        return [PRIMITIVE["broadcast"], broadcast.name, broadcast.id]
    if kind in PRIMITIVE:
        if value is None:
            value = ""
        if kind in {
            "number",
            "positive_number",
            "whole_number",
            "integer",
            "angle",
        }:
            return [PRIMITIVE[kind], str(value)]
        return [PRIMITIVE[kind], str(value)]
    raise ValueError(f"No primitive for kind {kind}")


def _variable_primitive(variable: Variable) -> list[Any]:
    return [12, variable.name, variable.id]


def _list_primitive(lst: List) -> list[Any]:
    return [13, lst.name, lst.id]


class Block:
    opcode: str = ""
    kind: str = "stack"
    input_specs: tuple[InputSpec, ...] = ()
    field_specs: tuple[FieldSpec, ...] = ()
    arg_order: tuple[str, ...] | None = None

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.x = kwargs.pop("x", None)
        self.y = kwargs.pop("y", None)
        self.fields: dict[str, Any] = {}
        self.inputs: dict[str, Any] = {}
        self.stack: list[Block] = []
        self._mutation_extra: dict[str, Any] = {}
        positional = list(args)

        substack_specs = [spec for spec in self.input_specs if spec.kind == "substack"]
        value_specs = [spec for spec in self.input_specs if spec.kind != "substack"]
        specs_by_name: dict[str, InputSpec | FieldSpec] = {
            spec.name: spec for spec in (*self.field_specs, *value_specs)
        }
        if self.arg_order:
            ordered: list[InputSpec | FieldSpec] = [specs_by_name[name] for name in self.arg_order]
            for spec in (*self.field_specs, *value_specs):
                if spec not in ordered:
                    ordered.append(spec)
        else:
            ordered = [*self.field_specs, *value_specs]
        for spec in ordered:
            value = _take(spec.name, spec.default, positional, kwargs)
            if isinstance(spec, FieldSpec):
                self.fields[spec.name] = value
            else:
                self.inputs[spec.name] = value

        if self.kind == "hat":
            self.stack = [item for item in positional if item is not None]
            positional = []
        elif len(substack_specs) == 1:
            then_kw = kwargs.pop("then", None)
            if then_kw is not None:
                self.inputs[substack_specs[0].name] = _as_stack(then_kw)
            else:
                self.inputs[substack_specs[0].name] = _as_stack(positional)
            positional = []
        elif len(substack_specs) == 2:
            then = kwargs.pop("then", None)
            else_ = kwargs.pop("else_", kwargs.pop("else", None))
            if then is None and positional:
                then = positional.pop(0)
            if else_ is None and positional:
                else_ = positional.pop(0)
            self.inputs[substack_specs[0].name] = _as_stack(then)
            self.inputs[substack_specs[1].name] = _as_stack(else_)

        leftover = {key: value for key, value in kwargs.items() if not key.startswith("_")}
        if leftover:
            raise TypeError(f"{type(self).__name__} unexpected arguments: {sorted(leftover)}")
        unexpected_pos = [item for item in positional if item is not None]
        if unexpected_pos:
            raise TypeError(
                f"{type(self).__name__} got unexpected extra arguments: {unexpected_pos!r}"
            )

    def mutation(self, ctx: SerializeContext) -> dict[str, Any] | None:
        return None

    def serialize(self, ctx: SerializeContext, parent_id: str | None, top_level: bool) -> str:
        block_id = ctx.new_id()
        inputs: dict[str, Any] = {}
        fields: dict[str, Any] = {}

        for spec in self.field_specs:
            raw = self.fields.get(spec.name, spec.default)
            fields[spec.name] = _serialize_field(spec, raw, ctx)

        for spec in self.input_specs:
            raw = self.inputs.get(spec.name)
            encoded = _serialize_input(spec, raw, ctx, block_id)
            if encoded is not None:
                inputs[spec.name] = encoded

        node: dict[str, Any] = {
            "opcode": self.opcode,
            "next": None,
            "parent": parent_id,
            "inputs": inputs,
            "fields": fields,
            "shadow": False,
            "topLevel": top_level,
        }
        if top_level:
            node["x"] = 0 if self.x is None else self.x
            node["y"] = 0 if self.y is None else self.y
        mutation = self.mutation(ctx)
        if mutation is not None:
            node["mutation"] = mutation
        ctx.blocks[block_id] = node
        return block_id


class StackBlock(Block):
    kind = "stack"


class HatBlock(Block):
    kind = "hat"


class CapBlock(Block):
    kind = "cap"


class ReporterBlock(Block):
    kind = "reporter"


class BooleanBlock(Block):
    kind = "boolean"


def _take(name: str, default: Any, positional: list[Any], kwargs: dict[str, Any]) -> Any:
    if name in kwargs:
        return kwargs.pop(name)
    lowered = name.lower()
    for key in list(kwargs):
        if key.lower() == lowered:
            return kwargs.pop(key)
    if positional:
        return positional.pop(0)
    return default


def _serialize_field(spec: FieldSpec, raw: Any, ctx: SerializeContext) -> list[Any]:
    if spec.ref == "variable":
        variable = ctx.resolve_variable(raw)
        return [variable.name, variable.id]
    if spec.ref == "list":
        lst = ctx.resolve_list(raw)
        return [lst.name, lst.id]
    if spec.ref == "broadcast":
        broadcast = ctx.resolve_broadcast(raw)
        return [broadcast.name, broadcast.id]
    value = _normalize(raw, spec.aliases)
    if value is None:
        value = spec.default
    return [value, None]


def _serialize_stack(blocks: Sequence[Block], ctx: SerializeContext, parent_id: str) -> str | None:
    expanded: list[Block] = []
    for block in blocks:
        if block is None:
            continue
        expanded.append(block)
        if block.stack:
            expanded.extend(block.stack)
    if not expanded:
        return None
    ids = [block.serialize(ctx, parent_id, False) for block in expanded]
    for index, block_id in enumerate(ids):
        node = ctx.blocks[block_id]
        node["topLevel"] = False
        if index == 0:
            node["parent"] = parent_id
        else:
            node["parent"] = ids[index - 1]
        if index + 1 < len(ids) and _allows_next(node):
            node["next"] = ids[index + 1]
        else:
            node["next"] = None
    return ids[0]


def _allows_next(node: dict[str, Any]) -> bool:
    opcode = node.get("opcode")
    if opcode in {"control_forever", "control_delete_this_clone"}:
        return False
    if opcode == "control_stop":
        return str((node.get("mutation") or {}).get("hasnext", "false")) == "true"
    return True


def serialize_script(head: Block, ctx: SerializeContext, x: int, y: int) -> str:
    following = list(head.stack)
    head_id = head.serialize(ctx, None, True)
    node = ctx.blocks[head_id]
    node["x"] = x if head.x is None else head.x
    node["y"] = y if head.y is None else head.y
    next_id = _serialize_stack(following, ctx, head_id)
    node["next"] = next_id
    return head_id


def _serialize_input(
    spec: InputSpec,
    raw: Any,
    ctx: SerializeContext,
    parent_id: str,
) -> list[Any] | None:
    if spec.kind == "substack":
        stack = raw if isinstance(raw, list) else _as_stack(raw)
        first = _serialize_stack(stack, ctx, parent_id)
        return [BLOCK_ONLY, first]

    if spec.kind == "boolean":
        if raw is None:
            return None
        if isinstance(raw, Block):
            child_id = raw.serialize(ctx, parent_id, False)
            ctx.blocks[child_id]["parent"] = parent_id
            ctx.blocks[child_id]["topLevel"] = False
            return [BLOCK_ONLY, child_id]
        raise TypeError(f"Boolean input {spec.name} expected a block, got {raw!r}")

    covering = None
    shadow_value = spec.default

    if isinstance(raw, Variable):
        covering = _variable_primitive(raw)
    elif isinstance(raw, List):
        covering = _list_primitive(raw)
    elif isinstance(raw, Broadcast) and spec.kind != "broadcast":
        covering = [11, raw.name, raw.id]
    elif isinstance(raw, Block):
        child_id = raw.serialize(ctx, parent_id, False)
        ctx.blocks[child_id]["parent"] = parent_id
        ctx.blocks[child_id]["topLevel"] = False
        covering = child_id
    elif spec.kind == "menu":
        return [SHADOW_ONLY, _serialize_menu(spec, raw, ctx, parent_id)]
    elif spec.kind == "broadcast":
        if raw is None:
            raw = "message1"
        return [SHADOW_ONLY, _primitive_array("broadcast", raw, ctx)]
    elif raw is None:
        if shadow_value is None and spec.kind != "string":
            return None
        value = "" if shadow_value is None else shadow_value
        return [SHADOW_ONLY, _primitive_array(spec.kind, value, ctx)]
    elif spec.kind == "color" and _is_decimal_color(raw):
        # Scratch accepts packed RGB/ARGB integers in the color slot. Emitting
        # them as a color primitive would prefix "#" and parse the digits as hex.
        covering = _primitive_array("number", raw, ctx)
        default = spec.default if spec.default is not None else "#9966FF"
        shadow = _primitive_array("color", default, ctx)
        return [BLOCK_COVERING_SHADOW, covering, shadow]
    else:
        # Literal fills the shadow itself.
        return [SHADOW_ONLY, _primitive_array(spec.kind, raw, ctx)]

    shadow = None
    if spec.kind == "menu":
        shadow = _serialize_menu(spec, spec.default, ctx, parent_id)
    elif spec.kind in PRIMITIVE:
        default = spec.default if spec.default is not None else ("" if spec.kind == "string" else 0)
        shadow = _primitive_array(spec.kind, default, ctx)

    if shadow is None:
        return [BLOCK_ONLY, covering]
    return [BLOCK_COVERING_SHADOW, covering, shadow]


def _serialize_menu(spec: InputSpec, raw: Any, ctx: SerializeContext, parent_id: str) -> str:
    value = spec.default if raw is None else raw
    value = _normalize(value, spec.aliases)
    menu_id = ctx.new_id()
    ctx.blocks[menu_id] = {
        "opcode": spec.menu_opcode,
        "next": None,
        "parent": parent_id,
        "inputs": {},
        "fields": {spec.menu_field: [value, None]},
        "shadow": True,
        "topLevel": False,
    }
    return menu_id
