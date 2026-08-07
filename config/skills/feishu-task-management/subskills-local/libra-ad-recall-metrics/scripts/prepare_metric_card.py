#!/usr/bin/env python3
"""One-command preparation and hard QA for a Libra card screenshot.

The browser/DOM capture is an input only.  This command creates the sole
deliverable image, trims pixel margins on every side, and refuses to produce a
successful result when the card still has a large right margin or no visible
content.  It deliberately does not attempt OCR: card identity and the
one-branch-per-image rule are verified from the browser snapshot/manifest.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
TRIM = SCRIPT_DIR / "trim_metric_card.py"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="raw DOM crop")
    parser.add_argument("--output", required=True, type=Path, help="final card image")
    parser.add_argument("--margin", type=int, default=8)
    parser.add_argument("--max-right-gap", type=int, default=10)
    parser.add_argument("--min-horizontal-fill", type=float, default=0.97)
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        str(TRIM),
        "--input",
        str(args.input),
        "--output",
        str(args.output),
        "--margin",
        str(args.margin),
        "--max-right-gap",
        str(args.max_right_gap),
        "--min-horizontal-fill",
        str(args.min_horizontal_fill),
        "--all-sides",
    ]
    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.stdout:
        try:
            result = json.loads(completed.stdout)
        except json.JSONDecodeError:
            result = {"trim_stdout": completed.stdout.strip()}
    else:
        result = {}
    if completed.returncode:
        if completed.stderr:
            result["error"] = completed.stderr.strip()
        print(json.dumps(result, ensure_ascii=False, indent=2), file=sys.stderr)
        return completed.returncode

    result.update(
        {
            "status": "pass",
            "raw_input": str(args.input),
            "final_output": str(args.output),
            "visual_review_required": True,
            "delivery_rule": "browser identity/one branch per image must be reviewed before upload",
        }
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
