#!/usr/bin/env node
// Chương trình in TRÊN MÁY của bạn — cho <vv-print> gửi file thẳng tới máy in, không qua hộp thoại.
// Trình duyệt không bao giờ được tự in im lặng; chương trình nhỏ này làm cầu nối:
//
//   node tools/print-agent.mjs --origin https://ui-vuivui.bangluutru.workers.dev
//
// An toàn:
//   - chỉ nghe ở 127.0.0.1 (máy khác trong mạng không gọi được)
//   - mỗi lần chạy sinh MÃ BÍ MẬT ngẫu nhiên (in ra màn hình); trang web phải gửi mã trong header
//   - chỉ nhận từ đúng các trang được liệt kê bằng --origin
//   - chỉ in FILE (PDF, PNG, JPEG, GIF, văn bản), kiểm tra byte đầu, giới hạn dung lượng
//   - gọi `lp <file>` (macOS/Linux) bằng mảng tham số, không qua shell, không nhận tuỳ chọn từ trang web
//
// Biến môi trường: PRINT_CMD (mặc định "lp"), PRINT_MAX_MB (mặc định 20).

import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sniffKind, extFor } from '../src/print/doc.js';

const AGENT_KINDS = ['pdf', 'png', 'jpeg', 'gif', 'text']; // những gì `lp` in đúng

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function runPrint(cmd, file) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `${cmd} thoát với mã ${code}`))));
  });
}

/**
 * @param {{ origins: string[], token?: string, cmd?: string, maxBytes?: number, log?: (s:string)=>void }} o
 */
export function createAgent({ origins, token = randomBytes(16).toString('hex'), cmd = 'lp', maxBytes = 20 * 1024 * 1024, log = () => {} }) {
  const allowed = new Set(origins.map((o) => o.replace(/\/$/, '')));

  const cors = (req, res) => {
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  };
  const send = (req, res, status, body) => {
    cors(req, res);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    // Có Origin (gọi từ trình duyệt) thì phải nằm trong danh sách; không có (curl trên máy) thì vẫn cần mã.
    if (origin && !allowed.has(origin)) return send(req, res, 403, { ok: false, reason: 'origin' });

    if (req.method === 'OPTIONS') {
      cors(req, res);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, x-print-token, x-file-name');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.setHeader('Access-Control-Max-Age', '600');
      res.writeHead(204);
      return res.end();
    }

    if (!safeEqual(req.headers['x-print-token'] || '', token)) return send(req, res, 401, { ok: false, reason: 'token' });

    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') return send(req, res, 200, { ok: true });
    if (req.method !== 'POST' || url.pathname !== '/print') return send(req, res, 404, { ok: false, reason: 'not-found' });

    const declared = Number(req.headers['content-length'] || 0);
    if (declared > maxBytes) return send(req, res, 413, { ok: false, reason: 'too-large' });
    const chunks = [];
    let size = 0;
    try {
      for await (const c of req) {
        size += c.length;
        if (size > maxBytes) return send(req, res, 413, { ok: false, reason: 'too-large' });
        chunks.push(c);
      }
    } catch {
      return send(req, res, 400, { ok: false, reason: 'read' });
    }
    const body = Buffer.concat(chunks);
    if (!body.length) return send(req, res, 400, { ok: false, reason: 'empty' });
    const kind = sniffKind(new Uint8Array(body.buffer, body.byteOffset, Math.min(body.length, 4096)), req.headers['content-type'] || '');
    if (!AGENT_KINDS.includes(kind)) return send(req, res, 415, { ok: false, reason: 'type', kind });

    const file = join(tmpdir(), `vv-print-${randomBytes(8).toString('hex')}.${extFor(kind)}`);
    try {
      await writeFile(file, body, { mode: 0o600 });
      const job = await runPrint(cmd, file);
      log(`đã gửi ${kind} (${size} byte) → ${job || cmd}`);
      return send(req, res, 200, { ok: true, kind, job });
    } catch (e) {
      log(`lỗi in: ${e.message}`);
      return send(req, res, 500, { ok: false, reason: 'print', message: e.message });
    } finally {
      unlink(file).catch(() => {});
    }
  });

  return { server, token };
}

// ---------- Chạy trực tiếp ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const origins = [];
  let port = 17777;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--origin') origins.push(...String(args[++i] || '').split(',').filter(Boolean));
    else if (args[i] === '--port') port = Number(args[++i]);
  }
  if (!origins.length) {
    console.error('Cần ít nhất một --origin, vd: node tools/print-agent.mjs --origin https://ui-vuivui.bangluutru.workers.dev');
    process.exit(1);
  }
  const { server, token } = createAgent({
    origins,
    cmd: process.env.PRINT_CMD || 'lp',
    maxBytes: Number(process.env.PRINT_MAX_MB || 20) * 1024 * 1024,
    log: (s) => console.log(new Date().toLocaleTimeString(), s),
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Chương trình in đang chạy: http://127.0.0.1:${port}`);
    console.log(`Nhận từ: ${origins.join(', ')}`);
    console.log(`MÃ BÍ MẬT (dán vào trang web): ${token}`);
    console.log('Nhấn Ctrl+C để tắt.');
  });
}
