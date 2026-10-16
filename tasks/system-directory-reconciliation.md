# Reconcile business system directory

2026-10-10 user screenshot shows 11 entries: obsolete Agent label, internal
platform/source module and duplicate Visa. Shared frontend; high-risk validation.
Baseline e62d0f7588; preserve all existing GEO/Host/API changes.

Root cause: fixed catalog used guessed IDs and appended arbitrary discovered
applications. Platform source proves agent=数字员工 (current workbench),
wecom_album=货源管理系统 (source connector), vietnam_immigration=Visa,
product_hub=Hub and futurestaff_ai=AI. Platform admin was a static placeholder.

Change: exclude self/admin/source and unclassified discovered applications;
map server module IDs to canonical product names, keep authoritative server URLs
and tenant/capability checks, and retain registered local business pages. Hub is
the existing product module under its approved name, with no legacy sidebar slot.
AI additionally accepts only its source-declared ai.erplucky.com HTTPS host.
No backend permission/data/schema change or automatic module registration.

Acceptance: six canonical business entries plus Douyin; exactly one Visa/Hub/AI;
no 数字员工/管理平台/货源管理系统; alias cloud links recheck current authorization;
same-system tab remains unique; full plugin build/typecheck/tests and browser QA.
Source implementation was initially delivered without deployment. Follow-up
deployment was explicitly authorized and completed locally on 2026-10-10; see
docs/specs/embedded-system-pages.md for exact native/Host/Client scope and receipt.

Subsequent user request requires direct embedded pages. Cloud entry cards are
replaced by native system views; desktop/Host integration and acceptance are in
docs/specs/embedded-system-pages.md. Canonical cloud entries no longer use the
older GEO plugin's external-browser launcher. Douyin remains a local native tab.

Follow-up: user requested Chinese names. Sidebar, cloud entry headings and open
page tabs now use 进销存系统、货源集市、商城系统、智能模型服务、品牌运营系统、
越南签证、抖音获客. Tab titles normalize existing local plugin labels too; module
IDs and authorized URLs remain unchanged. Chinese-name build/typecheck and 152
tests pass; real-browser fixture verifies the registered GEO page's Chinese tab.

Validation: platform typecheck/build and full suite passed (152 tests, no skips).
Updated real-browser fixture includes the actual platform module IDs, verifies
seven entries, exactly one Visa, alias cloud-page navigation to the current
authorized URL, keyboard navigation, narrow layout and logout cleanup. Passed.
Task-only diff checked; unrelated GEO/Host/API changes preserved.
