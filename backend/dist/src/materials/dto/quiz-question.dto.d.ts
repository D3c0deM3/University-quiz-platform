import { QuestionType } from '@prisma/client';
declare class CreateQuizOptionDto {
    optionText: string;
    isCorrect: boolean;
    orderIndex?: number;
}
export declare class CreateQuizQuestionDto {
    quizId: string;
    questionText: string;
    questionType: QuestionType;
    explanation?: string;
    orderIndex?: number;
    options?: CreateQuizOptionDto[];
}
export declare class UpdateSingleQuestionDto {
    questionText?: string;
    questionType?: QuestionType;
    explanation?: string;
    orderIndex?: number;
    options?: CreateQuizOptionDto[];
}
export {};
