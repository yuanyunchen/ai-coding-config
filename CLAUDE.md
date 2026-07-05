# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库定位

本仓库是 **Cursor / Claude Code / Codex** 三工具的统一 agent 配置备份库，用于跨设备迁移与版本管理。

- **真实配置**在部署目录 `~/.cursor` `~/.claude` `~/.codex`（各工具至少运行过一次才会创建）
- **git 快照**在 `config/`（真实文件，无软链，可 push 到其他设备）
- **本机浏览**：`config-links/` 是指向 `config/` 的软链（gitignore，`./agent-config links` 创建），目录树与 `config/` 完全一致

所有操作通过**唯一入口** `./agent-config` 完成，实现脚本在 `scripts/` 子目录。

## 目录结构

```
config/                        git 快照（跨设备迁移）
  agents/  commands/  AGENTS.md  AGENTS-cn.md
  skills/*（启用，扁平）  skills-disabled/*（禁用，同级目录）
  plugins/manifest.json  plugins/README.md
  plugins/{claude,cursor,codex}/{enabled,disabled}/
  claude-personal/settings.personal.json  claude-personal/ccstatusline/   Claude Code 个性化 + 状态栏
  codex-personal/config.personal.toml      Codex 个性化
config-links/ -> config/       本机软链（gitignore，`./agent-config links`）
agent-config                   统一 CLI 入口
scripts/                       deploy | pull | sync | plugins | memory | links
config/AGENTS.md               部署到三工具的全局英文规则（主版本）
config/AGENTS-cn.md            AGENTS.md 中文镜像（人读参考；pull/deploy/sync 随 AGENTS.md 一并处理）
SETUP.md                       新机器首次配置（给人看；装工具、登录、Parallel、browse）
```

## 部署目录映射

| 配置类别   | cursor          | claude          | codex                       |
|-----------|-----------------|-----------------|-----------------------------|
| 斜杠命令   | `commands/*.md` | `commands/*.md` | `prompts/*.md`              |
| subagents | `agents/*.md`   | `agents/*.md`   | （无此机制，跳过）            |
| skills    | `skills/*`（启用）`skills-disabled/*`（禁用） | 同上 | 同上（`.system` 不动） |
| 插件      | —               | `settings.json` | —                             |
| 插件快照  | `config/plugins/cursor/` | `config/plugins/claude/` | `config/plugins/codex/` |
| 全局规则   | `AGENTS.md`     | `AGENTS.md`     | `AGENTS.md`                 |
| 中文镜像   | `AGENTS-cn.md`  | `AGENTS-cn.md`  | `AGENTS-cn.md`（人读，非加载） |
| 个性化设置 | （暂不纳管）      | `settings.json`（深合并） | `config.toml`（深合并）       |
| 状态栏显示 | （暂不纳管）      | `~/.config/ccstatusline/` | `config.toml` 的 `[tui]`     |

**Canonical 源**：`~/.claude`。`config/plugins/claude|cursor|codex/` 存各平台**原始插件包**；`pull` 拉回、`deploy` 一键部署。hook 插件不跨平台 sync；portable 经 `vendor` + `sync`。

Claude Code 只读 `CLAUDE.md`，部署目录里用 `~/.claude/CLAUDE.md` 的 `@AGENTS.md` 导入全局规则。

## 配置流程

### 新设备首次恢复

**给人配机器**：只维护 [SETUP.md](./SETUP.md)，勿在本文件重复展开安装步骤。

前提：已安装三工具，且 `~/.cursor` / `~/.claude` / `~/.codex` 目录存在（各工具至少运行过一次）。

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy          # 或 deploy --no-sync 跳过三工具 sync
```

`deploy` 后 SETUP 还要求（`deploy` 不会自动完成）：Cursor IDE 启用 `parallel`/`browse`/`superpowers` 插件 → browse 目录 `npm install` → Parallel CLI 登录（见下 Gotchas）。Codex 侧在 IDE 启用 `superpowers@openai-curated` 后 `./agent-config plugins pull --platform codex`。

### 本机日常改配置

1. 直接改 `~/.claude/...` 或 `~/.codex/config.toml`（本仓库内改 `config/...`，或经 `config-links/` 浏览——与 `config/` 为同一路径）
2. 或在 Cursor 里改完后：`./agent-config sync --source cursor`
3. 拉回仓库快照：`./agent-config pull`
3b. 若改了插件开关：`./agent-config plugins sync --force`（再 pull 亦可）
4. 提交：`git add -A && git commit -m "sync config" && git push`

### 全局记忆同步（`../claude-memory/`，正文在 `memory/` 子目录）

```bash
./agent-config memory pull    # 多设备开工前
./agent-config memory push    # 收工后有改动
```

### 三工具互相同步（不写仓库）

```bash
./agent-config sync --dry-run              # 默认 claude -> cursor + codex
./agent-config sync --source cursor        # cursor 为源
```

### 从 Cursor 初次迁移到 Claude（一次性）

仅在还没建立 `~/.claude` 配置、需要从 Cursor 全盘搬过来时用：

```bash
./agent-config migrate --dry-run
./agent-config migrate
./agent-config pull    # 把结果纳入 config/ 快照
```

## `./agent-config` 命令一览

| 命令 | 方向 | 说明 |
|------|------|------|
| `deploy` | config/ → ~/.claude + ~/.codex (+ sync) | 新设备恢复（含 Claude/Codex 个性化深合并 + ccstatusline） |
| `pull` | 本机配置 → config/ | 改完配置后拉回仓库（含 Claude/Codex 个性化 + ccstatusline） |
| `sync` | 三工具互相同步 | 增量，只加不删 |
| `plugins sync` | claude 插件 → cursor/codex | 镜像 manifest 开关；含 pull + 可选 deploy |
| `migrate` | ~/.cursor → ~/.claude | 一次性迁移 |
| `links` | `config-links` -> `config/` | 整理 skills 两层目录 + 相对软链 |
| `plugins` | pull / sync / deploy / install / apply | 见「插件统一」；`plugins status` 看快照 |

各命令均支持 `--dry-run` 预览；`deploy --no-sync` 跳过三工具 sync；`sync --no-backup` 覆盖前不备份。详细参数：`./agent-config <command> -h`

## 插件统一

三平台**原始插件包**：`config/plugins/{claude,cursor,codex}/{enabled,disabled}/`；清单见 `config/plugins/README.md`（自动生成）。

**勿与 `agent-config sync` 混用**：后者只同步 `config/skills|commands|agents`，不处理 `config/plugins/` 原始包。

| 类型 | 存储 | Claude | Cursor/Codex |
|------|------|--------|--------------|
| **hook** | 各平台独立目录 | `plugins install` | IDE 单独安装 |
| **portable** | 各平台独立目录 | marketplace + vendor→config | vendor→sync 或 cursor 目录 deploy |

```bash
./agent-config plugins pull              # 拉回三平台原始包（--platform claude|cursor|codex）
./agent-config plugins sync              # claude portable -> cursor/codex（镜像 enable/disable）
./agent-config plugins deploy            # apply 开关 + cursor/codex portable 部署
./agent-config plugins install           # Claude marketplace
./agent-config plugins vendor [--force]  # claude portable -> config/
./agent-config deploy                    # 含 plugins deploy + install + sync
./agent-config links                     # config-links -> config/
```

portable 更新：`pull` → `vendor --force` → `deploy`

详见 `config/plugins/README.md`

## 个性化与显示（Claude + Codex 同一套设计）

Claude 与 Codex 的个性化（默认模型、推理强度、状态栏等）用**同一套方法**纳管：各有一个 python 脚本，从本机配置抽取**可移植的纳管 key 子集**存进仓库（`pull`），部署时**深合并**回本机（`deploy`），都不碰未纳管 key。

| 工具 | 脚本 | 部署位置 | 仓库快照 | 纳管 key 声明 |
|------|------|---------|---------|--------------|
| Claude | `scripts/settings-personal.py` | `~/.claude/settings.json` | `config/claude-personal/settings.personal.json` | `MANAGED_KEYS`（顶层 key 列表） |
| Codex | `scripts/codex-personal.py` | `~/.codex/config.toml` | `config/codex-personal/config.personal.toml` | `MANAGED_SCHEMA`（嵌套 schema，可选 table 子 key） |

> 两脚本声明纳管 key 的形式不同（JSON 顶层 key 列表 vs TOML 嵌套 schema），是因 Claude 纳管的是整块顶层对象（`env`/`permissions`），Codex 要在 `[tui]`/`[desktop]`/`[features]` 里挑子 key；pull/deploy + 深合并的核心方法一致。

**状态栏例外**：Claude 的状态栏由外部工具 `ccstatusline` 提供，配置在独立目录 `~/.config/ccstatusline/`，由 `config/claude-personal/ccstatusline/` 整目录 rsync 恢复；Codex 状态栏是原生 `[tui]` key，已含在 `config.personal.toml` 里，无需单独目录。

### Claude 纳管哪些 key（`settings.personal.json`）

由 `settings-personal.py` 的 `MANAGED_KEYS` 决定，只存**可跨设备移植**的个性化：

- `model: opus`、`effortLevel: high` — 默认 Opus + high 推理
- `permissions`（`defaultMode: bypassPermissions`、`allow:["*"]`）+ `skipDangerousModePermissionPrompt` — 默认免确认（截图里的 `bypass permissions on`）
- `env.ANTHROPIC_SMALL_FAST_MODEL` — 后台小任务用 Haiku
- `statusLine`（指向 `ccstatusline`）、`skillListingBudgetFraction`、`verbose`、`agentPushNotifEnabled`

**不纳管**（深合并不碰，避免打架）：`enabledPlugins`、`extraKnownMarketplaces`（归 `plugins/manifest.json` 管）、`hooks`（本机绝对路径，如 pixel-agents）。

### 状态栏（截图那条）

`ccstatusline` 是独立 npm 全局工具，**要单独装**：`npm i -g ccstatusline`（进 SETUP）。`settings.json` 只存指针，真正的部件布局（reset-timer / session-usage / weekly-usage / context-tokens.sh）在 `~/.config/ccstatusline/settings.json`，由 `config/claude-personal/ccstatusline/` 快照恢复。装 ccstatusline 还依赖 `jq`（context-tokens 部件用）。

### 改完个性化怎么拉回

直接在 Claude Code（`/model`、`/config`、`ccstatusline` 交互配置）或 Codex（改 `~/.codex/config.toml`）里改完后：

```bash
./agent-config pull        # 一并抽 Claude settings + ccstatusline 目录 + Codex config 个性化 key 回 config/
```

### Codex 纳管哪些 key（`config.personal.toml`）

由 `codex-personal.py` 的 `MANAGED_SCHEMA` 决定，只存**可跨设备移植**的个性化：

- `model`、`model_reasoning_effort`、`personality`、`approval_policy`、`sandbox_mode`、`service_tier` — 默认模型与运行策略
- `[tui]`：`status_line_use_colors`、`status_line` — 状态栏部件
- `[desktop]`：`appearanceTheme`、`usePointerCursors`、`conversationDetailMode`
- `[features]`：`js_repl`

**不纳管**（深合并不碰，避免泄密/打架）：`auth`、`mcp_servers`、`plugins`、`projects`、`notify` 等本机或带密钥的 key。

> **MCP 不纳管**：两类 MCP 都不自动同步。**账号连接器**（claude.ai connector，如 Hugging Face）跟 Claude 账号走，新机器登录后自动出现，无需配。**本地 MCP**（`claude mcp add` 写进 `~/.claude.json` 的 `mcpServers`）不纳管 —— 因为常在 `env`/`headers` 里带密钥，进 git 会泄密；需要时用户在新机器手动 `claude mcp add` 重配。

## Disable 一个 skill

禁用 = 把 skill 目录从 `skills/` 移到**同级** `skills-disabled/`。工具把 `skills/` 下的每个子目录当一个 skill 加载，所以禁用项必须移出 `skills/`（**不能**放进 `skills/disabled/` 子目录——那样 Cursor/Claude 会把 `disabled` 当成一个 skill，反而让真 skill 不加载）。重新启用即移回 `skills/`。

`sync` 会同步 `skills/` 与 `skills-disabled/` 两个同级目录（增量，只加不删）。

## Gotchas

- **`config/AGENTS.md`**：部署到三工具的全局英文规则；`deploy`/`pull`/`sync` 会同步到各工具 `AGENTS.md`。
- **hook 插件**：见 `manifest.json` 的 `hookPlugins`；原始包在 `config/plugins/{claude,cursor,codex}/`，不 vendor、不跨平台 sync。
- **portable 插件**：`plugins pull` → `vendor` → `sync`；如 code-review 三工具 prompt 一致。
- **`feature-dev` 已禁用**：manifest 中 `feature-dev@claude-plugins-official: false`。
- **`config/` 不用软链**：绝对路径软链无法跨设备；本机用 `config-links` -> `config` 相对软链浏览。
- **`config-links` 无独立结构**：不要往 `config-links/` 里放 replicas、plugins-enabled 等旧目录；只保留指向 `config/` 的一条链。
- **`node_modules` 未纳入 git**：`frontend-pipeline/.../ui-ux-design-pro/cli` 需要时在目标机器 `npm install`。
- **脚本有副作用**：除 `pull` 和 `links` 外都会写部署目录；执行前先 `--dry-run`。
- **改结构前先看部署目录**：工具实际加载的布局以 `~/.{tool}/skills/` 等为准，`config/` 必须镜像之；不匹配会**静默坏掉**（如 skill 整批不加载，无报错）。本次 skills 扁平化即源于此。
- **改脚本后验证**：`bash -n scripts/*.sh` 过语法 + 相关命令 `--dry-run` 核对路径，再跑真实部署。
- **`plugins apply`**：以 manifest 为准写 `~/.claude/settings.json`；会删除 manifest 已移除的插件项。
- **技能路径**：正文引用启用技能用 `~/.{tool}/skills/<name>/`，禁用的用 `~/.{tool}/skills-disabled/<name>/`；`sync` 会把旧式 `skills/enabled/` 拍平为 `skills/`、`skills/disabled/` 改写为 `skills-disabled/`。
- **禁用 skill 不能放 `skills/` 子目录**：Cursor/Claude 把 `skills/` 的每个子目录当一个 skill，旧式 `skills/disabled/` 会被误当 skill 且让真 skill 不加载；禁用项必须放**同级** `skills-disabled/`。`deploy` 会清理残留的 `skills/{enabled,disabled}`。
- **插件文档**：只维护 `config/plugins/README.md`；`pull`/`apply` 更新其中 `<!-- installed:start -->` 段。
- **个性化深合并（Claude + Codex 同一套）**：`settings.personal.json` / `config.personal.toml` 经各自脚本 `deploy` **深合并**进本机 `settings.json` / `config.toml`，只覆盖纳管 key，不删本机未纳管 key（Claude 的 `hooks`/`enabledPlugins`、Codex 的 `auth`/`mcp_servers` 等）；增删纳管 key 改对应脚本的 `MANAGED_KEYS` / `MANAGED_SCHEMA`。勿把 `enabledPlugins`/`hooks` 写进 `settings.personal.json`。
- **`ccstatusline` 要单独装**：`deploy` 只恢复 `~/.config/ccstatusline/` 配置，不装工具本身；新机器须 `npm i -g ccstatusline`（+ `jq`），见 SETUP。
- **`SETUP.md`**：新机器给人看的 checklist；agent 改首次配置流程时同步更新 SETUP，细节放 SETUP 勿堆进本文件。
- **Parallel**：`deploy` 只同步 `parallel-*` skill；`parallel-cli` + 账号需单独配。Cursor 须先在 IDE 开 `parallel@cursor-public`，再 `/parallel-setup`；Claude/Codex 终端 `curl …/install.sh | bash` + `parallel-cli login`。
- **Cursor 首次插件**（SETUP 清单）：`parallel`、`browse`（browse 启用后在 `config/plugins/cursor/enabled/browse__cursor-public/` 跑 `npm install`）。`continual-learning` 在 manifest 但不在标准 SETUP 流程。
- **Codex 包名**：`npm i -g @openai/codex`（无 scope 的 `codex` 是无关包）。
