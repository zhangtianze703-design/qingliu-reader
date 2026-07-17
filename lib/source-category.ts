export const SOURCE_CATEGORIES = [
  { value: "ai", label: "AI" },
  { value: "investment", label: "投资" },
  { value: "gaming", label: "游戏" },
  { value: "technology", label: "技术" },
  { value: "business", label: "商业" },
  { value: "product", label: "产品" },
] as const;

export type SourceCategory = (typeof SOURCE_CATEGORIES)[number]["value"];

export function isSourceCategory(value: unknown): value is SourceCategory {
  return SOURCE_CATEGORIES.some((category) => category.value === value);
}

export function sourceCategoryLabel(value: SourceCategory | null | undefined) {
  return SOURCE_CATEGORIES.find((category) => category.value === value)?.label || "商业";
}

const SOURCE_NAME_RULES: Array<[RegExp, SourceCategory]> = [
  [/openai|anthropic|deepmind|hugging\s*face|数字生命|机器之心|量子位|新智元|ai沃茨|知识猫图解/i, "ai"],
  [/雪球|华尔街见闻|投资|财经|证券|基金|巴菲特|芒格|g1en/i, "investment"],
  [/游戏葡萄|触乐|机核|游研社|游戏研究社|ign|gamespot/i, "gaming"],
  [/阮一峰|少数派|掘金|infoq|github|linux|技术周刊|奇舞周刊/i, "technology"],
  [/36氪|虎嗅|晚点|创业邦|钛媒体|界面新闻|商业周刊/i, "business"],
  [/人人都是产品经理|产品沉思录|增长黑客|ux|ui中国|设计周刊/i, "product"],
];

const CONTENT_KEYWORDS: Record<SourceCategory, string[]> = {
  ai: ["ai", "人工智能", "大模型", "模型", "agent", "智能体", "chatgpt", "claude", "codex", "prompt", "openai", "anthropic", "deepmind"],
  investment: ["投资", "股票", "股市", "行情", "市场", "财报", "估值", "基金", "证券", "交易", "波动率", "牛市", "熊市", "美股", "港股", "a股"],
  gaming: ["游戏", "玩家", "主机", "电竞", "手游", "steam", "任天堂", "索尼", "xbox", "发行商", "游戏开发"],
  technology: ["编程", "代码", "开发", "工程", "开源", "数据库", "前端", "后端", "架构", "安全", "漏洞", "github", "linux", "api"],
  business: ["商业", "创业", "公司", "企业", "融资", "并购", "营收", "品牌", "营销", "管理", "行业", "经济", "消费"],
  product: ["产品", "设计", "用户", "体验", "交互", "增长", "需求", "运营", "ux", "ui", "原型", "工作流"],
};

function containsKeyword(text: string, keyword: string) {
  if (!/^[a-z0-9]+$/i.test(keyword)) return text.includes(keyword);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

export function inferSourceCategory(name: string, titles: string[] = []): SourceCategory {
  const cleanName = name.trim();
  for (const [pattern, category] of SOURCE_NAME_RULES) {
    if (pattern.test(cleanName)) return category;
  }

  const text = `${cleanName} ${titles.join(" ")}`.toLocaleLowerCase("zh-CN");
  const scores = SOURCE_CATEGORIES.map(({ value }) => ({
    value,
    score: CONTENT_KEYWORDS[value].reduce((total, keyword) => total + (containsKeyword(text, keyword) ? 1 : 0), 0),
  })).sort((left, right) => right.score - left.score);

  return scores[0]?.score ? scores[0].value : "business";
}
