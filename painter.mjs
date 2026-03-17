#!/usr/bin/env node
/**
 * painter.mjs (painter-run skill)
 * - Calls pollinations-image-gen generator and saves into /var/minis/attachments
 * - Streams child stdout/stderr live to avoid "looks stuck"
 * - Adds timeout to prevent indefinite hang
 * - Optional Telegram sendPhoto with has_media_spoiler
 *
 * Usage:
 *   node painter.mjs --prompt "..." --caption "..." [--model flux] [--spoiler true]
 *                [--width 1024] [--height 1024] [--seed 123]
 *                [--timeout 120]
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function getArg(name, fallback = undefined) {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

const prompt = getArg('prompt', '');
const caption = getArg('caption', '');
const spoilerRaw = getArg('spoiler', false);
const model = getArg('model', 'zimage');
const width = getArg('width', '1024');
const height = getArg('height', '1024');
const seed = getArg('seed', undefined);
const timeoutSecRaw = getArg('timeout', '180');
const retriesRaw = getArg('retries', '1');

const timeoutSec = (() => {
  const n = Number(timeoutSecRaw);
  if (!Number.isFinite(n) || n <= 0) return 180;
  return Math.floor(n);
})();

const retries = (() => {
  const n = Number(retriesRaw);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.floor(n);
})();

if (!prompt) {
  console.error('❌ Missing --prompt');
  process.exit(1);
}

let finalPrompt = prompt;
if (/(打码|马赛克)/.test(finalPrompt)) {
  if (!/mosaic\/blur on sensitive parts/i.test(finalPrompt)) {
    finalPrompt += ', mosaic/blur on sensitive parts';
  }
}

const skillScript = '/var/minis/skills/pollinations-image-gen/scripts/generate.mjs';
if (!fs.existsSync(skillScript)) {
  console.error('❌ 生图 skill 脚本不存在:', skillScript);
  process.exit(2);
}

// Call skill generator (stream output + timeout)
const genArgs = [
  skillScript,
  '--prompt', finalPrompt,
  '--model', model,
  '--width', String(width),
  '--height', String(height),
  '--attachments', 'true',
];
if (seed !== undefined && seed !== true) {
  genArgs.push('--seed', String(seed));
}
// Pass timeout/retries to generator (fetch-level)
genArgs.push('--timeout_ms', String(timeoutSec * 1000));
genArgs.push('--retries', String(retries));

// Call skill generator
const r = spawnSync('node', ['--no-warnings', ...genArgs], {
  encoding: 'utf8',
  timeout: timeoutSec * 1000,
  maxBuffer: 1024 * 1024 * 20,
});

if (r.error) {
  if (r.error.code === 'ETIMEDOUT') {
    console.error(`\n⏱️ Timeout after ${timeoutSec}s.`);
    process.exit(124);
  }
  console.error('❌ 生成调用异常:', r.error.message);
  process.exit(3);
}

if (r.status !== 0) {
  console.error(r.stdout || '');
  console.error(r.stderr || '');
  process.exit(r.status || 3);
}

const out = r.stdout || '';
const errOut = r.stderr || '';

const fileLine = out.split('\n').find(l => l.trim().startsWith('File:')) || '';
const minisLine = out.split('\n').find(l => l.trim().startsWith('Minis:')) || '';
const attachmentPath = fileLine.replace('File:', '').trim();
const minisLink = minisLine.replace('Minis:', '').trim();

if (!attachmentPath || !fs.existsSync(attachmentPath)) {
  console.error('❌ 未找到生成的附件文件');
  console.error(out);
  process.exit(4);
}

console.log('\n✅ 生成成功');

// Print a Markdown image tag so Minis chat can render it inline
const renderUrl = minisLink || `minis://attachments/${path.basename(attachmentPath)}`;
console.log(`![painter](${renderUrl})`);

// keep also a plain link line for copy
console.log(`📸 查看图片: ${renderUrl}`);

// Optional Telegram
const token = process.env.TG_BOT_TOKEN;
const chatId = process.env.TG_CHAT_ID;
const spoiler = String(spoilerRaw).toLowerCase() === 'true';
if (token && chatId) {
  const args = [
    '-sS',
    '-X', 'POST',
    `https://api.telegram.org/bot${token}/sendPhoto`,
    '-F', `chat_id=${chatId}`,
    '-F', `caption=${caption || ''}`,
    '-F', `has_media_spoiler=${spoiler ? 'true' : 'false'}`,
    '-F', `photo=@${attachmentPath}`,
  ];
  const rr = spawnSync('curl', args, { encoding: 'utf8' });
  if (rr.status !== 0) {
    console.error('⚠️ Telegram send failed:', rr.stderr || rr.stdout);
  }
}

console.log('NO_REPLY');
