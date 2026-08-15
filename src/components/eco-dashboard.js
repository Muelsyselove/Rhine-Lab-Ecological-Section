/* eco-dashboard — 生态监测站（doinday /api/dashboard/view 预渲染数据）
   数据来源：主进程 dashboard 服务（Chromium 网络栈，不受页面 CSP 限制）
   服务端已聚合：分组/配色/文案/总结，前端只做呈现
   交互：应用组可展开查看具体时间段；自动刷新链路切断时按退避主动重试 */
(function () {
  const RETRY_BASE = 5000;   // 重试基数：5s / 10s / 15s …
  const RETRY_CAP = 30000;   // 退避上限 30s
  const AUTO_INTERVAL = 10000; // 与站点 refresh_hint 一致：10s

  class EcoDashboard extends ECO.EcoElement {
    constructor() {
      super();
      this._data = null;
      this._loading = false;
      this._error = '';
      this._fails = 0;        // 连续失败次数（驱动退避与提示）
      this._date = this.today();
      this._auto = true;
      this._open = null;      // Set<device::app> 已展开的应用组
      this._fold = new Set(); // 已折叠的卡片（点击卡片标题切换）
      this._prevSummary = null; // 当日小结缺失时，回退显示最近一份小结
      this._prevTried = false;
    }

    connectedCallback() {
      this.render();
      this.refresh();
      this._timer = setInterval(() => {
        if (this._auto && this.isConnected) this.refresh(true);
      }, AUTO_INTERVAL);
    }
    disconnectedCallback() {
      clearInterval(this._timer);
      clearTimeout(this._retryTimer);
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
        this._fails = 0;
        clearTimeout(this._retryTimer);
        this.fetchPrevSummary(data);
      } catch (err) {
        this._fails += 1;
        // 链路切断：已有数据时保留界面仅标记状态；无数据才整卡报错
        this._error = this._data ? '' : ((err && err.message) || String(err));
        // 自动模式下主动重试（退避），手动模式只在用户再次点击时重试
        if (this._auto) {
          const delay = Math.min(RETRY_BASE * this._fails, RETRY_CAP);
          clearTimeout(this._retryTimer);
          this._retryTimer = setTimeout(() => { if (this.isConnected) this.refresh(true); }, delay);
        }
      }
      this._loading = false;
      if (this.isConnected) this.render();
    }

    shift(day) {
      const d = new Date(`${this._date}T00:00:00`);
      d.setDate(d.getDate() + day);
      const p = (n) => String(n).padStart(2, '0');
      this._date = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
      this._open = null; // 换日后重算默认展开组
      this._prevSummary = null;
      this._prevTried = false;
      this._fails = 0;
      clearTimeout(this._retryTimer);
      this.refresh();
    }

    /** 当日小结尚未生成时，异步取最近一份（前一日）的小结作回退展示 */
    fetchPrevSummary(data) {
      if (!data || !data.meta || !data.meta.prev_date) return;
      const ai = data.ai_summary;
      if (ai && ai.summary) return; // 当日已有
      if (this._prevTried) return;
      this._prevTried = true;
      window.eco
        .fetchDashboard({ date: data.meta.prev_date })
        .then((prev) => {
          const pai = prev && prev.ai_summary;
          if (pai && pai.summary) {
            this._prevSummary = {
              ...pai,
              dateDisplay: (prev.meta && prev.meta.date_display) || data.meta.prev_date,
            };
            if (this.isConnected) this.render();
          }
        })
        .catch(() => {});
    }

    /* ---------- 渲染 ---------- */
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      const d = this._data || {};
      const meta = d.meta || {};
      const pres = d.presence || {};
      const devices = d.devices || [];
      const usage = d.usage_chart || null;
      const ai = d.ai_summary || null;
      const media = d.media || {};
      const timeline = d.timeline || {};
      const groups = timeline.groups || [];

      // 挂机：时间轴应用组中的「用户离开」
      const allApps = groups.flatMap((g) => g.app_groups || []);
      const awayGroup = allApps.find((a) => a.app_name === '用户离开');
      const appCount = allApps.filter((a) => a.app_name !== '用户离开').length;

      // 首次渲染默认只展开第一个「进行中」的应用组，其余收起保持整洁
      if (d.meta && !this._open) {
        this._open = new Set();
        let first = true;
        for (const g of groups) {
          for (const ag of g.app_groups || []) {
            if (ag.is_current && first) {
              this._open.add(`${g.device_id}::${ag.app_name}`);
              first = false;
            }
          }
        }
      }

      this.shadowRoot.innerHTML = `
        <style>
          :host { display: block; min-width: 0; container-type: inline-size; }
          * { box-sizing: border-box; }
          eco-card { display: block; min-width: 0; }
          /* 双栏：左侧信息流（此刻舱内→培养舱→今日使用→今日小结），右侧时间轴拉伸填充 */
          .cols { display: grid; grid-template-columns: minmax(0, 27fr) minmax(0, 33fr); gap: 14px; align-items: stretch; }
          .col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
          .col-left { min-width: 0; }
          .col-right { min-width: 0; }
          .col-right eco-card { display: flex; flex-direction: column; flex: 1; min-height: 0; }
          /* 窄容器时退化为单列（按组件自身宽度而非视口） */
          @container (max-width: 900px) { .cols { grid-template-columns: 1fr; } }

          .sec-title {
            display: flex; align-items: center; gap: 8px;
            font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .22em;
            color: var(--eco-teal-deep); text-transform: uppercase; margin-bottom: 14px;
          }
          .sec-title::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line-strong); }
          /* 可折叠卡片标题：点击收起/展开整卡内容 */
          .sec-title.foldable { cursor: pointer; user-select: none; }
          .sec-title.foldable:hover { color: var(--eco-teal); }
          .sec-title.foldable .fchev { flex: none; color: var(--eco-ink-3); display: inline-flex;
            transition: transform var(--eco-t-fast) var(--eco-ease); }
          .sec-title.folded { margin-bottom: 0; }
          .sec-title.folded .fchev { transform: rotate(-90deg); }

          /* ===== 此刻舱内 ===== */
          .hero { display: flex; align-items: center; gap: 14px; min-width: 0; }
          .pulse-dot { width: 10px; height: 10px; border-radius: 50%; flex: none;
            background: var(--eco-st-running); animation: eco-pulse 2s var(--eco-ease) infinite; }
          .pulse-dot.off { background: var(--eco-st-dormant); animation: none; }
          @keyframes eco-pulse { 0%,100%{ box-shadow: 0 0 0 3px rgba(63,174,92,.28);} 50%{ box-shadow: 0 0 0 7px rgba(63,174,92,.07);} }
          .hero .now { flex: 1; min-width: 0; }
          .hero .app { font-size: 16px; font-weight: 700; color: var(--eco-ink); letter-spacing: .02em;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hero .title { font-size: 11px; color: var(--eco-ink-3); margin-top: 2px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hero .meta { text-align: right; flex: none; }
          .hero .meta .t { font-family: var(--eco-font-mono); font-size: 16px; font-weight: 600; color: var(--eco-teal-deep); }
          .hero .meta .s { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .14em; color: var(--eco-ink-3); margin-top: 2px; }

          /* ===== 今日小结 ===== */
          .sum-text { font-size: 11.5px; line-height: 1.8; color: var(--eco-ink-2);
            white-space: pre-line; word-break: break-word; overflow-wrap: anywhere;
            max-height: 220px; overflow-y: auto; padding: 11px 12px;
            background: rgba(15,154,138,.05); border-left: 2px solid var(--eco-teal); clip-path: var(--eco-clip-tag); }
          .sum-meta { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .14em;
            color: var(--eco-ink-3); margin-top: 8px; text-align: right; }
          .sum-pending { font-family: var(--eco-font-mono); font-size: 10px; letter-spacing: .1em;
            color: var(--eco-ink-3); padding: 14px 12px; text-align: center;
            background: rgba(13,74,63,.04); clip-path: var(--eco-clip-tag); }

          /* ===== 统计带 ===== */
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .stat { padding: 12px 13px; background: var(--eco-glass); box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-card); min-width: 0; }
          .stat .n { font-family: var(--eco-font-mono); font-size: 20px; font-weight: 600; color: var(--eco-teal-deep);
            line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .stat .l { font-size: 9.5px; letter-spacing: .08em; color: var(--eco-ink-3); margin-top: 4px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

          /* ===== 培养舱设备芯片 ===== */
          .chips { display: flex; flex-wrap: wrap; gap: 8px; }
          .chip { display: flex; align-items: center; gap: 8px; padding: 7px 10px; max-width: 100%;
            background: var(--eco-glass); box-shadow: inset 0 0 0 1px var(--eco-line); clip-path: var(--eco-clip-btn); }
          .chip.on { box-shadow: inset 0 0 0 1px rgba(15,154,138,.45); background: var(--eco-glass-strong); }
          .chip .cbody { min-width: 0; }
          .chip .dn { font-size: 12px; font-weight: 600; color: var(--eco-ink);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
          .chip .dp { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .1em; color: var(--eco-ink-3);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
          .chip .bat { font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-teal-deep);
            display: inline-flex; align-items: center; gap: 3px; flex: none; }

          /* ===== 样本活性（服务端配色条形） ===== */
          .bar-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
          .bar-row.away { opacity: .62; }
          .bar-row .nm { width: 148px; flex: none; font-size: 11.5px; color: var(--eco-ink-2);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
          .bar-row .nm .swatch { width: 7px; height: 7px; flex: none; clip-path: polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); }
          .bar-row .track { flex: 1; min-width: 0; height: 11px; background: rgba(13,74,63,.06); clip-path: var(--eco-clip-tag); overflow: hidden; }
          .bar-row .fill { height: 100%; clip-path: var(--eco-clip-tag); transition: width .5s var(--eco-ease); opacity: .85; }
          .bar-row .val { width: 56px; flex: none; text-align: right; font-family: var(--eco-font-mono); font-size: 10px; color: var(--eco-teal-deep); }

          /* ===== 分类化时间轴（设备 → 应用组 → 可展开时间段），右栏内自适应拉伸 ===== */
          .tl { flex: 1; min-height: 380px; overflow-y: auto; overflow-x: hidden; padding-right: 4px; }
          .tl-device { margin-bottom: 18px; }
          .tl-device:last-child { margin-bottom: 0; }
          .tl-device-name { display: flex; align-items: center; gap: 7px;
            font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .2em;
            color: var(--eco-ink-3); text-transform: uppercase; margin-bottom: 8px; padding-left: 2px; }
          .tl-device-name::after { content: ""; flex: 1; border-top: 1px dashed var(--eco-line); }

          .ag { margin-bottom: 4px; background: var(--eco-glass); box-shadow: inset 0 0 0 1px var(--eco-line);
            clip-path: var(--eco-clip-tag); transition: background var(--eco-t-fast) var(--eco-ease), box-shadow var(--eco-t-fast) var(--eco-ease); }
          .ag:hover { background: var(--eco-glass-strong); box-shadow: inset 0 0 0 1px var(--eco-line-strong); }
          .ag.live { box-shadow: inset 0 0 0 1px rgba(15,154,138,.5), var(--eco-glow-teal); background: var(--eco-glass-strong); }
          .ag.away { opacity: .66; }
          .ag-head { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px;
            text-align: left; cursor: pointer; }
          .ag-bar { width: 3px; align-self: stretch; flex: none; border-radius: 2px; opacity: .9; }
          .ag-name { font-size: 12.5px; font-weight: 600; color: var(--eco-ink);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
          .ag-now { font-family: var(--eco-font-mono); font-size: 8px; letter-spacing: .12em; flex: none;
            color: var(--eco-cyan); }
          .ag-now::before { content: "● "; }
          .ag-count { font-family: var(--eco-font-mono); font-size: 8.5px; letter-spacing: .08em;
            color: var(--eco-ink-3); flex: none; }
          .ag-total { margin-left: auto; font-family: var(--eco-font-mono); font-size: 9.5px; font-weight: 600;
            color: var(--eco-teal-deep); flex: none; }
          .ag-head .chev { flex: none; color: var(--eco-ink-3); transition: transform var(--eco-t-fast) var(--eco-ease); }
          .ag.open .ag-head .chev { transform: rotate(90deg); }

          .ag-items { border-top: 1px dashed var(--eco-line); padding: 4px 10px 6px 13px; }
          .ag-item { display: flex; align-items: baseline; gap: 10px; padding: 3px 0; }
          .ai-time { width: 108px; flex: none; font-family: var(--eco-font-mono); font-size: 9px;
            color: var(--eco-ink-3); letter-spacing: .04em; }
          .ai-title { flex: 1; min-width: 0; font-size: 10.5px; color: var(--eco-ink-2);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .ai-dur { flex: none; font-family: var(--eco-font-mono); font-size: 9px; color: var(--eco-teal-deep); }

          /* ===== 日期导航 / 状态 ===== */
          .head-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
          .day-nav { display: flex; align-items: center; gap: 8px; }
          .day-nav .d { font-family: var(--eco-font-mono); font-size: 12.5px; font-weight: 600;
            color: var(--eco-ink); letter-spacing: .05em; min-width: 128px; text-align: center; }
          .head-meta { font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .14em; color: var(--eco-ink-3); }
          .retry-tag { font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .14em;
            color: var(--eco-amber); animation: eco-breathe 1.6s var(--eco-ease) infinite; }

          .empty, .err { padding: 44px 20px; text-align: center; }
          .err { color: var(--eco-red); }
          .err .msg { font-family: var(--eco-font-mono); font-size: 10px; margin-top: 8px; color: var(--eco-ink-3);
            word-break: break-all; }
          .empty .big { font-size: 14px; font-weight: 700; color: var(--eco-ink-2); margin: 10px 0 5px; }
          .empty .sub { font-family: var(--eco-font-mono); font-size: 9.5px; letter-spacing: .12em; color: var(--eco-ink-3); }
          .loading-note { font-family: var(--eco-font-mono); font-size: 9px; letter-spacing: .18em;
            color: var(--eco-teal-deep); text-align: center; padding: 30px; }

          /* shadow DOM 内滚动条：::-webkit-scrollbar 伪元素在 shadow DOM 不生效，
             改用标准属性（Chromium 121+ / Electron 43 支持），纤细且融入配色 */
          .tl, .sum-text, :host {
            scrollbar-width: thin;
            scrollbar-color: rgba(13, 74, 63, 0.32) transparent;
          }
        </style>

        ${this.headerHtml(meta)}
        ${this._loading && !this._data ? '<div class="loading-note">SAMPLING · 正在采集生态样本…</div>' : ''}
        ${this._error ? this.errHtml() : ''}
        ${!this._error && this._data ? this.bodyHtml({ meta, pres, devices, usage, ai, media, timeline, groups, awayGroup, appCount }) : ''}
      `;
      this.wire();
    }

    headerHtml(meta) {
      return `
        <eco-card pad="16" class="span2" style="margin-bottom:15px">
          <div class="head-row">
            <div class="day-nav">
              <eco-button size="sm" icon="chevron-left" data-act="prev"></eco-button>
              <span class="d">${ECO.esc(meta.date_display || this._date)}${meta.is_today || (!this._data && this._date === this.today()) ? ' · 今日' : ''}</span>
              <eco-button size="sm" icon="chevron-right" data-act="next" ${(meta.is_today || this._date >= this.today()) ? 'disabled' : ''}></eco-button>
            </div>
            ${meta.greeting ? `<span class="head-meta">${ECO.esc(meta.greeting)}</span>` : ''}
            <span style="flex:1"></span>
            ${this._fails > 0
              ? `<span class="retry-tag">链路重试中 · 第${this._fails}次</span>`
              : `<span class="head-meta">10s AUTO · ${this._auto ? 'ON' : 'OFF'}</span>`}
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
          ${this._auto ? `<div class="msg" style="color:var(--eco-amber)">退避重试已启用 · 第 ${this._fails} 次</div>` : ''}
        </eco-card>`;
    }

    /** 可折叠卡片标题（点击整卡收起/展开） */
    titleHtml(key, label, en) {
      const folded = this._fold.has(key);
      return `<div class="sec-title foldable ${folded ? 'folded' : ''}" data-fold="${ECO.esc(key)}"
        title="${folded ? '展开' : '收起'}此卡片">${ECO.esc(label)} · ${ECO.esc(en)}<eco-icon class="fchev" name="chevron-down" size="10"></eco-icon></div>`;
    }

    bodyHtml({ meta, pres, devices, usage, ai, media, timeline, groups, awayGroup, appCount }) {
      const hero = pres.hero || {};
      const bars = (usage && usage.bars) || [];
      const ownSum = !!(ai && ai.summary);
      const sum = ownSum ? { ...ai, own: true } : this._prevSummary;
      const fold = (key) => this._fold.has(key);
      return `
        <div class="cols">
          <div class="col col-left">
            <eco-card pad="16">
              ${this.titleHtml('current', '此刻舱内', 'CURRENT')}
              ${fold('current') ? '' : `
              <div class="hero">
                <span class="pulse-dot ${pres.online ? '' : 'off'}"></span>
                <div class="now">
                  <div class="app">${ECO.esc(hero.app_text || pres.status_label || '万籁俱寂')}</div>
                  <div class="title">${ECO.esc(hero.title_text || hero.description || (pres.online ? '设备在线' : '设备已入眠'))}</div>
                </div>
                <div class="meta">
                  <div class="t">${ECO.esc(meta.server_time_display || '--:--')}</div>
                  <div class="s">${ECO.esc(pres.status_label || (pres.online ? 'ONLINE' : 'OFFLINE'))}${meta.viewer_text ? ` · ${ECO.esc(meta.viewer_text)}` : ''}</div>
                </div>
              </div>`}
            </eco-card>

            <eco-card pad="16">
              ${this.titleHtml('devices', '培养舱', 'DEVICES')}
              ${fold('devices') ? '' : `
              <div class="chips">
                ${devices.length === 0 ? '<span style="font-size:11px;color:var(--eco-ink-3)">暂无设备上报</span>' : ''}
                ${devices.map((x) => `
                  <div class="chip ${x.is_online ? 'on' : ''}">
                    <span class="pulse-dot ${x.is_online ? '' : 'off'}" style="width:8px;height:8px;box-shadow:none;animation:none"></span>
                    <div class="cbody">
                      <div class="dn">${ECO.esc(x.device_name || x.device_id)}</div>
                      <div class="dp">${ECO.esc(x.app_text || x.platform || '')}</div>
                    </div>
                    ${x.battery_text ? `<span class="bat"><eco-icon name="battery" size="11"></eco-icon>${ECO.esc(String(x.battery_text).replace('⚡', ''))}</span>` : ''}
                  </div>`).join('')}
              </div>
              <div class="stats" style="margin-top:16px">
                <div class="stat"><div class="n">${ECO.esc((usage && usage.total_text) || '0m')}</div><div class="l">今日活跃</div></div>
                <div class="stat"><div class="n">${appCount}</div><div class="l">应用样本</div></div>
                <div class="stat"><div class="n">${ECO.esc((awayGroup && awayGroup.total_duration_text) || '0m')}</div><div class="l">挂机时长</div></div>
                <div class="stat"><div class="n">${devices.length}</div><div class="l">培养舱</div></div>
              </div>`}
            </eco-card>

            <eco-card pad="16">
              ${this.titleHtml('usage', '今日使用', 'TOP APPS')}
              ${fold('usage')
                ? ''
                : bars.length === 0
                  ? '<span style="font-size:11px;color:var(--eco-ink-3)">今日尚无活动记录</span>'
                  : bars.map((b) => `
                <div class="bar-row ${b.app_name === '用户离开' ? 'away' : ''}">
                  <span class="nm" title="${ECO.esc(b.app_name)}"><span class="swatch" style="background:${ECO.esc(b.color || 'var(--eco-teal)')}"></span>${ECO.esc(b.app_name)}</span>
                  <span class="track"><span class="fill" style="width:${Math.max(2, Math.min(100, b.percent || 0))}%;background:${ECO.esc(b.color || 'var(--eco-teal)')}"></span></span>
                  <span class="val">${ECO.esc(b.duration_text || '')}</span>
                </div>`).join('')}
            </eco-card>

            <eco-card pad="16">
              ${this.titleHtml('summary', (ai && ai.label) || '今日小结', 'SUMMARY')}
              ${fold('summary') ? '' : (sum ? `
                <div class="sum-text">${ECO.esc(sum.summary)}</div>
                <div class="sum-meta">${sum.own
                  ? ECO.esc(sum.time_text || '')
                  : `${ECO.esc(sum.dateDisplay)} 的小结 · ${ECO.esc(sum.time_text || '')} · 今日小结尚未生成`}</div>`
                : `<div class="sum-pending">今日小结尚未生成 · ${ECO.esc((ai && ai.time_text) || '等待生成')}</div>`)}
            </eco-card>

            ${media && media.visible ? `
            <eco-card pad="16">
              ${this.titleHtml('media', media.label || '媒体使用', 'MEDIA')}
              ${fold('media') ? '' : `<div class="sum-text">${ECO.esc(media.summary_text || '')}</div>`}
            </eco-card>` : ''}
          </div>

          <div class="col col-right">
            <eco-card pad="16" stretch>
              ${this.titleHtml('timeline', timeline.title || '生长记录', 'TIMELINE')}
              ${fold('timeline') ? '' : `
              <div class="tl">
                ${groups.length === 0 ? `<div class="empty"><div class="big">当日无生长记录</div><div class="sub">${ECO.esc(timeline.empty || '该日期暂无设备活动数据')}</div></div>` : ''}
                ${groups.map((g) => `
                  <div class="tl-device">
                    <div class="tl-device-name">${ECO.esc(g.device_name || g.device_id)}</div>
                    ${(g.app_groups || []).map((ag) => this.appGroupHtml(g, ag)).join('')}
                  </div>`).join('')}
              </div>`}
            </eco-card>
          </div>
        </div>`;
    }

    appGroupHtml(g, ag) {
      const key = `${g.device_id}::${ag.app_name}`;
      const open = !!(this._open && this._open.has(key));
      const away = ag.app_name === '用户离开';
      const items = ag.items || [];
      return `
        <div class="ag ${open ? 'open' : ''} ${ag.is_current ? 'live' : ''} ${away ? 'away' : ''}">
          <button class="ag-head" data-ag="${ECO.esc(key)}" title="${open ? '收起' : '展开'}具体时间段">
            <span class="ag-bar" style="background:${ECO.esc(ag.color || 'var(--eco-teal)')}"></span>
            <span class="ag-name">${ECO.esc(ag.app_name)}</span>
            ${ag.now_badge ? `<span class="ag-now">${ECO.esc(ag.now_badge)}</span>` : ''}
            <span class="ag-count">${items.length} 段</span>
            <span class="ag-total">${ECO.esc(ag.total_duration_text || '')}</span>
            <eco-icon class="chev" name="chevron-right" size="11"></eco-icon>
          </button>
          ${open ? `<div class="ag-items">
            ${items.map((it) => `
              <div class="ag-item">
                <span class="ai-time">${ECO.esc(it.time_range_text || '')}</span>
                <span class="ai-title" title="${ECO.esc(it.title_text || '')}">${ECO.esc(it.title_text && it.title_text !== '-' ? it.title_text : (it.activity_description || ''))}</span>
                <span class="ai-dur">${ECO.esc(it.duration_text || '')}</span>
              </div>`).join('')}
          </div>` : ''}
        </div>`;
    }

    wire() {
      const q = (sel) => this.shadowRoot.querySelector(sel);
      const on = (act, fn) => { const el = q(`[data-act="${act}"]`); if (el) el.addEventListener('click', fn); };
      on('refresh', () => { this._fails = 0; clearTimeout(this._retryTimer); this.refresh(); });
      on('prev', () => this.shift(-1));
      on('next', () => this.shift(1));
      on('toggle-auto', () => {
        this._auto = !this._auto;
        if (this._auto && this._fails > 0) this.refresh(true); // 恢复自动时立即补偿一次
        this.render();
      });
      this.shadowRoot.querySelectorAll('[data-fold]').forEach((el) => {
        el.addEventListener('click', () => {
          const k = el.getAttribute('data-fold');
          if (this._fold.has(k)) this._fold.delete(k); else this._fold.add(k);
          this.render();
        });
      });
      this.shadowRoot.querySelectorAll('[data-ag]').forEach((el) => {
        el.addEventListener('click', () => {
          const k = el.getAttribute('data-ag');
          if (!this._open) this._open = new Set();
          if (this._open.has(k)) this._open.delete(k); else this._open.add(k);
          this.render();
        });
      });
    }
  }

  customElements.define('eco-dashboard', EcoDashboard);
})();
