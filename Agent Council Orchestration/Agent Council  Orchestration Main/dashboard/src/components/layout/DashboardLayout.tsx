import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import Footer from "./Footer";
import Breadcrumbs from "./Breadcrumbs";
import CommandPalette from "../shared/CommandPalette";
import KeyboardShortcuts from "../shared/KeyboardShortcuts";
// import OnboardingTour from "../shared/OnboardingTour"; // disabled — overlay blocks clicks
import AnnouncementBanner from "../shared/AnnouncementBanner";
import ErrorBoundary from "../shared/ErrorBoundary";
import { Outlet, useLocation } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <div className="flex flex-1">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <AnnouncementBanner />
            <header className="h-14 flex items-center border-b border-border/50 px-4 gap-3 shrink-0">
              <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
              <div className="h-4 w-px bg-border/60" />
              <Breadcrumbs />
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground active:scale-[0.95] transition-all"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Moon className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </Button>
                <span data-tour="cmdk" className="text-xs text-muted-foreground/60 font-mono hidden md:block">
                  ⌘K to search
                </span>
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <ErrorBoundary>
                <div className="animate-fade-in">
                  <Outlet />
                </div>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </div>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
      {/* {isDashboard && <OnboardingTour />} — disabled until overlay fix */}
    </SidebarProvider>
  );
}
