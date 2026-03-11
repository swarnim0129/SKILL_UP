const mongoose = require('mongoose');

const creatorProfileSchema = new mongoose.Schema({
    clerkId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30
    },
    displayName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        required: true
    },
    bio: {
        type: String,
        trim: true,
        maxlength: 500
    },
    avatar_url: {
        type: String,
        default: ''
    },
    cover_image_url: {
        type: String,
        default: ''
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    total_followers: {
        type: Number,
        default: 0
    },
    total_following: {
        type: Number,
        default: 0
    },
    total_courses: {
        type: Number,
        default: 0
    },
    total_students: {
        type: Number,
        default: 0
    },
    total_views: {
        type: Number,
        default: 0
    },
    social_links: {
        youtube: String,
        twitter: String,
        linkedin: String,
        website: String
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'suspended'],
        default: 'approved'
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

creatorProfileSchema.index({ username: 'text', displayName: 'text' });
creatorProfileSchema.index({ status: 1, is_featured: 1 });
creatorProfileSchema.index({ total_followers: -1 });

creatorProfileSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    if (this.isModified('status') && this.status === 'approved' && !this.approvedAt) {
        this.approvedAt = new Date();
    }
    next();
});

creatorProfileSchema.virtual('courses', {
    ref: 'Course',
    localField: 'clerkId',
    foreignField: 'creator'
});

creatorProfileSchema.methods.incrementFollowers = async function() {
    this.total_followers += 1;
    await this.save();
};

creatorProfileSchema.methods.decrementFollowers = async function() {
    this.total_followers = Math.max(0, this.total_followers - 1);
    await this.save();
};

module.exports = mongoose.model('CreatorProfile', creatorProfileSchema);