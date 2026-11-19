---
id: T04.02/S01
status: DONE
---
# 结果 — T04.02/S01 grounding-review

## 结论

已确认根因：owner 新帖的 `threadTs === ts`，`src/catchup.js:67-70` 的前文查询限定 `threadTs=? AND ts<?`，因此新帖的 `priorSlackThread` 必为空；`src/routes.js:394-425` 仍把它交给原 Codex 会话。只要求“使用频道安全事实”的提示没有提供当前频道的方法或问题，原会话可能从私人上下文猜话题或退化成通用操作说明。

最小建议：只在 owner **新帖**且同帖前文为空时，从历史 journal 读取**同一 teamId、channelId 且早于当前 ts**的少量近期公开消息，保留 threadTs、作者、来源 ts，用现有 `contextBudget` 截断，并经 `readContext` 的 `onSource` 加入撤回追踪；owner 同帖回复仍走原查询，成员的项目隔离路径不改。给该输入加一句明确指令：只按所附 Slack 证据总结“当前方法/问题”，若没有足够证据或多个话题无法区分，追问具体话题，不从原 Codex 私人历史补全。无需新表、新索引或服务变更。

## 需要上层处理

1. 新帖 fallback 不能只用 `Store.digest`：`src/store.js:499-535` 每线程每分类只取一条，不能保证包含“方法/问题”的原话。建议直接读 journal 的已验证消息，并在提示中给出来源标识。
2. 补根帖测试：同频道较早、其他帖较早、其他频道、未来消息、已删除或已编辑消息各一例；断言 owner prompt 只包含允许且现存的证据。再补一次“选中的上下文在提交前被编辑/删除”用例，确认现有 `authorize()` 的重新读取与 `exactReplyEvidence` 撤回路径会阻止旧内容公开。当前测试只覆盖同帖和消息同步，未覆盖根帖 fallback。
3. 近期消息若属于多个互不相关话题，不能让模型自行宣布某一个是“现在的方法”。应按提示追问，或只有明确的当前主题证据时才总结；这部分最终回答质量需要人工看一次实际场景。

## 验证

- 静态核对 `src/main.js:53-78`、`src/catchup.js:65-70,229-244`、`src/routes.js:377-425,1203-1319` → 确认 journal 先接收同频道事件、owner 根帖被直达路由处理、根帖前文查询必为空。
- 静态核对 `src/routes.js:395-402,1224-1233` 和 `src/catchup.js:104-168` → 编辑/删除会更新历史，已引用来源有提交前复核及撤回机制；新查询须接入同一机制。
- `node --test test/direct-inbox.test.js test/catchup.test.js` → 16 项通过；这些测试不包含新帖跨帖找话题场景。

## 产物

- 本文件。

## 写入 memory

无。

## 附件

无。
