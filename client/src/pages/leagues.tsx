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
import {
  Crown, Globe, Flame, Clipboard, Inbox, Plus, CalendarDays,
  Trash2, MessageSquare, AlertTriangle, ShieldCheck, Archive,
} from "lucide-react";
import type { Seed, Tester, WeeklySeed } from "@shared/schema";
import { SEED_TYPES } from "@shared/schema";

// ── Shared constants ──────────────────────────────────────────────

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

// ── Comment editor (inline) ───────────────────────────────────────

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

// ── Main page ─────────────────────────────────────────────────────

export default function LeaguesPage() {
  const { toast } = useToast();

  // Identity gate
  const [selectedHostId, setSelectedHostId] = useState<string>("");

  // Tab state
  const [activeTab, setActiveTab] = useState<"pool" | "distribution">("pool");

  // Pool tab state
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Distribution tab state
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [createWeekOpen, setCreateWeekOpen] = useState(false);
  const [newWeekName, setNewWeekName] = useState("");
  const [addSeedsOpen, setAddSeedsOpen] = useState(false);
  const [addLeague, setAddLeague] = useState<string>("");
  const [selectedSeedIds, setSelectedSeedIds] = useState<number[]>([]);

  // Data
  const { data: testers } = useQuery<Tester[]>({ queryKey: ["/api/testers"] });
  const { data: allSeeds } = useQuery<Seed[]>({ queryKey: ["/api/seeds"] });
  const { data: weeks } = useQuery<string[]>({ queryKey: ["/api/weekly-seeds/weeks"] });
  const { data: weeklySeeds } = useQuery<WeeklySeed[]>({ queryKey: ["/api/weekly-seeds"] });

  // Derived
  const selectedHost = testers?.find(t => t.id === Number(selectedHostId));
  const hostLeagues: number[] = selectedHost ? JSON.parse(selectedHost.leagues || "[]") : [];
  const allowedLeagues = [1, 2, 3, 4, 5, 6].filter(l => !hostLeagues.includes(l));
  const testerMap = new Map(testers?.map(t => [t.id, t.name]) || []);
  const seedMap = new Map((allSeeds || []).map(s => [s.id, s]));

  // Auto-set first allowed league when host is selected
  const handleHostChange = (id: string) => {
    setSelectedHostId(id);
    const host = testers?.find(t => t.id === Number(id));
    const leagues: number[] = host ? JSON.parse(host.leagues || "[]") : [];
    const allowed = [1, 2, 3, 4, 5, 6].filter(l => !leagues.includes(l));
    if (allowed.length > 0) {
      setSelectedLeague(String(allowed[0]));
      setAddLeague(String(allowed[0]));
    }
  };

  // ── Pool tab logic ──────────────────────────────────────────────

  const leagueNum = Number(selectedLeague);
  const leagueSeeds = (allSeeds || []).filter(s => {
    if (s.status !== "approved" || !s.approvedLeagues) return false;
    const leagues: number[] = JSON.parse(s.approvedLeagues);
    if (!leagues.includes(leagueNum)) return false;
    if (typeFilter !== "all" && s.seedType !== typeFilter) return false;
    return true;
  });

  const typeCounts: Record<string, number> = {};
  for (const s of leagueSeeds) {
    typeCounts[s.seedType] = (typeCounts[s.seedType] || 0) + 1;
  }

  const copySeed = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} seed copied` });
  };

  // ── Distribution tab logic ──────────────────────────────────────

  const activeWeek = selectedWeek || (weeks && weeks.length > 0 ? weeks[weeks.length - 1] : "");
  const currentWeekSeeds = (weeklySeeds || []).filter(ws => ws.weekLabel === activeWeek);
  const addLeagueNum = Number(addLeague);

  const availableSeeds = (allSeeds || []).filter(s => {
    if (s.status !== "approved" || !s.approvedLeagues) return false;
    const leagues: number[] = JSON.parse(s.approvedLeagues);
    if (!leagues.includes(addLeagueNum)) return false;
    const alreadyAssigned = currentWeekSeeds.some(ws => ws.seedId === s.id && ws.league === addLeagueNum);
    return !alreadyAssigned;
  });

  // Filter distribution view to only show allowed leagues
  const leagueGroups: Record<number, Array<WeeklySeed & { seed?: Seed }>> = {};
  for (const l of allowedLeagues) leagueGroups[l] = [];
  for (const ws of currentWeekSeeds) {
    if (!allowedLeagues.includes(ws.league)) continue;
    const seed = seedMap.get(ws.seedId);
    leagueGroups[ws.league]?.push({ ...ws, seed });
  }

  const visibleWeekSeeds = currentWeekSeeds.filter(ws => allowedLeagues.includes(ws.league));
  const totalSeeds = visibleWeekSeeds.length;
  const playedCount = visibleWeekSeeds.filter(ws => ws.played).length;

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
    bulkAddMutation.mutate(
      selectedSeedIds.map(seedId => ({ weekLabel: activeWeek, league: addLeagueNum, seedId }))
    );
  };

  // ── Identity gate ───────────────────────────────────────────────

  if (!selectedHostId) {
    return (
      <div className="p-6 max-w-md mx-auto mt-16">
        <Card>
          <CardContent className="py-8 px-6 space-y-4">
            <div className="text-center mb-2">
              <ShieldCheck className="h-10 w-10 text-primary/60 mx-auto mb-3" />
              <h1 className="text-lg font-bold tracking-tight">League Host Access</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select your name to continue. You'll only see seeds for leagues you don't play in.
              </p>
            </div>
            <Select value={selectedHostId} onValueChange={handleHostChange}>
              <SelectTrigger data-testid="select-host">
                <SelectValue placeholder="Who are you?" />
              </SelectTrigger>
              <SelectContent>
                {testers?.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Tabs ────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">League Hosts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hosting as <span className="font-medium text-foreground">{selectedHost?.name}</span>
            {hostLeagues.length > 0 && (
              <> — hidden: {hostLeagues.map(l => `L${l}`).join(", ")}</>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => setSelectedHostId("")}
        >
          Switch user
        </Button>
      </div>

      {/* Conflict warning */}
      {hostLeagues.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/15">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            You play in {hostLeagues.map(l => `League ${l}`).join(", ")}.
            Seeds for {hostLeagues.length === 1 ? "that league" : "those leagues"} are hidden to prevent spoilers.
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pool"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("pool")}
        >
          <Archive className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
          Seed Pool
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "distribution"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("distribution")}
        >
          <CalendarDays className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
          Weekly Distribution
        </button>
      </div>

      {/* ── POOL TAB ─────────────────────────────────────────────── */}
      {activeTab === "pool" && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <Crown className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={selectedLeague} onValueChange={setSelectedLeague}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedLeagues.map(l => (
                  <SelectItem key={l} value={String(l)}>League {l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {SEED_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    <TypeIcon type={t} className="h-3.5 w-3.5" /> {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {leagueSeeds.length} seed{leagueSeeds.length !== 1 ? "s" : ""} approved
            </span>
          </div>

          {Object.keys(typeCounts).length > 0 && typeFilter === "all" && (
            <div className="flex gap-2 flex-wrap">
              {SEED_TYPES.filter(t => typeCounts[t]).map(t => (
                <Badge
                  key={t}
                  variant="outline"
                  className={`text-xs cursor-pointer hover:opacity-80 ${TYPE_BADGE_COLORS[t]}`}
                  onClick={() => setTypeFilter(t)}
                >
                  <TypeIcon type={t} className="h-3 w-3 mr-1" />
                  {t}: {typeCounts[t]}
                </Badge>
              ))}
            </div>
          )}

          {leagueSeeds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No approved seeds for League {leagueNum} yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5">
              {leagueSeeds.map(seed => (
                <Card key={seed.id}>
                  <CardContent className="py-2.5 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[seed.seedType] || ""}`}>
                          <TypeIcon type={seed.seedType} className="h-3.5 w-3.5" /> {seed.seedType}
                        </Badge>
                        <div className="flex items-center gap-2 min-w-0 text-sm">
                          <span className="flex items-center gap-1 font-mono font-medium" title="Overworld seed">
                            <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{seed.overworldSeed}</span>
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="flex items-center gap-1 font-mono font-medium" title="Nether seed">
                            <Flame className="h-3 w-3 text-red-500 shrink-0" />
                            <span className="truncate">{seed.netherSeed}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {seed.testerId && testerMap.get(seed.testerId) && (
                          <span className="text-[10px] text-muted-foreground">
                            by {testerMap.get(seed.testerId)}
                          </span>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy overworld"
                          onClick={() => copySeed(seed.overworldSeed, "Overworld")}>
                          <Globe className="h-3 w-3 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy nether"
                          onClick={() => copySeed(seed.netherSeed, "Nether")}>
                          <Flame className="h-3 w-3 text-red-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy both"
                          onClick={() => {
                            navigator.clipboard.writeText(`${seed.overworldSeed}, ${seed.netherSeed}`);
                            toast({ title: "Both seeds copied" });
                          }}>
                          <Clipboard className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {seed.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{seed.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── DISTRIBUTION TAB ─────────────────────────────────────── */}
      {activeTab === "distribution" && (
        <>
          {/* Week selector + actions */}
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
              <span className="text-xs text-muted-foreground">{playedCount}/{totalSeeds} played</span>
            )}
            <div className="flex items-center gap-2 ml-auto">
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
                    <DialogDescription>Give this week a name.</DialogDescription>
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
              {activeWeek && (
                <Dialog open={addSeedsOpen} onOpenChange={v => { setAddSeedsOpen(v); if (!v) setSelectedSeedIds([]); }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Seeds
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Add Seeds to {activeWeek}</DialogTitle>
                      <DialogDescription>Pick approved seeds from the pool for a league.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">League</label>
                        <Select value={addLeague} onValueChange={v => { setAddLeague(v); setSelectedSeedIds([]); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {allowedLeagues.map(l => (
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
                            No approved seeds available for League {addLeague}.
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
                                onCheckedChange={() => setSelectedSeedIds(prev =>
                                  prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                                )}
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
              )}
            </div>
          </div>

          {/* Weekly seed list by league */}
          {!activeWeek ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Create a week to start distributing seeds.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allowedLeagues.map(league => {
                const items = leagueGroups[league] || [];
                if (items.length === 0) return null;
                const played = items.filter(i => i.played).length;
                return (
                  <div key={league}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className={`text-xs font-semibold ${LEAGUE_COLORS[league]}`}>
                        League {league}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{played}/{items.length} played</span>
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
                                  onCheckedChange={() => updateMutation.mutate({ id: ws.id, data: { played: !ws.played } })}
                                  className="shrink-0"
                                />
                                {seed ? (
                                  <>
                                    <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[seed.seedType] || ""}`}>
                                      <TypeIcon type={seed.seedType} className="h-3 w-3" /> {seed.seedType}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 min-w-0 text-xs flex-1">
                                      <span className="flex items-center gap-0.5 font-mono font-medium">
                                        <Globe className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                                        <span className="truncate">{seed.overworldSeed}</span>
                                      </span>
                                      <span className="text-muted-foreground">/</span>
                                      <span className="flex items-center gap-0.5 font-mono font-medium">
                                        <Flame className="h-2.5 w-2.5 text-red-500 shrink-0" />
                                        <span className="truncate">{seed.netherSeed}</span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy both"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${seed.overworldSeed}, ${seed.netherSeed}`);
                                          toast({ title: "Seeds copied" });
                                        }}>
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
                                <CommentEditor ws={ws} onSave={(c) => updateMutation.mutate({ id: ws.id, data: { comment: c || null } })} />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {visibleWeekSeeds.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No seeds assigned to {activeWeek} yet. Click "Add Seeds" above.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
