---
name: bytedance-trafficroute
description: "Operate TrafficRoute PrivateZone and DNS via bytedcli: run TrafficRoute-specific auth, list resolver endpoints and rules, query privatezone zones/records, and query DNS zones/records. Use when tasks mention TrafficRoute, PrivateZone, 云解析DNS, resolver endpoint, resolver rule, zone list, record list, private DNS, public DNS, or bound VPC info."
---
# bytedcli TrafficRoute

## 如何调用 bytedcli

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

- TrafficRoute PrivateZone 平台：排查 resolver endpoint / resolver rule / zone / record
- 查询某个账号下的私有域名（zone）列表
- 按 `z-id` 精确查询单个 zone，并查看最准确的绑定 VPC 信息
- 查询某个 zone 下的 records
- 查询 云解析DNS 的 域名（zone）/ 记录（record）
- 处理 TrafficRoute 特有的认证问题；这里不要默认使用通用 `auth login` 替代 `trafficroute auth login`
- 不用于查询公共服务区DNS的域名（zone）/ 记录（record）

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要 TrafficRoute 认证时，先检查：

```bash
bytedcli trafficroute auth status
```

- 缺认证或认证过期时，再执行：

```bash
bytedcli trafficroute auth login
```

- 若是云解析DNS / `trafficroute dns ...` 场景，改用 DNS context：

```bash
bytedcli trafficroute auth status --context dns
bytedcli trafficroute auth login --context dns
```

## Quick start

```bash
# 查看根帮助
bytedcli trafficroute --help

# 检查 TrafficRoute 专用认证
bytedcli trafficroute auth status

# 登录并缓存 TrafficRoute token
bytedcli trafficroute auth login

# 登录并缓存云解析DNS token
bytedcli trafficroute auth login --context dns

# 按账号分页查询 zone
bytedcli trafficroute privatezone zone list --account-id demo-account-id --page 1 --page-size 20

# 按 z-id 精确查询 zone，并拿到最准确的绑定 VPC 信息
bytedcli trafficroute privatezone zone list --z-id demo-zone-id

# 叠加 domain 关键字查询
bytedcli trafficroute privatezone zone list --account-id demo-account-id --domain "demo.internal.example"

# 查询指定 zone 下的 record
bytedcli trafficroute privatezone record list --z-id demo-zone-id --page 1 --page-size 20

# 查询云解析DNS zone，支持 account 过滤，stage 用语义值而不是数字
bytedcli trafficroute dns zone list --account-id demo-account-id --domain "demo.example.com" --stage change-dns --page 1 --page-size 20

# 查询云解析DNS record
bytedcli trafficroute dns record list --z-id demo-zone-id --page 1 --page-size 20

# 查询 resolver endpoint
bytedcli trafficroute privatezone resolver-endpoint list \
  --account-id demo-account-id \
  --resolver-id demo-resolver-id

# 查询 resolver rule
bytedcli trafficroute privatezone resolver-rule list \
  --account-id demo-account-id \
  --endpoint-id demo-endpoint-id

# 需要结构化输出时，把 --json 放在子命令前
bytedcli --json trafficroute privatezone zone list --z-id demo-zone-id
```

## Notes

- `trafficroute auth` 在根 help 中是隐藏的，但命令仍然可执行：`trafficroute auth login/status/logout`
- `trafficroute auth login/status/logout --context dns` 管理的是云解析DNS独立缓存；不要和默认的 privatezone cache 混用
- TrafficRoute 业务命令优先使用 `BYTEDCLI_TRAFFICROUTE_AUTHORIZATION`；没有环境变量时再回退到本地缓存 token
- `trafficroute auth login` 不是通用 JWT 登录；它会复用现有 CN SSO 会话或终端二维码登录，然后从 context 对应页面捕获真实请求头
- `trafficroute dns zone list --account-id` 会透传为上游 `AccountID=<id>` 过滤
- `trafficroute dns zone list --stage` 使用语义值：`normal` / `needs-recovery` / `not-using-trafficroute` / `abnormal` / `change-dns`
- `zone list` 的 account/domain 过滤遵循控制台页面行为，默认使用 `SearchMode=like`
- 传入 `--z-id` 时，CLI 会走精确查询路径，并返回最准确的绑定 VPC 信息
- 普通`privatezone zone list` 会对当前页 zone 按需补详情请求，以尽量补齐 `bindVpcs`；如果你只关心某个 zone 的精确绑定关系，优先直接传 `--z-id`
- `record list` 必须传 `--z-id`，并会把后端 `SubDomains[].Records[]` 展平成单条记录行
- `trafficroute dns zone list` 的文本摘要标题是 `DNS Zones Query`，因为上方 KV 块展示的是查询条件和分页摘要，不是结果字段
- `resolver-rule list` 当前走管理台 list-rules 查询，返回 OUTBOUND 规则；`NeedVPCInfo` 固定开启，不暴露为 CLI 参数

## References

- `references/trafficroute.md`
- `../../invocation.md`
- `../../troubleshooting.md`
