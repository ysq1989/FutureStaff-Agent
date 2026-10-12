# Embedded business systems in Agent tabs

User requires one click to render each system inside Agent, without an external
browser or intermediate launch card. This extends the existing native-tab task.
High Risk: native content, renderer/Host authorization seam and external navigation.

Product plugin owns canonical app ID/authorization resolution; Desktop owns only
WebContentsView and isolated guest lifecycle. IPC accepts app ID/actions/bounds,
never credentials, URL or tenant. Only the main trusted shell frame may invoke it.
Host resolves current application URL and namespace/user/tenant from its own
authorized session; revocation AbortSignal destroys guests and clears storage.
Each app+identity has a separate persistent partition, no Agent preload, no Node,
no DSH cookie/header; HTTPS navigation restricted to the selected system and
platform identity hosts. Local/private network requests, external windows and
downloads denied. No authentication bypass or CSP/X-Frame-Options changes.

Switching tabs detaches inactive guests without discarding their state; close
destroys that view; logout/identity change disposes and clears its partition.
Bounds are clamped to the window and scaled by shell zoom. Guest authorization
is rechecked before show/reload, including stale async completions.

Native support absent: explicit update-required state, never external fallback.
Business system login can occur inside its guest tab; desktop login is not
silently forwarded. Browser display does not claim Agent model browser control.

Acceptance: one-click native page; duplicate single tab/view; hidden views cannot
cover chat or account overlays; close/logout/tenant revocation; spoofed URL/owner
input rejected; no native API/credential exposure in guests; no loopback access;
desktop zoom/resize; browser fixture and actual isolated Electron smoke.
Preserve unrelated pending GEO Host/API work. No deployment or commit in this
request. Public runtime requires a native+preload+product plugin update together.

## Implementation and evidence (2026-10-10)

Source implementation complete. Desktop owns DesktopSystemViews and versioned
preload IPC; platform Host resolves URL/identity from its authorized session.
Canonical cloud systems use EmbeddedSystemPage directly; local Douyin remains
unchanged. HTML account/modal overlays detach the native guest temporarily.
DNS results as well as URL schemes/hostnames block local/private network access.

Passed: platform build/typecheck and 153 tests; affected native and client/test
typechecks; native build and runtime closure (228 first-party nodes); focused
native view/window suites (19 tests); GEO/Douyin typechecks; git diff --check.
Browser fixture confirms show requests without URLs/tenants or external opens,
Chinese tab naming, hidden tabs and identity cleanup. Actual isolated Electron
smoke confirms loaded native guest, draft persistence, singleton, separate
cookies/no preload bridge, private HTTP blocking and abort disposal.
Artifacts: work/embedded-system/{native-result.json,native-guest.png,
native-shell.png,native-smoke.txt,platform-tests.txt,native-build.txt}.

Full native suite: 1090 passed, 19 failed, 13 skipped, two unhandled errors.
All failing test names match an unmodified main source snapshot (same 19
failures/two errors): Windows symlink permission cases and existing runtime
fixture expectations. No new failures; no tests weakened. Full suite is not
reported as passed. Baseline comparison: baseline-native-tests.txt and
native-unit-tests-final.txt under work/embedded-system/.

At source acceptance no installed client, public release, backend service,
credentials or business data changed. Deployment requires reviewed native runtime/preload plus platform
Host/client artifacts together; exclude unrelated pending GEO publishing hunks
in the same plugin.ts file. Real authorized business login remains runtime
acceptance after deployment, not claimed by the isolated fixture.

## Local deployment completed (2026-10-10)

User explicitly requested deployment. Built an exported main candidate with 18
scoped files; plugin.ts includes only resolveSystemApplication, excluding pending
GEO browser-authorize additions. Clean candidate: platform typecheck/build and
152 tests; native build/typecheck, 19 focused tests, 228-node closure and actual
isolated Electron smoke passed. Hidden modal/obsolete request state handling
received a regression fixture and final scoped Client bundle refresh.

Installed native ASAR header and 158 changed native lib files, plus six platform
Host/Client/helper files. 20,096 original package files outside native lib were
verified identical. EXE, dependency packages, configuration, public update feed,
installer version and business databases were not replaced. No commit/push.
Active profile uses the existing installed 2.0.22; changes are a local pilot.

User completed desktop login after the prior session expired. Actual installed
renderer verified seven Chinese entries and native IPC; ERP discovery supplied
erp-dev.fsstory.net/erp and Visa supplied visa.fsstory.net/immigration/.
Both loaded as native guests with complete DOM, reused the same guest IDs across
Session/System/tab switches, no external launch card and no loading/error
status remaining. Guest Node and Agent bridge absent. Module login pages remain
inside their tabs; no business login, inference or submission was performed.
Final normal restart removed the temporary loopback CDP option.

Backup/hash receipt, runtime/business validation and rollback script:
D:/项目/.codex-build/embedded-systems-local-20261010/.
Use rollback-runtime.mjs only with the client stopped. It restores the original
archive/changed files and removes only newly introduced files within checked
native/platform roots. Unrelated source work remains untouched.

## 2026-10-12 系统代理虚拟 DNS 兼容

已复现系统 HTTP 代理启用时，授权业务域名由本机 DNS 返回 198.18/15 虚拟地址，原守卫错误阻断了加载。现在仅在目标是 Host 服务端授权 URL 或既有认证站点、DNS 结果只含公共地址或该虚拟段、浏览器解析结果为显式 HTTP/HTTPS/SOCKS5 代理且无 DIRECT 回退时识别代理传输。实际回环、私网和链路本地地址、任意其他域名仍拒绝；没有修改机器代理、用户凭据或站点设置。Session 复用时更新授权目标，防止继续信任旧域名。

回归先失败再修复，9 项通过；真实 ERP、Hub、Shop、AI、Visa、GEO 均加载且不用重输密码，会话用户/主体匹配，原生页签复用，Guest 无 Node/Agent bridge。原始证据在 D:/项目/.codex-build/agent-v3-repair-20261012/final-acceptance.json，当前安装包发布前还需扩大门禁和精确源码审查。
