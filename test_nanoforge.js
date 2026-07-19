const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Starting NanoForge Automated Integration Test...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', exception => {
    console.error(`Page error: ${exception.message}`);
    errors.push(exception.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Console error: ${msg.text()}`);
      errors.push(msg.text());
    } else {
      console.log(`Console [${msg.type()}]: ${msg.text()}`);
    }
  });

  // Resolve absolute file URL
  const filePath = path.resolve('nanoforge-nanotech-simulator/index.html');
  const fileUrl = `file://${filePath}`;
  console.log(`Loading simulation from: ${fileUrl}`);

  await page.goto(fileUrl);
  
  // Wait for simulation initialization and canvas startup
  await page.waitForTimeout(2000);

  // Capture baseline screenshot
  await page.screenshot({ path: 'nanoforge-nanotech-simulator/nanoforge_sim.png' });
  console.log("Baseline screenshot captured.");

  // Test button clicks
  console.log("Clicking SPAWN NANOBOT button...");
  await page.click('#btn-spawn-nanobot');
  await page.waitForTimeout(500);

  console.log("Clicking MUTAGENIC PULSE button...");
  await page.click('#btn-mutagenic-storm');
  await page.waitForTimeout(1000);

  // Capture mutated screenshot
  await page.screenshot({ path: 'nanoforge-nanotech-simulator/nanoforge_mutated.png' });
  console.log("Mutagenic pulse screenshot captured.");

  // Retrieve current stats from DOM
  const botCount = await page.textContent('#nanobot-count');
  const pathogenCount = await page.textContent('#pathogen-count');
  console.log(`Final Telemetry: Nanobots = ${botCount}, Pathogens = ${pathogenCount}`);

  await browser.close();

  if (errors.length > 0) {
    console.error("Test failed. Unhandled console errors detected:");
    console.error(errors);
    process.exit(1);
  } else {
    console.log("Test passed! No console/page errors detected.");
    process.exit(0);
  }
})();
