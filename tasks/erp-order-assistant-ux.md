# ERP order-assistant draft handoff

2026-10-15. Owning module: Agent client's ERP adapter; ERP remains authoritative
for business records, permissions, pricing, stock, validation and saving.
Baseline main: 1ef692067e. Existing erp.ts/erp-host.ts business-scope changes and
all other working-tree work are preserved. Prior sidebar/icons candidate remains
prepared separately and has not been installed or restarted.

## Goal and contract

Avoid asking users to repeat recognized order information. The existing
erp_order_form tool gains optional draft suggestions while keeping kind-only
calls compatible. Model suggestions contain only customer/supplier UUID,
order_date, notes and up to 50 item UUID/quantity/price lines. The Host validates
shape, kind, identifiers, dates and numeric values, then rereads each record with
the current ERP grant. Unknown price stays absent; zero is an explicit value.
Foreign tenant fields and inaccessible records are rejected. No new identity,
public endpoint, database schema or ERP permission exists.

The same order window shows editable draft fields, units, stock and line totals;
missing values have per-line messages. Preview remains read-only. Returning to
edit retains the draft. Confirm retains the existing snapshot, idempotency and
authorized saved-order readback checks. Form preparation now marks the parent
window busy, preserving its existing close guard.

## GitHub references inspected

- https://github.com/venetanji/erpnext-skills/blob/main/skills/erpnext/references/selling-crm.md
  describes linked documents and copying upstream line items; pricing depends on
  authoritative lists/rules rather than model guesses.
- https://github.com/whynotkimhari/odoo-mcp-server
  describes search/read before write, concrete change previews and user confirmation.
  Its README describes confirmation via tool instructions; that is not sufficient
  proof of enforced authorization. Our Host/ERP checks remain authoritative.
- https://github.com/zavora-ai/mcp-erp
  separates draft creation, submission and approval as document lifecycle operations.

These repositories are references, not installed dependencies or credentials.
The commerce assistant's local fashion preview/gallery implementation was also
reviewed for visible results and clear follow-up controls; no image workflow changed.

## Validation and release status

RED: new draft-handoff and invalid-input tests failed against the old implementation.
GREEN: client build/typecheck and ERP service tests pass. Actual headless browser
checks cover prefilled IDs/200 quantity, blank unknown price, per-line errors,
zero writes before confirm, line amount, stock warning, edit retention and narrow
dark layout. All data are fixtures, with no real ERP order submitted.
Full package regression: 251 passed, zero failures/skips. 21st review: two UI
files, zero findings. Changed-scope diff hygiene passes. The shared-window browser
harness now reads the same DevTools port file as other browser fixtures and closes
its own connections, preserving every existing focus/close/security assertion.
Installed Host JS diff was reviewed: only the new draft validator/schema/form
handoff differs; previous business-scope/session checks match the installed baseline.
Combined immutable candidate and baseline hashes:
D:/项目/.codex-build/agent-erp-order-ux-20261015/ (29 scoped artifacts including
previously requested sidebar/archive/icons; no business data or credentials).

Status: local installed update and restart explicitly authorized and completed
on 2026-10-15. All 29 artifact hashes match; 230 unrelated code files unchanged.
Authenticated installed ERP form returned 8 customers and 16 products (HTTP 200),
showed the three steps and left unknown price blank; no ERP business write or model
request was made. Real sidebar/menu checks and extracted native window icon passed.
Final startup uses no debugging flags. Backups and original manifest are retained.
One oldest unused inventory was archived after checking all local profile code;
the recent two histories and dedicated original release inventory remain intact.
No server deployment, commit or push. No migration needed.
