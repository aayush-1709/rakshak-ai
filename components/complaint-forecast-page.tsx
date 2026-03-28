'use client';

import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { useLanguage } from '@/components/language-provider';
import { Droplets, MapPin, TrendingUp } from 'lucide-react';

/** Demo-only series: weekly complaint volume (model output vs seasonal baseline). */
const DEMO_WEEKLY_SERIES = [
  { week: 'May W1', baseline: 118, forecast: 124 },
  { week: 'May W2', baseline: 122, forecast: 131 },
  { week: 'May W3', baseline: 128, forecast: 142 },
  { week: 'May W4', baseline: 135, forecast: 158 },
  { week: 'Jun W1', baseline: 165, forecast: 198 },
  { week: 'Jun W2', baseline: 192, forecast: 245 },
  { week: 'Jun W3', baseline: 210, forecast: 312 },
  { week: 'Jun W4', baseline: 225, forecast: 348 },
  { week: 'Jul W1', baseline: 248, forecast: 382 },
  { week: 'Jul W2', baseline: 255, forecast: 401 },
  { week: 'Jul W3', baseline: 242, forecast: 368 },
  { week: 'Jul W4', baseline: 228, forecast: 315 },
];

const DEMO_HOTSPOTS = [
  {
    pincode: '110034',
    ward: 'Rohini',
    issue: 'Waterlogging',
    spikePct: 340,
    window: 'Jun–Aug',
    action: 'Pre-clear drains; deploy pumps',
  },
  {
    pincode: '110092',
    ward: 'Dwarka',
    issue: 'Drainage overflow',
    spikePct: 280,
    window: 'Jul–Sep',
    action: 'Desilt trunk drains',
  },
  {
    pincode: '110051',
    ward: 'East Delhi',
    issue: 'Garbage + stormwater',
    spikePct: 195,
    window: 'Jun–Aug',
    action: 'Waste clearance before monsoon',
  },
  {
    pincode: '110006',
    ward: 'Civil Lines',
    issue: 'Road flooding',
    spikePct: 165,
    window: 'Jul–Aug',
    action: 'Grating repair; camber check',
  },
];

const chartConfig = {
  baseline: {
    label: 'Seasonal baseline (historical)',
    color: 'var(--chart-2)',
  },
  forecast: {
    label: 'Predicted volume',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export default function ComplaintForecastPage() {
  const { t } = useLanguage();

  const peak = useMemo(() => {
    let max = 0;
    let label = '';
    for (const row of DEMO_WEEKLY_SERIES) {
      if (row.forecast > max) {
        max = row.forecast;
        label = row.week;
      }
    }
    return { value: max, week: label };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('forecastPage.title')}</h1>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {t('forecastPage.demoBadge')}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">{t('forecastPage.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-sky-600" aria-hidden />
              {t('forecastPage.metricPeak')}
            </CardDescription>
            <CardTitle className="text-2xl">{peak.week}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              {t('forecastPage.metricPeakDetail', { count: peak.value })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-sky-600" aria-hidden />
              {t('forecastPage.metricHotspot')}
            </CardDescription>
            <CardTitle className="text-2xl">{DEMO_HOTSPOTS[0].pincode}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{DEMO_HOTSPOTS[0].ward}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-600" aria-hidden />
              {t('forecastPage.metricIssue')}
            </CardDescription>
            <CardTitle className="text-2xl leading-snug">{DEMO_HOTSPOTS[0].issue}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{t('forecastPage.metricIssueDetail')}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('forecastPage.chartTitle')}</CardTitle>
          <CardDescription>{t('forecastPage.chartDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
            <ComposedChart data={DEMO_WEEKLY_SERIES} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={72} />
              <YAxis tickLine={false} axisLine={false} width={36} label={{ value: t('forecastPage.yAxis'), angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b' } }} />
              <ReferenceLine
                x="Jun W2"
                stroke="rgba(100, 116, 139, 0.45)"
                strokeDasharray="4 4"
                label={{ value: t('forecastPage.monsoonLabel'), position: 'top', fontSize: 10, fill: '#64748b' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                dataKey="baseline"
                type="monotone"
                fill="var(--color-baseline)"
                fillOpacity={0.12}
                stroke="var(--color-baseline)"
                strokeWidth={1.5}
                name={t('forecastPage.legendBaseline')}
              />
              <Line
                dataKey="forecast"
                type="monotone"
                stroke="var(--color-forecast)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                name={t('forecastPage.legendForecast')}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-sky-100 bg-sky-50/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-sky-950">{t('forecastPage.insightTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-sky-950/90">
          <p>{t('forecastPage.insightBody1')}</p>
          <p>{t('forecastPage.insightBody2')}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">{t('forecastPage.tableTitle')}</h2>
        <Card className="border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>{t('forecastPage.colPincode')}</TableHead>
                  <TableHead>{t('forecastPage.colWard')}</TableHead>
                  <TableHead>{t('forecastPage.colIssue')}</TableHead>
                  <TableHead className="text-right">{t('forecastPage.colSpike')}</TableHead>
                  <TableHead>{t('forecastPage.colWindow')}</TableHead>
                  <TableHead>{t('forecastPage.colAction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_HOTSPOTS.map((row) => (
                  <TableRow key={row.pincode}>
                    <TableCell className="font-medium">{row.pincode}</TableCell>
                    <TableCell>{row.ward}</TableCell>
                    <TableCell>{row.issue}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-800 font-medium">+{row.spikePct}%</TableCell>
                    <TableCell>{row.window}</TableCell>
                    <TableCell className="text-slate-700 max-w-[220px]">{row.action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <p className="text-xs text-slate-500">{t('forecastPage.disclaimer')}</p>
    </div>
  );
}
