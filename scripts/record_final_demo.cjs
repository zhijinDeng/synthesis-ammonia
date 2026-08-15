const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const url = process.env.DEMO_URL || "https://zhijindeng.github.io/synthesis-ammonia/";
const outputDir = path.resolve(process.env.DEMO_OUTPUT || "output/final-demo");
const finalName = process.env.DEMO_NAME || "yuntu-ammonia-final-demo.webm";
fs.mkdirSync(outputDir, { recursive: true });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  let browser;
  let context;
  try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.DEMO_CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  await page.evaluate(() => {
    const note = document.createElement("div");
    note.id = "final-demo-note";
    note.textContent = "决赛演示样例 · 不代表云图实时生产数据 · 不写入 DCS / SIS";
    note.style.cssText = [
      "position:fixed", "top:14px", "right:22px", "z-index:10000",
      "background:#f8fafc", "color:#334155", "border:1px solid #cbd5e1",
      "padding:7px 12px", "font:600 12px/1.3 Arial,'Microsoft YaHei',sans-serif",
      "box-shadow:0 4px 14px rgba(15,23,42,.12)"
    ].join(";");
    document.body.appendChild(note);

    const box = document.createElement("div");
    box.id = "final-demo-caption";
    box.style.cssText = [
      "position:fixed", "left:34px", "bottom:26px", "z-index:10000",
      "background:rgba(7,34,50,.96)", "color:#fff", "padding:16px 22px",
      "border-left:5px solid #25b79f", "border-radius:5px",
      "font:600 18px/1.55 Arial,'Microsoft YaHei',sans-serif",
      "box-shadow:0 10px 30px rgba(0,0,0,.28)", "max-width:920px",
      "white-space:pre-line"
    ].join(";");
    document.body.appendChild(box);
  });

  const caption = async (chapter, text, seconds) => {
    console.log(chapter + " " + text);
    await page.locator("#final-demo-caption").evaluate((node, value) => {
      node.textContent = value;
    }, chapter + "\n" + text);
    await sleep(seconds * 1000);
  };

  const click = async selector => {
    console.log("click " + selector);
    const target = page.locator(selector).first();
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 8000 });
      await target.click({ timeout: 8000 });
    } catch (error) {
      console.log("fallback click " + selector + ": " + error.message);
      await page.evaluate(value => document.querySelector(value)?.click(), selector);
    }
    await sleep(900);
  };

  const focusText = async text => {
    console.log("focus " + text);
    const target = page.getByText(text, { exact: false }).first();
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 8000 });
    } catch (error) {
      console.log("skip focus " + text + ": " + error.message);
    }
    await sleep(1000);
  };

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await caption(
    "01｜作品定位",
    "氨智领航调控师位于生产运行管理层：连接订单、库存、生产、公辅、设备与经营数据，帮助调度人员做跨装置判断。",
    14
  );

  await click('[data-preset="supply"]');
  await click('[data-workspace="supply"]');
  await focusText("经营行情闸门");
  await caption(
    "02｜保供场景：先核价",
    "公开行情只作趋势参考。产品、区域、含税与运费口径、时间和确认人不完整时，平台冻结新的经济排序。",
    17
  );

  await focusText("24小时液氨平衡");
  await caption(
    "03｜液氨平衡",
    "把期初库存、预计产氨、外采和各下游去向放在同一张账上，先守住物料守恒与安全库存，再讨论液氨给谁。",
    17
  );

  await focusText("未来24小时预计产氨");
  await caption(
    "04｜产供销经济取舍",
    "平台比较相对外售分配贡献、订单优先级、停开损失和连续运行代价。测算只用于方案比较，不冒充已经实现的利润。",
    18
  );

  await click('[data-preset="protect"]');
  await click('[data-workspace="stability"]');
  await caption(
    "05｜护机场景：弱信号证据",
    "压缩机趋势不直接得出停车结论。页面同时给出变化变量、持续时间、数据质量、核对点位、专业复核对象和停算条件。",
    18
  );
  await caption(
    "06｜调控师问答",
    "回答先报事实和证据，再说明边界与下一步。经验不足的操作人员能够知道哪里在变、先查什么、需要通知谁。",
    16
  );

  await click('[data-workspace="execution"]');
  await focusText("跨装置调度动作单");
  await caption(
    "07｜跨装置动作单",
    "一个方案拆给合成主操、下游主操、罐区调度和公辅调度。四岗位全部接令后才进入执行跟踪；接令不等于已经执行。",
    18
  );

  await focusText("飞书班组协同");
  await click('[data-action="card"]');
  await click('[data-action="approval"]');
  await caption(
    "08｜飞书协同闭环",
    "互动卡片承接方案摘要，审批承接专业会签，Task 跟踪责任和截止时间，多维表格保存班次事实、未采纳原因与复盘结论。",
    19
  );

  await focusText("经验沉淀与新人学习");
  await click('[data-action="bitable"]');
  await caption(
    "09｜经验传承",
    "案例先补事实、再由生产设备安环经营审核，最后生成学习卡。未经审核的单个班次不会自动改写生产规则。",
    18
  );

  await click('[data-workspace="system"]');
  await focusText("影子运行验收台");
  await click("#loadShadowCase");
  await click("#createShadowRecord");
  await caption(
    "10｜影子运行验收",
    "同一份历史输入同时交给人工原计划和平台建议，对照约束、差异和实际回传。旁路阶段只读数据，不向现场下指令。",
    20
  );

  await click('[data-workspace="system"]');
  await focusText("30/60/90 天企业试点路线");
  await click('[data-roadmap-stage="60"]');
  await caption(
    "11｜企业落地路线",
    "30天先把字段和账对上，60天做历史旁路回放，90天覆盖不少于30个有效班次。只有必过项全部满足，才讨论受控小闭环。",
    20
  );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1400);
  await caption(
    "12｜展示结束",
    "这不是替代现场人员的自动控制器，而是一名可解释、可确认、可追责、会沉淀经验的数字调度长。线上入口与完整材料见飞书参赛文档。",
    15
  );

  const video = page.video();
  await context.close();
  context = null;
  await browser.close();
  browser = null;
  const recordedPath = await video.path();
  const finalPath = path.join(outputDir, finalName);
  fs.copyFileSync(recordedPath, finalPath);
  console.log(finalPath);
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
