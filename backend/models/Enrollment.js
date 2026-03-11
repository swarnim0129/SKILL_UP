const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completed_videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    last_watched_video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    },
    last_watched_timestamp: {
        type: Number,
        default: 0
    },
    is_completed: {
        type: Boolean,
        default: false
    },
    completedAt: {
        type: Date
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

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, progress: -1 });
enrollmentSchema.index({ student: 1, updatedAt: -1 });

enrollmentSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    if (this.isModified('progress') && this.progress >= 100 && !this.is_completed) {
        this.is_completed = true;
        this.completedAt = new Date();
    }
    next();
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);