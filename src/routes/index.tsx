import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { generateBriefFn, getMyBriefsFn, getBriefByIdFn, type BriefListItem } from "../server/brief";
import { getProfileFn, getSessionFn } from "../server/profile";
import { useMutation, useQuery } from "@tanstack/react-query";
import { signOut } from "../lib/auth-client";
import { INTEREST_CATEGORIES } from "../lib/interests";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/")({
  component: Dashboard,
  loader: async () => {
    const [profile, session, briefsData] = await Promise.all([
      getProfileFn(),
      getSessionFn(),
      getMyBriefsFn().catch(() => ({ briefs: [] as BriefListItem[] })),
    ]);
    return { profile, session, briefs: briefsData.briefs };
  },
});

function Dashboard() {
  const { profile, session, briefs } = Route.useLoaderData();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  if (!session?.user) {
    return <LandingPage />;
  }

  // Redirect to onboarding if not complete (no profile or not yet completed)
  if (!profile || !profile.onboardingComplete) {
    navigate({ to: "/register" });
    return null;
  }

  return <AuthenticatedDashboard profile={profile} session={session} initialBriefs={briefs} />;
}

// Landing page for unauthenticated users
function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-2xl animate-fade-in">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-8 shadow-2xl shadow-indigo-500/30">
          <span className="text-4xl">☀️</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
          Morning Brief
        </h1>
        <p className="text-xl text-indigo-200 mb-10 leading-relaxed">
          Personalized news briefs delivered in audio format.<br />
          <span className="text-indigo-300">Curated by AI. Powered by your interests.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="bg-white text-indigo-900 hover:bg-indigo-100 shadow-xl shadow-white/20 text-lg px-8 py-6">
            <a href="/register">Get Started Free</a>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 backdrop-blur text-lg px-8 py-6">
            <a href="/login">Sign In</a>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="mt-16 grid grid-cols-3 gap-8">
          {[
            { icon: "🎯", label: "Personalized" },
            { icon: "🎧", label: "Audio Ready" },
            { icon: "📧", label: "Email Delivery" },
          ].map((feature, i) => (
            <div key={i} className="text-center">
              <span className="text-3xl mb-2 block">{feature.icon}</span>
              <span className="text-indigo-300 text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard for authenticated users
function AuthenticatedDashboard({ profile, session, initialBriefs }: { profile: any; session: any; initialBriefs?: BriefListItem[] }) {
  const navigate = useNavigate();
  const [viewingBriefId, setViewingBriefId] = useState<number | null>(null);

  const { data: briefsData, refetch: refetchBriefs } = useQuery({
    queryKey: ["my-briefs"],
    queryFn: getMyBriefsFn,
    initialData: initialBriefs != null ? { briefs: initialBriefs } : undefined,
  });
  const briefs = briefsData?.briefs ?? [];

  const { data: selectedBrief, isLoading: loadingBrief } = useQuery({
    queryKey: ["brief", viewingBriefId],
    queryFn: () => getBriefByIdFn(viewingBriefId!),
    enabled: viewingBriefId != null,
  });

  const generate = useMutation({
    mutationFn: () => generateBriefFn(),
    onSuccess: () => refetchBriefs(),
  });

  const handleGenerate = () => {
    generate.mutate();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // Get readable interest labels
  const interests = profile?.interests || [];
  const interestLabels = interests.flatMap((int: any) => {
    const cat = INTEREST_CATEGORIES.find((c) => c.id === int.categoryId);
    if (!cat) return [];
    return int.subcategoryIds.map((subId: string) => {
      const sub = cat.subcategories.find((s) => s.id === subId);
      return sub?.label || subId;
    });
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-lg">☀️</span>
            </div>
            <span className="font-bold text-xl text-slate-900">Morning Brief</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:block">{session.user.email}</span>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Greeting */}
        <div className="mb-6 animate-fade-in">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Good {getTimeOfDay()}, {session.user.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-slate-500">Ready to catch up on what matters?</p>
        </div>

        {/* Start daily briefing – main CTA */}
        <Card className="mb-8 overflow-hidden border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg shadow-indigo-500/10 animate-fade-in">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/30">
              <span className="text-3xl">🎧</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Start your daily briefing</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              Get a personalized audio brief based on your interests. One tap, delivered to your ears (and inbox).
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generate.isPending}
              size="lg"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 px-10 text-lg font-semibold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {generate.isPending ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating your brief...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>▶</span> Start my daily briefing
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Interests Card */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Your Interests</CardTitle>
                <CardDescription>Topics that power your briefs</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <a href="/settings">Edit →</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {interestLabels.slice(0, 8).map((label: string, i: number) => (
                <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  {label}
                </Badge>
              ))}
              {interestLabels.length > 8 && (
                <Badge variant="outline">
                  +{interestLabels.length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Your briefs – user sees only their own */}
        <Card className="mb-8 animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📋</span> Your briefs
            </CardTitle>
            <CardDescription>Past briefs you’ve generated. Play or read the transcript.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {briefs.length === 0 ? (
              <p className="text-slate-500 text-sm">No briefs yet. Generate one above.</p>
            ) : (
                <ul className="space-y-3">
                  {briefs.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                    >
                      <span className="font-medium text-slate-700">{b.date}</span>
                      <Badge variant={b.status === "completed" ? "default" : "secondary"} className="capitalize">
                        {b.status ?? "pending"}
                      </Badge>
                      {b.audioUrl && (
                        <audio controls className="h-8 max-w-[200px]" src={b.audioUrl} preload="none" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingBriefId(viewingBriefId === b.id ? null : b.id)}
                      >
                        {viewingBriefId === b.id ? "Hide transcript" : "View transcript"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {viewingBriefId != null && (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                  {loadingBrief ? (
                    <p className="text-slate-500 text-sm">Loading…</p>
                  ) : selectedBrief ? (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">Transcript – {selectedBrief.date}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setViewingBriefId(null)}>
                          Close
                        </Button>
                      </div>
                      <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedBrief.transcript || "No transcript."}
                      </div>
                    </>
                  ) : null}
                </div>
              )}
          </CardContent>
        </Card>

        {/* Secondary generate button (same action as hero CTA) */}
        <div className="animate-fade-in">
          <Button
            onClick={handleGenerate}
            disabled={generate.isPending}
            variant="outline"
            size="lg"
            className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            {generate.isPending ? "Generating..." : "✨ Generate Today's Brief"}
          </Button>

          {generate.isError && (
            <p className="text-red-500 text-sm text-center mt-4">{generate.error.message}</p>
          )}
        </div>

        {/* Result Section */}
        {generate.data?.success && (
          <div className="mt-10 space-y-6 animate-fade-in">
            {/* Audio Player Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
              <CardContent className="pt-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
                  <span className="text-2xl">🎧</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Your Brief is Ready</h3>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  {(generate.data as any).emailSent && "📧 Also sent to your email"}
                </p>
                <audio
                  controls
                  autoPlay
                  className="w-full rounded-xl"
                  src={generate.data.audioUrl}
                />
              </CardContent>
            </Card>

            {/* Transcript Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📝</span> Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {generate.data.text}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
