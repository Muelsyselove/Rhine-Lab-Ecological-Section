/* eco-modal — 切角观测窗：title / 默认 / footer 三个插槽，close 事件 */
(function () {
  class EcoModal extends ECO.EcoElement {
    static get attrs() {
      return ['open', 'width', 'kicker'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const open = this.has('open');
      const width = this.attr('width', '560');
      const kicker = this.attr('kicker', 'ECO // OBSERVATION WINDOW');
      this.shadowRoot.innerHTML = `
        <style>
          .backdrop {
            position: fixed; inset: 0; z-index: 90;
            display: ${open ? 'flex' : 'none'};
            align-items: center; justify-content: center;
            background: rgba(16, 46, 39, 0.32);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            animation: eco-fade-in .2s var(--eco-ease);
          }
          .panel {
            width: min(${width}px, calc(100vw - 64px));
            max-height: calc(100vh - 120px);
            display: flex; flex-direction: column;
            background: var(--eco-glass-deep);
            backdrop-filter: blur(22px) saturate(1.2);
            box-shadow: inset 0 0 0 1px var(--eco-line-strong), var(--eco-shadow-lift);
            clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px));
            animation: eco-pop .28s var(--eco-ease-spring);
          }
          .head {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 18px 12px; flex: none;
            border-bottom: 1px dashed var(--eco-line-strong);
          }
          .titles { flex: 1; min-width: 0; }
          .kicker {
            font-family: var(--eco-font-mono); font-size: 9px;
            letter-spacing: .2em; color: var(--eco-teal-deep); text-transform: uppercase;
          }
          .title {
            font-family: var(--eco-font-display); font-size: 16px; font-weight: 700;
            color: var(--eco-ink); margin-top: 1px;
          }
          .close-btn {
            width: 28px; height: 28px; display: grid; place-items: center;
            color: var(--eco-ink-2); clip-path: var(--eco-clip-tag);
            border: none; background: transparent; cursor: pointer;
            transition: all var(--eco-t-fast) var(--eco-ease);
          }
          .close-btn:hover { background: rgba(211,63,51,.14); color: var(--eco-red); }
          .body { padding: 18px; overflow-y: auto; flex: 1; }
          .foot {
            padding: 12px 18px; flex: none;
            border-top: 1px dashed var(--eco-line-strong);
            display: flex; justify-content: flex-end; gap: 10px;
          }
          .foot:empty, ::slotted([slot="footer"]:empty) { display: none; }
          @keyframes eco-fade-in { from { opacity: 0; } }
          @keyframes eco-pop {
            from { opacity: 0; transform: translateY(16px) scale(.97); }
          }
        </style>
        <div class="backdrop">
          <div class="panel" role="dialog">
            <div class="head">
              <div class="titles">
                <div class="kicker">${ECO.esc(kicker)}</div>
                <div class="title"><slot name="title"></slot></div>
              </div>
              <button class="close-btn" aria-label="关闭"><eco-icon name="close" size="15"></eco-icon></button>
            </div>
            <div class="body"><slot></slot></div>
            <div class="foot"><slot name="footer"></slot></div>
          </div>
        </div>
      `;
      const backdrop = this.shadowRoot.querySelector('.backdrop');
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.emit('close');
      });
      this.shadowRoot.querySelector('.close-btn').addEventListener('click', () => this.emit('close'));
    }
  }
  customElements.define('eco-modal', EcoModal);
})();
