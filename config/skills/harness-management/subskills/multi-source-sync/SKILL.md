---
name: multi-source-sync
description: "harness-management 内部 subskill(伪 skill,经其路由 Read):Claude/Cursor/Codex 三源 harness 同步 + 仓快照 + GitHub push/pull,与本机 config-links。触发:同步三源、sync skills、deploy harness、agent-config sync/deploy/pull/links、从 GitHub 更新并推到三工具。任意 cwd 可调,不必 cd 进仓库。"
---

# multi-source-sync — 三源 harness 同步(agent-config + GitHub)

> harness-management 内部伪 skill。把 `ai-coding-config` 的 `./agent-config` 变成**任意工作目录可调用**的操作面;本机浏览用 `config-links` **保持软链**;**每次完整同步默认含 GitHub**(仓有改动则 commit+push;从远端更新则先 pull)。

## 路径解析(禁止写死本机绝对路径)

按序解析仓库根 `REPO`,任一命中即停:

1. 环境变量 `AI_CODING_CONFIG`(指向仓根,含 `agent-config` 入口)
2. 枢纽定位卡 `agent-harness-config`(hub 检索 / 读卡)里的本地路径
3. 与 `global-memory` 同级:`realpath(<hub runtime 软链>)/../ai-coding-config`(hub 常见链到 `…/global-memory/hub`)
4. 当前 cwd 向上找含 `agent-config` + `config/skills/` 的目录

**CLI**(无需 `cd $REPO`):

```bash
"$REPO/agent-config" <command> [options]
```

验仓:`test -x "$REPO/agent-config" && test -d "$REPO/config/skills"`。找不到 → 停,报告解析步骤,请用户给出仓根或设 `AI_CODING_CONFIG`。

Live runtime(工具 home,非仓):

| 工具 | 根 |
|---|---|
| Claude Code | `~/.claude` |
| Cursor | `~/.cursor` |
| Codex | `~/.codex` |

**Canonical live 源默认 = Claude**(`~/.claude`)。仓内快照 = `$REPO/config/`。远端 = GitHub `yuanyunchen/ai-coding-config`。

## 本机 link 纪律

- **`config-links` → `config/`**:仅本机浏览用,已 gitignore。创建/修复:`"$REPO/agent-config" links`。必须是**相对软链**,禁止把 `config-links` 做成实体目录或绝对路径副本。
- **`config/` 本身不用软链**(跨设备不可移植);改内容改 `config/` 或经 `config-links/`(同一 inode 视图)。
- sync/deploy 用 rsync 物化到各工具 home 是预期行为;不要为「省一份拷贝」把 `~/.cursor/skills/X` 软链到 `~/.claude/skills/X`(除脚本已跳过的「目标已指向源」情形)。

## 命令速查(在任意 cwd 执行)

| 意图 | 命令 |
|---|---|
| 预览三源增量同步 | `"$REPO/agent-config" sync --dry-run` |
| Claude → Cursor+Codex | `"$REPO/agent-config" sync --source claude` |
| 指定源/目标 | `"$REPO/agent-config" sync --source cursor --target claude` |
| 镜像对齐(会删目标多余) | `"$REPO/agent-config" sync --source claude --mirror` |
| 仓 → Claude(+默认再 sync) | `"$REPO/agent-config" deploy` |
| 只部署不跨工具 sync | `"$REPO/agent-config" deploy --no-sync` |
| live → 仓快照 | `"$REPO/agent-config" pull` |
| 重建 config-links | `"$REPO/agent-config" links` |
| 插件开关/portable | `"$REPO/agent-config" plugins …` |
| 全局记忆 git 同步 | `"$REPO/agent-config" memory …` |

各命令 `-h` 看完整参数。默认 sync = **增量只加不删**;`--mirror` 才删齐。覆盖前默认备份到目标根 `.claude-sync-backup-<时间戳>/`。

## 完整同步(默认;含 GitHub)

用户说「同步三源 / sync skills / 推三工具」且未声明 `--dry-run` /「只本地」时,按序执行**整条管道**(缺一步不算完成):

1. **三 live**:`"$REPO/agent-config" sync --source <canonical>`(默认 `claude`;可按用户指定改源/目标/`--mirror`)
2. **回仓**:若改动源自 live → `"$REPO/agent-config" pull`;若改动已在 `$REPO/config/` → 跳过 pull,直接确保 live 已 deploy/sync
3. **GitHub**:在 `$REPO` 内 `git status` / `git diff`;有改动 → 按用户 git 规范 add(禁 secrets)→ commit(HEREDOC)→ `git push`;无改动但 ahead → 只 push;behind → 先 `git pull --rebase`(或报告冲突)再 push。**调用本 subskill 的「同步三源 / sync」即视为用户已授权本次 commit+push**(2026-07-12 明示);与「平时未经要求不擅自 commit」的通用 git 纪律不冲突——授权范围仅限本管道。`--dry-run` / 用户明确「不要推 GitHub」/「只本地」才跳过本步。
4. **验收**:三 home 目标文件存在且工具根路径已改写;`config-links` 仍为软链;`git status` 显示与远端一致(或已说明未推原因)。

同时动全局记忆时:另对 `global-memory` 走同等 git 同步(或 `"$REPO/agent-config" memory push`)。

## 场景路由

| 场景 | 步骤 |
|---|---|
| **同步三源(默认)** | 走上方「完整同步」整条管道(含 GitHub) |
| **仅预览** | `sync --dry-run`(不写 live、不 commit、不 push) |
| **仓快照恢复/新机** | `git pull` → `deploy` → 若本地仍有未推提交则 push;失败时看个人化脚本 Python 版本(Codex TOML 需 3.11+ `tomllib`) |
| **从 GitHub 更新并推三源** | 走下方「多源协议」 |
| **本机浏览断了** | `links`(保持软链);不强制 GitHub |

## 多源 harness 同步协议(GitHub ↔ 仓 ↔ 三 live)

用户要求从 GitHub 更新 harness/skills/rules 并同步到三工具时,按序:

1. **拉仓**:在 `$REPO` `git fetch` / `pull`;不要先覆盖 live。
2. **看冲突**:对比 GitHub、仓本地未提交改动、三 live(`~/.claude`/`~/.codex`/`~/.cursor`);标出必须保留的本地化(路径、工具差、用户未提交)。
3. **报告**:冲突面 + 拟策略;用户已授权「冲突自己看着改」可继续,但不得回退仍有效的 harness 更新。
4. **合并**:在仓内合并/本地化;再 `deploy` 或先写入 Claude live 再 `sync`。
5. **GitHub**:有本地提交或合并结果 → **必须** commit(若尚未)并 push;若同时动全局记忆,另推 `global-memory`。
6. **验三源**:目标文件在三 home 均存在;正文工具根路径已改写;`config-links` 仍为软链;远端与本地对齐。

## 边界

- 本 subskill = **执行层**(跑 CLI + 协议)。改 skill/规则正文仍先走 harness `modules/update.md` 判桶/判层/冲突/审批,再视需要调本 subskill 做三源+GitHub 传播。
- `agent-config sync` ≠ `plugins sync`(后者管插件开关/portable 包)。
- hook 型 Claude 插件命令不同步到 Cursor/Codex;Codex 无 subagents;增量模式下部分 skill 对 codex 跳过(见 `scripts/sync.sh`)。
- 详细仓库约定以 `$REPO/CLAUDE.md` 为准;本文件只保留可执行摘要。
