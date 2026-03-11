const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Video title is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    cloudinary_public_id: {
        type: String,
        required: false
    },
    cloudinary_url: {
        type: String,
        required: false
    },
    thumbnail_public_id: {
        type: String,
        required: false
    },
    thumbnail_url: {
        type: String,
        required: false
    },
    duration_seconds: {
        type: Number,
        default: 0,
        min: 0
    },
    order_index: {
        type: Number,
        default: 0,
        min: 0
    },
    is_preview: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['processing', 'ready', 'failed'],
        default: 'ready'
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    views: {
        type: Number,
        default: 0
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

videoSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

videoSchema.virtual('formattedDuration').get(function() {
    const hours = Math.floor(this.duration_seconds / 3600);
    const minutes = Math.floor((this.duration_seconds % 3600) / 60);
    const seconds = this.duration_seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

module.exports = mongoose.model('Video', videoSchema);