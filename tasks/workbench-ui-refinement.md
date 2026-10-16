# Workbench UI refinement

Status: complete; installed and real desktop acceptance passed. Main baseline e62d0f7588; pending SSO, GEO, brand and session renewal work preserved.
Goal: make the desktop shell a quiet, compact frame around its embedded business systems.
Scope: platform access Client sidebar, tabs, embedded toolbar and palette. No tenant, auth, schema or server changes.
Tree: Sidebar → Brand / ActiveSubject / ModeTabs / SystemDirectory / AccountMenu;
SystemMain → SystemTabStrip + EmbeddedRefresh / ActiveGuestBody / LoadingError.
Direction: neutral gray sidebar, white content, sparse blue selection, consistent line icons and 6–8px control radii.
States: selected/hover/focus, disabled/loading/error, long names, collapsed sidebar, light/dark and narrow windows.
Avoid five risks: saturated canvas, letter-block icons, stacked headers, default buttons, competing navigation.
Use existing semantic controls; 21st search found browser-tab sidebar patterns, reused project primitives rather than adding dependencies.
Local update/restart already authorized by the user. No server deployment, commit or push.

Validation: platform 167 tests passed, including actual browser light/dark, 390px layout, keyboard tabs,
session draft preservation, correct refresh routing and toolbar/refresh geometry. Typecheck/build and diff hygiene passed.
21st review: 4 changed UI files, 0 findings. No new dependencies.
Live installed desktop: neutral sidebar, 46px toolbar, 7 semantic icons, no horizontal overflow and no duplicate
login-guidance toolbar. Native guest begins at y=78 instead of the screenshot's y=127.
Six real systems passed same-member/tenant HTTP 200 session checks, no-password entry and guest reuse/isolation.
Only active-profile Client JS/map installed; 76 other plugin files unchanged. Native package, Host session fix,
profiles/data and server systems unchanged. Backup/hash receipts in
`D:/项目/.codex-build/agent-ui-refinement-20261011/` and final geometry adjustment `...-r2/`.
The installed environment uses content-box defaults; explicit toolbar border-box fixed the observed 1px discrepancy.
Rollback applies r2 backup first, then the initial UI backup, after closing the app.

User follow-ups: collapsed sidebar now uses 36px icon-only navigation instead of wrapped Chinese tab text;
mode changes and account menu opening preserve the collapsed state. Native-title tooltips and ARIA names retained.
Tests cover the actual 54px rail width, mode navigation, account popup and overflow in light/dark.
Version metadata moved inside the account popup; closed navigation no longer reserves a footer version row.
Browser tests check version absence while closed and exact installed-shell metadata when the account popup opens.
Latest immutable Client-only candidate/backup: `D:/项目/.codex-build/agent-ui-refinement-20261011-final/`.

Default window follow-up: Windows workbench maximizes once, before its first startup reveal.
Later tray/activation reveals preserve the user's chosen window state and normal restore bounds;
auxiliary windows and other platforms keep their existing behavior. Owning native change: electron-shell-generation.ts.
Regression fixture asserts Windows maximize-before-show and unchanged macOS reveal behavior; 2 startup tests
and 23 window-state/options/native-session tests passed. Native typecheck/build and 228-node closure checked.
Native-only immutable candidate/backup: `D:/项目/.codex-build/agent-ui-maximize-20261011/`.
Real desktop acceptance: viewport width 1920 matches the display work area, no horizontal overflow;
all 7 collapsed directory rows are 36px, both mode tabs are icon-only, and collapsed mode survives navigation/menu clicks.
Version absent by default, present inside account popup with installed-shell metadata.
Screenshots and combined UI receipt: `ui-acceptance.json`, `collapsed-ui.png` in the native candidate directory.

Account-menu blank-page regression: the prior overlay gate hid every guest for any open account menu,
even when the menu stayed inside the sidebar. A real-browser regression reproduced `hide` instead of `show`.
The gate now checks actual overlap. Non-overlapping menus leave the guest unchanged; a collapsed account popup
temporarily reserves its overlapping left edge while keeping the guest visible to the right. Full modal dialogs
continue to hide native guests, avoiding native content painting over renderer-owned dialogs.
Tests cover expanded menu → show, collapsed popup → show with reserved bounds, modal → hide, modal close → show.
167 plugin tests, typecheck/build and scoped zero-finding 21st review passed, followed by focused browser verification
after the no-available-space fallback. Latest Client-only backup/receipt: .../agent-account-overlay-20261011/.

Windows occlusion reproduced document.visibilityState=hidden and suspended renderer RAF during background verification.
A coalesced 100ms timeout now backs up RAF for embedded bounds synchronization; a real-browser regression suspends RAF
and still requires a native show request. Native sidebar overflow also clipped collapsed account popovers;
only an open account popup now allows overflow from that sidebar surface.
Live foreground acceptance passed expanded/collapsed menus, native guest widths, popup version visibility,
full guest width restoration after menu close, and all six systems' identity/reuse/isolation checks.
Final Client-only candidate/receipt: D:/项目/.codex-build/agent-ui-complete-20261011/.
