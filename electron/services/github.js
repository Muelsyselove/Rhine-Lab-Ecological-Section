// GitHub 服务 — 瑰丽花园星标采集 / Release 信息（生态园项目固定来自内置目录）
// 全部匿名访问公开 API，启动器无需任何 GitHub 凭据配置
const API_BASE = 'https://api.github.com';
const { OWNER } = require('./catalog');

// 瑰丽花园：收藏的他人项目（starred，固定采集 OWNER 的星标列表）
async function fetchStarred() {
  return requestAll(`/users/${encodeURIComponent(OWNER)}/starred?per_page=100`);
}

// 最新 Release（含 ECO 资产挑选）
async function fetchLatestRelease(fullName) {
  const res = await fetch(`${API_BASE}/repos/${fullName}/releases/latest`, {
    headers: headers(),
  });
  if (res.status === 404) return null; // 尚无 Release
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 160)}`);
  }
  const rel = await res.json();
  const assets = (rel.assets || []).map((a) => ({
    name: a.name,
    url: a.browser_download_url,
    size: a.size,
  }));
  // 优先选择 ECO 接入包
  const ecoAsset =
    assets.find((a) => a.name.includes('-eco') && /\.(tar\.gz|tgz|zip)$/.test(a.name)) ||
    assets.find((a) => /\.(tar\.gz|tgz|zip)$/.test(a.name)) ||
    null;
  return {
    tag: rel.tag_name,
    name: rel.name || rel.tag_name,
    url: rel.html_url,
    publishedAt: rel.published_at,
    asset: ecoAsset,
  };
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ECO-Launcher',
  };
}

async function requestAll(pathAndQuery) {
  const repos = [];
  let url = API_BASE + pathAndQuery;
  for (let page = 0; page < 5 && url; page += 1) {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
    }
    repos.push(...(await res.json()));
    const link = res.headers.get('link') || '';
    const next = link.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1] : null;
  }
  return repos.map(normalize);
}

function normalize(repo) {
  return {
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description || '',
    language: repo.language || '',
    stargazers_count: repo.stargazers_count || 0,
    html_url: repo.html_url,
    default_branch: repo.default_branch || 'main',
    updated_at: repo.updated_at,
    private: !!repo.private,
    owner: (repo.owner && repo.owner.login) || '',
  };
}

module.exports = { fetchStarred, fetchLatestRelease };
