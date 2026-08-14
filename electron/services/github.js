// GitHub 服务 — 拉取本人仓库 / 收藏（瑰丽花园）/ Release 信息
const API_BASE = 'https://api.github.com';

async function fetchRepos({ username, token } = {}) {
  if (token) {
    // 仅本人所有仓库
    return requestAll('/user/repos?per_page=100&sort=updated&affiliation=owner', token);
  }
  if (username) {
    return requestAll(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, null);
  }
  throw new Error('请先在设置中配置 GitHub 用户名或 Token');
}

// 瑰丽花园：收藏的他人项目（starred）
async function fetchStarred({ username, token } = {}) {
  if (token) {
    return requestAll('/user/starred?per_page=100', token);
  }
  if (username) {
    return requestAll(`/users/${encodeURIComponent(username)}/starred?per_page=100`, null);
  }
  throw new Error('请先在设置中配置 GitHub 用户名或 Token');
}

// 最新 Release（含 ECO 资产挑选）
async function fetchLatestRelease(fullName, token) {
  const res = await fetch(`${API_BASE}/repos/${fullName}/releases/latest`, {
    headers: headers(token),
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

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ECO-Launcher',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requestAll(pathAndQuery, token) {
  const repos = [];
  let url = API_BASE + pathAndQuery;
  for (let page = 0; page < 5 && url; page += 1) {
    const res = await fetch(url, { headers: headers(token) });
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

module.exports = { fetchRepos, fetchStarred, fetchLatestRelease };
