/* eco-button — 切角按钮：primary / ghost / outline / danger */
(function () {
  class EcoButton extends ECO.EcoElement {
    static get attrs() {
      return ['variant', 'icon', 'loading', 'disabled', 'size'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const variant = this.attr('variant', 'ghost');
      const size = this.attr('size', 'md');
      const icon = this.attr('icon');
      const loading = this.has('loading');
      const disabled = this.has('disabled');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; }
          button {
            display: inline-flex; align-items: center; gap: 7px;
            padding: ${size === 'sm' ? '5px 12px' : '8px 18px'};
            font-family: var(--eco-font-display);
            font-size: ${size === 'sm' ? '12px' : '13px'};
            font-weight: 600; letter-spacing: 0.06em;
            color: var(--eco-ink);
            clip-path: var(--eco-clip-btn);
            border: none; cursor: pointer; position: relative; overflow: hidden;
            transition: transform var(--eco-t-fast) var(--eco-ease),
                        box-shadow var(--eco-t-fast) var(--eco-ease),
                        background var(--eco-t-fast) var(--eco-ease),
                        color var(--eco-t-fast) var(--eco-ease);
            background: var(--eco-glass);
            box-shadow: inset 0 0 0 1px var(--eco-line-strong);
            backdrop-filter: blur(8px);
          }
          button:hover { background: var(--eco-glass-strong); transform: translateY(-1px); }
          button:active { transform: translateY(0) scale(0.985); }
          /* 扫光 */
          button::after {
            content: ""; position: absolute; top: 0; bottom: 0; width: 34%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
            transform: translateX(-140%) skewX(-18deg); pointer-events: none;
          }
          button:hover::after { animation: eco-scan-sweep .55s var(--eco-ease); }
          button.primary {
            background: linear-gradient(135deg, var(--eco-teal) 0%, var(--eco-teal-deep) 100%);
            color: var(--eco-ink-inverse); box-shadow: 0 4px 16px rgba(15,154,138,.35);
          }
          button.primary:hover { box-shadow: 0 6px 22px rgba(15,154,138,.5); }
          button.outline {
            background: transparent; color: var(--eco-teal-deep);
            box-shadow: inset 0 0 0 1px var(--eco-teal);
          }
          button.outline:hover { background: rgba(15,154,138,.1); }
          button.danger {
            background: linear-gradient(135deg, #e05244 0%, #b93025 100%);
            color: var(--eco-ink-inverse);
          }
          button:disabled { opacity: .45; cursor: not-allowed; transform: none; }
          .spinner {
            width: 12px; height: 12px; border-radius: 50%;
            border: 2px solid currentColor; border-top-color: transparent;
            animation: eco-spin .7s linear infinite;
          }
          @keyframes eco-spin { to { transform: rotate(360deg); } }
          @keyframes eco-scan-sweep {
            from { transform: translateX(-140%) skewX(-18deg); }
            to { transform: translateX(320%) skewX(-18deg); }
          }
        </style>
        <button class="${variant}" ${disabled || loading ? 'disabled' : ''}>
          ${loading ? '<span class="spinner"></span>' : icon ? `<eco-icon name="${icon}" size="14"></eco-icon>` : ''}
          <slot></slot>
        </button>
      `;
    }
  }
  customElements.define('eco-button', EcoButton);
})();
