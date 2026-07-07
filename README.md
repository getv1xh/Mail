# VMailx

VMailx is an invite-only managed SaaS for email infrastructure and mailbox management.

## Architecture & Roles

VMailx operates as an invite-only platform. **Public registration is disabled.** 
Users can only join by receiving an invitation email with a secure token.

There are three primary roles in the system:

1. **Super Admin (Global Role)**
   - Manages the platform.
   - Creates workspaces and assigns the initial Workspace Owner.
   - Does not belong to any customer workspace by default.
2. **Workspace Owner**
   - Full control over their assigned workspace.
   - Can add domains, verify DNS records, and create mailboxes.
   - Can invite other users to the workspace as `ADMIN` or `MEMBER`.
3. **Workspace Member**
   - Can only use assigned mailboxes.
   - Cannot manage domains, mailboxes, or workspace settings.

## Getting Started

### 1. Database Setup & Seeding

First, ensure your environment variables are configured in `.env`.
Then, run the database migrations:

```bash
npx prisma migrate dev
```

Since public registration is disabled, you must bootstrap the initial Super Admin account using the database seed script:

```bash
npx prisma db seed
```

This will create the following Super Admin user:
- **Email:** `admin@vmailx.com`
- **Password:** `password123`

### 2. Run the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage Workflow

1. **Super Admin Login:** Log in with a Super Admin account.
2. **Admin Dashboard:** Navigate to `/admin` to access the Super Admin Dashboard.
3. **Create Workspace:** Click "New Workspace", provide a name, and enter the email address of the Workspace Owner.
4. **Owner Invitation:** The system generates an invite token. In development, the token is printed to the console (e.g., `http://localhost:3000/accept-invite?token=XYZ`).
5. **Accept Invite:** The Workspace Owner opens the invite link, creates their account, and is automatically placed in their new workspace.
6. **Workspace Management:** The Owner can now invite other members using the workspace dashboard.

## Technology Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Prisma](https://www.prisma.io/) (PostgreSQL)
- [Better Auth](https://better-auth.com/) (Authentication)
- Vanilla CSS & Tailwind CSS for styling
