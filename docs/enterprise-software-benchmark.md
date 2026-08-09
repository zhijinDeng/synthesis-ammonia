# 企业软件与行业标准对标

## 对标目的

本平台不复制DCS、MES、APC或设备软件，而是在生产运行管理层汇总班次事实、比较候选方案并跟踪人工执行。对标资料用于确认职责边界和功能取舍，不用于证明本平台已经取得生产效果。

## 标准与产品映射

| 参考对象 | 官方能力说明 | 本平台采用的做法 | 本期不做 |
| --- | --- | --- | --- |
| ISA-95 | 划分企业计划、制造运营和控制层，规定层级间的信息交换边界 | 将订单与经营数据、MES班次计划、生产历史数据和控制系统职责分开；平台位于生产运行管理层 | 不把协同平台放入DCS/SIS控制回路 |
| Aspen GDOT | 连接计划、调度和APC，支持多单元动态优化及能源网络平衡 | 比较液氨去向、装置负荷、公用工程和设备约束；向APC/RTO提供班次级目标候选 | 不替代APC，不直接闭环控制 |
| Honeywell Production Intelligence | 汇总分散数据，提供实时绩效、趋势偏离、引导诊断和知识捕获 | 班次调度事实表、设备趋势证据、检查清单和经审核的班后案例 | 不把趋势提示写成故障诊断结论 |
| ISA-18 | 规定过程工业报警的识别、合理化、优先级和全生命周期管理 | 将DCS报警与平台的一般趋势提示分开显示；平台提示不替代报警和联锁 | 不在协同平台新增未经合理化的控制报警 |
| 飞书Task v2与Aily | Task v2支持任务、成员、清单、评论和附件；Aily支持知识处理、技能编排与授权数据问答 | 已验证Task v2任务；设计卡片、审批、任务、多维表格和授权知识问答链路 | Aily、审批与事件回传未授权前不写成已上线能力 |

## 与云图业务的对应

云图控股2026年3月21日公告披露，年产70万吨合成氨项目建成并进入试生产；2025年年度报告摘要进一步说明项目与复合肥、联碱等产业链的协同关系。基于这些公开资料和企业访谈，本平台把班次级产供销协调放在首批范围内：

1. 汇总液氨库存、订单、MES计划、下游需求、公用工程和设备状态。
2. 用相对外售分配贡献比较尿素、纯碱、硝酸、复合肥和外售等液氨去向。
3. 记录建议值与实际值；企业联调前不构造DCS实际负荷。
4. 数据过期、口径冲突或输入超出适用工况范围时转人工处理。
5. 用飞书保存确认人、负责人、截止时间、执行偏差和未采纳原因。

## 官方资料

- 成都云图控股股份有限公司，70万吨合成氨项目试生产公告：`https://static.cninfo.com.cn/finalpage/2026-03-21/1225020927.PDF`
- 成都云图控股股份有限公司，2025年年度报告摘要：`https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF`
- ISA-95：`https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard`
- Aspen GDOT：`https://www.aspentech.com/en/products/msc/aspen-gdot`
- Honeywell Production Intelligence：`https://process.honeywell.com/us/en/products/industrial-software/operational-excellence/honeywell-forge-production-intelligence`
- ISA-18：`https://www.isa.org/standards-and-publications/isa-standards/isa-18-series-of-standards`
- 飞书Task v2：`https://open.feishu.cn/document/task-v2/overview`
- 飞书开放平台与Aily：`https://open.feishu.cn/document/client-docs/intro?lang=zh-CN`
- Aily数据知识问答：`https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/data-knowledge`
