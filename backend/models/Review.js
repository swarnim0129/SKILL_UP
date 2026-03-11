const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  clerkId: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  text: { type: String, required: true, maxlength: 500 },
  role: { type: String, default: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);
