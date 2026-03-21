'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { getCorruptionReports } from '@/lib/api';
import type { CorruptionReportRecord } from '@/lib/types';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';

/** Bar fill — blue (distinct from report page chart). */
const CORRUPTION_CHART_BLUE = '#2563eb';

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

function buildMonthlySeries(records: CorruptionReportRecord[]) {
  const slots = last12MonthSlots();
  const counts = new Map<string, number>();
  slots.forEach((s) => counts.set(s.key, 0));

  for (const r of records) {
    const d = new Date(r.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return slots.map((s) => ({
    month: s.label,
    count: counts.get(s.key) ?? 0,
  }));
}

export default function CorruptionMonthlyReportsChart() {
  const { t } = useLanguage();
  const { dataRefreshKey } = useDashboardRefresh();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CorruptionReportRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await getCorruptionReports();
        if (!cancelled) setRecords(list);
      } catch (e) {
        if (!cancelled) {
          setRecords([]);
          setError(e instanceof Error ? e.message : t('corruptionPage.chartLoadError'));
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

  const data = useMemo(() => buildMonthlySeries(records), [records]);

  const localizedConfig = useMemo(
    () =>
      ({
        count: {
          label: t('corruptionPage.chartReports'),
          color: CORRUPTION_CHART_BLUE,
        },
      }) satisfies ChartConfig,
    [t]
  );

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('corruptionPage.monthlyReportsTitle')}</CardTitle>
        <CardDescription>{t('corruptionPage.monthlyReportsSubtitle')}</CardDescription>
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
              <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
