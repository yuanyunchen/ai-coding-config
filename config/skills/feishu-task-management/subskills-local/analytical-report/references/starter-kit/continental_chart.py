#!/usr/bin/env python3
"""Continental coverage-multiple chart: horizontal diverging bars (teal=search-favored,
orange=pixel-favored), reference line at parity (1.0), per-bar net-gain% + favored counts.
Palette matches report: search #1f6f8b, pixel #c8742a."""
import json, pathlib
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

ROOT = pathlib.Path(__file__).resolve().parent.parent
for fp in ["/System/Library/Fonts/PingFang.ttc","/System/Library/Fonts/Hiragino Sans GB.ttc"]:
    if pathlib.Path(fp).exists():
        fm.fontManager.addfont(fp); plt.rcParams["font.family"]=fm.FontProperties(fname=fp).get_name(); break
plt.rcParams["axes.unicode_minus"]=False
TEAL="#1f6f8b"; ORANGE="#c8742a"

d=json.loads((ROOT/"charts_2w"/"continental.json").read_text())["rollup"]
d=[x for x in d if x["continent"]!="Antarctica"]          # drop noise
d.sort(key=lambda x:x["coverage_multiple"])
CN={"Asia":"亚洲","Europe":"欧洲","North America":"北美","South America":"南美","Africa":"非洲","Oceania":"大洋洲"}

fig,ax=plt.subplots(figsize=(9.6,4.8))
ys=range(len(d)); COLA=3.35; COLB=4.15
for y,x in zip(ys,d):
    cov=x["coverage_multiple"]; col=TEAL if cov>=1 else ORANGE
    ax.barh(y,cov,color=col,height=0.62,zorder=3)
    if cov>=1.0:   # value inside bar (white)
        ax.text(cov-0.05,y,f"{cov:.2f}×",va="center",ha="right",fontsize=10.5,weight="bold",color="white")
    else:          # value just right of short bar
        ax.text(cov+0.05,y,f"{cov:.2f}×",va="center",ha="left",fontsize=10.5,weight="bold",color=col)
    ax.text(COLA,y,f"净增 {x['net_gain_pct']:.0f}%",va="center",ha="left",fontsize=9,color="#555")
    ax.text(COLB,y,f"占优 {x['search_favored']}/{x['pixel_favored']} 国",va="center",ha="left",fontsize=9,color="#555")
ax.axvline(1.0,color="#999",ls="--",lw=1,zorder=2)
ax.text(1.02,-0.92,"parity 1.0",fontsize=8,color="#999",va="center",ha="left")
ax.text(COLA,len(d)-0.58,"净增率",fontsize=8,color="#999",ha="left")
ax.text(COLB,len(d)-0.58,"占优国数(S/P)",fontsize=8,color="#999",ha="left")
ax.set_yticks(list(ys)); ax.set_yticklabels([f"{CN.get(x['continent'],x['continent'])} · {x['countries']}国" for x in d],fontsize=10)
ax.set_xlim(0,4.9); ax.set_xticks([0,0.5,1,1.5,2,2.5,3]); ax.set_xlabel("城市信号覆盖倍数  search用户 ÷ pixel用户(>1 = search 占优)")
ax.set_title("各大洲 city 信号覆盖倍数 — search 在亚/欧/非约 3×,在南美·大洋洲 pixel 反超",
             loc="left",fontsize=12,weight="bold")
for s in ["top","right"]: ax.spines[s].set_visible(False)
ax.spines["left"].set_color("#ccc"); ax.spines["bottom"].set_color("#ccc")
ax.tick_params(length=0)
fig.tight_layout()
out=str(ROOT/"charts_2w"/"c_F_continental.png")
fig.savefig(out,dpi=170); plt.close()
print("saved",out)
for x in d: print(f"  {x['continent']:<14} cov={x['coverage_multiple']}× netgain={x['net_gain_pct']}% fav={x['search_favored']}/{x['pixel_favored']}")
