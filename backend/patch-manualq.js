const fs = require('fs');

const servicePath = 'backend/src/materials/materials.service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const injection = `
    const manualQuestionsData = questions.map((q: any) => {
      const allOpts = q.options || [];
      const correctOpt = allOpts.find((o: any) => o.isCorrect || o.correct);
      const answerText = correctOpt?.optionText || correctOpt?.text || q.explanation || allOpts[0]?.optionText || 'No answer provided';
      return {
        questionText: q.questionText || q.question || '',
        answerText,
        subjectId,
        createdById: uploadedById,
        materialId: material.id,
        status: QuestionStatus.APPROVED,
      };
    });

    if (manualQuestionsData.length > 0) {
      // Prisma does not return created relations easily with createMany, but createMany is faster.
      // Q&A Bank needs this.
      await this.prisma.manualQuestion.createMany({
        data: manualQuestionsData
      });
    }

    return { material, quiz };
`;

serviceCode = serviceCode.replace("return { material, quiz };", injection);
fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('materials.service.ts patched for ManualQuestion');
