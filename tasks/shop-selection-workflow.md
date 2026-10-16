# SHOP selection workflow repair — 2026-10-15

User authorized fixing the selection sequence and installing it into this local client.
Owner: Agent client SHOP adapter. High Risk: tool behavior and installed runtime.
Baseline main `1ef692067e`; unrelated changes are preserved. No server release,
credential changes, schema changes, real product import, commit or push.

Contract:
1. Incomplete requirements → concise questions, reuse known information.
2. Clear requirements → authorized real candidates and reasons; distinguish current
   shop products from Product Hub source products, disclose missing capabilities.
3. Human chooses a concrete product → no import preview yet.
4. Human explicitly requests import → validate specific source/product plus genuine
   session input, then prepare preview. Default draft; publishing requires explicit intent.
5. Native user confirmation remains the only execution path.

Implementation: SHOP-specific request guidance, tool description and Host guard for
canonical Product Hub import `shop_api_product_75f343fe4b17`. No model consent flags.
Host uses `agent.session.deriveMessages()` and only user-origin text. Last input must
request import; selection must identify the same product. Quoted/plugin/tool text,
questions, cancelled requests and substituted products do not authorize previews.
Ambiguous ordinal selection requires checking the concrete product identifier/name.
Business API remains the final authority over permissions and product validation.

RED: five regression failures reproduced the existing premature preview behavior and
missing SHOP workflow guidance. GREEN: focused regression, typecheck and build pass.
Initial full plugin test: 263 passed; final checks and local acceptance pending.
Local patch will include only chat, shop-host, shop-operations and shop-selection modules;
compiled comparisons against installed runtime show no unrelated JS changes.
Status: complete; final r3 patch installed, client restarted and native workflow verified.

Final validation and local update:
- TypeScript typecheck and production plugin build pass. Full plugin suite: 268 passed,
  zero failed, zero skipped. Import gate and live Host registration regressions pass.
- Existing-store selection uses correlated, genuine SHOP tool results; the selected
  numeric store ID is explicitly distinguished from a Product Hub source UUID. In
  this selection-only turn import and import-question tools are omitted. Uncorrelated
  or user-authored tool data cannot activate that context.
- Native acceptance: vague selection request opened requirement questions; after
  answering, only real read queries ran. A price mismatch asked for revised criteria;
  the continuation recommended three real existing-store products with price/stock.
  Selecting one only recorded the choice and explicitly stated no import was needed.
- Two FUTURESTAFF_PROVIDER interruptions occurred during acceptance; read-only
  continuations later succeeded. This task does not claim the provider incident fixed.
- Valid source-center selection plus explicit import produces preview-only in the
  regression fixture; no real source-center import or native final execution was run.
- Local applied candidate: `output/shop-selection-20261015/r3/installed.json`.
  Runtime evidence: `output/shop-selection-20261015/runtime-acceptance.json`.
  All 24 packaged/active file hashes match the candidate; unrelated Host code and
  the blue-logo EXE remain unchanged. Existing sessions and sign-in restored.
- Previous inventory metadata was archived only after verifying no installed owned
  workspace matched it. Final retention preserves the two most recent inventories;
  old manifests and changed modules remain in per-iteration rollback files.
- Rollback with client stopped: run the scoped installer script with `rollback
  --iteration=r3`, then r2, then without iteration if restoring the complete original
  baseline is required. Each step guards against concurrent code changes.
- This is an installed local Host patch, not a rebuilt/published installer or server
  release. No commit, push, credentials or business data changed.
