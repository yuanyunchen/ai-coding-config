# FTF Diff 分析编排(总流程)

## 用途

当需要完成一次 FTF diff 归因时读本文件。它定义**分析顺序、证据分层、报告结构**,
是把降噪 / triage / 单条根因 / 代码关联串起来的编排层。

- 领域背景(录制回放、任务形态、术语、证据可见性)见 `domain-model.md`。
- 一次请求该先打开哪个文件,由 `SKILL.md` 的 dispatch 表决定;本文件只负责
  "一次完整归因按什么顺序跑完"。
- 降噪见 `diff-denoise.md`;单条根因见 `flow-diff-root-cause.md`;
  代码关联见 `code-diff-correlation.md`;命令参数见 `diff-query-reference.md`。

## 分析原则

- 先取证再下结论。至少确认任务上下文、diff 类型、base/replay 两边表现,再给根因判断。
- 默认只做只读查询。FTF plan trigger、task retry、task stop 都是写操作,必须等用户
  明确确认后再执行。
- 机器可读结果默认用 `bytedcli --json ftf ...`,并把 `--json` 放在 `ftf` 前面。
- 结论分层表达:已证明事实、基于事实的推断、仍需验证项。
- 不要只凭 `need_confirm_count`、平台标注、单个错误字符串或代码 diff 直接断言根因。
- 不要把 outbound 缺失一律当成业务回归。形态与证据可见性判断见
  `domain-model.md#任务形态判定`、`domain-model.md#采集源与证据可见性边界`。

## 标准流程

先判断任务形态(依据见 `domain-model.md#任务形态判定`),再按下列顺序推进。
四个子分析各引对应 L1,**顺序固定:triage → 降噪 → 单条根因 → 代码关联**。

1. **[准备] 收集上下文**:用 `bytedcli --json ftf task get --task-id <task_id>` 读顶层
   `env`、`psm_replay_param(_detail)` 里的 `replay_env`、`base_replay_env`、
   `commit_hash`/`base_commit_hash`、`code_branch`、`inherited_branches`、`base_task_id`,
   并统计 `replay_method_params.*.mock_enable`;据此判断系统级/沙箱/混合形态并记录依据。
2. **[准备] 跑统一证据包**:`bytedcli --json ftf task evidence get --url "<ftf-task-url>"
   --top-n 10 --sample-size 3`,作为 task meta、汇总统计、top method、top diff 聚类和
   代表样本的共同事实来源。URL 带 `diffReasons` 时 CLI 自动应用筛选,不要再传
   `--annotation-op-type unannotated` 覆盖。
3. **[triage] task 级 triage**(详见 `task-diff-triage.md`):不能只输出任务状态或
   "初步分析";必须进入 diff 聚类内容,覆盖当前轮应分析的聚类 path、代表流量、
   两侧值/差异形态、降噪依据或根因假设。
4. **[triage] 确定分析范围**:按当前 URL / 显式参数圈定主线集合,引用 JSON 的
   `annotationOpTypeSource` 说明筛选来源,再按 method、direction、标注状态拆分。
   默认口径未处理聚类;阈值在单个 method 内计算——待分析聚类 ≤10 全覆盖,>10 当前轮
   详析 Top 10 并摘要剩余。不同 method 可用 subagent 并行,但共用同一份证据包和筛选口径。
5. **[降噪] 降噪检查**(详见 `diff-denoise.md`):对已圈定的 cluster,进入
   根因归类**前的强制前置步骤**。随机值候选用 `ftf diff path-profile get` 看跨流量
   base/replay 分布;数组乱序候选用 `ftf diff array-check get`。高置信降噪项可从主根因
   链路剔除;中置信候选只降权,仍参与后续分析。
6. **[根因] 单条 flow 根因分析**(详见 `flow-diff-root-cause.md`):对代表性 case 拉
   base/replay value、request/response、outbound、similar case、replay logid。
7. **[代码关联] 判断是否需要代码关联**(详见 `code-diff-correlation.md`):字段值变化、
   业务分支错误、过滤/排序/default/IDL/TCC/实验差异通常需查代码;mock 未命中、环境脏
   数据、下游缺失、replay 配置错配可基于任务证据初判。context 未透传、组件不支持、产物
   未启动等只在任务日志明确出现时纳入初判,否则列为外部待验证项。
8. **[输出] 输出分层报告**,并把证据链接到具体 command 输出或日志字段。

## 报告表达规范

术语的用户可读译法见 `domain-model.md#术语与表达规范`;本层只规定报告怎么写:
正文面向业务研发 / 业务测试同学,优先用可读说法,内部字段名只放命令清单、证据附录
或括号说明。

推荐表达:

```text
`/demo/method` 的 `data->items->[*]` 覆盖 75 条流量,累计记录 3348 条 diff 明细。这个明细条数会受数组元素数量影响,只用于说明规模,不代表 3348 个独立问题。可通过具体 diff 链接确认:<diff-link>。
```

避免表达:

```text
similarDiffId=xxx,diffCount=3348、logCount=75。
```

如果查询结果或用户输入中有可打开的 diff / flow 直达链接,在正文附"详情链接";没有
可靠链接不要编造,只提供 task URL、接口、path 和代表 log_id。task 级报告里,diff 聚类
的详情链接优先用"代表流量 flow diff 链接",生成规则见 `diff-query-reference.md` 的
"Flow diff 链接拼接"。

## 报告结构

默认使用以下结构,按证据多少压缩或展开:

```text
结论摘要
- 当前判断:<系统问题 | 环境/平台问题 | 业务变更 | 疑似代码引入 | 证据不足>
- 影响范围:<task/method/cluster/case 数>
- 分析范围:<主线筛选口径、各 method + 方向待分析 diff 聚类数、全量覆盖或 Top 10 截断、剩余未分析数量>
- 优先级:<先看哪些 cluster 或 case>

任务与输入
- task / flow / record / MR / commit
- PSM / method / env / branch / commit / psm_task_id
- 任务形态:<系统级 | 沙箱 | 不确定/混合>,以及顶层 env、replay_env、mock_enable 统计、base/replay commit 获取情况

关键证据
- 任务 / PSM / 接口汇总统计
- 聚类级结论:每个已分析 diff 聚类单独一行,包含接口、方向、path、命中流量数、累计 diff 明细条数、标注状态、代表流量详情链接、降噪判断和当前判断
- FTF diff path、base/replay 值、状态码、错误信息
- request/response、outbound、similar case、logid 日志
- 代码 diff 命中的文件、函数、字段或分支

降噪判断
- 高置信降噪:
- 中置信候选:
- 不应降噪:
- 证据不足/待补充:

根因分析
- 逐条聚类结论之后,再输出任务级归纳;任务级结论不能替代聚类级结论
- 已证明事实
- 基于事实的推断
- 仍需验证项

建议动作
- 是否需要继续查某条 flow
- 是否需要代码确认或修复
- 是否需要平台清理、mock 补齐、重跑、降噪或外部确认
```

## 常见误判

- 把平台已标注噪声当成当前待处理 diff。筛待确认时要排除 `not_mark=true` 或已标注原因的记录。
- 把随机值或 order-only diff 当成业务回归。随机值要同时看跨流量分散和字段语义;数组乱序要基于两侧明细、稳定业务主键和排序语义判断。
- 把 replay 日志中的业务错误直接判为代码问题。需要结合任务结果里的 request/response、mock、下游和本分支代码改动;任务结果没有覆盖的环境前提只能列为待验证。
- 把 task 顶层 `code_branch` 为空当成没有绑定分支。有些任务只在 PSM replay 参数里记录 commit。
- 忽略 FTF 回放流量标识。回放 HTTP header / RPC extra 会带 FTF tag 和 task id,业务代码可能基于这些标识走不同逻辑。
