// Guards that config/layout_720x1280.json and src/captionPolicy.ts agree.
// Run by `npm test` and by CI: two scales for one canvas was defect 1 in 04.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const cfg = JSON.parse(fs.readFileSync(new URL('../config/layout_720x1280.json', import.meta.url)));
const src = fs.readFileSync(new URL('../src/captionPolicy.ts', import.meta.url), 'utf8');
const num = (re) => { const m = src.match(re); if (!m) throw new Error('pattern not found: ' + re); return m.slice(1).map(Number); };
assert.deepEqual(num(/CANVAS = \{w: (\d+), h: (\d+)\}/), [cfg.canvas.w, cfg.canvas.h], 'canvas mismatch');
assert.deepEqual(num(/CAPTION_SLOT = \{x: \[(\d+), (\d+)\], y: \[(\d+), (\d+)\]/), [...cfg.topSlot.x, ...cfg.topSlot.y], 'top slot mismatch');
assert.deepEqual(num(/STAGE_BAND = \{y: \[(\d+), (\d+)\], height: (\d+)\}/), [cfg.stage.y[0], cfg.stage.y[1], cfg.stage.height], 'stage band mismatch');
assert.deepEqual(num(/DISCLAIMER_BAND = \{y: \[(\d+), (\d+)\]\}/), cfg.disclaimer.y, 'disclaimer mismatch');
assert.equal(cfg.stage.height, cfg.stage.y[1] - cfg.stage.y[0], 'stage height must equal its own band');
assert.equal(cfg.stage.height, 811, 'approved stage height is 811 px');
console.log('layout config OK (720x1280, stage 811 px, one source of truth)');
