import type { Answers, Gift, FilterQuestion } from './types';

function getUnlimitedKey(): string | null {
  try {
    return localStorage.getItem('gift-advisor-unlimited-key');
  } catch {
    return null;
  }
}

async function post(path: string, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getUnlimitedKey();
  if (key) {
    headers['x-unlimited-key'] = key;
  }
  const res = await fetch(path, {
    method: 'POST',
    headers,
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
