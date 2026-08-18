"""Costumes and sounds, including default SVG assets."""

from __future__ import annotations

import hashlib
import struct
from pathlib import Path
from typing import Any

_ASSETS = Path(__file__).resolve().parent / "assets"


def md5_hex(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


def _png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", data[16:24])
        return width, height
    return None


def _svg_size(data: bytes) -> tuple[float, float] | None:
    text = data.decode("utf-8", errors="ignore")
    width = _svg_attr(text, "width")
    height = _svg_attr(text, "height")
    if width is not None and height is not None:
        return width, height
    view_box = _svg_viewbox(text)
    if view_box is not None:
        return view_box[2], view_box[3]
    return None


def _svg_attr(text: str, name: str) -> float | None:
    marker = f'{name}="'
    start = text.find(marker)
    if start < 0:
        marker = f"{name}='"
        start = text.find(marker)
        if start < 0:
            return None
        end_char = "'"
    else:
        end_char = '"'
    start += len(marker)
    end = text.find(end_char, start)
    if end < 0:
        return None
    raw = text[start:end].strip().removesuffix("px")
    try:
        return float(raw)
    except ValueError:
        return None


def _svg_viewbox(text: str) -> tuple[float, float, float, float] | None:
    for marker in ('viewBox="', "viewBox='"):
        start = text.find(marker)
        if start < 0:
            continue
        end_char = marker[-1]
        start += len(marker)
        end = text.find(end_char, start)
        if end < 0:
            return None
        parts = text[start:end].replace(",", " ").split()
        if len(parts) == 4:
            try:
                return tuple(float(part) for part in parts)  # type: ignore[return-value]
            except ValueError:
                return None
    return None


class Costume:
    def __init__(
        self,
        name: str,
        data: bytes,
        data_format: str,
        *,
        rotation_center: tuple[float, float] | None = None,
        bitmap_resolution: int | None = None,
    ) -> None:
        self.name = name
        self.data = data
        self.data_format = data_format.lower().lstrip(".")
        self.asset_id = md5_hex(data)
        self.md5ext = f"{self.asset_id}.{self.data_format}"
        if bitmap_resolution is not None:
            self.bitmap_resolution = bitmap_resolution
        elif self.data_format in {"png", "jpg", "jpeg", "bmp", "gif"}:
            self.bitmap_resolution = 2
        else:
            self.bitmap_resolution = 1
        if rotation_center is not None:
            self.rotation_center_x, self.rotation_center_y = rotation_center
        else:
            self.rotation_center_x, self.rotation_center_y = self._infer_center()

    def _infer_center(self) -> tuple[float, float]:
        if self.data_format == "svg":
            size = _svg_size(self.data)
            if size:
                return size[0] / 2, size[1] / 2
            return 48.0, 50.0
        size = _png_size(self.data)
        if size:
            resolution = self.bitmap_resolution or 1
            return size[0] / resolution / 2, size[1] / resolution / 2
        return 240.0, 180.0

    def to_json(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "assetId": self.asset_id,
            "name": self.name,
            "md5ext": self.md5ext,
            "dataFormat": self.data_format,
            "rotationCenterX": self.rotation_center_x,
            "rotationCenterY": self.rotation_center_y,
        }
        if self.data_format != "svg":
            payload["bitmapResolution"] = self.bitmap_resolution
        else:
            payload["bitmapResolution"] = 1
        return payload

    @classmethod
    def from_file(cls, path: str | Path, name: str | None = None, **kwargs: Any) -> Costume:
        file_path = Path(path)
        data = file_path.read_bytes()
        fmt = file_path.suffix.lstrip(".").lower() or "svg"
        if fmt == "jpeg":
            fmt = "jpg"
        return cls(name or file_path.stem, data, fmt, **kwargs)

    @classmethod
    def default_backdrop(cls) -> Costume:
        return cls.from_file(_ASSETS / "backdrop.svg", "backdrop1")

    @classmethod
    def default_costume(cls) -> Costume:
        return cls.from_file(_ASSETS / "costume.svg", "costume1")


class Sound:
    def __init__(self, name: str, data: bytes, data_format: str = "wav") -> None:
        self.name = name
        self.data = data
        self.data_format = data_format.lower().lstrip(".")
        if self.data_format == "wave":
            self.data_format = "wav"
        self.asset_id = md5_hex(data)
        self.md5ext = f"{self.asset_id}.{self.data_format}"

    def to_json(self) -> dict[str, Any]:
        return {
            "assetId": self.asset_id,
            "name": self.name,
            "md5ext": self.md5ext,
            "dataFormat": self.data_format,
            "rate": 48000,
            "sampleCount": 0,
        }

    @classmethod
    def from_file(cls, path: str | Path, name: str | None = None) -> Sound:
        file_path = Path(path)
        fmt = file_path.suffix.lstrip(".").lower() or "wav"
        return cls(name or file_path.stem, file_path.read_bytes(), fmt)
