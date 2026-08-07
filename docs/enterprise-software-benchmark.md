# 企业软件功能对标与本平台取舍

## 对标结论

本平台不复制企业现有DCS、MES、APC或设备软件，而是补上它们之间的调度编排层。成熟工业软件的共同做法是：统一事实口径、按事件驱动工作、把经济目标传递到装置约束、跟踪实际执行，并把人员判断沉淀为标准流程。

## 参考产品与映射

| 参考能力 | 企业软件做法 | 本平台吸收的功能 | 明确不做 |
| --- | --- | --- | --- |
| 多装置动态优化 | Aspen GDOT强调把计划、调度和APC连接为闭环，并在多单元之间平衡产率、能源和网络约束。 | 产供销全线事实表、三案比选、热电APC约束摘要、目标负荷与升降速率建议。 | 不替代APC控制器，不直接写DCS。 |
| MES执行与前线工作流 | AVEVA MES覆盖生产、库存、质量、排程、绩效和Work Tasks，并强调ERP与现场执行数据双向衔接。 | 当班事件队列、责任人、班长确认、执行偏差、班末效果复核。 | 不重建企业MES主数据和工单体系。 |
| APC绩效与机会损失 | Honeywell APC监控与分析把控制问题按财务影响排序，帮助识别运行策略造成的机会损失。 | 事件按安全、流程连续、经济影响和时效排序；收益使用边际贡献与反事实口径。 | 不把模型输出直接等同于已实现收益。 |
| 工业AI与人员赋能 | AVEVA强调以实时可见性、AI建议和可配置工作流支持一线人员决策。 | 飞书AI回答固定包含结论、现场数值、边界、事实来源、责任人与复核时间，并可转卡片、任务或复盘。 | 无来源不回答；高风险不绕过审批。 |

## 与云图业务的对应

云图控股2025年年度报告摘要披露，应城70万吨合成氨、100万吨复合肥及配套尿浆项目已试生产并实现满负荷稳定运行。装置进入稳定运行阶段后，软件层价值应从“看设备”进一步转向“在液氨、下游订单、行情、公辅、库存和装置负荷之间做及时取舍”。因此，本平台优先展示以下五类当班能力：

1. 产供销冲突、能源窗口和设备弱信号进入统一事件队列。
2. 复合肥、尿素溶液、纯碱、硝酸、液氨外售和外采采用同一机会成本口径。
3. 建议负荷与DCS实际负荷分开记录，形成执行偏差和未采纳原因。
4. 数据延迟超过15分钟时停止自动重算并转人工确认。
5. 飞书卡片、审批、任务和Base共同构成班组执行与知识回流链。

## 资料来源

- AspenTech, Aspen GDOT: https://www.aspentech.com/en/products/msc/aspen-gdot
- AVEVA, Manufacturing Execution System: https://www.aveva.com/en/products/manufacturing-execution-system/
- AVEVA, Operations and Execution Management: https://www.aveva.com/en/solutions/operations/operations-execution-management/
- Honeywell, Advanced Process Control: https://process.honeywell.com/us/en/products/industrial-software/process-optimization/advanced-process-control
- 成都云图控股股份有限公司2025年年度报告摘要: https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF
