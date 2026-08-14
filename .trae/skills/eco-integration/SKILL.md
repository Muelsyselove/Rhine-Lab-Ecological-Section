---
name: "eco-integration"
description: "将项目改造为 ECO 启动器（莱茵生命生态科）可无缝接入的形态。当用户要求接入 ECO、制作 ECO 接入包、改造项目发版流程、编写 eco-manifest 或 ECO 发布工作流时调用。"
---

# ECO 项目接入指南（生态接入）

将一个 GitHub 项目改造为可被 ECO 启动器（Rhine Lab Ecological Section）无感接入、种植与生长的形态。

## 核心原则

1. **保留调试入口**：仓库必须保留可供开发调试的 `start` 脚本（如 `npm run start` / `python main.py`），ECO 与开发者都依赖它。
2. **Release 不再提供一键安装包/一键启动包**：不发布 NSIS 安装器、绿色 exe 整合包等。Release 只提供 **ECO 友好压缩包**（源码 + 依赖清单 + 启动清单），由 ECO 负责下载、解压、装配依赖与启动。
3. **依赖信息必须显式声明**：压缩包根目录必须包含 `eco-manifest.json`，ECO 据此完成"施肥"（依赖安装）与"观察"（启动）。

## 接入改造步骤

### 1. 编写 eco-manifest.json

置于仓库根目录，并打入压缩包根部：

```json
{
  "spec": "eco/1",
  "name": "my-project",
  "displayName": "我的项目",
  "version": "1.0.0",
  "description": "一句话描述",
  "launch": { "command": "npm", "args": ["run", "start"] },
  "dependencies": [
    { "type": "npm", "command": "npm", "args": ["install"] },
    { "type": "pip", "command": "pip", "args": ["install", "-r", "requirements.txt"] }
  ]
}
```

字段约定：

- `spec`：固定 `eco/1`。
- `version`：与 git tag / release tag 一致（ECO 以此判断"远方来信"即更新）。
- `launch`：启动命令。缺省时 ECO 回退到自动探测（package.json 的 start/dev 脚本）。
- `dependencies`：数组，按顺序执行的装配命令。`type` 仅作语义标注（npm/pnpm/yarn/pip/cargo 等），`command`+`args` 才是执行内容。缺省时 ECO 按锁文件与 requirements.txt 自动探测。

### 2. 压缩包规范

- 格式优先 `.tar.gz`（Windows 10+ / macOS / Linux 均自带 tar）；`.zip` 亦可，ECO 会自动选择解压策略。
- 命名：`{name}-{version}-eco.tar.gz`，例如 `my-project-1.0.0-eco.tar.gz`。资产名含 `-eco` 会被 ECO 优先选中。
- 内容为项目构建产物或可直接运行的源码树，`eco-manifest.json` 必须位于解压后的根目录。

### 3. Release 工作流（GitHub Actions 示例）

```yaml
name: eco-release
on:
  push:
    tags: ["v*"]
jobs:
  pack:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 安装依赖并构建（如有构建步骤）
        run: |
          npm ci
          npm run build
      - name: 打入 ECO 压缩包
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          mkdir -p dist-eco
          # 复制运行所需文件（按项目实际调整）
          cp -r package.json eco-manifest.json dist/ dist-eco/ 2>/dev/null || true
          tar -czf "my-project-${VERSION}-eco.tar.gz" -C dist-eco .
      - uses: softprops/action-gh-release@v2
        with:
          files: "*-eco.tar.gz"
```

要点：tag 以 `v` 开头并与 manifest 的 `version` 对应；不要在 Release 中附带安装器。

### 4. 验证清单

- [ ] `eco-manifest.json` 存在于压缩包根部，JSON 合法
- [ ] 解压后执行 `launch` 命令可启动（依赖已按 `dependencies` 装配）
- [ ] Release 资产名包含 `-eco` 且为 `.tar.gz` 或 `.zip`
- [ ] tag 与 `version` 一致，ECO 能据此检测更新
- [ ] 仓库保留 `start` 调试脚本，未被发版流程删除

## ECO 端体验对照（供理解，不需实现）

用户视角流程：种植 → 松土中（连接项目/获取 release 信息）→ 播种中（下载压缩包）→ 浇水中（解压）→ 施肥中（安装依赖）→ 长大啦（成功，停留 2 秒）→ 观察（启动）。更新：远方来信（有新版本）→ 生长（确认更新）/ 这样就够了（忽略）→ 生长中（更新过程）。
