"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Shield, LayoutDashboard, Globe, Lock, CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { LoginFormSkeleton } from "@/components/LoginForm";

const LoginForm = dynamic(() => import("@/components/LoginForm"), {
  ssr: false,
  loading: () => <LoginFormSkeleton />,
});

const features = [
  { icon: Shield, label: "Enterprise Grade Security" },
  { icon: Zap, label: "Real-time Sync Engine" },
  { icon: Globe, label: "Global Edge Network" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen bg-background font-sans overflow-hidden">
      {/* Left side: Authentication & Context */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-24 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto w-full max-w-[420px] relative"
        >
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-10 group cursor-default">
            <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary/20 transition-colors ring-1 ring-primary/20">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Oru<span className="text-primary"> Chat</span>
            </span>
          </div>

          <div className="space-y-3 mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
              Securely access your workspace and collaborate with your team in real-time.
            </p>
          </div>

          {/* Login Card */}
          <div className="backdrop-blur-xl bg-card/40 border border-border/50 shadow-2xl shadow-primary/5 rounded-2xl p-1 overflow-hidden">
            <div className="bg-card/60 rounded-xl p-6 sm:p-8 space-y-6">
              <Suspense fallback={<LoginFormSkeleton />}>
                <LoginForm />
              </Suspense>

              {/* Demo Credentials */}
              <div className="pt-4 border-t border-border/40">
                <h3 className="text-xs font-semibold text-foreground/70 mb-2 uppercase tracking-wider">Demo Credentials</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 px-3 bg-background/50 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">Email</span>
                    <code className="text-[10px] sm:text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">user1@oruchat.com</code>
                  </div>
                  <div className="flex justify-between items-center py-1.5 px-3 bg-background/50 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground font-medium">Password</span>
                    <code className="text-[10px] sm:text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">password123</code>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground/60 text-center">
                  Note: use any user1-25@oruchat.com matches
                </p>
              </div>
            </div>
          </div>

          {/* Footer Features */}
          <div className="mt-12 pt-8 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="flex items-center gap-2 text-xs text-muted-foreground/80 font-medium"
              >
                <feature.icon className="h-3.5 w-3.5 text-primary/70" />
                <span>{feature.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right side: Visual Experience */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-zinc-950 items-center justify-center">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 w-full h-full opacity-40">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse-slow" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[120px] mix-blend-screen animate-pulse-slow delay-1000" />
        </div>

        {/* Abstract floating UI elements */}
        <div className="relative z-10 w-full max-w-2xl px-12 perspective-1000">
          <motion.div
            initial={{ opacity: 0, rotateX: 20, y: 40 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            {/* Main Visual Card */}
            <div className="relative aspect-[4/3] rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-sm overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />

              {/* Mock UI Content */}
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-3 w-3 rounded-full bg-red-400/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="h-2 w-20 bg-white/10 rounded-full" />
                </div>

                <div className="flex-1 flex gap-6">
                  <div className="w-1/4 h-full bg-white/5 rounded-lg border border-white/5 animate-pulse-subtle" />
                  <div className="flex-1 space-y-4">
                    <div className="h-32 w-full bg-gradient-to-br from-primary/20 to-indigo-500/5 rounded-lg border border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white/20 font-mono text-sm">Analytics View</div>
                      </div>
                    </div>
                    <div className="h-4 w-3/4 bg-white/10 rounded" />
                    <div className="h-4 w-1/2 bg-white/10 rounded" />
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-6 right-6 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-primary/25 flex items-center gap-2"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                System Secure
              </motion.div>
            </div>

            {/* Background decorative ring */}
            <div className="absolute -inset-4 border border-white/5 rounded-[2rem] -z-10 scale-95 opacity-50" />
            <div className="absolute -inset-8 border border-white/5 rounded-[2.5rem] -z-20 scale-90 opacity-30" />
          </motion.div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">Build faster, scale safer.</h2>
            <p className="text-zinc-400 max-w-md mx-auto">Enterprise infrastructure designed for modern engineering teams.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
