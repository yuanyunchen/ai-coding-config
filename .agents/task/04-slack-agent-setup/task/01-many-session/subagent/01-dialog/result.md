---
id: T04.01/S01
status: DONE_WITH_CONCERNS
---
# 结果 — T04.01/S01 Slack dialogue policy

## 结论

Implemented and tested `decideDialog(event, state = {})`. The function returns `{action, patch?}`. Actions are `ignore`, `forward`, `status`, and `control`. The router owns authorization, persistence, deduplication, and delivery. State carries `mode` (`active`, `mention-only`, or `muted`), `participantId`, and optional `progress`.

A substantive @mention activates follow-ups for its author within the same thread. Another author can take over by addressing the bot. Greeting-only messages stay quiet. A file can be the entire request. Messages addressed to a person or group stay passive unless the bot is also explicitly addressed. Conversation between people without an @mention is ambiguous when the active participant is speaking. Use that participant's `/mention-only` mode to require an @ each time.

A standalone `/mute`, `/mention-only` or `only @`, `/unmute`, `/progress on`, `/progress off`, or `/status` is recognized. Common Chinese equivalents also work. In a muted thread, ask the bot by @ to change settings or check status. Thread controls do not create model turns. The files and unit tests are ready for the router.

The Vercel community starter subscribes to a thread upon an @mention and accepts unmentioned follow-ups in subscribed threads. The community Claude starter uses a persistent session per Slack thread and streams within that thread. OpenClaw documents implicit thread participation, bot-reply detection, and explicit-mention mode. The local policy adds a same-participant rule to limit unsolicited execution in team channels. [Vercel starter implementation](https://github.com/vercel-labs/personal-agent-template/blob/main/agent/channels/slack.ts#L896-L925) · [Community Claude starter](https://github.com/acip/slack-claude-agent/blob/main/README.md#what-it-does) · [OpenClaw Slack thread rules](https://docs.openclaw.ai/channels/slack/threads-and-sessions)

## 需要上层处理

- During integration, the full suite exposed `two coding sources share one discussion while /use stays per user and /to applies once`. The router persisted the chosen alias after `/to`, so the following message used the one-time target. Shared the reproduction and code path with the routing owner.
- The integration snapshot also saved `active` after subsequent mentions, which could undo `mention-only`. It passed a boolean progress field that the Bridge had yet to consume, and returned from controls without acknowledgments. Preserve unset progress for existing per-request opt-in and consult persisted preferences for updates to ongoing turns. These repairs belong to the router and Bridge integration.
- Keep file-bearing requests out of the legacy status, stop and queue command branches. The policy treats them as requests for the attached files even when a raw caption resembles a control. Run the full suite again after integration.

## 验证

- `node --test test/dialog.test.js` → 13 passed, 0 failed. Red run with an inactive stub produced expected assertion mismatches. Chinese punctuation cases also failed before their fix and passed afterward.
- `node --check src/dialog.js` → passed.
- `npm test` → 98 passed, 1 failed in the concurrent route snapshot. The failure is named above. Node emitted the existing experimental SQLite warning.
- External Slack messages posted → none.

## 产物

- [Dialog policy](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/src/dialog.js>)
- [Dialog unit tests](</Users/yuanyunchen/Desktop/AI Programing/Play for Fun/slack-codex-bridge/test/dialog.test.js>)

## 写入 memory

无

## 附件

无
