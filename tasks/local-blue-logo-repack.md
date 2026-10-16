# Local Windows blue-logo repair package — 2026-10-15

User authorized rebuilding the Windows installer and upgrading this local client.
Scope: EXE and runtime application icon; preserve current installed functionality,
packaged profile, active profile, sessions and sign-in configuration.

Baseline: main `1ef692067e`; existing unrelated working-tree changes preserved.
Installed EXE reports 3.0.2, installed runtime package reports 3.0.5.
Candidate is derived from the current installed application, not the dirty source tree.
Output and complete application rollback: `output/blue-logo-repack-20261015/`.
No server deployment, commit or push.

Acceptance: approved transparent blue mark in EXE and runtime icon, NSIS installer
build, existing packaged-runtime gate, protected-file hashes, local install exit code,
relaunch and authenticated existing conversation, running window icon validation.

Checks: icon/tray/Windows selection 9 passed; window-options, installer-nsh and
verify-win-installer 18 passed. Full package suite has a pre-existing version
expectation mismatch (expects 3.0.2; source manifest 3.0.5); 37 other package tests pass.
Status: complete; local installer applied successfully (exit 0), client relaunched.

Final evidence:
- `output/blue-logo-repack-20261015/candidate.json`: 23,009 archive entries checked;
  all protected original content unchanged. Existing packaged runtime gate passed.
- Packaged diagnostic Worker smoke passed.
- NSIS build succeeded with local compression level 1; installer PE and 7-Zip
  payload integrity checks passed. SHA-256 sidecar exported with installer.
- `install-result.json`: installer exit 0, EXE version 3.0.5.
- `installed-verification.json`: protected installed files unchanged, candidate
  EXE/archive/icon hashes match, installed runtime gate passes.
- `running-window-verification.json` and `running-window-icon.png`: live window
  returned the approved blue-only mark through WM_GETICON, without text/frame.
- Windows Computer Use confirmed the existing signed-in platform administrator,
  SHOP session list and the original selected conversation after normal restart.
- Desktop and Start Menu shortcuts target the installed EXE and approved ICO.
- Complete application rollback remains in `output/blue-logo-repack-20261015/rollback`.
- Export: `outputs/FutureStaff-Agent-3.0.5-blue-logo-x64-Setup.exe` (unsigned local repair).
- No source code, server, user profile data, credentials, commit or push changed.
