'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IssueCluster, RiskLevel } from '@/lib/types';
import { calculateSeverityWeight } from '@/utils/priority';
import { useLanguage } from '@/components/language-provider';
import { formatRiskLabel } from '@/utils/priority';

const RISK_ORDER: RiskLevel[] = ['critical', 'very_high', 'high', 'low'];

export default function ComplaintsQuickStats({ clusters }: { clusters: IssueCluster[] }) {
  const { t } = useLanguage();
  const totalClusters = clusters.length;
  const totalComplaints = clusters.reduce((sum, c) => sum + c.complaint_count, 0);

  const riskDistribution = RISK_ORDER.map((risk) => ({
    risk,
    count: clusters.filter((c) => c.risk_level === risk).reduce((s, c) => s + c.complaint_count, 0),
  }));

  const issueCounts = clusters.reduce<Record<string, number>>((acc, c) => {
    acc[c.issue_type] = (acc[c.issue_type] ?? 0) + c.complaint_count;
    return acc;
  }, {});
  const mostCommon =
    Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? t('overview.noData');

  const highRiskZone = [...clusters]
    .sort(
      (a, b) =>
        calculateSeverityWeight(b.risk_level) * b.complaint_count -
        calculateSeverityWeight(a.risk_level) * a.complaint_count
    )[0];

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('complaintsPage.quickStats')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-600">{t('complaintsPage.totalComplaints')}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalComplaints}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-600">{t('complaintsPage.totalClusters')}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalClusters}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-medium text-slate-600 mb-2">{t('complaintsPage.riskDistribution')}</p>
            <div className="flex flex-wrap gap-1.5">
              {riskDistribution.map(({ risk, count }) => (
                <Badge
                  key={risk}
                  variant="secondary"
                  className="text-[11px] font-normal bg-white border border-slate-200"
                >
                  {formatRiskLabel(risk)}: {count}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-600">{t('complaintsPage.mostCommonIssue')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{mostCommon}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2 xl:col-span-2">
            <p className="text-xs font-medium text-slate-600">{t('complaintsPage.highRiskZone')}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {highRiskZone
                ? `${t('filters.pincode')} ${highRiskZone.pincode} · ${highRiskZone.issue_type} · `
                : ''}
              {highRiskZone ? (
                <span className="text-slate-700 font-normal">
                  {formatRiskLabel(highRiskZone.risk_level)}
                </span>
              ) : (
                t('overview.noData')
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
