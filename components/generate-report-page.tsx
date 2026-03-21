'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateReport } from '@/lib/api';
import { exportCivicReportPdf } from '@/lib/export-civic-report-pdf';
import type { CivicReport } from '@/lib/types';
import { toast } from 'sonner';
import { useLanguage } from '@/components/language-provider';

function filterReportByPincode(report: CivicReport, pincode: string): CivicReport {
  const q = pincode.trim();
  if (!q) return report;
  const pincodeBreakdown = report.pincode_breakdown.filter((row) => row.pincode.includes(q));
  const cluster_breakdown = report.cluster_breakdown.filter((row) => row.pincode.includes(q));
  if (!pincodeBreakdown.length && !cluster_breakdown.length) {
    return {
      ...report,
      pincode_breakdown: [],
      cluster_breakdown: [],
      total_complaints: 0,
      total_clusters: 0,
      summary: `${report.summary} (No rows matched pincode filter "${q}" — adjust or clear the pincode.)`,
    };
  }
  const total_complaints = pincodeBreakdown.reduce((s, r) => s + r.complaint_count, 0);
  const total_clusters = pincodeBreakdown.reduce((s, r) => s + r.cluster_count, 0);
  return {
    ...report,
    pincode_breakdown,
    cluster_breakdown,
    total_complaints,
    total_clusters,
    summary: `${report.summary} (Filtered preview for pincode containing "${q}".)`,
  };
}

export default function GenerateReportPage() {
  const { t } = useLanguage();
  const [range, setRange] = useState<DateRange | undefined>();
  const [pincode, setPincode] = useState('');
  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => (report ? filterReportByPincode(report, pincode) : null), [report, pincode]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateReport();
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!preview) return;
    exportCivicReportPdf(preview).catch(() => toast.error('Unable to download PDF'));
  };

  const rangeLabel =
    range?.from && range?.to
      ? `${format(range.from, 'LLL d, y')} – ${format(range.to, 'LLL d, y')}`
      : range?.from
        ? format(range.from, 'LLL d, y')
        : t('generateReportPage.dateRange');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('generateReportPage.title')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('generateReportPage.subtitle')}</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('generateReportPage.filtersNote')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('generateReportPage.dateRange')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !range && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gr-pincode">{t('generateReportPage.pincode')}</Label>
              <Input
                id="gr-pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 110001"
                className="border-slate-300"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="w-4 h-4" />
                {t('modal.generating')}
              </span>
            ) : (
              t('generateReportPage.generate')
            )}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card className="border-slate-200 bg-white">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">{t('generateReportPage.preview')}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              {t('generateReportPage.download')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{preview.report_title}</p>
              <p className="text-sm text-slate-700 mt-2">{preview.summary}</p>
              <p className="text-xs text-slate-500 mt-2">
                {t('complaints.registeredAt')}: {new Date(preview.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-600">{t('modal.totalComplaints')}</p>
                <p className="text-xl font-bold">{preview.total_complaints}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-600">{t('modal.totalClusters')}</p>
                <p className="text-xl font-bold">{preview.total_clusters}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
