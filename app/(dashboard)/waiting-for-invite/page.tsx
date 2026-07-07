"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function WaitingForInvitePage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <h2 className="text-3xl font-bold font-heading">Waiting for Invite</h2>
        <p className="text-muted-foreground text-lg">
          You are currently not a member of any workspace. 
          Please wait for a Workspace Owner to invite you.
        </p>
        <p className="text-sm text-muted-foreground/80">
          Logged in as {session.user.email}
        </p>
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
