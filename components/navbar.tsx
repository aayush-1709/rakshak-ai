'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getMockMode, setMockMode } from '@/lib/api';
import AIReportModal from './ai-report-modal';
import rakshakLogo from '../logo.png';

interface NavbarProps {
  onMockModeChanged: () => void;
}

export default function Navbar({ onMockModeChanged }: NavbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mockMode, setMockModeState] = useState(false);

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
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 flex items-center justify-between">
          {/* Left - Title and Status */}
          <div className="flex items-center gap-4">
            <Image
              src={rakshakLogo}
              alt="Rakshak AI logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-md object-cover"
              priority
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Rakshak AI</h1>
              <p className="text-xs text-slate-500">Public Complaint Dashboard</p>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-900">
              Public Dashboard
            </Badge>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-2">
              <span className="text-xs text-slate-600">Mock API</span>
              <Switch checked={mockMode} onCheckedChange={handleMockToggle} />
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              Generate AI Report
            </Button>
          </div>
        </div>
      </nav>

      <AIReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
