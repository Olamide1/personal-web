// Blog index loading
async function loadBlogIndex() {
  try {
    console.log('Fetching /blog/index.json...');
    const response = await fetch('/blog/index.json');
    if (!response.ok) {
      console.error(`Failed to load blog index: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to load blog index: ${response.status}`);
    }
    const data = await response.json();
    console.log('Blog index loaded successfully:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error loading blog index:', error);
    return [];
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function calculateReadingTime(html) {
  // Simple estimate: ~200 words per minute
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

async function renderBlogPosts(containerId, limit = null) {
  console.log(`renderBlogPosts called with containerId: ${containerId}`);
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found!`);
    return;
  }
  console.log(`Container found, loading posts...`);
  
  const posts = await loadBlogIndex();
  console.log(`Fetched ${posts.length} posts from index.json`);
  const postsToShow = limit ? posts.slice(0, limit) : posts;
  
  if (postsToShow.length === 0) {
    container.innerHTML = '<p>No blog posts yet. Check back soon!</p>';
    console.log('No posts found in index.json');
    return;
  }
  
  console.log(`Loaded ${postsToShow.length} post(s)`);
  
  container.innerHTML = postsToShow.map(post => {
    // Filter out empty tags
    const tags = (post.tags || []).filter(tag => tag && tag.trim() !== '').map(tag => 
      `<span class="tag">${tag}</span>`
    ).join('');
    
    // Check if post is new (within last 30 days)
    const postDate = new Date(post.date);
    const daysSincePost = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
    const isNew = daysSincePost <= 30;
    const newBadge = isNew ? '<span class="new-badge">NEW</span>' : '';
    
    return `
      <div class="card">
        <div class="post-meta">
          <span>${formatDate(post.date)}</span>
        </div>
        <h3><a href="${post.path}" style="color: var(--ink); text-decoration: none;">${post.title}</a>${newBadge}</h3>
        ${post.summary ? `<p>${post.summary}</p>` : ''}
        ${tags ? `<div class="mt-1">${tags}</div>` : ''}
        <div class="mt-1">
          <a href="${post.path}" style="color: var(--link);">Read more →</a>
        </div>
      </div>
    `;
  }).join('');
}

async function loadBlogPreview(limit = 3) {
  await renderBlogPosts('blog-preview', limit);
}

// Auto-load on blog.html
(function() {
  const path = window.location.pathname;
  if (path === '/blog.html' || path === '/blog/' || path.endsWith('/blog.html')) {
    console.log('Blog page detected, loading posts...');
    
    function loadPosts() {
      console.log('Calling renderBlogPosts...');
      renderBlogPosts('blog-posts');
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadPosts);
    } else {
      // DOM already loaded
      loadPosts();
    }
  }
})();
