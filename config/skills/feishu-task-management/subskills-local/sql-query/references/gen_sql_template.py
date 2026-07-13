#!/usr/bin/env python3
"""
通用 iDA / Presto 取数 SQL 生成器(窗口嵌套模板)
=====================================================
从 Search×Pixel City 信号分析的 gen_sql.py / gen_sql_v2.py 清洗而来,去掉项目专有口径,
保留可复用骨架。改 TBL / WINDOWS / Q() 即可用于任何内网取数任务。

设计要点(每条都是踩坑沉淀):
- 多窗口共用同一套算子,只换日期 → 各窗结果可比、可拼时间趋势。
- 采样开关 SAMP():`mod(user_id, N) = 0`,1/N 一致采样。user_id 是 bigint,
  取模天然合法 —— 绝不用 from_big_endian_64/xxhash64 之类(iDA 的 GPT-5.5 会改崩成
  非法的 abs(varbinary))。一致 = 同一 mod 口径贯穿所有子查询,比率无偏。
- 每条 query 折成单行写进 paste_*.txt(iDA 输入框遇换行会提前提交)。
- paste 文件保持 ASCII(中文会粘贴乱码);中文/英文说明放进消息正文,并明令
  "Run EXACTLY as written, do NOT modify any function/expression"。
- 大窗超时 → 用 SAMP() 版;务必先在有全量结果的小窗校验「比率」无偏再信任。

用法:python3 gen_sql_template.py  →  产 queries_<label>.sql + paste_<label>.txt
"""
import os
import pathlib

HERE = pathlib.Path(__file__).resolve().parent

# ---- 1. 改这里:底表 + 常用谓词 ----
TBL = "your_db.your_table"            # 例 ad_algo.vertical_all_scenario_intent

def SAMP(n=10):
    """1/N 一致取模采样。user_id 须为 bigint。同一口径贯穿所有子查询 → 比率无偏。"""
    return f"mod(user_id, {n}) = 0"


# ---- 2. 改这里:把分析口径写成 query 字典(占位 {W} = 日期窗谓词, {S} = 采样谓词)----
def Q(date_lo, date_hi, sample_n=None):
    """返回 {query_name: sql} 字典。sample_n=None 表示全量;给整数则加采样谓词。"""
    W = f"p_date BETWEEN '{date_lo}' AND '{date_hi}'"
    S = (" AND " + SAMP(sample_n)) if sample_n else ""
    q = {}

    # 例 a:量级 —— 单扫描,基数估计(approx_count_distinct 误差 <2%,省内存防超时)
    q["q_counts"] = (
        f"SELECT some_dim, COUNT(*) AS rows_cnt, "
        f"approx_count_distinct(user_id) AS users "
        f"FROM {TBL} WHERE {W}{S} GROUP BY some_dim"
    )

    # 例 b:覆盖 —— 单扫描 + 条件计数(IF 进 approx_count_distinct,一次扫描出多列)
    q["q_coverage"] = (
        f"SELECT some_dim, "
        f"approx_count_distinct(user_id) AS users_any, "
        f"approx_count_distinct(IF(field_a IS NOT NULL, user_id, NULL)) AS users_a, "
        f"approx_count_distinct(IF(field_b IS NOT NULL, user_id, NULL)) AS users_b "
        f"FROM {TBL} WHERE {W}{S} GROUP BY some_dim"
    )

    # 例 c:集合重合 —— FULL OUTER JOIN 两个去重集(小窗用;大窗超时改采样)
    q["q_overlap"] = (
        f"WITH s AS (SELECT DISTINCT user_id FROM {TBL} WHERE {W} AND group_x='A' AND field_b IS NOT NULL{S}), "
        f"p AS (SELECT DISTINCT user_id FROM {TBL} WHERE {W} AND group_x='B' AND field_b IS NOT NULL{S}) "
        f"SELECT COUNT(IF(p.user_id IS NULL,1,NULL)) AS only_a, "
        f"COUNT(IF(s.user_id IS NULL,1,NULL)) AS only_b, "
        f"COUNT(IF(s.user_id IS NOT NULL AND p.user_id IS NOT NULL,1,NULL)) AS both "
        f"FROM s FULL OUTER JOIN p ON s.user_id=p.user_id"
    )

    # 例 d:共同出现池(co-presence)—— 单扫描按 user 聚合两组标志位再 JOIN
    #   分母需「全部 user」,不可预过滤 → 大窗只能采样,或单扫描等价重写
    q["q_copresence"] = (
        f"WITH su AS (SELECT user_id, MAX(IF(field_b IS NOT NULL,1,0)) AS has_b "
        f"FROM {TBL} WHERE {W} AND group_x='A'{S} GROUP BY user_id), "
        f"pu AS (SELECT user_id, MAX(IF(field_b IS NOT NULL,1,0)) AS has_b "
        f"FROM {TBL} WHERE {W} AND group_x='B'{S} GROUP BY user_id) "
        f"SELECT COUNT(*) AS common_users, SUM(su.has_b) AS a_has_b, SUM(pu.has_b) AS b_has_b "
        f"FROM su JOIN pu USING(user_id)"
    )

    # 例 e:集中度 —— Presto 陷阱:window + GROUP/HAVING 混写会报错,
    #   故拆两层:内层窗口子查询 ranked,外层再 GROUP BY
    q["q_concentration"] = (
        f"WITH c AS (SELECT group_x, field_b AS key, approx_count_distinct(user_id) AS u "
        f"FROM {TBL} WHERE {W} AND field_b IS NOT NULL{S} GROUP BY group_x, field_b), "
        f"ranked AS (SELECT group_x, u, ROW_NUMBER() OVER (PARTITION BY group_x ORDER BY u DESC) AS rnk FROM c) "
        f"SELECT group_x, COUNT(*) AS n_key, "
        f"SUM(IF(rnk<=10,u,0))*1.0/SUM(u) AS top10_share, "
        f"SUM(IF(rnk<=100,u,0))*1.0/SUM(u) AS top100_share "
        f"FROM ranked GROUP BY group_x"
    )

    # 例 f:每 user「主项」—— Presto 无 struct(c,key).field;用 max_by(value,key)
    #   主项 = 出现次数最多的项(按 cnt 取 key 对应的 value)
    q["q_main_item"] = (
        f"WITH cnt AS (SELECT user_id, field_b AS item, COUNT(*) AS c "
        f"FROM {TBL} WHERE {W} AND field_b IS NOT NULL{S} GROUP BY user_id, field_b) "
        f"SELECT user_id, max_by(item, c) AS main_item FROM cnt GROUP BY user_id"
    )

    return q


# ---- 3. 改这里:挑哪些 query、跑哪些窗(嵌套窗 → 趋势可比)----
ALL_KEYS = ["q_counts", "q_coverage", "q_overlap", "q_copresence", "q_concentration", "q_main_item"]

# label: (date_lo, date_hi, keys, sample_n)  —— 大窗给 sample_n 走采样
WINDOWS = {
    "3d": ("20260613", "20260615", ALL_KEYS, None),    # 小窗全量(用来校验采样无偏)
    "1w": ("20260612", "20260618", ALL_KEYS, None),
    "2w": ("20260605", "20260618", ALL_KEYS, 10),      # 大窗 1/10 采样
    "1m": ("20260520", "20260618", ALL_KEYS, 10),
}


def to_single_line(sql):
    """折成单行(iDA 输入框遇换行会提前提交)。"""
    return " ".join(sql.split())


def main():
    out_dir = HERE
    for label, (lo, hi, keys, samp) in WINDOWS.items():
        q = Q(lo, hi, samp)
        samp_note = f"(1/{samp} 取模采样 mod(user_id,{samp})=0)" if samp else "(全量)"

        # (a) 可读版:queries_<label>.sql,带 OUT 注释,人看 / 存档
        with open(out_dir / f"queries_{label}.sql", "w") as f:
            f.write(f"-- 窗 {label} ({lo}~{hi}) {samp_note} · 引擎 Presto · 底表 {TBL}\n")
            f.write(f"-- 算子与其它窗一致,仅换日期 → 各窗可比、可拼趋势\n\n")
            for k in keys:
                f.write(f"-- OUT {k}.csv\n{q[k]};\n\n")

        # (b) iDA 粘贴版:paste_<label>.txt,单行,ASCII,带逐条执行指令
        #     注:中文会粘贴乱码,故指令用英文;SQL + 文件名全 ASCII
        with open(out_dir / f"paste_{label}.txt", "w") as f:
            lines = [
                f"Run these {len(keys)} Presto SQL one by one EXACTLY as written "
                f"(do NOT modify/rewrite any function or expression). "
                f"Show each single-row result; for any multi-row result export a CSV named <name>.csv."
            ]
            for i, k in enumerate(keys, 1):
                lines.append(f"Q{i} ({k}.csv): {to_single_line(q[k])};")
            f.write(" ".join(lines) + "\n")

        print(f"{label}: {len(keys)} queries {samp_note} -> queries_{label}.sql + paste_{label}.txt")

    print("\n下一步: cat paste_<label>.txt | pbcopy  →  Chrome 插件粘贴进 iDA(模型选 GPT-5.5)→ 发送")


if __name__ == "__main__":
    main()
