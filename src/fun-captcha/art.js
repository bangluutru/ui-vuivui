// Hình vẽ SVG tự vẽ cho các trò nhỏ của <vv-fun-captcha>.

export const GAMES = {
  cat: {
    target: `
<svg viewBox="0 0 80 80" aria-hidden="true">
  <path d="M14 30 L18 6 L34 22 Z M66 30 L62 6 L46 22 Z" fill="#f2a65a" stroke="#7a4a1f" stroke-width="2" stroke-linejoin="round"/>
  <path d="M19 26 L20 13 L29 22 Z M61 26 L60 13 L51 22 Z" fill="#f7c9d0"/>
  <ellipse cx="40" cy="44" rx="30" ry="27" fill="#f6b46e" stroke="#7a4a1f" stroke-width="2"/>
  <path d="M26 30 q4 -4 8 0 M46 30 q4 -4 8 0" stroke="#d98a3e" stroke-width="3" fill="none" stroke-linecap="round"/>
  <g class="eyes"><ellipse cx="29" cy="40" rx="4" ry="5" fill="#2b1a10"/><ellipse cx="51" cy="40" rx="4" ry="5" fill="#2b1a10"/>
    <circle cx="30.3" cy="38.5" r="1.4" fill="#fff"/><circle cx="52.3" cy="38.5" r="1.4" fill="#fff"/></g>
  <path d="M37 49 h6 l-3 3 z" fill="#e0708a"/>
  <path class="mouth-closed" d="M33 56 q3.5 3 7 0 q3.5 3 7 0" stroke="#7a4a1f" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse class="mouth-open" cx="40" cy="58" rx="7" ry="6" fill="#7a2335"/>
  <g stroke="#7a4a1f" stroke-width="1.4" stroke-linecap="round"><path d="M14 50 h12 M14 55 l12 -2 M66 50 h-12 M66 55 l-12 -2"/></g>
</svg>`,
    item: `
<svg viewBox="0 0 60 36" aria-hidden="true">
  <path d="M8 18 C16 4 38 2 48 18 C38 34 16 32 8 18 Z" fill="#5aa9e6" stroke="#1f4e79" stroke-width="2"/>
  <path d="M46 18 L58 8 L56 18 L58 28 Z" fill="#3f8fd2" stroke="#1f4e79" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="18" cy="15" r="2.6" fill="#10263d"/>
  <path d="M26 10 q4 8 0 16 M33 9 q4 9 0 18" stroke="#1f4e79" stroke-width="1.5" fill="none" opacity=".6"/>
</svg>`,
  },
  hoop: {
    target: `
<svg viewBox="0 0 80 80" aria-hidden="true">
  <rect x="8" y="4" width="64" height="40" rx="6" fill="#ffd9bd" stroke="#c4531a" stroke-width="2.5"/>
  <rect x="28" y="18" width="24" height="18" rx="2" fill="none" stroke="#c4531a" stroke-width="2.5"/>
  <g class="net" stroke="#9a5a36" stroke-width="1.4" fill="none">
    <path d="M22 50 L30 74 M30 51 L35 74 M40 52 L40 74 M50 51 L45 74 M58 50 L50 74 M26 62 L54 62"/>
  </g>
  <ellipse cx="40" cy="50" rx="19" ry="4.5" fill="none" stroke="#e5571b" stroke-width="3.5"/>
</svg>`,
    item: `
<svg viewBox="0 0 40 40" aria-hidden="true">
  <circle cx="20" cy="20" r="18" fill="#f06a1d" stroke="#5a2207" stroke-width="1.5"/>
  <path d="M2 20h36M20 2v36M7 7c5 4 5 22 0 26M33 7c-5 4-5 22 0 26" fill="none" stroke="#4a1c06" stroke-width="1.4"/>
</svg>`,
  },
  bee: {
    target: `
<svg viewBox="0 0 80 80" aria-hidden="true">
  <path d="M40 46 C40 60 38 70 40 80" stroke="#3d8b3d" stroke-width="4" fill="none"/>
  <path d="M40 66 C30 60 24 64 22 70 C30 72 36 70 40 66 Z" fill="#5cb85c"/>
  <g class="petals" fill="#ff8fb1" stroke="#c2185b" stroke-width="1.2">
    <circle cx="40" cy="18" r="11"/><circle cx="58" cy="30" r="11"/><circle cx="52" cy="50" r="11"/>
    <circle cx="28" cy="50" r="11"/><circle cx="22" cy="30" r="11"/>
  </g>
  <circle cx="40" cy="34" r="10" fill="#ffd54f" stroke="#c79100" stroke-width="1.5"/>
</svg>`,
    item: `
<svg viewBox="0 0 48 40" aria-hidden="true">
  <ellipse class="wing" cx="20" cy="10" rx="8" ry="10" fill="#e3f2fd" stroke="#90caf9" stroke-width="1.5"/>
  <ellipse class="wing" cx="30" cy="10" rx="7" ry="9" fill="#e3f2fd" stroke="#90caf9" stroke-width="1.5"/>
  <ellipse cx="24" cy="24" rx="16" ry="12" fill="#ffca28" stroke="#5d4037" stroke-width="1.8"/>
  <path d="M20 13 v22 M28 13 v22" stroke="#3e2723" stroke-width="4"/>
  <circle cx="38" cy="22" r="2" fill="#3e2723"/>
  <path d="M8 24 l-6 2 6 2" fill="#3e2723"/>
</svg>`,
  },
};

export const ICONS = {
  tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.5 4 4 9-9.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95M19 4.5V8h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
