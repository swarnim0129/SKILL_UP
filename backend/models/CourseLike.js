const mongoose = require('mongoose');

const courseLikeSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        index: true
    },
    clerkId: {
        type: String,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// One like per user per course
courseLikeSchema.index({ course: 1, clerkId: 1 }, { unique: true });

module.exports = mongoose.model('CourseLike', courseLikeSchema);
