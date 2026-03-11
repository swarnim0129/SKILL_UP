const mongoose = require('mongoose');

const courseCommentSchema = new mongoose.Schema({
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
    userName: {
        type: String,
        required: true,
        trim: true
    },
    userAvatar: {
        type: String,
        default: ''
    },
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true,
        maxlength: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

courseCommentSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model('CourseComment', courseCommentSchema);
