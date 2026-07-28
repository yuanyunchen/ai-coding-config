---
name: sql-query
description: "字节内网 SQL 取数统一入口。触发:取数、内网 SQL、Hive、Presto、Aeolus、风神、iDA、queryEditor、跑查询、队列、并行、采样、大批导出。固定优先级:bytedcli CLI → Aeolus 网页 → iDA;纯本地数据分析不使用。"
---

# 内网 SQL 取数

> 固定优先级：**bytedcli CLI → Aeolus 网页 → iDA**。默认从 CLI 开始；只有当前一级明确不可用或缺少所需能力，才降到下一级。禁止因为熟悉旧流程而直接跳到 iDA。

## 0. 场景路由

| 场景 | 首选 | 何时降级 |
|---|---|---|
| 查队列、单次 SQL、分区探针、批量任务、异步长跑、并行分片 | **bytedcli CLI** | CLI 鉴权/接口暂不可用，或页面专属能力尚未暴露 |
| 需要页面保存的 query、可视化调试、手动复用既有文件/任务 | **Aeolus 网页** | 网页/CDN/浏览器链路不可用 |
| 需要 iDA Agent 的表发现、元信息问答或最后兜底 | **iDA** | 无更低层；失败则报告真实阻塞 |

详细执行说明按需一跳读取：

- bytedcli Aeolus 完整指南：`~/.claude/skills/bytedcli/references/subskills/bytedance-aeolus/GUIDE.md`
- bytedcli 通用调用、站点与鉴权：`~/.claude/skills/bytedcli/references/invocation.md`
- iDA 方言、粘贴、超时和采样坑：`references/gotchas.md`
- 多窗口 SQL 生成器：`references/gen_sql_template.py`

## 1. 三种方式比较

| 维度 | bytedcli CLI（默认） | Aeolus 网页（次选） | iDA（最后） |
|---|---|---|---|
| 操作方式 | 结构化命令、JSON 输出 | 浏览器 queryEditor | 浏览器内 SQL Agent |
| SQL 是否原样执行 | 是 | 是 | 可能被模型改写或截断 |
| 长任务 | 支持 taskId、异步轮询 | 支持，关闭页面后继续 | 常受 600s 和会话限制 |
| 并行 | 多进程或 `--no-wait` 多任务 | 多 Query Tab | 多独立 iDA Tab |
| 队列 | 命令列出实时状态后显式选择 | 页面下拉选择 | 经常由 Agent/默认配置决定 |
| 大 IN-list / 大 JOIN / explode | 适合 | 适合 | 易截断、超时或方言失败 |
| 自动化与审计 | 最佳 | 较弱 | 最弱 |
| 适合用途 | 默认覆盖轻查到重查 | 页面专属操作和人工调试 | 表发现、Agent 问答、最终兜底 |

## 2. 第一优先：bytedcli CLI

### 2.1 安装与鉴权

```bash
npm install -g @bytedance-dev/bytedcli@latest --registry https://bnpm.byted.org
bytedcli --version
bytedcli --json auth status
bytedcli auth login
```

稳定环境使用全局 `bytedcli`；只有临时容器或无全局安装权限时才用 npx fallback。`--json` 是全局参数，必须放在 `aeolus` 前。

### 2.2 查询队列并选择

```bash
bytedcli --json aeolus query-editor queues -r sg
```

选择顺序：`is_available=true` → `status=free` → 正式重查优先 `resource_level=guarantee` → 轻探针优先低 `usage`、低 `waiting_jobs`。队列状态实时变化，禁止把某次负载快照写成永久结论；`--idc` 使用返回的 `data_center`。

### 2.3 一次性查询

```bash
bytedcli --json aeolus query-editor query one \
  -r sg \
  --queue root.snake_data_ad \
  --idc SG1 \
  --rows 100 \
  --timeout 600 \
  --sql "SELECT ..."
```

`query one` 自动创建临时文件、提交、等待并返回结果，适合单次探针和少量 SQL。输出保留 `taskId`、`taskUrl` 和结果行，便于复核。

### 2.4 异步提交与状态查询

```bash
bytedcli --json aeolus query-editor query run \
  -r sg --file-id <file_id> --folder-id <folder_id> \
  --queue <queue> --idc <idc> --sql "<SQL>" --no-wait

bytedcli --json aeolus query-editor query status \
  -r sg --task-id <task_id> --file-id <file_id> --folder-id <folder_id>
```

长跑、多日分片和批量任务用 `query run --no-wait`；记录每条任务的日期、SQL 文件、taskId、fileId、folderId。需要日志或取消时按完整指南使用同一 region/engine 查询 `logs` / `cancel`。

### 2.5 并行

- 少量独立查询：并行启动多个 `query one`，每条结果写独立 JSON。
- 正式批量：不同 `file-id` 上执行多个 `query run --no-wait`，再统一轮询。
- 从 3–4 并发开始；队列等待或利用率升高时降并发，不以提交成功代替结果成功。
- 按稳定分区键拆片；同一分片只提交一次，避免重复计算和重复下载。

### 2.6 CLI 降级判定

只有以下证据之一成立才转网页：CLI 明确未覆盖页面能力；CLI API/鉴权持续失败但同账号网页可用；必须人工查看页面保存状态或可视化配置。SQL 自身报错、表权限不足、队列繁忙不等于 CLI 不可用，应先修 SQL、权限或队列。

## 3. 第二优先：Aeolus 网页

1. 用可用浏览器后端打开对应 region 的 queryEditor；不得使用 computer-use 控制浏览器。
2. 数据源通常选 `HIVE(Bytedance)`，Engine 可先用 `Auto`；跨引擎迁移要核对函数。
3. 队列下拉按实时负载选择，不能沿用历史百分比。
4. Run 后记录 taskId/文件页 URL；多个 Query Tab 可并行提交。
5. 禁止 `SELECT *`：列级权限可能使整条查询失败，显式列出所需字段。

网页的优势是可见、易复用已有 query；缺点是自动化、结构化输出和批量审计弱于 CLI。页面失败后才进入 iDA。

## 4. 最后兜底：iDA

- 入口示例：`https://ida-sg.tiktok-row.net/agent/home?agentId=14638&appId=555138`；每个入口先用最小查询确认模型与引擎。
- iDA 适合 Data Catalog/表发现、metainfo、轻量问答；不再承担默认正式取数。
- 输入框遇换行可能提前提交，SQL 折成单行；大 IN-list 分成不超过约 500 ID/批。
- Agent 可能改写 SQL：使用朴素函数，并明确要求原样执行；不能把提示词当作绕过安全分类器的方法。
- travel 入口实测为 Hive/Calcite：JSON 用 `get_json_object`；其他入口可能是 Presto，使用前先判档。
- 600s 超时、大 JOIN、explode、多日窗或批量导出失败时，不继续硬顶，回报“CLI/Aeolus 网页为何不可用 + iDA 失败证据”。

## 5. 三轨共用的数据纪律

1. 先绑分区和 `LIMIT` 做小探针，再扩大日期和结果量。
2. 大基数去重优先近似函数时，必须标明误差口径。
3. 大窗超时可用稳定主键 `mod(id,N)=0` 一致采样；先在同窗跑全量与采样，验证比率一致后才扩展。
4. 取模不是哈希；雪花 `product_id` 低位可能不均匀，绝对数不能机械乘 N。
5. 采样结果标“1/N 取模采样估计”；放大绝对数标估计/上界；失败标真实错误，不编数。
6. 下载结果后保存 SQL、taskId、分区、队列、行数与文件校验信息，确保可复跑。

## 6. 数据问题探测与实例呈现合同

当用户问异常占比、重复现象、同一事件多商品、字段冲突或“随便看一天”时，查询成功不等于交付完成。默认按业务读法组织结果：

1. 先给一句结论，再写清对象、时间窗、分母、分子以及全量/采样口径；“冲突组占比”“受影响记录占比”“删除比例”不得混用。
2. 类型拆分必须互斥且合计 100%，每类同时给组数、占比和一句业务含义；交叉维度不能伪装成互斥分类。
3. 每个互斥类型至少查询一个对应的真实业务实例，禁止用一个例子代表全部类型。只要源表或维表支持，就补齐商品、酒店、航线或活动名称，以及品牌、城市、地址、事件时间和事件类型；ID 仅用于追溯，不能成为实例主体。
4. 对每个实例明确回答“是否同一对象、为什么”。字段显示“商品不同”或“页面不同”时，必须继续核对名称、地址和垂类，区分真实不同实体与同一实体的多语言页面、URL版本或 Catalog 映射；不能从字段组合直接跳到实体结论。
5. 字段必须翻译成业务对象。例如 `outer_id` 写成“外部商品 ID”，`pixel_page_url` 写成“实际页面 URL”；禁止用“页面上下文”等无法判断对象的模糊替代。
6. 默认交付顺序为“结论/KPI → 互斥类型表或图 → 真实实例卡片 → 查询链接与技术附录”。不要把原始 JSON、长 SQL 或一堆内部字段直接当答案。
7. 名称、地址等业务字段缺失时，先关联 Catalog 或维表；确实没有来源时明确写“源数据未提供”，不得猜测。未经用户授权，不因探测结果自动过滤、去重或改表。
8. 探针、实例回查和飞书落地保持 CLI 优先：SQL 使用 bytedcli，飞书文档使用 lark-cli；只有 CLI 存在可验证阻塞时才降级。

## 7. 完成标准

- 查询路径符合固定优先级，任何降级都有明确证据。
- SQL、region、engine、queue、分区和 taskId 可追溯。
- 结果行数与输出文件相符；并行分片无缺失、无重复。
- 采样、近似、超时和权限边界均在交付中显式标注。
- 数据问题探测已给出可读业务实例、明确的相同/不同判断和可核对的比例口径，而非仅返回技术字段。
