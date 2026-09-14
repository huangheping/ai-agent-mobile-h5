// Web skill names with local Mock descriptions for long-content previews.
export const plans = [
  {
    id: "hongkong-fna",
    name: "香港保险FNA问卷生成与产品配置方案",
    originalName: "香港保险FNA问卷生成与产品配置方案",
    category: "香港保险",
    description:
      "香港保险 FNA（财务需求分析）问卷生成与产品配置方案。参考香港保监局 IA Guideline 30（GL30）框架，整理 KYC 问卷、风险测评、客户分型、场景化产品配置、快速决策指引、错配风险提醒与中介人检查清单。可围绕保障目标、预算、家庭责任、现有保单及长期现金流需求补充资料，逐项确认信息完整性。",
    prompt: "请补充保障目标、年度预算和现有保障情况。",
    mock: true,
  },
  {
    id: "bermuda-fna",
    name: "百慕大-离岸保险 FNA（财务需求分析）问卷与产品配置",
    originalName: "百慕大-离岸保险 FNA（财务需求分析）问卷与产品配置",
    category: "离岸保险",
    description:
      "百慕大 / 离岸保险 FNA（财务需求分析）问卷与产品配置。在香港 GL30 FNA 框架基础上，结合百慕大及离岸保单、信托与 BVI 公司资产隔离场景，整理甲至戊部 FNA 表单、不同产品品类的填写指引，以及储蓄、IUL、终身寿险的需求匹配说明。包含待确认资料、配置思路、风险提醒和错配处理要点。",
    prompt: "请补充规划目标、意向地区与预算。",
    mock: true,
  },
  {
    id: "usa-insurance-ppt",
    name: "美国保险配置方案PPT V1.2",
    originalName: "美国保险配置方案PPT（中国客户专用）",
    category: "美国保险",
    description:
      "生成美国保险配置方案 PPT（中国客户专用）。基于 FNA 架构，先梳理需求和 US Tie 美国关联性资格，再整理产品品类、保司与选型理由。参考网页列出的 Symetra / National Life / Lincoln / John Hancock / Allianz / Prudential / MassMutual，以及 IUL 储蓄、IUL 保障、SIUL 夫妻联保、年金、Whole Life、VUL 等品类。",
    prompt: "请补充投保目标、预算与计划使用场景。",
    mock: true,
  },
  {
    id: "singapore-insurance",
    name: "新加坡保险计划书对比分析方案",
    originalName: "新加坡保险计划书对比分析方案",
    category: "新加坡保险",
    description:
      "Generate, review, and normalize Singapore IUL and life insurance PI/BI/proposal comparison workbooks. 按统一口径整理基本投保信息、缴费期限、不同年度的现金价值、保证与非保证利益、身故赔偿、提取安排，以及需要补充确认的条款。对照多份资料输出差异清单，保留原币种、原始字段和未确认项。",
    prompt: "请补充需要比较的项目与关注重点。",
    mock: true,
  },
  {
    id: "glory-insurance-insight",
    name: "GLORY国内保险方向洞察",
    originalName: "GLORY国内保险方向洞察",
    category: "需求分析",
    description:
      "基于客户 KYC、明确需求、资产所在地、生活重心、税务与身份背景、医疗及现金流需求或既有保单，梳理国内保险、香港保险、美国保险、新加坡保险及综合保险方向。用于内部方向洞察和 RM 沟通准备，列出下一步需要核对的信息，不输出最终产品、税务、法律、合规或核保结论。",
    prompt: "请补充家庭情况、已有保障与希望解决的问题。",
    mock: true,
  },
  {
    id: "glory-pre-meeting",
    name: "GLORY港险业务-新客户陪访「见客前备课」助手",
    originalName: "GLORY港险业务-新客户陪访「见客前备课」助手",
    category: "方案与分析",
    description:
      "结合宏观资讯、机构观点、客户 KYC 与配置需求，按“选题 → 破冰准备 → 需求提问 → 待补充资料 → 会后行动”整理见客前备课内容。帮助经纪人准备可讨论的话题、梳理客户可能关注的问题，并形成便于投屏、打印和分享的单页报告结构。可继续补充不同家庭成员、不同预算和不同时间安排的差异。",
    prompt: "请补充规划目标、相关背景和希望重点分析的问题。",
    mock: true,
  },
  {
    id: "glory-identity-training",
    name: "GLORY身份规划顾问-内部方案训练工作台",
    originalName: "GLORY身份规划顾问-内部方案训练工作台",
    category: "方案与分析",
    description:
      "面向身份 RM 内部训练，覆盖客户需求识别、身份产品匹配、客户诊断、方案对比、合规扫描、存续提醒与业务联动等场景。可围绕华侨生联考、投资移民、黄金签证、香港身份、新加坡 EP、优才计划及高才通等主题，整理问答与待核实事项。",
    prompt: "请补充规划目标、相关背景和希望重点分析的问题。",
    mock: true,
  },
  {
    id: "glory-identity-planning",
    name: "GLORY身份规划顾问-对客场景全链路规划方案",
    originalName: "GLORY身份规划顾问-对客场景全链路规划方案",
    category: "方案与分析",
    description:
      "面向渠道对客场景，按 KYC 信息整理、A/B/C 方案比较、业务机会提示、对客展示、知识库查阅和风险提示串联规划步骤。参考美国 EB-5、香港、希腊、葡萄牙、塞浦路斯、新加坡、阿联酋、新西兰及加勒比地区等不同场景，展示目标、时间、预算和家庭成员安排之间的差异，以及后续需要专业复核的信息。",
    prompt: "请补充规划目标、相关背景和希望重点分析的问题。",
    mock: true,
  },
  {
    id: "ark-trust-matching",
    name: "方舟信托方案智能匹配引擎V2",
    originalName: "方舟信托方案智能匹配引擎V2",
    category: "方案与分析",
    description:
      "参考方舟信托（ARK TRUST）香港 / 新加坡结构化问卷场景，整理保险金备用信托、保单信托、权利保留信托、外国委托人信托（FGT）、加拿大祖母信托及员工福利信托（EBT）的需求匹配路径。包含资料清单、待确认条件、报价查询结构、CRS 说明和免责声明位置。",
    prompt: "请补充规划目标、相关背景和希望重点分析的问题。",
    mock: true,
  },
  {
    id: "singapore-fna",
    name: "新加坡保险配置方案 Skill",
    originalName: "新加坡保险配置方案 Skill",
    category: "方案与分析",
    description:
      "基于 Financial Needs Analysis（FNA）整理保障目标、家庭责任、收入支出、现有保单和可持续预算，形成待补充信息清单与方案沟通框架。",
    prompt: "请补充规划目标、相关背景和希望重点分析的问题。",
    mock: true,
  },
];

export const comparison = {
  title: "三份方案对比",
  columns: [
    "对比项目",
    "方案 A · 基础保障",
    "方案 B · 家庭保障",
    "方案 C · 综合保障",
    "需要进一步确认",
  ],
  rows: [
    [
      "规划侧重",
      "优先覆盖基础需求",
      "兼顾家庭成员需求",
      "结合长期规划目标",
      "与实际需求逐项核对",
    ],
    [
      "保障范围",
      "基础医疗及意外",
      "医疗、意外及寿险",
      "医疗、寿险及长期安排",
      "以正式条款为准",
    ],
    ["年度预算", "待补充", "待补充", "待补充", "确认可持续投入范围"],
    [
      "缴费安排",
      "待核对计划书",
      "待核对计划书",
      "待核对计划书",
      "逐年列明缴费责任",
    ],
    [
      "保障期限",
      "待核对合同",
      "待核对合同",
      "待核对合同",
      "核对到期及续保安排",
    ],
    ["已有保障", "需梳理", "需梳理", "需梳理", "排查重叠与缺口"],
    [
      "免责与限制",
      "待核对条款",
      "待核对条款",
      "待核对条款",
      "单独列出限制条件",
    ],
    ["受益安排", "待确认", "待确认", "待确认", "以实际意愿及合同为准"],
    [
      "下一步",
      "补齐基础资料",
      "梳理家庭需求",
      "明确长期目标",
      "由顾问复核后完善方案",
    ],
  ],
};

export function createReply({ text, planId, files = [] }) {
  const plan = plans.find((item) => item.id === planId);
  if (!files.length && /pdf|word|excel|演示文件|示例文件|生成文件|导出|下载/i.test(text))
    return {
      text: "已为你准备三份演示文件：PDF 适合查看完整分页，Word 方便阅读和后续编辑，Excel 用于逐项对比与整理资料。\n\n点击下方文件即可预览，也可以下载原文件。内容均为虚构示例。",
      documents: ["demo-pdf", "demo-word", "demo-excel"],
      suggestions: ["对比三份方案", "整理沟通要点"],
    };
  if (files.length)
    return {
      text: `已将 ${files.length} 个附件加入本次演示对话。\n\n此样板没有上传或解析文件，也不会读取其中内容。接入真实服务后，可在这里展示解析进度、结果与重试操作。\n\n你可以继续补充希望分析的重点，或输入“对比三份方案”体验宽表格。`,
      suggestions: ["对比三份方案"],
    };
  if (/对比|表格|比较/.test(text))
    return {
      text: "可以。先按同一组项目整理三份方案，方便逐项核对。\n\n下面展示的是对比结构示例，不对应真实保险产品，也不代表产品推荐。预算、期限和条款信息需要根据实际资料补齐。",
      table: comparison,
      after:
        "建议先核对保障范围、预算与已有保障，再补齐计划书信息。左右滑动查看各列，也可以展开表格查看完整内容。",
      documents: ["demo-excel"],
      suggestions: ["还需要补充哪些资料？", "查看演示文件"],
    };
  if (plan)
    return {
      text: `已选择「${plan.name}」。\n\n我们可以先把需求梳理清楚，再整理方案内容。\n\n${plan.prompt}\n\n你可以直接输入这些信息，无需先选择客户。这个样板演示对话流程，暂不生成正式方案文件。`,
      documents: ["demo-pdf", "demo-word", "demo-excel"],
      suggestions: ["对比三份方案", "还需要补充哪些资料？"],
    };
  if (/沟通|整理|要点/.test(text))
    return {
      text: "可以先按三个部分整理，便于会后补充。\n\n1. 沟通目标\n记录本次希望解决的问题，以及对方最关注的事项。\n\n2. 已确认的信息\n整理预算、时间安排、现有保障和明确表达的意愿。\n\n3. 下一步\n列出待补充资料、待核对事项和后续沟通时间。\n\n这是演示整理框架，不会写入客户档案。你可以继续补充实际沟通内容。",
      suggestions: ["还需要补充哪些资料？", "对比三份方案"],
    };
  if (/资料|补充/.test(text))
    return {
      text: "可以先准备以下信息：\n\n1. 这次希望解决的主要问题。\n2. 已有保障和希望保留的安排。\n3. 预算范围与计划时间。\n4. 希望重点比较的条款或项目。\n\n不确定的内容可以先留空。你可以直接描述需求，再选择合适的方案。",
      suggestions: ["对比三份方案"],
    };
  return {
    text: "收到你的问题。当前是独立 H5 交互样板，以下为本地模拟回复。\n\n你可以选择一种方案并补充需求，也可以体验方案对比表格、整理沟通要点。每次对话都会保留在当前浏览器，便于从历史会话继续。\n\n试试输入“对比三份方案”，查看宽表格在手机上的展示。",
    suggestions: ["对比三份方案", "查看演示文件"],
  };
}
