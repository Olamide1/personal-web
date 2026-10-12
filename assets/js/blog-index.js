// Blog index loading
async function loadBlogIndex() {
  const response = await fetch('/blog/index.json');
  if (!response.ok) throw new Error(`Failed to load blog index: ${response.status}`);
  const data = await response.json();
  return data.items || [];
}

// A small engraved quill-less mark for the empty and error states
const STATE_MARK = '<svg class="state-mark" viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="40" fill="none" stroke="#1A2F8F" stroke-width="1"/><circle cx="42" cy="42" r="35" fill="none" stroke="#1A2F8F" stroke-width=".6"/><path d="M14 46c9-9 19-9 28 0s19 9 28 0" fill="none" stroke="#2F8F78" stroke-width="1.4"/><path d="M14 54c9-9 19-9 28 0s19 9 28 0" fill="none" stroke="#1A2F8F" stroke-width="1.1"/><path d="M14 38c9-9 19-9 28 0s19 9 28 0" fill="none" stroke="#C98A14" stroke-width="1.1"/></svg>';

function skeletonCards(n) {
  const one = '<div class="card skeleton" aria-hidden="true"><div class="sk t"></div><div class="sk h"></div><div class="sk l"></div><div class="sk s"></div></div>';
  return `<div class="sr-only" role="status">Loading posts</div>` + one.repeat(n);
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
  const container = document.getElementById(containerId);
  if (!container) return;

  // Loading: hatched placeholders with a gold sheen, shaped like the cards that will replace them
  container.innerHTML = skeletonCards(limit || 3);

  let posts;
  try {
    posts = await loadBlogIndex();
  } catch (error) {
    console.error('Error loading blog index:', error);
    container.innerHTML = `
      <div class="card state" role="alert">
        ${STATE_MARK}
        <h3>The posts could not be loaded</h3>
        <p>Something went wrong fetching the list. Check your connection and try again.</p>
        <button type="button" class="btn btn-sm" data-retry>Try again</button>
      </div>`;
    container.querySelector('[data-retry]').addEventListener('click', () => renderBlogPosts(containerId, limit));
    return;
  }

  const postsToShow = limit ? posts.slice(0, limit) : posts;
  if (postsToShow.length === 0) {
    container.innerHTML = `
      <div class="card state">
        ${STATE_MARK}
        <h3>Nothing here yet</h3>
        <p>No posts have been published. Check back soon.</p>
      </div>`;
    return;
  }

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
        <h3><a href="${post.path}">${post.title}</a>${newBadge}</h3>
        ${post.summary ? `<p>${post.summary}</p>` : ''}
        ${tags ? `<div class="mt-1">${tags}</div>` : ''}
        <div class="mt-1">
          <a href="${post.path}">Read more →</a>
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
  
  // Check if we're on the blog page
  const isBlogPage = path === '/blog.html' || 
                     path === '/blog/' || 
                     path === '/blog' ||
                     path.endsWith('/blog.html') ||
                     path.endsWith('/blog/') ||
                     path.endsWith('/blog');
  
  if (isBlogPage) {
    
    function loadPosts() {
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
