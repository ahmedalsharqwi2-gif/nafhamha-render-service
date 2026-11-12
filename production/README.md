# Unattended Nafhamha connection

The old `produce-aligned.mjs` and sky experiment are interactive helpers: they use a fixed Sites dashboard origin and a per-session bearer. Do not use an expiring dashboard session as the recurring automation's service identity. An empty Sites account lookup or a dashboard HTTP403 is not proof that the separate Railway service is down.

The unattended path uses the existing direct render/media service and existing Buffer account. It does not create another service, copy another channel's secrets or alter any queue.

## Secure bindings

Configure these in the recurring task's environment using the existing values, never in chat, commits or task prompts:

- `NAFHAMHA_SERVICE_URL`: optional override of the owner-confirmed public HTTPS origin in `production/connection.json`, with no path, token or query. The confirmed backend is `https://nafhamha-render-production.up.railway.app`, not the interactive `.chatgpt.site` dashboard. Its public health endpoint returned200; the unauthenticated status endpoint correctly returned401. This does not establish authenticated publishing readiness.
- `NAFHAMHA_API_TOKEN`: the backend's existing `API_TOKEN`.
- `BUFFER_API_KEY`: the existing Buffer key authorized to access the Nafhamha channel.
- `GEMINI_API_KEY`: optional for direct local Charon generation. If the authenticated backend reports `geminiConfigured: true`, use its existing protected `/api/voice` endpoint instead; do not require copying the same voice secret into Actions.
- Optional `NAFHAMHA_BUFFER_CHANNEL_ID`: constrain an already verified Buffer binding. Otherwise discover uniquely by the external YouTube `serviceId` `UCVYe5C8jhHFlKz7UPeVzFCg`, never by a display name.

No new secrets should be generated merely to guess the existing service's credentials. This repository's current secrets can be checked in-place without exposing them: run the existing **CI** workflow manually with `due_at=2026-11-10T10:00:00Z` while that exact target is future. The `production-connection` job reads this repository's bindings only. It accepts existing `PUBLIC_URL` and `API_TOKEN` secret aliases and writes `nafhamha-connection-report` as an artifact. A passed test job is independent of this live report. A failed live check must not disable the recurring task or cause publication at another time.

## Before generation

Set `NAFHAMHA_DUE_AT` to the exact authorized UTC time and run `npm run production:preflight`. This reads `/health`, authenticated `/api/status`, Buffer account/channel identity and the exact target queue slot. All Buffer operations are GraphQL queries. It does not call speech generation, upload media or create/edit posts. Missing bindings, wrong channel, paused/disconnected channel, occupied slot, invalid URL, redirects and expired dates fail closed. It writes a sanitized report without provider error bodies or credentials.

If a slot already contains a post, reconcile the retained episode ID and fingerprint before further work. Do not remove or replace it automatically. Check the permanent topic/file ledger as well; an empty slot alone does not prove that the topic was never published.

## Voice without a Sites session

After the live preflight and topic/file checks pass, `npm run production:voice` accepts one JSON object on stdin: `text`, `dueAt`, `preflightReport`, `outputDir`. It uses the existing `voice.mjs` Charon implementation with the secure local environment binding, or the already configured authenticated backend `/api/voice` route when live preflight verifies that route. It never uses the interactive dashboard URL. The exact text and slot are hashed into a durable intent before the single provider request. Completed exact audio is reused; different input, damaged audio and uncertain prior requests are never automatically retried. Keep the output directory and `voice-request.json` in durable cycle artifacts and preserve their fingerprints in the cycle ledger.

A preflight is valid for10minutes and one exact channel/slot. It does not prove a final film, correct narration, media-hosting upload or actual scheduled publication. Render the new subject-specific scenes and perform the approved full-film checks before the normal media and Buffer scheduling stages. Preserve a submission intent, receipt and independent same-ID/time/media readback. No expired-slot rollover, paid retries, OAuth bypass or fabricated success.

## Recurring cycle bindings

The episode workflow now requires explicit `cycle_id`, `due_at`, `episode_dir` and `composition_id` for each phase. Use the next authorized publication date from the permanent three-day cadence, not the old November10 example. `cycle-policy.mjs` verifies the repository, Cairo noon (including DST), cadence and a date-bound episode path; the permanent cycle must already bind the exact script hash and composition.

`inspect` reads full own-channel history without generation or publication. `voice` independently repeats fresh live checks and retains its request before one Charon call. `render` restores that exact retained audio and blocks an existing attempt. `publish` requires the actual approved movie SHA, completed QA and visual approval, fresh history and slot checks, then retains upload/post intents and independent readback. Do not dispatch a completed or uncertain phase again.

If the movie and QA artifact exist but the immediate artifact metadata GET returned404, reconcile the existing artifact/run/hash before any new render. Only artifact-metadata GETs receive bounded read retries (2/4/8/16 seconds); voice, media and post requests do not. Codec installation is skipped for inspect/publish and bounded for rendering, using Ubuntu sources with the known Azure HTTP mirror replaced by the official HTTPS archive.
