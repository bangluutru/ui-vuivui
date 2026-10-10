// Phía TRÌNH DUYỆT của captcha "vv-pow v1": tìm number sao cho SHA-256(salt + number) = challenge.
// Chạy trong Web Worker để không làm đứng giao diện; nếu trang chặn Worker (CSP) thì chạy
// từng đợt nhỏ trên luồng chính.
//
// Hợp đồng `solver` chung của <vv-fun-captcha>:
//   ({ signal, onProgress }) => Promise<{ token: string, expiresIn?: number, receivedAt?: number }>
//   expiresIn: số ms token còn hiệu lực, tính từ receivedAt (Date.now() lúc nhận đề).
// → có thể thay bằng ALTCHA, Cap, Turnstile... miễn trả về token để máy chủ kiểm tra.

const enc = new TextEncoder();

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
  let s = '';
  for (const b of new Uint8Array(buf)) s += b.toString(16).padStart(2, '0');
  return s;
}

function abortError() {
  return new DOMException('Đã hủy', 'AbortError');
}

const WORKER_SRC = `
const enc = new TextEncoder();
onmessage = async (e) => {
  const { salt, challenge, maxnumber } = e.data;
  for (let n = 0; n <= maxnumber; n++) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + n));
    let s = '';
    for (const b of new Uint8Array(buf)) s += b.toString(16).padStart(2, '0');
    if (s === challenge) { postMessage({ done: true, number: n }); return; }
    if (n % 2000 === 0) postMessage({ progress: n / maxnumber });
  }
  postMessage({ done: true, number: null });
};`;

function solveInWorker(ch, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    let url;
    let w;
    try {
      url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
      w = new Worker(url);
    } catch (err) {
      if (url) URL.revokeObjectURL(url);
      reject(err);
      return;
    }
    const cleanup = () => { w.terminate(); URL.revokeObjectURL(url); };
    signal?.addEventListener('abort', () => { cleanup(); reject(abortError()); }, { once: true });
    w.onmessage = (e) => {
      if (e.data.progress != null) onProgress?.(e.data.progress);
      if (e.data.done) { cleanup(); resolve(e.data.number); }
    };
    w.onerror = (e) => { cleanup(); e.preventDefault?.(); reject(new Error('worker')); };
    w.postMessage({ salt: ch.salt, challenge: ch.challenge, maxnumber: ch.maxnumber });
  });
}

async function solveOnMainThread(ch, { signal, onProgress }) {
  for (let n = 0; n <= ch.maxnumber; n++) {
    if (signal?.aborted) throw abortError();
    if ((await sha256Hex(ch.salt + n)) === ch.challenge) return n;
    if (n % 2000 === 0) {
      onProgress?.(n / ch.maxnumber);
      await new Promise((r) => setTimeout(r, 0)); // nhường cho giao diện
    }
  }
  return null;
}

function encodeToken(obj) {
  const bytes = enc.encode(JSON.stringify(obj));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Giải một đề vv-pow. Trả về { token, expiresAt, expiresIn, receivedAt }.
 * @param {{v:number, algorithm:string, salt:string, challenge:string, maxnumber:number, signature:string}} ch
 * @param {{ signal?: AbortSignal, onProgress?: (p:number)=>void, worker?: boolean }} [o]
 */
export async function solvePowChallenge(ch, { signal, onProgress, worker = true } = {}) {
  if (!ch || ch.v !== 1 || ch.algorithm !== 'SHA-256') throw new Error('Đề không đúng định dạng vv-pow v1');
  const receivedAt = Date.now();
  let number;
  if (worker && typeof Worker === 'function') {
    try {
      number = await solveInWorker(ch, { signal, onProgress });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      number = await solveOnMainThread(ch, { signal, onProgress }); // trang chặn Worker
    }
  } else {
    number = await solveOnMainThread(ch, { signal, onProgress });
  }
  if (number == null) throw new Error('Không giải được đề');
  onProgress?.(1);
  const exp = Number(String(ch.salt).split('.')[1]);
  const expiresAt = Number.isFinite(exp) ? exp * 1000 : undefined;
  // Thời gian còn lại tính theo ĐỒNG HỒ MÁY CHỦ (ch.serverTime, không ký — chỉ để hiển thị/hẹn giờ),
  // rồi neo vào lúc nhận đề → đồng hồ máy người dùng lệch bao nhiêu cũng không sao.
  const expiresIn = expiresAt == null ? undefined : expiresAt - (Number.isFinite(ch.serverTime) ? ch.serverTime : receivedAt);
  return {
    token: encodeToken({ v: 1, salt: ch.salt, challenge: ch.challenge, maxnumber: ch.maxnumber, number, signature: ch.signature }),
    expiresAt,
    expiresIn,
    receivedAt,
  };
}

/**
 * Solver lấy đề từ máy chủ (GET url → JSON đề) rồi giải.
 * @param {string | (() => Promise<object>)} source URL, hoặc hàm trả về đề
 */
export function powSolver(source, { headers = {}, credentials = 'same-origin', worker = true } = {}) {
  return async ({ signal, onProgress } = {}) => {
    let ch;
    if (typeof source === 'function') {
      ch = await source();
    } else {
      const res = await fetch(source, { headers, credentials, signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`Máy chủ trả về lỗi ${res.status}`);
      ch = await res.json();
    }
    return solvePowChallenge(ch, { signal, onProgress, worker });
  };
}
