const mongoose = require('mongoose');

const resumeAnalysisSchema = new mongoose.Schema({
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true,
        index: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    resumeText: {
        type: String,
        default: '',
    },
    analysis: {
        overallScore: { type: Number, default: 0 },
        sections: {
            impact: { type: Number, default: 0 },
            formatting: { type: Number, default: 0 },
            keywords: { type: Number, default: 0 },
            experience: { type: Number, default: 0 },
        },
        feedback: {
            critical: [String],
            suggestions: [String],
            strengths: [String],
        },
        keywords: [String],
        missingKeywords: [String],
        atsCompatibility: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            default: 'Medium',
        },
        atsCompatibilityReason: String,
        summary: String,
        careerPath: {
            role: String,
            reason: String,
        },
    },
}, { timestamps: true });

resumeAnalysisSchema.index({ candidate: 1, createdAt: -1 });

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);
