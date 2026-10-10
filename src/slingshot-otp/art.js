// Ná cao su tự vẽ. viewBox 0 0 120 170; hai đầu chạc (chỗ buộc dây) và vị trí túi đạn khi nghỉ:
export const SLING_POINTS = {
  tipL: { x: 22 / 120, y: 24 / 170 },
  tipR: { x: 98 / 120, y: 24 / 170 },
  rest: { x: 60 / 120, y: 32 / 170 },
};

export const SLING_SVG = `
<svg viewBox="0 0 120 170" aria-hidden="true">
  <defs>
    <linearGradient id="vv-wood" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#5a2c12"/>
      <stop offset=".45" stop-color="#9a5427"/>
      <stop offset="1" stop-color="#4a230e"/>
    </linearGradient>
    <linearGradient id="vv-brass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6dc8c"/>
      <stop offset="1" stop-color="#a87a22"/>
    </linearGradient>
  </defs>
  <path d="M50 168 L48 106 C38 92 20 66 15 30 L29 27 C33 58 46 80 60 90 C74 80 87 58 91 27 L105 30 C100 66 82 92 72 106 L70 168 Z"
        fill="url(#vv-wood)" stroke="#2e1608" stroke-width="2" stroke-linejoin="round"/>
  <path d="M51 120h18M51 130h18M51 140h18M51 150h18M51 160h18" stroke="#2e1608" stroke-opacity=".55" stroke-width="3"/>
  <circle cx="60" cy="100" r="7" fill="url(#vv-brass)" stroke="#6b4a10" stroke-width="1.5"/>
  <rect x="12" y="16" width="20" height="13" rx="3" fill="url(#vv-brass)" stroke="#6b4a10" stroke-width="1.5"/>
  <rect x="88" y="16" width="20" height="13" rx="3" fill="url(#vv-brass)" stroke="#6b4a10" stroke-width="1.5"/>
</svg>`;

export const ICONS = {
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  backspace: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="m11.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
