/* eco-settings-panel — 设置表单（置于 eco-modal 或页面内）
   property: settings；事件: save-settings { patch } / browse-root */
(function () {
  class EcoSettingsPanel extends ECO.EcoElement {
    set settings(s) {
      this._settings = s || {};
      if (this.isConnected) this.render();
    }
    get settings() {
      return this._settings || {};
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const s = this.settings;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .section { margin-bottom: 20px; }
          .section-title {
            display: flex; align-items: center; gap: 8px;
            font-family: var(--eco-font-mono); font-size: 9px;
            letter-spacing: .22em; color: var(--eco-teal-deep);
            text-transform: uppercase; margin-bottom: 10px;
          }
          .section-title::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line-strong); }
          .row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
          .row eco-input { flex: 1; }
          .switch-row {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; background: var(--eco-glass);
            box-shadow: inset 0 0 0 1px var(--eco-line); clip-path: var(--eco-clip-btn);
            margin-bottom: 12px;
          }
          .switch-row .txt { flex: 1; }
          .switch-row .t1 { font-size: 12.5px; font-weight: 600; color: var(--eco-ink); }
          .switch-row .t2 { font-size: 10.5px; color: var(--eco-ink-3); margin-top: 1px; }
          .note {
            font-family: var(--eco-font-mono); font-size: 9.5px;
            letter-spacing: .06em; color: var(--eco-ink-3); line-height: 1.7;
          }
          .ver {
            font-family: var(--eco-font-mono); font-weight: 600;
            color: var(--eco-teal-deep); margin-left: 4px;
          }
          .foot { display: flex; justify-content: flex-end; margin-top: 4px; }
        </style>
        <div class="section">
          <div class="section-title">CULTIVATION GROUND · 培育基地</div>
          <div class="row">
            <eco-input id="rootDir" label="统一根目录 / ROOT DIR" mono icon="folder"
              value="${ECO.esc(s.rootDir || '')}" placeholder="所有项目统一定植于此目录"></eco-input>
            <eco-button icon="folder-open" data-act="browse">浏览</eco-button>
          </div>
          <div class="switch-row">
            <div class="txt">
              <div class="t1">按分组建子目录</div>
              <div class="t2">开启后项目将定植于 根目录/分组名/项目名</div>
            </div>
            <eco-switch id="useRootDir" ${s.useRootDir !== false ? 'checked' : ''}></eco-switch>
          </div>
        </div>
        <div class="section">
          <div class="section-title">GROWTH RHYTHM · 生长节律</div>
          <div class="switch-row">
            <div class="txt">
              <div class="t1">自动接收远方来信</div>
              <div class="t2">启动时自动检查生态园项目的新 Release，来信将在卡片上提示</div>
            </div>
            <eco-switch id="autoUpdate" ${s.autoUpdate !== false ? 'checked' : ''}></eco-switch>
          </div>
        </div>
        <div class="section">
          <div class="section-title">SYSTEM · 系统维护</div>
          <div class="switch-row">
            <div class="txt">
              <div class="t1">ECO 启动器<span id="appVersion" class="ver"></span></div>
              <div class="t2">渠道：<span id="appChannel">…</span> · 卸载不影响样本数据（userData）与已种植项目</div>
            </div>
            <eco-button icon="trash" data-act="uninstall" style="display:none">卸载</eco-button>
          </div>
          <div class="note">※ 仓库源已内置：github.com/Muelsyselove（生态园项目与瑰丽花园均无需任何 GitHub 配置，开箱即用）。</div>
        </div>
        <div class="foot">
          <eco-button variant="primary" icon="check" data-act="save">保存配置</eco-button>
        </div>
      `;

      this.shadowRoot.querySelector('[data-act="browse"]').addEventListener('click', () => this.emit('browse-root'));
      this.shadowRoot.querySelector('[data-act="uninstall"]').addEventListener('click', () => this.emit('request-uninstall'));
      this.shadowRoot.querySelector('[data-act="save"]').addEventListener('click', () => {
        const val = (id) => this.shadowRoot.querySelector(id).value.trim();
        const useRootDir = this.shadowRoot.querySelector('#useRootDir').has('checked');
        const autoUpdate = this.shadowRoot.querySelector('#autoUpdate').has('checked');
        this.emit('save-settings', {
          patch: {
            rootDir: val('#rootDir'),
            useRootDir,
            autoUpdate,
          },
        });
      });

      // 应用信息：版本 + Debug/Release 渠道；正式安装版才显示卸载按钮
      this.applyAppInfo();
      if (!this._appInfo && typeof window.eco.getAppInfo === 'function') {
        window.eco
          .getAppInfo()
          .then((info) => {
            this._appInfo = info;
            this.applyAppInfo();
          })
          .catch(() => {});
      }
    }

    applyAppInfo() {
      const info = this._appInfo;
      if (!info || !this.shadowRoot) return;
      const ver = this.shadowRoot.querySelector('#appVersion');
      const chan = this.shadowRoot.querySelector('#appChannel');
      const btn = this.shadowRoot.querySelector('[data-act="uninstall"]');
      if (ver) ver.textContent = 'v' + (info.version || '');
      if (chan) chan.textContent = info.packaged ? '正式版 Release' : '开发版 Debug';
      if (btn) btn.style.display = info.packaged ? '' : 'none';
    }

    /** 供外部写入浏览到的目录 */
    setRootDir(dir) {
      const input = this.shadowRoot && this.shadowRoot.querySelector('#rootDir');
      if (input) input.setAttribute('value', dir);
    }
  }
  customElements.define('eco-settings-panel', EcoSettingsPanel);
})();
