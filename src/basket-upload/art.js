// Hình vẽ SVG tự vẽ (không dùng ảnh ngoài) cho bộ da bóng rổ.
// Rổ dùng viewBox 0 0 160 130; tâm vành rổ ở (80, 90).

export const RIM_CENTER = { x: 80 / 160, y: 90 / 130 };

export const BALL_SVG = `
<svg viewBox="0 0 40 40" aria-hidden="true">
  <defs>
    <radialGradient id="vv-ball" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffb46b"/>
      <stop offset=".6" stop-color="#f06a1d"/>
      <stop offset="1" stop-color="#b8410b"/>
    </radialGradient>
  </defs>
  <circle cx="20" cy="20" r="19" fill="url(#vv-ball)" stroke="#5a2207" stroke-width="1.2"/>
  <g fill="none" stroke="#4a1c06" stroke-width="1.3" stroke-linecap="round">
    <path d="M1.5 20h37M20 1.5v37"/>
    <path d="M7 6.5c5.2 4.4 5.2 22.6 0 27M33 6.5c-5.2 4.4-5.2 22.6 0 27"/>
  </g>
</svg>`;

export const HOOP_BACK_SVG = `
<svg viewBox="0 0 160 130" aria-hidden="true">
  <defs>
    <linearGradient id="vv-board" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd9bd"/>
      <stop offset="1" stop-color="#f4a97c"/>
    </linearGradient>
  </defs>
  <rect x="10" y="3" width="140" height="80" rx="10" fill="url(#vv-board)" stroke="#c4531a" stroke-width="3"/>
  <rect x="16" y="9" width="128" height="68" rx="6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.5"/>
  <rect x="58" y="36" width="44" height="32" rx="3" fill="none" stroke="#c4531a" stroke-width="3"/>
  <rect x="73" y="80" width="14" height="9" rx="2" fill="#8a3a12"/>
  <path d="M46 90 A34 7 0 0 1 114 90" fill="none" stroke="#a8380b" stroke-width="4.5" stroke-linecap="round"/>
</svg>`;

/** Lưới: các sợi dọc từ vành xuống đáy hẹp, cộng hai hàng ngang zigzag. */
function netPaths() {
  const top = [];
  const bottom = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);
    top.push({ x: 80 - 34 * Math.cos(a), y: 90 + 7 * Math.sin(a) });
    bottom.push({ x: 62 + (36 * i) / n, y: 126 });
  }
  const strands = top.map((t, i) => `M${t.x.toFixed(1)} ${t.y.toFixed(1)} L${bottom[i].x.toFixed(1)} ${bottom[i].y}`);
  const rows = [0.38, 0.72].map((k) => {
    const pts = top.map((t, i) => {
      const b = bottom[i];
      const j = i % 2 ? 4 : 0;
      return `${(t.x + (b.x - t.x) * k).toFixed(1)} ${(t.y + (b.y - t.y) * k + j).toFixed(1)}`;
    });
    return `M${pts.join(' L')}`;
  });
  return [...strands, ...rows].join(' ');
}

export const HOOP_FRONT_SVG = `
<svg viewBox="0 0 160 130" aria-hidden="true">
  <g class="net"><path d="${netPaths()}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></g>
  <path class="rim-front" d="M46 90 A34 7 0 0 0 114 90" fill="none" stroke="#e5571b" stroke-width="5" stroke-linecap="round"/>
</svg>`;

export const ICONS = {
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.7-8.95A6 6 0 0 1 17.8 8.6 4.2 4.2 0 0 1 17.5 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 20v-8m-3.2 3L12 11.8 15.2 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  miss: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 8.5 7 7m0-7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  ball: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f06a1d" stroke="#5a2207" stroke-width="1"/><path d="M2 12h20M12 2v20M5 4.8c2.9 2.6 2.9 11.8 0 14.4M19 4.8c-2.9 2.6-2.9 11.8 0 14.4" fill="none" stroke="#4a1c06" stroke-width="1"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2m-6.5 0 .8 12h7.4l.8-12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M56 6C40 6 22 14 10 30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 20l2 11 10-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
