'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/components/language-provider';

const STORAGE_KEY = 'rakshak-public-complaints';

type PublicComplaint = {
  id: string;
  name: string;
  phone: string;
  location: string;
  description: string;
  imageName?: string | null;
  rewardEligible: boolean;
  createdAt: string;
};

export default function PublicComplaintsPage() {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [list, setList] = useState<PublicComplaint[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setList(JSON.parse(raw) as PublicComplaint[]);
    } catch {
      setList([]);
    }
  }, []);

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !location.trim() || !description.trim()) {
      toast.error('Please fill all required fields.');
      return;
    }
    const row: PublicComplaint = {
      id: `PUB-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      description: description.trim(),
      imageName: image?.name ?? null,
      rewardEligible: Math.random() > 0.4,
      createdAt: new Date().toISOString(),
    };
    setList((prev) => {
      const next = [row, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    toast.success('Complaint recorded locally.');
    setName('');
    setPhone('');
    setLocation('');
    setDescription('');
    setImage(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('publicComplaintsPage.title')}</h1>
        <p className="text-sm text-slate-600 mt-1">{t('publicComplaintsPage.subtitle')}</p>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('publicComplaintsPage.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="border-slate-300" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pphone">Phone</Label>
              <Input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-slate-300" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ploc">Location</Label>
            <Input id="ploc" value={location} onChange={(e) => setLocation(e.target.value)} className="border-slate-300" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdesc">Description</Label>
            <Textarea
              id="pdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] border-slate-300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pimg">Image</Label>
            <Input
              id="pimg"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="border-slate-300"
            />
          </div>
          <Button type="button" className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSubmit}>
            {t('publicComplaintsPage.submit')}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">{t('publicComplaintsPage.listTitle')}</h2>
        <div className="grid grid-cols-1 gap-3">
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            list.map((item) => (
              <Card key={item.id} className="border-slate-200 bg-white">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.phone}</p>
                    <p className="text-sm text-slate-700">{item.location}</p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.description}</p>
                    <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {item.rewardEligible && (
                      <Badge className="bg-amber-100 text-amber-950 border-amber-200">
                        {t('publicComplaintsPage.rewardEligible')}
                      </Badge>
                    )}
                    {item.imageName && (
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">{item.imageName}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
