const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getApplications, updateApplicationStatus, createApplication } = require('../controllers/applicationController');

router.get('/', protect, getApplications);
router.post('/', protect, createApplication);
router.put('/:id/status', protect, authorize('company'), updateApplicationStatus);

module.exports = router;
