#!/usr/bin/env node
// Lệnh "lp" GIẢ cho test: ghi lại tham số + kích thước file, KHÔNG in gì cả.
import { statSync, writeFileSync, existsSync } from 'node:fs';
const file = process.argv[2];
writeFileSync(process.env.FAKE_LP_OUT, JSON.stringify({ argv: process.argv.slice(2), exists: existsSync(file), size: statSync(file).size }));
if (process.env.FAKE_LP_FAIL) { console.error('máy in hết giấy'); process.exit(1); }
console.log('request id is FakePrinter-42 (1 file(s))');
