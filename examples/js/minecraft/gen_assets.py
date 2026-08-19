"""Slice Beta 1.7 terrain.png / items.png into loadList RGB files.

No third-party deps: PNG decode uses zlib + struct. Magenta (terrain) and
near-black (items) become 0 so the rasterizer can skip transparent texels.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PACK = ROOT / "texture pack"
TEX = 16
MAGENTA = (255, 0, 255)


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def decode_png(path: Path) -> tuple[int, int, list[tuple[int, int, int, int]]]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    pos = 8
    width = height = 0
    bit_depth = 8
    color_type = 2
    palette: list[tuple[int, int, int, int]] = []
    idat = bytearray()
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        tag = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if tag == b"IHDR":
            width, height, bit_depth, color_type, comp, filt, inter = struct.unpack(
                ">IIBBBBB", chunk
            )
            if comp != 0 or filt != 0 or inter != 0:
                raise ValueError(f"unsupported PNG flags in {path}")
            if bit_depth != 8:
                raise ValueError(f"need 8-bit PNG: {path}")
        elif tag == b"PLTE":
            for i in range(0, len(chunk), 3):
                palette.append((chunk[i], chunk[i + 1], chunk[i + 2], 255))
        elif tag == b"tRNS":
            if color_type == 3:
                for i, alpha in enumerate(chunk):
                    if i < len(palette):
                        r, g, b, _ = palette[i]
                        palette[i] = (r, g, b, alpha)
        elif tag == b"IDAT":
            idat.extend(chunk)
        elif tag == b"IEND":
            break

    raw = zlib.decompress(bytes(idat))
    if color_type == 2:
        bpp = 3
    elif color_type == 6:
        bpp = 4
    elif color_type == 3:
        bpp = 1
    elif color_type == 0:
        bpp = 1
    elif color_type == 4:
        bpp = 2
    else:
        raise ValueError(f"unsupported color type {color_type} in {path}")

    stride = width * bpp
    rows: list[bytearray] = []
    src = 0
    prev = bytearray(stride)
    for _ in range(height):
        ftype = raw[src]
        src += 1
        row = bytearray(raw[src : src + stride])
        src += stride
        if ftype == 1:
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + left) & 255
        elif ftype == 2:
            for i in range(stride):
                row[i] = (row[i] + prev[i]) & 255
        elif ftype == 3:
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + ((left + prev[i]) // 2)) & 255
        elif ftype == 4:
            for i in range(stride):
                left = row[i - bpp] if i >= bpp else 0
                up = prev[i]
                ul = prev[i - bpp] if i >= bpp else 0
                row[i] = (row[i] + _paeth(left, up, ul)) & 255
        elif ftype != 0:
            raise ValueError(f"unsupported filter {ftype} in {path}")
        rows.append(row)
        prev = row

    pixels: list[tuple[int, int, int, int]] = []
    for y in range(height):
        row = rows[y]
        for x in range(width):
            i = x * bpp
            if color_type == 2:
                pixels.append((row[i], row[i + 1], row[i + 2], 255))
            elif color_type == 6:
                pixels.append((row[i], row[i + 1], row[i + 2], row[i + 3]))
            elif color_type == 3:
                pixels.append(palette[row[i]])
            elif color_type == 0:
                g = row[i]
                pixels.append((g, g, g, 255))
            else:
                g = row[i]
                pixels.append((g, g, g, row[i + 1]))
    return width, height, pixels


def tile_pixels(
    pixels: list[tuple[int, int, int, int]],
    atlas_w: int,
    index: int,
    tile: int = TEX,
) -> list[tuple[int, int, int, int]]:
    cols = atlas_w // tile
    tx = (index % cols) * tile
    ty = (index // cols) * tile
    out = []
    for y in range(tile):
        for x in range(tile):
            out.append(pixels[(ty + y) * atlas_w + (tx + x)])
    return out


def pack_rgb(r: int, g: int, b: int) -> int:
    return (r << 16) + (g << 8) + b


def is_magenta(p: tuple[int, int, int, int]) -> bool:
    r, g, b, a = p
    if a < 16:
        return True
    return r >= 240 and g <= 16 and b >= 240


def is_item_empty(p: tuple[int, int, int, int]) -> bool:
    r, g, b, a = p
    if a < 16:
        return True
    return r + g + b < 12


def packed_tile(
    pixels: list[tuple[int, int, int, int]],
    atlas_w: int,
    index: int,
    empty,
) -> list[int]:
    vals = []
    for r, g, b, a in tile_pixels(pixels, atlas_w, index):
        if empty((r, g, b, a)):
            vals.append(0)
        else:
            vals.append(pack_rgb(r, g, b))
    return vals


def write_list(path: Path, values: list[int]) -> None:
    path.write_text("\n".join(str(v) for v in values) + "\n", encoding="utf-8")


# terrain.png indices (Beta 1.7 layout, confirmed against this pack).
BLOCK_TILES = [
    ("grass_top", 0),
    ("stone", 1),
    ("dirt", 2),
    ("grass_side", 3),
    ("planks", 4),
    ("cobble", 16),
    ("bedrock", 17),
    ("sand", 18),
    ("gravel", 19),
    ("log_side", 20),
    ("log_top", 21),
    ("chest_side", 26),
    ("chest_front", 27),
    ("gold_ore", 32),
    ("iron_ore", 33),
    ("coal_ore", 34),
    ("craft_top", 43),
    ("craft_front", 59),
    ("craft_side", 60),
    ("furnace_side", 45),
    ("furnace_front", 44),
    ("furnace_lit", 61),
    ("glass", 49),
    ("leaves", 52),
    ("water", 205),
    ("torch", 80),
    ("brick", 7),
]

# items.png: (name, col, row) in 16x16 cells.
ITEM_TILES = [
    ("stick", 5, 3),
    ("coal", 7, 0),
    ("iron_ingot", 7, 1),
    ("gold_ingot", 7, 2),
    ("diamond", 7, 3),
    ("apple", 10, 0),
    ("bread", 9, 2),
    ("pork_raw", 7, 5),
    ("pork_cooked", 8, 5),
    ("wood_sword", 0, 4),
    ("wood_shovel", 0, 5),
    ("wood_pick", 0, 6),
    ("wood_axe", 0, 7),
    ("stone_sword", 1, 4),
    ("stone_shovel", 1, 5),
    ("stone_pick", 1, 6),
    ("stone_axe", 1, 7),
    ("iron_sword", 2, 4),
    ("iron_shovel", 2, 5),
    ("iron_pick", 2, 6),
    ("iron_axe", 2, 7),
]


def dump_tile_stats(path: Path, empty) -> None:
    w, h, pixels = decode_png(path)
    cols = w // TEX
    rows = h // TEX
    print(f"{path.name}: {w}x{h} ({cols}x{rows} tiles)")
    for i in range(cols * rows):
        tile = tile_pixels(pixels, w, i)
        used = [p for p in tile if not empty(p)]
        if len(used) < 8:
            continue
        n = len(used)
        r = sum(p[0] for p in used) // n
        g = sum(p[1] for p in used) // n
        b = sum(p[2] for p in used) // n
        print(f"  {i:3d} r{i // cols:02d}c{i % cols:02d} avg=({r:3d},{g:3d},{b:3d}) n={n}")


def main() -> None:
    terrain = PACK / "terrain.png"
    items = PACK / "gui" / "items.png"
    tw, th, tpix = decode_png(terrain)
    iw, ih, ipix = decode_png(items)

    block_vals: list[int] = []
    print("block tex ids:")
    for i, (name, index) in enumerate(BLOCK_TILES):
        vals = packed_tile(tpix, tw, index, is_magenta)
        solid = sum(1 for v in vals if v)
        print(f"  {i:2d} {name:14s} terrain[{index:3d}] solid={solid}")
        block_vals.extend(vals)
    write_list(ROOT / "blocks.txt", block_vals)

    item_vals: list[int] = []
    print("item tex ids:")
    for i, (name, col, row) in enumerate(ITEM_TILES):
        index = row * (iw // TEX) + col
        vals = packed_tile(ipix, iw, index, is_item_empty)
        solid = sum(1 for v in vals if v)
        print(f"  {i:2d} {name:14s} items[{index:3d}] solid={solid}")
        item_vals.extend(vals)
    write_list(ROOT / "items.txt", item_vals)
    print(f"wrote {ROOT / 'blocks.txt'} ({len(block_vals)} px)")
    print(f"wrote {ROOT / 'items.txt'} ({len(item_vals)} px)")


if __name__ == "__main__":
    main()
