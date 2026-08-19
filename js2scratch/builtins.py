"""Builtin mappings for console.log, Math.*, pen.*, and drawing motion."""

from __future__ import annotations

from scratch3.blocks import (
    Bounce,
    ChangePenParam,
    ChangePenSize,
    ChangeX,
    ChangeY,
    Direction,
    EraseAll,
    GoToXY,
    Hide,
    KeyPressed,
    Move,
    PenDown,
    PenUp,
    PointInDirection,
    ResetTimer,
    SetPenColor,
    SetPenParam,
    SetPenSize,
    SetX,
    SetY,
    Show,
    Stamp,
    Timer,
    TurnLeft,
    TurnRight,
    Wait,
    XPosition,
    YPosition,
)

MATH_UNARY = {
    "abs": "abs",
    "floor": "floor",
    "ceil": "ceiling",
    "sqrt": "sqrt",
    "sin": "sin",
    "cos": "cos",
    "tan": "tan",
    "asin": "asin",
    "acos": "acos",
    "atan": "atan",
    "log": "ln",
    "log10": "log",
    "exp": "e ^",
}

MATH_SPECIAL = {"round", "random", "pow", "max", "min"}

ALLOWED_MATH = set(MATH_UNARY) | MATH_SPECIAL

RESERVED_BUILTINS = {"Math", "console", "pen", "loadList", "loadBin"}

# name -> (arg_count, factory)  factory(*lowered_values) -> stack block
PEN_METHODS = {
    "clear": (0, lambda: EraseAll()),
    "eraseAll": (0, lambda: EraseAll()),
    "down": (0, lambda: PenDown()),
    "up": (0, lambda: PenUp()),
    "stamp": (0, lambda: Stamp()),
    "setColor": (1, lambda color: SetPenColor(color)),
    "setSize": (1, lambda size: SetPenSize(size)),
    "changeSize": (1, lambda size: ChangePenSize(size)),
    "setParam": (2, lambda param, value: SetPenParam(param, value)),
    "changeParam": (2, lambda param, value: ChangePenParam(param, value)),
}

# Drawing-related globals (motion + a few looks/control helpers).
# name -> (arg_count, factory, kind)  kind is "stack" or "reporter"
DRAW_BUILTINS = {
    "move": (1, lambda steps: Move(steps), "stack"),
    "turnRight": (1, lambda deg: TurnRight(deg), "stack"),
    "turnLeft": (1, lambda deg: TurnLeft(deg), "stack"),
    "goTo": (2, lambda x, y: GoToXY(x, y), "stack"),
    "setX": (1, lambda x: SetX(x), "stack"),
    "setY": (1, lambda y: SetY(y), "stack"),
    "changeX": (1, lambda dx: ChangeX(dx), "stack"),
    "changeY": (1, lambda dy: ChangeY(dy), "stack"),
    "pointInDirection": (1, lambda direction: PointInDirection(direction), "stack"),
    "bounce": (0, lambda: Bounce(), "stack"),
    "hide": (0, lambda: Hide(), "stack"),
    "show": (0, lambda: Show(), "stack"),
    "wait": (1, lambda secs: Wait(secs), "stack"),
    "xPosition": (0, lambda: XPosition(), "reporter"),
    "yPosition": (0, lambda: YPosition(), "reporter"),
    "direction": (0, lambda: Direction(), "reporter"),
    "keyPressed": (1, lambda key: KeyPressed(key), "boolean"),
    "timer": (0, lambda: Timer(), "reporter"),
    "resetTimer": (0, lambda: ResetTimer(), "stack"),
}
