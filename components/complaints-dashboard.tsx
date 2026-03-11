'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RiskBadge from '@/components/risk-badge';
import { getComplaints } from '@/lib/api';
import { Complaint } from '@/lib/types';
import { toast } from 'sonner';

interface ComplaintsDashboardProps {
  refreshKey: number;
}

export default function ComplaintsDashboard({ refreshKey }: ComplaintsDashboardProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>('all');

  useEffect(() => {
    const loadComplaints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getComplaints();
        setComplaints(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to fetch complaints.';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadComplaints();
  }, [refreshKey]);

  const issueTypes = useMemo(
    () => Array.from(new Set(complaints.map((row) => row.issue_type))).sort(),
    [complaints]
  );

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const pincodeMatch = pincodeFilter.trim()
        ? item.pincode.includes(pincodeFilter.trim())
        : true;
      const issueMatch =
        issueTypeFilter === 'all' ? true : item.issue_type === issueTypeFilter;
      return pincodeMatch && issueMatch;
    });
  }, [complaints, issueTypeFilter, pincodeFilter]);

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Complaints Dashboard ({filteredComplaints.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Search by pincode..."
            value={pincodeFilter}
            onChange={(event) => setPincodeFilter(event.target.value)}
            className="border-slate-300"
          />
          <Select value={issueTypeFilter} onValueChange={setIssueTypeFilter}>
            <SelectTrigger className="border-slate-300">
              <SelectValue placeholder="All issue types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issue types</SelectItem>
              {issueTypes.map((issueType) => (
                <SelectItem key={issueType} value={issueType}>
                  {issueType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-slate-200">
                <TableHead>Complaint ID</TableHead>
                <TableHead>Registered At</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Pincode</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, rowIdx) => (
                    <TableRow key={`complaint-sk-${rowIdx}`} className="border-slate-200">
                      {Array.from({ length: 7 }).map((__, colIdx) => (
                        <TableCell key={`complaint-sk-${rowIdx}-${colIdx}`}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : error
                  ? (
                    <TableRow className="border-slate-200">
                      <TableCell colSpan={7} className="text-center py-8 text-red-600">
                        {error}
                      </TableCell>
                    </TableRow>
                  )
                  : filteredComplaints.length > 0
                    ? filteredComplaints.map((complaint) => (
                        <TableRow key={complaint.complaint_id} className="border-slate-200">
                          <TableCell className="text-sm font-medium">
                            {complaint.complaint_id}
                          </TableCell>
                          <TableCell className="text-sm text-slate-700">
                            {new Date(complaint.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">{complaint.issue_type}</TableCell>
                          <TableCell className="text-sm">{complaint.pincode}</TableCell>
                          <TableCell>
                            <RiskBadge level={complaint.risk_level} />
                          </TableCell>
                          <TableCell className="text-sm">{complaint.status}</TableCell>
                          <TableCell className="text-sm">{complaint.address}</TableCell>
                        </TableRow>
                      ))
                    : (
                      <TableRow className="border-slate-200">
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No complaints found
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
