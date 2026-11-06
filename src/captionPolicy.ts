// Safe-zone policy in the canvas the renderer actually uses: 720x1280 (contract 04).
export const CANVAS = {w: 720, h: 1280} as const;
export const CAPTION_SLOT = {x: [80, 640], y: [193, 337], plateMaxWidth: 520, margin: 27} as const;
// Stage height is 811 px, the measured drawing height of the approved reference
// (nafhamha-sky-final.mp4), owner decision 2026-11-07. The 469 px band in 04
// would force a 0.58x shrink of the approved graphics, which the guide forbids.
export const STAGE_BAND = {y: [347, 1158], height: 811} as const;
// Sits directly under the 811 px stage; 04's 793-823 would land on the drawing.
export const DISCLAIMER_BAND = {y: [1166, 1187]} as const;
export const TEXT_LIMITS = {x: [127, 593], y: [193, 1187]} as const;

export type CaptionEvent = { text: string; start: number; end: number };
const PARTICLES = /(^|\s)(في|من|على|و|ما|لو|لكن|عشان|إلى|عن|مع)$/;

export function assertCaptionEvent(event: CaptionEvent, duration?: number): CaptionEvent {
  const words = event.text.trim().split(/\s+/).filter(Boolean);
  if (event.start < 0 || event.end <= event.start) throw new Error('caption timing must be monotonic and positive');
  if (duration !== undefined && event.end > duration + 1e-6) throw new Error('caption exceeds audio duration');
  if (words.length < 2 || words.length > 6) throw new Error(`caption must be 2-6 words, got ${words.length}`);
  if (event.end - event.start < 0.7 || event.end - event.start > 3.2) throw new Error('caption must last 0.7-3.2 seconds');
  if (PARTICLES.test(event.text.trim())) throw new Error('caption ends on a dangling particle');
  if (/[·–—]/.test(event.text)) throw new Error('caption uses a glyph Cairo renders poorly');
  return event;
}

export function assertTextBox(name: string, bbox: [number, number, number, number], kind: 'text' | 'chrome' = 'text'): void {
  const [x0, y0, x1, y1] = bbox;
  if (x1 <= x0 || y1 <= y0 || x0 < 0 || y0 < 0 || x1 > CANVAS.w || y1 > CANVAS.h) throw new Error(`${name}: invalid bbox ${bbox.join(',')} for ${CANVAS.w}x${CANVAS.h}`);
  if (kind === 'chrome') {
    if (y0 < 87 || y1 > 137) throw new Error(`${name}: chrome leaves the y 87-137 band`);
    return;
  }
  if (y1 <= CAPTION_SLOT.y[1] && y0 >= CAPTION_SLOT.y[0]) {
    if (x0 < CAPTION_SLOT.x[0] + CAPTION_SLOT.margin || x1 > CAPTION_SLOT.x[1] - CAPTION_SLOT.margin) throw new Error(`${name}: caption box leaves the top slot with the 27px margin`);
    return;
  }
  if (x0 < TEXT_LIMITS.x[0] || x1 > TEXT_LIMITS.x[1] || y0 < TEXT_LIMITS.y[0] || y1 > TEXT_LIMITS.y[1]) throw new Error(`${name}: text leaves the 720x1280 safe zone`);
}

export function assertStageClear(stageBox: [number, number, number, number], name = 'stage'): void {
  const [, y0, , y1] = stageBox;
  if (y0 < STAGE_BAND.y[0] || y1 > STAGE_BAND.y[1]) throw new Error(`${name}: subject leaves the stage band y ${STAGE_BAND.y[0]}-${STAGE_BAND.y[1]}`);
}
