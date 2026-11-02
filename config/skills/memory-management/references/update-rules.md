# 更新规则 — 全局记忆的写入纪律(设计核心)

> 管全局三库(定位/时间/知识)的写入;工作区文件归 workspace-management(边界见其 spec §11),两者分工互不越界。工作区 update 例程只管工作区内部,不碰全局(其边界不因本文件改变)。

## 一、无痕边界(2026-07-02 用户裁决)

- **记忆桶(三库内容:定位卡 / 时间条目 / 知识条目)= 直接操作**:不提示、不审批、不在回复里汇报——静默落盘。可审计与可回滚靠:每条 `updated` 日期 + 枢纽 git 历史(**commit 永远是人的动作**,触发层不写 git,见 §四)。
- **harness 桶(更改/新增 AGENTS.md 规则、skill)= 走 harness-management update 流程**(按其模式×层级定审批,缺省 none),永不无痕。
- **硬判别(防绕门):按内容性质定桶,不按落点文件定桶**——凡属行为约束(该怎么做 / 禁忌 / 流程 / 触发条件)即 harness 桶,哪怕想写成"知识条目"落枢纽也不行;事实 / 状态 / 偏好取值 / 环境信息 = 记忆桶。

## 二、模式与双入口(v3,2026-07-03;防两向架空)

**模式**(记在枢纽 MEMORY.md 头部模式行;缺省 = auto,维持「里程碑无痕自动」既有裁决):
- **--none**:不自动写三库,人调命令才更。
- **--auto(缺省)**:里程碑自动——命中下列判据之一,顺手做「全局 update 三小件」;三库与实际出现较大出入时自动跑 modules/update.md 例程。
  - 判据(写死):任务收尾/归档;阶段完成或方向性决策落定;重要模块/交付完成;用户裁决把一件事定型。
  - 三小件:刷本项目定位卡现状行(+status/updated)→ TIMELINE 补任务级一行(结构=time-index.md)→ 恒真知识条目入检索库(有才写)。
  - **不逐会话、不逐工作项**(工作项粒度归工作区任务节点的 progress.md;逐会话写=已废 record 的覆辙);也不许「攒到一定程度」被解读成从不写——收尾或人调 update 时按 drift 判据自查(0 条 vs 有活动、或条数 ≥ 活动数×3),异常列进报告。**没有自动调度器兜这条**,判据靠这里写死。
- **--full**:即时更新,决策/事实一定型即写对应库;新 session 接入或换项目自动跑 modules/recall.md 定向。

**双入口**:自动 = auto/full 模式下 agent 直接执行 `modules/update.md`(不 invoke 命令);手动 = 对话指令或 /project-update 分发(单层 command 已撤销 2026-07-03;原 memory-update 命令 skill 更早已归档)。

## 三、冲突仲裁与纠错

- 仲裁序:**工作区 task.md 上层原话(v3 = requirement/)> 工作区实物 > 全局记忆**——全局记忆与工作区不一致时,以工作区为准修全局(全局是指针,不是真相源)。
- 消解留痕:改动条目刷 `updated`;成批修正由人工 commit 留历史(触发层不碰 git);语义性矛盾(两处目标表述打架)列给用户,不擅裁。
- 红线:**不静默删除任何记忆内容**(合并/删除只出建议)。
  - **切片不是删除,红线不挡切片**:正文超 6,000 字符时按 `## ` 段落搬到 `hub/_detail/<slug>/`,原文逐字完整保留、每片仍进索引(规范 = `project-index.md` §三);搬完卡片正文变短,总内容一个字不少。日志移进 `hub/timeline/` 并退出索引同理——只改可检索性,不改内容。
  - 仍受红线约束的是三种真删:删卡片文件、删正文段落而不留落点、把内容「总结」成更短的转述。这三种只出建议给用户,不静默做。
  - 这条边界必须写死:旧版红线没有区分「搬移」与「删除」,直接把压缩一并抑制掉,是 21.5 KB/天 退化速率的三个成因之一(另两个 = `modules/update.md` 全流程无体积检查、`project-index.md` 旧厚卡豁免,后者已 override 删除)。

## 四、维护主体一览(谁写什么)

**写记忆内容的只有两个主体:主 agent 与人调。** 定时层只做索引同步与体检,一个字的记忆内容都不写。

| 主体 | 写什么 | 触发 |
|---|---|---|
| 主 agent(纪律) | 按模式:auto=里程碑三小件;full=即时;none=不写 | 命中判据时(auto)/ 即时(full) |
| 人调(对话指令 / /project-update 分发 → modules/) | 补记 + 冲突消解 + drift 自查 + TIMELINE 月压缩(跨月后第一次收尾时顺手做,见 `time-index.md` §四)/ 只读定向检索 | 用户需要时 / 任务收尾时 |
| **触发层 L2**(launchd `com.yunchen.global-memory-maintain` → `<repo>/bin/maintain.sh`,`StartInterval` 900) | **不写记忆内容**:`bm reindex -p hub`(detached;`git status --porcelain` 非空则整轮跳过)→ `build-index.py --check` → `lint.py --json` → 写 `~/Library/Logs/global-memory/lint.json` | 每 900 秒 |

- **L2 不做任何 git 写操作**(不 pull / 不 stash / 不 add / 不 commit / 不 push),也不 reindex `bytedance`。
- **L2 在不在跑,自己查,别假设**:`launchctl print gui/501/com.yunchen.global-memory-maintain` 有输出才算已装;
  没输出 = 未 bootstrap,索引同步与体检都不会自动发生,此时收尾前手动跑一次 `<repo>/bin/maintain.sh`。
- 对账职责(悬空 `[[wikilink]]`、正文本地路径的两跳可达)= L2 跑的 `lint.py` 里 `wikilink-dangling` 与 `link-broken`/`path-missing` 两项检查,**不另设周度调度器**。

L1/L3 不写内容,只拦截与告警:**L1** = `PostToolUse` hook(`~/.claude/hooks/memory-lint-guard.py`),单文件正文超 6,000 字符或 frontmatter 不合规当轮回灌给模型;**L3** = `SessionStart` hook,把上次 `lint.json` 结果打进 context,让后台失败在下一个 session 可见。两者装没装看 `~/.claude/settings.json` 的 `hooks` 段。

## 五、写入后门禁(2026-07-29 新增)

任何一次三库写入(agent 无痕落盘 / 人调 update)收工前必须跑:

```bash
<repo>/bin/lint.py --path <本轮改过的每个文件>     # 不带 --path 则全库
```

退出码非 0 即失败,**当轮修掉**,不留给下一次巡检。写入方要自查的检查项:正文 >6,000 字符 / frontmatter 顶层缺 `type`·`status`·`updated`·`topics` / 双 frontmatter 块 / 悬空 `[[wikilink]]` / 正文本地路径存在性 / `status` 值不在枚举内 / `.bmignore` 多段 pattern;完整清单与编号以 `bin/lint.py` 文件头为准。索引行长度**不设阈值**(派生区里的已完结聚合行本就是刻意的长行),体积只对 `hub/MEMORY.md` 总字符数报 warning。

执行点必须在写入那一刻:实测单张活跃卡一天追加 21.5 KB(字节),事后巡检追不上这个速率。L1 的 `PostToolUse` hook 用同一套判据硬挡,`lint.py` 是它的手动入口。

**索引同步不归你**:agent **不得**自行跑 `bm reindex` / `bm reset` / `bm format`(reindex 无并发保护);`bm sync` 在 basic-memory 0.22.1 **不存在**,任何写着它的流程都是错的。只读的 `bm tool search-notes` / `bm status` / `bm doctor` 随便用。改完 md 只跑 `build-index.py` 与 `lint.py`,入库交触发层 L2。
