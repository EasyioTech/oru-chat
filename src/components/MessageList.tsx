"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSocket } from "@/components/SocketProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Loader2,
  Hash,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldCheck,
  Reply,
  SmilePlus,
  Pin,
  PinOff,
  FileIcon,
  Download,
  Cloud,
  ExternalLink
} from "lucide-react";
import { cn, downloadFile } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case "Founder": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "Admin": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    case "Product": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "Engineering": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    case "Design": return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20";
    case "Marketing": return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "Intern": return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    default: return "bg-primary/10 text-primary border-primary/20";
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Reaction {
  emoji: string;
  user_id: string;
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  is_edited?: boolean;
  sender_id: string;
  is_encrypted?: boolean;
  payload?: Record<string, any> | null;
  parent_id?: string;
  parent_message?: {
    content: string;
    sender: {
      full_name?: string;
      username?: string;
    };
  };
  sender?: {
    id: string;
    avatar_url?: string;
    full_name?: string;
    username?: string;
    badge?: string;
  };
  reactions?: Reaction[];
  decryptedContent?: string;
  is_pinned?: boolean;
}

interface MessageListProps {
  workspaceId: string;
  channelId?: string;
  recipientId?: string;
  typingUsers?: Array<{ id: string; full_name?: string; username?: string }>;
  onReply?: (message: Message) => void;
}

export function MessageList({ workspaceId, channelId, recipientId, typingUsers = [], onReply }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const currentUserId = user?.id; // user is now Profile-like object
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { socket, isConnected } = useSocket();

  // Mark as read
  useEffect(() => {
    const updateLastRead = async () => {
      if (!user?.id || !workspaceId) return;
      try {
        await fetch(`/api/workspaces/${workspaceId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId: user.id,
            channelId: channelId || undefined,
            recipientId: recipientId || undefined
          })
        });
      } catch (err) {
        console.error("Failed to update read receipt", err);
      }
    };

    if (messages.length > 0) {
      updateLastRead();
    }
  }, [messages.length, user?.id, workspaceId, channelId, recipientId]);

  // Fetch Messages
  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;
    // Only set loading on first load (if empty) to avoid flickering
    if (messages.length === 0) setLoading(true);

    const params = new URLSearchParams({
      workspaceId,
      userId: user.id
    });
    if (channelId) params.append('channelId', channelId);
    if (recipientId) params.append('recipientId', recipientId);

    try {
      const res = await fetch(`/api/messages?${params.toString()}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, channelId, recipientId, user?.id]);

  // Initial Fetch & Poll
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Socket setup
  useEffect(() => {
    if (!socket || !isConnected) return;

    if (channelId) {
      socket.emit("join-channel", channelId);
    }

    const handleNewMessage = (payload: any) => {
      // Check if message belongs to current view
      const isChannelMessage = channelId && payload.channel_id === channelId;
      const isDM = !channelId && recipientId && (
        (payload.sender_id === recipientId && payload.recipient_id === user?.id) || // From them to me
        (payload.sender_id === user?.id && payload.recipient_id === recipientId)    // From me to them
      );

      if (isChannelMessage || isDM) {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      }
    };

    socket.on("new_message", handleNewMessage);

    const handleReconnect = () => {
      console.log("Socket reconnected, syncing messages...");
      fetchMessages();
    };

    socket.on("connect", handleReconnect);

    const handleUserUpdated = (updatedUser: any) => {
      setMessages(prev => prev.map(m => {
        if (m.sender_id === updatedUser.id) {
          return {
            ...m,
            sender: {
              ...m.sender!, // exist sender
              ...updatedUser // overwrite details
            }
          };
        }
        return m;
      }));
    };

    socket.on("user_updated", handleUserUpdated);

    const handleReactionUpdated = (payload: { messageId: string, reaction: Reaction, action: 'added' | 'removed' }) => {
      setMessages(prev => prev.map(m => {
        if (m.id !== payload.messageId) return m;

        const currentReactions = m.reactions || [];
        let newReactions = [...currentReactions];

        if (payload.action === 'added') {
          // Avoid duplicates just in case
          if (!newReactions.some(r => r.user_id === payload.reaction.user_id && r.emoji === payload.reaction.emoji)) {
            newReactions.push(payload.reaction);
          }
        } else {
          newReactions = newReactions.filter(r => !(r.user_id === payload.reaction.user_id && r.emoji === payload.reaction.emoji));
        }

        return { ...m, reactions: newReactions };
      }));
    };

    socket.on("reaction_updated", handleReactionUpdated);

    // Cleanup
    return () => {
      if (channelId) {
        socket.emit("leave-channel", channelId);
      }
      socket.off("new_message", handleNewMessage);
      socket.off("connect", handleReconnect);
      socket.off("user_updated", handleUserUpdated);
      socket.off("reaction_updated", handleReactionUpdated);
    };
  }, [socket, isConnected, channelId, recipientId, user?.id]);

  // Handle Optimistic Updates
  useEffect(() => {
    const handleOptimistic = (e: CustomEvent) => {
      const { message } = e.detail;
      if (
        (channelId && message.channel_id === channelId) ||
        (recipientId && message.recipient_id === recipientId) ||
        (recipientId && message.sender_id === recipientId) // In case we are viewing the other side
      ) {
        setMessages(prev => [...prev, message]);
      }
    };

    window.addEventListener('optimistic_message', handleOptimistic as EventListener);

    return () => {
      window.removeEventListener('optimistic_message', handleOptimistic as EventListener);
    };
  }, [channelId, recipientId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]); // Scroll on new messages

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return;
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim(), is_edited: true })
      });

      // Optimistic update
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent.trim(), is_edited: true } : m));
      setEditingId(null);
      setEditContent("");
    } catch (err) {
      toast.error("Failed to edit message");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await fetch(`/api/messages/${messageId}`, { method: 'DELETE' });
      // Optimistic update
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  const handleTogglePin = async (messageId: string, currentPinStatus: boolean) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !currentPinStatus })
      });

      toast.success(`Message ${currentPinStatus ? 'unpinned' : 'pinned'}`);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_pinned: !currentPinStatus } : m));
    } catch (err) {
      toast.error(`Failed to ${currentPinStatus ? 'unpin' : 'pin'} message`);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, emoji })
      });

      // Optimistic update logic is complex for reactions without full reload, 
      // but we can try simple toggle based on assumptions or wait for polling.
      // For now, let's wait for polling or do simple optimistic add/remove if we tracked it perfectly.
      // Simplified: Re-fetch or rely on polling.
      // Actually, users expect instant feedback.
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        const existing = m.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);
        let newReactions = m.reactions || [];
        if (existing) {
          newReactions = newReactions.filter(r => r !== existing);
        } else {
          newReactions = [...newReactions, { emoji, user_id: user.id }];
        }
        return { ...m, reactions: newReactions };
      }));

    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 min-h-0 p-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            currentUserId={currentUserId}
            editingId={editingId}
            editContent={editContent}
            setEditingId={setEditingId}
            setEditContent={setEditContent}
            handleEdit={handleEdit}
            handleDelete={handleDelete}
            handleTogglePin={handleTogglePin}
            handleToggleReaction={handleToggleReaction}
            onReply={onReply}
            theme={theme}
          />
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <Hash className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold">Welcome to the beginning of this conversation!</h3>
            <p className="text-sm text-zinc-500">This is the very start of the history.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 mt-4 text-sm text-zinc-500">
          <div className="flex space-x-1">
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span>
            {typingUsers.map(u => u.full_name || u.username).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}
    </ScrollArea>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
          return (
            <span key={i} className="font-bold text-primary hover:underline cursor-pointer">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

interface MessageItemProps {
  message: Message;
  currentUserId?: string;
  editingId: string | null;
  editContent: string;
  setEditingId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
  handleTogglePin: (id: string, currentPinStatus: boolean) => void;
  handleToggleReaction: (id: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  theme?: string;
}

function MessageItem({
  message,
  currentUserId,
  editingId,
  editContent,
  setEditingId,
  setEditContent,
  handleEdit,
  handleDelete,
  handleTogglePin,
  handleToggleReaction,
  onReply,
  theme
}: MessageItemProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [0, 1]);
  const color = useTransform(x, [0, 100], ["#71717a", "#10b981"]);

  const onDragEnd = (_: any, info: any) => {
    if (info.offset.x > 80) {
      onReply?.(message);
    }
  };

  const groupedReactions = message.reactions?.reduce((acc: Record<string, number>, curr: Reaction) => {
    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
    return acc;
  }, {});

  const userReactions = message.reactions?.filter((r: Reaction) => r.user_id === currentUserId).map((r: Reaction) => r.emoji) || [];

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 100 }}
      dragElastic={0.2}
      onDragEnd={onDragEnd}
      style={{ x }}
      className="relative group"
    >
      <motion.div
        style={{ opacity }}
        className="absolute left-0 inset-y-0 -translate-x-full flex items-center pr-4"
      >
        <motion.div style={{ color }}>
          <Reply className="h-6 w-6" />
        </motion.div>
      </motion.div>

      <div className="flex gap-3 group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 -mx-2 px-2 py-1 rounded-lg transition-colors relative">
        <Avatar className="h-9 w-9 mt-0.5">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback>{message.sender?.full_name?.[0] || message.sender?.username?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm hover:underline cursor-pointer">
                {message.sender?.full_name || message.sender?.username}
              </span>
              {message.sender?.username && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  @{message.sender.username}
                </span>
              )}
              {message.sender?.badge && (
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold h-4 border", getBadgeColor(message.sender.badge))}>
                  {message.sender.badge}
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">
              {format(new Date(message.created_at), "h:mm a")}
            </span>
            {message.is_edited && (
              <span className="text-[10px] text-zinc-400">(edited)</span>
            )}
            {message.is_pinned && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Pin className="h-3 w-3 fill-zinc-400" />
                <span>Pinned</span>
              </div>
            )}
          </div>

          {message.parent_id && message.parent_message && (
            <div className="mt-1 mb-1 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                <Reply className="h-3 w-3" />
                <span>Replying to {message.parent_message.sender?.full_name || message.parent_message.sender?.username}</span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-md italic">
                {message.parent_message.content}
              </p>
            </div>
          )}

          {editingId === message.id ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEdit(message.id);
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditContent("");
                  }
                }}
              />
              <div className="flex items-center">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(message.id)}>
                  <Check className="h-4 w-4 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingId(null); setEditContent(""); }}>
                  <X className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-1 group/msg">
              {message.payload?.files && message.payload.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 w-full max-w-2xl">
                  {message.payload.files.map((file: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1 w-full max-w-sm">
                      {file.type === 'drive' ? (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 group/file">
                          <div className="h-10 w-10 rounded bg-white dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800/50">
                            <Cloud className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-blue-900 dark:text-blue-100">{file.name}</p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400">Google Drive File</p>
                          </div>
                          <button
                            className="p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            onClick={() => window.open(file.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </div>
                      ) : file.type.startsWith('image/') ? (

                        <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group/image">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="max-h-[400px] w-auto object-contain cursor-pointer"
                            onClick={() => window.open(file.url, '_blank')}
                          />
                          <button
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-900/50 text-white opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-zinc-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file.url, file.name);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 group/file">
                          <div className="h-10 w-10 rounded bg-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                            <FileIcon className="h-5 w-5 text-zinc-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-[10px] text-zinc-500">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            className="p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file.url, file.name);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </button>

                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {message.payload?.type === "gif" || message.payload?.type === "sticker" ? (
                <div className="relative mt-1 max-w-[300px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <img
                    src={message.is_encrypted ? message.decryptedContent : message.content}
                    alt="GIF"
                    className="w-full h-auto object-contain"
                  />
                </div>
              ) : (
                // Only show content if there are no files, OR if content is different from just the filename
                (message.content &&
                  (!message.payload?.files || message.payload.files.length === 0 ||
                    (message.content !== message.payload.files[0]?.name))) && (
                  <p className={cn(
                    "text-sm leading-relaxed whitespace-pre-wrap break-words",
                    message.is_encrypted && !message.decryptedContent
                      ? "text-zinc-400 italic font-mono bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded border border-dashed border-zinc-200 dark:border-zinc-700"
                      : "text-zinc-800 dark:text-zinc-200"
                  )}>
                    {message.is_encrypted
                      ? (message.decryptedContent || `[Encrypted: ${message.content.substring(0, 16)}...]`)
                      : <MessageContent content={message.content} />}
                  </p>
                )
              )}


              {groupedReactions && Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {Object.entries(groupedReactions).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => handleToggleReaction(message.id, emoji)}
                      className={cn(
                        "flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all border",
                        userReactions.includes(emoji)
                          ? "bg-primary/10 border-primary/20 text-primary"
                          : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      <span>{emoji}</span>
                      {count > 1 && <span>{count}</span>}
                    </button>
                  ))}
                </div>
              )}

              {message.is_encrypted && (
                <div className="mt-1 flex items-center gap-1 opacity-40 group-hover/msg:opacity-100 transition-opacity" title="End-to-End Encrypted">
                  <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1 absolute right-2 top-1 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm p-0.5 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                <SmilePlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none shadow-xl" side="top" align="end">
              <EmojiPicker
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={(emojiData) => handleToggleReaction(message.id, emojiData.emoji)}
                autoFocusSearch={false}
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() => onReply?.(message)}
          >
            <Reply className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleTogglePin(message.id, !!message.is_pinned)}>
                {message.is_pinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" /> Unpin
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" /> Pin
                  </>
                )}
              </DropdownMenuItem>

              {currentUserId === message.sender_id && editingId !== message.id && (
                <>
                  <DropdownMenuItem onClick={() => { setEditingId(message.id); setEditContent(message.content); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(message.id)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
