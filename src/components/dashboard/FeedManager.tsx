import { useState } from "react";
import { Plus, X, Check, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea"; // Assuming this component exists or standard textarea
import { INTEREST_CATEGORIES } from "../../lib/interests";
import { cn } from "../../lib/utils";

interface FeedManagerProps {
    onCreateFeed: (feed: { name: string; interests: any[]; context?: string; timeframe: string }) => Promise<void>;
}

export function FeedManager({ onCreateFeed }: FeedManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [context, setContext] = useState("");
    const [selectedInterests, setSelectedInterests] = useState<Record<string, string[]>>({});
    const [customTopics, setCustomTopics] = useState<string[]>([]);
    const [currentCustomTopic, setCurrentCustomTopic] = useState("");
    const [timeframe, setTimeframe] = useState("24h");
    const [openCategories, setOpenCategories] = useState<string[]>(["finance"]);

    const toggleCategory = (id: string) => {
        setOpenCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const toggleInterest = (categoryId: string, subId: string) => {
        setSelectedInterests(prev => {
            const current = prev[categoryId] || [];
            const isSelected = current.includes(subId);

            let newSubIds;
            if (isSelected) {
                newSubIds = current.filter(id => id !== subId);
            } else {
                newSubIds = [...current, subId];
            }

            if (newSubIds.length === 0) {
                const { [categoryId]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [categoryId]: newSubIds };
        });
    };

    const handleAddCustomTopic = () => {
        if (currentCustomTopic.trim()) {
            setCustomTopics([...customTopics, currentCustomTopic.trim()]);
            setCurrentCustomTopic("");
        }
    };

    const handleRemoveCustomTopic = (index: number) => {
        setCustomTopics(customTopics.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!name || (Object.keys(selectedInterests).length === 0 && customTopics.length === 0)) return;

        // Build interests array
        const interests = Object.entries(selectedInterests).map(([categoryId, subcategoryIds]) => ({
            categoryId,
            subcategoryIds
        }));

        // Add custom topics if any
        if (customTopics.length > 0) {
            interests.push({
                categoryId: "custom",
                subcategoryIds: customTopics
            });
        }

        await onCreateFeed({ name, interests, context, timeframe });
        setIsOpen(false);
        // Reset form
        setName("");
        setContext("");
        setSelectedInterests({});
        setCustomTopics([]);
    };

    const totalSelected = Object.values(selectedInterests).reduce((acc, curr) => acc + curr.length, 0) + customTopics.length;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 border-dashed">
                    <Plus className="w-4 h-4" />
                    Create New Channel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="font-serif text-2xl">Create New Channel</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6">
                    {/* Name & Timeframe */}
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Channel Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., 'VC Deep Dive'"
                                className="font-medium"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                Specific Context / Instructions
                                <Badge variant="secondary" className="text-[10px] h-5">Priority</Badge>
                            </Label>
                            <Textarea
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="e.g. 'Focus exclusively on early-stage fundraising deals in SF. Ignore public market news.' (This takes precedence over topic selection)"
                                className="h-20 resize-none text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground flex gap-1.5 items-start">
                                <Info className="w-3 h-3 mt-0.5" />
                                The AI will use this to filter and prioritize stories, overriding broad topic settings if they conflict.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Lookback Period</Label>
                            <div className="flex gap-2">
                                {["24h", "48h", "7d", "30d"].map((t) => (
                                    <Button
                                        key={t}
                                        variant={timeframe === t ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setTimeframe(t)}
                                        className="flex-1"
                                    >
                                        {t}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Topic Selector */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Select Topics</Label>
                            <span className="text-xs text-muted-foreground">{totalSelected} selected</span>
                        </div>

                        <div className="border rounded-lg divide-y">
                            {INTEREST_CATEGORIES.map((category) => {
                                const isOpen = openCategories.includes(category.id);
                                const selectedCount = selectedInterests[category.id]?.length || 0;

                                return (
                                    <div key={category.id} className="bg-card">
                                        <button
                                            onClick={() => toggleCategory(category.id)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{category.emoji}</span>
                                                <div className="text-left">
                                                    <p className="font-medium text-sm">{category.label}</p>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{category.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {selectedCount > 0 && (
                                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                        {selectedCount}
                                                    </Badge>
                                                )}
                                                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="p-3 pt-0 grid grid-cols-2 gap-2 bg-muted/20 animate-in slide-in-from-top-2">
                                                {category.subcategories.map((sub) => {
                                                    const isSelected = selectedInterests[category.id]?.includes(sub.id);
                                                    return (
                                                        <div
                                                            key={sub.id}
                                                            onClick={() => toggleInterest(category.id, sub.id)}
                                                            className={cn(
                                                                "cursor-pointer flex items-center justify-between p-2 rounded border text-sm transition-all",
                                                                isSelected
                                                                    ? "bg-primary/5 border-primary text-primary"
                                                                    : "bg-background border-transparent hover:border-border"
                                                            )}
                                                        >
                                                            <span className="font-medium">{sub.label}</span>
                                                            {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Custom Keywords */}
                    <div className="grid gap-2">
                        <Label>Additional Keywords (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={currentCustomTopic}
                                onChange={(e) => setCurrentCustomTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTopic()}
                                placeholder="Add specific keywords..."
                            />
                            <Button onClick={handleAddCustomTopic} size="icon" variant="secondary"><Plus className="w-4 h-4" /></Button>
                        </div>
                        {customTopics.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {customTopics.map((t, i) => (
                                    <Badge key={i} variant="outline" className="gap-1 pl-2">
                                        {t}
                                        <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => handleRemoveCustomTopic(i)} />
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-6 border-t bg-muted/10 mt-auto">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name || totalSelected === 0}>
                        Create Channel ({totalSelected})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
