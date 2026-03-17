const els = {
  prompt: document.getElementById('prompt'),
  model: document.getElementById('model'),
  width: document.getElementById('width'),
  height: document.getElementById('height'),
  seed: document.getElementById('seed'),
  safe: document.getElementById('safe'),
  btnGenerate: document.getElementById('btnGenerate'),
  btnCopy: document.getElementById('btnCopy'),
  btnOpen: document.getElementById('btnOpen'),
  btnDownload: document.getElementById('btnDownload'),
  status: document.getElementById('status'),
  img: document.getElementById('img'),
  repoLink: document.getElementById('repoLink')
};

const REPO_URL = 'https://github.com/mowenyun/multimodal-image-generator';
els.repoLink.href = REPO_URL;

function setStatus(text, kind = 'idle') {
  els.status.textContent = text;
  els.status.dataset.kind = kind;
}

function buildUrl() {
  const prompt = (els.prompt.value || '').trim();
  if (!prompt) throw new Error('Prompt is required');

  const params = new URLSearchParams();
  const model = els.model.value;
  const width = String(Number(els.width.value || 1024));
  const height = String(Number(els.height.value || 1024));
  params.set('model', model);
  params.set('width', width);
  params.set('height', height);

  const seed = (els.seed.value || '').trim();
  if (seed) params.set('seed', seed);

  const safe = (els.safe.value || '').trim();
  if (safe) params.set('safe', safe);

  const encodedPrompt = encodeURIComponent(prompt);
  return `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;
}

function enableActions(url) {
  els.btnCopy.disabled = false;
  els.btnOpen.href = url;
  els.btnOpen.setAttribute('aria-disabled', 'false');

  // Download via URL (browser will download image)
  els.btnDownload.href = url;
  els.btnDownload.setAttribute('aria-disabled', 'false');
}

function disableActions() {
  els.btnCopy.disabled = true;
  els.btnOpen.href = '#';
  els.btnOpen.setAttribute('aria-disabled', 'true');
  els.btnDownload.href = '#';
  els.btnDownload.setAttribute('aria-disabled', 'true');
}

disableActions();

els.btnGenerate.addEventListener('click', async () => {
  try {
    disableActions();
    setStatus('Generating...', 'loading');

    const url = buildUrl();

    // Force refresh when generating the same URL
    const bust = `&t=${Date.now()}`;
    const finalUrl = url + bust;

    // Load image
    await new Promise((resolve, reject) => {
      els.img.onload = () => resolve();
      els.img.onerror = () => reject(new Error('Image load failed'));
      els.img.src = finalUrl;
    });

    setStatus('Done', 'ok');
    enableActions(url);
  } catch (e) {
    setStatus(e.message || 'Error', 'err');
  }
});

els.btnCopy.addEventListener('click', async () => {
  try {
    const url = buildUrl();
    await navigator.clipboard.writeText(url);
    setStatus('Copied image URL', 'ok');
  } catch (e) {
    setStatus('Copy failed', 'err');
  }
});
