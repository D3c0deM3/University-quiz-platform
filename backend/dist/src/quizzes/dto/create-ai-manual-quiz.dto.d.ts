export declare class AiManualQuestionDto {
    questionText: string;
    correctAnswer: string;
}
export declare class CreateAiManualQuizDto {
    subjectId: string;
    title?: string;
    questions: AiManualQuestionDto[];
}
