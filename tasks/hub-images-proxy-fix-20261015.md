# Hub images in the installed Agent — completed 2026-10-15

Goal: restore product images in the installed Agent's Product Hub selection center.
Risk: High Risk (local installed runtime and request guard); no business data,
credentials, schema, server deployment, commit or push changed.

Baseline: `main` at `1ef692067e`; existing source/worktree changes preserved.
Installed Agent: `D:/FutureStaff Agent`, package version 3.0.5.

## Diagnosis and change

- Actual Hub guest contained 40 product images, with zero decoded images.
- `xcimg.szwego.com` resolved to `198.18.0.10` through configured
  `PROXY 127.0.0.1:7897`. The installed request guard allowed proxy DNS aliases
  for authorized navigation origins but blocked this image CDN.
- Reused the already-present `hubAlbumImageAllowed` fix in
  `desktop-shell/dsh-plugin-desktop/src/system-views.ts`: only HTTPS image GETs
  from the PROD/DEV Hub origin to the exact existing CDN qualify. Private DNS
  addresses, unrelated destinations/types, and DIRECT fallback remain denied.
- Applied only that helper and condition to the active installed
  `app.asar.unpacked/lib/electron-runtime-gKzHpKOq.js`; synchronized its size and
  integrity in `app.asar`. All packed bytes and other archive metadata match
  the baseline. No installer/update-feed publication or version bump.
- Applied the same guard to the existing Hub guest session, then retried images
  and reloaded the full Hub page. The Agent process and login were preserved.
  Newly created guest sessions in this already-running process still use its
  original class; the installed patch is loaded normally on the next startup.

## Acceptance

- Real CDN image in an isolated Electron fixture: old guard produced
  `net::ERR_BLOCKED_BY_CLIENT`; fixed guard returned HTTP 200 and decoded 320x427.
- `node ../scripts/run-node-tool.mjs vitest run tests/system-views.spec.ts`:
  11 passed, including proxy/DNS restrictions and negative boundary cases.
- `node ../scripts/run-node-tool.mjs tsc -p tsconfig.json --noEmit`: passed.
- Changed installed runtime JavaScript syntax check: passed.
- Actual installed Hub: 40/40 decoded images after retry, and 40/40 again
  after a full page reload. Representative images decode at 500x667.
- A hidden/detached guest screenshot attempt returned `UnknownVizError`;
  acceptance uses actual DOM image decode counts and the full reload check.

## Evidence and rollback

Evidence: `D:/项目/.codex-build/hub-images-20261015/`, including
`package-manifest.json`, `result-old.json`, `result-new.json`,
`live-result.json`, and `live-reload-result.json`.

Rollback files: `app.rollback.asar` and `runtime.rollback.js` in that directory.
Restore them to the installed archive and active unpacked runtime respectively,
then restart Agent to restore the original guard.

Installed archive SHA256:
`56be259c9a75904512248ed577c0976beae3366555945aeb62f53b8ecdaf30cd`.
Installed runtime SHA256:
`61bf18f724764f58aac3d9f392705a918d774968cab1ed5a3eb60d7285178fbf`.
