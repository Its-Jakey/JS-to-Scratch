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
class BinaryU32Source:
    """List values packed as little-endian u32 words in a binary file.

    Used so huge assets (BIOS/disc images) are not fully loaded into Python
    lists before JSON serialization.
    """

    path: Path
    pack: int = 4


def iter_u32_le(path: str | Path, chunk_size: int = 1 << 20):
    """Yield unsigned little-endian 32-bit words from a binary file.

    A trailing partial word is zero-padded.
    """
    path = Path(path)
    with path.open("rb") as handle:
        buf = b""
        while True:
            chunk = handle.read(chunk_size)
            if not chunk:
                break
            buf += chunk
            n = len(buf) - (len(buf) % 4)
            mv = memoryview(buf)
            for i in range(0, n, 4):
                yield int.from_bytes(mv[i : i + 4], "little")
            buf = buf[n:]
        if buf:
            buf = buf + b"\x00" * (4 - len(buf) % 4)
            for i in range(0, len(buf), 4):
                yield int.from_bytes(buf[i : i + 4], "little")


@dataclass
class List:
    name: str
    values: list[Any] = field(default_factory=list)
    show: bool = False
    id: str = field(default_factory=new_id)
    sprite_name: str | None = None
    binary_source: BinaryU32Source | None = None


@dataclass
class Broadcast:
    name: str
    id: str = field(default_factory=new_id)
