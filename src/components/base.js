/* ============================================================
   ECO 组件基类 — 所有 Web Components 的公共底座
   提供：属性变更自动重渲染 / 事件发射 / 属性读取
   ============================================================ */
(function () {
  window.ECO = window.ECO || {};

  class EcoElement extends HTMLElement {
    static get observedAttributes() {
      return this.attrs || [];
    }

    connectedCallback() {
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }

    /** 向上冒泡的自定义事件（穿透 Shadow DOM） */
    emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    attr(name, fallback = '') {
      const v = this.getAttribute(name);
      return v === null ? fallback : v;
    }

    has(name) {
      return this.hasAttribute(name);
    }

    render() {}
  }

  /** 转义 HTML，防止注入 */
  ECO.esc = function (value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  ECO.EcoElement = EcoElement;
})();
