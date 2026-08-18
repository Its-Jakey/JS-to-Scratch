"""First-class references for variables, lists, and broadcasts."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from scratch3.ids import new_id

_INT_RE = re.compile(r"[+-]?\d+")
_FLOAT_RE = re.compile(r"[+-]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?")


def parse_list_line(line: str) -> Any:
    """Turn one text-file line into a Scratch list item."""
    text = line.strip()
    if text == "":
        return ""
    if _INT_RE.fullmatch(text):
        return int(text)
    if _FLOAT_RE.fullmatch(text):
        return float(text)
    return text


def load_list_file(path: str | Path) -> list[Any]:
    """Load a Scratch list from a text file (one item per line).

    Integer and decimal lines become numbers; everything else stays a string.
    A trailing newline does not add an extra empty item.
    """
    text = Path(path).read_text(encoding="utf-8-sig")
    return [parse_list_line(line) for line in text.splitlines()]


@dataclass
class Variable:
    name: str
    value: Any = 0
    cloud: bool = False
    show: bool = False
    id: str = field(default_factory=new_id)
    sprite_name: str | None = None  # None means stage (global)


@dataclass
class List:
    name: str
    values: list[Any] = field(default_factory=list)
    show: bool = False
    id: str = field(default_factory=new_id)
    sprite_name: str | None = None


@dataclass
class Broadcast:
    name: str
    id: str = field(default_factory=new_id)
