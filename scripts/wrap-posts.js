#!/usr/bin/env node
/**
 * Helper script to wrap CMS-created blog posts (with frontmatter) 
 * into full HTML pages and update blog/index.json.
 * 
 * Run this locally: node scripts/wrap-posts.js
 * Or it runs automatically on Netlify deploy.
 */

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../blog/posts');
const templatePath = path.join(__dirname, '../blog/posts/welcome-to-the-blog.html');
const indexPath = path.join(__dirname, '../blog/index.json');

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

function parseHTMLPost(htmlContent, filename) {
  // Extract title from <title> tag or <h1>
  const titleMatch = htmlContent.match(/<title>(.*?) — Lamide<\/title>/) || 
                     htmlContent.match(/<h1[^>]*class="post-title"[^>]*>(.*?)<\/h1>/);
  const title = titleMatch ? titleMatch[1].replace(/<span[^>]*>.*?<\/span>/g, '').trim() : 'Untitled';

  // Extract date from meta or post-meta
  const dateMatch = htmlContent.match(/<span>([A-Za-z]+ \d{1,2}, \d{4})<\/span>/);
  let date = new Date().toISOString();
  if (dateMatch) {
    const dateStr = dateMatch[1];
    date = new Date(dateStr).toISOString();
  }

  // Extract summary from meta description
  const descMatch = htmlContent.match(/<meta name="description" content="(.*?)"\/>/);
  const summary = descMatch ? descMatch[1] : '';

  // Extract tags
  const tags = [];
  const tagMatches = htmlContent.matchAll(/<span class="tag">(.*?)<\/span>/g);
  for (const match of tagMatches) {
    const tag = match[1].trim();
    if (tag && tag !== '') {
      tags.push(tag);
    }
  }

  // Clean summary - remove extra text that might have been added
  const cleanSummary = summary.replace(/about AI, automation, and product management\.?$/, '').trim();

  const slug = filename.replace('.html', '');

  return {
    title,
    slug,
    date,
    summary: cleanSummary || summary,
    tags: tags.length > 0 ? tags : [],
    path: `/blog/posts/${filename}`
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function formatDateForIndex(dateString) {
  // Convert to ISO string format YYYY-MM-DDTHH:mm:ssZ
  const date = new Date(dateString);
  return date.toISOString();
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

function updateBlogIndex() {
  const allFiles = fs.readdirSync(postsDir)
    .filter(file => file.endsWith('.html') && file !== 'template.html');
  
  const posts = [];
  
  allFiles.forEach(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    let postData;
    
    // Check if it has frontmatter (CMS file - not yet wrapped)
    if (content.startsWith('---')) {
      const parsed = parseFrontmatter(content);
      if (parsed) {
        // Filter out empty tags
        const cleanTags = Array.isArray(parsed.metadata.tags) 
          ? parsed.metadata.tags.filter(tag => tag && tag.trim() !== '')
          : [];
        
        postData = {
          title: parsed.metadata.title || 'Untitled',
          slug: file.replace('.html', ''),
          date: formatDateForIndex(parsed.metadata.date || new Date()),
          summary: (parsed.metadata.summary || '').trim(),
          tags: cleanTags,
          path: `/blog/posts/${file}`
        };
      }
    } else {
      // It's a wrapped HTML file, parse it
      postData = parseHTMLPost(content, file);
    }
    
    if (postData) {
      posts.push(postData);
    }
  });
  
  // Sort by date (newest first)
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Write updated index.json
  const indexData = { items: posts };
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2) + '\n', 'utf8');
  console.log(`\n✓ Updated blog/index.json with ${posts.length} posts`);
  
  return posts;
}

// Process files - wrap CMS posts
const files = fs.readdirSync(postsDir)
  .filter(file => file.endsWith('.html') && file !== 'welcome-to-the-blog.html' && file !== 'template.html');

let wrappedCount = 0;
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
      wrappedCount++;
    }
  }
});

if (wrappedCount > 0) {
  console.log(`\nWrapped ${wrappedCount} post(s).`);
}

// Update blog index
updateBlogIndex();

console.log('\n✅ Done!');
