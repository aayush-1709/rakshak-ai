'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RiskBadge from '@/components/risk-badge';
import { RISK_LEVELS } from '@/lib/types';
import { formatRiskLabel } from '@/utils/priority';
import { useLanguage } from './language-provider';

export default function RiskLegend() {
  const { t } = useLanguage();
  const slaByRisk: Record<string, string> = {
    low: `3 ${t('riskGuide.days')}`,
    high: `2 ${t('riskGuide.days')}`,
    very_high: `1 ${t('riskGuide.day')}`,
    critical: t('riskGuide.today'),
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('riskGuide.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {RISK_LEVELS.map((level) => (
            <div key={level} className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2">
                <RiskBadge level={level} />
                <span className="text-xs text-slate-600">{formatRiskLabel(level)}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{t('riskGuide.sla')}: {slaByRisk[level]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
