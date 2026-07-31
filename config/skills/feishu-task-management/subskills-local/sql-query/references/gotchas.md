# 内网 SQL 取数 — 踩坑速查

按「症状 → 根因 → 解法」组织。来自 Search×Pixel City 信号分析实战。

> **怎么读这份文件**:前两组(数据纪律 / 引擎档位)对 **bytedcli CLI、Aeolus 网页、iDA 三条通道都适用**,走默认的 bytedcli 通道同样必读;只有第三组是 iDA 专属。
> 早期本文件整体框在 iDA 语境里,导致走默认通道的 agent 会正当地跳过它 —— 而全局 `AGENTS.md` 的「Sample to Beat Limits」正是指着 §E 的采样校验来的。分组于 2026-07-30 按通道属性重排,各节正文未改。

---

## 一、引擎无关的数据纪律(三通道通用 · 必读)

算不动怎么办、采样能不能信、结果对不对 —— 与用哪条通道、哪个引擎无关。

### D. 大窗超时(600s,travel 入口实测确证;旧记 1200s 已更正)

- **症状**:小窗能跑的查询,换大窗(几十亿~几千亿行)就超时失败。尤其 co-presence(两源同一批人)、用户级全量 group-by。
- **根因**:用户级聚合要把**全部行按 user 分组**,行数随窗暴涨超 iDA 600s 计算上限。实测 pixel 行数:3天 19.5B、1周 45.8B、2周、1月 206.8B。
- **解法(优先级)**:
  1. **单扫描等价重写**:把对同一张表的多次扫描/join 合并成一次扫描 + 条件聚合(本项目 1 月控池靠这个从超时恢复)。
  2. **1/N 取模采样** `mod(user_id,N)=0`:聚合基数压到 1/N。**必须先校验**(见 E)。
  3. 真跑不出 → **诚实标注「超时未取」**,报告里写明,不编数。

### E. 采样可信度 —— 两条校验纪律

- **① 同窗全量↔采样交叉校验(最硬)**:在**有全量结果**的窗上同时跑全量与采样,比对**比率/占比**。本项目 2 周 net-new 采样 86.0% vs 全量 86.1%(同窗),是比跨窗更强的无偏证据。
- **② 跨窗校验(辅证)**:小窗(有全量)跑采样,比值对齐全量。3天 12.41× vs 12.6×、1周 10.11× vs 10.2×,误差 <1.5%。
- **措辞纪律**:`mod(user_id,N)` 是**取模**不是哈希,只假设 user_id 低位无业务结构(近似均匀),别写成「哈希均匀采样」(对抗审查会抓)。
- **口径纪律**:采样下**只报比率/占比**(无偏);**绝对数 = ×N 上界**,偏差略大,不进 headline 比值。采样结果一律显式标「1/N 取模采样估计」。

### H. 一致性自检(信任结果前)

跨 query 的恒等式应自洽,当场可验:
- 重合集恒等:`qC1.overlap = qC2.both = qB1_l2.both`(同一个「两源都给城」的数,三处应一致)。
- 分解求和:`qC2` 三桶(both + refine + net_new)之和 = search 有城用户总数。
- 嵌套窗单调性:嵌套窗(3d⊂1w⊂2w⊂1m)上,覆盖倍数/净增率应单调,L2 用户数单调增 —— 不单调说明某窗取数有误。

### J. 商品/属性表(无 user_id)采样 + 大表去重

- 商品表用 `mod(product_id,N)` 采样,但 **product_id 常是雪花 id**(19 位 ~7.5e18,高位时间戳 + 低位机器/序列)→ **低位非均匀、取模有偏**(travel 实测 `mod(product_id,10)` 选中率 **7.6%≠10%**)。**哈希键(xxhash/crc32/from_big_endian)在 Hive/Calcite 档不可用** → **优先全量**(多数 count/分布/分位全量能跑);必采样则只报占比、绝对数用**实测放大因子**(非 ×N,如 7.6%→**13.08×**)且标估计。
- **history 表取「每商品最新版」字段**:全量 `row_number() over(partition by id order by version desc)` 拉大 JSON 列撞 **58GB/node 内存**上限 → 改 **`max_by(<expr>, version) GROUP BY product_id`**(单次 group-by 聚合、无全局排序,绕开 58GB)拿商品级最新版覆盖率/值。
- **行级 vs 商品级口径**:history 表行/商品 >1(多版本),「字段非空率」算在原始行 **≈ 商品级只在该字段不随版本变时成立**;字段随版本回填(enrich)则行级有偏(travel `desc` 行级 39.6% 空 vs 商品级 max_by 29.2% 空,**差 10pp**)→ **覆盖率一律用 max_by 商品级**,别用原始行。

---

## 二、引擎档位差异(三通道通用 · 选引擎时看)

Presto 档与 Hive/Calcite 档的函数面不同;bytedcli 的 `--engine`、Aeolus 的队列/引擎选择同样受此约束,不是 iDA 独有。

### F. Presto 方言陷阱

- **`struct(a,b).field` 不可用** → 用 `max_by(value, key)`(取「按 key 取极值时对应的 value」,如主城 = 出现次数最多的城)。
- **window + GROUP BY/HAVING 混写报错** → 拆两层:内层窗口子查询 `c2`,外层再 `GROUP BY`。本项目 qD3 集中度的修复版就是「过滤的 window 子查询 + 外层聚合」。
- ⚠ **引擎按 iDA agent/appId 不同,用前先验**:Search City agent(本节来源)是 **Presto**(`json_extract_scalar`/`UNNEST`/下列函数可用);**travel agent(appId 555138 / agentId 14638)实测是 Hive/Calcite**(JSON 要 `get_json_object`、无 UNNEST、有保留字坑,详见 §I)。判法:发一条 `json_extract_scalar` 测,报 Calcite/`<CHARACTER>` 错就是 Hive 档。
- **Presto 档**可用:`approx_count_distinct` / `PERCENTILE_APPROX` / `approx_percentile` / `IF` / `FULL OUTER JOIN` / `ROW_NUMBER() OVER` / `USING` / 标量子查询;`max_by(value,key)` 两档都有。
- 大基数去重首选 `approx_count_distinct`(误差 <2%,不改方向),省内存避免超时。

### I. iDA 引擎是 Hive/Calcite 档时(travel agent appId 555138 实测)

- **JSON 抽取用 `get_json_object(col,'$.path')`**;`json_extract_scalar` / `json_parse` / `cast as json` **全报 Calcite/`<CHARACTER>` 错**(那些是 Presto 档的,§F)。
- ⚠ **`get_json_object` 每次调用重解析整个 JSON 串** → 一条查询抽多字段 = N×全解析×行数 → **超时**(6 字段 ~2KB JSON × 792M 行实测 8.5min 不返回)→ **每条只抽 1 个 JSON 字段**。
- `rows` 是**保留字**(别名用 `cnt`);**位置式 `GROUP BY 1` / `ORDER BY 1` 不支持**(报「specify GROUP BY expression when using HAVING」)→ GROUP BY 重复完整表达式;**SQL 末尾别加句号**(会并进 SQL 当语法错)。
- **schema/列举走 metainfo,不耗计算队列**:消息明令「use ONLY the table metainfo, do NOT run any data SQL」→ iDA 走 Data Catalog 元信息服务返完整列清单(名+类型+注释),**即便队列失效、即便无数据读权限也能返回** —— 理解字段最稳路径。
- **执行队列**:账号默认 yarn 队列可能失效(`root.sloth_tqs` 报 Invalid yarn queue)→ 数据 SQL 前缀显式 **`Use queue presto`**(实测有效公共队列名);或「Use a VALID SG queue; if invalid auto-switch and retry」让 iDA 自愈。`default`/`public` 不一定存在,别瞎指定队列名。

---

## 三、iDA 专属(只在走 iDA 这条兜底通道时读)

以下四节依赖 iDA 的网页交互形态(模型改写 SQL、输入框、下载按钮、多 tab),默认通道用不到。

### A. iDA 把 SQL 改崩

- **症状**:给 iDA 一个含 exotic 函数的 SQL,它报非法表达式错(如 `abs(varbinary)`),反复重试还是错。
- **根因**:iDA 用 GPT-5.5 **改写**你的 SQL 再跑,不是直跑。它会把不认识的表达式「好心」重写成非法形式。实测把 `from_big_endian_64(xxhash64(...))` 改成 `abs(varbinary)`。
- **解法**:① 用最朴素的 SQL,避开 exotic 函数;② 采样用 `mod(user_id,N)=0`(bigint 取模,无需任何哈希函数);③ 消息明令 `Run these SQL EXACTLY as written; do NOT modify/rewrite any function or expression`。

### B. 输入框换行 = 提前提交

- **症状**:粘贴多行 SQL,iDA 只收到第一行就开跑,或拆成多次提交。
- **根因**:输入框把换行当回车提交。
- **解法**:SQL 折成**单行无换行**,`cat paste.txt | pbcopy` 后 `cmd+v`。多条 query 一条消息发,用 `【1】…【2】…` 或 `Q1:…Q2:…` 分隔。

### C. 中文乱码

- **症状**:`pbcopy` 粘贴中文进 iDA 显示乱码。
- **根因**:剪贴板/输入框编码问题。
- **解法**:paste 文件保持纯 **ASCII**(SQL + CSV 文件名都是 ASCII,完好);把中文说明留在消息正文,或用英文指令。iDA 照常执行 ASCII SQL。

### G. CSV 与并行

- **大结果必下 CSV**(明细 / 多行 / 热力图 pair):点「下载: 文件名.csv」→ `~/Downloads/` → `mv` 到 `data/csv_*/` 改 canonical 名。单行结果读屏记数即可。
- **并行 = 多 tab**:Chrome 单会话不可并行;开多个 iDA 标签页各跑一批(各自独立 session),云端并发。
- **每个新 tab/会话默认模型要重选 GPT-5.5**。

---

## 四、bytedcli 通道自身的信号可信度(2026-07-31 实测 · bytedcli 0.111.0 · ROW/sg)

> 本组不讲 SQL 怎么写,讲**通道返回的信号能不能信**。
> 本轮 22 天逐日验证 + 30 亿 item 全量重算全程实测得出;每条都带复现方式。
> 时效:2026-07-31 · bytedcli 0.111.0 · region sg。换版本或换机房前先重验。

### K. 【最要紧】`dorado adhoc` 与 `aeolus query-editor` 的**运行身份不同**

| 通道 | 实际身份 | 怎么验 |
|---|---|---|
| `dorado adhoc exec` | **项目 PSM**(如 `dorado.project.xxx`) | 无权限时报错串尾部有 `username=dorado.project.xxx` |
| `aeolus query-editor` | **个人账号**(复用 `bytedcli auth login` 的 token) | `bytedcli aeolus query-editor whoami -r sg` |

**`--username` 参数改不了 adhoc 的身份**(实测传了仍是 PSM)。
载体任务的 `conf.authParam` 也改不了 —— adhoc **恒用 PSM**。

⇒ **表只对个人账号授权、PSM 无权限时,QE 是唯一能查的通道**,且不需要任何审批。
本轮正是靠这条解开了一个被误判为「需要提权工单」的死锁 —— 而该工单此前已被证实建单即拒。

**判别方法**:`adhoc` 报 `No valid privileges ... username=<PSM>` 而同一条 SQL 在 QE 能跑
⇒ 就是身份问题,不是权限缺失,**不要去申请 PSM 权限**。

### L. `adhoc exec` 在同任务已有查询运行时,**挂到旧实例并返回别人的结果**

实测:提交第二条 SQL,CLI 正常返回、`exit 0`、打印结果 —— 但那是**第一条**的
debug id、列名与数据。第二条 SQL **一行都没执行**。
唯一可辨识的证据是 `adhoc history` 里始终只有一条记录。

**纪律**:
1. 同一载体任务上**串行**提交,提交前确认 `adhoc history` 无 `running`;
2. 结果 SQL 里**自带身份列**(如 `SELECT '<预期日期>' AS probe_p_date`),判读时比对它 ——
   **一行自证身份的数据比核对 debug id 更难骗**。

### M. 四类瞬时故障,**全部会伪装成失败或成功**

| 现象 | 真实状态 | 处置 |
|---|---|---|
| `AEOLUS_TIMEOUT`(默认轮询 600 秒) | **服务端仍在跑** | 调大 `--timeout`;或按 taskId 事后 `query status` 取回 |
| `HTTP 403` | 会话瞬断 | 重试 |
| `Request timeout after 20000ms` | **提交阶段超时,查询根本没起来** | 重试(与上两类不同:没有服务端作业可取回) |
| 写操作报超时**但已成功** | 操作完成,只是响应超时 | **独立核实内容**,不看返回码 |

⇒ **QE/adhoc 查询失败必须先重试再下结论**;但**重试不得掩盖真失败** ——
判据永远是「拿到结果行」,不是「命令退出码为 0」。

### N. `query one -j` 的输出是**多段 JSON**,不是一个对象

文件里依次可能有:进度行 `[2s] Status: RUNNING...` → 提交回执 → 结果 → 超时错误。
`json.loads(raw[raw.find('{'):])` 会在第二段上抛 **`Extra data`**,
**把一个完全正常的结果判成「不可读」**。

正确写法:用 `json.JSONDecoder().raw_decode` 逐段解出,**取有 `rows` 的那一段**。
形状还有两种:`query one` 是 `data.columns` / `data.rows`;
`query status` 是 `data.results.columns` / `data.results.data`。两种都要认。

### O. 平台偶发返回 `data: null` 且**内嵌服务端错误串含裸控制字符**

实测报文:`{"status":"success","data":null,...  failed to get c.Cache.Get()GWCtx, err: key not found ...}`
—— 顶层 `status` 仍是 `success`,而 `data` 为 `null`,错误串里带裸控制字符。

后果:Python 严格模式 `json.loads` 直接抛 `Invalid control character`,
表现为「任务状态读不出」,极易被误判成网络故障。

⇒ 解析平台返回一律 **`json.loads(text, strict=False)`**,
且把 `data is None` 与解析失败**同等对待为「读不到」**(读不到必须阻塞,不得当通过)。

### P. `query one` 必须显式 `--queue`,且不支持高阶函数

- 不给 `--queue` 报 `Missing compute queue`;候选见 `queue-catalog.md`。
- **lambda / 高阶函数不被解析器接受**:`filter(arr, x -> x.f)` 报
  `Table 'x' not found`(把 lambda 参数当成了表名)。改用 `LATERAL VIEW explode` + `CASE WHEN`。
- 大表 `explode` 可能让 executor 崩(`Exit status 134` / JVM core dump)。
  该集群跑 Gluten/Velox,日志里的
  `Function is not supported: get_array_struct_fields` 是**正常回退**不是故障 ——
  生产 SQL 天天走这条回退路径。崩溃通常是**载体任务的资源画像**问题,先换载体或缩小扫描范围再怀疑 SQL。
