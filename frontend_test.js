const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Create an absolute URL for local file
  const filePath = path.resolve('ai-fractal-explorer/index.html');
  const fileUrl = `file://${filePath}`;

  await page.goto(fileUrl);
  // Give it some time to render WebGL
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'fractal_screenshot.png' });

  // Test mutation button
  await page.click('#mutate-btn');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'fractal_mutated.png' });

  await browser.close();
  console.log("Screenshots captured");
})();
