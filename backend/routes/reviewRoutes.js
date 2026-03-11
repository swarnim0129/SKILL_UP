const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getReviews, createReview } = require('../controllers/reviewController');

// Public - get all reviews
router.get('/', getReviews);

// Private - create a review (logged-in users only)
router.post('/', protect, createReview);

module.exports = router;
