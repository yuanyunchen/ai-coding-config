#!/usr/bin/env python3
"""Set a Lark document to ByteDance-link-readable (internal L2) and verify it."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from typing import Any
from urllib.parse import urlparse


SUPPORTED_URL_TYPES = {"doc", "docx", "wiki", "sheet", "bitable", "mindnote", "minutes", "slides"}
L2_PATCH = {
    "external_access": False,
    "invite_external": False,
    "link_share_entity": "tenant_readable",
}


def parse_document_ref(value: str, explicit_type: str | None = None) -> tuple[str, str]:
    if "://" not in value:
        if not explicit_type:
            raise ValueError("A direct token requires --type")
        return value.strip(), explicit_type

    parts = [part for part in urlparse(value).path.split("/") if part]
    if len(parts) < 2 or parts[0] not in SUPPORTED_URL_TYPES:
        raise ValueError(f"Unsupported Lark document URL: {value}")
    return parts[1], explicit_type or parts[0]


def permission_public(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data", payload)
    if isinstance(data, dict) and isinstance(data.get("permission_public"), dict):
        return data["permission_public"]
    if isinstance(data, dict):
        return data
    raise RuntimeError("Unexpected permission response")


def is_l2(permission: dict[str, Any]) -> bool:
    return all(permission.get(key) == value for key, value in L2_PATCH.items())


def run_json(argv: list[str]) -> dict[str, Any]:
    completed = subprocess.run(argv, check=True, capture_output=True, text=True)
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("lark-cli returned non-JSON output") from exc


def _get_command(token: str, doc_type: str) -> list[str]:
    return [
        "lark-cli",
        "drive",
        "permission.public",
        "get",
        "--as",
        "user",
        "--params",
        json.dumps({"token": token, "type": doc_type}, separators=(",", ":")),
    ]


def ensure_l2(token: str, doc_type: str) -> dict[str, Any]:
    before = permission_public(run_json(_get_command(token, doc_type)))
    if is_l2(before):
        return {"status": "unchanged", "verified": True, "permission": before}

    patch_command = [
        "lark-cli",
        "drive",
        "permission.public",
        "patch",
        "--as",
        "user",
        "--params",
        json.dumps({"token": token, "type": doc_type}, separators=(",", ":")),
        "--data",
        json.dumps(L2_PATCH, separators=(",", ":")),
        "--yes",
    ]
    run_json(patch_command)
    after = permission_public(run_json(_get_command(token, doc_type)))
    if not is_l2(after):
        raise RuntimeError("L2 permission readback did not match the requested state")
    return {"status": "updated", "verified": True, "permission": after}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Set a Lark document to ByteDance link-readable and keep external sharing disabled."
    )
    parser.add_argument("document", help="Lark document URL or token")
    parser.add_argument("--type", dest="doc_type", help="Required when document is a direct token")
    args = parser.parse_args()
    try:
        token, doc_type = parse_document_ref(args.document, args.doc_type)
        result = ensure_l2(token, doc_type)
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as exc:
        print(json.dumps({"status": "error", "message": str(exc)}, ensure_ascii=False))
        return 1
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
