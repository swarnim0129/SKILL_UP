import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId } = await params;
        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/courses/${courseId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to fetch course' }, { status: response.status });
        }
        
        return NextResponse.json({ success: true, course: data.course });
    } catch (error) {
        console.error('Creator course fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId } = await params;
        const body = await req.json();
        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/courses/${courseId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to update course' }, { status: response.status });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Creator course update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { courseId } = await params;
        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/courses/${courseId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to delete course' }, { status: response.status });
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Creator course delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}