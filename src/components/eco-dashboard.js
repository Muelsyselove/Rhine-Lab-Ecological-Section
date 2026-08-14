/* eco-dashboard — 生态监测站（doinday 设备活动仪表盘）
   数据来源：主进程 dashboard 服务（Chromium 网络栈，不受页面 CSP 限制）
   property: data { date, current, timeline } / loading / error
   自身负责拉取与刷新；向上冒泡事件：无（自给自足视图） */
(function () {
  // 按应用聚合当日驻留时长（分钟），降序
  function aggregate(segments) {
    const map = new Map();
    (segments || []).forEach((s) => {
      if (s.app_id === '用户离开') return; // 挂机单独呈现
      const key = s.app_name || s.app_id;
      map.set(key, (map.get(key) || 0) + (s.duration_minutes || 0));
    });
    return [...map.entries()].map(([name, mins]) => ({ name, mins })).sort((a, b) => b.mins - a.mins);
  }

  function fmtMins(m) {
    if (m >= 60) return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
    return `${m}m`;
  }
  function hm(ts) {
    return (ts || '').slice(11, 16); // "YYYY-MM-DD HH:MM:SS" -> HH:MM
  }

  class EcoDashboard extends ECO.EcoElement {
    constructor() {
      super();
      this._data = null;
      this._loading = false;
      this._error = '';
      this._date = this.today();
      this._auto = true;
    }

    connectedCallback() {
      this.render();
      this.refresh();
      // 每 30s 自动刷新「此刻」；时间线随刷新同步
      this._timer = setInterval(() => {
        if (this._auto && this.isConnected) this.refresh(true);
      }, 30000);
    }
    disconnectedCallback() {
      clearInterval(this._timer);
    }

    today() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }

    async refresh(silent) {
      if (this._loading) return;
      this._loading = true;
      if (!silent) { this._error = ''; this.render(); }
      try {
        const data = await window.eco.fetchDashboard({ date: this._date });
        this._data = data;
        this._error = '';
      } catch (err) {
        this._error = (err && err.message) || String(err);
      }
      this._loading = false;
      if (this.isConnected) this.render();
    }

    shift(day) {
      const d = new Date(`${this._date}T00:00:00`);
      d.setDate(d.getDate() + day);
      const p = (n) => String(n).padStart(2, '0');
      this._date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      this.refresh();
    }

    /* ---------- 渲染 ---------- */
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const d = this._data || {};
      // 兼容两种来源：dashboard 直返（devices/active_device 在顶层）与 current+timeline 组合
      const cur = d.current || d;
      const devices = cur.devices || [];
      const timeline = d.timeline || {};
      const segs = timeline.segments || [];
      const apps = aggregate(segs);
      const away = segs.filter((s) => s.app_id === '用户离开').reduce((a, s) => a + (s.duration_minutes || 0), 0);
      const total = apps.reduce((a, x) => a + x.mins, 0);
      const maxMins = apps.length ? apps[0].mins : 1;
      const stats = d.stats || {};
      const summary = d.daily_summary || '';
      const online = devices.find((x) => x.is_online);

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .span2 { grid-column: 1 / -1; }

          .sec-title {
            display: flex; align-items: center; gap: 8px;
            font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .22em;
            color: var(--eco-teal-deep); text-transform: uppercase; margin-bottom: 12px;
          }
          .sec-title::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line-strong); }

          /* 头部状态带 */
          .hero { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
          .pulse-dot { width: 10px; height: 10px; border-radius: 50%; flex: none;
            background: ${online ? 'var(--eco-st-running)' : 'var(--eco-st-dormant)'};
            box-shadow: 0 0 0 4px ${online ? 'rgba(63,174,92,.18)' : 'rgba(138,163,155,.18)'};
            ${online ? 'animation: eco-pulse 2s var(--eco-ease) infinite;' : ''} }
          @keyframes eco-pulse { 0%,100%{ box-shadow: 0 0 0 3px rgba(63,174,92,.25);} 50%{ box-shadow: 0 0 0 7px rgba(63,174,92,.06);} }
          .hero .now { flex: 1; min-width: 0; }
          .hero .app { font-size: 16px; font-weight: 700; color: var(--eco-ink); letter-spacing: .02em; }
          .hero .title { font-size: 11px; color: var(--eco-ink-3); margin-top: 2px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hero .meta { text-align: right; }
          .hero .meta .t { font-family: var(--eco-font-mono); font-size: 15px; font-weight: 600; color: var(--eco-teal-deep); }
          .hero .meta .s { font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .14em; color: var(--eco-ink-3); }

          /* 设备芯片 */
          .chips { display: flex; flex-wrap: wrap; gap: 9px; }
          .chip {
            display: flex; align-items: center; gap: 9px; padding: 8px 11px;
            background: var(--eco-glass); box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-btn);
          }
          .chip.on { box-shadow: inset 0 0 0 1px rgba(15,154,138,.45); background: var(--eco-glass-strong); }
          .chip .dn { font-size: 12px; font-weight: 600; color: var(--eco-ink); }
          .chip .dp { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .12em; color: var(--eco-ink-3); }
          .chip .bat { font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-teal-deep); display: inline-flex; align-items: center; gap: 3px; }

          /* 应用驻留条形 */
          .bar-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
          .bar-row .nm { width: 150px; flex: none; font-size: 11.5px; color: var(--eco-ink-2);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .bar-row .track { flex: 1; height: 12px; background: rgba(13,74,63,.06);
            clip-path: var(--eco-clip-tag); overflow: hidden; }
          .bar-row .fill { height: 100%; background: linear-gradient(90deg, var(--eco-teal), var(--eco-cyan));
            clip-path: var(--eco-clip-tag); transition: width .5s var(--eco-ease); }
          .bar-row .val { width: 58px; flex: none; text-align: right;
            font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-teal-deep); }

          /* 时间线 */
          .tl { position: relative; max-height: 380px; overflow-y: auto; padding-right: 6px; }
          .tl-item { display: flex; gap: 11px; padding: 6px 0; position: relative; }
          .tl-item::before { content: ""; position: absolute; left: 5px; top: 22px; bottom: -4px;
            width: 1px; background: var(--eco-line-strong); }
          .tl-item:last-child::before { display: none; }
          .tl-dot { width: 11px; height: 11px; flex: none; margin-top: 3px;
            background: var(--eco-teal); clip-path: polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); }
          .tl-dot.away { background: var(--eco-st-dormant); }
          .tl-dot.fg { background: var(--eco-cyan); }
          .tl-body { flex: 1; min-width: 0; }
          .tl-top { display: flex; align-items: baseline; gap: 8px; }
          .tl-app { font-size: 12px; font-weight: 600; color: var(--eco-ink); }
          .tl-dur { font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-teal-deep); }
          .tl-time { margin-left: auto; font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-ink-3); }
          .tl-title { font-size: 10.5px; color: var(--eco-ink-3); margin-top: 1px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          .sum { display: flex; gap: 22px; flex-wrap: wrap; }
          .stat .n { font-family: var(--eco-font-mono); font-size: 22px; font-weight: 600; color: var(--eco-teal-deep); }
          .stat .l { font-size: 10px; letter-spacing: .1em; color: var(--eco-ink-3); margin-top: 2px; }

          .day-nav { display: flex; align-items: center; gap: 8px; }
          .day-nav .d { font-family: var(--eco-font-mono); font-size: 12px; font-weight: 600;
            color: var(--eco-ink); letter-spacing: .06em; min-width: 118px; text-align: center; }

          .empty, .err { padding: 40px 20px; text-align: center; }
          .err { color: var(--eco-red); }
          .err .msg { font-family: var(--eco-font-mono); font-size: 10px; margin-top: 8px; color: var(--eco-ink-3); word-break: break-all; }
          .empty .big { font-size: 14px; font-weight: 700; color: var(--eco-ink-2); margin: 10px 0 5px; }
          .empty .sub { font-family: var(--eco-font-mono); font-size: 9.5px; letter-spacing: .12em; color: var(--eco-ink-3); }
          .loading-note { font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .18em;
            color: var(--eco-teal-deep); text-align: center; padding: 30px; }
        </style>

        ${this.headerHtml()}
        ${this._loading && !this._data ? '<div class="loading-note">SAMPLING · 正在采集生态样本…</div>' : ''}
        ${this._error ? this.errHtml() : ''}
        ${!this._error && this._data ? this.bodyHtml({ devices, apps, segs, away, total, maxMins, online, d, summary }) : ''}
      `;
      this.wire();
    }

    headerHtml() {
      return `
        <eco-card pad="16" class="span2" style="margin-bottom:15px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <div class="day-nav">
              <eco-button size="sm" icon="chevron-left" data-act="prev"></eco-button>
              <span class="d">${ECO.esc(this._date)}${this._date === this.today() ? ' · 今日' : ''}</span>
              <eco-button size="sm" icon="chevron-right" data-act="next" ${this._date >= this.today() ? 'disabled' : ''}></eco-button>
            </div>
            <span style="flex:1"></span>
            <span style="font-family:var(--eco-font-mono);font-size:9px;letter-spacing:.14em;color:var(--eco-ink-3)">30s AUTO · ${this._auto ? 'ON' : 'OFF'}</span>
            <eco-button size="sm" icon="sync" data-act="toggle-auto">${this._auto ? '暂停刷新' : '自动刷新'}</eco-button>
            <eco-button size="sm" variant="primary" icon="download" data-act="refresh" ${this._loading ? 'loading' : ''}>采集</eco-button>
          </div>
        </eco-card>`;
    }

    errHtml() {
      return `
        <eco-card pad="24" class="span2 err">
          <eco-icon name="alert" size="26"></eco-icon>
          <div class="big" style="font-size:14px;font-weight:700;margin-top:10px">监测链路中断</div>
          <div class="msg">${ECO.esc(this._error)}</div>
        </eco-card>`;
    }

    bodyHtml({ devices, apps, segs, away, total, maxMins, online, d, summary }) {
      // 前台焦点：dashboard 直返用 active_device，组合源用 device_app_states
      const ad = d.active_device || {};
      const fg = ad.current_app
        ? { app_name: ad.current_app, display_title: ad.display_title, last_seen_at: ad.last_seen_at }
        : (d.current && (d.current.device_app_states || []).find((x) => x.is_foreground)) || {};
      const bat = online && online.extra ? online.extra.battery_percent : null;
      return `
        <div class="grid">
          <eco-card pad="16" class="span2">
            <div class="sec-title">此刻舱内 · CURRENT</div>
            <div class="hero">
              <span class="pulse-dot"></span>
              <div class="now">
                <div class="app">${ECO.esc(fg.app_name || '万籁俱寂')}</div>
                <div class="title">${ECO.esc(fg.display_title || (online ? '设备在线，无前台焦点' : '设备已入眠'))}</div>
              </div>
              <div class="meta">
                <div class="t">${hm(fg.last_seen_at) || '--:--'}</div>
                <div class="s">${online ? 'ONLINE' : 'OFFLINE'}${bat != null ? ` · BAT ${bat}%` : ''}</div>
              </div>
            </div>
            ${summary ? `<div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--eco-line-strong);font-size:11.5px;line-height:1.7;color:var(--eco-ink-2)">${ECO.esc(summary)}</div>` : ''}
          </eco-card>

          <eco-card pad="16">
            <div class="sec-title">培养舱 · DEVICES</div>
            <div class="chips">
              ${devices.length === 0 ? '<span style="font-size:11px;color:var(--eco-ink-3)">暂无设备上报</span>' : ''}
              ${devices.map((x) => `
                <div class="chip ${x.is_online ? 'on' : ''}">
                  <span class="pulse-dot" style="width:8px;height:8px;background:${x.is_online ? 'var(--eco-st-running)' : 'var(--eco-st-dormant)'};box-shadow:none;animation:none"></span>
                  <div>
                    <div class="dn">${ECO.esc(x.device_name || x.device_id)}</div>
                    <div class="dp">${ECO.esc(x.platform || '')} · ${hm(x.last_seen_at)}</div>
                  </div>
                  ${x.extra && x.extra.battery_percent != null ? `<span class="bat"><eco-icon name="battery" size="11"></eco-icon>${x.extra.battery_percent}%</span>` : ''}
                </div>`).join('')}
            </div>
            <div class="sum" style="margin-top:16px">
              <div class="stat"><div class="n">${fmtMins(total)}</div><div class="l">今日活跃</div></div>
              <div class="stat"><div class="n">${apps.length}</div><div class="l">应用样本</div></div>
              <div class="stat"><div class="n">${fmtMins(away)}</div><div class="l">挂机时长</div></div>
              <div class="stat"><div class="n">${devices.length}</div><div class="l">培养舱</div></div>
            </div>
          </eco-card>

          <eco-card pad="16">
            <div class="sec-title">样本活性 · TOP APPS</div>
            ${apps.slice(0, 8).map((a) => `
              <div class="bar-row">
                <span class="nm" title="${ECO.esc(a.name)}">${ECO.esc(a.name)}</span>
                <span class="track"><span class="fill" style="width:${Math.max(4, Math.round((a.mins / maxMins) * 100))}%"></span></span>
                <span class="val">${fmtMins(a.mins)}</span>
              </div>`).join('') || '<span style="font-size:11px;color:var(--eco-ink-3)">今日尚无活动记录</span>'}
          </eco-card>

          <eco-card pad="16" class="span2">
            <div class="sec-title">生长记录 · TIMELINE</div>
            <div class="tl">
              ${segs.length === 0 ? '<div class="empty"><div class="big">当日无生长记录</div><div class="sub">该日期暂无设备活动数据</div></div>' : ''}
              ${segs.slice().reverse().map((s) => `
                <div class="tl-item">
                  <span class="tl-dot ${s.app_id === '用户离开' ? 'away' : s.is_foreground ? 'fg' : ''}"></span>
                  <div class="tl-body">
                    <div class="tl-top">
                      <span class="tl-app">${ECO.esc(s.app_name)}</span>
                      <span class="tl-dur">${fmtMins(s.duration_minutes || 0)}</span>
                      ${s.is_foreground ? '<span style="font-family:var(--eco-font-mono);font-size:8px;letter-spacing:.1em;color:var(--eco-cyan)">FOCUS</span>' : ''}
                      <span class="tl-time">${hm(s.started_at)}–${hm(s.ended_at)}</span>
                    </div>
                    ${s.display_title ? `<div class="tl-title">${ECO.esc(s.display_title)}</div>` : ''}
                  </div>
                </div>`).join('')}
            </div>
          </eco-card>
        </div>`;
    }

    wire() {
      const q = (sel) => this.shadowRoot.querySelector(sel);
      const on = (act, fn) => { const el = q(`[data-act="${act}"]`); if (el) el.addEventListener('click', fn); };
      on('refresh', () => this.refresh());
      on('prev', () => this.shift(-1));
      on('next', () => this.shift(1));
      on('toggle-auto', () => { this._auto = !this._auto; this.render(); });
    }
  }

  customElements.define('eco-dashboard', EcoDashboard);
})();
