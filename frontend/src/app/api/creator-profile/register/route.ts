import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import api from '@/lib/api';

export async function POST(req: NextRequest) {
    try {
        const { userId, getToken } = getAuth(req);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const token = await getToken();
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator-profile/register`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            return NextResponse.json({ error: data.error || 'Failed to register' }, { status: response.status });
        }
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Creator register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}