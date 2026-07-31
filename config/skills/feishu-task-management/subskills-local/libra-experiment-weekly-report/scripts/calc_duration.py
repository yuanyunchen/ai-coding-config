#!/usr/bin/env python3
"""Calculate Libra weekly-report duration labels from calendar dates."""

from __future__ import annotations

import argparse
import json
from datetime import date


def parse_day(value: str) -> date:
    return date.fromisoformat(value)


def format_days(value: float) -> str:
    return str(int(value)) if value.is_integer() else str(value)


def calculate(start: date, last_data: date, close: date | None) -> dict:
    if last_data < start:
        raise ValueError("last-data must be on or after start")
    if close is not None and close < start:
        raise ValueError("close must be on or after start")

    total = (last_data - start).days + 0.5
    if close is None or close > last_data:
        return {
            "active_days": total,
            "return_days": 0,
            "label": f"{format_days(total)}d",
        }

    active = (close - start).days + 0.5
    returned = (last_data - close).days
    return {
        "active_days": active,
        "return_days": returned,
        "label": f"{format_days(active)}d + {format_days(float(returned))}d",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True, type=parse_day)
    parser.add_argument("--last-data", required=True, type=parse_day)
    parser.add_argument("--close", type=parse_day)
    args = parser.parse_args()
    print(json.dumps(calculate(args.start, args.last_data, args.close), ensure_ascii=False))


if __name__ == "__main__":
    main()
