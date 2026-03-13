import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import api from '@/lib/api';

export async function GET(req: NextRequest) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/courses`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to fetch courses' }, { status: response.status });
        }
        
        return NextResponse.json({ success: true, courses: data.courses || [] });
    } catch (error) {
        console.error('Creator courses fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/courses`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to create course' }, { status: response.status });
        }
        
        return NextResponse.json({ success: true, courseId: data.course?._id || data.courseId });
    } catch (error) {
        console.error('Creator courses create error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}