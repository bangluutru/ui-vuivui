// CSS của <vv-basket-upload>. Đổi màu bằng biến --vv-* đặt trên chính element.

export const STYLES = `
:host {
  --vv-accent: #f26a1b;
  --vv-accent-2: #ff9a3c;
  --vv-ink: #2b1a10;
  --vv-muted: #8a6a55;
  --vv-paper: #fffaf4;
  --vv-court: #fde9d6;
  --vv-line: #f3c7a3;
  --vv-head: #1f130c;
  --vv-ok: #2f9e5b;
  --vv-bad: #d9363e;
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
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--vv-radius);
  background: var(--vv-paper);
  border: 1px solid rgba(242, 106, 27, .18);
  box-shadow: 0 1px 0 rgba(255,255,255,.8) inset, 0 18px 50px -18px rgba(150, 60, 10, .35);
}

/* ---------- Đầu thẻ ---------- */
.head {
  display: flex; align-items: center; gap: 12px;
  padding: 18px 18px 16px 22px;
  color: #fff;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(242,106,27,.55), transparent 55%),
    radial-gradient(60% 90% at 85% 120%, rgba(255,154,60,.35), transparent 60%),
    var(--vv-head);
}
.head-text { flex: 1; min-width: 0; }
.title { margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -.01em; line-height: 1.15; }
.title em { font-style: normal; color: var(--vv-accent-2); }
.sub { margin: 4px 0 0; font-size: .82rem; color: rgba(255,255,255,.72); }

.sound {
  flex: none; width: 34px; height: 34px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer;
  border: 0; background: var(--vv-accent); color: #fff;
  box-shadow: 0 0 0 4px rgba(242,106,27,.25);
}
.sound[aria-pressed="false"] { background: rgba(255,255,255,.14); box-shadow: none; }
.sound svg { width: 18px; height: 18px; }

.board {
  flex: none; min-width: 64px; padding: 5px 8px 4px;
  border-radius: 8px; text-align: center;
  background: #120a06; border: 2px solid #5a3420;
  box-shadow: 0 0 0 1px #000 inset;
}
.board-label { display: block; font-size: .58rem; font-weight: 700; letter-spacing: .14em; color: #f7d9c3; }
.digits {
  display: block; font: 700 1.55rem/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  letter-spacing: .08em; color: #ff8a2a;
  text-shadow: 0 0 6px rgba(255,120,30,.85), 0 0 14px rgba(255,90,0,.45);
}
.digits.bump { animation: vv-bump .5s ease-out; }
@keyframes vv-bump {
  0% { transform: scale(1); }
  35% { transform: scale(1.35); color: #ffd36b; }
  100% { transform: scale(1); }
}

/* ---------- Sân ---------- */
.court {
  padding: 18px 18px 8px;
  background:
    radial-gradient(70% 45% at 50% 0%, rgba(255,255,255,.9), transparent 70%),
    radial-gradient(circle at 50% 118%, transparent 0 128px, var(--vv-line) 129px 131px, transparent 132px),
    linear-gradient(180deg, var(--vv-paper), var(--vv-court));
}

.zone {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  min-height: 150px; padding: 18px 16px 38px;
  border: 2px dashed rgba(242,106,27,.55);
  border-radius: 16px;
  text-align: center;
  background: rgba(255,255,255,.35);
  cursor: pointer;
  transition: background .2s, border-color .2s, transform .2s;
}
.card.dragging .zone {
  background: rgba(255, 154, 60, .14);
  border-color: var(--vv-accent);
}
.zone-icon { width: 34px; height: 34px; color: var(--vv-accent); }
.zone-icon svg { width: 100%; height: 100%; }
.zone[data-kind="success"] .zone-icon { color: var(--vv-ok); }
.zone[data-kind="miss"] .zone-icon,
.zone[data-kind="reject"] .zone-icon { color: var(--vv-bad); }
.zone[data-kind="uploading"] .zone-icon svg,
.zone[data-kind="shooting"] .zone-icon svg { animation: vv-spin 1s linear infinite; }
@keyframes vv-spin { to { transform: rotate(360deg); } }
.zone-title { margin: 2px 0 0; font-size: 1.02rem; font-weight: 750; }
.zone-sub {
  margin: 0; max-width: 100%; font-size: .8rem; color: var(--vv-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.bar {
  width: 58%; height: 4px; margin-top: 6px; border-radius: 4px;
  background: rgba(242,106,27,.18); overflow: hidden;
  opacity: 0; transition: opacity .2s;
}
.bar > i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, var(--vv-accent), var(--vv-accent-2)); transition: width .15s; }
.zone[data-kind="uploading"] .bar, .zone[data-kind="success"] .bar { opacity: 1; }

.tag {
  position: absolute; right: 12px; bottom: 6px;
  display: flex; align-items: flex-end; gap: 2px;
  color: var(--vv-accent);
  pointer-events: none;
}
.tag svg { width: 40px; height: 27px; transform: translateY(6px); }
.tag span {
  font-weight: 900; font-style: italic; font-size: .74rem; line-height: 1.05;
  text-transform: uppercase; letter-spacing: .02em;
  transform: rotate(-9deg); text-align: left;
}

/* ---------- Rổ ---------- */
.hoop {
  position: relative; /* không đặt z-index: để bóng chen được giữa mặt sau và mặt trước rổ */
  width: 150px; aspect-ratio: 160 / 130;
  margin: -34px auto 4px;
}
.hoop-back, .hoop-front { position: absolute; inset: 0; }
.hoop-back { z-index: 1; filter: drop-shadow(0 8px 10px rgba(160,60,10,.25)); }
.hoop-front { z-index: 3; color: rgba(255,255,255,.95); filter: drop-shadow(0 0 1px rgba(120,50,10,.9)); }
.hoop svg { width: 100%; height: 100%; display: block; overflow: visible; }
.net { transform-box: fill-box; transform-origin: 50% 0; }
.net.swish { animation: vv-swish .55s ease-out; }
@keyframes vv-swish {
  0% { transform: scale(1, 1); }
  30% { transform: scale(.82, 1.3); }
  60% { transform: scale(1.05, .92); }
  100% { transform: scale(1, 1); }
}
.hoop.clank { animation: vv-clank .45s ease-out; }
@keyframes vv-clank {
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-4deg); }
  45% { transform: rotate(3deg); }
  70% { transform: rotate(-1.5deg); }
}

/* ---------- Danh sách ---------- */
.list { margin: 4px 0 8px; }
.list[hidden] { display: none; }
.list-head {
  display: flex; justify-content: space-between; align-items: baseline;
  margin: 0 4px 6px; font-size: .74rem; font-weight: 700; color: var(--vv-accent);
}
.list-head span:last-child { color: var(--vv-muted); font-weight: 500; }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
li {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 8px 7px 7px; border-radius: 12px;
  background: rgba(255,255,255,.88);
  box-shadow: 0 1px 2px rgba(120,50,10,.08), 0 0 0 1px rgba(242,106,27,.08);
  animation: vv-in .3s ease-out;
}
@keyframes vv-in { from { opacity: 0; transform: translateY(6px); } }
.thumb {
  flex: none; width: 34px; height: 34px; border-radius: 8px; overflow: hidden;
  display: grid; place-items: center;
  background: #fbe2cc; color: #a8471a; font-size: .6rem; font-weight: 800;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.info { flex: 1; min-width: 0; }
.name { margin: 0; font-size: .84rem; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { margin: 1px 0 0; font-size: .72rem; color: var(--vv-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
li[data-status="error"] .meta { color: var(--vv-bad); }
.state { flex: none; width: 24px; height: 24px; display: grid; place-items: center; border-radius: 50%; }
.state svg { width: 16px; height: 16px; }
li[data-status="done"] .state { color: #fff; background: var(--vv-ok); }
li[data-status="waiting"] .state svg, li[data-status="shooting"] .state svg { width: 18px; height: 18px; opacity: .55; }
li[data-status="uploading"] .state {
  background: conic-gradient(var(--vv-accent) calc(var(--p, 0) * 1turn), rgba(242,106,27,.15) 0);
  -webkit-mask: radial-gradient(circle, transparent 7px, #000 7.5px);
          mask: radial-gradient(circle, transparent 7px, #000 7.5px);
}
li[data-status="error"] .state { color: #fff; background: var(--vv-bad); }
.icon-btn {
  flex: none; width: 30px; height: 30px; border-radius: 8px; border: 0;
  display: grid; place-items: center; cursor: pointer;
  background: transparent; color: var(--vv-muted);
}
.icon-btn:hover { background: rgba(242,106,27,.1); color: var(--vv-accent); }
.icon-btn svg { width: 18px; height: 18px; }
.icon-btn[hidden] { display: none; }

/* ---------- Nút chính ---------- */
.cta-wrap { padding: 4px 18px 18px; background: var(--vv-court); }
.cta {
  width: 100%; min-height: 46px; padding: 10px 18px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; border-radius: 999px; cursor: pointer;
  font-weight: 750; font-size: .95rem; color: #fff;
  background: linear-gradient(180deg, var(--vv-accent-2), var(--vv-accent));
  box-shadow: 0 8px 18px -8px rgba(242,106,27,.9), 0 -2px 0 rgba(0,0,0,.12) inset;
  transition: transform .15s, filter .15s;
}
.cta:hover { filter: brightness(1.05); }
.cta:active { transform: translateY(1px); }
.cta:disabled { cursor: not-allowed; filter: grayscale(.6); opacity: .7; }
.cta svg { width: 20px; height: 20px; flex: none; }
.cta .balls { display: inline-flex; gap: 3px; }
.cta .balls svg { width: 16px; height: 16px; }
.card.dragging .cta { animation: vv-pulse 1s ease-in-out infinite; }
@keyframes vv-pulse { 50% { transform: scale(1.03); } }

:focus-visible { outline: 3px solid #2b6cff; outline-offset: 2px; }

/* ---------- Lớp hiệu ứng: đường ngắm + quả bóng ---------- */
.fx { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.aim { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.aim path {
  fill: none; stroke: var(--vv-accent); stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: .1 9; animation: vv-march .6s linear infinite;
}
.aim circle { fill: rgba(242,106,27,.18); stroke: var(--vv-accent); stroke-width: 2; }
@keyframes vv-march { to { stroke-dashoffset: -9.1; } }
.ball {
  position: absolute; left: 0; top: 0; width: 34px; height: 34px;
  will-change: transform; opacity: 0;
  filter: drop-shadow(0 6px 6px rgba(90,30,0,.3));
}
.ball svg { width: 100%; height: 100%; display: block; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
