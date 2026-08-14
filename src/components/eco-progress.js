/* eco-progress — 培养进度条：数值 / 不定态 / 流光 */
(function () {
  class EcoProgress extends ECO.EcoElement {
    static get attrs() {
      return ['value', 'indeterminate', 'tone'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const indeterminate = this.has('indeterminate');
      const value = Math.max(0, Math.min(100, Number(this.attr('value', '0'))));
      const tone = this.attr('tone', 'var(--eco-teal)');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .track {
            position: relative; height: 5px; overflow: hidden;
            background: rgba(13,74,63,.1);
            box-shadow: inset 0 0 0 1px rgba(13,74,63,.08);
            clip-path: polygon(2px 0, 100% 0, calc(100% - 2px) 100%, 0 100%);
          }
          .bar {
            height: 100%; position: relative; overflow: hidden;
            width: ${indeterminate ? '38%' : value + '%'};
            background: linear-gradient(90deg, ${tone}, color-mix(in srgb, ${tone} 60%, var(--eco-mint)));
            transition: width .3s var(--eco-ease);
          }
          .bar::after {
            content: ""; position: absolute; top: 0; bottom: 0; width: 45%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent);
            animation: eco-shimmer 1.4s linear infinite;
          }
          ${indeterminate ? `.bar { animation: eco-indet 1.15s var(--eco-ease) infinite; }` : ''}
          @keyframes eco-shimmer { from { transform: translateX(-100%);} to { transform: translateX(230%);} }
          @keyframes eco-indet {
            0% { margin-left: -38%; }
            100% { margin-left: 100%; }
          }
        </style>
        <div class="track"><div class="bar"></div></div>
      `;
    }
  }
  customElements.define('eco-progress', EcoProgress);
})();
