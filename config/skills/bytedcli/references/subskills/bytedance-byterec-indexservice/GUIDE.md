---
name: bytedance-byterec-indexservice
description: "Query Byterec index service product/config/model list, XCenter APIs/resources, Viking service config, ByteKV deploy review, Viking DB debug/resource operations, and the same component's Holmes IndexService proto/record debug capabilities via bytedcli. Use when tasks mention index service、product、config、XCenter、Viking service config、Viking flags、Viking flag update、ByteKV 部署、Viking DB、Viking recall、DSL、data center、feature center、recall center、proto、record、PSM、service ID、正排索引服务产品信息、正排索引服务配置、XCenter API、Viking 服务配置、Viking flags 修改、一键部署 ByteKV、Viking DB 查询、Viking DSL 执行、proto 查询、record 读取."
---

# bytedcli Byterec Indexservice, XCenter, and Viking DB

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

- Byterec indexservice 查询会跟随全局 `--site` / `BYTEDCLI_CLOUD_SITE` 自动选择控制面；默认使用 `BYTEDCLI_CLOUD_SITE=i18n-tt` 或 `--site i18n-tt`

## When to use

- 查询指定 PSM 的 Byterec index service 产品信息（`byterec indexservice product get`）
- 查询指定 PSM 的 Byterec index service 配置（`byterec indexservice config get`）
- 检查 XCenter 页面 URL 并生成推荐命令（`byterec xcenter inspect-url`）
- 读取 XCenter allow-listed API 或资源快捷查询（`byterec xcenter api get`、`byterec xcenter data-center profile list`）
- 预览或提交 XCenter allow-listed 写请求（`byterec xcenter api write`、`byterec xcenter feature-center procedure create`）；默认 dry-run，只有传 `--yes` 才提交
- 使用 data-center 显式辅助命令访问前端已确认的 profile query、data source auth/schema/pb、task filter、DSL get/save/validate/debug/diff/publish/profile/depend 等 API
- 使用 feature-center 显式辅助命令访问前端已确认的 raw/extracted feature list、debug session、procedure branch/file/diff/compile/publish 等 API
- 使用 recall-center 显式辅助命令访问前端已确认的 recall link、config file/tree、compile/status/log/result/publish、resource/cluster 等 API
- 按 namespace/keyword 查询 Byterec 模型配置列表，并判断是否绑定 Viking serving（`byterec model list`）
- 查看 Viking DB database/model/data/pipeline/GDPR/sync 资源（`byterec viking database get`、`byterec viking model-db get` 等）
- 执行 Viking DB debug recall / DSL 查询（`byterec viking debug recall`）或查看 model meta / embedding
- 查询或更新 Viking service 配置文件元数据、正文或单行 flag，并将选中的服务集群配置部署到 ByteKV 生成 review URL（`byterec viking service-config get` / `update` / `deploy --target bytekv`）
- 预览或提交 Viking DB 写请求；默认 dry-run，只有传 `--yes` 才提交
- 在 Holmes 平台查询同组件的 IndexService debug proto 列表/创建/详情（`holmes indexservice proto list` / `create` / `get`）
- 在 Holmes 平台按显式参数读取 IndexService record，并解码 `message`（`holmes indexservice record get`）
- 查询 record / group info 时，默认直接进入 Holmes proto / record 链路；不要先查询 `byterec indexservice product get`
- 需要机器可读结果供脚本或 Agent 继续处理时，使用 `--json`

## 前置条件

- Byterec 查询会跟随全局 `--site` / `BYTEDCLI_CLOUD_SITE` 路由控制面：`i18n*` -> VA/SG，`us-ttp*` -> US，`eu-ttp` -> EU，`cn` -> CN
- 首次使用前先按目标站点执行：`BYTEDCLI_CLOUD_SITE=<site> bytedcli auth login --session`
- 结构化输出使用 `--json`，并且它是全局参数，必须放在 `byterec` 或 `holmes` 之前
- `byterec indexservice product/config get` 要求显式传 `--psm`
- `byterec xcenter api write` 和资源写命令默认只输出 dry-run 计划；传 `--yes` 才会提交写请求
- `byterec viking api post|put|delete` 和 Viking 资源写命令默认只输出 dry-run 计划；传 `--yes` 才会提交写请求
- `byterec viking api get|post|put|delete` 仅允许访问 Viking DB allow-list path；优先使用资源化命令
- `byterec viking service-config get` 面向 `ns_tag=viking` 的 Byterec service 配置；不传 `--file` / `--conf-id` / `--all-files` 时只列配置文件元数据，传选择器时读取并解码配置正文
- `byterec viking service-config update` 修改一个精确的 `-flag=value` 行；必须传 `--flag <name>` 与 `--value <value>`，并用 `--file` 或 `--conf-id` 选中单个配置文件；默认 dry-run，只有传 `--yes` 才提交
- `byterec viking service-config deploy --target bytekv` 基于 `/viking/service/<service_id>/overview` 的服务集群部署配置到 ByteKV；不传集群选择器时列出可选集群，传 `--all-clusters` 或 `--cluster <id-or-name,...>` 选择，默认 dry-run，只有传 `--yes` 才提交并返回 review URL
- `holmes indexservice proto list` 支持显式传 `--service-id`，也支持传 `--psm` 自动解析 Holmes 自己的 `service_id`
- `holmes indexservice record get` 要求显式传 `--service-id` 或 `--psm` 二选一，以及 `--idc`、`--index-name`、`--key`、`--service-type`、`--shard-num`、`--pb`、`--pb-class`

## Quick start

```bash
# 查询 index service 产品信息
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec indexservice product get --psm example.indexservice.psm

# 查询 index service 配置
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec indexservice config get --psm example.indexservice.psm

# 以 JSON 形式获取产品信息
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec indexservice product get --psm example.indexservice.psm

# 以 JSON 形式获取配置
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec indexservice config get --psm example.indexservice.psm

# 检查 XCenter 页面 URL 并获取推荐命令
bytedcli byterec xcenter inspect-url --url 'https://example.byted.org/rec_platform/data_center/profile?product=sample-product&entrance=sample-entrance'

# XCenter 通用读取 API
bytedcli byterec xcenter api get --path /api/restful/xcenter/homepage

# XCenter 资源快捷查询
bytedcli byterec xcenter data-center profile list --product sample-product --entrance sample-entrance

# XCenter 写请求默认 dry-run
bytedcli byterec xcenter feature-center procedure create --body-json '{"name":"sample-feature"}'

# 明确传 --yes 才提交写请求
bytedcli byterec xcenter feature-center procedure create --body-json '{"name":"sample-feature"}' --yes

# XCenter data-center：查询 profile value
bytedcli byterec xcenter data-center profile-extra query \
  --product sample-product \
  --profile-name sample-profile \
  --primary-key sample-key

# XCenter data-center：保存 DSL，默认 dry-run
bytedcli byterec xcenter data-center dsl save --body-json '{"product":"sample-product","name":"sample-dsl","type":"profile","code":"demo"}'

# XCenter feature-center：查询 raw features
bytedcli byterec xcenter feature-center feature-extra raw-list \
  --product sample-product \
  --raw-feature-keyword sample-feature

# XCenter feature-center：读取 procedure 文件
bytedcli byterec xcenter feature-center procedure-code file-get \
  --product sample-product \
  --name sample-procedure \
  --file-path main.py

# XCenter feature-center：编译 procedure，默认 dry-run
bytedcli byterec xcenter feature-center procedure-code compile --body-json '{"product":"sample-product","name":"sample-procedure","compile_description":"demo"}'

# XCenter recall-center：查询 recall link
bytedcli byterec xcenter recall-center recall-link-extra list \
  --product sample-product \
  --keyword sample-recall

# XCenter recall-center：读取 config tree
bytedcli byterec xcenter recall-center config-file tree --recall-id 123

# XCenter recall-center：发布配置，默认 dry-run
bytedcli byterec xcenter recall-center compile-extra publish --body-json '{"recall_id":123}'

# 查询模型配置列表（示例：按 version 关键字过滤）
BYTEDCLI_CLOUD_SITE=us-ttp-bdee bytedcli byterec model list \
  --namespace demo_namespace \
  --keyword 1234 \
  --page 1 --page-size 50

# Viking DB：查看 database / model
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking database get --db-mod-id 1001
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking model-db get --viking-db-id 1001 --db-model-id 2001

# Viking DB：执行 debug recall DSL
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec viking debug recall \
  --model-id 2001 \
  --context-id sample-context \
  --random-emb random \
  --topk 3 \
  --dsl-json '{"op":"and","conds":[{"field":"status","op":"=","value":0}]}'

# Viking service：按 PSM 查询配置文件列表
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config get --psm example.viking.service

# Viking service：读取指定配置文件正文
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec viking service-config get \
  --psm example.viking.service \
  --file viking_service.flags

# Viking service：从控制台 URL 的 service_id/conf_id 直接读取配置正文
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec viking service-config get \
  --service-id 12345 \
  --conf-id 67890

# Viking service：预览单个 flag 修改，默认 dry-run
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config update \
  --psm example.viking.service \
  --file viking_service.flags \
  --flag max_batch_size \
  --value 14

# Viking service：明确传 --yes 才提交修改
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config update \
  --service-id 12345 \
  --conf-id 67890 \
  --flag max_batch_size \
  --value 14 \
  --yes

# Viking service：列出可部署到 ByteKV 的服务集群
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config deploy \
  --target bytekv \
  --service-id 12345

# Viking service：选择部分服务集群部署到 ByteKV，返回 operation review URL
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config deploy \
  --target bytekv \
  --service-id 12345 \
  --cluster 10001,demo-cluster-b \
  --yes

# Viking DB：写请求默认 dry-run；明确传 --yes 才提交
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking data create --body-json '{"db_mod_id":1001,"data":[{"id":"sample-id"}]}'
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking data create --body-json '{"db_mod_id":1001,"data":[{"id":"sample-id"}]}' --yes

# Holmes 平台：列 debug proto（显式 service_id）
bytedcli holmes indexservice proto list --service-id 12345

# Holmes 平台：按 PSM 自动解析 Holmes service_id 后再列 proto
bytedcli holmes indexservice proto list --psm sample.service.psm

# Holmes 平台：创建 debug proto
bytedcli holmes indexservice proto create --name SampleRecordPb --content 'message SampleRecordPb { string id = 1; }'

# Holmes 平台：按 proto_id 获取 proto classes
bytedcli holmes indexservice proto get --proto-id 1001

# Holmes 平台：读取 record 并自动尝试解码 message（显式 service_id）
bytedcli holmes indexservice record get \
  --service-id 12345 \
  --idc sg1 \
  --index-name sample_index:v1:sample \
  --key record-key \
  --service-type sample_service \
  --psm sample.psm \
  --shard-num 2 \
  --pb SampleRecordPb \
  --pb-class SampleRecordPb

# Holmes 平台：按 psm 自动解析 Holmes service_id，并把同一个 psm 写入 debug 请求
bytedcli holmes indexservice record get \
  --psm sample.service.psm \
  --idc sg1 \
  --index-name sample_index:v1:sample \
  --key record-key \
  --service-type sample_service \
  --shard-num 2 \
  --pb SampleRecordPb \
  --pb-class SampleRecordPb

# 等价的站点写法
bytedcli --site i18n-tt byterec indexservice product get --psm example.indexservice.psm
```

## Viking service config workflow

Viking service 配置是 `ns_tag=viking` 的 Byterec service 配置，不是 `byterec indexservice config get` 返回的 `ns_tag=index_service` 配置。

推荐流程：

1. 先用 `byterec viking service-config get --psm example.viking.service` 列出配置文件元数据；也可以从控制台 URL 中取 `service_id` 后传 `--service-id 12345`。
2. 需要正文时再用 `--file viking_service.flags`、`--conf-id 67890` 或 `--all-files` 读取并解码配置；JSON 模式读取 `config_files[].decoded_text`。
3. 修改 flag 时先 dry-run：`service-config update --file viking_service.flags --flag max_batch_size --value 14`。`--flag` 只写名称，不写 `-` 前缀，也不要写成 `max_batch_size=14`。
4. 确认输出里的 `Before` / `After` 后再加 `--yes`。命令只替换一个精确匹配的 `-flag=value` 行；缺失、重复匹配或 no-op 都会拒绝。真实提交会读取最新 `versioned_conf`、写回完整 base64 文件，并重新读取同一个 `conf_id` 校验目标行。
5. 部署 ByteKV 前先运行 `service-config deploy --target bytekv --psm example.viking.service` 列可选服务集群；`--cluster` 同时支持 Byterec service cluster id 和集群名，不是 TCE cluster id。真实部署必须选择 `--all-clusters` 或 `--cluster`，并加 `--yes`，成功后查看 `operation.review_url`。

常用命令序列：

```bash
# 1. 按 PSM 找到 Viking service，并列出配置文件
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config get \
  --psm example.viking.service

# 2. 读取 flags 文件正文；也可以把 --psm + --file 换成 --service-id + --conf-id
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec viking service-config get \
  --psm example.viking.service \
  --file viking_service.flags

# 3. 先 dry-run 修改一个 flag，检查输出里的 Before / After
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config update \
  --psm example.viking.service \
  --file viking_service.flags \
  --flag max_batch_size \
  --value 14

# 4. 确认无误后提交；如果来自控制台 URL，推荐用 service-id + conf-id 精确选择文件
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config update \
  --service-id 12345 \
  --conf-id 67890 \
  --flag max_batch_size \
  --value 14 \
  --desc 'demo flag update' \
  --yes

# 5. 先列出可部署 ByteKV 的服务集群，确认 Byterec cluster id / TCE cluster id
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli byterec viking service-config deploy \
  --target bytekv \
  --psm example.viking.service

# 6. 选择集群部署到 ByteKV，并从输出读取 operation.review_url
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json byterec viking service-config deploy \
  --target bytekv \
  --service-id 12345 \
  --cluster 10001,demo-cluster-b \
  --yes
```

## 输出说明

- `product get` 文本输出包含：`Byterec Service`、`Byterec Resource Summary`、`Byterec Clusters`、`Byterec Authorization`、`Byterec Topology`、`Byterec Config Files`
- `config get` 文本输出包含：`Byterec Service`、`Byterec Platform Constants`、`Byterec Config Variables`、`Byterec Env Variables`、`Byterec Distribution Variables`、`Byterec Config Files`
- `xcenter inspect-url` 文本输出包含识别出的 capability、route、product、entrance 和推荐命令；已知页面会映射到对应 list API，例如 data profile、data task、data source、index、feature procedure、feature graph、recall link 等页面
- `xcenter api get` 与资源快捷查询在文本模式输出请求 path 和返回 JSON；JSON 模式返回完整结构化结果
- `xcenter api write` 与资源写命令未传 `--yes` 时输出 dry-run 请求；传 `--yes` 时返回提交后的响应
- `viking service-config get` 文本输出包含 `Byterec Viking Service`、`Byterec Platform Constants`、配置文件表；读取正文时会附带解码后的配置文本块，JSON 模式返回 `decoded_text`
- `viking service-config update` 文本输出包含 dry-run/submitted 模式、service/config 标识、版本、校验状态，以及修改前后的 `-flag=value` 行；JSON 模式返回结构化 `change`
- `viking service-config deploy --target bytekv` 文本输出包含 dry-run/submitted 模式、服务标识、可选服务集群表、已选集群、operation id 和 review URL；JSON 模式返回结构化 `clusters`、`selected_clusters`、`operation.review_url`
- `holmes indexservice proto list` 文本输出包含最终使用的 `service_id`、可选的 `Resolved From PSM`，以及 proto 列表分页表格
- `holmes indexservice proto create` 文本输出包含 `Name`、`Request ID`、`Message`
- `holmes indexservice proto get` 文本输出包含 proto classes 表格
- `holmes indexservice record get` 文本输出包含最终使用的 `service_id`、可选的 `Resolved From PSM`、请求参数、record items，以及解码后的 `decoded_message` / `decode_error`
- JSON 模式会返回完整结构化结果，适合脚本或 Agent 继续处理
- 部分表格块在数据为空时可能不会显示，这是正常行为

## Authentication

Byterec indexservice 查询会复用目标控制面对应站点的登录态。首次使用前可执行：

```bash
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login --session
BYTEDCLI_CLOUD_SITE=us-ttp bytedcli auth login --session
BYTEDCLI_CLOUD_SITE=us-ttp-bdee bytedcli auth login --session
BYTEDCLI_CLOUD_SITE=eu-ttp bytedcli auth login --session
BYTEDCLI_CLOUD_SITE=cn bytedcli auth login --session
```

Holmes IndexService 调试命令使用 Holmes 的 BDSSO CAS 登录态。首次使用前可执行：

```bash
bytedcli auth login --session
```

如需先确认当前认证状态：

```bash
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth status
bytedcli auth status
```

## Notes

- 当前覆盖四组能力：Byterec 平台下的 `product get` / `config get`、Byterec XCenter 下的 `inspect-url` / `api get` / `api write` / 资源快捷命令、Byterec Viking service config get/update/deploy，以及 Holmes 平台下的 `proto list` / `proto create` / `proto get` / `record get`
- 查询 record / group info 时，默认直接进入 Holmes proto / record 链路；只有用户明确要求 product/config 平台信息时，才查询 Byterec `product get` / `config get`
- `byterec` 侧命令必须显式传 `--psm <psm>`
- Holmes 与 Byterec 是两套平台，`service_id` 不共用同一命名空间；在 Holmes 侧可用 `--psm` 自动解析 Holmes 自己的 `service_id`
- `holmes indexservice record get` 中，`--psm` 会同时用于解析 Holmes `service_id`，并作为 debug 请求体里的业务字段
- **当 Holmes record 查询存在多个可用 `pb` / `pb-class` 候选时，必须先向用户展示候选并使用 `AskUserQuestion` 让用户明确选择；不能由 Agent 自行决定最终使用哪一个**
  - **当 Holmes record 查询不存在可用 `pb` / `pb-class` 候选时，必须先向用户说明这个问题，并使用 `AskUserQuestion` 让用户选择新建 proto 还是检查其他参数是否出错**
  - **如果用户选择新建 proto，必须先向用户索取 proto 定义，再执行 `holmes indexservice proto create`；不能自行猜测或补写 proto 内容**
- `holmes indexservice record get` 不会自动 create proto，也不会自动查询 proto class；`--pb` 和 `--pb-class` 需要显式传入
- `--json` 是全局参数，必须放在 `byterec` 或 `holmes` 之前
- Byterec 侧会按全局站点自动路由控制面，默认建议使用 `i18n-tt`；Holmes 侧按默认 Holmes 站点执行
- Byterec index service 配置与 Viking service 配置是不同 `ns_tag` 的服务配置；查询或更新 Viking service 配置时使用 `byterec viking service-config get` / `update`，不要用 `byterec indexservice config get`
- 更新 Viking service config 时先运行不带 `--yes` 的 dry-run，确认 `Before` / `After` 后再加 `--yes`；命令会读取最新配置、只替换一个精确匹配的 `-flag=value` 行、提交完整 base64 配置文件，并重新读取同一个 `conf_id` 校验目标行
- 部署 Viking service config 到 ByteKV 时以 service overview 的服务集群为准；`--cluster` 同时支持 Byterec 服务集群 id 和集群名，不是 TCE cluster id。先不带选择器运行 `deploy --target bytekv` 查看可选集群，再用 `--cluster` / `--all-clusters` 选择并加 `--yes` 部署
- XCenter 写命令默认 dry-run；只有用户明确传 `--yes` 才会提交写请求

## References

- `skills/bytedance-byterec-indexservice/../../invocation.md`
- `skills/bytedance-byterec-indexservice/../../troubleshooting.md`
- `src/cli/commands/byterec/indexservice.ts`
- `src/cli/handlers/byterec/indexservice.ts`
- `src/cli/commands/byterec/xcenter.ts`
- `src/cli/handlers/byterec/xcenter.ts`
- `src/cli/commands/byterec/viking.ts`
- `src/cli/handlers/byterec/viking.ts`
