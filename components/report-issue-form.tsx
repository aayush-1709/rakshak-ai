'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { analyzeIssue, geocodeAddress } from '@/lib/api';
import { AIAnalysisResponse, ReportDraft } from '@/lib/types';
import { useLanguage } from './language-provider';

interface ReportIssueFormProps {
  onAnalysisComplete: (analysis: AIAnalysisResponse, draft: ReportDraft) => void;
}

const MAX_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;

function readPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

export default function ReportIssueForm({ onAnalysisComplete }: ReportIssueFormProps) {
  const { t } = useLanguage();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: string[] = [];
      for (const file of imageFiles) {
        try {
          next.push(await readPreviewUrl(file));
        } catch {
          next.push('');
        }
      }
      if (!cancelled) setImagePreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageFiles]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  const addImageFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setImageFiles((prev) => [...prev, ...list]);
  };

  const removeImageAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addImageFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!imageFiles.length || !description.trim() || !address.trim() || !pincode.trim()) {
      toast.error(t('reportForm.errorFillFields'));
      return;
    }

    setIsAnalyzing(true);
    try {
      const coords = await geocodeAddress(address.trim(), pincode.trim());
      const primary = imageFiles[0];
      const additional = imageFiles.length > 1 ? imageFiles.slice(1) : undefined;
      const draft: ReportDraft = {
        image: primary,
        additionalImages: additional,
        video: videoFile || undefined,
        description: description.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        pincode: pincode.trim(),
      };
      const analysis = await analyzeIssue({
        image: primary,
        description: draft.description,
        latitude: draft.latitude,
        longitude: draft.longitude,
        pincode: draft.pincode,
        address: draft.address,
      });
      onAnalysisComplete(analysis, draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('reportForm.errorAnalyzing'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t('reportForm.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.uploadImages')}
          </Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">{t('reportForm.dragDropImages')}</p>
              <p className="text-xs text-slate-500">{t('reportForm.clickToSelectMultiple')}</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          {imageFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imageFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  {imagePreviews[idx] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic blob preview
                    <img
                      src={imagePreviews[idx]}
                      alt=""
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="h-28 flex items-center justify-center text-xs text-slate-500">…</div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImageAt(idx);
                    }}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('action.close')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                      {t('reportForm.primary')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.uploadVideoOptional')}
          </Label>
          <div
            className="border border-slate-300 rounded-lg p-3 cursor-pointer hover:border-slate-400 transition"
            onClick={() => videoInputRef.current?.click()}
          >
            {videoFile ? (
              <div className="space-y-2">
                <video
                  controls
                  className="w-full h-36 object-cover rounded-lg bg-black"
                  src={videoPreviewUrl || undefined}
                />
                <p className="text-xs text-slate-600 truncate">{videoFile.name}</p>
                <p className="text-[11px] text-slate-500">{t('reportForm.tapToChangeVideo')}</p>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <p className="text-sm font-medium text-slate-700">{t('reportForm.attachShortVideo')}</p>
                <p className="text-xs text-slate-500">{t('reportForm.optionalEvidence')}</p>
              </div>
            )}
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (!file) {
                  setVideoFile(null);
                  return;
                }
                if (!file.type.startsWith('video/')) {
                  toast.error(t('reportForm.errorInvalidVideo'));
                  return;
                }
                if (file.size > MAX_VIDEO_SIZE_BYTES) {
                  toast.error(t('reportForm.errorVideoTooLarge'));
                  return;
                }
                setVideoFile(file);
              }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.description')}
          </Label>
          <Textarea
            id="description"
            placeholder={t('reportForm.descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] border-slate-300"
          />
        </div>

        <div>
          <Label htmlFor="address" className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.addressArea')}
          </Label>
          <Textarea
            id="address"
            placeholder={t('reportForm.addressPlaceholder')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-h-[80px] border-slate-300"
          />
        </div>

        <div>
          <Label htmlFor="pincode" className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.pincode')}
          </Label>
          <Input
            id="pincode"
            placeholder={t('reportForm.pincodePlaceholder')}
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            className="border-slate-300"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white"
        >
          {isAnalyzing ? (
            <div className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {t('reportForm.analyzing')}
            </div>
          ) : (
            t('reportForm.analyzeWithAi')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
