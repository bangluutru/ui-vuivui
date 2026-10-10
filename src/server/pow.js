// Phía MÁY CHỦ của captcha bằng chứng công việc (proof-of-work) "vv-pow v1".
// Chỉ dùng Web Crypto chuẩn → chạy được trên Cloudflare Workers, Node 20+, Deno, Bun.
//
// Giao thức:
//   Đề:      { v:1, algorithm:'SHA-256', salt, challenge, maxnumber, signature }
//            salt      = "<hex ngẫu nhiên>.<hạn dùng, giây unix>"
//            challenge = hex(SHA-256(salt + number)), number bí mật ∈ [0, maxnumber]
//            signature = hex(HMAC-SHA-256(secret, salt + "|" + challenge + "|" + maxnumber))
//   Đáp án:  base64url(JSON { v, salt, challenge, maxnumber, number, signature })
//   Kiểm tra: chữ ký đúng · chưa hết hạn · SHA-256(salt + number) === challenge.
//
// Chống dùng lại: verifyPow trả về `id` (= challenge). Máy chủ PHẢI ghi nhớ id đã dùng
// cho tới khi hết hạn (KV, Durable Object, Redis, bảng DB...) và từ chối lần thứ hai.

const enc = new TextEncoder();

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomInt(maxInclusive) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % (maxInclusive + 1);
}

const b64url = {
  encode: (str) => btoa(String.fromCharCode(...enc.encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (s) => {
    const b = s.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '==='.slice((b.length + 3) % 4));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  },
};
export { b64url };

/**
 * Tạo đề.
 * @param {{ secret: string, maxnumber?: number, ttlSeconds?: number, now?: number }} o
 *   maxnumber: độ khó — trung bình trình duyệt phải thử maxnumber/2 lần băm (mặc định 50 000)
 *   ttlSeconds: hạn dùng của đề và đáp án (mặc định 600 = 10 phút)
 */
export async function createPowChallenge({ secret, maxnumber = 50000, ttlSeconds = 600, now = Date.now() } = {}) {
  if (!secret) throw new Error('Thiếu secret để ký đề');
  const rnd = new Uint8Array(12);
  crypto.getRandomValues(rnd);
  const expires = Math.floor(now / 1000) + ttlSeconds;
  const salt = `${toHex(rnd)}.${expires}`;
  const number = randomInt(maxnumber);
  const challenge = await sha256Hex(salt + number);
  const signature = await hmacHex(secret, `${salt}|${challenge}|${maxnumber}`);
  return { v: 1, algorithm: 'SHA-256', salt, challenge, maxnumber, signature };
}

/** Hạn dùng (ms) đọc từ salt, hoặc null. */
export function powExpiresAt(salt) {
  const s = Number(String(salt).split('.')[1]);
  return Number.isFinite(s) && s > 0 ? s * 1000 : null;
}

/**
 * Kiểm tra đáp án.
 * @returns {Promise<{ ok: true, id: string, expiresAt: number } | { ok: false, reason: 'malformed'|'signature'|'expired'|'solution' }>}
 */
export async function verifyPow(token, { secret, now = Date.now() } = {}) {
  if (!secret) throw new Error('Thiếu secret để kiểm tra');
  let p;
  try {
    p = JSON.parse(b64url.decode(String(token)));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!p || p.v !== 1 || typeof p.salt !== 'string' || typeof p.challenge !== 'string'
      || !Number.isInteger(p.number) || p.number < 0 || !Number.isInteger(p.maxnumber)) {
    return { ok: false, reason: 'malformed' };
  }
  const expected = await hmacHex(secret, `${p.salt}|${p.challenge}|${p.maxnumber}`);
  if (!safeEqual(expected, p.signature)) return { ok: false, reason: 'signature' };
  const expiresAt = powExpiresAt(p.salt);
  if (!expiresAt || now > expiresAt) return { ok: false, reason: 'expired' };
  if (p.number > p.maxnumber || (await sha256Hex(p.salt + p.number)) !== p.challenge) {
    return { ok: false, reason: 'solution' };
  }
  return { ok: true, id: p.challenge, expiresAt };
}
