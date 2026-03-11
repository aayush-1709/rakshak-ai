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
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Issue Clusters ({clusters.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead className="text-slate-700 font-semibold">ID</TableHead>
                <TableHead className="text-slate-700 font-semibold">Issue Type</TableHead>
                <TableHead className="text-slate-700 font-semibold">Pincode</TableHead>
                <TableHead className="text-slate-700 font-semibold">Risk</TableHead>
                <TableHead className="text-slate-700 font-semibold">Department</TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  Complaints
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  Priority
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  Confidence
                </TableHead>
                <TableHead className="text-right text-slate-700 font-semibold">
                  Days Pending
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
                          {cluster.responsible_department || 'Pending assignment'}
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
                        No clusters found
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
