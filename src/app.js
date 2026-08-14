/* ECO 应用装配 — 连接桥接层、页面组件与事件流 */
(function () {
  const bridge = window.eco;

  const state = {
    settings: {},
    projects: [],
    favorites: [],
    repos: null,
    reposLoading: false,
    starred: null,
    starredLoading: false,
    online: !bridge.isMock,
  };

  const page = document.createElement('launcher-page');
  document.getElementById('app').appendChild(page);

  function sync() {
    page.state = { ...state };
  }

  async function refresh() {
    const s = await bridge.getState();
    state.settings = s.settings;
    state.projects = s.projects;
    state.favorites = s.favorites || [];
    sync();
  }

  /** 错误守卫：统一 toast 报错 */
  const guard = (fn) => async (e) => {
    try {
      await fn(e.detail || {});
    } catch (err) {
      ECO.toast(err && err.message ? err.message : String(err), 'error');
    }
  };

  /* ---------- 进度与日志事件流 ---------- */
  bridge.onProgress(({ id, stage, mode, line, percent, stderr }) => {
    if (line) page.appendLog(id, { line, stderr: !!stderr });
    if (stage === 'done') {
      // 长大啦：停留 2s 后恢复常态
      page.setProgress(id, { stage: 'grown', mode });
      refresh();
      setTimeout(() => {
        page.setProgress(id, null);
        refresh();
      }, 2000);
      return;
    }
    page.setProgress(id, { stage, mode, line, percent });
    if (stage === 'error' || stage === 'exit') refresh();
  });

  /* ---------- 卡片与详情动作 ---------- */
  page.addEventListener(
    'card-action',
    guard(async ({ id, action }) => {
      switch (action) {
        case 'install': {
          refresh(); // 先同步「培育中」状态
          bridge
            .installProject(id)
            .then(() => ECO.toast('种植完成，样本已长成', 'ok'))
            .catch((err) => ECO.toast(`种植失败：${err.message || err}`, 'error'))
            .finally(refresh);
          break;
        }
        case 'update': {
          refresh();
          bridge
            .updateProjectRelease(id)
            .then(() => ECO.toast('生长完成，已至最新版本', 'ok'))
            .catch((err) => ECO.toast(`生长受阻：${err.message || err}`, 'error'))
            .finally(refresh);
          break;
        }
        case 'ignore-update':
          await bridge.ignoreUpdate(id);
          ECO.toast('这样就够了，已忽略此次来信', 'ok');
          await refresh();
          break;
        case 'launch':
          await bridge.launchProject(id);
          ECO.toast('观察开始，样本活动中', 'ok');
          await refresh();
          break;
        case 'stop':
          await bridge.stopProject(id);
          await refresh();
          break;
        case 'open-folder':
          await bridge.openProjectFolder(id);
          break;
        case 'remove':
          await bridge.removeProject(id);
          ECO.toast('样本已移出生态园', 'ok');
          await refresh();
          break;
        default:
          break;
      }
    })
  );

  page.addEventListener(
    'save-project',
    guard(async ({ id, patch }) => {
      await bridge.updateProject(id, patch);
      ECO.toast('样本配置已保存', 'ok');
      await refresh();
    })
  );

  page.addEventListener(
    'browse-dir',
    guard(async () => {
      const dir = await bridge.chooseDirectory();
      if (dir) {
        const detail = page.shadowRoot.querySelector('eco-project-detail');
        if (detail) detail.setInstallDir(dir);
      }
    })
  );

  page.addEventListener('open-repo', (e) => bridge.openExternal(e.detail.url));

  /* ---------- 瑰丽花园：收藏 / 跳转 / 自选启动 ---------- */
  page.addEventListener(
    'fetch-starred',
    guard(async () => {
      state.starredLoading = true;
      if (page.activeNav !== 'garden') page.activeNav = 'garden';
      sync();
      try {
        state.starred = await bridge.fetchStarredRepos();
      } finally {
        state.starredLoading = false;
        sync();
      }
    })
  );

  page.addEventListener(
    'import-favorites',
    guard(async ({ repos }) => {
      const imported = await bridge.importFavorites(repos);
      ECO.toast(`已移栽 ${imported.length} 株至瑰丽花园`, 'ok');
      state.starred = null;
      await refresh();
    })
  );

  page.addEventListener(
    'fav-action',
    guard(async ({ id, action }) => {
      const fav = state.favorites.find((f) => f.id === id);
      if (!fav) return;
      switch (action) {
        case 'jump':
          await bridge.openExternal(fav.repoUrl);
          break;
        case 'set-launch': {
          const updated = await bridge.setFavoriteLaunch(id);
          if (updated) {
            ECO.toast('启动地址已记录，花卉可观察', 'ok');
            await refresh();
          }
          break;
        }
        case 'observe':
          await bridge.launchFavorite(id);
          ECO.toast(`观察开始 · ${fav.name}`, 'ok');
          break;
        case 'remove':
          await bridge.removeFavorite(id);
          ECO.toast('已移出瑰丽花园', 'ok');
          await refresh();
          break;
        default:
          break;
      }
    })
  );

  /* ---------- 仓库接入 ---------- */
  page.addEventListener(
    'fetch-repos',
    guard(async () => {
      state.reposLoading = true;
      sync();
      try {
        state.repos = await bridge.fetchGithubRepos();
      } finally {
        state.reposLoading = false;
        sync();
      }
    })
  );

  page.addEventListener(
    'import-repos',
    guard(async ({ repos }) => {
      const imported = await bridge.importProjects(repos, page.activeGroup || undefined);
      ECO.toast(`已导入 ${imported.length} 份样本`, 'ok');
      page.activeNav = 'launcher';
      await refresh();
    })
  );

  page.addEventListener(
    'add-local',
    guard(async () => {
      const project = await bridge.addLocalProject();
      if (project) {
        ECO.toast(`已登记本地样本「${project.name}」`, 'ok');
        await refresh();
      }
    })
  );

  /* ---------- 设置 ---------- */
  page.addEventListener(
    'save-settings',
    guard(async ({ patch }) => {
      state.settings = await bridge.saveSettings(patch);
      sync();
      ECO.toast('配置已保存', 'ok');
    })
  );

  page.addEventListener(
    'browse-root',
    guard(async () => {
      const dir = await bridge.chooseDirectory();
      if (dir) {
        const panel = page.shadowRoot.querySelector('eco-settings-panel');
        if (panel) panel.setRootDir(dir);
      }
    })
  );

  /* ---------- 启动：先同步状态，再按设置接收远方来信 ---------- */
  async function boot() {
    await refresh();
    if (!state.settings.autoUpdate || typeof bridge.checkUpdates !== 'function') return;
    try {
      const results = await bridge.checkUpdates();
      const letters = (results || []).filter((r) => r.hasUpdate).length;
      await refresh();
      if (letters) ECO.toast(`收到 ${letters} 封远方来信，前往生态园查收`, 'ok');
    } catch {
      /* 来信失败静默，不影响启动 */
    }
  }
  boot();
})();
