const { chromium } = require('playwright');
const path = require('path');

(async () => {
  console.log("Starting NanoForge Automated Integration Test (Iteration 3)...");
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

  // Handle javascript prompts for preset saving
  page.on('dialog', async dialog => {
    console.log(`Dialog popped: [${dialog.type()}] "${dialog.message()}"`);
    if (dialog.type() === 'prompt') {
      await dialog.accept('AutoTestPreset');
    } else {
      await dialog.dismiss();
    }
  });

  // Resolve absolute file URL
  const filePath = path.resolve('nanoforge-nanotech-simulator/index.html');
  const fileUrl = `file://${filePath}`;
  console.log(`Loading simulation from: ${fileUrl}`);

  await page.goto(fileUrl);
  
  // Wait for simulation initialization
  await page.waitForTimeout(2000);

  // Capture baseline screenshot
  await page.screenshot({ path: 'nanoforge-nanotech-simulator/nanoforge_sim.png' });
  console.log("Baseline screenshot captured.");

  // Test DNA Presets Dropdown Selector
  console.log("Verifying DNA Presets drop-down interaction...");
  await page.selectOption('#preset-selector', 'hunter');
  await page.waitForTimeout(500);

  const editorValue = await page.inputValue('#dna-editor');
  if (editorValue.includes('"maxSpeed": 3.4') || editorValue.includes('3.4')) {
    console.log("Preset updated editor value successfully.");
  } else {
    errors.push("Preset selector failed to update DNA editor content.");
  }

  // Click compiling
  await page.click('#btn-apply-dna');
  await page.waitForTimeout(500);

  // Test Save Preset dialog
  console.log("Testing Save Preset dialog interaction...");
  await page.click('#btn-save-preset');
  await page.waitForTimeout(500);

  // Initiate Pathogen Purge mission
  console.log("Initiating Pathogen Purge mission...");
  await page.selectOption('#mission-selector', 'purge');
  await page.click('#btn-start-mission');
  await page.waitForTimeout(1000);

  const isHudVisible = await page.isVisible('#mission-hud');
  if (!isHudVisible) {
    errors.push("Mission HUD failed to render when starting mission.");
  }

  // Click obstacles brush and paint on coordinates
  console.log("Selecting obstacles brush...");
  await page.click('#btn-spray-obstacle');
  await page.mouse.move(400, 250);
  await page.mouse.down();
  await page.mouse.move(450, 250);
  await page.mouse.up();
  await page.waitForTimeout(500);

  // Trigger storm to spawn Goliaths
  console.log("Triggering mutagenic storm...");
  await page.click('#btn-mutagenic-storm');
  await page.waitForTimeout(1000);

  // Capture mutated screenshot
  await page.screenshot({ path: 'nanoforge-nanotech-simulator/nanoforge_mutated.png' });
  console.log("Mutagenic & obstacles screenshot captured.");

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
