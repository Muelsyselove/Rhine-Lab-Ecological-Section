/* eco-icon — SVG 图标组件，按名称引用注册表 */
(function () {
  class EcoIcon extends ECO.EcoElement {
    static get attrs() {
      return ['name', 'size'];
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const icon = window.ECO_ICONS[this.attr('name')];
      const size = this.attr('size', '16');
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: inline-flex; align-items: center; justify-content: center; flex: none; }
          svg { width: ${size}px; height: ${size}px; display: block; }
          svg.stroke { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
          svg.fill { fill: currentColor; stroke: none; }
        </style>
        ${icon ? `<svg viewBox="0 0 24 24" class="${icon.fill ? 'fill' : 'stroke'}" aria-hidden="true">${icon.body}</svg>` : ''}
      `;
    }
  }
  customElements.define('eco-icon', EcoIcon);
})();
