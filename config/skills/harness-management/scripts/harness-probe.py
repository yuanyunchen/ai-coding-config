#!/usr/bin/env python3
"""harness-probe — 把「环境事实」从散文里抽出来,变成可刷新的产物。

为什么存在:2026-07-29 的 harness 审查发现 6 处必然失败的执行路径,全是同一个形状 ——
一个环境事实(某 CLI 装在哪、某依赖有没有、某能力在不在)被写成散文,然后静默老化。
skill 正文不该硬编码这类事实,应当引用本探针的输出。

元规律(同次审查):所有带日期标注的内容都没过期,过期的全是**没标日期的能力边界断言**。
所以本探针的每一条结论都带 checked_at 与 how(用什么命令验的),让"它什么时候为真"可见。

只读:不装任何东西、不改任何配置、不发写请求。
默认不走网络;`--net` 才做需要联网的检查(npm registry、CLI 鉴权状态)。

用法:
    python3 harness-probe.py                # 探测 + 写两份输出 + 打印摘要
    python3 harness-probe.py --net          # 额外做联网检查
    python3 harness-probe.py --print        # 只打印,不写文件
"""

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

OUT_DIR = os.path.expanduser("~/Library/Logs/harness")
OUT_JSON = os.path.join(OUT_DIR, "probe.json")
OUT_MD = os.path.join(OUT_DIR, "probe.md")

NET = "--net" in sys.argv
PRINT_ONLY = "--print" in sys.argv


def run(cmd, timeout=8):
    """跑一条只读命令,返回 (rc, stdout+stderr)。超时不抛,返回 rc=-1。"""
    try:
        p = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return p.returncode, (p.stdout + p.stderr).strip()
    except subprocess.TimeoutExpired:
        return -1, f"timeout after {timeout}s"
    except Exception as e:  # noqa: BLE001
        return -2, str(e)


def first_line(s, n=200):
    return s.splitlines()[0][:n] if s else ""


facts = []


def add(name, category, status, value, how, note=""):
    """status: ok | missing | degraded | unknown"""
    facts.append(
        {
            "name": name,
            "category": category,
            "status": status,
            "value": value,
            "how": how,
            "note": note,
        }
    )


# ---------------------------------------------------------------- CLI 二进制
def probe_bin(name, category, version_cmd=None, note=""):
    path = shutil.which(name)
    if not path:
        add(name, category, "missing", None, f"shutil.which('{name}')", note)
        return None
    ver = None
    if version_cmd:
        rc, out = run(version_cmd)
        if rc == 0:
            ver = first_line(out, 80)
    add(
        name,
        category,
        "ok",
        {"path": path, "version": ver},
        f"shutil.which + `{version_cmd or 'n/a'}`",
        note,
    )
    return path


probe_bin("lark-cli", "飞书", "lark-cli --version",
          "飞书读写的唯一官方入口;skill 正文里出现的任何 lark-cli 绝对路径都应以本条为准")
probe_bin("bytedcli", "内网平台", "bytedcli --version",
          "Aeolus/Dorado/Codebase 等内网平台入口;未装时相关 skill 的命令只能静态比对无法实跑")
probe_bin("node", "运行时", "node --version")
probe_bin("npx", "运行时", "npx --version")
probe_bin("python3", "运行时", "python3 --version")
probe_bin("git", "运行时", "git --version")
probe_bin("dot", "作图", "dot -V",
          "graphviz;dag-flow-diagram 的概念依赖图默认渲染器")
probe_bin("gh", "AI 编程", "gh --version")
probe_bin("rg", "AI 编程", "rg --version")

# chrome 不在 PATH 里,skill 正文里写裸 `chrome` 会 command not found
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
add(
    "chrome",
    "作图",
    "ok" if os.path.exists(CHROME) else "missing",
    {"path": CHROME if os.path.exists(CHROME) else None, "in_path": bool(shutil.which("chrome"))},
    f"os.path.exists('{CHROME}') + shutil.which('chrome')",
    "headless 渲 PNG 用;注意它不在 PATH,skill 里必须写全路径,不能写裸 chrome",
)

# ---------------------------------------------------------------- Python 依赖
for mod, cat, note in [
    ("PIL", "作图", "render_svg.sh 末尾量图片尺寸用;缺失时脚本在最后一步 crash 而 PNG 其实已生成,容易误判为渲染失败"),
    ("yaml", "记忆", "frontmatter 解析"),
]:
    rc, out = run(f'python3 -c "import {mod}; print(getattr({mod},\'__version__\',\'?\'))"')
    add(
        f"python:{mod}",
        cat,
        "ok" if rc == 0 else "missing",
        first_line(out, 40) if rc == 0 else None,
        f"python3 -c 'import {mod}'",
        note,
    )

# ---------------------------------------------------------------- 关键目录
for label, path, cat, note in [
    ("lark-cli 托管上游 skill", "~/.agents/skills", "飞书",
     "feishu-task-management/subskills/ 是它的物理副本(不是软链),会漂移"),
    ("global-memory 仓", "~/Desktop/AI Workspace/Agentic Engineering/global-memory", "记忆", ""),
    ("ai-coding-config 仓", "~/Desktop/AI Workspace/Agentic Engineering/ai-coding-config", "同步",
     "三源同步的仓快照;deploy 前确认它不比 live 旧"),
    ("记忆 hub 软链", "~/.claude/projects/-Users-bytedance/memory", "记忆",
     "bin/setup 只为 $HOME 的 slug 建链;其他 cwd 拿不到"),
]:
    p = os.path.expanduser(path)
    exists = os.path.exists(p)
    add(
        label,
        cat,
        "ok" if exists else "missing",
        {"path": p, "is_symlink": os.path.islink(p) if exists else None},
        "os.path.exists",
        note,
    )

# ---------------------------------------------------------------- 字体
FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
add(
    "Hiragino Sans GB",
    "作图",
    "ok" if os.path.exists(FONT) else "missing",
    FONT if os.path.exists(FONT) else None,
    "os.path.exists",
    "dag-flow-diagram 钉死的中文字体",
)

# ---------------------------------------------------------------- 能力边界(最容易静默老化的一类)
# 这些不是"某某装了没有",而是"某条能力路径在不在"。审查发现的全部失效断言都属这一类。
rc, out = run("lark-cli docs --help", timeout=15)
if rc == 0:
    for sub, note in [
        ("+media-insert", "一键插图;它存在就意味着「本机没有一键插图命令、必须走 curl 五步」这条断言为假"),
        ("+whiteboard-update", "画板写入;它存在就意味着「经飞书 API 做不出画板」这条断言至少对 update 不成立"),
        ("+media-download", "含 whiteboard thumbnail 导出"),
        ("+create", ""),
        ("+update", ""),
    ]:
        add(
            f"lark-cli docs {sub}",
            "能力边界",
            "ok" if sub in out else "missing",
            sub in out,
            "lark-cli docs --help 输出里搜子命令名",
            note,
        )
else:
    add("lark-cli docs --help", "能力边界", "unknown", None,
        "lark-cli docs --help", f"rc={rc};无法枚举子命令")

rc, out = run("lark-cli whiteboard --help", timeout=15)
add(
    "lark-cli whiteboard +update",
    "能力边界",
    "ok" if (rc == 0 and "+update" in out) else ("missing" if rc == 0 else "unknown"),
    ("+update" in out) if rc == 0 else None,
    "lark-cli whiteboard --help",
    "画板独立写入路径",
)

# ---------------------------------------------------------------- 联网项(默认跳过)
if NET:
    rc, out = run("npx -y @larksuite/whiteboard-cli@^0.2.12 -v", timeout=90)
    add(
        "whiteboard-cli",
        "能力边界",
        "ok" if rc == 0 else "missing",
        first_line(out, 40),
        "npx -y @larksuite/whiteboard-cli@^0.2.12 -v",
        "上游 lark-whiteboard 的渲染管线依赖;自建层曾断言它不可用",
    )
    rc, out = run("lark-cli auth status", timeout=30)
    add(
        "lark-cli 鉴权",
        "飞书",
        "ok" if rc == 0 else "degraded",
        first_line(out, 200),
        "lark-cli auth status",
        "token 过期会让全部飞书读写失败;过期后的重登路径见 cli.md",
    )
else:
    add("whiteboard-cli", "能力边界", "unknown", None,
        "跳过(需 --net)", "用 --net 跑一次才有结论")
    add("lark-cli 鉴权", "飞书", "unknown", None,
        "跳过(需 --net)", "用 --net 跑一次才有结论")

# ---------------------------------------------------------------- 记忆检索
GM = os.path.expanduser("~/Desktop/AI Workspace/Agentic Engineering/global-memory")
if os.path.exists(os.path.join(GM, "bin", "bm")):
    rc, out = run(f'cd "{GM}" && git status --porcelain | wc -l', timeout=15)
    dirty = out.strip() if rc == 0 else "?"
    add(
        "global-memory 工作树",
        "记忆",
        "ok" if dirty == "0" else "degraded",
        {"dirty_count": dirty},
        "git status --porcelain | wc -l",
        "非 0 时 maintain.sh 的 reindex 门禁会跳过重建索引,检索结果会停在上一次索引时刻",
    )
else:
    add("global-memory bin/bm", "记忆", "missing", None, "os.path.exists", "")

# ---------------------------------------------------------------- 输出
now = datetime.now(timezone.utc).astimezone()
report = {
    "checked_at": now.isoformat(timespec="seconds"),
    "host": os.uname().nodename,
    "net_checks": NET,
    "facts": facts,
}

by_status = {}
for f in facts:
    by_status.setdefault(f["status"], []).append(f)

lines = [
    "# harness 环境探针",
    "",
    f"> 探测时间:{now.strftime('%Y-%m-%d %H:%M:%S %z')} · 联网检查:{'是' if NET else '否(加 --net 开启)'}",
    "",
    "**这份文件是环境事实的唯一权威。** skill 正文不要再硬编码 CLI 路径、依赖有无、能力边界 —— 指到这里。",
    "刷新:`python3 ~/.claude/skills/harness-management/scripts/harness-probe.py [--net]`",
    "",
    f"合计 {len(facts)} 项:"
    + " · ".join(f"{k} {len(v)}" for k, v in sorted(by_status.items())),
    "",
]

cats = []
for f in facts:
    if f["category"] not in cats:
        cats.append(f["category"])

MARK = {"ok": "OK", "missing": "MISSING", "degraded": "DEGRADED", "unknown": "UNKNOWN"}
for c in cats:
    lines += [f"## {c}", "", "| 项 | 状态 | 值 | 怎么验的 | 备注 |", "|---|---|---|---|---|"]
    for f in facts:
        if f["category"] != c:
            continue
        v = f["value"]
        if isinstance(v, dict):
            v = " · ".join(f"{k}={v[k]}" for k in v if v[k] not in (None, ""))
        v = str(v) if v not in (None, "") else "—"
        lines.append(
            f"| `{f['name']}` | {MARK.get(f['status'], f['status'])} | {v} | `{f['how']}` | {f['note'] or '—'} |"
        )
    lines.append("")

md = "\n".join(lines)

if PRINT_ONLY:
    print(md)
else:
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)
    with open(OUT_MD, "w", encoding="utf-8") as fh:
        fh.write(md)
    print(f"探针输出:\n  {OUT_JSON}\n  {OUT_MD}\n")

miss = [f for f in facts if f["status"] in ("missing", "degraded")]
print(f"{len(facts)} 项已探测,{len(miss)} 项需要注意:")
for f in miss:
    print(f"  [{f['status']:<8}] {f['name']}  — {f['note'] or f['how']}")
