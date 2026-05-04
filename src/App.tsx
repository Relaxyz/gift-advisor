import { useState, useEffect, useCallback, useMemo } from 'react';
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
  giftStyle: [],
  restrictions: [],
  budgetFlexibility: '20',
  supplement: {},
};

function getActiveQuestions(answers: Answers) {
  return questions.filter((q) => {
    if (!q.skipWhen) return true;
    const depVal = answers[q.skipWhen.key];
    return !q.skipWhen.values.includes(depVal as string);
  });
}

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

  const activeQuestions = useMemo(() => getActiveQuestions(answers), [answers]);

  // 会话状态变更时持久化
  useEffect(() => {
    if (step === 'welcome') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      saveSession({ step, questionIndex, answers });
    }
  }, [step, questionIndex, answers]);

  const handleAnswerChange = useCallback((key: AnswerKey, value: string | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value };
      // 当 relationship 变更导致 activeQuestions 变化时，修正 questionIndex
      const prevActive = getActiveQuestions(prev);
      const nextActive = getActiveQuestions(next);
      if (prevActive.length !== nextActive.length) {
        // 如果当前问题被跳过，自动前进到下一个有效问题
        const currentId = prevActive[questionIndex]?.id;
        const newIdx = nextActive.findIndex((q) => q.id === currentId);
        if (newIdx === -1 && questionIndex >= nextActive.length) {
          // 当前问题不在新列表中，跳到末尾
          setTimeout(() => setQuestionIndex(nextActive.length - 1), 0);
        }
      }
      return next;
    });
  }, [questionIndex]);

  const handleSupplementChange = useCallback((key: AnswerKey, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      supplement: { ...prev.supplement, [key]: text },
    }));
  }, []);

  const handleBudgetFlexibilityChange = useCallback((val: string) => {
    setAnswers((prev) => ({ ...prev, budgetFlexibility: val }));
  }, []);

  const currentQ = () => activeQuestions[questionIndex];

  const canProceed = (): boolean => {
    const q = currentQ();
    if (!q) return false;
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
    if (questionIndex < activeQuestions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      // 跳过的问题自动填默认值
      const finalAnswers = { ...answers };
      if (!finalAnswers.knowDuration) {
        finalAnswers.knowDuration = String(Math.min(Number(finalAnswers.ageRange) || 20, 30));
      }
      setAnswers(finalAnswers);
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

  const handleEdit = (qId: AnswerKey) => {
    const idx = activeQuestions.findIndex((q) => q.id === qId);
    if (idx === -1) return;
    setQuestionIndex(idx);
    setEditingFromReview(true);
    setStep('questionnaire');
  };

  const handleConfirm = async () => {
    // 跳过的问题自动填默认值
    const finalAnswers = { ...answers };
    if (!finalAnswers.knowDuration) {
      finalAnswers.knowDuration = String(Math.min(Number(finalAnswers.ageRange) || 20, 30));
    }

    setLoading(true);
    setApiError(false);
    try {
      const resp = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.gifts?.length > 0) {
          setRecommendations(data.gifts);
          setStep('recommendation');

          const record: HistoryRecord = {
            timestamp: Date.now(),
            answers: structuredClone(finalAnswers),
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
            <ProgressBar current={questionIndex + 1} total={activeQuestions.length} />
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
            isLast={editingFromReview || questionIndex === activeQuestions.length - 1}
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
          activeQuestions={activeQuestions}
          onEdit={handleEdit}
          onConfirm={handleConfirm}
          loading={loading}
          error={apiError}
        />
      )}

      {step === 'recommendation' && (
        <RecommendationCard
          gifts={recommendations}
          answers={answers}
          activeQuestions={activeQuestions}
          onRestart={handleRestart}
          onBack={() => setStep('review')}
        />
      )}
    </div>
  );
}
