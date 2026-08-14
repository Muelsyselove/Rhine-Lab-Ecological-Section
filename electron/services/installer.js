// 种植器 — 连接项目(松土) → 下载 release 包(播种) → 解压(浇水) → 装配依赖(施肥)
//           → 长大啦 → 观察(启动)；另负责远方来信(更新检查)与生长(更新)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { shell } = require('electron');
const store = require('./store');
const github = require('./github');
const { httpFetch } = require('./http');

let sender = null;
const running = new Map(); // projectId -> child process

function attach(win) {
  sender = win.webContents;
}

function emit(payload) {
  if (sender && !sender.isDestroyed()) sender.send('eco:progress', payload);
}

function sanitize(name) {
  return (name || '未分组').replace(/[\\/:*?"<>|]/g, '_');
}

// 解析实际安装目录：优先项目自定义路径，否则 根目录/分组/项目名
function resolveInstallDir(project, settings) {
  if (project.installDir) return project.installDir;
  return path.join(settings.rootDir, sanitize(project.group), project.name);
}

function runCommand(command, args, cwd, id, stage) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: process.platform === 'win32' });
    child.stdout.on('data', (buf) => {
      buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage, line }));
    });
    child.stderr.on('data', (buf) => {
      buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage, line, stderr: true }));
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} 退出码 ${code}`))));
  });
}

async function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/* ---------- 阶段一：松土（连接项目，获取 release） ---------- */
async function stageConnect(project, id, mode) {
  emit({ id, stage: 'connect', mode, line: `连接至 ${project.repo} …` });
  const release = await github.fetchLatestRelease(project.repo);
  if (!release) throw new Error('该项目尚无 Release，无法种植。请先按 ECO 接入指南发版');
  if (!release.asset) throw new Error(`Release ${release.tag} 中没有可用的 ECO 压缩包`);
  emit({ id, stage: 'connect', mode, line: `发现版本 ${release.tag} · 资产 ${release.asset.name}` });
  return release;
}

/* ---------- 阶段二：播种（下载压缩包） ---------- */
async function stageDownload(release, id, mode) {
  const url = release.asset.url;
  emit({ id, stage: 'download', mode, percent: 0, line: `播种: ${release.asset.name}` });
  const res = await httpFetch(url, {
    headers: { 'User-Agent': 'ECO-Launcher', Accept: 'application/octet-stream' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || release.asset.size || 0;
  const tmp = path.join(os.tmpdir(), `eco-${id}-${release.asset.name}`);
  const out = fs.createWriteStream(tmp);
  let received = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (!out.write(value)) await new Promise((r) => out.once('drain', r));
    if (total) {
      emit({ id, stage: 'download', mode, percent: Math.round((received / total) * 100) });
    }
  }
  await new Promise((r) => out.end(r));
  emit({ id, stage: 'download', mode, percent: 100, line: `播种完成 · ${(received / 1048576).toFixed(1)} MiB` });
  return tmp;
}

/* ---------- 阶段三：浇水（解压） ---------- */
async function stageExtract(archive, dir, id, mode) {
  emit({ id, stage: 'extract', mode, line: `浇水至 ${dir}` });
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const isZip = archive.endsWith('.zip');
  if (isZip && process.platform === 'win32') {
    await runCommand('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${dir}' -Force`], dir, id, 'extract');
  } else if (isZip) {
    await runCommand('unzip', ['-q', '-o', archive, '-d', dir], dir, id, 'extract');
  } else {
    await runCommand('tar', ['-xzf', archive, '-C', dir], dir, id, 'extract');
  }
  fs.rmSync(archive, { force: true });
  emit({ id, stage: 'extract', mode, line: '根系已舒展' });
}

/* ---------- 阶段四：施肥（读取 manifest，装配依赖） ---------- */
function readManifest(dir) {
  const file = path.join(dir, 'eco-manifest.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function detectPm(dir) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

async function stageDeps(dir, manifest, id, mode) {
  let steps = [];
  if (manifest && Array.isArray(manifest.dependencies) && manifest.dependencies.length) {
    steps = manifest.dependencies.map((d) => [d.command, d.args || []]);
    emit({ id, stage: 'deps', mode, line: '按 eco-manifest.json 施肥' });
  } else {
    if (await exists(path.join(dir, 'package.json'))) steps.push([detectPm(dir), ['install']]);
    if (await exists(path.join(dir, 'requirements.txt'))) steps.push(['pip', ['install', '-r', 'requirements.txt']]);
    if (steps.length) emit({ id, stage: 'deps', mode, line: '未找到 manifest，自动探测依赖' });
  }
  for (const [cmd, args] of steps) {
    emit({ id, stage: 'deps', mode, line: `$ ${cmd} ${args.join(' ')}` });
    await runCommand(cmd, args, dir, id, 'deps');
  }
  if (!steps.length) emit({ id, stage: 'deps', mode, line: '无需额外养分' });
}

/* ---------- 种植 / 生长（更新） ---------- */
async function install(id, opts = {}) {
  const mode = opts.mode || 'install'; // 'install' | 'update'
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  const settings = store.getSettings();

  // 本地登记项目：无 release 管线，直接施肥
  if (project.source === 'local') {
    store.updateProject(id, { status: 'installing' });
    const manifest = readManifest(project.installPath);
    await stageDeps(project.installPath, manifest, id, mode);
    const done = store.updateProject(id, { status: 'installed' });
    emit({ id, stage: 'done', mode, line: '长大啦 ✓' });
    return done;
  }

  const dir = resolveInstallDir(project, settings);
  store.updateProject(id, { status: 'installing' });
  emit({ id, stage: 'start', mode, line: mode === 'update' ? '生长开始…' : `种植目标: ${dir}` });
  try {
    const release = await stageConnect(project, id, mode);
    const archive = await stageDownload(release, id, mode);
    await stageExtract(archive, dir, id, mode);
    const manifest = readManifest(dir);
    await stageDeps(dir, manifest, id, mode);
    const done = store.updateProject(id, {
      status: 'installed',
      installPath: dir,
      version: release.tag,
      latestVersion: release.tag,
      ignoredVersion: '',
    });
    emit({ id, stage: 'done', mode, line: '长大啦 ✓' });
    return done;
  } catch (err) {
    store.updateProject(id, { status: 'error' });
    emit({ id, stage: 'error', mode, line: String(err.message || err) });
    throw err;
  }
}

/* ---------- 远方来信（更新检查） ---------- */
async function checkUpdates() {
  const state = store.getState();
  const results = [];
  for (const p of state.projects) {
    if (p.source !== 'github' || p.status === 'not_installed' || !p.repo) continue;
    try {
      const release = await github.fetchLatestRelease(p.repo);
      if (!release) continue;
      const hasUpdate = p.version && release.tag !== p.version && release.tag !== p.ignoredVersion;
      store.updateProject(p.id, { latestVersion: release.tag });
      results.push({ id: p.id, latest: release.tag, hasUpdate });
    } catch (err) {
      results.push({ id: p.id, error: String(err.message || err) });
    }
  }
  return results;
}

/* ---------- 观察（启动） ---------- */
function resolveLaunch(project) {
  const dir = project.installPath;
  const manifest = dir ? readManifest(dir) : null;
  if (project.launchCmd) return { cmd: project.launchCmd, args: [], shell: true };
  if (manifest && manifest.launch && manifest.launch.command) {
    return { cmd: manifest.launch.command, args: manifest.launch.args || [], shell: !!manifest.launch.shell };
  }
  if (dir && fs.existsSync(path.join(dir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const pm = detectPm(dir);
    if (pkg.scripts && pkg.scripts.start) return { cmd: pm, args: ['run', 'start'] };
    if (pkg.scripts && pkg.scripts.dev) return { cmd: pm, args: ['run', 'dev'] };
  }
  return null;
}

async function launch(id) {
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  if (running.has(id)) return project;
  if (project.status !== 'installed' && project.status !== 'error') {
    throw new Error('项目尚未种植，无法观察');
  }
  const plan = resolveLaunch(project);
  if (!plan) throw new Error('未找到启动方式，请在观测窗中配置启动命令');

  emit({ id, stage: 'launch', line: `观察开始: $ ${plan.cmd} ${plan.args.join(' ')}` });
  const child = spawn(plan.cmd, plan.args, {
    cwd: project.installPath,
    shell: plan.shell || process.platform === 'win32',
    detached: true,
  });
  child.stdout.on('data', (buf) => {
    buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage: 'run', line }));
  });
  child.stderr.on('data', (buf) => {
    buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage: 'run', line, stderr: true }));
  });
  child.on('close', () => {
    running.delete(id);
    store.updateProject(id, { status: 'installed' });
    emit({ id, stage: 'exit', line: '观察结束，样本休眠' });
  });
  running.set(id, child);
  return store.updateProject(id, { status: 'running' });
}

async function stop(id) {
  const child = running.get(id);
  if (child) {
    try {
      process.kill(-child.pid);
    } catch {
      child.kill();
    }
    running.delete(id);
  }
  return store.updateProject(id, { status: 'installed' });
}

function stopAll() {
  for (const id of [...running.keys()]) {
    try {
      stop(id);
    } catch {
      /* 退出时忽略 */
    }
  }
}

async function openFolder(id) {
  const project = store.getProject(id);
  if (!project || !project.installPath) throw new Error('尚无种植目录');
  return shell.openPath(project.installPath);
}

/* ---------- 瑰丽花园：启动自选程序 ---------- */
async function launchFavorite(id) {
  const state = store.getState();
  const fav = state.favorites.find((f) => f.id === id);
  if (!fav) throw new Error('收藏不存在');
  if (!fav.launchPath) throw new Error('尚未选择启动地址，样本静待耕耘');
  const stat = fs.existsSync(fav.launchPath) ? fs.statSync(fav.launchPath) : null;
  if (stat && stat.isDirectory()) return shell.openPath(fav.launchPath);
  const child = spawn(fav.launchPath, [], { detached: true, stdio: 'ignore' });
  child.unref();
  return fav;
}

module.exports = {
  attach,
  install,
  launch,
  stop,
  stopAll,
  openFolder,
  checkUpdates,
  launchFavorite,
  resolveInstallDir,
};
