/* ECO 模拟数据 — 浏览器预览与开发调试使用（与 electron/services/catalog.js 保持一致） */
(function () {
  window.ECO_MOCK = {
    version: '0.1.4',

    projects: [
      {
        id: 'mock-taixuan', name: '太玄问道', repo: 'Muelsyselove/Taixuan-Quest-for-Immortality',
        repoUrl: 'https://github.com/Muelsyselove/Taixuan-Quest-for-Immortality',
        description: '由 AI 驱动的智慧修仙系统，助力道友更上一层楼',
        language: 'JavaScript', stars: 0, branch: 'main', group: '我的项目',
        installDir: '', launchCmd: '', source: 'github',
        status: 'installed', installPath: 'D:/ECO/我的项目/太玄问道',
        version: 'v1.0.0', latestVersion: 'v1.0.0', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 30,
      },
      {
        id: 'mock-cheese', name: '知识学爆', repo: 'Muelsyselove/Cheese-Snow-Leopard',
        repoUrl: 'https://github.com/Muelsyselove/Cheese-Snow-Leopard',
        description: 'AI 驱动的个人知识管理系统，把扔进收藏夹的知识捡回来',
        language: 'Python', stars: 0, branch: 'main', group: '我的项目',
        installDir: '', launchCmd: '', source: 'github',
        status: 'not_installed', installPath: '',
        version: '', latestVersion: '', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 12,
      },
      {
        id: 'mock-ball', name: 'BallPlayer', repo: 'Muelsyselove/BallPlayer',
        repoUrl: 'https://github.com/Muelsyselove/BallPlayer',
        description: '小球对战 — 有趣的碰碰车类游戏，这一次不需要你亲自操控',
        language: 'TypeScript', stars: 0, branch: 'main', group: '我的项目',
        installDir: '', launchCmd: '', source: 'github',
        status: 'not_installed', installPath: '',
        version: '', latestVersion: '', ignoredVersion: '',
        addedAt: Date.now() - 86400000 * 1,
      },
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
    ],

    /* 采集星标时返回的他人仓库清单 */
    starred: [
      { name: 'rhodes-island-ui', full_name: 'amiya/rhodes-island-ui', description: '罗德岛终端 UI 复刻', language: 'TypeScript', stargazers_count: 20480, html_url: 'https://github.com/amiya/rhodes-island-ui', default_branch: 'main', private: false, owner: 'amiya' },
      { name: 'mon3tr-sim', full_name: 'kaltsit/mon3tr-sim', description: 'Mon3tr 行为仿真沙盒', language: 'Rust', stargazers_count: 8600, html_url: 'https://github.com/kaltsit/mon3tr-sim', default_branch: 'main', private: false, owner: 'kaltsit' },
      { name: 'tide-rose-theme', full_name: 'mizuki/tide-rose-theme', description: '潮汐蔷薇终端主题', language: 'CSS', stargazers_count: 1300, html_url: 'https://github.com/mizuki/tide-rose-theme', default_branch: 'main', private: false, owner: 'mizuki' },
    ],

    /* 远方来信：各仓库当前最新 Release 版本（checkUpdates 模拟） */
    releases: {
      'Muelsyselove/Taixuan-Quest-for-Immortality': 'v1.1.0',
      'Muelsyselove/Cheese-Snow-Leopard': 'v0.4.0',
      'Muelsyselove/BallPlayer': 'v1.0.0',
    },
  };
})();
