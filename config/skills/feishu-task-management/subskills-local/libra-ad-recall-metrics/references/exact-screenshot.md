# 精准指标截图

日报、周报和实验记录中的截图统一采用“卡片级”裁剪。目标是让读者打开文档后直接看到被解释的指标，不需要再从整页界面里寻找。

## 截什么

| 场景 | 截图锚点 | 必须完整保留 |
|---|---|---|
| 主报告 | `T&E Catalog 实验指标` | 卡片标题、指标表头、base/v0 与 v1 行 |
| 广告召回中间指标 | 目标 `queue_id` 结果卡片 | `queue_id` 标题、表头、对照组与实验组结果 |
| 商品召回中间指标 | 目标 `dpa_direct_id` 结果卡片 | `dpa_direct_id` 标题、广告消耗、计费比及对照行 |
| 转化事件 | 目标 `external_action_en` 事件卡片 | 事件标题、表头、广告转化量、广告主价值、消耗、计费比及对照行 |

一个截图只对应一个待解释的卡片。日报默认只截主口径；只有用户明确要求 Non Custom Video 时才另截。中间指标严格执行“一支路一图”：主路、目标支路和其他支路分别保存为独立文件，单图不得出现两个 `queue_id`、`dpa_direct_id` 或事件标题，不得把两个卡片拼成一张长图，也不得将同一长图复用到多个 branch。

## 不截什么

- 顶部导航、实验页签、左侧指标树；
- 日期、过滤器、模板选择器、下载按钮；
- 相邻卡片的标题或内容；
- 点击 ADVV 后出现的 P-Value 弹窗；
- 大片空白、浏览器边框、鼠标提示；
- “调试中”“暂无数据”等状态页。无有效结果时直接写明状态，不用截图填位。

## 简单截图方法

1. 打开目标报告并等卡片完整渲染；先读取页面快照，确认结束日无“数据产出中”。
2. 用卡片标题或分组标题精确定位锚点；主报告优先定位 `.ad-graph-header__name`，深度分析定位目标 `queue_id`、`dpa_direct_id` 或 `external_action_en` 标题。
3. 从锚点向上找到“同时包含卡片标题和唯一结果表”的最近容器，但不要直接采用容器的整宽。截图边界取“标题顶部 + 结果表底部 + 最后一个可见指标列右边缘”的并集；页面为了布局保留的右侧空白不属于截图。
4. 若先点击 ADVV 读取 p 值，读完后再次点击原数值关闭弹窗，再截图。
5. 有效内容边界只加 6–10 px 内边距；若浏览器后端返回的 DOM 坐标含窗口偏移，先用一张预览图校准本次会话的偏移，之后复用，禁止把某台机器的固定偏移写进长期规则。
6. DOM 截图只是原始图，禁止直接交付。每张图必须一次运行本 skill 的准备工具；它会完成四边像素收紧并硬验收：

   ```bash
   python3 scripts/prepare_metric_card.py \
     --input raw-card.png \
     --output final-card.png
   ```

   工具会把四周收紧到卡片像素边界，并硬验收 `horizontal_fill >= 0.97`、`right_gap_px <= 10`。退出码非 0 就是不合格，不得靠肉眼说“看起来可以”，也不得把 `raw-card.png` 写进飞书。
7. 只验收 `final-card.png`：开头是唯一目标卡片标题，结尾是该卡片 v1 行底部；四周无导航、筛选器、弹窗和下一张卡片标题。像素工具只解决横向留白，若露出第二个支路、`Non Custom Video` 或相邻卡片，必须先收紧浏览器截图的纵向边界，再重新运行工具。批量任务还要确认不同 branch 的最终文件路径不重复。

同一批日报应复用同一浏览器窗口、同一缩放和同一裁剪函数，保证图片宽度、字号和留白一致。图片写入飞书时按正文宽度居中显示，不额外添加重复标题或说明。`prepare_metric_card.py` 通过后仍需做一次快速视觉回看：确认唯一目标标题、完整表头/base-v0/v1、没有相邻支路；视觉回看只检查卡片身份和纵向边界，不再手工估算像素。

## 写入或替换飞书图片

- 新增图片时，显示高度必须由 `final-card.png` 的真实宽高比计算，不能沿用另一张图片的尺寸。
- 替换既有图片 block 时，不能只替换 token。必须在同一个 `replace_image` 请求里同时传入新图的 `width`、`height`，其中 `height = round(display_width * source_height / source_width)`；否则飞书会保留旧尺寸并压扁新图。
- 回读图片 block，确认 token、文件名、width、height 均已更新；再检查 `width / height` 与最终图片宽高比的相对误差不超过 1%。
- 日报中最终引用的只能是通过硬验收的 `final-card.png`；原始 DOM 图和未同步显示比例的图片都视为未交付。

在 Node REPL 浏览器会话中可复用下面的最小函数。`offset` 是本次浏览器会话用预览图校准出的窗口偏移，不跨机器固化；锚点必须先通过新鲜页面快照确认唯一。函数按标题与表格的并集取框，不使用整块报表容器的宽度。

```js
globalThis.captureMetricCard = async function ({
  tab,
  anchorText,
  file,
  occurrence = 0,
  offset = { x: 0, y: 0 },
  margin = 8,
}) {
  const anchor = tab.playwright.getByText(anchorText, { exact: true }).nth(occurrence);
  if (await anchor.count() !== 1) throw new Error(`截图锚点不唯一: ${anchorText}`);

  const rect = await anchor.evaluate((el) => {
    let panel = el;
    while (panel && panel.querySelectorAll("table").length !== 1) panel = panel.parentElement;
    if (!panel) throw new Error("未找到只含一个结果表的卡片容器");
    const a = el.getBoundingClientRect();
    const t = panel.querySelector("table").getBoundingClientRect();
    const x = Math.min(a.left, t.left);
    const y = Math.min(a.top, t.top);
    return { x, y, width: Math.max(a.right, t.right) - x, height: t.bottom - y };
  });

  const clip = {
    x: Math.max(0, rect.x - offset.x - margin),
    y: Math.max(0, rect.y - offset.y - margin),
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
  const bytes = await tab.screenshot({ clip });
  const fs = await import("node:fs/promises");
  await fs.writeFile(file, bytes);
  return { file, clip };
};
```

函数只负责首轮 DOM 裁剪；输出必须保存为 `raw-card.png`，再由 `scripts/trim_metric_card.py` 生成唯一可交付的 `final-card.png`。禁止手工估算“再向左几像素”作为常规方法，因为网页容器宽度和设备像素比会持续变化。页面卡片不是单表结构时，先定向确认容器。
