const Review = require('../models/Review');

// @desc    Get all reviews (public)
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Candidate)
exports.createReview = async (req, res) => {
  try {
    const { text, name, image, role } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: 'Review text is required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ message: 'Review must be 500 characters or less' });
    }

    // Check if user already has a review
    const existing = await Review.findOne({ clerkId: req.clerkId });
    if (existing) {
      return res.status(409).json({ message: 'You have already submitted a review' });
    }

    const review = await Review.create({
      clerkId: req.clerkId,
      name: name || 'Anonymous',
      image: image || '',
      text: text.trim(),
      role: role || 'Seeker User',
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
