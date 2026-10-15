/**
 * Local Development Server for Dandiya Night Pass Generator
 * Simulates Vercel Serverless Functions locally
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

const registerApi = require('./api/register');
const registrationsApi = require('./api/registrations');
const adminsApi = require('./api/admins');
const statsApi = require('./api/stats');
const configApi = require('./api/config');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

// Adapter to execute Vercel serverless function signatures locally
function runServerless(fn, req, res) {
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  if (req.method === 'POST' || req.method === 'PUT') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (e) {
        req.body = body;
      }
      fn(req, res);
    });
  } else {
    req.body = {};
    fn(req, res);
  }
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==========================================
  // VERCEL SERVERLESS API ROUTES
  // ==========================================
  if (pathname === '/api/register') {
    return runServerless(registerApi, req, res);
  }

  if (pathname === '/api/registrations') {
    return runServerless(registrationsApi, req, res);
  }

  if (pathname === '/api/admins') {
    return runServerless(adminsApi, req, res);
  }

  if (pathname === '/api/stats') {
    return runServerless(statsApi, req, res);
  }

  if (pathname === '/api/config') {
    return runServerless(configApi, req, res);
  }

  // ==========================================
  // STATIC ASSET SERVING
  // ==========================================
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.warn('Stream error:', streamErr.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Error');
      }
    });
    stream.pipe(res);
  });
});

server.on('error', (err) => {
  console.error('Server HTTP error:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception (handled):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection (handled):', reason);
});

server.listen(PORT, () => {
  console.log(`\n🎉 Dandiya Night Pass Generator server running!`);
  console.log(`📱 Web App: http://localhost:${PORT}`);
  console.log(`🔒 Vercel Serverless API Ready.\n`);
});
