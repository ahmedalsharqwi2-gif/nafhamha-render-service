// Validates every caption event of the episode against the 2-6 word / 0.7-3.2 s rule.
// Episode timings are frames at 30 fps; the chunker works in seconds.
import fs from 'node:fs';
import {chunk, lint} from '../src/captionChunker.mjs';
const FPS = 30;
const props = JSON.parse(fs.readFileSync(new URL('../experiments/openmontage/authoring/props.json', import.meta.url)));
let all = [], problems = [];
props.scenes.forEach((s, i) => {
  if (!s.captions?.every(c => Array.isArray(c.words))) { problems.push(`scene ${i}: missing word-level timings`); return; }
  const words = s.captions.flatMap(c => c.words.map(w => ({text: w.text, start: w.start / FPS, end: w.end / FPS})))
    .filter(w => { if (w.end <= w.start) { problems.push(`scene ${i}: degenerate word timing «${w.text}» (${w.start*FPS}-${w.end*FPS} frames)`); return false; } return true; });
  const chunks = chunk(words);
  all.push(...chunks);
  lint(chunks).forEach(e => problems.push(`scene ${i}: ${e}`));
});
const longest = Math.max(...all.map(c => c.text.split(' ').length));
const span = [Math.min(...all.map(c=>c.end-c.start)), Math.max(...all.map(c=>c.end-c.start))];
console.log(JSON.stringify({episode: 'sky', chunks: all.length, maxWords: longest, durationRangeSeconds: span.map(n=>+n.toFixed(2)), lintErrors: problems.length}, null, 2));
if (problems.length) { problems.slice(0, 12).forEach(p => console.log(' - ' + p)); process.exitCode = 1; }
