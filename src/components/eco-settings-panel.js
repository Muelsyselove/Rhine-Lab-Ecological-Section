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
          <div class="switch-row">
            <div class="txt">
              <div class="t1">自我更新<span id="updState" class="ver" style="margin-left:8px"></span></div>
              <div class="t2" id="updHint">检查 GitHub Release，在应用内完成下载与升级</div>
              <eco-progress id="updProg" style="display:none;margin-top:8px"></eco-progress>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
              <eco-button icon="sync" data-act="upd-check">检查更新</eco-button>
              <eco-button variant="primary" icon="download" data-act="upd-download" style="display:none">下载更新</eco-button>
              <eco-button variant="primary" icon="check" data-act="upd-install" style="display:none">重启安装</eco-button>
            </div>
          </div>
          <div class="note">※ 仓库源已内置：github.com/Muelsyselove（生态园项目与瑰丽花园均无需任何 GitHub 配置，开箱即用）。</div>
        </div>
        <div class="foot">
          <eco-button variant="primary" icon="check" data-act="save">保存配置</eco-button>
        </div>
      `;

      this.shadowRoot.querySelector('[data-act="browse"]').addEventListener('click', () => this.emit('browse-root'));
      this.shadowRoot.querySelector('[data-act="uninstall"]').addEventListener('click', () => this.emit('request-uninstall'));
      // 自我更新
      this.shadowRoot.querySelector('[data-act="upd-check"]').addEventListener('click', () => this.runSelfUpdateCheck());
      this.shadowRoot.querySelector('[data-act="upd-download"]').addEventListener('click', () => this.runSelfUpdateDownload());
      this.shadowRoot.querySelector('[data-act="upd-install"]').addEventListener('click', () => this.runSelfUpdateInstall());
      this.applyUpdateUi();
      // 下载进度订阅只挂一次（render 会重建按钮，但订阅挂在 window 上）
      if (!this._updProgressWired && typeof window.eco.onSelfUpdateProgress === 'function') {
        this._updProgressWired = true;
        window.eco.onSelfUpdateProgress((p) => {
          const bar = this.shadowRoot && this.shadowRoot.querySelector('#updProg');
          const hint = this.shadowRoot && this.shadowRoot.querySelector('#updHint');
          if (bar && p.percent >= 0) bar.setAttribute('value', String(p.percent));
          if (hint && p.total) {
            const mb = (n) => (n / 1048576).toFixed(1);
            hint.textContent = `正在下载 · ${p.percent}%（${mb(p.got)} / ${mb(p.total)} MB）`;
          }
        });
      }
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

    /* ---------- 自我更新 ---------- */

    async runSelfUpdateCheck() {
      if (typeof window.eco.checkSelfUpdate !== 'function') return;
      const state = this.shadowRoot.querySelector('#updState');
      const hint = this.shadowRoot.querySelector('#updHint');
      if (state) state.textContent = '';
      if (hint) hint.textContent = '正在检查 GitHub Release…';
      try {
        this._upd = await window.eco.checkSelfUpdate();
      } catch (err) {
        if (hint) hint.textContent = `检查失败：${(err && err.message) || err}`;
        return;
      }
      this.applyUpdateUi();
    }

    applyUpdateUi() {
      if (!this.shadowRoot) return;
      const u = this._upd;
      const state = this.shadowRoot.querySelector('#updState');
      const hint = this.shadowRoot.querySelector('#updHint');
      const check = this.shadowRoot.querySelector('[data-act="upd-check"]');
      const dl = this.shadowRoot.querySelector('[data-act="upd-download"]');
      const ins = this.shadowRoot.querySelector('[data-act="upd-install"]');
      if (!u || !state || !hint) return;
      if (this._updFile) {
        // 已下载：等待重启安装
        state.textContent = ` v${u.latestVersion} 已就绪`;
        hint.textContent = '安装包已就绪，点击「重启安装」进入安装向导';
        if (check) check.style.display = 'none';
        if (dl) dl.style.display = 'none';
        if (ins) ins.style.display = '';
        return;
      }
      if (!u.packaged) {
        state.textContent = '';
        hint.textContent = '开发版（Debug）不支持自我更新，请使用安装版（Release）';
        if (check) check.style.display = 'none';
        if (dl) dl.style.display = 'none';
        if (ins) ins.style.display = 'none';
        return;
      }
      if (u.hasUpdate) {
        state.textContent = ` 发现 v${u.latestVersion}`;
        const mb = u.asset && u.asset.size ? `（约 ${(u.asset.size / 1048576).toFixed(1)} MB）` : '';
        hint.textContent = `当前 v${u.current}${mb}，可升级至 v${u.latestVersion}`;
        if (check) check.style.display = '';
        if (dl) dl.style.display = '';
        if (ins) ins.style.display = 'none';
      } else {
        state.textContent = '';
        hint.textContent = `已是最新版本（v${u.current}）`;
        if (check) check.style.display = '';
        if (dl) dl.style.display = 'none';
        if (ins) ins.style.display = 'none';
      }
    }

    async runSelfUpdateDownload() {
      if (!this._upd || !this._upd.asset) return;
      const bar = this.shadowRoot.querySelector('#updProg');
      const hint = this.shadowRoot.querySelector('#updHint');
      if (bar) {
        bar.style.display = '';
        bar.setAttribute('value', '0');
      }
      if (hint) hint.textContent = '正在下载更新…';
      try {
        const r = await window.eco.downloadSelfUpdate(this._upd.asset);
        this._updFile = r && r.path;
        ECO.toast('更新包下载完成，可重启安装', 'ok');
      } catch (err) {
        if (bar) bar.style.display = 'none';
        if (hint) hint.textContent = `下载失败：${(err && err.message) || err}`;
        return;
      }
      if (bar) bar.style.display = 'none';
      this.applyUpdateUi();
    }

    runSelfUpdateInstall() {
      if (!this._updFile) return;
      window.eco.installSelfUpdate(this._updFile).then((r) => {
        if (!r || !r.ok) ECO.toast((r && r.error) || '启动安装失败', 'error');
      });
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
