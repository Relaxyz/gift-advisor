import { useState } from 'react';
import './App.css';
import type { Step, Answers, AnswerKey, Gift } from './types';
import { SUPPLEMENT_VALUE } from './types';
import { questions } from './data/questions';
import { APP_VERSION } from './version';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import ReviewPanel from './components/ReviewPanel';
import RecommendationCard from './components/RecommendationCard';

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

export default function App() {
  const [step, setStep] = useState<Step>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [recommendations, setRecommendations] = useState<Gift[]>([]);
  const [editingFromReview, setEditingFromReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  const handleAnswerChange = (key: AnswerKey, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSupplementChange = (key: AnswerKey, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      supplement: { ...prev.supplement, [key]: text },
    }));
  };

  const handleBudgetFlexibilityChange = (val: string) => {
    setAnswers((prev) => ({ ...prev, budgetFlexibility: val }));
  };

  const currentQ = () => questions[questionIndex];

  const canProceed = (): boolean => {
    const q = currentQ();
    const val = answers[q.id];
    const suppText = (answers.supplement?.[q.id] ?? '').trim();

    // 滑块 / 预算：必须用户已拖动过（value 非空）
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

  return (
    <div className="app-container">
      <span className="version-tag">v{APP_VERSION}</span>
      {step === 'welcome' && (
        <WelcomeScreen onStart={() => setStep('questionnaire')} />
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
