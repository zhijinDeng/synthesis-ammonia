const state = {
  demand: 76,
  energy: 64,
  health: 82,
  inventory: 58,
  green: 34
};

const presets = {
  steady: { demand: 70, energy: 56, health: 84, inventory: 62, green: 38 },
  supply: { demand: 94, energy: 68, health: 80, inventory: 42, green: 30 },
  protect: { demand: 66, energy: 52, health: 56, inventory: 64, green: 36 },
  energy: { demand: 74, energy: 88, health: 80, inventory: 60, green: 58 }
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
  const loadUpper = state.health < 62 ? 76 : 94;
  const load = clamp(
    56 + state.demand * 0.34 - state.energy * 0.12 + state.health * 0.18 - Math.max(0, 50 - state.inventory) * 0.26,
    state.health < 62 ? 50 : 60,
    loadUpper
  );
  const risk = clamp(16 + (100 - state.health) * 0.42 + Math.max(0, 45 - state.inventory) * 0.55 + state.energy * 0.14 - state.green * 0.08, 8, 92);
  const order = clamp(62 + state.demand * 0.28 + load * 0.16 - risk * 0.08, 50, 98);
  const energyGain = clamp(2 + (100 - state.energy) * 0.04 + state.green * 0.08 + Math.max(0, 86 - load) * 0.04, 1, 14);
  const stock = clamp(state.inventory + load * 0.14 - state.demand * 0.09, 24, 96);
  const margin = clamp(1.5 + order * 0.07 + energyGain * 0.26 - state.energy * 0.035 - risk * 0.02, -2, 12);
  const confidence = clamp(94 - risk * 0.23 + state.health * 0.05, 66, 95);
  return {
    load: Math.round(load),
    risk: Math.round(risk),
    order: Math.round(order),
    energyGain: Math.round(energyGain),
    stock: Math.round(stock),
    margin: margin.toFixed(1),
    nh3: Math.round(1950 * load / 100),
    confidence: Math.round(confidence)
  };
}

function strategy(plan) {
  if (state.health < 62) {
    return {
      mode: "护机稳产",
      title: "压缩负荷上限，优先保护循环压缩机与合成塔温升边界",
      text: `设备健康评分降至 ${state.health}，建议合成回路控制在 ${plan.load}% 左右，插入点检窗口，液氨外售只保留合同刚性部分。`
    };
  }
  if (state.demand > 86 && state.inventory < 55) {
    return {
      mode: "保供补氨",
      title: "提高合成负荷补液氨库存，优先兑现尿素溶液与复合肥用氨",
      text: `下游订单压力高且库存偏紧，目标负荷 ${plan.load}%，夜间补安全库存，白班优先保障高优订单。`
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
    text: `当前订单、库存和设备状态匹配，建议目标负荷 ${plan.load}%，重点跟踪氢氮比、床层温升、压缩机效率和罐区压力。`
  };
}

function scenarios(plan) {
  const steady = { id: "稳氨", load: clamp(plan.load - 2, 58, 90), risk: plan.risk - 4, margin: Number(plan.margin) - 0.4, body: "保持合成回路平稳，减少频繁升降负荷带来的能耗和设备扰动。" };
  const supply = { id: "保供", load: clamp(plan.load + 5, 62, state.health < 62 ? 76 : 95), risk: plan.risk + 7, margin: Number(plan.margin) + 0.6, body: "优先保障尿素溶液、复合肥和联碱配套用氨，液氨外售降为弹性池。" };
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
    { title: "循环压缩机健康", body: state.health < 68 ? "限制升负荷速率，插入点检窗口。" : "压缩机余量可支撑当前目标负荷。", level: state.health < 68 ? "warn" : "good" },
    { title: "液氨库存", body: state.inventory < 48 ? "库存偏紧，冻结弹性外售并优先补安全库存。" : "库存支持下游消纳和短时错峰。", level: state.inventory < 48 ? "warn" : "good" },
    { title: "能源窗口", body: state.energy > 80 ? "高价窗口触发错峰策略，需核对蒸汽和电力口径。" : "能源成本允许维持经济负荷。", level: state.energy > 80 ? "warn" : "good" },
    { title: "模型可信度", body: plan.confidence < 75 ? "仅输出备选方案，不回写MES计划。" : "可进入影子运行或低风险确认流程。", level: plan.confidence < 75 ? "danger" : "good" }
  ];
}

function interfaceMap(plan) {
  return [
    { title: "DCS historian", body: "读取负荷、温度、压力、流量、电耗、蒸汽和关键约束余量；不直接写控制参数。", tag: "5-15分钟聚合" },
    { title: "APC/MPC", body: `把班次目标负荷 ${plan.load}% 转为连续负荷建议、升降速率限制和约束余量说明。`, tag: "控制层只读对话" },
    { title: "RTO", body: `以吨氨收益 ${plan.margin}%、能源窗口、库存占用和订单延期成本形成经济目标。`, tag: "经济优化" },
    { title: "MES/ERP", body: "审批通过后写计划摘要、订单优先级、交接说明和复盘结果。", tag: "管理层闭环" }
  ];
}

function models(plan) {
  return [
    { title: "机理边界", body: "氢氮比、合成塔温升、循环气量、罐区压力和最低稳定负荷作为硬约束。", tag: "先守边界" },
    { title: "PINN反应器校准", body: "用历史工况和热力学守恒约束校准反应器响应，减少纯经验拟合偏差。", tag: "反应器可信" },
    { title: "设备健康预测", body: state.health < 68 ? "健康评分偏低，护机方案优先级上升。" : "设备状态支持当前影子运行。", tag: `健康 ${state.health}` },
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
    { title: "采纳方案核算", body: `仅当方案被采纳并执行，才核算吨氨收益 ${plan.margin}%、能耗优化 ${plan.energyGain}% 和库存变化。`, level: "good" },
    { title: "外部因素剔除", body: "检修、物流异常、订单临时取消和行情自然上涨单独标记，不进入系统收益。", level: "warn" }
  ];
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
    { title: "互动卡片", body: `发送到${contract.card.target_chat}，按钮回传采纳、复核或驳回原因。`, tag: "im:message" },
    { title: "负荷审批", body: `审批定义：${contract.approval.definition}；当前风险走“${contract.card.fields.approval_path}”。`, tag: "approval" },
    { title: "多维表格复盘", body: `写入${contract.base_record.table}，字段包含班次、目标负荷、采纳状态、执行偏差和未采纳原因。`, tag: "base" },
    { title: "飞书任务", body: `${contract.task.title}，本班结束前完成负荷、收益和异常复核。`, tag: "task" },
    { title: "事件回调", body: "卡片点击、审批状态、复盘表变更统一进入后端事件队列，按幂等键入库。", tag: "event" },
    { title: "Aily问答", body: "调度员可追问“为什么不升负荷”“驳回原因是否影响下次建议”等现场问题。", tag: "Aily" }
  ];
  document.getElementById("feishuHub").innerHTML = cards.map(item => `
    <article>
      <b>${item.title}</b>
      <span>${item.body}</span>
      <em class="tag">${item.tag}</em>
    </article>
  `).join("");
  document.getElementById("feishuPayload").textContent = JSON.stringify(contract, null, 2);
}

function knowledge(plan) {
  return [
    { title: "合成负荷指令库", body: `输入快照、目标负荷 ${plan.load}%、审批人、采纳状态和实际偏差进入统一记录。`, level: "good" },
    { title: "异常经验库", body: "沉淀氢氮比偏差、床层温升异常、压缩机健康下降和液氨库存偏低场景。", level: "good" },
    { title: "未采纳原因库", body: "把安全边界、设备风险、订单变化、数据不可信和经验判断结构化。", level: "warn" },
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

function dataInterfaces() {
  return [
    { title: "MES", body: "日计划、班次产量、执行偏差、偏差原因。", level: "good" },
    { title: "ERP", body: "订单、交期、客户优先级、价格口径。", level: "good" },
    { title: "DCS historian", body: "负荷、温度、压力、流量、电耗、蒸汽摘要。", level: "good" },
    { title: "罐区/EAM", body: "液氨库存、罐区压力、装车窗口、设备健康评分。", level: "good" }
  ];
}

function roadmap() {
  return [
    { title: "30天", body: "统一数据口径、变量映射、飞书协同字段和班次事实表。" },
    { title: "60天", body: "影子运行，对比人工调度，记录采纳与未采纳原因。" },
    { title: "90天", body: "低风险小闭环验收，形成收益归因和停用条件报告。" }
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
    bitable: "已写入班后复盘样例"
  };
  const detail = {
    recalc: `${text.mode}，目标负荷 ${plan.load}%，风险 ${plan.risk}，置信度 ${plan.confidence}%。`,
    card: `发送至合成氨当班调度群，包含负荷、风险、约束和确认按钮。`,
    approval: `审批通过后只写MES计划、交接摘要和复盘记录，不写DCS/SIS。`,
    bitable: `沉淀采纳状态、未采纳原因、执行偏差和班长备注。`
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
  document.getElementById("operatorNote").textContent = `当前建议：${text.mode}；审批路径：${plan.risk > 55 ? "班长+调度主管" : "班长确认"}；回写范围限定为MES计划、交接摘要和复盘记录。`;
  document.getElementById("constraintCount").textContent = `${constraints(plan).length}项`;
  document.getElementById("modelTrust").textContent = plan.confidence < 75 ? "仅规则提醒" : "可影子运行";
  document.getElementById("shiftSummary").textContent = `${text.mode}｜24h`;
  renderScenarioCards(plan);
  renderList("interfaceMap", interfaceMap(plan));
  renderList("modelCards", models(plan));
  renderGantt(schedule(plan));
  renderList("constraints", constraints(plan));
  renderList("benefitTrace", benefitTrace(plan));
  document.getElementById("feishuPreview").innerHTML = feishu(plan, text);
  renderFeishuHub(plan, text);
  renderList("knowledgeLoop", knowledge(plan));
  renderList("roleViews", roleViews(plan));
  renderList("dataInterfaces", dataInterfaces());
  document.getElementById("pilotRoadmap").innerHTML = roadmap().map(item => `<article><b>${item.title}</b><span>${item.body}</span></article>`).join("");
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

pushEvent("recalc", calc(), strategy(calc()));
render();
