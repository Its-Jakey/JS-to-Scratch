"""Write RGBA pixels as a PNG using only the standard library."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def write_png_rgba(path: str | Path, width: int, height: int, rgba: bytes) -> None:
    expected = width * height * 4
    if len(rgba) != expected:
        raise ValueError(f"RGBA length {len(rgba)} != {expected} ({width}x{height})")

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    rows = bytearray()
    stride = width * 4
    for y in range(height):
        rows.append(0)
        rows.extend(rgba[y * stride : (y + 1) * stride])
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + chunk(b"IEND", b"")
    )
    Path(path).write_bytes(png)
