export declare class ManualQuizOptionDto {
    text: string;
    isCorrect: boolean;
}
export declare class ManualQuizQuestionDto {
    questionText: string;
    explanation?: string;
    options: ManualQuizOptionDto[];
}
export declare class CreateManualQuizDto {
    subjectId: string;
    title?: string;
    questions: ManualQuizQuestionDto[];
}
