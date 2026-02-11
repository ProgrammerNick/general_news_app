import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Clock, Activity } from "lucide-react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

interface HeroPlayerProps {
    feedName: string;
    feeds: any[];
    selectedFeedId: number | null;
    onFeedChange: (id: string) => void;
    timeframe: string;
    onTimeframeChange: (val: string) => void;
    isPlaying: boolean;
    onPlayPause: () => void;
    audioUrl: string | null;
    isGenerating: boolean;
    onGenerate: () => void;
    transcript?: string | null;
}

export function HeroPlayer({
    feedName,
    feeds,
    selectedFeedId,
    onFeedChange,
    timeframe,
    onTimeframeChange,
    isPlaying,
    onPlayPause,
    audioUrl,
    isGenerating,
    onGenerate,
    transcript
}: HeroPlayerProps) {
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioUrl && audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Play error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, audioUrl]);

    const togglePlay = () => {
        if (!audioUrl) {
            if (!isGenerating) onGenerate();
            return;
        }
        onPlayPause();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl bg-slate-950 text-white shadow-2xl p-8 min-h-[400px] flex flex-col justify-between border border-slate-800"
        >
            {/* Subtle Grid Background */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>

            {/* Top Controls: Channel & Timeframe */}
            <div className="relative z-10 flex flex-wrap gap-4 justify-between items-start">
                <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Active Channel</p>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                        <Select value={selectedFeedId?.toString() || "default"} onValueChange={onFeedChange}>
                            <SelectTrigger className="w-[300px] border-none bg-transparent text-white font-serif font-bold text-3xl h-auto p-0 focus:ring-0 shadow-none hover:bg-transparent">
                                <SelectValue placeholder="Select Channel" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                <SelectItem value="default">Daily Briefing</SelectItem>
                                {feeds.map((f) => (
                                    <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 pl-3">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <Select value={timeframe} onValueChange={onTimeframeChange}>
                        <SelectTrigger className="w-[90px] border-none bg-transparent text-white h-7 text-xs font-medium focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="24h">24 Hours</SelectItem>
                            <SelectItem value="48h">48 Hours</SelectItem>
                            <SelectItem value="7d">7 Days</SelectItem>
                            <SelectItem value="30d">30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Center: Visualizer or Status */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-12">
                <AnimatePresence mode="wait">
                    {isGenerating ? (
                        <motion.div
                            key="loading"
                            className="flex flex-col items-center gap-6"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="relative">
                                <div className="w-20 h-20 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                                <div className="w-16 h-16 border-r-2 border-l-2 border-slate-500 rounded-full animate-spin absolute top-2 left-2 reverse-spin"></div>
                            </div>
                            <p className="text-slate-300 font-mono text-sm tracking-widest animate-pulse">ANALYZING INTEL...</p>
                        </motion.div>
                    ) : isPlaying ? (
                        <motion.div
                            key="playing"
                            className="flex gap-1.5 items-end h-24"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {[...Array(24)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1.5 bg-white rounded-t-sm"
                                    animate={{
                                        height: [10, Math.random() * 80 + 10, 10],
                                        opacity: [0.3, 1, 0.3]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 0.4 + Math.random() * 0.4,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4"
                        >
                            <h2 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                                {feedName}
                            </h2>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto font-medium tracking-wide">
                                TAP PLAY TO INITIATE BRIEFING
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom: Play Controls */}
            <div className="relative z-10 border-t border-white/10 pt-6">
                {audioUrl && (
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => onPlayPause()}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    />
                )}

                <div className="flex items-center justify-between gap-6">
                    <Button
                        size="icon"
                        className={cn(
                            "h-14 w-14 rounded-full transition-all hover:scale-105 border-2",
                            isGenerating
                                ? "bg-transparent border-slate-700 text-slate-700 cursor-not-allowed"
                                : "bg-white border-white text-black hover:bg-slate-200"
                        )}
                        onClick={togglePlay}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <Activity className="w-6 h-6 animate-spin" />
                        ) : isPlaying ? (
                            <Pause className="w-6 h-6 fill-current" />
                        ) : (
                            <Play className="w-6 h-6 fill-current ml-1" />
                        )}
                    </Button>

                    <div className="flex-1">
                        <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                            <span>{isGenerating ? "PROCESSING" : isPlaying ? "PLAYING" : "STANDBY"}</span>
                            {audioUrl && (
                                <span>
                                    {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        {/* Progress Bar */}
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden w-full">
                            {audioUrl ? (
                                <motion.div
                                    className="h-full bg-white"
                                    style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}
                                />
                            ) : (
                                <div className="h-full bg-slate-800" />
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
