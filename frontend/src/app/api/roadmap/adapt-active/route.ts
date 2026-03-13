import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Pass the Authorization header along to the backend
        const authHeader = request.headers.get('authorization');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api';
        
        const response = await fetch(`${backendUrl}/roadmap/adapt-active`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[roadmap adapt-active error]', error);
        return NextResponse.json({ error: 'Failed to adapt roadmap', message: error.message }, { status: 500 });
    }
}
