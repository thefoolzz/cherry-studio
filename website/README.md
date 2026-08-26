# 晨微 官网

单页落地页，和桌面应用完全分离：不复用 `packages/ui`，不进 pnpm workspace，自带 lockfile。

```bash
pnpm install --ignore-workspace   # 必须带 --ignore-workspace，否则依赖会并进主仓 lockfile
pnpm dev                          # 本地预览
pnpm build                        # tsc --noEmit + vite build → dist/
```

`--ignore-workspace` 是硬要求：根 `pnpm-workspace.yaml` 只匹配 `packages/*`，而根 `overrides` 会把 `vite` 换成 `rolldown-vite`；一旦并进主 lockfile，站点的依赖变更还会触发 CI 的全量测试矩阵。

主仓的门禁已经排除本目录：`.oxlintrc.json`、`eslint.config.mjs`、`biome.jsonc` 各加了 `website` 忽略项，`electron-builder.yml` 的 `files` 加了 `!website`（否则站点会被打进 asar）。站点文案是直接写死的中文，不接 i18next——仓库的 i18n 检查只扫 `src/`，不会碰这里。

下载按钮在运行时读 `api.github.com/repos/thefoolzz/cherry-studio/releases/latest`，按资源名逐个判断属于哪个平台和架构——**以真实 release 的产物名为准，不要照 `electron-builder.yml` 拼文件名**：Windows 安装版实际叫 `CherryStudio-Setup-<version>[-arm64].exe`，macOS x64 的 zip 是 `CherryStudio-<version>-mac.zip`（没有架构词），Linux 的 deb 用 `amd64`、rpm 用 `x86_64`/`aarch64`。`.blockmap`、`latest*.yml`、`release-history.json` 会被过滤掉。

未认证的 GitHub API 是 60 次/小时/IP，限流或离线时整个下载区降级成跳转发布页——改动这块务必把正常、限流、离线三种情况都试一遍。
