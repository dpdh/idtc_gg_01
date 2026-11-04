const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT || 8000);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function proxyMeshy(req, res, apiType, taskId) {
  const apiKey = process.env.MESHY_API_KEY;
  if (!apiKey) return json(res, 503, { error: 'Server belum dikonfigurasi. Set MESHY_API_KEY lalu jalankan ulang server.' });

  const endpoints = {
    'text-to-3d': { base: 'https://api.meshy.ai/openapi/v2/text-to-3d', promptLimit: 800 },
    'image-to-3d': { base: 'https://api.meshy.ai/openapi/v1/image-to-3d' },
  };
  const endpoint = endpoints[apiType];
  if (!endpoint) return json(res, 404, { error: 'Unknown Meshy API endpoint.' });
  let url = endpoint.base;
  const options = { method: req.method, headers: { Authorization: `Bearer ${apiKey}` } };
  if (taskId) {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
    url += `/${encodeURIComponent(taskId)}`;
  } else {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 16_384) return json(res, 413, { error: 'Request too large.' });
    }
    let payload;
    try { payload = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON body.' }); }
    if (apiType === 'text-to-3d' && (typeof payload.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > endpoint.promptLimit)) {
      return json(res, 400, { error: `Prompt wajib diisi dan maksimal ${endpoint.promptLimit} karakter.` });
    }
    if (apiType === 'image-to-3d') {
      let imageUrl;
      try { imageUrl = new URL(payload.image_url); } catch { return json(res, 400, { error: 'image_url wajib berupa URL gambar yang valid.' }); }
      if (!['http:', 'https:'].includes(imageUrl.protocol)) return json(res, 400, { error: 'image_url hanya boleh menggunakan HTTP atau HTTPS.' });
      if (typeof payload.texture_prompt !== 'string' || !payload.texture_prompt.trim()) {
        return json(res, 400, { error: 'texture_prompt wajib diisi.' });
      }
    }
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload);
  }

  try {
    const upstream = await fetch(url, options);
    const responseBody = await upstream.text();
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(responseBody);
  } catch (error) {
    json(res, 502, { error: `Meshy API tidak dapat dijangkau: ${error.message}` });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const apiMatch = requestUrl.pathname.match(/^\/api\/meshy\/(text-to-3d|image-to-3d)(?:\/([^/]+))?\/?$/);
  if (apiMatch) return proxyMeshy(req, res, apiMatch[1], apiMatch[2] ? decodeURIComponent(apiMatch[2]) : null);
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed.' });

  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); } catch { return json(res, 400, { error: 'Invalid URL.' }); }
  const requested = path.resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) return json(res, 403, { error: 'Forbidden.' });
  let filePath = requested;
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    // Keep SPA navigation fallback for page routes only. Returning index.html
    // for a missing .js/.glb file makes browsers parse HTML as an asset and stall.
    if (path.extname(requested)) {
      return json(res, 404, { error: 'Static asset not found.' });
    }
    filePath = path.join(root, 'index.html');
  }
  try {
    const stat = await fs.promises.stat(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch {
    json(res, 500, { error: 'Web build belum tersedia. Jalankan npm run build:web.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Web app and Meshy proxy listening on http://localhost:${port}`);
  if (!process.env.MESHY_API_KEY) console.warn('MESHY_API_KEY is not set; Meshy requests will return 503.');
});
