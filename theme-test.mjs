/**
 * theme-test.mjs — prueba definitiva: My QTH, tema claro y oscuro.
 * Verifica CSS vars (raw + computed), rendered colors de ion-content shadow DOM,
 * y los 7 escenarios OS/tema. Detecta herencia incorrecta.
 *
 * node theme-test.mjs
 */
import { chromium } from 'playwright-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Resuelve una CSS custom property a rgb() vía un elemento auxiliar
const resolveVar = (page, v) => page.evaluate((v) => {
  const el = document.createElement('div');
  el.style.cssText = `display:none;background-color:var(${v})`;
  document.body.appendChild(el);
  const c = getComputedStyle(el).backgroundColor;
  el.remove();
  return c;
}, v);

// Lee el shadow DOM de ion-content: --background resolves to bgcolor de la part scroll
const getIonContentBg = (page) => page.evaluate(() => {
  const ic = document.querySelector('ion-content');
  if (!ic) return 'NOT FOUND';
  // Leer --background de ion-content (la que Ionic pasa al shadow DOM)
  return getComputedStyle(ic).getPropertyValue('--background').trim();
});

function hexToRgb(h) {
  h = h.replace('#','');
  return `rgb(${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)})`;
}

const LIGHT = { '--ham-bg':'#efeade','--ham-surface':'#faf8f3','--ham-glow':'#1b5f52','--ham-text':'#1c2a22','--ham-border':'#c4d2b8','--ion-background-color':'#efeade','--ion-text-color':'#1c2a22','--ion-item-background':'#faf8f3' };
const DARK  = { '--ham-bg':'#0d1520','--ham-surface':'#141d26','--ham-glow':'#34c9a0','--ham-text':'#c0d8d0','--ham-border':'#1e3040','--ion-background-color':'#0d1520','--ion-text-color':'#c0d8d0','--ion-item-background':'#141d26' };

let pass=0, fail=0;
function chk(lbl, actual, expected) {
  const n = s => s.replace(/\s+/g,' ').trim().toLowerCase();
  const ok = n(actual) === n(expected);
  console.log(`  ${ok?'✅':'❌'} ${lbl}  →  ${actual}`);
  if (!ok) { console.log(`         esperado: ${expected}`); fail++; } else pass++;
}

async function scenario(browser, name, colorScheme, dataTheme, expected) {
  const ctx  = await browser.newContext({ colorScheme, viewport:{width:390,height:844} });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4200/tabs/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate((t) => {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else   document.documentElement.removeAttribute('data-theme');
  }, dataTheme);
  await page.waitForTimeout(300);

  const mediaDark = await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const attr      = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log(`\n══ ${name}`);
  console.log(`   attr="${attr}"  prefers-dark=${mediaDark}`);

  for (const [v, hex] of Object.entries(expected)) {
    const resolved = await resolveVar(page, v);
    chk(v, resolved, hexToRgb(hex));
  }

  // ion-content --background (what Ionic uses in shadow DOM)
  const icBg = await getIonContentBg(page);
  console.log(`   ion-content --background = ${icBg}`);

  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:CHROME, args:['--force-color-profile=srgb'] });

  await scenario(browser, 'OS:light  tema:light', 'light', 'light',  LIGHT);
  await scenario(browser, 'OS:dark   tema:light', 'dark',  'light',  LIGHT);
  await scenario(browser, 'OS:dark   tema:dark',  'dark',  'dark',   DARK);
  await scenario(browser, 'OS:light  tema:dark',  'light', 'dark',   DARK);
  await scenario(browser, 'OS:dark   auto',        'dark',  null,    DARK);
  await scenario(browser, 'OS:light  auto',        'light', null,    LIGHT);

  // Regresión en caliente: dark→light con OS oscuro
  const ctx  = await browser.newContext({ colorScheme:'dark', viewport:{width:390,height:844} });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4200/tabs/home', { waitUntil:'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme','dark'));
  await page.waitForTimeout(200);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme','light'));
  await page.waitForTimeout(300);
  console.log(`\n══ Regresión dark→light (OS:dark, en caliente)`);
  for (const [v, hex] of Object.entries(LIGHT)) {
    const resolved = await resolveVar(page, v);
    chk(v, resolved, hexToRgb(hex));
  }
  const icBg = await getIonContentBg(page);
  console.log(`   ion-content --background = ${icBg}`);
  await ctx.close();

  await browser.close();
  console.log(`\n══ RESULTADO: ${pass}✅ / ${fail}❌\n`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
