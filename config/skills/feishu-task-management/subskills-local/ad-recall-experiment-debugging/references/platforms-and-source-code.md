# 平台、文档与源码入口

## Libra

- ROW/SG Libra flight：`https://libra-sg.tiktok-row.net/libra/flight/<flight_id>/edit`
- 检查项：实际开始时间、traffic、shared base、实验参数、region/机房、版本状态。
- “已创建”不代表“已在线”；看运行状态和实际开始时间。

## Metrics

- EU：`https://metrics-fe-eu.tiktok-row.org/`
- TTP：`https://metrics-fe-ttp-us.tiktok-row.org/`
- 使用当前机房页面创建查询；不要把 EU 查询链接改 host 后直接假设 tags 完全一致。

## TCC / Cloud

| 机房 | 入口 | 常用 namespace |
|---|---|---|
| EU | `https://cloud-eu.tiktok-row.net/tcc/namespace/<namespace>` | `ad.link.tiktok`、`ad.enginecpp.tiktok`、`ad.targeting.tiktok` |
| TTP | `https://cloud-ttp-us.bytedance.net/tcc/namespace/<namespace>` | 同上，以页面实际 namespace 为准 |
| ROW | `https://cloud.tiktok-row.net/tcc/namespace/<namespace>` | 同上，以页面实际 namespace 为准 |

当前项目常见配置：

- Link Search key：`cs_intent_center_search_city_config`
- Engine Pixel profile key：`ole_ads_user_ids_intent_pixel_profile_list`
- Search profile key 的命名在历史页面和源码间可能有差异；搜索 `ole_ads_user_ids_intent_search_profile_list` 与 `ole_ads_user_intent_search_profile_list`，最终以 Online 配置和读取代码为准。

Travel 拆 quota 参数放在实验参数 `ad` 对象末尾，当前项目口径为：

```json
"enable_travel_industry_split": true,
"enable_travel_include_lead": false,
"enable_travel_include_app": false,
"params_rerank_industry": {
  "90": 3,
  "91": 3
}
```

这组参数影响行业拆分/配额，不应用来解释更上游的 Intent、Engine strategy key 或 PrepareXidOp 缺失。

版本检查要点：

1. 找到标记为 `Online` 的版本，不用 `Latest` 替代。
2. 保存 Online 与候选版本号、发布时间、发布 region。
3. 对目标 intent key 做集合 diff，输出 added/removed/changed。
4. Link 发布成功只证明 Link 层发布，不证明 Engine profile 已上线。

## Intent Center 配置文档

- [Intent Center 召回实验配置说明](https://bytedance.larkoffice.com/wiki/NJ6Hwb7vbiyJDckTmpfcGGsQn7b)
- 文档关联的监控说明可能需要额外权限：[监控文档入口](https://bytedance.larkoffice.com/wiki/Y5CIw7oogiR3ZekCRj6cjtoin04)

当前项目已验证的配置关系：Libra 参数通过 Link 的 `intent_center_cs_infra_only{N}_exp_keys` 引用具体 config key。不同机房/链路的 `{N}` 可能不同，不能机械复制。

## 源码证据

### Targeting

- [错误码定义：`RC_ERROR_RECALL_ID_NOT_FOUND`](https://code.byted.org/ad/tiktok_treetargeting/blob/HEAD/src/common/targeting_error_code.h#L142)
- [PrepareXidOp map key / vector 检查](https://code.byted.org/ad/tiktok_treetargeting/blob/HEAD/src/op/prepare_xid_op.cpp#L377)
- [FetchXidResultOp](https://code.byted.org/ad/tiktok_treetargeting/blob/HEAD/src/op/fetch_xid_result_op.cpp)

判读：PrepareXidOp 在 strategy map 中找不到 `engine_strategy_name`，或对应 vector 为空时返回 `100921`；此时尚未进入 FetchXidResultOp。

### Engine

- [profile 配置路由](https://code.byted.org/ad/treeengine/blob/HEAD/src/context/user_profiles/profile_configs.cpp#L92)
- [Search intent parser](https://code.byted.org/ad/treeengine/blob/HEAD/src/context/user_profiles/shopping_ads_intent.cpp#L1218)
- [Pixel strategy 写入分支](https://code.byted.org/ad/treeengine/blob/HEAD/src/context/user_profiles/shopping_ads_intent.cpp#L1255)

当前读到的关键差异：`ole_intent_center_search` 进入 Search parser；Pixel 路径存在把 intent 写入 strategy recall 的调用。排查时应在目标线上 commit 再确认，不把 HEAD 的实现自动等同于线上版本。

## 浏览与权限方法

- 优先复用已登录 Chrome 会话打开内网页面；一个浏览后端失败时再换可用后端。
- 只申请完成诊断所需的 Viewer/只读权限，记录申请单链接。
- 未获发布授权时不点击 Enable、Publish、Start、Complete creation 等改变线上状态的按钮。
