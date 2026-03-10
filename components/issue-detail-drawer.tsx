'use client';

import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import RiskBadge from '@/components/risk-badge';
import { getClusterComplaints } from '@/lib/api';
import { Complaint, IssueCluster } from '@/lib/types';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface IssueDetailDrawerProps {
  cluster: IssueCluster | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function IssueDetailDrawer({
  cluster,
  isOpen,
  onClose,
}: IssueDetailDrawerProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);

  useEffect(() => {
    const loadComplaints = async () => {
      if (!cluster || !isOpen) {
        return;
      }

      setIsLoadingComplaints(true);
      setComplaintsError(null);
      try {
        const data = await getClusterComplaints(cluster.cluster_id);
        setComplaints(data);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load complaints for this cluster.';
        setComplaintsError(message);
        toast.error(message);
      } finally {
        setIsLoadingComplaints(false);
      }
    };

    loadComplaints();
  }, [cluster, isOpen]);

  if (!cluster) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="flex items-start justify-between pb-4 border-b border-slate-200">
          <div className="flex-1">
            <DrawerTitle className="text-2xl">{cluster.issue_type}</DrawerTitle>
            <p className="text-sm text-slate-600 mt-1">Pincode {cluster.pincode}</p>
          </div>
          <DrawerClose className="text-slate-400 hover:text-slate-600" asChild>
            <button>
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Risk Level */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">Risk Level</p>
              <RiskBadge level={cluster.risk_level} />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">Cluster</p>
              <Badge variant="outline">{cluster.cluster_id}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">Complaints</p>
              <p className="text-lg font-bold text-slate-900">
                {cluster.complaint_count}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  Complaint Count
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.complaint_count}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  Priority Score
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.priority_score}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  AI Confidence
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.confidence_score.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  Days Pending
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.days_pending}
                </p>
              </div>
            </div>
          </div>

          {/* Complaint List */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">
              Complaints Creating This Cluster ({complaints.length})
            </h3>

            {isLoadingComplaints ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner className="w-4 h-4" />
                Loading complaints...
              </div>
            ) : complaintsError ? (
              <p className="text-sm text-red-600">{complaintsError}</p>
            ) : complaints.length === 0 ? (
              <p className="text-sm text-slate-500">No complaints found for this cluster.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map((complaint, index) => (
                  <div
                    key={complaint.complaint_id}
                    className="rounded-md border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        #{index + 1} • {complaint.complaint_id}
                      </p>
                      <RiskBadge level={complaint.risk_level} />
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                      <div className="rounded border border-slate-200 bg-slate-50 p-2">
                        {complaint.image_data_url ? (
                          <img
                            src={complaint.image_data_url}
                            alt="Complaint"
                            className="h-36 w-full rounded object-contain bg-white"
                          />
                        ) : (
                          <p className="text-sm text-slate-500 h-36 flex items-center justify-center">
                            No image uploaded
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <p className="text-slate-900 break-words">
                          <span className="font-medium">Description:</span> {complaint.description}
                        </p>
                        {complaint.ai_summary && (
                          <p className="text-slate-700 break-words">
                            <span className="font-medium">AI Summary:</span> {complaint.ai_summary}
                          </p>
                        )}
                        <p className="text-slate-700 break-words">
                          <span className="font-medium">Address:</span> {complaint.address}
                        </p>
                        <p className="text-slate-600">
                          Pincode {complaint.pincode} •{' '}
                          {new Date(complaint.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
