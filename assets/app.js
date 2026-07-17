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
const feishuEvents = [];

const feishuConfig = {
  connected: false,
  appName: "合成氨 AI 调控师",
  targetChat: "合成氨当班调度群",
  approvalName: "合成氨负荷调整审批",
  approvalCode: "NH3_LOAD_ADJUSTMENT",
  callbackEndpoint: "/api/feishu/events"
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
      mode: "护塔护机",
      title: "降低合成回路负荷，优先保护循环压缩机与合成塔床层温升",
      text: `压缩机/合成塔健康评分只有 ${state.health}，建议合成回路控制在 ${plan.load}% 左右，限制升负荷速率，优先核查循环气压缩机振动、合成塔床层温差和氨冷器换热效率，避免为追产放大非计划停车风险。`
    };
  }

  if (state.demand > 84 && state.inventory < 55) {
    return {
      mode: "保供补氨",
      title: "提高氨合成负荷补液氨库存，优先兑现尿浆与复合肥消纳",
      text: `下游消纳压力高且液氨库存偏紧，建议 ${plan.load}% 负荷运行；夜间利用低价能源窗口补液氨库存，白班优先保障尿浆和复合肥用氨，液氨外售只保留合同刚性部分。`
    };
  }

  if (state.energy > 78) {
    return {
      mode: "吨氨能耗约束",
      title: "错峰调氨，压缩高价原料/蒸汽/电力窗口的边际产量",
      text: `原料/蒸汽电价压力达到 ${state.energy}，建议把可延后用氨需求移到低价时段，合成回路维持 ${plan.load}%，用安全库存覆盖下游短时消纳。`
    };
  }

  return {
    mode: "稳氨优化",
    title: "稳定合成回路负荷，优先平衡吨氨能耗、液氨库存和下游消纳",
    text: `当前下游需求和设备状态匹配，建议合成回路维持 ${plan.load}% 负荷，重点跟踪氢氮比、循环气量、合成塔床层温升和液氨库存，避免频繁调负荷带来额外能耗。`
  };
}

function buildDecisions(plan) {
  const items = [
    {
      title: `合成回路 ${plan.load}%`,
      body: state.health < 62 ? "触发合成塔/循环压缩机保护上限，优先守床层温升、振动和循环气量。" : "兼顾吨氨能耗、液氨库存和下游用氨的推荐合成负荷。",
      level: state.health < 62 ? "danger" : ""
    },
    {
      title: `日产氨 ${plan.nh3.toLocaleString()} t`,
      body: "按 70 万吨/年装置折算，作为班次级计划口径。",
      level: ""
    },
    {
      title: `下游消纳满足率 ${plan.order}%`,
      body: state.demand > 84 ? "尿浆和复合肥用氨优先，液氨外售降为弹性池。" : "下游用氨可在当前液氨库存水位下平衡。",
      level: state.demand > 84 ? "warn" : ""
    },
    {
      title: `风险指数 ${plan.risk}`,
      body: plan.risk > 60 ? "需要班长确认循环压缩机点检、合成塔温升、罐区压力和吨氨能耗边界。" : "主要工艺约束处于可控区间。",
      level: plan.risk > 60 ? "danger" : ""
    }
  ];

  return items;
}

function buildPersona(plan, text) {
  const confirmation = plan.risk > 60 ? "班长与调度主管双确认" : "班长确认";
  const firstQuestion = state.health < 62
    ? "循环压缩机振动、合成塔床层温差、氨冷器换热效率有没有最新点检结论？"
    : state.demand > 84
      ? "尿浆、复合肥、联碱和液氨外售中，哪些订单是刚性交付，哪些可以顺延？"
      : state.energy > 75
        ? "高价原料/蒸汽/电力窗口持续多久，低价窗口能否覆盖补库存需求？"
        : "当前班次最值得盯的是氢氮比、液氨库存和负荷偏差，是否有人工经验要覆盖模型？";

  return {
    name: "合成氨 AI 调控师",
    motto: `我先守安全边界，再找吨氨成本；我给 ${text.mode} 建议，但不替班长拍板。`,
    prompts: [
      {
        title: "我会先追问",
        body: firstQuestion
      },
      {
        title: "我会主动提醒",
        body: `当前建议负荷 ${plan.load}%，风险指数 ${plan.risk}，审批路径为${confirmation}；任何建议都必须能解释触发了哪些合成氨约束。`
      },
      {
        title: "我不会越界",
        body: "不直接写 DCS/SIS，不自动开停车，不把市场自然波动算作 AI 收益，不隐藏未采纳原因。"
      }
    ]
  };
}

function buildReviewBoard(plan) {
  const safety = clamp(92 - Math.max(0, plan.risk - 45) * 0.45, 70, 96);
  const business = clamp(74 + state.demand * 0.08 + state.inventory * 0.05, 72, 96);
  const execution = clamp(78 + plan.confidence * 0.08 - Math.max(0, plan.risk - 55) * 0.15, 70, 94);
  const innovation = clamp(82 + state.market * 0.04 + state.green * 0.04, 78, 96);
  return [
    {
      title: "业务贴合度",
      body: "围绕合成氨-液氨库存-尿浆/复合肥/联碱消纳，不把题目泛化成普通 AI 看板。",
      score: Math.round(business)
    },
    {
      title: "安全可信度",
      body: "采用工艺硬约束、重大危险源监测、飞书审批、人机确认四重边界，AI 不碰控制层。",
      score: Math.round(safety)
    },
    {
      title: "落地可执行",
      body: "先影子运行，再班组确认，最后小闭环；接口从 MES、ERP、DCS 摘要点和罐区开始。",
      score: Math.round(execution)
    },
    {
      title: "创新辨识度",
      body: "把数字员工做成人、机理、经营、知识库、协同审批的闭环，而不是只给一个算法结果。",
      score: Math.round(innovation)
    }
  ];
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
      title: "合成安全边界",
      body: state.health < 62 ? "压缩机/合成塔健康偏低，限制合成回路上限并插入点检窗口。" : "合成塔床层温升、循环压缩机负荷和液氨罐区压力未触发硬约束。"
    },
    {
      title: "液氨库存边界",
      body: state.inventory < 45 ? "液氨库存低于舒适区，减少外售并优先补罐。" : "液氨库存可支撑尿浆/复合肥消纳和短时错峰。"
    },
    {
      title: "吨氨能耗边界",
      body: state.energy > 75 ? "原料/蒸汽/电力高价窗口压产，低价时段补回产量。" : "原料和公用工程成本允许维持经济负荷。"
    },
    {
      title: "下游消纳边界",
      body: state.market > 72 ? "下游消纳波动高，保留液氨外售弹性，避免过早锁死产能。" : "尿浆/复合肥用氨结构稳定，优先保障高毛利下游。"
    }
  ];

  return constraints.concat({
    title: "吨氨收益口径",
    body: `预计吨氨综合收益提升 ${plan.margin}%，吨氨能耗优化 ${plan.energyGain}%，碳强度下降 ${plan.carbonGain}%。`
  });
}

function buildDataReadiness(plan) {
  const signalScore = clamp(72 + state.health * 0.08 + state.inventory * 0.06 - state.market * 0.05, 55, 96);
  const syncScore = clamp(68 + state.demand * 0.05 + state.green * 0.07 - state.energy * 0.04, 52, 94);
  const ruleScore = clamp(80 + state.health * 0.05 - Math.max(0, plan.risk - 55) * 0.2, 58, 98);
  return [
    {
      title: "合成关键点位完整性",
      body: "重点看氢氮比、合成塔床层温升、循环压缩机负荷、电耗、蒸汽、液氨罐区压力是否连续可用。",
      score: Math.round(signalScore)
    },
    {
      title: "用氨口径同步",
      body: "尿浆、复合肥、联碱配套、液氨外售的需求优先级、库存水位和班次计划需要统一口径。",
      score: Math.round(syncScore)
    },
    {
      title: "合成氨专家规则",
      body: "把合成塔升降负荷、氢氮比偏差、压缩机点检、罐区安全库存和异常处置做成规则库。",
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
      title: "循环压缩机健康下降",
      body: "自动降低合成负荷上限，冻结液氨外售弹性订单，插入点检窗口，并提示备机/检修资源。",
      level: state.health < 62 ? "danger" : ""
    },
    {
      title: "液氨库存偏低",
      body: "下游高优订单优先，外售降级为合同刚性部分，夜间低价窗口补安全库存。",
      level: state.inventory < 50 ? "warn" : ""
    },
    {
      title: "原料/蒸汽电价冲高",
      body: "压缩高价窗口合成负荷，将可延后用氨需求转移到低价时段，用库存覆盖短时消纳。",
      level: state.energy > 75 ? "warn" : ""
    },
    {
      title: "下游用氨突然插单",
      body: "重算尿浆/复合肥用氨优先级、交期罚金和下游毛利，输出原计划、保供计划和折中计划三案。",
      level: state.demand > 86 ? "warn" : ""
    },
    {
      title: "环保指标逼近",
      body: "联动蒸汽、电耗、CO2 和低碳能源可用性，限制边际高排放吨氨产量并生成安环说明。",
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

function buildCostRadar(plan) {
  const energyLoss = clamp(state.energy * 0.55 - state.green * 0.15, 8, 82);
  const inventoryLoss = clamp(Math.max(0, 60 - state.inventory) * 1.2 + state.market * 0.1, 5, 78);
  const equipmentLoss = clamp((100 - state.health) * 0.75 + plan.risk * 0.15, 6, 85);
  const orderLoss = clamp(state.demand * 0.45 + state.market * 0.25 - plan.order * 0.18, 8, 88);
  const operationLoss = clamp(Math.abs(plan.load - 84) * 1.4 + plan.risk * 0.18, 4, 70);
  return [
    { label: "原料/蒸汽", value: Math.round(energyLoss), note: "天然气/煤气化、蒸汽、电力价格共同影响边际吨氨成本。" },
    { label: "液氨库存", value: Math.round(inventoryLoss), note: "库存偏低会牺牲下游保供和外售弹性，偏高会占用罐区与资金。" },
    { label: "压缩机效率", value: Math.round(equipmentLoss), note: "循环压缩机负荷、振动、换热效率决定追产是否值得。" },
    { label: "合成塔窗口", value: Math.round(orderLoss), note: "氢氮比、惰性气、床层温升和循环气量共同约束氨合成效率。" },
    { label: "负荷偏差", value: Math.round(operationLoss), note: "实际负荷偏离推荐负荷会抬高电耗、蒸汽耗和执行偏差。" }
  ];
}

function buildScenarioCompare(plan) {
  const stableLoad = clamp(plan.load - 4, 60, 88);
  const sprintLoad = clamp(plan.load + 4, 68, 94);
  const safeLoad = clamp(state.health < 62 ? plan.load : plan.load - 10, 52, 82);
  const scenarios = [
    {
      id: "稳氨",
      load: Math.round(stableLoad),
      margin: clamp(Number(plan.margin) - 0.4, -2, 12).toFixed(1),
      risk: clamp(plan.risk - 6, 5, 90),
      action: "保持合成回路平稳，减少频繁升降负荷，重点守住氢氮比、床层温升和循环气压缩机效率。"
    },
    {
      id: "保供",
      load: Math.round(sprintLoad),
      margin: clamp(Number(plan.margin) + 0.8, -2, 13).toFixed(1),
      risk: clamp(plan.risk + 8, 8, 95),
      action: "下游尿浆/复合肥用氨和液氨库存压力高时优先，外售液氨降为弹性池。"
    },
    {
      id: "护机",
      load: Math.round(safeLoad),
      margin: clamp(Number(plan.margin) - 1.1, -3, 10).toFixed(1),
      risk: clamp(plan.risk - 14, 3, 80),
      action: "循环压缩机、合成塔或换热系统健康偏低时优先，插入点检窗口，避免追产诱发停车。"
    }
  ];
  const best = state.health < 62 || plan.risk > 65 ? "护机" : state.demand > 84 && state.inventory < 58 ? "保供" : "稳氨";
  return { best, scenarios };
}

function buildExecutionMonitor(plan) {
  const loadDeviation = clamp(Math.abs(plan.load - 84) + state.market * 0.03, 1, 18).toFixed(1);
  const inventoryTrend = state.inventory < 50 ? "补库存中" : state.inventory > 76 ? "释放库存弹性" : "安全区间";
  const supervision = plan.risk > 60 ? "需主管复核" : "班长确认";
  return [
    {
      title: "合成负荷下达",
      body: `推荐氨合成负荷 ${plan.load}%；审批链：${supervision}；仅回写 MES 计划和交接摘要，不写 DCS 控制参数。`,
      level: plan.risk > 60 ? "warn" : ""
    },
    {
      title: "负荷/氢氮比偏差",
      body: `预计负荷偏差 ${loadDeviation} 个百分点；若氢氮比、循环气量或床层温升偏离阈值，触发重算建议。`,
      level: Number(loadDeviation) > 8 ? "warn" : ""
    },
    {
      title: "液氨库存跟踪",
      body: `液氨库存状态：${inventoryTrend}；库存低于安全阈值时自动压缩外售弹性。`,
      level: state.inventory < 50 ? "warn" : ""
    },
    {
      title: "吨氨成本复盘",
      body: `班后记录下游满足率 ${plan.order}%、吨氨能耗优化 ${plan.energyGain}%、液氨库存安全 ${plan.stock}%。`,
      level: ""
    }
  ];
}

function buildKnowledgeLoop(plan) {
  const learnedRule = state.health < 62
    ? "当循环压缩机/合成塔健康低于 62 且下游压力不高时，护机方案在收益略降下显著降低停车风险。"
    : state.demand > 84
      ? "当尿浆/复合肥用氨压力高且液氨库存低于 58 时，保供方案应优先保障下游消纳，外售液氨转为弹性池。"
      : "当原料/蒸汽电价中等且设备健康高于 75 时，稳氨方案通常在吨氨能耗和下游交付之间更均衡。";
  return [
    {
      title: "本班规则沉淀",
      body: learnedRule,
      level: ""
    },
    {
      title: "未采纳原因标签",
      body: "候选标签：安全边界、设备风险、订单变化、数据不可信、经验判断、安环要求。",
      level: ""
    },
    {
      title: "自学习触发",
      body: plan.risk > 60 ? "高风险场景进入重点复盘样本，要求补充实际执行结果和班长判断。" : "常规场景进入周度模型校准样本。",
      level: plan.risk > 60 ? "warn" : ""
    },
    {
      title: "知识库对象",
      body: "沉淀氨合成负荷指令、氢氮比/床层温升异常、循环压缩机边界、液氨库存策略和交接班话术。",
      level: ""
    }
  ];
}

function buildFeishuCard(plan, text) {
  const approval = plan.risk > 55 ? "班长 + 调度主管双确认" : "班长确认";
  const warning = plan.risk > 70 || plan.confidence < 75 ? "低置信/高风险，仅允许作为备选建议" : "可进入当班确认流程";
  return {
    title: `${text.mode}｜合成氨负荷建议 ${plan.load}%`,
    summary: text.title,
    fields: [
      { label: "目标群", value: feishuConfig.targetChat },
      { label: "日产氨", value: `${plan.nh3.toLocaleString()} t` },
      { label: "吨氨收益", value: `${plan.margin > 0 ? "+" : ""}${plan.margin}%` },
      { label: "风险指数", value: plan.risk },
      { label: "审批要求", value: approval },
      { label: "执行边界", value: warning }
    ],
    actions: ["确认采纳", "发起审批", "查看约束", "记录未采纳原因"]
  };
}

function buildFeishuApproval(plan, text) {
  return [
    { label: "审批定义", value: `${feishuConfig.approvalName}（${feishuConfig.approvalCode}）` },
    { label: "申请事项", value: `${text.mode}：合成回路调整至 ${plan.load}%` },
    { label: "业务理由", value: text.title },
    { label: "关键约束", value: `风险 ${plan.risk}，置信度 ${plan.confidence}%，库存安全 ${plan.stock}%` },
    { label: "回写范围", value: "仅 MES 计划、交接摘要、复盘记录；不写 DCS/SIS 控制参数" },
    { label: "回调事件", value: "审批通过、审批驳回、卡片按钮点击、复盘提交" }
  ];
}

function pushFeishuEvent(action, plan, text) {
  const now = new Date();
  const stamp = now.toLocaleTimeString("zh-CN", { hour12: false });
  const templates = {
    card: `已生成飞书互动卡片草稿：发送至“${feishuConfig.targetChat}”，内容包含负荷 ${plan.load}%、风险 ${plan.risk}、审批要求和约束解释。`,
    approval: `已生成审批单草稿：${feishuConfig.approvalName}，申请事项为“${text.mode}｜合成回路 ${plan.load}%”。`,
    review: `已生成班后复盘同步草稿：记录采纳状态、实际偏差、吨氨能耗、液氨库存和未采纳原因标签。`
  };
  feishuEvents.unshift({
    title: `${stamp} ${action === "card" ? "生成群卡片" : action === "approval" ? "生成审批单" : "同步复盘"}`,
    body: feishuConfig.connected ? templates[action] : `${templates[action]} 当前未配置飞书 App ID/Secret，仅本地演示，不会真实发送。`
  });
  if (feishuEvents.length > 5) feishuEvents.pop();
}

function renderFeishuIntegration(plan, text) {
  const card = buildFeishuCard(plan, text);
  const approval = buildFeishuApproval(plan, text);
  document.getElementById("feishuStatus").textContent = feishuConfig.connected ? "已连接飞书" : "待授权接入";
  document.getElementById("feishuCard").innerHTML = `
    <strong>${card.title}</strong>
    <p>${card.summary}</p>
    <div class="feishu-fields">
      ${card.fields.map(item => `<span><b>${item.label}</b>${item.value}</span>`).join("")}
    </div>
    <p>卡片按钮：${card.actions.join(" / ")}</p>
  `;
  document.getElementById("feishuApproval").innerHTML = approval.map(item => {
    return `<div><b>${item.label}</b>${item.value}</div>`;
  }).join("");
  document.getElementById("feishuEvents").innerHTML = feishuEvents.map(item => {
    return `<div><b>${item.title}</b>${item.body}</div>`;
  }).join("");
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

function renderCostRadar(items) {
  document.getElementById("costRadar").innerHTML = items.map(item => {
    return `<div class="cost-item"><span title="${item.note}">${item.label}</span><b style="--w:${item.value}%"></b><strong>${item.value}</strong></div>`;
  }).join("");
}

function renderScenarioCompare(compare) {
  document.getElementById("bestScenario").textContent = `推荐：${compare.best}`;
  document.getElementById("scenarioCompare").innerHTML = compare.scenarios.map(item => {
    return `<div class="scenario-card ${item.id === compare.best ? "best" : ""}"><b>${item.id}方案</b><span>${item.action}</span><div class="scenario-kpis"><em>负荷 ${item.load}%</em><em>收益 ${item.margin}%</em><em>风险 ${Math.round(item.risk)}</em></div></div>`;
  }).join("");
}

function renderPersona(persona) {
  document.getElementById("personaMode").textContent = persona.name;
  document.getElementById("personaCard").innerHTML = `
    <div class="persona-lead"><b>${persona.name}</b><span>${persona.motto}</span></div>
    <div class="persona-prompts">
      ${persona.prompts.map(item => `<div><b>${item.title}</b><span>${item.body}</span></div>`).join("")}
    </div>
  `;
}

function renderReviewBoard(items) {
  const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
  document.getElementById("reviewScore").textContent = `综合 ${avg}%`;
  document.getElementById("reviewBoard").innerHTML = items.map(item => {
    return `<div class="review-item"><b>${item.title}｜${item.score}%</b><span>${item.body}</span><i class="review-meter" style="--w:${item.score}%"></i></div>`;
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
  const labels = {
    recalc: "重算计划",
    handover: "生成交接摘要",
    accept: "标记采纳",
    feishuCard: "生成飞书卡片",
    feishuApproval: "生成飞书审批",
    feishuReview: "同步飞书复盘"
  };
  const templates = {
    recalc: `已按当前订单、库存、能价和设备健康重算：${text.mode}，建议负荷 ${plan.load}%，风险 ${plan.risk}。`,
    handover: `交接摘要：优先保障高优订单；关注库存 ${plan.stock}%、风险 ${plan.risk}；未确认前不回写控制参数。`,
    accept: `已记录“拟采纳”状态：需保留输入快照、审批人、实际执行偏差和班后复盘结论。`,
    feishuCard: `已生成飞书群卡片草稿：可发送给${feishuConfig.targetChat}进行班组确认。`,
    feishuApproval: `已生成飞书审批草稿：待填入真实 approval_code 后可创建审批实例。`,
    feishuReview: `已生成飞书复盘草稿：用于沉淀采纳/未采纳原因和执行偏差。`
  };
  operatorEvents.unshift({
    title: `${stamp} ${labels[action] || "操作"}`,
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
  const costRadar = buildCostRadar(plan);
  const avgCostGap = Math.round(costRadar.reduce((sum, item) => sum + item.value, 0) / costRadar.length);
  document.getElementById("dataScore").textContent = `${readinessScore}%`;
  document.getElementById("frameworkScore").textContent = `覆盖度 ${Math.round((readinessScore + plan.confidence + 86) / 3)}%`;
  document.getElementById("costGap").textContent = `可挖潜 ${(avgCostGap / 10).toFixed(1)}%`;
  renderCostRadar(costRadar);
  renderScenarioCompare(buildScenarioCompare(plan));
  renderPersona(buildPersona(plan, text));
  renderReviewBoard(buildReviewBoard(plan));
  renderItems("dataReadiness", dataReadiness, "readiness-item");
  renderItems("governanceList", buildGovernance(plan), "governance-item");
  renderItems("playbookList", buildPlaybook(plan), "playbook-item");
  renderItems("executionMonitor", buildExecutionMonitor(plan), "execution-item");
  renderItems("knowledgeLoop", buildKnowledgeLoop(plan), "knowledge-item");
  renderItems("acceptanceList", buildAcceptance(plan), "playbook-item");
  renderSteps("pilotChecklist", buildPilotChecklist(plan));
  renderSteps("shiftWorkflow", buildShiftWorkflow(plan));
  document.getElementById("governanceMode").textContent = plan.risk > 55 ? "增强复核" : "人机确认";
  document.getElementById("playbookMode").textContent = plan.risk > 60 ? "风险优先" : "动态生成";
  document.getElementById("executionMode").textContent = plan.risk > 60 ? "加强监督" : "自动跟踪";
  document.getElementById("learningMode").textContent = plan.risk > 60 ? "重点复盘" : "持续沉淀";
  document.getElementById("pilotMode").textContent = plan.risk > 55 ? "先影子运行" : "可试点评估";
  document.getElementById("acceptanceMode").textContent = plan.confidence < 78 ? "谨慎试点" : "保守口径";
  renderFeishuIntegration(plan, text);
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
    const action = event.target.dataset.action;
    pushOperatorEvent(action, plan, text);
    if (action === "feishuCard") pushFeishuEvent("card", plan, text);
    if (action === "feishuApproval") pushFeishuEvent("approval", plan, text);
    if (action === "feishuReview") pushFeishuEvent("review", plan, text);
    render();
  });
});

document.querySelectorAll("[data-feishu-action]").forEach(button => {
  button.addEventListener("click", event => {
    const plan = calcPlan();
    const text = strategy(plan);
    pushFeishuEvent(event.target.dataset.feishuAction, plan, text);
    render();
  });
});

pushOperatorEvent("recalc", calcPlan(), strategy(calcPlan()));
pushFeishuEvent("card", calcPlan(), strategy(calcPlan()));
render();
