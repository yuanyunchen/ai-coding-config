# FTF OpenAPI 枚举参考

## 用途

本文件沉淀 FTF / TeslaX OpenAPI 常见枚举字段，供 `task-openapi.md`、`plan-api-idl.md` 和 diff 分析文档引用。CLI 对外优先暴露语义值，后端数字值只作为解释 API 响应和 `--payload` 深字段时的参考。

## 任务状态

### `status`

| 值   | 后端常量                    | 含义                     |
| ---- | --------------------------- | ------------------------ |
| `0`  | `TaskStatusInit`            | 任务初始化               |
| `1`  | `TaskStatusRunning`         | 回放中                   |
| `2`  | `TaskStatusReplayDone`      | 回放完成                 |
| `3`  | `TaskStatusAborted`         | 任务失败                 |
| `5`  | `TaskStatusAssertRunning`   | 断言中                   |
| `6`  | `TaskStatusAssertDone`      | 断言完成                 |
| `7`  | `TaskStatusAssertNodata`    | 没有数据，断言未取到数据 |
| `8`  | `TaskStatusAssertTooLarge`  | 数据太多，未进行断言     |
| `10` | `TaskStatusAssertException` | 断言异常                 |
| `11` | `TaskStatusAbandoned`       | 已废弃                   |
| `13` | `TaskStatusRetryRunning`    | 重放中                   |
| `14` | `TaskStatusRetryFail`       | 重放失败                 |
| `15` | `TaskStatusRetryDone`       | 重试完成                 |

### `detail_status`

业务分析通常重点关注 `40`，它表示报告聚合真正结束。

| 值   | 后端常量                                  | 含义                                   |
| ---- | ----------------------------------------- | -------------------------------------- |
| `24` | `TaskDetailStatusReplayDone`              | 回放完成                               |
| `36` | `TaskDetailStatusInAssert`                | 断言中                                 |
| `39` | `TaskDetailStatusDiffAggregateDoneFailed` | 聚合报告失败                           |
| `40` | `TaskDetailStatusDiffAggregateDone`       | 聚合报告生成完成，系统级或沙箱任务结束 |

### 终态判定

| 条件                               | 判定                   |
| ---------------------------------- | ---------------------- |
| `status = 6 && detail_status = 40` | 正常结束               |
| `status = 7`                       | 无流量                 |
| `status ∈ {3, 8, 10, 14}`          | 异常                   |
| `status = 11`                      | 已废弃                 |
| 其它状态                           | 运行中或未到可消费状态 |

## 任务回调状态

第三方回调中的 `process` 字段常见取值：

| 值                        | 含义                   |
| ------------------------- | ---------------------- |
| `process_create`          | 创建任务               |
| `process_retry`           | 重试创建               |
| `process_abort`           | 提前终止               |
| `process_start_replay`    | 启动回放               |
| `process_after_replay`    | 回放结束，尚未断言     |
| `process_start_retry`     | 启动重放               |
| `process_start_rerun`     | 启动重放               |
| `process_after_rerun`     | 重放结束               |
| `process_assert_done`     | 断言结束               |
| `process_no_data`         | 没有数据               |
| `process_aggregate_start` | 开始生成报告           |
| `process_aggregate_done`  | 完成生成报告           |
| `process_done`            | 最终结束状态，可消费   |
| `process_abandoned`       | 废弃任务               |
| `process_mark_done`       | 用户完成全部 diff 确认 |

## 触发与流量来源

### `trigger_type`

| 值  | 含义           | CLI 语义值                |
| --- | -------------- | ------------------------- |
| `0` | 平台手动触发   | `manual`                  |
| `1` | 第三方 OpenAPI | `third-party` / `openapi` |
| `2` | 定时任务       | `schedule` / `cron`       |
| `3` | CI             | `ci`                      |
| `4` | 调试触发       | 暂无专门 CLI 语义值       |
| `5` | 基准任务       | 暂无专门 CLI 语义值       |

### `case_filter_mode`

| 值  | 含义                           |
| --- | ------------------------------ |
| `0` | 实时流量                       |
| `1` | 场景流量                       |
| `2` | 历史流量                       |
| `3` | 手动圈选流量，部分创建接口出现 |
| `4` | 第三方流量                     |
| `6` | 智选流量                       |

### `flow_source`

| 值                           | 含义                 |
| ---------------------------- | -------------------- |
| `sdk`                        | SDK 录制的实时流量   |
| `bytecopy`                   | ByteCopy 录制流量    |
| `thirdparty` / `third_party` | 第三方注入流量       |
| `bits`                       | Bits 平台注入        |
| `debug`                      | 调试来源             |
| `manual` / `case_set`        | 用户手动选择或用例集 |

## 方法与协议

### `interface_type`

| 值  | 含义       | CLI 语义值 |
| --- | ---------- | ---------- |
| `0` | 未声明类型 | `unknown`  |
| `1` | 读接口     | `read`     |
| `2` | 写接口     | `write`    |

### `protocol`

| 值          | 含义                   |
| ----------- | ---------------------- |
| `http`      | HTTP 协议              |
| `thrift`    | Thrift RPC             |
| `mysql`     | MySQL DB 出流量或 Mock |
| `redis`     | Redis 出流量或 Mock    |
| `rocketmq`  | RocketMQ               |
| `tcc`       | TCC 配置外调           |
| `byteconf`  | ByteConf 配置外调      |
| `dolphin`   | Dolphin 相关           |
| `bizmethod` | 业务自定义方法         |

### 接口唯一键

| 协议     | 唯一键规则                                    |
| -------- | --------------------------------------------- |
| `thrift` | `method`                                      |
| `http`   | `method_HTTPMETHOD`，例如 `/api/v1/demo_POST` |
| 其它协议 | `method`                                      |

`method_list` 或深层 `replay_method_list` 中需要稳定标识接口时，优先保持和后端唯一键规则一致。

## 环境与回放

### IDC 字段

| 字段                          | 大小写 | 示例              | 说明               |
| ----------------------------- | ------ | ----------------- | ------------------ |
| `ReplayIDC` / `BaseReplayIDC` | 大写   | `LF`, `HL`, `SG1` | 回放与基准回放机房 |
| `ByteCopyIdc`                 | 小写   | `lf`, `hl`, `sg1` | ByteCopy 采集机房  |

### `host_env`

| 值       | 含义     |
| -------- | -------- |
| `online` | 线上环境 |
| `ppe`    | PPE 环境 |
| `boe`    | BOE 环境 |

### `replay_mode`

| 值  | 含义           |
| --- | -------------- |
| `0` | 普通回放       |
| `1` | Diffy 双跑对比 |

### `limit_mode`

| 值  | 含义         |
| --- | ------------ |
| `0` | PSM 维度限流 |
| `1` | 任务维度限流 |

## Mock 与外调

### `mock_enable`

| 值  | 含义        |
| --- | ----------- |
| `0` | 不开启 Mock |
| `1` | 开启 Mock   |

### `next_decision`

| 值  | 含义                    |
| --- | ----------------------- |
| `0` | Mock 未命中时不直连下游 |
| `1` | Mock 未命中时直连下游   |

### `call_scene`

| 值     | 含义              |
| ------ | ----------------- |
| `diff` | diff 回放对比场景 |
| `case` | 普通用例场景      |

## Assertion 相关

| 字段                                 | 值           | 含义         |
| ------------------------------------ | ------------ | ------------ |
| `type`                               | `inbound`    | 主调断言     |
| `type`                               | `outbound`   | 外调断言     |
| `scope`                              | `base`       | 基准侧       |
| `scope`                              | `replay`     | 回放侧       |
| `scope`                              | `all`        | 全部         |
| `conjunction` / `preRuleConjunction` | `and` / `or` | 规则组合逻辑 |

### Assertion 配置

| 字段                 | 值  | 含义         |
| -------------------- | --- | ------------ |
| `configType`         | `0` | 默认配置     |
| `configType`         | `1` | 强制忽略     |
| `configType`         | `2` | 自定义配置   |
| `needDiff`           | `0` | 不参与 diff  |
| `needDiff`           | `1` | 参与 diff    |
| `ignoreKeyAddOrLost` | `1` | 忽略回放新增 |
| `ignoreKeyAddOrLost` | `2` | 忽略回放缺失 |
| `ignoreKeyAddOrLost` | `3` | 忽略数组新增 |
| `ignoreKeyAddOrLost` | `4` | 忽略数组缺失 |
