import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VMailx — Premium Email Platform",
  description: "Enterprise-ready self-hosted email management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground min-h-screen selection:bg-primary/30`}
      >
        <ThemeProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
