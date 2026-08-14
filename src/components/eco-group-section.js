/* eco-group-section — 分组区块：组头 + 项目卡网格
   property: name / projects；方法: updateProgress(id, info)；attr: collapsed */
(function () {
  class EcoGroupSection extends ECO.EcoElement {
    static get attrs() {
      return ['collapsed'];
    }

    set name(v) {
      this._name = v;
    }
    get name() {
      return this._name || '未分组';
    }

    set projects(list) {
      this._projects = list || [];
      if (this.isConnected) this.render();
    }
    get projects() {
      return this._projects || [];
    }

    updateProgress(id, info) {
      const card = this.shadowRoot && this.shadowRoot.querySelector(`eco-project-card[data-id="${id}"]`);
      if (card) card.progress = info;
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const collapsed = this.has('collapsed');
      const list = this.projects;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; animation: eco-fade-up .45s var(--eco-ease) backwards; }
          .head {
            display: flex; align-items: center; gap: 12px;
            padding: 4px 2px 12px; cursor: pointer;
          }
          .chip {
            font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .2em;
            color: var(--eco-ink-inverse);
            background: linear-gradient(135deg, var(--eco-teal), var(--eco-teal-deep));
            padding: 3px 10px; clip-path: var(--eco-clip-chip);
          }
          .gname {
            font-family: var(--eco-font-display); font-size: 16px; font-weight: 700;
            color: var(--eco-ink); letter-spacing: .03em;
          }
          .count {
            font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-teal-deep);
          }
          .line { flex: 1; border-top: 1px solid var(--eco-line); position: relative; }
          .line::after {
            content: "+"; position: absolute; right: -2px; top: -7px;
            font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-ink-3);
          }
          .chev {
            display: inline-flex; color: var(--eco-ink-2);
            transition: transform var(--eco-t-fast) var(--eco-ease);
            transform: rotate(${collapsed ? '-90deg' : '0deg'});
          }
          .grid {
            display: ${collapsed ? 'none' : 'grid'};
            grid-template-columns: repeat(auto-fill, minmax(315px, 1fr));
            gap: 15px; padding-bottom: 26px;
          }
          .empty {
            grid-column: 1 / -1; padding: 26px; text-align: center;
            font-family: var(--eco-font-mono); font-size: 11px; letter-spacing: .1em;
            color: var(--eco-ink-3); border: 1px dashed var(--eco-line-strong);
          }
          @keyframes eco-fade-up {
            from { opacity: 0; transform: translateY(14px); }
          }
        </style>
        <div class="head">
          <span class="chip">PLOT</span>
          <span class="gname">${ECO.esc(this.name)}</span>
          <span class="count">×${list.length}</span>
          <span class="line"></span>
          <span class="chev"><eco-icon name="chevron-down" size="15"></eco-icon></span>
        </div>
        <div class="grid">
          ${list.length ? list.map((p) => `<eco-project-card data-id="${p.id}"></eco-project-card>`).join('') : '<div class="empty">该培养田暂无样本 · EMPTY PLOT</div>'}
        </div>
      `;
      this.shadowRoot.querySelector('.head').addEventListener('click', () => {
        this.has('collapsed') ? this.removeAttribute('collapsed') : this.setAttribute('collapsed', '');
      });
      this.shadowRoot.querySelectorAll('eco-project-card').forEach((card) => {
        card.project = list.find((p) => p.id === card.dataset.id);
      });
    }
  }
  customElements.define('eco-group-section', EcoGroupSection);
})();
