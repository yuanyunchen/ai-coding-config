# ECOP 命令参考索引

ECOP 命令按领域分组；详细命令参考以 `skills/bytedance-ecop/references/*.md` 为单一事实来源（SSOT），按需在 `bytedance-ecop` skill 内加载。本文只列命令速览与索引，不重复维护详细字段说明。

| 领域 | 覆盖命令 | 详细参考 |
|---|---|---|
| 治理标签 | `ecop zhili-label tree/list/get`、`ecop std-audit-label list` | `zhili-label.md` |
| 自动立规 | `ecop autorule list/get/create` | `autorule.md` |
| 外化规则 | `ecop externalrule list/tree/get/dept-list` | `externalrule.md` |

## 认证说明

ECOP 所有接口均走 ByteCloud SSO JWT，CLI 自动通过 `x-jwt-token` header 注入登录态。
ECOP 网关要求所有业务接口带站点上下文（`space=1`、`group_id=417`）；CLI 已硬编码，使用者无需额外传入。
