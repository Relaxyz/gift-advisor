import { useState } from 'react';
import type { Gift, FilterQuestion } from '../types';

interface Props {
  candidates: Gift[];
  onConfirm: (selectedIds: string[]) => void;
  filterQuestion?: FilterQuestion;
  onFilterAnswer?: (answer: string) => void;
  loading?: boolean;
}

export default function CandidateFilter({
  candidates,
  onConfirm,
  filterQuestion,
  onFilterAnswer,
  loading,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterAnswer, setFilterAnswer] = useState<string>('');

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    if (filterQuestion) {
      // 第二轮筛选：回答问题
      if (filterAnswer && onFilterAnswer) {
        onFilterAnswer(filterAnswer);
      }
    } else {
      // 第一轮筛选：确认勾选
      onConfirm(Array.from(selectedIds));
    }
  };

  if (loading) {
    return (
      <div className="candidate-filter loading">
        <div className="loading-spinner"></div>
        <p>AI 正在精选中...</p>
      </div>
    );
  }

  // 第二轮筛选：AI生成的筛选问题
  if (filterQuestion) {
    return (
      <div className="candidate-filter filter-question-phase">
        <h2 className="filter-title">还有一个问题</h2>
        <p className="filter-subtitle">帮助 AI 更好地为你精选</p>

        <div className="filter-question-box">
          <p className="question-text">{filterQuestion.question}</p>
          <div className="filter-options">
            {filterQuestion.options.map((option, index) => (
              <button
                key={index}
                className={`filter-option-btn ${filterAnswer === option ? 'selected' : ''}`}
                onClick={() => setFilterAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="btn-primary"
            disabled={!filterAnswer}
            onClick={handleConfirm}
          >
            确定：AI 精选
          </button>
          <button
            className="btn-skip"
            onClick={() => onConfirm(Array.from(selectedIds))}
          >
            跳过，直接看结果
          </button>
        </div>
      </div>
    );
  }

  // 第一轮筛选：勾选候选礼物
  return (
    <div className="candidate-filter">
      <h2 className="filter-title">选择你感兴趣的</h2>
      <p className="filter-subtitle">
        勾选你想 further 了解的礼物，AI 会帮你精选
        {selectedIds.size > 0 && (
          <span className="selection-count">（已选 {selectedIds.size} 个）</span>
        )}
      </p>

      <div className="candidates-grid">
        {candidates.map((gift) => (
          <div
            key={gift.id}
            className={`candidate-card ${selectedIds.has(gift.id) ? 'selected' : ''}`}
            onClick={() => toggleSelect(gift.id)}
          >
            <div className="card-checkbox">
              {selectedIds.has(gift.id) ? '☑' : '☐'}
            </div>
            <div className="card-content">
              <h3 className="card-name">{gift.name}</h3>
              <p className="card-price">
                ¥{gift.priceMin} - ¥{gift.priceMax}
              </p>
              <p className="card-desc">{gift.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <button
          className="btn-primary"
          disabled={selectedIds.size === 0}
          onClick={handleConfirm}
        >
          下一步：AI 精选 {selectedIds.size > 0 && `(${selectedIds.size}个)`}
        </button>
        <button
          className="btn-skip"
          onClick={() => onConfirm(candidates.map(g => g.id))}
        >
          全部保留，直接看结果
        </button>
      </div>
    </div>
  );
}
