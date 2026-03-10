import { PrismaService } from '../prisma/prisma.service.js';
export declare class SecureFilesController {
    private prisma;
    constructor(prisma: PrismaService);
    downloadFile(materialId: string, userId: string, role: string, res: any): Promise<void>;
}
