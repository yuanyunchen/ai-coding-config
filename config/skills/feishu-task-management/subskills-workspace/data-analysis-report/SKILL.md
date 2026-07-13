---
name: data-analysis-report
description: "字节内网数据分析项目的端到端工作流:iDA 取数 → 多窗/控池分析 → 报告(**飞书 docx 交付,不产 HTML**)。统管「过程·口径·行文·语言·质量·检查」六件事,**编排并引用** ida-presto-query / lark-doc-writer / chart-gen,不重复其细节。**写之前必读两份成稿飞书 docx 模版**(见 §0)。触发:数据分析报告、增量分析、cid 召回分析、广告算法离线分析、iDA 取数做报告、给 mentor/老板的分析交付。"
---

# 数据分析报告 · 端到端工作流(字节内网)

> 「在字节做一个数据分析交付」的总编排:取数 → 分析 → 报告 → 飞书交付 → 托管。子能力**引用既有 skill,不在此重复**;本 skill 装 ① 编排顺序 ② 本域口径/行文/语言/质量/检查要求 ③ 两份必读成稿模版。
>
> **子能力取用注意**:`ida-presto-query` / `analytical-report` / `bytedance-internal-hosting` 现为 `feishu-task-management` 的**内部伪 skill**(已摘除全局注册,`Skill()` 直调不到)——经飞书入口按需 `Read ~/.codex/skills/feishu-task-management/subskills-local/<域>/SKILL.md`(派子智能体时把该路径写进 prompt)。

## 0 · 何时用 + 必读模版
- **何时用**:mentor/老板派的离线数据分析(如「search vs pixel city 信号增量」),要产出可决策报告 + 可分享链接。动手前先查 bytedance 域库(`<global-memory>/bin/bm tool search-notes --project bytedance "<问题>"`)拿口径/背景/历史结论,别重复研究。
- **必读模版(写之前先打开读,照它们的结构/口径/语言写)**:
  - 核心 · 决策向:https://bytedance.us.larkoffice.com/docx/RJCAdp9bjosJeDxUN68uimfMsAf
  - 完整 · 同行复核:https://bytedance.us.larkoffice.com/docx/VLwRdYOqVoPeyMxzg5tubfDEsqg

## 1 · 取数 → 用 `ida-presto-query`
- **先定数据源口径**:底表 + 分区(p_date)+ 关键 flag(如 recall_flag / 信号定义),记进报告附录供复现。
- 大窗超时 → 一致采样 `mod(user_id,N)=0` 压到 1/N,**先在有全量答案的窗校验无偏再外推**(全局 Rule 11)。粘贴法/朴素 SQL/多 tab/窗口模板全在 `ida-presto-query`。
- **地理字段是 geoname id**:画图/写国名/大洲前必须 id→name,否则轴和结论里是裸 id。

## 2 · 分析方法(本域硬约定)
- **多窗**:同一算法在 3天/1周/2周/1月各跑,看增量随窗怎么变(四窗层层包含、可比)。
- **控池**:体量比(2.99×)会被质疑「是不是 search 池子大」;取两源**都出现过的同一批人**再比(7.4×)才消掉池差 —— **控池是主结论,体量是辅**。
- **口径一致**:同一个量别在不同图用不同算法报出不同数(覆盖图 `approx_count_distinct` 261.3M / 维恩·分解 精确 257.5M / 信号量 采样 266M)。统一到一个口径或每处显式标算法;**headline 优先级 精确 join > approx(±2%)> 采样外推(标上界)**;比值比绝对数稳健;点明「最该信的精确数」。

## 3 · 行文 · 语言 · 质量 · 检查(用户要求,逐条照做)
### 3.1 行文逻辑
- **结论先行**:先抛判断/数字,再展开支撑;**标题结论导向**(h2 = 一句话结论,不是"XX 分析")。
- **环环相扣**:每节收尾一句桥接引出下一节,逻辑不断档;**渐进披露、推理不跳步**。
- **方法学放后面**:口径/采样/控池法等放正文末(靠近附录)。
- **读图三拍**:每张图配「数字 → 为什么 → 怎么用」三句。
- **按主题归大点**:同类图必须同节 —— 时间图(控池随窗+趋势)全进「随时间」、地理图(国家+大洲)全进「地理」,别散落;章序 总览→真增量→覆盖(+分布)→随时间→地理→怎么用→诚实/方法→口径/附录。
- **结论突出**:每大点标题下加一行「结论」callout,写**落地含义/so-what,不复述标题**(callout 样式见 references/skey.css)。
- **开头精简**:封面只放 背景一句 → 一句话结论 → 一句话边界(离线体量≠召回,要 A/B),三段就够,别把窗口阶梯/反例堆开头。
- **双版(docx 核心 + 完整)**:核心(决策向,一屏看懂、只放最强证据)+ 完整(同行复核,全量+趋势+附录),互链。

### 3.2 语言风格
- **去 AI 味**:自然语言,不加「一图带走/如图所示」这类元解释旁注;**无 emoji**;不堆空泛形容。
- **平白 + 控制字数 + 可读性优先**:短句、可扫读;密表压成「一句结论 + 图」。
- **具体例 + 真实数字**,多源材料消化后**综合**成自己的论述,不拼接原文。(全局 AGENTS Rule 7/8)

### 3.3 质量 / 口径要求(诚实是底线)
- 采样数标「估计/上界」;**反例不藏**(南美·大洋洲 pixel 反超、27 国反占优);推导值标「已校验」;断线不插值。
- 「全新」= 本窗未观测 **≠** 永久增量;离线增量体量 **≠** 召回涨幅(要 A/B);信号行数 = 原始事件量 **≠** 意图强度。
- **每个数字带口径标签、可追溯到具体 query**;**同一个量跨图同口径、同数**(否则各处显式标算法,口径一致见 §2);数据准确、用真实数值。
- 图要直观且**成比例**(面积精确维恩:圆面积∝用户数、透镜面积∝交集,别用固定重叠画示意,见 references/area-venn.js)。

### 3.4 检查逻辑
- **先定可验证成功标准,再循环到达成**(全局 Rule 1);自己做计划 → 执行 → 审查。
- **跨图对数(出厂前必做)**:同一个量在 KPI 卡/维恩/覆盖图/正文必须是同一个数,或各自显式标算法。
- 改结构时**数字多重集核对改前后一致**(只搬不改、零丢失)。
- **≥4 路并行子智能体对抗审查**(内容口径 / 视觉 / 结构逻辑 / 质疑);**每路 agent 的 prompt 自带本报告口径事实 + 验收标准**(子智能体不自动继承,全局 Rule 6)。
- 采样**先在有全量答案的窗校验无偏**再外推;结构有争议**取 raw-dump 真值**,别信单个 agent 的解读。

## 4 · 报告产出
- **交付 = 飞书 docx**(照 §0 两份飞书 docx 模版的结构/口径/语言),写作通则走 `lark-doc-writer`。图表用 `chart-gen` 渲 SVG → 截 PNG → `lark-doc-writer` 媒体嵌入(`+media-insert`);读图三拍方法见 §3.1。
- ⛔ **不产 HTML**(用户 2026-06-25:产出文档用飞书 docx,**不维护 HTML** —— HTML 在飞书 Preview 不跑 JS 图、且维护负担重)。**模版即 §0 两份飞书 docx,不引用任何数据分析 HTML**:analytical-report 的 `core.html`/`full.html` 双版**不用于本工作流**(其读图三拍/诚实口径 *方法论* 可借鉴,但**产物只出 docx**,不建 HTML)。

## 5 · 飞书交付 → 用 `feishu-task-management`(官方 lark-cli)
- 飞书 docx 是**原生在线文档,本身即可分享链接**(无需 HTML 托管 / Goofy / Preview 渲染那一套);章序/图序/结论行与 §0 模版一致。
- **lark-cli 执行 + 同步坑见全局** `~/.codex/skills/feishu-task-management/memory.md`(block_move OT 冲突→create+delete;raw-dump 验真;权限/分享不自动改)。

## 6 · 收尾 → 用 `/workspace-checkpoint`(task-workspace v2;原 `record` 已于 2026-07-02 禁用)。

## references
- **模版(必读)**:核心 docx `RJCAdp9bjosJeDxUN68uimfMsAf` / 完整 docx `VLwRdYOqVoPeyMxzg5tubfDEsqg`(§0 链接)。
- `references/area-venn.js` — 面积精确维恩(二分解圆心距使透镜面积∝交集,含 SVG stub)。
- `references/skey.css` — 「结论」callout 样式(变量带 fallback)。
