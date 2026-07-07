"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    token ? "loading" : "idle"
  );
  
  useEffect(() => {
    if (!token) return;
    
    // Automatically verify if token is in URL
    const verify = async () => {
      try {
        const { error } = await authClient.verifyEmail({
          query: {
            token,
          },
        });
        
        if (error) {
          setStatus("error");
          return;
        }
        
        setStatus("success");
      } catch {
        setStatus("error");
      }
    };
    
    verify();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="w-full text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-heading font-bold mb-2">Verifying email...</h2>
        <p className="text-muted-foreground">Please wait while we verify your account.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-3xl font-heading font-bold mb-4">Email Verified!</h2>
        <p className="text-muted-foreground mb-8">
          Your account has been successfully verified. You can now access all features.
        </p>
        <Button onClick={() => router.push("/")} className="w-full h-12 hover-lift">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-3xl font-heading font-bold mb-4">Verification Failed</h2>
        <p className="text-muted-foreground mb-8">
          The verification link is invalid or has expired. Please try signing in again to request a new link.
        </p>
        <Button onClick={() => router.push("/login")} className="w-full h-12 hover-lift">
          Back to Sign In
        </Button>
      </div>
    );
  }

  // Idle state (no token in URL, meaning they just signed up)
  return (
    <div className="w-full text-center">
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-3xl font-heading font-bold mb-4">Check your inbox</h2>
      <p className="text-muted-foreground mb-8 text-lg">
        We've sent a verification link to your email address. Please click the link to verify your account.
      </p>
      
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-left mb-8">
        <p className="font-medium mb-1">Didn't receive the email?</p>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email address</li>
        </ul>
      </div>

      <Button variant="outline" className="w-full h-12" onClick={() => router.push("/login")}>
        Return to Sign In
      </Button>
    </div>
  );
}
