'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { getComplaints } from '@/lib/api';
import type { Complaint } from '@/lib/types';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function last12MonthSlots(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    out.push({ key, label });
  }
  return out;
}

function buildMonthlySeries(complaints: Complaint[]) {
  const slots = last12MonthSlots();
  const counts = new Map<string, number>();
  slots.forEach((s) => counts.set(s.key, 0));

  for (const c of complaints) {
    const d = new Date(c.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return slots.map((s) => ({
    month: s.label,
    monthKey: s.key,
    count: counts.get(s.key) ?? 0,
  }));
}

export default function ReportMonthlyCasesChart() {
  const { t } = useLanguage();
  const { dataRefreshKey } = useDashboardRefresh();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await getComplaints();
        if (!cancelled) setComplaints(list);
      } catch (e) {
        if (!cancelled) {
          setComplaints([]);
          setError(e instanceof Error ? e.message : t('reportPage.chartLoadError'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dataRefreshKey, t]);

  const data = useMemo(() => buildMonthlySeries(complaints), [complaints]);

  const localizedConfig = useMemo(
    () =>
      ({
        count: {
          label: t('reportPage.chartCases'),
          color: 'var(--chart-1)',
        },
      }) satisfies ChartConfig,
    [t]
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('reportPage.monthlyCasesTitle')}</CardTitle>
        <CardDescription>{t('reportPage.monthlyCasesSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-slate-500">
            <Spinner className="h-5 w-5" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        ) : (
          <ChartContainer config={localizedConfig} className="h-[280px] w-full aspect-auto">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                interval={0}
                angle={-32}
                textAnchor="end"
                height={56}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
