# 命题理解与资料依据

## 我们如何界定问题

我们将课题界定为班次级生产调度问题：在安全和连续生产约束下，综合液氨库存、下游需求、订单、价格、公用工程和设备状态，确定液氨分配、装置负荷、外采安排及必要的停运评估。首批范围聚焦产供销协同，跨装置波动协调和设备趋势异常核对作为辅助能力。

## 资料与用途

| 资料 | 在方案中的用途 | 使用边界 |
| --- | --- | --- |
| 云图70万吨合成氨项目试生产公告、2025年年度报告摘要 | 确认项目规模、试生产状态和肥化产业链协同背景 | 不据此推断现场点位、成本或运行效果 |
| IEA氨技术路线图、节能降碳资料 | 说明合成氨能耗优化的行业背景 | 不作为本平台节能效果证明 |
| 合成氨安全标准化资料 | 约束平台不越过安环、设备和重大危险源边界 | 企业限值和操作制度优先 |
| ISA-95 | 划分企业计划、制造运营与控制系统职责 | 平台位于生产运行管理层，不进入DCS/SIS控制回路 |
| Aspen GDOT、Honeywell Production Intelligence | 对照跨单元优化、统一数据、趋势分析和知识记录能力 | 产品宣传效果不直接移植到本项目 |
| ISA-18 | 区分过程报警与一般趋势提示 | 平台提示不替代DCS报警、联锁或报警合理化工作 |
| 飞书Task v2与Aily官方资料 | 支撑任务跟踪和授权知识问答设计 | Task v2已验证；Aily仍待授权和知识源配置 |
| `data/compressor_trend_replay_sample.csv` | 验证压缩机趋势从观察、专业复核到演练停算的流程分支 | 仅为验收回放样例，标签和数值不作为企业设备阈值 |
| `data/interface_field_matrix.csv` | 核对接口字段、方向、频率、时间基准、质量规则、责任专业和超时动作 | 字段与动作是定义稿，30天校核后由企业冻结 |

## 业务判断

班次调度所需信息分散在订单、MES计划、罐区、生产历史数据库、APC、设备软件、公用工程和经营记录中。平台先用四类离线或只读数据校核口径，再逐步扩展接口。班后记录进入待审核案例库，生产、设备和安环专业确认适用条件后，才修订规则或纳入训练样本。

24小时经济指标统一称为“相对外售分配贡献测算值”，用于比较液氨不同去向，不表示已经实现的收益。

试点预登记目标为数据可用率不低于98%、物料平衡残差不高于1.5%、快照重算P95不高于120秒、调度决策中位耗时较基线缩短不低于30%。这些目标是验收定义稿，不表示当前已实现；计算口径、基线和排除项在30天校核后由企业冻结。

## 核心官方资料

- 70万吨合成氨项目试生产公告：`https://static.cninfo.com.cn/finalpage/2026-03-21/1225020927.PDF`
- 2025年年度报告摘要：`https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF`
- ISA-95：`https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard`
- Aspen GDOT：`https://www.aspentech.com/en/products/msc/aspen-gdot`
- Honeywell Production Intelligence：`https://process.honeywell.com/us/en/products/industrial-software/operational-excellence/honeywell-forge-production-intelligence`
- ISA-18：`https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards`
- 飞书Task v2：`https://open.feishu.cn/document/task-v2/overview`
- 飞书开放平台与Aily：`https://open.feishu.cn/document/client-docs/intro?lang=zh-CN`
- Aily数据知识问答：`https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/data-knowledge`
