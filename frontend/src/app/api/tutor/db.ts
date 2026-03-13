import mongoose from 'mongoose';

// ─── MongoDB Connection Singleton ─────────────────────────────────────────────
// Next.js API routes are serverless — each invocation may cold-start.
// We cache the connection on the global object to avoid reconnecting every time.

const MONGODB_URI = process.env.MONGODB_URI!;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalWithMongoose = global as typeof global & {
  mongooseTutor?: MongooseCache;
};

if (!globalWithMongoose.mongooseTutor) {
  globalWithMongoose.mongooseTutor = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongooseTutor;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// ─── TutorSubject Schema ──────────────────────────────────────────────────────

const transcriptEntrySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'persona'], required: true },
    content: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [{ type: String }],
    correctIndex: { type: Number, required: true },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    questions: [quizQuestionSchema],
    answers: [{ type: Number }],
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    completedAt: { type: String, required: true },
  },
  { _id: false }
);

const chapterSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    transcript: [transcriptEntrySchema],
    quizResult: quizResultSchema,
  },
  { _id: false }
);

const tutorSubjectSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    icon: { type: String, default: 'book' },
    chapters: [chapterSchema],
  },
  { timestamps: true }
);

// One subject name per user
tutorSubjectSchema.index({ clerkId: 1, slug: 1 }, { unique: true });
tutorSubjectSchema.index({ clerkId: 1, createdAt: -1 });

export const TutorSubject =
  mongoose.models.TutorSubject ||
  mongoose.model('TutorSubject', tutorSubjectSchema);

// ─── Clerk Auth Helper ────────────────────────────────────────────────────────

export async function getClerkId(
  request: Request
): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];
  if (!token) return null;

  try {
    const { verifyToken } = await import('@clerk/backend');
    const verified = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return verified.sub;
  } catch {
    return null;
  }
}
