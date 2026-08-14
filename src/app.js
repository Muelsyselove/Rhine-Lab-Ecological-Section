/* ECO 应用装配 — 连接桥接层、页面组件与事件流 */
(function () {
  const bridge = window.eco;

  const state = {
    settings: {},
    projects: [],
    repos: null,
    reposLoading: false,
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
  bridge.onProgress(({ id, stage, line, percent, stderr }) => {
    if (line) page.appendLog(id, { line, stderr: !!stderr });
    page.setProgress(id, { stage, line, percent });
    if (stage === 'done' || stage === 'error' || stage === 'exit') refresh();
  });

  /* ---------- 卡片与详情动作 ---------- */
  page.addEventListener(
    'card-action',
    guard(async ({ id, action }) => {
      switch (action) {
        case 'install': {
          refresh(); // 先同步「培植中」状态
          bridge
            .installProject(id)
            .then(() => ECO.toast('定植完成，样本已就绪', 'ok'))
            .catch((err) => ECO.toast(`定植失败：${err.message || err}`, 'error'))
            .finally(refresh);
          break;
        }
        case 'launch':
          await bridge.launchProject(id);
          ECO.toast('样本已孵化，开始生长', 'ok');
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
          ECO.toast('样本已移出培育舱', 'ok');
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

  /* ---------- 启动 ---------- */
  refresh();
})();
