import type { HistoryItem } from '../types';

interface Props {
  onStart: () => void;
  history?: HistoryItem[];
  onLoadHistory?: (item: HistoryItem) => void;
}

export default function WelcomeScreen({ onStart, history = [], onLoadHistory }: Props) {
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
    </div>
  );
}
