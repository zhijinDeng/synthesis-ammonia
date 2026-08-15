import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "提交材料", "09_领导展示全景包");
const SHOTS = path.join(OUT, "screenshots");
const FINAL = path.join(OUT, "氨智领航调控师_产品全景与决赛展示.pptx");
const SCRIPT = path.join(OUT, "氨智领航调控师_逐页讲解稿.md");
const RENDER = path.join(ROOT, "output", "leader-presentation-render");

const C = {
  navy: "#102A43",
  navy2: "#0D4652",
  teal: "#20A486",
  cyan: "#2B8CB8",
  amber: "#D99A2B",
  red: "#C95D63",
  ink: "#17324A",
  muted: "#52687A",
  line: "#CBD8E0",
  pale: "#F3F7F9",
  mint: "#E5F4EF",
  sky: "#E8F2F7",
  sand: "#FFF2D9",
  white: "#FFFFFF",
};

const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });

async function imageBytes(file) {
  const b = await fs.readFile(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function box(slide, left, top, width, height, fill, line = "none", radius = 0) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    ...(radius ? { borderRadius: "rounded-lg" } : {}),
  });
}

function textBox(slide, text, left, top, width, height, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontSize: 20,
    color: C.ink,
    ...style,
  };
  return shape;
}

function richText(slide, runs, left, top, width, height, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = runs.map(run => typeof run === "string" ? { run } : run);
  shape.text.style = { fontSize: 20, color: C.ink, ...style };
  return shape;
}

async function image(slide, file, left, top, width, height, fit = "contain") {
  return slide.images.add({
    blob: await imageBytes(file),
    contentType: file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png",
    alt: path.basename(file),
    fit,
    position: { left, top, width, height },
  });
}

function header(slide, title, section, page) {
  slide.background.fill = C.white;
  box(slide, 0, 0, 1280, 14, C.teal);
  textBox(slide, section, 62, 36, 250, 24, { fontSize: 15, bold: true, color: C.teal });
  textBox(slide, title, 62, 69, 1140, 58, { fontSize: 36, bold: true, color: C.navy });
  box(slide, 62, 135, 1156, 2, C.line);
  textBox(slide, `氨智领航调控师  |  决赛产品全景`, 62, 684, 520, 20, { fontSize: 12, color: C.muted });
  textBox(slide, String(page).padStart(2, "0"), 1175, 682, 43, 20, { fontSize: 13, bold: true, color: C.muted, alignment: "right" });
}

function addNotes(slide, body, sources) {
  slide.speakerNotes.textFrame.setText(`${body}\n\n[Sources]\n${sources.map(x => `- ${x}`).join("\n")}`);
  slide.speakerNotes.setVisible(true);
}

function bulletList(slide, items, left, top, width, fontSize = 20, color = C.ink, gap = 38) {
  items.forEach((item, index) => {
    box(slide, left, top + index * gap + 9, 9, 9, index === 0 ? C.teal : C.cyan, "none", 4);
    textBox(slide, item, left + 24, top + index * gap, width - 24, gap - 2, { fontSize, color });
  });
}

function callout(slide, number, title, copy, left, top, width, color = C.teal) {
  box(slide, left, top, width, 88, C.white, C.line, 8);
  box(slide, left, top, 44, 88, color, "none", 8);
  textBox(slide, String(number), left + 9, top + 23, 28, 35, { fontSize: 24, bold: true, color: C.white, alignment: "center" });
  textBox(slide, title, left + 60, top + 14, width - 76, 28, { fontSize: 20, bold: true, color: C.navy });
  textBox(slide, copy, left + 60, top + 47, width - 76, 28, { fontSize: 15, color: C.muted });
}

const scripts = [];
function track(page, title, talk) {
  scripts.push({ page, title, talk });
}

// 1. Cover
{
  const s = deck.slides.add();
  s.background.fill = C.navy;
  await image(s, path.join(SHOTS, "01_当班态势与四场景.png"), 650, 0, 630, 720, "cover");
  box(s, 0, 0, 710, 720, C.navy);
  box(s, 72, 66, 92, 7, C.teal);
  textBox(s, "云图合成氨生产运行管理", 72, 102, 520, 30, { fontSize: 18, bold: true, color: "#A9DCCF" });
  textBox(s, "氨智领航调控师", 72, 170, 545, 74, { fontSize: 54, bold: true, color: C.white });
  textBox(s, "把跨系统事实变成可确认、可执行、可验收、可传承的班次方案", 72, 264, 520, 118, { fontSize: 27, bold: true, color: "#E9F2F5" });
  textBox(s, "决赛产品全景展示  |  邓植斤", 72, 590, 430, 32, { fontSize: 18, color: "#B8CAD5" });
  textBox(s, "演练数据不代表企业实际值 · 平台不写 DCS / SIS", 72, 640, 520, 26, { fontSize: 14, color: "#89A5B5" });
  addNotes(s, "开场只讲一句：我们做的不是另一套DCS，也不是一张看板，而是一名帮助调度员完成跨装置取舍的数字员工。它先汇总事实，再比较方案，最后把确认、执行和复盘串起来。", ["提交材料/06_决赛完整方案文档.docx", "screenshots/01_当班态势与四场景.png"]);
  track(1, "我们做的是一名帮助调度员做跨装置取舍的数字员工", "各位老师，我们把作品定位成一名生产运行管理层的数字员工。它不碰控制回路，而是把调度长每天跨系统找数据、算平衡、做取舍、组织会签和班后复盘的工作，做成一条可以核查的业务链。当前页面使用可复现演练数据，所有企业实时值都等待现场只读接口接入后验证。");
}

// 2. Product tree
{
  const s = deck.slides.add();
  header(s, "所有功能围绕一次班次的完整闭环展开", "产品全景", 2);
  await image(s, path.join(OUT, "氨智领航调控师_产品功能全景树.png"), 62, 154, 1156, 500, "contain");
  addNotes(s, "这张图是全场导航。评委不需要记住每个模块，只要记住一条主线：事实进入，方案产生，人来确认，飞书承接，影子验收，经验沉淀；安全边界贯穿始终。", ["提交材料/09_领导展示全景包/氨智领航调控师_产品功能全景树.svg", "docs/architecture.md", "docs/experience-learning-loop.md"]);
  track(2, "所有功能围绕一次班次的完整闭环展开", "这一页是整个作品的地图。左上是订单、库存、生产和设备事实；中间是液氨平衡、约束校核与方案比较；右侧是班长和专业会签；下方依次是飞书执行、影子验收、经验学习。我们把安全和可追溯性放在所有功能下面，而不是最后补一段免责声明。");
}

// 3. Why this product
{
  const s = deck.slides.add();
  header(s, "企业缺少的不是局部控制，而是跨装置的统一判断", "问题与定位", 3);
  textBox(s, "今天的调度长，要在人脑里同时完成三件事", 70, 165, 520, 35, { fontSize: 24, bold: true, color: C.navy });
  callout(s, 1, "调度寻优难", "订单、库存、价格、设备和能源一起变化", 70, 222, 500, C.cyan);
  callout(s, 2, "指挥链条长", "多个系统孤立，跨岗位确认仍靠电话和人工汇总", 70, 326, 500, C.amber);
  callout(s, 3, "经验传承慢", "一名成熟调度长通常需要多年现场积累", 70, 430, 500, C.teal);
  box(s, 640, 170, 540, 362, C.pale, C.line, 8);
  textBox(s, "本平台的岗位", 680, 205, 200, 28, { fontSize: 22, bold: true, color: C.teal });
  textBox(s, "生产运行管理层", 680, 253, 430, 54, { fontSize: 40, bold: true, color: C.navy });
  bulletList(s, ["向下只读接收 DCS / Historian / 设备摘要", "横向串联 ERP、MES、罐区、公辅与经营口径", "向上输出班次建议、责任动作和验收证据", "不替代联锁、操作票、班长和专业会签"], 680, 330, 440, 18, C.ink, 44);
  textBox(s, "一句话：让调度员少花时间找信息，把精力放在判断和协调上。", 70, 575, 1110, 48, { fontSize: 23, bold: true, color: C.navy });
  addNotes(s, "把项目位置讲清楚：DCS已经很擅长局部调节，但下游异常时，跨装置减负荷、液氨分给谁、是否外采、哪个专业先处理，仍要靠调度长组织。我们的工作就在这一层。", ["docs/research-brief.md", "docs/architecture.md", "企业导师访谈纪要（用户提供）"]);
  track(3, "企业缺少的不是局部控制，而是跨装置的统一判断", "DCS能够把一个液位、阀门或回路控制得很稳，但它不会自动回答下游异常后整个产业链怎么联动。调度长仍要从多个系统里找事实，再决定液氨分给谁、哪个装置降负荷、是否外采、什么时候找设备或公辅专业。我们的平台就在这层生产运行管理工作里补位。");
}

// 4. Scenario and shift recommendation
{
  const s = deck.slides.add();
  header(s, "四个场景只是入口，每次决策都先核对同一份班次事实", "当班态势", 4);
  await image(s, path.join(SHOTS, "01_当班态势与四场景.png"), 62, 156, 760, 480, "contain");
  textBox(s, "怎么读这张页面", 860, 170, 300, 30, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["稳氨：连续、平稳、库存可控", "保供：液氨紧张时先保刚性需求", "护机：关键机组趋势偏离时收敛风险", "错峰：能源高价窗口下调整节奏"], 860, 230, 330, 18, C.ink, 50);
  box(s, 860, 452, 318, 134, C.mint, "none", 8);
  textBox(s, "每条建议都带", 883, 474, 260, 25, { fontSize: 18, bold: true, color: C.teal });
  textBox(s, "编号 · 版本 · 有效期\n回滚触发 · 责任岗位", 883, 511, 260, 58, { fontSize: 20, bold: true, color: C.navy });
  addNotes(s, "提醒评委：按钮不是开停车按钮，只是演练条件入口。页面中间的建议也不是已执行负荷，必须经过班长确认、岗位接令和现场规程。", ["screenshots/01_当班态势与四场景.png", "docs/user-guide-for-beginners.md"]);
  track(4, "四个场景只是入口，每次决策都先核对同一份班次事实", "网页顶部的稳氨、保供、护机和错峰是四类常见矛盾的回放入口，并不是装置控制按钮。无论进入哪个场景，系统都使用同一套订单、库存、设备和公辅事实。输出不仅有一个负荷数字，还必须带建议编号、有效期、撤销条件和责任岗位，避免建议脱离工况继续流转。");
}

// 5. Market gate
{
  const s = deck.slides.add();
  header(s, "公开行情只做参考，执行价格必须经过经营确认", "经营行情闸门", 5);
  await image(s, path.join(SHOTS, "02_经营行情闸门.png"), 62, 162, 520, 468, "contain");
  textBox(s, "价格进入调度前要经过两道门", 635, 174, 520, 38, { fontSize: 25, bold: true, color: C.navy });
  callout(s, 1, "官方公开参考", "显示来源、发布时间和读取时间，用于趋势与交叉核验", 635, 235, 520, C.cyan);
  callout(s, 2, "企业执行价", "ERP、销售报价或采购结算版本，由经营人员确认口径", 635, 344, 520, C.teal);
  box(s, 635, 472, 520, 108, C.sand, "none", 8);
  textBox(s, "未确认时怎么办？", 660, 492, 220, 26, { fontSize: 20, bold: true, color: C.navy });
  textBox(s, "沿用上一有效版本，冻结新的经济排序，不把网上价格直接写进生产计划。", 660, 529, 456, 42, { fontSize: 18, color: C.ink });
  addNotes(s, "这里是强落地点：网页能联网读取登记的官方公开来源，但它不等于企业成交价。经营确认把产品、区域、单位、含税/运费、生效时间和版本冻结后，才进入方案计算。", ["screenshots/02_经营行情闸门.png", "docs/architecture.md#行情口径与执行价闸门", "scripts/market_gateway_server.mjs"]);
  track(5, "公开行情只做参考，执行价格必须经过经营确认", "我们没有把所谓实时价格包装成可直接使用的生产价格。公开行情只负责趋势参考和交叉核验；真正进入调度经济比较的，是企业ERP、销售报价或采购结算版本，并由经营人员确认产品、区域、税费、运费、生效时间和版本。未确认时系统沿用上一有效价格，不生成新的经济排序。");
}

// 6. Material balance
{
  const s = deck.slides.add();
  header(s, "液氨这本账先算得平，才有资格讨论分给谁", "产供销平衡", 6);
  await image(s, path.join(SHOTS, "03_液氨平衡.png"), 62, 165, 680, 420, "contain");
  textBox(s, "24 小时守恒关系", 790, 180, 340, 30, { fontSize: 23, bold: true, color: C.navy });
  box(s, 790, 235, 390, 128, C.navy2, "none", 8);
  textBox(s, "期末可用量", 820, 255, 330, 26, { fontSize: 21, bold: true, color: "#A9DCCF", alignment: "center" });
  textBox(s, "= 期初 + 产氨 + 外采 − 各去向", 816, 303, 340, 38, { fontSize: 24, bold: true, color: C.white, alignment: "center" });
  bulletList(s, ["先检查吨数是否守恒", "再看期末是否低于安全库存", "最后才比较增产、外采或减配方案"], 790, 410, 390, 19, C.ink, 52);
  textBox(s, "库存安全线属于企业阈值，当前页面仅为验收样例。", 790, 574, 390, 35, { fontSize: 15, color: C.red });
  addNotes(s, "这是企业最容易核验的功能。先把期初库存、预计产氨、外采到货和所有去向都列出来，保证平衡等式成立。安全库存不满足时，不会因为某个产品利润高就继续给出可执行方案。", ["screenshots/03_液氨平衡.png", "data/ammonia_balance_24h.csv", "docs/user-guide-for-beginners.md"]);
  track(6, "液氨这本账先算得平，才有资格讨论分给谁", "产供销优化不是先看哪个产品价格高，而是先把液氨的物料账对上。系统把期初库存、预计产氨、外采和每一个下游去向放进同一条守恒关系里，再检查期末安全余量。如果吨数不守恒或安全库存不足，方案直接停在可行性门禁，不能进入后面的经济排序。");
}

// 7. Economics
{
  const s = deck.slides.add();
  header(s, "我们比较去向的边际贡献，也把连续运行代价摊在桌面上", "产供销取舍", 7);
  await image(s, path.join(SHOTS, "04_产供销事实表与经济取舍.png"), 62, 160, 790, 470, "contain");
  textBox(s, "系统要回答的不是谁利润最高", 890, 176, 320, 56, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["刚性订单是否必须先保", "单位液氨边际贡献是多少", "停装置会损失多少时间和物料", "外采是否有到货与质量约束", "售价低于完全成本时是否仍有正贡献"], 890, 260, 320, 17, C.ink, 45);
  box(s, 890, 505, 304, 100, C.sand, "none", 8);
  textBox(s, "边际贡献 ≠ 已实现利润", 910, 525, 264, 28, { fontSize: 19, bold: true, color: C.navy, alignment: "center" });
  textBox(s, "真实收益必须等采纳、执行和同口径复盘后确认", 910, 561, 264, 36, { fontSize: 15, color: C.muted, alignment: "center" });
  addNotes(s, "结合企业导师补充：某产品售价低于完全成本时仍可能生产，因为折旧等固定成本已经发生，只要有正边际贡献、避免违约或避免停车损失，方案仍值得比较。页面不能把样例贡献额说成企业已节约金额。", ["screenshots/04_产供销事实表与经济取舍.png", "docs/finals-demo-evidence-qa.md", "企业导师访谈纪要（用户提供）"]);
  track(7, "我们比较去向的边际贡献，也把连续运行代价摊在桌面上", "液氨有限时，系统不是简单按售价排序。它同时看刚性订单、单位液氨边际贡献、外采条件和装置连续运行代价。即使某产品售价低于完全成本，只要还能带走部分固定成本，或者可以避免更大的违约和停车损失，也可能继续生产。页面金额是相对外售基准的比较值，不是已经实现的利润。");
}

// 8. Weak signal
{
  const s = deck.slides.add();
  header(s, "弱信号的价值是提前组织复核，不是冒充事故预测", "稳产预警", 8);
  await image(s, path.join(SHOTS, "05_事件队列.png"), 62, 165, 555, 352, "contain");
  await image(s, path.join(SHOTS, "06_压机弱信号趋势.png"), 665, 165, 553, 352, "contain");
  box(s, 62, 548, 1156, 78, C.pale, C.line, 8);
  textBox(s, "多变量持续偏离", 92, 569, 220, 28, { fontSize: 19, bold: true, color: C.navy });
  textBox(s, "→", 324, 568, 42, 32, { fontSize: 28, bold: true, color: C.teal, alignment: "center" });
  textBox(s, "触发设备专业复核", 382, 569, 240, 28, { fontSize: 19, bold: true, color: C.navy });
  textBox(s, "→", 632, 568, 42, 32, { fontSize: 28, bold: true, color: C.teal, alignment: "center" });
  textBox(s, "必要时限升 / 降负荷建议", 690, 569, 280, 28, { fontSize: 19, bold: true, color: C.navy });
  textBox(s, "DCS 报警和 SIS 联锁始终优先", 973, 569, 215, 28, { fontSize: 16, bold: true, color: C.red, alignment: "center" });
  addNotes(s, "企业举了压缩机微弱变化被新手当作正常波动的例子。当前作品把轴振、轴位移、防喘振裕度和温度等趋势放在一起，给出检查项、持续时间和责任专业。没有真实标签前，不承诺事故预测准确率。", ["screenshots/05_事件队列.png", "screenshots/06_压机弱信号趋势.png", "docs/enterprise-software-benchmark.md"]);
  track(8, "弱信号的价值是提前组织复核，不是冒充事故预测", "企业导师提到过压缩机数据已经有轻微变化，但经验不足的操作工没有继续关注。我们的做法不是看到一个点变了就报警，而是结合轴振、轴位移、防喘振裕度、温度、持续时间和数据质量，生成设备专业复核任务。它是提前亮灯，不替代DCS报警和SIS联锁，也不会未经会签自动减负荷。");
}

// 9. Action and supervision
{
  const s = deck.slides.add();
  header(s, "建议必须被岗位接住，执行结果必须有真实回传", "跨装置执行", 9);
  await image(s, path.join(SHOTS, "07_跨装置动作单.png"), 62, 162, 690, 422, "contain");
  await image(s, path.join(SHOTS, "08_执行监督.png"), 782, 162, 436, 422, "contain");
  box(s, 62, 604, 1156, 42, C.mint, "none", 6);
  textBox(s, "班长确认 → 专业会签 → 四岗位接令 → 现场按规程执行 → Historian / MES 回传 → 班末复盘", 82, 614, 1116, 24, { fontSize: 18, bold: true, color: C.navy, alignment: "center" });
  addNotes(s, "跨装置动作单把合成、硝酸、罐区和公辅分开，写清事实、建议、节奏、责任人和执行前置条件。接令只代表岗位确认收到，不代表阀位或负荷已经改变。实际值只能来自企业事实源。", ["screenshots/07_跨装置动作单.png", "screenshots/08_执行监督.png", "docs/finals-demo-evidence-qa.md"]);
  track(9, "建议必须被岗位接住，执行结果必须有真实回传", "一个看起来合理的负荷方案，如果没有拆成岗位动作，就无法在企业落地。平台把合成、硝酸、罐区和公辅分别列出当前事实、建议动作、节奏、责任人和前置条件。四个岗位接令后才开放跟踪，但接令不等于现场执行；实际负荷、库存和能耗必须由Historian或MES回传，未接入时保持为空。");
}

// 10. Feishu
{
  const s = deck.slides.add();
  header(s, "飞书把一次调度建议变成有责任人、有时限、有结果的协同任务", "飞书闭环", 10);
  await image(s, path.join(SHOTS, "09_飞书协同闭环.png"), 62, 160, 620, 448, "contain");
  textBox(s, "六个企业工作入口", 725, 170, 300, 30, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["互动卡片：送达事实、建议与操作", "审批：班长与相关专业会签", "Task：责任人、截止时间、复核项", "Base：班次、采纳、偏差与原因", "Aily：只检索已审核知识源", "事件回调：状态写回审计链"], 725, 220, 440, 17, C.ink, 44);
  box(s, 725, 505, 455, 98, C.pale, C.line, 8);
  textBox(s, "当前状态", 748, 525, 95, 22, { fontSize: 17, bold: true, color: C.teal });
  textBox(s, "Base / Task 已验证  ·  卡片/审批为原型  ·  Aily与企业接口待授权", 748, 557, 408, 36, { fontSize: 15, color: C.ink });
  addNotes(s, "飞书不是装饰性链接。它承担建议送达、会签、任务、复盘库和知识检索。展示时必须区分完成度：在线方案、多维表格和Task已有验证；自动审批、拆单、事件回传和Aily仍需企业授权。", ["screenshots/09_飞书协同闭环.png", "docs/feishu-integration-playbook.md", "提交材料/07_飞书功能模块说明.docx"]);
  track(10, "飞书把一次调度建议变成有责任人、有时限、有结果的协同任务", "飞书在项目里承担的是实际协同入口。互动卡片负责把事实和建议送到人，审批负责班长与专业会签，Task负责责任人和截止时间，Base负责班次、采纳、偏差与未采纳原因，Aily只检索审核后的知识。我们把完成度分开说明：Base和普通Task已经验证，自动卡片审批和事件回传仍是原型，企业Aily和接口等待授权。");
}

// 11. Shadow acceptance
{
  const s = deck.slides.add();
  header(s, "影子运行先证明建议可靠，再讨论是否进入小范围受控验证", "企业验收", 11);
  await image(s, path.join(SHOTS, "12_影子运行验收台.png"), 62, 158, 830, 470, "contain");
  textBox(s, "同一班次、同一快照", 930, 178, 270, 30, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["平台建议与人工原计划并排", "先看可复算和硬约束", "再补专业会签与真实回传", "没有 Historian 就不填实际效果", "可导出 JSON 验收摘要"], 930, 235, 270, 17, C.ink, 48);
  box(s, 930, 506, 270, 96, C.sand, "none", 8);
  textBox(s, "页面中的 18/30、22/30、27/30", 948, 525, 235, 22, { fontSize: 15, bold: true, color: C.navy, alignment: "center" });
  textBox(s, "是样例回放进度，不是云图现场成果", 948, 558, 235, 30, { fontSize: 15, color: C.red, alignment: "center" });
  addNotes(s, "影子运行是最重要的落地方法。把系统建议和人工原计划放在同一输入快照下回放，先验证数据、物料、硬约束和解释，再接企业真实回传。样例班次进度不能讲成真实成绩。", ["screenshots/12_影子运行验收台.png", "docs/finals-demo-evidence-qa.md", "提交材料/08_决赛演示与验收附件.docx"]);
  track(11, "影子运行先证明建议可靠，再讨论是否进入小范围受控验证", "企业不需要一上来就让AI参与现场控制。我们先做影子运行：对同一个历史班次冻结输入快照，把平台建议和人工原计划逐项并排，先验证能否复算、是否违反硬约束、解释是否完整，再补专业会签和实际结果。没有Historian回传，实际效果栏就保持待接入，绝不拿样例数冒充现场成绩。");
}

// 12. Learning
{
  const s = deck.slides.add();
  header(s, "每次复盘都可以成为教材，但未经专业审核不能进入知识库", "经验传承", 12);
  await image(s, path.join(SHOTS, "10_经验沉淀与新人学习.png"), 62, 158, 820, 468, "contain");
  textBox(s, "受治理的学习闭环", 925, 178, 250, 30, { fontSize: 23, bold: true, color: C.navy });
  callout(s, 1, "班后补事实", "原计划、建议、实际结果、未采纳原因", 925, 230, 278, C.cyan);
  callout(s, 2, "专业审核", "生产 / 设备 / 安环 / 经营确认适用边界", 925, 332, 278, C.amber);
  callout(s, 3, "学习与回测", "新员工完成后，用新班次重新核对", 925, 434, 278, C.teal);
  textBox(s, "单个案例不会自动修改生产规则", 925, 561, 278, 28, { fontSize: 17, bold: true, color: C.red, alignment: "center" });
  addNotes(s, "这里回答知识传承难。页面把已审核和待审核案例分开，待审核的压机案例不能生成学习卡。学习卡必须写明当时事实、判断、适用条件、禁用条件、审核人和规则版本。", ["screenshots/10_经验沉淀与新人学习.png", "docs/experience-learning-loop.md"]);
  track(12, "每次复盘都可以成为教材，但未经专业审核不能进入知识库", "经验传承不是把聊天记录全部喂给模型。每个班次先补齐事实、人工原计划、平台建议、实际结果和未采纳原因；再由生产、设备、安环或经营专业确认适用条件和禁用条件；审核通过后才生成学习卡。新人学完还要回到新的班次重新核对，单个案例不会自动修改生产规则。");
}

// 13. Architecture and boundaries
{
  const s = deck.slides.add();
  header(s, "平台只读接入现有系统，保留控制层和岗位责任边界", "部署与治理", 13);
  box(s, 62, 174, 310, 390, C.sky, "none", 8);
  textBox(s, "企业事实源", 92, 205, 250, 28, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["ERP：订单与执行价", "MES：计划与产量", "Historian / DCS摘要：实际工况", "设备软件：压机健康", "热电 APC：公辅约束"], 92, 264, 245, 17, C.ink, 47);
  box(s, 430, 174, 380, 390, C.navy2, "none", 8);
  textBox(s, "氨智领航调控师", 465, 213, 310, 34, { fontSize: 27, bold: true, color: C.white, alignment: "center" });
  bulletList(s, ["事实表与质量码", "液氨平衡与方案比较", "条件门禁与回滚", "证据包与审计事件"], 480, 294, 280, 18, C.white, 53);
  box(s, 868, 174, 350, 390, C.mint, "none", 8);
  textBox(s, "协同与反馈", 902, 205, 280, 28, { fontSize: 23, bold: true, color: C.navy });
  bulletList(s, ["飞书卡片 / 审批 / Task", "Base 复盘与学习库", "MES 计划摘要", "实际回传后再算偏差", "异常时降级人工"], 902, 264, 270, 17, C.ink, 47);
  textBox(s, "只读数据 → 可解释建议 → 人工确认 → 计划与协同记录", 92, 598, 1090, 32, { fontSize: 22, bold: true, color: C.navy, alignment: "center" });
  textBox(s, "不存在 DCS / SIS 写入路径；数据过期、质量无效、关键字段缺失时停止新建议。", 92, 642, 1090, 22, { fontSize: 15, color: C.red, alignment: "center" });
  addNotes(s, "从ISA-95层级看，平台位于生产运行管理层。控制系统、SIS、APC和设备保护继续承担原职责。首期通过只读副本或DMZ网关取数，审批后只写计划摘要、交接说明和复盘记录。", ["docs/architecture.md", "https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard", "screenshots/13_接口字段与模型边界.png"]);
  track(13, "平台只读接入现有系统，保留控制层和岗位责任边界", "系统架构遵循一个简单原则：控制域只读出数，管理层形成建议，人和现行制度负责确认。平台接收ERP、MES、Historian、设备软件和热电APC的摘要，输出班次建议、飞书任务和MES计划摘要，但没有DCS或SIS写入路径。数据过期、质量无效、字段缺失或接近安全边界时，系统停止新建议并转人工。");
}

// 14. Roadmap and close
{
  const s = deck.slides.add();
  header(s, "30天先把账对上，60天证明可靠，90天再做受控验证", "落地计划", 14);
  await image(s, path.join(SHOTS, "11_三十六十九十天试点路线.png"), 62, 156, 780, 470, "contain");
  textBox(s, "建议企业给我们的第一步", 885, 176, 300, 58, { fontSize: 24, bold: true, color: C.navy });
  box(s, 885, 260, 300, 172, C.navy2, "none", 8);
  textBox(s, "选取一段历史班次", 910, 286, 250, 30, { fontSize: 21, bold: true, color: "#A9DCCF", alignment: "center" });
  textBox(s, "提供订单、MES计划\n罐区摘要和设备/公辅只读数据", 910, 337, 250, 66, { fontSize: 20, bold: true, color: C.white, alignment: "center" });
  box(s, 885, 458, 300, 112, C.mint, "none", 8);
  textBox(s, "我们交付", 910, 479, 250, 25, { fontSize: 18, bold: true, color: C.teal, alignment: "center" });
  textBox(s, "数据问题清单 + 同快照回放 + 验收证据包", 910, 517, 250, 40, { fontSize: 18, bold: true, color: C.navy, alignment: "center" });
  textBox(s, "目标不是先证明AI多强，而是先证明企业能够安全、清楚、可复核地使用。", 885, 596, 300, 50, { fontSize: 17, bold: true, color: C.ink, alignment: "center" });
  addNotes(s, "收束到可执行请求：先给一段企业批准的历史班次和四类只读数据，完成30天口径校核；再做60天同快照回放；只有通过安全、生产、设备和经营专业验收后，才进入90天小范围闭环。", ["screenshots/11_三十六十九十天试点路线.png", "docs/optimization-roadmap.md", "docs/finals-demo-evidence-qa.md"]);
  track(14, "30天先把账对上，60天证明可靠，90天再做受控验证", "我们的落地路径不从自动控制开始。30天先对字段、单位、时间戳和责任人；60天用历史班次做旁路回放，把平台建议和人工原计划同口径比较；90天只在企业批准的范围内串起确认、任务、实际回传和复盘。我们希望企业先提供一段历史班次和四类只读数据，用证据决定是否进入下一阶段。");
}

await fs.mkdir(OUT, { recursive: true });
await fs.mkdir(RENDER, { recursive: true });

for (const [index, slide] of deck.slides.items.entries()) {
  const png = await deck.export({ slide, format: "png", scale: 1 });
  await fs.writeFile(path.join(RENDER, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: "layout" });
  await fs.writeFile(path.join(RENDER, `slide-${String(index + 1).padStart(2, "0")}.layout.json`), await layout.text());
}

const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
await fs.writeFile(path.join(RENDER, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));

const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(FINAL);

const scriptText = [
  "# 氨智领航调控师逐页讲解稿",
  "",
  "> 建议总时长：12-14分钟。页面中的价格、负荷、库存、趋势和收益均为验收样例；平台不写DCS/SIS。",
  "",
  ...scripts.flatMap(item => [
    `## ${item.page}. ${item.title}`,
    "",
    item.talk,
    "",
  ]),
  "## 展示后最常见的追问",
  "",
  "1. **和DCS、MES有什么区别？** DCS/APC管装置内部控制，MES记录计划与实际；本平台负责跨装置、跨岗位、跨经营与生产信息的班次决策。",
  "2. **为什么不直接自动控制？** 化工生产必须保留联锁、操作票和岗位责任。首期只读旁路最容易验证，也最符合安全边界。",
  "3. **价格从哪里来？** 官方公开行情只作趋势参考，真正进入计算的是企业ERP、销售报价或采购结算版本，并由经营人员确认。",
  "4. **弱信号会不会误报？** 它只触发专业复核，不直接改变负荷；企业试点后再用真实标签评价提前量和误报率。",
  "5. **如何证明节约？** 只有建议被采纳、现场真实执行、实际结果回传并完成同口径反事实归因后，才统计收益。",
  "6. **飞书做到什么程度？** Base和普通Task已验证；自动卡片、审批状态机、事件回传和Aily需要企业应用授权后联调。",
  "7. **系统怎样学习？** 班后案例先补事实，再由专业审核；只把已审核案例做成学习卡，规则仍由企业人工发布和回滚。",
  "",
  "## 现场演示顺序",
  "",
  "`当班态势` → `联网读取官方参考` → `保供/产供销平衡` → `护机/稳产预警` → `执行复盘/飞书协同` → `影子运行` → `经验学习` → `30/60/90天路线`。",
  "",
];
await fs.writeFile(SCRIPT, scriptText.join("\n"), "utf8");

console.log(JSON.stringify({ pptx: FINAL, script: SCRIPT, render: RENDER, slides: deck.slides.items.length }, null, 2));
