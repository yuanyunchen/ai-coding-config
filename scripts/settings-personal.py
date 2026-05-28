#!/usr/bin/env python3
################################################################################
# Claude Code 个性化设置（settings.json 的可移植子集）的纳管 / 恢复。
#
#   pull   <settings.json> <settings.personal.json>   抽取个性化 key 到仓库
#   deploy <settings.personal.json> <settings.json>   深合并个性化 key 到本机
#
# 只动 MANAGED_KEYS；enabledPlugins / extraKnownMarketplaces / hooks 不碰
# （插件归 manifest 管，hooks 是本机绝对路径）。深合并：dict 递归合并，
# 标量/列表整体覆盖，不删除本机已有的未纳管 key。
################################################################################

import json
import sys
from pathlib import Path

# settings.json 中可跨设备移植的个性化 key
MANAGED_KEYS = [
    "model",
    "effortLevel",
    "env",
    "permissions",
    "statusLine",
    "skillListingBudgetFraction",
    "skipDangerousModePermissionPrompt",
    "verbose",
    "agentPushNotifEnabled",
]


def deep_merge(base: dict, overlay: dict) -> dict:
    for k, v in overlay.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base


def cmd_pull(src: Path, dst: Path) -> None:
    if not src.exists():
        print(f"  (无 {src}，跳过个性化 pull)")
        return
    settings = json.loads(src.read_text())
    personal = {k: settings[k] for k in MANAGED_KEYS if k in settings}
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(personal, indent=2, ensure_ascii=False) + "\n")
    print(f"  抽取 {len(personal)} 个个性化 key -> {dst.name}")


def cmd_deploy(src: Path, dst: Path, dry_run: bool) -> None:
    if not src.exists():
        print(f"  (无 {src}，跳过个性化 deploy)")
        return
    personal = {k: v for k, v in json.loads(src.read_text()).items() if k in MANAGED_KEYS}
    if dry_run:
        print(f"  [dry-run] 深合并 {len(personal)} 个个性化 key 到 {dst}")
        return
    settings = json.loads(dst.read_text()) if dst.exists() else {}
    deep_merge(settings, personal)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
    print(f"  深合并 {len(personal)} 个个性化 key -> {dst.name}")


def main() -> None:
    args = sys.argv[1:]
    dry_run = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]
    if len(args) != 3:
        print("usage: settings-personal.py <pull|deploy> <src> <dst> [--dry-run]", file=sys.stderr)
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
