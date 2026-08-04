from __future__ import annotations

import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "提交材料"
DOCS = ROOT / "docs"
DATA = ROOT / "data"
ASSETS = ROOT / "assets"

FONT_CN = "Microsoft YaHei"
FONT_EN = "Calibri"
BLUE = RGBColor(24, 78, 119)
DARK = RGBColor(13, 31, 48)
GRAY = RGBColor(90, 105, 118)
LIGHT_BLUE = "EAF2F8"
LIGHT_GRAY = "F4F6F8"
LIGHT_GREEN = "EAF7EF"


REFERENCES = [
    "IEA. Ammonia Technology Roadmap. International Energy Agency. https://www.iea.org/reports/ammonia-technology-roadmap",
    "成都云图控股股份有限公司. 2025年年度报告摘要. 巨潮资讯. https://static.cninfo.com.cn/finalpage/2026-04-15/1225100697.PDF",
    "成都云图控股股份有限公司. 关于全资子公司70万吨合成氨项目建成试生产的公告. 巨潮资讯. https://static.cninfo.com.cn/finalpage/2026-03-21/1225020927.PDF",
    "成都云图控股股份有限公司. 投资者关系活动记录表. 巨潮资讯. https://static.cninfo.com.cn/finalpage/2026-04-16/1225109829.PDF",
    "Kong et al. Nonlinear Model Predictive Control of Flexible Ammonia Production. 2024 preprint. https://qizh.cems.umn.edu/sites/qizh.cems.umn.edu/files/2024-04/Kong_et_al-2024-preprint-NMPC_ammonia_production.pdf",
    "Dynamic Simulation and Optimization for Load Regulation of the Haber-Bosch Process. Industrial & Engineering Chemistry Research. https://pubs.acs.org/doi/10.1021/acs.iecr.4c02410",
    "AQ/T 3017-2008. 合成氨生产企业安全标准化实施指南. 应急管理部. https://www.mem.gov.cn/fw/flfgbz/bz/bzwb/201301/P020190327398204066876.pdf",
    "国家发展改革委. 合成氨行业节能降碳改造升级实施指南解读. https://www.ndrc.gov.cn/xwdt/ztzl/ghnhyjnjdgzsj/zjgd/202208/t20220829_1334056.html",
    "应急管理部办公厅. 工业互联网+危化安全生产试点建设方案. https://www.mem.gov.cn/gk/zfxxgkpt/fdzdgknr/202104/t20210407_382882.shtml",
    "飞书开放平台. 消息、审批、多维表格与事件订阅相关OpenAPI文档. https://open.feishu.cn/document/",
]


PART1 = (
    "本命题考察的不是再造一块展示看板，而是在合成氨硬件单位成本已接近极限后，"
    "能否用AI把运行管理中的“软件成本”继续压低。云图应城合成氨装置连接尿素溶液、"
    "复合肥、联碱配套、液氨库存与外售，调度同时受合成塔床层温升、氢氮比、循环压缩机、"
    "罐区安全库存、能源价格、下游订单和设备健康约束。真正有价值的方案应能进入班组日常："
    "实时感知、多方案寻优、解释安全边界、推动确认执行、沉淀采纳与未采纳原因，逐步形成可传承的合成氨调度知识资产。"
)

PART2 = (
    "本方案建设“氨智领航调控师”，定位为合成氨当班调度副驾驶。平台先以30天打通MES日计划、ERP订单、DCS historian摘要、"
    "液氨罐区、EAM点检、能源价格与飞书协同记录，形成班次事实表；60天进入影子运行，滚动输出稳氨、保供、护机三案，"
    "每案列明目标负荷、下游分配、吨氨边际成本、风险指数、审批路径和回滚条件；90天只在低风险场景做小闭环验收。"
    "模型层采用机理约束+RTO经济目标+APC/MPC连续负荷建议+PINN反应器校准的组合，确保算法能与企业现有控制体系对话。"
    "组织层接入飞书互动卡片、审批、多维表格和班后复盘，保留谁确认、谁驳回、为何采纳、执行偏差如何的完整链路。"
    "知识层把每次实际方案、未采纳原因、床层温升异常、氢氮比偏差、压缩机健康变化和收益核算沉淀为知识库，周度校准模型与规则。"
    "平台不直接修改DCS/SIS控制逻辑，不自动开停车；低置信、数据延迟、安环红线接近时自动降级人工流程。"
)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.replace("\n", "\r\n"), encoding="utf-8")


def set_run_font(run, size=None, bold=None, color=None):
    run.font.name = FONT_CN
    run._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_CN)
    run._element.rPr.rFonts.set(qn("w:ascii"), FONT_EN)
    run._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_EN)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color is not None:
        run.font.color.rgb = color


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tc_pr.append(shd)


def set_cell_margins(cell, top=90, start=120, bottom=90, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for key, value in {"top": top, "start": start, "bottom": bottom, "end": end}.items():
        node = tc_mar.find(qn(f"w:{key}"))
        if node is None:
            node = OxmlElement(f"w:{key}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def setup_doc(title: str, subtitle: str) -> Document:
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.78)
    section.bottom_margin = Inches(0.78)
    section.left_margin = Inches(0.86)
    section.right_margin = Inches(0.86)
    section.header_distance = Inches(0.38)
    section.footer_distance = Inches(0.38)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT_CN
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_CN)
    normal._element.rPr.rFonts.set(qn("w:ascii"), FONT_EN)
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_EN)
    normal.font.size = Pt(10.5)
    normal.paragraph_format.line_spacing = 1.18
    normal.paragraph_format.space_after = Pt(5)

    for name, size in [("Heading 1", 15), ("Heading 2", 12.5), ("Heading 3", 11.5)]:
        style = styles[name]
        style.font.name = FONT_CN
        style._element.rPr.rFonts.set(qn("w:eastAsia"), FONT_CN)
        style._element.rPr.rFonts.set(qn("w:ascii"), FONT_EN)
        style._element.rPr.rFonts.set(qn("w:hAnsi"), FONT_EN)
        style.font.size = Pt(size)
        style.font.color.rgb = BLUE
        style.font.bold = True
        style.paragraph_format.space_before = Pt(10)
        style.paragraph_format.space_after = Pt(5)

    header = section.header.paragraphs[0]
    header.text = "氨智领航调控师 | 合成氨生产调度专家平台"
    header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    set_run_font(header.runs[0], size=8.5, color=GRAY)

    section.footer.paragraphs[0].text = ""

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(title)
    set_run_font(r, size=21, bold=True, color=DARK)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(subtitle)
    set_run_font(r, size=10.5, color=GRAY)
    p.paragraph_format.space_after = Pt(15)
    return doc


def para(doc: Document, text: str, bold_prefix: str | None = None):
    p = doc.add_paragraph()
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        set_run_font(r, bold=True)
        r = p.add_run(text[len(bold_prefix):])
        set_run_font(r)
    else:
        r = p.add_run(text)
        set_run_font(r)
    return p


def bullets(doc: Document, items: list[str]):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        r = p.add_run(item)
        set_run_font(r)


def numbers(doc: Document, items: list[str]):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        r = p.add_run(item)
        set_run_font(r)


def table(doc: Document, headers: list[str], rows: list[list[str]], widths: list[float]):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.style = "Table Grid"
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    for idx, header in enumerate(headers):
        cell = tbl.rows[0].cells[idx]
        set_cell_shading(cell, LIGHT_BLUE)
        set_cell_margins(cell)
        cell.width = Inches(widths[idx])
        r = cell.paragraphs[0].add_run(header)
        set_run_font(r, bold=True)
    for row in rows:
        cells = tbl.add_row().cells
        for idx, value in enumerate(row):
            cells[idx].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cells[idx].width = Inches(widths[idx])
            set_cell_margins(cells[idx])
            r = cells[idx].paragraphs[0].add_run(value)
            set_run_font(r, size=9.2)
    return tbl


def add_references(doc: Document):
    doc.add_heading("参考文献与资料来源", level=1)
    for i, ref in enumerate(REFERENCES, 1):
        para(doc, f"[{i}] {ref}")


def save(doc: Document, filename: str):
    MATERIALS.mkdir(exist_ok=True)
    path = MATERIALS / filename
    doc.save(path)
    return path


def build_opening_report():
    doc = setup_doc("开题报告", "命题：如何用AI打造合成氨生产调度专家")
    doc.add_heading("Part 1：命题前置分析与洞察", level=1)
    para(doc, PART1)
    doc.add_heading("Part 2：整体解决方案设计", level=1)
    para(doc, PART2)
    doc.add_heading("命题理解", level=1)
    table(
        doc,
        ["命题关注", "本方案回应", "可验证结果"],
        [
            ["调度寻优难", "用班次事实表统一订单、库存、能耗、设备和工艺约束，输出稳氨/保供/护机三案。", "每班保留原计划、系统方案、采纳结果和实际偏差。"],
            ["指挥效率低", "将调度建议转为飞书卡片、审批单、交接摘要和执行监督窗口。", "班前会只看差异、约束和确认事项。"],
            ["知识传承难", "把采纳、驳回、异常处置和专家判断沉淀为合成负荷指令库与异常经验库。", "周度复盘形成规则修订和模型校准记录。"],
            ["企业可落地", "先影子运行，不改DCS/SIS；低风险小闭环后再扩展。", "30/60/90天节奏、停用条件和收益口径明确。"],
        ],
        [1.2, 2.75, 2.45],
    )
    add_references(doc)
    return save(doc, "01_开题报告.docx")


def build_solution_doc():
    doc = setup_doc("整体解决方案书", "氨智领航调控师：面向云图合成氨装置的软件层成本优化平台")
    doc.add_heading("1. 方案定位", level=1)
    para(
        doc,
        "平台不是替代DCS/SIS/APC的控制系统，而是位于生产运行管理层的智能调度副驾驶。它把实时工况、订单、库存、设备健康、能源窗口和专家规则组织成班次级决策，帮助调度员在安全边界内找到吨氨综合成本更优的执行方案。",
    )
    doc.add_heading("2. 总体架构", level=1)
    table(
        doc,
        ["层级", "核心对象", "交付内容"],
        [
            ["数据底座", "MES、ERP、DCS historian、罐区、EAM点检、飞书记录", "班次事实表、口径字典、数据质量评分"],
            ["可信模型", "机理约束、PINN反应器校准、设备健康预测、库存/订单预测", "模型版本、置信度、漂移监控、回放验证报告"],
            ["优化调度", "RTO经济目标、APC/MPC连续负荷建议、启发式现场规则", "稳氨/保供/护机三案、风险解释、回滚条件"],
            ["协同执行", "飞书卡片、审批、多维表格、交接摘要", "确认人、审批人、执行时间、采纳/驳回原因"],
            ["知识迭代", "合成负荷指令库、异常经验库、未采纳原因库", "周度规则修订、模型校准样本、经验复用清单"],
        ],
        [1.1, 2.35, 3.05],
    )
    doc.add_heading("3. 与APC/RTO体系的接口关系", level=1)
    bullets(
        doc,
        [
            "APC侧：平台不覆盖底层控制回路，只读取关键受控变量和约束余量，输出班次级目标负荷、升降负荷速率建议和需保持的边界条件。",
            "RTO侧：平台把天然气/煤气化、蒸汽、电力、液氨库存占用、订单延期和外售机会成本转化为经济目标，供实时优化或离线回放使用。",
            "PINN/机理侧：以合成塔热平衡、反应器温升、氢氮比、循环气量、压缩机效率作为模型约束，避免纯数据模型给出现场不可执行的方案。",
            "MES侧：审批通过后只写入计划、交接摘要和复盘记录，不直接写入DCS/SIS控制参数。",
        ],
    )
    doc.add_heading("4. 典型场景", level=1)
    table(
        doc,
        ["场景", "触发条件", "推荐动作", "企业收益"],
        [
            ["订单冲刺", "尿素溶液/复合肥用氨急单、液氨库存偏低", "提高合成回路负荷，压缩弹性外售，优先保障高优订单。", "减少延期与跨单元等待。"],
            ["能源错峰", "蒸汽/电力/原料窗口价格上行", "高价窗口压产，低价窗口补库存，保持安全库存。", "降低吨氨边际能耗成本。"],
            ["设备护机", "循环压缩机健康评分下降或合成塔温升异常", "降低负荷上限，插入点检窗口，冻结激进方案。", "降低非计划停车风险。"],
            ["低置信降级", "关键点位延迟、订单口径不一致、模型漂移超阈值", "只给规则提醒，不回写计划，进入人工确认。", "保证系统可信边界。"],
        ],
        [1.0, 2.0, 2.45, 1.45],
    )
    doc.add_heading("5. 30/60/90天落地路径", level=1)
    table(
        doc,
        ["阶段", "目标", "交付物", "验收口径"],
        [
            ["30天", "统一数据口径和班次事实表", "接口清单、字段字典、数据质量报告、飞书协同草案", "关键字段完整、调度员能核对口径。"],
            ["60天", "影子运行对比人工调度", "每班三案、采纳/未采纳原因、回放报告", "覆盖早晚班、急单、库存偏低、设备护机场景。"],
            ["90天", "低风险小闭环验收", "审批链、MES计划回写、班后复盘、规则库版本", "至少一项收益指标稳定改善或形成明确停用依据。"],
        ],
        [0.75, 1.65, 2.15, 2.05],
    )
    doc.add_heading("6. 验收与停用条件", level=1)
    bullets(
        doc,
        [
            "通过条件：高优订单满足率不低于人工调度；单位氨能耗、库存占用、调度耗时或异常预警提前量至少一项稳定改善。",
            "收益口径：只核算被采纳且实际执行的方案，剔除市场行情自然波动、检修计划、物流异常等外部影响。",
            "停用条件：关键数据延迟超过15分钟、核心点位缺失、模型连续两天偏差超阈值、安环红线接近且无法解释。",
        ],
    )
    add_references(doc)
    return save(doc, "02_整体解决方案书.docx")


def build_manual_doc():
    doc = setup_doc("调控师操作手册", "班组日常使用、飞书协同与异常降级")
    doc.add_heading("1. 当班操作流程", level=1)
    table(
        doc,
        ["时间点", "调控师动作", "现场确认", "留痕位置"],
        [
            ["班前30分钟", "刷新订单、库存、设备健康、能源窗口，生成三案。", "调度员确认口径是否与MES/罐区一致。", "班次事实表"],
            ["班前会", "展示与原计划差异、约束触发、审批要求和交接摘要。", "班长确认采用稳氨/保供/护机方案。", "飞书卡片"],
            ["班中偏差", "库存、设备、订单或能价超阈值时重算。", "未确认前仍按原计划执行。", "重算事件表"],
            ["班后复盘", "记录采纳、未采纳、实际负荷、能耗、库存和异常原因。", "班长补充经验判断。", "多维表格/知识库"],
        ],
        [1.0, 2.2, 2.0, 1.3],
    )
    doc.add_heading("2. 飞书协同动作", level=1)
    bullets(
        doc,
        [
            "互动卡片：发送目标负荷、风险指数、触发约束、收益口径和确认按钮到合成氨当班调度群。",
            "审批实例：高风险负荷调整自动生成审批草稿，字段包括装置、模式、目标负荷、业务理由、风险、回滚条件。",
            "多维表格：沉淀班次事实、方案采纳、未采纳原因、执行偏差、复盘结论和周度校准状态。",
            "Aily入口：支持调度员用自然语言追问“为什么建议降负荷”“液氨库存还能撑多久”“压缩机健康下降时如何护机”。",
        ],
    )
    doc.add_heading("3. 异常处理原则", level=1)
    numbers(
        doc,
        [
            "安全先于收益：合成塔、压缩机、罐区和安环红线一旦接近阈值，方案自动降级。",
            "解释先于执行：无法解释触发约束、收益来源和回滚条件的方案不得采纳。",
            "人工先于闭环：MVP阶段不自动开停车，不直接改DCS/SIS，不绕过既有审批链。",
            "复盘先于迭代：未采纳原因和实际偏差是模型升级的核心样本。",
        ],
    )
    return save(doc, "03_调控师操作手册.docx")


def build_reference_doc():
    doc = setup_doc("参考文献与数据依据", "合成氨调度专家平台证据链")
    doc.add_heading("资料如何进入方案", level=1)
    table(
        doc,
        ["资料类型", "支撑问题", "方案体现"],
        [
            ["云图公告与年报", "70万吨合成氨与下游肥化产业链协同", "以尿素溶液、复合肥、联碱、液氨外售作为调度对象。"],
            ["合成氨安全资料", "高温高压连续流程的安全边界", "DCS/SIS隔离、安环红线、罐区安全库存、停用条件。"],
            ["MPC/RTO与负荷调节研究", "连续装置动态优化可行性", "班次级目标负荷、经济目标、回放验证和模型治理。"],
            ["工业互联网与数字化转型资料", "生产调度经验库和执行反馈", "飞书协同、多维表格、知识库、周度迭代。"],
        ],
        [1.35, 2.2, 2.95],
    )
    doc.add_heading("关键事实提炼", level=1)
    bullets(
        doc,
        [
            "合成氨既是高能耗基础化工环节，也是氮肥产业链的关键原料入口，软件层运行优化具有持续价值。",
            "云图合成氨项目的价值不是单点稳产，而是增强肥化产业链原料自给、降低外采波动并支撑下游产品协同。",
            "动态优化必须服从机理、安全和设备约束，不能把算法结果直接等同于可执行控制指令。",
            "企业试点需要从影子运行、人工确认、收益归因和停用条件开始，逐步进入小闭环。",
        ],
    )
    add_references(doc)
    return save(doc, "04_参考文献与数据依据.docx")


def build_innovation_doc():
    doc = setup_doc("方案创新与落地清单", "从入围方案到决赛试点包的升级")
    doc.add_heading("1. 入围优势沉淀", level=1)
    table(
        doc,
        ["优势", "已经形成的基础", "决赛版强化"],
        [
            ["结构化程度", "三大挑战、三案、30/60/90天路径清晰。", "新增APC/RTO接口、PINN可信模型、飞书协同与验收数据表。"],
            ["落地路径", "影子运行、小闭环、班次复盘明确。", "补齐字段字典、审批链、停用条件和收益归因方法。"],
            ["代码开放", "已有GitHub平台原型和文档材料。", "补充可交互调控台、飞书卡片预览、知识库表结构和试点交付清单。"],
        ],
        [1.2, 2.35, 2.55],
    )
    doc.add_heading("2. 决赛创新点", level=1)
    table(
        doc,
        ["创新点", "企业价值", "可验证方式"],
        [
            ["机理+PINN可信孪生", "把反应器温升、氢氮比、循环气量和压缩机效率纳入约束，减少外行化建议。", "离线回放对比模型偏差和约束触发记录。"],
            ["APC/RTO对接层", "不重做控制系统，能与现有APC/RTO体系低风险对话。", "接口清单、变量映射、写回边界和审批记录。"],
            ["飞书班组闭环", "让建议进入真实通知、审批、复盘和责任留痕。", "卡片、审批、多维表格、Aily问答四类样例。"],
            ["未采纳原因学习", "把专家否决和现场经验沉淀为知识资产。", "每周输出规则修订和模型校准样本。"],
            ["反事实收益归因", "避免把行情波动误算为系统收益。", "保留原计划、推荐方案、采纳结果和实际执行差异。"],
        ],
        [1.4, 2.45, 2.35],
    )
    doc.add_heading("3. 首批上线清单", level=1)
    bullets(
        doc,
        [
            "数据：班次事实表、接口字段字典、数据质量评分、异常点位清单。",
            "模型：稳氨/保供/护机三案、可信度、漂移监控、回放验证报告。",
            "协同：飞书互动卡片、负荷调整审批、多维表格复盘、Aily问答入口。",
            "治理：DCS/SIS隔离、人工确认、停用条件、收益归因和周度复盘机制。",
        ],
    )
    add_references(doc)
    return save(doc, "05_方案创新与落地清单.docx")


def build_final_doc():
    doc = setup_doc("决赛完整方案文档", "云图控股合成氨命题 | 氨智领航调控师")
    doc.add_heading("一、参赛方案信息卡", level=1)
    table(
        doc,
        ["项目", "填写内容"],
        [
            ["队名", "氨智领航队"],
            ["命题", "如果来到全球领先的合成氨生产装置现场，如何用AI打造一个生产调度专家？"],
            ["方案标题", "氨智领航调控师：合成氨生产调度专家平台"],
            ["一句话摘要", "在不触碰DCS/SIS底层控制的前提下，用机理可信模型、APC/RTO接口、飞书班组闭环和知识库自迭代，帮助合成氨调度员持续优化吨氨综合成本。"],
            ["成员介绍与分工", "邓植斤：负责命题洞察、行业资料研读、系统架构、平台原型、飞书协同设计、提交材料与GitHub交付。"],
            ["使用的飞书AI能力", "飞书互动卡片、审批、多维表格、Aily问答入口、事件回调、班后复盘知识沉淀。"],
        ],
        [1.45, 4.95],
    )
    doc.add_heading("二、方案成果展示", level=1)
    para(doc, "本方案已形成可本地打开的调控师工作台、数据模型、架构文档、飞书协同设计、操作手册、参考文献与决赛补充材料。平台主界面面向企业现场人员，核心围绕当班调度的目标负荷、风险边界、下游分配、飞书确认和复盘沉淀。")
    doc.add_heading("三、命题场景与痛点", level=1)
    bullets(doc, [
        "调度寻优难：订单、库存、能源、设备健康和下游消纳同时变化，人工难以及时找到吨氨综合成本更优方案。",
        "指挥效率低：调度建议需要班组、调度主管、设备和安环协同确认，人工链条长且留痕弱。",
        "知识传承难：专家判断常沉淀在经验和口头交接中，未采纳原因没有被结构化利用。",
    ])
    doc.add_heading("四、方案优势与创新", level=1)
    table(
        doc,
        ["模块", "能力", "不同于常规方案之处"],
        [
            ["可信模型", "机理约束、PINN校准、APC/RTO接口、MPC建议", "不只喊大模型，先保证合成氨现场可执行。"],
            ["调度执行", "稳氨/保供/护机三案和班次事实表", "把推荐落到班前会和MES计划口径。"],
            ["飞书闭环", "卡片、审批、多维表格、Aily问答、事件回调", "让AI建议进入企业真实协同链。"],
            ["知识迭代", "采纳/驳回/偏差/收益归因沉淀", "把专家否决原因也变成训练样本。"],
        ],
        [1.1, 2.35, 2.95],
    )
    doc.add_heading("五、业务范围与落地价值", level=1)
    para(doc, "首批覆盖合成氨、液氨库存、尿素溶液、复合肥、联碱配套和液氨外售的协同调度。价值指标采用保守口径：高优订单满足率、单位氨能耗、液氨库存占用、调度耗时、异常预警提前量和采纳方案收益归因。")
    doc.add_heading("六、飞书功能接入", level=1)
    table(
        doc,
        ["飞书能力", "业务动作", "需要授权"],
        [
            ["互动卡片", "推送目标负荷、风险指数、触发约束和确认按钮。", "机器人发消息、目标群可见权限。"],
            ["审批", "高风险负荷调整创建审批实例。", "approval_code、审批API权限、审批人范围。"],
            ["多维表格", "写入班次事实、采纳结果、未采纳原因、复盘结论。", "目标表格协作者权限和记录读写权限。"],
            ["Aily入口", "调度员自然语言追问方案理由和异常处置。", "知识源、工具动作与人工确认约束。"],
            ["事件回调", "接收卡片点击、审批通过/驳回、复盘提交。", "事件订阅、公网回调地址或内网代理。"],
        ],
        [1.2, 2.45, 2.75],
    )
    doc.add_heading("七、落地验证", level=1)
    numbers(doc, [
        "30天：数据口径、接口映射、飞书草案、班次事实表。",
        "60天：影子运行、人工调度对比、未采纳原因沉淀。",
        "90天：低风险小闭环、收益归因、停用条件验证。",
    ])
    doc.add_heading("八、方案体验入口与演示说明", level=1)
    para(doc, "体验入口：本地打开 D:\\云图-合成氨-邓植斤\\index.html，或访问 GitHub 仓库 https://github.com/zhijinDeng/synthesis-ammonia 查看完整静态平台、数据模型和提交材料。")
    para(doc, "演示流程控制在3-5分钟：先切换稳氨、保供、护机、错峰四个场景；再拖动订单、能源、设备健康和库存滑块；随后展示APC/RTO对接、机理/PINN可信模型、飞书卡片/审批/多维表格复盘和知识库自迭代。")
    doc.add_heading("九、自由展示区", level=1)
    bullets(doc, [
        "项目已形成可交互页面、可复现生成脚本、数据模型、Word提交材料和GitHub开放仓库。",
        "方案语言保持企业现场视角，聚焦装置运行、班组协同、收益核算和知识沉淀。",
        "首轮优势是结构化闭环和落地路径；决赛版进一步补上控制体系对接、模型可信度和飞书组织协同。",
    ])
    doc.add_heading("十、附录", level=1)
    bullets(doc, [
        "附录A：参考文献与数据依据见 04_参考文献与数据依据.docx。",
        "附录B：调控师班组使用流程见 03_调控师操作手册.docx。",
        "附录C：飞书真实接入需企业自建应用、审批定义、多维表格权限和事件回调配置。",
    ])
    add_references(doc)
    return save(doc, "06_决赛完整方案文档.docx")


def build_submission_summary():
    doc = setup_doc("提交信息汇总", "用于在线表单填写与附件核对")
    doc.add_heading("开题报告Part 1", level=1)
    para(doc, f"{PART1}（约{len(PART1)}字）")
    doc.add_heading("开题报告Part 2", level=1)
    para(doc, f"{PART2}（约{len(PART2)}字）")
    doc.add_heading("附件材料", level=1)
    table(
        doc,
        ["附件", "用途"],
        [
            ["01_开题报告.docx", "在线表单两个必填文本框的完整版本。"],
            ["02_整体解决方案书.docx", "系统架构、APC/RTO接口、试点路径与验收边界。"],
            ["03_调控师操作手册.docx", "班组如何使用平台、飞书协同和异常降级。"],
            ["04_参考文献与数据依据.docx", "公司资料、行业资料、合成氨控制优化与安全依据。"],
            ["05_方案创新与落地清单.docx", "入围优势沉淀、决赛创新点和上线清单。"],
            ["06_决赛完整方案文档.docx", "按飞书模板结构组织的信息卡与完整方案。"],
        ],
        [2.1, 4.3],
    )
    doc.add_heading("链接材料", level=1)
    para(doc, "GitHub：https://github.com/zhijinDeng/synthesis-ammonia")
    para(doc, "本地平台入口：D:\\云图-合成氨-邓植斤\\index.html")
    return save(doc, "00_提交信息汇总.docx")


def write_platform():
    index = """<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>氨智领航调控师</title>
    <link rel="stylesheet" href="assets/styles.css" />
  </head>
  <body>
    <header class="topbar">
      <div>
        <p class="eyebrow">Yuntu Ammonia Dispatch Expert</p>
        <h1>氨智领航调控师</h1>
        <p class="subtitle">面向合成氨装置运行管理的软件层成本优化、协同指挥与知识沉淀平台</p>
      </div>
      <div class="scenario-tabs" aria-label="调度场景">
        <button data-preset="steady" type="button">稳氨</button>
        <button data-preset="supply" type="button">保供</button>
        <button data-preset="protect" type="button">护机</button>
        <button data-preset="energy" type="button">错峰</button>
      </div>
    </header>

    <main class="shell">
      <aside class="rail">
        <section class="panel">
          <div class="panel-title"><span>实时调度输入</span><strong id="modeLabel">稳氨优化</strong></div>
          <label class="slider"><span>下游订单压力</span><input data-key="demand" type="range" min="0" max="100" value="76" /><output id="demandOut">76</output></label>
          <label class="slider"><span>能源/蒸汽成本</span><input data-key="energy" type="range" min="0" max="100" value="64" /><output id="energyOut">64</output></label>
          <label class="slider"><span>压缩机/合成塔健康</span><input data-key="health" type="range" min="0" max="100" value="82" /><output id="healthOut">82</output></label>
          <label class="slider"><span>液氨库存水位</span><input data-key="inventory" type="range" min="0" max="100" value="58" /><output id="inventoryOut">58</output></label>
          <label class="slider"><span>低碳能源可用</span><input data-key="green" type="range" min="0" max="100" value="34" /><output id="greenOut">34</output></label>
        </section>

        <section class="panel">
          <div class="panel-title"><span>调控师指令</span><strong>当班</strong></div>
          <div class="action-grid">
            <button data-action="recalc" type="button">重算方案</button>
            <button data-action="card" type="button">飞书卡片</button>
            <button data-action="approval" type="button">发起审批</button>
            <button data-action="bitable" type="button">写入复盘</button>
          </div>
          <div id="operatorNote" class="note"></div>
          <div id="eventLog" class="log" aria-live="polite"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>上线边界</span><strong>MVP</strong></div>
          <ul class="compact-list">
            <li>不直接写DCS/SIS控制参数</li>
            <li>不自动开停车，不绕过审批链</li>
            <li>先影子运行，再低风险小闭环</li>
            <li>数据低可信时降级人工流程</li>
          </ul>
        </section>
      </aside>

      <section class="stage">
        <section class="hero-panel">
          <img src="assets/process-map.svg" alt="合成氨至下游产品协同流程图" />
          <div class="hero-copy">
            <span>合成氨生产调度专家</span>
            <h2 id="strategyTitle">稳定合成回路负荷，平衡液氨库存与下游消纳</h2>
            <p id="strategyText"></p>
          </div>
        </section>

        <section class="kpi-row">
          <article><span>目标负荷</span><strong id="loadKpi">86%</strong><small>合成回路建议</small></article>
          <article><span>日产氨</span><strong id="nh3Kpi">1,677t</strong><small>按70万吨/年折算</small></article>
          <article><span>吨氨收益</span><strong id="marginKpi">+7.8%</strong><small>采纳方案口径</small></article>
          <article><span>风险指数</span><strong id="riskKpi">32</strong><small>约束触发评分</small></article>
        </section>

        <section class="panel">
          <div class="panel-title"><span>三案比选</span><strong id="bestPlan">优选：稳氨</strong></div>
          <div id="scenarioCards" class="scenario-cards"></div>
        </section>

        <section class="grid-2">
          <section class="panel">
            <div class="panel-title"><span>APC/RTO对接层</span><strong>不重做控制系统</strong></div>
            <div id="interfaceMap" class="interface-map"></div>
          </section>
          <section class="panel">
            <div class="panel-title"><span>机理/PINN可信模型</span><strong id="modelTrust">可影子运行</strong></div>
            <div id="modelCards" class="model-cards"></div>
          </section>
        </section>

        <section class="panel">
          <div class="panel-title"><span>班次排产草案</span><strong id="shiftSummary">24h滚动</strong></div>
          <div id="gantt" class="gantt"></div>
        </section>

        <section class="grid-2">
          <section class="panel">
            <div class="panel-title"><span>约束解释</span><strong id="constraintCount">5项</strong></div>
            <div id="constraints" class="stack"></div>
          </section>
          <section class="panel">
            <div class="panel-title"><span>收益归因</span><strong>反事实口径</strong></div>
            <div id="benefitTrace" class="stack"></div>
          </section>
        </section>

        <section class="grid-2">
          <section class="panel">
            <div class="panel-title"><span>飞书班组闭环</span><strong id="feishuStatus">本地预览</strong></div>
            <div id="feishuPreview" class="feishu-preview"></div>
          </section>
          <section class="panel">
            <div class="panel-title"><span>知识库自迭代</span><strong>每班沉淀</strong></div>
            <div id="knowledgeLoop" class="stack"></div>
          </section>
        </section>

        <section class="panel">
          <div class="panel-title"><span>30/60/90天试点交付</span><strong>可验收</strong></div>
          <div id="pilotRoadmap" class="roadmap"></div>
        </section>
      </section>

      <aside class="rail">
        <section class="panel">
          <div class="panel-title"><span>岗位视图</span><strong>同屏协同</strong></div>
          <div id="roleViews" class="stack"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>数据接口优先级</span><strong>首批</strong></div>
          <div id="dataInterfaces" class="stack"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>飞书授权项</span><strong>上线前</strong></div>
          <ul class="compact-list">
            <li>企业自建应用 App ID / App Secret</li>
            <li>目标调度群机器人可见权限</li>
            <li>负荷调整审批 approval_code</li>
            <li>多维表格读写权限与字段映射</li>
            <li>事件订阅回调地址与签名校验</li>
          </ul>
        </section>
      </aside>
    </main>

    <script src="assets/app.js"></script>
  </body>
</html>
"""
    write_text(ROOT / "index.html", index)


def write_styles():
    css = """:root {
  --ink: #102132;
  --muted: #617386;
  --line: #d9e3ec;
  --panel: #fff;
  --bg: #eef3f7;
  --blue: #246f9e;
  --green: #2f9e67;
  --yellow: #d89a27;
  --red: #c94d4d;
  --navy: #0f2638;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  color: var(--ink);
  background: var(--bg);
  font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
  letter-spacing: 0;
  overflow-x: hidden;
}
button, input { font: inherit; }
span, p, li, strong, b, small { overflow-wrap: anywhere; }
.topbar {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 28px;
  color: #fff;
  background: #10283b;
  border-bottom: 1px solid rgba(255,255,255,.16);
}
.eyebrow { margin: 0 0 8px; color: #bdd7e6; font-size: 12px; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(26px, 3vw, 40px); line-height: 1.12; letter-spacing: 0; }
h2 { margin: 0 0 10px; font-size: 25px; line-height: 1.25; letter-spacing: 0; }
.subtitle { margin: 9px 0 0; max-width: 780px; color: #d8e7f0; line-height: 1.55; }
.scenario-tabs { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
button {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid #cbdce8;
  border-radius: 6px;
  color: #102132;
  background: #eef6fb;
  cursor: pointer;
}
button:hover { border-color: var(--blue); }
.scenario-tabs button { color: #0f2638; background: #e9f4ff; border-color: #b7d2e6; }
.shell {
  display: grid;
  grid-template-columns: minmax(280px, 330px) minmax(560px, 1fr) minmax(280px, 350px);
  gap: 18px;
  padding: 18px;
}
.rail, .stage { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.panel, .hero-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(21,43,64,.08);
  min-width: 0;
}
.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 52px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}
.panel-title span { color: var(--muted); font-size: 14px; }
.panel-title strong { color: var(--blue); font-size: 14px; text-align: right; }
.slider {
  display: grid;
  grid-template-columns: 126px 1fr 34px;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
}
.slider span { color: #34495a; font-size: 13px; }
input[type="range"] { width: 100%; accent-color: var(--blue); }
output { font-weight: 700; text-align: right; }
.action-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; padding: 14px 16px 0; }
.note {
  margin: 14px 16px 0;
  padding: 12px;
  color: #314658;
  background: #f7fafc;
  border: 1px solid #dfe8ef;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.55;
}
.log { display: grid; gap: 8px; max-height: 210px; overflow: auto; padding: 12px 16px 16px; }
.log div, .stack article, .interface-map article, .model-cards article {
  padding: 12px;
  background: #f7fafc;
  border: 1px solid #dfe8ef;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}
.log b, .stack b, .interface-map b, .model-cards b { display: block; margin-bottom: 5px; color: var(--navy); font-size: 14px; }
.compact-list { margin: 0; padding: 16px 18px 18px 34px; color: #354a5c; line-height: 1.62; }
.compact-list li { margin-bottom: 8px; }
.hero-panel {
  position: relative;
  min-height: 270px;
  overflow: hidden;
  color: #fff;
  background: #10283b;
}
.hero-panel img { width: 100%; height: 100%; min-height: 270px; object-fit: cover; opacity: .9; }
.hero-copy {
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 20px;
  max-width: 760px;
  text-shadow: 0 2px 14px rgba(0,0,0,.38);
}
.hero-copy span { display: inline-block; margin-bottom: 8px; color: #cfe8f5; font-size: 13px; }
.hero-copy p { margin: 0; color: #e9f5fb; line-height: 1.6; }
.kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.kpi-row article {
  min-height: 116px;
  padding: 15px;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(21,43,64,.06);
}
.kpi-row span, .kpi-row small { display: block; color: var(--muted); font-size: 13px; }
.kpi-row strong { display: block; margin: 10px 0 8px; color: var(--navy); font-size: 30px; line-height: 1; }
.grid-2 { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 18px; }
.scenario-cards, .interface-map, .model-cards, .stack, .feishu-preview, .roadmap { display: grid; gap: 12px; padding: 16px; }
.scenario-cards { grid-template-columns: repeat(3, minmax(0,1fr)); }
.scenario {
  padding: 14px;
  background: #f7fafc;
  border: 1px solid #dfe8ef;
  border-top: 4px solid var(--blue);
  border-radius: 8px;
}
.scenario.best { border-color: #a8d7bd; border-top-color: var(--green); background: #f1fbf5; }
.scenario b { display: block; margin-bottom: 8px; color: var(--navy); font-size: 16px; }
.scenario p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
.mini-kpis { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; margin-top: 10px; }
.mini-kpis span { padding: 6px; background: #fff; border: 1px solid #dfe8ef; border-radius: 6px; font-size: 12px; text-align: center; }
.gantt { padding: 16px; overflow-x: auto; }
.gantt-row { display: grid; grid-template-columns: 86px minmax(430px,1fr); align-items: center; gap: 12px; margin-bottom: 12px; }
.gantt-row:last-child { margin-bottom: 0; }
.gantt-label { color: #314658; font-size: 13px; font-weight: 700; }
.gantt-track { position: relative; height: 34px; background: #ecf2f6; border: 1px solid #d9e4eb; border-radius: 6px; }
.gantt-bar {
  position: absolute;
  top: 5px;
  height: 22px;
  min-width: 36px;
  padding: 2px 8px;
  color: #fff;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 5px;
}
.stack article.warn { border-left: 5px solid var(--yellow); }
.stack article.danger { border-left: 5px solid var(--red); }
.stack article.good { border-left: 5px solid var(--green); }
.stack span { display: block; color: var(--muted); }
.tag { display: inline-flex; align-items: center; min-height: 24px; margin-top: 8px; padding: 0 8px; border-radius: 999px; background: #e7f3fb; color: #185077; font-size: 12px; font-weight: 700; }
.feishu-card {
  padding: 14px;
  background: #f6fbff;
  border: 1px solid #cfe1ef;
  border-radius: 8px;
}
.feishu-card h3 { margin: 0 0 8px; color: var(--navy); font-size: 17px; }
.feishu-card p { margin: 0 0 10px; color: #40586b; font-size: 13px; line-height: 1.55; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
.field-grid span { padding: 8px; background: #fff; border: 1px solid #dfe8ef; border-radius: 6px; font-size: 12px; }
.field-grid b { display: block; margin-bottom: 3px; color: var(--navy); }
.roadmap { grid-template-columns: repeat(3, minmax(0,1fr)); }
.roadmap article { padding: 14px; border-radius: 8px; border: 1px solid #dbe6ee; background: linear-gradient(180deg,#f8fbfd,#fff); }
.roadmap b { display: block; margin-bottom: 8px; color: var(--navy); font-size: 16px; }
.roadmap span { display: block; color: var(--muted); font-size: 13px; line-height: 1.55; }
@media (max-width: 1180px) {
  .shell { grid-template-columns: 320px minmax(0,1fr); }
  .rail:last-child { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); }
}
@media (max-width: 860px) {
  .topbar { flex-direction: column; }
  .shell, .grid-2, .scenario-cards, .roadmap, .kpi-row, .rail:last-child { grid-template-columns: 1fr; }
  .slider { grid-template-columns: 1fr 1fr 34px; }
}
@media (max-width: 560px) {
  .shell { padding: 12px; }
  .topbar { padding: 18px; }
  .field-grid, .action-grid { grid-template-columns: 1fr; }
  .slider { grid-template-columns: 1fr 34px; }
  .slider input { grid-column: 1 / -1; }
  .gantt { overflow-x: visible; }
  .gantt-row { grid-template-columns: 52px minmax(0, 1fr); gap: 8px; }
  .gantt-label { font-size: 12px; }
  .gantt-bar { min-width: 0; padding: 2px 4px; font-size: 10px; }
  h2 { font-size: 21px; }
}
"""
    write_text(ASSETS / "styles.css", css)


def write_app():
    js = r'''const state = {
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
'''
    write_text(ASSETS / "app.js", js)


def write_data_and_docs():
    model = {
        "site": "Yingcheng integrated ammonia and fertilizer base",
        "team": "氨智领航队",
        "platform": "氨智领航调控师",
        "positioning": "合成氨生产运行管理层的智能调度副驾驶，不直接控制DCS/SIS。",
        "units": [
            {"id": "syngas", "name": "制气/净化", "key_constraints": ["原料气稳定", "蒸汽平衡", "CO2分离", "氢氮比"]},
            {"id": "synthesis", "name": "氨合成回路", "key_constraints": ["合成塔床层温升", "循环压缩机负荷", "最低稳定负荷", "升降负荷速率"]},
            {"id": "tank", "name": "液氨罐区", "key_constraints": ["安全库存", "罐区压力", "装车窗口", "外售弹性"]},
            {"id": "downstream", "name": "尿素溶液/复合肥/联碱配套", "key_constraints": ["订单交期", "生产节拍", "包装物流", "客户优先级"]},
        ],
        "optimization_modes": ["稳氨", "保供", "护机", "能源错峰"],
        "interfaces": [
            {"system": "MES", "fields": ["日计划", "班次产量", "执行偏差", "偏差原因"], "frequency": "班次/小时"},
            {"system": "ERP", "fields": ["订单", "交期", "客户优先级", "价格口径"], "frequency": "订单变更/日"},
            {"system": "DCS historian", "fields": ["负荷", "温度", "压力", "流量", "电耗", "蒸汽"], "frequency": "5-15分钟聚合"},
            {"system": "APC/RTO", "fields": ["约束余量", "经济目标", "连续负荷建议", "回放验证"], "frequency": "试点配置"},
            {"system": "Feishu", "fields": ["卡片", "审批", "多维表格", "Aily问答", "事件回调"], "frequency": "事件触发"},
        ],
        "acceptance": [
            "高优订单满足率不低于人工调度",
            "单位氨能耗、库存占用、调度耗时或异常预警提前量至少一项改善",
            "关键数据延迟超过15分钟自动降级",
            "模型连续两天偏差超阈值时停用优化方案",
        ],
    }
    DATA.mkdir(exist_ok=True)
    (DATA / "plant-model.json").write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")

    readme = """# 氨智领航调控师

面向云图控股合成氨装置运行管理场景的智能调度专家平台。平台定位为生产运行管理层的调度副驾驶：在不直接修改 DCS/SIS 控制逻辑、不自动开停车的前提下，围绕合成氨负荷、液氨库存、下游用氨、能源窗口、设备健康和安全边界，输出可解释、可审批、可复盘的班次调度方案。

## 决赛版强化

- APC/RTO 对接层：读取约束余量和经济目标，输出班次级目标负荷、升降速率建议和回写边界。
- 机理/PINN 可信模型：用合成塔温升、氢氮比、循环气量、压缩机效率和罐区压力约束算法建议。
- 飞书班组闭环：互动卡片、负荷调整审批、多维表格复盘、Aily 问答入口和事件回调。
- 知识库自迭代：采纳、驳回、未采纳原因、执行偏差和班长经验进入合成负荷指令库。

## 本地查看

直接打开：

```powershell
start D:\\云图-合成氨-邓植斤\\index.html
```

或启动静态服务：

```powershell
cd D:\\云图-合成氨-邓植斤
python -m http.server 4173
```

访问 `http://localhost:4173`。

## 提交材料

- 飞书在线稿：`https://larkcommunity.feishu.cn/docx/AYyad50itooOPxxZpQacgSqIn2c`

- `提交材料/00_提交信息汇总.docx`
- `提交材料/01_开题报告.docx`
- `提交材料/02_整体解决方案书.docx`
- `提交材料/03_调控师操作手册.docx`
- `提交材料/04_参考文献与数据依据.docx`
- `提交材料/05_方案创新与落地清单.docx`
- `提交材料/06_决赛完整方案文档.docx`

## 飞书接入所需授权

真实接入企业飞书时，需要企业自建应用 `App ID` / `App Secret`、目标调度群机器人权限、审批定义 `approval_code`、多维表格读写权限、事件订阅回调地址和签名校验配置。相关密钥不写入前端仓库。
"""
    write_text(ROOT / "README.md", readme)

    final_md = """# 决赛方案补强说明

## 入围反馈沉淀

本方案获得认可的核心在于结构化程度、30/60/90天落地节奏、影子运行到小闭环的路径、稳氨/保供/护机三案、班次事实表、调度员采纳跟踪、班后复盘和开放代码仓库。决赛版继续保留这些优势，并补足更容易被化工专业人员关注的硬核接口与模型可信度。

## 决赛版四个增强

1. APC/RTO对接：不重做企业已有控制系统，明确只读变量、经济目标、目标负荷建议和MES回写边界。
2. 机理/PINN可信模型：把合成塔温升、氢氮比、循环气量、压缩机效率和罐区压力作为硬约束。
3. 飞书班组闭环：把建议送入互动卡片、审批、多维表格复盘、Aily追问和事件回调。
4. 知识库自迭代：把采纳、驳回、未采纳原因、执行偏差和班长经验变成可检索、可复盘、可校准的数据资产。

## 企业试点边界

- 第一阶段只影子运行，不直接控制DCS/SIS。
- 审批通过后也只写MES计划、交接摘要和复盘记录。
- 数据延迟、模型低置信或安环红线接近时自动降级。
- 收益只核算被采纳且实际执行的方案，并剔除外部市场、检修和物流影响。
"""
    write_text(DOCS / "final-round-upgrade.md", final_md)

    submission_alignment_md = """# 云图控股🤝氨智领航队｜氨智领航调控师：合成氨生产调度专家平台

## 一、参赛方案信息卡

| 项目 | 填写内容 |
| --- | --- |
| 队名 | 氨智领航队 |
| 命题 | 如果来到全球领先的合成氨生产装置现场，如何用AI打造一个生产调度专家？ |
| 一句话摘要 | 在不触碰DCS/SIS底层控制的前提下，用机理可信模型、APC/RTO接口、飞书班组闭环和知识库自迭代，帮助合成氨调度员持续优化吨氨综合成本。 |
| 成员介绍&分工 | 邓植斤：负责命题洞察、行业资料研读、系统架构、平台原型、飞书协同设计、提交材料与GitHub交付。 |
| 使用的飞书 AI 能力 | 飞书互动卡片、审批、多维表格、Aily问答入口、事件回调、班后复盘知识沉淀。 |

## 二、方案成果展示

本方案已形成可本地打开的调控师工作台、数据模型、架构文档、飞书协同设计、操作手册、参考文献与决赛补充材料。平台主界面面向企业现场人员，核心围绕当班调度的目标负荷、风险边界、下游分配、飞书确认和复盘沉淀。

### 命题场景描述、问题描述及痛点说明

云图合成氨装置连接尿素溶液、复合肥、联碱配套、液氨库存与外售，调度同时受合成塔床层温升、氢氮比、循环压缩机、罐区安全库存、能源价格、下游订单和设备健康约束。命题痛点集中在三处：调度寻优难、指挥效率低、知识传承难。

### 方案优势/创新点

- 机理+PINN可信孪生：把反应器温升、氢氮比、循环气量和压缩机效率纳入约束，减少外行化建议。
- APC/RTO对接层：不重做控制系统，能与企业现有APC/RTO体系低风险对话。
- 飞书班组闭环：让建议进入真实通知、审批、复盘和责任留痕。
- 未采纳原因学习：把专家否决和现场经验沉淀为知识资产。
- 反事实收益归因：避免把行情波动误算为系统收益。

### 具体方案说明（突出AI能力）

平台先以30天打通MES日计划、ERP订单、DCS historian摘要、液氨罐区、EAM点检、能源价格与飞书协同记录，形成班次事实表；60天进入影子运行，滚动输出稳氨、保供、护机三案；90天只在低风险场景做小闭环验收。模型层采用机理约束+RTO经济目标+APC/MPC连续负荷建议+PINN反应器校准的组合，组织层接入飞书互动卡片、审批、多维表格和班后复盘，知识层沉淀每次实际方案、未采纳原因、床层温升异常、氢氮比偏差、压缩机健康变化和收益核算。

### 方案价值

价值指标采用保守口径：高优订单满足率、单位氨能耗、液氨库存占用、调度耗时、异常预警提前量和采纳方案收益归因。收益只核算被采纳且实际执行的方案，并剔除市场行情、检修计划、物流异常等外部影响。

### 方案体验入口 & demo展示视频

体验入口：本地打开 `D:\\云图-合成氨-邓植斤\\index.html`；GitHub 仓库：`https://github.com/zhijinDeng/synthesis-ammonia`。

Demo录制流程控制在3-5分钟：切换稳氨/保供/护机/错峰场景，拖动订单、能源、设备健康和库存滑块，展示目标负荷、三案比选、APC/RTO对接、机理/PINN可信模型、飞书卡片/审批、多维表格复盘和知识库自迭代。

## 三、自由展示区

- 已形成可交互页面、可复现生成脚本、数据模型、Word提交材料和GitHub开放仓库。
- 方案语言保持企业现场视角，聚焦装置运行、班组协同、收益核算和知识沉淀。
- 首轮优势是结构化闭环和落地路径；决赛版进一步补上控制体系对接、模型可信度和飞书组织协同。

## 四、附录

- 参考文献与数据依据见 `提交材料/04_参考文献与数据依据.docx`。
- 调控师班组使用流程见 `提交材料/03_调控师操作手册.docx`。
- 飞书真实接入需企业自建应用、审批定义、多维表格权限和事件回调配置。
"""
    write_text(DOCS / "feishu-submission-alignment.md", submission_alignment_md)

    architecture_md = """# 平台架构设计

## 定位

氨智领航调控师位于生产运行管理层，服务对象是合成氨调度员、班长、调度主管、设备与安环值班人员。平台不替代DCS/SIS/APC，不自动开停车，而是在安全约束内生成班次级调度方案、解释收益与风险、推动飞书协同确认，并把执行结果沉淀为知识库。

## 总体链路

```mermaid
flowchart LR
  DCS[DCS historian] --> DATA[班次事实表]
  MES[MES计划与执行] --> DATA
  ERP[ERP订单与价格] --> DATA
  TANK[液氨罐区] --> DATA
  EAM[EAM点检] --> DATA
  DATA --> MODEL[机理/PINN可信模型]
  DATA --> RTO[RTO经济目标]
  MODEL --> OPT[稳氨/保供/护机优化器]
  RTO --> OPT
  OPT --> EXPLAIN[约束解释与收益归因]
  EXPLAIN --> FEISHU[飞书卡片/审批/复盘]
  FEISHU --> HUMAN[班长与调度员确认]
  HUMAN --> MESWRITE[MES计划/交接摘要回写]
  HUMAN --> KB[合成负荷指令库]
  KB --> MODEL
```

## 核心模块

| 模块 | 作用 | 首批交付 |
| --- | --- | --- |
| 班次事实表 | 统一订单、库存、工况、设备、能源、审批口径 | 字段字典、数据质量评分、接口清单 |
| 可信模型层 | 用机理约束和PINN校准限制算法建议 | 合成塔温升、氢氮比、压缩机、罐区约束 |
| APC/RTO对接层 | 与企业已有控制和实时优化体系对话 | 目标负荷、升降速率、经济目标、回写边界 |
| 三案优化器 | 输出稳氨、保供、护机三套可执行方案 | 目标负荷、风险指数、收益口径、回滚条件 |
| 飞书协同层 | 承载卡片、审批、多维表格、Aily追问 | 责任人、确认时间、采纳/驳回原因 |
| 知识迭代层 | 沉淀专家经验与执行偏差 | 周度规则修订、模型校准样本 |

## 安全与治理

- DCS/SIS只读或摘要读取，不开放前端直接控制通道。
- 高风险负荷调整必须走班长+调度主管双确认。
- 关键数据延迟超过15分钟、核心点位缺失或模型连续偏差超阈值时自动降级。
- 收益只核算被采纳且实际执行的方案，剔除行情、物流和检修等外部因素。
"""
    write_text(DOCS / "architecture.md", architecture_md)

    research_md = """# 命题洞察与资料依据

## 命题理解

云图命题的关键在“硬件成本接近极限后的软件层降本”。合成氨装置不是孤立产氨单元，而是连接尿素溶液、复合肥、联碱配套、液氨库存与外售的经营枢纽。AI方案必须同时理解合成氨工艺、安全边界、设备健康、下游消纳和班组执行，而不能只给一个通用算法看板。

## 资料提炼

- 云图公告和年报支撑70万吨合成氨项目与下游肥化产业链协同的业务背景。
- IEA氨路线图和节能降碳资料说明氨行业具有持续能耗优化价值。
- 合成氨安全标准化资料约束平台不能越过安环、设备和重大危险源边界。
- MPC/RTO和Haber-Bosch负荷调节研究说明连续装置动态优化有理论基础，但需要机理约束和现场规则。
- 飞书开放平台资料支撑卡片、审批、多维表格和事件回调进入企业协同链。

## 决赛版判断

入围反馈认可方案的结构化、30/60/90天路径、影子运行、小闭环、三案、采纳跟踪和代码开放。决赛版继续补强两件事：第一，能与APC/RTO和机理模型对话；第二，能真正嵌入云图班组协同和合成氨产业链调度口径。
"""
    write_text(DOCS / "research-brief.md", research_md)

    roadmap_md = """# 30/60/90天试点路线

## 30天：数据与口径

- 明确MES、ERP、DCS historian、罐区、EAM点检、飞书记录的字段映射。
- 建立班次事实表和数据质量评分。
- 形成DCS/SIS隔离、APC/RTO只读对接、MES回写范围和审批边界。

交付物：接口清单、字段字典、数据质量报告、飞书卡片/审批/多维表格样例。

## 60天：影子运行

- 每班生成稳氨、保供、护机三案。
- 与人工调度方案做回放对比。
- 记录采纳、未采纳原因、执行偏差、收益归因和班长经验判断。

交付物：影子运行周报、采纳原因清单、未采纳原因库、模型偏差报告。

## 90天：低风险小闭环

- 只选择低风险、数据可信、审批路径清晰的场景回写MES计划摘要。
- 通过飞书审批留痕并跟踪实际执行。
- 输出收益归因、停用条件、规则修订和推广建议。

交付物：小闭环验收报告、停用条件验证、知识库版本、下一阶段推广边界。

## 验收口径

- 高优订单满足率不低于人工调度。
- 单位氨能耗、库存占用、调度耗时或异常预警提前量至少一项稳定改善。
- 关键数据延迟、模型低置信或安环红线接近时能自动降级。
- 收益仅统计被采纳且实际执行的方案。
"""
    write_text(DOCS / "optimization-roadmap.md", roadmap_md)

    feishu_md = """# 飞书协同与上线配置

飞书在本方案中承担协同执行层，而不是控制层。它负责把调度方案送到当班群、承载高风险负荷调整审批、沉淀班后复盘和未采纳原因，并为Aily问答提供知识入口。

## MVP能力

- 互动卡片：目标负荷、风险指数、触发约束、审批路径、回写范围、确认/驳回按钮。
- 审批：高风险负荷调整创建审批实例，审批通过后只写MES计划和复盘记录。
- 多维表格：班次事实、方案采纳、未采纳原因、执行偏差、周度校准状态。
- Aily：支持调度员追问方案理由、约束解释、设备护机策略和液氨库存风险。
- 事件回调：接收卡片点击、审批通过/驳回、复盘提交，并写入知识库。

## 需要企业授权

- 企业自建应用 App ID / App Secret。
- 目标调度群机器人可见范围。
- 审批定义 approval_code 和审批表单字段。
- 多维表格 app_token、table_id 与记录读写权限。
- 事件订阅回调地址、Event Secret、Encrypt Key。

## 安全边界

- 不在浏览器前端保存 App Secret。
- 不让飞书按钮直接写 DCS/SIS 控制参数。
- 高风险方案必须走审批链。
- 所有事件回调必须校验来源。
"""
    write_text(DOCS / "feishu-integration.md", feishu_md)


def main():
    write_platform()
    write_styles()
    write_app()
    write_data_and_docs()
    paths = [
        build_submission_summary(),
        build_opening_report(),
        build_solution_doc(),
        build_manual_doc(),
        build_reference_doc(),
        build_innovation_doc(),
        build_final_doc(),
    ]
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()
