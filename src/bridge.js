/* ECO 桥接层 — Electron 预加载注入 window.eco 时直接使用；
   否则注入带模拟时序的 Mock 实现，供浏览器预览与组件开发调试 */
(function () {
  if (window.eco) return; // 真实 Electron 环境

  const LS_KEY = 'eco-mock-state-v1';
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const listeners = new Set();

  function seedState() {
    return {
      settings: {
        rootDir: 'D:/ECO',
        useRootDir: true,
        github: { username: 'muelsyse', token: '' },
      },
      projects: JSON.parse(JSON.stringify(window.ECO_MOCK.projects)),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
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

  const CLONE_LINES = [
    "Cloning into '{dir}'…",
    'remote: Enumerating objects: 486, done.',
    'remote: Counting objects: 100% (486/486), done.',
    'Receiving objects: 100% (486/486), 1.24 MiB | 3.10 MiB/s, done.',
    'Resolving deltas: 100% (210/210), done.',
  ];
  const DEPS_LINES = [
    '$ npm install',
    'added 128 packages, and audited 129 packages in 6s',
    '21 packages are looking for funding',
    'found 0 vulnerabilities',
  ];

  window.eco = {
    isMock: true,

    async getState() {
      await delay(80);
      return JSON.parse(JSON.stringify(state));
    },

    async saveSettings(patch) {
      await delay(120);
      state.settings = { ...state.settings, ...patch, github: { ...state.settings.github, ...(patch.github || {}) } };
      persist();
      return state.settings;
    },

    async fetchGithubRepos() {
      await delay(1100);
      return JSON.parse(JSON.stringify(window.ECO_MOCK.repos));
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
          status: 'not_installed', installPath: '', addedAt: Date.now(),
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
        status: 'installed', installPath: 'D:/Specimens/local', addedAt: Date.now(),
      };
      state.projects.push(project);
      persist();
      return project;
    },

    async updateProject(id, patch) {
      const p = state.projects.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
      persist();
      return p;
    },

    async removeProject(id) {
      state.projects = state.projects.filter((x) => x.id !== id);
      persist();
      return true;
    },

    async chooseDirectory() {
      await delay(300);
      return 'D:/ECO/自定义目录';
    },

    async installProject(id) {
      const p = state.projects.find((x) => x.id === id);
      if (!p) throw new Error('项目不存在');
      const dir = p.installDir || `${state.settings.rootDir}/${p.group}/${p.name}`;
      p.status = 'installing';
      p.installPath = dir;
      persist();

      const runLines = async (lines, stage, base, span) => {
        for (let i = 0; i < lines.length; i += 1) {
          await delay(280 + Math.random() * 320);
          emit({ id, stage, line: lines[i].replace('{dir}', dir), percent: Math.round(base + ((i + 1) / lines.length) * span) });
        }
      };
      try {
        await runLines(CLONE_LINES, 'clone', 0, 55);
        await runLines(DEPS_LINES, 'deps', 55, 40);
        p.status = 'installed';
        persist();
        emit({ id, stage: 'done', line: '定植完成 ✓', percent: 100 });
        return p;
      } catch (err) {
        p.status = 'error';
        persist();
        emit({ id, stage: 'error', line: String(err) });
        throw err;
      }
    },

    async launchProject(id) {
      const p = state.projects.find((x) => x.id === id);
      if (!p) throw new Error('项目不存在');
      if (p.status !== 'installed' && p.status !== 'error') throw new Error('项目尚未定植');
      await delay(200);
      p.status = 'running';
      persist();
      emit({ id, stage: 'launch', line: '$ npm run start' });
      emit({ id, stage: 'run', line: '> 进程已孵化，生长中 (mock)' });
      return p;
    },

    async stopProject(id) {
      const p = state.projects.find((x) => x.id === id);
      if (p) p.status = 'installed';
      persist();
      emit({ id, stage: 'exit', line: '进程已退出' });
      return p;
    },

    async openProjectFolder() {
      await delay(60);
      return '';
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
