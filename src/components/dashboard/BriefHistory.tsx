import { Play, Calendar, FileText } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

interface BriefHistoryProps {
    briefs: any[];
    onPlay: (url: string) => void;
    currentAudioUrl: string | null;
}

export function BriefHistory({ briefs, onPlay, currentAudioUrl }: BriefHistoryProps) {
    if (!briefs || briefs.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <p>No briefs yet. Generate your first one!</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px] w-full pr-4">
            <div className="space-y-4">
                {briefs.map((brief) => (
                    <div
                        key={brief.id}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-xl border bg-card transition-all hover:bg-muted/50",
                            currentAudioUrl === brief.audioUrl && "border-indigo-500 bg-indigo-50/10"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm">
                                    {new Date(brief.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {brief.date} • {brief.status}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {/* Transcript Button (Placeholder) */}
                            {/* <Button variant="ghost" size="icon">
                                <FileText className="w-4 h-4" />
                            </Button> */}

                            {brief.audioUrl && (
                                <Button
                                    size="icon"
                                    variant={currentAudioUrl === brief.audioUrl ? "default" : "secondary"}
                                    onClick={() => onPlay(brief.audioUrl)}
                                >
                                    <Play className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
