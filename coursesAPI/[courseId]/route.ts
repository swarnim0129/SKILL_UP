import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Course from '@/models/Course';
import Video from '@/models/Video';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        await connectToDatabase();
        const { courseId } = await params;

        const course = await Course.findById(courseId);
        if (!course) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        const videos = await Video.find({ course_id: courseId }).sort({ order_index: 1 });

        return NextResponse.json({ ...course.toObject(), videos });
    } catch (error) {
        console.error('Error fetching course details:', error);
        return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
    }
}
