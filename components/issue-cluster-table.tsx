'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RiskBadge from '@/components/risk-badge';
import { IssueCluster } from '@/lib/types';
import { useLanguage } from './language-provider';

interface IssueClusterTableProps {
  clusters: IssueCluster[];
  isLoading: boolean;
  error?: string | null;
  onClusterSelect: (cluster: IssueCluster) => void;
}

export default function IssueClusterTable({
  clusters,
  isLoading,
  error,
  onClusterSelect,
}: IssueClusterTableProps) {
  const { t } = useLanguage();
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('issueTable.title', { count: clusters.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-slate-700 font-semibold">{t('issueTable.id')}</TableHead>
                <TableHead className="text-slate-700 font-semibold">{t('issueTable.issueType')}</TableHead>
                <TableHead className="text-slate-700 font-semibold">{t('issueTable.pincode')}</TableHead>
                <TableHead className="text-slate-700 font-semibold">{t('issueTable.risk')}</TableHead>
                <TableHead className="text-slate-700 font-semibold">{t('issueTable.department')}</TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  {t('issueTable.complaints')}
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  {t('issueTable.priority')}
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  {t('issueTable.confidence')}
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  {t('issueTable.daysPending')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`} className="border-slate-200">
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={`sk-${j}`}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : error
                  ? (
                    <TableRow className="border-slate-200">
                      <TableCell colSpan={9} className="text-center py-8 text-red-600">
                        {error}
                      </TableCell>
                    </TableRow>
                  )
                  : clusters.length > 0
                  ? clusters.map((cluster) => (
                      <TableRow
                        key={cluster.cluster_id}
                        onClick={() => onClusterSelect(cluster)}
                        className="border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <TableCell className="text-sm font-medium text-slate-900">
                          {cluster.cluster_id}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {cluster.issue_type}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {cluster.pincode}
                        </TableCell>
                        <TableCell>
                          <RiskBadge level={cluster.risk_level} />
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {cluster.responsible_department || t('issueTable.pendingAssignment')}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-900">
                          {cluster.complaint_count}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold text-slate-900">
                          {cluster.priority_score}
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-700">
                          {cluster.confidence_score.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right text-sm text-slate-700">
                          {cluster.days_pending}
                        </TableCell>
                      </TableRow>
                    ))
                  : (
                    <TableRow className="border-slate-200">
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        {t('issueTable.noClusters')}
                      </TableCell>
                    </TableRow>
                  )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
