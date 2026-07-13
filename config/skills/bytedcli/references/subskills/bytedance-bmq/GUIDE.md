---
name: bytedance-bmq
description: "Operate BMQ (ByteCloud Message Queue / Kafka) via bytedcli: list/get topics, list clusters, list consumer groups, list mirrors. Use when tasks mention Kafka, message queues, BMQ topics, consumers, or data mirrors."
---

# bytedcli BMQ

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

- Kafka / BMQ 话题列表与详情
- 集群列表
- 消费组列表
- Mirror（跨区复制）列表

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

Commands are grouped under `bmq topic`, `bmq cluster`, `bmq consumer`, and `bmq mirror`. Old flat names (e.g. `bmq topics`, `bmq topic <id>`, `bmq clusters`, `bmq consumers`, `bmq mirrors`) still work as hidden aliases.

```bash
# Topic 列表
bytedcli bmq topic list --vregion "US-BOE" --page 1 --size 20
bytedcli bmq topic list --vregion "Singapore-Central" --search "demo" --all

# Topic 详情
bytedcli bmq topic get 12345 --vregion "US-BOE"

# Topic 官方流量监控链接（BMQ 平台同款 Grafana 监控 URL）
bytedcli --site us-ttp bmq topic metrics get --search "ad_pet_ldp_cvr_signal"
bytedcli --site us-ttp bmq topic metrics get --topic-id 125248 --type iframe

# Cluster 列表
bytedcli bmq cluster list --vregion "US-BOE" --all
bytedcli bmq cluster list --vregion "Singapore-Central" --search "public"

# Consumer Group 列表
bytedcli bmq consumer list --vregion "US-BOE" --page 1 --size 20
bytedcli bmq consumer list --vregion "Singapore-Central" --search "demo_consumer" --all
bytedcli bmq consumer list --vregion "Singapore-Central" --cluster-name "demo-cluster" --all

# Mirror 列表
bytedcli bmq mirror list --vregion "Singapore-Central" --status RUNNING --all
bytedcli bmq mirror list --vregion "Singapore-Central" --search "demo_topic" --size 10
```

## 多站点支持

BMQ 支持多个站点，通过 `--site` 切换：

- `boe`: BOE 环境 (`cloud-boe.bytedance.net`)
- `i18n-tt`: TikTok ROW (`cloud.tiktok-row.net`)，EU 区域自动路由到 `cloud-eu.tiktok-row.net`
- `i18n` / `i18n-bd`: ByteIntl (`cloud.byteintl.net`)
- `eu-ttp`: EU TTP 站点
- `cn`: 中国站 (`cloud.bytedance.net`)

```bash
# TikTok ROW
bytedcli --site i18n-tt bmq topic list --vregion "Singapore-Central" --all

# BOE
bytedcli --site boe bmq topic list --vregion "US-BOE" --all
```

## Notes

- 需要结构化输出加 `--json`
- `--vregion` 指定虚拟区域（如 `US-BOE`、`Singapore-Central`、`CN` 等）
- `--all` 查看所有资源（默认只看自己拥有的）
- `bmq consumer list` 支持 `--cluster-name` 按集群名过滤
- `bmq topic metrics get` 返回 BMQ 平台同款 Grafana 监控 URL，默认 `--type link`（嵌入页用 `--type iframe`）；为便于查任意 topic，默认 `--all`（与 `topic list` 默认不同），多结果可用 `--cluster-name` 消歧

## References

- `references/bmq.md`
