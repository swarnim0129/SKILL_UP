import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ creatorClerkId: string }> }
) {
    try {
        const { creatorClerkId } = await params;
        const { userId } = getAuth(req);
        const url = `${API_URL}/courses/creator/${creatorClerkId}/follow${userId ? `?clerkId=${userId}` : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Follow GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ creatorClerkId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { creatorClerkId } = await params;
        const token = await getToken();
        const response = await fetch(
            `${API_URL}/courses/creator/${creatorClerkId}/follow`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            }
        );
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Follow POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
