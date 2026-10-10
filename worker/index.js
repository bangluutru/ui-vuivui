// Worker của trang demo ui-vuivui trên Cloudflare.
// Chỉ các đường /api/* chạy qua đây (run_worker_first); trang tĩnh do Workers Assets phục vụ trực tiếp.
//
//   GET  /api/pow/challenge  → đề vv-pow v1 (+ serverTime để trình duyệt tính hạn theo giờ máy chủ)
//   POST /api/pow/verify     → { ok, reason? } — kiểm tra token, từ chối token đã dùng
//
// Bí mật ký đề: `POW_SECRET` (wrangler secret put POW_SECRET). Không bao giờ ghi vào code.
// Chống dùng lại: Durable Object `ReplayGuard` (một bản duy nhất, SQLite) — mọi bản Worker ở
// mọi nơi cùng hỏi một chỗ, nên token dùng rồi là bị từ chối ngay. Bộ nhớ trong isolate KHÔNG đủ:
// Cloudflare chạy nhiều isolate, hai lần gửi có thể rơi vào hai isolate khác nhau.

import { createPowChallenge, verifyPow } from '../src/server/pow.js';

const DIFFICULTY = 50000; // số lần băm tối đa; trung bình trình duyệt thử một nửa
const TTL_SECONDS = 600;

/** Durable Object nhớ các đề đã dùng cho tới khi hết hạn. */
export class ReplayGuard {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS used (id TEXT PRIMARY KEY, exp INTEGER NOT NULL)');
    });
  }

  async fetch(request) {
    const { id, exp } = await request.json();
    const sql = this.ctx.storage.sql;
    // Các lệnh SQL đồng bộ, không có await xen giữa → kiểm tra + ghi là nguyên tử.
    sql.exec('DELETE FROM used WHERE exp < ?', Date.now());
    if (sql.exec('SELECT 1 FROM used WHERE id = ?', id).toArray().length) return Response.json({ fresh: false });
    sql.exec('INSERT INTO used (id, exp) VALUES (?, ?)', id, exp);
    return Response.json({ fresh: true });
  }
}

/** true nếu token CHƯA từng dùng (và ghi nhớ lại). */
async function claimOnce(env, id, exp) {
  if (!env.REPLAY) throw new Error('Thiếu Durable Object REPLAY');
  const stub = env.REPLAY.get(env.REPLAY.idFromName('global'));
  const res = await stub.fetch('https://replay-guard/claim', { method: 'POST', body: JSON.stringify({ id, exp }) });
  return (await res.json()).fresh === true;
}

const GUARD = 'durable-object'; // trả về trong header để biết bản đang chạy dùng cách chống dùng lại nào

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-vv-replay-guard': GUARD },
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
      if (!(await claimOnce(env, r.id, r.expiresAt))) return json({ ok: false, reason: 'reused' }, 400);
      return json({ ok: true });
    }

    return json({ ok: false, reason: 'not-found' }, 404);
  },
};
