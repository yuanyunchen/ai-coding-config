# 时间索引库 — 分层时间索引规范(原「time 子模块」升级版)

> 目标:按时间检索——「X 月做了什么」「这个项目何时定的方向」。**层级化、索引化、近期高优**(R10)。
> **本文件 = TIMELINE 结构唯一权威**:所有写入主体(主 agent 里程碑行、memory-weekly-check 整理、用户显式指令)都按本文件结构写,不各自内联规则。
> 纯 markdown、绝不产飞书。落点:`global-memory/hub/TIMELINE.md`(+ 按需 `timeline-records/`;经 runtime 软链等价,见 `memory-management` §路径解析)。

## 层级结构(两级半,按需生长)

```markdown
# 时间线(Timeline)
> 维护说明一行

## {YYYY-MM 当月}                        ← 近期高优:周块 + 任务级条目,详细
### Week {起}~{止} — {本周主线一句}
- {MM-DD} [{项目}] {里程碑一句:完成了什么/定了什么} → [[定位卡名]]
- …(倒序,新在上)

## {YYYY-MM 历史月}                      ← 压缩:月摘要段(3~6 行要点 + 链接)
{该月主线与关键里程碑要点;详情链 [[定位卡]] 或 timeline-records/YYYY-MM.md}
```

- **条目粒度 = 任务级里程碑**(阶段/模块/收尾/方向决策),不是日流水、不是逐会话(判据见 update-rules.md)。
- **月滚动**:跨月时 memory-weekly-check 把上月压成月摘要段;某月内容超长(>80 行)才拆 `timeline-records/YYYY-MM.md`,主文件留摘要 + 链接(按需生长,不预建)。
- **upsert 幂等**:条目按「日期+项目」判重——有则更新该行,不重复追加;周块按 `### Week` 锚。

## 历史层(record 时代存量,保留不迁)

`timeline-records/{YYYY-MM-DD}.md` 日记 = 2026-07-02 前旧机制产物,原样保留、可被链接;**新增日记不强制**(用户显式「记日报」才写,格式沿用旧约定:`## {HHMM} {任务名}` + 目的/要点/相关文件,append 幂等)。
⚠ 下游注:`feishu-daily-report`(compile.md)以当日 record 日记为源——record 禁用后该供给已断;将来要出飞书日报,需用户口述/产出回读补源,勿在此处找原因。

## 红线
- ⛔ 绝不创建/发布任何飞书文档(日报是 feishu-daily-report 的事)。
- ⛔ TIMELINE 条目只 upsert 不重复;历史日记只 append 不覆盖。
- 底层 md 读写交给 `lark-markdown`。
