# 首次配置

新机器第一次用，按下面顺序做一遍即可。配完后 skill / 规则全局生效，**不用每个项目重复配**。

日常维护见 [CLAUDE.md](./CLAUDE.md)。

---

## 要做的事（清单）

- [ ] 装 Cursor，登录，打开一次
- [ ] 装 Claude Code，登录，运行一次 `claude`
- [ ] 装 Codex，登录，运行一次 `codex`
- [ ] 装 `bytedcli`，完成字节内部账号登录
- [ ] 装 `ccstatusline` + `jq`（Claude Code 状态栏显示）
- [ ] 克隆本仓库，执行 `./agent-config deploy`
- [ ] 克隆 `global-memory`，运行 `./bin/setup`（见 [global-memory README](../global-memory/README.md)）
- [ ] 在 Cursor 里启用 browse 插件
- [ ] browse 插件目录跑一次 `npm install`

---

## 1. 装三工具并登录

每个工具**至少打开/运行一次**，才会生成配置目录。不生成的话后面 `deploy` 会跳过它。

### Cursor

1. [cursor.com](https://cursor.com) 下载安装
2. 登录账号，随便打开一个文件夹

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude          # 浏览器登录，需要 Pro/Max 等付费账号
```

状态栏（reset/session/weekly 用量、版本）由 `ccstatusline` 渲染，单独装：

```bash
npm i -g ccstatusline    # deploy 只恢复其配置，不装工具本身
brew install jq          # context-tokens 部件依赖；已有可跳过
```

> 个性化（默认 Opus + high、bypass 免确认、状态栏布局）随 `deploy` 自动恢复，不用手动配 `settings.json`。

### Codex

```bash
npm install -g @openai/codex    # 注意是 @openai/codex，需 Node 22+
codex           # 选 Sign in with ChatGPT（Plus/Pro 等），或用 API Key
```

### bytedcli

三工具共享同一份全局 CLI；`deploy` 负责同步 skill，不重复安装二进制。

```bash
npm install -g @bytedance-dev/bytedcli@latest --registry https://bnpm.byted.org
bytedcli auth login
bytedcli --json auth status
```

若安装时 Puppeteer 下载浏览器失败，可跳过该可选下载后重试：

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install -g @bytedance-dev/bytedcli@latest --registry https://bnpm.byted.org
```

---

## 2. 部署配置

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy
```

这一条会把 skill、命令、规则写到三个工具，并安装 Claude 官方插件。

### 全局记忆（global-memory）

与 `ai-coding-config` **同级**克隆；`hub/` = 三库，`bytedance/` = 域知识。经 `bin/setup` 注册 BM project 并刷新 runtime 软链（可移植，不手写绝对路径）。

```bash
cd ..    # 回到 Agent Development/（与 ai-coding-config 同级）
git clone https://github.com/yuanyunchen/global-memory.git
cd global-memory && ./bin/setup
cd ../ai-coding-config && ./agent-config memory status
```

完整说明见 [global-memory/README.md](../global-memory/README.md)。

---

## 3. Cursor 插件

在 Cursor **Settings → Plugins** 里启用：

- **browse** — 浏览器自动化（本机要装 Chrome）

启用 browse 后，在终端跑一次：

```bash
cd ai-coding-config/config/plugins/cursor/enabled/browse__cursor-public
npm install
```

---

## 4. Parallel CLI（按需）

Parallel skill 默认禁用。只有直接使用 `parallel-cli`，或使用 `webpage-content-extraction` 的纯文本快速路径时，才需要安装 CLI 和登录账号。

需要时直接在终端安装：

```bash
curl -fsSL https://parallel.ai/install.sh | bash
parallel-cli login
parallel-cli auth          # 确认已登录
```

装完找不到命令，把 `~/.local/bin` 加到 PATH（写进 `~/.zshrc`）。

---

## 按需（大多数人可以跳过）

| 什么时候需要 | 做什么 |
|---|---|
| 用 webapp-testing 测网页 | `pip install playwright && playwright install chromium` |
| 用 frontend-pipeline 的设计 CLI | 在 `.../ui-ux-design-pro/cli/` 里 `npm install` |
| 读扫描版 PDF | `pip install pytesseract pdf2image` |
| 要本地 MCP 服务器 | `deploy` **不**同步 MCP，需自己配：`claude mcp add ...`（含密钥，不入仓库） |

> MCP 说明：claude.ai 账号连接器（如 Hugging Face）登录后自动出现，不用配；只有 `claude mcp add` 的本地 MCP 才要手动重配。

---

## 出问题了？

| 现象 | 处理 |
|---|---|
| `找不到 ~/.claude` | 先跑一遍 `claude` 登录 |
| sync 跳过了 cursor/codex | 先打开 Cursor、跑一遍 `codex` |
| `parallel-cli` 找不到 | 仅在需要可选的纯文本网页提取路径时安装，并检查 `~/.local/bin` 是否在 PATH |
| Codex 登录失败 | 确认 ChatGPT 付费档，或 `export OPENAI_API_KEY=sk-...` |
