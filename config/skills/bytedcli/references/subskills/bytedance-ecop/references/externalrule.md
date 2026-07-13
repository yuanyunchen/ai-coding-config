# ECOP 外部规则流程（externalrule）命令参考

## 资源模型

`externalrule` 对应 ECOP 规则平台（`RulePlatformRpc`）的规则流程，一条记录由「规则信息（RuleInfo）+ 流程信息（FlowInfo）」组成：

- **RuleInfo**：规则主体，含规则 ID、名称、版本、目录、内容更新时间、参与人列表（`UserList`）。
- **FlowInfo**：规则当前的流程状态，含流程 ID、当前节点名、是否结束、电商大学链接。

参与人 `UserList` 按 `UserType` 区分角色，业务负责人为 `UserType=1`；CLI 只提取业务负责人邮箱并去重。

---

## `ecop externalrule list`

按目录分页列出规则流程，支持按规则 ID/名称、关键词过滤。

```bash
bytedcli ecop externalrule list --page 1 --page-size 10
bytedcli ecop externalrule list --rule 10047
bytedcli ecop externalrule list --category-id 150 --keyword demo-keyword
bytedcli --json ecop externalrule list
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--category-id` | `CategoryIDList` | 目录 ID，根目录为 `0`（默认值），CLI 包成单元素数组 |
| `--rule` | `RuleFuzzyName` | 规则 ID 或名称模糊匹配，可选 |
| `--keyword` | `KeyWord` | 关键词查找，可选 |
| `--op-user` | `OpUserID` | 操作人邮箱；缺省时自动解析当前登录用户邮箱 |
| `--page` / `--page-size` | `Page.PageNum`/`Page.PageSize` | CLI 1-based；上游接受字符串格式 |

### OpUserID 自动解析

`--op-user` 缺省时，CLI 通过 `SSOClient.getUserInfo()` 取当前登录用户的邮箱作为 `OpUserID`。
若无法解析（未登录或缺失邮箱），抛 `ECOP_OP_USER_UNRESOLVED`，提示显式传入 `--op-user <email>` 或先执行 `bytedcli auth login`。

### 文本输出列

规则名称/ID / 版本 / 目录ID / 更新时间 / 业务负责人 / 流程ID / 流程状态 / 已结束 / 电商大学链接

- **更新时间**：`ContentLatestUpdatedTime`（秒级时间戳），文本模式格式化到秒（`YYYY-MM-DD HH:mm:ss`），JSON 保留原始秒值。
- **业务负责人**：`UserList` 中 `UserType=1` 的邮箱，去重后以 `、` 拼接。
- **已结束**：`FlowInfo.IsFinished`，文本模式渲染为 `是`/`否`/`-`。
- **电商大学链接**：`FlowInfo.CurEschoolUrl`，解析时已 `trim()` 去除首尾空格。

### JSON 输出字段

```json
{
  "status": "success",
  "data": {
    "rules": [
      {
        "id": "10047",
        "name": "demo-external-rule",
        "version": "3",
        "category_id": "150",
        "content_latest_updated_time": 1779870967,
        "biz_owners": ["owner@example.com"],
        "flow_id": "9267",
        "flow_node_name": "生效",
        "flow_finished": true,
        "eschool_url": "https://school.example.com/article/demo"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 10,
    "page_count": 1
  }
}
```

---

## `ecop externalrule tree`

查看外部规则的全部目录树（含 ID、名称、子节点、负责人）。

```bash
bytedcli ecop externalrule tree
bytedcli --json ecop externalrule tree
bytedcli ecop externalrule tree --op-user demo-user@example.com
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--op-user` | `OpUserID` | 操作人邮箱；缺省时自动解析当前登录用户邮箱 |

`--op-user` 的自动解析逻辑与 `list` 相同：缺省时通过 `SSOClient.getUserInfo()` 取当前登录邮箱，无法解析时抛 `ECOP_OP_USER_UNRESOLVED`。

### 目录节点字段

每个目录节点含：`ID`、`Name`、`ParentID`、`SortNum`、`RuleOwners`（负责人邮箱）、`AttentionPeople`（关注人邮箱）、`SubCategoryList`（子节点，递归）。上游顶层有两个根：`ID:"0"`（业务根目录）与 `ID:"-1"`（测试根目录），其 `ParentID` 均为 `"-2"`。

### 文本输出

按层级缩进渲染树，每行格式：`- [<id>] <名称>（负责人: <邮箱、…>）`。

### JSON 输出字段

```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "id": "0",
        "name": "业务根目录",
        "parent_id": "-2",
        "sort_num": 1,
        "rule_owners": ["owner@example.com"],
        "attention_people": [],
        "children": [
          {
            "id": "31",
            "name": "创作者管理",
            "parent_id": "0",
            "sort_num": 0,
            "rule_owners": ["owner@example.com"],
            "attention_people": [],
            "children": []
          }
        ]
      }
    ]
  }
}
```

---

## `ecop externalrule dept-list`

列出外部规则可选择的**业务部门树**（`TreeRuleBizDept` 接口）。

```bash
bytedcli ecop externalrule dept-list
bytedcli --json ecop externalrule dept-list
bytedcli ecop externalrule dept-list --op-user demo-user@example.com
```

- 数据来自 `RulePlatformRpc/TreeRuleBizDept` 接口，需登录后携带 SSO 会话。
- 每个节点包含 `id`、`name`、`can_select`（boolean）、`children`（递归子部门）。
- 只有 `can_select=true` 的节点才能作为 `--biz-dept` 传入；`can_select=false` 的父节点仅用于分类。
- 可选 `--op-user <email>` 覆盖 `OpUserID`，默认使用当前登录用户。

### 文本输出

每行格式：`- [<id>] <名称>（可选 | 不可选）`，缩进表示层级。

### JSON 输出字段

```json
{
  "status": "success",
  "data": {
    "departments": [
      {
        "id": "101",
        "name": "平台治理",
        "can_select": false,
        "children": [
          { "id": "101001", "name": "商家商品治理", "can_select": true, "children": [] }
        ]
      },
      { "id": "106", "name": "法务", "can_select": true, "children": [] }
    ]
  }
}
```

---

## `ecop externalrule get`

查看单条外部规则详情：基本信息、核心变更、需求简介、规则内容。

```bash
bytedcli ecop externalrule get --rule-id 1683 --rule-version 34
bytedcli --json ecop externalrule get --rule-id 1683 --rule-version 34
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--rule-id` | `RuleID` | 外化规则 ID，必填 |
| `--rule-version` | `RuleVersion` | 外化规则版本，必填 |

请求体固定携带 `NeedProc: true`，不带 `space`/`group_id`/`OpUserID`。

### 字段来源

| 展示字段 | 上游来源 |
|---|---|
| 规则名称 | `RuleInfo.BaseInfo.Name` |
| 规则类目 | `RuleInfo.Category` 沿 `SubCategory` 递归拼成的全路径 |
| 所属业务部门 | `RuleInfo.BizDept` 沿 `SubDept` 递归拼成的全路径 |
| 业务负责人 | `RuleInfo.BaseInfo.UserList` 中 `UserType=1` 的邮箱，去重 |
| 核心变更 | `RuleInfo.ReqDocList[0].CoreChange` |
| 需求简介 | `RuleInfo.ReqDocList[0].ReqBriefContent` |
| 规则内容 | `RuleInfo.RuleWholeContent.RawText`（纯文本全文，优于 RichText/HTMLText/分段 ContentList） |

> 注意：`BaseInfo.ReqBriefContent` 常为空，真正的需求简介与核心变更在 `ReqDocList[0]`。类目与部门是**单链嵌套对象**（非数组），CLI 沿子节点键递归收集名称成路径。

### 文本输出

分段渲染，路径用 ` / ` 连接，负责人用 `、` 连接：

```
【基本信息】
  规则名称: <名称>（ID: <id>，版本: <version>）
  规则类目: <类目全路径>
  所属业务部门: <部门全路径>
  业务负责人: <邮箱、…>

【核心变更】
  <core change>

【需求简介】
  <req brief>

【规则内容】
<规则全文>
```

### JSON 输出字段

```json
{
  "status": "success",
  "data": {
    "detail": {
      "id": "1683",
      "name": "demo-external-rule",
      "version": "34",
      "category_path": ["业务根目录", "行业管理规范"],
      "biz_dept_path": ["平台治理", "业务规则"],
      "biz_owners": ["owner@example.com"],
      "core_change": "…",
      "req_brief": "…",
      "content": "…"
    }
  }
}
```

---

## 上游接口对应关系

| CLI 命令 | 上游 RPC |
|---|---|
| `ecop externalrule list` | `RulePlatformRpc/PageQueryRuleFlow` |
| `ecop externalrule tree` | `RulePlatformRpc/QueryRuleCategory` |
| `ecop externalrule get` | `RulePlatformRpc/QueryRuleFlowDetail` |
| `ecop externalrule dept-list` | `RulePlatformRpc/TreeRuleBizDept` |

接口路径前缀：`/api/governance_base/byte_cloud/rpc/`

> 注意：与 `AuditConfig` / `ModelPlatformRpc` 系列不同，`PageQueryRuleFlow` / `QueryRuleCategory` / `QueryRuleFlowDetail` 的请求体**不带** `space`/`group_id` 站点参数，CLI 只发送 curl 中出现的字段（`QueryRuleCategory` 仅发送 `OpUserID`；`QueryRuleFlowDetail` 仅发送 `RuleID`/`RuleVersion`/`NeedProc`）。
