import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Crown, Globe, Flame, Clipboard, Inbox } from "lucide-react";
import type { Seed, Tester } from "@shared/schema";
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

export default function LeaguesPage() {
  const { toast } = useToast();
  const [selectedLeague, setSelectedLeague] = useState<string>("1");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: seeds } = useQuery<Seed[]>({
    queryKey: ["/api/seeds"],
  });

  const { data: testers } = useQuery<Tester[]>({
    queryKey: ["/api/testers"],
  });

  const testerMap = new Map(testers?.map(t => [t.id, t.name]) || []);
  const leagueNum = Number(selectedLeague);

  // Seeds approved for the selected league
  const leagueSeeds = (seeds || []).filter(s => {
    if (s.status !== "approved" || !s.approvedLeagues) return false;
    const leagues: number[] = JSON.parse(s.approvedLeagues);
    if (!leagues.includes(leagueNum)) return false;
    if (typeFilter !== "all" && s.seedType !== typeFilter) return false;
    return true;
  });

  // Group by seed type for summary
  const typeCounts: Record<string, number> = {};
  for (const s of leagueSeeds) {
    typeCounts[s.seedType] = (typeCounts[s.seedType] || 0) + 1;
  }

  const copySeed = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} seed copied` });
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">League Host View</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approved seeds for your league, ready to use
          </p>
        </div>
      </div>

      {/* League + type selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={selectedLeague} onValueChange={setSelectedLeague}>
            <SelectTrigger className="w-[150px] h-8 text-xs" data-testid="select-league">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(l => (
                <SelectItem key={l} value={String(l)}>League {l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-type-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {SEED_TYPES.map(t => (
              <SelectItem key={t} value={t}><TypeIcon type={t} className="h-3.5 w-3.5" /> {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {leagueSeeds.length} seed{leagueSeeds.length !== 1 ? "s" : ""} approved
        </span>
      </div>

      {/* Type summary chips */}
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

      {/* Seed list */}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy overworld seed"
                      onClick={() => copySeed(seed.overworldSeed, "Overworld")}
                    >
                      <Globe className="h-3 w-3 text-emerald-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy nether seed"
                      onClick={() => copySeed(seed.netherSeed, "Nether")}
                    >
                      <Flame className="h-3 w-3 text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Copy both seeds"
                      onClick={() => {
                        navigator.clipboard.writeText(`${seed.overworldSeed}, ${seed.netherSeed}`);
                        toast({ title: "Both seeds copied" });
                      }}
                    >
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
    </div>
  );
}
