/* eco-sidebar — 左侧导航：功能区 + 项目分组 + 底部状态插槽
   属性: navItems / groups (JS property)；事件: nav / group-select */
(function () {
  class EcoSidebar extends ECO.EcoElement {
    static get attrs() {
      return ['active-nav', 'active-group'];
    }

    set navItems(list) {
      this._navItems = list || [];
      if (this.isConnected) this.render();
    }
    get navItems() {
      return this._navItems || [];
    }

    set groups(list) {
      this._groups = list || [];
      if (this.isConnected) this.render();
    }
    get groups() {
      return this._groups || [];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const activeNav = this.attr('active-nav', 'launcher');
      const activeGroup = this.attr('active-group', '');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; height: 100%; }
          .side {
            height: 100%; display: flex; flex-direction: column;
            background: rgba(255,255,255,.38);
            backdrop-filter: blur(16px);
            border-right: 1px solid var(--eco-line);
          }
          .scroll { flex: 1; overflow-y: auto; padding: 18px 12px 12px; }
          .section-label {
            font-family: var(--eco-font-mono); font-size: 9px;
            letter-spacing: .24em; color: var(--eco-ink-3);
            padding: 0 10px 8px; display: flex; align-items: center; gap: 8px;
          }
          .section-label::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line); }
          .nav-item {
            width: 100%; display: flex; align-items: center; gap: 10px;
            padding: 9px 10px; margin-bottom: 2px; text-align: left;
            color: var(--eco-ink-2); position: relative;
            border: none; background: transparent; font-family: inherit;
            transition: all var(--eco-t-fast) var(--eco-ease);
            border-left: 2px solid transparent;
          }
          .nav-item:hover { color: var(--eco-teal-deep); background: rgba(15,154,138,.07); }
          .nav-item.active {
            color: var(--eco-teal-deep);
            background: linear-gradient(90deg, rgba(15,154,138,.14), rgba(15,154,138,.02));
            border-left-color: var(--eco-teal);
          }
          .nav-item .idx {
            font-family: var(--eco-font-mono); font-size: 9px;
            color: var(--eco-ink-3); width: 16px;
          }
          .nav-item.active .idx { color: var(--eco-teal); }
          .nav-item .zh { font-size: 13px; font-weight: 600; letter-spacing: .04em; }
          .nav-item .en {
            margin-left: auto; font-family: var(--eco-font-mono);
            font-size: 8.5px; letter-spacing: .14em; color: var(--eco-ink-3);
          }
          .groups { margin-top: 20px; }
          .group-item {
            width: 100%; display: flex; align-items: center; gap: 8px;
            padding: 7px 10px; margin-bottom: 1px;
            font-size: 12.5px; color: var(--eco-ink-2);
            border: none; background: transparent; font-family: inherit;
            border-left: 2px solid transparent; text-align: left;
            transition: all var(--eco-t-fast) var(--eco-ease);
          }
          .group-item:hover { color: var(--eco-teal-deep); background: rgba(15,154,138,.07); }
          .group-item.active {
            color: var(--eco-teal-deep);
            background: linear-gradient(90deg, rgba(15,154,138,.14), rgba(15,154,138,.02));
            border-left-color: var(--eco-teal);
          }
          .group-item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .count {
            font-family: var(--eco-font-mono); font-size: 9.5px;
            color: var(--eco-ink-3); background: rgba(13,74,63,.08);
            padding: 1px 6px; clip-path: var(--eco-clip-tag);
          }
          .group-item.active .count { background: rgba(15,154,138,.16); color: var(--eco-teal-deep); }
          .foot { flex: none; padding: 12px; border-top: 1px dashed var(--eco-line-strong); }
        </style>
        <div class="side">
          <div class="scroll">
            <div class="section-label">TERMINAL · 终端</div>
            ${this.navItems
              .map(
                (item, i) => `
              <button class="nav-item ${item.id === activeNav ? 'active' : ''}" data-nav="${item.id}">
                <span class="idx">0${i + 1}</span>
                <eco-icon name="${item.icon}" size="15"></eco-icon>
                <span class="zh">${ECO.esc(item.label)}</span>
                <span class="en">${ECO.esc(item.en || '')}</span>
              </button>`
              )
              .join('')}
            <div class="groups">
              <div class="section-label">GROUPS · 分组</div>
              ${this.groups
                .map(
                  (g) => `
                <button class="group-item ${g.name === activeGroup ? 'active' : ''}" data-group="${ECO.esc(g.name)}">
                  <eco-icon name="sprout" size="13"></eco-icon>
                  <span class="name">${ECO.esc(g.name)}</span>
                  <span class="count">${g.count}</span>
                </button>`
                )
                .join('')}
            </div>
          </div>
          <div class="foot"><slot name="foot"></slot></div>
        </div>
      `;
      this.shadowRoot.querySelectorAll('[data-nav]').forEach((btn) => {
        btn.addEventListener('click', () => this.emit('nav', { id: btn.dataset.nav }));
      });
      this.shadowRoot.querySelectorAll('[data-group]').forEach((btn) => {
        btn.addEventListener('click', () => this.emit('group-select', { name: btn.dataset.group }));
      });
    }
  }
  customElements.define('eco-sidebar', EcoSidebar);
})();
