---
name: parallel-web-search
description: "Web search via parallel-cli that returns RAW page excerpts as JSON (not a synthesized answer). Use when you need source material to read or feed downstream, date/domain-filtered search, or scripted/multi-round retrieval. For a ready-written cited answer with no post-processing, a built-in answer-synthesizing search is simpler."
compatibility: Requires parallel-cli (~/.local/bin/parallel-cli) and internet access.
allowed-tools: Bash(parallel-cli:*)
metadata:
  author: parallel
---

# parallel-web-search — 使用手册

Search the web for: $ARGUMENTS

## 特点（决定何时选它）

返回**网页原始 excerpt（预抽取 markdown）+ url/title/publish_date 的 JSON**——**不是综合答案**，无 `summary`/`answer`。一次调用无论几个 `-q` 都只计 1× sku_search。

- **选它**：要读原文 / 喂下游 LLM 自综合 / 按日期·域名·地区过滤 / 脚本化多轮。
- **别选它**：只想要一段能直接粘的带引用答案——会综合的内置搜索更省事（或用 `parallel-deep-research --text`）。

## 默认命令（改占位符即可跑）

**默认姿势：`-o` 写文件 → 只读 url+title 定该读哪条 → 按需取该条 excerpt。** 整份 JSON 灌进 context 会白费 ~20× token（见下）。

扫一遍、定该读哪几个（最常用）：
```bash
parallel-cli search "<objective>" -q "<kw1>" -q "<kw2>" \
  --mode basic --max-results 10 --excerpt-max-chars-per-result 1000 --json -o "<name>.json"
python3 -c "import json;[print(r['title'],'|',r['url']) for r in json.load(open('<name>.json'))['results']]"
```

变体：要长 excerpt 喂下游 → `--mode advanced --excerpt-max-chars-total <预算,如8000>`；时间敏感 → 加 `--after-date 2026-01-01`；限来源 → 加 `--include-domains a.com,b.com`；多轮深挖 → 每轮带同一 `--session-id <id>`，关键 URL 改用 `parallel-web-extract` 取整页。

## 控 token（默认会撑爆）

`--excerpt-max-chars-total` 默认 **60000**，不设就朝它灌。实测同 query 10 条结果：

| 调法 | ~tokens | 召回 |
|---|---|---|
| 不设 cap | ~6500 | 基准 |
| `--excerpt-max-chars-per-result 1000` | ~2300 | 不变 |
| 只读 url+title | ~300 | 标题即召回信号 |

**省 token 砍每条 excerpt（per-result，min 1000），别砍 `--max-results`**——减条数直接丢命中（10→5 召回腰斩）。小 total cap 还会先压掉结果条数（total 3000 实测只回 3 条），所以要"多条且每条短"用 per-result。

## 参数速查

| 参数 | 作用 |
|---|---|
| `OBJECTIVE`（首位） | 自然语言目标，广/复杂查询主要靠它 |
| `-q TEXT`（可重复） | 关键词子查询；服务端去重，仍计 1× sku_search |
| `--mode basic\|advanced` | 实测仅两档：`basic`=短 excerpt（默认），`advanced`=长 excerpt+更广检索。`fast`/`one-shot` 文档说=basic 但实测不符；`agentic` 已弃用（2026-06），用 `advanced` |
| `--max-results N` | 条数（默认 10）。别为省 token 调小 |
| `--excerpt-max-chars-per-result` / `--excerpt-max-chars-total` | 每条 / 总量 excerpt 上限（见上「控 token」） |
| `--after-date` · `--include-domains` · `--exclude-domains` · `--location` | 时间下限（依赖发布方元数据，常 null）· 限/排除域名 · 地区 ISO 码 |
| `--session-id ID` | 串联多轮 search/extract |
| `-o PATH` / `--json` | 写文件 / JSON |

## 结果与引用

`excerpts[]` 是原始页面 markdown，含导航噪声（菜单/页脚），综合时跳过。**写答案**：论断内联 `[Title](url)`，只用 JSON 里的 URL、绝不编造，结尾附 `Sources:`。**喂下游**：原样传 JSON 不综合。

## Gotchas

- 延迟不稳定（实测 1.6–12s，网络抖动），别拿速度选型。
- 召回与内置搜索不重叠，穷尽场景两个都跑取并集。
- `parallel-cli` not found → 立即停，不要改用内置搜索或凭记忆答，让用户跑 `/parallel-setup`。
