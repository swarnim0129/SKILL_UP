import { NextResponse } from 'next/server';
import { connectDB, TutorSubject, getClerkId } from '../db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const clerkId = await getClerkId(request);
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { subjectId } = await params;
    await connectDB();

    const result = await TutorSubject.findOneAndDelete({
      _id: subjectId,
      clerkId,
    });

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Subject deleted' });
  } catch (error: any) {
    console.error('[delete-subject] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
