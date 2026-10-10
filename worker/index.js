// Worker của trang demo ui-vuivui trên Cloudflare.
// Chỉ các đường /api/* chạy qua đây (run_worker_first); trang tĩnh do Workers Assets phục vụ trực tiếp.
//
//   GET  /api/pow/challenge  → đề vv-pow v1 (+ serverTime để trình duyệt tính hạn theo giờ máy chủ)
//   POST /api/pow/verify     → { ok, reason? } — kiểm tra token, từ chối token đã dùng
//
// Bí mật ký đề: `POW_SECRET` (wrangler secret put POW_SECRET). Không bao giờ ghi vào code.

import { createPowChallenge, verifyPow } from '../src/server/pow.js';

const DIFFICULTY = 50000; // số lần băm tối đa; trung bình trình duyệt thử một nửa
const TTL_SECONDS = 600;

// Chống dùng lại: nhớ các đề đã dùng TRONG BỘ NHỚ của isolate này — chỉ "cố gắng hết sức".
// Bản thật phải dùng KV / Durable Object / DB để mọi máy chủ cùng biết.
const used = new Map(); // id → expiresAt

function rememberUsed(id, expiresAt) {
  const now = Date.now();
  if (used.size > 5000) for (const [k, exp] of used) if (exp < now) used.delete(k);
  used.set(id, expiresAt);
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.POW_SECRET) return json({ ok: false, reason: 'server-misconfigured' }, 500);

    if (url.pathname === '/api/pow/challenge') {
      if (request.method !== 'GET') return json({ ok: false, reason: 'method' }, 405);
      const ch = await createPowChallenge({ secret: env.POW_SECRET, maxnumber: DIFFICULTY, ttlSeconds: TTL_SECONDS });
      return json({ ...ch, serverTime: Date.now() });
    }

    if (url.pathname === '/api/pow/verify') {
      if (request.method !== 'POST') return json({ ok: false, reason: 'method' }, 405);
      let token;
      try {
        ({ token } = await request.json());
      } catch {
        return json({ ok: false, reason: 'malformed' }, 400);
      }
      const r = await verifyPow(token, { secret: env.POW_SECRET });
      if (!r.ok) return json(r, 400);
      if (used.has(r.id)) return json({ ok: false, reason: 'reused' }, 400);
      rememberUsed(r.id, r.expiresAt);
      return json({ ok: true });
    }

    return json({ ok: false, reason: 'not-found' }, 404);
  },
};
