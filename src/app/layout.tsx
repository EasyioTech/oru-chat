import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Disabled due to build network restrictions
import "./globals.css";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { SocketProvider } from "@/components/SocketProvider";
import { Toaster } from "sonner";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Oru Chat | Secure Workspace",
  description: "Next-generation enterprise collaboration platform.",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary`}
      >
        <AuthProvider>
          <ThemeProvider>
            <SocketProvider>
              {children}
            </SocketProvider>
            <Toaster richColors position="top-right" theme="system" />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
