'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IssueCluster } from '@/lib/types';
import { useLanguage } from './language-provider';

interface QuickStatsCardProps {
  clusters: IssueCluster[];
}

export default function QuickStatsCard({ clusters }: QuickStatsCardProps) {
  const { t } = useLanguage();
  const totalClusters = clusters.length;
  const criticalCount = clusters.filter((c) => c.risk_level === 'critical').length;
  const veryHighCount = clusters.filter((c) => c.risk_level === 'very_high').length;
  const avgSLA = clusters.length > 0
    ? Math.round(clusters.reduce((sum, c) => sum + c.days_pending, 0) / clusters.length)
    : 0;

  const stats = [
    { label: t('stats.totalClusters'), value: totalClusters, color: 'bg-slate-100' },
    { label: t('stats.critical'), value: criticalCount, color: 'bg-red-100' },
    { label: t('stats.veryHigh'), value: veryHighCount, color: 'bg-orange-100' },
    { label: t('stats.avgDaysPending'), value: avgSLA, color: 'bg-yellow-100' },
  ];

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('stats.quick')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${stat.color} p-3 rounded-lg border border-slate-200`}
            >
              <p className="text-xs text-slate-600 font-medium mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
