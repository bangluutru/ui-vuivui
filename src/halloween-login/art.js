// Hình vẽ SVG tự vẽ cho <vv-halloween-login>. Màu lấy từ biến CSS để đổi ngày/đêm.

/** Cảnh núi ở cột trái (cả ngày lẫn đêm; phần tử .vvhl-day / .vvhl-night bật tắt theo chủ đề). */
export const SCENE_SVG = `
<svg class="vvhl-scene-svg" viewBox="0 0 320 380" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <radialGradient id="vvhl-sun" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff6d6"/><stop offset=".55" stop-color="#ffe08f"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vvhl-moon" cx="40%" cy="38%" r="65%">
      <stop offset="0" stop-color="#fff1d2"/><stop offset=".7" stop-color="#f3cf95"/><stop offset="1" stop-color="#d9a868"/>
    </radialGradient>
  </defs>
  <g class="vvhl-day vvhl-sky">
    <circle cx="96" cy="96" r="58" fill="url(#vvhl-sun)"/>
    <circle cx="96" cy="96" r="27" fill="#ffe7a3"/>
    <g fill="#ffffff" opacity=".85">
      <ellipse cx="220" cy="78" rx="34" ry="11"/><ellipse cx="246" cy="70" rx="22" ry="12"/>
      <ellipse cx="60" cy="150" rx="26" ry="8"/><ellipse cx="78" cy="144" rx="16" ry="9"/>
    </g>
  </g>
  <g class="vvhl-night vvhl-sky">
    <circle cx="110" cy="92" r="40" fill="#f3cf95" opacity=".18"/>
    <circle cx="110" cy="92" r="27" fill="url(#vvhl-moon)"/>
    <g fill="#c99a5f" opacity=".55"><circle cx="101" cy="86" r="4"/><circle cx="118" cy="100" r="5"/><circle cx="116" cy="81" r="2.5"/></g>
    <g fill="#2a2140" opacity=".9">
      <ellipse cx="226" cy="70" rx="40" ry="10"/><ellipse cx="250" cy="62" rx="24" ry="11"/>
      <ellipse cx="44" cy="158" rx="30" ry="8"/>
    </g>
    <g fill="#fff6dc"><circle cx="40" cy="40" r="1.2"/><circle cx="180" cy="30" r="1"/><circle cx="270" cy="120" r="1.3"/><circle cx="210" cy="150" r=".9"/><circle cx="20" cy="110" r=".9"/><circle cx="300" cy="40" r="1"/></g>
  </g>
  <path d="M0 270 L60 196 L104 238 L160 160 L214 226 L254 190 L320 250 L320 380 L0 380 Z" fill="var(--vvhl-m1)"/>
  <path d="M0 300 L48 258 L92 290 L150 236 L196 284 L236 258 L320 312 L320 380 L0 380 Z" fill="var(--vvhl-m2)"/>
  <g class="vvhl-night vvhl-wolf-wrap">
    <path d="M196 284 L214 246 L236 238 L262 252 L268 284 Z" fill="#120b1a"/>
    <g class="vvhl-wolf" fill="#120b1a">
      <path d="M222 246 C220 236 222 226 226 220 L224 210 L230 214 L236 204 L238 214 L246 212 L240 220 C244 228 246 238 244 248 Z"/>
      <path d="M244 244 C252 244 258 240 262 234 C260 242 254 248 244 250 Z"/>
    </g>
  </g>
  <g fill="var(--vvhl-tree)">
    <path d="M30 330 l12-34 12 34z M34 312 l8-26 8 26z"/>
    <path d="M70 344 l10-28 10 28z"/>
    <path d="M262 340 l12-36 12 36z M266 320 l8-26 8 26z"/>
    <path d="M292 352 l9-24 9 24z"/>
  </g>
</svg>`;

export const PUMPKIN_SVG = `
<svg viewBox="0 0 64 60" aria-hidden="true">
  <path d="M33 13c-2-6 0-10 5-12" fill="none" stroke="#3d6b2a" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="20" cy="36" rx="16" ry="21" fill="#d9661a"/>
  <ellipse cx="44" cy="36" rx="16" ry="21" fill="#d9661a"/>
  <ellipse cx="32" cy="36" rx="15" ry="23" fill="#f08a2c"/>
  <g class="vvhl-face">
    <path d="M18 30l8 5H16zM46 30l-8 5h10z"/>
    <path d="M17 43c7 7 23 7 30 0l-4 1-3 3-3-3-4 3-4-3-3 3-3-3z"/>
  </g>
</svg>`;

export const LANTERN_SVG = `
<svg viewBox="0 0 30 52" aria-hidden="true">
  <path d="M15 0v6" stroke="#5b4636" stroke-width="2"/>
  <path d="M8 8h14l-2 4H10z" fill="#3b2b20"/>
  <rect x="7" y="12" width="16" height="28" rx="3" fill="#ffcf6a" fill-opacity=".35" stroke="#3b2b20" stroke-width="2"/>
  <ellipse class="vvhl-flame" cx="15" cy="27" rx="4" ry="7" fill="#ffd36b"/>
  <path d="M7 40h16l-2 5H9z" fill="#3b2b20"/>
</svg>`;

export const WITCH_SVG = `
<svg viewBox="0 0 90 44" aria-hidden="true" fill="#120a1a">
  <path d="M6 32 L64 25" stroke="#120a1a" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M62 25 L84 16 L80 24 L88 26 L80 29 L84 35 Z"/>
  <path d="M30 28 C32 20 38 16 42 16 L46 4 L50 18 C54 20 56 24 54 30 Z"/>
  <path d="M40 30 L34 38 L38 38 L44 30 Z"/>
  <path d="M41 6 L56 12 L44 14 Z"/>
</svg>`;

export const BAT_SVG = `
<svg viewBox="0 0 32 14" aria-hidden="true" fill="#140d1d">
  <path d="M16 5c-1-2-3-2-3 0-3-4-8-5-13-2 4 0 6 2 6 5 2-1 4-1 5 1 1-1 3-1 5 0 2-1 4-1 5 0 1-2 3-2 5-1 0-3 2-5 6-5-5-3-10-2-13 2 0-2-2-2-3 0z"/>
</svg>`;

export const SPIDER_SVG = `
<svg viewBox="0 0 40 34" aria-hidden="true">
  <g stroke="#8d78ad" stroke-width="2" fill="none" stroke-linecap="round">
    <path d="M16 15 L6 6 L1 12M16 18 L4 16 L0 22M17 21 L7 26 L4 33M18 23 L12 30 L12 34"/>
    <path d="M24 15 L34 6 L39 12M24 18 L36 16 L40 22M23 21 L33 26 L36 33M22 23 L28 30 L28 34"/>
  </g>
  <ellipse cx="20" cy="20" rx="7" ry="8" fill="#6f5b8e"/>
  <circle cx="20" cy="11" r="4.5" fill="#7d68a0"/>
  <circle cx="18.3" cy="10.5" r="1.2" fill="#ffb347"/><circle cx="21.7" cy="10.5" r="1.2" fill="#ffb347"/>
</svg>`;

export const VINE_SVG = `
<svg viewBox="0 0 120 24" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 12 C15 2 25 22 40 12 S65 2 80 12 S105 22 120 12" fill="none" stroke="#6b3b1f" stroke-width="2"/>
  <path d="M28 10 c4-6 10-6 12-2 c-4 0-8 2-12 2z M70 14 c4 6 10 6 12 2 c-4 0-8-2-12-2z" fill="#a0461d"/>
  <circle cx="54" cy="8" r="2.4" fill="none" stroke="#6b3b1f" stroke-width="1.5"/>
  <circle cx="98" cy="16" r="2.4" fill="none" stroke="#6b3b1f" stroke-width="1.5"/>
</svg>`;

export const ICONS = {
  eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  torch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8.5 3.5 6v12L9 15.5z" fill="currentColor"/><rect x="9" y="9" width="12" height="6" rx="1.5" fill="currentColor"/><rect x="13" y="10.5" width="2.5" height="3" rx=".8" fill="#000" fill-opacity=".35"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></g></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 14.8A8 8 0 0 1 9.2 4.5a8 8 0 1 0 10.3 10.3z" fill="currentColor"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
