"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Save, Paperclip, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiClient } from "@/lib/api-client";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const formSchema = z.object({
  mailboxId: z.string().min(1, "Please select an outgoing mailbox"),
  to: z.string().min(1, "Recipient is required"), // Basic validation for now, could be split by comma
  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().min(1, "Message body cannot be empty"),
});

export default function ComposePage() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspace();
  const [mailboxes, setMailboxes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mailboxId: "",
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
    },
  });

  useEffect(() => {
    if (!activeWorkspace) return;
    
    const fetchMailboxes = async () => {
      try {
        const res = await ApiClient.fetch("/api/mailboxes");
        const data = await res.json();
        setMailboxes(data);
        if (data.length > 0) {
          form.setValue("mailboxId", data[0].id);
        }
      } catch (err) {
        toast.error("Failed to load mailboxes");
      }
    };
    
    fetchMailboxes();
  }, [activeWorkspace, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>, isDraft = false) => {
    const setLoading = isDraft ? setIsSavingDraft : setIsLoading;
    setLoading(true);
    
    try {
      const payload = {
        mailboxId: values.mailboxId,
        toAddresses: values.to.split(",").map(e => e.trim()).filter(Boolean),
        ccAddresses: values.cc ? values.cc.split(",").map(e => e.trim()).filter(Boolean) : [],
        bccAddresses: values.bcc ? values.bcc.split(",").map(e => e.trim()).filter(Boolean) : [],
        subject: values.subject || "(No Subject)",
        bodyHtml: values.body,
        bodyText: values.body.replace(/<[^>]*>?/gm, ''), // Very basic HTML strip
        isDraft,
      };

      await ApiClient.fetch("/api/emails", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success(isDraft ? "Draft saved" : "Email sent successfully");
      router.push("/"); // Back to inbox
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in bg-background">
      <div className="flex-none p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-heading font-bold">New Message</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => onSubmit(form.getValues(), true)} 
            disabled={isLoading || isSavingDraft}
            className="hover-lift border-white/10"
          >
            {isSavingDraft ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button 
            onClick={form.handleSubmit((v) => onSubmit(v, false))} 
            disabled={isLoading || isSavingDraft}
            className="hover-lift min-w-[100px]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full p-6">
          <Form {...form}>
            <form className="space-y-4">
              {mailboxes.length > 0 && (
                <FormField
                  control={form.control}
                  name="mailboxId"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 border-b border-white/5 pb-2">
                      <FormLabel className="w-24 text-muted-foreground font-medium">From</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-0 shadow-none bg-transparent hover:bg-white/5 h-8">
                            <SelectValue placeholder="Select sender..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mailboxes.map((mb) => (
                            <SelectItem key={mb.id} value={mb.id}>
                              {mb.displayName} &lt;{mb.localPart}@{mb.domain.domain}&gt;
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-y-0 border-b border-white/5 pb-2">
                    <FormLabel className="w-24 text-muted-foreground font-medium">To</FormLabel>
                    <FormControl>
                      <Input {...field} className="border-0 shadow-none bg-transparent hover:bg-white/5 h-8 px-2" placeholder="recipient@example.com, another@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="group">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-y-0 border-b border-white/5 pb-2">
                      <FormLabel className="w-24 text-muted-foreground font-medium">Subject</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-0 shadow-none bg-transparent hover:bg-white/5 h-8 px-2 font-medium" placeholder="What is this about?" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2">
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RichTextEditor 
                          value={field.value} 
                          onChange={field.onChange} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
