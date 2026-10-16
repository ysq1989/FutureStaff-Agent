# SHOP visual recommendations — 2026-10-15

Authorized: improve recommendations with pictures and thoughtful interactions, update
the same local client. Main baseline and unrelated work preserved. Owner: SHOP Agent
adapter; Platform-derived identity and existing SHOP grants remain authoritative.
No schema, credential, server release or business write. High Risk: installed runtime.

Design: after requirements, present 3–6 ranked real candidates, not a raw catalog dump.
RecommendationList → heading/source → responsive ProductCard grid → image viewer,
name/ID, price/stock, reason, select button → selected status and next-step explanation.
Image viewer reuses InteractionWindow; buttons, tokens and focus follow native UI.
Cards use a consistent contained image well (no cropped garment), equal comparison
facts, quiet borders and blue selection. Desktop 3 columns, medium 2, narrow 1.
Keyboard: native buttons, visible focus, Escape/focus return in image dialog.
States: loading authorization/image, missing/broken image, empty/error, selection
pending/success/failed; no automatic import, no fabricated reason or profit figures.

Five risks and corrections:
- Invented assets/facts → Host resolves IDs against an owner/session-bound real read.
- Catalog overload → dedicated bounded recommendation tool with explicit reasons.
- Selection confused with import → separate select action; store items need no import.
- Narrow overflow/inaccessible pictures → responsive grid, contained images, dialog.
- Stale permissions/async identity changes → reauthorize reads/actions and clear UI.

21st metadata search: Product Card 28199 and Product Listing Card 28227 informed
image/facts hierarchy. Reuse existing semantic primitives, not new dependencies.
Acceptance: provenance/authorization/selection regressions, browser light/dark narrow
and keyboard checks, typecheck/build/full plugin suite, exact installed file hashes,
native real recommendation with loaded product pictures. Rollback required.

Implementation and verified checks:
- `shop_query` now returns an owner/session-bound view; `shop_recommend_products`
  accepts only 1–6 IDs from that real read plus reasons. Host rechecks the same
  authorized SHOP read, resolves image/name/price/stock, rejects invented or stale
  references, and never calls an import/publish operation for recommendation/select.
- Native cards display at conversation turn tail. Real acceptance caught the normal
  tool group's automatic collapse; the final projection keeps recommendations visible
  without opening tool details. Final generation is a short pointer to the cards,
  without duplicate HTML/image links. Only the latest recommendation per turn shows.
- Images use contained layout, public HTTPS URLs with credential/private-literal
  rejection, no referrer or proxy fetch. Missing/failed images have explicit placeholders.
  Existing InteractionWindow supplies zoom, focus trap, Escape and focus restoration.
- Selected card is highlighted; pending/failed/retry states are separate. Identity
  changes clear all visible card/window data. UI cannot choose an arbitrary recipient.
  Host sends a selection-only notice to the original live SHOP Agent; genuine human
  import intent and existing final native confirmation remain required for writes.
- Build/typecheck pass. Final full suite: `node --test --test-concurrency=1`, 275
  passed, 0 failed/skipped. Earlier parallel full runs also passed 275; a later run
  exposed a browser-fixture close/reopen race. The fixture now waits for the close
  button to become enabled and the old window to disappear, preserving busy guards.
  Focused browser checks and 21st review pass (3 files, 0 findings). Screenshots:
  `work/shop-recommendation-cards/desktop-light.png` and `narrow-dark.png`.
- Installed scoped Host modules and client bundle only: 28 packaged/active file
  hashes match. Sourcemap comparison against the installed baseline limits client
  changes to four SHOP source modules; all unrelated client sources are unchanged.
  Blue-logo EXE SHA-256 remains ca02e892232728525e4f71675f224e40d0384b829cce71091438f556533ea8e9.
- Local real acceptance: three real existing-store products (134/131/127), all three
  images loaded, prices and stock displayed, image zoom/Escape worked, native click
  marked 134 selected and explicitly showed no import needed. Selection notice reached
  the original session and completed. No import preview or business write occurred.
- One provider failure occurred before reads; a read-only continuation recovered.
  This change does not claim to repair upstream provider reliability. Cards expire
  with Host views on restart; old cards ask to regenerate under current permissions.
- Latest candidate: `output/shop-recommendations-20261015/r3/installed.json`.
  Retention preserves two most recent inventories; only proved-unused older inventory
  metadata is archived, with code/manifest rollback backups preserved. With client
  stopped, rollback `scripts/install-shop-recommendation-candidate.mjs rollback
  --iteration=r3`, then r2 and finally no iteration for the original baseline.
- This is a local 3.0.5 code patch, not a published installer/server release. No
  commit/push, schema, credentials or user data changed. Active unrelated CURRENT
  tracker remains untouched.

Status: complete. Final r3 real native cards remained visible after completion; click
returned to the original session. Final reply: selection recorded, existing store
product, no import needed; no import options offered. Runtime evidence:
`output/shop-recommendations-20261015/runtime-acceptance.json`. Provider response
latency remains observable (one recommendation took about 77 seconds).
