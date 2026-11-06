export const CAPTION_SAFE_ZONE = { textX: [190, 890], textY: [290, 1248], lowerX: [190, 780], lowerBandY: 840, maxWords: 4, minSeconds: 0.9, maxLines: 2 } as const;

export type CaptionEvent = { text: string; start: number; end: number };
export function assertCaptionEvent(event: CaptionEvent, duration?: number): CaptionEvent {
  const words = event.text.trim().split(/\s+/).filter(Boolean);
  if (event.start < 0 || event.end <= event.start) throw new Error('caption timing must be monotonic and positive');
  if (duration !== undefined && event.end > duration + 1e-6) throw new Error('caption exceeds audio duration');
  if (words.length > CAPTION_SAFE_ZONE.maxWords) throw new Error('caption exceeds four-word readability budget');
  if (event.end - event.start < CAPTION_SAFE_ZONE.minSeconds) throw new Error('caption event is shorter than 0.9 seconds; review alignment');
  return event;
}
export function assertTextBox(name: string, bbox: [number, number, number, number], kind: 'text'|'chrome' = 'text'): void {
  const [x0,y0,x1,y1] = bbox;
  if (x1 <= x0 || y1 <= y0 || x0 < 0 || y0 < 0 || x1 > 1080 || y1 > 1920) throw new Error(`${name}: invalid bbox`);
  if (kind === 'chrome') { if (y0 < 130) throw new Error(`${name}: chrome above safe band`); return; }
  if (x0 < 190 || x1 > 890 || y0 < 290 || y1 > 1248) throw new Error(`${name}: text leaves safe zone`);
  if (y1 >= 840 && (x0 < 190 || x1 > 780)) throw new Error(`${name}: lower-band text enters platform action rail`);
}
