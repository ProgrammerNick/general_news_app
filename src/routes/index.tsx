import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "../lib/useSession";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { HeroPlayer } from "../components/dashboard/HeroPlayer";
import { FeedManager } from "../components/dashboard/FeedManager";
import { BriefHistory } from "../components/dashboard/BriefHistory";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Activity, TrendingUp, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = useSession();
  const [selectedFeedId, setSelectedFeedId] = useState<string>("default");
  const [timeframe, setTimeframe] = useState("24h");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.href = "/auth";
    }
  }, [session, isSessionLoading]);

  // --- Queries ---
  const { data: briefsData } = useQuery({
    queryKey: ["briefs"],
    queryFn: async () => {
      const res = await fetch("/api/brief");
      if (!res.ok) throw new Error("Failed to fetch briefs");
      return res.json();
    },
    enabled: !!session,
  });

  const { data: feedsData } = useQuery({
    queryKey: ["feeds"],
    queryFn: async () => {
      const res = await fetch("/api/profile/feeds");
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
    enabled: !!session,
  });

  // --- Mutations ---
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedId: selectedFeedId === "default" ? undefined : parseInt(selectedFeedId),
          timeframe
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAudioUrl(data.audioUrl);
      setTranscript(data.text);
      setIsPlaying(true);
      queryClient.invalidateQueries({ queryKey: ["briefs"] });
    },
  });

  const createFeedMutation = useMutation({
    mutationFn: async (feed: { name: string; interests: any[]; timeframe: string }) => {
      const res = await fetch("/api/profile/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feed),
      });
      if (!res.ok) throw new Error("Failed to create channel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    }
  });

  const deleteFeedMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/profile/feeds/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
      if (selectedFeedId !== "default") setSelectedFeedId("default");
    }
  });

  if (isSessionLoading || !session) return null;

  const currentFeed = feedsData?.feeds?.find((f: any) => f.id.toString() === selectedFeedId);
  const feedName = selectedFeedId === "default" ? "General Brief" : currentFeed?.name || "Private Channel";

  return (
    <DashboardLayout>
      {/* Top Welcome */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">
            Good Morning, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground font-medium">
            Your intelligence briefing is active.
          </p>
        </div>

        {/* Quick Stats (Placeholder) */}
        <div className="flex gap-4">
          <Card className="p-3 flex items-center gap-3 bg-secondary/50 border-none">
            <div className="p-2 bg-green-500/10 rounded-full text-green-500">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Streak</p>
              <p className="font-bold">12 Days</p>
            </div>
          </Card>
          <Card className="p-3 flex items-center gap-3 bg-secondary/50 border-none">
            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-500">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">Insights</p>
              <p className="font-bold">143 Read</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Col: Hero Player (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <HeroPlayer
            feedName={feedName}
            feeds={feedsData?.feeds || []}
            selectedFeedId={selectedFeedId === "default" ? null : parseInt(selectedFeedId)}
            onFeedChange={setSelectedFeedId}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            audioUrl={audioUrl}
            transcript={transcript}
            isGenerating={generateMutation.isPending}
            onGenerate={() => generateMutation.mutate()}
          />
        </div>

        {/* Right Col: Feed Manager & History */}
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-white border border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 font-serif">
                <Activity className="w-5 h-5 text-indigo-500" />
                Private Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Curate dedicated channels for specific sectors or clients.
              </p>
              <FeedManager
                onCreateFeed={async (f) => createFeedMutation.mutateAsync(f)}
              />
            </CardContent>
          </Card>

          <Card className="border-none shadow-md h-full min-h-[300px] border border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Recent Briefs</CardTitle>
            </CardHeader>
            <CardContent>
              <BriefHistory
                briefs={briefsData?.briefs || []}
                onPlay={(url) => {
                  setAudioUrl(url);
                  setIsPlaying(true);
                }}
                currentAudioUrl={audioUrl}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
