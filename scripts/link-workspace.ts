import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide an email: npx tsx scripts/link-workspace.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error("No workspaces found in the database. Please run seed script first.");
    process.exit(1);
  }

  // Add user to workspace
  await prisma.workspaceMember.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'OWNER'
    }
  });

  // Also give them access to all mailboxes in this workspace
  const mailboxes = await prisma.mailbox.findMany({ where: { workspaceId: workspace.id } });
  for (const mb of mailboxes) {
    await prisma.mailboxUserAccess.create({
      data: {
        userId: user.id,
        mailboxId: mb.id,
        permission: 'OWNER'
      }
    });
  }

  console.log(`Successfully linked ${email} to workspace ${workspace.name}!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
