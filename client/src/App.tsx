import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import SeedsPage from "@/pages/seeds";
import TestersPage from "@/pages/testers";
import EvaluatePage from "@/pages/evaluate";
import LeaguesPage from "@/pages/leagues";
import DistributionPage from "@/pages/distribution";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/seeds" component={SeedsPage} />
        <Route path="/testers" component={TestersPage} />
        <Route path="/evaluate" component={EvaluatePage} />
        <Route path="/leagues" component={LeaguesPage} />
        <Route path="/distribution" component={DistributionPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
