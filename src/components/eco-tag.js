/* eco-tag — 状态/元信息小标签，tone 控制语义色 */
(function () {
  const TONES = {
    dormant: 'var(--eco-st-dormant)',
    growing: 'var(--eco-st-growing)',
    planted: 'var(--eco-st-planted)',
    running: 'var(--eco-st-running)',
    error: 'var(--eco-st-error)',
    amber: 'var(--eco-amber)',
    plain: 'var(--eco-ink-3)',
  };

  class EcoTag extends ECO.EcoElement {
    static get attrs() {
      return ['tone', 'dot'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const tone = TONES[this.attr('tone', 'plain')] || TONES.plain;
      const dot = this.has('dot');
      const pulse = ['growing', 'running'].includes(this.attr('tone'));
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; }
          .tag {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 2px 8px;
            font-family: var(--eco-font-mono);
            font-size: 10px; letter-spacing: 0.1em;
            color: ${tone};
            background: color-mix(in srgb, ${tone} 10%, transparent);
            box-shadow: inset 0 0 0 1px color-mix(in srgb, ${tone} 38%, transparent);
            clip-path: var(--eco-clip-tag);
            white-space: nowrap;
          }
          .dot {
            width: 5px; height: 5px; border-radius: 50%;
            background: ${tone}; color: ${tone}; flex: none;
          }
          .dot.pulse { animation: eco-pulse-dot 1.6s ease-in-out infinite; }
          @keyframes eco-pulse-dot {
            0%,100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
            50% { opacity: .5; box-shadow: 0 0 0 3.5px transparent; }
          }
        </style>
        <span class="tag">${dot ? `<span class="dot ${pulse ? 'pulse' : ''}"></span>` : ''}<slot></slot></span>
      `;
    }
  }
  customElements.define('eco-tag', EcoTag);
})();
