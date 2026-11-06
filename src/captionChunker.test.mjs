import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chunk, lint} from './captionChunker.mjs';

const w = (text, start, end) => ({text, start, end});

test('chunker refuses to invent timings', () => {
  assert.throws(() => chunk([]), /timings are required/);
  assert.throws(() => chunk([{text: 'ضوء'}]), /timings are required/);
});

test('chunker holds the 2-6 word and 0.7-3.2s window on realistic speech', () => {
  // ~3.3 words/second, the pace of the approved narration
  const words = Array.from({length: 14}, (_, i) => w('كلمة', i * 0.3, i * 0.3 + 0.28));
  const out = chunk(words);
  assert.deepEqual(lint(out), []);
});

test('chunker never ends a chunk on a dangling particle', () => {
  const words = [w('الضوء', 0, 0.3), w('بيمشي', 0.3, 0.6), w('في', 0.6, 0.75), w('الهوا', 0.75, 1.1), w('على', 1.1, 1.25), w('طول', 1.25, 1.6)];
  const out = chunk(words);
  for (const c of out) {
    const last = c.text.trim().split(/\s+/).pop();
    assert.ok(!['في', 'على', 'من', 'و'].includes(last), `chunk ended on ${last}: ${c.text}`);
  }
});

test('JS chunker matches the Python reference oracle on the same input', () => {
  const words = [w('بص', 0, 0.47), w('للسما', 0.47, 0.83), w('في', 0.83, 0.97), w('عز', 0.97, 1.13), w('النهار،', 1.13, 1.87),
                 w('وبص', 1.87, 2.2), w('لنفس', 2.2, 2.5), w('السما', 2.5, 2.9), w('وقت', 2.9, 3.1), w('الغروب.', 3.1, 3.63)];
  const js = chunk(words).map(c => c.text);
  const py = JSON.parse(execFileSync('python3', ['-c',
    'import json,sys; sys.path.insert(0,"scripts"); import caption_chunker as c; ' +
    'w=json.loads(sys.argv[1]); print(json.dumps([g["text"] for g in c.chunk(w)]))',
    JSON.stringify(words)], {encoding: 'utf8'}));
  assert.deepEqual(js, py);
});
