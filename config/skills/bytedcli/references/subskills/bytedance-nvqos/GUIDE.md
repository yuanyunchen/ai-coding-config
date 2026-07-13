---
name: bytedance-nvqos
description: "Operate NVQoS / VQoS via bytedcli: list spaces, list datasets, and trigger root cause analysis through /rootcause/v1/analysis. Use when tasks mention NVQoS, VQoS, vqos, QoS attribution, rootcause/root cause analysis, space/list, dataset/list, or intelligent attribution for QoS metrics."
---

# bytedcli NVQoS

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

- 用户提到 NVQoS / VQoS / vqos / QoS root cause / 智能归因 / 触发归因
- 需要列出 NVQoS spaces 或 datasets，用于后续构造归因请求
- 用户已经给出 `SpaceId`、`Dataset`、`Metric`、时间窗口、Filters JSON，需要调用 `/rootcause/v1/analysis`

## Auth and region

- 先执行 `bytedcli auth login`。
- NVQoS 命令使用 ByteCloud JWT 调用后端，并设置 `X-Jwt-Token`；带 `--space-id` 时同时设置 `X-Nvqos-Space-Id`。
- `--region` 支持 `cn`、`boe`、`sg`、`va`。默认 `cn`；也可用 `BYTEDCLI_NVQOS_REGION` 覆盖。
- 需要联调非内置环境时，用 `--base-url <url>` 或 `BYTEDCLI_NVQOS_BASE_URL` 覆盖。

## Commands

```bash
# 列空间
bytedcli nvqos space list --region sg --page 1 --page-size 20

# 按名称过滤空间
bytedcli --json nvqos space list --region cn --name sample-space

# 列数据集；--space-id 会同时进入 query SpaceID 和 X-Nvqos-Space-Id header
bytedcli nvqos dataset list --region sg --space-id 23 --page-size 50

# 按名称过滤数据集
bytedcli --json nvqos dataset list --region cn --space-id 1 --name sample-dataset
```

## Root Cause Analysis

优先用显式参数构造请求；复杂请求可以用 `--body-file` 传完整 JSON。显式参数会覆盖 body 里的同名字段。

```bash
bytedcli --json nvqos rootcause analyze \
  --region sg \
  --space-id 23 \
  --dataset-id 231 \
  --metric sample_metric \
  --aggregate-interval 3600 \
  --start 2026-07-01T16:00:00Z \
  --end 2026-07-02T02:00:00Z \
  --filters-json '[{"Op":"and","SubFilters":[{"Field":"app_id","Op":"in","Values":["123"]}]}]'
```

完整 body 文件示例：

```json
{
  "AggregateInterval": 3600,
  "Dataset": "231",
  "End": "2026-07-02T02:00:00Z",
  "Filters": [
    {
      "Op": "and",
      "SubFilters": [
        {
          "Field": "app_id",
          "Op": "in",
          "Values": ["123"]
        }
      ]
    }
  ],
  "Metric": "sample_metric",
  "SpaceId": 23,
  "Start": "2026-07-01T16:00:00Z"
}
```

```bash
bytedcli --json nvqos rootcause analyze --region sg --body-file /tmp/nvqos-rootcause-body.json
```

## Request shape notes

- `Dataset` 需要传字符串形式的数据集 ID，例如 `"231"`；CLI 的 `--dataset-id 231` 会自动作为 `Dataset` 传入。
- `AggregateInterval` 仅支持 `60`、`300`、`3600`、`86400`；未传时 CLI 默认补 `3600`，JSON 输出会在 `defaults_applied.AggregateInterval` 里标出。
- `Filters` 必须是 JSON array，结构与 NVQoS 后端一致，支持 `Op`、`Field`、`Values`、`SubFilters`。
- `Operator` 可以传入，但后端通常会用 JWT 解析出的用户名覆盖它。
- `--analysis-dim` 和 `--scene` 都支持重复传或逗号分隔。

## JSON output preference

Agent 调用默认加 `--json`，并把它放在 domain 前：

```bash
bytedcli --json nvqos space list --region sg
bytedcli --json nvqos dataset list --region sg --space-id 23
bytedcli --json nvqos rootcause analyze --region sg --body-file /tmp/nvqos-rootcause-body.json
```
