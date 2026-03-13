import { NextResponse } from 'next/server';
import { connectDB, TutorSubject, getClerkId } from '../db';

// ─── PATCH /api/tutor/update-chapter ──────────────────────────────────────────
// Body: { subjectId, chapterNumber, status?, transcript?, quizResult? }
// Flat route to avoid nested dynamic segment issues with Turbopack.

export async function POST(request: Request) {
  try {
    const clerkId = await getClerkId(request);
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subjectId, chapterNumber, status, transcript, quizResult } = body;

    if (!subjectId || !chapterNumber) {
      return NextResponse.json(
        { success: false, message: 'subjectId and chapterNumber are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const chapterNum = parseInt(chapterNumber, 10);

    // Build the $set update dynamically based on provided fields
    const updateFields: Record<string, any> = {};

    if (status) {
      if (!['not_started', 'in_progress', 'completed'].includes(status)) {
        return NextResponse.json(
          { success: false, message: 'Invalid status' },
          { status: 400 }
        );
      }
      updateFields['chapters.$.status'] = status;
    }

    if (transcript) {
      updateFields['chapters.$.transcript'] = transcript;
    }

    if (quizResult) {
      updateFields['chapters.$.quizResult'] = quizResult;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No fields to update' },
        { status: 400 }
      );
    }

    const subject = await TutorSubject.findOneAndUpdate(
      {
        _id: subjectId,
        clerkId,
        'chapters.number': chapterNum,
      },
      {
        $set: updateFields,
      },
      { new: true }
    );

    if (!subject) {
      return NextResponse.json(
        { success: false, message: 'Subject or chapter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    console.error('[update-chapter] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
