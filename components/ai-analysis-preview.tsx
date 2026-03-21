'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import RiskBadge from '@/components/risk-badge';
import { submitIssue } from '@/lib/api';
import { AIAnalysisResponse, ISSUE_TYPE_OPTIONS, ReportDraft, RISK_LEVELS, RiskLevel } from '@/lib/types';
import { formatRiskLabel } from '@/utils/priority';
import { useLanguage } from './language-provider';

interface AIAnalysisPreviewProps {
  analysis: AIAnalysisResponse;
  draft: ReportDraft;
  onSubmit: () => void;
}

export default function AIAnalysisPreview({ analysis, draft, onSubmit }: AIAnalysisPreviewProps) {
  const { t } = useLanguage();
  const [selectedIssueType, setSelectedIssueType] = useState(
    analysis.override_issue_type || analysis.issue_type
  );
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>(
    analysis.suggested_risk_level
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const aiSummaryText = useMemo(() => {
    if (analysis.ai_summary?.trim()) return analysis.ai_summary.trim();
    return t('analysis.aiSummaryPlaceholder');
  }, [analysis.ai_summary, t]);

  const fileToDataUrl = (file: File, errorMessage: string) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error(errorMessage));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const imageDataUrl = await fileToDataUrl(draft.image, t('analysis.imageProcessError'));
      const videoDataUrl = draft.video
        ? await fileToDataUrl(draft.video, t('analysis.videoProcessError'))
        : undefined;
      await submitIssue({
        issue_type: selectedIssueType,
        description: draft.description,
        address: draft.address,
        latitude: draft.latitude,
        longitude: draft.longitude,
        pincode: draft.pincode,
        risk_level: selectedRiskLevel,
        confidence_score: analysis.confidence_score,
        image_data_url: imageDataUrl,
        video_data_url: videoDataUrl,
        ai_summary: analysis.ai_summary ?? aiSummaryText,
      });
      toast.success(t('analysis.submitSuccess'));
      onSubmit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('analysis.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const extraImageCount = draft.additionalImages?.length ?? 0;

  return (
    <Card className="border-blue-200 bg-blue-50/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-blue-950">{t('analysis.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-blue-100 bg-white p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              {t('analysis.aiSummary')}
            </p>
            <p className="text-sm text-slate-800 leading-relaxed">{aiSummaryText}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {t('analysis.userDescription')}
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{draft.description}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {t('analysis.addressPincode')}
              </p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{draft.address}</p>
              <p className="text-sm font-medium text-slate-900 mt-1">
                {t('reportForm.pincode')}: {draft.pincode}
              </p>
            </div>
          </div>

          {extraImageCount > 0 && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
              {t('analysis.additionalImagesNote', { count: extraImageCount })}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-xs text-slate-600 font-medium">{t('analysis.issueClassification')}</p>
              <Badge variant="secondary" className="text-xs font-semibold bg-slate-100 text-slate-900">
                {selectedIssueType}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600 font-medium">{t('analysis.riskLevel')}</p>
              <RiskBadge level={selectedRiskLevel} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">{t('analysis.overrideType')}</p>
              <Select value={selectedIssueType} onValueChange={setSelectedIssueType}>
                <SelectTrigger className="border-slate-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">{t('analysis.overrideRiskLevel')}</p>
              <Select
                value={selectedRiskLevel}
                onValueChange={(value) => setSelectedRiskLevel(value as RiskLevel)}
              >
                <SelectTrigger className="border-slate-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((risk) => (
                    <SelectItem key={risk} value={risk}>
                      {formatRiskLabel(risk)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200/80">
          <div>
            <p className="text-xs text-slate-600 font-medium">{t('analysis.confidence')}</p>
            <p className="text-lg font-bold text-slate-900">
              {analysis.classification_confidence.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 font-medium">{t('analysis.sla')}</p>
            <p className="text-lg font-bold text-slate-900">{analysis.sla_days}d</p>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white mt-2"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {t('analysis.submitting')}
            </div>
          ) : (
            t('analysis.submitIssueReport')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
