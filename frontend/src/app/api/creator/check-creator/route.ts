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
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator/check-creator`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        const data = await response.json();
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Check creator error:', error);
        return NextResponse.json({ isCreator: false, profile: null }, { status: 200 });
    }
}