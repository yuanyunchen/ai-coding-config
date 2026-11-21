# First-Time Setup

Follow these steps once on a new machine. Afterwards, skills and rules apply globally — there is nothing to configure per project.

For day-to-day maintenance, see the [README](./README.md).

---

## Checklist

- [ ] Install Cursor, sign in, and open it once
- [ ] Install Claude Code, sign in, and run `claude` once
- [ ] Install Codex, sign in, and run `codex` once
- [ ] Install `bytedcli` and sign in with your ByteDance account
- [ ] Install `ccstatusline` and `jq` (Claude Code status line)
- [ ] Clone this repository and run `./agent-config deploy`
- [ ] Clone `global-memory` and run `./bin/setup` (see the [global-memory README](../global-memory/README.md))
- [ ] Enable the browse plugin in Cursor
- [ ] Run `npm install` once in the browse plugin directory

---

## 1. Install the tools and sign in

Each tool must be **opened or run at least once** so that it creates its configuration directory. Tools without one are skipped by `deploy` and `sync`.

### Cursor

1. Download and install from [cursor.com](https://cursor.com).
2. Sign in and open any folder.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude          # signs in through the browser; requires a paid plan such as Pro or Max
```

The status line (reset timer, session and weekly usage, version) is rendered by `ccstatusline`, which is installed separately:

```bash
npm i -g ccstatusline    # deploy restores its configuration, not the tool itself
brew install jq          # required by the context-tokens widget; skip if already installed
```

> Personal settings — default Opus with high effort, bypass-permissions mode, status-line layout — are restored by `deploy`. There is no need to edit `settings.json` by hand.

### Codex

```bash
npm install -g @openai/codex    # note the @openai scope; requires Node 22+
codex           # choose "Sign in with ChatGPT" (Plus, Pro, ...) or use an API key
```

### bytedcli

All tools share one global CLI; `deploy` syncs the skill but does not install the binary.

```bash
npm install -g @bytedance-dev/bytedcli@latest --registry https://bnpm.byted.org
bytedcli auth login
bytedcli --json auth status
```

If Puppeteer fails to download its browser during installation, skip that optional download and retry:

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install -g @bytedance-dev/bytedcli@latest --registry https://bnpm.byted.org
```

---

## 2. Deploy the configuration

```bash
git clone https://github.com/yuanyunchen/ai-coding-config.git
cd ai-coding-config
./agent-config deploy
```

This writes skills, commands and rules to every installed tool and installs the official Claude Code plugins.

### Global memory (global-memory)

Clone it **next to** `ai-coding-config`. `hub/` holds the three memory stores and `bytedance/` holds domain knowledge. `bin/setup` registers the Basic Memory projects and refreshes the runtime symlink, so no absolute paths are written by hand.

```bash
cd ..    # back to the directory that contains ai-coding-config
git clone https://github.com/yuanyunchen/global-memory.git
cd global-memory && ./bin/setup
cd ../ai-coding-config && ./agent-config memory status
```

Full details are in the [global-memory README](../global-memory/README.md).

---

## 3. Cursor plugins

Enable the following under **Settings → Plugins** in Cursor:

- **browse** — browser automation (requires Chrome on the machine)

After enabling browse, run once in a terminal:

```bash
cd ai-coding-config/config/plugins/cursor/enabled/browse__cursor-public
npm install
```

---

## 4. Parallel CLI (optional)

The Parallel skills are disabled by default. Install the CLI and sign in only if you call `parallel-cli` directly or use the text-only fast path of `webpage-content-extraction`:

```bash
curl -fsSL https://parallel.ai/install.sh | bash
parallel-cli login
parallel-cli auth          # confirm you are signed in
```

If the command is not found afterwards, add `~/.local/bin` to `PATH` in `~/.zshrc`.

---

## Optional dependencies

Most users can skip this section.

| When you need it | What to do |
|---|---|
| Testing web pages with `webapp-testing` | `pip install playwright && playwright install chromium` |
| The design CLI in `frontend-pipeline` | Run `npm install` in `.../ui-ux-design-pro/cli/` |
| Reading scanned PDFs | `pip install pytesseract pdf2image` |
| Local MCP servers | `deploy` does **not** sync MCP servers; add them yourself with `claude mcp add ...` (they carry secrets and stay out of the repository) |

> Account connectors from claude.ai (such as Hugging Face) appear automatically after you sign in. Only local MCP servers added with `claude mcp add` need to be set up again.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `~/.claude` not found | Run `claude` once and sign in |
| `sync` skipped Cursor or Codex | Open Cursor and run `codex` once |
| `parallel-cli` not found | Install it only if you need the optional text-only extraction path, and check that `~/.local/bin` is on `PATH` |
| Codex sign-in fails | Confirm a paid ChatGPT plan, or `export OPENAI_API_KEY=sk-...` |
