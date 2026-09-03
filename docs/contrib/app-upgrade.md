---
description: How clients check GitHub Releases for updates
sources:
  - src/main/services/AppUpdaterService.ts
  - electron-builder.yml
  - dev-app-update.yml
---

# App Update Architecture

## Overview

Cherry Studio clients check for updates from the latest release in `thefoolzz/cherry-studio`. The client sends application, client, platform, and region metadata. GitHub Releases provides the platform-specific update manifest and its referenced installer or archive.

## Update Feed Configuration

- Packaged builds use the GitHub provider configured in `electron-builder.yml`. electron-builder writes this value to the packaged `app-update.yml`.
- Development builds set `forceDevUpdateConfig = true`, so electron-updater reads `dev-app-update.yml` from the repository root. It uses the same `thefoolzz/cherry-studio` GitHub Releases feed.
- Repository changes take effect in newly produced application builds. The client does not override the packaged feed at runtime.

## Channel

The client always requests the `latest` (stable) channel. It sets that explicitly before every check, overriding the channel electron-builder wrote into the packaged `app-update.yml`, so an installed prerelease follows stable releases from then on. There is no user-facing channel switch.

## Request Contract

Before each update check, the client preserves existing updater headers and sets these values:

| Header | Value |
| --- | --- |
| `Client-Id` | Persistent client identifier |
| `App-Name` | Application name |
| `App-Version` | Installed version with a `v` prefix |
| `OS` | `process.platform` value |
| `X-Region` | `cn` for China, otherwise `global` |
| `User-Agent` | Generated Cherry Studio user agent |
| `Cache-Control` | `no-cache` |

The client always requests the `latest` manifest; no separate release-channel header is sent.

## Check Lifecycle

Manual checks are available in development and packaged, non-portable builds. Portable builds do not perform update checks. Packaged, non-portable builds also schedule automatic checks in the main process. Successful checks return to the normal cadence, while failed scheduled checks use exponential backoff before retrying. Update events and download progress continue to reach the main window through IpcApi.
