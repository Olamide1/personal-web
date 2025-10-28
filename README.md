# Lamide Personal Website

A modern Netscape-themed personal website built with pure HTML, CSS, and JavaScript. Features a blog powered by Decap CMS (formerly Netlify CMS) and hosted on Netlify.

## Features

- 🌐 **Modern Netscape Theme** — Retro browser aesthetic with modern usability
- 📝 **Blog System** — Browser-based CMS for easy content publishing
- 🎨 **Dark Mode** — Automatic dark mode support
- ⚡ **Fast Performance** — Pure HTML/CSS/JS, no build step
- 📱 **Fully Responsive** — Works on all devices
- ♿ **Accessible** — Keyboard navigation and ARIA labels
- 🎮 **Easter Eggs** — Konami code for starfield animation

## Project Structure

```
/
├── assets/
│   ├── css/
│   │   ├── base.css      # Main stylesheet
│   │   └── theme.css     # Theme tokens
│   ├── js/
│   │   ├── main.js       # Main JavaScript
│   │   └── blog-index.js # Blog loading logic
│   └── img/              # Images
├── admin/
│   ├── index.html        # Decap CMS entry point
│   └── config.yml        # CMS configuration
├── blog/
│   ├── index.json        # Blog post index
│   ├── blog.html         # Blog listing page
│   └── posts/            # Individual blog posts
├── index.html            # Homepage
├── about.html            # About page
├── projects.html         # Projects showcase
├── contact.html          # Contact form
├── now.html              # Now page
├── 404.html              # 404 error page
├── netlify.toml          # Netlify configuration
├── feed.xml              # RSS feed
└── sitemap.xml           # Sitemap
```

## Setup & Deployment

### Local Development

1. Clone the repository
2. Serve locally using any static server:
   ```bash
   # Using Node.js (recommended - includes 404 handling)
   node local-404-server.js
   
   # Using Python
   python -m http.server 8000
   
   # Using npx
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. Open `http://localhost:8000` in your browser
4. Test 404 page by visiting `http://localhost:8000/nonexistent-page.html`

### Deploy to Netlify

1. Push your code to a GitHub repository
2. Go to [Netlify](https://app.netlify.com)
3. Click "New site from Git"
4. Connect your repository
5. Set build settings:
   - Build command: (leave empty)
   - Publish directory: `.` (root)

### CMS Setup

1. Enable Netlify Identity:
   - Go to Site settings → Identity
   - Click "Enable Identity"

2. Enable Git Gateway:
   - Go to Site settings → Identity → Services
   - Click "Enable Git Gateway"

3. Access CMS:
   - Visit `your-site.netlify.app/admin`
   - Sign up for an account
   - Start creating content!

## Adding Blog Posts

### Via CMS (Recommended)

1. Go to `/admin` on your site
2. Click "New Post" in the Blog Posts collection
3. Fill in the form and click "Publish"
4. **Important**: CMS creates posts with frontmatter + body only. You have two options:
   - **Option A**: Run the helper script to wrap posts automatically:
     ```bash
     node scripts/wrap-posts.js
     ```
   - **Option B**: Manually wrap the CMS-created post using `welcome-to-the-blog.html` as a template
5. Update `/blog/index.json` with the new post entry

> See `CMS_NOTES.md` for detailed workflow explanation.

### Manually

1. Create a new HTML file in `/blog/posts/your-slug.html`
2. Use the template from `welcome-to-the-blog.html`
3. Update `/blog/index.json` with the new post entry

## Customization

### Theme Colors

Edit `assets/css/theme.css` to change the color scheme:

```css
:root {
  --bg: #fdfaf5;
  --ink: #111;
  --accent: #7a0c10;
  --link: #0066cc;
  /* ... */
}
```

### Contact Form

The contact form uses Netlify Forms. To receive submissions:

1. Go to Site settings → Forms
2. Configure notification emails
3. Test the form at `/contact.html`

## Performance Tips

- Images should be optimized (WebP format recommended)
- Keep JavaScript files minimal
- Use CSS for animations when possible
- Leverage Netlify's CDN for static assets

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Graceful degradation for older browsers

## License

Personal project — feel free to use as inspiration for your own site.

## Credits

- Design inspired by Netscape Navigator
- Built with [Decap CMS](https://decapcms.org/)
- Hosted on [Netlify](https://netlify.com)
- Fonts: Inter & JetBrains Mono (Google Fonts)
