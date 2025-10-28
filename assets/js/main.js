// Loading Screen Animation
const loadingMessages = [
  'Initializing connection...',
  'Negotiating protocol...',
  'Establishing session...',
  'Loading assets...',
  'Rendering content...',
  'Almost there...'
];

function initLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBarFill = document.querySelector('.loading-bar-fill');
  const loadingPercent = document.querySelector('.loading-percent');
  const loadingStatus = document.querySelector('.loading-status');
  
  if (!loadingScreen) return;
  
  // Check if already shown in this session
  if (sessionStorage.getItem('loadingShown') === 'true') {
    loadingScreen.classList.add('hidden');
    return;
  }
  
  let progress = 0;
  const targetProgress = 100;
  const duration = 5000; // 5 seconds
  const interval = 50; // Update every 50ms
  const increment = (targetProgress / duration) * interval;
  let messageIndex = 0;
  
  const updateProgress = () => {
    progress += increment;
    
    if (progress > targetProgress) {
      progress = targetProgress;
    }
    
    // Calculate filled blocks (20 total blocks)
    const filledBlocks = Math.floor((progress / 100) * 20);
    const fillBar = '█'.repeat(filledBlocks);
    const emptyBar = '░'.repeat(20 - filledBlocks);
    
    loadingBarFill.textContent = `[${fillBar}${emptyBar}]`;
    loadingPercent.textContent = `${Math.round(progress)}%`;
    
    // Update status message
    const newMessageIndex = Math.floor((progress / 100) * loadingMessages.length);
    if (newMessageIndex !== messageIndex && newMessageIndex < loadingMessages.length) {
      messageIndex = newMessageIndex;
      loadingStatus.textContent = loadingMessages[messageIndex];
    }
    
    if (progress < targetProgress) {
      setTimeout(updateProgress, interval);
    } else {
      // Complete - fade out
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.classList.add('hidden');
          sessionStorage.setItem('loadingShown', 'true');
        }, 300);
      }, 300);
    }
  };
  
  // Add fade in
  loadingScreen.style.opacity = '0';
  setTimeout(() => {
    loadingScreen.style.transition = 'opacity 0.3s';
    loadingScreen.style.opacity = '1';
    updateProgress();
  }, 50);
}

// Initialize loading screen on page load
document.addEventListener('DOMContentLoaded', initLoadingScreen);

// Guest Counter
function initGuestCounter() {
  const counterEl = document.getElementById('guest-counter');
  if (!counterEl) return;
  
  // Get or create visitor count
  let count = parseInt(localStorage.getItem('visitorCount') || '1234', 10);
  
  // Increment if this is a new visit (not just refresh)
  if (!sessionStorage.getItem('visited')) {
    count += Math.floor(Math.random() * 3) + 1; // Add 1-3 for realistic growth
    localStorage.setItem('visitorCount', count.toString());
    sessionStorage.setItem('visited', 'true');
  }
  
  // Format with commas
  const formattedCount = count.toLocaleString('en-US');
  counterEl.textContent = `Visitor #${formattedCount}`;
}

// Page Load Time
function initLoadTime() {
  const loadTimeEl = document.getElementById('load-time');
  if (!loadTimeEl) return;
  
  // Calculate load time
  const loadTime = (performance.timing.loadEventEnd - performance.timing.navigationStart) / 1000;
  const formattedTime = loadTime.toFixed(2);
  loadTimeEl.textContent = `Page loaded in ${formattedTime}s`;
}


// Konami Code for starfield animation
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
  konamiCode.push(e.key);
  
  // Keep only last 10 keys
  if (konamiCode.length > 10) {
    konamiCode.shift();
  }
  
  // Check if sequence matches
  if (konamiCode.length >= 10) {
    const recent = konamiCode.slice(-10);
    if (recent.join(',') === konamiSequence.join(',')) {
      activateStarfield();
      konamiCode = []; // Reset
    }
  }
});

function activateStarfield() {
  const starfield = document.getElementById('starfield');
  if (!starfield) return;
  
  // Remove existing stars
  starfield.innerHTML = '';
  starfield.classList.add('starfield');
  
  // Create stars
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 5 + 's';
    star.style.animationDuration = (Math.random() * 3 + 2) + 's';
    starfield.appendChild(star);
  }
  
  // Remove after 10 seconds
  setTimeout(() => {
    starfield.innerHTML = '';
    starfield.classList.remove('starfield');
  }, 10000);
}

// Prefetch pages on hover for smooth transitions
document.addEventListener('DOMContentLoaded', () => {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', () => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html')) {
        const linkElement = document.createElement('link');
        linkElement.rel = 'prefetch';
        linkElement.href = href;
        document.head.appendChild(linkElement);
      }
    });
  });
});

// Copy link functionality
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      // Show feedback
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }
}

// Skip link for accessibility
document.addEventListener('DOMContentLoaded', () => {
  // Add skip to main content link
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--accent);
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 1000;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Add main content ID if not present
  const main = document.querySelector('main');
  if (main && !main.id) {
    main.id = 'main-content';
  }
  
  // Back to top button
  const backToTop = document.createElement('a');
  backToTop.href = '#';
  backToTop.textContent = '↑ Top';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(backToTop);
  
  // Show/hide back to top button
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });
  
  // Copy code functionality
  document.querySelectorAll('pre code, code').forEach(codeBlock => {
    if (codeBlock.parentElement.tagName === 'PRE') {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-code';
      copyBtn.textContent = 'Copy';
      copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
      copyBtn.addEventListener('click', async () => {
        const text = codeBlock.textContent;
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      });
      codeBlock.parentElement.style.position = 'relative';
      codeBlock.parentElement.appendChild(copyBtn);
    }
  });
  
  // Keyboard navigation indicators
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
  
  // Initialize additional features
  initGuestCounter();
  initLoadTime();
});
