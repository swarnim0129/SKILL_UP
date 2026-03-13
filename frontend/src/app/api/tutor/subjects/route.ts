import { NextResponse } from 'next/server';
import { connectDB, TutorSubject, getClerkId } from '../db';

export async function GET(request: Request) {
  try {
    const clerkId = await getClerkId(request);
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const subjects = await TutorSubject.find({ clerkId }).sort({
      createdAt: -1,
    });

    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    console.error('[subjects] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
