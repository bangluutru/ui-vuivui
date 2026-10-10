// CSS của <vv-print>. Đổi màu bằng biến --vv-* trên chính element.

export const STYLES = `
:host {
  --vv-bg-1: #f0f9ff;
  --vv-bg-2: #e0f2fe;
  --vv-ink: #0c4a6e;
  --vv-muted: #4b6b80;
  --vv-accent: #0ea5e9;
  --vv-accent-2: #0284c7;
  --vv-ok: #16a34a;
  --vv-bad: #dc2626;
  --vv-radius: 22px;
  --vv-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: block;
  max-width: 420px;
  color: var(--vv-ink);
  font-family: var(--vv-font);
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; }

.card {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: var(--vv-radius); padding: 14px 16px 16px;
  background: radial-gradient(120% 80% at 50% 0%, #fff, transparent 70%), linear-gradient(180deg, var(--vv-bg-1), var(--vv-bg-2));
  border: 1.5px solid rgba(12, 74, 110, .12);
  box-shadow: 0 18px 44px -22px rgba(12, 74, 110, .5);
}
.card.dropping { outline: 3px dashed var(--vv-accent); outline-offset: -8px; }
.head { display: flex; align-items: center; justify-content: space-between; }
.title { margin: 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -.01em; }
.sound { width: 32px; height: 32px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center; background: transparent; color: var(--vv-muted); }
.sound[aria-pressed="true"] { color: var(--vv-accent-2); background: rgba(14,165,233,.12); }
.sound svg { width: 18px; height: 18px; }

/* ---------- Sân khấu ---------- */
.stage { position: relative; height: 236px; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.printer { position: absolute; right: 2%; top: 22px; width: min(210px, 62%); aspect-ratio: 200 / 170; z-index: 2; }
.printer svg { width: 100%; height: 100%; display: block; overflow: visible; }
.printer .eye { transform-box: fill-box; transform-origin: 50% 50%; animation: vv-blink 4.5s infinite; }
@keyframes vv-blink { 0%, 94%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
.printer .mouth { transform-box: fill-box; transform-origin: 50% 50%; }
.printer.hungry .mouth { animation: vv-open .5s ease-in-out infinite alternate; }
@keyframes vv-open { to { transform: scaleY(2.4); } }
.printer.eating .mouth { animation: vv-chomp .16s ease-in-out 3 alternate; }
@keyframes vv-chomp { to { transform: scaleY(.3); } }
.printer.busy { animation: vv-rumble .09s linear infinite; }
@keyframes vv-rumble { 0% { transform: translate(0, 0); } 25% { transform: translate(1px, -1px); } 50% { transform: translate(-1px, 1px); } 75% { transform: translate(1px, 1px); } }
.printer.busy .led { animation: vv-led .25s steps(2) infinite; }
@keyframes vv-led { 50% { fill: #fde047; } }
.printer.busy .eye { animation: none; transform: scaleY(.45); }
.printer.happy .eye { transform: scaleY(.7); }

.paper {
  position: absolute; left: 6%; top: 74px; z-index: 3;
  width: 62px; height: 78px; padding: 0; border: 0; border-radius: 6px; cursor: grab; background: transparent;
  filter: drop-shadow(0 8px 8px rgba(12, 74, 110, .25));
  touch-action: none; will-change: transform;
}
.paper:active { cursor: grabbing; }
.paper svg { width: 100%; height: 100%; display: block; pointer-events: none; }
.paper .tag {
  position: absolute; left: 50%; bottom: -18px; transform: translateX(-50%);
  max-width: 120px; padding: 1px 6px; border-radius: 6px;
  font-size: .64rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background: var(--vv-ink); color: #fff; pointer-events: none;
}
.paper .tag:empty { display: none; }
.paper.gone { visibility: hidden; }
.stack { position: absolute; left: calc(6% + 5px); top: 80px; width: 62px; height: 78px; border-radius: 6px; background: #fff; border: 2px solid #cbd5e1; transform: rotate(-5deg); z-index: 1; }

.out-wrap { position: absolute; z-index: 1; overflow: hidden; pointer-events: none; }
.out { width: 100%; height: 100%; transform: translateY(-100%); }
.out svg { width: 100%; height: 100%; display: block; }

/* ---------- Trạng thái & nút ---------- */
.status { min-height: 2.6em; margin: 4px 0 10px; font-size: .86rem; text-align: center; color: var(--vv-muted); }
.card[data-state="error"] .status { color: var(--vv-bad); font-weight: 600; }
.card[data-state="sent"] .status, .card[data-state="dialog"] .status { color: var(--vv-ok); font-weight: 600; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.go {
  min-height: 44px; padding: 10px 22px; border: 0; border-radius: 999px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 750; color: #fff; background: linear-gradient(180deg, var(--vv-accent), var(--vv-accent-2));
  box-shadow: 0 10px 20px -12px var(--vv-accent-2);
}
.go:disabled { opacity: .6; cursor: progress; }
.go svg { width: 20px; height: 20px; }
.ghost {
  min-height: 44px; padding: 8px 14px; border-radius: 999px; cursor: pointer;
  border: 1.5px solid rgba(12,74,110,.25); background: rgba(255,255,255,.7); color: var(--vv-ink);
  font-size: .86rem; font-weight: 650; text-decoration: none; display: inline-flex; align-items: center;
}
.ghost[hidden] { display: none; }
:focus-visible { outline: 3px solid #2b6cff; outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
