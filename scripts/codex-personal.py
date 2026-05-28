#!/usr/bin/env python3
################################################################################
# Codex 个性化设置（config.toml 的可移植子集）的纳管 / 恢复。
#
#   pull   <config.toml> <config.personal.toml>   抽取个性化 key 到仓库
#   deploy <config.personal.toml> <config.toml>   深合并个性化 key 到本机
#
# 只动 MANAGED_SCHEMA；auth / mcp_servers / plugins / projects / notify 不碰。
# 深合并：dict 递归合并，标量/列表整体覆盖，不删除本机已有未纳管 key。
################################################################################

import json
import re
import sys
import tomllib
from pathlib import Path
from typing import Any

# config.toml 中可跨设备移植的个性化 key
MANAGED_SCHEMA: dict[str, Any] = {
    "model": True,
    "model_reasoning_effort": True,
    "personality": True,
    "approval_policy": True,
    "sandbox_mode": True,
    "service_tier": True,
    "tui": {
        "status_line_use_colors": True,
        "status_line": True,
    },
    "desktop": {
        "appearanceTheme": True,
        "usePointerCursors": True,
        "conversationDetailMode": True,
    },
    "features": {
        "js_repl": True,
    },
}


def read_toml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return tomllib.loads(path.read_text())


def extract_managed(data: dict[str, Any], schema: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, rule in schema.items():
        if key not in data:
            continue
        if rule is True:
            out[key] = data[key]
        elif isinstance(rule, dict) and isinstance(data[key], dict):
            nested = extract_managed(data[key], rule)
            if nested:
                out[key] = nested
    return out


def deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def quote_key(key: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key
    return json.dumps(key, ensure_ascii=False)


def format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return "[" + ", ".join(format_value(item) for item in value) + "]"
    raise TypeError(f"unsupported TOML value: {type(value).__name__}")


def dump_toml(data: dict[str, Any]) -> str:
    lines: list[str] = []

    def write_table(table: dict[str, Any], path: tuple[str, ...] = ()) -> None:
        for key, value in table.items():
            if not isinstance(value, dict):
                lines.append(f"{quote_key(key)} = {format_value(value)}")

        for key, value in table.items():
            if not isinstance(value, dict):
                continue
            if lines and lines[-1] != "":
                lines.append("")
            child_path = path + (key,)
            lines.append("[" + ".".join(quote_key(part) for part in child_path) + "]")
            write_table(value, child_path)

    write_table(data)
    return "\n".join(lines).rstrip() + "\n"


def cmd_pull(src: Path, dst: Path) -> None:
    config = read_toml(src)
    personal = extract_managed(config, MANAGED_SCHEMA)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(dump_toml(personal))
    print(f"  抽取 Codex 个性化 key -> {dst.name}")


def cmd_deploy(src: Path, dst: Path, dry_run: bool) -> None:
    if not src.exists():
        print(f"  (无 {src}，跳过 Codex 个性化 deploy)")
        return
    personal = extract_managed(read_toml(src), MANAGED_SCHEMA)
    if dry_run:
        print(f"  [dry-run] 深合并 Codex 个性化 key 到 {dst}")
        return
    config = read_toml(dst)
    deep_merge(config, personal)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(dump_toml(config))
    print(f"  深合并 Codex 个性化 key -> {dst.name}")


def main() -> None:
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [arg for arg in args if arg != "--dry-run"]
    if len(args) != 3:
        print("usage: codex-personal.py <pull|deploy> <src> <dst> [--dry-run]", file=sys.stderr)
        sys.exit(2)
    cmd, src, dst = args[0], Path(args[1]), Path(args[2])
    if cmd == "pull":
        cmd_pull(src, dst)
    elif cmd == "deploy":
        cmd_deploy(src, dst, dry_run)
    else:
        print(f"ERROR: 未知子命令 '{cmd}'", file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
