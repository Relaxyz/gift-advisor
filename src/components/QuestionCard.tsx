import { useRef, useEffect, useState } from 'react';
import type { Question, AnswerKey, TagGroup } from '../types';
import { SUPPLEMENT_VALUE } from '../types';

interface Props {
  question: Question;
  value: string | string[];
  supplementText: string;
  onChange: (key: AnswerKey, value: string | string[]) => void;
  onSupplementChange: (key: AnswerKey, text: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isFirst: boolean;
  isLast: boolean;
  canProceed: boolean;
  isSingleEdit?: boolean;
  budgetFlexibility?: string;
  onBudgetFlexibilityChange?: (value: string) => void;
  // 混合题专用
  customText?: string;
  onCustomChange?: (key: AnswerKey, text: string) => void;
}

function isSelected(value: string | string[], optValue: string, isMulti: boolean): boolean {
  if (isMulti) return (value as string[]).includes(optValue);
  return value === optValue;
}

export default function QuestionCard({
  question,
  value,
  supplementText,
  onChange,
  onSupplementChange,
  onNext,
  onPrev,
  isFirst,
  isLast,
  canProceed,
  isSingleEdit,
  budgetFlexibility,
  onBudgetFlexibilityChange,
  customText,
  onCustomChange,
}: Props) {
  const isMulti = question.type === 'multi';
  const isSlider = question.type === 'slider';
  const isBudget = question.type === 'budget';
  const isText = question.type === 'text';
  const isTextarea = question.type === 'textarea';
  const isMixed = question.type === 'mixed';

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [localCustomText, setLocalCustomText] = useState(customText || '');

  const selectedArr = isMulti || isMixed ? (value as string[]) : [value as string];

  const hasSelection = isSlider || isBudget
    ? value !== ''
    : isText || isTextarea
      ? (value as string).trim() !== ''
      : isMulti || isMixed
        ? (value as string[]).length > 0 || supplementText.trim() !== '' || (customText?.trim() || '') !== ''
        : value !== '';

  const isSupplementSelected = isMulti
    ? selectedArr.includes(SUPPLEMENT_VALUE)
    : value === SUPPLEMENT_VALUE;

  useEffect(() => {
    if ((isText || isTextarea) && (inputRef.current || textareaRef.current)) {
      if (isTextarea) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [isText, isTextarea]);

  useEffect(() => {
    if (isSupplementSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSupplementSelected, isMulti]);

  const handleSelect = (optValue: string) => {
    if (isMulti || isMixed) {
      const current = (value as string[]) || [];
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      onChange(question.id, next);
      if (optValue === SUPPLEMENT_VALUE && current.includes(SUPPLEMENT_VALUE)) {
        onSupplementChange(question.id, '');
      }
    } else {
      if (value === optValue) {
        onChange(question.id, '');
        onSupplementChange(question.id, '');
      } else {
        onChange(question.id, optValue);
      }
    }
  };

  const handleSlider = (val: string) => {
    onChange(question.id, val);
  };

  const handleTextChange = (val: string) => {
    onChange(question.id, val);
  };

  const handleCustomTextChange = (val: string) => {
    setLocalCustomText(val);
    onCustomChange?.(question.id, val);
  };

  const getLabel = (optValue: string) =>
    question.options?.find((o) => o.value === optValue)?.label ?? optValue;

  const displayValue = (): string => {
    if (isBudget) {
      const flex = budgetFlexibility || '0';
      return `${value} ${question.budgetUnit ?? '元'}（浮动 ±${flex}%）`;
    }
    if (isSlider) {
      return `${value} ${question.sliderUnit ?? ''}`;
    }
    if (isText || isTextarea) {
      return (value as string) || '';
    }
    if (isMulti || isMixed) {
      const parts = (value as string[])
        .filter((v) => v !== SUPPLEMENT_VALUE)
        .map(getLabel);
      if (supplementText.trim()) {
        parts.push(supplementText.trim());
      }
      if (isMixed && localCustomText.trim()) {
        parts.push(localCustomText.trim());
      }
      return parts.join('、');
    }
    if (value === SUPPLEMENT_VALUE) return supplementText || '补充';
    return getLabel(value as string);
  };

  // 渲染标签组
  const renderTagGroups = () => {
    if (!question.tagGroups) return null;

    return question.tagGroups.map((group: TagGroup, groupIndex: number) => (
      <div key={groupIndex} className="tag-group">
        <div className="tag-group-title">{group.title}</div>
        <div className="options-grid">
          {group.tags.map((tag) => {
            const sel = isSelected(value, tag.value, true);
            return (
              <button
                key={tag.value}
                className={`option-btn ${sel ? 'selected' : ''}`}
                onClick={() => handleSelect(tag.value)}
              >
                {tag.icon && <span className="option-icon">{tag.icon}</span>}
                <span>{tag.label}</span>
                {sel && <span className="check-mark">&#10003;</span>}
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <div className="question-card">
      <div className="question-body">
        <h2 className="question-title">{question.title}</h2>
        {question.subtitle && (
          <p className="question-subtitle">{question.subtitle}</p>
        )}

        {/* ===== 预算双滑块 ===== */}
        {isBudget && (
          <div className="slider-container budget-slider">
            <div className="slider-value budget-amount">
              {value === '' ? '请选择预算' : `${value} ${question.budgetUnit ?? '元'}`}
            </div>
            <input
              type="range"
              className="slider-input"
              min={question.budgetMin ?? 50}
              max={question.budgetMax ?? 3000}
              step={question.budgetStep ?? 50}
              value={value === '' ? 500 : Number(value)}
              onChange={(e) => onChange(question.id, e.target.value)}
            />
            <div className="slider-range">
              <span>{question.budgetMin} {question.budgetUnit}</span>
              <span>{question.budgetMax} {question.budgetUnit}</span>
            </div>

            <div className="slider-value budget-flex">
              浮动比例：{budgetFlexibility || '0'}%
            </div>
            <input
              type="range"
              className="slider-input flex-slider"
              min={question.flexMin ?? 0}
              max={question.flexMax ?? 50}
              step={question.flexStep ?? 5}
              value={budgetFlexibility || '0'}
              onChange={(e) => onBudgetFlexibilityChange?.(e.target.value)}
            />
            <div className="slider-range">
              <span>{question.flexMin}%</span>
              <span>{question.flexMax}%</span>
            </div>
          </div>
        )}

        {/* ===== 滑块输入 ===== */}
        {isSlider && (
          <div className="slider-container">
            <div className="slider-value">
              {value === '' ? '请滑动选择' : `${value} ${question.sliderUnit ?? ''}`}
            </div>
            <input
              type="range"
              className="slider-input"
              min={question.sliderMin ?? 0}
              max={question.sliderMax ?? 100}
              step={question.sliderStep ?? 1}
              value={value === '' ? Math.floor((question.sliderMax ?? 100) / 2) : Number(value)}
              onChange={(e) => handleSlider(e.target.value)}
            />
            <div className="slider-range">
              <span>{question.sliderMin} {question.sliderUnit}</span>
              <span>{question.sliderMax} {question.sliderUnit}</span>
            </div>
          </div>
        )}

        {/* ===== 纯文本输入 ===== */}
        {isText && (
          <div className="text-input-container">
            <input
              ref={inputRef}
              type="text"
              className="text-input"
              placeholder={question.placeholder || '请输入...'}
              value={value as string}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canProceed) {
                  onNext();
                }
              }}
            />
          </div>
        )}

        {/* ===== 多行文本输入 ===== */}
        {isTextarea && (
          <div className="textarea-container">
            <textarea
              ref={textareaRef}
              className="textarea-input"
              placeholder={question.placeholder || '请输入...'}
              value={value as string}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
            />
          </div>
        )}

        {/* ===== 混合题（标签组 + 自由输入） ===== */}
        {isMixed && (
          <div className="mixed-container">
            {renderTagGroups()}

            {question.allowFreeInput && (
              <div className="free-input-section">
                <div className="free-input-label">补充说明</div>
                <input
                  type="text"
                  className="text-input"
                  placeholder={question.freeInputPlaceholder || '补充其他信息...'}
                  value={localCustomText}
                  onChange={(e) => handleCustomTextChange(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* ===== 选项按钮（普通多选/单选） ===== */}
        {!isSlider && !isBudget && !isText && !isTextarea && !isMixed && (
          <div className="options-grid">
            {question.options?.map((opt) => {
              const sel = isSelected(value, opt.value, isMulti);
              return (
                <button
                  key={opt.value}
                  className={`option-btn ${sel ? 'selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.icon && <span className="option-icon">{opt.icon}</span>}
                  <span>{opt.label}</span>
                  {sel && <span className="check-mark">&#10003;</span>}
                </button>
              );
            })}

            {!question.noSupplement && (
              <button
                className={`option-btn supplement-btn ${isSupplementSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(SUPPLEMENT_VALUE)}
              >
                <span className="option-icon">✏️</span>
                <span>补充（自行填写）</span>
                {isSupplementSelected && <span className="check-mark">&#10003;</span>}
              </button>
            )}
          </div>
        )}

        {isSupplementSelected && (
          <input
            ref={inputRef}
            type="text"
            className="supplement-input"
            placeholder={isMulti ? '输入你想补充的兴趣或偏好...' : '输入你的答案...'}
            value={supplementText}
            onChange={(e) => onSupplementChange(question.id, e.target.value)}
          />
        )}

        {hasSelection && !isText && !isTextarea && (
          <div className="selected-answer">
            <span className="selected-label">你的选择：</span>
            <span className="selected-value">{displayValue()}</span>
          </div>
        )}
      </div>

      <div className="question-actions">
        <button
          className="btn-primary"
          disabled={!canProceed}
          onClick={onNext}
        >
          {isSingleEdit ? '保存' : isLast ? '完成' : '下一题'}
        </button>
        {!isFirst && !isSingleEdit && (
          <button className="btn-secondary" onClick={onPrev}>
            上一题
          </button>
        )}
        {isSingleEdit && (
          <button className="btn-secondary" onClick={onPrev}>
            返回确认页
          </button>
        )}
      </div>
    </div>
  );
}
