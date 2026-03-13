import { NextResponse } from 'next/server';
import { connectDB, TutorSubject, getClerkId } from '../../../db';

// ─── PATCH /api/tutor/[subjectId]/chapters/[chapterNumber] ────────────────────
// Supports updating: status, transcript, quizResult
// Body can contain any combination of: { status, transcript, quizResult }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterNumber: string }> }
) {
  try {
    const clerkId = await getClerkId(request);
    if (!clerkId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { subjectId, chapterNumber } = await params;
    const body = await request.json();
    const { status, transcript, quizResult } = body;

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
      // Transcript is an array of { role, content, timestamp }
      updateFields['chapters.$.transcript'] = transcript;
    }

    if (quizResult) {
      // QuizResult: { questions, answers, score, total, completedAt }
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
