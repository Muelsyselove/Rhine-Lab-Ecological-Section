/* ECO 模拟数据 — 浏览器预览与开发调试使用 */
(function () {
  window.ECO_MOCK = {
    projects: [
      {
        id: 'mock-01', name: 'taixuan-wendao', repo: 'you/taixuan-wendao',
        repoUrl: 'https://github.com/you/taixuan-wendao',
        description: '太玄问道 — 国风放置修仙文字游戏，Electron 桌面版客户端。',
        language: 'Vue', stars: 128, branch: 'main', group: '太玄问道',
        installDir: '', launchCmd: '', source: 'github',
        status: 'installed', installPath: 'D:/ECO/太玄问道/taixuan-wendao',
        version: 'v1.2.0', latestVersion: 'v1.2.0', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 30,
      },
      {
        id: 'mock-02', name: 'taixuan-launcher', repo: 'you/taixuan-launcher',
        repoUrl: 'https://github.com/you/taixuan-launcher',
        description: '太玄问道专用启动器，负责版本管理与自动更新。',
        language: 'JavaScript', stars: 42, branch: 'main', group: '太玄问道',
        installDir: '', launchCmd: '', source: 'github',
        status: 'running', installPath: 'D:/ECO/太玄问道/taixuan-launcher',
        version: 'v0.9.1', latestVersion: 'v0.9.1', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 22,
      },
      {
        id: 'mock-03', name: 'eco-launcher', repo: 'you/Rhine-Lab-Ecological-Section',
        repoUrl: 'https://github.com/you/Rhine-Lab-Ecological-Section',
        description: '莱茵生命生态科 — 个人项目集合与启动器，即本项目自身。',
        language: 'JavaScript', stars: 7, branch: 'main', group: '生态实验',
        installDir: '', launchCmd: '', source: 'github',
        status: 'installed', installPath: 'D:/ECO/生态实验/eco-launcher',
        version: 'v0.1.0', latestVersion: 'v0.1.0', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 9,
      },
      {
        id: 'mock-04', name: 'dewdrop-notes', repo: 'you/dewdrop-notes',
        repoUrl: 'https://github.com/you/dewdrop-notes',
        description: '晨露笔记 — 本地优先的 Markdown 双链笔记，带露珠状知识图谱。',
        language: 'TypeScript', stars: 256, branch: 'main', group: '生态实验',
        installDir: '', launchCmd: '', source: 'github',
        status: 'not_installed', installPath: '',
        version: '', latestVersion: '', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 5,
      },
      {
        id: 'mock-05', name: 'moss-bot', repo: 'you/moss-bot',
        repoUrl: 'https://github.com/you/moss-bot',
        description: '苔藓机器人 — 定时巡检仓库 issue 并浇水的自动化小机器人。',
        language: 'Python', stars: 18, branch: 'main', group: '生态实验',
        installDir: '', launchCmd: '', source: 'github',
        status: 'not_installed', installPath: '',
        version: '', latestVersion: '', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 3,
      },
      {
        id: 'mock-06', name: 'rhine-hud-theme', repo: 'you/rhine-hud-theme',
        repoUrl: 'https://github.com/you/rhine-hud-theme',
        description: '莱茵生命 HUD 主题包 — VSCode / Terminal 配色与字体方案。',
        language: 'CSS', stars: 512, branch: 'main', group: '工具链',
        installDir: '', launchCmd: '', source: 'github',
        status: 'installed', installPath: 'D:/ECO/工具链/rhine-hud-theme',
        version: 'v2.0.0', latestVersion: 'v2.0.0', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'mock-07', name: 'terrarium-cli', repo: 'you/terrarium-cli',
        repoUrl: 'https://github.com/you/terrarium-cli',
        description: '生态瓶 CLI — 在终端里养一团会生长的苔藓微景观。',
        language: 'Rust', stars: 1024, branch: 'main', group: '工具链',
        installDir: '', launchCmd: '', source: 'github',
        status: 'error', installPath: 'D:/ECO/工具链/terrarium-cli',
        version: 'v0.3.0', latestVersion: 'v0.3.0', ignoredVersion: '',
        addedAt: Date.now() - 86400000,
      },
      {
        id: 'mock-08', name: 'herbarium', repo: 'you/herbarium',
        repoUrl: 'https://github.com/you/herbarium',
        description: '标本馆 — 代码片段收藏与检索服务，支持全文搜索。',
        language: 'Go', stars: 77, branch: 'main', group: '工具链',
        installDir: '', launchCmd: '', source: 'github',
        status: 'installed', installPath: 'D:/ECO/工具链/herbarium',
        version: 'v1.1.2', latestVersion: 'v1.1.2', ignoredVersion: '',
        addedAt: Date.now() - 3600000 * 6,
      },
    ],

    /* 本人 GitHub 仓库（生态园接入清单） */
    repos: [
      { name: 'taixuan-wendao', full_name: 'you/taixuan-wendao', description: '太玄问道 — 国风放置修仙文字游戏', language: 'Vue', stargazers_count: 128, html_url: 'https://github.com/you/taixuan-wendao', default_branch: 'main', private: false },
      { name: 'taixuan-launcher', full_name: 'you/taixuan-launcher', description: '太玄问道专用启动器', language: 'JavaScript', stargazers_count: 42, html_url: 'https://github.com/you/taixuan-launcher', default_branch: 'main', private: false },
      { name: 'Rhine-Lab-Ecological-Section', full_name: 'you/Rhine-Lab-Ecological-Section', description: '莱茵生命生态科启动器', language: 'JavaScript', stargazers_count: 7, html_url: 'https://github.com/you/Rhine-Lab-Ecological-Section', default_branch: 'main', private: false },
      { name: 'dewdrop-notes', full_name: 'you/dewdrop-notes', description: '晨露笔记 — 本地优先 Markdown 双链笔记', language: 'TypeScript', stargazers_count: 256, html_url: 'https://github.com/you/dewdrop-notes', default_branch: 'main', private: false },
      { name: 'moss-bot', full_name: 'you/moss-bot', description: '苔藓机器人 — 自动巡检 issue', language: 'Python', stargazers_count: 18, html_url: 'https://github.com/you/moss-bot', default_branch: 'main', private: false },
      { name: 'rhine-hud-theme', full_name: 'you/rhine-hud-theme', description: '莱茵生命 HUD 主题包', language: 'CSS', stargazers_count: 512, html_url: 'https://github.com/you/rhine-hud-theme', default_branch: 'main', private: false },
      { name: 'terrarium-cli', full_name: 'you/terrarium-cli', description: '生态瓶 CLI — 终端苔藓微景观', language: 'Rust', stargazers_count: 1024, html_url: 'https://github.com/you/terrarium-cli', default_branch: 'main', private: false },
      { name: 'herbarium', full_name: 'you/herbarium', description: '标本馆 — 代码片段收藏检索', language: 'Go', stargazers_count: 77, html_url: 'https://github.com/you/herbarium', default_branch: 'main', private: false },
      { name: 'aquifer-sync', full_name: 'you/aquifer-sync', description: '含水层同步 — 跨设备 dotfiles 同步工具', language: 'Shell', stargazers_count: 9, html_url: 'https://github.com/you/aquifer-sync', default_branch: 'main', private: true },
      { name: 'spore-ui', full_name: 'you/spore-ui', description: '孢子 UI — 生态风 Web Components 组件库', language: 'Svelte', stargazers_count: 340, html_url: 'https://github.com/you/spore-ui', default_branch: 'main', private: false },
    ],

    /* 瑰丽花园：已移栽的星标收藏（他人项目） */
    favorites: [
      {
        id: 'fav-01', name: 'rhodes-island-ui', repo: 'amiya/rhodes-island-ui',
        repoUrl: 'https://github.com/amiya/rhodes-island-ui',
        description: '罗德岛终端 UI 复刻 — 明日方舟风格 React 组件库。',
        language: 'TypeScript', stars: 20480, owner: 'amiya',
        launchPath: 'D:/Games/rhodes-island-ui/start.exe', addedAt: Date.now() - 86400000 * 12,
      },
      {
        id: 'fav-02', name: 'mon3tr-sim', repo: 'kaltsit/mon3tr-sim',
        repoUrl: 'https://github.com/kaltsit/mon3tr-sim',
        description: 'Mon3tr 行为仿真沙盒 — 基于物理引擎的召唤物模拟器。',
        language: 'Rust', stars: 8600, owner: 'kaltsit',
        launchPath: '', addedAt: Date.now() - 86400000 * 4,
      },
      {
        id: 'fav-03', name: 'tide-rose-theme', repo: 'mizuki/tide-rose-theme',
        repoUrl: 'https://github.com/mizuki/tide-rose-theme',
        description: '潮汐蔷薇 — 深蓝系终端配色与图标主题包。',
        language: 'CSS', stars: 1300, owner: 'mizuki',
        launchPath: '', addedAt: Date.now() - 86400000,
      },
    ],

    /* 采集星标时返回的他人仓库清单 */
    starred: [
      { name: 'rhodes-island-ui', full_name: 'amiya/rhodes-island-ui', description: '罗德岛终端 UI 复刻', language: 'TypeScript', stargazers_count: 20480, html_url: 'https://github.com/amiya/rhodes-island-ui', default_branch: 'main', private: false, owner: 'amiya' },
      { name: 'mon3tr-sim', full_name: 'kaltsit/mon3tr-sim', description: 'Mon3tr 行为仿真沙盒', language: 'Rust', stargazers_count: 8600, html_url: 'https://github.com/kaltsit/mon3tr-sim', default_branch: 'main', private: false, owner: 'kaltsit' },
      { name: 'tide-rose-theme', full_name: 'mizuki/tide-rose-theme', description: '潮汐蔷薇终端主题', language: 'CSS', stargazers_count: 1300, html_url: 'https://github.com/mizuki/tide-rose-theme', default_branch: 'main', private: false, owner: 'mizuki' },
      { name: 'lungmen-radio', full_name: 'hoshiguma/lungmen-radio', description: '龙门电台 — 网络收音机 TUI', language: 'Go', stargazers_count: 4200, html_url: 'https://github.com/hoshiguma/lungmen-radio', default_branch: 'main', private: false, owner: 'hoshiguma' },
      { name: 'sami-aurora', full_name: 'santalla/sami-aurora', description: '萨米极光 — 动态壁纸引擎', language: 'C++', stargazers_count: 15200, html_url: 'https://github.com/santalla/sami-aurora', default_branch: 'main', private: false, owner: 'santalla' },
    ],

    /* 远方来信：各仓库当前最新 Release 版本（checkUpdates 模拟） */
    releases: {
      'you/taixuan-wendao': 'v1.3.0',
      'you/taixuan-launcher': 'v0.9.1',
      'you/Rhine-Lab-Ecological-Section': 'v0.1.0',
      'you/rhine-hud-theme': 'v2.0.0',
      'you/terrarium-cli': 'v0.3.0',
      'you/herbarium': 'v1.2.0',
      'you/dewdrop-notes': 'v0.8.0',
      'you/moss-bot': 'v0.2.1',
    },
  };
})();
