import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category') || '';
        const search = searchParams.get('search') || '';
        const sort = searchParams.get('sort') || '';

        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);

        const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/courses/browse?${params.toString()}`;

        const response = await fetch(backendUrl);
        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { error: data.error || 'Failed to fetch courses' },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Browse courses proxy error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
