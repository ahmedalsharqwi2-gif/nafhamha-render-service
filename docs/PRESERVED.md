# Preserved materials

All listed bytes preserved at their original paths, except the Nafhamha identity receives a new rebuild_tokens member and its exact original is saved beside it as nafhamha-identity.original.json. The full original source remains on the verified backup branch and tag. Additional extracted topic identifiers are in state/legacy-topic-index.json; new reservations never overwrite that index.

| Original path | SHA256 before rebuild |
|---|---|
| `state/nafhamha_cycles.json` | `9be1e15d88246a439d070549975d408b23556610787f64cad30de451e894df33` |
| `brand/recurring-production.json` | `f0c2ecb11192e1598a2b70d41bc25c84d7c31821e5bee2e0179b6eb7f61ad584` |
| `brand/nafhamha-identity.json` | `9abb69c1f81c3682dd489e89e7469165a318263ea976e3483db311072608a2bb` |
| `experiments/openmontage/authoring/public/Cairo-OFL.txt` | `ce39edb04b690f144cd40dc59a1be26dcb089e539c8118289d1081cde4449d6f` |
| `episodes/2026-11-13-static/public/Cairo-OFL.txt` | `a4554e1799d42e1405924b61eb0e0722ae1623b1f1f07f995348f96c496362a9` |
| `episodes/2026-11-10-swift/public/Cairo-OFL.txt` | `a4554e1799d42e1405924b61eb0e0722ae1623b1f1f07f995348f96c496362a9` |

Original logo present in checkout: no. The owner subsequently supplied inline logo references. Their original file bytes have not been exposed by the upload tool; no replacement has been drawn. See config/logo-intake.json. Original font files and their available notices remain. Charon and intended 17:00 Africa/Cairo destination names remain in config. No .mp4 files were tracked on the cloned main snapshots; no approved media was deleted from remote media branches. Legacy scheduling files are in the backup, but the new branch has only one active workflow.

## Follow-up original logo installation

Source: Owner supplied logos.zip / nafhamha-render-service.png

Canonical file: `brand/logo/logo.png`

SHA-256: `bbcbca077ed53e6472939a51be6f3d20a5818ee39860e894fef740500e5d1bcd`

Byte-for-byte copy verified; no redraw, recolor, background removal, raster edit or vectorization. The public/brand/logo directory is a symlink to the canonical directory. Header, intro/outro and thumbnail use the same Logo component and source.
