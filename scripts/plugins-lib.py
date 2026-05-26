#!/usr/bin/env python3
"""Plugin snapshots: pull/deploy original bundles per platform (claude/cursor/codex)."""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

EXCLUDE_DIRS = {"node_modules", "__pycache__", ".in_use", ".git", "dist"}
EXCLUDE_SUFFIXES = {".pyc"}
PORTABLE_KINDS = ("skills", "commands", "agents", "prompts")


def safe_dir(plugin_id: str) -> str:
    return plugin_id.replace("@", "__").replace("/", "_")


BUCKET_ENABLED = "enabled"
BUCKET_DISABLED = "disabled"
BUCKET_DIRS = (BUCKET_ENABLED, BUCKET_DISABLED)


def snapshot_bucket(is_enabled: bool) -> str:
    return BUCKET_ENABLED if is_enabled else BUCKET_DISABLED


def snapshot_path(platform_dir: Path, plugin_id: str, is_enabled: bool) -> Path:
    return platform_dir / snapshot_bucket(is_enabled) / safe_dir(plugin_id)


def snapshot_rel(platform: str, plugin_id: str, is_enabled: bool) -> str:
    return f"{platform}/{snapshot_bucket(is_enabled)}/{safe_dir(plugin_id)}/"


def ensure_bucket_dirs(platform_dir: Path) -> None:
    for name in BUCKET_DIRS:
        (platform_dir / name).mkdir(parents=True, exist_ok=True)


def find_snapshot(platform_dir: Path, plugin_id: str) -> Path | None:
    for bucket in BUCKET_DIRS:
        p = platform_dir / bucket / safe_dir(plugin_id)
        if p.is_dir():
            return p
    legacy = platform_dir / safe_dir(plugin_id)
    return legacy if legacy.is_dir() else None


def iter_snapshots(platform_dir: Path):
    if not platform_dir.is_dir():
        return
    for bucket in BUCKET_DIRS:
        bdir = platform_dir / bucket
        if not bdir.is_dir():
            continue
        for plugin_dir in sorted(bdir.iterdir()):
            if plugin_dir.is_dir():
                yield bucket, plugin_dir
    for item in sorted(platform_dir.iterdir()):
        if item.is_dir() and item.name not in BUCKET_DIRS and (item / "plugin-meta.json").exists():
            yield "legacy", item


def remove_stale_snapshot(platform_dir: Path, plugin_id: str, keep: Path, dry_run: bool) -> None:
    current = find_snapshot(platform_dir, plugin_id)
    if current is None or current == keep:
        return
    if dry_run:
        print(f"  [dry-run] 移除旧位置 {current.relative_to(platform_dir)}")
        return
    remove_path(current)
    print(f"  移除旧位置 {platform_dir.name}/{current.relative_to(platform_dir)}")


def migrate_flat_layout(platform_dir: Path, manifest: dict, platform: str, dry_run: bool = False) -> None:
    """Move legacy flat plugin dirs into enabled/ or disabled/."""
    if not platform_dir.is_dir():
        return
    enabled = enabled_plugins(manifest, platform)
    for item in list(platform_dir.iterdir()):
        if not item.is_dir() or item.name in BUCKET_DIRS:
            continue
        meta = item / "plugin-meta.json"
        if not meta.is_file():
            continue
        plugin_id = json.loads(meta.read_text()).get("pluginId", "")
        if not plugin_id:
            continue
        is_on = enabled.get(plugin_id, False)
        dest = snapshot_path(platform_dir, plugin_id, is_on)
        if dest == item:
            continue
        if dry_run:
            print(f"  [dry-run] 迁移 {item.name} -> {dest.relative_to(platform_dir)}/")
            continue
        ensure_bucket_dirs(platform_dir)
        if dest.exists():
            remove_path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(item), str(dest))
        print(f"  迁移 {platform}/{item.name} -> {dest.relative_to(platform_dir)}/")


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text()) if path.exists() else {}


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def hook_plugins(manifest: dict, platform: str) -> set[str]:
    hp = manifest.get("hookPlugins", {})
    if isinstance(hp, list):
        return set(hp) if platform == "claude" else set()
    return set(hp.get(platform, []))


def sync_config(manifest: dict) -> dict:
    return manifest.get("syncPlugins", {})


def is_hook_plugin(manifest: dict, platform: str, plugin_id: str, plugin_dir: Path | None = None) -> bool:
    if plugin_id in hook_plugins(manifest, platform):
        return True
    if plugin_dir and (plugin_dir / "plugin-meta.json").is_file():
        return json.loads((plugin_dir / "plugin-meta.json").read_text()).get("hasHooks", False)
    if plugin_dir:
        return plugin_has_hooks(plugin_dir)
    return False


def native_plugin_ids(manifest: dict, platform: str) -> set[str]:
    """Platform-specific plugins not synced from claude (e.g. @cursor-public)."""
    sc = sync_config(manifest)
    source = sc.get("source", "claude")
    if platform == source:
        return set()
    claude_ids = set(manifest.get(source, {}).get("enabledPlugins", {}).keys())
    return {pid for pid in enabled_plugins(manifest, platform) if pid not in claude_ids}


def write_sync_meta(
    dest: Path, plugin_id: str, platform: str, source_plugin_id: str, source_dir: Path, is_enabled: bool
) -> None:
    src_meta = source_dir / "plugin-meta.json"
    version = "unknown"
    has_hooks = False
    if src_meta.exists():
        m = json.loads(src_meta.read_text())
        version = m.get("version", version)
        has_hooks = m.get("hasHooks", False)
    meta = {
        "pluginId": plugin_id,
        "platform": platform,
        "syncedFrom": source_plugin_id,
        "syncedFromDir": str(source_dir),
        "version": version,
        "hasHooks": has_hooks,
        "enabled": is_enabled,
        "copiedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    (dest / "plugin-meta.json").write_text(json.dumps(meta, indent=2) + "\n")


def sync_portable_snapshot(src_dir: Path, dest: Path, plugin_id: str, platform: str, is_enabled: bool, dry_run: bool) -> bool:
    if not src_dir.is_dir():
        return False
    if dry_run:
        print(f"  [dry-run] sync -> {platform}/{dest.name}/ (enabled={is_enabled})")
        return True
    copytree_plugin(src_dir, dest)
    write_sync_meta(dest, plugin_id, platform, plugin_id, src_dir, is_enabled)
    kinds = [k for k in PORTABLE_KINDS if (dest / k).is_dir()]
    rel = f"{snapshot_bucket(is_enabled)}/{dest.name}"
    print(f"  {plugin_id} -> {platform}/{rel}/ (enabled={is_enabled}, {', '.join(kinds) or 'meta'})")
    return True


def sync_plugins_from_source(
    manifest_path: Path,
    plugins_root: Path,
    source: str,
    targets: list[str],
    dry_run: bool,
    deploy_homes: bool,
    force_vendor: bool,
) -> None:
    manifest = load_manifest(manifest_path)
    sc = sync_config(manifest)
    if sc.get("source") and sc["source"] != source:
        print(f"  (manifest syncPlugins.source={sc['source']}，与 --source {source} 不一致，仍继续)")
    source_dir = plugins_root / source
    claude_switches = manifest.get(source, {}).get("enabledPlugins", {})
    if not claude_switches:
        print(f"  (manifest 无 {source}.enabledPlugins)")
        return

    hooks_src = hook_plugins(manifest, source)
    portable_n = hook_n = skip_n = 0

    for plugin_id, is_enabled in sorted(claude_switches.items()):
        src_snap = find_snapshot(source_dir, plugin_id)
        is_hook = plugin_id in hooks_src or (
            src_snap is not None and is_hook_plugin(manifest, source, plugin_id, src_snap)
        )

        for target in targets:
            manifest.setdefault(target, {})
            target_plugins = manifest[target].setdefault("enabledPlugins", {})

            if is_hook:
                hook_n += 1
                target_plugins[plugin_id] = False
                if dry_run:
                    print(f"  [hook] {plugin_id}: {target} manifest=false（各平台独立安装）")
                continue

            if src_snap is None:
                skip_n += 1
                target_plugins[plugin_id] = is_enabled
                if is_enabled:
                    print(f"  (跳过 {plugin_id}: 无 {source} 快照，仅写 manifest enabled={is_enabled})")
                continue

            target_dir = plugins_root / target
            dest = snapshot_path(target_dir, plugin_id, is_enabled)
            if not dry_run:
                remove_stale_snapshot(target_dir, plugin_id, dest, dry_run)
            if sync_portable_snapshot(src_snap, dest, plugin_id, target, is_enabled, dry_run):
                portable_n += 1
            target_plugins[plugin_id] = is_enabled

    for target in targets:
        native = native_plugin_ids(manifest, target)
        for pid in sorted(native):
            print(f"  [{target}] 保留原生插件: {pid}")

    if not dry_run:
        save_manifest(manifest_path, manifest)
        print(f"  manifest: 已镜像 {len(claude_switches)} 项到 {', '.join(targets)}")

    print(f"  sync: {portable_n} portable 快照 x {len(targets)} 目标; {hook_n} hook 仅记 false; {skip_n} 无快照")

    if deploy_homes and not dry_run:
        config = plugins_root.parent
        manifest = load_manifest(manifest_path)
        for target in targets:
            home = Path.home() / f".{target}"
            plat_dir = plugins_root / target
            print(f"[deploy synced portable -> ~/.{target}]")
            deploy_portable_to_home(plat_dir, home, manifest, target, False)
            undeploy_disabled_portable(plat_dir, home, manifest, target, False)
        print("[vendor claude portable -> config/]")
        vendor_portable(source_dir, config, manifest, force_vendor, source)


def undeploy_disabled_portable(
    platform_dir: Path, home: Path, manifest: dict, platform: str, dry_run: bool
) -> None:
    """Remove portable items from tool home when plugin is disabled (matches official off behavior)."""
    cmd_dir = "prompts" if platform == "codex" else "commands"
    pairs = [
        ("skills", home / "skills" / "enabled"),
        ("agents", home / "agents"),
        ("commands", home / cmd_dir),
        ("prompts", home / "prompts"),
    ]
    enabled = enabled_plugins(manifest, platform)
    removed = 0
    for _bucket, plugin_dir in iter_snapshots(platform_dir):
        meta_path = plugin_dir / "plugin-meta.json"
        if not meta_path.exists():
            continue
        meta = json.loads(meta_path.read_text())
        plugin_id = meta.get("pluginId", "")
        if enabled.get(plugin_id, False):
            continue
        if meta.get("hasHooks") or plugin_id in hook_plugins(manifest, platform):
            continue
        for kind, dest_root in pairs:
            src = plugin_dir / kind
            if not src.is_dir():
                continue
            for item in src.iterdir():
                target = dest_root / item.name
                if not target.exists():
                    continue
                if dry_run:
                    print(f"  [dry-run] 移除 disabled {kind}/{item.name}")
                else:
                    remove_path(target)
                    print(f"  移除 disabled {plugin_id}: {kind}/{item.name}")
                removed += 1
    if removed:
        print(f"  {platform}: 清理 {removed} 个 disabled portable 项")


def enabled_plugins(manifest: dict, platform: str) -> dict[str, bool]:
    if platform == "claude":
        return manifest.get("claude", {}).get("enabledPlugins", {})
    if platform == "cursor":
        return manifest.get("cursor", {}).get("enabledPlugins", {})
    if platform == "codex":
        return manifest.get("codex", {}).get("enabledPlugins", {})
    return {}


def plugin_has_hooks(install_path: Path) -> bool:
    if (install_path / "hooks").is_dir():
        return any((install_path / "hooks").iterdir())
    if (install_path / "hooks.json").is_file():
        return True
    for meta_name in (".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"):
        meta = install_path / meta_name
        if meta.is_file():
            data = json.loads(meta.read_text())
            if data.get("hooks"):
                return True
    return False


def remove_path(path: Path) -> None:
    if path.is_symlink() or path.is_file():
        path.unlink()
    elif path.is_dir():
        shutil.rmtree(path)


def copytree_plugin(src: Path, dest: Path) -> None:
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    def ignore(_dir: str, names: list[str]) -> set[str]:
        out = set()
        for n in names:
            if n in EXCLUDE_DIRS:
                out.add(n)
        return out

    for item in src.iterdir():
        if item.name in EXCLUDE_DIRS:
            continue
        if item.is_dir():
            shutil.copytree(item, dest / item.name, ignore=ignore, dirs_exist_ok=True)
        elif item.suffix not in EXCLUDE_SUFFIXES:
            shutil.copy2(item, dest / item.name)


def write_meta(dest: Path, plugin_id: str, platform: str, install_path: Path, version: str = "") -> None:
    meta = {
        "pluginId": plugin_id,
        "platform": platform,
        "installPath": str(install_path),
        "version": version or "unknown",
        "hasHooks": plugin_has_hooks(install_path),
        "copiedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    (dest / "plugin-meta.json").write_text(json.dumps(meta, indent=2) + "\n")



def pull_claude(manifest_path: Path, claude_home: Path, out_dir: Path, dry_run: bool) -> None:
    settings = claude_home / "settings.json"
    installed_path = claude_home / "plugins" / "installed_plugins.json"
    manifest = load_manifest(manifest_path)
    enabled = enabled_plugins(manifest, "claude")

    if not installed_path.exists():
        print("  (无 installed_plugins.json，跳过 claude pull)")
        return

    installed = json.loads(installed_path.read_text()).get("plugins", {})
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    manifest_ids = set(enabled.keys())
    for plugin_id, entries in sorted(installed.items()):
        if plugin_id not in manifest_ids:
            continue
        if not entries:
            continue
        install_path = Path(entries[0]["installPath"])
        if not install_path.is_dir():
            print(f"  (跳过 {plugin_id}: 安装目录不存在)")
            continue
        is_on = enabled.get(plugin_id, False)
        dest = snapshot_path(out_dir, plugin_id, is_on)
        version = entries[0].get("version", "unknown")
        rel = dest.relative_to(out_dir)
        if dry_run:
            print(f"  [dry-run] {plugin_id} -> claude/{rel}/")
            count += 1
            continue
        ensure_bucket_dirs(out_dir)
        remove_stale_snapshot(out_dir, plugin_id, dest, dry_run)
        copytree_plugin(install_path, dest)
        write_meta(dest, plugin_id, "claude", install_path, version)
        kinds = [k for k in PORTABLE_KINDS if (dest / k).is_dir()]
        hook = plugin_has_hooks(install_path)
        print(f"  {plugin_id} -> claude/{rel}/ ({'hook' if hook else 'portable'}, {', '.join(kinds) or 'meta only'})")
        count += 1

    if settings.exists() and not dry_run:
        manifest.setdefault("version", 2)
        manifest.setdefault("claude", {})
        manifest["claude"]["enabledPlugins"] = dict(
            sorted(json.loads(settings.read_text()).get("enabledPlugins", {}).items())
        )
        save_manifest(manifest_path, manifest)

    print(f"  claude: 共 {count} 个插件快照（含 manifest 中 enabled/disabled）")


def find_cursor_plugins(cache: Path) -> list[tuple[str, Path, str]]:
    """Return (plugin_id, install_path, version_hint) from Cursor plugin cache."""
    found: list[tuple[str, Path, str]] = []
    if not cache.is_dir():
        return found
    for meta in cache.rglob(".cursor-plugin/plugin.json"):
        install_path = meta.parent.parent
        try:
            data = json.loads(meta.read_text())
        except json.JSONDecodeError:
            continue
        name = data.get("name", install_path.name)
        rel = install_path.relative_to(cache)
        parts = rel.parts
        if len(parts) >= 2:
            marketplace = parts[0]
            plugin_id = f"{name}@{marketplace}"
        else:
            plugin_id = name
        version = data.get("version", install_path.name)
        found.append((plugin_id, install_path, str(version)))
    return found


def pull_cursor(manifest_path: Path, cursor_home: Path, out_dir: Path, dry_run: bool) -> None:
    manifest = load_manifest(manifest_path)
    enabled = enabled_plugins(manifest, "cursor")
    cache = cursor_home / "plugins" / "cache"
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0

    manifest_ids = set(enabled.keys())
    for plugin_id, install_path, version in find_cursor_plugins(cache):
        if plugin_id not in manifest_ids:
            continue
        is_on = enabled.get(plugin_id, False)
        dest = snapshot_path(out_dir, plugin_id, is_on)
        rel = dest.relative_to(out_dir)
        if dry_run:
            print(f"  [dry-run] {plugin_id} -> cursor/{rel}/")
            count += 1
            continue
        ensure_bucket_dirs(out_dir)
        remove_stale_snapshot(out_dir, plugin_id, dest, dry_run)
        copytree_plugin(install_path, dest)
        write_meta(dest, plugin_id, "cursor", install_path, version)
        hook = plugin_has_hooks(install_path)
        print(f"  {plugin_id} -> cursor/{rel}/ ({'hook' if hook else 'portable'})")
        count += 1

    print(f"  cursor: 共 {count} 个插件快照（enabled/disabled 分目录）")


def pull_codex(manifest_path: Path, codex_home: Path, out_dir: Path, dry_run: bool) -> None:
    manifest = load_manifest(manifest_path)
    enabled = enabled_plugins(manifest, "codex")
    if not enabled:
        print("  codex: manifest 无 enabledPlugins，跳过")
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    candidates: list[Path] = []
    for base in (codex_home / "plugins", codex_home / ".tmp" / "plugins"):
        if base.is_dir():
            candidates.extend(p for p in base.rglob(".cursor-plugin") if p.is_dir())
            candidates.extend(p for p in base.rglob(".claude-plugin") if p.is_dir())
    count = 0
    seen: set[str] = set()
    for meta_dir in candidates:
        meta_file = meta_dir / "plugin.json"
        if not meta_file.is_file():
            continue
        install_path = meta_dir.parent
        data = json.loads(meta_file.read_text())
        name = data.get("name", install_path.name)
        plugin_id = name
        if plugin_id in seen:
            continue
        seen.add(plugin_id)
        is_on = enabled.get(plugin_id, False)
        dest = snapshot_path(out_dir, plugin_id, is_on)
        rel = dest.relative_to(out_dir)
        if dry_run:
            print(f"  [dry-run] {plugin_id} -> codex/{rel}/")
            count += 1
            continue
        ensure_bucket_dirs(out_dir)
        remove_stale_snapshot(out_dir, plugin_id, dest, dry_run)
        copytree_plugin(install_path, dest)
        write_meta(dest, plugin_id, "codex", install_path, data.get("version", ""))
        count += 1
    print(f"  codex: 共 {count} 个插件快照")


def vendor_portable(platform_dir: Path, config_root: Path, manifest: dict, force: bool, platform: str) -> None:
    hooks = hook_plugins(manifest, platform)
    mapping = {
        "skills": config_root / "skills" / "enabled",
        "commands": config_root / "commands",
        "agents": config_root / "agents",
        "prompts": config_root / "prompts",
    }
    copied: list[str] = []
    skipped: list[str] = []
    hook_skipped: list[str] = []

    if not platform_dir.is_dir():
        print(f"  (无 {platform_dir}，跳过 vendor)")
        return

    for bucket, plugin_dir in iter_snapshots(platform_dir):
        if bucket == BUCKET_DISABLED:
            continue
        meta_path = plugin_dir / "plugin-meta.json"
        plugin_id = ""
        has_hooks = False
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            plugin_id = meta.get("pluginId", "")
            has_hooks = meta.get("hasHooks", False) or plugin_id in hooks
        if has_hooks or plugin_id in hooks:
            hook_skipped.append(plugin_dir.name)
            continue
        if plugin_id and not enabled_plugins(manifest, platform).get(plugin_id, False):
            continue
        for kind, dest_root in mapping.items():
            src_kind = plugin_dir / kind
            if not src_kind.is_dir():
                continue
            for item in src_kind.iterdir():
                target = dest_root / item.name
                if target.exists() and not force:
                    skipped.append(f"{kind}/{item.name}")
                    continue
                if target.exists() and force:
                    remove_path(target)
                if item.is_dir():
                    shutil.copytree(item, target)
                else:
                    dest_root.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, target)
                copied.append(f"{kind}/{item.name}")

    print(f"  合并 {len(copied)} 项（来自 {platform} portable 插件）")
    for c in copied:
        print(f"    + {c}")
    if hook_skipped:
        print(f"  跳过 {len(hook_skipped)} 个 hook 插件（各平台独立安装）:")
        for h in hook_skipped:
            print(f"    ~ {h}")
    if skipped:
        print(f"  跳过 {len(skipped)} 个同名项（--force 覆盖）")


def deploy_portable_to_home(platform_dir: Path, home: Path, manifest: dict, platform: str, dry_run: bool) -> None:
    """Deploy portable plugin content from snapshot to tool home."""
    hooks = hook_plugins(manifest, platform)
    cmd_dir = "prompts" if platform == "codex" else "commands"
    pairs = [
        ("skills", home / "skills" / "enabled"),
        ("agents", home / "agents"),
        ("commands", home / cmd_dir),
        ("prompts", home / "prompts"),
    ]

    if not platform_dir.is_dir():
        print(f"  (无快照目录 {platform_dir.name}/，跳过)")
        return

    n = 0
    for bucket, plugin_dir in iter_snapshots(platform_dir):
        if bucket == BUCKET_DISABLED:
            continue
        meta_path = plugin_dir / "plugin-meta.json"
        plugin_id = ""
        has_hooks = False
        if meta_path.exists():
            meta = json.loads(meta_path.read_text())
            plugin_id = meta.get("pluginId", "")
            has_hooks = meta.get("hasHooks", False) or plugin_id in hooks
        if has_hooks or plugin_id in hooks:
            print(f"  [hook] {plugin_id or plugin_dir.name}: 请在 {platform} 内单独安装/启用插件")
            continue
        if plugin_id and not enabled_plugins(manifest, platform).get(plugin_id, False):
            continue
        for kind, dest_root in pairs:
            src = plugin_dir / kind
            if not src.is_dir():
                continue
            for item in src.iterdir():
                target = dest_root / item.name
                if dry_run:
                    print(f"  [dry-run] {kind}/{item.name} -> {target}")
                else:
                    dest_root.mkdir(parents=True, exist_ok=True)
                    if item.is_dir():
                        if target.exists():
                            remove_path(target)
                        shutil.copytree(item, target)
                    else:
                        if target.exists():
                            remove_path(target)
                        shutil.copy2(item, target)
                    print(f"  {kind}/{item.name} -> {target}")
                n += 1
    print(f"  {platform}: 部署 {n} 个 portable 项")


def apply_claude_manifest(manifest_path: Path, settings_path: Path, dry_run: bool) -> None:
    manifest = load_manifest(manifest_path)
    enabled = manifest.get("claude", {}).get("enabledPlugins", {})
    if not enabled:
        print("  (manifest 无 claude.enabledPlugins)")
        return
    if dry_run:
        print(f"  [dry-run] 合并 {len(enabled)} 项到 settings.json")
        return
    settings = json.loads(settings_path.read_text())
    current = settings.get("enabledPlugins", {})
    removed = [k for k in current if k not in enabled]
    settings["enabledPlugins"] = dict(sorted(enabled.items()))
    if removed:
        print(f"  从 settings 移除 {len(removed)} 项: {', '.join(removed)}")
    extra = settings.get("extraKnownMarketplaces", {})
    if "songtonyli-plugins" in extra and not any(k.endswith("@songtonyli-plugins") for k in enabled):
        del extra["songtonyli-plugins"]
        settings["extraKnownMarketplaces"] = extra
        print("  移除 extraKnownMarketplaces.songtonyli-plugins")
    settings_path.write_text(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
    changed = [k for k in enabled if current.get(k) != enabled[k]] + removed
    print(f"  写入 {len(enabled)} 项；变更 {len(changed)} 项")


INSTALLED_START = "<!-- installed:start -->"
INSTALLED_END = "<!-- installed:end -->"


def build_installed_section(manifest_path: Path, installed_path: Path | None) -> str:
    """Markdown tables for README ## 当前安装一览 (auto-generated body only)."""
    manifest = load_manifest(manifest_path)
    plugins_root = manifest_path.parent
    installed: dict = {}
    if installed_path and installed_path.exists():
        installed = json.loads(installed_path.read_text()).get("plugins", {})

    def snapshot_row(platform: str, plugin_id: str, is_on: bool) -> str:
        plat_dir = plugins_root / platform
        snap = find_snapshot(plat_dir, plugin_id)
        meta = snap / "plugin-meta.json" if snap else None
        if snap is None:
            return f"| `{plugin_id}` | — | — | *(无快照，运行 `plugins pull --platform {platform}`)* |"
        kind = "hook" if plugin_id in hook_plugins(manifest, platform) else "portable"
        ver = "—"
        if meta and meta.exists():
            m = json.loads(meta.read_text())
            ver = m.get("version", "—")
            if m.get("hasHooks"):
                kind = "hook"
        rel = snap.relative_to(plugins_root)
        return f"| `{plugin_id}` | {kind} | {ver} | `{rel}/` |"

    lines = [
        f"_Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}_",
        "",
    ]

    for platform in ("claude", "cursor", "codex"):
        plat_dir = plugins_root / platform
        enabled = enabled_plugins(manifest, platform)
        on_disk = sorted(name for _b, p in iter_snapshots(plat_dir) for name in [p.name])

        lines += [
            f"## {platform}",
            "",
            f"**manifest 启用**: {sum(1 for v in enabled.values() if v)} · **git 快照**: {len(on_disk)}",
            "",
            "| pluginId | kind | version | snapshot |",
            "|----------|------|---------|----------|",
        ]
        for plugin_id, is_on in sorted(enabled.items()):
            snap = find_snapshot(plat_dir, plugin_id)
            if is_on or snap is not None:
                row = snapshot_row(platform, plugin_id, is_on)
                if not is_on and snap is not None:
                    row = row.replace("| portable |", "| portable (off) |").replace("| hook |", "| hook (off) |")
                lines.append(row)
        if not any(enabled.values()) and not on_disk:
            lines.append("| — | — | — | *(manifest 无启用项)* |")
        lines.append("")

        off = [pid for pid, on in sorted(enabled.items()) if not on and find_snapshot(plat_dir, pid) is None]
        if off:
            lines += ["<details><summary>manifest 已关闭（无快照目录）</summary>", ""]
            for pid in off:
                ip = ""
                if platform == "claude":
                    entries = installed.get(pid) or []
                    if entries:
                        ip = f" — cache: `{entries[0].get('installPath', '')}`"
                lines.append(f"- `{pid}`{ip}")
            lines += ["", "</details>", ""]

    return "\n".join(lines) + "\n"


def write_installed_md(manifest_path: Path, installed_path: Path | None) -> None:
    """Patch config/plugins/README.md between installed markers."""
    plugins_root = manifest_path.parent
    readme = plugins_root / "README.md"
    body = build_installed_section(manifest_path, installed_path)
    stale = plugins_root / "INSTALLED.md"
    if stale.exists():
        stale.unlink()

    if not readme.exists():
        readme.write_text(
            "# config/plugins\n\n## 当前安装一览\n\n"
            f"{INSTALLED_START}\n{body}{INSTALLED_END}\n"
        )
        return

    text = readme.read_text()
    if INSTALLED_START in text and INSTALLED_END in text:
        before = text.split(INSTALLED_START, 1)[0] + INSTALLED_START
        after = INSTALLED_END + text.split(INSTALLED_END, 1)[1]
        readme.write_text(f"{before}\n{body}{after}")
    else:
        readme.write_text(
            text.rstrip()
            + f"\n\n## 当前安装一览\n\n{INSTALLED_START}\n{body}{INSTALLED_END}\n"
        )


def should_prune_snapshots(manifest: dict, platform: str) -> bool:
    """Keep full snapshot trees on sync source/targets (incl. disabled plugins)."""
    sc = sync_config(manifest)
    if platform in set(sc.get("targets", [])):
        return False
    if platform == sc.get("source", "claude"):
        return False
    return True


def prune_disabled_snapshots(manifest_path: Path, platform: str, platform_dir: Path) -> None:
    """Remove snapshots only for plugins no longer listed in manifest (not for disabled sync)."""
    manifest = load_manifest(manifest_path)
    if not should_prune_snapshots(manifest, platform):
        return
    enabled = enabled_plugins(manifest, platform)
    if not platform_dir.is_dir():
        return
    manifest_ids = set(enabled.keys())
    for _bucket, plugin_dir in iter_snapshots(platform_dir):
        meta = plugin_dir / "plugin-meta.json"
        plugin_id = ""
        if meta.exists():
            plugin_id = json.loads(meta.read_text()).get("pluginId", "")
        if plugin_id and plugin_id in manifest_ids:
            continue
        remove_path(plugin_dir)
        print(f"  移除未在 manifest 的快照: {platform}/{plugin_dir.relative_to(platform_dir)}/")


def main() -> int:
    positional: list[str] = []
    dry_run = False
    force = False
    platform = "all"
    source = "claude"
    no_deploy = False
    repo = Path(".")

    i = 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a == "--dry-run":
            dry_run = True
        elif a == "--force":
            force = True
        elif a == "--no-deploy":
            no_deploy = True
        elif a == "--platform" and i + 1 < len(sys.argv):
            platform = sys.argv[i + 1]
            i += 1
        elif a == "--source" and i + 1 < len(sys.argv):
            source = sys.argv[i + 1]
            i += 1
        elif a == "--repo" and i + 1 < len(sys.argv):
            repo = Path(sys.argv[i + 1])
            i += 1
        elif a.startswith("-"):
            print(f"unknown option: {a}", file=sys.stderr)
            return 1
        else:
            positional.append(a)
        i += 1

    if not positional:
        print("usage: plugins-lib.py <pull|deploy|vendor|apply|sync|status> ...", file=sys.stderr)
        return 1

    cmd = positional[0]
    repo = repo.resolve()
    config = repo / "config"
    manifest_path = config / "plugins" / "manifest.json"
    plugins_root = config / "plugins"
    claude_dir = plugins_root / "claude"
    cursor_dir = plugins_root / "cursor"
    codex_dir = plugins_root / "codex"

    home = Path.home()
    claude_home = home / ".claude"
    cursor_home = home / ".cursor"
    codex_home = home / ".codex"

    if cmd == "pull":
        manifest = load_manifest(manifest_path)
        if platform in ("all", "claude"):
            print("[pull claude]")
            if not dry_run:
                migrate_flat_layout(claude_dir, manifest, "claude")
            pull_claude(manifest_path, claude_home, claude_dir, dry_run)
            if not dry_run:
                prune_disabled_snapshots(manifest_path, "claude", claude_dir)
        if platform in ("all", "cursor"):
            print("[pull cursor]")
            if not dry_run:
                migrate_flat_layout(cursor_dir, manifest, "cursor")
            pull_cursor(manifest_path, cursor_home, cursor_dir, dry_run)
            if not dry_run:
                prune_disabled_snapshots(manifest_path, "cursor", cursor_dir)
        if platform in ("all", "codex"):
            print("[pull codex]")
            if not dry_run:
                migrate_flat_layout(codex_dir, manifest, "codex")
            pull_codex(manifest_path, codex_home, codex_dir, dry_run)
            if not dry_run:
                prune_disabled_snapshots(manifest_path, "codex", codex_dir)
        if not dry_run:
            write_installed_md(manifest_path, claude_home / "plugins" / "installed_plugins.json")
        return 0

    if cmd == "deploy":
        manifest = load_manifest(manifest_path)
        if platform in ("all", "claude"):
            print("[deploy claude]")
            settings = claude_home / "settings.json"
            if settings.exists():
                apply_claude_manifest(manifest_path, settings, dry_run)
            for _bucket, plugin_dir in iter_snapshots(claude_dir):
                meta = plugin_dir / "plugin-meta.json"
                if not meta.exists():
                    continue
                m = json.loads(meta.read_text())
                pid = m.get("pluginId", "")
                if m.get("hasHooks") or pid in hook_plugins(manifest, "claude"):
                    print(f"  [hook] {pid}: ./agent-config plugins install")
        if platform in ("all", "cursor"):
            print("[deploy cursor portable -> ~/.cursor]")
            deploy_portable_to_home(cursor_dir, cursor_home, manifest, "cursor", dry_run)
        if platform in ("all", "codex"):
            print("[deploy codex portable -> ~/.codex]")
            deploy_portable_to_home(codex_dir, codex_home, manifest, "codex", dry_run)
        return 0

    if cmd == "vendor":
        manifest = load_manifest(manifest_path)
        print("[vendor claude portable -> config/skills|commands|agents]")
        vendor_portable(claude_dir, config, manifest, force, "claude")
        return 0

    if cmd == "sync":
        manifest = load_manifest(manifest_path)
        sc = sync_config(manifest)
        targets = list(sc.get("targets", ["cursor", "codex"]))
        src = sc.get("source", source)
        if platform != "all":
            targets = [platform] if platform in ("cursor", "codex") else targets
        print(f"[sync {src} -> {', '.join(targets)}]")
        print("[pull source — 含 enabled/disabled]")
        manifest = load_manifest(manifest_path)
        if not dry_run:
            migrate_flat_layout(claude_dir, manifest, "claude")
            for t in targets:
                migrate_flat_layout(plugins_root / t, manifest, t)
        pull_claude(manifest_path, claude_home, claude_dir, dry_run)
        if not dry_run:
            sync_plugins_from_source(
                manifest_path,
                plugins_root,
                src,
                targets,
                dry_run,
                deploy_homes=not no_deploy,
                force_vendor=force,
            )
            write_installed_md(manifest_path, claude_home / "plugins" / "installed_plugins.json")
        else:
            sync_plugins_from_source(
                manifest_path, plugins_root, src, targets, True, False, force
            )
        return 0

    if cmd == "apply":
        settings = claude_home / "settings.json"
        if not settings.exists():
            print("ERROR: 无 ~/.claude/settings.json", file=sys.stderr)
            return 1
        apply_claude_manifest(manifest_path, settings, dry_run)
        if not dry_run:
            write_installed_md(
                manifest_path,
                claude_home / "plugins" / "installed_plugins.json",
            )
        return 0

    if cmd == "status":
        manifest = load_manifest(manifest_path)
        readme = plugins_root / "README.md"
        print(f"manifest: {manifest_path}")
        if readme.exists():
            print(f"summary:  {readme} (#当前安装一览)")
        for plat, sub in (("claude", claude_dir), ("cursor", cursor_dir), ("codex", codex_dir)):
            snaps = sorted(p.name for _b, p in iter_snapshots(sub))
            en = sum(1 for v in enabled_plugins(manifest, plat).values() if v)
            print(f"  {plat}: {len(snaps)} snapshot(s), {en} enabled in manifest")
            for name in snaps:
                print(f"    - {name}")
        hp = manifest.get("hookPlugins", {})
        if hp:
            print("  hookPlugins (不跨平台 sync):")
            if isinstance(hp, dict):
                for plat, ids in hp.items():
                    for pid in ids:
                        print(f"    [{plat}] {pid}")
            else:
                for pid in hp:
                    print(f"    {pid}")
        return 0

    print(f"unknown cmd: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
