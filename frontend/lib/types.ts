export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MaterialStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'REVIEWED' | 'PUBLISHED';
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface Material {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  status: MaterialStatus;
  errorMessage: string | null;
  subjectId: string;
  uploadedById: string;
  createdAt: string;
  updatedAt: string;
  subject?: Subject;
  metadata?: MaterialMetadata | null;
}

export interface MaterialMetadata {
  id: string;
  materialId: string;
  title: string | null;
  summary: string | null;
  keywords: string[];
  topics: string[];
  tags: string[];
  difficultyLevel: DifficultyLevel | null;
  contentType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  materialId: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: QuizQuestion[];
  _count?: { questions: number };
  subject?: Subject;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: QuestionType;
  explanation: string | null;
  orderIndex: number;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect?: boolean;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score: number | null;
  totalPoints: number | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  quiz?: Quiz;
  answers?: QuizAttemptAnswer[];
}

export interface QuizAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  question?: QuizQuestion;
  selectedOption?: QuizOption;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  subjectStats: {
    subjectId: string;
    subjectName: string;
    attempts: number;
    averageScore: number;
    bestScore: number;
  }[];
}
