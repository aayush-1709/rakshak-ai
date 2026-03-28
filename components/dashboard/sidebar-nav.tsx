'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Users,
  FileBarChart,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

const NAV = [
  { href: '/report', key: 'nav.report', icon: FileText },
  { href: '/complaints', key: 'nav.complaints', icon: LayoutDashboard },
  { href: '/forecast', key: 'nav.forecast', icon: TrendingUp },
  { href: '/ai-assistant', key: 'nav.aiAssistant', icon: MessageSquare },
  { href: '/corruption', key: 'nav.corruption', icon: AlertTriangle },
  { href: '/public-complaints', key: 'nav.publicComplaints', icon: Users },
  { href: '/news', key: 'nav.news', icon: Newspaper },
  { href: '/generate-report', key: 'nav.generateReport', icon: FileBarChart },
  { href: '/admin', key: 'nav.admin', icon: Settings },
] as const;

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className={cn('flex flex-col gap-0.5', className)}>
      <div className="px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {t('nav.sectionMain')}
        </p>
      </div>
      {NAV.map(({ href, key, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
