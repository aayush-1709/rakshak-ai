'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RiskBadge from '@/components/risk-badge';
import { RISK_LEVELS } from '@/lib/types';
import { formatRiskLabel } from '@/utils/priority';

export default function RiskLegend() {
  const slaByRisk: Record<string, string> = {
    low: '3 days',
    high: '2 days',
    very_high: '1 day',
    critical: 'Today',
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Risk Level Guide</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {RISK_LEVELS.map((level) => (
            <div key={level} className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2">
                <RiskBadge level={level} />
                <span className="text-xs text-slate-600">{formatRiskLabel(level)}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">SLA: {slaByRisk[level]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
