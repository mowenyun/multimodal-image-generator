# Multimodal Image Generator

A small open-source CLI + GitHub Pages demo that generates images via the **pollinations.ai** API.

- API base: https://gen.pollinations.ai
- Powered by: https://pollinations.ai
- Live demo (GitHub Pages): **(enable Pages to get URL)**

> Tier submission notes:
> - This app uses the pollinations.ai API.
> - Please credit pollinations.ai in your frontend/README (done below).

## Built with pollinations.ai
**Built With pollinations.ai** — https://pollinations.ai

(You can add the official badge/logo here once you decide which asset to use.)

## GitHub Pages demo
Open `docs/` after enabling GitHub Pages (Settings → Pages → main branch → /docs).

## Features
- `mig generate`: call Pollinations directly
- `mig painter`: wrapper that saves to `/var/minis/attachments` and prints a Minis-renderable Markdown image tag
- `docs/` demo: pure frontend that builds a public `gen.pollinations.ai/image/...` URL

## Install

### Option A: clone and run
```bash
git clone https://github.com/mowenyun/multimodal-image-generator.git
cd multimodal-image-generator
```

### Option B: use as a CLI (local)
```bash
npm i
npm link
mig --help
```

## Configuration

### Required
- `POLLINATIONS_API_KEY`: your API key

Example:
```bash
export POLLINATIONS_API_KEY="..."
```

## Usage

### 1) Generate (core)
```bash
mig generate --prompt "a cute cat" --model flux --width 1024 --height 1024
```

Common options (passed through):
- `--model` (default: `flux`)
- `--width`, `--height`
- `--seed`
- `--negative_prompt`
- `--safe`

### 2) Painter wrapper
```bash
mig painter --prompt "a cute cat" --caption "hello" --model zimage --spoiler true
```

Notes:
- If prompt contains `打码`/`马赛克`, it will automatically append: `mosaic/blur on sensitive parts`.
- If `TG_BOT_TOKEN` and `TG_CHAT_ID` are set, it will also send the image to Telegram.

## Repository layout
- `src/generate.mjs`: core generator (from `pollinations-image-gen` skill)
- `src/painter.mjs`: wrapper runner (from `painter-run` skill)
- `bin/mig.mjs`: unified CLI entry
- `docs/`: GitHub Pages demo site

## License
MIT
