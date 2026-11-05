# OpenMontage + Nafhamha experiment

Upstream OpenMontage commit: d21f5d4eaa08422b09c7091757a05affcbabb35b (AGPL-3.0). Upstream remains a separate checkout; no upstream code copied into the service.

Actual OpenMontage VideoCompose atelier render with original Remotion/Three.js composition and existing Gemini Charon voice service. 8 scene audio clips measured with ffprobe, no timeline gaps. Output: 720x1280, 30fps H264 MP4, 123.41 seconds, audio present, 8351081 bytes.

Visual spot review: readable connected Arabic, no horizontal borders; full paragraphs are too dense and right-side platform controls may overlap. Atmosphere diagram is schematic and needs improved ray geometry before production. Captions are scene paragraphs, not word-aligned. No independent speech transcription verification performed. No music: automatic QA music_present=true is a false positive. Automated pass is not sufficient for production approval.

Gemini returned 429 after six sections; cached sections retained and remaining sections retried successfully. Needs production retry/backoff. Target 100–120 seconds exceeded by 3.41 seconds.

Recommendation: retain experiment for comparison; improve short phrase captions, safe zone, diagram geometry and timing before merging. No production deployment, Buffer post or daily automation changes made.

Final MP4 Library ID: libfile_f5767c6428388191b7d96465e5633ef8

Reproduction: clone pinned upstream separately, install its Python requirements and remotion-composer dependencies, plus three, @react-three/fiber@8 and @remotion/three@4.0.484. Use React18/Remotion4.0.484 consistently, local Chromium and swangle if GPU unavailable. Copy experiment into projects/sky-colors; set secure voice adapter credentials via stdin only; regenerate audio/props, then run compose-experiment.py from upstream root with PYTHONPATH=. Adjust machine-specific paths in the adapter/configuration. No secrets are committed.
