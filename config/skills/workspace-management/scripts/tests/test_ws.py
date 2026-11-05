"""Tests for wslib (workspace v4). Run: python3 -m unittest discover -s <skill>/scripts/tests"""
import io
import json
import os
import re
import shutil
import sys
import tempfile
import threading
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import wslib  # noqa: E402


class WsTestCase(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        base = Path(self._tmp.name).resolve()
        self.home = base / "home"
        self.home.mkdir()
        self._old_home = os.environ.get("HOME")
        os.environ["HOME"] = str(self.home)
        # Spaces in the path on purpose: real workspaces live under "AI Programing/Play for Fun".
        self.root = self.home / "AI Programing" / "Play for Fun" / "proj"
        wslib.init(self.root, profile="task", title="Demo")
        self.ws = wslib.Workspace(self.root)

    def tearDown(self):
        if self._old_home is None:
            os.environ.pop("HOME", None)
        else:
            os.environ["HOME"] = self._old_home
        self._tmp.cleanup()

    SPEC = "### 目标\n交付 X\n\n### 验收标准\n测试通过\n"

    def fill(self, node, goal=True, plan=True):
        self.ws.set_spec(str(node), self.SPEC)
        if goal:
            (node / "goal.md").write_text("# 目标\n\n## 目标\n交付 X\n\n## 验收标准\n测试通过\n")
        if plan:
            (node / "plan.md").write_text("# 计划\n\n## 方法\n直接做\n")

    def write_result(self, d, status="DONE", body="完成了"):
        (d / "result.md").write_text(f"---\nid: x\nstatus: {status}\n---\n# 结果\n\n## 结论\n{body}\n")

    def errors(self):
        return [i for i in self.ws.check() if i.level == "error"]


class TestInitAndRoot(WsTestCase):
    def test_init_creates_skeleton(self):
        a = self.root / ".agents"
        self.assertTrue((a / "ws.json").is_file())
        self.assertEqual(json.loads((a / "ws.json").read_text())["version"], 4)
        for d in ("memory", "task", "skills"):
            self.assertTrue((a / d).is_dir(), d)
        self.assertIn("conversation.md", (a / ".gitignore").read_text())
        self.assertFalse((a / ".state").exists())
        text = (self.root / "AGENTS.md").read_text()
        for b in wslib.BLOCKS:
            self.assertIn(f"<!-- ws:{b} -->", text)
        self.assertIn("ws task new", text)  # protocol block rendered
        self.assertTrue((a / "memory" / "INDEX.md").is_file())
        self.assertEqual(self.errors(), [])

    def test_init_is_idempotent(self):
        before = (self.root / "AGENTS.md").read_text()
        wslib.init(self.root, profile="task", title="Demo")
        self.assertEqual((self.root / "AGENTS.md").read_text(), before)

    def test_init_refuses_v3(self):
        old = self.home / "old"
        (old / ".agent").mkdir(parents=True)
        (old / ".agent" / "MEMORY.md").write_text("x")
        with self.assertRaises(wslib.WsError):
            wslib.init(old)

    def test_repo_profile_requires_yes_and_keeps_human_text(self):
        repo = self.home / "repo"
        repo.mkdir()
        (repo / "AGENTS.md").write_text("# Human rules\n\nDo not touch.\n")
        with self.assertRaises(wslib.WsError):
            wslib.init(repo, profile="repo")
        wslib.init(repo, profile="repo", yes=True)
        text = (repo / "AGENTS.md").read_text()
        self.assertTrue(text.startswith("# Human rules\n\nDo not touch.\n"))
        self.assertIn("<!-- ws:begin -->", text)
        self.assertIn("<!-- ws:end -->", text)

    def test_find_root(self):
        sub = self.root / "a" / "b"
        sub.mkdir(parents=True)
        self.assertEqual(wslib.find_root(sub), (self.root, 4))
        # ~/.agents (lark-cli managed copy) must never turn $HOME into a workspace.
        (self.home / ".agents" / "skills").mkdir(parents=True)
        elsewhere = self.home / "elsewhere"
        elsewhere.mkdir()
        self.assertEqual(wslib.find_root(elsewhere), (None, None))

    def test_find_root_v3(self):
        old = self.home / "old"
        (old / ".agent" / "memory").mkdir(parents=True)
        self.assertEqual(wslib.find_root(old), (old, 3))
        # A bare .agent/ without MEMORY.md or memory/ is someone else's directory (e.g. OpenClaw workflows).
        other = self.home / "other"
        (other / ".agent" / "workflows").mkdir(parents=True)
        self.assertEqual(wslib.find_root(other), (None, None))


class TestTasks(WsTestCase):
    def test_numbering_ids_and_resolve(self):
        d1, id1 = self.ws.new_task("first", title="第一个")
        d2, id2 = self.ws.new_task("second")
        c1, cid = self.ws.new_task("child", parent="T01")
        self.assertEqual((id1, id2, cid), ("T01", "T02", "T01.01"))
        self.assertEqual(d1.name, "01-first")
        self.assertEqual(c1, d1 / "task" / "01-child")
        self.assertEqual(self.ws.resolve("T01.01"), c1)
        self.assertEqual(self.ws.resolve(str(c1)), c1)
        for f in wslib.NODE_FILES:
            self.assertTrue((c1 / f).is_file(), f)
        fm, _ = wslib.read_fm((c1 / "task.md").read_text())
        self.assertEqual(fm["from"], "T01")
        self.assertEqual(self.ws.task_status(c1), "planned")

    def test_bad_slug(self):
        for bad in ("a/b", "..", ".hidden", "has space", ""):
            with self.assertRaises(wslib.WsError, msg=bad):
                self.ws.new_task(bad)

    def test_concurrent_allocation_is_unique(self):
        names = []

        def make(i):
            d, _ = self.ws.new_task(f"t{i}")
            names.append(d.name.split("-")[0])

        threads = [threading.Thread(target=make, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(sorted(names), [f"{i:02d}" for i in range(1, 9)])

    def test_active_requires_goal_and_plan(self):
        d, nid = self.ws.new_task("x")
        with self.assertRaises(wslib.WsError):
            self.ws.set_status(nid, "active")
        self.fill(d, goal=True, plan=True)
        (d / "task.md").write_text(wslib.render("node/task.md", id=nid, title="x", source="user", date="d", now="n",
                                                spec=wslib.render("node/task-spec.md"), raw=""))
        with self.assertRaisesRegex(wslib.WsError, "任务说明"):
            self.ws.set_status(nid, "active")
        self.fill(d)
        self.ws.set_status(nid, "active")
        self.assertEqual(self.ws.task_status(d), "active")
        self.assertIn("[status] active", (d / "progress.md").read_text())

    def test_done_gates(self):
        d, nid = self.ws.new_task("x")
        self.fill(d)
        self.ws.set_status(nid, "active")
        with self.assertRaisesRegex(wslib.WsError, "result.md"):
            self.ws.set_status(nid, "done")
        self.write_result(d)
        s, _ = self.ws.dispatch(nid, "helper", body="做一件事")
        with self.assertRaisesRegex(wslib.WsError, "派发"):
            self.ws.set_status(nid, "done")
        self.write_result(s)
        note = self.root / ".agents" / "memory" / "n.md"
        note.write_text("---\nsummary: s\ntype: lesson\nsource: T01/S01\nstatus: draft\n---\n# n\n")
        with self.assertRaisesRegex(wslib.WsError, "draft"):
            self.ws.set_status(nid, "done")
        note.write_text("---\nsummary: s\ntype: lesson\nsource: T01/S01\nstatus: stable\n---\n# n\n")
        self.ws.set_status(nid, "done")
        self.assertEqual(self.ws.task_status(d), "done")

    def test_done_force_needs_reason_and_is_logged(self):
        d, nid = self.ws.new_task("x")
        self.ws.set_status(nid, "done", force="用户取消验收")
        self.assertIn("forced", (d / "progress.md").read_text())

    def test_result_status_must_be_valid(self):
        d, nid = self.ws.new_task("x")
        self.fill(d)
        self.write_result(d, status="FINISHED")
        with self.assertRaisesRegex(wslib.WsError, "status"):
            self.ws.set_status(nid, "done")


class TestDispatch(WsTestCase):
    def test_dispatch_creates_brief_and_ref(self):
        d, nid = self.ws.new_task("x")
        s, sid = self.ws.dispatch(nid, "worker", body="背景说明")
        self.assertEqual(sid, "T01/S01")
        self.assertEqual(s, d / "subagent" / "01-worker")
        text = (s / "task.md").read_text()
        self.assertIn("背景说明", text)
        self.assertIn("subagent-protocol.md", text)
        self.assertIn("[dispatch] T01/S01", (d / "progress.md").read_text())
        prompt = wslib.dispatch_prompt(s)
        ref = wslib.find_dispatch_ref(prompt, self.root)
        self.assertEqual(ref, s)
        s2, sid2 = self.ws.dispatch(nid, "worker")
        self.assertEqual(sid2, "T01/S02")

    def test_dispatch_body_sections_fill_template(self):
        _, nid = self.ws.new_task("x")
        body = "背景文字\n\n## 成功标准\n文件 a.txt 存在\n\n## 必读\n- .agents/memory/x.md\n\n## 备注\n额外说明\n"
        s, _ = self.ws.dispatch(nid, "w", body=body)
        text = (s / "task.md").read_text()
        self.assertEqual(text.count("## 成功标准"), 1)
        self.assertIn("背景文字", wslib.section(text, "任务与背景"))
        self.assertIn("a.txt", wslib.section(text, "成功标准"))
        self.assertIn("## 备注\n额外说明", text)
        self.assertEqual(wslib.brief_missing(s / "task.md"), [])

    def test_brief_skeleton_detection(self):
        _, nid = self.ws.new_task("x")
        s, _ = self.ws.dispatch(nid, "w", body="背景")
        self.assertTrue(wslib.brief_missing(s / "task.md"))
        t = (s / "task.md").read_text().replace("## 成功标准\n", "## 成功标准\n文件 a.txt 存在\n")
        (s / "task.md").write_text(t)
        self.assertEqual(wslib.brief_missing(s / "task.md"), [])


class TestInboxAndReq(WsTestCase):
    def test_inbox_capture_filing_and_threshold(self):
        long_text = "请把报告改成按地区拆分，并补上 2025 年的数据对比"
        e1 = self.ws.record_question("sess-1", "aaaaaaaa-1111", long_text)
        self.ws.record_question("sess-1", "bbbbbbbb-2222", "继续")
        self.assertEqual([e["id"] for e in self.ws.unfiled()], [e1])
        d, nid = self.ws.new_task("report")
        self.ws.file_req(nid, entry=e1)
        self.assertIn(long_text, (d / "task.md").read_text())
        self.assertIn(f"· 用户原文 · {e1}", (d / "task.md").read_text().split("## 原文记录", 1)[1])
        self.assertEqual(self.ws.unfiled(), [])
        self.assertEqual(self.ws.conv.stat().st_mode & 0o777, 0o600)
        inbox = self.ws.inbox.read_text()
        self.assertIn(f"## {e1} · ", inbox)
        self.assertIn(f"· session sess-1\n\n{long_text}\n", inbox)
        self.assertIn("继续", inbox)
        self.assertNotIn("🤖", inbox)
        self.assertEqual(self.ws.inbox.stat().st_mode & 0o777, 0o600)

    def test_req_new_and_not_req(self):
        e1 = self.ws.record_question("s", "cccccccc-1", "做一个新的数据看板，展示每周的召回率变化")
        e2 = self.ws.record_question("s", "dddddddd-2", "这个问题我想先了解一下背景再决定怎么做")
        d, nid = self.ws.file_req(new_slug="dashboard", entry=e1)
        self.assertEqual(nid, "T01")
        self.assertIn("召回率", (d / "task.md").read_text())
        self.ws.not_req([e2])
        self.assertEqual(self.ws.unfiled(), [])

    def test_secret_refused(self):
        e = self.ws.record_question("s", "eeeeeeee-1", "用这个 key 跑一下 sk-abcdefghijklmnopqrstuvwxyz123456 谢谢")
        _, nid = self.ws.new_task("x")
        with self.assertRaises(wslib.WsError):
            self.ws.file_req(nid, entry=e)
        self.ws.file_req(nid, entry=e, allow_secret=True)

    def test_unfiled_blocks_done(self):
        d, nid = self.ws.new_task("x")
        self.fill(d)
        self.write_result(d)
        self.ws.record_question("s", "ffffffff-1", "另外记得把图表的配色换成蓝色系，标题加上日期")
        with self.assertRaisesRegex(wslib.WsError, "未归档"):
            self.ws.set_status(nid, "done")


class TestIndexAndCheck(WsTestCase):
    def test_index_idempotent_and_memory_views(self):
        m = self.root / ".agents" / "memory"
        (m / "paper").mkdir()
        (m / "paper" / "method.md").write_text("---\nsummary: 论文方法\ntype: knowledge\ntags: [paper]\nstatus: stable\n---\n# m\n")
        (m / "pitfalls.md").write_text("---\nsummary: 踩坑\ntype: lesson\nstatus: stable\n---\n# p\n")
        self.ws.index()
        a1 = (self.root / "AGENTS.md").read_text()
        i1 = (m / "INDEX.md").read_text()
        changed = self.ws.index()
        self.assertEqual(changed, [])
        self.assertEqual((self.root / "AGENTS.md").read_text(), a1)
        self.assertIn("paper/method.md", i1)
        self.assertIn("### lesson", i1)
        self.assertIn("paper/", a1)

    def test_tree_collapses_inactive_subtrees(self):
        d1, id1 = self.ws.new_task("done-one", title="已完成")
        self.ws.new_task("c1", parent=id1)
        d2, id2 = self.ws.new_task("live", title="进行中")
        c2, cid2 = self.ws.new_task("c2", parent=id2, title="子任务二")
        self.fill(d2)
        self.ws.set_status(id2, "active")
        self.ws.index()
        text = (self.root / "AGENTS.md").read_text()
        self.assertIn("子任务二", text)
        self.assertIn("已折叠", text)
        self.assertNotIn("20", text.split("<!-- ws:tree -->")[1].split("<!-- /ws:tree -->")[0])  # no timestamps

    def test_unbalanced_markers_abort(self):
        p = self.root / "AGENTS.md"
        p.write_text(p.read_text().replace("<!-- /ws:tree -->", ""))
        with self.assertRaises(wslib.WsError):
            self.ws.index()

    def test_check_rules(self):
        d, nid = self.ws.new_task("x")
        (self.root / ".agents" / "task" / "bad-name").mkdir()
        (d / "plan.md").unlink()
        s, _ = self.ws.dispatch(nid, "w")
        self.write_result(s, status="WHATEVER")
        p = self.root / "AGENTS.md"
        p.write_text(p.read_text() + "\n".join(["x"] * 210) + "\n[死链](no/such/file.md)\n")
        (self.root / "stray.txt").write_text("x")
        codes = {i.code for i in self.ws.check()}
        for c in ("number", "node-file", "result-status", "agents-length", "dead-link", "root-file"):
            self.assertIn(c, codes)
        self.assertTrue(self.errors())

    def test_status_text(self):
        d, nid = self.ws.new_task("x", title="做一件事")
        self.fill(d)
        self.ws.set_status(nid, "active")
        self.ws.log(nid, "第一步完成", tag="note")
        text = self.ws.status_text()
        self.assertIn("T01", text)
        self.assertIn("第一步完成", text)
        self.assertLess(len(text), 3500)


class TestConversation(WsTestCase):
    def test_answers_attach_to_open_questions_then_continue(self):
        q1 = self.ws.record_question("sess-aaa1", "aaaaaaaa-1", "第一个问题，内容足够长需要归档的那种")
        q2 = self.ws.record_question("sess-aaa1", "bbbbbbbb-2", "第二个问题")
        other = self.ws.record_question("sess-zzz9", "cccccccc-3", "别的会话的问题")
        self.ws.record_answer("sess-aaa1", "回答一")
        qs = {q["id"]: q for q in self.ws.questions()}
        self.assertTrue(qs[q1]["answered"] and qs[q2]["answered"])
        self.assertFalse(qs[other]["answered"])
        self.assertIn("回答一", self.ws.conv.read_text())
        self.ws.record_answer("sess-aaa1", "后台任务回来后的补充")
        self.assertIn(f"🤖 A（续） → {q2}", self.ws.conv.read_text())
        self.assertIsNone(self.ws.record_answer("no-such", "x"))

    def test_long_answer_is_cut_with_note(self):
        self.ws.record_question("s1", "dddddddd-4", "问题")
        self.ws.record_answer("s1", "长" * (wslib.ANSWER_MAX_CHARS + 50))
        self.assertIn("已截断", self.ws.conv.read_text())

    def test_marks_skips_and_hooks_off(self):
        e = self.ws.record_question("s1", "eeeeeeee-5", "这是一条足够长的需求原文，需要被归档进任务")
        self.ws.not_req([e])
        self.assertEqual(self.ws.unfiled(), [])
        self.ws.log_skip("s1", "Explore -- look")
        self.assertEqual(self.ws.skip_count(), 1)
        self.assertFalse(self.ws.hooks_off())
        cfg = self.ws.config(); cfg["hooks"] = "off"
        (self.root / ".agents" / "ws.json").write_text(json.dumps(cfg))
        self.assertTrue(self.ws.hooks_off())

    def test_migrate_from_v40(self):
        a = self.root / ".agents"
        (a / "inbox").mkdir()
        (a / "inbox" / "2026-11-02.md").write_text(
            "## p11111111 · 2026-11-02 20:00:00 · session abc\n\n老的需求原文，长度超过二十个字符的那一条\n\n"
            "## p22222222 · 2026-11-02 20:05:00 · session abc\n\n另一条老需求原文，也超过二十个字符的长度\n\n")
        (a / ".state").mkdir()
        (a / ".state" / "inbox-filed.log").write_text("p11111111\tfiled\tT01\t2026-11-02 20:01\n")
        (a / ".state" / "secrets.env").write_text("export K=v\n")
        (a / ".state" / "lock").write_text("")
        (self.ws.memory_dir / "howto.md").write_text("---\nsummary: s\ntype: convention\n---\n# h\n\n要点\n\nsource .agents/.state/secrets.env\n")
        self.ws.record_question("new", "33333333-x", "迁移前 hook 已经写进新文件的问题，长度超过二十个字符")
        msgs = self.ws.migrate()
        self.assertTrue(msgs)
        self.assertFalse((a / "inbox").exists() or (a / ".state").exists())
        self.assertEqual((a / "secrets.env").stat().st_mode & 0o777, 0o600)
        self.assertIn(".agents/secrets.env", (self.ws.memory_dir / "howto.md").read_text())
        ids = [q["id"] for q in self.ws.questions()]
        self.assertEqual(ids, ["p11111111", "p22222222", "p33333333"])
        self.assertEqual([q["id"] for q in self.ws.unfiled()], ["p22222222", "p33333333"])
        self.assertEqual(self.ws.migrate(), [])
        self.ws.record_answer("abc", "迁移后第一条回答")
        self.assertNotIn("A → p11111111, ", self.ws.conv.read_text().split("迁移：之前的回答未记录")[1])


class TestMemoryLayers(WsTestCase):
    def note(self, rel, body="# t\n\n要点\n", **fm):
        fm = {"summary": "s", "type": "knowledge", **fm}
        p = self.ws.memory_dir / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("---\n" + "".join(f"{k}: {v}\n" for k, v in fm.items()) + "---\n" + body)
        return p

    def codes(self):
        return {i.code for i in self.ws.check()}

    def test_directory_needs_readme_listing_children(self):
        self.note("codebase/agent.md")
        self.assertIn("memory-readme", self.codes())
        self.note("codebase/README.md", body="# 代码库\n\n要点\n\n| 文件 | 讲什么 |\n|---|---|\n", summary="代码库概览")
        self.assertIn("memory-readme", self.codes())  # agent.md not listed
        self.note("codebase/README.md", body="# 代码库\n\n| agent.md | 主循环 |\n", summary="代码库概览")
        self.assertNotIn("memory-readme", self.codes())
        self.ws.index()
        idx = (self.ws.memory_dir / "INDEX.md").read_text()
        self.assertIn("[codebase/](codebase/README.md) — 代码库概览", idx)

    def test_size_and_plan_headings_warn(self):
        self.note("big.md", body="# b\n" + "字" * 3000)
        self.note("ideas.md", body="# x\n\n## 改进切入点\n- a\n")
        codes = self.codes()
        self.assertIn("memory-size", codes)
        self.assertIn("memory-plan", codes)

    def test_stale_note_detected_by_git(self):
        import subprocess
        run = lambda *a: subprocess.run(["git", "-C", str(self.root), *a], capture_output=True, check=True)
        run("init", "-q"); run("config", "user.email", "t@t"); run("config", "user.name", "t")
        (self.root / "src").mkdir(); (self.root / "src" / "a.py").write_text("x = 1\n")
        run("add", "src"); run("commit", "-qm", "base")
        basis = subprocess.run(["git", "-C", str(self.root), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        self.note("code.md", basis=basis, covers="[src/]")
        self.assertNotIn("memory-stale", self.codes())
        (self.root / "src" / "a.py").write_text("x = 2\n")
        self.assertIn("memory-stale", self.codes())


class TestDispatchExtras(WsTestCase):
    def test_brief_auto_listed(self):
        d, nid = self.ws.new_task("big")
        (d / "brief.md").write_text("# 共用说明\n")
        s, _ = self.ws.dispatch(nid, "w1", body="背景\n\n## 必读\n- a.md\n")
        text = (s / "task.md").read_text()
        self.assertIn(str(d / "brief.md"), wslib.section(text, "必读"))
        self.assertIn("a.md", wslib.section(text, "必读"))

    def test_waves_gate_and_split_warning(self):
        d, nid = self.ws.new_task("big")
        for i in range(10):  # one wide wave is fine
            self.ws.dispatch(nid, f"fan{i}")
        self.assertEqual(self.ws.dispatch_waves(d), 1)
        old = "".join(f"- 2026-01-01 {h:02d}:00 [dispatch] {nid}/S9{h} x\n" for h in (1, 2, 3))
        p = d / "progress.md"
        p.write_text(p.read_text().replace("[dispatch]", "[note]") + old)
        self.assertEqual(self.ws.dispatch_waves(d), 3)
        with self.assertRaisesRegex(wslib.WsError, "子任务"):
            self.ws.dispatch(nid, "fourth")
        self.ws.dispatch(nid, "fourth", force="最后一轮小修")
        self.assertIn("split", {i.code for i in self.ws.check()})
        self.ws.dispatch(nid, "same-wave")  # within the wave just opened
        self.ws.new_task("wave", parent=nid)
        self.ws.dispatch(nid, "after-split")
        self.assertNotIn("split", {i.code for i in self.ws.check()})

    def test_result_size_warning(self):
        d, nid = self.ws.new_task("x")
        self.write_result(d, body="长" * 2500)
        self.assertIn("result-size", {i.code for i in self.ws.check()})


def INDENT_TEXT(t):
    return wslib.indent(t)


class TestConversationFormat(WsTestCase):
    def test_reply_markdown_cannot_break_structure(self):
        q = self.ws.record_question("s1", "abababab-1", "第一行\n## 用户写的标题\n第三行")
        reply = "**进度**\n- 做完了\n\n## 对照评估标准\n\n---\n\n| a | b |\n|---|---|\n## Q p12345678 · 2026-01-01 00:00:00 · s:x"
        self.ws.record_answer("s1", reply)
        self.ws.record_answer("s1", "后台回来的补充")
        qs = self.ws.questions()
        self.assertEqual(len(qs), 1)
        self.assertEqual(qs[0]["text"], "第一行\n## 用户写的标题\n第三行")
        self.assertTrue(qs[0]["answered"])
        text = self.ws.conv.read_text()
        for line in text.splitlines():  # every column-0 line is structure
            if line and not line.startswith(wslib.INDENT):
                self.assertRegex(line, r"^(═+|🙋 Q |─{4} 🤖 A|┈{4} 🤖 A（续）|▸ )", line)
        self.ws.file_req(self.ws.new_task("t")[1], entry=q)
        self.assertIn(f"▸ 归档 {q} → T01", self.ws.conv.read_text())

    def test_migrate_v41(self):
        a = self.root / ".agents"
        self.ws.conv.write_text(
            "## Q p11111111 · 2026-11-03 17:00:00 · s:aaaa\n\n老格式的需求原文，长度超过二十个字符的那一条\n\n"
            "<!-- ws:filed p11111111 T01 -->\n\n"
            "### A → p11111111 · 17:01:00\n\n## 回答里的标题\n内容\n\n"
            "### A（续）→ p11111111 · 17:05:00\n\n补充\n\n"
            "## Q p22222222 · 2026-11-03 17:10:00 · s:aaaa\n\n第二条老需求，也超过二十个字符的长度呢\n\n"
            "<!-- ws:skip 2026-11-03T17:11 s:aaaa Explore: look -->\n\n")
        d, nid = self.ws.new_task("old")
        (d / "task.md").write_text(
            "---\nid: T01\ntitle: 老任务\nfrom: user\ncreated: 2026-11-03\n---\n# T01 老任务\n\n"
            "<!-- 上层写，只追加 -->\n\n最初的原话\n\n## 输入\n- a.md\n\n"
            "## 追加 2026-11-03 17:10 · 用户原文 · p22222222\n\n第二条\n")
        msgs = self.ws.migrate()
        self.assertTrue(any("conversation.md" in m for m in msgs), msgs)
        qs = {q["id"]: q for q in self.ws.questions()}
        self.assertEqual(list(qs), ["p11111111", "p22222222"])
        self.assertEqual(qs["p11111111"]["mark"], "filed")
        self.assertTrue(qs["p11111111"]["answered"])
        self.assertFalse(qs["p22222222"]["answered"])
        self.assertEqual(qs["p22222222"]["text"], "第二条老需求，也超过二十个字符的长度呢")
        self.assertIn("  ## 回答里的标题", self.ws.conv.read_text())
        self.assertIn("## p22222222 · 2026-11-03 17:10:00 · session aaaa\n\n第二条老需求", (a / "inbox.md").read_text())
        (a / "inbox.md").write_text("━━━ 2026-11-03 17:00:00 · p11111111 ━━━━\n\n  老\n\n")  # v4.2 pre-release layout
        self.assertTrue(any("重写 inbox.md" in m for m in self.ws.migrate()))
        self.assertTrue((a / "inbox.md").read_text().startswith("## p11111111 · "))
        t = (d / "task.md").read_text()
        self.assertIsNotNone(wslib.task_spec(t))
        raw = t.split("## 原文记录", 1)[1]
        self.assertIn("最初的原话", raw)
        self.assertIn("#### 输入", raw)
        self.assertIn("### 2026-11-03 17:10 · 用户原文 · p22222222", raw)
        self.assertEqual(wslib.spec_stale(t), "2026-11-03 17:10")
        self.assertEqual(self.ws.migrate(), [])


class TestTaskSpec(WsTestCase):
    def test_spec_from_stdin_headings_or_raw(self):
        d, _ = self.ws.new_task("a", body="## 目标\n做 A\n\n## 验收标准\n跑通\n")
        self.assertEqual(wslib.spec_missing((d / "task.md").read_text()), [])
        d2, _ = self.ws.new_task("b", parent="T01", body="父节点的一段说明")
        t2 = (d2 / "task.md").read_text()
        self.assertEqual(wslib.spec_missing(t2), ["目标", "验收标准"])
        self.assertIn("· 上层说明 · T01", t2)

    def test_req_makes_spec_stale_until_rewritten(self):
        d, nid = self.ws.new_task("a", body="### 目标\n做 A\n### 验收标准\n跑通\n")
        p = d / "task.md"
        p.write_text(wslib.set_fm(p.read_text(), updated="2000-01-01 00:00"))
        e = self.ws.record_question("s", "12121212-1", "再加一个要求：导出成 CSV，并且保留原始列名")
        self.ws.file_req(nid, entry=e)
        self.assertIn("task-spec-stale", {i.code for i in self.ws.check()})
        self.ws.set_spec(nid, "### 目标\n做 A\n### 要求\n1. 导出 CSV（p12121212）\n### 验收标准\n跑通\n")
        text = p.read_text()
        self.assertNotIn("task-spec-stale", {i.code for i in self.ws.check()})
        self.assertIn("导出 CSV", wslib.task_spec(text))
        self.assertIn("再加一个要求", text.split("## 原文记录", 1)[1])


class TestHistoryChecks(WsTestCase):
    def test_close_ready_memory_empty_and_size(self):
        d, nid = self.ws.new_task("x")
        self.fill(d)
        self.ws.set_status(nid, "active")
        for i in range(wslib.HISTORY_MIN_RESULTS):
            s, _ = self.ws.dispatch(nid, f"w{i}")
            self.write_result(s)
        p = d / "progress.md"
        p.write_text(re.sub(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}", "2020-01-01 00:00", p.read_text()))
        with open(s / "big.bin", "wb") as f:
            f.truncate(wslib.DISPATCH_MAX_BYTES + 1)
        codes = {i.code for i in self.ws.check()}
        for c in ("close-ready", "memory-empty", "dispatch-size", "agents-length"):
            self.assertIn(c, codes)


class TestReturnsAndFollowups(WsTestCase):
    RESULT = ("---\nstatus: DONE\n---\n# r\n\n## 结论\n完成\n\n## 需要上层处理\n- 自我回退没计入\n"
              "  - 子项不单独算\n- 仅 AI 批准的评审不可比\n\n## 验证\n- 跑了 → 通过\n")

    def test_concern_items(self):
        self.assertEqual(len(wslib.concern_items(self.RESULT)), 2)
        for none in ("无", "- 无", "无。", "none"):
            self.assertEqual(wslib.concern_items(f"## 需要上层处理\n{none}\n"), [], none)
        self.assertEqual(len(wslib.concern_items("## 需要上层处理\n一段没有列表的说明\n")), 1)

    def test_return_note_and_concern_check(self):
        d, nid = self.ws.new_task("x", body="### 目标\n做\n### 要求\n- [ ] R1 甲\n- [x] R2 乙\n### 验收标准\n过\n")
        self.fill(d, goal=True, plan=True)
        self.ws.set_spec(nid, "### 目标\n做\n### 要求\n- [ ] R1 甲\n- [x] R2 乙\n### 验收标准\n过\n")
        self.ws.set_status(nid, "active")
        s1, sid1 = self.ws.dispatch(nid, "a")
        self.ws.dispatch(nid, "b")
        (s1 / "result.md").write_text(self.RESULT)
        note = self.ws.return_note(s1)
        for part in (sid1, "DONE", "2 条", "本波还有 1 路没回（S02）", "已进行 0h", "1 条要求未完成"):
            self.assertIn(part, note)
        self.assertIn("concern-open", {i.code for i in self.ws.check()})
        self.ws.log(nid, "S01 问题1 修（新派发），问题2 豁免：只作解释", tag="decision")
        self.assertNotIn("concern-open", {i.code for i in self.ws.check()})

    def test_followup_keeps_old_results_and_opens_no_wave(self):
        _, nid = self.ws.new_task("x")
        s, sid = self.ws.dispatch(nid, "w")
        self.write_result(s)
        _, moved = self.ws.followup(sid, "改成中英两版，可写范围加上 site/method/")
        self.assertEqual(moved, "result-r1.md")
        self.assertFalse((s / "result.md").exists())
        self.assertIn("## 追加", (s / "task.md").read_text())
        self.assertIn("site/method/", (s / "task.md").read_text())
        prompt = wslib.followup_prompt(s, moved)
        self.assertEqual(wslib.find_dispatch_ref(prompt, self.root), s)
        self.write_result(s)
        self.assertEqual(self.ws.followup(sid, "再补一点")[1], "result-r2.md")
        self.assertEqual(self.ws.dispatch_waves(self.ws.resolve(nid)), 1)
        with self.assertRaises(wslib.WsError):
            self.ws.followup(nid, "x")  # a node, not a dispatch

    def test_steady_trickle_does_not_chain_into_one_wave(self):
        d, nid = self.ws.new_task("x")
        p = d / "progress.md"
        p.write_text(p.read_text() + "".join(f"- 2026-01-01 10:{m:02d} [dispatch] {nid}/S{i:02d} x\n"
                                             for i, m in enumerate(range(0, 40, 5), 1)))
        self.assertEqual([len(w) for w in self.ws.waves(d)], [3, 3, 2])  # anchors 10:00, 10:15, 10:30

    def test_external_and_hook_notes_open_no_wave(self):
        d, nid = self.ws.new_task("x")
        p = d / "progress.md"
        p.write_text(p.read_text() + "".join(f"- 2026-01-01 {h:02d}:00 [dispatch] {nid}/S0{h} x\n" for h in (1, 2, 3))
                     + f"- 2026-01-01 05:00 [dispatch] {nid}/S01 没有自己写 result.md，hook 代存为 UNVERIFIED\n")
        self.assertEqual(self.ws.dispatch_waves(d), 3)
        e, _ = self.ws.dispatch(nid, "codex-audit", external=True)
        self.assertIn("外部执行", (e / "task.md").read_text())
        self.assertEqual(self.ws.dispatch_waves(d), 3)
        with self.assertRaises(wslib.WsError):
            self.ws.dispatch(nid, "fourth")

    def test_repeated_paragraphs(self):
        _, nid = self.ws.new_task("x")
        para = "GitHub GraphQL 限流：二级限流时把并发降到 1，等待 90 秒后重试；别名批量每次不超过 25 个；" * 3
        paths = "\n".join(f"- .agents/memory/topic/file{i}.md 这是一个很长的必读路径说明用来凑长度" for i in range(6))
        s1, _ = self.ws.dispatch(nid, "a", body=f"背景\n\n{para}\n\n## 必读\n{paths}\n")
        self.assertEqual(self.ws.repeated_paragraphs(s1, para), [])
        s2, _ = self.ws.dispatch(nid, "b", body=f"另一段背景\n\n{para}\n\n## 必读\n{paths}\n")
        hits = self.ws.repeated_paragraphs(s2, f"另一段背景\n\n{para}\n\n## 必读\n{paths}\n")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0][1], [f"{nid}/S01"])

    def test_review_fixes(self):
        # concern_items: none-variants, all-none bullets, "2、" without a space
        for none in ("无。备注：已和上层确认", "暂无", "无需上层处理", "- 无\n- 无"):
            self.assertEqual(wslib.concern_items(f"## 需要上层处理\n{none}\n"), [], none)
        self.assertEqual(len(wslib.concern_items("## 需要上层处理\n1、口径不一\n2、数据缺一天\n")), 2)
        # open_requirements only looks at「要求」
        d, nid = self.ws.new_task("x")
        self.ws.set_spec(nid, "### 目标\n做\n### 要求\n- [ ] R1 甲\n### 验收标准\n- [ ] 测试通过\n")
        self.assertEqual(wslib.open_requirements((d / "task.md").read_text()), 1)
        # return_note reports the returning dispatch's own wave
        s1, _ = self.ws.dispatch(nid, "a")
        s2, _ = self.ws.dispatch(nid, "b")
        s3, _ = self.ws.dispatch(nid, "c")
        p = d / "progress.md"
        p.write_text(re.sub(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?= \[dispatch\] T01/S0[12])", "2026-01-01 10:00", p.read_text()))
        p.write_text(re.sub(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?= \[dispatch\] T01/S03)", "2026-01-01 10:30", p.read_text()))
        for s in (s1, s3):
            self.write_result(s)
        self.assertIn("本波已全部回齐", self.ws.return_note(s3))
        self.assertIn("本波还有 1 路没回（S02）", self.ws.return_note(s1))
        # decided: adjacent CJK, other node's path, decisions older than the result
        self.write_result(s1, body="完成")
        (s1 / "result.md").write_text((s1 / "result.md").read_text() + "\n## 需要上层处理\n- 口径\n")
        with open(p, "a") as f:
            f.write("- 2000-01-01 00:00 [decision] S01修复口径（这是旧一轮的决定）\n")
            f.write(f"- {wslib.now()} [decision] T01.02/S01 修\n")
        self.assertFalse(self.ws.decided(d, "T01/S01"))
        self.ws.log(nid, "豁免S01：只作解释", tag="decision")
        self.assertTrue(self.ws.decided(d, "T01/S01"))
        # robustness: deleted dispatch dir, missing progress.md
        shutil.rmtree(s2)
        self.assertIn("本波已全部回齐", self.ws.return_note(s1))
        p.unlink()
        self.assertIn("回来了", self.ws.return_note(s1))

    def test_followup_while_still_running(self):
        _, nid = self.ws.new_task("x")
        s, sid = self.ws.dispatch(nid, "w")
        _, moved = self.ws.followup(sid, "顺便把英文版也做了")
        self.assertIsNone(moved)
        self.assertIn("先把它改名为 result-rN.md", wslib.followup_prompt(s, moved))
        self.ws.dispatch(nid, "plain", title="续派分析")  # a title starting with 续派 is still a real dispatch
        self.assertEqual(sum(len(w) for w in self.ws.waves(self.ws.resolve(nid))), 2)

    def test_req_open_warns_on_done(self):
        d, nid = self.ws.new_task("x")
        self.ws.set_spec(nid, "### 目标\n做\n### 要求\n- [ ] R1 没做完的\n### 验收标准\n过\n")
        self.ws.set_status(nid, "done", force="测试")
        self.assertIn("req-open", {i.code for i in self.ws.check()})


class TestCli(WsTestCase):
    def run_cli(self, *args, stdin=None):
        out = io.StringIO()
        old_in = sys.stdin
        if stdin is not None:
            sys.stdin = io.StringIO(stdin)
        try:
            with redirect_stdout(out), redirect_stderr(out):
                code = wslib.main(["--root", str(self.root), *args])
        finally:
            sys.stdin = old_in
        return code, out.getvalue()

    def test_cli_flow(self):
        code, out = self.run_cli("task", "new", "demo", "--title", "演示", "--stdin", stdin="用户原话")
        self.assertEqual(code, 0)
        self.assertIn("T01", out)
        code, out = self.run_cli("dispatch", "T01", "worker", "--stdin", stdin="背景")
        self.assertEqual(code, 0)
        self.assertIn("task.md", out)
        code, out = self.run_cli("check")
        self.assertEqual(code, 0, out)
        code, out = self.run_cli("task", "status", "T01", "active")
        self.assertEqual(code, 1)  # goal/plan still skeletons
        self.assertIn("goal.md", out)
        code, out = self.run_cli("task", "spec", "T01", stdin="### 目标\n演示\n### 验收标准\n能跑\n")
        self.assertEqual(code, 0, out)
        self.assertIn("goal.md 最后修改于", out)
        self.write_result(self.ws.resolve("T01/S01"))
        code, out = self.run_cli("followup", "T01/S01", stdin="补一个要求")
        self.assertEqual(code, 0, out)
        self.assertIn("result-r1.md", out)
        self.assertIn("task.md", out.splitlines()[-1])
        code, out = self.run_cli("dispatch", "T01", "ext", "--external", "--stdin", stdin="外部审查")
        self.assertEqual(code, 0, out)
        self.assertNotIn("派发 prompt", out)


if __name__ == "__main__":
    unittest.main()
