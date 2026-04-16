import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Sprout, Filter, Globe, Flame } from "lucide-react";
import type { Seed } from "@shared/schema";
import { SEED_TYPES, type SeedType } from "@shared/schema";

const LEAGUE_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/20",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  4: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  5: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  6: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
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

// Parse a single line: "overworld_seed, nether_seed" 
function parseSeedLine(line: string): { overworld: string; nether: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Support comma, tab, or pipe separated
  const parts = trimmed.split(/[,\t|]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { overworld: parts[0], nether: parts[1] };
  }
  return null;
}

export default function SeedsPage() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: seeds, isLoading } = useQuery<Seed[]>({
    queryKey: ["/api/seeds"],
  });

  const bulkAddMutation = useMutation({
    mutationFn: (seedList: Array<{ overworldSeed: string; netherSeed: string; seedType: string }>) =>
      apiRequest("POST", "/api/seeds/bulk", { seeds: seedList }),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/seeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setAddOpen(false);
      setBulkText("");
      setSelectedType("");
      toast({ title: `${created.length} seed${created.length !== 1 ? "s" : ""} added` });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/seeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seeds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Seed removed" });
    },
  });

  const handleBulkAdd = () => {
    if (!selectedType) {
      toast({ title: "Select a seed type first", variant: "destructive" });
      return;
    }
    const lines = bulkText.split("\n");
    const parsed: Array<{ overworldSeed: string; netherSeed: string; seedType: string }> = [];
    for (const line of lines) {
      const result = parseSeedLine(line);
      if (result) {
        parsed.push({
          overworldSeed: result.overworld,
          netherSeed: result.nether,
          seedType: selectedType,
        });
      }
    }
    if (parsed.length > 0) {
      bulkAddMutation.mutate(parsed);
    } else {
      toast({ title: "No valid seeds found. Use format: overworld, nether", variant: "destructive" });
    }
  };

  const parsedCount = bulkText
    .split("\n")
    .filter(l => parseSeedLine(l) !== null).length;

  const filteredSeeds = seeds?.filter(s => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (typeFilter !== "all" && s.seedType !== typeFilter) return false;
    return true;
  }) || [];

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Seed Pool</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add seeds and track their testing status
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) { setBulkText(""); setSelectedType(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-seeds">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Seeds
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Seeds</DialogTitle>
              <DialogDescription>
                Paste overworld and nether seeds, one pair per line.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Seed Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-seed-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SEED_TYPES.map(t => (
                      <SelectItem key={t} value={t}>
                        {TYPE_ICON[t]} {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Seeds</label>
                <p className="text-xs text-muted-foreground mb-2">
                  One pair per line: <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">overworld_seed, nether_seed</code>
                </p>
                <Textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={"-1234567890, 9876543210\n5555555555, -3333333333\n1111111111, -7777777777"}
                  className="font-mono text-sm min-h-[140px]"
                  data-testid="textarea-bulk-seeds"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {parsedCount} valid pair{parsedCount !== 1 ? "s" : ""} detected
                </span>
                <Button
                  onClick={handleBulkAdd}
                  disabled={!bulkText.trim() || !selectedType || bulkAddMutation.isPending}
                  data-testid="button-submit-seeds"
                >
                  {bulkAddMutation.isPending ? "Adding..." : "Add Seeds"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SEED_TYPES.map(t => (
              <SelectItem key={t} value={t}>{TYPE_ICON[t]} {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-1">
          {filteredSeeds.length} seed{filteredSeeds.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-3 px-4"><div className="h-10 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSeeds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sprout className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {seeds?.length === 0 ? "No seeds yet. Add some to get started." : "No seeds match these filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filteredSeeds.map(seed => {
            const approvedLeagues: number[] = seed.approvedLeagues ? JSON.parse(seed.approvedLeagues) : [];
            return (
              <Card key={seed.id}>
                <CardContent className="py-2.5 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[seed.seedType] || ""}`}>
                        {TYPE_ICON[seed.seedType] || ""} {seed.seedType}
                      </Badge>
                      <div className="flex items-center gap-2 min-w-0 text-sm">
                        <span className="flex items-center gap-1 font-mono font-medium" title="Overworld seed">
                          <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="truncate" data-testid={`text-ow-${seed.id}`}>{seed.overworldSeed}</span>
                        </span>
                        <span className="text-muted-foreground">/</span>
                        <span className="flex items-center gap-1 font-mono font-medium" title="Nether seed">
                          <Flame className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="truncate" data-testid={`text-nether-${seed.id}`}>{seed.netherSeed}</span>
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_BADGE[seed.status]}`}>
                        {seed.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {approvedLeagues.map(l => (
                        <Badge key={l} variant="outline" className={`text-[10px] px-1.5 py-0 ${LEAGUE_COLORS[l]}`}>
                          L{l}
                        </Badge>
                      ))}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-seed-${seed.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete seed?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this {seed.seedType} seed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(seed.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {seed.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{seed.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
