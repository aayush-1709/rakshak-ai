'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  AIAnalysisResponse,
  ClusterSortBy,
  IssueCluster,
  IssueFilters,
  ReportDraft,
} from '@/lib/types';
import { filterClusters, getIssueClusters } from '@/lib/api';
import Navbar from './navbar';
import ReportIssueForm from './report-issue-form';
import AIAnalysisPreview from './ai-analysis-preview';
import QuickStatsCard from './quick-stats-card';
import RiskLegend from './risk-legend';
import CivicMap from './civic-map';
import FiltersPanel from './filters-panel';
import IssueClusterTable from './issue-cluster-table';
import IssueDetailDrawer from './issue-detail-drawer';
import AnalyticsOverview from './analytics-overview';
import ComplaintsDashboard from './complaints-dashboard';
import CivicChatbot from './civic-chatbot';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiValidatorPanel from './api-validator-panel';

export default function CivicDashboard() {
  const [clusters, setClusters] = useState<IssueCluster[]>([]);
  const [filteredClusters, setFilteredClusters] = useState<IssueCluster[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedCluster, setSelectedCluster] = useState<IssueCluster | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clustersError, setClustersError] = useState<string | null>(null);
  const [complaintsRefreshKey, setComplaintsRefreshKey] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<IssueFilters>({});
  const [sortBy, setSortBy] = useState<ClusterSortBy>('priority_score');

  // Load clusters on mount
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
  }, [loadClusters]);

  useEffect(() => {
    setFilteredClusters(filterClusters(clusters, filters, sortBy));
  }, [clusters, filters, sortBy]);

  // Handle filter and sort changes
  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      setFilters(newFilters);
    },
    []
  );

  const handleSortChange = useCallback(
    (newSortBy: typeof sortBy) => {
      setSortBy(newSortBy);
    },
    []
  );

  const handleNewAnalysis = (analysis: AIAnalysisResponse, draft: ReportDraft) => {
    setAiAnalysis(analysis);
    setReportDraft(draft);
  };

  const handleIssueSubmitted = async () => {
    setAiAnalysis(null);
    setReportDraft(null);
    setFormKey((current) => current + 1);
    setComplaintsRefreshKey((current) => current + 1);
    await loadClusters();
  };

  const handleClusterSelect = (cluster: IssueCluster) => {
    setSelectedCluster(cluster);
    setIsDrawerOpen(true);
  };

  const issueTypes = Array.from(new Set(clusters.map((cluster) => cluster.issue_type))).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <Navbar onMockModeChanged={loadClusters} />
      
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Left Panel - 30% */}
        <div className="w-full lg:w-[30%] space-y-4">
          <ReportIssueForm key={formKey} onAnalysisComplete={handleNewAnalysis} />
          
          {aiAnalysis && reportDraft && (
            <AIAnalysisPreview
              analysis={aiAnalysis}
              draft={reportDraft}
              onSubmit={handleIssueSubmitted}
            />
          )}
          
          <QuickStatsCard clusters={clusters} />
          <RiskLegend />
        </div>

        {/* Right Panel - 70% */}
        <div className="w-full lg:w-[70%] space-y-4">
          <ApiValidatorPanel />
          <CivicChatbot />

          <Tabs defaultValue="clusters" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 h-auto gap-2">
              <TabsTrigger value="clusters" className="text-xs sm:text-sm">
                Cluster Dashboard
              </TabsTrigger>
              <TabsTrigger value="complaints" className="text-xs sm:text-sm whitespace-normal text-center">
                Pincode Complaints Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clusters" className="space-y-4">
              <CivicMap
                clusters={filteredClusters}
                isLoading={isLoading}
                onMarkerClick={handleClusterSelect}
              />

              <div className="grid grid-cols-1 gap-4">
                <FiltersPanel
                  onFilterChange={handleFilterChange}
                  onSortChange={handleSortChange}
                  currentFilters={filters}
                  currentSort={sortBy}
                  issueTypes={issueTypes}
                />

                <IssueClusterTable
                  clusters={filteredClusters}
                  isLoading={isLoading}
                  onClusterSelect={handleClusterSelect}
                  error={clustersError}
                />
              </div>

              <AnalyticsOverview clusters={clusters} />
            </TabsContent>

            <TabsContent value="complaints">
              <ComplaintsDashboard refreshKey={complaintsRefreshKey} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
