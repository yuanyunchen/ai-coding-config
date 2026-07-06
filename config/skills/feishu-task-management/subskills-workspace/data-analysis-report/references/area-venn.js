// 面积精确两集维恩(Euler):圆面积 ∝ 各源总数,透镜(交集)面积严格 ∝ |A∩B|。
// 修的 bug:旧版用固定重叠比例画"示意维恩",会把很小的交集画得很大(误导)。
// 正解:圆面积按 sqrt 定半径(已自然成比例),再【数值解圆心距 d】让透镜面积 == 目标。
//
// 入参:so=|A only|, po=|B only|, both=|A∩B|(原始计数,单位随意,同量纲即可)。
// 出参:两圆半径 rA/rB、圆心 (cxA,cy)/(cxB,cy)、圆心距 d。lensArea(d)/(π·rA²) === both/(so+both)。

function areaVenn(so, po, both, W = 520, H = 330) {
  const areaA = so + both, areaB = po + both;
  const maxArea = Math.max(areaA, areaB);
  const rMax = Math.min(W * 0.27, H * 0.40);
  const rOf = a => rMax * Math.sqrt(a / maxArea);   // 面积 ∝ a  ⇒  r ∝ sqrt(a)
  const rA = rOf(areaA), rB = rOf(areaB);
  const rSmall = Math.min(rA, rB);

  // 目标透镜面积(px²):占大圆的比例 = both/maxArea(等价于占 A 圆的 both/areaA)
  const targetLens = Math.PI * rMax * rMax * (both / maxArea);

  // 两圆(半径 rA,rB,圆心距 d)的透镜面积闭式;d 增大 → 透镜单调减小
  const lensArea = d => {
    if (d >= rA + rB) return 0;                       // 相离
    if (d <= Math.abs(rA - rB)) return Math.PI * rSmall * rSmall; // 内含
    const a1 = Math.max(-1, Math.min(1, (d * d + rA * rA - rB * rB) / (2 * d * rA)));
    const a2 = Math.max(-1, Math.min(1, (d * d + rB * rB - rA * rA) / (2 * d * rB)));
    const tri = Math.sqrt(Math.max(0, (-d + rB + rA) * (d + rB - rA) * (d - rB + rA) * (d + rB + rA)));
    return rA * rA * Math.acos(a1) + rB * rB * Math.acos(a2) - 0.5 * tri;
  };

  // 二分求 d(单调),60 次足够收敛
  let lo = Math.abs(rA - rB), hi = rA + rB, d = (lo + hi) / 2;
  for (let i = 0; i < 60; i++) { d = (lo + hi) / 2; if (lensArea(d) > targetLens) lo = d; else hi = d; }

  const span = rA + d + rB;             // 水平居中放置
  const cxA = (W - span) / 2 + rA, cxB = cxA + d, cy = H * 0.48;
  return { rA, rB, cxA, cxB, cy, d, lensArea: lensArea(d) };
}

// 自检:lens 占 A 圆比例应 == both/areaA(本会话 l2:6.8%),占 B 圆 == both/areaB(20.3%)。
// const g = areaVenn(240081274, 68552947, 17464715);
// g.lensArea/(Math.PI*g.rA**2)  // ≈ 0.068

// SVG 绘制 stub:用返回的几何画两圆 + 裁出透镜加深 + 标数。
// A 圆(search)teal、B 圆(pixel)orange;交集 = 把 A 圆裁到 B 圆内再加深。
function vennSVG(so, po, both, opt = {}) {
  const W = opt.W || 520, H = opt.H || 330, id = opt.id || 'v';
  const A = opt.colorA || '#1f6f8b', B = opt.colorB || '#c8742a', ink = '#1a1a1a';
  const g = areaVenn(so, po, both, W, H);
  const m = n => (n / 1e6).toFixed(1) + 'M';
  const lensCx = ((Math.max(g.cxA - g.rA, g.cxB - g.rB)) + (Math.min(g.cxA + g.rA, g.cxB + g.rB))) / 2;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="cp${id}"><circle cx="${g.cxB}" cy="${g.cy}" r="${g.rB}"/></clipPath></defs>
  <circle cx="${g.cxA}" cy="${g.cy}" r="${g.rA}" fill="${A}" opacity=".30"/><circle cx="${g.cxA}" cy="${g.cy}" r="${g.rA}" fill="none" stroke="${A}" stroke-width="2"/>
  <circle cx="${g.cxB}" cy="${g.cy}" r="${g.rB}" fill="${B}" opacity=".30"/><circle cx="${g.cxB}" cy="${g.cy}" r="${g.rB}" fill="none" stroke="${B}" stroke-width="2"/>
  <g clip-path="url(#cp${id})"><circle cx="${g.cxA}" cy="${g.cy}" r="${g.rA}" fill="${ink}" opacity=".32"/></g>
  <text x="${g.cxA - g.rA * 0.4}" y="${g.cy}" text-anchor="middle" font-weight="700" fill="${A}">A 独有 ${m(so)}</text>
  <text x="${g.cxB + g.rB * 0.48}" y="${g.cy}" text-anchor="middle" font-weight="700" fill="${B}">B 独有 ${m(po)}</text>
  <text x="${lensCx}" y="${H - 12}" text-anchor="middle" font-weight="700" fill="${ink}">交集 ${m(both)}</text>
</svg>`;
}
