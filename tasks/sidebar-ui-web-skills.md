# Sidebar and website Agent design skills — 2026-10-15

Baseline: main. Preserve pre-existing UI, branding and unrelated changes.
Owners: fs-platform-access client and Website management Skill.
Shared frontend risk: preserve session selection/archive, identity, keyboard access,
light/dark and collapsed mode. No schema/API/auth change or new dependency.
Design: compact borderless rows, inset selection rail, search icon, archive icon
on hover/focus (always on touch). Existing brand and tokens retained.
Acceptance: browser checks for search, archive failure/success, title overflow,
keyboard access and light/dark; related suites, typecheck/build and diff review.
Skills: review upstream licenses/dependencies and connect through Website's owned
skill. Runtime installation requires identifying the actual website Agent.

## Result

User clarified a dedicated Web Agent website designer: render from requirements or
references; use Website when entitled and authorized; otherwise standalone design.
Platform owns the new `website-designer` folder template and optional
`website-design` Skill, registered through the existing seeder; no DB writes run.
Source-only role; actual creation, image-model enablement and Website connection
remain runtime gates. Current desktop has no complete Website tool integration.

Client typecheck/build passed; all 275 package tests passed without skips; 7 focused tests passed (including browser session,
archive/error, narrow and collapsed navigation). Added light/dark geometry,
long-title and keyboard-focus checks passed. 21st review: 0 findings.
Platform offline assets: 3 unittest checks and Python compile passed. This runtime
does not have pytest/Ruff; no full Platform runtime suite is claimed.

Local installed and active-profile client bundles updated with backups, CAS and
protected-file verification. Source maps proved only `client/agents.tsx` differed.
Receipt: `output/sidebar-design-20261015/install/installed.json`.
Rollback: `node output/sidebar-design-20261015/install-client.mjs rollback`.
No native binary, host, credentials, sessions or server code deployed.
Running native window has no reachable debugging port (stale DevToolsActivePort);
its current view was not reloaded or interrupted. Reopen client to load the update.
Isolated loopback browser did not mount the workbench, so it is not live acceptance.

## Subsequent authorized PROD activation (supersedes earlier runtime gates)

2026-10-15: user authorized formal activation and both entitlement scenarios, then directed Agent to PROD only. Platform API 1.12.29 deployed through guarded CAS; no DEV migration. The optional website-design Skill and dedicated Web Agent are active. Native Host provides website_tools, website_call, website_image_generate/download/save; Website grants remain server-owned and publishing tools excluded.

Both actual subjects generated free images; an actual website screenshot reference generated another concept. Entitled subject created/read a private draft and roundtripped image bytes to Website private OSS, reference analysis and proposed requirement. Unentitled subject's Website call returned 403 while independent image design worked. Public HTTPS postflight passed. Original unknown image intents were retained without resubmission; generated text still needs review.

Native restart recovered a transient release-time load error. Selector offered the role; actual website_tools and website_call(requirement_brief_get) completed. Evidence: output/website-designer-20261015/native-acceptance.json. Sidebar live metrics confirmed 41 sessions and no overflow. Host is bundled into existing plugin.js to preserve the 256-file manifest bound (255 current); CAS protected concurrent SHOP modules and user data. Receipt: output/website-designer-20261015/install/bundled/installed.json. Client typecheck and 284 Node checks passed; Platform 42 pytest checks/Ruff passed. Release details: D:/项目/FutureStaff-platform/tasks/website-designer-role.md.
