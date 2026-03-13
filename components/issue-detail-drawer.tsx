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
import { useLanguage } from './language-provider';

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
  const { t } = useLanguage();
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
            : t('drawer.loadError');
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
            <p className="text-sm text-slate-600 mt-1">{t('drawer.pincode')} {cluster.pincode}</p>
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
              <p className="text-xs text-slate-600 font-medium mb-2">{t('filters.riskLevel')}</p>
              <RiskBadge level={cluster.risk_level} />
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">{t('drawer.cluster')}</p>
              <Badge variant="outline">{cluster.cluster_id}</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium mb-2">{t('drawer.complaints')}</p>
              <p className="text-lg font-bold text-slate-900">
                {cluster.complaint_count}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-4">{t('drawer.metrics')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  {t('drawer.complaintCount')}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.complaint_count}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  {t('drawer.priorityScore')}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.priority_score}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  {t('drawer.aiConfidence')}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {cluster.confidence_score.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium mb-1">
                  {t('drawer.daysPending')}
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
              {t('drawer.complaintsCreatingCluster', { count: complaints.length })}
            </h3>

            {isLoadingComplaints ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Spinner className="w-4 h-4" />
                {t('drawer.loadingComplaints')}
              </div>
            ) : complaintsError ? (
              <p className="text-sm text-red-600">{complaintsError}</p>
            ) : complaints.length === 0 ? (
              <p className="text-sm text-slate-500">{t('drawer.noComplaints')}</p>
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
                            {t('drawer.noImage')}
                          </p>
                        )}
                      </div>

                      {complaint.video_data_url && (
                        <div className="rounded border border-slate-200 bg-slate-50 p-2">
                          <video
                            controls
                            className="h-36 w-full rounded object-contain bg-black"
                            src={complaint.video_data_url}
                          />
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        <p className="text-slate-900 break-words">
                          <span className="font-medium">{t('drawer.description')}:</span> {complaint.description}
                        </p>
                        {complaint.ai_summary && (
                          <p className="text-slate-700 break-words">
                            <span className="font-medium">{t('drawer.aiSummary')}:</span> {complaint.ai_summary}
                          </p>
                        )}
                        <p className="text-slate-700 break-words">
                          <span className="font-medium">{t('complaints.address')}:</span> {complaint.address}
                        </p>
                        <p className="text-slate-600">
                          {t('drawer.pincode')} {complaint.pincode} •{' '}
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
