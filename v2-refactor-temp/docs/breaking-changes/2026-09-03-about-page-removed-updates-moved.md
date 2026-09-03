---
title: About page removed; update controls moved to General settings
category: moved
severity: notice
introduced_in_pr: 9cd39667b
date: 2026-09-03
---

## What changed

Settings no longer has an "About" entry, and the sidebar's help (?) menu is
gone. The controls that lived there moved or were dropped:

- Version, "Check Update" and the auto-update switch are now in
  Settings → General, under a new "Updates" group.
- Diagnostic bundle export and the debug panel moved into
  Settings → General → Developer mode.
- The test-plan switch, the RC/Beta channel picker, the release-notes page,
  the feedback dialog, and the links to docs / website / enterprise /
  contact / careers are removed.

## Why this matters to the user

Anyone who had the test plan enabled was following the RC or Beta channel.
That switch no longer exists and the client now always requests the stable
`latest` channel, so the next update check moves them onto a stable release
(the updater never downgrades, so this happens when stable passes their
installed prerelease version).

Users also lose the in-app changelog and the feedback dialog; the built-in
feedback agent is still reachable from the agents page.

## What the user should do

Nothing — automatic. Manual update checks are in Settings → General → Updates.

## Notes for release manager

The stored `app.dist.test_plan.*` preferences are dropped from the schema, so
the rows a user already has are ignored rather than migrated. `release-history.json`
is no longer generated, bundled, or published as a release asset — mention this
if release tooling docs are shared externally.
