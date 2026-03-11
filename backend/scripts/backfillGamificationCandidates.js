require('dotenv').config();
const connectDB = require('../config/db');
const Candidate = require('../models/Candidate');

function ensureNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBadges(badges) {
  if (!Array.isArray(badges)) return [];
  return badges
    .map((badge) => {
      if (!badge || typeof badge !== 'object') return null;
      const code = String(badge.code || '').trim();
      const name = String(badge.name || '').trim();
      if (!code || !name) return null;
      return {
        code,
        name,
        unlockedAt: badge.unlockedAt ? new Date(badge.unlockedAt) : new Date(),
        meta: badge.meta && typeof badge.meta === 'object' ? badge.meta : {},
      };
    })
    .filter(Boolean);
}

function buildGamificationStats(existing = {}) {
  return {
    roadmapNodesCompleted: ensureNumber(existing.roadmapNodesCompleted, 0),
    roadmapsCompleted: ensureNumber(existing.roadmapsCompleted, 0),
    tutorChaptersCompleted: ensureNumber(existing.tutorChaptersCompleted, 0),
    quizzesCompleted: ensureNumber(existing.quizzesCompleted, 0),
    quizAces: ensureNumber(existing.quizAces, 0),
    interviewsCompleted: ensureNumber(existing.interviewsCompleted, 0),
    resumeAnalyses: ensureNumber(existing.resumeAnalyses, 0),
    resumeGenerated: ensureNumber(existing.resumeGenerated, 0),
    resumeExports: ensureNumber(existing.resumeExports, 0),
    applicationsSent: ensureNumber(existing.applicationsSent, 0),
  };
}

async function run() {
  await connectDB();

  const candidates = await Candidate.find({}).lean();
  console.log(`[backfill] Found ${candidates.length} candidates`);

  let updatedCount = 0;

  for (const candidate of candidates) {
    const xpTotal = Math.max(0, ensureNumber(candidate.xpTotal, 0));
    const weeklyXp = Math.max(0, ensureNumber(candidate.weeklyXp, 0));
    const currentStreak = Math.max(0, ensureNumber(candidate.currentStreak, 0));
    const longestStreak = Math.max(currentStreak, ensureNumber(candidate.longestStreak, currentStreak));
    const level = Math.max(1, ensureNumber(candidate.level, Math.floor(Math.sqrt(xpTotal / 100)) + 1));
    const lastActiveAt = candidate.lastActiveAt ? new Date(candidate.lastActiveAt) : null;
    const badges = normalizeBadges(candidate.badges);
    const gamificationStats = buildGamificationStats(candidate.gamificationStats || {});

    const updatePayload = {
      $set: {
        xpTotal,
        weeklyXp,
        currentStreak,
        longestStreak,
        level,
        lastActiveAt,
        badges,
        gamificationStats,
      },
    };

    await Candidate.updateOne({ _id: candidate._id }, updatePayload);
    updatedCount += 1;
  }

  console.log(`[backfill] Updated ${updatedCount} candidates with gamification defaults`);
  process.exit(0);
}

run().catch((error) => {
  console.error('[backfill] Error:', error);
  process.exit(1);
});
