import type { Answers, Gift, FilterQuestion } from './types';

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `请求失败 (${res.status})`);
  }
  return res.json();
}

export async function generateCandidates(answers: Answers): Promise<Gift[]> {
  const data = await post('/api/recommend', { answers });
  return data.candidates || [];
}

export async function filterCandidates(
  candidates: Gift[],
  selectedIds: string[],
  secondRoundAnswer?: string,
): Promise<{ gifts: Gift[]; filterQuestion?: FilterQuestion }> {
  const data = await post('/api/recommend', {
    candidates,
    selectedCandidates: selectedIds,
    secondRoundAnswer,
  });

  if (data.phase === 'filter-question') {
    return { gifts: [], filterQuestion: data.filterQuestion };
  }
  return { gifts: data.finalGifts || [] };
}
