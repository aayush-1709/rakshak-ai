'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DashboardBrand } from '@/components/dashboard/dashboard-brand';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import Navbar from '@/components/navbar';
import {
  DashboardRefreshProvider,
  useDashboardRefresh,
} from '@/components/dashboard/dashboard-refresh-context';
import { cn } from '@/lib/utils';

/** Radix (Sheet, Select) IDs differ between SSR and the client; render them only after mount. */
function DashboardTopBar() {
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { bumpDataRefresh } = useDashboardRefresh();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="sticky top-0 z-40 border-b border-sky-100/90 bg-white/95 backdrop-blur-sm shadow-[inset_0_-1px_0_rgba(255,255,255,0.6)]"
        aria-hidden
      >
        <div className="flex items-center gap-2 px-3 py-2 lg:hidden h-11" />
        <div className="min-h-[4.5rem] sm:min-h-[4.75rem] w-full px-4 lg:px-6 py-3 sm:py-4" />
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 border-b border-sky-100/90 bg-white/95 backdrop-blur-sm shadow-[inset_0_-1px_0_rgba(255,255,255,0.6)]">
      <div className="flex items-center gap-2 px-3 py-2 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="border-b border-sky-100/90 bg-gradient-to-b from-white to-slate-50/30">
              <DashboardBrand compact />
            </div>
            <SidebarNav className="p-3" />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-slate-800">Menu</span>
      </div>
      <Navbar onMockModeChanged={bumpDataRefresh} />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardRefreshProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
        <div className="flex min-h-screen">
          <aside
            className={cn(
              'hidden lg:flex w-60 shrink-0 flex-col border-r border-sky-100/70 bg-white/95 backdrop-blur-sm',
              'sticky top-0 h-screen overflow-y-auto'
            )}
          >
            <div className="border-b border-sky-100/90 shrink-0 bg-gradient-to-b from-white to-slate-50/40 shadow-[inset_0_-1px_0_rgba(224,242,254,0.5)]">
              <DashboardBrand />
            </div>
            <SidebarNav className="p-3 pt-2" />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <DashboardTopBar />
            <main className="flex-1 p-3 sm:p-4 lg:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
          </div>
        </div>
      </div>
    </DashboardRefreshProvider>
  );
}
