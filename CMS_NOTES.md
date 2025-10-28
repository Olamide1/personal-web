# CMS Blog Post Workflow Notes

## Current Limitation

Decap CMS with `extension: "html"` creates files with frontmatter + body content, not full HTML pages. Example:

```html
---
title: My Post
date: 2025-01-15
summary: A great post
tags: [ai, automation]
---
<p>Post content here...</p>
```

## Solutions

### Option 1: Wrap Posts Manually (Recommended for now)

After creating a post in CMS:
1. Copy the frontmatter and body from CMS-created file
2. Use `welcome-to-the-blog.html` as a template
3. Replace `{{title}}`, `{{date}}`, `{{tags}}`, and `{{{body}}}` with actual content
4. Save as full HTML file

### Option 2: Use a Local Build Script (Optional)

Run this script locally (not during deployment) to convert CMS posts to full HTML:

```bash
node scripts/wrap-posts.js
```

This will:
- Find all files in `blog/posts/` with frontmatter
- Wrap them in the full HTML template
- Output complete HTML files

### Option 3: Switch to Markdown (Future)

Consider changing CMS config to output Markdown, then use a simple build step to convert to HTML. This would require updating the PRD approach slightly.

## CMS Created Files

Files created by Decap CMS will have this structure:
- Frontmatter with metadata (title, date, summary, tags)
- Body content (HTML from markdown widget)

To make them work as standalone pages, wrap them in the full page template found in `welcome-to-the-blog.html`.
