const mongoose = require('mongoose');

const creatorFollowSchema = new mongoose.Schema({
    // The clerkId of the user who is following
    followerClerkId: {
        type: String,
        required: true,
        index: true
    },
    // The clerkId of the creator being followed
    creatorClerkId: {
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

// One follow per user per creator
creatorFollowSchema.index({ followerClerkId: 1, creatorClerkId: 1 }, { unique: true });
creatorFollowSchema.index({ creatorClerkId: 1, createdAt: -1 });

module.exports = mongoose.model('CreatorFollow', creatorFollowSchema);
