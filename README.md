# Multimodal Image Generator

A small open-source app/CLI that generates images via the **pollinations.ai** API.

- Uses: https://gen.pollinations.ai
- Built with: pollinations.ai

## Credits
This project is powered by **pollinations.ai**.

- Website: https://pollinations.ai

## Quick start (CLI)

### Requirements
- Node.js 18+ (for built-in `fetch`)
- An API key from pollinations: set `POLLINATIONS_API_KEY`

### Generate (direct)

```bash
export POLLINATIONS_API_KEY=***
node generate.mjs --prompt "a cute cat" --model flux --width 1024 --height 1024
```

### Generate (painter wrapper)

```bash
export POLLINATIONS_API_KEY=***
node painter.mjs --prompt "a cute cat" --caption "test" --model zimage
```

## Repository layout
- `generate.mjs`: core generator (from pollinations-image-gen skill)
- `painter.mjs`: wrapper runner (from painter-run skill)

## License
MIT
