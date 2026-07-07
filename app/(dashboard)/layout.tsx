"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { useWorkspace } from "@/components/workspace-provider";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const { workspaces, isLoading: workspacesLoading } = useWorkspace();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    // If not loading, has session, but no workspaces
    if (!isPending && session && !workspacesLoading && workspaces.length === 0) {
      // @ts-expect-error globalRole is dynamically added
      const isSuperAdmin = session.user?.globalRole === "SUPER_ADMIN";
      
      if (isSuperAdmin && !pathname.startsWith("/admin")) {
        router.push("/admin");
      } else if (!isSuperAdmin && pathname !== "/workspaces/new" && !pathname.startsWith("/admin")) {
        // Normal users without workspaces should not create workspaces anymore
        // They should see an error or waiting screen. 
        // For now, let's redirect to a "waiting-for-invite" page or just show it here.
        router.push("/waiting-for-invite");
      }
    }
  }, [session, isPending, workspaces, workspacesLoading, pathname, router]);

  if (isPending || (session && workspacesLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  // If they have no workspaces and they are on a special page, render without sidebar
  if (workspaces.length === 0 && (pathname === "/workspaces/new" || pathname === "/waiting-for-invite" || pathname.startsWith("/admin"))) {
    return <>{children}</>;
  }

  // Normal Dashboard layout
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto z-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
