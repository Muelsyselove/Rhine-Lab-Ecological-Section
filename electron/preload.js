// 预加载脚本 — 通过 contextBridge 暴露安全 IPC 接口
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('eco', {
  // 状态
  getState: () => invoke('state:get'),
  saveSettings: (patch) => invoke('settings:save', patch),

  // 生态园（本人项目）
  fetchGithubRepos: () => invoke('github:repos'),
  importProjects: (repos, group) => invoke('projects:import', repos, group),
  addLocalProject: () => invoke('projects:add-local'),
  updateProject: (id, patch) => invoke('projects:update', id, patch),
  removeProject: (id) => invoke('projects:remove', id),
  ignoreUpdate: (id) => invoke('projects:ignore-update', id),

  // 种植 / 生长 / 观察
  installProject: (id) => invoke('install:start', id),
  updateProjectRelease: (id) => invoke('update:start', id),
  checkUpdates: () => invoke('updates:check'),
  launchProject: (id) => invoke('launch:start', id),
  stopProject: (id) => invoke('launch:stop', id),
  openProjectFolder: (id) => invoke('folder:open', id),

  // 瑰丽花园（收藏的他人项目）
  fetchStarredRepos: () => invoke('github:starred'),
  importFavorites: (repos) => invoke('favorites:import', repos),
  removeFavorite: (id) => invoke('favorites:remove', id),
  setFavoriteLaunch: (id) => invoke('favorites:set-launch', id),
  launchFavorite: (id) => invoke('favorites:launch', id),

  // 系统
  chooseDirectory: () => invoke('dialog:choose-dir'),
  chooseFile: () => invoke('dialog:choose-file'),
  openExternal: (url) => invoke('shell:open', url),
  minimize: () => invoke('win:min'),
  toggleMaximize: () => invoke('win:max'),
  closeWindow: () => invoke('win:close'),

  // 进度事件订阅，返回取消订阅函数
  onProgress: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('eco:progress', handler);
    return () => ipcRenderer.removeListener('eco:progress', handler);
  },
});
