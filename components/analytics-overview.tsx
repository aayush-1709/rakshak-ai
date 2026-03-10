'use client';

import { Card, CardContent } from '@/components/ui/card';
import { IssueCluster } from '@/lib/types';
import { calculateSeverityWeight } from '@/utils/priority';

interface AnalyticsOverviewProps {
  clusters: IssueCluster[];
}

export default function AnalyticsOverview({ clusters }: AnalyticsOverviewProps) {
  const byPincode = clusters.reduce<Record<string, IssueCluster[]>>((acc, cluster) => {
    if (!acc[cluster.pincode]) {
      acc[cluster.pincode] = [];
    }
    acc[cluster.pincode].push(cluster);
    return acc;
  }, {});

  const topRiskZone =
    Object.entries(byPincode)
      .map(([pincode, rows]) => ({
        pincode,
        avgPriority:
          rows.reduce((sum, row) => sum + row.priority_score, 0) / rows.length,
      }))
      .sort((a, b) => b.avgPriority - a.avgPriority)[0] ?? null;

  const issueTypeCounts = clusters.reduce<Record<string, number>>((acc, cluster) => {
    acc[cluster.issue_type] = (acc[cluster.issue_type] ?? 0) + 1;
    return acc;
  }, {});
  const mostCommonIssue = Object.entries(issueTypeCounts).sort((a, b) => b[1] - a[1])[0] ?? null;

  const escalatingZone =
    Object.entries(byPincode)
      .map(([pincode, rows]) => ({
        pincode,
        growthIndex: rows.reduce((sum, row) => sum + row.complaint_count / (row.days_pending + 1), 0),
      }))
      .sort((a, b) => b.growthIndex - a.growthIndex)[0] ?? null;

  const predictedCritical =
    Object.entries(byPincode)
      .map(([pincode, rows]) => ({
        pincode,
        severityScore: rows.reduce(
          (sum, row) =>
            sum + calculateSeverityWeight(row.risk_level) * row.complaint_count,
          0
        ),
      }))
      .sort((a, b) => b.severityScore - a.severityScore)[0] ?? null;

  const analytics = [
    {
      title: 'Top Risk Zone',
      value: topRiskZone?.pincode ?? 'N/A',
      subtitle: topRiskZone ? `Avg Priority ${topRiskZone.avgPriority.toFixed(1)}` : 'No data',
      color: 'bg-red-50',
    },
    {
      title: 'Most Common Issue Type',
      value: mostCommonIssue?.[0] ?? 'N/A',
      subtitle: mostCommonIssue ? `${mostCommonIssue[1]} clusters` : 'No data',
      color: 'bg-orange-50',
    },
    {
      title: 'Escalating Zone',
      value: escalatingZone?.pincode ?? 'N/A',
      subtitle: escalatingZone ? `Growth ${escalatingZone.growthIndex.toFixed(1)}` : 'No data',
      color: 'bg-yellow-50',
    },
    {
      title: 'Predicted Critical Area',
      value: predictedCritical?.pincode ?? 'N/A',
      subtitle: predictedCritical
        ? `Risk x Count ${predictedCritical.severityScore.toFixed(0)}`
        : 'No data',
      color: 'bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {analytics.map((item) => (
        <Card key={item.title} className={`border-slate-200 ${item.color}`}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-xs text-slate-600 font-medium">{item.title}</p>
              <p className="text-lg font-bold text-slate-900 truncate">{item.value}</p>
              <p className="text-xs text-slate-500">{item.subtitle}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
