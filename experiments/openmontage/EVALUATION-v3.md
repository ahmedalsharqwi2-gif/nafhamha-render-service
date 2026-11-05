# Follow the light — completed visual revision

Branch-only revision combining OpenMontage VideoCompose atelier and original Nafhamha Remotion/Three.js. No production service changes, merge, publication or automation change.

Changes: full-bleed contextual skies; original 3D molecular close-up with physical materials, three-point lighting and frame-driven camera; spectrum/wavelength illustration; sky-to-eye geometry; perception lens; corrected globe ray paths; cloud/dust sunset variation; globe pullback and final Arabic wordmark. One shared light motif links scenes. Crossfades preserve outgoing geometry while suppressing outgoing labels to avoid doubled text. Cairo Arabic variable font replaces DejaVu; font source and SIL Open Font License included in reproducible fetch script.

Cached Charon performance retained, pitch-preserving 1.05 tempo inherited from v2. Speech normalized with high/low pass filters and loudness control. Original seeded procedural stereo sound design with speech-dependent ducking. No additional TTS or paid asset service requests.

86 balanced caption phrases preserve all 334 original words, with word highlighting. Existing ASR word anchors retained; scene6 merged recognition tokens reviewed against the timestamped transcript and split semantically. Remaining unmatched words use interpolation, so no claim of phoneme-perfect alignment. Very short isolated cues merged. Browser measurement of all captions verifies bottom <=1074.1 before actual border; explanatory footer at1098. Caption area left52/right124/top948 reserves platform controls.

Rendering: 720x1280,30fps,H264,CRF17. Audio mixer lead-in measured against source speech at about2048 samples/48kHz. Finalization removes that lead-in and trims silent padding while copying the encoded video unchanged. Final QA separately verifies all eight source waveforms and transcribes the corrected output; see final-qa-v3.json.

Reproduction: keep OpenMontage external at d21f5d4eaa08422b09c7091757a05affcbabb35b (AGPL-3.0); use pinned package.json dependencies and existing requirements. Generate base Charon audio through authorized secure adapter, run upgrade.py, fetch-font.py, prepare-v3.py, verify-v3.py. Run measure-captions.py --prepare-only and copy measure-captions.mjs into remotion-composer/ as measure-v3.mjs, adjusting local paths/browser executable. Run compose-experiment.py, finalize-v3.py, review-output-v3.py, export-captions.py. Browser paths in the local QA helper are environment-specific. Render through OpenMontage atelier; no upstream creative code is copied into the private service.

Exact reproduction requires the original cached Charon WAV assets. Regenerating speech is not byte-identical and requires new alignment and revision of scene6 timing corrections. This is an experiment for this episode, not a merged general-purpose production template.
