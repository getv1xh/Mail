"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Inbox, 
  Send, 
  FileText, 
  AlertCircle, 
  Trash2, 
  Archive, 
  Settings, 
  Globe, 
  Mailbox,
  ChevronDown,
  ChevronUp,
  LogOut,
  Plus
} from "lucide-react";

import { useWorkspace } from "@/components/workspace-provider";
import { useSession, signOut } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeWorkspace, workspaces, setActiveWorkspace } = useWorkspace();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navGroups = [
    {
      title: "Mail",
      items: [
        { title: "Inbox", icon: Inbox, href: "/", badge: "12" },
        { title: "Sent", icon: Send, href: "/sent" },
        { title: "Drafts", icon: FileText, href: "/drafts" },
        { title: "Spam", icon: AlertCircle, href: "/spam" },
        { title: "Trash", icon: Trash2, href: "/trash" },
        { title: "Archive", icon: Archive, href: "/archive" },
      ]
    },
    {
      title: "Workspace",
      items: [
        { title: "Domains", icon: Globe, href: "/settings/domains" },
        { title: "Mailboxes", icon: Mailbox, href: "/settings/mailboxes" },
        { title: "Settings", icon: Settings, href: "/settings/workspace" },
      ]
    }
  ];

  return (
    <div className="w-64 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col transition-all">
      {/* Workspace Selector */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "w-full justify-start px-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" })}>
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm shrink-0">
              {activeWorkspace?.name.charAt(0).toUpperCase() || "W"}
            </div>
            <span className="font-semibold truncate flex-1 text-left">{activeWorkspace?.name || "Workspace"}</span>
            <ChevronUp className="w-4 h-4 ml-auto opacity-50 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="top">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem 
                key={ws.id} 
                onClick={() => setActiveWorkspace(ws.id)}
                className={activeWorkspace?.id === ws.id ? "bg-accent/50" : ""}
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/workspaces/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Compose Button */}
      <div className="p-4">
        <Link href="/compose" className={buttonVariants({ className: "w-full justify-start gap-2 h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover-lift" })}>
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
          <span className="font-medium">New Message</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {navGroups.map((group, i) => (
          <div key={i}>
            <h4 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
              {group.title}
            </h4>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                return (
                  <Link href={item.href} key={item.title}>
                    <span
                      className={`flex items-center justify-between px-2 py-2 rounded-md transition-colors ${
                        isActive 
                          ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" 
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? "text-sidebar-primary" : "opacity-70"}`} />
                        <span className="text-sm">{item.title}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-sidebar-primary text-sidebar-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", className: "w-full justify-start px-2 hover:bg-sidebar-accent h-12" })}>
            <Avatar className="w-8 h-8 mr-3 border border-border">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start truncate">
              <span className="text-sm font-medium leading-none">{session?.user?.name || "User"}</span>
              <span className="text-xs text-muted-foreground mt-1 truncate max-w-[120px]">
                {session?.user?.email}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" side="right">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
