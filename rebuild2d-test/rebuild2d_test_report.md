# 40-second review export
- Source window: 78.000–118.000 s. H.264, 1920×1080, 24 fps, 960 frames, 40.000 s. Audio from the original M4A.
- Whole-episode diagnostic: 115 lines audited, 49 clear prior assignments changed, 0 remaining disagreements under the pitch rule, 16 unclear. This is an acoustic estimate, not independent human ground truth.
- In the test: A-only 525 frames, B-only 233, pause 202. Mouth state selects exclusively from that activity track. The 24-sample contact sheet shows the actual rendered frame and attributed pitch.
- New SVG puppet bases with separately composited expressions and gestures. Six crops of one virtual scene; no independent over-the-shoulder geometry in this proof. The 4K coordinate space defines the virtual camera, but artwork is composited on a smaller raster before output scaling.
- Six frames visually checked; Tesseract produces false text detections on the thin grid and face shapes, so OCR has not passed as a reliable no-text check.
- Only the Newton/Einstein and trampoline graphics are implemented in this new renderer. The rest of the graphics, per-clip render caching, and final lip/camera QA are deferred until review.
