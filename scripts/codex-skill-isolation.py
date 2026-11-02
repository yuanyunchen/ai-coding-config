#!/usr/bin/env python3
"""Keep Feishu subskills readable on demand, out of Codex's global catalogue.

Called by sync/deploy; enumerate the installed tree so new children are covered.
No skill files are removed or edited, including upstream .agents/skills copies.
"""
import argparse
import importlib.util
import os
from pathlib import Path
import shutil
import tempfile
try:
    import tomllib
except ModuleNotFoundError:
    for candidate in ('python3.13', 'python3.12', 'python3.11'):
        executable = shutil.which(candidate)
        if executable:
            import sys
            os.execv(executable, [executable, os.path.abspath(__file__), *sys.argv[1:]])
    raise SystemExit('Python 3.11+ is required for Codex skill isolation.')


def isolated_paths(home):
    root = home / '.codex/skills/feishu-task-management'
    paths = set()
    for directory, _, files in os.walk(root, followlinks=True):
        if 'SKILL.md' in files and Path(directory) != root:
            paths.add(str((Path(directory) / 'SKILL.md').resolve()))
    paths.update(str(p.resolve()) for p in (home / '.agents/skills').glob('lark-*/SKILL.md'))
    return paths


def reconcile(config, paths):
    entries = config.setdefault('skills', {}).setdefault('config', [])
    found = set()
    for entry in entries:
        path = str(Path(entry.get('path', '')).expanduser().resolve())
        if path in paths:
            entry['enabled'] = False
            found.add(path)
    entries.extend({'path': path, 'enabled': False} for path in sorted(paths - found))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    home = Path.home()
    target = home / '.codex/config.toml'
    if not target.parent.exists():
        print('Codex not installed; skip skill isolation.')
        return
    paths = isolated_paths(home)
    before = target.read_text() if target.exists() else ''
    data = tomllib.loads(before)
    previous = tomllib.loads(before)
    reconcile(data, paths)
    print(f'Codex Feishu isolation: {len(paths)} internal/upstream skill paths disabled; entry retained.')
    if args.dry_run or data == previous:
        return
    spec = importlib.util.spec_from_file_location('codex_personal', Path(__file__).with_name('codex-personal.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = module.dump_toml(data)
    assert tomllib.loads(result) == data
    mode = target.stat().st_mode & 0o777 if target.exists() else 0o600
    fd, temporary = tempfile.mkstemp(prefix='.skill-isolation-', dir=target.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(result)
        os.chmod(temporary, mode)
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == '__main__':
    main()
