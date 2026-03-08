export declare class SubmitAnswerDto {
    questionId: string;
    selectedOptionId?: string;
    textAnswer?: string;
}
export declare class SubmitQuizDto {
    answers: SubmitAnswerDto[];
}
