'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { generateReport } from '@/lib/api';
import { CivicReport } from '@/lib/types';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIReportModal({ isOpen, onClose }: AIReportModalProps) {
  const [report, setReport] = useState<CivicReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !report) {
      loadReport();
    }
  }, [isOpen, report]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateReport();
      setReport(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error generating report.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) {
      return;
    }

    const generatePdf = async () => {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let cursorY = 48;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Rakshak AI Municipal Intelligence Report', margin, cursorY);

      cursorY += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Report Title: ${report.report_title}`, margin, cursorY);
      cursorY += 14;
      doc.text(`Generated At: ${new Date(report.generated_at).toLocaleString()}`, margin, cursorY);
      cursorY += 14;
      doc.text('Prepared For: City Administration and Government Operations Teams', margin, cursorY);
      cursorY += 24;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. Executive Summary', margin, cursorY);
      cursorY += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const summaryLines = doc.splitTextToSize(
        `${report.summary}\n\nTrend Insight: ${report.trend_insight}\n\nRecommended Action: ${report.recommended_action}`,
        pageWidth - margin * 2
      );
      doc.text(summaryLines, margin, cursorY);
      cursorY += summaryLines.length * 12 + 14;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. Key Indicators', margin, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        head: [['Metric', 'Value']],
        body: [
          ['Total Complaints', String(report.total_complaints)],
          ['Total Clusters', String(report.total_clusters)],
          ['Highest Risk Area', report.highest_risk_area],
          ['Most Common Issue', report.most_common_issue],
        ],
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: margin, right: margin },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. Risk Distribution', margin, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        head: [['Risk Level', 'Complaint Count']],
        body: report.risk_distribution.map((item) => [item.risk_level, String(item.complaint_count)]),
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: margin, right: margin },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('4. Issue Type Breakdown', margin, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        head: [['Issue Type', 'Complaints', 'Clusters', 'Dominant Risk']],
        body: report.issue_breakdown.map((item) => [
          item.issue_type,
          String(item.complaint_count),
          String(item.cluster_count),
          item.dominant_risk_level,
        ]),
        theme: 'grid',
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: margin, right: margin },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('5. Pincode Breakdown', margin, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        head: [['Pincode', 'Complaints', 'Clusters', 'Dominant Issue', 'Highest Risk']],
        body: report.pincode_breakdown.map((item) => [
          item.pincode,
          String(item.complaint_count),
          String(item.cluster_count),
          item.dominant_issue_type,
          item.highest_risk_level,
        ]),
        theme: 'grid',
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: margin, right: margin },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('6. Cluster-Level Analysis', margin, cursorY);
      cursorY += 10;

      autoTable(doc, {
        startY: cursorY,
        head: [
          [
            'Cluster ID',
            'Issue Type',
            'Pincode',
            'Risk',
            'Complaints',
            'Priority',
            'Confidence',
            'Days Pending',
          ],
        ],
        body: report.cluster_breakdown.map((item) => [
          item.cluster_id,
          item.issue_type,
          item.pincode,
          item.risk_level,
          String(item.complaint_count),
          String(item.priority_score),
          String(item.confidence_score),
          String(item.days_pending),
        ]),
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
        margin: { left: margin, right: margin },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      if (cursorY > doc.internal.pageSize.getHeight() - 120) {
        doc.addPage();
        cursorY = 48;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('7. Recommended Government Actions', margin, cursorY);
      cursorY += 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      report.recommendations.forEach((item, index) => {
        const lines = doc.splitTextToSize(`${index + 1}. ${item}`, pageWidth - margin * 2);
        doc.text(lines, margin, cursorY);
        cursorY += lines.length * 12 + 4;
      });

      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(
        'This AI-generated report is intended to support government prioritization and operational planning.',
        margin,
        doc.internal.pageSize.getHeight() - 28
      );

      const fileDate = new Date().toISOString().slice(0, 10);
      doc.save(`rakshak-ai-government-report-${fileDate}.pdf`);
    };

    generatePdf().catch(() => {
      toast.error('Unable to generate PDF report.');
    });
  };

  const handleClose = () => {
    setReport(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            AI-Generated Weekly Rakshak AI Report
          </DialogTitle>
          <DialogDescription className="sr-only">
            Generated Rakshak AI report with issue, pincode, and cluster level insights.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Spinner />
            <p className="text-slate-600">Generating report...</p>
          </div>
        ) : error ? (
          <div className="py-10 space-y-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        ) : report ? (
          <div className="space-y-6 py-4">
            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-slate-900 mb-2">{report.report_title}</h3>
              <p className="text-sm text-slate-700">{report.summary}</p>
              <p className="text-xs text-slate-500 mt-2">
                Generated: {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>

            {/* Structured report */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-red-700 font-medium">Highest Risk Area</p>
                <p className="text-lg font-bold text-red-900">{report.highest_risk_area}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-orange-700 font-medium">Most Common Issue</p>
                <p className="text-lg font-bold text-orange-900">{report.most_common_issue}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-700 font-medium">Trend Insight</p>
                <p className="text-sm text-slate-900">{report.trend_insight}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Recommended Action</p>
                <p className="text-sm text-green-900">{report.recommended_action}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">Total Complaints</p>
                <p className="text-xl font-bold text-slate-900">{report.total_complaints}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 font-medium">Total Clusters</p>
                <p className="text-xl font-bold text-slate-900">{report.total_clusters}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700 font-medium mb-2">Risk Distribution</p>
                <div className="space-y-1">
                  {report.risk_distribution.map((item) => (
                    <p key={item.risk_level} className="text-sm text-slate-800">
                      {item.risk_level}: {item.complaint_count}
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700 font-medium mb-2">Issue Breakdown</p>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {report.issue_breakdown.map((item) => (
                    <p key={item.issue_type} className="text-sm text-slate-800">
                      {item.issue_type}: {item.complaint_count} complaints, {item.cluster_count}{' '}
                      clusters, dominant risk {item.dominant_risk_level}
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700 font-medium mb-2">Pincode Breakdown</p>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {report.pincode_breakdown.map((item) => (
                    <p key={item.pincode} className="text-sm text-slate-800">
                      {item.pincode}: {item.complaint_count} complaints, {item.cluster_count}{' '}
                      clusters, dominant issue {item.dominant_issue_type}, highest risk{' '}
                      {item.highest_risk_level}
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700 font-medium mb-2">Cluster Breakdown</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {report.cluster_breakdown.map((item) => (
                    <p key={item.cluster_id} className="text-sm text-slate-800">
                      {item.cluster_id}: {item.issue_type}, pincode {item.pincode}, risk{' '}
                      {item.risk_level}, complaints {item.complaint_count}, priority{' '}
                      {item.priority_score}
                    </p>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-700 font-medium mb-2">Recommendations</p>
                <ul className="list-disc pl-5 space-y-1">
                  {report.recommendations.map((item, idx) => (
                    <li key={`${idx}-${item}`} className="text-sm text-slate-800">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={handleDownload}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
              >
                Download Report
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
