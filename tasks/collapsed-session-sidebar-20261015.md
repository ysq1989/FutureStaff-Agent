# Collapsed session sidebar — completed 2026-10-15

Goal: replace the squeezed session list/vertical text in the collapsed sidebar
with a clean icon rail. High Risk scope: shared sidebar and installed local UI;
no identity, permission, schema, server, credential, commit or push changes.
Baseline: `main` at `1ef692067e1195c846a4498034a0e585fdce88f0`; all pre-existing
changes, including the Web entry and image fixes, were preserved.

## Change

- Keep the native workspace/session slot mounted inside a wrapper hidden when
  collapsed; full conversation rows, headings and scrollbars no longer squeeze
  into the icon rail. Expanding retains the slot's search/list state.
- Use consistent 36px neutral new-conversation and search icon buttons with
  accessible names, hover states, tooltips and the existing theme tokens.
- Clicking the rail search button expands the sidebar and focuses the existing
  native `input[aria-label="搜索会话"]`.
- Preserve expanded navigation, keyboard system tabs, account popover, native
  new-session behavior and authorization filtering.

21st search for compact collapsed icon sidebars returned Animated Sidebar and
Sidebar metadata. Reused existing project primitives and tokens; no external
component or dependency was installed. The 21st CLI is unavailable locally, so
its review command was not run; browser regressions and visual inspection cover
the affected behavior.

## Verification and installed acceptance

- Added browser regressions first; the prior sidebar failed them.
- Plugin TypeScript/build and five focused sidebar/browser tests passed. Browser
  coverage includes desktop/narrow layout, light/dark states, hidden collapsed
  content, search focus, search text retention and preserved conversation draft.
- Reviewed the exact installed sidebar module diff: only the rail CSS, icons,
  wrapper and search-focus behavior changed. Two installed files were patched
  with original-file backups; all other client bundle modules remain byte-identical.
- Reloaded the renderer while bypassing its old cache; Agent process, identity
  and business data were retained.
- Actual installed sidebar: wrapper hidden, list height zero, new/search SVGs
  present. Search expands the real list (793px height) and focuses its input.
  Web menu remains present. Left the installed sidebar in its improved collapsed
  conversation state and visually inspected its screenshot.
- `git diff --check` passed (Git reports only configured LF/CRLF conversion notices).

Evidence/rollback: `D:/项目/.codex-build/sidebar-rail-20261015/` includes
`acceptance.json`, `installed-rail.png`, `manifest.json`, exact before/after module
snapshots and `backup/`. Restore each backup to its manifest target, then reload
the renderer while bypassing cache to roll back this sidebar change.
