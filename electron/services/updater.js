// 自我更新服务 — 检查/下载/安装 ECO 自身的 GitHub Release
// 匿名访问 GitHub API（无需 token），下载走 Chromium 网络栈（系统代理/证书）
const { app, net } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { httpFetch } = require('./http');

const REPO = 'Muelsyselove/Rhine-Lab-Ecological-Section';

/** 'v0.1.8' → [0,1,8]；无法解析返回 null */
function parseVer(v) {
  const m = String(v || '').trim().replace(/^v/i, '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

function isNewer(latest, current) {
  for (let i = 0; i < 3; i++) {
    if (latest[i] !== current[i]) return latest[i] > current[i];
  }
  return false;
}

/** 检查最新 Release：{ current, packaged, latest, hasUpdate, notes, htmlUrl, asset } */
async function check() {
  const res = await httpFetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ECO-Updater' },
  });
  if (!res.ok) throw new Error(`更新检查失败：GitHub HTTP ${res.status}`);
  const rel = await res.json();
  const latest = parseVer(rel.tag_name);
  const current = parseVer(app.getVersion());
  const asset = (rel.assets || []).find((a) => /^ECO-Setup-.+\.exe$/i.test(a.name || ''));
  const hasUpdate = !!(latest && current && isNewer(latest, current) && asset);
  return {
    current: app.getVersion(),
    packaged: app.isPackaged,
    latest: rel.tag_name || '',
    latestVersion: latest ? latest.join('.') : String(rel.tag_name || ''),
    hasUpdate,
    notes: rel.body || '',
    htmlUrl: rel.html_url || '',
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size || 0 } : null,
  };
}

/** 流式下载（手动跟随重定向，GitHub 资产会 302 到 CDN）
 *  expectedSize：API 已知的目标大小。代理环境响应头常无 content-length（chunked），
 *  用它兜底，保证进度条与总大小正确显示 */
function downloadTo(url, dest, onProgress, hops = 0, expectedSize = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 8) return reject(new Error('下载重定向次数过多'));
    const req = net.request({ url });
    req.on('response', (res) => {
      const loc = res.headers && res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc && loc[0]) {
        resolve(downloadTo(new URL(loc[0], url).toString(), dest, onProgress, hops + 1, expectedSize));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败：HTTP ${res.statusCode}`));
        return;
      }
      const total = Number((res.headers['content-length'] || [])[0] || 0) || expectedSize;
      let got = 0;
      const out = fs.createWriteStream(dest);
      res.on('data', (chunk) => {
        got += chunk.length;
        out.write(chunk);
        if (onProgress) onProgress({ got, total, percent: total ? Math.floor((got / total) * 100) : -1 });
      });
      res.on('end', () => out.end(() => resolve({ path: dest, size: got, total })));
      res.on('error', (err) => {
        out.destroy();
        reject(err);
      });
      out.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

let _downloading = false;

/** 下载安装包到临时目录，返回保存路径；onProgress({ got, total, percent }) */
async function download(asset, onProgress) {
  if (_downloading) throw new Error('已有更新任务在进行');
  if (!asset || !asset.url) throw new Error('缺少下载地址');
  _downloading = true;
  try {
    const dest = path.join(app.getPath('temp'), asset.name || 'ECO-Setup-latest.exe');
    const r = await downloadTo(asset.url, dest, onProgress, 0, asset.size || 0);
    if (r.total && r.size !== r.total) throw new Error('下载不完整，请重试');
    return { path: r.path, size: r.size };
  } finally {
    _downloading = false;
  }
}

/** 拉起安装包并退出自身（安装向导可见，不闪 cmd） */
function install(filePath) {
  const exe = filePath;
  if (!exe || !fs.existsSync(exe)) return { ok: false, error: '安装包不存在，请重新下载' };
  spawn(exe, [], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  setTimeout(() => app.quit(), 400);
  return { ok: true };
}

module.exports = { check, download, install };
