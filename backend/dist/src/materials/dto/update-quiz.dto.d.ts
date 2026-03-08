import { QuestionType } from '@prisma/client';
export declare class UpdateQuizOptionDto {
    id?: string;
    optionText: string;
    isCorrect: boolean;
    orderIndex?: number;
}
export declare class UpdateQuizQuestionDto {
    id?: string;
    questionText: string;
    questionType: QuestionType;
    explanation?: string;
    orderIndex?: number;
    options?: UpdateQuizOptionDto[];
}
export declare class UpdateQuizDto {
    title?: string;
    description?: string;
    isPublished?: boolean;
    questions?: UpdateQuizQuestionDto[];
}
