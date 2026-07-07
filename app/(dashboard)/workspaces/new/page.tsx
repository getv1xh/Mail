"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

import { ApiClient } from "@/lib/api-client";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters."),
});

export default function NewWorkspacePage() {
  const router = useRouter();
  const { refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const res = await ApiClient.fetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify(values),
      });
      
      const newWorkspace = await res.json();
      
      toast.success("Workspace created!");
      
      // Refresh context so it loads the new workspace and sets it as active
      await refreshWorkspaces();
      
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to create workspace");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
      
      <div className="w-full max-w-md animate-slide-up">
        <div className="glass-card rounded-2xl p-8 border-t border-border/50">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto shadow-sm">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold mb-2">Create a Workspace</h1>
            <p className="text-muted-foreground text-sm">
              A workspace is your organization's home for domains, mailboxes, and settings.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workspace Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} className="h-12 bg-background/50" />
                    </FormControl>
                    <FormDescription>
                      This is usually your company or team name.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 hover-lift" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Workspace
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
