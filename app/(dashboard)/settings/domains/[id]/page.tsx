"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, Copy, ShieldCheck } from "lucide-react";
import { type Domain } from "@prisma/client";
import { toast } from "sonner";

import { ApiClient } from "@/lib/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [domain, setDomain] = useState<Domain | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchDomain = async () => {
    try {
      const res = await ApiClient.fetch(`/api/domains/${id}`);
      setDomain(await res.json());
    } catch (err) {
      toast.error("Failed to load domain details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomain();
  }, [id]);

  const verifyDomain = async () => {
    if (!domain) return;
    setIsVerifying(true);
    
    toast.promise(
      ApiClient.fetch(`/api/domains/${domain.id}/verify`, { method: "POST" }).then((res) => res.json()),
      {
        loading: "Verifying DNS records...",
        success: (data) => {
          fetchDomain();
          return data.status === "VERIFIED" 
            ? "Domain verified successfully!" 
            : `Verification failed. Missing: ${data.failedChecks.join(", ")}`;
        },
        error: (err) => err.message || "Verification failed",
        finally: () => setIsVerifying(false),
      }
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading domain details...</p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Domain not found</h2>
        <Link href="/settings/domains" className={buttonVariants({ variant: "outline" })}>Back to Domains</Link>
      </div>
    );
  }

  const dnsRecords = [
    { type: "MX", host: "@", value: domain.mxRecord, required: true },
    { type: "TXT", host: "@", value: domain.spfRecord, required: true },
    { type: "TXT", host: domain.dkimSelector + "._domainkey", value: domain.dkimPublicKey ? `v=DKIM1; k=rsa; p=${domain.dkimPublicKey}` : "", required: true },
    { type: "TXT", host: "_dmarc", value: domain.dmarcRecord, required: true },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full animate-fade-in">
      <Link href="/settings/domains" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Domains
      </Link>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-heading font-bold tracking-tight">{domain.domain}</h1>
            {domain.status === "VERIFIED" ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1 text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" /> Pending Setup
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Added on {new Date(domain.createdAt).toLocaleDateString()}
          </p>
        </div>

        {domain.status !== "VERIFIED" && (
          <Button onClick={verifyDomain} disabled={isVerifying} className="h-11">
            {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Verify DNS Now
          </Button>
        )}
      </div>

      <Tabs defaultValue="dns" className="w-full">
        <TabsList className="mb-6 bg-muted/50 p-1">
          <TabsTrigger value="dns" className="data-[state=active]:bg-background">DNS Settings</TabsTrigger>
          <TabsTrigger value="general" className="data-[state=active]:bg-background">General</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dns" className="space-y-6">
          <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-muted/20">
              <h3 className="text-xl font-semibold mb-2">DNS Records</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Add these records to your domain's DNS settings at your registrar (e.g. Cloudflare, GoDaddy, Namecheap) to verify ownership and ensure reliable email delivery.
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[200px]">Host / Name</TableHead>
                    <TableHead>Value / Data</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dnsRecords.map((record, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell className="font-mono text-primary font-medium">{record.type}</TableCell>
                      <TableCell className="font-mono text-sm">{record.host}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-md" title={record.value || ""}>
                        {record.value ? (
                          <div className="truncate max-w-[400px] bg-muted/30 p-1.5 rounded border border-white/5">
                            {record.value}
                          </div>
                        ) : (
                          <span className="italic opacity-50">Pending generation</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyToClipboard(record.value || "", `${record.type} record`)}
                          disabled={!record.value}
                          className="h-8 hover:bg-primary/10 hover:text-primary"
                        >
                          <Copy className="w-4 h-4 mr-2" /> Copy
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="glass rounded-xl p-6 border border-primary/20 bg-primary/5">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-lg mb-1 text-primary-foreground">DNS Propagation takes time</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  After adding these records to your DNS provider, it may take anywhere from a few minutes to 24 hours for the changes to propagate globally. You can click "Verify DNS Now" periodically to check the status.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="general">
          <div className="glass-card rounded-xl border border-white/5 p-6">
            <h3 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Deleting a domain will prevent any mailboxes associated with it from sending or receiving email. 
              You must delete all associated mailboxes before you can delete the domain.
            </p>
            <Button variant="destructive" disabled>
              Delete Domain
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
