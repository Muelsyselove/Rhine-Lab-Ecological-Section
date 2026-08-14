/* ECO 项目头像生成器 — 由项目名确定性生成六边形生态徽章 */
(function () {
  window.ECO = window.ECO || {};

  const PALETTES = [
    ['#0f9a8a', '#5eead4'],
    ['#1fb6cf', '#8be3f2'],
    ['#4dab7a', '#a4e5c3'],
    ['#0a8f9e', '#67e0d8'],
  ];

  ECO.avatarSVG = function (name, size = 44) {
    const text = String(name || '?');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    const [deep, light] = PALETTES[hash % PALETTES.length];
    const motif = hash % 3;
    const letter = (text[0] || '?').toUpperCase();
    const rings = [
      `<path d="M24 7l14.7 8.5v17L24 41l-14.7-8.5v-17z" fill="none" stroke="${deep}" stroke-width="1.6"/>`,
      `<path d="M24 11.5l10.8 6.3v12.4L24 36.5l-10.8-6.3V17.8z" fill="none" stroke="${light}" stroke-width="1" stroke-dasharray="3 2.4"/>`,
      `<path d="M24 16l6.9 4v8L24 32l-6.9-4v-8z" fill="${light}" fill-opacity=".22" stroke="${deep}" stroke-width="1"/>`,
    ];
    const ornaments = [
      `<circle cx="38.5" cy="15" r="1.6" fill="${deep}"/>`,
      `<path d="M9 33.5c2-1.2 3.4-1.2 5.5 0" stroke="${deep}" stroke-width="1.1" fill="none"/>`,
      `<path d="M33 9.5l2.6 1.5M36.8 34.6l-2.4-1.4" stroke="${light}" stroke-width="1.2"/>`,
    ];
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <g>${rings.join('')}</g>
        ${ornaments[motif]}
        <text x="24" y="28.6" text-anchor="middle"
          font-family="IBM Plex Mono, Consolas, monospace" font-size="13" font-weight="600"
          fill="${deep}">${letter}</text>
      </svg>
    `;
  };
})();
