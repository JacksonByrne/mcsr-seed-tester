import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Pencil, Users, Shield } from "lucide-react";
import type { Tester } from "@shared/schema";

const LEAGUE_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300 border-slate-400/20",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  4: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  5: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  6: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
};

function TesterForm({
  onSubmit,
  initialName = "",
  initialLeagues = [],
  submitLabel = "Add Tester",
}: {
  onSubmit: (name: string, leagues: number[]) => void;
  initialName?: string;
  initialLeagues?: number[];
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialName);
  const [leagues, setLeagues] = useState<number[]>(initialLeagues);

  const toggleLeague = (l: number) => {
    setLeagues(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l].sort());
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. kilby"
          data-testid="input-tester-name"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Leagues they play in (conflict of interest)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(l => (
            <label
              key={l}
              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                leagues.includes(l)
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <Checkbox
                checked={leagues.includes(l)}
                onCheckedChange={() => toggleLeague(l)}
                data-testid={`checkbox-league-${l}`}
              />
              <span className="text-sm font-medium">League {l}</span>
            </label>
          ))}
        </div>
      </div>
      <Button
        onClick={() => { if (name.trim()) onSubmit(name.trim(), leagues); }}
        disabled={!name.trim()}
        className="w-full"
        data-testid="button-submit-tester"
      >
        {submitLabel}
      </Button>
    </div>
  );
}

export default function TestersPage() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTester, setEditingTester] = useState<Tester | null>(null);

  const { data: testers, isLoading } = useQuery<Tester[]>({
    queryKey: ["/api/testers"],
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; leagues: string }) =>
      apiRequest("POST", "/api/testers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setAddOpen(false);
      toast({ title: "Tester added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; leagues: string } }) =>
      apiRequest("PATCH", `/api/testers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setEditOpen(false);
      setEditingTester(null);
      toast({ title: "Tester updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/testers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/testers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Tester removed" });
    },
  });

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Testers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage seed testers and their league conflicts
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-tester">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Tester
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tester</DialogTitle>
              <DialogDescription>Add a seed tester and mark which leagues they play in.</DialogDescription>
            </DialogHeader>
            <TesterForm
              onSubmit={(name, leagues) =>
                addMutation.mutate({ name, leagues: JSON.stringify(leagues) })
              }
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-4 px-4"><div className="h-10 bg-muted rounded" /></CardContent>
            </Card>
          ))}
        </div>
      ) : !testers?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No testers yet. Add one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {testers.map(tester => {
            const leagues: number[] = JSON.parse(tester.leagues || "[]");
            return (
              <Card key={tester.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {tester.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" data-testid={`text-tester-name-${tester.id}`}>
                          {tester.name}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {leagues.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No league conflicts</span>
                          ) : (
                            leagues.map(l => (
                              <Badge
                                key={l}
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${LEAGUE_COLORS[l]}`}
                              >
                                L{l}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        data-testid={`button-edit-tester-${tester.id}`}
                        onClick={() => {
                          setEditingTester(tester);
                          setEditOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            data-testid={`button-delete-tester-${tester.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {tester.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove them from the tester list. Seeds they've evaluated will keep their reviews.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(tester.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setEditingTester(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tester</DialogTitle>
            <DialogDescription>Update the tester's name and league conflicts.</DialogDescription>
          </DialogHeader>
          {editingTester && (
            <TesterForm
              initialName={editingTester.name}
              initialLeagues={JSON.parse(editingTester.leagues || "[]")}
              submitLabel="Save Changes"
              onSubmit={(name, leagues) =>
                updateMutation.mutate({
                  id: editingTester.id,
                  data: { name, leagues: JSON.stringify(leagues) },
                })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
