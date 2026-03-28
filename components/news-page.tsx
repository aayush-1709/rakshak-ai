'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLanguage } from '@/components/language-provider';
import { ExternalLink, Plus, Newspaper, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const STORAGE_KEY = 'rakshak-news-items';

type NewsItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  createdAt: string;
  imageDataUrl?: string;
  /** Set for RSS / web headlines — opens original article; not stored locally. */
  sourceUrl?: string;
};

function loadFromStorage(): NewsItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is NewsItem =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as NewsItem).id === 'string' &&
        typeof (row as NewsItem).title === 'string'
    );
  } catch {
    return [];
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export default function NewsPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<NewsItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [mcdNews, setMcdNews] = useState<NewsItem[]>([]);
  const [mcdLoading, setMcdLoading] = useState(true);
  const [mcdError, setMcdError] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadFromStorage());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMcd() {
      setMcdLoading(true);
      setMcdError(null);
      try {
        const res = await fetch('/api/mcd-news');
        const data = (await res.json()) as { items?: NewsItem[]; error?: string };
        if (cancelled) return;
        setMcdNews((data.items ?? []).slice(0, 6));
        setMcdError(!data.items?.length && data.error ? data.error : null);
      } catch {
        if (!cancelled) {
          setMcdError('network');
          setMcdNews([]);
        }
      } finally {
        if (!cancelled) setMcdLoading(false);
      }
    }
    loadMcd();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setCoverFile(null);
    setCoverPreview(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tTitle = title.trim();
    const tDesc = description.trim();
    const tCat = category.trim();
    if (!tTitle || !tDesc) {
      toast.error(t('newsPage.toastRequired'));
      return;
    }
    let imageDataUrl: string | undefined;
    if (coverFile) {
      try {
        imageDataUrl = await fileToDataUrl(coverFile);
      } catch {
        toast.error(t('newsPage.toastSaveError'));
        return;
      }
    }
    const row: NewsItem = {
      id: `news-${Date.now()}`,
      title: tTitle,
      description: tDesc,
      category: tCat || 'General',
      createdAt: new Date().toISOString(),
      imageDataUrl,
    };
    let saved = false;
    setItems((prev) => {
      const next = [row, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        saved = true;
        return next;
      } catch {
        toast.error(t('newsPage.toastSaveError'));
        return prev;
      }
    });
    if (saved) {
      resetForm();
      setDialogOpen(false);
      toast.success(t('newsPage.toastPublished'));
    }
  };

  const handleDeleteNews = (id: string | null) => {
    if (!id) return;
    const next = items.filter((row) => row.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error(t('newsPage.toastSaveError'));
      return;
    }
    setItems(next);
    setDetailItem((cur) => (cur?.id === id ? null : cur));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    toast.success(t('newsPage.toastDeleted'));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('newsPage.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('newsPage.subtitle')}</p>
        </div>
        <Button
          type="button"
          size="icon"
          onClick={() => setDialogOpen(true)}
          className="h-11 w-11 shrink-0 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-md"
          aria-label={t('newsPage.addNewsAria')}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t('newsPage.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('newsPage.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="news-title">{t('newsPage.fieldTitle')}</Label>
                <Input
                  id="news-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="border-slate-300"
                  placeholder={t('newsPage.fieldTitle')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="news-desc">{t('newsPage.fieldDescription')}</Label>
                <Textarea
                  id="news-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] border-slate-300"
                  placeholder={t('newsPage.fieldDescription')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="news-cat">{t('newsPage.fieldCategory')}</Label>
                <Input
                  id="news-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border-slate-300"
                  placeholder={t('newsPage.categoryPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="news-cover">{t('newsPage.fieldCover')}</Label>
                <p className="text-xs text-slate-500">{t('newsPage.fieldCoverHint')}</p>
                <Input
                  id="news-cover"
                  type="file"
                  accept="image/*"
                  className="border-slate-300 cursor-pointer"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                />
                {coverPreview && (
                  <div className="relative mt-2 h-28 w-full overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob preview */}
                    <img src={coverPreview} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                {t('action.close')}
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white">
                {t('newsPage.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          {detailItem && (
            <>
              <div className="relative aspect-[16/10] w-full shrink-0 bg-slate-100">
                {detailItem.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URLs from localStorage
                  <img
                    src={detailItem.imageDataUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50/80 to-slate-100">
                    <Newspaper className="h-14 w-14 text-slate-300" aria-hidden />
                  </div>
                )}
              </div>
              <div className="px-5 pb-5 pt-4 space-y-3">
                <DialogHeader className="space-y-2 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {detailItem.category}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(detailItem.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <DialogTitle className="text-xl leading-snug">{detailItem.title}</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {detailItem.description}
                </p>
                <DialogFooter className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between sm:gap-0">
                  {detailItem.sourceUrl ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => setDetailItem(null)}>
                        {t('action.close')}
                      </Button>
                      <Button type="button" className="gap-2 bg-sky-700 hover:bg-sky-800 text-white" asChild>
                        <a href={detailItem.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                          {t('newsPage.readFullArticle')}
                        </a>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => {
                          setDeleteTargetId(detailItem.id);
                          setDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {t('newsPage.delete')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setDetailItem(null)}>
                        {t('action.close')}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setDeleteTargetId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('newsPage.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('newsPage.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => handleDeleteNews(deleteTargetId)}
            >
              {t('newsPage.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{t('newsPage.mcdHeadlines')}</h2>
          <p className="text-xs text-slate-500 mt-1 mb-3">{t('newsPage.mcdHeadlinesHint')}</p>
        </div>
        {mcdLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50/80">
            <Spinner className="h-5 w-5" />
          </div>
        ) : mcdError && mcdNews.length === 0 ? (
          <p className="text-sm text-amber-800 border border-amber-200 rounded-lg p-4 bg-amber-50/90">
            {t('newsPage.mcdFetchError')}
          </p>
        ) : mcdNews.length === 0 ? (
          <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-6 text-center bg-slate-50/80">
            {t('newsPage.mcdEmpty')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {mcdNews.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetailItem(item)}
                className="group flex min-h-[5.25rem] flex-col rounded-lg border border-sky-100 bg-gradient-to-b from-white to-sky-50/40 p-3.5 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                aria-label={`${t('newsPage.openArticle')}: ${item.title}`}
              >
                <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 font-medium bg-sky-100 text-sky-900">
                  {item.category}
                </Badge>
                <span className="mt-2 block text-sm font-semibold leading-snug text-slate-900 line-clamp-3 group-hover:text-slate-800">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-3">{t('newsPage.localListTitle')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg p-6 text-center bg-slate-50/80 col-span-full">
              {t('newsPage.empty')}
            </p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDetailItem(item)}
                className="group flex min-h-[5.25rem] flex-col rounded-lg border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                aria-label={`${t('newsPage.openArticle')}: ${item.title}`}
              >
                <Badge variant="secondary" className="w-fit text-[10px] px-2 py-0.5 font-medium">
                  {item.category}
                </Badge>
                <span className="mt-2 block text-sm font-semibold leading-snug text-slate-900 line-clamp-3 group-hover:text-slate-800">
                  {item.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
