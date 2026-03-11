const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { getProfile, updateProfile, getStats } = require('../controllers/companyController');

router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('document'), updateProfile);
router.get('/stats', protect, getStats);

module.exports = router;
