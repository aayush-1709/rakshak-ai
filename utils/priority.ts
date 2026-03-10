import { RiskLevel } from '@/lib/types';

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  high: 'High',
  very_high: 'Very High',
  critical: 'Critical',
};

export function riskToColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-900';
    case 'high':
      return 'bg-yellow-100 text-yellow-900';
    case 'very_high':
      return 'bg-orange-100 text-orange-900';
    case 'critical':
      return 'bg-red-100 text-red-900';
    default:
      return 'bg-slate-100 text-slate-900';
  }
}

export function calculateSeverityWeight(level: RiskLevel): number {
  switch (level) {
    case 'low':
      return 1;
    case 'high':
      return 2;
    case 'very_high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 1;
  }
}

export function formatRiskLabel(level: RiskLevel): string {
  return RISK_LABELS[level];
}
