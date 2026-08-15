// 种植器 — 连接项目(松土) → 下载 release 包(播种) → 解压(浇水) → 装配依赖(施肥)
//           → 长大啦 → 观察(启动)；另负责远方来信(更新检查)与生长(更新)
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, shell } = require('electron');
const store = require('./store');
const github = require('./github');
const { httpFetch } = require('./http');
const { GROUP_DIRS } = require('./catalog');

let sender = null;
const running = new Map(); // projectId -> child process

// 国内网络兜底：pip 直连 files.pythonhosted.org 常读超时（pip 退出码 2），失败后走清华镜像重试
const PIP_MIRROR_ARGS = ['-i', 'https://pypi.tuna.tsinghua.edu.cn/simple', '--trusted-host', 'pypi.tuna.tsinghua.edu.cn'];
// Python 子进程统一强制 UTF-8 模式：pip 解析 requirements 按系统区域编码（中文 Windows 为
// GBK），文件含 UTF-8 中文注释时报 UnicodeDecodeError: 'gbk' codec；运行期读 UTF-8 文件同理
const PYTHON_UTF8_ENV = { PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' };
// npm 项目 electron 二进制下载被墙：统一走 npmmirror 镜像（与自身 dist 脚本一致）
const ELECTRON_MIRROR_ENV = { ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/' };

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
// 目录名只用 ASCII：GitHub 项目取 repo 英文名，分组走映射表，保证路径无中文
function resolveInstallDir(project, settings) {
  if (project.installDir) return project.installDir;
  const groupName = GROUP_DIRS[sanitize(project.group)] || 'projects';
  const dirName = project.repo ? project.repo.split('/').pop() : sanitize(project.name);
  return path.join(settings.rootDir, groupName, dirName);
}

function runCommand(command, args, cwd, id, stage, env) {
  return new Promise((resolve, reject) => {
    // Windows 上 npm/pnpm/yarn 是 .cmd 脚本、含空格的命令串必须走 shell；
    // python/node/powershell/tar 直启——避免 cmd.exe 中间层以其 cwd 锁死种植目录
    const needsShell = process.platform === 'win32' && (/\s/.test(command) || ['npm', 'pnpm', 'yarn'].includes(command));
    const child = spawn(command, args, { cwd, shell: needsShell, windowsHide: true, env: env || process.env });
    trackPid(id, child.pid); // 落盘登记：卡死/失败后残留的子进程要在下次种植前清理
    child.stdout.on('data', (buf) => {
      buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage, line }));
    });
    child.stderr.on('data', (buf) => {
      buf.toString().split('\n').filter(Boolean).forEach((line) => emit({ id, stage, line, stderr: true }));
    });
    child.on('error', (err) => {
      untrackPid(id, child.pid);
      reject(err);
    });
    child.on('close', (code) => {
      untrackPid(id, child.pid);
      if (code === 0) resolve();
      else reject(new Error(`${command} 退出码 ${code}`));
    });
  });
}

/* ---------- 残留安装进程治理 ----------
   卡死的 pip/npm 不会随 ECO 退出而终止，其工作目录会锁住种植目录，
   令下次种植的 rmSync 报 EPERM。PID 落盘登记，重种植前统一树杀。 */
const pidFile = () => path.join(app.getPath('userData'), 'eco-pids.json');

function loadPidMap() {
  try {
    return JSON.parse(fs.readFileSync(pidFile(), 'utf8'));
  } catch {
    return {};
  }
}

function savePidMap(map) {
  try {
    fs.writeFileSync(pidFile(), JSON.stringify(map));
  } catch {
    /* 登记失败不影响主流程 */
  }
}

function trackPid(id, pid) {
  if (!pid) return;
  const map = loadPidMap();
  (map[id] = map[id] || []).push(pid);
  savePidMap(map);
}

function untrackPid(id, pid) {
  const map = loadPidMap();
  const list = (map[id] || []).filter((p) => p !== pid);
  if (list.length) map[id] = list;
  else delete map[id];
  savePidMap(map);
}

/** 结束该项目登记在案的残留安装子进程（树杀），并清空登记 */
async function killStaleDeps(id, mode) {
  const map = loadPidMap();
  const pids = map[id] || [];
  delete map[id];
  savePidMap(map);
  if (!pids.length) return;
  emit({ id, stage: 'deps', mode, line: `清理 ${pids.length} 个残留安装进程…`, stderr: true });
  for (const pid of pids) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      try {
        process.kill(pid);
      } catch {
        /* 已退出 */
      }
    }
  }
  await new Promise((r) => setTimeout(r, 700)); // 等句柄释放
}

/** 清扫可能锁住目录的进程：pip 类 python 进程 + 命令行引用了该目录的工具进程。
 *  注：旧版 shell 启动残留的 cmd.exe 中间层命令行不含路径、无法精确识别，
 *  也不敢滥杀 cmd——交给 removeDir 的改名隔离兜底 */
async function sweepLockingProcesses(dir) {
  if (process.platform !== 'win32') return;
  const safeDir = String(dir).replace(/'/g, "''");
  try {
    const child = spawn(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='python.exe' or Name='python3.exe' or Name='pip.exe' or Name='node.exe' or Name='tar.exe'" | Where-Object { ($_.CommandLine -and $_.CommandLine.indexOf('${safeDir}') -ge 0) -or ($_.CommandLine -match 'pip(\\.exe)?($| )') -or ($_.CommandLine -match '-m pip') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ],
      { windowsHide: true, stdio: 'ignore' }
    );
    await new Promise((r) => child.on('close', () => r(null)));
  } catch {
    /* 清扫失败交由改名隔离兜底 */
  }
}

/** 删除旧种植目录：rmSync 重试 → 清扫占用进程再试 → 改名隔离兜底。
 *  Windows 下被进程 cwd/句柄锁定的目录无法删除但可以重命名——
 *  把锁死的旧目录改名旁路（.eco-stale-<ts>），残留进程持有旧句柄不碍事，
 *  新目录照常创建，任何历史残留进程都无法再阻断种植 */
async function removeDir(dir, id, mode) {
  const rm = (retries, delay) => {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: retries, retryDelay: delay });
      return true;
    } catch {
      return false;
    }
  };
  if (rm(5, 300)) return;
  emit({ id, stage: 'extract', mode, line: '旧目录被占用（EPERM），清理占用进程后重试…', stderr: true });
  await sweepLockingProcesses(dir);
  if (rm(5, 500)) return;
  const tomb = `${dir}.eco-stale-${Date.now()}`;
  try {
    fs.renameSync(dir, tomb);
    emit({ id, stage: 'extract', mode, line: `旧目录被残留进程锁定，已改名隔离：${path.basename(tomb)}（进程退出后会被自动清理）`, stderr: true });
  } catch {
    throw new Error(`种植目录被残留进程锁定且无法隔离：${dir}。请在任务管理器结束相关 python/cmd 进程（或重启电脑）后重试`);
  }
}

/** best-effort 清理历史改名隔离的孤儿目录（.eco-stale-*）；锁未释放则留待下次 */
function sweepStaleTombs(parentDir) {
  try {
    for (const name of fs.readdirSync(parentDir)) {
      if (name.includes('.eco-stale-')) {
        try {
          fs.rmSync(path.join(parentDir, name), { recursive: true, force: true });
        } catch {
          /* 锁未释放，留待下次 */
        }
      }
    }
  } catch {
    /* 父目录不可读则跳过 */
  }
}

/** 是否 pip 类命令 */
function isPip(cmd) {
  return cmd === 'pip' || cmd === 'pip3' || cmd === 'python -m pip' || cmd === 'py -m pip';
}

/** 执行一条 pip 步骤：国内网络默认走清华镜像（PySide6 等百 MB 大轮子直连官方源
 *  经代理易停滞卡死——socket 超时只管无数据间隙，慢速爬行永远不触发），
 *  镜像受阻再回退官方源，最后回退 manifest 原命令 */
async function runPipStep(cmd, args, dir, id, mode) {
  // 统一走 python -m pip：规避 WindowsApps pip 壳与环境差异，保证与启动用的 python 一致
  // 环境强制 UTF-8：requirements 文件的 UTF-8 中文注释在 GBK 区域下会令 pip 崩溃
  const env = { ...process.env, ...PYTHON_UTF8_ENV };
  const attempt = (extra) =>
    runCommand('python', ['-m', 'pip', ...args, '--timeout', '60', '--retries', '3', ...extra], dir, id, 'deps', env);
  try {
    await attempt(PIP_MIRROR_ARGS);
    return;
  } catch (err) {
    emit({ id, stage: 'deps', mode, line: `镜像受阻（${err.message}），改用官方源重试…`, stderr: true });
    try {
      await attempt([]);
    } catch {
      // 官方源也失败：回退 manifest 原命令（用户可能自带 pip 配置/代理）
      emit({ id, stage: 'deps', mode, line: '官方源亦受阻，回退项目声明的原始命令…', stderr: true });
      await runCommand(cmd, args, dir, id, 'deps', env);
    }
  }
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
  await removeDir(dir, id, mode); // 清理旧目录（含残留进程锁治理）
  fs.mkdirSync(dir, { recursive: true });
  sweepStaleTombs(path.dirname(dir)); // 顺手清理此前改名隔离的孤儿目录（锁已释放的话）
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
    if (isPip(cmd)) {
      emit({ id, stage: 'deps', mode, line: `$ python -m pip ${args.join(' ')}` });
      await runPipStep(cmd, args, dir, id, mode);
    } else {
      emit({ id, stage: 'deps', mode, line: `$ ${cmd} ${args.join(' ')}` });
      const env = cmd === 'npm' || cmd === 'pnpm' || cmd === 'yarn'
        ? { ...process.env, ...ELECTRON_MIRROR_ENV }
        : undefined;
      await runCommand(cmd, args, dir, id, 'deps', env);
    }
  }
  // npm 项目兜底：electron 二进制常因网络被墙缺失（npm install 显示成功但无法启动）
  await ensureElectronBinary(dir, id, mode);
  if (!steps.length) emit({ id, stage: 'deps', mode, line: '无需额外养分' });
}

/** 保障 npm 项目的 Electron 运行时：整包缺失则从镜像补装，仅 dist 缺失则补跑 install.js（幂等） */
async function ensureElectronBinary(dir, id, mode) {
  try {
    const nmElectron = path.join(dir, 'node_modules', 'electron');
    const hasPkg = await exists(path.join(nmElectron, 'package.json'));
    if (hasPkg) {
      if (await exists(path.join(nmElectron, 'dist'))) return; // 完好
      emit({ id, stage: 'deps', mode, line: '检测到 Electron 运行时缺失（安装期网络受阻），从镜像补种…', stderr: true });
      await runCommand('node', ['install.js'], nmElectron, id, 'deps', { ...process.env, ...ELECTRON_MIRROR_ENV });
    } else {
      // electron 整包缺失：从 package.json 取版本，单独补装（不写入 package.json）
      const pkgPath = path.join(dir, 'package.json');
      if (!await exists(pkgPath)) return;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const ver = (pkg.devDependencies && pkg.devDependencies.electron) || (pkg.dependencies && pkg.dependencies.electron);
      if (!ver) return; // 非 electron 项目
      emit({ id, stage: 'deps', mode, line: `检测到 Electron 依赖整体缺失（安装期网络受阻），从镜像补种 electron@${ver} …`, stderr: true });
      await runCommand('npm', ['install', '--no-save', `electron@${ver}`], dir, id, 'deps', { ...process.env, ...ELECTRON_MIRROR_ENV });
      if (!await exists(path.join(nmElectron, 'dist'))) {
        await runCommand('node', ['install.js'], nmElectron, id, 'deps', { ...process.env, ...ELECTRON_MIRROR_ENV });
      }
    }
    emit({ id, stage: 'deps', mode, line: 'Electron 运行时已就绪' });
  } catch (err) {
    emit({ id, stage: 'deps', mode, line: `Electron 运行时补种失败：${err.message}`, stderr: true });
    throw err;
  }
}

/* ---------- 种植 / 生长（更新） ---------- */
async function install(id, opts = {}) {
  const mode = opts.mode || 'install'; // 'install' | 'update'
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  const settings = store.getSettings();

  // 本地登记项目：无 release 管线，直接施肥
  if (project.source === 'local') {
    await killStaleDeps(id, mode); // 先清残留安装进程，避免文件被锁
    store.updateProject(id, { status: 'installing' });
    const manifest = readManifest(project.installPath);
    await stageDeps(project.installPath, manifest, id, mode);
    const done = store.updateProject(id, { status: 'installed' });
    emit({ id, stage: 'done', mode, line: '长大啦 ✓' });
    return done;
  }

  // 生长（更新）沿用原目录，不因路径规则调整而换位置留下残留
  const dir = (mode === 'update' && project.installPath) || resolveInstallDir(project, settings);
  store.updateProject(id, { status: 'installing' });
  emit({ id, stage: 'start', mode, line: mode === 'update' ? '生长开始…' : `种植目标: ${dir}` });
  try {
    await killStaleDeps(id, mode); // 先清残留安装进程：卡死的 pip 会锁住种植目录令 rmSync 报 EPERM
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
  // 自愈：npm/pnpm/yarn 启动的项目若 electron 二进制缺失（安装期网络受阻），先补种再启动
  if (['npm', 'pnpm', 'yarn'].includes(plan.cmd)) {
    try {
      await ensureElectronBinary(project.installPath, id, 'install');
    } catch {
      /* 补种失败照常尝试启动，错误会回流到观测日志 */
    }
  }
  const child = spawn(plan.cmd, plan.args, {
    cwd: project.installPath,
    shell: plan.shell || process.platform === 'win32',
    // Windows 下 detached 会令子进程新建自己的控制台窗口（windowsHide 拦不完全）；
    // 且 Windows 子进程本就随父进程退出后存活，detached 并无必要
    detached: process.platform !== 'win32',
    windowsHide: true, // 静默启动：不弹 cmd 窗口，输出仍回流到观测日志
    env: /^(python|py)\b/i.test(plan.cmd)
      ? { ...process.env, ...PYTHON_UTF8_ENV }
      : process.env, // Python 项目强制 UTF-8，规避 GBK 区域编码问题
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
    if (process.platform === 'win32' && child.pid) {
      // 树杀：连同 cmd → node/electron/python 子孙进程一并结束（未设 detached，无进程组可用）
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      try {
        process.kill(-child.pid);
      } catch {
        child.kill();
      }
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

/* ---------- 卸载（原「移出」）：文件进回收站可找回，条目保留可重种 ---------- */
async function uninstall(id) {
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  try {
    await stop(id);
  } catch {
    /* 未运行时忽略 */
  }
  // 本地登记项目：文件本就属于用户，仅取消登记，绝不动文件
  if (project.source === 'local') {
    store.removeProject(id);
    return { removed: true };
  }
  // GitHub 项目：种植目录送入回收站（可找回），条目保留回到未种植态
  if (project.installPath && fs.existsSync(project.installPath)) {
    await shell.trashItem(project.installPath);
  }
  store.updateProject(id, {
    status: 'not_installed',
    installPath: '',
    installDir: '',
    version: '',
    latestVersion: '',
    ignoredVersion: '',
  });
  return { removed: false };
}

/* ---------- 移植：手动迁移种植目录 ---------- */
async function transplant(id, targetParent) {
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  if (project.source === 'local') throw new Error('本地登记项目文件由您自行管理，不支持移植');
  if (!project.installPath || !fs.existsSync(project.installPath)) throw new Error('项目尚未种植，无法移植');
  if (!targetParent) throw new Error('未选择移植目标目录');

  const dst = path.join(targetParent, path.basename(project.installPath));
  if (dst === project.installPath) return store.getProject(id);
  if (fs.existsSync(dst)) throw new Error(`目标位置已存在同名目录：${dst}`);

  fs.mkdirSync(targetParent, { recursive: true });
  try {
    fs.renameSync(project.installPath, dst); // 同盘直接搬
  } catch {
    // 跨盘：复制到新址，原目录送回收站（可找回）
    await fs.promises.cp(project.installPath, dst, { recursive: true });
    await shell.trashItem(project.installPath);
  }
  return store.updateProject(id, { installDir: dst, installPath: dst });
}

/* ---------- 瑰丽花园：启动自选程序 ---------- */
async function launchFavorite(id) {
  const state = store.getState();
  const fav = state.favorites.find((f) => f.id === id);
  if (!fav) throw new Error('收藏不存在');
  if (!fav.launchPath) throw new Error('尚未选择启动地址，样本静待耕耘');
  const stat = fs.existsSync(fav.launchPath) ? fs.statSync(fav.launchPath) : null;
  if (stat && stat.isDirectory()) return shell.openPath(fav.launchPath);
  // 不设 detached：Windows 下会令子进程新建控制台窗口；不设 stdio:'ignore' 之外的流也无碍
  const child = spawn(fav.launchPath, [], { windowsHide: true, stdio: 'ignore' });
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
  uninstall,
  transplant,
  checkUpdates,
  launchFavorite,
  resolveInstallDir,
};
