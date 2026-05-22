/**
 * Toma screenshots de My QTH en 3 estados:
 *   1. OS light + data-theme=light
 *   2. OS dark  + data-theme=light   ← escenario de regresión
 *   3. OS dark  + data-theme=dark
 */
import { chromium } from 'playwright-core';
import path from 'path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT    = '/tmp/theme-screenshots';

import { mkdirSync } from 'fs';
mkdirSync(OUT, { recursive: true });

async function shot(browser, name, colorScheme, dataTheme) {
  const context = await browser.newContext({
    colorScheme,
    viewport: { width: 390, height: 844 },   // iPhone 14
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4200/tabs/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await page.evaluate((t) => {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else   document.documentElement.removeAttribute('data-theme');
  }, dataTheme);
  await page.waitForTimeout(400);

  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸  ${file}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--force-color-profile=srgb'],
  });
  await shot(browser, '1-os-light_tema-light', 'light', 'light');
  await shot(browser, '2-os-dark_tema-light',  'dark',  'light');
  await shot(browser, '3-os-dark_tema-dark',   'dark',  'dark');
  await browser.close();
  console.log('\nAbre los PNG en:  open /tmp/theme-screenshots/');
})().catch(e => { console.error(e.message); process.exit(1); });
