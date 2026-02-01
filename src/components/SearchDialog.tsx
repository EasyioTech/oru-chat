"use client";

import * as React from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { useRouter } from "next/navigation";

interface SearchDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  content: string;
  channelId: string | null;
  recipientId: string | null;
  createdAt: string;
  sender: {
    username: string;
    fullName: string;
  };
}

export function SearchDialog({ workspaceId, open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const searchMessages = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?workspaceId=${workspaceId}&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.data || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(searchMessages, 300);
    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search messages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Messages">
            {results.map((result) => (
              <CommandItem
                key={result.id}
                onSelect={() => {
                  onOpenChange(false);
                  // Implementation note: we'd need a way to navigate and focus the message
                  // For now, we'll just log it or maybe change the selected channel/DM
                }}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                      {result.sender.fullName || result.sender.username}
                    </span>
                    {result.sender.username && (
                      <span className="text-[10px] text-zinc-500 font-medium">@{result.sender.username}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{result.content}</p>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
