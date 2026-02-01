"use client";

import { useState, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Input } from "@/components/ui/input";
import { Search, Image as ImageIcon, Sticker as StickerIcon, AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Validate API key exists
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

interface GiphyPickerProps {
  onSelect: (url: string) => void;
  defaultTab?: "gifs" | "stickers";
}

export function GiphyPicker({ onSelect, defaultTab = "gifs" }: GiphyPickerProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gf, setGf] = useState<GiphyFetch | null>(null);

  // Initialize Giphy with validation
  useEffect(() => {
    if (!GIPHY_API_KEY || GIPHY_API_KEY.trim() === '') {
      setError("Giphy API key is not configured. Please contact your administrator.");
      setIsLoading(false);
      console.error("Missing NEXT_PUBLIC_GIPHY_API_KEY in environment variables");
      return;
    }

    try {
      const giphyFetch = new GiphyFetch(GIPHY_API_KEY);
      setGf(giphyFetch);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize Giphy:", err);
      setError("Failed to load Giphy. Please try again later.");
      setIsLoading(false);
    }
  }, []);

  const fetchGifs = async (offset: number) => {
    if (!gf) {
      throw new Error("Giphy not initialized");
    }

    try {
      const result = await gf.search(search || "trending", {
        offset,
        limit: 10,
        type: activeTab === "gifs" ? "gifs" : "stickers"
      });
      return result;
    } catch (err) {
      console.error("Error fetching GIFs:", err);
      setError("Unable to load GIFs. Please check your internet connection.");
      throw err;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 w-[300px] h-[400px] p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        <p className="text-sm text-zinc-500">Loading GIFs...</p>
      </div>
    );
  }

  // Error state
  if (error || !gf) {
    return (
      <div className="flex flex-col gap-2 w-[300px] h-[400px] p-4 bg-white dark:bg-zinc-950 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error || "Failed to initialize Giphy"}
          </AlertDescription>
        </Alert>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-zinc-400 text-center">
            {!GIPHY_API_KEY
              ? "Giphy integration requires an API key to be configured."
              : "Please try refreshing the page or contact support if the issue persists."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-[300px] h-[400px] p-2 bg-white dark:bg-zinc-950 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-800">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
        <Input
          placeholder={`Search ${activeTab === "gifs" ? "GIFs" : "Stickers"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "gifs" | "stickers")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="gifs" className="text-xs flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" /> GIFs
          </TabsTrigger>
          <TabsTrigger value="stickers" className="text-xs flex items-center gap-1.5">
            <StickerIcon className="h-3.5 w-3.5" /> Stickers
          </TabsTrigger>
        </TabsList>
        <div className="mt-2 h-[300px] overflow-y-auto custom-scrollbar">
          <Grid
            key={`${activeTab}-${search}`}
            width={280}
            columns={2}
            fetchGifs={fetchGifs}
            onGifClick={(gif, e) => {
              e.preventDefault();
              onSelect(gif.images.fixed_height.url);
            }}
            noResultsMessage={`No ${activeTab} found`}
          />
        </div>
      </Tabs>
    </div>
  );
}
