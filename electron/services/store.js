// 持久化存储 — 用户配置、生态园项目、瑰丽花园收藏，JSON 原子写入
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { app } = require('electron');
const { CATALOG } = require('./catalog');

let cache = null;

function storeFile() {
  return path.join(app.getPath('userData'), 'eco-store.json');
}

function defaults() {
  return {
    settings: {
      rootDir: path.join(app.getPath('documents'), 'ECO'),
      useRootDir: true,
      autoUpdate: true,
    },
    projects: [],
    favorites: [],
  };
}

function load() {
  if (cache) return cache;
  const def = defaults();
  try {
    const raw = fs.readFileSync(storeFile(), 'utf8').replace(/^\uFEFF/, ''); // 容错 UTF-8 BOM
    const saved = JSON.parse(raw);
    cache = {
      // 逐键合并：升级/迁移永不重置用户已保存的配置；缺失项才回退默认值
      settings: { ...def.settings, ...(saved.settings || {}) },
      projects: Array.isArray(saved.projects) ? saved.projects : [],
      favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
    };
    // 剔除历史版本遗留的 github 凭据字段（启动器已全部匿名化）
    delete cache.settings.github;
    // 根目录不允许为空（空值会让定植路径失效）
    if (!cache.settings.rootDir) cache.settings.rootDir = def.settings.rootDir;
  } catch {
    cache = def;
  }
  // 按内置目录增量播种：每次启动补齐目录中缺失的项目（升级新增项目可自动出现）
  if (seedCatalog(cache)) persist();
  return cache;
}

/** 补齐内置目录中尚未入园的项目；返回是否有新增 */
function seedCatalog(state) {
  const existing = new Set(state.projects.map((p) => p.repo));
  let added = false;
  for (const item of CATALOG) {
    if (existing.has(item.repo)) continue;
    state.projects.push({
      id: crypto.randomUUID(),
      name: item.name,
      repo: item.repo,
      repoUrl: `https://github.com/${item.repo}`,
      description: item.description,
      language: item.language || '',
      stars: 0,
      branch: 'main',
      group: item.group || '我的项目',
      installDir: '',
      launchCmd: '',
      source: 'github',
      status: 'not_installed',
      installPath: '',
      version: '',
      latestVersion: '',
      ignoredVersion: '',
      addedAt: Date.now(),
    });
    added = true;
  }
  return added;
}

function persist() {
  const file = storeFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function getState() {
  return load();
}

function getSettings() {
  return load().settings;
}

function saveSettings(patch) {
  const state = load();
  const next = { ...state.settings, ...patch };
  // 空根目录视为误输入，保留原值
  if (!next.rootDir) next.rootDir = state.settings.rootDir;
  state.settings = next;
  persist();
  return state.settings;
}

/* ---------- 生态园（本人项目，来自内置目录） ---------- */

function getProject(id) {
  return load().projects.find((p) => p.id === id) || null;
}

function addLocalProject(dir) {
  const state = load();
  const project = {
    id: crypto.randomUUID(),
    name: path.basename(dir),
    repo: '',
    repoUrl: '',
    description: '本地登记项目 · Local specimen',
    language: '',
    stars: 0,
    branch: '',
    group: '本地样本',
    installDir: dir,
    launchCmd: '',
    source: 'local',
    status: 'installed',
    installPath: dir,
    version: '',
    latestVersion: '',
    ignoredVersion: '',
    addedAt: Date.now(),
  };
  state.projects.push(project);
  persist();
  return project;
}

function updateProject(id, patch) {
  const state = load();
  const project = state.projects.find((p) => p.id === id);
  if (!project) throw new Error(`项目不存在: ${id}`);
  Object.assign(project, patch);
  persist();
  return project;
}

function removeProject(id) {
  const state = load();
  state.projects = state.projects.filter((p) => p.id !== id);
  persist();
  return true;
}

/* ---------- 瑰丽花园（收藏的他人项目） ---------- */

function importFavorites(repos) {
  const state = load();
  const existing = new Set(state.favorites.map((f) => f.repo));
  const imported = [];
  for (const repo of repos) {
    if (existing.has(repo.full_name)) continue;
    const fav = {
      id: crypto.randomUUID(),
      name: repo.name,
      repo: repo.full_name,
      repoUrl: repo.html_url,
      description: repo.description || '',
      language: repo.language || '',
      stars: repo.stargazers_count || 0,
      owner: repo.owner || repo.full_name.split('/')[0] || '',
      launchPath: '',
      addedAt: Date.now(),
    };
    state.favorites.push(fav);
    imported.push(fav);
  }
  persist();
  return imported;
}

function updateFavorite(id, patch) {
  const state = load();
  const fav = state.favorites.find((f) => f.id === id);
  if (!fav) throw new Error(`收藏不存在: ${id}`);
  Object.assign(fav, patch);
  persist();
  return fav;
}

function removeFavorite(id) {
  const state = load();
  state.favorites = state.favorites.filter((f) => f.id !== id);
  persist();
  return true;
}

module.exports = {
  getState,
  getSettings,
  saveSettings,
  getProject,
  addLocalProject,
  updateProject,
  removeProject,
  importFavorites,
  updateFavorite,
  removeFavorite,
};
