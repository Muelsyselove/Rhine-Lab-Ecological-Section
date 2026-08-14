// 安装器 — 克隆仓库、装配依赖、启动与停止项目
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { shell } = require('electron');
const store = require('./store');

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

// 检测包管理器：pnpm-lock > yarn.lock > npm
function detectPm(dir) {
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(dir, 'yarn.lock'))) return 'yarn';
  return 'npm';
}

async function installDeps(dir, id) {
  const steps = [];
  if (await exists(path.join(dir, 'package.json'))) {
    const pm = detectPm(dir);
    steps.push([pm, ['install']]);
  }
  if (await exists(path.join(dir, 'requirements.txt'))) {
    steps.push(['pip', ['install', '-r', 'requirements.txt']]);
  }
  for (const [cmd, args] of steps) {
    emit({ id, stage: 'deps', line: `$ ${cmd} ${args.join(' ')}` });
    await runCommand(cmd, args, dir, id, 'deps');
  }
}

async function install(id) {
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  const settings = store.getSettings();
  const dir = resolveInstallDir(project, settings);

  store.updateProject(id, { status: 'installing', installPath: dir });
  emit({ id, stage: 'start', line: `定植目标: ${dir}` });
  try {
    if (project.repoUrl && !(await exists(path.join(dir, '.git')))) {
      fs.mkdirSync(path.dirname(dir), { recursive: true });
      const args = ['clone', '--depth', '1'];
      if (project.branch) args.push('--branch', project.branch);
      args.push(project.repoUrl, dir);
      emit({ id, stage: 'clone', line: `$ git ${args.join(' ')}` });
      await runCommand('git', args, settings.rootDir, id, 'clone');
    } else {
      emit({ id, stage: 'clone', line: '目录已存在，跳过克隆' });
    }
    await installDeps(dir, id);
    const updated = store.updateProject(id, { status: 'installed' });
    emit({ id, stage: 'done', line: '定植完成 ✓' });
    return updated;
  } catch (err) {
    store.updateProject(id, { status: 'error' });
    emit({ id, stage: 'error', line: String(err.message || err) });
    throw err;
  }
}

// 解析启动命令：自定义 launchCmd > package.json scripts.start/dev
function resolveLaunch(project) {
  const dir = project.installPath;
  if (project.launchCmd) return { cmd: project.launchCmd, args: [], shell: true };
  const pkgFile = path.join(dir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
    const pm = detectPm(dir);
    if (pkg.scripts && pkg.scripts.start) return { cmd: pm, args: ['run', 'start'] };
    if (pkg.scripts && pkg.scripts.dev) return { cmd: pm, args: ['run', 'dev'] };
  }
  return null;
}

async function launch(id) {
  const project = store.getProject(id);
  if (!project) throw new Error('项目不存在');
  if (running.has(id)) return store.getProject(id);
  if (project.status !== 'installed' && project.status !== 'error') {
    throw new Error('项目尚未定植，无法启动');
  }
  const plan = resolveLaunch(project);
  if (!plan) throw new Error('未找到启动方式，请在项目详情中配置启动命令');

  emit({ id, stage: 'launch', line: `$ ${plan.cmd} ${plan.args.join(' ')}` });
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
    emit({ id, stage: 'exit', line: '进程已退出' });
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
  if (!project || !project.installPath) throw new Error('尚无安装目录');
  return shell.openPath(project.installPath);
}

module.exports = { attach, install, launch, stop, stopAll, openFolder, resolveInstallDir };
