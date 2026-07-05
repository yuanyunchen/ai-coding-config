# {任务名} — MEMORY(agent 记忆主入口;住 .agent/MEMORY.md)

> 模式:workspace={none|auto|full} · harness={none|auto}(workspace=spec §8:none 不自动更/auto 大模块结束或出入较大时 update/full 先写后行动;harness=项目内覆写 harness-management 全局缺省;复用前、派发前须更到为真恒成立)。保持一屏读完;过长拆文件不删信息。

## 1. 定位
{方向 / 负责人 / 当前阶段,≤3 行}

## 2. 现状与进度
{当前态摘要 + checkbox 待办;细节引 .agent/memory/progress.md 或 task 节点,不在此展开}

## 3. 用户偏好与规则指针
{本工作区生效的用户偏好、须遵守的规则/skill 文件 path;只放指针不复制正文}

## 4. 核心索引(单层,只引下一跳)
### 内部(.agent/)
{memory/ 各文件、活跃 task 节点、note、requirement 总结:path + 一句话用途}
### 共用区
{context/ 输入清单;deliverables/ 交付清单}
### 能力层路由表(.agent/skills|agents;按需 Read 加载,非 harness 自动——不登此表 = 不存在)
{一行一个:名 | 触发条件 | SKILL/定义文件路径 | 一句话用途;根 .claude/ 的 hooks 等执行物也登记;无则写「无」}
### 外部源(仅本任务相关)
{飞书 doc/夹 token、外部代码路径:token/path + 一句话;任务 profile 必含飞书任务夹 URL}

## 5. 关键决策
{一行一条,含日期;update 冲突消解的留痕也记这里}
