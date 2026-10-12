# Current-subject authorized directory and password-free system entry

User confirmed Shop/AI/GEO grants belong to the current subject. Show only
server-discovered accessible business systems, plus admitted local pages; no
fixed ungranted placeholders and no inference of permission from a product name.

Host/native only: prepare the isolated guest session before loading. Reuse an
existing same-member/subject cookie; otherwise use one-use PKCE handoff from
the current desktop session. No passwords or Agent credentials in the page.
Module token responses establish HttpOnly cookies normally. GEO owns its PKCE
cookie; Shop owns its configured Product Hub proxy and normal admin login;
AI owns its portal cookie and encrypted, desktop-bound AI-only context token.

Platform changes and deployment policy are ADR-0048 and
D:/项目/FutureStaff-platform/tasks/agent-authorized-discovery-and-sso.md.
No schema/migration, real grants, credential values or business data changed.
User explicitly authorized direct PROD deployment on 2026-10-11 after initially
selecting DEV. Services use active-image-derived, hashed source overlays; no
unrelated pending changes are included.

Validation: 159 platform plugin tests; 20 native view/window tests; native build,
typechecks and 228-node closure. Prepared callbacks execute once before page
load; existing same-member sessions avoid re-login; foreign realm/callbacks
reject; AI/GEO protocols tested separately. Late async results cannot overwrite
current loading state; invisible dialogs do not suppress guest loading.
Installed on this PC: 21 native lib files and 12 Platform plugin files changed;
20,096 other packaged files preserved. Original Agent session is expired;
user login was completed and all six cloud systems passed real current-subject
SSO acceptance. Their session endpoints returned 200 with matching member/tenant;
no password form, no Node/Host bridge in guests, and guests reused across tabs.
GEO manual redirects use isolated Electron ClientRequest without following the
redirect; Chromium retains the server-owned PKCE cookie in that guest partition.
Final tests: 160 plugin tests; 7 native focused tests, typecheck/build/closure pass.
Receipt: D:/项目/.codex-build/agent-sso-prod-20261011/agent-final/receipt.json.
