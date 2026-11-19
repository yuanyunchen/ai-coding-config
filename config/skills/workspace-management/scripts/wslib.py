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
import shutil
import subprocess
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
ANSWER_MAX_CHARS = 6000  # one recorded answer; longer ones are cut with a note (spec §5)
RESULT_MAX_BYTES = 6000  # result.md core; more goes to attachments (subagent-protocol)
NOTE_MAX_BYTES = 8000  # a memory file; above this it becomes a directory with README.md
README_MAX_BYTES = 3000
MAX_FLAT_WAVES = 3  # dispatch waves a node may run before its work must be split into subtasks
WAVE_GAP_MIN = 10  # a dispatch this long after its wave's first dispatch starts a new wave
DISPATCH_MAX_BYTES = 20_000_000  # big data belongs in the project's data dir, not a dispatch dir
HISTORY_MIN_RESULTS = 10  # dispatch results after which an empty memory / short AGENTS.md is a smell
CLOSE_IDLE_HOURS = 2
GITIGNORE = "conversation.md\ninbox.md\nsecrets.env\n"
AGENTS_MAX_LINES = 200
AGENTS_MIN_LINES = 100
SPEC_HEADS = ("目标", "背景", "要求", "约束", "验收标准", "输入", "未定事项")
SPEC_REQUIRED = ("目标", "验收标准")
RAW_HEAD_RE = re.compile(r"^### (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) · ", re.M)  # an entry in task.md「原文记录」
LOG_TIME_RE = re.compile(r"^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \[(\w+)\]", re.M)
ROOT_ALLOWED = {"AGENTS.md", ".agents", ".claude", ".claude.archived", ".git", ".gitignore", ".DS_Store", "README.md"}
PLAN_HEADING_RE = re.compile(r"^#{1,6}\s.*(改进|建议|计划|TODO|切入点|下一步)", re.M)

NUM_RE = re.compile(r"^(\d{2,})-([\w-]+)$")
SLUG_RE = re.compile(r"^[\w][\w-]*$")
ID_RE = re.compile(r"^T(\d+(?:\.\d+)*)(?:/S(\d+))?$")
# Only the part from `.agents/` on is matched, so spaces earlier in an absolute path do not matter.
DISPATCH_REF_RE = re.compile(r"\.agents/task/(?:[^\s/\"'`<>()]+/)+?subagent/\d{2,}-[^\s/\"'`<>()]+/task\.md")
RESULT_REF_RE = re.compile(r"\.agents/task/(?:[^\s/\"'`<>()]+/)+?subagent/\d{2,}-[^\s/\"'`<>()]+/result\.md")
# progress.md dispatch lines; follow-ups, external runs and hook notes do not open a wave
LOG_DISPATCH_RE = re.compile(r"^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \[dispatch\] (T[\d.]+/S\d+) (.*)$", re.M)
NON_WAVE_PREFIXES = ("续派：", "（外部）", "没有自己写 result.md")
DUP_MIN_CHARS = 120  # a paragraph this long repeated across dispatch briefs belongs in memory or brief.md
OLD_INBOX_HEAD_RE = re.compile(r"^## (p[0-9a-f]{8}) · ([0-9: -]+) · session (\S*)$", re.M)  # v4.0, for migrate
# conversation.md: structural lines start at column 0, every content line is indented by INDENT,
# so headings or rules inside a reply can never be mistaken for structure (and stay visually nested).
INDENT = "  "
RULE_WIDTH = 64
MARK_WORDS = {"filed": "归档", "not-req": "非需求", "skip": "绕过派发"}
MARK_KINDS = {v: k for k, v in MARK_WORDS.items()}
CONV_RE = re.compile(
    r"^(?:🙋 Q (?P<q>p[0-9a-f]{8}) · (?P<time>[0-9: -]+) · s:(?P<sess>\S*)"
    r"|[─┈]{4} 🤖 A(?P<cont>（续）)? → (?P<a>p[0-9a-f]{8}(?:, p[0-9a-f]{8})*) · [0-9:]+ [─┈]+"
    r"|▸ (?P<kind>归档|非需求|绕过派发) (?P<key>\S+)(?: (?P<rest>.*?))?)$", re.M)
CONV_DECOR_RE = re.compile(r"^═+$", re.M)
CONV41_RE = re.compile(  # v4.1 format, for migrate
    r"^(?:## Q (?P<q>p[0-9a-f]{8}) · (?P<time>[0-9: -]+) · s:(?P<sess>\S*)"
    r"|### A(?P<cont>（续）)? → (?P<a>p[0-9a-f]{8}(?:, p[0-9a-f]{8})*) · (?P<atime>[0-9: -]+)"
    r"|<!-- ws:(?P<kind>filed|not-req|skip) (?P<key>\S+)(?: (?P<rest>.*?))? -->)$", re.M)
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


def indent(text: str) -> str:
    return "\n".join(INDENT + l if l.strip() else "" for l in text.strip("\n").splitlines())


def dedent(text: str) -> str:
    return "\n".join(l[len(INDENT):] if l.startswith(INDENT) else l for l in text.splitlines()).strip()


def fmt_q(eid, stamp, sess, text) -> str:
    rule = "═" * RULE_WIDTH
    return f"\n\n{rule}\n🙋 Q {eid} · {stamp} · s:{sess}\n{rule}\n\n{indent(text)}\n\n"


def fmt_a(ids, time, text, cont=False) -> str:
    ch = "┈" if cont else "─"
    head = f"{ch * 4} 🤖 A{'（续）' if cont else ''} → {', '.join(ids)} · {time} "
    return f"{head}{ch * max(4, RULE_WIDTH - len(head))}\n\n{indent(text)}\n\n"


def fmt_mark(kind, key, rest="") -> str:
    return f"▸ {MARK_WORDS[kind]} {key}{' ' + rest if rest else ''}\n\n"


def fmt_inbox(eid, stamp, sess, text) -> str:
    """inbox.md holds only user messages, so plain `##` headings stay unambiguous (the v4.0 inbox layout)."""
    return f"## {eid} · {stamp} · session {sess}\n\n{text.strip()}\n\n"


def task_spec(text: str) -> str | None:
    """The「任务说明」part of a node task.md, or None for the pre-v4.2 layout."""
    m = re.search(r"^## 任务说明\s*$(.*?)(?=^## 原文记录\s*$|\Z)", text, re.M | re.S)
    return m.group(1) if m else None


def spec_missing(text: str) -> list[str]:
    spec = task_spec(text)
    if spec is None:
        return ["任务说明"]
    out = []
    for h in SPEC_REQUIRED:
        m = re.search(rf"^###\s+{h}\s*$(.*?)(?=^###?\s|\Z)", spec, re.M | re.S)
        if not m or not meaningful(m.group(1)):
            out.append(h)
    return out


def spec_stale(text: str) -> str | None:
    """Time of the newest raw entry when it is newer than the spec's `updated`."""
    times = RAW_HEAD_RE.findall(text.split("## 原文记录", 1)[1]) if "## 原文记录" in text else []
    updated = str(read_fm(text)[0].get("updated", ""))
    return max(times) if times and max(times) > updated else None


def normalize_spec(body: str) -> str:
    """stdin for the spec may use ## or ### headings; store them as ###."""
    return re.sub(r"^#{2,3}\s+", "### ", body.strip(), flags=re.M) + "\n"


def concern_items(result_text: str) -> list[str]:
    """Top-level items under a result.md「需要上层处理」; 「无」 means none."""
    body = section(result_text, "需要上层处理")
    # "无" / "暂无" / "无需上层处理" / "无。备注…" / "none" all mean nothing to handle
    none = re.compile(r"^(?:[-*+]\s+|\d+[.、)]\s*)?[（(]?(?:暂无|无需|无|没有|none\b|n/?a\b)", re.I)
    if not body:
        return []
    items = [l for l in body.splitlines() if re.match(r"^(?:[-*+]\s+|\d+[.、)]\s*)\S", l)]
    real = [l for l in items if not none.match(l)]
    if real or (not items and not none.match(body)):
        return real or [body]
    return []


def open_requirements(task_text: str) -> int:
    m = re.search(r"^###\s+要求\s*$(.*?)(?=^###?\s|\Z)", task_spec(task_text) or "", re.M | re.S)
    return len(re.findall(r"^\s*- \[ \]", m.group(1), re.M)) if m else 0


def _norm(text: str) -> str:
    return " ".join(text.split())


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


def find_result_ref(text: str, root: Path) -> Path | None:
    """The dispatch directory whose result.md a message (e.g. a subagent's final line) points at."""
    for m in RESULT_REF_RE.finditer(text or ""):
        p = root / m.group(0)
        if p.parent.is_dir():
            return p.parent
    return None


def followup_prompt(dispatch_dir: Path, moved: str | None) -> str:
    # nothing to rename yet means the agent is still on its first round: it must keep that round itself
    prev = (f"上一轮结果已存为 {moved}，" if moved else
            "如果你在读到这条追加之前已经写出 result.md，先把它改名为 result-rN.md（N 取下一个编号）保留，")
    return (f"先读 {dispatch_dir / 'task.md'} 末尾「追加」里的新要求并照做；{prev}本轮结果写进新的 "
            f"{dispatch_dir / 'result.md'}，最后一行回 `<STATUS> {dispatch_dir / 'result.md'}`。")


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
        self.conv = self.agents / "conversation.md"
        self.inbox = self.agents / "inbox.md"
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

    def hooks_off(self) -> bool:
        try:
            return self.config().get("hooks") == "off"
        except (OSError, ValueError):
            return False

    @contextmanager
    def lock(self):
        with open(self.agents / "ws.json", "a+") as f:
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
    def new_task(self, slug, title=None, parent=None, body="", source=None, entry=None):
        """body with spec headings (### 目标 …) becomes the「任务说明」; any other body is the first raw entry."""
        check_slug(slug)
        with self.lock():
            parent_dir = self.task_dir if parent is None else self.resolve_task(parent) / "task"
            d = self._alloc(parent_dir, slug)
        nid = self.node_id(d)
        source = source or ("user" if parent is None else self.node_id(parent_dir.parent))
        body = body.strip()
        is_spec = bool(re.search(rf"^#{{2,3}}\s+({'|'.join(SPEC_HEADS)})\s*$", body, re.M))
        label = f"用户原文{' · ' + entry if entry else ''}" if source == "user" else f"上层说明 · {source}"
        ctx = dict(id=nid, title=title or slug, date=today(), now=now(), source=source,
                   spec=normalize_spec(body) if is_spec else render("node/task-spec.md"),
                   raw=f"### {now()} · {label}\n\n{body}\n" if body and not is_spec else "<!-- ws req 追加在这里 -->\n")
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
            miss = spec_missing((d / "task.md").read_text())
            if miss:
                problems.append(f"task.md「任务说明」缺 {'、'.join(miss)}：上层先写好（ws task spec {nid} --stdin）")
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

    def set_spec(self, ident, body):
        """Replace the「任务说明」of a node task.md with the latest full version."""
        if not body.strip():
            raise WsError("任务说明为空：从 stdin 传入 ### 目标 / 背景 / 要求 / 约束 / 验收标准 / 输入 / 未定事项")
        d = self.resolve_task(ident)
        p = d / "task.md"
        with self.lock():
            text = p.read_text()
            if task_spec(text) is None:
                raise WsError(f"{self.rel(p)} 是旧格式（没有「任务说明」）：先运行 ws migrate")
            text = re.sub(r"(^## 任务说明\s*\n).*?(?=^## 原文记录\s*$|\Z)",
                          lambda m: m.group(1) + "\n" + normalize_spec(body) + "\n", text, count=1, flags=re.M | re.S)
            p.write_text(set_fm(text, updated=now()))
        self.log(self.node_id(d), "任务说明已更新", tag="req")
        return d

    def log_times(self, d: Path, tag=None) -> list[str]:
        p = d / "progress.md"
        text = p.read_text() if p.is_file() else ""
        return [t for t, g in LOG_TIME_RE.findall(text) if tag is None or g == tag]

    def waves(self, d: Path) -> list[list[tuple[_dt.datetime, str]]]:
        """New dispatches grouped into bursts: one more than WAVE_GAP_MIN after the wave's first dispatch starts a new
        wave (anchored, so a steady trickle of dispatches cannot chain into one endless wave)."""
        p = d / "progress.md"
        entries = sorted((_dt.datetime.strptime(t, "%Y-%m-%d %H:%M"), did)
                         for t, did, rest in LOG_DISPATCH_RE.findall(p.read_text() if p.is_file() else "")
                         if not rest.startswith(NON_WAVE_PREFIXES))
        out = []
        for t, did in entries:
            if not out or t - out[-1][0][0] > _dt.timedelta(minutes=WAVE_GAP_MIN):
                out.append([])
            out[-1].append((t, did))
        return out

    def dispatch_waves(self, d: Path) -> int:
        return len(self.waves(d))

    def opens_new_wave(self, d: Path) -> bool:
        w = self.waves(d)
        return not w or _dt.datetime.now() - w[-1][0][0] > _dt.timedelta(minutes=WAVE_GAP_MIN)

    def decided(self, node: Path, sid: str) -> bool:
        """Whether progress.md has a [decision] line naming this dispatch (its full id, or a bare Snn not preceded by
        another node's path) written no earlier than the minute its current result.md was written."""
        short = sid.split("/")[-1]
        pat = re.compile(rf"(?<![\w.]){re.escape(sid)}(?!\d)|(?<![A-Za-z0-9/.]){short}(?!\d)")
        res = self.resolve(sid) / "result.md"
        since = _dt.datetime.fromtimestamp(res.stat().st_mtime).strftime("%Y-%m-%d %H:%M") if res.is_file() else ""
        p = node / "progress.md"
        for t, tag, rest in re.findall(r"^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \[(\w+)\] (.*)$",
                                       p.read_text() if p.is_file() else "", re.M):
            if tag == "decision" and t >= since and pat.search(rest):
                return True
        return False

    def return_note(self, ref: Path) -> str:
        """One line for the main agent at the moment a dispatch reports back."""
        node, sid = ref.parent.parent, self.node_id(ref)
        nid, short = self.node_id(node), sid.split("/")[-1]
        res = ref / "result.md"
        parts = []
        if res.is_file():
            text = res.read_text()
            parts.append(f"（ws）{sid} 回来了：{read_fm(text)[0].get('status', '?')}，结果以 {self.rel(res)} 为准")
            items = concern_items(text)
            if items:
                parts.append(f"「需要上层处理」{len(items)} 条：逐条定修 / 豁免（写理由）/ 报用户，各记一行 "
                             f"ws log {nid} --tag decision \"{short} …\"；推迟到汇总时再看不算处理")
        else:
            parts.append(f"（ws）{sid} 回来了，但还没有 result.md")
        mine = [w for w in self.waves(node) if any(did == sid for _, did in w)]
        if mine:  # the wave this dispatch belongs to; a follow-up or external run falls back to the whole node
            ids, scope = [did for _, did in mine[0]], "本波"
        else:
            ids, scope = [self.node_id(o) for _, o in numbered(node / "subagent")], "本节点"
        dirs = dict(numbered(node / "subagent"))  # ids whose directory is gone are ignored, not counted as out
        pending = [did for did in ids
                   if (o := dirs.get(int(did.split("/S")[-1]))) is not None and not (o / "result.md").is_file()]
        parts.append(f"{scope}还有 {len(pending)} 路没回（{'、'.join(p.split('/')[-1] for p in pending[:6])}）"
                     if pending else f"{scope}已全部回齐")
        p = node / "progress.md"
        act = re.findall(r"^- (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) \[status\] active", p.read_text() if p.is_file() else "", re.M)
        if act:
            mins = int((_dt.datetime.now() - _dt.datetime.strptime(act[0], "%Y-%m-%d %H:%M")).total_seconds() // 60)
            parts.append(f"{nid} 已进行 {mins // 60}h{mins % 60:02d}m")
        reqs = open_requirements((node / "task.md").read_text()) if (node / "task.md").is_file() else 0
        if reqs:
            parts.append(f"任务说明里还有 {reqs} 条要求未完成")
        return "；".join(parts) + "。"

    def followup(self, ident, body):
        """New requirements for a dispatch whose agent is continued: append to its task.md, keep the old result."""
        s = self.resolve(ident)
        if s.parent.name != "subagent":
            raise WsError(f"{ident} 不是派发：用 T01/S03 这样的派发 ID")
        if not body.strip():
            raise WsError("续派要求为空：从 stdin 传入新要求（范围或可写范围有变化也写明）")
        sid, moved = self.node_id(s), None
        with self.lock():
            with open(s / "task.md", "a") as f:
                f.write(f"\n## 追加 {now()} · 上层续派\n\n{body.strip()}\n")
            if (s / "result.md").is_file():
                n = 1 + max((int(m.group(1)) for p in s.glob("result-r*.md")
                             if (m := re.match(r"result-r(\d+)\.md$", p.name))), default=0)
                moved = f"result-r{n}.md"
                (s / "result.md").rename(s / moved)
        self.log(self.node_id(s.parent.parent), f"{sid} 续派：{_norm(body)[:60]}", tag="dispatch")
        return s, moved

    def repeated_paragraphs(self, d: Path, body: str) -> list[tuple[str, list[str]]]:
        """Long paragraphs of a new dispatch brief that already appear in earlier briefs (path lists excluded)."""
        paras = []
        for p in re.split(r"\n\s*\n", body):
            lines = [l for l in p.strip().splitlines() if not l.lstrip().startswith("#")]
            if all(l.lstrip().startswith(("- ", "* ")) and "/" in l for l in lines):
                continue
            if len(_norm("\n".join(lines))) >= DUP_MIN_CHARS:
                paras.append(_norm("\n".join(lines)))
        if not paras:
            return []
        others = [(self.node_id(o), _norm((o / "task.md").read_text()))
                  for n in self.tasks() for _, o in numbered(n / "subagent")
                  if o != d and (o / "task.md").is_file()]
        hits = [(p, [sid for sid, text in others if p in text]) for p in paras]
        return [(p[:40], ids) for p, ids in hits if ids]

    # --- dispatch ---
    def dispatch(self, ident, slug, title=None, body="", force=None, external=False):
        """external: run by codex exec / claude -p instead of the Agent tool; like follow-ups it opens no wave."""
        check_slug(slug)
        node = self.resolve_task(ident)
        nid = self.node_id(node)
        over = (not external and not numbered(node / "task") and self.opens_new_wave(node)
                and self.dispatch_waves(node) >= MAX_FLAT_WAVES)
        if over and not force:
            raise WsError(f"{nid} 已经派发了 {self.dispatch_waves(node)} 波，又没有子任务：把下一波建成子任务"
                          f"（ws task new <波次名> --parent {nid}）再在子任务下派发；确需在本节点继续，加 --force \"<原因>\"")
        if over:
            self.log(nid, f"派发波次超限仍在本节点派发：{force}", tag="decision")
        with self.lock():
            d = self._alloc(node / "subagent", slug)
        did = self.node_id(d)
        brief = render(
            "dispatch-task.md", id=did, parent=self.node_id(node), title=title or slug, date=today(),
            protocol=PROTOCOL_DOC, dir=d, result_template=TEMPLATES / "node" / "result.md",
            body="<!-- 要做什么、为什么；背景讲够，子智能体不继承你的上下文 -->")
        brief = fill_sections(brief, body) if body.strip() else brief
        if (node / "brief.md").is_file():
            brief = re.sub(r"(^##\s+必读\s*\n)", lambda m: f"{m.group(1)}- {node / 'brief.md'}（本任务各派发共用说明，先读）\n",
                           brief, count=1, flags=re.M)
        if external:
            brief = brief.replace("\n## 任务与背景", f"\n> 外部执行（codex exec / claude -p）：命令行里让执行器先读本文件，"
                                  f"结果写回 {d / 'result.md'}。\n\n## 任务与背景", 1)
        (d / "task.md").write_text(brief)
        self.log(nid, f"{did} {'（外部）' if external else ''}{title or slug}", tag="dispatch")
        return d, did

    # --- conversation (user Q + core A, append-only) ---
    def _append_conv(self, text: str, path: Path | None = None):
        fd = os.open(path or self.conv, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        try:
            os.write(fd, text.encode())
        finally:
            os.close(fd)

    def record_question(self, session_id, prompt_id, prompt) -> str:
        eid = "p" + (prompt_id or uuid.uuid4().hex).replace("-", "")[:8].lower()
        stamp = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._append_conv(fmt_q(eid, stamp, (session_id or "-")[:8], prompt))
        self._append_conv(fmt_inbox(eid, stamp, (session_id or "-")[:8], prompt), self.inbox)
        focus = self.config().get("focus")
        # secrets stay out of task.md (it may be committed); short prompts carry no requirement
        if focus and len(prompt.strip()) >= INBOX_MIN_CHARS and not SECRET_RE.search(prompt):
            try:
                d = self.resolve_task(focus)
            except WsError:
                return eid
            with self.lock(), open(d / "task.md", "a") as f:
                f.write(f"\n### {now()} · 用户原文 · {eid}\n\n{prompt.strip()}\n")
            self._mark(eid, "filed", self.node_id(d))
        return eid

    def set_focus(self, ident=None):
        """The node every later user message is appended to; None clears it."""
        cfg = self.config()
        if ident:
            cfg["focus"] = self.node_id(self.resolve_task(ident))
        else:
            cfg.pop("focus", None)
        with self.lock():
            (self.agents / "ws.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n")
        return cfg.get("focus")

    def record_answer(self, session_id, message) -> str | None:
        """Attach the turn's final reply to this session's unanswered questions, else continue the last one."""
        sess = (session_id or "-")[:8]
        mine = [q for q in self.questions() if q["session"] == sess]
        if not mine or not (message or "").strip():
            return None
        open_ids = list(dict.fromkeys(q["id"] for q in mine if not q["answered"]))
        text = message.strip()
        if len(text) > ANSWER_MAX_CHARS:
            text = text[:ANSWER_MAX_CHARS] + f"\n\n…（超过 {ANSWER_MAX_CHARS} 字，已截断）"
        block = fmt_a(open_ids or [mine[-1]["id"]], _dt.datetime.now().strftime("%H:%M:%S"), text, cont=not open_ids)
        self._append_conv(block)
        return block.splitlines()[0]

    def _conv_items(self):
        text = self.conv.read_text() if self.conv.is_file() else ""
        items = list(CONV_RE.finditer(text))
        for i, m in enumerate(items):
            end = items[i + 1].start() if i + 1 < len(items) else len(text)
            yield m, dedent(CONV_DECOR_RE.sub("", text[m.end():end]))

    def questions(self) -> list[dict]:
        qs, answered, marks = [], set(), {}
        for m, body in self._conv_items():
            if m.group("q"):
                qs.append({"id": m.group("q"), "time": m.group("time"), "session": m.group("sess"), "text": body})
            elif m.group("a"):
                answered.update(m.group("a").split(", "))
            elif MARK_KINDS.get(m.group("kind")) in ("filed", "not-req"):
                marks[m.group("key")] = MARK_KINDS[m.group("kind")]
        for q in qs:
            q["answered"] = q["id"] in answered
            q["mark"] = marks.get(q["id"])
        return qs

    def _mark(self, eid, kind, target=""):
        self._append_conv(fmt_mark(kind, eid, f"→ {target}" if kind == "filed" and target else target))

    def unfiled(self) -> list[dict]:
        return [q for q in self.questions() if not q["mark"] and len(q["text"]) >= INBOX_MIN_CHARS]

    def entry(self, eid) -> dict:
        for q in self.questions():
            if q["id"] == eid:
                return q
        raise WsError(f"conversation.md 里没有 {eid}；ws inbox 列出未归档的条目")

    def file_req(self, target=None, entry=None, text=None, new_slug=None, title=None, parent=None,
                 allow_secret=False):
        content = self.entry(entry)["text"] if entry else (text or "").strip()
        if not content:
            raise WsError("没有可归档的内容：用 --entry <id> 或 --stdin")
        if SECRET_RE.search(content) and not allow_secret:
            raise WsError("内容里疑似有密钥或口令；确认无误后加 --allow-secret（task.md 可能被提交进 git）")
        if new_slug:
            d, nid = self.new_task(new_slug, title=title, parent=parent, body=content, source="user", entry=entry)
        else:
            if not target:
                raise WsError("要指定节点 ID，或用 --new <slug> 开新任务")
            d = self.resolve_task(target)
            nid = self.node_id(d)
            with self.lock(), open(d / "task.md", "a") as f:
                f.write(f"\n### {now()} · 用户原文{' · ' + entry if entry else ''}\n\n{content}\n")
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
                 "## 顶层（目录先读它的 README.md，再按其中的表往下读）", ""]
        lines += self._top_level_lines(link_prefix="") or ["（暂无）"]
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
        lines = self._top_level_lines(link_prefix=".agents/memory/")
        head = "索引和按类型视图：[.agents/memory/INDEX.md](.agents/memory/INDEX.md)；目录先读它的 README.md"
        return head + ("\n\n" + "\n".join(lines) if lines else "\n\n（暂无）")

    def _top_level_lines(self, link_prefix: str) -> list[str]:
        lines = []
        for p in sorted(self.memory_dir.iterdir()) if self.memory_dir.is_dir() else []:
            if p.name.startswith(".") or p.name == "INDEX.md":
                continue
            if p.is_dir():
                readme = p / "README.md"
                summary = read_fm(readme.read_text())[0].get("summary", "") if readme.is_file() else "（缺 README.md）"
                lines.append(f"- [{p.name}/]({link_prefix}{p.name}/README.md) — {summary}（{sum(1 for _ in p.rglob('*.md'))} 篇）")
            elif p.suffix == ".md":
                fm = read_fm(p.read_text())[0]
                lines.append(f"- [{p.name}]({link_prefix}{p.name}) — {fm.get('summary', '（缺 summary）')} `{fm.get('type', '?')}`")
        return lines

    def memory_issues(self) -> list[Issue]:
        out = []
        if not self.memory_dir.is_dir():
            return out
        for d in sorted(p for p in self.memory_dir.rglob("*") if p.is_dir()):
            rel = d.relative_to(self.memory_dir).as_posix()
            readme = d / "README.md"
            if not readme.is_file():
                out.append(Issue("error", "memory-readme", f"memory/{rel}/ 缺 README.md：写要点和下层文件表"))
                continue
            text = readme.read_text()
            for c in sorted(d.iterdir()):
                if c.name not in ("README.md", ".DS_Store") and c.name not in text:
                    out.append(Issue("error", "memory-readme", f"memory/{rel}/README.md 的文件表漏了 {c.name}"))
            if len(text.encode()) > README_MAX_BYTES:
                out.append(Issue("warn", "memory-size", f"memory/{rel}/README.md 超过 {README_MAX_BYTES} 字节：细节移到下层文件"))
        for rel, fm in self.memory_notes():
            p = self.memory_dir / rel
            text = p.read_text()
            if p.name != "README.md" and len(text.encode()) > NOTE_MAX_BYTES:
                out.append(Issue("warn", "memory-size", f"memory/{rel} 超过 {NOTE_MAX_BYTES} 字节：拆成同名目录 + README.md"))
            if PLAN_HEADING_RE.search(read_fm(text)[1]):
                out.append(Issue("warn", "memory-plan", f"memory/{rel} 里有计划或建议类标题：这类内容放任务节点"))
            if self.note_stale(fm):
                out.append(Issue("warn", "memory-stale", f"memory/{rel} 依据 {fm['basis']}，之后 {', '.join(fm['covers'])} 有改动：核对后更新 basis"))
        return out

    def note_stale(self, fm) -> bool:
        basis, covers = fm.get("basis"), fm.get("covers")
        if not basis or not covers:
            return False
        covers = covers if isinstance(covers, list) else [covers]
        try:
            r = subprocess.run(["git", "-C", str(self.root), "diff", "--name-only", str(basis), "--", *covers],
                               capture_output=True, text=True, timeout=10)
        except (OSError, subprocess.SubprocessError):
            return False
        return r.returncode == 0 and bool(r.stdout.strip())

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
            if st in ("planned", "active", "blocked") and (d / "task.md").is_file():
                ttext = (d / "task.md").read_text()
                if task_spec(ttext) is None:
                    add("warn", "task-spec", f"{nid} 的 task.md 是旧格式，没有「任务说明」：ws migrate")
                elif st != "planned" and spec_missing(ttext):
                    add("warn", "task-spec", f"{nid} 的「任务说明」缺 {'、'.join(spec_missing(ttext))}：ws task spec {nid} --stdin")
                if task_spec(ttext) is not None and spec_stale(ttext):
                    add("warn", "task-spec-stale", f"{nid} 在 {spec_stale(ttext)} 追加了原文，「任务说明」还没合进去：ws task spec {nid} --stdin")
            subs = numbered(d / "subagent")
            waves = self.dispatch_waves(d)
            if waves > MAX_FLAT_WAVES and not numbered(d / "task"):
                add("warn", "split", f"{nid} 派发了 {waves} 波（{len(subs)} 次）却没有子任务：按波次拆成子任务")
            kids = list(self.tasks(d / "task"))
            if (st == "active" and subs and all((s / "result.md").is_file() for _, s in subs)
                    and all(self.task_status(c) in ("done", "dropped") for c in kids)):
                logs = self.log_times(d)
                idle = logs and _dt.datetime.now() - _dt.datetime.strptime(max(logs), "%Y-%m-%d %H:%M") \
                    > _dt.timedelta(hours=CLOSE_IDLE_HOURS)
                if idle:
                    add("warn", "close-ready", f"{nid} 的派发都已交结果、{CLOSE_IDLE_HOURS} 小时没有新进展：写 result.md 收尾，"
                        "把可复用的结论转进 memory")
            for _, s in subs:
                size = sum(f.stat().st_size for f in s.rglob("*") if f.is_file())
                if size > DISPATCH_MAX_BYTES:
                    add("warn", "dispatch-size", f"{self.node_id(s)} 目录有 {size // 1_000_000}MB：大数据放项目的数据目录，结果里只写路径")
            for _, s in subs:
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
            for _, s in subs:
                r = s / "result.md"
                if r.is_file() and concern_items(r.read_text()) and not self.decided(d, self.node_id(s)):
                    add("info", "concern-open", f"{self.node_id(s)} 的「需要上层处理」还没有处理记录："
                        f"ws log {nid} --tag decision \"{self.node_id(s).split('/')[-1]} 修 / 豁免 / 报用户 …\"")
            if st == "done" and (d / "task.md").is_file() and open_requirements((d / "task.md").read_text()):
                add("warn", "req-open", f"{nid} 已 done，任务说明里还有 {open_requirements((d / 'task.md').read_text())} "
                    "条要求是 [ ]：标成 [x] 完成，或 [-] 取消并写理由、告知用户")
            for r in [d / "result.md"] + [s / "result.md" for _, s in subs]:
                if r.is_file() and len(r.read_bytes()) > RESULT_MAX_BYTES:
                    add("warn", "result-size", f"{self.rel(r)} 超过 {RESULT_MAX_BYTES} 字节：复核才看的内容移到附件并在「附件」节列出")
        # memory
        out += self.memory_issues()
        n_results = sum(1 for d in self.tasks() for _, s in numbered(d / "subagent") if (s / "result.md").is_file())
        if n_results >= HISTORY_MIN_RESULTS and not any(True for _ in self.memory_notes()):
            add("warn", "memory-empty", f"已有 {n_results} 份派发结果，memory 还是空的：把可复用的事实、标准、方法、教训转进 memory，"
                "派发说明改成引用路径")
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
            if n < AGENTS_MIN_LINES and n_results >= HISTORY_MIN_RESULTS:
                add("warn", "agents-length", f"AGENTS.md 只有 {n} 行（应 {AGENTS_MIN_LINES}–{AGENTS_MAX_LINES}）：补上定位、现状、关键决策、"
                    "memory 指针，让新会话读完就能接手")
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
        focus = cfg.get("focus")
        lines.append(f"当前节点（用户消息自动记入其 task.md）：{focus}" if focus
                     else "没有设当前节点，用户消息只记入 conversation.md；设定：ws focus <节点ID>")
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
        cutoff = (_dt.datetime.now() - _dt.timedelta(days=days)).strftime("%Y-%m-%dT%H:%M")
        return sum(1 for m, _ in self._conv_items() if m.group("kind") == MARK_WORDS["skip"] and m.group("key") >= cutoff)

    def log_skip(self, session_id, desc):
        stamp = _dt.datetime.now().strftime("%Y-%m-%dT%H:%M")
        desc = " ".join((desc or "").replace("--", "-").split())[:120]
        self._mark(stamp, "skip", f"s:{(session_id or '-')[:8]} {desc}")

    def migrate(self) -> list[str]:
        """Bring an older v4 workspace up to v4.2 (idempotent):
        v4.0 inbox/ + .state/ -> conversation.md + ws.json + .agents/secrets.env;
        v4.1 conversation format -> column-0 structure with indented content; inbox.md; task.md「任务说明 + 原文记录」."""
        msgs, inbox, state = [], self.agents / "inbox", self.agents / ".state"
        with self.lock():
            converted = self._convert_conv41()
            if converted:
                msgs.append(f"conversation.md 换成新格式（{converted} 条记录）")
            parts = []
            for f in sorted(inbox.glob("*.md")) if inbox.is_dir() else []:
                text = f.read_text()
                heads = list(OLD_INBOX_HEAD_RE.finditer(text))
                for i, h in enumerate(heads):
                    end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
                    parts.append(("q", h.group(1), fmt_q(h.group(1), h.group(2), h.group(3), text[h.end():end])))
            log = state / "inbox-filed.log"
            for line in log.read_text().splitlines() if log.is_file() else []:
                eid, kind, target = (line.split("\t") + ["", ""])[:3]
                if kind in MARK_WORDS:
                    parts.append(("m", eid, fmt_mark(kind, eid, f"→ {target}" if kind == "filed" and target else target)))
            skips = state / "skips.log"
            for line in skips.read_text().splitlines() if skips.is_file() else []:
                stamp, sess, desc = (line.split("\t") + ["", ""])[:3]
                parts.append(("m", "", fmt_mark("skip", stamp.replace(" ", "T"), f"s:{sess} {desc}".strip())))
            migrated = list(dict.fromkeys(eid for k, eid, _ in parts if k == "q"))
            if migrated:  # answers were not recorded in v4.0; close them so new answers do not attach to them
                parts.append(("a", "", fmt_a(migrated, "00:00:00", "（v4.0 迁移：之前的回答未记录）")))
            if parts:
                old = self.conv.read_text() if self.conv.is_file() else ""
                self.conv.write_text("".join(t for _, _, t in parts) + old)
                os.chmod(self.conv, 0o600)
                msgs.append(f"inbox/ 与归档记录 -> conversation.md（{len(migrated)} 条 Q）")
            ruled = self.inbox.is_file() and "\n━━━ " in "\n" + self.inbox.read_text()  # v4.2 pre-release layout
            if (ruled or not self.inbox.is_file()) and self.conv.is_file():
                qs = self.questions()
                if qs:
                    self.inbox.unlink(missing_ok=True)
                    self._append_conv("".join(fmt_inbox(q["id"], q["time"], q["session"], q["text"]) for q in qs),
                                      self.inbox)
                    msgs.append(f"{'重写' if ruled else '生成'} inbox.md（{len(qs)} 条用户消息）")
            secrets = state / "secrets.env"
            if secrets.is_file():
                target = self.agents / "secrets.env"
                if target.exists():
                    raise WsError(f"{target} 已存在，先手动合并 {secrets}")
                secrets.rename(target)
                os.chmod(target, 0o600)
                for f in [self.agents_md] + [self.memory_dir / r for r, _ in self.memory_notes()] + \
                         list(self.task_dir.rglob("brief.md")):
                    if f.is_file() and ".agents/.state/secrets.env" in f.read_text():
                        f.write_text(f.read_text().replace(".agents/.state/secrets.env", ".agents/secrets.env"))
                        msgs.append(f"更新密钥路径引用：{self.rel(f)}")
                msgs.append("secrets.env -> .agents/secrets.env")
            if (state / "hooks-off").exists():
                cfg = self.config()
                cfg["hooks"] = "off"
                (self.agents / "ws.json").write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n")
            for p in (inbox, state):
                if p.is_dir():
                    shutil.rmtree(p)
                    msgs.append(f"删除 {self.rel(p)}/")
            gi = self.agents / ".gitignore"
            if not gi.is_file() or gi.read_text() != GITIGNORE:
                gi.write_text(GITIGNORE)
                msgs.append("更新 .agents/.gitignore")
            for d in self.tasks():
                if self._convert_task_md(d / "task.md"):
                    msgs.append(f"task.md 分成「任务说明 + 原文记录」：{self.node_id(d)}（任务说明待补写）")
        return msgs

    def _convert_conv41(self) -> int:
        text = self.conv.read_text() if self.conv.is_file() else ""
        items = list(CONV41_RE.finditer(text))
        if not items:
            return 0
        out = [text[: items[0].start()].strip()]
        for i, m in enumerate(items):
            end = items[i + 1].start() if i + 1 < len(items) else len(text)
            body = text[m.end():end].strip()
            if m.group("q"):
                out.append(fmt_q(m.group("q"), m.group("time"), m.group("sess"), body))
            elif m.group("a"):
                out.append(fmt_a(m.group("a").split(", "), m.group("atime"), body, cont=bool(m.group("cont"))))
            else:
                rest = m.group("rest") or ""
                out.append(fmt_mark(m.group("kind"), m.group("key"),
                                    f"→ {rest}" if m.group("kind") == "filed" and rest else rest))
        self.conv.write_text("".join(out).lstrip("\n"))
        os.chmod(self.conv, 0o600)
        return len(items)

    def _convert_task_md(self, p: Path) -> bool:
        """Pre-v4.2 task.md (append-only text) -> empty「任务说明」+ the old text under「原文记录」.
        `updated` is set to the creation date so ws check flags the spec until someone writes it."""
        if not p.is_file():
            return False
        text = p.read_text()
        if task_spec(text) is not None:
            return False
        fm, body = read_fm(text)
        h1 = re.search(r"^# .*$", body, re.M)
        title_line = h1.group(0) if h1 else f"# {fm.get('id', '')} {fm.get('title', '')}"
        rest = body[h1.end():] if h1 else body
        rest = re.sub(r"<!--.*?-->", "", rest, flags=re.S).strip()
        # old headings inside the text must not end the「原文记录」section: append markers -> ###, the rest -> ####
        rest = re.sub(r"^#{1,3}\s(?!追加 )", "#### ", rest, flags=re.M)
        first, sep, appended = ("\n" + rest).partition("\n## 追加 ")
        raw = f"### {fm.get('created', '')} 00:00 · 初始说明\n\n{first.strip()}\n" if first.strip() else ""
        if sep:
            raw += "\n" + re.sub(r"^## 追加 ", "### ", "## 追加 " + appended, flags=re.M)
        tpl = render("node/task.md", id=fm.get("id", ""), title=fm.get("title", ""), source=fm.get("from", ""),
                     date=fm.get("created", ""), now=f"{fm.get('created', '')} 00:00",
                     spec=render("node/task-spec.md"), raw=raw.strip() + "\n")
        tpl = re.sub(r"^# .*$", lambda _: title_line, tpl, count=1, flags=re.M)
        p.write_text(tpl)
        return True


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
    for d in (ws.memory_dir, ws.task_dir, ws.skills_dir):
        d.mkdir(parents=True, exist_ok=True)
    cfg = ws.agents / "ws.json"
    if not cfg.is_file():
        cfg.write_text(json.dumps({"version": 4, "profile": profile, "created": today(),
                                   "title": title or root.name}, ensure_ascii=False, indent=1) + "\n")
        msgs.append("写入 .agents/ws.json")
    gi = ws.agents / ".gitignore"
    if not gi.is_file():
        gi.write_text(GITIGNORE)
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
    p = tsub.add_parser("spec", help="改写 task.md 的「任务说明」（stdin，### 目标 / 背景 / 要求 / 约束 / 验收标准 / 输入 / 未定事项）")
    p.add_argument("id")
    p.add_argument("--stdin", action="store_true", default=True)
    p.add_argument("--file")

    p = sub.add_parser("dispatch", help="新建派发目录和 task.md")
    p.add_argument("id")
    p.add_argument("slug")
    p.add_argument("--title")
    p.add_argument("--force", metavar="REASON", help="波次超限仍在本节点派发（原因记进 progress）")
    p.add_argument("--external", action="store_true", help="由 codex exec / claude -p 执行；不计波次")
    p.add_argument("--stdin", action="store_true")
    p.add_argument("--file")

    p = sub.add_parser("followup", help="续派：新要求追加进原派发 task.md，旧 result.md 改名保留，打印续接消息")
    p.add_argument("id", help="派发 ID，如 T01/S03")
    p.add_argument("--stdin", action="store_true", default=True)
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

    sub.add_parser("inbox", help="列出没有记入任何节点的用户原文")
    p = sub.add_parser("focus", help="设定当前节点：之后的用户消息由 hook 自动追加进它的 task.md「原文记录」")
    p.add_argument("id", nargs="?")
    p.add_argument("--clear", action="store_true")
    p = sub.add_parser("log", help="在 progress.md 追加一行")
    p.add_argument("id")
    p.add_argument("text")
    p.add_argument("--tag", default="note", choices=LOG_TAGS)
    sub.add_parser("index", help="重新生成 memory/INDEX.md 和 AGENTS.md 的生成区块")
    sub.add_parser("migrate", help="旧版 v4 工作区升级到 v4.2（对话格式、inbox.md、task.md 结构）")
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
            d, nid = ws.new_task(args.slug, title=args.title, parent=args.parent, body=body,
                                 source="user" if args.entry else None, entry=args.entry)
            if args.entry:
                ws._mark(args.entry, "filed", nid)
            ws.index()
            print(f"{nid}  {ws.rel(d)}")
            if spec_missing((d / "task.md").read_text()):
                print(f"下一步：上层写好「任务说明」（ws task spec {nid} --stdin），执行者写好 goal.md 和 plan.md，"
                      f"然后 ws task status {nid} active")
            else:
                print(f"下一步：写好 goal.md 和 plan.md，然后 ws task status {nid} active")
        elif args.cmd == "task" and args.tcmd == "spec":
            d = ws.set_spec(args.id, Path(args.file).read_text() if args.file else sys.stdin.read())
            ws.index()
            print(f"{args.id} 的任务说明已更新")
            ages = [f"{f} 最后修改于 {_dt.datetime.fromtimestamp((d / f).stat().st_mtime):%m-%d %H:%M}"
                    for f in ("goal.md", "plan.md") if (d / f).is_file()]
            if ages:
                print(f"{'；'.join(ages)}：任务说明变了，执行者核对二者是否要跟着改。")
        elif args.cmd == "task" and args.tcmd == "status":
            ws.set_status(args.id, args.status, force=args.force)
            if args.status == "done":
                for i in ws.memory_issues():
                    if i.code == "memory-stale":
                        print(f"提醒：{i.msg}")
            ws.index()
            print(f"{args.id} -> {args.status}")
        elif args.cmd == "dispatch":
            body = _read_body(args)
            d, did = ws.dispatch(args.id, args.slug, title=args.title, body=body, force=args.force,
                                 external=args.external)
            ws.index()
            print(f"{did}  {d / 'task.md'}")
            if brief_missing(d / "task.md"):
                print(f"先补全 task.md 的「{'」「'.join(brief_missing(d / 'task.md'))}」，否则派发会被拦截。")
            for excerpt, ids in ws.repeated_paragraphs(d, body):
                print(f"提醒：「{excerpt}…」这段已出现在 {'、'.join(ids[:5])} 的派发说明里。可复用的口径、标准、做法"
                      "写进 .agents/memory/（跨节点）或节点 brief.md（本节点所有派发都适用），派发说明只引用路径。")
            if args.external:
                print("外部执行：命令行里让执行器先读上面的 task.md，结果写回同目录 result.md。")
            else:
                print("派发 prompt（原样使用）：")
                print(dispatch_prompt(d))
        elif args.cmd == "followup":
            s, moved = ws.followup(args.id, Path(args.file).read_text() if args.file else sys.stdin.read())
            ws.index()
            print(f"{args.id} 的 task.md 已追加新要求" + (f"；旧结果改名为 {moved}" if moved else ""))
            print("续接消息（SendMessage 原样发出；原执行者已结束时改用 Agent 派发同一句）：")
            print(followup_prompt(s, moved))
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
                print(f"下一步：把这条原文的变化合进「任务说明」，整段改写后 ws task spec {nid} --stdin")
        elif args.cmd == "focus":
            cur = ws.set_focus(args.id) if args.id or args.clear else ws.config().get("focus")
            print(f"当前节点：{cur}" if cur else "没有当前节点")
        elif args.cmd == "inbox":
            unf = ws.unfiled()
            if not unf:
                print("inbox 没有未归档的条目")
            for e in unf:
                print(f"{e['id']}  {e['time']}  {e['text'][:100]}")
        elif args.cmd == "log":
            ws.log(args.id, args.text, tag=args.tag)
        elif args.cmd == "migrate":
            msgs = ws.migrate()
            ws.index()
            print("\n".join(msgs) if msgs else "已是 v4.2，无需迁移")
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
