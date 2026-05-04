import { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { Step, Answers, AnswerKey, Gift, HistoryRecord } from './types';
import { SUPPLEMENT_VALUE } from './types';
import { questions } from './data/questions';
import { APP_VERSION } from './version';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import ReviewPanel from './components/ReviewPanel';
import RecommendationCard from './components/RecommendationCard';

const SESSION_KEY = 'gift-advisor-session';
const HISTORY_KEY = 'gift-advisor-history';
const MAX_HISTORY = 5;

const defaultAnswers: Answers = {
  relationship: '',
  budget: '',
  gender: '',
  ageRange: '',
  occasion: '',
  knowDuration: '',
  interests: [],
  personality: [],
  giftStyle: '',
  restrictions: [],
  budgetFlexibility: '20',
  supplement: {},
};

function loadSession(): { step: Step; questionIndex: number; answers: Answers; recommendations: Gift[] } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data.step === 'string') return data;
  } catch { /* corrupted */ }
  return null;
}

function saveSession(state: { step: Step; questionIndex: number; answers: Answers }) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch { /* quota exceeded */ }
}

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data.slice(0, MAX_HISTORY);
  } catch { /* corrupted */ }
  return [];
}

function saveHistory(records: HistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
  } catch { /* quota exceeded */ }
}

export default function App() {
  const saved = loadSession();
  const [step, setStep] = useState<Step>(saved?.step ?? 'welcome');
  const [questionIndex, setQuestionIndex] = useState(saved?.questionIndex ?? 0);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? defaultAnswers);
  const [recommendations, setRecommendations] = useState<Gift[]>(saved?.recommendations ?? []);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>(loadHistory);

  // 会话状态变更时持久化
  useEffect(() => {
    if (step === 'welcome') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      saveSession({ step, questionIndex, answers });
    }
  }, [step, questionIndex, answers]);

  const handleAnswerChange = useCallback((key: AnswerKey, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSupplementChange = useCallback((key: AnswerKey, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      supplement: { ...prev.supplement, [key]: text },
    }));
  }, []);

  const handleBudgetFlexibilityChange = useCallback((val: string) => {
    setAnswers((prev) => ({ ...prev, budgetFlexibility: val }));
  }, []);

  const currentQ = () => questions[questionIndex];

  const canProceed = (): boolean => {
    const q = currentQ();
    const val = answers[q.id];
    const suppText = (answers.supplement?.[q.id] ?? '').trim();

    if (q.type === 'slider' || q.type === 'budget') return val !== '';

    if (Array.isArray(val)) {
      if (q.allowEmpty) return true;
      if (val.length > 0) return true;
      return suppText !== '';
    }

    if (val === SUPPLEMENT_VALUE) return suppText !== '';
    return val !== '';
  };

  const handleNext = () => {
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep('review');
      return;
    }
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setStep('review');
    }
  };

  const handlePrev = () => {
    if (editingFromReview) {
      setEditingFromReview(false);
      setStep('review');
      return;
    }
    if (questionIndex > 0) {
      setQuestionIndex((i) => i - 1);
    }
  };

  const handleEdit = (idx: number) => {
    setQuestionIndex(idx);
    setEditingFromReview(true);
    setStep('questionnaire');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setApiError(false);
    try {
      const resp = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.gifts?.length > 0) {
          setRecommendations(data.gifts);
          setStep('recommendation');

          // 存入历史记录
          const record: HistoryRecord = {
            timestamp: Date.now(),
            answers: structuredClone(answers),
            gifts: data.gifts,
          };
          setHistory((prev) => {
            const next = [record, ...prev].slice(0, MAX_HISTORY);
            saveHistory(next);
            return next;
          });

          setLoading(false);
          return;
        }
      }
      setApiError(true);
    } catch {
      setApiError(true);
    }
    setLoading(false);
  };

  const handleRestart = () => {
    setAnswers(defaultAnswers);
    setQuestionIndex(0);
    setRecommendations([]);
    setStep('welcome');
  };

  const handleHistorySelect = (record: HistoryRecord) => {
    setAnswers(record.answers);
    setRecommendations(record.gifts);
    setStep('recommendation');
  };

  return (
    <div className="app-container">
      <span className="version-tag">v{APP_VERSION}</span>
      {step === 'welcome' && (
        <WelcomeScreen
          onStart={() => {
            setAnswers(defaultAnswers);
            setQuestionIndex(0);
            setRecommendations([]);
            setStep('questionnaire');
          }}
          history={history}
          onHistorySelect={handleHistorySelect}
        />
      )}

      {step === 'questionnaire' && (
        <>
          {!editingFromReview && (
            <ProgressBar current={questionIndex + 1} total={questions.length} />
          )}
          <QuestionCard
            question={currentQ()}
            value={answers[currentQ().id]}
            supplementText={answers.supplement?.[currentQ().id] ?? ''}
            onChange={handleAnswerChange}
            onSupplementChange={handleSupplementChange}
            onNext={handleNext}
            onPrev={handlePrev}
            isFirst={questionIndex === 0 && !editingFromReview}
            isLast={editingFromReview || questionIndex === questions.length - 1}
            canProceed={canProceed()}
            isSingleEdit={editingFromReview}
            budgetFlexibility={answers.budgetFlexibility}
            onBudgetFlexibilityChange={handleBudgetFlexibilityChange}
          />
        </>
      )}

      {step === 'review' && (
        <ReviewPanel
          answers={answers}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          loading={loading}
          error={apiError}
        />
      )}

      {step === 'recommendation' && (
        <RecommendationCard
          gifts={recommendations}
          onRestart={handleRestart}
          onBack={() => setStep('review')}
        />
      )}
    </div>
  );
}
