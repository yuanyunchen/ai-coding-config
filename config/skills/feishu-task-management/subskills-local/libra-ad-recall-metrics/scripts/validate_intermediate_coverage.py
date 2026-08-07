#!/usr/bin/env python3
"""Compare required intermediate branches with captured screenshot files.

Missing screenshots produce a visible ``partial`` status instead of failing the
whole report. Invalid manifests still fail because their scope cannot be read.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


FAMILY_RULES = {
    "ad_recall": {
        "template": "Travel Recall",
        "group_by": "queue_id",
        "required_columns": ("cid*req", "支路独占消耗", "支路总消耗"),
        "forbidden_terms": ("dpa_direct_id", "计费比", "广告转化量"),
    },
    "product_recall": {
        "template": "pid商品召回",
        "group_by": "dpa_direct_id",
        "required_columns": ("广告消耗", "计费比"),
        "forbidden_terms": ("queue_id", "cid*req", "支路独占消耗", "支路总消耗"),
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    return parser.parse_args()


def validate(manifest_path: Path) -> dict:
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    flights = payload.get("flights")
    if not isinstance(flights, list):
        raise ValueError("manifest.flights must be a list")

    expected = 0
    captured = 0
    missing: list[dict[str, str]] = []
    reused: list[dict[str, str]] = []
    identity_errors: list[dict[str, object]] = []
    seen_paths: dict[str, tuple[str, str]] = {}
    base = manifest_path.parent

    for flight in flights:
        if not flight.get("show_intermediate", False):
            continue
        flight_id = str(flight["flight_id"])
        metric_family = str(flight.get("metric_family", ""))
        rules = FAMILY_RULES.get(metric_family)
        flight_reasons: list[str] = []
        if rules is None:
            flight_reasons.append("metric_family")
        else:
            if flight.get("template") != rules["template"]:
                flight_reasons.append("template")
            if flight.get("group_by") != rules["group_by"]:
                flight_reasons.append("group_by")
        if flight_reasons:
            identity_errors.append(
                {
                    "flight_id": flight_id,
                    "branch": None,
                    "metric_family": metric_family or None,
                    "reasons": flight_reasons,
                }
            )
        required = [str(branch) for branch in flight.get("required_branches", [])]
        screenshots = {
            str(branch): str(path)
            for branch, path in flight.get("screenshots", {}).items()
        }
        expected += len(required)
        branch_identity = flight.get("branch_identity", {})
        for branch in required:
            path = screenshots.get(branch)
            if path and (base / path).is_file():
                normalized = str((base / path).resolve())
                previous = seen_paths.get(normalized)
                if previous is None:
                    seen_paths[normalized] = (flight_id, branch)
                    captured += 1
                else:
                    reused.append(
                        {
                            "flight_id": flight_id,
                            "branch": branch,
                            "path": path,
                            "reused_from_flight_id": previous[0],
                            "reused_from_branch": previous[1],
                        }
                    )
            else:
                missing.append({"flight_id": flight_id, "branch": branch})

            if rules is None:
                continue
            evidence = branch_identity.get(branch)
            reasons: list[str] = []
            if not isinstance(evidence, dict):
                reasons.append("branch_identity")
            else:
                title = str(evidence.get("observed_card_title", ""))
                columns = [str(column) for column in evidence.get("observed_columns", [])]
                observed = " ".join([title, *columns])
                group_by = str(rules["group_by"])
                branch_pattern = rf"{re.escape(group_by)}\s*=\s*{re.escape(branch)}(?:\D|$)"
                if not re.search(branch_pattern, title, flags=re.IGNORECASE):
                    reasons.append("branch_title")
                for required_column in rules["required_columns"]:
                    if required_column not in observed:
                        reasons.append(f"column:{required_column}")
                for forbidden_term in rules["forbidden_terms"]:
                    if forbidden_term in observed:
                        reasons.append(f"forbidden:{forbidden_term}")
            if reasons:
                identity_errors.append(
                    {
                        "flight_id": flight_id,
                        "branch": branch,
                        "metric_family": metric_family,
                        "reasons": reasons,
                    }
                )

    return {
        "status": (
            "complete"
            if not missing and not reused and not identity_errors
            else "partial"
        ),
        "expected_screenshot_count": expected,
        "captured_screenshot_count": captured,
        "missing": missing,
        "reused": reused,
        "identity_errors": identity_errors,
    }


def main() -> None:
    args = parse_args()
    print(json.dumps(validate(args.manifest), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
