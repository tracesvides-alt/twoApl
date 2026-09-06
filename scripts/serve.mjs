import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { staticPath } from './static-path.mjs';
const root = path.resolve('dist/client');
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
if (!fs.existsSync(path.join(root, 'index.html')))
  throw new Error('Run npm run build first.');
http
  .createServer((req, res) => {
    let url;
    try {
      url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const file = staticPath(root, url);
    if (!file) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control':
        path.basename(file) === 'sw.js' || file.endsWith('.html')
          ? 'no-cache'
          : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, '0.0.0.0', () =>
    console.log(`Local: http://localhost:${port}/`),
  );
