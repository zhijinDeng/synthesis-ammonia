const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const url = process.env.DEMO_URL || "http://127.0.0.1:4173/";
const outputDir = path.resolve(process.env.DEMO_OUTPUT || "output/mentor-demo");
fs.mkdirSync(outputDir, { recursive: true });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DEMO_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(1500);
  await page.evaluate(() => {
    const box = document.createElement("div");
    box.id = "mentor-demo-caption";
    box.style.cssText = "position:fixed;left:28px;bottom:24px;z-index:9999;background:rgba(9,31,46,.94);color:#fff;padding:12px 18px;border-left:4px solid #43c6a7;border-radius:4px;font:600 16px/1.45 Arial,'Microsoft YaHei',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.22);max-width:720px";
    document.body.appendChild(box);
  });
  const caption = async (text, seconds = 3) => {
    console.log(text);
    await page.locator("#mentor-demo-caption").evaluate((node, value) => { node.textContent = value; }, text);
    await sleep(seconds * 1000);
  };
  const click = async selector => {
    console.log(`click ${selector}`);
    const target = page.locator(selector).first();
    try {
      await target.click({ timeout: 8000 });
    } catch (error) {
      // 问答按钮可能位于当前视口之外；仍通过页面事件触发原有交互。
      await page.evaluate(value => document.querySelector(value)?.click(), selector);
    }
    await sleep(700);
  };

  await caption("云图合成氨 · 班次调度工作台 | 1/6 当班态势", 3);
  await click("#syncOfficialMarket");
  await caption("公开行情只做参考；企业执行价必须经过经营确认。", 3);

  await click('[data-preset="supply"]');
  await click('[data-workspace="supply"]');
  await caption("2/6 产供销平衡：先守住物料和安全库存，再比较不同去向。", 4);

  await click('[data-preset="protect"]');
  await click('[data-workspace="stability"]');
  await caption("3/6 稳产预警：把微弱趋势、复核事项和责任专业放在一起。", 4);

  await click('[data-question="compressor"]');
  await caption("4/6 调控师问答：先报事实，再说边界和下一步，不替代报警联锁。", 4);

  await click('[data-preset="steady"]');
  await click('[data-workspace="execution"]');
  await click('[data-action="card"]');
  await click('[data-action="approval"]');
  await caption("5/6 飞书协同：卡片、审批、任务和复盘承接人工确认。", 4);

  await click('[data-workspace="overview"]');
  await click('[data-action="export"]');
  await caption("6/6 证据包：输入、门禁、动作单、接令状态和版本都能带走复核。", 4);

  await page.locator("#mentor-demo-caption").evaluate(node => { node.textContent += " | 演示样例，不代表企业实时数据"; });
  await sleep(2500);
  const video = page.video();
  await context.close();
  await browser.close();
  const recordedPath = await video.path();
  const finalPath = path.join(outputDir, "yuntu-ammonia-mentor-demo.webm");
  fs.copyFileSync(recordedPath, finalPath);
  console.log(finalPath);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
