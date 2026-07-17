const state = {
  demand: 76,
  energy: 64,
  health: 82,
  inventory: 58,
  green: 34,
  market: 61
};

const presets = {
  nightPlan: { demand: 58, energy: 42, health: 84, inventory: 64, green: 48, market: 45 },
  peakPlan: { demand: 92, energy: 70, health: 80, inventory: 46, green: 31, market: 74 },
  safePlan: { demand: 68, energy: 55, health: 57, inventory: 62, green: 38, market: 52 }
};

const operatorEvents = [];

const scheduleColors = {
  synth: "#2477b3",
  storage: "#2fbf71",
  downstream: "#f4b942",
  maintenance: "#d95c59"
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calcPlan() {
  const load = clamp(
    56 + state.demand * 0.32 - state.energy * 0.13 + state.health * 0.18 - Math.max(0, 48 - state.inventory) * 0.2,
    state.health < 62 ? 52 : 60,
    state.health < 68 ? 78 : 94
  );

  const risk = clamp(
    18 + (100 - state.health) * 0.35 + Math.max(0, 45 - state.inventory) * 0.42 + state.energy * 0.14 + state.market * 0.16,
    8,
    92
  );

  const order = clamp(64 + state.demand * 0.28 + load * 0.16 - risk * 0.08, 58, 98);
  const energyGain = clamp(2 + (100 - state.energy) * 0.05 + state.green * 0.09 + (100 - load) * 0.04, 2, 14);
  const carbonGain = clamp(1 + state.green * 0.13 + energyGain * 0.35, 2, 18);
  const stock = clamp(state.inventory + load * 0.16 - state.demand * 0.08, 28, 96);
  const margin = clamp(1.8 + order * 0.08 + energyGain * 0.22 - state.energy * 0.04 - risk * 0.025, -2, 13);
  const nh3 = Math.round(1950 * load / 100);
  const confidence = clamp(95 - risk * 0.22 + state.health * 0.06, 68, 95);

  return {
    load: Math.round(load),
    risk: Math.round(risk),
    order: Math.round(order),
    energyGain: Math.round(energyGain),
    carbonGain: Math.round(carbonGain),
    stock: Math.round(stock),
    margin: margin.toFixed(1),
    nh3,
    confidence: Math.round(confidence)
  };
}

function strategy(plan) {
  if (state.health < 62) {
    return {
      mode: "设备保守",
      title: "降低负荷，优先保护压缩机和合成塔温升窗口",
      text: `关键设备健康只有 ${state.health}，建议合成回路控制在 ${plan.load}% 左右，把高优订单让给库存和下游缓冲，安排短窗口点检，避免为追产放大非计划停车风险。`
    };
  }

  if (state.demand > 84 && state.inventory < 55) {
    return {
      mode: "订单冲刺",
      title: "高负荷补库存，优先兑现尿浆与复合肥订单",
      text: `订单压力高且液氨库存偏紧，建议 ${plan.load}% 负荷运行，夜间补库存，白班向尿浆和复合肥线倾斜，外售液氨只保留合同刚性部分。`
    };
  }

  if (state.energy > 78) {
    return {
      mode: "能耗约束",
      title: "错峰生产，压缩高价能源窗口的边际产量",
      text: `能源价格压力达到 ${state.energy}，建议把可延后订单移到低价时段，合成回路维持 ${plan.load}%，用库存满足下游短时需求。`
    };
  }

  return {
    mode: "经济最优",
    title: "保持高负荷，优先保障尿浆与复合肥订单",
    text: `当前订单压力和设备状态匹配，建议合成回路维持 ${plan.load}% 负荷，夜间避开高价电窗口补库存，白班向尿浆和复合肥线倾斜。`
  };
}

function buildDecisions(plan) {
  const items = [
    {
      title: `合成回路 ${plan.load}%`,
      body: state.health < 62 ? "触发设备保守负荷上限，保护催化剂床层与循环压缩机。" : "兼顾订单交付、能耗与库存安全的推荐负荷。",
      level: state.health < 62 ? "danger" : ""
    },
    {
      title: `日产氨 ${plan.nh3.toLocaleString()} t`,
      body: "按 70 万吨/年装置折算，作为班次级计划口径。",
      level: ""
    },
    {
      title: `订单满足率 ${plan.order}%`,
      body: state.demand > 84 ? "尿浆和复合肥订单优先，液氨外售降为弹性池。" : "下游需求可在当前库存水位下平衡。",
      level: state.demand > 84 ? "warn" : ""
    },
    {
      title: `风险指数 ${plan.risk}`,
      body: plan.risk > 60 ? "需要班长确认设备点检、罐区压力和能耗边界。" : "主要约束处于可控区间。",
      level: plan.risk > 60 ? "danger" : ""
    }
  ];

  return items;
}

function buildSchedule(plan) {
  const highDemand = state.demand > 82;
  const lowHealth = state.health < 62;
  const highEnergy = state.energy > 75;
  const rows = [
    {
      label: "合成",
      bars: [
        { text: `${plan.load}% 稳产`, start: 0, width: highEnergy ? 42 : 58, type: "synth" },
        { text: highEnergy ? "错峰补产" : "负荷微调", start: highEnergy ? 64 : 62, width: highEnergy ? 30 : 30, type: "synth" }
      ]
    },
    {
      label: "罐区",
      bars: [
        { text: "补安全库存", start: 8, width: highDemand ? 48 : 34, type: "storage" },
        { text: "外售弹性", start: 68, width: 22, type: "storage" }
      ]
    },
    {
      label: "下游",
      bars: [
        { text: highDemand ? "尿浆优先" : "复合肥平衡", start: 16, width: highDemand ? 44 : 36, type: "downstream" },
        { text: "复合肥包装", start: 62, width: 30, type: "downstream" }
      ]
    },
    {
      label: "设备",
      bars: [
        { text: lowHealth ? "强制点检" : "在线巡检", start: lowHealth ? 46 : 38, width: lowHealth ? 20 : 12, type: "maintenance" }
      ]
    }
  ];
  return rows;
}

function buildConstraints(plan) {
  const constraints = [
    {
      title: "安全边界",
      body: state.health < 62 ? "设备健康偏低，限制合成回路上限并插入点检窗口。" : "合成塔温升、压缩机负荷和罐区压力未触发硬约束。"
    },
    {
      title: "库存边界",
      body: state.inventory < 45 ? "液氨库存低于舒适区，减少外售并优先补罐。" : "库存可支撑下游订单和短时错峰。"
    },
    {
      title: "能源边界",
      body: state.energy > 75 ? "高价能源窗口压产，低价时段补回产量。" : "能源成本允许维持经济负荷。"
    },
    {
      title: "经营边界",
      body: state.market > 72 ? "市场波动高，保留液氨外售弹性，避免过早锁死产能。" : "订单结构稳定，优先保障高毛利下游。"
    }
  ];

  return constraints.concat({
    title: "收益口径",
    body: `预计毛利提升 ${plan.margin}%，能耗优化 ${plan.energyGain}%，碳强度下降 ${plan.carbonGain}%。`
  });
}

function buildDataReadiness(plan) {
  const signalScore = clamp(72 + state.health * 0.08 + state.inventory * 0.06 - state.market * 0.05, 55, 96);
  const syncScore = clamp(68 + state.demand * 0.05 + state.green * 0.07 - state.energy * 0.04, 52, 94);
  const ruleScore = clamp(80 + state.health * 0.05 - Math.max(0, plan.risk - 55) * 0.2, 58, 98);
  return [
    {
      title: "实时信号完整性",
      body: "重点看合成塔温升、循环压缩机、电耗、蒸汽、罐区压力和关键阀位是否连续可用。",
      score: Math.round(signalScore)
    },
    {
      title: "业务口径同步",
      body: "订单优先级、产品编码、库存水位、外售合同和下游产线计划需要统一到班次口径。",
      score: Math.round(syncScore)
    },
    {
      title: "专家规则沉淀",
      body: "把班长经验、安环红线、检修窗口、异常处置步骤做成可审计规则库。",
      score: Math.round(ruleScore)
    }
  ];
}

function buildGovernance(plan) {
  const drift = plan.risk > 62 || state.market > 75;
  const approval = plan.risk > 55 ? "班长 + 调度主管双确认" : "班长确认";
  return [
    {
      title: "置信阈值",
      body: `当前置信度 ${plan.confidence}%。低于 75% 时只允许生成备选方案，不允许回写 MES。`,
      level: plan.confidence < 75 ? "warn" : "",
      pill: plan.confidence < 75 ? "需复核" : "可建议"
    },
    {
      title: "漂移监控",
      body: drift ? "市场或风险波动较大，需要对订单预测和设备健康模型做班后偏差复盘。" : "当前预测输入稳定，保持日度偏差复盘即可。",
      level: drift ? "warn" : "",
      pill: drift ? "关注漂移" : "稳定"
    },
    {
      title: "审批留痕",
      body: `${approval}，记录版本号、输入快照、约束触发、采纳人和实际执行偏差。`,
      level: plan.risk > 70 ? "danger" : "",
      pill: approval
    }
  ];
}

function buildPlaybook(plan) {
  const items = [
    {
      title: "压缩机健康下降",
      body: "自动降低负荷上限，冻结液氨外售弹性订单，插入点检窗口，并提示备机/检修资源。",
      level: state.health < 62 ? "danger" : ""
    },
    {
      title: "液氨库存偏低",
      body: "下游高优订单优先，外售降级为合同刚性部分，夜间低价窗口补安全库存。",
      level: state.inventory < 50 ? "warn" : ""
    },
    {
      title: "能源价格冲高",
      body: "压缩高价窗口产量，将可延后订单转移到低价时段，用库存覆盖短时需求。",
      level: state.energy > 75 ? "warn" : ""
    },
    {
      title: "订单突然插单",
      body: "重算订单优先级、交期罚金和下游毛利，输出原计划、插单计划和折中计划三案。",
      level: state.demand > 86 ? "warn" : ""
    },
    {
      title: "环保指标逼近",
      body: "联动蒸汽、电耗、CO2 和绿电可用性，限制边际高排放产量并生成安环说明。",
      level: state.green < 25 && plan.load > 85 ? "warn" : ""
    },
    {
      title: "模型低置信",
      body: "降级为规则推荐，要求人工复核，保留当前稳定方案并禁止自动回写。",
      level: plan.confidence < 75 ? "danger" : ""
    }
  ];
  return items;
}

function buildPilotChecklist(plan) {
  const mustReview = plan.risk > 55 || state.health < 65;
  return [
    {
      title: "先做影子运行",
      body: "连续 4-6 周只出建议不回写，和调度员实际排产对比，不影响现有生产组织。",
      note: "验收：至少覆盖早班、晚班、订单冲刺、设备保守和库存偏低场景。"
    },
    {
      title: "只接必要接口",
      body: "首批接 MES 日计划、ERP 订单、液氨库存、关键 DCS 摘要点和设备健康评分。",
      note: "暂不要求全量实时点位，避免项目被接口范围拖死。"
    },
    {
      title: mustReview ? "高风险双人确认" : "班长确认即可",
      body: mustReview ? "当前风险或设备状态需要调度主管复核，AI 建议不能直接形成执行计划。" : "当前可按班长确认流程留痕，执行后记录偏差。",
      note: "确认记录包含输入快照、推荐负荷、采纳原因和未采纳原因。"
    },
    {
      title: "周度复盘收益",
      body: "只统计被采纳方案的实际效果，按能源、库存、订单和停机风险四类归因。",
      note: "不把市场价格自然波动算成 AI 收益。"
    }
  ];
}

function buildShiftWorkflow(plan) {
  return [
    {
      title: "班前 30 分钟",
      body: "调度员刷新订单、库存、设备健康和能源窗口，AI 输出三套方案：稳态、冲刺、保守。",
      note: `当前推荐负荷 ${plan.load}%，风险指数 ${plan.risk}。`
    },
    {
      title: "班前会 10 分钟",
      body: "班长只看差异：今天为什么调负荷、哪些订单优先、哪些红线不能碰。",
      note: "页面要能导出交接班摘要，而不是让一线人员读长报告。"
    },
    {
      title: "班中偏差处理",
      body: "若库存、设备或能价偏离阈值，系统提示是否重算；未确认前仍按原计划执行。",
      note: "重算动作留痕，避免责任边界不清。"
    },
    {
      title: "班后 5 分钟",
      body: "记录采纳与否、实际负荷、订单完成、能耗和异常原因，用于下一轮校准。",
      note: "把复盘做轻，现场才愿意持续用。"
    }
  ];
}

function buildAcceptance(plan) {
  const safeToPilot = plan.confidence >= 78 && plan.risk < 60;
  return [
    {
      title: "通过条件",
      body: "影子运行期高优订单满足率不低于人工排产，单位氨能耗、库存占用或调度耗时至少一项稳定改善。",
      level: safeToPilot ? "" : "warn"
    },
    {
      title: "停用条件",
      body: "关键数据延迟超过 15 分钟、DCS 摘要点缺失、模型连续两天偏差超阈值，自动停用优化建议。",
      level: "warn"
    },
    {
      title: "收益口径",
      body: "只认采纳方案的实际差额收益；剔除价格自然上涨、订单结构变化和检修计划外部影响。",
      level: ""
    },
    {
      title: "上线边界",
      body: "MVP 不改 DCS/SIS 控制逻辑，不做自动开停车，不绕过现有审批链。",
      level: plan.risk > 65 ? "danger" : ""
    },
    {
      title: "推广条件",
      body: "至少完成一个月稳定影子运行、三次异常场景复盘和一份调度员采纳原因清单。",
      level: ""
    },
    {
      title: "成本控制",
      body: "优先复用现有数据库、报表和接口；新建系统只做薄应用层，避免重做 MES/ERP。",
      level: ""
    }
  ];
}

function levelLabel(level) {
  if (level === "danger") return "强关注";
  if (level === "warn") return "需关注";
  return "正常";
}

function renderItems(containerId, items, className) {
  document.getElementById(containerId).innerHTML = items.map(item => {
    const level = item.level || "";
    const pill = item.pill || (item.score ? `${item.score}%` : levelLabel(level));
    return `<div class="${className}"><b>${item.title}</b><span>${item.body}</span><em class="status-pill ${level}">${pill}</em></div>`;
  }).join("");
}

function renderSteps(containerId, items) {
  document.getElementById(containerId).innerHTML = items.map((item, index) => {
    return `<div class="enterprise-step"><i>${index + 1}</i><div><b>${item.title}</b><span>${item.body}</span><small>${item.note}</small></div></div>`;
  }).join("");
}

function buildOperatorSummary(plan, text) {
  const approval = plan.risk > 55 ? "班长 + 调度主管双确认" : "班长确认";
  const fallback = plan.confidence < 75 || plan.risk > 70 ? "建议保持人工流程，AI 只给备选方案。" : "可进入当班试点评估。";
  return `调控口径：${text.mode}；建议负荷 ${plan.load}%；日产氨 ${plan.nh3.toLocaleString()} t；风险指数 ${plan.risk}。审批要求：${approval}。${fallback}`;
}

function pushOperatorEvent(action, plan, text) {
  const now = new Date();
  const stamp = now.toLocaleTimeString("zh-CN", { hour12: false });
  const templates = {
    recalc: `已按当前订单、库存、能价和设备健康重算：${text.mode}，建议负荷 ${plan.load}%，风险 ${plan.risk}。`,
    handover: `交接摘要：优先保障高优订单；关注库存 ${plan.stock}%、风险 ${plan.risk}；未确认前不回写控制参数。`,
    accept: `已记录“拟采纳”状态：需保留输入快照、审批人、实际执行偏差和班后复盘结论。`
  };
  operatorEvents.unshift({
    title: `${stamp} ${action === "recalc" ? "重算计划" : action === "handover" ? "生成交接摘要" : "标记采纳"}`,
    body: templates[action]
  });
  if (operatorEvents.length > 6) operatorEvents.pop();
}

function renderOperatorLog() {
  const log = document.getElementById("operatorLog");
  if (!log) return;
  log.innerHTML = operatorEvents.map(item => {
    return `<div><strong>${item.title}</strong>${item.body}</div>`;
  }).join("");
}

function setBar(id, value) {
  const el = document.getElementById(id);
  el.style.setProperty("--w", `${clamp(value, 0, 100)}%`);
}

function renderGantt(rows) {
  const gantt = document.getElementById("gantt");
  gantt.innerHTML = rows.map(row => {
    const bars = row.bars.map(bar => {
      return `<div class="gantt-bar" style="left:${bar.start}%;width:${bar.width}%;background:${scheduleColors[bar.type]}">${bar.text}</div>`;
    }).join("");
    return `<div class="gantt-row"><div class="gantt-label">${row.label}</div><div class="gantt-track">${bars}</div></div>`;
  }).join("");
}

function render() {
  const plan = calcPlan();
  const text = strategy(plan);

  Object.keys(state).forEach(key => {
    const output = document.getElementById(`${key}Out`);
    if (output) output.textContent = state[key];
  });

  document.getElementById("loadKpi").textContent = `${plan.load}%`;
  document.getElementById("nh3Kpi").textContent = `${plan.nh3.toLocaleString()} t`;
  document.getElementById("marginKpi").textContent = `${plan.margin > 0 ? "+" : ""}${plan.margin}%`;
  document.getElementById("riskKpi").textContent = plan.risk;
  document.getElementById("plantState").textContent = text.mode;
  document.getElementById("shiftMode").textContent = text.mode;
  document.getElementById("strategyTitle").textContent = text.title;
  document.getElementById("strategyText").textContent = text.text;
  document.getElementById("confidence").textContent = `置信度 ${plan.confidence}%`;
  document.getElementById("operatorSummary").textContent = buildOperatorSummary(plan, text);

  document.getElementById("decisionStack").innerHTML = buildDecisions(plan).map(item => {
    return `<div class="decision ${item.level}"><strong>${item.title}</strong><span>${item.body}</span></div>`;
  }).join("");

  renderGantt(buildSchedule(plan));

  setBar("barOrder", plan.order);
  setBar("barEnergy", plan.energyGain * 7);
  setBar("barCarbon", plan.carbonGain * 6);
  setBar("barStock", plan.stock);
  document.getElementById("orderText").textContent = `${plan.order}%`;
  document.getElementById("energyText").textContent = `${plan.energyGain}%`;
  document.getElementById("carbonText").textContent = `${plan.carbonGain}%`;
  document.getElementById("stockText").textContent = `${plan.stock}%`;

  const constraints = buildConstraints(plan);
  document.getElementById("constraintLevel").textContent = `${constraints.length} 条关注`;
  document.getElementById("constraintList").innerHTML = constraints.map(item => {
    return `<div class="constraint-item"><strong>${item.title}</strong><span>${item.body}</span></div>`;
  }).join("");

  const dataReadiness = buildDataReadiness(plan);
  const readinessScore = Math.round(dataReadiness.reduce((sum, item) => sum + item.score, 0) / dataReadiness.length);
  document.getElementById("dataScore").textContent = `${readinessScore}%`;
  document.getElementById("frameworkScore").textContent = `覆盖度 ${Math.round((readinessScore + plan.confidence + 86) / 3)}%`;
  renderItems("dataReadiness", dataReadiness, "readiness-item");
  renderItems("governanceList", buildGovernance(plan), "governance-item");
  renderItems("playbookList", buildPlaybook(plan), "playbook-item");
  renderItems("acceptanceList", buildAcceptance(plan), "playbook-item");
  renderSteps("pilotChecklist", buildPilotChecklist(plan));
  renderSteps("shiftWorkflow", buildShiftWorkflow(plan));
  document.getElementById("governanceMode").textContent = plan.risk > 55 ? "增强复核" : "人机确认";
  document.getElementById("playbookMode").textContent = plan.risk > 60 ? "风险优先" : "动态生成";
  document.getElementById("pilotMode").textContent = plan.risk > 55 ? "先影子运行" : "可试点评估";
  document.getElementById("acceptanceMode").textContent = plan.confidence < 78 ? "谨慎试点" : "保守口径";
  renderOperatorLog();
}

document.querySelectorAll("input[type='range']").forEach(input => {
  input.addEventListener("input", event => {
    state[event.target.dataset.key] = Number(event.target.value);
    render();
  });
});

Object.keys(presets).forEach(id => {
  document.getElementById(id).addEventListener("click", () => {
    Object.assign(state, presets[id]);
    Object.keys(state).forEach(key => {
      const input = document.querySelector(`[data-key="${key}"]`);
      if (input) input.value = state[key];
    });
    render();
  });
});

document.querySelectorAll("[data-action]").forEach(button => {
  button.addEventListener("click", event => {
    const plan = calcPlan();
    const text = strategy(plan);
    pushOperatorEvent(event.target.dataset.action, plan, text);
    render();
  });
});

pushOperatorEvent("recalc", calcPlan(), strategy(calcPlan()));
render();
