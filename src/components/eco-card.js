/* eco-card — 培养舱玻璃面板，右上角切角 + 四角测绘标记 */
(function () {
  class EcoCard extends ECO.EcoElement {
    static get attrs() {
      return ['pad', 'hoverable', 'flat', 'stretch'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const pad = this.attr('pad', '16');
      const hoverable = this.has('hoverable');
      const flat = this.has('flat');
      const stretch = this.has('stretch');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .card {
            position: relative;
            padding: ${pad}px;
            background: ${flat ? 'var(--eco-glass-deep)' : 'var(--eco-glass)'};
            backdrop-filter: blur(14px) saturate(1.15);
            -webkit-backdrop-filter: blur(14px) saturate(1.15);
            box-shadow: inset 0 0 0 1px var(--eco-line), var(--eco-shadow);
            clip-path: var(--eco-clip-card);
            transition: box-shadow var(--eco-t) var(--eco-ease),
                        transform var(--eco-t) var(--eco-ease),
                        background var(--eco-t) var(--eco-ease);
          }
          /* stretch：宿主被 flex 拉伸时，内容列也随高度填充（供时间轴等长内容区） */
          ${stretch ? '.card { display: flex; flex-direction: column; height: 100%; min-height: 0; }' : ''}
          ${hoverable ? `
          .card:hover {
            transform: translateY(-3px);
            background: var(--eco-glass-strong);
            box-shadow: inset 0 0 0 1px rgba(15,154,138,.4), var(--eco-shadow-lift);
          }` : ''}
          /* 左上测绘标记 */
          .card::before {
            content: "+"; position: absolute; top: 2px; left: 6px;
            font-family: var(--eco-font-mono); font-size: 9px;
            color: var(--eco-ink-3); opacity: .6; pointer-events: none;
          }
        </style>
        <div class="card"><slot></slot></div>
      `;
    }
  }
  customElements.define('eco-card', EcoCard);
})();
