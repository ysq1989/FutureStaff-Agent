# Shop selection-center images — completed 2026-10-15

Goal: restore product images in the installed Agent's Shop selection center.
Risk: High Risk (installed local request guard); no Shop data, server, schema,
credentials, product publication, commit, push or update feed was changed.

Baseline: `main` at `1ef692067e1195c846a4498034a0e585fdce88f0`.
Existing unrelated source changes and the earlier Hub fix were preserved.

## Cause and fix

The actual Shop guest was at
`https://shop-test.fsstory.net/admin/product/selection_center`: 20 broken product
images and two working non-product images. Images use `xcimg.szwego.com`, which
resolves to `198.18.0.10` through `PROXY 127.0.0.1:7897`. The earlier CDN exception
covered Hub only.

Renamed the shared helper to `catalogAlbumImageAllowed` and added the observed
Shop origin to the exact origin allowlist. Only HTTPS image GETs to the exact
existing CDN, referred by the same authorized origin, can use a configured
remote-DNS proxy. Private addresses, unrelated origins/types, and DIRECT fallback
remain denied. No additional Shop origins are assumed.

Updated `src/system-views.ts` and the adjacent `tests/system-views.spec.ts` under
`desktop-shell/dsh-plugin-desktop/`. Applied the same minimal helper/call change
to the installed active runtime and its ASAR integrity metadata, preserving all
packed bytes and other metadata. Current Shop and Hub guest sessions were updated
without restarting or replacing login state. New guest sessions in this already
running process retain its original class until the next normal Agent startup.

## Verification

- Added Shop regression assertions first: failed as expected on the prior helper.
- Focused system-view/session suite: 12 tests passed, including negative request,
  origin, private-address and proxy cases.
- Backend desktop TypeScript check (`tsc -p tsconfig.json --noEmit`), installed
  runtime syntax check, and affected-file `git diff --check`: passed.
- Actual Shop page after full reload: 20/20 product images decoded; 20 HTTP 200
  responses, zero image request errors. For background verification, lazy images
  were explicitly loaded, then restored to lazy loading.
- Actual Hub regression check: 40/40 images remain decoded.
- A guest screenshot capture remained pending; image/network acceptance above is
  independent of screenshot capture. The diagnostic helper and temporary network
  listeners were removed; the temporary main-process inspector was closed.

Evidence and rollback: `D:/项目/.codex-build/shop-images-20261015/`, especially
`acceptance.json`, `package-manifest.json`, `app.rollback.asar`, and
`runtime.rollback.js`. Restore both backup files to the manifest's installed
paths and restart Agent to roll back to the prior Hub-only fix.

Installed archive SHA256:
`e824a91be5c70a0177aba4844467a97a68d24ecdf7ff30df6f71f35b63020a84`.
Installed runtime SHA256:
`927bf3347fb68e5e656d9772eefb42035f6345556fbed25f0f8b5204c88c2643`.
