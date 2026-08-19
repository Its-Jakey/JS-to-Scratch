"""Rewrite js2scratch sprite source so it can run as a classic script."""

from __future__ import annotations

from js2scratch.errors import CompileError
from js2scratch.lexer import tokenize


def rewrite_let_const_to_var(source: str, filename: str | None = None) -> str:
    """Replace ``let`` / ``const`` keywords with ``var``.

    js2scratch treats all three as mutable sprite/function bindings. ``var``
    also puts top-level names on the worker global, which ``showVariable``
    needs. Strings and comments are left alone because this uses the lexer.
    """
    try:
        tokens = tokenize(source, filename)
    except CompileError:
        return source

    chunks: list[str] = []
    last = 0
    for token in tokens:
        if token.type not in ("let", "const"):
            continue
        chunks.append(source[last : token.start])
        chunks.append("var")
        last = token.start + len(token.type)
    chunks.append(source[last:])
    return "".join(chunks)
