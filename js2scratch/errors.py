"""Compiler and parser errors with source locations."""

from __future__ import annotations


class CompileError(Exception):
    """A parse or compile error at an optional source location."""

    def __init__(
        self,
        message: str,
        line: int | None = None,
        column: int | None = None,
        filename: str | None = None,
    ) -> None:
        self.message = message
        self.line = line
        self.column = column
        self.filename = filename
        super().__init__(self._format())

    def _format(self) -> str:
        parts: list[str] = []
        if self.filename:
            parts.append(str(self.filename))
        if self.line is not None:
            loc = str(self.line)
            if self.column is not None:
                loc += f":{self.column}"
            parts.append(loc)
        prefix = ":".join(parts)
        return f"{prefix}: {self.message}" if prefix else self.message
