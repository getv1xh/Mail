"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  MoreVertical,
  Star,
  Loader2,
  Paperclip,
  Download
} from "lucide-react";
import { toast } from "sonner";

import { ApiClient } from "@/lib/api-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

export default function ReadEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mailboxId = searchParams.get("mailboxId");

  const [email, setEmail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mailboxId) {
      toast.error("Missing mailbox ID");
      router.push("/");
      return;
    }

    const fetchEmail = async () => {
      try {
        const res = await ApiClient.fetch(`/api/emails/${id}?mailboxId=${mailboxId}`);
        const data = await res.json();
        setEmail(data);
        
        // Mark as read if it was unread
        if (data.isUnread) {
          ApiClient.fetch(`/api/emails/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ isUnread: false, mailboxId }),
          });
        }
      } catch (err) {
        toast.error("Failed to load email");
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEmail();
  }, [id, mailboxId, router]);

  const toggleStar = async () => {
    if (!email) return;
    
    const newStarred = !email.isStarred;
    setEmail({ ...email, isStarred: newStarred });
    
    try {
      await ApiClient.fetch(`/api/emails/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isStarred: newStarred, mailboxId }),
      });
    } catch (err) {
      toast.error("Failed to update message");
      setEmail({ ...email, isStarred: !newStarred });
    }
  };

  const handleAction = async (action: string) => {
    toast.success(`${action} action triggered (Not fully implemented yet)`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!email) return null;

  return (
    <div className="flex flex-col h-full animate-fade-in bg-background">
      {/* Top Toolbar */}
      <div className="flex-none p-2 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1 bg-white/10" />
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAction("Archive")}>
            <Archive className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleAction("Delete")}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Reply className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Forward className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "h-9 w-9" })}>
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAction("Mark Unread")}>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("Print")}>Print</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("View Source")}>View original</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-6 sm:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 gap-4">
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {email.subject || "(No Subject)"}
            </h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleStar}
              className={`mt-1 shrink-0 ${email.isStarred ? "text-yellow-500" : "text-muted-foreground"}`}
            >
              <Star className={`w-6 h-6 ${email.isStarred ? "fill-yellow-500" : ""}`} />
            </Button>
          </div>

          {/* Sender Info */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border border-white/10">
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {email.fromName?.charAt(0).toUpperCase() || email.fromAddress.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-lg">{email.fromName || email.fromAddress}</span>
                  <span className="text-sm text-muted-foreground">&lt;{email.fromAddress}&gt;</span>
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  to me {email.toAddresses.length > 1 && `and ${email.toAddresses.length - 1} more`}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground text-right">
              {format(new Date(email.receivedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>

          {/* Body Content */}
          <div className="prose prose-invert max-w-none text-foreground/90 font-sans mb-12">
            {email.bodyHtml ? (
              <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
            ) : (
              <div className="whitespace-pre-wrap">{email.bodyText}</div>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 mb-4 text-muted-foreground font-medium">
                <Paperclip className="w-4 h-4" />
                <span>{email.attachments.length} Attachments</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {email.attachments.map((att: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-card hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileIcon filename={att.filename} />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{att.filename}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(att.size / 1024)} KB</p>
                      </div>
                    </div>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "ghost", size: "icon", className: "h-8 w-8 opacity-0 group-hover:opacity-100" })}>
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Reply Box Stub */}
          <div className="mt-12">
            <Button variant="outline" className="h-12 w-32 gap-2 text-muted-foreground hover:text-foreground">
              <Reply className="w-4 h-4" />
              Reply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ filename }: { filename: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // A simple icon logic based on extension
  return <Paperclip className="w-4 h-4 text-primary" />;
}
