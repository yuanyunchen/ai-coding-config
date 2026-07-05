---
name: ida-presto-query
description: "在字节内网用 SQL 取数 —— 通过 Chrome 插件驱动 iDA(内部 SQL 智能体,引擎 = Presto)跑查询、下 CSV。涵盖:粘贴法(单行 pbcopy+cmd+v,换行会提前提交)、iDA 的 GPT-5.5 会改崩 exotic 函数(只用朴素 SQL)、大数据超时破法(1/N 取模采样 + 同窗全量↔采样校验)、Presto 方言(approx_count_distinct/max_by/窗口子查询)、多 tab 并行、窗口嵌套 SQL 模板。触发词:iDA、取数、内网 SQL、Presto、跑查询、ad_algo、超时采样、SQL agent。Run SQL on the internal iDA agent via the Chrome plugin (Presto engine)."
---

# iDA / Presto 取数(内网 SQL 全流程)

**一句话**:内网取数走 **iDA**(Chrome 插件驱动,**引擎按 agent 不同——多为 Presto,travel agent[appId 555138]实测是 Hive/Calcite,JSON 要 `get_json_object`;用前先验,详见 `references/gotchas.md` §F/I/J**),SQL **单行粘贴**、明令「原样执行勿改函数」、大窗超时用**取模采样 + 同窗校验**破,大结果下 CSV。

## 何时用本 skill
要在字节内网底表上跑 SQL 取数 / 出聚合 / 拉明细。底表如 `ad_algo.vertical_all_scenario_intent`。不涉及内网取数(纯本地 CSV 分析、写报告)不用本 skill。

---

## 1. 平台与启动(Chrome 插件,绝不用 computer-use)

- 平台 = **iDA**(内部 SQL 智能体)。Chrome 打开 `https://ida-sg.tiktok-row.net/agent/home?agentId=14638&appId=555138`。
- **一切浏览器操作走 claude-in-chrome MCP(`mcp__claude-in-chrome__*`),绝不用 computer-use**(全局规则「浏览器走 Chrome 插件」;computer-use 对浏览器只读、授权弹窗会挂约 5 分钟)。插件没连上 → 停下说明,不退回电脑控制。
- 进 agent 后**模型选 GPT-5.5**(每个新标签页/新会话默认模型都要手动重选 GPT-5.5)。
- iDA 在**公共 Presto 队列**跑,返回**结果表 + CSV 下载链接**。
- **风神(Aeolus)SQL 编辑器路径不用**:队列 `root.snake_aeolus` 常 99%+ 拥挤,且 Monaco 编辑器输入易出错;iDA 队列更空更稳。
- **Chrome 窗口 0x0 时不依赖截图**:窗口被最小化 → viewport 0x0 → 截图报错/黑屏,且 iDA 等 SPA 结果网格不渲染、读不到结果。解法 = **网络直读 iDA SSE**:`read_network_requests`(urlPattern=stream)拿 taskId → 页面内 `fetch('/dataAgent/llm/api/v2/deepresearch/stream?sessionId=&taskId=',{credentials:'include'})` 取响应体、正则解析 markdown 表格行拿查询结果(2026-06-25 实战,来源项目记忆 search-query-city-recall-debug)。

## 2. 粘贴法(关键:单行,换行会提前提交)

iDA 输入框**遇到换行就逐行提交**,所以 SQL 必须折成**单行无换行**:

```bash
cat paste_X.txt | pbcopy           # 文件内容是单行 SQL(或带【1】【2】分隔的多条)
```
然后用 Chrome 插件:点输入框 → `cmd+v` 粘贴 → 点发送。

- **多条 query 一条消息发**:用 `【1】… 【2】…` 或 `Q1: … Q2: …` 分隔,并在消息开头写明「逐条执行、各自给结果表」。
- **中文会粘贴乱码**,但 **ASCII 的 SQL + 文件名完好**,iDA 照常执行 —— 所以 paste 文件保持 ASCII,把中文说明留给消息正文里(或干脆英文)。
- 模板见 `references/gen_sql_template.py`:窗口嵌套生成器,产出 `paste_*.txt`(单行,供 pbcopy)。

## 3. iDA 的 GPT-5.5 会「好心」改崩 SQL —— 只用朴素 SQL

iDA 不是直跑你的 SQL,而是**经 GPT-5.5 改写后**再跑。它会把 exotic 表达式重写成非法形式:

- 给 `from_big_endian_64(xxhash64(...))` 这类哈希采样 → 它反复重写成非法的 `abs(varbinary)`,跑不通。
- **解法**:① 用**最朴素的 SQL**;② 采样直接用 `mod(user_id, N) = 0`(`user_id` 是 bigint,取模天然合法、无需哈希函数);③ 在消息里**明令**:`Run EXACTLY as written, do NOT modify or rewrite any function or expression`。

## 4. 破超时:1/N 取模采样 + 双重校验(最该固化的方法论)

大窗(几十亿~几千亿行)的用户级全量 group-by 会超 iDA **1200s** 上限(co-presence 类查询尤甚:需把全部行按 user 聚合)。实测 pixel 行数 3天 19.5B、1周 45.8B、1月 206.8B。

**破法 = 一致取模采样**把聚合基数压到 1/N:

```sql
... AND mod(user_id, 10) = 0   -- 1/10 一致采样;同一口径贯穿所有子查询,比率无偏
```

**两条纪律(信任采样前必须做):**

1. **同窗全量↔采样交叉校验是最硬证据**(强过跨窗)。在一个**有全量结果**的窗上,既跑全量也跑采样,比对**比率/占比**应一致 —— 本项目 2 周 net-new 采样 86.0% vs 全量 86.1%、both×10 ≈ 18.1M vs 全量 17.5M。
2. **取模 ≠ 哈希**:`mod(user_id,N)` 假设 user_id 低位无业务结构(近似均匀),措辞别夸大成「哈希均匀」—— 本项目对抗审查正好抓到这个误称。另:**只报比率/占比**(采样无偏);**绝对数是 ×N 上界**,放大偏差略大,不进 headline。

跨窗校验作为辅证:3天/1周采样比值 12.41×/10.11× vs 全量 12.6×/10.2×(误差 <1.5%)。

**超时但不可采样的情形**:co-presence 分母需「全部 pixel 用户」按 user 聚合,不可预过滤——只能采样,或换**单扫描等价重写**(把多次扫描合并成一次)。真跑不出就**诚实标注「超时未取」**,不编数。

## 5. Presto 方言(引擎是 Presto,不是 Spark)

可用:`approx_count_distinct`(基数估计,误差 <2%,大结果首选)、`PERCENTILE_APPROX`/`approx_percentile`、`max_by(value, key)`、`IF`、`COUNT(DISTINCT)`、`FULL OUTER JOIN`、`ROW_NUMBER() OVER (PARTITION BY …)`、`power()`、`USING`、标量子查询。

陷阱:
- **`struct(c, city).field` 不可用** → 用 `max_by(value, key)` 取「按某 key 排序的对应 value」(如「出现最多的主城」)。
- **window + GROUP/HAVING 混写易报错** → 拆成「**窗口子查询 c2 → 外层再 GROUP BY**」两层。

## 6. CSV 下载与多 tab 并行

- **大结果必下 CSV**(明细 / 多行分布 / 热力图 pair):点结果区「下载: 文件名.csv」链接或文件 chip → 落 `~/Downloads/` → `mv` 到项目 `data/csv_*/` 并改 canonical 名。单行结果直接读屏记数。
- **Chrome 单会话不可并行**:并行靠**开多个 iDA 标签页**(各一独立 session、各跑一批),云端并发跑。本项目用过 3 个 tab。**每个新 tab 默认模型要重选 GPT-5.5**。

## 7. 标准流程

1. 写 SQL 生成器(`references/gen_sql_template.py` 改底表/窗口/字段)→ 产 `queries_*.sql`(可读)+ `paste_*.txt`(单行)。
2. `cat paste_X.txt | pbcopy` → Chrome 插件粘贴进 iDA(GPT-5.5)→ 发送,消息里写「逐条执行、原样勿改、各自结果表 / Q4 导 CSV」。
3. 大窗超时 → 改采样版(`mod(user_id,N)=0`),先在有全量的小窗校验比率无偏。
4. 下 CSV → `mv` 归位 → 本地分析。
5. 结果显式标口径:**采样的标「1/N 取模采样估计」,超时的标「超时未取」**。

## references
- `references/gen_sql_template.py` — 通用窗口嵌套 SQL 生成器:多窗口只换日期(算子一致→趋势可比)、采样开关(`mod(user_id,N)=0`)、单扫描分组、产 `queries_*.sql` + 单行 `paste_*.txt`。改 `TBL` / `WINDOWS` / `Q()` 即复用。
- `references/gotchas.md` — 踩坑速查:函数被改崩、换行提前提交、超时阈值与采样校验、Presto 方言陷阱、CSV/多 tab、中文乱码。
