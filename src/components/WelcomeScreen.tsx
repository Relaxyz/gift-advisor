import { useState } from 'react';
import type { HistoryItem } from '../types';

interface Props {
  onStart: () => void;
  history?: HistoryItem[];
  onLoadHistory?: (item: HistoryItem) => void;
}

const UNLIMITED_STORAGE_KEY = 'gift-advisor-unlimited-key';

function getSavedKey(): string {
  try {
    return localStorage.getItem(UNLIMITED_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export default function WelcomeScreen({ onStart, history = [], onLoadHistory }: Props) {
  const [showUnlimited, setShowUnlimited] = useState(false);
  const [unlimitedKey, setUnlimitedKey] = useState(getSavedKey);
  const [saved, setSaved] = useState(false);

  const handleSaveKey = () => {
    const trimmed = unlimitedKey.trim();
    if (trimmed) {
      localStorage.setItem(UNLIMITED_STORAGE_KEY, trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      localStorage.removeItem(UNLIMITED_STORAGE_KEY);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">礼物推荐</h1>
        <p className="welcome-subtitle">
          回答几个问题，AI 帮你找到最合适的礼物
        </p>
        <button className="btn-primary btn-large start-btn" onClick={onStart}>
          开始推荐
        </button>
      </div>

      {history.length > 0 && onLoadHistory && (
        <div className="history-section">
          <h3 className="history-title">最近推荐</h3>
          <div className="history-list">
            {history.map((item, index) => (
              <div
                key={index}
                className="history-item"
                onClick={() => onLoadHistory(item)}
              >
                <div className="history-info">
                  <span className="history-occasion">
                    {item.answers.occasion || '礼物推荐'}
                  </span>
                  <span className="history-time">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="history-gifts">
                  {item.gifts.slice(0, 3).map(g => g.name).join('、')}
                  {item.gifts.length > 3 && '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="unlimited-section">
        <button
          className="unlimited-toggle"
          onClick={() => setShowUnlimited(!showUnlimited)}
        >
          {showUnlimited ? '收起' : '解除限制'}
        </button>
        {showUnlimited && (
          <div className="unlimited-input-group">
            <input
              type="password"
              className="unlimited-input"
              placeholder="输入密钥以解除每小时次数限制…"
              value={unlimitedKey}
              onChange={(e) => setUnlimitedKey(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleSaveKey}>
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
