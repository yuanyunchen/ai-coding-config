#!/usr/bin/env python3
################################################################################
# Claude Code 个性化设置（settings.json 的可移植子集）的纳管 / 恢复。
#
#   pull   <settings.json> <settings.personal.json>   抽取个性化 key 到仓库
#   deploy <settings.personal.json> <settings.json>   深合并个性化 key 到本机
#
# 只动 MANAGED_KEYS；enabledPlugins / extraKnownMarketplaces 不碰（插件归 manifest 管）。
# 深合并：dict 递归合并，标量/列表整体覆盖，不删除本机已有的未纳管 key。
# hooks 只纳管自有的：命令指向 ~/.claude/hooks/ 的 hook 组存进同目录 hooks.json
# （家目录写成 $HOME）；deploy 时替换本机同命令的组，其他工具的 hook（如 pixel-agents）不碰。
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


HOOKS_FILE = "hooks.json"
OWN_HOOK_DIR = "/.claude/hooks/"


def _commands(group: dict) -> set:
    return {h.get("command", "") for h in group.get("hooks", [])}


def own_hooks(hooks: dict, home: str) -> dict:
    """Hook groups that run scripts under ~/.claude/hooks/, with the home path made portable."""
    out = {}
    for event, groups in (hooks or {}).items():
        kept = [g for g in groups if any(OWN_HOOK_DIR in c for c in _commands(g))]
        if kept:
            out[event] = json.loads(json.dumps(kept).replace(home, "$HOME"))
    return out


def merge_own_hooks(settings: dict, repo_hooks: dict, home: str) -> int:
    """Replace local groups sharing a command with the repo's; leave every other hook alone."""
    hooks = settings.setdefault("hooks", {})
    repo_hooks = json.loads(json.dumps(repo_hooks).replace("$HOME", home))
    for event, groups in repo_hooks.items():
        cmds = set().union(*(_commands(g) for g in groups))
        hooks[event] = [g for g in hooks.get(event, []) if not _commands(g) & cmds] + groups
    return sum(len(g) for g in repo_hooks.values())


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
    own = own_hooks(settings.get("hooks"), str(Path.home()))
    (dst.parent / HOOKS_FILE).write_text(json.dumps(own, indent=2, ensure_ascii=False) + "\n")
    print(f"  抽取 {sum(len(g) for g in own.values())} 组自有 hook -> {HOOKS_FILE}")


def cmd_deploy(src: Path, dst: Path, dry_run: bool) -> None:
    if not src.exists():
        print(f"  (无 {src}，跳过个性化 deploy)")
        return
    personal = {k: v for k, v in json.loads(src.read_text()).items() if k in MANAGED_KEYS}
    if dry_run:
        print(f"  [dry-run] 深合并 {len(personal)} 个个性化 key 和 {HOOKS_FILE} 里的自有 hook 到 {dst}")
        return
    settings = json.loads(dst.read_text()) if dst.exists() else {}
    deep_merge(settings, personal)
    hooks_src = src.parent / HOOKS_FILE
    n_hooks = merge_own_hooks(settings, json.loads(hooks_src.read_text()), str(Path.home())) if hooks_src.exists() else 0
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
    print(f"  深合并 {len(personal)} 个个性化 key、{n_hooks} 组自有 hook -> {dst.name}")


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
