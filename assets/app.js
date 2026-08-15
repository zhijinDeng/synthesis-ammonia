const state = {
  demand: 76,
  energy: 64,
  health: 82,
  inventory: 58,
  green: 34,
  ammoniaPrice: 2180,
  nitricTrend: -6,
  compressorDrift: 18
};

const uiState = {

  workspace: "overview",

  selectedRoute: "复合肥刚性订单",

  workflow: "draft",

  recommendationVersion: 1,

  generatedAt: new Date(),

  actualLoad: null,

  role: "dispatcher",

  marketConfirmed: false,

  confirmedMarket: { ammoniaPrice: 2180, nitricTrend: -6, version: 1, confirmedAt: new Date() },

  officialMarket: {
    status: "not_connected",
    fetchedAt: null,
    executionPriceStatus: "待ERP/经营确认",
    sources: [
      { id: "nbs_production_materials", name: "国家统计局", products: ["尿素", "复合肥"], refresh: "旬度", status: "待联网", message: "官方批发参考" },
      { id: "czce_market_data", name: "郑州商品交易所", products: ["尿素UR", "纯碱SA"], refresh: "盘中/日终", status: "需行情授权", message: "期货趋势参考" },
      { id: "mofcom_commodity_price", name: "商务部商品价格网", products: ["液氨行业参考"], refresh: "周期性资料", status: "已登记", message: "行业交叉验证" },
      { id: "yuntu_erp_business_price", name: "云图ERP/经营系统", products: ["液氨", "硝酸", "下游产品"], refresh: "订单/结算触发", status: "待企业接口", message: "调度执行主价" }
    ],
    references: [],
    note: "官方参考与企业执行价分层；未确认的外部价格不进入调度建议。"
  },

  incidentStatus: {},

  activeIncident: null,

  actionAcks: {}

};

function activeMarket() {
  return uiState.confirmedMarket;
}

const MARKET_GATEWAY_URL = "http://127.0.0.1:4174/api/market/snapshot";

function escapeMarketText(value) {
  return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function marketTime(value) {
  if (!value) return "未更新";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
}

function renderOfficialMarket() {
  const grid = document.getElementById("marketSourceGrid");
  const note = document.getElementById("marketSyncNote");
  if (!grid || !note) return;
  const snapshot = uiState.officialMarket;
  grid.innerHTML = snapshot.sources.map(source => {
    const statusClass = source.status === "已更新" ? "good" : source.status === "网络不可用" || source.status === "网关未启动" ? "warn" : "neutral";
    return `<article class="market-source-card ${statusClass}"><div class="market-source-head"><b>${escapeMarketText(source.name)}</b><span>${escapeMarketText(source.status)}</span></div><small>${escapeMarketText((source.products || []).join(" / "))} · ${escapeMarketText(source.refresh)}</small><p>${escapeMarketText(source.message || source.role || "")}</p></article>`;
  }).join("");
  const references = (snapshot.references || []).map(item => `${item.product} ${item.value}${item.unit}`).join("；");
  note.textContent = `${snapshot.note || ""}${snapshot.fetchedAt ? ` 最近核验 ${marketTime(snapshot.fetchedAt)}。` : ""}${references ? ` 官方参考：${references}。` : ""}`;
}

async function syncOfficialMarket() {
  const button = document.getElementById("syncOfficialMarket");
  if (button) {
    button.disabled = true;
    button.textContent = "正在读取官方参考...";
  }
  uiState.officialMarket = { ...uiState.officialMarket, status: "syncing", note: "正在读取登记的官方公开源；不会改变液氨执行价格。" };
  renderOfficialMarket();
  try {
    const response = await fetch(MARKET_GATEWAY_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`行情网关 HTTP ${response.status}`);
    uiState.officialMarket = await response.json();
    events.unshift({ title: "官方行情参考已核验", body: `${uiState.officialMarket.executionPriceStatus}；外部参考不自动写入调度建议。` });
  } catch (error) {
    uiState.officialMarket = { ...uiState.officialMarket, status: "gateway_unavailable", sources: uiState.officialMarket.sources.map(source => source.status === "待联网" ? { ...source, status: "网关未启动", message: "请启动本地行情网关，或由企业部署后台适配服务" } : source), note: `官方参考未更新：${error.message}。沿用上一有效版本，液氨执行价仍需经营确认。` };
    events.unshift({ title: "官方行情未更新", body: uiState.officialMarket.note });
  }
  if (events.length > 6) events.pop();
  if (button) {
    button.disabled = false;
    button.textContent = "联网读取官方参考";
  }
  render();
}

function hardTrigger() {
  if (state.compressorDrift > 60) return "压缩机趋势证据触发设备专业复核";
  if (state.health < 62) return "关键设备健康触发护机复核";
  return "";
}

function safetyStopReason() {
  if (state.compressorDrift >= 85) return "压缩机多变量趋势达到演练停算线";
  if (state.health <= 48) return "关键设备健康输入达到演练停算线";
  return "";
}

function requiresSpecialist(plan) {
  return Boolean(professionalReviewReason());
}

function professionalReviewReason() {
  if (hardTrigger()) return hardTrigger();
  if (state.energy > 88) return "公辅约束触发热电专业复核";
  if (state.inventory < 40) return "液氨库存触发罐区与调度主管复核";
  return "";
}

function evidenceCompleteness() {
  return uiState.marketConfirmed ? 8 : 7;
}

const workflowLabels = {

  draft: "待班长确认",

  pending: "审批草稿待提交",

  approved: "班长已确认（演示）",

  tracking: "执行跟踪中（演示）",

  reviewed: "班末已复盘（演示）"

};

const presets = {
  steady: { demand: 70, energy: 56, health: 84, inventory: 62, green: 38, ammoniaPrice: 2080, nitricTrend: 1, compressorDrift: 12 },
  supply: { demand: 94, energy: 68, health: 80, inventory: 42, green: 30, ammoniaPrice: 2280, nitricTrend: -5, compressorDrift: 20 },
  protect: { demand: 66, energy: 52, health: 56, inventory: 64, green: 36, ammoniaPrice: 2140, nitricTrend: 2, compressorDrift: 72 },
  energy: { demand: 74, energy: 88, health: 80, inventory: 60, green: 58, ammoniaPrice: 2200, nitricTrend: -3, compressorDrift: 24 }
};

const events = [];
const colors = {
  synth: "#246f9e",
  storage: "#2f9e67",
  downstream: "#d89a27",
  maintenance: "#c94d4d"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calc() {

  const market = activeMarket();
  const weakSignalPenalty = state.compressorDrift > 60 ? 8 : state.compressorDrift > 35 ? 3 : 0;
  const loadUpper = state.health < 62 || state.compressorDrift > 70 ? 76 : 94;
  const load = clamp(
    56 + state.demand * 0.34 - state.energy * 0.12 + state.health * 0.18 - Math.max(0, 50 - state.inventory) * 0.26 - weakSignalPenalty,
    state.health < 62 ? 50 : 60,
    loadUpper
  );
  const risk = clamp(13 + (100 - state.health) * 0.38 + state.compressorDrift * 0.29 + Math.max(0, 45 - state.inventory) * 0.55 + state.energy * 0.12 - state.green * 0.06, 8, 95);
  const order = clamp(62 + state.demand * 0.28 + load * 0.16 - risk * 0.08, 50, 98);
  const energyGain = clamp(2 + (100 - state.energy) * 0.04 + state.green * 0.08 + Math.max(0, 86 - load) * 0.04, 1, 14);
  const stock = clamp(state.inventory + load * 0.14 - state.demand * 0.09, 24, 96);
  const priceLift = (market.ammoniaPrice - 2000) / 180;
  const margin = clamp(1.0 + order * 0.06 + priceLift + energyGain * 0.24 - state.energy * 0.035 - risk * 0.02, -4, 15);
  return {
    load: Math.round(load),
    risk: Math.round(risk),
    order: Math.round(order),
    energyGain: Math.round(energyGain),
    stock: Math.round(stock),
    margin: margin.toFixed(1),
    nh3: Math.round(1950 * load / 100)
  };
}

function strategy(plan) {

  const market = activeMarket();
  if (safetyStopReason()) {
    return {
      mode: "安全闸门锁定",
      title: "停止生成新的负荷目标，维持最近批准方案并按现场规程处置",
      text: `${safetyStopReason()}。当前仅保留事实快照、测点复核和岗位通知，不显示经济排序，不生成审批或跨装置动作。演练停算线需由企业设备、工艺和安环专业联合标定。`
    };
  }
  if (feasibilityIssues(plan).length) {
    return {
      mode: "规则方案不可行",
      title: "当前输入下没有通过物料平衡门禁的可执行方案",
      text: `${feasibilityIssues(plan).join("；")}。请调整合成负荷、下游分配、外售或外采条件后重算；不可行方案不能进入审批和动作派发。`
    };
  }
  if (state.health < 62 || state.compressorDrift > 60) {
    return {
      mode: "护机稳产",
      title: "压缩负荷上限，优先保护循环压缩机与合成塔温升边界",
      text: `设备健康 ${state.health}、压机趋势证据 ${state.compressorDrift}，建议合成回路控制在 ${plan.load}% 左右，先复核振动、轴位移和喘振裕度，再决定是否继续降负荷。`
    };
  }
  if (state.demand > 86 && state.inventory < 55) {
    return {
      mode: "保供补氨",
      title: "提高合成负荷补液氨库存，优先兑现尿素溶液与复合肥用氨",
      text: `下游订单压力高且库存偏紧，目标负荷 ${plan.load}%，按边际贡献和固定成本吸收排序液氨去向，白班优先保障高贡献订单。`
    };
  }
  if (state.energy > 80) {
    return {
      mode: "能源错峰",
      title: "避开高价蒸汽/电力窗口，用低价时段补回安全库存",
      text: `能源成本处于高位，建议高价窗口压低边际产量，低价窗口补回液氨安全库存，保持下游刚性交付。`
    };
  }
  return {
    mode: "稳氨优化",
    title: "稳定合成回路负荷，平衡液氨库存与下游消纳",
    text: `${uiState.marketConfirmed ? "本轮运营样例已确认" : "沿用上一有效行情"} V${market.version}：液氨 ${market.ammoniaPrice} 元/吨、硝酸趋势 ${market.nitricTrend}%；建议目标负荷 ${plan.load}%，重点跟踪下游分配、氢氮比、床层温升和压机趋势。`
  };
}

function scenarios(plan) {
  const steady = { id: "稳氨", load: clamp(plan.load - 2, 58, 90), risk: plan.risk - 4, margin: Number(plan.margin) - 0.4, body: "保持合成回路平稳，减少频繁升降负荷带来的能耗和设备扰动。" };
  const supply = { id: "保供", load: clamp(plan.load + 5, 62, state.health < 62 ? 76 : 95), risk: plan.risk + 7, margin: Number(plan.margin) + 0.6, body: "优先保障边际贡献更高、能吸收固定成本或承担战略订单的下游用氨，液氨外售降为弹性池。" };
  const protect = { id: "护机", load: clamp(plan.load - 9, 50, 82), risk: plan.risk - 12, margin: Number(plan.margin) - 1.1, body: "为压缩机、换热器、合成塔留出检查窗口，降低非计划停车风险。" };
  const list = [steady, supply, protect].map(item => ({
    ...item,
    risk: Math.round(clamp(item.risk, 5, 95)),
    margin: item.margin.toFixed(1)
  }));
  const best = state.health < 62 ? "护机" : state.demand > 86 && state.inventory < 55 ? "保供" : "稳氨";
  return { best, list };
}

function constraints(plan) {
  return [
    { title: "安全与可行性门禁", body: decisionBlockReason(plan) ? `${decisionBlockReason(plan)}；停止输出新目标，转人工处置或重算。` : "安全停算线和24小时物料平衡门禁均已通过；现场边界仍以企业系统为准。", level: decisionBlockReason(plan) ? "danger" : "good" },
    { title: "循环压缩机趋势", body: state.health < 68 || state.compressorDrift > 35 ? `健康 ${state.health}、趋势证据 ${state.compressorDrift}；限制升负荷速率并插入点检窗口。` : "验收样例未触发复核线；现场结论仍以设备系统和人员确认为准。", level: state.health < 68 || state.compressorDrift > 35 ? "warn" : "good" },
    { title: "液氨库存", body: state.inventory < 48 ? "库存偏紧，冻结弹性外售并优先补安全库存。" : "库存支持下游消纳和短时错峰。", level: state.inventory < 48 ? "warn" : "good" },
    { title: "能源窗口", body: state.energy > 80 ? "高价窗口触发错峰策略，需核对蒸汽和电力口径。" : "能源成本允许维持经济负荷。", level: state.energy > 80 ? "warn" : "good" },
    { title: "证据完整度", body: `${evidenceCompleteness()}/8 项验收字段可用。${uiState.marketConfirmed ? "行情已由运营样例确认。" : "行情待运营核价，计算沿用上一有效版本。"}`, level: uiState.marketConfirmed ? "good" : "warn" }
  ];
}

function interfaceMap(plan) {
  return [
    { title: "DCS historian", body: "读取负荷、温度、压力、流量、电耗、蒸汽和关键约束余量；不直接写控制参数。", tag: "5-15分钟聚合" },
    { title: "APC/MPC", body: `把班次目标负荷 ${plan.load}% 转为连续负荷建议、升降速率限制和约束余量说明。`, tag: "控制层只读对话" },
    { title: "RTO", body: "以液氨外售为机会成本基准，叠加固定成本吸收、能源窗口、库存占用和订单延期成本形成经济目标。", tag: "经济优化" },
    { title: "MES/ERP", body: "审批通过后写计划摘要、订单优先级、交接说明和复盘结果。", tag: "管理层闭环" }
  ];
}

function models(plan) {
  return [
    { title: "机理边界", body: "氢氮比、合成塔温升、循环气量、罐区压力和最低稳定负荷作为硬约束。", tag: "先守边界" },
    { title: "反应器候选校准", body: "PINN仅作为候选方法；须用企业历史工况、热力学守恒和留出班次验证后，才能参与影子计算。", tag: "尚未企业校准" },
    { title: "设备趋势证据样例", body: state.health < 68 || state.compressorDrift > 35 ? "多变量趋势出现同向偏离，护机方案优先级上升；先检查、再判断、后调整。" : "样例趋势未触发复核线，待企业历史数据验证。", tag: `健康 ${state.health} / 趋势证据 ${state.compressorDrift}` },
    { title: "漂移与回滚", body: "数据超时、字段缺失、执行偏差或现场拒绝时，建议自动失效并回到人工调度。", tag: `证据完整度 ${evidenceCompleteness()}/8` }
  ];
}

function schedule(plan) {
  const highDemand = state.demand > 86;
  const lowHealth = state.health < 62;
  const highEnergy = state.energy > 80;
  return [
    { label: "合成", bars: [
      { text: `${plan.load}% 目标负荷`, start: 0, width: highEnergy ? 42 : 58, type: "synth" },
      { text: highEnergy ? "低价窗口补产" : "小幅微调", start: highEnergy ? 63 : 62, width: highEnergy ? 29 : 28, type: "synth" }
    ] },
    { label: "罐区", bars: [
      { text: "补安全库存", start: 8, width: highDemand ? 50 : 34, type: "storage" },
      { text: "外售弹性", start: 70, width: 20, type: "storage" }
    ] },
    { label: "下游", bars: [
      { text: highDemand ? "尿素/复合肥优先" : "复合肥/联碱平衡", start: 15, width: highDemand ? 45 : 37, type: "downstream" },
      { text: "包装物流窗口", start: 62, width: 28, type: "downstream" }
    ] },
    { label: "设备", bars: [
      { text: lowHealth ? "强制点检" : "在线巡检", start: lowHealth ? 44 : 38, width: lowHealth ? 22 : 14, type: "maintenance" }
    ] }
  ];
}

function dispatchActions(plan) {
  const balance = massBalance(plan);
  const nitric = enterpriseAllocationRows(plan).find(row => row.name === "硝酸");
  const direction = plan.load > 86 ? "升" : plan.load < 86 ? "降" : "稳";
  return [
    {
      id: "synthesis-loop",
      unit: "合成回路",
      current: "班次基线 86%",
      target: `${direction}至 ${plan.load}%`,
      cadence: plan.load === 86 ? "维持并15分钟复核" : `每10分钟不超过1pct，${Math.abs(plan.load - 86) * 10}分钟复核`,
      owner: "合成主操",
      guard: "氢氮比、床层温升、压机余量均在操作边界内"
    },
    {
      id: "nitric-unit",
      unit: "硝酸装置",
      current: `需求/负荷样例 ${nitric.demand}`,
      target: nitric.action === "降" ? "降负荷并释放液氨" : "维持经济负荷",
      cadence: nitric.action === "降" ? "30分钟内分两步复核" : "本班维持",
      owner: "硝酸主操",
      guard: "最低稳定负荷、吸收系统和下游库存已确认"
    },
    {
      id: "tank-allocation",
      unit: "罐区与液氨去向",
      current: `期初 ${balance.opening}t`,
      target: `24h期末测算 ${Math.round(balance.ending)}t`,
      cadence: "每小时核量，订单变化即重算",
      owner: "生产调度",
      guard: `运营行情V${activeMarket().version}、订单和罐区可用量完成核对`
    },
    {
      id: "utility-balance",
      unit: "热电与公辅",
      current: `能源指数 ${state.energy}`,
      target: state.energy > 80 ? "锁定高价窗口负荷上限" : "匹配合成负荷并保留余量",
      cadence: state.energy > 80 ? "30分钟内确认错峰窗口" : "每小时复核一次",
      owner: "公辅调度",
      guard: "蒸汽母管、电力、循环水及气轮机驱动余量已确认"
    }
  ];
}

function actionReceiptCount(plan) {
  const rows = dispatchActions(plan);
  return rows.filter(row => uiState.actionAcks[row.id]).length;
}

function exportEvidencePackage(plan, text) {
  const now = new Date();
  const blocked = decisionBlockReason(plan);
  const safetyReason = safetyStopReason();
  const actions = dispatchActions(plan);
  const packageData = {
    package_version: "ammonia-dispatch-evidence-v1",
    exported_at: now.toISOString(),
    environment: "acceptance_demo",
    source_mode: "scenario_sample",
    shift_id: "NH3-20260804-D",
    recommendation_id: `NH3-D01-${String(uiState.recommendationVersion).padStart(3, "0")}`,
    workflow: uiState.workflow,
    execution_status: blocked ? "blocked" : uiState.workflow,
    input_snapshot: {
      state: { ...state },
      selected_route: uiState.selectedRoute,
      generated_at: uiState.generatedAt.toISOString(),
      execution_price: { ...activeMarket() },
      official_references: uiState.officialMarket
    },
    source_lineage: {
      execution_price: "uiState.confirmedMarket; enterprise ERP/经营确认 required",
      public_references: "uiState.officialMarket.sources",
      scenario_inputs: "local interactive sample; replace with approved read-only facts in pilot"
    },
    decision: {
      mode: text.mode,
      title: text.title,
      rationale: text.text,
      target_load_percent: plan.load,
      recommendation_version: uiState.recommendationVersion,
      rule_version: "dispatch-rules-v3",
      safety_gate: { passed: !safetyReason, reason: safetyReason || "passed" },
      feasibility_gate: { passed: !blocked, reason: blocked || "passed" },
      professional_review: professionalReviewReason() || "none",
      approval_path: requiresSpecialist(plan) ? "班长确认 -> 相关专业/调度主管会签" : "班长确认"
    },
    material_balance: massBalance(plan),
    action_sheet: actions,
    execution: {
      acknowledged: actionReceiptCount(plan),
      total: actions.length,
      ack_state: { ...uiState.actionAcks },
      actual_load_percent: uiState.actualLoad,
      historian_status: "not_connected_demo"
    },
    feishu_handover: {
      card: "draft_only",
      approval: "draft_only",
      task: "create_after_approval",
      bitable: "local_export_only",
      write_boundary: "No DCS/SIS write; enterprise deployment writes MES plan summary and Feishu review record only after approval."
    },
    evidence: {
      completeness: `${evidenceCompleteness()}/8`,
      required: ["input_snapshot", "decision_gates", "material_balance", "action_sheet", "ack_state", "source_lineage"],
      actual_value_policy: "Actual load, inventory, energy and benefit remain empty until Historian or an approved enterprise fact source returns them."
    },
    audit: {
      generated_at: now.toISOString(),
      event_tail: events.slice(0, 6),
      no_dcs_sis_write: true
    }
  };
  const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ammonia-dispatch-evidence-${now.toISOString().replace(/[.:]/g, "-")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderDispatchActions(plan) {
  const rows = dispatchActions(plan);
  if (decisionBlockReason(plan)) {
    document.getElementById("actionReceiptState").textContent = safetyStopReason() ? "安全闸门锁定" : "可行性门禁未通过";
    document.getElementById("actionSheet").innerHTML = `<tr><td colspan="7"><b>不生成跨装置动作单</b><br>${decisionBlockReason(plan)}。${safetyStopReason() ? "维持最近批准方案并转现场规程。" : "调整负荷、去向或外采条件后重新计算。"}</td></tr>`;
    return;
  }
  const canAcknowledge = ["approved", "tracking", "reviewed"].includes(uiState.workflow);
  const acknowledged = actionReceiptCount(plan);
  document.getElementById("actionReceiptState").textContent = canAcknowledge
    ? `${acknowledged}/${rows.length}项已接令`
    : "待方案确认";
  document.getElementById("actionSheet").innerHTML = rows.map(row => {
    const checked = Boolean(uiState.actionAcks[row.id]);
    return `<tr class="${checked ? "acknowledged" : ""}">
      <td><b>${row.unit}</b></td><td>${row.current}</td><td>${row.target}</td><td>${row.cadence}</td><td>${row.owner}</td><td>${row.guard}</td>
      <td><label class="action-receipt"><input type="checkbox" data-action-ack="${row.id}" ${checked ? "checked" : ""} ${canAcknowledge ? "" : "disabled"} /><span>${checked ? "已接令" : "待接令"}</span></label></td>
    </tr>`;
  }).join("");
}

function benefitTrace(plan) {

  const contributionWan = massBalance(plan).contributionWan;
  return [
    { title: "原计划贡献", body: "待企业导入调度员原计划，作为同一行情、同一订单、同一设备边界下的对照基线。", level: "warn" },
    { title: "本方案分配贡献", body: `按产品净收入、非氨变动成本、物流、液氨外售机会成本和启停摊销逐项复算；当前验收样例为 ${contributionWan.toFixed(1)} 万元/24h，比较基准为液氨净外售。`, level: "good" },
    { title: "可归因收益", body: `待方案被采纳、Historian 回传并完成班末复盘后，再与原计划比较；当前数值不是平台创效。能耗变化 ${plan.energyGain}% 仅为演练指标。`, level: "warn" },
    { title: "售价低于完全成本", body: "若仍有正边际贡献、能带走固定成本或维持战略订单，可继续开；若占用稀缺液氨且贡献为负，则触发降负荷/停产评估。", level: "warn" },
    { title: "外部因素剔除", body: "检修、物流异常、订单临时取消和行情自然上涨单独标记，不进入系统收益。", level: "warn" }
  ];
}

function allocationRows(plan) {
  const scarce = state.inventory < 50 || state.demand > 86;

  const market = activeMarket();
  const externalMargin = 0;
  const nitricMargin = Math.round(180 + market.nitricTrend * 18 - state.energy * 0.8);
  const rows = [
    { name: "复合肥刚性订单", demand: `${Math.round(72 + state.demand * 0.22)}%`, margin: Math.round(420 + state.demand * 1.3), restart: "连续消纳 / 客户交期", action: "保", why: "订单与产业链协同" },
    { name: "尿素溶液", demand: `${Math.round(68 + state.demand * 0.18)}%`, margin: Math.round(330 + state.demand), restart: "稳定消纳 / 降负荷受限", action: "保", why: "稳定主流程" },
    { name: "纯碱配套", demand: `${Math.round(60 + state.demand * 0.16)}%`, margin: Math.round(255 + state.demand * 0.7), restart: "联碱联动 / 6-10h", action: scarce ? "稳" : "保", why: "跨装置平衡" },
    { name: "硝酸", demand: `${Math.round(64 + market.nitricTrend)}%`, margin: nitricMargin, restart: "降负荷优先 / 4-8h", action: nitricMargin < 80 ? "降" : "稳", why: market.nitricTrend < 0 ? "行情走弱" : "分配贡献尚可" },
    { name: "液氨外售", demand: `${market.ammoniaPrice}元/t`, margin: externalMargin, restart: "弹性池 / 无启停", action: scarce ? "限" : "保", why: "分配比较基准" },
    { name: "外采液氨", demand: `${market.ammoniaPrice + 80}元/t`, margin: -(market.ammoniaPrice + 80), restart: "物流与到货风险", action: state.inventory < 38 && state.demand > 88 ? "询价" : "不采", why: "补缺采购成本，不参与去向收益排名" }
  ];
  return rows.sort((a, b) => b.margin - a.margin);
}

function enterpriseAllocationRows(plan) {

  const scarce = state.inventory < 50 || state.demand > 86;

  const market = activeMarket();

  const opportunityCost = market.ammoniaPrice - 45;

  const rows = [

    {
      name: "复合肥刚性订单",
      demand: `${Math.round(72 + state.demand * 0.22)}%`,
      tons: Math.round(430 + state.demand * 1.2),
      margin: Math.round(3200 + state.demand * 2 - 400 - 90 - opportunityCost - 160),
      restart: "连续消纳 / 客户交期",
      action: "保",
      why: "先保刚性订单与违约风险",
      ledger: [3200 + state.demand * 2, -400, -90, -opportunityCost, -160, 0]
    },

    {
      name: "尿素溶液",
      demand: `${Math.round(68 + state.demand * 0.18)}%`,
      tons: Math.round(570 + state.demand * 1.4),
      margin: Math.round(3000 + state.demand - 360 - 70 - opportunityCost - 60),
      restart: "稳定消纳 / 降负荷受限",
      action: "保",
      why: "维持主流程连续和稳定消纳",
      ledger: [3000 + state.demand, -360, -70, -opportunityCost, -60, 0]
    },

    {
      name: "纯碱配套",
      demand: `${Math.round(60 + state.demand * 0.16)}%`,
      tons: Math.round(360 + state.demand * 0.8),
      margin: Math.round(2840 + state.demand * 0.7 - 300 - 55 - opportunityCost - 50),
      restart: "联碱联动 / 6-10h",
      action: scarce ? "稳" : "保",
      why: "兼顾跨装置连续与库存边界",
      ledger: [2840 + state.demand * 0.7, -300, -55, -opportunityCost, -50, 0]
    },

    {
      name: "硝酸",
      demand: `${Math.round(64 + market.nitricTrend)}%`,
      tons: Math.max(180, Math.round(330 + market.nitricTrend * 3)),
      margin: Math.round(2750 + market.nitricTrend * 18 - 310 - 45 - opportunityCost - 86),
      restart: "降负荷优先 / 4-8h",
      action: market.nitricTrend < 0 ? "降" : "稳",
      why: market.nitricTrend < 0 ? "行情走弱，释放液氨给高贡献去向" : "分配贡献仍为正",
      ledger: [2750 + market.nitricTrend * 18, -310, -45, -opportunityCost, -86, 0]
    },

    {
      name: "液氨外售",
      demand: `${market.ammoniaPrice}元/t`,
      tons: scarce ? 60 : Math.round(140 + (market.ammoniaPrice - 2000) * 0.25),
      margin: 0,
      restart: "弹性池 / 无启停",
      action: scarce ? "限" : "保",
      why: "作为跨产品机会成本基准",
      ledger: [market.ammoniaPrice, 0, -45, -opportunityCost, 0, 0]
    },

    {
      name: "外采液氨",
      demand: `${market.ammoniaPrice + 80}元/t`,
      tons: state.inventory < 38 && state.demand > 88 ? 180 : 0,
      margin: -(market.ammoniaPrice + 80),
      restart: "物流与到货风险",
      action: state.inventory < 38 && state.demand > 88 ? "询价" : "不采",
      why: "仅用于覆盖刚性订单缺口",
      ledger: [0, -(market.ammoniaPrice + 80), 0, 0, 0, 0]
    }

  ];

  return rows.sort((a, b) => b.margin - a.margin);

}

function massBalance(plan) {

  const rows = enterpriseAllocationRows(plan);

  const purchase = rows.find(row => row.name === "外采液氨").tons;

  const allocation = rows.filter(row => row.name !== "外采液氨").reduce((sum, row) => sum + row.tons, 0);

  const opening = Math.round(400 + state.inventory * 16.5);

  const floor = 780;

  const ceiling = 2600;

  const ending = opening + plan.nh3 + purchase - allocation;

  const netDraw = allocation - plan.nh3 - purchase;

  const hoursToFloor = netDraw > 0 ? Math.max(0, Math.round((opening - floor) / netDraw * 24)) : null;

  const contributionWan = rows
    .filter(row => row.name !== "外采液氨")
    .reduce((sum, row) => sum + row.margin * row.tons, 0) / 10000;

  return { rows, purchase, allocation, opening, floor, ceiling, ending, hoursToFloor, contributionWan };

}

function feasibilityIssues(plan) {
  const balance = massBalance(plan);
  const issues = [];
  if (balance.ending < balance.floor) issues.push(`24小时期末可用量 ${Math.round(balance.ending)}t 低于安全下限 ${balance.floor}t`);
  if (balance.ending > balance.ceiling) issues.push(`24小时期末可用量 ${Math.round(balance.ending)}t 高于罐区样例上限 ${balance.ceiling}t`);
  return issues;
}

function decisionBlockReason(plan) {
  if (safetyStopReason()) return safetyStopReason();
  return feasibilityIssues(plan).join("；");
}

function eventQueue(plan) {
  const events = [];
  if (state.inventory < 52 || state.demand > 86) {
    events.push({ id: "allocation-gap", level: "p1", source: "MES / 罐区", title: "液氨可分配量趋紧", body: `库存 ${state.inventory}%、订单压力 ${state.demand}；需在复合肥、尿素溶液、纯碱、硝酸和外售间重排。`, impact: "影响未来8小时", deadline: "30分钟内", owner: "调度长", action: "处置", facts: [`库存水位 ${state.inventory}%`, `订单压力 ${state.demand}`, `行情版本 V${activeMarket().version}`], checklist: ["核对罐区可用量与不可用底量", "核对刚性订单、在途与违约影响", "确认硝酸、外售等弹性去向"] });
  } else {
    events.push({ id: "allocation-review", level: "p2", source: "ERP / MES", title: "下游消纳结构可复核", body: `液氨库存 ${state.inventory}%，可按单位液氨分配贡献微调去向，不改变主流程节奏。`, impact: `样例分配贡献 ${massBalance(plan).contributionWan.toFixed(1)}万元/24h`, deadline: "本班内", owner: "生产调度", action: "处置", facts: [`库存水位 ${state.inventory}%`, `证据完整度 ${evidenceCompleteness()}/8`, "原计划基线待导入"], checklist: ["核对订单交期与最低接收量", "核对液氨外售净值口径", "保留调度员原计划作为对照"] });
  }
  if (state.compressorDrift > 35 || state.health < 68) {
    events.push({ id: "compressor-trend", level: "p1", source: "SMC / 机组", title: "循环压缩机趋势需复核", body: `趋势证据 ${state.compressorDrift}、健康 ${state.health}；先查振动、轴位移、入口条件和喘振裕度。`, impact: "可能限制升负荷或转护机方案", deadline: state.compressorDrift > 60 ? "10分钟内" : "30分钟内", owner: "设备工程师", action: "处置", facts: [`趋势证据 ${state.compressorDrift}`, `设备健康 ${state.health}`, hardTrigger() || "未触发强制会签线"], checklist: ["调取原始趋势并排除测点故障", "核对振动、轴位移和止推温度", "核对入口温压与防喘振裕度", "设备专业给出处置意见"] });
  } else {
    events.push({ id: "compressor-watch", level: "p3", source: "SMC / 机组", title: "关键机组趋势观察", body: `趋势证据 ${state.compressorDrift}，验收样例未越关注线；继续观察多变量是否同向漂移。`, impact: "不形成即时负荷限制", deadline: "下轮重算", owner: "设备值班", action: "查看", facts: [`趋势证据 ${state.compressorDrift}`, "待接企业 SMC/DCS 历史趋势", "当前为验收样例"], checklist: ["确认测点在线", "记录下一观察时间", "出现同向漂移时转设备复核"] });
  }
  events.push({ id: "utility-window", level: state.energy > 80 ? "p1" : "p2", source: "热电 APC", title: state.energy > 80 ? "高价能源窗口临近" : "公辅供给处于可调区", body: state.energy > 80 ? "建议压低边际产量，低价窗口补回库存，避免频繁升降负荷。" : "蒸汽、电力和循环水余量支持当前方案。", impact: state.energy > 80 ? "未来4小时成本上升" : `演练节能指标 ${plan.energyGain}%`, deadline: state.energy > 80 ? "30分钟内" : "本班内", owner: "公辅调度", action: "处置", facts: [`能源指数 ${state.energy}`, `低碳能源可用 ${state.green}`, "待接热电 APC 约束摘要"], checklist: ["核对蒸汽母管和电力窗口", "确认下游不可中断负荷", "比较错峰与启停损失"] });
  return events.sort((a, b) => a.level.localeCompare(b.level));
}

function renderEventQueue(plan) {
  const items = eventQueue(plan);
  document.getElementById("eventQueueCount").textContent = `${items.filter(item => item.level !== "p3").length}项待处置`;
  document.getElementById("eventQueue").innerHTML = items.map((item, index) => `
    <article class="${item.level}">
      <div><em>${item.level.toUpperCase()}</em><span>${item.source} · ${uiState.incidentStatus[item.id] || "待确认"}</span></div>
      <b>${item.title}</b><p>${item.body}</p>
      <footer><span>${item.impact} · ${item.deadline}</span><span>责任：${item.owner}</span><button type="button" data-event-index="${index}">${item.action}</button></footer>
    </article>
  `).join("");
}

function renderAllocation(plan) {
  document.getElementById("allocationTable").innerHTML = allocationRows(plan).map(row => `
    <tr><td><b>${row.name}</b></td><td>${row.demand}</td><td class="${row.margin < 0 ? "negative" : "positive"}">${row.margin > 0 ? "+" : ""}${row.margin} 元/t-NH3</td><td>${row.restart}</td><td><span class="decision-pill ${row.action === "降" || row.action === "限" || row.action === "不采" ? "warn" : "good"}">${row.action}</span></td><td>${row.why}</td></tr>
  `).join("");
}

function renderEnterpriseAllocation(plan) {
  if (safetyStopReason()) {
    document.getElementById("allocationTable").innerHTML = `<tr><td colspan="7"><b>经济排序已冻结</b><br>${safetyStopReason()}。当前仅显示事实快照并转专业处置。</td></tr>`;
    return;
  }

  document.getElementById("allocationTable").innerHTML = enterpriseAllocationRows(plan).map(row => `
    <tr data-route="${row.name}"><td><b>${row.name}</b></td><td>${row.demand}</td><td>${row.tons.toLocaleString()}t</td><td class="${row.margin < 0 ? "negative" : "positive"}">${row.margin > 0 ? "+" : ""}${row.margin} 元/t-NH3</td><td>${row.restart}</td><td><span class="decision-pill ${row.action === "降" || row.action === "限" || row.action === "不采" ? "warn" : "good"}">${row.action}</span></td><td>${row.why}</td></tr>
  `).join("");

}

function renderMassBalance(plan) {

  const balance = massBalance(plan);
  if (safetyStopReason()) {
    document.getElementById("balanceState").textContent = "停止滚动测算";
    document.getElementById("massBalance").innerHTML = [
      ["期初可用量", `${balance.opening.toLocaleString()}t`, "罐区验收样例"],
      ["最近批准方案", "--", "待MES读取"],
      ["当前实际产氨", "--", "待Historian回传"],
      ["当前实际分配", "--", "待MES/罐区回传"],
      ["安全库存下限", `${balance.floor}t`, "企业校准前样例"]
    ].map(card => `<article><span>${card[0]}</span><strong>${card[1]}</strong><small>${card[2]}</small></article>`).join("");
    document.getElementById("inventoryBand").style.left = `${clamp((balance.opening - balance.floor) / (balance.ceiling - balance.floor) * 100, 0, 100)}%`;
    document.getElementById("balanceNote").textContent = `${safetyStopReason()}；不使用当前输入继续推演24小时产量与分配，待专业复核后从最近批准方案恢复。`;
    return;
  }

  const cards = [
    ["期初可用量", balance.opening, "罐区可调库存"],
    ["预计产氨", plan.nh3, "24小时建议负荷"],
    ["外采到货", balance.purchase, balance.purchase ? "询价预留" : "当前不外采"],
    ["计划分配", balance.allocation, "五个消纳去向（流出项）"],
    ["期末可用量", balance.ending, `安全下限 ${balance.floor}t`]
  ];

  document.getElementById("massBalance").innerHTML = cards.map(([label, value, note]) => `
    <article><span>${label}</span><strong class="${value < 0 ? "negative" : ""}">${value > 0 && label === "外采到货" ? "+" : ""}${value.toLocaleString()}t</strong><small>${note}</small></article>
  `).join("");

  const headroom = balance.ending - balance.floor;

  document.getElementById("balanceState").textContent = headroom >= 0 ? `安全余量 +${Math.round(headroom)}t` : `缺口 ${Math.abs(Math.round(headroom))}t`;

  document.getElementById("balanceState").className = headroom >= 0 ? "positive" : "negative";

  document.getElementById("inventoryBand").style.left = `${clamp((balance.ending - balance.floor) / (balance.ceiling - balance.floor) * 100, 0, 100)}%`;

  document.getElementById("balanceNote").textContent = balance.hoursToFloor === null
    ? "按当前方案，24小时内库存不向安全下限收缩；正式接入后按罐容、不可用底量和产品纯度修正。"
    : `按当前净消耗速度，约 ${balance.hoursToFloor} 小时触及安全下限；建议在有效期内复核订单、罐存与实际负荷。`;

}

function renderEconomicLedger(plan) {
  if (safetyStopReason()) {
    document.getElementById("ledgerRouteTabs").innerHTML = "";
    document.getElementById("economicLedger").innerHTML = `<article class="ledger-total"><span>安全优先</span><strong>停算</strong><small>硬禁止状态不展示经济排序</small></article>`;
    return;
  }

  const rows = enterpriseAllocationRows(plan).filter(row => row.name !== "外采液氨");

  if (!rows.some(row => row.name === uiState.selectedRoute)) uiState.selectedRoute = rows[0].name;

  document.getElementById("ledgerRouteTabs").innerHTML = rows.map(row => `<button type="button" data-ledger-route="${row.name}" class="${row.name === uiState.selectedRoute ? "active" : ""}">${row.name}</button>`).join("");

  const row = rows.find(item => item.name === uiState.selectedRoute);

  const labels = ["产品净收入", "非氨变动成本", "包装/物流", "液氨机会成本", "启停摊销", "违约避免额"];

  const lines = labels.map((label, index) => `<article><span>${label}</span><strong class="${row.ledger[index] < 0 ? "negative" : "positive"}">${row.ledger[index] > 0 ? "+" : ""}${Math.round(row.ledger[index]).toLocaleString()}</strong><small>元/t-NH3</small></article>`).join("");

  const contribution = row.margin * row.tons / 10000;

  document.getElementById("economicLedger").innerHTML = `${lines}<article class="ledger-total"><span>单位分配贡献</span><strong class="${row.margin < 0 ? "negative" : "positive"}">${row.margin > 0 ? "+" : ""}${row.margin}</strong><small>${row.tons}t × ${row.margin}元 = ${contribution.toFixed(1)}万元/24h</small></article>`;

}

function compressorEvidence() {
  const replay = [
    { time: "08:00", vibration: 3.1, displacement: 45, surge: 25.2, temperature: 72.0, quality: "GOOD" },
    { time: "08:15", vibration: 3.2, displacement: 44, surge: 24.6, temperature: 72.4, quality: "GOOD" },
    { time: "08:30", vibration: 3.3, displacement: 46, surge: 24.2, temperature: 72.1, quality: "GOOD" },
    { time: "08:45", vibration: 3.5, displacement: 49, surge: 22.8, temperature: 73.2, quality: "GOOD" },
    { time: "09:00", vibration: 3.6, displacement: 48, surge: 22.3, temperature: 74.0, quality: "GOOD" },
    { time: "09:15", vibration: 3.9, displacement: 54, surge: 19.1, temperature: 76.3, quality: "GOOD" },
    { time: "09:30", vibration: 4.2, displacement: 58, surge: 16.5, temperature: 78.5, quality: "GOOD" }
  ];
  const index = Math.round(clamp(state.compressorDrift, 0, 100) / 100 * (replay.length - 1));
  const current = replay[index];
  const baseline = replay[0];
  const signed = value => `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
  return [
    { label: "轴振动合成值", value: current.vibration, unit: "mm/s", reference: "关注线 4.5", ratio: current.vibration / 4.5, trend: `较08:00 ${signed(current.vibration - baseline.vibration)}`, sampleTime: current.time, quality: current.quality },
    { label: "轴位移", value: current.displacement, unit: "μm", reference: "关注线 62", ratio: current.displacement / 62, trend: `较08:00 ${signed(current.displacement - baseline.displacement)}`, sampleTime: current.time, quality: current.quality },
    { label: "防喘振裕度", value: current.surge, unit: "%", reference: "下限 15", ratio: (33 - current.surge) / 18, trend: `较08:00 ${signed(current.surge - baseline.surge)}`, sampleTime: current.time, quality: current.quality },
    { label: "止推轴承温度", value: current.temperature, unit: "℃", reference: "关注线 82", ratio: current.temperature / 82, trend: `较08:00 ${signed(current.temperature - baseline.temperature)}`, sampleTime: current.time, quality: current.quality }
  ];
}

function renderWeakSignalEvidence() {

  const evidence = compressorEvidence();

  const level = state.compressorDrift > 70 ? "护机优先" : state.compressorDrift > 35 ? "设备复核" : "持续观察";

  document.getElementById("weakSignalState").textContent = `趋势提示：${level}`;

  document.getElementById("weakSignalEvidence").innerHTML = evidence.map(item => `
    <article><div><b>${item.label}</b><span>${item.trend}</span></div><strong>${item.value.toFixed(1)}${item.unit}</strong><div class="signal-track"><i style="width:${clamp(item.ratio * 100, 8, 100)}%"></i></div><small>${item.reference} · 回放 ${item.sampleTime} · 质量码 ${item.quality}</small></article>
  `).join("");

}

function executionMonitor(plan) {
  const actual = clamp(plan.load - (state.compressorDrift > 60 ? 5 : 2), 50, 95);
  const deviation = actual - plan.load;
  return [
    { label: "班长确认", status: "待确认", value: plan.risk > 55 ? "高风险双签" : "低风险单签", level: "pending" },
    { label: "目标负荷", status: `${plan.load}%`, value: "仅回写MES班次计划", level: "good" },
    { label: "演练执行反馈", status: `${actual}%（样例）`, value: `偏差 ${deviation > 0 ? "+" : ""}${deviation}pct`, level: Math.abs(deviation) > 3 ? "warn" : "good" },
    { label: "效果复核", status: "待班末", value: "分配贡献、能耗、库存、异常四项归因", level: "pending" }
  ];
}

function enterpriseExecutionMonitor(plan) {

  const tracked = uiState.workflow === "tracking" || uiState.workflow === "reviewed";
  const confirmed = uiState.workflow === "approved" || tracked;
  const actual = tracked ? uiState.actualLoad : null;
  const deviation = actual === null ? null : actual - plan.load;

  return [
    { label: "方案确认", status: workflowLabels[uiState.workflow], value: requiresSpecialist(plan) ? `班长+专业会签${hardTrigger() ? ` · ${hardTrigger()}` : ""}` : "班长确认，15分钟有效", level: confirmed ? "good" : "pending" },
    { label: "目标负荷", status: `${plan.load}%`, value: "建议值；仅允许写入MES班次计划", level: "good" },
    { label: "岗位接令", status: `${actionReceiptCount(plan)}/${dispatchActions(plan).length}项`, value: "接令不等于执行；全部接令后进入跟踪", level: actionReceiptCount(plan) === dispatchActions(plan).length ? "good" : "pending" },
    { label: "现场执行反馈", status: actual === null ? "待Historian回传" : `${actual}%`, value: deviation === null ? "未接企业数据，不构造实际值" : `偏差 ${deviation > 0 ? "+" : ""}${deviation}pct`, level: deviation !== null && Math.abs(deviation) > 3 ? "warn" : actual === null ? "pending" : "good" },
    { label: "效果复核", status: uiState.workflow === "reviewed" ? "已完成（演示）" : "待班末", value: "分配贡献、能耗、库存、异常四项归因", level: uiState.workflow === "reviewed" ? "good" : "pending" }
  ];

}

function renderExecution(plan) {
  if (decisionBlockReason(plan)) {
    document.getElementById("executionState").textContent = safetyStopReason() ? "安全闸门锁定" : "可行性门禁未通过";
    document.getElementById("executionMonitor").innerHTML = [
      { label: safetyStopReason() ? "停算闸门" : "可行性门禁", value: decisionBlockReason(plan), status: "已锁定", level: "warn" },
      { label: "最近批准方案", value: "由MES/交接记录读取；验收样例未接入", status: "维持/人工确认", level: "pending" },
      { label: "现场事实", value: "未接企业Historian，不构造实际负荷", status: "待回传", level: "pending" },
      { label: "处置路径", value: safetyStopReason() ? "按规程复核测点、设备状态与安环边界" : "调整负荷、去向或外采条件后重算", status: "转人工", level: "warn" },
      { label: "方案输出", value: safetyStopReason() ? "硬禁止状态不参与经济比较" : "冲突约束未消解前不得推荐", status: "冻结", level: "pending" }
    ].map((row, index) => `<article class="${row.level}"><i>${index + 1}</i><div><b>${row.label}</b><span>${row.value}</span></div><strong>${row.status}</strong></article>`).join("");
    return;
  }
  const rows = enterpriseExecutionMonitor(plan);
  document.getElementById("executionState").textContent = safetyStopReason() ? "安全闸门锁定" : rows[0].status;
  document.getElementById("executionMonitor").innerHTML = rows.map((row, index) => `
    <article class="${row.level}"><i>${index + 1}</i><div><b>${row.label}</b><span>${row.value}</span></div><strong>${row.status}</strong></article>
  `).join("");
}

function updateWorkflowControls(plan) {

  document.getElementById("recommendationPhase").textContent = decisionBlockReason(plan) ? (safetyStopReason() ? "停止生成新建议" : "无可执行方案") : workflowLabels[uiState.workflow];

  const sequence = { submit: 0, approve: 1, track: 2, review: 3 };
  const current = { draft: -1, pending: 0, approved: 1, tracking: 2, reviewed: 3 }[uiState.workflow];

  document.querySelectorAll("[data-workflow]").forEach(button => {
    const outsideSequence = sequence[button.dataset.workflow] > current + 1 || sequence[button.dataset.workflow] <= current;
    const waitingForReceipts = button.dataset.workflow === "track" && actionReceiptCount(plan) < dispatchActions(plan).length;
    button.disabled = Boolean(decisionBlockReason(plan)) || outsideSequence || waitingForReceipts;
  });

}

function freshness() {
  return [
    { title: "DCS / IoT", body: "验收样例：接口待联调。试点只读接入后，过程摘要超过15分钟自动降级。", level: "warn" },
    { title: "MES / ERP", body: "验收样例：订单、库存与班次计划采用演示数据；试点需统一主数据口径。", level: "warn" },
    { title: "热电 APC", body: "验收样例：公辅约束未连接企业系统；首期接收只读约束摘要。", level: "warn" },
    { title: "市场行情", body: uiState.marketConfirmed ? `运营样例已确认 V${activeMarket().version}，${activeMarket().confirmedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}。` : `待运营核价；计算沿用 V${activeMarket().version}，页面新输入尚未生效。`, level: uiState.marketConfirmed ? "good" : "warn" }
  ];
}

function aiAnswer(question, plan) {
  const answers = {
    nitric: `硝酸趋势按运营已确认版本参与计算；若行情、订单或罐存口径不完整，则转人工复核。`,
    allocation: `液氨去向先过安全与连续生产约束，再按相对外售分配贡献比较。`,
    compressor: `压机趋势证据仅用于安排复核顺序，不触发联锁或开停车。`
  };
  return answers[question] || answers.allocation;
}

function structuredAiAnswer(question, plan) {
  const market = activeMarket();
  const nitric = enterpriseAllocationRows(plan).find(row => row.name === "硝酸");
  const answers = {
    nitric: {
      conclusion: "硝酸不排满负荷，先维持可接受的经济负荷。",
      evidence: `运营确认行情 V${market.version} 中硝酸趋势 ${market.nitricTrend}%，单位液氨分配贡献 ${nitric.margin} 元/t-NH3；库存 ${state.inventory}%。`,
      risk: "若订单、罐存或装置最低负荷口径不完整，建议仅作备选，不进入确认。",
      next: "核对硝酸订单、最低稳定负荷与罐区可用量，4小时后重算。",
      owner: "生产调度 + 硝酸装置"
    },
    allocation: {
      conclusion: "先保安全和流程连续，再比较各去向相对液氨外售的分配贡献。",
      evidence: `当前采用行情 V${market.version}：液氨 ${market.ammoniaPrice} 元/吨；复合肥刚性订单、尿素溶液和联碱连续消纳优先。`,
      risk: "外采是补缺成本，外售是比较基准；两者不能与内部去向混作同一收益排名。",
      next: "运营核价、调度核单、罐区核量后，由班长在15分钟有效期内确认。",
      owner: "运营 + 调度长 + 班长"
    },
    compressor: {
      conclusion: state.compressorDrift > 60 ? "暂停升负荷，转设备专业会签。" : "保持观察，出现多变量同向偏离时转设备复核。",
      evidence: `当前趋势证据 ${state.compressorDrift}、设备健康 ${state.health}；这些数值是交互样例，待接 SMC/DCS 原始趋势。`,
      risk: "单一综合滑块不能替代振动、轴位移、温度和防喘振裕度的现场判断。",
      next: "核查测点质量和原始趋势，设备专业给出处置意见；不触发联锁或开停车。",
      owner: "设备工程师 + 当班班长"
    }
  };
  return answers[question] || answers.allocation;
}

function renderAiAnswer(plan) {
  if (decisionBlockReason(plan)) {
    document.getElementById("aiAnswer").innerHTML = `<strong>${safetyStopReason() ? "停止生成新的调度建议，转现场规程与专业处置。" : "当前规则方案不可执行，先消解冲突约束。"}</strong><dl><div><dt>依据</dt><dd>${decisionBlockReason(plan)}</dd></div><div><dt>边界</dt><dd>不生成审批或跨装置动作，不把不可行结果标成优选方案。</dd></div><div><dt>下一步</dt><dd>${safetyStopReason() ? "核对原始测点、最近批准方案和设备状态，记录专业结论。" : "调整合成负荷、下游去向、外售或外采条件后重算。"}</dd></div><div><dt>责任岗位</dt><dd>${safetyStopReason() ? "当班班长 + 设备 + 工艺 + 安环" : "生产调度 + 运营 + 罐区"}</dd></div></dl>`;
    return;
  }
  const answer = structuredAiAnswer(document.getElementById("aiAnswer").dataset.question, plan);
  document.getElementById("aiAnswer").innerHTML = `
    <strong>${answer.conclusion}</strong>
    <dl>
      <div><dt>依据</dt><dd>${answer.evidence}</dd></div>
      <div><dt>边界</dt><dd>${answer.risk}</dd></div>
      <div><dt>下一步</dt><dd>${answer.next}</dd></div>
      <div><dt>责任岗位</dt><dd>${answer.owner}</dd></div>
    </dl>`;
}

function feishu(plan, text) {
  return `
    <div class="feishu-card">
      <h3>${text.mode}｜合成氨负荷调整</h3>
      <p>${text.title}</p>
      <div class="field-grid">
        <span><b>目标负荷</b>${plan.load}%</span>
        <span><b>证据完整度</b>${evidenceCompleteness()}/8</span>
        <span><b>确认路径</b>${requiresSpecialist(plan) ? "班长+专业会签" : "班长确认"}</span>
        <span><b>回写范围</b>MES计划/交接/复盘</span>
        <span><b>多维表格</b>班次事实与未采纳原因</span>
        <span><b>Aily追问</b>约束解释/异常处置</span>
      </div>
    </div>
    <article><b>事件回调</b><span>接收卡片点击、审批通过/驳回、复盘提交，写入合成负荷指令库。</span><em class="tag">需签名校验</em></article>
  `;
}

function feishuContract(plan, text) {
  const riskPath = requiresSpecialist(plan) ? "班长确认 → 相关专业/调度主管会签" : "班长确认";
  return {
    card: {
      target_chat: "合成氨当班调度群",
      title: `${text.mode}｜合成氨负荷调整建议`,
      buttons: ["采纳并发起审批", "要求复核", "驳回并填写原因"],
      fields: {
        target_load_percent: plan.load,
        professional_review_reason: professionalReviewReason() || "无",
        evidence_completeness: `${evidenceCompleteness()}/8`,
        approval_path: riskPath
      }
    },
    approval: {
      definition: "ammonia_load_adjustment",
      form_fields: ["班次", "目标负荷", "约束解释", "专业复核原因", "分配贡献口径", "回写范围"],
      write_back_after_approved: ["MES班次计划", "交接班摘要", "飞书多维表格复盘"]
    },
    base_record: {
      table: "合成氨调度复盘库",
      key_fields: ["shift_id", "scenario", "target_load", "accepted", "reject_reason", "actual_delta", "operator_note"],
      current_sample: {
        shift_id: "NH3-20260804-D",
        scenario: text.mode,
        target_load: `${plan.load}%`,
        relative_external_sale_contribution_cny_24h: Math.round(massBalance(plan).contributionWan * 10000),
        professional_review_reason: professionalReviewReason() || "无"
      }
    },
    task: {
      title: "跟踪负荷调整执行效果",
      owners: ["调度员", "班长", "设备工程师"],
      due: "本班结束前",
      checklist: ["责任岗位逐项接令", "确认DCS historian实际负荷", "记录未采纳原因", "班后复盘收益归因"]
    },
    callback: {
      events: ["im.message.receive_v1", "card.action.trigger", "approval.instance.status_changed", "bitable.record.changed"],
      guardrails: ["签名校验", "幂等键", "DCS/SIS只读", "证据不完整时转人工"]
    },
    aily: {
      entry: "合成氨调度问答助手",
      grounded_sources: ["班次事实表", "调度复盘库", "异常经验库", "APC/RTO约束摘要"]
    }
  };
}

function renderFeishuHub(plan, text) {
  const contract = feishuContract(plan, text);
  const cards = [
    { title: "班组卡片", body: `已完成“${text.mode}”卡片字段与按钮原型；企业应用发布后送入当班确认链。`, tag: "交互原型" },
    { title: "负荷审批", body: `当前建议走“${contract.card.fields.approval_path}”，通过后只回写MES摘要。`, tag: "审批原型" },
    { title: "在线复盘库", body: `真实 Base 已建立13个字段和3条完整样例，记录目标、实际、偏差与未采纳原因。`, tag: "在线可打开" },
    { title: "执行任务", body: "验收任务已在飞书真实创建并可打开；生产调度任务须由审批实例携带责任人与有效期触发。", tag: "真实链路已验证" },
    { title: "飞书智能问答", body: "问答原型标出班次事实、设备趋势和规则来源；无依据时转人工复核。", tag: "Aily待管理员授权" },
    { title: "知识回流", body: "卡片、审批、任务和Base结果统一形成下一班可检索的经验样本。", tag: "持续校准" }
  ];
  document.getElementById("feishuHub").innerHTML = cards.map(item => `
    <article>
      <b>${item.title}</b>
      <span>${item.body}</span>
      <em class="tag">${item.tag}</em>
    </article>
  `).join("");
}

function knowledge(plan) {
  return [
    { title: "全线事实表", body: "把MES、IoT、DCS、APC、压机、热电和行情数据汇成调度长同屏口径。", level: "good" },
    { title: "调度长经验库", body: `输入快照、目标负荷 ${plan.load}%、审批人、采纳状态、实际偏差和班长判断进入统一记录。`, level: "good" },
    { title: "新人训练样本", body: "把安全边界、设备风险、订单变化、数据不可信和经验判断结构化，供新调度员按场景学习。", level: "warn" },
    { title: "周度校准", body: "高偏差、典型异常和高价值样本先进入案例审核；经历史回放和专业会签后才可晋级规则。", level: "good" }
  ];
}

function roleViews(plan) {
  return [
    { title: "调度员", body: "看三案差异、订单优先级、库存影响和能耗收益。", level: "good" },
    { title: "班长", body: `确认目标负荷 ${plan.load}%、明确复核原因和交接摘要。`, level: requiresSpecialist(plan) ? "warn" : "good" },
    { title: "设备", body: "关注压缩机、合成塔、换热器和点检窗口。", level: state.health < 68 ? "warn" : "good" },
    { title: "安环", body: "确认罐区压力、安全库存、重大危险源和环保指标。", level: "good" }
  ];
}

function effectiveRoleViews(plan) {
  const market = activeMarket();
  if (decisionBlockReason(plan)) {
    return [
      { title: "当前任务", body: `${decisionBlockReason(plan)}；停止生成新目标，核对输入事实和最近批准方案。`, level: safetyStopReason() ? "danger" : "warn" },
      { title: "协同要求", body: safetyStopReason() ? "通知当班班长、设备、工艺和安环岗位，按现场规程记录处置和复核结论。" : "由调度重新调整负荷、液氨去向或外采条件，消解冲突约束后再提交。", level: "warn" }
    ];
  }
  const profiles = {
    dispatcher: [
      { title: "本班要做", body: `核对 V${market.version} 行情、刚性订单与罐区可用量，比较三案后提交 ${plan.load}% 目标负荷建议。`, level: "good" },
      { title: "交接重点", body: "记录未采纳原因、有效期、回滚条件和下一次重算时间。", level: "warn" }
    ],
    leader: [
      { title: "确认范围", body: `确认目标负荷 ${plan.load}%、约束解释和回滚条件；${requiresSpecialist(plan) ? "本轮必须专业会签。" : "本轮可由班长确认。"}`, level: requiresSpecialist(plan) ? "warn" : "good" },
      { title: "现场边界", body: "建议只写入班次计划和交接记录，现场按现行操作规程执行。", level: "good" }
    ],
    equipment: [
      { title: "趋势复核", body: `压缩机趋势证据 ${state.compressorDrift}、设备健康 ${state.health}；核查原始趋势、测点质量与防喘振裕度。`, level: state.health < 68 || state.compressorDrift > 35 ? "warn" : "good" },
      { title: "给调度的结论", body: "输出可升、限升、保持、降负荷或退出建议，并写明复查时点。", level: "good" }
    ],
    hse: [
      { title: "底线核对", body: "确认罐区压力、安全库存、重大危险源和环保约束未被经济目标覆盖。", level: "good" },
      { title: "越界处置", body: "触及安全或环保红线时，经济排序立即失效，转现行应急和联锁体系。", level: "danger" }
    ]
  };
  return profiles[uiState.role] || profiles.dispatcher;
}

function decisionRules(plan) {
  const continuityRisk = state.demand > 84 || state.inventory < 45 || state.energy > 78;
  const equipmentRisk = Boolean(professionalReviewReason()) || Boolean(safetyStopReason());
  return [
    {
      title: "第一优先级：安全",
      body: equipmentRisk ? "设备或工艺风险升高，方案只保留降风险动作，严禁为了产量突破DCS/SIS和安环红线。" : "所有建议先通过合成塔、压缩机、罐区和环保约束筛选。",
      level: equipmentRisk ? "danger" : "good"
    },
    {
      title: "第二优先级：流程不中断",
      body: continuityRisk ? "下游需求、库存或能源窗口正在挤压连续流程，优先做跨装置负荷联动，避免气化、净化、合成和液氨去向被动中断。" : "维持合成氨主流程连续，减少停车后重启时间、废料、人员和物料损失。",
      level: continuityRisk ? "warn" : "good"
    },
    {
      title: "第三优先级：特殊情况取舍",
        body: "确需中断时比较停空分、停合成气轮机或停下游装置的重启时间、废料和影响范围；企业口述案例曾优先保气轮机驱动关键系统，正式采用仍须班长、主管和专业人员确认。",
      level: "warn"
    }
  ];
}

function dataInterfaces() {
  return [
    { title: "MES/合成氨调控平台", body: "30天试点先接日计划、订单与班次记录离线导出；字段口径确认后再做只读接口。", level: "warn" },
    { title: "IoT数据平台", body: "30天试点先导入5-15分钟过程摘要，不接控制写入；用于事实快照和趋势复核。", level: "warn" },
    { title: "合成氨DCS", body: "负责主装置回路、顺控、报警和联锁；本方案只接 Historian 摘要，绝不写控制参数。", level: "good" },
    { title: "和利时DCS/热电APC", body: "提供热电、公辅和蒸汽管网约束，APC结果用于跨装置负荷联动。", level: "good" },
    { title: "SMC压机/康迪森机组", body: "压缩机、气轮机驱动系统和关键机组健康趋势，用于护机和特殊停机取舍。", level: state.health < 68 ? "warn" : "good" }
  ];
}

function interfaceFieldRows() {
  return [
    ["ERP", "订单数量 / 交期 / 行情净价", "只读", "变更/每日", "业务生效时间 + 运营确认", "运营管理", "沿用上一有效版本并转人工"],
    ["MES", "原班次计划 / 执行偏差", "先读后审批准写", "班次/小时", "计划生效时间 + 审批状态", "生产调度", "保留人工基线，不覆盖"],
    ["DCS Historian", "实际负荷 / 罐存 / 床层温升", "只读", "5分钟", "源时间戳 + 质量码", "装置主操", "超15分钟停算，实际值留空"],
    ["热电 APC", "蒸汽、电力、公辅约束余量", "只读", "5分钟", "约束快照 + 有效期", "公辅调度", "转公辅人工复核"],
    ["SMC / 机组", "振动 / 轴位移 / 防喘振裕度", "只读", "1分钟", "同工况基线 + 测点质量", "设备专业", "转专业复核或锁定新建议"],
    ["飞书审批", "确认人 / 意见 / 状态 / 时间", "读写", "事件", "签名校验 + 幂等键", "当班班长", "重试后进入人工对账"],
    ["飞书 Base", "班末事实 / 未采纳原因 / 复盘结论", "审批后写", "事件", "必填字段完整", "生产调度", "保存草稿，禁止补造事实"]
  ];
}

function renderInterfaceFieldMatrix() {
  document.getElementById("interfaceFieldMatrix").innerHTML = interfaceFieldRows().map(row => `<tr>${row.map((cell, index) => `<td>${index === 0 ? `<b>${cell}</b>` : cell}</td>`).join("")}</tr>`).join("");
}

function renderList(id, items) {
  document.getElementById(id).innerHTML = items.map(item => `<article class="${item.level || ""}"><b>${item.title}</b><span>${item.body}</span>${item.tag ? `<em class="tag">${item.tag}</em>` : ""}</article>`).join("");
}

function renderScenarioCards(plan) {
  if (decisionBlockReason(plan)) {
    document.getElementById("bestPlan").textContent = "无可执行方案";
    document.getElementById("scenarioCards").innerHTML = `<article class="scenario"><b>${safetyStopReason() ? "安全闸门锁定" : "可行性门禁未通过"}</b><p>${decisionBlockReason(plan)}。当前规则方案不得进入审批或动作派发。</p><div class="mini-kpis"><span>新目标 --</span><span>${safetyStopReason() ? "经济排序冻结" : "冲突约束待消解"}</span><span>转人工重算</span></div></article>`;
    return;
  }
  const compare = scenarios(plan);
  document.getElementById("bestPlan").textContent = `优选：${compare.best}`;
  document.getElementById("scenarioCards").innerHTML = compare.list.map(item => `
    <article class="scenario ${item.id === compare.best ? "best" : ""}">
      <b>${item.id}方案</b>
      <p>${item.body}</p>
      <div class="mini-kpis">
        <span>负荷 ${item.load}%</span>
        <span>经济比较值 ${item.margin}</span>
        <span>${item.id === "护机" ? "设备优先复核" : "常规约束复核"}</span>
      </div>
    </article>
  `).join("");
}

function renderGantt(rows) {
  document.getElementById("gantt").innerHTML = rows.map(row => {
    const bars = row.bars.map(bar => `<div class="gantt-bar" style="left:${bar.start}%;width:${bar.width}%;background:${colors[bar.type]}">${bar.text}</div>`).join("");
    return `<div class="gantt-row"><div class="gantt-label">${row.label}</div><div class="gantt-track">${bars}</div></div>`;
  }).join("");
}

function setupViewTargets() {

  const targets = [
    ["scenarioCards", "supply"],
    ["interfaceMap", "system"],
    ["modelCards", "stability system"],
    ["gantt", "supply"],
    ["executionMonitor", "overview execution"],
    ["constraints", "supply system"],
    ["benefitTrace", "supply system"],
    ["feishuPreview", "execution"],
    ["knowledgeLoop", "execution system"],
    ["aiAnswer", "execution"],
    ["roleViews", "overview execution"],
    ["decisionRules", "stability system"],
    ["dataInterfaces", "system"],
    ["freshness", "system"]
  ];

  targets.forEach(([id, views]) => {
    const node = document.getElementById(id);
    const root = node && node.closest(".panel");
    if (root) root.dataset.view = views;
  });

}

function applyWorkspace() {

  setupViewTargets();

  document.querySelectorAll("[data-view]").forEach(node => {
    const views = node.dataset.view.split(/\s+/);
    node.classList.toggle("is-hidden", !views.includes(uiState.workspace));
  });

  document.querySelectorAll("[data-workspace]").forEach(button => {
    button.classList.toggle("active", button.dataset.workspace === uiState.workspace);
  });

}

function pushEvent(kind, plan, text) {
  const labels = {
    recalc: "已重算三案",
    card: "已生成飞书互动卡片草稿",
    approval: "已生成负荷调整审批草稿",
    bitable: "已保存本地复盘草稿",
    export: "已导出当前方案证据包",
    task: "已生成本地任务草稿",
    review: "已保存本地复盘草稿",
    submit: "审批草稿进入待确认（演示）",
    approve: "已记录班长确认（演示）",
    track: "执行跟踪已开始（演示）"
  };
  const detail = {
    recalc: `${text.mode}，目标负荷 ${plan.load}%，证据完整度 ${evidenceCompleteness()}/8，行情版本 V${activeMarket().version}。`,
    card: `卡片字段草稿已生成，尚未发送；包含负荷、风险、约束和确认按钮。`,
    approval: `审批通过后只写MES计划、交接摘要和复盘记录，不写DCS/SIS。`,
    bitable: `本地草稿包含采纳状态、未采纳原因、执行偏差和班长备注，尚未写入多维表格。`,
    export: `已下载JSON证据包；包含输入快照、门禁状态、物料平衡、动作单、接令状态、来源和版本信息。`,
    task: `责任人、检查项和班末复核要求已生成本地草稿；项目中的真实验收任务另有直达链接。`,
    review: `当前输入、判断依据、采纳状态和效果指标已进入复盘草稿。`,
    submit: `建议仍未写入生产系统，等待班长按验收状态机确认。`,
    approve: `仅记录演示确认状态；企业上线后需由飞书审批实例返回真实操作人和时间。`,
    track: `已进入跟踪状态；未接 Historian 前保持“待回传”，不构造实际负荷。`
  };
  events.unshift({ title: labels[kind] || "已记录动作", body: detail[kind] || "" });
  if (events.length > 6) events.pop();
}

function renderEvents() {
  document.getElementById("eventLog").innerHTML = events.map(item => `<div><b>${item.title}</b>${item.body}</div>`).join("");
}

function renderMarketGate() {
  const market = activeMarket();
  const status = document.getElementById("marketGateStatus");
  const button = document.getElementById("confirmMarket");
  const header = document.getElementById("headerMarketState");
  const source = document.getElementById("marketSourceState");
  const officialUpdated = uiState.officialMarket.status === "reference_updated";
  status.textContent = uiState.marketConfirmed
    ? `运营样例已确认 V${market.version} · ${market.ammoniaPrice}元/t · 硝酸${market.nitricTrend}%`
    : officialUpdated ? `官方参考已更新，执行价仍沿用 V${market.version} · 等待经营确认` : `待运营核价，计算沿用 V${market.version} · 页面新输入尚未生效`;
  header.textContent = uiState.marketConfirmed ? `行情样例 V${market.version} 已确认` : officialUpdated ? "官方参考已更新，执行价待确认" : "行情样例需核价";
  source.innerHTML = uiState.marketConfirmed
    ? `<i class="pulse good"></i>行情样例 V${market.version} 已确认 · 本轮建议已重算`
    : officialUpdated ? '<i class="pulse good"></i>官方参考已更新 · 液氨执行价仍需ERP/经营确认' : '<i class="pulse warn"></i>行情样例待核价 · 新输入不参与建议';
  document.getElementById("marketGate").classList.toggle("confirmed", uiState.marketConfirmed);
  document.getElementById("marketGate").classList.toggle("official-updated", officialUpdated);
  button.textContent = uiState.marketConfirmed ? "重新确认本轮行情" : "确认本轮样例行情";
}

function openIncident(index) {
  const item = eventQueue(calc())[index];
  if (!item) return;
  uiState.activeIncident = item;
  document.getElementById("incidentLevel").textContent = item.level.toUpperCase();
  document.getElementById("incidentTitle").textContent = item.title;
  document.getElementById("incidentSource").textContent = `${item.source} · ${item.owner} · ${item.deadline}`;
  document.getElementById("incidentFacts").innerHTML = item.facts.map(fact => `<span>${fact}</span>`).join("");
  document.getElementById("incidentChecklist").innerHTML = item.checklist.map(step => `<li>${step}</li>`).join("");
  document.querySelector("#incidentDialog .dialog-boundary").textContent = "这里只记录确认、转派和复核，不向 DCS/SIS 下发控制动作。";
  document.getElementById("incidentDialog").showModal();
}

function openApproval(plan) {
  const specialist = requiresSpecialist(plan);
  document.getElementById("approvalReason").textContent = specialist ? professionalReviewReason() : "未触发专业会签条件，班长确认后由责任岗位逐项接令。";
  document.getElementById("specialistSignText").textContent = `${professionalReviewReason() || "相关专业复核"}，会签意见已记录`;
  document.getElementById("specialistSignRow").hidden = !specialist;
  document.getElementById("leaderSign").checked = false;
  document.getElementById("specialistSign").checked = false;
  document.getElementById("approvalNote").value = "";
  document.getElementById("approvalDialog").showModal();
}

function render() {
  const plan = calc();
  const text = strategy(plan);

  const balance = massBalance(plan);

  const validUntil = new Date(uiState.generatedAt.getTime() + 15 * 60 * 1000);
  Object.keys(state).forEach(key => {
    const output = document.getElementById(`${key}Out`);
    if (output) output.textContent = state[key];
  });
  document.getElementById("modeLabel").textContent = text.mode;
  document.getElementById("strategyTitle").textContent = text.title;
  document.getElementById("strategyText").textContent = text.text;
  const decisionBlocked = Boolean(decisionBlockReason(plan));
  document.getElementById("loadKpi").textContent = decisionBlocked ? "--" : `${plan.load}%`;
  document.getElementById("nh3Kpi").textContent = decisionBlocked ? "--" : `${plan.nh3.toLocaleString()}t`;
  document.getElementById("marginKpi").textContent = decisionBlocked ? "--" : `${balance.contributionWan >= 0 ? "+" : ""}${balance.contributionWan.toFixed(1)}万`;
  const constraintRows = constraints(plan);
  const hardCount = constraintRows.filter(item => item.level === "danger").length;
  const reviewCount = constraintRows.filter(item => item.level === "warn").length;
  document.getElementById("riskKpi").textContent = `${hardCount}项越界`;
  document.getElementById("riskKpiNote").textContent = `${reviewCount}项待复核`;
  document.getElementById("dataCompleteness").textContent = `验收样例字段 ${evidenceCompleteness()}/8 · 企业接口待联调`;
  document.getElementById("operatorNote").textContent = decisionBlocked
    ? `当前状态：${safetyStopReason() ? "安全闸门锁定" : "可行性门禁未通过"}；原因：${decisionBlockReason(plan)}；停止生成新建议并转人工处理。`
    : `当前建议：${text.mode}；状态：${workflowLabels[uiState.workflow]}；确认路径：${requiresSpecialist(plan) ? `班长+专业会签（${professionalReviewReason()}）` : "班长确认"}；岗位接令 ${actionReceiptCount(plan)}/${dispatchActions(plan).length}；只允许写入MES计划、交接摘要和复盘记录。`;
  document.querySelector('[data-action="approval"]').disabled = decisionBlocked;
  document.getElementById("constraintCount").textContent = `${constraintRows.length}项`;
  document.getElementById("modelTrust").textContent = `证据 ${evidenceCompleteness()}/8`;

  document.getElementById("recommendationId").textContent = `NH3-D01-${String(uiState.recommendationVersion).padStart(3, "0")}`;

  document.getElementById("generatedAt").textContent = uiState.generatedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  document.getElementById("validUntil").textContent = validUntil.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  document.getElementById("rollbackRule").textContent = "偏差>3pct、关键数据失效或现场拒绝";
  document.getElementById("shiftSummary").textContent = `${text.mode}｜24h`;
  document.getElementById("digitalEmployeeMeta").textContent = `只读建议层 · 最近核算 ${uiState.generatedAt.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  renderOfficialMarket();
  renderMarketGate();
  renderEventQueue(plan);
  renderEnterpriseAllocation(plan);

  renderMassBalance(plan);

  renderEconomicLedger(plan);

  renderWeakSignalEvidence();
  renderScenarioCards(plan);
  renderList("interfaceMap", interfaceMap(plan));
  renderInterfaceFieldMatrix();
  renderList("modelCards", models(plan));
  renderGantt(schedule(plan));
  renderDispatchActions(plan);
  renderExecution(plan);

  updateWorkflowControls(plan);
  renderList("constraints", constraintRows);
  renderList("benefitTrace", benefitTrace(plan));
  document.getElementById("feishuPreview").innerHTML = feishu(plan, text);
  renderFeishuHub(plan, text);
  renderList("knowledgeLoop", knowledge(plan));
  renderList("roleViews", effectiveRoleViews(plan));
  renderList("decisionRules", decisionRules(plan));
  renderList("dataInterfaces", dataInterfaces());
  renderList("freshness", freshness());
  if (!document.getElementById("aiAnswer").dataset.question) {
    document.getElementById("aiAnswer").dataset.question = "allocation";
  }
  renderAiAnswer(plan);
  renderEvents();

  applyWorkspace();
}

document.querySelectorAll("[data-workspace]").forEach(button => {

  button.addEventListener("click", event => {
    uiState.workspace = event.currentTarget.dataset.workspace;
    applyWorkspace();
  });

});

document.getElementById("ledgerRouteTabs").addEventListener("click", event => {

  const button = event.target.closest("[data-ledger-route]");
  if (!button) return;
  uiState.selectedRoute = button.dataset.ledgerRoute;
  renderEconomicLedger(calc());

});

document.querySelectorAll("[data-workflow]").forEach(button => {

  button.addEventListener("click", event => {
    const action = event.currentTarget.dataset.workflow;
    if (action === "approve") {
      openApproval(calc());
      return;
    }
    const transitions = { submit: "pending", track: "tracking", review: "reviewed" };
    uiState.workflow = transitions[action];
    if (action === "track") uiState.actualLoad = null;
    pushEvent(action, calc(), strategy(calc()));
    render();
  });

});

document.querySelectorAll("input[type='range']").forEach(input => {
  input.addEventListener("input", event => {
    state[event.target.dataset.key] = Number(event.target.value);
    if (["ammoniaPrice", "nitricTrend"].includes(event.target.dataset.key)) uiState.marketConfirmed = false;

    uiState.workflow = "draft";
    uiState.actualLoad = null;
    uiState.actionAcks = {};
    uiState.generatedAt = new Date();
    uiState.recommendationVersion += 1;
    render();
  });
});

document.querySelectorAll("[data-preset]").forEach(button => {
  button.addEventListener("click", event => {
    Object.assign(state, presets[event.target.dataset.preset]);
    uiState.marketConfirmed = false;

    uiState.workflow = "draft";
    uiState.actualLoad = null;
    uiState.actionAcks = {};
    uiState.generatedAt = new Date();
    uiState.recommendationVersion += 1;
    Object.keys(state).forEach(key => {
      const input = document.querySelector(`[data-key="${key}"]`);
      if (input) input.value = state[key];
    });
    render();
  });
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", event => {
    const plan = calc();
    const text = strategy(plan);
    const action = event.currentTarget.dataset.action;
    if (action === "recalc") {
      uiState.workflow = "draft";
      uiState.actualLoad = null;
      uiState.actionAcks = {};
      uiState.generatedAt = new Date();
      uiState.recommendationVersion += 1;
    }
    if (action === "export") exportEvidencePackage(plan, text);
    pushEvent(action, plan, text);
    render();
  });
});

document.querySelectorAll("[data-question]").forEach(button => {
  button.addEventListener("click", event => {
    document.querySelectorAll("[data-question]").forEach(item => item.classList.remove("active"));
    event.currentTarget.classList.add("active");
    document.getElementById("aiAnswer").dataset.question = event.currentTarget.dataset.question;
    render();
  });
});

document.querySelectorAll("[data-ai-action]").forEach(button => {
  button.addEventListener("click", event => {
    const plan = calc();
    const text = strategy(plan);
    pushEvent(event.currentTarget.dataset.aiAction, plan, text);
    document.getElementById("feishuLiveState").textContent = event.currentTarget.dataset.aiAction === "task" ? "执行任务草稿已生成" : "飞书动作草稿已生成";
    render();
  });
});

document.getElementById("eventQueue").addEventListener("click", event => {
  const button = event.target.closest("[data-event-index]");
  if (!button) return;
  openIncident(Number(button.dataset.eventIndex));
});

document.getElementById("actionSheet").addEventListener("change", event => {
  const input = event.target.closest("[data-action-ack]");
  if (!input) return;
  uiState.actionAcks[input.dataset.actionAck] = input.checked;
  const row = dispatchActions(calc()).find(item => item.id === input.dataset.actionAck);
  events.unshift({ title: `${row.unit}｜${input.checked ? "已接令" : "撤回接令"}`, body: `${row.owner}状态已记录；该记录不代表现场已经执行。` });
  if (events.length > 6) events.pop();
  render();
});

document.getElementById("syncOfficialMarket").addEventListener("click", () => {
  syncOfficialMarket();
});

document.getElementById("confirmMarket").addEventListener("click", () => {
  uiState.confirmedMarket = {
    ammoniaPrice: state.ammoniaPrice,
    nitricTrend: state.nitricTrend,
    version: uiState.confirmedMarket.version + 1,
    confirmedAt: new Date()
  };
  uiState.marketConfirmed = true;
  uiState.workflow = "draft";
  uiState.actualLoad = null;
  uiState.actionAcks = {};
  uiState.generatedAt = new Date();
  uiState.recommendationVersion += 1;
  pushEvent("recalc", calc(), strategy(calc()));
  render();
});

document.querySelectorAll("[data-role]").forEach(button => {
  button.addEventListener("click", event => {
    uiState.role = event.currentTarget.dataset.role;
    document.querySelectorAll("[data-role]").forEach(item => {
      const active = item.dataset.role === uiState.role;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderList("roleViews", effectiveRoleViews(calc()));
  });
});

document.querySelectorAll("[data-incident-command]").forEach(button => {
  button.addEventListener("click", event => {
    const item = uiState.activeIncident;
    if (!item) return;
    const command = event.currentTarget.dataset.incidentCommand;
    const labels = { evidence: "依据不足，已退回补数", ack: "已确认收到", task: "飞书任务草稿已生成" };
    uiState.incidentStatus[item.id] = labels[command];
    events.unshift({ title: `${item.title}｜${labels[command]}`, body: `${item.owner}负责，${item.deadline}复核；未向 DCS/SIS 下发动作。` });
    if (events.length > 6) events.pop();
    document.getElementById("feishuLiveState").textContent = command === "task" ? "执行任务草稿已生成" : "事件状态已记录";
    document.getElementById("incidentDialog").close();
    render();
  });
});

document.getElementById("submitApproval").addEventListener("click", () => {
  const plan = calc();
  const leaderSigned = document.getElementById("leaderSign").checked;
  const specialistSigned = document.getElementById("specialistSign").checked;
  if (!leaderSigned || (requiresSpecialist(plan) && !specialistSigned)) {
    document.getElementById("approvalReason").textContent = requiresSpecialist(plan) ? "需要班长和专业人员共同确认。" : "需要班长确认。";
    return;
  }
  uiState.workflow = "approved";
  pushEvent("approve", plan, strategy(plan));
  document.getElementById("approvalDialog").close();
  render();
});

const guideDialog = document.getElementById("guideDialog");
document.getElementById("openGuide").addEventListener("click", () => {
  guideDialog.showModal();
});

const rolloutDetails = {
  "30": {
    title: "30 天 · 数据校核",
    status: "建议起点",
    summary: "先确认数据和业务口径，所有接口只读，平台不影响现场生产。",
    inputs: "订单、MES班次计划、罐区历史摘要、飞书协同记录",
    outputs: "字段质量、液氨平衡、责任岗位和接口问题清单",
    gate: "字段、单位、时间戳和责任人确认；不影响生产",
    no: "不写DCS/SIS，不统计真实节约，不自动下达负荷"
  },
  "60": {
    title: "60 天 · 旁路回放",
    status: "验证建议",
    summary: "把生产历史、设备和公辅只读数据接入，与人工调度方案并排回放。",
    inputs: "生产历史数据库、压缩机趋势、热电公辅、能源和人工原计划",
    outputs: "三案比较、趋势复核、偏差报告、异常复盘和停用条件",
    gate: "有效班次回放稳定；建议与人工方案可同口径比较",
    no: "不绕过班长和专业确认，不写控制参数，不把样例值当收益"
  },
  "90": {
    title: "90 天 · 条件受控验证",
    status: "企业批准后",
    summary: "覆盖有效班次和典型场景，在企业批准范围内验证确认、执行回传和复盘闭环。",
    inputs: "班长确认、专业会签、岗位接令、飞书任务、MES计划摘要和实际回传",
    outputs: "验收报告、采纳/未采纳原因库、规则版本和推广建议",
    gate: "不少于30个有效班次；安全、生产、设备和经营共同验收",
    no: "不自动开停车，不替代DCS/SIS，不在未验收时扩大范围"
  }
};

function renderRolloutDetail(stage) {
  const detail = rolloutDetails[stage];
  if (!detail) return;
  document.querySelectorAll("[data-roadmap-stage]").forEach(button => {
    const active = button.dataset.roadmapStage === stage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.closest(".rollout-card")?.classList.toggle("active", active);
  });
  document.getElementById("rolloutDetailTitle").textContent = detail.title;
  document.getElementById("rolloutDetailStatus").textContent = detail.status;
  document.getElementById("rolloutDetailSummary").textContent = detail.summary;
  document.getElementById("rolloutDetailInputs").textContent = detail.inputs;
  document.getElementById("rolloutDetailOutputs").textContent = detail.outputs;
  document.getElementById("rolloutDetailGate").textContent = detail.gate;
  document.getElementById("rolloutDetailNo").textContent = detail.no;
}

document.querySelectorAll("[data-roadmap-stage]").forEach(button => {
  button.addEventListener("click", () => renderRolloutDetail(button.dataset.roadmapStage));
});
renderRolloutDetail("30");

const shadowCases = {
  tight: {
    label: "甲班 · 液氨趋紧",
    kpis: [["有效班次", "18 / 30", "已完成样例回放"], ["数据完整性", "98.6%", "演示快照口径"], ["硬约束突破", "0 次", "安全闸门结果"], ["实际效果", "待接入", "不以样例冒充现场", "warn"]],
    compare: [["液氨去向", "尿素优先、硝酸降负", "人工维持原分配", "差异 2 项"], ["合成负荷", "按安全库存缓降", "维持当前负荷", "待班长复核"], ["约束校核", "7 / 7 通过", "人工记录完整", "可复算"]],
    gates: [["输入快照冻结", "订单、MES、罐区与行情版本一致", "通过"], ["建议可复算", "同一快照重复计算结果一致", "通过"], ["安全硬约束", "安全库存、公辅、设备红线无突破", "通过"], ["实际回传", "Historian 只读回传负荷和库存", "待企业接入", "pending"]],
    note: "甲班样例已完成输入冻结、建议生成和人工原计划对照；实际负荷、库存和能耗仍待企业 Historian 授权回传。"
  },
  energy: {
    label: "乙班 · 公辅波动",
    kpis: [["有效班次", "22 / 30", "已完成样例回放"], ["数据完整性", "99.1%", "演示快照口径"], ["硬约束突破", "0 次", "安全闸门结果"], ["实际效果", "待接入", "不以样例冒充现场", "warn"]],
    compare: [["公辅约束", "先吸收蒸汽波动", "按原计划执行", "差异 1 项"], ["下游负荷", "错峰安排高耗能段", "未调整", "待热电复核"], ["约束校核", "6 / 6 通过", "人工记录完整", "可复算"]],
    gates: [["输入快照冻结", "能源价格、蒸汽和电力口径一致", "通过"], ["建议可复算", "同一快照重复计算结果一致", "通过"], ["公辅边界", "热电 APC 目标和平台建议未冲突", "通过"], ["实际回传", "公辅和负荷实际值只读回传", "待企业接入", "pending"]],
    note: "乙班样例重点验证公辅波动下的跨装置排序；平台只提出错峰建议，不替代热电 APC 的局部控制。"
  },
  equipment: {
    label: "丙班 · 压机趋势偏离",
    kpis: [["有效班次", "27 / 30", "已完成样例回放"], ["数据完整性", "97.9%", "演示快照口径"], ["硬约束突破", "0 次", "安全闸门结果"], ["实际效果", "待接入", "不以样例冒充现场", "warn"]],
    compare: [["设备判断", "触发专业复核并限速", "按原负荷观察", "差异 1 项"], ["生产安排", "保留连续生产窗口", "维持当前负荷", "待设备会签"], ["约束校核", "5 / 5 通过", "人工记录完整", "可复算"]],
    gates: [["趋势输入冻结", "振动、轴位移和温度窗口一致", "通过"], ["弱信号解释", "趋势与检查项可追溯", "通过"], ["专业会签", "设备岗位确认是否限负荷", "待会签", "pending"], ["实际回传", "设备和负荷实际值只读回传", "待企业接入", "pending"]],
    note: "丙班样例重点验证“提醒不是联锁”：平台可以提前提出复核和限速建议，是否调整负荷仍由设备与生产专业确认。"
  }
};

let shadowState = { caseId: "tight", recordCreated: false };

function renderShadowCase(caseId = shadowState.caseId) {
  const item = shadowCases[caseId] || shadowCases.tight;
  shadowState.caseId = caseId;
  document.getElementById("shadowCaseLabel").textContent = item.label;
  document.getElementById("shadowKpis").innerHTML = item.kpis.map(([label, value, note, tone]) => `<article class="shadow-kpi ${tone || ""}"><small>${label}</small><strong>${value}</strong><span>${note}</span></article>`).join("");
  document.getElementById("shadowCompareTable").innerHTML = `<table><thead><tr><th>观察项</th><th>平台建议</th><th>人工原计划</th><th>对照结论</th></tr></thead><tbody>${item.compare.map(([name, ai, human, result]) => `<tr><td>${name}</td><td><strong>${ai}</strong></td><td>${human}</td><td>${result}</td></tr>`).join("")}</tbody></table>`;
  document.getElementById("shadowGates").innerHTML = item.gates.map(([name, detail, result, tone]) => `<div class="shadow-gate ${tone || ""}"><i>${tone === "pending" ? "!" : "✓"}</i><div><b>${name}</b><span>${detail}</span></div><em>${result}</em></div>`).join("");
  const hasPending = item.gates.some(row => row[3] === "pending");
  document.getElementById("shadowOverallStatus").textContent = hasPending ? "待补企业回传" : "样例门槛通过";
  document.getElementById("shadowOverallStatus").className = hasPending ? "status-warn" : "status-ok";
  document.getElementById("shadowRecordState").textContent = shadowState.recordCreated ? `已生成 ${item.label} 的本地影子验收记录。${item.note}` : `当前为可复现验收样例：${item.note}`;
}

document.getElementById("loadShadowCase").addEventListener("click", () => {
  shadowState.recordCreated = false;
  renderShadowCase(document.getElementById("shadowCaseSelect").value);
});

document.getElementById("createShadowRecord").addEventListener("click", () => {
  shadowState.recordCreated = true;
  renderShadowCase(document.getElementById("shadowCaseSelect").value);
  events.unshift({ title: "影子运行验收记录已生成", body: `${shadowCases[shadowState.caseId].label}已完成建议与人工原计划对照；实际回传仍待企业授权。` });
  if (events.length > 6) events.pop();
});

document.getElementById("exportShadowRecord").addEventListener("click", () => {
  const item = shadowCases[shadowState.caseId];
  const record = { schema: "shadow-run-acceptance.v1", generatedAt: new Date().toISOString(), sampleOnly: true, case: item.label, kpis: item.kpis, comparison: item.compare, gates: item.gates, boundary: "只读旁路回放；不写DCS/SIS；实际效果待企业Historian回传与专业验收" };
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `shadow-acceptance-${shadowState.caseId}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

renderShadowCase();

const learningCases = {
  allocation: {
    title: "液氨趋紧 · 产供销重排",
    owner: "调度 + 运营",
    reviewed: true,
    reviewer: "调度长、运营和生产已审核",
    summary: "液氨库存下行、硝酸行情走弱，但尿素和复合肥存在刚性订单时，调度如何做去向取舍。",
    fact: "库存接近安全下限；订单交期分化；行情版本已由运营确认；合成回路保持连续生产。",
    decision: "先保刚性订单和连续生产，硝酸按最低稳定负荷复核，外售作为机会成本基准。",
    useWhen: "订单、罐存、价格版本和最低稳定负荷均已确认。",
    doNot: "行情未核价、库存质量异常或装置已接近安全边界时不得直接套用。",
    gates: [["事实完整", "订单、MES计划、罐区和行情版本齐全", "通过"], ["专业审核", "调度长、运营、生产确认判断和边界", "已审核"], ["版本登记", "规则 NH3-ALLOC-003，适用工况已登记", "可复用"]]
  },
  compressor: {
    title: "压机弱信号 · 护机不停产",
    owner: "设备 + 班长",
    reviewed: false,
    reviewer: "待设备专业确认原始趋势与点检结论",
    summary: "压缩机振动、轴位移或防喘振裕度出现持续微弱变化，新手容易把它当成正常波动。",
    fact: "演示样例含多变量趋势和质量码；现场原始测点、持续窗口和点检结果尚未接入。",
    decision: "先提醒复核和限速条件，不直接下达负荷调整，更不替代DCS报警与联锁。",
    useWhen: "测点质量合格、趋势持续同向，且设备专业明确了复核项和撤销条件。",
    doNot: "单一综合指标、质量码异常或未完成专业会签时不得作为学习规则。",
    gates: [["事实完整", "趋势窗口、质量码和点检记录可追溯", "样例通过"], ["专业审核", "设备岗位确认是否限负荷", "待会签", "pending"], ["版本登记", "未形成可复用规则版本", "锁定", "pending"]]
  },
  utilities: {
    title: "公辅波动 · 错峰吸收",
    owner: "热电 + 生产",
    reviewed: true,
    reviewer: "热电、生产和调度已审核",
    summary: "蒸汽、电力或空分余量波动时，不把“最大产量”当成唯一目标，而是把波动吸收到可调整窗口。",
    fact: "公辅约束以只读摘要进入调度层；热电 APC 继续负责局部控制；方案保留恢复窗口。",
    decision: "先识别受限时段，调整高耗能段节奏，保留连续生产和气轮机驱动的恢复条件。",
    useWhen: "能源口径、受限时间窗、公辅余量和装置最低稳定负荷已确认。",
    doNot: "不得将平台建议直接写入热电 APC，也不得因经济排名绕过流程保护。",
    gates: [["事实完整", "公辅余量、时间窗和APC边界齐全", "通过"], ["专业审核", "热电、生产和调度确认错峰逻辑", "已审核"], ["版本登记", "规则 NH3-UTIL-002，撤销条件已登记", "可复用"]]
  }
};

const learningState = { caseId: "allocation", cardGenerated: {}, completed: {}, reviewSubmitted: {} };

function renderLearningCase(caseId = learningState.caseId) {
  const item = learningCases[caseId] || learningCases.allocation;
  learningState.caseId = caseId;
  const reviewed = item.reviewed || learningState.reviewSubmitted[caseId];
  const cardGenerated = Boolean(learningState.cardGenerated[caseId]);
  const completed = Boolean(learningState.completed[caseId]);
  document.getElementById("learningCaseStage").textContent = reviewed ? "已审核 · 可复用" : "待审核 · 仅可追踪";
  document.getElementById("learningCaseStage").classList.toggle("pending", !reviewed);
  document.getElementById("learningCaseTitle").textContent = item.title;
  document.getElementById("learningCaseOwner").textContent = item.owner;
  document.getElementById("learningCaseSummary").textContent = item.summary;
  document.getElementById("learningFact").textContent = item.fact;
  document.getElementById("learningDecision").textContent = item.decision;
  document.getElementById("learningUseWhen").textContent = item.useWhen;
  document.getElementById("learningDoNot").textContent = item.doNot;
  document.getElementById("learningStatus").textContent = cardGenerated ? "已生成学习卡" : reviewed ? "可进入学习库" : "待专业审核";
  document.getElementById("learningGates").innerHTML = item.gates.map(([name, detail, status, tone]) => {
    const isReview = name === "专业审核";
    const isVersion = name === "版本登记";
    const pending = tone === "pending" || (isReview && !reviewed) || (isVersion && !reviewed);
    const shownStatus = isReview && reviewed ? "已审核" : isVersion && reviewed ? "可复用" : status;
    return `<div class="learning-gate ${pending ? "pending" : ""}"><i>${pending ? "!" : "✓"}</i><div><b>${name}</b><span>${detail}</span></div><em>${shownStatus}</em></div>`;
  }).join("");
  document.getElementById("learningProgress").textContent = completed ? "学习完成度 3/3" : cardGenerated ? "学习完成度 1/3" : "学习完成度 0/3";
  document.getElementById("completeLearning").disabled = !cardGenerated || completed;
  document.getElementById("generateLearningCard").disabled = !reviewed;
  document.getElementById("submitLearningCase").disabled = reviewed;
  document.getElementById("learningRecordState").textContent = completed ? `${item.title}学习完成；已记录学习人和完成时间，后续复用仍需按当前班次事实重新核对。` : cardGenerated ? "学习卡已生成，但不会自动改变生产规则；新员工完成后需回到真实班次继续跟班复核。" : item.reviewer + "。";
}

document.getElementById("loadLearningCase").addEventListener("click", () => renderLearningCase(document.getElementById("learningCaseSelect").value));
document.getElementById("submitLearningCase").addEventListener("click", () => {
  const caseId = document.getElementById("learningCaseSelect").value;
  learningState.reviewSubmitted[caseId] = true;
  events.unshift({ title: "案例已提交专业审核", body: `${learningCases[caseId].title}进入审核队列，审核通过前不进入学习库或规则版本。` });
  if (events.length > 6) events.pop();
  renderLearningCase(caseId);
});
document.getElementById("generateLearningCard").addEventListener("click", () => {
  const caseId = document.getElementById("learningCaseSelect").value;
  const item = learningCases[caseId];
  if (!item.reviewed && !learningState.reviewSubmitted[caseId]) return;
  learningState.cardGenerated[caseId] = true;
  events.unshift({ title: "新人学习卡已生成", body: `${item.title}已带审核人、适用条件和禁用条件生成学习卡；未写入DCS/SIS。` });
  if (events.length > 6) events.pop();
  renderLearningCase(caseId);
});
document.getElementById("completeLearning").addEventListener("click", () => {
  const caseId = document.getElementById("learningCaseSelect").value;
  if (!learningState.cardGenerated[caseId]) return;
  learningState.completed[caseId] = true;
  renderLearningCase(caseId);
});
renderLearningCase();
const learningPanel = document.getElementById("learningCaseSelect")?.closest(".panel");
learningPanel?.classList.add("learning-workbench");
if (learningPanel) learningPanel.dataset.view = "execution";
function updateShiftClock() {

  document.getElementById("shiftClock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });

}

updateShiftClock();

setInterval(updateShiftClock, 1000);

pushEvent("recalc", calc(), strategy(calc()));
render();
window.setTimeout(() => syncOfficialMarket(), 650);
