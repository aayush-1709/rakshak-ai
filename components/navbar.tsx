'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMockMode, setMockMode } from '@/lib/api';
import AIReportModal from './ai-report-modal';
import { BrandLogoFrame, BrandTextBlock } from '@/components/dashboard/dashboard-brand';
import { useLanguage } from './language-provider';

interface NavbarProps {
  onMockModeChanged: () => void;
}

export default function Navbar({ onMockModeChanged }: NavbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mockMode, setMockModeState] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    setMockModeState(getMockMode());
  }, []);

  const handleMockToggle = (checked: boolean) => {
    setMockMode(checked);
    setMockModeState(checked);
    onMockModeChanged();
  };

  return (
    <>
      <nav className="border-b border-sky-100/90 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)] sticky top-0 z-50">
        <div className="w-full px-4 lg:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
          {/* Mobile / tablet: branding. Desktop: shown in sidebar top-left instead */}
          <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 lg:hidden">
            <BrandLogoFrame imgClassName="h-10 w-10 sm:h-[52px] sm:w-[52px]" />
            <BrandTextBlock variant="navbar" className="pt-0.5" />
          </div>

          {/* Right - Actions */}
          <div className="flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'hi' | 'te')}>
              <SelectTrigger className="w-full sm:w-[170px] border-slate-300">
                <SelectValue placeholder={t('language.label')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('language.english')}</SelectItem>
                <SelectItem value="hi">{t('language.hindi')}</SelectItem>
                <SelectItem value="te">{t('language.telugu')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2">
              <span className="text-xs text-slate-600">{t('status.mockApi')}</span>
              <Switch checked={mockMode} onCheckedChange={handleMockToggle} />
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
            >
              {t('action.generateAiReport')}
            </Button>
          </div>
        </div>
      </nav>

      <AIReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
