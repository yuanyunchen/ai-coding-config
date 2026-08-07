# Spark / Python 任务：body、资源包、算力配置、诊断

> 适用对象 = Dorado 上 `type=spark` / python node 任务（body 是一段 Python，不是 SQL）。
> **SQL 任务的那套（`task-draft update`、`task update -q`）在这里全部不适用**，
> 两者是不同的 CLI 面、不同的草稿存储、不同的失败模式。
>
> **时效三件套**：全文实测于 **2026-07-31**，`bytedcli` **0.101.0**（vendored frozen），
> region `sg`，Spark 3.2.1（平台 vendored），Python 3.7.4，cloudpickle 1.6.0。
> 验证方式 = 每条都由一次真实实例的容器日志或 CLI 回读证实，下文标注了证据形态。

---

## 1. CLI 面：读 body 和写 body 不是同一个命令族

| 要做的事 | 命令 | 陷阱 |
|---|---|---|
| **读 body** | `dorado task code --task-id <数字>` | `task get` 的 `contents` 字段**恒为空**，别拿它当 body |
| **写 body** | `dorado node save --node-id <UID字符串> --content-file F --metadata JSON` | 要 **UID**，不是数字 taskId |
| **反解 UID** | `dorado node resolve-uid --task-id <数字> -p <projectId>` | 返回 `{nodeUid, verified}` |
| **部署** | `dorado node submit --node-id <UID> -p <projectId> --message M` | **commit AND deploy**，见 §2 |

**最贵的一个误判**：`dorado node get --node-id 307430073`（传数字 taskId）对 spark 任务
一律回 `[307430073] does not exist, please check.`
**这句话是命令用错了，不是任务不存在。**

> 当时判定它的方法值得复用：**拿一个确知存活的对象当控制组**——
> 那个 taskId 正跑着实例，`instance get` 一切正常，而 `node get` 说它不存在
> ⇒ 结论只能是命令错。**一个「不存在」在控制组上也复现，就不是关于对象的陈述。**

其它形状差异（都实测过）：

- `dorado node get --node-id UID`（不带 `--json`）打人读格式，**带表头且截断到几百字节**；
  要完整 body 必须 `--json` 取 `data.content`
- `task code` 的输出比草稿**多一个末尾换行**。做 diff 前不对齐，会永远显示「不一致」
- `instance get <id>` 用**位置参数**；`instance log-summary` 与 `instance record` **必须带 `--project-id`**
- `task get-queue-resource --clusters a,b,c --queues q1,q2,q3`：
  **clusters 与 queues 个数必须相等**，否则报 `110218 集群和队列数目不匹配`
  （查三个同集群队列要写 `--clusters harunasg,harunasg,harunasg`）
- 同一 CLI 连续调用放进 shell 循环会偶发空返回；**逐个调用稳定**。
  循环里静默拿到空值再被 `.get()` 成 `?`，看起来像「任务没数据」——实际是调用没成功

## 2. 草稿有两个存储，`update-conf` 和 `node save` 不通

实测：`task update-conf <id> --patch '{"retryNum":1}'` 回 `✓ Successfully updated conf`，
但 `node get --node-id UID` 读到的 `metadata.configuration.innerScheduleParam.retryNum` **仍是旧值**，
且随后的 `node submit` 部署的是 `node save` 那份。

**结论：改 spark 任务的调度参数，唯一有效通道是 `node save --metadata`**（改 JSON 后整份回传）。

**`--metadata` 必须整份带上**。它承载 name/description/queue/cluster/依赖/重试/sparkConf 全部配置，
省略 = 有清空风险。正确姿势：`node get --json` 取出 `metadata` → 就地改那一个键 → 原样传回。

**`node submit` = commit AND deploy。** 只 `node save` 不 submit，线上跑的仍是旧版本——
`task get` 的 `deployed=true` 说的是「有已部署版本」，**不是「你刚存的那份已上线」**。
验证只能靠 `task code` 回读已发布版，比对你写进去的特征串。

**更强的判据 —— `instance.version`。** `task code` 只能验 body，验不了 sparkConf
（配置未必出现在 `launch_container.sh` 里，grep 不到不等于没生效）。
但每次 `node submit` 都会让**任务版本号 +1**，而 `instance get <id>` 返回的
`version` 字段就是**这一跑用的那个版本**。

实测（2026-08-01，带对照组）：失败那跑 `version=22`，修复后重投那跑 `version=23`，
任务 `updateTime=00:15:43`、实例 `startTime=00:16:25` —— **部署晚于失败、起跑晚于部署**，
三者构成完整链条。

⇒ **问「我刚改的东西进这一跑了吗」，唯一直接回答它的是比较两个实例的 `version`。**
配置是否生效可以推不出来，版本是否更新推得出来。

## 3. 资源包（pyFiles / archives）：扩展模块的唯一活路

### 3.1 `--py-files` 送 zip，`.so` 不能从 zip 导入

症状：driver 一切正常，**executor 端 16/16 全败**
`ImportError: No module named 'numpy.core._multiarray_umath'`

原因：`pyFiles` 把 zip 放上 executor 的 `PYTHONPATH`，但**扩展模块（.so）不能从 zip 内加载**。
driver 能跑是因为 body 自己把 zip 解压到临时目录再插 `sys.path`；**executor 没有这一步**。

### 3.2 `archives` 会解包 —— 三条实测事实

在此之前该项目五个任务的 `archives` **全为空**，即无先例可抄。实测得到：

1. **它确实解包**
2. **解包目录名 = 归档文件名，含 `.zip` 后缀**
   证据：`faiss.__file__ = /opt/tiger/yodel/container/travel_catalog_recall_deps_prod_sg.zip/faiss/__init__.py`
   —— 那是个**目录**，名字碰巧以 `.zip` 结尾
3. **它顶替同名的 pyFiles 文件，driver 侧也一样**
   后果：原先 `os.path.isfile(那个路径)` 为真的代码会突然说「未投递」，
   而目录列表里那个名字**明明还在**。判据用 `isfile` 就会给出一句
   「关于错误对象的正确陈述」

格式：`"archives": [{"id": <资源id>, "type": 2}]`，与 `pyFiles` 同形，写在
`metadata.configuration.conf.configuration.operator.parameter.archives`。

### 3.3 解包树的摘要：`__pycache__` 必须排除

想给解包树钉一个指纹时会发现**它在两次运行之间不稳定**。
定位方法（值得复用）：**把一个摘要拆成两个独立分量**——

- `shape` = 路径 + 大小
- `content` = 各文件内容 sha

再加 per-top-level 分解。实测结果：**shape 稳定、content 变化、且只有 `numpy` 一个子树变**。

**「大小相同、字节不同」是 `.pyc` 的签名**：解释器重写 `__pycache__/*.pyc` 时
代码对象不变所以大小不变，只改头部嵌的源文件 mtime。解包给了源文件新 mtime，
第一次导入就触发重写。

⇒ **`__pycache__` 是解释器的产物，不是依赖的一部分，把它排除**。
排除后摘要一次钉住、再跑通过。

> **这不是放宽门禁，是把门禁对准它真正要断言的东西。**
> 同一原则：zip 被解包成目录后没有 zip 可 hash 了，
> 正确做法是把 sha 校验**改写成对目录树的校验**，不是删掉它。

### 3.4 首次钉一个未测量的值：让它 fail-closed 并把测量值打出来

写法：占位符 + 不等就抛，异常消息里带上 observed 值与足够的上下文。
第一跑必然失败，但它**把要钉的值交到你手上**；你刻意钉进去，第二跑通过。

**好处是「钉住」成为一次有意的动作，而不是默认放行。**
副产物：这个门禁**自己就是稳定性检验**——钉完还拒，说明那个量根本不稳定。

### 3.5 重钉指纹之前必须先问「平台上那份是不是我要的那份」

失败信息给你 `pinned=A observed=B`，**最省事的动作是把 A 改成 B，而它可能是错的**。

实测反例：`observed` 那份资源里的一个共享模块是**四个缺陷修复之前**的版本，
盲目重钉等于把已知缺陷钉成权威。
**正确判据 = 拿本地权威副本（受门禁管辖的那份 deliverables）比对**，
三方一致才动手。

## 4. Spark 资源配置：Hive 写入侧的三个默认值会杀掉长任务

全部由**任务自己在异常里点了参数名**，不需要猜：

| 症状 | 真因 | 配置 |
|---|---|---|
| `OutOfMemoryError: Java heap space`，GC 日志显示堆顶死在平台默认值 | **driver 内存与 executor 内存是两套配置**；只调 `executor.memory` 时 driver 一直是默认 | `spark.driver.memory` + `spark.driver.memoryOverhead` |
| `Number of dynamic partitions created is N, which is more than 1000` | Hive `max.dynamic.partitions` 默认 1000 | `spark.hadoop.hive.exec.max.dynamic.partitions` **以及 `.pernode`（默认 100）一起设** |
| `Kryo serialization failed: Buffer overflow. Available: 0, required: N` | 单任务结果超缓冲上限（宽行/向量列常见） | `spark.kryoserializer.buffer.max` + `spark.kryoserializer.buffer` |

### 4.0 只改报错点名的那一个参数 —— 相邻的同名参数语义可能完全不同

**2026-08-01 实测，代价 7 小时 42 分零产出。**

报错点名的是 `spark.kryoserializer.buffer.max`（required 643,306 字节）。
我"顺手"把相邻的 `spark.kryoserializer.buffer` 也设成了 `64m`——
**那是初始缓冲，而且 Spark 文档写明「每个 worker 的每个 core 一个」**。
250 executor × 4 core = 1000 个 64 MB 缓冲，每次序列化都按这个尺寸分配。

后果，带对照组:

| 版本 | 差异 | 结果 |
|---|---|---|
| v22 | 无 kryo 配置 | **1h14m 写出首批分区**，1h58m 失败于 census（buffer.max 不足） |
| v23 | +`buffer.max=1024m` **+`buffer=64m`** | **7h42m，零分区**，driver 常驻 6 GB，周期 `System.gc()` 每次 6 秒 |
| v24 | 只保留 `buffer.max=1024m` | 重投中 |

**判据纪律**:
1. **只改错误信息点名的那一个键。** 相邻键名相似 ≠ 语义相近——
   `buffer` 是**初始分配尺寸**，`buffer.max` 是**上限**，
   一个影响每次分配的成本，一个只在超限时才起作用。
2. 要多改一个键时，先查它的**单位与作用域**（每 core？每 executor？每 JVM？）。
   「每 core 一个」的参数乘上并行度就是集群级开销。
3. **没有报错要求你改的参数，不要改。** 这条是「外科式改动」在配置上的形式。
4. **改到需要的量，不是改到「肯定够」的量。** 同一天的第二次踩：
   报错要 643 KB，我把 `buffer.max` 设成 `1024m`——**1600 倍**。
   它不预分配，但**允许**单个 Kryo Output 长到 1 GB 并被序列化器池持有。
   对照 GC 轨迹：

   | | Full GC 次数 | 常驻 | 堆上限 | 产出 |
   |---|---|---|---|---|
   | 无该配置（成功那跑） | 3 | 218M / 1321M / 218M | ≤ 2.2G | **74 分钟写出首批分区** |
   | `buffer.max=1024m` | 8 | 403M→4744M→6402M→**6795M** | 打到 16G | **4 小时零分区** |

   ⇒ 回到 **Spark 自身默认 `64m`**（仍是实测需求的 100 倍）。
   **「留足余量」在有上限语义的参数上不是安全，是给了它膨胀的许可。**
5. **一个阶段测出来的数，不是另一个阶段的判据。** 同一天的第三次踩，且是被子智能体当场纠正的：
   S4 在 `buffer.max=64m` 上 executor OOM，我据此得出「越大越糟」并要求所有阶段都压到 `2m`。
   反证据立刻出现：**S3 在 `1024m` 上跑了 1h05m、到达 `insertInto`、executor 扛过八次任务重试，没有 OOM。**
   643 KB 是 **S4 数据**的测量值。
   ⇒ **把一次单点观测推广成跨阶段规律，是最容易伪装成"吸取教训"的错误。**
   正确做法：**不是挡路的东西就不要改**——在一个已证明能推进的配置上引入未测量的变量，
   代价是把「它为什么不动」变成一个新问题。


> 识别方法（值得复用）:两次运行只差两个键，一次 1h14m 出产物、一次 7h42m 零产出
> ⇒ **差异必在那两个键里**。不要在「是不是数据变了 / 集群忙了 / 本来就慢」之间猜——
> 队列实测零排队、无异常、心跳正常，**唯一变量就是配置**。

### 4.1 这些配置属于**代码路径**，不属于**任务** —— 修一个任务等于没修

**2026-07-31 实测，代价 1h58m。** 同一个 `Kryo buffer overflow` 在一天里出现两次：
先在 S2 的 `84_.stream_exported_pool`，修好；两小时后在 S4 的
`97_.read_data_census` 又来一次 —— **而 `97_` 是 S2/S3/S4/S5 共用的发布器**。

第一次修的时候，我把它当成了「S2 的问题」，只给 S2 加了配置。
**真相是：溢出是那条 `toLocalIterator` 代码路径的性质，凡是走它的任务都会撞。**
S4 写完全部 1024 个分区、跑满两小时之后，死在同一个地方。

⇒ **判断纪律**：拿到一个 Spark 配置类失败，先问
**「触发它的那段代码，还有谁在调用？」**
调用方多于一个 ⇒ 这是**类级缺陷**，要一次性配齐所有调用方，
或者更好——**把它变成那段代码自己的前置断言**（启动时检查配置是否足够，不足就拒绝并说明），
这样新接入的任务不会重新踩。

同族的还有：`hive.exec.max.dynamic.partitions` 属于**「写 N 个动态分区」这个行为**，
不属于某一张表；凡是写 1024 桶的阶段都要，**漏配的那个会在完整扫描之后才失败**。

> 这就是「规则要放在忘不掉的地方」在 Spark 配置上的样子：
> **散在各任务 metadata 里的配置，等价于「记得加就加」。**

**driver 内存还要看机制侧**：`spark.ui.retainedTasks` 默认 **100,000**。
大扫描 × 高 shuffle 分区 × 多动态分区时任务数轻松过十万，
**UI store 本身就是 GB 级驻留**。连同 `retainedStages` / `retainedJobs` 一起压小，
比单纯加内存更对症。

**验证 driver 内存是否真的生效，不能看 GC 日志**：
堆从初始值起步，**上限直到涨上去才暴露**，两次运行早期看起来一模一样。
真判据：

```bash
dorado get-container-log --application-id <app> --file launch_container.sh -r sg | grep -oE '\-Xmx[0-9]+[mMgG]'
```

### 4.2 读 GC 日志的两个陷阱（都实测踩过）

1. **堆上限涨过 1 G 之后，单位从 `M` 变成 `G`。**
   写 `(\d+)M` 的正则会**静默丢掉最重要的那几条**——恰好是堆压最大时的记录。
   我的轨迹脚本因此差点把一次退化判成「GC 正常」。**正则必须同时吃 `M` 和 `G`。**
2. **`Full GC (System.gc())` 与 `Full GC (Allocation Failure)` 含义完全不同。**
   前者是 Spark `ContextCleaner` 的周期回收（默认 30 分钟一次，可用来标定运行阶段）；
   后者是真的分配不出来了，**是 OOM 的前一步**。按 `Full GC` 笼统匹配会把两者混为一谈。

**判「driver 是否在积累」的正确读法**：看**回收之后**的驻留值随时间的走向，
不是看回收前的峰值，也不是看次数。
成功那跑的驻留是 218M → 1321M → 218M（**能放掉**）；
坏的那跑是 403M → 4744M → 6402M → 6795M（**放不掉**）。

## 5. 诊断：真话在哪里

```bash
A=$(bytedcli --json dorado instance log-summary <IID> --project-id <P> -r sg | grep -oE 'application_[0-9]+_[0-9]+' | head -1)
bytedcli dorado get-container-log --application-id $A --file stdout -r sg > /tmp/x.txt
grep -o '^STEP [0-9a-z_]*' /tmp/x.txt | awk '!x[$0]++'    # 阶段序列
grep -n '^ERROR:' /tmp/x.txt                               # 三态出口的判词
awk '/^Traceback/{f=1} f' /tmp/x.txt | grep -v '^\s*at '   # 真 traceback
```

- **exit code 3（或任何非 0/1 的约定码）不是崩溃，是定义过的三态出口**。
  它的判词由 `sys.stderr.write("ERROR: ...")` 产生，
  **在容器的 stdout 里**（AM 的 stderr 通常只有 SLF4J 噪音）。
  只看 traceback 会得到「返回 3」这种没有信息的结论
- `instance diagnose` 在实例刚结束时常回 `diagnoseStatus: to_diagnose`、内容全空；**别等它**
- `instance log-summary` 的 `exception.reason` 里有**准入检查**的原文
  （例：`not pass yarn-queue-resource check ... used mem X, max mem Y`），
  这是队列级聚合快照给不出的信息

### 队列：两个仪器会给出不同答案，要知道信哪个

- `task get-queue-resource` 是**聚合快照**，会显示 `queue_status=free`、`pending_jobs_num=0`
- `instance log-summary` 里的**准入检查**才是决定这个实例能不能起的那个

实测两者同时矛盾过。**判断「我的任务为什么不动」用后者。**

### 状态文案会指错方向 —— `statusDesc` 不是权威

**2026-08-01 实测，代价 33 分钟四条死路。**
实例卡住时 `statusDesc = 等待通过并发检查`（任务并发）。照它去查：
中止 `node submit` 生成的两个系统实例、扫 42 个业务日找竞争实例（没有）、
重建 backfill 触发、换触发类型 —— **全部无效**。

真因在 `instance log-summary` 里：
```
not pass yarn-queue-resource check. queue root.snake_data_ad
exceed pending/running rate, pending 16, running 14, rate 0.500000
```
**是队列的 pending/running 比率闸，不是任务并发。**
迁到空闲队列后：**33 分钟拒绝 → 提交 2 秒、起跑 2 秒。**

⇒ **实例不动时，判据永远是 `instance log-summary` 的 `exception.reason`，不是 `statusDesc`。**
`statusDesc` 是一句面向人的概括，它可以指向一个与真因无关的子系统，
而**照着它排查会一路都"合理"却一路都不对**。

**这里有两类不同的失效，不要混为一谈**（子智能体 2026-08-01 的更正，成立）：

| 类型 | 实例 | 危害 |
|---|---|---|
| **口径不同 / 陈旧** | `task get-queue-resource` 说 `queue_status=free、pending=0`，而实例级准入说内存到顶 | 两者都**指向队列**，你至少在正确的子系统里找 |
| **口径不同 / 陈旧** | `pendingQueueOrQuotaDesc` 有时是唯一会说话的字段，有时是 `None` | 同上 |
| **★ 指向错误的子系统** | `statusDesc = 等待通过并发检查`，而真因是**队列的 pending/running 比率闸** | **把你整个送进错误的子系统**，排查路径上每一步都"合理"却都不对 |

**第三类才是真正贵的**：前两类你还在队列里翻，第三类让你去查任务并发、去扫业务日、
去重建触发器 —— **四条死路，每条都自洽**。

⇒ **共同形状：同一件事有多个仪器，最显眼的那个通常不是权威的那个。**
**而当最显眼的那个还会点名一个错误的子系统时，「照它排查」本身就是陷阱。**

另：实例 `pending` 会**安静排队几十分钟，没有任何东西报错**。
`instance get` 的 `pendingQueueOrQuotaDesc` 字段是唯一会说话的地方。

## 6. 重试：确定性失败重试多少次都一样

`retryNum` 默认可能是 6、`retryInterval` 3600 秒 ⇒ 一次确定性失败会烧掉六小时集群。

**纪律**：
1. 首次上线未验证过的路径，**先把 `retryNum` 压到 1**（经 §2 的 `node save --metadata`）
2. **每次失败后立刻查 pending/running 实例并 abort**：
   `instance record <task> --schedule <日期> --project-id <P>` 找 → `instance abort --instance-ids a,b`
3. OOM、缺模块、指纹不符、配置上限——**这些重试都修不好**

## 7. 业务日与 p_date 差一天

body 里若用 `${date-1}` 宏，则 **业务日 = 目标 p_date + 1**。
投 `--biz-date 2026-07-27` 得到 `p_date=20260726`。

**投错这一格不会报错，只会安静地产出错误分区。**
应对：让 body 在最早的步骤里把**两个来源**（宏替换值、平台写入的 task_time）都打出来并要求它们一致，
不一致就拒绝。实测这道检查在 5 分钟内抓住过一次投错。

## 8. 前置探针：把一小时后的失败搬到两分钟内

对「从未在这条链上验证过」的能力（executor 端某扩展模块、某写入路径、某命名空间可写性），
**在任何长任务之前用一个小作业问一次**。

价值不是「更早失败」，是**把每次尝试的成本从一小时压到两分钟**——
未知维度就可以用「改一个配置、跑一次、读结果」的循环逐个消掉，
而不是每猜一次赌一小时。

探针要报的不只是成败，还要报**它看到了什么**（工作目录列表、真实 `PYTHONPATH`、
分开测的各个依赖）。**只报成败的探针，失败时只能让你继续猜。**

> 反面：探测的性质必须与实际要用的性质是同一个。
> 「能建目录」≠「能写 4 GB」；「8 MiB 能写」≠「4 GB 能写」——
> 后者实测 PASS/FAIL 相反过。

## 9. 大文件 put：超时要按载荷算

一次 4 GB 的 `hdfs -put` 连续两次失败并丢掉两小时的上游产出，
根因是**我们自己的 45 秒固定超时**，不是 HDFS，也不是配额
（`-count -q` 显示 `inf` = 未设配额）。

改成按载荷推导的 deadline（实测吞吐 ~22 MB/s，给 4 GB 605 秒）后，
**291 秒一次成功、零重试**。

写法固定为：**先写 `<目标>.incomplete` 暂存 → 原子 `mv` → 改名后逐个成员回读大小**。
这样半截的 put 不可能被当成完整的。

## 10. 消费者不要冻结生产者的运行时选择

若上游用「候选列表逐个探测、取第一个可用」的方式选落点，
**下游把某次运行观测到的路径抄成字面量常量，就是在等它过期**。

实测：注释里明明白白写着「root 是上游的选择，由实例 XXXX 打印」——
而那已经是过期值，下游会去一个空目录里找产物，然后报告「上游没有发布」——
**一句关于错误地点的正确陈述。**

正解：**下游去发现**。用与上游同序的候选表，
**要求上游的多个产物在同一个根下同时存在**才认（只有一个 = 半发布态，
选中它只会把失败推到下游变成另一个看起来无关的 bug），
找不到就失败并**列出每一个查过的根及各自看到了什么**。

## 11. `coalesce(n)` 不是「合并相邻分区」,配置改不掉它

**2026-07-31 实测证实,Spark 3.2.1。** 一段代码对全局排序后的 frame 做 `coalesce(n)`,
注释断言「`coalesce` 合并**相邻**分区,所以有序帧合并后仍然有序」。**这个断言是错的。**

机制:`coalesce` 构造 `CoalescedRDD`,其 `DefaultPartitionCoalescer`
**按 preferred location 分组父分区**以最小化数据搬移,**不按分区序号相邻分组**。
而该 frame 之前被 `persist(DISK_ONLY)` 过 —— **持久化让每个分区都有了位置偏好**。
按位置分组不等于按 key range 分组 ⇒ **全局顺序丢失**。

**关键推论:`coalesce(n)` 在父分区恰好也是 n 个时,不是恒等变换。**
它仍会建 `CoalescedRDD` 并按位置重新编组,只不过每组一个父分区——
**组的顺序仍可能不是序号顺序**。

⇒ 所以「把 `spark.sql.shuffle.partitions` 设成正好等于目标分区数,让 coalesce 变成空操作」
**这条配置解法不成立**,实测被证伪。

**正解是把扇出移到排序本身**:`repartitionByRange(n, key)` + `sortWithinPartitions(key)`,
并**删掉排序之后的 coalesce**。range 分区保证分区间有序、分区内排序保证分区内有序,
`toLocalIterator` 按分区序号读回即全局有序。

**验证方式**(值得复用):下游有一道逐行检查顺序的守卫,上一跑在**第一行**就中止;
修好后 `corpus_arrays_written` 打出 **row_count 2,387,105** ——
**全部 239 万行按序到达,才是这道守卫通过的含义。**

> 一般化:**「合并/重分区保持顺序」这类断言,必须查该操作的实现语义,不能靠直觉。**
> 同族的还有 AQE 的 `CoalesceShufflePartitions`(它**确实**合并相邻 reducer 分区)——
> **两个都叫 coalesce,语义不同**。

## 13. 跨进程类身份：**PySpark 劫持了 `collections.namedtuple`**

**2026-08-01 实测，代价六次集群运行。**
**本节 17:00Z 重写——先前记的「Python 3.7.4 的帧推导落在 collections」是错的解释，已推翻。**

症状：`isinstance(obj, T)` 在 driver 上为真、executor 上为假，对象打印出来形态完整。

### 真机理

`pyspark/serializers.py::_hijack_namedtuple` **在 import 时替换掉 `collections.namedtuple`**，
给它构造的每个类装上：

```python
__reduce__ = (pyspark.serializers._restore, (name, fields, values))
```

`_restore` 在**对面用「类名 + 字段列表」重建类**，并缓存进它自己的字典。

⇒ **namedtuple 的实例从不走 cloudpickle 的「按名字携带类」路径。**
⇒ 重建出来的类与 executor 上 import 到的那一个**不是同一个对象**，`isinstance` 必假。

**payload 层的判决性对照**（同一次运行、同一个进程里的两条）：

| | bytes | `class_carried_by_name` | 引用的模块 |
|---|---|---|---|
| 裸实例 | 485 | `[]` | 只有 `pyspark.serializers` |
| 闭包 | 4320 | `[["travel_recall_wire_types","NeighborSource"]]` | 含 wire 模块 |

**同一个类，闭包里按名字携带，裸实例里不携带 —— 两条不同的序列化路径。**

### 修法：**消除跨越，而不是搬迁跨越**

kernel 捕获**值**，在闭包内部用**闭包按名字携带的那个类**重建。
`isinstance` 一个字不改，孪生类型仍被拒绝。

类级规则也随机理改写：从「该类型必须住在 wire 模块」改成
**「不许有这种对象跨越进程边界」**，用结构扫描断言真实文件扫描干净，
**并配一个合成 fixture 作阳性对照** —— 否则「扫描为空」与「扫描器坏了」不可区分。

### 三条推论

**① 「本地复现不出来」本身就是证据，但要问对是哪一个差异。**
本地四种载荷排布全不分裂。我先归因于 **Python 版本**——**错了**。
真因是**本地没装 pyspark，`collections.namedtuple` 未被劫持**。
⇒ **「本地绿、集群炸」时，先枚举两边的运行时差异清单**
（解释器版本 / 已安装的包 / 被 import 副作用改写过的标准库符号），
**不要拿第一个看起来合理的差异结案。**

**② 一个库可以在 import 时改写标准库的符号。**
`collections.namedtuple` 在裸 Python 与 import 过 pyspark 的 Python 里**不是同一个函数**。
凡是「同样的代码在两个环境行为不同」，把「某个 import 改写了全局符号」放进候选清单。

**③ 前两次修复作用在这个对象根本不走的路径上。**
显式声明 `__module__`、把 wire 模块从按值强制里豁免 —— 两者都是真实改进
（闭包能按名字携带类正依赖它们），**但都不是病因**。
⇒ **「改完之后症状还在」不等于「改错了」，也可能是「改的是另一条路」。**
区分二者的唯一办法，是让读数说出**这个对象实际走了哪条路**。

## 12. 其它实测(2026-07-31)

- **`dorado resource update --description` 有未公开的长度上限**:
  ~480B 与 ~600B 均回「发生未知错误」,194B 与 ~330B 成功。
  **报错信息点的是文件,真因是 description 字段**——按字面找会一直查错方向。
- **`node save` 不更新 `metadata.configuration.code`**:
  那一份是**已部署** body 的副本,只在 `submit` 时前进。
  看它没变会误判成「保存失败」;**正确探针是 `task code`**。
- **一个产物的摘要被两份 manifest 各存一份,且无同步机制** ——
  这正是「只有一侧声明」的形状,两份必然各自漂移。
  发现这类结构时**记为缺陷**,不要靠人工同步维持。
