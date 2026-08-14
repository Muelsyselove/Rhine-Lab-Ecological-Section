// Release 构建 — 图标 → electron-packager(win32 x64) → Inno Setup 安装包
// 用法：npm run dist          正常出包（图标缺失时自动生成）
//       npm run dist -- --icon  强制重新生成图标
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { packager } = require('@electron/packager');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const distDir = path.join(root, 'dist');
const icoFile = path.join(root, 'assets', 'icon.ico');

function findISCC() {
  const candidates = [
    process.env.ISCC,
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Inno Setup 6', 'ISCC.exe'),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function main() {
  // 国内网络下 github.com 直连常超时：默认走 npmmirror 镜像（可用环境变量覆盖）
  process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
  // 1) 图标
  if (process.argv.includes('--icon') || !fs.existsSync(icoFile)) {
    const r = spawnSync(process.execPath, [path.join(__dirname, 'build-icon.js')], {
      stdio: 'inherit',
      windowsHide: true,
    });
    if (r.status !== 0) process.exit(1);
  }

  // 2) electron-packager：无运行时 npm 依赖，排除 node_modules 与构建产物
  console.log('[packager] win32 x64 …');
  const appPaths = await packager({
    dir: root,
    name: 'ECO',
    platform: 'win32',
    arch: 'x64',
    out: distDir,
    overwrite: true,
    icon: icoFile,
    asar: true,
    appVersion: pkg.version,
    appCopyright: `© 2026 ${pkg.productName} (AGPL-3.0)`,
    win32metadata: {
      CompanyName: pkg.productName,
      FileDescription: pkg.description,
      ProductName: pkg.productName,
      OriginalFilename: 'ECO.exe',
    },
    ignore: [
      /[/\\]\.git(\/|\\|$)/,
      /[/\\]\.trae(\/|\\|$)/,
      /[/\\]node_modules(\/|\\|$)/,
      /[/\\]dist(\/|\\|$)/,
      /[/\\]scripts(\/|\\|$)/,
      /[/\\]installer(\/|\\|$)/,
      /[/\\]\.trae-html-share-packages(\/|\\|$)/,
    ],
  });
  console.log('[packager] done →', path.relative(root, appPaths[0]));

  // 3) Inno Setup 编译安装包
  const iscc = findISCC();
  if (!iscc) {
    console.error('[dist] 未找到 ISCC.exe：请安装 Inno Setup 6，或设置环境变量 ISCC 指向其路径');
    process.exit(1);
  }
  console.log('[inno] compiling installer …');
  const r = spawnSync(iscc, [`/DMyAppVersion=${pkg.version}`, path.join(root, 'installer.iss')], {
    stdio: 'inherit',
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(1);
  console.log(`\n[dist] 完成 → ${path.join(distDir, `ECO-Setup-${pkg.version}.exe`)}`);
}

main().catch((err) => {
  console.error('[dist] failed:', err);
  process.exit(1);
});
