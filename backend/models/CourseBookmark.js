const mongoose = require('mongoose');

const courseBookmarkSchema = new mongoose.Schema({
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

// One bookmark per user per course
courseBookmarkSchema.index({ course: 1, clerkId: 1 }, { unique: true });

module.exports = mongoose.model('CourseBookmark', courseBookmarkSchema);
