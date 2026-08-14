/* launcher-page — 主页面：标题栏 / 侧边栏 / 生态园·瑰丽花园·设置视图 / 状态栏 / 观测窗
   property: state { settings, projects, favorites, appVersion, starred, starredLoading }
   method: setProgress(id, info) / appendLog(id, entry) / openDetail(id) / closeDetail()
   上行事件: card-action / fav-action / save-settings / browse-root / request-uninstall /
            fetch-starred / import-favorites / add-local /
            save-project / browse-dir / open-repo */
(function () {
  const NAV_ITEMS = [
    { id: 'launcher', label: '生态园', en: 'ECO GARDEN', icon: 'sprout' },
    { id: 'garden', label: '瑰丽花园', en: 'ROSE GARDEN', icon: 'flower' },
    { id: 'settings', label: '设置', en: 'CONFIG', icon: 'gear' },
  ];

  const FILTERS = [
    { value: 'all', label: '全部 ALL' },
    { value: 'not_installed', label: '未种植' },
    { value: 'installed', label: '已长成' },
    { value: 'running', label: '观察中' },
  ];

  const CRUMBS = {
    launcher: 'ECO // 生态园 // ECOLOGICAL GARDEN',
    garden: 'ECO // 瑰丽花园 // ROSE GARDEN',
    settings: 'ECO // 设置 // SECTION CONFIG',
  };

  class LauncherPage extends ECO.EcoElement {
    constructor() {
      super();
      this.activeNav = 'launcher';
      this.activeGroup = '';
      this.search = '';
      this.filterValue = 'all';
      this.selectedId = null;
      this.progressById = {};
      this.logsById = {};
    }

    set state(s) {
      this._state = s || { settings: {}, projects: [] };
      if (this.isConnected) this.render();
    }
    get state() {
      return this._state || { settings: {}, projects: [] };
    }

    connectedCallback() {
      this.render();
      this.wireGlobal();
      this._clock = setInterval(() => {
        const el = this.shadowRoot && this.shadowRoot.querySelector('.clock');
        if (el) el.textContent = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      }, 1000);
    }

    /** shadowRoot 级委托监听，仅绑定一次（render 会重建子元素但不会重建 root）
        composed 事件会穿透本页 shadow 继续冒泡，转发前必须 stopPropagation 去重 */
    wireGlobal() {
      // 卡片行为：detail / 点击卡面 开观测窗，其余上行给应用层
      this.shadowRoot.addEventListener('card-action', (e) => {
        e.stopPropagation();
        if (e.detail.action === 'detail') {
          this.openDetail(e.detail.id);
          return;
        }
        if (e.detail.action === 'remove') this.closeDetail();
        this.emit('card-action', e.detail);
      });
      this.shadowRoot.addEventListener('card-select', (e) => {
        e.stopPropagation();
        this.openDetail(e.detail.id);
      });
      // 瑰丽花园卡片行为直接上行给应用层
      this.shadowRoot.addEventListener('fav-action', (e) => {
        e.stopPropagation();
        this.emit('fav-action', e.detail);
      });
    }

    disconnectedCallback() {
      clearInterval(this._clock);
    }

    /* ---------- 外部数据注入 ---------- */

    setProgress(id, info) {
      this.progressById[id] = info;
      this.shadowRoot.querySelectorAll('eco-group-section').forEach((sec) => sec.updateProgress(id, info));
      const detail = this.shadowRoot.querySelector('eco-project-detail');
      if (detail && this.selectedId === id) detail.progress = info;
    }

    appendLog(id, entry) {
      const list = this.logsById[id] || (this.logsById[id] = []);
      list.push(entry);
      if (list.length > 300) list.splice(0, list.length - 300);
      const detail = this.shadowRoot.querySelector('eco-project-detail');
      if (detail && this.selectedId === id) detail.logs = list;
    }

    openDetail(id) {
      this.selectedId = id;
      this.render();
    }

    closeDetail() {
      this.selectedId = null;
      const modal = this.shadowRoot.querySelector('eco-modal');
      if (modal) modal.removeAttribute('open');
    }

    /* ---------- 派生数据 ---------- */

    get projects() {
      return this.state.projects || [];
    }

    get favorites() {
      return this.state.favorites || [];
    }

    get groups() {
      const map = new Map();
      this.projects.forEach((p) => map.set(p.group || '未分组', (map.get(p.group || '未分组') || 0) + 1));
      return [...map.entries()].map(([name, count]) => ({ name, count }));
    }

    get visibleProjects() {
      const kw = this.search.trim().toLowerCase();
      return this.projects.filter((p) => {
        if (this.activeGroup && (p.group || '未分组') !== this.activeGroup) return false;
        if (this.filterValue !== 'all' && p.status !== this.filterValue) return false;
        if (kw && ![p.name, p.repo, p.description].join(' ').toLowerCase().includes(kw)) return false;
        return true;
      });
    }

    get groupedVisible() {
      const map = new Map();
      this.visibleProjects.forEach((p) => {
        const g = p.group || '未分组';
        if (!map.has(g)) map.set(g, []);
        map.get(g).push(p);
      });
      return [...map.entries()];
    }

    /* ---------- 渲染 ---------- */

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const { settings } = this.state;
      const selected = this.projects.find((p) => p.id === this.selectedId);

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; height: 100vh; }
          .frame { height: 100%; display: flex; flex-direction: column; position: relative; z-index: 1; }
          .shell { flex: 1; display: flex; min-height: 0; }
          eco-sidebar { width: var(--eco-sidebar-w); flex: none; }
          .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
          .content { flex: 1; overflow-y: auto; padding: 24px 28px 30px; }
          .view { animation: eco-fade-up .35s var(--eco-ease); }
          @keyframes eco-fade-up { from { opacity: 0; transform: translateY(12px); } }

          .page-head { display: flex; align-items: flex-end; gap: 18px; margin-bottom: 20px; flex-wrap: wrap; }
          .title-block h1 {
            font-family: var(--eco-font-display); font-size: 26px; font-weight: 700;
            color: var(--eco-ink); letter-spacing: .04em; line-height: 1.15;
          }
          .title-block .en {
            font-family: var(--eco-font-mono); font-size: 9.5px; letter-spacing: .3em;
            color: var(--eco-teal-deep); margin-top: 3px;
          }
          .controls { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
          .controls eco-input { width: 210px; }

          .panel-wrap { max-width: 760px; }

          /* 侧边栏底部状态 */
          .side-status { display: block; }
          .side-status .row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--eco-ink-2); }
          .side-status .k {
            font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .2em;
            color: var(--eco-ink-3); text-transform: uppercase;
          }
          .side-status .v {
            font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-teal-deep);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;
          }

          /* 状态栏 */
          .statusbar {
            height: var(--eco-statusbar-h); flex: none;
            display: flex; align-items: center; gap: 18px;
            padding: 0 16px; overflow: hidden;
            background: rgba(255,255,255,.45);
            backdrop-filter: blur(12px);
            border-top: 1px solid var(--eco-line);
            font-family: var(--eco-font-mono); font-size: 9.5px;
            letter-spacing: .12em; color: var(--eco-ink-3);
            position: relative; z-index: 20;
          }
          .statusbar .seg { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
          .statusbar .seg eco-icon { color: var(--eco-teal-deep); }
          .statusbar .spacer { flex: 1; }
          .ticker-wrap { overflow: hidden; max-width: 300px; mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent); }
          .ticker { display: inline-flex; gap: 40px; white-space: nowrap; animation: eco-ticker 18s linear infinite; color: var(--eco-teal-deep); }
          @keyframes eco-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

          .empty-all {
            padding: 60px 30px; text-align: center;
            border: 1px dashed var(--eco-line-strong);
            background: var(--eco-glass); clip-path: var(--eco-clip-card);
          }
          .empty-all .big { font-size: 16px; font-weight: 700; color: var(--eco-ink-2); margin: 12px 0 6px; }
          .empty-all .sub { font-family: var(--eco-font-mono); font-size: 10px; letter-spacing: .14em; color: var(--eco-ink-3); }

          /* 瑰丽花园网格 */
          .garden-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(315px, 1fr));
            gap: 15px; padding-bottom: 26px;
          }
          .picker-wrap { max-width: 760px; margin-bottom: 20px; }
        </style>

        <div class="frame">
          <eco-titlebar crumb="${CRUMBS[this.activeNav]}" ${this.state.online ? 'online' : ''}></eco-titlebar>
          <div class="shell">
            <eco-sidebar active-nav="${this.activeNav}" active-group="${ECO.esc(this.activeGroup)}">
              <div slot="foot" class="side-status">
                <div class="row"><span class="k">ROOT</span><span class="v" title="${ECO.esc(settings.rootDir || '')}">${ECO.esc(settings.rootDir || '未配置')}</span></div>
                <div class="row" style="margin-top:6px"><span class="k">SPECIMENS</span><span class="v">园 ${this.projects.length} · 花 ${this.favorites.length}</span></div>
              </div>
            </eco-sidebar>
            <main class="main">
              <div class="content">${this.renderView()}</div>
            </main>
          </div>
          <footer class="statusbar">
            <span class="seg"><eco-icon name="hexagon" size="11"></eco-icon>ECO v${ECO.esc(this.state.appVersion || '…')} // ELECTRON 43</span>
            <span class="seg"><eco-icon name="folder" size="11"></eco-icon>${ECO.esc(settings.rootDir || '—')}</span>
            <span class="spacer"></span>
            <span class="ticker-wrap">
              <span class="ticker">
                <span>水精灵超赞 · PRAISE THE WATER ELF</span><span>晨露在线 · MORNING DEW ONLINE</span>
                <span>水精灵超赞 · PRAISE THE WATER ELF</span><span>晨露在线 · MORNING DEW ONLINE</span>
              </span>
            </span>
            <span class="seg"><eco-icon name="clock" size="11"></eco-icon><span class="clock">${new Date().toLocaleTimeString('zh-CN', { hour12: false })}</span></span>
          </footer>
        </div>

        <eco-modal ${selected ? 'open' : ''} width="640" kicker="ECO // SPECIMEN OBSERVATION">
          <span slot="title">样本观测 · ${ECO.esc(selected ? selected.name : '')}</span>
          <eco-project-detail></eco-project-detail>
        </eco-modal>
      `;

      this.wire();
      this.feedComponents();
    }

    renderView() {
      if (this.activeNav === 'garden') return this.renderGarden();
      if (this.activeNav === 'settings') {
        return `
          <div class="view">
            <div class="page-head">
              <div class="title-block"><h1>生态科设置</h1><div class="en">SECTION CONFIG // PARAMETERS</div></div>
            </div>
            <div class="panel-wrap"><eco-card pad="18"><eco-settings-panel></eco-settings-panel></eco-card></div>
          </div>`;
      }
      // 生态园视图
      const groups = this.groupedVisible;
      return `
        <div class="view">
          <div class="page-head">
            <div class="title-block"><h1>生态园</h1><div class="en">ECOLOGICAL GARDEN // MY SPECIMENS</div></div>
            <div class="controls">
              <eco-input icon="search" placeholder="检索样本…" value="${ECO.esc(this.search)}" data-role="search"></eco-input>
              <eco-segmented value="${this.filterValue}" data-role="filter"></eco-segmented>
              <eco-button variant="primary" icon="plus" data-act="add-local">本地登记</eco-button>
            </div>
          </div>
          ${this.projects.length === 0 ? `
            <div class="empty-all">
              <eco-icon name="sprout" size="30" style="color: var(--eco-teal-deep)"></eco-icon>
              <div class="big">生态园空空如也</div>
              <div class="sub">展示项目由内置目录提供，也可通过「本地登记」补充样本</div>
            </div>` : groups.length === 0 ? `
            <div class="empty-all">
              <eco-icon name="search" size="26" style="color: var(--eco-ink-3)"></eco-icon>
              <div class="big">没有匹配的样本</div>
              <div class="sub">调整检索词或筛选条件</div>
            </div>` : groups.map(([name]) => `<eco-group-section data-group="${ECO.esc(name)}"></eco-group-section>`).join('')}
        </div>`;
    }

    /* 瑰丽花园：收藏的他人项目，仅跳转 + 自选启动 */
    renderGarden() {
      const showPicker = this.state.starredLoading || !!this.state.starred;
      const favs = this.favorites;
      return `
        <div class="view">
          <div class="page-head">
            <div class="title-block"><h1>瑰丽花园</h1><div class="en">ROSE GARDEN // STARRED SPECIMENS</div></div>
            <div class="controls">
              <eco-button variant="primary" icon="star" data-act="fetch-starred" ${this.state.starredLoading ? 'loading' : ''}>采集星标</eco-button>
            </div>
          </div>
          ${showPicker ? '<div class="picker-wrap"><eco-card pad="18"><eco-repo-picker data-role="star-picker"></eco-repo-picker></eco-card></div>' : ''}
          ${favs.length === 0 ? `
            <div class="empty-all">
              <eco-icon name="flower" size="30" style="color: var(--eco-amber)"></eco-icon>
              <div class="big">花园尚无花卉</div>
              <div class="sub">点击「采集星标」，将 GitHub Star 的他人项目移栽至此 · 仅提供跳转与自选启动</div>
            </div>` : `
            <div class="garden-grid">
              ${favs.map((f) => `<eco-favorite-card data-id="${f.id}"></eco-favorite-card>`).join('')}
            </div>`}
        </div>`;
    }

    /* ---------- 事件接线 ---------- */

    wire() {
      const $ = (sel) => this.shadowRoot.querySelector(sel);
      const $$ = (sel) => this.shadowRoot.querySelectorAll(sel);

      $('eco-titlebar').addEventListener('win-min', () => window.eco.minimize());
      $('eco-titlebar').addEventListener('win-max', () => window.eco.toggleMaximize());
      $('eco-titlebar').addEventListener('win-close', () => window.eco.closeWindow());

      const sidebar = $('eco-sidebar');
      sidebar.addEventListener('nav', (e) => {
        this.activeNav = e.detail.id;
        this.render();
      });
      sidebar.addEventListener('group-select', (e) => {
        this.activeGroup = this.activeGroup === e.detail.name ? '' : e.detail.name;
        if (this.activeNav !== 'launcher') this.activeNav = 'launcher';
        this.render();
      });

      const search = $('[data-role="search"]');
      if (search) {
        search.addEventListener('input', (e) => {
          this.search = e.detail.value;
          this.refreshGroupsOnly();
        });
      }

      const seg = $('[data-role="filter"]');
      if (seg) {
        seg.addEventListener('change', (e) => {
          this.filterValue = e.detail.value;
          this.render();
        });
      }

      const addLocal = $('[data-act="add-local"]');
      if (addLocal) addLocal.addEventListener('click', () => this.emit('add-local'));

      const fetchStarred = $('[data-act="fetch-starred"]');
      if (fetchStarred) fetchStarred.addEventListener('click', () => this.emit('fetch-starred'));

      // 模态与详情
      const modal = $('eco-modal');
      modal.addEventListener('close', () => this.closeDetail());
      const detail = $('eco-project-detail');
      detail.addEventListener('save-project', (e) => {
        e.stopPropagation();
        this.emit('save-project', e.detail);
      });
      detail.addEventListener('browse-dir', (e) => {
        e.stopPropagation();
        this.emit('browse-dir', e.detail);
      });
      detail.addEventListener('open-repo', (e) => {
        e.stopPropagation();
        this.emit('open-repo', e.detail);
      });

      // 星标采集（瑰丽花园）
      const starPicker = $('[data-role="star-picker"]');
      if (starPicker) {
        starPicker.addEventListener('fetch-repos', (e) => {
          e.stopPropagation();
          this.emit('fetch-starred');
        });
        starPicker.addEventListener('import-repos', (e) => {
          e.stopPropagation();
          this.emit('import-favorites', e.detail);
        });
      }

      // 设置
      const panel = $('eco-settings-panel');
      if (panel) {
        panel.addEventListener('save-settings', (e) => {
          e.stopPropagation();
          this.emit('save-settings', e.detail);
        });
        panel.addEventListener('browse-root', (e) => {
          e.stopPropagation();
          this.emit('browse-root');
        });
        panel.addEventListener('request-uninstall', (e) => {
          e.stopPropagation();
          this.emit('request-uninstall');
        });
      }
    }

    /* 将数据灌入子组件（property 方式） */
    feedComponents() {
      const $ = (sel) => this.shadowRoot.querySelector(sel);
      const $$ = (sel) => this.shadowRoot.querySelectorAll(sel);

      $('eco-sidebar').navItems = NAV_ITEMS;
      $('eco-sidebar').groups = this.groups;

      const seg = $('[data-role="filter"]');
      if (seg) seg.options = FILTERS;

      $$('eco-group-section').forEach((sec) => {
        const name = sec.dataset.group;
        sec.name = name;
        sec.projects = this.groupedVisible.find(([g]) => g === name)?.[1] || [];
        Object.entries(this.progressById).forEach(([id, info]) => sec.updateProgress(id, info));
      });

      const starPicker = $('[data-role="star-picker"]');
      if (starPicker) {
        starPicker.hint = '采集 GitHub 星标（Star）的他人项目，移栽至瑰丽花园。仅提供跳转与自选启动，不提供种植。';
        starPicker.importText = '移栽至花园';
        starPicker.inLabel = '已在花园';
        starPicker.imported = new Set(this.favorites.map((f) => f.repo).filter(Boolean));
        starPicker.loading = !!this.state.starredLoading;
        if (this.state.starred) starPicker.repos = this.state.starred;
      }

      $$('eco-favorite-card').forEach((card) => {
        card.favorite = this.favorites.find((f) => f.id === card.dataset.id) || {};
      });

      const panel = $('eco-settings-panel');
      if (panel) panel.settings = this.state.settings;

      const detail = $('eco-project-detail');
      if (detail && this.selectedId) {
        detail.project = this.projects.find((p) => p.id === this.selectedId);
        detail.logs = this.logsById[this.selectedId] || [];
      }
    }

    /** 检索时仅刷新分组区域，避免输入框失焦 */
    refreshGroupsOnly() {
      const view = this.shadowRoot.querySelector('.view');
      if (!view || this.activeNav !== 'launcher') {
        this.render();
        return;
      }
      const head = view.querySelector('.page-head');
      view.innerHTML = '';
      view.appendChild(head);
      const groups = this.groupedVisible;
      if (groups.length === 0) {
        view.insertAdjacentHTML(
          'beforeend',
          `<div class="empty-all"><eco-icon name="search" size="26"></eco-icon><div class="big">没有匹配的样本</div><div class="sub">调整检索词或筛选条件</div></div>`
        );
      } else {
        groups.forEach(([name]) => {
          const sec = document.createElement('eco-group-section');
          sec.dataset.group = name;
          view.appendChild(sec);
        });
      }
      this.feedComponents();
    }
  }

  customElements.define('launcher-page', LauncherPage);
})();
