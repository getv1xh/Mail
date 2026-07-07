"use client";

import { useState, useEffect } from "react";
import { Plus, Mailbox, Key, Shield, Trash2, Loader2, Edit, MoreVertical, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiClient } from "@/lib/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";

const formSchema = z.object({
  domainId: z.string().min(1, "Please select a domain"),
  localPart: z.string().min(1, "Local part is required").regex(/^[a-z0-9][a-z0-9._+-]{0,62}$/, "Invalid format"),
  displayName: z.string().min(1, "Display name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  storageQuotaMb: z.number().min(100).max(50000),
});

export default function MailboxesPage() {
  const { activeWorkspace } = useWorkspace();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create Mailbox Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      domainId: "",
      localPart: "",
      displayName: "",
      password: "",
      storageQuotaMb: 5120,
    },
  });

  const fetchData = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const [mbRes, dRes] = await Promise.all([
        ApiClient.fetch("/api/mailboxes"),
        ApiClient.fetch("/api/domains")
      ]);
      setMailboxes(await mbRes.json());
      setDomains(await dRes.json());
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeWorkspace]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsAdding(true);
    try {
      const res = await ApiClient.fetch("/api/mailboxes", {
        method: "POST",
        body: JSON.stringify(values),
      });
      const data = await res.json();
      setMailboxes([data, ...mailboxes]);
      setIsAddOpen(false);
      form.reset();
      toast.success("Mailbox created successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create mailbox");
    } finally {
      setIsAdding(false);
    }
  };

  const deleteMailbox = async (id: string) => {
    if (!confirm("Are you sure you want to delete this mailbox? ALL emails will be permanently deleted. This cannot be undone.")) return;
    
    try {
      await ApiClient.fetch(`/api/mailboxes/${id}`, { method: "DELETE" });
      setMailboxes(mailboxes.filter(m => m.id !== id));
      toast.success("Mailbox deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete mailbox");
    }
  };

  // Only allow verified domains for new mailboxes
  const verifiedDomains = domains.filter(d => d.status === "VERIFIED");

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Mailboxes</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage email accounts for your workspace.
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className={buttonVariants({ className: "hover-lift gap-2" })}>
            <Plus className="w-4 h-4" /> Create Mailbox
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] glass-card">
            <DialogHeader>
              <DialogTitle>Create new mailbox</DialogTitle>
              <DialogDescription>
                Provision a new email account in Stalwart.
              </DialogDescription>
            </DialogHeader>
            
            {verifiedDomains.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                <p>You need at least one verified domain before creating mailboxes.</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="domainId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background/50">
                              <SelectValue placeholder="Select a domain" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {verifiedDomains.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.domain}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="localPart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address (prefix)</FormLabel>
                          <FormControl>
                            <Input placeholder="hello" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="bg-background/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isAdding}>
                      {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Mailbox
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : mailboxes.length === 0 ? (
        <div className="glass rounded-xl border-dashed border-2 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mailbox className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">No mailboxes yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Create an email account to start sending and receiving emails.
          </p>
          <Button onClick={() => setIsAddOpen(true)}>Create Mailbox</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mailboxes.map((mailbox) => (
            <div key={mailbox.id} className="glass-card rounded-xl p-5 transition-all hover:border-primary/30 flex flex-col hover-lift group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {mailbox.displayName.charAt(0).toUpperCase()}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" })}>
                    <MoreVertical className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Key className="w-4 h-4 mr-2" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteMailbox(mailbox.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <h3 className="text-lg font-bold truncate mb-1">{mailbox.displayName}</h3>
              <p className="text-sm text-primary mb-4 truncate font-medium">
                {mailbox.localPart}@{mailbox.domain.domain}
              </p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/50">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(mailbox.storageQuotaMb / 1024)}GB Quota
                  </Badge>
                  {mailbox.aliases.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {mailbox.aliases.length} Alias
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 inline mr-1 text-green-500" /> Active
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
