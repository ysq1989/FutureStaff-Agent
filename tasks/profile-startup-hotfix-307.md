# 3.0.7 packaged Profile startup repair

User reports recovery mode after upgrading another computer to 3.0.6.
Error: FutureStaff release Profile file inventory is invalid.

Confirmed: the 3.0.6 release Profile contains 301 files, while startup still caps
its inventory at 256. The builder verified hashes and portability without calling
the startup validator, and development launches skip packaged Profile installation.
This permits a fully hashed, signed installer that cannot pass first startup.
The earlier development-login check did not cover the affected packaged path.

Scope: bounded Profile inventory capacity, shared startup validation during
staging and afterPack, regression for actual-sized manifests and malicious inputs,
3.0.6 supersedence, and a 3.0.7 repair installer/update feed. Preserve all user
profiles, sessions and business files. No changes on the current machine's old
installed application; the reported failing installation is on another computer.

Acceptance: fresh packaged startup reaches login; verified 3.0.6/old Profile
upgrade fixtures preserve sessions and customized code; invalid paths, overflow
and tampering still fail; stage and afterPack reject runtime-incompatible resources.
Do not replace any existing versioned installer. Keep 3.0.5 as the last known
rollback installer and deliver a manual repair link for clients stuck in recovery.

Implementation: cap whole-Profile inventories at 1024; retain the workspace-code
inventory cap at 256 and all path, symlink, manifest-size and hash protections.
Staging and afterPack now call the exact startup validator. Added regressions for
301 files, overflow, unsafe paths, digests and afterPack rejection. Audited the
official 3.0.6 manifest and code inventory for managed, hash-matched upgrades.

Verified on 2026-10-17: full `npm run check` passes (Stable 1125 passed, Beta 1032
passed, 13 existing platform skips in each; root 64 passed; product checks pass).
The official 3.0.6 EXE was hash-verified, extracted and run with isolated user and
Harness directories: packaged startup reproduces the reported inventory error.
Actual 3.0.6 Profile -> staged repair resources upgrades unmodified files,
preserves modified files and retains session sentinels. 3.0.5 rollback has 219 files.

Containment: revoked the 3.0.6 feed under the publication lock after checking its
expected SHA-256; backed it up in the server's 3.0.7 repair directory. Restored the
original signed feed, independently verified at public HTTPS (SHA-256
`930f02bc02098ca94783b644db7261314bc07f5b6ef4385a420694746a6c93d3`).
Versioned installers remain unchanged. Private signing key stays outside source.

Status: source checks complete; 3.0.7 installer build, actual packaged login and
signed publication still pending. Local evidence: `.local-checks/profile-fix*`.
