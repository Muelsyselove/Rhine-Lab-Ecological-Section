/* eco-project-detail — 项目观测窗内容（置于 eco-modal 内）
   property: project / logs / progress
   事件: card-action { id, action } / save-project { id, patch } / browse-dir { id } / open-repo { url } */
(function () {
  const STATUS = {
    not_installed: { zh: '未种植', en: 'DORMANT', tone: 'dormant' },
    installing: { zh: '培育中', en: 'GROWING', tone: 'growing' },
    installed: { zh: '已长成', en: 'PLANTED', tone: 'planted' },
    running: { zh: '观察中', en: 'OBSERVING', tone: 'running' },
    error: { zh: '枯萎', en: 'WILTED', tone: 'error' },
  };

  function hasUpdate(p) {
    return p.version && p.latestVersion && p.latestVersion !== p.version && p.latestVersion !== p.ignoredVersion;
  }

  class EcoProjectDetail extends ECO.EcoElement {
    set project(p) {
      this._project = p;
      if (this.isConnected) this.render();
    }
    get project() {
      return this._project || {};
    }

    set logs(list) {
      this._logs = list || [];
      this.renderLogs();
    }
    get logs() {
      return this._logs || [];
    }

    set progress(info) {
      this._progress = info;
    }

    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const p = this.project;
      const st = STATUS[p.status] || STATUS.not_installed;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .head { display: flex; gap: 13px; align-items: center; margin-bottom: 15px; }
          .who { flex: 1; min-width: 0; }
          .pname { font-family: var(--eco-font-display); font-size: 19px; font-weight: 700; color: var(--eco-ink); }
          .repo-link {
            display: inline-flex; align-items: center; gap: 5px; margin-top: 2px;
            font-family: var(--eco-font-mono); font-size: 10.5px; color: var(--eco-teal-deep);
            cursor: pointer; letter-spacing: .04em;
          }
          .repo-link:hover { text-decoration: underline; }
          .facts {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 8px; margin-bottom: 15px;
          }
          .fact {
            padding: 8px 11px; background: var(--eco-glass);
            box-shadow: inset 0 0 0 1px var(--eco-line); clip-path: var(--eco-clip-tag);
          }
          .fk { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .18em; color: var(--eco-ink-3); text-transform: uppercase; }
          .fv { font-size: 12.5px; font-weight: 600; color: var(--eco-ink); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .row { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
          .row eco-input { flex: 1; }
          .console {
            background: rgba(10, 36, 30, 0.88);
            clip-path: var(--eco-clip-card);
            padding: 12px 14px; height: 168px; overflow-y: auto;
            font-family: var(--eco-font-mono); font-size: 10.5px; line-height: 1.7;
            color: #9fe8d4; margin-top: 4px;
          }
          .console .stderr { color: #f2a99f; }
          .console .placeholder { color: rgba(159, 232, 212, 0.4); letter-spacing: .1em; }
          .actions {
            display: flex; gap: 9px; align-items: center; margin-top: 15px;
            padding-top: 13px; border-top: 1px dashed var(--eco-line-strong);
          }
          .spacer { flex: 1; }
          .mail-banner {
            display: flex; align-items: center; gap: 9px;
            padding: 9px 12px; margin-bottom: 15px;
            background: color-mix(in srgb, var(--eco-amber) 9%, transparent);
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--eco-amber) 42%, transparent);
            clip-path: var(--eco-clip-btn);
            font-size: 12px; color: var(--eco-ink);
          }
          .mail-banner eco-icon { color: var(--eco-amber); flex: none; }
          .mail-banner .mono { font-family: var(--eco-font-mono); font-size: 10.5px; color: var(--eco-amber); }
          .clabel {
            font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .2em;
            color: var(--eco-teal-deep); margin: 14px 0 6px; display: flex; align-items: center; gap: 8px;
          }
          .clabel::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line-strong); }
        </style>
        <div class="head">
          ${ECO.avatarSVG(p.name, 48)}
          <div class="who">
            <div class="pname">${ECO.esc(p.name)}</div>
            ${p.repoUrl ? `<span class="repo-link" data-act="open-repo"><eco-icon name="arrow-up-right" size="11"></eco-icon>${ECO.esc(p.repo)}</span>` : ''}
          </div>
          <eco-tag tone="${st.tone}" dot>${st.zh} · ${st.en}</eco-tag>
        </div>
        <div class="facts">
          <div class="fact"><div class="fk">语言 LANG</div><div class="fv">${ECO.esc(p.language || '—')}</div></div>
          <div class="fact"><div class="fk">当前版本 VER</div><div class="fv">${ECO.esc(p.version || '—')}</div></div>
          <div class="fact"><div class="fk">远方来信 LATEST</div><div class="fv">${ECO.esc(p.latestVersion || '—')}</div></div>
          <div class="fact"><div class="fk">来源 SOURCE</div><div class="fv">${p.source === 'local' ? '本地登记' : 'GitHub'}</div></div>
        </div>
        ${hasUpdate(p) ? `
        <div class="mail-banner">
          <eco-icon name="mail" size="15"></eco-icon>
          <span>远方来信：发现新版本</span>
          <span class="mono">${ECO.esc(p.version)} → ${ECO.esc(p.latestVersion)}</span>
        </div>` : ''}
        <div class="row">
          <eco-input id="group" label="分组 / GROUP" icon="sprout" value="${ECO.esc(p.group || '')}"></eco-input>
        </div>
        <div class="row">
          <eco-input id="installDir" label="自定义定植路径 / INSTALL DIR（留空 = 根目录/分组/项目名）" mono icon="folder"
            value="${ECO.esc(p.installDir || '')}" placeholder="默认使用统一根目录"></eco-input>
          <eco-button icon="folder-open" data-act="browse">浏览</eco-button>
        </div>
        <div class="row">
          <eco-input id="launchCmd" label="启动命令 / LAUNCH CMD（留空自动探测 npm start / dev）" mono icon="terminal"
            value="${ECO.esc(p.launchCmd || '')}" placeholder="例如: npm run start 或 python main.py"></eco-input>
          <eco-button icon="check" data-act="save">保存</eco-button>
        </div>
        <div class="clabel">CULTURE LOG · 培养日志</div>
        <div class="console"><div class="placeholder">// 暂无日志，执行「种植」后此处将输出实时记录</div></div>
        <div class="actions">
          ${this.actionsFor(p)}
          <span class="spacer"></span>
          ${p.installPath ? '<eco-button icon="folder-open" data-act="open-folder">打开目录</eco-button>' : ''}
          ${p.installPath && p.source !== 'local' ? '<eco-button icon="sprout" data-act="transplant">移植</eco-button>' : ''}
          <eco-button variant="danger" icon="trash" data-act="uninstall">${p.source === 'local' ? '取消登记' : '卸载'}</eco-button>
        </div>
      `;

      this.shadowRoot.querySelectorAll('[data-act]').forEach((el) => {
        el.addEventListener('click', () => {
          const act = el.dataset.act;
          if (act === 'save') {
            this.emit('save-project', {
              id: p.id,
              patch: {
                group: this.shadowRoot.querySelector('#group').value.trim() || '未分组',
                installDir: this.shadowRoot.querySelector('#installDir').value.trim(),
                launchCmd: this.shadowRoot.querySelector('#launchCmd').value.trim(),
              },
            });
          } else if (act === 'browse') {
            this.emit('browse-dir', { id: p.id });
          } else if (act === 'open-repo') {
            this.emit('open-repo', { url: p.repoUrl });
          } else {
            this.emit('card-action', { id: p.id, action: act });
          }
        });
      });
      this.renderLogs();
    }

    actionsFor(p) {
      if (p.status === 'running') {
        return '<eco-button variant="outline" icon="stop" data-act="stop">停止观察</eco-button>';
      }
      if (p.status === 'installing') {
        return '<eco-button variant="primary" loading disabled>培育中…</eco-button>';
      }
      if (p.status === 'error') {
        return '<eco-button variant="primary" icon="sync" data-act="install">重新种植</eco-button>';
      }
      if (hasUpdate(p)) {
        return `
          <eco-button variant="primary" icon="mail" data-act="update">生长</eco-button>
          <eco-button data-act="ignore-update">这样就够了</eco-button>
          <eco-button variant="outline" icon="eye" data-act="launch">观察</eco-button>`;
      }
      const map = {
        not_installed: '<eco-button variant="primary" icon="download" data-act="install">种植</eco-button>',
        installed: '<eco-button variant="primary" icon="eye" data-act="launch">观察</eco-button>',
      };
      return map[p.status] || '';
    }

    renderLogs() {
      const box = this.shadowRoot && this.shadowRoot.querySelector('.console');
      if (!box) return;
      if (!this.logs.length) return;
      box.innerHTML = this.logs
        .slice(-300)
        .map((l) => `<div class="${l.stderr ? 'stderr' : ''}">${ECO.esc(l.line)}</div>`)
        .join('');
      box.scrollTop = box.scrollHeight;
    }

    /** 外部写入浏览到的目录 */
    setInstallDir(dir) {
      const input = this.shadowRoot && this.shadowRoot.querySelector('#installDir');
      if (input) input.setAttribute('value', dir);
    }
  }
  customElements.define('eco-project-detail', EcoProjectDetail);
})();
