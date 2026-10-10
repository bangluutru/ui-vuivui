// CSS của <vv-slingshot-otp>. Đổi màu bằng biến --vv-* trên chính element.

export const STYLES = `
:host {
  --vv-sky-1: #f1f6f9;
  --vv-sky-2: #d6e3ea;
  --vv-ink: #0f172a;
  --vv-muted: #64748b;
  --vv-panel: rgba(255, 255, 255, .94);
  --vv-box: #f8fafc;
  --vv-box-line: #cbd5e1;
  --vv-fill: #1e3a8a;
  --vv-fill-bg: #eff6ff;
  --vv-fill-line: #93c5fd;
  --vv-active: #f5b23d;
  --vv-primary: #1e3a5f;
  --vv-bad: #e11d48;
  --vv-ok: #16a34a;
  --vv-ammo-1: #ffe08a;
  --vv-ammo-2: #f5b23d;
  --vv-ammo-3: #c98512;
  --vv-radius: 22px;
  --vv-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: block;
  max-width: 440px;
  color: var(--vv-ink);
  font-family: var(--vv-font);
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; }

.card {
  position: relative; isolation: isolate; overflow: hidden;
  border-radius: var(--vv-radius);
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,.9), transparent 70%),
    linear-gradient(180deg, var(--vv-sky-1), var(--vv-sky-2));
  box-shadow: 0 18px 50px -20px rgba(15, 40, 70, .35);
  container-type: inline-size;
}

/* ---------- Bảng mã ---------- */
.panel {
  position: relative; z-index: 3;
  margin: 14px; padding: 16px 14px 14px;
  border-radius: 18px; text-align: center;
  background: var(--vv-panel);
  box-shadow: 0 10px 30px -14px rgba(15, 40, 70, .35), 0 0 0 1px rgba(15, 40, 70, .05);
}
.top { display: flex; align-items: center; justify-content: center; position: relative; }
.kicker { margin: 0; font-size: .64rem; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #2f6fd0; }
.sound {
  position: absolute; right: -2px; top: -4px;
  width: 30px; height: 30px; border-radius: 50%; border: 0; cursor: pointer;
  display: grid; place-items: center; background: transparent; color: var(--vv-muted);
}
.sound[aria-pressed="true"] { color: #2f6fd0; background: rgba(47,111,208,.1); }
.sound svg { width: 17px; height: 17px; }
.title { margin: 4px 0 4px; font-size: 1.45rem; font-weight: 800; letter-spacing: -.01em; }
.intro { margin: 0 auto; max-width: 34ch; font-size: .82rem; line-height: 1.4; color: #475569; }
.intro b { color: var(--vv-ink); }

.boxes { position: relative; display: flex; justify-content: center; gap: 7px; margin: 14px auto 4px; max-width: 320px; }
.box {
  flex: 1 1 0; max-width: 44px; aspect-ratio: 44 / 52;
  display: grid; place-items: center;
  border-radius: 10px; border: 1.5px solid var(--vv-box-line); background: var(--vv-box);
  font: 750 1.3rem/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; color: var(--vv-fill);
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.box.filled { border-color: var(--vv-fill-line); background: var(--vv-fill-bg); }
.box.active { border-color: var(--vv-active); background: #fffaf0; box-shadow: 0 0 0 3px rgba(245,178,61,.28); }
.box.target { border-color: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.3); }
.box.pop { animation: vv-pop .32s ease-out; }
@keyframes vv-pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
.boxes.wrong .box { border-color: var(--vv-bad); background: #fff1f2; color: var(--vv-bad); }
.boxes.shake { animation: vv-shake .45s ease-out; }
@keyframes vv-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(7px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(2px); } }
.boxes.busy .box { animation: vv-breathe 1s ease-in-out infinite; }
@keyframes vv-breathe { 50% { opacity: .55; } }

/* Ô nhập thật nằm phủ lên các ô số: gõ phím, dán, xóa, tự điền mã từ SMS */
.otp-input {
  position: absolute; inset: 0; width: 100%; height: 100%;
  margin: 0; padding: 0; border: 0; opacity: 0;
  font-size: 16px; /* tránh iOS tự phóng to */
  background: transparent; color: transparent; caret-color: transparent;
  cursor: pointer;
}
.boxes:focus-within .box.active { box-shadow: 0 0 0 3px rgba(245,178,61,.28), 0 0 0 5px #2b6cff; }

.actions { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.submit {
  min-width: 140px; min-height: 38px; padding: 8px 18px;
  border: 0; border-radius: 10px; cursor: pointer;
  background: var(--vv-primary); color: #fff; font-weight: 700; font-size: .9rem;
  box-shadow: 0 8px 18px -10px rgba(30,58,95,.9);
}
.submit:disabled { cursor: default; opacity: .4; box-shadow: none; }
.erase {
  min-height: 38px; padding: 6px 10px; border: 0; border-radius: 10px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  background: transparent; color: var(--vv-muted); font-size: .8rem;
}
.erase:hover { background: rgba(15,40,70,.06); }
.erase svg { width: 17px; height: 17px; }
.erase[hidden] { display: none; }
.msg { min-height: 22px; margin: 8px 0 0; }
.msg span { display: inline-block; padding: 3px 12px; border-radius: 999px; font-size: .76rem; font-weight: 600; }
.msg .bad { background: var(--vv-bad); color: #fff; }
.msg .info { background: rgba(15,40,70,.08); color: #334155; }

/* ---------- Sân bắn ---------- */
.field {
  position: relative; height: 300px;
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.sling { position: absolute; left: 50%; top: 22px; width: 120px; height: 170px; transform: translateX(-50%); z-index: 1; filter: drop-shadow(0 10px 10px rgba(30,20,10,.25)); }
.sling svg { width: 100%; height: 100%; display: block; }
.chips {
  position: absolute; left: 10px; right: 10px; bottom: 40px; z-index: 2;
  display: grid; grid-template-columns: repeat(10, minmax(0, 32px)); gap: 5px; justify-content: center;
  touch-action: none;
}
.chip {
  aspect-ratio: 1; width: 100%; padding: 0; border-radius: 50%; border: 0; cursor: grab;
  display: grid; place-items: center;
  background: #fff; color: #334155; font-weight: 750; font-size: .92rem;
  box-shadow: 0 2px 0 rgba(15,40,70,.12), 0 6px 14px -8px rgba(15,40,70,.5);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.chip:active { cursor: grabbing; }
.chip.loaded { visibility: hidden; }
.chip:disabled { cursor: default; opacity: .5; }
.hint { position: absolute; left: 12px; right: 12px; bottom: 10px; margin: 0; text-align: center; font-size: .7rem; color: var(--vv-muted); }
/* Màn hẹp (điện thoại): 2 hàng × 5 số, nút to vừa ngón tay */
@container (max-width: 400px) {
  .field { height: 336px; }
  .chips { grid-template-columns: repeat(5, 44px); gap: 8px 10px; bottom: 36px; }
  .chip { font-size: 1.05rem; }
}

:focus-visible { outline: 3px solid #2b6cff; outline-offset: 2px; }

/* ---------- Lớp hiệu ứng: dây ná, đường ngắm, viên đạn ---------- */
.fx { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.fx svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.band { fill: none; stroke: #e0a94a; stroke-width: 3.6; stroke-linecap: round; filter: drop-shadow(0 0 1px rgba(60,30,5,.9)); }
.pouch { fill: none; stroke: #6b3b1f; stroke-width: 6; stroke-linecap: round; }
.aim { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: .1 9; }
.aim.hit { stroke: #22c55e; }
.aim.miss { stroke: rgba(15,40,70,.35); }
.proj {
  position: absolute; left: 0; top: 0; width: 30px; height: 30px; border-radius: 50%;
  display: grid; place-items: center; will-change: transform;
  font-weight: 800; font-size: .95rem; color: #5b3a06;
  background: radial-gradient(circle at 35% 30%, var(--vv-ammo-1), var(--vv-ammo-2) 60%, var(--vv-ammo-3));
  box-shadow: 0 6px 10px -4px rgba(90,60,0,.55), 0 0 0 1.5px rgba(120,80,10,.4) inset;
}

/* ---------- Màn hình thành công ---------- */
.done {
  position: absolute; inset: 0; z-index: 6;
  display: grid; place-items: center; padding: 20px;
  background: rgba(30, 41, 59, .45);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
  animation: vv-fade .25s ease-out;
}
.done[hidden] { display: none; }
@keyframes vv-fade { from { opacity: 0; } }
.dialog {
  width: min(300px, 100%); padding: 22px 18px 18px; border-radius: 18px; text-align: center;
  background: #fff; box-shadow: 0 30px 60px -20px rgba(0,0,0,.5);
  animation: vv-rise .35s cubic-bezier(.2,1.4,.4,1);
}
@keyframes vv-rise { from { transform: translateY(14px) scale(.96); opacity: 0; } }
.badge { width: 46px; height: 46px; margin: 0 auto 10px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: var(--vv-ok); box-shadow: 0 0 0 6px rgba(22,163,74,.15); }
.badge svg { width: 26px; height: 26px; }
.dialog h3 { margin: 0 0 6px; font-size: 1.15rem; }
.dialog p { margin: 0 0 14px; font-size: .84rem; color: #475569; }
.dialog b { color: var(--vv-ink); letter-spacing: .06em; }
.continue { min-width: 150px; min-height: 40px; border: 0; border-radius: 10px; cursor: pointer; background: var(--vv-primary); color: #fff; font-weight: 700; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
