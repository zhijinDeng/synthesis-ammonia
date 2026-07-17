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

render();

