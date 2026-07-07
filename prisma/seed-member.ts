import { PrismaClient } from '@prisma/client';
import { auth } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding member account...');

  const email = 'member@vmailx.com';
  const password = 'password123';

  // 1. Create the user
  console.log(`Creating Member with email: ${email} and password: ${password}`);
  let memberUser = await prisma.user.findUnique({ where: { email } });
  
  if (!memberUser) {
    const res = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: 'Normal Member',
      },
      asResponse: true
    });
    
    // Update email verified
    memberUser = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
    });
  }

  // 2. Create a test Workspace
  let workspace = await prisma.workspace.findUnique({ where: { slug: 'test-workspace' } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Test Workspace',
        slug: 'test-workspace',
        plan: 'FREE',
      }
    });
  }

  // 3. Add user to workspace as MEMBER
  const memberExists = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: memberUser.id
      }
    }
  });

  if (!memberExists) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: memberUser.id,
        role: 'MEMBER'
      }
    });
  }

  // 4. Create a test domain
  let domain = await prisma.domain.findFirst({ where: { domain: 'example.com' } });
  if (!domain) {
    domain = await prisma.domain.create({
      data: {
        workspaceId: workspace.id,
        domain: 'example.com',
        status: 'VERIFIED',
        mxRecord: 'mx.example.com',
        spfRecord: 'v=spf1 include:example.com ~all',
        dkimPublicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA',
        dkimPrivateKey: 'encrypted_key_placeholder',
        dmarcRecord: 'v=DMARC1; p=none'
      }
    });
  }

  // 5. Create a mailbox
  let mailbox = await prisma.mailbox.findUnique({
    where: {
      domainId_localPart: {
        domainId: domain.id,
        localPart: 'john'
      }
    }
  });

  if (!mailbox) {
    mailbox = await prisma.mailbox.create({
      data: {
        workspaceId: workspace.id,
        domainId: domain.id,
        localPart: 'john',
        displayName: 'John Doe',
        stalwartId: 'john@example.com'
      }
    });
  }

  // 6. Give the member access to this mailbox
  const accessExists = await prisma.mailboxUserAccess.findUnique({
    where: {
      mailboxId_userId: {
        mailboxId: mailbox.id,
        userId: memberUser.id
      }
    }
  });

  if (!accessExists) {
    await prisma.mailboxUserAccess.create({
      data: {
        mailboxId: mailbox.id,
        userId: memberUser.id,
        permission: 'OWNER'
      }
    });
  }

  console.log('Member account seeded successfully!');
  console.log('You can now log in at /login with member@vmailx.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
