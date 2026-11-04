"""Tests for workspace-guard.py, driven by real hook payloads captured from Claude Code 2.1.316 (fixtures/).
Run: python3 -m unittest discover -s ~/.claude/hooks/tests"""
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

HOOK = Path(__file__).resolve().parent.parent / "workspace-guard.py"
FIX = Path(__file__).resolve().parent / "fixtures"
sys.path.insert(0, str(HOOK.parent.parent / "skills" / "workspace-management" / "scripts"))
import wslib  # noqa: E402


def fixture(name, **over):
    data = json.loads((FIX / f"{name}.json").read_text())
    data.pop("_env", None)
    data.update(over)
    return data


class GuardTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name).resolve()
        self.home = base / "home"
        self.home.mkdir()
        self.env = {**os.environ, "HOME": str(self.home), "CLAUDE_CODE_ENTRYPOINT": "cli"}
        self.env.pop("WS_HOOKS", None)
        self._old_home = os.environ["HOME"]
        os.environ["HOME"] = str(self.home)
        self.root = self.home / "AI Programing" / "Play for Fun" / "ws"
        wslib.init(self.root, title="Guard")
        self.ws = wslib.Workspace(self.root)
        self.node, self.nid = self.ws.new_task("work", title="工作")

    def tearDown(self):
        os.environ["HOME"] = self._old_home
        self._tmp.cleanup()

    def run_hook(self, data, env=None):
        p = subprocess.run([sys.executable, str(HOOK)], input=json.dumps(data), capture_output=True, text=True,
                           env={**self.env, **(env or {})}, timeout=20)
        self.assertEqual(p.returncode, 0, p.stderr)
        return json.loads(p.stdout) if p.stdout.strip() else None

    def filled_dispatch(self):
        s, sid = self.ws.dispatch(self.nid, "helper", body="做一件事")
        t = (s / "task.md").read_text().replace("## 成功标准\n", "## 成功标准\n文件 out.txt 存在\n")
        (s / "task.md").write_text(t)
        return s

    def agent_call(self, prompt, stype="general-purpose"):
        d = fixture("PreToolUse-fg", cwd=str(self.root))
        d["tool_input"] = {**d["tool_input"], "prompt": prompt, "subagent_type": stype}
        return d

    def deny_reason(self, out):
        self.assertIsNotNone(out)
        h = out["hookSpecificOutput"]
        self.assertEqual(h["permissionDecision"], "deny")
        return h["permissionDecisionReason"]


class TestActivation(GuardTest):
    def test_silent_outside_workspaces(self):
        outside = self.home / "plain"
        outside.mkdir()
        (self.home / ".agents" / "skills").mkdir(parents=True)  # lark-cli copy must not activate
        for name in ("SessionStart", "UserPromptSubmit-typed", "PreToolUse-fg", "Stop"):
            self.assertIsNone(self.run_hook(fixture(name, cwd=str(outside))), name)
        self.assertIsNone(self.run_hook(fixture("SessionStart", cwd=str(self.home))))

    def test_v3_gets_note_only(self):
        old = self.home / "old"
        (old / ".agent").mkdir(parents=True)
        (old / ".agent" / "MEMORY.md").write_text("x")
        out = self.run_hook(fixture("SessionStart", cwd=str(old)))
        self.assertIn("v3", out["hookSpecificOutput"]["additionalContext"])
        self.assertIsNone(self.run_hook(fixture("PreToolUse-fg", cwd=str(old))))
        self.assertIsNone(self.run_hook(fixture("UserPromptSubmit-typed", cwd=str(old))))

    def test_off_switches_and_bad_input(self):
        self.assertIsNone(self.run_hook(fixture("PreToolUse-fg", cwd=str(self.root)), env={"WS_HOOKS": "off"}))
        cfg = self.ws.config(); cfg["hooks"] = "off"
        (self.ws.agents / "ws.json").write_text(json.dumps(cfg))
        self.assertIsNone(self.run_hook(fixture("PreToolUse-fg", cwd=str(self.root))))
        p = subprocess.run([sys.executable, str(HOOK)], input="not json", capture_output=True, text=True, env=self.env)
        self.assertEqual((p.returncode, p.stdout), (0, ""))

    def test_session_start_injects_status(self):
        out = self.run_hook(fixture("SessionStart", cwd=str(self.root)))
        text = out["hookSpecificOutput"]["additionalContext"]
        self.assertIn("v4", text)
        self.assertIn("ws dispatch", text)


class TestPrompts(GuardTest):
    def test_typed_prompt_captured_with_hint(self):
        msg = "把导出的报表改成按周汇总，并且加上环比的列"
        out = self.run_hook(fixture("UserPromptSubmit-typed", cwd=str(self.root), prompt=msg))
        entries = self.ws.questions()
        self.assertEqual([e["text"] for e in entries], [msg])
        self.assertIn(entries[0]["id"], out["hookSpecificOutput"]["additionalContext"])

    def test_short_prompt_captured_silently(self):
        self.assertIsNone(self.run_hook(fixture("UserPromptSubmit-typed", cwd=str(self.root), prompt="继续")))
        self.assertEqual(len(self.ws.questions()), 1)
        self.assertEqual(self.ws.unfiled(), [])

    def test_notifications_and_sdk_runs_skipped(self):
        self.assertIsNone(self.run_hook(fixture("UserPromptSubmit-notification", cwd=str(self.root))))
        typed = fixture("UserPromptSubmit-typed", cwd=str(self.root))
        self.assertIsNone(self.run_hook(typed, env={"CLAUDE_CODE_ENTRYPOINT": "sdk-cli"}))
        self.assertEqual(self.ws.questions(), [])
        self.run_hook(typed, env={"CLAUDE_CODE_ENTRYPOINT": "sdk-cli", "WS_HOOKS": "force"})
        self.assertEqual(len(self.ws.questions()), 1)


class TestDispatchGate(GuardTest):
    def test_undeclared_dispatch_denied(self):
        reason = self.deny_reason(self.run_hook(self.agent_call("Reply with hi.")))
        self.assertIn("ws dispatch", reason)

    def test_readonly_types_and_skip_pass(self):
        self.assertIsNone(self.run_hook(self.agent_call("look around", stype="Explore")))
        self.assertIsNone(self.run_hook(self.agent_call("[ws:skip] quick research")))
        self.assertEqual(self.ws.skip_count(), 1)

    def test_valid_dispatch_allowed(self):
        s = self.filled_dispatch()
        self.assertIsNone(self.run_hook(self.agent_call(wslib.dispatch_prompt(s))))

    def test_skeleton_or_answered_dispatch_denied(self):
        s, _ = self.ws.dispatch(self.nid, "bare", body="背景")
        self.assertIn("成功标准", self.deny_reason(self.run_hook(self.agent_call(wslib.dispatch_prompt(s)))))
        s2 = self.filled_dispatch()
        (s2 / "result.md").write_text("---\nstatus: DONE\n---\n# r\n\n完成\n")
        self.assertIn("result.md", self.deny_reason(self.run_hook(self.agent_call(wslib.dispatch_prompt(s2)))))


class TestSubagentStop(GuardTest):
    def transcript(self, prompt):
        p = self.home / "agent.jsonl"
        p.write_text(json.dumps({"type": "user", "message": {"role": "user", "content": prompt}}) + "\n")
        return str(p)

    def test_block_then_save_unverified(self):
        s = self.filled_dispatch()
        tp = self.transcript(wslib.dispatch_prompt(s))
        out = self.run_hook(fixture("SubagentStop-first", cwd=str(self.root), agent_transcript_path=tp))
        self.assertEqual(out["decision"], "block")
        self.assertIn(str(s / "result.md"), out["reason"])
        self.assertIsNone(self.run_hook(fixture("SubagentStop-active", cwd=str(self.root), agent_transcript_path=tp,
                                                last_assistant_message="hi")))
        text = (s / "result.md").read_text()
        self.assertIn("status: UNVERIFIED", text)
        self.assertIn("hi", text)
        self.assertIn("UNVERIFIED", (self.node / "progress.md").read_text())

    def test_valid_result_or_unrelated_agent_passes(self):
        s = self.filled_dispatch()
        (s / "result.md").write_text("---\nstatus: DONE\n---\n# r\n\n完成了\n")
        tp = self.transcript(wslib.dispatch_prompt(s))
        self.assertIsNone(self.run_hook(fixture("SubagentStop-first", cwd=str(self.root), agent_transcript_path=tp)))
        tp2 = self.transcript("[ws:skip] research something")
        self.assertIsNone(self.run_hook(fixture("SubagentStop-first", cwd=str(self.root), agent_transcript_path=tp2)))


class TestAnswers(GuardTest):
    def test_stop_records_answer_for_open_question(self):
        q = fixture("UserPromptSubmit-typed", cwd=str(self.root), prompt="请帮我检查一下评测结果为什么下降了这么多")
        self.run_hook(q)
        self.run_hook(fixture("Stop", cwd=str(self.root), session_id=q["session_id"], last_assistant_message="进度：已定位原因"))
        text = self.ws.conv.read_text()
        self.assertIn("🤖 A → ", text)
        self.assertIn("进度：已定位原因", text)
        self.assertTrue(all(x["answered"] for x in self.ws.questions()))

    def test_stop_skips_sdk_and_hook_continuations(self):
        q = fixture("UserPromptSubmit-typed", cwd=str(self.root), prompt="一条足够长的问题文本用来测试回答记录")
        self.run_hook(q, env={"CLAUDE_CODE_ENTRYPOINT": "sdk-cli", "WS_HOOKS": "force"})
        self.run_hook(fixture("Stop", cwd=str(self.root), session_id=q["session_id"], last_assistant_message="a"),
                      env={"CLAUDE_CODE_ENTRYPOINT": "sdk-cli"})
        self.run_hook(fixture("Stop", cwd=str(self.root), session_id=q["session_id"], stop_hook_active=True,
                              last_assistant_message="b"))
        self.assertFalse(any(x["answered"] for x in self.ws.questions()))


class TestStopAndLatency(GuardTest):
    def test_stop_refreshes_index(self):
        (self.ws.memory_dir / "fact.md").write_text("---\nsummary: 一条事实\ntype: knowledge\nstatus: stable\n---\n# f\n")
        self.assertIsNone(self.run_hook(fixture("Stop", cwd=str(self.root))))
        self.assertIn("fact.md", (self.ws.memory_dir / "INDEX.md").read_text())

    def test_latency(self):
        data = self.agent_call("Reply with hi.")
        start = time.perf_counter()
        for _ in range(5):
            self.run_hook(data)
        avg_ms = (time.perf_counter() - start) / 5 * 1000
        print(f"\n[workspace-guard] PreToolUse average {avg_ms:.0f} ms")
        self.assertLess(avg_ms, 300)


if __name__ == "__main__":
    unittest.main()
