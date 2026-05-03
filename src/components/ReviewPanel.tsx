import type { Answers, AnswerKey } from '../types';
import { SUPPLEMENT_VALUE } from '../types';
import { questions } from '../data/questions';

interface Props {
  answers: Answers;
  onEdit: (stepIndex: number) => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: boolean;
}

const labelMap: Record<AnswerKey, string> = {
  relationship: '关系',
  budget: '预算',
  gender: '性别',
  ageRange: '年龄段',
  occasion: '场合',
  knowDuration: '认识时长',
  interests: '兴趣爱好',
  personality: '性格类型',
  giftStyle: '礼物风格',
  restrictions: '特殊限制',
};

function getDisplayValue(key: AnswerKey, answers: Answers): string {
  const value = answers[key];
  const supp = answers.supplement?.[key]?.trim();

  // 预算类型：显示金额 + 浮动比例
  const q = questions.find((q) => q.id === key);
  if (q?.type === 'budget' && value) {
    const flex = answers.budgetFlexibility || '0';
    return `${value} ${q.budgetUnit ?? '元'}（浮动 ±${flex}%）`;
  }

  // 滑块类型：显示数值 + 单位
  if (q?.type === 'slider' && value) {
    return `${value} ${q.sliderUnit ?? ''}`;
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter((v) => v !== SUPPLEMENT_VALUE)
      .map((v) => {
        const opt = q?.options.find((o) => o.value === v);
        return opt?.label ?? v;
      });
    if (value.includes(SUPPLEMENT_VALUE) && supp) {
      parts.push(supp);
    } else if (supp) {
      parts.push(supp);
    }
    return parts.join('、') || '—';
  }

  if (value === SUPPLEMENT_VALUE) return supp || '—';
  return value || '—';
}

export default function ReviewPanel({ answers, onEdit, onConfirm, loading, error }: Props) {
  return (
    <div className="review-panel">
      <div className="review-header">
        <h2>确认信息</h2>
        <p>请检查以下信息，确认无误后点击生成推荐。也可点击任意项返回修改。</p>
      </div>

      <div className="review-grid">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="review-item"
            onClick={() => onEdit(idx)}
          >
            <span className="review-label">{labelMap[q.id]}</span>
            <span className="review-value">{getDisplayValue(q.id, answers)}</span>
            <span className="review-edit-hint">修改</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="api-error">
          AI 服务暂时不可用，请确认后端服务已启动（npm run dev:server）或稍后重试。
        </p>
      )}

      <button className="btn-primary btn-large" onClick={onConfirm} disabled={loading}>
        {loading ? 'AI 正在为你挑选...' : error ? '重新尝试' : '确认并生成推荐'}
      </button>
    </div>
  );
}
