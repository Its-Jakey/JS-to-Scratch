"""Stream JSON to a binary file object, including huge binary-backed lists."""

from __future__ import annotations

import json
from typing import Any, BinaryIO

from scratch3.refs import BinaryU32Source, iter_u32_le


def write_json(fp: BinaryIO, obj: Any) -> None:
    """Write `obj` as UTF-8 JSON to a binary stream."""
    if isinstance(obj, BinaryU32Source):
        _write_u32_array(fp, obj)
        return
    if isinstance(obj, dict):
        fp.write(b"{")
        first = True
        for key, value in obj.items():
            if not first:
                fp.write(b",")
            first = False
            fp.write(json.dumps(str(key), ensure_ascii=False).encode("utf-8"))
            fp.write(b":")
            write_json(fp, value)
        fp.write(b"}")
        return
    if isinstance(obj, (list, tuple)):
        fp.write(b"[")
        first = True
        for item in obj:
            if not first:
                fp.write(b",")
            first = False
            write_json(fp, item)
        fp.write(b"]")
        return
    if isinstance(obj, bool):
        fp.write(b"true" if obj else b"false")
        return
    if obj is None:
        fp.write(b"null")
        return
    if isinstance(obj, int) and not isinstance(obj, bool):
        fp.write(str(obj).encode("ascii"))
        return
    if isinstance(obj, float):
        fp.write(json.dumps(obj).encode("ascii"))
        return
    if isinstance(obj, str):
        fp.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))
        return
    fp.write(json.dumps(obj, ensure_ascii=False).encode("utf-8"))


def _write_u32_array(fp: BinaryIO, source: BinaryU32Source) -> None:
    fp.write(b"[")
    first = True
    for word in iter_u32_le(source.path):
        if not first:
            fp.write(b",")
        first = False
        fp.write(str(word).encode("ascii"))
    fp.write(b"]")
