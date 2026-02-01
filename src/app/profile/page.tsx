"use client";

import { useAuth } from "@/components/AuthProvider";
import { StatusPicker } from "@/components/StatusPicker";
import { ProfileSettingsDialog } from "@/components/ProfileSettingsDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, AtSign, Award, Settings, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
    const { user, refreshProfile } = useAuth();
    const router = useRouter();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [statusText, setStatusText] = useState(user?.status_text || "");
    const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || "");

    useEffect(() => {
        if (user) {
            setStatusText(user.status_text || "");
            setStatusEmoji(user.status_emoji || "");
        }
    }, [user]);

    const handleStatusUpdate = (newStatus: string, newEmoji: string) => {
        setStatusText(newStatus);
        setStatusEmoji(newEmoji);
        refreshProfile();
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-zinc-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-9 w-9"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Profile</h1>
                        <p className="text-sm text-zinc-500">Manage your account settings and preferences</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Profile Overview */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Your personal details and public profile</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start gap-6">
                            <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-800 shadow-lg">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="text-2xl">
                                    {user.full_name?.[0] || user.username?.[0] || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                            {user.full_name || user.username}
                                        </h2>
                                        {user.badge && (
                                            <Badge variant="outline" className="px-2 py-0.5 text-xs">
                                                <Award className="h-3 w-3 mr-1" />
                                                {user.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-500">@{user.username}</p>
                                </div>
                                <Button
                                    onClick={() => setSettingsOpen(true)}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Settings className="h-4 w-4" />
                                    Edit Profile
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500 font-medium">Full Name</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {user.full_name || "Not set"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <AtSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500 font-medium">Username</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        @{user.username}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-500 font-medium">Email</p>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>

                            {user.badge && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-zinc-500 font-medium">Role Badge</p>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {user.badge}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Status Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                        <CardDescription>Let others know what you're up to</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            {statusEmoji && (
                                <span className="text-3xl">{statusEmoji}</span>
                            )}
                            <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {statusText || "No status set"}
                                </p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Click below to update your status
                                </p>
                            </div>
                            <StatusPicker
                                currentStatus={statusText}
                                currentEmoji={statusEmoji}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ProfileSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
    );
}
