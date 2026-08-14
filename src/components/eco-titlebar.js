/* eco-titlebar — 无边框窗口标题栏：品牌 / 面包屑 / 窗控
   事件: win-min / win-max / win-close */
(function () {
  class EcoTitlebar extends ECO.EcoElement {
    static get attrs() {
      return ['crumb', 'online'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const isWeb = !window.eco || window.eco.isMock;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .bar {
            height: var(--eco-titlebar-h);
            display: flex; align-items: center; gap: 14px;
            padding: 0 10px 0 16px;
            -webkit-app-region: drag;
            background: linear-gradient(180deg, rgba(255,255,255,.5), rgba(255,255,255,.12));
            border-bottom: 1px solid var(--eco-line);
            position: relative; z-index: 20;
          }
          .brand { display: flex; align-items: center; gap: 10px; }
          .logo { color: var(--eco-teal-deep); display: inline-flex; }
          .name {
            font-family: var(--eco-font-brand); font-size: 12.5px;
            letter-spacing: .12em; color: var(--eco-ink);
          }
          .sub {
            font-family: var(--eco-font-mono); font-size: 8.5px;
            letter-spacing: .26em; color: var(--eco-teal-deep);
          }
          .divider { width: 1px; height: 20px; background: var(--eco-line-strong); }
          .crumb {
            font-family: var(--eco-font-mono); font-size: 10.5px;
            letter-spacing: .14em; color: var(--eco-ink-3);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .spacer { flex: 1; }
          .status {
            display: flex; align-items: center; gap: 6px;
            font-family: var(--eco-font-mono); font-size: 9.5px;
            letter-spacing: .16em; color: var(--eco-ink-2);
          }
          .status .dot {
            width: 6px; height: 6px; border-radius: 50%;
            background: ${this.has('online') ? 'var(--eco-teal)' : 'var(--eco-st-dormant)'};
            color: ${this.has('online') ? 'var(--eco-teal)' : 'var(--eco-st-dormant)'};
            ${this.has('online') ? 'animation: eco-pulse-dot 2s ease-in-out infinite;' : ''}
          }
          .controls { display: flex; gap: 2px; -webkit-app-region: no-drag; }
          .win-btn {
            width: 40px; height: 30px; display: grid; place-items: center;
            color: var(--eco-ink-2); transition: all var(--eco-t-fast) var(--eco-ease);
            border: none; background: transparent; cursor: pointer;
          }
          .win-btn:hover { background: rgba(15,154,138,.14); color: var(--eco-teal-deep); }
          .win-btn.close:hover { background: rgba(211,63,51,.9); color: #fff; }
          .web-chip {
            font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .14em;
            color: var(--eco-amber); border: 1px dashed var(--eco-amber);
            padding: 3px 8px; -webkit-app-region: no-drag;
          }
          @keyframes eco-pulse-dot {
            0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
            50% { opacity: .5; box-shadow: 0 0 0 3.5px transparent; }
          }
        </style>
        <div class="bar">
          <div class="brand">
            <span class="logo"><eco-icon name="logo" size="26"></eco-icon></span>
            <div>
              <div class="name">RHINE LAB</div>
              <div class="sub">ECOLOGICAL SECTION</div>
            </div>
          </div>
          <div class="divider"></div>
          <div class="crumb">${ECO.esc(this.attr('crumb', 'ECO // 生态培育舱'))}</div>
          <div class="spacer"></div>
          <div class="status"><span class="dot"></span>${this.has('online') ? 'SYNC ONLINE' : 'STANDBY'}</div>
          ${isWeb ? '<span class="web-chip">BROWSER PREVIEW</span>' : `
          <div class="controls">
            <button class="win-btn" data-act="min" aria-label="最小化"><eco-icon name="minimize" size="14"></eco-icon></button>
            <button class="win-btn" data-act="max" aria-label="最大化"><eco-icon name="maximize" size="13"></eco-icon></button>
            <button class="win-btn close" data-act="close" aria-label="关闭"><eco-icon name="close" size="14"></eco-icon></button>
          </div>`}
        </div>
      `;
      this.shadowRoot.querySelectorAll('.win-btn').forEach((btn) => {
        btn.addEventListener('click', () => this.emit(`win-${btn.dataset.act}`));
      });
    }
  }
  customElements.define('eco-titlebar', EcoTitlebar);
})();
