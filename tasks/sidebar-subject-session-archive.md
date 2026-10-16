# Account-menu subject, session archive and Windows icons

Scope: desktop account sidebar, recent-session controls and existing Windows
icon assets. Baseline: main 1ef692067e. Preserve all unrelated working-tree changes.

Requested behavior: put the authenticated active subject above Settings in the
user popup, remove its top-level row, and expose Archive on each recent session.
Archive uses the existing native workspace operation and retains session data
and workspace files. No server, identity contract, schema or permissions change.
Window/taskbar and tray assets reuse the approved blue-only FutureStaff mark.

Validation: client build/typecheck, 8 focused tests including real-browser
expanded/collapsed account menu, archive success, failure/retry, signed-out
visibility and preserved records/files. Nine native icon/package checks passed.
21st review: two UI files, zero findings. Scoped diff hygiene passed.
Installed client source-map comparison: only sidebar.tsx and agents.tsx differ
from the current source. Browser-test teardown now closes its own HTTP connections.

Status: installed on 2026-10-15 with explicit user authorization, together with ERP
UX improvements. Real installed UI: 27 archive controls, subject above Settings
inside the account popup, no top-level subject row. Native window icon extracted
after normal restart matches the approved blue mark. No commit/push/server release.
The initial candidate is superseded by the combined candidate/receipt:
D:/项目/.codex-build/agent-erp-order-ux-20261015/.
