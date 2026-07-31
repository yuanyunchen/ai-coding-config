# Auth & setup — the load-bearing prerequisite

A delegated `claude -p` is a **separate process** that authenticates on its own. It does not borrow the token of the Claude Code session that spawned it. If the standalone CLI has no valid credentials, every dispatch fails identically:

```json
{"type":"result","subtype":"success","is_error":true,
 "result":"Not logged in · Please run /login", ...}
```

and the init event shows `"apiKeySource":"none"` / `claude auth status` returns `{"loggedIn":false,"authMethod":"none"}`. This is the single most likely reason a delegation "ran but did nothing." **Always gate a dispatch on `claude auth status` returning `loggedIn:true`.**

## The desktop-app vs standalone-CLI split (verified on this machine)

Running *inside* the Claude desktop app does **not** mean the standalone `claude` binary is logged in — they are different installs with different credential stores:

- The desktop app holds a live OAuth session refreshed by its host process (env markers: `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH=1`, `CLAUDE_CODE_ENTRYPOINT=claude-desktop`). This token is **not** written to a place the standalone CLI reads.
- The standalone CLI (`~/.local/bin/claude`) looks for its own credentials. On macOS that's the keychain entry `Claude Code-credentials`; on Linux/headless it's the `claude` CLI's own `.credentials.json` under its home dir (always the Claude Code home, regardless of which agent shells out to it).
- Verified here: the keychain entry **exists but is empty** — `security find-generic-password -s "Claude Code-credentials" -w` returns `{"claudeAiOauth":{"accessToken":"","refreshToken":"","expiresAt":0,...}}`. Empty tokens ⇒ the standalone CLI was never logged in ⇒ delegation is blocked until the user authenticates it once.

The Bash sandbox is a second, independent gate: even a logged-in CLI can't read the keychain from inside a sandboxed shell (keychain access is blocked), so a delegation that shells out may need `dangerouslyDisableSandbox` or a non-keychain credential (`ANTHROPIC_API_KEY`, or the CLI's own `.credentials.json`) to see its token.

## Three ways to authenticate the CLI (user action — you can't do these for them)

All three are outward-facing/interactive; surface them to the user rather than attempting them yourself.

1. **`claude setup-token`** — mints a long-lived token for headless/automated use. Requires a Claude subscription. Best fit for a delegation workflow: set once, works unattended thereafter.
2. **`claude auth login`** (alias `/login` interactively) — browser OAuth. Good for a workstation the user drives directly.
3. **`ANTHROPIC_API_KEY`** — export an API key (or wire `apiKeyHelper` in settings). The most robust for scripted/sandboxed delegation because it doesn't depend on the keychain. Pair with `--settings`/env so the child sees it.

After any of these, confirm:

```bash
claude auth status        # expect {"loggedIn":true,"authMethod":"..."}
claude -p --model haiku "Reply with exactly: SMOKE-OK"   # end-to-end check
```

## Hermetic / CI runs

- `--bare` — skips CLAUDE.md discovery, hooks, plugin sync, auto-memory, keychain reads. Auth is then strictly `ANTHROPIC_API_KEY` or `apiKeyHelper` via `--settings` (OAuth/keychain are never read). Use when you want a clean, reproducible delegate that doesn't inherit local config.
- `--safe-mode` — disables all customizations (skills, plugins, hooks, MCP, custom agents) for troubleshooting a broken config; auth/model/tools still work normally.
- `--no-session-persistence` — don't write the session to disk (breaks later `--resume`); use for throwaway CI runs.

## Ground truth

`claude auth status`, `claude auth --help`, and `claude doctor` are authoritative. When a dispatch fails, run `claude auth status` before assuming anything about the prompt or the task.
