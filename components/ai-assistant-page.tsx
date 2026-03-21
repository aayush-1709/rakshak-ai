'use client';

import CivicChatbot from '@/components/civic-chatbot';
import { useLanguage } from '@/components/language-provider';

export default function AiAssistantPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('nav.aiAssistant')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('chatbot.welcome')}</p>
      </div>
      <CivicChatbot contentClassName="max-h-[min(70vh,28rem)] overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2" />
    </div>
  );
}
