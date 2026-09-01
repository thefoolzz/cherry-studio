# chenwei 官网

单页落地页，和桌面应用完全分离：不复用 `packages/ui`，不进 pnpm workspace，自带 lockfile。

```bash
pnpm install --ignore-workspace   # 必须带 --ignore-workspace，否则依赖会并进主仓 lockfile
pnpm dev                          # 本地预览
pnpm build                        # tsc --noEmit + vite build → dist/
```

`--ignore-workspace` 是硬要求：根 `pnpm-workspace.yaml` 只匹配 `packages/*`，而根 `overrides` 会把 `vite` 换成 `rolldown-vite`；一旦并进主 lockfile，站点的依赖变更还会触发 CI 的全量测试矩阵。

主仓的门禁已经排除本目录：`.oxlintrc.json`、`eslint.config.mjs`、`biome.jsonc` 各加了 `website` 忽略项，`electron-builder.yml` 的 `files` 加了 `!website`（否则站点会被打进 asar）。站点文案是直接写死的中文，不接 i18next——仓库的 i18n 检查只扫 `src/`，不会碰这里。

下载链接是「构建期兜底 + 运行时升级」两层：

- `src/download/release.generated.json` 是构建期同步下来的安装包列表，页面一打开就用它，所以零网络也有真实按钮，**永远不会出现空态**。发新版后跑 `pnpm release:sync` 更新它（被限流时加 `GITHUB_TOKEN=<token>`），这个文件要提交。
- 页面同时问一次 `api.github.com/.../releases/latest`，成功就替换成最新版。未认证的 API 是 60 次/小时/IP，国内也常连不上，所以这一步只做增量升级，失败就静默保持兜底那份。

资源名**以真实 release 为准，不要照 `electron-builder.yml` 拼文件名**：Windows 安装版实际叫 `CherryStudio-Setup-<version>[-arm64].exe`，macOS x64 的 zip 是 `CherryStudio-<version>-mac.zip`（没有架构词），Linux 的 deb 用 `amd64`、rpm 用 `x86_64`/`aarch64`。`.blockmap`、`latest*.yml`、`release-history.json` 会被过滤掉。
