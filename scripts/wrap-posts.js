#!/usr/bin/env node
/**
 * Helper script to wrap CMS-created blog posts (with frontmatter) 
 * into full HTML pages.
 * 
 * Run this locally: node scripts/wrap-posts.js
 */

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../blog/posts');
const templatePath = path.join(__dirname, '../blog/posts/welcome-to-the-blog.html');

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return null;
  
  const frontmatterText = match[1];
  const body = match[2];
  const metadata = {};
  
  frontmatterText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
      metadata[key.trim()] = value;
    }
  });
  
  return { metadata, body };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function wrapPost(metadata, body, slug) {
  const template = fs.readFileSync(templatePath, 'utf8');
  
  const tagsHtml = Array.isArray(metadata.tags) && metadata.tags.length > 0
    ? metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
    : '';
  
  const tagsSection = tagsHtml 
    ? `<div id="post-tags">${tagsHtml}</div>`
    : '';
  
  // Replace template values
  let html = template
    .replace(/Welcome to the Blog/g, metadata.title || 'Blog Post')
    .replace(/Welcome to the Blog — Lamide/g, `${metadata.title} — Lamide`)
    .replace(/An introduction to my blog/g, metadata.summary || '')
    .replace(/January 15, 2025/g, formatDate(metadata.date || new Date()))
    .replace(/<span class="tag">announcement<\/span>\s*<span class="tag">blog<\/span>/g, tagsHtml || '')
    .replace(/<div class="post-content">[\s\S]*?<\/div>/g, `<div class="post-content">\n        ${body.trim()}\n      </div>`);
  
  // Update meta tags
  html = html.replace(/<title>.*?<\/title>/, `<title>${metadata.title} — Lamide</title>`);
  html = html.replace(/<meta name="description" content=".*?"\/>/, 
    `<meta name="description" content="${metadata.summary || ''}" />`);
  
  return html;
}

// Process files
const files = fs.readdirSync(postsDir)
  .filter(file => file.endsWith('.html') && file !== 'welcome-to-the-blog.html' && file !== 'template.html');

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if it has frontmatter
  if (content.startsWith('---')) {
    const parsed = parseFrontmatter(content);
    if (parsed) {
      const slug = file.replace('.html', '');
      const wrapped = wrapPost(parsed.metadata, parsed.body, slug);
      fs.writeFileSync(filePath, wrapped, 'utf8');
      console.log(`✓ Wrapped ${file}`);
    }
  }
});

console.log('\nDone! Processed', files.length, 'files.');
