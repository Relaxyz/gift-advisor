import type { Gift } from '../types';

interface Props {
  gifts: Gift[];
  onRestart: () => void;
}

function formatPrice(min: number, max: number) {
  if (max >= 9999) return `${min}+ 元`;
  return `约 ¥${min} - ¥${max}`;
}

function exportMarkdown(gifts: Gift[]): string {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

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

## 推荐方案

${giftBlocks}
`;
}

export default function RecommendationCard({ gifts, onRestart }: Props) {
  const handleExport = () => {
    const md = exportMarkdown(gifts);
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
