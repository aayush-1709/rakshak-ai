'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { chatWithCivicAI } from '@/lib/api';
import { toast } from 'sonner';
import { useLanguage } from './language-provider';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function CivicChatbot() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: t('chatbot.welcome'),
    },
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t('chatbot.welcome') }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await chatWithCivicAI(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('chatbot.errorResponse');
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('chatbot.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={
                message.role === 'user'
                  ? 'ml-auto max-w-[90%] rounded-md bg-slate-900 text-white px-3 py-2 text-sm'
                  : 'mr-auto max-w-[90%] rounded-md bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700'
              }
            >
              {message.content}
            </div>
          ))}
          {isLoading && (
            <div className="mr-auto max-w-[90%] rounded-md bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Spinner className="w-3 h-3" />
                {t('chatbot.thinking')}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="flex items-center gap-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t('chatbot.placeholder')}
            className="border-slate-300"
          />
          <Button type="submit" disabled={isLoading || !question.trim()}>
            {t('action.ask')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
