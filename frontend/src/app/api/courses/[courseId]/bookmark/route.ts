import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const { courseId } = await params;
        const token = await getToken();
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/courses/${courseId}/bookmark`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Bookmark GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const { courseId } = await params;
        const token = await getToken();
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/courses/${courseId}/bookmark`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            }
        );
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Bookmark POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
