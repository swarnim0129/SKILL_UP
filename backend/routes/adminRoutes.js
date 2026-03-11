const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { 
    getCompanies, 
    updateCompanyStatus, 
    getCandidates, 
    getCandidateDetails,
    updateCandidateStatus,
    updateCandidateCredits,
    getAnalytics,
    getStats,
    getJobs,
    flagJob,
    deleteJob,
    getReviews,
    deleteReview,
    verifyCode,
    getCompanyJobs,
    createJobForCompany,
    getCompanyJobApplicants,
    updateApplicationStatus,
    createCompany
} = require('../controllers/adminController');
const { generateJobFromText, generateJobFromPdf } = require('../controllers/jobController');

// All routes here should be protected by Admin Auth
router.use(protectAdmin);

router.get('/companies', getCompanies);
router.post('/companies', upload.single('document'), createCompany);
router.put('/companies/:id/status', updateCompanyStatus);

// Company job management (admin posts jobs on behalf of companies)
router.get('/companies/:id/jobs', getCompanyJobs);
router.post('/companies/:id/jobs', createJobForCompany);
router.get('/companies/:companyId/jobs/:jobId/applicants', getCompanyJobApplicants);

// AI job generation (admin-accessible, reuses job controller logic)
router.post('/jobs/generate-ai', generateJobFromText);
router.post('/jobs/generate-ai-file', upload.single('file'), generateJobFromPdf);

router.get('/candidates', getCandidates);
router.get('/candidates/:id', getCandidateDetails);
router.put('/candidates/:id/status', updateCandidateStatus);
router.put('/candidates/:id/credits', updateCandidateCredits);

router.get('/analytics', getAnalytics);
router.get('/stats', getStats);

router.get('/jobs', getJobs);
router.put('/jobs/:id/flag', flagJob);
router.delete('/jobs/:id', deleteJob);

router.get('/reviews', getReviews);
router.delete('/reviews/:id', deleteReview);

// Application status management (admin)
router.put('/applications/:id/status', updateApplicationStatus);

// Legacy verify (if needed)
// router.post('/verify-code', verifyCode); 

module.exports = router;


