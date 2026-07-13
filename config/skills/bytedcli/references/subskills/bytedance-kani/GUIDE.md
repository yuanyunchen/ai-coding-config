---
name: bytedance-kani
description: "Skill for Kani 权限审批、知识库检索、Kani Console 办公网只读查询与 Kani OpenAPI 查询。Use when tasks mention Kani、Protego、kani_* namespace、权限申请/审批、创建Kani权限申请工单、Kani知识库、work order、approval list、kani knowledge search、kani role/group/resource、kani openapi."
---

# Kani 权限审批

## 如何调用

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- 需要查询/跟踪 Kani 权限审批工单（我发起的/待我审批的/已完成的）
- 需要按状态、审批角色（applicant/reviewer）、是否加急等维度筛选
- 需要创建Kani权限申请工单
- 需要通过 `kani protego apply` 快速创建 Protego 资源权限申请 workflow
- 需要检索 Kani 权限系统知识库，回答权限申请、审批、排障类问题
- 需要用办公网 Kani Console 后端查询 role/group/resource 的应用、列表、详情、成员、管理员或授权对象
- 需要通过 `kani openapi` 先查 namespace / role / resource / group / permission，再用 workflow 发起申请

## 前置条件

- 需要鉴权，先登录：`bytedcli auth login --session`

## 常用命令

```bash
# 查看帮助
bytedcli kani --help

# 列出审批工单（默认尽量贴近 Kani request 页语义）
bytedcli kani approval list

# 检索 Kani 知识库
bytedcli kani knowledge search --query "如何申请 Kani 资源权限"

# Kani OpenAPI 第一步：先找当前 identity 能访问的 namespace
bytedcli kani openapi identity namespace list --identity-key alice

# Kani Console 办公网只读排障：查询角色 / 用户组 / 资源主链路
bytedcli kani role list --ns kani_demo --keyword developer
bytedcli kani group member list --ns kani_demo --group-id 123 --location cnmain
bytedcli kani resource grant list --ns kani_demo --key demo-resource

# workflow create 继续保留 body-file，但帮助与文档都给具体示例
bytedcli kani openapi workflow create --body-file ./workflow-create-resource.json

# 通过 Protego review API 快速申请资源权限；--dry-run 仍会创建 dry-run workflow 预览
bytedcli kani protego apply --namespace kani_demo --resource-key demo/repo --action developer --identity alice --dry-run

# 查询 Protego workflow 状态与节点
bytedcli kani protego get-workflow --workflow-id wf_demo

# write-log 默认查当前 identity 最近 30 天
bytedcli kani openapi write-log list

# 带上下文检索并限制返回知识库切片数量
bytedcli kani knowledge search --query "Kani 权限审批失败怎么办" --context "用户正在排查权限申请" --result-limit 10

# 创建单个资源权限申请工单（resource 需要 permission-key，指定资源的某个权限）
bytedcli kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_demo --object-key demo-resource --permission-key read

# 创建单个角色申请工单
bytedcli kani approval create --applicant alice --reason "need role" --object-type role --object-namespace kani_demo --object-key demo-role

# 创建单个用户组申请工单
bytedcli kani approval create --applicant alice --reason "need group" --object-type group --object-namespace kani_demo --object-key demo-group

# 预览创建请求体和 endpoint，不真正提交
bytedcli kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_demo --object-key demo-resource --permission-key read --dry-run

# 查看待我审批（reviewer 视角）
bytedcli kani approval list --role reviewer

# 查看我发起的、已完成的申请
bytedcli kani approval list --role applicant --view finished

# 过滤：指定申请人 / 审批人
bytedcli kani approval list --applicant alice --reviewer bob

# 过滤：加急 bucket（true/false）
bytedcli kani approval list --urgent true

# 过滤：命名空间 / 安全等级 / VDC
bytedcli kani approval list --ns demo_ns --security-level P0 --vdc demo_vdc

# 过滤：时间范围（ISO,ISO）
bytedcli kani approval list --created-at 2026-05-01T00:00:00Z,2026-05-12T00:00:00Z

# 分页
bytedcli kani approval list --urgent true --limit 50 --offset 0

# 机器可读输出（全局参数，必须放在子命令前）
bytedcli --json kani approval list
bytedcli --json kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_demo --object-key demo-resource --permission-key read
bytedcli --json kani knowledge search --query "如何申请 Kani 资源权限"
bytedcli --json kani protego get-workflow --workflow-id wf_demo
```

## 参数一览（kani knowledge search）

> 以 `bytedcli kani knowledge search --help` 为准。

- `--query <query>`：用于知识库检索的用户查询语句（必填）
- `--context <context>`：辅助检索的聊天记录或用户上下文信息
- `--result-limit <n>`：返回知识库切片数量，`1..50`，默认 `5`

## 参数一览（kani approval create）

> 以 `bytedcli kani approval create --help` 为准。

- `--applicant <user>`：申请人（必填）
- `--reason <reason>`：申请理由（必填）
- `--object-type <type>`：申请对象类型，`resource|role|group`（必填）
- `--object-namespace <ns>`：申请对象namespace，例如 `kani_demo`（必填）
- `--object-key <key>`：申请对象key（必填）
- `--permission-key <key>`：申请对象的权限key，仅 `--object-type resource` 必填
- `--dry-run`：只打印请求体和 endpoint，不真正创建申请
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 参数一览（kani protego apply）

> 以 `bytedcli kani protego apply --help` 为准。

- `--namespace <namespace>`：Kani namespace，例如 `kani_demo`（必填）
- `--resource-key <key>`：资源 key，可重复或逗号分隔（必填）
- `--action <action>`：权限 action，例如 `developer` 或 `read`（必填）
- `--identity <user>`：目标用户 identity id（必填）
- `--reason <reason>`：申请理由；省略时使用通用 bytedcli Protego 申请理由
- `--location <location>`：Protego location path，例如 `r:cn`（默认 `r:cn`）
- `--expiration-days <days>`：权限有效期天数（默认 `365`）
- `--dry-run`：请求 Protego 创建 dry-run workflow 预览，不直接授予权限
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 参数一览（kani protego get-workflow）

> 以 `bytedcli kani protego get-workflow --help` 为准。

- `--workflow-id <id>`：Kani Protego workflow id（必填）
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 参数一览（kani approval list）

> 以 `bytedcli kani approval list --help` 为准，这里按当前实现做摘要。

- `--role <role>`：`applicant|reviewer`（默认 `applicant`）
- `--view <view>`：`running|finished`（默认 `running`）
- `--applicant <user>`：申请人过滤
- `--reviewer <user>`：审批人过滤
- `--status <status>`：工单状态过滤
- `--review-status <status>`：审批状态过滤
- `--urgent <boolean>`：加急 bucket 过滤（`true|false`）
- `--vdc <vdc>`：VDC 过滤
- `--limit <n>`：单 bucket page size（默认 `20`）
- `--offset <n>`：单 bucket offset
- `--start-id <id>`：单 bucket pagination start_id
- `--created-at <startISO,endISO>`：创建时间范围
- `--review-created-at <startISO,endISO>`：审批创建时间范围
- `--asc <boolean>`：是否升序
- `--cross-region <boolean>`：跨 region 过滤
- `--ns <ns>`：命名空间过滤
- `--security-level <level>`：安全等级过滤
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 参数一览（kani role / group / resource）

> 以 `bytedcli kani role --help`、`bytedcli kani group --help`、`bytedcli kani resource --help` 和各叶子命令 `--help` 为准。

- `--site <site>`：办公网 Console 站点，`cn|boe|row|us-ttp|us-ttp-usts|eu-ttp|mya`（默认 `cn`）
- `--ns <ns>`：Kani namespace
- `--location <location>`：Console location/vdc，例如 `cnmain`
- `--keyword <keyword>`：关键词过滤，传给 Console API 的 `search_input`
- `--page-size <n>` / `--start-id <n>`：Console API 分页参数，分别映射到 `batch_size` / `start_id`
- 常用只读命令：`role app list`、`role list`、`role get`、`role summary`、`role member list`、`role admin list`、`group app list`、`group list`、`group get`、`group summary`、`group member list`、`group admin list`、`resource app list`、`resource root list`、`resource tree`、`resource get`、`resource admin list`、`resource permission list`、`resource grant list`

## Notes

- `--json` 是全局参数，必须放在子命令前，例如：`bytedcli --json kani approval list`
- `kani role`、`kani group`、`kani resource` 走办公网 Kani Console 页面后端与个人 JWT；`kani openapi` 仍用于生产网 Kani V2 OpenAPI。
- 若你在 BOE/ROW/TTP/MYA 等环境排查 Kani Console 只读命令，可使用 `--site <site>` 指定对应站点（默认 `cn`）。

## References

- `references/kani.md`
- `references/kani-openapi.md`
- `../../troubleshooting.md`
