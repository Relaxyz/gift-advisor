import type { Answers, AnswerKey, Question } from '../types';
import { SUPPLEMENT_VALUE } from '../types';

interface Props {
  answers: Answers;
  activeQuestions: Question[];
  onEdit: (qId: AnswerKey) => void;
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

function getDisplayValue(key: AnswerKey, answers: Answers, allQuestions: Question[]): string {
  const value = answers[key];
  const supp = answers.supplement?.[key]?.trim();
  const q = allQuestions.find((q) => q.id === key);

  // 预算类型：显示金额 + 浮动比例
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

function exportMarkdown(answers: Answers, activeQuestions: Question[]): string {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rows = activeQuestions
    .map((q) => `| ${labelMap[q.id]} | ${getDisplayValue(q.id, answers, activeQuestions)} |`)
    .join('\n');

  return `# 礼物推荐问卷

> 生成时间：${time}

| 问题 | 答案 |
|------|------|
${rows}
`;
}

export default function ReviewPanel({ answers, activeQuestions, onEdit, onConfirm, loading, error }: Props) {
  const handleExport = () => {
    const md = exportMarkdown(answers, activeQuestions);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '礼物推荐问卷.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="review-panel">
      <div className="review-header">
        <h2>确认信息</h2>
        <p>请检查以下信息，确认无误后点击生成推荐。也可点击任意项返回修改。</p>
      </div>

      <div className="review-grid">
        {activeQuestions.map((q) => (
          <div
            key={q.id}
            className="review-item"
            onClick={() => onEdit(q.id)}
          >
            <span className="review-label">{labelMap[q.id]}</span>
            <span className="review-value">{getDisplayValue(q.id, answers, activeQuestions)}</span>
            <span className="review-edit-hint">修改</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="api-error">
          AI 服务暂时不可用，请确认后端服务已启动（npm run dev:server）或稍后重试。
        </p>
      )}

      <div className="review-actions">
        <button className="btn-primary btn-large" onClick={onConfirm} disabled={loading}>
          {loading ? 'AI 正在为你挑选...' : error ? '重新尝试' : '确认并生成推荐'}
        </button>
        <button className="btn-secondary" onClick={handleExport}>
          导出问卷 (.md)
        </button>
      </div>
    </div>
  );
}
