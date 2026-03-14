const { getGenAI, hasKeys } = require('../utils/geminiKeyManager');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const Candidate = require('../models/Candidate');
const UserActivity = require('../models/UserActivity');

// @desc    Analyze a resume PDF
// @route   POST /api/resume/analyze
// @access  Private (Candidate)
exports.analyzeResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        if (!hasKeys()) {
            return res.status(500).json({ message: 'Gemini API key not configured' });
        }

        // --- Credit enforcement (server-side) ---
        const candidate = await Candidate.findById(req.user._id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        const ANALYSIS_COST = 10;
        let creditCharged = 0;

        if (!candidate.freeAnalysisUsed) {
            // First analysis is free — mark as used
            candidate.freeAnalysisUsed = true;
        } else {
            // Subsequent analyses cost credits
            if (candidate.credits < ANALYSIS_COST) {
                return res.status(402).json({
                    message: 'Insufficient credits for resume analysis',
                    creditsRequired: ANALYSIS_COST,
                    creditsAvailable: candidate.credits,
                    freeUsed: true,
                });
            }
            candidate.credits -= ANALYSIS_COST;
            creditCharged = ANALYSIS_COST;
        }
        await candidate.save();
        // --- End credit enforcement ---

        // Parse PDF
        const pdfParse = require('pdf-parse');
        let resumeText = '';

        try {
            const pdfData = await pdfParse(req.file.buffer);
            resumeText = pdfData.text;
        } catch (pdfError) {
            console.error('PDF parsing error:', pdfError);
            return res.status(400).json({ message: 'Failed to parse PDF file. Make sure it is a valid PDF.' });
        }

        if (!resumeText || resumeText.trim().length === 0) {
            return res.status(400).json({ message: 'No text could be extracted from the PDF' });
        }

        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            systemInstruction: `You are an expert ATS (Applicant Tracking System) analyst and Career Coach. Analyze the following resume text thoroughly.
Return ONLY a valid JSON object with this exact structure (no markdown, no backticks, no extra text):
{
  "overallScore": number (0-100),
  "sections": {
    "impact": number (0-100),
    "formatting": number (0-100),
    "keywords": number (0-100),
    "experience": number (0-100)
  },
  "feedback": {
    "critical": ["string array of 2-4 critical issues that must be fixed"],
    "suggestions": ["string array of 2-4 improvement suggestions"],
    "strengths": ["string array of 2-4 strong points"]
  },
  "keywords": ["array of 10-15 hard skills/technologies actually found in the resume"],
  "missingKeywords": ["array of 5-8 critical missing skills for this candidate's apparent target role"],
  "atsCompatibility": "Low" | "Medium" | "High",
  "atsCompatibilityReason": "brief 1-2 sentence explanation",
  "summary": "2-3 sentence professional profile summary based on the resume content",
  "careerPath": {
    "role": "suggested ideal job title based on the resume",
    "reason": "1-2 sentence explanation of why this role fits"
  }
}`
        });

        const result = await model.generateContent(`Analyze this resume:\n\n${resumeText}`);
        const response = await result.response;
        let analysisText = response.text();

        // Clean markdown formatting if present
        analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        let analysis;
        try {
            analysis = JSON.parse(analysisText);
        } catch (jsonError) {
            console.error('Failed to parse Gemini response:', analysisText.substring(0, 200));
            return res.status(500).json({ message: 'AI returned an invalid response. Please try again.' });
        }

        // Save to database
        const saved = await ResumeAnalysis.create({
            candidate: req.user._id,
            fileName: req.file.originalname || 'resume.pdf',
            resumeText: resumeText.substring(0, 500),
            analysis,
        });

        // Log activity for dashboard
        UserActivity.create({
            candidate: req.user._id,
            type: 'resume_analyzed',
            metadata: { title: 'Resume Analyzed', subtitle: `"${req.file.originalname}" scored ${analysis.overallScore || 0}/100.` }
        }).catch(err => console.error('Activity log error:', err));

        res.status(200).json({
            success: true,
            _id: saved._id,
            analysis,
        });
    } catch (error) {
        console.error('Resume analysis error:', error);
        res.status(500).json({ message: 'Failed to analyze resume', error: error.message });
    }
};

// @desc    Get all saved analyses for the logged-in candidate
// @route   GET /api/resume/analyses
// @access  Private (Candidate)
exports.getAnalyses = async (req, res) => {
    try {
        const analyses = await ResumeAnalysis.find({ candidate: req.user._id })
            .sort({ createdAt: -1 })
            .select('fileName analysis.overallScore analysis.atsCompatibility createdAt')
            .lean();

        res.status(200).json({ success: true, analyses });
    } catch (error) {
        console.error('Get analyses error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get a single analysis by ID
// @route   GET /api/resume/analyses/:id
// @access  Private (Candidate)
exports.getAnalysis = async (req, res) => {
    try {
        const analysis = await ResumeAnalysis.findOne({
            _id: req.params.id,
            candidate: req.user._id,
        }).lean();

        if (!analysis) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        res.status(200).json({ success: true, analysis });
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Delete a saved analysis
// @route   DELETE /api/resume/analyses/:id
// @access  Private (Candidate)
exports.deleteAnalysis = async (req, res) => {
    try {
        const result = await ResumeAnalysis.findOneAndDelete({
            _id: req.params.id,
            candidate: req.user._id,
        });

        if (!result) {
            return res.status(404).json({ message: 'Analysis not found' });
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Delete analysis error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
