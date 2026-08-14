/* eco-toast-host — 通知宿主；监听 window 的 eco:toast 事件
   用法: window.dispatchEvent(new CustomEvent('eco:toast', { detail: { type, text } })) */
(function () {
  class EcoToastHost extends ECO.EcoElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          .stack {
            position: fixed; right: 20px; bottom: calc(var(--eco-statusbar-h) + 16px);
            z-index: 120; display: flex; flex-direction: column; gap: 10px;
            width: 320px; pointer-events: none;
          }
          .toast {
            display: flex; gap: 10px; align-items: flex-start;
            padding: 11px 14px; pointer-events: auto;
            background: var(--eco-glass-deep);
            backdrop-filter: blur(18px);
            box-shadow: inset 0 0 0 1px var(--eco-line-strong), var(--eco-shadow);
            clip-path: var(--eco-clip-card);
            animation: eco-toast-in .3s var(--eco-ease-spring);
            font-size: 12.5px; color: var(--eco-ink);
          }
          .toast.leaving { animation: eco-toast-out .25s var(--eco-ease) forwards; }
          .bar { width: 3px; align-self: stretch; flex: none; }
          .ok .bar { background: var(--eco-teal); }
          .error .bar { background: var(--eco-red); }
          .info .bar { background: var(--eco-cyan); }
          .ok eco-icon { color: var(--eco-teal); }
          .error eco-icon { color: var(--eco-red); }
          .info eco-icon { color: var(--eco-cyan); }
          .text { flex: 1; line-height: 1.5; word-break: break-all; }
          @keyframes eco-toast-in {
            from { opacity: 0; transform: translateX(30px); }
          }
          @keyframes eco-toast-out {
            to { opacity: 0; transform: translateX(30px); }
          }
        </style>
        <div class="stack"></div>
      `;
      this.stack = this.shadowRoot.querySelector('.stack');
      this._onToast = (e) => this.show(e.detail || {});
      window.addEventListener('eco:toast', this._onToast);
    }

    disconnectedCallback() {
      window.removeEventListener('eco:toast', this._onToast);
    }

    show({ type = 'info', text = '', duration = 3200 }) {
      const icons = { ok: 'check', error: 'alert', info: 'info' };
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `
        <span class="bar"></span>
        <eco-icon name="${icons[type] || 'info'}" size="15"></eco-icon>
        <span class="text">${ECO.esc(text)}</span>
      `;
      this.stack.appendChild(el);
      setTimeout(() => {
        el.classList.add('leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
      }, duration);
    }
  }
  customElements.define('eco-toast-host', EcoToastHost);

  /** 全局便捷方法 */
  ECO.toast = (text, type = 'info') =>
    window.dispatchEvent(new CustomEvent('eco:toast', { detail: { text, type } }));
})();
