/* eco-repo-picker — GitHub 仓库接入清单（置于 eco-modal 内）
   property: repos / loading / imported(Set)；事件: fetch-repos / import-repos { repos } */
(function () {
  class EcoRepoPicker extends ECO.EcoElement {
    constructor() {
      super();
      this._selected = new Set();
    }

    set repos(list) {
      this._repos = list;
      if (this.isConnected) this.render();
    }
    get repos() {
      return this._repos || null;
    }

    set loading(v) {
      this._loading = !!v;
      if (this.isConnected) this.render();
    }
    get loading() {
      return !!this._loading;
    }

    set imported(set) {
      this._imported = set || new Set();
    }
    get imported() {
      return this._imported || new Set();
    }

    /** 顶部说明文案 / 导入按钮文案 / 已入库标签，可按场景覆盖 */
    set hint(v) {
      this._hint = v;
      if (this.isConnected) this.render();
    }
    get hint() {
      return this._hint || '从 GitHub 拉取仓库，勾选后导入培育舱。私有仓库需在设置中配置 Token。';
    }

    set importText(v) {
      this._importText = v;
      if (this.isConnected) this.render();
    }
    get importText() {
      return this._importText || '导入培育舱';
    }

    set inLabel(v) {
      this._inLabel = v;
      if (this.isConnected) this.render();
    }
    get inLabel() {
      return this._inLabel || '已入库';
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const repos = this.repos;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .hint {
            font-size: 12px; color: var(--eco-ink-2); margin-bottom: 12px;
            display: flex; align-items: center; gap: 8px;
          }
          .hint eco-icon { color: var(--eco-teal-deep); flex: none; }
          .list {
            display: flex; flex-direction: column; gap: 8px;
            max-height: 46vh; overflow-y: auto; padding-right: 4px;
          }
          .row {
            display: flex; align-items: center; gap: 11px;
            padding: 10px 12px; cursor: pointer;
            background: var(--eco-glass);
            box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-btn);
            transition: all var(--eco-t-fast) var(--eco-ease);
          }
          .row:hover { background: var(--eco-glass-strong); box-shadow: inset 0 0 0 1px rgba(15,154,138,.35); }
          .row.selected { box-shadow: inset 0 0 0 1px var(--eco-teal), 0 0 0 3px rgba(15,154,138,.12); background: rgba(15,154,138,.07); }
          .row.disabled { opacity: .5; cursor: not-allowed; }
          .checkbox {
            width: 15px; height: 15px; flex: none; display: grid; place-items: center;
            box-shadow: inset 0 0 0 1.5px var(--eco-line-strong);
            clip-path: var(--eco-clip-tag); color: transparent;
          }
          .row.selected .checkbox { background: var(--eco-teal); box-shadow: none; color: #fff; }
          .info { flex: 1; min-width: 0; }
          .rname {
            font-family: var(--eco-font-mono); font-size: 12px; font-weight: 600;
            color: var(--eco-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .rdesc {
            font-size: 11px; color: var(--eco-ink-3);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .rmeta {
            display: flex; align-items: center; gap: 8px; flex: none;
            font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-ink-3);
          }
          .empty, .loading-box {
            padding: 34px 0; text-align: center;
            font-family: var(--eco-font-mono); font-size: 11px; letter-spacing: .12em;
            color: var(--eco-ink-3);
          }
          .loading-box eco-icon { animation: eco-spin 1s linear infinite; color: var(--eco-teal); }
          @keyframes eco-spin { to { transform: rotate(360deg); } }
          .foot {
            display: flex; align-items: center; gap: 10px; margin-top: 14px;
            padding-top: 13px; border-top: 1px dashed var(--eco-line-strong);
          }
          .sel-count { font-family: var(--eco-font-mono); font-size: 10.5px; color: var(--eco-teal-deep); }
          .spacer { flex: 1; }
        </style>
        <div class="hint">
          <eco-icon name="github" size="15"></eco-icon>
          <span>${ECO.esc(this.hint)}</span>
        </div>
        ${this.loading ? '<div class="loading-box"><eco-icon name="sync" size="18"></eco-icon><div style="margin-top:8px">FETCHING…</div></div>' : repos ? `
        <div class="list">
          ${repos
            .map((r) => {
              const inLib = this.imported.has(r.full_name);
              const sel = this._selected.has(r.full_name);
              return `
            <div class="row ${sel ? 'selected' : ''} ${inLib ? 'disabled' : ''}" data-repo="${ECO.esc(r.full_name)}">
              <span class="checkbox"><eco-icon name="check" size="11"></eco-icon></span>
              <div class="info">
                <div class="rname">${ECO.esc(r.full_name)}${r.private ? ' 🔒' : ''}</div>
                <div class="rdesc">${ECO.esc(r.description || '—')}</div>
              </div>
              <div class="rmeta">
                ${r.language ? `<span>${ECO.esc(r.language)}</span>` : ''}
                <span class="rmeta"><eco-icon name="star" size="10"></eco-icon>${r.stargazers_count}</span>
                ${inLib ? `<eco-tag tone="planted">${ECO.esc(this.inLabel)}</eco-tag>` : ''}
              </div>
            </div>`;
            })
            .join('')}
        </div>` : `
        <div class="empty">尚未拉取 · 点击下方按钮获取仓库列表</div>`}
        <div class="foot">
          <span class="sel-count">${this._selected.size ? `已选 ${this._selected.size} 项` : ''}</span>
          <span class="spacer"></span>
          <eco-button icon="sync" data-act="fetch" ${this.loading ? 'loading' : ''}>${repos ? '重新拉取' : '拉取仓库'}</eco-button>
          <eco-button variant="primary" icon="download" data-act="import" ${this._selected.size ? '' : 'disabled'}>${ECO.esc(this.importText)}</eco-button>
        </div>
      `;

      this.shadowRoot.querySelectorAll('.row:not(.disabled)').forEach((row) => {
        row.addEventListener('click', () => {
          const key = row.dataset.repo;
          this._selected.has(key) ? this._selected.delete(key) : this._selected.add(key);
          this.render();
        });
      });
      this.shadowRoot.querySelector('[data-act="fetch"]').addEventListener('click', () => this.emit('fetch-repos'));
      this.shadowRoot.querySelector('[data-act="import"]').addEventListener('click', () => {
        const chosen = (this.repos || []).filter((r) => this._selected.has(r.full_name));
        if (chosen.length) this.emit('import-repos', { repos: chosen });
      });
    }
  }
  customElements.define('eco-repo-picker', EcoRepoPicker);
})();
