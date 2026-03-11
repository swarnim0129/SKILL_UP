const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/authMiddleware');
const {
    analyzeResume,
    getAnalyses,
    getAnalysis,
    deleteAnalysis,
} = require('../controllers/resumeController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
});

router.post('/analyze', protect, upload.single('file'), analyzeResume);
router.get('/analyses', protect, getAnalyses);
router.get('/analyses/:id', protect, getAnalysis);
router.delete('/analyses/:id', protect, deleteAnalysis);

module.exports = router;
