---
title: Publishing now includes editable writing templates
category: changed
severity: notice
introduced_in_pr: TBD
date: 2026-09-01
---

## What changed

The built-in publishing assistant now adapts its structure to the requested article type, performs an editorial rewrite before returning a draft, and can turn a generated article or public article URL into a reusable writing template. Saved templates appear in a new Writing Templates sidebar page where users can create, inspect, edit, and delete them.

## Why this matters to the user

Generated articles no longer default to one fixed heading and paragraph pattern. A template preserves voice, structural roles, variables, and quality checks without carrying the source article's facts or copied passages into new work.

## What the user should do

Nothing — automatic. Use **Save as template** below a generated article, ask the publishing assistant to learn from an article link, or open **Writing Templates** in the sidebar to edit the resulting blueprint.

## Notes for release manager

The template library is SQLite-backed and migrates forward with the rest of v2 user data. Publishing accounts and the existing draft-creation flow are unchanged.
