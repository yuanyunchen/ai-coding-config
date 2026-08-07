#!/usr/bin/env python3
"""Trim right-side whitespace from a Libra metric-card screenshot and verify it."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pixel-trim a Libra metric card after the browser/DOM crop."
    )
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--margin", type=int, default=8)
    parser.add_argument("--threshold", type=int, default=248)
    parser.add_argument("--min-ink-per-column", type=int, default=2)
    parser.add_argument("--min-horizontal-fill", type=float, default=0.97)
    parser.add_argument("--max-right-gap", type=int, default=10)
    parser.add_argument(
        "--all-sides",
        action="store_true",
        help="Trim top, bottom and left margins as well as the right margin.",
    )
    return parser.parse_args()


def foreground_bounds(
    image: Image.Image, threshold: int, min_ink_per_column: int
) -> tuple[int, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    columns: list[int] = []

    for x in range(width):
        ink = 0
        for y in range(height):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 16 and min(red, green, blue) < threshold:
                ink += 1
                if ink >= min_ink_per_column:
                    columns.append(x)
                    break

    if not columns:
        raise ValueError("No foreground content found; check the screenshot and threshold.")
    return columns[0], columns[-1]


def foreground_row_bounds(
    image: Image.Image, threshold: int, min_ink_per_row: int
) -> tuple[int, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    rows: list[int] = []
    for y in range(height):
        ink = 0
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 16 and min(red, green, blue) < threshold:
                ink += 1
                if ink >= min_ink_per_row:
                    rows.append(y)
                    break
    if not rows:
        raise ValueError("No foreground rows found; check the screenshot and threshold.")
    return rows[0], rows[-1]


def main() -> int:
    args = parse_args()
    if args.margin < 0:
        raise ValueError("--margin must be non-negative")
    if not 0 < args.min_horizontal_fill <= 1:
        raise ValueError("--min-horizontal-fill must be in (0, 1]")

    image = Image.open(args.input)
    width, height = image.size
    first_x, last_x = foreground_bounds(
        image, args.threshold, args.min_ink_per_column
    )
    crop_right = min(width, last_x + 1 + args.margin)
    if args.all_sides:
        # Keep a small visual breathing room, but never preserve the browser's
        # full-width report container.  The DOM crop is still responsible for
        # excluding adjacent cards; this pass only tightens pixel margins.
        top_y, bottom_y = foreground_row_bounds(
            image, args.threshold, args.min_ink_per_column
        )
        bottom_y += 1
        crop_left = max(0, first_x - args.margin)
        crop_top = max(0, top_y - args.margin)
        crop_bottom = min(height, bottom_y + args.margin)
        cropped = image.crop((crop_left, crop_top, crop_right, crop_bottom))
    else:
        cropped = image.crop((0, 0, crop_right, height))

    out_first_x, out_last_x = foreground_bounds(
        cropped, args.threshold, args.min_ink_per_column
    )
    out_width, out_height = cropped.size
    right_gap = out_width - 1 - out_last_x
    content_width = out_last_x - out_first_x + 1
    horizontal_fill = content_width / out_width

    checks = {
        "right_gap_ok": right_gap <= args.max_right_gap,
        "horizontal_fill_ok": horizontal_fill >= args.min_horizontal_fill,
    }
    result = {
        "input": str(args.input),
        "output": str(args.output),
        "input_size": [width, height],
        "output_size": [out_width, out_height],
        "foreground_x": [out_first_x, out_last_x],
        "removed_right_px": width - out_width,
        "removed_right_ratio": round((width - out_width) / width, 6),
        "right_gap_px": right_gap,
        "horizontal_fill": round(horizontal_fill, 6),
        "checks": checks,
    }

    if not all(checks.values()):
        print(json.dumps(result, ensure_ascii=False, indent=2), file=sys.stderr)
        return 2

    args.output.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(args.output)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"trim_metric_card failed: {exc}", file=sys.stderr)
        raise SystemExit(2)
