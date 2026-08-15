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

// 一体化 dashboard/view 接口：服务端已聚合成 UI 就绪数据（分组/配色/文案）
async function fetchDashboard({ date, deviceId } = {}) {
  const day = date || today();
  const dev = deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '';
  const data = await getJson(`/api/dashboard/view?date=${day}&tz=${TZ}${dev}`);
  if (!data) throw new Error('监测接口返回空数据');
  return { ...data, source: 'dashboard-view' };
}

module.exports = { fetchDashboard };
