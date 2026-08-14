// 统一网络出口 — 走 Electron net（Chromium 网络栈）
// 使用系统代理与系统证书存储，避开 Node undici 内置 CA 在 HTTPS 拦截环境下握手失败的问题
const { net } = require('electron');

async function httpFetch(url, options = {}) {
  try {
    return await net.fetch(url, options);
  } catch (err) {
    throw new Error(describeNetError(err, url));
  }
}

/** 展开 cause 链，暴露真实原因（证书/重置/DNS），否则只剩一句 fetch failed */
function describeNetError(err, url) {
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* 保持原样 */
  }
  const chain = [];
  let cur = err;
  while (cur) {
    const msg = cur && cur.message;
    if (msg && !chain.includes(msg)) chain.push(msg);
    cur = cur && cur.cause;
  }
  return `网络请求失败（${host}）：${chain.join(' ← ') || String(err)}`;
}

module.exports = { httpFetch };
