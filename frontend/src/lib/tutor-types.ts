export interface TranscriptEntry {
  role: 'user' | 'persona';
  content: string;
  timestamp: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface QuizResult {
  questions: QuizQuestion[];
  answers: number[]; // user's selected option indices
  score: number;     // number correct
  total: number;     // total questions
  completedAt: string;
}

export interface TutorChapter {
  number: number;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed';
  transcript?: TranscriptEntry[];
  quizResult?: QuizResult;
}

export interface TutorSubjectData {
  _id: string;
  clerkId: string;
  name: string;
  slug: string;
  icon: string;
  chapters: TutorChapter[];
  createdAt: string;
  updatedAt: string;
}
