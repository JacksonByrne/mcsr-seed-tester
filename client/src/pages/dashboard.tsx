import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sprout, Users, Clock, CheckCircle, XCircle, Layers } from "lucide-react";

interface Stats {
  totalSeeds: number;
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  totalTesters: number;
  leagueStats: Record<number, { approved: number; pending: number; rejected: number }>;
}

const LEAGUE_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/20",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  4: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  5: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  6: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

const LEAGUE_NAMES: Record<number, string> = {
  1: "League 1",
  2: "League 2",
  3: "League 3",
  4: "League 4",
  5: "League 5",
  6: "League 6",
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6"><div className="h-8 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Seed testing overview across all leagues</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Sprout className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Seeds</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" data-testid="text-total-seeds">{stats.totalSeeds}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400" data-testid="text-pending">{stats.totalPending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Approved</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400" data-testid="text-approved">{stats.totalApproved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Rejected</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400" data-testid="text-rejected">{stats.totalRejected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Testers</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" data-testid="text-testers">{stats.totalTesters}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">League Breakdown</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(league => {
            const ls = stats.leagueStats[league] || { approved: 0, pending: 0, rejected: 0 };
            return (
              <Card key={league}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline" className={`${LEAGUE_COLORS[league]} text-xs font-semibold`}>
                      {LEAGUE_NAMES[league]}
                    </Badge>
                    <span className="text-lg font-bold tabular-nums" data-testid={`text-league-${league}-approved`}>
                      {ls.approved}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ls.approved} approved seed{ls.approved !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
