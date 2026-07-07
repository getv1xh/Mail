"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
  slug: z.string().min(2, "Slug must be at least 2 characters.").optional(),
  ownerEmail: z.string().email("Please enter a valid email for the workspace owner."),
});

type WorkspaceData = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  members: Array<{
    role: string;
    user: {
      email: string;
      name: string;
    };
  }>;
  _count: {
    domains: number;
    mailboxes: number;
  };
};

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<z.infer<typeof createWorkspaceSchema>>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: "",
      slug: "",
      ownerEmail: "",
    },
  });

  async function fetchWorkspaces() {
    try {
      const res = await fetch("/api/admin/workspaces");
      if (!res.ok) throw new Error("Failed to load workspaces");
      const data = await res.json();
      setWorkspaces(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  async function onSubmit(values: z.infer<typeof createWorkspaceSchema>) {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create workspace");
      }

      toast.success("Workspace created and owner invited successfully!");
      setIsDialogOpen(false);
      form.reset();
      fetchWorkspaces();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage platform workspaces and configurations.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="hover-lift" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Workspace
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Slug (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="acme" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email</FormLabel>
                      <FormControl>
                        <Input placeholder="ceo@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-4" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create & Invite Owner
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">All Workspaces</h2>
          {workspaces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workspaces found. Create one to get started.
            </div>
          ) : (
            <div className="divide-y">
              {workspaces.map((workspace) => {
                const owner = workspace.members.find(m => m.role === "OWNER")?.user;
                return (
                  <div key={workspace.id} className="py-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-lg">{workspace.name}</div>
                      <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                        <span>Slug: {workspace.slug}</span>
                        <span>Plan: {workspace.plan}</span>
                        <span>Status: <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{workspace.status}</span></span>
                      </div>
                      <div className="text-sm mt-2 text-muted-foreground">
                        Owner: {owner ? `${owner.name} (${owner.email})` : "Pending Acceptance"}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{workspace._count.domains} Domains</div>
                      <div>{workspace._count.mailboxes} Mailboxes</div>
                      <div>{workspace.members.length} Members</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
