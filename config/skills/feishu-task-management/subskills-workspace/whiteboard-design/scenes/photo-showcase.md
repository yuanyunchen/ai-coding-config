# 图片展示 (Photo Showcase)

适用于：用户**显式要求使用图片/配图/插图**的场景（如"画一个带配图的旅行路线"、"做一个有图片的产品展示"）。

> **注意**：仅当用户明确说了「图片/配图/插图/照片」等词时才进入本场景。单纯说"旅行路线图"、"产品展示"等不触发。

> [!IMPORTANT]
> **本机无原生画板工具，此场景仅作构图参考。** 原生画板的图片节点要求把图片先上传到画板换取 media token——本机白名单做不到。本文件保留的价值是**图文卡片的构图范式**（卡片网格 / 路线时间线 / 中心辐射，统一尺寸、3:2 比例、卡片间距）。真要落地：图文混排走 `frontend-design-pro`（SVG/HTML），或退回画板工具链（SKILL.md 落地路径 ③）。
>
> 仅当用户明确说了「图片/配图/插图/照片」等词时才考虑本场景；单纯说"旅行路线图""产品展示"不触发。

## Content 约束

- 图片 3-6 张，每张配标题（必需）+ 简短描述（可选，15字内）
- **每张图必须是不同的真实图片**（不同 media token），下载时用不同关键词/URL
- 下载后用 `ls -l` 比较文件大小确保每张图不重复
- 文字仅作辅助说明，图片是信息主体

## Layout 选型

| 模式 | 适用条件 | 特征 |
|------|---------|------|
| **卡片网格（默认）** | 多图平级展示（产品墙、团队介绍、美食推荐） | horizontal frame 内放等尺寸图文卡片 |
| **路线时间线** | 有先后顺序（旅行路线、团建路线、项目演进） | 图文卡片 + connector 串联 |
| **中心辐射** | 有一个核心主题 + 周围子项 | 中心标题 + 周围图文卡片 |

## Layout 规则

- **图文卡片结构**：vertical frame（图上文下），image 宽度 = 卡片宽度，height 按 3:2 比例
- **卡片统一尺寸**：所有卡片宽高一致（推荐 240×280 或 200×250）
- **图片统一尺寸**：所有 image 节点用相同 width/height（推荐 240×160 或 200×133）
- **卡片间距**：gap: 24（比纯文字图表间距更大，让图片呼吸）
- **卡片样式**：白色底 + 圆角 12 + 细边框，image 无圆角（紧贴卡片顶部）
- **有序路线时**：卡片间用 connector 连接，connector 放顶层 nodes 数组

## 骨架示例

### 卡片网格（产品展示/团队介绍/美食推荐）

```json
{
  "version": 2,
  "nodes": [
    {
      "type": "frame", "id": "grid", "layout": "vertical", "gap": 24, "padding": 32,
      "width": 840, "height": "fit-content",
      "children": [
        { "type": "text", "id": "title", "width": 776, "height": 36,
          "text": "图表标题", "fontSize": 24, "textAlign": "center" },
        {
          "type": "frame", "id": "row", "layout": "horizontal", "gap": 24, "padding": 0,
          "width": "fit-content", "height": "fit-content",
          "children": [
            {
              "type": "frame", "id": "card-1", "layout": "vertical", "gap": 8, "padding": [0, 0, 12, 0],
              "width": 240, "height": "fit-content",
              "fillColor": "#FFFFFF", "borderWidth": 1, "borderColor": "#E0E0E0", "borderRadius": 12,
              "children": [
                { "type": "image", "id": "img-1", "width": 240, "height": 160, "image": { "src": "<token_1>" } },
                { "type": "text", "id": "t-1", "text": "标题", "fontSize": 14, "width": 216, "height": 20 },
                { "type": "text", "id": "d-1", "text": "简短描述", "fontSize": 11, "textColor": "#666666", "width": 216, "height": 16 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

每张图文卡片结构相同，复制并替换 `<token_N>`、标题和描述即可。3 张卡片一行，超过 3 张换行（嵌套第二个 horizontal frame）。

### 路线时间线（旅行路线/团建路线）

```json
{
  "version": 2,
  "nodes": [
    {
      "type": "frame", "id": "route", "layout": "vertical", "gap": 24, "padding": 32,
      "width": 1100, "height": "fit-content",
      "children": [
        { "type": "text", "id": "title", "width": 1036, "height": 36,
          "text": "路线标题", "fontSize": 24, "textAlign": "center" },
        {
          "type": "frame", "id": "stops", "layout": "horizontal", "gap": 32, "padding": 0,
          "width": "fit-content", "height": "fit-content",
          "children": [
            {
              "type": "frame", "id": "stop-1", "layout": "vertical", "gap": 8, "padding": [0, 0, 12, 0],
              "width": 240, "height": "fit-content",
              "fillColor": "#FFFFFF", "borderWidth": 1, "borderColor": "#E0E0E0", "borderRadius": 12,
              "children": [
                { "type": "image", "id": "img-1", "width": 240, "height": 160, "image": { "src": "<token_1>" } },
                { "type": "text", "id": "t-1", "text": "第1站：地点名", "fontSize": 14, "width": 216, "height": 20 }
              ]
            },
            {
              "type": "frame", "id": "stop-2", "layout": "vertical", "gap": 8, "padding": [0, 0, 12, 0],
              "width": 240, "height": "fit-content",
              "fillColor": "#FFFFFF", "borderWidth": 1, "borderColor": "#E0E0E0", "borderRadius": 12,
              "children": [
                { "type": "image", "id": "img-2", "width": 240, "height": 160, "image": { "src": "<token_2>" } },
                { "type": "text", "id": "t-2", "text": "第2站：地点名", "fontSize": 14, "width": 216, "height": 20 }
              ]
            }
          ]
        }
      ]
    },
    { "type": "connector", "id": "c1", "connector": { "from": "stop-1", "to": "stop-2", "fromAnchor": "right", "toAnchor": "left" } }
  ]
}
```

注意：connector 必须放在**顶层 nodes 数组**，不能嵌套在 frame.children 内。connector 的属性须包裹在 `connector` 字段中。

## 图片准备检查清单（选图方法论，跨工具通用）

选图 / 配图前确认（无论最终落到 SVG、画板还是文档）：

- [ ] 每张图是**不同的真实图片**（用不同关键词 / URL 获取，下载后用 `ls -l` 比文件大小确认不重复）
- [ ] 所有图片尺寸一致（统一 width×height，如 240×160）
- [ ] 图片宽高比合理（推荐 3:2）
- [ ] 渲染后查看图片内容，确认每张图片与主题相关（图片正确性只能渲染后验证）
- [ ] 未使用随机占位图服务（关键词参数不影响返回内容的图库）
- [ ] 图片来源版权合规（CC0 或类似），避免付费授权 / 使用限制的图库

> 落地提示：原生画板的图片节点需要先把图片上传到画板换 media token——本机无此工具。图文混排优先 `frontend-design-pro`（SVG/HTML 内嵌图），或退回画板工具链。
