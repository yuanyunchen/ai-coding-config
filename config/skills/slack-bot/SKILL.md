---
name: slack-bot
description: Use when the local owner asks to link the current Codex or Claude Code session to Slack or report from it into a bound Slack discussion. Triggers include “把这个会话接入 Slack” and “汇报到绑定的 Slack 话题”. Applies to local sessions on the bridge host.
---

# Link or report from this session

Use the destination the local owner explicitly named. Ask when they haven't supplied one. Quote the destination and report text as separate shell arguments.

- **Link the current session.** A channel creates a thread, while a thread link selects its existing root. After success, return the Slack link and the reply instructions.

  ```sh
  "$HOME/.local/bin/slack-bot" '#random' --backend codex
  ```

- **Report to an existing binding.** Send only the summary the user authorized. Use the exact Slack thread link when the channel has several bindings for this session. On success, return the confirmed Slack link.

  ```sh
  "$HOME/.local/bin/slack-bot" '#random' --backend codex --report='The build and tests passed.'
  ```

## Identify the source session

Codex uses `CODEX_THREAD_ID`. In Claude Code, use `--backend claude`. When Claude Code expands this skill's `${CLAUDE_SESSION_ID}` to a UUID, pass that UUID as `--session <uuid>`. Otherwise the helper reads `CLAUDE_CODE_SESSION_ID` from the Claude shell, with `CLAUDE_BRIDGE_THREAD_ID` for bridge-launched sessions. Linking Claude requires a live Claude Channel. If the channel is unavailable, resume the exact session with the bridge launcher before linking. [Claude Code skill substitutions](https://code.claude.com/docs/en/skills#available-string-substitutions)

The bridge uses an owner-only local socket. If the sandbox denies the connection, use the session's authorized shell approval flow when available. The bridge owner can also run the command from their local terminal with the exact source `--session <uuid>`. For linking a Claude Channel that uses a nondefault socket, include its known `--claude-socket <absolute-path>`. If delivery is uncertain, check Slack before retrying. Pass only the authorized report text and keep credentials and older session history out of the command.

## Binding the actual source session

Before linking, say who can send messages, who can see the Slack replies, and whether the exact local conversation or a new team session will handle them. An explicit request for the current session must never be described as satisfied by an isolated runner. When the local owner has explicitly approved all internal members sending messages into the current Codex session, use the existing thread link and `--channel-can-message-this-session`. Reuse earlier authorization. This native inbox appends attributed user messages to the actual Codex history. The bridge samples a text response directly from that same native thread, without running local functions or disclosing unrelated desktop output. It records the reply in the native thread and returns it to the requesting Slack thread. If the user needs automatic coding, describe this difference before suggesting a team runner.
