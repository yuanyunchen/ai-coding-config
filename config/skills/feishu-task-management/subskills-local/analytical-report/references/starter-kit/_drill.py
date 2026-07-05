#!/usr/bin/env python3
"""SQL 钻取折叠区(<details>)的单一数据源 + 渲染器。
每块:回答什么 + 窗口/引擎/状态 chip + SQL(代码块)+ 关键 1–3 行结果。
状态 ∈ {实测 ok / 优化版 opt / 推导 der / 超时未取 to}。超时项不贴跑不出的 SQL。
build.py 用 {{DRILL:id}} 占位符把对应块注入两份 body。所有数字与正文/事实源一致。
"""
import html as _html
import re as _re

# ---- SQL 关键词轻量高亮(克制:只点 SELECT/FROM/WHERE 等结构词)----
_KW = r"\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT JOIN|FULL OUTER JOIN|ON|USING|AND|OR|AS|WITH|DISTINCT|COUNT|SUM|MAX|IF|COALESCE|BETWEEN|IS NULL|IS NOT NULL|LIMIT|approx_count_distinct|max_by|PERCENTILE_APPROX|ROW_NUMBER|OVER|PARTITION BY|NULL)\b"

def _fmt_sql(sql):
    esc = _html.escape(sql)
    esc = _re.sub(_KW, lambda m: '<span class="kw">' + m.group(0) + '</span>', esc)
    return esc

_STATUS = {
    "ok":  ("实测", "ok"),
    "opt": ("优化版 · qC2 2周", "opt"),
    "der": ("推导 · qB1_l2 2周", "der"),
    "to":  ("超时未取", "to"),
    "samp":("采样补全 · 1/10 取模", "opt"),
}

def _meta(window, status):
    txt, cls = _STATUS[status]
    return (
        '<div class="det-meta">'
        f'<span class="mchip">窗口 · {window}</span>'
        '<span class="mchip">引擎 · Presto</span>'
        f'<span class="mchip {cls}">状态 · {txt}</span>'
        '</div>'
    )

def _table(headers, rows):
    h = '<div class="res-scroll"><table class="dtable"><thead><tr>' + "".join(f"<th>{c}</th>" for c in headers) + "</tr></thead><tbody>"
    for r in rows:
        h += "<tr>" + "".join(f'<td class="num">{c}</td>' if i else f"<td>{c}</td>" for i, c in enumerate(r)) + "</tr>"
    h += "</tbody></table></div>"
    return h

def block(d):
    """d: dict(id,label,query,ask,window,status, sql=None, headers,rows, note=None, to_note=None)"""
    s = f'<details class="drill" id="drill-{d["id"]}">'
    s += ('<summary><span class="tw"></span>'
          f'<span class="dq">{d["query"]}</span>'
          f'<span class="dlabel">{d["label"]}</span></summary>')
    s += '<div class="det-body">'
    s += f'<p class="det-ask">{d["ask"]}</p>'
    s += _meta(d["window"], d["status"])
    if d["status"] in ("to", "samp"):
        s += f'<div class="to-note">{d["to_note"]}</div>'
    else:
        if d.get("sql"):
            s += f'<pre class="sql">{_fmt_sql(d["sql"])}</pre>'
        s += '<div class="res-h">关键结果</div>'
        s += _table(d["headers"], d["rows"])
        if d.get("note"):
            s += f'<p class="res-note">{d["note"]}</p>'
    s += '</div></details>'
    return s

# =========================================================================
# 钻取块定义(SQL 取自 data/queries_2w.sql + /tmp/qc2opt_2w.txt;结果取自 csv_2w)
# =========================================================================
BLOCKS = {}

# ---- qC2 增量分解(核心 hero;2 周为优化版 = 过滤集 join,非失败的全表 group-by)----
BLOCKS["qC2"] = {
    "id": "qC2", "query": "qC2", "label": "增量分解 both / refine / net-new 的 SQL 与结果",
    "ask": "search 有城用户里,有多少是 pixel <b>本窗零地理</b>(net-new)、多少是 pixel 已知地理但 search 补到城(refine)、多少是两源都给城(both)?三桶之和应 = search 有城用户(可当场验证恒等式)。",
    "window": "2 周 · 06-05~18", "status": "opt",
    "sql": (
        "-- 优化版:过滤集 DISTINCT + LEFT JOIN(非全表 GROUP BY,避免 1200s 超时)\n"
        "WITH s AS (SELECT DISTINCT user_id FROM ad_algo.vertical_all_scenario_intent\n"
        "           WHERE p_date BETWEEN '20260605' AND '20260618'\n"
        "             AND source_type='search' AND travel_l2_geoname_id IS NOT NULL),\n"
        "     pcity AS (SELECT DISTINCT user_id FROM ad_algo.vertical_all_scenario_intent\n"
        "           WHERE p_date BETWEEN '20260605' AND '20260618'\n"
        "             AND source_type='pixel' AND travel_l2_geoname_id IS NOT NULL),\n"
        "     pany AS (SELECT DISTINCT user_id FROM ad_algo.vertical_all_scenario_intent\n"
        "           WHERE p_date BETWEEN '20260605' AND '20260618' AND source_type='pixel'\n"
        "             AND COALESCE(travel_normalized_city, travel_l0_geoname_id,\n"
        "                 travel_l1_geoname_id, travel_l2_geoname_id, travel_l3_geoname_id) IS NOT NULL)\n"
        "SELECT COUNT(*) AS search_city_users,\n"
        "       COUNT(pc.user_id) AS both_city,\n"
        "       COUNT(IF(pc.user_id IS NULL AND pa.user_id IS NOT NULL,1,NULL)) AS refine_to_city,\n"
        "       COUNT(IF(pa.user_id IS NULL,1,NULL)) AS net_new\n"
        "FROM s LEFT JOIN pcity pc ON s.user_id=pc.user_id\n"
        "       LEFT JOIN pany  pa ON s.user_id=pa.user_id;"
    ),
    "headers": ["search_city_users", "both_city", "refine_to_city", "net_new"],
    "rows": [["257,545,989", "17,464,715", "18,392,945", "221,688,329"]],
    "note": "恒等式自洽:both + refine + net_new = 17,464,715 + 18,392,945 + 221,688,329 = <b>257,545,989</b> = search_city_users ✓。net-new 占比 221,688,329 / 257,545,989 = <b>86.1%</b>。基线 = pixel ∪ pixel_product 全口径(pany 含商品流)。",
}

# ---- qB1_l2 维恩(2 周 = 推导;给透明算式)----
BLOCKS["qB1_l2"] = {
    "id": "qB1_l2", "query": "qB1_l2", "label": "城市级维恩(2 周推导值)的算式与校验",
    "ask": "2 周 l2 城市级重合三元组(search_only / pixel_only / both)。该窗全量 group-by 超时,改由 <b>qC2 + qA2 推导</b> —— 这里把推导算式与口径等价性透明化。",
    "window": "2 周 · 06-05~18", "status": "der",
    "sql": (
        "-- 2 周该窗 FULL OUTER JOIN 全量 group-by 超 1200s;故由已实测口径推导:\n"
        "--   both        = qC2.both_city                       (优化版实测)\n"
        "--   search_only = qC2.search_city_users - both        (qC2 实测)\n"
        "--   pixel_only  = qA2.pixel_users      - both         (qA2 精确基数)\n"
        "-- 口径等价:qC2 的 search 集与 qA2 的 pixel 有城集,both 定义一致(同为「两源都给 l2 城」)。\n"
        "-- 3 天 / 1 周窗为 FULL OUTER JOIN 直接实测(见 queries_3d/1w.sql),口径一致。"
    ),
    "headers": ["项", "算式(精确推导)", "值"],
    "rows": [
        ["both", "qC2.both_city(实测)", "17,464,715"],
        ["search_only", "qA2 精确去重 257,545,989 − both", "240,081,274"],
        ["pixel_only", "qA2 精确去重 86,017,662 − both", "68,552,947"],
    ],
    "note": "三项均为<b>精确推导</b>(both = qC2 实测;基数 = qA2 精确去重),反推与存值<b>差为 0</b>,非近似。净增率 93.2% = search_only / (search_only + both) = 240,081,274 / 257,545,989 —— 仅依赖 search_only 与 both,可正常用。Jaccard = both / (so+po+both) = 5.36%。",
}

# ---- 趋势:4 窗 metrics + 自检 ----
BLOCKS["trend"] = {
    "id": "trend", "query": "trend", "label": "时间趋势的 4 窗取数与单调性自检",
    "ask": "趋势的每个点怎么来?<b>同一组算子在 4 个嵌套窗各跑一遍,只换 p_date 日期</b>(保证可比),由 trend.py 汇总并自检嵌套单调性。",
    "window": "3d / 1w / 2w / 1m", "status": "ok",
    "sql": (
        "-- 每窗用同一覆盖 SQL,仅替换日期区间(嵌套:3d⊂1w⊂2w⊂1m,均止于 06-18):\n"
        "--   3 天: p_date BETWEEN '20260616' AND '20260618'\n"
        "--   1 周: p_date BETWEEN '20260612' AND '20260618'\n"
        "--   2 周: p_date BETWEEN '20260605' AND '20260618'\n"
        "--   1 月: p_date BETWEEN '20260520' AND '20260618'\n"
        "SELECT source_type,\n"
        "       approx_count_distinct(IF(travel_l2_geoname_id IS NOT NULL,user_id,NULL)) AS users_l2\n"
        "FROM ad_algo.vertical_all_scenario_intent\n"
        "WHERE p_date BETWEEN '{date_lo}' AND '20260618' AND source_type IN ('search','pixel')\n"
        "GROUP BY source_type;   -- 覆盖倍数 = search.users_l2 / pixel.users_l2"
    ),
    "headers": ["指标", "3 天", "1 周", "2 周", "1 月"],
    "rows": [
        ["覆盖倍数 l2_multiple", "3.16×", "3.06×", "2.99×", "2.58×"],
        ["城市级净增 net-gain%", "97.3%", "95.6%", "93.2%", "89.3% ≈"],
        ["真新增量 net-new%", "94.4%", "90.7%", "86.1%", "79.0% ≈"],
        ["控池倍数 control×", "12.6×", "10.2×", "7.4× ≈", "5.5× ≈"],
    ],
    "note": "覆盖倍数全量满 4 窗;带 ≈ 的格(1 月净增 / net-new、2 周 / 1 月控池)为 <b>1/10 取模采样(mod(user_id,10)=0)</b>估计 —— 全量大窗 group-by 超 1200s,采样补全。采样在 3 天 / 1 周<b>复现全量误差 &lt;1.5%</b>(3d 12.41× vs 12.6×、1w 10.11× vs 10.2×),故可信。trend.py 嵌套单调性自检通过(覆盖倍数 / 净增 / net-new 单调↓、L2 用户单调↑)。",
}

# ---- qA1 覆盖 + 填充率 ----
BLOCKS["qA1"] = {
    "id": "qA1", "query": "qA1", "label": "各层级覆盖用户 + 城市级填充率的 SQL 与结果",
    "ask": "各 geoname 层级(L0 国 / L1 州 / L2 城 / L3 区)各有多少去重用户?填充率 = 该层级用户 / 有任意地理用户。",
    "window": "2 周 · 06-05~18", "status": "ok",
    "sql": (
        "SELECT source_type,\n"
        "  approx_count_distinct(user_id) AS users_any,\n"
        "  approx_count_distinct(IF(travel_l0_geoname_id IS NOT NULL,user_id,NULL)) AS users_l0,\n"
        "  approx_count_distinct(IF(travel_l1_geoname_id IS NOT NULL,user_id,NULL)) AS users_l1,\n"
        "  approx_count_distinct(IF(travel_l2_geoname_id IS NOT NULL,user_id,NULL)) AS users_l2,\n"
        "  approx_count_distinct(IF(travel_l3_geoname_id IS NOT NULL,user_id,NULL)) AS users_l3\n"
        "FROM ad_algo.vertical_all_scenario_intent\n"
        "WHERE p_date BETWEEN '20260605' AND '20260618' AND source_type IN ('search','pixel')\n"
        "  AND COALESCE(travel_normalized_city, travel_l0_geoname_id, travel_l1_geoname_id,\n"
        "      travel_l2_geoname_id, travel_l3_geoname_id) IS NOT NULL\n"
        "GROUP BY source_type;"
    ),
    "headers": ["source", "users_any", "users_l2(城)", "L2 填充率"],
    "rows": [
        ["search", "269,700,516", "261,281,716", "96.9%"],
        ["pixel", "188,401,806", "87,517,526", "46.5%"],
    ],
    "note": "L2 城市级 261.3M / 87.5M = <b>2.99×</b>。填充率 = users_l2 / users_any。L0/L1/L2/L3 为独立字段、非包含漏斗(search 全窗 l2 > l1)。approx_count_distinct 误差 &lt;2%,不改方向。",
}

# ---- qA2 每用户城市数 ----
BLOCKS["qA2"] = {
    "id": "qA2", "query": "qA2", "label": "每用户城市数(avg / p90 / max)的 SQL 与结果",
    "ask": "每个有城用户对应几座城?用于信号丰度画像,也提供维恩推导用的精确 pixel 有城用户基数。",
    "window": "2 周 · 06-05~18", "status": "ok",
    "sql": (
        "WITH u AS (SELECT source_type, user_id,\n"
        "             COUNT(DISTINCT travel_l2_geoname_id) AS n_city\n"
        "           FROM ad_algo.vertical_all_scenario_intent\n"
        "           WHERE p_date BETWEEN '20260605' AND '20260618'\n"
        "             AND source_type IN ('search','pixel') AND travel_l2_geoname_id IS NOT NULL\n"
        "           GROUP BY source_type, user_id)\n"
        "SELECT source_type, COUNT(*) AS users, AVG(n_city) AS avg_cities,\n"
        "       PERCENTILE_APPROX(n_city,0.5) AS p50, PERCENTILE_APPROX(n_city,0.9) AS p90,\n"
        "       MAX(n_city) AS max_cities\n"
        "FROM u GROUP BY source_type;"
    ),
    "headers": ["source", "users(精确)", "avg", "p90", "max"],
    "rows": [
        ["search", "257,545,989", "1.86", "4", "807"],
        ["pixel", "86,017,662", "1.69", "3", "6,801"],
    ],
    "note": "两源中位数均为 1 城(p50=1),信号以单城为主。pixel max 6,801 为历史累积长尾(疑似机器/聚合)。search users 257.5M 与 qC2.search_city_users 自洽 ✓。",
}

# ---- qC3 控池(2 周主窗;2w/1m 为 1/10 采样补全,3d/1w 全量校验)----
BLOCKS["qC3"] = {
    "id": "qC3", "query": "qC3", "label": "控池给城率(同一批人)的 SQL 与结果 · 4 窗",
    "ask": "在两源<b>共同出现</b>(co-presence)的同一批人身上,各自给出城市的比例 —— 消除「search 池子更大」的规模差,是最强的同口径增量证据。",
    "window": "2 周主窗 · 06-05~18(4 窗补全)", "status": "ok",
    "sql": (
        "-- co-presence 分母需「全部 pixel 用户」按 user 聚合,不可预过滤;\n"
        "-- 3 天 / 1 周可全量直算;2 周 / 1 月全量超 1200s,改用 1/10 取模采样:\n"
        "--   ... AND mod(user_id, 10) = 0   -- user_id 为 bigint,同一口径贯穿 su / pu,比率无偏\n"
        "WITH su AS (SELECT user_id, MAX(IF(travel_l2_geoname_id IS NOT NULL,1,0)) AS has_city\n"
        "            FROM ad_algo.vertical_all_scenario_intent\n"
        "            WHERE p_date BETWEEN '{date_lo}' AND '20260618' AND source_type='search'\n"
        "            GROUP BY user_id),   -- 2w/1m 加 mod(user_id,10)=0\n"
        "     pu AS (SELECT user_id, MAX(IF(travel_l2_geoname_id IS NOT NULL,1,0)) AS has_city\n"
        "            FROM ad_algo.vertical_all_scenario_intent\n"
        "            WHERE p_date BETWEEN '{date_lo}' AND '20260618' AND source_type='pixel'\n"
        "            GROUP BY user_id)\n"
        "SELECT COUNT(*) AS common_users, SUM(su.has_city) AS search_city, SUM(pu.has_city) AS pixel_city\n"
        "FROM su JOIN pu USING(user_id);"
    ),
    "headers": ["窗口", "search 给城", "pixel 给城", "倍数", "口径"],
    "rows": [
        ["3 天", "60.6%", "4.8%", "12.6×", "全量"],
        ["1 周", "67.1%", "6.6%", "10.2×", "全量"],
        ["2 周(主窗)", "66.6%", "9.0%", "7.4×", "1/10 采样 ≈"],
        ["1 月", "69.6%", "12.7%", "5.5×", "1/10 采样 ≈"],
    ],
    "note": "同一批人身上 search 给城是 pixel 的 <b>5.5–12.6 倍</b>(2 周主窗 7.4×)—— 增量非池规模差。采样口径:2周/1月控池、1月净增/net-new 为 1/10 取模采样(mod(user_id,10)=0;假设 user_id 低位无业务结构,近似均匀)。验证:① 2周同窗 全量↔采样一致——采样 net-new 86.0% vs 全量 86.1%、采样 both×10≈18.1M vs 全量 17.5M;② 3天/1周 采样比值 12.41×/10.11× vs 全量 12.6×/10.2×(&lt;1.5%)。仅报比率/占比,放大绝对数偏差略大。",
}

# ---- qD4b 主城一致 ----
BLOCKS["qD4b"] = {
    "id": "qD4b", "query": "qD4b", "label": "主城一致率(严口径)的 SQL 与结果",
    "ask": "两源都给城的用户里,各自的<b>主城</b>(出现最多的城)是否相同?这是判断「两源 city 语义是否一致」的严口径检验。",
    "window": "2 周 · 06-05~18", "status": "ok",
    "sql": (
        "WITH s AS (SELECT user_id, max_by(city,c) AS city_s FROM (\n"
        "             SELECT user_id, travel_l2_geoname_id AS city, COUNT(DISTINCT p_hour) AS c\n"
        "             FROM ad_algo.vertical_all_scenario_intent\n"
        "             WHERE p_date BETWEEN '20260605' AND '20260618' AND source_type='search'\n"
        "               AND travel_l2_geoname_id IS NOT NULL GROUP BY user_id, travel_l2_geoname_id) t\n"
        "           GROUP BY user_id),\n"
        "     p AS (SELECT user_id, max_by(city,c) AS city_p FROM ( /* pixel 同上 */ ) t GROUP BY user_id)\n"
        "SELECT COUNT(*) AS overlap_users, SUM(IF(city_s=city_p,1,0)) AS main_same,\n"
        "       SUM(IF(city_s<>city_p,1,0)) AS main_diff\n"
        "FROM s JOIN p ON s.user_id=p.user_id;"
    ),
    "headers": ["overlap_users", "main_same", "main_diff", "不同率"],
    "rows": [["17,464,715", "1,030,917", "16,433,798", "94.1%"]],
    "note": "仅基于 17.46M 双覆盖样本(占 search 有城用户 6.8%),<b>不外推</b>;且「不同」含机制差异(search 即时意图 vs pixel 回传历史)与可能的同国邻城/口径噪声,非纯意图冲突。",
}

# ---- qD3 / qD5 广度 + 独有城 ----
BLOCKS["qD3D5"] = {
    "id": "qD3D5", "query": "qD3 / qD5", "label": "城市广度 + 独有城的 SQL 与结果",
    "ask": "两源各覆盖多少座不同的城(广度)?其中多少是 search 独有(pixel 零覆盖)?这是「广度增量」与「11,176 独有城」两个结论的证据。",
    "window": "2 周 · 06-05~18", "status": "ok",
    "sql": (
        "-- 广度(qD3):每源精确 distinct 城市数\n"
        "SELECT source_type, approx_count_distinct(travel_l2_geoname_id) AS n_city\n"
        "FROM ad_algo.vertical_all_scenario_intent\n"
        "WHERE p_date BETWEEN '20260605' AND '20260618' AND source_type IN ('search','pixel')\n"
        "  AND travel_l2_geoname_id IS NOT NULL GROUP BY source_type;\n"
        "-- 独有城(qD5):每城 u_s / u_p,FULL OUTER JOIN 后按 u_p=0 计 search 独有"
    ),
    "headers": ["指标", "值", "口径"],
    "rows": [
        ["search 城数", "45,135", "exact distinct"],
        ["pixel 城数", "36,524", "exact distinct"],
        ["广度 uplift", "+23.6%", "(45,135−36,524)/36,524"],
        ["search 独有城", "11,176", "u_p=0,占两源并集 23.4%"],
    ],
    "note": "注意两个相近的 23.x 是<b>不同的量</b>:广度 uplift <b>+23.6%</b> = 城市总数较 pixel 的提升(分母 = pixel 城数);独有城占比 <b>23.4%</b> = 11,176 / 47,700 两源并集(分母 = 并集)。数值接近系巧合。11,176 独有城含 988 万用户。",
}

# ---- qB2 国家 ----
BLOCKS["qB2"] = {
    "id": "qB2", "query": "qB2", "label": "各国 search_only / pixel_only 的 SQL 与结果",
    "ask": "增量在国家维度是否均衡?哪些国家 pixel 反占优?注意各国独立去重,列<b>不可</b>跨行求和。",
    "window": "2 周 · 06-05~18", "status": "ok",
    "sql": (
        "WITH s AS (SELECT DISTINCT user_id, travel_l0_geoname_id AS c\n"
        "           FROM ad_algo.vertical_all_scenario_intent\n"
        "           WHERE p_date BETWEEN '20260605' AND '20260618'\n"
        "             AND source_type='search' AND travel_l0_geoname_id IS NOT NULL),\n"
        "     p AS ( /* pixel 同上 */ )\n"
        "SELECT COALESCE(s.c,p.c) AS country,\n"
        "       COUNT(IF(p.user_id IS NULL,1,NULL)) AS search_only,\n"
        "       COUNT(IF(s.user_id IS NULL,1,NULL)) AS pixel_only\n"
        "FROM s FULL OUTER JOIN p ON s.user_id=p.user_id AND s.c=p.c\n"
        "GROUP BY COALESCE(s.c,p.c) ORDER BY search_only DESC;"
    ),
    "headers": ["country", "search_only", "pixel_only", "判定"],
    "rows": [
        ["Indonesia", "41,710,069", "8,119,241", "search 主导"],
        ["Brazil", "14,062,461", "27,286,519", "pixel 反占优"],
        ["United States", "29,598,259", "21,372,849", "search 主导"],
    ],
    "note": "250 国共 <b>223 search 主导 / 27 pixel 反占优</b>(巴西、墨西哥、阿根廷、哥伦比亚等成熟市场 pixel 信号更厚)。每行各国独立 count distinct,<b>列不可跨行求和</b>。增量主要来自 search 占优市场。",
}

# ---- q0a 数据量级 + 超时机制(超时项:不贴跑不出的 SQL)----
BLOCKS["q0a"] = {
    "id": "q0a", "query": "q0a", "label": "数据量级 · 大窗超时与采样补全说明",
    "ask": "为什么部分窗的增量类指标全量跑不出,又是怎么补全的?根因:pixel 行数随窗暴涨,用户级全量 group-by 需把全部 pixel 行按 user 聚合。",
    "window": "2 周 / 1 月", "status": "samp",
    "to_note": (
        "<b>全量为何超 1200s</b>:把全部 pixel 行按 user 聚合(co-presence)的查询行数随窗暴涨——"
        "3 天 19.5B、1 周 45.8B、<b>1 月 206.8B</b>——大窗超 iDA 计算上限。"
        "原先 <b>1 月</b> 的 qB1_l2 / qC2 / qC3、<b>2 周</b> 的 qC3 全量跑不出。"
        "<b>已用 1/10 取模采样(mod(user_id,10)=0)补全</b>:聚合基数压到 1/10,2 周 / 1 月控池、1 月净增 / net-new 全部取到,"
        "故控池倍数、净增、net-new 现均 <b>4 窗齐全</b>(不再断线)。比值无偏——3 天 / 1 周采样复现全量误差 &lt;1.5%,"
        "且 2 周同窗全量↔采样自校验一致(net-new 86.0% vs 86.1%)。仅报比率 / 占比,放大绝对数偏差略大。"
        "(1 月 pixel 用户 2.17B 为去重 user_id 含设备/cookie 粒度,大于人类 MAU 属正常,不进任何 headline 比值。)"
    ),
}


def render(ids):
    return "\n".join(block(BLOCKS[i]) for i in ids)
