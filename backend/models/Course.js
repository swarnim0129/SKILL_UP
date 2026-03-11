const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
    short_description: {
        type: String,
        trim: true,
        maxlength: 300
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Programming', 'Data Science', 'Web Development', 'Mobile Development', 'DevOps', 'Design', 'Business', 'Marketing', 'Other']
    },
    subcategory: {
        type: String,
        trim: true
    },
    price_per_minute: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 100
    },
    price_type: {
        type: String,
        enum: ['free', 'paid', 'subscription'],
        default: 'paid'
    },
    thumbnail_public_id: {
        type: String,
        required: false
    },
    thumbnail_url: {
        type: String,
        required: false
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CreatorProfile',
        required: true,
        index: true
    },
    creator_clerk_id: {
        type: String,
        required: true,
        index: true
    },
    total_duration: {
        type: Number,
        default: 0,
        min: 0
    },
    total_videos: {
        type: Number,
        default: 0,
        min: 0
    },
    total_enrollments: {
        type: Number,
        default: 0
    },
    total_views: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    language: {
        type: String,
        default: 'English'
    },
    level: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
        default: 'All Levels'
    },
    tags: [{
        type: String,
        trim: true
    }],
    requirements: [{
        type: String,
        trim: true
    }],
    objectives: [{
        type: String,
        trim: true
    }],
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    is_featured: {
        type: Boolean,
        default: false
    },
    is_approved: {
        type: Boolean,
        default: true
    },
    publishedAt: {
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

courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ creator: 1, status: 1 });
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ createdAt: -1 });

courseSchema.pre('save', async function(next) {
    this.updatedAt = new Date();
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
        
        const CreatorProfile = mongoose.model('CreatorProfile');
        await CreatorProfile.findByIdAndUpdate(this.creator, {
            $inc: { total_courses: 1 }
        });
    }
    next();
});

courseSchema.virtual('videos', {
    ref: 'Video',
    localField: '_id',
    foreignField: 'course'
});

courseSchema.virtual('creatorProfile', {
    ref: 'CreatorProfile',
    localField: 'creator',
    foreignField: '_id'
});

courseSchema.virtual('formattedPrice').get(function() {
    return `$${this.price_per_minute.toFixed(2)}/min`;
});

courseSchema.virtual('formattedDuration').get(function() {
    const hours = Math.floor(this.total_duration / 3600);
    const minutes = Math.floor((this.total_duration % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
});

courseSchema.methods.calculateTotalStats = async function() {
    const Video = mongoose.model('Video');
    
    const videos = await Video.find({ course: this._id });
    
    this.total_videos = videos.length;
    this.total_duration = videos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
    
    await this.save();
};

module.exports = mongoose.model('Course', courseSchema);