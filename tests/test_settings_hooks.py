"""Own-hook registration round trip in scripts/settings-personal.py. Run: python3 -m unittest tests/test_settings_hooks.py"""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "settings-personal.py"
spec = importlib.util.spec_from_file_location("settings_personal", SCRIPT)
sp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sp)

HOME = "/Users/someone"


def group(cmd, matcher="", timeout=10):
    return {"matcher": matcher, "hooks": [{"type": "command", "command": cmd, "timeout": timeout}]}


OWN = f'python3 "{HOME}/.claude/hooks/workspace-guard.py"'
OTHER = f'node "{HOME}/.pixel-agents/hooks/claude-hook.js"'


class OwnHooksTest(unittest.TestCase):
    def test_pull_keeps_only_own_hooks_with_portable_home(self):
        hooks = {"Stop": [group(OTHER), group(OWN)], "Notification": [group(OTHER)]}
        out = sp.own_hooks(hooks, HOME)
        self.assertEqual(list(out), ["Stop"])
        self.assertEqual(out["Stop"][0]["hooks"][0]["command"], 'python3 "$HOME/.claude/hooks/workspace-guard.py"')

    def test_deploy_replaces_own_groups_keeps_others_and_is_idempotent(self):
        repo = {"Stop": [group('python3 "$HOME/.claude/hooks/workspace-guard.py"', timeout=20)],
                "PreToolUse": [group('python3 "$HOME/.claude/hooks/workspace-guard.py"', matcher="Agent|Task")]}
        settings = {"hooks": {"Stop": [group(OTHER), group(OWN, timeout=10)]}}
        sp.merge_own_hooks(settings, repo, HOME)
        once = json.dumps(settings, sort_keys=True)
        sp.merge_own_hooks(settings, repo, HOME)
        self.assertEqual(json.dumps(settings, sort_keys=True), once)
        stop = settings["hooks"]["Stop"]
        self.assertEqual([g["hooks"][0]["command"] for g in stop], [OTHER, OWN])
        self.assertEqual(stop[1]["hooks"][0]["timeout"], 20)
        self.assertEqual(settings["hooks"]["PreToolUse"][0]["matcher"], "Agent|Task")

    def test_cli_round_trip_uses_sibling_hooks_file(self):
        with tempfile.TemporaryDirectory() as t:
            t = Path(t)
            home = str(Path.home())
            own = f'python3 "{home}/.claude/hooks/workspace-guard.py"'
            src = t / "settings.json"
            src.write_text(json.dumps({"model": "opus", "hooks": {"Stop": [group(own), group(OTHER)]}}))
            personal = t / "repo" / "settings.personal.json"
            sp.cmd_pull(src, personal)
            self.assertNotIn("hooks", json.loads(personal.read_text()))
            self.assertIn("$HOME", (personal.parent / "hooks.json").read_text())
            dst = t / "new-machine.json"
            sp.cmd_deploy(personal, dst, dry_run=False)
            self.assertEqual(json.loads(dst.read_text())["hooks"]["Stop"][0]["hooks"][0]["command"], own)


if __name__ == "__main__":
    unittest.main()
