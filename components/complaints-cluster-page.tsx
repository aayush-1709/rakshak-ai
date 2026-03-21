'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClusterSortBy, IssueCluster, IssueFilters } from '@/lib/types';
import { filterClusters, getIssueClusters } from '@/lib/api';
import CivicMap from '@/components/civic-map';
import IssueClusterTable from '@/components/issue-cluster-table';
import IssueDetailDrawer from '@/components/issue-detail-drawer';
import AnalyticsOverview from '@/components/analytics-overview';
import ComplaintsDashboard from '@/components/complaints-dashboard';
import ComplaintsQuickStats from '@/components/complaints-quick-stats';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';
export default function ComplaintsClusterPage() {
  const { t } = useLanguage();
  const { dataRefreshKey } = useDashboardRefresh();
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [filteredClusters, setFilteredClusters] = useState<IssueCluster[]>([]);
  const [filters, setFilters] = useState<IssueFilters>({});
  const [sortBy, setSortBy] = useState<ClusterSortBy>('priority_score');
  const [selectedCluster, setSelectedCluster] = useState<IssueCluster | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clustersError, setClustersError] = useState<string | null>(null);

  const loadClusters = useCallback(async () => {
    setIsLoading(true);
    setClustersError(null);
    try {
      const data = await getIssueClusters();
      setClusters(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load issue clusters.';
      setClustersError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClusters();
  }, [loadClusters, dataRefreshKey]);

  useEffect(() => {
    setFilteredClusters(filterClusters(clusters, filters, sortBy));
  }, [clusters, filters, sortBy]);

  const handleFilterChange = useCallback((newFilters: IssueFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSortChange = useCallback((newSortBy: ClusterSortBy) => {
    setSortBy(newSortBy);
  }, []);

  const handleClusterSelect = (cluster: IssueCluster) => {
    setSelectedCluster(cluster);
    setIsDrawerOpen(true);
  };

  const issueTypes = Array.from(new Set(clusters.map((cluster) => cluster.issue_type))).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('complaintsPage.title')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('complaintsPage.subtitle')}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">{t('complaintsPage.mapSection')}</h2>
        <div className="mx-auto w-full md:w-2/3 min-w-0">
          <CivicMap
            clusters={filteredClusters}
            isLoading={isLoading}
            onMarkerClick={handleClusterSelect}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">{t('complaintsPage.tableSection')}</h2>
        <IssueClusterTable
          clusters={filteredClusters}
          isLoading={isLoading}
          onClusterSelect={handleClusterSelect}
          error={clustersError}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          currentFilters={filters}
          currentSort={sortBy}
          issueTypes={issueTypes}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">{t('complaintsPage.clusterSummarySection')}</h2>
        <AnalyticsOverview clusters={clusters} />
      </section>

      <section className="space-y-2">
        <ComplaintsQuickStats clusters={clusters} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">{t('complaintsPage.pincodeComplaintsTitle')}</h2>
        <ComplaintsDashboard refreshKey={dataRefreshKey} />
      </section>

      <IssueDetailDrawer
        cluster={selectedCluster}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCluster(null);
        }}
      />
    </div>
  );
}
