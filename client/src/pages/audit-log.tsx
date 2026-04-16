import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Globe, Flame, Filter } from "lucide-react";
import type { DeletionLog } from "@shared/schema";
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [hostFilter, setHostFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery<DeletionLog[]>({
    queryKey: ["/api/deletion-log"],
  });

  // Sort newest first
  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  // Unique hosts for filter
  const hosts = [...new Set(sorted.map(l => l.hostName))].sort();

  const filtered = sorted.filter(l => {
    if (leagueFilter !== "all" && l.league !== Number(leagueFilter)) return false;
    if (hostFilter !== "all" && l.hostName !== hostFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record of seeds used by league hosts
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={leagueFilter} onValueChange={setLeagueFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leagues</SelectItem>
            {[1, 2, 3, 4, 5, 6].map(l => (
              <SelectItem key={l} value={String(l)}>League {l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hostFilter} onValueChange={setHostFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Hosts</SelectItem>
            {hosts.map(h => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} entr{filtered.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {/* Log entries */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-3 px-4"><div className="h-10 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {(logs || []).length === 0
                ? "No seeds have been used yet."
                : "No entries match these filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(entry => (
            <Card key={entry.id}>
              <CardContent className="py-2.5 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${LEAGUE_COLORS[entry.league] || ""}`}>
                      L{entry.league}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[entry.seedType] || ""}`}>
                      <TypeIcon type={entry.seedType} className="h-3 w-3" /> {entry.seedType}
                    </Badge>
                    <div className="flex items-center gap-2 min-w-0 text-sm">
                      <span className="flex items-center gap-1 font-mono font-medium" title="Overworld">
                        <Globe className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{entry.overworldSeed}</span>
                      </span>
                      <span className="text-muted-foreground">/</span>
                      <span className="flex items-center gap-1 font-mono font-medium" title="Nether">
                        <Flame className="h-3 w-3 text-red-500 shrink-0" />
                        <span className="truncate">{entry.netherSeed}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <div>
                      <span className="text-xs font-medium">{entry.hostName}</span>
                      <p className="text-[10px] text-muted-foreground">{formatTime(entry.deletedAt)}</p>
                    </div>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground mt-1 ml-[4.5rem]">{entry.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
