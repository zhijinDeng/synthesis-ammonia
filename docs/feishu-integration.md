# 飞书协同与上线配置

## 业务作用

飞书承接调度建议送达、人工确认、任务跟踪和班后复盘，不承担生产控制。调度建议完成责任人确认和状态留痕后，才进入MES计划摘要或复盘记录。

| 现场问题 | 飞书处理 | 保存的记录 |
| --- | --- | --- |
| 方案解释分散 | 授权后的飞书智能问答检索班次事实、历史方案和审核规则 | 问题、答案来源、责任人和复核时间 |
| 跨岗位沟通慢 | 互动卡片送达当班群，设备、公辅、库存等明确条件触发相关专业会签，Task v2跟踪负责人和截止时间 | 确认人、审批人、负责人、触发条件和关闭说明 |
| 班后经验难复用 | 飞书多维表格记录事实、未采纳原因、执行偏差和现场判断 | 审核人、适用条件、规则版本和撤销版本 |

## 交付状态

### 已验证

- 在线方案稿：`https://www.feishu.cn/docx/AYyad50itooOPxxZpQacgSqIn2c`
- 飞书多维表格样例库：`https://www.feishu.cn/base/QzENbAkl1aYQGds8dBacqu6Inue`
- Task v2任务清单：`https://applink.feishu.cn/client/todo/task_list?guid=2ab6c357-dfeb-4f75-9aa3-781dc7ac7244`
- Task v2验收任务`t136777`：`https://applink.feishu.cn/client/todo/detail?guid=44631b59-b834-47b1-a413-b751f2f291da&suite_entity_num=t136777`

### 原型

- 互动卡片：目标负荷、处置状态、触发字段、相对外售分配贡献、撤销条件和确认按钮。
- 负荷调整审批状态机：草稿、待确认、已批准、四岗位接令、执行跟踪、班后复盘和归档。
- 跨装置调度动作单：审批后由合成主操、硝酸主操、罐区/调度和公辅调度分别接令，全部接令后才开放执行跟踪。
- 事件回传字段契约：卡片操作、审批结果、任务关闭和复盘提交。

### 待授权

- 目标调度群机器人可见范围。
- 审批定义`approval_code`、审批表单字段和审批人范围。
- Aily知识源、数据知识问答权限和人工确认约束。
- 事件订阅、回调地址、Event Secret、Encrypt Key和服务端密钥托管。
- MES、生产历史数据库及其他企业系统接口。
- 四岗位身份映射、动作单自动拆分和接令状态事件汇总。

## 当班流程

1. 平台读取班次调度事实表，生成液氨分配、负荷调整或设备检查建议。
2. 企业发布后，互动卡片将目标负荷、约束、测算值和撤销条件送达当班群。
3. 一般提示由调度员核对；设备、公辅、库存等明确条件成立时，由调度主管和对应专业会签。审批不由汇总分数驱动。
4. 审批通过后仅写入MES计划摘要，并为合成主操、硝酸主操、罐区/调度和公辅调度生成动作单。
5. 四岗位分别接令；任一岗位未接令、退回或版本不一致时，不进入执行跟踪。
6. 四岗位全部接令后开放执行跟踪。接令不等于实际执行；实际值只由Historian或企业认可的只读事实源回传，无回传时保持为空。
7. 班后把实际负荷、库存、偏差和未采纳原因写入飞书多维表格。
8. 专业人员审核记录后，才更新规则版本或纳入训练样本。

命中演练停算线时，流程在建议生成侧终止：不生成新目标、不进行经济排序、不创建动作单和审批，维持最近批准方案并转现场规程。停算事件只记录触发字段、数据时间、规则版本、通知对象和恢复条件。

## 智能问答约束

每次回答显示结论、当前数值、数据时间、适用边界、事实来源、责任人和复核时间。无可追溯来源时不输出确定性现场结论，而是创建人工复核任务。Aily尚未完成企业授权，不能写成当前已上线能力。

## 安全边界

- 平台不提供DCS/SIS写入路径，飞书按钮不直接控制装置。
- 设备趋势提示不冒充DCS报警或联锁；报警管理边界参照ISA-18并以企业制度为准。
- 数据过期、质量状态无效、输入超出适用工况范围或限值接近时，停止给出可执行建议并转人工处理。
- 24小时指标称为相对外售分配贡献测算值，不称已实现收益。

## 官方资料

- 飞书Task v2：`https://open.feishu.cn/document/task-v2/overview`
- 飞书开放平台与Aily：`https://open.feishu.cn/document/client-docs/intro?lang=zh-CN`
- Aily数据知识问答：`https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/aily-v1/data-knowledge`
## Market confirmation card

Market confirmation is a separate gate before a production-and-sales plan becomes executable. The adapter first presents source, publication time, fetch time, unit, and quality state. A business owner then confirms the enterprise ERP or quotation version. The Feishu card or approval record should retain product, region, price, unit, tax flag, freight basis, effective time, source URL, confirmer, and price version.

Public-reference refresh is not an enterprise execution-price update. NBS, CZCE, and MOFCOM sources are reference or cross-check inputs only. When confirmation fails, the price expires, or the basis is incomplete, Feishu shows “待经营确认”, freezes new economic ranking and executable plans, and keeps the last valid version. Card actions trigger confirmation, approval, or task tracking only; they never write DCS/SIS.
