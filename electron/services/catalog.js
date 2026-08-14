// 生态园定植目录 — 启动器固定展示的本人项目，增删展示项只需改这里
const OWNER = 'Muelsyselove';

const CATALOG = [
  {
    name: '太玄问道',
    repo: 'Muelsyselove/Taixuan-Quest-for-Immortality',
    description: '由 AI 驱动的智慧修仙系统，助力道友更上一层楼',
    language: 'JavaScript',
    group: '我的项目',
  },
  {
    name: '知识学爆',
    repo: 'Muelsyselove/Cheese-Snow-Leopard',
    description: 'AI 驱动的个人知识管理系统，把扔进收藏夹的知识捡回来',
    language: 'Python',
    group: '我的项目',
  },
  {
    name: 'BallPlayer',
    repo: 'Muelsyselove/BallPlayer',
    description: '小球对战 — 有趣的碰碰车类游戏，这一次不需要你亲自操控',
    language: 'TypeScript',
    group: '我的项目',
  },
];

// 分组 → 定植子目录（保持路径全 ASCII，避免中文路径引发的兼容问题）
const GROUP_DIRS = {
  我的项目: 'my-projects',
  本地样本: 'local-samples',
};

module.exports = { OWNER, CATALOG, GROUP_DIRS };
