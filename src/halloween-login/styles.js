// CSS của <vv-halloween-login>. Thẻ này KHÔNG dùng shadow DOM (để trình quản lý mật khẩu
// nhận ra form), nên mọi quy tắc đều nằm dưới `vv-halloween-login` và lớp có tiền tố vvhl-.
// Được chèn vào <head> một lần.

const H = 'vv-halloween-login';

export const STYLES = `
${H} {
  --vvhl-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --vvhl-title-font: Georgia, "Times New Roman", serif;
  --vvhl-radius: 22px;
  display: block;
  max-width: 760px;
  font-family: var(--vvhl-font);
  -webkit-tap-highlight-color: transparent;
}
${H}[hidden] { display: none; }
${H} *, ${H} *::before, ${H} *::after { box-sizing: border-box; }

/* ---------- Bảng màu ngày / đêm ---------- */
${H} .vvhl-stage {
  --vvhl-ink: #1f2d2b; --vvhl-muted: #5f716e; --vvhl-panel: rgba(255,255,255,.72); --vvhl-line: rgba(31,45,43,.12);
  --vvhl-field: rgba(255,255,255,.9); --vvhl-field-line: rgba(31,45,43,.14); --vvhl-field-ink: #1f2d2b;
  --vvhl-btn-1: #2d8f87; --vvhl-btn-2: #1f6f69; --vvhl-link: #1f6f69;
  --vvhl-sky-1: #9cc3d6; --vvhl-sky-2: #dce9ee; --vvhl-m1: #7c98a2; --vvhl-m2: #4d6a74; --vvhl-tree: #2f4a52;
  --vvhl-page-1: #c9dde5; --vvhl-page-2: #e9f1f3;
  --vvhl-bad: #c62f3c;
  position: relative; isolation: isolate;
  padding: 26px;
  border-radius: calc(var(--vvhl-radius) + 14px);
  background: linear-gradient(180deg, var(--vvhl-page-1), var(--vvhl-page-2));
  color: var(--vvhl-ink);
  container-type: inline-size;
  transition: background .6s;
  overflow: hidden;
}
${H} .vvhl-stage[data-theme="night"] {
  --vvhl-ink: #f3e9ff; --vvhl-muted: #b3a5c9; --vvhl-panel: rgba(22,15,34,.92); --vvhl-line: rgba(242,138,44,.55);
  --vvhl-field: #241a38; --vvhl-field-line: #3d2e58; --vvhl-field-ink: #f3e9ff;
  --vvhl-btn-1: #f59a3c; --vvhl-btn-2: #d8661c; --vvhl-link: #f5b56b;
  --vvhl-sky-1: #1b1330; --vvhl-sky-2: #3a2a55; --vvhl-m1: #2c2245; --vvhl-m2: #1d1630; --vvhl-tree: #120c1d;
  --vvhl-page-1: #1a1129; --vvhl-page-2: #2c1d3f;
  --vvhl-bad: #ff6b6b;
}

/* ---------- Thẻ chính ---------- */
${H} .vvhl-card {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 42% 58%;
  min-height: 400px; overflow: hidden;
  border-radius: var(--vvhl-radius);
  border: 1.5px solid var(--vvhl-line);
  background: var(--vvhl-panel);
  box-shadow: 0 24px 60px -24px rgba(10, 20, 30, .45);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  transition: border-color .6s, background .6s;
}
${H} .vvhl-scene {
  position: relative; overflow: hidden; margin: 10px; border-radius: calc(var(--vvhl-radius) - 8px);
  background: linear-gradient(180deg, var(--vvhl-sky-1), var(--vvhl-sky-2));
  color: #fff; transition: background .6s;
}
${H} .vvhl-scene-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
${H} .vvhl-scene-svg path, ${H} .vvhl-scene-svg g { transition: fill .6s, opacity .6s; }
${H} .vvhl-scene-text { position: absolute; left: 18px; right: 18px; bottom: 22px; text-align: center; text-shadow: 0 1px 6px rgba(0,0,0,.45); }
${H} .vvhl-scene-text h3 { margin: 0 0 6px; font: 700 1.15rem/1.2 var(--vvhl-title-font); }
${H} .vvhl-scene-text p { margin: 0; font-size: .8rem; line-height: 1.45; opacity: .9; }

${H} .vvhl-stage[data-theme="day"] .vvhl-night,
${H} .vvhl-stage[data-theme="night"] .vvhl-day { opacity: 0; visibility: hidden; }
${H} .vvhl-night, ${H} .vvhl-day { transition: opacity .6s, visibility .6s; }

/* Công tắc ngày/đêm */
${H} .vvhl-switch {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  width: 34px; height: 62px; padding: 0; border-radius: 999px; cursor: pointer;
  border: 1.5px solid rgba(255,255,255,.6); background: rgba(255,255,255,.28);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
}
${H} .vvhl-switch .vvhl-knob {
  position: absolute; left: 3px; top: 3px; width: 25px; height: 25px; border-radius: 50%;
  display: grid; place-items: center; background: #fff; color: #f0a020;
  box-shadow: 0 2px 6px rgba(0,0,0,.25); transition: transform .35s cubic-bezier(.3,1.4,.5,1), background .35s, color .35s;
}
${H} .vvhl-switch .vvhl-knob svg { width: 16px; height: 16px; }
${H} .vvhl-stage[data-theme="night"] .vvhl-switch .vvhl-knob { transform: translateY(28px); background: #f3cf95; color: #3a2a55; }

/* ---------- Form ---------- */
${H} .vvhl-main { position: relative; display: flex; flex-direction: column; justify-content: center; padding: 34px 34px 28px; }
${H} .vvhl-form { display: flex; flex-direction: column; gap: 12px; }
${H} .vvhl-title { margin: 0 0 10px; text-align: center; font: 700 1.6rem/1.2 var(--vvhl-title-font); letter-spacing: .01em; color: var(--vvhl-ink); }
${H} .vvhl-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
${H} .vvhl-input {
  width: 100%; min-height: 46px; margin: 0; padding: 11px 14px;
  border-radius: 12px; border: 1.5px solid var(--vvhl-field-line);
  background: var(--vvhl-field); color: var(--vvhl-field-ink); -webkit-text-fill-color: var(--vvhl-field-ink);
  font: 16px/1.3 var(--vvhl-font); /* ≥16px: iOS không tự phóng to */
  caret-color: var(--vvhl-btn-1);
  outline: none; transition: border-color .2s, box-shadow .2s, background .6s;
  -webkit-appearance: none; appearance: none;
}
${H} .vvhl-input::placeholder { color: var(--vvhl-muted); -webkit-text-fill-color: var(--vvhl-muted); opacity: .8; }
${H} .vvhl-input:focus { border-color: var(--vvhl-btn-1); box-shadow: 0 0 0 3px color-mix(in srgb, var(--vvhl-btn-1) 30%, transparent); }
${H} .vvhl-input:-webkit-autofill,
${H} .vvhl-input:-webkit-autofill:hover,
${H} .vvhl-input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--vvhl-field-ink);
  box-shadow: 0 0 0 1000px var(--vvhl-field) inset;
  transition: background-color 9999s;
}
${H} .vvhl-pw { position: relative; }
${H} .vvhl-pw .vvhl-input { padding-right: 50px; }
${H} .vvhl-eye {
  position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
  width: 38px; height: 38px; padding: 0; border: 0; border-radius: 10px; cursor: pointer;
  display: grid; place-items: center; background: transparent; color: var(--vvhl-muted);
}
${H} .vvhl-eye:hover { color: var(--vvhl-ink); }
${H} .vvhl-eye svg { width: 21px; height: 21px; }
${H} .vvhl-stage[data-theme="night"] .vvhl-eye { color: #f5c46b; }
${H} .vvhl-stage[data-theme="night"] .vvhl-eye[aria-pressed="true"] { color: #ffe9a8; filter: drop-shadow(0 0 6px rgba(255,214,120,.9)); }

/* Đèn pin bật: ô mật khẩu hiện chữ nhưng bị che bằng mặt nạ hình nón —
   chỉ phần nằm trong luồng sáng mới thấy. Nền/viền ô vẽ ở lớp bọc để không bị che theo. */
${H} .vvhl-stage.vvhl-torch .vvhl-pw {
  border-radius: 12px; background: var(--vvhl-field);
  box-shadow: inset 0 0 0 1.5px var(--vvhl-field-line);
}
${H} .vvhl-stage.vvhl-torch .vvhl-pw:focus-within { box-shadow: inset 0 0 0 1.5px var(--vvhl-btn-1), 0 0 0 3px color-mix(in srgb, var(--vvhl-btn-1) 30%, transparent); }
${H} .vvhl-stage.vvhl-torch .vvhl-pw .vvhl-input {
  background: transparent; border-color: transparent; box-shadow: none;
  color: #fff1c9; -webkit-text-fill-color: #fff1c9; caret-color: #ffd27a;
  text-shadow: 0 0 8px rgba(255, 210, 120, .55);
  --vvhl-cone: conic-gradient(from var(--vvhl-from, 255deg) at var(--vvhl-mx, 100%) var(--vvhl-my, 50%),
    transparent 0deg, #000 1.5deg, #000 calc(var(--vvhl-span, 30deg) - 1.5deg), transparent var(--vvhl-span, 30deg));
  -webkit-mask-image: var(--vvhl-cone); mask-image: var(--vvhl-cone);
}
${H} .vvhl-stage.vvhl-torch .vvhl-pw .vvhl-input:-webkit-autofill { -webkit-text-fill-color: #fff1c9; box-shadow: none; }

${H} .vvhl-row { display: flex; justify-content: flex-end; margin-top: -4px; }
${H} .vvhl-link {
  padding: 2px 0; border: 0; background: none; cursor: pointer;
  font: 600 .82rem var(--vvhl-font); color: var(--vvhl-link); text-decoration: none;
}
${H} .vvhl-link:hover { text-decoration: underline; }
${H} .vvhl-msg { min-height: 20px; margin: -2px 0 0; font-size: .82rem; font-weight: 600; color: var(--vvhl-bad); text-align: center; }
${H} .vvhl-submit {
  min-height: 48px; margin-top: 2px; padding: 10px 18px; border: 0; border-radius: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  font: 700 1rem var(--vvhl-font); color: #fff;
  background: linear-gradient(180deg, var(--vvhl-btn-1), var(--vvhl-btn-2));
  box-shadow: 0 10px 22px -12px var(--vvhl-btn-2);
  transition: filter .15s, transform .15s, background .6s;
}
${H} .vvhl-submit:hover { filter: brightness(1.06); }
${H} .vvhl-submit:active { transform: translateY(1px); }
${H} .vvhl-submit:disabled { cursor: progress; filter: saturate(.6); opacity: .8; }
${H} .vvhl-submit svg { width: 18px; height: 18px; }
${H} .vvhl-signup { margin: 4px 0 0; text-align: center; font-size: .84rem; color: var(--vvhl-muted); }
${H} .vvhl-form.vvhl-shake { animation: vvhl-shake .45s ease-out; }
@keyframes vvhl-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-9px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(2px); } }
${H} :focus-visible { outline: 3px solid #2b6cff; outline-offset: 2px; }
${H} .vvhl-input:focus-visible { outline: none; }

${H} .vvhl-tools { position: absolute; top: 12px; right: 12px; }
${H} .vvhl-sound { width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; background: transparent; color: var(--vvhl-muted); }
${H} .vvhl-sound[aria-pressed="true"] { color: var(--vvhl-link); }
${H} .vvhl-sound svg { width: 18px; height: 18px; }

/* Thành công */
${H} .vvhl-success { text-align: center; animation: vvhl-rise .4s cubic-bezier(.2,1.4,.4,1); }
${H} .vvhl-success[hidden] { display: none; }
@keyframes vvhl-rise { from { opacity: 0; transform: translateY(12px) scale(.97); } }
${H} .vvhl-badge { width: 54px; height: 54px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--vvhl-btn-1); box-shadow: 0 0 0 8px color-mix(in srgb, var(--vvhl-btn-1) 22%, transparent); }
${H} .vvhl-badge svg { width: 28px; height: 28px; }
${H} .vvhl-success h2 { margin: 0 0 6px; font: 700 1.4rem var(--vvhl-title-font); }
${H} .vvhl-success p { margin: 0 0 4px; color: var(--vvhl-muted); font-size: .9rem; }

/* ---------- Trang trí đêm Halloween (chỉ để xem, không bắt chuột) ---------- */
${H} .vvhl-deco { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
${H} .vvhl-pumpkin { position: absolute; width: 52px; height: 49px; transition: transform .5s cubic-bezier(.3,1.5,.5,1), opacity .5s; }
${H} .vvhl-pumpkin svg { width: 100%; height: 100%; display: block; overflow: visible; }
${H} .vvhl-pumpkin .vvhl-face { fill: #4a1d05; transition: fill .25s, filter .25s; }
${H} .vvhl-pumpkin.vvhl-lit .vvhl-face { fill: #ffe27a; filter: drop-shadow(0 0 4px #ffb12e); }
${H} .vvhl-p-tl { left: 2px; top: 0; } ${H} .vvhl-p-tr { right: 2px; top: 0; }
${H} .vvhl-p-bl { left: 2px; bottom: 2px; } ${H} .vvhl-p-br { right: 2px; bottom: 2px; }
${H} .vvhl-stage[data-theme="day"] .vvhl-pumpkin { transform: scale(.3); }
${H} .vvhl-vine { position: absolute; left: 54px; right: 54px; height: 20px; }
${H} .vvhl-vine svg { width: 100%; height: 100%; display: block; }
${H} .vvhl-vine-t { top: 16px; } ${H} .vvhl-vine-b { bottom: 16px; transform: scaleY(-1); }
${H} .vvhl-lantern { position: absolute; top: 46%; width: 22px; height: 38px; }
${H} .vvhl-lantern svg { width: 100%; height: 100%; display: block; }
${H} .vvhl-l-l { left: 2px; } ${H} .vvhl-l-r { right: 2px; }
${H} .vvhl-flame { transform-box: fill-box; transform-origin: 50% 100%; animation: vvhl-flicker 1.6s ease-in-out infinite; }
@keyframes vvhl-flicker { 0%,100% { transform: scale(1, 1); opacity: 1; } 30% { transform: scale(.9, 1.12); } 60% { transform: scale(1.06, .9); opacity: .85; } }
${H} .vvhl-witch { position: absolute; top: 2px; left: 100%; width: 64px; height: 31px; animation: vvhl-fly 16s linear infinite; }
${H} .vvhl-witch svg { width: 100%; height: 100%; display: block; }
@keyframes vvhl-fly {
  0% { transform: translate(0, 10px); } 50% { transform: translate(calc(-50cqw - 40px), -2px); }
  100% { transform: translate(calc(-100cqw - 100px), 8px); }
}
${H} .vvhl-bat { position: absolute; width: 22px; height: 10px; }
${H} .vvhl-bat svg { width: 100%; height: 100%; display: block; animation: vvhl-flap .35s ease-in-out infinite alternate; transform-origin: 50% 40%; }
@keyframes vvhl-flap { to { transform: scaleY(.35); } }
${H} .vvhl-b1 { top: 6%; left: 24%; animation: vvhl-drift 7s ease-in-out infinite; }
${H} .vvhl-b2 { top: 12%; left: 33%; width: 16px; animation: vvhl-drift 9s ease-in-out -3s infinite; }
${H} .vvhl-b3 { top: 4%; right: 18%; width: 18px; animation: vvhl-drift 8s ease-in-out -5s infinite; }
@keyframes vvhl-drift { 50% { transform: translate(14px, 8px); } }

${H} .vvhl-spider { position: absolute; top: 0; left: 76%; width: 30px; pointer-events: none; z-index: 1; }
${H} .vvhl-spider .vvhl-thread { position: absolute; left: 14.5px; top: 0; width: 1px; height: var(--vvhl-drop, 40px); background: rgba(220,210,240,.55); }
${H} .vvhl-spider .vvhl-bug { position: absolute; left: 0; top: 0; width: 30px; height: 26px; transform: translateY(calc(var(--vvhl-drop, 40px) - 6px)) rotate(var(--vvhl-swing, 0deg)); transform-origin: 50% -40px; }
${H} .vvhl-spider .vvhl-bug svg { width: 100%; height: 100%; display: block; }

${H} .vvhl-wolf { transform-box: fill-box; transform-origin: 30% 100%; }
${H} .vvhl-stage.vvhl-howl .vvhl-wolf { animation: vvhl-howl 1.8s ease-in-out; }
@keyframes vvhl-howl { 20%, 80% { transform: rotate(-12deg); } }

/* ---------- Luồng đèn pin ---------- */
${H} .vvhl-beam {
  position: absolute; inset: 0; z-index: 3; pointer-events: none;
  opacity: 0; transition: opacity .2s;
  background: radial-gradient(circle at var(--vvhl-ox, 80%) var(--vvhl-oy, 50%), rgba(255,236,180,.55), rgba(255,214,140,.22) 40%, rgba(255,200,120,0) 75%);
  mix-blend-mode: screen;
}
${H} .vvhl-stage.vvhl-torch .vvhl-beam { opacity: 1; }

/* Chế độ tương phản cao: đèn pin = hiện mật khẩu rõ ràng, không hiệu ứng */
@media (forced-colors: active), (prefers-contrast: more) {
  ${H} .vvhl-stage.vvhl-torch .vvhl-pw .vvhl-input { -webkit-mask-image: none; mask-image: none; color: CanvasText; -webkit-text-fill-color: CanvasText; text-shadow: none; }
  ${H} .vvhl-beam { display: none; }
}

/* ---------- Màn hẹp: cảnh núi thành dải ở trên ---------- */
@container (max-width: 600px) {
  ${H} .vvhl-stage { padding: 20px 12px; }
  ${H} .vvhl-card { grid-template-columns: 1fr; min-height: 0; }
  ${H} .vvhl-scene { height: 160px; }
  /* dải ngang: dời cảnh lên để thấy đỉnh núi + sói; mặt trời/trăng vẽ riêng bằng CSS */
  ${H} .vvhl-scene-svg { height: auto; aspect-ratio: 320 / 380; transform: translateY(-40%); }
  ${H} .vvhl-scene-svg .vvhl-sky { display: none; }
  ${H} .vvhl-scene::before {
    content: ""; position: absolute; left: 16%; top: 20px; width: 42px; height: 42px; border-radius: 50%;
    background: radial-gradient(circle at 40% 38%, #fff6d6, #ffe08f 60%, #ffd36b);
    box-shadow: 0 0 0 14px rgba(255, 224, 143, .25), 0 0 40px 10px rgba(255, 224, 143, .45);
    transition: background .6s, box-shadow .6s;
  }
  ${H} .vvhl-stage[data-theme="night"] .vvhl-scene::before {
    background: radial-gradient(circle at 40% 38%, #fff1d2, #f3cf95 70%, #d9a868);
    box-shadow: 0 0 0 12px rgba(243, 207, 149, .12), 0 0 30px 6px rgba(243, 207, 149, .25);
  }
  ${H} .vvhl-scene-text { bottom: 14px; }
  ${H} .vvhl-scene-text p { display: none; }
  ${H} .vvhl-main { padding: 22px 18px 20px; }
  ${H} .vvhl-pumpkin { width: 38px; height: 36px; }
  ${H} .vvhl-vine { left: 40px; right: 40px; top: 10px; }
  ${H} .vvhl-vine-b { top: auto; bottom: 10px; }
  ${H} .vvhl-lantern { display: none; }
  ${H} .vvhl-spider { left: 82%; }
}

@media (prefers-reduced-motion: reduce) {
  ${H} *, ${H} *::before, ${H} *::after { animation: none !important; transition: none !important; }
  ${H} .vvhl-witch { display: none; }
}
`;
