# 合成氨生产调度专家平台

本项目面向云图控股合成氨装置运行管理场景，构建一个以生产成本优化、调度协同、执行监督和知识沉淀为核心的数字化工作台。平台不触碰 DCS/SIS 控制层，不替代班长和调度主管的最终决策，而是在安全边界内把工况、订单、库存、设备、能价和专家经验组织成可解释的班次调度方案。

## 交付内容

- `index.html`：合成氨生产调度专家平台原型，可离线打开。
- `assets/styles.css`：平台界面样式。
- `assets/app.js`：场景试算、约束解释、执行监督、飞书协同与知识库沉淀逻辑。
- `assets/process-map.svg`：合成氨至尿浆、复合肥、联碱和液氨外售的协同流程图。
- `data/plant-model.json`：示例装置、订单、约束和 KPI 数据模型。
- `docs/architecture.md`：平台架构、核心模块、治理边界和推广路径。
- `docs/research-brief.md`：命题理解、资料依据和方案摘要。
- `docs/optimization-roadmap.md`：实施路线、试点边界和验收口径。
- `docs/feishu-integration.md`：飞书通知、审批、回调和知识库同步设计。
- `提交材料/01_开题报告.docx`：开题报告 Word 文件。
- `提交材料/02_整体解决方案书.docx`：整体解决方案 Word 文件。
- `提交材料/03_调控师操作手册.docx`：当班调控操作手册 Word 文件。
- `提交材料/04_参考文献与数据依据.docx`：参考文献与数据依据 Word 文件。
- `提交材料/05_方案创新与落地清单.docx`：方案创新、落地条件和边界说明 Word 文件。

## 本地查看

直接用浏览器打开：

```powershell
start D:\云图——合成氨\index.html
```

也可以启动本地静态服务：

```powershell
cd D:\云图——合成氨
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 方案定位

合成氨装置不是孤立产氨单元，而是连接尿浆、复合肥、联碱、液氨外售和库存物流的连续流程节点。平台把合成负荷、氢氮比、合成塔床层温升、循环压缩机效率、液氨库存、订单交期、能耗价格和安环约束放在同一张班次事实表中，滚动生成稳氨、保供、护机三类调度方案。

系统重点解决三类运行管理问题：

- 多因素联合优化复杂，调度人员难以及时识别吨氨成本挖潜空间。
- 指挥链条依赖人工传递，班中窗口容易错过。
- 专家经验分散在个人判断和交接班记录中，难以长期沉淀复用。

## 核心能力

- 成本寻优：联动能源价格、设备效率、订单优先级、库存资金占用和外售机会成本，计算吨氨边际收益。
- 安全约束：对合成塔温升、循环压缩机负荷、罐区压力、安全库存、最低稳定负荷和环保红线进行硬约束校验。
- 三案比选：输出稳态运行、订单保供、设备护机三类班次方案，列明收益、风险和执行边界。
- 指挥协同：生成班前会摘要、交接班要点、飞书卡片和负荷调整审批草稿。
- 执行监督：跟踪采纳状态、实际负荷、氢氮比偏差、液氨库存变化、订单完成和吨氨成本结果。
- 知识沉淀：将采纳原因、未采纳原因、异常处置和执行效果写入合成负荷指令库、异常经验库和专家规则库。

## 落地边界

- 第一阶段采用影子运行和人工确认，不直接改写 DCS/SIS 控制参数。
- 数据接入从高价值摘要点开始：MES 日计划、ERP 订单、液氨库存、DCS 关键点位、设备健康评分和能源价格。
- 飞书只承担通知、审批、复盘和留痕，不作为控制通道。
- 当数据延迟、模型低置信或安环红线接近时，平台自动降级为专家规则和人工流程。
- 收益按采纳方案的实际执行结果核算，剔除市场价格自然波动、检修计划和外部物流扰动。

## 资料依据

- IEA, [Ammonia Technology Roadmap](https://www.iea.org/reports/ammonia-technology-roadmap)
- IEA, [Executive Summary](https://www.iea.org/reports/ammonia-technology-roadmap/executive-summary)
- 巨潮资讯, [成都云图控股股份有限公司 2025 年年度报告摘要](https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF)
- 巨潮资讯, [成都云图控股股份有限公司投资者关系活动记录表](https://static.cninfo.com.cn/finalpage/2026-04-16/1225109829.PDF)
- 云图控股官网, [合成氨、磷矿等新产能落地或助力公司成长](https://www.wintrueholding.com/static/upload/file/20260417/1776394254161882.pdf)
- Kong et al., [Nonlinear Model Predictive Control of Flexible Ammonia Production](https://qizh.cems.umn.edu/sites/qizh.cems.umn.edu/files/2024-04/Kong_et_al-2024-preprint-NMPC_ammonia_production.pdf)
- ACS IECR, [Dynamic Simulation and Optimization for Load Regulation of the Haber-Bosch Process](https://pubs.acs.org/doi/10.1021/acs.iecr.4c02410)
