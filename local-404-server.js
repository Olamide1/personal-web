#!/usr/bin/env node
/**
 * Simple local server that serves 404.html for missing pages
 * Run: node local-404-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const ROOT = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let filePath = path.join(ROOT, parsedUrl.pathname);
  
  // Default to index.html for root
  if (parsedUrl.pathname === '/') {
    filePath = path.join(ROOT, 'index.html');
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist - serve 404.html
      const notFoundPath = path.join(ROOT, '404.html');
      fs.readFile(notFoundPath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading 404 page');
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else {
      // File exists - serve it
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'text/plain';
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Test 404 page by visiting: http://localhost:${PORT}/this-does-not-exist.html`);
  console.log(`Or directly: http://localhost:${PORT}/404.html`);
});
