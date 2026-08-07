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
    "本命题真正考察的不是再做一块合成氨看板，而是能否把产供销、装置负荷、能源、公辅、"
    "设备和班组经验贯通成一个可执行的数字调度长。企业反馈已把方向收束清楚：第一优先级是"
    "液氨有限、下游需求和市场价格变化时的产供销协同与跨装置负荷联动；第二优先级是在稳定生产中"
    "吸收下游、能源、库存波动，避免冲击主流程；第三优先级是压缩机、机组、合成塔等弱信号提前预警；"
    "底座是把调度长多年经验沉淀给新人复用。方案价值不在替代DCS，而在打通系统孤岛、解释取舍、推动执行和形成知识资产。"
)

PART2 = (
    "本方案建设“氨智领航调控师”，定位为合成氨产供销联动数字员工。30天先打通MES/合成氨调控平台、IoT、DCS摘要、"
    "热电APC、压机/机组数据、液氨库存、下游订单、市场行情和飞书记录，形成全线事实表；60天影子运行，围绕产供销协同、"
    "稳产波动吸收、设备弱信号预警三类场景输出可解释方案；90天只在低风险场景小闭环验收。主赛道按边际贡献、固定成本吸收、"
    "液氨机会成本、停开成本和流程连续性判断“保谁、降谁、停谁、是否外采”；第二赛道在下游需求、能源、公辅、库存波动时给出"
    "跨装置负荷节奏，避免主流程被动中断；支撑底座把采纳、驳回、事故复盘、未采纳原因和班长经验沉淀为知识库和新人训练样本。"
    "平台不直接修改DCS/SIS控制逻辑，不自动开停车；低置信、数据延迟、安环红线接近时自动降级人工流程，并通过飞书卡片、审批、任务和Base复盘留痕。"
)

FEISHU_DOC_URL = "https://www.feishu.cn/docx/AYyad50itooOPxxZpQacgSqIn2c"
FEISHU_BASE_URL = "https://www.feishu.cn/base/QzENbAkl1aYQGds8dBacqu6Inue"
FEISHU_TASK_URL = "https://applink.feishu.cn/client/todo/task_list?guid=2ab6c357-dfeb-4f75-9aa3-781dc7ac7244"

FINAL_PRIORITY_LANES = [
    {
        "priority": "主赛道",
        "name": "产供销协同与跨装置负荷联动",
        "focus": "液氨有限、下游需求、市场价格、能源波动、装置负荷之间实时判断。",
        "answer": "告诉调度员现在该保谁、降谁、停谁、是否外采、风险在哪里。",
        "demo": "液氨去向重分配、硝酸/尿素/纯碱/复合肥/外售贡献排序。",
    },
    {
        "priority": "第二赛道",
        "name": "稳定生产下的波动吸收与提前预警",
        "focus": "下游需求突变、供应工程限制、能源窗口、库存波动对上游主流程的冲击。",
        "answer": "给出跨装置负荷节奏，目标不是最大产量，而是平稳、经济、安全运行。",
        "demo": "下游降负荷后合成氨负荷、液氨库存、公辅能源的联动节奏。",
    },
    {
        "priority": "第三优先级",
        "name": "关键设备弱信号预警",
        "focus": "压缩机、气轮机驱动系统、关键机组、合成塔的微弱趋势变化。",
        "answer": "给新操作工黄灯提醒：哪里在变、可能坏到什么程度、先查什么、通知谁。",
        "demo": "压缩机健康下降、喘振裕度变化、床层温升异常的趋势提示。",
    },
    {
        "priority": "支撑底座",
        "name": "经验沉淀与新人快速成长",
        "focus": "调度长五年经验、班组处置、未采纳原因、事故复盘无法结构化传承。",
        "answer": "把判断过程拆成案例、规则、问答和仿真训练样本。",
        "demo": "飞书Base复盘库、Aily问答、新人场景训练清单。",
    },
]

EXISTING_SYSTEM_STACK = [
    {
        "layer": "运行管理层",
        "system": "MES与合成氨调控平台",
        "site_note": "导师口述合成氨调控平台为“海尔豪斯”，具体厂商名称待企业确认。",
        "role": "承接日计划、班次执行、交接摘要、负荷调整记录和复盘闭环。",
        "ai_boundary": "审批通过后只写计划摘要、交接说明和复盘结果。",
    },
    {
        "layer": "数据采集层",
        "system": "IoT平台",
        "site_note": "采集合成氨DCS底层数据，形成可供上层系统读取的过程数据底座。",
        "role": "读取负荷、温度、压力、流量、电耗、蒸汽、罐区等实时/准实时数据。",
        "ai_boundary": "作为AI调控师的只读事实源，不替代DCS控制。",
    },
    {
        "layer": "生产控制层",
        "system": "合成氨DCS",
        "site_note": "导师口述为中控体系，具体名称待企业确认。",
        "role": "完成合成氨主装置的局部回路控制、顺控、报警和联锁保护。",
        "ai_boundary": "AI只读DCS historian摘要，不直接写控制参数。",
    },
    {
        "layer": "热电与公辅控制层",
        "system": "和利时DCS与热电APC",
        "site_note": "热电侧采用和利时DCS，并已有APC先进控制用于热电管网优化。",
        "role": "提供蒸汽、电力、公辅负荷、管网约束和热电优化结果。",
        "ai_boundary": "读取热电APC约束余量和能耗窗口，生成跨装置调度建议。",
    },
    {
        "layer": "机组与压机层",
        "system": "SMC压机软件、康迪森机组数据",
        "site_note": "导师口述机组数据已接入和利时平台，具体点位清单待企业确认。",
        "role": "提供离心压缩机、气轮机驱动系统、关键机组健康和弱信号趋势。",
        "ai_boundary": "用于设备护机、弱信号预警和特殊停机取舍，不直接触发开停车。",
    },
]


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
    doc = setup_doc("整体解决方案书", "氨智领航调控师：产供销全线联动数字调度长")
    doc.add_heading("1. 方案定位", level=1)
    para(
        doc,
        "平台不是替代DCS/SIS/APC的控制系统，而是位于生产运行管理层的产供销联动数字调度长。它把实时工况、液氨库存、下游订单、产品行情、设备健康、能源窗口、公辅约束和专家规则组织成全线事实表，帮助调度员在安全边界内判断“保谁、降谁、停谁、是否外采、风险在哪里”。",
    )
    doc.add_heading("2. 决赛主线收束", level=1)
    table(
        doc,
        ["优先级", "方向", "重点问题", "演示抓手"],
        [[lane["priority"], lane["name"], lane["focus"], lane["demo"]] for lane in FINAL_PRIORITY_LANES],
        [0.9, 1.55, 2.55, 1.4],
    )
    doc.add_heading("3. 总体架构", level=1)
    table(
        doc,
        ["层级", "核心对象", "交付内容"],
        [
            ["全线数据底座", "MES、IoT、DCS historian、热电APC、压机/机组、行情、飞书记录", "产供销全线事实表、口径字典、数据质量评分"],
            ["可信模型", "机理约束、PINN反应器校准、设备健康预测、库存/订单/行情预测", "模型版本、置信度、漂移监控、回放验证报告"],
            ["联动调度", "边际贡献、固定成本吸收、液氨机会成本、流程连续性、APC/MPC建议", "保谁/降谁/停谁/外采与否、风险解释、回滚条件"],
            ["协同执行", "飞书卡片、审批、多维表格、交接摘要", "确认人、审批人、执行时间、采纳/驳回原因"],
            ["经验迭代", "调度长经验库、异常经验库、未采纳原因库、新人训练样本", "周度规则修订、模型校准样本、经验复用清单"],
        ],
        [1.1, 2.35, 3.05],
    )
    doc.add_heading("4. 现有系统对接口径（待企业确认）", level=1)
    para(
        doc,
        "企业导师补充了云图现场正在使用或建设中的关键系统。决赛方案据此把AI调控师定位为现有商业软件之上的“跨系统调度编排层”，不重做DCS、MES、APC或压机软件，而是理清各系统主要功能、数据流向和写回边界。",
    )
    table(
        doc,
        ["层级", "现场系统", "主要作用", "AI调控师边界"],
        [[item["layer"], item["system"], item["role"], item["ai_boundary"]] for item in EXISTING_SYSTEM_STACK],
        [1.05, 1.55, 2.55, 1.25],
    )
    bullets(doc, [f"{item['system']}：{item['site_note']}" for item in EXISTING_SYSTEM_STACK])
    doc.add_heading("5. 飞书功能模块在方案中的位置", level=1)
    para(
        doc,
        "飞书不是附加展示入口，而是本方案把算法建议变成现场执行、责任留痕和知识迭代的组织操作层。合成氨调度建议只有进入当班群、审批链、任务监督和复盘库，才真正回应命题提出的指挥效率与知识传承问题。",
    )
    table(
        doc,
        ["飞书功能", "解决的命题问题", "合成氨场景中的动作", "沉淀数据"],
        [
            ["互动卡片", "指挥效率低", "把目标负荷、风险指数、触发约束、收益口径和确认按钮推送到当班调度群。", "card_action、operator_confirm、reject_reason"],
            ["审批", "安全边界与责任链", "高风险升降负荷、护机降负荷、液氨库存越界处置进入班长/主管/安环确认。", "approval_instance、approval_status、rollback_condition"],
            ["多维表格Base", "知识传承难", "记录采纳/驳回、实际负荷、单位氨能耗、库存变化、未采纳原因和班后复盘。", "shift_fact、execution_delta、lesson_learned"],
            ["飞书任务", "执行监督弱", "采纳后自动生成跟踪任务，提醒核对DCS historian实际负荷、复盘收益归因和补充异常说明。", "owner、due_time、checklist_status、close_note"],
            ["Aily问答/事件回调", "调度寻优解释与自迭代", "调度员追问方案理由；卡片点击、审批结果和复盘提交通过回调写入知识库。", "query_log、callback_event、idempotency_key"],
        ],
        [1.0, 1.25, 2.55, 1.6],
    )
    doc.add_heading("6. 与APC/RTO体系的接口关系", level=1)
    bullets(
        doc,
        [
            "APC侧：平台不覆盖底层控制回路，只读取关键受控变量和约束余量，输出班次级目标负荷、升降负荷速率建议和需保持的边界条件。",
            "RTO侧：平台把天然气/煤气化、蒸汽、电力、液氨库存占用、订单延期、外售机会成本、边际贡献和固定成本吸收转化为经济目标，供实时优化或离线回放使用。",
            "PINN/机理侧：以合成塔热平衡、反应器温升、氢氮比、循环气量、压缩机效率作为模型约束，避免纯数据模型给出现场不可执行的方案。",
            "MES侧：审批通过后只写入计划、交接摘要和复盘记录，不直接写入DCS/SIS控制参数。",
        ],
    )
    doc.add_heading("7. 典型场景", level=1)
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
    doc.add_heading("8. 全产业链系统孤岛贯通", level=1)
    para(
        doc,
        "企业导师进一步指出，当前MES、DCS、IoT、APC、压机软件、热电平台和经营数据更像多个孤岛。真正困难的不是某一个系统有没有数据，而是调度长需要靠经验从庞大的系统中逐条抽取信息，再把价格、库存、订单、装置负荷、设备状态和公辅约束汇总判断。培养一个成熟调度长往往需要五年甚至更久，这正是AI调控师最应补位的地方。",
    )
    table(
        doc,
        ["孤岛问题", "人工调度长当前做法", "AI调控师补位方式", "企业价值"],
        [
            ["信息分散", "从MES、DCS、IoT、压机、热电和经营系统逐项查看。", "自动汇聚班次事实表，形成订单、液氨、下游、设备、公辅、行情同屏口径。", "减少信息搜集时间。"],
            ["判断依赖经验", "依靠调度长多年经验判断哪些点位、库存、价格和订单真正重要。", "把历史采纳、驳回、事故复盘和专家规则转成可检索的调度知识图谱。", "缩短新人培养周期。"],
            ["跨线联动难", "人工判断液氨去向、下游负荷、热电约束和设备护机之间的取舍。", "输出产供销联动三案：保安全、保连续、保贡献，并解释牺牲项和回滚条件。", "降低错失窗口和误判风险。"],
            ["复盘沉淀弱", "很多判断停留在口头交接或个人经验里。", "通过飞书任务、审批和Base复盘沉淀为可复用样本。", "形成企业级调度经验资产。"],
        ],
        [1.15, 1.8, 2.45, 1.0],
    )
    doc.add_heading("9. 产供销经济取舍口径", level=1)
    para(
        doc,
        "产供销调度不能简单按“售价高于完全成本才生产”判断。化工连续装置存在折旧、人工、公辅和装置重启等固定或半固定成本，某个下游产品即使短期售价低于完全成本，只要能覆盖变动成本、贡献一部分固定成本、维持流程连续或保障战略订单，也可能仍然值得开；反之，若边际贡献为负且占用稀缺液氨、能源或关键设备能力，则应考虑降负荷或停产。",
    )
    table(
        doc,
        ["测算项", "现场含义", "调控师使用方式"],
        [
            ["销售价", "尿素、纯碱、硝酸、复合肥、液氨外售等实时或预测行情。", "识别价格趋势，但不单独作为开停依据。"],
            ["变动成本", "原料、蒸汽、电力、包装、物流等随产量变化的成本。", "判断产品是否至少覆盖直接增量成本。"],
            ["边际贡献", "销售收入扣除变动成本后对折旧、人工、公辅和固定费用的贡献。", "售价低于完全成本但边际贡献为正时，可作为“继续开”的理由之一。"],
            ["固定成本吸收", "连续开车带走折旧、固定人工、装置维持费用和部分公辅摊销。", "避免把短期账面亏损误判为必须停产。"],
            ["机会成本", "液氨有限时，供硝酸、尿素、纯碱、复合肥或外售之间的替代收益。", "选择单位液氨综合贡献更高且不破坏安全连续性的去向。"],
            ["停开成本", "停车、重启、废料、人员和物料损失。", "当边际贡献接近零时，停开成本可能决定是否继续运行。"],
        ],
        [1.05, 1.95, 3.4],
    )
    doc.add_heading("10. 跨装置联动的调度优先级", level=1)
    para(
        doc,
        "企业导师补充的关键现场经验是：合成氨调度不能只看当班利润，必须先保安全，再保流程连续，只有在流程确实需要中断时才进入特殊取舍。DCS可以完成液位、阀门、局部顺控和联锁保护，但难以自动判断下游异常、气区设备、能源窗口和产品结构变化后的跨大单元联动，因此本方案把这部分做成AI调控师的规则层。",
    )
    table(
        doc,
        ["优先级", "判断口径", "调控师动作", "留痕与边界"],
        [
            ["1. 安全", "安环红线、SIS/DCS联锁、罐区压力、压缩机/合成塔风险接近阈值。", "冻结增产和高收益方案，只保留降风险、稳流程、人工确认动作。", "不绕过DCS/SIS；触发原因进入审批和班后复盘。"],
            ["2. 流程不中断", "气化、净化、合成、空分、气轮机驱动系统和液氨去向的连续性。", "优先做跨装置负荷联动，减少停车后重启时间、废料、人员和物料损失。", "输出重启成本、废料成本、影响范围和回滚条件。"],
            ["3. 特殊取舍", "流程确需中断时，比较停空分、停合成气轮机或停下游装置的代价。", "按安全、重启复杂度、废料损失、对主流程影响排序；已验证同类场景优先保气轮机驱动关键系统，停空分方案需班长/主管确认。", "作为专家规则，不做前端自动执行；每次结果回写知识库。"],
        ],
        [0.9, 2.0, 2.35, 1.25],
    )
    doc.add_heading("11. 30/60/90天落地路径", level=1)
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
    doc.add_heading("12. 验收与停用条件", level=1)
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
    doc = setup_doc("调控师操作手册", "数字调度长当班使用、飞书协同与异常降级")
    doc.add_heading("1. 当班操作流程", level=1)
    table(
        doc,
        ["时间点", "调控师动作", "现场确认", "留痕位置"],
        [
            ["班前30分钟", "刷新订单、液氨库存、下游需求、行情、设备健康、能源窗口，生成全线事实表。", "调度员确认口径是否与MES/罐区/经营数据一致。", "全线事实表"],
            ["班前会", "先看产供销联动建议，再看稳产波动吸收和设备黄灯提醒。", "班长确认保谁、降谁、停谁、是否外采和回滚条件。", "飞书卡片"],
            ["班中偏差", "库存、设备、订单或能价超阈值时重算。", "未确认前仍按原计划执行。", "重算事件表"],
            ["班后复盘", "记录采纳、未采纳、实际负荷、能耗、库存和异常原因。", "班长补充经验判断。", "多维表格/知识库"],
        ],
        [1.0, 2.2, 2.0, 1.3],
    )
    doc.add_heading("1（一）决赛版使用顺序", level=2)
    numbers(
        doc,
        [
            "先看产供销：液氨有限时，按边际贡献、固定成本吸收、战略订单、停开成本和流程连续性判断产品结构。",
            "再看稳产波动：下游需求、供应工程限制、能源窗口或库存变化时，判断是否需要跨装置负荷联动。",
            "再看设备黄灯：压缩机、关键机组、合成塔出现微弱趋势变化时，先给检查项和通知对象，不直接触发开停车。",
            "最后沉淀经验：采纳、驳回、未采纳原因、事故复盘和班长判断进入知识库，服务新人训练。",
        ],
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
    table(
        doc,
        ["操作节点", "飞书动作", "班组确认口径"],
        [
            ["方案生成", "调控师向合成氨当班群发送互动卡片。", "只看目标负荷、约束触发、风险指数、回滚条件和与原计划差异。"],
            ["高风险确认", "卡片按钮触发审批草稿，低风险由班长确认，高风险增加主管/安环。", "未完成审批前不写MES计划摘要。"],
            ["执行监督", "采纳方案自动生成飞书任务并列出核对清单。", "核对实际负荷曲线、库存变化、能耗窗口和异常处理。"],
            ["班后沉淀", "复盘字段写入多维表格，未采纳原因进入知识库。", "记录“为什么不采纳”与“实际执行偏差”，供周度校准。"],
        ],
        [1.1, 2.35, 2.95],
    )
    doc.add_heading("3. 异常处理原则", level=1)
    numbers(
        doc,
        [
            "安全先于收益：合成塔、压缩机、罐区和安环红线一旦接近阈值，方案自动降级。",
            "连续先于局部最优：下游异常、供应工程限制或能源波动出现时，先评估是否会打断气化、净化、合成、液氨去向等主流程，避免因局部最优导致全流程停车。",
            "取舍先算重启代价：确需停系统时，必须比较停空分、停合成气轮机、停下游装置的重启时间、废料、人员和物料损失；同类已验证场景可优先保气轮机驱动关键系统，停空分方案由班长和主管确认。",
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
            ["结构化程度", "三大挑战、三案、30/60/90天路径清晰。", "决赛版收束为主赛道、第二赛道、第三优先级和支撑底座。"],
            ["落地路径", "影子运行、小闭环、班次复盘明确。", "补齐产供销全线事实表、审批链、停用条件和收益归因方法。"],
            ["代码开放", "已有GitHub平台原型和文档材料。", "补充可交互调控台、飞书卡片预览、知识库表结构和试点交付清单。"],
        ],
        [1.2, 2.35, 2.55],
    )
    doc.add_heading("2. 决赛创新点", level=1)
    table(
        doc,
        ["创新点", "企业价值", "可验证方式"],
        [
            ["产供销主赛道", "把液氨、下游需求、市场价格、能源波动和装置负荷统一判断，回答保谁、降谁、停谁、是否外采。", "全线事实表、边际贡献排序、跨装置负荷联动Demo。"],
            ["稳产波动吸收", "下游需求或能源窗口变化时，目标不是最大产量，而是让系统平稳、经济、安全运行。", "需求突变回放、负荷节奏建议、流程不中断规则。"],
            ["机理+PINN可信孪生", "把反应器温升、氢氮比、循环气量和压缩机效率纳入约束，减少外行化建议。", "离线回放对比模型偏差和约束触发记录。"],
            ["APC/RTO对接层", "不重做控制系统，能与现有APC/RTO体系低风险对话。", "接口清单、变量映射、写回边界和审批记录。"],
            ["飞书班组闭环", "让建议进入真实通知、审批、任务监督、复盘和责任留痕。", "互动卡片、审批、多维表格、任务清单、Aily问答和事件回调样例。"],
            ["未采纳原因学习", "把专家否决和现场经验沉淀为知识资产。", "每周输出规则修订和模型校准样本。"],
            ["反事实收益归因", "避免把行情波动误算为系统收益。", "保留原计划、推荐方案、采纳结果和实际执行差异。"],
        ],
        [1.4, 2.45, 2.35],
    )
    doc.add_heading("3. 首批上线清单", level=1)
    bullets(
        doc,
        [
            "数据：产供销全线事实表、接口字段字典、数据质量评分、异常点位清单。",
            "模型：产供销联动、稳产波动吸收、设备弱信号预警三类方案，附可信度、漂移监控和回放验证报告。",
            "协同：飞书互动卡片、负荷调整审批、多维表格复盘、任务监督、Aily问答入口和事件回调。",
            "治理：DCS/SIS隔离、人工确认、停用条件、边际贡献归因和周度复盘机制。",
        ],
    )
    add_references(doc)
    return save(doc, "05_方案创新与落地清单.docx")


def build_final_doc():
    doc = setup_doc("决赛完整方案文档", "云图控股合成氨命题 | 产供销全线联动数字调度长")
    doc.add_heading("一、参赛方案信息卡", level=1)
    table(
        doc,
        ["项目", "填写内容"],
        [
            ["队名", "氨智领航队"],
            ["命题", "如果来到全球领先的合成氨生产装置现场，如何用AI打造一个生产调度专家？"],
            ["方案标题", "氨智领航调控师：产供销全线联动数字调度长"],
            ["一句话摘要", "在不触碰DCS/SIS底层控制的前提下，打通MES、IoT、DCS、APC、压机、热电和经营数据，围绕液氨去向、下游需求、市场价格、能源波动和装置负荷，告诉调度员保谁、降谁、停谁、是否外采、风险在哪里。"],
            ["成员介绍与分工", "邓植斤：负责命题洞察、行业资料研读、系统架构、平台原型、飞书协同设计、提交材料与GitHub交付。"],
            ["使用的飞书AI能力", "飞书互动卡片、审批、多维表格、Aily问答入口、事件回调、班后复盘知识沉淀。"],
        ],
        [1.45, 4.95],
    )
    doc.add_heading("二、方案成果展示", level=1)
    para(doc, "本方案已形成可本地打开的调控师工作台、数据模型、架构文档、飞书协同设计、操作手册、参考文献与决赛补充材料。平台主界面不平均展示所有能力，而是按决赛优先级组织：主赛道产供销协同与跨装置负荷联动，第二赛道稳定生产波动吸收，第三优先级设备弱信号预警，支撑底座经验沉淀与新人快速成长。")
    doc.add_heading("三、命题场景与痛点", level=1)
    bullets(doc, [
        "产供销平衡难：液氨有限、下游需求、市场行情、能源波动和装置负荷同时变化，调度长需要跨系统人工汇总后再判断。",
        "稳定生产波动吸收难：下游需求、供应工程限制或能源窗口变化时，DCS能管局部回路，但难以自动完成跨装置生产策略联动。",
        "经验传承难：成熟调度长培养周期长，专家判断常沉淀在经验和口头交接中，未采纳原因没有被结构化利用。",
    ])
    doc.add_heading("三（一）决赛优先级", level=2)
    table(
        doc,
        ["优先级", "方向", "解决的问题", "Demo抓手"],
        [[lane["priority"], lane["name"], lane["answer"], lane["demo"]] for lane in FINAL_PRIORITY_LANES],
        [0.9, 1.55, 2.55, 1.4],
    )
    doc.add_heading("四、方案优势与创新", level=1)
    table(
        doc,
        ["模块", "能力", "不同于常规方案之处"],
        [
            ["产供销主赛道", "液氨去向、下游需求、价格行情、边际贡献、装置负荷联动", "把企业最紧迫的全线平衡放在第一位。"],
            ["稳产第二赛道", "需求波动、能源窗口、公辅约束、库存变化的吸收", "目标不是最大产量，而是平稳、经济、安全运行。"],
            ["可信模型", "机理约束、PINN校准、APC/RTO接口、MPC建议", "不只喊大模型，先保证合成氨现场可执行。"],
            ["调度执行", "稳氨/保供/护机三案和班次事实表", "把推荐落到班前会和MES计划口径。"],
            ["全线贯通", "MES、IoT、DCS、APC、压机、热电和经营数据同屏编排", "把调度长手工梳理系统信息的过程固化为数字调度长。"],
            ["飞书闭环", "卡片、审批、多维表格、Aily问答、事件回调", "让AI建议进入企业真实协同链。"],
            ["知识迭代", "采纳/驳回/偏差/收益归因沉淀", "把专家否决原因也变成训练样本。"],
        ],
        [1.1, 2.35, 2.95],
    )
    doc.add_heading("五、业务范围与落地价值", level=1)
    para(doc, "首批覆盖合成氨、液氨库存、尿素溶液、复合肥、联碱配套和液氨外售的协同调度。价值指标采用保守口径：高优订单满足率、单位氨能耗、液氨库存占用、调度耗时、异常预警提前量和采纳方案收益归因。")
    doc.add_heading("五（一）全产业链贯通价值", level=2)
    para(
        doc,
        "现有系统各自有价值，但信息分散在MES、IoT、DCS、APC、压机软件、热电平台和经营数据中。实际调度依赖调度长把这些信息一条条梳理出来，再凭经验判断液氨去向、下游负荷、能源窗口、设备风险和订单优先级。平台的核心价值是把这套经验流程数字化，让一线人员看到同一张产供销联动事实表，并把老调度长的判断沉淀给新人复用。",
    )
    table(
        doc,
        ["痛点", "平台回应", "落地效果"],
        [
            ["系统孤岛", "汇聚MES计划、DCS/IoT过程数据、热电APC、公辅约束、压机/机组健康和市场行情。", "减少人工跨系统查数。"],
            ["调度长培养周期长", "把采纳、驳回、异常复盘和专家判断沉淀为知识库与Aily问答。", "新人能按场景学习，而不是只靠跟班经验。"],
            ["跨线取舍难", "在同一页面比较安全、流程连续、边际贡献、固定成本吸收和停开成本。", "形成可解释的产供销联动建议。"],
        ],
        [1.1, 3.0, 2.3],
    )
    doc.add_heading("五（二）边际贡献决策口径", level=2)
    para(
        doc,
        "产供销协同的核心不是简单比较售价与完全成本。某些下游产品在短期行情下行时，售价可能低于完全成本，但只要能覆盖变动成本并贡献部分折旧、固定人工、公辅摊销或战略订单价值，企业仍可能选择继续生产。平台因此采用“边际贡献+固定成本吸收+机会成本+停开成本”的综合口径，避免把复杂经营取舍简化成单一利润开关。",
    )
    table(
        doc,
        ["判断项", "为什么重要", "平台输出"],
        [
            ["边际贡献", "判断该产品是否至少覆盖原料、蒸汽、电力、包装、物流等增量成本。", "继续开、降负荷或转供其他产品的经济理由。"],
            ["固定成本吸收", "连续生产可带走折旧、固定人工和部分公辅费用，即使完全成本口径暂时亏损也可能有价值。", "解释“售价低于完全成本仍生产”的合理性。"],
            ["液氨机会成本", "液氨有限时，供尿素、纯碱、硝酸、复合肥或外售的替代收益不同。", "单位液氨贡献排序和产品结构建议。"],
            ["停开成本", "停车重启会产生废料、时间、人员和物料损失。", "当边际贡献接近零时，给出继续运行或停产的取舍依据。"],
        ],
        [1.15, 2.75, 2.5],
    )
    doc.add_heading("五（三）跨装置调度的三条底线", level=2)
    table(
        doc,
        ["底线", "现场含义", "平台处理方式"],
        [
            ["安全第一", "任何经营收益都不能突破安环红线、DCS/SIS联锁边界和关键设备保护。", "低置信或风险接近阈值时自动降级，只保留人工确认和风险处置建议。"],
            ["流程不中断第二", "连续流程一旦中断，重启耗时长、废料多、人员和物料损失高，尤其涉及气区和气轮机驱动系统。", "识别上下游异常后先做跨装置负荷联动，评估是否能通过液氨分配、下游降负荷或能源错峰吸收波动。"],
            ["特殊情况再取舍", "确需中断时，不是简单停哪套装置，而是比较停空分、停合成气轮机、停下游装置的总损失。", "把重启时间、废料、影响范围和专家规则纳入排序；同类已验证场景可优先保气轮机驱动关键系统，停空分需审批确认。"],
        ],
        [1.15, 2.55, 2.7],
    )
    doc.add_heading("五（四）现有系统接入假设", level=2)
    table(
        doc,
        ["系统", "在现场承担的作用", "本方案调用方式"],
        [
            ["MES/合成氨调控平台", "日计划、班次执行、负荷调整记录和交接复盘。", "审批通过后写计划摘要、交接说明和复盘结果。"],
            ["IoT平台", "采集合成氨DCS底层过程数据。", "作为班次事实表的数据源，供AI只读分析。"],
            ["合成氨DCS", "合成氨主装置局部回路控制、顺控、报警和联锁。", "读取DCS historian摘要，不直接写控制参数。"],
            ["和利时DCS/热电APC", "热电、公辅、蒸汽管网控制与优化。", "读取热电约束余量、能耗窗口和APC优化结果，用于跨装置负荷联动。"],
            ["SMC压机软件/康迪森机组数据", "压缩机、气轮机驱动系统和关键机组健康监测。", "用于弱信号预警、护机方案和特殊停机取舍。"],
        ],
        [1.55, 2.35, 2.5],
    )
    para(doc, "上述系统名称按导师口述记录，厂商及点位清单在企业试点前需由信息化、生产、设备和热电专业共同确认。")
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
    para(doc, f"本轮已完成飞书原型交付：决赛完整方案在线稿 {FEISHU_DOC_URL} ；合成氨调度复盘库 Base 原型 {FEISHU_BASE_URL} ；决赛提交任务清单 {FEISHU_TASK_URL} 。企业真实试点时，可将互动卡片按钮、审批状态、任务关闭和多维表格记录通过事件回调串成一条执行链。")
    doc.add_heading("六（一）飞书模块对命题三大挑战的支撑", level=2)
    table(
        doc,
        ["命题挑战", "飞书模块支撑", "形成的企业资产"],
        [
            ["调度寻优难", "Aily追问、Base复盘库和事件回调把模型理由、历史采纳效果、未采纳原因连接起来，使下一次方案不只依赖单次算法输出。", "可检索的合成氨调度案例库、异常处置库和模型校准样本。"],
            ["指挥效率低", "互动卡片把方案送到当班群，审批承接高风险调整，任务监督跟踪执行与复盘，减少口头传递和跨层级等待。", "确认人、审批人、执行人、截止时间和关闭结果的责任链。"],
            ["知识传承难", "多维表格沉淀班次事实、未采纳原因、班长备注、执行偏差和收益归因，Aily在授权知识源内回答新调度员追问。", "班组经验从口头交接转化为可复用、可审计、可迭代的数据资产。"],
        ],
        [1.15, 2.75, 2.5],
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


def build_feishu_module_doc():
    doc = setup_doc("飞书功能模块说明", "面向合成氨调度专家平台的协同执行与知识沉淀链路")
    doc.add_heading("1. 模块定位", level=1)
    para(
        doc,
        "飞书在本方案中承担“组织操作层”：算法负责算清目标负荷、风险边界和收益口径，飞书负责把建议送到当班人员、推动审批、监督执行、沉淀复盘，并把真实采纳效果反馈给知识库。这个模块不是普通通知工具，而是让合成氨调度建议从“可计算”变成“可执行、可追责、可传承”的关键链路。",
    )
    doc.add_heading("1（一）围绕决赛主线的飞书动作", level=2)
    table(
        doc,
        ["方向", "飞书动作", "沉淀结果"],
        [
            ["产供销主赛道", "卡片推送液氨去向、边际贡献排序、保供/降负荷/停产/外采建议；高风险取舍进入审批。", "产品结构调整原因、确认人、实际贡献、未采纳原因。"],
            ["稳产波动吸收", "下游需求、能源、公辅、库存波动触发任务清单，提醒复核负荷节奏和流程连续性。", "波动来源、吸收动作、执行偏差、回滚条件。"],
            ["设备弱信号预警", "压缩机、机组、合成塔黄灯提醒进入设备/班长任务，不直接开停机。", "趋势点位、检查项、通知对象、处置结果。"],
            ["经验传承", "班后复盘写入Base，飞书AI读取授权知识源回答新人追问。", "调度长案例库、新人训练样本、规则修订记录。"],
        ],
        [1.35, 3.1, 1.95],
    )
    doc.add_heading("2. 对三大命题痛点的回应", level=1)
    table(
        doc,
        ["痛点", "飞书承接动作", "解题价值"],
        [
            ["调度寻优难", "飞书AI解释优化理由并标注事实来源；Base汇总历史采纳效果、未采纳原因和收益归因；事件回调把执行结果反哺模型。", "让优化不止停留在一次性推荐，而是能结合历史案例和当班事实持续修正。"],
            ["指挥效率低", "互动卡片送达当班群，审批承接高风险负荷调整，任务清单跟踪执行与复盘。", "压缩调度员、班长、主管、设备和安环之间的沟通链条，并留下完整责任记录。"],
            ["知识传承难", "多维表格沉淀班次事实、班长备注、驳回原因、执行偏差和异常处置；飞书AI基于授权知识源检索回答。", "把专家经验和班组判断沉淀为可审计、可检索、可训练的长期资产。"],
        ],
        [1.15, 2.75, 2.5],
    )
    doc.add_heading("3. 功能模块总览", level=1)
    table(
        doc,
        ["飞书能力", "合成氨业务对象", "首批字段/动作", "边界"],
        [
            ["互动卡片", "稳氨/保供/护机/错峰方案", "目标负荷、风险指数、触发约束、回滚条件、采纳/复核/驳回按钮", "只触发流程，不直接控制装置。"],
            ["审批", "高风险升降负荷、设备护机、液氨库存越界处置", "审批人、装置、目标负荷、业务理由、风险说明、回滚条件", "审批通过后仅写MES计划摘要和复盘记录。"],
            ["多维表格Base", "班次事实与调度复盘", "订单、库存、设备健康、能耗窗口、采纳状态、执行偏差、未采纳原因", "作为知识事实层，保留字段来源和版本。"],
            ["飞书任务", "执行监督", "负责人、截止时间、检查项、关闭说明、复核状态", "提醒和监督，不替代现场签字确认。"],
            ["飞书AI问答", "调度员追问与新人学习", "结论、当前数值、边界、事实来源、责任人、复核时间", "无来源不回答，不绕过审批和安全规则。"],
            ["事件回调", "卡片点击、审批状态、任务关闭、复盘提交", "事件类型、幂等键、时间戳、操作者、处理结果", "必须做签名校验、重放保护和异常降级。"],
        ],
        [1.0, 1.45, 2.75, 1.2],
    )
    doc.add_heading("4. 当班闭环流程", level=1)
    numbers(
        doc,
        [
            "生成建议：调控师读取班次事实表，输出稳氨、保供、护机三案及风险解释。",
            "卡片送达：将目标负荷、约束触发、收益口径和回滚条件发送到合成氨当班调度群。",
            "审批确认：低风险方案由班长确认，高风险方案进入主管/安环审批。",
            "执行监督：采纳后创建飞书任务，跟踪实际负荷曲线、库存变化、能耗窗口和异常处置。",
            "班后复盘：把采纳结果、未采纳原因、执行偏差和班长经验写入Base复盘库。",
            "知识迭代：飞书AI和模型校准流程读取复盘样本，周度输出规则修订和停用条件检查。",
        ],
    )
    doc.add_heading("4（一）特殊停机取舍的飞书闭环", level=2)
    para(
        doc,
        "当流程确实无法维持连续时，调控师不直接下达停机指令，而是生成取舍卡片：列出停空分、停合成气轮机、停下游装置等备选方案的安全影响、重启时间、废料损失、人员物料成本和对主流程的影响。卡片进入班长/主管审批，执行结果和实际损失写入Base复盘库，作为下一次同类场景的专家规则样本。",
    )
    doc.add_heading("5. 数据表与接口契约", level=1)
    bullets(
        doc,
        [
            "字段样例：data/feishu_dispatch_review_template.csv 保存班次、场景、目标负荷、风险指数、预期收益、采纳状态、复盘备注等字段。",
            "接口契约：data/feishu_integration_contract.json 保存卡片、审批、Base、飞书AI回答与动作、事件回调的字段与幂等键设计。",
            "知识闭环：每条建议都必须保留 proposal_id、shift_id、scenario、confidence、approval_status、execution_delta 和 lesson_learned，便于后续回放和审计。",
        ],
    )
    doc.add_heading("6. 已完成原型与授权说明", level=1)
    bullets(
        doc,
        [
            f"飞书在线完整方案稿：{FEISHU_DOC_URL}",
            f"飞书Base调度复盘库原型：{FEISHU_BASE_URL}",
            f"飞书任务清单：{FEISHU_TASK_URL}",
            "飞书护机场景执行任务：https://applink.feishu.cn/client/todo/detail?guid=6e519bf6-1b28-4b90-b4e5-3a82fde9e1cb",
            "当前飞书用户已具备文档、Base、审批、任务、消息和Spark应用等授权；企业真实部署仍需目标群机器人范围、审批定义 approval_code、飞书AI知识源与工具动作配置、事件订阅回调和密钥托管。密钥不写入前端仓库。",
        ],
    )
    doc.add_heading("7. 安全边界", level=1)
    bullets(
        doc,
        [
            "DCS/SIS只读或摘要读取，飞书按钮不直接写控制参数，不自动开停车。",
            "低置信、关键数据延迟、模型漂移、安环红线接近时自动降级人工流程。",
            "所有回调事件使用签名校验、重放保护和幂等入库，避免重复写入或伪造操作。",
            "收益核算只统计被采纳且实际执行的方案，并剔除市场、检修、物流等外部因素。",
        ],
    )
    add_references(doc)
    return save(doc, "07_飞书功能模块说明.docx")


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
            ["07_飞书功能模块说明.docx", "单独说明互动卡片、审批、多维表格、任务、Aily问答与事件回调如何支撑解题。"],
        ],
        [2.1, 4.3],
    )
    doc.add_heading("链接材料", level=1)
    para(doc, "GitHub：https://github.com/zhijinDeng/synthesis-ammonia")
    para(doc, "本地平台入口：D:\\云图-合成氨-邓植斤\\index.html")
    para(doc, f"飞书在线完整方案稿：{FEISHU_DOC_URL}")
    para(doc, f"飞书Base调度复盘库原型：{FEISHU_BASE_URL}")
    para(doc, f"飞书任务清单：{FEISHU_TASK_URL}")
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
          <label class="slider"><span>液氨市场价（元/吨）</span><input data-key="ammoniaPrice" type="range" min="1700" max="2800" step="10" value="2180" /><output id="ammoniaPriceOut">2180</output></label>
          <label class="slider"><span>硝酸行情趋势（%）</span><input data-key="nitricTrend" type="range" min="-20" max="20" value="-6" /><output id="nitricTrendOut">-6</output></label>
          <label class="slider"><span>压机弱信号强度</span><input data-key="compressorDrift" type="range" min="0" max="100" value="18" /><output id="compressorDriftOut">18</output></label>
          <p class="data-caption">演示口径；试点时由 ERP、MES、IoT、DCS historian 与设备软件自动刷新。</p>
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
          <div class="panel-title"><span>控制边界</span><strong>只读建议层</strong></div>
          <ul class="compact-list">
            <li>不直接写DCS/SIS控制参数</li>
            <li>不自动开停车，不绕过审批链</li>
            <li>先影子运行，再低风险小闭环</li>
            <li>数据低可信时降级人工流程</li>
          </ul>
        </section>
      </aside>

      <section class="stage">
        <section class="source-strip" aria-label="数据接入状态">
          <span><i class="pulse good"></i>IoT 18秒</span>
          <span><i class="pulse good"></i>DCS摘要 45秒</span>
          <span><i class="pulse good"></i>热电APC 2分钟</span>
          <span><i class="pulse good"></i>MES 4分钟</span>
          <span><i class="pulse warn"></i>市场行情 23分钟</span>
          <strong id="dataCompleteness">数据完整度 97.4%</strong>
        </section>
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
          <article><span>边际贡献</span><strong id="marginKpi">+7.8%</strong><small>固定成本吸收口径</small></article>
          <article><span>风险指数</span><strong id="riskKpi">32</strong><small>约束触发评分</small></article>
        </section>

        <section class="panel">
          <div class="panel-title"><span>当班事件队列</span><strong id="eventQueueCount">3项待处置</strong></div>
          <div id="eventQueue" class="event-queue"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>产供销全线事实表</span><strong>保谁 / 降谁 / 停谁 / 是否外采</strong></div>
          <div class="table-scroll"><table class="dispatch-table"><thead><tr><th>去向/装置</th><th>需求或负荷</th><th>单位液氨贡献</th><th>连续运行代价</th><th>当前动作</th><th>依据</th></tr></thead><tbody id="allocationTable"></tbody></table></div>
          <p class="data-caption">贡献值为演示口径，企业试点由订单价格、变动成本、机会成本、启停损失和战略订单权重计算。</p>
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

        <section class="panel">
          <div class="panel-title"><span>方案执行监督</span><strong id="executionState">待班长确认</strong></div>
          <div id="executionMonitor" class="execution-monitor"></div>
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
            <div class="panel-title"><span>数字调度长成长</span><strong>每班沉淀</strong></div>
            <div id="knowledgeLoop" class="stack"></div>
          </section>
        </section>

        <section class="panel">
          <div class="panel-title"><span>飞书 AI 调度助手</span><strong id="feishuLiveState">有依据地回答，有边界地执行</strong></div>
          <div class="ai-console">
            <div class="ai-prompts" aria-label="常用追问">
              <button data-question="nitric" type="button">为什么不建议硝酸满负荷？</button>
              <button data-question="allocation" type="button">液氨涨价后该保谁？</button>
              <button data-question="compressor" type="button">压机弱信号继续恶化怎么办？</button>
            </div>
            <div id="aiAnswer" class="ai-answer" aria-live="polite"></div>
            <div class="ai-actions">
              <button data-ai-action="card" type="button">生成班组卡片</button>
              <button data-ai-action="task" type="button">转执行任务</button>
              <button data-ai-action="review" type="button">写入复盘</button>
            </div>
          </div>
          <div id="feishuHub" class="feishu-hub"></div>
          <div class="feishu-links">
            <a href="https://www.feishu.cn/base/QzENbAkl1aYQGds8dBacqu6Inue" target="_blank" rel="noreferrer">打开调度复盘库</a>
            <a href="https://applink.feishu.cn/client/todo/task_list?guid=2ab6c357-dfeb-4f75-9aa3-781dc7ac7244" target="_blank" rel="noreferrer">打开执行任务清单</a>
            <a href="https://applink.feishu.cn/client/todo/detail?guid=6e519bf6-1b28-4b90-b4e5-3a82fde9e1cb" target="_blank" rel="noreferrer">打开护机场景任务</a>
            <a href="https://larkcommunity.feishu.cn/docx/AYyad50itooOPxxZpQacgSqIn2c" target="_blank" rel="noreferrer">打开在线方案文档</a>
          </div>
        </section>
      </section>

      <aside class="rail">
        <section class="panel">
          <div class="panel-title"><span>岗位视图</span><strong>同屏协同</strong></div>
          <div id="roleViews" class="stack"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>调度三条底线</span><strong>现场规则</strong></div>
          <div id="decisionRules" class="stack"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>数据接口优先级</span><strong>首批</strong></div>
          <div id="dataInterfaces" class="stack"></div>
        </section>

        <section class="panel">
          <div class="panel-title"><span>数据新鲜度</span><strong>超15分钟降级</strong></div>
          <div id="freshness" class="stack"></div>
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
.source-strip {
  display: flex;
  align-items: center;
  gap: 10px 16px;
  min-height: 42px;
  padding: 9px 13px;
  overflow-x: auto;
  color: #405567;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  white-space: nowrap;
  font-size: 12px;
}
.source-strip span { display: inline-flex; align-items: center; gap: 6px; }
.source-strip strong { margin-left: auto; color: var(--navy); }
.pulse { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: #9babb8; }
.pulse.good { background: var(--green); }
.pulse.warn { background: var(--yellow); }
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
.data-caption { margin: 0; padding: 0 16px 14px; color: #718394; font-size: 11px; line-height: 1.5; }
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
.scenario-cards, .interface-map, .model-cards, .stack, .feishu-preview { display: grid; gap: 12px; padding: 16px; }
.scenario-cards { grid-template-columns: repeat(3, minmax(0,1fr)); }
.event-queue { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; padding: 16px; }
.event-queue article { min-width: 0; padding: 14px; background: #f8fafc; border: 1px solid #dce5ec; border-top: 4px solid var(--blue); border-radius: 8px; }
.event-queue article.p1 { border-top-color: var(--red); background: #fff8f7; }
.event-queue article.p2 { border-top-color: var(--yellow); }
.event-queue article.p3 { border-top-color: var(--green); }
.event-queue article > div { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); font-size: 11px; }
.event-queue em { color: var(--red); font-style: normal; font-weight: 800; }
.event-queue b { display: block; margin: 10px 0 7px; color: var(--navy); font-size: 15px; }
.event-queue p { min-height: 60px; margin: 0; color: var(--muted); font-size: 12.5px; line-height: 1.55; }
.event-queue footer { display: grid; gap: 5px; margin-top: 10px; color: #465d70; font-size: 11px; }
.event-queue footer button { min-height: 32px; margin-top: 3px; background: #fff; }
.table-scroll { overflow-x: auto; }
.dispatch-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 12.5px; }
.dispatch-table th { padding: 10px 12px; color: #50677a; background: #f1f5f8; border-bottom: 1px solid var(--line); text-align: left; white-space: nowrap; }
.dispatch-table td { padding: 11px 12px; color: #405567; border-bottom: 1px solid #e5ebf0; vertical-align: middle; }
.dispatch-table tr:last-child td { border-bottom: 0; }
.dispatch-table b { color: var(--navy); }
.positive { color: #187849 !important; font-weight: 700; }
.negative { color: #b43d3d !important; font-weight: 700; }
.decision-pill { display: inline-flex; min-width: 38px; justify-content: center; padding: 4px 7px; border-radius: 4px; font-weight: 800; }
.decision-pill.good { color: #17623f; background: #e8f7ef; }
.decision-pill.warn { color: #914526; background: #fff0e8; }
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
.execution-monitor { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 0; padding: 16px; }
.execution-monitor article { display: grid; grid-template-columns: 30px minmax(0,1fr); gap: 9px; min-height: 104px; padding: 12px; border: 1px solid #dde6ed; border-right: 0; background: #f8fafc; }
.execution-monitor article:first-child { border-radius: 8px 0 0 8px; }
.execution-monitor article:last-child { border-right: 1px solid #dde6ed; border-radius: 0 8px 8px 0; }
.execution-monitor i { display: grid; place-items: center; width: 26px; height: 26px; color: #fff; background: var(--blue); border-radius: 50%; font-style: normal; font-size: 12px; font-weight: 800; }
.execution-monitor article.warn i { background: var(--yellow); }
.execution-monitor article.pending i { background: #8a9aa8; }
.execution-monitor b, .execution-monitor span, .execution-monitor strong { display: block; }
.execution-monitor b { color: var(--navy); font-size: 13px; }
.execution-monitor span { margin-top: 5px; color: var(--muted); font-size: 11.5px; line-height: 1.45; }
.execution-monitor strong { grid-column: 1 / -1; align-self: end; color: var(--blue); font-size: 13px; }
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
.ai-console { margin: 16px 16px 0; padding: 14px; color: #e8f2f8; background: #10283b; border-radius: 8px; }
.ai-prompts, .ai-actions, .feishu-links { display: flex; gap: 8px; flex-wrap: wrap; }
.ai-prompts button, .ai-actions button { min-height: 34px; color: #eaf5fb; background: #173b55; border-color: #41677f; font-size: 12px; }
.ai-prompts button.active { color: #10283b; background: #dceef8; border-color: #dceef8; }
.ai-answer { min-height: 116px; margin: 12px 0; padding: 13px; color: #edf7fb; background: #0b1d2a; border: 1px solid #35556d; border-radius: 6px; font-size: 13px; line-height: 1.68; }
.ai-actions { justify-content: flex-end; }
.feishu-hub {
  display: grid;
  grid-template-columns: repeat(3, minmax(0,1fr));
  gap: 12px;
  padding: 16px;
}
.feishu-hub article {
  min-height: 132px;
  padding: 14px;
  background: #f7fafc;
  border: 1px solid #dfe8ef;
  border-left: 5px solid var(--blue);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.55;
}
.feishu-hub b { display: block; margin-bottom: 7px; color: var(--navy); font-size: 15px; }
.feishu-hub span { display: block; color: var(--muted); }
.feishu-links { padding: 0 16px 16px; }
.feishu-links a { display: inline-flex; align-items: center; min-height: 36px; padding: 0 11px; color: #185b84; background: #eef7fc; border: 1px solid #cfe2ee; border-radius: 6px; font-size: 12px; font-weight: 700; text-decoration: none; }
.feishu-links a:hover { border-color: var(--blue); }
@media (max-width: 1180px) {
  .shell { grid-template-columns: 320px minmax(0,1fr); }
  .rail:last-child { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); }
}
@media (max-width: 860px) {
  .topbar { flex-direction: column; }
  .shell, .grid-2, .scenario-cards, .kpi-row, .rail:last-child, .feishu-hub, .event-queue, .execution-monitor { grid-template-columns: 1fr; }
  .execution-monitor article, .execution-monitor article:first-child, .execution-monitor article:last-child { border: 1px solid #dde6ed; border-radius: 6px; }
  .slider { grid-template-columns: 1fr 1fr 34px; }
}
@media (max-width: 560px) {
  .shell { padding: 12px; }
  .topbar { padding: 18px; }
  .field-grid, .action-grid { grid-template-columns: 1fr; }
  .source-strip strong { margin-left: 0; }
  .ai-actions { justify-content: stretch; }
  .ai-actions button { flex: 1 1 120px; }
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
  green: 34,
  ammoniaPrice: 2180,
  nitricTrend: -6,
  compressorDrift: 18
};

const presets = {
  steady: { demand: 70, energy: 56, health: 84, inventory: 62, green: 38, ammoniaPrice: 2080, nitricTrend: 1, compressorDrift: 12 },
  supply: { demand: 94, energy: 68, health: 80, inventory: 42, green: 30, ammoniaPrice: 2280, nitricTrend: -5, compressorDrift: 20 },
  protect: { demand: 66, energy: 52, health: 56, inventory: 64, green: 36, ammoniaPrice: 2140, nitricTrend: 2, compressorDrift: 72 },
  energy: { demand: 74, energy: 88, health: 80, inventory: 60, green: 58, ammoniaPrice: 2200, nitricTrend: -3, compressorDrift: 24 }
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
  const weakSignalPenalty = state.compressorDrift > 60 ? 8 : state.compressorDrift > 35 ? 3 : 0;
  const loadUpper = state.health < 62 || state.compressorDrift > 70 ? 76 : 94;
  const load = clamp(
    56 + state.demand * 0.34 - state.energy * 0.12 + state.health * 0.18 - Math.max(0, 50 - state.inventory) * 0.26 - weakSignalPenalty,
    state.health < 62 ? 50 : 60,
    loadUpper
  );
  const risk = clamp(13 + (100 - state.health) * 0.38 + state.compressorDrift * 0.29 + Math.max(0, 45 - state.inventory) * 0.55 + state.energy * 0.12 - state.green * 0.06, 8, 95);
  const order = clamp(62 + state.demand * 0.28 + load * 0.16 - risk * 0.08, 50, 98);
  const energyGain = clamp(2 + (100 - state.energy) * 0.04 + state.green * 0.08 + Math.max(0, 86 - load) * 0.04, 1, 14);
  const stock = clamp(state.inventory + load * 0.14 - state.demand * 0.09, 24, 96);
  const priceLift = (state.ammoniaPrice - 2000) / 180;
  const margin = clamp(1.0 + order * 0.06 + priceLift + energyGain * 0.24 - state.energy * 0.035 - risk * 0.02, -4, 15);
  const confidence = clamp(94 - risk * 0.23 + state.health * 0.05, 66, 95);
  return {
    load: Math.round(load),
    risk: Math.round(risk),
    order: Math.round(order),
    energyGain: Math.round(energyGain),
    stock: Math.round(stock),
    margin: margin.toFixed(1),
    nh3: Math.round(1950 * load / 100),
    confidence: Math.round(confidence),
    dataCompleteness: state.compressorDrift > 85 ? 91.2 : 97.4
  };
}

function strategy(plan) {
  if (state.health < 62 || state.compressorDrift > 60) {
    return {
      mode: "护机稳产",
      title: "压缩负荷上限，优先保护循环压缩机与合成塔温升边界",
      text: `设备健康 ${state.health}、压机弱信号 ${state.compressorDrift}，建议合成回路控制在 ${plan.load}% 左右，先复核振动、轴位移和喘振裕度，再决定是否继续降负荷。`
    };
  }
  if (state.demand > 86 && state.inventory < 55) {
    return {
      mode: "保供补氨",
      title: "提高合成负荷补液氨库存，优先兑现尿素溶液与复合肥用氨",
      text: `下游订单压力高且库存偏紧，目标负荷 ${plan.load}%，按边际贡献和固定成本吸收排序液氨去向，白班优先保障高贡献订单。`
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
    text: `液氨行情 ${state.ammoniaPrice} 元/吨、硝酸趋势 ${state.nitricTrend}%；建议目标负荷 ${plan.load}%，重点跟踪下游贡献排序、氢氮比、床层温升和压机趋势。`
  };
}

function scenarios(plan) {
  const steady = { id: "稳氨", load: clamp(plan.load - 2, 58, 90), risk: plan.risk - 4, margin: Number(plan.margin) - 0.4, body: "保持合成回路平稳，减少频繁升降负荷带来的能耗和设备扰动。" };
  const supply = { id: "保供", load: clamp(plan.load + 5, 62, state.health < 62 ? 76 : 95), risk: plan.risk + 7, margin: Number(plan.margin) + 0.6, body: "优先保障边际贡献更高、能吸收固定成本或承担战略订单的下游用氨，液氨外售降为弹性池。" };
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
    { title: "循环压缩机健康", body: state.health < 68 || state.compressorDrift > 35 ? `健康 ${state.health}、弱信号 ${state.compressorDrift}；限制升负荷速率并插入点检窗口。` : "压缩机余量可支撑当前目标负荷。", level: state.health < 68 || state.compressorDrift > 35 ? "warn" : "good" },
    { title: "液氨库存", body: state.inventory < 48 ? "库存偏紧，冻结弹性外售并优先补安全库存。" : "库存支持下游消纳和短时错峰。", level: state.inventory < 48 ? "warn" : "good" },
    { title: "能源窗口", body: state.energy > 80 ? "高价窗口触发错峰策略，需核对蒸汽和电力口径。" : "能源成本允许维持经济负荷。", level: state.energy > 80 ? "warn" : "good" },
    { title: "模型可信度", body: plan.confidence < 75 ? "仅输出备选方案，不回写MES计划。" : "可进入影子运行或低风险确认流程。", level: plan.confidence < 75 ? "danger" : "good" }
  ];
}

function interfaceMap(plan) {
  return [
    { title: "DCS historian", body: "读取负荷、温度、压力、流量、电耗、蒸汽和关键约束余量；不直接写控制参数。", tag: "5-15分钟聚合" },
    { title: "APC/MPC", body: `把班次目标负荷 ${plan.load}% 转为连续负荷建议、升降速率限制和约束余量说明。`, tag: "控制层只读对话" },
    { title: "RTO", body: `以边际贡献 ${plan.margin}%、固定成本吸收、能源窗口、库存占用和订单延期成本形成经济目标。`, tag: "经济优化" },
    { title: "MES/ERP", body: "审批通过后写计划摘要、订单优先级、交接说明和复盘结果。", tag: "管理层闭环" }
  ];
}

function models(plan) {
  return [
    { title: "机理边界", body: "氢氮比、合成塔温升、循环气量、罐区压力和最低稳定负荷作为硬约束。", tag: "先守边界" },
    { title: "PINN反应器校准", body: "用历史工况和热力学守恒约束校准反应器响应，减少纯经验拟合偏差。", tag: "反应器可信" },
    { title: "设备弱信号预测", body: state.health < 68 || state.compressorDrift > 35 ? "多变量趋势偏离，护机方案优先级上升；先检查再决策。" : "设备状态支持当前影子运行。", tag: `健康 ${state.health} / 弱信号 ${state.compressorDrift}` },
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
    { title: "边际贡献核算", body: `先看是否覆盖变动成本，再看可吸收多少折旧、固定人工和公辅摊销；当前贡献 ${plan.margin}%。`, level: "good" },
    { title: "采纳方案核算", body: `仅当方案被采纳并执行，才核算边际贡献、能耗优化 ${plan.energyGain}%、库存变化和停开成本差异。`, level: "good" },
    { title: "售价低于完全成本", body: "若仍有正边际贡献、能带走固定成本或维持战略订单，可继续开；若占用稀缺液氨且贡献为负，则触发降负荷/停产评估。", level: "warn" },
    { title: "外部因素剔除", body: "检修、物流异常、订单临时取消和行情自然上涨单独标记，不进入系统收益。", level: "warn" }
  ];
}

function allocationRows(plan) {
  const scarce = state.inventory < 50 || state.demand > 86;
  const externalMargin = Math.round(state.ammoniaPrice - 1940 - state.energy * 1.3);
  const nitricMargin = Math.round(180 + state.nitricTrend * 18 - state.energy * 0.8);
  const rows = [
    { name: "复合肥刚性订单", demand: `${Math.round(72 + state.demand * 0.22)}%`, margin: Math.round(420 + state.demand * 1.3), restart: "连续消纳 / 客户交期", action: "保", why: "订单与产业链协同" },
    { name: "尿素溶液", demand: `${Math.round(68 + state.demand * 0.18)}%`, margin: Math.round(330 + state.demand), restart: "稳定消纳 / 降负荷受限", action: "保", why: "稳定主流程" },
    { name: "纯碱配套", demand: `${Math.round(60 + state.demand * 0.16)}%`, margin: Math.round(255 + state.demand * 0.7), restart: "联碱联动 / 6-10h", action: scarce ? "稳" : "保", why: "跨装置平衡" },
    { name: "硝酸", demand: `${Math.round(64 + state.nitricTrend)}%`, margin: nitricMargin, restart: "降负荷优先 / 4-8h", action: nitricMargin < 80 ? "降" : "稳", why: state.nitricTrend < 0 ? "行情走弱" : "边际贡献尚可" },
    { name: "液氨外售", demand: `${state.ammoniaPrice}元/t`, margin: externalMargin, restart: "弹性池 / 无启停", action: scarce ? "限" : externalMargin > 160 ? "保" : "降", why: "机会成本比较" },
    { name: "外采液氨", demand: `${state.ammoniaPrice + 80}元/t`, margin: -Math.round(80 + state.energy * 0.3), restart: "物流与到货风险", action: state.inventory < 38 && state.demand > 88 ? "询价" : "不采", why: "仅保刚性订单" }
  ];
  return rows.sort((a, b) => b.margin - a.margin);
}

function eventQueue(plan) {
  const events = [];
  if (state.inventory < 52 || state.demand > 86) {
    events.push({ level: "p1", source: "MES / 罐区", title: "液氨可分配量趋紧", body: `库存 ${state.inventory}%、订单压力 ${state.demand}；需在复合肥、尿素溶液、纯碱、硝酸和外售间重排。`, impact: "影响未来8小时", owner: "调度长", action: "打开分配表" });
  } else {
    events.push({ level: "p2", source: "ERP / MES", title: "下游消纳结构可优化", body: `液氨库存 ${state.inventory}%，可按单位液氨贡献微调去向，不改变主流程节奏。`, impact: `预计贡献 +${plan.margin}%`, owner: "生产调度", action: "核对订单" });
  }
  if (state.compressorDrift > 35 || state.health < 68) {
    events.push({ level: "p1", source: "SMC / 机组", title: "循环压缩机弱信号抬升", body: `弱信号 ${state.compressorDrift}、健康 ${state.health}；先查振动、轴位移、入口条件和喘振裕度。`, impact: "可能触发护机降负荷", owner: "设备工程师", action: "发起复核" });
  } else {
    events.push({ level: "p3", source: "SMC / 机组", title: "关键机组趋势稳定", body: `弱信号 ${state.compressorDrift}，未越黄灯阈值；继续观察多变量同向漂移。`, impact: "无即时负荷限制", owner: "设备值班", action: "继续监视" });
  }
  events.push({ level: state.energy > 80 ? "p1" : "p2", source: "热电 APC", title: state.energy > 80 ? "高价能源窗口临近" : "公辅供给处于可调区", body: state.energy > 80 ? "建议压低边际产量，低价窗口补回库存，避免频繁升降负荷。" : "蒸汽、电力和循环水余量支持当前方案。", impact: state.energy > 80 ? "未来4小时成本上升" : `节能空间 ${plan.energyGain}%`, owner: "公辅调度", action: "核对能源窗口" });
  return events.sort((a, b) => a.level.localeCompare(b.level));
}

function renderEventQueue(plan) {
  const items = eventQueue(plan);
  document.getElementById("eventQueueCount").textContent = `${items.filter(item => item.level !== "p3").length}项待处置`;
  document.getElementById("eventQueue").innerHTML = items.map(item => `
    <article class="${item.level}">
      <div><em>${item.level.toUpperCase()}</em><span>${item.source}</span></div>
      <b>${item.title}</b><p>${item.body}</p>
      <footer><span>${item.impact}</span><span>责任：${item.owner}</span><button type="button" data-queue-action="${item.action}">${item.action}</button></footer>
    </article>
  `).join("");
}

function renderAllocation(plan) {
  document.getElementById("allocationTable").innerHTML = allocationRows(plan).map(row => `
    <tr><td><b>${row.name}</b></td><td>${row.demand}</td><td class="${row.margin < 0 ? "negative" : "positive"}">${row.margin > 0 ? "+" : ""}${row.margin} 元/t-NH3</td><td>${row.restart}</td><td><span class="decision-pill ${row.action === "降" || row.action === "限" || row.action === "不采" ? "warn" : "good"}">${row.action}</span></td><td>${row.why}</td></tr>
  `).join("");
}

function executionMonitor(plan) {
  const actual = clamp(plan.load - (state.compressorDrift > 60 ? 5 : 2), 50, 95);
  const deviation = actual - plan.load;
  return [
    { label: "班长确认", status: plan.risk > 55 ? "待主管复核" : "已确认", value: plan.risk > 55 ? "高风险双签" : "低风险单签", level: plan.risk > 55 ? "warn" : "good" },
    { label: "目标负荷", status: `${plan.load}%`, value: "仅回写MES班次计划", level: "good" },
    { label: "DCS实际负荷", status: `${actual}%`, value: `偏差 ${deviation > 0 ? "+" : ""}${deviation}pct`, level: Math.abs(deviation) > 3 ? "warn" : "good" },
    { label: "效果复核", status: "班末完成", value: `收益、能耗、库存、异常四项归因`, level: "pending" }
  ];
}

function renderExecution(plan) {
  const rows = executionMonitor(plan);
  document.getElementById("executionState").textContent = rows[0].status;
  document.getElementById("executionMonitor").innerHTML = rows.map((row, index) => `
    <article class="${row.level}"><i>${index + 1}</i><div><b>${row.label}</b><span>${row.value}</span></div><strong>${row.status}</strong></article>
  `).join("");
}

function freshness() {
  return [
    { title: "DCS / IoT", body: "18-45秒，关键过程点完整；可参与重算。", level: "good" },
    { title: "MES / ERP", body: "4-9分钟，订单和班次执行口径一致。", level: "good" },
    { title: "热电 APC", body: "2分钟，蒸汽和公辅约束可用。", level: "good" },
    { title: "市场行情", body: "23分钟，仅用于提醒；重算前需运营人员确认价格。", level: "warn" }
  ];
}

function aiAnswer(question, plan) {
  const answers = {
    nitric: `当前不建议硝酸满负荷。硝酸行情趋势为 ${state.nitricTrend}%，单位液氨演示贡献已降至 ${allocationRows(plan).find(row => row.name === "硝酸").margin} 元/t-NH3；同时液氨库存为 ${state.inventory}%。建议先保复合肥刚性订单和尿素溶液，硝酸维持最低经济负荷，4小时后按新价格与库存重算。依据：[产供销全线事实表] [MES订单] [罐区库存]。`,
    allocation: `液氨价格 ${state.ammoniaPrice} 元/吨时，不能只看售价。当前排序先看安全与流程连续，再比较单位液氨边际贡献、固定成本吸收和启停损失。建议保复合肥刚性订单、尿素溶液和联碱连续消纳；硝酸随行情降负荷；外售作为弹性池。只有库存跌破38%且刚性订单缺口扩大时才询价外采。依据：[ERP订单] [边际贡献模型] [启停损失规则]。`,
    compressor: `压机弱信号为 ${state.compressorDrift}、健康评分 ${state.health}。若弱信号超过60或多变量连续同向漂移，先限制升负荷速率，核查振动、轴位移、入口温压和喘振裕度，并通知设备工程师；超过70时优先切换护机方案。AI只给黄灯和处置顺序，不触发联锁或开停车。依据：[SMC压机趋势] [DCS摘要] [设备处置卡]。`
  };
  return answers[question] || answers.allocation;
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

function feishuContract(plan, text) {
  const riskPath = plan.risk > 55 ? "班长确认 → 调度主管复核 → 安环知会" : "班长确认";
  return {
    card: {
      target_chat: "合成氨当班调度群",
      title: `${text.mode}｜合成氨负荷调整建议`,
      buttons: ["采纳并发起审批", "要求复核", "驳回并填写原因"],
      fields: {
        target_load_percent: plan.load,
        risk_index: plan.risk,
        confidence_percent: plan.confidence,
        approval_path: riskPath
      }
    },
    approval: {
      definition: "ammonia_load_adjustment",
      form_fields: ["班次", "目标负荷", "约束解释", "风险等级", "预计收益", "回写范围"],
      write_back_after_approved: ["MES班次计划", "交接班摘要", "飞书多维表格复盘"]
    },
    base_record: {
      table: "合成氨调度复盘库",
      key_fields: ["shift_id", "scenario", "target_load", "accepted", "reject_reason", "actual_delta", "operator_note"],
      current_sample: {
        shift_id: "NH3-20260804-D",
        scenario: text.mode,
        target_load: `${plan.load}%`,
        expected_margin: `${plan.margin}%`,
        risk_index: plan.risk
      }
    },
    task: {
      title: "跟踪负荷调整执行效果",
      owners: ["调度员", "班长", "设备工程师"],
      due: "本班结束前",
      checklist: ["确认DCS historian实际负荷", "记录未采纳原因", "班后复盘收益归因"]
    },
    callback: {
      events: ["im.message.receive_v1", "card.action.trigger", "approval.instance.status_changed", "bitable.record.changed"],
      guardrails: ["签名校验", "幂等键", "DCS/SIS只读", "低置信度自动降级人工"]
    },
    aily: {
      entry: "合成氨调度问答助手",
      grounded_sources: ["班次事实表", "调度复盘库", "异常经验库", "APC/RTO约束摘要"]
    }
  };
}

function renderFeishuHub(plan, text) {
  const contract = feishuContract(plan, text);
  const cards = [
    { title: "班组卡片", body: `把“${text.mode}”建议送入确认链，回传采纳、复核或驳回原因。`, tag: "飞书消息" },
    { title: "负荷审批", body: `当前风险走“${contract.card.fields.approval_path}”，通过后只回写MES摘要。`, tag: "人工把关" },
    { title: "在线复盘库", body: `真实 Base 已建立13个字段和3条完整样例，记录目标、实际、偏差与未采纳原因。`, tag: "在线可打开" },
    { title: "执行任务", body: `真实任务清单已建立，用于跟踪负荷、收益、异常和班后复盘。`, tag: "责任到人" },
    { title: "飞书 AI", body: "回答必须标出班次事实、设备趋势和规则来源；无依据时转人工复核。", tag: "有源回答" },
    { title: "知识回流", body: "卡片、审批、任务和Base结果统一形成下一班可检索的经验样本。", tag: "持续校准" }
  ];
  document.getElementById("feishuHub").innerHTML = cards.map(item => `
    <article>
      <b>${item.title}</b>
      <span>${item.body}</span>
      <em class="tag">${item.tag}</em>
    </article>
  `).join("");
}

function knowledge(plan) {
  return [
    { title: "全线事实表", body: "把MES、IoT、DCS、APC、压机、热电和行情数据汇成调度长同屏口径。", level: "good" },
    { title: "调度长经验库", body: `输入快照、目标负荷 ${plan.load}%、审批人、采纳状态、实际偏差和班长判断进入统一记录。`, level: "good" },
    { title: "新人训练样本", body: "把安全边界、设备风险、订单变化、数据不可信和经验判断结构化，供新调度员按场景学习。", level: "warn" },
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

function decisionRules(plan) {
  const continuityRisk = state.demand > 84 || state.inventory < 45 || state.energy > 78;
  const equipmentRisk = state.health < 62 || plan.risk > 62;
  return [
    {
      title: "第一优先级：安全",
      body: equipmentRisk ? "设备或工艺风险升高，方案只保留降风险动作，严禁为了产量突破DCS/SIS和安环红线。" : "所有建议先通过合成塔、压缩机、罐区和环保约束筛选。",
      level: equipmentRisk ? "danger" : "good"
    },
    {
      title: "第二优先级：流程不中断",
      body: continuityRisk ? "下游需求、库存或能源窗口正在挤压连续流程，优先做跨装置负荷联动，避免气化、净化、合成和液氨去向被动中断。" : "维持合成氨主流程连续，减少停车后重启时间、废料、人员和物料损失。",
      level: continuityRisk ? "warn" : "good"
    },
    {
      title: "第三优先级：特殊情况取舍",
      body: "确需中断时比较停空分、停合成气轮机或停下游装置的重启时间、废料和影响范围；已验证场景优先保气轮机驱动关键系统，停空分需班长/主管确认。",
      level: "warn"
    }
  ];
}

function dataInterfaces() {
  return [
    { title: "MES/合成氨调控平台", body: "承接日计划、班次执行、负荷调整记录和交接复盘；厂商名称按口述待企业确认。", level: "good" },
    { title: "IoT数据平台", body: "采集合成氨DCS底层过程数据，进入班次事实表和弱信号趋势分析。", level: "good" },
    { title: "合成氨DCS", body: "负责主装置局部回路、顺控、报警和联锁；AI只读取historian摘要。", level: "good" },
    { title: "和利时DCS/热电APC", body: "提供热电、公辅和蒸汽管网约束，APC结果用于跨装置负荷联动。", level: "good" },
    { title: "SMC压机/康迪森机组", body: "压缩机、气轮机驱动系统和关键机组健康趋势，用于护机和特殊停机取舍。", level: state.health < 68 ? "warn" : "good" }
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
    bitable: "已写入班后复盘样例",
    task: "已生成飞书执行任务",
    review: "已生成复盘记录"
  };
  const detail = {
    recalc: `${text.mode}，目标负荷 ${plan.load}%，风险 ${plan.risk}，置信度 ${plan.confidence}%。`,
    card: `发送至合成氨当班调度群，包含负荷、风险、约束和确认按钮。`,
    approval: `审批通过后只写MES计划、交接摘要和复盘记录，不写DCS/SIS。`,
    bitable: `沉淀采纳状态、未采纳原因、执行偏差和班长备注。`,
    task: `责任人、检查项和班末复核要求已按当前方案生成。`,
    review: `当前输入、判断依据、采纳状态和效果指标已进入复盘草稿。`
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
  document.getElementById("dataCompleteness").textContent = `数据完整度 ${plan.dataCompleteness}%`;
  document.getElementById("operatorNote").textContent = `当前建议：${text.mode}；审批路径：${plan.risk > 55 ? "班长+调度主管" : "班长确认"}；回写范围限定为MES计划、交接摘要和复盘记录。`;
  document.getElementById("constraintCount").textContent = `${constraints(plan).length}项`;
  document.getElementById("modelTrust").textContent = plan.confidence < 75 ? "仅规则提醒" : "可影子运行";
  document.getElementById("shiftSummary").textContent = `${text.mode}｜24h`;
  renderEventQueue(plan);
  renderAllocation(plan);
  renderScenarioCards(plan);
  renderList("interfaceMap", interfaceMap(plan));
  renderList("modelCards", models(plan));
  renderGantt(schedule(plan));
  renderExecution(plan);
  renderList("constraints", constraints(plan));
  renderList("benefitTrace", benefitTrace(plan));
  document.getElementById("feishuPreview").innerHTML = feishu(plan, text);
  renderFeishuHub(plan, text);
  renderList("knowledgeLoop", knowledge(plan));
  renderList("roleViews", roleViews(plan));
  renderList("decisionRules", decisionRules(plan));
  renderList("dataInterfaces", dataInterfaces());
  renderList("freshness", freshness());
  if (!document.getElementById("aiAnswer").dataset.question) {
    document.getElementById("aiAnswer").dataset.question = "allocation";
  }
  document.getElementById("aiAnswer").textContent = aiAnswer(document.getElementById("aiAnswer").dataset.question, plan);
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

document.querySelectorAll("[data-question]").forEach(button => {
  button.addEventListener("click", event => {
    document.querySelectorAll("[data-question]").forEach(item => item.classList.remove("active"));
    event.currentTarget.classList.add("active");
    document.getElementById("aiAnswer").dataset.question = event.currentTarget.dataset.question;
    render();
  });
});

document.querySelectorAll("[data-ai-action]").forEach(button => {
  button.addEventListener("click", event => {
    const plan = calc();
    const text = strategy(plan);
    pushEvent(event.currentTarget.dataset.aiAction, plan, text);
    document.getElementById("feishuLiveState").textContent = event.currentTarget.dataset.aiAction === "task" ? "执行任务草稿已生成" : "飞书动作草稿已生成";
    render();
  });
});

document.getElementById("eventQueue").addEventListener("click", event => {
  const button = event.target.closest("[data-queue-action]");
  if (!button) return;
  const plan = calc();
  const text = strategy(plan);
  pushEvent("card", plan, text);
  document.getElementById("feishuLiveState").textContent = `${button.dataset.queueAction}｜已转飞书协同草稿`;
  render();
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
        "positioning": "合成氨产供销全线联动数字调度长，不直接控制DCS/SIS。",
        "final_priority_lanes": FINAL_PRIORITY_LANES,
        "units": [
            {"id": "syngas", "name": "制气/净化", "key_constraints": ["原料气稳定", "蒸汽平衡", "CO2分离", "氢氮比"]},
            {"id": "synthesis", "name": "氨合成回路", "key_constraints": ["合成塔床层温升", "循环压缩机负荷", "最低稳定负荷", "升降负荷速率"]},
            {"id": "tank", "name": "液氨罐区", "key_constraints": ["安全库存", "罐区压力", "装车窗口", "外售弹性"]},
            {"id": "downstream", "name": "尿素溶液/复合肥/联碱配套", "key_constraints": ["订单交期", "生产节拍", "包装物流", "客户优先级"]},
        ],
        "optimization_modes": ["产供销联动", "稳产波动吸收", "设备弱信号预警", "经验沉淀训练"],
        "decision_hierarchy": [
            {"priority": 1, "name": "安全", "rule": "不突破安环红线、DCS/SIS联锁边界和关键设备保护。"},
            {"priority": 2, "name": "流程不中断", "rule": "优先维持气化、净化、合成、液氨去向和气轮机驱动关键系统连续。"},
            {"priority": 3, "name": "特殊情况取舍", "rule": "确需中断时比较停空分、停合成气轮机和停下游装置的重启时间、废料、人员物料成本和影响范围。"},
        ],
        "economic_decision_rules": [
            {"name": "边际贡献", "rule": "销售收入扣除原料、蒸汽、电力、包装、物流等变动成本后仍为正时，可作为继续生产的重要理由。"},
            {"name": "固定成本吸收", "rule": "即使售价低于完全成本，只要能带走折旧、固定人工、公辅摊销或战略订单价值，也可能继续开。"},
            {"name": "液氨机会成本", "rule": "液氨有限时比较尿素、纯碱、硝酸、复合肥和外售的单位液氨综合贡献。"},
            {"name": "停开成本", "rule": "边际贡献接近零时，将停车、重启、废料、人员和物料损失纳入取舍。"},
        ],
        "supply_chain_orchestration": {
            "problem": "现有MES、IoT、DCS、APC、压机、热电和经营数据分散，调度长需要人工跨系统梳理。",
            "target": "形成产供销全线事实表、跨系统冲突识别、联动建议和调度长经验沉淀。",
            "training_value": "把五年调度长经验拆成可检索案例、Aily问答、飞书复盘和新人训练样本。",
        },
        "operator_cockpit": {
            "event_queue": ["产供销冲突", "公辅能源窗口", "关键设备弱信号"],
            "allocation_table": ["复合肥刚性订单", "尿素溶液", "纯碱配套", "硝酸", "液氨外售", "外采液氨"],
            "decision_outputs": ["保", "稳", "降", "限", "停", "询价外采"],
            "execution_supervision": ["班长确认", "目标负荷", "DCS实际负荷", "效果复核"],
            "data_freshness_rule": "关键数据延迟超过15分钟时，不自动重算并转人工确认。",
        },
        "feishu_ai": {
            "grounded_sources": ["产供销全线事实表", "MES订单", "DCS摘要", "设备趋势", "调度复盘库", "处置规则"],
            "answer_contract": ["先给结论", "列出当前数值", "说明安全边界", "标注事实来源", "给出责任人与复核时间"],
            "actions": ["生成班组卡片", "转执行任务", "写入复盘"],
            "real_artifacts": {"document": FEISHU_DOC_URL, "base": FEISHU_BASE_URL, "tasklist": FEISHU_TASK_URL},
        },
        "interfaces": [
            {"system": "MES", "fields": ["日计划", "班次产量", "执行偏差", "偏差原因"], "frequency": "班次/小时"},
            {"system": "ERP", "fields": ["订单", "交期", "客户优先级", "价格口径"], "frequency": "订单变更/日"},
            {"system": "DCS historian", "fields": ["负荷", "温度", "压力", "流量", "电耗", "蒸汽"], "frequency": "5-15分钟聚合"},
            {"system": "APC/RTO", "fields": ["约束余量", "经济目标", "连续负荷建议", "回放验证"], "frequency": "试点配置"},
            {"system": "Feishu", "fields": ["卡片", "审批", "多维表格", "Aily问答", "事件回调"], "frequency": "事件触发"},
        ],
        "existing_system_stack": EXISTING_SYSTEM_STACK,
        "acceptance": [
            "高优订单满足率不低于人工调度",
            "单位氨能耗、库存占用、调度耗时或异常预警提前量至少一项改善",
            "关键数据延迟超过15分钟自动降级",
            "模型连续两天偏差超阈值时停用优化方案",
        ],
    }
    DATA.mkdir(exist_ok=True)
    (DATA / "plant-model.json").write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")

    readme = f"""# 氨智领航调控师

面向云图控股合成氨装置运行管理场景的产供销全线联动数字调度长。平台不直接修改 DCS/SIS 控制逻辑，不自动开停车；它打通 MES、IoT、DCS、APC、压机、热电和经营数据，围绕液氨去向、下游需求、市场价格、能源波动和装置负荷，输出可解释、可审批、可复盘的联动调度方案。

## 决赛版主线

- 主赛道：产供销协同与跨装置负荷联动，回答保谁、降谁、停谁、是否外采、风险在哪里。
- 第二赛道：稳定生产下的波动吸收与提前预警，让系统平稳、经济、安全运行。
- 第三优先级：压缩机、关键机组、合成塔等设备弱信号预警，给新操作工黄灯提醒。
- 支撑底座：经验沉淀与新人快速成长，把调度长五年经验拆成案例、规则、问答和训练样本。

## 决赛版强化

- 当班事件队列：按 P1/P2/P3 汇总产供销冲突、公辅窗口和设备弱信号，明确影响、责任人和下一步动作。
- 产供销事实表：把复合肥、尿素溶液、纯碱、硝酸、液氨外售和外采放在同一贡献口径下排序。
- 执行监督：对比建议负荷与 DCS 实际负荷，跟踪审批、执行偏差和班末效果复核。
- APC/RTO 对接层：读取约束余量和经济目标，输出班次级目标负荷、升降速率建议和回写边界。
- 机理/PINN 可信模型：用合成塔温升、氢氮比、循环气量、压缩机效率和罐区压力约束算法建议。
- 飞书班组闭环：互动卡片、负荷调整审批、多维表格复盘、任务清单、飞书 AI 有源问答和事件回调。
- 知识库自迭代：采纳、驳回、未采纳原因、执行偏差和班长经验进入合成负荷指令库。
- 跨装置联动规则：安全第一、流程不中断第二、特殊情况再比较停空分/停气轮机/停下游的总损失。
- 现有系统对接：按导师口述补充MES/合成氨调控平台、IoT采集、合成氨DCS、和利时DCS/热电APC、SMC压机软件和康迪森机组数据，正式试点前需企业确认厂商名称与点位清单。
- 产供销经济口径：不只比较售价和完全成本，而是综合边际贡献、固定成本吸收、液氨机会成本和停开成本。
- 全产业链贯通：把孤岛系统中的订单、库存、装置、热电、压机和行情信息汇成调度长事实表，沉淀五年调度长经验为新人可学的数字资产。

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

企业软件功能对标与本平台取舍见 `docs/enterprise-software-benchmark.md`。

## 提交材料

- 飞书在线稿：`{FEISHU_DOC_URL}`

- 飞书 Base 原型：`{FEISHU_BASE_URL}`

- 飞书任务清单：`{FEISHU_TASK_URL}`

- `提交材料/00_提交信息汇总.docx`
- `提交材料/01_开题报告.docx`
- `提交材料/02_整体解决方案书.docx`
- `提交材料/03_调控师操作手册.docx`
- `提交材料/04_参考文献与数据依据.docx`
- `提交材料/05_方案创新与落地清单.docx`
- `提交材料/06_决赛完整方案文档.docx`
- `提交材料/07_飞书功能模块说明.docx`

## 飞书接入所需授权

真实接入企业飞书时，需要企业自建应用 `App ID` / `App Secret`、目标调度群机器人权限、审批定义 `approval_code`、多维表格读写权限、事件订阅回调地址和签名校验配置。相关密钥不写入前端仓库。
"""
    write_text(ROOT / "README.md", readme)

    final_md = """# 决赛方案补强说明

## 入围反馈沉淀

本方案获得认可的核心在于结构化程度、30/60/90天落地节奏、影子运行到小闭环的路径、班次事实表、调度员采纳跟踪、班后复盘和开放代码仓库。企业补充后，决赛版不再平均展开能力，而是收束为“产供销协同与跨装置负荷联动”主赛道，并以稳产波动吸收、设备弱信号预警和新人快速成长作为支撑。

## 决赛版四个方向

1. 主赛道：产供销协同与跨装置负荷联动，回答保谁、降谁、停谁、是否外采。
2. 第二赛道：稳定生产下的波动吸收与提前预警，避免下游、能源、公辅和库存变化冲击主流程。
3. 第三优先级：设备弱信号预警，给新操作工黄灯提醒和检查清单。
4. 支撑底座：经验沉淀与新人快速成长，把调度长经验转成案例、规则、问答和训练样本。

## 企业试点边界

- 第一阶段只影子运行，不直接控制DCS/SIS。
- 审批通过后也只写MES计划、交接摘要和复盘记录。
- 数据延迟、模型低置信或安环红线接近时自动降级。
- 收益只核算被采纳且实际执行的方案，并剔除外部市场、检修和物流影响。
"""
    write_text(DOCS / "final-round-upgrade.md", final_md)

    submission_alignment_md = f"""# 云图控股🤝氨智领航队｜氨智领航调控师：合成氨生产调度专家平台

## 一、参赛方案信息卡

| 项目 | 填写内容 |
| --- | --- |
| 队名 | 氨智领航队 |
| 命题 | 如果来到全球领先的合成氨生产装置现场，如何用AI打造一个生产调度专家？ |
| 一句话摘要 | 在不触碰DCS/SIS底层控制的前提下，打通MES、IoT、DCS、APC、压机、热电和经营数据，围绕液氨去向、下游需求、市场价格、能源波动和装置负荷，告诉调度员保谁、降谁、停谁、是否外采、风险在哪里。 |
| 成员介绍&分工 | 邓植斤：负责命题洞察、行业资料研读、系统架构、平台原型、飞书协同设计、提交材料与GitHub交付。 |
| 使用的飞书 AI 能力 | 飞书互动卡片、审批、多维表格、任务监督、Aily问答入口、事件回调、班后复盘知识沉淀。 |

## 二、方案成果展示

本方案已形成可本地打开的调控师工作台、数据模型、架构文档、飞书协同设计、操作手册、参考文献与决赛补充材料。平台主界面面向企业现场人员，核心围绕当班调度的目标负荷、风险边界、下游分配、飞书确认和复盘沉淀。

### 命题场景描述、问题描述及痛点说明

云图合成氨装置连接尿素溶液、复合肥、联碱配套、液氨库存与外售，调度同时受合成塔床层温升、氢氮比、循环压缩机、罐区安全库存、能源价格、下游订单和设备健康约束。命题痛点集中在三处：调度寻优难、指挥效率低、知识传承难。

### 决赛主线

1. 主赛道：产供销协同与跨装置负荷联动，解决液氨有限、下游需求、市场价格、能源波动和装置负荷之间的实时取舍。
2. 第二赛道：稳定生产下的波动吸收与提前预警，避免下游、能源、公辅和库存变化冲击上游主流程。
3. 第三优先级：关键设备弱信号预警，给新操作工黄灯提醒：哪里在变、可能坏到什么程度、先查什么、通知谁。
4. 支撑底座：经验沉淀与新人快速成长，把调度长经验、未采纳原因、事故复盘和班组处置转化为案例、规则和训练样本。

### 方案优势/创新点

- 产供销主赛道：把液氨去向、下游需求、价格行情、边际贡献和装置负荷放在第一优先级。
- 机理+PINN可信孪生：把反应器温升、氢氮比、循环气量和压缩机效率纳入约束，减少外行化建议。
- APC/RTO对接层：不重做控制系统，能与企业现有APC/RTO体系低风险对话。
- 飞书班组闭环：让建议进入真实通知、审批、复盘和责任留痕。
- 未采纳原因学习：把专家否决和现场经验沉淀为知识资产。
- 反事实收益归因：避免把行情波动误算为系统收益。

### 具体方案说明（突出AI能力）

平台先以30天打通MES日计划、ERP订单、DCS historian摘要、液氨罐区、EAM点检、能源价格与飞书协同记录，形成班次事实表；60天进入影子运行，滚动输出稳氨、保供、护机三案；90天只在低风险场景做小闭环验收。模型层采用机理约束+RTO经济目标+APC/MPC连续负荷建议+PINN反应器校准的组合，组织层接入飞书互动卡片、审批、多维表格、任务监督和班后复盘，知识层沉淀每次实际方案、未采纳原因、床层温升异常、氢氮比偏差、压缩机健康变化和收益核算。

### 全产业链贯通重心

企业补充指出，当前多个系统更像孤岛，调度长需要从MES、IoT、DCS、APC、压机、热电和经营系统中逐项梳理信息，再靠多年经验判断。方案将重心放在产供销全线平衡：形成同一张全线事实表，识别订单、库存、液氨去向、下游负荷、热电约束、设备风险和行情之间的冲突，并把调度长经验沉淀为新人可复用的案例、问答和复盘规则。

### 跨装置联动的现场规则

本方案把导师补充的现场经验固化为调度优先级：第一是安全，不突破DCS/SIS、安环红线和关键设备保护；第二是流程不中断，尽量避免气区、合成和液氨去向被动停车，因为重启会带来时间、废料、人员和物料损失；第三是在确需中断时做取舍，比较停空分、停合成气轮机、停下游装置的总损失，并通过飞书审批和班后复盘沉淀专家规则。

### 现有系统接入理解

根据导师补充，生产侧已有MES/合成氨调控平台、IoT数据采集、合成氨DCS、热电侧和利时DCS、热电APC、SMC压机软件以及康迪森机组数据接入。方案不替代这些系统，而是把它们作为数据源、约束源和执行留痕源：DCS/APC提供过程与约束，IoT汇聚底层数据，MES承接计划与复盘，压机和机组软件提供弱信号预警，飞书承接审批、任务和知识沉淀。系统名称和点位清单需在企业试点前确认。

### 产供销经济口径

下游产品不是售价低于完全成本就一定停。连续化工装置需要考虑变动成本、边际贡献、折旧和固定费用吸收、战略订单、液氨机会成本以及停开成本。平台会解释：继续开是因为仍有边际贡献并能带走固定成本，还是应降负荷/停产，因为占用了稀缺液氨且贡献为负。

### 飞书功能模块如何支撑解题

| 命题挑战 | 飞书模块支撑 | 企业侧沉淀 |
| --- | --- | --- |
| 调度寻优难 | Aily追问、Base复盘库和事件回调把模型理由、历史效果、未采纳原因连接起来。 | 调度案例库、异常处置库、模型校准样本。 |
| 指挥效率低 | 互动卡片送达当班群，审批承接高风险调整，任务监督跟踪执行与复盘。 | 确认人、审批人、执行人、截止时间和关闭结果责任链。 |
| 知识传承难 | 多维表格沉淀班次事实、班长备注、执行偏差和收益归因，Aily基于授权知识源回答追问。 | 可审计、可检索、可复用的班组经验资产。 |

### 方案价值

价值指标采用保守口径：高优订单满足率、单位氨能耗、液氨库存占用、调度耗时、异常预警提前量和采纳方案收益归因。收益只核算被采纳且实际执行的方案，并剔除市场行情、检修计划、物流异常等外部影响。

### 方案体验入口 & demo展示视频

体验入口：本地打开 `D:\\云图-合成氨-邓植斤\\index.html`；GitHub 仓库：`https://github.com/zhijinDeng/synthesis-ammonia`。

飞书原型：决赛完整方案在线稿 `{FEISHU_DOC_URL}`；合成氨调度复盘库 Base 原型 `{FEISHU_BASE_URL}`；决赛提交任务清单 `{FEISHU_TASK_URL}`。

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

氨智领航调控师位于生产运行管理层，服务对象是合成氨调度员、调度长、班长、调度主管、设备与安环值班人员。平台不替代DCS/SIS/APC，不自动开停车，而是在安全约束内生成产供销全线联动方案、解释收益与风险、推动飞书协同确认，并把执行结果沉淀为知识库。

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
| 现有系统对接层 | 对接MES、IoT、DCS、热电APC、压机软件和机组数据 | 系统职责表、只读/写回边界、点位确认清单 |
| 全产业链编排层 | 打通产供销平衡、液氨去向、下游负荷、热电公辅和行情变化 | 全线事实表、冲突识别、调度长建议摘要 |
| 当班事件队列 | 按安全、流程连续、经济影响和时效对跨系统事件排序 | P1/P2/P3、责任人、影响窗口、下一步动作 |
| 产供销事实表 | 产供销协同与跨装置负荷联动 | 保谁、降谁、停谁、是否外采、风险在哪里 |
| 可信模型层 | 用机理约束和PINN校准限制算法建议 | 合成塔温升、氢氮比、压缩机、罐区约束 |
| APC/RTO对接层 | 与企业已有控制和实时优化体系对话 | 目标负荷、升降速率、经济目标、回写边界 |
| 三案优化器 | 输出稳氨、保供、护机三套可执行方案 | 目标负荷、风险指数、收益口径、回滚条件 |
| 执行监督层 | 对比建议负荷、审批状态和DCS实际负荷 | 偏差、责任人、班末复核和回滚条件 |
| 飞书协同层 | 承载卡片、审批、多维表格、任务和飞书AI有源追问 | 责任人、确认时间、采纳/驳回原因、事实来源 |
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

云图命题的关键在“硬件成本接近极限后的软件层降本”。合成氨装置不是孤立产氨单元，而是连接尿素溶液、复合肥、联碱配套、液氨库存与外售的经营枢纽。企业补充后，方案重心必须放在产供销全线平衡：液氨有限时保谁、降谁、停谁、是否外采；波动来临时如何不冲击主流程；新人如何继承调度长经验。

## 资料提炼

- 云图公告和年报支撑70万吨合成氨项目与下游肥化产业链协同的业务背景。
- IEA氨路线图和节能降碳资料说明氨行业具有持续能耗优化价值。
- 合成氨安全标准化资料约束平台不能越过安环、设备和重大危险源边界。
- MPC/RTO和Haber-Bosch负荷调节研究说明连续装置动态优化有理论基础，但需要机理约束和现场规则。
- 飞书开放平台资料支撑卡片、审批、多维表格和事件回调进入企业协同链。

## 决赛版判断

入围反馈认可方案的结构化、30/60/90天路径、影子运行、小闭环、三案、采纳跟踪和代码开放。企业补充进一步明确，决赛版重心应放在产供销全线平衡和孤岛系统贯通：把MES、IoT、DCS、APC、压机、热电和经营信息汇成调度长事实表，再用知识库缩短新人从跟班到独立判断的成长周期。
"""
    write_text(DOCS / "research-brief.md", research_md)

    roadmap_md = """# 30/60/90天试点路线

## 30天：数据与口径

- 明确MES、ERP、IoT、DCS historian、热电APC、压机/机组、罐区、行情和飞书记录的字段映射。
- 建立产供销全线事实表和数据质量评分。
- 形成DCS/SIS隔离、APC/RTO只读对接、MES回写范围和审批边界。

交付物：接口清单、字段字典、数据质量报告、全线事实表、飞书卡片/审批/多维表格样例。

## 60天：影子运行

- 每班生成产供销联动、稳产波动吸收、设备弱信号预警三类建议。
- 与人工调度方案做回放对比。
- 记录采纳、未采纳原因、执行偏差、收益归因和班长经验判断。

交付物：影子运行周报、采纳原因清单、未采纳原因库、模型偏差报告。

## 90天：低风险小闭环

- 只选择低风险、数据可信、审批路径清晰的场景回写MES计划摘要。
- 通过飞书审批留痕并跟踪实际执行。
- 输出边际贡献归因、停用条件、调度长经验规则修订和推广建议。

交付物：小闭环验收报告、停用条件验证、知识库版本、下一阶段推广边界。

## 验收口径

- 高优订单满足率不低于人工调度。
- 单位氨能耗、库存占用、调度耗时或异常预警提前量至少一项稳定改善。
- 关键数据延迟、模型低置信或安环红线接近时能自动降级。
- 收益仅统计被采纳且实际执行的方案。
"""
    write_text(DOCS / "optimization-roadmap.md", roadmap_md)

    feishu_md = f"""# 飞书协同与上线配置

飞书在本方案中承担协同执行层，而不是控制层。它负责把调度方案送到当班群、承载高风险负荷调整审批、沉淀班后复盘和未采纳原因，并为Aily问答提供知识入口。

## 作为解题模块的作用

| 命题痛点 | 飞书模块支撑 | 形成的企业资产 |
| --- | --- | --- |
| 调度寻优难 | Aily追问、Base复盘库和事件回调把历史采纳效果、未采纳原因、模型解释连接起来。 | 合成氨调度案例库、异常处置库、模型校准样本。 |
| 指挥效率低 | 互动卡片送达当班群，审批承接高风险调整，任务监督跟踪执行。 | 确认人、审批人、执行人、截止时间和关闭结果责任链。 |
| 知识传承难 | 多维表格沉淀班次事实、班长备注、执行偏差和收益归因，Aily基于授权知识源回答追问。 | 可复用、可审计、可迭代的班组经验资产。 |

## MVP能力

- 互动卡片：目标负荷、风险指数、触发约束、审批路径、回写范围、确认/驳回按钮。
- 审批：高风险负荷调整创建审批实例，审批通过后只写MES计划和复盘记录。
- 多维表格：班次事实、方案采纳、未采纳原因、执行偏差、周度校准状态。
- 任务：采纳方案后生成执行监督任务，核对实际负荷、库存变化、能耗窗口和班后复盘。
- 飞书AI：支持调度员追问方案理由、约束解释、设备护机策略和液氨库存风险；回答必须标注班次事实、设备趋势和规则来源，无依据时转人工复核。
- 事件回调：接收卡片点击、审批通过/驳回、任务关闭、复盘提交，并写入知识库。

## 已完成原型

- 飞书在线完整方案稿：`{FEISHU_DOC_URL}`
- 飞书 Base 调度复盘库原型：`{FEISHU_BASE_URL}`，现有13个字段和3条完整场景样例。
- 飞书任务清单：`{FEISHU_TASK_URL}`，用于执行监督、复盘补录和规则校准。
- 飞书护机场景执行任务：`https://applink.feishu.cn/client/todo/detail?guid=6e519bf6-1b28-4b90-b4e5-3a82fde9e1cb`，由调控师生成并分配给当前用户，包含压机复核、实际负荷与班末效果检查。

## 飞书AI回答与动作契约

- 回答顺序：先给结论，再列当前数值，随后说明安全边界、事实来源、责任人和复核时间。
- 允许动作：生成班组卡片、转执行任务、写入复盘草稿；高风险动作继续走人工审批。
- 知识来源：产供销全线事实表、MES订单、DCS摘要、设备趋势、调度复盘库和经批准的处置规则。
- 禁止事项：无来源编造现场数值、直接写DCS/SIS、绕过班长/主管确认、把市场自然波动计入系统收益。

## 特殊停机取舍

当流程无法维持连续时，飞书卡片不直接下达停机命令，而是列出停空分、停合成气轮机、停下游装置等备选方案的重启时间、废料损失、人员物料成本和影响范围。班长/主管审批通过后才进入MES计划摘要，执行结果写入Base复盘库，作为下一次同类场景的专家规则。

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
        build_feishu_module_doc(),
    ]
    for path in paths:
        print(path)


if __name__ == "__main__":
    main()
