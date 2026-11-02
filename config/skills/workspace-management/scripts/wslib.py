"""Workspace v4: structure, IDs, generated blocks and checks.

Shared by the `ws` command line and the workspace-guard hook. Standard library only.
Spec: ../references/spec.md
"""
from __future__ import annotations

import argparse
import datetime as _dt
import fcntl
import json
import os
import re
import sys
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATES = SKILL_DIR / "templates"
SPEC_DOC = SKILL_DIR / "references" / "spec.md"
PROTOCOL_DOC = SKILL_DIR / "references" / "subagent-protocol.md"
WS_SCRIPT = SKILL_DIR / "scripts" / "ws"

NODE_FILES = ("task.md", "goal.md", "plan.md", "progress.md")
TASK_STATUSES = ("planned", "active", "blocked", "done", "dropped")
RESULT_STATUSES = ("DONE", "DONE_WITH_CONCERNS", "NEEDS_CONTEXT", "BLOCKED")
UNVERIFIED = "UNVERIFIED"  # written only by the hook when a subagent never wrote its result.md
MEMORY_TYPES = ("knowledge", "convention", "source", "lesson", "decision")
LOG_TAGS = ("status", "dispatch", "decision", "surprise", "note", "req")
BLOCKS = ("memory", "tree", "protocol", "skills")
INBOX_MIN_CHARS = 20  # shorter messages ("继续", "ok") never need filing
AGENTS_MAX_LINES = 200
ROOT_ALLOWED = {"AGENTS.md", ".agents", ".claude", ".claude.archived", ".git", ".gitignore", ".DS_Store", "README.md"}

NUM_RE = re.compile(r"^(\d{2,})-([\w-]+)$")
SLUG_RE = re.compile(r"^[\w][\w-]*$")
ID_RE = re.compile(r"^T(\d+(?:\.\d+)*)(?:/S(\d+))?$")
# Only the part from `.agents/` on is matched, so spaces earlier in an absolute path do not matter.
DISPATCH_REF_RE = re.compile(r"\.agents/task/(?:[^\s/\"'`<>()]+/)+?subagent/\d{2,}-[^\s/\"'`<>()]+/task\.md")
INBOX_HEAD_RE = re.compile(r"^## (p[0-9a-f]{8}) · ([0-9: -]+) · session (\S*)$", re.M)
LINK_RE = re.compile(r"\]\(([^)\s#]+)(?:#[^)]*)?\)")
SECRET_RE = re.compile(
    r"sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abpr]-[A-Za-z0-9-]{10,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)\s*=\s*\S{8,}"
)


class WsError(Exception):
    """A refused operation; the message tells the agent what to do instead."""


@dataclass
class Issue:
    level: str  # error | warn | info
    code: str
    msg: str

    def __str__(self):
        return f"{self.level.upper()} [{self.code}] {self.msg}"


def now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%d %H:%M")


def today() -> str:
    return _dt.date.today().isoformat()


# ---------- small text helpers ----------

def read_fm(text: str) -> tuple[dict, str]:
    """Parse the simple `key: value` frontmatter used in workspace files (lists as `[a, b]`)."""
    if not text.startswith("---\n"):
        return {}, text
    end = text.find("\n---", 4)
    if end < 0:
        return {}, text
    fm = {}
    for line in text[4:end].splitlines():
        m = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
        if not m:
            continue
        v = m.group(2).strip()
        if v.startswith("[") and v.endswith("]"):
            fm[m.group(1)] = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
        else:
            fm[m.group(1)] = v.strip("'\"")
    rest = text[end + 4:]
    return fm, rest[1:] if rest.startswith("\n") else rest


def set_fm(text: str, **updates) -> str:
    fm_lines, body = [], text
    if text.startswith("---\n") and text.find("\n---", 4) > 0:
        end = text.find("\n---", 4)
        fm_lines = text[4:end].splitlines()
        body = text[end + 4:].lstrip("\n")
    for k, v in updates.items():
        for i, line in enumerate(fm_lines):
            if re.match(rf"^{re.escape(k)}:", line):
                fm_lines[i] = f"{k}: {v}"
                break
        else:
            fm_lines.append(f"{k}: {v}")
    return "---\n" + "\n".join(fm_lines) + "\n---\n" + body


def meaningful(text: str) -> str:
    """Text left after removing frontmatter, HTML comments, headings and blank lines."""
    _, body = read_fm(text)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    return "\n".join(l for l in body.splitlines() if l.strip() and not l.lstrip().startswith("#")).strip()


def section(text: str, heading: str) -> str:
    m = re.search(rf"^##\s+{re.escape(heading)}\s*$", text, re.M)
    if not m:
        return ""
    rest = text[m.end():]
    nxt = re.search(r"^##\s", rest, re.M)
    return meaningful(rest[: nxt.start()] if nxt else rest)


def fill_sections(text: str, body: str) -> str:
    """Put each `## heading` block of body into the same-named section of text; leading text goes to the first section."""
    parts = re.split(r"^##\s+(.+?)\s*$", body.strip(), flags=re.M)
    given = dict(zip(parts[1::2], (p.strip() for p in parts[2::2])))
    heads = re.findall(r"^##\s+(.+?)\s*$", text, re.M)
    if parts[0].strip():
        given[heads[0]] = (parts[0].strip() + "\n\n" + given.get(heads[0], "")).strip()
    for h, content in given.items():
        if h in heads:
            pat = rf"(^##\s+{re.escape(h)}\s*\n).*?(?=^##\s|\Z)"
            text = re.sub(pat, lambda m: m.group(1) + content + "\n\n", text, count=1, flags=re.M | re.S)
        else:
            text = text.rstrip("\n") + f"\n\n## {h}\n{content}\n"
    return text.rstrip("\n") + "\n"


def render(template: str, **ctx) -> str:
    text = (TEMPLATES / template).read_text()
    for k, v in ctx.items():
        text = text.replace("{" + k + "}", str(v))
    return text


def check_slug(slug: str):
    if not slug or not SLUG_RE.match(slug) or slug.startswith("."):
        raise WsError(f"非法名称 {slug!r}：只能用字母、数字、中文、下划线和连字符，不能含空格或斜杠")


def numbered(d: Path) -> list[tuple[int, Path]]:
    if not d.is_dir():
        return []
    out = []
    for p in d.iterdir():
        m = NUM_RE.match(p.name)
        if p.is_dir() and m:
            out.append((int(m.group(1)), p))
    return sorted(out)


# ---------- root detection ----------

def find_root(start) -> tuple[Path | None, int | None]:
    """Nearest v4 (`.agents/ws.json`) or v3 (`.agent/MEMORY.md` or `.agent/memory/`) root, never $HOME or above it."""
    home = Path.home().resolve()
    p = Path(start).expanduser().resolve()
    if p.is_file():
        p = p.parent
    while p != home and p != p.parent:
        if (p / ".agents" / "ws.json").is_file():
            return p, 4
        old = p / ".agent"
        if old.is_dir() and ((old / "MEMORY.md").is_file() or (old / "memory").is_dir()):
            return p, 3
        p = p.parent
    return None, None


def find_dispatch_ref(text: str, root: Path) -> Path | None:
    """The existing dispatch directory referenced in a prompt, if any."""
    for m in DISPATCH_REF_RE.finditer(text or ""):
        p = root / m.group(0)
        if p.is_file():
            return p.parent
    return None


def dispatch_prompt(dispatch_dir: Path) -> str:
    return f"先读 {dispatch_dir / 'task.md'} 并严格按其执行。"


def brief_missing(task_md: Path) -> list[str]:
    text = task_md.read_text()
    return [h for h in ("任务与背景", "成功标准") if not section(text, h)]


def result_problem(path: Path, allow_unverified: bool = False) -> str | None:
    if not path.is_file():
        return f"缺少 {path.name}"
    text = path.read_text()
    status = read_fm(text)[0].get("status", "")
    allowed = RESULT_STATUSES + ((UNVERIFIED,) if allow_unverified else ())
    if status not in allowed:
        return f"{path} 的 frontmatter status 是 {status or '空'}，应为 {' | '.join(RESULT_STATUSES)}"
    if not meaningful(text):
        return f"{path} 只有模板骨架，没有内容"
    return None


# ---------- workspace ----------

class Workspace:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.agents = self.root / ".agents"
        self.task_dir = self.agents / "task"
        self.memory_dir = self.agents / "memory"
        self.skills_dir = self.agents / "skills"
        self.inbox_dir = self.agents / "inbox"
        self.state_dir = self.agents / ".state"
        self.agents_md = self.root / "AGENTS.md"

    @classmethod
    def locate(cls, start=None) -> "Workspace":
        root, ver = find_root(start or os.getcwd())
        if ver == 3:
            raise WsError(f"{root} 是 v3 工作区（.agent/），ws 只支持 v4；v3 规则见 references/v3-legacy.md")
        if root is None:
            raise WsError("当前目录不在 v4 工作区内（向上找不到 .agents/ws.json）；新建用 ws init")
        return cls(root)

    def config(self) -> dict:
        return json.loads((self.agents / "ws.json").read_text())

    @contextmanager
    def lock(self):
        self.state_dir.mkdir(parents=True, exist_ok=True)
        with open(self.state_dir / "lock", "a+") as f:
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def rel(self, p: Path) -> str:
        return str(Path(p).resolve().relative_to(self.root))

    # --- ids ---
    def node_id(self, path: Path) -> str:
        parts = Path(path).resolve().relative_to(self.task_dir.resolve()).parts
        nums, sub, i = [], None, 0
        while i < len(parts):
            if parts[i] == "task":
                i += 1
                continue
            if parts[i] == "subagent":
                sub = int(NUM_RE.match(parts[i + 1]).group(1))
                break
            nums.append(int(NUM_RE.match(parts[i]).group(1)))
            i += 1
        return "T" + ".".join(f"{n:02d}" for n in nums) + (f"/S{sub:02d}" if sub is not None else "")

    def resolve(self, ident: str) -> Path:
        m = ID_RE.match(ident.strip())
        if not m:
            p = Path(ident).expanduser()
            p = (p if p.is_absolute() else Path.cwd() / p).resolve()
            if p.is_dir() and self.task_dir.resolve() in p.parents:
                return p
            raise WsError(f"无法识别节点 {ident!r}：用 T01、T01.02、T01.02/S03 或节点目录路径")
        cur = self.task_dir
        for k, num in enumerate(m.group(1).split(".")):
            parent = cur if k == 0 else cur / "task"
            hits = [p for n, p in numbered(parent) if n == int(num)]
            if len(hits) != 1:
                raise WsError(f"找不到节点 {ident}（{self.rel(parent)} 下没有唯一的 {int(num):02d}-*）")
            cur = hits[0]
        if m.group(2):
            hits = [p for n, p in numbered(cur / "subagent") if n == int(m.group(2))]
            if len(hits) != 1:
                raise WsError(f"找不到派发 {ident}")
            cur = hits[0]
        return cur

    def resolve_task(self, ident: str) -> Path:
        p = self.resolve(ident)
        if p.parent.name == "subagent":
            raise WsError(f"{ident} 是派发目录，这里需要任务节点")
        return p

    def _alloc(self, parent_dir: Path, slug: str) -> Path:
        parent_dir.mkdir(parents=True, exist_ok=True)
        n = max((k for k, _ in numbered(parent_dir)), default=0) + 1
        p = parent_dir / f"{n:02d}-{slug}"
        p.mkdir()
        return p

    # --- tasks ---
    def new_task(self, slug, title=None, parent=None, body="", source=None):
        check_slug(slug)
        with self.lock():
            parent_dir = self.task_dir if parent is None else self.resolve_task(parent) / "task"
            d = self._alloc(parent_dir, slug)
        nid = self.node_id(d)
        ctx = dict(id=nid, title=title or slug, date=today(), now=now(),
                   source=source or ("user" if parent is None else self.node_id(parent_dir.parent)),
                   body=body.strip() or "<!-- 上层的要求写在这里 -->")
        for name in NODE_FILES:
            (d / name).write_text(render(f"node/{name}", **ctx))
        return d, nid

    def task_status(self, d: Path) -> str:
        p = d / "progress.md"
        return read_fm(p.read_text())[0].get("status", "?") if p.is_file() else "?"

    def tasks(self, under: Path | None = None):
        """All task nodes, depth first."""
        base = under if under is not None else self.task_dir
        for _, d in numbered(base):
            yield d
            yield from self.tasks(d / "task")

    def set_status(self, ident, status, force=None):
        if status not in TASK_STATUSES:
            raise WsError(f"状态只能是 {' | '.join(TASK_STATUSES)}")
        d = self.resolve_task(ident)
        nid = self.node_id(d)
        problems = []
        if status == "active":
            for f in ("goal.md", "plan.md"):
                if not meaningful((d / f).read_text()):
                    problems.append(f"{f} 还是空骨架：先写清目标和验收标准、方法和拆分")
        if status == "done":
            prob = result_problem(d / "result.md")
            if prob:
                problems.append(f"{prob}（模板：{TEMPLATES / 'node' / 'result.md'}）")
            for _, s in numbered(d / "subagent"):
                if not (s / "result.md").is_file():
                    problems.append(f"派发 {self.node_id(s)} 没有 result.md：等它回来，或写明失败原因")
            for c in self.tasks(d / "task"):
                if self.task_status(c) not in ("done", "dropped"):
                    problems.append(f"子任务 {self.node_id(c)} 状态是 {self.task_status(c)}")
            for rel, fm in self.drafts_for(nid):
                problems.append(f"memory/{rel} 仍是 draft（source {fm.get('source')}）：转正为 stable 或合并")
            for e in self.unfiled():
                problems.append(f"inbox 里 {e['id']} 未归档：ws req … --entry {e['id']} 或 ws req --not-req {e['id']}")
        if problems and not force:
            raise WsError("不能设为 " + status + "：\n- " + "\n- ".join(problems))
        with self.lock():
            p = d / "progress.md"
            p.write_text(set_fm(p.read_text(), status=status))
        self.log(nid, status + (f"（forced: {force}）" if problems and force else ""), tag="status")
        return d

    def log(self, ident, text, tag="note"):
        if tag not in LOG_TAGS:
            raise WsError(f"tag 只能是 {' | '.join(LOG_TAGS)}")
        d = self.resolve_task(ident)
        line = f"- {now()} [{tag}] {' '.join(text.split())}\n"
        with open(d / "progress.md", "a") as f:
            f.write(line)

    # --- dispatch ---
    def dispatch(self, ident, slug, title=None, body=""):
        check_slug(slug)
        node = self.resolve_task(ident)
        with self.lock():
            d = self._alloc(node / "subagent", slug)
        did = self.node_id(d)
        brief = render(
            "dispatch-task.md", id=did, parent=self.node_id(node), title=title or slug, date=today(),
            protocol=PROTOCOL_DOC, dir=d, result_template=TEMPLATES / "node" / "result.md",
            body="<!-- 要做什么、为什么；背景讲够，子智能体不继承你的上下文 -->")
        (d / "task.md").write_text(fill_sections(brief, body) if body.strip() else brief)
        self.log(self.node_id(node), f"{did} {title or slug}", tag="dispatch")
        return d, did

    # --- inbox ---
    def inbox_append(self, session_id, prompt_id, prompt) -> str:
        eid = "p" + (prompt_id or uuid.uuid4().hex).replace("-", "")[:8].lower()
        self.inbox_dir.mkdir(parents=True, exist_ok=True)
        stamp = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"## {eid} · {stamp} · session {(session_id or '-')[:8]}\n\n{prompt.rstrip()}\n\n"
        fd = os.open(self.inbox_dir / f"{today()}.md", os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        try:
            os.write(fd, entry.encode())
        finally:
            os.close(fd)
        return eid

    def inbox_entries(self) -> list[dict]:
        out = []
        for f in sorted(self.inbox_dir.glob("*.md")) if self.inbox_dir.is_dir() else []:
            text = f.read_text()
            heads = list(INBOX_HEAD_RE.finditer(text))
            for i, h in enumerate(heads):
                end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
                out.append({"id": h.group(1), "time": h.group(2), "session": h.group(3),
                            "text": text[h.end():end].strip()})
        return out

    def _filed(self) -> set[str]:
        p = self.state_dir / "inbox-filed.log"
        return {l.split("\t")[0] for l in p.read_text().splitlines() if l} if p.is_file() else set()

    def _mark(self, eid, kind, target=""):
        self.state_dir.mkdir(parents=True, exist_ok=True)
        with open(self.state_dir / "inbox-filed.log", "a") as f:
            f.write(f"{eid}\t{kind}\t{target}\t{now()}\n")

    def unfiled(self) -> list[dict]:
        filed = self._filed()
        return [e for e in self.inbox_entries() if e["id"] not in filed and len(e["text"]) >= INBOX_MIN_CHARS]

    def entry(self, eid) -> dict:
        for e in self.inbox_entries():
            if e["id"] == eid:
                return e
        raise WsError(f"inbox 里没有 {eid}；ws inbox 列出未归档的条目")

    def file_req(self, target=None, entry=None, text=None, new_slug=None, title=None, parent=None,
                 allow_secret=False):
        content = self.entry(entry)["text"] if entry else (text or "").strip()
        if not content:
            raise WsError("没有可归档的内容：用 --entry <id> 或 --stdin")
        if SECRET_RE.search(content) and not allow_secret:
            raise WsError("内容里疑似有密钥或口令；确认无误后加 --allow-secret（task.md 可能被提交进 git）")
        if new_slug:
            d, nid = self.new_task(new_slug, title=title, parent=parent, body=content, source="user")
        else:
            if not target:
                raise WsError("要指定节点 ID，或用 --new <slug> 开新任务")
            d = self.resolve_task(target)
            nid = self.node_id(d)
            with self.lock(), open(d / "task.md", "a") as f:
                f.write(f"\n## 追加 {now()} · 用户原文{' · ' + entry if entry else ''}\n\n{content}\n")
        self.log(nid, f"{entry or 'stdin'} 归档进 task.md", tag="req")
        if entry:
            self._mark(entry, "filed", nid)
        return d, nid

    def not_req(self, eids):
        for eid in eids:
            self.entry(eid)
            self._mark(eid, "not-req")

    # --- memory ---
    def memory_notes(self):
        if not self.memory_dir.is_dir():
            return
        for p in sorted(self.memory_dir.rglob("*.md")):
            if p == self.memory_dir / "INDEX.md":
                continue
            yield p.relative_to(self.memory_dir).as_posix(), read_fm(p.read_text())[0]

    def drafts_for(self, nid):
        for rel, fm in self.memory_notes():
            src = str(fm.get("source", ""))
            if fm.get("status") == "draft" and (src == nid or src.startswith(nid + ".") or src.startswith(nid + "/")):
                yield rel, fm

    # --- generated content ---
    def render_memory_index(self) -> str:
        notes = list(self.memory_notes())
        lines = ["# Memory 索引", "", "<!-- 由 ws index 生成，不要手改；每个文件的 summary/type 写在它自己的 frontmatter 里 -->", "",
                 "## 目录树", ""]
        shown_dirs = set()
        for rel, fm in notes:
            parts = rel.split("/")
            for depth in range(len(parts) - 1):
                key = "/".join(parts[: depth + 1])
                if key not in shown_dirs:
                    shown_dirs.add(key)
                    lines.append(f"{'  ' * depth}- {parts[depth]}/")
            tag = f" `{fm.get('type', '?')}`" + (" draft" if fm.get("status") == "draft" else "")
            lines.append(f"{'  ' * (len(parts) - 1)}- [{parts[-1]}]({rel}) — {fm.get('summary', '（缺 summary）')}{tag}")
        if not notes:
            lines.append("（暂无）")
        lines += ["", "## 按类型", ""]
        for t in MEMORY_TYPES + ("?",):
            items = [(r, f) for r, f in notes if f.get("type", "?") == t or (t == "?" and f.get("type") not in MEMORY_TYPES)]
            if items:
                lines.append(f"### {t}")
                lines += [f"- [{r}]({r}) — {f.get('summary', '')}" for r, f in items]
                lines.append("")
        drafts = [(r, f) for r, f in notes if f.get("status") == "draft"]
        if drafts:
            lines += ["## 草稿（节点收尾时转正或合并）", ""]
            lines += [f"- [{r}]({r}) — source {f.get('source', '?')}" for r, f in drafts]
        return "\n".join(lines).rstrip() + "\n"

    def render_memory_block(self) -> str:
        if not self.memory_dir.is_dir():
            return "（暂无）"
        lines = []
        for p in sorted(self.memory_dir.iterdir()):
            if p.name.startswith(".") or p.name == "INDEX.md":
                continue
            if p.is_dir():
                lines.append(f"- `{p.name}/`（{sum(1 for _ in p.rglob('*.md'))} 篇）")
            elif p.suffix == ".md":
                lines.append(f"- `{p.name}` — {read_fm(p.read_text())[0].get('summary', '')}")
        head = "完整目录树和按类型视图：[.agents/memory/INDEX.md](.agents/memory/INDEX.md)"
        return head + ("\n\n" + "\n".join(lines) if lines else "\n\n（暂无）")

    def _has_active(self, d: Path) -> bool:
        return self.task_status(d) == "active" or any(self.task_status(c) == "active" for c in self.tasks(d / "task"))

    def render_tree(self) -> str:
        lines = []

        def walk(base, depth):
            for _, d in numbered(base):
                fm = read_fm((d / "task.md").read_text())[0] if (d / "task.md").is_file() else {}
                subs = numbered(d / "subagent")
                open_n = sum(1 for _, s in subs if not (s / "result.md").is_file())
                extra = f"，派发 {len(subs)}" + (f"（{open_n} 未回）" if open_n else "") if subs else ""
                res = f" · [result]({self.rel(d / 'result.md')})" if (d / "result.md").is_file() else ""
                lines.append(f"{'  ' * depth}- {self.node_id(d)} {fm.get('title', d.name)} — {self.task_status(d)}{extra}{res}")
                kids = numbered(d / "task")
                if kids and self._has_active(d):
                    walk(d / "task", depth + 1)
                elif kids:
                    lines.append(f"{'  ' * (depth + 1)}- （{len(kids)} 个子任务，已折叠）")

        walk(self.task_dir, 0)
        return "\n".join(lines) if lines else "（暂无任务）"

    def render_skills(self) -> str:
        rows = []
        for p in sorted(self.skills_dir.glob("*/SKILL.md")) if self.skills_dir.is_dir() else []:
            fm = read_fm(p.read_text())[0]
            rows.append(f"| {fm.get('name', p.parent.name)} | {fm.get('description', '')} | `{self.rel(p)}` |")
        if not rows:
            return "（暂无。工作区专属 skill 放 `.agents/skills/<名>/SKILL.md`，用时按本表路径读取）"
        return "| 名称 | 何时用 | 文件 |\n|---|---|---|\n" + "\n".join(rows)

    def render_protocol(self) -> str:
        return render("protocol.md", ws=WS_SCRIPT, spec=SPEC_DOC).strip()

    def render_blocks(self) -> dict:
        return {"memory": self.render_memory_block(), "tree": self.render_tree(),
                "protocol": self.render_protocol(), "skills": self.render_skills()}

    def index(self) -> list[str]:
        """Regenerate memory/INDEX.md and the generated blocks of AGENTS.md; returns changed files."""
        changed = []
        with self.lock():
            if self.memory_dir.is_dir():
                p = self.memory_dir / "INDEX.md"
                new = self.render_memory_index()
                if not p.is_file() or p.read_text() != new:
                    p.write_text(new)
                    changed.append(self.rel(p))
            if self.agents_md.is_file():
                old = self.agents_md.read_text()
                new = replace_blocks(old, self.render_blocks())
                if new != old:
                    self.agents_md.write_text(new)
                    changed.append("AGENTS.md")
        return changed

    # --- check ---
    def check(self) -> list[Issue]:
        out: list[Issue] = []
        add = lambda lvl, code, msg: out.append(Issue(lvl, code, msg))
        try:
            cfg = self.config()
            if cfg.get("version") != 4:
                add("error", "ws-json", ".agents/ws.json 的 version 不是 4")
        except Exception as e:  # noqa: BLE001
            add("error", "ws-json", f".agents/ws.json 读不出来：{e}")
            cfg = {}
        for d in (self.task_dir, self.memory_dir):
            if not d.is_dir():
                add("error", "structure", f"缺少 {self.rel(d)}/")
        if (self.root / ".agent").is_dir():
            add("warn", "legacy", "同时存在 v3 的 .agent/：不要混用，迁移需用户要求")
        if cfg.get("profile", "task") == "task":
            for p in self.root.iterdir():
                if p.name not in ROOT_ALLOWED:
                    add("warn", "root-file", f"根目录只放 AGENTS.md 和 .agents/：{p.name} 应移进对应任务节点或 memory")
        # numbering
        for base in [self.task_dir] + [d / sub for d in self.tasks() for sub in ("task", "subagent")]:
            if not base.is_dir():
                continue
            seen = {}
            for p in base.iterdir():
                if p.name.startswith("."):
                    continue
                m = NUM_RE.match(p.name)
                if not (p.is_dir() and m):
                    add("error", "number", f"{self.rel(p)} 不符合 NN-<名>：任务和派发只能由 ws 创建")
                    continue
                if m.group(1) in seen:
                    add("error", "number", f"{self.rel(base)} 下编号 {m.group(1)} 重复")
                seen[m.group(1)] = p
        # nodes and dispatches
        for d in self.tasks():
            nid = self.node_id(d)
            missing = [f for f in NODE_FILES if not (d / f).is_file()]
            if missing:
                add("error", "node-file", f"{nid} 缺少 {', '.join(missing)}")
            st = self.task_status(d)
            if st not in TASK_STATUSES and "progress.md" not in missing:
                add("error", "task-status", f"{nid} 的 progress.md status 是 {st}")
            if st == "done":
                prob = result_problem(d / "result.md")
                if prob:
                    add("error", "result-status", f"{nid} 已 done 但 {prob}")
            elif (d / "result.md").is_file():
                prob = result_problem(d / "result.md")
                if prob:
                    add("error", "result-status", f"{nid}：{prob}")
            if st == "active":
                for f in ("goal.md", "plan.md"):
                    if (d / f).is_file() and not meaningful((d / f).read_text()):
                        add("warn", "skeleton", f"{nid} 已 active 但 {f} 还是空骨架")
            for _, s in numbered(d / "subagent"):
                sid = self.node_id(s)
                if not (s / "task.md").is_file():
                    add("error", "dispatch", f"{sid} 缺少 task.md")
                if (s / "result.md").is_file():
                    prob = result_problem(s / "result.md", allow_unverified=True)
                    if prob:
                        add("error", "result-status", f"{sid}：{prob}")
                    elif read_fm((s / "result.md").read_text())[0].get("status") == UNVERIFIED:
                        add("warn", "unverified", f"{sid} 的 result.md 是 hook 代存的 UNVERIFIED：核对后改成正式状态")
                else:
                    add("error" if st == "done" else "info", "dispatch-open", f"{sid} 还没有 result.md")
        # memory
        for rel, fm in self.memory_notes():
            if not fm.get("summary") or not fm.get("type"):
                add("warn", "memory-fm", f"memory/{rel} 缺少 summary 或 type")
            elif fm.get("type") not in MEMORY_TYPES:
                add("warn", "memory-fm", f"memory/{rel} 的 type 应为 {' | '.join(MEMORY_TYPES)}")
            src = str(fm.get("source", ""))
            if fm.get("status") == "draft" and src:
                try:
                    owner = self.resolve(src.split("/")[0])
                    if self.task_status(owner) in ("done", "dropped"):
                        add("warn", "memory-draft", f"memory/{rel} 的来源 {src} 已收尾，草稿还没转正")
                except WsError:
                    pass
        # AGENTS.md and generated content
        if self.agents_md.is_file():
            text = self.agents_md.read_text()
            n = text.count("\n") + 1
            if cfg.get("profile", "task") == "task" and n > AGENTS_MAX_LINES:
                add("warn", "agents-length", f"AGENTS.md 有 {n} 行，超过 {AGENTS_MAX_LINES}：细节移进 .agents/memory/ 并留一行指针")
            try:
                if replace_blocks(text, self.render_blocks()) != text:
                    add("info", "stale", "AGENTS.md 的生成区块过期：ws index")
            except WsError as e:
                add("error", "markers", str(e))
        else:
            add("error", "structure", "缺少 AGENTS.md")
        idx = self.memory_dir / "INDEX.md"
        if self.memory_dir.is_dir() and (not idx.is_file() or idx.read_text() != self.render_memory_index()):
            add("info", "stale", "memory/INDEX.md 过期：ws index")
        # dead links
        files = [self.agents_md] + [d / "task.md" for d in self.tasks()] + \
                [self.memory_dir / r for r, _ in self.memory_notes()]
        for f in files:
            if not f.is_file():
                continue
            for target in LINK_RE.findall(f.read_text()):
                if re.match(r"^[a-z]+:", target):
                    continue
                t = Path(target).expanduser()
                if not (t if t.is_absolute() else f.parent / t).exists() and not (self.root / target).exists():
                    add("warn", "dead-link", f"{self.rel(f)} 链接到不存在的 {target}")
        for e in self.unfiled():
            add("warn", "inbox", f"inbox {e['id']} 未归档：{e['text'][:40]}…")
        return out

    def status_text(self) -> str:
        cfg = self.config()
        lines = [f"工作区 {self.root}（v4 · {cfg.get('profile', 'task')}）"]
        active = [d for d in self.tasks() if self.task_status(d) == "active"]
        if active:
            lines.append("进行中的节点：")
            for d in active[:5]:
                fm = read_fm((d / "task.md").read_text())[0]
                goal = section((d / "goal.md").read_text(), "目标").splitlines()
                lines.append(f"- {self.node_id(d)} {fm.get('title', d.name)}：{goal[0][:80] if goal else '（goal 未写）'}")
                logs = [l for l in (d / "progress.md").read_text().splitlines() if l.startswith("- ")]
                lines += [f"    {l[2:][:120]}" for l in logs[-5:]]
        else:
            lines.append("没有 active 节点。新需求：ws req --new <slug> --entry <id>，或 ws task new <slug>。")
        unf = self.unfiled()
        if unf:
            lines.append(f"inbox 未归档 {len(unf)} 条：" + "、".join(e["id"] for e in unf[:5]) + "（ws inbox 查看）")
        issues = self.check()
        errs = [i for i in issues if i.level == "error"]
        warns = [i for i in issues if i.level == "warn"]
        lines.append(f"ws check：{len(errs)} error / {len(warns)} warn")
        lines += [f"  {i}" for i in (errs + warns)[:5]]
        skips = self.skip_count(days=7)
        if skips:
            lines.append(f"近 7 天有 {skips} 次派发用 [ws:skip] 绕过了规范")
        text = "\n".join(lines)
        return text if len(text) <= 3000 else text[:2990] + "\n…"

    def skip_count(self, days=7) -> int:
        p = self.state_dir / "skips.log"
        if not p.is_file():
            return 0
        cutoff = (_dt.datetime.now() - _dt.timedelta(days=days)).strftime("%Y-%m-%d %H:%M")
        return sum(1 for l in p.read_text().splitlines() if l[:16] >= cutoff)

    def log_skip(self, session_id, desc):
        self.state_dir.mkdir(parents=True, exist_ok=True)
        with open(self.state_dir / "skips.log", "a") as f:
            f.write(f"{now()}\t{(session_id or '-')[:8]}\t{' '.join((desc or '').split())[:120]}\n")


def replace_blocks(text: str, blocks: dict) -> str:
    for name, content in blocks.items():
        start, end = f"<!-- ws:{name} -->", f"<!-- /ws:{name} -->"
        ns, ne = text.count(start), text.count(end)
        if ns == 0 and ne == 0:
            continue
        if ns != 1 or ne != 1 or text.index(start) > text.index(end):
            raise WsError(f"AGENTS.md 里的 {start} / {end} 不成对或重复：手动修好标记再运行 ws index")
        a = text.index(start) + len(start)
        b = text.index(end)
        text = text[:a] + "\n" + content.strip() + "\n" + text[b:]
    return text


def init(target, profile="task", title=None, yes=False) -> list[str]:
    root = Path(target).expanduser().resolve()
    if profile not in ("task", "repo"):
        raise WsError("profile 只能是 task 或 repo")
    if (root / ".agent").is_dir():
        raise WsError(f"{root} 已有 v3 的 .agent/：v3 工作区原样保留，迁移要用户明确要求")
    root.mkdir(parents=True, exist_ok=True)
    msgs = []
    agents_md = root / "AGENTS.md"
    has_marker = agents_md.is_file() and "<!-- ws:tree -->" in agents_md.read_text()
    if agents_md.is_file() and not has_marker:
        if profile == "task":
            raise WsError("目录里已有 AGENTS.md：代码仓库请用 --profile repo（只写一个区块）")
        if not yes:
            raise WsError("将在现有 AGENTS.md 末尾追加 <!-- ws:begin -->…<!-- ws:end --> 区块。"
                          "这个文件由人维护，先征得用户同意，再加 --yes 重跑")
    ws = Workspace(root)
    for d in (ws.memory_dir, ws.task_dir, ws.skills_dir, ws.state_dir):
        d.mkdir(parents=True, exist_ok=True)
    cfg = ws.agents / "ws.json"
    if not cfg.is_file():
        cfg.write_text(json.dumps({"version": 4, "profile": profile, "created": today(),
                                   "title": title or root.name}, ensure_ascii=False, indent=1) + "\n")
        msgs.append("写入 .agents/ws.json")
    gi = ws.agents / ".gitignore"
    if not gi.is_file():
        gi.write_text("inbox/\n.state/\n")
    if not has_marker:
        if profile == "task":
            agents_md.write_text(render("AGENTS.task.md", title=title or root.name, date=today()))
            msgs.append("新建 AGENTS.md")
        else:
            old = agents_md.read_text() if agents_md.is_file() else f"# {title or root.name}\n"
            agents_md.write_text(old.rstrip("\n") + "\n\n" + render("AGENTS.repo-block.md"))
            msgs.append("在 AGENTS.md 末尾追加 ws 区块")
    claude_md = root / "CLAUDE.md"
    if claude_md.is_file() and "@AGENTS.md" not in claude_md.read_text():
        msgs.append("注意：已有 CLAUDE.md 且没有引用 @AGENTS.md，Claude Code 只读 CLAUDE.md，读不到工作区规则；"
                    "请用户决定是否在 CLAUDE.md 里加一行 @AGENTS.md")
    changed = ws.index()
    msgs += [f"生成 {c}" for c in changed]
    return msgs


# ---------- command line ----------

def _read_body(args) -> str:
    if getattr(args, "stdin", False):
        return sys.stdin.read()
    if getattr(args, "file", None):
        return Path(args.file).read_text()
    return ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="ws", description="工作区 v4 命令行（规范：%s）" % SPEC_DOC)
    ap.add_argument("--root", help="工作区根目录（缺省从当前目录向上找）")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("init", help="新建工作区")
    p.add_argument("dir", nargs="?", default=".")
    p.add_argument("--profile", choices=("task", "repo"), default="task")
    p.add_argument("--title")
    p.add_argument("--yes", action="store_true", help="repo 类型：用户已同意在 AGENTS.md 追加区块")

    pt = sub.add_parser("task", help="任务节点")
    tsub = pt.add_subparsers(dest="tcmd", required=True)
    p = tsub.add_parser("new", help="新建任务节点")
    p.add_argument("slug")
    p.add_argument("--parent")
    p.add_argument("--title")
    p.add_argument("--stdin", action="store_true", help="task.md 正文从 stdin 读")
    p.add_argument("--file")
    p.add_argument("--entry", help="用 inbox 条目作为 task.md 正文")
    p = tsub.add_parser("status", help="设置节点状态")
    p.add_argument("id")
    p.add_argument("status", choices=TASK_STATUSES)
    p.add_argument("--force", metavar="REASON", help="跳过检查（原因记进 progress）")

    p = sub.add_parser("dispatch", help="新建派发目录和 task.md")
    p.add_argument("id")
    p.add_argument("slug")
    p.add_argument("--title")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--file")

    p = sub.add_parser("req", help="把用户原文归档进 task.md")
    p.add_argument("id", nargs="?")
    p.add_argument("--entry")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--new", metavar="SLUG", help="开新任务，原文作为 task.md")
    p.add_argument("--parent")
    p.add_argument("--title")
    p.add_argument("--not-req", nargs="+", metavar="ENTRY", help="标记为不是需求")
    p.add_argument("--allow-secret", action="store_true")

    sub.add_parser("inbox", help="列出未归档的用户原文")
    p = sub.add_parser("log", help="在 progress.md 追加一行")
    p.add_argument("id")
    p.add_argument("text")
    p.add_argument("--tag", default="note", choices=LOG_TAGS)
    sub.add_parser("index", help="重新生成 memory/INDEX.md 和 AGENTS.md 的生成区块")
    p = sub.add_parser("check", help="检查工作区")
    p.add_argument("--json", action="store_true")
    p = sub.add_parser("status", help="现状摘要")
    p.add_argument("--json", action="store_true")

    args = ap.parse_args(argv)
    try:
        if args.cmd == "init":
            for m in init(args.dir, args.profile, args.title, args.yes):
                print(m)
            print("下一步：把用户的需求原文建成任务，ws req --new <slug> --entry <id> 或 ws task new <slug> --stdin")
            return 0
        ws = Workspace(args.root) if args.root else Workspace.locate()
        if args.cmd == "task" and args.tcmd == "new":
            body = ws.entry(args.entry)["text"] if args.entry else _read_body(args)
            d, nid = ws.new_task(args.slug, title=args.title, parent=args.parent, body=body)
            if args.entry:
                ws._mark(args.entry, "filed", nid)
            ws.index()
            print(f"{nid}  {ws.rel(d)}")
            print(f"下一步：写好 goal.md 和 plan.md，然后 ws task status {nid} active")
        elif args.cmd == "task" and args.tcmd == "status":
            ws.set_status(args.id, args.status, force=args.force)
            ws.index()
            print(f"{args.id} -> {args.status}")
        elif args.cmd == "dispatch":
            d, did = ws.dispatch(args.id, args.slug, title=args.title, body=_read_body(args))
            ws.index()
            print(f"{did}  {d / 'task.md'}")
            if brief_missing(d / "task.md"):
                print(f"先补全 task.md 的「{'」「'.join(brief_missing(d / 'task.md'))}」，否则派发会被拦截。")
            print("派发 prompt（原样使用）：")
            print(dispatch_prompt(d))
        elif args.cmd == "req":
            if args.not_req:
                ws.not_req(args.not_req)
                print("已标记为非需求：" + " ".join(args.not_req))
            else:
                d, nid = ws.file_req(args.id, entry=args.entry, text=_read_body(args) if args.stdin else None,
                                     new_slug=args.new, title=args.title, parent=args.parent,
                                     allow_secret=args.allow_secret)
                ws.index()
                print(f"已归档进 {nid}  {ws.rel(d / 'task.md')}")
        elif args.cmd == "inbox":
            unf = ws.unfiled()
            if not unf:
                print("inbox 没有未归档的条目")
            for e in unf:
                print(f"{e['id']}  {e['time']}  {e['text'][:100]}")
        elif args.cmd == "log":
            ws.log(args.id, args.text, tag=args.tag)
        elif args.cmd == "index":
            changed = ws.index()
            print("已更新：" + "、".join(changed) if changed else "已是最新")
        elif args.cmd == "check":
            issues = ws.check()
            if args.json:
                print(json.dumps([i.__dict__ for i in issues], ensure_ascii=False, indent=1))
            else:
                for i in issues:
                    print(i)
                errs = sum(1 for i in issues if i.level == "error")
                print(f"{errs} error / {sum(1 for i in issues if i.level == 'warn')} warn")
            return 1 if any(i.level == "error" for i in issues) else 0
        elif args.cmd == "status":
            print(json.dumps({"text": ws.status_text()}, ensure_ascii=False) if args.json else ws.status_text())
        return 0
    except WsError as e:
        print(f"ws: {e}", file=sys.stderr)
        return 1
