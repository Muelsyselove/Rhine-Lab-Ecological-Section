/* eco-switch — 生态舱开关，change 事件携带 { checked } */
(function () {
  class EcoSwitch extends ECO.EcoElement {
    static get attrs() {
      return ['checked', 'disabled'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const checked = this.has('checked');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; }
          .track {
            width: 34px; height: 18px; position: relative; cursor: pointer;
            background: ${checked ? 'var(--eco-teal)' : 'rgba(13,74,63,.16)'};
            box-shadow: inset 0 0 0 1px ${checked ? 'var(--eco-teal-deep)' : 'var(--eco-line-strong)'};
            clip-path: var(--eco-clip-tag);
            transition: background var(--eco-t-fast) var(--eco-ease);
          }
          .thumb {
            position: absolute; top: 3px; left: ${checked ? '19px' : '3px'};
            width: 12px; height: 12px;
            background: ${checked ? '#fff' : 'var(--eco-ink-3)'};
            clip-path: var(--eco-clip-tag);
            transition: left var(--eco-t-fast) var(--eco-ease-spring),
                        background var(--eco-t-fast) var(--eco-ease);
          }
          :host([disabled]) .track { opacity: .45; cursor: not-allowed; }
        </style>
        <div class="track" role="switch" aria-checked="${checked}" tabindex="0"><div class="thumb"></div></div>
      `;
      const track = this.shadowRoot.querySelector('.track');
      const toggle = () => {
        if (this.has('disabled')) return;
        this.has('checked') ? this.removeAttribute('checked') : this.setAttribute('checked', '');
        this.emit('change', { checked: this.has('checked') });
      };
      track.addEventListener('click', toggle);
      track.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      });
    }
  }
  customElements.define('eco-switch', EcoSwitch);
})();
