# 合成氨 AI 生产调度专家平台

这是面向云图控股命题“如果你来到全球领先的合成氨生产装置现场，如何用 AI 打造一个生产调度专家？”构建的可演示原型。

## 交付内容

- `index.html`：可离线打开的调度专家平台首页。
- `assets/styles.css`：界面样式。
- `assets/app.js`：场景调度、约束解释、价值测算与 Gantt 展示逻辑。
- `assets/process-map.svg`：合成氨到复合肥协同的装置流程图。
- `data/plant-model.json`：示例装置、订单、约束和 KPI 数据模型。
- `docs/research-brief.md`：开题报告 part 1、part 2、出题意图和资料依据。
- `docs/architecture.md`：平台架构、核心模块、落地路线和推广价值。

## 使用方法

直接用浏览器打开：

```powershell
start D:\云图——合成氨\index.html
```

也可以启动一个本地静态服务：

```powershell
cd D:\云图——合成氨
python -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 方案定位

平台把合成氨装置看作“能源、设备、库存、下游需求、安全环保”共同约束下的动态排产问题。AI 不是替代班长，而是把 DCS/MES/ERP/LIMS/设备状态和市场订单融合成一个可解释的调度专家，给出班次级建议、风险边界、经济收益和回写闭环。

## 主要资料依据

- IEA, [Ammonia Technology Roadmap](https://www.iea.org/reports/ammonia-technology-roadmap)
- 云图控股 2025 年报摘要与投资者关系材料，来源包括 [巨潮资讯](https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF)
- 云图控股券商研究材料，来源包括 [云图控股官网研究报告](https://www.wintrueholding.com/static/upload/file/20260417/1776394254161882.pdf)
- Kong 等，Nonlinear Model Predictive Control of Flexible Ammonia Production, 2024 preprint
- ACS IECR, Dynamic Simulation and Optimization for Load Regulation of Haber-Bosch Process

