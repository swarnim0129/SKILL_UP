const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  firstName: String,
  lastName: String,
  phone: String,
  location: String,
  skills: [String],
  experience: String,
  education: String,
  resumeUrl: String,
  linkedIn: String,
  portfolio: String,
  jobPreferences: {
    desiredRole: String,
    expectedSalary: String,
    jobType: String
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  profileComplete: { type: Boolean, default: false },
  // --- Referral System ---
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  credits: { type: Number, default: 0 },
  referralCount: { type: Number, default: 0 },
  totalCreditsEarned: { type: Number, default: 0 },
  // --- Creator/Social System ---
  total_following: { type: Number, default: 0 },
  // --- Gamification ---
  xpTotal: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  currentStreak: { type: Number, default: 0, min: 0 },
  longestStreak: { type: Number, default: 0, min: 0 },
  lastActiveAt: { type: Date, default: null },
  weeklyXp: { type: Number, default: 0, min: 0 },
  badges: [{
    code: { type: String, required: true },
    name: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  }],
  gamificationStats: {
    roadmapNodesCompleted: { type: Number, default: 0, min: 0 },
    roadmapsCompleted: { type: Number, default: 0, min: 0 },
    tutorChaptersCompleted: { type: Number, default: 0, min: 0 },
    quizzesCompleted: { type: Number, default: 0, min: 0 },
    quizAces: { type: Number, default: 0, min: 0 },
    interviewsCompleted: { type: Number, default: 0, min: 0 },
    resumeAnalyses: { type: Number, default: 0, min: 0 },
    resumeGenerated: { type: Number, default: 0, min: 0 },
    resumeExports: { type: Number, default: 0, min: 0 },
    applicationsSent: { type: Number, default: 0, min: 0 },
  },
  // --- Usage Tracking (server-side only) ---
  freeAnalysisUsed: { type: Boolean, default: false },
  freeResumeBuilderUsed: { type: Boolean, default: false },
  freeInterviewUsed: { type: Boolean, default: false },
  // -----------------------
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'candidates' });

candidateSchema.index({ xpTotal: -1 });
candidateSchema.index({ weeklyXp: -1 });
candidateSchema.index({ currentStreak: -1 });

module.exports = mongoose.model('Candidate', candidateSchema);
