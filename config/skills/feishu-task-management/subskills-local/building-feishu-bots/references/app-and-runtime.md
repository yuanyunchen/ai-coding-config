# 应用与运行桥接

## 应用侧

1. 创建独立内部自建应用，名称、描述和头像面向目标群成员。
2. 启用 Bot，设置最小可用范围；测试阶段只包含管理员和测试群。
3. 配置 `im.message.receive_v1`，选择 persistent connection。
4. 申请并发布群 @ 接收、消息读取/回复、reaction 所需权限。权限新增后重新发布版本，不把“后台已勾选”当作已生效。
5. 为应用建立固定 bot profile；不要切换或覆盖用户默认 profile。App Secret 只经 stdin/系统钥匙串保存。

## 事件桥接

2026-08-03 使用 `lark-cli 1.0.65` 实测：

- `event consume` 的 ready marker 在 stderr，格式为 `[event] ready event_key=<key>`；`--quiet` 会同时隐藏它。
- `im.message.receive_v1` 的 stdout 是处理后的扁平 NDJSON，不含可用于证明真实 @ 的完整 mentions。
- 长会话中 `received` 可以增长，但不同 CLI 版本的 stdout 刷新时机必须实测；`--max-events 1` 虽能在单条消息后立即交付 NDJSON，却会在断开与重连之间形成真实订阅空窗。2026-08-04 的 6 条突发测试中有 2 条只存在于群里、事件入口完全未收到，因此单事件轮换不能作为生产默认。
- 用 bot 身份按 `message_id` 读取消息详情后，正文位于 `data.items[].body.content`，mention 为扁平 `mentions[].id/key`，sender 为 `sender.id`；返回项可能不含 `chat_type`。
- open_id 具有应用/身份作用域；bot 事件与 user profile 查到的同一成员 ID 可能不同。
- 回复/发送的幂等键有长度边界：64 字符 SHA-256 键实测返回 `field validation failed`，32 与 40 字符稳定哈希键成功。实现统一使用已验证的 40 字符 SHA-256 前缀；不将未实测的长度概括为平台上限，也不直接传长报告 ID、chat_id 或正文。

因此桥接必须：

1. 从事件流只接收 event/message ID 和事件元数据；立即以 `0600` 权限写入不含正文的 durable ingress。远端读取尚未成功时不能把 flat body、sender 或 chat 当成授权事实。
2. 调单消息详情接口读取权威 chat、sender、mentions、body；可重试网络失败时，用同一 Bot 身份的批量消息读取接口按同一 message ID 兜底。两者都失败时保留 ingress，按有界退避重试并在达到上限后进入 dead letter；永久错误失败关闭。
3. 将 mention 转成内部统一结构。若事件订阅本身只投递群 @ 消息，则“事件已由飞书投递”是主要触发证据：权威详情里的 mention 缺失、作用域错配、列表内混有不完整项或返回结构不完整，只能作为诊断信号；解析时跳过坏项，不能因一个坏项或整段 mention 不可用而把真实群消息静默丢弃。运行时仍拒绝非群消息和 Bot 自发消息；正文安全校验失败后清理 ingress，不保留正文，也不进入后台重试循环。mention 元数据可用时用于清理正文中的 @ 占位符；不可用时可只移除开头的飞书 mention 占位符，再把正文交给 Codex 判断。
4. 门禁通过后用不含正文的元数据持久 claim；发送 reaction 前原子进入不可被其他实例领取的 `before_send` 状态。远端明确未发送才可重试；结果未知时标记 `unknown_send`，不能因租约到期自动重发。所有 post-claim 异常必须原子转入可恢复状态；过期 `claimed` 可安全接管。确认成功后持久标记 reacted，再原子入队；入队失败重试时从 reacted 阶段继续，不重复 reaction。凭证、绝对路径和被拒绝正文不得进入长期账本。
   对历史 `unknown_send` 的处置也要 fail closed：先用 Bot 身份按原消息、reaction、reply 关系交叉回读。已发则补账，明确未发才可用原幂等键重试；租户权限使远端结果不可证明时，只能转为无正文的终态隔离记录并永不重放，不得伪装成“确认已发/未发”。
5. 状态账本必须支持实际生产线程模型：可以由单一状态线程串行写入，也可以让每个 worker 使用独立 SQLite connection；不能把默认线程绑定的 connection 跨 worker 共享。并发实现必须用真实多线程测试验证。
6. 生产事件消费优先使用已实测能持续吐出 NDJSON 的长连接（例如当前版本的 `max-events=0/timeout=0`），不要在每条消息后主动断开。无界消费进程的 stdin 要保持打开；2026-08-04 实测将 stdin 连到 `/dev/null` 会让 EOF 被当作停止信号、进程代码 5 反复重连，真实 @ 会掉进空窗。必须轮换时采用 ready-before-stop 的重叠切换：新 consumer 已出现精确 ready 后才停止旧 consumer，并继续用账本按 event ID 防重。子进程异常退出时先排空 stdout reader，再立即重连。真实发布前连续发送至少 10 条全新突发消息，并加入一次服务重启，证明持续订阅、权威读取和 durable ingress 均不丢事件。
7. 事件一进入本地就先持久化 arrival 顺序，再做远端详情读取与授权。远端慢、重试或旧事件晚恢复时，不得以 worker 启动/完成顺序覆盖真实到达顺序。无效事件可在门禁后标记排除，但旧请求不能因晚恢复抢回 latest 或 final 发布权。
8. progress 与 final 外发前都要经过持久化 publication claim，不只做一次内存 latest 检查。新消息已到达时，旧请求即使刚好越过“检查→发送”边界也不得再发进度或结果。
9. 外发成功后先持久化 assistant turn 和回复关系，再标记 complete 并清理 recovery 文件。在“群里已可见→本地记账”窄窗崩溃时，要保留可恢复证据，以同一幂等键回读并补齐历史，不得重复发送。

reaction 的开放平台 `emoji_type` 大小写敏感。桥接器只接受已验证的枚举；未知值在发请求前 fail closed。可从多个已验证表情中结合语境选择，避免把单一表情固化成所有消息的默认值。客户端表情名称、悬浮提示或视觉相似表情不能当作 API 枚举。每次新增自动使用的枚举，都要以真实 Bot 身份完成创建、查询和删除 smoke，不能只依赖文档或单元测试。

## 事件唤醒

2026-08-04 使用 `codex-cli 0.146.0` 的本地 `version` / `exec --help` 和无副作用 smoke 验证：非交互运行支持 JSONL 输出、独立 final 文件与 `exec resume <thread_id>`。`--sandbox`、`--add-dir` 是 `exec` 层参数，续接时必须放在 `resume` 子命令之前；新会话与续接会话要保持同一写域，否则多轮追问能读上下文却无法写进度或领域任务。具体实现前仍按已安装版本重新跑 help/smoke，版本或参数不匹配时 fail closed。

允许事件完成单个 reaction 后，桥接器为该 `event_id` 触发一次智能处理运行：

1. 每条通过门禁的新业务消息都启动或续接一次 Codex；不得由本地业务解析器、关键词路由、日报快照或固定模板代替 Codex 生成最终答案。快照、索引和解析候选只能作为输入上下文。
2. 同一 `chat_id + sender_open_id + child_workspace` 在上次成功回复后 15 分钟内续接明确的 `thread_id`，并附带近期 turns；过期后新建。禁止 `resume --last`，不同群、人员或子工作区不能复用。
3. Codex 自主选择直接回答、读取工作区/记忆、调用只读领域工具、执行已授权控制动作或追问。运行时不规定固定业务话术，也不要求先生成结构化槽位或按关键词决定处理方式。
4. 子进程使用参数数组与 `shell=false`，设置并发、输出和总时限；同一会话串行，不同会话有限并发。复杂查询可有较长窗口，但不能自动叠加成无界重试。总时限从事件首次持久化接收时间计算，重启、恢复和重试只继承剩余时间，不能重新获得一整段时限。
5. 运行时只对身份与敏感信息、应用级权限或凭证变更、重复发送、未经回读的高风险外部变更，以及明确的对象身份冲突做硬校验。当前群订阅、日报名称、关注项、中间指标、格式和调度等用户明确要求的任务配置不属于权限扩张，应允许 Codex 自主执行。领域结果中的 region、日期、T/NT、模板等差异先作为诊断交给 Codex 判断；只有用户明确指定的 flight 与实际 flight 不同，或来源不是权威 Libra/来源指向另一实验时，才阻止受影响结果。空 business final 不是可发布答案，但最终尝试仍无可用结果时要给一句简短、非技术、可见的状态，不能让用户无限等待。
6. Codex 决定是否需要进度回复并给出自然文案；运行时只负责反应、进度与最终消息各自幂等。已有事实可以直接一次答完，慢任务可先确认再补结果，不能用固定确认模板抢答。
7. 事件运行只处理当前交互，不顺带生产日报；定时日报仍由对应子工作区计划产生，桥接器只幂等推送已验收交付。
8. 成功 final 非空且通过必要门禁后回复原消息；同一事件只有一个 running owner 和一个最终回复。可用回复不因略长于旧展示阈值而整体作废，但仍保留与平台容量和隐私相符的上限。失败或发送状态未知时保留可恢复状态，不盲目重发；所有执行尝试结束仍无业务结果时，使用同一最终回复幂等链路给出一次简短状态。
9. 没有有效群消息事件时不启动 Codex；明确的非群消息或 Bot 自发消息仍拒绝。已由群 @ 事件订阅投递的消息，不得仅因权威 mention 元数据缺失或 ID 作用域不一致而拒绝；无事件时不以 heartbeat 轮询 inbox。
10. 回复中的链接必须在飞书客户端可点击并落到正确页面。控制变更、新文档和调度变更只有在真实回读确认后才能声称生效。
11. 领域任务只有一个执行 owner：若 daemon 已监听 `DOMAIN_TASK` 并自动执行，prompt 只让主 Codex 写任务并等 `DOMAIN_RESULT`，不能再让它自行启动同一个派发命令。事件重试前清掉该事件上次的 task/result/dispatch 临时状态，但保留已发送进度和最终回复的幂等记录。
12. 进度回复先远端发送成功再落“已发送”记录；发送失败不能伪装成已送达，也不能阻塞最终结果。稳定幂等键负责覆盖发送成功与本地记账之间的窄故障窗。

## 常驻与健康

- 服务重启时先刷新当前 Bot profile 对应的事件总线连接，再启动新的长连接 consumer；刷新失败只记内部健康状态并继续按 ready marker 验证，避免沿用旧 daemon 的失效连接。这个动作只影响本应用的消费连接，不对群里播报“恢复、重试、上下文保留”等内部过程。
- pending 恢复必须复用事件首次 user turn 的任务归属，不能因后来出现新对话而重绑。普通 pending 不能只在启动时扫一次：如果启动恢复恰好遇到未过期 lease，主循环必须在 lease 过期后周期重访并接管，否则事件会永久卡在 claimed。恢复后仍交给 Codex结合当前对话判断，不在桥接层静默吞掉追问或生成业务答案。
- 2026-08-03 在 macOS LaunchAgent + Apple Command Line Tools Python 3.9 实测：后台进程直接从 `~/Desktop` 读取 venv 会触发 `Operation not permitted`；验证方式为实际 bootstrap 后读取 `pyvenv.cfg` 失败。安装时把 app、venv、私有 config、ledger、log、inbox 与 push spool 复制到 `$HOME/Library/Application Support/<app-slug>/`，LaunchAgent 不直接扫描 Desktop 工作区。
- 安装成功不能只看文件复制或 plist 存在。安装器要执行旧服务卸载、schema migration、新服务 bootstrap/kickstart，并验证旧 PID 退出、新 PID 启动、ready marker、新 schema 和 source/install 一致。macOS `bootout` 后立即 `bootstrap` 可短暂返回 EIO；2026-08-04 真实发布验证需要有界重试窗，最终仍以新 PID/ready 而不是命令 exit 0 为准。
- 服务启动后等待精确 ready marker；未 ready 不报告健康。
- 即使没有新群消息，也按配置间隔扫描已验收日报。
- SIGTERM 时优雅终止 event consumer，不使用 `kill -9`。
- macOS LaunchAgent 的 PATH 默认不包含用户安装目录；安装时动态发现 `lark-cli` 目录并写入 EnvironmentVariables，同时保留系统 PATH。
- LaunchAgent 的 `ThrottleInterval` 只影响服务进程异常退出后的拉起，不能拿来弥补每条消息主动断开 consumer 的订阅空窗。事件 consumer 应在服务进程内保持长连接或做重叠切换。
- 日志只记录事件状态、耗时和错误分类；不记录正文、token、secret、绝对路径或完整命令输出。
- 外部只读查询队列繁忙只影响依赖该队列的工具调用，不阻止 Codex 使用已有事实回答，也不阻止本地安装、服务重启和无关验收；不得用无关资源门禁冻结整个发布流程。

## 主智能体接缝

桥接器在私有 runtime root 下生成 `inbox/pending/<event_id>.json`，并按上节事件协议唤醒一次主智能体运行。成功回复后清除 pending 正文并写去重状态；失败则保留可恢复状态。是否需要进度确认、是否调用领域工具以及如何表达，由主 Codex 结合当前问题和近期对话判断。日报验收完成后由日报生产运行通过已校验 CLI 写入 runtime push spool，daemon 不直接读取 Desktop 交付目录，也不自行重新生产日报。
