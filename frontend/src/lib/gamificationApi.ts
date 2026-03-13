import api from '@/lib/api';

export interface GamificationSummaryResponse {
  success: boolean;
  profile: {
    xpTotal: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    weeklyXp: number;
  };
  badges: Array<{ code: string; name: string; unlockedAt: string }>;
  stats: Record<string, number>;
}

export interface LeaderboardEntry {
  rank: number;
  candidateId: string;
  name: string;
  xp: number;
  level: number;
  currentStreak: number;
  isMe: boolean;
}

export async function getGamificationSummary(token: string) {
  const res = await api.get<GamificationSummaryResponse>('/gamification/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getGamificationLeaderboard(
  token: string,
  params: { scope?: 'global' | 'topic'; period?: 'weekly' | 'monthly'; topicCluster?: string; limit?: number }
) {
  const res = await api.get('/gamification/leaderboard', {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
