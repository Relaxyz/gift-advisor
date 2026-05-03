interface Props {
  onStart: () => void;
}

export default function WelcomeScreen({ onStart }: Props) {
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
    </div>
  );
}
