import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import api from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
    try {
        const { username } = await params;
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/creator-profile/verify-username/${username}`);
        
        const data = await response.json();
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('Verify username error:', error);
        return NextResponse.json({ available: false }, { status: 200 });
    }
}