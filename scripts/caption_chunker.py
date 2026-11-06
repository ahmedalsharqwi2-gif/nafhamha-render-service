"""Phrase-aware caption chunker (reference implementation, tested).

Input : word timings [{'text','start','end'}] from forced alignment (seconds).
Output: caption groups [{'text','start','end','words':[...]}] that
  * break at punctuation first, never inside a clause when avoidable,
  * never END on a dangling particle (preposition / conjunction / "ما" ...),
  * hold 2-6 words (target 3-5) and 0.7-3.2 s on screen.
No word timing -> raise. Never invent timings.
"""
import re
PUNCT_HARD = set("،,.؟?!:؛;…")
# Arabic function words that must not be the LAST word of a chunk.
DANGLING = {
 "في","من","على","إلى","الى","عن","مع","و","ف","ثم","أو","او","لكن","بس","ما","لا","لو","إن","ان","أن",
 "إذا","اذا","لما","علشان","عشان","زي","يعني","كل","بعد","قبل","حتى","ده","دي","دا","اللي","الي","اللى",
}
MIN_W, TARGET_W, MAX_W = 2, 4, 6
MIN_S, MAX_S = 0.7, 3.2

def _bare(w):  # strip punctuation + tashkeel for lookup
    return re.sub(r"[\u064B-\u0652\u0640" + re.escape("".join(PUNCT_HARD)) + r"]", "", w).strip()

def _ends_clause(w):
    return bool(w) and w[-1] in PUNCT_HARD

def _is_dangling(w):
    return _bare(w) in DANGLING

def chunk(words):
    if not words or any(("start" not in w or "end" not in w) for w in words):
        raise ValueError("word-level timings are required; refusing to invent them")
    groups, cur = [], []
    def flush():
        nonlocal cur
        if cur:
            groups.append(cur); cur = []
    i = 0
    n = len(words)
    while i < n:
        cur.append(words[i])
        t = words[i]["text"]
        dur = cur[-1]["end"] - cur[0]["start"]
        hard = _ends_clause(t) and len(cur) >= MIN_W
        full = len(cur) >= TARGET_W or dur >= MAX_S - 0.4
        if hard:
            flush()
        elif full:
            # never end on a particle: push trailing particles to the next chunk
            while len(cur) > MIN_W and _is_dangling(cur[-1]["text"]):
                i -= 1; cur.pop()
            flush()
        elif len(cur) >= MAX_W:
            while len(cur) > MIN_W and _is_dangling(cur[-1]["text"]):
                i -= 1; cur.pop()
            flush()
        i += 1
    flush()
    # merge orphans (1 word or < MIN_S) into a neighbour when it keeps limits
    out = []
    for g in groups:
        d = g[-1]["end"] - g[0]["start"]
        if out and (len(g) < MIN_W or d < MIN_S):
            prev = out[-1]
            if len(prev) + len(g) <= MAX_W and g[-1]["end"] - prev[0]["start"] <= MAX_S:
                prev.extend(g); continue
        out.append(g)
    # a trailing/leading dangling word that survived the merge moves forward
    for a, b in zip(out, out[1:]):
        while len(a) > MIN_W and _is_dangling(a[-1]["text"]) and len(b) < MAX_W:
            b.insert(0, a.pop())
    return [{"text": " ".join(w["text"] for w in g), "start": g[0]["start"], "end": g[-1]["end"], "words": g} for g in out]

def lint(groups):
    """Return a list of human-readable problems; empty list means pass."""
    bad = []
    for k, g in enumerate(groups):
        ws = g["text"].split(); d = g["end"] - g["start"]
        if not MIN_W <= len(ws) <= MAX_W: bad.append(f"#{k} has {len(ws)} words: {g['text']}")
        if not (MIN_S - 1e-6) <= d <= (MAX_S + 1e-6): bad.append(f"#{k} lasts {d:.2f}s: {g['text']}")
        if len(ws) > 1 and _is_dangling(ws[-1]) and not _ends_clause(ws[-1]): bad.append(f"#{k} ends on a dangling word: {g['text']}")
    return bad
