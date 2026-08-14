// GitHub 服务 — 拉取用户仓库列表（Token 可选）
const API_BASE = 'https://api.github.com';

async function fetchRepos({ username, token } = {}) {
  if (token) {
    return requestAll('/user/repos?per_page=100&sort=updated&affiliation=owner', token);
  }
  if (username) {
    return requestAll(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=owner`, null);
  }
  throw new Error('请先在设置中配置 GitHub 用户名或 Token');
}

async function requestAll(pathAndQuery, token) {
  const repos = [];
  let url = API_BASE + pathAndQuery;
  for (let page = 0; page < 5 && url; page += 1) {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ECO-Launcher',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
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
  };
}

module.exports = { fetchRepos };
