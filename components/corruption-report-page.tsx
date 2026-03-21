'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { submitCorruptionReport } from '@/lib/api';
import CorruptionMonthlyReportsChart from '@/components/corruption-monthly-reports-chart';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export default function CorruptionReportPage() {
  const { t } = useLanguage();
  const { bumpDataRefresh } = useDashboardRefresh();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [accused, setAccused] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!description.trim()) {
      toast.error(t('corruptionPage.toastDescriptionRequired'));
      return;
    }
    setIsSubmitting(true);
    try {
      let proof_data_url: string | undefined;
      if (proof) {
        proof_data_url = await fileToDataUrl(proof);
      }
      await submitCorruptionReport({
        description: description.trim(),
        reporter_name: name.trim(),
        phone: phone.trim(),
        department: '',
        accused_person: accused.trim(),
        proof_data_url,
      });
      toast.success(t('corruptionPage.toastSavedDb'));
      bumpDataRefresh();
      setName('');
      setPhone('');
      setDescription('');
      setAccused('');
      setProof(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('corruptionPage.toastError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-6 px-1 sm:px-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('corruptionPage.title')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('corruptionPage.subtitle')}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start lg:gap-10">
        <div className="min-w-0 max-w-2xl lg:max-w-none">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('corruptionPage.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cname">{t('corruptionPage.name')}</Label>
                <Input
                  id="cname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-slate-300"
                  autoComplete="name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cphone">{t('corruptionPage.phone')}</Label>
                <Input
                  id="cphone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-slate-300"
                  autoComplete="tel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cdesc">{t('corruptionPage.description')}</Label>
                <Textarea
                  id="cdesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[140px] border-slate-300"
                  placeholder={t('corruptionPage.descriptionPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cacc">{t('corruptionPage.accusedRole')}</Label>
                <Input
                  id="cacc"
                  value={accused}
                  onChange={(e) => setAccused(e.target.value)}
                  className="border-slate-300"
                  placeholder={t('corruptionPage.accusedRolePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cproof">{t('corruptionPage.proofs')}</Label>
                <Input
                  id="cproof"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                  className="border-slate-300 cursor-pointer"
                />
                {proof && <p className="text-xs text-slate-600">{proof.name}</p>}
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={submit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="w-4 h-4" />
                      {t('corruptionPage.submitting')}
                    </span>
                  ) : (
                    t('corruptionPage.submit')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start w-full min-w-0">
          <CorruptionMonthlyReportsChart />
        </aside>
      </div>
    </div>
  );
}
