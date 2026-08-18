"""Convert an iNES .nes ROM to a one-byte-per-line text list for loadList()."""

from __future__ import annotations

import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        sys.stderr.write("usage: rom_to_txt.py <rom.nes> [rom.txt]\n")
        return 1
    src = Path(argv[1])
    dst = Path(argv[2]) if len(argv) > 2 else src.with_name("rom.txt")
    data = src.read_bytes()
    if data[:4] != b"NES\x1a":
        sys.stderr.write("warning: not an iNES file (missing NES\\x1a header)\n")
    dst.write_text("\n".join(str(b) for b in data) + "\n", encoding="utf-8")
    print(f"wrote {len(data)} bytes to {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
