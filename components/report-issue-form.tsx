'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { analyzeIssue, geocodeAddress } from '@/lib/api';
import { AIAnalysisResponse, ReportDraft } from '@/lib/types';
import { useLanguage } from './language-provider';

interface ReportIssueFormProps {
  onAnalysisComplete: (analysis: AIAnalysisResponse, draft: ReportDraft) => void;
}

const MAX_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;

export default function ReportIssueForm({ onAnalysisComplete }: ReportIssueFormProps) {
  const { t } = useLanguage();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
    if (!videoFile) {
      setVideoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(videoFile);
    setVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [videoFile]);

  const handleImageChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    const file = e.dataTransfer.files[0];
    handleImageChange(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageChange(file);
  };

  const handleSubmit = async () => {
    if (!imageFile || !description.trim() || !address.trim() || !pincode.trim()) {
      toast.error(t('reportForm.errorFillFields'));
      return;
    }

    setIsAnalyzing(true);
    try {
      const coords = await geocodeAddress(address.trim(), pincode.trim());
      const draft: ReportDraft = {
        image: imageFile,
        video: videoFile || undefined,
        description: description.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        pincode: pincode.trim(),
      };
      const analysis = await analyzeIssue(draft);
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
        {/* Image Upload */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 block">
            {t('reportForm.uploadImage')}
          </Label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <p className="text-xs text-slate-600">{t('reportForm.clickToChangeImage')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-700">
                  {t('reportForm.dragDropImage')}
                </p>
                <p className="text-xs text-slate-500">{t('reportForm.clickToSelect')}</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Description */}
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

        {/* Description */}
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

        {/* Address */}
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

        {/* Pincode */}
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

        {/* Submit Button */}
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
