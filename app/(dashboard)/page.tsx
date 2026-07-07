"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Loader2, 
  Mail, 
  Star, 
  Archive, 
  Trash2, 
  Search,
  MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";

import { ApiClient } from "@/lib/api-client";
import { useWorkspace } from "@/components/workspace-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function InboxPage() {
  const { activeWorkspace } = useWorkspace();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!activeWorkspace) return;
    
    const fetchMailboxes = async () => {
      try {
        const res = await ApiClient.fetch("/api/mailboxes");
        const data = await res.json();
        setMailboxes(data);
        if (data.length > 0 && !selectedMailboxId) {
          setSelectedMailboxId(data[0].id);
        }
      } catch (err) {
        toast.error("Failed to load mailboxes");
      }
    };
    
    fetchMailboxes();
  }, [activeWorkspace]);
  
  useEffect(() => {
    if (!selectedMailboxId) return;
    
    const fetchEmails = async () => {
      setIsLoading(true);
      try {
        // In reality, we'd pass the folder name via query param, defaulting to Inbox
        const res = await ApiClient.fetch(`/api/emails?mailboxId=${selectedMailboxId}&folder=Inbox`);
        const data = await res.json();
        setEmails(data);
      } catch (err) {
        toast.error("Failed to load emails");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmails();
  }, [selectedMailboxId]);

  const toggleStar = async (emailId: string, currentStarred: boolean) => {
    // Optimistic update
    setEmails(emails.map(e => e.id === emailId ? { ...e, isStarred: !currentStarred } : e));
    
    try {
      await ApiClient.fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        body: JSON.stringify({ isStarred: !currentStarred, mailboxId: selectedMailboxId }),
      });
    } catch (err) {
      toast.error("Failed to update message");
      // Revert on error
      setEmails(emails.map(e => e.id === emailId ? { ...e, isStarred: currentStarred } : e));
    }
  };

  const markUnread = async (emailId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic update
    setEmails(emails.map(em => em.id === emailId ? { ...em, isUnread: true } : em));
    
    try {
      await ApiClient.fetch(`/api/emails/${emailId}`, {
        method: "PATCH",
        body: JSON.stringify({ isUnread: true, mailboxId: selectedMailboxId }),
      });
    } catch (err) {
      toast.error("Failed to update message");
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <div className="flex-none p-4 border-b border-border/50 flex items-center justify-between bg-background/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-heading font-bold">Inbox</h1>
          {mailboxes.length > 0 && (
            <Select value={selectedMailboxId || undefined} onValueChange={setSelectedMailboxId}>
              <SelectTrigger className="w-[250px] h-9 bg-muted/50 border-border">
                <SelectValue placeholder="Select mailbox" />
              </SelectTrigger>
              <SelectContent>
                {mailboxes.map((mb) => (
                  <SelectItem key={mb.id} value={mb.id}>
                    {mb.localPart}@{mb.domain.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search emails..." 
              className="w-[300px] pl-9 h-9 bg-muted/50 border-border rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : mailboxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No mailboxes found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              You need to create a mailbox first before you can view your inbox.
            </p>
            <Link href="/settings/mailboxes" className={buttonVariants()}>Create Mailbox</Link>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-1">Your inbox is empty</h3>
            <p className="text-muted-foreground text-sm">
              You're all caught up! No new messages.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {emails.map((email) => (
              <Link 
                href={`/emails/${email.id}?mailboxId=${selectedMailboxId}`} 
                key={email.id}
                className={`group flex items-center gap-4 p-3 rounded-lg border transition-all ${
                  email.isUnread 
                    ? "bg-primary/5 border-primary/20 font-semibold text-foreground" 
                    : "bg-card border-border/50 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleStar(email.id, email.isStarred);
                  }}
                  className={`flex-none shrink-0 p-1 rounded hover:bg-background transition-colors ${email.isStarred ? "text-yellow-500" : "text-muted-foreground opacity-50 hover:opacity-100"}`}
                >
                  <Star className={`w-5 h-5 ${email.isStarred ? "fill-yellow-500" : ""}`} />
                </button>
                
                <Avatar className="w-8 h-8 flex-none border border-border">
                  <AvatarFallback className={email.isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                    {email.fromName?.charAt(0).toUpperCase() || email.fromAddress.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="w-48 truncate flex-none">
                    {email.fromName || email.fromAddress}
                  </div>
                  
                  <div className="flex-1 truncate">
                    <span className={email.isUnread ? "text-foreground" : "text-foreground/80"}>
                      {email.subject || "(No Subject)"}
                    </span>
                    <span className="text-muted-foreground ml-2 font-normal">
                      - {email.preview}
                    </span>
                  </div>
                </div>
                
                <div className="flex-none flex items-center gap-3">
                  {/* Hover Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!email.isUnread && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => markUnread(email.id, e)} title="Mark as unread">
                        <Mail className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Archive" onClick={(e) => e.preventDefault()}>
                      <Archive className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Delete" onClick={(e) => e.preventDefault()}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-xs whitespace-nowrap w-16 text-right font-normal">
                    {format(new Date(email.receivedAt), "MMM d")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
