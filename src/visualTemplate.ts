export const VISUAL_TEMPLATE = {
  canvas: {w: 720, h: 1280, fps: 30},
  safeZone: {textX: [127, 593], textY: [193, 337], lowerX: [127, 520], lowerBandY: 560,
    captionBottom: 337, captionMaxWidth: 393, captionMaxHeight: 117, minScaleVsReference: 0.85},
  translation: {direction: 'rtl', maxWordsPerEvent: 4, maxLines: 2, minEventSeconds: 0.9,
    fontFamily: 'Cairo'},
} as const;
