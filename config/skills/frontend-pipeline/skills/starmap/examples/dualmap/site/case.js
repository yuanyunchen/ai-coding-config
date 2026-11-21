// Worked examples page: renders data/<scale>/case.json (written by dual/case/run.py). Every number on the page comes from that file.
(async () => {
const scale = new URLSearchParams(location.search).get('data') || 'pilot', dir = `data/${scale}/`;
const view = document.getElementById('view'), theme = document.getElementById('theme');
theme.onclick = () => { const r = document.documentElement, light = r.dataset.theme !== 'light'; r.dataset.theme = light ? 'light' : 'dark'; theme.textContent = light ? 'Dark' : 'Light'; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
let c;
try { c = await (await fetch(dir + 'case.json')).json(); }
catch (e) { view.innerHTML = `<div class="doc-in"><h2>No worked example in ${esc(dir)} yet</h2></div>`; return; }

const pp = v => v == null ? 'n/a' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(1);   // resid per vote, in points of win rate
const est = s => s ? `${pp(s.est)} [${pp(s.lo)}, ${pp(s.hi)}]` : 'n/a';
const pct = v => v == null ? 'n/a' : (v * 100).toFixed(1) + '%';
const excl = s => s && (s.lo > 0 || s.hi < 0);
const kv = items => `<div class="kv">${items.map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('')}</div>`;
const thumbs = ids => `<div class="thumbs">${ids.map(i => `<img loading="lazy" alt="" src="${dir}thumbs/${i}.webp">`).join('')}</div>`;
const S = c.statistics, U = c.summary, chosen = new Set(c.cases.map(q => q.cluster));
const all = [...S.clusters.map(s => s.mean), ...c.cases.filter(q => q.validation).flatMap(q => [q.validation.effect_recognizer, q.validation.effect_cluster].filter(Boolean).flatMap(t => [t.diff, t.mean]))];
const lim = Math.max(...all.flatMap(s => [Math.abs(s.lo), Math.abs(s.hi)]).filter(isFinite)) || 1;
const x = v => 50 + 50 * Math.max(-1, Math.min(1, v / lim));
// one interval row: neutral when the interval includes zero, green / red otherwise
const row = (label, s, note, on) => !s ? '' : `<div class="row${on ? ' on' : ''}"><span>${label}</span>
  <div class="iv ${excl(s) ? (s.est < 0 ? 'neg' : '') : 'neu'}"><i></i><u style="left:${x(s.lo)}%;width:${x(s.hi) - x(s.lo)}%"></u><s style="left:${x(s.est)}%"></s></div>
  <span class="n">${est(s)} · ${note}</span></div>`;
const sorted = [...S.clusters].sort((a, b) => b.mean.est - a.mean.est);
const verdict = v => `<b style="color:var(--${v ? 'lime' : 'rose'})">${v ? 'pass' : 'fail'}</b>`;

const gateHtml = q => !q.gate ? '' : `<div class="gt">Specificity gate on development pages (semdev role), before confirm is opened: precision at least ${pct(U.gate.precision)}, recall at least ${pct(U.gate.recall)}, positive share within ${U.gate.share_factor}× of the cluster's share</div>
<table class="t"><tr><th>Round</th><th>Definition tried</th><th>Precision</th><th>Recall</th><th>Positive share / cluster share</th><th>Gate</th></tr>
${q.gate.map(g => `<tr><td class="n">${g.round === 0 ? 'first wording' : 'rewording ' + g.round}</td><td>${esc(g.definition)}</td><td class="n">${pct(g.precision)} (${g.tp}/${g.tp + g.fp})</td><td class="n">${pct(g.recall)} (${g.tp}/${g.tp + g.fn})</td><td class="n">${pct(g.positive_share)} / ${pct(g.cluster_share)}</td><td>${verdict(g.passed)}</td></tr>`).join('')}</table>`;
const head = (q, n) => { const D = q.discrete, P = q.explore; return `<p class="note">Why this cluster: ${esc(q.selected_by)}. ${P.pages} explore pages, ${P.votes} votes, ${P.tournaments} tournaments; explore effect ${est(P.mean)}${excl(P.mean) ? '' : ' (interval includes zero)'}.</p>
<div class="gt">The cluster in the existing vocabulary (baseline labels on ${q.vocabulary.labelled_pages} explore pages of the cluster; render failure on ${pct(q.vocabulary.fail_render_share)} of them)</div>
${q.vocabulary.concepts.length ? `<table class="t"><tr><th>Existing concept</th><th>Share in cluster</th><th>Share in all explore pages</th><th>Lift</th><th>Pages</th></tr>
${q.vocabulary.concepts.map(r => `<tr><td>${esc(r.concept)}</td><td class="n">${pct(r.share)}</td><td class="n">${pct(r.base)}</td><td class="n">${r.lift.toFixed(2)}×</td><td class="n">${r.n}</td></tr>`).join('')}</table>`
  : '<p class="note">No existing concept is over-represented (lift above 1 with at least 5 pages).</p>'}
<div class="gt">Group A · 12 explore pages nearest the cluster centre (${D.prototype_tournaments} tournaments)</div>${thumbs(D.prototypes)}
<div class="gt">Group B · ${q.contrast ? `hard negatives: the 12 nearest explore pages outside the cluster with the cluster's dominant baseline look, ${esc(q.contrast.look)} (${pct(q.contrast.look_share_in_cluster)} of the cluster)` : `12 nearest pages from the neighbouring clusters ${D.neighbour_clusters.join(', ')}`}</div>${thumbs(D.negatives)}
<div class="def"><h4>${esc(D.name)}</h4><p>${esc(D.definition)}</p></div>
<details><summary>Features the model listed as separating A from B</summary><ul>${D.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul></details>
${gateHtml(q)}`; };
const caseHtml = (q, n) => { const D = q.discrete, V = q.validation, P = q.explore, E = D.schema_entry;
if (!V) return `<div class="step" id="case${n}">Case ${n} · cluster ${q.cluster} · method ${q.method}</div>
<h3>${esc(D.name)}</h3>
<div class="verdict"><b>Not validated: no wording passed the specificity gate.</b><p>${esc(q.outcome)}. Confirm pages were not opened for this cluster.</p></div>
${head(q, n)}`;
const R = V.recognizer_vs_cluster, K = V.second_labeler, ER = V.effect_recognizer, EC = V.effect_cluster;
return `<div class="step" id="case${n}">Case ${n} · cluster ${q.cluster} · method ${q.method}</div>
<h3>${esc(D.name)}</h3>
<div class="verdict ${V.passed ? 'pass' : 'fail'}"><b>Validation ${V.passed ? 'passed' : 'failed'}.</b>
<p>On ${V.pages.toLocaleString()} confirm pages, pages the recognizer marks as “${esc(D.name)}” differ from the rest by ${est(ER && ER.diff)} points of win rate beyond model strength
(${ER ? `${ER.pages} positive pages, ${ER.votes} votes` : 'no positive pages'}). The explore effect of the cluster was ${est(P.mean)}.
By cluster membership the finding ${V.cluster_replicates ? 'replicates' : 'does not replicate'} on confirm: ${est(EC && EC.diff)}.</p></div>
${head(q, n)}
<p class="note">Registry check: <b>${E.decision === 'combination' ? 'a combination of existing concepts' : 'a new node'}</b>${E.composed_of.length ? ` (${E.decision === 'combination' ? 'composed of' : 'parts'}: ${E.composed_of.map(esc).join(', ')})` : ''}. ${esc(E.reason)}</p>
<details><summary>Schema entry</summary><pre class="j">${esc(JSON.stringify(E, null, 1))}</pre></details>
${kv([[pct(R.precision), `precision against cluster membership (${R.tp} of ${R.tp + R.fp} recognizer positives are in the cluster)`],
      [pct(R.recall), `recall (${R.tp} of ${R.tp + R.fn} cluster members are recognizer positives)`],
      [K.kappa == null ? 'n/a' : K.kappa.toFixed(2), `Cohen's kappa with ${esc(c.second_labeler)} on ${K.n} pages (agree on ${K.agree})`]])}
${V.recognizer_failed ? `<p class="note">${V.recognizer_failed} recognizer calls failed; those pages are left out.</p>` : ''}
<div class="rows">
${row('explore · cluster mean', P.mean, `${P.pages} pages`)}
${row('confirm · cluster mean', EC && EC.mean, `${EC ? EC.pages : 0} pages`)}
${row('confirm · cluster vs rest', EC && EC.diff, `${EC ? EC.pages : 0} pages`)}
${row('confirm · recognizer yes vs no', ER && ER.diff, `${ER ? ER.pages : 0} pages`, true)}
</div>
<div class="gt">Confirm pages the recognizer said yes to (${V.positives.length} drawn at random)</div>${thumbs(V.positives)}
<div class="gt">Recognizer yes, but outside the cluster (${V.false_positives.length} drawn at random)</div>${thumbs(V.false_positives)}`; };

view.innerHTML = `<div class="doc-in">
<div class="eb">Worked examples · ${esc(c.scale)} data</div>
<h2>From a region of the continuous space to a named concept, then tested on held-out pages</h2>
<p class="lede">The method run on real pages: cluster pages by look, find clusters voters treat differently, have a vision model
put each into words, then check on pages never used for discovery whether the worded concept still carries the effect.</p>
${c.scale !== 'pilot' ? `<div class="callout"><b>Smoke data.</b> ${esc(c.note)}</div>` : ''}
${U.stopped_on_http_402 ? '<div class="callout"><b>Incomplete.</b> The labeling account ran out of credit during this run; failed calls are counted per case.</div>' : ''}
<div class="verdict ${U.passed === U.cases ? 'pass' : U.passed ? '' : 'fail'}"><b>Method v1: ${U.v1.passed} of ${U.v1.cases} cases pass validation, ${U.v1.cluster_replicates} of ${U.v1.cases} clusters replicate on confirm.
Method v2: ${U.v2.gate_passed} of ${U.v2.cases} cases pass the specificity gate, ${U.v2.passed} pass validation, ${U.v2.cluster_replicates} of the ${U.v2.gate_passed} opened clusters replicate.</b>
<p>Pass rule: ${esc(c.pass_rule)}. Validation uses all ${c.continuous.confirm_pages.toLocaleString()} confirm pages; definitions were frozen before any confirm page was read. Effects are points of win rate beyond model strength with 95% intervals (bootstrap over tournaments).</p></div>
<p class="note"><b>What changed from v1 to v2, and why.</b> In v1 the vision model compared a cluster with its neighbouring clusters, which for the two look clusters were dark or near-empty pages; the definitions it wrote ("bright hero", "product landing page") were true of the cluster but also of a quarter to two thirds of all pages, so the recognizer could not carry a cluster-sized effect.
v2 changes three things: the contrast set is hard negatives (pages outside the cluster with the same baseline look, nearest in the embedding); the prompt asks what group A shares that these similar pages do not; and before any confirm page is read the definition must pass a specificity gate on development pages (precision ${pct(U.gate.precision)}, recall ${pct(U.gate.recall)}, positive share within ${U.gate.share_factor}× of the cluster's), with at most two rewordings from its own false positives.
A cluster whose wording never passes is kept as a continuous region and its confirm pages stay unopened. v2 ran on new clusters only (${U.v2_clusters.join(', ')}); v1 results are unchanged.</p>
<table class="t" style="max-width:none"><tr><th>Case</th><th>Method</th><th>Concept</th><th>Registry</th><th>Explore, cluster</th><th>Confirm, recognizer yes vs no</th><th>Confirm, cluster vs rest</th><th>Precision / recall</th><th>Kappa</th><th>Gate</th><th>Validation</th></tr>
${c.cases.map((q, n) => { const V = q.validation, g = q.gate && q.gate[q.gate.length - 1];
const lead = `<tr><td class="n"><a href="#case${n}">${n} · cluster ${q.cluster}</a></td><td class="n">${q.method}</td><td>${esc(q.discrete.name)}</td>`;
const gate = g ? `${verdict(g.passed)} <span class="n">${pct(g.precision)} / ${pct(g.recall)}, ${q.gate.length - 1} rewording${q.gate.length === 2 ? '' : 's'}</span>` : 'none (v1)';
if (!V) return `${lead}<td>kept as a continuous region</td><td class="n">${est(q.explore.mean)}</td><td colspan="4">confirm not opened</td><td>${gate}</td><td>not run</td></tr>`;
return `${lead}<td>${q.discrete.schema_entry.decision === 'new' ? 'new node' : 'combination'}</td>
<td class="n">${est(q.explore.mean)}</td><td class="n">${est(V.effect_recognizer && V.effect_recognizer.diff)} · ${V.effect_recognizer ? V.effect_recognizer.pages : 0} pages</td><td class="n">${est(V.effect_cluster && V.effect_cluster.diff)}</td>
<td class="n">${pct(V.recognizer_vs_cluster.precision)} / ${pct(V.recognizer_vs_cluster.recall)}</td><td class="n">${V.second_labeler.kappa == null ? 'n/a' : V.second_labeler.kappa.toFixed(2)}</td><td>${gate}</td><td>${verdict(V.passed)}</td></tr>`; }).join('')}</table>

<div class="step">Step 1 · Continuous space</div>
<h3>Cluster pages by look, with the prompt removed</h3>
<p class="note">CLIP first-screen vectors of ${c.continuous.sibling_share.pages.toLocaleString()} pages. The four pages of a tournament answer the same prompt, so raw neighbours are mostly siblings.
Subtracting each tournament's mean vector removes what the prompt contributes; k-means (k = ${c.k}, seed ${c.seed}) is then fitted on the ${c.continuous.explore_pages.toLocaleString()} explore pages only.
Centring also pushes siblings apart (the four centred vectors of a tournament sum to zero), so the share after centring falls below what unrelated pages would show.</p>
${kv([[pct(c.continuous.sibling_share.before), 'pages with 2+ of 3 siblings among 10 nearest neighbours, before centring'],
      [pct(c.continuous.sibling_share.after), 'the same share after centring'], [c.k, 'clusters']])}

<div class="step">Step 2 · Statistics (explore pages only)</div>
<h3>Which clusters do voters treat differently?</h3>
<p class="note">Per cluster: wins minus the wins expected from model strength, per vote, in points of win rate, with a 95% interval from ${c.bootstrap.toLocaleString()} bootstrap draws of whole tournaments.
${S.n_clusters_excluding_zero} of ${S.n_clusters_min_pages} clusters with at least ${S.min_pages} pages have an interval that excludes zero; with ${S.n_clusters_min_pages} tested, one or two are expected by chance alone, which is why every case is validated.
Highlighted rows are the cases below; the v1 floor was 100 explore pages, v2 lowered it to 80.${S.skipped_render_failure.length ? ` Skipped as render-failure clusters (more than 30% of labelled pages): ${S.skipped_render_failure.map(s => `cluster ${s.cluster} (${pct(s.fail_render_share)})`).join(', ')}.` : ''}
${c.refused_by_api.length ? `${c.refused_by_api.length} candidate image was refused by the API's input filter (HTTP 403) and left out; the next nearest page took its place.` : ''}</p>
<div class="rows">${sorted.map(s => row(`cluster ${s.cluster}`, s.mean, `${s.pages} pages, ${s.votes} votes`, chosen.has(s.cluster))).join('')}</div>

<div class="step">Steps 3 and 4 · One section per case</div>
<p class="note">Cases are in the order of the table; a v2 case shows its gate rounds, and the definition shown is the last one tried. Step 3: the vision model (${esc(c.vlm)}) sees 24 first screens labelled only “group A” and “group B” (no model names, no vote outcomes, no page ids) and writes a definition; a second call checks it against the registry.
Step 4: one yes / no call per confirm page with the frozen definition. Confirm pages share no prompt with explore pages.</p>
${c.cases.map(caseHtml).join('')}
<p class="note">Labeling cost so far: USD ${c.cost_usd}. Source: <code>dual/case/run.py</code>, numbers in <code>${esc(dir)}case.json</code>.</p>
</div>`;
})();
