const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8000;
const publicDir = __dirname;
const dataPath = path.join(__dirname, 'data.json');

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);

  // API: GET/PUT data.json
  if (url === '/api/data') {
    if (req.method === 'GET') {
      fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({}));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(data);
        }
      });
      return;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          fs.writeFile(dataPath, JSON.stringify(parsed, null, 2), 'utf8', err => {
            if (err) {
              res.writeHead(500);
              res.end('Write failed');
            } else {
              res.writeHead(200);
              res.end('OK');
            }
          });
        } catch (e) {
          res.writeHead(400);
          res.end('Invalid JSON');
        }
      });
      return;
    }

    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  // Serve static files
  let filePath = path.join(publicDir, url === '/' ? '/index.html' : url);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // try serving index.html for SPA-like behavior
      const fallback = path.join(publicDir, 'index.html');
      fs.readFile(fallback, (e, data) => {
        if (e) { res.writeHead(404); res.end('Not found'); }
        else { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(data); }
      });
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Server error'); return; }
      const ext = path.extname(filePath).toLowerCase();
      const type = mime[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  });
});

server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
