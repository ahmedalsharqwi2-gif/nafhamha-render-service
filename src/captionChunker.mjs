// Faithful port of the project's reference oracle: scripts/caption_chunker.py
// Kept in JS so the Remotion render and npm test use the same rules as the gate.
const PUNCT_HARD = new Set(['،', ',', '.', '؟', '?', '!', ':', '؛', ';', '…']);
const DANGLING = new Set(['في','من','على','إلى','الى','عن','مع','و','ف','ثم','أو','او','لكن','بس','ما','لا','لو','إن','ان','أن','إذا','اذا','لما','علشان','عشان','زي','يعني','كل','بعد','قبل','حتى','ده','دي','دا','اللي','الي','اللى']);
export const MIN_W = 2, TARGET_W = 4, MAX_W = 6, MIN_S = 0.7, MAX_S = 3.2;
const bare = (w) => w.replace(/[\u064B-\u0652\u0640،,.؟?!:؛;…]/g, '').trim();
const endsClause = (w) => w.length > 0 && PUNCT_HARD.has(w[w.length - 1]);
const isDangling = (w) => DANGLING.has(bare(w));

export function chunk(words) {
  if (!Array.isArray(words) || words.length === 0 || words.some(w => typeof w.start !== 'number' || typeof w.end !== 'number'))
    throw new Error('word-level timings are required; refusing to invent them');
  const groups = []; let cur = []; let i = 0; const n = words.length;
  const flush = () => { if (cur.length) { groups.push(cur); cur = []; } };
  while (i < n) {
    cur.push(words[i]);
    const t = words[i].text;
    const dur = cur[cur.length - 1].end - cur[0].start;
    if (endsClause(t) && cur.length >= MIN_W) flush();
    else if (cur.length >= TARGET_W || dur >= MAX_S - 0.4) {
      while (cur.length > MIN_W && isDangling(cur[cur.length - 1].text)) { i -= 1; cur.pop(); }
      flush();
    } else if (cur.length >= MAX_W) {
      while (cur.length > MIN_W && isDangling(cur[cur.length - 1].text)) { i -= 1; cur.pop(); }
      flush();
    }
    i += 1;
  }
  flush();
  const out = [];
  for (const g of groups) {
    const d = g[g.length - 1].end - g[0].start;
    const prev = out[out.length - 1];
    if (prev && (g.length < MIN_W || d < MIN_S) && prev.length + g.length <= MAX_W && g[g.length - 1].end - prev[0].start <= MAX_S) {
      prev.push(...g); continue;
    }
    out.push(g);
  }
  for (let k = 0; k + 1 < out.length; k++) {
    const a = out[k], b = out[k + 1];
    while (a.length > MIN_W && isDangling(a[a.length - 1].text) && b.length < MAX_W) b.unshift(a.pop());
  }
  return out.map(g => ({text: g.map(w => w.text).join(' '), start: g[0].start, end: g[g.length - 1].end, words: g}));
}

export function lint(groups) {
  const bad = [];
  groups.forEach((g, k) => {
    const ws = g.text.split(/\s+/).filter(Boolean); const d = g.end - g.start;
    if (ws.length < MIN_W || ws.length > MAX_W) bad.push(`#${k} has ${ws.length} words: ${g.text}`);
    if (d < MIN_S - 1e-6 || d > MAX_S + 1e-6) bad.push(`#${k} lasts ${d.toFixed(2)}s: ${g.text}`);
    const last = ws[ws.length - 1];
    if (ws.length > 1 && isDangling(last) && !endsClause(last)) bad.push(`#${k} ends on a dangling word: ${g.text}`);
  });
  return bad;
}
