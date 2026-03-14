import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Course from '@/models/Course';
import Video from '@/models/Video';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        // Build query
        let query: any = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch courses
        const courses = await Course.find(query).sort({ createdAt: -1 }).lean();

        // Fetch videos for each course
        const coursesWithVideos = await Promise.all(
            courses.map(async (course: any) => {
                const videos = await Video.find({ course_id: course._id })
                    .sort({ order_index: 1 })
                    .select('_id title duration_seconds order_index thumbnail_url cloudinary_url')
                    .lean();

                return {
                    ...course,
                    videos
                };
            })
        );

        return NextResponse.json(coursesWithVideos);
    } catch (error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }
}
