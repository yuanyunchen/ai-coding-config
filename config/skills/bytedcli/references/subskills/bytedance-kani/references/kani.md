# Kani

Kani 是权限审批/工单平台。bytedcli 当前覆盖 **审批工单列表**、**创建Kani权限申请工单**、**Protego 资源权限快捷申请**、**Kani 知识库检索**、**Kani Console 办公网只读查询** 和 **Kani OpenAPI 查询 / workflow 创建** 能力。

## Kani Console 办公网只读排障

`kani role`、`kani group`、`kani resource` 面向办公网 Console 页面后端，适合用个人 JWT 快速排查 role/group/resource 主链路；生产网 V2 OpenAPI 查询仍使用 `kani openapi`。

```bash
# Roles
bytedcli kani role app list --ns kani_demo
bytedcli kani role list --ns kani_demo --keyword developer --page-size 50
bytedcli kani role get --ns kani_demo --role-id 123 --role-key demo-role
bytedcli kani role summary --ns kani_demo --role-id 123
bytedcli kani role member list --ns kani_demo --role-id 123 --location cnmain
bytedcli kani role admin list --ns kani_demo --id 123

# Groups
bytedcli kani group app list --ns kani_demo
bytedcli kani group list --ns kani_demo --keyword ops
bytedcli kani group get --ns kani_demo --group-id 123 --group-key demo-group
bytedcli kani group summary --ns kani_demo --group-key demo-group
bytedcli kani group member list --location cnmain --group-id 123
bytedcli kani group admin list --location cnmain --id 123

# Resources
bytedcli kani resource app list --username alice
bytedcli kani resource root list --ns kani_demo --keyword demo-resource
bytedcli kani resource tree --ns kani_demo --root-node-id-list 1,2
bytedcli kani resource get --ns kani_demo --id demo-resource-id --key demo-resource
bytedcli kani resource admin list --ns kani_demo --id demo-resource-id
bytedcli kani resource permission list --ns kani_demo --key demo-resource --location cnmain
bytedcli kani resource grant list --ns kani_demo --key demo-resource --page-size 50
```

### 参数一览（kani role / group / resource）

> 具体可用参数以各叶子命令 `--help` 为准。

- `--site <site>`：办公网 Console 站点，`cn|boe|row|us-ttp|us-ttp-usts|eu-ttp|mya`（默认 `cn`）
  - `cn` → `kani.bytedance.net`
  - `boe` → `kani-boe.bytedance.net`
  - `row`（别名 `i18n-tt`/`sg`）→ `kani.tiktok-row.net`
  - `us-ttp`（BDEE，别名 `tx`）→ `kani-ttp-us.tiktok-row.net`
  - `us-ttp-usts`（USTS，别名 `usts`）→ `kani.tiktok-usts.net`
  - `eu-ttp`（别名 `ttp`）→ `kani-eu-ttp.tiktok-row.net`
  - `mya`（别名 `i18n-bd`）→ `kani.byteintl.net`
- `--ns <ns>`：Kani namespace
- `--location <location>`：Console location/vdc，例如 `cnmain`
- `--keyword <keyword>`：关键词过滤，传给 Console API 的 `search_input`
- `--page-size <n>` / `--start-id <n>`：Console API 分页参数，分别映射到 `batch_size` / `start_id`

## Kani OpenAPI 查询与申请

```bash
# 推荐第一步：先查当前 identity 能访问的 namespace
bytedcli kani openapi identity namespace list --identity-key alice

# 再查 namespace 下的角色 / 资源 / 组
bytedcli kani openapi namespace role list --namespace kani_demo
bytedcli kani openapi namespace resource list --namespace kani_demo
bytedcli kani openapi namespace group list --namespace kani_demo

# 查 identity 在 namespace 下已有的权限
bytedcli kani openapi identity permission list \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice

# 解释授权链路
bytedcli kani openapi authz path \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice \
  --object-type resource \
  --object-key demo-resource \
  --action-key read

# 只有 workflow create 属于第一版开放的写命令
bytedcli kani openapi workflow create --body-file ./workflow-create-resource.json

# write-log 默认查询当前 identity 最近 30 天的 write log
bytedcli kani openapi write-log list
```

更多 `--body-file` 示例与查询路径说明见：`references/kani-openapi.md`

## Protego 资源权限快捷申请

`kani protego apply` 适合已知 namespace、resource key、action 和目标用户时，直接走 Protego review API 创建资源权限申请 workflow。若还不知道 namespace / resource / action，先用 `kani openapi namespace resource list`、`kani openapi permission get` 等查询命令确认。

```bash
# 创建 dry-run workflow 预览；注意 --dry-run 仍会请求 Protego workflow endpoint
bytedcli kani protego apply \
  --namespace kani_demo \
  --resource-key demo/repo \
  --action developer \
  --identity alice \
  --dry-run

# 一次申请多个资源 key，可重复传参或逗号分隔
bytedcli kani protego apply \
  --namespace kani_demo \
  --resource-key demo/repo,example/repo \
  --resource-key sample/repo \
  --action developer \
  --identity alice \
  --reason "need repo access" \
  --expiration-days 30

# 查询 workflow 状态与节点摘要
bytedcli kani protego get-workflow --workflow-id wf_demo

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani protego get-workflow --workflow-id wf_demo
```

### 参数一览（kani protego apply）

> 具体可用参数以 `bytedcli kani protego apply --help` 为准。

- `--namespace <namespace>`：Kani namespace，例如 `kani_demo`（必填）
- `--resource-key <key>`：资源 key，可重复或逗号分隔（必填）
- `--action <action>`：权限 action，例如 `developer` 或 `read`（必填）
- `--identity <user>`：目标用户 identity id（必填）
- `--reason <reason>`：申请理由；省略时使用通用 bytedcli Protego 申请理由
- `--location <location>`：Protego location path，例如 `r:cn`（默认 `r:cn`）
- `--expiration-days <days>`：权限有效期天数（默认 `365`）
- `--dry-run`：请求 Protego 创建 dry-run workflow 预览，不直接授予权限
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

### 参数一览（kani protego get-workflow）

> 具体可用参数以 `bytedcli kani protego get-workflow --help` 为准。

- `--workflow-id <id>`：Kani Protego workflow id（必填）
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 检索 Kani 知识库

```bash
# 检索 Kani 权限系统相关知识
bytedcli kani knowledge search --query "如何申请 Kani 资源权限"

# 带上下文检索并限制返回知识库切片数量
bytedcli kani knowledge search \
  --query "Kani 权限审批失败怎么办" \
  --context "用户正在排查权限申请" \
  --result-limit 10

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani knowledge search --query "如何申请 Kani 资源权限"
```

### 参数一览（kani knowledge search）

> 具体可用参数以 `bytedcli kani knowledge search --help` 为准。

- `--query <query>`：用于知识库检索的用户查询语句（必填）
- `--context <context>`：辅助检索的聊天记录或用户上下文信息
- `--result-limit <n>`：返回知识库切片数量，`1..50`，默认 `5`

## 创建Kani权限申请工单

```bash
# 创建资源权限申请工单（resource 需要 permission-key，指定资源的某个权限）
bytedcli kani approval create \
  --applicant alice \
  --reason "need read access" \
  --object-type resource \
  --object-namespace kani_demo \
  --object-key demo-resource \
  --permission-key read

# 创建角色申请工单
bytedcli kani approval create \
  --applicant alice \
  --reason "need role" \
  --object-type role \
  --object-namespace kani_demo \
  --object-key demo-role

# 创建用户组申请工单
bytedcli kani approval create \
  --applicant alice \
  --reason "need group" \
  --object-type group \
  --object-namespace kani_demo \
  --object-key demo-group

# 预览请求体和 endpoint，不真正提交
bytedcli kani approval create \
  --applicant alice \
  --reason "need read access" \
  --object-type resource \
  --object-namespace kani_demo \
  --object-key demo-resource \
  --permission-key read \
  --dry-run

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_demo --object-key demo-resource --permission-key read
```

### 参数一览（kani approval create）

> 具体可用参数以 `bytedcli kani approval create --help` 为准。

- `--applicant <user>`：申请人（必填）
- `--reason <reason>`：申请理由（必填）
- `--object-type <type>`：申请对象类型，`resource|role|group`（必填）
- `--object-namespace <ns>`：申请对象namespace，例如 `kani_demo`（必填）
- `--object-key <key>`：申请对象key（必填）
- `--permission-key <key>`：申请对象的权限key，仅 `--object-type resource` 必填
- `--dry-run`：只打印请求体和 endpoint，不真正创建申请
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 列出审批工单

```bash
bytedcli kani approval list

# JSON 输出（全局参数必须放在子命令前）
bytedcli --json kani approval list
```

## 常用筛选示例

```bash
# 待我审批 / 我参与审批
bytedcli kani approval list --role reviewer

# 我发起的已完成
bytedcli kani approval list --role applicant --view finished

# 过滤：申请人/审批人
bytedcli kani approval list --applicant alice --reviewer bob

# 过滤：加急 bucket
bytedcli kani approval list --urgent true

# 过滤：命名空间/安全等级/VDC
bytedcli kani approval list --ns demo_ns --security-level P0 --vdc demo_vdc

# 时间范围（ISO,ISO）
bytedcli kani approval list --created-at 2026-05-01T00:00:00Z,2026-05-12T00:00:00Z

# 分页
bytedcli kani approval list --limit 50 --offset 0
```

## 参数一览（kani approval list）

> 具体可用参数以 `bytedcli kani approval list --help` 为准。

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

## 站点

- 审批/申请（`kani approval`、`kani knowledge`、`kani protego`）默认站点：`cn`，BOE 走隐藏参数 `--kani-site boe`。
- Console 只读（`kani role`、`kani group`、`kani resource`）支持多站点：`cn|boe|row|us-ttp|us-ttp-usts|eu-ttp|mya`，默认 `cn`，各站点 origin 见上方「参数一览（kani role / group / resource）」。
