"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.default.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding database...');
    const adminEmail = 'admin@university.com';
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail },
    });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Admin',
                role: client_1.Role.ADMIN,
                isActive: true,
            },
        });
        console.log(`✅ Admin user created: ${admin.email}`);
    }
    else {
        console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }
    const teacherEmail = 'teacher@university.com';
    const existingTeacher = await prisma.user.findUnique({
        where: { email: teacherEmail },
    });
    if (!existingTeacher) {
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        const teacher = await prisma.user.create({
            data: {
                email: teacherEmail,
                password: hashedPassword,
                firstName: 'Default',
                lastName: 'Teacher',
                role: client_1.Role.TEACHER,
                isActive: true,
            },
        });
        console.log(`✅ Teacher user created: ${teacher.email}`);
    }
    else {
        console.log(`ℹ️  Teacher user already exists: ${teacherEmail}`);
    }
    const studentEmail = 'student@university.com';
    const existingStudent = await prisma.user.findUnique({
        where: { email: studentEmail },
    });
    if (!existingStudent) {
        const hashedPassword = await bcrypt.hash('student123', 10);
        const student = await prisma.user.create({
            data: {
                email: studentEmail,
                password: hashedPassword,
                firstName: 'Default',
                lastName: 'Student',
                role: client_1.Role.STUDENT,
                isActive: true,
            },
        });
        console.log(`✅ Student user created: ${student.email}`);
    }
    else {
        console.log(`ℹ️  Student user already exists: ${studentEmail}`);
    }
    console.log('🌱 Seeding complete!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map