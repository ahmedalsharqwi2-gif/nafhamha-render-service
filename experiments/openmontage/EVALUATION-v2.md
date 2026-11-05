# Visual experiment v2

Combines external pinned OpenMontage VideoCompose atelier tool with original Nafhamha Remotion/Three.js authoring. Changes remain on experiment/openmontage-explainer only; no merge, service deployment, Buffer post or daily schedule change.

Eight contextual scene palettes replace the constant blue background. Added deterministic ambient particles, subtle moving gradients, 18-frame palette transitions, spring entrances, photon motion, spinning/bobbing 3D diatomic molecules and gently moving camera. Added scattering-to-eye graphic and corrected atmosphere ray geometry. Technical colours remain schematic rather than measurements.

66 caption phrases, maximum six words each, preserve all 334 original words. Word starts obtained with local faster-whisper small (CPU int8). 308/334 exact normalized script-token anchors; remaining timing interpolated between recognized anchors. Scene 6 exact match is 27/44, so this remains phrase alignment, not guaranteed word-perfect forced alignment. Original Arabic spelling retained rather than displaying ASR mistakes. Validation checks full text coverage, contiguous caption intervals, scene boundaries and >90<=120 second duration.

Cached Gemini Charon WAVs sped to 1.05 with FFmpeg atempo preserving pitch. Duration 117.6 seconds. No new TTS requests; narration only, no music or sound effects.

Reproduce after generating base voice assets: python upgrade.py; install requirements-experiment.txt; python align-captions.py; python validate-v2.py; run compose-experiment.py from the external OpenMontage checkout. JS package.json pins required original composition dependencies. Keep upstream AGPL-3.0 separate and pinned to d21f5d4eaa08422b09c7091757a05affcbabb35b. Existing README describes base setup.
