const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getDashboardStats, getProfile, getReferrals, updateProfile, getCredits } = require('../controllers/candidateController');

router.get('/stats', protect, getDashboardStats);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.get('/referrals', protect, getReferrals);
router.get('/credits', protect, getCredits);

module.exports = router;
