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

function markdownToHtml(markdown) {
  if (!markdown) return '';
  
  // First, handle markdown inside existing HTML tags (like <p>##### text</p> or <p>##### <strong>text</strong></p>)
  // Match the pattern and capture everything inside the paragraph
  let html = markdown.replace(/<p>(#####|####|###|##|#)\s+([\s\S]*?)<\/p>/g, (match, hashes, text) => {
    const level = hashes.length;
    // Clean up the text
    text = text.trim();
    // Convert to heading - preserve any HTML tags inside (like <strong>)
    return `<h${level}>${text}</h${level}>`;
  });
  
  html = html
    // Clean up line breaks first
    .replace(/\\\s*\\\s*\n/g, '\n\n')
    .replace(/\\\s*\n/g, '\n')
    // Headings (do before paragraph splitting) - handle standalone
    .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    // Remove empty paragraphs that might have been created
    .replace(/<p>\s*<\/p>/g, '')
    // Bold (do before links)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (only if not part of bold) - simplified regex
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    // Links - handle both markdown and plain URLs
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/<https?:\/\/[^\s>]+>/g, (match) => {
      const url = match.slice(1, -1);
      return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
    })
    // List items (unordered) - handle before paragraphs
    .replace(/^\*\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`)
    // Code blocks
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Split by double newlines, but preserve existing HTML block elements
  const lines = html.split(/\n\n+/);
  html = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    // Don't wrap if it's already a block element
    if (/^<(h[1-6]|ul|li|p)/.test(line)) return line;
    return `<p>${line}</p>`;
  }).join('\n');
  
  return html;
}

function wrapPost(metadata, body, slug) {
  const template = fs.readFileSync(templatePath, 'utf8');
  
  const tagsHtml = Array.isArray(metadata.tags) && metadata.tags.length > 0
    ? metadata.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
    : '';
  
  // Convert markdown to HTML if needed
  let bodyHtml = body;
  // Check if body is HTML (contains tags) or markdown
  if (!/<[a-z][\s\S]*>/i.test(body)) {
    bodyHtml = markdownToHtml(body);
  }
  
  // Replace template values
  let html = template
    .replace(/Welcome to the Blog/g, metadata.title || 'Blog Post')
    .replace(/Welcome to the Blog — Lamide/g, `${metadata.title} — Lamide`)
    .replace(/An introduction to my blog/g, metadata.summary || '')
    .replace(/January 15, 2025/g, formatDate(metadata.date || new Date()))
    .replace(/<span class="tag">announcement<\/span>\s*<span class="tag">blog<\/span>/g, tagsHtml || '')
    .replace(/<div class="post-content">[\s\S]*?<\/div>/g, `<div class="post-content">\n        ${bodyHtml.trim()}\n      </div>`);
  
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
    
    // Check if file exists and is readable
    if (!fs.existsSync(filePath)) {
      console.log(`⚠ Skipping ${file} - file not found`);
      return;
    }
    
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
  
  // Check if it has frontmatter (CMS file - not yet wrapped)
  if (content.startsWith('---')) {
    const parsed = parseFrontmatter(content);
    if (parsed) {
      const slug = file.replace('.html', '');
      const wrapped = wrapPost(parsed.metadata, parsed.body, slug);
      fs.writeFileSync(filePath, wrapped, 'utf8');
      console.log(`✓ Wrapped ${file}`);
      wrappedCount++;
    }
  } else if (/#####\s+\*\*|##\s+\*\*|^\*\s+/.test(content)) {
    // Already wrapped but contains raw markdown - needs conversion
    console.log(`⚠ Found markdown in ${file}, checking if needs conversion...`);
    // Extract body content and convert markdown
    const bodyMatch = content.match(/<div class="post-content">([\s\S]*?)<\/div>/);
    if (bodyMatch && /#####|##\s+|^\*\s+|<https?:/.test(bodyMatch[1])) {
      const originalBody = bodyMatch[1];
      const convertedBody = markdownToHtml(originalBody);
      const updatedContent = content.replace(
        /<div class="post-content">[\s\S]*?<\/div>/,
        `<div class="post-content">\n        ${convertedBody.trim()}\n      </div>`
      );
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✓ Converted markdown in ${file}`);
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
