# FTF TeslaX Plan CRUD

## 用途

`ftf plan create/get/update/delete` 管理 TeslaX FTF 计划。四个命令都走 Tesla-X apix：

| 命令              | 方法     | 路径                                |
| ----------------- | -------- | ----------------------------------- |
| `ftf plan create` | `POST`   | `/apix/space/:spaceId/plan`         |
| `ftf plan get`    | `GET`    | `/apix/space/:spaceId/plan/:planId` |
| `ftf plan update` | `PUT`    | `/apix/space/:spaceId/plan/:planId` |
| `ftf plan delete` | `DELETE` | `/apix/space/:spaceId/plan/:planId` |

鉴权使用 ByteCloud JWT，同时发送 `Authorization` 与 `X-Jwt-Token`。完整字段见 `plan-api-idl.md`。

## 常用命令

```bash
bytedcli --json ftf plan get --space-id 1000 --plan-id 2000

bytedcli ftf plan create \
  --space-id 1000 \
  --plan-name "sample plan" \
  --psm example.psm \
  --replay-env sample_env \
  --idl-version master \
  --payload '{"ftf_plan":{"enabled":true},"psm_exec_params":{"example.psm":{"replay_env":"sample_env"}}}' \
  --execute

bytedcli ftf plan update \
  --space-id 1000 \
  --plan-id 2000 \
  --plan-name "updated sample plan" \
  --payload '{"notify_config_json":{"notify_users":["sample-user"]}}' \
  --execute

bytedcli ftf plan delete --space-id 1000 --plan-id 2000 --execute
```

## 参数规则

- `create` 必填 `--space-id`、`--plan-name`、`--psm`；`--test-scene` 未传时默认写入 `研发自测`。
- `create` 默认写入 `enable_ftf=1`；`--payload` 仍可覆盖该默认值和其它命名 flag。
- `get/update/delete` 必填 `--space-id`、`--plan-id`。
- `create/update/delete` 是外部写操作，必须显式传 `--execute`。
- `create/update` 支持浅字段：`--plan-name`、`--psm`、`--description`、`--test-scene`、`--replay-env`、`--idl-version`、`--case-set-id`、`--parent-plan-id`。
- `--payload '{}'` 用于注入深结构字段，例如 `ftf_plan`、`psm_exec_params`、`notify_config_json`、`advanced_filter_group_list`。
- 命名 flag 与 `--payload` 冲突时，`--payload` 覆盖命名 flag，便于用完整 JSON body 修正默认值或深字段。

## 安全检查

- 删除不可逆，执行 `plan delete` 前先用 `plan get` 确认 `space_id`、`plan_id`、`plan_name` 和绑定 PSM。
- 创建或更新用于代码 diff 的计划前，先确认 PSM、replay env、branch/commit、是否立刻执行外部写入。
- 触发计划生成 task 后，不要只返回创建结果；继续用 `ftf task get --task-id <task_id>` 验证 branch/commit/replay 参数。
