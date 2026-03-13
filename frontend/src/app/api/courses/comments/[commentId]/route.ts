import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ commentId: string }> }
) {
    try {
        const { userId, getToken } = getAuth(req);
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const { commentId } = await params;
        const token = await getToken();
        
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/courses/comments/${commentId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Comment DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
