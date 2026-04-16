import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Sprout, TestTube, Crown, CalendarDays, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/seeds", label: "Seed Pool", icon: Sprout },
  { path: "/testers", label: "Testers", icon: Users },
  { path: "/evaluate", label: "Evaluate", icon: TestTube },
  { path: "/leagues", label: "League Hosts", icon: Crown },
  { path: "/distribution", label: "Distribution", icon: CalendarDays },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r border-sidebar-border bg-sidebar shrink-0 flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            {/* Inline SVG logo - stylized seed/diamond */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-label="MCSR Seeds logo"
              className="text-primary shrink-0"
            >
              <path d="M12 2L4 8v8l8 6 8-6V8l-8-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 8v8M8 10l4 2 4-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">MCSR Seeds</h1>
              <p className="text-[10px] text-muted-foreground mt-0.5">Ranked Leagues</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground"
            onClick={() => setDark(!dark)}
            data-testid="button-theme-toggle"
          >
            {dark ? <Sun className="h-3.5 w-3.5 mr-2" /> : <Moon className="h-3.5 w-3.5 mr-2" />}
            {dark ? "Light mode" : "Dark mode"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
