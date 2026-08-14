/* eco-project-card — 项目样本卡：状态感知操作区 + 培植进度
   property: project / progress；事件: card-action { id, action }, card-select { id } */
(function () {
  const STATUS = {
    not_installed: { zh: '未定植', en: 'DORMANT', tone: 'dormant' },
    installing: { zh: '培植中', en: 'GROWING', tone: 'growing' },
    installed: { zh: '已定植', en: 'PLANTED', tone: 'planted' },
    running: { zh: '生长中', en: 'THRIVING', tone: 'running' },
    error: { zh: '异常', en: 'WILTED', tone: 'error' },
  };

  const LANG_COLORS = {
    JavaScript: '#e8c848', TypeScript: '#3178c6', Python: '#3572a5', Rust: '#dea584',
    Go: '#00add8', Vue: '#41b883', HTML: '#e34c26', CSS: '#5a7bd6', Shell: '#89e051',
    'C++': '#f34b7d', C: '#9b9b9b', Java: '#b07219', Svelte: '#ff3e00', Lua: '#5b6fd8',
  };

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
      if (this.isConnected && this.project.status === 'installing') this.render();
    }
    get progress() {
      return this._progress;
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const p = this.project;
      const st = STATUS[p.status] || STATUS.not_installed;
      const langColor = LANG_COLORS[p.language] || 'var(--eco-teal)';
      const installing = p.status === 'installing';
      const prog = this.progress || {};

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
          .rule { border: none; border-top: 1px dashed var(--eco-line-strong); }
          .foot { display: flex; align-items: center; gap: 8px; margin-top: auto; }
          .foot .spacer { flex: 1; }
          .growing-box { display: flex; flex-direction: column; gap: 6px; }
          .growing-line {
            font-family: var(--eco-font-mono); font-size: 9.5px; color: var(--eco-teal-deep);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
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
            <eco-tag tone="${st.tone}" dot>${st.zh} · ${st.en}</eco-tag>
          </div>
          <div class="desc">${ECO.esc(p.description || '暂无描述 · No field notes recorded.')}</div>
          <div class="meta">
            ${p.language ? `<span class="lang"><span class="dot"></span>${ECO.esc(p.language)}</span>` : ''}
            ${p.stars ? `<span class="stars"><eco-icon name="star" size="11"></eco-icon>${p.stars}</span>` : ''}
            <span style="margin-left:auto">${ECO.esc(p.group || '')}</span>
          </div>
          <hr class="rule" />
          ${installing ? `
          <div class="growing-box">
            <eco-progress ${prog.percent != null ? `value="${prog.percent}"` : 'indeterminate'} tone="var(--eco-cyan)"></eco-progress>
            <div class="growing-line">${ECO.esc(prog.line || '正在准备培养基…')}</div>
          </div>` : `
          <div class="foot">
            ${this.actionsFor(p.status)}
            <span class="spacer"></span>
            <eco-button size="sm" data-action="detail">详情</eco-button>
          </div>`}
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

    actionsFor(status) {
      const map = {
        not_installed: '<eco-button variant="primary" size="sm" icon="download" data-action="install">下载定植</eco-button>',
        installed: `
          <eco-button variant="primary" size="sm" icon="play" data-action="launch">启动</eco-button>
          <eco-button size="sm" icon="folder-open" data-action="open-folder">目录</eco-button>`,
        running: `
          <eco-button variant="outline" size="sm" icon="stop" data-action="stop">停止</eco-button>
          <eco-button size="sm" icon="terminal" data-action="detail">观测</eco-button>`,
        error: '<eco-button variant="primary" size="sm" icon="sync" data-action="install">重新定植</eco-button>',
      };
      return map[status] || '';
    }
  }
  customElements.define('eco-project-card', EcoProjectCard);
})();
