'use client';

import { Badge } from '@/components/ui/badge';
import { RiskLevel } from '@/lib/types';
import { formatRiskLabel, riskToColor } from '@/utils/priority';

interface RiskBadgeProps {
  level: RiskLevel;
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  return <Badge className={riskToColor(level)}>{formatRiskLabel(level)}</Badge>;
}
