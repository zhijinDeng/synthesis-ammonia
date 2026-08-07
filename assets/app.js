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
  const priceLift = (state.ammoniaPrice - 2000) / 180;
  const margin = clamp(1.0 + order * 0.06 + priceLift + energyGain * 0.24 - state.energy * 0.035 - risk * 0.02, -4, 15);
  const confidence = clamp(94 - risk * 0.23 + state.health * 0.05, 66, 95);
  return {
    load: Math.round(load),
    risk: Math.round(risk),
    order: Math.round(order),
    energyGain: Math.round(energyGain),
    stock: Math.round(stock),
    margin: margin.toFixed(1),
    nh3: Math.round(1950 * load / 100),
    confidence: Math.round(confidence),
    dataCompleteness: state.compressorDrift > 85 ? 91.2 : 97.4
  };
}

function strategy(plan) {
  if (state.health < 62 || state.compressorDrift > 60) {
    return {
      mode: "护机稳产",
      title: "压缩负荷上限，优先保护循环压缩机与合成塔温升边界",
      text: `设备健康 ${state.health}、压机弱信号 ${state.compressorDrift}，建议合成回路控制在 ${plan.load}% 左右，先复核振动、轴位移和喘振裕度，再决定是否继续降负荷。`
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
    text: `液氨行情 ${state.ammoniaPrice} 元/吨、硝酸趋势 ${state.nitricTrend}%；建议目标负荷 ${plan.load}%，重点跟踪下游贡献排序、氢氮比、床层温升和压机趋势。`
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
    { title: "合成塔床层温升", body: state.health < 62 ? "设备健康下降，温升和热点偏差需要班长复核。" : "未触发硬约束，继续监控温升趋势。", level: state.health < 62 ? "danger" : "good" },
    { title: "循环压缩机健康", body: state.health < 68 || state.compressorDrift > 35 ? `健康 ${state.health}、弱信号 ${state.compressorDrift}；限制升负荷速率并插入点检窗口。` : "压缩机余量可支撑当前目标负荷。", level: state.health < 68 || state.compressorDrift > 35 ? "warn" : "good" },
    { title: "液氨库存", body: state.inventory < 48 ? "库存偏紧，冻结弹性外售并优先补安全库存。" : "库存支持下游消纳和短时错峰。", level: state.inventory < 48 ? "warn" : "good" },
    { title: "能源窗口", body: state.energy > 80 ? "高价窗口触发错峰策略，需核对蒸汽和电力口径。" : "能源成本允许维持经济负荷。", level: state.energy > 80 ? "warn" : "good" },
    { title: "模型可信度", body: plan.confidence < 75 ? "仅输出备选方案，不回写MES计划。" : "可进入影子运行或低风险确认流程。", level: plan.confidence < 75 ? "danger" : "good" }
  ];
}

function interfaceMap(plan) {
  return [
    { title: "DCS historian", body: "读取负荷、温度、压力、流量、电耗、蒸汽和关键约束余量；不直接写控制参数。", tag: "5-15分钟聚合" },
    { title: "APC/MPC", body: `把班次目标负荷 ${plan.load}% 转为连续负荷建议、升降速率限制和约束余量说明。`, tag: "控制层只读对话" },
    { title: "RTO", body: `以边际贡献 ${plan.margin}%、固定成本吸收、能源窗口、库存占用和订单延期成本形成经济目标。`, tag: "经济优化" },
    { title: "MES/ERP", body: "审批通过后写计划摘要、订单优先级、交接说明和复盘结果。", tag: "管理层闭环" }
  ];
}

function models(plan) {
  return [
    { title: "机理边界", body: "氢氮比、合成塔温升、循环气量、罐区压力和最低稳定负荷作为硬约束。", tag: "先守边界" },
    { title: "PINN反应器校准", body: "用历史工况和热力学守恒约束校准反应器响应，减少纯经验拟合偏差。", tag: "反应器可信" },
    { title: "设备弱信号预测", body: state.health < 68 || state.compressorDrift > 35 ? "多变量趋势偏离，护机方案优先级上升；先检查再决策。" : "设备状态支持当前影子运行。", tag: `健康 ${state.health} / 弱信号 ${state.compressorDrift}` },
    { title: "漂移与回滚", body: plan.confidence < 75 ? "置信度偏低，自动降级为规则提醒。" : "置信度满足影子运行记录要求。", tag: `置信度 ${plan.confidence}%` }
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

function benefitTrace(plan) {
  return [
    { title: "原计划保留", body: "保留调度员原计划作为反事实基线，不把市场价格自然波动算作系统收益。", level: "good" },
    { title: "边际贡献核算", body: `先看是否覆盖变动成本，再看可吸收多少折旧、固定人工和公辅摊销；当前贡献 ${plan.margin}%。`, level: "good" },
    { title: "采纳方案核算", body: `仅当方案被采纳并执行，才核算边际贡献、能耗优化 ${plan.energyGain}%、库存变化和停开成本差异。`, level: "good" },
    { title: "售价低于完全成本", body: "若仍有正边际贡献、能带走固定成本或维持战略订单，可继续开；若占用稀缺液氨且贡献为负，则触发降负荷/停产评估。", level: "warn" },
    { title: "外部因素剔除", body: "检修、物流异常、订单临时取消和行情自然上涨单独标记，不进入系统收益。", level: "warn" }
  ];
}

function allocationRows(plan) {
  const scarce = state.inventory < 50 || state.demand > 86;
  const externalMargin = Math.round(state.ammoniaPrice - 1940 - state.energy * 1.3);
  const nitricMargin = Math.round(180 + state.nitricTrend * 18 - state.energy * 0.8);
  const rows = [
    { name: "复合肥刚性订单", demand: `${Math.round(72 + state.demand * 0.22)}%`, margin: Math.round(420 + state.demand * 1.3), restart: "连续消纳 / 客户交期", action: "保", why: "订单与产业链协同" },
    { name: "尿素溶液", demand: `${Math.round(68 + state.demand * 0.18)}%`, margin: Math.round(330 + state.demand), restart: "稳定消纳 / 降负荷受限", action: "保", why: "稳定主流程" },
    { name: "纯碱配套", demand: `${Math.round(60 + state.demand * 0.16)}%`, margin: Math.round(255 + state.demand * 0.7), restart: "联碱联动 / 6-10h", action: scarce ? "稳" : "保", why: "跨装置平衡" },
    { name: "硝酸", demand: `${Math.round(64 + state.nitricTrend)}%`, margin: nitricMargin, restart: "降负荷优先 / 4-8h", action: nitricMargin < 80 ? "降" : "稳", why: state.nitricTrend < 0 ? "行情走弱" : "边际贡献尚可" },
    { name: "液氨外售", demand: `${state.ammoniaPrice}元/t`, margin: externalMargin, restart: "弹性池 / 无启停", action: scarce ? "限" : externalMargin > 160 ? "保" : "降", why: "机会成本比较" },
    { name: "外采液氨", demand: `${state.ammoniaPrice + 80}元/t`, margin: -Math.round(80 + state.energy * 0.3), restart: "物流与到货风险", action: state.inventory < 38 && state.demand > 88 ? "询价" : "不采", why: "仅保刚性订单" }
  ];
  return rows.sort((a, b) => b.margin - a.margin);
}

function eventQueue(plan) {
  const events = [];
  if (state.inventory < 52 || state.demand > 86) {
    events.push({ level: "p1", source: "MES / 罐区", title: "液氨可分配量趋紧", body: `库存 ${state.inventory}%、订单压力 ${state.demand}；需在复合肥、尿素溶液、纯碱、硝酸和外售间重排。`, impact: "影响未来8小时", owner: "调度长", action: "打开分配表" });
  } else {
    events.push({ level: "p2", source: "ERP / MES", title: "下游消纳结构可优化", body: `液氨库存 ${state.inventory}%，可按单位液氨贡献微调去向，不改变主流程节奏。`, impact: `预计贡献 +${plan.margin}%`, owner: "生产调度", action: "核对订单" });
  }
  if (state.compressorDrift > 35 || state.health < 68) {
    events.push({ level: "p1", source: "SMC / 机组", title: "循环压缩机弱信号抬升", body: `弱信号 ${state.compressorDrift}、健康 ${state.health}；先查振动、轴位移、入口条件和喘振裕度。`, impact: "可能触发护机降负荷", owner: "设备工程师", action: "发起复核" });
  } else {
    events.push({ level: "p3", source: "SMC / 机组", title: "关键机组趋势稳定", body: `弱信号 ${state.compressorDrift}，未越黄灯阈值；继续观察多变量同向漂移。`, impact: "无即时负荷限制", owner: "设备值班", action: "继续监视" });
  }
  events.push({ level: state.energy > 80 ? "p1" : "p2", source: "热电 APC", title: state.energy > 80 ? "高价能源窗口临近" : "公辅供给处于可调区", body: state.energy > 80 ? "建议压低边际产量，低价窗口补回库存，避免频繁升降负荷。" : "蒸汽、电力和循环水余量支持当前方案。", impact: state.energy > 80 ? "未来4小时成本上升" : `节能空间 ${plan.energyGain}%`, owner: "公辅调度", action: "核对能源窗口" });
  return events.sort((a, b) => a.level.localeCompare(b.level));
}

function renderEventQueue(plan) {
  const items = eventQueue(plan);
  document.getElementById("eventQueueCount").textContent = `${items.filter(item => item.level !== "p3").length}项待处置`;
  document.getElementById("eventQueue").innerHTML = items.map(item => `
    <article class="${item.level}">
      <div><em>${item.level.toUpperCase()}</em><span>${item.source}</span></div>
      <b>${item.title}</b><p>${item.body}</p>
      <footer><span>${item.impact}</span><span>责任：${item.owner}</span><button type="button" data-queue-action="${item.action}">${item.action}</button></footer>
    </article>
  `).join("");
}

function renderAllocation(plan) {
  document.getElementById("allocationTable").innerHTML = allocationRows(plan).map(row => `
    <tr><td><b>${row.name}</b></td><td>${row.demand}</td><td class="${row.margin < 0 ? "negative" : "positive"}">${row.margin > 0 ? "+" : ""}${row.margin} 元/t-NH3</td><td>${row.restart}</td><td><span class="decision-pill ${row.action === "降" || row.action === "限" || row.action === "不采" ? "warn" : "good"}">${row.action}</span></td><td>${row.why}</td></tr>
  `).join("");
}

function executionMonitor(plan) {
  const actual = clamp(plan.load - (state.compressorDrift > 60 ? 5 : 2), 50, 95);
  const deviation = actual - plan.load;
  return [
    { label: "班长确认", status: plan.risk > 55 ? "待主管复核" : "已确认", value: plan.risk > 55 ? "高风险双签" : "低风险单签", level: plan.risk > 55 ? "warn" : "good" },
    { label: "目标负荷", status: `${plan.load}%`, value: "仅回写MES班次计划", level: "good" },
    { label: "DCS实际负荷", status: `${actual}%`, value: `偏差 ${deviation > 0 ? "+" : ""}${deviation}pct`, level: Math.abs(deviation) > 3 ? "warn" : "good" },
    { label: "效果复核", status: "班末完成", value: `收益、能耗、库存、异常四项归因`, level: "pending" }
  ];
}

function renderExecution(plan) {
  const rows = executionMonitor(plan);
  document.getElementById("executionState").textContent = rows[0].status;
  document.getElementById("executionMonitor").innerHTML = rows.map((row, index) => `
    <article class="${row.level}"><i>${index + 1}</i><div><b>${row.label}</b><span>${row.value}</span></div><strong>${row.status}</strong></article>
  `).join("");
}

function freshness() {
  return [
    { title: "DCS / IoT", body: "18-45秒，关键过程点完整；可参与重算。", level: "good" },
    { title: "MES / ERP", body: "4-9分钟，订单和班次执行口径一致。", level: "good" },
    { title: "热电 APC", body: "2分钟，蒸汽和公辅约束可用。", level: "good" },
    { title: "市场行情", body: "23分钟，仅用于提醒；重算前需运营人员确认价格。", level: "warn" }
  ];
}

function aiAnswer(question, plan) {
  const answers = {
    nitric: `当前不建议硝酸满负荷。硝酸行情趋势为 ${state.nitricTrend}%，单位液氨演示贡献已降至 ${allocationRows(plan).find(row => row.name === "硝酸").margin} 元/t-NH3；同时液氨库存为 ${state.inventory}%。建议先保复合肥刚性订单和尿素溶液，硝酸维持最低经济负荷，4小时后按新价格与库存重算。依据：[产供销全线事实表] [MES订单] [罐区库存]。`,
    allocation: `液氨价格 ${state.ammoniaPrice} 元/吨时，不能只看售价。当前排序先看安全与流程连续，再比较单位液氨边际贡献、固定成本吸收和启停损失。建议保复合肥刚性订单、尿素溶液和联碱连续消纳；硝酸随行情降负荷；外售作为弹性池。只有库存跌破38%且刚性订单缺口扩大时才询价外采。依据：[ERP订单] [边际贡献模型] [启停损失规则]。`,
    compressor: `压机弱信号为 ${state.compressorDrift}、健康评分 ${state.health}。若弱信号超过60或多变量连续同向漂移，先限制升负荷速率，核查振动、轴位移、入口温压和喘振裕度，并通知设备工程师；超过70时优先切换护机方案。AI只给黄灯和处置顺序，不触发联锁或开停车。依据：[SMC压机趋势] [DCS摘要] [设备处置卡]。`
  };
  return answers[question] || answers.allocation;
}

function feishu(plan, text) {
  return `
    <div class="feishu-card">
      <h3>${text.mode}｜合成氨负荷调整</h3>
      <p>${text.title}</p>
      <div class="field-grid">
        <span><b>目标负荷</b>${plan.load}%</span>
        <span><b>风险指数</b>${plan.risk}</span>
        <span><b>审批路径</b>${plan.risk > 55 ? "班长+调度主管" : "班长确认"}</span>
        <span><b>回写范围</b>MES计划/交接/复盘</span>
        <span><b>多维表格</b>班次事实与未采纳原因</span>
        <span><b>Aily追问</b>约束解释/异常处置</span>
      </div>
    </div>
    <article><b>事件回调</b><span>接收卡片点击、审批通过/驳回、复盘提交，写入合成负荷指令库。</span><em class="tag">需签名校验</em></article>
  `;
}

function feishuContract(plan, text) {
  const riskPath = plan.risk > 55 ? "班长确认 → 调度主管复核 → 安环知会" : "班长确认";
  return {
    card: {
      target_chat: "合成氨当班调度群",
      title: `${text.mode}｜合成氨负荷调整建议`,
      buttons: ["采纳并发起审批", "要求复核", "驳回并填写原因"],
      fields: {
        target_load_percent: plan.load,
        risk_index: plan.risk,
        confidence_percent: plan.confidence,
        approval_path: riskPath
      }
    },
    approval: {
      definition: "ammonia_load_adjustment",
      form_fields: ["班次", "目标负荷", "约束解释", "风险等级", "预计收益", "回写范围"],
      write_back_after_approved: ["MES班次计划", "交接班摘要", "飞书多维表格复盘"]
    },
    base_record: {
      table: "合成氨调度复盘库",
      key_fields: ["shift_id", "scenario", "target_load", "accepted", "reject_reason", "actual_delta", "operator_note"],
      current_sample: {
        shift_id: "NH3-20260804-D",
        scenario: text.mode,
        target_load: `${plan.load}%`,
        expected_margin: `${plan.margin}%`,
        risk_index: plan.risk
      }
    },
    task: {
      title: "跟踪负荷调整执行效果",
      owners: ["调度员", "班长", "设备工程师"],
      due: "本班结束前",
      checklist: ["确认DCS historian实际负荷", "记录未采纳原因", "班后复盘收益归因"]
    },
    callback: {
      events: ["im.message.receive_v1", "card.action.trigger", "approval.instance.status_changed", "bitable.record.changed"],
      guardrails: ["签名校验", "幂等键", "DCS/SIS只读", "低置信度自动降级人工"]
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
    { title: "班组卡片", body: `把“${text.mode}”建议送入确认链，回传采纳、复核或驳回原因。`, tag: "飞书消息" },
    { title: "负荷审批", body: `当前风险走“${contract.card.fields.approval_path}”，通过后只回写MES摘要。`, tag: "人工把关" },
    { title: "在线复盘库", body: `真实 Base 已建立13个字段和3条完整样例，记录目标、实际、偏差与未采纳原因。`, tag: "在线可打开" },
    { title: "执行任务", body: `真实任务清单已建立，用于跟踪负荷、收益、异常和班后复盘。`, tag: "责任到人" },
    { title: "飞书 AI", body: "回答必须标出班次事实、设备趋势和规则来源；无依据时转人工复核。", tag: "有源回答" },
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
    { title: "周度校准", body: "高风险、高偏差、高价值样本进入模型校准和专家规则修订队列。", level: "good" }
  ];
}

function roleViews(plan) {
  return [
    { title: "调度员", body: "看三案差异、订单优先级、库存影响和能耗收益。", level: "good" },
    { title: "班长", body: `确认目标负荷 ${plan.load}%、风险 ${plan.risk} 和交接摘要。`, level: plan.risk > 55 ? "warn" : "good" },
    { title: "设备", body: "关注压缩机、合成塔、换热器和点检窗口。", level: state.health < 68 ? "warn" : "good" },
    { title: "安环", body: "确认罐区压力、安全库存、重大危险源和环保指标。", level: "good" }
  ];
}

function decisionRules(plan) {
  const continuityRisk = state.demand > 84 || state.inventory < 45 || state.energy > 78;
  const equipmentRisk = state.health < 62 || plan.risk > 62;
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
      body: "确需中断时比较停空分、停合成气轮机或停下游装置的重启时间、废料和影响范围；已验证场景优先保气轮机驱动关键系统，停空分需班长/主管确认。",
      level: "warn"
    }
  ];
}

function dataInterfaces() {
  return [
    { title: "MES/合成氨调控平台", body: "承接日计划、班次执行、负荷调整记录和交接复盘；厂商名称按口述待企业确认。", level: "good" },
    { title: "IoT数据平台", body: "采集合成氨DCS底层过程数据，进入班次事实表和弱信号趋势分析。", level: "good" },
    { title: "合成氨DCS", body: "负责主装置局部回路、顺控、报警和联锁；AI只读取historian摘要。", level: "good" },
    { title: "和利时DCS/热电APC", body: "提供热电、公辅和蒸汽管网约束，APC结果用于跨装置负荷联动。", level: "good" },
    { title: "SMC压机/康迪森机组", body: "压缩机、气轮机驱动系统和关键机组健康趋势，用于护机和特殊停机取舍。", level: state.health < 68 ? "warn" : "good" }
  ];
}

function renderList(id, items) {
  document.getElementById(id).innerHTML = items.map(item => `<article class="${item.level || ""}"><b>${item.title}</b><span>${item.body}</span>${item.tag ? `<em class="tag">${item.tag}</em>` : ""}</article>`).join("");
}

function renderScenarioCards(plan) {
  const compare = scenarios(plan);
  document.getElementById("bestPlan").textContent = `优选：${compare.best}`;
  document.getElementById("scenarioCards").innerHTML = compare.list.map(item => `
    <article class="scenario ${item.id === compare.best ? "best" : ""}">
      <b>${item.id}方案</b>
      <p>${item.body}</p>
      <div class="mini-kpis">
        <span>负荷 ${item.load}%</span>
        <span>收益 ${item.margin}%</span>
        <span>风险 ${item.risk}</span>
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

function pushEvent(kind, plan, text) {
  const labels = {
    recalc: "已重算三案",
    card: "已生成飞书互动卡片草稿",
    approval: "已生成负荷调整审批草稿",
    bitable: "已写入班后复盘样例",
    task: "已生成飞书执行任务",
    review: "已生成复盘记录"
  };
  const detail = {
    recalc: `${text.mode}，目标负荷 ${plan.load}%，风险 ${plan.risk}，置信度 ${plan.confidence}%。`,
    card: `发送至合成氨当班调度群，包含负荷、风险、约束和确认按钮。`,
    approval: `审批通过后只写MES计划、交接摘要和复盘记录，不写DCS/SIS。`,
    bitable: `沉淀采纳状态、未采纳原因、执行偏差和班长备注。`,
    task: `责任人、检查项和班末复核要求已按当前方案生成。`,
    review: `当前输入、判断依据、采纳状态和效果指标已进入复盘草稿。`
  };
  events.unshift({ title: labels[kind] || "已记录动作", body: detail[kind] || "" });
  if (events.length > 6) events.pop();
}

function renderEvents() {
  document.getElementById("eventLog").innerHTML = events.map(item => `<div><b>${item.title}</b>${item.body}</div>`).join("");
}

function render() {
  const plan = calc();
  const text = strategy(plan);
  Object.keys(state).forEach(key => {
    const output = document.getElementById(`${key}Out`);
    if (output) output.textContent = state[key];
  });
  document.getElementById("modeLabel").textContent = text.mode;
  document.getElementById("strategyTitle").textContent = text.title;
  document.getElementById("strategyText").textContent = text.text;
  document.getElementById("loadKpi").textContent = `${plan.load}%`;
  document.getElementById("nh3Kpi").textContent = `${plan.nh3.toLocaleString()}t`;
  document.getElementById("marginKpi").textContent = `${plan.margin > 0 ? "+" : ""}${plan.margin}%`;
  document.getElementById("riskKpi").textContent = plan.risk;
  document.getElementById("dataCompleteness").textContent = `数据完整度 ${plan.dataCompleteness}%`;
  document.getElementById("operatorNote").textContent = `当前建议：${text.mode}；审批路径：${plan.risk > 55 ? "班长+调度主管" : "班长确认"}；回写范围限定为MES计划、交接摘要和复盘记录。`;
  document.getElementById("constraintCount").textContent = `${constraints(plan).length}项`;
  document.getElementById("modelTrust").textContent = plan.confidence < 75 ? "仅规则提醒" : "可影子运行";
  document.getElementById("shiftSummary").textContent = `${text.mode}｜24h`;
  renderEventQueue(plan);
  renderAllocation(plan);
  renderScenarioCards(plan);
  renderList("interfaceMap", interfaceMap(plan));
  renderList("modelCards", models(plan));
  renderGantt(schedule(plan));
  renderExecution(plan);
  renderList("constraints", constraints(plan));
  renderList("benefitTrace", benefitTrace(plan));
  document.getElementById("feishuPreview").innerHTML = feishu(plan, text);
  renderFeishuHub(plan, text);
  renderList("knowledgeLoop", knowledge(plan));
  renderList("roleViews", roleViews(plan));
  renderList("decisionRules", decisionRules(plan));
  renderList("dataInterfaces", dataInterfaces());
  renderList("freshness", freshness());
  if (!document.getElementById("aiAnswer").dataset.question) {
    document.getElementById("aiAnswer").dataset.question = "allocation";
  }
  document.getElementById("aiAnswer").textContent = aiAnswer(document.getElementById("aiAnswer").dataset.question, plan);
  renderEvents();
}

document.querySelectorAll("input[type='range']").forEach(input => {
  input.addEventListener("input", event => {
    state[event.target.dataset.key] = Number(event.target.value);
    render();
  });
});

document.querySelectorAll("[data-preset]").forEach(button => {
  button.addEventListener("click", event => {
    Object.assign(state, presets[event.target.dataset.preset]);
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
    pushEvent(event.target.dataset.action, plan, text);
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
  const button = event.target.closest("[data-queue-action]");
  if (!button) return;
  const plan = calc();
  const text = strategy(plan);
  pushEvent("card", plan, text);
  document.getElementById("feishuLiveState").textContent = `${button.dataset.queueAction}｜已转飞书协同草稿`;
  render();
});

pushEvent("recalc", calc(), strategy(calc()));
render();
