// Máy in tham ăn — SVG tự vẽ. viewBox 0 0 200 170; miệng (khe giấy vào) ở y≈46, khay ra ở y≈128.

export const SLOT = { x: 100 / 200, y: 46 / 170, w: 120 / 200 };

export const PRINTER_SVG = `
<svg viewBox="0 0 200 170" aria-hidden="true">
  <defs>
    <linearGradient id="vvp-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#38bdf8"/>
    </linearGradient>
    <linearGradient id="vvp-top" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e0f2fe"/><stop offset="1" stop-color="#bae6fd"/>
    </linearGradient>
  </defs>
  <rect x="34" y="28" width="132" height="26" rx="10" fill="url(#vvp-top)" stroke="#0c4a6e" stroke-width="3"/>
  <path class="mouth" d="M48 44 Q100 58 152 44" fill="none" stroke="#0c4a6e" stroke-width="5" stroke-linecap="round"/>
  <rect x="14" y="50" width="172" height="86" rx="20" fill="url(#vvp-body)" stroke="#0c4a6e" stroke-width="3.5"/>
  <g class="eyes">
    <g class="eye"><ellipse cx="72" cy="84" rx="11" ry="13" fill="#fff" stroke="#0c4a6e" stroke-width="2.5"/><circle class="pupil" cx="74" cy="86" r="5.5" fill="#0c4a6e"/></g>
    <g class="eye"><ellipse cx="128" cy="84" rx="11" ry="13" fill="#fff" stroke="#0c4a6e" stroke-width="2.5"/><circle class="pupil" cx="130" cy="86" r="5.5" fill="#0c4a6e"/></g>
  </g>
  <ellipse cx="52" cy="104" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/>
  <ellipse cx="148" cy="104" rx="8" ry="5" fill="#f9a8d4" opacity=".7"/>
  <circle class="led" cx="166" cy="66" r="5" fill="#86efac" stroke="#0c4a6e" stroke-width="2"/>
  <rect x="40" y="122" width="120" height="14" rx="5" fill="#0c4a6e"/>
  <rect x="30" y="134" width="140" height="10" rx="4" fill="#bae6fd" stroke="#0c4a6e" stroke-width="3"/>
</svg>`;

/** Tờ giấy (để kéo vào) và tờ giấy in ra. */
export const PAPER_SVG = `
<svg viewBox="0 0 60 76" aria-hidden="true">
  <path d="M4 3h38l14 14v56H4z" fill="#fff" stroke="#64748b" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M42 3v14h14" fill="#e2e8f0" stroke="#64748b" stroke-width="2.5" stroke-linejoin="round"/>
  <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round"><path d="M12 28h34M12 38h34M12 48h26M12 58h30"/></g>
</svg>`;

export const ICONS = {
  printer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V3.5h10V9M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 14h10v6.5H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  soundOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18 6.3a8 8 0 0 1 0 11.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  soundOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
