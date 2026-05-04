export type Step = 'welcome' | 'questionnaire' | 'review' | 'recommendation';

export interface Answers {
  relationship: string;
  budget: string;
  gender: string;
  ageRange: string;
  occasion: string;
  knowDuration: string;
  interests: string[];
  personality: string[];
  giftStyle: string;
  restrictions: string[];
  budgetFlexibility: string;
  supplement: Partial<Record<AnswerKey, string>>;
}

/** 选项值为该常量时表示用户选了"补充"并填写了自定义内容 */
export const SUPPLEMENT_VALUE = '__supplement__';

export type AnswerKey = keyof Answers;

export type QuestionType = 'single' | 'multi' | 'slider' | 'budget';

export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
}

export interface Question {
  id: AnswerKey;
  title: string;
  subtitle?: string;
  type: QuestionType;
  options: QuestionOption[];
  /** 该题不显示"补充"选项 */
  noSupplement?: boolean;
  /** 多选时允许空选（不选任何选项也是有效答案） */
  allowEmpty?: boolean;
  /** slider 类型配置 */
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderUnit?: string;
  /** budget 双滑块配置 */
  budgetMin?: number;
  budgetMax?: number;
  budgetStep?: number;
  budgetUnit?: string;
  flexMin?: number;
  flexMax?: number;
  flexStep?: number;
  flexUnit?: string;
}

export interface Gift {
  id: string;
  name: string;
  priceMin: number;
  priceMax: number;
  description: string;
  reason: string;
  searchKeywords: string;
}

export interface HistoryRecord {
  timestamp: number;
  answers: Answers;
  gifts: Gift[];
}
