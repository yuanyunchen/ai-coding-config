---
name: parallel-deep-research
description: "Deep research via parallel-cli: a slow (6-25 min), expensive (10-100x web-search) async agent that returns a per-claim-cited markdown report. Use ONLY when the user asks for a 'report', 'exhaustive/comprehensive/thorough investigation', or needs auditable cited research. For normal lookups use parallel-web-search."
compatibility: Requires parallel-cli (~/.local/bin/parallel-cli) and internet access.
allowed-tools: Bash(parallel-cli:*)
metadata:
  author: parallel
---

# parallel-deep-research — 使用手册

Research topic: $ARGUMENTS

## 特点（决定何时选它）

服务端跑一个**多源研究 agent**（非搜索）。**默认一律加 `--text`**：产出**带内联引用的 markdown 报告**（实测 ~5–7 KB / ~1.5–2K token），**完成后只读这份 `.md`**——省 token，无需碰任何 JSON。慢（pro-fast ~6min，ultra-fast ~18min，ultra 最长 25min）、贵（≈10–100× web-search）、**必须异步**。

- **选它**：要"一篇报告"、要 exhaustive/comprehensive/thorough、要**带内联引用的可审计研究**、或要捕捉争议/突发/反面证据。
- **别选它**：普通查找、要原始 excerpt 喂下游、要脚本化多轮——用 **`parallel-web-search`**（快、便宜、有 `--after-date`/域名过滤）。

## 默认命令（改占位符即可跑）

**一律 `--text` + `--no-wait`：拿到 `run_id` 立刻返回 → 告知用户预计耗时和监控 URL，可后台 poll → 再 `poll` 落盘 → 只读 `.md`。** 省略 `--no-wait` 会阻塞数分钟并超时。

```bash
parallel-cli research run "$ARGUMENTS" --processor pro-fast --text --no-wait --json
# 解析输出拿到 RUN_ID 与监控 URL，告知用户后：
parallel-cli research poll "$RUN_ID" -o "<name>" --timeout 540
# → <name>.md（直接读这份）+ <name>.json（元数据，忽略）；stdout 还会打印 executive summary
```

完成后**只读 `<name>.md`**，不要加 `--json`、不要读 `.json`（那是元数据，不是报告）。

变体：控篇幅/聚焦 → `--text-description "Keep under 1000 words, focus on X"`；接着上一轮深挖 → `--previous-interaction-id <trun_id>`；从文件读长 query → `-f question.txt`。

> 极少数要喂下游/做索引·diff 时才去掉 `--text`：默认是 auto 结构化 schema，产出 `<name>.json`（`output.content{}` + 每条论断 `output.basis[]` 证据账本，89–564 KB），**此时不生成 `.md`**，用 `jq` 按需抽、绝不整份进 context。

## 选 tier（先 pro-fast，按触发条件升级）

| Processor | 实测耗时 | 何时用 |
|---|---|---|
| `pro-fast`（默认） | ~6 min | 定义清晰的主题、要结构化报告。性价比基准 |
| `ultra-fast` | ~18 min（≈2× 成本） | **触发升级**：突发/24h 内新闻、需要争议与反面证据、企业/合规深度、竞争性数据对比、用户明说 exhaustive。实测它独家命中了 pro-fast 漏掉的当天发布 |
| `ultra` | 最长 ~25 min（≈3× 成本） | 仅用户**显式要求**最大深度时 |

实测差异：同一 query 下 ultra-fast 比 pro-fast 多抓到当天的新发布、相关争议、企业合规框架和前瞻性分析（pro-fast 这些都缺）。代价是 ~3× 墙钟、~2× 费用——只在上述维度真重要时付。

## Gotchas

- **540s 超时要重 poll**：ultra-fast 在开放式 query 上几乎必然撞 540s 工具上限。重试的是**同一条 `poll $RUN_ID`**，不是重跑 `run`（重跑 = 又一次计费任务）。
- **别漏 `--text`**：不加它默认就是结构化 JSON、**不生成 `.md`**，且 89–564 KB 整份进 context 会撑爆。本 skill 默认场景一律加 `--text`，完成后只读 `.md`。
- **监控 URL 只用于看进度**，完成后结果在文件里，别再把它当报告链接发给用户。
- 完成后**不要主动把文件内容读进 context**，除非用户要细看。
- `parallel-cli` not found → 立即停，不要改用内置搜索或凭记忆答，让用户跑 `/parallel-setup`。
