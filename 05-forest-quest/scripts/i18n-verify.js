const { chromium } = require('playwright');
const path = require('path');

const OUT = path.resolve(__dirname, 'output/playwright');
const BASE = 'http://127.0.0.1:5173';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('PAGE ERROR:', msg.text());
  });

  // 1. Default zh title
  await page.goto(BASE);
  await page.waitForSelector('#overlay-title', { state: 'visible' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'shot-24-title-zh.png') });

  // 2. Switch to EN
  await page.click('button[data-lang="en"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'shot-25-title-en.png') });

  // 3. Level select EN
  await page.click('#overlay-title .btn-level-select');
  await page.waitForSelector('#overlay-level-select', { state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'shot-26-level-select-en.png') });

  // 4. Enter L1 then Esc pause EN
  await page.click('.level-cell:not(.locked)');
  await page.waitForSelector('#hud', { state: 'visible' });
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForSelector('#overlay-pause', { state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'shot-27-pause-en.png') });

  await browser.close();
  console.log('Screenshots done');
})();
