const fs = require('fs');

const servicePath = 'backend/src/materials/materials.service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

if (!serviceCode.includes('uploadJson(')) {
const newMethod = `
  async uploadJson(
    file: Express.Multer.File,
    subjectId: string,
    uploadedById: string,
    title?: string,
  ) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    this.validateFile(file);

    const jsonContent = fsSync.readFileSync(file.path, 'utf8');
    let parsedData;
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (e) {
      throw new BadRequestException('Invalid JSON file format');
    }

    const questions = parsedData.questions || parsedData;
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException('JSON must contain an array of questions');
    }

    const material = await this.prisma.material.create({
      data: {
        fileName: file.filename,
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        filePath: this.normalizeRelativePath(file.path),
        fileType: 'JSON',
        fileSize: file.size,
        subjectId,
        uploadedById,
        status: MaterialStatus.PROCESSED,
        processingProgress: 100,
        processingStage: 'Imported via JSON',
        metadata: {
          create: {
            title: title || 'Imported JSON Quiz',
            contentType: 'JSON Quiz',
            pageCount: 1,
          },
        },
      },
    });

    const quiz = await this.prisma.quiz.create({
      data: {
        title: title || 'Imported Quiz',
        subjectId,
        materialId: material.id,
        isPublished: false,
        questions: {
          create: questions.map((q: any, i: number) => ({
            questionText: q.questionText || q.question || '',
            questionType: q.questionType || 'MCQ',
            explanation: q.explanation || '',
            orderIndex: i,
            options: {
              create: (q.options || []).map((opt: any, optIdx: number) => ({
                optionText: opt.optionText || opt.text || '',
                isCorrect: !!(opt.isCorrect || opt.correct),
                orderIndex: optIdx,
              })),
            },
          })),
        },
      },
      include: {
        questions: {
          include: { options: true }
        }
      }
    });

    return { material, quiz };
  }
`;

serviceCode = serviceCode.replace("import { Subject } from '@prisma/client';", "import { Subject } from '@prisma/client';\nimport * as fsSync from 'fs';");
if(!serviceCode.includes("import * as fsSync from 'fs';")) {
  serviceCode = "import * as fsSync from 'fs';\n" + serviceCode;
}

const splitService = serviceCode.split('async upload(');
serviceCode = splitService[0] + newMethod + '\n  async upload(' + splitService[1];
fs.writeFileSync(servicePath, serviceCode, 'utf8');
console.log('materials.service.ts patched');
} else {
  console.log('materials.service.ts already patched');
}

const controllerPath = 'backend/src/materials/materials.controller.ts';
let controllerCode = fs.readFileSync(controllerPath, 'utf8');

if (!controllerCode.includes("@Post('upload-json')")) {
const newEndpoint = `
  @Post('upload-json')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(FilesInterceptor('file', 1, multerOptions))
  async uploadJson(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('subjectId') subjectId: string,
    @Body('title') title: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('A JSON file is required');
    }
    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }

    const result = await this.materialsService.uploadJson(
      files[0],
      subjectId,
      userId,
      title
    );
    return {
      message: 'JSON file processed and quiz created successfully',
      material: result.material,
      quiz: result.quiz
    };
  }
`;

const splitController = controllerCode.split("@Post('upload')");
controllerCode = splitController[0] + newEndpoint + '\n  @Post(\'upload\')' + splitController[1];
fs.writeFileSync(controllerPath, controllerCode, 'utf8');
console.log('materials.controller.ts patched');
} else {
  console.log('materials.controller.ts already patched');
}

