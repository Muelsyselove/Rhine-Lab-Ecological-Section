/* ECO 桥接层 — Electron 预加载注入 window.eco 时直接使用；
   否则注入带模拟时序的 Mock 实现，供浏览器预览与组件开发调试 */
(function () {
  if (window.eco) return; // 真实 Electron 环境

  const LS_KEY = 'eco-mock-state-v2';
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const listeners = new Set();
  const clone = (v) => JSON.parse(JSON.stringify(v));

  function seedState() {
    return {
      settings: {
        rootDir: 'D:/ECO',
        useRootDir: true,
        autoUpdate: true,
        github: { username: 'muelsyse', token: '' },
      },
      projects: clone(window.ECO_MOCK.projects),
      favorites: clone(window.ECO_MOCK.favorites),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.projects) && Array.isArray(parsed.favorites)) return parsed;
      }
    } catch {
      /* 忽略损坏数据 */
    }
    const seeded = seedState();
    localStorage.setItem(LS_KEY, JSON.stringify(seeded));
    return seeded;
  }

  let state = loadState();
  const persist = () => localStorage.setItem(LS_KEY, JSON.stringify(state));
  const emit = (payload) => listeners.forEach((cb) => cb(payload));
  const findProject = (id) => state.projects.find((x) => x.id === id);
  const findFavorite = (id) => state.favorites.find((x) => x.id === id);
  const mockReleaseTag = (repo) => (window.ECO_MOCK.releases || {})[repo] || 'v1.0.0';

  /* 模拟种植管线：松土 → 播种 → 浇水 → 施肥 → 长大啦 */
  async function runPipeline(p, mode) {
    const id = p.id;
    const dir = p.installDir || `${state.settings.rootDir}/${p.group}/${p.name}`;
    const tag = mockReleaseTag(p.repo);
    const say = (stage, line, percent) => emit({ id, stage, mode, line, percent });
    const step = (ms) => delay(ms + Math.random() * 260);

    p.status = 'installing';
    persist();

    // 松土
    say('connect', `连接至 ${p.repo} …`);
    await step(500);
    say('connect', `发现版本 ${tag} · 资产 ${p.name}-${tag}-eco.tar.gz`);

    // 播种
    say('download', `播种: ${p.name}-${tag}-eco.tar.gz`, 0);
    for (let pc = 12; pc <= 100; pc += 11) {
      await step(200);
      say('download', pc === 100 ? '播种完成 · 3.8 MiB' : null, Math.min(pc, 100));
    }

    // 浇水
    say('extract', `浇水至 ${dir}`);
    await step(420);
    say('extract', '根系已舒展');

    // 施肥
    say('deps', '按 eco-manifest.json 施肥');
    await step(300);
    say('deps', '$ npm install');
    await step(650);
    say('deps', 'added 128 packages in 4s · found 0 vulnerabilities');

    // 长大啦
    p.status = 'installed';
    p.installPath = dir;
    p.version = tag;
    p.latestVersion = tag;
    p.ignoredVersion = '';
    persist();
    emit({ id, stage: 'done', mode, line: '长大啦 ✓' });
    return p;
  }

  window.eco = {
    isMock: true,

    /* ---------- 状态与设置 ---------- */
    async getState() {
      await delay(80);
      return clone(state);
    },

    async saveSettings(patch) {
      await delay(120);
      state.settings = { ...state.settings, ...patch, github: { ...state.settings.github, ...(patch.github || {}) } };
      persist();
      return state.settings;
    },

    /* ---------- 生态园：仓库接入 ---------- */
    async fetchGithubRepos() {
      await delay(1100);
      return clone(window.ECO_MOCK.repos);
    },

    async importProjects(repos, group) {
      await delay(200);
      const existing = new Set(state.projects.map((p) => p.repo));
      const imported = [];
      for (const repo of repos) {
        if (existing.has(repo.full_name)) continue;
        const project = {
          id: 'mock-' + Math.random().toString(36).slice(2, 8),
          name: repo.name, repo: repo.full_name, repoUrl: repo.html_url,
          description: repo.description || '', language: repo.language || '',
          stars: repo.stargazers_count || 0, branch: repo.default_branch || 'main',
          group: group || '未分组', installDir: '', launchCmd: '', source: 'github',
          status: 'not_installed', installPath: '',
          version: '', latestVersion: '', ignoredVersion: '', addedAt: Date.now(),
        };
        state.projects.push(project);
        imported.push(project);
      }
      persist();
      return imported;
    },

    async addLocalProject() {
      await delay(250);
      const project = {
        id: 'mock-local-' + Math.random().toString(36).slice(2, 6),
        name: 'local-specimen-' + Math.floor(Math.random() * 90 + 10),
        repo: '', repoUrl: '', description: '本地登记项目 · Local specimen',
        language: '', stars: 0, branch: '', group: '本地样本',
        installDir: 'D:/Specimens/local', launchCmd: '', source: 'local',
        status: 'installed', installPath: 'D:/Specimens/local',
        version: '', latestVersion: '', ignoredVersion: '', addedAt: Date.now(),
      };
      state.projects.push(project);
      persist();
      return project;
    },

    async updateProject(id, patch) {
      const p = findProject(id);
      if (p) Object.assign(p, patch);
      persist();
      return p;
    },

    async removeProject(id) {
      state.projects = state.projects.filter((x) => x.id !== id);
      persist();
      return true;
    },

    async ignoreUpdate(id) {
      const p = findProject(id);
      if (p) p.ignoredVersion = p.latestVersion;
      persist();
      return p;
    },

    /* ---------- 种植 / 生长 / 观察 ---------- */
    async installProject(id) {
      const p = findProject(id);
      if (!p) throw new Error('项目不存在');
      return runPipeline(p, 'install');
    },

    async updateProjectRelease(id) {
      const p = findProject(id);
      if (!p) throw new Error('项目不存在');
      return runPipeline(p, 'update');
    },

    async checkUpdates() {
      await delay(700);
      const results = [];
      for (const p of state.projects) {
        if (p.source !== 'github' || p.status === 'not_installed' || !p.repo) continue;
        const latest = mockReleaseTag(p.repo);
        p.latestVersion = latest;
        results.push({
          id: p.id,
          latest,
          hasUpdate: !!(p.version && latest !== p.version && latest !== p.ignoredVersion),
        });
      }
      persist();
      return results;
    },

    async launchProject(id) {
      const p = findProject(id);
      if (!p) throw new Error('项目不存在');
      if (p.status !== 'installed' && p.status !== 'error') throw new Error('项目尚未种植，无法观察');
      await delay(200);
      p.status = 'running';
      persist();
      emit({ id, stage: 'launch', line: '$ npm run start' });
      emit({ id, stage: 'run', line: '> 观察开始，样本活动中 (mock)' });
      return p;
    },

    async stopProject(id) {
      const p = findProject(id);
      if (p) p.status = 'installed';
      persist();
      emit({ id, stage: 'exit', line: '观察结束，样本休眠' });
      return p;
    },

    async openProjectFolder() {
      await delay(60);
      return '';
    },

    /* ---------- 瑰丽花园：星标收藏 ---------- */
    async fetchStarredRepos() {
      await delay(900);
      return clone(window.ECO_MOCK.starred);
    },

    async importFavorites(repos) {
      await delay(200);
      const existing = new Set(state.favorites.map((f) => f.repo));
      const imported = [];
      for (const repo of repos) {
        if (existing.has(repo.full_name)) continue;
        const fav = {
          id: 'fav-' + Math.random().toString(36).slice(2, 8),
          name: repo.name, repo: repo.full_name, repoUrl: repo.html_url,
          description: repo.description || '', language: repo.language || '',
          stars: repo.stargazers_count || 0,
          owner: repo.owner || repo.full_name.split('/')[0] || '',
          launchPath: '', addedAt: Date.now(),
        };
        state.favorites.push(fav);
        imported.push(fav);
      }
      persist();
      return imported;
    },

    async removeFavorite(id) {
      state.favorites = state.favorites.filter((x) => x.id !== id);
      persist();
      return true;
    },

    async setFavoriteLaunch(id) {
      const fav = findFavorite(id);
      if (!fav) throw new Error('收藏不存在');
      await delay(300);
      fav.launchPath = `D:/Games/${fav.name}/start.exe`;
      persist();
      return fav;
    },

    async launchFavorite(id) {
      const fav = findFavorite(id);
      if (!fav) throw new Error('收藏不存在');
      if (!fav.launchPath) throw new Error('尚未选择启动地址，样本静待耕耘');
      await delay(150);
      return fav;
    },

    /* ---------- 系统 ---------- */
    async chooseDirectory() {
      await delay(300);
      return 'D:/ECO/自定义目录';
    },

    async chooseFile() {
      await delay(300);
      return 'D:/Specimens/start.exe';
    },

    async openExternal(url) {
      window.open(url, '_blank', 'noopener');
    },

    minimize() {},
    toggleMaximize() {},
    closeWindow() {},

    onProgress(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
})();
