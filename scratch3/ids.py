"""Scratch-style unique IDs (same alphabet as scratch-vm)."""

from __future__ import annotations

import random

_SOUP = (
    "!#%()*+,-./:;=?@[]^_`{|}~"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
)


def new_id(length: int = 20) -> str:
    return "".join(random.choice(_SOUP) for _ in range(length))
