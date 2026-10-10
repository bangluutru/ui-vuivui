// CSS của <vv-fun-captcha>. Đổi màu bằng biến --vv-* trên chính element.

export const STYLES = `
:host {
  --vv-bg: #ffffff;
  --vv-ink: #1f2937;
  --vv-muted: #6b7280;
  --vv-line: #d9dee7;
  --vv-accent: #7c4dff;
  --vv-ok: #16a34a;
  --vv-bad: #dc2626;
  --vv-area-1: #f3f0ff;
  --vv-area-2: #e9f7ef;
  --vv-radius: 14px;
  --vv-font: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: block;
  max-width: 360px;
  color: var(--vv-ink);
  font-family: var(--vv-font);
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; }

.box {
  border: 1.5px solid var(--vv-line); border-radius: var(--vv-radius);
  background: var(--vv-bg); overflow: hidden;
  box-shadow: 0 6px 18px -12px rgba(30, 20, 70, .45);
  transition: border-color .25s;
}
.box[data-state="verified"] { border-color: color-mix(in srgb, var(--vv-ok) 55%, var(--vv-line)); }
.box[data-state="error"] { border-color: color-mix(in srgb, var(--vv-bad) 55%, var(--vv-line)); }

.row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; min-height: 64px; }
.check {
  flex: none; width: 30px; height: 30px; padding: 0; border-radius: 8px; cursor: pointer;
  display: grid; place-items: center;
  border: 2px solid #b9c0cc; background: #fff; color: #fff;
  transition: background .2s, border-color .2s, transform .15s;
}
.check:hover { border-color: var(--vv-accent); }
.check:active { transform: scale(.94); }
.check svg { width: 20px; height: 20px; opacity: 0; transform: scale(.4); transition: opacity .2s, transform .3s cubic-bezier(.3,1.6,.5,1); }
.box[data-state="verified"] .check { background: var(--vv-ok); border-color: var(--vv-ok); cursor: default; }
.box[data-state="verified"] .check svg { opacity: 1; transform: scale(1); }
.box[data-state="checking"] .check {
  border-color: transparent; cursor: progress;
  background: conic-gradient(var(--vv-accent) calc(var(--p, 0) * 1turn), #e5e7eb 0);
  -webkit-mask: radial-gradient(circle, transparent 9px, #000 9.5px); mask: radial-gradient(circle, transparent 9px, #000 9.5px);
  border-radius: 50%;
}
.box[data-state="playing"] .check { border-color: var(--vv-accent); background: color-mix(in srgb, var(--vv-accent) 12%, #fff); }
.box[data-state="error"] .check { border-color: var(--vv-bad); }

.label { flex: 1; min-width: 0; }
.l-main { display: block; font-weight: 650; font-size: .95rem; }
.l-sub { display: block; margin-top: 2px; font-size: .76rem; color: var(--vv-muted); }
.box[data-state="verified"] .l-sub { color: var(--vv-ok); font-weight: 600; }
.box[data-state="error"] .l-sub { color: var(--vv-bad); }

.brand { flex: none; text-align: center; line-height: 1; font-size: .62rem; color: var(--vv-muted); }
.brand b { display: block; font-size: .8rem; color: var(--vv-accent); letter-spacing: -.01em; }
.brand .logo { display: block; width: 26px; height: 26px; margin: 0 auto 3px; }

/* ---------- Trò chơi ---------- */
.game { border-top: 1.5px dashed var(--vv-line); padding: 10px 12px 12px; animation: vv-open .3s ease-out; }
.game[hidden] { display: none; }
@keyframes vv-open { from { opacity: 0; transform: translateY(-6px); } }
.task { margin: 0 0 8px; font-size: .88rem; font-weight: 650; }
.area {
  position: relative; height: 150px; border-radius: 12px; overflow: hidden;
  background: radial-gradient(120% 90% at 20% 0%, rgba(255,255,255,.8), transparent 60%), linear-gradient(135deg, var(--vv-area-1), var(--vv-area-2));
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
}
.target { position: absolute; width: 78px; height: 78px; transition: transform .2s; }
.target svg, .item svg { width: 100%; height: 100%; display: block; pointer-events: none; }
.target.near { transform: scale(1.08); }
.target.happy { animation: vv-happy .6s ease-out; }
@keyframes vv-happy { 0%,100% { transform: scale(1); } 30% { transform: scale(1.18) rotate(-4deg); } 60% { transform: scale(.96) rotate(3deg); } }
.target .mouth-open { opacity: 0; transition: opacity .15s; }
.target.near .mouth-open, .target.happy .mouth-open { opacity: 1; }
.target.near .mouth-closed { opacity: 0; }
.target .net { transform-box: fill-box; transform-origin: 50% 0; }
.target.happy .net { animation: vv-swish .5s ease-out; }
@keyframes vv-swish { 30% { transform: scale(.8, 1.3); } 60% { transform: scale(1.05, .9); } }
.item {
  position: absolute; width: 52px; height: 46px; padding: 2px; border: 0; border-radius: 12px; cursor: grab;
  background: transparent; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  filter: drop-shadow(0 6px 6px rgba(40, 20, 90, .25));
  will-change: transform;
}
.item:active { cursor: grabbing; }
.item.dragging { filter: drop-shadow(0 12px 10px rgba(40, 20, 90, .35)); }
.item.gone { visibility: hidden; }
.item .wing { transform-box: fill-box; transform-origin: 50% 100%; animation: vv-buzz .12s linear infinite alternate; }
@keyframes vv-buzz { to { transform: scaleY(.6); } }
.toast {
  position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%);
  padding: 4px 12px; border-radius: 999px; font-size: .76rem; font-weight: 700; white-space: nowrap;
  background: rgba(31, 41, 55, .82); color: #fff; pointer-events: none;
  opacity: 0; transition: opacity .2s;
}
.toast.show { opacity: 1; }
.toast.good { background: var(--vv-ok); }
.hint { margin: 6px 0 0; font-size: .72rem; color: var(--vv-muted); }

:focus-visible { outline: 3px solid #2b6cff; outline-offset: 2px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
