import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, AlertTriangle, Clipboard, TestTube, Globe, Flame } from "lucide-react";
import type { Seed, Tester } from "@shared/schema";

const LEAGUE_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/20",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  4: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  5: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  6: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

const TYPE_ICON: Record<string, string> = {
  "Village": "🏘️",
  "Desert Temple": "🏛️",
  "Ruined Portal": "🌀",
  "Buried Treasure": "💎",
  "Shipwreck": "🚢",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  "Village": "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/15",
  "Desert Temple": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/15",
  "Ruined Portal": "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/15",
  "Buried Treasure": "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/15",
  "Shipwreck": "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/15",
};

export default function EvaluatePage() {
  const { toast } = useToast();
  const [selectedTesterId, setSelectedTesterId] = useState<string>("");
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>([]);
  const [notes, setNotes] = useState("");

  const { data: testers } = useQuery<Tester[]>({
    queryKey: ["/api/testers"],
  });

  const { data: seeds } = useQuery<Seed[]>({
    queryKey: ["/api/seeds"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiRequest("PATCH", `/api/seeds/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSelectedLeagues([]);
      setNotes("");
    },
  });

  const selectedTester = testers?.find(t => t.id === Number(selectedTesterId));
  const testerLeagues: number[] = selectedTester ? JSON.parse(selectedTester.leagues || "[]") : [];

  // Available leagues = leagues this tester does NOT play in
  const availableLeagues = [1, 2, 3, 4, 5, 6].filter(l => !testerLeagues.includes(l));

  // Seeds this tester can evaluate: pending, not yet claimed
  const pendingSeeds = seeds?.filter(s => s.status === "pending" && !s.testerId) || [];
  const currentSeed = pendingSeeds[0];

  const toggleLeague = (l: number) => {
    setSelectedLeagues(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l].sort());
  };

  const handleApprove = () => {
    if (!currentSeed || !selectedTesterId) return;
    if (selectedLeagues.length === 0) {
      toast({ title: "Select at least one league", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: currentSeed.id,
      data: {
        status: "approved",
        approvedLeagues: JSON.stringify(selectedLeagues),
        testerId: Number(selectedTesterId),
        notes: notes || null,
      },
    });
    toast({ title: "Seed approved", description: `Assigned to league${selectedLeagues.length > 1 ? "s" : ""} ${selectedLeagues.join(", ")}` });
  };

  const handleReject = () => {
    if (!currentSeed || !selectedTesterId) return;
    updateMutation.mutate({
      id: currentSeed.id,
      data: {
        status: "rejected",
        testerId: Number(selectedTesterId),
        notes: notes || null,
      },
    });
    toast({ title: "Seed rejected" });
  };

  const copySeed = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} seed copied` });
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Evaluate Seeds</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select your name, get a seed, test it, then approve or reject
        </p>
      </div>

      {/* Tester selection */}
      <Card>
        <CardContent className="py-4 px-4">
          <label className="text-sm font-medium mb-2 block">Who are you?</label>
          <Select value={selectedTesterId} onValueChange={setSelectedTesterId}>
            <SelectTrigger data-testid="select-tester">
              <SelectValue placeholder="Select your name..." />
            </SelectTrigger>
            <SelectContent>
              {testers?.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTester && testerLeagues.length > 0 && (
            <div className="flex items-start gap-2 mt-3 p-2.5 rounded-md bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                You play in {testerLeagues.map(l => `League ${l}`).join(", ")}. Seeds you evaluate
                can only be assigned to other leagues.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current seed to evaluate */}
      {!selectedTesterId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TestTube className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select your name above to start evaluating seeds.</p>
          </CardContent>
        </Card>
      ) : !currentSeed ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No pending seeds to evaluate. All done for now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-primary/20">
            <CardContent className="py-5 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Seed to Test
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${TYPE_BADGE_COLORS[currentSeed.seedType] || ""}`}>
                    {TYPE_ICON[currentSeed.seedType] || ""} {currentSeed.seedType}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  {pendingSeeds.length} remaining
                </Badge>
              </div>

              {/* Overworld seed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/10">
                  <Globe className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider shrink-0">
                    Overworld
                  </span>
                  <code className="text-sm font-mono font-bold flex-1" data-testid="text-overworld-seed">
                    {currentSeed.overworldSeed}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copySeed(currentSeed.overworldSeed, "Overworld")}
                    data-testid="button-copy-overworld"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Nether seed */}
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-500/5 border border-red-500/10">
                  <Flame className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium uppercase tracking-wider shrink-0">
                    Nether
                  </span>
                  <code className="text-sm font-mono font-bold flex-1" data-testid="text-nether-seed">
                    {currentSeed.netherSeed}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copySeed(currentSeed.netherSeed, "Nether")}
                    data-testid="button-copy-nether"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* League selection */}
          <Card>
            <CardContent className="py-4 px-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Which leagues is this seed good for?
                </label>
                {availableLeagues.length === 0 ? (
                  <p className="text-xs text-muted-foreground">You play in all leagues. Cannot evaluate seeds.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableLeagues.map(l => (
                      <label
                        key={l}
                        className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors ${
                          selectedLeagues.includes(l)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-primary/20"
                        }`}
                      >
                        <Checkbox
                          checked={selectedLeagues.includes(l)}
                          onCheckedChange={() => toggleLeague(l)}
                          data-testid={`checkbox-approve-league-${l}`}
                        />
                        <span className="text-sm font-medium">League {l}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. good nether, bastion is close..."
                  className="text-sm min-h-[60px]"
                  data-testid="textarea-notes"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleApprove}
                  className="flex-1"
                  disabled={selectedLeagues.length === 0 || updateMutation.isPending}
                  data-testid="button-approve"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Approve{selectedLeagues.length > 0 ? ` for L${selectedLeagues.join(", L")}` : ""}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  className="text-destructive hover:text-destructive"
                  disabled={updateMutation.isPending}
                  data-testid="button-reject"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
