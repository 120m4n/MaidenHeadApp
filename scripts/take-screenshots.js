/**
 * Toma capturas de pantalla de la app para el PWA manifest (Chrome install dialog).
 * Requerimientos Chrome PWA screenshots:
 *   - wide  (desktop): min 1280×800, aspect ratio entre 1.0 y 2.3
 *   - narrow (mobile): min 390×844, aspect ratio entre 0.45 y 0.85
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:9191';
const OUT_DIR  = path.join(__dirname, '..', 'public', 'screenshots');

const SHOTS = [
  {
    file: 'home-mobile.png',
    label: 'Home — GPS & Grid (mobile)',
    url: `${BASE_URL}/#/tabs/home`,
    viewport: { width: 390, height: 844 },
    waitFor: 2500,
  },
  {
    file: 'lookup-mobile.png',
    label: 'Grid Lookup (mobile)',
    url: `${BASE_URL}/#/tabs/grid-lookup`,
    viewport: { width: 390, height: 844 },
    waitFor: 2500,
  },
  {
    file: 'home-desktop.png',
    label: 'Home — GPS & Grid (desktop)',
    url: `${BASE_URL}/#/tabs/home`,
    viewport: { width: 1280, height: 800 },
    waitFor: 2500,
  },
  {
    file: 'lookup-desktop.png',
    label: 'Grid Lookup (desktop)',
    url: `${BASE_URL}/#/tabs/grid-lookup`,
    viewport: { width: 1280, height: 800 },
    waitFor: 2500,
  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const shot of SHOTS) {
    console.log(`📸  ${shot.label} → ${shot.file}`);
    const ctx  = await browser.newContext({ viewport: shot.viewport });
    const page = await ctx.newPage();

    await page.goto(shot.url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(shot.waitFor);

    await page.screenshot({
      path: path.join(OUT_DIR, shot.file),
      fullPage: false,
    });

    await ctx.close();
  }

  await browser.close();
  console.log('✅  Done →', OUT_DIR);
})();
