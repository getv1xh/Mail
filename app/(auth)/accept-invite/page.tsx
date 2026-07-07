"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { signUp, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const { data: session, isPending: isSessionLoading } = useSession();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteData, setInviteData] = useState<{ email: string; workspaceName: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invitation token.");
      setIsLoading(false);
      return;
    }

    fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to load invitation.");
        }
        return res.json();
      })
      .then((data) => {
        setInviteData(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  async function handleAccept(tokenStr: string) {
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenStr }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to accept invitation");
      }
      
      toast.success("Invitation accepted successfully!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!inviteData || !token) return;
    
    setIsSubmitting(true);
    try {
      // 1. Create account
      const { data, error: signUpError } = await signUp.email({
        email: inviteData.email,
        password: values.password,
        name: values.name,
      });

      if (signUpError) {
        toast.error(signUpError.message || "Failed to sign up");
        setIsSubmitting(false);
        return;
      }

      // 2. Accept invite
      await handleAccept(token);
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  }

  if (isLoading || isSessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center">
        <div className="mb-8">
          <h2 className="text-3xl font-heading font-bold mb-2 text-destructive">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
        <Button onClick={() => router.push("/")} variant="outline">
          Return to Home
        </Button>
      </div>
    );
  }

  if (!inviteData) return null;

  // If user is already logged in, check if emails match
  if (session?.user) {
    if (session.user.email !== inviteData.email) {
      return (
        <div className="w-full text-center space-y-4">
          <h2 className="text-2xl font-bold">Email Mismatch</h2>
          <p className="text-muted-foreground">
            This invitation is for <strong>{inviteData.email}</strong>, but you are logged in as <strong>{session.user.email}</strong>.
          </p>
          <Button onClick={() => router.push("/login")} variant="outline">
            Sign in with the correct account
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full text-center space-y-6">
        <h2 className="text-3xl font-heading font-bold">Join Workspace</h2>
        <p className="text-muted-foreground">
          You have been invited to join <strong>{inviteData.workspaceName}</strong> as a <strong>{inviteData.role.toLowerCase()}</strong>.
        </p>
        <Button 
          className="w-full h-12 text-base hover-lift" 
          onClick={() => {
            setIsSubmitting(true);
            handleAccept(token!);
          }}
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept Invitation
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-heading font-bold mb-2">Join Workspace</h2>
        <p className="text-muted-foreground">
          You have been invited to join <strong>{inviteData.workspaceName}</strong>. 
          Create your account to accept.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input value={inviteData.email} readOnly className="h-12 bg-input/20 cursor-not-allowed" />
            </FormControl>
          </FormItem>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} className="h-12 bg-input/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} className="h-12 bg-input/50" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full h-12 text-base hover-lift" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account & Join
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account with this email?{" "}
        <Link href={`/login?callbackUrl=/accept-invite?token=${token}`} className="text-primary hover:underline font-medium">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
