# 时间索引库 — 分层时间索引规范

> 目标:按时间检索——「X 月做了什么」「这个项目何时定的方向」。**层级化、索引化、近期高优**。
> **本文件 = TIMELINE 结构唯一权威**:所有写入主体(主 agent 里程碑行、人调 update、用户显式指令)都按本文件结构写,不各自内联规则。
> 纯 markdown、绝不产飞书。落点:`hub/timeline/TIMELINE.md`(+ 按需 `hub/timeline/records/`;经 runtime 软链等价,见 `memory-management` §路径解析)。

## 一、日志不进索引

`hub/timeline/` 整目录进 `.bmignore`,pattern 只能写单段目录名 `timeline/`——`should_ignore_path` 只做单个路径分量匹配,`hub/timeline/` 这种多段写法**静默失效**。

依据:hub 928 个向量 chunk 里 timeline 占 **577 条 = 62.2%**(2026-07-29 实测)。25 个日志文件吃掉六成召回预算,而它们回答的问题(「X 月做了什么」)本来就按日期定位,不需要语义检索。

**代价必须明写,不叫零损失**:ignore 一个已索引路径 = 删除 entity 并级联删关系。hub 现有 120 条 relation 中 **62 条**源自 TIMELINE → 卡片的反向链接,它们会一起消失——「这张卡什么时候被提到过」的时间维遍历不再由 BM 提供,改由 ripgrep 承担(§二)。

TIMELINE 条目**仍写** `[[卡片名]]`,但它不再产生 BM relation,只作为 ripgrep 锚点与人读跳转。

## 二、检索路径

| 问题 | 走法 |
|---|---|
| 「X 月做了什么」 | Read `hub/timeline/TIMELINE.md` 的 `## YYYY-MM` 段;该月已拆分则读 `records/YYYY-MM.md` |
| 「某关键词何时出现过」 | `rg -n '<关键词>' <repo>/hub/timeline/` |
| 「这张卡什么时候被提过」 | `rg -n '\[\[<slug>\]\]' <repo>/hub/timeline/` |
| 「最近 N 天哪些卡片文件被动过」 | `<repo>/bin/bm tool search-notes --project hub --after_date '30d' --page-size 5` |

`--after_date` 过滤的是**文件 mtime**(sync 时写进 entity 的 `updated_at`),**不是** frontmatter 的 `updated` 字段。clone、迁移、批量改写会把 mtime 整片重置,所以它只能回答「这个文件最近被动过」,回答不了「这条知识什么时候成立」——**时间维的权威是 TIMELINE 正文**,这条命令只用来交叉验证 TIMELINE 有没有漏记。实测(2026-07-29,0.22.1):bytedance 461 条 entity 的 `updated_at` 全部戳在 clone 那一刻;hub 侧 `--after_date '30d'` 不带 query 返回全部 59 条 entity = 整库,必须配 `--page-size` 收口。

## 三、层级结构(两级半,按需生长)

```markdown
# 时间线(Timeline)
> 维护说明一行

## {YYYY-MM 当月}                        ← 近期高优:周块 + 任务级条目,详细
### Week {起}~{止} — {本周主线一句}
- {MM-DD} [{项目}] {里程碑一句:完成了什么/定了什么} → [[定位卡名]]
- …(倒序,新在上)

## {YYYY-MM 历史月}                      ← 压缩:月摘要段(3~6 行要点 + 链接)
{该月主线与关键里程碑要点;详情链 [[定位卡]] 或 records/YYYY-MM.md}
```

- **条目粒度 = 任务级里程碑**(阶段/模块/收尾/方向决策),不是日流水、不是逐会话(判据见 `update-rules.md`)。
- **upsert 幂等**:条目按「日期+项目」判重——有则更新该行,不重复追加;周块按 `### Week` 锚。

## 四、月滚动与拆分

- **月滚动**:跨月后第一次任务收尾时,由主 agent 顺手做,或用户人调 update 时做——把上月压成月摘要段。**没有任何定时任务做这件事**,不要按「每周/每月自动」预期(责任主体一览见 `update-rules.md` §四)。
- **拆分阈值**:某月内容超长(>80 行)才拆 `hub/timeline/records/YYYY-MM.md`,主文件留摘要 + 链接(按需生长,不预建)。

## 五、历史层(record 时代存量,内容保留不改)

`hub/timeline/records/{YYYY-MM-DD}.md` 日记 = 2026-07-02 前旧机制产物(原 `hub/timeline/records/`,随本次重构整体移入 `timeline/`,只换位置不改内容)。原样保留、可被链接;**新增日记不强制**(用户显式「记日报」才写,格式沿用旧约定:`## {HHMM} {任务名}` + 目的/要点/相关文件,append 幂等)。骨架见 `../templates/record_fragment.md`。

⚠ 下游注:`feishu-daily-report`(compile.md)以当日 record 日记为源——record 禁用后该供给已断;将来要出飞书日报,需用户口述/产出回读补源,勿在此处找原因。

## 六、红线

- ⛔ 绝不创建/发布任何飞书文档(日报是 feishu-daily-report 的事)。
- ⛔ TIMELINE 条目只 upsert 不重复;历史日记只 append 不覆盖。
- ⛔ 日志移出索引 ≠ 删除内容——一个字都不删,只是不进 BM 检索。
- ⛔ 移动文件与修改内容必须分成两个 commit;同批会走 delete+new 路径,丢 `created_at` 与关系。
- 底层 md 读写交给 `lark-markdown`。
