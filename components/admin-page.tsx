'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ApiValidatorPanel from '@/components/api-validator-panel';
import { useLanguage } from '@/components/language-provider';
import { getCorruptionReports } from '@/lib/api';
import type { CorruptionReportRecord } from '@/lib/types';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const { t } = useLanguage();
  const [health, setHealth] = useState<'active' | 'failed' | 'checking'>('checking');
  const [reports, setReports] = useState<CorruptionReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const data = await getCorruptionReports();
      setReports(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : t('adminPage.corruptionLoadError');
      setReportsError(message);
      toast.error(message);
    } finally {
      setReportsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('adminPage.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('adminPage.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">{t('adminPage.systemStatus')}</span>
          {health === 'checking' && (
            <Badge variant="secondary" className="bg-slate-200 text-slate-800">
              …
            </Badge>
          )}
          {health === 'active' && (
            <Badge className="bg-emerald-100 text-emerald-900">{t('adminPage.statusActive')}</Badge>
          )}
          {health === 'failed' && (
            <Badge className="bg-red-100 text-red-900">{t('adminPage.statusFailed')}</Badge>
          )}
        </div>
      </div>

      <ApiValidatorPanel onHealthChange={(s) => setHealth(s)} />

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3 flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{t('adminPage.corruptionSection')}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">{t('adminPage.corruptionSectionHint')}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadReports} disabled={reportsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${reportsLoading ? 'animate-spin' : ''}`} />
            {t('adminPage.corruptionRefresh')}
          </Button>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : reportsError ? (
            <p className="text-sm text-red-600 py-4">{reportsError}</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/80">
              {t('adminPage.corruptionEmpty')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="whitespace-nowrap">{t('adminPage.corruptionId')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('adminPage.corruptionSubmitted')}</TableHead>
                    <TableHead>{t('adminPage.corruptionReporter')}</TableHead>
                    <TableHead>{t('adminPage.corruptionPhone')}</TableHead>
                    <TableHead>{t('adminPage.corruptionDepartment')}</TableHead>
                    <TableHead>{t('adminPage.corruptionAccused')}</TableHead>
                    <TableHead className="min-w-[180px]">{t('adminPage.corruptionDescription')}</TableHead>
                    <TableHead className="whitespace-nowrap">{t('adminPage.corruptionHasProof')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.id}</TableCell>
                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{row.reporter_name || '—'}</TableCell>
                      <TableCell className="text-sm">{row.phone || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate" title={row.department}>
                        {row.department || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[140px] truncate" title={row.accused_person}>
                        {row.accused_person || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-800 max-w-xs">
                        <span className="line-clamp-3">{row.description}</span>
                      </TableCell>
                      <TableCell>
                        {row.proof_data_url ? (
                          <Badge variant="secondary" className="text-[11px]">
                            {t('adminPage.corruptionProofYes')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('adminPage.logsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 text-center">
            {t('adminPage.logsPlaceholder')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
