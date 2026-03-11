const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const CreatorProfile = require('../models/CreatorProfile');
const Course = require('../models/Course');
const Video = require('../models/Video');
const cloudinary = require('../config/cloudinary');

function calculateDuration(duration) {
    if (!duration) return 0;
    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return 0;
}

async function deleteFromCloudinary(publicId) {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Failed to delete from Cloudinary:', error);
    }
}

router.get('/check-creator', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        res.json({ isCreator: !!profile, profile });
    } catch (error) {
        console.error('Check creator error:', error);
        res.status(500).json({ error: 'Failed to check creator status' });
    }
});

router.get('/courses', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        
        if (!profile) {
            return res.status(403).json({ error: 'You are not a creator. Please register first.' });
        }

        const courses = await Course.find({ creator: profile._id })
            .populate({
                path: 'videos',
                select: 'title duration_seconds thumbnail_url order_index status',
                options: { sort: { order_index: 1 } }
            })
            .sort({ updatedAt: -1 })
            .lean();

        const formattedCourses = courses.map(course => ({
            ...course,
            totalDuration: course.videos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0)
        }));

        res.json({ success: true, courses: formattedCourses });
    } catch (error) {
        console.error('Get creator courses error:', error);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

router.post('/courses', protect, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId }).session(session);
        
        if (!profile) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'You are not a creator. Please register first.' });
        }

        const { title, description, category, price_per_minute, price_type, thumbnail_url, thumbnail_public_id, level, language, tags, requirements, objectives, videos } = req.body;

        if (!title || !category) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Title and category are required' });
        }

        const validCategories = ['Programming', 'Data Science', 'Web Development', 'Mobile Development', 'DevOps', 'Design', 'Business', 'Marketing', 'Other'];
        if (!validCategories.includes(category)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ error: 'Invalid category' });
        }

        const course = new Course({
            title,
            description: description || '',
            short_description: description ? description.substring(0, 300) : '',
            category,
            price_per_minute: price_per_minute || 0.5,
            price_type: price_type || 'paid',
            thumbnail_url: thumbnail_url || '',
            thumbnail_public_id: thumbnail_public_id || '',
            creator: profile._id,
            creator_clerk_id: req.clerkId,
            level: level || 'All Levels',
            language: language || 'English',
            tags: tags || [],
            requirements: requirements || [],
            objectives: objectives || [],
            status: 'draft'
        });

        await course.save({ session });

        const savedVideos = [];
        if (videos && videos.length > 0) {
            for (let i = 0; i < videos.length; i++) {
                const videoData = videos[i];
                
                if (!videoData.title) continue;

                const video = new Video({
                    title: videoData.title,
                    description: videoData.description || '',
                    cloudinary_url: videoData.cloudinary_url || '',
                    cloudinary_public_id: videoData.cloudinary_public_id || '',
                    thumbnail_url: videoData.thumbnail_url || '',
                    thumbnail_public_id: videoData.thumbnail_public_id || '',
                    duration_seconds: videoData.duration_seconds || 0,
                    order_index: i,
                    course: course._id,
                    status: videoData.cloudinary_url ? 'ready' : 'processing'
                });

                await video.save({ session });
                savedVideos.push(video);
            }
        }

        course.videos = savedVideos.map(v => v._id);
        course.total_videos = savedVideos.length;
        course.total_duration = savedVideos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
        
        await course.save({ session });

        await session.commitTransaction();
        session.endSession();

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'videos',
                options: { sort: { order_index: 1 } }
            })
            .populate('creator', 'displayName username avatar_url');

        res.json({ success: true, courseId: course._id, course: populatedCourse });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

router.get('/courses/:id', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        
        if (!profile) {
            return res.status(403).json({ error: 'You are not a creator' });
        }

        const course = await Course.findOne({
            _id: req.params.id,
            creator: profile._id
        }).populate({
            path: 'videos',
            options: { sort: { order_index: 1 } }
        }).populate('creator', 'displayName username avatar_url');

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ success: true, course });
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Failed to fetch course' });
    }
});

router.put('/courses/:id', protect, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId }).session(session);
        
        if (!profile) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'You are not a creator' });
        }

        const { title, description, category, price_per_minute, price_type, thumbnail_url, thumbnail_public_id, level, language, tags, requirements, objectives, videos, status } = req.body;

        const course = await Course.findOne({
            _id: req.params.id,
            creator: profile._id
        }).session(session);

        if (!course) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Course not found' });
        }

        course.title = title || course.title;
        course.description = description !== undefined ? description : course.description;
        course.short_description = description ? description.substring(0, 300) : course.short_description;
        course.category = category || course.category;
        course.price_per_minute = price_per_minute !== undefined ? price_per_minute : course.price_per_minute;
        course.price_type = price_type || course.price_type;
        course.thumbnail_url = thumbnail_url !== undefined ? thumbnail_url : course.thumbnail_url;
        course.thumbnail_public_id = thumbnail_public_id !== undefined ? thumbnail_public_id : course.thumbnail_public_id;
        course.level = level || course.level;
        course.language = language || course.language;
        course.tags = tags !== undefined ? tags : course.tags;
        course.requirements = requirements !== undefined ? requirements : course.requirements;
        course.objectives = objectives !== undefined ? objectives : course.objectives;
        
        if (status) {
            course.status = status;
            if (status === 'published' && !course.publishedAt) {
                course.publishedAt = new Date();
            }
        }

        if (videos) {
            const existingVideos = await Video.find({ course: course._id }).session(session);
            
            for (const existingVideo of existingVideos) {
                if (existingVideo.cloudinary_public_id) {
                    await deleteFromCloudinary(existingVideo.cloudinary_public_id);
                }
            }
            await Video.deleteMany({ course: course._id }).session(session);

            const savedVideos = [];
            for (let i = 0; i < videos.length; i++) {
                const videoData = videos[i];
                
                if (!videoData.title) continue;

                const video = new Video({
                    title: videoData.title,
                    description: videoData.description || '',
                    cloudinary_url: videoData.cloudinary_url || '',
                    cloudinary_public_id: videoData.cloudinary_public_id || '',
                    thumbnail_url: videoData.thumbnail_url || '',
                    thumbnail_public_id: videoData.thumbnail_public_id || '',
                    duration_seconds: videoData.duration_seconds || 0,
                    order_index: i,
                    course: course._id,
                    status: videoData.cloudinary_url ? 'ready' : 'processing'
                });

                await video.save({ session });
                savedVideos.push(video);
            }

            course.videos = savedVideos.map(v => v._id);
            course.total_videos = savedVideos.length;
            course.total_duration = savedVideos.reduce((acc, v) => acc + (v.duration_seconds || 0), 0);
        }

        await course.save({ session });

        await session.commitTransaction();
        session.endSession();

        const populatedCourse = await Course.findById(course._id)
            .populate({
                path: 'videos',
                options: { sort: { order_index: 1 } }
            })
            .populate('creator', 'displayName username avatar_url');

        res.json({ success: true, course: populatedCourse });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

router.delete('/courses/:id', protect, async (req, res) => {
    const session = await require('mongoose').startSession();
    session.startTransaction();

    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId }).session(session);
        
        if (!profile) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ error: 'You are not a creator' });
        }

        const course = await Course.findOne({
            _id: req.params.id,
            creator: profile._id
        }).session(session);

        if (!course) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Course not found' });
        }

        const videos = await Video.find({ course: course._id }).session(session);
        for (const video of videos) {
            if (video.cloudinary_public_id) {
                await deleteFromCloudinary(video.cloudinary_public_id);
            }
        }

        await Video.deleteMany({ course: course._id }).session(session);
        await Course.findByIdAndDelete(course._id).session(session);

        profile.total_courses = Math.max(0, profile.total_courses - 1);
        await profile.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ success: true });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

router.post('/courses/:id/publish', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        
        if (!profile) {
            return res.status(403).json({ error: 'You are not a creator' });
        }

        const course = await Course.findOne({
            _id: req.params.id,
            creator: profile._id
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (course.total_videos === 0) {
            return res.status(400).json({ error: 'Cannot publish course without videos' });
        }

        course.status = 'published';
        course.publishedAt = new Date();
        await course.save();

        profile.total_courses += 1;
        await profile.save();

        res.json({ success: true, course });
    } catch (error) {
        console.error('Publish course error:', error);
        res.status(500).json({ error: 'Failed to publish course' });
    }
});

router.post('/courses/:id/unpublish', protect, async (req, res) => {
    try {
        const profile = await CreatorProfile.findOne({ clerkId: req.clerkId });
        
        if (!profile) {
            return res.status(403).json({ error: 'You are not a creator' });
        }

        const course = await Course.findOne({
            _id: req.params.id,
            creator: profile._id
        });

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        course.status = 'draft';
        await course.save();

        profile.total_courses = Math.max(0, profile.total_courses - 1);
        await profile.save();

        res.json({ success: true, course });
    } catch (error) {
        console.error('Unpublish course error:', error);
        res.status(500).json({ error: 'Failed to unpublish course' });
    }
});

module.exports = router;