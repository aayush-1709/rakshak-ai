import type { CivicReport } from '@/lib/types';

export async function exportCivicReportPdf(report: CivicReport): Promise<void> {
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
  cursorY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

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
  cursorY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

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
  cursorY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

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
  cursorY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

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
  cursorY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

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
}
