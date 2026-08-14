/* eco-segmented — 分段筛选器；options 经属性值传入
   el.options = [{ value, label }]; change 事件携带 { value } */
(function () {
  class EcoSegmented extends ECO.EcoElement {
    static get attrs() {
      return ['value'];
    }

    set options(list) {
      this._options = list || [];
      if (this.isConnected) this.render();
    }
    get options() {
      return this._options || [];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const value = this.attr('value');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; }
          .group {
            display: inline-flex; padding: 3px; gap: 2px;
            background: var(--eco-glass);
            backdrop-filter: blur(8px);
            box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-btn);
          }
          .item {
            padding: 5px 13px;
            font-family: var(--eco-font-mono); font-size: 11px; letter-spacing: .08em;
            color: var(--eco-ink-2); clip-path: var(--eco-clip-tag);
            border: none; background: transparent; cursor: pointer;
            transition: all var(--eco-t-fast) var(--eco-ease);
            white-space: nowrap;
          }
          .item:hover { color: var(--eco-teal-deep); background: rgba(15,154,138,.08); }
          .item.active {
            background: linear-gradient(135deg, var(--eco-teal), var(--eco-teal-deep));
            color: var(--eco-ink-inverse);
            box-shadow: 0 2px 10px rgba(15,154,138,.35);
          }
        </style>
        <div class="group">
          ${this.options
            .map(
              (o) => `
            <button class="item ${o.value === value ? 'active' : ''}" data-value="${ECO.esc(o.value)}">
              ${ECO.esc(o.label)}
            </button>`
            )
            .join('')}
        </div>
      `;
      this.shadowRoot.querySelectorAll('.item').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.setAttribute('value', btn.dataset.value);
          this.emit('change', { value: btn.dataset.value });
        });
      });
    }
  }
  customElements.define('eco-segmented', EcoSegmented);
})();
