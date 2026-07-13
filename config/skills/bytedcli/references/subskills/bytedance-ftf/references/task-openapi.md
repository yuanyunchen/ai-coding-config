# FTF Task OpenAPI 参考

## 用途

本文件整理 FTF task、report、flow 相关 OpenAPI 口径，帮助解释 `bytedcli ftf task/report/flow/plan execute` 的请求字段、响应字段和枚举含义。枚举值见 `enums.md`。

Base URL 为 FTF OpenAPI host 下的 `/openapi`，鉴权使用 `X-Jwt-Token`。当前 bytedcli 已封装的接口优先使用 CLI 命令，不建议手写 HTTP 请求。

## CLI 到接口映射

| CLI 命令                 | OpenAPI                                                 | 状态                         |
| ------------------------ | ------------------------------------------------------- | ---------------------------- |
| `ftf plan execute`       | `POST /openapi/test_plan/trigger/task`                  | 已封装，写操作需 `--execute` |
| `ftf task stop`          | `POST /stop/task`                                       | 已封装，写操作需 `--execute` |
| `ftf task list`          | `GET /task/list/by_page`                                | 已封装                       |
| `ftf task get --task-id` | `GET /query/task`                                       | 已封装                       |
| `ftf report method`      | `POST /openapi/assertion/aggregate/report/method`       | 已封装                       |
| `ftf flow list`          | `POST /openapi/assertion/aggregate/flow/list`           | 已封装                       |
| `ftf flow get`           | `POST /openapi/assertion/aggregate/flow/get`            | 已封装                       |
| `ftf task retry`         | `POST /openapi/task/retry`                              | 已封装，写操作需 `--execute` |
| 无稳定 CLI               | `POST /create/task`                                     | 后端参考，暂未封装           |
| 无稳定 CLI               | `POST /test_plan/check/neptune_permission_detail`       | 后端参考，暂未封装           |
| 无稳定 CLI               | `GET /openapi/assertion/aggregate/flow/get_mock_result` | 后端参考，暂未封装           |

`POST /create/task/with_plan` 已废弃，使用 `POST /openapi/test_plan/trigger/task`。

## 触发计划任务

`ftf plan execute` 使用该接口基于 TeslaX parent plan 触发 FTF task。

- Method / Path：`POST /openapi/test_plan/trigger/task`
- CLI：`bytedcli ftf plan execute --plan-id 2000 --psm example.psm --replay-env sample_env --execute`

### 请求 Body

| 字段                         | 必填 | 说明                                                                |
| ---------------------------- | ---- | ------------------------------------------------------------------- |
| `parent_plan_id`             | 是   | TeslaX 测试计划 ID                                                  |
| `trigger_user`               | 是   | 触发人；CLI 可从 bytedcli 登录用户推断，也可显式传 `--trigger-user` |
| `trigger_type`               | 是   | 触发类型，见 `enums.md#trigger_type`                                |
| `method_replay_count`        | 否   | 覆盖计划内单接口回放条数                                            |
| `single_scene_replay_count`  | 否   | 覆盖计划内单场景回放条数                                            |
| `task_run_time`              | 否   | 覆盖计划内任务运行时长                                              |
| `is_open_advanced_filter`    | 否   | 是否覆盖计划内高级筛选开关                                          |
| `advanced_filter_group_list` | 否   | 高级筛选组                                                          |
| `psm_trigger_params`         | 否   | `map[string]PSMTriggerParam`，按 PSM 覆盖计划内回放参数             |
| `status_callback_switch`     | 否   | 特殊语义：`0` 开启，`1` 不开启                                      |
| `pipeline_info`              | 否   | 关联流水线或代码变更                                                |
| `inherited_branches`         | 否   | 需要同时提供 `pipeline_info.code_branch` 才生效                     |
| `extra_params`               | 否   | 业务透传字符串，建议 JSON 字符串                                    |

`psm_trigger_params.<psm>` 常见字段：

```text
replay_psm / replay_env / replay_cluster / replay_idc / replay_host / replay_hosts /
idl_version / base_replay_psm / base_replay_env / base_replay_cluster /
base_replay_idc / base_replay_host / base_replay_hosts / base_idl_version /
bytecopy_psm / bytecopy_stage / bytecopy_cluster / bytecopy_idc / instance_num /
replay_qps_limit / assert_scene / run_timeout / method_list / replay_method_list
```

`replay_method_list.<key>` 常见字段：

```text
method / http_method / protocol / mock_enable / mock_id / next_decision /
is_open_edit / inbound_before_script / inbound_after_script
```

### 响应

```json
{ "code": 0, "data": 833688, "log_id": "...", "msg": "OK" }
```

`data` 是创建出的 FTF task id。触发后应继续执行 `ftf task get --task-id <task_id>` 验证 branch、commit、replay 参数和任务状态。

## 停止任务

- Method / Path：`POST /stop/task`
- CLI：`bytedcli ftf task stop --task-id 1234567 --execute`

### Query

| 参数         | 必填 | 说明                                             |
| ------------ | ---- | ------------------------------------------------ |
| `taskId`     | 是   | 任务 ID                                          |
| `stopSource` | 否   | 调用方标识                                       |
| `callStatus` | 否   | `0` 正常停止，会执行断言；`1` 异常停止，跳过断言 |

CLI 对外暴露 `--call-status assert|abort`，不要直接传后端数字。

## 查询任务列表

- Method / Path：`GET /task/list/by_page`
- CLI：`bytedcli ftf task list --page 1 --page-size 20 --psm example.psm`

### Query

| 参数             | 必填 | 说明                                 |
| ---------------- | ---- | ------------------------------------ |
| `page`           | 是   | 分页页码，CLI 默认 `1`               |
| `page_size`      | 是   | 分页大小，CLI 默认 `20`              |
| `space_id`       | 否   | TeslaX 空间 ID                       |
| `parent_plan_id` | 否   | TeslaX parent plan id                |
| `psm`            | 否   | PSM                                  |
| `trigger_type`   | 否   | 触发类型，见 `enums.md#trigger_type` |
| `status`         | 否   | 任务状态，见 `enums.md#status`       |
| `filter_time`    | 否   | 最近 N 天                            |

CLI 对外使用语义值，例如 `--trigger-type manual`、`--status running`，handler 会映射到后端数字。

## 获取任务基本信息

- Method / Path：`GET /query/task`
- CLI：`bytedcli ftf task get --task-id 1234567`
- Query：`taskId=<task_id>`

### 响应关键字段

| 字段                                                                                     | 说明                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| `id`                                                                                     | 任务 ID                                  |
| `test_plan_id` / `parent_plan_id`                                                        | 关联测试计划 ID                          |
| `space_id`                                                                               | TeslaX 空间                              |
| `trigger_type`                                                                           | 触发类型                                 |
| `status` / `detail_status`                                                               | 任务状态和详细状态，见 `enums.md`        |
| `task_run_time`                                                                          | 运行时长                                 |
| `case_filter_mode`                                                                       | 流量来源，见 `enums.md#case_filter_mode` |
| `run_psm`                                                                                | 主 PSM                                   |
| `single_scene_replay_count`                                                              | 单场景回放条数                           |
| `status_callback_switch`                                                                 | 回调开关                                 |
| `case_count` / `diff_case_count` / `need_confirm_case_count` / `fail_case_count`         | 用例数、diff 数、待确认数、失败数        |
| `create_time` / `update_time` / `finish_time`                                            | 时间                                     |
| `nario_task_id` / `scene_coverage_detail` / `scene_coverage`                             | 场景覆盖度                               |
| `code_coverage` / `code_coverage_url` / `code_coverage_detail`                           | 代码覆盖度                               |
| `psm_replay_param_detail`                                                                | PSM 级回放参数详情，含 method 参数       |
| `task_duration`                                                                          | 任务耗时，通常为分钟                     |
| `task_flow_count`                                                                        | 流量条数                                 |
| `demand_items`                                                                           | 关联需求                                 |
| `parent_plan_name`                                                                       | 测试计划名                               |
| `is_open_advanced_filter` / `advanced_filter_group_brief` / `advanced_filter_group_list` | 高级筛选                                 |
| `inherited_branches`                                                                     | 继承分支                                 |
| `enable_base_compare` / `base_task_id`                                                   | 基准任务对比                             |

分析任务是否可消费时，优先结合 `status` 和 `detail_status` 的终态判定。

## 获取 Method 报告

- Method / Path：`POST /openapi/assertion/aggregate/report/method`
- CLI：`bytedcli ftf report method --task-id 1234567 --psm example.psm --method GetDemo`

### Body

```json
{
  "task_id": 1234567,
  "psm": "example.psm",
  "method": "GetDemo"
}
```

### 响应关键字段

| 字段                           | 说明                                 |
| ------------------------------ | ------------------------------------ |
| `protocol`                     | 协议                                 |
| `method` / `http_method`       | 接口                                 |
| `total`                        | 总流量数                             |
| `diff_count`                   | diff 数                              |
| `confirm_count`                | 已确认数                             |
| `replay_failed_reason`         | 回放失败原因，可能为 null            |
| `is_diff_covered`              | diff 是否已覆盖                      |
| `diff_reason`                  | `map[reason_code]count`              |
| `replay_status_failed_count`   | 回放失败数                           |
| `diff_reason_aggregate_result` | 按噪音模板聚合的 diff 分布           |
| `diffs`                        | `map[pid]DiffDetail`，键不要长期依赖 |

该接口返回某个 method 的聚合结果，全部接口逐个聚合可能较重。分析 task diff 时优先使用 `task evidence get` 或 `task analyze`，需要下钻单 method 时再查该接口。

## 获取 Flow 列表

- Method / Path：`POST /openapi/assertion/aggregate/flow/list`
- CLI：`bytedcli ftf flow list --task-id 1234567 --psm example.psm --method GetDemo --page 1 --page-size 20`

### Body

| 字段        | 必填 | 说明                    |
| ----------- | ---- | ----------------------- |
| `task_id`   | 是   | 任务 ID                 |
| `psm`       | 是   | PSM                     |
| `method`    | 是   | method                  |
| `page`      | 是   | 页码，实际按 `>=1` 使用 |
| `page_size` | 是   | 分页大小，建议 `1-100`  |

### 响应关键字段

```json
{
  "code": 0,
  "data": {
    "total": 128,
    "flows": [
      {
        "pid": "sample-pid",
        "log_id": "sample-logid",
        "logid_benchmark": "sample-base-logid",
        "logid_comparison": "sample-replay-logid"
      }
    ]
  },
  "log_id": "...",
  "message": ""
}
```

## 获取 Flow 详情

- Method / Path：`POST /openapi/assertion/aggregate/flow/get`
- CLI：`bytedcli ftf flow get --task-id 1234567 --pid sample-pid`

### Body

| 字段      | 必填 | 说明     |
| --------- | ---- | -------- |
| `task_id` | 是   | 任务 ID  |
| `pid`     | 是   | 流量 pid |

### 响应关键字段

`data.diff` 概要字段：

```text
task_id / pid / flow_id / log_id / logid_benchmark / logid_comparison /
psm / http_method / method / protocol / create_time / update_time /
flow_source / replay_status_code / replay_time / replay_time_cost /
base_status_code / base_replay_time / base_replay_time_cost /
success / outbound_success
```

`data.diff_expand` 详情字段：

| 字段                                                            | 说明     |
| --------------------------------------------------------------- | -------- |
| `ori_req` / `ori_resp` / `ori_outbound` / `ori_status_code`     | 原始流量 |
| `base_req` / `base_resp` / `base_outbound` / `base_status_code` | 基准环境 |
| `new_req` / `new_resp` / `new_outbound` / `new_status_code`     | 回放环境 |

`diff.success == 1 && diff.outbound_success == 1` 通常表示该流量断言成功；`0` 表示存在 diff。

## 重放 Diff 流量

- Method / Path：`POST /openapi/task/retry`
- CLI：`bytedcli ftf task retry --task-id 1234567 --psm example.psm --method-list GetDemo --retry-mode method --execute`

### Body

| 字段          | 必填 | 说明                          |
| ------------- | ---- | ----------------------------- |
| `task_id`     | 是   | 重放任务 ID                   |
| `psm`         | 是   | PSM                           |
| `retry_mode`  | 是   | `1` PSM 维度，`2` method 维度 |
| `method_list` | 是   | 待重放接口列表                |

CLI 对外暴露 `--retry-mode psm|method`，不要直接传后端数字。

## 后端参考：独立创建任务

`POST /create/task` 可独立触发回放任务，不关联 TeslaX 测试计划。当前 bytedcli 尚未提供稳定命令；需要创建代码 diff 任务时优先使用 `ftf plan execute`。

关键 body 字段：

| 字段                             | 必填 | 说明                                     |
| -------------------------------- | ---- | ---------------------------------------- |
| `CreateUser`                     | 是   | 用户名                                   |
| `SpaceID`                        | 是   | TeslaX 空间 ID                           |
| `Env`                            | 是   | 系统级通常为 `online`，沙箱通常为 `boe`  |
| `CaseFilterMode`                 | 是   | 流量来源，见 `enums.md#case_filter_mode` |
| `TaskRunTime`                    | 是   | 任务执行时长，单位分钟                   |
| `TaskNoFlowAbortDuration`        | 是   | 无流量停止时间，单位秒                   |
| `ReplayMode`                     | 否   | `0` 普通回放，`1` Diffy                  |
| `SingleSceneReplayCount`         | 是   | 单场景回放条数，仅场景流量生效           |
| `MethodReplayCount`              | 是   | 单接口回放条数，非场景流量生效           |
| `StatusCallbackSwitch`           | 否   | 任务回调开关                             |
| `PipelineInfo`                   | 否   | 关联流水线或代码变更                     |
| `PSMTriggerParams`               | 是   | `map[psm]PSMRunParam`                    |
| `InheritedBranches`              | 否   | 需同时传 `pipeline_info.code_branch`     |
| `IsOpenAdvancedFilter`           | 否   | 是否开启高级筛选                         |
| `AdvancedFilterGroupList`        | 否   | 高级筛选组                               |
| `ExtraParams`                    | 否   | 业务透传 JSON 字符串                     |
| `notify_groups` / `notify_users` | 否   | 固定通知群或通知人                       |

`PSMRunParam` 常见字段：

```text
ReplayQpsLimit / LimitMode / AssertScene / IDLVersion /
ReplayEnv / ReplayCluster / ReplayIDC / ReplayHost / ReplayHosts / ReplayPSM /
BaseIDLVersion / BaseReplayEnv / BaseReplayCluster / BaseReplayIDC /
BaseReplayHost / BaseReplayHosts / BaseReplayPSM /
ByteCopyPsm / ByteCopyStage / ByteCopyCluster / ByteCopyIdc /
RetryMax / RunTimeout / TaskNoFlowAbortDuration /
ReplayMethodParams / LinkRecordEntrance / LinkRecordDownstream / ReplayDownstream
```

`ReplayMethodParam` 常见字段：

```text
Method / HttpMethod / Protocol / FlowTotal /
MockEnable / MockID / NextDecision /
IsOpenEdit / InboundBeforeScript / InboundAfterScript
```

## 高级筛选组

`AdvancedFilterGroup` 表示一组独立筛选条件，字段一般是 `{ "op": "...", "value": ... }`：

| 字段                         | 说明                                                |
| ---------------------------- | --------------------------------------------------- |
| `teslax_space_id`            | TeslaX 空间，例如 `{"op":"eq","value":1000}`        |
| `psm`                        | PSM，例如 `{"op":"eq","value":"example.psm"}`       |
| `method`                     | method 列表，例如 `{"op":"in","value":["GetDemo"]}` |
| `scene_meta`                 | 模板 ID                                             |
| `psm_scene`                  | 场景 ID 列表                                        |
| `caseset`                    | 用例集                                              |
| `record_env`                 | 录制泳道，例如 `prod`                               |
| `record_idc`                 | 录制机房，例如 `lf`                                 |
| `record_cluster`             | 录制集群                                            |
| `record_time`                | 录制时间范围                                        |
| `flow_source`                | 流量来源，例如 `sdk`、`bytecopy`                    |
| `pid`                        | 具体 pid 列表                                       |
| `case_total_replay_limit`    | 本组用例回放整体上限                                |
| `single_method_replay_limit` | 单 method 上限，需要选择 method                     |
| `single_scene_replay_limit`  | 单场景上限，需要选择模板或场景                      |

常见 `op` 包括 `eq`、`in`、`between`。同一个筛选组内多条件共同约束；多个筛选组之间按平台规则组合。

## 后端参考：Neptune ACL 检查

- Method / Path：`POST /test_plan/check/neptune_permission_detail`
- 当前 bytedcli 尚未封装。

用途：线上服务可能存在严格授权，回放前若未申请 ACL 权限可能出现未授权错误。该接口用于判断待回放接口是否需要申请 ACL。

Body：

| 字段          | 必填 | 说明           |
| ------------- | ---- | -------------- |
| `psm`         | 是   | 回放 PSM       |
| `method_list` | 是   | 待回放接口列表 |
| `cluster`     | 否   | 指定回放集群   |

Response 关键字段：

| 字段                 | 说明          |
| -------------------- | ------------- |
| `is_all_pass`        | 是否全部通过  |
| `not_access_methods` | 未授权 method |
| `access_methods`     | 已授权 method |
| `apply_acl_url`      | ACL 申请地址  |

## 后端参考：外调 Mock Result

- Method / Path：`GET /openapi/assertion/aggregate/flow/get_mock_result`
- 当前 bytedcli 尚未封装。

用途：查看指定序号的 outbound 返回结果。接口文档对 Body / Query 标注不完全一致，封装前需要以实际请求行为为准。

参数：

| 字段               | 必填 | 说明                               |
| ------------------ | ---- | ---------------------------------- |
| `task_id`          | 是   | 任务 ID                            |
| `psm`              | 是   | PSM                                |
| `log_id`           | 是   | 流量 log id                        |
| `outbound_index`   | 是   | 目标 outbound 序号                 |
| `trigger_platform` | 否   | 触发平台                           |
| `not_masked`       | 否   | 是否对返回结果加密，`1` 表示不加密 |
