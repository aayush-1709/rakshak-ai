'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getMockMode, setMockMode } from '@/lib/api';
import AIReportModal from './ai-report-modal';
import rakshakLogo from '../logo.png';
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
      <nav className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left - Title and Status */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Image
              src={rakshakLogo}
              alt="Rakshak AI logo"
              width={48}
              height={48}
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-md object-cover shrink-0"
              priority
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{t('app.name')}</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">{t('app.subtitle')}</p>
            </div>
            <Badge variant="secondary" className="hidden md:inline-flex bg-blue-100 text-blue-900">
              {t('badge.publicDashboard')}
            </Badge>
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
