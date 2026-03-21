'use client';

import { useState } from 'react';
import { AIAnalysisResponse, ReportDraft } from '@/lib/types';
import ReportIssueForm from '@/components/report-issue-form';
import AIAnalysisPreview from '@/components/ai-analysis-preview';
import ReportMonthlyCasesChart from '@/components/report-monthly-cases-chart';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';

export default function ReportPage() {
  const { t } = useLanguage();
  const { bumpDataRefresh } = useDashboardRefresh();
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [reportDraft, setReportDraft] = useState<ReportDraft | null>(null);
  const [formKey, setFormKey] = useState(0);

  const handleNewAnalysis = (analysis: AIAnalysisResponse, draft: ReportDraft) => {
    setAiAnalysis(analysis);
    setReportDraft(draft);
  };

  const handleIssueSubmitted = async () => {
    setAiAnalysis(null);
    setReportDraft(null);
    setFormKey((k) => k + 1);
    bumpDataRefresh();
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 px-1 sm:px-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('reportPage.title')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('reportPage.subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-6 max-w-2xl lg:max-w-none">
          <ReportIssueForm key={formKey} onAnalysisComplete={handleNewAnalysis} />

          {aiAnalysis && reportDraft && (
            <AIAnalysisPreview
              analysis={aiAnalysis}
              draft={reportDraft}
              onSubmit={handleIssueSubmitted}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start w-full min-w-0">
          <ReportMonthlyCasesChart />
        </aside>
      </div>
    </div>
  );
}
