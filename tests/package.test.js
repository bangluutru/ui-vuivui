import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Mỗi file gọi customElements.define phải nằm trong "sideEffects" của package.json,
// nếu không trình đóng gói (Vite/Rollup/webpack) sẽ bỏ mất lệnh đăng ký thẻ khi build.
const root = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const globToRegex = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§').replace(/\*/g, '[^/]*').replace(/§/g, '.*')}$`);

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('package.json', () => {
  const patterns = pkg.sideEffects.map(globToRegex);
  const definers = walk(join(root, 'src'))
    .filter((f) => f.endsWith('.js') && readFileSync(f, 'utf8').includes('customElements.define('))
    .map((f) => `./${relative(root, f)}`);

  it('có ít nhất một element', () => {
    expect(definers.length).toBeGreaterThan(0);
  });

  it.each(definers)('%s được khai báo trong sideEffects', (file) => {
    expect(patterns.some((re) => re.test(file))).toBe(true);
  });

  it('src/index.js xuất mọi element', () => {
    const index = readFileSync(join(root, 'src/index.js'), 'utf8');
    for (const f of definers) expect(index).toContain(f.replace('./src/', './'));
  });
});
