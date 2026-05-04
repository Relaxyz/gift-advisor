import type { Gift, Answers, Question } from '../types';
import { SUPPLEMENT_VALUE } from '../types';

interface Props {
  gifts: Gift[];
  answers: Answers;
  activeQuestions: Question[];
  onRestart: () => void;
  onBack: () => void;
}

function formatPrice(min: number, max: number) {
  if (max >= 9999) return `${min}+ 元`;
  return `约 ¥${min} - ¥${max}`;
}

const labelMap: Record<string, string> = {
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

function getDisplayValue(key: string, answers: Answers, allQuestions: Question[]): string {
  const value = answers[key as keyof Answers];
  const supp = answers.supplement?.[key as keyof Answers]?.trim();
  const q = allQuestions.find((q) => q.id === key);

  if (q?.type === 'budget' && value) {
    const flex = answers.budgetFlexibility || '0';
    return `${value} ${q.budgetUnit ?? '元'}（浮动 ±${flex}%）`;
  }
  if (q?.type === 'slider' && value) {
    return `${value} ${q.sliderUnit ?? ''}`;
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter((v: string) => v !== SUPPLEMENT_VALUE)
      .map((v: string) => q?.options.find((o) => o.value === v)?.label ?? v);
    if (supp) parts.push(supp);
    return parts.join('、') || '—';
  }

  if (value === SUPPLEMENT_VALUE) return supp || '—';
  return String(value || '—');
}

function exportMarkdown(gifts: Gift[], answers: Answers, activeQuestions: Question[]): string {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const filterRows = activeQuestions
    .map((q) => `| ${labelMap[q.id] ?? q.id} | ${getDisplayValue(q.id, answers, activeQuestions)} |`)
    .join('\n');

  const giftBlocks = gifts
    .map((g, i) => {
      const rank = i === 0 ? '⭐ 首选' : `#${i + 1}`;
      return `### ${rank} ${g.name}

- **价格**：${formatPrice(g.priceMin, g.priceMax)}
- **介绍**：${g.description}
- **推荐理由**：${g.reason}
- 🔍 **搜索关键词**：\`${g.searchKeywords}\`
`;
    })
    .join('\n');

  return `# 礼物推荐结果

> 生成时间：${time}

## 筛选条件

| 问题 | 答案 |
|------|------|
${filterRows}

## 推荐方案

${giftBlocks}
`;
}

export default function RecommendationCard({ gifts, answers, activeQuestions, onRestart, onBack }: Props) {
  const handleExport = () => {
    const md = exportMarkdown(gifts, answers, activeQuestions);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '礼物推荐结果.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="recommendation-section">
      <div className="rec-header">
        <h2>为你推荐</h2>
        <p>AI 综合你的答案，为你量身推荐以下礼物</p>
      </div>

      {gifts.length === 0 && (
        <div className="rec-empty">
          <p>没有找到完全匹配的礼物，试试调整你的条件？</p>
          <button className="btn-secondary" onClick={onBack}>
            返回修改
          </button>
        </div>
      )}

      <div className="rec-list">
        {gifts.map((gift, idx) => (
          <div key={gift.id} className={`gift-card rank-${idx + 1}`}>
            <div className="gift-rank">
              {idx === 0 ? '⭐' : `#${idx + 1}`}
            </div>
            <div className="gift-content">
              <div className="gift-header">
                <h3>{gift.name}</h3>
                <span className="gift-price">{formatPrice(gift.priceMin, gift.priceMax)}</span>
              </div>
              <p className="gift-desc">{gift.description}</p>
              <p className="gift-reason">
                <span className="reason-icon">💡</span>
                {gift.reason}
              </p>
              <div
                className="search-keywords"
                title="点击复制搜索关键词"
                onClick={() => {
                  navigator.clipboard.writeText(gift.searchKeywords);
                }}
              >
                <span className="search-icon">🔍</span>
                <span className="search-text">搜「{gift.searchKeywords}」</span>
                <span className="search-copy-hint">点击复制</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rec-actions">
        <button className="btn-secondary" onClick={onBack}>
          返回修改条件
        </button>
        <button className="btn-secondary" onClick={handleExport}>
          导出结果 (.md)
        </button>
        <button className="btn-primary" onClick={onRestart}>
          重新开始
        </button>
      </div>
    </div>
  );
}
