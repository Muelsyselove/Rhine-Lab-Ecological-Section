// 持久化存储 — 用户配置、生态园项目、瑰丽花园收藏，JSON 原子写入
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { app } = require('electron');

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
      github: { username: '', token: '' },
    },
    projects: [],
    favorites: [],
  };
}

function load() {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(storeFile(), 'utf8');
    cache = Object.assign(defaults(), JSON.parse(raw));
  } catch {
    cache = defaults();
  }
  return cache;
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
  state.settings = { ...state.settings, ...patch, github: { ...state.settings.github, ...(patch.github || {}) } };
  persist();
  return state.settings;
}

/* ---------- 生态园（本人项目） ---------- */

function getProject(id) {
  return load().projects.find((p) => p.id === id) || null;
}

function importProjects(repos, group) {
  const state = load();
  const existing = new Set(state.projects.map((p) => p.repo));
  const imported = [];
  for (const repo of repos) {
    if (existing.has(repo.full_name)) continue;
    const project = {
      id: crypto.randomUUID(),
      name: repo.name,
      repo: repo.full_name,
      repoUrl: repo.html_url,
      description: repo.description || '',
      language: repo.language || '',
      stars: repo.stargazers_count || 0,
      branch: repo.default_branch || 'main',
      group: group || '未分组',
      installDir: '',
      launchCmd: '',
      source: 'github',
      status: 'not_installed',
      installPath: '',
      version: '',
      latestVersion: '',
      ignoredVersion: '',
      addedAt: Date.now(),
    };
    state.projects.push(project);
    imported.push(project);
  }
  persist();
  return imported;
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
  importProjects,
  addLocalProject,
  updateProject,
  removeProject,
  importFavorites,
  updateFavorite,
  removeFavorite,
};
