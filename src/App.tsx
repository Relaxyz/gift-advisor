import { useState, useEffect } from 'react';
import './App.css';
import type { Answers, Gift, FilterQuestion, HistoryItem, AnswerKey } from './types';
import { questions } from './data/questions';
import WelcomeScreen from './components/WelcomeScreen';
import ProgressBar from './components/ProgressBar';
import QuestionCard from './components/QuestionCard';
import ReviewPanel from './components/ReviewPanel';
import RecommendationCard from './components/RecommendationCard';
import CandidateFilter from './components/CandidateFilter';
import { APP_VERSION } from './version';
import { generateCandidates, filterCandidates } from './api';

const STORAGE_KEY = 'gift-advisor-session';
const HISTORY_KEY = 'gift-advisor-history';

const defaultAnswers: Answers = {
  relationship: '',
  budget: '',
  budgetFlexibility: '20',
  ageRange: '',
  occasion: '',
  specificWants: '',
  interests: [],
  interestsCustom: '',
  personality: [],
  personalityCustom: '',
  exclusions: [],
  exclusionsCustom: '',
  additionalNotes: '',
  gender: '',
  knowDuration: '',
  giftStyle: [],
  restrictions: [],
  supplement: {},
};

type Step = 'welcome' | 'questionnaire' | 'review' | 'filtering' | 'recommendation';

const UNLIMITED_STORAGE_KEY = 'gift-advisor-unlimited-key';

function getSavedUnlimitedKey(): string {
  try {
    return localStorage.getItem(UNLIMITED_STORAGE_KEY) || '';
  } catch { return ''; }
}

function UnlimitedInputInError({ onDismiss }: { onDismiss: () => void }) {
  const [value, setValue] = useState(getSavedUnlimitedKey);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed) {
      localStorage.setItem(UNLIMITED_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(UNLIMITED_STORAGE_KEY);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onDismiss();
    }, 1500);
  };

  return (
    <div className="error-unlimited">
      <input
        type="password"
        className="error-unlimited-input"
        placeholder="输入解除限制密钥"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
      />
      <button className="btn-secondary error-unlimited-btn" onClick={handleSave}>
        {saved ? '已保存' : '解除限制'}
      </button>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('welcome');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [editingFromReview, setEditingFromReview] = useState(false);

  // 筛选相关状态
  const [candidates, setCandidates] = useState<Gift[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [filterQuestion, setFilterQuestion] = useState<FilterQuestion | null>(null);
  const [filterPhase, setFilterPhase] = useState<'select' | 'question'>('select');

  const [recommendations, setRecommendations] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 从 localStorage 恢复会话
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.step && parsed.answers) {
          setStep(parsed.step);
          setQuestionIndex(parsed.questionIndex || 0);
          setAnswers({ ...defaultAnswers, ...parsed.answers });
          if (parsed.candidates) setCandidates(parsed.candidates);
          if (parsed.recommendations) setRecommendations(parsed.recommendations);
        }
      } catch (e) {
        console.error('Failed to parse saved session:', e);
      }
    }

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  // 保存会话到 localStorage
  useEffect(() => {
    if (step !== 'welcome') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step,
        questionIndex,
        answers,
        candidates,
        recommendations,
      }));
    }
  }, [step, questionIndex, answers, candidates, recommendations]);

  const currentQuestion = questions[questionIndex];
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === questions.length - 1;

  const getCurrentValue = (): string | string[] => {
    const key = currentQuestion.id;
    const val = answers[key as keyof Answers];
    if (val === undefined || val === null) return '';
    return val as string | string[];
  };

  const getSupplementText = (): string => {
    return answers.supplement?.[currentQuestion.id] || '';
  };

  const getCustomText = (): string => {
    if (currentQuestion.id === 'interests') return answers.interestsCustom || '';
    if (currentQuestion.id === 'exclusions') return answers.exclusionsCustom || '';
    return '';
  };

  const canProceed = (): boolean => {
    if (currentQuestion.allowEmpty) return true;

    const val = answers[currentQuestion.id as keyof Answers];
    const type = currentQuestion.type;

    if (type === 'text' || type === 'textarea') {
      return typeof val === 'string' && val.trim() !== '';
    }

    if (type === 'slider' || type === 'budget') {
      return val !== '' && val !== undefined;
    }

    if (type === 'mixed') {
      const arr = val as string[];
      return Array.isArray(arr) && arr.length > 0;
    }

    if (type === 'multi') {
      const arr = val as string[];
      const supp = answers.supplement?.[currentQuestion.id];
      const hasSupp = supp ? supp.trim() !== '' : false;
      return Array.isArray(arr) && (arr.length > 0 || hasSupp);
    }

    return val !== '' && val !== undefined;
  };

  const handleChange = (key: AnswerKey, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSupplementChange = (key: AnswerKey, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      supplement: { ...prev.supplement, [key]: text },
    }));
  };

  const handleCustomChange = (key: AnswerKey, text: string) => {
    if (key === 'interests') {
      setAnswers((prev) => ({ ...prev, interestsCustom: text }));
    } else if (key === 'exclusions') {
      setAnswers((prev) => ({ ...prev, exclusionsCustom: text }));
    }
  };

  const handleNext = () => {
    if (!isLast) {
      setQuestionIndex((i) => i + 1);
    } else {
      setStep('review');
    }
  };

  const handlePrev = () => {
    if (editingFromReview) {
      setStep('review');
      setEditingFromReview(false);
    } else if (!isFirst) {
      setQuestionIndex((i) => i - 1);
    }
  };

  const handleStart = () => {
    setStep('questionnaire');
    setQuestionIndex(0);
    setAnswers(defaultAnswers);
    setCandidates([]);
    setRecommendations([]);
    setSelectedCandidateIds([]);
    setFilterQuestion(null);
    setApiError(null);
  };

  const handleEditFromReview = (idx: number) => {
    setQuestionIndex(idx);
    setStep('questionnaire');
    setEditingFromReview(true);
  };

  // 提交问卷 -> 获取候选礼物
  const handleSubmit = async () => {
    setLoading(true);
    setApiError(null);

    try {
      const gifts = await generateCandidates(answers);
      setCandidates(gifts);
      setStep('filtering');
      setFilterPhase('select');
    } catch (e: unknown) {
      console.error('API error:', e);
      setApiError(e instanceof Error ? e.message : '请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 用户筛选后 -> 获取最终推荐或筛选问题
  const handleFilterConfirm = async (selectedIds: string[]) => {
    setLoading(true);
    setSelectedCandidateIds(selectedIds);

    try {
      const result = await filterCandidates(candidates, selectedIds);

      if (result.filterQuestion) {
        setFilterQuestion(result.filterQuestion);
        setFilterPhase('question');
      } else {
        setRecommendations(result.gifts);
        setStep('recommendation');
        saveToHistory(answers, result.gifts, candidates);
      }
    } catch (e: unknown) {
      console.error('API error:', e);
      setApiError(e instanceof Error ? e.message : '请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 回答筛选问题 -> 获取最终推荐
  const handleFilterAnswer = async (answer: string) => {
    setLoading(true);

    try {
      const result = await filterCandidates(candidates, selectedCandidateIds, answer);
      setRecommendations(result.gifts);
      setStep('recommendation');
      saveToHistory(answers, result.gifts, candidates);
    } catch (e: unknown) {
      console.error('API error:', e);
      setApiError(e instanceof Error ? e.message : '请求失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (ans: Answers, gifts: Gift[], cands: Gift[]) => {
    const newItem: HistoryItem = {
      timestamp: new Date().toISOString(),
      answers: ans,
      candidates: cands,
      gifts,
    };
    const updated = [newItem, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleRestart = () => {
    setStep('welcome');
    setQuestionIndex(0);
    setAnswers(defaultAnswers);
    setCandidates([]);
    setRecommendations([]);
    setSelectedCandidateIds([]);
    setFilterQuestion(null);
    setApiError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 从历史记录加载
  const handleLoadHistory = (item: HistoryItem) => {
    setAnswers(item.answers);
    setCandidates(item.candidates || []);
    setRecommendations(item.gifts);
    setStep('recommendation');
  };

  const handleBackToReview = () => {
    setStep('review');
  };

  const handleBackToFilter = () => {
    setStep('filtering');
    setFilterPhase('select');
  };

  // 根据 step 渲染进度条
  const getProgressStep = (): number => {
    if (step === 'welcome') return -1;
    if (step === 'questionnaire') return questionIndex;
    if (step === 'review') return questions.length;
    if (step === 'filtering') return questions.length + 0.5;
    if (step === 'recommendation') return questions.length + 1;
    return 0;
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="app-title">礼物推荐</h1>
        {step !== 'welcome' && (
          <ProgressBar
            current={getProgressStep()}
            total={questions.length + 1}
          />
        )}
      </div>

      <div className="app-content">
        {step === 'welcome' && (
          <WelcomeScreen
            onStart={handleStart}
            history={history}
            onLoadHistory={handleLoadHistory}
          />
        )}

        {step === 'questionnaire' && currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            value={getCurrentValue()}
            supplementText={getSupplementText()}
            onChange={handleChange}
            onSupplementChange={handleSupplementChange}
            onNext={handleNext}
            onPrev={handlePrev}
            onRestart={handleRestart}
            isFirst={isFirst}
            isLast={isLast}
            canProceed={canProceed()}
            isSingleEdit={editingFromReview}
            budgetFlexibility={answers.budgetFlexibility}
            onBudgetFlexibilityChange={(v) =>
              setAnswers((prev) => ({ ...prev, budgetFlexibility: v }))
            }
            customText={getCustomText()}
            onCustomChange={handleCustomChange}
          />
        )}

        {step === 'review' && (
          <ReviewPanel
            answers={answers}
            questions={questions}
            onEdit={handleEditFromReview}
            onSubmit={handleSubmit}
            onRestart={handleRestart}
            loading={loading}
          />
        )}

        {step === 'filtering' && (
          <CandidateFilter
            candidates={candidates}
            onConfirm={handleFilterConfirm}
            onRestart={handleRestart}
            filterQuestion={filterPhase === 'question' ? filterQuestion || undefined : undefined}
            onFilterAnswer={handleFilterAnswer}
            loading={loading}
          />
        )}

        {step === 'recommendation' && (
          <RecommendationCard
            gifts={recommendations}
            onRestart={handleRestart}
            onBackToReview={handleBackToReview}
            onBackToFilter={candidates.length > 0 ? handleBackToFilter : undefined}
          />
        )}

        {apiError && (
          <div className="error-banner">
            <p>{apiError}</p>
            <div className="error-banner-actions">
              <button onClick={() => setApiError(null)}>关闭</button>
            </div>
            {apiError.includes('限') && <UnlimitedInputInError onDismiss={() => setApiError(null)} />}
          </div>
        )}
      </div>

      <div className="version-tag">v{APP_VERSION}</div>
    </div>
  );
}
