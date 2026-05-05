// 问题类型
export type QuestionType = 'single' | 'multi' | 'slider' | 'budget' | 'text' | 'textarea' | 'mixed';

// 性格标签和兴趣标签分组
export interface TagGroup {
  title: string;
  tags: { value: string; label: string; icon?: string }[];
}

// 问题选项
export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
}

// 问题定义
export interface Question {
  id: AnswerKey;
  title: string;
  subtitle?: string;
  type: QuestionType;
  options?: QuestionOption[];
  // 滑块相关
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderUnit?: string;
  // 预算相关
  budgetMin?: number;
  budgetMax?: number;
  budgetStep?: number;
  budgetUnit?: string;
  flexMin?: number;
  flexMax?: number;
  flexStep?: number;
  // 混合题相关
  tagGroups?: TagGroup[];
  allowFreeInput?: boolean;
  freeInputPlaceholder?: string;
  // 通用
  allowEmpty?: boolean;
  noSupplement?: boolean;
  placeholder?: string;
}

// 答案键名
export type AnswerKey =
  | 'relationship'
  | 'budget'
  | 'gender'
  | 'ageRange'
  | 'occasion'
  | 'knowDuration'
  | 'interests'
  | 'personality'
  | 'giftStyle'
  | 'restrictions'
  // 新增字段
  | 'specificWants'
  | 'interestsCustom'
  | 'personalityCustom'
  | 'exclusions'
  | 'exclusionsCustom'
  | 'additionalNotes'
  | 'budgetFlexibility'
  | 'supplement';

// 补充值常量
export const SUPPLEMENT_VALUE = '__supplement__';

// 新的答案类型
export interface Answers {
  // === 基础层 ===
  relationship: string;
  budget: string;
  budgetFlexibility: string;
  ageRange: string;
  occasion: string;

  // === 偏好层 ===
  specificWants?: string;         // 具体想要什么（填空）
  interests: string[];            // 兴趣标签
  interestsCustom?: string;       // 兴趣自由输入
  personality: string[];          // 性格标签
  personalityCustom?: string;     // 性格自由输入

  // === 排除层 ===
  exclusions: string[];           // 排除标签
  exclusionsCustom?: string;      // 排除自由输入（含送过的礼物）

  // === 补充层 ===
  additionalNotes?: string;       // 额外说明

  // === 保留兼容 ===
  gender: string;
  knowDuration: string;
  giftStyle: string[];
  restrictions: string[];
  supplement: Partial<Record<AnswerKey, string>>;
}

// 礼物
export interface Gift {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string;
  reason: string;
  searchKeywords: string;
}

// 筛选问题
export interface FilterQuestion {
  question: string;
  options: string[];
}

// API响应阶段
export type RecommendPhase = 'candidates' | 'filter-question' | 'final';

// API响应
export interface RecommendResponse {
  phase: RecommendPhase;
  candidates?: Gift[];
  filterQuestion?: FilterQuestion;
  finalGifts?: Gift[];
}

// API请求
export interface RecommendRequest {
  answers: Answers;
  candidates?: Gift[];
  selectedCandidates?: string[];
  secondRoundAnswer?: string;
}

// 历史记录
export interface HistoryItem {
  timestamp: string;
  answers: Answers;
  candidates?: Gift[];
  gifts: Gift[];
}
