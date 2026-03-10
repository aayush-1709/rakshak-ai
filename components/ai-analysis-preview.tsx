'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import RiskBadge from '@/components/risk-badge';
import { submitIssue } from '@/lib/api';
import { AIAnalysisResponse, ISSUE_TYPE_OPTIONS, ReportDraft, RISK_LEVELS, RiskLevel } from '@/lib/types';
import { formatRiskLabel } from '@/utils/priority';

interface AIAnalysisPreviewProps {
  analysis: AIAnalysisResponse;
  draft: ReportDraft;
  onSubmit: () => void;
}

export default function AIAnalysisPreview({ analysis, draft, onSubmit }: AIAnalysisPreviewProps) {
  const [selectedIssueType, setSelectedIssueType] = useState(
    analysis.override_issue_type || analysis.issue_type
  );
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>(
    analysis.suggested_risk_level
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to process uploaded image.'));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const imageDataUrl = await fileToDataUrl(draft.image);
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
        ai_summary: analysis.ai_summary,
      });
      toast.success('Issue submitted successfully.');
      onSubmit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error submitting issue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-blue-900">AI Analysis Result</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Issue Type and Risk Level */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">Detected Issue Type</p>
              <div className="inline-flex rounded-md bg-slate-200 text-slate-900 px-2 py-0.5 text-xs font-medium">
                {selectedIssueType}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600 font-medium mb-1">Risk Level</p>
              <RiskBadge level={selectedRiskLevel} />
            </div>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Can override issue type */}
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">Override Type</p>
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

            {/* Can override risk level */}
            <div>
              <p className="text-xs text-slate-600 font-medium mb-1">Override Risk Level</p>
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

        {/* Confidence and SLA */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
          <div>
            <p className="text-xs text-slate-600 font-medium">Confidence</p>
            <p className="text-lg font-bold text-slate-900">
              {analysis.classification_confidence.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-600 font-medium">SLA</p>
            <p className="text-lg font-bold text-slate-900">
              {analysis.sla_days}d
            </p>
          </div>
        </div>

        {/* AI Summary */}
        {analysis.ai_summary && (
          <div className="bg-white p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-slate-600 font-medium mb-2">AI Complaint Summary</p>
            <p className="text-sm text-slate-700">{analysis.ai_summary}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white mt-4"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              Submitting...
            </div>
          ) : (
            'Submit Issue Report'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
