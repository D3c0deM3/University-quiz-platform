import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
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
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Admin user created: ${admin.email}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Create a default teacher user
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
        role: Role.TEACHER,
        isActive: true,
      },
    });
    console.log(`✅ Teacher user created: ${teacher.email}`);
  } else {
    console.log(`ℹ️  Teacher user already exists: ${teacherEmail}`);
  }

  // Create a default student user
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
        role: Role.STUDENT,
        isActive: true,
      },
    });
    console.log(`✅ Student user created: ${student.email}`);
  } else {
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
