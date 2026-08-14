/* eco-project-card — 生态园样本卡：种植管线状态 + 远方来信更新 + GitHub 跳转
   property: project / progress；事件: card-action { id, action }, card-select { id } */
(function () {
  const STATUS = {
    not_installed: { zh: '未种植', en: 'DORMANT', tone: 'dormant' },
    installing: { zh: '培育中', en: 'GROWING', tone: 'growing' },
    installed: { zh: '已长成', en: 'PLANTED', tone: 'planted' },
    running: { zh: '观察中', en: 'OBSERVING', tone: 'running' },
    error: { zh: '枯萎', en: 'WILTED', tone: 'error' },
  };

  // 种植管线阶段文案
  const STAGES = {
    connect: '松土中',
    download: '播种中',
    extract: '浇水中',
    deps: '施肥中',
  };

  const LANG_COLORS = {
    JavaScript: '#e8c848', TypeScript: '#3178c6', Python: '#3572a5', Rust: '#dea584',
    Go: '#00add8', Vue: '#41b883', HTML: '#e34c26', CSS: '#5a7bd6', Shell: '#89e051',
    'C++': '#f34b7d', C: '#9b9b9b', Java: '#b07219', Svelte: '#ff3e00', Lua: '#5b6fd8',
  };

  function hasUpdate(p) {
    return p.version && p.latestVersion && p.latestVersion !== p.version && p.latestVersion !== p.ignoredVersion;
  }

  class EcoProjectCard extends ECO.EcoElement {
    set project(p) {
      this._project = p;
      if (this.isConnected) this.render();
    }
    get project() {
      return this._project || {};
    }

    set progress(info) {
      this._progress = info;
      if (this.isConnected) this.render();
    }
    get progress() {
      return this._progress;
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const p = this.project;
      const st = STATUS[p.status] || STATUS.not_installed;
      const langColor = LANG_COLORS[p.language] || 'var(--eco-teal)';
      const prog = this.progress || {};
      const growing = p.status === 'installing' || prog.stage === 'grown';
      const update = hasUpdate(p) && p.status !== 'installing';

      // 阶段文案：更新模式统一显示「生长中」，种植模式显示各阶段
      let stageText = '';
      if (prog.stage === 'grown') stageText = '长大啦';
      else if (prog.mode === 'update') stageText = '生长中';
      else stageText = STAGES[prog.stage] || st.zh;

      const tagZh = prog.stage === 'grown' ? '长大啦' : p.status === 'installing' ? stageText : st.zh;
      const tagEn = prog.stage === 'grown' ? 'GROWN' : p.status === 'installing' ? (prog.mode === 'update' ? 'GROWING' : ((prog.stage || '') + '').toUpperCase()) : st.en;

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .card {
            position: relative; padding: 15px 16px 13px;
            display: flex; flex-direction: column; gap: 10px; height: 100%;
            background: var(--eco-glass);
            backdrop-filter: blur(14px) saturate(1.15);
            box-shadow: inset 0 0 0 1px var(--eco-line), var(--eco-shadow);
            clip-path: var(--eco-clip-card);
            cursor: pointer; overflow: hidden;
            transition: transform var(--eco-t) var(--eco-ease),
                        box-shadow var(--eco-t) var(--eco-ease),
                        background var(--eco-t) var(--eco-ease);
          }
          .card:hover {
            transform: translateY(-3px);
            background: var(--eco-glass-strong);
            box-shadow: inset 0 0 0 1px rgba(15,154,138,.42), var(--eco-shadow-lift);
          }
          .card::after {
            content: ""; position: absolute; top: 0; bottom: 0; width: 30%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
            transform: translateX(-150%) skewX(-18deg); pointer-events: none;
          }
          .card:hover::after { animation: eco-scan-sweep .7s var(--eco-ease); }
          @keyframes eco-scan-sweep {
            from { transform: translateX(-150%) skewX(-18deg); }
            to { transform: translateX(420%) skewX(-18deg); }
          }
          .head { display: flex; gap: 11px; align-items: flex-start; }
          .avatar { flex: none; margin-top: 1px; }
          .id-block { flex: 1; min-width: 0; }
          .name {
            font-family: var(--eco-font-display); font-size: 15px; font-weight: 700;
            color: var(--eco-ink); letter-spacing: .02em;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .repo {
            font-family: var(--eco-font-mono); font-size: 10px;
            color: var(--eco-ink-3); letter-spacing: .04em;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .tags { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex: none; }
          .desc {
            font-size: 12px; color: var(--eco-ink-2); line-height: 1.55;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            overflow: hidden; min-height: 2.9em;
          }
          .meta {
            display: flex; align-items: center; gap: 12px;
            font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-ink-3);
          }
          .lang { display: inline-flex; align-items: center; gap: 5px; }
          .lang .dot { width: 7px; height: 7px; border-radius: 50%; background: ${langColor}; }
          .stars { display: inline-flex; align-items: center; gap: 4px; }
          .ver { color: var(--eco-teal-deep); }
          .rule { border: none; border-top: 1px dashed var(--eco-line-strong); }
          .foot { display: flex; align-items: center; gap: 8px; margin-top: auto; flex-wrap: wrap; }
          .foot .spacer { flex: 1; }
          .growing-box { display: flex; flex-direction: column; gap: 6px; }
          .growing-line {
            font-family: var(--eco-font-mono); font-size: 9.5px; color: var(--eco-teal-deep);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .grown-banner {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 8px; font-family: var(--eco-font-display); font-size: 14px; font-weight: 700;
            color: var(--eco-teal-deep); letter-spacing: .12em;
            background: linear-gradient(90deg, rgba(94,234,212,.16), rgba(94,234,212,.32), rgba(94,234,212,.16));
            clip-path: var(--eco-clip-tag);
            animation: eco-breathe 1s ease-in-out infinite;
          }
          @keyframes eco-breathe { 0%,100% { opacity: .65; } 50% { opacity: 1; } }
          .mail-hint {
            display: inline-flex; align-items: center; gap: 5px;
            font-family: var(--eco-font-mono); font-size: 9.5px; color: var(--eco-amber);
          }
          @media (prefers-reduced-motion: reduce) {
            .card, .card::after { transition: none; animation: none; }
          }
        </style>
        <div class="card">
          <div class="head">
            <span class="avatar">${ECO.avatarSVG(p.name, 42)}</span>
            <div class="id-block">
              <div class="name">${ECO.esc(p.name)}</div>
              <div class="repo">${ECO.esc(p.repo || p.installPath || 'LOCAL SPECIMEN')}</div>
            </div>
            <div class="tags">
              <eco-tag tone="${prog.stage === 'grown' ? 'running' : st.tone}" dot>${tagZh} · ${tagEn}</eco-tag>
              ${update ? `<eco-tag tone="amber" dot>远方来信 · ${ECO.esc(p.latestVersion)}</eco-tag>` : ''}
            </div>
          </div>
          <div class="desc">${ECO.esc(p.description || '暂无描述 · No field notes recorded.')}</div>
          <div class="meta">
            ${p.language ? `<span class="lang"><span class="dot"></span>${ECO.esc(p.language)}</span>` : ''}
            ${p.stars ? `<span class="stars"><eco-icon name="star" size="11"></eco-icon>${p.stars}</span>` : ''}
            ${p.version ? `<span class="ver">${ECO.esc(p.version)}</span>` : ''}
            <span style="margin-left:auto">${ECO.esc(p.group || '')}</span>
          </div>
          <hr class="rule" />
          ${this.renderZone(p, growing, prog, update, stageText)}
        </div>
      `;

      this.shadowRoot.querySelector('.card').addEventListener('click', () => {
        this.emit('card-select', { id: p.id });
      });
      this.shadowRoot.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.emit('card-action', { id: p.id, action: btn.dataset.action });
        });
      });
    }

    renderZone(p, growing, prog, update, stageText) {
      if (prog.stage === 'grown') {
        return `<div class="grown-banner"><eco-icon name="sprout" size="16"></eco-icon>长大啦！</div>`;
      }
      if (growing) {
        return `
          <div class="growing-box">
            <eco-progress ${prog.percent != null ? `value="${prog.percent}"` : 'indeterminate'} tone="var(--eco-cyan)"></eco-progress>
            <div class="growing-line">[${stageText}] ${ECO.esc(prog.line || '正在准备培养基…')}</div>
          </div>`;
      }
      return `
        <div class="foot">
          ${this.actionsFor(p, update)}
          <span class="spacer"></span>
          ${p.repoUrl ? '<eco-button size="sm" icon="github" data-action="open-repo">GitHub</eco-button>' : ''}
          <eco-button size="sm" data-action="detail">详情</eco-button>
        </div>`;
    }

    actionsFor(p, update) {
      if (p.status === 'running') {
        return '<eco-button variant="outline" size="sm" icon="stop" data-action="stop">停止</eco-button>';
      }
      if (p.status === 'error') {
        return '<eco-button variant="primary" size="sm" icon="sync" data-action="install">重新种植</eco-button>';
      }
      if (update) {
        return `
          <eco-button variant="primary" size="sm" icon="mail" data-action="update">生长</eco-button>
          <eco-button size="sm" data-action="ignore-update">这样就够了</eco-button>`;
      }
      if (p.status === 'not_installed') {
        return '<eco-button variant="primary" size="sm" icon="download" data-action="install">种植</eco-button>';
      }
      // 已长成
      return `
        <eco-button variant="primary" size="sm" icon="eye" data-action="launch">观察</eco-button>
        <eco-button size="sm" icon="folder-open" data-action="open-folder">目录</eco-button>`;
    }
  }
  customElements.define('eco-project-card', EcoProjectCard);
})();
