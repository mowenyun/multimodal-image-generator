#!/usr/bin/env node

/**
 * mig (Multimodal Image Generator) CLI
 *
 * Commands:
 *   mig generate --prompt "..." [options]
 *   mig painter  --prompt "..." --caption "..." [options]
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function usage(exitCode = 0) {
  console.log(`\
Multimodal Image Generator (mig)

Usage:
  mig generate --prompt "..." [--model flux] [--width 1024] [--height 1024] [...]
  mig painter  --prompt "..." [--caption "..."] [--model zimage] [--spoiler true] [...]

Environment:
  POLLINATIONS_API_KEY  (required)

Examples:
  mig generate --prompt "a cute cat" --model flux --width 1024 --height 1024
  mig painter  --prompt "a cute cat" --caption "hello" --model zimage
`);
  process.exit(exitCode);
}

const argv = process.argv.slice(2);
const cmd = argv[0];

if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') usage(0);

const cmdArgs = argv.slice(1);
const script = cmd === 'generate'
  ? path.resolve(__dirname, '../src/generate.mjs')
  : cmd === 'painter'
    ? path.resolve(__dirname, '../src/painter.mjs')
    : null;

if (!script) {
  console.error(`Unknown command: ${cmd}`);
  usage(1);
}

const r = spawnSync('node', ['--no-warnings', script, ...cmdArgs], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(r.status ?? 1);
