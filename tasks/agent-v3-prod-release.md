# Agent 3.0 PROD release

2026-10-12. User explicitly authorized PROD deployment and updating the formal Agent client. High Risk: PROD API and public desktop update distribution. No schema migration or business-data changes. Preserve existing production employee-profile 1.12.15 capabilities, UI, embedded system SSO and user data; exclude separate unfinished GEO publishing work.

Platform candidate derives from the live PROD API image, adding only the three DEV-validated desktop-agent/chat/router files and version 1.12.16. Existing production schema generation 4 is retained; API-only login bridge and CAS guard required. Prior API image/config and all other container IDs must be recorded.

Client candidate: stable 3.0.0 from clean main, incorporating the already installed and DEV-verified neutral UI and embedded-system code so a formal installation preserves those features. Current working-tree GEO publishing and unrelated trackers are excluded. Full checks, immutable installer, original signing trust, rollback artifact, exact HTTPS hashes, installed-client verification and scoped release receipts are required.

Source gates passed: full clean-candidate npm run check, Stable 1116 / Beta 1032 with 13 existing conditional skips each, root 64. Fixed six updater fixture failures by using future version 3.0.1 and changed-feed 3.0.2, preserving all assertions. Existing DEV preview and production Profile data retained. PROD API-only deployment completed: 1.12.16, generation 26, schema generation 4 unchanged; only PROD Platform API container changed. Formal installer build and live client verification in progress; public feed signature requires existing manifest private key.
