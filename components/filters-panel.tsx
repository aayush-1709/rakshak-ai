'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClusterSortBy, IssueFilters, RISK_LEVELS, RiskLevel } from '@/lib/types';
import { formatRiskLabel } from '@/utils/priority';
import { useLanguage } from './language-provider';

interface FiltersPanelProps {
  onFilterChange: (filters: IssueFilters) => void;
  onSortChange: (sortBy: ClusterSortBy) => void;
  currentFilters: IssueFilters;
  currentSort: ClusterSortBy;
  issueTypes: string[];
}

export default function FiltersPanel({
  onFilterChange,
  onSortChange,
  currentFilters,
  currentSort,
  issueTypes,
}: FiltersPanelProps) {
  const { t } = useLanguage();
  const handleRiskLevelChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      riskLevel: value && value !== 'all' ? (value as RiskLevel) : undefined,
    });
  };

  const handleIssueTypeChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      issueType: value && value !== 'all' ? value : undefined,
    });
  };

  const handlePincodeChange = (value: string) => {
    onFilterChange({
      ...currentFilters,
      pincode: value || undefined,
    });
  };

  const handleReset = () => {
    onFilterChange({});
    onSortChange('priority_score');
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('filters.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Risk Level Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('filters.riskLevel')}</Label>
            <Select value={currentFilters.riskLevel || 'all'} onValueChange={handleRiskLevelChange}>
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder={t('filters.allLevels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allLevels')}</SelectItem>
                {RISK_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {formatRiskLabel(level)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue Type Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('filters.issueType')}</Label>
            <Select value={currentFilters.issueType || 'all'} onValueChange={handleIssueTypeChange}>
              <SelectTrigger className="border-slate-300">
                <SelectValue placeholder={t('filters.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                {issueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pincode Filter */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('filters.pincode')}</Label>
            <Input
              placeholder={t('filters.filterPlaceholder')}
              value={currentFilters.pincode || ''}
              onChange={(e) => handlePincodeChange(e.target.value)}
              className="border-slate-300"
            />
          </div>

          {/* Sort By */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">{t('filters.sortBy')}</Label>
            <Select value={currentSort} onValueChange={(value) => onSortChange(value as ClusterSortBy)}>
              <SelectTrigger className="border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority_score">{t('filters.sortPriority')}</SelectItem>
                <SelectItem value="complaint_count">{t('filters.sortCount')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-slate-300"
            >
              {t('action.reset')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
