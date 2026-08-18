"""Compile a JavaScript subset into Scratch 3 projects."""

from js2scratch.compiler import compile_into, compile_js
from js2scratch.errors import CompileError
from js2scratch.parser import parse
from js2scratch.project_loader import compile_project

__all__ = [
    "CompileError",
    "compile_into",
    "compile_js",
    "compile_project",
    "parse",
]
