"use client";

import { useState, useEffect } from "react";
import { Plus, Globe, AlertCircle, CheckCircle2, Shield, Trash2, Loader2, ArrowRight } from "lucide-react";
import { type Domain } from "@prisma/client";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/components/workspace-provider";

export default function DomainsPage() {
  const { activeWorkspace } = useWorkspace();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add Domain Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchDomains = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const res = await ApiClient.fetch("/api/domains");
      setDomains(await res.json());
    } catch (err) {
      toast.error("Failed to load domains");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [activeWorkspace]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;
    
    setIsAdding(true);
    try {
      const res = await ApiClient.fetch("/api/domains", {
        method: "POST",
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();
      setDomains([data, ...domains]);
      setNewDomain("");
      setIsAddOpen(false);
      toast.success("Domain added successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add domain");
    } finally {
      setIsAdding(false);
    }
  };

  const verifyDomain = async (id: string) => {
    toast.promise(
      ApiClient.fetch(`/api/domains/${id}/verify`, { method: "POST" }).then((res) => res.json()),
      {
        loading: "Verifying DNS records...",
        success: (data) => {
          fetchDomains(); // Refresh list
          return data.status === "VERIFIED" 
            ? "Domain verified successfully!" 
            : `Verification failed. Missing: ${data.failedChecks.join(", ")}`;
        },
        error: (err) => err.message || "Verification failed",
      }
    );
  };

  const deleteDomain = async (id: string) => {
    if (!confirm("Are you sure you want to delete this domain? This cannot be undone.")) return;
    
    try {
      await ApiClient.fetch(`/api/domains/${id}`, { method: "DELETE" });
      setDomains(domains.filter(d => d.id !== id));
      toast.success("Domain deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete domain");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground mt-1">
            Manage your custom email domains and DNS records.
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger className={buttonVariants({ className: "hover-lift gap-2" })}>
            <Plus className="w-4 h-4" /> Add Domain
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] glass-card">
            <form onSubmit={handleAddDomain}>
              <DialogHeader>
                <DialogTitle>Add a new domain</DialogTitle>
                <DialogDescription>
                  Enter the domain you want to use for your email addresses.
                </DialogDescription>
              </DialogHeader>
              <div className="py-6">
                <div className="space-y-2">
                  <label htmlFor="domain" className="text-sm font-medium">
                    Domain Name
                  </label>
                  <Input
                    id="domain"
                    placeholder="example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newDomain || isAdding}>
                  {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Domain
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : domains.length === 0 ? (
        <div className="glass rounded-xl border-dashed border-2 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold mb-2">No domains yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Add a custom domain to start creating professional email addresses for your team.
          </p>
          <Button onClick={() => setIsAddOpen(true)}>Add your first domain</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <div key={domain.id} className="glass rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all hover:border-primary/50">
              <div className="flex items-start gap-4">
                <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  domain.status === "VERIFIED" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                }`}>
                  {domain.status === "VERIFIED" ? <Shield className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{domain.domain}</h3>
                    {domain.status === "VERIFIED" ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                        Pending Setup
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Added {new Date(domain.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-border">
                {domain.status !== "VERIFIED" && (
                  <Button variant="secondary" onClick={() => verifyDomain(domain.id)}>
                    Verify DNS
                  </Button>
                )}
                <a href={`/settings/domains/${domain.id}`} className={buttonVariants({ variant: "outline" })}>
                  Manage <ArrowRight className="w-4 h-4 ml-2" />
                </a>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteDomain(domain.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
