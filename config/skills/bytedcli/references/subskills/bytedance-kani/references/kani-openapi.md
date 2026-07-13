# Kani OpenAPI

Kani OpenAPI 这组命令面向“先查再申请”的使用路径。当前命令面以只读查询为主，唯一保留的写操作是 `workflow create`。

## 通用约定

- `--region` 支持：`cn`、`boe`、`us|va`、`i18n-tt|sg|row`、`i18n-bd|row-nonTT|bd|non-tt-mya`、`eu-ttp|ttp`、`us-ttp|tx`
- 默认认证：自动获取所选 region 的个人态 `X-JWT-Token`
- 如果没显式传 `--region`，CLI 会按全局 `--site` 推导默认 region：
  - `cn -> cn`
  - `boe -> boe`
  - `i18n-tt -> sg`
  - `i18n` / `i18n-bd -> row-nonTT`
  - `eu-ttp -> eu-ttp`
  - `us-ttp* -> us-ttp`
  - 其他情况仍回落到 `cn`
- `us`、`eu-ttp`、`us-ttp` 不是同一个区域：
  - `us` 指 i18n-tt 体系下的 `va` OpenAPI：`https://kani-v2-openapi-va.byted.org/v1`
  - `eu-ttp` 指 EU-TTP OpenAPI：`https://kani-v2-api.tiktoke.org/v1`
  - `us-ttp` 指 US-TTP OpenAPI：`https://kani-v2-openapi.tiktokd.net/v1`
- `ttp` 现在只作为保守兼容别名，默认按 `eu-ttp` 解释
- `tx` 是 `us-ttp` 的兼容别名
  - 如果你要显式访问 US-TTP，优先直接传 `--region us-ttp`
- 显式 override：
  - `--jwt-token <token>`：覆盖个人态 `X-JWT-Token`
  - `--auth-token <token>`：覆盖服务态 `X-Auth-Token`
- `--metadata`：在文本模式额外展示 OpenAPI envelope metadata
- `-j, --json`：输出原始结构化结果，便于脚本消费
- 需要显式布尔值的参数统一传 `true` 或 `false`，例如 `--need-hierarchy true`
- 逗号分隔参数直接传单个字符串，例如 `--resource-keys keyA,keyB`

## OpenAPI 鉴权语义

这部分说明的是“我们当前接入的 OpenAPI 接口，在后端实现里的鉴权粒度”。CLI 本身只负责把 `X-JWT-Token` / `X-Auth-Token` 带过去，真正的允许/拒绝由后端决定。唯一例外是 `write-log list`：文档先按当前对外约定写，后端会再按这个规则收敛实现。

通用规则：

- 所有接口都要求 caller 已认证；也就是至少要有可用的个人态 `X-JWT-Token` 或服务态 `X-Auth-Token`
- “应用管理员 / namespace 管理员”在这里可以理解为：后端按 namespace wildcard resource 做 `admin` 校验，也就是 namespace 级 ACL
- 有些接口不是单纯的 namespace 级 ACL，而是会按“目标 identity”或“目标 resource/group/role 对象”做更细粒度的管理员校验
- 下表基于当前后端实现观察值整理；如果后端后续改 ACL，这里的分类也需要同步更新

按当前实现可以先这样理解：

- `任何已认证 caller 都可以用`
  - `authz check`
  - `authz path`
  - 这两个接口在 OpenAPI wrapper 里跳过了额外 ACL，不要求你先是应用管理员、资源管理员或角色管理员
- `只能查自己`
  - `identity namespace list`
  - 用户 JWT 只能查 `IdentityNamespace=user` 且 `IdentityKey=当前登录用户`
  - 服务 token 只能查 `IdentityNamespace=tce` 且 `IdentityKey=当前服务 PSM`
- `自己总能查自己；查别人需要额外管理员权限`
  - `identity permission list`
  - `member related-role list`
  - 查自己时，后端会直接放行；查别人时，后端会按目标 identity / member 再做 ACL
- `资源 / 角色 / Group 管理员可查对应对象`
  - `resource related-member list`
- `通常按应用 / namespace 管理权限理解`
  - `permission get`
  - `role get`
  - `group get`
  - `resource get`
  - `namespace get`
  - `namespace role list`
  - `namespace resource list`
  - `namespace group list`
  - `identity permission inactive-list`
  - `member related-role inactive-list`
  - `workflow create`
  - `workflow get`
  - `write-log list` 在“只传 Object，不传 Identity”时先按这一类理解

几个容易误解的点：

- `workflow create` 不是“只要想申请就一定能调”的无门槛接口。按当前后端实现，它仍然挂在 namespace 级 ACL 下
- `write-log list` 这里先按对外约定写，不再机械复述当前后端老逻辑；实现会再向文档规则收敛
- `identity permission list` 和 `member related-role list` 不是简单的“只有应用管理员可查”或“只有本人可查”二选一；更准确的理解是“本人自查放行，查别人要看后端是否认定你是目标对象的管理员”

## 推荐顺序

```bash
# 1) 先看当前 identity 能访问哪些 namespace
bytedcli kani openapi identity namespace list --identity-key alice

# 2) 再看某个 namespace 下的角色 / 资源 / 组
bytedcli kani openapi namespace role list --namespace kani_demo
bytedcli kani openapi namespace resource list --namespace kani_demo
bytedcli kani openapi namespace group list --namespace kani_demo

# 3) 继续看 identity 在 namespace 下已有的权限
bytedcli kani openapi identity permission list \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice

# 4) 需要解释权限链路时，用 path / check
bytedcli kani openapi authz path \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice \
  --object-type resource \
  --object-key demo-resource \
  --action-key read

# 5) 最后用 workflow create 发起申请
bytedcli kani openapi workflow create --body-file ./workflow-create-resource.json
```

## 命令参考

### `authz check`

用途：用一份 JSON request body 做授权校验。

鉴权语义：

- 任何已认证 caller 都可以调用
- 这个接口不会额外要求你先具备应用管理员、资源管理员或角色管理员权限

参数说明：

- `--region <region>`：可选；未传时按全局 `--site` 推导，兜底为 `cn`
- `--body-file <path>`：必填，JSON 文件路径
- `--metadata`：可选，文本模式显示 metadata
- `--jwt-token <token>` / `--auth-token <token>`：可选，显式覆盖鉴权 header

命令示例：

```bash
bytedcli kani openapi authz check --region cn --body-file ./check.json
bytedcli --json kani openapi authz check --region boe --body-file ./check.json
bytedcli kani openapi authz check \
  --region i18n-tt \
  --body-file ./check.json \
  --jwt-token "$JWT_TOKEN"
```

`check.json` 结构说明：

- `Namespace`：必填，资源所属 namespace
- `ResourceKey`：必填，资源 key
- `ActionKey`：必填，要校验的 action key
- `Identity`：必填，发起校验的 identity
- `Identity.IdentityType`：必填，常见值是 `user`
- `Identity.IdentityKey`：必填，identity key
- `Identity.IdentityNamespace`：可选，通常填 `user`

示例：

```json
{
  "Namespace": "kani_demo",
  "ResourceKey": "demo_resource",
  "ActionKey": "read",
  "Identity": {
    "IdentityType": "user",
    "IdentityKey": "alice",
    "IdentityNamespace": "user"
  }
}
```

### `authz path`

用途：查看 identity 到对象之间的授权链路。

鉴权语义：

- 任何已认证 caller 都可以调用
- 这个接口不会额外要求你先具备应用管理员、资源管理员或角色管理员权限

参数说明：

- `--region <region>`：可选；未传时按全局 `--site` 推导，兜底为 `cn`
- `--namespace <namespace>`：必填，identity 所在业务 namespace
- `--identity-type <type>`：必填，常见值 `user`
- `--identity-key <key>`：必填
- `--identity-namespace <namespace>`：可选，默认 `user`
- `--object-type <type>`：必填，常见值 `resource`
- `--object-key <key>`：必填
- `--object-namespace <namespace>`：可选，默认复用 `--namespace`
- `--action-key <key>`：可选，按 action 过滤
- `--enable-abac <boolean>`：可选，是否启用 ABAC 计算
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi authz path \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice \
  --object-type resource \
  --object-key demo-resource \
  --action-key read
```

### `permission get`

用途：读取某个资源下的权限定义。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填，资源所属 namespace
- `--resource-key <key>`：必填
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi permission get --namespace kani_demo --resource-key demo-resource
```

### `role get`

用途：读取单个 role。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--role-key <key>`：必填
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi role get --namespace kani_demo --role-key demo-role
```

### `group get`

用途：读取单个 group。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--group-key <key>`：必填
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi group get --namespace kani_demo --group-key demo-group
```

### `resource get`

用途：读取单个 resource。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--resource-key <key>`：必填
- `--need-descendant-resources <boolean>`：可选，是否同时返回下级资源
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi resource get --namespace kani_demo --resource-key demo-resource
```

### `resource related-member list`

用途：查看与某个 resource 相关的成员。

鉴权语义：

- 这是当前命令面里最明确的“资源管理员入口”之一
- 后端会按目标 `resource` 做对象级 ACL；namespace 管理员也可以通过

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--resource-key <key>`：必填
- `--action-keys <keys>`：可选，逗号分隔 action key 列表
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi resource related-member list \
  --namespace kani_demo \
  --resource-key demo-resource
```

### `identity namespace list`

用途：查看某个 identity 相关的 namespace。这个命令通常是第一步入口。

鉴权语义：

- 只能自查
- 用户 JWT 只能查当前登录用户自己
- 服务 token 只能查当前服务自己

参数说明：

- `--region <region>`：可选
- `--identity-key <key>`：必填
- `--identity-namespace <namespace>`：可选，默认 `user`
- `--filter <filters>`：可选，逗号分隔，支持 `namespace_admin`、`any_permission`
- `--page <n>`：可选，1-based 页码
- `--page-size <n>`：可选，每页条数；未传时默认按 20 计算
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi identity namespace list --identity-key alice
bytedcli kani openapi identity namespace list --identity-key alice --filter any_permission
```

### `identity permission list`

用途：列出 identity 在某个 namespace 下当前生效的权限。

鉴权语义：

- 查自己时会直接放行
- 查别人时，后端会按目标 identity 做额外 ACL，不要把它简单理解成“所有人都能查”或“只有应用管理员能查”

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--identity-type <type>`：必填，常见值 `user`
- `--identity-key <key>`：必填
- `--identity-namespace <namespace>`：可选
- `--resource-keys <keys>`：可选，逗号分隔资源 key 列表
- `--return-authorized-end-time <boolean>`：可选，返回权限到期时间
- `--need-admin-permission <boolean>`：可选，包含 admin 权限
- `--only-direct-permission <boolean>`：可选，只看直接授权
- `--need-hierarchy <boolean>`：可选，包含继承链路
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi identity permission list \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice
```

### `identity permission inactive-list`

用途：列出已经失效的 identity 权限。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--identity-type <type>`：必填
- `--identity-key <key>`：必填
- `--identity-namespace <namespace>`：可选
- `--start-authorized-end-time <ts>`：可选，毫秒时间戳，按失效时间起点过滤
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi identity permission inactive-list \
  --namespace kani_demo \
  --identity-type user \
  --identity-key alice \
  --start-authorized-end-time 1735689600000
```

### `namespace get`

用途：读取 namespace 详情。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi namespace get --namespace kani_demo
```

### `namespace role list`

用途：列出 namespace 下的 role。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--page <n>`：可选，1-based 页码
- `--page-size <n>`：可选，每页条数；未传时默认按 20 计算
- `--keyword <keyword>`：可选，按关键字搜索
- `--custom-tags <tags>`：可选，逗号分隔标签
- `--inactive-statuses <values>`：可选，逗号分隔 inactive status
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi namespace role list --namespace kani_demo
bytedcli kani openapi namespace role list --namespace kani_demo --keyword developer
```

### `namespace resource list`

用途：列出 namespace 下的 resource。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--page <n>`：可选，1-based 页码
- `--page-size <n>`：可选，每页条数；未传时默认按 20 计算
- `--action-keys <keys>`：可选，逗号分隔 action key 列表
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi namespace resource list --namespace kani_demo
```

说明：

- 返回中的空字符串 `ResourceKey` 已在 CLI 侧过滤掉，不再展示无意义的空 key

### `namespace group list`

用途：列出 namespace 下的 group。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--page <n>`：可选，1-based 页码
- `--page-size <n>`：可选，每页条数；未传时默认按 20 计算
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi namespace group list --namespace kani_demo
```

### `workflow create`

用途：提交 Kani workflow。当前公开命令里，这是唯一保留的写操作。

鉴权语义：

- 按当前后端实现，它仍是 namespace 级 ACL
- 也就是更接近“应用 / namespace 管理权限接口”，不是完全无门槛的申请入口

参数说明：

- `--region <region>`：可选
- `--body-file <path>`：必填，JSON 文件路径
- `--metadata`：可选，文本模式显示 metadata
- `--jwt-token <token>` / `--auth-token <token>`：可选

命令示例：

```bash
bytedcli kani openapi workflow create --region cn --body-file ./workflow-create-resource.json
bytedcli kani openapi workflow create --region cn --body-file ./workflow-create-role.json
bytedcli kani openapi workflow create --region cn --body-file ./workflow-create-group.json
bytedcli kani openapi workflow create \
  --region i18n-bd \
  --body-file ./workflow-create-role.json \
  --auth-token "$AUTH_TOKEN"
```

`--body-file` 顶层结构说明：

- `Applicant`：必填，申请人用户名
- `Reason`：必填，申请原因
- `ResourceItems` / `RoleItems` / `GroupItems`：至少传一种
- 建议一次 body 只表达一种申请类型，避免把资源、角色、组混在同一个请求里

#### 申请 resource permission

字段说明：

- `ResourceItems[].Namespace`：必填
- `ResourceItems[].ResourceKey`：必填
- `ResourceItems[].PermissionKeys`：必填，数组，可一次申请多个 permission key

示例：

```json
{
  "Applicant": "alice",
  "Reason": "Need read access for troubleshooting",
  "ResourceItems": [
    {
      "Namespace": "kani_demo",
      "ResourceKey": "demo_resource",
      "PermissionKeys": ["read"]
    }
  ]
}
```

#### 申请 role

字段说明：

- `RoleItems[].Namespace`：必填
- `RoleItems[].RoleKey`：必填

示例：

```json
{
  "Applicant": "alice",
  "Reason": "Need role for release operation",
  "RoleItems": [
    {
      "Namespace": "kani_demo",
      "RoleKey": "demo_role"
    }
  ]
}
```

#### 申请 group

字段说明：

- `GroupItems[].Namespace`：必填
- `GroupItems[].GroupKey`：必填

示例：

```json
{
  "Applicant": "alice",
  "Reason": "Need group membership for collaboration",
  "GroupItems": [
    {
      "Namespace": "kani_demo",
      "GroupKey": "demo_group"
    }
  ]
}
```

### `workflow get`

用途：查询 workflow 详情。

参数说明：

- `--region <region>`：可选
- `--workflow-id <id>`：必填
- `--namespace <namespace>`：必填
- `--applicant <user>`：必填
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi workflow get \
  --workflow-id wf_demo \
  --namespace kani_demo \
  --applicant alice
```

### `member related-role list`

用途：列出某个 member 关联到的 role。

鉴权语义：

- 查自己时会直接放行
- 查别人时，后端会按目标 member 做额外 ACL

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--member-type <type>`：必填，支持 `user`、`department`、`group`、`department-name`
- `--member-key <key>`：必填
- `--member-namespace <namespace>`：可选
- `--return-authorized-end-time <boolean>`：可选
- `--return-join-time <boolean>`：可选
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi member related-role list \
  --namespace kani_demo \
  --member-type user \
  --member-key alice
```

### `member related-role inactive-list`

用途：列出某个 member 已失效的 role 关系。

参数说明：

- `--region <region>`：可选
- `--namespace <namespace>`：必填
- `--member-type <type>`：必填，支持 `user`、`department`、`group`、`department-name`
- `--member-key <key>`：必填
- `--member-namespace <namespace>`：可选
- `--start-authorized-end-time <ts>`：可选，毫秒时间戳
- `--metadata`、`--jwt-token`、`--auth-token`：同上

示例：

```bash
bytedcli kani openapi member related-role inactive-list \
  --namespace kani_demo \
  --member-type user \
  --member-key alice \
  --start-authorized-end-time 1735689600000
```

### `write-log list`

用途：查询 Kani 写操作审计日志。

鉴权语义：

- 只传 `Object`，不传 `Identity`
  - 继续走原来的 admin 鉴权路径，保持旧行为
- 传了完整 `Identity`，但没传 `Object`
  - 只允许 JWT 证明这个 identity 就是调用者自己
- 同时传了 `Identity` 和 `Object`
  - 命中以下任一条件即可放行：
  - JWT self
  - Namespace Admin
  - Object Admin

这里的“完整 `Identity`”可以理解为：至少把 `--identity-namespace` 和 `--identity-key` 都明确传上。

参数说明：

- `--region <region>`：可选
- `--identity-namespace <namespace>`：可选，principal namespace
- `--identity-key <key>`：可选，principal key
- `--object-namespace <namespace>`：可选，对象所属 namespace
- `--object-type <type>`：可选，支持 `resource`、`group`、`role`、`app`
- `--object-key <key>`：可选
- `--time-range <range>`：可选，支持 `1h`、`1d`、`3d`、`7d`、`30d`、`365d`
- `--page <n>`：可选，1-based 页码
- `--page-size <n>`：可选，每页条数；未传时默认按 20 计算
- `--reason-include <text>`：可选，只保留 reason 包含该文本的记录
- `--reason-exclude <text>`：可选，排除 reason 包含该文本的记录
- `--return-raw-records <boolean>`：可选，同时返回 old/new record 原始内容
- `--metadata`、`--jwt-token`、`--auth-token`：同上

默认行为：

```bash
bytedcli kani openapi write-log list
```

额外示例：

```bash
bytedcli kani openapi write-log list \
  --identity-namespace user \
  --identity-key alice \
  --time-range 7d
bytedcli kani openapi write-log list \
  --object-namespace kani_demo \
  --object-type resource \
  --object-key demo-resource \
  --time-range 7d
```

说明：

- 默认搜索“当前登录 identity”近 `30d` 的 write log
- 如果显式传了 `--identity-key` / `--identity-namespace`，则以显式值为准
- `--object-namespace`、`--object-type`、`--object-key`、`--reason-include` 等参数都是附加过滤条件
