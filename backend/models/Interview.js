const mongoose = require("mongoose");

const transcriptEntrySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const interviewFeedbackSchema = new mongoose.Schema(
  {
    communication_score: { type: Number },
    technical_score: { type: Number },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    improvement_plan: { type: String },
    hiring_recommendation: { type: String },
  },
  { _id: false },
);

const interviewSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    seniority: { type: String, required: true },
    topic: { type: String, default: "General Industry Standards" },
    category: { type: String, required: true },
    vapiCallId: { type: String, sparse: true },
    transcript: [transcriptEntrySchema],
    feedback: interviewFeedbackSchema,
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

interviewSchema.index({ clerkId: 1, createdAt: -1 });

module.exports = mongoose.model("Interview", interviewSchema);
