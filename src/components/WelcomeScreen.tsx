import type { HistoryRecord } from '../types';

interface Props {
  onStart: () => void;
  history: HistoryRecord[];
  onHistorySelect: (record: HistoryRecord) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

function summary(record: HistoryRecord): string {
  const r = record.answers.relationship;
  const b = record.answers.budget;
  const top = record.gifts[0]?.name ?? '';
  return `${r ? r : '?'} | ¥${b || '?'} — ${top}`;
}

export default function WelcomeScreen({ onStart, history, onHistorySelect }: Props) {
  return (
    <div className="welcome-screen">
      <div className="welcome-icon">🎁</div>
      <h1>选礼物助手</h1>
      <p className="welcome-desc">
        不知道送什么礼物？<br />
        回答几个简单问题，让我帮你找到最合适的选择。
      </p>
      <button className="btn-primary start-btn" onClick={onStart}>
        开始挑选
      </button>

      {history.length > 0 && (
        <div className="history-section">
          <h3 className="history-title">最近记录</h3>
          <div className="history-list">
            {history.map((rec, i) => (
              <button
                key={i}
                className="history-item"
                onClick={() => onHistorySelect(rec)}
              >
                <span className="history-time">{formatTime(rec.timestamp)}</span>
                <span className="history-summary">{summary(rec)}</span>
                <span className="history-arrow">→</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
