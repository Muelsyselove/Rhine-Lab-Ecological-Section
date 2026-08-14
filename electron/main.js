// 莱茵生命生态科 ECO — 主进程入口
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const store = require('./services/store');
const github = require('./services/github');
const installer = require('./services/installer');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1024,
    minHeight: 660,
    frame: false,
    show: false,
    backgroundColor: '#e9f1ec',
    title: 'Rhine Lab · Ecological Section',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  installer.attach(win);
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  installer.stopAll();
  if (process.platform !== 'darwin') app.quit();
});

function registerIpc() {
  // 状态与设置
  ipcMain.handle('state:get', () => store.getState());
  ipcMain.handle('settings:save', (_e, patch) => store.saveSettings(patch));

  // 生态园：本人仓库拉取与项目导入
  ipcMain.handle('github:repos', () => github.fetchRepos(store.getSettings().github));
  ipcMain.handle('projects:import', (_e, repos, group) => store.importProjects(repos, group));
  ipcMain.handle('projects:add-local', async () => {
    const dir = await chooseDirectory();
    if (!dir) return null;
    return store.addLocalProject(dir);
  });
  ipcMain.handle('projects:update', (_e, id, patch) => store.updateProject(id, patch));
  ipcMain.handle('projects:remove', (_e, id) => store.removeProject(id));
  ipcMain.handle('projects:ignore-update', (_e, id) => {
    const p = store.getProject(id);
    if (!p) return null;
    return store.updateProject(id, { ignoredVersion: p.latestVersion });
  });

  // 种植 / 生长 / 观察
  ipcMain.handle('install:start', (_e, id) => installer.install(id, { mode: 'install' }));
  ipcMain.handle('update:start', (_e, id) => installer.install(id, { mode: 'update' }));
  ipcMain.handle('updates:check', () => installer.checkUpdates());
  ipcMain.handle('launch:start', (_e, id) => installer.launch(id));
  ipcMain.handle('launch:stop', (_e, id) => installer.stop(id));
  ipcMain.handle('folder:open', (_e, id) => installer.openFolder(id));

  // 瑰丽花园：收藏的他人项目
  ipcMain.handle('github:starred', () => github.fetchStarred(store.getSettings().github));
  ipcMain.handle('favorites:import', (_e, repos) => store.importFavorites(repos));
  ipcMain.handle('favorites:remove', (_e, id) => store.removeFavorite(id));
  ipcMain.handle('favorites:set-launch', async (_e, id) => {
    const file = await chooseFile();
    if (!file) return null;
    return store.updateFavorite(id, { launchPath: file });
  });
  ipcMain.handle('favorites:launch', (_e, id) => installer.launchFavorite(id));

  // 系统交互
  ipcMain.handle('dialog:choose-dir', () => chooseDirectory());
  ipcMain.handle('dialog:choose-file', () => chooseFile());
  ipcMain.handle('shell:open', (_e, url) => shell.openExternal(url));

  // 无边框窗口控制
  ipcMain.handle('win:min', () => win.minimize());
  ipcMain.handle('win:max', () => (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.handle('win:close', () => win.close());
}

async function chooseDirectory() {
  const result = await dialog.showOpenDialog(win, {
    title: '选择目录 · Select Directory',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
}

async function chooseFile() {
  const result = await dialog.showOpenDialog(win, {
    title: '选择启动程序 · Select Executable',
    properties: ['openFile'],
  });
  return result.canceled ? null : result.filePaths[0];
}
