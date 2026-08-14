/* eco-favorite-card — 瑰丽花园卡：仅跳转 GitHub + 自选程序观察
   property: favorite；事件: fav-action { id, action: jump|set-launch|observe|remove } */
(function () {
  const LANG_COLORS = {
    JavaScript: '#e8c848', TypeScript: '#3178c6', Python: '#3572a5', Rust: '#dea584',
    Go: '#00add8', Vue: '#41b883', HTML: '#e34c26', CSS: '#5a7bd6', Shell: '#89e051',
    'C++': '#f34b7d', C: '#9b9b9b', Java: '#b07219', Svelte: '#ff3e00', Lua: '#5b6fd8',
  };

  class EcoFavoriteCard extends ECO.EcoElement {
    set favorite(f) {
      this._favorite = f;
      if (this.isConnected) this.render();
    }
    get favorite() {
      return this._favorite || {};
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const f = this.favorite;
      const langColor = LANG_COLORS[f.language] || 'var(--eco-teal)';
      const ready = !!f.launchPath;

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
            overflow: hidden;
            transition: transform var(--eco-t) var(--eco-ease),
                        box-shadow var(--eco-t) var(--eco-ease),
                        background var(--eco-t) var(--eco-ease);
          }
          .card:hover {
            transform: translateY(-3px);
            background: var(--eco-glass-strong);
            box-shadow: inset 0 0 0 1px rgba(217,119,6,.4), var(--eco-shadow-lift);
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
          .foot { display: flex; align-items: center; gap: 8px; margin-top: auto; flex-wrap: wrap; }
          .foot .spacer { flex: 1; }
          .path {
            font-family: var(--eco-font-mono); font-size: 9.5px; color: var(--eco-teal-deep);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
        </style>
        <div class="card">
          <div class="head">
            <span class="avatar">${ECO.avatarSVG(f.name, 42)}</span>
            <div class="id-block">
              <div class="name">${ECO.esc(f.name)}</div>
              <div class="repo">${ECO.esc(f.repo)}</div>
            </div>
            ${ready
              ? '<eco-tag tone="planted" dot>可观察 · READY</eco-tag>'
              : '<eco-tag tone="dormant" dot>静待耕耘 · FALLOW</eco-tag>'}
          </div>
          <div class="desc">${ECO.esc(f.description || '暂无描述 · No field notes recorded.')}</div>
          <div class="meta">
            ${f.language ? `<span class="lang"><span class="dot"></span>${ECO.esc(f.language)}</span>` : ''}
            ${f.stars ? `<span class="stars"><eco-icon name="star" size="11"></eco-icon>${f.stars}</span>` : ''}
            <span style="margin-left:auto">${ECO.esc(f.owner || '')}</span>
          </div>
          ${ready ? `<div class="path" title="${ECO.esc(f.launchPath)}">↳ ${ECO.esc(f.launchPath)}</div>` : ''}
          <hr class="rule" />
          <div class="foot">
            ${ready
              ? '<eco-button variant="primary" size="sm" icon="eye" data-action="observe">观察</eco-button>'
              : '<eco-button variant="outline" size="sm" icon="folder-open" data-action="set-launch">选择启动地址</eco-button>'}
            ${ready ? '<eco-button size="sm" icon="folder-open" data-action="set-launch">换地址</eco-button>' : ''}
            <span class="spacer"></span>
            <eco-button size="sm" icon="github" data-action="jump">GitHub</eco-button>
            <eco-button size="sm" icon="trash" data-action="remove">取消收藏</eco-button>
          </div>
        </div>
      `;

      this.shadowRoot.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => this.emit('fav-action', { id: f.id, action: btn.dataset.action }));
      });
    }
  }
  customElements.define('eco-favorite-card', EcoFavoriteCard);
})();
