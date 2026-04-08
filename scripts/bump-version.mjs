#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const version = process.argv[2];
if (!version) {
  console.error('用法: pnpm bump <version>');
  console.error('示例: pnpm bump 0.0.11');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`无效版本号: ${version}`);
  process.exit(1);
}

const files = [
  'package.json',
  'src-tauri/tauri.conf.json',
];

for (const rel of files) {
  const filepath = resolve(root, rel);
  const json = JSON.parse(readFileSync(filepath, 'utf-8'));
  const old = json.version;
  json.version = version;
  writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n');
  console.log(`✅ ${rel}: ${old} → ${version}`);
}

console.log(`\n版本已更新为 ${version}`);

const tag = `v${version}`;
execSync(`git add package.json src-tauri/tauri.conf.json`, { cwd: root, stdio: 'inherit' });
execSync(`git commit -m "chore(version): bump version to ${tag}"`, { cwd: root, stdio: 'inherit' });
execSync(`git tag ${tag}`, { cwd: root, stdio: 'inherit' });
console.log(`\n🏷️  已创建 commit 和 tag: ${tag}`);
console.log(`📌 执行 git push && git push --tags 即可触发 release`);
