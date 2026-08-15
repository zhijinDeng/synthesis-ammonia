const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const url = process.env.DEMO_URL || "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.env.LEADER_SCREENSHOT_DIR || "提交材料/09_领导展示全景包/screenshots");
fs.mkdirSync(outputDir, { recursive: true });

async function settle(page) {
  await page.waitForTimeout(450);
}

async function shot(page, name, selector, options = {}) {
  const locator = page.locator(selector).first();
  await locator.scrollIntoViewIfNeeded();
  await settle(page);
  await locator.screenshot({
    path: path.join(outputDir, name),
    animations: "disabled",
    ...options,
  });
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DEMO_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1.25,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await settle(page);

  await page.screenshot({ path: path.join(outputDir, "01_当班态势与四场景.png"), fullPage: false, animations: "disabled" });

  await page.locator('[data-workspace="supply"]').click();
  await page.locator('[data-preset="supply"]').click();
  await settle(page);
  await shot(page, "02_经营行情闸门.png", ".input-panel");
  await shot(page, "03_液氨平衡.png", 'section.panel:has(#massBalance)');
  await shot(page, "04_产供销事实表与经济取舍.png", 'section.panel:has(#allocationTable)');

  await page.locator('[data-workspace="stability"]').click();
  await page.locator('[data-preset="protect"]').click();
  await settle(page);
  await shot(page, "05_事件队列.png", 'section.panel:has(#eventQueue)');
  await shot(page, "06_压机弱信号趋势.png", 'section.panel:has(#weakSignalEvidence)');

  await page.locator('[data-workspace="execution"]').click();
  await page.locator('[data-preset="steady"]').click();
  await settle(page);
  await shot(page, "07_跨装置动作单.png", 'section.panel:has(#actionSheet)');
  await shot(page, "08_执行监督.png", 'section.panel:has(#executionMonitor)');
  await shot(page, "09_飞书协同闭环.png", 'section.panel:has(#feishuPreview)');
  await shot(page, "10_经验沉淀与新人学习.png", 'section.panel:has(.learning-intro)');

  await page.locator('[data-workspace="system"]').click();
  await settle(page);
  await shot(page, "11_三十六十九十天试点路线.png", ".rollout-panel");
  await shot(page, "12_影子运行验收台.png", ".shadow-acceptance-panel");
  await shot(page, "13_接口字段与模型边界.png", 'section.panel:has(#interfaceMap)');
  await shot(page, "14_数据接口优先级.png", 'section.panel:has(#dataInterfaces)');

  await page.locator("#openGuide").click();
  await settle(page);
  await shot(page, "15_新手使用说明.png", "#guideDialog");

  await browser.close();
  console.log(outputDir);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
