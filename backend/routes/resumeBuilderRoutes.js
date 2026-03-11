const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    saveResume,
    getResumes,
    getResume,
    deleteResume,
    deductExportFee,
    exportLatexPdf
} = require('../controllers/resumeBuilderController');

// Static routes MUST come before dynamic /:id routes
router.post('/', protect, saveResume);
router.get('/', protect, getResumes);
router.post('/export-fee', protect, deductExportFee);
router.post('/export-pdf', protect, exportLatexPdf);
router.get('/:id', protect, getResume);
router.delete('/:id', protect, deleteResume);

module.exports = router;
