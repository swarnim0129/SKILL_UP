const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  requirements: {
    type: [String],
    required: [true, 'Please add requirements']
  },
  salary: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, default: 'USD' }
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'freelance', 'remote', 'hybrid', 'internship'],
    required: true
  },
  experience: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    required: true
  },
  skills: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'flagged', 'draft'],
    default: 'active'
  },
  applicationsCount: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Job', jobSchema);
