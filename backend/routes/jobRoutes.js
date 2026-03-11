const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getJobs, getJob, createJob, updateJob, deleteJob, getCandidateJobFeed, getPublicJobs } = require('../controllers/jobController');

// Public routes (or handling auth inside controller)
// Since getJobs filters by logged in user if present, we might want optional auth?
// But our middleware `protect` enforces it.
// If we want public feed, we should make a separate route or middleware that allows guest.
// For now, assuming strict "Company Dashboard" uses this.
// But wait, job seekers also view jobs.
// Let's attach `protect` but handle "public" views if token missing?
// Frontend sends token if available. 
// For now, let's keep it simple: Protected for these edits.

// Public route — no auth required
router.get('/public', getPublicJobs);

router.route('/')
    .get(protect, getJobs)
    .post(protect, createJob);

// AI Generation Routes
const { generateJobFromText, generateJobFromPdf } = require('../controllers/jobController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate-ai', protect, generateJobFromText);
router.post('/generate-ai-file', protect, upload.single('file'), generateJobFromPdf);

// Candidate job feed with AI matching
router.get('/candidate-feed', protect, getCandidateJobFeed);

router.route('/:id')
    .get(getJob)
    .put(protect, updateJob)
    .delete(protect, deleteJob);

module.exports = router;
