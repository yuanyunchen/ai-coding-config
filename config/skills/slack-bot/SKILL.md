---
name: slack-bot
description: Connect the current local coding session to a Slack channel as Ethan’s Bot, or report to a bound Slack thread. Use for “加入 Slack #频道”, “把这个会话接入 Slack”, “join Slack #channel”, or “汇报到绑定的 Slack 话题”. Supports Codex and channel-enabled Claude Code on the bridge host.
---

# Join Slack from this session

The local owner's request “加入 Slack #test” selects the current session and that channel. Run the command in this session. A channel name or a Slack thread link is sufficient. Ask for a destination only when none was supplied. Quote the exact destination as one shell argument.

Before linking, briefly tell the owner which session will handle messages, that internal channel members can ask questions, and that replies are visible in the Slack thread. On a Codex takeover, the new session supersedes the previous binding for that discussion. A request from the local owner to join the named channel authorizes the link. Keep private desktop output, credentials and unrelated conversation history out of Slack.

## Codex

For “加入 Slack #test”, run:

```sh
"$HOME/.local/bin/slack-bot" '#test' --backend codex --channel-can-message-this-session
```

Replace `#test` with the requested destination. The helper reads `CODEX_THREAD_ID`. Desktop sessions can join while their window is open. The configured Slack owner's text can steer that window. Other members and attachment requests use the authorized team-project path.

## Claude Code

In a session started with the team-slack Channel, run:

```sh
"$HOME/.local/bin/slack-bot" '#test' --backend claude
```

The launcher supplies the session ID and Channel socket. If Claude Code expanded `${CLAUDE_SESSION_ID}` to a UUID and the helper cannot read a session ID, pass that expanded UUID with `--session`. Use the current session's known `--claude-socket` for a custom endpoint.

For a new Slack-enabled Claude session, start `"$HOME/.local/bin/slack-claude"` in the team's project repository. For an existing session that needs the Channel enabled, exit that Claude session normally and run the same launcher there with `--resume <its exact UUID>`. Preserve the original session. If the bridge reports an isolated team runner, describe the actual binding accurately.

## Confirm the result

Return the Slack link and the state the helper reported. A pending takeover is still pending. When active, the first channel question mentions Ethan’s Bot and a participant can follow up in the same thread. Use the question’s language. If the app cannot access the named channel, ask for the exact Slack link or have a member invite Ethan’s Bot once. If access to the local socket is denied, use the session's normal shell approval flow. After an uncertain Slack delivery, inspect the destination before retrying.

To report a user-authorized update, use the same helper with the selected `--backend`, the bound Slack thread link and `--report=<quoted text>`. Wait for the delivery receipt and return its link.
