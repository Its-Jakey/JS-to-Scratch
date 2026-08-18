"""CLI: python -m js2scratch <file-or-folder> -o out.sb3"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from js2scratch.errors import CompileError
from js2scratch.project_loader import compile_project


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="js2scratch",
        description="Compile a JavaScript subset into a Scratch 3 .sb3 project.",
    )
    parser.add_argument("source", type=Path, help="A .js file or a folder of sprite .js files")
    parser.add_argument("-o", "--output", type=Path, help="Output .sb3 path")
    args = parser.parse_args(argv)

    try:
        project = compile_project(args.source)
    except CompileError as exc:
        print(exc, file=sys.stderr)
        return 1

    if args.output is not None:
        out = args.output
    elif args.source.is_dir():
        out = args.source / f"{project.name}.sb3"
    else:
        out = args.source.with_suffix(".sb3")

    project.save(out)
    print(f"Wrote {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
