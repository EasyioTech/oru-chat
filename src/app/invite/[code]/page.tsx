"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Users, XCircle } from "lucide-react";
import Link from "next/link";

export default function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invitation, setInvitation] = useState<{ id: string; role?: string; workspaces?: { id: string; name: string; slug: string } } | null>(null);
  const [workspace, setWorkspace] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchInvitation = async () => {
      // User is handled by useAuth or check here? 
      // The original code used supabase.auth.getUser() inside fetch.
      // We rely on useAuth context better or just check session cookie if we were server.
      // But this is client.

      try {
        const res = await fetch(`/api/invitations/${code}`);
        if (!res.ok) {
          setError("This invite link is invalid or has expired.");
          setLoading(false);
          return;
        }

        const invite = await res.json();
        setInvitation(invite);
        setWorkspace(invite.workspace);

        // We set user from useAuth if needed, or we just trust the UI state.
        // Let's rely on the outer component check or we can fetch /api/users/me here?
        // Actually I'll use a simple fetch to check auth or local state.
        // For now, let's assume auth is checked by global context.
        setLoading(false);

      } catch (err) {
        setError("Failed to load invitation.");
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [code]);

  const handleJoin = async () => {
    // We need user state. I'll get it from context or just try to join (API will 401 if not logged in).
    // The original code checked user state.

    // Quick auth check (assuming useAuth used in layout or here)
    // Actually the component doesn't import useAuth. I should import it.
    // For now, I'll assume if we are not logged in, the API call returns 401 and we redirect.

    setJoining(true);

    try {
      const res = await fetch(`/api/invitations/${code}`, {
        method: 'POST'
      });

      if (res.status === 401) {
        router.push(`/?redirect=/invite/${code}`);
        return;
      }

      if (res.status === 409) {
        toast.info("You are already a member of this workspace!");
        // We need workspace ID. It's in state `workspace`.
        if (workspace) router.push(`/workspaces/${workspace.id}`);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to join");
      }

      const data = await res.json();
      toast.success(`Welcome to ${workspace?.name}!`);
      router.push(`/workspaces/${data.workspaceId}`);

    } catch (err) {
      toast.error("Failed to join workspace");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-2xl font-bold text-primary">
            {workspace?.name?.[0]?.toUpperCase()}
          </div>
          <CardTitle className="text-2xl">Join {workspace?.name}</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
            <Users className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="font-medium">{workspace?.name}</p>
              <p className="text-sm text-zinc-500">workspace.com/{workspace?.slug}</p>
            </div>
          </div>
          {user ? (
            <p className="text-sm text-zinc-500 text-center">
              Joining as <span className="font-medium">{user.email}</span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500 text-center">
              You&apos;ll need to sign in or create an account to join
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={handleJoin} disabled={joining} className="w-full">
            {joining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : user ? (
              "Accept Invitation"
            ) : (
              "Sign in to Join"
            )}
          </Button>
          <Link href="/" className="w-full">
            <Button variant="ghost" className="w-full">
              Decline
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
