# Nafhamha follow-up: actual validation and remaining blocker

This PR is still review-only. `publish_enabled=false` was not changed. Main, the backup branch/tag, Repository Secrets and the live service were not modified.

## Original logo

The owner-supplied PNG was installed byte-for-byte at `brand/logo/logo.png`; no redraw, recolor, background removal or vectorization. All rendered logo locations use `BrandLogo` and the canonical path through a public symlink. The source hash test also rejects altered bytes.

SHA-256: `bbcbca077ed53e6472939a51be6f3d20a5818ee39860e894fef740500e5d1bcd` (1421340 bytes).

## Executed locally

- `make test`: PASS, 29 Node tests and TypeScript. Tests use mocked Gemini HTTP responses; none sends a request to the real Gemini API. Log: `docs/FOLLOWUP_LOCAL_TESTS.txt`.
- Tests cover 429/503 backoff+jitter, Retry-After seconds/date, model fallback, discovery throttling, bounded attempts/deadline, serialization, durable successful-chunk reuse across a fresh client, settings-based invalidation, immutable logo verification and dated/corroborated sources.
- Layout smoke: PASS, 26 sampled frames and 196 text boxes; no text crossed y=150 or y=1670. This is DOM geometry evidence, not a completed film or listening review.
- Actual local `RENDER_PARTIAL=false make review`: STOPPED at `MISSING_REPOSITORY_SECRET_GEMINI_API_KEY`. Partial rendering was explicitly disabled for that local probe to avoid duplicating the distributed Actions render.

## Required Repository Secret

**`GEMINI_API_KEY`** is the exact recommended secret name to add. It supplies text and Charon TTS through environment bindings. Separate `GEMINI_TEXT_API_KEY` and `GEMINI_TTS_API_KEY` bindings are optional alternatives. No secret value was requested, opened, printed, copied or changed.

## Actual GitHub review

The current branch will run the full review attempt through GitHub Actions after this commit. Its terminal result and actual video/contact-sheet evidence will be appended before this work is reported complete. On missing Gemini binding, the workflow must stop narrated production and render a separate, visibly labeled **silent incomplete** 96-second visual preview; this does not pass narrated-film acceptance. It uses original vector templates, not a fabricated editorial story.

## Acceptance

A full Charon-narrated film, measured word alignment and listening approval remain unavailable while the binding is missing. A silent preview cannot prove audio, pronunciation or narration/caption synchrony. Exact rendered-logo pixels, dimensions, fps, duration and known-watermark OCR are checked on exported artifacts, with manual review still required. No deployment, publication, scheduling or main merge was performed.

Remotion remains subject to its existing free/company license eligibility; commercial organizations outside the free group require a Company License.
