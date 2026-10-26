#!/usr/bin/env node
/**
 * Prints the share images (1200x630 JPEGs) into assets/img/og/: one for each page, and one for each blog post,
 * engraved like the rest of the site. Social sites show these when a link is shared.
 *
 * Needs a browser and the site running locally:
 *   npm i --no-save playwright-core
 *   node local-404-server.js &            # serves http://localhost:8000
 *   CHROME_PATH="/path/to/chrome" node scripts/make-og.js        # (CHROME_PATH optional if Playwright's own Chromium is installed)
 * Run it again after adding a post; commit the new images. Posts without an image fall back to assets/img/og.png.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.env.BASE || 'http://localhost:8000';
const OUT = path.join(__dirname, '../assets/img/og');
const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../blog/index.json'), 'utf8')).items || [];

const pages = [
  { slug: 'home', scene: 'adam', title: 'Lamide', kicker: 'Scena IV · Creatio Adae', sub: 'Product manager building AI agents and automation' },
  { slug: 'about', scene: 'lux', title: 'About', kicker: 'Scena I · Separatio lucis a tenebris', sub: 'Product, AI agents and automation tools that solve real problems' },
  { slug: 'projects', scene: 'sol', title: 'Projects', kicker: 'Scena II · Creatio solis, lunae et plantarum', sub: 'Faylo, Akọwé and other things I am building' },
  { slug: 'now', scene: 'terra', title: 'Now', kicker: 'Scena III · Separatio terrae ab aquis', sub: 'What I am focused on right now' },
  { slug: 'contact', scene: 'eva', title: 'Contact', kicker: 'Scena V · Creatio Evae', sub: 'Say hello' },
  { slug: 'blog', scene: 'arbor', title: 'Blog', kicker: 'Scena VI · Peccatum originale et expulsio', sub: 'Notes on AI, automation and product' },
  { slug: 'consulting', scene: 'noe', title: 'KYC drop-off teardown', kicker: 'Scena VII · Sacrificium Noe', sub: 'Five days, fixed scope, for fintechs' }
];
const posts = index.map(p => ({
  slug: p.slug, plate: p.title, title: p.title,
  kicker: 'Blog · ' + new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of [...pages, ...posts]) {
    const q = new URLSearchParams();
    ['scene', 'plate', 'title', 'kicker', 'sub'].forEach(k => { if (c[k]) q.set(k, c[k]); });
    await page.goto(`${BASE}/scripts/og-card.html?${q}`, { waitUntil: 'load' });
    await page.waitForFunction('window.__ogReady === true', null, { timeout: 20000 });
    await page.waitForTimeout(250);
    const file = path.join(OUT, c.slug + '.jpg');
    await page.screenshot({ path: file, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(c.slug, Math.round(fs.statSync(file).size / 1024) + ' KB');
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
