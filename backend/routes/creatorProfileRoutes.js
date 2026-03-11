const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const CreatorProfile = require('../models/CreatorProfile');
const Course = require('../models/Course');
const Follow = require('../models/Follow');
const Candidate = require('../models/Candidate');

router.post('/register', protect, async (req, res) => {
    try {
        const { username, displayName, gender, bio } = req.body;
        
        if (!username || !displayName || !gender) {
            return res.status(400).json({ error: 'Username, display name, and gender are required' });
        }

        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (!validGenders.includes(gender)) {
            return res.status(400).json({ error: 'Invalid gender' });
        }

        const existingProfile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        if (existingProfile) {
            return res.status(400).json({ error: 'You are already a creator' });
        }

        const existingUsername = await CreatorProfile.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({ error: 'Username is already taken' });
        }

        const profile = new CreatorProfile({
            clerkId: req.clerkId,
            username: username.toLowerCase(),
            displayName,
            gender,
            bio: bio || '',
            status: 'approved',
            approvedAt: new Date()
        });

        await profile.save();

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Creator register error:', error);
        res.status(500).json({ error: 'Failed to register as creator' });
    }
});

router.get('/me', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        
        if (!profile) {
            return res.status(404).json({ error: 'Creator profile not found' });
        }

        const courses = await Course.find({ 
            creator: profile._id,
            status: 'published'
        }).select('-videos');

        res.json({ success: true, profile, courses });
    } catch (error) {
        console.error('Get creator profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

router.put('/me', protect, async (req, res) => {
    try {
        const { displayName, bio, avatar_url, cover_image_url, social_links } = req.body;

        const profile = await CreatorProfile.findOneAndUpdate(
            { clerkId: req.clerkId },
            { 
                displayName, 
                bio, 
                avatar_url, 
                cover_image_url, 
                social_links 
            },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Creator profile not found' });
        }

        res.json({ success: true, profile });
    } catch (error) {
        console.error('Update creator profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

router.get('/username/:username', async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ 
            username: req.params.username.toLowerCase(),
            status: 'approved'
        }).select('-clerkId');

        if (!profile) {
            return res.status(404).json({ error: 'Creator not found' });
        }

        const courses = await Course.find({ 
            creator: profile._id,
            status: 'published'
        }).select('-videos').populate('creator', 'displayName avatar_url username');

        res.json({ success: true, profile, courses });
    } catch (error) {
        console.error('Get creator by username error:', error);
        res.status(500).json({ error: 'Failed to get creator' });
    }
});

router.get('/verify-username/:username', async (req, res) => {
    try {
        const existing = await CreatorProfile.findOne({ 
            username: req.params.username.toLowerCase() 
        });
        
        res.json({ available: !existing });
    } catch (error) {
        console.error('Verify username error:', error);
        res.status(500).json({ error: 'Failed to verify username' });
    }
});

router.post('/follow/:creatorId', protect, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const candidate = await Candidate.findOne({ clerkId: req.clerkId }).session(session);
        
        if (!candidate) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Candidate not found' });
        }

        const creator = await CreatorProfile.findById(req.params.creatorId).session(session);
        
        if (!creator) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Creator not found' });
        }

        if (creator.clerkId === req.clerkId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const existingFollow = await Follow.findOne({
            follower: candidate._id,
            following: creator._id
        }).session(session);

        if (existingFollow) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Already following this creator' });
        }

        const follow = new Follow({
            follower: candidate._id,
            following: creator._id
        });

        await follow.save({ session });

        creator.total_followers += 1;
        await creator.save({ session });

        candidate.total_following += 1;
        await candidate.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ success: true, message: 'Now following this creator' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Follow error:', error);
        res.status(500).json({ error: 'Failed to follow creator' });
    }
});

router.delete('/follow/:creatorId', protect, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const candidate = await Candidate.findOne({ clerkId: req.clerkId }).session(session);
        
        if (!candidate) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Candidate not found' });
        }

        const follow = await Follow.findOneAndDelete({
            follower: candidate._id,
            following: req.params.creatorId
        }).session(session);

        if (!follow) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Not following this creator' });
        }

        await CreatorProfile.findByIdAndUpdate(req.params.creatorId, {
            $inc: { total_followers: -1 }
        }, { session });

        await Candidate.findByIdAndUpdate(candidate._id, {
            $inc: { total_following: -1 }
        }, { session });

        await session.commitTransaction();
        session.endSession();

        res.json({ success: true, message: 'Unfollowed successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Unfollow error:', error);
        res.status(500).json({ error: 'Failed to unfollow creator' });
    }
});

router.get('/followers/:creatorId', async (req, res) => {
    try {
        const follows = await Follow.find({ following: req.params.creatorId })
            .populate('follower', 'fullName email')
            .sort({ createdAt: -1 });

        const followers = follows.map(f => f.follower);
        
        res.json({ success: true, followers });
    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ error: 'Failed to get followers' });
    }
});

router.get('/following', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ clerkId: req.clerkId });
        
        if (!candidate) {
            return res.status(400).json({ error: 'Candidate not found' });
        }

        const follows = await Follow.find({ follower: candidate._id })
            .populate({
                path: 'following',
                select: '-clerkId'
            })
            .sort({ createdAt: -1 });

        const following = follows.map(f => f.following);
        
        res.json({ success: true, following });
    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ error: 'Failed to get following' });
    }
});

router.get('/check-follow/:creatorId', protect, async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ clerkId: req.clerkId });
        
        if (!candidate) {
            return res.json({ isFollowing: false });
        }

        const follow = await Follow.findOne({
            follower: candidate._id,
            following: req.params.creatorId
        });

        res.json({ isFollowing: !!follow });
    } catch (error) {
        console.error('Check follow error:', error);
        res.status(500).json({ error: 'Failed to check follow status' });
    }
});

module.exports = router;