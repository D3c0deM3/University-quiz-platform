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

  // Delete old seed users by email (from previous seeds)
  const oldEmails = ['admin@university.com', 'teacher@university.com', 'student@university.com'];
  for (const email of oldEmails) {
    try {
      await prisma.user.delete({ where: { email } });
      console.log(`🗑️  Deleted old user: ${email}`);
    } catch {
      // user might not exist
    }
  }

  // Also clean up by phone in case seed was run before
  const seedPhones = ['+998914476508', '+998901111111', '+998902222222'];
  for (const phone of seedPhones) {
    try {
      await prisma.user.delete({ where: { phone } });
      console.log(`🗑️  Deleted old user with phone: ${phone}`);
    } catch {
      // user might not exist
    }
  }

  // Create default admin user
  const adminPhone = '+998914476508';
  const hashedAdminPass = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: `${adminPhone}@phone.local`,
      phone: adminPhone,
      password: hashedAdminPass,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.phone} (password: admin123)`);

  // Create a default teacher user
  const teacherPhone = '+998901111111';
  const hashedTeacherPass = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.create({
    data: {
      email: `${teacherPhone}@phone.local`,
      phone: teacherPhone,
      password: hashedTeacherPass,
      firstName: 'Default',
      lastName: 'Teacher',
      role: Role.TEACHER,
      isActive: true,
    },
  });
  console.log(`✅ Teacher created: ${teacher.phone} (password: teacher123)`);

  // Create a default student user
  const studentPhone = '+998902222222';
  const hashedStudentPass = await bcrypt.hash('student123', 10);
  const student = await prisma.user.create({
    data: {
      email: `${studentPhone}@phone.local`,
      phone: studentPhone,
      password: hashedStudentPass,
      firstName: 'Default',
      lastName: 'Student',
      role: Role.STUDENT,
      isActive: true,
    },
  });
  console.log(`✅ Student created: ${student.phone} (password: student123)`);

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
