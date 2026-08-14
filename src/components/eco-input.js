/* eco-input — 玻璃录入框，input 事件携带 { value }，enter 事件回车触发 */
(function () {
  class EcoInput extends ECO.EcoElement {
    static get attrs() {
      return ['value', 'placeholder', 'icon', 'mono', 'type', 'label'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const icon = this.attr('icon');
      const label = this.attr('label');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .field {
            display: flex; align-items: center; gap: 8px;
            padding: 7px 12px;
            background: var(--eco-glass);
            backdrop-filter: blur(8px);
            box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-btn);
            transition: box-shadow var(--eco-t-fast) var(--eco-ease),
                        background var(--eco-t-fast) var(--eco-ease);
          }
          .field:focus-within {
            background: var(--eco-glass-strong);
            box-shadow: inset 0 0 0 1px var(--eco-teal), 0 0 0 3px rgba(15,154,138,.12);
          }
          eco-icon { color: var(--eco-ink-3); }
          input {
            flex: 1; min-width: 0; border: none; outline: none; background: transparent;
            font-size: 13px; color: var(--eco-ink);
            font-family: ${this.has('mono') ? 'var(--eco-font-mono)' : 'var(--eco-font-body)'};
          }
          input::placeholder { color: var(--eco-ink-3); }
          .label {
            font-family: var(--eco-font-mono); font-size: 9px;
            letter-spacing: .16em; color: var(--eco-ink-3);
            text-transform: uppercase; margin-bottom: 5px; display: block;
          }
        </style>
        ${label ? `<span class="label">${ECO.esc(label)}</span>` : ''}
        <div class="field">
          ${icon ? `<eco-icon name="${icon}" size="14"></eco-icon>` : ''}
          <input type="${this.attr('type', 'text')}" value="${ECO.esc(this.attr('value'))}"
                 placeholder="${ECO.esc(this.attr('placeholder'))}" spellcheck="false" />
        </div>
      `;
      const input = this.shadowRoot.querySelector('input');
      input.addEventListener('input', () => this.emit('input', { value: input.value }));
      input.addEventListener('change', () => this.emit('change', { value: input.value }));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.emit('enter', { value: input.value });
      });
    }

    get value() {
      const input = this.shadowRoot && this.shadowRoot.querySelector('input');
      return input ? input.value : this.attr('value');
    }
  }
  customElements.define('eco-input', EcoInput);
})();
