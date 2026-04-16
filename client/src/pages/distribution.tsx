import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, CalendarDays, Globe, Flame, Clipboard, Trash2, MessageSquare, Inbox } from "lucide-react";
import type { Seed, WeeklySeed } from "@shared/schema";
import { SEED_TYPES } from "@shared/schema";

const LEAGUE_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/20",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  4: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  5: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  6: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

const TYPE_IMAGE: Record<string, string> = {
  "Village": "/images/village.png",
  "Desert Temple": "/images/desert-temple.png",
  "Ruined Portal": "/images/ruined-portal.png",
  "Buried Treasure": "/images/buried-treasure.png",
  "Shipwreck": "/images/shipwreck.png",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  "Village": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/15",
  "Desert Temple": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/15",
  "Ruined Portal": "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/15",
  "Buried Treasure": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/15",
  "Shipwreck": "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/15",
};

function TypeIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  const src = TYPE_IMAGE[type];
  if (!src) return null;
  return <img src={src} alt={type} className={`${className} object-contain inline-block`} />;
}

// Inline comment editor
function CommentEditor({ ws, onSave }: { ws: WeeklySeed; onSave: (comment: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(ws.comment || "");

  if (!editing) {
    return (
      <button
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setEditing(true)}
        title={ws.comment ? "Edit comment" : "Add comment"}
      >
        <MessageSquare className="h-3 w-3" />
        {ws.comment || "Add comment"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        className="h-6 text-xs px-2 py-0"
        placeholder="e.g. good seed, both playtesters sub 10"
        autoFocus
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(text); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => { onSave(text); setEditing(false); }}
      >
        Save
      </Button>
    </div>
  );
}

export default function DistributionPage() {
  const { toast } = useToast();
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [newWeekName, setNewWeekName] = useState("");
  const [createWeekOpen, setCreateWeekOpen] = useState(false);
  const [addSeedsOpen, setAddSeedsOpen] = useState(false);
  const [addLeague, setAddLeague] = useState<string>("1");
  const [selectedSeedIds, setSelectedSeedIds] = useState<number[]>([]);

  // Data queries
  const { data: weeks } = useQuery<string[]>({
    queryKey: ["/api/weekly-seeds/weeks"],
  });

  const { data: weeklySeeds } = useQuery<WeeklySeed[]>({
    queryKey: ["/api/weekly-seeds"],
  });

  const { data: allSeeds } = useQuery<Seed[]>({
    queryKey: ["/api/seeds"],
  });

  // Use first week as default when loaded
  const activeWeek = selectedWeek || (weeks && weeks.length > 0 ? weeks[weeks.length - 1] : "");

  // Weekly seeds for the active week
  const currentWeekSeeds = (weeklySeeds || []).filter(ws => ws.weekLabel === activeWeek);

  // Seeds already assigned this week (any league) - to avoid double-assigning
  const assignedSeedIds = new Set(currentWeekSeeds.map(ws => ws.seedId));

  // Approved seeds available to add (not already in this week for the selected league)
  const leagueNum = Number(addLeague);
  const availableSeeds = (allSeeds || []).filter(s => {
    if (s.status !== "approved" || !s.approvedLeagues) return false;
    const leagues: number[] = JSON.parse(s.approvedLeagues);
    if (!leagues.includes(leagueNum)) return false;
    // Don't show seeds already assigned this week to this league
    const alreadyAssigned = currentWeekSeeds.some(ws => ws.seedId === s.id && ws.league === leagueNum);
    return !alreadyAssigned;
  });

  // Mutations
  const bulkAddMutation = useMutation({
    mutationFn: (entries: Array<{ weekLabel: string; league: number; seedId: number }>) =>
      apiRequest("POST", "/api/weekly-seeds/bulk", { entries }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-seeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-seeds/weeks"] });
      setAddSeedsOpen(false);
      setSelectedSeedIds([]);
      toast({ title: "Seeds added to week" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/weekly-seeds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-seeds"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/weekly-seeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-seeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-seeds/weeks"] });
      toast({ title: "Seed removed from week" });
    },
  });

  const handleCreateWeek = () => {
    const name = newWeekName.trim();
    if (!name) return;
    setSelectedWeek(name);
    setCreateWeekOpen(false);
    setNewWeekName("");
    toast({ title: `Week "${name}" created` });
  };

  const handleAddSeeds = () => {
    if (selectedSeedIds.length === 0 || !activeWeek) return;
    const entries = selectedSeedIds.map(seedId => ({
      weekLabel: activeWeek,
      league: leagueNum,
      seedId,
    }));
    bulkAddMutation.mutate(entries);
  };

  const toggleSeedSelection = (id: number) => {
    setSelectedSeedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const togglePlayed = (ws: WeeklySeed) => {
    updateMutation.mutate({
      id: ws.id,
      data: { played: !ws.played },
    });
  };

  const saveComment = (ws: WeeklySeed, comment: string) => {
    updateMutation.mutate({
      id: ws.id,
      data: { comment: comment || null },
    });
  };

  const copySeed = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} seed copied` });
  };

  // Build a lookup for seed data
  const seedMap = new Map((allSeeds || []).map(s => [s.id, s]));

  // Group current week's seeds by league
  const leagueGroups: Record<number, Array<WeeklySeed & { seed?: Seed }>> = {};
  for (let i = 1; i <= 6; i++) leagueGroups[i] = [];
  for (const ws of currentWeekSeeds) {
    const seed = seedMap.get(ws.seedId);
    if (leagueGroups[ws.league]) {
      leagueGroups[ws.league].push({ ...ws, seed });
    }
  }

  const totalSeeds = currentWeekSeeds.length;
  const playedCount = currentWeekSeeds.filter(ws => ws.played).length;

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Weekly Distribution</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign approved seeds to leagues each week and track as they're played
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createWeekOpen} onOpenChange={setCreateWeekOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1.5" />
                New Week
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Create Week</DialogTitle>
                <DialogDescription>Give this week a name to organize seed distribution.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={newWeekName}
                  onChange={e => setNewWeekName(e.target.value)}
                  placeholder="e.g. Week 1, Week 12, Finals"
                  onKeyDown={e => { if (e.key === "Enter") handleCreateWeek(); }}
                  autoFocus
                />
                <Button onClick={handleCreateWeek} disabled={!newWeekName.trim()} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        {weeks && weeks.length > 0 ? (
          <Select value={activeWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Select week..." />
            </SelectTrigger>
            <SelectContent>
              {[...weeks].reverse().map(w => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground">No weeks yet — create one to start</span>
        )}
        {activeWeek && (
          <>
            <span className="text-xs text-muted-foreground">
              {playedCount}/{totalSeeds} played
            </span>
            <Dialog open={addSeedsOpen} onOpenChange={v => { setAddSeedsOpen(v); if (!v) setSelectedSeedIds([]); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Seeds to Week
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Seeds to {activeWeek}</DialogTitle>
                  <DialogDescription>Pick approved seeds from the pool to assign to a league.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">League</label>
                    <Select value={addLeague} onValueChange={v => { setAddLeague(v); setSelectedSeedIds([]); }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map(l => (
                          <SelectItem key={l} value={String(l)}>League {l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 overflow-auto space-y-1 min-h-0">
                    <label className="text-sm font-medium mb-1 block">
                      Available seeds ({availableSeeds.length})
                    </label>
                    {availableSeeds.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No approved seeds available for League {addLeague} this week.
                      </p>
                    ) : (
                      availableSeeds.map(s => (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${
                            selectedSeedIds.includes(s.id)
                              ? "border-primary/40 bg-primary/5"
                              : "border-border hover:border-primary/20"
                          }`}
                        >
                          <Checkbox
                            checked={selectedSeedIds.includes(s.id)}
                            onCheckedChange={() => toggleSeedSelection(s.id)}
                          />
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[s.seedType] || ""}`}>
                            <TypeIcon type={s.seedType} className="h-3 w-3" /> {s.seedType}
                          </Badge>
                          <span className="font-mono text-xs truncate">{s.overworldSeed}</span>
                          <span className="text-muted-foreground text-xs">/</span>
                          <span className="font-mono text-xs truncate">{s.netherSeed}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <Button
                    onClick={handleAddSeeds}
                    disabled={selectedSeedIds.length === 0 || bulkAddMutation.isPending}
                    className="w-full"
                  >
                    {bulkAddMutation.isPending
                      ? "Adding..."
                      : `Add ${selectedSeedIds.length} seed${selectedSeedIds.length !== 1 ? "s" : ""} to League ${addLeague}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* League groups */}
      {!activeWeek ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Create a week to start distributing seeds.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(league => {
            const items = leagueGroups[league];
            if (items.length === 0) return null;
            const played = items.filter(i => i.played).length;
            return (
              <div key={league}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className={`text-xs font-semibold ${LEAGUE_COLORS[league]}`}>
                    League {league}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {played}/{items.length} played
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map(ws => {
                    const seed = ws.seed;
                    return (
                      <Card key={ws.id} className={ws.played ? "opacity-60" : ""}>
                        <CardContent className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={ws.played}
                              onCheckedChange={() => togglePlayed(ws)}
                              className="shrink-0"
                            />
                            {seed ? (
                              <>
                                <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[seed.seedType] || ""}`}>
                                  <TypeIcon type={seed.seedType} className="h-3 w-3" /> {seed.seedType}
                                </Badge>
                                <div className="flex items-center gap-1.5 min-w-0 text-xs flex-1">
                                  <span className="flex items-center gap-0.5 font-mono font-medium" title="Overworld">
                                    <Globe className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                    <span className="truncate">{seed.overworldSeed}</span>
                                  </span>
                                  <span className="text-muted-foreground">/</span>
                                  <span className="flex items-center gap-0.5 font-mono font-medium" title="Nether">
                                    <Flame className="h-2.5 w-2.5 text-red-500 shrink-0" />
                                    <span className="truncate">{seed.netherSeed}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <Button
                                    variant="ghost" size="icon" className="h-6 w-6"
                                    title="Copy both seeds"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`${seed.overworldSeed}, ${seed.netherSeed}`);
                                      toast({ title: "Seeds copied" });
                                    }}
                                  >
                                    <Clipboard className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Remove from week?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This removes the seed from {activeWeek} League {league}. The seed stays in the pool.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteMutation.mutate(ws.id)}>Remove</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Seed deleted from pool</span>
                            )}
                          </div>
                          <div className="ml-7 mt-0.5">
                            <CommentEditor ws={ws} onSave={(c) => saveComment(ws, c)} />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Show empty state if no seeds assigned to any league */}
          {currentWeekSeeds.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No seeds assigned to {activeWeek} yet. Click "Add Seeds to Week" above.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
