#!/usr/bin/env node

/**
 * Pollinations Image Generation Script
 *
 * Usage:
 *   node generate.mjs --prompt "a cute cat" --model flux-2-dev [--output /path/to/output.png] [--width 1024] ...
 *
 * Files are saved to --output path if specified, otherwise to the current working directory.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ─── Parse CLI arguments ────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = {};
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = argv[i + 1];
            if (next && !next.startsWith("--")) {
                args[key] = next;
                i++;
            } else {
                args[key] = "true";
            }
        }
    }
    return args;
}

const args = parseArgs(process.argv);

// ─── Validate required params ───────────────────────────────────────────────

const API_KEY = process.env.POLLINATIONS_API_KEY;
if (!API_KEY) {
    console.error("Error: POLLINATIONS_API_KEY environment variable is not set.");
    process.exit(1);
}

const prompt = args.prompt;
if (!prompt) {
    console.error("Error: --prompt is required.");
    console.error(
        'Usage: node generate.mjs --prompt "a cute cat" --model flux-2-dev [options]'
    );
    process.exit(1);
}

// ─── Build request ──────────────────────────────────────────────────────────

const BASE_URL = "https://gen.pollinations.ai";

const FREE_MODELS = [
    // Free / tier-grant model IDs (per https://enter.pollinations.ai)
    "flux", // Flux Schnell
    "flux-2-dev", // FLUX.2 Dev (api.airforce)
    "dirtberry", // Dirtberry (api.airforce)
    "zimage", // Z-Image Turbo
    "imagen-4", // Imagen 4 (api.airforce)
    "grok-imagine", // Grok Imagine (api.airforce)
    "klein", // FLUX.2 Klein 4B
    "gptimage", // GPT Image 1 Mini
    "dirtberry-pro", // Dirtberry Pro (api.airforce)
];
const PAID_MODELS = [
    // 💎 PAID ONLY model IDs (per https://enter.pollinations.ai)
    "seedream", // Seedream 4.0
    "kontext", // FLUX.1 Kontext
    "nanobanana", // NanoBanana
    "seedream-pro", // Seedream 4.5 Pro
    "nanobanana-2", // NanoBanana 2
    "nanobanana-pro", // NanoBanana Pro
    "seedream5", // Seedream 5.0 Lite
    "gptimage-large", // GPT Image 1.5
    "p-image", // Pruna p-image
    "p-image-edit", // Pruna p-image-edit
];

const ALL_MODELS = FREE_MODELS;

const model = args.model || "flux";

if (!ALL_MODELS.includes(model)) {
    console.error(`Error: Unknown or paid-only model id "${model}".`);
    console.error(`Available free model ids: ${FREE_MODELS.join(", ")}`);
    process.exit(1);
}

// Build query parameters from all provided args (except prompt)
const params = new URLSearchParams();
params.set("model", model);

const SUPPORTED_PARAMS = [
    "width",
    "height",
    "seed",
    "enhance",
    "negative_prompt",
    "safe",
    "quality",
    "image",
    "transparent",
    "attachments",
    "timeout_ms",
    "retries"
];

for (const key of SUPPORTED_PARAMS) {
    if (args[key] !== undefined) {
        params.set(key, args[key]);
    }
}

const encodedPrompt = encodeURIComponent(prompt);
const url = `${BASE_URL}/image/${encodedPrompt}?${params.toString()}`;

// ─── Generate ───────────────────────────────────────────────────────────────

async function generate() {
    console.log(`Model: ${model}`);
    console.log(`Prompt: ${prompt}`);
    console.log(`URL: ${url.length > 200 ? url.substring(0, 200) + "..." : url}`);
    console.log("Generating...");

    const startTime = Date.now();

    // Timeout + one retry to avoid hanging forever
    const timeoutMs = Number(args.timeout_ms || process.env.POLLINATIONS_TIMEOUT_MS || 180000);
    const maxRetries = Number(args.retries || process.env.POLLINATIONS_RETRIES || 1);

    let response;
    let lastErr;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        try {
            response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                },
                signal: controller.signal,
            });
            lastErr = undefined;
            break;
        } catch (e) {
            lastErr = e;
            if (attempt < maxRetries) {
                console.error(`⚠️ fetch failed (attempt ${attempt + 1}/${maxRetries + 1}): ${e.message}`);
                await sleep(800);
                continue;
            }
        } finally {
            clearTimeout(t);
        }
    }

    if (!response) {
        console.error(`Error: fetch failed after ${maxRetries + 1} attempt(s).`);
        console.error(lastErr ? lastErr.message : 'unknown error');
        process.exit(1);
    }

    if (!response.ok) {
        let errorBody = "";
        try {
            errorBody = await response.text();
        } catch { }
        console.error(`Error: HTTP ${response.status} ${response.statusText}`);
        console.error(errorBody);
        process.exit(1);
    }

    const contentType = response.headers.get("content-type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());
    const elapsed = Date.now() - startTime;

    // Determine file extension
    let ext = ".jpg";
    if (contentType.includes("image/png")) ext = ".png";
    else if (contentType.includes("image/webp")) ext = ".webp";
    else if (contentType.includes("image/gif")) ext = ".gif";
    else if (contentType.includes("image/jpeg")) ext = ".jpg";

    // Determine output path
    let outputPath;
    if (args.output) {
        outputPath = resolve(process.cwd(), args.output);
    } else if (args.attachments === "true") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedModel = model.replace(/[^a-zA-Z0-9-]/g, "_");
        const filename = `pollinations-${sanitizedModel}-${timestamp}${ext}`;
        outputPath = `/var/minis/attachments/${filename}`;
    } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedModel = model.replace(/[^a-zA-Z0-9-]/g, "_");
        const filename = `pollinations-${sanitizedModel}-${timestamp}${ext}`;
        outputPath = resolve(process.cwd(), filename);
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buffer);

    const sizeKB = (buffer.length / 1024).toFixed(1);

    console.log(`\nDone!`);
    console.log(`  File: ${outputPath}`);
    console.log(`  Size: ${sizeKB} KB`);
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  Time: ${(elapsed / 1000).toFixed(1)}s`);
    if (args.attachments === "true") {
        const filename = outputPath.split("/").pop();
        console.log(`  Minis: minis://attachments/${filename}`);
    }
}

generate().catch((err) => {
    console.error("Generation failed:", err.message);
    process.exit(1);
});
