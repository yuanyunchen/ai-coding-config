# config/plugins

三平台插件**原始包** git 快照。开关在 `manifest.json`；**当前安装一览**见下文 [当前安装一览](#当前安装一览)（`pull` / `sync` / `apply` 自动更新）。

```
config/plugins/
  manifest.json     各平台开关 + hookPlugins + syncPlugins
  README.md         本文件（含自动生成安装表）
  claude/ cursor/ codex/
    enabled/        manifest 中 enabled: true 的原始包
    disabled/       manifest 中 enabled: false 的原始包
  skills/
    enabled/        启用的 skill
    disabled/       禁用的 skill
```

## 命名

路径：`{platform}/{enabled|disabled}/{name}__{marketplace}/`，含 `plugin-meta.json`。

开关以 `manifest.json` 为准；`pull` / `sync` 会按开关放入对应子目录，切换开关时会移动目录。

## 命令

```bash
./agent-config plugins status              # 终端摘要
./agent-config plugins pull                # 拉回原始包 + 更新下方安装表
./agent-config plugins sync [--force]      # claude portable -> cursor/codex + 部署
./agent-config plugins sync --no-deploy    # 只更新快照与 manifest
./agent-config plugins vendor [--force]    # claude portable -> config/
./agent-config plugins deploy
./agent-config plugins install             # Claude marketplace
```

## hook vs portable

| | hook | portable |
|--|------|----------|
| 跨平台 | 否，各平台独立安装 | `plugins sync`（claude -> cursor/codex） |
| Claude | `plugins install` | marketplace + vendor |
| Cursor | IDE 安装（如 continual-learning） | sync 或 `plugins deploy --platform cursor` |
| 示例 | ralph-loop, continual-learning | code-review, parallel |

## 新设备安装

```bash
git clone .../ai-coding-config.git && cd ai-coding-config
./agent-config plugins install          # Claude marketplace
./agent-config plugins sync --force     # portable -> cursor/codex
./agent-config deploy                   # config + plugins deploy
./agent-config links                    # 可选
```

仅 Claude、暂不 sync 到其他工具：`./agent-config deploy --no-sync`

日常拉回并提交：

```bash
./agent-config plugins pull
./agent-config plugins sync --force
git add -A && git commit && git push
```

### Cursor 原生插件

`manifest.json` → `cursor.enabledPlugins` 中与 `@cursor-public` 相关的项需在 **Cursor IDE** 里先启用，再 `plugins pull --platform cursor`：

- `parallel@cursor-public`
- `browse@cursor-public`
- `continual-learning@cursor-public`（hook）

## config-links

`config-links` 是指向 `config/` 的软链（`./agent-config links`）。路径与 `config/` 相同，例如 `config-links/plugins/claude/enabled/`。

## 当前安装一览

<!-- installed:start -->
_Updated: 2026-05-26 04:07 UTC_

## claude

**manifest 启用**: 5 · **git 快照**: 10

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `claude-md-management@claude-plugins-official` | portable | 1.0.0 | `claude/enabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable | unknown | `claude/enabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable | 1.0.0 | `claude/enabled/code-simplifier__claude-plugins-official/` |
| `feature-dev@claude-plugins-official` | portable (off) | unknown | `claude/disabled/feature-dev__claude-plugins-official/` |
| `hookify@claude-plugins-official` | hook (off) | unknown | `claude/disabled/hookify__claude-plugins-official/` |
| `learning-output-style@claude-plugins-official` | hook (off) | 1.0.0 | `claude/disabled/learning-output-style__claude-plugins-official/` |
| `ralph-loop@claude-plugins-official` | hook | 1.0.0 | `claude/enabled/ralph-loop__claude-plugins-official/` |
| `session-report@claude-plugins-official` | portable (off) | unknown | `claude/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable | unknown | `claude/enabled/skill-creator__claude-plugins-official/` |
| `superpowers@superpowers-marketplace` | hook (off) | 5.1.0 | `claude/disabled/superpowers__superpowers-marketplace/` |

## cursor

**manifest 启用**: 7 · **git 快照**: 9

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `browse@cursor-public` | portable | 2.0.0 | `cursor/enabled/browse__cursor-public/` |
| `claude-md-management@claude-plugins-official` | portable | 1.0.0 | `cursor/enabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable | unknown | `cursor/enabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable | 1.0.0 | `cursor/enabled/code-simplifier__claude-plugins-official/` |
| `continual-learning@cursor-public` | hook | 1.0.0 | `cursor/enabled/continual-learning__cursor-public/` |
| `feature-dev@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/feature-dev__claude-plugins-official/` |
| `parallel@cursor-public` | portable | 0.1.1 | `cursor/enabled/parallel__cursor-public/` |
| `session-report@claude-plugins-official` | portable (off) | unknown | `cursor/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable | unknown | `cursor/enabled/skill-creator__claude-plugins-official/` |

<details><summary>manifest 已关闭（无快照目录）</summary>

- `hookify@claude-plugins-official`
- `learning-output-style@claude-plugins-official`
- `ralph-loop@claude-plugins-official`
- `superpowers@superpowers-marketplace`

</details>

## codex

**manifest 启用**: 4 · **git 快照**: 6

| pluginId | kind | version | snapshot |
|----------|------|---------|----------|
| `claude-md-management@claude-plugins-official` | portable | 1.0.0 | `codex/enabled/claude-md-management__claude-plugins-official/` |
| `code-review@claude-plugins-official` | portable | unknown | `codex/enabled/code-review__claude-plugins-official/` |
| `code-simplifier@claude-plugins-official` | portable | 1.0.0 | `codex/enabled/code-simplifier__claude-plugins-official/` |
| `feature-dev@claude-plugins-official` | portable (off) | unknown | `codex/disabled/feature-dev__claude-plugins-official/` |
| `session-report@claude-plugins-official` | portable (off) | unknown | `codex/disabled/session-report__claude-plugins-official/` |
| `skill-creator@claude-plugins-official` | portable | unknown | `codex/enabled/skill-creator__claude-plugins-official/` |

<details><summary>manifest 已关闭（无快照目录）</summary>

- `hookify@claude-plugins-official`
- `learning-output-style@claude-plugins-official`
- `ralph-loop@claude-plugins-official`
- `superpowers@superpowers-marketplace`

</details>

<!-- installed:end -->
