const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  postEvent,
  getMe,
  getLeaderboard,
  getBadges,
} = require('../controllers/gamificationController');

router.post('/events', protect, postEvent);
router.get('/me', protect, getMe);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/badges', protect, getBadges);

module.exports = router;
