// 生态监测站数据服务 — 采集 doinday 设备活动数据
// 主进程侧走 Chromium 网络栈（系统代理/证书），不受页面 CSP connect-src 限制
const { httpFetch } = require('./http');

const BASE = 'https://doinday.top';
const TZ = '-480'; // UTC+8（分钟，东八区为 -480）

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function getJson(path) {
  const res = await httpFetch(BASE + path, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`监测接口 ${res.status}: ${String(text).slice(0, 160)}`);
  }
  return res.json();
}

// 优先尝试一体化 dashboard 接口；不存在则回退 current + timeline 组合
async function fetchDashboard({ date, deviceId } = {}) {
  const day = date || today();
  const dev = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';

  const dash = await getJson(`/api/dashboard?date=${day}&tz=${TZ}${dev}`);
  if (dash) return { ...dash, source: 'dashboard' };

  const [current, timeline] = await Promise.all([
    getJson(`/api/current`),
    getJson(`/api/timeline?date=${day}&tz=${TZ}${dev}`),
  ]);
  return { date: day, current, timeline, source: 'combined' };
}

module.exports = { fetchDashboard };
