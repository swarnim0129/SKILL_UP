const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const CourseLike = require('../models/CourseLike');
const CourseBookmark = require('../models/CourseBookmark');
const CourseComment = require('../models/CourseComment');

// ============ LIKES ============

// Get like count + user's like status for a course
router.get('/:courseId/likes', async (req, res) => {
    try {
        const { courseId } = req.params;
        const clerkId = req.query.clerkId || null;

        const count = await CourseLike.countDocuments({ course: courseId });
        let isLiked = false;

        if (clerkId) {
            const existing = await CourseLike.findOne({ course: courseId, clerkId });
            isLiked = !!existing;
        }

        res.json({ success: true, count, isLiked });
    } catch (error) {
        console.error('Get likes error:', error);
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

// Toggle like (like/unlike)
router.post('/:courseId/likes', protect, async (req, res) => {
    try {
        const { courseId } = req.params;
        const clerkId = req.clerkId;

        const existing = await CourseLike.findOne({ course: courseId, clerkId });

        if (existing) {
            await CourseLike.deleteOne({ _id: existing._id });
            const count = await CourseLike.countDocuments({ course: courseId });
            return res.json({ success: true, isLiked: false, count });
        }

        await CourseLike.create({ course: courseId, clerkId });
        const count = await CourseLike.countDocuments({ course: courseId });
        res.json({ success: true, isLiked: true, count });
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
});

// ============ BOOKMARKS ============

// Get user's bookmark status for a course
router.get('/:courseId/bookmark', protect, async (req, res) => {
    try {
        const { courseId } = req.params;
        const existing = await CourseBookmark.findOne({ course: courseId, clerkId: req.clerkId });
        res.json({ success: true, isBookmarked: !!existing });
    } catch (error) {
        console.error('Get bookmark error:', error);
        res.status(500).json({ error: 'Failed to get bookmark status' });
    }
});

// Toggle bookmark
router.post('/:courseId/bookmark', protect, async (req, res) => {
    try {
        const { courseId } = req.params;
        const clerkId = req.clerkId;

        const existing = await CourseBookmark.findOne({ course: courseId, clerkId });

        if (existing) {
            await CourseBookmark.deleteOne({ _id: existing._id });
            return res.json({ success: true, isBookmarked: false });
        }

        await CourseBookmark.create({ course: courseId, clerkId });
        res.json({ success: true, isBookmarked: true });
    } catch (error) {
        console.error('Toggle bookmark error:', error);
        res.status(500).json({ error: 'Failed to toggle bookmark' });
    }
});

// Get all bookmarked courses for a user
router.get('/bookmarks/my', protect, async (req, res) => {
    try {
        const bookmarks = await CourseBookmark.find({ clerkId: req.clerkId })
            .populate({
                path: 'course',
                populate: [
                    { path: 'creator', select: 'displayName username avatar_url' },
                    {
                        path: 'videos',
                        select: 'title duration_seconds thumbnail_url order_index cloudinary_url',
                        options: { sort: { order_index: 1 } }
                    }
                ]
            })
            .sort({ createdAt: -1 });

        const courses = bookmarks
            .filter(b => b.course) // filter out deleted courses
            .map(b => b.course);

        res.json({ success: true, courses });
    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({ error: 'Failed to get bookmarks' });
    }
});

// ============ COMMENTS ============

// Get comments for a course
router.get('/:courseId/comments', async (req, res) => {
    try {
        const { courseId } = req.params;
        const comments = await CourseComment.find({ course: courseId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Add a comment
router.post('/:courseId/comments', protect, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { text, userName, userAvatar } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const comment = await CourseComment.create({
            course: courseId,
            clerkId: req.clerkId,
            userName: userName || 'Anonymous',
            userAvatar: userAvatar || '',
            text: text.trim()
        });

        res.json({ success: true, comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete own comment
router.delete('/comments/:commentId', protect, async (req, res) => {
    try {
        const comment = await CourseComment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.clerkId !== req.clerkId) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }

        await CourseComment.deleteOne({ _id: comment._id });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

const CreatorFollow = require('../models/CreatorFollow');
const CreatorProfile = require('../models/CreatorProfile');

// ============ CREATOR FOLLOW ============

// Get follow status + follower count for a creator
router.get('/creator/:creatorClerkId/follow', async (req, res) => {
    try {
        const { creatorClerkId } = req.params;
        const userClerkId = req.query.clerkId || null;

        const followerCount = await CreatorFollow.countDocuments({ creatorClerkId });
        let isFollowing = false;

        if (userClerkId) {
            const existing = await CreatorFollow.findOne({
                followerClerkId: userClerkId,
                creatorClerkId,
            });
            isFollowing = !!existing;
        }

        res.json({ success: true, followerCount, isFollowing });
    } catch (error) {
        console.error('Get follow status error:', error);
        res.status(500).json({ error: 'Failed to get follow status' });
    }
});

// Toggle follow/unfollow a creator
router.post('/creator/:creatorClerkId/follow', protect, async (req, res) => {
    try {
        const { creatorClerkId } = req.params;
        const followerClerkId = req.clerkId;

        // Can't follow yourself
        if (followerClerkId === creatorClerkId) {
            return res.status(400).json({ error: "You can't follow yourself" });
        }

        const existing = await CreatorFollow.findOne({ followerClerkId, creatorClerkId });

        if (existing) {
            // Unfollow
            await CreatorFollow.deleteOne({ _id: existing._id });
            // Decrement creator's total_followers
            await CreatorProfile.findOneAndUpdate(
                { clerkId: creatorClerkId },
                { $inc: { total_followers: -1 } }
            );
            const followerCount = await CreatorFollow.countDocuments({ creatorClerkId });
            return res.json({ success: true, isFollowing: false, followerCount });
        }

        // Follow
        await CreatorFollow.create({ followerClerkId, creatorClerkId });
        // Increment creator's total_followers
        await CreatorProfile.findOneAndUpdate(
            { clerkId: creatorClerkId },
            { $inc: { total_followers: 1 } }
        );
        const followerCount = await CreatorFollow.countDocuments({ creatorClerkId });
        res.json({ success: true, isFollowing: true, followerCount });
    } catch (error) {
        console.error('Toggle follow error:', error);
        res.status(500).json({ error: 'Failed to toggle follow' });
    }
});

// Get creator profile with stats (public)
router.get('/creator/:creatorClerkId/profile', async (req, res) => {
    try {
        const { creatorClerkId } = req.params;
        const creator = await CreatorProfile.findOne({ clerkId: creatorClerkId })
            .select('clerkId username displayName bio avatar_url cover_image_url is_verified total_followers total_courses total_students total_views social_links')
            .lean();

        if (!creator) {
            return res.status(404).json({ error: 'Creator not found' });
        }

        // Get actual follower count from CreatorFollow collection
        const followerCount = await CreatorFollow.countDocuments({ creatorClerkId });

        res.json({
            success: true,
            creator: { ...creator, followerCount },
        });
    } catch (error) {
        console.error('Get creator profile error:', error);
        res.status(500).json({ error: 'Failed to get creator profile' });
    }
});

module.exports = router;
