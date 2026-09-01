---
title: Chat is now the only conversation entry in the sidebar
category: removed
severity: notice
introduced_in_pr: TBD
date: 2026-08-31
---

## What changed

Two things, both narrowing the sidebar down to one conversation entry:

- The agent app is no longer offered as a sidebar or launchpad entry, and individual agents can no longer be pinned to the sidebar. Agents now open from Chat's unified new-conversation picker; existing routes, deep links, and notification clicks remain compatible.
- A new install now ships with chat as its only pinned sidebar entry. Translate, paintings, and knowledge are no longer pinned out of the box.
- The built-in publishing assistant is a dedicated shortcut in the same picker. Its article editor, account selection, and draft-creation flow are unchanged.

## Why this matters to the user

Users who previously opened agent sessions from the sidebar row or from a pinned agent will not find those entries anymore, and a stored agent row disappears from the sidebar the next time it is read. While an agent session is open, Chat remains highlighted as the single conversation entry.

New installs see a sidebar with chat alone. Translate, paintings, and knowledge did not go away — they are still launchpad tiles and can be pinned back by hand. Existing installs keep whatever they already have pinned: the default only applies when the preference has never been written. Files, code, notes, and mini apps are untouched.

## What the user should do

Nothing — automatic. Existing agent rows are dropped from the sidebar on read; open an agent or the publishing workflow from Chat's new-conversation picker. New users who want translate, paintings, or knowledge in the sidebar can pin them from the launchpad.

## Notes for release manager

Only entry points changed — the chat runtime, publishing workflow, agent runtime, sessions, and their navigation are intact, and no app was removed from the product. The "Pin Agent" action inside the agent rail is a separate ordering feature and still works; only "Add to sidebar" / "Remove from sidebar" are gone for agents.

The default-favorites change is invisible to anyone upgrading, since `PreferenceSeeder` writes a default only when the key is absent. It is worth a line in the release notes anyway because it changes first-run impressions.
