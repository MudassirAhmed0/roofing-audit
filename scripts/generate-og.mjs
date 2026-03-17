/**
 * Generates OG image (1200x630) and apple-touch-icon (180x180) for Roofing Audit.
 *
 * Uses Playwright to render HTML → PNG with the roofing brand (dark theme, amber accent).
 *
 * Usage: npx playwright install chromium && node scripts/generate-og.mjs
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });

// Load Geist font as base64 for embedding
const geistFont = readFileSync('public/fonts/GeistVF.woff2').toString('base64');

const html = `<!DOCTYPE html>
<html>
<head>
<style>
  @font-face {
    font-family: 'Geist';
    src: url(data:font/woff2;base64,${geistFont}) format('woff2');
    font-weight: 100 900;
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    background: #1c1917;
    font-family: 'Geist', system-ui, sans-serif;
    color: #fafaf9;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 72px 80px;
    overflow: hidden;
    position: relative;
  }
  /* Subtle accent glow */
  .bg-glow {
    position: absolute;
    top: 0; right: 0;
    width: 60%; height: 100%;
    background: radial-gradient(ellipse at 80% 20%, rgba(217,119,6,0.10), transparent 70%);
    pointer-events: none;
  }
  .top {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #d97706;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 28px;
  }
  .label-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #d97706;
  }
  h1 {
    font-size: 58px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    max-width: 900px;
    color: #fafaf9;
  }
  h1 .accent { color: #d97706; }
  .cta-row {
    margin-top: 28px;
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 32px;
    border-radius: 8px;
    background: #d97706;
    color: #ffffff;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .cta-sub {
    font-size: 13px;
    color: #a8a29e;
  }
  .bottom {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    border-top: 1px solid #3f3f46;
    padding-top: 32px;
  }
  .stats {
    display: flex;
    gap: 56px;
  }
  .stat-val {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #fafaf9;
  }
  .stat-label {
    font-size: 10px;
    color: #a8a29e;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 4px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-name {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #fafaf9;
  }
  .brand-url {
    font-size: 13px;
    color: #a8a29e;
    margin-left: 4px;
  }
</style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="top">
    <div class="label">
      <div class="label-dot"></div>
      Free Website Audit
    </div>
    <h1>Your roofing website is <span class="accent">losing you calls</span></h1>
    <div class="cta-row">
      <div class="cta-btn">Get Your Free Audit →</div>
      <span class="cta-sub">No credit card • 48hr report</span>
    </div>
  </div>
  <div class="bottom">
    <div class="stats">
      <div>
        <div class="stat-val">18s</div>
        <div class="stat-label">Avg Load Time</div>
      </div>
      <div>
        <div class="stat-val">60%</div>
        <div class="stat-label">Missing Key Features</div>
      </div>
      <div>
        <div class="stat-val">200+</div>
        <div class="stat-label">Sites Audited</div>
      </div>
    </div>
    <div class="brand">
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
        <path d="M40 12 L10 22V50Q10 85 40 95Q70 85 70 50V22L40 12Z" fill="#fff" stroke="#fafaf9" stroke-width="8" stroke-linejoin="round"/>
        <path d="M22 47L38 63L82 19" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 47L38 63L82 19" stroke="#d97706" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M85 33Q85 45 97 45Q85 45 85 57Q85 45 73 45Q85 45 85 33Z" fill="#d97706"/>
      </svg>
      <span class="brand-name">Roofing Audit</span>
      <span class="brand-url">roofingaudit.co</span>
    </div>
  </div>
</body>
</html>`;

await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og-image.png' });
console.log('OG image generated: public/og-image.png');

// Also generate apple-touch-icon (180x180)
const touchPage = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
const touchHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; }
  body {
    width: 180px; height: 180px;
    background: #1c1917;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
</head>
<body>
  <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
    <path d="M40 12 L10 22V50Q10 85 40 95Q70 85 70 50V22L40 12Z" fill="#292524" stroke="#fafaf9" stroke-width="6" stroke-linejoin="round"/>
    <path d="M22 47L38 63L82 19" stroke="#292524" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 47L38 63L82 19" stroke="#d97706" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M85 33Q85 45 97 45Q85 45 85 57Q85 45 73 45Q85 45 85 33Z" fill="#d97706"/>
  </svg>
</body>
</html>`;

await touchPage.setContent(touchHtml, { waitUntil: 'networkidle' });
await touchPage.screenshot({ path: 'public/apple-touch-icon.png' });
console.log('Apple touch icon generated: public/apple-touch-icon.png');

await browser.close();
