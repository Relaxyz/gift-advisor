import type { Answers, AnswerKey, Question } from '../types';
import { SUPPLEMENT_VALUE } from '../types';

interface Props {
  answers: Answers;
  questions: Question[];
  onEdit: (index: number) => void;
  onSubmit: () => void;
  onRestart: () => void;
  loading?: boolean;
}

const labelMap: Partial<Record<AnswerKey, string>> = {
  relationship: '关系',
  budget: '预算',
  ageRange: '年龄',
  occasion: '场合',
  specificWants: '具体想法',
  interests: '兴趣性格',
  exclusions: '排除偏好',
  additionalNotes: '补充说明',
};

function getDisplayValue(q: Question, answers: Answers): string {
  const key = q.id;
  const value = answers[key as keyof Answers];

  // 预算类型
  if (q.type === 'budget' && value) {
    const flex = answers.budgetFlexibility || '0';
    return `${value} ${q.budgetUnit ?? '元'}（浮动 ±${flex}%）`;
  }

  // 滑块类型
  if (q.type === 'slider' && value) {
    return `${value} ${q.sliderUnit ?? ''}`;
  }

  // 文本类型
  if (q.type === 'text' || q.type === 'textarea') {
    return (value as string) || '—';
  }

  // 混合类型
  if (q.type === 'mixed') {
    const arr = value as string[];
    const parts: string[] = [];

    if (Array.isArray(arr)) {
      // 从标签组中获取标签标签
      const allTags = q.tagGroups?.flatMap(g => g.tags) || [];
      parts.push(...arr.map(v => {
        const tag = allTags.find(t => t.value === v);
        return tag?.label || v;
      }));
    }

    // 添加自由输入
    if (key === 'interests' && answers.interestsCustom?.trim()) {
      parts.push(answers.interestsCustom);
    }
    if (key === 'exclusions' && answers.exclusionsCustom?.trim()) {
      parts.push(answers.exclusionsCustom);
    }

    return parts.length > 0 ? parts.join('、') : '—';
  }

  // 数组类型
  if (Array.isArray(value)) {
    const parts = value
      .filter((v) => v !== SUPPLEMENT_VALUE)
      .map((v) => {
        const opt = q.options?.find((o) => o.value === v);
        return opt?.label ?? v;
      });
    const supp = answers.supplement?.[key]?.trim();
    if (supp) parts.push(supp);
    return parts.join('、') || '—';
  }

  // 单选类型
  if (value === SUPPLEMENT_VALUE) {
    return answers.supplement?.[key]?.trim() || '—';
  }

  const opt = q.options?.find((o) => o.value === value);
  return (opt?.label ?? (value as string)) || '—';
}

function exportMarkdown(answers: Answers, questions: Question[]): string {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rows = questions
    .map((q) => {
      const label = labelMap[q.id] ?? q.title;
      const value = getDisplayValue(q, answers);
      return `| ${label} | ${value} |`;
    })
    .join('\n');

  return `# 礼物推荐问卷

> 生成时间：${time}

| 问题 | 答案 |
|------|------|
${rows}
`;
}

export default function ReviewPanel({ answers, questions, onEdit, onSubmit, onRestart, loading }: Props) {
  const handleExport = () => {
    const md = exportMarkdown(answers, questions);
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
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="review-item"
            onClick={() => onEdit(index)}
          >
            <span className="review-label">{labelMap[q.id] || q.title}</span>
            <span className="review-value">{getDisplayValue(q, answers)}</span>
            <span className="review-edit-hint">修改</span>
          </div>
        ))}
      </div>

      <div className="review-actions">
        <button
          className="btn-primary btn-large"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? 'AI 正在挑选...' : '确认并生成推荐'}
        </button>
        <div className="review-actions-row">
          <button className="btn-secondary" onClick={handleExport}>
            导出问卷 (.md)
          </button>
          <button className="btn-secondary" onClick={onRestart}>
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
