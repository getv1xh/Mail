import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean the database
  await prisma.auditLog.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.mailboxUserAccess.deleteMany();
  await prisma.mailboxAlias.deleteMany();
  await prisma.mailbox.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  const email = 'admin@vmailx.com';
  const password = 'password123'; // Default admin password

  console.log(`Creating Super Admin with email: ${email} and password: ${password}`);

  // Create user through better-auth so password is encrypted and accounts are linked
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name: 'Super Admin',
    },
    asResponse: true
  });

  // Promote the new user to Super Admin and verify their email
  const user = await prisma.user.update({
    where: { email },
    data: {
      globalRole: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  console.log('Database seeded successfully!');
  console.log('You can now log in at /login with admin@vmailx.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
