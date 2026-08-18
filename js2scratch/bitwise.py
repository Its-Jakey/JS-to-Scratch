"""Compile-time bitwise helpers: AND LUT expressions, masks, and constant folding."""

from __future__ import annotations

from typing import Any

from scratch3.blocks import Add, Divide, ItemOfList, MathOp, Mod, Multiply
from scratch3.refs import List

AND_LUT_SIZE = 256
UINT32 = 1 << 32
POW2_COUNT = 32


def and_lut_values() -> list[int]:
    """256x256 table: Python index ``i * 256 + j`` is ``i & j`` (Scratch index + 1)."""
    return [i & j for i in range(AND_LUT_SIZE) for j in range(AND_LUT_SIZE)]


def pow2_lut_values() -> list[int]:
    """``item (n + 1)`` is ``2^n`` for ``n`` in ``0..31``."""
    return [1 << n for n in range(POW2_COUNT)]


def to_int32(value: int | float) -> int:
    n = int(value) % UINT32
    if n >= 1 << 31:
        n -= UINT32
    return n


def to_uint32(value: int | float) -> int:
    return int(value) % UINT32


def const_bits(value: int | float) -> int:
    n = to_uint32(value)
    if n <= 0xFF:
        return 8
    if n <= 0xFFFF:
        return 16
    return 32


def mask_modulus(value: int | float) -> int | None:
    """If ``value`` is ``2^k - 1`` (all k bits set), return ``2^k`` for a modulo.

    ``-1`` / ``0xFFFFFFFF`` counts as a 32-bit all-ones mask.
    """
    n = to_uint32(value)
    if n < 1:
        return None
    modulus = n + 1
    if modulus & (modulus - 1) == 0:
        return modulus
    return None


def fold_bitwise(op: str, left: int | float, right: int | float) -> int:
    a = to_int32(left)
    b = to_int32(right)
    if op == "&":
        return to_int32(a & b)
    if op == "|":
        return to_int32(a | b)
    if op == "^":
        return to_int32(a ^ b)
    shift = b & 31
    if op == "<<":
        return to_int32(a << shift)
    if op == ">>":
        return a >> shift
    if op == ">>>":
        return to_uint32(a) >> shift
    raise ValueError(f"unsupported bitwise op {op!r}")


def fold_not(value: int | float) -> int:
    return to_int32(~to_int32(value))


def _byte(value: Any, shift: int) -> Any:
    if shift == 0:
        return Mod(value, AND_LUT_SIZE)
    return Mod(MathOp("floor", Divide(value, 1 << shift)), AND_LUT_SIZE)


def and_lut_index(left: Any, right: Any, shift: int, lut: List) -> Any:
    """Scratch 1-based index into ``andLUT`` for one byte of ``left & right``."""
    index = Add(Add(Multiply(_byte(left, shift), AND_LUT_SIZE), _byte(right, shift)), 1)
    item = ItemOfList(index, lut)
    if shift == 0:
        return item
    return Multiply(item, 1 << shift)


def and_expr(left: Any, right: Any, bits: int, lut: List) -> Any:
    if bits not in (8, 16, 32):
        raise ValueError(f"AND width must be 8, 16, or 32, got {bits}")
    shifts = {8: (0,), 16: (8, 0), 32: (24, 16, 8, 0)}[bits]
    expr = and_lut_index(left, right, shifts[0], lut)
    for shift in shifts[1:]:
        expr = Add(expr, and_lut_index(left, right, shift, lut))
    return expr
